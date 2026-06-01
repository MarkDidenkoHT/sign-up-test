export async function loadModule(container, { chatId, userData }) {
  if (!window.QRCode) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  container.innerHTML = `     
    <div class="qr-module">
      <div class="qr-layout">
        <div class="qr-generator-section">
          <div class="qr-card">
            <div class="qr-input-group">
              <label class="qr-label">Название QR кода</label>
              <input type="text" id="qrNameInput" class="qr-input" placeholder="Например: Мой сайт, Визитка, Контакты" value="">
            </div>

            <div class="qr-input-group">
              <label class="qr-label">Текст или URL</label>
              <input type="text" id="qrInput" class="qr-input" placeholder="Введите URL или текст" value="">
            </div>

            <div class="qr-settings-grid">
              <div class="qr-setting">
                <label class="qr-label">Формат</label>
                <select id="formatSelect" class="qr-select">
                  <option value="png">PNG</option>
                  <option value="jpg">JPEG</option>
                </select>
              </div>

              <div class="qr-setting">
                <label class="qr-label">Размер (px)</label>
                <select id="sizeSelect" class="qr-select">
                  <option value="200">200x200</option>
                  <option value="300" selected>300x300</option>
                  <option value="400">400x400</option>
                  <option value="500">500x500</option>
                  <option value="600">600x600</option>
                  <option value="800">800x800</option>
                  <option value="1000">1000x1000</option>
                </select>
              </div>

              <div class="qr-setting">
                <label class="qr-label">Цвет фона</label>
                <input type="color" id="bgColorInput" class="qr-color" value="#FFFFFF">
              </div>

              <div class="qr-setting">
                <label class="qr-label">Цвет точек</label>
                <input type="color" id="dotColorInput" class="qr-color" value="#000000">
              </div>
            </div>

            <div class="qr-buttons-row">
              <button id="generateQRBtn" class="qr-btn qr-btn-generate">Сгенерировать</button>
              <button id="downloadBtn" class="qr-btn qr-btn-download" disabled>Скачать</button>
            </div>
            
            <div class="qr-code-container">
              <div id="qrPlaceholder" class="qr-placeholder">QR код появится здесь</div>
              <div class="qr-display-area" id="qrDisplayArea">
                <canvas id="qrCanvas" class="qr-canvas"></canvas>
                <div class="qr-zoom-controls" id="qrZoomControls" style="display: none;">
                  <button id="zoomOutBtn" class="qr-zoom-btn" title="Уменьшить">−</button>
                  <span id="zoomLevel" class="qr-zoom-level">100%</span>
                  <button id="zoomInBtn" class="qr-zoom-btn" title="Увеличить">+</button>
                  <button id="zoomResetBtn" class="qr-zoom-btn" title="Сбросить масштаб">↺</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="qr-history-section">
          <div class="qr-history-header">
            <span class="qr-history-title">Сохранённые QR коды</span>
            <div class="qr-history-controls">
              <input type="text" id="filterNameInput" class="qr-filter-input" placeholder="Фильтр по названию...">
              <button id="refreshHistoryBtn" class="qr-btn-icon" title="Обновить">↻</button>
            </div>
          </div>
          <div id="qrHistoryList" class="qr-history-list">
            <div class="qr-history-empty">Загрузка...</div>
          </div>
        </div>
      </div>
      <div id="qrStatus" class="qr-status"></div>
    </div>

    <div id="qrModal" class="qr-modal">
      <div class="qr-modal-content">
        <span class="qr-modal-close">&times;</span>
        <div class="qr-modal-body">
          <img id="qrModalImage" class="qr-modal-image" alt="QR Code">
          <div class="qr-modal-zoom-controls">
            <button id="modalZoomOutBtn" class="qr-zoom-btn">−</button>
            <span id="modalZoomLevel" class="qr-zoom-level">100%</span>
            <button id="modalZoomInBtn" class="qr-zoom-btn">+</button>
            <button id="modalZoomResetBtn" class="qr-zoom-btn">↺</button>
          </div>
          <div class="qr-modal-info">
            <div class="qr-modal-name" id="qrModalName"></div>
            <div class="qr-modal-url" id="qrModalUrl"></div>
            <div class="qr-modal-date" id="qrModalDate"></div>
          </div>
          <div class="qr-modal-actions">
            <a id="modalDownloadLink" class="qr-btn qr-btn-download" download>Скачать</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const qrNameInput = document.getElementById('qrNameInput');
  const qrInput = document.getElementById('qrInput');
  const generateBtn = document.getElementById('generateQRBtn');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrPlaceholder = document.getElementById('qrPlaceholder');
  const downloadBtn = document.getElementById('downloadBtn');
  const qrStatus = document.getElementById('qrStatus');
  const formatSelect = document.getElementById('formatSelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const bgColorInput = document.getElementById('bgColorInput');
  const dotColorInput = document.getElementById('dotColorInput');
  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const qrHistoryList = document.getElementById('qrHistoryList');
  const qrZoomControls = document.getElementById('qrZoomControls');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const filterNameInput = document.getElementById('filterNameInput');

  const modal = document.getElementById('qrModal');
  const modalImage = document.getElementById('qrModalImage');
  const modalClose = document.querySelector('.qr-modal-close');
  const modalZoomInBtn = document.getElementById('modalZoomInBtn');
  const modalZoomOutBtn = document.getElementById('modalZoomOutBtn');
  const modalZoomResetBtn = document.getElementById('modalZoomResetBtn');
  const modalZoomLevel = document.getElementById('modalZoomLevel');
  const modalDownloadLink = document.getElementById('modalDownloadLink');
  const qrModalName = document.getElementById('qrModalName');
  const qrModalUrl = document.getElementById('qrModalUrl');
  const qrModalDate = document.getElementById('qrModalDate');

  let currentQRCodeBlob = null;
  let currentQRCodeDataUrl = null;
  let currentFormat = 'png';
  let currentSize = 300;
  let currentEncodedValue = '';
  let currentQRName = '';
  let currentZoom = 1;
  let allQRCodes = [];
  let modalCurrentZoom = 1;
  let modalCurrentImageUrl = '';
  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;

  function updateZoomDisplay() {
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    }
    if (qrCanvas) {
      const baseSize = currentSize;
      qrCanvas.style.width = `${baseSize * currentZoom}px`;
      qrCanvas.style.height = `${baseSize * currentZoom}px`;
    }
  }

  function updateModalZoomDisplay() {
    if (modalZoomLevel) {
      modalZoomLevel.textContent = `${Math.round(modalCurrentZoom * 100)}%`;
    }
    if (modalImage) {
      modalImage.style.transform = `scale(${modalCurrentZoom})`;
    }
  }

  function resetZoom() {
    currentZoom = 1;
    updateZoomDisplay();
  }

  function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
      currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
      updateZoomDisplay();
    }
  }

  function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
      currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
      updateZoomDisplay();
    }
  }

  function modalResetZoom() {
    modalCurrentZoom = 1;
    updateModalZoomDisplay();
  }

  function modalZoomIn() {
    if (modalCurrentZoom < MAX_ZOOM) {
      modalCurrentZoom = Math.min(MAX_ZOOM, modalCurrentZoom + ZOOM_STEP);
      updateModalZoomDisplay();
    }
  }

  function modalZoomOut() {
    if (modalCurrentZoom > MIN_ZOOM) {
      modalCurrentZoom = Math.max(MIN_ZOOM, modalCurrentZoom - ZOOM_STEP);
      updateModalZoomDisplay();
    }
  }

  function showZoomControls() {
    if (qrZoomControls) {
      qrZoomControls.style.display = 'flex';
    }
  }

  function hideZoomControls() {
    if (qrZoomControls) {
      qrZoomControls.style.display = 'none';
    }
  }

  function showStatus(message, type = 'success') {
    qrStatus.textContent = message;
    qrStatus.className = `qr-status ${type}`;
    qrStatus.style.display = 'block';
    setTimeout(() => { 
      qrStatus.style.display = 'none'; 
    }, 3000);
  }

  function openModal(imageUrl, qrName, qrUrl, createdAt) {
    modalImage.src = imageUrl;
    modalCurrentImageUrl = imageUrl;
    qrModalName.textContent = qrName || 'Без названия';
    qrModalUrl.textContent = qrUrl || '';
    const date = new Date(createdAt).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    qrModalDate.textContent = date;
    modalDownloadLink.href = imageUrl;
    const ext = imageUrl.split('.').pop().split('?')[0];
    const filename = (qrName || 'qr-code').replace(/[^a-zA-Z0-9а-яА-Я-]/g, '-').substring(0, 30);
    modalDownloadLink.download = `${filename}.${ext}`;
    modalCurrentZoom = 1;
    updateModalZoomDisplay();
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    modalCurrentZoom = 1;
    updateModalZoomDisplay();
  }

  function filterHistory() {
    const filterText = filterNameInput.value.toLowerCase().trim();
    if (!allQRCodes || allQRCodes.length === 0) {
      qrHistoryList.innerHTML = '<div class="qr-history-empty">Нет сохранённых QR кодов</div>';
      return;
    }

    const filtered = filterText === '' ? allQRCodes : allQRCodes.filter(code => 
      code.qr_description && code.qr_description.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
      qrHistoryList.innerHTML = '<div class="qr-history-empty">Не найдено QR кодов с таким названием</div>';
      return;
    }

    renderHistoryList(filtered);
  }

  function renderHistoryList(codes) {
    qrHistoryList.innerHTML = '';
    for (const code of codes) {
      const item = document.createElement('div');
      item.className = 'qr-history-item';
      const displayName = code.qr_description || 'Без названия';
      const displayUrl = code.qr_code_url || '';
      item.innerHTML = `
        <img class="qr-history-thumb" src="${code.qr_code_image_url}" alt="QR" loading="lazy">
        <div class="qr-history-info">
          <div class="qr-history-name">${escapeHtml(displayName)}</div>
          <div class="qr-history-url">${escapeHtml(displayUrl.substring(0, 50))}${displayUrl.length > 50 ? '...' : ''}</div>
        </div>
        <div class="qr-history-actions">
          <button class="qr-btn-sm qr-btn-view" data-image="${code.qr_code_image_url}" data-name="${escapeHtml(displayName)}" data-url="${escapeHtml(displayUrl)}" data-date="${code.created_at}" title="Просмотреть">👁</button>
          <a class="qr-btn-sm qr-btn-dl" href="${code.qr_code_image_url}" download="${displayName.replace(/[^a-zA-Z0-9а-яА-Я-]/g, '-')}.png" target="_blank">↓</a>
          <button class="qr-btn-sm qr-btn-edit" data-id="${code.id}" data-name="${escapeHtml(displayName)}" title="Редактировать название">✎</button>
          <button class="qr-btn-sm qr-btn-del" data-id="${code.id}" title="Удалить">✕</button>
        </div>
      `;
      qrHistoryList.appendChild(item);
    }

    qrHistoryList.querySelectorAll('.qr-btn-del').forEach(btn => {
      btn.addEventListener('click', () => deleteCode(btn.dataset.id));
    });

    qrHistoryList.querySelectorAll('.qr-btn-view').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.image, btn.dataset.name, btn.dataset.url, btn.dataset.date));
    });

    qrHistoryList.querySelectorAll('.qr-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editCodeName(btn.dataset.id, btn.dataset.name));
    });
  }

  async function loadHistory() {
    qrHistoryList.innerHTML = '<div class="qr-history-empty">Загрузка...</div>';
    try {
      const res = await fetch('/api/qr-codes', {
        headers: { 'X-User-ID': String(chatId) }
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const { codes } = await res.json();

      allQRCodes = codes || [];

      if (!allQRCodes || allQRCodes.length === 0) {
        qrHistoryList.innerHTML = '<div class="qr-history-empty">Нет сохранённых QR кодов</div>';
        return;
      }

      renderHistoryList(allQRCodes);
    } catch (err) {
      qrHistoryList.innerHTML = '<div class="qr-history-empty">Ошибка загрузки истории</div>';
    }
  }

  async function editCodeName(id, currentName) {
    const newName = prompt('Введите новое название для QR кода:', currentName);
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (trimmedName === '') {
      showStatus('Название не может быть пустым', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/qr-codes/${id}`, {
        method: 'PATCH',
        headers: { 
          'X-User-ID': String(chatId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qr_description: trimmedName })
      });
      if (!res.ok) throw new Error('Ошибка обновления');
      showStatus('Название успешно обновлено', 'success');
      loadHistory();
    } catch (err) {
      showStatus('Ошибка при обновлении названия', 'error');
    }
  }

  async function deleteCode(id) {
    if (!confirm('Вы уверены, что хотите удалить этот QR код?')) return;
    
    try {
      const res = await fetch(`/api/qr-codes/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': String(chatId) }
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      showStatus('QR код удалён', 'success');
      loadHistory();
    } catch (err) {
      showStatus('Ошибка при удалении', 'error');
    }
  }

  async function saveQRToServer(blob, encodedValue, qrName, format) {
    try {
      const ext = format === 'jpg' ? 'jpg' : 'png';
      const formData = new FormData();
      formData.append('file', blob, `qr-code.${ext}`);
      formData.append('qr_url', encodedValue);
      formData.append('qr_description', qrName || 'Без названия');

      const res = await fetch('/api/qr-codes/upload', {
        method: 'POST',
        headers: { 'X-User-ID': String(chatId) },
        body: formData
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      showStatus('QR код успешно сохранён', 'success');
      await loadHistory();
    } catch (err) {
      console.error('[QR] Save to server failed:', err);
      showStatus('Ошибка сохранения QR кода: ' + err.message, 'error');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function generateQRCode() {
    const value = qrInput.value.trim();
    const qrName = qrNameInput.value.trim();
    
    if (!value) {
      showStatus('Введите URL или текст для QR кода', 'error');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Генерация...';
    qrPlaceholder.textContent = 'Генерация QR кода...';
    qrPlaceholder.classList.add('qr-loading');

    setTimeout(async () => {
      try {
        currentFormat = formatSelect.value;
        currentSize = parseInt(sizeSelect.value);
        currentEncodedValue = value;
        currentQRName = qrName || 'Без названия';
        const bgColor = bgColorInput.value;
        const dotColor = dotColorInput.value;

        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        
        const cells = qr.getModuleCount();
        const cellSize = currentSize / cells;
        
        qrCanvas.width = currentSize;
        qrCanvas.height = currentSize;
        
        const ctx = qrCanvas.getContext('2d');
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, currentSize, currentSize);
        
        ctx.fillStyle = dotColor;
        
        for (let row = 0; row < cells; row++) {
          for (let col = 0; col < cells; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
          }
        }
        
        if (currentFormat === 'png') {
          currentQRCodeDataUrl = qrCanvas.toDataURL('image/png');
          const blob = await new Promise(resolve => qrCanvas.toBlob(resolve, 'image/png'));
          currentQRCodeBlob = blob;
        } else {
          currentQRCodeDataUrl = qrCanvas.toDataURL('image/jpeg', 1.0);
          const blob = await new Promise(resolve => qrCanvas.toBlob(resolve, 'image/jpeg', 1.0));
          currentQRCodeBlob = blob;
        }
        
        qrPlaceholder.style.display = 'none';
        qrCanvas.style.display = 'block';
        qrCanvas.style.width = `${currentSize}px`;
        qrCanvas.style.height = `${currentSize}px`;
        currentZoom = 1;
        updateZoomDisplay();
        showZoomControls();
        
        downloadBtn.disabled = false;
        showStatus('QR код успешно сгенерирован', 'success');

        if (currentQRCodeBlob) {
          saveQRToServer(currentQRCodeBlob, currentEncodedValue, currentQRName, currentFormat);
        }
        
      } catch (error) {
        console.error('QR generation error:', error);
        showStatus('Ошибка при генерации QR кода', 'error');
        qrPlaceholder.textContent = 'QR код появится здесь';
        qrCanvas.style.display = 'none';
        qrPlaceholder.style.display = 'flex';
        hideZoomControls();
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Сгенерировать';
        qrPlaceholder.classList.remove('qr-loading');
      }
    }, 10);
  }

  function downloadQRCode() {
    if (!currentQRCodeBlob && !currentQRCodeDataUrl) {
      showStatus('Сначала сгенерируйте QR код', 'error');
      return;
    }

    try {
      const qrName = qrNameInput.value.trim();
      let filename = qrName ? qrName.replace(/[^a-zA-Z0-9а-яА-Я-]/g, '-').substring(0, 30) : 'qr-code';
      
      const extension = currentFormat === 'png' ? 'png' : 'jpg';
      const fullFilename = `${filename}.${extension}`;
      
      if (currentQRCodeBlob) {
        const url = URL.createObjectURL(currentQRCodeBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fullFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const link = document.createElement('a');
        link.href = currentQRCodeDataUrl;
        link.download = fullFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      showStatus('QR код успешно скачан', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showStatus('Ошибка при скачивании QR кода', 'error');
    }
  }

  generateBtn.addEventListener('click', generateQRCode);
  downloadBtn.addEventListener('click', downloadQRCode);
  refreshHistoryBtn.addEventListener('click', loadHistory);
  filterNameInput.addEventListener('input', filterHistory);
  
  if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetZoom);

  if (modalZoomInBtn) modalZoomInBtn.addEventListener('click', modalZoomIn);
  if (modalZoomOutBtn) modalZoomOutBtn.addEventListener('click', modalZoomOut);
  if (modalZoomResetBtn) modalZoomResetBtn.addEventListener('click', modalResetZoom);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });
  
  qrInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateQRCode();
    }
  });

  qrNameInput.value = '';
  qrInput.value = '';
  qrNameInput.focus();

  loadHistory();

  return {
    cleanup: () => {}
  };
}