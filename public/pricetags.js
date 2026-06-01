export async function loadModule(container, { chatId, userData }) {

  container.innerHTML = `
    <div class="pricetags-module">
      <div class="pricetags-top-buttons">
        <button id="tasksTAB" class="pricetags-btn pricetags-btn-primary">Новые задачи</button>
        <button id="historyTAB" class="pricetags-btn pricetags-btn-secondary">История</button>
        <button id="analyticsTAB" class="pricetags-btn pricetags-btn-secondary">Аналитика</button>
      </div>

      <div id="tasks-tab-content" class="pricetags-tab-content">
        <div class="pricetags-section">
          <h3>Новые задачи по ценникам</h3>
          <div id="tasksList"><div class="pricetags-loading-message">Загрузка задач...</div></div>
        </div>
      </div>

      <div id="history-tab-content" class="pricetags-tab-content" style="display:none;">
        <div class="pricetags-section">
          <h3>История изменений ценников</h3>
          <div id="historyList"><div class="pricetags-loading-message">Загрузка истории...</div></div>
        </div>
      </div>

      <div id="analytics-tab-content" class="pricetags-tab-content" style="display:none;">
        <div class="pricetags-section">
          <h3>Аналитика по ценникам</h3>
          <div id="analyticsList"><div class="pricetags-loading-message">Загрузка аналитики...</div></div>
        </div>
      </div>
    </div>

    <div id="priceTagsStatus" class="pricetags-status-message"></div>

    <div id="analyticsModal" class="pricetags-modal" style="display:none;">
      <div class="pricetags-modal-content">
        <span id="analyticsModalClose" class="pricetags-modal-close">&times;</span>
        <h3 id="analyticsModalTitle" style="margin-top:0;color:var(--pm-text);">Детали</h3>
        <div id="analyticsModalBody"></div>
      </div>
    </div>

    <div id="messageModal" class="pricetags-modal" style="display:none;">
      <div class="pricetags-modal-content" style="max-width:500px;">
        <span class="pricetags-modal-close">&times;</span>
        <h3 style="margin-top:0;color:var(--pm-text);">Отправить сообщение</h3>
        <textarea id="messageText" placeholder="Введите сообщение..." rows="4" style="width:100%;background:var(--pm-surface2);border:1px solid var(--pm-border);border-radius:var(--pm-radius-sm);color:var(--pm-text);padding:10px;margin:10px 0;font-family:'Golos Text',sans-serif;"></textarea>
        <button id="sendMessageBtn" class="pricetags-btn pricetags-btn-primary">Отправить</button>
      </div>
    </div>
  `;

  const moduleState = {
    newTasks: [],
    allTasks: [],
    loaded: { newTasks: false, allTasks: false },
    analyticsChart: null,
    chartJsLoaded: false,
    chartScriptEl: null,
    analyticsData: {
      periodFrom: null,
      periodTo: null,
      currentTab: 'overview'
    }
  };

  const chatState = {
    currentChatId: null,
    currentUserName: null,
    currentUserShop: null,
    messages: [],
    isLoading: false,
    hasMore: true,
    offset: 0,
    eventSource: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  };

  const Sounds = {
    _cache: {},
    play(name) {
      const url = `/assets/sounds/${name}.mp3`;
      if (!this._cache[name]) {
        this._cache[name] = new Audio(url);
      }
      const audio = this._cache[name];
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const elements = {
    tasksTab: document.getElementById('tasksTAB'),
    historyTab: document.getElementById('historyTAB'),
    analyticsTab: document.getElementById('analyticsTAB'),
    tasksContent: document.getElementById('tasks-tab-content'),
    historyContent: document.getElementById('history-tab-content'),
    analyticsContent: document.getElementById('analytics-tab-content'),
    tasksList: document.getElementById('tasksList'),
    historyList: document.getElementById('historyList'),
    analyticsList: document.getElementById('analyticsList'),
    statusMessage: document.getElementById('priceTagsStatus'),
  };

  function openChatModal(chatId, userName, userShop) {
    chatState.currentChatId = chatId;
    chatState.currentUserName = userName;
    chatState.currentUserShop = userShop;
    chatState.messages = [];
    chatState.offset = 0;
    chatState.hasMore = true;

    createChatModal();
    loadMessagesForToday();
    startRealtimeConnection();
  }

  function createChatModal() {
    const modalHTML = `
      <div class="pricetags-chat-modal">
        <div class="pricetags-chat-container">
          <div class="pricetags-chat-header">
            <div class="pricetags-chat-user-info">
              <h3>${chatState.currentUserName}</h3>
              <p>${chatState.currentUserShop}</p>
            </div>
            <button class="pricetags-chat-close">&times;</button>
          </div>
          
          <div class="pricetags-chat-controls">
            <button id="loadMoreBtn">Загрузить еще</button>
            <button id="loadAllBtn">Загрузить все</button>
            <input type="text" id="searchInput" placeholder="Поиск в истории...">
            <button id="searchBtn">Найти</button>
          </div>
          
          <div class="pricetags-chat-messages" id="chatMessages">
            <div class="pricetags-loading-message">Загрузка сообщений...</div>
          </div>
          
          <div class="pricetags-chat-input-area">
            <textarea class="pricetags-chat-input" id="chatInput" placeholder="Введите сообщение..." rows="1"></textarea>
            <button class="pricetags-chat-send" id="chatSend">Отправить</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.querySelector('.pricetags-chat-modal');
    const closeBtn = modal.querySelector('.pricetags-chat-close');
    const loadMoreBtn = modal.querySelector('#loadMoreBtn');
    const loadAllBtn = modal.querySelector('#loadAllBtn');
    const searchBtn = modal.querySelector('#searchBtn');
    const searchInput = modal.querySelector('#searchInput');
    const chatInput = modal.querySelector('#chatInput');
    const chatSend = modal.querySelector('#chatSend');
    const messagesContainer = modal.querySelector('#chatMessages');

    closeBtn.addEventListener('click', closeChatModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeChatModal();
    });

    loadMoreBtn.addEventListener('click', loadMoreMessages);
    loadAllBtn.addEventListener('click', loadAllMessages);

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    chatSend.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    messagesContainer.addEventListener('scroll', handleScroll);
  }

  async function loadMessagesForToday() {
    const today = new Date().toISOString().split('T')[0];
    await loadMessages(today);
  }

  async function loadMessages(date = null, isLoadMore = false) {
    if (chatState.isLoading) return;
    
    chatState.isLoading = true;
    
    try {
      const params = new URLSearchParams({
        chatId: chatState.currentChatId,
        limit: '50',
        offset: chatState.offset.toString()
      });
      
      if (date) {
        params.append('date', date);
      }

      const response = await fetch(`/api/chat-messages?${params}`);
      const { success, messages, hasMore, error } = await response.json();

      if (!success) throw new Error(error);

      if (isLoadMore) {
        chatState.messages = [...messages, ...chatState.messages];
      } else {
        chatState.messages = messages;
      }

      chatState.hasMore = hasMore;
      chatState.offset += messages.length;

      renderMessages();
      scrollToBottom();

    } catch (err) {
      console.error('Error loading messages:', err);
      showStatus(`Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      chatState.isLoading = false;
    }
  }

  async function loadMoreMessages() {
    await loadMessages(null, true);
  }

  async function loadAllMessages() {
    chatState.offset = 0;
    await loadMessages();
  }

  async function performSearch() {
    const searchInput = document.querySelector('#searchInput');
    const query = searchInput.value.trim();
    
    if (!query) return;

    try {
      const response = await fetch(`/api/chat-search?chatId=${chatState.currentChatId}&query=${encodeURIComponent(query)}`);
      const { success, messages, error } = await response.json();

      if (!success) throw new Error(error);

      const messagesContainer = document.querySelector('#chatMessages');
      messagesContainer.innerHTML = `
        <div class="pricetags-search-results">
          Найдено сообщений: ${messages.length}
          <button onclick="window.clearSearch()" style="margin-left: 8px; background: none; border: none; color: #f87171; cursor: pointer;">×</button>
        </div>
        ${renderMessagesHTML(messages)}
      `;

    } catch (err) {
      console.error('Error searching messages:', err);
      showStatus(`Ошибка поиска: ${err.message}`, 'error');
    }
  }

  window.clearSearch = function() {
    renderMessages();
  };

  function renderMessages() {
    const messagesContainer = document.querySelector('#chatMessages');
    messagesContainer.innerHTML = renderMessagesHTML(chatState.messages);
  }

  function renderMessagesHTML(messages) {
    if (messages.length === 0) {
      return '<div class="pricetags-no-data-message">Нет сообщений</div>';
    }

    let lastDate = '';
    let html = '';

    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toLocaleDateString('ru-RU');
      
      if (messageDate !== lastDate) {
        html += `<div class="pricetags-date-divider"><span>${messageDate}</span></div>`;
        lastDate = messageDate;
      }

      const isOutgoing = message.direction === 'out';
      const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const statusIcon = isOutgoing 
        ? (message.status === 'seen' ? '✓✓' : '✓') 
        : '';

      html += `
        <div class="pricetags-message pricetags-message-${isOutgoing ? 'out' : 'in'}">
          <div>${message.message_body}</div>
          <div class="pricetags-message-time">
            ${time} ${statusIcon}
          </div>
        </div>
      `;
    });

    return html;
  }

  function scrollToBottom() {
    const messagesContainer = document.querySelector('#chatMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleScroll() {
    const messagesContainer = document.querySelector('#chatMessages');
    if (messagesContainer.scrollTop === 0 && chatState.hasMore && !chatState.isLoading) {
      loadMoreMessages();
    }
  }

  async function sendChatMessage() {
    const chatInput = document.querySelector('#chatInput');
    const text = chatInput.value.trim();
    
    if (!text) return;

    try {
      const saveResp = await fetch('/api/save-outgoing-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatState.currentChatId,
          message_body: text 
        })
      });
      
      const saveData = await saveResp.json();
      
      if (!saveData.success) {
        throw new Error(saveData.error || 'Ошибка сохранения сообщения');
      }

      const sendResp = await fetch('/api/send-telegram-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: chatState.currentChatId,
          text: text,
          recordId: saveData.recordId
        })
      });
      
      const { success, error } = await sendResp.json();
      if (!success) throw new Error(error || 'Ошибка отправки');

      chatInput.value = '';
      chatInput.style.height = 'auto';

      showStatus('Сообщение отправлено');

    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      showStatus(`Ошибка: ${err.message}`, 'error');
    }
  }

  function startRealtimeConnection() {
    if (!chatState.currentChatId) return;

    if (chatState.eventSource) {
      chatState.eventSource.close();
      chatState.eventSource = null;
    }

    try {
      const eventSource = new EventSource(`/api/chat-events?chatId=${chatState.currentChatId}`);
      
      eventSource.onopen = () => {
        chatState.reconnectAttempts = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              break;
            case 'heartbeat':
              break;
            case 'new_message':
              handleNewMessage(data.message);
              break;
            case 'message_updated':
              handleMessageUpdate(data.message);
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        eventSource.close();
        
        if (chatState.reconnectAttempts < chatState.maxReconnectAttempts) {
          chatState.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, chatState.reconnectAttempts), 30000);
          setTimeout(startRealtimeConnection, delay);
        } else {
          switchToPollingMode();
        }
      };

      chatState.eventSource = eventSource;

    } catch (err) {
      console.error('Error creating EventSource:', err);
      switchToPollingMode();
    }
  }

  function handleNewMessage(payload) {
    playNotificationSound();
    loadMessagesForToday();
  }

  function playNotificationSound() {
    Sounds.play('new_message');
  }

  function switchToPollingMode() {
    if (chatState.eventSource) {
      chatState.eventSource.close();
      chatState.eventSource = null;
    }
    
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval);
    }

    chatState.pollingInterval = setInterval(() => {
      if (chatState.currentChatId && !chatState.isLoading) {
        checkForNewMessages();
      }
    }, 10000);
  }

  async function checkForNewMessages() {
    if (chatState.isLoading || !chatState.messages.length) return;

    try {
      const latestMessage = chatState.messages[chatState.messages.length - 1];
      const since = latestMessage.created_at;

      const response = await fetch(`/api/chat-messages?chatId=${chatState.currentChatId}&since=${since}`);
      if (!response.ok) return;

      const { success, messages } = await response.json();
      if (!success || !messages.length) return;

      const newMessages = messages.filter(newMsg => 
        !chatState.messages.some(existingMsg => existingMsg.id === newMsg.id)
      );

      if (newMessages.length > 0) {
        chatState.messages = [...chatState.messages, ...newMessages];
        renderMessages();
        
        const hasIncoming = newMessages.some(msg => msg.direction === 'in');
        if (hasIncoming) {
          playNotificationSound();
        }
      }

    } catch (err) {
      console.error('Error checking for new messages:', err);
    }
  }

  function handleMessageUpdate(updatedMessage) {
    const messageIndex = chatState.messages.findIndex(msg => msg.id === updatedMessage.id);
    
    if (messageIndex !== -1) {
      chatState.messages[messageIndex] = updatedMessage;
      renderMessages();
    }
  }

  function closeChatModal() {
    if (chatState.eventSource) {
      chatState.eventSource.close();
      chatState.eventSource = null;
    }
    
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval);
      chatState.pollingInterval = null;
    }
    
    chatState.reconnectAttempts = 0;
    
    const modal = document.querySelector('.pricetags-chat-modal');
    if (modal) {
      modal.remove();
    }
    
    chatState.messages = [];
    chatState.isLoading = false;
    chatState.hasMore = true;
    chatState.offset = 0;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (moduleState.chartJsLoaded || window.Chart) return resolve();
      if (moduleState.chartScriptEl) {
        if (moduleState.chartScriptEl.getAttribute && moduleState.chartScriptEl.getAttribute('data-loaded')) {
          moduleState.chartJsLoaded = true;
          return resolve();
        }
        moduleState.chartScriptEl.addEventListener('load', () => { moduleState.chartJsLoaded = true; resolve(); });
        moduleState.chartScriptEl.addEventListener('error', () => reject(new Error('Chart.js load error')));
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => { moduleState.chartJsLoaded = true; try { s.setAttribute('data-loaded','1'); } catch(e){} resolve(); };
      s.onerror = () => reject(new Error('Chart.js load error'));
      document.head.appendChild(s);
      moduleState.chartScriptEl = s;
    });
  }

  function ensureChartJs() {
    if (moduleState.chartJsLoaded || window.Chart) {
      moduleState.chartJsLoaded = true;
      return Promise.resolve();
    }
    return loadScript('https://cdn.jsdelivr.net/npm/chart.js');
  }

  function buildMonthDays(year, monthIndex) {
    const days = [];
    const d = new Date(year, monthIndex, 1);
    while (d.getMonth() === monthIndex) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  function createItemLink(itemCode) {
    const itemUrl = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${encodeURIComponent(itemCode)}&dispatch=products.search&security_hash=787aa6c42a72d38a492508e533b6d589`;
    return `<a href="${itemUrl}" target="_blank" class="pricetags-item-code-link">${itemCode}</a>`;
  }

  async function loadNewTasks() {
    if (moduleState.loaded.newTasks) return;

    try {
      const response = await fetch('/api/all-pending-price-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: String(chatId || userData?.chat_id || '') })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const { success, tags, error } = await response.json();
      if (!success) throw new Error(error || 'Не удалось загрузить новые задачи');

      moduleState.newTasks = tags || [];
      moduleState.loaded.newTasks = true;
      renderNewTasks();
    } catch (err) {
      console.error('Ошибка загрузки новых задач:', err);
      elements.tasksList.innerHTML = `<div class="pricetags-no-data-message">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  async function loadAllTasks() {
    if (moduleState.loaded.allTasks) return;

    try {
      const response = await fetch('/api/all-price-tag-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: String(chatId || userData?.chat_id || '') })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const { success, tags, error } = await response.json();
      if (!success) throw new Error(error || 'Не удалось загрузить все задачи');

      moduleState.allTasks = tags || [];
      moduleState.loaded.allTasks = true;
      renderHistory();
    } catch (err) {
      console.error('Ошибка загрузки всех задач:', err);
      elements.historyList.innerHTML = `<div class="pricetags-no-data-message">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  async function completeTask(taskId) {
    try {
      const response = await fetch('/api/change-price-tag-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          status: 'completed',
          chatId: String(chatId || userData?.chat_id || '')
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const { success, error } = await response.json();
      if (!success) throw new Error(error || 'Не удалось выполнить задачу');

      const taskIndex = moduleState.newTasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        moduleState.newTasks[taskIndex].status = 'completed';
      }

      moduleState.loaded.newTasks = false;
      moduleState.loaded.allTasks = false;
      
      if (elements.tasksContent.style.display !== 'none') {
        await loadNewTasks();
      }
      
      showStatus('Задача успешно выполнена');
    } catch (err) {
      console.error('Ошибка выполнения задачи:', err);
      showStatus(`Ошибка: ${err.message}`, 'error');
    }
  }

  async function deleteTask(taskId) {
    try {
      const response = await fetch('/api/change-price-tag-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          status: 'cancelled',
          chatId: String(chatId || userData?.chat_id || '')
        })
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const { success, error } = await response.json();
      if (!success) throw new Error(error || 'Не удалось отменить задачу');

      moduleState.loaded.newTasks = false;
      moduleState.loaded.allTasks = false;
      if (elements.tasksContent.style.display !== 'none') {
        await loadNewTasks();
      }
      showStatus('Задача отменена');
    } catch (err) {
      console.error('Ошибка отмены задачи:', err);
      showStatus(`Ошибка: ${err.message}`, 'error');
    }
  }

  function switchTab(tabId) {
    [elements.tasksContent, elements.historyContent, elements.analyticsContent].forEach(c => c.style.display = 'none');
    [elements.tasksTab, elements.historyTab, elements.analyticsTab].forEach(b => {
      b.classList.remove('pricetags-btn-primary');
      b.classList.add('pricetags-btn-secondary');
    });

    if (tabId === 'tasks-tab-content') {
      elements.tasksContent.style.display = 'block';
      elements.tasksTab.classList.remove('pricetags-btn-secondary');
      elements.tasksTab.classList.add('pricetags-btn-primary');
      loadNewTasks();
    }
    if (tabId === 'history-tab-content') {
      elements.historyContent.style.display = 'block';
      elements.historyTab.classList.remove('pricetags-btn-secondary');
      elements.historyTab.classList.add('pricetags-btn-primary');
      loadAllTasks();
    }
    if (tabId === 'analytics-tab-content') {
      elements.analyticsContent.style.display = 'block';
      elements.analyticsTab.classList.remove('pricetags-btn-secondary');
      elements.analyticsTab.classList.add('pricetags-btn-primary');
      renderAnalytics();
    }
  }

  function showStatus(message, type = 'success') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `pricetags-status-message ${type}`;
    elements.statusMessage.style.display = 'block';
    setTimeout(() => { elements.statusMessage.style.display = 'none'; }, 4000);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusDisplayName(status) {
    const statusMap = {
      'new': 'Новая',
      'completed': 'Выполнена',
      'cancelled': 'Отменена',
      'in_progress': 'В работе'
    };
    return statusMap[status] || status;
  }

  function renderNewTasks() {
    const newTasks = moduleState.newTasks.filter(task => task.status === 'new');
    
    if (newTasks.length === 0) {
      elements.tasksList.innerHTML = '<div class="pricetags-no-data-message">Новых задач нет</div>';
      return;
    }

    elements.tasksList.innerHTML = `
      <div class="pricetags-table-wrap">
        <table class="pricetags-table">
          <thead>
            <tr>
              <th>Код товара</th>
              <th>Название товара</th>
              <th>Тип ошибки</th>
              <th>Комментарий</th>
              <th>Дата создания</th>
              <th>Кем отправлено</th>
              <th>Магазин</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${newTasks.map(task => `
              <tr>
                <td>${createItemLink(task.item_code)}</td>
                <td>
                  <span class="pricetags-editable-item-name" data-id="${task.id}" data-name="${(task.item_name||'').replace(/"/g,'&quot;')}">
                    ${task.item_name || '<i>Не указано</i>'}
                  </span>
                </td>
                <td>
                  <span class="pricetags-editable-error-type" data-id="${task.id}">
                    ${task.error_type_display || 'Не указан'}
                  </span>
                </td>
                <td>${task.comment || '-'}</td>
                <td>${formatDate(task.created_at)}</td>
                <td>
                  ${task.reported_by_name 
                    ? `<span class="pricetags-user-link" data-chat="${task.reported_by}" data-name="${task.reported_by_name}" data-shop="${task.shop_name || ''}">
                        <span class="pricetags-send-indicator">💬</span>
                        <span class="pricetags-user-name">${task.reported_by_name}</span>
                      </span>` 
                    : 'Неизвестно'}
                </td>
                <td>${task.shop_name || '-'}</td>
                <td><span class="pricetags-task-status ${task.status}">${getStatusDisplayName(task.status)}</span></td>
                <td>
                  <div class="pricetags-task-actions">
                    <button class="pricetags-btn pricetags-btn-complete" data-id="${task.id}" ${task.status !== 'new' ? 'disabled' : ''}>
                      Выполнить
                    </button>
                    <button class="pricetags-btn pricetags-btn-delete" data-id="${task.id}">
                      Отменить
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    elements.tasksList.querySelectorAll('.pricetags-editable-error-type').forEach(span => {
      span.addEventListener('click', async (e) => {
        const taskId = parseInt(e.target.dataset.id);
        const currentValue = e.target.textContent.trim();
        const newValue = prompt('Введите новый тип ошибки:', currentValue);
        if (!newValue || newValue === currentValue) return;

        try {
          const resp = await fetch('/api/update-error-type', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, errorType: newValue })
          });
          if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
          const { success, error } = await resp.json();
          if (!success) throw new Error(error || 'Ошибка обновления');

          e.target.textContent = newValue;
          const t = moduleState.newTasks.find(t => t.id === taskId);
          if (t) t.error_type_display = newValue;
          showStatus('Тип ошибки обновлён');
        } catch (err) {
          console.error('Ошибка обновления типа ошибки:', err);
          showStatus(`Ошибка: ${err.message}`, 'error');
        }
      });
    });

    elements.tasksList.querySelectorAll('.pricetags-editable-item-name').forEach(span => {
      span.addEventListener('click', async (e) => {
        const taskId = parseInt(e.target.dataset.id);
        const currentValue = e.target.dataset.name || '';
        const newValue = prompt('Введите правильное название товара:', currentValue);
        if (newValue == null || newValue === currentValue) return;

        try {
          const resp = await fetch('/api/update-item-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, itemName: newValue })
          });
          if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
          const { success, error } = await resp.json();
          if (!success) throw new Error(error || 'Ошибка обновления');

          e.target.textContent = newValue || '<i>Не указано</i>';
          e.target.dataset.name = newValue;
          const t = moduleState.newTasks.find(t => t.id === taskId);
          if (t) t.item_name = newValue;
          showStatus('Название товара обновлено');
        } catch (err) {
          console.error('Ошибка обновления названия товара:', err);
          showStatus(`Ошибка: ${err.message}`, 'error');
        }
      });
    });

    elements.tasksList.querySelectorAll('.pricetags-btn-complete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const taskId = parseInt(e.target.dataset.id);
        e.target.disabled = true;
        e.target.textContent = 'Выполняется...';
        await completeTask(taskId);
      });
    });

    elements.tasksList.querySelectorAll('.pricetags-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const taskId = parseInt(e.target.dataset.id);
        e.target.disabled = true;
        e.target.textContent = 'Выполняется...';
        await deleteTask(taskId);
      });
    });

    elements.tasksList.querySelectorAll('.pricetags-user-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const chatId = link.dataset.chat;
        const userName = link.dataset.name;
        const userShop = link.dataset.shop || 'Неизвестно';
        openChatModal(chatId, userName, userShop);
      });
    });
  }

  function renderHistory() {
    if (moduleState.allTasks.length === 0) {
      elements.historyList.innerHTML = '<div class="pricetags-no-data-message">История пуста</div>';
      return;
    }

    const sortedTasks = [...moduleState.allTasks].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    elements.historyList.innerHTML = `
      <div class="pricetags-table-wrap">
        <table class="pricetags-table">
          <thead>
            <tr>
              <th>Код товара</th>
              <th>Название товара</th>
              <th>Тип ошибки</th>
              <th>Комментарий</th>
              <th>Дата создания</th>
              <th>Кем отправлено</th>
              <th>Магазин</th>
              <th>Статус</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTasks.map(task => `
              <tr>
                <td>${createItemLink(task.item_code)}</td>
                <td>
                  <span class="pricetags-editable-item-name" data-id="${task.id}" data-name="${(task.item_name||'').replace(/"/g,'&quot;')}">
                    ${task.item_name || '<i>Не указано</i>'}
                  </span>
                </td>
                <td>${task.error_type_display || 'Не указан'}</td>
                <td>${task.comment || '-'}</td>
                <td>${formatDate(task.created_at)}</td>
                <td>
                  ${task.reported_by_name 
                    ? `<span class="pricetags-user-link" data-chat="${task.reported_by}" data-name="${task.reported_by_name}" data-shop="${task.shop_name || ''}">
                        <span class="pricetags-send-indicator">💬</span>
                        <span class="pricetags-user-name">${task.reported_by_name}</span>
                      </span>`
                    : 'Неизвестно'}
                </td>
                <td>${task.shop_name || '-'}</td>
                <td><span class="pricetags-task-status ${task.status}">${getStatusDisplayName(task.status)}</span></td>
                <td>${task.updated_at ? formatDate(task.updated_at) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    elements.historyList.querySelectorAll('.pricetags-editable-item-name').forEach(span => {
      span.addEventListener('click', async (e) => {
        const taskId = parseInt(e.target.dataset.id);
        const currentValue = e.target.dataset.name || '';
        const newValue = prompt('Введите правильное название товара:', currentValue);
        if (newValue == null || newValue === currentValue) return;

        try {
          const resp = await fetch('/api/update-item-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, itemName: newValue })
          });
          if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
          const { success, error } = await resp.json();
          if (!success) throw new Error(error || 'Ошибка обновления');

          e.target.textContent = newValue || '<i>Не указано</i>';
          e.target.dataset.name = newValue;
          const t = moduleState.allTasks.find(t => t.id === taskId);
          if (t) t.item_name = newValue;
          showStatus('Название товара обновлено');
        } catch (err) {
          console.error('Ошибка обновления названия товара:', err);
          showStatus(`Ошибка: ${err.message}`, 'error');
        }
      });
    });

    elements.historyList.querySelectorAll('.pricetags-user-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const chatId = link.dataset.chat;
        const userName = link.dataset.name;
        const userShop = link.dataset.shop || 'Неизвестно';
        openChatModal(chatId, userName, userShop);
      });
    });
  }

  function renderAnalytics() {
    if (!moduleState.loaded.allTasks) {
      loadAllTasks().then(() => {
        renderAnalyticsContent();
      });
      elements.analyticsList.innerHTML = '<div class="pricetags-loading-message">Загрузка аналитики...</div>';
      return;
    }
    
    renderAnalyticsContent();
  }

  function extractErrorType(t) {
    if (!t) return 'Не указан';
    if (t.error_type_display) return t.error_type_display;
    if (typeof t.error_type === 'string') return t.error_type;
    try {
      return t.error_type && typeof t.error_type === 'object' ? JSON.stringify(t.error_type) : String(t.error_type || 'Не указан');
    } catch (e) {
      return 'Не указан';
    }
  }

  function getFilteredTasks() {
    const allTasks = moduleState.allTasks || [];
    const { periodFrom, periodTo } = moduleState.analyticsData;
    
    if (!periodFrom && !periodTo) {
      return allTasks;
    }
    
    return allTasks.filter(task => {
      const taskDate = new Date(task.created_at);
      if (periodFrom && taskDate < new Date(periodFrom)) return false;
      if (periodTo) {
        const toDate = new Date(periodTo);
        toDate.setDate(toDate.getDate() + 1);
        if (taskDate >= toDate) return false;
      }
      return true;
    });
  }

  function renderAnalyticsContent() {
    const filteredTasks = getFilteredTasks();
    const totalTasks = filteredTasks.length;
    const byShop = {};
    const byUser = {};
    const byCategory = {};
    const byStatus = {};
    const tasksByDay = {};

    const categoriesByShop = {};
    const errorTypesByCategory = {};
    const categoriesByUser = {};
    const errorTypesByUser = {};

    const { periodFrom, periodTo } = moduleState.analyticsData;
    const startDate = periodFrom ? new Date(periodFrom) : new Date();
    const endDate = periodTo ? new Date(periodTo) : new Date();
    
    if (!periodFrom) {
      startDate.setDate(startDate.getDate() - 30);
    }

    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const key = currentDate.toISOString().slice(0, 10);
      tasksByDay[key] = 0;
      days.push(key);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    filteredTasks.forEach(t => {
      const shop = t.shop_name || 'Неизвестно';
      const user = t.reported_by_name || (t.reported_by || 'Неизвестно');
      const cat = t.category || 'Неизвестно';
      const status = t.status || 'unknown';
      const err = extractErrorType(t);

      byShop[shop] = (byShop[shop] || 0) + 1;
      byUser[user] = (byUser[user] || 0) + 1;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;

      categoriesByShop[shop] = categoriesByShop[shop] || {};
      categoriesByShop[shop][cat] = (categoriesByShop[shop][cat] || 0) + 1;

      errorTypesByCategory[cat] = errorTypesByCategory[cat] || {};
      errorTypesByCategory[cat][err] = (errorTypesByCategory[cat][err] || 0) + 1;

      categoriesByUser[user] = categoriesByUser[user] || {};
      categoriesByUser[user][cat] = (categoriesByUser[user][cat] || 0) + 1;

      errorTypesByUser[user] = errorTypesByUser[user] || {};
      errorTypesByUser[user][err] = (errorTypesByUser[user][err] || 0) + 1;

      const dayKey = t.created_at ? t.created_at.slice(0,10) : null;
      if (dayKey && tasksByDay.hasOwnProperty(dayKey)) tasksByDay[dayKey] += 1;
    });

    const shopsSorted = Object.entries(byShop).sort((a,b) => b[1]-a[1]);
    const usersSorted = Object.entries(byUser).sort((a,b) => b[1]-a[1]);
    const categoriesSorted = Object.entries(byCategory).sort((a,b) => b[1]-a[1]);

    const dateCounts = {};
    filteredTasks.forEach(t => {
      const dayKey = t.created_at ? t.created_at.slice(0,10) : null;
      if (!dayKey) return;
      dateCounts[dayKey] = (dateCounts[dayKey] || 0) + 1;
    });

    const timelineValues = days.map(d => dateCounts[d] || 0);
    const timelineTotal = timelineValues.reduce((s,v) => s+v, 0);
    const timelineAvg = timelineValues.length ? Math.round(timelineTotal / timelineValues.length) : 0;
    const timelineMax = Math.max(...timelineValues, 0);

    elements.analyticsList.innerHTML = `
      <div class="pricetags-analytics-date-controls">
        <label>Период с:</label>
        <input type="date" id="periodFrom" value="${periodFrom || ''}">
        <label>по:</label>
        <input type="date" id="periodTo" value="${periodTo || ''}">
        <button id="applyPeriod">Применить</button>
      </div>
      
      <div class="pricetags-analytics-tabs">
        <button class="pricetags-analytics-tab-btn active" data-section="overview">Обзор</button>
        <button class="pricetags-analytics-tab-btn" data-section="shops">Магазины</button>
        <button class="pricetags-analytics-tab-btn" data-section="categories">Категории</button>
        <button class="pricetags-analytics-tab-btn" data-section="users">Пользователи</button>
        <button class="pricetags-analytics-tab-btn" data-section="errors">Ошибки</button>
      </div>
      <div id="analyticsSectionContent"></div>
    `;

    const periodFromInput = document.getElementById('periodFrom');
    const periodToInput = document.getElementById('periodTo');
    const applyPeriodBtn = document.getElementById('applyPeriod');

    applyPeriodBtn.addEventListener('click', () => {
      moduleState.analyticsData.periodFrom = periodFromInput.value;
      moduleState.analyticsData.periodTo = periodToInput.value;
      renderAnalyticsContent();
    });

    const tabButtons = elements.analyticsList.querySelectorAll('.pricetags-analytics-tab-btn');
    const sectionContent = document.getElementById('analyticsSectionContent');

    function renderOverview() {
      const monthNames = {
        0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 
        4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август',
        8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'
      };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      sectionContent.innerHTML = `
        <div class="pricetags-stats-grid">
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${totalTasks}</div><div class="pricetags-stat-label">Всего задач</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${byStatus['new']||0}</div><div class="pricetags-stat-label">Новые</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${byStatus['completed']||0}</div><div class="pricetags-stat-label">Выполнено</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${byStatus['cancelled']||0}</div><div class="pricetags-stat-label">Отменено</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${timelineMax}</div><div class="pricetags-stat-label">Макс/день</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${timelineAvg}</div><div class="pricetags-stat-label">Сред/день</div></div>
          <div class="pricetags-stat-card"><div class="pricetags-stat-number">${shopsSorted.length}</div><div class="pricetags-stat-label">Магазинов</div></div>
        </div>

        <div class="pricetags-section">
          <h4>Таймлайн</h4>

          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <label style="font-size:13px;color:var(--pm-text-muted);">Период:</label>
            <div style="font-size:13px;color:var(--pm-text);">${(periodFrom||'') ? periodFrom : ''} — ${(periodTo||'') ? periodTo : ''}</div>
          </div>

          <div class="pricetags-chart-container">
            <canvas id="analyticsTimelineCanvas" class="pricetags-chart-canvas" role="img" aria-label="Таймлайн задач"></canvas>
          </div>
        </div>
      `;

      function renderChartForDays(targetDays) {
        const values = targetDays.map(d => dateCounts[d] || 0);

        try { if (moduleState.analyticsChart) { moduleState.analyticsChart.destroy(); moduleState.analyticsChart = null; } } catch(e){}

        ensureChartJs().then(() => {
          try {
            const canvas = sectionContent.querySelector('#analyticsTimelineCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const parent = canvas.parentElement;
            if (parent) parent.style.height = '250px';
            const labels = targetDays.map(d => d.slice(8));
            
          moduleState.analyticsChart = new window.Chart(ctx, {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: 'Задачи',
                data: values,
                borderColor: 'var(--pm-accent)',
                backgroundColor: 'rgba(79,142,247,0.6)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  display: false 
                },
                tooltip: {
                  callbacks: {
                    title: (items) => {
                      const idx = items[0]?.dataIndex;
                      return idx != null ? targetDays[idx] : '';
                    },
                    label: (ctx) => `${ctx.dataset.label || 'Задачи'}: ${ctx.formattedValue}`
                  }
                }
              },
              scales: {
                x: { 
                  grid: { display: false, color: 'var(--pm-border)' }, 
                  ticks: { 
                    maxRotation: 0, 
                    autoSkip: true, 
                    color: 'var(--pm-text)'
                  }
                },
                y: { 
                  beginAtZero: true, 
                  ticks: { 
                    precision: 0, 
                    color: 'var(--pm-text)'
                  },
                  grid: { color: 'var(--pm-border)' }
                }
              },
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const date = targetDays[index];
                  openDayDetails(date, values[index]);
                }
              }
            }
          });

            canvas.style.cursor = 'pointer';
            
          } catch (err) {
            console.error('Chart render error', err);
          }
        }).catch(err => {
          console.error('Не удалось загрузить Chart.js:', err);
        });
      }

      renderChartForDays(days);
    }

    function renderShops() {
      sectionContent.innerHTML = `
        <div class="pricetags-section">
          ${shopsSorted.length ? `
            <div class="pricetags-table-wrap">
              <table class="pricetags-table">
                <thead><tr><th>Магазин</th><th>Задачи</th><th>Топ категорий</th><th>Детали</th></tr></thead>
                <tbody>
                  ${shopsSorted.slice(0,50).map(([shop, count]) => {
                    const cats = categoriesByShop[shop] ? Object.entries(categoriesByShop[shop]).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
                    const catsHtml = cats.map(([c,n]) => 
                      `<span class="pricetags-chip" 
                        data-filter-type="category" 
                        data-filter-key="${c}"
                        data-context-type="shop"
                        data-context-key="${shop}">${c} (${n})</span>`
                    ).join(' ');
                    return `<tr>
                      <td>${shop}</td><td>${count}</td><td><div class="pricetags-analytics-chips">${catsHtml}</div></td>
                      <td><button class="pricetags-details-btn" data-filter-type="shop" data-filter-key="${shop}">Подробнее</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '<div class="pricetags-no-data-message">Нет данных по магазинам</div>'}
        </div>
      `;
    }

    function renderCategories() {
      sectionContent.innerHTML = `
        <div class="pricetags-section">
          ${categoriesSorted.length ? `
            <div class="pricetags-table-wrap">
              <table class="pricetags-table">
                <thead><tr><th>Категория</th><th>Задачи</th><th>Топ типов ошибок</th><th>Детали</th></tr></thead>
                <tbody>
                  ${categoriesSorted.slice(0,50).map(([cat, count]) => {
                    const errs = errorTypesByCategory[cat] ? Object.entries(errorTypesByCategory[cat]).sort((a,b)=>b[1]-a[1]).slice(0,6) : [];
                    const errsHtml = errs.map(([e,n]) => 
                      `<span class="pricetags-chip" 
                        data-filter-type="error" 
                        data-filter-key="${e}"
                        data-context-type="category"
                        data-context-key="${cat}">${e} (${n})</span>`
                    ).join(' ');
                    return `<tr>
                      <td>${cat}</td><td>${count}</td><td><div class="pricetags-analytics-chips">${errsHtml}</div></td>
                      <td><button class="pricetags-details-btn" data-filter-type="category" data-filter-key="${cat}">Подробнее</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '<div class="pricetags-no-data-message">Нет данных по категориям</div>'}
        </div>
      `;
    }

    function renderUsers() {
      sectionContent.innerHTML = `
        <div class="pricetags-section">
          ${usersSorted.length ? `
            <div class="pricetags-table-wrap">
              <table class="pricetags-table">
                <thead><tr><th>Пользователь</th><th>Задачи</th><th>Топ категорий</th><th>Топ ошибок</th><th>Детали</th></tr></thead>
                <tbody>
                  ${usersSorted.slice(0,50).map(([user, count]) => {
                    const ucats = categoriesByUser[user] ? Object.entries(categoriesByUser[user]).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
                    const uerrs = errorTypesByUser[user] ? Object.entries(errorTypesByUser[user]).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
                    const ucatsHtml = ucats.map(([c,n]) => 
                      `<span class="pricetags-chip" 
                        data-filter-type="category" 
                        data-filter-key="${c}"
                        data-context-type="user"
                        data-context-key="${user}">${c} (${n})</span>`
                    ).join(' ');
                    const uerrsHtml = uerrs.map(([e,n]) => 
                      `<span class="pricetags-chip" 
                        data-filter-type="error" 
                        data-filter-key="${e}"
                        data-context-type="user"
                        data-context-key="${user}">${e} (${n})</span>`
                    ).join(' ');
                    return `<tr>
                      <td>${user}</td><td>${count}</td><td><div class="pricetags-analytics-chips">${ucatsHtml}</div></td><td><div class="pricetags-analytics-chips">${uerrsHtml}</div></td>
                      <td><button class="pricetags-details-btn" data-filter-type="user" data-filter-key="${user}">Подробнее</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '<div class="pricetags-no-data-message">Нет данных по пользователям</div>'}
        </div>
      `;
    }

    function renderErrors() {
      const errorCounts = {};
      const errorByCategory = {};
      const errorByShop = {};

      (getFilteredTasks()).forEach(t => {
        const err = extractErrorType(t);
        const cat = t.category || 'Неизвестно';
        const shop = t.shop_name || 'Неизвестно';

        errorCounts[err] = (errorCounts[err] || 0) + 1;

        errorByCategory[err] = errorByCategory[err] || {};
        errorByCategory[err][cat] = (errorByCategory[err][cat] || 0) + 1;

        errorByShop[err] = errorByShop[err] || {};
        errorByShop[err][shop] = (errorByShop[err][shop] || 0) + 1;
      });

      const totalErrors = Object.values(errorCounts).reduce((s,v)=>s+v,0);
      const errorEntries = Object.entries(errorCounts).sort((a,b)=>b[1]-a[1]);

      sectionContent.innerHTML = `
        <div class="pricetags-section">
          <div class="pricetags-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="pricetags-stat-card"><div class="pricetags-stat-number">${totalErrors}</div><div class="pricetags-stat-label">Всего ошибок</div></div>
            <div class="pricetags-stat-card"><div class="pricetags-stat-number">${errorEntries.length}</div><div class="pricetags-stat-label">Типов ошибок</div></div>
          </div>

          ${errorEntries.length ? `
            <div class="pricetags-table-wrap" style="margin-top:12px;">
              <table class="pricetags-table">
                <thead><tr><th>Тип ошибки</th><th>Всего</th><th>Топ категорий</th><th>Топ магазинов</th><th>Детали</th></tr></thead>
                <tbody>
                  ${errorEntries.map(([err, count]) => {
                    const cats = errorByCategory[err] ? Object.entries(errorByCategory[err]).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
                    const shops = errorByShop[err] ? Object.entries(errorByShop[err]).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
                    const catsHtml = cats.map(([c,n]) => `<span class="pricetags-chip" data-filter-type="category" data-filter-key="${c}">${c} (${n})</span>`).join(' ');
                    const shopsHtml = shops.map(([s,n]) => `<span class="pricetags-chip" data-filter-type="shop" data-filter-key="${s}">${s} (${n})</span>`).join(' ');
                    return `<tr>
                      <td>${err}</td>
                      <td>${count}</td>
                      <td><div class="pricetags-analytics-chips">${catsHtml}</div></td>
                      <td><div class="pricetags-analytics-chips">${shopsHtml}</div></td>
                      <td><button class="pricetags-details-btn" data-filter-type="error" data-filter-key="${err}">Подробнее</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="pricetags-no-data-message">Нет данных по ошибкам</div>'}
        </div>
      `;

      sectionContent.querySelectorAll('.pricetags-details-btn').forEach(dbtn => {
        dbtn.addEventListener('click', (ev) => {
          const type = dbtn.dataset.filterType;
          const key = dbtn.dataset.filterKey;
          openAnalyticsFilterModal(type, key);
        });
      });
    }

    renderOverview();

    sectionContent.addEventListener('click', (e) => {
      const chip = e.target.closest('.pricetags-chip');
      if (chip) {
        const type = chip.dataset.filterType;
        const key = chip.dataset.filterKey;
        const contextType = chip.dataset.contextType;
        const contextKey = chip.dataset.contextKey;
        
        if (type && key) {
          const additionalFilters = {};
          
          if (contextType && contextKey) {
            additionalFilters[contextType] = contextKey;
          }
          
          const row = chip.closest('tr');
          if (row) {
            const firstCell = row.cells[0];
            if (firstCell) {
              const currentTab = moduleState.analyticsData.currentTab;
              if (currentTab === 'categories') {
                additionalFilters.category = firstCell.textContent.trim();
              } else if (currentTab === 'shops') {
                additionalFilters.shop = firstCell.textContent.trim();
              } else if (currentTab === 'users') {
                additionalFilters.user = firstCell.textContent.trim();
              }
            }
          }
          
          openAnalyticsFilterModal(type, key, additionalFilters);
        }
      }
    });

    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabButtons.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const sec = btn.dataset.section;
        moduleState.analyticsData.currentTab = sec;
        if (sec === 'overview') renderOverview();
        if (sec === 'shops') renderShops();
        if (sec === 'categories') renderCategories();
        if (sec === 'users') renderUsers();
        if (sec === 'errors') renderErrors();

        sectionContent.querySelectorAll('.pricetags-details-btn').forEach(dbtn => {
          dbtn.addEventListener('click', (ev) => {
            const type = dbtn.dataset.filterType;
            const key = dbtn.dataset.filterKey;
            openAnalyticsFilterModal(type, key);
          });
        });
      });
    });

    sectionContent.querySelectorAll('.pricetags-details-btn').forEach(dbtn => {
      dbtn.addEventListener('click', (ev) => {
        const type = dbtn.dataset.filterType;
        const key = dbtn.dataset.filterKey;
        openAnalyticsFilterModal(type, key);
      });
    });
  }

  function renderAnalyticsFilterListInto(containerEl, filterType, key, additionalFilters = {}) {
    const filtered = moduleState.allTasks.filter(t => {
      for (const [type, value] of Object.entries(additionalFilters)) {
        if (type === 'shop' && (t.shop_name||'Неизвестно') !== value) return false;
        if (type === 'user' && (t.reported_by_name || t.reported_by || 'Неизвестно') !== value) return false;
        if (type === 'category' && (t.category||'Неизвестно') !== value) return false;
        if (type === 'error' && extractErrorType(t) !== value) return false;
      }
      
      if (!additionalFilters[filterType]) {
        if (filterType === 'shop' && (t.shop_name||'Неизвестно') !== key) return false;
        if (filterType === 'user' && (t.reported_by_name || t.reported_by || 'Неизвестно') !== key) return false;
        if (filterType === 'category' && (t.category||'Неизвестно') !== key) return false;
        if (filterType === 'error' && extractErrorType(t) !== key) return false;
      }
      
      return true;
    });

    if (!containerEl) return;

    const filterDesc = [];
    if (filterType === 'shop') filterDesc.push(`Магазин: ${key}`);
    if (filterType === 'user') filterDesc.push(`Пользователь: ${key}`);
    if (filterType === 'category') filterDesc.push(`Категория: ${key}`);
    if (filterType === 'error') filterDesc.push(`Ошибка: ${key}`);
    
    if (additionalFilters.category && filterType !== 'category') filterDesc.push(`Категория: ${additionalFilters.category}`);
    if (additionalFilters.error && filterType !== 'error') filterDesc.push(`Ошибка: ${additionalFilters.error}`);
    if (additionalFilters.shop && filterType !== 'shop') filterDesc.push(`Магазин: ${additionalFilters.shop}`);

    containerEl.innerHTML = `
      <div style="margin-bottom:8px;color:var(--pm-text);">
        <strong>${filterDesc.join(' + ')}</strong> — найдено ${filtered.length}
      </div>
    `;

    if (filtered.length === 0) {
      containerEl.innerHTML += '<div class="pricetags-no-data-message">Нет задач</div>';
      return;
    }

    containerEl.innerHTML += `
      <div class="pricetags-table-wrap">
        <table class="pricetags-table">
          <thead><tr>
            <th>ID</th><th>Код</th><th>Название</th><th>Тип ошибки</th><th>Дата</th><th>Отправил</th><th>Магазин</th><th>Статус</th>
          </tr></thead>
          <tbody>
            ${filtered.map(t => `<tr>
              <td>${t.id}</td>
              <td>${createItemLink(t.item_code)}</td>
              <td>${t.item_name || '-'}</td>
              <td>${t.error_type_display || '-'}</td>
              <td>${formatDate(t.created_at)}</td>
              <td>${t.reported_by_name || t.reported_by || '-'}</td>
              <td>${t.shop_name || '-'}</td>
              <td><span class="pricetags-task-status ${t.status}">${getStatusDisplayName(t.status)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openDayDetails(date, count) {
    const filtered = moduleState.allTasks.filter(t => {
      const taskDate = t.created_at ? t.created_at.slice(0,10) : null;
      return taskDate === date;
    });

    const analyticsModal = document.getElementById('analyticsModal');
    const analyticsModalBody = document.getElementById('analyticsModalBody');
    const analyticsModalTitle = document.getElementById('analyticsModalTitle');

    analyticsModalTitle.textContent = `Детали за ${date} (${count} задач)`;
    analyticsModalBody.innerHTML = '<div class="pricetags-loading-message">Загрузка...</div>';
    analyticsModal.style.display = 'flex';
    
    setTimeout(() => {
      if (filtered.length === 0) {
        analyticsModalBody.innerHTML = '<div class="pricetags-no-data-message">Нет задач за этот день</div>';
        return;
      }

      analyticsModalBody.innerHTML = `
        <div style="margin-bottom:8px;color:var(--pm-text);"><strong>Дата: ${date}</strong> — найдено ${filtered.length} задач</div>
        <div class="pricetags-table-wrap">
          <table class="pricetags-table">
            <thead><tr>
              <th>ID</th><th>Код</th><th>Название</th><th>Тип ошибки</th><th>Время</th><th>Отправил</th><th>Магазин</th><th>Статус</th>
            </tr></thead>
            <tbody>
              ${filtered.map(t => `<tr>
                <td>${t.id}</td>
                <td>${createItemLink(t.item_code)}</td>
                <td>${t.item_name || '-'}</td>
                <td>${t.error_type_display || '-'}</td>
                <td>${t.created_at ? t.created_at.slice(11, 16) : '-'}</td>
                <td>${t.reported_by_name || t.reported_by || '-'}</td>
                <td>${t.shop_name || '-'}</td>
                <td><span class="pricetags-task-status ${t.status}">${getStatusDisplayName(t.status)}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }, 10);
  }

  const analyticsModal = document.getElementById('analyticsModal');
  const analyticsModalClose = document.getElementById('analyticsModalClose');
  const analyticsModalBody = document.getElementById('analyticsModalBody');
  const analyticsModalTitle = document.getElementById('analyticsModalTitle');

  function openAnalyticsFilterModal(filterType, key, additionalFilters = {}) {
    const filterDesc = [];
    if (filterType === 'shop') filterDesc.push(`Магазин: ${key}`);
    if (filterType === 'user') filterDesc.push(`Пользователь: ${key}`);
    if (filterType === 'category') filterDesc.push(`Категория: ${key}`);
    if (filterType === 'error') filterDesc.push(`Ошибка: ${key}`);
    
    if (additionalFilters.category && filterType !== 'category') filterDesc.push(`Категория: ${additionalFilters.category}`);
    if (additionalFilters.error && filterType !== 'error') filterDesc.push(`Ошибка: ${additionalFilters.error}`);
    if (additionalFilters.shop && filterType !== 'shop') filterDesc.push(`Магазин: ${additionalFilters.shop}`);

    analyticsModalTitle.textContent = `Детали — ${filterDesc.join(' + ')}`;
    analyticsModalBody.innerHTML = '<div class="pricetags-loading-message">Загрузка...</div>';
    analyticsModal.style.display = 'flex';
    setTimeout(() => {
      renderAnalyticsFilterListInto(analyticsModalBody, filterType, key, additionalFilters);
    }, 10);
  }

  analyticsModalClose.onclick = () => { analyticsModal.style.display = 'none'; analyticsModalBody.innerHTML = ''; };
  window.addEventListener('click', (e) => { if (e.target === analyticsModal) { analyticsModal.style.display = 'none'; analyticsModalBody.innerHTML = ''; } });

  const modal = document.getElementById('messageModal');
  const closeModal = modal.querySelector('.pricetags-modal-close');
  const sendBtn = document.getElementById('sendMessageBtn');
  const messageInput = document.getElementById('messageText');
  let currentChatId = null;
  let currentUserElement = null;

  elements.tasksTab.addEventListener('click', () => switchTab('tasks-tab-content'));
  elements.historyTab.addEventListener('click', () => switchTab('history-tab-content'));
  elements.analyticsTab.addEventListener('click', () => switchTab('analytics-tab-content'));

  elements.tasksList.addEventListener('click', (e) => {
    const userEl = e.target.closest && e.target.closest('.pricetags-user-link');
    if (userEl && !e.target.closest('.pricetags-chat-modal')) {
      const chatId = userEl.dataset.chat;
      const userName = userEl.dataset.name;
      const userShop = userEl.dataset.shop || 'Неизвестно';
      openChatModal(chatId, userName, userShop);
    }
  });
  
  elements.historyList.addEventListener('click', (e) => {
    const userEl = e.target.closest && e.target.closest('.pricetags-user-link');
    if (userEl && !e.target.closest('.pricetags-chat-modal')) {
      const chatId = userEl.dataset.chat;
      const userName = userEl.dataset.name;
      const userShop = userEl.dataset.shop || 'Неизвестно';
      openChatModal(chatId, userName, userShop);
    }
  });

  closeModal.onclick = () => {
    modal.style.display = 'none';
    if (currentUserElement) currentUserElement.classList.remove('sending');
    currentUserElement = null;
    currentChatId = null;
  };
  
  window.onclick = (e) => { 
    if (e.target === modal) {
      modal.style.display = 'none';
      if (currentUserElement) currentUserElement.classList.remove('sending');
      currentUserElement = null;
      currentChatId = null;
    }
  };

  sendBtn.onclick = async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;

    try {
      const saveResp = await fetch('/api/save-outgoing-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: currentChatId,
          message_body: text 
        })
      });
      
      const saveData = await saveResp.json();
      
      if (!saveData.success) {
        throw new Error(saveData.error || 'Ошибка сохранения сообщения');
      }

      const sendResp = await fetch('/api/send-telegram-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: currentChatId,
          text: text,
          recordId: saveData.recordId
        })
      });
      
      const { success, error } = await sendResp.json();
      if (!success) throw new Error(error || 'Ошибка отправки');

      showStatus('Сообщение отправлено');
      modal.style.display = 'none';
      if (currentUserElement) {
        currentUserElement.classList.remove('sending');
        currentUserElement.classList.add('show-sent');
        setTimeout(() => {
          if (currentUserElement) currentUserElement.classList.remove('show-sent');
        }, 4000);
        currentUserElement = null;
      }
      currentChatId = null;
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      showStatus(`Ошибка: ${err.message}`, 'error');
      if (currentUserElement) currentUserElement.classList.remove('sending');
      currentUserElement = null;
      currentChatId = null;
    }
  };

  await loadNewTasks();

  return {
    cleanup: () => {
      try { if (moduleState.analyticsChart) { moduleState.analyticsChart.destroy(); moduleState.analyticsChart = null; } } catch(e){}
      try { if (moduleState.chartScriptEl) { document.head.removeChild(moduleState.chartScriptEl); moduleState.chartScriptEl = null; moduleState.chartJsLoaded = false; } } catch(e){}
      document.head.removeChild(styleEl);
      closeChatModal();
    }
  };
}