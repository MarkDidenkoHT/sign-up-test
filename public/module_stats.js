export async function loadModule(container, { chatId, userData }) {
  const MODULE_LABELS = {
    content:           'Поиск характеристик',
    vacations:         'Учет отпусков',
    security:          'График посещений',
    tabnumber:         'Сотрудники',
    metrics:           'Метрика',
    distribution:      'Распределение',
    aeo:               'АЕО',
    test:            'Тесты',
    feedback:          'Обратная связь',
    stoplist:          'Стоплист',
    service:           'Отправка сообщений',
    timetable:         'Электронный журнал',
    shopapp:           'Приложение продавца',
    pricetags:         'Задачи по ценникам',
    cars:              'Автопарк',
    car_requests:      'Запросы на авто',
    parts_checker:     'Проверка сборок ПК',
    qr_code_generator: 'Генератор QR кодов',
    dish_tasting:      'Дегустации',
    car_review:        'Отчет по авто',
    image_checker:     'Проверка изображений',
    product_reminders: 'Уведомления о поступлениях',
    module_stats:      'Статистика',
    price_tags:        'Ценники',
    pc_checker:        'Комплектующие ПК',
    vehicle_monitor:   'Транспорт',
    notifications:     'Уведомления',
    stop_list:         'Стоп-лист',
    test_form:         'Тестирование',
    rental:            'Недвижимость',
  };

  let ADMIN_CHAT_ID = null;

  const getModuleLabel = (key) => MODULE_LABELS[key] || key;

  const getUserLabel = (r) => {
    if (r.user_name && r.user_name.trim()) return r.user_name.trim();
    return r.user_chat_id || '—';
  };

  const PIE_COLORS = [
    '#4f8ef7','#22c55e','#f97316','#a78bfa','#14b8a6',
    '#eab308','#ef4444','#3b82f6','#ec4899','#06b6d4',
    '#84cc16','#f59e0b','#8b5cf6','#10b981','#6366f1',
  ];

  const defaultSettings = {
    hideAdminActivity: true,
    expandedSettings: ['filters'],
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem('ms-settings');
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (_) {}
    return { ...defaultSettings };
  }

  function saveSettings() {
    localStorage.setItem('ms-settings', JSON.stringify(settings));
  }

  let settings = loadSettings();

  container.innerHTML = `
    <div class="ms-wrapper">
      <div class="ms-module">
        <div class="ms-header">
          <div class="ms-controls">
            <div class="ms-filter-group">
              <label class="ms-filter-label">Период</label>
              <select id="msDateFrom" class="ms-select">
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
                <option value="30" selected>30 дней</option>
                <option value="90">3 месяца</option>
                <option value="0">Всё время</option>
              </select>
            </div>
            <div class="ms-filter-group">
              <label class="ms-filter-label">Модуль</label>
              <select id="msModuleFilter" class="ms-select">
                <option value="">Все</option>
              </select>
            </div>
            <div class="ms-filter-group">
              <label class="ms-filter-label">Пользователь</label>
              <select id="msUserFilter" class="ms-select">
                <option value="">Все</option>
              </select>
            </div>
          </div>
        </div>

        <div class="ms-tabs">
          <button class="ms-tab ms-tab-active" data-tab="overview">Обзор</button>
          <button class="ms-tab" data-tab="modules">По модулям</button>
          <button class="ms-tab" data-tab="activity">Активность</button>
          <button class="ms-tab" data-tab="users">Пользователи</button>
          <button class="ms-tab" data-tab="recent">Последние</button>
        </div>

        <div id="msContent" class="ms-content">
          <div class="ms-loading">Загрузка...</div>
        </div>
      </div>

      <div class="ms-sidebar">
        <h2 class="ms-sidebar-title">Настройки</h2>
        <div id="msSettings"></div>
      </div>
    </div>
  `;

  const apiCall = async (endpoint, data = {}) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: String(chatId || userData?.chat_id || ''), ...data })
    });
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result;
  };

  let allStats = [];
  let activeTab = 'overview';
  let pieChart = null;

  const getDateFrom = (days) => {
    if (!days || days === '0') return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString().slice(0, 10);
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/api/module-stats');
      allStats = result.stats || [];
      ADMIN_CHAT_ID = result.adminChatId || null;
      populateFilters();
      render();
    } catch (err) {
      document.getElementById('msContent').innerHTML =
        `<div class="ms-empty">Ошибка загрузки данных</div>`;
    }
  };

  let moduleStatsEventSource = null;
  let moduleStatsReloading = false;

  const startModuleStatsRealtime = () => {
    if (moduleStatsEventSource || typeof EventSource === 'undefined') return;

    moduleStatsEventSource = new EventSource('/api/module-events');

    moduleStatsEventSource.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'module_stats_updated') {
          if (moduleStatsReloading) return;
          moduleStatsReloading = true;
          await loadStats();
          moduleStatsReloading = false;
        }
      } catch (err) {
        moduleStatsReloading = false;
      }
    };

    moduleStatsEventSource.onerror = () => {
      if (!moduleStatsEventSource) return;
      if (moduleStatsEventSource.readyState === EventSource.CLOSED) {
        moduleStatsEventSource.close();
        moduleStatsEventSource = null;
        setTimeout(startModuleStatsRealtime, 5000);
      }
    };
  };

  const populateFilters = () => {
    const modules = [...new Set(allStats.map(r => r.module).filter(Boolean))].sort();
    const users = [...new Set(allStats.map(r => r.user_chat_id).filter(Boolean))].sort();

    const moduleSelect = document.getElementById('msModuleFilter');
    modules.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = getModuleLabel(m);
      moduleSelect.appendChild(opt);
    });

    const userSelect = document.getElementById('msUserFilter');
    users.forEach(u => {
      const row = allStats.find(r => r.user_chat_id === u);
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = row?.user_name?.trim() || u;
      userSelect.appendChild(opt);
    });
  };

  const getFiltered = () => {
    const days = document.getElementById('msDateFrom').value;
    const moduleFilter = document.getElementById('msModuleFilter').value;
    const userFilter = document.getElementById('msUserFilter').value;
    const dateFrom = getDateFrom(days);
    return allStats.filter(r => {
      if (settings.hideAdminActivity && ADMIN_CHAT_ID && String(r.user_chat_id) === String(ADMIN_CHAT_ID)) return false;
      if (dateFrom && r.usage_date < dateFrom) return false;
      if (moduleFilter && r.module !== moduleFilter) return false;
      if (userFilter && r.user_chat_id !== userFilter) return false;
      return true;
    });
  };

  const destroyPieChart = () => {
    if (pieChart) { pieChart.destroy(); pieChart = null; }
  };

  const renderOverview = (filtered) => {
    const totalOpens = filtered.length;
    const byModule = {};
    filtered.forEach(r => { byModule[r.module] = (byModule[r.module] || 0) + 1; });
    const uniqueUsers = new Set(filtered.map(r => r.user_chat_id)).size;
    const byDate = {};
    filtered.forEach(r => { byDate[r.usage_date] = (byDate[r.usage_date] || 0) + 1; });
    const dates = Object.keys(byDate).sort();
    const avgPerDay = dates.length ? Math.round(totalOpens / dates.length) : 0;
    const moduleEntries = Object.entries(byModule).sort((a, b) => b[1] - a[1]);
    const colors = moduleEntries.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);

    const legendHtml = moduleEntries.map(([mod, count], i) => `
      <div class="ms-legend-row">
        <span class="ms-legend-dot" style="background:${colors[i]}"></span>
        <span class="ms-legend-name">${getModuleLabel(mod)}</span>
        <span class="ms-legend-count">${count}</span>
        <span class="ms-legend-pct">${Math.round((count / totalOpens) * 100)}%</span>
      </div>
    `).join('');

    return `
      <div class="ms-summary-cards">
        <div class="ms-card">
          <div class="ms-card-value">${totalOpens}</div>
          <div class="ms-card-label">Открытий</div>
        </div>
        <div class="ms-card">
          <div class="ms-card-value">${uniqueUsers}</div>
          <div class="ms-card-label">Пользователей</div>
        </div>
        <div class="ms-card">
          <div class="ms-card-value">${Object.keys(byModule).length}</div>
          <div class="ms-card-label">Модулей</div>
        </div>
        <div class="ms-card">
          <div class="ms-card-value">${avgPerDay}</div>
          <div class="ms-card-label">В среднем/день</div>
        </div>
      </div>
      <div class="ms-section ms-pie-section">
        <div class="ms-section-title">Распределение по модулям</div>
        <div class="ms-pie-layout">
          <div class="ms-pie-wrap">
            <canvas id="msPieChart"></canvas>
          </div>
          <div class="ms-legend">${legendHtml}</div>
        </div>
      </div>
    `;
  };

  const mountPieChart = (filtered) => {
    const canvas = document.getElementById('msPieChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const byModule = {};
    filtered.forEach(r => { byModule[r.module] = (byModule[r.module] || 0) + 1; });
    const entries = Object.entries(byModule).sort((a, b) => b[1] - a[1]);
    const colors = entries.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
    destroyPieChart();
    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map(([mod]) => getModuleLabel(mod)),
        datasets: [{
          data: entries.map(([, c]) => c),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: 'transparent',
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((ctx.parsed / total) * 100);
                return ` ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  };

  const renderModules = (filtered) => {
    const byModule = {};
    filtered.forEach(r => { byModule[r.module] = (byModule[r.module] || 0) + 1; });
    const moduleEntries = Object.entries(byModule).sort((a, b) => b[1] - a[1]);
    const maxModuleCount = moduleEntries[0]?.[1] || 1;
    const total = filtered.length;
    return `
      <div class="ms-section">
        <div class="ms-section-title">Все модули</div>
        <div class="ms-bar-list">
          ${moduleEntries.map(([mod, count]) => `
            <div class="ms-bar-row">
              <div class="ms-bar-name">${getModuleLabel(mod)}</div>
              <div class="ms-bar-track">
                <div class="ms-bar-fill" style="width: ${Math.round((count / maxModuleCount) * 100)}%"></div>
              </div>
              <div class="ms-bar-count">${count}</div>
              <div class="ms-bar-pct">${Math.round((count / total) * 100)}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderActivity = (filtered) => {
    const byDate = {};
    filtered.forEach(r => { byDate[r.usage_date] = (byDate[r.usage_date] || 0) + 1; });
    const dates = Object.keys(byDate).sort();
    const maxPerDay = Math.max(...Object.values(byDate), 1);
    return `
      <div class="ms-section">
        <div class="ms-section-title">Активность по дням</div>
        <div class="ms-day-chart">
          ${dates.map(date => `
            <div class="ms-day-col">
              <div class="ms-day-count">${byDate[date]}</div>
              <div class="ms-day-bar-wrap">
                <div class="ms-day-bar" style="height: ${Math.round((byDate[date] / maxPerDay) * 100)}%" title="${date}: ${byDate[date]}"></div>
              </div>
              <div class="ms-day-label">${date.slice(5)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderUsers = (filtered) => {
    const byUserModule = {};
    filtered.forEach(r => {
      const key = r.user_chat_id;
      if (!byUserModule[key]) byUserModule[key] = { row: r, mods: {} };
      byUserModule[key].mods[r.module] = (byUserModule[key].mods[r.module] || 0) + 1;
    });
    return `
      <div class="ms-section">
        <div class="ms-section-title">По пользователям</div>
        <div class="ms-table-wrap">
          <table class="ms-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Отдел</th>
                <th>Всего</th>
                <th>Модули</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(byUserModule)
                .sort((a, b) => {
                  const tA = Object.values(a[1].mods).reduce((s, v) => s + v, 0);
                  const tB = Object.values(b[1].mods).reduce((s, v) => s + v, 0);
                  return tB - tA;
                })
                .map(([user, { row, mods }]) => {
                  const total = Object.values(mods).reduce((s, v) => s + v, 0);
                  const modTags = Object.entries(mods)
                    .sort((a, b) => b[1] - a[1])
                    .map(([m, c]) => `<span class="ms-mod-tag">${getModuleLabel(m)} <b>${c}</b></span>`)
                    .join('');
                  return `
                    <tr>
                      <td class="ms-user-cell">
                        <div class="ms-user-name">${row.user_name?.trim() || user}</div>
                        ${row.user_name?.trim() ? `<div class="ms-user-id">${user}</div>` : ''}
                        </td>
                      <td class="ms-dept-cell">${row.user_department || '—'} </td>
                      <td class="ms-count-cell">${total}</td>
                      <td>${modTags}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const renderRecent = (filtered) => {
    const recentRows = [...filtered]
      .sort((a, b) => {
        if (b.usage_date !== a.usage_date) return b.usage_date.localeCompare(a.usage_date);
        return b.id - a.id;
      })
      .slice(0, 200);
    return `
      <div class="ms-section ms-recent-section">
        <div class="ms-section-title">Последние открытия</div>
        <div class="ms-table-wrap ms-recent-table-wrap">
          <table class="ms-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Отдел</th>
                <th>Модуль</th>
              </tr>
            </thead>
            <tbody>
              ${recentRows.map(r => `
                <tr>
                  <td class="ms-date-cell">${r.usage_date}</td>
                  <td class="ms-user-cell">
                    <div class="ms-user-name">${getUserLabel(r)}</div>
                    ${r.user_name?.trim() ? `<div class="ms-user-id">${r.user_chat_id}</div>` : ''}
                    </td>
                  <td class="ms-dept-cell">${r.user_department || '—'}</td>
                  <td><span class="ms-mod-badge">${getModuleLabel(r.module)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const loadChartJs = () => new Promise((resolve) => {
    if (typeof Chart !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });

  const render = () => {
    destroyPieChart();
    const filtered = getFiltered();
    const content = document.getElementById('msContent');
    if (!filtered.length) {
      content.innerHTML = `<div class="ms-empty">Нет данных за выбранный период</div>`;
      return;
    }
    let html = '';
    switch (activeTab) {
      case 'overview':  html = renderOverview(filtered); break;
      case 'modules':   html = renderModules(filtered); break;
      case 'activity':  html = renderActivity(filtered); break;
      case 'users':     html = renderUsers(filtered); break;
      case 'recent':    html = renderRecent(filtered); break;
    }
    content.innerHTML = html;
    if (activeTab === 'overview') {
      loadChartJs().then(() => mountPieChart(filtered));
    }
  };

  const renderSettings = () => {
    const groups = [
      {
        id: 'filters',
        title: 'Фильтры данных',
        items: [
          {
            id: 'hideAdminActivity',
            label: 'Скрыть активность администратора',
            value: settings.hideAdminActivity,
          },
        ],
      },
    ];

    const settingsContainer = document.getElementById('msSettings');
    if (!settingsContainer) return;

    settingsContainer.innerHTML = groups.map(group => {
      const isExpanded = settings.expandedSettings.includes(group.id);
      return `
        <div class="ms-settings-block">
          <div class="ms-settings-header" data-group="${group.id}">
            <h3>${group.title}</h3>
            <svg class="ms-expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6v12M6 12h12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="ms-settings-content ${isExpanded ? 'expanded' : ''}">
            ${group.items.map(item => `
              <div class="ms-setting-item">
                <span class="ms-setting-label">${item.label}</span>
                <label class="ms-toggle">
                  <input type="checkbox" data-setting="${item.id}" ${item.value ? 'checked' : ''}>
                  <span class="ms-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    settingsContainer.querySelectorAll('.ms-settings-header').forEach(header => {
      header.addEventListener('click', () => {
        const groupId = header.dataset.group;
        const content = header.nextElementSibling;
        const icon = header.querySelector('.ms-expand-icon');
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
        const idx = settings.expandedSettings.indexOf(groupId);
        if (content.classList.contains('expanded')) {
          if (idx === -1) settings.expandedSettings.push(groupId);
        } else {
          if (idx > -1) settings.expandedSettings.splice(idx, 1);
        }
        saveSettings();
      });
    });

    settingsContainer.querySelectorAll('.ms-toggle input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.setting;
        settings[key] = e.target.checked;
        saveSettings();
        render();
      });
    });
  };

  document.getElementById('msDateFrom').addEventListener('change', render);
  document.getElementById('msModuleFilter').addEventListener('change', render);
  document.getElementById('msUserFilter').addEventListener('change', render);

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.ms-tab');
    if (!tab) return;
    container.querySelectorAll('.ms-tab').forEach(t => t.classList.remove('ms-tab-active'));
    tab.classList.add('ms-tab-active');
    activeTab = tab.dataset.tab;
    render();
  });

  renderSettings();
  await loadStats();
  startModuleStatsRealtime();
}