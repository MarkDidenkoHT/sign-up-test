const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { registerModuleConnection } = require('../utils/realtime');
const { notifyError } = require('../utils/errorNotifier');

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

router.post('/track-module-usage', async (req, res) => {
  try {
    const { userChatId, moduleName } = req.body;

    if (!userChatId || !moduleName) {
      return res.status(400).json({ error: 'userChatId and moduleName are required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('module_usage_stats')
      .insert({
        user_chat_id: String(userChatId),
        module: moduleName,
        usage_date: today
      });

    if (error) {
      console.error('Error tracking module usage:', error);
      await notifyError('Module Stats: Track Usage Error', error.message, {
        endpoint: req.path,
        method: req.method,
        userChatId,
        moduleName,
        ip: req.ip
      });
      return res.status(500).json({ error: 'Failed to track usage' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    await notifyError('Module Stats: Track Usage Error', err.message, {
      endpoint: req.path,
      method: req.method,
      body: req.body,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/module-stats', async (req, res) => {
  try {
    const { data: stats, error: statsError } = await supabase
      .from('module_usage_stats')
      .select('id, user_chat_id, module, usage_date')
      .order('usage_date', { ascending: false });

    if (statsError) {
      console.error('Database error:', statsError);
      await notifyError('Module Stats: Fetch Stats Error', statsError.message, {
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    const chatIds = [...new Set((stats || []).map(r => r.user_chat_id).filter(Boolean))];

    let userMap = {};

    if (chatIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('chat_id, user_name, user_department')
        .in('chat_id', chatIds);

      if (!usersError && users) {
        users.forEach(u => {
          userMap[u.chat_id] = {
            name: u.user_name || null,
            department: u.user_department || null
          };
        });
      }
    }

    const enriched = (stats || []).map(r => ({
      ...r,
      user_name: userMap[r.user_chat_id]?.name || null,
      user_department: userMap[r.user_chat_id]?.department || null
    }));

    res.json({ success: true, stats: enriched, adminChatId: ADMIN_CHAT_ID || null });
  } catch (err) {
    console.error('Error fetching module stats:', err);
    await notifyError('Module Stats: Fetch Stats Error', err.message, {
      endpoint: req.path,
      method: req.method,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/module-events', async (req, res) => {
  registerModuleConnection(req, res);
});

module.exports = router;