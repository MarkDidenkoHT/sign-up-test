export async function loadModule(container) {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .feedback-body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f9f9f9;
      line-height: 1.6;
    }
    
    .main-app-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .main-app-header {
      margin-bottom: 30px;
    }
    
    .main-app-title {
      color: #333;
      margin-bottom: 20px;
      font-size: 28px;
    }
    
    .main-app-controls-container {
      margin-bottom: 25px;
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .feedback-controls-row {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
    }
    
    .feedback-label {
      font-weight: bold;
      margin-right: 10px;
    }
    
    .feedback-select {
      min-width: 200px;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid #ddd;
      font-size: 14px;
    }
    
    .main-app-controls-button {
      padding: 10px 15px;
      margin-right: 10px;
      border-radius: 6px;
      border: 1px solid #ddd;
      font-size: 14px;
      background: #f0f0f0;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .main-app-controls-button.active {
      background: #4CAF50;
      color: white;
    }
    
    .main-app-controls-button:hover {
      background: #e0e0e0;
    }
    
    .main-app-controls-button.active:hover {
      background: #3e8e41;
    }
    
    .feedback-section {
      margin-bottom: 30px;
    }
    
    .feedback-section h2 {
      margin-top: 40px;
      color: #444;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      font-size: 24px;
    }
    
    .feedback-container {
      border: 1px solid #ddd;
      background: #fff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .feedback-item-row {
      margin-bottom: 8px;
      display: flex;
    }
    
    .feedback-item-label {
      font-weight: bold;
      min-width: 100px;
      color: #555;
    }
    
    .feedback-item-value {
      flex: 1;
    }
    
    .feedback-hidden {
      display: none;
    }
    
    .feedback-rating {
      display: inline-flex;
      align-items: center;
    }
    
    .feedback-rating-stars {
      color: #ff9800;
      letter-spacing: 2px;
      margin-right: 5px;
    }
    
    .feedback-empty-value {
      color: #999;
      font-style: italic;
    }
    
    .feedback-message-content {
      white-space: pre-line;
      background: #f8f8f8;
      padding: 10px;
      border-radius: 4px;
      margin-top: 5px;
      border-left: 3px solid #ddd;
    }
    
    .feedback-loading {
      text-align: center;
      padding: 20px;
      font-style: italic;
      color: #666;
    }
    
    .feedback-error {
      background-color: #f2dede;
      color: #a94442;
      border: 1px solid #ebccd1;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
    }
  `;
  document.head.appendChild(styleEl);

  container.innerHTML = `
    <div class="main-app-container feedback-body">
      <header class="shop-messaging-header">
        <h1 class="shop-messaging-title">Данные обратной связи</h1>
        <p class="shop-messaging-subtitle"> </p>
      </header>
      
      <div class="main-app-controls-container">
        <div class="feedback-controls-row">
          <label for="restaurant-select" class="feedback-label">Ресторан:</label>
          <select id="restaurant-select" class="feedback-select">
            <option value="casta">Casta и Toscana</option>
            <option value="gruzia">Gruzia</option>
          </select>
        </div>
        <div class="feedback-controls-row">
          <button id="toggleFeedbacks" class="main-app-controls-button active">Отзывы с сайта</button>
          <button id="toggleOrderReviews" class="main-app-controls-button active">Отзывы с приложения</button>
        </div>
      </div>

      <div id="feedbacks-section" class="feedback-section">
        <h2>Отзывы с сайта</h2>
        <div id="feedbacks" class="feedback-loading">Загрузка...</div>
      </div>

      <div id="order-reviews-section" class="feedback-section">
        <h2>Отзывы с приложения</h2>
        <div id="orderReviews" class="feedback-loading">Загрузка...</div>
      </div>
    </div>
  `;

  // Restaurant credentials
  const credentials = {
    casta: {
      domain: 'casta.md',
      consumerKey: 'ck_cd1ac277950e90552ce6c1bc683e32b20fbb111f',
      consumerSecret: 'cs_c4e94e4e0c1a3e2a3f3c0658d7d936aedfae3c1b'
    },
    gruzia: {
      domain: 'gruzia.md',
      consumerKey: 'ck_7d70cdab0edaf96a89a84523c19a7324a4952357',
      consumerSecret: 'cs_f74b4c9bde95bd182255b777cbeec8be580e6722'
    }
  };

  // Module state
  const moduleState = {
    currentRestaurant: 'casta',
    authHeader: '',
    feedbacks: [],
    orderReviews: []
  };

  // DOM elements
  const elements = {
    restaurantSelect: document.getElementById('restaurant-select'),
    toggleFeedbacksBtn: document.getElementById('toggleFeedbacks'),
    toggleOrderReviewsBtn: document.getElementById('toggleOrderReviews'),
    feedbacksSection: document.getElementById('feedbacks-section'),
    orderReviewsSection: document.getElementById('order-reviews-section'),
    feedbacksContainer: document.getElementById('feedbacks'),
    orderReviewsContainer: document.getElementById('orderReviews')
  };

  // Update authorization header
  function updateAuthHeader() {
    const creds = credentials[moduleState.currentRestaurant];
    moduleState.authHeader = 'Basic ' + btoa(creds.consumerKey + ':' + creds.consumerSecret);
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return '<span class="feedback-empty-value">—</span>';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  }

  // Create feedback item row
  function createFeedbackItem(label, value, isMessage = false) {
    const div = document.createElement('div');
    div.className = 'feedback-item-row';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'feedback-item-label';
    labelSpan.textContent = label + ':';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'feedback-item-value';
    
    if (!value && value !== 0) {
      valueSpan.innerHTML = '<span class="feedback-empty-value">—</span>';
    } else if (isMessage) {
      valueSpan.innerHTML = `<div class="feedback-message-content">${value}</div>`;
    } else {
      valueSpan.textContent = value;
    }
    
    div.appendChild(labelSpan);
    div.appendChild(valueSpan);
    return div;
  }

  // Display rating with stars
  function displayRating(rating) {
    if (rating === null || rating === undefined) return '<span class="feedback-empty-value">—</span>';
    
    const starCount = Math.min(5, Math.max(0, Math.round(rating)));
    const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
    
    return `<span class="feedback-rating">
      <span class="feedback-rating-stars">${stars}</span>
      <span>(${rating})</span>
    </span>`;
  }

  // Display single feedback item
  function displayFeedback(item, container) {
    const div = document.createElement('div');
    div.className = 'feedback-container';
    
    // Common fields
    div.appendChild(createFeedbackItem('Дата', formatDate(item.date || item.date_created)));
    
    // Name handling
    let displayName = item.name || item.author || '';
    if (displayName === 'Доставка адрес') {
      displayName = '<span class="feedback-empty-value">Доставка адрес</span>';
    }
    div.appendChild(createFeedbackItem('Имя', displayName));
    
    // Contact info
    div.appendChild(createFeedbackItem('Email', item.email));
    div.appendChild(createFeedbackItem('Телефон', item.phone));
    
    // Waiter field
    if (item.waiter) {
      div.appendChild(createFeedbackItem('Официант', item.waiter));
    }
    
    // Content handling
    if (item.message) {
      div.appendChild(createFeedbackItem('Сообщение', item.message, true));
    }
    
    if (item.review) {
      div.appendChild(createFeedbackItem('Отзыв', item.review, true));
    }
    
    // Rating
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'feedback-item-row';
    ratingDiv.innerHTML = `
      <span class="feedback-item-label">Рейтинг:</span>
      <span class="feedback-item-value">${displayRating(item.rating)}</span>
    `;
    div.appendChild(ratingDiv);
    
    container.appendChild(div);
  }

  // Fetch data from API
  async function fetchData(endpoint, targetContainer, label) {
    const baseUrl = `https://${credentials[moduleState.currentRestaurant].domain}/wp-json/wc/v3/`;
    const url = baseUrl + endpoint;
    const headers = new Headers({
      'Authorization': moduleState.authHeader
    });

    try {
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error('Ошибка загрузки ' + label);
      
      const data = await response.json();
      targetContainer.innerHTML = '';

      if (!data.length) {
        targetContainer.innerHTML = '<div class="feedback-container">Нет данных.</div>';
        return;
      }

      // Parse feedbacks if they come as JSON strings
      let processedData = data;
      if (label === 'Feedbacks' && typeof data[0] === 'string') {
        try {
          processedData = data.map(item => {
            try {
              return JSON.parse(item);
            } catch (e) {
              return { message: item }; // Fallback for invalid JSON
            }
          });
        } catch (e) {
          console.error('Error parsing feedback JSON:', e);
        }
      }

      processedData.forEach(item => {
        // For feedbacks that come as objects with string properties
        if (typeof item === 'object' && item.title && item.title.includes('«') && !item.name) {
          try {
            // Extract name from title if it's in the format "Имя: «Name»"
            const nameMatch = item.title.match(/Имя: «([^»]+)»/);
            if (nameMatch) item.name = nameMatch[1];
          } catch (e) {
            console.error('Error parsing feedback title:', e);
          }
        }
        
        // Clean up "Доставка адрес" names
        if (item.name === 'Доставка адрес') {
          item.name = '';
        }
        
        displayFeedback(item, targetContainer);
      });

      // Store data in module state
      if (label === 'Feedbacks') {
        moduleState.feedbacks = processedData;
      } else {
        moduleState.orderReviews = processedData;
      }

    } catch (error) {
      targetContainer.innerHTML = `
        <div class="feedback-error">
          <strong>Ошибка:</strong> ${error.message}
        </div>
      `;
      console.error('Ошибка загрузки:', error);
    }
  }

  // Load all data
  function loadData() {
    fetchData('feedbacks', elements.feedbacksContainer, 'Feedbacks');
    fetchData('order-reviews', elements.orderReviewsContainer, 'Order Reviews');
  }

  // Toggle section visibility
  function toggleSection(section, button) {
    section.classList.toggle('feedback-hidden');
    button.classList.toggle('active');
  }

  // Initialize the module
  function init() {
    // Set initial auth header
    updateAuthHeader();

    // Set up event listeners
    elements.toggleFeedbacksBtn.addEventListener('click', () => {
      toggleSection(elements.feedbacksSection, elements.toggleFeedbacksBtn);
    });

    elements.toggleOrderReviewsBtn.addEventListener('click', () => {
      toggleSection(elements.orderReviewsSection, elements.toggleOrderReviewsBtn);
    });

    elements.restaurantSelect.addEventListener('change', (e) => {
      moduleState.currentRestaurant = e.target.value;
      updateAuthHeader();
      
      // Show loading state
      elements.feedbacksContainer.innerHTML = '<div class="feedback-loading">Загрузка...</div>';
      elements.orderReviewsContainer.innerHTML = '<div class="feedback-loading">Загрузка...</div>';
      
      loadData();
    });

    // Initial data load
    loadData();
  }

  // Start the module
  init();
}