const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../utils/db');
const { notifyError } = require('../utils/errorNotifier');
const { verifySession, requireRole } = require('../middleware/auth');

const supabaseUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

async function sendTestNotification(chatId, role, testId, testTitle, customMessage) {
  const isShopRole = role === 'shop' || role === 'shop_director';
  const botUrl = isShopRole ? process.env.BOT_API_URL_FOR_SHOP : process.env.BOT_API_URL;
  
  const webAppUrl = `https://hi-tech-office-app.onrender.com?test=${testId}`;
  
  let messageText = customMessage || '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';
  messageText = messageText.replace(/\*Название теста\*/g, `*${testTitle}*`);

  try {
    const response = await fetch(`${botUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { 
              text: '▶️ Пройти тест', 
              web_app: { url: webAppUrl }
            }
          ]]
        }
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveRecipients(recipients) {
  let query = supabase.from('users').select('chat_id, role, user_department, user_team').eq('access', true);

  if (!recipients || recipients === 'all') {
    const { data } = await query;
    return data || [];
  }

  const { departments = [], teams = [] } = recipients;

  if (departments.length === 0 && teams.length === 0) {
    const { data } = await query;
    return data || [];
  }

  const { data: allUsers } = await query;
  if (!allUsers) return [];

  return allUsers.filter(u => {
    if (departments.length > 0 && u.user_department && departments.includes(u.user_department)) return true;
    if (teams.length > 0 && u.user_team && teams.includes(u.user_team)) return true;
    return false;
  });
}

router.get('/tests/results', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { data: answers, error } = await supabase
      .from('test_answers')
      .select('*')
      .eq('hidden', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const chatIds = [...new Set((answers || []).map(a => a.chat_id).filter(Boolean))];

    let usersMap = {};
    if (chatIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('chat_id, user_name, user_department')
        .in('chat_id', chatIds);

      if (users) {
        users.forEach(u => { usersMap[u.chat_id] = u; });
      }
    }

    const data = (answers || []).map(a => ({
      ...a,
      user: usersMap[a.chat_id] || null
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error getting test results:', err);
    await notifyError('Tests: Get Results Error', err.message, {
      endpoint: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки результатов' });
  }
});

router.get('/tests/list', verifySession, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error('Error getting tests:', err);
    await notifyError('Tests: Get Tests Error', err.message, {
      endpoint: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки тестов'
    });
  }
});

router.post('/tests/create', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { title, body, questions, test_type, manager_chat_id, test_settings, images, recipients, send_notifications = true } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
    }

    const { data, error } = await supabase
      .from('tests')
      .insert({
        title,
        body: body || null,
        questions,
        images: images || [],
        test_type: test_type || null,
        test_settings: test_settings || null,
        manager_chat_id: manager_chat_id || null,
        recipients: recipients || 'all',
        timestamp: new Date().toISOString(),
        status_active: false,
        notification_sent: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data, notified: 0 });
  } catch (err) {
    console.error('Error creating test:', err);
    await notifyError('Tests: Create Test Error', err.message, {
      endpoint: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка создания теста'
    });
  }
});

router.post('/tests/upload-image', verifySession, requireRole('admin', 'hr'), supabaseUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExt = file.originalname.slice(file.originalname.lastIndexOf('.')) || '.bin';
    const fileName = `test-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return res.status(500).json({ error: 'Upload failed', details: error });
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
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

router.get('/tests/recipients-data', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_department, user_team, role')
      .eq('access', true);

    if (error) throw error;

    const departments = [...new Set((data || []).map(u => u.user_department).filter(Boolean))].sort();
    const teams = [...new Set((data || []).map(u => u.user_team).filter(Boolean))].sort();

    res.json({ success: true, departments, teams });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка загрузки данных' });
  }
});

router.get('/tests/:id', verifySession, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('Error getting test:', err);
    await notifyError('Tests: Get Test Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки теста'
    });
  }
});

