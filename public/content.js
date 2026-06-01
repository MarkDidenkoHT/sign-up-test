export async function loadModule(container, {}) {
  
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js');
  
  container.innerHTML = `
    <div class="content-module-wrapper">
      <div class="content-module-tabs-nav">
        <button class="content-module-tab-btn active" data-tab="analysis">Поиск пропущенных</button>
        <button class="content-module-tab-btn" data-tab="variation">Анализ значений</button>
        <button class="content-module-tab-btn" data-tab="entry">Характеристики</button>
        <button class="content-module-tab-btn" data-tab="manual">Инструкция</button>
        <button class="content-module-tab-btn" data-tab="logs">Логи</button>
      </div>

      <div id="analysisTab" class="content-module-tab-content active">
        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Поиск пропущенных характеристик</h3>
          </div>
          
          <div class="content-module-controls-bar">
            <input type="file" id="analysisFileInput" class="content-module-file-input" accept=".csv">
            <button id="searchBtn" class="content-module-btn content-module-btn-primary">Искать</button>
          </div>

          <div id="analysisResult" class="content-module-hidden">
            <div class="content-module-filters">
              <div class="content-module-filter-group">
                <label>Фильтр по категории</label>
                <input type="text" id="resultsFilterInput" class="content-module-filter-input" placeholder="Введите категорию...">
              </div>
              <div class="content-module-checkbox-group">
                <label class="content-module-checkbox-label">
                  <input type="checkbox" id="stockFilterCheckbox"> Скрыть товары не в наличии
                </label>
              </div>
            </div>

            <div id="vendorFilterContainer" class="content-module-vendor-filters">
              <label class="content-module-checkbox-label">
                <input type="checkbox" id="selectAllVendors" checked> Выбрать всех
              </label>
            </div>
            
            <div class="content-module-table-wrapper">
              <table id="resultsTable" class="content-module-table">
                <thead>
                  <tr>
                    <th style="width: 18%;">
                      Код товара 
                      <button class="content-module-icon-btn" data-column="0">↑↓</button>
                    </th>
                    <th>
                      Категория 
                      <button class="content-module-icon-btn" data-column="1">↑↓</button>
                    </th>
                    <th>
                      Отсутствующие характеристики 
                      <button class="content-module-icon-btn" data-column="2">↑↓</button>
                    </th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div id="variationTab" class="content-module-tab-content">
        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Анализ значений характеристик</h3>
          </div>
          
          <div class="content-module-controls-bar">
            <input type="file" id="variationFileInput" class="content-module-file-input" accept=".csv">
            <button id="analyzeVariationBtn" class="content-module-btn content-module-btn-primary">Анализировать</button>
          </div>

          <div id="variationResult" class="content-module-hidden">
            <div class="content-module-filters">
              <div class="content-module-filter-group">
                <label>Фильтр по категориям</label>
                <input type="text" id="categoryFilter" class="content-module-filter-input" placeholder="Введите категорию...">
              </div>
            </div>
            
            <div class="content-module-table-wrapper">
              <table id="variationTable" class="content-module-table">
                <thead>
                  <tr>
                    <th>Характеристика</th>
                    <th>Категории</th>
                    <th>Значение</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div id="entryTab" class="content-module-tab-content">
        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Добавить характеристики для проверки</h3>
          </div>

          <div class="content-module-form">
            <div class="content-module-form-row">
              <label for="categoryInput">Категория</label>
              <input type="text" id="categoryInput" placeholder="Введите категорию">
            </div>

            <div class="content-module-form-row">
              <label for="featuresInput">Характеристики (через запятую)</label>
              <input type="text" id="featuresInput" placeholder="Например: Ширина, Высота, Глубина">
            </div>

            <div class="content-module-form-actions">
              <button id="addFeatureBtn" class="content-module-btn content-module-btn-primary">Добавить</button>
              <button id="showAllBtn" class="content-module-btn">Показать все</button>
            </div>
          </div>
        </div>

        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Существующие характеристики</h3>
          </div>

          <div class="content-module-filters">
            <div class="content-module-filter-group">
              <label>Фильтр по категории</label>
              <input type="text" id="featuresFilterInput" class="content-module-filter-input" placeholder="Введите категорию...">
            </div>
          </div>

          <div class="content-module-table-wrapper">
            <table id="featuresTable" class="content-module-table">
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Характеристики</th>
                  <th style="width: 25%;">Действия</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="manualTab" class="content-module-tab-content">
        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Инструкция по использованию</h3>
          </div>
          <div class="content-module-instruction-content">
            <p><strong>I. Как добавить характеристики для проверки.</strong></p>
            <p>Выполняется в приложении поиска пропущенных характеристик. Перед добавлением характеристики нужно убедиться что ее нет в списке.</p>
            <p>1. Переходим во вкладку "Характеристики".</p>
            <p>2. В списке уже существующих характеристик указываем интересующую нас категорию.</p>
            <p>3. В отфильтрованном ниже списке получаем список характеристик для этой категории.</p>
            <p>4. Если нужной характеристики нет в отфильтрованном списке - в блоке "Добавить характеристики для проверки" указываем категорию, и название характеристики на которую необходимо выполнить проверку.</p>
            <p>Если нужно добавить для категории несколько характеристик для проверки - добавляем характеристики через запятую.</p>
            <hr />
            <p><strong>II. Как подготовить товары для проверки.</strong></p>
            <p>Выполняется в админке.</p>
            <p>1. Через поиск или расширенный поиск в админке находим интересующие нас товары.</p>
            <p>2. Нажимаем экспортировать.</p>
            <img src="https://hi-tech.md/images/m1/2025-03-04_175205.png?1741103564020">
            <p>3. Проверяем какие у нас выбраны данные для экспорта. (Product code, Language, Vendor, Features, Category, Secondary categories, Quantity)</p>
            <img src="https://hi-tech.md/images/m1/2025-03-05_142534222222222222.png?1741177547657">
            <p>4. Эскпортируем, получаем файл.</p>
            <img src="https://hi-tech.md/images/m1/2025-03-04_175338.png?1741103654476">
            <p><strong>ВАЖНО!!!</strong></p>
            <p><span style="text-decoration: underline;">Нельзя экспортировать большое количество товаров за раз (н-р выше 5000). Высокая нагрузка на сервер.</span></p>
            <img src="https://hi-tech.md/images/m1/2025-03-04_175510.png?1741103758278">
            <hr />
            <p><strong>III. Как выполнить проверку на пропущенные характеристики.</strong></p>
            <p>Выполняется в приложении поиска пропущенных характеристик.</p>
            <p>1. Переходим во вкладку "Поиск".</p>
            <p>2. Прикрепляем файл полученный экспортом из админки (<strong>II</strong>).</p>
            <p>3. Нажимаем "Искать".</p>
            <p>Все пропущенные характеристики программа выдаст списком ниже.</p>
          </div>
        </div>
      </div>

      <div id="logsTab" class="content-module-tab-content">
        <div class="content-module-card">
          <div class="content-module-card-header">
            <h3>Логи проверок</h3>
          </div>

          <div class="content-module-filters">
            <div class="content-module-filter-group">
              <label>Фильтр по всем полям</label>
              <input type="text" id="logsFilterInput" class="content-module-filter-input" placeholder="Введите категорию, характеристику...">
            </div>
          </div>

          <div class="content-module-table-wrapper">
            <table id="logsTable" class="content-module-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Продавец</th>
                  <th>Категория</th>
                  <th>Пропущенная характеристика</th>
                  <th>Количество</th>
                  <th>Дата проверки</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="content-module-toast-container" id="toastContainer"></div>
    </div>
  `;
  
  initializeApp();
  
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `content-module-toast content-module-status-${type}`;
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
  
  function initializeApp() {
    const state = {
      categoryFeatures: {},
      vendorSet: new Set()
    };
    
    const tabBtns = document.querySelectorAll('.content-module-tab-btn');
    const tabContents = document.querySelectorAll('.content-module-tab-content');
    
    tabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        tabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`${tabId}Tab`).classList.add('active');
        
        if (tabId === 'logs') {
          fetchAndDisplayLogs();
        }
      });
    });
    
    document.getElementById('searchBtn').addEventListener('click', () => analyzeFile(state));
    document.getElementById('analyzeVariationBtn').addEventListener('click', () => analyzeFileVariation(state));
    document.getElementById('addFeatureBtn').addEventListener('click', () => addFeature(state));
    document.getElementById('showAllBtn').addEventListener('click', () => fetchFeatures(state));
    
    document.getElementById('featuresFilterInput').addEventListener('input', debounce(() => filterFeaturesTable(state), 300));
    document.getElementById('resultsFilterInput').addEventListener('input', filterResultsTable);
    document.getElementById('categoryFilter').addEventListener('input', filterCategories);
    document.getElementById('logsFilterInput').addEventListener('input', filterLogsTable);
    
    document.getElementById('stockFilterCheckbox').addEventListener('change', toggleOutOfStock);
    
    document.querySelectorAll('[data-column]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const column = parseInt(e.target.getAttribute('data-column'));
        sortTable(column);
      });
    });
    
    document.getElementById('selectAllVendors').addEventListener('change', toggleAllVendors);
    
    fetchFeatures(state);
  }
  
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  async function fetchFeatures(state) {
    const apiBase = "https://api.hi-tech.md/v1/ht_reference/cats_to_props?token=49OLR33fjbHb";
    try {
      showToast('Загрузка характеристик...', 'loading');
      const response = await fetch(apiBase);
      const jsonResponse = await response.json();
      
      const featuresArray = jsonResponse.data || [];
      state.categoryFeatures = {};
      
      featuresArray.forEach(item => {
        if (!state.categoryFeatures[item.category]) {
          state.categoryFeatures[item.category] = [];
        }
        state.categoryFeatures[item.category].push({
          id: item.id,
          property: item.property
        });
      });
      
      renderFeaturesTable(state);
      showToast('Характеристики загружены', 'success');
    } catch (error) {
      console.error("Error fetching categories:", error);
      showToast('Ошибка загрузки характеристик', 'error');
    }
  }
  
  function renderFeaturesTable(state) {
    const tbody = document.querySelector("#featuresTable tbody");
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    Object.entries(state.categoryFeatures).forEach(([category, properties]) => {
      properties.forEach(({id, property}) => {
        const row = document.createElement("tr");
        
        const categoryCell = document.createElement("td");
        categoryCell.textContent = category;
        row.appendChild(categoryCell);
        
        const propertyCell = document.createElement("td");
        propertyCell.textContent = property;
        row.appendChild(propertyCell);
        
        const actionsCell = document.createElement("td");
        actionsCell.className = 'content-module-actions-cell';
        
        const editButton = document.createElement("button");
        editButton.textContent = "✏️ Редактировать";
        editButton.className = "content-module-icon-btn edit";
        editButton.onclick = () => editFeature(id, category, property);
        actionsCell.appendChild(editButton);
        
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑️ Удалить";
        deleteButton.className = "content-module-icon-btn delete";
        deleteButton.onclick = () => deleteFeature(id);
        actionsCell.appendChild(deleteButton);
        
        row.appendChild(actionsCell);
        
        fragment.appendChild(row);
      });
    });
    
    tbody.appendChild(fragment);
  }
  
  async function addFeature(state) {
    const category = document.getElementById('categoryInput').value.trim();
    const properties = document.getElementById('featuresInput').value.split(',').map(f => f.trim());
    
    if (!category || properties.length === 0 || properties[0] === '') {
      showToast('Введите категорию и хотя бы одну характеристику', 'error');
      return;
    }
    
    const apiBase = "https://api.hi-tech.md/v1/ht_reference/cats_to_props?token=49OLR33fjbHb";
    
    showToast('Добавление характеристик...', 'loading');
    
    try {
      for (const property of properties) {
        await fetch(apiBase, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category,
            property
          })
        });
      }
      
      showToast(`Добавлены характеристики: ${properties.join(', ')}`, 'success');
      
      document.getElementById('categoryInput').value = '';
      document.getElementById('featuresInput').value = '';
      
      fetchFeatures(state);
    } catch (error) {
      showToast('Ошибка при добавлении характеристик', 'error');
    }
  }
  
  async function editFeature(id, category, oldProperty) {
    const newProperty = prompt(`Изменить характеристику "${oldProperty}" на:`, oldProperty);
    
    if (!newProperty || newProperty === oldProperty) return;
    
    showToast('Сохранение изменений...', 'loading');
    
    try {
      await fetch(`https://api.hi-tech.md/v1/ht_reference/cats_to_props/${id}?token=49OLR33fjbHb`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category,
          property: newProperty
        })
      });
      
      showToast('Характеристика обновлена', 'success');
      fetchFeatures(window.featureAnalysisState);
    } catch (error) {
      showToast('Ошибка при обновлении', 'error');
    }
  }
  
  async function deleteFeature(id) {
    if (!confirm("Удалить эту характеристику?")) return;
    
    showToast('Удаление...', 'loading');
    
    try {
      await fetch(`https://api.hi-tech.md/v1/ht_reference/cats_to_props/${id}?token=49OLR33fjbHb`, {
        method: "DELETE"
      });
      
      showToast('Характеристика удалена', 'success');
      fetchFeatures(window.featureAnalysisState);
    } catch (error) {
      showToast('Ошибка при удалении', 'error');
    }
  }
  
  function analyzeFile(state) {
    const fileInput = document.getElementById('analysisFileInput');
    
    if (!fileInput.files.length) {
      showToast('Пожалуйста, загрузите CSV файл', 'error');
      return;
    }
    
    const file = fileInput.files[0];
    showToast('Анализ файла...', 'loading');
    
    Papa.parse(file, {
      delimiter: ";",
      header: false,
      skipEmptyLines: true,
      complete: function(results) {
        processCSV(results.data, state);
        showToast('Анализ завершен', 'success');
      },
      error: function(error) {
        console.error("Error parsing CSV:", error);
        showToast('Ошибка при разборе CSV', 'error');
      }
    });
  }
  
  function processCSV(data, state) {
    
    if (data.length < 2) {
      console.warn("CSV file appears empty or incorrectly formatted.");
      return;
    }
    
    const resultsTable = document.getElementById('resultsTable');
    const tbody = resultsTable.querySelector('tbody');
    tbody.innerHTML = '';
    state.vendorSet.clear();
    
    data.forEach((row, index) => {
      if (row.length < 8) {
        console.warn(`Malformed line ${index + 1}, attempting recovery:`, row);
        while (row.length < 8) row.push('');
      }
      
      const productCode = row[0].trim();
      const vendor = row[2].trim();
      
      if (vendor.toLowerCase() === 'vendor') return;
      
      const productFeatures = row[3] ? row[3].split(';').map(f => f.trim().replace(/\s+/g, ' ')) : [];
      const mainCategoryRaw = row[4] ? row[4].trim() : '';
      const secondaryCategoriesRaw = row[5] ? row[5].split(';').map(c => c.trim()) : [];
      const quantity = parseInt(row[6], 10) || 0;
      
      const getLastCategory = (categoryPath) => {
        return categoryPath.includes('///') ? categoryPath.split('///').pop().trim() : categoryPath.trim();
      };
      
      const mainCategory = getLastCategory(mainCategoryRaw);
      const secondaryCategories = secondaryCategoriesRaw.map(getLastCategory);
      
      const unwantedCategories = ["Товар без акции", "Товар по акции", "Рассрочка без %"];
      const allCategories = [...new Set([mainCategory, ...secondaryCategories])].filter(cat => !unwantedCategories.includes(cat));
      
      if (allCategories.length === 0) return;
      
      let missingFeatures = new Set();
      
      allCategories.forEach(category => {
        const requiredFeatures = state.categoryFeatures[category]?.map(f => f.property) || [];
        requiredFeatures.forEach(f => {
          if (!productFeatures.some(pf => pf.includes(f))) {
            missingFeatures.add(f);
          }
        });
      });
      
      if (missingFeatures.size > 0) {
        state.vendorSet.add(vendor);
        
        const productUrl = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${productCode}&dispatch=products.search&security_hash=717e1324993b7b0bc850e9771c1089dc`;
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-vendor', vendor);
        tr.setAttribute('data-quantity', quantity);
        
        tr.innerHTML = `
          <td><a href="${productUrl}" target="_blank">${productCode}</a></td>
          <td>${allCategories.join(', ')}</td>
          <td>${Array.from(missingFeatures).join(', ')}</td>
        `;
        
        tbody.appendChild(tr);
        
        allCategories.forEach(category => {
          logMissingFeatures(productCode, vendor, category, missingFeatures, quantity);
        });
      }
    });
    
    generateVendorFilter(state);
    document.getElementById('analysisResult').classList.remove('content-module-hidden');
  }
  
  function generateVendorFilter(state) {
    const vendorFilterContainer = document.getElementById("vendorFilterContainer");
    
    const existingLabels = vendorFilterContainer.querySelectorAll('label:not(:first-child)');
    existingLabels.forEach(label => label.remove());
    
    state.vendorSet.forEach(vendor => {
      const label = document.createElement("label");
      label.className = "content-module-checkbox-label";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.value = vendor;
      checkbox.classList.add("vendor-checkbox");
      checkbox.addEventListener("change", filterByVendor);
      
      label.appendChild(checkbox);
      label.append(` ${vendor}`);
      vendorFilterContainer.appendChild(label);
    });
  }

  function filterByVendor() {
    const selectedVendors = Array.from(document.querySelectorAll(".vendor-checkbox:checked"))
      .map(cb => cb.value);
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach(row => {
      const rowVendor = row.getAttribute("data-vendor");
      row.style.display = selectedVendors.includes(rowVendor) ? "" : "none";
    });
  }

  function toggleAllVendors() {
    const checked = document.getElementById("selectAllVendors").checked;
    document.querySelectorAll(".vendor-checkbox").forEach(cb => cb.checked = checked);
    filterByVendor();
  }
  
  function toggleOutOfStock() {
    const checkbox = document.getElementById('stockFilterCheckbox');
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    
    rows.forEach(row => {
      const quantity = parseInt(row.getAttribute("data-quantity"), 10);
      if (checkbox.checked && quantity === 0) {
        row.style.display = "none";
      } else {
        const vendor = row.getAttribute("data-vendor");
        const selectedVendors = Array.from(document.querySelectorAll(".vendor-checkbox:checked")).map(cb => cb.value);
        row.style.display = selectedVendors.includes(vendor) ? "" : "none";
      }
    });
  }
  
  function filterFeaturesTable(state) {
    const filter = document.getElementById("featuresFilterInput").value.toLowerCase();
    const tbody = document.querySelector("#featuresTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    Object.entries(state.categoryFeatures).forEach(([category, properties]) => {
      if (!category.toLowerCase().includes(filter)) return;
      properties.forEach(({id, property}) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${category}</td>
          <td>${property}</td>
          <td class="content-module-actions-cell">
            <button class="content-module-icon-btn edit" onclick="editFeature(${id}, '${category}', '${property}')">✏️ Редактировать</button>
            <button class="content-module-icon-btn delete" onclick="deleteFeature(${id})">🗑️ Удалить</button>
          </td>
        `;
        fragment.appendChild(row);
      });
    });
    
    tbody.appendChild(fragment);
  }
  
  function filterResultsTable() {
    const filter = document.getElementById("resultsFilterInput").value.toLowerCase();
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach(row => {
      const category = row.cells[1].innerText.toLowerCase();
      row.style.display = category.includes(filter) ? "" : "none";
      
      const stockCheckbox = document.getElementById('stockFilterCheckbox');
      if (stockCheckbox.checked) {
        const quantity = parseInt(row.getAttribute("data-quantity"), 10);
        if (quantity === 0) {
          row.style.display = "none";
        }
      }
    });
  }

  function sortTable(columnIndex) {
    const table = document.getElementById("resultsTable");
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    
    const currentSortOrder = table.getAttribute(`data-sort-order-${columnIndex}`) || "asc";
    
    rows.sort((rowA, rowB) => {
      const cellA = rowA.cells[columnIndex].textContent.trim();
      const cellB = rowB.cells[columnIndex].textContent.trim();
      
      return currentSortOrder === "asc" ?
        cellA.localeCompare(cellB) :
        cellB.localeCompare(cellA);
    });
    
    table.setAttribute(`data-sort-order-${columnIndex}`, currentSortOrder === "asc" ? "desc" : "asc");
    
    tbody.innerHTML = "";
    rows.forEach(row => tbody.appendChild(row));
  }
  
  function analyzeFileVariation(state) {
    const fileInput = document.getElementById('variationFileInput');
    if (!fileInput.files.length) {
      showToast('Пожалуйста, загрузите CSV файл', 'error');
      return;
    }
    
    const file = fileInput.files[0];
    showToast('Анализ значений...', 'loading');
    
    Papa.parse(file, {
      delimiter: ";",
      header: false,
      skipEmptyLines: true,
      complete: function(results) {
        processCSVVariation(results.data);
        showToast('Анализ завершен', 'success');
      },
      error: function(error) {
        console.error("Ошибка при разборе CSV:", error);
        showToast('Ошибка при разборе CSV', 'error');
      }
    });
  }

  function processCSVVariation(data) {
    if (data.length < 2) {
      console.warn("CSV файл пуст или неправильно отформатирован.");
      return;
    }
    
    const variationTable = document.getElementById('variationTable');
    const tbody = variationTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    const featureMap = new Map();
    
    data.forEach((row, index) => {
      if (row.length < 8) {
        while (row.length < 8) row.push('');
      }
      
      const productCode = row[0].trim();
      const productFeatures = row[3] ? row[3].split(';').map(f => f.trim().replace(/\s+/g, ' ')) : [];
      const categories = (row[4] + ';' + row[5])
        .split(';')
        .map(c => c.trim().replace(/Товар по акции|Товар без акции/g, '').trim())
        .filter(c => c)
        .map(c => {
          const lastLevel = c.split('///').pop().trim();
          return lastLevel;
        });
      
      productFeatures.forEach(feature => {
        const [featureName, featureValue] = feature.split(':').map(f => f.trim());
        if (!featureName || !featureValue) return;
        
        const cleanedFeatureValue = featureValue.replace(/[\[\]]/g, '').trim();
        const featureValues = cleanedFeatureValue.split('///').map(val => val.trim());
        
        featureValues.forEach(val => {
          const cleanFeatureValue = val.replace(/^[a-zA-Z]/, '').trim();
          if (!featureMap.has(featureName)) {
            featureMap.set(featureName, {
              variations: new Map(),
              categories: new Set()
            });
          }
          const featureData = featureMap.get(featureName);
          if (!featureData.variations.has(cleanFeatureValue)) {
            featureData.variations.set(cleanFeatureValue, new Set());
          }
          featureData.variations.get(cleanFeatureValue).add(productCode);
          
          categories.forEach(category => featureData.categories.add(category));
        });
      });
    });
    
    featureMap.forEach((featureData, featureName) => {
      const featureRow = document.createElement('tr');
      
      const featureCell = document.createElement('td');
      featureCell.textContent = featureName;
      featureRow.appendChild(featureCell);
      
      const categoriesCell = document.createElement('td');
      categoriesCell.textContent = Array.from(featureData.categories).join(', ');
      featureRow.appendChild(categoriesCell);
      
      const variationsCell = document.createElement('td');
      const variationsList = document.createElement('ul');
      variationsList.className = 'content-module-variations-list';
      
      featureData.variations.forEach((productCodes, variation) => {
        const variationItem = document.createElement('li');
        variationItem.innerHTML = variation;
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'content-module-toggle-button';
        toggleButton.textContent = 'Показать коды';
        
        const productCodesList = document.createElement('ul');
        productCodesList.className = 'content-module-product-codes';
        
        productCodes.forEach(productCode => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `<a href="https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${productCode}&dispatch=products.search&security_hash=71cdcc282f013853f2bd764e702a4de3" target="_blank">${productCode}</a>`;
          productCodesList.appendChild(listItem);
        });
        
        toggleButton.onclick = function() {
          const isHidden = productCodesList.style.display === 'none' || productCodesList.style.display === '';
          productCodesList.style.display = isHidden ? 'block' : 'none';
          toggleButton.textContent = isHidden ? 'Скрыть коды' : 'Показать коды';
        };
        
        variationItem.appendChild(toggleButton);
        variationItem.appendChild(productCodesList);
        variationsList.appendChild(variationItem);
      });
      
      variationsCell.appendChild(variationsList);
      featureRow.appendChild(variationsCell);
      tbody.appendChild(featureRow);
    });
    
    document.getElementById('variationResult').classList.remove('content-module-hidden');
  }

  function filterCategories() {
    const filterText = document.getElementById('categoryFilter').value.toLowerCase();
    const rows = document.querySelectorAll('#variationTable tbody tr');
    rows.forEach(row => {
      const categoriesCell = row.querySelector('td:nth-child(2)');
      const categories = categoriesCell.textContent.toLowerCase();
      row.style.display = categories.includes(filterText) ? '' : 'none';
    });
  }
  
  async function fetchAndDisplayLogs() {
    const url = 'https://api.hi-tech.md/v1/ht_reference/cats_to_props_logs?token=49OLR33fjbHb';
    const logsTableBody = document.querySelector('#logsTable tbody');
    
    showToast('Загрузка логов...', 'loading');
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        logsTableBody.innerHTML = '';
        
        data.data.forEach(log => {
          const row = document.createElement('tr');
          const productUrl = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${log.product_upc}&dispatch=products.search&security_hash=29bb44aa92880aca0328af3ad0fbe0db`;
          
          row.innerHTML = `
            <td><a href="${productUrl}" target="_blank">${log.product_upc}</a></td>
            <td>${log.vendor}</td>
            <td>${log.category}</td>
            <td>${log.property}</td>
            <td>${log.quantity}</td>
            <td>${log.created_at}</td>
          `;
          logsTableBody.appendChild(row);
        });
        
        showToast('Логи загружены', 'success');
      } else {
        logsTableBody.innerHTML = '<tr><td colspan="6" class="content-module-empty-state">Нет данных для отображения</td></tr>';
        showToast('Логи не найдены', 'error');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      logsTableBody.innerHTML = '<tr><td colspan="6" class="content-module-empty-state" style="color:#f87171;">Ошибка загрузки логов</td></tr>';
      showToast('Ошибка загрузки логов', 'error');
    }
  }
  
  function filterLogsTable() {
    const filterInput = document.getElementById('logsFilterInput').value.toLowerCase();
    const rows = document.querySelectorAll('#logsTable tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filterInput) ? '' : 'none';
    });
  }
  
  function logMissingFeatures(productCode, vendor, category, missingFeatures, quantity) {
  }
}