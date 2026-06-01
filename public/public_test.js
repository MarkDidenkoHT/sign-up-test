document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('public_test');
  if (!testId) return;

  console.log('[PublicTest] testId:', testId);
  window.__PUBLIC_TEST_MODE__ = true;

  document.querySelector('.app-main').classList.add('loaded');
  document.querySelector('.app-main').style.border = 'none';

  const appLoader = document.getElementById('appLoader');
  const appMain = document.getElementById('appMain');

  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  document.getElementById('app-sidebar-container').style.display = 'none';
  document.getElementById('appMenuToggle').style.display = 'none';
  document.getElementById('appMenuMobileDropdown').style.display = 'none';

  const container = document.createElement('div');
  container.id = 'public-test-root';
  container.classList.add('public-test-container');
  appMain.appendChild(container);

  let testData = null;
  let contactInfo = null;
  let currentAnswers = {};
  let currentQuestionIndex = 0;
  let timerInterval = null;
  let timerSecondsLeft = 0;

  function getStorageKey() {
    return `public_test_${testId}`;
  }

  function saveToLocalStorage() {
    if (!testData) return;
    const storageKey = getStorageKey();
    const dataToSave = {
      testId: testData.id,
      contactInfo: contactInfo,
      answers: currentAnswers,
      questionIndex: currentQuestionIndex,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    console.log('[PublicTest] Saved to localStorage:', dataToSave);
  }

  function loadFromLocalStorage() {
    if (!testData) return null;
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    
    try {
      const data = JSON.parse(saved);
      if (data.testId === testData.id) {
        console.log('[PublicTest] Loaded from localStorage:', data);
        return data;
      }
    } catch (e) {
      console.error('[PublicTest] Failed to parse localStorage data:', e);
    }
    return null;
  }

  function clearLocalStorage() {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    console.log('[PublicTest] Cleared localStorage');
  }

  async function fetchTest() {
    const res = await fetch(`/api/public_test/${testId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load test');
    
    const data = json.data;
    if (typeof data.images === 'string') {
        try { data.images = JSON.parse(data.images); } catch { data.images = []; }
    }
    if (!Array.isArray(data.images)) data.images = [];
    
    return data;
  }

  async function submitAnswers(answers) {
    const res = await fetch('/api/public_test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_id: testData.id,
        contact: contactInfo,
        answers,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Submission failed');
    return json.data;
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function startTimer(seconds, onExpire) {
    stopTimer();
    timerSecondsLeft = seconds;
    const el = container.querySelector('#pubTimer');
    if (!el) return;

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    el.textContent = fmt(timerSecondsLeft);

    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      if (timerSecondsLeft <= 0) {
        stopTimer();
        el.textContent = '00:00';
        onExpire();
        return;
      }
      el.textContent = fmt(timerSecondsLeft);
      if (timerSecondsLeft <= 60) el.classList.add('timer-warning');
    }, 1000);
  }

  function showToast(msg, type = 'success') {
    const ex = document.querySelector('.take-toast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = `take-toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function saveOpenAnswer(question) {
    if (question.type === 'open') {
      const val = container.querySelector('#openAnswer')?.value;
      if (val !== undefined) currentAnswers[question.id] = val;
      saveToLocalStorage();
    }
  }

  function resolveAnswerText(question) {
    const answer = currentAnswers[question.id];
    if (question.type === 'open') return answer || '';
    if (question.type === 'single') {
      const opt = (question.options || []).find(o => o.id === answer);
      return opt ? opt.text : '';
    }
    if (question.type === 'multiple') {
      const arr = Array.isArray(answer) ? answer : [];
      return (question.options || []).filter(o => arr.includes(o.id)).map(o => o.text).join(', ');
    }
    return '';
  }

  function cleanPhoneNumber(phone) {
    let cleaned = phone.replace(/^\+373\s*/, '');
    cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    return cleaned;
  }

  function validateLocalPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    
    const validCodes = ['533', '552', '210', '215', '557', '219', '555', '216', '562', '774', '775', '777', '778', '779'];
    
    for (const code of validCodes) {
      if (digits.startsWith(code)) {
        const remainingLength = digits.length - code.length;
        if (remainingLength >= 5 && remainingLength <= 7) {
          return true;
        }
      }
    }
    
    return false;
  }

  function renderError(message) {
    appLoader.style.display = 'none';
    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card">
          <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
          <h2 style="margin-bottom:8px;">Тест недоступен</h2>
          <p style="color:var(--ic-muted);">${message}</p>
        </div>
      </div>
    `;
  }

  function renderContactForm(savedName = '', savedPhone = '') {
    appLoader.style.display = 'none';
    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card">
          <h2 class="pub-title">${testData.title}</h2>
          ${testData.body ? `<p class="pub-subtitle">${testData.body}</p>` : ''}
          <div style="height:1px;background:var(--ic-border);margin:20px 0;"></div>
          <p style="color:var(--ic-muted);font-size:0.85rem;margin-bottom:20px;">
            Пожалуйста, укажите ваши контактные данные для продолжения.
          </p>
          <div class="pub-form-group">
            <label class="pub-label">Имя и фамилия *</label>
            <input type="text" id="pubName" class="login-input" placeholder="Иван Иванов" maxlength="100" value="${escapeHtml(savedName)}" />
          </div>
          <div class="pub-form-group" style="margin-top:14px;">
            <label class="pub-label">Номер телефона *</label>
            <input type="tel" id="pubPhone" class="login-input" placeholder="53312345" maxlength="20" value="${escapeHtml(savedPhone)}" />
          </div>
          <button class="take-action-btn" id="pubStartBtn" style="width:100%;margin-top:24px;justify-content:center;">
            Начать тест
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    const nameInput = container.querySelector('#pubName');
    const phoneInput = container.querySelector('#pubPhone');
    const startBtn = container.querySelector('#pubStartBtn');

    function saveContactInputs() {
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      if (name || phone) {
        const storageKey = getStorageKey();
        const existing = localStorage.getItem(storageKey);
        let data = existing ? JSON.parse(existing) : {};
        data.contactInfo = { name, phone };
        data.testId = testData.id;
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    }

    nameInput.addEventListener('input', saveContactInputs);
    phoneInput.addEventListener('input', saveContactInputs);

    if (savedName) nameInput.focus();
    else nameInput.focus();

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') phoneInput.focus();
    });
    phoneInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') startBtn.click();
    });

    startBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      let phone = phoneInput.value.trim();
      
      if (!name) { showToast('Введите ваше имя', 'error'); nameInput.focus(); return; }
      
      phone = cleanPhoneNumber(phone);
      
      if (!phone || !validateLocalPhone(phone)) {
        showToast('Введите корректный номер телефона (например: 53312345)', 'error');
        phoneInput.focus();
        return;
      }
      
      contactInfo = { name, phone };
      saveToLocalStorage();
      renderTestQuestion();
    });
  }

  function renderTestQuestion() {
    if (testData.settings?.randomize_questions && currentQuestionIndex === 0 && !testData._shuffled) {
      const arr = [...testData.questions];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      testData.questions = arr;
      testData._shuffled = true;
    }

    const question = testData.questions[currentQuestionIndex];
    const total = testData.questions.length;
    const isLast = currentQuestionIndex === total - 1;
    const existing = currentAnswers[question.id];
    const progress = Math.round(((currentQuestionIndex + 1) / total) * 100);

    const timerHtml = testData.settings?.timer_seconds
      ? `<div class="take-timer-wrap" style="display:flex;">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
           </svg>
           <span id="pubTimer">00:00</span>
         </div>`
      : '';

    let answerHtml = '';
    if (question.type === 'open') {
      answerHtml = `
        <div class="take-open-answer">
          <textarea class="take-answer-textarea" id="openAnswer" placeholder="Введите ваш ответ..." rows="5" maxlength="2000">${escapeHtml(existing || '')}</textarea>
          <div class="take-answer-counter"><span id="openAnswerCount">${(existing || '').length}</span> / 2000</div>
        </div>`;
    } else if (question.type === 'single') {
      answerHtml = `
        <div class="take-options-list" id="optionsList">
          ${(question.options || []).map(opt => `
            <label class="take-option ${existing === opt.id ? 'selected' : ''}" data-optid="${opt.id}">
              <span class="take-option-radio ${existing === opt.id ? 'checked' : ''}"></span>
              <span class="take-option-text">${escapeHtml(opt.text)}</span>
            </label>
          `).join('')}
        </div>`;
    } else if (question.type === 'multiple') {
      const existingArr = Array.isArray(existing) ? existing : [];
      answerHtml = `
        <div class="take-options-list" id="optionsList">
          ${(question.options || []).map(opt => `
            <label class="take-option ${existingArr.includes(opt.id) ? 'selected' : ''}" data-optid="${opt.id}">
              <span class="take-option-checkbox ${existingArr.includes(opt.id) ? 'checked' : ''}"></span>
              <span class="take-option-text">${escapeHtml(opt.text)}</span>
            </label>
          `).join('')}
        </div>
        <div class="take-multiple-hint">Выберите все подходящие варианты</div>`;
    }

    let descHtml = '';
    if (currentQuestionIndex === 0 && testData.images?.length > 0) {
      descHtml = `
        <div class="take-test-images">
          ${testData.images.map(url => `
            <div class="take-test-image-thumb" onclick="window.open('${escapeHtml(url)}','_blank')">
              <img src="${escapeHtml(url)}" alt="" loading="lazy" />
            </div>
          `).join('')}
        </div>`;
    }

    container.innerHTML = `
      <div class="pub-test-wrap">
        <div class="pub-test-topbar">
          <div class="pub-test-brand">
            <span style="font-weight:600;font-size:1.2rem;color:var(--ic-muted);">${escapeHtml(testData.title)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div class="take-progress-label" style="font-size:0.8rem;color:var(--ic-muted);">
              ${currentQuestionIndex + 1} / ${total}
            </div>
            ${timerHtml}
          </div>
        </div>
        <div class="take-progress-bar" style="border-radius:0;height:3px;margin:0;">
          <div class="take-progress-fill" style="width:${progress}%;transition:width 0.3s ease;"></div>
        </div>
        <div class="pub-test-body">
          ${descHtml}
          <div class="take-question-wrap">
            <div class="take-question-card">
              <div class="take-question-num">Вопрос ${currentQuestionIndex + 1} <span>/ ${total}</span></div>
              <div class="take-question-text">${escapeHtml(question.text)}</div>
              <div class="take-question-type-hint">
                ${question.type === 'open' ? 'Свободный ответ' : question.type === 'single' ? 'Один правильный ответ' : 'Несколько правильных ответов'}
              </div>
            </div>
            <div class="take-answer-block">${answerHtml}</div>
            <div class="take-nav-row">
              ${currentQuestionIndex > 0 && !testData.settings?.timer_seconds ? `
                <button class="take-nav-btn" id="pubPrevBtn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  Назад
                </button>
              ` : '<div></div>'}
              <button class="take-action-btn" id="pubNextBtn">
                ${isLast ? 'Завершить тест' : 'Следующий вопрос'}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    function saveAnswerAndProgress() {
      saveToLocalStorage();
    }

    if (testData.settings?.timer_seconds && currentQuestionIndex === 0 && !timerInterval) {
      startTimer(testData.settings.timer_seconds, () => doSubmit());
    }

    if (question.type === 'single') {
      container.querySelectorAll('.take-option').forEach(opt => {
        opt.addEventListener('click', () => {
          currentAnswers[question.id] = opt.dataset.optid;
          container.querySelectorAll('.take-option').forEach(o => {
            const sel = o.dataset.optid === opt.dataset.optid;
            o.classList.toggle('selected', sel);
            o.querySelector('.take-option-radio').classList.toggle('checked', sel);
          });
          saveAnswerAndProgress();
        });
      });
    } else if (question.type === 'multiple') {
      container.querySelectorAll('.take-option').forEach(opt => {
        opt.addEventListener('click', () => {
          if (!Array.isArray(currentAnswers[question.id])) currentAnswers[question.id] = [];
          const arr = currentAnswers[question.id];
          const idx = arr.indexOf(opt.dataset.optid);
          if (idx === -1) {
            arr.push(opt.dataset.optid);
            opt.classList.add('selected');
            opt.querySelector('.take-option-checkbox').classList.add('checked');
          } else {
            arr.splice(idx, 1);
            opt.classList.remove('selected');
            opt.querySelector('.take-option-checkbox').classList.remove('checked');
          }
          saveAnswerAndProgress();
        });
      });
    } else if (question.type === 'open') {
      const textarea = container.querySelector('#openAnswer');
      if (textarea) {
        const saveOpenAnswerToStorage = () => {
          currentAnswers[question.id] = textarea.value;
          saveAnswerAndProgress();
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

        textarea.addEventListener('input', () => { updateCounter(); saveOpenAnswerToStorage(); });
        textarea.addEventListener('blur', saveOpenAnswerToStorage);
      }
    }

    const prevBtn = container.querySelector('#pubPrevBtn');
    const nextBtn = container.querySelector('#pubNextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        saveOpenAnswer(question);
        currentQuestionIndex--;
        renderTestQuestion();
      });
    }

    nextBtn.addEventListener('click', () => {
      saveOpenAnswer(question);
      const answer = currentAnswers[question.id];
      const isEmpty = answer === undefined || answer === null || answer === '' ||
        (Array.isArray(answer) && answer.length === 0);
      if (isEmpty) {
        showToast('Пожалуйста, ответьте на вопрос', 'error');
        return;
      }
      if (isLast) {
        renderConfirm();
      } else {
        currentQuestionIndex++;
        renderTestQuestion();
      }
    });
  }

  function renderConfirm() {
    stopTimer();
    const total = testData.questions.length;
    const answered = testData.questions.filter(q => {
      const a = currentAnswers[q.id];
      return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
    }).length;

    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card">
          <div class="take-confirm-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h3 class="take-confirm-title">Готовы завершить тест?</h3>
          <p class="take-confirm-text">
            Вы ответили на <strong>${answered} из ${total}</strong> вопросов.<br>
            После отправки изменить ответы будет невозможно.
          </p>
          <div class="take-confirm-actions">
            <button class="take-nav-btn" id="pubReviewBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Проверить ответы
            </button>
            <button class="take-action-btn" id="pubSubmitBtn">
              Отправить тест
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#pubReviewBtn').addEventListener('click', () => {
      currentQuestionIndex = 0;
      renderTestQuestion();
    });
    container.querySelector('#pubSubmitBtn').addEventListener('click', doSubmit);
  }

  async function doSubmit() {
    stopTimer();
    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card" style="text-align:center;">
          <div style="margin-bottom:20px;">
            <img src="/assets/icons/logo_loading_animation.svg" alt="" style="width:64px;height:64px;" onerror="this.style.display='none'">
          </div>
          <p style="color:var(--ic-muted);">Отправляем ваши ответы...</p>
        </div>
      </div>
    `;

    try {
      const answersPayload = testData.questions.map(q => ({
        question_id: q.id,
        question_text: q.text,
        question_type: q.type,
        answer: currentAnswers[q.id] ?? null,
        answer_text: resolveAnswerText(q),
      }));

      await submitAnswers(answersPayload);
      clearLocalStorage();
      renderThankYou();
    } catch (err) {
      showToast('Ошибка отправки: ' + err.message, 'error');
      renderConfirm();
    }
  }

  function renderThankYou() {
    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card" style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:16px;">✅</div>
          <h2 style="margin-bottom:8px;">Спасибо!</h2>
          <p style="color:var(--ic-muted);margin-bottom:4px;">Ваши ответы успешно отправлены.</p>
          <p style="color:var(--ic-muted);font-size:0.85rem;">Мы свяжемся с вами по указанному номеру телефона.</p>
        </div>
      </div>
    `;
  }

  function showContinueDialog(savedData) {
    appLoader.style.display = 'none';
    const answeredCount = Object.keys(savedData.answers || {}).length;
    const totalQuestions = testData.questions.length;
    
    container.innerHTML = `
      <div class="pub-center-wrap">
        <div class="pub-card">
          <h2 class="pub-title">${escapeHtml(testData.title)}</h2>
          <div style="height:1px;background:var(--ic-border);margin:20px 0;"></div>
          <p style="color:var(--ic-muted);margin-bottom:20px;">
            У вас есть незавершенный тест от ${new Date(savedData.savedAt).toLocaleString()}
          </p>
          <p style="color:var(--ic-muted);margin-bottom:20px;font-size:0.9rem;">
            Вы ответили на ${answeredCount} из ${totalQuestions} вопросов
          </p>
          <div style="display:flex;gap:12px;">
            <button class="take-nav-btn" id="pubNewTestBtn" style="flex:1;">
              Начать заново
            </button>
            <button class="take-action-btn" id="pubContinueBtn" style="flex:1;">
              Продолжить тест
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#pubNewTestBtn').addEventListener('click', () => {
      clearLocalStorage();
      contactInfo = null;
      currentAnswers = {};
      currentQuestionIndex = 0;
      renderContactForm();
    });

    container.querySelector('#pubContinueBtn').addEventListener('click', () => {
      contactInfo = savedData.contactInfo;
      currentAnswers = savedData.answers || {};
      currentQuestionIndex = savedData.questionIndex || 0;
      
      if (testData.settings?.randomize_questions && !testData._shuffled) {
        const arr = [...testData.questions];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        testData.questions = arr;
        testData._shuffled = true;
      }
      
      renderTestQuestion();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.addEventListener('beforeunload', () => {
    if (testData && contactInfo && currentQuestionIndex > 0) {
      saveToLocalStorage();
    }
  });

  try {
    appLoader.style.display = 'flex';
    testData = await fetchTest();
    appLoader.style.display = 'none';
    
    const savedData = loadFromLocalStorage();
    
    if (savedData && savedData.contactInfo && savedData.contactInfo.name && savedData.contactInfo.phone) {
      const hasAnswers = savedData.answers && Object.keys(savedData.answers).length > 0;
      if (hasAnswers && savedData.questionIndex > 0) {
        showContinueDialog(savedData);
      } else {
        renderContactForm(savedData.contactInfo.name, savedData.contactInfo.phone);
      }
    } else if (savedData && savedData.contactInfo && (savedData.contactInfo.name || savedData.contactInfo.phone)) {
      renderContactForm(savedData.contactInfo.name || '', savedData.contactInfo.phone || '');
    } else {
      renderContactForm();
    }
  } catch (err) {
    console.error('[PublicTest] init error:', err);
    renderError(err.message);
  }
});