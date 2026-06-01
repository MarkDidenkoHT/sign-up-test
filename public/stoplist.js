export async function loadModule(container, {}) {

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  container.innerHTML = `
    <div class="stoplist-wrapper">
      <div class="stoplist-error" id="stoplist-error"></div>
      
      <div class="stoplist-filter-section">
        <div class="stoplist-filter-row">
          <div class="stoplist-filter-group">
            <label>Диапазон дат</label>
            <div class="stoplist-date-range">
              <input type="date" class="stoplist-date-input" id="stoplist-start-date" value="${thirtyDaysAgo.toISOString().split('T')[0]}">
              <span class="stoplist-date-separator">—</span>
              <input type="date" class="stoplist-date-input" id="stoplist-end-date" value="${today.toISOString().split('T')[0]}">
            </div>
          </div>
          <button class="stoplist-apply-btn" id="stoplist-apply-filters">
            Применить
          </button>
        </div>
      </div>
      
      <div class="stoplist-stats-cards" id="stoplist-stats-cards"></div>
      
      <h2 class="stoplist-section-title">Рестораны</h2>
      <div class="stoplist-restaurant-grid" id="stoplist-restaurant-grid"></div>
      
      <h2 class="stoplist-section-title">Сводка по типам</h2>
      <div class="stoplist-summary-grid" id="stoplist-summary-grid">
        <div class="stoplist-summary-card active" data-type="kitchen-play">
          <h3>
            <span class="stoplist-stat-dot play"></span>
            Кухня Play
          </h3>
          <div class="stoplist-summary-value" id="stoplist-kitchen-play">0</div>
        </div>
        <div class="stoplist-summary-card active" data-type="kitchen-stop">
          <h3>
            <span class="stoplist-stat-dot stop"></span>
            Кухня Stop
          </h3>
          <div class="stoplist-summary-value" id="stoplist-kitchen-stop">0</div>
        </div>
        <div class="stoplist-summary-card active" data-type="kitchen-limit">
          <h3>
            <span class="stoplist-stat-dot limit"></span>
            Кухня Limit
          </h3>
          <div class="stoplist-summary-value" id="stoplist-kitchen-limit">0</div>
        </div>
        <div class="stoplist-summary-card active" data-type="bar-play">
          <h3>
            <span class="stoplist-stat-dot play"></span>
            Бар Play
          </h3>
          <div class="stoplist-summary-value" id="stoplist-bar-play">0</div>
        </div>
        <div class="stoplist-summary-card active" data-type="bar-stop">
          <h3>
            <span class="stoplist-stat-dot stop"></span>
            Бар Stop
          </h3>
          <div class="stoplist-summary-value" id="stoplist-bar-stop">0</div>
        </div>
        <div class="stoplist-summary-card active" data-type="bar-limit">
          <h3>
            <span class="stoplist-stat-dot limit"></span>
            Бар Limit
          </h3>
          <div class="stoplist-summary-value" id="stoplist-bar-limit">0</div>
        </div>
      </div>
      
      <h2 class="stoplist-section-title">Детали по блюдам</h2>
      <div class="stoplist-table-container">
        <table class="stoplist-table">
          <thead>
            <tr>
              <th>Блюдо</th>
              <th>Ресторан</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Кол-во</th>
              <th>Комментарии</th>
            </tr>
          </thead>
          <tbody id="stoplist-table-body"></tbody>
        </table>
      </div>
      
      <div class="stoplist-loading" id="stoplist-loading" style="display: none;">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  const elements = {
    startDate: document.getElementById("stoplist-start-date"),
    endDate: document.getElementById("stoplist-end-date"),
    applyFilters: document.getElementById("stoplist-apply-filters"),
    error: document.getElementById("stoplist-error"),
    loading: document.getElementById("stoplist-loading"),
    restaurantGrid: document.getElementById("stoplist-restaurant-grid"),
    statsCards: document.getElementById("stoplist-stats-cards"),
    kitchenPlay: document.getElementById("stoplist-kitchen-play"),
    kitchenStop: document.getElementById("stoplist-kitchen-stop"),
    kitchenLimit: document.getElementById("stoplist-kitchen-limit"),
    barPlay: document.getElementById("stoplist-bar-play"),
    barStop: document.getElementById("stoplist-bar-stop"),
    barLimit: document.getElementById("stoplist-bar-limit"),
    tableBody: document.getElementById("stoplist-table-body"),
    summaryCards: document.querySelectorAll(".stoplist-summary-card")
  };

  const moduleState = {
    allData: [],
    filteredData: [],
    restaurants: [],
    activeRestaurants: new Set(),
    activeTypes: new Set(['kitchen-play', 'kitchen-stop', 'kitchen-limit', 'bar-play', 'bar-stop', 'bar-limit']),
    charts: {},
    typeToFilter: {
      'kitchen-play': { type: 'kitchen', status: 'play' },
      'kitchen-stop': { type: 'kitchen', status: 'stop' },
      'kitchen-limit': { type: 'kitchen', status: 'limit' },
      'bar-play': { type: 'bar', status: 'play' },
      'bar-stop': { type: 'bar', status: 'stop' },
      'bar-limit': { type: 'bar', status: 'limit' }
    }
  };

  async function init() {
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.2/echarts.min.js");
      
      elements.applyFilters.addEventListener("click", applyFilters);
      
      elements.summaryCards.forEach(card => {
        card.addEventListener("click", () => toggleType(card));
      });
      
      await loadData();
      applyFilters();
      
    } catch (error) {
      showError(`Ошибка инициализации: ${error.message}`);
    }
  }

  async function loadData() {
    showLoading(true);
    hideError();

    try {
      const response = await fetch('/api/stop-list');
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка загрузки данных');
      }

      moduleState.allData = result.data;
      moduleState.filteredData = [...result.data];
      
      moduleState.restaurants = [...new Set(result.data.map(item => item.restaurant).filter(Boolean))];
      moduleState.activeRestaurants = new Set(moduleState.restaurants);
      
      renderRestaurantGrid();
      
    } catch (error) {
      showError(`Ошибка загрузки данных: ${error.message}`);
    } finally {
      showLoading(false);
    }
  }

  function renderRestaurantGrid() {
    elements.restaurantGrid.innerHTML = '';
    
    moduleState.restaurants.forEach(restaurant => {
      const card = document.createElement('div');
      card.className = `stoplist-restaurant-card active`;
      card.dataset.restaurant = restaurant;
      
      card.innerHTML = `
        <div class="stoplist-restaurant-header">
          <h4>${restaurant}</h4>
          <span class="stoplist-restaurant-status"></span>
        </div>
        <div class="stoplist-chart-container" data-chart="${restaurant}"></div>
      `;
      
      elements.restaurantGrid.appendChild(card);
      
      card.addEventListener('click', () => toggleRestaurant(restaurant));
    });
  }

  function toggleRestaurant(restaurant) {
    const card = document.querySelector(`[data-restaurant="${restaurant}"]`);
    
    if (moduleState.activeRestaurants.has(restaurant)) {
      moduleState.activeRestaurants.delete(restaurant);
      card.classList.remove('active');
      card.classList.add('inactive');
    } else {
      moduleState.activeRestaurants.add(restaurant);
      card.classList.remove('inactive');
      card.classList.add('active');
    }
    
    updateAll();
  }

  function toggleType(card) {
    const type = card.dataset.type;
    
    if (moduleState.activeTypes.size === 1 && moduleState.activeTypes.has(type)) {
      return;
    }
    
    card.classList.toggle('active');
    card.classList.toggle('inactive');
    
    if (card.classList.contains('active')) {
      moduleState.activeTypes.add(type);
    } else {
      moduleState.activeTypes.delete(type);
    }
    
    updateAll();
  }

  function applyFilters() {
    const startDate = elements.startDate.valueAsDate;
    const endDate = elements.endDate.valueAsDate;
    
    moduleState.filteredData = moduleState.allData.filter(entry => {
      const entryDate = new Date(entry.created_at);
      return (!startDate || entryDate >= startDate) &&
             (!endDate || entryDate <= new Date(endDate.getTime() + 86400000));
    });
    
    updateAll();
  }

  function updateAll() {
    updateCharts();
    updateSummary();
    updateTable();
  }

  function updateCharts() {
    if (typeof echarts === 'undefined') return;
    
    moduleState.restaurants.forEach(restaurant => {
      const container = document.querySelector(`[data-chart="${restaurant}"]`);
      if (!container) return;
      
      let chart = moduleState.charts[restaurant];
      if (!chart) {
        chart = echarts.init(container);
        moduleState.charts[restaurant] = chart;
      }
      
      const restaurantData = moduleState.filteredData.filter(item => 
        item.restaurant === restaurant &&
        Array.from(moduleState.activeTypes).some(type => {
          const filter = moduleState.typeToFilter[type];
          return item.type === filter.type && item.status === filter.status;
        })
      );
      
      const counts = {
        kitchenPlay: restaurantData.filter(i => i.type === 'kitchen' && i.status === 'play').length,
        kitchenStop: restaurantData.filter(i => i.type === 'kitchen' && i.status === 'stop').length,
        kitchenLimit: restaurantData.filter(i => i.type === 'kitchen' && i.status === 'limit').length,
        barPlay: restaurantData.filter(i => i.type === 'bar' && i.status === 'play').length,
        barStop: restaurantData.filter(i => i.type === 'bar' && i.status === 'stop').length,
        barLimit: restaurantData.filter(i => i.type === 'bar' && i.status === 'limit').length
      };
      
      chart.setOption({
        grid: { left: '5%', right: '5%', top: 20, bottom: 15, containLabel: true },
        xAxis: { 
          type: 'category', 
          data: ['', '', '', '', '', ''],
          axisLabel: { show: false },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          min: 0,
          splitLine: { lineStyle: { color: 'rgba(42,48,72,0.5)' } },
          axisLabel: { color: 'var(--stoplist-text-muted)', fontSize: 10 }
        },
        series: [{
          type: 'bar',
          data: [
            { value: counts.kitchenPlay, itemStyle: { color: '#22c55e' } },
            { value: counts.kitchenStop, itemStyle: { color: '#ef4444' } },
            { value: counts.kitchenLimit, itemStyle: { color: '#eab308' } },
            { value: counts.barPlay, itemStyle: { color: '#3b82f6' } },
            { value: counts.barStop, itemStyle: { color: '#f97316' } },
            { value: counts.barLimit, itemStyle: { color: '#a78bfa' } }
          ],
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            color: 'var(--stoplist-text)',
            fontWeight: 600,
            fontSize: 10,
            formatter: (params) => params.value > 0 ? params.value : ''
          }
        }],
        tooltip: { trigger: 'item' }
      }, true);
      
      chart.resize();
    });
  }

  function updateSummary() {
    const activeData = moduleState.filteredData.filter(item => 
      moduleState.activeRestaurants.has(item.restaurant)
    );
    
    elements.kitchenPlay.textContent = activeData.filter(i => i.type === 'kitchen' && i.status === 'play').length;
    elements.kitchenStop.textContent = activeData.filter(i => i.type === 'kitchen' && i.status === 'stop').length;
    elements.kitchenLimit.textContent = activeData.filter(i => i.type === 'kitchen' && i.status === 'limit').length;
    elements.barPlay.textContent = activeData.filter(i => i.type === 'bar' && i.status === 'play').length;
    elements.barStop.textContent = activeData.filter(i => i.type === 'bar' && i.status === 'stop').length;
    elements.barLimit.textContent = activeData.filter(i => i.type === 'bar' && i.status === 'limit').length;
  }

  function updateTable() {
    const activeData = moduleState.filteredData.filter(item => 
      moduleState.activeRestaurants.has(item.restaurant) &&
      Array.from(moduleState.activeTypes).some(type => {
        const filter = moduleState.typeToFilter[type];
        return item.type === filter.type && item.status === filter.status;
      })
    );
    
    const groupedData = {};
    
    activeData.forEach(item => {
      const key = `${item.item}-${item.restaurant}-${item.status}`;
      
      if (!groupedData[key]) {
        groupedData[key] = {
          item: item.item,
          restaurant: item.restaurant,
          type: item.type,
          status: item.status,
          count: 0,
          comments: new Map()
        };
      }
      
      groupedData[key].count++;
      
      if (item.comment && item.comment.trim()) {
        const comment = item.comment.trim();
        groupedData[key].comments.set(comment, (groupedData[key].comments.get(comment) || 0) + 1);
      }
    });
    
    const sortedData = Object.values(groupedData).sort((a, b) => b.count - a.count);
    
    elements.tableBody.innerHTML = sortedData.map(group => {
      const statusText = group.status === 'play' ? 'Доступно' : group.status === 'stop' ? 'Стоп' : 'Лимит';
      
      const commentsHtml = Array.from(group.comments.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([comment, count]) => `
          <div class="stoplist-comment-item">
            <span class="stoplist-comment-count">${count}</span>
            <span class="stoplist-comment-text">${comment}</span>
          </div>
        `).join('') || '<span class="stoplist-comment-text">—</span>';
      
      return `
        <tr>
          <td style="font-weight: 500;">${group.item}</td>
          <td>${group.restaurant}</td>
          <td>${group.type === 'kitchen' ? 'Кухня' : 'Бар'}</td>
          <td>
            <span class="stoplist-status-badge ${group.status}">${statusText}</span>
          </td>
          <td><strong>${group.count}</strong></td>
          <td class="stoplist-comments-cell">${commentsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.style.display = 'block';
  }

  function hideError() {
    elements.error.style.display = 'none';
  }

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  init();
}