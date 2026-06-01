export async function loadModule(container, {}) {

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  container.innerHTML = `
  <div class="security-module-wrapper">
    <div class="security-module-main">
      <div class="security-module-header-section">
        <div class="security-module-color-legend">
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-on-time"></div>
            <span>Нет нарушений/одобренный запрос</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-violation"></div>
            <span>Нарушение</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-holiday"></div>
            <span>Выходной/не проверяется</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-resolved"></div>
            <span>Согласовано</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-no-schedule"></div>
            <span>Без графика/не проверяется</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-approved"></div>
            <span>Одобренный запрос</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-vacation"></div>
            <span>Отпуск/больничный</span>
          </div>
          <div class="security-module-legend-item">
            <div class="security-module-legend-color security-module-cell-schedule-ahead"></div>
            <span>Плановый график</span>
          </div>
        </div>
        
        <div class="security-module-filters">
          <div class="security-module-filter-group">
            <label for="securityModuleDateFilter">Месяц и год</label>
            <input type="month" id="securityModuleDateFilter" value="${currentYear}-${String(currentMonth + 1).padStart(2, '0')}">
          </div>
          <div class="security-module-filter-group">
            <label for="securityModuleUserSearch">Поиск сотрудника</label>
            <input type="text" id="securityModuleUserSearch" placeholder="Введите имя...">
          </div>
          <div class="security-module-filter-group">
            <label for="securityModuleDepartmentFilter">Отдел</label>
            <select id="securityModuleDepartmentFilter">
              <option value="Офис" selected>Офис</option>
              <option value="Склад">Склад</option>
              <option value="Фабрика">Фабрика</option>
            </select>
          </div>
          <div class="security-module-filter-group">
            <label for="securityModuleSubDepartmentFilter">Подразделение</label>
            <select id="securityModuleSubDepartmentFilter">
              <option value="">Все</option>
              <option value="team1">Команда 1</option>
              <option value="team2">Команда 2</option>
            </select>
          </div>
        </div>
        
        <div class="security-module-tabs-nav">
          <button class="security-module-tab-btn active" data-tab="attendance">Посещаемость</button>
          <button class="security-module-tab-btn" data-tab="analytics">Аналитика</button>
          <button class="security-module-tab-btn" data-tab="report">Отчет</button>
        </div>
      </div>
      
      <div class="security-module-scrollable-content">
        <div id="attendanceTab" class="security-module-tab-content active">
          <div class="security-module-table-wrap">
            <table class="security-module-data-table">
              <thead id="securityModuleDataTableHead"></thead>
              <tbody id="securityModuleDataTableBody"></tbody>
            </table>
          </div>
        </div>
        
        <div id="analyticsTab" class="security-module-tab-content">
          <div class="security-module-analytics-scroll">
            <div id="analyticsResults"></div>
          </div>
          <div class="security-module-bottom-bar">
            <button id="downloadExcelBtn" class="security-module-btn security-module-btn-primary">⬇ Скачать Excel</button>
          </div>
        </div>
        
        <div id="reportTab" class="security-module-tab-content">
          <div class="security-module-table-wrap">
            <table class="security-module-report-table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Комментарий</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody id="reportTableBody"></tbody>
            </table>
          </div>
          <div class="security-module-bottom-bar">
            <button id="sendReportBtn" class="security-module-btn security-module-btn-primary">↗ Отправить отчет</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="security-module-sidebar">
      <h2 class="security-module-sidebar-title">Настройки</h2>
      <div id="securityModuleSettings"></div>
    </div>
  </div>
  <div class="security-module-toast-container" id="toastContainer"></div>
`;

  let isLoading = false;
  let dataLoaded = false;

  const moduleState = {
    users: new Set(),
    currentData: [],
    userData: {},
    crmData: [],
    showEntryLeaveCount: false,
    id1cToChatId: {},
    chatIdToCrmRequests: {},
    filters: {
      month: currentMonth,
      year: currentYear,
      userSearch: '',
      department: 'Офис',
      subDepartment: ''
    },
    editing: null,
    hideCleanUsers: true,
    showTimes: true,
    activeTab: 'attendance',
    analyticsData: [],
    showVacationUsers: false,
    settings: {
      showTimes: true,
      hideCleanUsers: true,
      showEntryLeaveCount: false,
      showVacationUsers: false,
      showAnalyticsTab: true,
      showReportTab: true,
      expandedSettings: ['displayControls']
    },
    scheduleAhead: {}
  };

  const toastContainer = document.getElementById('toastContainer');
  const dateFilter = document.getElementById('securityModuleDateFilter');
  const userSearch = document.getElementById('securityModuleUserSearch');
  const departmentFilter = document.getElementById('securityModuleDepartmentFilter');
  const subDepartmentFilter = document.getElementById('securityModuleSubDepartmentFilter');
  const dataTableHead = document.getElementById('securityModuleDataTableHead');
  const dataTableBody = document.getElementById('securityModuleDataTableBody');
  const analyticsResults = document.getElementById('analyticsResults');
  const tabBtns = document.querySelectorAll('.security-module-tab-btn');
  const tabContents = document.querySelectorAll('.security-module-tab-content');
  const analyticsTabBtn = document.querySelector('[data-tab="analytics"]');
  const reportTabBtn = document.querySelector('[data-tab="report"]');
  const settingsContainer = document.getElementById('securityModuleSettings');

  function loadUserSettings() {
    const saved = localStorage.getItem('security-module-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      moduleState.settings = { ...moduleState.settings, ...parsed };
    }
    applySettings();
  }

  function saveUserSettings() {
    localStorage.setItem('security-module-settings', JSON.stringify(moduleState.settings));
  }

  function applySettings() {
    moduleState.showTimes = moduleState.settings.showTimes;
    moduleState.hideCleanUsers = moduleState.settings.hideCleanUsers;
    moduleState.showEntryLeaveCount = moduleState.settings.showEntryLeaveCount;
    moduleState.showVacationUsers = moduleState.settings.showVacationUsers;
    
    if (analyticsTabBtn) {
      analyticsTabBtn.style.display = moduleState.settings.showAnalyticsTab ? 'block' : 'none';
    }
    
    if (reportTabBtn) {
      reportTabBtn.style.display = moduleState.settings.showReportTab ? 'block' : 'none';
    }
    
    if (!moduleState.settings.showAnalyticsTab && moduleState.activeTab === 'analytics') {
      document.querySelector('[data-tab="attendance"]').click();
    }
    if (!moduleState.settings.showReportTab && moduleState.activeTab === 'report') {
      document.querySelector('[data-tab="attendance"]').click();
    }
    
    if (moduleState.currentData.length > 0) {
      renderDataTable(moduleState.currentData);
      generateAnalyticsReport();
    }
  }

  function renderSettings() {
    const settingsData = [
      {
        id: 'displayControls',
        title: 'Режимы отображения',
        settings: [
          {
            id: 'showTimes',
            label: 'Показывать время',
            type: 'toggle',
            value: moduleState.settings.showTimes
          },
          {
            id: 'hideCleanUsers',
            label: 'Скрыть без нарушений',
            type: 'toggle',
            value: moduleState.settings.hideCleanUsers
          },
          {
            id: 'showEntryLeaveCount',
            label: 'Показывать входы/выходы',
            type: 'toggle',
            value: moduleState.settings.showEntryLeaveCount
          },
          {
            id: 'showVacationUsers',
            label: 'Только в отпуске/больничном',
            type: 'toggle',
            value: moduleState.settings.showVacationUsers
          }
        ]
      },
      {
        id: 'tabVisibility',
        title: 'Видимость вкладок',
        settings: [
          {
            id: 'showAnalyticsTab',
            label: 'Показывать вкладку "Аналитика"',
            type: 'toggle',
            value: moduleState.settings.showAnalyticsTab
          },
          {
            id: 'showReportTab',
            label: 'Показывать вкладку "Отчет"',
            type: 'toggle',
            value: moduleState.settings.showReportTab
          }
        ]
      }
    ];

    let settingsHTML = '';

    settingsData.forEach(settingGroup => {
      const isExpanded = moduleState.settings.expandedSettings.includes(settingGroup.id);

      settingsHTML += `
        <div class="security-module-settings-block">
          <div class="security-module-settings-header" data-setting="${settingGroup.id}">
            <h3>${settingGroup.title}</h3>
            <svg class="security-module-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="security-module-settings-content ${isExpanded ? 'expanded' : ''}">
      `;

      settingGroup.settings.forEach(setting => {
        settingsHTML += `
          <div class="security-module-setting-item">
            <span class="security-module-setting-label">
              ${setting.label}
            </span>
            <label class="security-module-toggle">
              <input type="checkbox" 
                     ${setting.value ? 'checked' : ''}
                     data-setting="${setting.id}">
              <span class="security-module-slider"></span>
            </label>
          </div>
        `;
      });

      settingsHTML += `</div></div>`;
    });

    settingsContainer.innerHTML = settingsHTML;

    settingsContainer.querySelectorAll('.security-module-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const settingId = header.dataset.setting;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.security-module-expand-icon');

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

    settingsContainer.querySelectorAll('.security-module-toggle input').forEach(input => {
      input.addEventListener('change', (e) => {
        const settingId = e.target.dataset.setting;
        moduleState.settings[settingId] = e.target.checked;
        saveUserSettings();
        applySettings();
      });
    });
  }

  tabBtns.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      tabBtns.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabContents.forEach(c => c.classList.remove('active'));
      document.getElementById(`${tabId}Tab`).classList.add('active');
      moduleState.activeTab = tabId;
      if (tabId === 'report') loadReportTab();
    });
  });
  
  dateFilter.addEventListener('change', function() {
    if (isLoading) return;
    const [year, month] = this.value.split('-').map(Number);
    moduleState.filters.year = year;
    moduleState.filters.month = month - 1;
    loadData();
  });

  subDepartmentFilter.addEventListener('change', function() {
    if (isLoading) return;
    moduleState.filters.subDepartment = this.value;
    loadData();
  });
  
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const debouncedFilter = debounce(function() {
    if (isLoading) return;
    moduleState.filters.userSearch = this.value.toLowerCase();
    filterAndRenderTable();
    generateAnalyticsReport();
  }, 300);
  
  document.getElementById('sendReportBtn')?.addEventListener('click', sendReport);
  document.getElementById('downloadExcelBtn')?.addEventListener('click', downloadExcel);
  
  userSearch.addEventListener('input', debouncedFilter);

  departmentFilter.addEventListener('change', function() {
    if (isLoading) return;
    moduleState.filters.department = this.value;
    loadData();
  });

  document.addEventListener('click', function(event) {
    if (moduleState.editing && !event.target.closest('.security-module-edit-form-inline') && !event.target.closest('.security-module-attendance-cell')) {
      closeAllEditForms();
    }
  });
  
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `security-module-toast security-module-status-${type}`;
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
  
