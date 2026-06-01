'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' }
});

function verifyTelegramSecret(req, res, next) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[telegram-webhook] TELEGRAM_WEBHOOK_SECRET is not set');
    return res.status(403).json({ error: 'Forbidden' });
  }
  const incoming = req.headers['x-telegram-bot-api-secret-token'] || '';
  const expectedHash = crypto
    .createHmac('sha256', 'telegram-webhook-secret')
    .update(secret)
    .digest('hex');
  const incomingHash = crypto
    .createHmac('sha256', 'telegram-webhook-secret')
    .update(incoming)
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(incomingHash))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

const ALLOWED_MANAGERS = {
  "312756470": "Марк",
  "297978281": "Евгений",
  "8502716323": "Юрий Павлович",
  "785477776": "Наталья Александровна",
  "798657148": "Наталья Владимировна",
  "705800293": "Евгений Валерьевич",
  "416612374": "Антонина Владимировна"
};

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
}

async function handleMsgSeenCallback(supabase, botToken, callbackId, data, chatId, telegramMessageId) {
  try {
    const recordId = parseInt(data.replace('msg_seen_', ''), 10);
    if (!recordId) return;

    const { error } = await supabase
      .from('chat')
      .update({ status: 'seen' })
      .eq('id', recordId);

    if (error) {
      console.error('❌ Error updating chat status:', error.message);
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: '✅ Сообщение отмечено как просмотренное',
        show_alert: false
      })
    });

    await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: telegramMessageId,
        reply_markup: { inline_keyboard: [] }
      })
    });
  } catch (err) {
    console.error('❌ handleMsgSeenCallback error:', err.message);
  }
}

async function handleOkNotOkCallback(supabase, botToken, callbackQuery) {
  const { id: callbackId, from, data, message } = callbackQuery;
  const chatId = from.id;
  const telegramMessageId = message?.message_id;

  if (!data || !chatId || !telegramMessageId) return;

  const [status, type, idStr] = data.split('_');
  const recordId = parseInt(idStr, 10);

  if (!recordId || !['ok', 'notok'].includes(status) || type !== 'msg') return;

  try {
    const { data: existingData, error: fetchError } = await supabase
      .from('shops_sent_msgs')
      .select('replies')
      .eq('id', recordId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching replies:', fetchError.message);
      return;
    }

    const replies = Array.isArray(existingData?.replies) ? existingData.replies : [];
    replies.push({ chat_id: chatId, status });

    const { error: updateError } = await supabase
      .from('shops_sent_msgs')
      .update({ replies })
      .eq('id', recordId);

    if (updateError) {
      console.error('❌ Error updating replies:', updateError.message);
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: status === 'ok' ? '✅ Отметка сохранена' : '❓ Вопрос зафиксирован',
        show_alert: false
      })
    });

    await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: telegramMessageId,
        reply_markup: { inline_keyboard: [] }
      })
    });
  } catch (err) {
    console.error('❌ handleOkNotOkCallback error:', err.message);
  }
}

