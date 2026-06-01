export async function loadModule(container, { chatId, userData }) {
  
  const userAccess = {
    '767403373': { company: 'Хайтек', canEdit: false },
    '461583746': { company: 'Мафия', canEdit: false },
  };

  const currentUser = userAccess[chatId] || { company: null, canEdit: true };
  const canEdit = currentUser.canEdit;
  const userCompany = currentUser.company;

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const monthIndex = {
    "Январь": 1, "Февраль": 2, "Март": 3, "Апрель": 4, "Май": 5, "Июнь": 6,
    "Июль": 7, "Август": 8, "Сентябрь": 9, "Октябрь": 10, "Ноябрь": 11, "Декабрь": 12
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];
  const currentYear = now.getFullYear();

  const months = monthNames.map(name => ({ value: name, name }));
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) years.push(i);

  const tabs = [
    { id: 'data', label: 'Данные' },
    { id: 'fuel', label: 'Топливо' },
    { id: 'cars', label: 'Автомобили' },
    { id: 'totals', label: 'Итоги' },
    { id: 'analytics', label: 'Аналитика' }
  ];

  const columns = [
    { id: 'car-data', label: 'Данные авто' },
    { id: 'milage', label: 'Пробег' },
    { id: 'repairs', label: 'Ремонт' },
    { id: 'spendage', label: 'Расход' },
    { id: 'fuel-consumption', label: 'Расход, л/100км' },
    { id: 'costs', label: 'Затраты' },
    { id: 'comments', label: 'Комментарии' },
    { id: 'archive', label: 'Архив' },
    { id: 'insurance', label: 'Страховка' },
    { id: 'mold_insurance', label: 'Страховка МД' },
    { id: 'technical', label: 'Тех осмотр' }
  ];

  const settings = [
    {
      id: 'tabs',
      title: 'Вкладки',
      columns: tabs.map(tab => ({ id: `${tab.id}-tab`, label: tab.label }))
    },
    {
      id: 'columns',
      title: 'Данные',
      columns: columns
    },
    {
      id: 'filters',
      title: 'Фильтры',
      columns: [
        { id: 'archive-filter', label: 'Фильтры архива' },
        { id: 'company-filter', label: 'Фильтры компаний' },
        { id: 'no-milage-filter', label: 'Скрыть авто без пробега' }
      ]
    }
  ];

  container.innerHTML = `
    <div class="car-module-wrapper">
      <div class="car-module-layout">
        <div class="car-module-main">
          <div class="car-module-tabs-nav" id="dashboardTabs"></div>
          
          <div class="car-module-content">
            ${!canEdit && userCompany ? `
              <div class="car-module-badge company">
                Просмотр данных компании: ${userCompany}
              </div>
            ` : ''}
            
            ${!canEdit ? `
              <div class="car-module-badge">
                Режим просмотра
              </div>
            ` : ''}
            
            <div class="car-module-filters" id="globalFilters"></div>
            <div id="tabContent" class="car-module-table-container" style="position: relative;"></div>
          </div>
        </div>
        
        <div class="car-module-sidebar">
          <h2 class="car-module-sidebar-title">Настройки</h2>
          <div id="dashboardSettings"></div>
        </div>
      </div>

      <div class="car-module-modal" id="fuelModal">
        <div class="car-module-modal-content">
          <div class="car-module-modal-header">
            <span>Ввод данных по топливу</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <p class="car-module-badge" id="modalInfo" style="margin-bottom: 16px;"></p>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Количество топлива (л)</label>
              <input type="number" class="car-module-form-input" id="modalFuelAmount" min="0" step="0.1">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Количество газа (м³)</label>
              <input type="number" class="car-module-form-input" id="modalGasAmount" min="0" step="0.1">
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="modalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="modalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-modal" id="milageModal">
        <div class="car-module-modal-content">
          <div class="car-module-modal-header">
            <span>Редактировать пробег</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <p class="car-module-badge" id="milageModalInfo" style="margin-bottom: 16px;"></p>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Пробег (км)</label>
              <input type="number" class="car-module-form-input" id="milageInput" min="0" step="0.1">
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="milageModalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="milageModalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-modal" id="repairsModal">
        <div class="car-module-modal-content">
          <div class="car-module-modal-header">
            <span>Добавить запись о ремонте/обслуживании</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <p class="car-module-badge" id="repairsModalInfo" style="margin-bottom: 16px;"></p>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тип <span class="car-module-required">*</span></label>
              <select class="car-module-form-select" id="repairsModalType">
                <option value="Ремонт">Ремонт</option>
                <option value="Расходники">Расходники</option>
                <option value="Услуги">Услуги</option>
              </select>
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Комментарий</label>
              <input type="text" class="car-module-form-input" id="repairsModalComment" placeholder="Что сделано / заменено">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Сумма (руб) <span class="car-module-required">*</span></label>
              <input type="number" class="car-module-form-input" id="repairsModalPrice" min="0" step="0.01">
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="repairsModalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="repairsModalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-modal" id="commentModal">
        <div class="car-module-modal-content">
          <div class="car-module-modal-header">
            <span>Комментарий</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <p class="car-module-badge" id="commentModalInfo" style="margin-bottom: 16px;"></p>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Текст комментария</label>
              <textarea class="car-module-form-input" id="commentText" rows="4" style="resize: vertical; min-height: 100px;"></textarea>
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="commentModalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="commentModalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-modal" id="carModal">
        <div class="car-module-modal-content" style="max-width: 600px;">
          <div class="car-module-modal-header">
            <span id="carModalTitle">Добавить автомобиль</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <div class="car-module-form-group">
              <label class="car-module-form-label">Номер <span class="car-module-required">*</span></label>
              <input type="text" class="car-module-form-input" id="carModalNumber">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Компания</label>
              <input type="text" class="car-module-form-input" id="carModalCompany">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Подразделение</label>
              <input type="text" class="car-module-form-input" id="carModalDepartment">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тип</label>
              <input type="text" class="car-module-form-input" id="carModalType">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тип топлива</label>
              <input type="text" class="car-module-form-input" id="carModalFuelType">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тип газа</label>
              <input type="text" class="car-module-form-input" id="carModalGasType">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Объем бака</label>
              <input type="number" class="car-module-form-input" id="carModalTank" min="0" step="0.1">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Год</label>
              <input type="text" class="car-module-form-input" id="carModalYear">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Норма расхода</label>
              <input type="number" class="car-module-form-input" id="carModalSpendingNorm" min="0" step="0.1">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Страховка до</label>
              <input type="date" class="car-module-form-input" id="carModalInsurance">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Страховка МД до</label>
              <input type="date" class="car-module-form-input" id="carModalMoldInsurance">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тех осмотр до</label>
              <input type="date" class="car-module-form-input" id="carModalTech">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Статус</label>
              <select class="car-module-form-select" id="carModalStatus">
                <option value="active">Активен</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="carModalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="carModalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-modal" id="fuelPriceModal">
        <div class="car-module-modal-content">
          <div class="car-module-modal-header">
            <span>Цена топлива</span>
            <button class="car-module-modal-close">&times;</button>
          </div>
          <div class="car-module-modal-body">
            <div class="car-module-form-group">
              <label class="car-module-form-label">Тип топлива <span class="car-module-required">*</span></label>
              <input type="text" class="car-module-form-input" id="fuelPriceModalFuelType" placeholder="например: Хайтек диз Шериф">
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Категория <span class="car-module-required">*</span></label>
              <select class="car-module-form-select" id="fuelPriceModalType">
                <option value="">Выберите категорию</option>
                <option value="бенз">Бензин</option>
                <option value="диз">Дизель</option>
                <option value="газ">Газ</option>
              </select>
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Компания <span class="car-module-required">*</span></label>
              <select class="car-module-form-select" id="fuelPriceModalCompany">
                <option value="">Выберите компанию</option>
                <option value="Хайтек">Хайтек</option>
                <option value="Керамика">Керамика</option>
                <option value="Мафия">Мафия</option>
                <option value="Мебельная">Мебельная</option>
              </select>
            </div>
            <div class="car-module-form-group">
              <label class="car-module-form-label">Цена за литр <span class="car-module-required">*</span></label>
              <input type="number" class="car-module-form-input" id="fuelPriceModalPrice" min="0" step="0.01">
            </div>
          </div>
          <div class="car-module-modal-footer">
            <button class="car-module-btn" id="fuelPriceModalCancel">Отмена</button>
            <button class="car-module-btn car-module-btn-primary" id="fuelPriceModalSave">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="car-module-toast-container" id="toastContainer"></div>
    </div>
  `;

  const dashboardTabs = container.querySelector('#dashboardTabs');
  const tabContent = container.querySelector('#tabContent');
  const globalFilters = container.querySelector('#globalFilters');
  const dashboardSettings = container.querySelector('#dashboardSettings');
  const fuelModal = container.querySelector('#fuelModal');
  const milageModal = container.querySelector('#milageModal');
  const repairsModal = container.querySelector('#repairsModal');
  const commentModal = container.querySelector('#commentModal');
  const carModal = container.querySelector('#carModal');
  const fuelPriceModal = container.querySelector('#fuelPriceModal');

  const modalCancel = container.querySelector('#modalCancel');
  const modalSave = container.querySelector('#modalSave');
  const modalInfo = container.querySelector('#modalInfo');

  const milageModalCancel = container.querySelector('#milageModalCancel');
  const milageModalSave = container.querySelector('#milageModalSave');
  const milageModalInfo = container.querySelector('#milageModalInfo');
  const milageInput = container.querySelector('#milageInput');

  const repairsModalCancel = container.querySelector('#repairsModalCancel');
  const repairsModalSave = container.querySelector('#repairsModalSave');
  const repairsModalInfo = container.querySelector('#repairsModalInfo');
  const repairsModalType = container.querySelector('#repairsModalType');
  const repairsModalComment = container.querySelector('#repairsModalComment');
  const repairsModalPrice = container.querySelector('#repairsModalPrice');

  const commentModalCancel = container.querySelector('#commentModalCancel');
  const commentModalSave = container.querySelector('#commentModalSave');
  const commentModalInfo = container.querySelector('#commentModalInfo');
  const commentText = container.querySelector('#commentText');

  const carModalCancel = container.querySelector('#carModalCancel');
  const carModalSave = container.querySelector('#carModalSave');

  const fuelPriceModalCancel = container.querySelector('#fuelPriceModalCancel');
  const fuelPriceModalSave = container.querySelector('#fuelPriceModalSave');

  function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `car-module-toast car-module-status-${type}`;
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

  async function getDashboardData(month, year) {
    const response = await fetch(`/api/cars/dashboard-data?month=${month}&year=${year}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки данных');
    return result.data;
  }

  async function getAnalyticsData(startMonth, startYear, endMonth, endYear, carNumber) {
    const response = await fetch(
      `/api/cars/analytics-data?startMonth=${startMonth}&startYear=${startYear}&endMonth=${endMonth}&endYear=${endYear}&car=${carNumber}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки аналитики');
    return result.data;
  }

  async function saveFuelData(car, month, year, fuelAmount, gasAmount, comment, archive) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/save-fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car, month, year, fuelAmount, gasAmount, comment, archive })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка сохранения');
    return result;
  }

  async function getAllCars() {
    const response = await fetch('/api/cars/get-cars');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки автомобилей');
    return result.data;
  }

  async function saveCar(carData) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/save-car', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(carData)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка сохранения');
    return result.data;
  }

  async function deleteCar(carId) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch(`/api/cars/delete-car/${carId}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления');
    return result;
  }

  async function getFuelPrices(month, year) {
    const response = await fetch(`/api/cars/fuel-prices?month=${month}&year=${year}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки цен');
    return result.data || [];
  }

  async function saveFuelPrice(id, fuelType, type, month, year, price, company) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/fuel-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fuelType, type, month, year, price: price.toString(), company })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка сохранения');
    return result.data;
  }

  async function deleteFuelPrice(priceId) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch(`/api/cars/fuel-price/${priceId}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления');
    return result;
  }

  async function deleteFuel(carNumber, month, year) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/delete-fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car: carNumber, month, year })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления');
    return result;
  }

  async function deleteMilage(carNumber, month, year) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/delete-milage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car: carNumber, month, year })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления');
    return result;
  }

  async function saveMilage(carNumber, month, year, milage, repairs = null) {
    if (!canEdit) throw new Error('У вас нет прав на редактирование');
    const response = await fetch('/api/cars/save-milage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carNumber, month, year, milage, repairs })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка сохранения');
    return result;
  }

  async function getMissingFuelTypes(month, year) {
    const response = await fetch(`/api/cars/missing-fuel-types?month=${month}&year=${year}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки');
    return result.data || [];
  }

  function getPreviousMonth(month, year) {
    const currentIndex = monthIndex[month];
    let prevIndex = currentIndex - 1;
    let prevYear = year;
    if (prevIndex < 1) {
      prevIndex = 12;
      prevYear = year - 1;
    }
    return {
      month: monthNames[prevIndex - 1],
      year: prevYear
    };
  }

  function calculateMonthlyMilage(currentMilage, previousMilage) {
    if (!currentMilage || currentMilage === '0') return '0';
    const current = parseFloat(currentMilage);
    const previous = previousMilage ? parseFloat(previousMilage) : 0;
    if (isNaN(current) || isNaN(previous)) return '0';
    if (current < previous) return '0';
    const difference = current - previous;
    return difference.toFixed(0);
  }

  function calculateFuelConsumption(fuelAmount, monthlyMilage) {
    if (!fuelAmount || !monthlyMilage || parseFloat(monthlyMilage) === 0) return null;
    const fuel = parseFloat(fuelAmount);
    const milage = parseFloat(monthlyMilage);
    if (isNaN(fuel) || isNaN(milage) || fuel === 0 || milage === 0) return null;
    const consumption = (fuel / milage) * 100;
    return consumption.toFixed(1);
  }

  const GAS_TO_FUEL_RATIO = 1.0;

  let activeTab = 'data';
  let dashboardData = [];
  let carsData = [];
  let fuelPricesData = [];
  let missingFuelData = [];
  let filteredData = [];
  let filteredCarsData = [];
  let filteredFuelPricesData = [];
  let currentEditCar = null;
  let currentEditCarId = null;
  let currentEditMilageData = null;
  let currentEditFuelPriceId = null;
  let currentEditRepairsData = null;

  let selectedMonth = localStorage.getItem('car-dashboard-month') || currentMonthName;
  let selectedYear = parseInt(localStorage.getItem('car-dashboard-year')) || currentYear;

  let searchQuery = '';
  let carsSearchQuery = '';
  let searchTimeout = null;
  let carsSearchTimeout = null;

  let isLoading = false;

  let analyticsStartMonth = 'Январь';
  let analyticsStartYear = currentYear - 1;
  let analyticsEndMonth = currentMonthName;
  let analyticsEndYear = currentYear;
  let analyticsSelectedCar = '';
  let analyticsSelectedMetrics = ['mileage', 'fuel_used', 'fuel_cost'];

  const availableMetrics = [
    { id: 'mileage', label: 'Пробег (км)', group: 'distance', color: '#4f8ef7' },
    { id: 'fuel_used', label: 'Топливо (л)', group: 'volume', color: '#22c55e' },
    { id: 'gas_used', label: 'Газ (м³)', group: 'volume', color: '#eab308' },
    { id: 'fuel_cost', label: 'Затраты на топливо (руб)', group: 'money', color: '#ef4444' },
    { id: 'gas_cost', label: 'Затраты на газ (руб)', group: 'money', color: '#f97316' },
    { id: 'repairs', label: 'Ремонт (руб)', group: 'money', color: '#a78bfa' },
    { id: 'total_cost', label: 'Общие затраты (руб)', group: 'money', color: '#e8ecf4' },
    { id: 'efficiency', label: 'Расход (л/100км)', group: 'ratio', color: '#14b8a6' }
  ];

  let archiveFilters = {
    показания: false,
    топливо: false,
    табель: false,
    списание: false,
    архив: false,
    empty: false
  };

  let hideNoMilageCars = true;
  let companyFilters = {};
  let carsCompanyFilters = {};
  let totalsCompanyFilters = {};

  function filterByUserCompany(data) {
    if (!userCompany) return data;
    return data.filter(item => item.company === userCompany);
  }

  function saveGlobalDateSelection(month, year) {
    localStorage.setItem('car-dashboard-month', month);
    localStorage.setItem('car-dashboard-year', year.toString());
    selectedMonth = month;
    selectedYear = year;
  }

  function updateDateSelection(month, year) {
    saveGlobalDateSelection(month, year);
    reloadData();
    loadFuelPrices();
    loadMissingFuelTypes();
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

  function debounceCars(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(carsSearchTimeout);
        func(...args);
      };
      clearTimeout(carsSearchTimeout);
      carsSearchTimeout = setTimeout(later, wait);
    };
  }

  function setLoading(loading, message = 'Загрузка данных...') {
    isLoading = loading;
    const content = container.querySelector('#tabContent');
    if (!content) return;
    
    if (loading) {
      const existingOverlay = content.querySelector('.car-module-loading-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      const overlay = document.createElement('div');
      overlay.className = 'car-module-loading-overlay';
      overlay.innerHTML = `
        <div class="car-module-loading-message">
          <div class="car-module-loading-spinner"></div>
          <div>${message}</div>
        </div>
      `;
      content.style.position = 'relative';
      content.appendChild(overlay);
    } else {
      const overlay = content.querySelector('.car-module-loading-overlay');
      if (overlay) overlay.remove();
    }
  }

  async function refreshData() {
    const refreshBtn = container.querySelector('#globalRefreshBtn');
    if (!refreshBtn || isLoading) return;
    
    try {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('loading');
      setLoading(true, 'Обновление данных...');
      await Promise.all([
        reloadData(),
        loadCarsData(),
        loadFuelPrices(),
        loadMissingFuelTypes()
      ]);
      
      renderContent();
      
      if (activeTab === 'analytics' && analyticsSelectedCar) {
        await loadAnalyticsData();
      }
      
      showToast('Данные обновлены', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast('Ошибка при обновлении данных: ' + error.message, 'error');
    } finally {
      setLoading(false);
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('loading');
    }
  }

  function loadUserSettings() {
    const saved = localStorage.getItem('car-dashboard-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (!settings.visibleFilters) {
        settings.visibleFilters = {
          'archive-filter': true,
          'company-filter': true,
          'no-milage-filter': true
        };
      }
      return settings;
    }
    return {
      visibleTabs: tabs.map(tab => tab.id),
      visibleColumns: columns.map(col => col.id),
      expandedSettings: [],
      visibleFilters: {
        'archive-filter': true,
        'company-filter': true,
        'no-milage-filter': true
      }
    };
  }

  function saveUserSettings(settings) {
    localStorage.setItem('car-dashboard-settings', JSON.stringify(settings));
  }

  let isRenderingAnalytics = false;

  function renderTabs() {
    const userSettings = loadUserSettings();
    dashboardTabs.innerHTML = '';
    
    tabs.forEach(tab => {
      if (userSettings.visibleTabs.includes(tab.id)) {
        const tabElement = document.createElement('button');
        tabElement.className = `car-module-tab-btn ${activeTab === tab.id ? 'active' : ''}`;
        tabElement.textContent = tab.label;
        tabElement.dataset.tab = tab.id;
        tabElement.addEventListener('click', () => {
          if (tab.id === activeTab) return;
          switchTab(tab.id);
        });
        dashboardTabs.appendChild(tabElement);
      }
    });
  }

  function switchTab(tabId) {
    if (tabId === activeTab) return;
    activeTab = tabId;
    
    if (tabId === 'analytics') {
      analyticsStartMonth = analyticsStartMonth || 'Январь';
      analyticsEndMonth = analyticsEndMonth || currentMonthName;
      analyticsStartYear = analyticsStartYear || currentYear - 1;
      analyticsEndYear = analyticsEndYear || currentYear;
      analyticsSelectedMetrics = analyticsSelectedMetrics || ['mileage', 'fuel_used', 'fuel_cost'];
    }
    
    if (tabId === 'cars') filterCarsData();
    else if (tabId === 'totals') filterTotalsData();
    else if (tabId === 'fuel') filterFuelPricesData();
    else if (tabId === 'data') filterData();
    
    renderTabs();
    renderContent();
    
    if (tabId === 'analytics' && analyticsSelectedCar && carsData && carsData.length > 0) {
      loadAnalyticsData();
    }
  }

function filterData() {
  let filtered = dashboardData.filter(car => {
    if (car.active === false) return false;
    
    if (hideNoMilageCars) {
      const currentMilageData = car.milage?.current;
      const currentMilageValue = currentMilageData?.milage || '0';
      if (!currentMilageValue || currentMilageValue === '0') return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const number = car.number?.toLowerCase() || '';
      const department = car.department?.toLowerCase() || '';
      const company = car.company?.toLowerCase() || '';
      const type = car.type?.toLowerCase() || '';
      if (!number.includes(query) &&
          !department.includes(query) &&
          !company.includes(query) &&
          !type.includes(query)) {
        return false;
      }
    }
    
    const activeCompanyFilters = Object.keys(companyFilters).filter(key => companyFilters[key]);
    if (activeCompanyFilters.length > 0) {
      const carCompany = car.company || '';
      if (!activeCompanyFilters.includes(carCompany)) return false;
    }
    
    const activeArchiveFilters = Object.keys(archiveFilters)
      .filter(key => key !== 'empty' && archiveFilters[key]);
    const hasEmptyFilterActive = archiveFilters.empty;
    
    if (activeArchiveFilters.length > 0 || hasEmptyFilterActive) {
      const currentFuel = car.fuel && Array.isArray(car.fuel) && car.fuel.length > 0 ? car.fuel[0] : null;
      const archiveData = currentFuel?.archive || null;
      const archiveObj = archiveData ? (typeof archiveData === 'string' ? JSON.parse(archiveData) : archiveData) : {};
      
      if (hasEmptyFilterActive && activeArchiveFilters.length === 0) {
        return Object.keys(archiveObj).length === 0;
      }
      
      if (activeArchiveFilters.length > 0 && !hasEmptyFilterActive) {
        return activeArchiveFilters.every(label => archiveObj[label] !== true);
      }
      
      if (hasEmptyFilterActive && activeArchiveFilters.length > 0) {
        const hasAnySelectedLabels = activeArchiveFilters.some(label => archiveObj[label] === true);
        return !hasAnySelectedLabels;
      }
    }
    return true;
  });
  
  filteredData = filterByUserCompany(filtered);
}
  
  function filterCarsData() {
    let filtered = carsData.filter(car => {
      if (carsSearchQuery) {
        const query = carsSearchQuery.toLowerCase();
        const number = car.number?.toLowerCase() || '';
        const department = car.department?.toLowerCase() || '';
        const company = car.company?.toLowerCase() || '';
        const type = car.type?.toLowerCase() || '';
        if (!number.includes(query) &&
            !department.includes(query) &&
            !company.includes(query) &&
            !type.includes(query)) {
          return false;
        }
      }
      
      const activeCompanyFilters = Object.keys(carsCompanyFilters).filter(key => carsCompanyFilters[key]);
      if (activeCompanyFilters.length > 0) {
        const carCompany = car.company || '';
        if (!activeCompanyFilters.includes(carCompany)) return false;
      }
      return true;
    });
    
    filteredCarsData = filterByUserCompany(filtered);
  }

  function filterTotalsData() {
    const activeCompanyFilters = Object.keys(totalsCompanyFilters).filter(key => totalsCompanyFilters[key]);
    if (activeCompanyFilters.length === 0) return;
    
    filteredData = dashboardData.filter(car => {
      const carCompany = car.company || '';
      return activeCompanyFilters.includes(carCompany);
    });
    
    filteredData = filterByUserCompany(filteredData);
  }

  function filterFuelPricesData() {
    let filtered = fuelPricesData.filter(price => {
      const activeCompanyFilters = Object.keys(companyFilters).filter(key => companyFilters[key]);
      if (activeCompanyFilters.length > 0) {
        const priceCompany = price.company || '';
        return activeCompanyFilters.includes(priceCompany);
      }
      return true;
    });
    
    filteredFuelPricesData = filterByUserCompany(filtered);
  }

function renderGlobalFilters() {
  const userSettings = loadUserSettings();
  
  let filtersHTML = `
    <div class="car-module-filter-group">
      <label class="car-module-filter-label">Месяц</label>
      <select class="car-module-select" id="globalMonthFilter">
        ${months.map(m => `<option value="${m.value}" ${selectedMonth === m.value ? 'selected' : ''}>${m.name}</option>`).join('')}
      </select>
    </div>
    
    <div class="car-module-filter-group">
      <label class="car-module-filter-label">Год</label>
      <select class="car-module-select" id="globalYearFilter">
        ${years.map(y => `<option value="${y}" ${selectedYear === y ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    
    <button class="car-module-refresh-btn" id="globalRefreshBtn" title="Обновить данные">
      <svg class="car-module-refresh-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </button>
  `;
  
  if (activeTab === 'data') {
    filtersHTML += `
      <div class="car-module-filter-group wide">
        <label class="car-module-filter-label">Поиск авто</label>
        <input type="text" class="car-module-input" id="globalSearchFilter" placeholder="Номер, компания, тип..." value="${searchQuery}">
      </div>
    `;
  }
  
  if (activeTab === 'cars') {
    filtersHTML += `
      <div class="car-module-filter-group wide">
        <label class="car-module-filter-label">Поиск авто</label>
        <input type="text" class="car-module-input" id="carsSearchFilter" placeholder="Номер, компания, тип..." value="${carsSearchQuery}">
      </div>
    `;
  }
  
  if ((activeTab === 'fuel' || activeTab === 'cars') && canEdit) {
    filtersHTML += `
      <button class="car-module-action-btn" id="globalActionBtn">
        ${activeTab === 'fuel' ? 'Добавить цену' : 'Добавить автомобиль'}
      </button>
    `;
  }
  
  if (activeTab === 'analytics') {
    filtersHTML += `
      <div class="car-module-filter-group wide">
        <label class="car-module-filter-label">Автомобиль</label>
        <select class="car-module-select" id="analyticsCarFilter">
          <option value="">Выберите автомобиль</option>
        </select>
      </div>
      <button class="car-module-action-btn" id="analyticsApplyBtn">Применить</button>
    `;
  }
  
  if (activeTab === 'analytics') {
    const safeAnalyticsStartMonth = analyticsStartMonth || 'Январь';
    const safeAnalyticsEndMonth = analyticsEndMonth || currentMonthName;
    const safeAnalyticsStartYear = analyticsStartYear || currentYear - 1;
    const safeAnalyticsEndYear = analyticsEndYear || currentYear;
    
    filtersHTML += `
      <div class="car-module-filter-group">
        <label class="car-module-filter-label">С</label>
        <select class="car-module-select" id="analyticsStartMonth">
          ${months.map(m => `<option value="${m.value}" ${safeAnalyticsStartMonth === m.value ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>
      <div class="car-module-filter-group">
        <label class="car-module-filter-label">Год</label>
        <select class="car-module-select" id="analyticsStartYear">
          ${years.map(y => `<option value="${y}" ${safeAnalyticsStartYear === y ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      <div class="car-module-filter-group">
        <label class="car-module-filter-label">По</label>
        <select class="car-module-select" id="analyticsEndMonth">
          ${months.map(m => `<option value="${m.value}" ${safeAnalyticsEndMonth === m.value ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>
      <div class="car-module-filter-group">
        <label class="car-module-filter-label">Год</label>
        <select class="car-module-select" id="analyticsEndYear">
          ${years.map(y => `<option value="${y}" ${safeAnalyticsEndYear === y ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
    `;
  }
  
  if (userSettings.visibleFilters['company-filter'] && !userCompany) {
    let companies = [];
    if (activeTab === 'data') {
      companies = [...new Set(dashboardData.map(car => car.company).filter(Boolean))];
    } else if (activeTab === 'cars') {
      companies = [...new Set(carsData.map(car => car.company).filter(Boolean))];
    } else if (activeTab === 'fuel') {
      companies = [...new Set(fuelPricesData.map(price => price.company).filter(Boolean))];
    } else if (activeTab === 'totals') {
      companies = [...new Set(dashboardData.map(car => car.company).filter(Boolean))];
    }
    
    if (companies.length > 0) {
      filtersHTML += `<div class="car-module-filter-checkbox-group">`;
      companies.forEach(company => {
        let isChecked = false;
        if (activeTab === 'data') {
          isChecked = companyFilters[company] || false;
        } else if (activeTab === 'cars') {
          isChecked = carsCompanyFilters[company] || false;
        } else if (activeTab === 'totals') {
          isChecked = totalsCompanyFilters[company] || false;
        } else if (activeTab === 'fuel') {
          isChecked = companyFilters[company] || false;
        }
        
        filtersHTML += `
          <label class="car-module-filter-checkbox ${isChecked ? 'active' : ''}">
            <input type="checkbox" ${isChecked ? 'checked' : ''} data-company-filter="${company}">
            ${company}
          </label>
        `;
      });
      filtersHTML += `</div>`;
    }
  }
  
  if (userSettings.visibleFilters['archive-filter'] && userSettings.visibleColumns.includes('archive') && activeTab === 'data') {
    filtersHTML += `<div class="car-module-filter-checkbox-group">`;
    ['показания', 'топливо', 'табель', 'списание', 'архив'].forEach(label => {
      filtersHTML += `
        <label class="car-module-filter-checkbox ${archiveFilters[label] ? 'active' : ''}">
          <input type="checkbox" ${archiveFilters[label] ? 'checked' : ''} data-archive-filter="${label}">
          ${label}
        </label>
      `;
    });
    filtersHTML += `
        <label class="car-module-filter-checkbox ${archiveFilters.empty ? 'active' : ''}">
          <input type="checkbox" ${archiveFilters.empty ? 'checked' : ''} data-archive-filter="empty">
          пустые
        </label>
      </div>
    `;
  }
  
  globalFilters.innerHTML = filtersHTML;
  
  const monthFilter = document.getElementById('globalMonthFilter');
  const yearFilter = document.getElementById('globalYearFilter');
  const searchFilter = document.getElementById('globalSearchFilter');
  const carsSearchFilter = document.getElementById('carsSearchFilter');
  const actionBtn = document.getElementById('globalActionBtn');
  const analyticsCarFilter = document.getElementById('analyticsCarFilter');
  const analyticsStartMonthEl = document.getElementById('analyticsStartMonth');
  const analyticsStartYearEl = document.getElementById('analyticsStartYear');
  const analyticsEndMonthEl = document.getElementById('analyticsEndMonth');
  const analyticsEndYearEl = document.getElementById('analyticsEndYear');
  const analyticsApplyBtn = document.getElementById('analyticsApplyBtn');
  
  if (monthFilter) {
    monthFilter.addEventListener('change', (e) => updateDateSelection(e.target.value, selectedYear));
  }
  
  if (yearFilter) {
    yearFilter.addEventListener('change', (e) => updateDateSelection(selectedMonth, parseInt(e.target.value)));
  }
  
  if (searchFilter) {
    const debouncedSearch = debounce((e) => {
      searchQuery = e.target.value;
      if (activeTab === 'data') {
        filterData();
        renderDataTable(loadUserSettings());
      }
    }, 500);
    searchFilter.addEventListener('input', debouncedSearch);
  }
  
  if (carsSearchFilter) {
    const debouncedCarsSearch = debounceCars((e) => {
      carsSearchQuery = e.target.value;
      if (activeTab === 'cars') {
        filterCarsData();
        renderCarsTab();
      }
    }, 500);
    carsSearchFilter.addEventListener('input', debouncedCarsSearch);
  }
  
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      if (activeTab === 'fuel') {
        openFuelPriceModal();
      } else if (activeTab === 'cars') {
        openCarModal();
      }
    });
  }
  
  if (analyticsCarFilter && carsData && carsData.length > 0) {
    updateAnalyticsCarFilter();
  }
  
  if (analyticsApplyBtn) {
    analyticsApplyBtn.addEventListener('click', () => {
      const startMonthEl = document.getElementById('analyticsStartMonth');
      const startYearEl = document.getElementById('analyticsStartYear');
      const endMonthEl = document.getElementById('analyticsEndMonth');
      const endYearEl = document.getElementById('analyticsEndYear');
      const carEl = document.getElementById('analyticsCarFilter');
      
      if (startMonthEl && startYearEl && endMonthEl && endYearEl && carEl) {
        analyticsStartMonth = startMonthEl.value;
        analyticsStartYear = parseInt(startYearEl.value);
        analyticsEndMonth = endMonthEl.value;
        analyticsEndYear = parseInt(endYearEl.value);
        analyticsSelectedCar = carEl.value;
        
        if (analyticsSelectedCar) {
          loadAnalyticsData();
        } else {
          const summaryContainer = document.getElementById('summaryCards');
          if (summaryContainer) {
            summaryContainer.innerHTML = '<div style="text-align: center; color: var(--car-text-muted); padding: 20px;">Выберите автомобиль для просмотра аналитики</div>';
          }
        }
      }
    });
  }
  
  document.querySelectorAll('[data-archive-filter]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const label = e.target.dataset.archiveFilter;
      archiveFilters[label] = e.target.checked;
      e.target.closest('.car-module-filter-checkbox').classList.toggle('active', e.target.checked);
      
      if (activeTab === 'data') {
        filterData();
        renderDataTable(loadUserSettings());
      }
    });
  });
  
  document.querySelectorAll('[data-company-filter]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const company = e.target.dataset.companyFilter;
      const isChecked = e.target.checked;
      
      if (activeTab === 'data') {
        companyFilters[company] = isChecked;
      } else if (activeTab === 'cars') {
        carsCompanyFilters[company] = isChecked;
      } else if (activeTab === 'totals') {
        totalsCompanyFilters[company] = isChecked;
      } else if (activeTab === 'fuel') {
        companyFilters[company] = isChecked;
      }
      
      e.target.closest('.car-module-filter-checkbox').classList.toggle('active', isChecked);
      
      if (activeTab === 'data') {
        filterData();
        renderDataTable(loadUserSettings());
      } else if (activeTab === 'cars') {
        filterCarsData();
        renderCarsTab();
      } else if (activeTab === 'totals') {
        filterTotalsData();
        renderTotalsTab();
      } else if (activeTab === 'fuel') {
        filterFuelPricesData();
        renderFuelTab();
      }
    });
  });
}

  function renderContent() {
    const userSettings = loadUserSettings();
    renderGlobalFilters();
    
    if (activeTab === 'data') {
      renderDataTable(userSettings);
    } else if (activeTab === 'cars') {
      renderCarsTab();
    } else if (activeTab === 'fuel') {
      renderFuelTab();
    } else if (activeTab === 'totals') {
      renderTotalsTab();
    } else if (activeTab === 'analytics') {
      renderAnalyticsTab();
    }
  }

  function animateColumnChange(userSettings) {
    const table = container.querySelector('.car-module-table');
    if (!table) return;
    
    const headerCells = table.querySelectorAll('thead th');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    const visibleColumns = userSettings.visibleColumns;
    
    headerCells[0].classList.remove('hidden');
    bodyRows.forEach(row => {
      const cell = row.querySelector('td:nth-child(1)');
      if (cell) cell.classList.remove('hidden');
    });
    
    columns.forEach((col, colIdx) => {
      const isVisible = visibleColumns.includes(col.id);
      const headerCell = headerCells[colIdx + 1];
      if (headerCell) headerCell.classList.toggle('hidden', !isVisible);
      
      bodyRows.forEach(row => {
        const cell = row.querySelector(`td:nth-child(${colIdx + 2})`);
        if (cell) cell.classList.toggle('hidden', !isVisible);
      });
    });
  }

  async function updateArchiveCheckbox(carNumber, label, checked) {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    try {
      const carData = dashboardData.find(car => car.number === carNumber);
      const currentFuel = carData?.fuel?.[0];
      const existingFuelAmount = currentFuel?.fuel_amount || '';
      const existingGasAmount = currentFuel?.gas_amount || '';
      const existingComment = currentFuel?.comment || '';
      const existingArchive = currentFuel?.archive || {};
      const archiveObj = typeof existingArchive === 'string' ? JSON.parse(existingArchive) : existingArchive;
      archiveObj[label] = checked;

      await saveFuelData(
        carNumber,
        selectedMonth,
        selectedYear.toString(),
        existingFuelAmount,
        existingGasAmount,
        existingComment,
        archiveObj
      );

      if (currentFuel) {
        currentFuel.archive = archiveObj;
      } else {
        if (!carData.fuel) carData.fuel = [];
        carData.fuel.push({
          car: carNumber,
          month: selectedMonth,
          year: selectedYear.toString(),
          fuel_amount: existingFuelAmount,
          gas_amount: existingGasAmount,
          comment: existingComment,
          archive: archiveObj
        });
      }
      
      showToast('Архив обновлен', 'success');
    } catch (error) {
      showToast('Ошибка обновления архива: ' + error.message, 'error');
      await reloadData();
    }
  }

  function updateFuelDataInTable(carNumber, fuelData) {
    const carIndex = dashboardData.findIndex(car => car.number === carNumber);
    if (carIndex === -1) return;
    
    if (!dashboardData[carIndex].fuel) {
      dashboardData[carIndex].fuel = [];
    }
    
    const existingFuelIndex = dashboardData[carIndex].fuel.findIndex(f =>
      f.month === selectedMonth && f.year === selectedYear.toString()
    );
    
    if (existingFuelIndex !== -1) {
      dashboardData[carIndex].fuel[existingFuelIndex] = {
        ...dashboardData[carIndex].fuel[existingFuelIndex],
        ...fuelData
      };
    } else {
      dashboardData[carIndex].fuel.push(fuelData);
    }
    
    filterData();
    const userSettings = loadUserSettings();
    renderDataTable(userSettings);
  }

  function getArchiveDisplayText(archiveData) {
    if (!archiveData) return '-';
    const archiveObj = typeof archiveData === 'string' ? JSON.parse(archiveData) : archiveData;
    const labels = ['показания', 'топливо', 'табель', 'списание', 'архив'];
    const shortLabels = ['показ', 'топл', 'табе', 'спис', 'арх'];
    const result = [];
    labels.forEach((label, index) => {
      if (archiveObj[label]) result.push(shortLabels[index]);
    });
    return result.join(', ') || '-';
  }

  function calculateRepairsSummary(repairsArray) {
    if (!repairsArray || !Array.isArray(repairsArray)) return { total: 0, byType: {} };
    
    let total = 0;
    const byType = {};
    
    repairsArray.forEach(repair => {
      if (repair.price) {
        const price = parseFloat(repair.price) || 0;
        total += price;
        
        const type = repair.type || 'Другое';
        if (!byType[type]) byType[type] = 0;
        byType[type] += price;
      }
    });
    
    return { total, byType };
  }

function renderDataTable(userSettings) {
  filterData();
  
  let tableHTML = '';
  
  if (dashboardData.length === 0) {
    tableHTML = `
      <div class="car-module-empty-state">
        <h3>Нет данных</h3>
        <p>Данные за ${selectedMonth} ${selectedYear} не найдены</p>
      </div>
    `;
  } else if (filteredData.length === 0) {
    tableHTML = `
      <div class="car-module-empty-state">
        <h3>Автомобили не найдены</h3>
        <p>Попробуйте изменить параметры поиска или фильтры</p>
      </div>
    `;
  } else {
    tableHTML = `
      <table class="car-module-table">
        <thead>
          <tr>
            <th>Авто</th>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;
    
    filteredData.forEach(car => {
      const currentMilageData = car.milage?.current;
      const previousMilageData = car.milage?.previous;
      const currentMilageValue = currentMilageData?.milage || '0';
      const previousMilageValue = previousMilageData?.milage || '0';
      const monthlyMilage = calculateMonthlyMilage(currentMilageValue, previousMilageValue);
      const monthlyMilageNum = parseFloat(monthlyMilage) || 0;
      
      const currentFuel = car.fuel && Array.isArray(car.fuel) && car.fuel.length > 0 ? car.fuel[0] : null;
      const fuelAmount = currentFuel?.fuel_amount ? parseFloat(currentFuel.fuel_amount) : 0;
      const gasAmount = currentFuel?.gas_amount ? parseFloat(currentFuel.gas_amount) : 0;
      const carComment = currentFuel?.comment || '';
      const archiveData = currentFuel?.archive || null;
      const archiveDisplay = getArchiveDisplayText(archiveData);
      const spendingNorm = car.spending_norm ? parseFloat(car.spending_norm) : null;
      
      const currentRepairsData = currentMilageData?.repairs;
      let repairsArray = [];
      if (currentRepairsData) {
        if (typeof currentRepairsData === 'string') {
          try {
            const parsed = JSON.parse(currentRepairsData);
            if (Array.isArray(parsed)) {
              repairsArray = parsed;
            } else if (parsed && typeof parsed === 'object') {
              repairsArray = [parsed];
            }
          } catch {
            repairsArray = [];
          }
        } else if (Array.isArray(currentRepairsData)) {
          repairsArray = currentRepairsData;
        }
      }
      
      const repairsSummary = calculateRepairsSummary(repairsArray);
      
      const insuranceDate = car.insurance ? new Date(car.insurance).toLocaleDateString('ru-RU') : null;
      const moldInsuranceDate = car.mold_insurance ? new Date(car.mold_insurance).toLocaleDateString('ru-RU') : null;
      const techDate = car.technical_inspection ? new Date(car.technical_inspection).toLocaleDateString('ru-RU') : null;
      const today = new Date();
      
      let insuranceStatus = '';
      let moldInsuranceStatus = '';
      let techStatus = '';
      
      if (car.insurance) {
        const insurance = new Date(car.insurance);
        const daysUntil = Math.ceil((insurance - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          insuranceStatus = '<span style="color: var(--car-red); font-weight: 500;">Просрочено</span>';
        } else if (daysUntil <= 30) {
          insuranceStatus = `<span style="color: var(--car-orange); font-weight: 500;">Скоро (${daysUntil} дн)</span>`;
        } else {
          insuranceStatus = `<span style="color: var(--car-green); font-weight: 500;">Ок (${daysUntil} дн)</span>`;
        }
      }
      
      if (car.mold_insurance) {
        const moldInsurance = new Date(car.mold_insurance);
        const daysUntil = Math.ceil((moldInsurance - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          moldInsuranceStatus = '<span style="color: var(--car-red); font-weight: 500;">Просрочено</span>';
        } else if (daysUntil <= 30) {
          moldInsuranceStatus = `<span style="color: var(--car-orange); font-weight: 500;">Скоро (${daysUntil} дн)</span>`;
        } else {
          moldInsuranceStatus = `<span style="color: var(--car-green); font-weight: 500;">Ок (${daysUntil} дн)</span>`;
        }
      }
      
      if (car.technical_inspection) {
        const tech = new Date(car.technical_inspection);
        const daysUntil = Math.ceil((tech - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          techStatus = '<span style="color: var(--car-red); font-weight: 500;">Просрочено</span>';
        } else if (daysUntil <= 30) {
          techStatus = `<span style="color: var(--car-orange); font-weight: 500;">Скоро (${daysUntil} дн)</span>`;
        } else {
          techStatus = `<span style="color: var(--car-green); font-weight: 500;">Ок (${daysUntil} дн)</span>`;
        }
      }
      
      let fuelConsumption = null;
      let fuelConsumptionValue = null;
      if (fuelAmount > 0 && monthlyMilageNum > 0) {
        fuelConsumption = calculateFuelConsumption(fuelAmount, monthlyMilage);
        fuelConsumptionValue = fuelConsumption ? parseFloat(fuelConsumption) : null;
      }
      
      let costHTML = `<div style="color: var(--car-text-muted);">Нет данных</div>`;
      const fuelType = car.fuel_type;
      const gasType = car.gas_type;
      const company = car.company;
      
      let fuelPricePerLiter = null;
      let gasPricePerLiter = null;
      
      if (fuelType && company) {
        const priceData = fuelPricesData.find(p => p.fuel_type === fuelType && p.company === company);
        fuelPricePerLiter = priceData ? parseFloat(priceData.price) : null;
      }
      
      if (gasType && company) {
        const priceData = fuelPricesData.find(p => p.fuel_type === gasType && p.company === company);
        gasPricePerLiter = priceData ? parseFloat(priceData.price) : null;
      }
      
      let fuelCost = 0;
      if (fuelPricePerLiter && fuelAmount > 0) {
        fuelCost = fuelAmount * fuelPricePerLiter;
      }
      
      let gasCost = 0;
      if (gasPricePerLiter && gasAmount > 0) {
        gasCost = gasAmount * gasPricePerLiter;
      }
      
      const totalCost = fuelCost + gasCost + repairsSummary.total;
      
      let efficiencyHTML = '';
      if (spendingNorm && monthlyMilageNum > 0) {
        const totalFuelEquivalent = fuelAmount + (gasAmount * GAS_TO_FUEL_RATIO);
        const actualConsumption = (totalFuelEquivalent / monthlyMilageNum) * 100;
        const diff = spendingNorm - actualConsumption;
        const totalLitersEquivalent = (diff * monthlyMilageNum) / 100;
        
        if (Math.abs(totalLitersEquivalent) > 0.01) {
          let weightedPrice = 0;
          let totalEnergy = 0;
          
          if (fuelAmount > 0 && fuelPricePerLiter) {
            weightedPrice += fuelAmount * fuelPricePerLiter;
            totalEnergy += fuelAmount;
          }
          
          if (gasAmount > 0 && gasPricePerLiter) {
            weightedPrice += gasAmount * gasPricePerLiter;
            totalEnergy += gasAmount * GAS_TO_FUEL_RATIO;
          }
          
          if (totalEnergy > 0) {
            weightedPrice = weightedPrice / totalEnergy;
          } else {
            weightedPrice = fuelPricePerLiter || gasPricePerLiter || 0;
          }
          
          const totalRub = totalLitersEquivalent * weightedPrice;
          const litersFormatted = totalLitersEquivalent.toFixed(2);
          const totalFormatted = totalRub.toFixed(2);
          const litersDisplay = totalLitersEquivalent > 0 ? `+${litersFormatted}` : `${litersFormatted}`;
          const totalDisplay = totalRub > 0 ? `+${totalFormatted}` : `${totalFormatted}`;
          const litersClass = totalLitersEquivalent > 0 ? 'car-module-cost-positive' : 'car-module-cost-negative';
          const totalClass = totalRub > 0 ? 'car-module-cost-positive' : 'car-module-cost-negative';
          
          if (totalLitersEquivalent < 0) {
            efficiencyHTML = `
              <div class="car-module-cost-negative" style="font-size: 12px;">Перерас: ${litersDisplay} л (экв)</div>
              <div class="${totalClass}" style="font-size: 12px;">Сумма: ${totalDisplay} руб</div>
            `;
          } else {
            efficiencyHTML = `
              <div class="car-module-cost-positive" style="font-size: 12px;">Экономия: ${litersDisplay} л (экв)</div>
              <div class="${totalClass}" style="font-size: 12px;">Сумма: ${totalDisplay} руб</div>
            `;
          }
        }
      }
      
      if (totalCost > 0) {
        costHTML = `
          <div style="margin-bottom: 8px;">
            ${fuelCost > 0 ? `<div style="font-size: 11px; color: var(--car-blue);">Топливо: ${fuelCost.toFixed(2)} руб</div>` : ''}
            ${gasCost > 0 ? `<div style="font-size: 11px; color: var(--car-green);">Газ: ${gasCost.toFixed(2)} руб</div>` : ''}
            ${repairsSummary.total > 0 ? `<div style="font-size: 11px; color: var(--car-purple);">Ремонт: ${repairsSummary.total.toFixed(2)} руб</div>` : ''}
            <div style="font-size: 13px; font-weight: 600; color: var(--car-text); margin-top: 4px;">Итого: ${totalCost.toFixed(2)} руб</div>
          </div>
          ${efficiencyHTML}
        `;
      } else {
        costHTML = `<div style="color: var(--car-text-muted);">Нет данных о затратах</div>`;
      }
      
      let repairsDetailsHTML = '';
      if (repairsArray.length > 0) {
        repairsDetailsHTML = '<div style="margin-top: 8px; border-top: 1px solid var(--car-border); padding-top: 4px;">';
        repairsArray.forEach((repair, index) => {
          if (repair.type && repair.price) {
            repairsDetailsHTML += `
              <div style="font-size: 10px; color: var(--car-text-muted); display: flex; justify-content: space-between;">
                <span>${repair.type}${repair.comment ? ': ' + repair.comment : ''}</span>
                <span style="color: var(--car-purple);">${parseFloat(repair.price).toFixed(2)}</span>
              </div>
            `;
          }
        });
        repairsDetailsHTML += '</div>';
      }
      
      tableHTML += `<tr>`;
      
      // Car data column
      tableHTML += `
        <td>
          <div style="font-weight: 500;">${car.number}</div>
          <div style="color: var(--car-blue); font-size: 12px;">${car.company || '-'}</div>
          <div style="color: var(--car-text-muted); font-size: 12px;">${car.department || '-'}</div>
          <div style="color: var(--car-text-muted); font-size: 12px;">${car.type || '-'}</div>
          <div style="color: var(--car-text-muted); font-size: 12px;">Год: ${car.year || '-'}</div>
        </td>
      `;
      
      columns.forEach(col => {
        if (col.id === 'car-data') {
          const fuelTypeDisplay = car.fuel_type || '';
          const gasTypeDisplay = car.gas_type || '';
          const tankDisplay = car.tank || '';
          tableHTML += `
            <td style="font-size: 12px;">
              ${fuelTypeDisplay ? `<div>Т: ${fuelTypeDisplay}</div>` : ''}
              ${gasTypeDisplay ? `<div>Г: ${gasTypeDisplay}</div>` : ''}
              ${tankDisplay ? `<div>Б: ${tankDisplay}</div>` : ''}
            </td>
          `;
        } else if (col.id === 'milage') {
          tableHTML += `
            <td style="font-size: 12px;">
              <div style="font-weight: 500; color: var(--car-blue);">${monthlyMilage} км</div>
              <div style="color: var(--car-text-muted);">Текущий: ${currentMilageValue}</div>
              <div style="color: var(--car-text-muted);">Прошлый: ${previousMilageValue}</div>
              <div class="car-module-action-buttons">
                <button class="car-module-btn ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="edit-milage" ${!canEdit ? 'disabled' : ''}>Изм.</button>
                ${currentMilageData ? `<button class="car-module-btn car-module-btn-danger ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="delete-milage" ${!canEdit ? 'disabled' : ''}>Удал.</button>` : ''}
              </div>
            </td>
          `;
        } else if (col.id === 'repairs') {
          tableHTML += `
            <td style="font-size: 12px;">
              <div>
                ${Object.entries(repairsSummary.byType).map(([type, amount]) => `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--car-purple);">${type}:</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                `).join('')}
                <div style="font-weight: 500; color: var(--car-purple); margin-top: 4px;">Всего: ${repairsSummary.total.toFixed(2)}</div>
                ${repairsDetailsHTML}
              </div>
              <div class="car-module-action-buttons" style="margin-top: 8px;">
                <button class="car-module-btn ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="add-repair" ${!canEdit ? 'disabled' : ''}>Добавить</button>
              </div>
            </td>
          `;
        } else if (col.id === 'spendage') {
          tableHTML += `
            <td style="font-size: 12px;">
              ${currentFuel ? `
                <div>Т: ${currentFuel.fuel_amount || '0'} л</div>
                <div>Г: ${currentFuel.gas_amount || '0'} м³</div>
                <div class="car-module-action-buttons">
                  <button class="car-module-btn ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="edit-fuel" ${!canEdit ? 'disabled' : ''}>Изм.</button>
                  <button class="car-module-btn car-module-btn-danger ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="delete-fuel" ${!canEdit ? 'disabled' : ''}>Удал.</button>
                </div>
              ` : `
                <div style="color: var(--car-text-muted);">-</div>
                <div class="car-module-action-buttons">
                  <button class="car-module-btn ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="add-fuel" ${!canEdit ? 'disabled' : ''}>Добав.</button>
                </div>
              `}
            </td>
          `;
        } else if (col.id === 'fuel-consumption') {
          let consumptionDisplay = '-';
          if (monthlyMilageNum > 0) {
            const totalFuelEquivalent = fuelAmount + (gasAmount * GAS_TO_FUEL_RATIO);
            const combinedConsumption = (totalFuelEquivalent / monthlyMilageNum) * 100;
            if (spendingNorm && combinedConsumption > 0) {
              consumptionDisplay = `${spendingNorm.toFixed(1)}/${combinedConsumption.toFixed(1)}`;
            } else if (spendingNorm) {
              consumptionDisplay = `${spendingNorm.toFixed(1)}/-`;
            } else if (combinedConsumption > 0) {
              consumptionDisplay = `-/${combinedConsumption.toFixed(1)}`;
            }
          } else if (fuelConsumption) {
            if (spendingNorm) {
              consumptionDisplay = `${spendingNorm.toFixed(1)}/${fuelConsumption}`;
            } else {
              consumptionDisplay = `-/${fuelConsumption}`;
            }
          } else if (spendingNorm) {
            consumptionDisplay = `${spendingNorm.toFixed(1)}/-`;
          }
          tableHTML += `
            <td style="font-size: 12px; font-weight: 500;">
              ${consumptionDisplay}
            </td>
          `;
        } else if (col.id === 'costs') {
          tableHTML += `
            <td style="font-size: 12px;">
              ${costHTML}
            </td>
          `;
        } else if (col.id === 'comments') {
          tableHTML += `
            <td style="font-size: 12px;">
              <button class="car-module-btn ${!canEdit ? 'disabled' : ''}" data-car="${car.number}" data-action="comment" ${!canEdit ? 'disabled' : ''}>
                ${carComment ? 'Изм.' : 'Доб.'}
              </button>
              ${carComment ? `<div class="car-module-comment-text">${carComment}</div>` : ''}
            </td>
          `;
        } else if (col.id === 'archive') {
          const archiveObj = archiveData ? (typeof archiveData === 'string' ? JSON.parse(archiveData) : archiveData) : {};
          const archiveLabels = ['показания', 'топливо', 'табель', 'списание', 'архив'];
          const shortLabels = ['показ', 'топл', 'табе', 'спис', 'арх'];
          
          tableHTML += `
            <td>
              <div class="car-module-archive-grid">
                ${archiveLabels.map((label, index) => `
                  <div class="car-module-archive-item">
                    <div class="car-module-checkbox ${archiveObj[label] ? 'checked' : ''} ${!canEdit ? 'disabled' : ''}" 
                         data-car="${car.number}" 
                         data-archive-label="${label}"
                         ${!canEdit ? 'style="cursor: not-allowed;"' : ''}></div>
                    <span class="car-module-archive-label">${shortLabels[index]}</span>
                  </div>
                `).join('')}
              </div>
            </td>
          `;
        } else if (col.id === 'insurance') {
          tableHTML += `
            <td style="font-size: 12px;">
              ${insuranceDate ? `
                <div style="font-weight: 500;">до ${insuranceDate}</div>
                <div style="margin-top: 4px;">${insuranceStatus}</div>
              ` : `
                <div style="color: var(--car-text-muted);">Нет данных</div>
              `}
            </td>
          `;
        } else if (col.id === 'mold_insurance') {
          tableHTML += `
            <td style="font-size: 12px;">
              ${moldInsuranceDate ? `
                <div style="font-weight: 500;">до ${moldInsuranceDate}</div>
                <div style="margin-top: 4px;">${moldInsuranceStatus}</div>
              ` : `
                <div style="color: var(--car-text-muted);">Нет данных</div>
              `}
            </td>
          `;
        } else if (col.id === 'technical') {
          tableHTML += `
            <td style="font-size: 12px;">
              ${techDate ? `
                <div style="font-weight: 500;">до ${techDate}</div>
                <div style="margin-top: 4px;">${techStatus}</div>
              ` : `
                <div style="color: var(--car-text-muted);">Нет данных</div>
              `}
            </td>
          `;
        }
      });
      
      tableHTML += `</tr>`;
    });
    
    tableHTML += `</tbody></table>`;
  }
  
  tabContent.innerHTML = tableHTML;
  animateColumnChange(userSettings);
  
  document.querySelectorAll('.car-module-checkbox[data-archive-label]').forEach(checkbox => {
    checkbox.addEventListener('click', async (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const carNumber = e.target.dataset.car;
      const label = e.target.dataset.archiveLabel;
      const isChecked = !e.target.classList.contains('checked');
      e.target.classList.toggle('checked');
      await updateArchiveCheckbox(carNumber, label, isChecked);
    });
  });
  
  document.querySelectorAll('[data-action="add-fuel"], [data-action="edit-fuel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      const carData = filteredData.find(c => c.number === car);
      const currentFuel = carData?.fuel && Array.isArray(carData.fuel) && carData.fuel.length > 0 ? carData.fuel[0] : null;
      openFuelModal(car, currentFuel);
    });
  });
  
  document.querySelectorAll('[data-action="delete-fuel"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      if (confirm('Удалить данные топлива?')) {
        try {
          await deleteFuel(car, selectedMonth, selectedYear);
          await reloadData();
          showToast('Данные топлива удалены', 'success');
        } catch (error) {
          showToast('Ошибка: ' + error.message, 'error');
        }
      }
    });
  });
  
  document.querySelectorAll('[data-action="edit-milage"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      const carData = filteredData.find(c => c.number === car);
      const currentMilage = carData?.milage?.current;
      openMilageModal(car, currentMilage);
    });
  });
  
  document.querySelectorAll('[data-action="delete-milage"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      if (confirm('Удалить данные пробега?')) {
        try {
          await deleteMilage(car, selectedMonth, selectedYear);
          await reloadData();
          showToast('Данные пробега удалены', 'success');
        } catch (error) {
          showToast('Ошибка: ' + error.message, 'error');
        }
      }
    });
  });
  
  document.querySelectorAll('[data-action="add-repair"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      const carData = filteredData.find(c => c.number === car);
      const currentMilage = carData?.milage?.current;
      openRepairsModal(car, currentMilage);
    });
  });
  
  document.querySelectorAll('[data-action="comment"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!canEdit) {
        showToast('У вас нет прав на редактирование', 'error');
        return;
      }
      
      const car = e.target.dataset.car;
      const carData = filteredData.find(c => c.number === car);
      const currentFuel = carData?.fuel && Array.isArray(carData.fuel) && carData.fuel.length > 0 ? carData.fuel[0] : null;
      const existingComment = currentFuel?.comment || '';
      openCommentModal(car, existingComment);
    });
  });
}

function renderCarsTab() {
  filterCarsData();
  
  let tableHTML = '';
  
  if (carsData.length === 0) {
    tableHTML = `
      <div class="car-module-empty-state">
        <h3>Нет автомобилей</h3>
        <p>Добавьте первый автомобиль</p>
      </div>
    `;
  } else if (filteredCarsData.length === 0) {
    tableHTML = `
      <div class="car-module-empty-state">
        <h3>Автомобили не найдены</h3>
        <p>Попробуйте изменить параметры поиска или фильтры</p>
      </div>
    `;
  } else {
    tableHTML = `
      <table class="car-module-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Компания</th>
            <th>Подразделение</th>
            <th>Тип</th>
            <th>Год</th>
            <th>Топливо</th>
            <th>Газ</th>
            <th>Бак</th>
            <th>Норма</th>
            <th>Страховка</th>
            <th>Страховка Молдова</th>  <!-- Added column header -->
            <th>Тех осмотр</th>
            ${canEdit ? '<th>Действия</th>' : ''}
          </tr>
        </thead>
        <tbody>
    `;
    
    filteredCarsData.forEach(car => {
      const insuranceDate = car.insurance ? new Date(car.insurance).toLocaleDateString('ru-RU') : '-';
      const moldInsuranceDate = car.mold_insurance ? new Date(car.mold_insurance).toLocaleDateString('ru-RU') : '-';  // Added
      const techDate = car.technical_inspection ? new Date(car.technical_inspection).toLocaleDateString('ru-RU') : '-';
      
      tableHTML += `
        <tr>
          <td>${car.number || ''}</td>
          <td>${car.company || ''}</td>
          <td>${car.department || ''}</td>
          <td>${car.type || ''}</td>
          <td>${car.year || ''}</td>
          <td>${car.fuel_type || ''}</td>
          <td>${car.gas_type || ''}</td>
          <td>${car.tank || ''}</td>
          <td>${car.spending_norm || ''}</td>
          <td>${insuranceDate}</td>
          <td>${moldInsuranceDate}</td>  <!-- Added cell -->
          <td>${techDate}</td>
          ${canEdit ? `
            <td>
              <button class="car-module-btn" data-action="edit-car" data-id="${car.id}">Изменить</button>
            </td>
          ` : ''}
        </tr>
      `;
    });
    
    tableHTML += `</tbody></table>`;
  }
  
  tabContent.innerHTML = tableHTML;
  
  if (canEdit) {
    document.querySelectorAll('[data-action="edit-car"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const carId = e.target.dataset.id;
        const numericId = parseInt(carId, 10);
        const car = carsData.find(c => c.id === numericId);
        openCarModal(car);
      });
    });
  }
}

  function renderFuelTab() {
    filterFuelPricesData();
    
    let tableHTML = '';
    
    if (missingFuelData && missingFuelData.length > 0 && canEdit) {
      tableHTML += `
        <div class="car-module-missing-fuel">
          <h3>Отсутствующие типы топлива</h3>
          <div style="max-height: 200px; overflow-y: auto; margin-bottom: 16px;">
            <table class="car-module-table" style="min-width: 100%;">
              <thead>
                <tr>
                  <th>Тип топлива</th>
                  <th>Автомобилей</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      missingFuelData.forEach(item => {
        tableHTML += `
          <tr>
            <td>${item.fuel_type}</td>
            <td>${item.car_count}</td>
            <td>
              <button class="car-module-btn" data-action="add-missing-price" data-type="${item.fuel_type}">Добавить</button>
            </td>
          </tr>
        `;
      });
      
      tableHTML += `
              </tbody>
            </table>
          </div>
          <div class="car-module-info-box">
            Укажите цены на эти типы топлива, чтобы видеть их в расчетах.
          </div>
        </div>
      `;
    }
    
    tableHTML += `<table class="car-module-table"><thead><tr><th>Тип топлива</th><th>Категория</th><th>Компания</th><th>Цена</th>${canEdit ? '<th>Действия</th>' : ''}</tr></thead><tbody>`;
    
    const pricesToShow = filteredFuelPricesData.length > 0 ? filteredFuelPricesData : fuelPricesData;
    
    if (!fuelPricesData || fuelPricesData.length === 0) {
      tableHTML += `<tr><td colspan="${canEdit ? 5 : 4}" style="text-align: center; padding: 30px; color: var(--car-text-muted);">Нет цен на топливо</td></tr>`;
    } else if (filteredFuelPricesData.length === 0 && Object.keys(companyFilters).some(key => companyFilters[key])) {
      tableHTML += `<tr><td colspan="${canEdit ? 5 : 4}" style="text-align: center; padding: 30px; color: var(--car-text-muted);">Нет цен для выбранных компаний</td></tr>`;
    } else {
      pricesToShow.forEach(price => {
        const categoryDisplay = {
          'бенз': 'Бензин',
          'диз': 'Дизель',
          'газ': 'Газ'
        }[price.type] || price.type || '-';
        
        tableHTML += `
          <tr>
            <td>${price.fuel_type || '-'}</td>
            <td>${categoryDisplay}</td>
            <td>${price.company || '-'}</td>
            <td>${price.price || '-'}</td>
            ${canEdit ? `
              <td>
                <div class="car-module-action-buttons">
                  <button class="car-module-btn" data-action="edit-price" data-id="${price.id}">Изм.</button>
                  <button class="car-module-btn car-module-btn-danger" data-action="delete-price" data-id="${price.id}">Удал.</button>
                </div>
              </td>
            ` : ''}
          </tr>
        `;
      });
    }
    
    tableHTML += `</tbody></table>`;
    tabContent.innerHTML = tableHTML;
    
    if (canEdit) {
      document.querySelectorAll('[data-action="add-missing-price"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const fuelType = e.target.dataset.type;
          document.getElementById('fuelPriceModalFuelType').value = fuelType;
          document.getElementById('fuelPriceModalType').value = '';
          document.getElementById('fuelPriceModalCompany').value = '';
          document.getElementById('fuelPriceModalPrice').value = '';
          currentEditFuelPriceId = null;
          fuelPriceModal.classList.add('active');
        });
      });
      
      document.querySelectorAll('[data-action="edit-price"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const priceId = e.target.dataset.id;
          const price = fuelPricesData.find(p => p.id == priceId);
          openFuelPriceModal(price);
        });
      });
      
      document.querySelectorAll('[data-action="delete-price"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const priceId = e.target.dataset.id;
          if (confirm('Вы уверены?')) {
            try {
              await deleteFuelPrice(priceId);
              await loadFuelPrices();
              showToast('Цена удалена', 'success');
            } catch (error) {
              showToast('Ошибка удаления: ' + error.message, 'error');
            }
          }
        });
      });
    }
  }

  function renderTotalsTab() {
    let totalByFuelType = {};
    let totalByGasType = {};
    let totalRepairs = 0;
    
    const activeCompanyFilters = Object.keys(totalsCompanyFilters).filter(key => totalsCompanyFilters[key]);
    const dataToProcess = activeCompanyFilters.length > 0 ? filteredData : dashboardData;
    
    if (dataToProcess && dataToProcess.length > 0) {
      dataToProcess.forEach(car => {
        const currentMilageData = car.milage?.current;
        if (currentMilageData?.repairs) {
          let repairsArray = [];
          if (typeof currentMilageData.repairs === 'string') {
            try {
              const parsed = JSON.parse(currentMilageData.repairs);
              if (Array.isArray(parsed)) {
                repairsArray = parsed;
              }
            } catch {}
          }
          repairsArray.forEach(repair => {
            if (repair.price) {
              totalRepairs += parseFloat(repair.price) || 0;
            }
          });
        }
        
        if (car.fuel && Array.isArray(car.fuel) && car.fuel.length > 0) {
          const fuel = car.fuel[0];
          
          if (car.fuel_type && fuel.fuel_amount) {
            const fuelType = car.fuel_type;
            const fuelAmount = parseFloat(fuel.fuel_amount) || 0;
            
            if (!totalByFuelType[fuelType]) {
              totalByFuelType[fuelType] = { amount: 0, price: 0, total: 0 };
            }
            
            totalByFuelType[fuelType].amount += fuelAmount;
            
            const priceData = fuelPricesData.find(p => p.fuel_type === fuelType && p.company === car.company);
            const price = priceData ? parseFloat(priceData.price) : 0;
            totalByFuelType[fuelType].price = price;
            totalByFuelType[fuelType].total = totalByFuelType[fuelType].amount * price;
          }
          
          if (car.gas_type && fuel.gas_amount) {
            const gasType = car.gas_type;
            const gasAmount = parseFloat(fuel.gas_amount) || 0;
            
            if (!totalByGasType[gasType]) {
              totalByGasType[gasType] = { amount: 0, price: 0, total: 0 };
            }
            
            totalByGasType[gasType].amount += gasAmount;
            
            const gasPriceData = fuelPricesData.find(p => p.fuel_type === gasType && p.company === car.company);
            const gasPrice = gasPriceData ? parseFloat(gasPriceData.price) : 0;
            totalByGasType[gasType].price = gasPrice;
            totalByGasType[gasType].total = totalByGasType[gasType].amount * gasPrice;
          }
        }
      });
    }
    
    let totalsHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: var(--car-text);">Топливо</h3>
          <table class="car-module-table" style="min-width: 100%;">
            <thead>
              <tr>
                <th>Тип топлива</th>
                <th>Количество (л)</th>
                <th>Цена за л</th>
                <th>Сумма (руб)</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    let fuelGrandTotal = 0;
    
    if (Object.keys(totalByFuelType).length === 0) {
      totalsHTML += `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--car-text-muted);">Нет данных по топливу</td></tr>`;
    } else {
      Object.entries(totalByFuelType).forEach(([fuelType, data]) => {
        fuelGrandTotal += data.total;
        totalsHTML += `
          <tr>
            <td>${fuelType}</td>
            <td>${data.amount.toFixed(2)}</td>
            <td>${data.price.toFixed(2)}</td>
            <td>${data.total.toFixed(2)}</td>
          </tr>
        `;
      });
    }
    
    totalsHTML += `
            </tbody>
          </table>
          ${Object.keys(totalByFuelType).length > 0 ? `
            <div style="margin: 8px; padding: 12px 16px; background: linear-gradient(135deg, var(--car-blue) 0%, #1e3a8a 100%); border-radius: var(--car-radius); color: white; text-align: right;">
              <div style="font-size: 12px; opacity: 0.9;">Сумма по топливу</div>
              <div style="font-size: 22px; font-weight: 600;">${fuelGrandTotal.toFixed(2)} руб</div>
            </div>
          ` : ''}
        </div>
        
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: var(--car-text);">Газ</h3>
          <table class="car-module-table" style="min-width: 100%;">
            <thead>
              <tr>
                <th>Тип газа</th>
                <th>Количество (м³)</th>
                <th>Цена за м³</th>
                <th>Сумма (руб)</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    let gasGrandTotal = 0;
    
    if (Object.keys(totalByGasType).length === 0) {
      totalsHTML += `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--car-text-muted);">Нет данных по газу</td></tr>`;
    } else {
      Object.entries(totalByGasType).forEach(([gasType, data]) => {
        gasGrandTotal += data.total;
        totalsHTML += `
          <tr>
            <td>${gasType}</td>
            <td>${data.amount.toFixed(2)}</td>
            <td>${data.price.toFixed(2)}</td>
            <td>${data.total.toFixed(2)}</td>
          </tr>
        `;
      });
    }
    
    totalsHTML += `
            </tbody>
          </table>
          ${Object.keys(totalByGasType).length > 0 ? `
            <div style="margin-top: 16px; padding: 12px 16px; background: linear-gradient(135deg, var(--car-green) 0%, #166534 100%); border-radius: var(--car-radius); color: white; text-align: right;">
              <div style="font-size: 12px; opacity: 0.9;">Сумма по газу</div>
              <div style="font-size: 22px; font-weight: 600;">${gasGrandTotal.toFixed(2)} руб</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="margin-bottom: 20px; padding: 16px; background: var(--car-surface2); border: 1px solid var(--car-border); border-radius: var(--car-radius);">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--car-purple);">Ремонт и обслуживание</h3>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--car-text-muted);">Всего за месяц:</span>
          <span style="font-size: 18px; font-weight: 600; color: var(--car-purple);">${totalRepairs.toFixed(2)} руб</span>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, var(--car-orange) 0%, #b45309 100%); border-radius: var(--car-radius); color: white; text-align: center;">
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Общая сумма за ${selectedMonth} ${selectedYear}</div>
        <div style="font-size: 36px; font-weight: 700;">${(fuelGrandTotal + gasGrandTotal + totalRepairs).toFixed(2)} руб</div>
        <div style="font-size: 13px; margin-top: 8px;">
          <span style="margin-right: 20px;">Топливо: ${fuelGrandTotal.toFixed(2)} руб</span>
          <span style="margin-right: 20px;">Газ: ${gasGrandTotal.toFixed(2)} руб</span>
          <span>Ремонт: ${totalRepairs.toFixed(2)} руб</span>
        </div>
      </div>
    `;
    
    tabContent.innerHTML = totalsHTML;
  }

  function renderAnalyticsTab() {
    if (isRenderingAnalytics) return;
    isRenderingAnalytics = true;

    try {
      analyticsStartMonth = analyticsStartMonth || 'Январь';
      analyticsEndMonth = analyticsEndMonth || currentMonthName;
      analyticsStartYear = analyticsStartYear || currentYear - 1;
      analyticsEndYear = analyticsEndYear || currentYear;
      analyticsSelectedMetrics = analyticsSelectedMetrics || ['mileage', 'fuel_used', 'fuel_cost'];

      const metricsCheckboxes = availableMetrics.map(metric => {
        const isChecked = analyticsSelectedMetrics.includes(metric.id);
        return `
          <label class="car-module-metric-checkbox">
            <input type="checkbox" value="${metric.id}" ${isChecked ? 'checked' : ''} data-metric-id="${metric.id}">
            <span class="car-module-metric-label">${metric.label}</span>
          </label>
        `;
      }).join('');

      const analyticsHTML = `
        <div class="car-module-metrics-selector">
          <div class="car-module-metrics-header">
            <span>Отображаемые метрики</span>
            <div>
              <button class="car-module-btn" id="selectAllMetrics">Выбрать все</button>
              <button class="car-module-btn" id="clearAllMetrics">Очистить</button>
            </div>
          </div>
          <div class="car-module-metrics-grid" id="metricsGrid">
            ${metricsCheckboxes}
          </div>
        </div>
        
        <div class="car-module-chart-container" style="padding: 8px 0;"></div>
        
        <div class="car-module-summary-cards" id="summaryCards">
          <div style="text-align: center; padding: 20px;">
            <div class="car-module-loading-spinner" style="margin: 0 auto 16px;"></div>
          </div>
        </div>
      `;

      tabContent.innerHTML = analyticsHTML;

      document.getElementById('selectAllMetrics')?.addEventListener('click', () => {
        document.querySelectorAll('#metricsGrid input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateSelectedMetrics();
      });

      document.getElementById('clearAllMetrics')?.addEventListener('click', () => {
        document.querySelectorAll('#metricsGrid input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedMetrics();
      });

      document.querySelectorAll('#metricsGrid input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateSelectedMetrics);
      });

      if (analyticsSelectedCar && carsData && carsData.length > 0) {
      } else {
        const summaryContainer = document.getElementById('summaryCards');
        if (summaryContainer) {
          summaryContainer.innerHTML = '<div style="text-align: center; color: var(--car-text-muted); padding: 20px;">Выберите автомобиль для просмотра аналитики</div>';
        }
        const chartContainer = document.querySelector('.car-module-chart-container');
        if (chartContainer) {
          chartContainer.innerHTML = '<div style="text-align: center; color: var(--car-text-muted); padding: 50px;">Выберите автомобиль для просмотра данных</div>';
        }
      }
    } finally {
      isRenderingAnalytics = false;
    }
  }

  function updateSelectedMetrics() {
    const selected = [];
    document.querySelectorAll('#metricsGrid input[type="checkbox"]:checked').forEach(cb => selected.push(cb.value));
    
    if (selected.length === 0) {
      showToast('Выберите хотя бы одну метрику', 'error');
      return;
    }
    
    analyticsSelectedMetrics = selected;
    
    if (analyticsSelectedCar && carsData && carsData.length > 0) {
      loadAnalyticsData();
    }
  }

  function updateAnalyticsCarFilter() {
    const select = document.getElementById('analyticsCarFilter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите автомобиль</option>';
    if (!carsData || carsData.length === 0) return;
    
    let carsToShow = carsData;
    if (userCompany) {
      carsToShow = carsData.filter(car => car.company === userCompany);
    }
    
    const activeCars = carsToShow.filter(car => car.active !== false);
    activeCars.forEach(car => {
      const option = document.createElement('option');
      option.value = car.number;
      option.textContent = `${car.number} (${car.company || 'нет компании'})`;
      if (car.number === analyticsSelectedCar) option.selected = true;
      select.appendChild(option);
    });
  }

  async function loadAnalyticsData() {
    if (!analyticsSelectedCar) return;

    const chartContainer = document.querySelector('.car-module-chart-container');
    const summaryContainer = document.getElementById('summaryCards');

    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div class="car-module-loading-spinner" style="margin: 0 auto;"></div>
        </div>
      `;
    }

    try {
      const data = await getAnalyticsData(
        analyticsStartMonth,
        analyticsStartYear,
        analyticsEndMonth,
        analyticsEndYear,
        analyticsSelectedCar
      );

      renderAnalyticsChart(data);
      renderAnalyticsSummary(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      if (chartContainer) {
        chartContainer.innerHTML = `<div style="text-align: center; color: var(--car-red); padding: 50px;">Ошибка: ${error.message}</div>`;
      }
      if (summaryContainer) {
        summaryContainer.innerHTML = `<div style="text-align: center; color: var(--car-red); padding: 20px;">Ошибка загрузки данных: ${error.message}</div>`;
      }
    }
  }

  function renderAnalyticsChart(data) {
    const container = document.querySelector('.car-module-chart-container');
    if (!container) return;

    if (window.analyticsChartInstances) {
      window.analyticsChartInstances.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
      });
    }
    window.analyticsChartInstances = [];
    container.innerHTML = '';

    if (!data || data.labels.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--car-text-muted); padding: 50px;">Нет данных за выбранный период</div>';
      return;
    }

    const groups = [
      { id: 'distance', label: 'Пробег' },
      { id: 'volume',   label: 'Расход топлива и газа' },
      { id: 'money',    label: 'Затраты' },
      { id: 'ratio',    label: 'Расход л/100км' }
    ];

    groups.forEach(group => {
      const groupMetrics = availableMetrics.filter(m =>
        m.group === group.id && analyticsSelectedMetrics.includes(m.id)
      );
      if (groupMetrics.length === 0) return;

      const hasData = groupMetrics.some(m =>
        (data.metrics[m.id] || []).some(v => v > 0)
      );
      if (!hasData) return;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom: 16px;';

      const title = document.createElement('div');
      title.style.cssText = 'font-size: 13px; font-weight: 600; color: var(--car-text-muted); text-transform: uppercase; letter-spacing: 0.05em;';
      title.textContent = group.label;
      wrapper.appendChild(title);

      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.cssText = 'position: relative; height: 220px;';
      const canvas = document.createElement('canvas');
      canvasWrapper.appendChild(canvas);
      wrapper.appendChild(canvasWrapper);
      container.appendChild(wrapper);

      const datasets = groupMetrics.map(metric => ({
        label: metric.label,
        data: data.metrics[metric.id] || [],
        borderColor: metric.color,
        backgroundColor: metric.color + '20',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        borderWidth: 2
      }));

      const chart = new Chart(canvas, {
        type: 'line',
        data: { labels: data.labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, padding: 15, font: { size: 11 }, color: '#e8ecf4' }
            },
            tooltip: {
              backgroundColor: '#181c27',
              titleColor: '#e8ecf4',
              bodyColor: '#7b85a0',
              borderColor: '#2a3048',
              borderWidth: 1,
              padding: 10
            }
          },
          scales: {
            y: {
              grid: { color: '#2a3048' },
              ticks: { color: '#7b85a0' }
            },
            x: {
              ticks: { color: '#7b85a0', maxRotation: 45 },
              grid: { color: '#2a3048' }
            }
          }
        }
      });

      window.analyticsChartInstances.push(chart);
    });
  }

  function renderAnalyticsSummary(data) {
    const container = document.getElementById('summaryCards');
    if (!container) return;
    
    if (!data || data.summary.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--car-text-muted); padding: 20px;">Нет данных для сводки</div>';
      return;
    }
    
    let summaryHTML = '';
    data.summary.forEach(item => {
      let value = item.value;
      let unit = '';
      if (item.metric === 'mileage') unit = 'км';
      else if (item.metric === 'fuel_used') unit = 'л';
      else if (item.metric === 'gas_used') unit = 'м³';
      else if (item.metric.includes('cost') || item.metric === 'repairs') unit = 'руб';
      else if (item.metric === 'efficiency') unit = 'л/100км';
      
      let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      summaryHTML += `
        <div class="car-module-summary-card">
          <div class="car-module-summary-label">${item.label}</div>
          <div>
            <span class="car-module-summary-value">${formattedValue}</span>
            ${unit ? `<span class="car-module-summary-unit">${unit}</span>` : ''}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = summaryHTML;
  }

  async function reloadData() {
    const wasLoading = isLoading;
    try {
      if (!isLoading) setLoading(true, 'Загрузка данных...');
      
      const data = await getDashboardData(selectedMonth, selectedYear);
      dashboardData = data;
      
      const companies = [...new Set(data.map(car => car.company).filter(Boolean))];
      companyFilters = {};
      totalsCompanyFilters = {};
      companies.forEach(company => {
        companyFilters[company] = false;
        totalsCompanyFilters[company] = false;
      });
      
      filterData();
      const userSettings = loadUserSettings();
      
      renderContent();
    } catch (error) {
      tabContent.innerHTML = `
        <div class="car-module-empty-state" style="color: var(--car-red);">
          <h3>Ошибка загрузки данных</h3>
          <p>${error.message}</p>
        </div>
      `;
    } finally {
      if (!wasLoading) setLoading(false);
    }
  }

  async function loadCarsData() {
    try {
      carsData = await getAllCars();
      
      const companies = [...new Set(carsData.map(car => car.company).filter(Boolean))];
      carsCompanyFilters = {};
      companies.forEach(company => carsCompanyFilters[company] = false);
      
      filterCarsData();
      updateAnalyticsCarFilter();
      
      if (activeTab === 'cars') renderCarsTab();
    } catch (error) {
      showToast('Ошибка загрузки автомобилей: ' + error.message, 'error');
    }
  }

  async function loadFuelPrices() {
    try {
      fuelPricesData = await getFuelPrices(selectedMonth, selectedYear);
      
      const companies = [...new Set(fuelPricesData.map(price => price.company).filter(Boolean))];
      companies.forEach(company => {
        if (!(company in companyFilters)) companyFilters[company] = false;
      });
      
      filterFuelPricesData();
      
      if (activeTab === 'fuel' || activeTab === 'totals' || activeTab === 'data') {
        renderContent();
      }
    } catch (error) {
      showToast('Ошибка загрузки цен: ' + error.message, 'error');
    }
  }

  async function loadMissingFuelTypes() {
    try {
      missingFuelData = await getMissingFuelTypes(selectedMonth, selectedYear);
      if (activeTab === 'fuel') renderFuelTab();
    } catch (error) {
      console.error('Error loading missing fuel types:', error);
    }
  }

  function renderSettings() {
    const userSettings = loadUserSettings();
    let settingsHTML = '';
    
    settings.forEach(setting => {
      const isExpanded = userSettings.expandedSettings.includes(setting.id);
      
      settingsHTML += `
        <div class="car-module-settings-block">
          <div class="car-module-settings-header" data-setting="${setting.id}">
            <h3>${setting.title}</h3>
            <svg class="car-module-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="car-module-settings-content ${isExpanded ? 'expanded' : ''}">
      `;
      
      if (setting.columns && setting.columns.length > 0) {
        setting.columns.forEach(column => {
          let isVisible = false;
          
          if (setting.id === 'tabs') {
            const tabId = column.id.replace('-tab', '');
            isVisible = userSettings.visibleTabs.includes(tabId);
          } else if (setting.id === 'columns') {
            isVisible = userSettings.visibleColumns.includes(column.id);
          } else if (setting.id === 'filters') {
            isVisible = userSettings.visibleFilters[column.id] || false;
          }
          
          settingsHTML += `
            <div class="car-module-column-item">
              <span class="car-module-column-label">${column.label}</span>
              <label class="car-module-toggle">
                <input type="checkbox" ${isVisible ? 'checked' : ''} data-column="${column.id}" data-setting="${setting.id}">
                <span class="car-module-slider"></span>
              </label>
            </div>
          `;
        });
      } else {
        settingsHTML += `
          <div style="color: var(--car-text-muted); font-size: 13px; text-align: center; padding: 20px;">
            Настройки скоро будут добавлены
          </div>
        `;
      }
      
      settingsHTML += `</div></div>`;
    });
    
    dashboardSettings.innerHTML = settingsHTML;
    
    document.querySelectorAll('.car-module-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const settingId = header.dataset.setting;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.car-module-expand-icon');
        
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
        
        const userSettings = loadUserSettings();
        const index = userSettings.expandedSettings.indexOf(settingId);
        
        if (content.classList.contains('expanded')) {
          if (index === -1) userSettings.expandedSettings.push(settingId);
        } else {
          if (index > -1) userSettings.expandedSettings.splice(index, 1);
        }
        
        saveUserSettings(userSettings);
      });
    });
    
    document.querySelectorAll('.car-module-toggle input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const columnId = e.target.dataset.column;
        const settingId = e.target.dataset.setting;
        const isChecked = e.target.checked;
        const userSettings = loadUserSettings();
        
        if (settingId === 'tabs') {
          const tabId = columnId.replace('-tab', '');
          if (isChecked) {
            if (!userSettings.visibleTabs.includes(tabId)) userSettings.visibleTabs.push(tabId);
          } else {
            const index = userSettings.visibleTabs.indexOf(tabId);
            if (index > -1) {
              userSettings.visibleTabs.splice(index, 1);
              if (activeTab === tabId && userSettings.visibleTabs.length > 0) {
                activeTab = userSettings.visibleTabs[0];
              }
            }
          }
          saveUserSettings(userSettings);
          renderTabs();
          renderContent();
        } else if (settingId === 'columns') {
          if (isChecked) {
            if (!userSettings.visibleColumns.includes(columnId)) userSettings.visibleColumns.push(columnId);
          } else {
            const index = userSettings.visibleColumns.indexOf(columnId);
            if (index > -1) userSettings.visibleColumns.splice(index, 1);
          }
          saveUserSettings(userSettings);
          if (activeTab === 'data') animateColumnChange(userSettings);
        } else if (settingId === 'filters') {
          userSettings.visibleFilters[columnId] = isChecked;
          saveUserSettings(userSettings);
          
          if (columnId === 'no-milage-filter') {
            hideNoMilageCars = isChecked;
            if (activeTab === 'data') {
              filterData();
              renderDataTable(loadUserSettings());
            }
          }
          
          renderGlobalFilters();
        }
      });
    });
  }

  function openFuelModal(car, existingFuel = null) {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    currentEditCar = car;
    modalInfo.textContent = `${car} - ${selectedMonth} ${selectedYear}`;
    
    if (existingFuel) {
      document.getElementById('modalFuelAmount').value = existingFuel.fuel_amount || '';
      document.getElementById('modalGasAmount').value = existingFuel.gas_amount || '';
    } else {
      document.getElementById('modalFuelAmount').value = '';
      document.getElementById('modalGasAmount').value = '';
    }
    
    fuelModal.classList.add('active');
  }

  function openMilageModal(car, existingMilage = null) {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    currentEditMilageData = { car, month: selectedMonth, year: selectedYear };
    milageModalInfo.textContent = `${car} - ${selectedMonth} ${selectedYear}`;
    milageInput.value = existingMilage?.milage || '';
    milageModal.classList.add('active');
  }

  function openRepairsModal(car, existingMilage = null) {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    currentEditRepairsData = { car, month: selectedMonth, year: selectedYear, existingMilage };
    repairsModalInfo.textContent = `${car} - ${selectedMonth} ${selectedYear}`;
    repairsModalType.value = 'Ремонт';
    repairsModalComment.value = '';
    repairsModalPrice.value = '';
    repairsModal.classList.add('active');
  }

  function openCommentModal(car, existingComment = '') {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    currentEditCar = car;
    commentModalInfo.textContent = `Комментарий для ${car} - ${selectedMonth} ${selectedYear}`;
    commentText.value = existingComment;
    commentModal.classList.add('active');
  }

function openCarModal(car = null) {
  if (!canEdit) {
    showToast('У вас нет прав на редактирование', 'error');
    return;
  }
  
  const numberInput = document.getElementById('carModalNumber');
  const companyInput = document.getElementById('carModalCompany');
  const departmentInput = document.getElementById('carModalDepartment');
  const typeInput = document.getElementById('carModalType');
  const fuelTypeInput = document.getElementById('carModalFuelType');
  const gasTypeInput = document.getElementById('carModalGasType');
  const tankInput = document.getElementById('carModalTank');
  const yearInput = document.getElementById('carModalYear');
  const spendingNormInput = document.getElementById('carModalSpendingNorm');
  const insuranceInput = document.getElementById('carModalInsurance');
  const moldInsuranceInput = document.getElementById('carModalMoldInsurance'); // Added
  const techInput = document.getElementById('carModalTech');
  const statusSelect = document.getElementById('carModalStatus');
  const modalTitle = document.getElementById('carModalTitle');
  
  if (car) {
    modalTitle.textContent = 'Изменить автомобиль';
    numberInput.value = car.number || '';
    companyInput.value = car.company || '';
    departmentInput.value = car.department || '';
    typeInput.value = car.type || '';
    fuelTypeInput.value = car.fuel_type || '';
    gasTypeInput.value = car.gas_type || '';
    tankInput.value = car.tank || '';
    yearInput.value = car.year || '';
    spendingNormInput.value = car.spending_norm || '';
    
    if (car.insurance) {
      const insuranceDate = new Date(car.insurance);
      insuranceInput.value = insuranceDate.toISOString().split('T')[0];
    } else {
      insuranceInput.value = '';
    }
    
    if (car.mold_insurance) {  // Added mold_insurance handling
      const moldInsuranceDate = new Date(car.mold_insurance);
      moldInsuranceInput.value = moldInsuranceDate.toISOString().split('T')[0];
    } else {
      moldInsuranceInput.value = '';
    }
    
    if (car.technical_inspection) {
      const techDate = new Date(car.technical_inspection);
      techInput.value = techDate.toISOString().split('T')[0];
    } else {
      techInput.value = '';
    }
    
    statusSelect.value = car.active !== false ? 'active' : 'inactive';
    currentEditCarId = car.id;
  } else {
    modalTitle.textContent = 'Добавить автомобиль';
    numberInput.value = '';
    companyInput.value = '';
    departmentInput.value = '';
    typeInput.value = '';
    fuelTypeInput.value = '';
    gasTypeInput.value = '';
    tankInput.value = '';
    yearInput.value = '';
    spendingNormInput.value = '';
    insuranceInput.value = '';
    moldInsuranceInput.value = '';  // Added
    techInput.value = '';
    statusSelect.value = 'active';
    currentEditCarId = null;
  }
  
  carModal.classList.add('active');
}

  function openFuelPriceModal(price = null) {
    if (!canEdit) {
      showToast('У вас нет прав на редактирование', 'error');
      return;
    }
    
    const fuelTypeInput = document.getElementById('fuelPriceModalFuelType');
    const typeSelect = document.getElementById('fuelPriceModalType');
    const companySelect = document.getElementById('fuelPriceModalCompany');
    const priceInput = document.getElementById('fuelPriceModalPrice');
    
    if (price) {
      fuelTypeInput.value = price.fuel_type || '';
      typeSelect.value = price.type || '';
      companySelect.value = price.company || '';
      priceInput.value = price.price || '';
      currentEditFuelPriceId = price.id;
    } else {
      fuelTypeInput.value = '';
      typeSelect.value = '';
      companySelect.value = '';
      priceInput.value = '';
      currentEditFuelPriceId = null;
    }
    
    fuelPriceModal.classList.add('active');
  }

  async function init() {
    renderSettings();
    renderTabs();
    
    const userSettings = loadUserSettings();
    hideNoMilageCars = userSettings.visibleFilters['no-milage-filter'] !== false;
    
    try {
      setLoading(true, 'Загрузка данных...');
      
      const data = await getDashboardData(selectedMonth, selectedYear);
      dashboardData = data;
      
      const companies = [...new Set(data.map(car => car.company).filter(Boolean))];
      companyFilters = {};
      totalsCompanyFilters = {};
      companies.forEach(company => {
        companyFilters[company] = false;
        totalsCompanyFilters[company] = false;
      });
      
      filterData();
      renderContent();
      
      await Promise.all([loadCarsData(), loadFuelPrices(), loadMissingFuelTypes()]);
    } catch (error) {
      tabContent.innerHTML = `
        <div class="car-module-empty-state" style="color: var(--car-red);">
          <h3>Ошибка загрузки данных</h3>
          <p>${error.message}</p>
        </div>
      `;
    } finally {
      setLoading(false);
    }
  }

  modalCancel.addEventListener('click', () => fuelModal.classList.remove('active'));

  modalSave.addEventListener('click', async () => {
    const fuelAmount = document.getElementById('modalFuelAmount').value;
    const gasAmount = document.getElementById('modalGasAmount').value;
    
    try {
      modalSave.disabled = true;
      modalSave.textContent = 'Сохранение...';
      
      const carData = dashboardData.find(car => car.number === currentEditCar);
      const currentFuel = carData?.fuel?.[0];
      const existingComment = currentFuel?.comment || '';
      const existingArchive = currentFuel?.archive || null;
      
      const result = await saveFuelData(
        currentEditCar,
        selectedMonth,
        selectedYear.toString(),
        fuelAmount,
        gasAmount,
        existingComment,
        existingArchive
      );
      
      const newFuelData = {
        car: currentEditCar,
        month: selectedMonth,
        year: selectedYear.toString(),
        fuel_amount: fuelAmount,
        gas_amount: gasAmount,
        comment: existingComment,
        archive: existingArchive,
        ...result.data
      };
      
      updateFuelDataInTable(currentEditCar, newFuelData);
      fuelModal.classList.remove('active');
      showToast('Данные сохранены', 'success');
    } catch (error) {
      showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
      modalSave.disabled = false;
      modalSave.textContent = 'Сохранить';
    }
  });

  milageModalCancel.addEventListener('click', () => milageModal.classList.remove('active'));

  milageModalSave.addEventListener('click', async () => {
    const milage = milageInput.value.trim();
    if (!milage) {
      showToast('Введите пробег', 'error');
      return;
    }
    
    try {
      milageModalSave.disabled = true;
      milageModalSave.textContent = 'Сохранение...';
      
      const carData = dashboardData.find(c => c.number === currentEditMilageData.car);
      const currentMilage = carData?.milage?.current;
      const existingRepairs = currentMilage?.repairs || null;
      
      await saveMilage(
        currentEditMilageData.car,
        currentEditMilageData.month,
        currentEditMilageData.year,
        milage,
        existingRepairs
      );
      
      await reloadData();
      milageModal.classList.remove('active');
      showToast('Пробег сохранен', 'success');
    } catch (error) {
      showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
      milageModalSave.disabled = false;
      milageModalSave.textContent = 'Сохранить';
    }
  });

  repairsModalCancel.addEventListener('click', () => repairsModal.classList.remove('active'));

  repairsModalSave.addEventListener('click', async () => {
    const type = repairsModalType.value;
    const comment = repairsModalComment.value.trim();
    const price = repairsModalPrice.value.trim();
    
    if (!price) {
      showToast('Введите сумму', 'error');
      return;
    }
    
    try {
      repairsModalSave.disabled = true;
      repairsModalSave.textContent = 'Сохранение...';
      
      const carData = dashboardData.find(c => c.number === currentEditRepairsData.car);
      const currentMilage = carData?.milage?.current;
      const currentMilageValue = currentMilage?.milage || '0';
      
      let repairsArray = [];
      if (currentMilage?.repairs) {
        if (typeof currentMilage.repairs === 'string') {
          try {
            const parsed = JSON.parse(currentMilage.repairs);
            if (Array.isArray(parsed)) {
              repairsArray = parsed;
            }
          } catch {
            repairsArray = [];
          }
        } else if (Array.isArray(currentMilage.repairs)) {
          repairsArray = currentMilage.repairs;
        }
      }
      
      const newRepair = {
        type,
        comment,
        price: parseFloat(price)
      };
      
      repairsArray.push(newRepair);
      
      await saveMilage(
        currentEditRepairsData.car,
        currentEditRepairsData.month,
        currentEditRepairsData.year,
        currentMilageValue,
        JSON.stringify(repairsArray)
      );
      
      await reloadData();
      repairsModal.classList.remove('active');
      showToast('Запись добавлена', 'success');
    } catch (error) {
      showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
      repairsModalSave.disabled = false;
      repairsModalSave.textContent = 'Сохранить';
    }
  });

  commentModalCancel.addEventListener('click', () => commentModal.classList.remove('active'));

  commentModalSave.addEventListener('click', async () => {
    const comment = commentText.value.trim();
    
    try {
      commentModalSave.disabled = true;
      commentModalSave.textContent = 'Сохранение...';
      
      const carData = dashboardData.find(car => car.number === currentEditCar);
      const currentFuel = carData?.fuel?.[0];
      const existingFuelAmount = currentFuel?.fuel_amount || '';
      const existingGasAmount = currentFuel?.gas_amount || '';
      const existingArchive = currentFuel?.archive || null;
      
      const result = await saveFuelData(
        currentEditCar,
        selectedMonth,
        selectedYear.toString(),
        existingFuelAmount,
        existingGasAmount,
        comment,
        existingArchive
      );
      
      const newFuelData = {
        car: currentEditCar,
        month: selectedMonth,
        year: selectedYear.toString(),
        fuel_amount: existingFuelAmount,
        gas_amount: existingGasAmount,
        comment: comment,
        archive: existingArchive,
        ...result.data
      };
      
      updateFuelDataInTable(currentEditCar, newFuelData);
      commentModal.classList.remove('active');
      showToast('Комментарий сохранен', 'success');
    } catch (error) {
      showToast('Ошибка сохранения комментария: ' + error.message, 'error');
    } finally {
      commentModalSave.disabled = false;
      commentModalSave.textContent = 'Сохранить';
    }
  });

  carModalCancel.addEventListener('click', () => carModal.classList.remove('active'));

carModalSave.addEventListener('click', async () => {
  const number = document.getElementById('carModalNumber').value.trim();
  const company = document.getElementById('carModalCompany').value.trim();
  const department = document.getElementById('carModalDepartment').value.trim();
  const type = document.getElementById('carModalType').value.trim();
  const fuelType = document.getElementById('carModalFuelType').value.trim();
  const gasType = document.getElementById('carModalGasType').value.trim();
  const tank = document.getElementById('carModalTank').value.trim();
  const year = document.getElementById('carModalYear').value.trim();
  const spendingNorm = document.getElementById('carModalSpendingNorm').value.trim();
  const insurance = document.getElementById('carModalInsurance').value;
  const moldInsurance = document.getElementById('carModalMoldInsurance').value;  // Added
  const tech = document.getElementById('carModalTech').value;
  const status = document.getElementById('carModalStatus').value;
  
  if (!number) {
    showToast('Введите номер автомобиля', 'error');
    return;
  }
  
  try {
    carModalSave.disabled = true;
    carModalSave.textContent = 'Сохранение...';
    
    const carData = {
      number,
      company: company || null,
      department: department || null,
      type: type || null,
      fuel_type: fuelType || null,
      gas_type: gasType || null,
      tank: tank || null,
      year: year || null,
      spending_norm: spendingNorm || null,
      insurance: insurance || null,
      mold_insurance: moldInsurance || null,  // Added
      technical_inspection: tech || null,
      active: status === 'active'
    };
    
    if (currentEditCarId) carData.id = currentEditCarId;
    
    await saveCar(carData);
    await loadCarsData();
    await reloadData();
    carModal.classList.remove('active');
    showToast('Автомобиль сохранен', 'success');
  } catch (error) {
    showToast('Ошибка сохранения: ' + error.message, 'error');
  } finally {
    carModalSave.disabled = false;
    carModalSave.textContent = 'Сохранить';
  }
});

  fuelPriceModalCancel.addEventListener('click', () => fuelPriceModal.classList.remove('active'));

  fuelPriceModalSave.addEventListener('click', async () => {
    const fuelType = document.getElementById('fuelPriceModalFuelType').value.trim();
    const type = document.getElementById('fuelPriceModalType').value;
    const company = document.getElementById('fuelPriceModalCompany').value;
    const price = document.getElementById('fuelPriceModalPrice').value.trim();
    
    if (!fuelType) {
      showToast('Введите тип топлива', 'error');
      return;
    }
    
    if (!type) {
      showToast('Выберите категорию топлива', 'error');
      return;
    }
    
    if (!company) {
      showToast('Выберите компанию', 'error');
      return;
    }
    
    if (!price) {
      showToast('Введите цену', 'error');
      return;
    }
    
    try {
      fuelPriceModalSave.disabled = true;
      fuelPriceModalSave.textContent = 'Сохранение...';
      
      await saveFuelPrice(currentEditFuelPriceId || undefined, fuelType, type, selectedMonth, selectedYear, price, company);
      await loadFuelPrices();
      await loadMissingFuelTypes();
      fuelPriceModal.classList.remove('active');
      showToast('Цена сохранена', 'success');
    } catch (error) {
      showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
      fuelPriceModalSave.disabled = false;
      fuelPriceModalSave.textContent = 'Сохранить';
    }
  });

  fuelModal.addEventListener('click', (e) => {
    if (e.target === fuelModal) fuelModal.classList.remove('active');
  });

  container.addEventListener('click', (e) => {
    const refreshBtn = e.target.closest('#globalRefreshBtn');
    if (refreshBtn) refreshData();
  });

  milageModal.addEventListener('click', (e) => {
    if (e.target === milageModal) milageModal.classList.remove('active');
  });

  repairsModal.addEventListener('click', (e) => {
    if (e.target === repairsModal) repairsModal.classList.remove('active');
  });

  commentModal.addEventListener('click', (e) => {
    if (e.target === commentModal) commentModal.classList.remove('active');
  });

  carModal.addEventListener('click', (e) => {
    if (e.target === carModal) carModal.classList.remove('active');
  });

  fuelPriceModal.addEventListener('click', (e) => {
    if (e.target === fuelPriceModal) fuelPriceModal.classList.remove('active');
  });

  init();

  return {
    cleanup() {
      container.innerHTML = '';
    }
  };
}