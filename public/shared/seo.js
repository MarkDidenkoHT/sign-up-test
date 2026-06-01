const SEO_CONFIG = {
    default: {
        title: 'Hi-Tech - Корпоративная платформа',
        description: 'Комплексное решение для автоматизации бизнес-процессов',
        ogTitle: 'Hi-Tech',
        ogDescription: 'Автоматизация бизнес-процессов',
        ogImage: '/assets/icons/logo_glowing_animated_2.svg'
    },
    
    modules: {
        vacations: {
            title: 'Учет отпусков | Hi-Tech',
            description: 'Контроль отпусков сотрудников',
            ogTitle: 'Учет отпусков',
            ogDescription: 'Контроль отпусков'
        },
        security: {
            title: 'График посещений | Hi-Tech',
            description: 'Контроль доступа и учет посещений',
            ogTitle: 'График посещений',
            ogDescription: 'Контроль доступа сотрудников'
        },
        tabnumber: {
            title: 'Сотрудники | Hi-Tech',
            description: 'База сотрудников и кадровый учет',
            ogTitle: 'Сотрудники',
            ogDescription: 'Кадровый учет и база персонала'
        },
        metrics: {
            title: 'Метрика | Hi-Tech',
            description: 'Яндекс метрика',
            ogTitle: 'Яндекс метрика',
            ogDescription: 'Яндекс метрика'
        },
        distribution: {
            title: 'Распределение | Hi-Tech',
            description: 'Распределение и перемещение товаров между магазинами',
            ogTitle: 'Распределение и перемещение товаров между магазинами',
            ogDescription: 'Распределение и перемещение товаров между магазинами'
        },
        aeo: {
            title: 'АЕО | Hi-Tech',
            description: 'Генерация описания и тэгов для АЕО оптимизации',
            ogTitle: 'Генерация описания и тэгов для АЕО оптимизации',
            ogDescription: 'Генерация описания и тэгов для АЕО оптимизации'
        },
        test: {
            title: 'Создание тестов | Hi-Tech',
            description: 'Конструктор тестов и опросов',
            ogTitle: 'Конструктор тестов',
            ogDescription: 'Создание профессиональных тестов'
        },
        feedback: {
            title: 'Обратная связь | Hi-Tech',
            description: 'Просмотр обратной связи',
            ogTitle: 'Обратная связь',
            ogDescription: 'Просмотр обратной связи'
        },
        stoplist: {
            title: 'Стоплист | Hi-Tech',
            description: 'Просмотр стоплиста продуктов',
            ogTitle: 'Стоплист',
            ogDescription: 'Просмотр стоплиста продуктов'
        },
        service: {
            title: 'Отправка сообщений | Hi-Tech',
            description: 'Уведомления и рассылки',
            ogTitle: 'Сообщения',
            ogDescription: 'Корпоративные коммуникации'
        },
        timetable: {
            title: 'Электронный журнал | Hi-Tech',
            description: 'Электронный журнал',
            ogTitle: 'Электронный журнал',
            ogDescription: 'Электронный журнал'
        },
        shopapp: {
            title: 'Приложение продавца | Hi-Tech',
            description: 'Инструменты для продавцов',
            ogTitle: 'Приложение продавца',
            ogDescription: 'Инструменты для продавцов'
        },
        pricetags: {
            title: 'Задачи по ценникам | Hi-Tech',
            description: 'Задачи по ценникам',
            ogTitle: 'Ценники',
            ogDescription: 'Задачи по ценникам'
        },
        cars: {
            title: 'Автопарк | Hi-Tech',
            description: 'Учет автомобилей',
            ogTitle: 'Автопарк',
            ogDescription: 'Контроль транспорта'
        },
        car_requests: {
            title: 'Запросы на авто | Hi-Tech',
            description: 'Бронирование корпоративного транспорта',
            ogTitle: 'Бронирование авто',
            ogDescription: 'Заявки на автомобили'
        },
        parts_checker: {
            title: 'Проверка сборок ПК | Hi-Tech',
            description: 'Проверка совместимости комплектующих',
            ogTitle: 'Сборка ПК',
            ogDescription: 'Контроль комплектации'
        },
        qr_code_generator: {
            title: 'Генератор QR кодов | Hi-Tech',
            description: 'Создание QR-кодов',
            ogTitle: 'QR коды',
            ogDescription: 'Генерация QR-кодов'
        },
        dish_tasting: {
            title: 'Дегустации | Hi-Tech',
            description: 'Контроль качества продукции',
            ogTitle: 'Дегустации',
            ogDescription: 'Оценка качества'
        },
        car_review: {
            title: 'Отчет по авто | Hi-Tech',
            description: 'Отчетность по использованию авто',
            ogTitle: 'Отчет по авто',
            ogDescription: 'Анализ использования транспорта'
        },
        image_checker: {
            title: 'Проверка изображений | Hi-Tech',
            description: 'Модерация и проверка изображений',
            ogTitle: 'Проверка изображений',
            ogDescription: 'Контроль качества фото'
        },
        product_reminders: {
            title: 'Уведомления о поступлениях | Hi-Tech',
            description: 'Оповещения о поступлении товаров',
            ogTitle: 'Уведомления',
            ogDescription: 'Оповещения о товарах'
        },
        module_stats: {
            title: 'Статистика | Hi-Tech',
            description: 'Статистика использования модулей',
            ogTitle: 'Статистика',
            ogDescription: 'Аналитика использования'
        },
        test_form: {
            title: 'Тестирование | Hi-Tech',
            description: 'Прохождение тестов и опросов',
            ogTitle: 'Тестирование',
            ogDescription: 'Проверка знаний'
        }
    }
};

export function updateSEO(moduleId, customData = null) {
    const config = SEO_CONFIG.modules[moduleId] || SEO_CONFIG.default;
    
    const title = customData?.title || config.title;
    const description = customData?.description || config.description;
    const ogTitle = customData?.ogTitle || config.ogTitle || title;
    const ogDescription = customData?.ogDescription || config.ogDescription || description;
    const ogImage = customData?.ogImage || config.ogImage;
    
    document.title = title;
    
    updateMeta('description', description);
    updateMeta('og:title', ogTitle, 'property');
    updateMeta('og:description', ogDescription, 'property');
    updateMeta('og:image', ogImage, 'property');
    updateMeta('og:type', 'website', 'property');
}

function updateMeta(name, content, attribute = 'name') {
    if (!content) return;
    
    let selector = attribute === 'name' ? `meta[name="${name}"]` : `meta[property="${name}"]`;
    let meta = document.querySelector(selector);
    
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
}

export function setDefaultSEO() {
    updateSEO(null);
}