function generateScheduleAhead() {
  const year = moduleState.filters.year;
  const month = moduleState.filters.month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  moduleState.scheduleAhead = {};
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const dateKey = formatDate(date);
    const dbDateKey = formatDateForDB(date);
    
    moduleState.scheduleAhead[dateKey] = {
      date: dbDateKey,
      isScheduleAhead: date > today
    };
  }
}

  function userHasViolations(userId) {
    if (!moduleState.analyticsData || moduleState.analyticsData.length === 0) return true;
    const userReport = moduleState.analyticsData.find(r => r.userId === userId);
    if (!userReport) return false;
    const userSchedule = userId ? moduleState.userData[userId] : null;
    if (!userSchedule || (!userSchedule.time_arrive && !userSchedule.time_leave)) return false;
    const hasArriveViolations = userSchedule.time_arrive && 
      (userReport.totalViolationMinutes > 0 || userReport.lateCount > 0 || userReport.missingArriveCount > 0);
    const hasLeaveViolations = userSchedule.time_leave && 
      (userReport.totalViolationMinutes > 0 || userReport.earlyLeaveCount > 0 || userReport.missingLeaveCount > 0);
    return hasArriveViolations || hasLeaveViolations;
  }
  
  async function generateAnalyticsReport() {
    try {
      const month = String(moduleState.filters.month + 1).padStart(2, '0');
      const yearMonth = `${moduleState.filters.year}-${month}`;

      const existingReports = await fetch(`/api/security-report?month=${encodeURIComponent(yearMonth)}`).then(r => r.json());

      const startDate = formatDateForDB(new Date(moduleState.filters.year, moduleState.filters.month, 1));
      const endDate = formatDateForDB(new Date(moduleState.filters.year, moduleState.filters.month + 1, 0));
      const holidays = await fetch(`/api/holidays?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`).then(r => r.json());

      const holidayDates = new Set();
      if (Array.isArray(holidays)) {
        holidays.forEach(holiday => { holidayDates.add(formatDateForDB(new Date(holiday.date))); });
      }

      const reportsMap = {};
      if (Array.isArray(existingReports)) {
        existingReports.forEach(report => { reportsMap[report.user] = report; });
      }

      const userReports = {};

      const violationCells = document.querySelectorAll('.security-module-attendance-cell.security-module-cell-violation');

      violationCells.forEach(cell => {
        const userName = cell.dataset.user;
        const userId = cell.dataset.userId;
        const date = cell.dataset.date;
        const displayDate = cell.dataset.displayDate;
        const arriveTime = cell.dataset.arrive;
        const leaveTime = cell.dataset.leave;
        
        if (!userReports[userId]) {
          userReports[userId] = {
            user: userName,
            userId: userId,
            totalViolationMinutes: 0,
            lateCount: 0,
            earlyLeaveCount: 0,
            missingArriveCount: 0,
            missingLeaveCount: 0,
            requestCount: 0,
            violations: [],
            comment: '',
            hasSchedule: false
          };
        }

        const userSchedule = userId ? moduleState.userData[userId] : null;
        if (userSchedule && (userSchedule.time_arrive || userSchedule.time_leave)) {
          userReports[userId].hasSchedule = true;

          if (userSchedule.time_arrive) {
            if (arriveTime === "-" || !arriveTime) {
              userReports[userId].missingArriveCount++;
              userReports[userId].violations.push({ date, type: 'missing_arrive', minutes: 0, displayDate });
            } else {
              const arrivalOnTime = isArrivalOnTime(arriveTime, userSchedule.time_arrive);
              if (!arrivalOnTime) {
                const scheduledArrival = parseTimeString(userSchedule.time_arrive);
                const actualArrival = parseTimeString(arriveTime);
                if (scheduledArrival && actualArrival) {
                  const minutesLate = Math.round((actualArrival - scheduledArrival) / (1000 * 60));
                  if (!isNaN(minutesLate) && minutesLate > 0) {
                    userReports[userId].lateCount++;
                    userReports[userId].totalViolationMinutes += minutesLate;
                    userReports[userId].violations.push({ date, type: 'late', minutes: minutesLate, arriveTime, scheduledArrive: userSchedule.time_arrive, displayDate });
                  }
                }
              }
            }
          }

          if (userSchedule.time_leave) {
            if (leaveTime === "-" || !leaveTime) {
              userReports[userId].missingLeaveCount++;
              userReports[userId].violations.push({ date, type: 'missing_leave', minutes: 0, displayDate });
            } else {
              const leaveOnTime = isDepartureOnTime(leaveTime, userSchedule.time_leave);
              if (!leaveOnTime) {
                const scheduledDeparture = parseTimeString(userSchedule.time_leave);
                const actualDeparture = parseTimeString(leaveTime);
                if (scheduledDeparture && actualDeparture) {
                  const minutesEarly = Math.round((scheduledDeparture - actualDeparture) / (1000 * 60));
                  if (!isNaN(minutesEarly) && minutesEarly > 0) {
                    userReports[userId].earlyLeaveCount++;
                    userReports[userId].totalViolationMinutes += minutesEarly;
                    userReports[userId].violations.push({ date, type: 'early', minutes: minutesEarly, leaveTime, scheduledLeave: userSchedule.time_leave, displayDate });
                  }
                }
              }
            }
          }
        }
      });

      Array.from(moduleState.users).forEach(userName => {
        if (moduleState.filters.userSearch && !userName.toLowerCase().includes(moduleState.filters.userSearch)) return;
        const userId = getUserIdByDisplayName(userName);
        if (!userReports[userId]) {
          userReports[userId] = {
            user: userName, userId, totalViolationMinutes: 0, lateCount: 0,
            earlyLeaveCount: 0, missingArriveCount: 0, missingLeaveCount: 0,
            requestCount: 0, violations: [], comment: '', hasSchedule: false
          };
        }
        if (reportsMap[userName]) {
          userReports[userId].comment = reportsMap[userName].comment || '';
        }
        const chatId = moduleState.id1cToChatId[userId];
        if (chatId && moduleState.chatIdToCrmRequests[chatId]) {
          const selectedMonthStart = new Date(moduleState.filters.year, moduleState.filters.month, 1);
          const selectedMonthEnd = new Date(moduleState.filters.year, moduleState.filters.month + 1, 0);
          userReports[userId].requestCount = moduleState.chatIdToCrmRequests[chatId]
            .filter(request => request.dates.some(date => date >= selectedMonthStart && date <= selectedMonthEnd))
            .length;
        }
      });

      let reports = Object.values(userReports);
      reports.sort((a, b) => b.totalViolationMinutes - a.totalViolationMinutes);

      if (moduleState.hideCleanUsers) {
        reports = reports.filter(report =>
          report.totalViolationMinutes > 0 || report.lateCount > 0 ||
          report.earlyLeaveCount > 0 || report.missingArriveCount > 0 || report.missingLeaveCount > 0
        );
      }

      moduleState.analyticsData = reports;
      renderAnalyticsResults(reports);
    } catch (error) {
      analyticsResults.innerHTML = '<div class="security-module-empty-state" style="color:#f87171;">Не удалось сформировать отчет. Пожалуйста, повторите попытку.</div>';
    }
  }
  
  function renderAnalyticsResults(reports) {
    if (reports.length === 0) {
      analyticsResults.innerHTML = '<div class="security-module-empty-state">Нет данных для отображения</div>';
      return;
    }
    
    analyticsResults.innerHTML = '';
    
    reports.forEach(report => {
      const card = document.createElement('div');
      card.className = 'security-module-analytics-card';
      
      const violationHours = Math.floor(report.totalViolationMinutes / 60);
      const violationMinutes = report.totalViolationMinutes % 60;
      const violationTimeStr = violationHours > 0 ? `${violationHours}ч ${violationMinutes}м` : `${violationMinutes}м`;
      
      card.innerHTML = `
        <div class="security-module-analytics-card-header">
          <h3>${report.user}</h3>
        </div>
        <div class="security-module-analytics-stats-grid">
          <div class="security-module-stat-tile">
            <h4>Время нарушений</h4>
            <p class="security-module-stat-violation">${violationTimeStr}</p>
          </div>
          <div class="security-module-stat-tile">
            <h4>Опоздания</h4>
            <p class="security-module-stat-violation">${report.lateCount}</p>
          </div>
          <div class="security-module-stat-tile">
            <h4>Ранние уходы</h4>
            <p class="security-module-stat-violation">${report.earlyLeaveCount}</p>
          </div>
          <div class="security-module-stat-tile">
            <h4>Нет прихода</h4>
            <p class="security-module-stat-violation">${report.missingArriveCount}</p>
          </div>
          <div class="security-module-stat-tile">
            <h4>Нет ухода</h4>
            <p class="security-module-stat-violation">${report.missingLeaveCount}</p>
          </div>
          <div class="security-module-stat-tile">
            <h4>Запросы</h4>
            <p class="security-module-stat-request">${report.requestCount}</p>
          </div>
        </div>
        ${report.violations.length > 0 ? `
          <div class="security-module-violations-table-wrap">
            <table class="security-module-violations-table">
              <thead>
                <tr>
                  <th>Дата</th><th>Тип</th><th>Время</th><th>По расписанию</th><th>Разница</th>
                </tr>
              </thead>
              <tbody>
                ${report.violations.map(v => `
                  <tr>
                    <td>${formatDate(new Date(v.date))}</td>
                    <td>${v.type === 'late' ? 'Опоздание' : v.type === 'early' ? 'Ранний уход' : v.type === 'missing_arrive' ? 'Нет прихода' : v.type === 'missing_leave' ? 'Нет ухода' : 'Неизвестно'}</td>
                    <td>${v.type === 'late' ? v.arriveTime : v.type === 'early' ? v.leaveTime : '—'}</td>
                    <td>${v.type === 'late' ? v.scheduledArrive : v.type === 'early' ? v.scheduledLeave : '—'}</td>
                    <td>${v.minutes > 0 ? `${v.minutes} мин` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--sm-text-muted);font-size:13px;margin:0;">Нарушений не обнаружено</p>'}
        <div class="security-module-analytics-comment-section">
          <h4>Комментарий</h4>
          <textarea id="comment-${report.userId}" placeholder="Добавьте комментарий...">${report.comment || ''}</textarea>
          <button class="security-module-btn security-module-btn-save security-module-analytics-save-btn" data-user-id="${report.userId}">Сохранить отчет</button>
        </div>
      `;
      
      analyticsResults.appendChild(card);
    });
    
    document.querySelectorAll('.security-module-analytics-save-btn').forEach(btn => {
      btn.addEventListener('click', () => saveAnalyticsReport(btn.dataset.userId));
    });
  }
  
  async function saveAnalyticsReport(userId) {
    try {
      const report = moduleState.analyticsData.find(r => r.userId === userId);
      if (!report) return;
      const comment = document.getElementById(`comment-${userId}`)?.value || '';
      showToast('Сохранение отчета...', 'loading');
      const month = String(moduleState.filters.month + 1).padStart(2, '0');
      const yearMonth = `${moduleState.filters.year}-${month}`;
      const reportData = {
        user: report.user,
        month: yearMonth,
        comment,
        violations: JSON.stringify({
          totalViolationMinutes: report.totalViolationMinutes,
          lateCount: report.lateCount,
          earlyLeaveCount: report.earlyLeaveCount,
          violations: report.violations
        }),
        requests: report.requestCount.toString()
      };
      const response = await fetch('/api/security-report/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось сохранить отчет');
      showToast('Отчет сохранен', 'success');
    } catch (error) {
      showToast(`Ошибка сохранения отчета: ${error.message}`, 'error');
    }
  }
  
  function updateCellContents() {
    const cells = document.querySelectorAll('.security-module-attendance-cell');
    cells.forEach(cell => {
      const arriveTime = cell.dataset.arrive || '';
      const leaveTime = cell.dataset.leave || '';
      const reader1 = cell.dataset.countReader1 || '';
      const reader2 = cell.dataset.countReader2 || '';
      const userId = cell.dataset.userId;

      cell.innerHTML = '';

      if (moduleState.showEntryLeaveCount) {
        const count1 = parseInt(reader1 || '0', 10);
        const count2 = parseInt(reader2 || '0', 10);
        if (!isNaN(count1) || !isNaN(count2)) {
          const countDisplay = document.createElement('div');
          countDisplay.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:4px;font-size:12px;line-height:1;white-space:nowrap;flex-direction:column;';
          const isEqual = count1 === count2;
          const color = isEqual ? '#4ade80' : '#f87171';
          if (!isNaN(count1)) {
            const right = document.createElement('div');
            right.textContent = `➡️ ${count1}`;
            right.style.color = color;
            countDisplay.appendChild(right);
          }
          if (!isNaN(count2)) {
            const left = document.createElement('div');
            left.textContent = `⬅️ ${count2}`;
            left.style.color = color;
            countDisplay.appendChild(left);
          }
          cell.appendChild(countDisplay);
        }
      } else if (moduleState.showTimes) {
        if (arriveTime || leaveTime) {
          const timeDisplay = document.createElement('div');
          timeDisplay.className = 'security-module-cell-time';
          if (arriveTime) {
            const arriveDiv = document.createElement('div');
            arriveDiv.textContent = formatTimeTo4Digits(arriveTime);
            timeDisplay.appendChild(arriveDiv);
          }
          if (leaveTime) {
            const leaveDiv = document.createElement('div');
            leaveDiv.textContent = formatTimeTo4Digits(leaveTime);
            timeDisplay.appendChild(leaveDiv);
          }
          cell.appendChild(timeDisplay);
        }
      } else {
        const userSchedule = userId ? moduleState.userData[userId] : null;
        const cellData = { arrive_time: arriveTime, leave_time: leaveTime };
        if (userSchedule) {
          const arrivalOnTime = isArrivalOnTime(cellData.arrive_time, userSchedule.time_arrive);
          const leaveOnTime = isDepartureOnTime(cellData.leave_time, userSchedule.time_leave);
          if (!arrivalOnTime) {
            const lateIndicator = document.createElement('span');
            lateIndicator.className = 'security-module-violation-indicator security-module-violation-late';
            const scheduledArrival = parseTimeString(userSchedule.time_arrive);
            const actualArrival = parseTimeString(cellData?.arrive_time);
            if (scheduledArrival && actualArrival) {
              const minutesLate = Math.round((actualArrival - scheduledArrival) / (1000 * 60));
              lateIndicator.textContent = !isNaN(minutesLate) ? `П ${minutesLate > 0 ? '+' : ''}${minutesLate}м` : 'П - нет';
            } else {
              lateIndicator.textContent = 'П - нет';
            }
            cell.appendChild(lateIndicator);
          }
          if (!leaveOnTime) {
            const earlyIndicator = document.createElement('span');
            earlyIndicator.className = 'security-module-violation-indicator security-module-violation-early';
            const scheduledDeparture = parseTimeString(userSchedule.time_leave);
            const actualDeparture = parseTimeString(cellData?.leave_time);
            if (scheduledDeparture && actualDeparture) {
              const timeDifference = Math.round((actualDeparture - scheduledDeparture) / (1000 * 60));
              earlyIndicator.textContent = !isNaN(timeDifference) ? `У ${timeDifference >= 0 ? '+' : ''}${timeDifference}м` : 'У - нет';
            } else {
              earlyIndicator.textContent = 'У - нет';
            }
            cell.appendChild(earlyIndicator);
          }
        }
        const date = cell.dataset.displayDate;
        const holidayDates = new Set();
        const isHoliday = holidayDates.has(date);
        const crmStatus = userId ? getCrmStatusForDate(userId, cell.dataset.date) : null;
        if (isHoliday) {
          const tooltip = document.createElement('div');
          tooltip.className = 'security-module-tooltip';
          tooltip.innerHTML = `<span class="security-module-tooltiptext">Выходной день</span>`;
          cell.appendChild(tooltip);
        } else if (crmStatus) {
          const tooltip = document.createElement('div');
          tooltip.className = 'security-module-tooltip';
          tooltip.innerHTML = `<span class="security-module-tooltiptext">${crmStatus === 'approved' ? 'Отгул: ' : 'Запрос: '}${crmStatus}</span>`;
          cell.appendChild(tooltip);
        }
      }
    });
  }

  function formatTimeTo4Digits(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`.substring(0, 5);
    }
    return timeStr;
  }
  
  async function loadReportTab() {
    try {
      const month = String(moduleState.filters.month + 1).padStart(2, '0');
      const yearMonth = `${moduleState.filters.year}-${month}`;
      const reports = await fetch(`/api/security-report?month=${encodeURIComponent(yearMonth)}`).then(r => r.json());
      renderReportTable(reports);
    } catch (error) {
      document.getElementById('reportTableBody').innerHTML = `
        <tr><td colspan="3" class="security-module-empty-state" style="color:#f87171;">Ошибка загрузки данных отчета</td></tr>
      `;
    }
  }

  function renderReportTable(reports) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    const filteredReports = reports ? reports.filter(report => report.comment && report.comment.trim() !== '') : [];
    if (!filteredReports || filteredReports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="security-module-empty-state">Нет данных для отображения</td></tr>`;
      return;
    }
    filteredReports.forEach(report => {
      const row = document.createElement('tr');
      row.dataset.reportId = report.id;
      row.innerHTML = `
        <td>${report.user}</td>
        <td>${report.comment}</td>
        <td class="security-module-report-actions-cell">
          <button class="security-module-btn-icon edit security-module-edit-report-btn" data-report-id="${report.id}">✏️</button>
          <button class="security-module-btn-icon delete security-module-delete-report-btn" data-report-id="${report.id}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    document.querySelectorAll('.security-module-edit-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); editReport(btn.dataset.reportId); });
    });
    document.querySelectorAll('.security-module-delete-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteReport(btn.dataset.reportId); });
    });
  }
  
  async function editReport(reportId) {
    try {
      const report = await fetch(`/api/security-report/${encodeURIComponent(reportId)}`).then(r => r.json());
      if (!report || !report.id) { showToast('Отчет не найден', 'error'); return; }
      const reportData = report;
      const form = document.createElement('div');
      form.className = 'security-module-edit-form-overlay';
      form.innerHTML = `
        <div class="security-module-edit-form-modal">
          <h3>Редактирование отчета</h3>
          <p>Сотрудник: ${reportData.user}</p>
          <div class="security-module-form-row">
            <label for="editReportComment">Комментарий</label>
            <textarea id="editReportComment">${reportData.comment || ''}</textarea>
          </div>
          <div class="security-module-form-actions">
            <button id="saveReportBtn" class="security-module-btn security-module-btn-save">Сохранить</button>
            <button id="cancelReportEditBtn" class="security-module-btn security-module-btn-cancel">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(form);
      document.getElementById('saveReportBtn')?.addEventListener('click', async () => {
        const newComment = document.getElementById('editReportComment').value;
        await updateReport(reportId, newComment);
        document.body.removeChild(form);
      });
      document.getElementById('cancelReportEditBtn')?.addEventListener('click', () => { document.body.removeChild(form); });
    } catch (error) {
      showToast(`Ошибка при редактировании отчета: ${error.message}`, 'error');
    }
  }
  
  async function updateReport(reportId, newComment) {
    try {
      showToast('Сохранение изменений...', 'loading');
      const response = await fetch(`/api/security-report/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось обновить отчет');
      await loadReportTab();
      showToast('Отчет успешно обновлен', 'success');
    } catch (error) {
      showToast(`Ошибка обновления отчета: ${error.message}`, 'error');
    }
  }
  
  async function deleteReport(reportId) {
    try {
      const confirmDelete = await new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'security-module-edit-form-overlay';
        modal.innerHTML = `
          <div class="security-module-edit-form-modal">
            <h3>Подтверждение удаления</h3>
            <p>Вы уверены, что хотите удалить этот отчет?</p>
            <div class="security-module-form-actions">
              <button id="confirmDeleteBtn" class="security-module-btn security-module-btn-save">Удалить</button>
              <button id="cancelDeleteBtn" class="security-module-btn security-module-btn-cancel">Отмена</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => { document.body.removeChild(modal); resolve(true); });
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => { document.body.removeChild(modal); resolve(false); });
      });
      if (!confirmDelete) return;
      showToast('Удаление отчета...', 'loading');
      const response = await fetch(`/api/security-report/${reportId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось удалить отчет');
      await loadReportTab();
      showToast('Отчет успешно удален', 'success');
    } catch (error) {
      showToast(`Ошибка удаления отчета: ${error.message}`, 'error');
    }
  }

  async function sendReport() {
    try {
      showToast('Отправка отчета...', 'loading');
      const month = moduleState.filters.month + 1;
      const year = moduleState.filters.year;
      const response = await fetch('/api/security-report/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось отправить отчет');
      showToast('Отчет успешно отправлен', 'success');
    } catch (error) {
      showToast(`Ошибка отправки отчета: ${error.message}`, 'error');
    }
  }

  async function downloadExcel() {
    try {
      showToast('Подготовка Excel файла...', 'loading');
      if (!moduleState.analyticsData || moduleState.analyticsData.length === 0) throw new Error('Нет данных для экспорта');
      const month = String(moduleState.filters.month + 1).padStart(2, '0');
      const yearMonth = `${moduleState.filters.year}-${month}`;
      if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => generateExcel(yearMonth);
        script.onerror = () => { throw new Error('Не удалось загрузить библиотеку для генерации Excel'); };
        document.head.appendChild(script);
        return;
      }
      generateExcel(yearMonth);
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, 'error');
    }
  }

  function generateExcel(yearMonth) {
    try {
      const workbook = XLSX.utils.book_new();
      const sheetData = moduleState.analyticsData.map(report => ({
        'Сотрудник': report.user,
        'Общее время нарушений (минут)': report.totalViolationMinutes,
        'Общее время нарушений (часы:минуты)': `${Math.floor(report.totalViolationMinutes / 60)}:${String(report.totalViolationMinutes % 60).padStart(2, '0')}`,
        'Количество опозданий': report.lateCount,
        'Количество ранних уходов': report.earlyLeaveCount,
        'Отсутствие прихода': report.missingArriveCount,
        'Отсутствие ухода': report.missingLeaveCount,
        'Количество запросов': report.requestCount,
        'Комментарий': report.comment || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!cols'] = [{wch:25},{wch:15},{wch:20},{wch:15},{wch:15},{wch:15},{wch:15},{wch:15},{wch:40}];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Аналитика посещаемости');
      if (moduleState.analyticsData.some(report => report.violations.length > 0)) {
        const violationsData = [];
        moduleState.analyticsData.forEach(report => {
          report.violations.forEach(violation => {
            violationsData.push({
              'Сотрудник': report.user,
              'Дата': formatDate(new Date(violation.date)),
              'Тип нарушения': violation.type === 'late' ? 'Опоздание' : violation.type === 'early' ? 'Ранний уход' : violation.type === 'missing_arrive' ? 'Отсутствие прихода' : violation.type === 'missing_leave' ? 'Отсутствие ухода' : 'Неизвестное нарушение',
              'Фактическое время': violation.type === 'late' ? violation.arriveTime : violation.type === 'early' ? violation.leaveTime : '—',
              'По расписанию': violation.type === 'late' ? violation.scheduledArrive : violation.type === 'early' ? violation.scheduledLeave : '—',
              'Разница (минут)': violation.minutes > 0 ? violation.minutes : '—'
            });
          });
        });
        if (violationsData.length > 0) {
          const violationsWorksheet = XLSX.utils.json_to_sheet(violationsData);
          violationsWorksheet['!cols'] = [{wch:25},{wch:12},{wch:20},{wch:15},{wch:15},{wch:15}];
          XLSX.utils.book_append_sheet(workbook, violationsWorksheet, 'Детали нарушений');
        }
      }
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_analytics_${yearMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
      showToast('Файл успешно скачан', 'success');
    } catch (error) {
      showToast(`Ошибка генерации Excel: ${error.message}`, 'error');
    }
  }

  async function loadData() {
    if (isLoading) return;
    
    isLoading = true;
    dataLoaded = false;
    
    generateScheduleAhead();
    
    try {
      const year = moduleState.filters.year;
      const month = moduleState.filters.month + 1;
      const department = moduleState.filters.department || 'Офис';
      const subDepartment = moduleState.filters.subDepartment || '';
      const url = `/api/security-data?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&department=${encodeURIComponent(department)}&sub_department=${encodeURIComponent(subDepartment)}&_t=${Date.now()}`;
      const resp = await fetch(url, { method: 'GET' });
      const raw = await resp.text();
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      let payload;
      try { payload = raw ? JSON.parse(raw) : {}; } catch (e) { throw e; }
      const { hikvision, users, requestsInfo, requestsDates, schedule } = payload;
      if (!Array.isArray(hikvision) || !Array.isArray(users)) throw new Error('Invalid data received from server');
      moduleState.userSchedulesByDay = {};
      if (Array.isArray(schedule)) {
        schedule.forEach(sch => {
          if (sch?.id_1c && sch?.work_days) moduleState.userSchedulesByDay[sch.id_1c] = sch.work_days;
        });
      }
      moduleState.id1cToChatId = {};
      moduleState.userData = {};
      moduleState.lastNameToUserId = {};
      moduleState.chatIdToCrmRequests = {};
      users.forEach(user => {
        if (user?.id_1c) {
          moduleState.id1cToChatId[user.id_1c] = user.chat_id;
          moduleState.userData[user.id_1c] = { ...user, displayName: `${user.user_name} (${user.id_1c})`, notify_violations: user.notify_violations !== false };
          moduleState.lastNameToUserId[user.id_1c] = user.id_1c;
        }
      });
      if (Array.isArray(requestsInfo) && Array.isArray(requestsDates)) {
        const datesByRequestId = {};
        requestsDates.forEach(rd => {
          if (!rd?.request_id || !rd?.date) return;
          const [y, m, d] = rd.date.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d, 0, 0, 0);
          if (isNaN(dateObj)) return;
          if (!datesByRequestId[rd.request_id]) datesByRequestId[rd.request_id] = [];
          datesByRequestId[rd.request_id].push(dateObj);
        });
        requestsInfo.forEach(request => {
          if (!request?.chat_id || !request?.request_id) return;
          if (!moduleState.chatIdToCrmRequests[request.chat_id]) moduleState.chatIdToCrmRequests[request.chat_id] = [];
          moduleState.chatIdToCrmRequests[request.chat_id].push({
            request_id: request.request_id,
            dates: datesByRequestId[request.request_id] || [],
            status: request.status,
            type: request.request_type
          });
        });
      }
      moduleState.currentData = hikvision.map(record => {
        const userId = record.last_name;
        const userObj = userId ? moduleState.userData[userId] : null;
        if (userObj && userObj.notify_violations === false) {
          return { ...record, user: userObj.displayName, employee_id: record.employee_id, first_name: record.first_name, date: record.access_date, freeAttendance: true };
        }
        if (userId && userObj?.displayName) {
          return { ...record, user: userObj.displayName, employee_id: record.employee_id, first_name: record.first_name, date: record.access_date };
        }
        return { ...record, user: `${record.first_name} (${record.employee_id})`, employee_id: record.employee_id, first_name: record.first_name, date: record.access_date };
      });
      updateUsersList(moduleState.currentData);
      renderDataTable(moduleState.currentData);
      generateAnalyticsReport();
      loadReportTab();
      
      dataLoaded = true;
    } catch (error) {
      moduleState.currentData = [];
    } finally {
      isLoading = false;
    }
  }

  function getCrmStatusForDate(userId, date) {
    if (!userId || !moduleState.userData[userId]) return null;
    const chatId = moduleState.id1cToChatId[userId];
    if (!chatId || !moduleState.chatIdToCrmRequests[chatId]) return null;
    const formattedDate = formatDateForDB(new Date(date));
    for (const request of moduleState.chatIdToCrmRequests[chatId]) {
      for (const requestDate of request.dates) {
        if (formatDateForDB(requestDate) === formattedDate) return { status: request.status, type: request.type };
      }
    }
    return null;
  }

  function extractUserIdFromName(userName) {
    const match = userName.match(/\((\d+)\)$/);
    return match ? match[1] : null;
  }

  function getUserIdByDisplayName(displayName) {
    for (const id in moduleState.userData) {
      if (moduleState.userData[id].displayName === displayName) return id;
    }
    return extractUserIdFromName(displayName);
  }

  async function fetchHolidays() {
    try {
      const response = await fetch('/api/holidays');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return [];
    }
  }

async function renderDataTable(data) {
    dataTableHead.innerHTML = '';
    dataTableBody.innerHTML = '';

    if (data.length === 0 && Object.keys(moduleState.userData).length === 0) {
      dataTableBody.innerHTML = '<tr><td colspan="6" class="security-module-empty-state">Нет данных</td></tr>';
      return;
    }

    const holidays = await fetchHolidays();
    const holidayDates = new Set(holidays.map(h => formatDate(new Date(h.date))));
    if (Array.isArray(holidays)) {
      holidays.forEach(holiday => holidayDates.add(formatDate(new Date(holiday.date))));
    }

    const groupedData = {};
    data.forEach(item => {
      const dateKey = formatDate(new Date(item.date));
      if (!groupedData[dateKey]) groupedData[dateKey] = {};
      groupedData[dateKey][item.user] = item;
    });

    const year = moduleState.filters.year;
    const month = moduleState.filters.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      dates.push(formatDate(date));
    }

    dates.sort((a, b) => new Date(parseRussianDate(a)) - new Date(parseRussianDate(b)));

    const users = Object.values(moduleState.userData)
      .map(user => user.displayName)
      .filter(Boolean)
      .sort();

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Сотрудник</th>';
    dates.forEach(date => {
      const th = document.createElement('th');
      const dayNumber = date.split('.')[0];
      const dateObj = new Date(parseRussianDate(date));
      const weekday = formatWeekday(dateObj);
      th.innerHTML = `<div class="security-module-day-number">${dayNumber}</div><div class="modile-weekday">${weekday}</div>`;
      th.dataset.date = date;
      if (holidayDates.has(date)) th.classList.add('security-module-cell-holiday-header');
      headerRow.appendChild(th);
    });
    dataTableHead.appendChild(headerRow);

    const tempRows = [];

    users.forEach(user => {
      if (moduleState.filters.userSearch && !user.toLowerCase().includes(moduleState.filters.userSearch)) return;

      const row = document.createElement('tr');
      row.dataset.user = user;
      row.hasViolations = false;

      const userCell = document.createElement('td');
      userCell.textContent = user;
      userCell.title = user;
      row.appendChild(userCell);

      const userId = getUserIdByDisplayName(user);
      const userSchedule = userId ? moduleState.userData[userId] : null;
      const notifyViolations = userSchedule && userSchedule.notify_violations === false ? false : true;

      dates.forEach(date => {
        const cellData = groupedData[date]?.[user];
        const cell = document.createElement('td');
        cell.className = 'security-module-attendance-cell';
        cell.dataset.user = user;
        cell.dataset.date = cellData?.date || formatDateForDB(new Date(parseRussianDate(date)));
        cell.dataset.arrive = cellData?.arrive_time || '';
        cell.dataset.leave = cellData?.leave_time || '';
        cell.dataset.comment = cellData?.comment || '';
        cell.dataset.id = cellData?.id || '';
        cell.dataset.displayDate = date;
        cell.dataset.employeeId = cellData?.employee_id || '';
        cell.dataset.firstName = cellData?.first_name || '';
        cell.dataset.countReader1 = cellData?.count_reader1 || '';
        cell.dataset.countReader2 = cellData?.count_reader2 || '';
        if (userId) cell.dataset.userId = userId;

        let isUserWorkDay = true;
        if (userId && moduleState.userSchedulesByDay && moduleState.userSchedulesByDay[userId]) {
          const dbDate = formatDateForDB(new Date(parseRussianDate(date)));
          const workDays = moduleState.userSchedulesByDay[userId];
          if (workDays[dbDate] === "doesnt work") isUserWorkDay = false;
          else isUserWorkDay = true;
        } else {
          const dateObj = new Date(parseRussianDate(date));
          const day = dateObj.getDay();
          isUserWorkDay = !(day === 0 || day === 6);
        }

        const isHoliday = holidayDates.has(date);
        const isScheduleAhead = moduleState.scheduleAhead[date]?.isScheduleAhead || false;

        if (!notifyViolations) {
          cell.classList.add('security-module-cell-no-schedule-user');
          if (isScheduleAhead) cell.classList.add('security-module-cell-schedule-ahead');
          cell.addEventListener('click', (e) => handleCellClick(cell, e));
          row.appendChild(cell);
          return;
        }

        if (userSchedule && (userSchedule.time_arrive || userSchedule.time_leave)) {
          const isWorkDay = isUserWorkDay;
          
          if (isWorkDay && isScheduleAhead) {
            cell.classList.add('security-module-cell-schedule-ahead');
          }
          else if (cellData?.resolved) {
            cell.classList.add('security-module-cell-resolved');
          } 
          else if (isHoliday) {
            cell.classList.add('security-module-cell-holiday');
            const tooltip = document.createElement('div');
            tooltip.className = 'security-module-tooltip';
            tooltip.innerHTML = `<span class="security-module-tooltiptext">Выходной день</span>`;
            cell.appendChild(tooltip);
          } 
          else if (userId && getCrmStatusForDate(userId, cell.dataset.date)) {
            const crmStatus = getCrmStatusForDate(userId, cell.dataset.date);
            if (crmStatus) {
              const crmTypeRaw = crmStatus.type || crmStatus.request_type || '';
              const crmType = String(crmTypeRaw).toLowerCase();
              const crmStatusStr = String(crmStatus.status || '').toLowerCase();
              cell.classList.remove('security-module-cell-violation','security-module-cell-on-time-request','security-module-cell-approved','security-module-cell-resolved','security-module-cell-no-schedule');
              if ((crmType === 'vacation' || crmType === 'sickday') && crmStatusStr === 'approved') {
                cell.classList.add('security-module-cell-vacation');
              } else if (crmStatusStr === 'approved') {
                cell.classList.add('security-module-cell-approved');
              } else {
                cell.classList.add('security-module-cell-on-time-request');
              }
              const tooltip = document.createElement('div');
              tooltip.className = 'security-module-tooltip';
              tooltip.innerHTML = `<span class="security-module-tooltiptext">${crmType || 'request'}: ${crmStatus.status || ''}</span>`;
              cell.appendChild(tooltip);
            }
          } 
          else if (!isWorkDay) {
            cell.classList.add('security-module-cell-no-schedule');
          } 
          else {
            cell.dataset.scheduleArrival = userSchedule.time_arrive || '';
            cell.dataset.scheduleLeave = userSchedule.time_leave || '';
            
            if (!cellData || (userSchedule.time_arrive && !cellData.arrive_time) || (userSchedule.time_leave && !cellData.leave_time)) {
              cell.classList.add('security-module-cell-violation');
              row.hasViolations = true;
            } else {
              const arrivalOnTime = userSchedule.time_arrive ? isArrivalOnTime(cellData.arrive_time, userSchedule.time_arrive) : true;
              const leaveOnTime = userSchedule.time_leave ? isDepartureOnTime(cellData.leave_time, userSchedule.time_leave) : true;
              
              if (arrivalOnTime && leaveOnTime) {
                cell.classList.add('security-module-cell-on-time');
              } else {
                cell.classList.add('security-module-cell-violation');
                row.hasViolations = true;
                
                if (!arrivalOnTime) {
                  const lateIndicator = document.createElement('span');
                  lateIndicator.className = 'security-module-violation-indicator security-module-violation-late';
                  const scheduledArrival = parseTimeString(userSchedule.time_arrive);
                  const actualArrival = parseTimeString(cellData?.arrive_time);
                  if (scheduledArrival && actualArrival) {
                    const minutesLate = Math.round((actualArrival - scheduledArrival) / (1000 * 60));
                    lateIndicator.textContent = !isNaN(minutesLate) ? `П ${minutesLate > 0 ? '+' : ''}${minutesLate}м` : 'П - нет';
                  } else {
                    lateIndicator.textContent = 'П - нет';
                  }
                  cell.appendChild(lateIndicator);
                }
                
                if (!leaveOnTime) {
                  const earlyIndicator = document.createElement('span');
                  earlyIndicator.className = 'security-module-violation-indicator security-module-violation-early';
                  const scheduledDeparture = parseTimeString(userSchedule.time_leave);
                  const actualDeparture = parseTimeString(cellData?.leave_time);
                  if (scheduledDeparture && actualDeparture) {
                    const diff = Math.round((actualDeparture - scheduledDeparture) / (1000 * 60));
                    earlyIndicator.textContent = !isNaN(diff) ? `У ${diff >= 0 ? '+' : ''}${diff}м` : 'У - нет';
                  } else {
                    earlyIndicator.textContent = 'У - нет';
                  }
                  cell.appendChild(earlyIndicator);
                }
              }
            }
          }
        } else {
          cell.classList.add('security-module-cell-no-schedule-user');
        }

        cell.addEventListener('click', (e) => handleCellClick(cell, e));
        row.appendChild(cell);
      });

      tempRows.push(row);
    });

    tempRows.forEach(row => {
      if (moduleState.showVacationUsers) {
        const hasVacation = row.querySelector('.security-module-cell-vacation');
        if (!hasVacation) return;
      } else {
        if (moduleState.hideCleanUsers && !row.hasViolations) return;
      }
      dataTableBody.appendChild(row);
    });

    if (dataTableBody.children.length === 0) {
      dataTableBody.innerHTML = '<tr><td colspan="6" class="security-module-empty-state">Нет данных</td></tr>';
    }

    updateCellContents();
  }

  function isArrivalOnTime(actualTime, scheduledTime) {
    if (!actualTime || !scheduledTime) return false;
    const scheduled = parseTimeString(scheduledTime);
    const graceTime = new Date(scheduled);
    graceTime.setMinutes(graceTime.getMinutes() + 5);
    const actual = parseTimeString(actualTime);
    return actual <= graceTime;
  }

  function isDepartureOnTime(actualTime, scheduledTime) {
    if (!actualTime || actualTime === "-" || !scheduledTime) return false;
    const scheduled = parseTimeString(scheduledTime);
    const actual = parseTimeString(actualTime);
    return actual >= scheduled;
  }
  
  function parseTimeString(timeStr) {
    if (!timeStr || timeStr === "-") return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  function normalizeTimeFormat(timeStr) {
    if (!timeStr || timeStr === "-") return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  }
  
  function handleCellClick(cell, event) {
    closeAllEditForms();
    moduleState.editing = cell;
    const user = cell.dataset.user;
    const employeeId = cell.dataset.employeeId;
    const firstName = cell.dataset.firstName;
    const date = cell.dataset.date;
    const displayDate = cell.dataset.displayDate;
    const arriveTime = normalizeTimeFormat(cell.dataset.arrive || '');
    const leaveTime = normalizeTimeFormat(cell.dataset.leave || '');
    const comment = cell.dataset.comment;
    const resolved = cell.dataset.resolved === 'true';
    const userId = cell.dataset.userId;
    const userSchedule = userId ? moduleState.userData[userId] : null;
    const dateObj = new Date(date);
    const weekday = formatWeekday(dateObj);
    const form = document.createElement('div');
    form.className = 'security-module-edit-form-inline';
    form.style.left = `${event.clientX}px`;
    form.style.top = `${event.clientY}px`;
    let scheduleHtml = '';
    if (userSchedule) {
      scheduleHtml = `
        <div class="security-module-schedule-info">
          <strong>Расписание:</strong><br>
          Приход: ${userSchedule.time_arrive || '—'} &nbsp; Уход: ${userSchedule.time_leave || '—'}
        </div>
      `;
    }
    form.innerHTML = `
      <h3>${user}</h3>
      <p>${displayDate} (${weekday})</p>
      ${scheduleHtml}
      <div class="security-module-form-row">
        <div class="security-module-time-pair">
          <div class="security-module-time-field">
            <label for="editArriveTime">Прибытие</label>
            <input type="time" id="editArriveTime" value="${arriveTime || ''}">
          </div>
          <div class="security-module-time-field">
            <label for="editLeaveTime">Убытие</label>
            <input type="time" id="editLeaveTime" value="${leaveTime || ''}">
          </div>
        </div>
      </div>
      <div class="security-module-form-row">
        <label for="editComment">Комментарий</label>
        <textarea id="editComment">${comment || ''}</textarea>
      </div>
      <div class="security-module-form-row">
        <label class="security-module-checkbox-label" for="editResolved">
          <input type="checkbox" id="editResolved" ${resolved ? 'checked' : ''}>
          Согласовано
        </label>
      </div>
      <div class="security-module-form-actions">
        <button id="saveDataBtn" class="security-module-btn security-module-btn-save">Сохранить</button>
        <button id="cancelDataBtn" class="security-module-btn security-module-btn-cancel">Отмена</button>
      </div>
    `;
    document.body.appendChild(form);
    const rect = form.getBoundingClientRect();
    if (rect.right > window.innerWidth) form.style.left = `${window.innerWidth - rect.width - 20}px`;
    if (rect.bottom > window.innerHeight) form.style.top = `${window.innerHeight - rect.height - 20}px`;
    document.getElementById('saveDataBtn')?.addEventListener('click', () => saveData(cell, form));
    document.getElementById('cancelDataBtn')?.addEventListener('click', () => closeAllEditForms());
  }

  async function saveData(cell, form) {
    const arriveTimeRaw = document.getElementById('editArriveTime')?.value;
    const leaveTimeRaw = document.getElementById('editLeaveTime')?.value;
    const arriveTime = arriveTimeRaw || null;
    const leaveTime = leaveTimeRaw || null;
    const comment = document.getElementById('editComment')?.value || '';
    const resolvedCheckbox = document.getElementById('editResolved');
    const isChecked = resolvedCheckbox?.checked || false;
    const user = cell.dataset.user;
    const employeeId = cell.dataset.employeeId;
    const firstName = cell.dataset.firstName;
    const date = cell.dataset.date;
    const finalEmployeeId = employeeId || cell.dataset.userId;
    try {
      const payload = {
        id: cell.dataset.id || null,
        employee_id: finalEmployeeId,
        last_name: cell.dataset.userId || finalEmployeeId,
        first_name: firstName || user.split('(')[0].trim(),
        access_date: date,
        arrive_time: arriveTime,
        leave_time: leaveTime,
        comment,
        resolved: isChecked
      };
      if (moduleState.filters.department === 'Офис') payload.device_name = 'Office controller';
      const response = await fetch('/api/hikvision/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось сохранить данные');
      cell.dataset.id = result.record.id;
      cell.dataset.arrive = arriveTime || '';
      cell.dataset.leave = leaveTime || '';
      cell.dataset.comment = comment;
      if (isChecked) { cell.dataset.resolved = "true"; } else { delete cell.dataset.resolved; }
      updateSingleCell(cell);
      closeAllEditForms();
      showToast('Данные успешно сохранены', 'success');
    } catch (error) {
      showToast(`Ошибка сохранения данных: ${error.message}`, 'error');
    }
  }

  function updateSingleCell(cell) {
    cell.innerHTML = '';
    cell.className = 'security-module-attendance-cell';
    const userId = cell.dataset.userId;
    const userSchedule = userId ? moduleState.userData[userId] : null;
    const arriveTime = cell.dataset.arrive;
    const leaveTime = cell.dataset.leave;
    const isResolved = cell.dataset.resolved === 'true';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(cell.dataset.date);
    cellDate.setHours(0, 0, 0, 0);
    const isFutureDate = cellDate > today;
    
    if (isFutureDate) {
      cell.classList.add('security-module-cell-schedule-ahead');
    } else if (isResolved) {
      cell.classList.add('security-module-cell-resolved');
    } else if (userSchedule) {
      if (!arriveTime && !leaveTime) {
        cell.classList.add('security-module-cell-violation');
      } else {
        const arrivalOnTime = userSchedule.time_arrive ? isArrivalOnTime(arriveTime, userSchedule.time_arrive) : true;
        const leaveOnTime = userSchedule.time_leave ? isDepartureOnTime(leaveTime, userSchedule.time_leave) : true;
        if (arrivalOnTime && leaveOnTime) {
          cell.classList.add('security-module-cell-on-time');
        } else {
          cell.classList.add('security-module-cell-violation');
          if (!arrivalOnTime && arriveTime) {
            const lateIndicator = document.createElement('span');
            lateIndicator.className = 'security-module-violation-indicator security-module-violation-late';
            const scheduledArrival = parseTimeString(userSchedule.time_arrive);
            const actualArrival = parseTimeString(arriveTime);
            if (scheduledArrival && actualArrival) {
              const minutesLate = Math.round((actualArrival - scheduledArrival) / (1000 * 60));
              lateIndicator.textContent = !isNaN(minutesLate) ? `П ${minutesLate > 0 ? '+' : ''}${minutesLate}м` : 'П - нет';
            }
            cell.appendChild(lateIndicator);
          }
          if (!leaveOnTime && leaveTime) {
            const earlyIndicator = document.createElement('span');
            earlyIndicator.className = 'security-module-violation-indicator security-module-violation-early';
            const scheduledDeparture = parseTimeString(userSchedule.time_leave);
            const actualDeparture = parseTimeString(leaveTime);
            if (scheduledDeparture && actualDeparture) {
              const diff = Math.round((actualDeparture - scheduledDeparture) / (1000 * 60));
              earlyIndicator.textContent = !isNaN(diff) ? `У ${diff >= 0 ? '+' : ''}${diff}м` : 'У - нет';
            }
            cell.appendChild(earlyIndicator);
          }
        }
      }
    }
    if (moduleState.showEntryLeaveCount) {
      const count1 = parseInt(cell.dataset.countReader1 || '0', 10);
      const count2 = parseInt(cell.dataset.countReader2 || '0', 10);
      if (!isNaN(count1) || !isNaN(count2)) {
        const countDisplay = document.createElement('div');
        countDisplay.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:4px;font-size:12px;line-height:1;white-space:nowrap;flex-direction:column;';
        const isEqual = count1 === count2;
        const color = isEqual ? '#4ade80' : '#f87171';
        if (!isNaN(count1)) { const r = document.createElement('div'); r.textContent = `➡️ ${count1}`; r.style.color = color; countDisplay.appendChild(r); }
        if (!isNaN(count2)) { const l = document.createElement('div'); l.textContent = `⬅️ ${count2}`; l.style.color = color; countDisplay.appendChild(l); }
        cell.appendChild(countDisplay);
      }
    } else if (moduleState.showTimes) {
      if (arriveTime || leaveTime) {
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'security-module-cell-time';
        if (arriveTime) { const d = document.createElement('div'); d.textContent = formatTimeTo4Digits(arriveTime); timeDisplay.appendChild(d); }
        if (leaveTime) { const d = document.createElement('div'); d.textContent = formatTimeTo4Digits(leaveTime); timeDisplay.appendChild(d); }
        cell.appendChild(timeDisplay);
      }
    }
    const row = cell.closest('tr');
    if (row) {
      const violationCells = row.querySelectorAll('.security-module-attendance-cell.security-module-cell-violation');
      row.hasViolations = violationCells.length > 0;
    }
  }

  function closeAllEditForms() {
    document.querySelectorAll('.security-module-edit-form-inline').forEach(form => form.parentNode.removeChild(form));
    moduleState.editing = null;
  }

  function filterAndRenderTable() {
    renderDataTable(moduleState.currentData);
    generateAnalyticsReport();
  }

  function updateUsersList(data) {
    moduleState.users = new Set();
    
    data.forEach(item => { 
      if (item.user) moduleState.users.add(item.user); 
    });
    
    Object.values(moduleState.userData).forEach(user => {
      if (user?.displayName) {
        moduleState.users.add(user.displayName);
      }
    });
  }

  loadUserSettings();
  renderSettings();
  loadData();
}

function formatDate(date) {
  return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateForDB(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseRussianDate(dateString) {
  const parts = dateString.split('.');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateString;
}

function formatWeekday(date) {
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return weekdays[date.getDay()];
}