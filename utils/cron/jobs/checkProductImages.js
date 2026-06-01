'use strict';

const { getSupabase, getCronRecord, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'check-product-images';
const PAGE_LIMIT = 50;
const COMPANY_ID = 1;
const MAX_RUNS_PER_DAY = 10;
const MAX_PAGE = 999999;

const IGNORABLE_ERRORS = [
  'хост недоступен', 'таймаут', 'timeout', 'unreachable',
  'host not available', 'не удалось загрузить'
];

function hasOnlyIgnorableErrors(images) {
  if (images.length === 0) return false;
  return images.every(img => {
    if (!img?.error) return true;
    const msg = String(img.error).toLowerCase();
    return IGNORABLE_ERRORS.some(p => msg.includes(p));
  });
}

async function saveCronState(supabase, today, lastPage, currentRun, notificationSent, isLastRunOfDay) {
  const function_data = {
    session: today,
    current_run: currentRun,
    notification_sent: notificationSent,
    last_successful_page: lastPage,
    last_updated: new Date().toISOString(),
  };

  if (isLastRunOfDay) {
    function_data.last_completed_run_date = today;
    function_data.total_pages_processed_today = lastPage;
  }

  await updateCronRecord(supabase, FUNCTION_NAME, function_data);
}

async function sendTelegramNotification(count) {
  const botToken = process.env.TELEGRAM_IMAGE_ERROR_BOT_TOKEN;
  const groupId = process.env.TELEGRAM_IMAGE_ERROR_GROUP_ID;

  if (!botToken || !groupId) {
    console.warn('[cron] checkProductImages: Telegram env vars not set, skipping notification');
    return false;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: `-${groupId}`,
      text: `За сегодня найдено ${count} товаров с битыми изображениями.`,
      parse_mode: 'HTML'
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${text}`);
  }

  return true;
}

async function run() {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];
  const apiBaseUrl = process.env.HITECH_API_URL;
  const apiToken = process.env.HITECH_API_TOKEN;

  if (!apiBaseUrl || !apiToken) throw new Error('HITECH_API_URL or HITECH_API_TOKEN not set');

  const record = await getCronRecord(supabase, FUNCTION_NAME);
  const cronData = record?.function_data ?? {};

  const lastSession = cronData.session ?? '';
  const lastSuccessfulPage = cronData.last_successful_page ?? 0;
  const lastRunNumber = cronData.current_run ?? 0;
  const notificationAlreadySent = cronData.notification_sent ?? false;

  let currentRun;
  let page;

  if (lastSession === today) {
    currentRun = Math.min(lastRunNumber + 1, MAX_RUNS_PER_DAY);
    page = lastSuccessfulPage + 1;
  } else {
    currentRun = 1;
    page = lastSuccessfulPage + 1;
  }

  const isLastRunOfDay = currentRun >= MAX_RUNS_PER_DAY;

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalSkippedTimeout = 0;
  let totalSkippedPending = 0;

  while (page <= MAX_PAGE) {
    const url = new URL(apiBaseUrl);
    url.searchParams.set('company_id', String(COMPANY_ID));
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('exclude', 'products.images');
    url.searchParams.set('token', apiToken);

    let data = null;

    try {
      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
      if (response.ok) {
        data = await response.json();
      } else {
        console.warn(`[cron] checkProductImages: page ${page} HTTP ${response.status}, skipping`);
      }
    } catch (err) {
      console.warn(`[cron] checkProductImages: page ${page} fetch error: ${err.message}`);
    }

    if (data === null) {
      await saveCronState(supabase, today, page, currentRun, notificationAlreadySent, isLastRunOfDay);
      page++;
      continue;
    }

    if (!data?.success || !data.products?.length) {
      console.log(`[cron] checkProductImages: no more products at page ${page}, resetting to page 1`);
      await saveCronState(supabase, today, 0, currentRun, notificationAlreadySent, isLastRunOfDay);
      page = 1;
      break;
    }

    const rowsToInsert = [];

    for (const product of data.products) {
      const allImages = [
        ...(Array.isArray(product.images) ? product.images : []),
        ...(Array.isArray(product.description_images) ? product.description_images : []),
      ];

      const imagesWithErrors = allImages.filter(img => img?.error);
      if (imagesWithErrors.length === 0) continue;
      if (hasOnlyIgnorableErrors(imagesWithErrors)) {
        totalSkippedTimeout++;
        totalSkipped++;
        continue;
      }

      let productCategory = '';
      try {
        const segments = new URL(product.product_url).pathname.split('/').filter(Boolean);
        productCategory = segments.slice(0, 3).join(' / ');
      } catch {}

      rowsToInsert.push({
        session: today,
        product_code: product.product_code,
        item_url: product.product_url,
        result: false,
        product_status: product.status === 'A' ? 'Вкл' : 'Выкл',
        product_name: product.product,
        product_category: productCategory,
        updated_at: new Date().toISOString(),
        product_id: String(product.product_id),
        page,
      });
    }

    if (rowsToInsert.length > 0) {
      const productCodes = rowsToInsert.map(r => r.product_code);

      const { data: existingCurrent } = await supabase
        .from('check_images')
        .select('product_code')
        .eq('session', today)
        .in('product_code', productCodes);

      const existingCurrentCodes = new Set((existingCurrent ?? []).map(r => r.product_code));
      const productsToCheck = rowsToInsert.filter(r => !existingCurrentCodes.has(r.product_code));

      if (productsToCheck.length > 0) {
        const { data: existingOther } = await supabase
          .from('check_images')
          .select('product_code')
          .neq('session', today)
          .eq('result', false)
          .in('product_code', productsToCheck.map(r => r.product_code));

        const pendingOtherCodes = new Set((existingOther ?? []).map(r => r.product_code));
        const newRows = productsToCheck.filter(r => !pendingOtherCodes.has(r.product_code));

        totalSkipped += productsToCheck.length - newRows.length;
        totalSkippedPending += productsToCheck.length - newRows.length;

        if (newRows.length > 0) {
          const { error: insertError } = await supabase.from('check_images').insert(newRows);
          if (insertError) {
            console.error(`[cron] checkProductImages: insert error page ${page}: ${insertError.message}`);
          } else {
            totalInserted += newRows.length;
          }
        }
      }
    }

    await saveCronState(supabase, today, page, currentRun, notificationAlreadySent, isLastRunOfDay);

    if (isLastRunOfDay) break;

    page++;
  }

  let notificationSent = notificationAlreadySent;

  if (isLastRunOfDay && !notificationAlreadySent) {
    const { count: totalToday } = await supabase
      .from('check_images')
      .select('*', { count: 'exact', head: true })
      .eq('session', today);

    try {
      await sendTelegramNotification(totalToday || 0);
      notificationSent = true;
      console.log(`[cron] checkProductImages: notification sent, total=${totalToday}`);
    } catch (err) {
      console.error(`[cron] checkProductImages: notification failed: ${err.message}`);
    }
  }

  await saveCronState(supabase, today, page, currentRun, notificationSent, isLastRunOfDay);

  console.log(`[cron] checkProductImages: run=${currentRun}/${MAX_RUNS_PER_DAY} page=${page} inserted=${totalInserted} skipped=${totalSkipped} lastRun=${isLastRunOfDay}`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '0 8-17 * * *', missedRunCheck: 'none' };