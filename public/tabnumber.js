export async function loadModule(container, { chatId, userData }) {

  const workDaysTranslation = {
    'mon': 'Пн',
    'tue': 'Вт',
    'wed': 'Ср',
    'thu': 'Чт',
    'fri': 'Пт',
    'sat': 'Сб',
    'sun': 'Вс'
  };

  const roleTranslation = {
    'new': 'Новый',
    'employee': 'Сотрудник',
    'hr': 'HR',
    'team_lead': 'Тимлид',
    'manager': 'Менеджер',
    'director': 'Директор',
    'content': 'Контент',
    'accountant': 'Бухгалтер',
    'security': 'Безопасность',
    'marketing': 'Маркетинг',
    'category_manager': 'Категорийный менеджер',
    'secretary': 'Секретарь',
    'revisor': 'Ревизор',
    'service': 'Сервис',
    'shop_director': 'Директор магазина',
    'construction': 'Строительство',
    'piaza': 'Piaza',
    'casta': 'Casta',
    'zavgar': 'Завгар',
    'shop': 'Магазин',
    'admin': 'Администратор'
  };

  const scheduleStatusOptions = {
    'works': 'Рабочий (8)',
    'doesnt work': 'Выходной (В)',
    'sick': 'Больничный (Б)',
    'vacation': 'Отпуск (О)',
    'own_expense': 'Свой счет (ОЗ)',
    '': 'Очистить'
  };

  const scheduleStatusDisplay = {
    'works': '✅',
    'doesnt work': '❌',
    'sick': '🏥',
    'vacation': '🏖️',
    'own_expense': '💰',
    '': ''
  };

  const groupsList = ['Директора и замы', 'Кассиры', 'КБТ', 'Кондиционеры', 'МБТ', 'Мебель', 'Обогрев', 'ПК', 'Пылесосы + СВЧ', 'Сервис', 'ТВ', 'Электроинструменты'];
  const groupsMsgList = ['МБТ', 'КБТ', 'Мебель', 'Компьютерка'];

  const russianWeekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const russianMonths = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const IS_MOBILE = () => window.innerWidth <= 768;

  const columnVisibility = {
    tg_id: true,
    tab_number: true,
    time_arrive: true,
    time_leave: true,
    access: true,
    notify_violations: true,
    work_days: true
  };

  let currentUserRole = null;
  let currentUserChatId = null;
  let currentUserTeam = null;

  function saveColumnVisibility() {
    try { localStorage.setItem('tabnumber_column_visibility', JSON.stringify(columnVisibility)); } catch(e) {}
  }

  function loadColumnVisibility() {
    try {
      const saved = localStorage.getItem('tabnumber_column_visibility');
      if (saved) Object.assign(columnVisibility, JSON.parse(saved));
    } catch(e) {}
  }

  loadColumnVisibility();

  container.innerHTML = `
    <div class="tab-module-wrapper">
      <div class="tab-main-outer">
        <div class="tab-module-main">
          <div class="tab-module-tabs-nav">
            <button class="tab-module-tab-btn active" data-tab="data">Просмотр данных</button>
            <button class="tab-module-tab-btn" data-tab="schedule">Рабочие дни</button>
            <button class="tab-module-tab-btn" data-tab="calendar">Производственный календарь</button>
            <button class="tab-module-tab-btn" data-tab="logs">Журнал</button>
          </div>

          <div class="tab-module-controls-bar" id="controlsBar">
            <div class="tab-module-filter-group">
              <label>Отдел</label>
              <select id="filterDepartment" class="tab-module-select">
                <option value="">Все отделы</option>
              </select>
            </div>
            <div class="tab-module-filter-group">
              <label>Подразделение</label>
              <select id="filterTeam" class="tab-module-select">
                <option value="">Все подразделения</option>
              </select>
            </div>
            <div class="tab-module-filter-group">
              <label>Поиск</label>
              <input type="text" id="searchName" class="tab-module-input" placeholder="Имя сотрудника...">
            </div>
            <button id="addUserBtn" class="tab-module-btn tab-module-btn-primary" style="display:none;">➕ Добавить</button>
            <div id="scheduleExportButtons" style="display:none;">
              <button id="downloadWorkDaysExcelBtn" class="tab-module-btn tab-module-btn-secondary">Рабочие дни</button>
              <button id="downloadNonWorkDaysExcelBtn" class="tab-module-btn tab-module-btn-secondary">Прочие данные</button>
            </div>
          </div>

          <div id="tabContent" class="tab-module-card" style="overflow:hidden;"></div>
        </div>
      </div>

      <div class="tab-desktop-right-col">
        <div class="tab-module-settings-panel">
          <div class="tab-module-settings-header">
            <span class="tab-module-settings-title">Настройки</span>
            <button class="tab-module-settings-toggle">▼</button>
          </div>
          <div class="tab-module-settings-content">
            <div class="tab-module-settings-block">
              <div class="tab-module-settings-block-header"><h4>Видимость колонок</h4></div>
              <div class="tab-module-settings-block-content">
                <label class="tab-module-toggle-label"><span>TG ID</span><div class="tab-module-toggle"><input type="checkbox" id="toggleTgId" ${columnVisibility.tg_id?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Табельный номер</span><div class="tab-module-toggle"><input type="checkbox" id="toggleTabNumber" ${columnVisibility.tab_number?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Время прихода</span><div class="tab-module-toggle"><input type="checkbox" id="toggleTimeArrive" ${columnVisibility.time_arrive?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Время ухода</span><div class="tab-module-toggle"><input type="checkbox" id="toggleTimeLeave" ${columnVisibility.time_leave?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Доступ</span><div class="tab-module-toggle"><input type="checkbox" id="toggleAccess" ${columnVisibility.access?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Уведомления о нарушениях</span><div class="tab-module-toggle"><input type="checkbox" id="toggleNotify" ${columnVisibility.notify_violations?'checked':''}><span class="tab-module-slider"></span></div></label>
                <label class="tab-module-toggle-label"><span>Рабочие дни</span><div class="tab-module-toggle"><input type="checkbox" id="toggleWorkDays" ${columnVisibility.work_days?'checked':''}><span class="tab-module-slider"></span></div></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-module-toast-container" id="toastContainer"></div>
    </div>

    <div id="editModal" class="tab-module-modal">
      <div class="tab-module-modal-content">
        <div class="tab-module-modal-header">
          <span>Редактировать пользователя</span>
          <button class="tab-module-modal-close">&times;</button>
        </div>
        <div class="tab-module-modal-body">
          <div id="editUserInfo" class="tab-module-user-info"></div>
          <form id="editForm">
            <input type="hidden" id="editUserId">
            <input type="hidden" id="editField">
            <div id="formFieldContainer" class="tab-module-form-group"></div>
          </form>
        </div>
        <div class="tab-module-modal-footer">
          <button type="submit" form="editForm" class="tab-module-btn tab-module-btn-primary">Сохранить</button>
          <button type="button" class="tab-module-btn tab-module-btn-secondary modal-close">Отмена</button>
        </div>
      </div>
    </div>

    <div id="addUserModal" class="tab-module-modal">
      <div class="tab-module-modal-content">
        <div class="tab-module-modal-header">
          <span>Добавить пользователя</span>
          <button class="tab-module-modal-close">&times;</button>
        </div>
        <div class="tab-module-modal-body">
          <form id="addUserForm">
            <div class="tab-module-form-group"><label>Имя</label><input type="text" id="newUserName" class="tab-module-input" required></div>
            <div class="tab-module-form-group"><label>Отдел</label><select id="newUserDepartment" class="tab-module-select" required></select></div>
            <div class="tab-module-form-group"><label>Подразделение</label><select id="newUserTeam" class="tab-module-select" required></select></div>
            <div class="tab-module-form-group">
              <label>Роль</label>
              <select id="newUserRole" class="tab-module-select" required>
                ${Object.entries(roleTranslation).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
              </select>
            </div>
            <div class="tab-module-form-group"><label>TG ID</label><input type="text" id="newUserChatId" class="tab-module-input" required></div>
            <div class="tab-module-form-group"><label>Табельный номер</label><input type="text" id="newUserId1c" class="tab-module-input"></div>
            <div class="tab-module-form-group"><label>Время прихода</label><input type="time" id="newUserTimeArrive" class="tab-module-input"></div>
            <div class="tab-module-form-group"><label>Время ухода</label><input type="time" id="newUserTimeLeave" class="tab-module-input"></div>
            <div class="tab-module-form-group"><label>Доступ</label><select id="newUserAccess" class="tab-module-select"><option value="true">Активен</option><option value="false">Заблокирован</option></select></div>
            <div class="tab-module-form-group"><label>Уведомления о нарушениях</label><select id="newUserNotifyViolations" class="tab-module-select"><option value="true">Включены</option><option value="false">Отключены</option></select></div>
            <div class="tab-module-form-group">
              <label>Группы товаров</label>
              <div class="tab-module-groups-container" id="newGroupsContainer">
                ${groupsList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}"> ${g}</label>`).join('')}
              </div>
            </div>
            <div class="tab-module-form-group">
              <label>Уведомления по ценникам</label>
              <div class="tab-module-groups-container" id="newGroupsMsgContainer">
                ${groupsMsgList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}"> ${g}</label>`).join('')}
              </div>
            </div>
            <div class="tab-module-form-group">
              <label>Рабочие дни</label>
              <div class="tab-module-workdays-container">
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDayMon" value="mon" checked> Понедельник</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDayTue" value="tue" checked> Вторник</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDayWed" value="wed" checked> Среда</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDayThu" value="thu" checked> Четверг</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDayFri" value="fri" checked> Пятница</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDaySat" value="sat"> Суббота</label>
                <label class="tab-module-workday-checkbox"><input type="checkbox" id="newWorkDaySun" value="sun"> Воскресенье</label>
              </div>
            </div>
          </form>
        </div>
        <div class="tab-module-modal-footer">
          <button type="submit" form="addUserForm" class="tab-module-btn tab-module-btn-primary">Создать</button>
          <button type="button" class="tab-module-btn tab-module-btn-secondary modal-close">Отмена</button>
        </div>
      </div>
    </div>

    <div class="tab-module-status-sheet-backdrop" id="statusSheetBackdrop"></div>
    <div class="tab-module-status-sheet" id="statusSheet">
      <div class="tab-module-status-sheet-handle"></div>
      <div class="tab-module-status-sheet-title" id="statusSheetTitle">Выберите статус</div>
      <div class="tab-module-status-sheet-options" id="statusSheetOptions"></div>
    </div>
  `;

  const moduleState = {
    users: [],
    filteredUsers: [],
    currentEditUser: null,
    sortByNameAsc: true,
    availableTeams: [],
    availableDepartments: []
  };

  const scheduleState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    scheduleData: [],
    loading: false,
    selectedMobileUser: null
  };

  const el = {
    tabContent: () => document.getElementById('tabContent'),
    filterTeam: () => document.getElementById('filterTeam'),
    filterDepartment: () => document.getElementById('filterDepartment'),
    searchName: () => document.getElementById('searchName'),
    addUserBtn: () => document.getElementById('addUserBtn'),
    scheduleExportButtons: () => document.getElementById('scheduleExportButtons'),
    downloadWorkDaysExcelBtn: () => document.getElementById('downloadWorkDaysExcelBtn'),
    downloadNonWorkDaysExcelBtn: () => document.getElementById('downloadNonWorkDaysExcelBtn'),
    editModal: () => document.getElementById('editModal'),
    editForm: () => document.getElementById('editForm'),
    editUserId: () => document.getElementById('editUserId'),
    editField: () => document.getElementById('editField'),
    editUserInfo: () => document.getElementById('editUserInfo'),
    formFieldContainer: () => document.getElementById('formFieldContainer'),
    addUserModal: () => document.getElementById('addUserModal'),
    addUserForm: () => document.getElementById('addUserForm'),
    newUserTeam: () => document.getElementById('newUserTeam'),
    newUserDepartment: () => document.getElementById('newUserDepartment'),
    controlsBar: () => document.getElementById('controlsBar'),
    statusSheet: () => document.getElementById('statusSheet'),
    statusSheetBackdrop: () => document.getElementById('statusSheetBackdrop'),
    statusSheetTitle: () => document.getElementById('statusSheetTitle'),
    statusSheetOptions: () => document.getElementById('statusSheetOptions')
  };

  function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `tab-module-toast tab-module-status-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3000);
  }

  async function downloadWorkDaysToExcel() {
    try {
      const btn = el.downloadWorkDaysExcelBtn();
      if (btn) btn.disabled = true;
      
      const { year, month, scheduleData } = scheduleState;
      const daysInMonth = new Date(year, month, 0).getDate();
      const userWorkDaysMap = buildUserWorkDaysMap();
      const users = getFilteredScheduleUsers();
      
      const workDaysSheet = [];
      
      const header = ['Сотрудник'];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        header.push(`${d}.${month}`);
      }
      workDaysSheet.push(header);
      
      for (const user of users) {
        const wds = userWorkDaysMap[user.chat_id] || {};
        const row = [user.user_name || ''];
        
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const status = wds[dateStr] || '';
          
          if (status === 'works') {
            row.push('✅');
          } else {
            row.push('');
          }
        }
        
        workDaysSheet.push(row);
      }
      
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
      
      const wb = XLSX.utils.book_new();
      const wsWorkDays = XLSX.utils.aoa_to_sheet(workDaysSheet);
      
      wsWorkDays['!cols'] = [{wch:25}];
      for (let i = 1; i < header.length; i++) wsWorkDays['!cols'].push({wch:5});
      
      XLSX.utils.book_append_sheet(wb, wsWorkDays, 'Рабочие дни');
      
      XLSX.writeFile(wb, `Рабочие_дни_${russianMonths[month-1]}_${year}.xlsx`);
      showToast('Excel файл с рабочими днями успешно создан', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Ошибка при создании Excel файла', 'error');
    } finally {
      const btn = el.downloadWorkDaysExcelBtn();
      if (btn) btn.disabled = false;
    }
  }

  async function downloadNonWorkDaysToExcel() {
    try {
      const btn = el.downloadNonWorkDaysExcelBtn();
      if (btn) btn.disabled = true;
      
      const { year, month, scheduleData } = scheduleState;
      const daysInMonth = new Date(year, month, 0).getDate();
      const userWorkDaysMap = buildUserWorkDaysMap();
      const users = getFilteredScheduleUsers();
      
      const nonWorkDaysSheet = [];
      
      const header = ['Сотрудник'];
      for (let d = 1; d <= daysInMonth; d++) {
        header.push(`${d}.${month}`);
      }
      nonWorkDaysSheet.push(header);
      
      for (const user of users) {
        const wds = userWorkDaysMap[user.chat_id] || {};
        const row = [user.user_name || ''];
        
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const status = wds[dateStr] || '';
          
          if (status === 'doesnt work') {
            row.push('❌');
          } else if (status === 'sick') {
            row.push('🏥');
          } else if (status === 'vacation') {
            row.push('🏖️');
          } else if (status === 'own_expense') {
            row.push('💰');
          } else {
            row.push('');
          }
        }
        
        nonWorkDaysSheet.push(row);
      }
      
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
      
      const wb = XLSX.utils.book_new();
      const wsNonWorkDays = XLSX.utils.aoa_to_sheet(nonWorkDaysSheet);
      
      wsNonWorkDays['!cols'] = [{wch:25}];
      for (let i = 1; i < header.length; i++) wsNonWorkDays['!cols'].push({wch:5});
      
      XLSX.utils.book_append_sheet(wb, wsNonWorkDays, 'Прочие данные');
      
      XLSX.writeFile(wb, `Прочие_данные_${russianMonths[month-1]}_${year}.xlsx`);
      showToast('Excel файл с прочими данными успешно создан', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Ошибка при создании Excel файла', 'error');
    } finally {
      const btn = el.downloadNonWorkDaysExcelBtn();
      if (btn) btn.disabled = false;
    }
  }

  function updateColumnVisibility() {
    const cols = {
      colTgId: columnVisibility.tg_id,
      colTabNumber: columnVisibility.tab_number,
      colTimeArrive: columnVisibility.time_arrive,
      colTimeLeave: columnVisibility.time_leave,
      colAccess: columnVisibility.access,
      colNotify: columnVisibility.notify_violations,
      colWorkDays: columnVisibility.work_days
    };
    Object.entries(cols).forEach(([id, visible]) => {
      const col = document.getElementById(id);
      if (col) col.style.display = visible ? '' : 'none';
    });
    renderUsers();
  }

  function formatWorkDays(workDays) {
    if (!workDays || !Array.isArray(workDays) || workDays.length === 0) return 'Не указаны';
    return workDays.map(d => workDaysTranslation[d] || d).join(', ');
  }

  function getWorkDaysFromCheckboxes(prefix) {
    return ['mon','tue','wed','thu','fri','sat','sun'].filter(day => {
      const cb = document.getElementById(`${prefix}${day.charAt(0).toUpperCase()+day.slice(1)}`);
      return cb && cb.checked;
    });
  }

  function setWorkDaysCheckboxes(workDays, prefix) {
    ['mon','tue','wed','thu','fri','sat','sun'].forEach(day => {
      const cb = document.getElementById(`${prefix}${day.charAt(0).toUpperCase()+day.slice(1)}`);
      if (cb) cb.checked = workDays && workDays.includes(day);
    });
  }

  async function fetchUsers() {
    try {
      if (userData) {
        currentUserChatId = userData.chat_id ?? chatId;
        currentUserRole = userData.role;
        currentUserTeam = userData.user_team;
      } else if (chatId) {
        currentUserChatId = chatId;
        const r = await fetch(`/api/tabnumber-users/${encodeURIComponent(chatId)}`);
        if (r.ok) {
          const d = await r.json();
          currentUserRole = d.user?.role;
          currentUserTeam = d.user?.user_team;
        }
      }

      const response = await fetch('/api/tabnumber-users');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      let users = result.users;

      if (currentUserRole === 'shop_director' && currentUserTeam) {
        users = users.filter(u => u.user_team === currentUserTeam);
      }

      const addBtn = el.addUserBtn();
      if (addBtn) {
        const hide = currentUserRole === 'hr' || currentUserRole === 'accountant' || currentUserRole === 'director';
        addBtn.style.display = hide ? 'none' : 'block';
      }

      users.forEach(u => {
        if (u["Время прихода"] !== undefined) { u.time_arrive = u["Время прихода"]; delete u["Время прихода"]; }
        if (u["Время ухода"] !== undefined) { u.time_leave = u["Время ухода"]; delete u["Время ухода"]; }
      });

      moduleState.users = users;
      moduleState.filteredUsers = [...users];
      moduleState.availableTeams = [...new Set(users.map(u => u.user_team).filter(Boolean))].sort();
      moduleState.availableDepartments = [...new Set(users.map(u => u.user_department).filter(Boolean))].sort();
    
      updateFilters();
      sortUsersByName();
      updateControlsBarVisibility();
    } catch (err) {
      console.error('fetchUsers ERROR:', err);
      showToast(`Ошибка загрузки: ${err.message}`, 'error');
    }
  }

  function updateControlsBarVisibility() {
    const bar = el.controlsBar();
    if (!bar) return;
    if (currentUserRole === 'shop_director' || IS_MOBILE()) {
      bar.style.display = 'none';
    } else {
      bar.style.display = '';
    }
  }

  function updateFilters() {
    const ft = el.filterTeam();
    const fd = el.filterDepartment();
    const nut = el.newUserTeam();
    const nud = el.newUserDepartment();
    if (!ft || !fd) return;

    ft.innerHTML = '<option value="">Все подразделения</option>';
    fd.innerHTML = '<option value="">Все отделы</option>';
    if (nut) nut.innerHTML = '';
    if (nud) nud.innerHTML = '';

    if (currentUserRole === 'shop_director' && currentUserTeam) {
      ft.innerHTML = `<option value="${currentUserTeam}" selected>${currentUserTeam}</option>`;
      ft.disabled = true;
      if (nut) { nut.innerHTML = `<option value="${currentUserTeam}">${currentUserTeam}</option>`; nut.disabled = true; }
    } else {
      moduleState.availableTeams.forEach(team => {
        ft.innerHTML += `<option value="${team}">${team}</option>`;
        if (nut) nut.innerHTML += `<option value="${team}">${team}</option>`;
      });
    }

    moduleState.availableDepartments.forEach(dept => {
      fd.innerHTML += `<option value="${dept}">${dept}</option>`;
      if (nud) nud.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
  }

  function sortUsersByName() {
    moduleState.users.sort((a, b) => {
      const na = (a.user_name || '').toLowerCase();
      const nb = (b.user_name || '').toLowerCase();
      return moduleState.sortByNameAsc ? na.localeCompare(nb) : nb.localeCompare(na);
    });
  }

  function toggleSortDirection() {
    moduleState.sortByNameAsc = !moduleState.sortByNameAsc;
    sortUsersByName();
    applyFilters();
  }

  function canEdit() {
    const result = currentUserRole !== 'hr' && currentUserRole !== 'accountant' && currentUserRole !== 'director';
    return result;
  }

  function renderUsers() {
    const list = document.getElementById('usersList');
    if (!list) {
      console.error('renderUsers: usersList element NOT FOUND');
      return;
    }
    list.innerHTML = '';

    if (moduleState.filteredUsers.length === 0) {
      let colspan = 7;
      if (columnVisibility.tg_id) colspan++;
      if (columnVisibility.tab_number) colspan++;
      if (columnVisibility.time_arrive) colspan++;
      if (columnVisibility.time_leave) colspan++;
      if (columnVisibility.access) colspan++;
      if (columnVisibility.notify_violations) colspan++;
      if (columnVisibility.work_days) colspan++;
      list.innerHTML = `<tr><td colspan="${colspan}" class="tab-module-empty-state">Нет данных</td></tr>`;
      return;
    }

    const editable = canEdit();
    
    moduleState.filteredUsers.forEach(user => {
      const row = document.createElement('tr');
      const notifyHtml = user.notify_violations
        ? '<span class="tab-module-notification-badge tab-module-badge-enabled">Включены</span>'
        : '<span class="tab-module-notification-badge tab-module-badge-disabled">Отключены</span>';
      const accessHtml = user.access
        ? '<span class="tab-module-access-badge tab-module-badge-enabled">Активен</span>'
        : '<span class="tab-module-access-badge tab-module-badge-disabled">Заблокирован</span>';
      const roleDisplay = roleTranslation[user.role] || user.role || '—';
      const canEditGroups = (user.role === 'shop' || user.role === 'shop_director') && editable;
      const groupsDisplay = canEditGroups ? (user.groups?.join(', ') || '—') : '—';
      const groupsMsgDisplay = canEditGroups ? (user.groups_msg?.join(', ') || '—') : '—';

      let cells = `
        <td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="user_name">${user.user_name||'—'}</td>
        <td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="user_department">${user.user_department||'—'}</td>
        <td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="user_team">${user.user_team||'—'}</td>
        <td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="role">${roleDisplay}</td>
      `;
      if (columnVisibility.tg_id)       cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="chat_id">${user.chat_id||'—'}</td>`;
      if (columnVisibility.tab_number)   cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="id_1c">${user.id_1c||'—'}</td>`;
      if (columnVisibility.time_arrive)  cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="time_arrive">${user.time_arrive||'—'}</td>`;
      if (columnVisibility.time_leave)   cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="time_leave">${user.time_leave||'—'}</td>`;
      if (columnVisibility.access)       cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="access">${accessHtml}</td>`;
      if (columnVisibility.notify_violations) cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="notify_violations">${notifyHtml}</td>`;
      if (columnVisibility.work_days)    cells += `<td class="tab-module-cell ${editable?'editable':''}" data-id="${user.id}" data-field="work_days"><span class="tab-module-workdays-display">${formatWorkDays(user.work_days)}</span></td>`;
      cells += `<td class="tab-module-cell">${groupsDisplay}</td>`;
      cells += `<td class="tab-module-cell">${groupsMsgDisplay}</td>`;
      cells += `<td class="tab-module-actions-cell">${editable?`<button class="tab-module-edit-btn" data-id="${user.id}">✎</button>`:'<span style="color:#6c757d">—</span>'}</td>`;

      row.innerHTML = cells;
      list.appendChild(row);
    });

    if (editable) {
      list.querySelectorAll('.tab-module-cell.editable').forEach(cell => {
        cell.addEventListener('click', e => {
          const td = e.target.closest('td');
          openEditModal(td.getAttribute('data-id'), td.getAttribute('data-field'));
        });
      });
      list.querySelectorAll('.tab-module-edit-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openFullEditModal(btn.getAttribute('data-id')); });
      });
    }
    
  }

  async function loadScheduleData(year, month) {
    scheduleState.loading = true;
    try {
      const r = await fetch(`/api/tabnumber-schedule?year=${year}&month=${month}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { schedule } = await r.json();
      scheduleState.scheduleData = Array.isArray(schedule) ? schedule : [];
    } catch(e) {
      scheduleState.scheduleData = [];
      showToast('Ошибка загрузки расписания', 'error');
    }
    scheduleState.loading = false;
  }

  async function updateScheduleDay(chatId, date, status) {
    try {
      const r = await fetch('/api/tabnumber-schedule', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_id: chatId, date, status: status === '' ? null : status, modified_by: currentUserChatId })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await loadScheduleData(scheduleState.year, scheduleState.month);
      renderScheduleTab();
      showToast('График обновлен', 'success');
    } catch(err) {
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  }

  function buildUserWorkDaysMap() {
    const map = {};
    if (Array.isArray(scheduleState.scheduleData)) {
      scheduleState.scheduleData.forEach(row => { map[row.chat_id] = row.work_days || {}; });
    }
    return map;
  }

  function getFilteredScheduleUsers() {
    const teamFilter = el.filterTeam()?.value || '';
    const deptFilter = el.filterDepartment()?.value || '';
    const nameSearch = (el.searchName()?.value || '').toLowerCase();
    return moduleState.users.filter(u => {
      const matchTeam = currentUserRole === 'shop_director' && currentUserTeam
        ? u.user_team === currentUserTeam
        : !teamFilter || u.user_team === teamFilter;
      const matchDept = !deptFilter || u.user_department === deptFilter;
      const matchName = !nameSearch || (u.user_name||'').toLowerCase().includes(nameSearch);
      return matchTeam && matchDept && matchName;
    });
  }

  function openStatusSheet(chatId, date, currentStatus, onDone) {
    const sheet = el.statusSheet();
    const backdrop = el.statusSheetBackdrop();
    const title = el.statusSheetTitle();
    const opts = el.statusSheetOptions();
    if (!sheet || !opts) return;

    const d = new Date(date + 'T00:00:00');
    title.textContent = `${d.getDate()} ${russianMonths[d.getMonth()]}`;

    const options = [
      { value: 'works',        label: 'Рабочий',    icon: '✅', cls: 'opt-works' },
      { value: 'doesnt work',  label: 'Выходной',   icon: '❌', cls: 'opt-off' },
      { value: 'sick',         label: 'Больничный', icon: '🏥', cls: 'opt-sick' },
      { value: 'vacation',     label: 'Отпуск',     icon: '🏖️', cls: 'opt-vacation' },
      { value: 'own_expense',  label: 'Свой счет',  icon: '💰', cls: 'opt-expense' },
      { value: '',             label: 'Очистить',   icon: '🗑',  cls: 'opt-clear' },
    ];

    opts.innerHTML = options.map(o => `
      <div class="tab-module-status-option ${o.cls} ${o.value === currentStatus ? 'selected' : ''}"
          data-value="${o.value}">
        <span class="opt-icon">${o.icon}</span>
        <span>${o.label}</span>
      </div>
    `).join('');

    opts.querySelectorAll('.tab-module-status-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        closeStatusSheet();
        await updateScheduleDay(chatId, date, opt.getAttribute('data-value'));
        if (onDone) onDone();
      });
    });

    backdrop.classList.add('open');
    sheet.classList.add('open');

    const close = () => { closeStatusSheet(); };
    backdrop.onclick = close;
  }

  function closeStatusSheet() {
    el.statusSheet()?.classList.remove('open');
    el.statusSheetBackdrop()?.classList.remove('open');
    el.statusSheetBackdrop().onclick = null;
  }

  function renderMobileSchedule() {
    const tabContent = el.tabContent();
    if (!tabContent) return;

    const { year, month } = scheduleState;
    const daysInMonth = new Date(year, month, 0).getDate();
    const userWorkDaysMap = buildUserWorkDaysMap();
    const users = getFilteredScheduleUsers();
    const editable = canEdit();

    if (!scheduleState.selectedMobileUser || !users.find(u => u.chat_id === scheduleState.selectedMobileUser)) {
      scheduleState.selectedMobileUser = users.length > 0 ? users[0].chat_id : null;
    }

    const selectedUser = users.find(u => u.chat_id === scheduleState.selectedMobileUser) || null;
    const workDays = selectedUser ? (userWorkDaysMap[selectedUser.chat_id] || {}) : {};

    const firstDow = new Date(year, month - 1, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const weekdayLabels = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) =>
      `<div class="${i >= 5 ? 'weekend-label' : ''}">${d}</div>`
    ).join('');

    let emptyCells = '';
    for (let i = 0; i < startOffset; i++) emptyCells += `<div class="tab-module-mobile-day-empty"></div>`;

    let dayCells = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(year, month - 1, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const status = workDays[dateStr] || '';
      const statusClass = status ? `status-${status.replace(' ', '-')}` : '';
      const ico = scheduleStatusDisplay[status] || '';
      const isToday = dateStr === todayStr;
      const noUser = !selectedUser;

      dayCells += `<div 
        class="tab-module-mobile-day ${isWeekend ? 'is-weekend' : ''} ${statusClass} ${isToday ? 'is-today' : ''} ${noUser ? 'no-user' : ''}"
        data-date="${dateStr}"
        data-chat-id="${selectedUser?.chat_id || ''}"
        data-status="${status}">
        <div class="day-num">${d}</div>
        <div class="day-ico">${ico}</div>
      </div>`;
    }

    const userOptions = users.map(u =>
      `<option value="${u.chat_id}" ${u.chat_id === scheduleState.selectedMobileUser ? 'selected' : ''}>${u.user_name || u.chat_id}</option>`
    ).join('');

    tabContent.innerHTML = `
      <div class="tab-module-mobile-view">
        <div class="tab-module-mobile-topbar">
          <button class="tab-module-mobile-month-btn" id="mobileMonthPrev">‹</button>
          <div class="tab-module-mobile-month-label">${russianMonths[month-1]} ${year}</div>
          <button class="tab-module-mobile-month-btn" id="mobileMonthNext">›</button>
        </div>
        <div class="tab-module-mobile-user-bar">
          <select class="tab-module-mobile-user-select" id="mobileUserSelect">
            ${users.length === 0 ? '<option value="">Нет сотрудников</option>' : userOptions}
          </select>
        </div>
        <div class="tab-module-mobile-calendar-wrap">
          <div class="tab-module-mobile-weekdays">${weekdayLabels}</div>
          <div class="tab-module-mobile-days-grid" id="mobileDaysGrid">
            ${emptyCells}${dayCells}
          </div>
        </div>
        ${editable ? `
        <div class="tab-module-mobile-legend">
          <div class="tab-module-mobile-legend-item"><div class="tab-module-mobile-legend-dot works"></div>Рабочий</div>
          <div class="tab-module-mobile-legend-item"><div class="tab-module-mobile-legend-dot off"></div>Выходной</div>
          <div class="tab-module-mobile-legend-item"><div class="tab-module-mobile-legend-dot sick"></div>Больничный</div>
          <div class="tab-module-mobile-legend-item"><div class="tab-module-mobile-legend-dot vacation"></div>Отпуск</div>
          <div class="tab-module-mobile-legend-item"><div class="tab-module-mobile-legend-dot expense"></div>Свой счет</div>
        </div>` : ''}
      </div>
    `;

    document.getElementById('mobileMonthPrev').addEventListener('click', async () => {
      scheduleState.month--;
      if (scheduleState.month < 1) { scheduleState.month = 12; scheduleState.year--; }
      await loadScheduleData(scheduleState.year, scheduleState.month);
      renderMobileSchedule();
    });

    document.getElementById('mobileMonthNext').addEventListener('click', async () => {
      scheduleState.month++;
      if (scheduleState.month > 12) { scheduleState.month = 1; scheduleState.year++; }
      await loadScheduleData(scheduleState.year, scheduleState.month);
      renderMobileSchedule();
    });

    const mobileUserSelect = document.getElementById('mobileUserSelect');
    if (mobileUserSelect) {
      mobileUserSelect.addEventListener('change', e => {
        scheduleState.selectedMobileUser = e.target.value;
        renderMobileSchedule();
      });
    }

    if (editable && selectedUser) {
      document.querySelectorAll('#mobileDaysGrid .tab-module-mobile-day').forEach(day => {
        day.addEventListener('click', () => {
          const chatId = day.getAttribute('data-chat-id');
          const date = day.getAttribute('data-date');
          const status = day.getAttribute('data-status');
          openStatusSheet(chatId, date, status);
        });
      });
    }
  }

  function renderDesktopSchedule() {
    const tabContent = el.tabContent();
    if (!tabContent) return;

    const { year, month } = scheduleState;
    const daysInMonth = new Date(year, month, 0).getDate();
    const userWorkDaysMap = buildUserWorkDaysMap();
    const users = getFilteredScheduleUsers();
    const editable = canEdit();

    const monthSelector = `<input type="month" id="workDaysMonthPicker" class="tab-module-month-picker" value="${year}-${String(month).padStart(2,'0')}">`;

    let thead = `<tr><th style="position:sticky;left:0;background:var(--tab-surface2);z-index:20;min-width:140px;">Сотрудник</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      const wd = russianWeekDays[dow];
      const isWknd = dow === 0 || dow === 6;
      thead += `<th style="position:sticky;top:0;z-index:10;min-width:38px;${isWknd?'color:var(--tab-accent);opacity:0.7':''}">
        <div>${d}</div><div style="font-size:10px;color:var(--tab-text-muted)">${wd}</div>
      </th>`;
    }
    thead += `</tr>`;

    let tbody = '';
    users.forEach(user => {
      const wds = userWorkDaysMap[user.chat_id] || {};
      tbody += `<tr><td style="position:sticky;left:0;background:var(--tab-surface);z-index:5;font-size:12px;white-space:nowrap;padding:6px 8px;">${user.user_name||''}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const status = wds[dateStr] || '';
        const ico = scheduleStatusDisplay[status] || '';
        const cls = status === 'works' ? 'workday-works'
          : status === 'doesnt work' ? 'workday-doesnt-work'
          : status === 'sick' ? 'workday-sick'
          : status === 'vacation' ? 'workday-vacation'
          : status === 'own_expense' ? 'workday-own-expense'
          : status === 'truancy' ? 'workday-truancy' : '';
        tbody += `<td class="${cls} ${editable?'editable-schedule':''}" data-chat-id="${user.chat_id}" data-date="${dateStr}" data-status="${status}" style="text-align:center;font-size:14px;padding:4px;cursor:${editable?'pointer':'default'};position:relative;">${ico}</td>`;
      }
      tbody += `</tr>`;
    });

    tabContent.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--tab-border);flex-shrink:0;">
          <h3 style="margin:0;font-size:15px;font-weight:700;">График рабочих дней</h3>
          ${monthSelector}
        </div>
        ${scheduleState.loading
          ? '<div class="tab-module-loading">Загрузка...</div>'
          : `<div style="overflow:auto;flex:1;"><table class="tab-module-schedule-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`
        }
      </div>
    `;

    if (editable) {
      tabContent.querySelectorAll('.editable-schedule').forEach(cell => {
        cell.addEventListener('click', e => {
          e.stopPropagation();
          const existing = document.querySelector('.tab-module-schedule-selector-portal');
          if (existing) { existing.remove(); return; }
          const chatId = cell.getAttribute('data-chat-id');
          const date = cell.getAttribute('data-date');
          const currentStatus = cell.getAttribute('data-status');
          buildDesktopScheduleSelector(currentStatus, chatId, date, cell);
        });
      });
    }

    const picker = document.getElementById('workDaysMonthPicker');
    if (picker) {
      picker.addEventListener('change', async e => {
        const [y, m] = e.target.value.split('-').map(Number);
        scheduleState.year = y;
        scheduleState.month = m;
        await loadScheduleData(y, m);
        renderDesktopSchedule();
      });
    }
  }

  function buildDesktopScheduleSelector(currentStatus, chatId, date, triggerCell) {
    const existingSelector = document.querySelector('.tab-module-schedule-selector-portal');
    if (existingSelector) existingSelector.remove();
    
    const selector = document.createElement('div');
    selector.className = 'tab-module-schedule-selector-portal';
    
    const select = document.createElement('select');
    select.className = 'tab-module-schedule-select';
    select.size = Object.keys(scheduleStatusOptions).length + 1;
    
    const cancelOpt = document.createElement('option');
    cancelOpt.value = '__cancel__';
    cancelOpt.textContent = '✕ Закрыть';
    select.appendChild(cancelOpt);
    
    Object.entries(scheduleStatusOptions).forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === currentStatus) opt.selected = true;
      select.appendChild(opt);
    });
    
    select.addEventListener('change', async e => {
      const v = e.target.value;
      selector.remove();
      if (v === '__cancel__') return;
      await updateScheduleDay(chatId, date, v);
    });
    
    selector.appendChild(select);
    document.body.appendChild(selector);
    
    const cellRect = triggerCell.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    const selectorHeight = 300;
    const spaceBelow = window.innerHeight - cellRect.bottom;
    const spaceAbove = cellRect.top;
    
    selector.style.position = 'fixed';
    selector.style.left = `${cellRect.left + scrollLeft}px`;
    selector.style.zIndex = '10001';
    
    if (spaceBelow >= selectorHeight || spaceBelow > spaceAbove) {
      selector.style.top = `${cellRect.bottom + scrollTop + 5}px`;
      selector.style.maxHeight = `${spaceBelow - 10}px`;
    } else {
      selector.style.top = `${cellRect.top + scrollTop - selectorHeight - 5}px`;
      selector.style.maxHeight = `${spaceAbove - 10}px`;
    }
    
    const closeHandler = (e) => {
      if (!selector.contains(e.target)) {
        selector.remove();
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('touchstart', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
      document.addEventListener('touchstart', closeHandler);
    }, 0);
    
    select.focus();
    
    const scrollHandler = () => {
      selector.remove();
      window.removeEventListener('scroll', scrollHandler);
      document.removeEventListener('click', closeHandler);
    };
    window.addEventListener('scroll', scrollHandler, { once: true });
    
    if (selector.style.maxHeight !== 'none') {
      select.style.maxHeight = `${parseInt(selector.style.maxHeight) - 20}px`;
      select.style.overflow = 'auto';
    }
    
    return selector;
  }

  function renderScheduleTab() {
    const exportButtons = el.scheduleExportButtons();
    if (exportButtons) {
      exportButtons.style.display = 'flex';
    }
    if (IS_MOBILE()) {
      renderMobileSchedule();
    } else {
      renderDesktopSchedule();
    }
  }

  async function loadProductionCalendar() {
    return { success: true };
  }

  function renderProductionCalendar() {
    const tabContent = el.tabContent();
    if (!tabContent) return;

    const currentYear = new Date().getFullYear();
    
    let monthsHtml = '';
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, month, 1).getDay();
      const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      
      const monthName = russianMonths[month];
      
      let monthDaysHtml = '';
      for (let i = 0; i < startOffset; i++) {
        monthDaysHtml += `<div class="calendar-cell empty"></div>`;
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(currentYear, month, day);
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        monthDaysHtml += `
          <div class="calendar-cell ${isWeekend ? 'weekend' : ''}">
            <span class="calendar-day-num">${day}</span>
          </div>
        `;
      }
      
      monthsHtml += `
        <div class="calendar-month-card">
          <div class="calendar-month-header">${monthName}</div>
          <div class="calendar-weekdays">
            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
          </div>
          <div class="calendar-days-grid">
            ${monthDaysHtml}
          </div>
        </div>
      `;
    }
    
    tabContent.innerHTML = `
      <div class="production-calendar-container">
        <div class="production-calendar-header">
          <h3>Производственный календарь ${currentYear}</h3>
          <div class="production-calendar-actions">
            <label class="tab-module-btn tab-module-btn-primary" style="cursor:pointer;display:inline-block;">
              📂 Загрузить Excel
              <input type="file" id="uploadExcelBtn" accept=".xlsx,.xls" style="display:none;">
            </label>
            <button id="refreshCalendarBtn" class="tab-module-btn tab-module-btn-secondary">🔄 Обновить</button>
          </div>
        </div>
        <div class="production-calendar-grid">
          ${monthsHtml}
        </div>
      </div>
    `;
    
    const fileInput = document.getElementById('uploadExcelBtn');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        showToast('Загрузка производственного календаря...', 'success');
        
        fileInput.value = '';
      });
    }
    
    const refreshBtn = document.getElementById('refreshCalendarBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await loadProductionCalendar();
        showToast('Календарь обновлен', 'success');
      });
    }
    
    loadProductionCalendar();
  }

  async function loadLogs() {
    const tabContent = el.tabContent();
    if (!tabContent) return;
    tabContent.innerHTML = '<div class="tab-module-loading">Загрузка журнала...</div>';
    try {
      let url = '/api/tabnumber-logs';
      if (currentUserRole === 'shop_director' && currentUserTeam) url += `?team=${encodeURIComponent(currentUserTeam)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { logs } = await r.json();

      if (IS_MOBILE()) {
        renderMobileLogs(logs, tabContent);
      } else {
        renderDesktopLogs(logs, tabContent);
      }
    } catch(err) {
      tabContent.innerHTML = `<div class="tab-module-empty-state">Ошибка загрузки журнала</div>`;
    }
  }

  function renderMobileLogs(logs, tabContent) {
    if (logs.length === 0) {
      tabContent.innerHTML = '<div class="tab-module-empty-state">Нет записей в журнале</div>';
      return;
    }
    tabContent.innerHTML = `<div class="tab-module-mobile-view" style="overflow-y:auto;">
      <div class="tab-module-logs-mobile">
        ${logs.map(log => {
          const data = log.schedule_adjustment_data || {};
          const oldD = scheduleStatusOptions[data.old_status] || data.old_status || 'Не указан';
          const newD = scheduleStatusOptions[data.new_status] || data.new_status || 'Не указан';
          return `<div class="tab-module-log-card">
            <div class="tab-module-log-card-header">
              <span class="tab-module-log-card-user">${data.user_name || '—'}</span>
              <span class="tab-module-log-card-date">${new Date(log.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
            <div class="tab-module-log-card-meta">
              ${data.date || ''} · изменил: ${data.modified_by_name || data.modified_by || '—'}
            </div>
            <div class="tab-module-log-card-change">
              <span class="tab-module-log-old">${oldD}</span>
              <span class="tab-module-log-arrow">→</span>
              <span class="tab-module-log-new">${newD}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderDesktopLogs(logs, tabContent) {
    let rows = logs.length === 0
      ? '<tr><td colspan="6" class="tab-module-empty-state">Нет записей</td></tr>'
      : logs.map(log => {
          const data = log.schedule_adjustment_data || {};
          const oldD = scheduleStatusOptions[data.old_status] || data.old_status || '—';
          const newD = scheduleStatusOptions[data.new_status] || data.new_status || '—';
          return `<tr>
            <td>${new Date(log.created_at).toLocaleString('ru-RU')}</td>
            <td>${data.modified_by_name || data.modified_by || '—'}</td>
            <td>${data.user_name || '—'}</td>
            <td>${data.date || '—'}</td>
            <td>${oldD}</td>
            <td>${newD}</td>
          </tr>`;
        }).join('');

    tabContent.innerHTML = `<div class="tab-module-table-container">
      <table class="tab-module-table">
        <thead><tr>
          <th>Дата изменения</th><th>Кто изменил</th><th>Сотрудник</th>
          <th>Дата в графике</th><th>Было</th><th>Стало</th>
        </tr></thead>
        <tbody>${rows}</tbody>
       </div>`;
  }

  function showDataTab() {
    const exportButtons = el.scheduleExportButtons();
    if (exportButtons) {
      exportButtons.style.display = 'none';
    }
    const tabContent = el.tabContent();
    if (!tabContent) {
      console.error('showDataTab: tabContent not found');
      return;
    }
    
    tabContent.innerHTML = `
      <div class="tab-module-table-container">
        <table id="usersTable" class="tab-module-table">
          <thead></tr>
            <th id="sortByName">Имя <span class="tab-module-sort-icon">${moduleState.sortByNameAsc?'↓':'↑'}</span></th>
            <th>Отдел</th><th>Подразделение</th><th>Роль</th>
            <th id="colTgId" style="${!columnVisibility.tg_id?'display:none':''}">TG ID</th>
            <th id="colTabNumber" style="${!columnVisibility.tab_number?'display:none':''}">Табельный №</th>
            <th id="colTimeArrive" style="${!columnVisibility.time_arrive?'display:none':''}">Приход</th>
            <th id="colTimeLeave" style="${!columnVisibility.time_leave?'display:none':''}">Уход</th>
            <th id="colAccess" style="${!columnVisibility.access?'display:none':''}">Доступ</th>
            <th id="colNotify" style="${!columnVisibility.notify_violations?'display:none':''}">Уведомления</th>
            <th id="colWorkDays" style="${!columnVisibility.work_days?'display:none':''}">Рабочие дни</th>
            <th>Группы товаров</th><th>По ценникам</th><th>Действия</th>
           </tr></thead>
          <tbody id="usersList"></tbody>
         </table>
      </div>
    `;
    
    const sortBtn = document.getElementById('sortByName');
    if (sortBtn) {
      sortBtn.addEventListener('click', toggleSortDirection);
    }
    
    renderUsers();
  }

  function openEditModal(userId, field) {
    if (!canEdit()) return;
    const user = moduleState.users.find(u => u.id == userId);
    if (!user) return;

    const canEditGroups = (user.role === 'shop' || user.role === 'shop_director') && canEdit();
    if ((field === 'groups' || field === 'groups_msg') && !canEditGroups) {
      showToast('Этот пользователь не может иметь группы', 'error');
      return;
    }

    moduleState.currentEditUser = user;
    el.editUserId().value = userId;
    el.editField().value = field;

    el.editUserInfo().innerHTML = `
      <div><strong>Сотрудник:</strong> ${user.user_name||'—'}</div>
      <div><strong>Отдел:</strong> ${user.user_department||'—'}</div>
      <div><strong>Подразделение:</strong> ${user.user_team||'—'}</div>
    `;

    const fc = el.formFieldContainer();
    fc.innerHTML = '';

    const fieldLabel = {
      user_name:'Имя', user_department:'Отдел', user_team:'Подразделение',
      chat_id:'TG ID', id_1c:'Табельный номер', time_arrive:'Время прихода',
      time_leave:'Время ухода', role:'Роль', access:'Доступ',
      notify_violations:'Уведомления', work_days:'Рабочие дни',
      groups:'Группы товаров', groups_msg:'Уведомления по ценникам'
    }[field] || field;

    if (field === 'user_department') {
      fc.innerHTML = `<label>${fieldLabel}</label><select id="editValue" class="tab-module-select">
        ${moduleState.availableDepartments.map(d => `<option value="${d}" ${user.user_department===d?'selected':''}>${d}</option>`).join('')}
      </select>`;
    } else if (field === 'user_team') {
      fc.innerHTML = `<label>${fieldLabel}</label><select id="editValue" class="tab-module-select">
        ${moduleState.availableTeams.map(t => `<option value="${t}" ${user.user_team===t?'selected':''}>${t}</option>`).join('')}
      </select>`;
    } else if (field === 'role') {
      fc.innerHTML = `<label>${fieldLabel}</label><select id="editValue" class="tab-module-select">
        ${Object.entries(roleTranslation).map(([v,l])=>`<option value="${v}" ${user.role===v?'selected':''}>${l}</option>`).join('')}
      </select>`;
    } else if (field === 'access') {
      fc.innerHTML = `<label>${fieldLabel}</label><select id="editValue" class="tab-module-select">
        <option value="true" ${user.access===true?'selected':''}>Активен</option>
        <option value="false" ${user.access===false?'selected':''}>Заблокирован</option>
      </select>`;
    } else if (field === 'notify_violations') {
      fc.innerHTML = `<label>${fieldLabel}</label><select id="editValue" class="tab-module-select">
        <option value="true" ${user.notify_violations===true?'selected':''}>Включены</option>
        <option value="false" ${user.notify_violations===false?'selected':''}>Отключены</option>
      </select>`;
    } else if (field === 'work_days') {
      fc.innerHTML = `<label>${fieldLabel}</label>
        <div class="tab-module-workdays-container">
          ${['mon','tue','wed','thu','fri','sat','sun'].map(d=>`
            <label class="tab-module-workday-checkbox">
              <input type="checkbox" id="editWorkDay${d.charAt(0).toUpperCase()+d.slice(1)}" value="${d}">
              ${{mon:'Пн',tue:'Вт',wed:'Ср',thu:'Чт',fri:'Пт',sat:'Сб',sun:'Вс'}[d]}
            </label>`).join('')}
        </div>`;
      setWorkDaysCheckboxes(user.work_days, 'editWorkDay');
    } else if (field === 'groups' && canEditGroups) {
      fc.innerHTML = `<label>${fieldLabel}</label>
        <div class="tab-module-groups-container" id="editGroupsModalContainer">
          ${groupsList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}" ${user.groups?.includes(g)?'checked':''}> ${g}</label>`).join('')}
        </div>`;
    } else if (field === 'groups_msg' && canEditGroups) {
      fc.innerHTML = `<label>${fieldLabel}</label>
        <div class="tab-module-groups-container">
          ${groupsMsgList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}" ${user.groups_msg?.includes(g)?'checked':''}> ${g}</label>`).join('')}
        </div>`;
    } else if (field === 'time_arrive' || field === 'time_leave') {
      fc.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-end;">
        <div style="flex:1;"><label>${fieldLabel}</label><input type="time" id="editValue" class="tab-module-input" value="${user[field]||''}"></div>
        <button type="button" id="deleteTimeBtn" class="tab-module-delete-btn">Удалить</button>
      </div>`;
      document.getElementById('deleteTimeBtn').addEventListener('click', () => {
        document.getElementById('editValue').value = '';
        saveEditedData();
      });
    } else {
      fc.innerHTML = `<label>${fieldLabel}</label><input type="text" id="editValue" class="tab-module-input" value="${user[field]||''}" required>`;
    }

    el.editModal().classList.add('active');
  }

  function openFullEditModal(userId) {
    if (!canEdit()) return;
    const user = moduleState.users.find(u => u.id == userId);
    if (!user) return;

    moduleState.currentEditUser = user;
    el.editUserId().value = userId;
    el.editField().value = '__full__';

    el.editUserInfo().innerHTML = `
      <div><strong>Сотрудник:</strong> ${user.user_name||'—'}</div>
      <div><strong>TG ID:</strong> ${user.chat_id||'—'}</div>
    `;

    const canEditGroups = (user.role === 'shop' || user.role === 'shop_director') && canEdit();
    const groupsHtml = canEditGroups ? `
      <div class="tab-module-form-group" style="grid-column:1/-1;">
        <label>Группы товаров</label>
        <div class="tab-module-groups-container" id="editGroupsContainer">
          ${groupsList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}" ${user.groups?.includes(g)?'checked':''}> ${g}</label>`).join('')}
        </div>
      </div>
      <div class="tab-module-form-group" style="grid-column:1/-1;">
        <label>Уведомления по ценникам</label>
        <div class="tab-module-groups-container" id="editGroupsMsgContainer">
          ${groupsMsgList.map(g=>`<label class="tab-module-group-checkbox"><input type="checkbox" value="${g}" ${user.groups_msg?.includes(g)?'checked':''}> ${g}</label>`).join('')}
        </div>
      </div>` : '';

    el.formFieldContainer().innerHTML = `
      <div class="tab-module-edit-grid">
        <div class="tab-module-form-group"><label>Имя</label><input type="text" id="editUserName" class="tab-module-input" value="${user.user_name||''}" data-field="user_name"></div>
        <div class="tab-module-form-group"><label>Отдел</label><select id="editUserDepartment" class="tab-module-select" data-field="user_department">${moduleState.availableDepartments.map(d=>`<option value="${d}" ${user.user_department===d?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="tab-module-form-group"><label>Подразделение</label><select id="editUserTeam" class="tab-module-select" data-field="user_team">${moduleState.availableTeams.map(t=>`<option value="${t}" ${user.user_team===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="tab-module-form-group"><label>Роль</label><select id="editUserRole" class="tab-module-select" data-field="role">${Object.entries(roleTranslation).map(([v,l])=>`<option value="${v}" ${user.role===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="tab-module-form-group"><label>TG ID</label><input type="text" id="editChatId" class="tab-module-input" value="${user.chat_id||''}" data-field="chat_id"></div>
        <div class="tab-module-form-group"><label>Табельный номер</label><input type="text" id="editId1c" class="tab-module-input" value="${user.id_1c||''}" data-field="id_1c"></div>
        <div class="tab-module-form-group"><label>Время прихода</label><input type="time" id="editTimeArrive" class="tab-module-input" value="${user.time_arrive||''}" data-field="time_arrive"></div>
        <div class="tab-module-form-group"><label>Время ухода</label><input type="time" id="editTimeLeave" class="tab-module-input" value="${user.time_leave||''}" data-field="time_leave"></div>
        <div class="tab-module-form-group"><label>Доступ</label><select id="editAccess" class="tab-module-select" data-field="access"><option value="true" ${user.access===true?'selected':''}>Активен</option><option value="false" ${user.access===false?'selected':''}>Заблокирован</option></select></div>
        <div class="tab-module-form-group"><label>Уведомления о нарушениях</label><select id="editNotifyViolations" class="tab-module-select" data-field="notify_violations"><option value="true" ${user.notify_violations===true?'selected':''}>Включены</option><option value="false" ${user.notify_violations===false?'selected':''}>Отключены</option></select></div>
        ${groupsHtml}
        <div class="tab-module-form-group" style="grid-column:1/-1;">
          <label>Рабочие дни</label>
          <div class="tab-module-workdays-container">
            ${['mon','tue','wed','thu','fri','sat','sun'].map(d=>`<label class="tab-module-workday-checkbox"><input type="checkbox" class="workday-input" value="${d}"> ${{mon:'Понедельник',tue:'Вторник',wed:'Среда',thu:'Четверг',fri:'Пятница',sat:'Суббота',sun:'Воскресенье'}[d]}</label>`).join('')}
          </div>
        </div>
      </div>
    `;

    if (user.work_days) {
      user.work_days.forEach(day => {
        const cb = el.formFieldContainer().querySelector(`.workday-input[value="${day}"]`);
        if (cb) cb.checked = true;
      });
    }

    el.editModal().classList.add('active');
  }

  function closeEditModal() {
    el.editModal().classList.remove('active');
    moduleState.currentEditUser = null;
  }

  function closeAddUserModal() {
    el.addUserModal().classList.remove('active');
  }

  async function saveFullEditedData(userId) {
    const user = moduleState.users.find(u => u.id == userId);
    if (!user) return;
    const canEditGroups = (user.role === 'shop' || user.role === 'shop_director') && canEdit();

    const fields = [
      { id: 'editUserName', field: 'user_name' },
      { id: 'editUserDepartment', field: 'user_department' },
      { id: 'editUserTeam', field: 'user_team' },
      { id: 'editUserRole', field: 'role' },
      { id: 'editChatId', field: 'chat_id' },
      { id: 'editId1c', field: 'id_1c' },
      { id: 'editTimeArrive', field: 'time_arrive' },
      { id: 'editTimeLeave', field: 'time_leave' },
      { id: 'editAccess', field: 'access', bool: true },
      { id: 'editNotifyViolations', field: 'notify_violations', bool: true },
    ];

    const updates = {};
    fields.forEach(f => {
      const elem = document.getElementById(f.id);
      if (!elem) return;
      updates[f.field] = f.bool ? elem.value === 'true' : elem.value;
    });

    const wdCbs = el.formFieldContainer().querySelectorAll('.workday-input:checked');
    updates['work_days'] = Array.from(wdCbs).map(cb => cb.value);

    if (canEditGroups) {
      updates['groups'] = Array.from(document.querySelectorAll('#editGroupsContainer input:checked')).map(cb => cb.value);
      updates['groups_msg'] = Array.from(document.querySelectorAll('#editGroupsMsgContainer input:checked')).map(cb => cb.value);
    }

    try {
      for (const [field, value] of Object.entries(updates)) {
        const r = await fetch(`/api/tabnumber-users/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ field, value, modified_by: currentUserChatId })
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }

      const idx = moduleState.users.findIndex(u => u.id == userId);
      if (idx !== -1) {
        Object.assign(moduleState.users[idx], updates);
        moduleState.filteredUsers = applyFiltersToUsers();
        renderUsers();
        if (updates['work_days']) {
          await loadScheduleData(scheduleState.year, scheduleState.month);
        }
      }

      closeEditModal();
      showToast('Данные сохранены', 'success');
    } catch(err) {
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  }

  async function saveEditedData() {
    const userId = el.editUserId().value;
    const field = el.editField().value;

    if (field === '__full__') { await saveFullEditedData(userId); return; }

    let value;
    if (field === 'work_days') {
      value = getWorkDaysFromCheckboxes('editWorkDay');
    } else if (field === 'notify_violations' || field === 'access') {
      value = document.getElementById('editValue').value === 'true';
    } else if (field === 'groups') {
      value = Array.from(document.querySelectorAll('#editGroupsModalContainer input:checked')).map(cb => cb.value);
    } else if (field === 'groups_msg') {
      value = Array.from(document.querySelectorAll('#formFieldContainer .tab-module-groups-container input:checked')).map(cb => cb.value);
    } else {
      value = document.getElementById('editValue').value;
    }

    try {
      const r = await fetch(`/api/tabnumber-users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ field, value, modified_by: currentUserChatId })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const idx = moduleState.users.findIndex(u => u.id == userId);
      if (idx !== -1) {
        moduleState.users[idx][field] = value;
        moduleState.filteredUsers = applyFiltersToUsers();
        renderUsers();
        if (field === 'work_days') await loadScheduleData(scheduleState.year, scheduleState.month);
      }

      closeEditModal();
      showToast('Данные сохранены', 'success');
    } catch(err) {
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  }

  async function createNewUser(e) {
    e.preventDefault();
    if (!canEdit()) return;

    const chatIdValue = document.getElementById('newUserChatId').value.trim();
    if (!chatIdValue) { showToast('TG ID обязателен', 'error'); return; }

    const existing = moduleState.users.find(u => u.chat_id === chatIdValue);
    if (existing) { showToast(`Пользователь с TG ID уже существует: ${existing.user_name}`, 'error'); return; }

    const newUserData = {
      user_name: document.getElementById('newUserName').value,
      user_department: document.getElementById('newUserDepartment').value,
      user_team: currentUserRole === 'shop_director' ? currentUserTeam : document.getElementById('newUserTeam').value,
      chat_id: chatIdValue,
      id_1c: document.getElementById('newUserId1c').value || null,
      time_arrive: document.getElementById('newUserTimeArrive').value || null,
      time_leave: document.getElementById('newUserTimeLeave').value || null,
      role: document.getElementById('newUserRole').value,
      access: document.getElementById('newUserAccess').value === 'true',
      notify_violations: document.getElementById('newUserNotifyViolations').value === 'true',
      work_days: getWorkDaysFromCheckboxes('newWorkDay'),
      groups: Array.from(document.querySelectorAll('#newGroupsContainer input:checked')).map(cb => cb.value),
      groups_msg: Array.from(document.querySelectorAll('#newGroupsMsgContainer input:checked')).map(cb => cb.value)
    };

    try {
      const r = await fetch('/api/tabnumber-users', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(newUserData)
      });
      if (!r.ok) {
        const errData = await r.json();
        if (r.status === 409) { showToast(`Ошибка: ${errData.error}`, 'error'); }
        else throw new Error(`HTTP ${r.status}`);
        return;
      }
      const { user } = await r.json();
      moduleState.users.push(user);
      if (!moduleState.availableTeams.includes(user.user_team)) moduleState.availableTeams = [...moduleState.availableTeams, user.user_team].sort();
      if (!moduleState.availableDepartments.includes(user.user_department)) moduleState.availableDepartments = [...moduleState.availableDepartments, user.user_department].sort();
      updateFilters();
      moduleState.filteredUsers = applyFiltersToUsers();
      sortUsersByName();
      renderUsers();
      closeAddUserModal();
      showToast('Пользователь добавлен', 'success');
    } catch(err) {
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  }

  function applyFiltersToUsers() {
    const teamFilter = currentUserRole === 'shop_director' && currentUserTeam ? currentUserTeam : (el.filterTeam()?.value || '');
    const deptFilter = el.filterDepartment()?.value || '';
    const nameSearch = (el.searchName()?.value || '').toLowerCase();
    return moduleState.users.filter(u => {
      const matchTeam = !teamFilter || u.user_team === teamFilter;
      const matchDept = !deptFilter || u.user_department === deptFilter;
      const matchName = !nameSearch || (u.user_name||'').toLowerCase().includes(nameSearch);
      return matchTeam && matchDept && matchName;
    });
  }

  function applyFilters() {
    moduleState.filteredUsers = applyFiltersToUsers();
    renderUsers();
  }

  function initSettingsPanel() {
    const panel = document.querySelector('.tab-module-settings-panel');
    const toggleBtn = document.querySelector('.tab-module-settings-toggle');
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        toggleBtn.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
      });
    }

    const toggleMap = [
      { id:'toggleTgId', key:'tg_id' },
      { id:'toggleTabNumber', key:'tab_number' },
      { id:'toggleTimeArrive', key:'time_arrive' },
      { id:'toggleTimeLeave', key:'time_leave' },
      { id:'toggleAccess', key:'access' },
      { id:'toggleNotify', key:'notify_violations' },
      { id:'toggleWorkDays', key:'work_days' },
    ];
    toggleMap.forEach(({ id, key }) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.addEventListener('change', e => {
          columnVisibility[key] = e.target.checked;
          saveColumnVisibility();
          if (!IS_MOBILE()) { showDataTab(); }
        });
      }
    });
  }

  function init() {
    const tabBtns = document.querySelectorAll('.tab-module-tab-btn');
    const mobile = IS_MOBILE();

    if (mobile) {
      tabBtns.forEach(btn => {
        if (btn.dataset.tab === 'data') btn.style.display = 'none';
      });
      tabBtns.forEach(t => t.classList.remove('active'));
      const scheduleBtn = document.querySelector('.tab-module-tab-btn[data-tab="schedule"]');
      if (scheduleBtn) scheduleBtn.classList.add('active');
      const bar = document.getElementById('controlsBar');
      if (bar) bar.style.display = 'none';
    }

    tabBtns.forEach(tab => {
      tab.addEventListener('click', async () => {
        const tabId = tab.dataset.tab;
        tabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const controlsBar = document.getElementById('controlsBar');
        const exportButtons = el.scheduleExportButtons();
        
        if (tabId === 'schedule') {
          if (controlsBar) controlsBar.style.display = '';
          if (exportButtons) exportButtons.style.display = 'flex';
          await loadScheduleData(scheduleState.year, scheduleState.month);
          renderScheduleTab();
        } else if (tabId === 'calendar') {
          if (controlsBar) controlsBar.style.display = 'none';
          if (exportButtons) exportButtons.style.display = 'none';
          renderProductionCalendar();
        } else if (tabId === 'logs') {
          if (controlsBar) controlsBar.style.display = '';
          if (exportButtons) exportButtons.style.display = 'none';
          loadLogs();
        } else {
          if (controlsBar) controlsBar.style.display = '';
          if (exportButtons) exportButtons.style.display = 'none';
          showDataTab();
        }
      });
    });

    el.filterTeam()?.addEventListener('change', () => { applyFilters(); });
    el.filterDepartment()?.addEventListener('change', () => { applyFilters(); });
    el.searchName()?.addEventListener('input', () => { applyFilters(); });
    el.addUserBtn()?.addEventListener('click', () => {
      if (!canEdit()) return;
      el.addUserForm().reset();
      ['mon','tue','wed','thu','fri'].forEach(d => {
        const cb = document.getElementById(`newWorkDay${d.charAt(0).toUpperCase()+d.slice(1)}`);
        if (cb) cb.checked = true;
      });
      el.addUserModal().classList.add('active');
    });
    
    el.downloadWorkDaysExcelBtn()?.addEventListener('click', downloadWorkDaysToExcel);
    el.downloadNonWorkDaysExcelBtn()?.addEventListener('click', downloadNonWorkDaysToExcel);

    el.editForm()?.addEventListener('submit', e => { e.preventDefault(); saveEditedData(); });
    el.addUserForm()?.addEventListener('submit', createNewUser);

    document.querySelectorAll('.tab-module-modal-close, .modal-close').forEach(btn => {
      btn.addEventListener('click', e => {
        const modal = e.target.closest('.tab-module-modal');
        if (modal) modal.classList.remove('active');
      });
    });

    el.editModal()?.addEventListener('click', e => { if (e.target === el.editModal()) closeEditModal(); });
    el.addUserModal()?.addEventListener('click', e => { if (e.target === el.addUserModal()) closeAddUserModal(); });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const activeTab = document.querySelector('.tab-module-tab-btn.active')?.dataset.tab;
        const controlsBar = document.getElementById('controlsBar');
        const exportButtons = el.scheduleExportButtons();
        
        if (activeTab === 'calendar') {
          if (controlsBar) controlsBar.style.display = 'none';
          if (exportButtons) exportButtons.style.display = 'none';
        } else if (activeTab === 'schedule' || activeTab === 'logs' || activeTab === 'data') {
          updateControlsBarVisibility();
          if (activeTab === 'schedule' && exportButtons) exportButtons.style.display = 'flex';
          else if (exportButtons) exportButtons.style.display = 'none';
        }
        
        if (activeTab === 'schedule') renderScheduleTab();
        else if (activeTab === 'calendar') renderProductionCalendar();
      }, 150);
    });

    initSettingsPanel();

    fetchUsers().then(async () => {
      if (mobile) {
        await loadScheduleData(scheduleState.year, scheduleState.month);
        renderMobileSchedule();
      } else {
        showDataTab();
      }
    }).catch(err => {
      console.error('init: fetchUsers error', err);
    });
  }

  init();
}