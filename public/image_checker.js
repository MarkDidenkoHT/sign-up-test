export async function loadModule(container, { chatId, userData }) {

  async function getSessions() {
    const response = await fetch('/api/image-checker/sessions');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки сессий');
    return result.data;
  }

  async function getSessionProducts(sessionDate) {
    const response = await fetch(`/api/image-checker/session/${sessionDate}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки продуктов');
    return result.data;
  }

  async function updateProductResult(productId, result) {
    const response = await fetch('/api/image-checker/update-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId, result })
    });
    const resultData = await response.json();
    if (!resultData.success) throw new Error(resultData.error || 'Ошибка обновления');
    return resultData.data;
  }

  async function getCategories() {
    const response = await fetch('/api/image-checker/categories');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки категорий');
    return result.data;
  }

  container.innerHTML = `
    <div class="image-checker-wrapper">
      <div class="image-checker-main">
        <div class="image-checker-content">
          <div class="image-checker-sessions-header" id="sessionsHeader">
            <div class="image-checker-sessions-title">
              <span>📅 Сессии проверки</span>
              <span class="session-count" id="sessionCount"></span>
            </div>
            <svg class="image-checker-sessions-arrow expanded" id="sessionsArrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="image-checker-sessions-container expanded" id="sessionsContainer">
            <div id="sessionsList"></div>
          </div>
          <div class="image-checker-filters" id="filtersSection" style="display: none;">
            <div class="image-checker-filter-group">
              <label class="image-checker-filter-label">Категория</label>
              <select class="image-checker-filter-select" id="categoryFilter">
                <option value="">Все категории</option>
              </select>
            </div>
            <div class="image-checker-filter-group">
              <label class="image-checker-filter-label">Название товара</label>
              <input type="text" class="image-checker-filter-input" id="nameFilter" placeholder="Поиск по названию...">
            </div>
            <div class="image-checker-filter-group">
              <label class="image-checker-filter-label">Код товара</label>
              <input type="text" class="image-checker-filter-input" id="codeFilter" placeholder="Т-000000000">
            </div>
          </div>
          <div id="productsTable"></div>
        </div>
      </div>
      
      <div class="image-checker-sidebar">
        <h2 class="image-checker-sidebar-title">Настройки</h2>
        <div id="dashboardSettings"></div>
      </div>
    </div>
  `;

  const sessionsHeader = container.querySelector('#sessionsHeader');
  const sessionsContainer = container.querySelector('#sessionsContainer');
  const sessionsArrow = container.querySelector('#sessionsArrow');
  const sessionCount = container.querySelector('#sessionCount');
  const sessionsList = container.querySelector('#sessionsList');
  const filtersSection = container.querySelector('#filtersSection');
  const categoryFilter = container.querySelector('#categoryFilter');
  const nameFilter = container.querySelector('#nameFilter');
  const codeFilter = container.querySelector('#codeFilter');
  const productsTable = container.querySelector('#productsTable');
  const dashboardSettings = container.querySelector('#dashboardSettings');

  let sessions = [];
  let currentSession = null;
  let sessionProducts = [];
  let categories = [];
  let filteredProducts = [];
  let settings = {
    hideCompletedSessions: true,
    hideCompletedItems: true,
    hideProductFilters: true,
    showProductCode: true,
    showProductName: true,
    showCategory: false,
    showStatus: false,
    showResult: true,
    useAdminUrl: true,
    expandedSettings: ['displayPreferences']
  };
  let isSessionsExpanded = true;

  let searchTimeout = null;

  function loadUserSettings() {
    const saved = localStorage.getItem('image-checker-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.useAdminUrl === undefined) parsed.useAdminUrl = true;
      if (parsed.hideCompletedItems === undefined) parsed.hideCompletedItems = true;
      parsed.showProductCode = true;
      parsed.showResult = true;
      return parsed;
    }
    return settings;
  }

  function saveUserSettings() {
    localStorage.setItem('image-checker-settings', JSON.stringify(settings));
  }

  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(searchTimeout);
        func(...args);
      };
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(later, wait);
    };
  }

  function calculateSessionStats(products) {
    if (!products || products.length === 0) {
      return { total: 0, trueCount: 0, percentage: 0 };
    }

    const trueCount = products.filter(p => p.result === true).length;
    const percentage = Math.round((trueCount / products.length) * 100);
    
    return {
      total: products.length,
      trueCount,
      percentage
    };
  }

  function toggleSessions() {
    isSessionsExpanded = !isSessionsExpanded;
    if (isSessionsExpanded) {
      sessionsContainer.classList.remove('collapsed');
      sessionsArrow.classList.add('expanded');
    } else {
      sessionsContainer.classList.add('collapsed');
      sessionsArrow.classList.remove('expanded');
    }
  }

  function renderSessions() {
    let filteredSessions = [...sessions];

    if (settings.hideCompletedSessions) {
      filteredSessions = filteredSessions.filter(session => {
        const stats = calculateSessionStats(session.products);
        return stats.percentage < 100;
      });
    }

    sessionCount.textContent = `(${filteredSessions.length})`;

    if (filteredSessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <p>Нет доступных сессий</p>
        </div>
      `;
      return;
    }

    let sessionsHTML = '<div class="sessions-grid">';

    filteredSessions.forEach(session => {
      const stats = calculateSessionStats(session.products);
      const isActive = currentSession && currentSession.session === session.session;
      const date = new Date(session.session);
      const formattedDate = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let percentageClass = 'good';
      if (stats.percentage < 50) percentageClass = 'bad';
      else if (stats.percentage < 80) percentageClass = 'warning';

      sessionsHTML += `
        <div class="session-card ${isActive ? 'active' : ''}" data-session="${session.session}">
          <div class="session-date">${formattedDate}</div>
          <div class="session-stats">
            <div>
              <div>Товаров: ${stats.total}</div>
              <div>Проверено: ${stats.trueCount}</div>
            </div>
            <div class="session-percentage ${percentageClass}">${stats.percentage}%</div>
          </div>
          <div class="session-progress">
            <div class="session-progress-bar" style="width: ${stats.percentage}%"></div>
          </div>
        </div>
      `;
    });

    sessionsHTML += '</div>';
    sessionsList.innerHTML = sessionsHTML;

    container.querySelectorAll('.session-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const sessionDate = e.currentTarget.dataset.session;
        await loadSessionProducts(sessionDate);
      });
    });
  }

  async function loadSessionProducts(sessionDate) {
    try {
      productsTable.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <div>Загрузка товаров...</div>
        </div>
      `;

      const products = await getSessionProducts(sessionDate);
      sessionProducts = products;
      currentSession = { session: sessionDate };
      
      categories = await getCategories();
      populateCategoryFilter();
      
      filtersSection.style.display = settings.hideProductFilters ? 'none' : 'flex';
      renderProducts();
      
      renderSessions();
      
      if (!isSessionsExpanded) {
        toggleSessions();
      }
    } catch (error) {
      productsTable.innerHTML = `
        <div class="empty-state" style="color: var(--ic-red);">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Ошибка загрузки</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  function populateCategoryFilter() {
    const uniqueCategories = [...new Set(categories)];
    
    categoryFilter.innerHTML = '<option value="">Все категории</option>';
    uniqueCategories.forEach(category => {
      if (category) {
        categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
      }
    });
  }

  function filterProducts() {
    const category = categoryFilter.value;
    const name = nameFilter.value.toLowerCase();
    const code = codeFilter.value.toLowerCase();

    filteredProducts = sessionProducts.filter(product => {
      if (settings.hideCompletedItems && product.result === true) {
        return false;
      }

      if (category && product.product_category !== category) {
        return false;
      }

      if (name && !product.product_name?.toLowerCase().includes(name)) {
        return false;
      }

      if (code && !product.product_code?.toLowerCase().includes(code)) {
        return false;
      }

      return true;
    });
  }

  function renderProducts() {
    filterProducts();

    if (filteredProducts.length === 0) {
      productsTable.innerHTML = `
        <div class="empty-state">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Товары не найдены</h3>
          <p>Измените параметры фильтрации</p>
        </div>
      `;
      return;
    }

    let tableHTML = `
      <div class="image-checker-table-container">
        <table class="image-checker-data-table">
          <thead>
            <tr>
              <th style="width: 100px; text-align: center;">Результат</th>
              <th style="width: 120px;">Код товара</th>
              ${settings.showProductName ? '<th>Название товара</th>' : ''}
              ${settings.showCategory ? '<th>Категория</th>' : ''}
              ${settings.showStatus ? '<th>Статус</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    filteredProducts.forEach(product => {
      let productUrl = null;
      
      if (settings.useAdminUrl && product.product_id) {
        productUrl = `https://hi-tech.md/569def4.php?dispatch=products.update&product_id=${product.product_id}`;
      } else if (product.item_url) {
        productUrl = product.item_url;
      }

      const statusBadge = product.product_status === 'Вкл' 
        ? '<span class="status-badge active">Вкл</span>'
        : '<span class="status-badge inactive">Выкл</span>';

      const codeCell = productUrl 
        ? `<a href="${productUrl}" target="_blank" class="product-code-cell">${product.product_code || '-'}</a>`
        : `<span class="product-code-cell" style="cursor: default; color: var(--ic-text-muted);">${product.product_code || '-'}</span>`;

      tableHTML += `
        <tr data-id="${product.id}">
          <td class="result-cell">
            <div class="image-checker-checkbox ${product.result ? 'checked' : ''}" 
                 data-id="${product.id}"
                 data-result="${product.result}"></div>
          </td>
          <td>${codeCell}</td>
          ${settings.showProductName ? `<td>${product.product_name || '-'}</td>` : ''}
          ${settings.showCategory ? `<td>${product.product_category || '-'}</td>` : ''}
          ${settings.showStatus ? `<td>${statusBadge}</td>` : ''}
        </tr>
      `;
    });

    tableHTML += `</tbody></table></div>`;
    productsTable.innerHTML = tableHTML;

    container.querySelectorAll('.image-checker-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', async (e) => {
        const productId = e.target.dataset.id;
        const currentResult = e.target.dataset.result === 'true';
        const newResult = !currentResult;

        try {
          e.target.classList.toggle('checked');
          e.target.dataset.result = newResult;
          
          await updateProductResult(productId, newResult);
          
          const productIndex = sessionProducts.findIndex(p => p.id == productId);
          if (productIndex !== -1) {
            sessionProducts[productIndex].result = newResult;
          }
          
          if (settings.hideCompletedItems && newResult === true) {
            renderProducts();
          }
          
          const stats = calculateSessionStats(sessionProducts);
          if (stats.percentage === 100 && settings.hideCompletedSessions) {
            await loadSessions();
          } else {
            renderSessions();
          }
        } catch (error) {
          e.target.classList.toggle('checked');
          e.target.dataset.result = currentResult;
          alert('Ошибка обновления: ' + error.message);
        }
      });
    });
  }

  async function loadSessions() {
    try {
      sessionsList.innerHTML = `
        <div class="loading" style="padding: 20px;">
          <div class="loading-spinner"></div>
          <div>Загрузка сессий...</div>
        </div>
      `;

      sessions = await getSessions();
      renderSessions();
    } catch (error) {
      sessionsList.innerHTML = `
        <div class="empty-state" style="color: var(--ic-red);">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Ошибка загрузки сессий</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  function renderSettings() {
    const settingsData = [
      {
        id: 'displayPreferences',
        title: 'Настройки отображения',
        settings: [
          {
            id: 'hideCompletedSessions',
            label: 'Скрыть полностью проверенные сессии',
            type: 'toggle',
            value: settings.hideCompletedSessions
          },
          {
            id: 'hideCompletedItems',
            label: 'Скрыть проверенные товары',
            type: 'toggle',
            value: settings.hideCompletedItems
          },
          {
            id: 'hideProductFilters',
            label: 'Скрыть фильтры товаров',
            type: 'toggle',
            value: settings.hideProductFilters
          },
          {
            id: 'useAdminUrl',
            label: 'Использовать ссылку на админ панель вместо сайта',
            type: 'toggle',
            value: settings.useAdminUrl
          }
        ]
      },
      {
        id: 'tableColumnVisibility',
        title: 'Видимость столбцов таблицы',
        settings: [
          {
            id: 'showProductName',
            label: 'Название товара',
            type: 'toggle',
            value: settings.showProductName
          },
          {
            id: 'showCategory',
            label: 'Категория',
            type: 'toggle',
            value: settings.showCategory
          },
          {
            id: 'showStatus',
            label: 'Статус',
            type: 'toggle',
            value: settings.showStatus
          }
        ]
      }
    ];

    let settingsHTML = '';

    settingsData.forEach(settingGroup => {
      const isExpanded = settings.expandedSettings.includes(settingGroup.id);

      settingsHTML += `
        <div class="image-checker-settings-block">
          <div class="image-checker-settings-header" data-setting="${settingGroup.id}">
            <h3>${settingGroup.title}</h3>
            <svg class="image-checker-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="image-checker-settings-content ${isExpanded ? 'expanded' : ''}">
      `;

      settingGroup.settings.forEach(setting => {
        if (setting.type === 'toggle') {
          settingsHTML += `
            <div class="image-checker-setting-item">
              <span class="image-checker-setting-label">
                ${setting.label}
              </span>
              <label class="image-checker-toggle">
                <input type="checkbox" 
                       ${setting.value ? 'checked' : ''}
                       data-setting="${setting.id}">
                <span class="image-checker-slider"></span>
              </label>
            </div>
          `;
        }
      });

      settingsHTML += `</div></div>`;
    });

    dashboardSettings.innerHTML = settingsHTML;

    container.querySelectorAll('.image-checker-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const settingId = header.dataset.setting;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.image-checker-expand-icon');

        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');

        const index = settings.expandedSettings.indexOf(settingId);

        if (content.classList.contains('expanded')) {
          if (index === -1) {
            settings.expandedSettings.push(settingId);
          }
        } else {
          if (index > -1) {
            settings.expandedSettings.splice(index, 1);
          }
        }

        saveUserSettings();
      });
    });

    container.querySelectorAll('.image-checker-toggle input').forEach(input => {
      input.addEventListener('change', (e) => {
        const settingId = e.target.dataset.setting;
        const isChecked = e.target.checked;

        if (settingId === 'hideCompletedSessions') {
          settings.hideCompletedSessions = isChecked;
          saveUserSettings();
          renderSessions();
        } else if (settingId === 'hideCompletedItems') {
          settings.hideCompletedItems = isChecked;
          saveUserSettings();
          renderProducts();
        } else if (settingId === 'hideProductFilters') {
          settings.hideProductFilters = isChecked;
          saveUserSettings();
          filtersSection.style.display = isChecked ? 'none' : 'flex';
        } else if (settingId === 'showProductName') {
          settings.showProductName = isChecked;
          saveUserSettings();
          renderProducts();
        } else if (settingId === 'showCategory') {
          settings.showCategory = isChecked;
          saveUserSettings();
          renderProducts();
        } else if (settingId === 'showStatus') {
          settings.showStatus = isChecked;
          saveUserSettings();
          renderProducts();
        } else if (settingId === 'useAdminUrl') {
          settings.useAdminUrl = isChecked;
          saveUserSettings();
          renderProducts();
        }
      });
    });
  }

  async function init() {
    settings = loadUserSettings();
    
    renderSettings();
    
    sessionsHeader.addEventListener('click', toggleSessions);
    
    await loadSessions();

    const debouncedFilter = debounce(() => {
      if (sessionProducts.length > 0) {
        renderProducts();
      }
    }, 300);

    categoryFilter.addEventListener('change', debouncedFilter);
    nameFilter.addEventListener('input', debouncedFilter);
    codeFilter.addEventListener('input', debouncedFilter);
  }

  init();

  return {
    cleanup() {
      container.innerHTML = '';
    }
  };
}