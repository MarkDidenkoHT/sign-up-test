export async function loadModule(container) {

  const DOMAIN_MAP = {
    'hi-tech.md': 'hi-tech.md',
    'keramika.md': 'keramika.md',
    'job.hi-tech.md': 'job.md'
  };

  function getProjectFromUrl(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      const domain = urlObj.hostname;
      if (DOMAIN_MAP[domain]) return DOMAIN_MAP[domain];
      for (const [mapDomain, project] of Object.entries(DOMAIN_MAP)) {
        if (domain.includes(mapDomain) || mapDomain.includes(domain)) return project;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function setupUrlRowListeners(row) {
    const input = row.querySelector('.metrics-url-input');
    if (input) {
      input.addEventListener('blur', () => {
        const url = input.value.trim();
        if (url) {
          const project = getProjectFromUrl(url);
          if (!project) showError('URL не распознан. Проверьте, что это корректный URL для Работы, Хайтека или Керамы');
        }
      });
    }
  }

  const PROJECT_CONFIG = {
    projects: {
      'job.md': { name: 'Работа', counterId: '98081220' },
      'hi-tech.md': { name: 'Хайтек', counterId: '20751991' },
      'keramika.md': { name: 'Керама', counterId: '61813252' }
    }
  };

  container.innerHTML = `
    <div class="metrics-module-wrapper">
      <div class="metrics-module-main">
        <div class="metrics-config-panel">
          <h2>Параметры</h2>

          <div class="metrics-form-row">
            <div class="metrics-form-group">
              <label>Просмотр посещений</label>
              <select id="utm-source" class="metrics-select">
                <option value="">Выберите опцию</option>
                <option value="top-pages" data-special="true" data-project="top-pages">Топ посещений</option>
                <option value="custom-url" data-custom="true">Кастомная ссылка</option>
              </select>
            </div>

            <div class="metrics-date-row">
              <div class="metrics-form-group">
                <label>Начальная дата</label>
                <input type="date" id="start-date" class="metrics-input">
              </div>
              <div class="metrics-form-group">
                <label>Конечная дата</label>
                <input type="date" id="end-date" class="metrics-input">
              </div>
            </div>

            <button id="fetch-data" class="metrics-button">Загрузить</button>
          </div>

          <div id="custom-url-section" class="metrics-url-section" style="display: none;">
            <div class="metrics-filter-title">Кастомные URL</div>
            <div id="custom-url-fields" class="metrics-url-fields"></div>
            <button id="add-url-button" class="metrics-url-add-btn">+ Добавить URL</button>
          </div>

          <div id="top-pages-section" class="metrics-filter-section" style="display: none;">
            <div class="metrics-filter-title">Сайт</div>
            <div class="metrics-form-row">
              <div class="metrics-form-group" style="min-width: 200px;">
                <select id="top-pages-site-select" class="metrics-select">
                  <option value="job.md">Работа</option>
                  <option value="hi-tech.md">Хайтек</option>
                  <option value="keramika.md">Керама</option>
                </select>
              </div>
            </div>
          </div>

          <div id="view-toggle-section" class="metrics-filter-section" style="display: none;">
            <div class="metrics-filter-title">Режим отображения</div>
            <div class="metrics-filter-group">
              <div class="metrics-filter-item">
                <input type="radio" id="view-chart" name="view-mode" value="chart" checked>
                <label for="view-chart">Визиты по дням</label>
              </div>
              <div class="metrics-filter-item">
                <input type="radio" id="view-table" name="view-mode" value="table">
                <label for="view-table">Детальные данные</label>
              </div>
            </div>
          </div>
        </div>

        <div class="metrics-error" id="error-message"></div>

        <div class="metrics-dashboard" id="metrics-dashboard" style="display: none;">
          <div class="metrics-card" id="total-visits-card">
            <h3>Всего визитов</h3>
            <div class="value" id="total-visits">0</div>
          </div>
          <div class="metrics-card" id="unique-visitors-card">
            <h3>Посетители</h3>
            <div class="value" id="unique-visitors">0</div>
          </div>
          <div class="metrics-card" id="bounce-rate-card">
            <h3>Показатель отказов</h3>
            <div class="value" id="bounce-rate">0%</div>
          </div>
          <div class="metrics-card" id="avg-duration-card">
            <h3>Ср. время визита</h3>
            <div class="value" id="avg-duration">0:00</div>
          </div>
        </div>

        <div class="metrics-chart-container" id="visits-chart-container" style="display: none;">
          <h2>Визиты по дням</h2>
          <div id="visits-chart" class="metrics-chart"></div>
        </div>

        <div class="metrics-table-container" id="utm-data-container" style="display: none;">
          <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: var(--mm-text);">Детальные данные</h2>
          <table class="metrics-table" id="utm-data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Визиты</th>
                <th>Посетители</th>
                <th>Показатель отказов</th>
                <th>Ср. время (сек)</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="metrics-table-container" id="top-pages-container" style="display: none;">
          <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: var(--mm-text);">Топ посещений</h2>
          <table class="metrics-table" id="top-pages-table">
            <thead>
              <tr>
                <th>Заголовок страницы</th>
                <th>URL</th>
                <th>Просмотры</th>
                <th>Посетители</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="metrics-chart-container" id="top-pages-chart-container" style="display: none;">
          <h2 id="top-pages-chart-title">Визиты по дням</h2>
          <div id="top-pages-chart" class="metrics-chart"></div>
        </div>

        <div class="metrics-table-container" id="top-pages-detail-container" style="display: none;">
          <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: var(--mm-text);">Детальные данные страницы</h2>
          <table class="metrics-table" id="top-pages-detail-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Просмотры</th>
                <th>Посетители</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="metrics-table-container" id="custom-url-breakdown-container" style="display: none;">
          <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: var(--mm-text);">Визиты по URL</h2>
          <table class="metrics-table" id="custom-url-breakdown-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>URL</th>
                <th>Визиты</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <div class="metrics-module-sidebar">
        <h2 class="metrics-module-sidebar-title">Настройки</h2>
        <div id="metricsSettings" class="metrics-module-settings-container"></div>
      </div>
    </div>

    <div class="metrics-loading-modal" id="loading-modal" style="display: none;">
      <div class="metrics-loading-modal-inner">
        <span class="metrics-loader-spinner"></span>
        <span class="metrics-loading-modal-text">Загрузка данных...</span>
      </div>
    </div>
  `;

  const elements = {
    utmSource: document.getElementById("utm-source"),
    startDate: document.getElementById("start-date"),
    endDate: document.getElementById("end-date"),
    fetchDataBtn: document.getElementById("fetch-data"),
    errorMessage: document.getElementById("error-message"),
    loadingModal: document.getElementById("loading-modal"),
    totalVisits: document.getElementById("total-visits"),
    uniqueVisitors: document.getElementById("unique-visitors"),
    bounceRate: document.getElementById("bounce-rate"),
    avgDuration: document.getElementById("avg-duration"),
    totalVisitsCard: document.getElementById("total-visits-card"),
    uniqueVisitorsCard: document.getElementById("unique-visitors-card"),
    bounceRateCard: document.getElementById("bounce-rate-card"),
    avgDurationCard: document.getElementById("avg-duration-card"),
    visitsChart: document.getElementById("visits-chart"),
    utmDataTable: document.getElementById("utm-data-table"),
    customUrlSection: document.getElementById("custom-url-section"),
    customUrlFields: document.getElementById("custom-url-fields"),
    addUrlButton: document.getElementById("add-url-button"),
    topPagesSection: document.getElementById("top-pages-section"),
    topPagesSiteSelect: document.getElementById("top-pages-site-select"),
    topPagesTable: document.getElementById("top-pages-table"),
    metricsDashboard: document.getElementById("metrics-dashboard"),
    visitsChartContainer: document.getElementById("visits-chart-container"),
    topPagesContainer: document.getElementById("top-pages-container"),
    topPagesChartContainer: document.getElementById("top-pages-chart-container"),
    topPagesChartTitle: document.getElementById("top-pages-chart-title"),
    topPagesChart: document.getElementById("top-pages-chart"),
    topPagesDetailContainer: document.getElementById("top-pages-detail-container"),
    topPagesDetailTable: document.getElementById("top-pages-detail-table"),
    utmDataContainer: document.getElementById("utm-data-container"),
    customUrlBreakdownContainer: document.getElementById("custom-url-breakdown-container"),
    customUrlBreakdownTable: document.getElementById("custom-url-breakdown-table"),
    viewToggleSection: document.getElementById("view-toggle-section"),
    settingsContainer: document.getElementById("metricsSettings")
  };

  const moduleState = {
    visitsChart: null,
    topPagesChart: null,
    customUrlData: null,
    customUrlBreakdown: {},
    viewMode: 'chart',
    settings: {
      showTotalVisits: true,
      showUniqueVisitors: true,
      showBounceRate: true,
      showAvgDuration: true,
      expandedSettings: ['displayControls']
    }
  };

  function hideAllResults() {
    elements.metricsDashboard.style.display = 'none';
    elements.visitsChartContainer.style.display = 'none';
    elements.topPagesContainer.style.display = 'none';
    elements.topPagesChartContainer.style.display = 'none';
    elements.topPagesDetailContainer.style.display = 'none';
    elements.utmDataContainer.style.display = 'none';
    elements.customUrlBreakdownContainer.style.display = 'none';
    elements.viewToggleSection.style.display = 'none';
  }

  function loadUserSettings() {
    const saved = localStorage.getItem('metrics-module-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      moduleState.settings = { ...moduleState.settings, ...parsed };
    }
    renderSettings();
  }

  function saveUserSettings() {
    localStorage.setItem('metrics-module-settings', JSON.stringify(moduleState.settings));
  }

  function applySettings() {
    elements.totalVisitsCard.style.display = moduleState.settings.showTotalVisits ? 'block' : 'none';
    elements.uniqueVisitorsCard.style.display = moduleState.settings.showUniqueVisitors ? 'block' : 'none';
    elements.bounceRateCard.style.display = moduleState.settings.showBounceRate ? 'block' : 'none';
    elements.avgDurationCard.style.display = moduleState.settings.showAvgDuration ? 'block' : 'none';
    if (moduleState.visitsChart) moduleState.visitsChart.resize();
  }

  function renderSettings() {
    const settingsHtml = `
      <div class="metrics-module-settings-block">
        <div class="metrics-module-settings-header" data-setting="displayControls">
          <h3>Режимы отображения</h3>
          <svg class="metrics-module-expand-icon ${moduleState.settings.expandedSettings.includes('displayControls') ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="metrics-module-settings-content ${moduleState.settings.expandedSettings.includes('displayControls') ? 'expanded' : ''}">
          <div class="metrics-module-setting-item">
            <span class="metrics-module-setting-label">Показывать Всего визитов</span>
            <label class="metrics-module-toggle">
              <input type="checkbox" ${moduleState.settings.showTotalVisits ? 'checked' : ''} data-setting="showTotalVisits">
              <span class="metrics-module-slider"></span>
            </label>
          </div>
          <div class="metrics-module-setting-item">
            <span class="metrics-module-setting-label">Показывать Посетители</span>
            <label class="metrics-module-toggle">
              <input type="checkbox" ${moduleState.settings.showUniqueVisitors ? 'checked' : ''} data-setting="showUniqueVisitors">
              <span class="metrics-module-slider"></span>
            </label>
          </div>
          <div class="metrics-module-setting-item">
            <span class="metrics-module-setting-label">Показывать Показатель отказов</span>
            <label class="metrics-module-toggle">
              <input type="checkbox" ${moduleState.settings.showBounceRate ? 'checked' : ''} data-setting="showBounceRate">
              <span class="metrics-module-slider"></span>
            </label>
          </div>
          <div class="metrics-module-setting-item">
            <span class="metrics-module-setting-label">Показывать Ср. время визита</span>
            <label class="metrics-module-toggle">
              <input type="checkbox" ${moduleState.settings.showAvgDuration ? 'checked' : ''} data-setting="showAvgDuration">
              <span class="metrics-module-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;

    elements.settingsContainer.innerHTML = settingsHtml;

    elements.settingsContainer.querySelector('.metrics-module-settings-header').addEventListener('click', () => {
      const content = document.querySelector('.metrics-module-settings-content');
      const icon = document.querySelector('.metrics-module-expand-icon');
      content.classList.toggle('expanded');
      icon.classList.toggle('expanded');
      const index = moduleState.settings.expandedSettings.indexOf('displayControls');
      if (content.classList.contains('expanded')) {
        if (index === -1) moduleState.settings.expandedSettings.push('displayControls');
      } else {
        if (index > -1) moduleState.settings.expandedSettings.splice(index, 1);
      }
      saveUserSettings();
    });

    elements.settingsContainer.querySelectorAll('.metrics-module-toggle input').forEach(input => {
      input.addEventListener('change', (e) => {
        const settingId = e.target.dataset.setting;
        moduleState.settings[settingId] = e.target.checked;
        saveUserSettings();
        applySettings();
      });
    });
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

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function showLoading(show) {
    elements.loadingModal.style.display = show ? 'flex' : 'none';
  }

  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
  }

  function hideError() {
    elements.errorMessage.style.display = 'none';
  }

  function resetCounters() {
    elements.totalVisits.textContent = '0';
    elements.uniqueVisitors.textContent = '0';
    elements.bounceRate.textContent = '0%';
    elements.avgDuration.textContent = '0:00';
    elements.utmDataTable.getElementsByTagName('tbody')[0].innerHTML = '';
    elements.topPagesTable.getElementsByTagName('tbody')[0].innerHTML = '';
    if (moduleState.visitsChart) moduleState.visitsChart.clear();
    if (moduleState.topPagesChart) moduleState.topPagesChart.clear();
  }

  function getChartColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      text: style.getPropertyValue('--mm-text').trim(),
      border: style.getPropertyValue('--mm-border').trim()
    };
  }

  function updateVisitsChart(dates, visitsData, usersData) {
    const colors = getChartColors();
    const option = {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Визиты', 'Посетители'],
        textStyle: { color: colors.text }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: 45, color: colors.text },
        axisLine: { lineStyle: { color: colors.border } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.text },
        splitLine: { lineStyle: { color: colors.border } }
      },
      series: [
        {
          name: 'Визиты',
          type: 'line',
          data: visitsData,
          smooth: true,
          lineStyle: { width: 3, color: '#4285f4' },
          itemStyle: { color: '#4285f4' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(66,133,244,0.2)' }, { offset: 1, color: 'rgba(66,133,244,0)' }] } }
        },
        {
          name: 'Посетители',
          type: 'line',
          data: usersData,
          smooth: true,
          lineStyle: { width: 3, color: '#34a853' },
          itemStyle: { color: '#34a853' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(52,168,83,0.2)' }, { offset: 1, color: 'rgba(52,168,83,0)' }] } }
        }
      ]
    };
    moduleState.visitsChart.setOption(option);
  }

  function updateTopPagesChart(dates, viewsData, usersData, pageTitle) {
    const colors = getChartColors();
    const option = {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Просмотры', 'Посетители'],
        textStyle: { color: colors.text }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: 45, color: colors.text },
        axisLine: { lineStyle: { color: colors.border } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.text },
        splitLine: { lineStyle: { color: colors.border } }
      },
      series: [
        {
          name: 'Просмотры',
          type: 'line',
          data: viewsData,
          smooth: true,
          lineStyle: { width: 3, color: '#4285f4' },
          itemStyle: { color: '#4285f4' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(66,133,244,0.2)' }, { offset: 1, color: 'rgba(66,133,244,0)' }] } }
        },
        {
          name: 'Посетители',
          type: 'line',
          data: usersData,
          smooth: true,
          lineStyle: { width: 3, color: '#34a853' },
          itemStyle: { color: '#34a853' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(52,168,83,0.2)' }, { offset: 1, color: 'rgba(52,168,83,0)' }] } }
        }
      ]
    };
    moduleState.topPagesChart.setOption(option);
    elements.topPagesChartTitle.textContent = pageTitle ? `Динамика: ${pageTitle}` : 'Визиты по дням';
  }

  function updateDataTable(data) {
    const tableBody = elements.utmDataTable.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    data.sort((a, b) => new Date(a.dimensions[0].name) - new Date(b.dimensions[0].name));
    data.forEach(item => {
      const row = tableBody.insertRow();
      row.insertCell(0).textContent = item.dimensions[0].name;
      row.insertCell(1).textContent = parseInt(item.metrics[0]).toLocaleString();
      row.insertCell(2).textContent = parseInt(item.metrics[1]).toLocaleString();
      row.insertCell(3).textContent = `${parseFloat(item.metrics[2]).toFixed(2)}%`;
      row.insertCell(4).textContent = formatTime(item.metrics[3]);
    });
  }

  function updateDashboard(data) {
    if (!data.data || data.data.length === 0) {
      showError('Данные не найдены');
      resetCounters();
      return;
    }

    elements.metricsDashboard.style.display = 'grid';
    elements.visitsChartContainer.style.display = moduleState.viewMode === 'chart' ? 'block' : 'none';
    elements.utmDataContainer.style.display = moduleState.viewMode === 'table' ? 'block' : 'none';
    elements.topPagesContainer.style.display = 'none';
    elements.topPagesChartContainer.style.display = 'none';
    elements.topPagesDetailContainer.style.display = 'none';
    elements.viewToggleSection.style.display = 'block';

    applySettings();

    data.data.sort((a, b) => new Date(a.dimensions[0].name) - new Date(b.dimensions[0].name));

    let totalVisits = 0, totalUsers = 0, bounceRateSum = 0, durationSum = 0;
    const dates = [], visitsData = [], usersData = [];

    data.data.forEach(item => {
      const visits = parseInt(item.metrics[0]);
      const users = parseInt(item.metrics[1]);
      const bounceRate = parseFloat(item.metrics[2]);
      const duration = parseFloat(item.metrics[3]);
      totalVisits += visits;
      totalUsers += users;
      bounceRateSum += bounceRate * visits;
      durationSum += duration * visits;
      dates.push(item.dimensions[0].name);
      visitsData.push(visits);
      usersData.push(users);
    });

    const avgBounceRate = totalVisits > 0 ? bounceRateSum / totalVisits : 0;
    const avgDuration = totalVisits > 0 ? durationSum / totalVisits : 0;

    elements.totalVisits.textContent = totalVisits.toLocaleString();
    elements.uniqueVisitors.textContent = totalUsers.toLocaleString();
    elements.bounceRate.textContent = `${avgBounceRate.toFixed(2)}%`;
    elements.avgDuration.textContent = formatTime(avgDuration);

    updateVisitsChart(dates, visitsData, usersData);
    updateDataTable(data.data);
    moduleState.visitsChart.resize();
  }

  async function fetchTopPageDailyData(counterId, urlPath, startDate, endDate) {
    const params = {
      ids: counterId,
      metrics: 'ym:pv:pageviews,ym:pv:users',
      dimensions: 'ym:pv:date',
      filters: `ym:pv:URLPathFull=='${urlPath}'`,
      date1: startDate,
      date2: endDate,
      sort: 'ym:pv:date',
      accuracy: 'full'
    };
    const response = await axios.post('/api/metrica', { params });
    return response.data.data || [];
  }

async function fetchTopPagesData(startDate, endDate) {
  const selectedSiteId = elements.topPagesSiteSelect.value;
  const counterId = PROJECT_CONFIG.projects[selectedSiteId].counterId;
  const params = {
    ids: counterId,
    metrics: 'ym:pv:pageviews,ym:pv:users',
    dimensions: 'ym:pv:title,ym:pv:URLPathFull',
    date1: startDate,
    date2: endDate,
    sort: '-ym:pv:pageviews',
    limit: 20,
    accuracy: 'full'
  };

  const dailyParams = {
    ids: counterId,
    metrics: 'ym:s:visits,ym:s:users',
    dimensions: 'ym:s:date',
    date1: startDate,
    date2: endDate,
    sort: 'ym:s:date',
    accuracy: 'full'
  };

  const [response, dailyResponse] = await Promise.all([
    axios.post('/api/metrica', { params }),
    axios.post('/api/metrica', { params: dailyParams })
  ]);

  const tableBody = elements.topPagesTable.getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';
  elements.topPagesChartContainer.style.display = 'none';
  elements.topPagesDetailContainer.style.display = 'none';

  if (dailyResponse.data.data && dailyResponse.data.data.length > 0) {
    const dailyData = dailyResponse.data.data;
    const dates = dailyData.map(d => d.dimensions[0].name);
    const visitsData = dailyData.map(d => parseInt(d.metrics[0]));
    const usersData = dailyData.map(d => parseInt(d.metrics[1]));
    elements.topPagesChartContainer.style.display = 'block';
    updateTopPagesChart(dates, visitsData, usersData, null);
    moduleState.topPagesChart.resize();
  }

  if (response.data.data && response.data.data.length > 0) {
    response.data.data.forEach(item => {
      const pageTitle = item.dimensions[0].name || '—';
      const urlPath = item.dimensions[1].name;
      const pageViews = parseInt(item.metrics[0]);
      const pageUsers = parseInt(item.metrics[1]);
      const row = tableBody.insertRow();
      row.style.cursor = 'pointer';

      const titleCell = row.insertCell(0);
      titleCell.textContent = pageTitle;
      titleCell.style.fontWeight = '500';

      const pathCell = row.insertCell(1);
      pathCell.textContent = urlPath;
      pathCell.style.color = 'var(--mm-text-muted)';
      pathCell.style.fontSize = '13px';
      pathCell.style.wordBreak = 'break-all';

      row.insertCell(2).textContent = pageViews.toLocaleString();
      row.insertCell(3).textContent = pageUsers.toLocaleString();

      row.addEventListener('click', async () => {
        document.querySelectorAll('#top-pages-table tbody tr').forEach(r => r.classList.remove('metrics-row-active'));
        row.classList.add('metrics-row-active');
        elements.topPagesChartContainer.style.display = 'none';
        elements.topPagesDetailContainer.style.display = 'none';
        showLoading(true);
        try {
          const rowDailyData = await fetchTopPageDailyData(counterId, urlPath, startDate, endDate);
          if (rowDailyData.length > 0) {
            const dates = rowDailyData.map(d => d.dimensions[0].name);
            const viewsData = rowDailyData.map(d => parseInt(d.metrics[0]));
            const rowUsersData = rowDailyData.map(d => parseInt(d.metrics[1]));
            elements.topPagesChartContainer.style.display = 'block';
            updateTopPagesChart(dates, viewsData, rowUsersData, pageTitle);
            moduleState.topPagesChart.resize();

            const detailBody = elements.topPagesDetailTable.getElementsByTagName('tbody')[0];
            detailBody.innerHTML = '';
            rowDailyData.forEach(d => {
              const dRow = detailBody.insertRow();
              dRow.insertCell(0).textContent = d.dimensions[0].name;
              dRow.insertCell(1).textContent = parseInt(d.metrics[0]).toLocaleString();
              dRow.insertCell(2).textContent = parseInt(d.metrics[1]).toLocaleString();
            });
            elements.topPagesDetailContainer.style.display = 'block';

            elements.metricsDashboard.style.display = 'grid';
            applySettings();
            elements.totalVisits.textContent = pageViews.toLocaleString();
            elements.uniqueVisitors.textContent = pageUsers.toLocaleString();
            elements.bounceRate.textContent = '—';
            elements.avgDuration.textContent = '—';
            elements.topPagesChartContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch (err) {
          showError(`Ошибка загрузки деталей: ${err.message}`);
        } finally {
          showLoading(false);
        }
      });
    });
  } else {
    const row = tableBody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 4;
    cell.textContent = 'Данные не найдены';
    cell.style.textAlign = 'center';
    cell.style.color = 'var(--mm-text-muted)';
  }

  elements.metricsDashboard.style.display = 'none';
  elements.visitsChartContainer.style.display = 'none';
  elements.topPagesContainer.style.display = 'block';
  elements.utmDataContainer.style.display = 'none';
  elements.customUrlBreakdownContainer.style.display = 'none';
  elements.viewToggleSection.style.display = 'none';
}

  async function fetchCustomUrlData(startDate, endDate) {
    const urlFields = elements.customUrlFields.querySelectorAll('.metrics-url-row');
    if (urlFields.length === 0) {
      showError('Добавьте хотя бы один URL');
      return;
    }
    let allData = [];
    moduleState.customUrlBreakdown = {};

    for (const field of urlFields) {
      const input = field.querySelector('.metrics-url-input');
      const url = input.value.trim();
      if (!url) {
        showError('Заполните все URL поля');
        return;
      }
      const projectId = getProjectFromUrl(url);
      if (!projectId) {
        showError(`URL не распознан: ${url}. Проверьте корректность ссылки`);
        return;
      }
      const project = PROJECT_CONFIG.projects[projectId];
      const params = {
        ids: project.counterId,
        metrics: 'ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds',
        dimensions: 'ym:s:date',
        date1: startDate,
        date2: endDate,
        filters: `ym:pv:URL=='${url}'`,
        accuracy: 'full',
        limit: 1000
      };
      const response = await axios.post('/api/metrica', { params });
      if (response.data.data) {
        const urlData = response.data.data.map(item => ({ ...item, url }));
        allData = [...allData, ...urlData];
        const urlVisits = urlData.reduce((sum, item) => sum + parseInt(item.metrics[0]), 0);
        moduleState.customUrlBreakdown[url] = urlVisits;
      }
    }

    const combinedData = {
      data: allData,
      totals: allData.reduce((acc, item) => {
        return [
          (acc[0] || 0) + parseInt(item.metrics[0]),
          (acc[1] || 0) + parseInt(item.metrics[1]),
          (acc[2] || 0) + (parseFloat(item.metrics[2]) * parseInt(item.metrics[0])),
          (acc[3] || 0) + (parseFloat(item.metrics[3]) * parseInt(item.metrics[0])),
          (acc[4] || 0) + parseInt(item.metrics[0])
        ];
      }, [])
    };
    if (combinedData.totals[4] > 0) {
      combinedData.totals[2] = combinedData.totals[2] / combinedData.totals[4];
      combinedData.totals[3] = combinedData.totals[3] / combinedData.totals[4];
    }
    moduleState.customUrlData = combinedData;
    updateDashboard(combinedData);
    displayCustomUrlBreakdown();
  }

  async function fetchMetricaData() {
    const selectedOption = elements.utmSource.options[elements.utmSource.selectedIndex];
    const startDate = elements.startDate.value;
    const endDate = elements.endDate.value;
    if (!selectedOption.value) {
      showError('Выберите опцию');
      return;
    }
    showLoading(true);
    hideError();
    try {
      if (selectedOption.dataset.special === "true") {
        const projectId = selectedOption.value;
        if (projectId === 'top-pages') await fetchTopPagesData(startDate, endDate);
      } else if (selectedOption.dataset.custom === "true") {
        await fetchCustomUrlData(startDate, endDate);
      }
    } catch (error) {
      showError(`Ошибка: ${error.response?.data?.message || error.message}`);
      resetCounters();
    } finally {
      showLoading(false);
    }
  }

  function displayCustomUrlBreakdown() {
    const tableBody = elements.customUrlBreakdownTable.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    Object.entries(moduleState.customUrlBreakdown).forEach(([url, visits]) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        nameCell.textContent = urlObj.pathname;
      } catch (e) {
        nameCell.textContent = url;
      }
      nameCell.style.fontWeight = '500';

      const urlCell = document.createElement('td');
      urlCell.textContent = url;
      urlCell.style.wordBreak = 'break-all';
      urlCell.style.color = 'var(--mm-text-muted)';
      urlCell.style.fontSize = '13px';

      const visitsCell = document.createElement('td');
      visitsCell.textContent = visits.toLocaleString();

      row.appendChild(nameCell);
      row.appendChild(urlCell);
      row.appendChild(visitsCell);
      tableBody.appendChild(row);
    });

    elements.customUrlBreakdownContainer.style.display = 'block';
  }

  async function init() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    elements.startDate.value = formatDate(thirtyDaysAgo);
    elements.endDate.value = formatDate(today);

    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.2/echarts.min.js");
    moduleState.visitsChart = echarts.init(elements.visitsChart);
    moduleState.topPagesChart = echarts.init(elements.topPagesChart);

    const observer = new MutationObserver(() => {
      const option = moduleState.visitsChart.getOption();
      if (option.xAxis?.length > 0 && option.xAxis[0].data?.length > 0) {
        const dates = option.xAxis[0].data;
        const visitsData = option.series[0].data;
        const usersData = option.series[1].data;
        updateVisitsChart(dates, visitsData, usersData);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    loadUserSettings();

    const firstUrlRow = document.createElement("div");
    firstUrlRow.className = "metrics-url-row";
    firstUrlRow.innerHTML = `
      <input type="text" class="metrics-url-input" placeholder="Введите URL">
      <button class="metrics-url-delete-btn" type="button">✕</button>
    `;
    firstUrlRow.querySelector('.metrics-url-delete-btn').addEventListener('click', (e) => {
      e.preventDefault();
      if (elements.customUrlFields.children.length > 1) {
        firstUrlRow.remove();
      } else {
        showError('Должен остаться хотя бы один URL');
      }
    });
    setupUrlRowListeners(firstUrlRow);
    elements.customUrlFields.appendChild(firstUrlRow);

    elements.fetchDataBtn.addEventListener("click", fetchMetricaData);

    elements.utmSource.addEventListener("change", function() {
      const selectedOption = this.options[this.selectedIndex];
      const isSpecial = selectedOption.dataset.special === "true";
      const isCustom = selectedOption.dataset.custom === "true";

      elements.customUrlSection.style.display = "none";
      elements.topPagesSection.style.display = "none";
      hideAllResults();
      hideError();

      if (isCustom) {
        elements.customUrlSection.style.display = "block";
      } else if (isSpecial) {
        const projectId = selectedOption.value;
        if (projectId === 'top-pages') elements.topPagesSection.style.display = "block";
      }
      applySettings();
    });

    elements.addUrlButton.addEventListener("click", function() {
      const newRow = document.createElement("div");
      newRow.className = "metrics-url-row";
      newRow.innerHTML = `
        <input type="text" class="metrics-url-input" placeholder="Введите URL">
        <button class="metrics-url-delete-btn" type="button">✕</button>
      `;
      newRow.querySelector('.metrics-url-delete-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (elements.customUrlFields.children.length > 1) {
          newRow.remove();
        } else {
          showError('Должен остаться хотя бы один URL');
        }
      });
      setupUrlRowListeners(newRow);
      elements.customUrlFields.appendChild(newRow);
    });

    document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        moduleState.viewMode = e.target.value;
        elements.visitsChartContainer.style.display = moduleState.viewMode === 'chart' ? 'block' : 'none';
        elements.utmDataContainer.style.display = moduleState.viewMode === 'table' ? 'block' : 'none';
        if (moduleState.visitsChart) moduleState.visitsChart.resize();
      });
    });

    window.addEventListener("resize", function() {
      if (moduleState.visitsChart) moduleState.visitsChart.resize();
      if (moduleState.topPagesChart) moduleState.topPagesChart.resize();
    });
  }

  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/axios/1.3.4/axios.min.js");
  await init();
}