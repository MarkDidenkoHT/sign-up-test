import { getSoundUrl } from '/utils/sounds.js';

export async function loadModule(container, { chatId, userData }) {
  const isRestricted = userData?.role === 'shop' || userData?.role === 'shop_director';

  container.innerHTML = `
<div class="tt">
  ${!isRestricted ? `
  <div class="tt-tabs">
    <button class="tt-tab active" data-tab="main">📅 Календарь</button>
    <button class="tt-tab" data-tab="history">📋 История</button>
  </div>
  ` : ''}

  <div class="tt-panel active" id="tt-main">
    <div class="tt-main-scroll" id="mainContainer">
      <div class="tt-empty">⏳ Загрузка...</div>
    </div>
  </div>

  ${!isRestricted ? `
  <div class="tt-panel" id="tt-history">
    <div class="tt-history-filters">
      <div class="tt-filters-row">
        <select id="filterYear" class="tt-filter-select">
          <option value="">Все года</option>
        </select>
        <select id="filterMonth" class="tt-filter-select">
          <option value="">Все месяцы</option>
          <option value="0">Январь</option>
          <option value="1">Февраль</option>
          <option value="2">Март</option>
          <option value="3">Апрель</option>
          <option value="4">Май</option>
          <option value="5">Июнь</option>
          <option value="6">Июль</option>
          <option value="7">Август</option>
          <option value="8">Сентябрь</option>
          <option value="9">Октябрь</option>
          <option value="10">Ноябрь</option>
          <option value="11">Декабрь</option>
        </select>
      </div>
      <div class="tt-filters-row">
        <select id="filterType" class="tt-filter-select">
          <option value="">Все типы</option>
          <option value="vacation">Отпуск</option>
          <option value="sickday">Больничный</option>
          <option value="work">Работа</option>
          <option value="other">Другое</option>
        </select>
        <select id="filterStatus" class="tt-filter-select">
          <option value="">Все статусы</option>
          <option value="approved">Одобрено</option>
          <option value="rejected">Отклонено</option>
          <option value="new">Ожидает</option>
        </select>
      </div>
    </div>
    <div class="tt-history-scroll" id="historyList">
      <div class="tt-empty">⏳ Загрузка...</div>
    </div>
  </div>
  ` : ''}
</div>

<div class="tt-modal-overlay" id="calendarHelpModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closeCalendarHelp">&times;</span>
    <div class="tt-modal-title">📅 Как пользоваться календарем</div>
    <div class="tt-help-section">
      <h4>Выбор дат</h4>
      <p>• Кликните на дату — выберет один день</p>
      <p>• Кликните на первую дату, затем на вторую — выберет период между ними</p>
      <div class="tt-help-example">
        Пример: кликните на 9-е, затем на 18-е — выберутся все дни с 9 по 18 включительно
      </div>
    </div>
    <div class="tt-help-section">
      <h4>Цвета в календаре</h4>
      <div class="tt-color-legend">
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-ontime"></div>
          <div class="tt-legend-text">Зеленый — рабочий день без нарушений</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-violation"></div>
          <div class="tt-legend-text">Красный — нарушение</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-approved"></div>
          <div class="tt-legend-text">Синий — одобренный запрос</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-weekend"></div>
          <div class="tt-legend-text">Серый — выходной день</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-future"></div>
          <div class="tt-legend-text">Темный — будущие даты</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-pending tt-legend-today"></div>
          <div class="tt-legend-text">Зеленый контур — сегодня</div>
        </div>
        <div class="tt-legend-item">
          <div class="tt-legend-color tt-legend-vacation"></div>
          <div class="tt-legend-text">Фиолетовый — отпуск/больничный</div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="tt-modal-overlay" id="requestHelpModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closeRequestHelp">&times;</span>
    <div class="tt-modal-title">Как создать запрос</div>
    <div class="tt-help-section">
      <h4>Выбор дат</h4>
      <p>Даты выбираются прямо в календаре выше. Выбранные дни подсвечиваются синей рамкой.</p>
      <p>• Кликните на одну дату — выберет один день</p>
      <p>• Кликните на первую дату, затем на вторую — выберет период между ними</p>
    </div>
    <div class="tt-help-section">
      <h4>Типы запросов</h4>
      <p><strong>Отпуск</strong> — отпуск можно брать от 4 часов</p>
      <p><strong>Больничный</strong> — на целый день или несколько дней</p>
      <p><strong>По работе</strong> — отсутствие на рабочем месте по рабочей причине, поездка, встреча и т.д.</p>
      <p><strong>Другое</strong> — максимум 4 часа (нельзя выбрать на целый день или больше 4 часов)</p>
      <div class="tt-help-example">
        Если вы выбрали меньше 4 часов — кнопка "Отпуск" отключится<br>
        Если вы выбрали больше 4 часов — кнопка "Другое" отключится
      </div>
    </div>
    <div class="tt-help-section">
      <h4>После отправки</h4>
      <p>Менеджер получит уведомление в Telegram и сможет одобрить или отклонить запрос. Статус можно отслеживать на вкладке "История".</p>
    </div>
  </div>
</div>

<div class="tt-modal-overlay" id="editModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closeEditModal">&times;</span>
    <div class="tt-modal-title">Редактировать запрос</div>
    <form id="editForm">
      <input type="hidden" id="editRequestId">
      <input type="hidden" id="editMessageId">
      <div style="margin-bottom:12px;">
        <div id="editSelectedDates" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;"></div>
      </div>
      <div class="tt-time-row" style="margin-bottom:12px;">
        <span style="font-size:12px;">Время</span>
        <div class="tt-time-pair" id="editTimePair">
          <input type="text" id="editTimeFrom" value="09:00" inputmode="numeric" />
          <span>—</span>
          <input type="text" id="editTimeTo" value="18:00" inputmode="numeric" />
        </div>
      </div>
      <div class="tt-type-btns" style="margin-bottom:12px;">
        <button type="button" class="tt-type-btn" data-type="vacation" id="editTypeVacation">Отпуск</button>
        <button type="button" class="tt-type-btn" data-type="sickday" id="editTypeSick">Больничный</button>
        <button type="button" class="tt-type-btn" data-type="work" id="editTypeWork">Работа</button>
        <button type="button" class="tt-type-btn" data-type="other" id="editTypeOther">Другое</button>
      </div>
      <input type="hidden" id="editReqType" value="">
      <div class="tt-textarea" style="margin-bottom:12px;">
        <textarea id="editComment" placeholder="Комментарий (необязательно)"></textarea>
      </div>
      <div class="tt-modal-actions">
        <button type="submit" class="tt-modal-btn tt-modal-btn-primary" id="editSubmitBtn">Сохранить</button>
        <button type="button" class="tt-modal-btn tt-modal-btn-secondary" id="cancelEditBtn">Отмена</button>
      </div>
    </form>
  </div>
</div>

<div class="tt-modal-overlay" id="deleteModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closeDeleteModal">&times;</span>
    <div class="tt-modal-title">Подтверждение</div>
    <p style="color:var(--tt-muted); margin-bottom:16px;">Вы уверены, что хотите удалить этот запрос?</p>
    <div class="tt-modal-actions">
      <button class="tt-modal-btn tt-modal-btn-danger" id="confirmDelete">Удалить</button>
      <button class="tt-modal-btn tt-modal-btn-secondary" id="cancelDelete">Отмена</button>
    </div>
  </div>
</div>

<div class="tt-modal-overlay" id="resultModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closeResultModal">&times;</span>
    <div class="tt-result-icon" id="resultIcon"></div>
    <div class="tt-modal-title" id="resultTitle"></div>
    <p class="tt-result-message" id="resultMessage"></p>
    <div class="tt-modal-actions">
      <button class="tt-modal-btn tt-modal-btn-primary" id="resultOkBtn">Понятно</button>
    </div>
  </div>
</div>

<div class="tt-modal-overlay" id="pendingConfirmModal">
  <div class="tt-modal-sheet">
    <span class="tt-modal-close" id="closePendingConfirmModal">&times;</span>
    <div class="tt-result-icon">⚠️</div>
    <div class="tt-modal-title">Уже есть запрос</div>
    <p class="tt-result-message">У вас есть новый запрос, вы уверены что хотите отправить еще один?</p>
    <div class="tt-modal-actions">
      <button class="tt-modal-btn tt-modal-btn-primary" id="pendingConfirmYes">Да, отправить</button>
      <button class="tt-modal-btn tt-modal-btn-secondary" id="pendingConfirmNo">Отмена</button>
    </div>
  </div>
</div>
  `;

  const state = {
    selectedDates: [],
    editSelectedDates: [],
    userRequests: [],
    currentEditRequest: null,
    currentDeleteRequest: null,
    attendanceData: [],
    userSchedule: null,
    workDays: null,
    userId: null,
    lastClickedDate: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    vacationDays: parseFloat(userData?.vacations_available || 0),
    approvedRequests: {},
    vacationRequests: {},
    availableYears: [],
    isMainRendered: false,
    pendingSubmitPayload: null
  };

  const $ = (id) => document.getElementById(id);

  const playErrorSound = () => {
    try {
      const url = getSoundUrl('error');
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = 0.25;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const showTypeError = () => {
    playErrorSound();
    const typeBtns = document.querySelector('.tt-type-btns');
    if (!typeBtns) return;
    typeBtns.classList.remove('tt-type-error-shake');
    void typeBtns.offsetWidth;
    typeBtns.classList.add('tt-type-error-shake');
    let banner = typeBtns.parentElement.querySelector('.tt-type-error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'tt-type-error-banner';
      banner.textContent = '⚠ Выберите тип запроса';
      typeBtns.insertAdjacentElement('afterend', banner);
    }
    banner.classList.remove('tt-type-error-visible');
    void banner.offsetWidth;
    banner.classList.add('tt-type-error-visible');
    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => {
      banner.classList.remove('tt-type-error-visible');
      typeBtns.classList.remove('tt-type-error-shake');
    }, 3000);
  };

  const showResultModal = (type, title, message) => {
    const iconMap = { ok: '✅', err: '❌', warn: '⚠️' };
    $('resultIcon').textContent = iconMap[type] || 'ℹ️';
    $('resultTitle').textContent = title;
    $('resultMessage').textContent = message;
    showModal('resultModal');
  };

  const showModal = (id) => {
    $(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (id) => {
    $(id).classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.tt-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  $('closeResultModal')?.addEventListener('click', () => closeModal('resultModal'));
  $('resultOkBtn')?.addEventListener('click', () => closeModal('resultModal'));

  if (!isRestricted) {
    document.querySelectorAll('.tt-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tt-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tt-panel').forEach(p => p.classList.remove('active'));
        $(`tt-${btn.dataset.tab}`).classList.add('active');
        if (btn.dataset.tab === 'history') loadUserHistory();
      });
    });
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const formatTime = (t) => t ? t.substring(0, 5) : '—';

  const parseTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return null;
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d;
  };

  const getMinutesDiff = (actual, scheduled) => {
    if (!actual || !scheduled) return 0;
    return Math.round((parseTime(actual) - parseTime(scheduled)) / (1000 * 60));
  };

  const dateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const generateRequestId = (chatId) => {
    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `req_${chatId}_${timestamp}_${randomPart}`;
  };

  const autoExpandToFullWeekIfNeeded = (selectedDates) => {
    if (selectedDates.length !== 5) return selectedDates;
    const sorted = [...selectedDates].sort();
    const first = sorted[0];
    const firstDay = new Date(first).getDay();
    const lastDay = new Date(sorted[sorted.length - 1]).getDay();
    if (firstDay === 1 && lastDay === 5) {
      const fullWeek = [];
      let d = new Date(first);
      for (let i = 0; i < 5; i++) {
        fullWeek.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        d.setDate(d.getDate() + 1);
      }
      const saturday = new Date(first);
      saturday.setDate(saturday.getDate() + 5);
      const sunday = new Date(first);
      sunday.setDate(sunday.getDate() + 6);
      fullWeek.push(
        `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`,
        `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`
      );
      return fullWeek;
    }
    return selectedDates;
  };

  const notifyManager = async (data) => {
    try {
      const response = await fetch('/api/timetable/notify-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, userData, chatId })
      });
      return await response.json();
    } catch (error) {
      return { success: false, messageId: null };
    }
  };

  const updateManagerMessage = async (messageId, data) => {
    try {
      const response = await fetch('/api/timetable/update-manager-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, data, userData, chatId })
      });
      return await response.json();
    } catch (error) {
      return { success: false };
    }
  };

  const deleteManagerMessage = async (messageId) => {
    try {
      const response = await fetch('/api/timetable/delete-manager-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, chatId })
      });
      return await response.json();
    } catch (error) {
      return { success: false };
    }
  };

  const loadApprovedRequests = async () => {
    if (isRestricted) return;
    try {
      const res = await fetch(`/api/timetable/user-history/${chatId}`);
      const result = await res.json();
      if (result.success && result.requests) {
        const approvedMap = {};
        const vacationMap = {};
        result.requests.forEach(req => {
          if (req.status === 'approved' && req.dates) {
            req.dates.forEach(date => {
              if (req.request_type === 'vacation' || req.request_type === 'sickday') {
                vacationMap[date] = true;
              } else {
                approvedMap[date] = true;
              }
            });
          }
        });
        state.approvedRequests = approvedMap;
        state.vacationRequests = vacationMap;
      }
    } catch (error) {
      console.error('Error loading approved requests:', error);
    }
  };

  const hasPendingNewRequest = async () => {
    try {
      const res = await fetch(`/api/timetable/user-history/${chatId}`);
      const result = await res.json();
      if (result.success && result.requests) {
        return result.requests.some(r => (r.status === 'new' || !r.status));
      }
    } catch (e) {}
    return false;
  };

  const buildGridHTML = () => {
    const year = state.currentYear;
    const month = state.currentMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const grouped = {};
    if (!isRestricted) {
      state.attendanceData.forEach(r => {
        const date = r.access_date.split('T')[0];
        grouped[date] = r;
      });
    }

    let html = '';
    for (let i = 0; i < startOffset; i++) {
      html += `<div class="tt-day-cell" style="opacity:0.3;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      const record = grouped[dateStr];
      const isFuture = date > today;
      const isToday = date.toDateString() === today.toDateString();
      const hasApprovedRequest = !isRestricted && state.approvedRequests[dateStr];
      const hasVacationRequest = !isRestricted && state.vacationRequests[dateStr];
      const isDayOff = state.workDays && state.workDays[dateStr] === 'doesnt work';

      let cellClass = 'tt-day-cell';
      let timesHtml = '';

      if (isRestricted) {
        const status = state.workDays?.[dateStr];
        if (status === 'doesnt work') {
          cellClass += ' tt-cell-weekend';
          timesHtml = '<div class="tt-day-times"><span>Выходной</span></div>';
        } else if (status === 'vacation') {
          cellClass += ' tt-cell-vacation';
          timesHtml = '<div class="tt-day-times"><span>Отпуск</span></div>';
        } else if (status === 'sick') {
          cellClass += ' tt-cell-vacation';
          timesHtml = '<div class="tt-day-times"><span>Больничный</span></div>';
        } else if (status === 'own_expense') {
          cellClass += ' tt-cell-approved';
          timesHtml = '<div class="tt-day-times"><span>За свой счет</span></div>';
        } else if (status === 'works') {
          cellClass += ' tt-cell-ontime';
          timesHtml = '<div class="tt-day-times"><span>Рабочий день</span></div>';
        } else if (isFuture) {
          cellClass += ' tt-cell-future';
          timesHtml = '<div class="tt-day-times"><span>—</span></div>';
        } else {
          cellClass += ' tt-cell-violation';
          timesHtml = '<div class="tt-day-times"><span>Нет данных</span></div>';
        }
      } else {
        if (isDayOff) {
          cellClass += ' tt-cell-weekend';
          timesHtml = '<div class="tt-day-times"><span>—</span><span>Вых</span></div>';
        } else if (isFuture) {
          cellClass += ' tt-cell-future';
          timesHtml = '<div class="tt-day-times"><span>—</span><span>—</span></div>';
        } else if (hasVacationRequest) {
          cellClass += ' tt-cell-vacation';
          if (record) {
            const arrive = record.arrive_time ? record.arrive_time.substring(0, 5) : '—';
            const leave = record.leave_time ? record.leave_time.substring(0, 5) : '—';
            timesHtml = `<div class="tt-day-times"><span>${arrive}</span><span>${leave}</span></div>`;
          } else {
            timesHtml = '<div class="tt-day-times"><span>—</span><span>—</span></div>';
          }
        } else if (hasApprovedRequest) {
          cellClass += ' tt-cell-approved';
          if (record) {
            const arrive = record.arrive_time ? record.arrive_time.substring(0, 5) : '—';
            const leave = record.leave_time ? record.leave_time.substring(0, 5) : '—';
            timesHtml = `<div class="tt-day-times"><span>${arrive}</span><span>${leave}</span></div>`;
          } else {
            timesHtml = '<div class="tt-day-times"><span>—</span><span>—</span></div>';
          }
        } else {
          let hasViolation = false;
          if (record) {
            if (state.userSchedule.time_arrive && record.arrive_time) {
              if (getMinutesDiff(record.arrive_time, state.userSchedule.time_arrive) > 5) hasViolation = true;
            } else if (state.userSchedule.time_arrive && !record.arrive_time) {
              hasViolation = true;
            }
            if (state.userSchedule.time_leave && record.leave_time) {
              if (getMinutesDiff(state.userSchedule.time_leave, record.leave_time) > 5) hasViolation = true;
            } else if (state.userSchedule.time_leave && !record.leave_time) {
              hasViolation = true;
            }
            const arrive = record.arrive_time ? record.arrive_time.substring(0, 5) : '—';
            const leave = record.leave_time ? record.leave_time.substring(0, 5) : '—';
            timesHtml = `<div class="tt-day-times"><span>${arrive}</span><span>${leave}</span></div>`;
          } else {
            timesHtml = '<div class="tt-day-times"><span>—</span><span>—</span></div>';
            if (!isToday) hasViolation = true;
          }
          if (isToday) {
            cellClass += ' tt-cell-pending';
          } else if (hasViolation) {
            cellClass += ' tt-cell-violation';
          } else {
            cellClass += ' tt-cell-ontime';
          }
        }
      }

      const isSelected = !isRestricted && state.selectedDates.includes(dateStr) ? ' selected' : '';
      html += `
        <div class="${cellClass}${isSelected}" data-date="${dateStr}">
          <div class="tt-day-number">${day}</div>
          ${timesHtml}
        </div>
      `;
    }
    return html;
  };

  const attachGridListeners = () => {
    if (isRestricted) return;
    const grid = document.querySelector('.tt-days-grid');
    if (!grid) return;
    grid.querySelectorAll('.tt-day-cell[data-date]').forEach(cell => {
      let touchMoved = false;

      cell.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
      cell.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
      cell.addEventListener('touchend', (e) => {
        if (touchMoved) return;
        e.preventDefault();
        handleDaySelect(cell.dataset.date);
      });

      cell.addEventListener('click', (e) => {
        if (e.sourceCapabilities && !e.sourceCapabilities.firesTouchEvents) {
          handleDaySelect(cell.dataset.date);
        }
      });
    });
  };

  const handleDaySelect = (date) => {
    if (state.lastClickedDate && state.lastClickedDate !== date && state.selectedDates.length === 1) {
      state.selectedDates = dateRange(state.lastClickedDate, date);
      state.lastClickedDate = null;
    } else {
      state.selectedDates = [date];
      state.lastClickedDate = date;
    }
    const g = document.querySelector('.tt-days-grid');
    if (g) { g.innerHTML = buildGridHTML(); attachGridListeners(); }
  };

  const setCalendarLoading = (loading) => {
    if (isRestricted) return;
    const overlay = document.querySelector('.tt-calendar-overlay');
    const navBtns = document.querySelectorAll('.prevMonth, .nextMonth');
    if (overlay) overlay.classList.toggle('visible', loading);
    navBtns.forEach(b => b.disabled = loading);
  };

  const loadMainData = async () => {
    if (!state.isMainRendered) {
      $('mainContainer').innerHTML = '<div class="tt-empty">⏳ Загрузка...</div>';
    } else if (!isRestricted) {
      setCalendarLoading(true);
    }

    try {
      const year = state.currentYear;
      const month = String(state.currentMonth + 1).padStart(2, '0');
      const url = `/api/timetable/attendance-data?year=${year}&month=${month}`;
      const resp = await fetch(url);
      const payload = await resp.json();

      if (payload.users) {
        const currentUser = payload.users[0];
        if (currentUser) {
          state.userId = currentUser.id_1c;
          state.userSchedule = { time_arrive: currentUser.time_arrive, time_leave: currentUser.time_leave };
          state.vacationDays = parseFloat(currentUser.vacations_available || 0);
        }
      }

      if (payload.schedule && state.userId) {
        const userScheduleData = payload.schedule.find(s => s.id_1c === state.userId);
        if (userScheduleData && userScheduleData.work_days) {
          state.workDays = userScheduleData.work_days;
        }
      }

      if (!isRestricted && payload.hikvision && state.userId) {
        state.attendanceData = payload.hikvision;
      }

      if (!isRestricted) {
        await loadApprovedRequests();
      }

      if (!state.isMainRendered) {
        renderMain();
        state.isMainRendered = true;
      } else {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const labelEl = document.querySelector('.tt-current-month');
        if (labelEl) labelEl.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
        const grid = document.querySelector('.tt-days-grid');
        if (grid) { grid.innerHTML = buildGridHTML(); if (!isRestricted) attachGridListeners(); }
        if (!isRestricted) setCalendarLoading(false);
      }
    } catch (e) {
      if (!state.isMainRendered) {
        $('mainContainer').innerHTML = '<div class="tt-empty">⚠️ Ошибка загрузки</div>';
      } else {
        if (!isRestricted) setCalendarLoading(false);
        showResultModal('err', 'Ошибка', 'Не удалось загрузить данные');
      }
    }
  };

  const scrollToComment = () => {
    const textarea = $('comment');
    const textareaParent = textarea?.closest('.tt-textarea');
    const scrollContainer = document.querySelector('.tt-main-scroll');
    
    if (textarea && scrollContainer) {
      const textareaRect = textareaParent?.getBoundingClientRect();
      const scrollRect = scrollContainer.getBoundingClientRect();
      
      if (textareaRect && textareaRect.bottom > scrollRect.bottom) {
        textareaParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        textareaParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const renderMain = () => {
    const mainContainer = $('mainContainer');

    if (!state.userSchedule) {
      mainContainer.innerHTML = '<div class="tt-empty">Нет данных о графике</div>';
      return;
    }

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const vacationDisplay = !isRestricted && state.vacationDays > 0
      ? `<span class="vacation-count">${state.vacationDays.toFixed(1)}</span>`
      : '';

    mainContainer.innerHTML = `
      <div class="tt-month-selector">
        <div class="tt-month-selector-left">
          <span class="tt-current-month">${monthNames[state.currentMonth]} ${state.currentYear}</span>
          ${!isRestricted ? `<span class="tt-help-icon" id="calendarHelpBtn">?</span>` : ''}
        </div>
        <div class="tt-month-nav">
          <button class="prevMonth">←</button>
          <button class="nextMonth">→</button>
        </div>
      </div>
      <div class="tt-month-card-wrap">
        ${!isRestricted ? '<div class="tt-calendar-overlay"></div>' : ''}
        <div class="tt-month-card">
          <div class="tt-weekdays">
            <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
          </div>
          <div class="tt-days-grid"></div>
        </div>
      </div>
      ${!isRestricted ? `
      <div class="tt-request-card">
        <div class="tt-request-header">
          <div class="tt-request-title">Новый запрос</div>
          <span class="tt-help-icon" id="requestHelpBtn">?</span>
        </div>
        <div class="tt-time-row">
          <span>Время</span>
          <div class="tt-time-pair" id="timePair">
            <input type="text" id="timeFrom" value="09:00" inputmode="numeric" />
            <span>—</span>
            <input type="text" id="timeTo" value="18:00" inputmode="numeric" />
          </div>
        </div>
        <div class="tt-type-btns">
          <button type="button" class="tt-type-btn" data-type="vacation" id="typeVacation">Отпуск ${vacationDisplay}</button>
          <button type="button" class="tt-type-btn" data-type="sickday" id="typeSick">Больничный</button>
          <button type="button" class="tt-type-btn" data-type="work" id="typeWork">Работа</button>
          <button type="button" class="tt-type-btn" data-type="other" id="typeOther">Другое</button>
        </div>
        <input type="hidden" id="reqType" value="">
        <div class="tt-textarea">
          <textarea id="comment" placeholder="Комментарий (необязательно)"></textarea>
        </div>
        <button class="tt-btn-submit" id="submitBtn">Отправить запрос</button>
      </div>
      ` : ''}
    `;

    const grid = document.querySelector('.tt-days-grid');
    if (grid) { grid.innerHTML = buildGridHTML(); if (!isRestricted) attachGridListeners(); }
    if (!isRestricted) attachEventListeners();
  };

  const doSubmitRequest = async () => {
    if (!state.pendingSubmitPayload) return;
    const { from, to, type, selectedDates } = state.pendingSubmitPayload;

    const btn = $('submitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

    const requestId = generateRequestId(chatId);
    const payload = {
      request_id: requestId,
      chat_id: chatId,
      request_date: new Date().toISOString(),
      request_type: type,
      comment: $('comment')?.value || '',
      time_from: from,
      time_to: to,
      status: 'new',
    };

    try {
      const infoResponse = await fetch('/api/timetable/create-request-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestInfoPayload: payload })
      });
      if (!infoResponse.ok) throw new Error('Не удалось создать запрос');
      const infoResult = await infoResponse.json();
      const recordId = infoResult.data?.[0]?.id;

      await Promise.all(selectedDates.map(d =>
        fetch('/api/timetable/create-request-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, date: d })
        })
      ));

      const notificationResult = await notifyManager({
        id: recordId,
        requestId,
        taskGroup: type,
        fromHours: payload.time_from,
        toHours: payload.time_to,
        comment: payload.comment,
        dates: selectedDates
      });

      if (!notificationResult.success) throw new Error('Не удалось уведомить менеджера');

      await fetch('/api/timetable/update-request-message', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, messageId: notificationResult.messageId })
      });

      showResultModal('ok', 'Запрос отправлен', 'Ваш запрос успешно отправлен. Менеджер получит уведомление и рассмотрит его.');

      if ($('reqType')) $('reqType').value = '';
      if ($('comment')) $('comment').value = '';
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      state.selectedDates = [todayStr];
      state.lastClickedDate = todayStr;
      const g = document.querySelector('.tt-days-grid');
      if (g) { g.innerHTML = buildGridHTML(); attachGridListeners(); }
      if (document.querySelector('[data-tab="history"]')?.classList.contains('active')) loadUserHistory();
      await loadApprovedRequests();
    } catch (e) {
      showResultModal('err', 'Ошибка', e.message || 'Не удалось отправить запрос');
    } finally {
      state.pendingSubmitPayload = null;
      if (btn) { btn.disabled = false; btn.textContent = 'Отправить запрос'; }
    }
  };

  const attachEventListeners = () => {
    if (isRestricted) return;

    document.querySelector('.prevMonth')?.addEventListener('click', () => {
      if (state.currentMonth === 0) { state.currentYear--; state.currentMonth = 11; }
      else { state.currentMonth--; }
      loadMainData();
    });

    document.querySelector('.nextMonth')?.addEventListener('click', () => {
      if (state.currentMonth === 11) { state.currentYear++; state.currentMonth = 0; }
      else { state.currentMonth++; }
      loadMainData();
    });

    $('calendarHelpBtn')?.addEventListener('click', () => showModal('calendarHelpModal'));
    $('requestHelpBtn')?.addEventListener('click', () => showModal('requestHelpModal'));
    $('closeCalendarHelp')?.addEventListener('click', () => closeModal('calendarHelpModal'));
    $('closeRequestHelp')?.addEventListener('click', () => closeModal('requestHelpModal'));

    const checkTypeOptions = () => {
      const timeFrom = $('timeFrom');
      const timeTo = $('timeTo');
      const reqType = $('reqType');
      if (!timeFrom || !timeTo || !reqType) return;
      const [h1, m1] = timeFrom.value.split(':').map(Number);
      const [h2, m2] = timeTo.value.split(':').map(Number);
      const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      const otherBtn = $('typeOther');
      const vacationBtn = $('typeVacation');
      if (otherBtn) {
        otherBtn.disabled = totalMinutes > 240;
        if (otherBtn.disabled && otherBtn.classList.contains('active')) { otherBtn.classList.remove('active'); reqType.value = ''; }
      }
      if (vacationBtn) {
        vacationBtn.disabled = totalMinutes < 240;
        if (vacationBtn.disabled && vacationBtn.classList.contains('active')) { vacationBtn.classList.remove('active'); reqType.value = ''; }
      }
    };

    const checkEditTypeOptions = () => {
      const timeFrom = $('editTimeFrom');
      const timeTo = $('editTimeTo');
      const reqType = $('editReqType');
      if (!timeFrom || !timeTo || !reqType) return;
      const [h1, m1] = timeFrom.value.split(':').map(Number);
      const [h2, m2] = timeTo.value.split(':').map(Number);
      const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      const otherBtn = $('editTypeOther');
      const vacationBtn = $('editTypeVacation');
      if (otherBtn) {
        otherBtn.disabled = totalMinutes > 240;
        if (otherBtn.disabled && otherBtn.classList.contains('active')) { otherBtn.classList.remove('active'); reqType.value = ''; }
      }
      if (vacationBtn) {
        vacationBtn.disabled = totalMinutes < 240;
        if (vacationBtn.disabled && vacationBtn.classList.contains('active')) { vacationBtn.classList.remove('active'); reqType.value = ''; }
      }
    };

    document.querySelectorAll('#typeVacation, #typeSick, #typeWork, #typeOther').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('#typeVacation, #typeSick, #typeWork, #typeOther').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('reqType').value = btn.dataset.type;
        const banner = btn.closest('.tt-request-card')?.querySelector('.tt-type-error-banner');
        if (banner) {
          banner.classList.remove('tt-type-error-visible');
          btn.closest('.tt-type-btns')?.classList.remove('tt-type-error-shake');
        }
      });
    });

    document.querySelectorAll('#editTypeVacation, #editTypeSick, #editTypeWork, #editTypeOther').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('#editTypeVacation, #editTypeSick, #editTypeWork, #editTypeOther').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('editReqType').value = btn.dataset.type;
      });
    });

    $('timeFrom')?.addEventListener('input', checkTypeOptions);
    $('timeTo')?.addEventListener('input', checkTypeOptions);
    $('editTimeFrom')?.addEventListener('input', checkEditTypeOptions);
    $('editTimeTo')?.addEventListener('input', checkEditTypeOptions);

    const comment = $('comment');
    if (comment) {
      comment.addEventListener('focus', () => {
        setTimeout(() => {
          scrollToComment();
        }, 300);
      });
      comment.addEventListener('click', () => {
        setTimeout(() => {
          scrollToComment();
        }, 300);
      });
    }

    const mainScroll = document.querySelector('.tt-main-scroll');
    if (mainScroll) {
      mainScroll.addEventListener('touchstart', (e) => {
        const tag = e.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          document.activeElement?.blur();
        }
      }, { passive: true });
    }

    $('submitBtn')?.addEventListener('click', async () => {
      document.activeElement?.blur();
      if (!state.selectedDates.length) {
        showResultModal('err', 'Ошибка', 'Выберите даты в календаре');
        return;
      }
      const from = $('timeFrom').value;
      const to = $('timeTo').value;
      if (from >= to) {
        showResultModal('err', 'Ошибка', 'Время окончания должно быть позже начала');
        return;
      }
      const type = $('reqType').value;
      if (!type) { showTypeError(); return; }

      const expandedDates = autoExpandToFullWeekIfNeeded(state.selectedDates);
      state.pendingSubmitPayload = { from, to, type, selectedDates: expandedDates };

      const hasPending = await hasPendingNewRequest();
      if (hasPending) {
        showModal('pendingConfirmModal');
        return;
      }

      await doSubmitRequest();
    });

    $('pendingConfirmYes')?.addEventListener('click', async () => {
      closeModal('pendingConfirmModal');
      await doSubmitRequest();
    });

    $('pendingConfirmNo')?.addEventListener('click', () => {
      closeModal('pendingConfirmModal');
      state.pendingSubmitPayload = null;
    });

    $('closePendingConfirmModal')?.addEventListener('click', () => {
      closeModal('pendingConfirmModal');
      state.pendingSubmitPayload = null;
    });

    $('closeEditModal')?.addEventListener('click', () => closeModal('editModal'));
    $('cancelEditBtn')?.addEventListener('click', () => closeModal('editModal'));
    $('closeDeleteModal')?.addEventListener('click', () => closeModal('deleteModal'));
    $('cancelDelete')?.addEventListener('click', () => closeModal('deleteModal'));

    $('editForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.editSelectedDates.length === 0) {
        showResultModal('err', 'Ошибка', 'Выберите даты');
        return;
      }
      const from = $('editTimeFrom').value;
      const to = $('editTimeTo').value;
      if (from >= to) {
        showResultModal('err', 'Ошибка', 'Время окончания должно быть позже начала');
        return;
      }
      const type = $('editReqType').value;
      if (!type) {
        showResultModal('err', 'Ошибка', 'Выберите тип запроса');
        return;
      }
      const requestId = $('editRequestId').value;
      const messageId = $('editMessageId').value;
      const btn = $('editSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Сохранение...';
      const payload = {
        request_type: type,
        comment: $('editComment').value || '',
        time_from: from,
        time_to: to
      };
      try {
        await fetch('/api/timetable/update-request-info', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, payload })
        });
        await fetch('/api/timetable/delete-request-dates', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId })
        });
        await Promise.all(state.editSelectedDates.map(d =>
          fetch('/api/timetable/add-request-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, date: d })
          })
        ));
        if (messageId) {
          await updateManagerMessage(messageId, {
            requestId,
            taskGroup: type,
            fromHours: payload.time_from,
            toHours: payload.time_to,
            comment: payload.comment,
            dates: state.editSelectedDates
          });
        }
        closeModal('editModal');
        showResultModal('ok', 'Запрос обновлен', 'Изменения успешно сохранены.');
        loadUserHistory();
        await loadApprovedRequests();
      } catch (e) {
        showResultModal('err', 'Ошибка', e.message || 'Не удалось сохранить изменения');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить';
      }
    });

    checkTypeOptions();
    checkEditTypeOptions();
  };

  const loadUserHistory = async () => {
    if (isRestricted) return;
    const historyList = $('historyList');
    historyList.innerHTML = '<div class="tt-empty">⏳ Загрузка...</div>';
    try {
      const res = await fetch(`/api/timetable/user-history/${chatId}`);
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Ошибка API");
      state.userRequests = result.requests || [];

      const years = new Set();
      state.userRequests.forEach(req => {
        if (req.dates) req.dates.forEach(date => years.add(new Date(date).getFullYear()));
      });
      state.availableYears = Array.from(years).sort((a, b) => b - a);

      const yearSelect = $('filterYear');
      yearSelect.innerHTML = '<option value="">Все года</option>';
      state.availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      });

      applyFilters();
    } catch (error) {
      historyList.innerHTML = '<div class="tt-empty">⚠️ Ошибка загрузки</div>';
    }
  };

  const applyFilters = () => {
    if (isRestricted) return;
    const yearFilter = $('filterYear').value;
    const monthFilter = $('filterMonth').value;
    const typeFilter = $('filterType').value;
    const statusFilter = $('filterStatus').value;

    let filteredRequests = [...(state.userRequests || [])];

    if (yearFilter || monthFilter) {
      filteredRequests = filteredRequests.filter(req => {
        if (!req.dates || req.dates.length === 0) return false;
        const firstDate = new Date(req.dates.sort()[0]);
        if (yearFilter && firstDate.getFullYear() !== parseInt(yearFilter)) return false;
        if (monthFilter && firstDate.getMonth() !== parseInt(monthFilter)) return false;
        return true;
      });
    }

    if (typeFilter) filteredRequests = filteredRequests.filter(req => req.request_type === typeFilter);
    if (statusFilter) filteredRequests = filteredRequests.filter(req => (req.status || 'new') === statusFilter);

    renderHistoryList(filteredRequests);
  };

  const renderHistoryList = (requests) => {
    if (isRestricted) return;
    const historyList = $('historyList');
    if (!requests || requests.length === 0) {
      historyList.innerHTML = '<div class="tt-empty">📭 Нет запросов</div>';
      return;
    }
    historyList.innerHTML = requests.map(req => {
      const dates = (req.dates || []).sort();
      const dateStr = dates.length === 1
        ? formatDate(dates[0])
        : `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`;
      const timeStr = req.time_from ? `${formatTime(req.time_from)} — ${formatTime(req.time_to)}` : '09:00 — 18:00';
      const typeMap = { vacation: 'Отпуск', sickday: 'Больничный', work: 'Работа', other: 'Другое' };
      const statusClass = { approved: 'tt-pill-approved', rejected: 'tt-pill-rejected', new: 'tt-pill-new' }[req.status || 'new'];
      const statusLabel = { approved: 'Одобрено', rejected: 'Отклонено', new: 'Ожидает' }[req.status || 'new'];
      const canEdit = !req.status || req.status === 'new';
      return `
        <div class="tt-card">
          <div class="tt-card-header">
            <div class="tt-card-type">${typeMap[req.request_type] || req.request_type}</div>
            <div class="tt-pill ${statusClass}">${statusLabel}</div>
          </div>
          <div class="tt-card-meta">📅 ${dateStr}<br>🕐 ${timeStr}</div>
          ${req.comment ? `<div class="tt-card-comment">💬 ${req.comment}</div>` : ''}
          ${canEdit ? `
            <div class="tt-card-actions" style="display:flex; gap:8px; margin-top:8px;">
              <button class="tt-type-btn edit-btn" data-id="${req.id}" style="flex:1; padding:5px 0;">Изменить</button>
              <button class="tt-type-btn delete-btn" data-id="${req.id}" data-message-id="${req.message_id || ''}" style="flex:1; padding:5px 0; color:var(--tt-red);">Удалить</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => handleEditClick(btn.dataset.id)));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => handleDeleteClick(btn.dataset.id, btn.dataset.messageId)));
  };

  const handleEditClick = (requestId) => {
    if (isRestricted) return;
    const request = state.userRequests.find(r => r.id === parseInt(requestId));
    if (!request) return;
    state.currentEditRequest = request;
    $('editRequestId').value = request.request_id;
    $('editMessageId').value = request.message_id || '';
    $('editTimeFrom').value = request.time_from ? formatTime(request.time_from) : '09:00';
    $('editTimeTo').value = request.time_to ? formatTime(request.time_to) : '18:00';
    const typeKey = request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1);
    const typeBtn = $(`editType${typeKey}`);
    if (typeBtn) {
      document.querySelectorAll('#editTypeVacation, #editTypeSick, #editTypeWork, #editTypeOther').forEach(b => b.classList.remove('active'));
      typeBtn.classList.add('active');
      $('editReqType').value = request.request_type;
    }
    $('editComment').value = request.comment || '';
    state.editSelectedDates = request.dates || [];
    if (state.editSelectedDates.length > 0) {
      const badgesHtml = state.editSelectedDates.map(d =>
        `<span style="background:var(--tt-surface2); border:1px solid var(--tt-border); border-radius:12px; padding:2px 6px; font-size:10px;">${formatDate(d)}</span>`
      ).join('');
      const c = $('editSelectedDates');
      if (c) c.innerHTML = badgesHtml;
    }
    showModal('editModal');
  };

  const handleDeleteClick = (requestId, messageId) => {
    if (isRestricted) return;
    const request = state.userRequests.find(r => r.id === parseInt(requestId));
    if (!request) return;
    state.currentDeleteRequest = { id: parseInt(requestId), requestId: request.request_id, messageId };
    showModal('deleteModal');
  };

  $('confirmDelete')?.addEventListener('click', async () => {
    if (isRestricted) return;
    if (!state.currentDeleteRequest) return;
    const { requestId, messageId } = state.currentDeleteRequest;
    closeModal('deleteModal');
    try {
      if (messageId) await deleteManagerMessage(messageId);
      await fetch('/api/timetable/delete-request-dates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      await fetch('/api/timetable/delete-request-info', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      showResultModal('ok', 'Удалено', 'Запрос успешно удален.');
      loadUserHistory();
      await loadApprovedRequests();
    } catch (error) {
      showResultModal('err', 'Ошибка', 'Не удалось удалить запрос');
    } finally {
      state.currentDeleteRequest = null;
    }
  });

  $('filterYear')?.addEventListener('change', applyFilters);
  $('filterMonth')?.addEventListener('change', applyFilters);
  $('filterType')?.addEventListener('change', applyFilters);
  $('filterStatus')?.addEventListener('change', applyFilters);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (!isRestricted) {
    state.selectedDates = [todayStr];
    state.lastClickedDate = todayStr;
  }

  loadMainData();
}