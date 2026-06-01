const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabase, registerChatConnection } = require('../utils/realtime');
const { notifyError } = require('../utils/errorNotifier');

const WAREHOUSE_ID_TO_CODE = {
  '30': 'ТЦТ',
  '28': 'Т2',
  '1':  'Б1',
  '29': 'ТЦБ',
  '31': 'Р2',
  '5':  'Р1',
  '3':  'ДУБ',
  '33': 'ГР',
  '4':  'КАМ',
  '6':  'СЛ',
  '2':  'ДН',
  '35': 'ПЕР',
  '36': 'БХД',
  '34': 'ГХД'
};

async function fetchItemStoresInStock(itemCode) {
  try {
    const normalizedCode = itemCode.startsWith('Т-') ? itemCode : `Т-${itemCode}`;
    console.log(`Fetching stores with stock for code: ${normalizedCode}`);

    const url = `https://hi-tech.md/product-api.php?code=${encodeURIComponent(normalizedCode)}&token=${process.env.HITECH_API_TOKEN}`;

    const response = await axios.get(url, { timeout: 60000 });

    if (!response.data.success) {
      console.log('Product not found or API error');
      return [];
    }

    const warehouses = response.data.additional?.warehouses || [];
    const storesInStock = warehouses
      .filter(w => parseInt(w.amount) > 0)
      .map(w => ({
        id: w.warehouse_id,
        code: WAREHOUSE_ID_TO_CODE[w.warehouse_id],
        amount: w.amount
      }))
      .filter(w => w.code);

    console.log('Found stores with stock:', storesInStock.length);
    return storesInStock;

  } catch (error) {
    console.error('Error fetching stores with stock:', error.message);
    await notifyError('fetchItemStoresInStock', error.message, {
      itemCode,
      stack: error.stack
    });
    return [];
  }
}

router.post('/all-pending-price-tags', async (req, res, next) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Missing required field: chatId' });
    }

    const { data: tasks, error } = await supabase
      .from('price_tag_tasks')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const processedTasks = tasks.map(task => ({
      ...task,
      error_type_display: Array.isArray(task.error_type)
        ? task.error_type.join(', ')
        : task.error_type || 'Не указан'
    }));

    res.json({ success: true, tags: processedTasks });

  } catch (err) {
    next(err);
  }
});

