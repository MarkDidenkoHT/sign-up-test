import { updateSEO, setDefaultSEO } from './shared/seo.js';

const state = {
    chatId: null,
    role: null,
    processes: [],
    activeModule: null,
    menu: [],
    userEmail: null,
    userData: null,
    sidebarCollapsed: false,
    loadedModules: {},
};

const _nativeFetch = window.fetch.bind(window);
window.fetch = function(input, init = {}) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
        init = { ...init, credentials: 'include' };
    }
    return _nativeFetch(input, init);
};

const THEMES = ['dark', 'light'];

function getIconPath(theme, iconName) {
    return `/assets/icons/${theme}/${iconName}.png`;
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeUI(theme);
}

function cycleTheme() {
    const current = localStorage.getItem('theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

function updateThemeUI(theme) {
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    document.querySelectorAll('.mobile-theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    document.querySelectorAll('.login-theme-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    document.querySelectorAll('#appMenuDesktopItems button[data-module-id]').forEach(btn => {
        const moduleId = btn.dataset.moduleId;
        const icon = btn.querySelector('img.menu-item-icon');
        if (icon) {
            icon.src = getIconPath(theme, moduleId);
        }
    });

    const compactBtn = document.getElementById('themeCompactBtn');
    if (compactBtn) {
        const img = compactBtn.querySelector('img');
        if (img) {
            img.src = getIconPath(theme, theme === 'dark' ? 'dark_theme' : 'light_theme');
        }
        compactBtn.title = 'Сменить тему';
    }
}

window.setTheme = setTheme;
window.cycleTheme = cycleTheme;

function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}

function toggleMobileMenu() {
    document.getElementById("appMenuMobileDropdown").classList.toggle("hidden");
    const theme = localStorage.getItem('theme') || 'dark';
    updateThemeUI(theme);
}

function showSidebar() {
    const sidebar = document.getElementById("app-sidebar-container");
    if (sidebar) {
        sidebar.style.display = "block";
    }
}

function hideSidebar() {
    const sidebar = document.getElementById("app-sidebar-container");
    if (sidebar) {
        sidebar.style.display = "none";
    }
}

function showHeader() {
    const headerContainer = document.querySelector('main.app-main > div[style*="max-width: 1600px"]');
    if (headerContainer) {
        headerContainer.style.display = "block";
    }
}

function hideHeader() {
    const headerContainer = document.querySelector('main.app-main > div[style*="max-width: 1600px"]');
    if (headerContainer) {
        headerContainer.style.display = "none";
    }
}

function setActiveMenuItem(moduleId) {
    const desktopButtons = document.querySelectorAll("#appMenuDesktopItems button");
    desktopButtons.forEach(btn => btn.classList.remove("active"));

    const activeButton = document.querySelector(`#appMenuDesktopItems button[data-module-id="${moduleId}"]`);
    if (activeButton) {
        activeButton.classList.add("active");
    }

    state.activeModule = moduleId;
}

document.addEventListener("DOMContentLoaded", async () => {

    if (window.__PUBLIC_TEST_MODE__) return;

    hideSidebar();
    hideHeader();

    const menuToggle = document.getElementById("appMenuToggle");
    if (menuToggle) menuToggle.addEventListener("click", toggleMobileMenu);

    document.querySelectorAll('.mobile-theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateThemeUI(currentTheme);

    await initApp();
});

async function initApp() {
    const loader = document.getElementById("appLoader");
    const main = document.querySelector(".app-main");

    loader.style.display = "flex";
    main.classList.remove("loaded");

    try {
        let credentials = {};

        let initData = null;
        try {
            if (Telegram?.WebApp) {
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
                initData = Telegram.WebApp.initData;
            }
        } catch (e) {
            console.log("Telegram WebApp not available", e);
        }

        if (initData) {
            credentials.init_data = initData;
        }

        let authResult = null;
        if (Object.keys(credentials).length > 0) {
            authResult = await authenticateUser(credentials);
        } else {
            try {
                authResult = await authenticateUser({});
            } catch (err) {
                // no active session
            }
        }

        if (!authResult || !authResult.success) {
            showLoginForm();
            loader.style.display = "none";
            main.classList.add("loaded");
            return;
        }

        await handleAuthResult(authResult);
        loader.style.display = "none";
        main.classList.add("loaded");

    } catch (err) {
        console.error("Init app error:", err);
        loader.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 20px;">
                <h3>Ошибка загрузки</h3>
                <p>${err.message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4B4B4B; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Перезагрузить
                </button>
            </div>
        `;
    }
}

async function authenticateUser(credentials) {
    const response = await fetch("/api/auth-menu-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(credentials).length ? JSON.stringify(credentials) : undefined,
        credentials: "include"
    });

    if (!response.ok) {
        let errorText = "";
        try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || "Unknown error";
        } catch (e) {
            errorText = await response.text();
        }
        throw new Error(`Authentication failed (${response.status}): ${errorText}`);
    }

    return await response.json();
}

async function handleAuthResult(authResult) {
    if (!authResult.success) {
        if (authResult.error === '') {
            return;
        }
    }

    const { user, menu, processes } = authResult;

    state.chatId    = user.chat_id;
    state.role      = user.role;
    state.processes = processes;
    state.menu      = menu;
    state.userEmail = user.email;
    state.userData  = user;

    showSidebar();

    const savedCollapsed = getCookie('sidebarCollapsed');
    state.sidebarCollapsed = savedCollapsed === 'true';

    const sidebar     = document.getElementById('appMenuDesktop');
    const mainContent = document.querySelector('.app-main');

    if (sidebar && state.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.style.marginLeft = '90px';
    } else if (sidebar && !state.sidebarCollapsed) {
        sidebar.classList.remove('collapsed');
        mainContent.style.marginLeft = '250px';
    }

    buildMenuFromState();

    setDefaultSEO();

    const urlParams = new URLSearchParams(window.location.search);
    const prRequestId = urlParams.get('pr');
    const prMessageTs = urlParams.get('msg');

    const testDeepLinkId = urlParams.get('test');
    const testDeepLinkType = urlParams.get('type');

    if (testDeepLinkId && menu.some(item => item.id === 'test_form')) {
        await loadModule('test_form', { deepLinkTestId: testDeepLinkId, deepLinkType: testDeepLinkType });
        return;
    }

    if (testDeepLinkType && menu.some(item => item.id === 'test_form')) {
        await loadModule('test_form', { deepLinkType: testDeepLinkType });
        return;
    }

    const lastOpenedModule = getCookie('lastOpenedModule');

    let moduleToLoad;

    if (lastOpenedModule && menu.some(item => item.id === lastOpenedModule)) {
        moduleToLoad = lastOpenedModule;
    } else {
        moduleToLoad = processes[0];
    }

    if (moduleToLoad) {
        loadModule(moduleToLoad);
    }
}

function buildMenuFromState() {
    const desktopNav = document.getElementById("appMenuDesktopItems");
    const mobileNav  = document.getElementById("appMenuMobileItems");

    desktopNav.innerHTML = "";
    mobileNav.innerHTML  = "";

    for (const menuItem of state.menu) {
        const btnDesktop = createButton(menuItem.id, menuItem.label, true);
        const btnMobile  = createButton(menuItem.id, menuItem.label, false);
        desktopNav.appendChild(btnDesktop);
        mobileNav.appendChild(btnMobile);
    }

    const sidebarToggle = document.getElementById('appSidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    const sidebar = document.getElementById('appMenuDesktop');
    if (sidebar) {
        const currentTheme = localStorage.getItem('theme') || 'dark';

        const fullToggle = document.createElement('div');
        fullToggle.className = 'theme-toggle-full';

        const themeLabel = document.createElement('span');
        themeLabel.className = 'theme-toggle-label';
        themeLabel.textContent = 'Тема';

        const pill = document.createElement('div');
        pill.className = 'theme-pill';

        for (const t of ['dark', 'light']) {
            const btn = document.createElement('button');
            btn.className = 'theme-pill-btn' + (currentTheme === t ? ' active' : '');
            btn.dataset.theme = t;
            btn.title = t === 'dark' ? 'Тёмная' : 'Светлая';

            const img = document.createElement('img');
            img.src = getIconPath(t, t === 'dark' ? 'dark_theme' : 'light_theme');
            img.alt = t === 'dark' ? 'Тёмная' : 'Светлая';
            img.style.width = '16px';
            img.style.height = '16px';

            btn.appendChild(img);
            btn.addEventListener('click', () => setTheme(t));
            pill.appendChild(btn);
        }

        fullToggle.appendChild(themeLabel);
        fullToggle.appendChild(pill);
        sidebar.appendChild(fullToggle);

        const compactToggle = document.createElement('div');
        compactToggle.className = 'theme-toggle-compact';

        const compactBtn = document.createElement('button');
        compactBtn.id = 'themeCompactBtn';
        compactBtn.className = 'theme-compact-btn';
        compactBtn.title = 'Сменить тему';

        const compactImg = document.createElement('img');
        compactImg.src = getIconPath(currentTheme, currentTheme === 'dark' ? 'dark_theme' : 'light_theme');
        compactImg.alt = 'Сменить тему';
        compactImg.style.width = '20px';
        compactImg.style.height = '20px';
        compactBtn.appendChild(compactImg);

        compactBtn.addEventListener('click', cycleTheme);

        compactToggle.appendChild(compactBtn);
        sidebar.appendChild(compactToggle);
    }

    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateThemeUI(currentTheme);
}

function toggleSidebar() {
    const sidebar     = document.getElementById('appMenuDesktop');
    const mainContent = document.querySelector('.app-main');

    if (sidebar) {
        sidebar.classList.toggle('collapsed');

        state.sidebarCollapsed = sidebar.classList.contains('collapsed');
        setCookie('sidebarCollapsed', state.sidebarCollapsed ? 'true' : 'false');

        if (state.sidebarCollapsed) {
            mainContent.style.marginLeft = '90px';
        } else {
            mainContent.style.marginLeft = '250px';
        }
    }
}

function hideMenus() {
    const mobileDropdown = document.getElementById('appMenuToggle');
    if (mobileDropdown) {
        mobileDropdown.classList.add('hidden');
    }
}

function hideAllModuleContainers(exceptName = null) {
    const main = document.getElementById("appMain");
    if (!main) return;
    main.querySelectorAll(".module-container").forEach(div => {
        const modName = div.dataset.moduleName;
        if (modName === exceptName) return;
        const mod = state.loadedModules[modName];
        if (mod && typeof mod.onHide === "function") {
            try { mod.onHide(div); } catch (e) { console.error(e); }
        }
        div.style.display = "none";
    });
}

function showModuleContainer(name) {
    const div = document.getElementById(`module_${name}`);
    if (div) {
        div.style.display = "";
        const mod = state.loadedModules[name];
        if (mod && typeof mod.onShow === "function") {
            try { mod.onShow(div); } catch (e) { console.error(e); }
        }
        return true;
    }
    return false;
}

function showLoginForm() {
    hideSidebar();
    hideHeader();
    const main = document.getElementById("appMain");
    hideAllModuleContainers();
    let loginDiv = document.getElementById("module_login");
    if (!loginDiv) {
        loginDiv = document.createElement("div");
        loginDiv.id = "module_login";
        loginDiv.className = "module-container";
        loginDiv.dataset.moduleName = "login";
        main.appendChild(loginDiv);
    }

    loginDiv.innerHTML = `
        <div class="login-wrapper">
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <img src="https://hi-tech.md/images/m1/app/logo_glowing_animated_2.svg" alt="Hi-Tech Logo" class="login-logo">
                        <h1 class="login-title">Hi-Tech</h1>
                    </div>

                    <h2 class="login-subtitle">Вход в систему</h2>

                    <div id="loginView">
                        <form id="loginForm" class="login-form">
                            <div class="login-form-group">
                                <input
                                    type="text"
                                    id="login_id"
                                    name="login_id"
                                    required
                                    class="login-input"
                                    placeholder="Введите логин"
                                    autocomplete="username"
                                />
                            </div>

                            <div class="login-form-group">
                                <input
                                    type="password"
                                    id="login_password"
                                    name="login_password"
                                    required
                                    class="login-input"
                                    placeholder="Введите пароль"
                                    autocomplete="current-password"
                                />
                            </div>

                            <button type="submit" class="login-submit-btn">
                                Войти
                            </button>
                        </form>

                        <div class="login-forgot-link">
                            <button type="button" id="forgotPasswordBtn" class="login-link-btn">Забыли пароль?</button>
                        </div>
                    </div>

                    <div id="resetStep1View" style="display:none;">
                        <p class="login-reset-hint">Введите ваш логин. Мы отправим код подтверждения в Telegram.</p>
                        <form id="resetStep1Form" class="login-form">
                            <div class="login-form-group">
                                <input
                                    type="text"
                                    id="reset_login_id"
                                    name="reset_login_id"
                                    required
                                    class="login-input"
                                    placeholder="Введите логин"
                                    autocomplete="username"
                                />
                            </div>
                            <button type="submit" class="login-submit-btn">Получить код</button>
                        </form>
                        <div class="login-forgot-link">
                            <button type="button" id="backToLoginBtn1" class="login-link-btn">← Назад</button>
                        </div>
                    </div>

                    <div id="resetStep2View" style="display:none;">
                        <p class="login-reset-hint">Введите код подтверждения, который пришёл вам в Telegram.</p>
                        <form id="resetStep2Form" class="login-form">
                            <div class="login-form-group">
                                <input
                                    type="text"
                                    id="reset_code"
                                    name="reset_code"
                                    required
                                    class="login-input"
                                    placeholder="Введите код"
                                    autocomplete="off"
                                />
                            </div>
                            <button type="submit" class="login-submit-btn">Сбросить пароль</button>
                        </form>
                        <div class="login-forgot-link">
                            <button type="button" id="backToLoginBtn2" class="login-link-btn">← Назад</button>
                        </div>
                    </div>

                    <div id="resetSuccessView" style="display:none;">
                        <p class="login-reset-hint">✅ Новый пароль отправлен администратору. Обратитесь к нему для получения пароля.</p>
                        <div class="login-forgot-link">
                            <button type="button" id="backToLoginBtn3" class="login-link-btn">← Вернуться ко входу</button>
                        </div>
                    </div>

                    <div class="login-theme-toggle">
                        <span class="login-theme-label">Тема:</span>
                        <div class="login-theme-pills">
                            <button type="button" class="login-theme-pill" data-theme="dark" title="Тёмная"><img src="/assets/icons/dark/dark_theme.png" alt="Тёмная" style="width: 16px; height: 16px;"></button>
                            <button type="button" class="login-theme-pill" data-theme="light" title="Светлая"><img src="/assets/icons/light/light_theme.png" alt="Светлая" style="width: 16px; height: 16px;"></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    loginDiv.style.display = "";

    let resetLoginId = null;

    const showView = (id) => {
        ['loginView', 'resetStep1View', 'resetStep2View', 'resetSuccessView'].forEach(v => {
            document.getElementById(v).style.display = v === id ? '' : 'none';
        });
    };

    document.getElementById("loginForm").addEventListener("submit", handleLogin);

    document.getElementById("forgotPasswordBtn").addEventListener("click", () => showView('resetStep1View'));
    document.getElementById("backToLoginBtn1").addEventListener("click", () => showView('loginView'));
    document.getElementById("backToLoginBtn2").addEventListener("click", () => showView('loginView'));
    document.getElementById("backToLoginBtn3").addEventListener("click", () => showView('loginView'));

    document.getElementById("resetStep1Form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Отправка...';
        const loginVal = document.getElementById("reset_login_id").value.trim();
        try {
            await fetch('/api/password-reset/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: loginVal })
            });
            resetLoginId = loginVal;
            showView('resetStep2View');
        } catch (err) {
            alert('Ошибка. Попробуйте позже.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    document.getElementById("resetStep2Form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Проверка...';
        const code = document.getElementById("reset_code").value.trim();
        try {
            const res = await fetch('/api/password-reset/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: resetLoginId, id_1c: code })
            });
            const data = await res.json();
            if (data.success) {
                showView('resetSuccessView');
            } else {
                alert('Неверный код подтверждения.');
            }
        } catch (err) {
            alert('Ошибка. Попробуйте позже.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    document.querySelectorAll('.login-theme-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setTheme(btn.dataset.theme);
        });
    });

    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.querySelectorAll('.login-theme-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}

async function handleLogin(e) {
    e.preventDefault();

    const submitBtn    = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.style.opacity = 0.7;
    submitBtn.textContent = "Вход...";

    const chat_id  = document.getElementById("login_id").value.trim();
    const password = document.getElementById("login_password").value.trim();

    if (!chat_id || !password) {
        alert("Пожалуйста, заполните все поля.");
        resetButton(submitBtn, originalText);
        return;
    }

    try {
        const authResult = await authenticateUser({ chat_id, password });
        await handleAuthResult(authResult);
    } catch (error) {
        alert(`Ошибка входа: ${error.message}`);
        resetButton(submitBtn, originalText);
    }
}

function resetButton(button, originalText) {
    button.disabled = false;
    button.style.opacity = 1;
    button.textContent = originalText;
}

function createButton(id, label, isDesktop = false) {
    const btn = document.createElement("button");

    if (isDesktop) {
        const theme = localStorage.getItem('theme') || 'dark';

        const icon = document.createElement("img");
        icon.src   = getIconPath(theme, id);
        icon.alt   = label;
        icon.className = 'menu-item-icon';

        const textSpan = document.createElement("span");
        textSpan.textContent = label;

        icon.onerror = function() {
            this.style.display = 'none';
            const fallbackSpan = document.createElement('span');
            fallbackSpan.textContent = label.charAt(0).toUpperCase();
            fallbackSpan.style.cssText = 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #e0e0e0; border-radius: 50%; font-weight: bold;';
            this.parentNode.insertBefore(fallbackSpan, this);
            this.remove();
        };

        btn.appendChild(icon);
        btn.appendChild(textSpan);
        btn.setAttribute("data-module-id", id);
        btn.setAttribute("title", label);
    } else {
        btn.textContent = label;
    }

    btn.addEventListener("click", () => {
        loadModule(id);
        if (window.innerWidth < 768) {
            document.getElementById("appMenuMobileDropdown").classList.add("hidden");
        }
    });

    return btn;
}

async function loadModule(name, extraParams = {}) {
    const main = document.getElementById("appMain");
    setActiveMenuItem(name);
    updateSEO(name);
    setCookie('lastOpenedModule', name);
    hideAllModuleContainers(name);

    if (state.chatId && name) {
        try {
            await fetch('/api/track-module-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userChatId: state.chatId,
                    moduleName: name
                })
            });
        } catch (err) {
            console.error('Failed to track module usage:', err);
        }
    }

    if (showModuleContainer(name)) {
        return;
    }

    const container = document.createElement("div");
    container.id = `module_${name}`;
    container.className = "module-container";
    container.dataset.moduleName = name;
    container.style.display = "";
    main.appendChild(container);

    try {
        const module = await import(`./${name}.js`);
        await module.loadModule(container, {
            state,
            chatId:   state.chatId,
            userData: state.userData,
            ...extraParams
        });

        state.loadedModules[name] = module;

        if (typeof module.onShow === "function") {
            try { module.onShow(container); } catch (e) { console.error(e); }
        }
    } catch (err) {
        container.innerHTML = `<p style="color: red;">Ошибка загрузки модуля: ${name}</p>`;
        console.error(err);

        fetch('/api/notify-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `Module Load Failure: ${name}`,
                message: err.message || String(err),
                context: {
                    module: name,
                    stack: err.stack || 'no stack',
                    chatId: state.chatId,
                    role: state.role,
                    url: window.location.href
                }
            })
        }).catch(() => {});
    }
}

async function fetchFromTelegram(path, data = {}) {
    const res = await fetch(`/api/telegram${path}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Telegram API error: ${res.status}`);
    }

    return await res.json();
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('casta')) {
    hideMenus();
    hideSidebar();
    setCookie('lastOpenedModule', 'dish_tasting');
    loadModule('dish_tasting');
}

window.fetchFromTelegram = fetchFromTelegram;
window.state             = state;
window.updateSEO = updateSEO;