const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { notifyError } = require('../utils/errorNotifier');

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

function isValidChatId(value) {
  if (value === null || value === undefined) return false;
  return /^\d{1,20}$/.test(String(value));
}

function isValidUUID(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const s = String(value);
  return /^\d{1,20}$/.test(s) || isValidUUID(s);
}

function safeStr(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function sanitizeAnswer(a, question) {
  if (!a || typeof a !== 'object') return null;
  if (!isValidId(a.question_id)) return null;

  let safeAnswer = null;

  if (question?.type === 'single') {
    safeAnswer = typeof a.answer === 'string' ? a.answer.slice(0, 100) : null;
  } else if (question?.type === 'multiple') {
    safeAnswer = Array.isArray(a.answer)
      ? a.answer
          .filter(v => typeof v === 'string')
          .map(v => v.slice(0, 100))
          .slice(0, 50)   // cap array length
      : [];
  }

  return {
    question_id: a.question_id,
    answer: safeAnswer,
    answer_text: safeStr(a.answer_text, 2000),
  };
}

async function callGemma(systemPrompt, userMessage) {
  const res = await fetch('https://admin.hi-tech.team/api/v1/llm/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.HITECH_GEMMA_LLM_TOKEN}`
    },
    body: JSON.stringify({
      model: 'gemma4:e2b',
      stream: false,
      options: { temperature: 1, num_predict: 2000 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!res.ok) throw new Error(`Gemma Chat API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content?.trim() || null;
}

async function callGemmaForAiDetection(systemPrompt, userMessage) {
  const res = await fetch('https://admin.hi-tech.team/api/v1/llm/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.HITECH_GEMMA_LLM_TOKEN}`
    },
    body: JSON.stringify({
      model: 'gemma4:e2b',
      stream: false,
      options: { temperature: 1, num_predict: 500 },
      messages: [
        {
          role: 'system',
          content: systemPrompt +
            ' Отвечай ТОЛЬКО валидным JSON. Никакого пояснительного текста. Никаких markdown блоков. Только чистый JSON.'
        },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!res.ok) throw new Error(`Gemma detection API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content?.trim() || null;
}

router.get('/take-test/list', readLimiter, async (req, res) => {
  try {
    const chat_id = req.session.user_chat_id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_team, user_department, role')
      .eq('chat_id', String(chat_id))
      .single();

    if (userError && userError.code !== 'PGRST116') throw userError;

    let query = supabase
      .from('tests')
      .select('id, title, body, questions, test_type, test_settings, timestamp, recipients');

    if (!user || user.role !== 'hr') {
      query = query.eq('status_active', true);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) throw error;

    let filteredData = data || [];

    if (user && user.role !== 'hr') {
      filteredData = filteredData.filter(test => {
        if (!test.recipients || test.recipients === 'all') return true;

        let recipients;
        try {
          recipients = typeof test.recipients === 'string'
            ? JSON.parse(test.recipients)
            : test.recipients;
        } catch {
          return true; // malformed recipients → show to all
        }

        if (!recipients) return true;

        if (Array.isArray(recipients.teams) && user.user_team) {
          if (recipients.teams.includes(user.user_team)) return true;
        }
        if (Array.isArray(recipients.departments) && user.user_department) {
          if (recipients.departments.includes(user.user_department)) return true;
        }

        return false;
      });
    }

    res.json({ success: true, data: filteredData });
  } catch (err) {
    console.error('Error listing tests:', err);
    await notifyError('TakeTest: List Error', err.message, {
      endpoint: req.path, method: req.method, stack: err.stack, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки тестов' });
  }
});

router.get('/take-test/result/:testId', readLimiter, async (req, res) => {
  try {
    const chat_id = req.session.user_chat_id;
    if (!isValidId(req.params.testId)) {
      return res.status(400).json({ success: false, error: 'Некорректный ID теста' });
    }

    const { data, error } = await supabase
      .from('test_answers')
      .select('*')
      .eq('test_id', req.params.testId)
      .eq('chat_id', String(chat_id))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.json({ success: false, data: null });
      throw error;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error getting result:', err);
    await notifyError('TakeTest: Get Result Error', err.message, {
      endpoint: req.path, method: req.method, testId: req.params.testId, stack: err.stack, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки результата' });
  }
});

router.get('/take-test/results/:testId', readLimiter, async (req, res) => {
  try {
    const chat_id = req.session.user_chat_id;
    if (!isValidId(req.params.testId)) {
      return res.status(400).json({ success: false, error: 'Некорректный ID теста' });
    }

    const { data, error } = await supabase
      .from('test_answers')
      .select('*')
      .eq('test_id', req.params.testId)
      .eq('chat_id', String(chat_id))
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Error getting results:', err);
    await notifyError('TakeTest: Get Results Error', err.message, {
      endpoint: req.path, method: req.method, testId: req.params.testId, stack: err.stack, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки результатов' });
  }
});

router.get('/take-test/result-detail/:resultId', readLimiter, async (req, res) => {
  try {
    const chat_id = req.session.user_chat_id;
    if (!isValidId(req.params.resultId)) {
      return res.status(400).json({ success: false, error: 'Некорректный ID результата' });
    }

    const { data, error } = await supabase
      .from('test_answers')
      .select('*')
      .eq('id', req.params.resultId)
      .single();

    if (error) throw error;

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('chat_id', String(chat_id))
      .single();

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr';

    if (!isAdminOrManager && String(data.chat_id) !== String(chat_id)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }

    const testId = data.test_id;
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('id, title, body, test_type, test_settings')
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    const showAiAnalysis = testData.test_settings?.show_ai_analysis !== false;

    let resultData = { ...data, test: testData };

    if (!showAiAnalysis) {
      resultData = {
        ...resultData,
        result: resultData.result ? {
          score: resultData.result.score,
          passed: resultData.result.passed,
          pending_ai: resultData.result.pending_ai,
          ai_review: null,
          ai_summary: null,
          ai_detection: resultData.result.ai_detection,
          breakdown: (resultData.result.breakdown || []).map(b => ({
            question_id: b.question_id,
            question_text: b.question_text,
            question_type: b.question_type,
            answer_text: b.answer_text,
            correct: b.correct,
            correct_answer_text: b.correct_answer_text,
            points_earned: b.points_earned,
            points_max: b.points_max
          }))
        } : null
      };
    }

    res.json({ success: true, data: resultData });
  } catch (err) {
    console.error('Error getting result detail:', err);
    await notifyError('TakeTest: Get Result Detail Error', err.message, {
      endpoint: req.path, method: req.method, resultId: req.params.resultId, stack: err.stack, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки результата' });
  }
});

router.get('/take-test/:id', readLimiter, async (req, res) => {
  try {
    const chat_id = req.session.user_chat_id;
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Некорректный ID теста' });
    }

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, body, questions, test_type, test_settings, images, recipients')
      .eq('id', req.params.id)
      .single();

    if (testError) throw testError;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_team, user_department, role')
      .eq('chat_id', String(chat_id))
      .single();

    let hasAccess = true;

    if (!user || user.role !== 'hr') {
      if (test.recipients && test.recipients !== 'all') {
        let recipients;
        try {
          recipients = typeof test.recipients === 'string'
            ? JSON.parse(test.recipients)
            : test.recipients;
        } catch {
          recipients = null;
        }

        if (recipients && (recipients.teams || recipients.departments)) {
          hasAccess = false;

          if (user) {
            if (Array.isArray(recipients.teams) && user.user_team) {
              if (recipients.teams.includes(user.user_team)) hasAccess = true;
            }
            if (!hasAccess && Array.isArray(recipients.departments) && user.user_department) {
              if (recipients.departments.includes(user.user_department)) hasAccess = true;
            }
          }
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'У вас нет доступа к этому тесту' });
    }

    res.json({ success: true, data: test });
  } catch (err) {
    console.error('Error getting test:', err);
    await notifyError('TakeTest: Get Test Error', err.message, {
      endpoint: req.path, method: req.method, id: req.params.id, stack: err.stack, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка загрузки теста' });
  }
});

router.post('/take-test/submit', submitLimiter, async (req, res) => {
  try {
    const { test_id, answers } = req.body;
    const chat_id = req.session.user_chat_id;

    if (!test_id || !isValidId(test_id)) {
      return res.status(400).json({ success: false, error: 'Некорректный test_id' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, error: 'Отсутствуют ответы' });
    }
    if (answers.length > 200) {
      return res.status(400).json({ success: false, error: 'Слишком много ответов' });
    }

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', String(test_id))
      .single();

    if (testError) throw testError;

    if (!test.status_active) {
      return res.status(403).json({ success: false, error: 'Тест неактивен' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('user_team, user_department, role')
      .eq('chat_id', String(chat_id))
      .single();

    let hasAccess = true;

    if (!user || user.role !== 'hr') {
      if (test.recipients && test.recipients !== 'all') {
        let recipients;
        try {
          recipients = typeof test.recipients === 'string'
            ? JSON.parse(test.recipients)
            : test.recipients;
        } catch {
          recipients = null;
        }

        if (recipients && (recipients.teams || recipients.departments)) {
          hasAccess = false;
          if (user) {
            if (Array.isArray(recipients.teams) && user.user_team) {
              if (recipients.teams.includes(user.user_team)) hasAccess = true;
            }
            if (!hasAccess && Array.isArray(recipients.departments) && user.user_department) {
              if (recipients.departments.includes(user.user_department)) hasAccess = true;
            }
          }
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'У вас нет доступа к этому тесту' });
    }

    const validQuestionIds = new Set((test.questions || []).map(q => q.id));
    const questionsMap = new Map((test.questions || []).map(q => [q.id, q]));

    const sanitizedAnswers = answers
      .filter(a => a && typeof a === 'object' && validQuestionIds.has(a.question_id))
      .map(a => sanitizeAnswer(a, questionsMap.get(a.question_id)))
      .filter(Boolean);

    if (sanitizedAnswers.length === 0) {
      return res.status(400).json({ success: false, error: 'Ни один ответ не прошёл валидацию' });
    }

    const result = computeResult(test, sanitizedAnswers);

    const { data, error } = await supabase
      .from('test_answers')
      .insert({
        test_id: String(test_id),
        chat_id: String(chat_id),
        answers: sanitizedAnswers,
        result,
        review_status: result.pending_ai ? 'pending' : 'complete'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });

    if (result.pending_ai) {
      runAiCheck(test, data, chat_id).catch(err => console.error('AI check error:', err));
    } else {
      sendNotificationIfNeeded(test, data, chat_id).catch(err => console.error('Notification error:', err));
    }
  } catch (err) {
    console.error('Error submitting answers:', err);
    await notifyError('TakeTest: Submit Error', err.message, {
      endpoint: req.path, method: req.method, ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Ошибка сохранения ответов' });
  }
});

function computeResult(test, answers) {
  const questions = test.questions || [];
  const aiSettings = test.test_settings?.ai_check;
  const aiEnabled = !!(aiSettings?.enabled);
  const pointsPerQuestion = Number(aiSettings?.points_per_question) || 1;
  const passThreshold = Number(test.test_settings?.notify?.threshold_percent) || 70;

  const answerMap = {};
  answers.forEach(a => { answerMap[a.question_id] = a; });

  const breakdown = questions.map(q => {
    const userAnswer = answerMap[q.id];

    if (q.type === 'open') {
      return {
        question_id: q.id,
        question_text: safeStr(q.text, 500),
        question_type: q.type,
        answer_text: safeStr(userAnswer?.answer_text, 2000),
        correct: null,
        correct_answer_text: null,
        points_earned: null,
        points_max: pointsPerQuestion
      };
    }

    if (q.type === 'single') {
      const correct = (q.options || []).find(o => o.correct);
      const isCorrect = !!(correct && userAnswer?.answer === correct.id);
      return {
        question_id: q.id,
        question_text: safeStr(q.text, 500),
        question_type: q.type,
        answer_text: safeStr(userAnswer?.answer_text, 2000),
        correct: isCorrect,
        correct_answer_text: isCorrect ? null : (safeStr(correct?.text, 500) ?? null),
        points_earned: aiEnabled ? null : (isCorrect ? pointsPerQuestion : 0),
        points_max: pointsPerQuestion
      };
    }

    if (q.type === 'multiple') {
      const correctIds = (q.options || []).filter(o => o.correct).map(o => o.id).sort();
      const userIds = Array.isArray(userAnswer?.answer) ? [...userAnswer.answer].sort() : [];
      const isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
      return {
        question_id: q.id,
        question_text: safeStr(q.text, 500),
        question_type: q.type,
        answer_text: safeStr(userAnswer?.answer_text, 2000),
        correct: isCorrect,
        correct_answer_text: isCorrect
          ? null
          : (q.options || []).filter(o => o.correct).map(o => safeStr(o.text, 200)).join(', '),
        points_earned: aiEnabled ? null : (isCorrect ? pointsPerQuestion : 0),
        points_max: pointsPerQuestion
      };
    }

    return null;
  }).filter(Boolean);

  if (aiEnabled) {
    return { score: null, passed: null, pending_ai: true, ai_review: null, breakdown };
  }

  const hasChoiceQuestions = questions.some(q => q.type === 'single' || q.type === 'multiple');
  if (!hasChoiceQuestions) {
    return { score: null, passed: null, pending_ai: false, ai_review: null, breakdown };
  }

  let earned = 0, max = 0;
  breakdown.forEach(b => {
    if (b.question_type !== 'open') {
      max += b.points_max;
      earned += b.points_earned ?? 0;
    }
  });

  const score = max > 0 ? Math.round((earned / max) * 100) : 0;
  return { score, passed: score >= passThreshold, pending_ai: false, ai_review: null, breakdown };
}

function buildPerQuestionPrompt(aiSettings) {
  const base = aiSettings?.prompt || 'Ты эксперт-оценщик. Оценивай ответы честно и справедливо.';
  return (
    base +
    '\n\nТебе будет задан ОДИН вопрос и ответ кандидата. ' +
    'Оцени ответ по шкале от 0 до 10, где 0 — полностью неверно или нет ответа, 10 — идеальный ответ. ' +
    'Отвечай СТРОГО в формате JSON без каких-либо дополнительных символов или текста:\n' +
    '{"score": <число от 0 до 10>, "reasoning": "<краткое обоснование на русском, 1-2 предложения>"}'
  );
}

function parsePerQuestionScore(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.score === 'number') {
      return {
        score: Math.min(10, Math.max(0, parsed.score)),
        reasoning: safeStr(parsed.reasoning, 500)
      };
    }
    return null;
  } catch {
    const match = raw.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);
    if (match) {
      return { score: Math.min(10, Math.max(0, parseFloat(match[1]))), reasoning: '' };
    }
    return null;
  }
}

async function gradeQuestion(systemPrompt, question, answerText) {
  const userMessage = `Вопрос: ${safeStr(question.text, 500)}\n\nОтвет кандидата: ${safeStr(answerText, 2000) || '(нет ответа)'}`;
  try {
    const raw = await callGemma(systemPrompt, userMessage);
    const parsed = parsePerQuestionScore(raw);
    if (!parsed) {
      return { question_id: question.id, model: 'gemma4:e2b', score: null, reasoning: 'Не удалось распарсить ответ', failed: true };
    }
    return { question_id: question.id, model: 'gemma4:e2b', score: parsed.score, reasoning: parsed.reasoning, failed: false };
  } catch (err) {
    console.error(`Gemma failed for question ${question.id}:`, err.message);
    return { question_id: question.id, model: 'gemma4:e2b', score: null, reasoning: err.message, failed: true };
  }
}

function parseDetectionResponse(raw) {
  if (!raw) return null;
  let cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  cleaned = cleaned.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ':"$1"');
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.probability === 'number') {
      return {
        probability: Math.min(100, Math.max(0, parsed.probability)),
        reasoning: safeStr(parsed.reasoning, 500)
      };
    }
    return null;
  } catch {
    const probMatch = raw.match(/probability["']?\s*:\s*(\d+(?:\.\d+)?)/i);
    if (probMatch) {
      const reasoningMatch = raw.match(/reasoning["']?\s*:\s*["']([^"']+)["']/i);
      return {
        probability: Math.min(100, Math.max(0, parseFloat(probMatch[1]))),
        reasoning: reasoningMatch ? safeStr(reasoningMatch[1], 500) : 'Автоматически извлечено'
      };
    }
    return null;
  }
}

async function detectAiAnswer(aiDetectSettings, question, answerText) {
  if (!aiDetectSettings?.enabled || !aiDetectSettings?.prompt) return null;

  const systemPrompt = aiDetectSettings.prompt;
  const userMessage = `Вопрос: ${safeStr(question.text, 500)}\n\nОтвет кандидата: ${safeStr(answerText, 2000) || '(нет ответа)'}\n\nОпредели вероятность того, что этот ответ был сгенерирован ИИ (от 0 до 100). Отвечай ТОЛЬКО в формате JSON: {"probability": число от 0 до 100, "reasoning": "краткое объяснение на русском"}`;

  try {
    const raw = await callGemmaForAiDetection(systemPrompt, userMessage);
    const parsed = parseDetectionResponse(raw);
    if (parsed) {
      return {
        probability: parsed.probability,
        reasoning: parsed.reasoning,
        is_ai: parsed.probability >= (Number(aiDetectSettings.threshold) || 80)
      };
    }
    console.error(`Failed to parse detection response for question ${question.id}:`, raw?.substring(0, 200));
    return null;
  } catch (err) {
    console.error(`AI detection failed for question ${question.id}:`, err.message);
    return null;
  }
}

async function runAiCheck(test, savedAnswer, chatId) {
  try {
    const aiSettings = test.test_settings?.ai_check;
    const aiDetectSettings = test.test_settings?.ai_detect;
    if (!aiSettings?.enabled || !aiSettings?.prompt) return;

    const pointsPerQuestion = Number(aiSettings.points_per_question) || 1;
    const questions = test.questions || [];
    const answerMap = {};
    savedAnswer.answers.forEach(a => { answerMap[a.question_id] = a; });

    const systemPrompt = buildPerQuestionPrompt(aiSettings);
    const modelReviews = [];
    const aiDetectionResults = [];

    for (const question of questions) {
      const answerText = answerMap[question.id]?.answer_text || answerMap[question.id]?.answer || '';
      const gradingResult = await gradeQuestion(systemPrompt, question, answerText);
      modelReviews.push(gradingResult);

      if (aiDetectSettings?.enabled) {
        const detectionResult = await detectAiAnswer(aiDetectSettings, question, answerText);
        if (detectionResult) {
          aiDetectionResults.push({ question_id: question.id, ...detectionResult });
        }
      }
    }

    const maxPossible = questions.length * pointsPerQuestion;
    let totalEarned = 0, scorableQuestions = 0;
    for (const review of modelReviews) {
      if (!review.failed && review.score !== null) {
        totalEarned += (review.score / 10) * pointsPerQuestion;
        scorableQuestions++;
      }
    }

    let score = null, passed = null;
    if (scorableQuestions > 0) {
      score = Math.round((totalEarned / maxPossible) * 100);
      passed = score >= (Number(test.test_settings?.notify?.threshold_percent) || 70);
    }

    const aiReview = buildAiReviewText(questions, modelReviews);

    let aiDetectionSummary = null;
    if (aiDetectionResults.length > 0) {
      aiDetectionSummary = {
        results: aiDetectionResults,
        flagged_questions: aiDetectionResults.filter(r => r.is_ai).map(r => r.question_id),
        overall_suspicious: aiDetectionResults.some(r => r.is_ai),
        average_probability: Math.round(
          aiDetectionResults.reduce((sum, r) => sum + r.probability, 0) / aiDetectionResults.length
        )
      };
    }

    let aiSummary = null;
    if (aiSettings.summary_enabled && aiSettings.summary_prompt) {
      aiSummary = await generateSummary(aiSettings.summary_prompt, questions, modelReviews, score, savedAnswer.answers);
    }

    const updatedResult = {
      ...savedAnswer.result,
      score,
      passed,
      pending_ai: false,
      ai_review: aiReview,
      ai_summary: aiSummary
    };

    const updateData = {
      result: updatedResult,
      model_reviews: modelReviews,
      review_status: 'complete'
    };

    if (aiDetectionSummary) updateData.ai_detection = aiDetectionSummary;

    const { data: updated, error: updateError } = await supabase
      .from('test_answers')
      .update(updateData)
      .eq('id', savedAnswer.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await sendNotificationIfNeeded(test, updated, chatId);
  } catch (err) {
    console.error('AI check error:', err);
    await notifyError('TakeTest: AI Check Error', err.message, {
      test_id: test.id, answer_id: savedAnswer.id, stack: err.stack
    });
    await supabase.from('test_answers').update({ review_status: 'error' }).eq('id', savedAnswer.id);
  }
}

async function generateSummary(summaryPrompt, questions, modelReviews, score, answers) {
  const answerMap = {};
  answers.forEach(a => { answerMap[a.question_id] = a; });

  const qaLines = questions.map((q, i) => {
    const answerText = safeStr(answerMap[q.id]?.answer_text || answerMap[q.id]?.answer, 2000) || '(нет ответа)';
    const review = modelReviews.find(r => r.question_id === q.id && !r.failed);
    const scoreStr = review?.score != null ? `${Math.round(review.score * 10) / 10}/10` : 'нет оценки';
    const reasoning = safeStr(review?.reasoning, 300);
    return `Вопрос ${i + 1}: ${safeStr(q.text, 300)}\nОтвет: ${answerText}\nОценка: ${scoreStr}${reasoning ? ` — ${reasoning}` : ''}`;
  }).join('\n\n');

  const userMessage = `Общий результат кандидата: ${score !== null ? score + '%' : 'не определён'}\n\nДетали по вопросам:\n\n${qaLines}`;

  const systemPrompt = summaryPrompt +
    '\n\nОтвечай СТРОГО в формате JSON без каких-либо дополнительных символов или текста:\n{"verdict": "<краткий вердикт, 3-5 слов>", "summary": "<развёрнутый вывод на русском, 3-6 предложений>", "recommendation": "hire" | "maybe" | "reject"}';

  try {
    const raw = await callGemma(systemPrompt, userMessage);
    if (!raw) return null;
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.verdict && parsed.summary) return parsed;
    return null;
  } catch {
    return null;
  }
}

function buildAiReviewText(questions, modelReviews) {
  const lines = ['Оценка проводилась моделью AI на основе ваших ответов.\n'];
  questions.forEach((q, i) => {
    const review = modelReviews.find(r => r.question_id === q.id && !r.failed);
    const scoreDisplay = review?.score != null ? `${Math.round(review.score * 10) / 10}/10` : 'нет данных';
    lines.push(`**Вопрос ${i + 1}:** ${safeStr(q.text, 300)}`);
    lines.push(`Оценка: ${scoreDisplay}`);
    if (review?.reasoning) lines.push(safeStr(review.reasoning, 500));
    lines.push('');
  });
  return lines.join('\n');
}

async function sendNotificationIfNeeded(test, savedAnswer, chatId) {
  try {
    const notify = test.test_settings?.notify;
    if (!notify?.enabled) return;

    const score = savedAnswer.result?.score;
    if (score === null || score === undefined) return;
    if (score < (Number(notify.threshold_percent) || 80)) return;

    if (notify.work_hours_only && notify.time_from && notify.time_to) {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm < notify.time_from || hhmm > notify.time_to) return;
    }

    const managerChatId = test.manager_chat_id;
    if (!managerChatId) return;

    let displayName = chatId ? String(chatId) : 'Аноним';
    if (chatId) {
      const { data: user } = await supabase
        .from('users')
        .select('user_name')
        .eq('chat_id', String(chatId))
        .single();
      if (user?.user_name?.trim()) displayName = user.user_name.trim();
    }

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const aiWarning = savedAnswer.ai_detection?.overall_suspicious
      ? '\n\n⚠️ ВНИМАНИЕ: Система обнаружила признаки использования ИИ при написании ответов.'
      : '';

    const text = `📋 Тест <b>${esc(test.title)}</b> пройден!\n👤 ${esc(displayName)} набрал <b>${score}%</b>!${aiWarning}`;

    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: managerChatId, text, parse_mode: 'HTML' })
    });

    if (!tgRes.ok) {
      const errBody = await tgRes.text();
      console.error('Telegram sendMessage failed:', tgRes.status, errBody);
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
}

module.exports = router;