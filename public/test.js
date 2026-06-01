export async function loadModule(container, { chatId, userData }) {

  async function getTests() {
    const response = await fetch('/api/tests/list');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки тестов');
    return result.data;
  }

  async function createTest(payload) {
    const response = await fetch('/api/tests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка создания теста');
    return result;
  }

  async function updateTest(id, payload) {
    const response = await fetch(`/api/tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка обновления теста');
    return result.data;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  container.innerHTML = `
    <div class="tests-wrapper">
      <div class="tests-main">
        <div class="tests-content">
          <div class="tests-tabs">
            <button class="tests-tab-btn active" data-tab="create">✏️ Создать тест</button>
            <button class="tests-tab-btn" data-tab="existing">📋 Существующие тесты</button>
            <button class="tests-tab-btn" data-tab="results">📊 Результаты и аналитика</button>
          </div>

          <div class="tests-tab-panel active" id="tab-create">
            <div class="tests-form-scroll" id="createFormScroll">

              <div class="tests-form-section">
                <div class="tests-form-grid">
                  <div class="tests-field-group" style="grid-column: span 2;">
                    <label class="tests-field-label">Название теста<span>*</span></label>
                    <input type="text" class="tests-input" id="testTitle" placeholder="Например: Знание кассового ПО" style="width: 500px;">
                  </div>
                  <div class="tests-field-group">
                    <label class="tests-field-label">Тип теста</label>
                    <select class="tests-select" id="testType">
                      <option value="">Не указан</option>
                      <option value="onboarding">Онбординг</option>
                      <option value="knowledge" selected>Проверка знаний</option>
                      <option value="competency">Оценка компетенций</option>
                    </select>
                  </div>
                </div>
                
                <div class="tests-settings-row">
                  <div class="tests-settings-group">
                    <div class="tests-settings-title">Настройки теста</div>
                    <div class="tests-settings-grid">
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">AI-проверка</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="aiCheckToggle">
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editPromptBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Уведомления TG</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="notifyToggle">
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editNotifyBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Видимость оценок</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="showAiAnalysisToggle" checked>
                            <span class="tests-slider"></span>
                          </label>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Мультипопытка</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="multiAttemptToggle">
                            <span class="tests-slider"></span>
                          </label>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Таймер</label>
                        <div class="tests-ai-row" style="gap:8px;align-items:center;">
                          <label class="tests-toggle">
                            <input type="checkbox" id="timerToggle">
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editTimerBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Случайный порядок</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="randomizeToggle">
                            <span class="tests-slider"></span>
                          </label>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Проверка AI-ответа</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="aiDetectToggle">
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editAiDetectBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Публичный доступ</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="publicAccessToggle">
                            <span class="tests-slider"></span>
                          </label>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Ограничение по отделам</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="accessToggle">
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editAccessBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="tests-field-group">
                        <label class="tests-field-label" style="display:flex;align-items:center;gap:5px;">Рассылка</label>
                        <div class="tests-ai-row">
                          <label class="tests-toggle">
                            <input type="checkbox" id="sendNotificationToggle" checked>
                            <span class="tests-slider"></span>
                          </label>
                          <button class="tests-prompt-edit-btn" id="editNotificationMsgBtn" style="visibility:hidden;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="tests-field-group">
                  <label class="tests-field-label">Описание / инструкция</label>
                  <div class="tests-description-container">
                    <textarea class="tests-textarea" id="testBody" placeholder="Описание для пользователя перед началом теста..."></textarea>
                    <div class="tests-description-actions">
                      <label class="tests-image-upload-btn" id="descriptionImageLabel" title="Прикрепить изображение" style="cursor:pointer;">
                        Добавить изображение
                      </label>
                    </div>
                    <div class="tests-description-thumbnails" id="descriptionThumbnails"></div>
                  </div>
                </div>
              </div>

              <div class="tests-form-section">
                <div class="tests-form-header">
                  <div class="tests-form-section-title" style="margin:0;">Вопросы</div>
                  <span class="tests-questions-count-badge" id="questionsCountBadge">0 вопросов</span>
                </div>
                <div class="tests-questions-list" id="questionsList"></div>
                <button class="tests-add-question-btn" id="addQuestionBtn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Добавить вопрос
                </button>
              </div>

              <div class="tests-form-actions" id="formActions">
                <button class="tests-submit-btn" id="submitTestBtn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span id="submitBtnText">Сохранить тест</span>
                </button>
                <button class="tests-cancel-edit-btn" id="cancelEditBtn" style="display:none;">
                  Отмена
                </button>
              </div>

            </div>
          </div>

          <div class="tests-tab-panel" id="tab-existing">
            <div class="tests-existing-list" id="existingTestsList">
              <div class="tests-loading">
                <div class="tests-loading-spinner"></div>
                <p>Загрузка тестов...</p>
              </div>
            </div>
          </div>

          <div class="tests-tab-panel" id="tab-results">
            <div class="results-analytics-container" id="resultsContainer">
              <div class="tests-loading">
                <div class="tests-loading-spinner"></div>
                <p>Загрузка результатов...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tests-modal-overlay" id="promptModal" style="display:none;">
      <div class="tests-modal">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title">🤖 AI настройки проверки</h3>
          <button class="tests-modal-close" id="promptModalClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
          <div class="tests-modal-body">
            <div class="tests-field-group">
              <label class="tests-field-label">Баллов за вопрос</label>
              <input type="number" class="tests-input" id="pointsPerQuestion" min="1" max="100" value="10" style="max-width:200px;">
              <span class="tests-field-hint">Количество баллов за каждый правильный ответ</span>
            </div>
            <div class="tests-field-group">
              <label class="tests-field-label">Итоговое резюме</label>
              <div class="tests-ai-row" style="gap:12px;align-items:center;">
                <label class="tests-toggle">
                  <input type="checkbox" id="summaryToggle">
                  <span class="tests-slider"></span>
                </label>
              </div>
            </div>
            <div class="tests-field-group" id="summaryPromptGroup" style="display:none;">
              <label class="tests-field-label">Промпт для итога</label>
              <textarea class="tests-textarea" id="summaryPromptText" style="min-height:120px;" placeholder="Например: На основе оценок ответов сделай вывод — подходит ли кандидат на должность. Учти качество ответов и общий балл."></textarea>
            </div>
            <div class="tests-field-group">
              <label class="tests-field-label">Системный промпт для AI</label>
              <textarea class="tests-textarea" id="aiPromptText" style="min-height:200px;" placeholder="Опишите, как AI должен оценивать ответы. Например: Ты — строгий экзаменатор. Оцени ответы на соответствие корпоративным стандартам..."></textarea>
            </div>
            <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Промпт и настройки сохраняются вместе с тестом.</p>
          </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn" id="promptModalCancel">Отмена</button>
          <button class="tests-submit-btn" id="promptModalSave" style="padding:10px 20px;font-size:14px;">Сохранить настройки</button>
        </div>
      </div>
    </div>

    <div class="tests-modal-overlay" id="notifyModal" style="display:none;">
      <div class="tests-modal">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title">🔔 Настройки уведомлений</h3>
          <button class="tests-modal-close" id="notifyModalClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="tests-modal-body">
          <div class="tests-field-group">
            <label class="tests-field-label">Порог уведомления (%)</label>
            <div class="tests-score-row">
              <input type="number" class="tests-input" id="notifyThresholdPercent" min="0" max="100" value="80" placeholder="80">
              <span class="tests-score-suffix">%</span>
            </div>
            <span class="tests-field-hint" id="notifyThresholdHint">Уведомление при результате ≥ X баллов (рассчитывается автоматически)</span>
          </div>
          <div class="tests-field-group">
            <label class="tests-field-label">Только в рабочее время</label>
            <div class="tests-work-hours-row">
              <label class="tests-toggle">
                <input type="checkbox" id="notifyWorkHours">
                <span class="tests-slider"></span>
              </label>
              <span class="tests-field-hint" id="notifyWorkHoursHint" style="margin:0;">Уведомлять круглосуточно</span>
            </div>
          </div>
          <div class="tests-hours-inputs" id="notifyHoursRange" style="display:none;">
            <div class="tests-field-group" style="flex:1;">
              <label class="tests-field-label">С</label>
              <input type="time" class="tests-input" id="notifyTimeFrom" value="09:00">
            </div>
            <div class="tests-field-group" style="flex:1;">
              <label class="tests-field-label">До</label>
              <input type="time" class="tests-input" id="notifyTimeTo" value="18:00">
            </div>
          </div>
          <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Настройки сохраняются вместе с тестом.</p>
        </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn" id="notifyModalCancel">Отмена</button>
          <button class="tests-submit-btn" id="notifyModalSave" style="padding:10px 20px;font-size:14px;">Сохранить настройки</button>
        </div>
      </div>
    </div>

    <div class="tests-modal-overlay" id="notificationMsgModal" style="display:none;">
      <div class="tests-modal">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title">💬 Сообщение уведомления</h3>
          <button class="tests-modal-close" id="notificationMsgModalClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="tests-modal-body">
          <div class="tests-field-group">
            <label class="tests-field-label">Текст уведомления</label>
            <textarea class="tests-textarea" id="notificationMsgText" style="min-height:150px;" placeholder="📝 Доступен новый тест!

*Название теста*

Описание теста будет добавлено автоматически...">📝 Доступен новый тест!

*Название теста*

Нажмите на кнопку ниже, чтобы начать:</textarea>
            <span class="tests-field-hint">Используйте *Название теста* — будет заменено на реальное название. Кнопка "Пройти тест" добавляется автоматически.</span>
          </div>
          <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Настройки сохраняются вместе с тестом.</p>
        </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn" id="notificationMsgModalCancel">Отмена</button>
          <button class="tests-submit-btn" id="notificationMsgModalSave" style="padding:10px 20px;font-size:14px;">Сохранить</button>
        </div>
      </div>
    </div>

    <div class="tests-modal-overlay" id="aiDetectModal" style="display:none;">
  <div class="tests-modal">
    <div class="tests-modal-header">
      <h3 class="tests-modal-title">Проверка AI-ответов</h3>
      <button class="tests-modal-close" id="aiDetectModalClose">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="tests-modal-body">
      <div class="tests-field-group">
        <label class="tests-field-label">Промпт для определения AI-ответа</label>
        <textarea class="tests-textarea" id="aiDetectPromptText" style="min-height:200px;" placeholder="Задача: Выявить использование ИИ в ответах кандидата на тестирование.
Шаг 1. Прямая генерация: Оцени вероятность использования ИИ в исходном виде. Анализируемые маркеры: орфография, синтаксис, специфическая терминология и общая структура построения фраз.
Шаг 2. Скрытая генерация (рерайт): Если текст выглядит естественно (&quot;живой&quot; язык), оцени вероятность того, что кандидат переписал ответ ИИ своими словами. Анализируемые маркеры: типичная для ИИ смысловая плотность, логика аргументации и структурный каркас ответа, скрытые за человеческим стилем.">Задача: Выявить использование ИИ в ответах кандидата на тестирование.
Шаг 1. Прямая генерация: Оцени вероятность использования ИИ в исходном виде. Анализируемые маркеры: орфография, синтаксис, специфическая терминология и общая структура построения фраз.
Шаг 2. Скрытая генерация (рерайт): Если текст выглядит естественно ("живой" язык), оцени вероятность того, что кандидат переписал ответ ИИ своими словами. Анализируемые маркеры: типичная для ИИ смысловая плотность, логика аргументации и структурный каркас ответа, скрытые за человеческим стилем.</textarea>
      </div>
      <div class="tests-field-group">
        <label class="tests-field-label">Порог уверенности (%)</label>
        <div class="tests-score-row">
          <input type="number" class="tests-input" id="aiDetectThreshold" min="1" max="100" value="80" style="max-width:100px;">
          <span class="tests-score-suffix">% — считать ответ AI-генерированным</span>
        </div>
        <span class="tests-field-hint">Если вероятность AI-ответа выше порога — результат будет отмечен как подозрительный</span>
      </div>
      <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Настройки сохраняются вместе с тестом.</p>
    </div>
    <div class="tests-modal-footer">
      <button class="tests-modal-cancel-btn" id="aiDetectModalCancel">Отмена</button>
      <button class="tests-submit-btn" id="aiDetectModalSave" style="padding:10px 20px;font-size:14px;">Сохранить настройки</button>
    </div>
  </div>
</div>


<div class="tests-modal-overlay" id="timerModal" style="display:none;">
  <div class="tests-modal">
    <div class="tests-modal-header">
      <h3 class="tests-modal-title">Настройки таймера</h3>
      <button class="tests-modal-close" id="timerModalClose">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="tests-modal-body">
      <div class="tests-field-group">
        <label class="tests-field-label">Режим таймера</label>
        <select class="tests-select" id="timerMode">
          <option value="global">Глобальный (на весь тест)</option>
          <option value="per_question">На каждый вопрос</option>
        </select>
        <span class="tests-field-hint" id="timerModeHint">Глобальный: ограниченное время на весь тест. На вопрос: ограниченное время на каждый вопрос отдельно</span>
      </div>
      <div class="tests-field-group" id="timerValueGroup">
        <label class="tests-field-label" id="timerValueLabel">Время на тест</label>
        <div class="tests-time-input-group">
          <input type="number" class="tests-input" id="timerValue" min="5" max="86400" value="300" style="width:120px;">
          <select class="tests-select" id="timerUnit" style="width:100px;">
            <option value="seconds">секунд</option>
            <option value="minutes" selected>минут</option>
            <option value="hours">часов</option>
          </select>
        </div>
        <span class="tests-field-hint" id="timerValueHint">Установите лимит времени для прохождения</span>
      </div>
      <div class="tests-field-group" id="warningGroup" style="display:none;">
        <label class="tests-field-label">Предупреждение за (сек)</label>
        <div class="tests-time-input-group">
          <input type="number" class="tests-input" id="warningSeconds" min="5" max="300" value="30" style="width:120px;">
          <span style="font-size:12px;color:var(--ic-text-muted);">сек до окончания</span>
        </div>
        <span class="tests-field-hint">Показать предупреждение за указанное время до завершения</span>
      </div>
      <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Настройки сохраняются вместе с тестом.</p>
    </div>
    <div class="tests-modal-footer">
      <button class="tests-modal-cancel-btn" id="timerModalCancel">Отмена</button>
      <button class="tests-submit-btn" id="timerModalSave" style="padding:10px 20px;font-size:14px;">Сохранить настройки</button>
    </div>
  </div>
</div>

    <div class="tests-modal-overlay" id="accessModal" style="display:none;">
      <div class="tests-modal">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title">👥 Доступ к тесту</h3>
          <button class="tests-modal-close" id="accessModalClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="tests-modal-body">
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="font-size:12px;font-weight:600;color:var(--ic-text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Отделы</div>
              <div id="accessDeptList" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;"></div>
            </div>
            <div style="flex:1;min-width:180px;">
              <div style="font-size:12px;font-weight:600;color:var(--ic-text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Команды / Магазины</div>
              <div id="accessTeamList" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;"></div>
            </div>
          </div>
          <p style="font-size:12px;color:var(--ic-text-muted);margin:14px 0 0;">Если ничего не выбрано — тест получат все пользователи.</p>
        </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn" id="accessModalCancel">Отмена</button>
          <button class="tests-submit-btn" id="accessModalSave" style="padding:10px 20px;font-size:14px;">Сохранить</button>
        </div>
      </div>
    </div>

    <div class="tests-modal-overlay" id="resultModal" style="display:none;">
      <div class="tests-modal results-modal">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title" id="resultModalTitle">Детали результата</h3>
          <button class="tests-modal-close" id="resultModalClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="tests-modal-body" id="resultModalBody">
        </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn" id="resultModalCancel">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  let questions = [];
  let aiPrompt = '';
  let summaryEnabled = false;
  let summaryPrompt = '';
  let showAiAnalysis = true;
  let pointsPerQuestion = 10;
  let notifySettings = { enabled: false, threshold_percent: 80, work_hours_only: false, time_from: '09:00', time_to: '18:00' };
  let aiDetectSettings = { enabled: false, prompt: '', threshold: 80 };
  let isEditMode = false;
  let multiAttempt = false;
  let editingTestId = null;
  let recipientsMode = 'all';
  let selectedDepartments = new Set();
  let selectedTeams = new Set();
  let recipientsChanged = false;
  let recipientsTouched = false;
  let originalRecipients = null;
  let originalAccessToggleState = null;
  let sendNotification = true;
  let notificationMessage = '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';
  let publicAccess = false;
  let timerMode = 'global';
  let timerValue = 300;
  let timerUnit = 'minutes';
  let warningSeconds = 30;
  const descriptionImages = [];

  const tabBtns = container.querySelectorAll('.tests-tab-btn');
  const tabPanels = container.querySelectorAll('.tests-tab-panel');
  const addQuestionBtn = container.querySelector('#addQuestionBtn');
  const submitTestBtn = container.querySelector('#submitTestBtn');
  const questionsCountBadge = container.querySelector('#questionsCountBadge');
  const aiCheckToggle = container.querySelector('#aiCheckToggle');
  const editPromptBtn = container.querySelector('#editPromptBtn');
  const promptModal = container.querySelector('#promptModal');
  const promptModalClose = container.querySelector('#promptModalClose');
  const promptModalCancel = container.querySelector('#promptModalCancel');
  const promptModalSave = container.querySelector('#promptModalSave');
  const aiPromptText = container.querySelector('#aiPromptText');
  const pointsPerQuestionInput = container.querySelector('#pointsPerQuestion');
  const notifyToggle = container.querySelector('#notifyToggle');
  const showAiAnalysisToggle = container.querySelector('#showAiAnalysisToggle');
  const editNotifyBtn = container.querySelector('#editNotifyBtn');
  const notifyModal = container.querySelector('#notifyModal');
  const notifyModalClose = container.querySelector('#notifyModalClose');
  const notifyModalCancel = container.querySelector('#notifyModalCancel');
  const notifyModalSave = container.querySelector('#notifyModalSave');
  const notifyWorkHours = container.querySelector('#notifyWorkHours');
  const notifyHoursRange = container.querySelector('#notifyHoursRange');
  const notifyWorkHoursHint = container.querySelector('#notifyWorkHoursHint');
  const notifyThresholdPercent = container.querySelector('#notifyThresholdPercent');
  const notifyThresholdHint = container.querySelector('#notifyThresholdHint');
  const sendNotificationToggle = container.querySelector('#sendNotificationToggle');
  const editNotificationMsgBtn = container.querySelector('#editNotificationMsgBtn');
  const notificationMsgModal = container.querySelector('#notificationMsgModal');
  const notificationMsgModalClose = container.querySelector('#notificationMsgModalClose');
  const notificationMsgModalCancel = container.querySelector('#notificationMsgModalCancel');
  const notificationMsgModalSave = container.querySelector('#notificationMsgModalSave');
  const notificationMsgText = container.querySelector('#notificationMsgText');
  const descriptionImageLabel = container.querySelector('#descriptionImageLabel');
  const descriptionThumbnails = container.querySelector('#descriptionThumbnails');
  const submitBtnText = container.querySelector('#submitBtnText');
  const cancelEditBtn = container.querySelector('#cancelEditBtn');
  const existingTestsList = container.querySelector('#existingTestsList');
  const resultsContainer = container.querySelector('#resultsContainer');
  const resultModal = container.querySelector('#resultModal');
  const resultModalClose = container.querySelector('#resultModalClose');
  const resultModalCancel = container.querySelector('#resultModalCancel');
  const resultModalTitle = container.querySelector('#resultModalTitle');
  const resultModalBody = container.querySelector('#resultModalBody');
  const summaryToggle = container.querySelector('#summaryToggle');
  const summaryPromptText = container.querySelector('#summaryPromptText');
  const summaryPromptGroup = container.querySelector('#summaryPromptGroup');
  const multiAttemptToggle = container.querySelector('#multiAttemptToggle');
  const timerToggle = container.querySelector('#timerToggle');
  const randomizeToggle = container.querySelector('#randomizeToggle');
  const aiDetectToggle = container.querySelector('#aiDetectToggle');
  const editAiDetectBtn = container.querySelector('#editAiDetectBtn');
  const aiDetectModal = container.querySelector('#aiDetectModal');
  const aiDetectModalClose = container.querySelector('#aiDetectModalClose');
  const aiDetectModalCancel = container.querySelector('#aiDetectModalCancel');
  const aiDetectModalSave = container.querySelector('#aiDetectModalSave');
  const aiDetectPromptText = container.querySelector('#aiDetectPromptText');
  const aiDetectThreshold = container.querySelector('#aiDetectThreshold');
  const accessToggle = container.querySelector('#accessToggle');
  const editAccessBtn = container.querySelector('#editAccessBtn');
  const accessModal = container.querySelector('#accessModal');
  const accessModalClose = container.querySelector('#accessModalClose');
  const accessModalCancel = container.querySelector('#accessModalCancel');
  const accessModalSave = container.querySelector('#accessModalSave');
  const accessDeptList = container.querySelector('#accessDeptList');
  const accessTeamList = container.querySelector('#accessTeamList');
  const testTitleInput = container.querySelector('#testTitle');
  const testBodyInput = container.querySelector('#testBody');
  const testTypeSelect = container.querySelector('#testType');
  const publicAccessToggle = container.querySelector('#publicAccessToggle');
  const editTimerBtn = container.querySelector('#editTimerBtn');
  const timerModal = container.querySelector('#timerModal');
  const timerModalClose = container.querySelector('#timerModalClose');
  const timerModalCancel = container.querySelector('#timerModalCancel');
  const timerModalSave = container.querySelector('#timerModalSave');
  const timerModeSelect = container.querySelector('#timerMode');
  const timerValueInput = container.querySelector('#timerValue');
  const timerUnitSelect = container.querySelector('#timerUnit');
  const timerValueGroup = container.querySelector('#timerValueGroup');
  const warningGroup = container.querySelector('#warningGroup');
  const timerValueLabel = container.querySelector('#timerValueLabel');
  const timerModeHint = container.querySelector('#timerModeHint');
  const timerValueHint = container.querySelector('#timerValueHint');

  let availableDepartments = [];
  let availableTeams = [];

  async function loadRecipientsData() {
    if (availableDepartments.length === 0) {
      try {
        const res = await fetch('/api/tests/recipients-data');
        const result = await res.json();
        if (result.success) {
          availableDepartments = result.departments || [];
          availableTeams = result.teams || [];
        }
      } catch {}
    }
  }

  function saveOriginalAccessSettings() {
    originalAccessToggleState = accessToggle.checked;
    originalRecipients = {
      departments: [...selectedDepartments],
      teams: [...selectedTeams]
    };
  }

  function checkRecipientsChanged() {
    if (!isEditMode) return;
    const toggleChanged = accessToggle.checked !== originalAccessToggleState;
    const recipientsDataChanged = JSON.stringify([...selectedDepartments, ...selectedTeams]) !== JSON.stringify([...(originalRecipients?.departments || []), ...(originalRecipients?.teams || [])]);
    recipientsChanged = toggleChanged || recipientsDataChanged;
    recipientsTouched = recipientsChanged;
  }

  const descriptionImageInput = document.createElement('input');
  descriptionImageInput.type = 'file';
  descriptionImageInput.accept = 'image/*';
  descriptionImageInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(descriptionImageInput);

  descriptionImageLabel.addEventListener('click', (e) => {
    e.preventDefault();
    descriptionImageInput.value = '';
    descriptionImageInput.click();
  });

  const debouncedAutoSave = debounce(() => performAutoSave(), 1000);

  function autoSaveTest() {
    if (!isEditMode || !editingTestId) return;
    debouncedAutoSave();
  }

  aiCheckToggle.addEventListener('change', () => {
    editPromptBtn.style.visibility = aiCheckToggle.checked ? 'visible' : 'hidden';
    autoSaveTest();
  });

  notifyToggle.addEventListener('change', () => {
    editNotifyBtn.style.visibility = notifyToggle.checked ? 'visible' : 'hidden';
    notifySettings.enabled = notifyToggle.checked;
    autoSaveTest();
  });

  sendNotificationToggle.addEventListener('change', () => {
    editNotificationMsgBtn.style.visibility = sendNotificationToggle.checked ? 'visible' : 'hidden';
    sendNotification = sendNotificationToggle.checked;
    autoSaveTest();
  });

  timerToggle.addEventListener('change', () => {
    if (timerToggle.checked) {
      editTimerBtn.style.visibility = 'visible';
      openTimerModal();
    } else {
      editTimerBtn.style.visibility = 'hidden';
      timerMode = 'global';
      timerValue = 300;
      timerUnit = 'minutes';
      warningSeconds = 30;
    }
    autoSaveTest();
  });

  timerModeSelect.addEventListener('change', () => {
    const isGlobal = timerModeSelect.value === 'global';
    if (isGlobal) {
      timerValueLabel.textContent = 'Время на тест';
      timerValueHint.textContent = 'Установите общий лимит времени для прохождения всего теста';
      warningGroup.style.display = '';
    } else {
      timerValueLabel.textContent = 'Время на вопрос';
      timerValueHint.textContent = 'Установите лимит времени на каждый отдельный вопрос';
      warningGroup.style.display = 'none';
    }
  });

  showAiAnalysisToggle.addEventListener('change', () => {
    showAiAnalysis = showAiAnalysisToggle.checked;
    autoSaveTest();
  });

  multiAttemptToggle.addEventListener('change', () => {
    multiAttempt = multiAttemptToggle.checked;
    autoSaveTest();
  });

  randomizeToggle.addEventListener('change', () => autoSaveTest());

  aiDetectToggle.addEventListener('change', () => {
    editAiDetectBtn.style.visibility = aiDetectToggle.checked ? 'visible' : 'hidden';
    aiDetectSettings.enabled = aiDetectToggle.checked;
    autoSaveTest();
  });

  publicAccessToggle.addEventListener('change', () => {
    publicAccess = publicAccessToggle.checked;
    autoSaveTest();
  });

  accessToggle.addEventListener('change', () => {
    editAccessBtn.style.visibility = accessToggle.checked ? 'visible' : 'hidden';
    recipientsTouched = true;
    recipientsChanged = true;
    if (!accessToggle.checked) {
      recipientsMode = 'all';
      selectedDepartments.clear();
      selectedTeams.clear();
    }
    checkRecipientsChanged();
    autoSaveTest();
  });

  const debouncedTitleSave = debounce(() => autoSaveTest(), 800);
  const debouncedBodySave = debounce(() => autoSaveTest(), 800);

  testTitleInput.addEventListener('input', () => debouncedTitleSave());
  testBodyInput.addEventListener('input', () => debouncedBodySave());
  testTypeSelect.addEventListener('change', () => autoSaveTest());

  async function openAccessModal() {
    await loadRecipientsData();

    accessDeptList.innerHTML = availableDepartments.map(d => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:var(--ic-radius-sm);background:${selectedDepartments.has(d) ? 'var(--ic-accent-glow)' : 'var(--ic-surface2)'};border:1px solid ${selectedDepartments.has(d) ? 'var(--ic-accent)' : 'var(--ic-border)'};">
        <input type="checkbox" data-dept="${d}" ${selectedDepartments.has(d) ? 'checked' : ''} style="accent-color:var(--ic-accent);">
        <span style="font-size:13px;">${escapeHtml(d)}</span>
      </label>
    `).join('');

    accessTeamList.innerHTML = availableTeams.map(t => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:var(--ic-radius-sm);background:${selectedTeams.has(t) ? 'var(--ic-accent-glow)' : 'var(--ic-surface2)'};border:1px solid ${selectedTeams.has(t) ? 'var(--ic-accent)' : 'var(--ic-border)'};">
        <input type="checkbox" data-team="${t}" ${selectedTeams.has(t) ? 'checked' : ''} style="accent-color:var(--ic-accent);">
        <span style="font-size:13px;">${escapeHtml(t)}</span>
      </label>
    `).join('');

    accessModal.style.display = 'flex';
  }

  function closeAccessModal() {
    accessModal.style.display = 'none';
  }

  editAccessBtn.addEventListener('click', openAccessModal);
  accessModalClose.addEventListener('click', closeAccessModal);
  accessModalCancel.addEventListener('click', closeAccessModal);
  accessModal.addEventListener('click', e => { if (e.target === accessModal) closeAccessModal(); });

  accessModalSave.addEventListener('click', () => {
    selectedDepartments.clear();
    selectedTeams.clear();
    accessDeptList.querySelectorAll('input[data-dept]:checked').forEach(cb => selectedDepartments.add(cb.dataset.dept));
    accessTeamList.querySelectorAll('input[data-team]:checked').forEach(cb => selectedTeams.add(cb.dataset.team));
    recipientsMode = (selectedDepartments.size > 0 || selectedTeams.size > 0) ? 'selected' : 'all';
    closeAccessModal();
    showToast('Доступ сохранён', 'success');
    recipientsTouched = true;
    recipientsChanged = true;
    checkRecipientsChanged();
    autoSaveTest();
  });

  function resetAccessSettings() {
    accessToggle.checked = false;
    editAccessBtn.style.visibility = 'hidden';
    recipientsMode = 'all';
    selectedDepartments.clear();
    selectedTeams.clear();
    recipientsChanged = false;
    recipientsTouched = false;
  }

  function applyAccessSettings(recipients) {
    if (!recipients || recipients === 'all') {
      resetAccessSettings();
      return;
    }
    const { departments = [], teams = [] } = recipients;
    selectedDepartments = new Set(departments);
    selectedTeams = new Set(teams);
    if (selectedDepartments.size > 0 || selectedTeams.size > 0) {
      recipientsMode = 'selected';
      accessToggle.checked = true;
      editAccessBtn.style.visibility = 'visible';
    } else {
      resetAccessSettings();
    }
    saveOriginalAccessSettings();
  }

  function openNotificationMsgModal() {
    notificationMsgText.value = notificationMessage;
    notificationMsgModal.style.display = 'flex';
    setTimeout(() => notificationMsgText.focus(), 50);
  }

  function closeNotificationMsgModal() {
    notificationMsgModal.style.display = 'none';
  }

  editNotificationMsgBtn.addEventListener('click', openNotificationMsgModal);
  notificationMsgModalClose.addEventListener('click', closeNotificationMsgModal);
  notificationMsgModalCancel.addEventListener('click', closeNotificationMsgModal);
  notificationMsgModal.addEventListener('click', (e) => {
    if (e.target === notificationMsgModal) closeNotificationMsgModal();
  });

  notificationMsgModalSave.addEventListener('click', () => {
    notificationMessage = notificationMsgText.value.trim() || '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';
    closeNotificationMsgModal();
    showToast('Сообщение уведомления сохранено', 'success');
    autoSaveTest();
  });

  function openAiDetectModal() {
    aiDetectPromptText.value = aiDetectSettings.prompt || '';
    aiDetectThreshold.value = aiDetectSettings.threshold ?? 80;
    aiDetectModal.style.display = 'flex';
    setTimeout(() => aiDetectPromptText.focus(), 50);
  }

  function closeAiDetectModal() {
    aiDetectModal.style.display = 'none';
  }


  editTimerBtn.addEventListener('click', openTimerModal);
  timerModalClose.addEventListener('click', closeTimerModal);
  timerModalCancel.addEventListener('click', closeTimerModal);
  timerModal.addEventListener('click', (e) => {
    if (e.target === timerModal) closeTimerModal();
  });
  timerModalSave.addEventListener('click', saveTimerSettings);

  editAiDetectBtn.addEventListener('click', openAiDetectModal);
  aiDetectModalClose.addEventListener('click', closeAiDetectModal);
  aiDetectModalCancel.addEventListener('click', closeAiDetectModal);
  aiDetectModal.addEventListener('click', (e) => {
    if (e.target === aiDetectModal) closeAiDetectModal();
  });

  aiDetectModalSave.addEventListener('click', () => {
    const threshold = parseInt(aiDetectThreshold.value);
    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      showToast('Укажите порог от 1 до 100', 'error');
      return;
    }
    aiDetectSettings = {
      enabled: true,
      prompt: aiDetectPromptText.value.trim(),
      threshold
    };
    closeAiDetectModal();
    showToast('Настройки проверки AI-ответов сохранены', 'success');
    autoSaveTest();
  });

  function resetAiDetectSettings() {
    aiDetectSettings = { enabled: false, prompt: '', threshold: 80 };
    aiDetectToggle.checked = false;
    editAiDetectBtn.style.visibility = 'hidden';
  }

  function applyAiDetectSettings(detect) {
    if (!detect || !detect.enabled) {
      resetAiDetectSettings();
      return;
    }
    aiDetectSettings = {
      enabled: true,
      prompt: detect.prompt || '',
      threshold: detect.threshold ?? 80
    };
    aiDetectToggle.checked = true;
    editAiDetectBtn.style.visibility = 'visible';
  }

  function updateNotifyThresholdHint() {
    const maxScore = questions.length * pointsPerQuestion;
    const thresholdPercent = parseInt(notifyThresholdPercent.value) || 80;
    const thresholdPoints = Math.ceil((thresholdPercent / 100) * maxScore);
    notifyThresholdHint.textContent = `Уведомление при результате ≥ ${thresholdPoints} из ${maxScore} баллов (${thresholdPercent}%)`;
  }

  function updatePointsPerQuestion() {
    pointsPerQuestion = Math.min(100, Math.max(1, parseInt(pointsPerQuestionInput.value) || 10));
    updateNotifyThresholdHint();
    autoSaveTest();
  }

  pointsPerQuestionInput.addEventListener('input', updatePointsPerQuestion);

  summaryToggle.addEventListener('change', () => {
    summaryPromptGroup.style.display = summaryToggle.checked ? '' : 'none';
    autoSaveTest();
  });

  notifyThresholdPercent.addEventListener('input', updateNotifyThresholdHint);

  function openPromptModal() {
    pointsPerQuestionInput.value = pointsPerQuestion;
    aiPromptText.value = aiPrompt;
    summaryToggle.checked = summaryEnabled;
    summaryPromptText.value = summaryPrompt;
    summaryPromptGroup.style.display = summaryEnabled ? '' : 'none';
    promptModal.style.display = 'flex';
    setTimeout(() => aiPromptText.focus(), 50);
  }

  function closePromptModal() {
    promptModal.style.display = 'none';
  }

  editPromptBtn.addEventListener('click', openPromptModal);
  promptModalClose.addEventListener('click', closePromptModal);
  promptModalCancel.addEventListener('click', closePromptModal);
  promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) closePromptModal();
  });

  promptModalSave.addEventListener('click', () => {
    pointsPerQuestion = Math.min(100, Math.max(1, parseInt(pointsPerQuestionInput.value) || 10));
    aiPrompt = aiPromptText.value.trim();
    summaryEnabled = summaryToggle.checked;
    summaryPrompt = summaryPromptText.value.trim();
    updateNotifyThresholdHint();
    closePromptModal();
    showToast('AI настройки сохранены', 'success');
    autoSaveTest();
  });

  function openNotifyModal() {
    notifyThresholdPercent.value = notifySettings.threshold_percent ?? 80;
    notifyWorkHours.checked = !!notifySettings.work_hours_only;
    notifyHoursRange.style.display = notifySettings.work_hours_only ? 'flex' : 'none';
    notifyWorkHoursHint.textContent = notifySettings.work_hours_only ? 'Только в указанные часы' : 'Уведомлять круглосуточно';
    if (notifySettings.time_from) container.querySelector('#notifyTimeFrom').value = notifySettings.time_from;
    if (notifySettings.time_to) container.querySelector('#notifyTimeTo').value = notifySettings.time_to;
    updateNotifyThresholdHint();
    notifyModal.style.display = 'flex';
  }

  function closeNotifyModal() {
    notifyModal.style.display = 'none';
  }

  editNotifyBtn.addEventListener('click', openNotifyModal);
  notifyModalClose.addEventListener('click', closeNotifyModal);
  notifyModalCancel.addEventListener('click', closeNotifyModal);
  notifyModal.addEventListener('click', (e) => {
    if (e.target === notifyModal) closeNotifyModal();
  });

  notifyWorkHours.addEventListener('change', () => {
    notifyHoursRange.style.display = notifyWorkHours.checked ? 'flex' : 'none';
    notifyWorkHoursHint.textContent = notifyWorkHours.checked ? 'Только в указанные часы' : 'Уведомлять круглосуточно';
  });

  notifyModalSave.addEventListener('click', () => {
    const thresholdPercent = parseInt(notifyThresholdPercent.value);
    if (isNaN(thresholdPercent) || thresholdPercent < 0 || thresholdPercent > 100) {
      showToast('Укажите порог от 0 до 100', 'error');
      return;
    }
    const workHours = notifyWorkHours.checked;
    const timeFrom = container.querySelector('#notifyTimeFrom').value;
    const timeTo = container.querySelector('#notifyTimeTo').value;
    if (workHours && timeFrom >= timeTo) {
      showToast('Время начала должно быть раньше времени конца', 'error');
      return;
    }
    notifySettings = {
      enabled: true,
      threshold_percent: thresholdPercent,
      work_hours_only: workHours,
      time_from: workHours ? timeFrom : null,
      time_to: workHours ? timeTo : null
    };
    closeNotifyModal();
    showToast('Настройки уведомлений сохранены', 'success');
    autoSaveTest();
  });

  function resetNotifySettings() {
    notifySettings = { enabled: false, threshold_percent: 80, work_hours_only: false, time_from: '09:00', time_to: '18:00' };
    notifyToggle.checked = false;
    editNotifyBtn.style.visibility = 'hidden';
  }

  function applyNotifySettings(notify) {
    if (!notify || !notify.enabled) {
      resetNotifySettings();
      return;
    }
    notifySettings = {
      enabled: true,
      threshold_percent: notify.threshold_percent ?? 80,
      work_hours_only: !!notify.work_hours_only,
      time_from: notify.time_from || '09:00',
      time_to: notify.time_to || '18:00'
    };
    notifyToggle.checked = true;
    editNotifyBtn.style.visibility = 'visible';
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.tests-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `tests-toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  async function loadExistingTests() {
    try {
      const tests = await getTests();
      renderExistingTests(tests);
    } catch (error) {
      existingTestsList.innerHTML = `
        <div class="tests-placeholder-panel">
          <div class="tests-placeholder-icon">⚠️</div>
          <h3 class="tests-placeholder-title">Ошибка загрузки</h3>
          <p class="tests-placeholder-text">${error.message}</p>
        </div>
      `;
    }
  }

  function renderExistingTests(tests) {
    if (tests.length === 0) {
      existingTestsList.innerHTML = `
        <div class="tests-placeholder-panel">
          <div class="tests-placeholder-icon">📋</div>
          <h3 class="tests-placeholder-title">Нет тестов</h3>
          <p class="tests-placeholder-text">Создайте свой первый тест на вкладке "Создать тест"</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:12px;"><div class="tests-search-bar" style="margin-bottom:8px;"><input type="text" id="testSearchInput" class="tests-input" placeholder="🔍 Поиск по названию теста..." style="width:100%;max-width:400px;"></div>';
    tests.forEach(test => {
      const questionCount = test.questions ? test.questions.length : 0;
      const dateStr = new Date(test.timestamp).toLocaleDateString('ru-RU');
      const isActive = test.status_active !== false;
      const shopUrl = `https://t.me/Hi_Tech_NST_Bot?start=test_${test.id}`;
      const officeUrl = `https://t.me/HiTechTasksBot?start=test_${test.id}`;
      const publicUrl = test.test_settings?.public_access ? `https://hi-tech-office-app.onrender.com/?public_test=${test.id}` : null;

      html += `
        <div class="tests-question-card" style="margin:0;${!isActive ? 'opacity:0.6;' : ''}" data-test-title="${escapeHtml(test.title).toLowerCase()}">
          <div class="tests-question-header" style="padding:16px;">
            <div class="tests-question-header-left" style="gap:12px;">
              <div style="font-size:16px;font-weight:600;color:var(--ic-text);">${escapeHtml(test.title)}</div>
            </div>
            <div class="tests-question-header-right" style="gap:8px;align-items:center;">
              <div style="display:flex;align-items:center;gap:8px;">
                <button class="tests-submit-btn" style="padding:4px 12px;font-size:11px;" data-copy-shop="${test.id}" data-url="${shopUrl}">
                  🔗 Магазин
                </button>
                <button class="tests-submit-btn" style="padding:4px 12px;font-size:11px;" data-copy-office="${test.id}" data-url="${officeUrl}">
                  🔗 Офис
                </button>
                ${publicUrl ? `<button class="tests-submit-btn" style="padding:4px 12px;font-size:11px;" data-copy-public="${test.id}" data-url="${publicUrl}">
                  🌐 Публичная
                </button>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <label class="tests-toggle" title="${isActive ? 'Деактивировать тест' : 'Активировать тест'}">
                  <input type="checkbox" class="tests-status-toggle" data-toggle-id="${test.id}" ${isActive ? 'checked' : ''}>
                  <span class="tests-slider"></span>
                </label>
                <span class="tests-status-label" data-status-label="${test.id}" style="font-size:12px;color:${isActive ? 'var(--ic-accent)' : 'var(--ic-text-muted)'};font-weight:600;min-width:64px;">${isActive ? 'Активен' : 'Отключён'}</span>
              </div>
              <button class="tests-submit-btn" style="padding:8px 16px;font-size:13px;" data-edit="${test.id}">
                ✏️ Редактировать
              </button>
              <button class="tests-modal-cancel-btn" style="padding:8px 16px;font-size:13px;" data-delete="${test.id}">
                🗑️ Удалить
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    existingTestsList.innerHTML = html;

    const searchInput = existingTestsList.querySelector('#testSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const testCards = existingTestsList.querySelectorAll('.tests-question-card');
        testCards.forEach(card => {
          const testTitle = card.dataset.testTitle;
          if (testTitle && testTitle.includes(searchTerm)) {
            card.style.display = '';
          } else if (!searchTerm) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }

    existingTestsList.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => editTest(btn.dataset.edit));
    });
    existingTestsList.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteTestConfirm(btn.dataset.delete));
    });
    existingTestsList.querySelectorAll('.tests-status-toggle').forEach(toggle => {
      toggle.addEventListener('change', () => toggleTestStatus(toggle.dataset.toggleId, toggle.checked, toggle));
    });
    existingTestsList.querySelectorAll('[data-copy-shop]').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.url, 'Ссылка для магазина скопирована'));
    });
    existingTestsList.querySelectorAll('[data-copy-office]').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.url, 'Ссылка для офиса скопирована'));
    });
    existingTestsList.querySelectorAll('[data-copy-public]').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.url, 'Публичная ссылка скопирована'));
    });
  }

  function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage, 'success');
    }).catch(() => {
      showToast('Не удалось скопировать ссылку', 'error');
    });
  }

  async function toggleTestStatus(testId, active, toggleEl) {
    toggleEl.disabled = true;
    try {
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_active: active })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Ошибка обновления статуса');
      const card = toggleEl.closest('.tests-question-card');
      if (card) card.style.opacity = active ? '1' : '0.6';
      const label = existingTestsList.querySelector(`[data-status-label="${testId}"]`);
      if (label) {
        label.textContent = active ? 'Активен' : 'Отключён';
        label.style.color = active ? 'var(--ic-accent)' : 'var(--ic-text-muted)';
      }
      showToast(active ? 'Тест активирован' : 'Тест деактивирован', 'success');
    } catch (error) {
      toggleEl.checked = !active;
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      toggleEl.disabled = false;
    }
  }

  async function editTest(testId) {
    try {
      const response = await fetch(`/api/tests/${testId}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Ошибка загрузки теста');
      populateFormForEdit(result.data);
      switchTab('create');
    } catch (error) {
      showToast('Ошибка загрузки теста: ' + error.message, 'error');
    }
  }

function openTimerModal() {
  timerModeSelect.value = timerMode;
  
  let displayValue = timerValue;
  let displayUnit = timerUnit;
  
  if (timerUnit === 'seconds' && timerValue >= 3600 && timerValue % 3600 === 0) {
    displayValue = timerValue / 3600;
    displayUnit = 'hours';
    timerUnitSelect.value = 'hours';
  } else if (timerUnit === 'seconds' && timerValue >= 60 && timerValue % 60 === 0) {
    displayValue = timerValue / 60;
    displayUnit = 'minutes';
    timerUnitSelect.value = 'minutes';
  } else {
    timerUnitSelect.value = timerUnit;
  }
  
  timerValueInput.value = displayValue;
  
  const warningSecondsField = document.getElementById('warningSeconds');
  if (warningSecondsField) {
    warningSecondsField.value = warningSeconds;
  }
  
  const isGlobal = timerMode === 'global';
  if (isGlobal) {
    timerValueLabel.textContent = 'Время на тест';
    timerValueHint.textContent = 'Установите общий лимит времени для прохождения всего теста';
    warningGroup.style.display = '';
  } else {
    timerValueLabel.textContent = 'Время на вопрос';
    timerValueHint.textContent = 'Установите лимит времени на каждый отдельный вопрос';
    warningGroup.style.display = 'none';
  }
  
  timerModeSelect.dispatchEvent(new Event('change'));
  timerModal.style.display = 'flex';
  setTimeout(() => timerValueInput.focus(), 50);
}

  function closeTimerModal() {
    timerModal.style.display = 'none';
  }

function saveTimerSettings() {
  const newMode = timerModeSelect.value;
  let newValue = parseInt(timerValueInput.value);
  const newUnit = timerUnitSelect.value;
  const warningSecondsField = document.getElementById('warningSeconds');
  const newWarning = warningSecondsField ? parseInt(warningSecondsField.value) : 30;
  
  if (isNaN(newValue) || newValue < 5) {
    showToast('Укажите корректное время (минимум 5)', 'error');
    return;
  }
  
  if (newUnit === 'minutes') newValue *= 60;
  if (newUnit === 'hours') newValue *= 3600;
  
  if (newValue > 86400) {
    showToast('Максимальное время - 24 часа', 'error');
    return;
  }
  
  if (newMode === 'global' && (isNaN(newWarning) || newWarning < 5 || newWarning > 300)) {
    showToast('Укажите корректное время предупреждения (5-300 секунд)', 'error');
    return;
  }
  
  timerMode = newMode;
  timerValue = newValue;
  timerUnit = newUnit;
  warningSeconds = newWarning;
  
  closeTimerModal();
  showToast('Настройки таймера сохранены', 'success');
  autoSaveTest();
}

    const warningSecondsInput = document.getElementById('warningSeconds');
    warningSecondsInput.type = 'number';
    warningSecondsInput.id = 'warningSecondsInput';
    warningSecondsInput.className = 'tests-input';
    warningSecondsInput.min = '5';
    warningSecondsInput.max = '300';
    warningSecondsInput.value = '30';
    warningSecondsInput.style.width = '120px';
    const warningGroupContainer = document.querySelector('#warningGroup .tests-time-input-group');

    if (warningGroupContainer) {
      warningGroupContainer.innerHTML = '';
      warningGroupContainer.appendChild(warningSecondsInput);
      const span = document.createElement('span');
      span.style.fontSize = '12px';
      span.style.color = 'var(--ic-text-muted)';
      span.textContent = 'сек до окончания';
      warningGroupContainer.appendChild(span);
    }

  function populateFormForEdit(test) {
    isEditMode = true;
    editingTestId = test.id;

    testTitleInput.value = test.title || '';
    testBodyInput.value = test.body || '';
    testTypeSelect.value = test.test_type || '';

    sendNotification = test.test_settings?.send_notification !== false;
    sendNotificationToggle.checked = sendNotification;
    editNotificationMsgBtn.style.visibility = sendNotification ? 'visible' : 'hidden';
    notificationMessage = test.test_settings?.notification_message || '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';

    publicAccess = test.test_settings?.public_access === true;
    publicAccessToggle.checked = publicAccess;

    const aiSettings = test.test_settings?.ai_check;
    if (aiSettings?.enabled) {
      aiCheckToggle.checked = true;
      aiPrompt = aiSettings.prompt || '';
      pointsPerQuestion = aiSettings.points_per_question ?? 10;
      summaryEnabled = aiSettings.summary_enabled ?? false;
      summaryPrompt = aiSettings.summary_prompt || '';
      editPromptBtn.style.visibility = 'visible';
    } else {
      aiCheckToggle.checked = false;
      aiPrompt = '';
      pointsPerQuestion = 10;
      summaryEnabled = false;
      summaryPrompt = '';
      editPromptBtn.style.visibility = 'hidden';
    }

    pointsPerQuestionInput.value = pointsPerQuestion;
    applyNotifySettings(test.test_settings?.notify);
    applyAiDetectSettings(test.test_settings?.ai_detect);
    applyAccessSettings(test.recipients);

    showAiAnalysis = test.test_settings?.show_ai_analysis !== false;
    showAiAnalysisToggle.checked = showAiAnalysis;

    multiAttempt = test.test_settings?.multi_attempt === true;
    multiAttemptToggle.checked = multiAttempt;

    const timerVal = test.test_settings?.timer_seconds;
    const timerModeVal = test.test_settings?.timer_mode;
    const timerWarningVal = test.test_settings?.timer_warning_seconds;

    if (timerVal && timerVal > 0) {
      timerToggle.checked = true;
      editTimerBtn.style.visibility = 'visible';
      
      if (timerModeVal === 'per_question') {
        timerMode = 'per_question';
      } else {
        timerMode = 'global';
      }
      
      timerValue = timerVal;
      warningSeconds = timerWarningVal || 30;
      timerUnit = 'seconds';
    } else {
      timerToggle.checked = false;
      editTimerBtn.style.visibility = 'hidden';
      timerMode = 'global';
      timerValue = 300;
      timerUnit = 'minutes';
      warningSeconds = 30;
    }

    randomizeToggle.checked = test.test_settings?.randomize_questions === true;

    descriptionImages.length = 0;
    let imgs = test.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch { imgs = []; }
    }
    if (Array.isArray(imgs)) {
      imgs.forEach(url => {
        if (url && typeof url === 'string') descriptionImages.push({ url });
      });
    }

    renderDescriptionThumbnails();

    questions = (test.questions || []).map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: (q.options || []).map(o => ({ id: o.id, text: o.text, correct: o.correct })),
      expanded: false
    }));

    renderQuestions();
    updateNotifyThresholdHint();

    submitBtnText.textContent = 'Редактирование...';
    cancelEditBtn.style.display = 'inline-flex';
    submitTestBtn.style.display = 'none';

    saveOriginalAccessSettings();
    recipientsChanged = false;
    recipientsTouched = false;
  }

  async function performAutoSave() {
    if (!isEditMode || !editingTestId) return;

    const title = testTitleInput.value.trim();
    const body = testBodyInput.value.trim();
    const test_type = testTypeSelect.value;

    if (!title || questions.length === 0) return;

    const aiEnabled = aiCheckToggle.checked;

    const test_settings = {
    ai_check: {
      enabled: aiEnabled,
      prompt: aiEnabled ? aiPrompt : null,
      points_per_question: pointsPerQuestion,
      summary_enabled: aiEnabled ? summaryEnabled : false,
      summary_prompt: aiEnabled && summaryEnabled ? summaryPrompt : null
    },
    notify: notifySettings.enabled ? notifySettings : { enabled: false },
    ai_detect: aiDetectSettings.enabled ? aiDetectSettings : { enabled: false },
    show_ai_analysis: showAiAnalysisToggle.checked,
    multi_attempt: multiAttemptToggle.checked,
    timer_seconds: timerToggle.checked ? timerValue : null,
    timer_mode: timerToggle.checked ? timerMode : null,
    timer_warning_seconds: (timerToggle.checked && timerMode === 'global') ? warningSeconds : null,
    randomize_questions: randomizeToggle.checked,
    send_notification: sendNotificationToggle.checked,
    notification_message: notificationMessage,
    public_access: publicAccessToggle.checked
  };

    const recipientsPayload = (accessToggle.checked && (selectedDepartments.size > 0 || selectedTeams.size > 0))
      ? { departments: [...selectedDepartments], teams: [...selectedTeams] }
      : 'all';

    const payload = {
      title,
      body: body || null,
      images: descriptionImages.map(img => img.url),
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.type === 'open' ? [] : q.options.filter(o => o.text.trim()).map(o => ({
          id: o.id,
          text: o.text,
          correct: o.correct
        }))
      })),
      test_type: test_type || null,
      test_settings,
      recipients: recipientsPayload
    };

    try {
      await updateTest(editingTestId, payload);
      showToast('Изменения сохранены', 'success');
    } catch (error) {
      showToast('Ошибка автосохранения: ' + error.message, 'error');
    }
  }

  function cancelEdit() {
    isEditMode = false;
    editingTestId = null;
    recipientsChanged = false;
    recipientsTouched = false;

    testTitleInput.value = '';
    testBodyInput.value = '';
    testTypeSelect.value = '';
    aiCheckToggle.checked = false;
    editPromptBtn.style.visibility = 'hidden';
    aiPrompt = '';
    pointsPerQuestion = 10;
    pointsPerQuestionInput.value = 10;
    summaryEnabled = false;
    summaryPrompt = '';
    showAiAnalysis = true;
    showAiAnalysisToggle.checked = true;
    multiAttempt = false;
    multiAttemptToggle.checked = false;
    timerToggle.checked = false;
    editTimerBtn.style.visibility = 'hidden';
    timerMode = 'global';
    timerValue = 300;
    timerUnit = 'minutes';
    warningSeconds = 30;
    randomizeToggle.checked = false;
    sendNotification = true;
    sendNotificationToggle.checked = true;
    editNotificationMsgBtn.style.visibility = 'visible';
    notificationMessage = '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';
    publicAccess = false;
    publicAccessToggle.checked = false;
    questions = [];
    descriptionImages.length = 0;
    renderDescriptionThumbnails();
    renderQuestions();
    resetNotifySettings();
    resetAiDetectSettings();
    resetAccessSettings();
    updateNotifyThresholdHint();

    submitBtnText.textContent = 'Сохранить тест';
    submitTestBtn.style.display = 'inline-flex';
    cancelEditBtn.style.display = 'none';
  }

  async function deleteTestConfirm(testId) {
    if (!confirm('Вы уверены, что хотите удалить этот тест?')) return;
    try {
      const response = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Ошибка удаления');
      showToast('Тест удалён', 'success');
      loadExistingTests();
    } catch (error) {
      showToast('Ошибка удаления: ' + error.message, 'error');
    }
  }

  let eventSource = null;

    function setupRealtimeUpdates() {
    if (eventSource) eventSource.close();

    eventSource = new EventSource('/api/module-events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_test_result') {
          showToast(`Новый результат: ${data.chat_id || 'Пользователь'} завершил тест`, 'success');
          const activeTab = container.querySelector('#tab-results');
          if (activeTab?.classList.contains('active')) loadAnalytics();
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSource = null;
      setTimeout(setupRealtimeUpdates, 5000);
    };
  }

  async function loadAnalytics() {
    try {
      const [analyticsRes, tests] = await Promise.all([
        fetch('/api/tests/results').then(r => r.json()),
        getTests().catch(() => [])
      ]);
      if (!analyticsRes.success) throw new Error(analyticsRes.error || 'Ошибка загрузки результатов');
      const testsMap = new Map(tests.map(t => [t.id, t]));
      await renderAnalytics(analyticsRes.data, testsMap);
    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="tests-placeholder-panel">
          <div class="tests-placeholder-icon">⚠️</div>
          <h3 class="tests-placeholder-title">Ошибка загрузки</h3>
          <p class="tests-placeholder-text">${error.message}</p>
        </div>
      `;
    }
  }

  function calculatePassingStatus(resultData, test) {
    const maxScore = (test?.questions?.length || 0) * (test?.test_settings?.ai_check?.points_per_question || 10);
    const thresholdPercent = test?.test_settings?.notify?.threshold_percent || 80;
    const requiredScore = Math.ceil((thresholdPercent / 100) * maxScore);
    const actualScore = resultData.result?.score || 0;
    return { passed: actualScore >= requiredScore, actualScore, maxScore, requiredScore, thresholdPercent };
  }

  function getAverageAiScore(resultData) {
    let aiDetection = resultData.ai_detection;
    if (typeof aiDetection === 'string') {
      try { aiDetection = JSON.parse(aiDetection); } catch { aiDetection = null; }
    }
    if (!aiDetection?.results?.length) return null;
    const avgProbability = aiDetection.results.reduce((sum, r) => sum + (r.probability || 0), 0) / aiDetection.results.length;
    return Math.round(avgProbability);
  }

  function showCombinedDetailsModal(resultData) {
    const test = resultData.test;
    const score = resultData.result?.score;
    const passed = resultData.result?.passed;
    const breakdown = resultData.breakdown || [];
    const attentionFlags = resultData.attention_flags || [];
    const reviewStatus = resultData.review_status;
    const user = resultData.user || null;
    const isPublicSubmission = resultData.public_submission === true;
    const publicContact = resultData.public_contact || null;

    let aiDetection = resultData.ai_detection;
    if (typeof aiDetection === 'string') {
      try { aiDetection = JSON.parse(aiDetection); } catch { aiDetection = null; }
    }
    const aiDetectionMap = new Map((aiDetection?.results || []).map(item => [item.question_id, item]));

    const employeeName = user?.user_name?.trim() || null;
    const employeeDept = user?.user_department?.trim() || null;

    let employeeDisplay = '';
    if (isPublicSubmission) {
      const publicName = publicContact?.name || 'Аноним';
      const publicPhone = publicContact?.phone || '';
      employeeDisplay = `
        <div style="font-weight:600;font-size:14px;color:var(--ic-accent);">${escapeHtml(publicName)}</div>
        ${publicPhone ? `<div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">📞 ${escapeHtml(publicPhone)}</div>` : ''}
        <div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">Публичная отправка</div>
      `;
    } else {
      employeeDisplay = employeeName
        ? `<div style="font-weight:600;font-size:14px;">${escapeHtml(employeeName)}</div><div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">${escapeHtml(resultData.chat_id || '')}</div>`
        : `<div style="font-weight:600;font-size:14px;">${escapeHtml(resultData.chat_id || '—')}</div>`;
    }

    let bodyHtml = `
      <div style="display:flex;align-items:center;gap:20px;padding:16px;background:var(--ic-surface2);border-radius:var(--ic-radius-sm);margin-bottom:20px;flex-wrap:wrap;">
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">${isPublicSubmission ? 'Отправитель' : 'Сотрудник'}</div>
          ${employeeDisplay}
        </div>
        ${(!isPublicSubmission && employeeDept) ? `
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">Отдел</div>
          <div style="font-size:13px;">${escapeHtml(employeeDept)}</div>
        </div>` : ''}
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">Дата</div>
          <div style="font-size:14px;">${new Date(resultData.created_at || resultData.timestamp).toLocaleString('ru-RU')}</div>
        </div>
        ${score !== null && score !== undefined ? `
        <div style="margin-left:auto;text-align:center;">
          <div style="font-size:32px;font-weight:700;line-height:1;">${score}%</div>
          <div style="font-size:12px;font-weight:600;margin-top:2px;">${passed ? 'Пройден' : 'Не пройден'}</div>
        </div>` : `
        <div style="margin-left:auto;">
          <div style="font-size:13px;color:var(--ic-text-muted);">${reviewStatus === 'pending' ? 'Ожидает AI-проверки' : reviewStatus === 'error' ? 'Ошибка проверки' : '—'}</div>
        </div>`}
      </div>
    `;

    if (reviewStatus === 'needs_attention') {
      bodyHtml += `
        <div style="padding:10px 14px;background:var(--ic-red-bg);border:1px solid var(--ic-red);border-radius:var(--ic-radius-sm);margin-bottom:16px;font-size:13px;color:var(--ic-red);font-weight:500;">
          ${attentionFlags.length} вопрос(ов) требуют ручной проверки — модели AI сильно расходились в оценках
        </div>
      `;
    }

    if (breakdown.length > 0) {
      bodyHtml += `<div style="display:flex;flex-direction:column;gap:16px;">`;
      breakdown.forEach((item, i) => {
        const needsAttention = attentionFlags.includes(item.question_id);
        const aiScore = item.ai_score;
        const aiReasoning = item.ai_reasoning;
        const scoreDisplay = aiScore !== null && aiScore !== undefined ? `${aiScore}/10` : '—/10';
        const aiDetectItem = aiDetectionMap.get(item.question_id);
        const aiProbability = aiDetectItem?.probability ?? null;
        const isAiSuspicious = aiDetectItem?.is_ai === true;
        const detectReasoning = aiDetectItem?.reasoning || null;

        bodyHtml += `
          <div style="background:var(--ic-surface2);border:1px solid ${needsAttention ? 'var(--ic-red)' : 'var(--ic-border)'};border-radius:var(--ic-radius);overflow:hidden;">
            <div style="padding:12px 14px;border-bottom:1px solid var(--ic-border);display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:11px;font-weight:700;color:var(--ic-text-muted);background:var(--ic-surface);border:1px solid var(--ic-border);border-radius:20px;padding:2px 8px;flex-shrink:0;margin-top:1px;">${i + 1}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--ic-text);line-height:1.4;">${escapeHtml(item.question_text)}</div>
                ${needsAttention ? '<div style="font-size:11px;color:var(--ic-red);margin-top:4px;">Расхождение оценок</div>' : ''}
              </div>
            </div>
            <div style="padding:12px 14px;">
              <div style="font-size:11px;color:var(--ic-text-muted);margin-bottom:4px;font-weight:600;">ОТВЕТ</div>
              <div style="font-size:13px;color:var(--ic-text);background:var(--ic-surface);border:1px solid var(--ic-border);border-left:3px solid var(--ic-accent);padding:10px 12px;border-radius:var(--ic-radius-sm);line-height:1.5;white-space:pre-wrap;">${escapeHtml(item.answer_text || item.answer || '(нет ответа)')}</div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--ic-surface);border-radius:var(--ic-radius-sm);border:1px solid var(--ic-border);">
                  <span style="font-size:11px;font-weight:600;color:var(--ic-text-muted);min-width:56px;padding-top:1px;">Оценка ИИ</span>
                  <span style="font-size:12px;font-weight:700;min-width:48px;">${scoreDisplay}</span>
                  <span style="font-size:12px;color:var(--ic-text);flex:1;line-height:1.5;">${escapeHtml(aiReasoning || '')}</span>
                </div>
                ${aiProbability !== null ? `
                <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--ic-surface);border-radius:var(--ic-radius-sm);border:1px solid ${isAiSuspicious ? '#dc3545' : 'var(--ic-border)'};">
                  <span style="font-size:11px;font-weight:600;color:var(--ic-text-muted);min-width:56px;padding-top:1px;">AI детекция</span>
                  <span style="font-size:12px;font-weight:700;min-width:48px;${aiProbability > 70 ? 'color:#dc3545;' : aiProbability > 40 ? 'color:#ffc107;' : 'color:#28a745;'}">${aiProbability}%</span>
                  <span style="font-size:12px;color:var(--ic-text);flex:1;line-height:1.5;">${escapeHtml(detectReasoning || (isAiSuspicious ? 'Высокая вероятность использования ИИ' : 'Низкая вероятность использования ИИ'))}</span>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });
      bodyHtml += `</div>`;
    }

    resultModalTitle.textContent = `Детали результата: ${test?.title || 'Тест'}`;
    resultModalBody.innerHTML = bodyHtml;
    resultModal.style.display = 'flex';
  }

  async function renderAnalytics(results, testsMapArg) {
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="tests-placeholder-panel">
          <div class="tests-placeholder-icon">📊</div>
          <h3 class="tests-placeholder-title">Нет результатов</h3>
          <p class="tests-placeholder-text">Когда пройдут тесты, здесь появится аналитика</p>
        </div>
      `;
      return;
    }

    const testsMap = testsMapArg || new Map();
    if (!testsMapArg) {
      try {
        const tests = await getTests();
        tests.forEach(test => testsMap.set(test.id, test));
      } catch {}
    }

    const detailedResults = results.map(result => {
      const test = testsMap.get(result.test_id);
      return {
        ...result,
        test,
        status: test ? calculatePassingStatus(result, test) : null,
        avgAiScore: getAverageAiScore(result)
      };
    });

    const departments = [...new Set(detailedResults.map(r => r.user?.user_department?.trim()).filter(Boolean))].sort();
    const testOptions = [...testsMap.values()].sort((a, b) => a.title.localeCompare(b.title));
    const statusStageOptions = ['Новый', 'В работе', 'Отклонено', 'Принято'];

    resultsContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:var(--ic-surface2);border:1px solid var(--ic-border);border-radius:var(--ic-radius);padding:16px;">
          <div style="font-size:12px;font-weight:600;color:var(--ic-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Фильтры</div>
          
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:4px;min-width:180px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Тест</label>
              <select class="tests-select" id="filterTest" style="height:36px;font-size:13px;">
                <option value="">Все тесты</option>
                ${testOptions.map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:15px;align-items:center;padding-bottom:4px;">
              <div style="text-align:center;min-width:70px;">
                <div style="font-size:20px;font-weight:700;color:var(--ic-accent);" id="totalPassedCount">0</div>
                <div style="font-size:10px;color:var(--ic-text-muted);">Всего ответов</div>
              </div>
              <div style="text-align:center;min-width:70px;">
                <div style="font-size:20px;font-weight:700;color:var(--ic-accent);" id="uniqueUsersCount">0</div>
                <div style="font-size:10px;color:var(--ic-text-muted);">Уникальных</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Пользователь</label>
              <input type="text" class="tests-input" id="filterUser" placeholder="Имя или chat_id..." style="height:36px;font-size:13px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Отдел</label>
              <select class="tests-select" id="filterDept" style="height:36px;font-size:13px;">
                <option value="">Все отделы</option>
                ${departments.map(d => `<option value="${d}">${escapeHtml(d)}</option>`).join('')}
                <option value="Публичные">Публичные</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:100px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Результат</label>
              <select class="tests-select" id="filterResult" style="height:36px;font-size:13px;">
                <option value="">Все</option>
                <option value="passed">Сдан</option>
                <option value="failed">Не сдан</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Статус ответа</label>
              <select class="tests-select" id="filterAnswerStatus" style="height:36px;font-size:13px;">
                <option value="">Все</option>
                ${statusStageOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Дата от</label>
              <input type="date" class="tests-input" id="filterDateFrom" style="height:36px;font-size:13px;width:140px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:var(--ic-text-muted);">Дата до</label>
              <input type="date" class="tests-input" id="filterDateTo" style="height:36px;font-size:13px;width:140px;">
            </div>
            <button class="tests-modal-cancel-btn" id="filterResetBtn" style="height:36px;padding:0 14px;font-size:13px;">Сбросить</button>
          </div>
        </div>
        <div class="analytics-table-container" id="analyticsTableWrap">
          <table class="analytics-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="test">Тест <span class="sort-arrow"></span></th>
                <th class="sortable" data-sort="user">Пользователь <span class="sort-arrow"></span></th>
                <th class="sortable" data-sort="dept">Отдел <span class="sort-arrow"></span></th>
                <th class="sortable" data-sort="score">Баллы <span class="sort-arrow"></span></th>
                <th class="sortable" data-sort="ai">AI детекция <span class="sort-arrow"></span></th>
                <th class="sortable" data-sort="status">Статус <span class="sort-arrow"></span></th>
                <th>Комментарий</th>
                <th class="sortable" data-sort="date">Дата <span class="sort-arrow"></span></th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody id="analyticsTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    let currentSortColumn = 'date';
    let currentSortDirection = 'desc';

    function renderTableBody(filtered) {
      const tbody = resultsContainer.querySelector('#analyticsTableBody');
      if (!tbody) return;

      const sorted = [...filtered].sort((a, b) => {
        let aVal, bVal;
        switch (currentSortColumn) {
          case 'test':
            aVal = (a.test?.title || '').toLowerCase();
            bVal = (b.test?.title || '').toLowerCase();
            break;
          case 'user':
            const aName = a.public_submission ? (a.public_contact?.name || 'Аноним') : (a.user?.user_name?.trim() || a.chat_id || '');
            const bName = b.public_submission ? (b.public_contact?.name || 'Аноним') : (b.user?.user_name?.trim() || b.chat_id || '');
            aVal = aName.toLowerCase();
            bVal = bName.toLowerCase();
            break;
          case 'dept':
            if (a.public_submission) { aVal = 'публичная отправка'; }
            else { aVal = (a.user?.user_department?.trim() || '').toLowerCase(); }
            if (b.public_submission) { bVal = 'публичная отправка'; }
            else { bVal = (b.user?.user_department?.trim() || '').toLowerCase(); }
            break;
          case 'score':
            const maxScoreA = (a.test?.questions?.length || 0) * (a.test?.test_settings?.ai_check?.points_per_question || 10);
            const maxScoreB = (b.test?.questions?.length || 0) * (b.test?.test_settings?.ai_check?.points_per_question || 10);
            const actualScoreA = a.result?.score !== null && a.result?.score !== undefined ? Math.round((a.result.score / 100) * maxScoreA) : 0;
            const actualScoreB = b.result?.score !== null && b.result?.score !== undefined ? Math.round((b.result.score / 100) * maxScoreB) : 0;
            aVal = actualScoreA;
            bVal = actualScoreB;
            break;
          case 'ai':
            aVal = a.avgAiScore !== null ? a.avgAiScore : -1;
            bVal = b.avgAiScore !== null ? b.avgAiScore : -1;
            break;
          case 'status':
            aVal = a.test_status || '';
            bVal = b.test_status || '';
            break;
          case 'date':
          default:
            aVal = new Date(a.created_at || a.timestamp).getTime();
            bVal = new Date(b.created_at || b.timestamp).getTime();
            break;
        }
        if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--ic-text-muted);padding:32px;">Нет данных по выбранным фильтрам</td></tr>`;
        const totalPassedEl = resultsContainer.querySelector('#totalPassedCount');
        const uniqueUsersEl = resultsContainer.querySelector('#uniqueUsersCount');
        if (totalPassedEl) totalPassedEl.textContent = '0';
        if (uniqueUsersEl) uniqueUsersEl.textContent = '0';
        return;
      }

      tbody.innerHTML = sorted.map(item => {
        const testName = item.test?.title || `Тест #${item.test_id}`;
        const maxScore = (item.test?.questions?.length || 0) * (item.test?.test_settings?.ai_check?.points_per_question || 10);
        const actualScore = item.result?.score !== null && item.result?.score !== undefined
          ? Math.round((item.result.score / 100) * maxScore)
          : 0;
        const scoreDisplay = maxScore > 0 ? `${actualScore}/${maxScore}` : (item.result?.score || '0') + '%';

        let avgAiScoreDisplay = '—';
        let avgAiScoreStyle = '';
        if (item.avgAiScore !== null) {
          avgAiScoreDisplay = `${item.avgAiScore}%`;
          avgAiScoreStyle = item.avgAiScore > 70 ? 'style="color:#dc3545;font-weight:600;"' : item.avgAiScore > 40 ? 'style="color:#ffc107;font-weight:600;"' : 'style="color:#28a745;font-weight:600;"';
        }

        const isPublicSubmission = item.public_submission === true;
        const publicContact = item.public_contact || null;
        const publicName = publicContact?.name || null;
        const publicPhone = publicContact?.phone || null;
        
        const userName = item.user?.user_name?.trim() || null;
        const userDept = item.user?.user_department?.trim() || null;
        
        let employeeCell = '';
        if (isPublicSubmission) {
          const displayName = publicName || 'Аноним';
          const displayContact = publicPhone ? `${publicPhone}` : '';
          employeeCell = `
            <div style="font-weight:600;font-size:13px;">${escapeHtml(displayName)}</div>
            <div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">${displayContact}</div>
          `;
        } else {
          employeeCell = userName
            ? `<div style="font-weight:600;font-size:13px;">${escapeHtml(userName)}</div><div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">${escapeHtml(item.chat_id || '—')}</div>`
            : `<div style="font-size:13px;color:var(--ic-text-muted);">${escapeHtml(item.chat_id || '—')}</div>`;
        }
        
        const deptCell = (!isPublicSubmission && userDept)
          ? `<span style="font-size:12px;padding:2px 8px;border-radius:20px;background:var(--ic-bg-secondary);color:var(--ic-text-muted);">${escapeHtml(userDept)}</span>`
          : `<span style="color:var(--ic-text-muted);font-size:12px;">${isPublicSubmission ? 'Публичная отправка' : '—'}</span>`;

        const hasSummary = !!item.result?.ai_summary;
        const answerStatus = item.test_status || 'Новый';
        const comment = item.comment || '';

        return `
          <tr>
            <td><strong>${escapeHtml(testName)}</strong></td>
            <td>${employeeCell}</td>
            <td>${deptCell}</td>
            <td>${scoreDisplay}</td>
            <td ${avgAiScoreStyle}>${avgAiScoreDisplay}</td>
            <td>
              <select class="answer-status-select" data-answer-id="${item.id}" style="padding:4px 8px;font-size:12px;border-radius:var(--ic-radius-sm);border:1px solid var(--ic-border);background:var(--ic-surface);color:var(--ic-text);cursor:pointer;">
                <option value="Новый" ${answerStatus === 'Новый' ? 'selected' : ''}>Новый</option>
                <option value="В работе" ${answerStatus === 'В работе' ? 'selected' : ''}>В работе</option>
                <option value="Отклонено" ${answerStatus === 'Отклонено' ? 'selected' : ''}>Отклонено</option>
                <option value="Принято" ${answerStatus === 'Принято' ? 'selected' : ''}>Принято</option>
              </select>
            </td>
            <td style="min-width:180px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <button class="comment-modal-btn" data-answer-id="${item.id}" data-comment="${escapeHtml(comment)}" style="padding:4px 12px;font-size:12px;border-radius:var(--ic-radius-sm);background:var(--ic-accent-glow);color:var(--ic-accent);border:1px solid var(--ic-accent);cursor:pointer;">
                  ${comment ? '✏️ Редактировать' : '➕ Добавить'}
                </button>
              </div>
            </td>
            <td>${new Date(item.created_at || item.timestamp).toLocaleDateString('ru-RU')}</td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="analytics-view-btn" data-resultid="${item.id}" style="padding:4px 12px;font-size:12px;border-radius:var(--ic-radius-sm);background:var(--ic-accent-glow);color:var(--ic-accent);border:1px solid var(--ic-accent);cursor:pointer;">Детали</button>
                ${hasSummary ? `<button class="analytics-summary-btn" data-resultid="${item.id}" style="padding:4px 12px;font-size:12px;border-radius:var(--ic-radius-sm);background:var(--ic-accent-glow);color:var(--ic-accent);border:1px solid var(--ic-accent);cursor:pointer;">Итог</button>` : ''}
                <button class="analytics-archive-btn" data-resultid="${item.id}" style="padding:4px 12px;font-size:12px;border-radius:var(--ic-radius-sm);background:var(--ic-red-bg);color:var(--ic-red);border:1px solid var(--ic-red);cursor:pointer;" title="Архивировать ответ">Архив</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      const totalAnswers = sorted.length;
      const uniqueUsers = new Set(sorted.map(item => {
        if (item.public_submission) {
          return `public_${item.public_contact?.phone || item.public_contact?.name || item.id}`;
        }
        return item.user?.user_name?.trim() || item.chat_id;
      }).filter(Boolean)).size;
      
      const totalAnswersEl = resultsContainer.querySelector('#totalPassedCount');
      const uniqueUsersEl = resultsContainer.querySelector('#uniqueUsersCount');
      if (totalAnswersEl) totalAnswersEl.textContent = totalAnswers;
      if (uniqueUsersEl) uniqueUsersEl.textContent = uniqueUsers;
      if (uniqueUsersEl) uniqueUsersEl.textContent = uniqueUsers;

      tbody.querySelectorAll('.analytics-view-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const response = await fetch(`/api/tests/result-detail/${btn.dataset.resultid}`);
            const result = await response.json();
            if (!result.success) throw new Error('Ошибка загрузки');
            showCombinedDetailsModal(result.data);
          } catch (err) {
            showToast('Ошибка загрузки деталей: ' + err.message, 'error');
          }
        });
      });

      tbody.querySelectorAll('.analytics-summary-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const response = await fetch(`/api/tests/result-detail/${btn.dataset.resultid}`);
            const result = await response.json();
            if (!result.success) throw new Error('Ошибка загрузки');
            const summary = result.data.result?.ai_summary;
            if (!summary) { showToast('Итог недоступен', 'error'); return; }
            showSummaryModal(result.data);
          } catch (err) {
            showToast('Ошибка загрузки итога: ' + err.message, 'error');
          }
        });
      });

      tbody.querySelectorAll('.analytics-archive-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const resultId = btn.dataset.resultid;
          if (!confirm('Вы уверены, что хотите архивировать этот ответ? Он будет скрыт из списка результатов.')) return;
          
          try {
            const response = await fetch(`/api/tests/answer/${resultId}/hide`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Ошибка архивации');
            
            showToast('Ответ архивирован', 'success');
            
            const row = btn.closest('tr');
            if (row) row.remove();
            
            const remainingRows = tbody.querySelectorAll('tr').length;
            if (remainingRows === 0) {
              const totalPassedEl2 = resultsContainer.querySelector('#totalPassedCount');
              const uniqueUsersEl2 = resultsContainer.querySelector('#uniqueUsersCount');
              if (totalPassedEl2) totalPassedEl2.textContent = '0';
              if (uniqueUsersEl2) uniqueUsersEl2.textContent = '0';
            }
          } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
          }
        });
      });

      tbody.querySelectorAll('.answer-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          e.stopPropagation();
          const newStatus = select.value;
          const answerId = select.dataset.answerId;
          const previousValue = select.getAttribute('data-previous-value') || select.value;
          select.setAttribute('data-previous-value', select.value);
          
          try {
            const response = await fetch(`/api/tests/answer/${answerId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ test_status: newStatus })
            });
            const result = await response.json();
            if (!result.success) {
              showToast(result.error || 'Ошибка обновления статуса', 'error');
              select.value = previousValue;
              return;
            }
            showToast(`Статус изменён на "${newStatus}"`, 'success');
            select.setAttribute('data-previous-value', newStatus);
          } catch (error) {
            showToast('Ошибка: ' + error.message, 'error');
            select.value = previousValue;
          }
        });
      });

      tbody.querySelectorAll('.comment-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => openCommentModal(btn.dataset.answerId, btn.dataset.comment || ''));
      });
    }

    const filterTest = resultsContainer.querySelector('#filterTest');
    const filterUser = resultsContainer.querySelector('#filterUser');
    const filterDept = resultsContainer.querySelector('#filterDept');
    const filterResult = resultsContainer.querySelector('#filterResult');
    const filterAnswerStatus = resultsContainer.querySelector('#filterAnswerStatus');
    const filterDateFrom = resultsContainer.querySelector('#filterDateFrom');
    const filterDateTo = resultsContainer.querySelector('#filterDateTo');
    const filterResetBtn = resultsContainer.querySelector('#filterResetBtn');

    let activeFilters = { test: '', user: '', dept: '', result: '', answerStatus: '', dateFrom: '', dateTo: '' };

    function applyFilters() {
      let filtered = detailedResults;
      if (activeFilters.test) filtered = filtered.filter(r => String(r.test_id) === String(activeFilters.test));
      if (activeFilters.user) {
        const q = activeFilters.user.toLowerCase();
        filtered = filtered.filter(r =>
          (r.user?.user_name || '').toLowerCase().includes(q) ||
          (r.chat_id || '').toLowerCase().includes(q)
        );
      }
      if (activeFilters.dept) {
        if (activeFilters.dept === 'Публичные') {
          filtered = filtered.filter(r => r.public_submission === true);
        } else {
          filtered = filtered.filter(r => (r.user?.user_department || '').trim() === activeFilters.dept);
        }
      }
      if (activeFilters.result === 'passed') filtered = filtered.filter(r => r.status?.passed === true);
      if (activeFilters.result === 'failed') filtered = filtered.filter(r => r.status?.passed === false);
      if (activeFilters.answerStatus) filtered = filtered.filter(r => r.test_status === activeFilters.answerStatus);
      if (activeFilters.dateFrom) {
        const from = new Date(activeFilters.dateFrom);
        filtered = filtered.filter(r => new Date(r.created_at || r.timestamp) >= from);
      }
      if (activeFilters.dateTo) {
        const to = new Date(activeFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.created_at || r.timestamp) <= to);
      }
      renderTableBody(filtered);
    }

    filterTest.addEventListener('change', () => { activeFilters.test = filterTest.value; applyFilters(); });
    filterDept.addEventListener('change', () => { activeFilters.dept = filterDept.value; applyFilters(); });
    filterResult.addEventListener('change', () => { activeFilters.result = filterResult.value; applyFilters(); });
    filterAnswerStatus.addEventListener('change', () => { activeFilters.answerStatus = filterAnswerStatus.value; applyFilters(); });
    filterDateFrom.addEventListener('change', () => { activeFilters.dateFrom = filterDateFrom.value; applyFilters(); });
    filterDateTo.addEventListener('change', () => { activeFilters.dateTo = filterDateTo.value; applyFilters(); });

    const debouncedUserFilter = debounce(() => { activeFilters.user = filterUser.value; applyFilters(); }, 300);
    filterUser.addEventListener('input', debouncedUserFilter);

    filterResetBtn.addEventListener('click', () => {
      activeFilters = { test: '', user: '', dept: '', result: '', answerStatus: '', dateFrom: '', dateTo: '' };
      filterTest.value = '';
      filterUser.value = '';
      filterDept.value = '';
      filterResult.value = '';
      filterAnswerStatus.value = '';
      filterDateFrom.value = '';
      filterDateTo.value = '';
      applyFilters();
    });

    const sortableHeaders = resultsContainer.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.sort;
        if (currentSortColumn === column) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortColumn = column;
          currentSortDirection = 'asc';
        }
        sortableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });

    applyFilters();
  }

  function openCommentModal(answerId, currentComment) {
    const modal = document.createElement('div');
    modal.className = 'tests-modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="tests-modal" style="max-width:500px;">
        <div class="tests-modal-header">
          <h3 class="tests-modal-title">💬 Комментарий к результату</h3>
          <button class="tests-modal-close comment-modal-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="tests-modal-body">
          <div class="tests-field-group">
            <label class="tests-field-label">Текст комментария</label>
            <textarea class="tests-textarea" id="commentModalText" style="min-height:150px;" placeholder="Введите комментарий...">${escapeHtml(currentComment)}</textarea>
          </div>
          <p style="font-size:12px;color:var(--ic-text-muted);margin:0;">Комментарий будет сохранён и отображён в таблице.</p>
        </div>
        <div class="tests-modal-footer">
          <button class="tests-modal-cancel-btn comment-cancel-btn">Отмена</button>
          <button class="tests-submit-btn comment-save-btn" style="padding:10px 20px;font-size:14px;">Сохранить</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    const saveComment = async () => {
      const newComment = modal.querySelector('#commentModalText').value.trim();
      const commentBtn = document.querySelector(`.comment-modal-btn[data-answer-id="${answerId}"]`);
      const oldText = commentBtn ? commentBtn.innerHTML : '';
      
      try {
        const response = await fetch(`/api/tests/answer/${answerId}/comment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: newComment })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Ошибка сохранения комментария');
        
        closeModal();
        showToast('Комментарий сохранён', 'success');
        
        if (commentBtn) {
          commentBtn.innerHTML = newComment ? '✏️ Редактировать' : '➕ Добавить';
          commentBtn.dataset.comment = newComment;
        }
      } catch (error) {
        showToast('Ошибка: ' + error.message, 'error');
        if (commentBtn) commentBtn.innerHTML = oldText;
      }
    };

    modal.querySelector('.comment-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.comment-cancel-btn').addEventListener('click', closeModal);
    modal.querySelector('.comment-save-btn').addEventListener('click', saveComment);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  function showSummaryModal(resultData) {
  const summary = resultData.result?.ai_summary;
  const test = resultData.test;
  const user = resultData.user || null;
  const isPublicSubmission = resultData.public_submission === true;
  const publicContact = resultData.public_contact || null;

  const recColors = { hire: 'var(--ic-green)', maybe: 'var(--ic-accent)', reject: 'var(--ic-red)' };
  const recLabels = { hire: 'Рекомендуем к найму', maybe: 'Требует дополнительной оценки', reject: 'Не рекомендуем' };
  const recColor = recColors[summary.recommendation] || 'var(--ic-text-muted)';
  const recLabel = recLabels[summary.recommendation] || summary.recommendation || '—';

  let employeeDisplay = '';
  if (isPublicSubmission) {
    const publicName = publicContact?.name || 'Аноним';
    const publicPhone = publicContact?.phone || '';
    employeeDisplay = `
      <div style="font-weight:600;font-size:14px;color:var(--ic-accent);">${escapeHtml(publicName)}</div>
      ${publicPhone ? `<div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">${escapeHtml(publicPhone)}</div>` : ''}
      <div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">Публичная отправка</div>
    `;
  } else {
    const employeeName = user?.user_name?.trim() || null;
    employeeDisplay = employeeName
      ? `<div style="font-weight:600;font-size:14px;">${escapeHtml(employeeName)}</div><div style="font-size:11px;color:var(--ic-text-muted);margin-top:2px;">${escapeHtml(resultData.chat_id || '')}</div>`
      : `<div style="font-weight:600;font-size:14px;">${escapeHtml(resultData.chat_id || '—')}</div>`;
  }

  const employeeDept = (!isPublicSubmission && user?.user_department?.trim()) ? user.user_department.trim() : null;

  resultModalTitle.textContent = `Итог: ${test?.title || 'Тест'}`;
  resultModalBody.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--ic-surface2);border-radius:var(--ic-radius-sm);flex-wrap:wrap;">
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">${isPublicSubmission ? 'Отправитель' : 'Сотрудник'}</div>
          ${employeeDisplay}
        </div>
        ${employeeDept ? `
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">Отдел</div>
          <div style="font-size:13px;">${escapeHtml(employeeDept)}</div>
        </div>` : ''}
        <div>
          <div style="font-size:12px;color:var(--ic-text-muted);margin-bottom:2px;">Результат</div>
          <div style="font-size:14px;font-weight:600;">${resultData.result?.score !== null && resultData.result?.score !== undefined ? resultData.result.score + '%' : '—'}</div>
        </div>
      </div>
      <div style="padding:16px;background:var(--ic-surface2);border:2px solid ${recColor};border-radius:var(--ic-radius);text-align:center;">
        <div style="font-size:18px;font-weight:700;color:${recColor};">${recLabel}</div>
        ${summary.verdict ? `<div style="font-size:13px;color:var(--ic-text-muted);margin-top:6px;">${escapeHtml(summary.verdict)}</div>` : ''}
      </div>
      <div style="padding:16px;background:var(--ic-surface2);border-radius:var(--ic-radius-sm);border:1px solid var(--ic-border);">
        <div style="font-size:12px;font-weight:600;color:var(--ic-text-muted);margin-bottom:8px;">ВЫВОД</div>
        <div style="font-size:14px;color:var(--ic-text);line-height:1.7;white-space:pre-wrap;">${escapeHtml(summary.summary)}</div>
      </div>
    </div>
  `;
  resultModal.style.display = 'flex';
}

  function closeResultModal() {
    resultModal.style.display = 'none';
  }

  resultModalClose.addEventListener('click', closeResultModal);
  resultModalCancel.addEventListener('click', closeResultModal);
  resultModal.addEventListener('click', (e) => { if (e.target === resultModal) closeResultModal(); });

  function switchTab(tabId) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tabId}`));
    if (tabId === 'existing') loadExistingTests();
    else if (tabId === 'results') loadAnalytics();
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  function generateQuestionId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  function createQuestion(type = 'open') {
    return {
      id: generateQuestionId(),
      text: '',
      type,
      options: [
        { id: generateQuestionId(), text: '', correct: false },
        { id: generateQuestionId(), text: '', correct: false }
      ],
      expanded: true
    };
  }

  function updateCountBadge() {
    const count = questions.length;
    questionsCountBadge.textContent = `${count} ${count === 1 ? 'вопрос' : count >= 2 && count <= 4 ? 'вопроса' : 'вопросов'}`;
    updateNotifyThresholdHint();
  }

  const questionsList = container.querySelector('#questionsList');

  function renderQuestions() {
    questionsList.innerHTML = '';
    if (questions.length === 0) { updateCountBadge(); return; }

    questions.forEach((question, index) => {
      const card = document.createElement('div');
      card.className = 'tests-question-card';
      card.dataset.qid = question.id;

      const preview = question.text.trim() || null;

      card.innerHTML = `
        <div class="tests-question-header">
          <div class="tests-question-header-left">
            <div class="tests-question-number">${index + 1}</div>
            <div class="tests-question-preview ${preview ? '' : 'empty'}">${escapeHtml(preview) || 'Новый вопрос'}</div>
          </div>
          <div class="tests-question-header-right">
            <span class="tests-question-type-badge">${question.type === 'open' ? 'Открытый' : question.type === 'single' ? 'Один ответ' : 'Несколько ответов'}</span>
            <button class="tests-question-delete-btn" data-delete="${question.id}" title="Удалить вопрос">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
            <svg class="tests-question-expand-icon ${question.expanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="tests-question-body ${question.expanded ? 'expanded' : ''}">
          <div class="tests-question-body-inner">
            <div class="tests-field-group">
              <label class="tests-field-label">Текст вопроса<span style="color:var(--ic-red);">*</span></label>
              <textarea class="tests-textarea" data-qfield="${question.id}" data-field="text" placeholder="Введите вопрос..." style="min-height:64px;">${escapeHtml(question.text)}</textarea>
            </div>
            <div class="tests-field-group">
              <label class="tests-field-label">Тип ответа</label>
              <select class="tests-select" data-qfield="${question.id}" data-field="type">
                <option value="open" ${question.type === 'open' ? 'selected' : ''}>Открытый ответ</option>
                <option value="single" ${question.type === 'single' ? 'selected' : ''}>Один правильный ответ</option>
                <option value="multiple" ${question.type === 'multiple' ? 'selected' : ''}>Несколько правильных ответов</option>
              </select>
            </div>
            <div class="tests-field-group" id="opts-${question.id}" ${question.type === 'open' ? 'style="display:none;"' : ''}>
              <label class="tests-field-label">Варианты ответов<span style="color:var(--ic-red);">*</span></label>
              <div class="tests-options-list" data-options="${question.id}">
                ${question.options.map(opt => renderOptionRow(question.id, opt)).join('')}
              </div>
              <button class="tests-add-option-btn" data-add-option="${question.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Добавить вариант
              </button>
            </div>
          </div>
        </div>
      `;

      questionsList.appendChild(card);
    });

    bindQuestionEvents();
    updateCountBadge();
  }

  function renderOptionRow(questionId, option) {
    return `
      <div class="tests-option-row" data-option-row="${option.id}">
        <button class="tests-option-correct-btn ${option.correct ? 'correct' : ''}"
                data-correct="${questionId}"
                data-optid="${option.id}"
                title="Отметить как правильный"></button>
        <input type="text"
               class="tests-option-input"
               data-ofield="${questionId}"
               data-optid="${option.id}"
               placeholder="Вариант ответа..."
               value="${escapeHtml(option.text)}">
        <button class="tests-option-remove-btn" data-remove-option="${questionId}" data-optid="${option.id}" title="Удалить вариант">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  function bindQuestionEvents() {
    container.querySelectorAll('.tests-question-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.tests-question-delete-btn')) return;
        const card = header.closest('.tests-question-card');
        const q = questions.find(q => q.id === card.dataset.qid);
        if (!q) return;
        q.expanded = !q.expanded;
        card.querySelector('.tests-question-body').classList.toggle('expanded', q.expanded);
        header.querySelector('.tests-question-expand-icon').classList.toggle('expanded', q.expanded);
      });
    });

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        questions = questions.filter(q => q.id !== btn.dataset.delete);
        renderQuestions();
        autoSaveTest();
      });
    });

    container.querySelectorAll('[data-qfield]').forEach(el => {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        const qid = el.dataset.qfield;
        const field = el.dataset.field;
        const q = questions.find(q => q.id === qid);
        if (!q) return;
        q[field] = e.target.value;

        if (field === 'text') {
          const card = container.querySelector(`[data-qid="${qid}"]`);
          if (card) {
            const preview = card.querySelector('.tests-question-preview');
            if (preview) {
              preview.textContent = e.target.value.trim() || 'Новый вопрос';
              preview.classList.toggle('empty', !e.target.value.trim());
            }
          }
        }

        if (field === 'type') {
          const card = container.querySelector(`[data-qid="${qid}"]`);
          if (card) {
            const badge = card.querySelector('.tests-question-type-badge');
            const optsBlock = card.querySelector(`#opts-${qid}`);
            if (badge) badge.textContent = e.target.value === 'open' ? 'Открытый' : e.target.value === 'single' ? 'Один ответ' : 'Несколько ответов';
            if (optsBlock) optsBlock.style.display = e.target.value === 'open' ? 'none' : '';
          }
          if (e.target.value === 'single') {
            const firstCorrect = q.options.find(o => o.correct);
            q.options.forEach(o => { o.correct = false; });
            if (firstCorrect) firstCorrect.correct = true;
            const optContainer = container.querySelector(`[data-options="${qid}"]`);
            if (optContainer) {
              optContainer.innerHTML = q.options.map(opt => renderOptionRow(qid, opt)).join('');
              bindOptionEvents();
            }
          }
        }
        autoSaveTest();
      });
    });

    container.querySelectorAll('[data-add-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.addOption;
        const q = questions.find(q => q.id === qid);
        if (!q) return;
        const newOpt = { id: generateQuestionId(), text: '', correct: false };
        q.options.push(newOpt);
        const optContainer = container.querySelector(`[data-options="${qid}"]`);
        if (optContainer) {
          const row = document.createElement('div');
          row.innerHTML = renderOptionRow(qid, newOpt);
          optContainer.appendChild(row.firstElementChild);
          bindOptionEvents();
        }
        autoSaveTest();
      });
    });

    bindOptionEvents();
  }

  function bindOptionEvents() {
    container.querySelectorAll('[data-correct]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.correct;
        const optId = btn.dataset.optid;
        const q = questions.find(q => q.id === qid);
        if (!q) return;

        if (q.type === 'single') {
          q.options.forEach(o => { o.correct = o.id === optId; });
          const optContainer = container.querySelector(`[data-options="${qid}"]`);
          if (optContainer) {
            optContainer.querySelectorAll('[data-correct]').forEach(b => {
              b.classList.toggle('correct', b.dataset.optid === optId);
            });
          }
        } else {
          const opt = q.options.find(o => o.id === optId);
          if (opt) {
            opt.correct = !opt.correct;
            btn.classList.toggle('correct', opt.correct);
          }
        }
        autoSaveTest();
      });
    });

    container.querySelectorAll('[data-ofield]').forEach(input => {
      input.addEventListener('input', (e) => {
        const qid = input.dataset.ofield;
        const optId = input.dataset.optid;
        const q = questions.find(q => q.id === qid);
        if (!q) return;
        const opt = q.options.find(o => o.id === optId);
        if (opt) opt.text = e.target.value;
        autoSaveTest();
      });
    });

    container.querySelectorAll('[data-remove-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.removeOption;
        const optId = btn.dataset.optid;
        const q = questions.find(q => q.id === qid);
        if (!q || q.options.length <= 2) return;
        q.options = q.options.filter(o => o.id !== optId);
        const row = container.querySelector(`[data-option-row="${optId}"]`);
        if (row) row.remove();
        autoSaveTest();
      });
    });
  }

  cancelEditBtn.addEventListener('click', cancelEdit);

  addQuestionBtn.addEventListener('click', () => {
    questions.push(createQuestion('open'));
    renderQuestions();
    const scroll = container.querySelector('#createFormScroll');
    if (scroll) setTimeout(() => scroll.scrollTop = scroll.scrollHeight, 50);
    autoSaveTest();
  });

  submitTestBtn.addEventListener('click', async () => {
    const title = testTitleInput.value.trim();
    const body = testBodyInput.value.trim();
    const test_type = testTypeSelect.value;

    if (!title) {
      showToast('Укажите название теста', 'error');
      testTitleInput.focus();
      return;
    }

    if (questions.length === 0) {
      showToast('Добавьте хотя бы один вопрос', 'error');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        showToast(`Вопрос ${i + 1}: введите текст вопроса`, 'error');
        q.expanded = true;
        renderQuestions();
        return;
      }
      if (q.type !== 'open') {
        const filledOptions = q.options.filter(o => o.text.trim());
        if (filledOptions.length < 2) {
          showToast(`Вопрос ${i + 1}: минимум 2 варианта ответа`, 'error');
          q.expanded = true;
          renderQuestions();
          return;
        }
        if (!q.options.some(o => o.correct)) {
          showToast(`Вопрос ${i + 1}: отметьте правильный ответ`, 'error');
          q.expanded = true;
          renderQuestions();
          return;
        }
      }
    }

    const aiEnabled = aiCheckToggle.checked;
    if (aiEnabled && !aiPrompt) {
      showToast('Включена AI-проверка — добавьте промпт', 'error');
      openPromptModal();
      return;
    }

    const aiDetectEnabled = aiDetectToggle.checked;
    if (aiDetectEnabled && !aiDetectSettings.prompt) {
      showToast('Включена проверка AI-ответов — добавьте промпт', 'error');
      openAiDetectModal();
      return;
    }

    submitTestBtn.disabled = true;
    submitTestBtn.classList.add('loading');
    const originalText = submitBtnText.textContent;
    submitBtnText.textContent = isEditMode ? 'Обновление...' : 'Сохранение...';

    try {
    const test_settings = {
      ai_check: {
        enabled: aiEnabled,
        prompt: aiEnabled ? aiPrompt : null,
        points_per_question: pointsPerQuestion,
        summary_enabled: aiEnabled ? summaryEnabled : false,
        summary_prompt: aiEnabled && summaryEnabled ? summaryPrompt : null
      },
      notify: notifySettings.enabled ? notifySettings : { enabled: false },
      ai_detect: aiDetectEnabled ? aiDetectSettings : { enabled: false },
      show_ai_analysis: showAiAnalysisToggle.checked,
      multi_attempt: multiAttemptToggle.checked,
      timer_seconds: timerToggle.checked ? timerValue : null,
      timer_mode: timerToggle.checked ? timerMode : null,
      timer_warning_seconds: (timerToggle.checked && timerMode === 'global') ? warningSeconds : null,
      randomize_questions: randomizeToggle.checked,
      send_notification: sendNotificationToggle.checked,
      notification_message: notificationMessage,
      public_access: publicAccessToggle.checked
    };

      const recipientsPayload = (!publicAccessToggle.checked && accessToggle.checked && (selectedDepartments.size > 0 || selectedTeams.size > 0))
        ? { departments: [...selectedDepartments], teams: [...selectedTeams] }
        : 'all';

      const payload = {
        title,
        body: body || null,
        images: descriptionImages.map(img => img.url),
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.type === 'open' ? [] : q.options.filter(o => o.text.trim()).map(o => ({
            id: o.id,
            text: o.text,
            correct: o.correct
          }))
        })),
        test_type: test_type || null,
        test_settings,
        manager_chat_id: chatId || null,
        recipients: recipientsPayload
      };

      if (isEditMode) {
        payload.recipients_changed = recipientsChanged;
        await updateTest(editingTestId, payload);
        showToast('Тест успешно обновлён!', 'success');
        cancelEdit();
      } else {
        payload.send_notifications = recipientsTouched;
        const result = await createTest(payload);
        showToast(`Тест создан${recipientsTouched ? `, уведомлено ${result.notified ?? 0} пользователей` : ''}`, 'success');

        testTitleInput.value = '';
        testBodyInput.value = '';
        testTypeSelect.value = '';
        aiCheckToggle.checked = false;
        editPromptBtn.style.visibility = 'hidden';
        aiPrompt = '';
        pointsPerQuestion = 10;
        pointsPerQuestionInput.value = 10;
        questions = [];
        summaryEnabled = false;
        summaryPrompt = '';
        timerToggle.checked = false;
        randomizeToggle.checked = false;
        sendNotification = true;
        sendNotificationToggle.checked = true;
        editNotificationMsgBtn.style.visibility = 'visible';
        notificationMessage = '📝 Доступен новый тест!\n\n*Название теста*\n\nНажмите на кнопку ниже, чтобы начать:';
        publicAccess = false;
        publicAccessToggle.checked = false;
        descriptionImages.length = 0;
        renderDescriptionThumbnails();
        renderQuestions();
        resetNotifySettings();
        resetAiDetectSettings();
        resetAccessSettings();
        updateNotifyThresholdHint();
      }

      switchTab('existing');
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      submitTestBtn.disabled = false;
      submitTestBtn.classList.remove('loading');
      submitBtnText.textContent = originalText;
    }
  });

  function renderDescriptionThumbnails() {
    descriptionThumbnails.innerHTML = '';
    if (!descriptionImages.length) {
      descriptionThumbnails.style.display = 'none';
      return;
    }

    descriptionThumbnails.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;';

    descriptionImages.forEach((image, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'tests-description-thumbnail';
      thumb.style.position = 'relative';

      const img = document.createElement('img');
      img.src = image.url;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.addEventListener('click', (e) => { e.stopPropagation(); openImageModal(image.url); });

      const removeBtn = document.createElement('button');
      removeBtn.style.cssText = 'position:absolute;top:4px;right:4px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);border:none;border-radius:50%;color:white;font-size:15px;cursor:pointer;line-height:1;padding:0;';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        descriptionImages.splice(index, 1);
        renderDescriptionThumbnails();
        autoSaveTest();
      });

      thumb.appendChild(img);
      thumb.appendChild(removeBtn);
      descriptionThumbnails.appendChild(thumb);
    });
  }

  function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'tests-image-modal';
    modal.innerHTML = `
      <div class="tests-image-modal-content">
        <img src="${imageUrl}" alt="Полный размер" />
        <button class="tests-image-modal-close">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.className === 'tests-image-modal-close') modal.remove();
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Пожалуйста, выберите изображение', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Размер файла не должен превышать 10MB', 'error');
      return;
    }

    descriptionImageLabel.style.opacity = '0.5';
    descriptionImageLabel.style.pointerEvents = 'none';

    try {
      const formData = new FormData();
      formData.append('file', file);

      let response;
      try {
        response = await fetch('/api/tests/upload-image', { method: 'POST', body: formData });
      } catch {
        throw new Error('Нет соединения с сервером');
      }

      if (!response.ok) {
        const text = await response.text();
        let msg = `Ошибка сервера (${response.status})`;
        try { const parsed = JSON.parse(text); if (parsed.error) msg = parsed.error; } catch {}
        throw new Error(msg);
      }

      let result;
      try { result = await response.json(); } catch { throw new Error('Некорректный ответ сервера'); }

      if (!result.success) throw new Error(result.error || 'Ошибка загрузки изображения');
      if (!result.viewLink) throw new Error('Сервер не вернул ссылку на изображение');

      descriptionImages.push({ url: result.viewLink });
      renderDescriptionThumbnails();
      showToast('Изображение добавлено', 'success');
      autoSaveTest();
    } catch (error) {
      showToast('Ошибка загрузки: ' + error.message, 'error');
    } finally {
      descriptionImageLabel.style.opacity = '';
      descriptionImageLabel.style.pointerEvents = '';
      e.target.value = '';
    }
  }

  function init() {
    renderQuestions();
    descriptionImageInput.addEventListener('change', handleImageUpload);
    updateNotifyThresholdHint();
    editNotificationMsgBtn.style.visibility = sendNotificationToggle.checked ? 'visible' : 'hidden';
    setupRealtimeUpdates();

    const warningSecondsField = document.getElementById('warningSeconds');
    if (warningSecondsField) {
      warningSecondsField.value = warningSeconds;
    }
  }

  init();

  return {
    cleanup() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (descriptionImageInput?.parentNode) {
        descriptionImageInput.parentNode.removeChild(descriptionImageInput);
      }
      container.innerHTML = '';
    }
  };
}