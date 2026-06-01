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
  return process.env.TELEGRAM_BOT_TOKENSHOP || '';
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
    console.error('[telegram-webhook-shop] TELEGRAM_WEBHOOK_SECRET is not set');
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

async function handleStartCommand(supabase, botToken, message) {
  const chatId = message.chat.id.toString();
  const username = message.from.username || message.from.first_name || 'Unknown';
  const startParam = (message.text || '').split(' ')[1] || null;

  if (startParam && startParam.startsWith('test_')) {
    const testId = startParam.replace('test_', '');
    const appUrl = `https://hi-tech-office-app.onrender.com?test=${testId}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '📋 Открыть тест:',
        reply_markup: {
          inline_keyboard: [[{ text: '▶️ Начать тест', web_app: { url: appUrl } }]]
        }
      })
    });
    return;
  }

  if (startParam && startParam.startsWith('type_')) {
    const typeValue = startParam.replace('type_', '');
    const appUrl = `https://hi-tech-office-app.onrender.com/?type=${typeValue}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '📋 Открыть тест:',
        reply_markup: {
          inline_keyboard: [[{ text: '▶️ Посмотреть тесты', web_app: { url: appUrl } }]]
        }
      })
    });
    return;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `Ваш код ${chatId}. Напишите в отдел кадров @Zaharchuk_AV ваш код, ФИО, магазин в котором работаете и отдел. `
    })
  });

  try {
    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('id')
      .eq('chat_id', chatId);

    if (error) throw error;

    if (!existingUsers || existingUsers.length === 0) {
      await notifyHR(botToken, username, chatId);
    }
  } catch (err) {
    console.error('[telegram-webhook-shop] Start command error:', err.message);
  }
}

async function handleUserMessage(supabase, message) {
  const chatId = message.chat.id.toString();
  const messageText = message.text;

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_name, user_department')
      .eq('chat_id', chatId)
      .single();

    if (userError || !user) {
      console.error('[telegram-webhook-shop] User not found:', chatId);
      return;
    }

    const { error: insertError } = await supabase
      .from('chat')
      .insert({
        chat_id: chatId,
        shop: user.user_department,
        name: user.user_name,
        direction: 'in',
        message_body: messageText,
        status: 'not_read'
      });

    if (insertError) throw insertError;
  } catch (err) {
    console.error('[telegram-webhook-shop] Error handling user message:', err.message);
  }
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
      console.error('[telegram-webhook-shop] Error updating chat status:', error.message);
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
    console.error('[telegram-webhook-shop] handleMsgSeenCallback error:', err.message);
  }
}

async function handleCallbackQuery(supabase, botToken, callbackQuery) {
  const { id: callbackId, from, data, message } = callbackQuery;
  const chatId = from.id;
  const telegramMessageId = message?.message_id;

  if (!data || !chatId || !telegramMessageId) return;

  if (data.startsWith('msg_seen_')) {
    await handleMsgSeenCallback(supabase, botToken, callbackId, data, chatId, telegramMessageId);
    return;
  }

  const [status, type, idStr] = data.split('_');
  const recordId = parseInt(idStr, 10);

  if (!recordId || !['ok', 'notok'].includes(status) || !['msg', 'test'].includes(type)) {
    console.error('[telegram-webhook-shop] Invalid callback format:', data);
    return;
  }

  const table = type === 'msg' ? 'shops_sent_msgs' : 'shops_tests';

  try {
    const { data: existingData, error: fetchError } = await supabase
      .from(table)
      .select('replies')
      .eq('id', recordId)
      .single();

    if (fetchError) {
      console.error('[telegram-webhook-shop] Error fetching replies:', fetchError.message);
      return;
    }

    const replies = Array.isArray(existingData?.replies) ? existingData.replies : [];
    replies.push({ chat_id: chatId, status });

    const { error: updateError } = await supabase
      .from(table)
      .update({ replies })
      .eq('id', recordId);

    if (updateError) {
      console.error('[telegram-webhook-shop] Error updating replies:', updateError.message);
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
    console.error('[telegram-webhook-shop] Callback processing error:', err.message);
  }
}

async function notifyHR(botToken, username, chatId) {
  const hrChatIds = [
    process.env.HR_CHAT_ID,
    process.env.HR_CHAT_ID_2
  ].filter(Boolean);

  if (hrChatIds.length === 0) {
    console.error('[telegram-webhook-shop] No HR_CHAT_ID configured');
    return;
  }

  const message = `🆕 Обнаружен новый пользователь:\n👤 Username: ${username}\n🆔 Chat ID: ${chatId}`;

  await Promise.all(hrChatIds.map(async (hrChatId) => {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: hrChatId, text: message })
      });
    } catch (err) {
      console.error(`[telegram-webhook-shop] HR notification error (${hrChatId}):`, err.message);
    }
  }));
}

router.post('/telegram/webhook-shop', webhookLimiter, verifyTelegramSecret, async (req, res) => {
  res.status(200).json({ success: true });

  const supabase = getSupabase();
  const botToken = getBotToken();
  const update = req.body;

  try {
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
      await handleStartCommand(supabase, botToken, update.message);
      return;
    }

    if (update.message && update.message.text && !update.message.text.startsWith('/')) {
      await handleUserMessage(supabase, update.message);
      return;
    }

    if (update.callback_query) {
      await handleCallbackQuery(supabase, botToken, update.callback_query);
      return;
    }
  } catch (err) {
    console.error('[telegram-webhook-shop] Handler error:', err.message);
  }
});

module.exports = router;