export async function loadModule(container, { chatId, userData }) {
  
  async function getNotifications() {
    const response = await fetch('/api/stock-notifications');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки уведомлений');
    return result.data;
  }

  async function createNotification(data) {
    const response = await fetch('/api/stock-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка создания');
    return result.data;
  }

  async function updateNotification(id, data) {
    const response = await fetch(`/api/stock-notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка обновления');
    return result.data;
  }

  async function deleteNotification(id) {
    const response = await fetch(`/api/stock-notifications/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления');
    return result;
  }

  async function fetchProductData(code) {
    const response = await fetch('/api/stock-notifications/fetch-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка получения данных');
    return result.data;
  }

  container.innerHTML = `
    <div class="stock-notifications-wrapper">
      <div class="stock-notifications-main">
        <div class="stock-notifications-content">
          <div class="add-form">
            <h3 class="add-form-title">Добавить товар для отслеживания</h3>
            <div class="add-form-group">
              <label class="add-form-label">Код товара</label>
              <input type="text" class="add-form-input" id="productCodeInput" placeholder="Т-000103859, 000103859 или 103859">
              <div class="add-form-error" id="codeError"></div>
            </div>
            <div class="add-form-group" id="productPreview" style="display: none;">
              <label class="add-form-label">Найденный товар</label>
              <div style="background: var(--sn-surface); padding: 12px; border-radius: var(--sn-radius-sm); border: 1px solid var(--sn-border);">
                <div style="font-weight: 500; margin-bottom: 4px; color: var(--sn-text);" id="previewName"></div>
                <div style="font-size: 13px; color: var(--sn-text-muted);" id="previewCode"></div>
                <div id="stockMessage"></div>
              </div>
            </div>
            <div class="add-form-group">
              <label class="add-form-label">Комментарий <span>*</span></label>
              <input type="text" class="add-form-input" id="commentInput" placeholder="Обязательно введите комментарий">
            </div>
            <div class="add-form-actions">
              <button class="btn btn-primary" id="addButton" disabled>Добавить</button>
              <button class="btn btn-secondary" id="clearButton">Очистить</button>
            </div>
          </div>
          <div class="stock-notifications-filters" id="filtersSection">
            <div class="stock-notifications-filter-group">
              <label class="stock-notifications-filter-label">Название товара</label>
              <input type="text" class="stock-notifications-filter-input" id="nameFilter" placeholder="Поиск по названию...">
            </div>
            <div class="stock-notifications-filter-group">
              <label class="stock-notifications-filter-label">Код товара</label>
              <input type="text" class="stock-notifications-filter-input" id="codeFilter" placeholder="Т-000000000">
            </div>
          </div>
          <div id="notificationsTable"></div>
        </div>
      </div>
      
      <div class="stock-notifications-sidebar">
        <h2 class="stock-notifications-sidebar-title">Настройки</h2>
        <div id="dashboardSettings"></div>
      </div>
    </div>
  `;

  const productCodeInput = container.querySelector('#productCodeInput');
  const codeError = container.querySelector('#codeError');
  const productPreview = container.querySelector('#productPreview');
  const previewName = container.querySelector('#previewName');
  const previewCode = container.querySelector('#previewCode');
  const stockMessage = container.querySelector('#stockMessage');
  const commentInput = container.querySelector('#commentInput');
  const addButton = container.querySelector('#addButton');
  const clearButton = container.querySelector('#clearButton');
  const nameFilter = container.querySelector('#nameFilter');
  const codeFilter = container.querySelector('#codeFilter');
  const filtersSection = container.querySelector('#filtersSection');
  const notificationsTable = container.querySelector('#notificationsTable');
  const dashboardSettings = container.querySelector('#dashboardSettings');

  let notifications = [];
  let filteredNotifications = [];
  let currentProductData = null;
  let searchTimeout = null;
  let fetchTimeout = null;
  
  let settings = {
    showSentNotifications: false,
    useAdminUrl: false,
    hideProductFilters: false,
    showProductCode: true,
    showProductName: true,
    showComment: true,
    showCreatedAt: false,
    showLastChecked: true,
    showSentAt: false,
    showStatus: true,
    expandedSettings: ['displayPreferences']
  };

  function loadUserSettings() {
    const saved = localStorage.getItem('stock-notifications-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...settings,
        ...parsed,
        showProductCode: true,
        showProductName: true,
        showComment: true,
        showLastChecked: true,
        showStatus: true
      };
    }
    return settings;
  }

  function saveUserSettings() {
    localStorage.setItem('stock-notifications-settings', JSON.stringify(settings));
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

  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function filterNotifications() {
    const name = nameFilter.value.toLowerCase();
    const code = codeFilter.value.toLowerCase();

    filteredNotifications = notifications.filter(notification => {
      if (!settings.showSentNotifications && notification.notification_sent) {
        return false;
      }

      if (name && !notification.product_name?.toLowerCase().includes(name)) {
        return false;
      }

      if (code && !notification.product_code?.toLowerCase().includes(code)) {
        return false;
      }

      return true;
    });
  }

  function showEditModal(notification) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    modalOverlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Редактировать товар</h3>
          <button class="modal-close" id="closeModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6L18 18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="add-form-group">
            <label class="add-form-label">Код товара</label>
            <input type="text" class="add-form-input" id="modalProductCode" value="${notification.product_code || ''}" placeholder="Т-000103859, 000103859 или 103859">
            <div class="add-form-error" id="modalCodeError"></div>
          </div>
          <div class="add-form-group" id="modalProductPreview" style="display: none;">
            <label class="add-form-label">Найденный товар</label>
            <div style="background: var(--sn-surface); padding: 12px; border-radius: var(--sn-radius-sm); border: 1px solid var(--sn-border);">
              <div style="font-weight: 500; margin-bottom: 4px; color: var(--sn-text);" id="modalPreviewName"></div>
              <div style="font-size: 13px; color: var(--sn-text-muted);" id="modalPreviewCode"></div>
              <div id="modalStockMessage"></div>
            </div>
          </div>
          <div class="add-form-group">
            <label class="add-form-label">Комментарий <span>*</span></label>
            <input type="text" class="add-form-input" id="modalComment" value="${notification.comment || ''}" placeholder="Обязательно введите комментарий">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelModal">Отмена</button>
          <button class="btn btn-primary" id="saveModal">Сохранить</button>
        </div>
      </div>
    `;

    container.appendChild(modalOverlay);

    const modalProductCode = modalOverlay.querySelector('#modalProductCode');
    const modalCodeError = modalOverlay.querySelector('#modalCodeError');
    const modalProductPreview = modalOverlay.querySelector('#modalProductPreview');
    const modalPreviewName = modalOverlay.querySelector('#modalPreviewName');
    const modalPreviewCode = modalOverlay.querySelector('#modalPreviewCode');
    const modalStockMessage = modalOverlay.querySelector('#modalStockMessage');
    const modalComment = modalOverlay.querySelector('#modalComment');
    const saveButton = modalOverlay.querySelector('#saveModal');
    const closeButton = modalOverlay.querySelector('#closeModal');
    const cancelButton = modalOverlay.querySelector('#cancelModal');

    let modalProductData = {
      product_code: notification.product_code,
      product_id: notification.product_id,
      item_url: notification.item_url,
      product_name: notification.product_name
    };

    let modalFetchTimeout;

    function handleModalCodeInput() {
      const code = modalProductCode.value.trim();
      
      clearTimeout(modalFetchTimeout);
      
      if (!code) {
        modalProductPreview.style.display = 'none';
        modalProductData = null;
        saveButton.disabled = true;
        modalCodeError.textContent = '';
        return;
      }

      modalFetchTimeout = setTimeout(async () => {
        try {
          saveButton.disabled = true;
          modalCodeError.textContent = '';
          
          let cleanCode = code;
          
          if (cleanCode.startsWith('Т-') || cleanCode.startsWith('T-')) {
            cleanCode = cleanCode.substring(2);
          }
          
          cleanCode = cleanCode.replace(/\D/g, '');
          cleanCode = cleanCode.padStart(9, '0');
          cleanCode = `Т-${cleanCode}`;
          
          const data = await fetchProductData(cleanCode);
          
          modalProductData = data;
          modalPreviewName.textContent = data.product_name;
          modalPreviewCode.textContent = data.product_code;
          
          const existingProduct = notifications.find(n => n.product_code === data.product_code && n.id !== notification.id);
          
          if (existingProduct) {
            modalStockMessage.innerHTML = '<div class="stock-message error"><strong>❌ Нельзя сохранить</strong> - товар уже есть в списке отслеживания</div>';
            saveButton.disabled = true;
          } else if (data.has_stock) {
            modalStockMessage.innerHTML = '<div class="stock-message error"><strong>Внимание!</strong> Этот товар сейчас в наличии.</div>';
            saveButton.disabled = false;
          } else {
            modalStockMessage.innerHTML = '<div class="stock-message success">Товар отсутствует в наличии</div>';
            saveButton.disabled = false;
          }
          
          modalProductPreview.style.display = 'block';
        } catch (error) {
          modalProductPreview.style.display = 'none';
          modalProductData = null;
          modalCodeError.textContent = error.message;
          saveButton.disabled = true;
        }
      }, 500);
    }

    modalProductCode.addEventListener('input', handleModalCodeInput);

    saveButton.addEventListener('click', async () => {
      if (!modalProductData) return;

      if (!modalComment.value.trim()) {
        alert('Пожалуйста, введите комментарий');
        modalComment.focus();
        return;
      }

      if (modalProductData.product_code !== notification.product_code) {
        const existingProduct = notifications.find(n => 
          n.product_code === modalProductData.product_code && n.id !== notification.id
        );
        
        if (existingProduct) {
          alert('Этот товар уже есть в списке отслеживания');
          return;
        }
      }

      try {
        const data = {
          ...modalProductData,
          comment: modalComment.value || null
        };

        await updateNotification(notification.id, data);
        modalOverlay.remove();
        await loadNotifications();
      } catch (error) {
        alert('Ошибка обновления: ' + error.message);
      }
    });

    const closeModal = () => {
      clearTimeout(modalFetchTimeout);
      modalOverlay.remove();
    };

    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  function renderNotifications() {
    filterNotifications();

    if (filteredNotifications.length === 0) {
      notificationsTable.innerHTML = `
        <div class="empty-state">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Уведомления не найдены</h3>
          <p>Добавьте товары для отслеживания</p>
        </div>
      `;
      return;
    }

    let tableHTML = `
      <div class="stock-notifications-table-container">
        <table class="stock-notifications-data-table">
          <thead>
            <tr>
              <th style="width: 120px;">Код товара</th>
              ${settings.showProductName ? '<th>Название товара</th>' : ''}
              ${settings.showStatus ? '<th style="width: 120px;">Статус</th>' : ''}
              ${settings.showCreatedAt ? '<th style="width: 140px;">Дата создания</th>' : ''}
              ${settings.showSentAt ? '<th style="width: 140px;">Дата отправки</th>' : ''}
              ${settings.showLastChecked ? '<th style="width: 140px;">Последняя проверка</th>' : ''}
              ${settings.showComment ? '<th>Комментарий</th>' : ''}
              <th style="width: 80px;">Действия</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredNotifications.forEach(notification => {
      let productUrl = null;
      
      if (settings.useAdminUrl && notification.product_id) {
        productUrl = `https://hi-tech.md/569def4.php?dispatch=products.update&product_id=${notification.product_id}`;
      } else if (notification.item_url) {
        productUrl = notification.item_url;
      }

      const codeCell = productUrl 
        ? `<a href="${productUrl}" target="_blank" class="product-code-cell" title="${notification.product_code || ''}">${notification.product_code || '-'}</a>`
        : `<span class="product-code-cell" style="cursor: default; color: var(--sn-text-muted);" title="${notification.product_code || ''}">${notification.product_code || '-'}</span>`;

      const statusBadge = notification.notification_sent 
        ? '<span class="status-badge sent">Отправлено</span>'
        : '<span class="status-badge not-sent">Не отправлено</span>';

      tableHTML += `
        <tr data-id="${notification.id}">
          <td>${codeCell}</td>
          ${settings.showProductName ? `<td><div class="product-name-with-stock" title="${notification.product_name || ''}">${notification.product_name || '-'}</div></td>` : ''}
          ${settings.showStatus ? `<td>${statusBadge}</td>` : ''}
          ${settings.showCreatedAt ? `<td class="date-cell" title="${formatDate(notification.created_at)}">${formatDate(notification.created_at)}</td>` : ''}
          ${settings.showSentAt ? `<td class="date-cell" title="${formatDate(notification.notification_sent_at)}">${formatDate(notification.notification_sent_at)}</td>` : ''}
          ${settings.showLastChecked ? `<td class="date-cell" title="${formatDate(notification.last_checked)}">${formatDate(notification.last_checked)}</td>` : ''}
          ${settings.showComment ? `<td><div class="comment-cell" title="${notification.comment || ''}">${notification.comment || '-'}</div></td>` : ''}
          <td class="action-cell">
            <button class="btn-icon edit-btn" data-id="${notification.id}" title="Редактировать">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3L21 7L7 21H3V17L17 3Z"/>
              </svg>
            </button>
            <button class="btn-icon delete delete-btn" data-id="${notification.id}" title="Удалить">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 4V2H16V4"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table></div>`;
    notificationsTable.innerHTML = tableHTML;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const notification = notifications.find(n => n.id == id);
        if (notification) {
          showEditModal(notification);
        }
      });
    });

    container.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        
        if (!confirm('Вы уверены, что хотите удалить это уведомление?')) return;

        try {
          await deleteNotification(id);
          await loadNotifications();
        } catch (error) {
          alert('Ошибка удаления: ' + error.message);
        }
      });
    });
  }

  async function loadNotifications() {
    try {
      notificationsTable.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <div>Загрузка уведомлений...</div>
        </div>
      `;

      notifications = await getNotifications();
      renderNotifications();
    } catch (error) {
      notificationsTable.innerHTML = `
        <div class="empty-state" style="color: var(--sn-red);">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Ошибка загрузки</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  function handleCodeInput() {
    const code = productCodeInput.value.trim();
    
    clearTimeout(fetchTimeout);
    
    if (!code) {
      productPreview.style.display = 'none';
      currentProductData = null;
      addButton.disabled = true;
      codeError.textContent = '';
      return;
    }

    fetchTimeout = setTimeout(async () => {
      try {
        addButton.disabled = true;
        codeError.textContent = '';
        
        let cleanCode = code;
        
        if (cleanCode.startsWith('Т-') || cleanCode.startsWith('T-')) {
          cleanCode = cleanCode.substring(2);
        }
        
        cleanCode = cleanCode.replace(/\D/g, '');
        cleanCode = cleanCode.padStart(9, '0');
        cleanCode = `Т-${cleanCode}`;
        
        const data = await fetchProductData(cleanCode);
        
        currentProductData = data;
        previewName.textContent = data.product_name;
        previewCode.textContent = data.product_code;
        
        const existingProduct = notifications.find(n => n.product_code === data.product_code);
        
        if (existingProduct) {
          stockMessage.innerHTML = '<div class="stock-message error"><strong>❌ Нельзя добавить</strong> - товар уже есть в списке отслеживания</div>';
          addButton.disabled = true;
        } else if (data.has_stock) {
          stockMessage.innerHTML = '<div class="stock-message error"><strong>❌ Нельзя добавить</strong> - товар уже есть в наличии на складе</div>';
          addButton.disabled = true;
        } else {
          stockMessage.innerHTML = '<div class="stock-message success"><strong>✓ Можно добавить</strong> - товар отсутствует в наличии</div>';
          if (commentInput.value.trim()) {
            addButton.disabled = false;
          } else {
            addButton.disabled = true;
          }
        }
        
        productPreview.style.display = 'block';
      } catch (error) {
        productPreview.style.display = 'none';
        currentProductData = null;
        codeError.textContent = error.message;
      }
    }, 500);
  }

  function resetForm() {
    productCodeInput.value = '';
    commentInput.value = '';
    productPreview.style.display = 'none';
    currentProductData = null;
    addButton.disabled = true;
    codeError.textContent = '';
    addButton.textContent = 'Добавить';
    delete addButton.dataset.editId;
  }

  function renderSettings() {
    const settingsData = [
      {
        id: 'displayPreferences',
        title: 'Настройки отображения',
        settings: [
          {
            id: 'showSentNotifications',
            label: 'Показывать отправленные уведомления',
            type: 'toggle',
            value: settings.showSentNotifications
          },
          {
            id: 'hideProductFilters',
            label: 'Скрыть фильтры товаров',
            type: 'toggle',
            value: settings.hideProductFilters
          },
          {
            id: 'useAdminUrl',
            label: 'Использовать ссылку на админ панель',
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
            id: 'showStatus',
            label: 'Статус отправки',
            type: 'toggle',
            value: settings.showStatus
          },
          {
            id: 'showCreatedAt',
            label: 'Дата создания',
            type: 'toggle',
            value: settings.showCreatedAt
          },
          {
            id: 'showSentAt',
            label: 'Дата отправки',
            type: 'toggle',
            value: settings.showSentAt
          },
          {
            id: 'showLastChecked',
            label: 'Последняя проверка',
            type: 'toggle',
            value: settings.showLastChecked
          },
          {
            id: 'showComment',
            label: 'Комментарий',
            type: 'toggle',
            value: settings.showComment
          }
        ]
      }
    ];

    let settingsHTML = '';

    settingsData.forEach(settingGroup => {
      const isExpanded = settings.expandedSettings.includes(settingGroup.id);

      settingsHTML += `
        <div class="stock-notifications-settings-block">
          <div class="stock-notifications-settings-header" data-setting="${settingGroup.id}">
            <h3>${settingGroup.title}</h3>
            <svg class="stock-notifications-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="stock-notifications-settings-content ${isExpanded ? 'expanded' : ''}">
      `;

      settingGroup.settings.forEach(setting => {
        if (setting.type === 'toggle') {
          settingsHTML += `
            <div class="stock-notifications-setting-item">
              <span class="stock-notifications-setting-label">
                ${setting.label}
              </span>
              <label class="stock-notifications-toggle">
                <input type="checkbox" 
                       ${setting.value ? 'checked' : ''}
                       data-setting="${setting.id}">
                <span class="stock-notifications-slider"></span>
              </label>
            </div>
          `;
        }
      });

      settingsHTML += `</div></div>`;
    });

    dashboardSettings.innerHTML = settingsHTML;

    container.querySelectorAll('.stock-notifications-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const settingId = header.dataset.setting;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.stock-notifications-expand-icon');

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

    container.querySelectorAll('.stock-notifications-toggle input').forEach(input => {
      input.addEventListener('change', (e) => {
        const settingId = e.target.dataset.setting;
        const isChecked = e.target.checked;

        if (settingId === 'showSentNotifications') {
          settings.showSentNotifications = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'hideProductFilters') {
          settings.hideProductFilters = isChecked;
          saveUserSettings();
          filtersSection.style.display = isChecked ? 'none' : 'flex';
        } else if (settingId === 'useAdminUrl') {
          settings.useAdminUrl = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showProductName') {
          settings.showProductName = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showStatus') {
          settings.showStatus = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showCreatedAt') {
          settings.showCreatedAt = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showSentAt') {
          settings.showSentAt = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showLastChecked') {
          settings.showLastChecked = isChecked;
          saveUserSettings();
          renderNotifications();
        } else if (settingId === 'showComment') {
          settings.showComment = isChecked;
          saveUserSettings();
          renderNotifications();
        }
      });
    });
  }

  function checkAddButtonState() {
    if (currentProductData && !currentProductData.has_stock) {
      const existingProduct = notifications.find(n => n.product_code === currentProductData.product_code);
      if (existingProduct) {
        addButton.disabled = true;
      } else {
        addButton.disabled = !commentInput.value.trim();
      }
    } else {
      addButton.disabled = true;
    }
  }

  async function init() {
    settings = loadUserSettings();
    
    renderSettings();
    filtersSection.style.display = settings.hideProductFilters ? 'none' : 'flex';
    
    await loadNotifications();

    productCodeInput.addEventListener('input', handleCodeInput);
    commentInput.addEventListener('input', checkAddButtonState);

    addButton.addEventListener('click', async () => {
      if (!currentProductData) return;

      if (currentProductData.has_stock) {
        alert('Этот товар уже есть в наличии и не может быть добавлен в список отслеживания');
        return;
      }

      if (!commentInput.value.trim()) {
        alert('Пожалуйста, введите комментарий');
        commentInput.focus();
        return;
      }

      const existingProduct = notifications.find(n => n.product_code === currentProductData.product_code);
      
      if (existingProduct) {
        alert('Этот товар уже добавлен в список отслеживания');
        return;
      }

      try {
        const data = {
          ...currentProductData,
          comment: commentInput.value || null
        };

        await createNotification(data);
        resetForm();
        await loadNotifications();
      } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
      }
    });

    clearButton.addEventListener('click', resetForm);

    const debouncedFilter = debounce(() => {
      renderNotifications();
    }, 300);

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