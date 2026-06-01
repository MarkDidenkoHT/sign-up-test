export async function loadModule(container, { chatId, userData }) {
  const extractItemCode = (url) => {
    try {
      const urlObj = new URL(url);
      const qParam = urlObj.searchParams.get('q');
      if (qParam) {
        const match = qParam.match(/[ТT]-(\d+)/);
        if (match) return match[1];
      }
    } catch (err) {
      console.error('URL parse error:', err);
    }
    return null;
  };

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
  document.head.appendChild(script);

  container.innerHTML = `
    <div class="em-module">
      <div class="em-tab-bar">
        <button id="tabMessages" class="em-tab-btn active">
          <span>💬</span>
          <span>Сообщения</span>
        </button>
        <button id="tabInstructions" class="em-tab-btn">
          <span>🏷️</span>
          <span>Ценники</span>
        </button>
      </div>

      <div id="tabPanelMessages" class="em-tab-panel active"></div>

      <div id="tabPanelInstructions" class="em-tab-panel" style="display:none;">
        <div class="em-scanner-card">
          <div class="em-scanner-btn-row">
            <button id="qrScannerBtn" class="em-btn em-btn--scan">📷 Сканировать QR</button>
            <button id="manualCodeBtn" class="em-btn em-btn--manual">⌨️ Ввести код</button>
          </div>
          <button id="newTaskBtn" class="em-btn em-btn--new-task">➕ Новая задача</button>
          <div id="qrViewport" class="em-qr-viewport"></div>
          <div id="taskListSection" class="em-task-list" style="display:none;"></div>
        </div>
      </div>
    </div>
  `;

  const typeMapping = {
    News: "Новость", Promo: "Акция", Testing: "Тестирование",
    Check: "Проверка", Install: "Установка"
  };

  const ERROR_TYPES = [
    { value: 'название', label: 'Название товара' },
    { value: 'цена', label: 'Цена' },
    { value: 'характеристика', label: 'Описание товара' },
  ];

  let allMessages = [], scannedCodes = [];
  let qrCodeReader = null, isScanning = false, currentScannedItemCode = null;
  let currentScannedUrl = null, currentProductName = null;

  const apiCall = async (endpoint, data) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: String(chatId || userData?.chat_id || ""), ...data })
    });
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result;
  };

  const fetchProductInfo = async (itemCode) => {
    try {
      const result = await apiCall("/api/product-info", { itemCode });
      return result.product || null;
    } catch (err) {
      console.error('Error fetching product info:', err);
      return null;
    }
  };

  const loadPriceTags = (itemCode) => apiCall("/api/price-tags", { itemCode }).then(r => r.tags || []);
  const createPriceTagTask = (itemCode, errorTypes, comment, category) =>
    apiCall("/api/create-price-tag-task", { itemCode, errorTypes, comment, category });

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `em-toast em-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const initQRScanner = async () => {
    const btn = document.getElementById('qrScannerBtn');
    const viewport = document.getElementById('qrViewport');

    if (isScanning) {
      await stopQRScanner();
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '⏳ Инициализация...';

      await new Promise((resolve) => {
        const checkLib = () => window.Html5Qrcode ? resolve() : setTimeout(checkLib, 100);
        checkLib();
      });

      qrCodeReader = new Html5Qrcode("qrViewport");
      viewport.style.display = 'block';

      await qrCodeReader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        handleQRDetection,
        (err) => console.log('QR scan error:', err)
      );

      isScanning = true;
      btn.textContent = '⏹️ Остановить';
      btn.disabled = false;
    } catch (err) {
      console.error('Camera error:', err);
      alert('Не удалось получить доступ к камере');
      btn.textContent = '📷 Сканировать QR';
      btn.disabled = false;
      viewport.style.display = 'none';
    }
  };

  const stopQRScanner = async () => {
    if (qrCodeReader && isScanning) {
      try {
        await qrCodeReader.stop();
        await qrCodeReader.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    qrCodeReader = null;
    isScanning = false;
    const btn = document.getElementById('qrScannerBtn');
    const viewport = document.getElementById('qrViewport');
    btn.textContent = '📷 Сканировать QR';
    btn.disabled = false;
    viewport.style.display = 'none';
  };

  const handleQRDetection = async (qrUrl) => {
    const itemCode = extractItemCode(qrUrl);
    if (itemCode && !scannedCodes.some(item => item.code === itemCode)) {
      const timestamp = new Date().toLocaleString('ru-RU');
      scannedCodes.unshift({ code: itemCode, url: qrUrl, timestamp });
      currentScannedItemCode = itemCode;
      currentScannedUrl = qrUrl;
      currentProductName = null;
      document.getElementById('newTaskBtn').style.display = 'flex';
      await loadAndRenderPriceTags(itemCode);
      stopQRScanner();
    }
  };

  const loadAndRenderPriceTags = async (itemCode) => {
    const section = document.getElementById('taskListSection');
    section.style.display = 'block';
    section.innerHTML = `<div class="em-empty-state">Загрузка...</div>`;

    try {
      const [tags, productInfo] = await Promise.all([
        loadPriceTags(itemCode),
        fetchProductInfo(itemCode)
      ]);

      if (productInfo) {
        currentProductName = (productInfo.product || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null;
      }

      renderPriceTags(tags, itemCode);
    } catch (err) {
      section.innerHTML = `
        <div class="em-task-list-title">Задачи для товара: ${itemCode}</div>
        <div class="em-empty-state">Ошибка загрузки данных</div>
      `;
    }
  };

  const renderPriceTags = (tags, itemCode) => {
    const section = document.getElementById('taskListSection');
    const pendingTags = tags.filter(tag => tag.status === 'new');
    const completedTags = tags.filter(tag => tag.status !== 'new');

    const itemCodeDisplay = currentScannedUrl && currentScannedItemCode === itemCode
      ? `<a href="${currentScannedUrl}" target="_blank">${itemCode}</a>`
      : itemCode;

    let content = `
      <div class="em-task-list-title">Задачи для товара: ${itemCodeDisplay}</div>
      ${currentProductName ? `<div class="em-task-list-product-name">${currentProductName}</div>` : ''}
    `;

    if (pendingTags.length > 0) {
      content += `<div class="em-task-section-label em-task-section-label--pending">Ожидающие</div>`;
      pendingTags.forEach(tag => {
        const date = new Date(tag.created_at).toLocaleString('ru-RU');
        const hasComment = !!tag.comment;
        content += `
          <div class="em-task-card em-task-card--pending" data-task-id="${tag.id}">
            <div class="em-task-card-header">
              <div class="em-task-card-code">Код: ${tag.item_code}</div>
              <div class="em-task-badge em-task-badge--new">Новая</div>
            </div>
            <div class="em-task-card-meta">
              Тип ошибки: ${tag.error_type_display || 'Не указан'}<br>
              Дата: ${date}
            </div>
            <div class="em-task-comment-block" id="comment-${tag.id}">
              ${hasComment
                ? `<span class="em-task-comment-text">"${tag.comment}"</span>`
                : `<span class="em-task-comment-text" style="opacity:0.5;">Комментарий не указан</span>`
              }
              <button class="em-edit-comment-btn" data-task-id="${tag.id}">
                ${hasComment ? '✏️ Изменить' : '✏️ Добавить'}
              </button>
            </div>
          </div>
        `;
      });
    }

    if (completedTags.length > 0) {
      content += `<div class="em-task-section-label em-task-section-label--done">История</div>`;
      completedTags.forEach(tag => {
        const date = new Date(tag.created_at).toLocaleString('ru-RU');
        content += `
          <div class="em-task-card em-task-card--done">
            <div class="em-task-card-header">
              <div class="em-task-card-code">Код: ${tag.item_code}</div>
              <div class="em-task-badge em-task-badge--done">Выполнена</div>
            </div>
            <div class="em-task-card-meta">
              Тип ошибки: ${tag.error_type_display || 'Не указан'}<br>
              Дата: ${date}
            </div>
            ${tag.comment ? `
              <div class="em-task-comment-block">
                <span class="em-task-comment-text">"${tag.comment}"</span>
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    if (tags.length === 0) {
      content += `<div class="em-empty-state">Задач для данного товара не найдено</div>`;
    }

    section.innerHTML = content;

    section.querySelectorAll('.em-edit-comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.getAttribute('data-task-id');
        showEditCommentModal(taskId);
      });
    });
  };

  const createModal = (titleText, bodyHTML) => {
    const overlay = document.createElement('div');
    overlay.className = 'em-modal-overlay';
    overlay.innerHTML = `
      <div class="em-modal">
        <div class="em-modal-title">${titleText}</div>
        ${bodyHTML}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  };

  const showEditCommentModal = (taskId) => {
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    const commentBlock = document.getElementById(`comment-${taskId}`);
    const commentTextEl = commentBlock.querySelector('.em-task-comment-text');
    const isPlaceholder = commentTextEl.style.opacity === '0.5';
    const currentComment = isPlaceholder ? '' : commentTextEl.textContent.replace(/^"|"$/g, '').trim();

    const overlay = createModal(
      isPlaceholder ? 'Добавить комментарий' : 'Редактировать комментарий',
      `
        <div class="em-form-field">
          <label class="em-form-label">Комментарий</label>
          <textarea id="editCommentInput" class="em-form-textarea" placeholder="Опишите подробно...">${currentComment}</textarea>
          <div id="editCommentValidation" class="em-validation-msg">Введите комментарий</div>
        </div>
        <div class="em-modal-actions">
          <button class="em-btn--cancel" id="cancelEditComment">Отмена</button>
          <button class="em-btn--submit" id="submitEditComment">Сохранить</button>
        </div>
      `
    );

    overlay.querySelector('#cancelEditComment').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#submitEditComment').addEventListener('click', async () => {
      const comment = overlay.querySelector('#editCommentInput').value.trim();
      const validation = overlay.querySelector('#editCommentValidation');

      if (!comment) {
        validation.style.display = 'block';
        return;
      }

      try {
        const result = await apiCall("/api/update-price-tag-comment", { taskId, comment });

        if (result.success) {
          commentTextEl.textContent = `"${comment}"`;
          commentTextEl.style.opacity = '';
          const editBtn = commentBlock.querySelector('.em-edit-comment-btn');
          if (editBtn) editBtn.textContent = '✏️ Изменить';
          overlay.remove();
          showToast('Комментарий обновлён');
        }
      } catch (err) {
        showToast('Ошибка: ' + err.message, 'error');
      }
    });

    setTimeout(() => overlay.querySelector('#editCommentInput').focus(), 100);
  };

  const showManualCodeModal = () => {
    const overlay = createModal(
      'Ввод кода товара',
      `
        <div class="em-form-field">
          <label class="em-form-label">Код товара</label>
          <input type="text" id="manualCodeInput" class="em-form-input" placeholder="Введите код (цифры)" maxlength="9" inputmode="numeric">
          <div id="manualCodeValidation" class="em-validation-msg">Введите код товара (только цифры)</div>
        </div>
        <div class="em-modal-actions">
          <button class="em-btn--cancel" id="cancelManualCode">Отмена</button>
          <button class="em-btn--submit" id="submitManualCode">Найти</button>
        </div>
      `
    );

    const codeInput = overlay.querySelector('#manualCodeInput');
    const validation = overlay.querySelector('#manualCodeValidation');

    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value.length > 0) validation.style.display = 'none';
    });

    overlay.querySelector('#cancelManualCode').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#submitManualCode').addEventListener('click', async () => {
      const code = codeInput.value.trim();

      if (!code || code.length === 0) {
        validation.textContent = 'Введите код товара';
        validation.style.display = 'block';
        return;
      }

      if (!/^\d+$/.test(code)) {
        validation.textContent = 'Код должен содержать только цифры';
        validation.style.display = 'block';
        return;
      }

      const paddedCode = code.padStart(9, '0');
      currentScannedItemCode = paddedCode;
      currentScannedUrl = null;
      currentProductName = null;

      if (!scannedCodes.some(item => item.code === paddedCode)) {
        scannedCodes.unshift({ code: paddedCode, url: null, timestamp: new Date().toLocaleString('ru-RU') });
      }

      document.getElementById('newTaskBtn').style.display = 'flex';
      overlay.remove();
      await loadAndRenderPriceTags(paddedCode);
    });

    setTimeout(() => codeInput.focus(), 100);
  };

  const showNewTaskModal = async () => {
    if (!currentScannedItemCode) {
      alert('Сначала отсканируйте товар');
      return;
    }

    const existingTags = await loadPriceTags(currentScannedItemCode);
    const normalize = (s) => (s || '').toString().toLowerCase().trim();
    const newTasks = existingTags.filter(tag => tag.status === 'new');
    const existingVariants = new Set(
      newTasks.flatMap(tag => [tag.error_type, tag.error_type_display]).map(normalize).filter(Boolean)
    );

    const overlay = createModal(
      'Новая задача',
      `
        <div class="em-form-field">
          <label class="em-form-label">Код товара</label>
          <input type="text" class="em-form-input" value="${currentScannedItemCode}" readonly>
          ${currentProductName ? `<div class="em-product-inline">${currentProductName}</div>` : ''}
        </div>

        <div class="em-form-field">
          <label class="em-form-label">Категория</label>
          <select id="taskCategory" class="em-form-select">
            <option value="">Выберите категорию</option>
            <option value="КБТ">КБТ</option>
            <option value="МБТ">МБТ</option>
            <option value="Мебель">Мебель</option>
            <option value="Компьютерка">Компьютерка</option>
          </select>
          <div id="categoryValidation" class="em-validation-msg">Выберите категорию</div>
        </div>

        <div class="em-form-field">
          <label class="em-form-label">Тип ошибки</label>
          <div class="em-error-type-grid">
            ${ERROR_TYPES.map(errorType => {
              const isDisabled = existingVariants.has(normalize(errorType.value)) || existingVariants.has(normalize(errorType.label));
              return `
                <div class="em-error-type-option ${isDisabled ? 'em-error-type-option--disabled' : ''}" data-error-type="${errorType.value}">
                  <input type="checkbox" id="error_${errorType.value}" class="em-error-type-checkbox" value="${errorType.value}" ${isDisabled ? 'disabled' : ''}>
                  <label for="error_${errorType.value}" class="em-error-type-label">
                    ${errorType.label}${isDisabled ? ' <span style="opacity:0.6;font-size:12px;">(уже есть)</span>' : ''}
                  </label>
                </div>
              `;
            }).join('')}
          </div>
          <div id="errorTypeValidation" class="em-validation-msg">Выберите тип ошибки</div>
        </div>

        <div class="em-form-field">
          <label class="em-form-label">Комментарий</label>
          <textarea id="taskComment" class="em-form-textarea" placeholder="Опишите проблему подробно..."></textarea>
          <div id="commentValidation" class="em-validation-msg">Введите комментарий</div>
        </div>

        <div class="em-modal-actions">
          <button class="em-btn--cancel" id="cancelNewTask">Отмена</button>
          <button class="em-btn--submit" id="submitNewTask">Отправить</button>
        </div>
      `
    );

    overlay.querySelectorAll('.em-error-type-option').forEach(option => {
      if (option.classList.contains('em-error-type-option--disabled')) return;
      const checkbox = option.querySelector('input[type="checkbox"]');
      option.addEventListener('click', (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        option.classList.toggle('selected', checkbox.checked);
        const anyChecked = overlay.querySelectorAll('.em-error-type-checkbox:checked').length > 0;
        if (anyChecked) overlay.querySelector('#errorTypeValidation').style.display = 'none';
      });
    });

    overlay.querySelector('#cancelNewTask').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#submitNewTask').addEventListener('click', async (ev) => {
      const submitBtn = ev.target;
      const selectedErrorTypes = Array.from(overlay.querySelectorAll('.em-error-type-checkbox:checked')).map(cb => cb.value);
      const comment = overlay.querySelector('#taskComment').value.trim();
      const category = overlay.querySelector('#taskCategory').value.trim();

      let hasError = false;

      if (selectedErrorTypes.length === 0) {
        overlay.querySelector('#errorTypeValidation').style.display = 'block';
        hasError = true;
      }
      if (!category) {
        overlay.querySelector('#categoryValidation').style.display = 'block';
        hasError = true;
      }
      if (!comment) {
        overlay.querySelector('#commentValidation').style.display = 'block';
        hasError = true;
      }
      if (hasError) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        const result = await createPriceTagTask(currentScannedItemCode, selectedErrorTypes, comment, category);
        overlay.remove();
        showToast(`Создано задач: ${result.createdTasks ? result.createdTasks.length : 0}`);
        await loadAndRenderPriceTags(currentScannedItemCode);
      } catch (err) {
        showToast('Ошибка: ' + (err.message || err), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
      }
    });
  };

  const loadAndRenderMessages = async () => {
    try {
      const result = await apiCall("/api/my-messages", { groups: userData?.groups || [] });
      allMessages = result.messages;
      renderMessages(result.messages);
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
      document.getElementById("tabPanelMessages").innerHTML = '<div class="em-empty-state">Не удалось загрузить сообщения</div>';
    }
  };

  const renderMessages = (msgs) => {
    const container = document.getElementById("tabPanelMessages");
    if (!msgs.length) {
      container.innerHTML = '<div class="em-empty-state">Сообщений нет</div>';
      return;
    }

    const uniqueTypes = [...new Set(allMessages.map(m => m.type).filter(Boolean))];
    const filterDropdown = `
      <div class="em-msg-filter-bar">
        <label class="em-msg-filter-label">Фильтр по типу</label>
        <select id="msgFilter">
          <option value="">Все сообщения</option>
          ${uniqueTypes.map(t => `<option value="${t}">${typeMapping[t] || t}</option>`).join("")}
        </select>
      </div>
    `;

    container.innerHTML = `
      ${filterDropdown}
      <div class="em-msg-list">
        ${msgs.map((m, idx) => {
          const date = new Date(m.timestamp).toLocaleString("ru-RU");
          const photos = Array.isArray(m.photo_urls)
            ? m.photo_urls.map(u => `<img class="em-msg-photo-thumb" src="${u}" data-full="${u}">`).join("")
            : "";
          const replied = !!m.replied;
          const statusIcon = replied
            ? `<span class="em-msg-status-icon em-msg-status-icon--read">✓</span>`
            : `<span class="em-msg-status-icon em-msg-status-icon--unread">✗</span>`;
          return `
            <div class="em-msg-card" data-idx="${idx}">
              <div class="em-msg-card-header">
                <div class="em-msg-card-title">
                  ${m.title || typeMapping[m.type] || m.type || "Сообщение"} ${statusIcon}
                </div>
                <div class="em-msg-card-date">${date}</div>
              </div>
              <div class="em-msg-card-body">
                <div>${m.body || ""}</div>
                ${photos ? `<div class="em-msg-photo-grid">${photos}</div>` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.querySelectorAll(".em-msg-card-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.closest(".em-msg-card").classList.toggle("expanded");
      });
    });

    container.querySelectorAll(".em-msg-photo-thumb").forEach((img) => {
      img.addEventListener("click", () => {
        const overlay = document.createElement("div");
        overlay.className = "em-photo-viewer-overlay";
        overlay.innerHTML = `<img src="${img.getAttribute('data-full')}" alt="Photo">`;
        overlay.addEventListener("click", () => overlay.remove());
        document.body.appendChild(overlay);
      });
    });

    const filterSelect = container.querySelector("#msgFilter");
    if (filterSelect) {
      filterSelect.addEventListener("change", (e) => {
        const selectedType = e.target.value;
        const filtered = selectedType ? allMessages.filter(m => m.type === selectedType) : allMessages;
        renderMessages(filtered);
      });
    }
  };

  const switchTab = (tabId) => {
    document.querySelectorAll(".em-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`tab${tabId}`).classList.add("active");
    document.querySelectorAll(".em-tab-panel").forEach(panel => panel.style.display = "none");
    document.getElementById(`tabPanel${tabId}`).style.display = "block";

    if (tabId === "Messages") loadAndRenderMessages();
  };

  document.getElementById("tabMessages").addEventListener("click", () => switchTab("Messages"));
  document.getElementById("tabInstructions").addEventListener("click", () => switchTab("Instructions"));
  document.getElementById("qrScannerBtn").addEventListener("click", initQRScanner);
  document.getElementById("manualCodeBtn").addEventListener("click", showManualCodeModal);
  document.getElementById("newTaskBtn").addEventListener("click", showNewTaskModal);

  loadAndRenderMessages();

  return {
    cleanup: async () => {
      if (isScanning) await stopQRScanner();
    }
  };
}