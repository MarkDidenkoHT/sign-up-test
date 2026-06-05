export async function loadModule(container) {

  const state = {
    requests: [],
    years: [],
    selectedYearFrom: null,
    selectedYearTo: null,
    currentFilter: '',
    matrix: {},
    userList: [],
    userTotals: {},
    settings: {
      showOnlyMissingComments: false,
      expandedSettings: ['displayControls']
    }
  };

  const elements = {
    container: null,
    yearFromSelect: null,
    yearToSelect: null,
    nameInput: null,
    loadBtn: null,
    updateBtn: null,
    csvInput: null,
    matrixContainer: null,
    modal: null,
    modalContent: null,
    requestsList: null,
    correctionManager: null,
    settingsContainer: null
  };

  container.innerHTML = `
  <div class="vacation-module-wrapper">
    <div class="vacation-module-main">
      <div class="vacation-module-controls-bar">
        <div class="vacation-module-range-picker">
          <span class="vacation-module-range-label">Период</span>
          <select id="yearFromSelect">
            <option value="">С года</option>
          </select>
          <span class="vacation-module-range-sep">—</span>
          <select id="yearToSelect">
            <option value="">По год</option>
          </select>
        </div>
        <input type="text" id="nameInput" placeholder="Фильтр по имени...">
        <button id="loadBtn">Загрузить</button>
        <button id="updateBtn" class="vacation-module-btn-update">Обновить</button>
        <input type="file" id="csvFileInput" accept=".csv" style="display:none;">
      </div>
      
      <div class="vacation-module-matrix-container">
        <div id="loadingIndicator" class="vacation-module-loading">
          <div class="vacation-module-loader-spinner"></div>Загрузка данных...
        </div>
        <table id="matrixTable" class="vacation-module-matrix-table" style="display: none;">
          <thead id="matrixHead"></thead>
          <tbody id="matrixBody"></tbody>
        </table>
      </div>
    </div>

    <div class="vacation-module-sidebar">
      <h2 class="vacation-module-sidebar-title">Настройки</h2>
      <div id="vacationSettings" class="vacation-module-settings-container"></div>
    </div>

    <div id="modal" class="vacation-module-modal-overlay">
      <div class="vacation-module-modal-content">
        <button class="vacation-module-close-modal">&times;</button>
        <div class="vacation-module-modal-header">
          <div class="vacation-module-modal-title" id="modalTitle"></div>
          <div class="vacation-module-modal-subtitle" id="modalSubtitle"></div>
        </div>
        <div id="requestsList" class="vacation-module-requests-list"></div>
        <div class="vacation-module-modal-actions">
          <button class="vacation-module-btn vacation-module-btn-secondary" id="modalClose">Закрыть</button>
          <button class="vacation-module-btn vacation-module-btn-primary" id="modalSave">Сохранить</button>
        </div>
      </div>
    </div>

    <div id="correctionModal" class="vacation-module-modal-overlay">
      <div class="vacation-module-modal-content vacation-module-correction-modal">
        <button class="vacation-module-close-modal">&times;</button>
        <div class="vacation-module-modal-header">
          <div class="vacation-module-modal-title" id="correctionUserName"></div>
          <div class="vacation-module-modal-subtitle">Корректировка доступных дней отпуска</div>
        </div>
        <input type="number" step="0.01" id="correctionInput" class="vacation-module-correction-input" placeholder="Введите количество дней">
        <div class="vacation-module-modal-actions">
          <button class="vacation-module-btn vacation-module-btn-secondary" id="correctionCancel">Отмена</button>
          <button class="vacation-module-btn vacation-module-btn-primary" id="correctionSave">Сохранить</button>
        </div>
      </div>
    </div>

    <div id="csvPreviewModal" class="vacation-module-modal-overlay">
      <div class="vacation-module-modal-content vacation-module-csv-modal">
        <button class="vacation-module-close-modal" id="csvPreviewClose">&times;</button>
        <div class="vacation-module-modal-header">
          <div class="vacation-module-modal-title">Предпросмотр изменений</div>
          <div class="vacation-module-modal-subtitle" id="csvPreviewSubtitle"></div>
        </div>
        <div id="csvPreviewError" class="vacation-module-csv-error" style="display:none;"></div>
        <div id="csvPreviewTableWrap" class="vacation-module-csv-table-wrap">
          <table class="vacation-module-csv-preview-table" id="csvPreviewTable">
            <thead>
              <tr>
                <th>Табельный №</th>
                <th>Сотрудник</th>
                <th>Текущее значение</th>
                <th>Новое значение</th>
              </tr>
            </thead>
            <tbody id="csvPreviewBody"></tbody>
          </table>
        </div>
        <div class="vacation-module-modal-actions">
          <button class="vacation-module-btn vacation-module-btn-secondary" id="csvPreviewCancel">Отмена</button>
          <button class="vacation-module-btn vacation-module-btn-primary" id="csvPreviewApply">Применить</button>
        </div>
      </div>
    </div>
  </div>
`;

  elements.container = container.querySelector('.vacation-module-wrapper');
  elements.yearFromSelect = container.querySelector('#yearFromSelect');
  elements.yearToSelect = container.querySelector('#yearToSelect');
  elements.nameInput = container.querySelector('#nameInput');
  elements.loadBtn = container.querySelector('#loadBtn');
  elements.updateBtn = container.querySelector('#updateBtn');
  elements.csvInput = container.querySelector('#csvFileInput');
  elements.matrixContainer = container.querySelector('.vacation-module-matrix-container');
  elements.modal = container.querySelector('#modal');
  elements.modalContent = container.querySelector('.vacation-module-modal-content');
  elements.requestsList = container.querySelector('#requestsList');
  elements.settingsContainer = container.querySelector('#vacationSettings');

  function loadUserSettings() {
    const saved = localStorage.getItem('vacation-module-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.settings = { ...state.settings, ...parsed };
    }
    renderSettings();
  }

  function saveUserSettings() {
    localStorage.setItem('vacation-module-settings', JSON.stringify(state.settings));
  }

  function renderSettings() {
    const settingsHtml = `
      <div class="vacation-module-settings-block">
        <div class="vacation-module-settings-header" data-setting="displayControls">
          <h3>Режимы отображения</h3>
          <svg class="vacation-module-expand-icon ${state.settings.expandedSettings.includes('displayControls') ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="vacation-module-settings-content ${state.settings.expandedSettings.includes('displayControls') ? 'expanded' : ''}">
          <div class="vacation-module-setting-item">
            <span class="vacation-module-setting-label">
              Только пользователи с "Не проведено"
            </span>
            <label class="vacation-module-toggle">
              <input type="checkbox" 
                     ${state.settings.showOnlyMissingComments ? 'checked' : ''}
                     data-setting="showOnlyMissingComments">
              <span class="vacation-module-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    elements.settingsContainer.innerHTML = settingsHtml;

    elements.settingsContainer.querySelector('.vacation-module-settings-header').addEventListener('click', () => {
      const content = document.querySelector('.vacation-module-settings-content');
      const icon = document.querySelector('.vacation-module-expand-icon');

      content.classList.toggle('expanded');
      icon.classList.toggle('expanded');

      const index = state.settings.expandedSettings.indexOf('displayControls');
      if (content.classList.contains('expanded')) {
        if (index === -1) state.settings.expandedSettings.push('displayControls');
      } else {
        if (index > -1) state.settings.expandedSettings.splice(index, 1);
      }

      saveUserSettings();
    });

    elements.settingsContainer.querySelector('.vacation-module-toggle input').addEventListener('change', (e) => {
      state.settings.showOnlyMissingComments = e.target.checked;
      saveUserSettings();
      renderMatrix();
    });
  }

  function getMonthName(monthNum) {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return months[monthNum - 1];
  }

  function getFullMonthName(monthNum) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[monthNum - 1];
  }

  function getSelectedYears() {
    const from = state.selectedYearFrom;
    const to = state.selectedYearTo;
    if (!from && !to) return [];
    if (from && !to) return [from];
    if (!from && to) return [to];
    const years = [];
    for (let y = from; y <= to; y++) years.push(y);
    return years;
  }

  function buildMatrix() {
    const years = getSelectedYears();
    if (years.length === 0 || state.requests.length === 0) return;

    const matrix = {};
    const users = new Set();

    state.requests.forEach(req => {
      if (req.startDate) {
        const date = new Date(req.startDate);
        const year = date.getFullYear();
        if (years.includes(year)) {
          const month = date.getMonth() + 1;
          const key = req.userName;

          if (!matrix[key]) matrix[key] = {};
          const yearMonthKey = `${year}-${month}`;
          if (!matrix[key][yearMonthKey]) matrix[key][yearMonthKey] = { days: 0, requests: [] };

          matrix[key][yearMonthKey].days += req.totalDays || 0;
          matrix[key][yearMonthKey].requests.push(req);
          users.add(req.userName);
        }
      }
    });

    state.matrix = matrix;
    state.userList = Array.from(users).sort();

    state.userTotals = {};
    state.userList.forEach(userName => {
      let total = 0;
      let withComments = 0;
      let withoutComments = 0;

      years.forEach(year => {
        for (let m = 1; m <= 12; m++) {
          const key = `${year}-${m}`;
          const monthData = matrix[userName]?.[key];
          if (!monthData) continue;
          total += monthData.days || 0;
          monthData.requests.forEach(req => {
            const hasComment = String(req.comment || '').trim() !== '';
            if (hasComment) withComments += req.totalDays || 0;
            else withoutComments += req.totalDays || 0;
          });
        }
      });

      const userReqWithAvailable = state.requests.find(r => r.userName === userName && (r.vacations_available !== null && r.vacations_available !== undefined));
      const availableText = userReqWithAvailable ? String(userReqWithAvailable.vacations_available) : '';
      const availableNum = availableText ? (parseFloat(String(availableText).replace(',', '.')) || 0) : 0;

      state.userTotals[userName] = { total, withComments, withoutComments, availableText, availableNum };
    });
  }

  function renderMatrix() {
    const years = getSelectedYears();
    if (years.length === 0 || state.userList.length === 0) {
      container.querySelector('#loadingIndicator').style.display = 'block';
      container.querySelector('#matrixTable').style.display = 'none';
      return;
    }

    const table = container.querySelector('#matrixTable');
    const head = container.querySelector('#matrixHead');
    const body = container.querySelector('#matrixBody');

    const statCols = 4;
    const totalMonthCols = years.length * 12;

    let groupRow = `<tr><th rowspan="2" style="min-width:275px;max-width:275px;">Сотрудник</th>`;
    groupRow += `<th rowspan="2" class="vacation-module-stat-cell">Доступно</th>`;
    groupRow += `<th rowspan="2" class="vacation-module-stat-cell">Всего</th>`;
    groupRow += `<th rowspan="2" class="vacation-module-stat-cell">Проведено</th>`;
    groupRow += `<th rowspan="2" class="vacation-module-stat-cell">Не проведено</th>`;

    years.forEach((year, yi) => {
      const cls = yi === 0 ? ' class="vacation-module-year-group-first"' : ' class="vacation-module-year-group"';
      groupRow += `<th colspan="12"${cls}>${year}</th>`;
    });
    groupRow += '</tr>';

    let monthRow = '<tr>';
    years.forEach((year, yi) => {
      for (let m = 1; m <= 12; m++) {
        const isFirst = yi === 0 && m === 1;
        const isYearStart = m === 1 && yi > 0;
        let cls = 'vacation-module-month-subheader';
        if (isYearStart) cls += ' year-start';
        monthRow += `<th class="${cls}">${getMonthName(m)}</th>`;
      }
    });
    monthRow += '</tr>';

    head.innerHTML = groupRow + monthRow;

    body.innerHTML = '';

    let filteredUsers = state.userList.filter(userName =>
      userName.toLowerCase().includes(state.currentFilter)
    );

    if (state.settings.showOnlyMissingComments) {
      filteredUsers = filteredUsers.filter(userName => {
        const totals = state.userTotals[userName] || { withoutComments: 0 };
        return totals.withoutComments > 0;
      });
    }

    filteredUsers.forEach(userName => {
      const totals = state.userTotals[userName] || { total: 0, withComments: 0, withoutComments: 0, availableText: '', availableNum: 0 };
      const totalDaysWithoutComments = totals.withoutComments;

      const userCellClass = totalDaysWithoutComments >= 5 ? 'vacation-module-user-cell missing-comments' : 'vacation-module-user-cell';
      let row = `<tr><td class="${userCellClass}">${userName}</td>`;

      const availableDisplay = totals.availableText && totals.availableText.trim() !== '' ? totals.availableText : totals.availableNum.toFixed(2);
      const availableClass = totals.availableNum < totals.withoutComments ? 'vacation-module-stat-cell vacation-module-stat-bad' : 'vacation-module-stat-cell vacation-module-stat-good';
      row += `<td class="${availableClass} vacation-module-editable-cell" data-user="${userName}" data-available="${totals.availableNum}">${availableDisplay}</td>`;
      row += `<td class="vacation-module-stat-cell">${totals.total.toFixed(2)}</td>`;
      row += `<td class="vacation-module-stat-cell vacation-module-stat-good">${totals.withComments.toFixed(2)}</td>`;
      const withoutClass = totals.withoutComments > 5 ? 'vacation-module-stat-cell vacation-module-stat-bad' : 'vacation-module-stat-cell';
      row += `<td class="${withoutClass}">${totals.withoutComments.toFixed(2)}</td>`;

      years.forEach((year, yi) => {
        for (let m = 1; m <= 12; m++) {
          const isYearStart = m === 1 && yi > 0;
          const yearStartClass = isYearStart ? ' year-start' : '';
          const key = `${year}-${m}`;
          const monthData = state.matrix[userName]?.[key];
          if (monthData && monthData.days > 0) {
            const totalRequests = monthData.requests.length;
            const commentedRequests = monthData.requests.filter(req => String(req.comment || '').trim() !== '').length;

            let cellClass = 'vacation-module-month-cell';
            if (commentedRequests === totalRequests && totalRequests > 0) {
              cellClass += ' all-commented';
            } else if (commentedRequests > 0 && commentedRequests < totalRequests) {
              cellClass += ' partial-commented';
            }

            row += `<td class="${cellClass}${yearStartClass}" data-user="${userName}" data-year="${year}" data-month="${m}">${monthData.days.toFixed(2)}</td>`;
          } else {
            row += `<td class="vacation-module-month-cell empty${yearStartClass}">-</td>`;
          }
        }
      });

      row += '</tr>';
      body.innerHTML += row;
    });

    container.querySelector('#loadingIndicator').style.display = 'none';
    table.style.display = 'table';

    body.querySelectorAll('.vacation-module-month-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', openModal);
    });

    body.querySelectorAll('.vacation-module-editable-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const userName = e.target.getAttribute('data-user');
        const currentValue = parseFloat(e.target.getAttribute('data-available'));
        elements.correctionManager.openCorrectionModal(userName, currentValue);
      });
    });
  }

  function openModal(e) {
    const userName = e.target.getAttribute('data-user');
    const month = parseInt(e.target.getAttribute('data-month'));
    const year = parseInt(e.target.getAttribute('data-year'));

    const key = `${year}-${month}`;
    const monthData = state.matrix[userName][key];
    const monthName = new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    container.querySelector('#modalTitle').textContent = userName;
    container.querySelector('#modalSubtitle').textContent = monthName;

    elements.requestsList.innerHTML = '';
    monthData.requests.forEach(req => {
      const startDate = new Date(req.startDate).toLocaleDateString('ru-RU');
      const endDate = new Date(req.endDate).toLocaleDateString('ru-RU');

      let selectedMonth = '';
      let selectedYear = '';

      if (req.comment && req.comment.trim()) {
        const match = req.comment.match(/(\d{4})-(\d{2})/);
        if (match) {
          selectedYear = match[1];
          selectedMonth = parseInt(match[2]).toString();
        }
      }

      let monthOptions = '<option value=""></option>';
      for (let m = 1; m <= 12; m++) {
        const selected = m.toString() === selectedMonth ? 'selected' : '';
        monthOptions += `<option value="${m}" ${selected}>${getFullMonthName(m)}</option>`;
      }

      let yearOptions = '<option value=""></option>';
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 1; y <= currentYear + 2; y++) {
        const selected = y.toString() === selectedYear ? 'selected' : '';
        yearOptions += `<option value="${y}" ${selected}>${y}</option>`;
      }

      const item = document.createElement('div');
      const hasComment = req.comment && req.comment.trim() !== '';
      item.className = hasComment ? 'vacation-module-request-item has-comment' : 'vacation-module-request-item';

      item.innerHTML = `
        <div class="vacation-module-request-item-header">
          <span class="vacation-module-request-item-days">${req.totalDays.toFixed(2)} дней</span>
        </div>
        <div class="vacation-module-request-item-dates">${startDate} → ${endDate}</div>
        <div class="vacation-module-request-comment">
          <label>Период начисления</label>
          <div class="vacation-module-request-period">
            <select data-request-id="${req.id}" data-type="month" data-changed="false">
              ${monthOptions}
            </select>
            <select data-request-id="${req.id}" data-type="year" data-changed="false">
              ${yearOptions}
            </select>
          </div>
        </div>
      `;
      elements.requestsList.appendChild(item);

      const selects = item.querySelectorAll('select');
      selects.forEach(select => {
        select.addEventListener('change', () => {
          select.dataset.changed = 'true';
        });
      });
    });

    elements.modal.classList.add('active');
  }

  function closeModal() {
    elements.modal.classList.remove('active');
  }

  async function saveChanges() {
    const modalSaveBtn = container.querySelector('#modalSave');
    const loadingIndicator = container.querySelector('#loadingIndicator');

    modalSaveBtn.disabled = true;
    const originalText = modalSaveBtn.textContent;
    modalSaveBtn.textContent = 'Сохранение...';

    try {
      const selects = elements.requestsList.querySelectorAll('select');
      const updates = {};

      selects.forEach(select => {
        if (select.dataset.changed === 'true') {
          const requestId = select.dataset.requestId;
          const type = select.dataset.type;
          if (!updates[requestId]) updates[requestId] = {};
          updates[requestId][type] = select.value;
        }
      });

      const payload = Object.entries(updates).map(([requestId, v]) => {
        const request = state.requests.find(req => req.id == requestId);

        let commentValue = '';
        if (v.month && v.year) {
          commentValue = `${v.year}-${String(v.month).padStart(2, '0')}`;
        } else {
          commentValue = '';
        }

        return {
          requestId,
          commentValue,
          totalDays: request ? request.totalDays : 0
        };
      });

      if (payload.length === 0) {
        closeModal();
        return;
      }

      for (const { requestId, commentValue, totalDays } of payload) {
        try {
          const res = await fetch('/api/vacations/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, commentValue, totalDays })
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Unknown error');
        } catch (err) {
          console.error('Ошибка сохранения:', err);
        }
      }

      loadingIndicator.style.display = 'block';
      await loadData();
    } finally {
      loadingIndicator.style.display = 'none';
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = originalText;
      closeModal();
    }
  }

  async function loadData() {
    try {
      const loadingIndicator = container.querySelector('#loadingIndicator');
      if (loadingIndicator) loadingIndicator.style.display = 'block';

      const matrixTable = container.querySelector('#matrixTable');
      if (matrixTable) matrixTable.style.display = 'none';

      const response = await fetch('/api/vacations/requests');
      const result = await response.json();

      if (result.success) {
        state.requests = result.data.requests.map(r => ({
          ...r,
          startDate: r.startDate ? new Date(r.startDate) : null,
          endDate: r.endDate ? new Date(r.endDate) : null,
          vacations_available: r.vacations_available ?? null,
        }));
        state.years = result.data.years;

        const currentYear = new Date().getFullYear();

        elements.yearFromSelect.innerHTML = '<option value="">С года</option>';
        elements.yearToSelect.innerHTML = '<option value="">По год</option>';

        state.years.forEach(year => {
          const optFrom = document.createElement('option');
          optFrom.value = year;
          optFrom.textContent = year;
          if (year === currentYear) {
            optFrom.selected = true;
            state.selectedYearFrom = year;
          }
          elements.yearFromSelect.appendChild(optFrom);

          const optTo = document.createElement('option');
          optTo.value = year;
          optTo.textContent = year;
          if (year === currentYear) {
            optTo.selected = true;
            state.selectedYearTo = year;
          }
          elements.yearToSelect.appendChild(optTo);
        });

        const years = getSelectedYears();
        if (years.length > 0) {
          buildMatrix();
          renderMatrix();
        } else {
          if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      const loadingIndicator = container.querySelector('#loadingIndicator');
      if (loadingIndicator) loadingIndicator.textContent = 'Ошибка загрузки данных';
    }
  }

  function syncYearSelects() {
    const from = state.selectedYearFrom;
    const to = state.selectedYearTo;

    Array.from(elements.yearFromSelect.options).forEach(opt => {
      if (opt.value === '') return;
      opt.disabled = to !== null && parseInt(opt.value) > to;
    });

    Array.from(elements.yearToSelect.options).forEach(opt => {
      if (opt.value === '') return;
      const y = parseInt(opt.value);
      opt.disabled = (from !== null && y < from) || (from !== null && y > from + 1);
    });
  }

  function initCorrectionModal() {
    const correctionModal = container.querySelector('#correctionModal');
    const correctionInput = container.querySelector('#correctionInput');
    const correctionSave = container.querySelector('#correctionSave');
    const correctionCancel = container.querySelector('#correctionCancel');
    const closeBtn = correctionModal.querySelector('.vacation-module-close-modal');

    let currentUser = null;

    function openCorrectionModal(userName, currentValue) {
      currentUser = userName;
      container.querySelector('#correctionUserName').textContent = userName;
      correctionInput.value = currentValue;
      correctionModal.classList.add('active');
      correctionInput.focus();
    }

    async function saveCorrection() {
      const newValue = parseFloat(correctionInput.value);
      if (isNaN(newValue) || newValue < 0) {
        alert('Пожалуйста, введите корректное положительное число');
        return;
      }

      correctionSave.disabled = true;
      correctionSave.textContent = 'Сохранение...';

      try {
        const res = await fetch('/api/vacations/correct-available', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: currentUser, newValue: newValue })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        await loadData();
        closeCorrectionModal();
      } catch (err) {
        console.error('Ошибка сохранения:', err);
        alert('Ошибка при сохранении');
      } finally {
        correctionSave.disabled = false;
        correctionSave.textContent = 'Сохранить';
      }
    }

    function closeCorrectionModal() {
      correctionModal.classList.remove('active');
      currentUser = null;
      correctionInput.value = '';
    }

    correctionSave.addEventListener('click', saveCorrection);
    correctionCancel.addEventListener('click', closeCorrectionModal);
    closeBtn.addEventListener('click', closeCorrectionModal);
    correctionModal.addEventListener('click', (e) => {
      if (e.target === correctionModal) closeCorrectionModal();
    });
    correctionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveCorrection();
    });

    return { openCorrectionModal };
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;

    const rawHeaders = lines[0].split(/[;,\t]/);
    const headers = rawHeaders.map(h => h.trim().replace(/^"|"$/g, '').trim());

    const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id_1c');
    const valColIdx = headers.findIndex(h =>
      h.toLowerCase() === 'vacations_available' ||
      h.toLowerCase() === 'отпуск_доступно' ||
      h.toLowerCase() === 'доступно'
    );

    if (idColIdx === -1) return { error: 'Колонка id_1c не найдена в файле' };
    if (valColIdx === -1) return { error: 'Колонка vacations_available (или Отпуск_Доступно) не найдена в файле' };

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(/[;,\t]/).map(c => c.trim().replace(/^"|"$/g, '').trim());
      const id = cols[idColIdx];
      const val = cols[valColIdx];
      if (!id) continue;
      const numVal = parseFloat(String(val).replace(',', '.'));
      if (isNaN(numVal)) continue;
      rows.push({ id_1c: id, newValue: numVal });
    }

    if (rows.length === 0) return { error: 'Нет валидных строк в файле' };
    return { rows };
  }

  function initCsvImport() {
    const csvPreviewModal = container.querySelector('#csvPreviewModal');
    const csvPreviewBody = container.querySelector('#csvPreviewBody');
    const csvPreviewSubtitle = container.querySelector('#csvPreviewSubtitle');
    const csvPreviewError = container.querySelector('#csvPreviewError');
    const csvPreviewApply = container.querySelector('#csvPreviewApply');
    const csvPreviewCancel = container.querySelector('#csvPreviewCancel');
    const csvPreviewClose = container.querySelector('#csvPreviewClose');

    let pendingUpdates = [];

    function closeCsvModal() {
      csvPreviewModal.classList.remove('active');
      pendingUpdates = [];
      elements.csvInput.value = '';
    }

    elements.updateBtn.addEventListener('click', () => {
      elements.csvInput.click();
    });

    elements.csvInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const parsed = parseCsv(text);

      csvPreviewError.style.display = 'none';
      csvPreviewBody.innerHTML = '';
      pendingUpdates = [];

      if (!parsed || parsed.error) {
        csvPreviewError.textContent = parsed ? parsed.error : 'Ошибка чтения файла';
        csvPreviewError.style.display = 'block';
        csvPreviewSubtitle.textContent = '';
        csvPreviewApply.disabled = true;
        csvPreviewModal.classList.add('active');
        return;
      }

      csvPreviewSubtitle.textContent = 'Загрузка данных...';
      csvPreviewApply.disabled = true;
      csvPreviewModal.classList.add('active');

      const ids = parsed.rows.map(r => r.id_1c);

      let usersMap = {};
      try {
        const res = await fetch('/api/vacations/preview-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data.success && data.users) {
          data.users.forEach(u => { usersMap[u.id_1c] = u; });
        }
      } catch (err) {
        csvPreviewError.textContent = 'Ошибка при загрузке текущих данных';
        csvPreviewError.style.display = 'block';
        csvPreviewSubtitle.textContent = '';
        return;
      }

      const matched = [];
      const notFound = [];

      parsed.rows.forEach(row => {
        const user = usersMap[row.id_1c];
        if (user) {
          matched.push({ ...row, user_name: user.user_name || '—', currentValue: user.vacations_available });
        } else {
          notFound.push(row.id_1c);
        }
      });

      if (matched.length === 0) {
        csvPreviewError.textContent = `Ни один пользователь не найден по id_1c. Не найдено: ${notFound.join(', ')}`;
        csvPreviewError.style.display = 'block';
        csvPreviewSubtitle.textContent = '';
        return;
      }

      pendingUpdates = matched;

      matched.forEach(row => {
        const currentNum = parseFloat(String(row.currentValue || '0').replace(',', '.')) || 0;
        const newNum = row.newValue;
        const changed = Math.abs(currentNum - newNum) > 0.001;

        const tr = document.createElement('tr');
        tr.className = changed ? 'csv-row-changed' : 'csv-row-same';
        tr.innerHTML = `
          <td class="csv-cell-id">${row.id_1c}</td>
          <td class="csv-cell-name">${row.user_name}</td>
          <td class="csv-cell-current">${row.currentValue !== null && row.currentValue !== undefined ? row.currentValue : '—'}</td>
          <td class="csv-cell-new ${changed ? 'csv-new-diff' : ''}">${newNum}</td>
        `;
        csvPreviewBody.appendChild(tr);
      });

      const changedCount = matched.filter(r => {
        const c = parseFloat(String(r.currentValue || '0').replace(',', '.')) || 0;
        return Math.abs(c - r.newValue) > 0.001;
      }).length;

      csvPreviewSubtitle.textContent = `Найдено: ${matched.length} сотрудников · Изменится: ${changedCount} · Не найдено: ${notFound.length}`;

      if (notFound.length > 0) {
        csvPreviewError.textContent = `Не найдено в базе: ${notFound.join(', ')}`;
        csvPreviewError.style.display = 'block';
      }

      csvPreviewApply.disabled = changedCount === 0;
    });

    csvPreviewApply.addEventListener('click', async () => {
      if (!pendingUpdates.length) return;

      csvPreviewApply.disabled = true;
      csvPreviewApply.textContent = 'Применение...';

      try {
        const updates = pendingUpdates.map(r => ({ id_1c: r.id_1c, newValue: r.newValue }));
        const res = await fetch('/api/vacations/bulk-update-available', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Ошибка обновления');
        closeCsvModal();
        await loadData();
      } catch (err) {
        console.error('Bulk update error:', err);
        csvPreviewError.textContent = 'Ошибка при сохранении: ' + err.message;
        csvPreviewError.style.display = 'block';
      } finally {
        csvPreviewApply.disabled = false;
        csvPreviewApply.textContent = 'Применить';
      }
    });

    csvPreviewCancel.addEventListener('click', closeCsvModal);
    csvPreviewClose.addEventListener('click', closeCsvModal);
    csvPreviewModal.addEventListener('click', (e) => {
      if (e.target === csvPreviewModal) closeCsvModal();
    });
  }

  function init() {
    loadUserSettings();
    elements.correctionManager = initCorrectionModal();
    initCsvImport();

    loadData();

    elements.loadBtn.addEventListener('click', loadData);

    elements.yearFromSelect.addEventListener('change', (e) => {
      state.selectedYearFrom = e.target.value ? parseInt(e.target.value) : null;
      if (state.selectedYearTo !== null && state.selectedYearFrom !== null && state.selectedYearTo < state.selectedYearFrom) {
        state.selectedYearTo = state.selectedYearFrom;
        elements.yearToSelect.value = state.selectedYearFrom;
      }
      if (state.selectedYearFrom !== null && state.selectedYearTo !== null && state.selectedYearTo > state.selectedYearFrom + 1) {
        state.selectedYearTo = state.selectedYearFrom + 1;
        elements.yearToSelect.value = state.selectedYearTo;
      }
      syncYearSelects();
      buildMatrix();
      renderMatrix();
    });

    elements.yearToSelect.addEventListener('change', (e) => {
      state.selectedYearTo = e.target.value ? parseInt(e.target.value) : null;
      if (state.selectedYearFrom !== null && state.selectedYearTo !== null && state.selectedYearTo < state.selectedYearFrom) {
        state.selectedYearFrom = state.selectedYearTo;
        elements.yearFromSelect.value = state.selectedYearTo;
      }
      syncYearSelects();
      buildMatrix();
      renderMatrix();
    });

    elements.nameInput.addEventListener('input', (e) => {
      state.currentFilter = e.target.value.toLowerCase();
      renderMatrix();
    });

    const closeBtn = container.querySelector('.vacation-module-close-modal');
    const modalCloseBtn = container.querySelector('#modalClose');
    const modalSaveBtn = container.querySelector('#modalSave');

    closeBtn.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalSaveBtn.addEventListener('click', saveChanges);

    elements.modal.addEventListener('click', (e) => {
      if (e.target === elements.modal) closeModal();
    });
  }

  init();
}