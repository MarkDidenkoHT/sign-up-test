export async function loadModule(container, { chatId, userData }) {

const DEFAULT_ANGLES = [
  {
    id: 'a1',
    text: 'Начни с самой неожиданной характеристики — не самой главной по названию товара, а той, которую покупатель не догадается спросить, но которая меняет опыт использования. Раскрой её в первом абзаце через конкретную ситуацию. Остальные характеристики вплетай по ходу, не отдельными блоками.'
  },
  {
    id: 'a2',
    text: 'Первый абзац — только цифры и действия, ни одного прилагательного. Второй абзац — что эти цифры означают в связке друг с другом, не по отдельности. Третий — кому этот товар подойдёт лучше, чем похожие варианты, и почему именно эти характеристики делают его таким выбором.'
  },
  {
    id: 'a3',
    text: 'Построй текст вокруг одного сценария использования — конкретного момента, а не абстрактной "повседневной жизни". Характеристики появляются в тексте тогда, когда они нужны этому сценарию, не раньше. Последний абзац выходит за рамки сценария и говорит о том, для каких условий или людей этот товар работает лучше всего.'
  },
  {
    id: 'a4',
    text: 'Начни с ограничения или компромисса, который этот товар снимает — не с того, что он умеет, а с того, чего покупателю больше не придётся делать или терпеть. Второй абзац объясняет какие характеристики за этим стоят. Третий — в каких условиях эксплуатации это особенно заметно.'
  },
  {
    id: 'a5',
    text: 'Раздели характеристики на две группы сам: те, что работают сразу и заметны с первого дня, и те, что оцениваешь только через месяц. Первый абзац — про первые, второй — про вторые. Третий абзац связывает обе группы в общую картину того, для кого этот товар станет правильным выбором.'
  }
];

  const DEFAULT_TAGS_PROMPT = `Ты генерируешь теги для карточки товара в интернет-магазине. Теги — это не пересказ характеристик. Это то, что покупатель мог бы искать или что помогает ему быстро понять, подходит ли товар именно ему.

ПРАВИЛА:
- Для каждой характеристики выбирай ТОЛЬКО из допустимых тегов ниже — любое другое слово или число запрещено
- Не дублируй одинаковые теги
- Ответ: только теги через запятую, без пояснений

`;

  const VALIDATION_SYSTEM_PROMPT = `Ты корректор текста для интернет-магазина. Текст описания товара был сгенерирован автоматически и может содержать два типа ошибок — исправь их.

ТИПЫ ОШИБОК:
1. Слова или фразы на иностранных языках (китайский, английский и др.) вместо русских — замени их точным русским эквивалентом по контексту
2. Несуществующие или искажённые русские слова — замени их подходящим словом по контексту предложения

СОХРАНЯЙ БЕЗ ИЗМЕНЕНИЙ:
- Технические аббревиатуры и единицы измерения (Wi-Fi, USB, HDMI, кВт·ч, dB, IP67 и т.п.)
- Названия брендов
- Коды товаров

ВАЖНО:
- Меняй ТОЛЬКО ошибочные слова, всё остальное оставляй дословно
- Не переписывай, не улучшай, не сокращай и не дополняй текст
- Верни ПОЛНЫЙ текст целиком, исправив только ошибочные слова, без пояснений и комментариев`;

  function loadAngles() {
    return DEFAULT_ANGLES.map(a => ({ ...a }));
  }

  function buildForeignWordAllowlist(product) {
    
    const allowed = new Set();

    const codeTokens = (product.code || '').split(/[\s\-_\/]+/);
    codeTokens.forEach(t => { if (t) allowed.add(t.toLowerCase()); });

    const nameWords = (product.name || '').match(/[A-Za-z0-9\-_]+/g) || [];
    nameWords.forEach(w => allowed.add(w.toLowerCase()));

    const ALWAYS_ALLOWED = [
      'wi-fi','wifi','usb','hdmi','vga','dvi','lan','wan','nfc','gps','gsm','lte',
      'led','lcd','oled','qled','ips','va','tn','4k','8k','hd','fhd','uhd','sdr','hdr',
      'amd','intel','nvidia','qualcomm','mediatek','arm',
      'ip67','ip68','ip65','ip54','ip44',
      'ac','dc','hz','khz','mhz','ghz','db','dba','kwh','wh','ah','mah','rpm',
      'anc','tws','aptx','aac','sbc','ldac',
      'pc','cpu','gpu','ram','rom','ssd','hdd','nvme','sata','pcie',
      'ok','plus','pro','max','mini','ultra','lite','air','x',
      'smart','tv','dvb','dvb-t2','dvb-s2','dvb-c',
      'rgb','cmyk',
    ];
    ALWAYS_ALLOWED.forEach(w => allowed.add(w));

    Object.values(product.features || {}).forEach(val => {
      const tokens = String(val).match(/[A-Za-z][A-Za-z0-9\-_]*/g) || [];
      tokens.forEach(t => allowed.add(t.toLowerCase()));
    });

    return allowed;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function detectForeignWords(text, allowlist) {
    const suspicious = [];

    const cjkMatches = text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9fff\uac00-\ud7af]+/g);
    if (cjkMatches) {
      cjkMatches.forEach(m => suspicious.push({ word: m, type: 'cjk' }));
    }

    const latinTokens = text.match(/[A-Za-z][A-Za-z0-9\-_']{1,}/g) || [];
    latinTokens.forEach(token => {
      const lower = token.toLowerCase();
      if (!allowlist.has(lower)) {
        suspicious.push({ word: token, type: 'latin' });
      }
    });

    const seen = new Set();
    return suspicious.filter(s => {
      if (seen.has(s.word)) return false;
      seen.add(s.word);
      return true;
    });
  }

  container.innerHTML = `
    <div class="seo-module-wrapper">

      <div class="seo-module-left">
        <div class="seo-module-card">
          <div class="seo-module-card-header"><h3>Источник данных</h3></div>
          <div class="seo-module-card-body">
            <div class="seo-module-csv-drop" id="csvDropZone">
              <input type="file" id="csvFileInput" accept=".csv">
              <div id="csvDropLabel">
                <div style="font-size:22px; margin-bottom:6px;">📄</div>
                <div>Перетащите CSV или нажмите для выбора</div>
              </div>
            </div>
          </div>
        </div>

        <div class="seo-module-card" id="seoStatsCard" style="display:none;">
          <div class="seo-module-card-header"><h3>Статистика</h3></div>
          <div class="seo-module-card-body">
            <div class="seo-module-stats">
              <div class="seo-module-stat-row">
                <span class="seo-module-stat-label">Всего</span>
                <span id="statTotal" class="seo-module-stat-value">—</span>
              </div>
              <div class="seo-module-stat-row">
                <span class="seo-module-stat-label">С описанием</span>
                <span id="statWith" class="seo-module-stat-value green">—</span>
              </div>
              <div class="seo-module-stat-row">
                <span class="seo-module-stat-label">Без описания</span>
                <span id="statWithout" class="seo-module-stat-value yellow">—</span>
              </div>
              <div class="seo-module-stat-row">
                <span class="seo-module-stat-label">Характеристик</span>
                <span id="statFeatures" class="seo-module-stat-value">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="seo-module-main">
        <div class="seo-tabs-nav">
          <button class="seo-tab-btn active" data-tab="catalog">Каталог</button>
          <button class="seo-tab-btn" data-tab="generate">Генерация текста</button>
        </div>

        <div class="seo-tab-content active" id="tab-catalog">
          <div class="seo-module-table-wrapper">
            <div class="seo-module-loading-overlay" id="seoTableOverlay">
              <div class="seo-module-spinner-dark"></div>
              <div class="seo-module-loading-overlay-text" id="seoTableOverlayText">Обработка CSV...</div>
            </div>
            <div class="seo-module-table-container">
              <table class="seo-module-table">
                <thead id="seoTableHead">
                  <tr>
                    <th style="position:sticky;left:0;z-index:11;background:var(--seo-surface2);">Код</th>
                    <th>Название</th>
                    <th>В наличии</th>
                    <th>Есть описание</th>
                  </tr>
                </thead>
                <tbody id="seoTableBody">
                  <tr><td colspan="4"><div class="seo-module-empty-state">Загрузите CSV-файл для отображения данных</div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="seo-tab-content" id="tab-generate">
          <div class="gen-layout">

            <div class="gen-products-panel">
              <div class="gen-products-header">
                Товары <span id="genSelectedCount">0 / 0</span>
                <div class="gen-select-toolbar">
                  <button id="genSelectAll">Все</button>
                  <button id="genSelectNone">Сбросить</button>
                </div>
              </div>
              <input type="text" class="gen-product-search" id="genProductSearch" placeholder="Поиск товара...">
              <div class="gen-product-list" id="genProductList">
                <div style="padding:20px; text-align:center; color:var(--seo-text-muted); font-size:12px;">Загрузите CSV для отображения товаров</div>
              </div>
            </div>

            <div class="gen-center">
              <div class="gen-prompt-area">
                <div class="gen-prompt-header" id="genPromptHeader">
                  <span>Промпт</span>
                  <button class="gen-prompt-toggle" id="genPromptToggle">▲ Свернуть</button>
                </div>
                <div class="gen-prompt-body" id="genPromptBody">
                  <div style="display:flex; flex-direction:column;">

                  <div class="prompt-block" id="promptDescriptionBlock">
                    <div class="prompt-block-header">Инструкция (системный промпт)</div>
                    <textarea class="gen-prompt-textarea" id="genPrompt" style="min-height:260px;max-height:500px;">
                    
Ты — AEO-копирайтер интернет-магазина hi-tech.md (Приднестровье). 
Твоя задача — написать описание товара, оптимизированное для Answer 
Engine Optimisation: текст должен помочь AI-ассистентам (ChatGPT, 
Perplexity, Gemini и др.) точно извлечь характеристики товара и 
порекомендовать его в ответ на конкретный запрос покупателя.

В РЕЗУЛЬТАТЕ МНЕ НУЖЕН ТОЛЬКО ГОТОВЫЙ ТЕКСТ КОТОРЫЙ БУДЕТ НАПРЯМУЮ 
ИМПОРТИРОВАН НА САЙТ. НИКАКОГО "Хорошо, мне нужно написать описание для"

ПРАВИЛА:
- Используй ТОЛЬКО характеристики из запроса — не придумывай значения
- Числа и единицы измерения передавай ТОЧНО как в данных
- Целевой объём: 250-300 слов
- Без списков, текст связный и естественный
- Не начинай с названия товара
- Пиши на русском языке
- Каждая характеристика должна появиться в тексте ровно один раз
- Характеристики не разбирай по одной — переплетай в связный текст

ЧЕГО НЕ ДЕЛАТЬ — если хоть одно из этого есть, текст не годится:
- Первое предложение называет тип товара ("Этот холодильник", 
  "Данный ноутбук", "Этот пылесос" и т.п.)
- Последний абзац начинается с "Подходит для", "Предназначен для", 
  "Станет хорошим выбором"
- Глагол "позволяет" встречается больше одного раза
- Три предложения подряд одинаковой длины
- Последний абзац повторяет смыслы из предыдущих абзацев
- Очевидные выводы которые покупатель сделает сам без подсказки

ЗАПРЕЩЕНО:
- Упоминания цен, валют, стоимостей, тарифов, гарантий, акций, скидок
- Слова: "идеальный", "превосходный", "инновационный", 
  "революционный", "непревзойдённый", "сочетает", "объединяет", 
  "предлагает баланс"
- Связки: "при этом", "а значит", "тем самым", "таким образом", 
  "в результате", "благодаря этому"
- Начало текста с: "Для тех, кто", "Если вы ищете", "В мире", 
  "В современном мире", "Этот товар", "Представляем", 
  "Отличный выбор", "Идеальное решение"
- Первое слово — не местоимение, не союз, не "Для", не "Этот", 
  не "Данный"
- Фраза "хватит для семьи из X человек" или любой её вариант
                
                </textarea>
                  </div>

                  <div class="prompt-block" id="promptAnglesBlock" style="display:none;">
                    <div class="prompt-block-header" style="display:flex;align-items:center;justify-content:space-between;">
                      <span>Углы подачи</span>
                      <span style="font-size:10px;color:var(--seo-text-muted);font-weight:400;text-transform:none;letter-spacing:0;">Случайный угол добавляется к промпту перед каждой генерацией</span>
                    </div>
                    <div style="padding:10px 14px 4px;">
                      <div class="angle-list" id="angleList"></div>
                      <button class="angle-add-btn" id="angleAddBtn">+ Добавить угол</button>
                    </div>
                  </div>

                  <div class="prompt-block" id="promptTagsBlock" style="display:none;">
                    <div class="prompt-block-header">Промпт тегов</div>
                    <textarea class="gen-prompt-textarea" id="tagsSystemPrompt" style="min-height:180px;max-height:340px;"></textarea>
                    <div class="prompt-block-header" style="border-top:1px solid var(--seo-border);">Примеры тегов по характеристикам</div>
                    <div style="padding:0 14px 4px;font-size:10px;color:var(--seo-text-muted);line-height:1.5;">Количество тегов должно равняться количеству выбранных характеристик. Укажите 2-3 варианта тега для каждой.</div>
                    <div id="tagsFeatureExamplesContainer" style="padding:12px 14px;background:var(--seo-surface2);border-radius:var(--seo-radius-sm);border:1px solid var(--seo-border);margin:10px 0;">
                      <div style="text-align:center;color:var(--seo-text-muted);font-size:12px;padding:20px;">Выберите характеристики в левой панели</div>
                    </div>
                    <div style="padding:0 14px 10px;">
                      <button class="angle-add-btn" id="tagsResetBtn">↺ Сбросить примеры</button>
                    </div>
                  </div>

                  <div style="padding:6px 14px 10px;">
                    <div style="font-size:10px;color:var(--seo-text-muted);line-height:1.5;">
                      Mistral получит: <em>системный промпт</em> → инструкция, <em>сообщение</em> → название, код и выбранные характеристики товара.
                    </div>
                  </div>

                </div>
                </div>
              </div>

              <div class="gen-controls-bar">
                <button class="gen-btn gen-btn-primary" id="genStartBtn" disabled>
                  ▶ Сгенерировать
                </button>
                <button class="gen-btn gen-btn-danger" id="genStopBtn" style="display:none;">
                  ■ Остановить
                </button>
                <button class="gen-btn" id="genEditTagsBtn" style="display:none;">
                  ✎ Редактировать теги
                </button>
                <button class="gen-btn" id="genDownloadBtn" style="display:none;">
                  ⬇ Скачать CSV
                </button>
                <button class="gen-btn" id="genDownloadXlsxBtn" style="display:none;">
                  ⬇ Скачать Excel
                </button>
                <span class="gen-progress-text" id="genProgressText"></span>
              </div>

              <div class="gen-results" id="genResults">
              </div>
            </div>

          </div>
        </div>
      </div>

      <div class="seo-module-right">
        <h2 class="seo-module-right-title">Настройки</h2>

        <div class="seo-module-settings-block">
          <div class="seo-module-settings-header" id="settingsFiltersHeader">
            <h3>Фильтры</h3>
            <svg class="seo-module-expand-icon expanded" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="seo-module-settings-content expanded" id="settingsFiltersContent">
            <label class="seo-toggle-label">
              <input type="checkbox" id="filterOutOfStock">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Скрыть нет в наличии
            </label>
            <label class="seo-toggle-label">
              <input type="checkbox" id="filterHasDesc">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Скрыть с описанием
            </label>
          </div>
        </div>

        <div class="seo-module-settings-block">
          <div class="seo-module-settings-block">
          <div class="seo-module-settings-header" id="settingsAnglesHeader">
            <h3>Генерация</h3>
            <svg class="seo-module-expand-icon expanded" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="seo-module-settings-content expanded" id="settingsAnglesContent">
            <label class="seo-toggle-label">
              <input type="checkbox" id="generateDescription">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Генерировать описание
            </label>
            <label class="seo-toggle-label" id="toggleAnglesLabel">
              <input type="checkbox" id="useAngles">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Случайный угол подачи
            </label>
            <label class="seo-toggle-label">
              <input type="checkbox" id="generateTags">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Генерировать теги
            </label>
            <label class="seo-toggle-label disabled" id="toggleAllFeaturesLabel">
              <input type="checkbox" id="tagsAllFeatures" disabled>
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Все характеристики в теги
            </label>
            <label class="seo-toggle-label" id="toggleCheckLabel">
              <input type="checkbox" id="performCheck">
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Выполнять проверку
            </label>
            <label class="seo-toggle-label disabled" id="toggleAiCheckLabel">
              <input type="checkbox" id="performAiCheck" disabled>
              <span class="seo-toggle-switch">
                <span class="seo-toggle-switch-track"></span>
                <span class="seo-toggle-switch-thumb"></span>
              </span>
              Выполнять ИИ проверку
            </label>
          </div>
        </div>

        <div class="seo-module-settings-block">
          <div class="seo-module-settings-header" id="settingsFeaturesHeader">
            <h3>Характеристики</h3>
            <svg class="seo-module-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="seo-module-settings-content" id="settingsFeaturesContent">
            <div id="featuresPanel">
              <div class="seo-features-empty">Загрузите CSV-файл, чтобы увидеть доступные характеристики.</div>
            </div>
          </div>
        </div>

      </div>

    </div>
    <div class="seo-module-toast-container" id="seoToastContainer"></div>

    <div class="tags-modal-backdrop" id="tagsModalBackdrop" style="display:none;">
      <div class="tags-modal">
        <div class="tags-modal-header">
          <h2 class="tags-modal-title">Редактирование тегов</h2>
          <button class="tags-modal-close" id="tagsModalClose">✕</button>
        </div>
        <div class="tags-modal-body">
          <div class="tags-modal-left">
            <div class="tags-modal-panel-header">
              <span>Уникальные теги</span>
              <span id="tagsModalCount" style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;"></span>
            </div>
            <div class="tags-modal-edit-area">
              <input type="text" class="tags-modal-edit-input" id="tagsModalEditInput" placeholder="Выберите тег для редактирования..." disabled>
              <div class="tags-modal-edit-hint" id="tagsModalEditHint"></div>
              <div class="tags-modal-edit-actions">
                <button id="tagsModalApplyBtn" disabled>✓ Применить</button>
                <button id="tagsModalDeleteBtn" class="danger" disabled>✕ Удалить</button>
              </div>
            </div>
            <div style="padding:6px 12px 0;">
              <input type="text" class="tags-modal-search" id="tagsModalSearch" placeholder="Поиск тега...">
            </div>
            <div class="tags-modal-tag-list" id="tagsModalTagList"></div>
          </div>

          <div class="tags-modal-middle">
            <div class="tags-modal-panel-header">
              <span>Характеристики</span>
              <input type="text" class="tags-modal-search" id="tagsModalFeatureSearch" placeholder="Поиск..." style="max-width:120px;font-size:11px;padding:3px 8px;">
            </div>
            <div class="tags-modal-feature-list" id="tagsModalFeatureList"></div>
          </div>

          <div class="tags-modal-right">
            <div class="tags-modal-panel-header">
              <span>Товары и их теги</span>
              <input type="text" class="tags-modal-search" id="tagsModalProductSearch" placeholder="Поиск товара..." style="max-width:160px;font-size:11px;padding:3px 8px;">
            </div>
            <div class="tags-modal-product-list" id="tagsModalProductList"></div>
          </div>

          <div class="tags-modal-product-edit">
            <div class="tags-modal-panel-header" id="productEditHeader">
              <span>Редактирование товара</span>
            </div>
            <div class="tags-modal-product-edit-body" id="tagsModalProductEditBody"></div>
          </div>
        </div>
        <div class="tags-modal-footer">
          <span class="tags-modal-footer-info" id="tagsModalFooterInfo"></span>
          <button class="gen-btn gen-btn-primary" id="tagsModalDoneBtn">Готово</button>
        </div>
      </div>
    </div>
  `;

  const state = {
    allProducts: [],
    allFeatureKeys: [],
    visibleFeatures: new Set(),
    filters: {
      hideOutOfStock: false,
      hideNoDescription: false
    },
    settings: {
      delaySeconds: 5,
      generateDescription: localStorage.getItem('seo_generate_description') !== 'false',
      generateTags: localStorage.getItem('seo_generate_tags') === 'true',
      tagsAllFeatures: localStorage.getItem('seo_tags_all_features') === 'true',
      useAngles: localStorage.getItem('seo_use_angles') === 'true',
      performCheck: localStorage.getItem('seo_perform_check') === 'true',
      performAiCheck: localStorage.getItem('seo_perform_ai_check') === 'true'
      },
    angles: loadAngles()
  };

  const genState = {
    selectedCodes: new Set(),
    results: {},
    isRunning: false,
    abortFlag: false,
    searchQuery: ''
  };

  function saveSettings() {
    localStorage.setItem('seo_generate_description', state.settings.generateDescription.toString());
    localStorage.setItem('seo_generate_tags', state.settings.generateTags.toString());
    localStorage.setItem('seo_tags_all_features', state.settings.tagsAllFeatures.toString());
    localStorage.setItem('seo_use_angles', state.settings.useAngles.toString());
    localStorage.setItem('seo_perform_check', state.settings.performCheck.toString());
    localStorage.setItem('seo_perform_ai_check', state.settings.performAiCheck.toString());
  }

  function getTagsSystemPrompt() {
    const base = document.getElementById('tagsSystemPrompt').value.trim();
    const examples = buildTagExamplesFromUI();
    if (!examples) return base;
    return base + '\n\nДОПУСТИМЫЕ ТЕГИ (только эти значения, никаких других):\n' + examples + '\n\nЗАПРЕЩЕНО: использовать числа, единицы измерения или любые слова не из списка выше.';
  }

  function updateCheckEditorState() {
    const aiCheckLabel = document.getElementById('toggleAiCheckLabel');
    const aiCheckInput = document.getElementById('performAiCheck');

    if (state.settings.performCheck) {
      if (aiCheckLabel) aiCheckLabel.classList.remove('disabled');
      if (aiCheckInput) aiCheckInput.disabled = false;
    } else {
      if (aiCheckLabel) aiCheckLabel.classList.add('disabled');
      if (aiCheckInput) {
        aiCheckInput.disabled = true;
        if (state.settings.performAiCheck) {
          state.settings.performAiCheck = false;
          aiCheckInput.checked = false;
          saveSettings();
        }
      }
    }
  }

  function buildTagExamplesFromUI() {
    const container = document.getElementById('tagsFeatureExamplesContainer');
    if (!container) return '';

    const items = container.querySelectorAll('.tags-feature-example-item');
    if (!items.length) return '';

    const examples = [];
    items.forEach(item => {
      const featureName = item.querySelector('.tags-feature-example-name');
      const tagsInput = item.querySelector('.tags-feature-example-input');
      if (featureName && tagsInput) {
        const feature = featureName.textContent.trim();
        const tags = tagsInput.value.trim();
        if (tags) {
          examples.push(`${feature} → ${tags}`);
        }
      }
    });

    return examples.join('\n');
  }

  function renderTagsFeatureExamples() {
    const container = document.getElementById('tagsFeatureExamplesContainer');
    if (!container) return;

    const selectedFeatures = getSelectedProductsFeatures();

    if (!selectedFeatures.length) {
      container.innerHTML = `<div style="text-align:center;color:var(--seo-text-muted);font-size:12px;padding:20px;">Выберите характеристики в левой панели</div>`;
      return;
    }

    container.innerHTML = selectedFeatures.map(feature => {
      const variants = getFeatureVariants(feature);
      const variantsHint = variants.slice(0, 3).join(', ');
      return `
        <div class="tags-feature-example-item">
          <div class="tags-feature-example-header">
            <span class="tags-feature-example-name">${feature}</span>
            <span class="tags-feature-example-hint">${variantsHint || '—'}</span>
          </div>
          <input type="text" class="tags-feature-example-input" placeholder="тег, тег, тег" data-feature="${feature}">
        </div>`;
    }).join('');

    container.querySelectorAll('.tags-feature-example-input').forEach(input => {
      input.addEventListener('input', () => {
      });
    });
  }

  function showToast(message, type = 'loading') {
    const c = document.getElementById('seoToastContainer');
    const t = document.createElement('div');
    t.className = `seo-module-toast ${type}`;
    t.textContent = message;
    c.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'seo-slideIn 0.3s reverse';
      setTimeout(() => t.parentNode?.removeChild(t), 300);
    }, 3000);
  }

  function setOverlay(visible) {
    document.getElementById('seoTableOverlay').classList.toggle('active', visible);
  }

  function parseCsvRow(line) {
    const cols = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        cols.push(val);
        if (line[i] === ';') i++;
      } else {
        let val = '';
        while (i < line.length && line[i] !== ';') val += line[i++];
        cols.push(val.trim());
        if (line[i] === ';') i++;
      }
    }
    return cols;
  }

  function parseCsvFeatures(featuresStr) {
    const result = {};
    if (!featuresStr) return result;
    featuresStr.split(/;\s+/).forEach(part => {
      const match = part.trim().match(/^(.+?):\s*[A-Za-zА-Яа-яЁё]\[(.+)\]$/);
      if (match) result[match[1].trim()] = match[2].trim();
    });
    return result;
  }

  function parseCsv(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const header = parseCsvRow(lines[0]);

    const idx = {
      code: header.indexOf('Product code'),
      name: header.indexOf('Product name'),
      qty: header.indexOf('Quantity'),
      desc: header.indexOf('Description'),
      url: header.indexOf('Product URL'),
      features: header.indexOf('Features')
    };

    const allFeatureKeysSet = new Set();
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      const get = (j) => (j >= 0 && cols[j] != null ? cols[j].trim() : '');

      const code = get(idx.code);
      if (!code) continue;

      const features = parseCsvFeatures(get(idx.features));
      Object.keys(features).forEach(k => allFeatureKeysSet.add(k));

      products.push({
        code,
        name: get(idx.name),
        quantity: get(idx.qty),
        hasDescription: get(idx.desc).length > 0,
        url: get(idx.url),
        features
      });
    }

    return { products, featureKeys: [...allFeatureKeysSet] };
  }

  function renderTable() {
    const visibleKeys = state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
    const thead = document.getElementById('seoTableHead');
    const tbody = document.getElementById('seoTableBody');

    thead.innerHTML = `<tr>
      <th style="position:sticky;left:0;z-index:11;background:var(--seo-surface2);">Код</th>
      <th>Название</th>
      <th>В наличии</th>
      <th>Есть описание</th>
      ${visibleKeys.map(k => `<th>${k}</th>`).join('')}
    </tr>`;

    if (!state.allProducts.length) {
      tbody.innerHTML = `<tr><td colspan="${4 + visibleKeys.length}"><div class="seo-module-empty-state">Нет данных</div></td></tr>`;
      return;
    }

    const filtered = state.allProducts.filter(p => {
      if (state.filters.hideOutOfStock && !(parseInt(p.quantity) > 0)) return false;
      if (state.filters.hideNoDescription && p.hasDescription) return false;
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="${4 + visibleKeys.length}"><div class="seo-module-empty-state">Нет товаров по выбранным фильтрам</div></td></tr>`;
      updateStats(filtered.length);
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const hasDesc = !!p.hasDescription;
      const inStock = parseInt(p.quantity) > 0;
      return `<tr>
        <td style="position:sticky;left:0;z-index:10;background:var(--seo-surface);;">
          <a href="${p.url}" target="_blank">${p.code}</a>
        </td>
        <td class="name-cell">${p.name}</td>
        <td>${inStock
          ? `<span class="seo-module-badge seo-module-badge-green">да</span>`
          : `<span class="seo-module-badge seo-module-badge-red">нет</span>`}</td>
        <td>${hasDesc
          ? `<span class="seo-module-badge seo-module-badge-green">да</span>`
          : `<span class="seo-module-badge seo-module-badge-yellow">нет</span>`}</td>
        ${visibleKeys.map(k => `<td class="feature-cell">${p.features?.[k] || '—'}</td>`).join('')}
      </tr>`;
    }).join('');

    updateStats(filtered.length);
  }

  function updateStats(filteredCount = null) {
    const total = state.allProducts.length;
    const withDesc = state.allProducts.filter(p => p.hasDescription).length;
    document.getElementById('seoStatsCard').style.display = 'block';
    document.getElementById('statTotal').textContent = filteredCount !== null && filteredCount !== total
      ? `${filteredCount} / ${total}`
      : (total || '—');
    document.getElementById('statWith').textContent = withDesc || '—';
    document.getElementById('statWithout').textContent = (total - withDesc) || '—';
    document.getElementById('statFeatures').textContent = state.allFeatureKeys.length || '—';
  }

  let featureSearchQuery = '';

  function buildFeaturesPanel() {
    const panel = document.getElementById('featuresPanel');

    if (!state.allFeatureKeys.length) {
      panel.innerHTML = `<div class="seo-features-empty">Загрузите CSV-файл, чтобы увидеть доступные характеристики.</div>`;
      return;
    }

    panel.innerHTML = `
      <div class="seo-features-toolbar">
        <button class="seo-features-toolbar-btn" id="featSelectAll">Все</button>
        <button class="seo-features-toolbar-btn" id="featSelectNone">Ни одного</button>
      </div>
      <input type="text" class="seo-features-search" id="featuresSearch" placeholder="Поиск характеристики...">
      <div class="seo-features-list" id="featuresList"></div>
    `;

    renderFeaturesList();

    document.getElementById('featSelectAll').addEventListener('click', () => {
      state.allFeatureKeys.forEach(k => state.visibleFeatures.add(k));
      renderFeaturesList();
      renderTable();
    });

    document.getElementById('featSelectNone').addEventListener('click', () => {
      state.visibleFeatures.clear();
      renderFeaturesList();
      renderTable();
    });

    document.getElementById('featuresSearch').addEventListener('input', (e) => {
      featureSearchQuery = e.target.value.toLowerCase();
      renderFeaturesList();
    });
  }

  function renderFeaturesList() {
    const list = document.getElementById('featuresList');
    if (!list) return;

    const filtered = featureSearchQuery
      ? state.allFeatureKeys.filter(k => k.toLowerCase().includes(featureSearchQuery))
      : state.allFeatureKeys;

    list.innerHTML = filtered.map(k => {
      const checked = state.visibleFeatures.has(k);
      const id = `feat_${CSS.escape(k)}`;
      return `
        <div class="seo-feature-item${checked ? '' : ' hidden-feature'}" data-key="${k.replace(/"/g, '&quot;')}">
          <label for="${id}">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
            ${k}
          </label>
        </div>`;
    }).join('');

    list.querySelectorAll('.seo-feature-item').forEach(item => {
      item.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
        toggleFeature(item.dataset.key, e.target.checked, item);
      });
    });
  }

  function toggleFeature(key, enabled, itemEl) {
    if (enabled) {
      state.visibleFeatures.add(key);
      itemEl.classList.remove('hidden-feature');
    } else {
      state.visibleFeatures.delete(key);
      itemEl.classList.add('hidden-feature');
    }
    renderTable();
    if (state.settings.generateTags && document.getElementById('promptTagsBlock').style.display !== 'none') {
      renderTagsFeatureExamples();
    }
  }

  function handleCsvFile(file) {
    const drop = document.getElementById('csvDropZone');
    drop.classList.add('has-file');
    document.getElementById('csvDropLabel').innerHTML = `<div style="font-size:22px;margin-bottom:6px;">⏳</div><div>${file.name}</div>`;
    loadFromCsv(file);
  }

  function loadFromCsv(file) {
    if (!file) return;
    setOverlay(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { products, featureKeys } = parseCsv(e.target.result);

        state.allProducts = products;
        state.allFeatureKeys = featureKeys;
        state.visibleFeatures.clear();
        featureSearchQuery = '';

        setOverlay(false);
        updateStats();
        buildFeaturesPanel();
        renderTable();

        document.getElementById('settingsFeaturesContent').classList.add('expanded');
        document.querySelector('#settingsFeaturesHeader .seo-module-expand-icon').classList.add('expanded');

        showToast(`Загружено ${products.length} товаров, ${featureKeys.length} характеристик`, 'success');

        document.getElementById('csvDropLabel').innerHTML = `<div style="font-size:22px;margin-bottom:6px;">✅</div><div>${products.length} товаров загружено</div>`;

        if (document.getElementById('tab-generate')?.classList.contains('active')) {
          buildGenProductList();
        }
        updateGenStartBtn();
      } catch (err) {
        setOverlay(false);
        showToast('Ошибка парсинга CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function buildGenProductList() {
    const search = genState.searchQuery.toLowerCase();

    let products = state.allProducts.filter(p => {
      if (state.filters.hideOutOfStock && !(parseInt(p.quantity) > 0)) return false;
      if (state.filters.hideNoDescription && p.hasDescription) return false;
      return true;
    });

    if (search) {
      products = products.filter(p =>
        p.code.toLowerCase().includes(search) || p.name.toLowerCase().includes(search));
    }

    const list = document.getElementById('genProductList');
    if (!products.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--seo-text-muted);font-size:12px;">${state.allProducts.length ? 'Нет совпадений' : 'Загрузите CSV для отображения товаров'}</div>`;
      updateGenCount();
      return;
    }

    list.innerHTML = products.map(p => {
      const selected = genState.selectedCodes.has(p.code);
      const result = genState.results[p.code];
      const statusClass = result?.status || 'pending';
      const url = p.url || '#';
      return `
        <div class="gen-product-row${selected ? ' selected' : ''}" data-code="${p.code}">
          <input type="checkbox" ${selected ? 'checked' : ''} data-code="${p.code}">
          <div class="gen-product-info">
            <a class="gen-product-code" href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${p.code}</a>
            <div class="gen-product-name">${p.name || '—'}</div>
          </div>
          <div class="gen-product-status ${statusClass}"></div>
        </div>`;
    }).join('');

    list.querySelectorAll('.gen-product-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const cb = row.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        toggleGenProduct(row.dataset.code, cb.checked, row);
      });
      row.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
        toggleGenProduct(row.dataset.code, e.target.checked, row);
      });
    });

    updateGenCount();
  }

  function toggleGenProduct(code, selected, rowEl) {
    if (selected) {
      genState.selectedCodes.add(code);
      rowEl?.classList.add('selected');
    } else {
      genState.selectedCodes.delete(code);
      rowEl?.classList.remove('selected');
    }
    updateGenCount();
    updateGenStartBtn();
  }

  function updateGenCount() {
    const el = document.getElementById('genSelectedCount');
    if (el) el.textContent = `${genState.selectedCodes.size} / ${state.allProducts.length}`;
  }

  function updateGenStartBtn() {
    const btn = document.getElementById('genStartBtn');
    if (!btn) return;
    const nothingSelected = genState.selectedCodes.size === 0;
    const nothingToGenerate = !state.settings.generateDescription && !state.settings.generateTags;
    btn.disabled = nothingSelected || genState.isRunning || nothingToGenerate;
  }

  function renderGenResults() {
    const container = document.getElementById('genResults');
    const selectedProducts = state.allProducts.filter(p => genState.selectedCodes.has(p.code));

    if (!selectedProducts.length) {
      container.innerHTML = '';
      return;
    }

    selectedProducts.forEach(p => {
      const existing = container.querySelector(`.gen-result-card[data-code="${p.code}"]`);
      if (!existing) {
        const card = buildResultCard(p);
        container.appendChild(card);
      }
    });

    container.querySelectorAll('.gen-result-card').forEach(card => {
      if (!genState.selectedCodes.has(card.dataset.code)) card.remove();
    });

    const anyDone = Object.values(genState.results).some(r => r.status === 'done');
    const downloadBtn = document.getElementById('genDownloadBtn');
    const downloadXlsxBtn = document.getElementById('genDownloadXlsxBtn');
    const display = anyDone ? '' : 'none';
    if (downloadBtn) downloadBtn.style.display = display;
    if (downloadXlsxBtn) downloadXlsxBtn.style.display = display;
    updateEditTagsBtn();
  }

  function buildResultCard(product) {
    const result = genState.results[product.code] || { status: 'pending', text: '', tags: null };
    const visibleKeys = state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
    const featureTags = visibleKeys
      .filter(k => product.features?.[k])
      .map(k => `<span class="gen-feature-tag">${k}<span>${product.features[k]}</span></span>`)
      .join('');

    const card = document.createElement('div');
    card.className = `gen-result-card is-${result.status}`;
    card.dataset.code = product.code;

    const showDescSection = state.settings.generateDescription;

    card.innerHTML = `
      <div class="gen-result-header">
        <span class="gen-result-code">${product.code}</span>
        <span class="gen-result-name">${product.name || ''}</span>
      </div>
      ${featureTags ? `<div class="gen-result-features">${featureTags}</div>` : ''}
      <div class="gen-result-body" id="descBody_${product.code}" style="${showDescSection ? '' : 'display:none;'}">
        <div class="gen-result-text" data-code="${product.code}" contenteditable="true">${getResultBodyHTML(result)}</div>
      </div>
      <div class="gen-result-check-row" id="checkRow_${product.code}" style="display:none;"></div>
      <div class="gen-result-tags-row" id="tagsRow_${product.code}" style="display:none;">
        <span class="gen-result-tags-label">Теги</span>
        <div class="gen-result-tags-content" id="tagsContent_${product.code}"></div>
      </div>
    `;

    const textEl = card.querySelector('.gen-result-text');
    if (textEl) {
      textEl.addEventListener('blur', () => {
        const saved = textEl.innerText.trim();
        if (saved) {
          genState.results[product.code] = { ...(genState.results[product.code] || {}), text: saved, status: 'done' };
          card.className = 'gen-result-card is-done';
        }
      });
    }

    if (state.settings.generateTags) {
      const tagsRow = card.querySelector(`#tagsRow_${product.code}`);
      if (tagsRow) tagsRow.style.display = '';
      renderTagsInCard(product.code, result);
    }

    return card;
  }

  function renderCheckRow(code, result) {
    const row = document.getElementById(`checkRow_${code}`);
    if (!row) return;

    if (!result || result.status !== 'done') {
      row.style.display = 'none';
      row.innerHTML = '';
      return;
    }

    const suspicious = result.suspiciousWords || [];
    const aiStatus = result.aiCheckStatus;

    row.style.display = '';

    let html = '';

    html += `<div class="gen-check-actions">
      <button class="gen-btn gen-card-redo-btn" data-code="${code}" data-mode="redo" title="Заново сгенерировать описание и проверить">▶ Повторить</button>
      <button class="gen-btn gen-card-recheck-btn" data-code="${code}" data-mode="recheck" title="Запустить только ИИ проверку заново">⟳ Перепроверить</button>
    </div>`;

    if (aiStatus === 'running') {
      html += `<span class="gen-check-ai-status running"><span class="gen-spinner" style="border-color:rgba(79,142,247,0.3);border-top-color:var(--seo-accent);width:8px;height:8px;border-width:1.5px;display:inline-block;"></span> ИИ проверка...</span>`;
    } else if (aiStatus === 'done') {
      html += `<span class="gen-check-ai-status done">✓ ИИ исправил</span>`;
    } else if (aiStatus === 'error') {
      html += `<span class="gen-check-ai-status error">⚠ ИИ проверка не удалась</span>`;
    } else if (aiStatus === 'clean') {
      html += `<span class="gen-check-ai-status done">✓ Текст чистый</span>`;
    } else if (!suspicious.length) {
      html += `<span class="gen-check-ai-status pending">Проверка не запускалась. Нажмите «Перепроверить» для ручной проверки.</span>`;
    }

    if (suspicious.length) {
      const chips = suspicious.map(s => {
        const cls = s.type === 'cjk' ? 'gen-check-chip cjk' : 'gen-check-chip latin';
        return `<span class="${cls}">${s.word}</span>`;
      }).join('');
      html += `<span class="gen-check-label">Проверить:</span>${chips}`;
    }

    row.innerHTML = html;

    row.querySelectorAll('.gen-card-redo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (genState.isRunning) {
          showToast('Дождитесь окончания текущей генерации', 'error');
          return;
        }
        const product = state.allProducts.find(p => p.code === btn.dataset.code);
        if (product) runSingleProduct(product, 'redo');
      });
    });

    row.querySelectorAll('.gen-card-recheck-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (genState.isRunning) {
          showToast('Дождитесь окончания текущей генерации', 'error');
          return;
        }
        const product = state.allProducts.find(p => p.code === btn.dataset.code);
        if (product) runSingleProduct(product, 'recheck');
      });
    });
  }

  function renderTagsInCard(code, result) {
    const tagsRow = document.getElementById(`tagsRow_${code}`);
    const tagsContent = document.getElementById(`tagsContent_${code}`);
    if (!tagsRow || !tagsContent) return;

    tagsRow.style.display = '';

    if (!result || result.tagsStatus === 'pending' || !result.tagsStatus) {
      tagsContent.innerHTML = `<span class="gen-tag-generating">Ожидает...</span>`;
    } else if (result.tagsStatus === 'generating') {
      tagsContent.innerHTML = `<span class="gen-tag-generating"><span class="gen-spinner" style="border-color:rgba(79,142,247,0.3);border-top-color:var(--seo-accent);width:9px;height:9px;border-width:1.5px;"></span>Генерация тегов...</span>`;
    } else if (result.tagsStatus === 'done' && result.tags && result.tags.length) {
      tagsContent.innerHTML = result.tags.map(t => `<span class="gen-tag-badge">${t}</span>`).join('');
    } else if (result.tagsStatus === 'error') {
      tagsContent.innerHTML = `<span class="gen-tag-generating" style="color:var(--seo-red);">⚠ Ошибка тегов</span>`;
    } else {
      tagsContent.innerHTML = '';
    }
  }

  function getResultBodyHTML(result) {
    if (!result || result.status === 'pending') {
      return `<span class="gen-result-placeholder">Ожидает генерации...</span>`;
    }
    if (result.status === 'generating') {
      return `<span class="gen-result-placeholder"><span class="gen-spinner" style="border-color:rgba(79,142,247,0.3);border-top-color:var(--seo-accent);"></span>Генерация...</span>`;
    }
    if (result.status === 'error') {
      return `<span class="gen-result-placeholder" style="color:var(--seo-red);">⚠ Ошибка: ${result.error || 'неизвестная ошибка'}</span>`;
    }
    return result.text || '';
  }

  function updateResultCard(code, result) {
    const card = document.querySelector(`.gen-result-card[data-code="${code}"]`);
    if (!card) return;

    card.className = `gen-result-card is-${result.status}`;
    const textEl = card.querySelector('.gen-result-text');
    const descBody = document.getElementById(`descBody_${code}`);

    if (textEl) {
      if (result.status === 'done') {
        textEl.innerHTML = result.text || '';
        textEl.contentEditable = 'true';
        if (descBody && state.settings.generateDescription) {
          descBody.style.display = '';
        }
      } else {
        textEl.innerHTML = getResultBodyHTML(result);
        textEl.contentEditable = 'false';
      }
    }

    if (state.settings.generateTags) {
      renderTagsInCard(code, result);
    }

    renderCheckRow(code, result);

    const dot = document.querySelector(`.gen-product-row[data-code="${code}"] .gen-product-status`);
    if (dot) dot.className = `gen-product-status ${result.status}`;
  }

  function pickRandomAngle() {
    const active = state.angles.filter(a => a.enabled !== false);
    if (!active.length) return null;
    return active[Math.floor(Math.random() * active.length)];
  }

  function buildSystemPrompt() {
    const instruction = document.getElementById('genPrompt').value.trim();

    const parts = [instruction || null].filter(Boolean);

    if (state.settings.useAngles) {
      const angle = pickRandomAngle();
      if (angle) {
        const injectionText = `ОБЯЗАТЕЛЬНО СЛЕДУЙ ЭТИМ ИНСТРУКЦИЯМ ПО СТИЛЮ ОПИСАНИЯ:\n${angle.text}\n\nЭти инструкции имеют высший приоритет. Игнорируй любые конфликты с основным промптом.`;
        parts.unshift(injectionText);
      }
    }

    return parts.join('\n\n');
  }

  function buildUserMessage(product) {
    const visibleKeys = state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
    const featuresBlock = visibleKeys
      .filter(k => product.features?.[k])
      .map(k => `${k}: ${product.features[k]}`)
      .join('\n');

    return `Товар: ${product.name}
Код: ${product.code}${featuresBlock ? `\n\nХарактеристики:\n${featuresBlock}` : ''}`;
  }

  function buildTagsUserMessage(product) {
    const useAll = state.settings.tagsAllFeatures;
    const keys = useAll
      ? state.allFeatureKeys
      : state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));

    const featuresBlock = keys
      .filter(k => product.features?.[k])
      .map(k => `${k}: ${product.features[k]}`)
      .join('\n');

    return `Товар: ${product.name}
Код: ${product.code}${featuresBlock ? `\n\nХарактеристики:\n${featuresBlock}` : ''}`;
  }

