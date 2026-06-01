export async function loadModule(container, {}) {
  
  container.innerHTML = `
    <div class="shop-module-wrapper">
      <div id="progressModal" class="shop-module-modal">
        <div class="shop-module-modal-content">
          <div class="shop-module-modal-header">
            <span>Отправка сообщений</span>
            <button class="shop-module-modal-close">&times;</button>
          </div>
          <div class="shop-module-progress-container">
            <div class="shop-module-progress-bar">
              <div class="shop-module-progress-fill" id="progressBar"></div>
            </div>
            <div class="shop-module-progress-text" id="progressText">Подготовка к отправке...</div>
          </div>
          <div class="shop-module-modal-actions">
            <button id="cancelSendingBtn" class="shop-module-btn shop-module-btn-secondary">Отменить</button>
          </div>
        </div>
      </div>

      <div id="confirmModal" class="shop-module-modal">
        <div class="shop-module-modal-content">
          <div class="shop-module-modal-header">
            <span>Подтверждение</span>
            <button class="shop-module-modal-close">&times;</button>
          </div>
          <div class="shop-module-modal-body">
            <div id="confirmMessage">Вы уверены, что хотите отправить сообщение X пользователям?</div>
          </div>
          <div class="shop-module-modal-actions">
            <button id="confirmCancelBtn" class="shop-module-btn shop-module-btn-secondary">Отмена</button>
            <button id="confirmSendBtn" class="shop-module-btn shop-module-btn-primary">Отправить</button>
          </div>
        </div>
      </div>

      <div class="shop-module-tabs-nav">
        <button class="shop-module-tab-btn active" data-tab="message">Отправка сообщений</button>
        <button class="shop-module-tab-btn" data-tab="history">История</button>
      </div>

      <div id="messageTab" class="shop-module-tab-content active">
        <div class="shop-module-card">
          <div class="shop-module-type-row">
            <span class="shop-module-type-label">Тип сообщения</span>
            <select id="messageTypeSelect" class="shop-module-select shop-module-select-inline">
              <option value="News">Новость</option>
              <option value="Promo">Акция</option>
              <option value="Install">Установка</option>
            </select>
            <div id="promoDateSection" style="display:none; display:none; align-items:center; gap:8px; margin-left:16px;">
              <span class="shop-module-type-label">Даты акции</span>
              <input type="date" id="promoDateFrom" class="shop-module-filter-input shop-module-date-inline"/>
              <span class="shop-module-type-label">—</span>
              <input type="date" id="promoDateTo" class="shop-module-filter-input shop-module-date-inline"/>
            </div>
          </div>
          <div id="statusMessage" class="shop-module-status"></div>
        </div>

        <div class="shop-module-main-grid">
          <div class="shop-module-selection-panel">
            <div class="shop-module-panel-header">
              <span class="shop-module-panel-icon">🏪</span>
              Магазины
              <div class="shop-module-panel-tabs">
                <button class="shop-module-tab-btn small" data-mode="all">Все</button>
                <button class="shop-module-tab-btn small" data-mode="shops-only">Магазины</button>
                <button class="shop-module-tab-btn small active" data-mode="shops">Список</button>
                <button class="shop-module-tab-btn small" data-mode="regions">Регионы</button>
              </div>
            </div>
            <div class="shop-module-panel-content" id="shopsContainer">
              <div class="shop-module-loading">Загрузка магазинов...</div>
            </div>
          </div>

          <div class="shop-module-selection-panel">
            <div class="shop-module-panel-header">
              <span class="shop-module-panel-icon">📦</span>
              Группы товаров
            </div>
            <div class="shop-module-panel-content" id="groupsContainer">
              <div class="shop-module-loading">Загрузка групп...</div>
            </div>
          </div>

          <div class="shop-module-selection-panel shop-module-recipients-panel">
            <div class="shop-module-panel-header">
              <span class="shop-module-panel-icon">📊</span>
              Получатели
            </div>
            <div id="recipientsTableContainer" style="display:block;">
              <div class="shop-module-recipients-search">
                <input type="text" id="recipientsSearchInput" class="shop-module-filter-input" placeholder="Поиск получателей..."/>
              </div>
              <div class="shop-module-recipients-list" id="recipientsList"></div>
            </div>
          </div>
        </div>

        <div id="messageFormSection" class="shop-module-form-section">
          <div class="shop-module-composer">
            <div class="shop-module-composer-attachments" id="composerAttachments"></div>
            <div class="shop-module-composer-row">
              <div class="shop-module-composer-input-wrap">
                <textarea id="messageText" class="shop-module-composer-textarea" placeholder="Напишите сообщение... Вставьте URL изображения прямо в текст"></textarea>
              </div>
              <div class="shop-module-composer-actions">
                <label class="shop-module-composer-btn" title="Прикрепить файл">
                  <input type="file" id="photoFileInput" accept="image/*" multiple style="display:none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </label>
                <button id="sendMessageBtn" class="shop-module-composer-send" disabled title="Отправить">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        </div>

      <div id="historyTab" class="shop-module-tab-content"></div>

      <div class="shop-module-toast-container" id="toastContainer"></div>
    </div>
  `;

  const moduleState = {
    shopUsers: [],
    availableShops: [],
    availableGroups: [],
    selectedShops: new Set(),
    selectedGroups: new Set(),
    isLoading: false,
    isSending: false,
    cancelSending: false,
    sentMessages: [],
    selectedRegions: new Set(),
    shopSelectionMode: 'shops',
    availableRegions: ['Центр и Юг', 'Каменка', 'Рыбница', 'Сервисный центр', 'Офис'],
    photoAttachments: [],
    messageType: 'News',
    excludedUserChatIds: new Set(),
    historyFilters: {
      dateFrom: '',
      dateTo: '',
      type: '',
      messageContent: ''
    },
    allHistoryData: [],
    promoDates: { from: '', to: '' },
    recipientsSearchQuery: ''
  };

  const elements = {
    shopsContainer: document.getElementById("shopsContainer"),
    groupsContainer: document.getElementById("groupsContainer"),
    messageText: document.getElementById("messageText"),
    sendMessageBtn: document.getElementById("sendMessageBtn"),
    statusMessage: document.getElementById("statusMessage"),
    progressModal: document.getElementById("progressModal"),
    confirmModal: document.getElementById("confirmModal"),
    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText"),
    cancelSendingBtn: document.getElementById("cancelSendingBtn"),
    confirmMessage: document.getElementById("confirmMessage"),
    confirmCancelBtn: document.getElementById("confirmCancelBtn"),
    confirmSendBtn: document.getElementById("confirmSendBtn"),
    modalCloseButtons: document.querySelectorAll(".shop-module-modal-close"),
    photoFileInput: document.getElementById('photoFileInput'),
    composerAttachments: document.getElementById('composerAttachments'),
    messageTypeSelect: document.getElementById('messageTypeSelect'),
    promoDateFrom: document.getElementById('promoDateFrom'),
    promoDateTo: document.getElementById('promoDateTo'),
    promoDateSection: document.getElementById('promoDateSection'),
    recipientsTableContainer: document.getElementById('recipientsTableContainer'),
    recipientsList: document.getElementById('recipientsList'),
    recipientsSearchInput: document.getElementById('recipientsSearchInput'),
  };

  function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `shop-module-toast shop-module-status-${type}`;
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

  async function sendTelegramMessageSecure(chatId, message, photoUrls = [], replyMarkup = null, useShopBot = false) {
    const endpoints = [
        useShopBot ? '/api/secure-send-telegram-shop-message' : '/api/secure-send-telegram-message',
        useShopBot ? '/api/secure-send-telegram-message' : '/api/secure-send-telegram-shop-message'
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
        try {
            const response = await fetch(endpoints[i], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message: message,
                    photo_urls: photoUrls,
                    reply_markup: replyMarkup
                })
            });

            const result = await response.json();
            
            if (result.success === true) {
                return result;
            }
        } catch (error) {
            console.error(`Bot ${i + 1} network error for chat ${chatId}:`, error);
        }
    }
    
    return { success: false, error: 'Both Telegram bots failed' };
  }
  
  const REGION_MAPPING = {
    'Б1': 'Центр и Юг', 'БХД': 'Центр и Юг', 'ГР': 'Центр и Юг', 'ДН': 'Центр и Юг',
    'ДУБ': 'Рыбница', 'ПЕР': 'Центр и Юг', 'СЛ': 'Центр и Юг', 'Т2': 'Центр и Юг',
    'ТЦБ': 'Центр и Юг', 'ТЦТ': 'Центр и Юг', 'КАМ': 'Каменка', 'Р1': 'Рыбница',
    'Р2': 'Рыбница', 'СЦ': 'Сервисный центр', 'ОФИС': 'Офис',
  };

  function getRegionFromShop(shopCode) {
    if (!shopCode) return 'Неизвестный регион';
    const code = shopCode.toUpperCase();
    return REGION_MAPPING[code] || 'Неизвестный регион';
  }

  function getShopsInRegion(region) {
    return Object.keys(REGION_MAPPING).filter(shop => REGION_MAPPING[shop] === region);
  }
  
  function showStatus(message, type = 'success') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `shop-module-status ${type}`;
    elements.statusMessage.style.display = 'block';
    elements.statusMessage.offsetHeight;

    setTimeout(() => {
      elements.statusMessage.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      elements.statusMessage.style.opacity = '0';
      setTimeout(() => {
        elements.statusMessage.style.display = 'none';
      }, 300);
    }, 5000);
  }
  
  function showModal(modal) {
    modal.classList.add('active');
  }

  function hideModal(modal) {
    modal.classList.remove('active');
  }

  function adjustMessageTextareaHeight() {
    const textarea = elements.messageText;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }

  function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    elements.progressBar.style.width = `${percent}%`;
    elements.progressText.textContent = `Отправлено ${current} из ${total} (${percent}%)`;
  }

  function confirmBeforeSending() {
    const targetUsers = getTargetUsers();
    const message = elements.messageText.value.trim();
    
    if (targetUsers.length === 0 || !message) {
      showStatus('Выберите получателей и введите сообщение', 'error');
      return;
    }

    elements.confirmMessage.textContent = 
      `Вы уверены, что хотите отправить сообщение ${targetUsers.length} пользователям?`;
    
    showModal(elements.confirmModal);
  }

  function getShopCode(user) {
    return (user.shop || user.user_team || '').toUpperCase();
  }

  async function fetchShopUsers() {
    try {
      const res = await fetch('/api/shop-users');
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Ошибка API");

      const users = result.users;
      moduleState.shopUsers = users;

      const shopsSet = new Set();
      const groupsSet = new Set();

      users.forEach(user => {
        const shopCode = getShopCode(user);
        if (shopCode) shopsSet.add(shopCode);
        if (Array.isArray(user.groups)) {
          user.groups.forEach(group => groupsSet.add(group.trim()));
        }
      });

      moduleState.availableShops = Array.from(shopsSet).sort();
      moduleState.availableGroups = Array.from(groupsSet).sort();

      renderShops();
      renderGroups();
      updateSummary();
    } catch (error) {
      showStatus(`Ошибка загрузки данных: ${error.message}`, 'error');
    }
  }

  function renderShops() {
    if (moduleState.shopSelectionMode === 'regions') {
      renderRegions();
      return;
    }

    if (moduleState.availableShops.length === 0) {
      elements.shopsContainer.innerHTML = '<div class="shop-module-empty-state">Магазины не найдены</div>';
      return;
    }

    let filteredUsers;
    if (moduleState.selectedGroups.size === 0) {
      filteredUsers = moduleState.shopUsers;
    } else {
      filteredUsers = moduleState.shopUsers.filter(user => {
        const userGroups = Array.isArray(user.groups) ? user.groups : [];
        return Array.from(moduleState.selectedGroups).some(selectedGroup =>
          userGroups.includes(selectedGroup)
        );
      });
    }

    elements.shopsContainer.innerHTML = moduleState.availableShops.map(shop => {
      const shopCode = shop.toUpperCase();
      const userCount = filteredUsers.filter(user => getShopCode(user) === shopCode).length;
      const isSelected = moduleState.selectedShops.has(shopCode);
      const region = getRegionFromShop(shopCode);

      return `
        <div class="shop-module-checkbox-item ${isSelected ? 'selected' : ''}" data-shop="${shopCode}">
          ${isSelected ? `<button class="shop-module-deselect-btn" data-shop="${shopCode}" title="Убрать">✕</button>` : ''}
          <div class="shop-module-checkbox ${isSelected ? 'checked' : ''}"></div>
          <div class="shop-module-checkbox-label">
            ${shop}
            <div style="font-size: 11px; color: var(--sm-text-muted); margin-top: 2px;">${region}</div>
          </div>
          <div class="shop-module-checkbox-count">${userCount}</div>
        </div>
      `;
    }).join('');

    elements.shopsContainer.querySelectorAll('.shop-module-checkbox-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('shop-module-deselect-btn')) return;
        const shop = item.getAttribute('data-shop');
        toggleShopSelection(shop);
        renderGroups();
      });
    });

    elements.shopsContainer.querySelectorAll('.shop-module-deselect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shop = btn.getAttribute('data-shop');
        moduleState.selectedShops.delete(shop);
        moduleState.excludedUserChatIds.clear();
        renderShops();
        renderGroups();
        updateSummary();
      });
    });
  }

  function renderRegions() {
    elements.shopsContainer.innerHTML = moduleState.availableRegions.map(region => {
      const shopsInRegion = getShopsInRegion(region);
      const userCount = moduleState.shopUsers.filter(user =>
        shopsInRegion.includes(getShopCode(user))
      ).length;
      const isSelected = moduleState.selectedRegions.has(region);

      return `
        <div class="shop-module-checkbox-item ${isSelected ? 'selected' : ''}" data-region="${region}">
          ${isSelected ? `<button class="shop-module-deselect-btn" data-region="${region}" title="Убрать">✕</button>` : ''}
          <div class="shop-module-checkbox ${isSelected ? 'checked' : ''}"></div>
          <div class="shop-module-checkbox-label">
            ${region}
            <div style="font-size: 11px; color: var(--sm-text-muted); margin-top: 2px;">
              Магазины: ${shopsInRegion.join(', ')}
            </div>
          </div>
          <div class="shop-module-checkbox-count">${userCount}</div>
        </div>
      `;
    }).join('');

    elements.shopsContainer.querySelectorAll('.shop-module-checkbox-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('shop-module-deselect-btn')) return;
        const region = item.getAttribute('data-region');
        toggleRegionSelection(region);
        renderGroups();
      });
    });

    elements.shopsContainer.querySelectorAll('.shop-module-deselect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const region = btn.getAttribute('data-region');
        moduleState.selectedRegions.delete(region);
        moduleState.excludedUserChatIds.clear();
        renderShops();
        renderGroups();
        updateSummary();
      });
    });
  }
  
  function toggleRegionSelection(region) {
    if (moduleState.selectedRegions.has(region)) {
      moduleState.selectedRegions.delete(region);
    } else {
      moduleState.selectedRegions.add(region);
    }
    moduleState.excludedUserChatIds.clear();
    renderShops();
    updateSummary();
  }
  
  function renderGroups() {
    if (moduleState.availableGroups.length === 0) {
      elements.groupsContainer.innerHTML = '<div class="shop-module-empty-state">Группы товаров не найдены</div>';
      return;
    }

    let filteredUsers;
    if (
      moduleState.selectedShops.size === 0 &&
      moduleState.selectedRegions.size === 0
    ) {
      filteredUsers = moduleState.shopUsers;
    } else {
      filteredUsers = getTargetUsers();
    }

    elements.groupsContainer.innerHTML = moduleState.availableGroups.map(group => {
      const userCount = filteredUsers.filter(user =>
        Array.isArray(user.groups) && user.groups.includes(group)
      ).length;
      const isSelected = moduleState.selectedGroups.has(group);

      return `
        <div class="shop-module-checkbox-item ${isSelected ? 'selected' : ''}" data-group="${group}">
          ${isSelected ? `<button class="shop-module-deselect-btn" data-group="${group}" title="Убрать">✕</button>` : ''}
          <div class="shop-module-checkbox ${isSelected ? 'checked' : ''}"></div>
          <div class="shop-module-checkbox-label">${group}</div>
          <div class="shop-module-checkbox-count">${userCount}</div>
        </div>
      `;
    }).join('');

    elements.groupsContainer.querySelectorAll('.shop-module-checkbox-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('shop-module-deselect-btn')) return;
        const group = item.getAttribute('data-group');
        toggleGroupSelection(group);
        renderShops();
      });
    });

    elements.groupsContainer.querySelectorAll('.shop-module-deselect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = btn.getAttribute('data-group');
        moduleState.selectedGroups.delete(group);
        moduleState.excludedUserChatIds.clear();
        renderGroups();
        renderShops();
        updateSummary();
      });
    });
  }

  function toggleShopSelection(shop) {
    const shopCode = shop.toUpperCase();
    if (moduleState.selectedShops.has(shopCode)) {
      moduleState.selectedShops.delete(shopCode);
    } else {
      moduleState.selectedShops.add(shopCode);
    }
    moduleState.excludedUserChatIds.clear();
    renderShops();
    updateSummary();
  }

  function toggleGroupSelection(group) {
    if (moduleState.selectedGroups.has(group)) {
      moduleState.selectedGroups.delete(group);
    } else {
      moduleState.selectedGroups.add(group);
    }
    moduleState.excludedUserChatIds.clear();
    renderGroups();
    updateSummary();
  }

  function getTargetUsers() {
    if (
      moduleState.selectedShops.size === 0 &&
      moduleState.selectedGroups.size === 0 &&
      moduleState.selectedRegions.size === 0
    ) {
      return [];
    }

    return moduleState.shopUsers.filter(user => {
      const userShopCode = getShopCode(user);
      const userChatId = String(user.chat_id || '');

      if (moduleState.excludedUserChatIds && moduleState.excludedUserChatIds.has(userChatId)) {
        return false;
      }

      let matchesShopOrRegion = false;

      if (moduleState.selectedShops.size > 0) {
        matchesShopOrRegion = moduleState.selectedShops.has(userShopCode);
      } else if (moduleState.selectedRegions.size > 0) {
        const userRegion = getRegionFromShop(userShopCode);
        matchesShopOrRegion = moduleState.selectedRegions.has(userRegion);
      } else {
        matchesShopOrRegion = true;
      }

      let matchesGroup = moduleState.selectedGroups.size === 0;
      if (!matchesGroup && user.groups) {
        const userGroups = Array.isArray(user.groups) ? user.groups : [];
        matchesGroup = Array.from(moduleState.selectedGroups).some(selectedGroup =>
          userGroups.includes(selectedGroup)
        );
      }

      return matchesShopOrRegion && matchesGroup;
    });
  }

  function updateSummary() {
    const targetUsers = getTargetUsers();
    
    const hasSelection = moduleState.selectedShops.size > 0 || moduleState.selectedGroups.size > 0 || moduleState.selectedRegions.size > 0;
    const hasMessage = elements.messageText.value.trim().length > 0;
    elements.sendMessageBtn.disabled = !hasSelection || !hasMessage || targetUsers.length === 0;

    renderRecipientsList();
  }

  function getFilteredUsers() {
    if (
      moduleState.selectedShops.size === 0 &&
      moduleState.selectedGroups.size === 0 &&
      moduleState.selectedRegions.size === 0
    ) {
      return [];
    }

    return moduleState.shopUsers.filter(user => {
      const userShopCode = getShopCode(user);

      let matchesShopOrRegion = false;

      if (moduleState.selectedShops.size > 0) {
        matchesShopOrRegion = moduleState.selectedShops.has(userShopCode);
      } else if (moduleState.selectedRegions.size > 0) {
        const userRegion = getRegionFromShop(userShopCode);
        matchesShopOrRegion = moduleState.selectedRegions.has(userRegion);
      } else {
        matchesShopOrRegion = true;
      }

      let matchesGroup = moduleState.selectedGroups.size === 0;
      if (!matchesGroup && user.groups) {
        const userGroups = Array.isArray(user.groups) ? user.groups : [];
        matchesGroup = Array.from(moduleState.selectedGroups).some(selectedGroup =>
          userGroups.includes(selectedGroup)
        );
      }

      return matchesShopOrRegion && matchesGroup;
    });
  }

  function renderRecipientsList() {
    const allFilteredUsers = getFilteredUsers();
    const query = moduleState.recipientsSearchQuery.toLowerCase();

    const filtered = query ? allFilteredUsers.filter(user => {
      const name = (user.user_name || '').toLowerCase();
      const shop = (user.shop || user.user_team || '').toLowerCase();
      const chatId = String(user.chat_id || '');
      return name.includes(query) || shop.includes(query) || chatId.includes(query);
    }) : allFilteredUsers;

    if (filtered.length === 0) {
      elements.recipientsList.innerHTML = `<div class="shop-module-empty-state" style="padding:20px;">Нет получателей</div>`;
      return;
    }

    const selectedCount = filtered.filter(user => !moduleState.excludedUserChatIds.has(String(user.chat_id || ''))).length;
    const allSelected = selectedCount === filtered.length && filtered.length > 0;
    const someSelected = selectedCount > 0 && selectedCount < filtered.length;

    const recipientsHTML = `
      <div class="shop-module-recipients-controls">
        <button class="shop-module-recipients-btn ${allSelected ? 'active' : ''}" data-action="select-all" title="Выбрать всех">
          ✓ Выбрать все
        </button>
        <button class="shop-module-recipients-btn" data-action="deselect-all" title="Отменить выбор всех">
          ✕ Отменить выбор
        </button>
        <span class="shop-module-recipients-counter">${selectedCount} / ${filtered.length}</span>
      </div>
      <div class="shop-module-recipients-items">
        ${filtered.map(user => {
          const chatId = String(user.chat_id || '');
          const isExcluded = moduleState.excludedUserChatIds.has(chatId);
          const groupTags = Array.isArray(user.groups) && user.groups.length > 0
            ? user.groups.map(g => `<span class="shop-module-group-tag">${g.trim()}</span>`).join('')
            : '';

          return `
            <div class="shop-module-recipient-item ${isExcluded ? 'excluded' : 'selected'}">
              <label class="shop-module-recipient-check">
                <input type="checkbox" class="recipient-checkbox" data-user-id="${chatId}" ${isExcluded ? '' : 'checked'}>
                <span class="shop-module-recipient-info">
                  <span class="shop-module-recipient-name">${user.user_name || 'Без имени'}</span>
                  <span class="shop-module-recipient-meta">${user.shop || user.user_team || ''} · ${chatId}</span>
                  ${groupTags ? `<span class="shop-module-recipient-groups">${groupTags}</span>` : ''}
                </span>
              </label>
            </div>
          `;
        }).join('')}
      </div>
    `;

    elements.recipientsList.innerHTML = recipientsHTML;

    const selectAllBtn = elements.recipientsList.querySelector('[data-action="select-all"]');
    const deselectAllBtn = elements.recipientsList.querySelector('[data-action="deselect-all"]');
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        filtered.forEach(user => {
          const chatId = String(user.chat_id || '');
          moduleState.excludedUserChatIds.delete(chatId);
        });
        renderRecipientsList();
        updateSummary();
      });
    }

    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        filtered.forEach(user => {
          const chatId = String(user.chat_id || '');
          moduleState.excludedUserChatIds.add(chatId);
        });
        renderRecipientsList();
        updateSummary();
      });
    }
  }

  function extractUrlsFromText(text) {
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi;
    return text.match(urlRegex) || [];
  }

  function renderComposerAttachments() {
    const fileAttachments = moduleState.photoAttachments.filter(a => a.type === 'file');
    const textUrls = extractUrlsFromText(elements.messageText.value);

    elements.composerAttachments.innerHTML = '';

    textUrls.forEach((url, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'shop-module-composer-image-preview';
      wrapper.innerHTML = `
        <img src="${url}" alt="preview" onerror="this.parentElement.style.display='none'">
        <div class="shop-module-composer-image-label">Из текста</div>
      `;
      elements.composerAttachments.appendChild(wrapper);
    });

    fileAttachments.forEach((photo, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'shop-module-composer-image-preview';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'shop-module-composer-remove-img';
      removeBtn.innerHTML = '✕';
      removeBtn.addEventListener('click', () => {
        moduleState.photoAttachments.splice(index, 1);
        renderComposerAttachments();
      });
      const img = document.createElement('img');
      img.src = photo.value;
      wrapper.appendChild(img);
      wrapper.appendChild(removeBtn);
      elements.composerAttachments.appendChild(wrapper);
    });

    elements.composerAttachments.style.display = (textUrls.length > 0 || fileAttachments.length > 0) ? 'flex' : 'none';
  }

  async function sendMessage(chatId, message, uploadedPhotoUrls, options = {}) {
    const { inlineKeyboard = null, useShopBot = false } = options;
    let sendSuccess = false;
    let telegramMessageId = null;

    const sendTextMessageWithId = async (chatId, message, inlineKeyboard = null, useShopBot = false) => {
        if (!message) return { success: false, messageId: null };
        const result = await sendTelegramMessageSecure(chatId, message, [], inlineKeyboard, useShopBot);
        return { success: result.success, messageId: result.message_id || null };
    };

    if (uploadedPhotoUrls.length > 1) {
        await sendTelegramMessageSecure(chatId, message, uploadedPhotoUrls, null, useShopBot);
        const textResult = await sendTextMessageWithId(chatId, message, inlineKeyboard, useShopBot);
        sendSuccess = textResult.success;
        telegramMessageId = textResult.messageId;
    } else if (uploadedPhotoUrls.length === 1) {
        if (message.length > 1024) {
            await sendTelegramMessageSecure(chatId, '', uploadedPhotoUrls, null, useShopBot);
            const textResult = await sendTextMessageWithId(chatId, message, inlineKeyboard, useShopBot);
            sendSuccess = textResult.success;
            telegramMessageId = textResult.messageId;
        } else {
            const result = await sendTelegramMessageSecure(chatId, message, uploadedPhotoUrls, inlineKeyboard, useShopBot);
            sendSuccess = result.success;
            telegramMessageId = result.message_id || null;
        }
    } else {
        const result = await sendTextMessageWithId(chatId, message, inlineKeyboard, useShopBot);
        sendSuccess = result.success;
        telegramMessageId = result.messageId;
    }

    return { success: sendSuccess, messageId: telegramMessageId };
  }

  async function dataURLToBlob(dataURL) {
    if (dataURL.startsWith('data:')) {
      const parts = dataURL.split(',');
      const contentType = parts[0].match(/:(.*?);/)[1];
      const base64 = parts[1];
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      return new Blob([arrayBuffer], { type: contentType });
    }
    const response = await fetch(dataURL);
    return response.blob();
  }

  async function uploadAttachmentsOnce(attachments) {
    const uploadedUrls = [];
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      try {
        if (attachment.type === 'url') {
          uploadedUrls.push(attachment.value);
        } else if (attachment.type === 'file') {
          const blob = attachment.blob || await dataURLToBlob(attachment.value);
          const fileName = `telegram_image_${Date.now()}_${i}.jpg`;
          const result = await saveImageToDrive(blob, fileName);
          if (result.success && result.url) {
            uploadedUrls.push(result.url);
          }
        }
      } catch (err) {
        console.warn(`Attachment upload failed:`, err);
      }
    }
    return uploadedUrls;
  }

  async function sendMessages() {
    const targetUsers = getTargetUsers();
    let message = elements.messageText.value.trim();

    if (moduleState.messageType === 'Promo') {
      if (moduleState.promoDates.from && moduleState.promoDates.to) {
        message += `\n\n📅 Акция действует с ${moduleState.promoDates.from} по ${moduleState.promoDates.to}`;
      } else {
        showStatus('Укажите даты акции перед отправкой', 'error');
        return;
      }
    }

    const textUrls = extractUrlsFromText(elements.messageText.value);
    const urlAttachments = textUrls.map(url => ({ type: 'url', value: url }));
    const allAttachments = [...urlAttachments, ...moduleState.photoAttachments.filter(a => a.type === 'file')];

    hideModal(elements.confirmModal);
    showModal(elements.progressModal);

    moduleState.isSending = true;
    moduleState.cancelSending = false;
    elements.sendMessageBtn.disabled = true;

    let successCount = 0;
    let errorCount = 0;
    const successfulChatIds = [];
    const messageIdMap = {};

    const OFFICIAL_GROUP_ID = '1592273204';
    const uploadedPhotoUrls = await uploadAttachmentsOnce(allAttachments);
    const senderInfo = await getCurrentUserInfo();

    let supabaseId = null;
    if (targetUsers.length > 0) {
      try {
        const saveResult = await saveMessageToDatabase(
          targetUsers.map(u => u.chat_id),
          message,
          uploadedPhotoUrls,
          senderInfo
        );
        if (saveResult.success) {
          supabaseId = saveResult.id;
        }
      } catch (error) {
        console.warn('Failed to save message to DB before sending:', error);
      }
    }

    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: 'Ознакомились, все понятно', callback_data: `ok_msg_${supabaseId}` }],
        [{ text: 'Ознакомились, есть вопросы', callback_data: `notok_msg_${supabaseId}` }]
      ]
    };

    for (let i = 0; i < targetUsers.length; i++) {
      if (moduleState.cancelSending) break;

      const user = targetUsers[i];
      updateProgress(i, targetUsers.length + 1);

      if (user.chat_id) {
        const result = await sendMessage(user.chat_id, message, uploadedPhotoUrls, { inlineKeyboard });
        if (result.success) {
          successCount++;
          successfulChatIds.push(user.chat_id);
          messageIdMap[user.chat_id] = result.messageId;
          moduleState.sentMessages.push({
            chatId: user.chat_id,
            message: message,
            timestamp: new Date().toISOString()
          });
        } else {
          errorCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        errorCount++;
      }
    }
    
    if (supabaseId && Object.keys(messageIdMap).length > 0) {
      try {
        const response = await fetch(`/api/shops-sent-messages/${supabaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: messageIdMap })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Failed to store message IDs:', errorText);
        }
      } catch (error) {
        console.warn('Failed to store message IDs:', error);
      }
    }
    
    if (
      !moduleState.cancelSending &&
      successCount > 0 &&
      (moduleState.messageType === 'Promo' || moduleState.messageType === 'Install')
    ) {
      try {
        await sendMessage(OFFICIAL_GROUP_ID, message, uploadedPhotoUrls);
      } catch (err) {
        console.warn('Could not send message to official group:', err);
      }
    }

    updateProgress(targetUsers.length + 1, targetUsers.length + 1);

    moduleState.isSending = false;
    elements.sendMessageBtn.disabled = false;
    hideModal(elements.progressModal);

    if (successCount > 0) {
      showStatus(`Сообщение успешно отправлено ${successCount} пользователям`, 'success');
      elements.messageText.value = '';
      moduleState.photoAttachments = [];
      renderComposerAttachments();
      updateSummary();
    } else if (!moduleState.cancelSending) {
      showStatus('Не удалось отправить ни одного сообщения', 'error');
    }

    if (moduleState.cancelSending) {
      showStatus(`Отправка отменена. Успешно отправлено ${successCount} сообщений`, 'error');
    }
  }

  async function getCurrentUserInfo() {
    try {
      if (window.state && window.state.userData) {
        const userData = window.state.userData;
        return { chatId: userData.chat_id, name: userData.user_name || 'Unknown User' };
      }
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        return { chatId: userData.chat_id, name: userData.user_name || 'Unknown User' };
      }
    } catch (error) {
      console.warn('Failed to get user info from state:', error);
    }
    return { chatId: 'unknown', name: 'Unknown User' };
  }

  function filterHistoryData() {
    let filtered = [...moduleState.allHistoryData];
    const { dateFrom, dateTo, type, messageContent } = moduleState.historyFilters;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(entry => new Date(entry.timestamp) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => new Date(entry.timestamp) <= toDate);
    }
    if (type) {
      filtered = filtered.filter(entry => (entry.type || '').toLowerCase().includes(type.toLowerCase()));
    }
    if (messageContent) {
      filtered = filtered.filter(entry => 
        (entry.body || '').toLowerCase().includes(messageContent.toLowerCase()) ||
        (entry.title || '').toLowerCase().includes(messageContent.toLowerCase())
      );
    }
    return filtered;
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function init() {
    const tabBtns = document.querySelectorAll('.shop-module-tab-btn:not([data-mode])');
    const tabContents = document.querySelectorAll('.shop-module-tab-content');
    
    tabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (!tabId) return;
        tabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(c => c.classList.remove('active'));
        
        let contentId = 'messageTab';
        if (tabId === 'history') contentId = 'historyTab';
        
        document.getElementById(contentId).classList.add('active');
        
        if (tabId === 'history') {
          loadAndRenderMessageHistory();
        }
      });
    });

    elements.messageText.addEventListener('input', () => {
      updateSummary();
      adjustMessageTextareaHeight();
      renderComposerAttachments();
    });

    elements.messageText.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            moduleState.photoAttachments.push({
              type: 'file',
              blob: file,
              value: URL.createObjectURL(file)
            });
            renderComposerAttachments();
          }
          return;
        }
      }
    });

    adjustMessageTextareaHeight();
    elements.sendMessageBtn.addEventListener('click', confirmBeforeSending);
    elements.cancelSendingBtn.addEventListener('click', () => {
      moduleState.cancelSending = true;
      hideModal(elements.progressModal);
    });

    elements.confirmSendBtn.addEventListener('click', sendMessages);
    elements.confirmCancelBtn.addEventListener('click', () => {
      hideModal(elements.confirmModal);
    });

    elements.modalCloseButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        hideModal(btn.closest('.shop-module-modal'));
        if (moduleState.isSending) {
          moduleState.cancelSending = true;
        }
      });
    });

    elements.messageTypeSelect.addEventListener('change', (e) => {
      moduleState.messageType = e.target.value;

      if (moduleState.messageType === 'Promo') {
        elements.promoDateSection.style.display = 'flex';
        const defaultGroups = ["Директора и замы", "Контент", "Маркетинг"];
        defaultGroups.forEach(g => {
          if (moduleState.availableGroups.includes(g)) {
            moduleState.selectedGroups.add(g);
          }
        });
        renderGroups();
        updateSummary();
      } else {
        elements.promoDateSection.style.display = 'none';
        moduleState.promoDates = { from: '', to: '' };
        elements.promoDateFrom.value = '';
        elements.promoDateTo.value = '';
      }
    });

    elements.promoDateFrom.addEventListener('change', (e) => {
      moduleState.promoDates.from = e.target.value;
    });
    elements.promoDateTo.addEventListener('change', (e) => {
      moduleState.promoDates.to = e.target.value;
    });

    elements.photoFileInput.addEventListener('change', handleFileSelect);

    elements.recipientsSearchInput && elements.recipientsSearchInput.addEventListener('input', (e) => {
      moduleState.recipientsSearchQuery = e.target.value;
      renderRecipientsList();
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('shop-module-tab-btn') && e.target.hasAttribute('data-mode')) {
        const mode = e.target.getAttribute('data-mode');

        document.querySelectorAll('.shop-module-tab-btn[data-mode]').forEach(btn => {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');

        const previousMode = moduleState.shopSelectionMode;
        const isSameMode = previousMode === mode;
        const allShopCodes = moduleState.availableShops.map(shop => shop.toUpperCase());

        const clearSel = () => {
          moduleState.selectedRegions.clear();
          moduleState.selectedShops.clear();
        };

        const selectAllShops = () => {
          moduleState.selectedRegions.clear();
          moduleState.selectedShops.clear();
          allShopCodes.forEach(code => moduleState.selectedShops.add(code));
        };

        const selectShopsOnly = () => {
          moduleState.selectedRegions.clear();
          moduleState.selectedShops.clear();
          allShopCodes.forEach(shopCode => {
            if (shopCode !== 'СЦ' && shopCode !== 'ОФИС') {
              moduleState.selectedShops.add(shopCode);
            }
          });
        };

        moduleState.shopSelectionMode = mode;
        moduleState.excludedUserChatIds.clear();
        let skipReselect = false;

        if (isSameMode) {
          const hasSelection = moduleState.selectedRegions.size > 0 || moduleState.selectedShops.size > 0;
          if (hasSelection) {
            clearSel();
            skipReselect = true;
          }
        }

        if (!skipReselect) {
          if (mode === 'regions') {
            moduleState.selectedShops.clear();
          } else if (mode === 'all') {
            selectAllShops();
          } else if (mode === 'shops-only') {
            selectShopsOnly();
          } else {
            moduleState.selectedRegions.clear();
            if (previousMode === 'regions') {
              moduleState.selectedShops.clear();
            }
          }
        }

        renderShops();
        updateSummary();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('recipient-checkbox')) {
        const chatId = e.target.getAttribute('data-user-id');
        if (!e.target.checked) {
          moduleState.excludedUserChatIds.add(chatId);
        } else {
          moduleState.excludedUserChatIds.delete(chatId);
        }
        updateSummary();
      }
    });

    fetchShopUsers();
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        showStatus('Пожалуйста, выберите файл изображения', 'error');
        return;
      }
      moduleState.photoAttachments.push({
        type: 'file',
        blob: file,
        value: URL.createObjectURL(file)
      });
    });
    renderComposerAttachments();
    e.target.value = '';
  }

  async function saveImageToDrive(imageData, fileName) {
    try {
      const formData = new FormData();
      if (imageData instanceof Blob) {
        formData.append('file', imageData, fileName);
      } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const blob = await fetch(imageData).then(res => res.blob());
        formData.append('file', blob, fileName);
      } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
        formData.append('url', imageData);
      } else {
        throw new Error('Unsupported imageData format');
      }

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error('Upload failed');
      return { success: true, url: result.viewLink };
    } catch (err) {
      console.error('saveImageToDrive failed:', err);
      return { success: false, error: err.message };
    }
  }

  async function saveMessageToDatabase(chatIds, message, photoUrls = [], senderInfo = {}) {
    try {
      const title = message.slice(0, 64);
      const recipients = Array.isArray(chatIds) ? chatIds : [chatIds];

      const payload = {
        title,
        body: message,
        recipients,
        replies: [],
        photo_urls: photoUrls,
        timestamp: new Date().toISOString(),
        type: moduleState.messageType || 'News',
        sent_by_chat_id: senderInfo.chatId || null,
        sent_by_name: senderInfo.name || null,
        message_id: senderInfo.messageId || null
      };

      if (moduleState.messageType === 'Promo' && moduleState.promoDates.from && moduleState.promoDates.to) {
        payload.dates = { from: moduleState.promoDates.from, to: moduleState.promoDates.to };
      }

      const response = await fetch('/api/shops-sent-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to insert message: ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.message && result.message.id) {
        return { success: true, id: result.message.id, message: result.message };
      } else {
        throw new Error('Insert succeeded but no ID returned');
      }
    } catch (error) {
      console.error('[saveMessageToDatabase] Error:', error);
      return { success: false, error: error.message };
    }
  }

  async function renderMessageHistory(historyData) {
    const container = document.getElementById('historyTab');
    if (!container) return;

    if (!Array.isArray(historyData) || historyData.length === 0) {
      container.innerHTML = `
        <div class="shop-module-card">
          <div class="shop-module-filters">
            <div class="shop-module-filter-group">
              <label>Дата от</label>
              <input type="date" id="dateFromFilter" class="shop-module-filter-input" />
            </div>
            <div class="shop-module-filter-group">
              <label>Дата до</label>
              <input type="date" id="dateToFilter" class="shop-module-filter-input" />
            </div>
            <div class="shop-module-filter-group">
              <label>Тип</label>
              <select id="typeFilter" class="shop-module-select">
                <option value="">Все типы</option>
                <option value="News">Новость</option>
                <option value="Promo">Акция</option>
                <option value="Install">Установка</option>
              </select>
            </div>
            <div class="shop-module-filter-group">
              <label>Содержание</label>
              <input type="text" id="messageContentFilter" class="shop-module-filter-input" placeholder="Поиск по тексту..." />
            </div>
            <button id="clearFiltersBtn" class="shop-module-btn shop-module-btn-secondary">Очистить</button>
          </div>
          <div class="shop-module-empty-state">История сообщений отсутствует</div>
        </div>
      `;
      bindHistoryFilters();
      return;
    }

    const tableHtml = `
      <div class="shop-module-card">
        <div class="shop-module-filters">
          <div class="shop-module-filter-group">
            <label>Дата от</label>
            <input type="date" id="dateFromFilter" class="shop-module-filter-input" value="${moduleState.historyFilters.dateFrom}" />
          </div>
          <div class="shop-module-filter-group">
            <label>Дата до</label>
            <input type="date" id="dateToFilter" class="shop-module-filter-input" value="${moduleState.historyFilters.dateTo}" />
          </div>
          <div class="shop-module-filter-group">
            <label>Тип</label>
            <select id="typeFilter" class="shop-module-select">
              <option value="">Все типы</option>
              <option value="News" ${moduleState.historyFilters.type === 'News' ? 'selected' : ''}>Новость</option>
              <option value="Promo" ${moduleState.historyFilters.type === 'Promo' ? 'selected' : ''}>Акция</option>
              <option value="Install" ${moduleState.historyFilters.type === 'Install' ? 'selected' : ''}>Установка</option>
            </select>
          </div>
          <div class="shop-module-filter-group">
            <label>Содержание</label>
            <input type="text" id="messageContentFilter" class="shop-module-filter-input" placeholder="Поиск по тексту..." value="${moduleState.historyFilters.messageContent}" />
          </div>
          <button id="clearFiltersBtn" class="shop-module-btn shop-module-btn-secondary">Очистить</button>
        </div>

        <div class="shop-module-table-wrapper">
          <table class="shop-module-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Сообщение</th>
                <th>Отправитель</th>
                <th>Ответы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${historyData.map(entry => {
                const date = new Date(entry.timestamp).toLocaleString('ru-RU');
                const type = entry.type || '—';
                const preview = (entry.body || '').slice(0, 64).replace(/\n/g, ' ');
                const recipientsCount = Array.isArray(entry.recipients) ? entry.recipients.length : 0;

                let okCount = 0, notOkCount = 0;
                if (Array.isArray(entry.replies)) {
                  entry.replies.forEach(r => {
                    if (r.status === 'ok') okCount++;
                    if (r.status === 'notok') notOkCount++;
                  });
                }
                const noReplyCount = recipientsCount - okCount - notOkCount;

                return `
                  <tr>
                    <td>${date}</td>
                    <td>${type}</td>
                    <td>${preview}</td>
                    <td>${entry.sent_by_name || '—'}</td>
                    <td>
                      <span class="shop-module-clickable-stats" data-id="${entry.id}">${recipientsCount}</span> /
                      <span class="shop-module-clickable-stats" data-id="${entry.id}" style="color:var(--sm-green);">${okCount}</span> /
                      <span class="shop-module-clickable-stats" data-id="${entry.id}" style="color:var(--sm-red);">${notOkCount}</span> /
                      <span class="shop-module-clickable-stats" data-id="${entry.id}">${noReplyCount}</span>
                    </td>
                    <td>
                      <button class="shop-module-btn shop-module-btn-secondary btn-view" data-id="${entry.id}" style="margin-right:4px;">👁️</button>
                      <button class="shop-module-btn shop-module-btn-secondary btn-resend-no-reply" data-id="${entry.id}" style="margin-right:4px;">🔄</button>
                      <button class="shop-module-btn shop-module-btn-danger btn-delete" data-id="${entry.id}">🗑️</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div id="viewMessageModal" class="shop-module-modal">
        <div class="shop-module-modal-content large">
          <div class="shop-module-modal-header">
            <span>Просмотр сообщения</span>
            <button class="shop-module-modal-close">&times;</button>
          </div>
          <div class="shop-module-modal-body" id="viewMessageContent"></div>
          <div class="shop-module-modal-actions">
            <button id="closeViewMessageBtn" class="shop-module-btn shop-module-btn-primary">Закрыть</button>
          </div>
        </div>
      </div>

      <div id="repliesModal" class="shop-module-modal">
        <div class="shop-module-modal-content large">
          <div class="shop-module-modal-header">
            <span>Ответы пользователей</span>
            <button class="shop-module-modal-close">&times;</button>
          </div>
          <div class="shop-module-modal-body">
            <div class="shop-module-replies-modal-content">
              <div class="shop-module-replies-column">
                <h4 style="color:var(--sm-green);">ОК</h4>
                <ul id="okList"></ul>
              </div>
              <div class="shop-module-replies-column">
                <h4 style="color:var(--sm-red);">Не ОК</h4>
                <ul id="notOkList"></ul>
              </div>
              <div class="shop-module-replies-column">
                <h4>Без ответа</h4>
                <ul id="noAnswerList"></ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = tableHtml;
    bindHistoryFilters();

    const repliesModal = container.querySelector('#repliesModal');
    repliesModal.querySelector('.shop-module-modal-close').addEventListener('click', () => hideModal(repliesModal));

    container.querySelectorAll('.shop-module-clickable-stats').forEach(span => {
      span.addEventListener('click', () => {
        const id = span.getAttribute('data-id');
        const entry = historyData.find(e => String(e.id) === String(id));
        if (entry) showRepliesModal(entry, repliesModal);
      });
    });

    container.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = historyData.find(e => String(e.id) === String(btn.dataset.id));
        if (!entry) return;

        const modal = container.querySelector('#viewMessageModal');
        const contentEl = modal.querySelector('#viewMessageContent');

        const date = new Date(entry.timestamp).toLocaleString('ru-RU');
        const type = entry.type || '—';
        const message = (entry.body || '').replace(/\n/g, '<br>');

        let photos = Array.isArray(entry.photo_urls) ? entry.photo_urls : [];
        let currentPhotoIndex = 0;

        const renderPhotos = () => {
          if (!photos.length) return '';
          return `
            <div style="margin-top: 15px;">
              <h4>Фото:</h4>
              <div style="display:flex; flex-wrap: wrap; gap:10px;">
                ${photos.map((url, idx) => `
                  <a href="${url}" target="_blank" ${idx === currentPhotoIndex ? 'style="outline: 3px solid var(--sm-accent);"' : ''}>
                    <img src="${url}" style="max-height:150px; border-radius:6px; cursor:pointer;" />
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        };

        const updateModalContent = () => {
          contentEl.innerHTML = `
            <div style="margin-bottom: 10px; color:var(--sm-text-muted);">
              <strong>Тип:</strong> ${type} | <strong>Дата:</strong> ${date} | <strong>Отправитель:</strong> ${entry.sent_by_name || '—'}
            </div>
            <div style="white-space: normal; font-size:15px; line-height:1.4;">
              ${message}
            </div>
            ${renderPhotos()}
          `;
        };

        updateModalContent();
        showModal(modal);

        const closeModal = () => {
          hideModal(modal);
          document.removeEventListener('keydown', keyHandler);
        };

        const keyHandler = (e) => {
          if (e.key === 'Escape') {
            closeModal();
          } else if (photos.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            if (e.key === 'ArrowRight') {
              currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
            } else {
              currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
            }
            updateModalContent();
          }
        };

        document.addEventListener('keydown', keyHandler);
        modal.querySelector('#closeViewMessageBtn').onclick = closeModal;
        modal.querySelector('.shop-module-modal-close').onclick = closeModal;
      });
    });

    container.querySelectorAll('.btn-resend-no-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = historyData.find(e => String(e.id) === String(btn.dataset.id));
        if (!entry) return;

        const repliesMap = {};
        (entry.replies || []).forEach(r => repliesMap[String(r.chat_id)] = r.status);
        const nonResponders = (entry.recipients || []).filter(cid =>
          repliesMap[String(cid)] !== 'ok' && repliesMap[String(cid)] !== 'notok'
        );

        if (!nonResponders.length) {
          showStatus('Все пользователи ответили на сообщение', 'error');
          return;
        }

        moduleState.resendTargetUsers = nonResponders;
        moduleState.resendMessage = entry.body || '';
        moduleState.resendPhotos = (entry.photo_urls || []).map(url => ({ type: 'url', value: url }));
        moduleState.resendEntryId = entry.id;

        elements.confirmMessage.textContent =
          `Вы уверены, что хотите отправить сообщение ${nonResponders.length} пользователям?`;
        showModal(elements.confirmModal);

        const oldHandler = elements.confirmSendBtn.onclick;
        elements.confirmSendBtn.onclick = async () => {
          hideModal(elements.confirmModal);
          await sendCustomListMessages(
            moduleState.resendTargetUsers,
            moduleState.resendMessage,
            moduleState.resendPhotos,
            moduleState.resendEntryId
          );
          elements.confirmSendBtn.onclick = oldHandler;
        };
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const entry = historyData.find(e => String(e.id) === String(id));
        if (!entry) return;

        if (!confirm('Вы уверены, что хотите удалить это сообщение из истории?')) return;

        try {
          const resp = await fetch(`/api/shops-sent-messages/${id}`, { method: 'DELETE' });
          if (!resp.ok) throw new Error(await resp.text());

          moduleState.allHistoryData = moduleState.allHistoryData.filter(e => String(e.id) !== String(id));
          renderMessageHistory(filterHistoryData());
          showStatus('Сообщение успешно удалено', 'success');
        } catch (err) {
          console.error('Ошибка удаления:', err);
          showStatus('Ошибка при удалении сообщения', 'error');
        }
      });
    });
  }

  async function sendCustomListMessages(chatIds, message, photos, entryId) {
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: 'Ознакомились, все понятно', callback_data: `ok_msg_${entryId}` }],
        [{ text: 'Ознакомились, есть вопросы', callback_data: `notok_msg_${entryId}` }]
      ]
    };

    moduleState.photoAttachments = photos || [];
    moduleState.isSending = true;
    moduleState.cancelSending = false;

    elements.progressText.textContent = 'Подготовка к отправке...';
    elements.progressBar.style.width = '0%';
    showModal(elements.progressModal);
    elements.cancelSendingBtn.onclick = () => {
      moduleState.cancelSending = true;
      hideModal(elements.progressModal);
    };

    let successCount = 0;
    for (let i = 0; i < chatIds.length; i++) {
      if (moduleState.cancelSending) break;
      updateProgress(i, chatIds.length);
      if (await sendMessage(chatIds[i], message, [], { inlineKeyboard })) successCount++;
      await new Promise(r => setTimeout(r, 100));
    }

    updateProgress(chatIds.length, chatIds.length);
    moduleState.isSending = false;
    hideModal(elements.progressModal);

    if (successCount > 0) {
      showStatus(`Сообщение повторно отправлено ${successCount} пользователям`, 'success');
    } else if (!moduleState.cancelSending) {
      showStatus('Не удалось отправить повторное сообщение', 'error');
    }
    if (moduleState.cancelSending) {
      showStatus(`Отправка отменена. Успешно отправлено ${successCount} сообщений`, 'error');
    }
  }

  function bindHistoryFilters() {
    function debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    const debouncedRenderHistory = debounce(() => {
      renderMessageHistory(filterHistoryData());
    }, 300);

    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const typeFilter = document.getElementById('typeFilter');
    const messageContentFilter = document.getElementById('messageContentFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    if (dateFromFilter) {
      dateFromFilter.addEventListener('change', (e) => {
        moduleState.historyFilters.dateFrom = e.target.value;
        debouncedRenderHistory();
      });
    }
    if (dateToFilter) {
      dateToFilter.addEventListener('change', (e) => {
        moduleState.historyFilters.dateTo = e.target.value;
        debouncedRenderHistory();
      });
    }
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        moduleState.historyFilters.type = e.target.value;
        debouncedRenderHistory();
      });
    }
    if (messageContentFilter) {
      messageContentFilter.addEventListener('input', (e) => {
        moduleState.historyFilters.messageContent = e.target.value;
        debouncedRenderHistory();
      });
    }
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        moduleState.historyFilters = { dateFrom: '', dateTo: '', type: '', messageContent: '' };
        renderMessageHistory(moduleState.allHistoryData);
      });
    }
  }

  function showRepliesModal(entry, modalEl) {
    const okList = modalEl.querySelector('#okList');
    const notOkList = modalEl.querySelector('#notOkList');
    const noAnswerList = modalEl.querySelector('#noAnswerList');

    okList.innerHTML = '';
    notOkList.innerHTML = '';
    noAnswerList.innerHTML = '';

    const repliesMap = {};
    (entry.replies || []).forEach(r => {
      repliesMap[String(r.chat_id)] = r.status;
    });

    let okCount = 0, notOkCount = 0, noReplyCount = 0;

    (entry.recipients || []).forEach(chatId => {
      const user = moduleState.shopUsers.find(u => String(u.chat_id) === String(chatId));
      const name = user ? (user.user_name || user.shop || chatId) : chatId;

      if (repliesMap[String(chatId)] === 'ok') {
        okList.innerHTML += `<li>${name}</li>`;
        okCount++;
      } else if (repliesMap[String(chatId)] === 'notok') {
        notOkList.innerHTML += `<li>${name}</li>`;
        notOkCount++;
      } else {
        noAnswerList.innerHTML += `<li>${name}</li>`;
        noReplyCount++;
      }
    });

    modalEl.querySelector('h4[style*="var(--sm-green)"]').textContent = `ОК (${okCount})`;
    modalEl.querySelector('h4[style*="var(--sm-red)"]').textContent = `Не ОК (${notOkCount})`;
    modalEl.querySelector('h4:not([style])').textContent = `Без ответа (${noReplyCount})`;

    showModal(modalEl);
  }

  async function loadAndRenderMessageHistory() {
    const container = document.getElementById('historyTab');
    if (!container) return;
    
    try {
      showToast('Загрузка истории...', 'loading');
      const res = await fetch('/api/message-history');
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Ошибка API');

      moduleState.allHistoryData = result.data;
      renderMessageHistory(filterHistoryData());
      showToast('История загружена', 'success');
    } catch (err) {
      console.error('Ошибка загрузки истории сообщений:', err);
      container.innerHTML = '<div class="shop-module-empty-state" style="color:#f87171;">Не удалось загрузить историю сообщений</div>';
      showToast('Ошибка загрузки истории', 'error');
    }
  }

  init();
}