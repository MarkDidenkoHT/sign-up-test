const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TELEGRAM_SENDER_URL = process.env.BOT_API_URL;
const TELEGRAM_SHOP_URL = process.env.BOT_API_URL_FOR_SHOP;

const SERVICE_ROLES = ['admin', 'category_manager', 'hr'];

const ALLOWED_IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectImageType(buffer) {
  for (const sig of ALLOWED_IMAGE_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) return sig.mime;
  }
  return null;
}

const supabaseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.post('/upload-image', requireRole(...SERVICE_ROLES), supabaseUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const detectedMime = detectImageType(file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Invalid image file' });
    }

    const ext = detectedMime.split('/')[1].replace('jpeg', 'jpg');
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: detectedMime,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }

    const { data: publicData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    res.json({
      success: true,
      viewLink: publicData.publicUrl,
      path: data.path
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/shop-users', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('chat_id, user_name, role, access, user_department, user_team, groups')
      .order('id', { ascending: true });

    if (error) throw error;
    res.json({ success: true, users: data });
  } catch (err) {
    console.error('Shop users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.patch('/shops-sent-messages/:id', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = typeof status === 'string' ? status.trim().slice(0, 100) : null;
    if (notes !== undefined) updateData.notes = typeof notes === 'string' ? notes.trim().slice(0, 1000) : null;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('shops_sent_msgs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update message error:', error);
      return res.status(500).json({ error: 'Ошибка при обновлении сообщения' });
    }

    res.json({ success: true, message: data });
  } catch (err) {
    console.error('Patch message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shops-sent-messages', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { recipients, message_body, photo_urls, message_id, status, timestamp } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid recipients' });
    }
    if (!message_body || typeof message_body !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message_body' });
    }

    const payload = {
      recipients,
      message_body: message_body.trim().slice(0, 4000),
      photo_urls: Array.isArray(photo_urls) ? photo_urls.slice(0, 10) : [],
      message_id: message_id && typeof message_id === 'object' ? message_id : {},
      status: typeof status === 'string' ? status.trim().slice(0, 100) : 'sent',
      timestamp: timestamp || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('shops_sent_msgs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Insert message error:', error);
      return res.status(500).json({ error: 'Ошибка при сохранении сообщения' });
    }

    res.json({ success: true, message: data });
  } catch (err) {
    console.error('Post message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shops-sent-messages', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shops_sent_msgs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json({ success: true, messages: data });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Ошибка загрузки сообщений' });
  }
});

router.delete('/shops-sent-messages/:id', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: messageRecord, error: fetchError } = await supabase
      .from('shops_sent_msgs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Fetch message error:', fetchError);
      return res.status(500).json({ error: 'Ошибка при получении сообщения' });
    }

    if (!messageRecord) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    const deletionResult = await deleteTelegramMessagesForAll(messageRecord);

    const { error } = await supabase
      .from('shops_sent_msgs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete message error:', error);
      return res.status(500).json({ error: 'Ошибка при удалении сообщения' });
    }

    res.json({
      success: true,
      databaseDeleted: true,
      telegramDeletion: deletionResult,
      message: `Сообщение удалено из базы данных. Удалено из Telegram: ${deletionResult.successCount} из ${messageRecord.recipients?.length || 0} получателей.`
    });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/message-history', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { data: msgs, error } = await supabase
      .from('shops_sent_msgs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: msgs });
  } catch (err) {
    console.error('Message history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shops/:chatId', requireRole(...SERVICE_ROLES), async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: 'Missing chatId' });

    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .eq('chat_id', chatId)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Fetch shops error:', error);
      return res.status(500).json({ error: 'Failed to fetch shops' });
    }

    res.json(shops);
  } catch (err) {
    console.error('Shops error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/secure-send-telegram-message', requireRole(...SERVICE_ROLES), async (req, res) => {
  const requestId = `main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { chat_id, message, photo_urls = [], reply_markup } = req.body;

    if (!chat_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: chat_id and message',
        request_id: requestId
      });
    }

    const result = await sendTelegramMessageMain(chat_id, message, photo_urls, reply_markup);

    res.json({
      success: result.success,
      message_id: result.message_id || null,
      details: result.details || null,
      request_id: requestId
    });
  } catch (error) {
    console.error('Send telegram message error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', request_id: requestId });
  }
});

router.post('/secure-send-telegram-shop-message', requireRole(...SERVICE_ROLES), async (req, res) => {
  const requestId = `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { chat_id, message, photo_urls = [], reply_markup } = req.body;

    if (!chat_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: chat_id and message',
        request_id: requestId
      });
    }

    const result = await sendTelegramMessageShop(chat_id, message, photo_urls, reply_markup);

    res.json({
      success: result.success,
      message_id: result.message_id || null,
      details: result.details || null,
      request_id: requestId
    });
  } catch (error) {
    console.error('Send telegram shop message error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', request_id: requestId });
  }
});

