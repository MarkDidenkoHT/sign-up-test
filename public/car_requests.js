export async function loadModule(container, { chatId, userData }) {
  const appState = { chatId, userData };

  container.innerHTML = `
    <div class="car-requests-wrapper">
      <div class="car-requests-main">
        <div class="car-requests-header-section">
          <div class="car-requests-tabs-nav">
            <button class="car-requests-tab-btn active" data-tab="calendarTab">📅 Календарь</button>
            <button class="car-requests-tab-btn" data-tab="requestsTab">📋 Мои запросы</button>
          </div>
        </div>
        
        <div class="car-requests-scrollable-content">
          <div id="calendarTab" class="car-requests-tab-content active">
            <div class="car-requests-card">
              <div class="car-requests-card-header">
                <h3 id="calendarMonthDisplay"></h3>
                <div style="display:flex;gap:8px;">
                  <button class="car-requests-btn-icon" id="prevMonth" style="font-size:18px;">‹</button>
                  <button class="car-requests-btn-icon" id="nextMonth" style="font-size:18px;">›</button>
                </div>
              </div>
              
              <div class="car-requests-card-body">
                <div class="car-requests-calendar-grid" style="margin-bottom:4px;">
                  ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => 
                    `<div class="car-requests-weekday">${day}</div>`
                  ).join('')}
                </div>
                
                <div id="calendarGrid" class="car-requests-calendar-grid"></div>
              </div>
            </div>
            
            <div class="car-requests-card">
              <div class="car-requests-card-header">
                <h3>Новый запрос</h3>
              </div>
              
              <div class="car-requests-card-body">
                <div class="car-requests-selected-date" id="selectedDateDisplay" style="display:none;">
                  <div class="car-requests-selected-date-icon">📅</div>
                  <div>
                    <div class="car-requests-selected-date-label">Выбранная дата</div>
                    <div class="car-requests-selected-date-value" id="selectedDateText"></div>
                  </div>
                </div>
                
                <form id="carForm" class="car-requests-form">
                  <input type="hidden" id="chatIdInput" name="chat_id" value="${appState.chatId}" />
                  <input type="hidden" id="selectedRequestDate" name="request_date" />
                  
                  <div class="car-requests-fulltime-row">
                    <label class="car-requests-toggle-switch">
                      <input type="checkbox" id="fullDay">
                      <span class="car-requests-toggle-track"></span>
                    </label>
                    <span style="margin-left:10px;min-width:auto;color:var(--cr-text-muted);font-size:12px;">Полный день</span>
                    <div class="car-requests-fulltime-divider"></div>
                    <div class="car-requests-time-pair">
                      <input type="text" id="timeFrom" inputmode="numeric" value="09:00" />
                      <span>—</span>
                      <input type="text" id="timeTo" inputmode="numeric" value="18:00" />
                    </div>
                  </div>
                  
                  <div class="car-requests-fulltime-row" style="padding:8px 14px;">
                    <div class="car-requests-car-buttons">
                      <button type="button" class="car-requests-car-btn blue" data-car="Приус синий 073">Приус синий 073</button>
                      <button type="button" class="car-requests-car-btn green" data-car="Приус белый 231">Приус белый 231</button>
                    </div>
                    <input type="hidden" id="selectedCar" name="car" value="">
                  </div>
                  
                  <div class="car-requests-form-row">
                    <label>Комментарий <span style="color:var(--cr-red);">*</span></label>
                    <textarea 
                      id="comment" 
                      name="comment" 
                      rows="2" 
                      placeholder="Укажите цель поездки"
                      maxlength="500"
                      required
                    ></textarea>
                    <div class="car-requests-char-counter">
                      <span id="charCount">0</span>/500
                    </div>
                  </div>
                  
                  <button type="submit" class="car-requests-btn car-requests-btn-primary">Отправить запрос</button>
                  <div id="responseMessage" style="margin-top:8px;"></div>
                </form>
              </div>
            </div>
          </div>
          
          <div id="requestsTab" class="car-requests-tab-content">
            <div class="car-requests-card">
              <div class="car-requests-card-header">
                <h3>Мои запросы</h3>
              </div>
              
              <div class="car-requests-card-body" style="padding-top:0;">
                <div id="historyList"></div>
                <div id="noRecords" class="car-requests-empty-state" style="display:none;">У вас пока нет запросов</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="editModal" class="car-requests-modal">
      <div class="car-requests-modal-content">
        <div class="car-requests-modal-header">
          <h3>Редактировать запрос</h3>
          <button class="car-requests-modal-close" id="closeEditModal">✕</button>
        </div>
        
        <form id="editForm" class="car-requests-form">
          <input type="hidden" id="editRequestId" name="requestId">
          
          <div class="car-requests-fulltime-row">
            <label class="car-requests-toggle-switch">
              <input type="checkbox" id="editFullDay">
              <span class="car-requests-toggle-track"></span>
            </label>
            <span style="margin-left:10px;min-width:auto;color:var(--cr-text-muted);font-size:12px;">Полный день</span>
            <div class="car-requests-fulltime-divider"></div>
            <div class="car-requests-time-pair">
              <input type="text" id="editTimeFrom" inputmode="numeric" value="09:00" />
              <span>—</span>
              <input type="text" id="editTimeTo" inputmode="numeric" value="18:00" />
            </div>
          </div>
          
          <div class="car-requests-fulltime-row" style="padding:8px 14px;">
            <span style="color:var(--cr-text-muted);font-size:12px;min-width:70px;">Машина</span>
            <div class="car-requests-car-buttons">
              <button type="button" class="car-requests-car-btn blue edit-car-btn" data-car="Приус синий 073">🔵 Синий</button>
              <button type="button" class="car-requests-car-btn green edit-car-btn" data-car="Приус белый 231">🟢 Белый</button>
            </div>
            <input type="hidden" id="editSelectedCar" name="car" value="">
          </div>
          
          <div class="car-requests-form-row">
            <label>Комментарий <span style="color:var(--cr-red);">*</span></label>
            <textarea 
              id="editComment" 
              name="comment" 
              rows="2" 
              maxlength="500"
              required
            ></textarea>
            <div class="car-requests-char-counter">
              <span id="editCharCount">0</span>/500
            </div>
          </div>
          
          <div class="car-requests-form-actions">
            <button type="submit" class="car-requests-btn car-requests-btn-save">Сохранить</button>
            <button type="button" class="car-requests-btn car-requests-btn-cancel" id="cancelEditBtn">Отмена</button>
          </div>
          <div id="editResponseMessage" style="margin-top:8px;"></div>
        </form>
      </div>
    </div>
    
    <div id="deleteConfirmModal" class="car-requests-modal">
      <div class="car-requests-modal-content" style="max-width:320px;">
        <div class="car-requests-modal-header">
          <h3>Подтверждение</h3>
          <button class="car-requests-modal-close" id="closeDeleteModal">✕</button>
        </div>
        
        <p style="margin:16px 0;color:var(--cr-text);">Удалить этот запрос?</p>
        
        <div class="car-requests-form-actions">
          <button id="confirmDelete" class="car-requests-btn car-requests-btn-save">Удалить</button>
          <button id="cancelDelete" class="car-requests-btn car-requests-btn-cancel">Отмена</button>
        </div>
      </div>
    </div>
    
    <div id="detailsModal" class="car-requests-modal">
      <div class="car-requests-modal-content" style="max-width:400px;">
        <div class="car-requests-modal-header">
          <h3>Детали запросов</h3>
          <button class="car-requests-modal-close" id="closeDetailsModal">✕</button>
        </div>
        
        <div id="detailsContent" style="max-height:60vh;overflow-y:auto;">
          <div id="noDetails" class="car-requests-empty-state">Выберите дату в календаре</div>
          <div id="detailsList" style="display:none;"></div>
        </div>
      </div>
    </div>
  `;

  const state = {
    currentDate: new Date(),
    selectedDate: null,
    allCarRequests: [],
    userRequests: [],
    currentEditRequest: null,
    currentDeleteRequest: null
  };

  const elements = {
    calendarGrid: document.getElementById('calendarGrid'),
    calendarMonthDisplay: document.getElementById('calendarMonthDisplay'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    carForm: document.getElementById('carForm'),
    selectedRequestDate: document.getElementById('selectedRequestDate'),
    selectedDateDisplay: document.getElementById('selectedDateDisplay'),
    selectedDateText: document.getElementById('selectedDateText'),
    fullDay: document.getElementById('fullDay'),
    timeFrom: document.getElementById('timeFrom'),
    timeTo: document.getElementById('timeTo'),
    carButtons: document.querySelectorAll('.car-requests-car-btn'),
    selectedCar: document.getElementById('selectedCar'),
    comment: document.getElementById('comment'),
    charCount: document.getElementById('charCount'),
    responseMessage: document.getElementById('responseMessage'),
    historyList: document.getElementById('historyList'),
    noRecords: document.getElementById('noRecords'),
    tabBtns: document.querySelectorAll('.car-requests-tab-btn'),
    tabContents: document.querySelectorAll('.car-requests-tab-content'),
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editForm'),
    editRequestId: document.getElementById('editRequestId'),
    editFullDay: document.getElementById('editFullDay'),
    editTimeFrom: document.getElementById('editTimeFrom'),
    editTimeTo: document.getElementById('editTimeTo'),
    editCarButtons: document.querySelectorAll('.edit-car-btn'),
    editSelectedCar: document.getElementById('editSelectedCar'),
    editComment: document.getElementById('editComment'),
    editCharCount: document.getElementById('editCharCount'),
    editResponseMessage: document.getElementById('editResponseMessage'),
    closeEditModal: document.getElementById('closeEditModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    confirmDelete: document.getElementById('confirmDelete'),
    cancelDelete: document.getElementById('cancelDelete'),
    closeDeleteModal: document.getElementById('closeDeleteModal'),
    detailsModal: document.getElementById('detailsModal'),
    detailsList: document.getElementById('detailsList'),
    noDetails: document.getElementById('noDetails'),
    closeDetailsModal: document.getElementById('closeDetailsModal')
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const init = async () => {
    await loadAllCarRequests();
    await loadUserHistory();
    renderCalendar();
    setupEventListeners();
    setupCommentCounter();
    setupFullDayToggle();
  };

  const setupFullDayToggle = () => {
    const toggleTimeInputs = (isFullDay) => {
      elements.timeFrom.disabled = isFullDay;
      elements.timeTo.disabled = isFullDay;
    };

    elements.fullDay.addEventListener('change', (e) => {
      toggleTimeInputs(e.target.checked);
    });

    elements.editFullDay.addEventListener('change', (e) => {
      elements.editTimeFrom.disabled = e.target.checked;
      elements.editTimeTo.disabled = e.target.checked;
    });
  };

  const loadAllCarRequests = async () => {
    try {
      const res = await fetch('/api/all-car-requests');
      const result = await res.json();
      state.allCarRequests = result.requests || [];
      renderCalendar();
    } catch (error) {
      console.error('Error loading car requests:', error);
    }
  };

  const loadUserHistory = async () => {
    try {
      const res = await fetch(`/api/car-requests/${appState.chatId}`);
      const result = await res.json();
      state.userRequests = result.requests || [];
      renderHistoryList();
    } catch (error) {
      elements.noRecords.style.display = 'block';
      elements.noRecords.textContent = 'Ошибка загрузки';
    }
  };

  const renderCalendar = () => {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    elements.calendarMonthDisplay.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    
    const today = new Date();
    const todayStr = formatDateStr(today);
    
    let html = '';
    
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const cellYear = cellDate.getFullYear();
      const cellMonth = cellDate.getMonth();
      const cellDay = cellDate.getDate();
      const cellDateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
      
      const isCurrentMonth = cellMonth === month;
      const isToday = cellDateStr === todayStr;
      const isSelected = state.selectedDate === cellDateStr;
      
      const dayRequests = state.allCarRequests.filter(r => r.request_date === cellDateStr);
      const hasUserRequest = dayRequests.some(r => r.chat_id == appState.chatId);
      
      let timeSlotsHtml = '';
      
      if (dayRequests.length > 0) {
        const workStart = 8;
        const workEnd = 18;
        const totalHours = workEnd - workStart;
        
        ['Приус синий 073', 'Приус белый 231'].forEach((car, idx) => {
          const carRequests = dayRequests.filter(r => r.car === car);
          if (carRequests.length === 0) {
            timeSlotsHtml += `<div class="car-requests-slot-track"></div>`;
          } else {
            let slotsHtml = '';
            carRequests.forEach(req => {
              const startHour = parseInt(req.time_from.split(':')[0]);
              const endHour = parseInt(req.time_to.split(':')[0]);
              const startPercent = ((startHour - workStart) / totalHours) * 100;
              const widthPercent = ((endHour - startHour) / totalHours) * 100;
              const isUserRequest = req.chat_id == appState.chatId;
              
              slotsHtml += `
                <div class="car-requests-slot-bar ${idx === 0 ? 'car-1' : 'car-2'}" 
                     style="left:${Math.max(0, startPercent)}%;width:${Math.min(widthPercent, 100 - Math.max(0, startPercent))}%;opacity:${isUserRequest ? '1' : '0.5'};"
                     title="${car}: ${req.time_from}-${req.time_to}${isUserRequest ? ' (мой запрос)' : ''}"></div>
              `;
            });
            
            timeSlotsHtml += `<div class="car-requests-slot-track">${slotsHtml}</div>`;
          }
        });
      } else {
        timeSlotsHtml = `
          <div class="car-requests-slot-track"></div>
          <div class="car-requests-slot-track"></div>
        `;
      }
      
      html += `
        <div class="car-requests-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date="${cellDateStr}">
          <div class="car-requests-day-header">
            <span class="car-requests-day-number">${cellDay}</span>
          </div>
          <div class="car-requests-time-slots">
            ${timeSlotsHtml}
          </div>
          ${hasUserRequest ? '<div class="car-requests-user-dot"></div>' : ''}
        </div>
      `;
    }
    
    elements.calendarGrid.innerHTML = html;
    
    document.querySelectorAll('.car-requests-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        selectDate(dateStr);
      });
    });
  };

  const selectDate = (dateStr) => {
    state.selectedDate = dateStr;
    elements.selectedRequestDate.value = dateStr;
    
    const date = new Date(dateStr);
    elements.selectedDateDisplay.style.display = 'flex';
    elements.selectedDateText.textContent = date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    renderCalendar();
    showDayDetails(dateStr);
  };

  const showDayDetails = (dateStr) => {
    const dayRequests = state.allCarRequests.filter(r => r.request_date === dateStr);
    
    if (dayRequests.length === 0) return;
    
    elements.detailsList.innerHTML = dayRequests.map(req => `
      <div class="car-requests-detail-item ${req.car.includes('синий') ? 'blue-border' : 'green-border'}">
        <div class="car-requests-detail-header">
          <span class="car-requests-detail-car">${req.car}</span>
          <span class="car-requests-detail-time">${req.time_from}—${req.time_to}</span>
        </div>
        <div class="car-requests-detail-user">👤 ${req.user_name || 'Неизвестно'}</div>
        <div class="car-requests-detail-comment">${req.comment || 'Без комментария'}</div>
        ${req.chat_id == appState.chatId ? '<div class="car-requests-my-request-badge">мой запрос</div>' : ''}
      </div>
    `).join('');
    
    elements.noDetails.style.display = 'none';
    elements.detailsList.style.display = 'block';
    elements.detailsModal.style.display = 'flex';
  };

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const setupEventListeners = () => {
    elements.prevMonth.addEventListener('click', () => {
      state.currentDate.setMonth(state.currentDate.getMonth() - 1);
      renderCalendar();
    });

    elements.nextMonth.addEventListener('click', () => {
      state.currentDate.setMonth(state.currentDate.getMonth() + 1);
      renderCalendar();
    });

    elements.carButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.carButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        elements.selectedCar.value = btn.dataset.car;
      });
    });

    elements.editCarButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.editCarButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        elements.editSelectedCar.value = btn.dataset.car;
      });
    });

    elements.closeEditModal.addEventListener('click', () => {
      elements.editModal.style.display = 'none';
      resetEditForm();
    });

    elements.cancelEditBtn.addEventListener('click', () => {
      elements.editModal.style.display = 'none';
      resetEditForm();
    });

    elements.closeDeleteModal.addEventListener('click', () => {
      elements.deleteConfirmModal.style.display = 'none';
      state.currentDeleteRequest = null;
    });

    elements.closeDetailsModal.addEventListener('click', () => {
      elements.detailsModal.style.display = 'none';
      elements.noDetails.style.display = 'block';
      elements.detailsList.style.display = 'none';
    });

    elements.carForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!state.selectedDate) {
        showResponseMessage('Выберите дату в календаре', false);
        return;
      }

      const formData = new FormData(e.target);
      const payload = {
        car: elements.selectedCar.value,
        chat_id: appState.chatId,
        request_date: state.selectedDate,
        time_from: elements.fullDay.checked ? '09:00' : elements.timeFrom.value,
        time_to: elements.fullDay.checked ? '18:00' : elements.timeTo.value,
        comment: elements.comment.value.trim()
      };

      if (!payload.car) {
        showResponseMessage('Выберите машину', false);
        return;
      }

      if (!payload.comment) {
        showResponseMessage('Укажите комментарий', false);
        return;
      }

      if (!elements.fullDay.checked && payload.time_from >= payload.time_to) {
        showResponseMessage('Время "По" должно быть позже времени "С"', false);
        return;
      }

      try {
        const checkRes = await fetch('/api/check-car-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const checkResult = await checkRes.json();
        if (!checkResult.available) {
          throw new Error('Машина уже занята');
        }

        const createRes = await fetch('/api/car-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) throw new Error('Ошибка создания запроса');

        showResponseMessage('✅ Запрос создан!', true);
        resetForm();
        await loadAllCarRequests();
        await loadUserHistory();
      } catch (error) {
        showResponseMessage(`❌ ${error.message}`, false);
      }
    });

    elements.editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const requestId = elements.editRequestId.value;
      const payload = {
        car: elements.editSelectedCar.value,
        request_date: state.currentEditRequest.request_date,
        time_from: elements.editFullDay.checked ? '09:00' : elements.editTimeFrom.value,
        time_to: elements.editFullDay.checked ? '18:00' : elements.editTimeTo.value,
        comment: elements.editComment.value.trim()
      };

      if (!payload.car) {
        showEditResponseMessage('Выберите машину', false);
        return;
      }

      if (!payload.comment) {
        showEditResponseMessage('Укажите комментарий', false);
        return;
      }

      if (!elements.editFullDay.checked && payload.time_from >= payload.time_to) {
        showEditResponseMessage('Время "По" должно быть позже', false);
        return;
      }

      try {
        const checkRes = await fetch('/api/check-car-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, excludeRequestId: requestId })
        });

        const checkResult = await checkRes.json();
        if (!checkResult.available) {
          throw new Error('Машина уже занята');
        }

        const updateRes = await fetch(`/api/car-requests/${requestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!updateRes.ok) throw new Error('Ошибка обновления');

        showEditResponseMessage('✅ Запрос обновлен!', true);
        setTimeout(() => {
          elements.editModal.style.display = 'none';
          resetEditForm();
          loadUserHistory();
          loadAllCarRequests();
        }, 1500);
      } catch (error) {
        showEditResponseMessage(`❌ ${error.message}`, false);
      }
    });

    elements.confirmDelete.addEventListener('click', async () => {
      if (!state.currentDeleteRequest) return;
      
      try {
        await fetch(`/api/car-requests/${state.currentDeleteRequest.id}`, { 
          method: 'DELETE' 
        });
        await loadUserHistory();
        await loadAllCarRequests();
      } catch (error) {
        console.error('Error deleting:', error);
      } finally {
        elements.deleteConfirmModal.style.display = 'none';
        state.currentDeleteRequest = null;
      }
    });

    elements.cancelDelete.addEventListener('click', () => {
      elements.deleteConfirmModal.style.display = 'none';
      state.currentDeleteRequest = null;
    });

    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        elements.tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'requestsTab') {
          loadUserHistory();
        }
      });
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('car-requests-modal')) {
        e.target.style.display = 'none';
        if (e.target.id === 'editModal') resetEditForm();
        if (e.target.id === 'deleteConfirmModal') state.currentDeleteRequest = null;
        if (e.target.id === 'detailsModal') {
          elements.noDetails.style.display = 'block';
          elements.detailsList.style.display = 'none';
        }
      }
    });
  };

  const setupCommentCounter = () => {
    elements.comment.addEventListener('input', function() {
      elements.charCount.textContent = this.value.length;
    });

    elements.editComment.addEventListener('input', function() {
      elements.editCharCount.textContent = this.value.length;
    });
  };

  const renderHistoryList = () => {
    if (state.userRequests.length === 0) {
      elements.historyList.innerHTML = '';
      elements.noRecords.style.display = 'block';
      return;
    }
    
    elements.noRecords.style.display = 'none';
    
    elements.historyList.innerHTML = state.userRequests
      .sort((a, b) => new Date(b.request_date) - new Date(a.request_date))
      .map(request => `
        <div class="car-requests-request-card">
          <div class="car-requests-request-header">
            <span class="car-requests-request-car ${request.car.includes('синий') ? 'blue' : 'green'}">${request.car}</span>
            <span class="car-requests-request-time">${request.time_from}—${request.time_to}</span>
          </div>
          <div class="car-requests-request-comment">${request.comment}</div>
          <div class="car-requests-request-actions">
            <button class="car-requests-btn-icon edit edit-btn" data-id="${request.id}">✏️ Редактировать</button>
            <button class="car-requests-btn-icon delete delete-btn" data-id="${request.id}">🗑️ Удалить</button>
          </div>
        </div>
      `).join('');

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => handleEditClick(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteClick(btn.dataset.id));
    });
  };

  const handleEditClick = (requestId) => {
    const request = state.userRequests.find(r => r.id === parseInt(requestId));
    if (!request) return;
    
    state.currentEditRequest = request;
    elements.editRequestId.value = request.id;
    
    const isFullDay = request.time_from === '09:00' && request.time_to === '18:00';
    elements.editFullDay.checked = isFullDay;
    elements.editTimeFrom.value = request.time_from || '09:00';
    elements.editTimeTo.value = request.time_to || '18:00';
    elements.editTimeFrom.disabled = isFullDay;
    elements.editTimeTo.disabled = isFullDay;
    
    elements.editCarButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.car === request.car) {
        btn.classList.add('active');
      }
    });
    elements.editSelectedCar.value = request.car;
    
    elements.editComment.value = request.comment || '';
    elements.editCharCount.textContent = (request.comment || '').length;
    
    elements.editModal.style.display = 'flex';
  };

  const handleDeleteClick = (requestId) => {
    state.currentDeleteRequest = { id: parseInt(requestId) };
    elements.deleteConfirmModal.style.display = 'flex';
  };

  const showResponseMessage = (message, isSuccess) => {
    elements.responseMessage.innerHTML = `
      <div class="car-requests-toast ${isSuccess ? 'success' : 'error'}">
        ${message}
      </div>
    `;
    setTimeout(() => {
      elements.responseMessage.innerHTML = '';
    }, 3000);
  };

  const showEditResponseMessage = (message, isSuccess) => {
    elements.editResponseMessage.innerHTML = `
      <div class="car-requests-toast ${isSuccess ? 'success' : 'error'}">
        ${message}
      </div>
    `;
    setTimeout(() => {
      elements.editResponseMessage.innerHTML = '';
    }, 3000);
  };

  const resetForm = () => {
    elements.carForm.reset();
    elements.charCount.textContent = '0';
    elements.fullDay.checked = false;
    elements.timeFrom.disabled = false;
    elements.timeTo.disabled = false;
    elements.carButtons.forEach(btn => btn.classList.remove('active'));
    elements.selectedCar.value = '';
    state.selectedDate = null;
    elements.selectedDateDisplay.style.display = 'none';
    renderCalendar();
  };

  const resetEditForm = () => {
    elements.editForm.reset();
    elements.editCharCount.textContent = '0';
    elements.editFullDay.checked = false;
    elements.editTimeFrom.disabled = false;
    elements.editTimeTo.disabled = false;
    elements.editCarButtons.forEach(btn => btn.classList.remove('active'));
    elements.editSelectedCar.value = '';
    state.currentEditRequest = null;
  };

  await init();
}