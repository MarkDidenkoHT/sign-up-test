export async function loadModule(container, { chatId, userData, deepLinkTestId = null, deepLinkType = null }) {

async function getTests() {
  const response = await fetch(`/api/take-test/list?chat_id=${encodeURIComponent(chatId)}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Ошибка загрузки тестов');
  return result.data;
}

async function getTest(id) {
  const response = await fetch(`/api/take-test/${id}?chat_id=${encodeURIComponent(chatId)}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Ошибка загрузки теста');
  return result.data;
}

async function submitAnswers(testId, answers) {
  const response = await fetch('/api/take-test/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_id: testId, chat_id: chatId, answers })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Ошибка отправки ответов');
  return result.data;
}

async function getMyResults(testId) {
  const response = await fetch(`/api/take-test/results/${testId}?chat_id=${encodeURIComponent(chatId)}`);
  const result = await response.json();
  if (!result.success) return [];
  return result.data || [];
}

async function getLatestResult(testId) {
  const response = await fetch(`/api/take-test/result/${testId}?chat_id=${encodeURIComponent(chatId)}`);
  const result = await response.json();
  if (!result.success) return null;
  return result.data;
}

async function cacheTestProgress(testId, questionIndex, answers) {
  const cacheData = {
    testId,
    questionIndex,
    answers,
    timestamp: Date.now()
  };
  localStorage.setItem(`test_cache_${chatId}_${testId}`, JSON.stringify(cacheData));
}

function getCachedProgress(testId) {
  const cached = localStorage.getItem(`test_cache_${chatId}_${testId}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function clearCache(testId) {
  localStorage.removeItem(`test_cache_${chatId}_${testId}`);
}

let autoSaveInterval = null;
let currentAutoSaveField = null;

function startAutoSave(testId, questionIndex, questionId, getCurrentValueFn) {
  if (autoSaveInterval) clearInterval(autoSaveInterval);

  autoSaveInterval = setInterval(() => {
    if (currentAutoSaveField && currentTest && currentAutoSaveField.questionId === currentTest.questions[currentQuestionIndex]?.id) {
      const value = currentAutoSaveField.getValue();
      if (value !== undefined && value !== null) {
        currentAnswers[currentAutoSaveField.questionId] = value;
        cacheTestProgress(testId, questionIndex, currentAnswers);
      }
    }
  }, 30000);
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

let timerInterval = null;
let timerSecondsLeft = 0;
let timerMode = 'global';

function startTimer(seconds, mode = 'global') {
  stopTimer();
  timerMode = mode;
  timerSecondsLeft = seconds;

  const timerEl = container.querySelector('#testTimer');
  if (!timerEl) return;

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  timerEl.textContent = formatTime(timerSecondsLeft);
  timerEl.classList.remove('timer-warning');

  timerInterval = setInterval(() => {
    timerSecondsLeft--;

    if (timerSecondsLeft <= 0) {
      stopTimer();
      timerEl.textContent = '00:00';

      if (timerMode === 'global') {
        submitTest();
      } else if (timerMode === 'per_question') {
        showToast('Время на вопрос истекло! Переход к следующему вопросу...', 'error');
        const currentQ = currentTest.questions[currentQuestionIndex];
        if (currentQ) saveCurrentAnswerForQuestion(currentQ);
        if (currentQuestionIndex + 1 < currentTest.questions.length) {
          currentQuestionIndex++;
          renderTestPage();
        } else {
          renderConfirm();
        }
      }
      return;
    }

    timerEl.textContent = formatTime(timerSecondsLeft);

    const warningSeconds = currentTest.test_settings?.timer_warning_seconds || 60;
    if (timerSecondsLeft <= warningSeconds) {
      timerEl.classList.add('timer-warning');
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startPerQuestionTimer() {
  if (timerMode !== 'per_question') return;
  const timerWrap = container.querySelector('#timerWrap');
  if (!timerWrap) return;
  stopTimer();
  const secondsPerQuestion = currentTest.test_settings?.timer_seconds || 60;
  startTimer(secondsPerQuestion, 'per_question');
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatTimerDisplay(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    const hLabel = h === 1 ? 'час' : h >= 2 && h <= 4 ? 'часа' : 'часов';
    return `${h} ${hLabel}`;
  }
  if (m > 0) {
    const mLabel = m === 1 ? 'минута' : m >= 2 && m <= 4 ? 'минуты' : 'минут';
    return `${m} ${mLabel}`;
  }
  const sLabel = s === 1 ? 'секунда' : s >= 2 && s <= 4 ? 'секунды' : 'секунд';
  return `${s} ${sLabel}`;
}

container.innerHTML = `
  <div class="take-wrapper">
    <div class="take-main">
      <div class="take-tabs" id="takeTabs">
        <button class="take-tab-btn active" data-tab="tests">Тесты</button>
        <button class="take-tab-btn" data-tab="history">История</button>
      </div>
      <div class="take-content" id="takeContent">
        <div class="take-list-view" id="listView">
          <div class="take-list-header">
            <div class="take-list-title">Доступные тесты</div>
            <span class="take-list-subtitle">Выберите тест для прохождения</span>
            <div class="take-type-filters" id="typeFilters">
              <button class="take-type-filter-btn active" data-type="all">Все</button>
              <button class="take-type-filter-btn" data-type="onboarding">Онбординг</button>
              <button class="take-type-filter-btn" data-type="knowledge">Проверка знаний</button>
              <button class="take-type-filter-btn" data-type="competency">Оценка компетенций</button>
            </div>
          </div>
          <div class="take-tests-grid" id="testsGrid">
            <div class="take-loading">
              <div class="take-loading-spinner"></div>
              <p>Загрузка тестов...</p>
            </div>
          </div>
        </div>

        <div class="take-history-view" id="historyView" style="display:none;">
          <div class="take-list-header">
            <div class="take-list-title">История результатов</div>
            <span class="take-list-subtitle">Просмотрите ваши результаты тестирования</span>
          </div>
          <div class="take-history-container" id="historyContainer">
            <div class="take-loading">
              <div class="take-loading-spinner"></div>
              <p>Загрузка истории...</p>
            </div>
          </div>
        </div>

        <div class="take-test-view" id="testView" style="display:none;">
          <div class="take-test-topbar-fixed" id="testTopbarFixed">
            <div class="take-test-topbar-inner">
              <button class="take-back-btn" id="backBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                К списку
              </button>
              <div class="take-progress-wrap" id="progressWrap" style="display:none;">
                <div class="take-progress-label" id="progressLabel">Вопрос 1 из 1</div>
                <div class="take-progress-bar">
                  <div class="take-progress-fill" id="progressFill"></div>
                </div>
              </div>
              <div class="take-timer-wrap" id="timerWrap" style="display:none;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span id="testTimer">00:00</span>
              </div>
            </div>
          </div>
          <div class="take-test-body" id="testBody"></div>
        </div>
      </div>
    </div>
  </div>
`;

function preventCopy(e) {
  if (e.target.closest('textarea') || e.target.closest('input')) {
    return;
  }
  e.preventDefault();
  return false;
}

function preventContextMenu(e) {
  if (e.target.closest('textarea') || e.target.closest('input')) {
    return;
  }
  e.preventDefault();
  return false;
}

container.addEventListener('copy', preventCopy);
container.addEventListener('cut', preventCopy);
container.addEventListener('contextmenu', preventContextMenu);
container.addEventListener('dragstart', preventCopy);
container.addEventListener('selectstart', preventCopy);

let currentTest = null;
let currentAnswers = {};
let currentQuestionIndex = 0;
let testMode = 'list';
let currentTab = 'tests';
let allTests = [];

const urlParamsInit = new URLSearchParams(window.location.search);
let activeTypeFilter = deepLinkType || urlParamsInit.get('type') || 'all';

const listView = container.querySelector('#listView');
const historyView = container.querySelector('#historyView');
const testView = container.querySelector('#testView');
const testsGrid = container.querySelector('#testsGrid');
const historyContainer = container.querySelector('#historyContainer');
const testBody = container.querySelector('#testBody');
const backBtn = container.querySelector('#backBtn');
const progressWrap = container.querySelector('#progressWrap');
const progressLabel = container.querySelector('#progressLabel');
const progressFill = container.querySelector('#progressFill');
const tabButtons = container.querySelectorAll('.take-tab-btn');

function showToast(message, type = 'success') {
  const existing = document.querySelector('.take-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `take-toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function updateProgress() {
  if (!currentTest) return;
  const total = currentTest.questions.length;
  const current = currentQuestionIndex + 1;
  progressLabel.textContent = `Вопрос ${current} из ${total}`;
  progressFill.style.width = `${(current / total) * 100}%`;
}

async function loadTests() {
  try {
    const tests = await getTests();
    allTests = tests;
    renderTestList(tests.filter(t => activeTypeFilter === 'all' || t.test_type === activeTypeFilter));
  } catch (error) {
    testsGrid.innerHTML = `
      <div class="take-empty">
        <div class="take-empty-icon">⚠️</div>
        <div class="take-empty-title">Ошибка загрузки</div>
        <div class="take-empty-text">${error.message}</div>
      </div>
    `;
  }
}

function initTypeFilters() {
  const filterContainer = container.querySelector('#typeFilters');
  if (!filterContainer) return;

  filterContainer.querySelectorAll('.take-type-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === activeTypeFilter);
  });

  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.take-type-filter-btn');
    if (!btn) return;

    activeTypeFilter = btn.dataset.type;

    filterContainer.querySelectorAll('.take-type-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });

    const params = new URLSearchParams(window.location.search);
    if (activeTypeFilter === 'all') {
      params.delete('type');
    } else {
      params.set('type', activeTypeFilter);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);

    const filtered = activeTypeFilter === 'all'
      ? allTests
      : allTests.filter(t => t.test_type === activeTypeFilter);
    renderTestList(filtered);
  });
}

async function renderTestList(tests) {
  if (!tests || tests.length === 0) {
    testsGrid.innerHTML = `
      <div class="take-empty">
        <div class="take-empty-icon">📋</div>
        <div class="take-empty-title">Тестов пока нет</div>
        <div class="take-empty-text">Менеджер ещё не добавил тесты</div>
      </div>
    `;
    return;
  }

  const latestResults = await Promise.all(tests.map(t => getLatestResult(t.id).catch(() => null)));

  let html = '';
  tests.forEach((test, i) => {
    const result = latestResults[i];
    const multiAttempt = test.test_settings?.multi_attempt === true;
    const qCount = test.questions ? test.questions.length : 0;
    const typeLabels = { onboarding: 'Онбординг', knowledge: 'Проверка знаний', competency: 'Оценка компетенций' };
    const typeLabel = typeLabels[test.test_type] || '';

    const hasTimer = test.test_settings?.timer_seconds > 0;
    const timerModeVal = test.test_settings?.timer_mode || 'global';
    const timerSecs = test.test_settings?.timer_seconds || 0;
    const timerStr = hasTimer ? formatTimerDisplay(timerSecs) : null;

    let statusHtml = '';
    let cardClass = 'take-test-card';

    if (result && !multiAttempt) {
      const score = result.result?.score;
      const passed = result.result?.passed;
      if (score !== undefined && score !== null) {
        const scoreColor = score >= 80 ? 'var(--ic-green)' : score >= 60 ? 'var(--ic-accent)' : 'var(--ic-red)';
        statusHtml = `
          <div class="take-card-status done">
            <span style="color:${scoreColor};font-weight:800;font-size:17px;">${score}%</span>
            <span class="take-card-status-label">${passed ? 'Пройден' : 'Не пройден'}</span>
          </div>
        `;
      } else {
        statusHtml = `<div class="take-card-status done"><span class="take-card-status-label" style="color:var(--ic-green);">✓ Завершён</span></div>`;
      }
      cardClass += ' completed';
    } else if (result && multiAttempt) {
      const score = result.result?.score;
      const passed = result.result?.passed;
      if (score !== undefined && score !== null) {
        const scoreColor = score >= 80 ? 'var(--ic-green)' : score >= 60 ? 'var(--ic-accent)' : 'var(--ic-red)';
        statusHtml = `
          <div class="take-card-status done">
            <span style="color:${scoreColor};font-weight:800;font-size:17px;">${score}%</span>
            <span class="take-card-status-label">${passed ? 'Пройден' : 'Не пройден'} · Повторить</span>
          </div>
        `;
      } else {
        statusHtml = `<div class="take-card-status done"><span class="take-card-status-label" style="color:var(--ic-green);">✓ Завершён · Повторить</span></div>`;
      }
    } else {
      statusHtml = `<div class="take-card-status pending"><span class="take-card-badge">Не пройден</span></div>`;
    }

    let metaItems = `<span>${qCount} ${qCount === 1 ? 'вопрос' : qCount >= 2 && qCount <= 4 ? 'вопроса' : 'вопросов'}</span>`;
    if (hasTimer && timerStr) {
      const timerLabel = timerModeVal === 'per_question' ? `${timerStr} / вопрос` : timerStr;
      metaItems += `<span>${timerLabel}</span>`;
    }

    html += `
      <div class="${cardClass}" data-testid="${test.id}" data-multi-attempt="${multiAttempt}">
        <div class="take-card-top">
          ${typeLabel ? `<span class="take-card-type">${typeLabel}</span>` : ''}
          ${statusHtml}
        </div>
        <div class="take-card-title">${test.title}</div>
        ${test.body ? `<div class="take-card-desc">${test.body}</div>` : ''}
        <div class="take-card-meta">
          ${metaItems}
        </div>
      </div>
    `;
  });

  testsGrid.innerHTML = html;

  testsGrid.querySelectorAll('.take-test-card').forEach(card => {
    const isCompleted = card.classList.contains('completed');
    const multiAttempt = card.dataset.multiAttempt === 'true';
    if (!isCompleted || multiAttempt) {
      card.addEventListener('click', () => showTestDetails(card.dataset.testid));
    }
  });
}

async function showTestDetails(testId) {
  try {
    const test = await getTest(testId);
    currentTest = test;
    testMode = 'details';

    listView.style.display = 'none';
    historyView.style.display = 'none';
    testView.style.display = 'flex';
    progressWrap.style.display = 'none';

    const timerWrap = container.querySelector('#timerWrap');
    if (timerWrap) timerWrap.style.display = 'none';

    const typeLabels = { onboarding: 'Онбординг', knowledge: 'Проверка знаний', competency: 'Оценка компетенций' };
    const typeLabel = typeLabels[test.test_type] || '';

    const hasTimer = test.test_settings?.timer_seconds > 0;
    const timerModeVal = test.test_settings?.timer_mode || 'global';
    const timerSeconds = test.test_settings?.timer_seconds || 0;
    const multiAttempt = test.test_settings?.multi_attempt === true;
    const questionsCount = test.questions ? test.questions.length : 0;

    let imagesHtml = '';
    if (test.images) {
      let imgs = test.images;
      if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
      if (!Array.isArray(imgs)) imgs = [];

      if (imgs.length > 0) {
        imagesHtml = `
          <div class="take-details-images">
            ${imgs.map(url => `
              <div class="take-details-image-thumb" onclick="window.open('${url}','_blank')">
                <img src="${url}" alt="" loading="lazy" />
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    const settingsItems = [];

    const qLabel = questionsCount === 1 ? 'вопрос' : questionsCount >= 2 && questionsCount <= 4 ? 'вопроса' : 'вопросов';
    settingsItems.push(`
      <div class="take-details-setting-item">
        <div class="setting-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
        </div>
        <div>
          <span class="take-details-setting-value">${questionsCount}</span>
          <span class="take-details-setting-label">${qLabel}</span>
        </div>
      </div>
    `);

    if (hasTimer && timerSeconds > 0) {
      const timeStr = formatTimerDisplay(timerSeconds);
      const timerLabel = timerModeVal === 'per_question' ? 'на вопрос' : 'на весь тест';
      settingsItems.push(`
        <div class="take-details-setting-item">
          <div class="setting-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <span class="take-details-setting-value">${timeStr}</span>
            <span class="take-details-setting-label">${timerLabel}</span>
          </div>
        </div>
      `);
    }

    if (multiAttempt) {
      settingsItems.push(`
        <div class="take-details-setting-item">
          <div class="setting-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <span class="take-details-setting-value">∞ попыток</span>
            <span class="take-details-setting-label">Повторное прохождение</span>
          </div>
        </div>
      `);
    }

    const settingsHtml = settingsItems.length > 0 ? `
      <div class="take-details-settings">
        <div class="take-details-settings-title">Параметры теста</div>
        <div class="take-details-settings-list">
          ${settingsItems.join('')}
        </div>
      </div>
    ` : '';

    testBody.innerHTML = `
      <div class="take-details">
        <div class="take-details-header">
          ${typeLabel ? `<span class="take-details-type">${typeLabel}</span>` : ''}
          <h2 class="take-details-title">${test.title}</h2>
        </div>
        ${test.body ? `<div class="take-details-description">${test.body}</div>` : ''}
        ${imagesHtml}
        ${settingsHtml}
        <button class="take-begin-btn" id="beginTestBtn">
          Начать тест
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    `;

    container.querySelector('#beginTestBtn').addEventListener('click', () => startTestExecution(testId));
  } catch (error) {
    showToast('Ошибка загрузки теста: ' + error.message, 'error');
  }
}

async function startTestExecution(testId) {
  try {
    stopAutoSave();
    stopTimer();

    const cached = getCachedProgress(testId);
    let proceed = true;

    if (cached) {
      proceed = confirm('У вас есть незавершённый тест. Продолжить с того же места?');
      if (!proceed) {
        clearCache(testId);
      }
    }

    const test = await getTest(testId);

    timerMode = test.test_settings?.timer_mode || 'global';

    if (test.test_settings?.randomize_questions) {
      const shuffled = [...test.questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      test.questions = shuffled;
    }

    currentTest = test;

    if (cached && proceed) {
      currentAnswers = cached.answers || {};
      currentQuestionIndex = cached.questionIndex || 0;
    } else {
      currentAnswers = {};
      currentQuestionIndex = 0;
    }

    renderTestPage();
  } catch (error) {
    showToast('Ошибка загрузки теста: ' + error.message, 'error');
  }
}

function saveCurrentAnswerForQuestion(question) {
  if (question.type === 'open') {
    const textarea = container.querySelector('#openAnswer');
    if (textarea) {
      const val = textarea.value;
      if (val !== undefined) currentAnswers[question.id] = val;
    }
  }
}

function renderTestPage() {
  testMode = 'question';
  progressWrap.style.display = 'flex';
  updateProgress();

  const timerWrap = container.querySelector('#timerWrap');
  const timerEnabled = !!(currentTest.test_settings?.timer_seconds > 0);
  timerMode = currentTest.test_settings?.timer_mode || 'global';

  if (timerEnabled && timerWrap) {
    timerWrap.style.display = 'flex';

    if (timerMode === 'global' && currentQuestionIndex === 0 && !timerInterval) {
      startTimer(currentTest.test_settings.timer_seconds, 'global');
    } else if (timerMode === 'per_question' && !timerInterval) {
      startPerQuestionTimer();
    }
  }

  const question = currentTest.questions[currentQuestionIndex];
  const total = currentTest.questions.length;
  const isLast = currentQuestionIndex === total - 1;
  const existing = currentAnswers[question.id];

  const typeLabels = { onboarding: 'Онбординг', knowledge: 'Проверка знаний', competency: 'Оценка компетенций' };
  const typeLabel = typeLabels[currentTest.test_type] || '';

  let descHtml = '';
  if (currentQuestionIndex === 0 && (currentTest.body || typeLabel || (currentTest.images && currentTest.images.length > 0))) {
    let imgs = currentTest.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    if (!Array.isArray(imgs)) imgs = [];

    const imagesHtml = imgs.length > 0 ? `
      <div class="take-test-images">
        ${imgs.map(url => `
          <div class="take-test-image-thumb" onclick="this.querySelector('img').requestFullscreen?.() || window.open('${url}','_blank')">
            <img src="${url}" alt="" loading="lazy" />
          </div>
        `).join('')}
      </div>
    ` : '';

    descHtml = `
      <div class="take-test-info">
        ${typeLabel ? `<span class="take-intro-type">${typeLabel}</span>` : ''}
        <div class="take-test-info-title">${currentTest.title}</div>
        ${currentTest.body ? `<div class="take-test-info-body">${currentTest.body}</div>` : ''}
        ${imagesHtml}
      </div>
    `;
  }

  let answerHtml = '';

  if (question.type === 'open') {
    answerHtml = `
      <div class="take-open-answer">
        <textarea class="take-answer-textarea" id="openAnswer" placeholder="Введите ваш ответ..." rows="6" maxlength="2000">${existing || ''}</textarea>
        <div class="take-answer-counter"><span id="openAnswerCount">${(existing || '').length}</span> / 2000</div>
      </div>
    `;
  } else if (question.type === 'single') {
    answerHtml = `
      <div class="take-options-list" id="optionsList">
        ${question.options.map(opt => `
          <label class="take-option ${existing === opt.id ? 'selected' : ''}" data-optid="${opt.id}">
            <span class="take-option-radio ${existing === opt.id ? 'checked' : ''}"></span>
            <span class="take-option-text">${opt.text}</span>
          </label>
        `).join('')}
      </div>
    `;
  } else if (question.type === 'multiple') {
    const existingArr = Array.isArray(existing) ? existing : [];
    answerHtml = `
      <div class="take-options-list" id="optionsList">
        ${question.options.map(opt => `
          <label class="take-option ${existingArr.includes(opt.id) ? 'selected' : ''}" data-optid="${opt.id}">
            <span class="take-option-checkbox ${existingArr.includes(opt.id) ? 'checked' : ''}"></span>
            <span class="take-option-text">${opt.text}</span>
          </label>
        `).join('')}
      </div>
      <div class="take-multiple-hint">Выберите все подходящие варианты</div>
    `;
  }

  testBody.innerHTML = `
    ${descHtml}
    <div class="take-question-wrap">
      <div class="take-question-card">
        <div class="take-question-num">Вопрос ${currentQuestionIndex + 1} <span>/ ${total}</span></div>
        <div class="take-question-text">${question.text}</div>
        <div class="take-question-type-hint">
          ${question.type === 'open' ? 'Свободный ответ' : question.type === 'single' ? 'Один правильный ответ' : 'Несколько правильных ответов'}
        </div>
      </div>
      <div class="take-answer-block">
        ${answerHtml}
      </div>
      <div class="take-nav-row">
        ${currentQuestionIndex > 0 && timerMode !== 'per_question' ? `
          <button class="take-nav-btn" id="prevBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Назад
          </button>
        ` : '<div></div>'}
        <button class="take-action-btn" id="nextBtn">
          ${isLast ? 'Завершить тест' : 'Следующий вопрос'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  if (question.type === 'open') {
    const textarea = container.querySelector('#openAnswer');
    if (textarea) {
      const saveToStorage = () => {
        const val = textarea.value;
        if (val !== undefined && val !== null) {
          currentAnswers[question.id] = val;
          cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
        }
      };

      const counter = container.querySelector('#openAnswerCount');
      const updateCounter = () => {
        if (counter) {
          const len = textarea.value.length;
          counter.textContent = len;
          counter.parentElement.classList.toggle('take-answer-counter--warn', len >= 1800);
          counter.parentElement.classList.toggle('take-answer-counter--full', len >= 2000);
        }
      };
      updateCounter();

      const debouncedSave = debounce(saveToStorage, 500);
      textarea.addEventListener('input', () => { updateCounter(); debouncedSave(); });
      textarea.addEventListener('blur', saveToStorage);

      currentAutoSaveField = {
        questionId: question.id,
        getValue: () => textarea.value
      };

      startAutoSave(currentTest.id, currentQuestionIndex, question.id, () => textarea.value);
    }
  } else if (question.type === 'single') {
    testBody.querySelectorAll('.take-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const optId = opt.dataset.optid;
        currentAnswers[question.id] = optId;
        testBody.querySelectorAll('.take-option').forEach(o => {
          const isSelected = o.dataset.optid === optId;
          o.classList.toggle('selected', isSelected);
          o.querySelector('.take-option-radio').classList.toggle('checked', isSelected);
        });
        cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
      });
    });
  } else if (question.type === 'multiple') {
    testBody.querySelectorAll('.take-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const optId = opt.dataset.optid;
        if (!Array.isArray(currentAnswers[question.id])) currentAnswers[question.id] = [];
        const arr = currentAnswers[question.id];
        const idx = arr.indexOf(optId);
        if (idx === -1) {
          arr.push(optId);
          opt.classList.add('selected');
          opt.querySelector('.take-option-checkbox').classList.add('checked');
        } else {
          arr.splice(idx, 1);
          opt.classList.remove('selected');
          opt.querySelector('.take-option-checkbox').classList.remove('checked');
        }
        cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
      });
    });
  }

  const prevBtn = container.querySelector('#prevBtn');
  const nextBtn = container.querySelector('#nextBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      saveCurrentAnswerForQuestion(question);
      cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
      currentQuestionIndex--;

      if (timerMode === 'per_question' && currentTest.test_settings?.timer_seconds) {
        stopTimer();
        startPerQuestionTimer();
      }

      renderTestPage();
    });
  }

  nextBtn.addEventListener('click', () => {
    saveCurrentAnswerForQuestion(question);

    const answer = currentAnswers[question.id];
    const isEmpty = answer === undefined || answer === null || answer === '' ||
      (Array.isArray(answer) && answer.length === 0);

    if (isEmpty) {
      showToast('Пожалуйста, ответьте на вопрос', 'error');
      if (question.type === 'open') {
        container.querySelector('#openAnswer')?.focus();
      }
      return;
    }

    if (isLast) {
      renderConfirm();
    } else {
      cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
      currentQuestionIndex++;

      if (timerMode === 'per_question' && currentTest.test_settings?.timer_seconds) {
        stopTimer();
        startPerQuestionTimer();
      }

      renderTestPage();
    }
  });
}

function renderConfirm() {
  stopAutoSave();
  stopTimer();
  testMode = 'confirm';
  progressWrap.style.display = 'none';
  const timerWrap = container.querySelector('#timerWrap');
  if (timerWrap) timerWrap.style.display = 'none';

  const total = currentTest.questions.length;
  const answered = currentTest.questions.filter(q => {
    const a = currentAnswers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;

  const allAnswered = answered === total;

  testBody.innerHTML = `
    <div class="take-confirm">
      <div class="take-confirm-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <h3 class="take-confirm-title">Готовы завершить тест?</h3>
      <p class="take-confirm-text">
        Вы ответили на <strong>${answered} из ${total}</strong> вопросов.
        ${!allAnswered ? '<br><span style="color:var(--ic-red);font-size:13px;font-weight:600;">Есть вопросы без ответа.</span>' : ''}
        <br>После отправки изменить ответы будет невозможно.
      </p>
      <div class="take-confirm-actions">
        <button class="take-nav-btn" id="reviewBtn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Проверить ответы
        </button>
        <button class="take-action-btn" id="submitBtn">
          Отправить тест
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  container.querySelector('#reviewBtn').addEventListener('click', () => {
    currentQuestionIndex = 0;
    renderTestPage();
  });

  container.querySelector('#submitBtn').addEventListener('click', () => submitTest());
}

function renderSubmittingScreen() {
  stopTimer();
  testMode = 'submitting';
  progressWrap.style.display = 'none';
  const timerWrap = container.querySelector('#timerWrap');
  if (timerWrap) timerWrap.style.display = 'none';

  const messages = [
    { text: 'Отправляем ваши ответы на проверку...', delay: 0 },
    { text: 'ИИ изучает каждый ответ...', delay: 4000 },
    { text: 'Анализируем результаты...', delay: 8000 },
    { text: 'Проверка идёт полным ходом...', delay: 13000 },
    { text: 'Оцениваем качество ответов...', delay: 18000 },
    { text: 'Осталось совсем чуть-чуть... честно!', delay: 24000 },
    { text: 'ИИ думает усердно, не отвлекайтесь...', delay: 30000 },
    { text: 'Финальная проверка на точность...', delay: 38000 },
    { text: 'Готовим ваш результат...', delay: 46000 },
  ];

  testBody.innerHTML = `
    <div class="take-submitting">
      <div class="take-submitting-logo">
        <img src="/assets/icons/logo_loading_animation.svg" alt="" />
      </div>
      <div class="take-submitting-message" id="submittingMessage">${messages[0].text}</div>
    </div>
  `;

  const msgEl = container.querySelector('#submittingMessage');
  msgEl.classList.add('take-submitting-message-visible');

  const timers = [];

  messages.slice(1).forEach(({ text, delay }) => {
    const t = setTimeout(() => {
      if (!msgEl) return;
      msgEl.classList.remove('take-submitting-message-visible');
      msgEl.classList.add('take-submitting-message-fade');
      setTimeout(() => {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.classList.remove('take-submitting-message-fade');
        msgEl.classList.add('take-submitting-message-visible');
      }, 300);
    }, delay);
    timers.push(t);
  });

  return () => timers.forEach(clearTimeout);
}

async function pollForResult(answerId) {
  const maxAttempts = 60;
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    try {
      const response = await fetch(`/api/take-test/result-detail/${answerId}`);
      const json = await response.json();
      if (json.success && json.data?.review_status === 'complete') {
        return json.data;
      }
    } catch {}
  }
  return null;
}

async function submitTest() {
  const submitBtn = container.querySelector('#submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
  }

  const startTime = Date.now();
  const cancelMessageTimers = renderSubmittingScreen();

  try {
    const answersPayload = currentTest.questions.map(q => ({
      question_id: q.id,
      question_text: q.text,
      question_type: q.type,
      answer: currentAnswers[q.id] ?? null,
      answer_text: resolveAnswerText(q)
    }));

    const submitted = await submitAnswers(currentTest.id, answersPayload);
    clearCache(currentTest.id);
    stopAutoSave();

    if (submitted.result?.pending_ai) {
      await pollForResult(submitted.id);
    }

    cancelMessageTimers();

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 3000 - elapsed);
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    goToList();
  } catch (error) {
    cancelMessageTimers();
    showToast('Ошибка отправки: ' + error.message, 'error');
    renderConfirm();
  }
}

function resolveAnswerText(question) {
  const answer = currentAnswers[question.id];
  if (question.type === 'open') return answer || '';
  if (question.type === 'single') {
    const opt = question.options.find(o => o.id === answer);
    return opt ? opt.text : '';
  }
  if (question.type === 'multiple') {
    const arr = Array.isArray(answer) ? answer : [];
    return question.options.filter(o => arr.includes(o.id)).map(o => o.text).join(', ');
  }
  return '';
}

function renderResult(resultData) {
  stopTimer();
  testMode = 'result';
  progressWrap.style.display = 'none';
  const timerWrap = container.querySelector('#timerWrap');
  if (timerWrap) timerWrap.style.display = 'none';

  const result = resultData?.result;
  const score = result?.score;
  const passed = result?.passed;
  const aiReview = result?.ai_review;

  let scoreHtml = '';
  if (score !== undefined && score !== null) {
    const color = score >= 80 ? 'var(--ic-green)' : score >= 60 ? 'var(--ic-accent)' : 'var(--ic-red)';
    scoreHtml = `
      <div class="take-result-score-wrap">
        <svg class="take-result-score-ring" viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ic-border)" stroke-width="8"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="8"
            stroke-dasharray="${2 * Math.PI * 50}" stroke-dashoffset="${2 * Math.PI * 50 * (1 - score / 100)}"
            stroke-linecap="round" transform="rotate(-90 60 60)"/>
          <text x="60" y="60" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="22" font-weight="700" font-family="Golos Text, sans-serif">${score}%</text>
        </svg>
        <div class="take-result-verdict ${passed ? 'pass' : 'fail'}">${passed ? '✓ Тест пройден' : '✗ Тест не пройден'}</div>
      </div>
    `;
  } else {
    scoreHtml = `
      <div class="take-result-score-wrap">
        <div class="take-result-submitted-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ic-green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <div class="take-result-verdict pass">Ответы отправлены</div>
      </div>
    `;
  }

  let aiHtml = '';
  if (aiReview) {
    aiHtml = `
      <div class="take-result-ai">
        <div class="take-ai-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          Оценка AI
        </div>
        <div class="take-ai-text">${aiReview}</div>
      </div>
    `;
  }

  testBody.innerHTML = `
    <div class="take-result">
      <div class="take-result-header">
        <h3 class="take-result-title">${currentTest.title}</h3>
        <p class="take-result-subtitle">Тест завершён</p>
      </div>
      ${scoreHtml}
      ${aiHtml}
      <button class="take-nav-btn" id="backToListBtn" style="width:100%;justify-content:center;">
        К списку тестов
      </button>
    </div>
  `;

  container.querySelector('#backToListBtn').addEventListener('click', () => goToList());
}

function goToList() {
  stopAutoSave();
  stopTimer();
  timerSecondsLeft = 0;
  currentTest = null;
  currentAnswers = {};
  currentQuestionIndex = 0;
  testMode = 'list';
  testView.style.display = 'none';
  listView.style.display = 'flex';
  historyView.style.display = 'none';
  progressWrap.style.display = 'none';
  const timerWrap = container.querySelector('#timerWrap');
  if (timerWrap) timerWrap.style.display = 'none';
  currentTab = 'tests';
  tabButtons[0].classList.add('active');
  tabButtons[1].classList.remove('active');
  loadTests();
}

window.addEventListener('beforeunload', () => {
  if (currentTest && testMode === 'question') {
    const question = currentTest.questions[currentQuestionIndex];
    if (question && question.type === 'open') {
      const textarea = container.querySelector('#openAnswer');
      if (textarea && textarea.value !== currentAnswers[question.id]) {
        currentAnswers[question.id] = textarea.value;
        cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
      }
    }
    cacheTestProgress(currentTest.id, currentQuestionIndex, currentAnswers);
  }
});

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === currentTab) return;

    currentTab = tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'tests') {
      listView.style.display = 'flex';
      historyView.style.display = 'none';
      testView.style.display = 'none';
      loadTests();
    } else if (tab === 'history') {
      listView.style.display = 'none';
      historyView.style.display = 'flex';
      testView.style.display = 'none';
      loadHistory();
    }
  });
});

backBtn.addEventListener('click', () => {
  if (testMode === 'question' || testMode === 'confirm') {
    if (confirm('Вы уверены? Прогресс будет сохранён.')) {
      goToList();
    }
  } else if (testMode === 'details') {
    goToList();
  } else {
    goToList();
  }
});

initTypeFilters();
loadTests();

if (deepLinkTestId) {
  await showTestDetails(deepLinkTestId);
}

return {
  cleanup() {
    stopAutoSave();
    stopTimer();
    container.innerHTML = '';
  }
};
}