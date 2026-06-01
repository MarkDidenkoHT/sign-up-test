export async function loadModule(container, { chatId, userData }) {
  let properties = [];
  let currentProperty = null;
  let currentTab = 'list';
  let editingId = null;
  let tempImages = [];

  let listView, formView, propertiesGrid, formContainer;

  let mapInstance = null;
  let searchBoxInstance = null;
  let mapInitialized = false;

  function loadYandexMaps() {
    return new Promise((resolve, reject) => {
      if (window.ymaps) {
        resolve(window.ymaps);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=88e358fe-210e-46f7-afb0-d300446bdc60&lang=ru_RU';
      script.type = 'text/javascript';
      script.onload = () => {
        window.ymaps.ready(() => resolve(window.ymaps));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.rental-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `rental-toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function formatNumber(num) {
    if (num === undefined || num === null) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function parseNumber(str) {
    if (!str) return null;
    return parseFloat(str.replace(/\s/g, '').replace(',', '.'));
  }

  async function loadProperties() {
    const response = await fetch('/api/rental/list');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки объектов');
    return result.data;
  }

  async function createProperty(data) {
    const response = await fetch('/api/rental/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка создания объекта');
    return result.data;
  }

  async function updateProperty(id, data) {
    const response = await fetch(`/api/rental/update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка обновления объекта');
    return result.data;
  }

  async function deleteProperty(id) {
    const response = await fetch(`/api/rental/delete/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка удаления объекта');
    return result.data;
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Ошибка загрузки изображения');
    return result.viewLink;
  }

  container.innerHTML = `
    <div class="rental-admin-wrapper">
      <div class="rental-admin-header">
        <h1>Управление арендой</h1>
        <button class="rental-create-btn" id="createNewBtn">+ Новый объект</button>
      </div>
      <div class="rental-admin-tabs">
        <button class="rental-tab-btn active" data-tab="list">Список объектов</button>
        <button class="rental-tab-btn" data-tab="form" style="display:none;" id="formTabBtn">Редактирование</button>
      </div>
      <div class="rental-admin-content">
        <div class="rental-list-view" id="listView">
          <div class="rental-list-header">
            <div class="rental-list-title">Объекты недвижимости</div>
            <div class="rental-list-subtitle">Управление коммерческими помещениями</div>
          </div>
          <div class="rental-properties-grid" id="propertiesGrid">
            <div class="rental-loading">
              <div class="rental-loading-spinner"></div>
              <p>Загрузка...</p>
            </div>
          </div>
        </div>
        <div class="rental-form-view" id="formView" style="display:none;">
          <div class="rental-form-container" id="formContainer"></div>
        </div>
      </div>
    </div>
  `;

  listView = container.querySelector('#listView');
  formView = container.querySelector('#formView');
  propertiesGrid = container.querySelector('#propertiesGrid');
  formContainer = container.querySelector('#formContainer');

  const createBtn = container.querySelector('#createNewBtn');
  const formTabBtn = container.querySelector('#formTabBtn');
  const tabBtns = container.querySelectorAll('.rental-tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;
      currentTab = tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (tab === 'list') {
        listView.style.display = 'flex';
        formView.style.display = 'none';
        renderPropertiesList();
      } else if (tab === 'form') {
        listView.style.display = 'none';
        formView.style.display = 'flex';
        setTimeout(() => {
          if (mapInstance) {
            mapInstance.container.fitToViewport();
          }
        }, 100);
      }
    });
  });

  createBtn.addEventListener('click', () => {
    editingId = null;
    currentProperty = null;
    tempImages = [];
    renderForm();
    formTabBtn.style.display = 'block';
    formTabBtn.classList.add('active');
    tabBtns.forEach(b => b.classList.remove('active'));
    formTabBtn.classList.add('active');
    listView.style.display = 'none';
    formView.style.display = 'flex';
    currentTab = 'form';
  });

  async function renderPropertiesList() {
    try {
      properties = await loadProperties();
      if (!properties || properties.length === 0) {
        propertiesGrid.innerHTML = `
          <div class="rental-empty">
            <div class="rental-empty-title">Нет объектов</div>
            <div class="rental-empty-text">Создайте первый объект недвижимости</div>
          </div>
        `;
        return;
      }

      let html = '';
      properties.forEach(prop => {
        const data = prop.rental_data;
        const areaRange = getAreaRange(data);
        const priceRange = getPriceRange(data);
        
        html += `
          <div class="rental-property-card" data-id="${prop.id}">
            <div class="rental-card-image">
              ${data.images && data.images[0] ? `<img src="${data.images[0]}" alt="${data.title}">` : '<div class="rental-card-image-placeholder"></div>'}
              <div class="rental-card-badge">${data.badge || 'Коммерческая'}</div>
            </div>
            <div class="rental-card-content">
              <h3 class="rental-card-title">${data.title}</h3>
              <div class="rental-card-address">📍 ${data.address}</div>
              <div class="rental-card-stats">
                <div class="rental-card-stat">
                  <span class="rental-stat-label">Площадь</span>
                  <span class="rental-stat-value">${areaRange}</span>
                </div>
                <div class="rental-card-stat">
                  <span class="rental-stat-label">Стоимость</span>
                  <span class="rental-stat-value">${priceRange}</span>
                </div>
              </div>
              <div class="rental-card-actions">
                <button class="rental-card-btn edit" data-id="${prop.id}">✏️ Редактировать</button>
                <button class="rental-card-btn delete" data-id="${prop.id}">🗑️ Удалить</button>
              </div>
            </div>
          </div>
        `;
      });

      propertiesGrid.innerHTML = html;

      propertiesGrid.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          await editProperty(id);
        });
      });

      propertiesGrid.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          if (confirm('Удалить этот объект?')) {
            try {
              await deleteProperty(id);
              showToast('Объект удален', 'success');
              await renderPropertiesList();
            } catch (error) {
              showToast(error.message, 'error');
            }
          }
        });
      });

    } catch (error) {
      propertiesGrid.innerHTML = `
        <div class="rental-empty">
          <div class="rental-empty-icon">⚠️</div>
          <div class="rental-empty-title">Ошибка загрузки</div>
          <div class="rental-empty-text">${error.message}</div>
        </div>
      `;
    }
  }

  function getAreaRange(data) {
    if (data.rooms && data.rooms.length > 0) {
      const areas = data.rooms.map(r => r.area);
      const minArea = Math.min(...areas);
      const maxArea = Math.max(...areas);
      if (minArea === maxArea) return formatNumber(minArea) + ' м²';
      return formatNumber(minArea) + ' - ' + formatNumber(maxArea) + ' м²';
    }
    if (typeof data.area === 'string') return data.area + ' м²';
    return formatNumber(data.area) + ' м²';
  }

  function getPriceRange(data) {
    if (data.rooms && data.rooms.length > 0) {
      const prices = data.rooms.map(r => r.price);
      const validPrices = prices.filter(p => typeof p === 'number');
      if (validPrices.length === 0) return 'договорная';
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      if (minPrice === maxPrice) return formatNumber(minPrice) + ' у.е.';
      return formatNumber(minPrice) + ' - ' + formatNumber(maxPrice) + ' у.е.';
    }
    if (data.pricePerSqm === 'договорная') return 'договорная';
    const total = data.area * data.pricePerSqm;
    return 'от ' + formatNumber(Math.round(total)) + ' у.е.';
  }

  async function editProperty(id) {
    const property = properties.find(p => p.id === id);
    if (!property) return;
    
    editingId = id;
    currentProperty = property.rental_data;
    tempImages = [...(currentProperty.images || [])];
    
    renderForm();
    formTabBtn.style.display = 'block';
    formTabBtn.classList.add('active');
    tabBtns.forEach(b => b.classList.remove('active'));
    formTabBtn.classList.add('active');
    listView.style.display = 'none';
    formView.style.display = 'flex';
    currentTab = 'form';
  }

  function renderForm() {
    const data = currentProperty || {
      title: '',
      address: '',
      badge: '',
      coords: [46.8341, 29.6183],
      description: '',
      area: '',
      pricePerSqm: '',
      features: [],
      contacts: {
        phone1: '',
        phone2: '',
        telegram: '',
        email: ''
      },
      rooms: [],
      images: []
    };

    const roomsList = (data.rooms || []).map((room, idx) => `
      <div class="rental-room-item" data-room-index="${idx}">
        <div class="rental-room-header">
          <strong>${room.name}</strong>
          <button type="button" class="rental-remove-room-btn" data-index="${idx}">🗑️</button>
        </div>
        <div class="rental-form-row">
          <div class="rental-form-group">
            <label>Название</label>
            <input type="text" class="rental-room-name" value="${escapeHtml(room.name)}" data-index="${idx}">
          </div>
          <div class="rental-form-group">
            <label>Этаж</label>
            <input type="number" class="rental-room-floor" value="${room.floor}" data-index="${idx}">
          </div>
        </div>
        <div class="rental-form-row">
          <div class="rental-form-group">
            <label>Площадь (м²)</label>
            <input type="text" class="rental-room-area" value="${formatNumber(room.area)}" data-index="${idx}">
          </div>
          <div class="rental-form-group">
            <label>Цена за м² (у.е.)</label>
            <input type="text" class="rental-room-rent" value="${formatNumber(room.rent)}" data-index="${idx}">
          </div>
        </div>
        <div class="rental-form-group">
          <label>Итоговая цена (у.е.)</label>
          <input type="text" class="rental-room-price" value="${formatNumber(room.price)}" data-index="${idx}">
        </div>
      </div>
    `).join('');

    const featuresList = (data.features || []).map((feature, idx) => `
      <div class="rental-feature-item">
        <input type="text" value="${escapeHtml(feature)}" class="rental-feature-input" data-index="${idx}">
        <button type="button" class="rental-remove-feature-btn" data-index="${idx}">✕</button>
      </div>
    `).join('');

    const imagesHtml = (tempImages || []).map((img, idx) => `
      <div class="rental-image-preview">
        <img src="${img}" alt="Preview">
        <button type="button" class="rental-remove-image-btn" data-url="${img}">✕</button>
      </div>
    `).join('');

    formContainer.innerHTML = `
      <div class="rental-form">
        <div class="rental-form-header">
          <h2>${editingId ? 'Редактирование объекта' : 'Новый объект'}</h2>
        </div>
        
        <div class="rental-form-section">
          <h3>Основная информация</h3>
          <div class="rental-form-group">
            <label>Название объекта *</label>
            <input type="text" id="rentalTitle" value="${escapeHtml(data.title || '')}" placeholder="Например: Древо Жизни">
          </div>
          <div class="rental-form-group">
            <label>Адрес *</label>
            <input type="text" id="rentalAddress" value="${escapeHtml(data.address || '')}" placeholder="Тирасполь, ул. Шевченко 66">
          </div>
          <div class="rental-form-row">
            <div class="rental-form-group">
              <label>Бейдж</label>
              <input type="text" id="rentalBadge" value="${escapeHtml(data.badge || '')}" placeholder="Центр, Премиум, Новая постройка">
            </div>
          </div>
          <div class="rental-form-group">
            <label>Местоположение на карте</label>
            <div id="yandex-map" style="width: 100%; height: 300px; margin-bottom: 10px; border-radius: 8px;"></div>
            <div class="rental-form-row">
              <input type="text" id="rentalAddressSearch" placeholder="Введите адрес для поиска..." style="width: 100%; margin-bottom: 8px;">
              <small style="color: #666; display: block; margin-bottom: 8px;">🔍 Начните вводить адрес, чтобы найти на карте</small>
            </div>
            <div class="rental-form-row">
              <div class="rental-form-group">
                <label>Широта</label>
                <input type="text" id="rentalLat" value="${data.coords?.[0] || ''}" placeholder="46.8341" readonly style="background: #f5f5f5;">
              </div>
              <div class="rental-form-group">
                <label>Долгота</label>
                <input type="text" id="rentalLng" value="${data.coords?.[1] || ''}" placeholder="29.6183" readonly style="background: #f5f5f5;">
              </div>
            </div>
            <small style="color: #666;">💡 Перетащите маркер на карте или найдите адрес через поиск</small>
          </div>
          <div class="rental-form-group">
            <label>Описание</label>
            <textarea id="rentalDescription" rows="4" placeholder="Подробное описание объекта...">${escapeHtml(data.description || '')}</textarea>
          </div>
        </div>

        <div class="rental-form-section">
          <h3>Характеристики</h3>
          <div class="rental-form-row">
            <div class="rental-form-group">
              <label>Общая площадь (м²)</label>
              <input type="text" id="rentalArea" value="${formatNumber(data.area) || ''}" placeholder="269.4">
            </div>
            <div class="rental-form-group">
              <label>Цена за м² (у.е.)</label>
              <input type="text" id="rentalPricePerSqm" value="${formatNumber(data.pricePerSqm) || ''}" placeholder="12">
            </div>
          </div>
        </div>

        <div class="rental-form-section">
          <h3>Особенности</h3>
          <div id="rentalFeaturesList" class="rental-features-list">
            ${featuresList}
          </div>
          <button type="button" id="rentalAddFeatureBtn" class="rental-add-btn">+ Добавить особенность</button>
        </div>

        <div class="rental-form-section">
          <h3>Помещения</h3>
          <div id="rentalRoomsList" class="rental-rooms-list">
            ${roomsList}
          </div>
          <button type="button" id="rentalAddRoomBtn" class="rental-add-btn">+ Добавить помещение</button>
        </div>

        <div class="rental-form-section">
          <h3>Изображения</h3>
          <div class="rental-images-upload">
            <div class="rental-images-preview" id="rentalImagesPreview">
              ${imagesHtml}
            </div>
            <label class="rental-upload-btn">
              📸 Загрузить изображение
              <input type="file" id="rentalImageUpload" accept="image/*" multiple style="display:none">
            </label>
          </div>
        </div>

        <div class="rental-form-section">
          <h3>Контакты</h3>
          <div class="rental-form-group">
            <label>Телефон 1</label>
            <input type="text" id="rentalPhone1" value="${escapeHtml(data.contacts?.phone1 || '')}" placeholder="+373 775 50 551">
          </div>
          <div class="rental-form-group">
            <label>Телефон 2</label>
            <input type="text" id="rentalPhone2" value="${escapeHtml(data.contacts?.phone2 || '')}" placeholder="+373 778 71 781">
          </div>
          <div class="rental-form-group">
            <label>Telegram</label>
            <input type="text" id="rentalTelegram" value="${escapeHtml(data.contacts?.telegram || '')}" placeholder="https://t.me/username">
          </div>
          <div class="rental-form-group">
            <label>Email</label>
            <input type="email" id="rentalEmail" value="${escapeHtml(data.contacts?.email || '')}" placeholder="email@example.com">
          </div>
        </div>

        <div class="rental-form-actions">
          <button type="button" id="rentalCancelBtn" class="rental-cancel-btn">Отмена</button>
          <button type="button" id="rentalSaveBtn" class="rental-save-btn">${editingId ? 'Сохранить' : 'Создать'}</button>
        </div>
      </div>
    `;

    const addressSearchInput = document.getElementById('rentalAddressSearch');
    const addressInput = document.getElementById('rentalAddress');
    
    if (addressSearchInput && addressInput) {
      addressSearchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length > 2 && searchBoxInstance) {
          searchBoxInstance.search(query);
        }
      });
    }

    initMap(
      data.coords?.[0] || 46.8341,
      data.coords?.[1] || 29.6183,
      'rentalAddress',
      'rentalLat',
      'rentalLng'
    ).catch(err => {
      console.error('Failed to load map:', err);
    });

    document.getElementById('rentalCancelBtn')?.addEventListener('click', () => {
      if (currentTab === 'form') {
        formTabBtn.style.display = 'none';
        tabBtns.forEach(b => b.classList.remove('active'));
        tabBtns[0].classList.add('active');
        listView.style.display = 'flex';
        formView.style.display = 'none';
        currentTab = 'list';
        renderPropertiesList();
      }
    });

    document.getElementById('rentalSaveBtn')?.addEventListener('click', async () => {
      await saveProperty();
    });

    document.getElementById('rentalAddFeatureBtn')?.addEventListener('click', () => {
      const featuresList = document.getElementById('rentalFeaturesList');
      const index = featuresList.children.length;
      const div = document.createElement('div');
      div.className = 'rental-feature-item';
      div.innerHTML = `
        <input type="text" class="rental-feature-input" data-index="${index}">
        <button type="button" class="rental-remove-feature-btn" data-index="${index}">✕</button>
      `;
      featuresList.appendChild(div);
      div.querySelector('.rental-remove-feature-btn').addEventListener('click', () => div.remove());
    });

    document.getElementById('rentalAddRoomBtn')?.addEventListener('click', () => {
      const roomsList = document.getElementById('rentalRoomsList');
      const index = roomsList.children.length;
      const div = document.createElement('div');
      div.className = 'rental-room-item';
      div.setAttribute('data-room-index', index);
      div.innerHTML = `
        <div class="rental-room-header">
          <strong>Новое помещение</strong>
          <button type="button" class="rental-remove-room-btn" data-index="${index}">🗑️</button>
        </div>
        <div class="rental-form-row">
          <div class="rental-form-group">
            <label>Название</label>
            <input type="text" class="rental-room-name" data-index="${index}">
          </div>
          <div class="rental-form-group">
            <label>Этаж</label>
            <input type="number" class="rental-room-floor" data-index="${index}">
          </div>
        </div>
        <div class="rental-form-row">
          <div class="rental-form-group">
            <label>Площадь (м²)</label>
            <input type="text" class="rental-room-area" data-index="${index}">
          </div>
          <div class="rental-form-group">
            <label>Цена за м² (у.е.)</label>
            <input type="text" class="rental-room-rent" data-index="${index}">
          </div>
        </div>
        <div class="rental-form-group">
          <label>Итоговая цена (у.е.)</label>
          <input type="text" class="rental-room-price" data-index="${index}">
        </div>
      `;
      roomsList.appendChild(div);
      
      div.querySelector('.rental-remove-room-btn').addEventListener('click', () => div.remove());
      
      const areaInput = div.querySelector('.rental-room-area');
      const rentInput = div.querySelector('.rental-room-rent');
      const priceInput = div.querySelector('.rental-room-price');
      
      const updatePrice = () => {
        const area = parseNumber(areaInput.value);
        const rent = parseNumber(rentInput.value);
        if (area && rent) {
          priceInput.value = formatNumber(Math.round(area * rent));
        }
      };
      
      areaInput.addEventListener('input', updatePrice);
      rentInput.addEventListener('input', updatePrice);
    });

    document.getElementById('rentalImageUpload')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const url = await uploadImage(file);
          tempImages.push(url);
          const preview = document.getElementById('rentalImagesPreview');
          const div = document.createElement('div');
          div.className = 'rental-image-preview';
          div.innerHTML = `
            <img src="${url}" alt="Preview">
            <button type="button" class="rental-remove-image-btn" data-url="${url}">✕</button>
          `;
          preview.appendChild(div);
          div.querySelector('.rental-remove-image-btn').addEventListener('click', async () => {
            const idx = tempImages.indexOf(url);
            if (idx !== -1) tempImages.splice(idx, 1);
            div.remove();
          });
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
      e.target.value = '';
    });

    document.querySelectorAll('.rental-remove-image-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        const idx = tempImages.indexOf(url);
        if (idx !== -1) tempImages.splice(idx, 1);
        btn.closest('.rental-image-preview').remove();
      });
    });

    document.querySelectorAll('.rental-remove-feature-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.rental-feature-item').remove());
    });

    document.querySelectorAll('.rental-remove-room-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.rental-room-item').remove());
    });

    document.querySelectorAll('.rental-room-area, .rental-room-rent').forEach(input => {
      const updatePrice = () => {
        const item = input.closest('.rental-room-item');
        const area = parseNumber(item.querySelector('.rental-room-area').value);
        const rent = parseNumber(item.querySelector('.rental-room-rent').value);
        const priceInput = item.querySelector('.rental-room-price');
        if (area && rent) {
          priceInput.value = formatNumber(Math.round(area * rent));
        }
      };
      input.addEventListener('input', updatePrice);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  async function initMap(lat = 46.8341, lng = 29.6183, addressInputId, latInputId, lngInputId) {
    if (!mapInitialized) {
      await loadYandexMaps();
      mapInitialized = true;
    }

    const addressInput = document.getElementById(addressInputId);
    const latInput = document.getElementById(latInputId);
    const lngInput = document.getElementById(lngInputId);

    if (!addressInput || !latInput || !lngInput) return;

    const mapContainer = document.getElementById('yandex-map');
    if (!mapContainer) return;

    if (mapInstance) {
      mapInstance.destroy();
    }

    mapInstance = new window.ymaps.Map(mapContainer, {
      center: [lat, lng],
      zoom: 16,
      controls: ['zoomControl', 'fullscreenControl']
    });

    const placemark = new window.ymaps.Placemark([lat, lng], {}, {
      draggable: true,
      preset: 'islands#redDotIcon'
    });

    mapInstance.geoObjects.add(placemark);

    placemark.events.add('dragend', () => {
      const coords = placemark.geometry.getCoordinates();
      latInput.value = coords[0].toFixed(6);
      lngInput.value = coords[1].toFixed(6);
    });

    if (searchBoxInstance) {
      searchBoxInstance.events.removeAll();
    }

    searchBoxInstance = new window.ymaps.control.SearchControl({
      options: {
        provider: 'yandex#search',
        noPlacemark: true,
        resultsPerPage: 5,
        boundedBy: undefined
      }
    });

    mapInstance.controls.add(searchBoxInstance);

    searchBoxInstance.events.add('resultselect', async (e) => {
      const index = e.get('index');
      const results = searchBoxInstance.getResultsArray();
      if (results && results[index]) {
        const coords = results[index].geometry.getCoordinates();
        latInput.value = coords[0].toFixed(6);
        lngInput.value = coords[1].toFixed(6);
        mapInstance.setCenter(coords, 16);
        placemark.geometry.setCoordinates(coords);
        
        const address = results[index].getAddressLine();
        if (address && addressInput.value.trim() === '') {
          addressInput.value = address;
        }
      }
    });

    searchBoxInstance.events.add('load', () => {
      const suggestView = searchBoxInstance.getSuggestView();
      if (suggestView) {
        suggestView.events.add('select', (e) => {
          const selectedItem = e.get('item');
          if (selectedItem && selectedItem.value) {
            const geocoder = window.ymaps.geocode(selectedItem.value);
            geocoder.then((res) => {
              const firstGeoObject = res.geoObjects.get(0);
              if (firstGeoObject) {
                const coords = firstGeoObject.geometry.getCoordinates();
                latInput.value = coords[0].toFixed(6);
                lngInput.value = coords[1].toFixed(6);
                mapInstance.setCenter(coords, 16);
                placemark.geometry.setCoordinates(coords);
                
                const address = firstGeoObject.getAddressLine();
                if (address && addressInput.value.trim() === '') {
                  addressInput.value = address;
                }
              }
            });
          }
        });
      }
    });

    window.ymaps.geocode([lat, lng]).then((res) => {
      const firstGeoObject = res.geoObjects.get(0);
      if (firstGeoObject && addressInput.value.trim() === '') {
        const address = firstGeoObject.getAddressLine();
        if (address) {
          addressInput.value = address;
        }
      }
    });
  }

  async function saveProperty() {
    try {
      const title = document.getElementById('rentalTitle')?.value.trim();
      const address = document.getElementById('rentalAddress')?.value.trim();
      const badge = document.getElementById('rentalBadge')?.value.trim();
      const lat = parseFloat(document.getElementById('rentalLat')?.value);
      const lng = parseFloat(document.getElementById('rentalLng')?.value);
      const description = document.getElementById('rentalDescription')?.value.trim();
      const area = parseNumber(document.getElementById('rentalArea')?.value);
      const pricePerSqm = parseNumber(document.getElementById('rentalPricePerSqm')?.value);
      const phone1 = document.getElementById('rentalPhone1')?.value.trim();
      const phone2 = document.getElementById('rentalPhone2')?.value.trim();
      const telegram = document.getElementById('rentalTelegram')?.value.trim();
      const email = document.getElementById('rentalEmail')?.value.trim();

      if (!title || !address) {
        showToast('Заполните название и адрес', 'error');
        return;
      }

      const features = [];
      document.querySelectorAll('.rental-feature-input').forEach(input => {
        const val = input.value.trim();
        if (val) features.push(val);
      });

      const rooms = [];
      document.querySelectorAll('.rental-room-item').forEach(item => {
        const name = item.querySelector('.rental-room-name')?.value.trim();
        const floor = parseInt(item.querySelector('.rental-room-floor')?.value);
        const areaVal = parseNumber(item.querySelector('.rental-room-area')?.value);
        const rent = parseNumber(item.querySelector('.rental-room-rent')?.value);
        const price = parseNumber(item.querySelector('.rental-room-price')?.value);
        
        if (name && areaVal) {
          rooms.push({
            name,
            floor: floor || 0,
            area: areaVal,
            rent: rent || 0,
            price: price || (areaVal * (rent || 0))
          });
        }
      });

      const rentalData = {
        title,
        address,
        badge: badge || '',
        coords: [isNaN(lat) ? 46.8341 : lat, isNaN(lng) ? 29.6183 : lng],
        description: description || '',
        area: area || 0,
        pricePerSqm: pricePerSqm || 0,
        features,
        contacts: {
          phone1: phone1 || '',
          phone2: phone2 || '',
          telegram: telegram || '',
          email: email || ''
        },
        rooms: rooms.length > 0 ? rooms : [],
        images: tempImages
      };

      if (editingId) {
        await updateProperty(editingId, { rental_data: rentalData });
        showToast('Объект обновлен', 'success');
      } else {
        await createProperty({ rental_data: rentalData });
        showToast('Объект создан', 'success');
      }

      formTabBtn.style.display = 'none';
      tabBtns.forEach(b => b.classList.remove('active'));
      tabBtns[0].classList.add('active');
      listView.style.display = 'flex';
      formView.style.display = 'none';
      currentTab = 'list';
      await renderPropertiesList();

      if (mapInstance) {
        mapInstance.destroy();
        mapInstance = null;
      }

    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  await renderPropertiesList();

  return {
    cleanup() {
      if (mapInstance) {
        mapInstance.destroy();
        mapInstance = null;
      }
      container.innerHTML = '';
    }
  };
}