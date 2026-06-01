'use strict';

const { getSupabase, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'processAiReviews';
const GEMMA_API = 'https://admin.hi-tech.team/api/v1/llm/chat';

function safeStr(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

async function callGemma(systemPrompt, userMessage) {
  const res = await fetch(GEMMA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.HITECH_GEMMA_LLM_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'gemma4:e2b',
      stream: false,
      options: { temperature: 1, num_predict: 2000 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`Gemma Chat API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content?.trim() || null;
}

async function callGemmaForAiDetection(systemPrompt, userMessage) {
  const res = await fetch(GEMMA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.HITECH_GEMMA_LLM_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'gemma4:e2b',
      stream: false,
      options: { temperature: 1, num_predict: 500 },
      messages: [
        {
          role: 'system',
          content:
            systemPrompt +
            ' Отвечай ТОЛЬКО валидным JSON. Никакого пояснительного текста. Никаких markdown блоков. Только чистый JSON.',
        },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Gemma detection API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content?.trim() || null;
}

function parsePerQuestionScore(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.score === 'number') {
      return {
        score: Math.min(10, Math.max(0, parsed.score)),
        reasoning: safeStr(parsed.reasoning, 500),
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
        reasoning: safeStr(parsed.reasoning, 500),
      };
    }
    return null;
  } catch {
    const probMatch = raw.match(/probability["']?\s*:\s*(\d+(?:\.\d+)?)/i);
    if (probMatch) {
      const reasoningMatch = raw.match(/reasoning["']?\s*:\s*["']([^"']+)["']/i);
      return {
        probability: Math.min(100, Math.max(0, parseFloat(probMatch[1]))),
        reasoning: reasoningMatch ? safeStr(reasoningMatch[1], 500) : 'Автоматически извлечено',
      };
    }
    return null;
  }
}

function buildPerQuestionPrompt(aiSettings) {
  const base =
    typeof aiSettings?.prompt === 'string'
      ? aiSettings.prompt
      : 'Ты эксперт-оценщик. Оценивай ответы честно и справедливо.';
  return (
    base +
    '\n\nТебе будет задан ОДИН вопрос и ответ кандидата. ' +
    'Оцени ответ по шкале от 0 до 10, где 0 — полностью неверно или нет ответа, 10 — идеальный ответ. ' +
    'Отвечай СТРОГО в формате JSON без каких-либо дополнительных символов или текста:\n{"score": <число от 0 до 10>, "reasoning": "<краткое обоснование на русском, 1-2 предложения>"}'
  );
}

async function gradeQuestion(systemPrompt, question, answerText) {
  const userMessage = `Вопрос: ${safeStr(question.text, 500)}\n\nОтвет кандидата: ${safeStr(answerText, 2000) || '(нет ответа)'}`;
  try {
    const raw = await callGemma(systemPrompt, userMessage);
    const parsed = parsePerQuestionScore(raw);
    if (!parsed) {
      return {
        question_id: question.id,
        model: 'gemma4:e2b',
        score: null,
        reasoning: 'Не удалось распарсить ответ',
        failed: true,
      };
    }
    return {
      question_id: question.id,
      model: 'gemma4:e2b',
      score: parsed.score,
      reasoning: parsed.reasoning,
      failed: false,
    };
  } catch (err) {
    return {
      question_id: question.id,
      model: 'gemma4:e2b',
      score: null,
      reasoning: err.message,
      failed: true,
    };
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
        is_ai: parsed.probability >= (Number(aiDetectSettings.threshold) || 80),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function buildAiReviewText(questions, modelReviews) {
  const lines = ['Оценка проводилась моделью AI на основе ваших ответов.\n'];
  questions.forEach((q, i) => {
    const review = modelReviews.find((r) => r.question_id === q.id && !r.failed);
    const scoreDisplay =
      review?.score != null
        ? `${Math.round(review.score * 10) / 10}/10`
        : 'нет данных';
    lines.push(`**Вопрос ${i + 1}:** ${safeStr(q.text, 300)}`);
    lines.push(`Оценка: ${scoreDisplay}`);
    if (review?.reasoning) lines.push(safeStr(review.reasoning, 500));
    lines.push('');
  });
  return lines.join('\n');
}

async function generateSummary(summaryPrompt, questions, modelReviews, score, answers) {
  const answerMap = {};
  answers.forEach((a) => {
    answerMap[a.question_id] = a;
  });

  const qaLines = questions
    .map((q, i) => {
      const answerText =
        safeStr(
          answerMap[q.id]?.answer_text || answerMap[q.id]?.answer,
          2000
        ) || '(нет ответа)';
      const review = modelReviews.find((r) => r.question_id === q.id && !r.failed);
      const scoreStr =
        review?.score != null
          ? `${Math.round(review.score * 10) / 10}/10`
          : 'нет оценки';
      const reasoning = safeStr(review?.reasoning, 300);
      return `Вопрос ${i + 1}: ${safeStr(q.text, 300)}\nОтвет: ${answerText}\nОценка: ${scoreStr}${reasoning ? ` — ${reasoning}` : ''}`;
    })
    .join('\n\n');

  const userMessage = `Общий результат кандидата: ${score !== null ? score + '%' : 'не определён'}\n\nДетали по вопросам:\n\n${qaLines}`;

  const systemPrompt =
    summaryPrompt +
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

async function processOnePendingReview(supabase) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: pendingAnswer, error: fetchError } = await supabase
    .from('test_answers')
    .select('*')
    .eq('review_status', 'pending')
    .lte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return null;
    throw fetchError;
  }

  if (!pendingAnswer) return null;

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('*')
    .eq('id', String(pendingAnswer.test_id))
    .single();

  if (testError) throw testError;

  const testSettings = test.test_settings || null;
  const aiSettings = testSettings?.ai_check;
  const aiDetectSettings = testSettings?.ai_detect;

  if (!aiSettings?.enabled || !aiSettings?.prompt) return null;

  const pointsPerQuestion = Number(aiSettings.points_per_question) || 1;
  const questions = test.questions || [];
  const answers = pendingAnswer.answers || [];

  const answerMap = {};
  answers.forEach((a) => {
    answerMap[a.question_id] = a;
  });

  const systemPrompt = buildPerQuestionPrompt(aiSettings);
  const modelReviews = [];
  const aiDetectionResults = [];

  for (const question of questions) {
    const answerText =
      answerMap[question.id]?.answer_text ||
      answerMap[question.id]?.answer ||
      '';
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
  let totalEarned = 0;
  let scorableQuestions = 0;

  for (const review of modelReviews) {
    if (!review.failed && review.score !== null) {
      totalEarned += (review.score / 10) * pointsPerQuestion;
      scorableQuestions++;
    }
  }

  let score = null;
  let passed = null;

  if (scorableQuestions > 0) {
    score = Math.round((totalEarned / maxPossible) * 100);
    passed = score >= (Number(testSettings?.notify?.threshold_percent) || 70);
  }

  const aiReview = buildAiReviewText(questions, modelReviews);

  let aiDetectionSummary = null;
  if (aiDetectionResults.length > 0) {
    aiDetectionSummary = {
      results: aiDetectionResults,
      flagged_questions: aiDetectionResults.filter((r) => r.is_ai).map((r) => r.question_id),
      overall_suspicious: aiDetectionResults.some((r) => r.is_ai),
      average_probability: Math.round(
        aiDetectionResults.reduce((sum, r) => sum + r.probability, 0) / aiDetectionResults.length
      ),
    };
  }

  let aiSummary = null;
  if (aiSettings.summary_enabled && aiSettings.summary_prompt) {
    aiSummary = await generateSummary(
      aiSettings.summary_prompt,
      questions,
      modelReviews,
      score,
      answers
    );
  }

  const existingResult = pendingAnswer.result || {};

  const updatedResult = {
    ...existingResult,
    score,
    passed,
    pending_ai: false,
    ai_review: aiReview,
    ai_summary: aiSummary,
  };

  const updateData = {
    result: updatedResult,
    model_reviews: modelReviews,
    review_status: 'complete',
  };

  if (aiDetectionSummary) {
    updateData.ai_detection = aiDetectionSummary;
  }

  const { error: updateError } = await supabase
    .from('test_answers')
    .update(updateData)
    .eq('id', pendingAnswer.id);

  if (updateError) throw updateError;

  return pendingAnswer.id;
}

async function run() {
  const supabase = getSupabase();
  const now = new Date();

  const processed = [];
  const errors = [];

  let keepGoing = true;
  while (keepGoing) {
    try {
      const answerId = await processOnePendingReview(supabase);
      if (answerId === null) {
        keepGoing = false;
      } else {
        processed.push(answerId);
      }
    } catch (err) {
      errors.push(err.message);
      keepGoing = false;
    }
  }

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: now.toISOString(),
    last_result: {
      processed: processed.length,
      processed_ids: processed,
      errors,
    },
  });

  console.log(`[cron] ${FUNCTION_NAME}: processed=${processed.length} errors=${errors.length}`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '*/10 * * * *' };