async function deleteTelegramMessagesForAll(messageRecord) {
  try {
    if (!messageRecord.recipients || !Array.isArray(messageRecord.recipients) || messageRecord.recipients.length === 0) {
      return { success: false, error: 'No recipients found' };
    }

    const messageIdMap = messageRecord.message_id || {};
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const chatId of messageRecord.recipients) {
      if (!chatId) continue;
      const telegramMessageId = messageIdMap[chatId];
      if (!telegramMessageId) {
        errorCount++;
        results.push({ chatId, success: false, error: 'No message ID stored' });
        continue;
      }

      try {
        const response = await fetch(`${process.env.BOT_API_URL_FOR_SHOP}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: telegramMessageId })
        });

        if (!response.ok) {
          const fallbackResponse = await fetch(`${process.env.BOT_API_URL}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: telegramMessageId })
          });

          if (!fallbackResponse.ok) {
            errorCount++;
            results.push({ chatId, success: false, error: 'Deletion failed' });
          } else {
            successCount++;
            results.push({ chatId, success: true, method: 'fallback' });
          }
        } else {
          successCount++;
          results.push({ chatId, success: true, method: 'primary' });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Telegram delete error for chatId', chatId, error);
        errorCount++;
        results.push({ chatId, success: false, error: 'Deletion failed' });
      }
    }

    return { success: successCount > 0, successCount, errorCount, results };
  } catch (error) {
    console.error('deleteTelegramMessagesForAll error:', error);
    return { success: false, error: 'Internal error' };
  }
}

async function sendTelegramMessageMain(chatId, message, photoUrls = [], replyMarkup = null) {
  try {
    let result;

    if (photoUrls && photoUrls.length > 0) {
      if (photoUrls.length > 1) {
        const media = photoUrls.map(url => ({ type: 'photo', media: url }));
        result = await fetch(`${TELEGRAM_SENDER_URL}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, media })
        });
      } else {
        const payload = {
          chat_id: chatId,
          photo: photoUrls[0],
          caption: message,
          parse_mode: 'HTML'
        };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        result = await fetch(`${TELEGRAM_SENDER_URL}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } else {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;
      result = await fetch(`${TELEGRAM_SENDER_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await result.json();
    return {
      success: data.ok || false,
      message_id: data.result?.message_id || null,
      details: data.description || null
    };
  } catch (error) {
    console.error('sendTelegramMessageMain error:', error);
    return { success: false, details: null };
  }
}

async function sendTelegramMessageShop(chatId, message, photoUrls = [], replyMarkup = null) {
  try {
    let result;

    if (photoUrls && photoUrls.length > 0) {
      if (photoUrls.length > 1) {
        const media = photoUrls.map(url => ({ type: 'photo', media: url }));
        result = await fetch(`${TELEGRAM_SHOP_URL}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, media })
        });
      } else {
        const payload = {
          chat_id: chatId,
          photo: photoUrls[0],
          caption: message,
          parse_mode: 'HTML'
        };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        result = await fetch(`${TELEGRAM_SHOP_URL}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } else {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;
      result = await fetch(`${TELEGRAM_SHOP_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await result.json();
    return {
      success: data.ok || false,
      message_id: data.result?.message_id || null,
      details: data.description || null
    };
  } catch (error) {
    console.error('sendTelegramMessageShop error:', error);
    return { success: false, details: null };
  }
}

module.exports = router;