'use strict';

const { getSupabase, getCronRecord, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'check-stock-notifications';

function log(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  if (data !== undefined) {
    logFn(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    logFn(`${prefix} ${message}`);
  }
}

async function sendTelegramNotification(message) {
  const botToken = process.env.TELEGRAM_IMAGE_ERROR_BOT_TOKEN;
  const groupId = process.env.TELEGRAM_STOCK_GROUP_ID;

  if (!botToken || !groupId) {
    log('WARN', 'Telegram', 'Telegram env vars not set, skipping notification');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  log('INFO', 'Telegram', 'Sending notification', { message });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: groupId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    log('ERROR', 'Telegram', `API returned failure (HTTP ${response.status})`, result);
    throw new Error(`Telegram API error: ${result.description ?? 'Unknown error'}`);
  }

  log('INFO', 'Telegram', 'Notification sent successfully', {
    message_id: result.result?.message_id,
    chat_id: result.result?.chat?.id,
  });
  return result;
}

async function fetchProductData(productCode) {
  const apiBase = process.env.API_BASE_URL;
  const apiToken = process.env.HITECH_API_TOKEN;

  if (!apiBase || !apiToken) throw new Error('API_BASE_URL or HITECH_API_TOKEN not set');

  let cleanCode = productCode.trim();
  if (/^\d+$/.test(cleanCode)) {
    cleanCode = cleanCode.length <= 6 ? `Т-${cleanCode.padStart(6, '0')}` : `Т-${cleanCode}`;
  } else if (cleanCode.startsWith('T-')) {
    cleanCode = 'Т-' + cleanCode.substring(2);
  } else if (!cleanCode.startsWith('Т-')) {
    cleanCode = `Т-${cleanCode}`;
  }

  log('INFO', 'ProductAPI', 'Fetching product data', { original: productCode, resolved: cleanCode });

  const response = await fetch(
    `${apiBase}?code=${encodeURIComponent(cleanCode)}&token=${apiToken}`,
    { signal: AbortSignal.timeout(15_000) }
  );

  if (!response.ok) {
    throw new Error(`Product API HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    log('WARN', 'ProductAPI', 'Product not found', { code: cleanCode, response: data });
  } else {
    log('INFO', 'ProductAPI', 'Product fetched successfully', {
      code: data.product_code,
      warehouseCount: data.additional?.warehouses?.length ?? 0,
    });
  }
  return data;
}

async function fetchSimilarProducts(searchName, originalCode) {
  const apiBase = process.env.API_BASE_URL;
  const apiToken = process.env.HITECH_API_TOKEN;

  const params = new URLSearchParams({
    q: searchName,
    page: '1',
    limit: '20',
    token: apiToken,
    min_score: '0.9',
  });

  const searchUrl = `${apiBase}?${params.toString()}`;
  log('INFO', 'SimilarSearch', 'Searching products by name', { searchName, originalCode });

  try {
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      log('WARN', 'SimilarSearch', 'Search API HTTP error', { status: response.status });
      return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.products) || data.products.length === 0) {
      log('WARN', 'SimilarSearch', 'No products returned from search', { searchName });
      return [];
    }

    const candidates = data.products
      .filter(p => p.product_code !== originalCode)
      .map(p => ({
        code: p.product_code,
        name: p.product ?? p.name ?? '',
        score: p.score ?? 1,
      }));

    log('INFO', 'SimilarSearch', 'Candidates after excluding original', {
      originalCode,
      totalFound: data.products.length,
      candidatesAfterFilter: candidates.length,
    });

    return candidates;
  } catch (error) {
    log('ERROR', 'SimilarSearch', 'Exception during name search', {
      searchName,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function hasStockInOtherWarehouses(warehouses) {
  return warehouses.some(w => w.warehouse_id !== '47' && parseInt(w.amount) > 0);
}

async function run() {
  const supabase = getSupabase();

  log('INFO', 'Handler', 'Stock check triggered');

  const { data: notifications, error: fetchError } = await supabase
    .from('stock_notifications')
    .select('*')
    .is('notification_sent', false)
    .order('created_at', { ascending: true });

  if (fetchError) {
    log('ERROR', 'Supabase', 'Failed to fetch pending notifications', {
      error: fetchError.message,
      code: fetchError.code,
    });
    throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
  }

  if (!notifications || notifications.length === 0) {
    log('INFO', 'Handler', 'No pending notifications found');
    await updateCronRecord(supabase, FUNCTION_NAME, {
      last_run: new Date().toISOString(),
      last_result: 'no_pending',
    });
    return;
  }

  log('INFO', 'Handler', 'Processing notifications', { count: notifications.length });

  const results = [];

  for (const notification of notifications) {
    const notifCtx = `Notification#${notification.id}`;

    try {
      log('INFO', notifCtx, 'Processing notification', {
        id: notification.id,
        product_code: notification.product_code ?? notification.product_id,
        product_name: notification.product_name,
        similar_found_notification: notification.similar_found_notification,
      });

      const productData = await fetchProductData(
        notification.product_code || notification.product_id
      );

      if (!productData.success) {
        log('WARN', notifCtx, 'Product not found in API', { product_code: notification.product_code });
        results.push({ id: notification.id, product_code: notification.product_code, status: 'error', error: 'Product not found in API' });
        continue;
      }

      const warehouses = productData.additional?.warehouses || [];
      const hasStock = hasStockInOtherWarehouses(warehouses);

      log('INFO', notifCtx, 'Stock check result', {
        product_code: productData.product_code,
        hasStock,
        warehouses: warehouses.map(w => ({
          id: w.warehouse_id,
          amount: w.amount,
          isExcluded: w.warehouse_id === '47',
        })),
      });

      await supabase
        .from('stock_notifications')
        .update({ last_checked: new Date().toISOString() })
        .eq('id', notification.id);

      if (hasStock) {
        const comment = notification.comment ? `, ${notification.comment}` : '';
        const message = `Товар <a href="${productData.product_url}">${productData.product_code}</a> прибыл${comment}`;
        await sendTelegramNotification(message);

        await supabase
          .from('stock_notifications')
          .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
          .eq('id', notification.id);

        log('INFO', notifCtx, 'Notification sent and marked complete', { product_code: productData.product_code });
        results.push({ id: notification.id, product_code: productData.product_code, status: 'notified' });

      } else {
        const productName = notification.product_name || productData.product?.product || '';
        const firstWord = productName.trim().split(/\s+/)[0];
        const isSmartphone = firstWord === 'Смартфон';
        const alreadyTriedSimilar = notification.similar_found_notification === true;

        log('INFO', notifCtx, 'No stock on exact product', {
          productName,
          firstWord,
          isSmartphone,
          alreadyTriedSimilar,
          willTryFallback: isSmartphone && !alreadyTriedSimilar,
        });

        if (isSmartphone && !alreadyTriedSimilar) {
          const searchName = productName.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const candidates = await fetchSimilarProducts(searchName, productData.product_code);

          if (candidates.length === 0) {
            log('INFO', notifCtx, 'No similar products found via name search', { searchName });
            results.push({ id: notification.id, product_code: productData.product_code, status: 'waiting' });
            continue;
          }

          let notifiedSimilar = false;

          for (const candidate of candidates) {
            const candidateData = await fetchProductData(candidate.code);
            if (!candidateData.success) continue;

            const candidateWarehouses = candidateData.additional?.warehouses || [];
            const candidateHasStock = hasStockInOtherWarehouses(candidateWarehouses);

            if (candidateHasStock) {
              const comment = notification.comment ? `, ${notification.comment}` : '';
              const message = `Похожий товар <a href="${candidateData.product_url}">${candidateData.product_code}</a> прибыл (аналог ${productData.product_code})${comment}`;
              await sendTelegramNotification(message);

              await supabase
                .from('stock_notifications')
                .update({
                  notification_sent: true,
                  notification_sent_at: new Date().toISOString(),
                  similar_found_notification: true,
                })
                .eq('id', notification.id);

              results.push({
                id: notification.id,
                product_code: productData.product_code,
                similar_code: candidate.code,
                status: 'notified_similar',
              });
              notifiedSimilar = true;
              break;
            }
          }

          if (!notifiedSimilar) {
            await supabase
              .from('stock_notifications')
              .update({ similar_found_notification: true })
              .eq('id', notification.id);

            results.push({
              id: notification.id,
              product_code: productData.product_code,
              similar_candidates: candidates.map(c => c.code),
              status: 'waiting_similar',
            });
          }

        } else {
          log('INFO', notifCtx, 'Skipping similar search', {
            reason: !isSmartphone
              ? `first word is "${firstWord}", not "Смартфон"`
              : 'similar search already ran in a previous cron run',
          });
          results.push({ id: notification.id, product_code: productData.product_code, status: 'waiting' });
        }
      }

    } catch (error) {
      log('ERROR', notifCtx, 'Unhandled error processing notification', {
        product_code: notification.product_code,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      results.push({
        id: notification.id,
        product_code: notification.product_code,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = {
    notified: results.filter(r => r.status === 'notified').length,
    notified_similar: results.filter(r => r.status === 'notified_similar').length,
    waiting: results.filter(r => r.status === 'waiting' || r.status === 'waiting_similar').length,
    errors: results.filter(r => r.status === 'error').length,
  };

  log('INFO', 'Handler', 'Stock check complete', { summary, results });

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: new Date().toISOString(),
    last_result: summary,
  });
}

module.exports = { run, schedule: '0 9-17 * * 1-5', missedRunCheck: 'none', name: FUNCTION_NAME };