router.put('/tests/:id', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, questions, test_type, test_settings, images, recipients, recipients_changed = false, manager_chat_id } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля'
      });
    }

    const { data: currentTest, error: fetchError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const editedFields = [];
    if (currentTest.title !== title) editedFields.push('title');
    if (currentTest.body !== body) editedFields.push('body');
    if (JSON.stringify(currentTest.questions) !== JSON.stringify(questions)) editedFields.push('questions');
    if (currentTest.test_type !== test_type) editedFields.push('test_type');
    if (JSON.stringify(currentTest.test_settings) !== JSON.stringify(test_settings)) editedFields.push('test_settings');
    if (JSON.stringify(currentTest.images) !== JSON.stringify(images)) editedFields.push('images');
    if (JSON.stringify(currentTest.recipients) !== JSON.stringify(recipients ?? 'all')) editedFields.push('recipients');

    const historyEntry = {
      timestamp: new Date().toISOString(),
      manager_chat_id: manager_chat_id || req.body.manager_chat_id || currentTest.manager_chat_id,
      edited_fields: editedFields
    };

    let updatedHistory = currentTest.history || [];
    if (typeof updatedHistory === 'string') {
      try {
        updatedHistory = JSON.parse(updatedHistory);
      } catch (e) {
        updatedHistory = [];
      }
    }
    updatedHistory.push(historyEntry);

    const { data, error } = await supabase
      .from('tests')
      .update({
        title,
        body: body || null,
        questions,
        images: images || [],
        test_type: test_type || null,
        test_settings: test_settings || null,
        recipients: recipients ?? 'all',
        history: updatedHistory
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (recipients_changed && test_settings?.send_notification !== false) {
      const users = await resolveRecipients(recipients);
      const customMessage = test_settings?.notification_message;
      let sent = 0;
      for (const user of users) {
        const ok = await sendTestNotification(user.chat_id, user.role, id, title, customMessage);
        if (ok) sent++;
        await new Promise(r => setTimeout(r, 80));
      }
    }

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('Error updating test:', err);
    await notifyError('Tests: Update Test Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления теста'
    });
  }
});

router.delete('/tests/:id', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true
    });
  } catch (err) {
    console.error('Error deleting test:', err);
    await notifyError('Tests: Delete Test Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления теста'
    });
  }
});

router.patch('/tests/:id/status', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status_active } = req.body;

    if (typeof status_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Поле status_active должно быть булевым значением'
      });
    }

    const { data: existingTest, error: fetchError } = await supabase
      .from('tests')
      .select('status_active, notification_sent, title, recipients, test_settings')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const wasInactive = existingTest.status_active === false;
    const willBeActive = status_active === true;
    
    const shouldSendNotification = wasInactive && willBeActive && 
                                   existingTest.notification_sent !== true && 
                                   existingTest.test_settings?.send_notification !== false;

    const { data, error } = await supabase
      .from('tests')
      .update({ status_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (shouldSendNotification) {
      const users = await resolveRecipients(existingTest.recipients);
      const customMessage = existingTest.test_settings?.notification_message;
      let sent = 0;
      for (const user of users) {
        const ok = await sendTestNotification(user.chat_id, user.role, id, existingTest.title, customMessage);
        if (ok) sent++;
        await new Promise(r => setTimeout(r, 80));
      }
      
      await supabase
        .from('tests')
        .update({ notification_sent: true })
        .eq('id', id);
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error updating test status:', err);
    await notifyError('Tests: Update Status Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления статуса'
    });
  }
});

router.patch('/tests/answer/:id/status', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { test_status } = req.body;

    if (!test_status || !['Новый', 'В работе', 'Отклонено', 'Принято'].includes(test_status)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректное значение статуса'
      });
    }

    const { data, error } = await supabase
      .from('test_answers')
      .update({ test_status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error updating answer status:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления статуса'
    });
  }
});