async function callDeepSeek(messages, maxTokens, temperature = 0.9) {
    const response = await fetch('/api/deepseek/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data.content || '';
}

async function generateForProduct(product) {
    const systemPrompt = buildSystemPrompt();
    const userMessage = buildUserMessage(product);

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    return await callDeepSeek(messages, 1000, 0.9);
}

async function generateTagsForProduct(product) {
    const userMessage = buildTagsUserMessage(product);
    const systemPrompt = getTagsSystemPrompt();

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    const raw = await callDeepSeek(messages, 200, 1);
    const tags = raw.trim().split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length < 60);
    return tags.slice(0, 7);
}

async function runAiValidation(product, text) {
    const messages = [
        { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
        { role: 'user', content: `Товар: ${product.name}\n\nТекст для проверки (верни его ПОЛНОСТЬЮ, исправив только ошибочные слова):\n${text}` }
    ];
    return await callDeepSeek(messages, 1200, 0.3);
}

  async function runLanguageToolCheck(text) {
    const params = new URLSearchParams({
      text,
      language: 'ru-RU',
      disabledRules: 'WHITESPACE_RULE,UNPAIRED_BRACKETS'
    });

    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!response.ok) throw new Error(`LanguageTool HTTP ${response.status}`);
    return await response.json();
  }

  function applyLanguageToolHighlights(code, text, matches) {
    if (!matches || !matches.length) return;

    const textEl = document.querySelector(`.gen-result-text[data-code="${code}"]`);
    if (!textEl) return;

    const sorted = [...matches].sort((a, b) => a.offset - b.offset);

    let html = '';
    let cursor = 0;

    for (const match of sorted) {
      const { offset, length, message, replacements } = match;
      if (offset < cursor) continue;
      if (offset > text.length) continue;

      const before = text.slice(cursor, offset);
      html += escapeHtml(before).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

      const word = text.slice(offset, offset + length);
      const suggestion = replacements?.[0]?.value || '';
      const title = suggestion
        ? `${message} → ${suggestion}`
        : message;

      html += `<span class="lt-error" title="${escapeHtml(title)}" data-suggestion="${escapeHtml(suggestion)}">${escapeHtml(word)}</span>`;
      cursor = offset + length;
    }

    const tail = text.slice(cursor);
    html += escapeHtml(tail).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

    textEl.innerHTML = `<p>${html}</p>`;

    textEl.querySelectorAll('.lt-error').forEach(span => {
      span.addEventListener('click', () => {
        const suggestion = span.dataset.suggestion;
        if (suggestion) {
          span.outerHTML = escapeHtml(suggestion);
          const result = genState.results[code];
          if (result) {
            result.text = textEl.innerText.trim();
          }
        }
      });
    });
  }

  async function runCheckPhase(product, textToCheck) {
    const result = genState.results[product.code];
    const allowlist = buildForeignWordAllowlist(product);
    const suspicious = detectForeignWords(textToCheck, allowlist);

    result.suspiciousWords = suspicious;
    result.aiCheckStatus = null;

    try {
      const ltResult = await runLanguageToolCheck(textToCheck);
      const matches = (ltResult.matches || []).filter(m => {
        const ruleId = m.rule?.id || '';
        return !ruleId.startsWith('MORFOLOGIK') && m.replacements && m.replacements.length > 0;
      });
      if (matches.length) {
        applyLanguageToolHighlights(product.code, textToCheck, matches);
      }
    } catch (err) {
      console.warn(`[runCheckPhase] LanguageTool error for ${product.code}:`, err);
    }

    if (suspicious.length && state.settings.performAiCheck) {
      result.aiCheckStatus = 'running';
      updateResultCard(product.code, result);

      try {
        const fixedText = await runAiValidation(product, textToCheck);

        result.text = fixedText;
        result.aiCheckStatus = 'done';

        const textEl = document.querySelector(`.gen-result-text[data-code="${product.code}"]`);
        if (textEl) textEl.innerHTML = fixedText;

        const allowlistAfter = buildForeignWordAllowlist(product);
        const suspiciousAfter = detectForeignWords(fixedText, allowlistAfter);
        result.suspiciousWords = suspiciousAfter;

        try {
          const ltResultAfter = await runLanguageToolCheck(fixedText);
          const matchesAfter = (ltResultAfter.matches || []).filter(m => {
            const ruleId = m.rule?.id || '';
            return !ruleId.startsWith('MORFOLOGIK') && m.replacements && m.replacements.length > 0;
          });
          if (matchesAfter.length) {
            applyLanguageToolHighlights(product.code, fixedText, matchesAfter);
          }
        } catch (err) {
          console.warn(`[runCheckPhase] LanguageTool post-AI error for ${product.code}:`, err);
        }

        updateResultCard(product.code, result);
      } catch (err) {
        result.aiCheckStatus = 'error';
        updateResultCard(product.code, result);
      }
    } else if (!suspicious.length) {
      if (state.settings.performAiCheck) {
        result.aiCheckStatus = 'clean';
      }
      updateResultCard(product.code, result);
    } else {
      updateResultCard(product.code, result);
    }
  }

  async function runSingleProduct(product, mode) {
    const existingResult = genState.results[product.code] || {
      status: 'pending', text: '', error: '', tags: null,
      tagsStatus: 'pending', suspiciousWords: [], aiCheckStatus: null
    };

    if (mode === 'recheck') {
      const currentText = existingResult.text;
      if (!currentText) {
        showToast('Нет текста для проверки', 'error');
        return;
      }
      existingResult.aiCheckStatus = null;
      existingResult.suspiciousWords = [];
      genState.results[product.code] = existingResult;
      updateResultCard(product.code, existingResult);

      await runCheckPhase(product, currentText);
      updateResultCard(product.code, genState.results[product.code]);
      showToast(`Проверка завершена: ${product.code}`, 'success');
      return;
    }

    genState.results[product.code] = {
      status: 'generating',
      text: '',
      error: '',
      tags: existingResult.tags,
      tagsStatus: existingResult.tagsStatus,
      suspiciousWords: [],
      aiCheckStatus: null
    };
    updateResultCard(product.code, genState.results[product.code]);

    if (state.settings.generateDescription) {
      try {
        const descText = await generateForProduct(product);
        genState.results[product.code].status = 'done';
        genState.results[product.code].text = descText;
        genState.results[product.code].suspiciousWords = [];
        genState.results[product.code].aiCheckStatus = null;
        updateResultCard(product.code, genState.results[product.code]);

        if (state.settings.performCheck) {
          await runCheckPhase(product, descText);
        }
      } catch (err) {
        console.error(`[runSingleProduct] description error for ${product.code}:`, err);
        genState.results[product.code].status = 'error';
        genState.results[product.code].error = err.message;
        updateResultCard(product.code, genState.results[product.code]);
      }
    } else {
      genState.results[product.code].status = 'done';
      genState.results[product.code].text = '';
      updateResultCard(product.code, genState.results[product.code]);
    }

    if (state.settings.generateTags && genState.results[product.code].status !== 'error') {
      genState.results[product.code].tagsStatus = 'generating';
      renderTagsInCard(product.code, genState.results[product.code]);

      try {
        const tags = await generateTagsForProduct(product);
        genState.results[product.code].tags = tags;
        genState.results[product.code].tagsStatus = 'done';
      } catch (err) {
        console.error(`[runSingleProduct] tags error for ${product.code}:`, err);
        genState.results[product.code].tagsStatus = 'error';
      }

      renderTagsInCard(product.code, genState.results[product.code]);
    }

    const anyDone = Object.values(genState.results).some(r => r.status === 'done');
    if (anyDone) {
      document.getElementById('genDownloadBtn').style.display = '';
      document.getElementById('genDownloadXlsxBtn').style.display = '';
    }
    updateEditTagsBtn();
    showToast(`Готово: ${product.code}`, 'success');
  }

  function updateEditTagsBtn() {
    const btn = document.getElementById('genEditTagsBtn');
    if (!btn) return;
    const anyTagsDone = state.settings.generateTags &&
      Object.values(genState.results).some(r => r.status === 'done' && r.tags && r.tags.length);
    btn.style.display = anyTagsDone ? '' : 'none';
  }

  function openTagsModal() {
    const backdrop = document.getElementById('tagsModalBackdrop');
    backdrop.style.display = 'flex';
    renderTagsModal();
  }

  function closeTagsModal() {
    document.getElementById('tagsModalBackdrop').style.display = 'none';
    renderTagsInAllCards();
  }

  function renderTagsInAllCards() {
    Object.keys(genState.results).forEach(code => {
      const result = genState.results[code];
      if (result && result.status === 'done') renderTagsInCard(code, result);
    });
  }

  let modalState = {
    selectedTag: null,
    selectedFeature: null,
    selectedProductCode: null,
    tagSearch: '',
    featureSearch: '',
    productSearch: '',
    editingTag: null,
    collapsedFeatures: new Set()
  };

  function getAllUniqueTags() {
    const countMap = {};
    Object.values(genState.results).forEach(r => {
      if (r.status === 'done' && r.tags) {
        r.tags.forEach(t => {
          countMap[t] = (countMap[t] || 0) + 1;
        });
      }
    });
    return countMap;
  }

  function getProductsForTag(tag) {
    return Object.entries(genState.results)
      .filter(([code, r]) => r.status === 'done' && r.tags && r.tags.includes(tag))
      .map(([code]) => code);
  }

  function getFeatureVariants(featureKey) {
    const variants = new Set();
    const selectedProducts = state.allProducts.filter(p => genState.selectedCodes.has(p.code));
    const useAll = state.settings.tagsAllFeatures;

    selectedProducts.forEach(p => {
      if (p.features?.[featureKey]) {
        if (useAll || state.visibleFeatures.has(featureKey)) {
          variants.add(p.features[featureKey]);
        }
      }
    });
    return [...variants].sort();
  }

  function getSelectedProductsFeatures() {
    const useAll = state.settings.tagsAllFeatures;
    if (useAll) {
      const featuresSet = new Set();
      const selectedProducts = state.allProducts.filter(p => genState.selectedCodes.has(p.code));
      selectedProducts.forEach(p => {
        Object.keys(p.features || {}).forEach(k => featuresSet.add(k));
      });
      return [...featuresSet].sort();
    } else {
      return state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
    }
  }

  function renderTagsModal() {
    renderModalTagList();
    renderModalFeatureList();
    renderModalProductList();
    renderProductEditArea();
    updateModalFooter();
  }

  function renderModalTagList() {
    const list = document.getElementById('tagsModalTagList');
    const countEl = document.getElementById('tagsModalCount');
    const countMap = getAllUniqueTags();
    const search = modalState.tagSearch.toLowerCase();

    let tags = Object.entries(countMap).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (search) tags = tags.filter(([t]) => t.toLowerCase().includes(search));

    if (countEl) countEl.textContent = `${Object.keys(countMap).length} уникальных`;

    list.innerHTML = tags.map(([tag, count]) => `
      <div class="tags-modal-tag${modalState.selectedTag === tag ? ' selected' : ''}" data-tag="${tag.replace(/"/g, '&quot;')}">
        ${tag}
        <span class="tags-modal-tag-count">×${count}</span>
      </div>`).join('');

    list.querySelectorAll('.tags-modal-tag').forEach(el => {
      el.addEventListener('click', () => {
        const tag = el.dataset.tag;
        modalState.selectedTag = modalState.selectedTag === tag ? null : tag;
        modalState.selectedFeature = null;
        const input = document.getElementById('tagsModalEditInput');
        const hint = document.getElementById('tagsModalEditHint');
        const applyBtn = document.getElementById('tagsModalApplyBtn');
        const deleteBtn = document.getElementById('tagsModalDeleteBtn');
        if (modalState.selectedTag) {
          input.disabled = false;
          input.value = modalState.selectedTag;
          input.focus();
          input.select();
          applyBtn.disabled = false;
          deleteBtn.disabled = false;
          hint.textContent = `Встречается в ${countMap[modalState.selectedTag] || 0} товарах. Измените текст и нажмите Применить.`;
          modalState.editingTag = null;
        } else {
          input.disabled = true;
          input.value = '';
          applyBtn.disabled = true;
          deleteBtn.disabled = true;
          hint.textContent = '';
          modalState.editingTag = null;
        }
        renderModalTagList();
        renderModalFeatureList();
        renderModalProductList();
        renderProductEditArea();
      });
    });
  }

  function renderModalFeatureList() {
    const list = document.getElementById('tagsModalFeatureList');
    if (!list) return;

    const search = modalState.featureSearch.toLowerCase();
    const allFeatures = getSelectedProductsFeatures();
    const features = allFeatures.filter(k =>
      !search || k.toLowerCase().includes(search)
    );

    if (!features.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--seo-text-muted);font-size:12px;">Нет характеристик у выбранных товаров</div>`;
      return;
    }

    list.innerHTML = features.map(featureKey => {
      const variants = getFeatureVariants(featureKey);
      const isCollapsed = modalState.collapsedFeatures.has(featureKey);
      return `
        <div class="tags-modal-feature-group">
          <div class="tags-modal-feature-name" data-feature="${featureKey}" style="cursor:pointer;user-select:none;">
            <span class="tags-modal-feature-collapse-icon${isCollapsed ? ' collapsed' : ''}">▼</span>
            ${featureKey}
          </div>
          <div class="tags-modal-feature-variants${isCollapsed ? ' collapsed' : ''}">
            ${variants.map(val => {
              const variantId = `${featureKey}|${val}`;
              const selected = modalState.selectedFeature === variantId;
              return `<span class="tags-modal-feature-variant${selected ? ' selected' : ''}" data-variant="${variantId}">${val}</span>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.tags-modal-feature-name').forEach(header => {
      header.addEventListener('click', () => {
        const featureKey = header.dataset.feature;
        if (modalState.collapsedFeatures.has(featureKey)) {
          modalState.collapsedFeatures.delete(featureKey);
        } else {
          modalState.collapsedFeatures.add(featureKey);
        }
        renderModalFeatureList();
      });
    });

    list.querySelectorAll('.tags-modal-feature-variant').forEach(el => {
      el.addEventListener('click', () => {
        const variantId = el.dataset.variant;
        modalState.selectedFeature = modalState.selectedFeature === variantId ? null : variantId;
        modalState.selectedTag = null;
        renderModalTagList();
        renderModalFeatureList();
        renderModalProductList();
        renderProductEditArea();
      });
    });
  }

  function renderModalProductList() {
    const list = document.getElementById('tagsModalProductList');
    const search = modalState.productSearch.toLowerCase();

    let products = state.allProducts.filter(p => {
      const r = genState.results[p.code];
      if (!r || r.status !== 'done' || !r.tags || !r.tags.length) return false;

      if (modalState.selectedTag) {
        const productsWithTag = getProductsForTag(modalState.selectedTag);
        if (!productsWithTag.includes(p.code)) return false;
      }

      if (modalState.selectedFeature) {
        const [featureKey, featureValue] = modalState.selectedFeature.split('|');
        if (p.features?.[featureKey] !== featureValue) return false;
      }

      if (search && !p.code.toLowerCase().includes(search) && !p.name.toLowerCase().includes(search)) return false;

      return true;
    });

    if (!products.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--seo-text-muted);font-size:12px;">Нет товаров с тегами</div>`;
      return;
    }

    list.innerHTML = products.map(p => {
      const tags = genState.results[p.code].tags || [];
      const isSelected = modalState.selectedProductCode === p.code;
      const tagsHtml = tags.map(t => `
        <span class="tags-modal-product-tag${modalState.selectedTag === t ? ' highlighted' : ''}">${t}</span>`).join('');

      const usedKeys = state.settings.tagsAllFeatures
        ? getSelectedProductsFeatures()
        : state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
      const featuresHtml = usedKeys
        .filter(k => p.features?.[k])
        .map(k => `<span class="tags-modal-feature-chip"><span class="tags-modal-feature-key">${k}</span><span class="tags-modal-feature-val">${p.features[k]}</span></span>`)
        .join('');

      return `
        <div class="tags-modal-product-row${isSelected ? ' selected' : ''}" data-code="${p.code}">
          <div style="display:flex;gap:8px;align-items:baseline;">
            <span class="tags-modal-product-code">${p.code}</span>
            <span class="tags-modal-product-name">${p.name || ''}</span>
          </div>
          ${featuresHtml ? `<div class="tags-modal-product-features">${featuresHtml}</div>` : ''}
          <div class="tags-modal-product-tags">${tagsHtml}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.tags-modal-product-row').forEach(row => {
      row.addEventListener('click', () => {
        const code = row.dataset.code;
        modalState.selectedProductCode = modalState.selectedProductCode === code ? null : code;
        renderModalProductList();
        renderProductEditArea();
      });
    });
  }

  function renderProductEditArea() {
    const body = document.getElementById('tagsModalProductEditBody');
    if (!body) return;

    if (!modalState.selectedProductCode) {
      body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--seo-text-muted);font-size:12px;">Выберите товар для редактирования</div>`;
      return;
    }

    const product = state.allProducts.find(p => p.code === modalState.selectedProductCode);
    if (!product) return;

    const result = genState.results[product.code];
    if (!result || result.status !== 'done') {
      body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--seo-text-muted);font-size:12px;">Нет данных для редактирования</div>`;
      return;
    }

    const tags = result.tags || [];
    const usedKeys = state.settings.tagsAllFeatures
      ? getSelectedProductsFeatures()
      : state.allFeatureKeys.filter(k => state.visibleFeatures.has(k));
    const features = usedKeys.filter(k => product.features?.[k]);

    body.innerHTML = `
      <div class="tags-modal-product-edit-info">
        <div class="product-edit-field">
          <label>Код</label>
          <div class="product-edit-value">${product.code}</div>
        </div>
        <div class="product-edit-field">
          <label>Название</label>
          <div class="product-edit-value">${product.name || '—'}</div>
        </div>
        ${features.length ? `
          <div class="product-edit-field">
            <label>Характеристики</label>
            <div class="product-edit-features">
              ${features.map(k => `
                <span class="tags-modal-feature-chip">
                  <span class="tags-modal-feature-key">${k}</span>
                  <span class="tags-modal-feature-val">${product.features[k]}</span>
                </span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="product-edit-tags-section">
        <label>Теги для этого товара</label>
        <div class="product-edit-tags" id="productEditTagsContainer">
          ${tags.map((tag, idx) => `
            <div class="product-edit-tag-item" data-idx="${idx}">
              <input type="text" class="product-edit-tag-input" value="${tag}" data-original="${tag}">
              <button class="product-edit-tag-confirm" data-idx="${idx}" style="display:none;">✓</button>
              <button class="product-edit-tag-remove" data-idx="${idx}">✕</button>
            </div>`).join('')}
        </div>
        <div style="margin-top:8px;">
          <input type="text" class="product-edit-new-tag" id="productEditNewTagInput" placeholder="Добавить новый тег...">
        </div>
      </div>
    `;

    const editContainer = document.getElementById('productEditTagsContainer');
    if (!editContainer) return;

    editContainer.querySelectorAll('.product-edit-tag-input').forEach(input => {
      const originalValue = input.dataset.original;
      const confirmBtn = input.parentElement.querySelector('.product-edit-tag-confirm');
      const idx = parseInt(input.parentElement.dataset.idx);

      input.addEventListener('input', () => {
        const newVal = input.value.trim();
        if (newVal !== originalValue) {
          confirmBtn.style.display = '';
        } else {
          confirmBtn.style.display = 'none';
        }
      });

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const newVal = input.value.trim();
          if (newVal && idx >= 0 && idx < tags.length) {
            tags[idx] = newVal;
            result.tags = tags;
            input.dataset.original = newVal;
            confirmBtn.style.display = 'none';
          }
        });
      }

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const newVal = input.value.trim();
          if (newVal && idx >= 0 && idx < tags.length) {
            tags[idx] = newVal;
            result.tags = tags;
            input.dataset.original = newVal;
            confirmBtn.style.display = 'none';
          }
        }
      });
    });

    editContainer.querySelectorAll('.product-edit-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.parentElement.dataset.idx);
        if (idx >= 0 && idx < tags.length) {
          tags.splice(idx, 1);
          result.tags = tags;
          renderProductEditArea();
        }
      });
    });

    const newTagInput = document.getElementById('productEditNewTagInput');
    if (newTagInput) {
      newTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const newTag = newTagInput.value.trim();
          if (newTag) {
            tags.push(newTag);
            result.tags = tags;
            newTagInput.value = '';
            renderProductEditArea();
          }
        }
      });
    }
  }

  function updateModalFooter() {
    const info = document.getElementById('tagsModalFooterInfo');
    if (!info) return;
    const countMap = getAllUniqueTags();
    const total = Object.values(genState.results).filter(r => r.status === 'done' && r.tags).length;
    info.textContent = `${Object.keys(countMap).length} уникальных тегов в ${total} товарах`;
  }

  function applyTagEdit() {
    const input = document.getElementById('tagsModalEditInput');
    const newValue = input.value.trim();
    if (!newValue || !modalState.selectedTag) return;
    const oldTag = modalState.selectedTag;
    if (newValue === oldTag) return;

    Object.values(genState.results).forEach(r => {
      if (r.status === 'done' && r.tags) {
        const idx = r.tags.indexOf(oldTag);
        if (idx !== -1) {
          r.tags[idx] = newValue;
          const dupeIdx = r.tags.indexOf(newValue, idx + 1);
          if (dupeIdx !== -1) r.tags.splice(dupeIdx, 1);
        }
      }
    });

    modalState.selectedTag = newValue;
    document.getElementById('tagsModalEditHint').textContent = `Тег обновлён во всех товарах.`;
    renderTagsModal();
  }

  function deleteTag() {
    if (!modalState.selectedTag) return;
    const tag = modalState.selectedTag;

    Object.values(genState.results).forEach(r => {
      if (r.status === 'done' && r.tags) {
        r.tags = r.tags.filter(t => t !== tag);
      }
    });

    modalState.selectedTag = null;
    const input = document.getElementById('tagsModalEditInput');
    input.disabled = true;
    input.value = '';
    document.getElementById('tagsModalEditHint').textContent = '';
    document.getElementById('tagsModalApplyBtn').disabled = true;
    document.getElementById('tagsModalDeleteBtn').disabled = true;
    renderTagsModal();
  }

  async function startGeneration() {
    if (genState.isRunning) return;

    if (!state.settings.generateDescription && !state.settings.generateTags) {
      showToast('Включите хотя бы один режим генерации', 'error');
      return;
    }
    if (state.settings.generateDescription && !buildSystemPrompt()) {
      showToast('Напишите инструкцию в промпте', 'error');
      return;
    }
    if (!genState.selectedCodes.size) {
      showToast('Выберите хотя бы один товар', 'error');
      return;
    }

    genState.isRunning = true;
    genState.abortFlag = false;

    document.getElementById('genStartBtn').style.display = 'none';
    document.getElementById('genStopBtn').style.display = '';
    document.getElementById('genDownloadBtn').style.display = document.getElementById('genDownloadXlsxBtn').style.display = 'none';

    const products = state.allProducts.filter(p => genState.selectedCodes.has(p.code));

    products.forEach(p => {
      genState.results[p.code] = {
        status: 'pending',
        text: '',
        error: '',
        tags: null,
        tagsStatus: 'pending',
        suspiciousWords: [],
        aiCheckStatus: null
      };
    });
    renderGenResults();

    let done = 0;
    const total = products.length;
    const delayMs = state.settings.delaySeconds * 1000;

    for (const product of products) {
      if (genState.abortFlag) break;

      genState.results[product.code].status = 'generating';
      updateResultCard(product.code, genState.results[product.code]);
      document.getElementById('genProgressText').textContent = `${done + 1} / ${total}`;

      const card = document.querySelector(`.gen-result-card[data-code="${product.code}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      if (state.settings.generateDescription) {
        try {
          const descText = await generateForProduct(product);

          genState.results[product.code].status = 'done';
          genState.results[product.code].text = descText;
          genState.results[product.code].suspiciousWords = [];
          genState.results[product.code].aiCheckStatus = null;
          updateResultCard(product.code, genState.results[product.code]);

          if (state.settings.performCheck && !genState.abortFlag) {
            await runCheckPhase(product, descText);
          }
        } catch (err) {
          console.error(`[startGeneration] error for ${product.code}:`, err);
          genState.results[product.code] = {
            ...genState.results[product.code],
            status: 'error',
            text: '',
            error: err.message
          };
          updateResultCard(product.code, genState.results[product.code]);
        }
      } else {
        genState.results[product.code].status = 'done';
        genState.results[product.code].text = '';
        updateResultCard(product.code, genState.results[product.code]);
      }

      if (state.settings.generateTags && !genState.abortFlag && genState.results[product.code].status !== 'error') {
        genState.results[product.code].tagsStatus = 'generating';
        renderTagsInCard(product.code, genState.results[product.code]);

        try {
          const tags = await generateTagsForProduct(product);
          genState.results[product.code].tags = tags;
          genState.results[product.code].tagsStatus = 'done';
        } catch (err) {
          console.error(`[startGeneration] tags error for ${product.code}:`, err);
          genState.results[product.code].tagsStatus = 'error';
        }

        renderTagsInCard(product.code, genState.results[product.code]);
      }

      done++;

      if (done < total && !genState.abortFlag) {
        document.getElementById('genProgressText').textContent = `Ожидание ${state.settings.delaySeconds}с перед следующим товаром... (${done}/${total})`;

        for (let j = 0; j < delayMs; j += 1000) {
          if (genState.abortFlag) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    genState.isRunning = false;
    const wasAborted = genState.abortFlag;
    genState.abortFlag = false;

    Object.keys(genState.results).forEach(code => {
      if (genState.results[code].status === 'generating') {
        genState.results[code].status = 'pending';
        updateResultCard(code, genState.results[code]);
      }
    });

    document.getElementById('genStartBtn').style.display = '';
    document.getElementById('genStartBtn').disabled = false;
    document.getElementById('genStopBtn').style.display = 'none';
    document.getElementById('genProgressText').textContent = wasAborted
      ? `Остановлено (${done}/${total})`
      : `Готово — ${done} из ${total}`;

    const anyDone = Object.values(genState.results).some(r => r.status === 'done');
    if (anyDone) document.getElementById('genDownloadBtn').style.display = document.getElementById('genDownloadXlsxBtn').style.display = '';
    updateEditTagsBtn();

    showToast(`Генерация завершена: ${done} из ${total}`, 'success');
  }

  function stopGeneration() {
    genState.abortFlag = true;
    document.getElementById('genStopBtn').disabled = true;
  }

  function wrapParagraphs(text) {
    return text
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function downloadCsv() {
    const anyTags = Object.values(genState.results).some(r => r.status === 'done' && r.tags && r.tags.length);
    const hasDesc = state.settings.generateDescription;
    const headers = ['language', 'vendor', 'product_code'];
    if (hasDesc) headers.push('description');
    if (anyTags) headers.push('tags');
    const rows = [headers];

    state.allProducts
      .filter(p => genState.results[p.code]?.status === 'done')
      .forEach(p => {
        const result = genState.results[p.code];
        const row = ['ru', 'Хайтек', p.code];
        if (hasDesc) {
          const text = wrapParagraphs(result.text).replace(/"/g, '""');
          row.push(`"${text}"`);
        }
        if (anyTags) {
          const tagsStr = (result.tags || []).join(', ').replace(/"/g, '""');
          row.push(`"${tagsStr}"`);
        }
        rows.push(row);
      });

    if (rows.length === 1) return;
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `descriptions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadXlsx() {
    const doneProducts = state.allProducts.filter(p => genState.results[p.code]?.status === 'done');
    if (!doneProducts.length) return;

    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const anyTags = doneProducts.some(p => genState.results[p.code]?.tags?.length);
    const hasDesc = state.settings.generateDescription;
    const headers = ['Код товара', 'Название'];
    if (hasDesc) headers.push('Описание');
    if (anyTags) headers.push('Теги');
    const rows = [headers];

    doneProducts.forEach(p => {
      const result = genState.results[p.code];
      const row = [p.code, p.name];
      if (hasDesc) row.push(wrapParagraphs(result.text));
      if (anyTags) row.push((result.tags || []).join(', '));
      rows.push(row);
    });

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);

    const colWidths = [{ wch: 20 }, { wch: 40 }];
    if (hasDesc) colWidths.push({ wch: 80 });
    if (anyTags) colWidths.push({ wch: 50 });
    ws['!cols'] = colWidths;

    const headerRange = window.XLSX.utils.decode_range(ws['!ref']);
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cell = ws[window.XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '2A3048' } },
          alignment: { wrapText: true, vertical: 'center' }
        };
      }
    }

    const descColIdx = hasDesc ? 2 : -1;
    for (let r = 1; r < rows.length; r++) {
      if (descColIdx >= 0) {
        const descCell = ws[window.XLSX.utils.encode_cell({ r, c: descColIdx })];
        if (descCell) descCell.s = { alignment: { wrapText: true, vertical: 'top' } };
      }

      const codeCell = ws[window.XLSX.utils.encode_cell({ r, c: 0 })];
      const url = doneProducts[r - 1]?.url;
      if (codeCell && url) {
        codeCell.l = { Target: url, Tooltip: url };
        codeCell.s = { font: { color: { rgb: '4F8EF7' }, underline: true } };
      }
    }

    window.XLSX.utils.book_append_sheet(wb, ws, 'Описания');
    window.XLSX.writeFile(wb, `descriptions_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function renderAngleList() {
    const list = document.getElementById('angleList');
    if (!list) return;

    if (!state.angles.length) {
      list.innerHTML = `<div style="font-size:12px;color:var(--seo-text-muted);font-style:italic;padding:4px 0;">Нет углов. Добавьте хотя бы один.</div>`;
      return;
    }

    list.innerHTML = state.angles.map((angle, idx) => {
      const enabled = angle.enabled !== false;
      const preview = angle.text.length > 50 ? angle.text.slice(0, 50) + '…' : angle.text;
      return `
        <div class="angle-item" data-idx="${idx}">
          <div class="angle-item-header" data-idx="${idx}">
            <span class="angle-drag-handle" title="Перетащить">⠿</span>
            <span class="angle-item-label${enabled ? '' : ' muted'}">${preview || 'Пустой угол'}</span>
            <div class="angle-item-actions">
              <button class="angle-action-btn angle-toggle-btn" data-idx="${idx}" title="${enabled ? 'Отключить' : 'Включить'}">${enabled ? '✓' : '○'}</button>
              <button class="angle-action-btn danger angle-delete-btn" data-idx="${idx}" title="Удалить">✕</button>
            </div>
          </div>
          <div class="angle-item-body" id="angleBody_${idx}">
            <textarea class="angle-item-textarea" data-idx="${idx}" placeholder="Опишите угол подачи...">${angle.text}</textarea>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.angle-item-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.classList.contains('angle-action-btn') || e.target.classList.contains('angle-drag-handle')) return;
        const idx = parseInt(header.dataset.idx);
        const body = document.getElementById(`angleBody_${idx}`);
        if (body) body.classList.toggle('expanded');
      });
    });

    list.querySelectorAll('.angle-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        state.angles[idx].enabled = state.angles[idx].enabled === false ? true : false;
        renderAngleList();
      });
    });

    list.querySelectorAll('.angle-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        state.angles.splice(idx, 1);
        renderAngleList();
      });
    });

    list.querySelectorAll('.angle-item-textarea').forEach(ta => {
      ta.addEventListener('input', () => {
        const idx = parseInt(ta.dataset.idx);
        state.angles[idx].text = ta.value;
        const header = list.querySelector(`.angle-item-header[data-idx="${idx}"] .angle-item-label`);
        if (header) {
          const preview = ta.value.length > 50 ? ta.value.slice(0, 50) + '…' : ta.value;
          header.textContent = preview || 'Пустой угол';
        }
      });
    });
  }

  function updateDescriptionEditorState() {
    const descBlock = document.getElementById('promptDescriptionBlock');
    const anglesLabel = document.getElementById('toggleAnglesLabel');
    const anglesInput = document.getElementById('useAngles');

    if (state.settings.generateDescription) {
      if (descBlock) descBlock.style.display = '';
      if (anglesLabel) anglesLabel.classList.remove('disabled');
      if (anglesInput) anglesInput.disabled = false;
    } else {
      if (descBlock) descBlock.style.display = 'none';
      if (anglesLabel) anglesLabel.classList.add('disabled');
      if (anglesInput) anglesInput.disabled = true;
    }

    updateAnglesEditorState();
  }

  function updateAnglesEditorState() {
    const block = document.getElementById('promptAnglesBlock');
    if (block) block.style.display = (state.settings.useAngles && state.settings.generateDescription) ? '' : 'none';
  }

  function updateTagsEditorState() {
    const block = document.getElementById('promptTagsBlock');
    const allFeatLabel = document.getElementById('toggleAllFeaturesLabel');
    const allFeatInput = document.getElementById('tagsAllFeatures');

    if (state.settings.generateTags) {
      if (block) block.style.display = '';
      if (allFeatLabel) allFeatLabel.classList.remove('disabled');
      if (allFeatInput) allFeatInput.disabled = false;
      renderTagsFeatureExamples();
    } else {
      if (block) block.style.display = 'none';
      if (allFeatLabel) allFeatLabel.classList.add('disabled');
      if (allFeatInput) allFeatInput.disabled = true;
    }
  }

  document.getElementById('generateDescription').checked = state.settings.generateDescription;
  document.getElementById('generateTags').checked = state.settings.generateTags;
  document.getElementById('tagsAllFeatures').checked = state.settings.tagsAllFeatures;
  document.getElementById('useAngles').checked = state.settings.useAngles;
  document.getElementById('performCheck').checked = state.settings.performCheck;
  document.getElementById('performAiCheck').checked = state.settings.performAiCheck;

  updateCheckEditorState();
  document.getElementById('tagsSystemPrompt').value = DEFAULT_TAGS_PROMPT;
  renderAngleList();
  updateDescriptionEditorState();
  updateTagsEditorState();

  document.getElementById('generateDescription').addEventListener('change', (e) => {
    state.settings.generateDescription = e.target.checked;
    saveSettings();
    updateDescriptionEditorState();
    updateGenStartBtn();
  });

  document.getElementById('useAngles').addEventListener('change', (e) => {
    state.settings.useAngles = e.target.checked;
    saveSettings();
    updateAnglesEditorState();
  });

  document.getElementById('generateTags').addEventListener('change', (e) => {
    state.settings.generateTags = e.target.checked;
    saveSettings();
    updateTagsEditorState();
    updateGenStartBtn();
  });

  document.getElementById('tagsAllFeatures').addEventListener('change', (e) => {
    state.settings.tagsAllFeatures = e.target.checked;
    saveSettings();
  });

  document.getElementById('performCheck').addEventListener('change', (e) => {
    state.settings.performCheck = e.target.checked;
    saveSettings();
    updateCheckEditorState();
  });

  document.getElementById('performAiCheck').addEventListener('change', (e) => {
    state.settings.performAiCheck = e.target.checked;
    saveSettings();
  });

  document.getElementById('tagsResetBtn').addEventListener('click', () => {
    document.getElementById('tagsSystemPrompt').value = DEFAULT_TAGS_PROMPT;
    renderTagsFeatureExamples();
    showToast('Примеры тегов сброшены', 'success');
  });

  document.getElementById('angleAddBtn').addEventListener('click', () => {
    state.angles.push({
      id: 'a' + Date.now(),
      text: '',
      enabled: true
    });
    renderAngleList();
    const bodies = document.querySelectorAll('.angle-item-body');
    const last = bodies[bodies.length - 1];
    if (last) {
      last.classList.add('expanded');
      last.querySelector('textarea')?.focus();
    }
  });

  const csvDrop = document.getElementById('csvDropZone');
  const csvInput = document.getElementById('csvFileInput');

  csvDrop.addEventListener('click', () => csvInput.click());
  csvDrop.addEventListener('dragover', (e) => { e.preventDefault(); csvDrop.classList.add('drag-over'); });
  csvDrop.addEventListener('dragleave', () => csvDrop.classList.remove('drag-over'));
  csvDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    csvDrop.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  });

  csvInput.addEventListener('change', () => {
    if (csvInput.files[0]) handleCsvFile(csvInput.files[0]);
  });

  document.querySelectorAll('.seo-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seo-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.seo-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'generate') buildGenProductList();
    });
  });

  document.getElementById('genStartBtn').addEventListener('click', startGeneration);
  document.getElementById('genStopBtn').addEventListener('click', stopGeneration);
  document.getElementById('genDownloadBtn').addEventListener('click', downloadCsv);
  document.getElementById('genDownloadXlsxBtn').addEventListener('click', downloadXlsx);
  document.getElementById('genEditTagsBtn').addEventListener('click', openTagsModal);

  document.getElementById('tagsModalClose').addEventListener('click', closeTagsModal);
  document.getElementById('tagsModalDoneBtn').addEventListener('click', closeTagsModal);
  document.getElementById('tagsModalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTagsModal();
  });

  document.getElementById('tagsModalApplyBtn').addEventListener('click', applyTagEdit);

  document.getElementById('tagsModalEditInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyTagEdit();
    if (e.key === 'Escape') {
      modalState.selectedTag = null;
      e.target.disabled = true;
      e.target.value = '';
      document.getElementById('tagsModalEditHint').textContent = '';
      document.getElementById('tagsModalApplyBtn').disabled = true;
      document.getElementById('tagsModalDeleteBtn').disabled = true;
      renderModalTagList();
      renderModalFeatureList();
      renderModalProductList();
      renderProductEditArea();
    }
  });

  document.getElementById('tagsModalDeleteBtn').addEventListener('click', deleteTag);

  document.getElementById('tagsModalSearch').addEventListener('input', (e) => {
    modalState.tagSearch = e.target.value;
    renderModalTagList();
  });

  document.getElementById('tagsModalFeatureSearch').addEventListener('input', (e) => {
    modalState.featureSearch = e.target.value;
    renderModalFeatureList();
  });

  document.getElementById('tagsModalProductSearch').addEventListener('input', (e) => {
    modalState.productSearch = e.target.value;
    renderModalProductList();
  });

  document.getElementById('genProductSearch').addEventListener('input', (e) => {
    genState.searchQuery = e.target.value;
    buildGenProductList();
  });

  document.getElementById('genSelectAll').addEventListener('click', () => {
    const search = genState.searchQuery.toLowerCase();
    state.allProducts
      .filter(p => {
        if (state.filters.hideOutOfStock && !(parseInt(p.quantity) > 0)) return false;
        if (state.filters.hideNoDescription && p.hasDescription) return false;
        if (search && !p.code.toLowerCase().includes(search) && !p.name.toLowerCase().includes(search)) return false;
        return true;
      })
      .forEach(p => genState.selectedCodes.add(p.code));
    buildGenProductList();
    updateGenStartBtn();
    renderGenResults();
  });

  document.getElementById('genSelectNone').addEventListener('click', () => {
    genState.selectedCodes.clear();
    buildGenProductList();
    updateGenStartBtn();
    renderGenResults();
  });

  document.getElementById('genPromptToggle').addEventListener('click', () => {
    const body = document.getElementById('genPromptBody');
    const btn = document.getElementById('genPromptToggle');
    const collapsed = body.classList.toggle('collapsed');
    btn.textContent = collapsed ? '▼ Развернуть' : '▲ Свернуть';
  });

  function makeSettingsToggle(headerId, contentId) {
    document.getElementById(headerId).addEventListener('click', () => {
      document.getElementById(contentId).classList.toggle('expanded');
      document.querySelector(`#${headerId} .seo-module-expand-icon`).classList.toggle('expanded');
    });
  }

  makeSettingsToggle('settingsFeaturesHeader', 'settingsFeaturesContent');
  makeSettingsToggle('settingsFiltersHeader', 'settingsFiltersContent');
  makeSettingsToggle('settingsAnglesHeader', 'settingsAnglesContent');

  document.getElementById('filterOutOfStock').addEventListener('change', (e) => {
    state.filters.hideOutOfStock = e.target.checked;
    renderTable();
    if (document.getElementById('tab-generate')?.classList.contains('active')) buildGenProductList();
  });

  document.getElementById('filterHasDesc').addEventListener('change', (e) => {
    state.filters.hideNoDescription = e.target.checked;
    renderTable();
    if (document.getElementById('tab-generate')?.classList.contains('active')) buildGenProductList();
  });

  return {
    cleanup: () => {}
  };
}