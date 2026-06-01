export async function loadModule(container, { chatId, userData }) {

  container.innerHTML = `
    <div class="pc-module-wrapper">
      <div class="pc-module-main">
        <div class="pc-module-tabs-nav">
          <button class="pc-module-tab-btn active" data-tab="analysis">Анализ заполнения</button>
          <button class="pc-module-tab-btn" data-tab="mapping">Управление маппингом</button>
        </div>

        <div id="analysisTab" class="pc-module-tab-content active">
          <div class="pc-module-upload-section">
            <div class="pc-module-file-btn-group">
              <button id="chooseFileBtn" class="pc-module-btn pc-module-btn-primary">Выберите файл</button>
              <button id="resetButton" class="pc-module-btn pc-module-btn-danger" style="display: none;">Сбросить</button>
            </div>
            <input type="file" id="pcFileInput" accept=".xlsx,.xls" style="display: none;">
            <button id="modePriceButton" class="pc-module-mode-btn active">Цена и наличие</button>
            <button id="modeComponentsButton" class="pc-module-mode-btn">Компоненты</button>
            <button id="modeImportButton" class="pc-module-mode-btn disabled">Импорт</button>
            <button id="downloadCSVButton" class="pc-module-btn pc-module-btn-secondary" style="display: none;">Скачать CSV</button>
          </div>

          <div id="progressOverlay" class="pc-module-progress-overlay">
            <div class="pc-module-progress-spinner"></div>
          </div>

          <div id="analysisResults" style="display: none;">
            <div id="priceTableContainer" class="mode-table-container active">
              <div id="priceFilters" class="pc-module-filter-section"></div>
              <div class="pc-module-table-container">
                <table class="pc-module-table" id="priceTable">
                  <thead>
                    <tr id="priceTableHeader">
                      <th>Код</th>
                      <th>Цена до скидки<br><span style="font-size:9px;">Ф / С</span></th>
                      <th>Цена со скидкой<br><span style="font-size:9px;">Ф / С</span></th>
                    </tr>
                  </thead>
                  <tbody id="priceTableBody"></tbody>
                </table>
              </div>
            </div>
            
            <div id="componentsTableContainer" class="mode-table-container">
              <div id="componentsFilters" class="pc-module-filter-section"></div>
              <div class="pc-module-table-container">
                <div id="componentsTableView"></div>
              </div>
            </div>

            <div id="importTableContainer" class="mode-table-container">
              <div id="importFilters" class="pc-module-filter-section"></div>
              <div class="pc-module-table-container">
                <table class="pc-module-table" id="importTable">
                  <thead id="importTableHeader">
                    <tr>
                      <th style="width: 30px;"></th>
                      <th>Код ПК</th>
                      <th>Название ПК</th>
                    </tr>
                  </thead>
                  <tbody id="importTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div id="mappingTab" class="pc-module-tab-content">
          <div class="pc-module-card">
            <div class="pc-module-card-header">
              <h3>Управление маппингом</h3>
              <div style="display: flex; gap: 8px;">
                <button id="addMappingBtn" class="pc-module-btn pc-module-btn-primary">+ Добавить</button>
                <button id="refreshMappingsBtn" class="pc-module-btn pc-module-btn-secondary">🔄 Обновить</button>
              </div>
            </div>

            <div id="mappingsList" class="pc-module-table-container">
              <div class="pc-module-loading">Загрузка маппингов...</div>
            </div>
          </div>
        </div>

        <div class="pc-module-toast-container" id="toastContainer"></div>
      </div>

      <div class="pc-module-sidebar">
        <h2 class="pc-module-sidebar-title">Настройки</h2>
        <div id="pcModuleSettings"></div>
      </div>
    </div>
  `;

  const moduleState = {
    excelData: null,
    currentFiles: {
      pcs: null
    },
    processingState: {
      totalPCs: 0,
      processedPCs: 0,
      currentBatch: 0,
      totalBatches: 0
    },
    currentMode: 'price',
    resultsCache: {
      priceResults: [],
      componentResults: [],
      importResults: []
    },
    featureColumnMapping: {},
    pcFeaturesData: {},
    filters: {
      price: { pcCode: '' },
      components: { pcCode: '', component: '' },
      import: { pcCode: '', name: '', smart: '' }
    },
    selectedImportRows: new Set(),
    settings: {
      hideCleanComponents: true,
      hideIdenticalExcelPrices: false,
      showFilters: {
        price: true,
        components: true,
        import: true
      },
      useAdminUrl: false,
      showProductCheckboxes: true,
      expandedSettings: ['displayControls']
    }
  };

  const COMPONENT_TYPE_KEYWORDS = {
    'motherboard': ['Материнская'],
    'processor': ['Процессор'],
    'case': ['Корпус'],
    'ram': ['DRAM'],
    'storage': ['SSD', 'HDD'],
    'powersupply': ['Блок'],
    'gpu': ['Видеокарта'],
    'cooling': ['Кулер']
  };

  const COMPONENT_TYPE_ORDER = [
    'motherboard',
    'processor',
    'ram',
    'gpu',
    'storage',
    'powersupply',
    'case',
    'cooling',
    'other'
  ];

  const COMPONENT_TYPE_NAMES = {
    'motherboard': 'Материнская плата',
    'processor': 'Процессор',
    'ram': 'Оперативная память',
    'gpu': 'Видеокарта',
    'storage': 'Накопитель',
    'powersupply': 'Блок питания',
    'case': 'Корпус',
    'cooling': 'Охлаждение',
    'other': 'Другое'
  };

  function cleanText(text) {
    if (!text) return text;
    return text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function detectComponentType(componentName) {
    if (!componentName) return 'other';
    const firstWord = componentName.trim().replace(/\u00a0/g, ' ').split(' ')[0].toLowerCase();
    for (const [type, keywords] of Object.entries(COMPONENT_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (firstWord === keyword.toLowerCase()) {
          return type;
        }
      }
    }
    return 'other';
  }

  const mappingState = {
    currentMappings: [],
    editingId: null
  };

const WAREHOUSE_MAPPING = [
  { id: '30', name: 'ТЦТ',    csCart: 'Хайтек Торговый Центр Тирасполь (Warehouse)' },
  { id: '28', name: 'ТИР2',   csCart: 'Хайтек Магазин Тирасполь -2 (Warehouse)' },
  { id: '1',  name: 'БЕНД',   csCart: 'Хайтек Магазин Бендеры (Warehouse)' },
  { id: '29', name: 'ТЦБ',    csCart: 'Хайтек Торговый Центр Бендеры (Warehouse)' },
  { id: '31', name: 'РЫБ2',   csCart: 'Хайтек Магазин Рыбница-2 (Warehouse)' },
  { id: '5',  name: 'РЫБ',    csCart: 'Хайтек Магазин Рыбница (Warehouse)' },
  { id: '3',  name: 'ДУБ',    csCart: 'Хайтек Магазин Дубоссары (Warehouse)' },
  { id: '33', name: 'ГРИГ',   csCart: 'Хайтек Магазин Григориополь (Warehouse)' },
  { id: '4',  name: 'КАМ',    csCart: 'Хайтек Магазин Каменка (Warehouse)' },
  { id: '6',  name: 'СЛОБ',   csCart: 'Хайтек Магазин Слободзея (Warehouse)' },
  { id: '2',  name: 'ДНЕСТР', csCart: 'Хайтек Магазин Днестровск (Warehouse)' },
  { id: '35', name: 'ПЕРВ',   csCart: 'Хайтек Магазин Первомайск (Warehouse)' }
];

const WAREHOUSE_CS_CART_NAMES = {
  '30': 'Хайтек Торговый Центр Тирасполь (Warehouse)',
  '28': 'Хайтек Магазин Тирасполь -2 (Warehouse)',
  '1':  'Хайтек Магазин Бендеры (Warehouse)',
  '29': 'Хайтек Торговый Центр Бендеры (Warehouse)',
  '31': 'Хайтек Магазин Рыбница-2 (Warehouse)',
  '5':  'Хайтек Магазин Рыбница (Warehouse)',
  '3':  'Хайтек Магазин Дубоссары (Warehouse)',
  '33': 'Хайтек Магазин Григориополь (Warehouse)',
  '4':  'Хайтек Магазин Каменка (Warehouse)',
  '6':  'Хайтек Магазин Слободзея (Warehouse)',
  '2':  'Хайтек Магазин Днестровск (Warehouse)',
  '35': 'Хайтек Магазин Первомайск (Warehouse)'
};

  const elements = {
    analysisTab: document.getElementById('analysisTab'),
    mappingTab: document.getElementById('mappingTab'),
    chooseFileBtn: document.getElementById('chooseFileBtn'),
    pcFileInput: document.getElementById('pcFileInput'),
    resetButton: document.getElementById('resetButton'),
    modePriceButton: document.getElementById('modePriceButton'),
    modeComponentsButton: document.getElementById('modeComponentsButton'),
    modeImportButton: document.getElementById('modeImportButton'),
    progressOverlay: document.getElementById('progressOverlay'),
    analysisResults: document.getElementById('analysisResults'),
    priceTableContainer: document.getElementById('priceTableContainer'),
    priceTableHeader: document.getElementById('priceTableHeader'),
    priceTableBody: document.getElementById('priceTableBody'),
    componentsTableContainer: document.getElementById('componentsTableContainer'),
    componentsTableView: document.getElementById('componentsTableView'),
    importTableContainer: document.getElementById('importTableContainer'),
    importTableHeader: document.getElementById('importTableHeader'),
    importTableBody: document.getElementById('importTableBody'),
    addMappingBtn: document.getElementById('addMappingBtn'),
    refreshMappingsBtn: document.getElementById('refreshMappingsBtn'),
    mappingsList: document.getElementById('mappingsList'),
    downloadCSVButton: document.getElementById('downloadCSVButton'),
    settingsContainer: document.getElementById('pcModuleSettings'),
    priceFilters: document.getElementById('priceFilters'),
    componentsFilters: document.getElementById('componentsFilters'),
    importFilters: document.getElementById('importFilters')
  };

  function loadUserSettings() {
    const saved = localStorage.getItem('pc-module-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      moduleState.settings = { ...moduleState.settings, ...parsed };
    }
    applySettings();
  }

  function saveUserSettings() {
    localStorage.setItem('pc-module-settings', JSON.stringify(moduleState.settings));
  }

  function applySettings() {
    renderSettings();
    if (moduleState.currentMode === 'price') {
      renderPriceTableWithFilters();
    } else if (moduleState.currentMode === 'components') {
      renderComponentsTableWithFilters();
    } else if (moduleState.currentMode === 'import') {
      renderImportTableWithFilters();
    }
  }

  function renderSettings() {
    const settingsData = [
      {
        id: 'displayControls',
        title: 'Режимы отображения',
        settings: [
          {
            id: 'hideCleanComponents',
            label: 'Скрыть компоненты без ошибок',
            type: 'toggle',
            value: moduleState.settings.hideCleanComponents
          },
          {
            id: 'hideIdenticalExcelPrices',
            label: 'Скрыть цены со скидкой если совпадают',
            type: 'toggle',
            value: moduleState.settings.hideIdenticalExcelPrices
          },
          {
            id: 'useAdminUrl',
            label: 'Использовать ссылку на админ панель',
            type: 'toggle',
            value: moduleState.settings.useAdminUrl
          },
          {
            id: 'showProductCheckboxes',
            label: 'Показывать чекбоксы выбора товаров',
            type: 'toggle',
            value: moduleState.settings.showProductCheckboxes
          }
        ]
      },
      {
        id: 'filterVisibility',
        title: 'Видимость фильтров',
        settings: [
          {
            id: 'showFilters.price',
            label: 'Показывать фильтры в "Цена и наличие"',
            type: 'toggle',
            value: moduleState.settings.showFilters?.price !== false
          },
          {
            id: 'showFilters.components',
            label: 'Показывать фильтры в "Компоненты"',
            type: 'toggle',
            value: moduleState.settings.showFilters?.components !== false
          },
          {
            id: 'showFilters.import',
            label: 'Показывать фильтры в "Импорт"',
            type: 'toggle',
            value: moduleState.settings.showFilters?.import !== false
          }
        ]
      }
    ];

    let settingsHTML = '';

    settingsData.forEach(settingGroup => {
      const isExpanded = moduleState.settings.expandedSettings.includes(settingGroup.id);

      settingsHTML += `
        <div class="pc-module-settings-block">
          <div class="pc-module-settings-header" data-setting="${settingGroup.id}">
            <h3>${settingGroup.title}</h3>
            <svg class="pc-module-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="pc-module-settings-content ${isExpanded ? 'expanded' : ''}">
      `;

      settingGroup.settings.forEach(setting => {
        settingsHTML += `
          <div class="pc-module-setting-item">
            <span class="pc-module-setting-label">${setting.label}</span>
            <label class="pc-module-toggle">
              <input type="checkbox" 
                     ${setting.value ? 'checked' : ''}
                     data-setting="${setting.id}">
              <span class="pc-module-slider"></span>
            </label>
          </div>
        `;
      });

      settingsHTML += `</div></div>`;
    });

    elements.settingsContainer.innerHTML = settingsHTML;

    elements.settingsContainer.querySelectorAll('.pc-module-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const settingId = header.dataset.setting;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.pc-module-expand-icon');

        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');

        const index = moduleState.settings.expandedSettings.indexOf(settingId);

        if (content.classList.contains('expanded')) {
          if (index === -1) {
            moduleState.settings.expandedSettings.push(settingId);
          }
        } else {
          if (index > -1) {
            moduleState.settings.expandedSettings.splice(index, 1);
          }
        }

        saveUserSettings();
      });
    });