router.post('/send-telegram-message', async (req, res, next) => {
  const { chatId, text, recordId } = req.body;
  try {
    await fetch(`https://api.telegram.org/bot7444441769:AAGhmsL_2-rMeNtJNzlf407OPAKjTrcgZiM/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: {
          inline_keyboard: [[
            {
              text: "просмотрено",
              callback_data: `msg_seen_${recordId}`
            }
          ]]
        }
      })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/chat-messages', async (req, res, next) => {
  try {
    const { chatId, date, limit = 50, offset = 0, since } = req.query;

    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Missing required field: chatId' });
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    if (since) {
      const { data, error } = await supabase
        .from('chat')
        .select('*')
        .eq('chat_id', chatId)
        .gt('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return res.json({ success: true, messages: data, hasMore: false });
    }

    const { count, error: countError } = await supabase
      .from('chat')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (countError) throw countError;

    const totalMessages = count || 0;
    const reversedOffset = Math.max(0, totalMessages - offsetNum - limitNum);
    const reversedLimit = Math.min(limitNum, totalMessages - offsetNum);

    console.log(`Pagination: offset=${offsetNum}, limit=${limitNum}, total=${totalMessages}, reversedOffset=${reversedOffset}, reversedLimit=${reversedLimit}`);

    let query = supabase
      .from('chat')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .range(reversedOffset, reversedOffset + reversedLimit - 1);

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const messages = data.reverse();
    const hasMore = (offsetNum + limitNum) < totalMessages;

    console.log(`Returning ${messages.length} messages, hasMore: ${hasMore}, next offset: ${offsetNum + messages.length}`);

    res.json({ success: true, messages, hasMore });

  } catch (err) {
    next(err);
  }
});

router.get('/chat-search', async (req, res, next) => {
  try {
    const { chatId, query } = req.query;

    if (!chatId || !query) {
      return res.status(400).json({ success: false, error: 'Missing required fields: chatId, query' });
    }

    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('chat_id', chatId)
      .ilike('message_body', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({ success: true, messages: data });

  } catch (err) {
    next(err);
  }
});

router.get('/chat-events', async (req, res) => {
  const { chatId } = req.query;

  if (!chatId) {
    return res.status(400).json({ error: 'Missing chatId' });
  }

  registerChatConnection(req, res, chatId);
});

router.post('/save-outgoing-message', async (req, res, next) => {
  try {
    const chat_id = req.session.user_chat_id;
    const { message_body } = req.body;

    if (!message_body) {
      return res.status(400).json({ success: false, error: 'Missing required field: message_body' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_team, user_name')
      .eq('chat_id', chat_id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    const { data, error } = await supabase
      .from('chat')
      .insert({
        chat_id: chat_id,
        shop: userData?.user_team || null,
        name: userData?.user_name || null,
        direction: 'out',
        message_body: message_body,
        status: 'sent'
      })
      .select('id')
      .single();

    if (error) throw error;

    res.json({ success: true, recordId: data.id });

  } catch (err) {
    next(err);
  }
});

router.post('/all-price-tag-tasks', async (req, res, next) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Missing required field: chatId' });
    }

    const { data: tasks, error } = await supabase
      .from('price_tag_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const processedTasks = tasks.map(task => ({
      ...task,
      error_type_display: Array.isArray(task.error_type)
        ? task.error_type.join(', ')
        : task.error_type || 'Не указан'
    }));

    res.json({ success: true, tags: processedTasks });

  } catch (err) {
    next(err);
  }
});

router.post('/update-error-type', async (req, res, next) => {
  try {
    const { taskId, errorType } = req.body;
    if (!taskId || !errorType) {
      return res.status(400).json({ success: false, error: 'Missing taskId or errorType' });
    }

    const { data, error } = await supabase
      .from('price_tag_tasks')
      .update({ error_type_display: errorType, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, task: data });
  } catch (err) {
    next(err);
  }
});

router.post('/change-price-tag-status', async (req, res, next) => {
  try {
    const { taskId, status, chatId } = req.body;
    console.log(`📥 Request received: taskId=${taskId}, status=${status}, chatId=${chatId}`);

    if (!taskId || !status || !chatId) {
      return res.status(400).json({ success: false, error: 'Missing required fields: taskId, status, chatId' });
    }

    const validStatuses = ['new', 'completed', 'cancelled', 'in_progress'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { data: task, error } = await supabase
      .from('price_tag_tasks')
      .update({ status, updated_at: new Date(Date.now()).toISOString() })
      .eq('id', taskId)
      .select('id, item_code, item_name, category, status, updated_at')
      .single();

    if (error) throw error;

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (status === 'completed' && task.category) {
      const storesInStock = await fetchItemStoresInStock(task.item_code);
      console.log(`🏪 Stores with item in stock:`, JSON.stringify(storesInStock, null, 2));

      if (storesInStock.length > 0) {
        const shopCodes = storesInStock.map(store => store.code).filter(code => code !== null);

        if (shopCodes.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('chat_id, user_team, groups_msg')
            .in('user_team', shopCodes);

          if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            await notifyError('change-price-tag-status: fetch users', usersError.message, {
              taskId,
              shopCodes,
              stack: usersError.stack
            });
          } else {
            const notifiedUsers = users.filter(u =>
              Array.isArray(u.groups_msg) && u.groups_msg.includes(task.category)
            );

            const notificationResults = await Promise.allSettled(
              notifiedUsers.map(async (u) => {
                if (!u.chat_id) return;
                const resp = await fetch(`${process.env.BOT_API_URL_FOR_SHOP}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: u.chat_id,
                    text: `Ошибка по ценнику ${task.item_code}${task.item_name ? ` (${task.item_name})` : ''} исправлена, перепечатайте ценник`
                  })
                });
                if (!resp.ok) {
                  const respText = await resp.text();
                  console.error(`❌ TG error for ${u.chat_id}: ${respText}`);
                  throw new Error(`TG send failed for chat_id=${u.chat_id}: ${respText}`);
                }
              })
            );

            const failures = notificationResults.filter(r => r.status === 'rejected');
            const successCount = notificationResults.length - failures.length;
            console.log(`✅ Sent ${successCount}/${notifiedUsers.length} notifications successfully`);

            if (failures.length > 0) {
              await notifyError('change-price-tag-status: telegram notifications', `${failures.length} notification(s) failed`, {
                taskId,
                itemCode: task.item_code,
                totalAttempted: notifiedUsers.length,
                failureReasons: failures.map(f => f.reason?.message || String(f.reason))
              });
            }
          }
        }
      }
    }

    res.json({ success: true, message: `Status changed to ${status}`, task });
  } catch (err) {
    next(err);
  }
});

router.get('/shop-user', async (req, res, next) => {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId parameter is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ success: true, user: null });
      }
      throw error;
    }

    res.json({ success: true, user: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;