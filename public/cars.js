export async function loadModule(container, { chatId, userData }) {

  async function getCarData() {
    const response = await fetch('/api/cars/get-cars');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки');
    return result.data;
  }

  async function saveMilageReading(carNumber, milage, month, year) {
    const response = await fetch('/api/cars/save-milage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carNumber, milage: Number(milage), month, year })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка сохранения');
    return result;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  const currentMonthName = monthNames[currentMonth - 1];
  const currentYear = now.getFullYear();
  const months = monthNames.map(name => ({ value: name, name }));
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) years.push(i);

  container.innerHTML = `
    <div class="car-fuel-module">
      <div class="car-fuel-form-container">
        <div class="car-fuel-card">
          <label class="car-fuel-label">Автомобиль</label>
          <input 
            type="text" 
            id="carSearch" 
            class="car-fuel-search-input" 
            placeholder="Начните вводить номер или компанию..."
            autocomplete="off"
          >
          <select id="carSelect" class="car-fuel-select" size="6">
          </select>
        </div>
        <div class="car-fuel-card">
          <div class="car-fuel-date-row">
            <div class="car-fuel-date-group">
              <label class="car-fuel-label">Месяц</label>
              <select id="monthSelect" class="car-fuel-select">
                ${months.map(m => `<option value="${m.value}" ${m.value === currentMonthName ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="car-fuel-date-group">
              <label class="car-fuel-label">Год</label>
              <select id="yearSelect" class="car-fuel-select">
                ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="car-fuel-label">Пробег (км)</label>
            <input type="number" id="milageInput" class="car-fuel-input" min="0" placeholder="Введите пробег">
            <div class="car-fuel-option-hint">Введите текущий общий пробег автомобиля</div>
          </div>
        </div>
        <button id="sendBtn" class="car-fuel-button">Отправить</button>
      </div>
    </div>
  `;

  const carSearch = container.querySelector('#carSearch');
  const carSelect = container.querySelector('#carSelect');
  const monthSelect = container.querySelector('#monthSelect');
  const yearSelect = container.querySelector('#yearSelect');
  const milageInput = container.querySelector('#milageInput');
  const sendBtn = container.querySelector('#sendBtn');

  let allCars = [];
  let selectedCar = null;

  function formatCarDisplay(car) {
    const parts = [car.number];
    if (car.company) parts.push(car.company);
    return parts.join(' - ');
  }

  function updateCarList(searchText = '') {
    const search = searchText.toLowerCase().trim();
    
    carSelect.innerHTML = '';
    
    const filteredCars = allCars.filter(car => {
      if (!search) return true;
      const displayText = formatCarDisplay(car).toLowerCase();
      return displayText.includes(search) || 
             car.number.toLowerCase().includes(search) ||
             (car.company && car.company.toLowerCase().includes(search));
    });

    if (filteredCars.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'Нет результатов';
      carSelect.appendChild(option);
      selectedCar = null;
      return;
    }

    filteredCars.forEach(car => {
      const option = document.createElement('option');
      option.value = car.number;
      option.textContent = formatCarDisplay(car);
      option.dataset.carData = JSON.stringify(car);
      carSelect.appendChild(option);
    });

    if (filteredCars.length > 0) {
      carSelect.value = filteredCars[0].number;
      selectedCar = filteredCars[0];
    }
  }

  try {
    const cars = await getCarData();
    allCars = cars;
    updateCarList();
  } catch {
    carSelect.innerHTML = '<option value="" disabled>Ошибка загрузки автомобилей</option>';
  }

  carSearch.addEventListener('input', () => {
    updateCarList(carSearch.value);
  });

  carSelect.addEventListener('change', () => {
    const selectedOption = carSelect.options[carSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.carData) {
      selectedCar = JSON.parse(selectedOption.dataset.carData);
    }
  });

  sendBtn.addEventListener('click', async () => {
    if (!carSelect.value || carSelect.value === '') {
      alert('Пожалуйста, выберите автомобиль');
      carSearch.focus();
      return;
    }
    
    if (!milageInput.value || Number(milageInput.value) <= 0) {
      alert('Пожалуйста, введите корректный пробег');
      milageInput.focus();
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Отправка...';
    sendBtn.classList.add('car-fuel-loading');

    try {
      await saveMilageReading(
        carSelect.value,
        milageInput.value,
        monthSelect.value,
        yearSelect.value
      );

      sendBtn.classList.remove('car-fuel-loading');
      sendBtn.classList.add('car-fuel-button-success');
      sendBtn.textContent = '✓ Успешно сохранено';
      milageInput.value = '';
      carSearch.value = '';
      carSelect.value = '';
      selectedCar = null;
      updateCarList();
      
      setTimeout(() => {
        sendBtn.classList.remove('car-fuel-button-success');
        sendBtn.textContent = 'Отправить';
        sendBtn.disabled = false;
      }, 2000);
    } catch (err) {
      sendBtn.classList.remove('car-fuel-loading');
      sendBtn.classList.add('car-fuel-button-error');
      sendBtn.textContent = '✗ Ошибка сохранения';
      
      setTimeout(() => {
        sendBtn.classList.remove('car-fuel-button-error');
        sendBtn.textContent = 'Отправить';
        sendBtn.disabled = false;
      }, 2000);
      
      alert('Ошибка: ' + err.message);
    }
  });

  return {
    cleanup() {
      container.innerHTML = '';
    }
  };
}