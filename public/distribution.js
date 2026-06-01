export async function loadModule(container, { state }) {

  if (!state.chatId) {
      throw new Error("No chatId in state — cannot load module.");
  }

  container.innerHTML = `
  <div class="dist-module-wrapper">
    <div class="dist-tabs">
      <div class="dist-tab active" data-tab="distribution">Распределение</div>
      <div class="dist-tab" data-tab="relocation">Перемещение</div>
      <div class="dist-tab" data-tab="settings">Настройки</div>
      <div class="dist-tab" data-tab="limits">Ограничения (Р)</div>
      <div class="dist-tab" data-tab="limitsr">Ограничения (П)</div>
    </div>

    <div id="distributionTab" class="dist-tab-content active">
      <div class="dist-card">
        <div class="dist-card-header">
          <h3>Загрузка файлов</h3>
        </div>
        
        <div class="dist-file-row">
          <div class="dist-file-container">
            <p>Файл распределения</p>
            <input type="file" id="distributionFile" accept=".xlsx,.xls" style="display: none;">
            <button id="uploadDistributionBtn" class="dist-upload-btn">Выбрать файл</button>
            <div id="distributionFileName" style="margin-top: 8px; font-size: 12px; color: var(--dist-text-muted);"></div>
          </div>

          <div class="dist-file-container">
            <p>Файл остатков и продаж</p>
            <input type="file" id="stockSalesFile" accept=".xlsx,.xls" style="display: none;">
            <button id="uploadStockSalesBtn" class="dist-upload-btn">Выбрать файл</button>
            <div id="stockSalesFileName" style="margin-top: 8px; font-size: 12px; color: var(--dist-text-muted);">&nbsp;</div>
          </div>

          <div class="dist-file-container">
            <p>Анализ данных</p>
            <button id="analyzeBtn" class="dist-analyze-btn" disabled>Анализировать</button>
          </div>
        </div>
      </div>

      <div id="distributionNotification" class="dist-notification"></div>
      
      <div id="distributionResults" class="dist-results" style="display: none;">
        <div class="dist-card">
          <div class="dist-card-header">
            <h3>Результаты распределения</h3>
          </div>
          
          <div class="dist-table-view">
            <table id="distributionTable" class="dist-table">
              <thead>
                <tr class="dist-tr">
                  <th class="dist-th">Артикул</th>
                  <th class="dist-th">Доступно</th>
                 </tr>
              </thead>
              <tbody id="distributionTableBody">
              </tbody>
             </table>
          </div>

          <div class="dist-actions">
            <button id="resetDistributionBtn" class="dist-reset-btn">Сбросить распределение</button>
            <button id="downloadDistributionBtn" class="dist-upload-btn">Скачать файл</button>
          </div>
        </div>
      </div>
    </div>

    <div id="relocationTab" class="dist-tab-content">
      <div class="dist-card">
        <div class="dist-card-header">
          <h3>Загрузка файлов</h3>
        </div>
        
        <div class="dist-file-row">
          <div class="dist-file-container">
            <p>Файл остатков и продаж</p>
            <input type="file" id="relocationStockSalesFile" accept=".xlsx,.xls" style="display: none;">
            <button id="relocationUploadStockSalesBtn" class="dist-upload-btn">Выбрать файл</button>
            <div id="relocationStockSalesFileName" style="margin-top: 8px; font-size: 12px; color: var(--dist-text-muted);">&nbsp;</div>
          </div>

          <div class="dist-file-container">
            <p>Анализ данных</p>
            <button id="relocationAnalyzeBtn" class="dist-analyze-btn" disabled>Анализировать</button>
          </div>
        </div>
      </div>

      <div id="relocationNotification" class="dist-notification"></div>

      <div class="dist-filter-container">
        <div class="dist-filter-header" id="relocationFilterToggle">
          <span>Фильтры перемещения</span>
          <span>▲</span>
        </div>

        <div class="dist-filter-content" id="relocationFilterContent">
          <div class="dist-filter-section">
            <strong>Фильтр групп:</strong>
            <input type="text" id="groupFilterInput" class="dist-filter-input" placeholder="Начните вводить...">
            <select id="groupDropdown" multiple></select>
          </div>

          <div class="dist-filter-section">
            <strong>Фильтр типов:</strong>
            <input type="text" id="typeFilterInput" class="dist-filter-input" placeholder="Начните вводить...">
            <select id="typeDropdown" multiple></select>
          </div>

          <div class="dist-filter-section">
            <strong>Выбранные группы:</strong>
            <ul id="selectedGroupsList"></ul>
          </div>

          <div class="dist-filter-section">
            <strong>Выбранные типы:</strong>
            <ul id="selectedTypesList"></ul>
          </div>

          <div class="dist-filter-section">
            <strong>&nbsp;</strong>
            <button id="resetFiltersBtn" class="dist-upload-btn" style="width: 100%;">Сбросить фильтры</button>
          </div>

          <div class="dist-filter-section">
            <strong>&nbsp;</strong>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="includeDiscounts"> Перемещать уценку
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="regionalRelocation"> Перемещать по региону
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="includeNewItems"> Перемещать новые товары
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="respectRelocationLimits"> Учитывать исключения
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="useSalesInRelocation"> Учитывать продажи
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="keepMinimumWhenSales"> Оставлять минимум 1 шт.
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="dontRelocateMoreThanSales"> Не перемещать больше реализации
            </label>
            <label class="dist-filter-checkbox">
              <input type="checkbox" id="respectMaximumLimits"> Учитывать максимумы
            </label>
          </div>

          <div class="dist-filter-section">
            <button id="typeFilterActionBtn" class="dist-analyze-btn" style="width: 100%;">Применить фильтры</button>
          </div>
        </div>
      </div>

      <div id="relocationResults" class="dist-results" style="display: none;">
        <div class="dist-card">
          <div class="dist-card-header">
            <h3>Результаты перемещения</h3>
          </div>
          
          <div class="dist-table-view">
            <table id="relocationTable" class="dist-table">
              <thead>
                 <tr>
                  <th class="dist-th">Артикул</th>
                  <th class="dist-th">Доступно</th>
                  <th class="dist-th">Месяцев в магазине</th>
                 </tr>
              </thead>
              <tbody id="relocationTableBody">
              </tbody>
             </table>
          </div>

          <div class="dist-actions">
            <button id="resetRelocationBtn" class="dist-reset-btn">Сбросить</button>
            <button id="sendMailBtn" class="dist-upload-btn">Отправить на почту</button>
            <button id="previewMailBtn" class="dist-upload-btn">Предпросмотр</button>
            <button id="downloadRelocationBtn" class="dist-upload-btn">Скачать файл</button>
          </div>
        </div>
      </div>
    </div>

    <div id="settingsTab" class="dist-tab-content">
      <div class="dist-card">
        <div class="dist-card-header">
          <h3>Настройки магазинов</h3>
        </div>
        
        <div class="dist-table-view">
          <table id="shopsTable" class="dist-table">
            <thead>
               <tr>
                <th class="dist-th">Название магазина</th>
                <th class="dist-th">Email</th>
                <th class="dist-th">Приоритет</th>
                <th class="dist-th">Распределять</th>
                <th class="dist-th">Перемещать</th>
                <th class="dist-th">Действия</th>
               </tr>
            </thead>
            <tbody id="shopsList">
            </tbody>
           </table>
        </div>
      </div>
      <div id="settingsNotification" class="dist-notification"></div>
    </div>

    <div id="limitsTab" class="dist-tab-content">
      <div class="dist-card">
        <div class="dist-card-header">
          <h3>Ограничения для распределения</h3>
          <button id="addLimitRowBtn" class="dist-upload-btn">Добавить строку</button>
        </div>
        
        <div class="dist-table-view">
          <table id="limitsTable" class="dist-table">
            <thead>
              <tr id="limitsHeaderRow">
                <th class="dist-th">Тип товара</th>
                <th class="dist-th">Массовое изменение</th>
                <th class="dist-th">Удалить</th>
               </tr>
            </thead>
            <tbody id="limitsTableBody">
            </tbody>
           </table>
        </div>
        
        <div class="dist-actions">
          <button id="saveLimitsBtn" class="dist-analyze-btn">Сохранить</button>
        </div>
      </div>
    </div>

    <div id="limitsrTab" class="dist-tab-content">
      <div class="dist-card">
        <div class="dist-card-header">
          <h3>Ограничения для перемещения</h3>
          <button id="addLimitRowBtnr" class="dist-upload-btn">Добавить строку</button>
        </div>
        
        <div class="dist-table-view">
          <table id="limitsTabler" class="dist-table">
            <thead>
              <tr id="limitsHeaderRowr">
                <th class="dist-th">Тип товара</th>
                <th class="dist-th">Массовое изменение</th>
                <th class="dist-th">Удалить</th>
               </tr>
            </thead>
            <tbody id="limitsTableBodyr">
            </tbody>
           </table>
        </div>
        
        <div class="dist-actions">
          <button id="saveLimitsBtnr" class="dist-analyze-btn">Сохранить</button>
        </div>
      </div>
    </div>

    <div id="relocationModal" class="dist-modal">
      <div class="dist-modal-content">
        <div class="dist-modal-header">
          <span>Перемещение товара</span>
          <button class="dist-modal-close">&times;</button>
        </div>
        <div class="dist-modal-body">
          <div class="dist-form-group">
            <label>Артикул</label>
            <input type="text" id="relocationItemArticle" class="dist-form-input" readonly>
          </div>
          <div class="dist-form-group">
            <label>Описание</label>
            <input type="text" id="relocationItemDescription" class="dist-form-input" readonly>
          </div>
          <div class="dist-form-group">
            <label>Из магазина</label>
            <input type="text" id="relocationFromShop" class="dist-form-input" readonly>
          </div>
          <div class="dist-form-group">
            <label>В магазин</label>
            <select id="relocationToShop" class="dist-form-select"></select>
          </div>
          <div class="dist-form-group">
            <label>Количество</label>
            <input type="number" id="relocationAmount" class="dist-form-input" min="1" value="1">
          </div>
        </div>
        <div class="dist-modal-footer">
          <button id="cancelRelocation" class="dist-reset-btn">Отмена</button>
          <button id="confirmRelocation" class="dist-analyze-btn">Подтвердить</button>
        </div>
      </div>
    </div>

    <div id="confirmationModal" class="dist-modal">
      <div class="dist-modal-content">
        <div class="dist-modal-header">
          <span>Подтверждение</span>
          <button class="dist-modal-close">&times;</button>
        </div>
        <div class="dist-modal-body">
          <p style="color: var(--dist-text); margin: 0;" id="confirmationMessage">Вы уверены?</p>
        </div>
        <div class="dist-modal-footer">
          <button id="confirmNo" class="dist-reset-btn">Нет</button>
          <button id="confirmYes" class="dist-analyze-btn">Да</button>
        </div>
      </div>
    </div>

    <div id="previewModal" class="dist-modal">
      <div class="dist-modal-content" style="max-width: 800px;">
        <div class="dist-modal-header">
          <span>Предпросмотр писем</span>
          <button class="dist-modal-close" id="closePreviewBtn">&times;</button>
        </div>
        <div class="dist-modal-body" id="previewContent">
        </div>
      </div>
    </div>
  </div>
`;

  const moduleState = {
    currentTab: 'distribution',
    shops: [],
    distributionFile: null,
    stockSalesFile: null,
    distributionResults: null,
    shopsPriorityMap: {},
    shopsDistributeMap: {},
    stockSalesData: {},
    shopNameMap: {},
    fileSettings: [],
    relocationData: {
      currentItem: null,
      fromShop: null,
      relocations: []
    },
    XLSX: null
  };

  const elements = {
    tabs: document.querySelectorAll(".dist-tab"),
    tabContents: document.querySelectorAll(".dist-tab-content"),
    distributionTab: document.getElementById("distributionTab"),
    settingsTab: document.getElementById("settingsTab"),
    limitsTab: document.getElementById("limitsTab"),
    limitsrTab: document.getElementById("limitsrTab"),
    uploadDistributionBtn: document.getElementById("uploadDistributionBtn"),
    distributionFile: document.getElementById("distributionFile"),
    distributionFileName: document.getElementById("distributionFileName"),
    uploadStockSalesBtn: document.getElementById("uploadStockSalesBtn"),
    stockSalesFile: document.getElementById("stockSalesFile"),
    stockSalesFileName: document.getElementById("stockSalesFileName"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    distributionNotification: document.getElementById("distributionNotification"),
    shopsTable: document.getElementById("shopsTable"),
    shopsList: document.getElementById("shopsList"),
    settingsNotification: document.getElementById("settingsNotification"),
    distributionResults: document.getElementById("distributionResults"),
    distributionTable: document.getElementById("distributionTable"),
    distributionTableBody: document.getElementById("distributionTableBody"),
    resetDistributionBtn: document.getElementById("resetDistributionBtn"),
    downloadDistributionBtn: document.getElementById("downloadDistributionBtn"),
    fileInputsRow: document.querySelector('.dist-file-row'),
    relocationStockSalesFile: document.getElementById("relocationStockSalesFile"),
    relocationUploadStockSalesBtn: document.getElementById("relocationUploadStockSalesBtn"),
    relocationStockSalesFileName: document.getElementById("relocationStockSalesFileName"),
    relocationAnalyzeBtn: document.getElementById("relocationAnalyzeBtn"),
    relocationResults: document.getElementById("relocationResults"),
    relocationTableBody: document.getElementById("relocationTableBody"),
    resetRelocationBtn: document.getElementById("resetRelocationBtn"),
    sendMailBtn: document.getElementById("sendMailBtn"),
    previewMailBtn: document.getElementById("previewMailBtn"),
    downloadRelocationBtn: document.getElementById("downloadRelocationBtn"),
    relocationFilterToggle: document.getElementById("relocationFilterToggle"),
    relocationFilterContainer: document.querySelector(".dist-filter-container"),
    groupFilterInput: document.getElementById("groupFilterInput"),
    typeFilterInput: document.getElementById("typeFilterInput"),
    groupDropdown: document.getElementById("groupDropdown"),
    typeDropdown: document.getElementById("typeDropdown"),
    selectedGroupsList: document.getElementById("selectedGroupsList"),
    selectedTypesList: document.getElementById("selectedTypesList"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    typeFilterActionBtn: document.getElementById("typeFilterActionBtn"),
    includeDiscounts: document.getElementById("includeDiscounts"),
    regionalRelocation: document.getElementById("regionalRelocation"),
    includeNewItems: document.getElementById("includeNewItems"),
    respectRelocationLimits: document.getElementById("respectRelocationLimits"),
    useSalesInRelocation: document.getElementById("useSalesInRelocation"),
    keepMinimumWhenSales: document.getElementById("keepMinimumWhenSales"),
    dontRelocateMoreThanSales: document.getElementById("dontRelocateMoreThanSales"),
    respectMaximumLimits: document.getElementById("respectMaximumLimits"),
    addLimitRowBtn: document.getElementById("addLimitRowBtn"),
    limitsTableBody: document.getElementById("limitsTableBody"),
    saveLimitsBtn: document.getElementById("saveLimitsBtn"),
    addLimitRowBtnr: document.getElementById("addLimitRowBtnr"),
    limitsTableBodyr: document.getElementById("limitsTableBodyr"),
    saveLimitsBtnr: document.getElementById("saveLimitsBtnr"),
    relocationModal: document.getElementById("relocationModal"),
    relocationItemArticle: document.getElementById("relocationItemArticle"),
    relocationItemDescription: document.getElementById("relocationItemDescription"),
    relocationFromShop: document.getElementById("relocationFromShop"),
    relocationToShop: document.getElementById("relocationToShop"),
    relocationAmount: document.getElementById("relocationAmount"),
    cancelRelocation: document.getElementById("cancelRelocation"),
    confirmRelocation: document.getElementById("confirmRelocation"),
    confirmationModal: document.getElementById("confirmationModal"),
    confirmationMessage: document.getElementById("confirmationMessage"),
    confirmYes: document.getElementById("confirmYes"),
    confirmNo: document.getElementById("confirmNo"),
    previewModal: document.getElementById("previewModal"),
    previewContent: document.getElementById("previewContent"),
    closePreviewBtn: document.getElementById("closePreviewBtn")
  };

  async function loadXLSX() {
    if (moduleState.XLSX) return moduleState.XLSX;
    try {
      moduleState.XLSX = await import('https://cdn.sheetjs.com/xlsx-0.19.3/package/xlsx.mjs');
      return moduleState.XLSX;
    } catch (error) {
      throw new Error('Не удалось загрузить библиотеку для работы с Excel. Проверьте подключение к интернету.');
    }
  }

  function normalizeShopName(shopName) {
    if (!shopName) return '';
    return shopName.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function populateTypeDropdown(items, filter = '') {
    const dropdown = elements.typeDropdown;
    if (!dropdown) return;
    
    dropdown.innerHTML = '';

    const uniqueTypes = [...new Set(items.map(i => i.type).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    uniqueTypes
      .filter(type => type.toLowerCase().includes(filter.toLowerCase()))
      .forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        dropdown.appendChild(option);
      });
  }

  function applyRelocationFilters() {
    const typeDropdown = elements.typeDropdown;
    const groupDropdown = elements.groupDropdown;
    const selectedTypes = Array.from(typeDropdown.selectedOptions).map(opt => opt.value);
    const selectedGroups = Array.from(groupDropdown.selectedOptions).map(opt => opt.value);

    moduleState.filteredRelocationItems = moduleState.relocationItems.filter(item => {
      if (selectedTypes.length === 0 && selectedGroups.length === 0) {
        return true;
      }
      if (selectedTypes.length === 0) {
        return selectedGroups.includes(item.group);
      }
      if (selectedGroups.length === 0) {
        return selectedTypes.includes(item.type);
      }
      return selectedTypes.includes(item.type) && selectedGroups.includes(item.group);
    });

    const availableTypes = [...new Set(
      (selectedGroups.length === 0
        ? moduleState.relocationItems
        : moduleState.relocationItems.filter(item => selectedGroups.includes(item.group))
      )
      .map(i => i.type)
      .filter(Boolean)
    )].sort();

    const availableGroups = [...new Set(
      (selectedTypes.length === 0
        ? moduleState.relocationItems
        : moduleState.relocationItems.filter(item => selectedTypes.includes(item.type))
      )
      .map(i => i.group)
      .filter(Boolean)
    )].sort();

    const validSelectedTypes = selectedTypes.filter(t => availableTypes.includes(t));
    const validSelectedGroups = selectedGroups.filter(g => availableGroups.includes(g));

    typeDropdown.innerHTML = '';
    availableTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (validSelectedTypes.includes(type)) option.selected = true;
      typeDropdown.appendChild(option);
    });

    groupDropdown.innerHTML = '';
    availableGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      if (validSelectedGroups.includes(group)) option.selected = true;
      groupDropdown.appendChild(option);
    });

    const typeList = elements.selectedTypesList;
    typeList.innerHTML = '';
    validSelectedTypes.forEach(type => {
      const li = document.createElement('li');
      li.textContent = type;
      typeList.appendChild(li);
    });

    const groupList = elements.selectedGroupsList;
    groupList.innerHTML = '';
    validSelectedGroups.forEach(group => {
      const li = document.createElement('li');
      li.textContent = group;
      groupList.appendChild(li);
    });

    const shops = moduleState.shops
      .filter(shop => shop.relocate !== false)
      .sort((a, b) => a.priority - b.priority)
      .map(shop => normalizeShopName(shop.shop_name));

    renderRelocationTable(moduleState.filteredRelocationItems, shops);
  }

  if (elements.typeDropdown) {
    elements.typeDropdown.addEventListener('change', applyRelocationFilters);
  }
  if (elements.groupDropdown) {
    elements.groupDropdown.addEventListener('change', applyRelocationFilters);
  }

  if (elements.typeFilterActionBtn) {
    elements.typeFilterActionBtn.addEventListener('click', async () => {
      elements.relocationFilterContainer.classList.toggle('collapsed');

      try {
        const response = await fetch('/api/shop-relocation-settings');
        const limitsResponse = await response.json();

        if (!response.ok) {
          throw new Error('Не удалось загрузить relocation limits');
        }

        moduleState.shopTypeRelocationLimits = {};
        moduleState.shopTypeMaximumLimits = {};

        limitsResponse.forEach(limitEntry => {
          const type = limitEntry.product_type?.trim();
          if (!type) {
            return;
          }

          const shopsMaxRaw = limitEntry.shops_max;

          if (typeof shopsMaxRaw !== 'object') {
            return;
          }

          const parsedLimits = {};

          Object.entries(shopsMaxRaw).forEach(([shopName, qty]) => {
            const normShop = normalizeShopName(shopName);
            const parsedQty = parseInt(qty);
            if (!normShop || isNaN(parsedQty)) {
              return;
            }
            parsedLimits[normShop] = parsedQty;
          });

          moduleState.shopTypeRelocationLimits[type] = parsedLimits;
          moduleState.shopTypeMaximumLimits[type] = parsedLimits;
        });

      } catch (e) {
        showNotification("Ошибка загрузки ограничений", false, 'relocation');
        return;
      }

      const selectedTypes = Array.from(elements.typeDropdown.selectedOptions).map(opt => opt.value);

      const includeDiscounts = elements.includeDiscounts.checked;
      const regionalRelocation = elements.regionalRelocation.checked;
      const includeNewItems = elements.includeNewItems.checked;
      const respectRelocationLimits = elements.respectRelocationLimits.checked;
      const useSalesInRelocation = elements.useSalesInRelocation.checked;
      const keepMinimumWhenSales = elements.keepMinimumWhenSales.checked;
      const dontRelocateMoreThanSales = elements.dontRelocateMoreThanSales.checked;
      const respectMaximumLimits = elements.respectMaximumLimits?.checked

      const shopObjects = moduleState.shops
        .filter(shop => shop.relocate !== false)
        .sort((a, b) => a.priority - b.priority);

      const normalizedShopMap = new Map();
      shopObjects.forEach(shop => {
        normalizedShopMap.set(normalizeShopName(shop.shop_name), shop);
      });

      const warehouseKey = normalizeShopName('СКЛАД');
      const transitKey = normalizeShopName('Товар в пути');
      const excludedLocations = [warehouseKey, transitKey];

      let shopGroups = {};
      if (regionalRelocation) {
        shopObjects.forEach(shop => {
          const region = shop.logistics || 'unknown';
          const normName = normalizeShopName(shop.shop_name);
          if (!excludedLocations.includes(normName)) {
            if (!shopGroups[region]) shopGroups[region] = [];
            shopGroups[region].push(normName);
          }
        });
      } else {
        shopGroups['all'] = shopObjects
          .map(shop => normalizeShopName(shop.shop_name))
          .filter(normName => !excludedLocations.includes(normName));
      }

      moduleState.relocationData.relocations = [];
      moduleState.filteredRelocationItems.forEach(item => {
        const article = item.article;
        if (!item.originalShops) return;
        if (!moduleState.stockSalesData[article]) {
          moduleState.stockSalesData[article] = {};
        }

        Object.keys(moduleState.stockSalesData[article]).forEach(shop => {
          const shopData = moduleState.stockSalesData[article][shop];
          if (shopData && typeof shopData === 'object' && shopData.hasOwnProperty('stock')) {
            shopData.stock = 0;
          }
        });

        Object.entries(item.originalShops).forEach(([shop, stock]) => {
          const existingData = moduleState.stockSalesData[article][shop];
          
          if (existingData && typeof existingData === 'object' && existingData.hasOwnProperty('sales')) {
            existingData.stock = stock;
          } else {
            moduleState.stockSalesData[article][shop] = { 
              sales: 0, 
              stock: stock 
            };
          }
        });

        item.shops = { ...item.originalShops };
      });

      moduleState.filteredRelocationItems.forEach(item => {
        const article = item.article;
        const initialTotalStock = Object.values(moduleState.stockSalesData[article] || {})
          .reduce((sum, shopData) => {
            if (shopData && typeof shopData === 'object' && shopData.hasOwnProperty('stock')) {
              return sum + (shopData.stock || 0);
            }
            return sum;
          }, 0);

        if (!includeDiscounts && item.description.toLowerCase().includes('уценка')) {
          return;
        }

        const arrivalDateRaw = moduleState.stockSalesData[article]?.['Дата поступления'];
        const arrivalDate = arrivalDateRaw instanceof Date ? arrivalDateRaw : parseDateDDMMYY(arrivalDateRaw);

        if (!includeNewItems && arrivalDate) {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          if (arrivalDate >= oneMonthAgo) {
            return;
          }
        }

        const warehouseData = moduleState.stockSalesData[article]?.[warehouseKey];
        const warehouseStock = (warehouseData && typeof warehouseData === 'object') ? (warehouseData.stock || 0) : 0;
        if (warehouseStock > 0) {
          return;
        }

        const transitData = moduleState.stockSalesData[article]?.[transitKey];
        const transitStock = (transitData && typeof transitData === 'object') ? (transitData.stock || 0) : 0;
        if (transitStock > 0) {
          return;
        }

        let relocationLimits = moduleState.shopTypeRelocationLimits?.[item.type];
        if (!relocationLimits) {
          relocationLimits = moduleState.shopTypeRelocationLimits?.["По умолчанию"];
          if (!relocationLimits) {
            return;
          }
        }

        let maximumLimits = moduleState.shopTypeMaximumLimits?.[item.type];
        if (!maximumLimits) {
          maximumLimits = moduleState.shopTypeMaximumLimits?.["По умолчанию"];
          if (!maximumLimits) {
            return;
          }
        }

        Object.values(shopGroups).forEach(shops => {
          let shopStocks = {};
          let totalStock = 0;

          shops.forEach(shop => {
            if (excludedLocations.includes(shop)) {
              return;
            }
            const shopData = moduleState.stockSalesData[article]?.[shop];
            const currentStock = (shopData && typeof shopData === 'object') ? (shopData.stock || 0) : 0;
            shopStocks[shop] = currentStock;
            totalStock += currentStock;
          });

          const allowedTotalStock = Object.keys(moduleState.stockSalesData[article] || {})
            .filter(shop => !excludedLocations.includes(shop))
            .reduce((sum, shop) => {
              const shopData = moduleState.stockSalesData[article][shop];
              if (shopData && typeof shopData === 'object' && shopData.hasOwnProperty('stock')) {
                return sum + (shopData.stock || 0);
              }
              return sum;
            }, 0);

          let targetStocks = {};
          if (useSalesInRelocation) {
            const shopSalesData = shops.map(shop => {
              const shopData = moduleState.stockSalesData[article]?.[shop];
              let sales = (shopData && typeof shopData === 'object') ? (shopData.sales || 0) : 0;
              if (keepMinimumWhenSales && sales === 0) sales = 1;
              return { shop, sales };
            });

            const totalSales = shopSalesData.reduce((sum, s) => sum + s.sales, 0);

            if (totalSales > 0) {
              shops.forEach(shop => { targetStocks[shop] = 0; });

              const idealDistribution = {};
              let distributedStock = 0;

              shopSalesData.forEach(({ shop, sales }) => {
                if (sales > 0) {
                  idealDistribution[shop] = Math.floor(totalStock * (sales / totalSales));
                  distributedStock += idealDistribution[shop];
                } else {
                  idealDistribution[shop] = 0;
                }
              });

              const remainder = totalStock - distributedStock;
              if (remainder > 0) {
                const shopsWithSales = shopSalesData
                  .filter(s => s.sales > 0)
                  .sort((a, b) => b.sales - a.sales);
                
                for (let i = 0; i < remainder && i < shopsWithSales.length; i++) {
                  idealDistribution[shopsWithSales[i].shop]++;
                }
              }

              shops.forEach(shop => {
                targetStocks[shop] = idealDistribution[shop];
              });
              
            } else {
              shops.forEach(shop => { targetStocks[shop] = 0; });

              let remaining = totalStock;
              let index = 0;

              const shopsByPriority = shops
                .map(s => normalizedShopMap.get(s))
                .filter(Boolean)
                .sort((a, b) => a.priority - b.priority);

              while (remaining > 0) {
                const shopName = normalizeShopName(shopsByPriority[index % shopsByPriority.length].shop_name);
                targetStocks[shopName]++;
                remaining--;
                index++;
              }
            }
          } else {
            shops.forEach(shop => { targetStocks[shop] = 0; });
            let remaining = totalStock;
            let index = 0;
            while (remaining > 0) {
              targetStocks[shops[index % shops.length]]++;
              remaining--;
              index++;
            }
          }

          const totalTargetStock = Object.values(targetStocks).reduce((sum, val) => sum + val, 0);

          let surplusShops = [];
          let deficitShops = [];

          shops.forEach(shop => {
            if (excludedLocations.includes(shop)) {
              return;
            }

            let diff = shopStocks[shop] - targetStocks[shop];
            if (diff > 0) {
              const shopObj = normalizedShopMap.get(shop);

              let minKeep = 0;
              if (keepMinimumWhenSales) {
                const shopData = moduleState.stockSalesData[article]?.[shop];
                let sales = (shopData && typeof shopData === 'object') ? (shopData.sales || 0) : 0;
                if (useSalesInRelocation && sales === 0) sales = 1;

                if (sales > 0) {
                  minKeep = shopStocks[shop] >= 50 ? Math.floor(shopStocks[shop] * 0.05) : 1;
                  if (diff > (shopStocks[shop] - minKeep)) {
                    diff = shopStocks[shop] - minKeep;
                  }
                }
              }

              if (diff > 0) {
                const shopData = moduleState.stockSalesData[article]?.[shop];
                const shopSales = (shopData && typeof shopData === 'object') ? (shopData.sales || 0) : 0;
                surplusShops.push({
                  shop,
                  surplus: diff,
                  priority: shopObj?.priority || 999,
                  sales: shopSales
                });
              }
            } else if (diff < 0) {
              const shopData = moduleState.stockSalesData[article]?.[shop];
              const shopSales = (shopData && typeof shopData === 'object') ? (shopData.sales || 0) : 0;
              deficitShops.push({ 
                shop, 
                need: -diff,
                sales: shopSales
              });
            }
          });

          surplusShops.sort((a, b) => {
            if (a.sales === 0 && b.sales > 0) return -1;
            if (b.sales === 0 && a.sales > 0) return 1;
            
            if (a.sales !== b.sales) {
              return a.sales - b.sales;
            }
            
            return b.priority - a.priority;
          });

          deficitShops.sort((a, b) => {
            return b.sales - a.sales;
          });
          
          let totalMoved = 0;
          
          for (const to of deficitShops) {
            if (excludedLocations.includes(to.shop)) {
              continue;
            }

            for (const from of surplusShops) {
              if (excludedLocations.includes(from.shop)) {
                continue;
              }

              if (from.surplus <= 0 || to.need <= 0) continue;

              let moveAmount = Math.min(from.surplus, to.need);

              if (dontRelocateMoreThanSales) {
                const shopData = moduleState.stockSalesData[article]?.[to.shop];
                let salesTo = (shopData && typeof shopData === 'object') ? (shopData.sales || 0) : 0;
                if (useSalesInRelocation && keepMinimumWhenSales && salesTo === 0) salesTo = 1;
                const currentToStock = shopStocks[to.shop];
                const maxAllowed = Math.max(0, salesTo - currentToStock);
                if (moveAmount > maxAllowed) {
                  moveAmount = maxAllowed;
                }
              }

              if (respectRelocationLimits) {
                const limitFrom = relocationLimits[from.shop];
                if (limitFrom !== undefined) {
                  const current = shopStocks[from.shop];
                  const maxToMove = Math.max(0, current - limitFrom);
                  if (moveAmount > maxToMove) {
                    moveAmount = maxToMove;
                  }
                }
              }

              if (respectMaximumLimits) {
                const maxForTo = maximumLimits[to.shop];
                if (maxForTo !== undefined) {
                  const currentToStock = shopStocks[to.shop];
                  const allowedExtra = maxForTo - currentToStock;
                  if (allowedExtra <= 0) {
                    continue;
                  }
                  if (moveAmount > allowedExtra) {
                    moveAmount = allowedExtra;
                  }
                }
              }

              if (moveAmount <= 0) continue;

              if (!moduleState.stockSalesData[article]) {
                moduleState.stockSalesData[article] = {};
              }
              if (!moduleState.stockSalesData[article][from.shop] || typeof moduleState.stockSalesData[article][from.shop] !== 'object') {
                moduleState.stockSalesData[article][from.shop] = { sales: 0, stock: shopStocks[from.shop] };
              }
              if (!moduleState.stockSalesData[article][to.shop] || typeof moduleState.stockSalesData[article][to.shop] !== 'object') {
                moduleState.stockSalesData[article][to.shop] = { sales: 0, stock: shopStocks[to.shop] };
              }

              shopStocks[from.shop] -= moveAmount;
              shopStocks[to.shop] += moveAmount;
              from.surplus -= moveAmount;
              to.need -= moveAmount;

              moduleState.stockSalesData[article][from.shop].stock -= moveAmount;
              moduleState.stockSalesData[article][to.shop].stock += moveAmount;

              totalMoved += moveAmount;

              moduleState.relocationData.relocations.push({
                article,
                description: item.description,
                fromShop: from.shop,
                toShop: to.shop,
                amount: moveAmount
              });
            }
          }
        });

        const finalAllowedStock = Object.keys(moduleState.stockSalesData[article] || {})
          .filter(shop => !excludedLocations.includes(shop))
          .reduce((sum, shop) => {
            const shopData = moduleState.stockSalesData[article][shop];
            if (shopData && typeof shopData === 'object' && shopData.hasOwnProperty('stock')) {
              return sum + (shopData.stock || 0);
            }
            return sum;
          }, 0);
        
        const initialAllowedStock = Object.keys(moduleState.stockSalesData[article] || {})
          .filter(shop => !excludedLocations.includes(shop))
          .reduce((sum, shop) => {
            const shopData = moduleState.stockSalesData[article][shop];
            if (shopData && typeof shopData === 'object' && shopData.hasOwnProperty('stock')) {
              return sum + (shopData.stock || 0);
            }
            return sum;
          }, 0);

        item.shops = {};
        Object.keys(moduleState.stockSalesData[article] || {}).forEach(shop => {
          const shopData = moduleState.stockSalesData[article][shop];
          if (shopData && typeof shopData === 'object' && typeof shopData.stock === 'number' && shopData.stock > 0) {
            item.shops[shop] = shopData.stock;
          }
        });
      });

      renderRelocationTable(
        moduleState.filteredRelocationItems,
        shopObjects.map(s => normalizeShopName(s.shop_name))
      );

      showNotification(`Перераспределение завершено для типов: ${selectedTypes.join(', ')}`, true, 'relocation');
    });
  }

  function parseDateDDMMYY(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    year += year < 50 ? 2000 : 1900;

    return new Date(year, month, day);
  }
   
  function getMonthsInShop(arrivalDate) {
    if (!(arrivalDate instanceof Date) || isNaN(arrivalDate)) return '';
    const now = new Date();

    let months = (now.getFullYear() - arrivalDate.getFullYear()) * 12;
    months += now.getMonth() - arrivalDate.getMonth();

    if (now.getDate() < arrivalDate.getDate()) {
      months--;
    }

    return months >= 0 ? months : 0;
  }

  function switchTab(tabName, subtabId = null) {
    moduleState.currentTab = tabName;
    
    elements.tabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    elements.tabContents.forEach(content => {
      const isActive = content.id === `${tabName}Tab`;
      content.classList.toggle("active", isActive);
      
      if (isActive) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });

    if (tabName === 'settings') {
      if (moduleState.shops.length === 0) {
        fetchShops();
      }
      if (subtabId) {
        const tabs = document.querySelectorAll('#settingsTab > div:not(#settings-buttons-row):not(#settingsNotification)');
        tabs.forEach(tab => tab.style.display = 'none');
        document.getElementById(subtabId).style.display = 'block';
      }
    }

    if (tabName === 'limits') {
      loadShopDistributionSettings();
    }

    if (tabName === 'limitsr') {
      loadShopRelocationSettings();
    }
  }

  async function fetchShops() {
    try {
      if (!state.chatId) {
        return;
      }

      const response = await fetch(`/api/shops/${state.chatId}`);
      const shops = await response.json();

      if (!response.ok) {
        throw new Error(shops.error || "Failed to fetch shops");
      }

      moduleState.shops = shops;

      shops.forEach(shop => {
        const normalized = normalizeShopName(shop.shop_name);
        moduleState.shopNameMap[normalized] = shop.shop_name;
      });

      renderShops();
    } catch (error) {
      showNotification(`Error loading shops: ${error.message}`, false, 'settings');
    }
  }

  function renderShops() {
    elements.shopsList.innerHTML = "";

    if (moduleState.shops.length === 0) {
      elements.shopsList.innerHTML = `
        <tr>
          <td colspan="6" class="dist-empty-state">Нет данных для отображения</td>
        </tr>
      `;
      return;
    }

    moduleState.shops.forEach((shop) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="dist-td">
          <input type="text" class="dist-filter-input shop-name" value="${shop.shop_name || ''}" style="width: 100%;">
        </td>
        <td class="dist-td">
          <input type="text" class="dist-filter-input shop-email" value="${shop.shop_email || ''}" style="width: 100%;">
        </td>
        <td class="dist-td">
          <input type="number" class="dist-filter-input shop-priority" value="${shop.priority || 0}" style="width: 80px;">
        </td>
        <td class="dist-td" style="text-align: center;">
          <input type="checkbox" class="shop-distribute" ${shop.distribute !== false ? 'checked' : ''} style="accent-color: var(--dist-accent);">
        </td>
        <td class="dist-td" style="text-align: center;">
          <input type="checkbox" class="shop-relocate" ${shop.relocate !== false ? 'checked' : ''} style="accent-color: var(--dist-accent);">
        </td>
        <td class="dist-td">
          <button class="dist-upload-btn save-shop" data-id="${shop.id}" style="margin: 0;">Сохранить</button>
        </td>
      `;
      elements.shopsList.appendChild(row);
    });

    document.querySelectorAll('.save-shop').forEach(button => {
      button.addEventListener('click', saveShopSettings);
    });
  }
  
  async function saveShopSettings(e) {
    const shopId = e.target.dataset.id;
    const row = e.target.closest('tr');
    
    const updatedData = {
      shop_name: row.querySelector('.shop-name').value,
      shop_email: row.querySelector('.shop-email').value,
      priority: parseInt(row.querySelector('.shop-priority').value) || 0,
      distribute: row.querySelector('.shop-distribute').checked,
      relocate: row.querySelector('.shop-relocate').checked
    };
    
    try {
      const response = await fetch(`/api/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification('Настройки магазина успешно обновлены', true, 'settings');
      fetchShops();
    } catch (error) {
      showNotification(`Ошибка при обновлении настроек: ${error.message}`, false, 'settings');
    }
  }

  function handleFileSelect(fileInputId) {
    document.getElementById(fileInputId).click();
  }

  if (elements.typeFilterInput) {
    elements.typeFilterInput.addEventListener('input', (e) => {
      const filterText = e.target.value.trim();
      populateTypeDropdown(moduleState.relocationItems, filterText);
    });
  }

  function populateGroupDropdown(items, filter = '') {
    const dropdown = elements.groupDropdown;
    if (!dropdown) return;
    
    dropdown.innerHTML = '';

    const uniqueGroups = [...new Set(items.map(i => i.group).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    uniqueGroups
      .filter(group => group.toLowerCase().includes(filter.toLowerCase()))
      .forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        dropdown.appendChild(option);
      });
  }

  if (elements.groupFilterInput) {
    elements.groupFilterInput.addEventListener('input', (e) => {
      const filterText = e.target.value.trim();
      populateGroupDropdown(moduleState.relocationItems, filterText);
    });
  }

  if (elements.groupDropdown) {
    elements.groupDropdown.addEventListener('change', () => {
      const dropdown = elements.groupDropdown;
      const list = elements.selectedGroupsList;
      list.innerHTML = '';
      const selectedGroups = Array.from(dropdown.selectedOptions).map(opt => opt.value);

      selectedGroups.forEach(group => {
        const li = document.createElement('li');
        li.textContent = group;
        list.appendChild(li);
      });

      const selectedTypes = Array.from(elements.typeDropdown.selectedOptions).map(opt => opt.value);

      if (selectedTypes.length > 0 || selectedGroups.length > 0) {
        moduleState.filteredRelocationItems = moduleState.relocationItems.filter(item => {
          if (selectedTypes.length === 0 && selectedGroups.length === 0) {
            return true;
          }
          if (selectedTypes.length === 0) {
            return selectedGroups.includes(item.group);
          }
          if (selectedGroups.length === 0) {
            return selectedTypes.includes(item.type);
          }
          return selectedTypes.includes(item.type) && selectedGroups.includes(item.group);
        });
      } else {
        moduleState.filteredRelocationItems = moduleState.relocationItems;
      }

      const shops = moduleState.shops
        .filter(shop => shop.relocate !== false)
        .sort((a, b) => a.priority - b.priority)
        .map(shop => normalizeShopName(shop.shop_name));

      renderRelocationTable(moduleState.filteredRelocationItems, shops);
    });
  }

  function handleFileUpload(e, fileType, tab) {
    const file = e.target.files[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      showNotification('Пожалуйста, выберите файл Excel (.xlsx или .xls)', false, tab);
      return;
    }

    if (tab === 'distribution') {
      if (fileType === 'distribution') {
        moduleState.distributionFile = file;
        if (elements.distributionFileName) elements.distributionFileName.textContent = file.name;
      } else {
        moduleState.stockSalesFile = file;
        if (elements.stockSalesFileName) elements.stockSalesFileName.textContent = file.name;
      }
      checkFilesReady();
    } else if (tab === 'relocation') {
      moduleState.stockSalesFile = file;
      if (elements.relocationStockSalesFileName) elements.relocationStockSalesFileName.textContent = file.name;
      if (elements.relocationAnalyzeBtn) elements.relocationAnalyzeBtn.disabled = false;
    }
  }

  function checkFilesReady() {
    if (elements.analyzeBtn) {
      elements.analyzeBtn.disabled = !(moduleState.distributionFile && moduleState.stockSalesFile);
    }
  }

  async function processStockSalesFile(file) {
    try {
      const XLSX = await loadXLSX();

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const filteredData = jsonData.map(row => row ? row.slice(0, 60) : []);

      let headerRowIndex = 0;
      while (headerRowIndex < filteredData.length &&
        (!filteredData[headerRowIndex] || filteredData[headerRowIndex].length === 0)) {
        headerRowIndex++;
      }
      if (headerRowIndex >= filteredData.length) {
        throw new Error('Не найдена строка заголовков в файле');
      }

      const headers = filteredData[headerRowIndex];

      function findColumnByHeader(targetHeader) {
        const normalizedTarget = targetHeader.toLowerCase().trim();
        for (let i = 0; i < headers.length; i++) {
          if (headers[i] && headers[i].toString().toLowerCase().trim() === normalizedTarget) {
            return i;
          }
        }
        return -1;
      }

      const modelColumnIndex = findColumnByHeader('Модель');
      const typeColumnIndex = findColumnByHeader('Тип');
      const dateColumnIndex = findColumnByHeader('Дата поступления');
      const codeColumnIndex = findColumnByHeader('Код');
      const nomenclatureColumnIndex = findColumnByHeader('Номенклатура');

      const shopNames = [
        'Торговый Центр Тирасполь',
        'Магазин Тирасполь -2',
        'Магазин Бендеры',
        'Торговый Центр Бендеры',
        'Магазин Рыбница-2',
        'Магазин Рыбница',
        'Магазин Дубоссары',
        'Магазин Григориополь',
        'Магазин Каменка',
        'Магазин Слободзея',
        'Магазин Днестровск',
        'Магазин Первомайск',
        'СКЛАД',
        'Товар в пути'
      ];

      function findShopColumnIndex(shopName) {
        for (let i = 0; i < headers.length; i++) {
          if (headers[i] && headers[i].toString().trim() === shopName) {
            return i;
          }
        }
        return -1;
      }

      const shopColumnMap = {};
      const stockSalesData = {};
      moduleState.groupMap = {};
      let currentGroup = null;

      shopNames.forEach(shopName => {
        const columnIndex = findShopColumnIndex(shopName);
        if (columnIndex !== -1) {
          const normalized = normalizeShopName(shopName);
          shopColumnMap[normalized] = {
            salesColumn: columnIndex,
            stockColumn: columnIndex + 1,
            originalName: shopName
          };
          moduleState.shopNameMap[normalized] = shopName;
        }
      });

      for (let i = headerRowIndex + 1; i < filteredData.length; i++) {
        const row = filteredData[i];
        if (!row) continue;

        const codeValue = codeColumnIndex !== -1 ? row[codeColumnIndex] : null;
        const nomenclatureValue = nomenclatureColumnIndex !== -1 ? row[nomenclatureColumnIndex] : null;

        if (codeValue && typeof codeValue === "string") {
          const trimmed = codeValue.trim();

          if (trimmed.startsWith("Г")) {
            currentGroup = (nomenclatureValue || '').toString().trim();
            if (!moduleState.groupMap[currentGroup]) {
              moduleState.groupMap[currentGroup] = [];
            }
            continue;
          }

          if (trimmed.startsWith("Т")) {
            if (currentGroup) {
              moduleState.groupMap[currentGroup].push(trimmed);
            }
          }
        }

        const modelValue = modelColumnIndex !== -1 ? row[modelColumnIndex] : null;
        if (!modelValue) continue;

        const article = modelValue.toString();
        const type = typeColumnIndex !== -1 ? (row[typeColumnIndex] || '') : '';

        stockSalesData[article] = {};

        const dateCell = dateColumnIndex !== -1 ? row[dateColumnIndex] : null;
        const arrivalDate = dateCell ? parseDateDDMMYY(dateCell) : null;
        const description = nomenclatureColumnIndex !== -1 ? (row[nomenclatureColumnIndex] || '') : '';

        stockSalesData[article]['Дата поступления'] = arrivalDate;
        stockSalesData[article]['Тип'] = type;
        stockSalesData[article]['Группа'] = currentGroup || '';
        stockSalesData[article]['Код'] = codeValue ? codeValue.toString().trim() : '';
        stockSalesData[article]['Описание'] = description;

        Object.entries(shopColumnMap).forEach(([normalized, columnInfo]) => {
          stockSalesData[article][normalized] = {
            sales: parseInt(row[columnInfo.salesColumn]) || 0,
            stock: parseInt(row[columnInfo.stockColumn]) || 0,
            displayName: columnInfo.originalName
          };
        });
      }

      return stockSalesData;
    } catch (error) {
      throw new Error('Ошибка обработки файла остатков и продаж');
    }
  }

  async function processDistributionFile(file) {
    try {
      const XLSX = await loadXLSX();
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      const shopsRow = jsonData[0];
      const rawShops = shopsRow.slice(4).filter(name => name);
      const shops = rawShops.map(shop => {
        const normalized = normalizeShopName(shop);
        if (!moduleState.shopNameMap[normalized]) {
          moduleState.shopNameMap[normalized] = shop;
        }
        return normalized;
      });
      
      const items = [];
      for (let i = 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[1]) continue;
        
        const item = {
          article: row[1],
          description: row[2] || '',
          stock: parseInt(row[3]) || 0,
          distribution: {}
        };
        
        shops.forEach((shopNormalized, index) => {
          const allocated = parseInt(row[4 + index]) || 0;
          if (allocated > 0) {
            item.distribution[shopNormalized] = allocated;
          }
        });
        
        if (item.stock > 0) {
          items.push(item);
        }
      }
      
      return { items, shops };
    } catch (error) {
      throw new Error('Ошибка обработки файла распределения');
    }
  }

  async function handleAnalyzeClick() {
    if (!moduleState.distributionFile || !moduleState.stockSalesFile) {
      showNotification('Пожалуйста, загрузите оба файла', false, 'distribution');
      return;
    }

    try {
      showNotification('Обработка файлов...', true, 'distribution');

      const stockSalesData = await processStockSalesFile(moduleState.stockSalesFile);
      const { items, shops } = await processDistributionFile(moduleState.distributionFile);

      if (moduleState.shops.length === 0) {
        await fetchShops();
      }

      moduleState.shopsPriorityMap = {};
      moduleState.shopsDistributeMap = {};

      moduleState.shops.forEach(shop => {
        const normalized = normalizeShopName(shop.shop_name);
        moduleState.shopsPriorityMap[normalized] = shop.priority;
        moduleState.shopsDistributeMap[normalized] = shop.distribute !== false;
      });

      moduleState.stockSalesData = stockSalesData;

      items.forEach(item => {
        item.originalShops = { ...(item.shops || {}) };
        item.type = moduleState.stockSalesData[item.article]?.['Тип']?.trim() || '';
        item.description = moduleState.stockSalesData[item.article]?.['Описание'] || '';
      });

      if (!moduleState.shopTypeLimits) {
        await loadShopDistributionSettings();
      }

      moduleState.distributionResults = distributeItems(items, shops);

      renderDistributionTable(moduleState.distributionResults);
      showNotification('Анализ завершен', true, 'distribution');

      const fileInputsRow = document.querySelector('.dist-file-row');
      if (fileInputsRow) fileInputsRow.style.display = 'none';

    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, false, 'distribution');
    }
  }

  function showNotification(message, isSuccess, tab) {
    const notificationElement = tab === 'settings' 
      ? elements.settingsNotification 
      : tab === 'relocation'
      ? document.getElementById('relocationNotification')
      : elements.distributionNotification;
    
    if (!notificationElement) return;
    
    notificationElement.textContent = message;
    notificationElement.className = `dist-notification ${isSuccess ? "dist-success" : "dist-error"}`;
    
    notificationElement.classList.add('show');
    
    setTimeout(() => {
      notificationElement.classList.remove('show');

      setTimeout(() => {
        notificationElement.textContent = '';
      }, 300);
    }, 5000);
  }
  
  function distributeItems(items, excelShops) {
    const sortedShops = moduleState.shops
      .filter(shop => shop.distribute !== false)
      .sort((a, b) => a.priority - b.priority)
      .map(shop => normalizeShopName(shop.shop_name))
      .filter(normalized => excelShops.includes(normalized));

    return items.map(item => {
      const distributedItem = { ...item, distribution: {} };
      let remainingStock = item.stock;

      const itemType = item.type?.trim();
      let typeLimits = moduleState.shopTypeLimits?.[itemType];

      if (!typeLimits || Object.keys(typeLimits).length === 0) {
        typeLimits = moduleState.shopTypeLimits?.["По умолчанию"];
      }

      if (!typeLimits) {
        typeLimits = {};
      }

      const shopStocks = {};
      sortedShops.forEach(shopNormalized => {
        shopStocks[shopNormalized] =
          moduleState.stockSalesData[item.article]?.[shopNormalized]?.stock || 0;
      });

      let iteration = 0;
      while (remainingStock > 0) {
        iteration++;
        const minStock = Math.min(...sortedShops.map(shop => shopStocks[shop]));
        const eligibleShops = sortedShops.filter(shop => shopStocks[shop] === minStock);

        let distributedThisRound = false;

        for (const shopNormalized of eligibleShops) {
          if (remainingStock <= 0) break;

          const limit = typeLimits[shopNormalized];
          const currentStock = shopStocks[shopNormalized];
          const currentDist = distributedItem.distribution[shopNormalized] || 0;

          if (limit !== undefined) {
            const deficit = limit - currentStock - currentDist;
            if (deficit <= 0) {
              continue;
            }
          }

          distributedItem.distribution[shopNormalized] = currentDist + 1;
          shopStocks[shopNormalized] += 1;
          remainingStock -= 1;
          distributedThisRound = true;
        }

        if (!distributedThisRound) {
          break;
        }
      }

      distributedItem.remaining = remainingStock;
      return distributedItem;
    });
  }

  function renderDistributionTable(items) {
    if (!elements.distributionTableBody) return;
    
    elements.distributionTableBody.innerHTML = '';
    
    const allShops = new Set();
    items.forEach(item => {
      Object.keys(item.distribution).forEach(shopNormalized => {
        if (moduleState.shopsDistributeMap[shopNormalized] !== false) {
          allShops.add(shopNormalized);
        }
      });
    });
    
    const sortedShops = Array.from(allShops).sort((a, b) => {
      return (moduleState.shopsPriorityMap[a] || 999) - (moduleState.shopsPriorityMap[b] || 999);
    });
    
    const thead = elements.distributionTable.querySelector('thead');
    if (!thead) return;
    
    thead.innerHTML = '';
    
    const firstHeaderRow = document.createElement('tr');
    firstHeaderRow.innerHTML = `
      <th class="dist-th">Артикул</th>
      <th class="dist-th">Доступно</th>
      <th class="dist-th">Остаток</th>
      ${sortedShops.map(shopNormalized => `
        <th class="dist-th" colspan="3">${moduleState.shopNameMap[shopNormalized] || shopNormalized}</th>
      `).join('')}
    `;
    thead.appendChild(firstHeaderRow);
    
    const secondHeaderRow = document.createElement('tr');
    secondHeaderRow.innerHTML = `
      <td class="dist-th"></td>
      <td class="dist-th"></td>
      <td class="dist-th"></td>
      ${sortedShops.map(() => `
        <td class="dist-th">Реал</td>
        <td class="dist-th">Ост</td>
        <td class="dist-th">Распр</td>
      `).join('')}
    `;
    thead.appendChild(secondHeaderRow);
    
    items.forEach(item => {
      const totalDistributed = Object.values(item.distribution).reduce((sum, val) => sum + val, 0);
      const remaining = item.stock - totalDistributed;
      const isValid = totalDistributed <= item.stock;
      
      const row = document.createElement('tr');
      row.className = `${!isValid ? 'table-error' : ''}`;
      
      row.innerHTML = `
        <td class="dist-td" title="${item.description}">${item.article}</td>
        <td class="dist-td">${toDisplayValue(item.stock)}</td>
        <td class="dist-td">${toDisplayValue(remaining)}</td>
        ${sortedShops.map(shopNormalized => {
          const shopData = moduleState.stockSalesData[item.article]?.[shopNormalized] || { sales: 0, stock: 0 };
          return `
            <td class="dist-td">
              <input type="number" value="${toDisplayValue(shopData.sales)}" min="0" disabled>
            </td>
            <td class="dist-td">
              <input type="number" value="${toDisplayValue(shopData.stock)}" min="0" disabled>
            </td>
            <td class="dist-td">
              <input type="number" 
                     value="${toDisplayValue(item.distribution[shopNormalized])}"
                     min="0" max="${item.stock}"
                     data-article="${item.article}" 
                     data-shop="${shopNormalized}">
            </td>
          `;
        }).join('')}
      `;
      
      row.querySelectorAll('input:not(:disabled)').forEach(input => {
        input.addEventListener('change', (e) => {
          updateDistributionItem(item.article, e.target.dataset.shop, parseInt(e.target.value) || 0);
          renderDistributionTable(moduleState.distributionResults);
        });
      });
      
      elements.distributionTableBody.appendChild(row);
    });
    
    const totalRow = document.createElement('tr');
    
    const shopTotals = {};
    sortedShops.forEach(shopNormalized => {
      shopTotals[shopNormalized] = items.reduce((sum, item) => sum + (item.distribution[shopNormalized] || 0), 0);
    });
    
    const totalAvailable = items.reduce((sum, item) => sum + item.stock, 0);
    const totalDistributed = items.reduce((sum, item) => 
      sum + Object.values(item.distribution).reduce((itemSum, val) => itemSum + val, 0), 0);
    const totalRemaining = totalAvailable - totalDistributed;
    
    totalRow.innerHTML = `
      <td class="dist-td"><strong>Итого:</strong></td>
      <td class="dist-td"><strong>${totalAvailable}</strong></td>
      <td class="dist-td"><strong>${totalRemaining}</strong></td>
      ${sortedShops.map(shopNormalized => `
        <td class="dist-td" colspan="2"></td>
        <td class="dist-td"><strong>${shopTotals[shopNormalized]}</strong></td>
      `).join('')}
    `;
    
    elements.distributionTableBody.appendChild(totalRow);
    if (elements.distributionResults) elements.distributionResults.style.display = 'block';
  }

  function updateDistributionItem(article, shopNormalized, newValue) {
    const item = moduleState.distributionResults.find(i => i.article === article);
    if (item) {
      if (newValue > 0) {
        item.distribution[shopNormalized] = newValue;
      } else {
        delete item.distribution[shopNormalized];
      }
    }
  }
  
  async function processStockSalesForRelocation(file) {
    try {
      const XLSX = await loadXLSX();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const filteredData = jsonData.map(row => row ? row.slice(0, 60) : []);

      let headerRowIndex = 0;
      if (!filteredData[0] || filteredData[0].length === 0 || !filteredData[0].some(cell => cell)) {
        headerRowIndex = 1;
      }
      const headers = filteredData[headerRowIndex] || [];
      const items = [];
      const shops = [];

      if (!moduleState.stockSalesData) {
        moduleState.stockSalesData = {};
      }
      if (!moduleState.groupMap) {
        moduleState.groupMap = {};
      }

      const shopNames = [
        'Торговый Центр Тирасполь',
        'Магазин Тирасполь -2',
        'Магазин Бендеры',
        'Торговый Центр Бендеры',
        'Магазин Рыбница-2',
        'Магазин Рыбница',
        'Магазин Дубоссары',
        'Магазин Григориополь',
        'Магазин Каменка',
        'Магазин Слободзея',
        'Магазин Днестровск',
        'Магазин Первомайск',
        'СКЛАД',
        'Товар в пути'
      ];

      function normalizeHeaderName(name) {
        return name ? name.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '';
      }

      function findColumnByHeader(targetHeader) {
        const normalizedTarget = normalizeHeaderName(targetHeader);
        for (let i = 0; i < headers.length; i++) {
          if (normalizeHeaderName(headers[i]) === normalizedTarget) {
            return i;
          }
        }
        return -1;
      }

      const articleColumnIndex = findColumnByHeader('Модель');
      const descriptionColumnIndex = findColumnByHeader('Номенклатура');
      const typeColumnIndex = findColumnByHeader('Тип');
      const dateColumnIndex = findColumnByHeader('Дата поступления');
      const codeColumnIndex = findColumnByHeader('Код');

      function findShopColumnIndex(shopName) {
        const normalizedTarget = normalizeHeaderName(shopName);
        for (let i = 0; i < headers.length; i++) {
          if (normalizeHeaderName(headers[i]) === normalizedTarget) {
            return i;
          }
        }
        return -1;
      }

      shopNames.forEach(shopName => {
        const columnIndex = findShopColumnIndex(shopName);
        if (columnIndex !== -1) {
          const normalized = normalizeShopName(shopName);
          if (moduleState.shops.find(s =>
            normalizeShopName(s.shop_name) === normalized && s.relocate !== false
          )) {
            shops.push({
              normalized,
              originalName: shopName,
              salesColumn: columnIndex,
              stockColumn: columnIndex + 1
            });
          }
        }
      });

      let currentGroup = null;

      for (let i = headerRowIndex + 1; i < filteredData.length; i++) {
        const row = filteredData[i];
        if (!row) continue;

        const codeValue = codeColumnIndex !== -1 ? row[codeColumnIndex] : null;
        const nomenclatureValue = descriptionColumnIndex !== -1 ? row[descriptionColumnIndex] : null;

        if (codeValue && typeof codeValue === "string") {
          const trimmed = codeValue.trim();

          if (trimmed.startsWith("Г")) {
            currentGroup = (nomenclatureValue || '').toString().trim();
            if (!moduleState.groupMap[currentGroup]) {
              moduleState.groupMap[currentGroup] = [];
            }
            continue;
          }

          if (trimmed.startsWith("Т") && currentGroup) {
            moduleState.groupMap[currentGroup].push(trimmed);
          }
        }

        const articleValue = articleColumnIndex !== -1 ? row[articleColumnIndex] : row[6];
        if (!articleValue) continue;

        const descriptionValue = nomenclatureValue || row[2];
        const typeValue = typeColumnIndex !== -1 ? row[typeColumnIndex] : row[4];

        const article = articleValue.toString();
        const description = descriptionValue || '';
        const type = typeValue || '';

        const item = {
          article,
          description,
          type,
          group: currentGroup || '',
          shops: {}
        };

        let arrivalDate = null;
        if (dateColumnIndex !== -1) {
          const dateCell = row[dateColumnIndex];
          arrivalDate = dateCell ? parseDateDDMMYY(dateCell) : null;
        }

        if (!moduleState.stockSalesData[article]) {
          moduleState.stockSalesData[article] = {};
        }
        moduleState.stockSalesData[article]['Дата поступления'] = arrivalDate;
        moduleState.stockSalesData[article]['Тип'] = type;
        moduleState.stockSalesData[article]['Группа'] = currentGroup || '';

        shops.forEach(shop => {
          const sales = parseInt(row[shop.salesColumn]) || 0;
          const stock = parseInt(row[shop.stockColumn]) || 0;

          moduleState.stockSalesData[article][shop.normalized] = {
            sales,
            stock,
            displayName: shop.originalName
          };

          if (stock > 0) {
            item.shops[shop.normalized] = stock;
          }
        });

        if (Object.keys(item.shops).length > 0) {
          items.push(item);
        }
      }

      return {
        items,
        shops: shops.map(s => s.normalized)
      };
    } catch (error) {
      throw new Error('Ошибка обработки файла остатков и продаж для перемещения');
    }
  }

  function toDisplayValue(val) {
    const num = parseInt(val) || 0;
    return num === 0 ? '' : num;
  }
  
  function renderRelocationTable(items, shops) {
    const tableBody = elements.relocationTableBody;
    const tableView = document.querySelector('#relocationTab .dist-table-view');
    if (!tableBody || !tableView) return;

    const rowHeight = 30;
    const buffer = 20;
    const useVirtual = items.length > 2000;
    let filteredItems = items;

    const thead = document.querySelector('#relocationTab table thead');
    if (!thead) return;
    
    thead.innerHTML = '';

    const headerFilterRow = document.createElement('tr');
    headerFilterRow.className = 'dist-filter-row';
    headerFilterRow.innerHTML = `
      <td class="dist-th"><input type="text" class="filter-input" placeholder="фильтр" data-column="0"></td>
      <td class="dist-th"></td>
      <td class="dist-th"></td>
      <td class="dist-th"></td>
      ${shops.map(shop => `<th class="dist-th" colspan="2">${moduleState.shopNameMap[shop] || shop}</th>`).join('')}
      <td class="dist-th"><button id="globalExpandBtn" class="dist-upload-btn" style="margin:0;padding:4px 8px;">Все</button></td>
    `;
    thead.appendChild(headerFilterRow);

    const subHeaderRow = document.createElement('tr');
    subHeaderRow.innerHTML = `
      <td class="dist-th">Артикул</td>
      <td class="dist-th">Остаток</td>
      <td class="dist-th">Месяцев в магазине</td>
      <td class="dist-th">Тип</td>
      ${shops.map(() => `<td class="dist-th">Р</td><td class="dist-th">О</td>`).join('')}
      <td class="dist-th"></td>
    `;
    thead.appendChild(subHeaderRow);

    const totalBefore = {}, totalAfter = {};
    const modelCountBeforeShop = {}, modelCountAfterShop = {};
    let globalBefore = 0, globalAfter = 0, modelCountBefore = 0, modelCountAfter = 0;

    shops.forEach(shop => {
      totalBefore[shop] = 0;
      totalAfter[shop] = 0;
      modelCountBeforeShop[shop] = 0;
      modelCountAfterShop[shop] = 0;
    });

    filteredItems.forEach(item => {
      const orig = item.originalShops || {};
      const updated = item.shops || {};
      const beforeSum = Object.values(orig).reduce((a, b) => a + b, 0);
      const afterSum = Object.values(updated).reduce((a, b) => a + b, 0);

      globalBefore += beforeSum;
      globalAfter += afterSum;
      if (beforeSum > 0) modelCountBefore++;
      if (afterSum > 0) modelCountAfter++;

      shops.forEach(shop => {
        totalBefore[shop] += orig[shop] || 0;
        totalAfter[shop] += updated[shop] || 0;
        if ((orig[shop] || 0) > 0) modelCountBeforeShop[shop]++;
        if ((updated[shop] || 0) > 0) modelCountAfterShop[shop]++;
      });
    });

    function getMonthsInShop(arrivalDate) {
      if (!(arrivalDate instanceof Date) || isNaN(arrivalDate)) return '';
      const now = new Date();
      let months = (now.getFullYear() - arrivalDate.getFullYear()) * 12;
      months += now.getMonth() - arrivalDate.getMonth();
      if (now.getDate() < arrivalDate.getDate()) {
        months--;
      }
      return months >= 0 ? months : 0;
    }

    function createRowsForItem(item) {
      const article = item.article;
      const description = item.description;
      const type = item.type || '';
      const original = item.originalShops || {};
      const updated = item.shops || {};
      const relocations = moduleState.relocationData.relocations.filter(r => r.article === article);
      const isExpanded = moduleState.expandedArticles?.has(article);
      const totalAvailable = Object.values(updated).reduce((sum, val) => sum + val, 0);
      const hasRelocations = relocations.length > 0;

      const arrivalDate = moduleState.stockSalesData[article]?.['Дата поступления'];
      const monthsInShop = getMonthsInShop(arrivalDate);

      const rows = [];

      const beforeRow = document.createElement('tr');
      beforeRow.className = 'before';
      beforeRow.dataset.article = article;
      beforeRow.innerHTML = `
        <td class="dist-td" title="${description}">${article}</td>
        <td class="dist-td">${toDisplayValue(Object.values(original).reduce((a, b) => a + b, 0))}</td>
        <td class="dist-td">${monthsInShop}</td>
        <td class="dist-td">${type}</td>
        ${shops.map(shop => `
          <td class="dist-td">${toDisplayValue(moduleState.stockSalesData[article]?.[shop]?.sales || 0)}</td>
          <td class="dist-td">${toDisplayValue(original[shop] || 0)}</td>
        `).join('')}
        <td class="dist-td toggle-button-cell">
          ${hasRelocations ? `<button class="expand-toggle-btn" data-article="${article}">${isExpanded ? '➖' : '➕'}</button>` : '' }
        </td>
      `;
      rows.push(beforeRow);

      const afterRow = document.createElement('tr');
      afterRow.className = 'after';
      afterRow.dataset.article = article;
      if (!isExpanded) afterRow.classList.add('hidden');
      afterRow.innerHTML = `
        <td class="dist-td">После</td>
        <td class="dist-td">${toDisplayValue(totalAvailable)}</td>
        <td class="dist-td">${monthsInShop}</td>
        <td class="dist-td">${type}</td>
        ${shops.map(shop => `
          <td class="dist-td">${toDisplayValue(moduleState.stockSalesData[article]?.[shop]?.sales || 0)}</td>
          <td class="dist-td clickable-cell" data-article="${article}" data-shop="${shop}">${toDisplayValue(updated[shop] || 0)}</td>
        `).join('')}
        <td class="dist-td"></td>
      `;
      rows.push(afterRow);

      const detailRow = document.createElement('tr');
      detailRow.className = 'relocation-details-row';
      detailRow.dataset.article = article;
      if (!isExpanded) detailRow.classList.add('hidden');
      detailRow.innerHTML = `
        <td class="dist-td"></td>
        <td class="dist-td"></td>
        <td class="dist-td"></td>
        <td class="dist-td"></td>
        ${shops.map(shop => {
          const shopMoves = relocations.filter(r => r.fromShop === shop || r.toShop === shop);
          if (!shopMoves.length) {
            return `<td class="dist-td" style="background:var(--dist-surface2);"></td><td class="dist-td" style="background:var(--dist-surface2);"></td>`;
          }
          const summary = shopMoves.map(r => {
            const direction = r.fromShop === shop
              ? `<span style="color:var(--dist-red);">В ${moduleState.shopNameMap[r.toShop] || r.toShop}</span>`
              : `<span style="color:var(--dist-green);">От ${moduleState.shopNameMap[r.fromShop] || r.fromShop}</span>`;
            const idx = moduleState.relocationData.relocations.findIndex(rel =>
              rel.article === r.article && rel.fromShop === r.fromShop && rel.toShop === r.toShop && rel.amount === r.amount
            );
            return `
              <div style="margin-bottom:4px;">
                <span class="edit-reloc-btn" data-index="${idx}">${direction} (${r.amount})</span>
                <button class="remove-reloc-btn" data-article="${r.article}" data-from="${r.fromShop}" data-to="${r.toShop}" data-amount="${r.amount}">x</button>
              </div>
            `;
          }).join('');
          return `<td class="dist-td" colspan="2" style="background:var(--dist-surface2); font-size:12px;">${summary}</td>`;
        }).join('')}
        <td class="dist-td"></td>
      `;
      rows.push(detailRow);

      return rows;
    }

    function appendSummaryRows() {
      const totalRow = (label, totalMap, grandTotal) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="dist-td"><strong>${label}</strong></td>
          <td class="dist-td"><strong>${toDisplayValue(grandTotal)}</strong></td>
          <td class="dist-td"></td>
          <td class="dist-td"></td>
          ${shops.map(shop => `<td class="dist-td"></td><td class="dist-td"><strong>${toDisplayValue(totalMap[shop])}</strong></td>`).join('')}
          <td class="dist-td"></td>
        `;
        tableBody.appendChild(row);
      };
      
      totalRow('Итого до', totalBefore, globalBefore);
      totalRow('Итого после', totalAfter, globalAfter);

      const modelRow = (label, shopMap, totalCount) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="dist-td"><strong>${label}</strong></td>
          <td class="dist-td"><strong>${totalCount}</strong></td>
          <td class="dist-td"></td>
          <td class="dist-td"></td>
          ${shops.map(shop => `<td class="dist-td"></td><td class="dist-td"><strong>${shopMap[shop]}</strong></td>`).join('')}
          <td class="dist-td"></td>
        `;
        tableBody.appendChild(row);
      };
      
      modelRow('Итого моделей до', modelCountBeforeShop, modelCountBefore);
      modelRow('Итого моделей после', modelCountAfterShop, modelCountAfter);
    }

    function renderVisibleRows() {
      const startIndex = Math.floor(tableView.scrollTop / rowHeight);
      const endIndex = Math.min(startIndex + Math.ceil(tableView.clientHeight / rowHeight) + buffer, filteredItems.length);
      tableBody.innerHTML = '';

      if (startIndex > 0) {
        const spacerRow = document.createElement('tr');
        spacerRow.innerHTML = `<td colspan="${5 + shops.length * 2 + 1}" style="height: ${startIndex * rowHeight}px; padding: 0;"></td>`;
        tableBody.appendChild(spacerRow);
      }

      for (let i = startIndex; i < endIndex; i++) {
        createRowsForItem(filteredItems[i]).forEach(row => tableBody.appendChild(row));
      }

      appendSummaryRows();

      if (endIndex < filteredItems.length) {
        const spacerRow = document.createElement('tr');
        spacerRow.innerHTML = `<td colspan="${5 + shops.length * 2 + 1}" style="height: ${(filteredItems.length - endIndex) * rowHeight}px; padding: 0;"></td>`;
        tableBody.appendChild(spacerRow);
      }
    }

    function renderAllRows() {
      tableBody.innerHTML = '';
      filteredItems.forEach(item => createRowsForItem(item).forEach(row => tableBody.appendChild(row)));
      appendSummaryRows();
    }

    if (useVirtual) {
      tableView.style.maxHeight = '';
      tableView.style.overflowY = 'scroll';
      tableView.onscroll = () => requestAnimationFrame(renderVisibleRows);
      renderVisibleRows();
    } else {
      tableView.onscroll = null;
      tableView.style.overflowY = 'auto';
      renderAllRows();
    }

    tableBody.onclick = e => {
      const cell = e.target.closest('.clickable-cell');
      if (cell) openRelocationModal(cell.dataset.article, cell.dataset.shop);

      const editBtn = e.target.closest('.edit-reloc-btn');
      if (editBtn) {
        const idx = parseInt(editBtn.dataset.index, 10);
        const relocation = moduleState.relocationData.relocations[idx];
        if (relocation) openRelocationModalForEdit(idx, relocation);
      }

      const toggleBtn = e.target.closest('.expand-toggle-btn');
      if (toggleBtn) {
        const article = toggleBtn.dataset.article;
        const rows = tableBody.querySelectorAll(`[data-article="${article}"]:not(.before)`);
        const isExpanded = moduleState.expandedArticles.has(article);
        rows.forEach(row => row.classList.toggle('hidden', isExpanded));
        if (isExpanded) {
          moduleState.expandedArticles.delete(article);
          toggleBtn.textContent = '➕';
        } else {
          moduleState.expandedArticles.add(article);
          toggleBtn.textContent = '➖';
        }
      }

      const removeBtn = e.target.closest('.remove-reloc-btn');
      if (removeBtn) {
        const { article, from, to, amount } = removeBtn.dataset;
        const idx = moduleState.relocationData.relocations.findIndex(r =>
          r.article === article && r.fromShop === from && r.toShop === to && r.amount === +amount
        );
        if (idx !== -1) {
          moduleState.relocationData.relocations.splice(idx, 1);
          updateTableAfterRelocation(article, to, from, +amount);
          useVirtual ? renderVisibleRows() : renderAllRows();
        }
      }
    };

    document.querySelectorAll('.dist-filter-row input').forEach(input => {
      input.addEventListener('input', () => {
        filteredItems = applyFiltersToItems(items);
        useVirtual ? renderVisibleRows() : renderAllRows();
      });
    });

    const globalExpandBtn = document.getElementById('globalExpandBtn');
    if (globalExpandBtn) {
      globalExpandBtn.addEventListener('click', e => {
        const showAll = e.target.textContent.includes('Все');
        e.target.textContent = showAll ? 'Свернуть' : 'Все';
        moduleState.expandedArticles = new Set(showAll ? items.map(i => i.article) : []);
        useVirtual ? renderVisibleRows() : renderAllRows();
      });
    }

    if (elements.relocationResults) elements.relocationResults.style.display = 'block';
  }

  function applyFiltersToItems(items) {
    const filters = {};
    document.querySelectorAll('.dist-filter-row input').forEach(filter => {
      const column = parseInt(filter.dataset.column);
      const value = filter.value.trim().toLowerCase();
      if (value) {
        filters[column] = value;
      }
    });
    
    return items.filter(item => {
      return Object.entries(filters).every(([column, filterValue]) => {
        const cellValue = Object.values(item)[column];
        return cellValue && cellValue.toString().toLowerCase().includes(filterValue);
      });
    });
  }
  
  async function handleRelocationAnalyzeClick() {
    if (!moduleState.stockSalesFile) {
      showNotification('Пожалуйста, загрузите файл остатков и продаж', false, 'relocation');
      return;
    }

    try {
      showNotification('Обработка файла...', true, 'relocation');

      if (moduleState.shops.length === 0) {
        await fetchShops();
      }

      moduleState.shopsDistributeMap = {};
      moduleState.relocateMap = {};
      moduleState.shops.forEach(shop => {
        const normalized = normalizeShopName(shop.shop_name);
        moduleState.shopsDistributeMap[normalized] = shop.distribute !== false;
        moduleState.relocateMap[normalized] = shop.relocate !== false;
      });

      const { items, shops } = await processStockSalesForRelocation(moduleState.stockSalesFile);
      moduleState.relocationItems = items;

      items.forEach(item => {
        if (!item.originalShops) {
          item.originalShops = { ...(item.shops || {}) };
        }
        if (!item.group && moduleState.stockSalesData[item.article]) {
          item.group = moduleState.stockSalesData[item.article]['Группа'] || '';
        }
      });

      moduleState.filteredRelocationItems = items;

      populateTypeDropdown(items);
      populateGroupDropdown(items);

      renderRelocationTable(items, shops);

      if (elements.relocationResults) elements.relocationResults.style.display = 'block';
      showNotification('Анализ завершен', true, 'relocation');

      const fileInputsRow = document.querySelector('#relocationTab .dist-file-row');
      if (fileInputsRow) fileInputsRow.style.display = 'none';

    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, false, 'relocation');
    }
  }
  
  function setupDragScroll() {
    const distributionTableView = document.querySelector('#distributionTab .dist-table-view');
    const relocationTableView = document.querySelector('#relocationTab .dist-table-view');

    const tableViews = [distributionTableView, relocationTableView];

    tableViews.forEach(tableView => {
      if (!tableView) return;

      let isDragging = false;
      let startX, startScrollLeft;

      tableView.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('td, th');
        if (!cell || cell.cellIndex < 4 || e.target.tagName === 'INPUT') return;
        
        isDragging = true;
        tableView.classList.add('dragging');
        startX = e.pageX;
        startScrollLeft = tableView.scrollLeft;
        e.preventDefault();
      });

      tableView.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.pageX - startX;
        tableView.scrollLeft = startScrollLeft - dx;
      });

      const stopDragging = () => {
        isDragging = false;
        tableView.classList.remove('dragging');
      };

      tableView.addEventListener('mouseleave', stopDragging);
      window.addEventListener('mouseup', stopDragging);
    });
  }
  
  async function downloadDistributionFile() {
    if (!moduleState.distributionResults || !moduleState.distributionResults.length) {
      showNotification('Нет данных для скачивания', false, 'distribution');
      return;
    }

    try {
      showNotification('Подготовка файла...', true, 'distribution');
      
      const XLSX = await loadXLSX();
      
      const SHOP_EXPORT_ORDER = [
        'Торговый Центр Тирасполь',
        'Магазин Тирасполь -2',
        'Магазин Бендеры',
        'Торговый Центр Бендеры',
        'Магазин Рыбница',
        'Магазин Рыбница-2',
        'Магазин Дубоссары',
        'Магазин Григориополь',
        'Магазин Днестровск',
        'Магазин Слободзея',
        'Магазин Каменка',
        'Магазин Первомайск'
      ].map(name => normalizeShopName(name));

      const wsData = [];
      
      const headerRow = ['Код', 'Номенклатура', 'Всего', '', ...SHOP_EXPORT_ORDER.map(shop => moduleState.shopNameMap[shop] || shop)];
      wsData.push(headerRow);
      wsData.push(['', '', '', '', ...SHOP_EXPORT_ORDER.map(() => '')]);
      
      moduleState.distributionResults.forEach(item => {
        const row = [];
        const articleData = moduleState.stockSalesData[item.article];
        const code = articleData?.code || articleData?.['Код'] || '';
        row.push(code);
        row.push(item.description || '');
        row.push(item.stock);
        row.push('');
        
        SHOP_EXPORT_ORDER.forEach(shop => {
          const value = item.distribution?.[shop];
          row.push(value && value > 0 ? value : '');
        });
        
        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Распределение");
      
      XLSX.writeFile(wb, `distribution_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`);
      
      showNotification('Файл успешно скачан', true, 'distribution');
    } catch (error) {
      showNotification('Ошибка при скачивании файла: ' + error.message, false, 'distribution');
    }
  }

  async function sendRelocationMail() {
    if (!moduleState.relocationData.relocations?.length) {
      showNotification('Нет данных для отправки', false, 'relocation');
      return;
    }

    try {
      showNotification('Отправка писем...', true, 'relocation');

      const resp = await fetch('/api/send-relocation-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relocations: moduleState.relocationData.relocations,
          shops: moduleState.shops,
          userEmail: moduleState.userEmail || null
        })
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Ошибка отправки писем');

      showNotification('Письма успешно отправлены', true, 'relocation');
    } catch (e) {
      showNotification('Ошибка отправки писем: ' + e.message, false, 'relocation');
    }
  }

  function showPreviewModal() {
    const relocations = moduleState.relocationData.relocations || [];
    const shops = moduleState.shops || [];

    if (relocations.length === 0) {
      showNotification('Нет данных для предпросмотра', false, 'relocation');
      return;
    }

    const shopTasks = {};

    relocations.forEach(reloc => {
      if (!shopTasks[reloc.fromShop]) shopTasks[reloc.fromShop] = { give: [], receive: [] };
      if (!shopTasks[reloc.toShop]) shopTasks[reloc.toShop] = { give: [], receive: [] };

      shopTasks[reloc.fromShop].give.push(reloc);
      shopTasks[reloc.toShop].receive.push(reloc);
    });

    let html = `<h3 style="color:var(--dist-text);margin-bottom:16px;">Предпросмотр писем</h3>`;

    for (const shopName in shopTasks) {
      const shopInfo = shops.find(s => normalizeShopName(s.shop_name) === shopName);
      const displayName = shopInfo ? shopInfo.shop_name : shopName;

      html += `<h4 style="color:var(--dist-text);margin:16px 0 8px;">${displayName}</h4>`;

      const tasks = shopTasks[shopName];

      if (tasks.give.length > 0) {
        html += `
        <p style="color:var(--dist-text-muted);margin:4px 0;"><strong>Что отдать:</strong></p>
        <table class="dist-table" style="margin-bottom:12px;width:100%;">
          <thead>
            <tr>
              <th class="dist-th">Артикул</th>
              <th class="dist-th">Описание</th>
              <th class="dist-th">В магазин</th>
              <th class="dist-th">Количество</th>
            </tr>
          </thead>
          <tbody>`;
        tasks.give.forEach(r => {
          html += `
            <tr>
              <td class="dist-td">${r.article}</td>
              <td class="dist-td">${r.description}</td>
              <td class="dist-td">${r.toShop}</td>
              <td class="dist-td">${r.amount}</td>
            </tr>`;
        });
        html += `
          </tbody>
        </table>`;
      }

      if (tasks.receive.length > 0) {
        html += `
        <p style="color:var(--dist-text-muted);margin:4px 0;"><strong>Что получить:</strong></p>
        <table class="dist-table" style="margin-bottom:12px;width:100%;">
          <thead>
            <tr>
              <th class="dist-th">Артикул</th>
              <th class="dist-th">Описание</th>
              <th class="dist-th">Из магазина</th>
              <th class="dist-th">Количество</th>
            </tr>
          </thead>
          <tbody>`;
        tasks.receive.forEach(r => {
          html += `
            <tr>
              <td class="dist-td">${r.article}</td>
              <td class="dist-td">${r.description}</td>
              <td class="dist-td">${r.fromShop}</td>
              <td class="dist-td">${r.amount}</td>
            </tr>`;
        });
        html += `
          </tbody>
        </table>`;
      }
    }

    const modal = elements.previewModal;
    const content = elements.previewContent;
    if (modal && content) {
      content.innerHTML = html;
      modal.classList.add('active');
    }
  }

  function showConfirmation(message, onConfirm) {
    if (!elements.confirmationModal || !elements.confirmationMessage || !elements.confirmYes || !elements.confirmNo) {
      if (onConfirm) onConfirm();
      return;
    }
    
    elements.confirmationMessage.textContent = message;
    elements.confirmationModal.classList.add('active');
    
    const handleConfirm = () => {
      elements.confirmationModal.classList.remove('active');
      if (onConfirm) onConfirm();
      cleanup();
    };
    
    const handleCancel = () => {
      elements.confirmationModal.classList.remove('active');
      cleanup();
    };
    
    const cleanup = () => {
      elements.confirmYes.removeEventListener('click', handleConfirm);
      elements.confirmNo.removeEventListener('click', handleCancel);
      const closeBtn = elements.confirmationModal.querySelector('.dist-modal-close');
      if (closeBtn) closeBtn.removeEventListener('click', handleCancel);
    };
    
    elements.confirmYes.addEventListener('click', handleConfirm);
    elements.confirmNo.addEventListener('click', handleCancel);
    
    const closeBtn = elements.confirmationModal.querySelector('.dist-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', handleCancel);
  }

  function init() {
    if (!moduleState.expandedArticles) {
      moduleState.expandedArticles = new Set();
    }
    
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    if (elements.uploadDistributionBtn) {
      elements.uploadDistributionBtn.addEventListener('click', () => handleFileSelect('distributionFile'));
    }
    if (elements.uploadStockSalesBtn) {
      elements.uploadStockSalesBtn.addEventListener('click', () => handleFileSelect('stockSalesFile'));
    }
    if (elements.distributionFile) {
      elements.distributionFile.addEventListener('change', (e) => handleFileUpload(e, 'distribution', 'distribution'));
    }
    if (elements.stockSalesFile) {
      elements.stockSalesFile.addEventListener('change', (e) => handleFileUpload(e, 'stock', 'distribution'));
    }
    if (elements.analyzeBtn) {
      elements.analyzeBtn.addEventListener('click', handleAnalyzeClick);
    }
    if (elements.resetDistributionBtn) {
      elements.resetDistributionBtn.addEventListener('click', () => {
        showConfirmation('Вы уверены, что хотите сбросить распределение?', () => {
          if (elements.distributionResults) elements.distributionResults.style.display = 'none';
          if (elements.distributionFile) elements.distributionFile.value = '';
          if (elements.stockSalesFile) elements.stockSalesFile.value = '';
          if (elements.distributionFileName) elements.distributionFileName.textContent = '';
          if (elements.stockSalesFileName) elements.stockSalesFileName.textContent = '';
          moduleState.distributionFile = null;
          moduleState.stockSalesFile = null;
          moduleState.distributionResults = null;
          moduleState.stockSalesData = {};
          moduleState.shopNameMap = {};
          if (elements.analyzeBtn) elements.analyzeBtn.disabled = true;
          const fileInputsRow = document.querySelector('.dist-file-row');
          if (fileInputsRow) fileInputsRow.style.display = 'flex';
        });
      });
    }

    if (elements.relocationUploadStockSalesBtn) {
      elements.relocationUploadStockSalesBtn.addEventListener('click', () => elements.relocationStockSalesFile.click());
    }
    if (elements.relocationStockSalesFile) {
      elements.relocationStockSalesFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
          showNotification('Пожалуйста, выберите файл Excel (.xlsx или .xls)', false, 'relocation');
          return;
        }

        moduleState.stockSalesFile = file;
        if (elements.relocationStockSalesFileName) elements.relocationStockSalesFileName.textContent = file.name;
        if (elements.relocationAnalyzeBtn) elements.relocationAnalyzeBtn.disabled = false;
      });
    }

    if (elements.relocationAnalyzeBtn) {
      elements.relocationAnalyzeBtn.addEventListener('click', handleRelocationAnalyzeClick);
    }

    if (elements.previewMailBtn) {
      elements.previewMailBtn.addEventListener('click', showPreviewModal);
    }
    if (elements.closePreviewBtn) {
      elements.closePreviewBtn.addEventListener('click', () => {
        if (elements.previewModal) elements.previewModal.classList.remove('active');
      });
    }

    if (elements.resetRelocationBtn) {
      elements.resetRelocationBtn.addEventListener('click', () => {
        showConfirmation('Вы уверены, что хотите сбросить перемещения?', () => {
          if (elements.relocationResults) elements.relocationResults.style.display = 'none';
          if (elements.relocationStockSalesFile) elements.relocationStockSalesFile.value = '';
          if (elements.relocationStockSalesFileName) elements.relocationStockSalesFileName.textContent = '';
          moduleState.stockSalesFile = null;
          if (elements.relocationAnalyzeBtn) elements.relocationAnalyzeBtn.disabled = true;
          const fileInputsRow = document.querySelector('#relocationTab .dist-file-row');
          if (fileInputsRow) fileInputsRow.style.display = 'flex';
        });
      });
    }

    if (elements.downloadDistributionBtn) {
      elements.downloadDistributionBtn.removeEventListener('click', downloadDistributionFile);
      elements.downloadDistributionBtn.addEventListener('click', downloadDistributionFile);
    }
    if (elements.sendMailBtn) {
      elements.sendMailBtn.addEventListener('click', sendRelocationMail);
    }
    
    setupDragScroll();
    setupRelocationModal();

    if (elements.relocationFilterToggle && elements.relocationFilterContainer) {
      elements.relocationFilterToggle.addEventListener('click', () => {
        elements.relocationFilterContainer.classList.toggle('collapsed');
      });
    }

    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.addEventListener('click', () => {
        const typeDropdown = elements.typeDropdown;
        const groupDropdown = elements.groupDropdown;
        if (typeDropdown) typeDropdown.selectedIndex = -1;
        if (groupDropdown) groupDropdown.selectedIndex = -1;

        if (elements.typeFilterInput) elements.typeFilterInput.value = '';
        if (elements.groupFilterInput) elements.groupFilterInput.value = '';

        if (elements.selectedTypesList) elements.selectedTypesList.innerHTML = '';
        if (elements.selectedGroupsList) elements.selectedGroupsList.innerHTML = '';

        moduleState.filteredRelocationItems = [...moduleState.relocationItems];

        populateTypeDropdown(moduleState.relocationItems);
        populateGroupDropdown(moduleState.relocationItems);

        const shops = moduleState.shops
            .filter(shop => shop.relocate !== false)
            .sort((a, b) => a.priority - b.priority)
            .map(shop => normalizeShopName(shop.shop_name));

        renderRelocationTable(moduleState.filteredRelocationItems, shops);
      });
    }
  }

  init();

  function openRelocationModal(itemArticle, shopNormalized) {
    const modal = elements.relocationModal;
    const item = moduleState.relocationItems.find(i => i.article === itemArticle);

    if (!item) {
      return;
    }

    if (elements.relocationItemArticle) elements.relocationItemArticle.value = item.article;
    if (elements.relocationItemDescription) elements.relocationItemDescription.value = item.description;

    const stockInShop = item.shops?.[shopNormalized];

    if (elements.relocationFromShop) {
      elements.relocationFromShop.value = 
        `${moduleState.shopNameMap[shopNormalized] || shopNormalized} (в наличии: ${stockInShop})`;
    }

    const amountInput = elements.relocationAmount;
    if (amountInput) {
      amountInput.max = stockInShop ?? 0;
      amountInput.value = 1;
    }

    const toShopSelect = elements.relocationToShop;
    if (toShopSelect) {
      toShopSelect.innerHTML = '';

      Object.entries(moduleState.stockSalesData[itemArticle] || {}).forEach(([shop, data]) => {
        const shopSettings = moduleState.shops.find(s => normalizeShopName(s.shop_name) === shop);

        if (shop !== shopNormalized && shopSettings?.relocate !== false) {
          const option = document.createElement('option');
          option.value = shop;
          option.textContent = `${moduleState.shopNameMap[shop] || shop} (в наличии: ${data?.stock || 0})`;
          toShopSelect.appendChild(option);
        }
      });
    }

    moduleState.relocationData.currentItem = item;
    moduleState.relocationData.fromShop = shopNormalized;
    if (modal) modal.classList.add('active');
  }

  function openRelocationModalForEdit(index, relocation) {
    const modal = elements.relocationModal;
    const item = moduleState.relocationItems.find(i => i.article === relocation.article);

    if (!item) {
      return;
    }

    if (elements.relocationItemArticle) elements.relocationItemArticle.value = item.article;
    if (elements.relocationItemDescription) elements.relocationItemDescription.value = item.description;

    const normFromShop = normalizeShopName(relocation.fromShop);

    const fromShopStock = item.shops?.[normFromShop] ?? 0;

    if (elements.relocationFromShop) {
      elements.relocationFromShop.value = 
        `${moduleState.shopNameMap[relocation.fromShop] || relocation.fromShop} (в наличии: ${fromShopStock})`;
    }

    const amountInput = elements.relocationAmount;
    if (amountInput) {
      amountInput.max = fromShopStock;
      amountInput.value = relocation.amount;
    }

    const toShopSelect = elements.relocationToShop;
    if (toShopSelect) {
      toShopSelect.innerHTML = '';

      Object.entries(moduleState.stockSalesData[relocation.article] || {}).forEach(([shop, data]) => {
        const normShop = normalizeShopName(shop);
        const shopSettings = moduleState.shops.find(s => normalizeShopName(s.shop_name) === normShop);

        if (normShop !== normFromShop && shopSettings?.relocate !== false) {
          const option = document.createElement('option');
          option.value = shop;
          option.textContent = `${moduleState.shopNameMap[shop] || shop} (в наличии: ${data?.stock || 0})`;
          if (shop === relocation.toShop) {
            option.selected = true;
          }
          toShopSelect.appendChild(option);
        }
      });
    }

    moduleState.relocationData.currentItem = item;
    moduleState.relocationData.fromShop = relocation.fromShop;

    if (elements.confirmRelocation) {
      elements.confirmRelocation.dataset.editIndex = index;
    }

    if (modal) modal.classList.add('active');
  }

  function updateTableAfterRelocation(article, fromShop, toShop, amount) {
    const tableView = document.querySelector('#relocationTab .dist-table-view');
    const scrollTop = tableView ? tableView.scrollTop : 0;

    if (!moduleState.stockSalesData[article]) moduleState.stockSalesData[article] = {};
    if (!moduleState.stockSalesData[article][fromShop]) moduleState.stockSalesData[article][fromShop] = { sales: 0, stock: 0 };
    if (!moduleState.stockSalesData[article][toShop]) moduleState.stockSalesData[article][toShop] = { sales: 0, stock: 0 };

    moduleState.stockSalesData[article][fromShop].stock -= amount;
    moduleState.stockSalesData[article][toShop].stock += amount;

    const item = moduleState.relocationItems.find(i => i.article === article);
    if (item) {
      item.shops[fromShop] -= amount;
      if (item.shops[fromShop] <= 0) delete item.shops[fromShop];
      item.shops[toShop] = (item.shops[toShop] || 0) + amount;
    }

    const filterInputs = document.querySelectorAll(
      '#relocationTab .dist-filter-row input, #relocationTab .dist-filter-row select'
    );
    
    const filterState = {};
    filterInputs.forEach((input, index) => {
      const key = input.id || input.name || input.dataset.column;
      const value = input.value;
      
      if (key) {
        filterState[key] = value;
      }
    });

    const shops = moduleState.shops
      .filter(shop => shop.relocate !== false)
      .sort((a, b) => a.priority - b.priority)
      .map(shop => normalizeShopName(shop.shop_name));

    const filteredItems = moduleState.filteredRelocationItems || moduleState.relocationItems;
    
    renderRelocationTable(filteredItems, shops);

    setTimeout(() => {
      Object.entries(filterState).forEach(([key, value]) => {
        const selectors = [
          `#relocationTab .dist-filter-row [id="${key}"]`,
          `#relocationTab .dist-filter-row [name="${key}"]`,
          `#relocationTab .dist-filter-row [data-column="${key}"]`
        ];
        
        let el = null;
        
        for (const selector of selectors) {
          el = document.querySelector(selector);
          if (el) {
            break;
          }
        }
        
        if (el) {
          el.value = value;
          
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          const changeEvent = new Event('change', { bubbles: true, cancelable: true });
          
          el.dispatchEvent(inputEvent);
          el.dispatchEvent(changeEvent);
        }
      });
    }, 10);

    setTimeout(() => {
      const newTableView = document.querySelector('#relocationTab .dist-table-view');
      if (newTableView) {
        newTableView.scrollTop = scrollTop;
      }
    }, 20);
  }

  async function loadShopDistributionSettings() {
    try {
      const response = await fetch("/api/shop-distribution-settings");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const limits = await response.json();

      moduleState.shopTypeLimits = {};

      limits.forEach(limit => {
        const type = limit.product_type?.trim();
        const shopsMax = limit.shops_max;

        if (!type || typeof shopsMax !== 'object') {
          return;
        }

        moduleState.shopTypeLimits[type] = {};

        Object.entries(shopsMax).forEach(([shopName, maxQty]) => {
          const normalizedShop = normalizeShopName(shopName);
          const parsedQty = parseInt(maxQty);
          if (!normalizedShop || isNaN(parsedQty)) {
            return;
          }

          moduleState.shopTypeLimits[type][normalizedShop] = parsedQty;
        });
      });

      try {
        renderLimitsTable();
      } catch (err) {
        showNotification("Ошибка отрисовки таблицы", false, 'limits');
      }
    } catch (e) {
      showNotification("Ошибка загрузки ограничений", false, 'limits');
    }
  }

  function renderLimitsTable() {
    const tableHeadRow = document.getElementById('limitsHeaderRow');
    const tableBody = document.getElementById('limitsTableBody');

    if (!tableHeadRow || !tableBody) return;
    
    tableHeadRow.innerHTML = '';
    tableBody.innerHTML = '';

    const typeTh = document.createElement('th');
    typeTh.className = 'dist-th';
    typeTh.textContent = 'Тип товара';
    tableHeadRow.appendChild(typeTh);

    const massEditTh = document.createElement('th');
    massEditTh.className = 'dist-th';
    massEditTh.textContent = 'Массовое изменение';
    tableHeadRow.appendChild(massEditTh);

    const allShopNamesSet = new Set();
    Object.values(moduleState.shopTypeLimits || {}).forEach(limitObj => {
      Object.keys(limitObj).forEach(shopName => {
        allShopNamesSet.add(shopName);
      });
    });
    const shopNames = Array.from(allShopNamesSet).sort();

    shopNames.forEach(shop => {
      const th = document.createElement('th');
      th.className = 'dist-th';
      th.textContent = shop;
      tableHeadRow.appendChild(th);
    });

    const deleteTh = document.createElement('th');
    deleteTh.className = 'dist-th';
    deleteTh.textContent = 'Удалить';
    tableHeadRow.appendChild(deleteTh);

    Object.entries(moduleState.shopTypeLimits || {}).forEach(([type, limits]) => {
      const row = document.createElement('tr');

      const typeTd = document.createElement('td');
      typeTd.innerHTML = `<input class="dist-filter-input type-input" value="${type}" style="width:100%;" />`;
      row.appendChild(typeTd);

      const massEditTd = document.createElement('td');
      const massInput = document.createElement('input');
      massInput.className = 'dist-filter-input';
      massInput.placeholder = 'Все';

      massInput.addEventListener('input', () => {
        const value = massInput.value;
        row.querySelectorAll('input.shop-input').forEach(input => {
          if (!input.dataset.manual) {
            input.value = value;
          }
        });
      });

      massEditTd.appendChild(massInput);
      row.appendChild(massEditTd);

      shopNames.forEach(shop => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'dist-filter-input shop-input';
        input.dataset.shop = shop;
        input.value = limits[shop] ?? '';

        input.addEventListener('input', () => {
          input.dataset.manual = 'true';
        });

        td.appendChild(input);
        row.appendChild(td);
      });

      const deleteTd = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dist-reset-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.style.margin = '0';
      deleteBtn.addEventListener('click', () => row.remove());
      deleteTd.appendChild(deleteBtn);
      row.appendChild(deleteTd);

      tableBody.appendChild(row);
    });
  }

  const downloadRelocationBtn = elements.downloadRelocationBtn;

  if (downloadRelocationBtn) {
    downloadRelocationBtn.addEventListener("click", async () => {
      try {
        const XLSX = await loadXLSX();
        
        const headers = ["Артикул", "Описание", "Из магазина", "В магазин", "Количество"];
        const rows = moduleState.relocationData.relocations.map(r => [
          r.article,
          r.description,
          moduleState.shopNameMap[r.fromShop] || r.fromShop,
          moduleState.shopNameMap[r.toShop] || r.toShop,
          r.amount
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Перемещение");

        XLSX.writeFile(wb, "relocation.xlsx");
      } catch (err) {
        showNotification("Ошибка при формировании файла", false, "relocation");
      }
    });
  }

  if (elements.addLimitRowBtn) {
    elements.addLimitRowBtn.addEventListener('click', () => {
      const shopNames = Array.from(document.querySelectorAll('#limitsHeaderRow th'))
        .slice(2, -1)
        .map(th => th.textContent);

      const row = document.createElement('tr');

      const typeCell = document.createElement('td');
      typeCell.innerHTML = `<input class="dist-filter-input type-input" placeholder="Новый тип" style="width:100%;" />`;
      row.appendChild(typeCell);

      const massCell = document.createElement('td');
      const massInput = document.createElement('input');
      massInput.className = 'dist-filter-input';
      massInput.placeholder = 'Все';

      massInput.addEventListener('input', () => {
        const value = massInput.value;
        row.querySelectorAll('input.shop-input').forEach(input => {
          if (!input.dataset.manual) {
            input.value = value;
          }
        });
      });

      massCell.appendChild(massInput);
      row.appendChild(massCell);

      shopNames.forEach(shop => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'dist-filter-input shop-input';
        input.dataset.shop = shop;
        input.addEventListener('input', () => {
          input.dataset.manual = 'true';
        });
        td.appendChild(input);
        row.appendChild(td);
      });

      const deleteTd = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dist-reset-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.style.margin = '0';
      deleteBtn.addEventListener('click', () => row.remove());
      deleteTd.appendChild(deleteBtn);
      row.appendChild(deleteTd);

      elements.limitsTableBody.appendChild(row);
    });
  }

  if (elements.limitsTableBody) {
    elements.limitsTableBody.addEventListener('click', async e => {
      if (e.target.classList.contains('dist-reset-btn') && e.target.textContent === '✖') {
        const row = e.target.closest('tr');
        if (!row) return;

        const productTypeInput = row.querySelector('td:first-child input.type-input');
        if (!productTypeInput) {
          alert("Cannot find product type input");
          return;
        }

        const product_type = productTypeInput.value.trim();

        if (!product_type) {
          alert("Product type is empty");
          return;
        }

        if (!confirm(`Уверены что хотите удалить "${product_type}"?`)) {
          return;
        }

        try {
          const response = await fetch(`/api/shop-distribution-settings/${encodeURIComponent(product_type)}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          row.remove();
          alert(`"${product_type}" успешно удалено!`);

          loadShopDistributionSettings();
        } catch (error) {
          alert(`Ошибка при удалении: ${error.message}`);
        }
      }
    });
  }

  if (elements.saveLimitsBtn) {
    elements.saveLimitsBtn.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#limitsTableBody tr');
      const toSave = [];

      rows.forEach(row => {
        const typeInput = row.querySelector('.type-input');
        if (!typeInput) return;

        const type = typeInput.value.trim();
        if (!type) return;

        const inputs = row.querySelectorAll('.shop-input');

        inputs.forEach(input => {
          const rawVal = input.value.trim();
          const normalizedShop = normalizeShopName(input.dataset.shop);
          if (rawVal !== '' && normalizedShop) {
            const num = parseInt(rawVal);
            if (!isNaN(num)) {
              toSave.push({
                product_type: type,
                shop: normalizedShop,
                max: num
              });
            }
          }
        });
      });

      if (toSave.length === 0) {
        alert("Нет данных для сохранения.");
        return;
      }

      try {
        const grouped = {};
        toSave.forEach(({ product_type, shop, max }) => {
          if (!grouped[product_type]) {
            grouped[product_type] = {};
          }
          grouped[product_type][shop] = max;
        });

        const payload = Object.entries(grouped).map(([product_type, shops_max]) => ({
          product_type,
          shops_max
        }));

        const response = await fetch("/api/shop-distribution-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const savedData = await response.json();

        alert("Успешно сохранено!");
        loadShopDistributionSettings();
      } catch (error) {
        alert(`Error saving distribution limits: ${error.message}`);
      }
    });
  }

  async function loadShopRelocationSettings() {
    try {
      const response = await fetch("/api/shop-relocation-settings");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const limitsr = await response.json();

      moduleState.shopTypeLimits = {};

      limitsr.forEach(limit => {
        const type = limit.product_type?.trim();
        const shopsMax = limit.shops_max;

        if (!type || typeof shopsMax !== 'object') {
          return;
        }

        moduleState.shopTypeLimits[type] = {};

        Object.entries(shopsMax).forEach(([shopName, maxQty]) => {
          const normalizedShop = normalizeShopName(shopName);
          const parsedQty = parseInt(maxQty);
          if (!normalizedShop || isNaN(parsedQty)) {
            return;
          }

          moduleState.shopTypeLimits[type][normalizedShop] = parsedQty;
        });
      });

      try {
        renderLimitsrTable();
      } catch (err) {
        showNotification("Ошибка отрисовки таблицы", false, 'limitsr');
      }
    } catch (e) {
      showNotification("Ошибка загрузки ограничений", false, 'limitsr');
    }
  }

  function renderLimitsrTable() {
    const tableHeadRow = document.getElementById('limitsHeaderRowr');
    const tableBody = document.getElementById('limitsTableBodyr');

    if (!tableHeadRow || !tableBody) return;
    
    tableHeadRow.innerHTML = '';
    tableBody.innerHTML = '';

    const typeTh = document.createElement('th');
    typeTh.className = 'dist-th';
    typeTh.textContent = 'Тип товара';
    tableHeadRow.appendChild(typeTh);

    const massEditTh = document.createElement('th');
    massEditTh.className = 'dist-th';
    massEditTh.textContent = 'Массовое изменение';
    tableHeadRow.appendChild(massEditTh);

    const allShopNamesSet = new Set();
    Object.values(moduleState.shopTypeLimits || {}).forEach(limitObj => {
      Object.keys(limitObj).forEach(shopName => {
        allShopNamesSet.add(shopName);
      });
    });
    const shopNames = Array.from(allShopNamesSet).sort();

    shopNames.forEach(shop => {
      const th = document.createElement('th');
      th.className = 'dist-th';
      th.textContent = shop;
      tableHeadRow.appendChild(th);
    });

    const deleteTh = document.createElement('th');
    deleteTh.className = 'dist-th';
    deleteTh.textContent = 'Удалить';
    tableHeadRow.appendChild(deleteTh);

    Object.entries(moduleState.shopTypeLimits || {}).forEach(([type, limitsr]) => {
      const row = document.createElement('tr');

      const typeTd = document.createElement('td');
      typeTd.innerHTML = `<input class="dist-filter-input type-input" value="${type}" style="width:100%;" />`;
      row.appendChild(typeTd);

      const massEditTd = document.createElement('td');
      const massInput = document.createElement('input');
      massInput.className = 'dist-filter-input';
      massInput.placeholder = 'Все';

      massInput.addEventListener('input', () => {
        const value = massInput.value;
        row.querySelectorAll('input.shop-input').forEach(input => {
          if (!input.dataset.manual) {
            input.value = value;
          }
        });
      });

      massEditTd.appendChild(massInput);
      row.appendChild(massEditTd);

      shopNames.forEach(shop => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'dist-filter-input shop-input';
        input.dataset.shop = shop;
        input.value = limitsr[shop] ?? '';

        input.addEventListener('input', () => {
          input.dataset.manual = 'true';
        });

        td.appendChild(input);
        row.appendChild(td);
      });

      const deleteTd = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dist-reset-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.style.margin = '0';
      deleteBtn.addEventListener('click', () => row.remove());
      deleteTd.appendChild(deleteBtn);
      row.appendChild(deleteTd);

      tableBody.appendChild(row);
    });
  }

  if (elements.addLimitRowBtnr) {
    elements.addLimitRowBtnr.addEventListener('click', () => {
      const shopNames = Array.from(document.querySelectorAll('#limitsHeaderRowr th'))
        .slice(2, -1)
        .map(th => th.textContent);

      const row = document.createElement('tr');

      const typeCell = document.createElement('td');
      typeCell.innerHTML = `<input class="dist-filter-input type-input" placeholder="Новый тип" style="width:100%;" />`;
      row.appendChild(typeCell);

      const massCell = document.createElement('td');
      const massInput = document.createElement('input');
      massInput.className = 'dist-filter-input';
      massInput.placeholder = 'Все';
      massInput.addEventListener('input', () => {
        const value = massInput.value;
        row.querySelectorAll('input.shop-input').forEach(input => {
          if (!input.dataset.manual) {
            input.value = value;
          }
        });
      });
      massCell.appendChild(massInput);
      row.appendChild(massCell);

      shopNames.forEach(shop => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'dist-filter-input shop-input';
        input.dataset.shop = shop;
        input.addEventListener('input', () => {
          input.dataset.manual = 'true';
        });
        td.appendChild(input);
        row.appendChild(td);
      });

      const deleteCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dist-reset-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.style.margin = '0';
      deleteBtn.addEventListener('click', () => row.remove());
      deleteCell.appendChild(deleteBtn);
      row.appendChild(deleteCell);

      elements.limitsTableBodyr.appendChild(row);
    });
  }

  if (elements.limitsTableBodyr) {
    elements.limitsTableBodyr.addEventListener('click', async e => {
      if (e.target.classList.contains('dist-reset-btn') && e.target.textContent === '✖') {
        const row = e.target.closest('tr');
        if (!row) return;

        const productTypeInput = row.querySelector('td:first-child input.type-input');
        if (!productTypeInput) {
          alert("Cannot find product type input");
          return;
        }

        const product_type = productTypeInput.value.trim();

        if (!product_type) {
          alert("Product type is empty");
          return;
        }

        if (!confirm(`Уверены что хотите удалить "${product_type}"?`)) {
          return;
        }

        try {
          const response = await fetch(`/api/shop-relocation-settings/${encodeURIComponent(product_type)}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          row.remove();
          alert(`"${product_type}" успешно удалено!`);

          loadShopRelocationSettings();
        } catch (error) {
          alert(`Error deleting relocation limits: ${error.message}`);
        }
      }
    });
  }

  if (elements.saveLimitsBtnr) {
    elements.saveLimitsBtnr.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#limitsTableBodyr tr');
      const toSave = [];

      rows.forEach(row => {
        const typeInput = row.querySelector('.type-input');
        if (!typeInput) return;

        const type = typeInput.value.trim();
        if (!type) return;

        const inputs = row.querySelectorAll('.shop-input');

        inputs.forEach(input => {
          const rawVal = input.value.trim();
          const normalizedShop = normalizeShopName(input.dataset.shop);
          if (rawVal !== '' && normalizedShop) {
            const num = parseInt(rawVal, 10);
            if (!isNaN(num)) {
              toSave.push({
                product_type: type,
                shop: normalizedShop,
                max: num
              });
            }
          }
        });
      });

      if (toSave.length === 0) {
        alert("Нет данных для сохранения.");
        return;
      }

      try {
        const grouped = {};
        toSave.forEach(({ product_type, shop, max }) => {
          if (!grouped[product_type]) {
            grouped[product_type] = {};
          }
          grouped[product_type][shop] = max;
        });

        const payload = Object.entries(grouped).map(([product_type, shops_max]) => ({
          product_type,
          shops_max
        }));

        const response = await fetch("/api/shop-relocation-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const savedData = await response.json();

        alert("Успешно сохранено!");
        loadShopRelocationSettings();
      } catch (error) {
        alert(`Error saving relocation limits: ${error.message}`);
      }
    });
  }

  function updateRowAfterRelocation(article, fromShop, toShop) {
    const row = document.querySelector(`#relocationTableBody tr[data-article="${article}"]`);
    if (!row) return;

    if (fromShop) {
      const fromCell = row.querySelector(`td[data-shop="${fromShop}"]`);
      if (fromCell) {
        const stock = moduleState.stockSalesData[article]?.[fromShop]?.stock || 0;
        fromCell.textContent = stock > 0 ? stock : '';
      }
    }

    if (toShop) {
      const toCell = row.querySelector(`td[data-shop="${toShop}"]`);
      if (toCell) {
        const stock = moduleState.stockSalesData[article]?.[toShop]?.stock || 0;
        toCell.textContent = stock > 0 ? stock : '';
      }
    }
  }

  function confirmRelocation() {
    const toShop = elements.relocationToShop?.value?.trim();
    const amountInput = elements.relocationAmount;
    const confirmBtn = elements.confirmRelocation;
    const editIndex = confirmBtn ? confirmBtn.dataset.editIndex : null;

    if (!amountInput || !toShop) {
      showNotification('Ошибка: форма заполнена некорректно', false, 'relocation');
      return;
    }

    const rawAmount = amountInput.value.trim();
    const amount = Number(rawAmount);

    if (!toShop || !Number.isFinite(amount) || amount <= 0) {
      showNotification('Пожалуйста, укажите магазин и корректное количество (> 0)', false, 'relocation');
      return;
    }

    const { currentItem, fromShop } = moduleState.relocationData;

    if (!currentItem || !fromShop) {
      showNotification('Ошибка: не выбрана позиция для перемещения', false, 'relocation');
      return;
    }

    const available = currentItem.shops?.[fromShop] ?? 0;

    if (editIndex !== undefined && editIndex !== '') {
      const index = parseInt(editIndex, 10);
      const existing = moduleState.relocationData.relocations[index];

      if (!Number.isInteger(index) || index < 0 || !existing) {
        showNotification('Ошибка при обновлении перемещения — неверный индекс', false, 'relocation');
        return;
      }

      const previousAmount = existing.amount ?? 0;
      const delta = amount - previousAmount;

      if (delta === 0) {
        showNotification('Количество не изменилось', true, 'relocation');
      } else if (delta > available) {
        showNotification(`Недостаточно товара для увеличения перемещения (доступно: ${available})`, false, 'relocation');
        return;
      } else {
        moduleState.relocationData.relocations[index] = {
          article: currentItem.article,
          description: currentItem.description,
          fromShop,
          toShop,
          amount
        };

        updateTableAfterRelocation(currentItem.article, fromShop, toShop, delta);
        updateRowAfterRelocation(currentItem.article, fromShop, toShop);

        showNotification('Перемещение обновлено', true, 'relocation');
      }
    } else {
      if (amount > available) {
        showNotification(`Недостаточно товара для перемещения (в наличии: ${available})`, false, 'relocation');
        return;
      }

      moduleState.relocationData.relocations.push({
        article: currentItem.article,
        description: currentItem.description,
        fromShop,
        toShop,
        amount
      });

      updateTableAfterRelocation(currentItem.article, fromShop, toShop, amount);
      updateRowAfterRelocation(currentItem.article, fromShop, toShop);

      showNotification('Перемещение добавлено', true, 'relocation');
    }

    if (confirmBtn) {
      delete confirmBtn.dataset.editIndex;
    }

    if (elements.relocationModal) elements.relocationModal.classList.remove('active');
  }

  function setupRelocationModal() {
    const modal = elements.relocationModal;
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.dist-modal-close');
    const cancelBtn = elements.cancelRelocation;
    
    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    });
    
    if (elements.confirmRelocation) {
      elements.confirmRelocation.addEventListener('click', confirmRelocation);
    }
    
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}