elements.settingsContainer.querySelectorAll('.pc-module-toggle input').forEach(input => {
  input.addEventListener('change', (e) => {
    const settingId = e.target.dataset.setting;
    if (settingId.includes('.')) {
      const [group, key] = settingId.split('.');
      moduleState.settings[group][key] = e.target.checked;
    } else {
      moduleState.settings[settingId] = e.target.checked;
    }
    saveUserSettings();

    if (settingId === 'hideCleanComponents') {
      if (moduleState.excelData && moduleState.currentMode === 'components') {
        const pcs = moduleState.excelData.pcs || [];
        renderComponentsTable(pcs, moduleState.filters.components.component);
      }
    } else if (settingId === 'hideIdenticalExcelPrices') {
      if (moduleState.currentMode === 'price') {
        filterPriceTable();
      }
    } else if (settingId === 'showProductCheckboxes') {
      if (Object.keys(moduleState.pcFeaturesData).length > 0) {
        renderImportTable(Object.values(moduleState.pcFeaturesData));
      }
    } else if (settingId === 'useAdminUrl') {
      document.querySelectorAll('.pc-module-item-link').forEach(link => {
        const code = link.textContent.trim();
        const productId = link.dataset.productId;
        if (moduleState.settings.useAdminUrl && productId) {
          link.href = `https://hi-tech.md/569def4.php?dispatch=products.update&product_id=${productId}`;
        } else {
          link.href = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${encodeURIComponent(code)}&dispatch=products.search&security_hash=787aa6c42a72d38a492508e533b6d589`;
        }
      });
    } else {
      applySettings();
    }
  });
});
  }

  function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `pc-module-toast pc-module-status-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

function createItemLink(itemCode, productId) {
  if (!itemCode) return '';
  let itemUrl;
  if (moduleState.settings.useAdminUrl && productId) {
    itemUrl = `https://hi-tech.md/569def4.php?dispatch=products.update&product_id=${productId}`;
  } else {
    itemUrl = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${encodeURIComponent(itemCode)}&dispatch=products.search&security_hash=787aa6c42a72d38a492508e533b6d589`;
  }
  return `<a href="${itemUrl}" target="_blank" class="pc-module-item-link" data-product-id="${productId || ''}">${itemCode}</a>`;
}

  function setupFileUpload() {
    elements.chooseFileBtn.addEventListener('click', () => elements.pcFileInput.click());
    
    elements.pcFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], 'pcs');
      }
    });

    elements.resetButton.addEventListener('click', resetAnalysis);
  }

  function handleFileSelect(file, fileType) {
    if (fileType === 'pcs' && !file.name.match(/\.(xlsx|xls)$/)) {
      showToast('Пожалуйста, выберите файл Excel (.xlsx или .xls)', 'error');
      return;
    }

    moduleState.currentFiles[fileType] = file;
    elements.chooseFileBtn.style.display = 'none';
    elements.resetButton.style.display = 'inline-block';
    loadDataAndAnalyze();
  }

  async function loadDataAndAnalyze() {
    if (!moduleState.currentFiles.pcs) {
      showToast('Загрузите файл с ПК сборками', 'error');
      return;
    }

    try {
      elements.progressOverlay.classList.add('active');
      elements.modePriceButton.disabled = true;
      elements.modeComponentsButton.disabled = true;
      elements.modeImportButton.disabled = true;
      
      const arrayBuffer = await moduleState.currentFiles.pcs.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const pcs = parseExcelData(data);
      moduleState.excelData = { pcs };
      
      enableModeSelector();
      initializePriceTable(pcs);
      initializeComponentsTable(pcs);
      initializeImportTable(pcs);
      switchModeTable(moduleState.currentMode);
      await processAllModes(pcs);
      
      elements.progressOverlay.classList.remove('active');
      elements.modePriceButton.disabled = false;
      elements.modeComponentsButton.disabled = false;
      elements.modeImportButton.disabled = false;
      
    } catch (err) {
      console.error('Ошибка анализа файлов:', err);
      showToast(`Ошибка: ${err.message}`, 'error');
      elements.progressOverlay.classList.remove('active');
      elements.modePriceButton.disabled = false;
      elements.modeComponentsButton.disabled = false;
      elements.modeImportButton.disabled = false;
    }
  }

  function resetAnalysis() {
    showConfirmationModal(
      'Сбросить анализ',
      'Вы уверены, что хотите сбросить весь анализ? Все загруженные данные будут удалены.',
      () => {
        elements.pcFileInput.value = '';
        moduleState.currentFiles.pcs = null;
        moduleState.excelData = null;
        moduleState.resultsCache.priceResults = [];
        moduleState.resultsCache.componentResults = [];
        moduleState.resultsCache.importResults = [];
        moduleState.featureColumnMapping = {};
        moduleState.pcFeaturesData = {};
        moduleState.filters = {
          price: { pcCode: '' },
          components: { pcCode: '', component: '' },
          import: { pcCode: '', name: '', smart: '' }
        };
        moduleState.selectedImportRows.clear();
        elements.chooseFileBtn.style.display = 'inline-block';
        elements.resetButton.style.display = 'none';
        elements.progressOverlay.classList.remove('active');
        elements.analysisResults.style.display = 'none';
        elements.priceTableBody.innerHTML = '';
        elements.componentsTableView.innerHTML = '';
        elements.importTableBody.innerHTML = '';
        elements.downloadCSVButton.style.display = 'none';
        resetModeButtons();
        showToast('Анализ сброшен', 'success');
      }
    );
  }

function parseExcelData(data) {
  const pcs = [];
  let currentPC = null;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (row[1] && row[1].toString().trim() && (!row[0] || !row[0].toString().trim())) {
      if (currentPC) {
        pcs.push(currentPC);
      }
      currentPC = {
        code: row[1].toString().trim(),
        name: row[2] ? cleanText(row[2].toString().trim()) : '',
        excelPrice: row[5] ? parseFloat(row[5]) : null,
        discountPrice: row[7] ? parseFloat(row[7]) : null,
        warehouses: {
          '30': row[11] ? parseInt(row[11]) : 0,
          '28': row[12] ? parseInt(row[12]) : 0,
          '1':  row[13] ? parseInt(row[13]) : 0,
          '29': row[14] ? parseInt(row[14]) : 0,
          '31': row[15] ? parseInt(row[15]) : 0,
          '5':  row[16] ? parseInt(row[16]) : 0,
          '3':  row[17] ? parseInt(row[17]) : 0,
          '33': row[18] ? parseInt(row[18]) : 0,
          '4':  row[19] ? parseInt(row[19]) : 0,
          '6':  row[20] ? parseInt(row[20]) : 0,
          '2':  row[21] ? parseInt(row[21]) : 0,
          '35': row[22] ? parseInt(row[22]) : 0
        },
        parts: []
      };
    }
    else if (currentPC && row[0] && row[0].toString().trim()) {
      const part = {
        code: row[0].toString().trim(),
        price: row[5] ? parseFloat(row[5]) : null,
        quantity: row[3] ? parseInt(row[3]) : 1,
        rawName: row[2] ? cleanText(row[2].toString().trim()) : ''
      };
      currentPC.parts.push(part);
    }
  }

  if (currentPC) {
    pcs.push(currentPC);
  }

  return pcs;
}

function initializePriceTable(pcs) {
  elements.priceTableHeader.innerHTML = `
    <tr>
      <th>Код</th>
      <th>Цена до скидки<br><span style="font-size:9px;">Ф / С</span></th>
      <th>Цена со скидкой<br><span style="font-size:9px;">Ф / С</span></th>
      ${WAREHOUSE_MAPPING.map(w => 
        `<th>${w.name}<br><span style="font-size:9px;">Ф / С</span></th>`
      ).join('')}
    </tr>
  `;
  
  elements.priceTableBody.innerHTML = '';
  
  pcs.forEach((pc, index) => {
    const row = document.createElement('tr');
    row.id = `price-row-${index}`;
    row.dataset.pcCode = pc.code;
    
    let rowHTML = `
      <td>${createItemLink(pc.code)}</td>
      <td id="price-reg-${index}">
        <div>${pc.excelPrice ? formatPrice(pc.excelPrice) : '—'}/—</div>
      </td>
      <td id="price-disc-${index}">
        <div>${pc.discountPrice ? formatPrice(pc.discountPrice) : '—'}/—</div>
      </td>
    `;
    
    WAREHOUSE_MAPPING.forEach(w => {
      const fileAmount = pc.warehouses[w.id] || 0;
      rowHTML += `
        <td id="wh-${index}-${w.id}">
          <div>${fileAmount}/—</div>
        </td>
      `;
    });
    
    row.innerHTML = rowHTML;
    elements.priceTableBody.appendChild(row);
  });
}

  function initializeComponentsTable(pcs) {
    elements.componentsTableView.innerHTML = '<div class="pc-module-loading">⏳ Загрузка сравнения...</div>';
  }

  function initializeImportTable(pcs) {
    elements.importTableBody.innerHTML = '<tr><td colspan="3" class="pc-module-empty-state">Данные загружаются...</td></tr>';
  }

  function renderPriceFilters() {
    if (!moduleState.settings.showFilters?.price) {
      elements.priceFilters.innerHTML = '';
      elements.priceFilters.classList.add('hidden');
      return;
    }

    elements.priceFilters.classList.remove('hidden');
    elements.priceFilters.innerHTML = `
      <div class="pc-module-filters">
        <div class="pc-module-filter-group">
          <label>Поиск по коду ПК</label>
          <input type="text" id="pricePcFilter" class="pc-module-filter-input" value="${moduleState.filters.price.pcCode}" placeholder="Введите код...">
        </div>
      </div>
    `;

    document.getElementById('pricePcFilter')?.addEventListener('input', (e) => {
      moduleState.filters.price.pcCode = e.target.value.toLowerCase();
      filterPriceTable();
    });
  }

  function filterPriceTable() {
    const rows = elements.priceTableBody.querySelectorAll('tr');
    const searchTerm = moduleState.filters.price.pcCode;
    const hideIdentical = moduleState.settings.hideIdenticalExcelPrices;
    
    let allHidden = true;
    const discCells = [];
    
    rows.forEach(row => {
      const pcCode = row.dataset.pcCode?.toLowerCase() || '';
      const matchesPc = searchTerm === '' || pcCode.includes(searchTerm);
      
      if (matchesPc) {
        row.classList.remove('pc-module-row-hidden');
        allHidden = false;
        
        const regCell = row.querySelector('td:nth-child(2)');
        const discCell = row.querySelector('td:nth-child(3)');
        
        if (hideIdentical) {
          const regText = regCell?.textContent || '';
          const discText = discCell?.textContent || '';
          const regPrice = regText.split('/')[0].trim();
          const discPrice = discText.split('/')[0].trim();
          
          if (regPrice === discPrice || (regPrice === '—' && discPrice === '—')) {
            discCell.classList.add('pc-module-column-hidden');
          } else {
            discCell.classList.remove('pc-module-column-hidden');
          }
        } else {
          discCell.classList.remove('pc-module-column-hidden');
        }
        discCells.push(discCell);
      } else {
        row.classList.add('pc-module-row-hidden');
      }
    });

    const headerCell = document.querySelector('#priceTableHeader th:nth-child(3)');
    if (headerCell) {
      if (hideIdentical && discCells.length > 0) {
        const allDiscCellsHidden = Array.from(discCells).every(cell => cell.classList.contains('pc-module-column-hidden'));
        headerCell.classList.toggle('pc-module-column-hidden', allDiscCellsHidden);
      } else {
        headerCell.classList.remove('pc-module-column-hidden');
      }
    }
  }

  function renderComponentsFilters() {
    if (!moduleState.settings.showFilters?.components) {
      elements.componentsFilters.innerHTML = '';
      elements.componentsFilters.classList.add('hidden');
      return;
    }

    elements.componentsFilters.classList.remove('hidden');
    elements.componentsFilters.innerHTML = `
      <div class="pc-module-filters">
        <div class="pc-module-filter-group">
          <label>Поиск по коду ПК</label>
          <input type="text" id="componentsPcFilter" class="pc-module-filter-input" value="${moduleState.filters.components.pcCode}" placeholder="Введите код...">
        </div>
        <div class="pc-module-filter-group">
          <label>Поиск по компонентам</label>
          <input type="text" id="componentsGlobalFilter" class="pc-module-filter-input" value="${moduleState.filters.components.component}" placeholder="Введите название компонента...">
        </div>
      </div>
    `;

    document.getElementById('componentsPcFilter')?.addEventListener('input', (e) => {
      moduleState.filters.components.pcCode = e.target.value.toLowerCase();
      filterComponentsTable();
    });

    document.getElementById('componentsGlobalFilter')?.addEventListener('input', (e) => {
      moduleState.filters.components.component = e.target.value.toLowerCase();
      filterComponentsTable();
    });
  }

  function filterComponentsTable() {
    if (!moduleState.excelData) return;
    
    const pcs = moduleState.excelData.pcs || [];
    const pcFilter = moduleState.filters.components.pcCode;
    const componentFilter = moduleState.filters.components.component;
    
    const visiblePCs = pcs.filter(pc => {
      const pcCode = pc.code?.toLowerCase() || '';
      return pcFilter === '' || pcCode.includes(pcFilter);
    });
    
    if (visiblePCs.length > 0 && moduleState.resultsCache.componentResults.length > 0) {
      renderComponentsTable(visiblePCs, componentFilter);
    }
  }

  function renderComponentsTableWithFilters() {
    if (moduleState.resultsCache.componentResults.length) {
      renderComponentsFilters();
      const pcs = moduleState.excelData?.pcs || [];
      renderComponentsTable(pcs, moduleState.filters.components.component);
      filterComponentsTable();
    }
  }

function renderComponentsTable(pcs, filterText = '') {
  const allResults = moduleState.resultsCache.componentResults.flat();
  
  const pcsWithData = pcs.map(pc => {
    const result = allResults.find(r => r?.code === pc.code) || { parts: [] };
    return { pc, result };
  }).filter(item => item.result.parts && item.result.parts.length > 0);
  
  if (pcsWithData.length === 0) {
    elements.componentsTableView.innerHTML = '<div class="pc-module-empty-state">Нет данных о компонентах</div>';
    return;
  }
  
  const allComponents = [];
  pcsWithData.forEach((item, pcIndex) => {
    item.result.parts.forEach(part => {
      const validation = part.validation || {};
      const hasError = validation.status === 'incorrect' || 
                      validation.status === 'missing' || 
                      (validation.comparisons && validation.comparisons.some(c => !c.matches));
      
      if (moduleState.settings.hideCleanComponents && !hasError) {
        return;
      }
      
      const componentName = validation.componentName || part.rawName || part.code || '';
      const componentType = detectComponentType(componentName);
      
      if (filterText && !componentName.toLowerCase().includes(filterText.toLowerCase()) && 
          !part.code.toLowerCase().includes(filterText.toLowerCase())) {
        return;
      }
      
      allComponents.push({
        pcIndex,
        pcCode: item.pc.code,
        pcName: item.pc.name,
        part,
        validation,
        componentType,
        componentName,
        hasError,
        productId: validation.productId
      });
    });
  });
  
  if (allComponents.length === 0) {
    elements.componentsTableView.innerHTML = '<div class="pc-module-empty-state">Нет компонентов по заданному фильтру</div>';
    return;
  }
  
  allComponents.sort((a, b) => {
    if (a.componentName && b.componentName) {
      return a.componentName.localeCompare(b.componentName);
    }
    if (a.componentName) return -1;
    if (b.componentName) return 1;
    return 0;
  });
  
  const componentsByType = {};
  allComponents.forEach(comp => {
    if (!componentsByType[comp.componentType]) {
      componentsByType[comp.componentType] = [];
    }
    componentsByType[comp.componentType].push(comp);
  });
  
  COMPONENT_TYPE_ORDER.forEach(type => {
    if (componentsByType[type]) {
      componentsByType[type].sort((a, b) => {
        if (a.componentName && b.componentName) {
          return a.componentName.localeCompare(b.componentName);
        }
        if (a.componentName) return -1;
        if (b.componentName) return 1;
        return 0;
      });
    }
  });
  
  let tableHTML = '<table class="pc-module-table"><thead><tr>';
  tableHTML += '<th style="position: sticky; left: 0; z-index: 11; background: var(--pc-surface2);">Код ПК</th>';
  
  COMPONENT_TYPE_ORDER.forEach(type => {
    if (componentsByType[type] && componentsByType[type].length > 0) {
      tableHTML += `<th>${COMPONENT_TYPE_NAMES[type]}</th>`;
    }
  });
  
  tableHTML += '</tr></thead><tbody>';
  
  const pcIndices = [...new Set(allComponents.map(c => c.pcIndex))].sort((a, b) => a - b);

pcIndices.forEach(pcIndex => {
  const pc = pcs[pcIndex];
  const ramQuantity = pc.parts?.find(p => p.quantity > 1)?.quantity || 1;
  tableHTML += '<tr>';
  tableHTML += `<td style="position: sticky; left: 0; z-index: 10; background: var(--pc-surface);">${createItemLink(pc.code)}<br><span style="font-size:9px; color:var(--pc-text-muted);">${pc.name || ''}</span></td>`;
  
  COMPONENT_TYPE_ORDER.forEach(type => {
    if (componentsByType[type] && componentsByType[type].length > 0) {
      const typeComponents = componentsByType[type].filter(c => c.pcIndex === pcIndex);
      
      if (typeComponents.length > 0) {
        tableHTML += '<td>';
        typeComponents.forEach(comp => {
          const statusClass = comp.validation.status === 'correct' ? 'pc-module-badge-correct' :
                             comp.validation.status === 'incorrect' ? 'pc-module-badge-incorrect' :
                             comp.validation.status === 'missing' ? 'pc-module-badge-missing' : 'pc-module-badge-no-data';
          
          const statusDisplay = comp.validation.status === 'correct' ? '✓' :
                               comp.validation.status === 'incorrect' ? '✗' :
                               comp.validation.status === 'missing' ? '?' : '∼';
          
          tableHTML += `<div class="pc-module-component-item">`;
          tableHTML += `<div class="pc-module-component-header">`;
          tableHTML += `<span class="pc-module-component-title">${createItemLink(comp.part.code, comp.part.productId)} ${comp.part.quantity > 1 ? `×${comp.part.quantity}` : ''}</span>`;
          tableHTML += `<span class="pc-module-component-badge ${statusClass}">${statusDisplay}</span>`;
          tableHTML += `</div>`;
          
          if (comp.componentName) {
            tableHTML += `<div style="font-size:10px; color:var(--pc-text-muted); margin-bottom:4px; height: 45px;">${comp.componentName}</div>`;
          }
          
          if (comp.validation.comparisons && comp.validation.comparisons.length > 0) {
            const groupedComparisons = {};
            comp.validation.comparisons.forEach(compItem => {
              const key = compItem.featureName;
              if (!groupedComparisons[key]) {
                groupedComparisons[key] = {
                  pcValues: [],
                  componentValues: [],
                  allMatch: true,
                  formatAsRatio: compItem.formatAsRatio || false
                };
              }
              groupedComparisons[key].pcValues.push(compItem.pcValue || '—');
              groupedComparisons[key].componentValues.push(compItem.componentValue || '—');
              if (!compItem.matches) groupedComparisons[key].allMatch = false;
            });
            
            tableHTML += `<table class="pc-module-comparison-table">`;
            tableHTML += `<thead><tr><th>Хар-ка</th><th>Сборка</th><th>Товар</th></tr></thead><tbody>`;
            
            Object.entries(groupedComparisons).forEach(([featureName, data]) => {
              const uniquePcValues = [...new Set(data.pcValues)].sort((a, b) => a.localeCompare(b));
              const uniqueComponentValues = [...new Set(data.componentValues)].sort((a, b) => a.localeCompare(b));
              
              tableHTML += `<tr>`;
              tableHTML += `<td class="pc-module-feature-name">${featureName}</td>`;
              tableHTML += `<td class="${data.allMatch ? 'pc-module-value-match' : 'pc-module-value-mismatch'}">`;
              uniquePcValues.forEach((value, index) => {
                if (index > 0) tableHTML += '<br>';
                tableHTML += value;
              });
              tableHTML += `</td>`;
              tableHTML += `<td class="${data.allMatch ? 'pc-module-value-match' : 'pc-module-value-mismatch'}">`;
              uniqueComponentValues.forEach((value, index) => {
                if (index > 0) tableHTML += '<br>';
                if (data.formatAsRatio) {
                  tableHTML += `<span>${value}</span><span style="color:var(--pc-yellow); cursor:help;" title="Количество планок оперативной памяти указано для удобства анализа и выделено желтым цветом, в характеристике только данные выделенные белым цветом"> /${ramQuantity}</span>`;
                } else {
                  tableHTML += value;
                }
              });
              tableHTML += `</td>`;
              tableHTML += `</tr>`;
            });
            
            tableHTML += `</tbody></table>`;
          } else {
            tableHTML += `<div class="pc-module-empty-state" style="padding: 4px; font-size:10px;">${getNoDataMessage(comp.validation.status)}</div>`;
          }
          
          tableHTML += `</div>`;
        });
        tableHTML += '</td>';
      } else {
        tableHTML += '<td>—</td>';
      }
    }
  });
  
  tableHTML += '</tr>';
});
  
  tableHTML += '</tbody></table>';
  elements.componentsTableView.innerHTML = tableHTML;
}

  function renderImportFilters() {
    if (!moduleState.settings.showFilters?.import) {
      elements.importFilters.innerHTML = '';
      elements.importFilters.classList.add('hidden');
      return;
    }

    elements.importFilters.classList.remove('hidden');
    elements.importFilters.innerHTML = `
      <div class="pc-module-filters">
        <div class="pc-module-filter-group">
          <label>Поиск по коду ПК</label>
          <input type="text" id="importPcFilter" class="pc-module-filter-input" value="${moduleState.filters.import.pcCode}" placeholder="Введите код...">
        </div>
        <div class="pc-module-filter-group">
          <label>Поиск по названию</label>
          <input type="text" id="importNameFilter" class="pc-module-filter-input" value="${moduleState.filters.import.name}" placeholder="Введите название...">
        </div>
        <div class="pc-module-smart-filter">
          <input type="text" id="smartFilterInput" value="${moduleState.filters.import.smart}" placeholder="Поиск по всем колонкам...">
          <button id="applySmartFilter">Найти</button>
          <button id="clearSmartFilter" class="clear-btn" style="${moduleState.filters.import.smart ? 'display:inline-block' : 'display:none'}">✕</button>
        </div>
      </div>
    `;

    document.getElementById('importPcFilter')?.addEventListener('input', (e) => {
      moduleState.filters.import.pcCode = e.target.value.toLowerCase();
      filterImportTable();
    });

    document.getElementById('importNameFilter')?.addEventListener('input', (e) => {
      moduleState.filters.import.name = e.target.value.toLowerCase();
      filterImportTable();
    });

    document.getElementById('smartFilterInput')?.addEventListener('input', (e) => {
      moduleState.filters.import.smart = e.target.value.toLowerCase();
      const clearBtn = document.getElementById('clearSmartFilter');
      if (clearBtn) {
        clearBtn.style.display = moduleState.filters.import.smart ? 'inline-block' : 'none';
      }
      filterImportTable();
    });

    document.getElementById('applySmartFilter')?.addEventListener('click', () => {
      const input = document.getElementById('smartFilterInput');
      if (input) {
        moduleState.filters.import.smart = input.value.toLowerCase();
        filterImportTable();
      }
    });

    document.getElementById('clearSmartFilter')?.addEventListener('click', () => {
      const input = document.getElementById('smartFilterInput');
      if (input) {
        input.value = '';
        moduleState.filters.import.smart = '';
        document.getElementById('clearSmartFilter').style.display = 'none';
        filterImportTable();
      }
    });
  }

  function filterImportTable() {
    if (!moduleState.settings.showFilters?.import) {
      const rows = elements.importTableBody.querySelectorAll('tr');
      rows.forEach(row => row.classList.remove('pc-module-row-hidden'));
      return;
    }

    const rows = elements.importTableBody.querySelectorAll('tr');
    const headers = elements.importTableHeader.querySelectorAll('th');
    const pcFilter = moduleState.filters.import.pcCode;
    const nameFilter = moduleState.filters.import.name;
    const smartFilter = moduleState.filters.import.smart;

    rows.forEach(row => {
      const pcCodeCell = row.querySelector('td:nth-child(2)');
      const nameCell = row.querySelector('td:nth-child(3)');
      
      const pcCode = pcCodeCell?.textContent?.toLowerCase() || '';
      const name = nameCell?.textContent?.toLowerCase() || '';
      
      const matchesPc = pcFilter === '' || pcCode.includes(pcFilter);
      const matchesName = nameFilter === '' || name.includes(nameFilter);
      
      if (matchesPc && matchesName) {
        row.classList.remove('pc-module-row-hidden');
      } else {
        row.classList.add('pc-module-row-hidden');
      }
    });

    if (smartFilter) {
      const visibleRows = [...rows].filter(row => !row.classList.contains('pc-module-row-hidden'));
      
      headers.forEach((header, colIndex) => {
        if (colIndex < 2) return;
        
        const hasMatch = visibleRows.some(row => 
          row.cells[colIndex]?.textContent.toLowerCase().includes(smartFilter)
        );
        
        if (!hasMatch) {
          header.classList.add('pc-module-column-hidden');
          visibleRows.forEach(row => {
            if (row.cells[colIndex]) {
              row.cells[colIndex].classList.add('pc-module-column-hidden');
            }
          });
        } else {
          header.classList.remove('pc-module-column-hidden');
          visibleRows.forEach(row => {
            if (row.cells[colIndex]) {
              if (row.cells[colIndex].textContent.toLowerCase().includes(smartFilter)) {
                row.cells[colIndex].classList.add('pc-module-column-highlight');
              } else {
                row.cells[colIndex].classList.remove('pc-module-column-highlight');
              }
              row.cells[colIndex].classList.remove('pc-module-column-hidden');
            }
          });
        }
      });
    } else {
      headers.forEach(header => header.classList.remove('pc-module-column-hidden'));
      rows.forEach(row => {
        [...row.cells].forEach(cell => {
          cell.classList.remove('pc-module-column-hidden', 'pc-module-column-highlight');
        });
      });
    }
  }

  function renderPriceTableWithFilters() {
    renderPriceFilters();
    filterPriceTable();
  }

  async function processAllModes(pcs) {
    await processMode(pcs, 'price');
    await processMode(pcs, 'components');
    await processImportMode(pcs);
  }

  async function processMode(pcs, mode) {
    const BATCH_SIZE = 25;
    const totalBatches = Math.ceil(pcs.length / BATCH_SIZE);

    moduleState.processingState = {
      totalPCs: pcs.length,
      processedPCs: 0,
      currentBatch: 0,
      totalBatches: totalBatches
    };

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, pcs.length);
      const batchPCs = pcs.slice(startIdx, endIdx);

      moduleState.processingState.currentBatch = batchIndex + 1;

      try {
        const batchToSend = batchPCs.map(pc => ({
          ...pc,
          excelPrice: pc.excelPrice ? normalizePrice(pc.excelPrice) : null,
          discountPrice: pc.discountPrice ? normalizePrice(pc.discountPrice) : null,
          parts: pc.parts.map(part => ({
            ...part,
            price: part.price ? normalizePrice(part.price) : null,
            rawName: cleanText(part.rawName || '')
          }))
        }));

        const response = await fetch('/api/analyze-pc-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            pcs: batchToSend,
            batchIndex: batchIndex,
            mode: mode,
            chatId: String(chatId || userData?.chat_id || '')
          })
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const { success, results, error } = await response.json();
        if (!success) throw new Error(error || 'Ошибка обработки партии');

        if (mode === 'price') {
          moduleState.resultsCache.priceResults[startIdx] = results;
        } else if (mode === 'components') {
          moduleState.resultsCache.componentResults[startIdx] = results;
        }

        updateBatchResults(results, startIdx, mode);
        moduleState.processingState.processedPCs += results.length;
        
      } catch (err) {
        markBatchAsFailed(batchPCs, startIdx, err.message, mode);
      }
    }
  }

  async function processImportMode(pcs) {
    await loadFeatureMappings();
    extractPCFeatures(pcs);
    updateImportTable();
  }

  async function loadFeatureMappings() {
    if (Object.keys(moduleState.featureColumnMapping).length > 0) {
      return;
    }
    
    try {
      const response = await fetch('/api/component-mappings');
      const { success, mappings } = await response.json();
      
      if (success && mappings) {
        const featureMapping = {};
        
        mappings.forEach(mapping => {
          const pcFeatureId = Object.keys(mapping.pc_to_component || {})[0];
          if (pcFeatureId) {
            const config = mapping.pc_to_component[pcFeatureId];
            featureMapping[pcFeatureId] = {
              name: config.name,
              componentFeatureId: config.componentFeatureId,
              checkType: mapping.check_type || 'feature',
              fixedInfo: mapping.fixed_info,
              featureType: mapping.feature_type || 'single',
              format_as_ratio: mapping.format_as_ratio || false
            };
          }
        });
        
        moduleState.featureColumnMapping = featureMapping;
      }
    } catch (err) {
      console.error('Error loading mappings for import table:', err);
    }
  }

function extractPCFeatures(pcs) {
  moduleState.pcFeaturesData = {};
  moduleState.selectedImportRows.clear();
  
  if (!moduleState.excelData || !moduleState.excelData.pcs) return;
  
  pcs.forEach(pc => {
    const pcCode = pc.code;
    const componentResults = moduleState.resultsCache.componentResults.flat().find(r => r?.code === pcCode);
    const ramQuantity = pc.parts.find(p => p.quantity > 1)?.quantity || 1;
    
    const pcFeatures = {
      pcCode: pcCode,
      pcName: pc.name || '',
      productId: componentResults?.fullProductData?.product?.product_id || null,
      features: {}
    };
    
    Object.entries(moduleState.featureColumnMapping).forEach(([featureId, mapping]) => {
      pcFeatures.features[featureId] = [];
    });
    
    if (componentResults && componentResults.parts) {
      componentResults.parts.forEach(part => {
        const validation = part.validation || {};
        
        if (validation.comparisons && validation.comparisons.length > 0) {
          validation.comparisons.forEach(comp => {
            let featureId = comp.featureId;
            
            if (!featureId) {
              for (const [id, mapping] of Object.entries(moduleState.featureColumnMapping)) {
                if (mapping.name === comp.featureName) {
                  featureId = id;
                  break;
                }
              }
            }
            
            if (featureId) {
              const valueToUse = comp.componentValue || '';
              const mapping = moduleState.featureColumnMapping[featureId];
              const formatAsRatio = mapping?.format_as_ratio || false;
              
              if (valueToUse) {
                const finalValue = formatAsRatio
                  ? `${valueToUse}/${ramQuantity}`
                  : valueToUse;
                if (!pcFeatures.features[featureId].includes(finalValue)) {
                  pcFeatures.features[featureId].push(finalValue);
                }
              }
            }
          });
        }
      });
    }

    Object.entries(moduleState.featureColumnMapping).forEach(([featureId, mapping]) => {
      if (mapping.featureType === 'gpu') {
        const hasGPU = componentResults?.parts?.some(part => {
          const compName = part.validation?.componentName || '';
          return detectComponentType(compName) === 'gpu';
        });
        pcFeatures.features[featureId] = [hasGPU ? 'Дискретный' : 'Встроенный'];
      }
    });
    
    moduleState.pcFeaturesData[pcCode] = pcFeatures;
    moduleState.selectedImportRows.add(pcCode);
  });
}

function updateImportTable() {
  const pcsData = Object.values(moduleState.pcFeaturesData);
  
  if (pcsData.length === 0) {
    elements.importTableBody.innerHTML = '<tr><td colspan="3" class="pc-module-empty-state">Нет данных для импорта</td></tr>';
    return;
  }
  
  renderImportTable(pcsData);
}

function renderImportTable(pcsData) {
  const baseColumns = [
    { key: 'pcCode', name: 'Код ПК' },
    { key: 'pcName', name: 'Название ПК' },
    { key: 'price', name: 'Цена' },
    { key: 'discountPrice', name: 'Цена со скидкой' }
  ];
  
  const featureColumns = Object.entries(moduleState.featureColumnMapping)
    .map(([featureId, mapping]) => ({
      key: `feature_${featureId}`,
      name: `${mapping.name} (${featureId})`,
      featureId: featureId
    }));
  
  const warehouseColumns = WAREHOUSE_MAPPING.map(w => ({
    key: `warehouse_${w.id}`,
    name: w.name,
    warehouseId: w.id
  }));
  
  const allColumns = [...baseColumns, ...featureColumns, ...warehouseColumns];
  
  let headerHTML = '<tr>';
  if (moduleState.settings.showProductCheckboxes) {
    headerHTML += '<th style="position: sticky; left: 0; z-index: 11; background: var(--pc-surface2); width: 30px;"><input type="checkbox" id="selectAllImport" checked></th>';
    headerHTML += `<th style="position: sticky; left: 30px; z-index: 11; background: var(--pc-surface2);">Код ПК</th>`;
    headerHTML += `<th style="position: sticky; left: 130px; z-index: 11; background: var(--pc-surface2);">Название ПК</th>`;
    allColumns.slice(2).forEach(col => {
      headerHTML += `<th>${col.name}</th>`;
    });
  } else {
    headerHTML += `<th style="position: sticky; left: 0; z-index: 11; background: var(--pc-surface2);">Код ПК</th>`;
    headerHTML += `<th style="position: sticky; left: 100px; z-index: 11; background: var(--pc-surface2);">Название ПК</th>`;
    allColumns.slice(2).forEach(col => {
      headerHTML += `<th>${col.name}</th>`;
    });
  }
  headerHTML += '</tr>';
  
  elements.importTableHeader.innerHTML = headerHTML;

  let bodyHTML = '';
  
  pcsData.forEach((pcData) => {
    const pc = moduleState.excelData?.pcs?.find(p => p.code === pcData.pcCode);
    bodyHTML += '<tr data-pc-code="' + pcData.pcCode + '">';
    
    if (moduleState.settings.showProductCheckboxes) {
      const checked = moduleState.selectedImportRows.has(pcData.pcCode) ? 'checked' : '';
      bodyHTML += `<td style="position: sticky; left: 0; z-index: 10; background: var(--pc-surface); text-align: center;"><input type="checkbox" class="pc-module-checkbox row-select" data-pc-code="${pcData.pcCode}" ${checked}></td>`;
      bodyHTML += `<td style="position: sticky; left: 30px; z-index: 10; background: var(--pc-surface);" class="feature-cell" data-pc-code="${pcData.pcCode}" data-column="pcCode">${createItemLink(pcData.pcCode, pcData.productId)}</td>`;
      bodyHTML += `<td style="position: sticky; left: 130px; z-index: 10; background: var(--pc-surface);" class="feature-cell" data-pc-code="${pcData.pcCode}" data-column="pcName">${pcData.pcName || '—'}</td>`;
    } else {
      bodyHTML += `<td style="position: sticky; left: 0; z-index: 10; background: var(--pc-surface);" class="feature-cell" data-pc-code="${pcData.pcCode}" data-column="pcCode">${createItemLink(pcData.pcCode, pcData.productId)}</td>`;
      bodyHTML += `<td style="position: sticky; left: 100px; z-index: 10; background: var(--pc-surface);" class="feature-cell" data-pc-code="${pcData.pcCode}" data-column="pcName">${pcData.pcName || '—'}</td>`;
    }

    allColumns.slice(2).forEach(col => {
      let cellContent = '';
      
      if (col.key === 'price') {
        cellContent = pc?.excelPrice ? formatPrice(pc.excelPrice) : '—';
      } else if (col.key === 'discountPrice') {
        cellContent = pc?.discountPrice ? formatPrice(pc.discountPrice) : '—';
      } else if (col.key.startsWith('feature_')) {
        const values = pcData.features[col.featureId] || [];
        cellContent = Array.isArray(values) ? values.join('///') : values;
      } else if (col.key.startsWith('warehouse_')) {
        cellContent = pc?.warehouses?.[col.warehouseId] || 0;
      }
      
      bodyHTML += `<td class="feature-cell" data-pc-code="${pcData.pcCode}" data-feature-id="${col.featureId || ''}" data-column="${col.key}">${cellContent}</td>`;
    });
    
    bodyHTML += '</tr>';
  });
  
  elements.importTableBody.innerHTML = bodyHTML;
  
  if (moduleState.settings.showProductCheckboxes) {
    const selectAll = document.getElementById('selectAllImport');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.row-select').forEach(cb => {
          cb.checked = checked;
          const pcCode = cb.dataset.pcCode;
          if (checked) {
            moduleState.selectedImportRows.add(pcCode);
          } else {
            moduleState.selectedImportRows.delete(pcCode);
          }
        });
      });
    }
    
    document.querySelectorAll('.row-select').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const pcCode = e.target.dataset.pcCode;
        if (e.target.checked) {
          moduleState.selectedImportRows.add(pcCode);
        } else {
          moduleState.selectedImportRows.delete(pcCode);
          const selectAll = document.getElementById('selectAllImport');
          if (selectAll) selectAll.checked = false;
        }
      });
    });
  }
  
  attachImportTableClickHandlers();
  renderImportFilters();
  filterImportTable();
  elements.downloadCSVButton.style.display = 'inline-block';
}

function attachImportTableClickHandlers() {
  const cells = elements.importTableBody.querySelectorAll('td[data-column]');
  cells.forEach(cell => {
    if (cell.dataset.column === 'pcCode') return;
    
    cell.addEventListener('click', () => {
      const pcCode = cell.dataset.pcCode;
      const featureId = cell.dataset.featureId;
      const columnKey = cell.dataset.column;
      const currentValue = cell.textContent.trim();
      
      let title = '';
      if (columnKey === 'pcName') {
        title = 'Редактировать название ПК';
      } else if (columnKey.startsWith('feature_')) {
        const mapping = moduleState.featureColumnMapping[featureId];
        title = `Редактировать: ${mapping?.name || 'Характеристика'}`;
      } else {
        return;
      }
      
      showCellEditModal(title, currentValue, (newValue) => {
        if (columnKey === 'pcName') {
          cell.textContent = newValue;
          moduleState.pcFeaturesData[pcCode].pcName = newValue;
        } else if (columnKey.startsWith('feature_')) {
          cell.textContent = newValue;
          moduleState.pcFeaturesData[pcCode].features[featureId] = newValue.split('///').map(v => v.trim()).filter(Boolean);
        }
        
        showToast('Значение обновлено', 'success');
      });
    });
  });
}

function showCellEditModal(title, currentValue, onSave) {
  const modal = document.createElement('div');
  modal.className = 'pc-module-modal active';
  modal.innerHTML = `
    <div class="pc-module-modal-content">
      <div class="pc-module-modal-header">
        <span>${title}</span>
        <button class="pc-module-modal-close">&times;</button>
      </div>
      <div class="pc-module-modal-body">
        <div class="pc-module-form-group">
          <label class="pc-module-form-label">Значение</label>
          <input type="text" id="editCellValue" class="pc-module-form-input" autofocus>
        </div>
      </div>
      <div class="pc-module-modal-actions">
        <button id="modalSaveCellBtn" class="pc-module-btn pc-module-btn-primary">Сохранить</button>
        <button id="modalCancelCellBtn" class="pc-module-btn pc-module-btn-secondary">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#editCellValue');
  input.value = currentValue;
  input.select();

  modal.querySelector('.pc-module-modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('#modalCancelCellBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('#modalSaveCellBtn').addEventListener('click', () => {
    const newValue = input.value.trim();
    onSave(newValue);
    document.body.removeChild(modal);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const newValue = input.value.trim();
      onSave(newValue);
      document.body.removeChild(modal);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

  function normalizePrice(price) {
    if (typeof price === 'string') {
      return parseFloat(price.replace(/\s/g, '').replace('руб', '').replace(',', '.'));
    }
    return parseFloat(price);
  }

  function formatPrice(price) {
    if (typeof price === 'string') {
      return price;
    }
    return price.toLocaleString('ru-RU');
  }

  function updateBatchResults(results, startIndex, mode) {
    results.forEach((result, index) => {
      const rowIndex = startIndex + index;
      if (mode === 'price') {
        updatePriceRow(rowIndex, result);
      } else if (mode === 'components') {
        if (rowIndex === 0) {
          const pcs = moduleState.excelData?.pcs || [];
          renderComponentsTable(pcs, moduleState.filters.components.component);
        }
      }
    });
  }

function updatePriceRow(rowIndex, result) {
  const row = document.getElementById(`price-row-${rowIndex}`);
  if (row) {
    const codeCell = row.querySelector('td:first-child');
    if (codeCell) {
      codeCell.innerHTML = createItemLink(result.code, result.fullProductData?.product?.product_id);
    }
  }

  const regPriceElement = document.getElementById(`price-reg-${rowIndex}`);
  const discPriceElement = document.getElementById(`price-disc-${rowIndex}`);
  
  if (regPriceElement) {
    const excelPrice = result.excelPrice;
    const websitePrice = result.websitePrice;
    const priceMatch = excelPrice && websitePrice && Math.abs(excelPrice - websitePrice) < 1;
    
    regPriceElement.className = priceMatch ? 'pc-module-cell-correct' : 'pc-module-cell-incorrect';
    regPriceElement.innerHTML = `<div>${excelPrice ? formatPrice(excelPrice) : '—'}/${websitePrice ? formatPrice(websitePrice) : '—'}</div>`;
  }
  
  if (discPriceElement) {
    const discountPrice = result.discountPrice;
    const siteListPrice = result.fullProductData?.product?.list_price ? 
      parseFloat(result.fullProductData.product.list_price) : null;
    const priceMatch = discountPrice && siteListPrice && Math.abs(discountPrice - siteListPrice) < 1;
    
    discPriceElement.className = priceMatch ? 'pc-module-cell-correct' : 
      (discountPrice || siteListPrice ? 'pc-module-cell-incorrect' : 'pc-module-cell-missing');
    discPriceElement.innerHTML = `<div>${discountPrice ? formatPrice(discountPrice) : '—'}/${siteListPrice ? formatPrice(siteListPrice) : '—'}</div>`;
  }
  
  if (result.fullProductData?.additional?.warehouses) {
    const fileWarehouses = moduleState.excelData.pcs.find(pc => pc.code === result.code)?.warehouses || {};
    const siteWarehouses = result.fullProductData.additional.warehouses;
    
    WAREHOUSE_MAPPING.forEach(w => {
      const element = document.getElementById(`wh-${rowIndex}-${w.id}`);
      if (element) {
        const fileAmount = fileWarehouses[w.id] || 0;
        const siteWarehouse = siteWarehouses.find(sw => sw.warehouse_id === w.id);
        const siteAmount = siteWarehouse ? parseInt(siteWarehouse.amount) : 0;
        
        let cellClass = 'pc-module-cell-missing';
        if (fileAmount > 0 || siteAmount > 0) {
          cellClass = fileAmount === siteAmount ? 'pc-module-cell-correct' : 'pc-module-cell-incorrect';
        }
        
        element.className = cellClass;
        element.innerHTML = `<div>${fileAmount}/${siteAmount}</div>`;
      }
    });
  }
}

  function getNoDataMessage(status) {
    const messages = {
      'missing': 'Компонент не найден',
      'no-data': 'Нет данных',
      'error': 'Ошибка проверки'
    };
    return messages[status] || 'Нет данных';
  }

function markBatchAsFailed(batchPCs, startIndex, errorMessage, mode) {
  batchPCs.forEach((pc, index) => {
    const rowIndex = startIndex + index;
    
    if (mode === 'price') {
      const regPriceElement = document.getElementById(`price-reg-${rowIndex}`);
      const discPriceElement = document.getElementById(`price-disc-${rowIndex}`);
      
      if (regPriceElement) {
        regPriceElement.className = 'pc-module-cell-incorrect';
        regPriceElement.innerHTML = '<div style="color: var(--pc-red);">Ошибка</div>';
      }
      
      if (discPriceElement) {
        discPriceElement.className = 'pc-module-cell-incorrect';
        discPriceElement.innerHTML = '<div style="color: var(--pc-red);">Ошибка</div>';
      }
      
      WAREHOUSE_MAPPING.forEach(w => {
        const element = document.getElementById(`wh-${rowIndex}-${w.id}`);
        if (element) {
          element.className = 'pc-module-cell-incorrect';
          element.innerHTML = '<div style="color: var(--pc-red);">Ошибка</div>';
        }
      });
    } else if (mode === 'components') {
      const componentsElement = document.getElementById(`components-${rowIndex}`);
      if (componentsElement) {
        componentsElement.className = 'pc-module-cell-incorrect';
        componentsElement.innerHTML = '<div style="color: var(--pc-red);">Ошибка анализа</div>';
      }
    }
  });
}

  async function preloadFeatureMappings() {
    try {
      const response = await fetch('/api/component-mappings');
      const { success, mappings } = await response.json();
      
      if (success && mappings) {
        const featureMapping = {};
        
        mappings.forEach(mapping => {
          const pcFeatureId = Object.keys(mapping.pc_to_component || {})[0];
          if (pcFeatureId) {
            const config = mapping.pc_to_component[pcFeatureId];
            featureMapping[pcFeatureId] = {
              name: config.name,
              componentFeatureId: config.componentFeatureId,
              checkType: mapping.check_type || 'feature',
              fixedInfo: mapping.fixed_info,
              featureType: mapping.feature_type || 'single',
              format_as_ratio: mapping.format_as_ratio || false
            };
          }
        });
        
        moduleState.featureColumnMapping = featureMapping;
      }
    } catch (err) {
      console.error('Error preloading mappings:', err);
    }
  }

  function enableModeSelector() {
    elements.modeImportButton.classList.remove('disabled');
  }

  function switchModeTable(mode) {
    [elements.priceTableContainer, elements.componentsTableContainer, elements.importTableContainer].forEach(el => {
      if (el) el.classList.remove('active');
    });
    
    elements.analysisResults.style.display = 'block';
    elements.downloadCSVButton.style.display = 'none';
    
    if (mode === 'price') {
      elements.priceTableContainer.classList.add('active');
      renderPriceTableWithFilters();
    } else if (mode === 'components') {
      elements.componentsTableContainer.classList.add('active');
      renderComponentsTableWithFilters();
    } else if (mode === 'import') {
      elements.importTableContainer.classList.add('active');
      renderImportFilters();
      if (Object.keys(moduleState.pcFeaturesData).length > 0) {
        renderImportTable(Object.values(moduleState.pcFeaturesData));
      }
      elements.downloadCSVButton.style.display = 'inline-block';
    }
    
    updateModeButtons(mode);
  }

  function updateModeButtons(activeMode) {
    [elements.modePriceButton, elements.modeComponentsButton, elements.modeImportButton].forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (activeMode === 'price') {
      elements.modePriceButton.classList.add('active');
    } else if (activeMode === 'components') {
      elements.modeComponentsButton.classList.add('active');
    } else if (activeMode === 'import') {
      elements.modeImportButton.classList.add('active');
    }
    
    moduleState.currentMode = activeMode;
  }

  function resetModeButtons() {
    [elements.modePriceButton, elements.modeComponentsButton, elements.modeImportButton].forEach(btn => {
      btn.classList.remove('active');
    });
    elements.modePriceButton.classList.add('active');
    moduleState.currentMode = 'price';
  }

async function downloadCSV() {
  const allPcsData = Object.values(moduleState.pcFeaturesData);
  const selectedPcsData = allPcsData.filter(pc => moduleState.selectedImportRows.has(pc.pcCode));
  
  if (selectedPcsData.length === 0) {
    showToast('Нет выбранных данных для экспорта', 'error');
    return;
  }

  try {
    const featureHeaders = Object.entries(moduleState.featureColumnMapping)
      .map(([featureId, mapping]) => `${mapping.name} (${featureId})`);

    const warehouseHeaders = WAREHOUSE_MAPPING.map(w => w.csCart);

    const headers = ['Product code', 'Language', 'Vendor', ...featureHeaders, ...warehouseHeaders];

    const csvRows = [
      headers.join(';'),
      ...selectedPcsData.map(pcData => {
        const pc = moduleState.excelData?.pcs?.find(p => p.code === pcData.pcCode);

        const featureValues = Object.entries(moduleState.featureColumnMapping).map(([featureId]) => {
          const values = pcData.features[featureId] || [];
          const joined = Array.isArray(values) ? values.join('///') : values;
          return `"${String(joined).replace(/"/g, '""')}"`;
        });

        const warehouseValues = WAREHOUSE_MAPPING.map(w => pc?.warehouses?.[w.id] || 0);

        return [
          `"${pcData.pcCode}"`,
          '"ru"',
          '"Хайтек"',
          ...featureValues,
          ...warehouseValues
        ].join(';');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pc_features_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('CSV файл скачан', 'success');
    
  } catch (err) {
    console.error('Error generating CSV:', err);
    showToast(`Ошибка при скачивании CSV: ${err.message}`, 'error');
  }
}

  async function loadMappings() {
    try {
      elements.mappingsList.innerHTML = '<div class="pc-module-loading">Загрузка маппингов...</div>';
      
      const response = await fetch('/api/component-mappings');
      const { success, mappings, error } = await response.json();
      
      if (!success) {
        throw new Error(error || 'Failed to load mappings');
      }
      
      mappingState.currentMappings = mappings || [];
      renderMappingsTable();
      
    } catch (err) {
      console.error('Error loading mappings:', err);
      elements.mappingsList.innerHTML = `<div class="pc-module-empty-state" style="color: var(--pc-red);">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  function renderMappingsTable() {
    if (mappingState.currentMappings.length === 0) {
      elements.mappingsList.innerHTML = '<div class="pc-module-empty-state">Нет сохраненных маппингов</div>';
      return;
    }

    let tableHTML = `
      <table class="pc-module-mapping-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Тип проверки</th>
            <th>ID хар. ПК</th>
            <th>ID хар. компонента</th>
            <th>Тип товара</th>
            <th>Тип хар-ки</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
    `;

    mappingState.currentMappings.forEach(mapping => {
      const mappingData = mapping.pc_to_component || {};
      const pcFeatureId = Object.keys(mappingData)[0];
      const mappingConfig = mappingData[pcFeatureId];
      
      if (!pcFeatureId || !mappingConfig) return;

      const checkTypeDisplay = {
        'feature': 'Характеристика',
        'model': 'Модель',
        'fixed': 'Фиксированное'
      }[mapping.check_type] || mapping.check_type;

      tableHTML += `
        <tr>
          <td><span class="pc-module-mapping-id">${mapping.id}</span></td>
          <td>${mappingConfig.name || '—'}</td>
          <td>${checkTypeDisplay}</td>
          <td><span class="pc-module-mapping-id">${pcFeatureId}</span></td>
          <td><span class="pc-module-mapping-id">${mappingConfig.componentFeatureId || '—'}</span></td>
          <td>${mapping.fixed_info || '—'}</td>
          <td>${mapping.feature_type || '_'}</td>
          <td>
            <div class="pc-module-mapping-actions">
              <button class="pc-module-icon-btn edit" data-id="${mapping.id}">✏️</button>
              <button class="pc-module-icon-btn delete" data-id="${mapping.id}">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    elements.mappingsList.innerHTML = tableHTML;

    attachMappingEventListeners();
  }

  function attachMappingEventListeners() {
    elements.mappingsList.querySelectorAll('.pc-module-icon-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        editMapping(id);
      });
    });

    elements.mappingsList.querySelectorAll('.pc-module-icon-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        deleteMapping(id);
      });
    });
  }

function showMappingModal(editingId = null) {
  const modal = document.createElement('div');
  modal.className = 'pc-module-modal active';
  modal.innerHTML = `
    <div class="pc-module-modal-content">
      <div class="pc-module-modal-header">
        <span>${editingId ? 'Редактировать маппинг' : 'Новый маппинг'}</span>
        <button class="pc-module-modal-close">&times;</button>
      </div>
      <div class="pc-module-modal-body">
        <div class="pc-module-form-group">
          <label class="pc-module-form-label">ID характеристики ПК</label>
          <input type="text" id="modalPcFeatureId" class="pc-module-form-input" placeholder="2451">
        </div>
        
        <div class="pc-module-form-group">
          <label class="pc-module-form-label">Название характеристики</label>
          <input type="text" id="modalFeatureName" class="pc-module-form-input" placeholder="Производитель">
        </div>
        
        <div class="pc-module-form-group">
          <label class="pc-module-form-label">Тип проверки</label>
          <select id="modalCheckType" class="pc-module-form-select">
            <option value="feature">Характеристика</option>
            <option value="model">Модель</option>
            <option value="fixed">Фиксированное значение</option>
          </select>
        </div>
        
        <div class="pc-module-form-group" id="componentFeatureIdGroup">
          <label class="pc-module-form-label">ID характеристики компонента</label>
          <input type="text" id="modalComponentFeatureId" class="pc-module-form-input" placeholder="1715">
          <div class="pc-module-form-help">Оставьте пустым, если характеристика не должна сравниваться</div>
        </div>

        <div class="pc-module-form-group" id="componentFeatureId2Group" style="display: none;">
          <label class="pc-module-form-label">ID характеристики компонента (запасной)</label>
          <input type="text" id="modalComponentFeatureId2" class="pc-module-form-input" placeholder="97">
          <div class="pc-module-form-help">Используется если основная характеристика не найдена</div>
        </div>
        
        <div class="pc-module-form-group" id="fixedInfoGroup" style="display: none;">
          <label class="pc-module-form-label">Тип товара (feature 3987)</label>
          <input type="text" id="modalFixedInfo" class="pc-module-form-input" placeholder="Например: Процессоры">
          <div class="pc-module-form-help">Укажите значение из feature_id 3987 для проверки</div>
        </div>
        
        <div class="pc-module-form-group">
          <label class="pc-module-form-label">Тип характеристики</label>
          <select id="modalFeatureType" class="pc-module-form-select">
            <option value="single">Одиночная</option>
            <option value="multiple">Множественная</option>
            <option value="either">Either (с запасным ID)</option>
          </select>
          <div class="pc-module-form-help">Either — проверяет основной ID, при отсутствии использует запасной</div>
        </div>

        <div class="pc-module-form-group">
          <div class="pc-module-setting-item">
            <span class="pc-module-setting-label">Показывать как соотношение (total/installed)</span>
            <label class="pc-module-toggle">
              <input type="checkbox" id="modalFormatAsRatio">
              <span class="pc-module-slider"></span>
            </label>
          </div>
          <div class="pc-module-form-help">Для характеристик типа "слоты/установлено" (например, слоты памяти)</div>
        </div>
      </div>
      <div class="pc-module-modal-actions">
        <button id="modalSaveMappingBtn" class="pc-module-btn pc-module-btn-primary">Сохранить</button>
        <button id="modalCancelMappingBtn" class="pc-module-btn pc-module-btn-secondary">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const checkTypeSelect = modal.querySelector('#modalCheckType');
  const featureTypeSelect = modal.querySelector('#modalFeatureType');
  const componentFeatureIdGroup = modal.querySelector('#componentFeatureIdGroup');
  const componentFeatureId2Group = modal.querySelector('#componentFeatureId2Group');
  const fixedInfoGroup = modal.querySelector('#fixedInfoGroup');

  function updateFormVisibility() {
    if (checkTypeSelect.value === 'feature') {
      componentFeatureIdGroup.style.display = 'block';
      fixedInfoGroup.style.display = 'none';
    } else {
      componentFeatureIdGroup.style.display = 'none';
      fixedInfoGroup.style.display = 'block';
    }
    componentFeatureId2Group.style.display =
      checkTypeSelect.value === 'feature' && featureTypeSelect.value === 'either' ? 'block' : 'none';
  }

  checkTypeSelect.addEventListener('change', updateFormVisibility);
  featureTypeSelect.addEventListener('change', updateFormVisibility);

  if (editingId) {
    const mapping = mappingState.currentMappings.find(m => m.id == editingId);
    if (mapping && mapping.pc_to_component) {
      const pcFeatureId = Object.keys(mapping.pc_to_component)[0];
      const mappingConfig = mapping.pc_to_component[pcFeatureId];

      document.getElementById('modalPcFeatureId').value = pcFeatureId;
      document.getElementById('modalFeatureName').value = mappingConfig.name || '';
      document.getElementById('modalComponentFeatureId').value = mappingConfig.componentFeatureId || '';
      document.getElementById('modalComponentFeatureId2').value = mappingConfig.componentFeatureId2 || '';
      document.getElementById('modalCheckType').value = mapping.check_type || 'feature';
      document.getElementById('modalFixedInfo').value = mapping.fixed_info || '';
      document.getElementById('modalFeatureType').value = mapping.feature_type || 'single';
      document.getElementById('modalFormatAsRatio').checked = mapping.format_as_ratio || false;

      updateFormVisibility();
    }
  }

  modal.querySelector('.pc-module-modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('#modalCancelMappingBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('#modalSaveMappingBtn').addEventListener('click', () => {
    saveMappingFromModal(modal, editingId);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function saveMappingFromModal(modal, editingId) {
  const pcFeatureId = document.getElementById('modalPcFeatureId').value.trim();
  const featureName = document.getElementById('modalFeatureName').value.trim();
  const componentFeatureId = document.getElementById('modalComponentFeatureId').value.trim();
  const componentFeatureId2 = document.getElementById('modalComponentFeatureId2').value.trim();
  const checkType = document.getElementById('modalCheckType').value;
  const fixedInfo = document.getElementById('modalFixedInfo').value.trim();
  const featureType = document.getElementById('modalFeatureType').value;
  const formatAsRatio = document.getElementById('modalFormatAsRatio').checked;

  if (!pcFeatureId || !featureName) {
    showToast('Заполните ID характеристики ПК и название', 'error');
    return;
  }

  if (checkType === 'feature' && !componentFeatureId && featureType !== 'either') {
    showToast('Для типа "Характеристика" укажите ID характеристики компонента', 'error');
    return;
  }

  if (checkType === 'feature' && featureType === 'either' && (!componentFeatureId || !componentFeatureId2)) {
    showToast('Для типа "Either" укажите оба ID характеристик компонента', 'error');
    return;
  }

  if ((checkType === 'model' || checkType === 'fixed') && !fixedInfo) {
    showToast(`Для типа "${checkType === 'model' ? 'Модель' : 'Фиксированное значение'}" укажите значение`, 'error');
    return;
  }

  try {
    const mappingConfig = {
      name: featureName,
      componentFeatureId: checkType === 'feature' ? (componentFeatureId || null) : null
    };

    if (checkType === 'feature' && featureType === 'either' && componentFeatureId2) {
      mappingConfig.componentFeatureId2 = componentFeatureId2;
    }

    const mappingData = { [pcFeatureId]: mappingConfig };

    const url = editingId
      ? `/api/component-mappings/${editingId}`
      : '/api/component-mappings';

    const method = editingId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pc_to_component: mappingData,
        check_type: checkType,
        fixed_info: fixedInfo || null,
        feature_type: featureType,
        format_as_ratio: formatAsRatio
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to save mapping');
    }

    showToast(`Маппинг ${editingId ? 'обновлен' : 'создан'}`, 'success');
    document.body.removeChild(modal);
    loadMappings();

    if (moduleState.excelData) {
      await loadFeatureMappings();
      updateImportTable();
    }

  } catch (err) {
    console.error('Error saving mapping:', err);
    showToast(`Ошибка сохранения: ${err.message}`, 'error');
  }
}

  async function deleteMapping(id) {
    if (!confirm('Удалить этот маппинг?')) return;

    try {
      const response = await fetch(`/api/component-mappings/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete mapping');
      }

      showToast('Маппинг удален', 'success');
      loadMappings();
      
      if (moduleState.excelData) {
        await loadFeatureMappings();
        updateImportTable();
      }

    } catch (err) {
      console.error('Error deleting mapping:', err);
      showToast(`Ошибка удаления: ${err.message}`, 'error');
    }
  }

  function editMapping(id) {
    showMappingModal(id);
  }

  function showConfirmationModal(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'pc-module-modal active';
    modal.innerHTML = `
      <div class="pc-module-modal-content">
        <div class="pc-module-modal-header">
          <span>${title}</span>
          <button class="pc-module-modal-close">&times;</button>
        </div>
        <div class="pc-module-modal-body">
          <p style="color: var(--pc-text); margin:0;">${message}</p>
        </div>
        <div class="pc-module-modal-actions">
          <button id="modalConfirmBtn" class="pc-module-btn pc-module-btn-primary">Подтвердить</button>
          <button id="modalCancelBtn" class="pc-module-btn pc-module-btn-secondary">Отмена</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.pc-module-modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#modalCancelBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#modalConfirmBtn').addEventListener('click', () => {
      onConfirm();
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  const tabBtns = document.querySelectorAll('.pc-module-tab-btn');
  const tabContents = document.querySelectorAll('.pc-module-tab-content');
  
  tabBtns.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      tabBtns.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabContents.forEach(c => c.classList.remove('active'));
      document.getElementById(tabId === 'analysis' ? 'analysisTab' : 'mappingTab').classList.add('active');
      
      if (tabId === 'mapping') {
        loadMappings();
      }
    });
  });

  elements.modePriceButton.addEventListener('click', () => {
    if (!elements.modeImportButton.classList.contains('disabled')) {
      switchModeTable('price');
    }
  });

  elements.modeComponentsButton.addEventListener('click', () => {
    if (!elements.modeImportButton.classList.contains('disabled')) {
      switchModeTable('components');
    }
  });

  elements.modeImportButton.addEventListener('click', () => {
    if (!elements.modeImportButton.classList.contains('disabled')) {
      switchModeTable('import');
    }
  });

  elements.downloadCSVButton.addEventListener('click', downloadCSV);
  elements.addMappingBtn.addEventListener('click', () => showMappingModal());
  elements.refreshMappingsBtn.addEventListener('click', loadMappings);

  setupFileUpload();
  loadUserSettings();
  renderSettings();
  await preloadFeatureMappings();

  return {
    cleanup: () => {
      document.head.removeChild(styleEl);
    }
  };
}