async function getVacationReport(supabase) {
  const today = new Date().toISOString().split('T')[0];

  const { data: requestDates, error: requestDatesError } = await supabase
    .from('requests_dates')
    .select('*')
    .eq('date', today);

  if (requestDatesError) throw requestDatesError;
  if (!requestDates || requestDates.length === 0) return '📅 Сегодня отсутствующих нет:\n\n✅ Все на работе';

  const requestIds = requestDates.map((req) => req.request_id);

  const { data: requestsInfo, error: requestsInfoError } = await supabase
    .from('requests_info')
    .select('request_id, request_type, chat_id, comment, time_from, time_to, status')
    .in('request_id', requestIds)
    .eq('status', 'approved');

  if (requestsInfoError) throw requestsInfoError;
  if (!requestsInfo || requestsInfo.length === 0) return '📅 Сегодня отсутствующих нет:\n\n✅ Все на работе (нет одобренных заявок)';

  const requestsWithDateRanges = [];
  for (const request of requestsInfo) {
    const { data: allDatesForRequest, error: datesError } = await supabase
      .from('requests_dates')
      .select('date')
      .eq('request_id', request.request_id)
      .order('date', { ascending: true });

    if (datesError || !allDatesForRequest || allDatesForRequest.length === 0) {
      requestsWithDateRanges.push({ ...request, dateRange: null, startDate: null, endDate: null });
      continue;
    }

    const dates = allDatesForRequest.map((d) => d.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    requestsWithDateRanges.push({
      ...request,
      dateRange: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
      startDate,
      endDate,
      totalDays: dates.length
    });
  }

  const chatIds = requestsWithDateRanges.map((req) => req.chat_id).filter(Boolean);
  if (chatIds.length === 0) return '📅 Сегодня отсутствующих нет:\n\n✅ Все на работе';

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('chat_id, user_name, user_department')
    .in('chat_id', chatIds);

  if (usersError) throw usersError;

  const userMap = {};
  (users || []).forEach((user) => { userMap[user.chat_id] = user; });

  const requestsByType = { vacation: [], sickday: [], work: [], other: [] };

  requestsWithDateRanges.forEach((request) => {
    const user = userMap[request.chat_id];
    if (!user) return;
    const key = ['vacation', 'sickday', 'work', 'other'].includes(request.request_type)
      ? request.request_type
      : 'other';
    requestsByType[key].push({ user, request });
  });

  function formatTimeRange(timeFrom, timeTo) {
    if (timeFrom && timeTo) return ` (${timeFrom.slice(0, 5)} - ${timeTo.slice(0, 5)})`;
    if (timeFrom) return ` (с ${timeFrom.slice(0, 5)})`;
    if (timeTo) return ` (до ${timeTo.slice(0, 5)})`;
    return '';
  }

  function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  function formatDateRange(dateRange, totalDays) {
    if (!dateRange) return '';
    if (dateRange.includes(' - ')) {
      const [start, end] = dateRange.split(' - ');
      const daysText = totalDays ? ` (${totalDays} дн.)` : '';
      return `\n   📅 ${formatDateShort(start)} - ${formatDateShort(end)}${daysText}`;
    }
    return `\n   📅 ${formatDateShort(dateRange)}`;
  }

  function formatUserInfo(userData, index) {
    const { user, request } = userData;
    const timeRange = formatTimeRange(request.time_from, request.time_to);
    const dateRange = formatDateRange(request.dateRange, request.totalDays);
    const comment = request.comment ? `\n   💬 ${request.comment}` : '';
    return `${index + 1}. <b>${user.user_name}</b> (${user.user_department})${timeRange}${dateRange}${comment}`;
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  let message = `📅 <b>Отчет на ${formatDate(today)}</b>\n\n`;
  let hasAnyRequests = false;

  const sections = [
    { key: 'vacation', label: '🏖️ <b>В отпуске:</b>' },
    { key: 'sickday',  label: '🤒 <b>На больничном:</b>' },
    { key: 'work',     label: '💼 <b>По работе:</b>' },
    { key: 'other',    label: '📋 <b>Другое:</b>' }
  ];

  for (const { key, label } of sections) {
    if (requestsByType[key].length > 0) {
      message += `${label}\n`;
      requestsByType[key].forEach((userData, index) => {
        message += formatUserInfo(userData, index) + '\n';
      });
      message += '\n';
      hasAnyRequests = true;
    }
  }

  if (!hasAnyRequests) {
    message += '✅ <b>Все на работе</b>';
  } else {
    message += `📊 <b>Всего отсутствует: ${requestsWithDateRanges.length}</b>`;
  }

  return message;
}

router.post('/telegram/webhook', webhookLimiter, verifyTelegramSecret, async (req, res) => {
  res.status(200).json({ success: true });

  const supabase = getSupabase();
  const TELEGRAM_BOT_TOKEN = getBotToken();
  const payload = req.body;

  try {
    if (payload.message && payload.message.text) {
      const messageText = payload.message.text.trim();
      const chatId = payload.message.chat.id;
      const fromUserId = payload.message.from.id.toString();

      if (messageText.startsWith('/start')) {
        const startParam = messageText.split(' ')[1] || null;

        if (startParam && startParam.startsWith('test_')) {
          const testId = startParam.replace('test_', '');
          const appUrl = `https://hi-tech-office-app.onrender.com?test=${testId}`;

          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '📋 Открыть тест:', {
            reply_markup: {
              inline_keyboard: [[{ text: '▶️ Начать тест', web_app: { url: appUrl } }]]
            }
          });
        } else if (startParam && startParam.startsWith('type_')) {
          const typeValue = startParam.replace('type_', '');
          const appUrl = `https://hi-tech-office-app.onrender.com/?type=${typeValue}`;

          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '📋 Открыть тест:', {
            reply_markup: {
              inline_keyboard: [[{ text: '▶️ Посмотреть тесты', web_app: { url: appUrl } }]]
            }
          });
        } else {
          const greetingMessage =
            `Добро пожаловать в Электронный Журнал Хайтек!\n\n` +
            `Ваш Chat ID: <code>${chatId}</code>\n\n` +
            `Здесь вы можете подавать заявки на отпуск, больничный и другие отсутствия. ` +
            `После отправки заявки, менеджеры будут уведомлены и смогут одобрить или отклонить ваш запрос.\n\n` +
            `Для начала работы используйте кнопку приложение ниже.`;

          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, greetingMessage, { parse_mode: 'HTML' });
        }

        return;
      }

      if (messageText === '/отпуски' && ALLOWED_MANAGERS[fromUserId]) {
        try {
          const vacationMessage = await getVacationReport(supabase);
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, vacationMessage, { parse_mode: 'HTML' });
        } catch (error) {
          console.error('❌ /отпуски error:', error.message);
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, '❌ Ошибка при получении информации об отсутствующих', { parse_mode: 'HTML' });
        }
        return;
      }
    }

    if (!payload.callback_query) return;

    const callback = payload.callback_query;
    const callbackId = callback.id;
    const chatId = callback.message?.chat?.id;
    const messageId = callback.message?.message_id;
    const callbackData = callback.data;

    if (callbackData && callbackData.startsWith('msg_seen_')) {
      await handleMsgSeenCallback(supabase, TELEGRAM_BOT_TOKEN, callbackId, callbackData, chatId, messageId);
      return;
    }

    if (callbackData && (callbackData.startsWith('ok_msg_') || callbackData.startsWith('notok_msg_'))) {
      await handleOkNotOkCallback(supabase, TELEGRAM_BOT_TOKEN, callback);
      return;
    }

    const [action, rid, uid] = callback.data?.split('|') || [];
    if (!action || !rid || !uid) {
      throw new Error('Invalid or legacy callback data format');
    }

    const requestId = rid;
    const userChatId = uid;
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    const statusTextRu = action === 'approve' ? 'Одобрен' : 'Отклонен';
    const managerName = ALLOWED_MANAGERS[callback.from?.id?.toString()] || 'Неизвестный менеджер';
    const originalText = callback.message?.text || '';

    let requestType = '';
    try {
      const { data, error } = await supabase
        .from('requests_info')
        .select('request_type')
        .eq('request_id', requestId)
        .single();
      if (error) throw error;
      requestType = data?.request_type || '';
    } catch (e) {
      console.error('❌ Error fetching request type:', e.message);
    }

    try {
      const { error } = await supabase
        .from('requests_info')
        .update({ status: statusValue })
        .eq('request_id', requestId);
      if (error) throw error;
    } catch (e) {
      console.error('❌ Supabase update error:', e.message);
    }

    if (requestType === 'vacation' && statusValue === 'approved') {
      try {
        const { data: vacationDates, error: datesError } = await supabase
          .from('requests_dates')
          .select('date')
          .eq('request_id', requestId);

        if (!datesError && vacationDates && vacationDates.length > 0) {
          const daysToDeduct = vacationDates.length;

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('vacations_available')
            .eq('chat_id', userChatId)
            .single();

          if (!userError && userData) {
            const newDays = parseFloat(userData.vacations_available || '0') - daysToDeduct;
            const { error: updateError } = await supabase
              .from('users')
              .update({ vacations_available: newDays.toString() })
              .eq('chat_id', userChatId);
            if (updateError) console.error('❌ Error updating vacations_available:', updateError.message);
          }
        }
      } catch (e) {
        console.error('❌ Error deducting vacation days:', e.message);
      }
    }

    try {
      let userMessage = `Ваш запрос был ${statusTextRu.toLowerCase()}, ${managerName}.`;

      if (requestType === 'vacation' && statusValue === 'approved') {
        const { data: vacationDates, error: datesError } = await supabase
          .from('requests_dates')
          .select('date')
          .eq('request_id', requestId);

        if (!datesError && vacationDates) {
          if (vacationDates.length > 4) {
            userMessage += '\n\nПожалуйста, подпишите заявление на отпуск у бухгалтера.';
          }

          const { data: updatedUser } = await supabase
            .from('users')
            .select('vacations_available')
            .eq('chat_id', userChatId)
            .single();

          if (updatedUser) {
            userMessage += `\n\n📅 Остаток дней отпуска: *${updatedUser.vacations_available}*`;
          }
        }
      }

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, userChatId, userMessage, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('❌ Error sending message to user:', e.message);
    }

    try {
      const updatedText = `${originalText}\n\nСтатус: ${statusTextRu} (${managerName})`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: updatedText,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        })
      });
    } catch (e) {
      console.error('❌ Error editing original message:', e.message);
    }

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callback.id,
          text: `Запрос ${statusTextRu.toLowerCase()}.`
        })
      });
    } catch (e) {
      console.error('❌ Error answering callback query:', e.message);
    }

  } catch (e) {
    console.error('⚠️ Telegram webhook processing error:', e.message);
  }
});

module.exports = router;