export async function loadModule(container, { chatId, userData }) {

  const moduleState = {
    currentMenu: null,
    menus: [],
    dishes: [],
    userRatings: {},
    isManager: chatId === '461583746'
  };

  container.innerHTML = `
    <div class="dish-module">
      <div class="dish-module-header">
        <div id="current-menu-badge" class="current-menu-badge">Загрузка...</div>
      </div>

      <div class="dish-module-content">
        <div id="results-tab" class="tab-content active">
          <div id="results-content"></div>
        </div>

        <div id="evaluate-tab" class="tab-content">
          <div id="evaluate-list"></div>
        </div>

        <div id="menu-tab" class="tab-content">
          <div id="menu-management"></div>
        </div>
      </div>

      <div class="dish-tabs">
        <button class="dish-tab-btn active" data-tab="results">
          <span>📊</span>
          <span>Итог</span>
        </button>
        <button class="dish-tab-btn" data-tab="evaluate">
          <span>⭐</span>
          <span>Оценить</span>
        </button>
        ${moduleState.isManager ? `
          <button class="dish-tab-btn" data-tab="menu">
            <span>⚙️</span>
            <span>Меню</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;

  const elements = {
    module: container.querySelector('.dish-module'),
    resultsTab: document.getElementById('results-tab'),
    evaluateTab: document.getElementById('evaluate-tab'),
    menuTab: document.getElementById('menu-tab'),
    resultsContent: document.getElementById('results-content'),
    evaluateList: document.getElementById('evaluate-list'),
    menuManagement: document.getElementById('menu-management'),
    currentMenuBadge: document.getElementById('current-menu-badge'),
    tabButtons: document.querySelectorAll('.dish-tab-btn')
  };

  function showStatus(message, type = 'success') {
    const statusEl = document.createElement('div');
    statusEl.className = `status-message status-${type}`;
    statusEl.textContent = message;
    document.body.appendChild(statusEl);
    
    setTimeout(() => {
      statusEl.remove();
    }, 3000);
  }

  function switchTab(tabName) {
    elements.resultsTab.classList.remove('active');
    elements.evaluateTab.classList.remove('active');
    elements.menuTab.classList.remove('active');
    
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'results') {
      elements.resultsTab.classList.add('active');
      elements.tabButtons[0].classList.add('active');
      loadResults();
    } else if (tabName === 'evaluate') {
      elements.evaluateTab.classList.add('active');
      elements.tabButtons[1].classList.add('active');
      loadEvaluation();
    } else if (tabName === 'menu' && moduleState.isManager) {
      elements.menuTab.classList.add('active');
      elements.tabButtons[2].classList.add('active');
      loadMenuManagement();
    }
  }

  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      if (tabName === 'menu' && !moduleState.isManager) return;
      switchTab(tabName);
    });
  });

  async function loadCurrentMenu() {
    try {
      const response = await fetch('/api/get-current-tasting-menu');
      const { success, menu, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.currentMenu = menu;
      
      if (menu) {
        elements.currentMenuBadge.textContent = `Текущее меню: ${menu.menu_name}`;
        await loadDishesForMenu(menu.id);
      } else {
        elements.currentMenuBadge.textContent = 'Нет активного меню';
      }
    } catch (err) {
      console.error('Error loading current menu:', err);
      elements.currentMenuBadge.textContent = 'Ошибка загрузки';
    }
  }

  async function loadDishesForMenu(menuId) {
    try {
      const response = await fetch(`/api/get-tasting-dishes?menuId=${menuId}`);
      const { success, dishes, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.dishes = dishes || [];
      await loadUserRatings();
    } catch (err) {
      console.error('Error loading dishes:', err);
      showStatus('Ошибка загрузки блюд', 'error');
    }
  }

  async function loadUserRatings() {
    try {
      const response = await fetch(`/api/get-user-ratings?userId=${chatId}`);
      const { success, ratings, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.userRatings = {};
      (ratings || []).forEach(rating => {
        moduleState.userRatings[rating.dish_name] = rating;
      });
    } catch (err) {
      console.error('Error loading user ratings:', err);
    }
  }

  async function loadResults() {
    if (!moduleState.currentMenu) {
      elements.resultsContent.innerHTML = '<div class="no-data-message">Нет активного меню для дегустации</div>';
      return;
    }

    if (moduleState.dishes.length === 0) {
      elements.resultsContent.innerHTML = '<div class="loading-message">Загрузка результатов...</div>';
      await loadDishesForMenu(moduleState.currentMenu.id);
    }

    try {
      const response = await fetch(`/api/get-average-ratings?menuId=${moduleState.currentMenu.id}`);
      const { success, averages, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      renderResults(averages || []);
    } catch (err) {
      console.error('Error loading average ratings:', err);
      elements.resultsContent.innerHTML = '<div class="no-data-message">Ошибка загрузки результатов</div>';
    }
  }

  function renderResults(averages) {
    if (moduleState.dishes.length === 0) {
      elements.resultsContent.innerHTML = '<div class="no-data-message">Нет блюд в текущем меню</div>';
      return;
    }

    const totalRatings = averages.reduce((sum, avg) => sum + (avg.user_count || 0), 0);
    const ratedDishes = averages.filter(avg => avg.user_count > 0).length;
    
    const summaryHtml = `
      <div class="results-summary">
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-label">Блюд оценено</span>
            <span class="stat-value">${ratedDishes}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">Всего оценок</span>
            <span class="stat-value">${totalRatings}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">Всего блюд</span>
            <span class="stat-value">${moduleState.dishes.length}</span>
          </div>
        </div>
      </div>
    `;

    const tableRows = averages.map(avg => {
      const dish = moduleState.dishes.find(d => d.dish_name === avg.dish_name);
      if (!dish) return '';
      
      const hasComments = avg.comment_count > 0;
      const hasRatings = avg.user_count > 0;
      
      return `
        <tr>
          <td class="dish-name-cell">
            <div class="dish-name" style="cursor: pointer;" data-dish-name="${avg.dish_name.replace(/"/g, '&quot;')}">
              ${avg.dish_name}
            </div>
            ${hasRatings ? 
              `<div class="ratings-count">${avg.user_count} оценок</div>` : 
              `<div class="ratings-count">Нет оценок</div>`
            }
          </td>
          <td class="rating-cell">${avg.presentation}</td>
          <td class="rating-cell">${avg.taste}</td>
          <td class="rating-cell">${avg.necessity}</td>
          <td class="rating-cell">${avg.price}</td>
          <td class="total-cell">
            ${avg.total}
            ${hasComments ? 
              `<div>
                <span class="comments-badge" data-dish-name="${avg.dish_name.replace(/"/g, '&quot;')}">
                  💬 ${avg.comment_count}
                </span>
              </div>` : ''
            }
          </td>
        </tr>
      `;
    }).join('');

    const tableHtml = `
      <div class="results-table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th>Блюдо</th>
              <th class="icon-header">
                През.
                <div class="icon-tooltip">Внешний вид</div>
              </th>
              <th class="icon-header">
                Вкус
                <div class="icon-tooltip">Вкусовые качества</div>
              </th>
              <th class="icon-header">
                Необх.
                <div class="icon-tooltip">Нужно ли в меню</div>
              </th>
              <th class="icon-header">
                Цена
                <div class="icon-tooltip">Соотношение цена/качество</div>
              </th>
              <th>Итог</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    elements.resultsContent.innerHTML = summaryHtml + tableHtml;

    elements.resultsContent.querySelectorAll('.dish-name').forEach(el => {
      el.addEventListener('click', () => {
        const dishName = el.dataset.dishName.replace(/&quot;/g, '"');
        showDishDetails(dishName);
      });
    });

    elements.resultsContent.querySelectorAll('.comments-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const dishName = badge.dataset.dishName.replace(/&quot;/g, '"');
        showDishDetails(dishName);
      });
    });
  }

  async function showDishDetails(dishName) {
    try {
      const response = await fetch(`/api/get-dish-comments?menuId=${moduleState.currentMenu.id}&dishName=${encodeURIComponent(dishName)}`);
      const { success, comments, error } = await response.json();
      
      if (!success) throw new Error(error);

      const modal = document.createElement('div');
      modal.className = 'dish-details-modal';

      const commentsList = comments.map(c => `
        <div style="margin-bottom: 16px; padding: 12px; background: var(--dt-surface2); border-radius: var(--dt-radius-sm);">
          <div style="color: var(--dt-text); margin-bottom: 8px; word-break: break-word;">${c.comments}</div>
          <div style="color: var(--dt-text-muted); font-size: 11px;">
            П:${c.presentation} В:${c.taste} Н:${c.necessity} Ц:${c.price}
          </div>
        </div>
      `).join('') || '<div style="color: var(--dt-text-muted); padding: 20px; text-align: center;">Нет комментариев</div>';

      modal.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin:0; color: var(--dt-text); font-size: 16px; word-break: break-word;">${dishName}</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div style="max-height: 60vh; overflow-y: auto; -webkit-overflow-scrolling: touch;">
            ${commentsList}
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

    } catch (err) {
      console.error('Error loading comments:', err);
      showStatus('Ошибка загрузки комментариев', 'error');
    }
  }

  async function loadEvaluation() {
    if (!moduleState.currentMenu) {
      elements.evaluateList.innerHTML = '<div class="no-data-message">Нет активного меню для оценки</div>';
      return;
    }

    if (moduleState.dishes.length === 0) {
      elements.evaluateList.innerHTML = '<div class="loading-message">Загрузка блюд...</div>';
      await loadDishesForMenu(moduleState.currentMenu.id);
    }

    renderEvaluation();
  }

  function renderEvaluation() {
    if (moduleState.dishes.length === 0) {
      elements.evaluateList.innerHTML = '<div class="no-data-message">Нет блюд для оценки</div>';
      return;
    }

    const dishesHtml = moduleState.dishes.map(dish => {
      const userRating = moduleState.userRatings[dish.dish_name];
      const hasRating = !!userRating;
      const isCollapsed = hasRating;
      
      const presentation = userRating?.presentation ? parseInt(userRating.presentation, 10) : 5;
      const taste = userRating?.taste ? parseInt(userRating.taste, 10) : 5;
      const necessity = userRating?.necessity ? parseInt(userRating.necessity, 10) : 5;
      const price = userRating?.price ? parseInt(userRating.price, 10) : 5;
      
      return `
        <div class="evaluation-dish ${isCollapsed ? 'dish-collapsed' : ''}" data-dish="${dish.dish_name}">
          <div class="dish-header">
            <h3>${dish.dish_name}</h3>
            <div class="dish-header-icons">
              ${hasRating ? '<div class="user-rating-indicator">✓</div>' : ''}
              <svg class="collapse-arrow" viewBox="0 0 24 24">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </div>
          </div>
          <div class="dish-content">
            <div class="rating-slider-container">
              <div class="slider-header">
                <span class="slider-icon">🍽️</span>
                <span>Презентация</span>
                <span class="slider-value" data-dish="${dish.dish_name}" data-category="presentation">${presentation}</span>
              </div>
              <input type="range" min="1" max="10" value="${presentation}" 
                     class="rating-slider" data-category="presentation" data-dish="${dish.dish_name}">
            </div>
            
            <div class="rating-slider-container">
              <div class="slider-header">
                <span class="slider-icon">👅</span>
                <span>Вкус</span>
                <span class="slider-value" data-dish="${dish.dish_name}" data-category="taste">${taste}</span>
              </div>
              <input type="range" min="1" max="10" value="${taste}" 
                     class="rating-slider" data-category="taste" data-dish="${dish.dish_name}">
            </div>
            
            <div class="rating-slider-container">
              <div class="slider-header">
                <span class="slider-icon">⭐</span>
                <span>Необходимость</span>
                <span class="slider-value" data-dish="${dish.dish_name}" data-category="necessity">${necessity}</span>
              </div>
              <input type="range" min="1" max="10" value="${necessity}" 
                     class="rating-slider" data-category="necessity" data-dish="${dish.dish_name}">
            </div>
            
            <div class="rating-slider-container">
              <div class="slider-header">
                <span class="slider-icon">💰</span>
                <span>Цена</span>
                <span class="slider-value" data-dish="${dish.dish_name}" data-category="price">${price}</span>
              </div>
              <input type="range" min="1" max="10" value="${price}" 
                     class="rating-slider" data-category="price" data-dish="${dish.dish_name}">
            </div>
            
            <div class="comments-section">
              <textarea class="comments-textarea" 
                        placeholder="Комментарии (необязательно)" 
                        data-dish="${dish.dish_name}">${userRating?.comments || ''}</textarea>
            </div>
            
            <button class="save-rating-btn" data-dish="${dish.dish_name}">
              ${hasRating ? 'Обновить' : 'Сохранить'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    elements.evaluateList.innerHTML = dishesHtml;

    document.querySelectorAll('.dish-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const dishCard = e.target.closest('.evaluation-dish');
        dishCard.classList.toggle('dish-collapsed');
      });
    });

    document.querySelectorAll('.rating-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const category = e.target.dataset.category;
        const dish = e.target.dataset.dish;
        const value = parseInt(e.target.value, 10);
        
        const valueSpan = document.querySelector(`.slider-value[data-dish="${dish}"][data-category="${category}"]`);
        if (valueSpan) {
          valueSpan.textContent = value;
        }
      });
    });

    document.querySelectorAll('.save-rating-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const dishName = e.target.dataset.dish;
        await saveRating(dishName);
      });
    });
  }

  async function saveRating(dishName) {
    const dishCard = document.querySelector(`.evaluation-dish[data-dish="${dishName}"]`);
    if (!dishCard) return;

    const presentationInput = dishCard.querySelector('.rating-slider[data-category="presentation"]');
    const tasteInput = dishCard.querySelector('.rating-slider[data-category="taste"]');
    const necessityInput = dishCard.querySelector('.rating-slider[data-category="necessity"]');
    const priceInput = dishCard.querySelector('.rating-slider[data-category="price"]');

    const presentation = parseInt(presentationInput.value, 10);
    const taste = parseInt(tasteInput.value, 10);
    const necessity = parseInt(necessityInput.value, 10);
    const price = parseInt(priceInput.value, 10);
    const comments = dishCard.querySelector('.comments-textarea').value;

    const validateRating = (rating) => {
      return !isNaN(rating) && rating >= 1 && rating <= 10;
    };

    if (!validateRating(presentation) || !validateRating(taste) || 
        !validateRating(necessity) || !validateRating(price)) {
      showStatus('Оценки должны быть числами от 1 до 10', 'error');
      return;
    }

    const saveBtn = dishCard.querySelector('.save-rating-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';

    try {
      const response = await fetch('/api/save-tasting-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: chatId,
          dishName,
          tastingMenu: moduleState.currentMenu.menu_name,
          presentation,
          taste,
          necessity,
          price,
          comments
        })
      });

      const { success, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.userRatings[dishName] = {
        dish_name: dishName,
        presentation,
        taste,
        necessity,
        price,
        comments
      };

      const ratingIndicator = dishCard.querySelector('.user-rating-indicator');
      if (ratingIndicator) {
        ratingIndicator.textContent = '✓';
      } else {
        const headerIcons = dishCard.querySelector('.dish-header-icons');
        const arrow = dishCard.querySelector('.collapse-arrow');
        headerIcons.insertBefore(document.createElement('div'), arrow);
        const newIndicator = headerIcons.firstChild;
        newIndicator.className = 'user-rating-indicator';
        newIndicator.textContent = '✓';
      }
      
      dishCard.classList.add('dish-collapsed');
      
      saveBtn.textContent = '✓';
      setTimeout(() => {
        saveBtn.textContent = 'Обновить';
        saveBtn.disabled = false;
      }, 2000);

      showStatus('Оценка сохранена');
      
      if (elements.resultsTab.classList.contains('active')) {
        await loadResults();
      }
      
    } catch (err) {
      console.error('Error saving rating:', err);
      saveBtn.textContent = 'Ошибка';
      saveBtn.disabled = false;
      showStatus('Ошибка сохранения: ' + err.message, 'error');
    }
  }

  async function loadMenuManagement() {
    if (!moduleState.isManager) return;

    try {
      const response = await fetch('/api/get-all-tasting-menus');
      const { success, menus, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.menus = menus || [];
      renderMenuManagement();
    } catch (err) {
      console.error('Error loading menus:', err);
      elements.menuManagement.innerHTML = '<div class="no-data-message">Ошибка загрузки меню</div>';
    }
  }

  function renderMenuManagement() {
    const currentMenuId = moduleState.currentMenu?.id;
    
    const menusHtml = moduleState.menus.map(menu => `
      <div class="menu-item ${menu.id === currentMenuId ? 'active' : ''}">
        <div class="menu-info">
          <div class="menu-name">${menu.menu_name}</div>
          <div class="menu-dish-count">${menu.dish_count || 0} блюд</div>
        </div>
        <div class="menu-actions">
          ${menu.id !== currentMenuId ? `
            <button class="menu-btn set-current-btn" data-menu-id="${menu.id}">
              Текущим
            </button>
          ` : ''}
          <button class="menu-btn edit-menu-btn" data-menu-id="${menu.id}">
            Править
          </button>
          <button class="menu-btn delete-menu-btn" data-menu-id="${menu.id}">
            Удалить
          </button>
        </div>
      </div>
    `).join('');

    elements.menuManagement.innerHTML = `
      <div class="menu-management-container">
        <div class="create-menu-section">
          <h3>Создать меню</h3>
          <div class="menu-form">
            <input type="text" id="new-menu-name" class="menu-input" placeholder="Название меню">
            <button id="create-menu-btn" class="add-dish-btn">Создать</button>
          </div>
        </div>
        
        <div class="current-menus-list">
          <h4>Меню</h4>
          ${menusHtml}
        </div>
        
        <div id="dishes-management-section" style="display: none;"></div>
      </div>
    `;

    document.getElementById('create-menu-btn')?.addEventListener('click', createNewMenu);
    document.querySelectorAll('.set-current-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const menuId = e.target.dataset.menuId;
        setCurrentMenu(menuId);
      });
    });
    document.querySelectorAll('.edit-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const menuId = e.target.dataset.menuId;
        editMenu(menuId);
      });
    });
    document.querySelectorAll('.delete-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const menuId = e.target.dataset.menuId;
        deleteMenu(menuId);
      });
    });
  }

  async function createNewMenu() {
    const menuNameInput = document.getElementById('new-menu-name');
    const menuName = menuNameInput.value.trim();
    
    if (!menuName) {
      showStatus('Введите название меню', 'error');
      return;
    }

    try {
      const response = await fetch('/api/create-tasting-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName })
      });

      const { success, menu, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.menus.push(menu);
      menuNameInput.value = '';
      showStatus('Меню создано');
      renderMenuManagement();
      
    } catch (err) {
      console.error('Error creating menu:', err);
      showStatus('Ошибка создания меню', 'error');
    }
  }

  async function setCurrentMenu(menuId) {
    try {
      const response = await fetch('/api/set-current-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId })
      });

      const { success, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      const menu = moduleState.menus.find(m => m.id === parseInt(menuId));
      if (menu) {
        moduleState.currentMenu = menu;
        elements.currentMenuBadge.textContent = `Текущее меню: ${menu.menu_name}`;
      }
      
      await loadDishesForMenu(menuId);
      if (elements.resultsTab.classList.contains('active')) {
        await loadResults();
      }
      if (elements.evaluateTab.classList.contains('active')) {
        await loadEvaluation();
      }
      
      showStatus('Текущее меню обновлено');
      renderMenuManagement();
      
    } catch (err) {
      console.error('Error setting current menu:', err);
      showStatus('Ошибка обновления меню', 'error');
    }
  }

  async function editMenu(menuId) {
    const menu = moduleState.menus.find(m => m.id === parseInt(menuId));
    if (!menu) return;

    try {
      const response = await fetch(`/api/get-tasting-dishes?menuId=${menuId}`);
      const { success, dishes, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      renderDishesManagement(menu, dishes || []);
      
    } catch (err) {
      console.error('Error loading dishes for edit:', err);
      showStatus('Ошибка загрузки блюд', 'error');
    }
  }

  function renderDishesManagement(menu, dishes) {
    const dishesHtml = dishes.map(dish => `
      <div class="dish-item">
        <div class="dish-details">
          <div class="dish-name">${dish.dish_name}</div>
        </div>
        <div class="dish-actions">
          <button class="icon-btn delete-dish-btn" data-dish-id="${dish.id}" data-dish-name="${dish.dish_name}">
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    const dishesSection = document.getElementById('dishes-management-section');
    dishesSection.style.display = 'block';
    dishesSection.innerHTML = `
      <div class="dishes-management">
        <h3>Блюда: ${menu.menu_name}</h3>
        
        <div class="add-dish-form">
          <input type="text" id="new-dish-name" class="dish-input" placeholder="Название блюда">
          <button id="add-dish-btn" class="submit-dish-btn">Добавить</button>
        </div>
        
        <div class="dishes-list">
          <h4>Список блюд</h4>
          ${dishesHtml || '<div class="no-data-message">Нет блюд</div>'}
        </div>
      </div>
    `;

    dishesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.getElementById('add-dish-btn').addEventListener('click', () => addDishToMenu(menu.id));
    document.querySelectorAll('.delete-dish-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dishId = e.target.closest('.delete-dish-btn').dataset.dishId;
        const dishName = e.target.closest('.delete-dish-btn').dataset.dishName;
        deleteDish(dishId, dishName);
      });
    });
  }

  async function addDishToMenu(menuId) {
    const nameInput = document.getElementById('new-dish-name');
    const dishName = nameInput.value.trim();

    if (!dishName) {
      showStatus('Введите название блюда', 'error');
      return;
    }

    try {
      const response = await fetch('/api/add-tasting-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId,
          dishName
        })
      });

      const { success, dish, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      nameInput.value = '';
      showStatus('Блюдо добавлено');
      
      const menu = moduleState.menus.find(m => m.id === parseInt(menuId));
      if (menu) {
        await editMenu(menuId);
      }
      
    } catch (err) {
      console.error('Error adding dish:', err);
      showStatus('Ошибка добавления блюда', 'error');
    }
  }

  async function deleteDish(dishId, dishName) {
    if (!confirm(`Удалить блюдо "${dishName}"?`)) return;

    try {
      const response = await fetch('/api/delete-tasting-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId })
      });

      const { success, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      showStatus('Блюдо удалено');
      
      const currentMenu = moduleState.currentMenu;
      if (currentMenu) {
        await editMenu(currentMenu.id);
      }
      
    } catch (err) {
      console.error('Error deleting dish:', err);
      showStatus('Ошибка удаления блюда', 'error');
    }
  }

  async function deleteMenu(menuId) {
    if (!confirm('Удалить это меню и все связанные блюда?')) return;

    try {
      const response = await fetch('/api/delete-tasting-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId })
      });

      const { success, error } = await response.json();
      
      if (!success) throw new Error(error);
      
      moduleState.menus = moduleState.menus.filter(m => m.id !== parseInt(menuId));
      
      if (moduleState.currentMenu?.id === parseInt(menuId)) {
        moduleState.currentMenu = null;
        elements.currentMenuBadge.textContent = 'Нет активного меню';
        moduleState.dishes = [];
      }
      
      showStatus('Меню удалено');
      renderMenuManagement();
      
    } catch (err) {
      console.error('Error deleting menu:', err);
      showStatus('Ошибка удаления меню', 'error');
    }
  }

  await loadCurrentMenu();
  await loadResults();

  return {
    cleanup: () => {
      if (styleEl && styleEl.parentNode) {
        document.head.removeChild(styleEl);
      }
    }
  };
}