router.patch('/tests/answer/:id/comment', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const { data, error } = await supabase
      .from('test_answers')
      .update({ comment: comment || null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error updating answer comment:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления комментария'
    });
  }
});

router.patch('/tests/answer/:id/hide', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('test_answers')
      .update({ hidden: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error hiding answer:', err);
    await notifyError('Tests: Hide Answer Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка скрытия ответа'
    });
  }
});

router.get('/tests/result-detail/:id', verifySession, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: answer, error } = await supabase
      .from('test_answers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    let test = null;
    if (answer.test_id) {
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', answer.test_id)
        .single();
      test = testData;
    }

    let user = null;
    if (answer.chat_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('chat_id, user_name, user_department')
        .eq('chat_id', answer.chat_id)
        .single();
      user = userData;
    }

    let processedModelReviews = answer.model_reviews || [];
    if (typeof processedModelReviews === 'string') {
      try {
        processedModelReviews = JSON.parse(processedModelReviews);
      } catch (e) {
        processedModelReviews = [];
      }
    }

    const reviewsMap = new Map();
    if (Array.isArray(processedModelReviews)) {
      processedModelReviews.forEach(review => {
        if (review && review.question_id) {
          reviewsMap.set(review.question_id, review);
        }
      });
    }

    let processedBreakdown = answer.breakdown || [];
    if (typeof processedBreakdown === 'string') {
      try {
        processedBreakdown = JSON.parse(processedBreakdown);
      } catch (e) {
        processedBreakdown = [];
      }
    }

    const pointsPerQuestion = test?.test_settings?.ai_check?.points_per_question || 10;
    
    let processedAnswers = answer.answers || [];
    if (typeof processedAnswers === 'string') {
      try {
        processedAnswers = JSON.parse(processedAnswers);
      } catch (e) {
        processedAnswers = [];
      }
    }

    const enhancedAnswers = processedAnswers.map(ans => {
      const review = reviewsMap.get(ans.question_id);
      const aiScore = review ? review.score : null;
      const aiReasoning = review ? review.reasoning : null;
      const needsAttention = answer.attention_flags && Array.isArray(answer.attention_flags) 
        ? answer.attention_flags.includes(ans.question_id) 
        : false;
      
      return {
        ...ans,
        ai_score: aiScore,
        ai_reasoning: aiReasoning,
        needs_attention: needsAttention,
        max_score: pointsPerQuestion
      };
    });

    let processedResult = answer.result || {};
    if (typeof processedResult === 'string') {
      try {
        processedResult = JSON.parse(processedResult);
      } catch (e) {
        processedResult = {};
      }
    }

    let attentionFlags = answer.attention_flags || [];
    if (typeof attentionFlags === 'string') {
      try {
        attentionFlags = JSON.parse(attentionFlags);
      } catch (e) {
        attentionFlags = [];
      }
    }

    const breakdown = processedAnswers.map((ans, idx) => {
      const review = reviewsMap.get(ans.question_id);
      const aiScore = review ? review.score : null;
      const needsAttention = attentionFlags.includes(ans.question_id);
      
      return {
        question_id: ans.question_id,
        question_text: ans.question_text,
        answer_text: ans.answer_text || ans.answer,
        ai_score: aiScore,
        ai_reasoning: review ? review.reasoning : null,
        needs_attention: needsAttention,
        max_score: pointsPerQuestion
      };
    });

    const responseData = {
      ...answer,
      answers: enhancedAnswers,
      result: processedResult,
      model_reviews: processedModelReviews,
      attention_flags: attentionFlags,
      breakdown: breakdown,
      test: test,
      user: user
    };

    res.json({ success: true, data: responseData });
  } catch (err) {
    console.error('Error getting result detail:', err);
    await notifyError('Tests: Get Result Detail Error', err.message, {
      endpoint: req.path,
      method: req.method,
      id: req.params.id,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки деталей результата' });
  }
});

module.exports = router;