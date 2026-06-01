const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { verifyPassword } = require('./utils/password');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { notifyError, createErrorHandler } = require('./utils/errorNotifier');
const { initRealtime } = require('./utils/realtime');
const { initCron, shutdownCron } = require('./utils/cron/cron-index');
const routes = require('./routes');
const { verifySession } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const upload = multer();

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '9h';

const SAFE_USER_FIELDS = 'chat_id, user_name, role, access, user_department, time_arrive, time_leave, notify_violations, id_1c';

function verifyTelegramInitData(initData) {
  if (!initData) return null;

  const tokens = [
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_SHOP_BOT_TOKEN,
  ].filter(Boolean);

  if (tokens.length === 0) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  for (const token of tokens) {
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (expectedHash === hash) {
      try {
        return JSON.parse(params.get('user'));
      } catch {
        return null;
      }
    }
  }

  return null;
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const forwardedIps = Array.isArray(forwarded)
      ? forwarded
      : String(forwarded).split(',');
    const firstIp = forwardedIps
      .map(ip => String(ip).trim())
      .find(Boolean);
    if (firstIp) {
      return firstIp.replace(/^::ffff:/, '');
    }
  }

  const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip;
  return remoteAddress ? String(remoteAddress).replace(/^::ffff:/, '') : null;
};

const notifyErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' }
});

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use((req, res, next) => helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "https://telegram.org",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://cdn.sheetjs.com",
        "https://cdn-ru.bitrix24.ru",
        "https://api-maps.yandex.ru",
        "https://yandex.ru",
        "https://maps.yandex.ru",
        "https://suggest-maps.yandex.ru",
        "https://*.yandex.net",
        "https://*.yandex.ru",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com", 
        "https://cdn.jsdelivr.net",
        "https://api-maps.yandex.ru",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "blob:",
        "https://*.yandex.ru",
        "https://*.yandex.net",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      connectSrc: [
        "'self'", 
        "https:", 
        "data:", 
        "blob:",
        "wss:",
        "ws:",
        "https://script.google.com",
        "https://*.googleusercontent.com",
        "https://*.yandex.ru",
        "https://*.yandex.net",
        "https://yandex.ru",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      workerSrc: ["'self'", "blob:"],
      frameSrc: [
        "'self'",
        "https://yandex.ru",
        "https://*.yandex.ru",
        "https://yastatic.net",
        "https://*.yastatic.net"
      ],
      childSrc: [
        "'self'"
      ]
    },
  },
})(req, res, next));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.error('FATAL: ALLOWED_ORIGINS is not set. Server will not start.');
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/utils/sounds.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'utils', 'sounds.js'));
});

app.post('/api/auth-menu-local', loginLimiter, async (req, res) => {
    try {
        const { chat_id, password, init_data } = req.body;

        if (chat_id !== undefined && !/^\d{1,20}$/.test(String(chat_id))) {
            return res.status(400).json({ success: false, error: 'Invalid chat_id' });
        }
        if (password !== undefined && (typeof password !== 'string' || password.length > 200)) {
            return res.status(400).json({ success: false, error: 'Invalid password' });
        }

        let targetChatId = null;
        let verifiedTelegramUser = null;

        if (init_data) {
            const tgUser = verifyTelegramInitData(init_data);
            if (!tgUser || !tgUser.id) {
                return res.status(401).json({ success: false, error: 'Invalid Telegram auth data' });
            }
            verifiedTelegramUser = tgUser;
            targetChatId = String(tgUser.id);
        } else if (chat_id && password) {
            targetChatId = String(chat_id);
        } else {
            const cookieToken = req.cookies?.session_token;
            const authHeader = req.headers['authorization'];
            const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
            const token = cookieToken || headerToken;
            if (token) {
                try {
                    jwt.verify(token, JWT_SECRET);
                    const { data: sessionData, error: sessionError } = await supabase
                        .from('sessions')
                        .select('user_chat_id, fingerprint, role')
                        .eq('jwt_token', token)
                        .eq('active', true)
                        .gte('expired_at', new Date().toISOString())
                        .single();

                    if (!sessionError && sessionData) {
                        targetChatId = sessionData.user_chat_id;
                    }
                } catch (tokenError) {}
            }
        }

        if (!targetChatId) {
            const hadToken = !!(req.cookies?.session_token || req.headers['authorization']);
            const status = hadToken ? 401 : 400;
            return res.status(status).json({ success: false, error: hadToken ? 'Session expired' : 'Missing required parameters' });
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select(SAFE_USER_FIELDS)
            .eq('chat_id', targetChatId)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            throw new Error('Database error');
        }

        if (!userData) {
            if (verifiedTelegramUser) {
                return res.json({ success: false, error: 'registration_required', telegram_user: verifiedTelegramUser });
            } else {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
        }

        if (userData.access === false) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        if (chat_id && password) {
            const { data: passwordRow, error: pwError } = await supabase
                .from('users')
                .select('password')
                .eq('chat_id', targetChatId)
                .single();

            if (pwError || !passwordRow) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            const passwordValid = await verifyPassword(String(password), passwordRow.password || '');
            if (!passwordValid) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
        }

        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('role', userData.role)
            .single();

        if (roleError) {
            if (roleError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Role configuration not found' });
            }
            throw new Error('Database error');
        }

        const processes = roleData.process.split("$").filter(p => p.trim());

        const labels = {
            vacations: "Учет отпусков",
            security: "График посещений",
            tabnumber: "Сотрудники",
            metrics: "Метрика",
            distribution: "Распределение",
            aeo: "АЕО",
            test: "Создание тестов",
            feedback: "Обратная связь",
            stoplist: "Стоплист",
            service: "Отправка сообщений",
            timetable: "Электронный журнал",
            shopapp: "Приложение продавца",
            pricetags: "Задачи по ценникам",
            cars: "Автопарк",
            car_requests: "Запросы на авто",
            parts_checker: "Проверка сборок ПК",
            qr_code_generator: "Генератор QR кодов",
            dish_tasting: "Дегустации",
            car_review: "Отчет по авто",
            image_checker: "Проверка изображений",
            product_reminders: "Уведомления о поступлениях",
            module_stats: "Статистика",
            test_form: "Тестирование",
            rental: "Недвижимость",
        };

        const menu = processes.map(p => ({ id: p, label: labels[p] || p }));

        const isNewLogin = (chat_id && password) || verifiedTelegramUser;
        let sessionToken = req.cookies?.session_token || null;

        if (isNewLogin) {
            const incomingIp = getClientIp(req);
            const incomingUa = req.headers['user-agent'] || null;
            const incomingLang = req.headers['accept-language'] || null;
            const fingerprint = {
                user_agent: incomingUa,
                ip: incomingIp,
                accept_language: incomingLang,
                source: verifiedTelegramUser ? 'telegram' : 'password'
            };

            const { data: sessions } = await supabase
                .from('sessions')
                .select('jwt_token, fingerprint')
                .eq('user_chat_id', targetChatId)
                .eq('active', true)
                .gte('expired_at', new Date().toISOString());

            const matchingSession = (sessions || []).find(session => {
                const fp = session.fingerprint || {};
                const sourceMatches = fp.source === fingerprint.source;
                const uaMatches = fp.user_agent === fingerprint.user_agent;
                const ipMatches = fp.ip === fingerprint.ip;
                return sourceMatches && uaMatches && ipMatches;
            });

            const token = matchingSession
                ? matchingSession.jwt_token
                : jwt.sign({ chat_id: targetChatId, type: 'session' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            if (!matchingSession) {
                await supabase
                    .from('sessions')
                    .update({ active: false })
                    .eq('user_chat_id', targetChatId)
                    .eq('active', true);

                const expiredAt = new Date();
                expiredAt.setHours(expiredAt.getHours() + 9);

                await supabase.from('sessions').insert({
                    jwt_token: token,
                    user_chat_id: targetChatId,
                    expired_at: expiredAt.toISOString(),
                    fingerprint,
                    role: userData.role,
                    active: true
                });
            } else {
                await supabase
                    .from('sessions')
                    .update({ role: userData.role })
                    .eq('jwt_token', matchingSession.jwt_token);
            }

            sessionToken = token;
            res.cookie('session_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 9 * 60 * 60 * 1000
            });
        }

        return res.json({ success: true, user: userData, processes, menu });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/notify-error', notifyErrorLimiter, verifySession, async (req, res) => {
    const title   = typeof req.body.title   === 'string' ? req.body.title.slice(0, 200)   : 'Unknown';
    const message = typeof req.body.message === 'string' ? req.body.message.slice(0, 1000) : '';
    const context = req.body.context && typeof req.body.context === 'object' ? req.body.context : {};
    await notifyError(title, message, context);
    res.json({ ok: true });
});

app.post('/api/logout', verifySession, async (req, res) => {
    try {
        const cookieToken = req.cookies?.session_token;
        const authHeader = req.headers['authorization'];
        const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

        if (token) {
            await supabase
                .from('sessions')
                .update({ active: false })
                .eq('jwt_token', token);
        }

        res.clearCookie('session_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        return res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.use('/api', apiLimiter, routes);

initRealtime();
initCron();
process.on('SIGTERM', shutdownCron);
process.on('SIGINT', shutdownCron);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  next(error);
});

app.use(async (err, req, res, next) => {
  console.error(err.stack);

  const chat_id =
    err._chat_id ??
    req.body?.chat_id ??
    req.body?.chatId ??
    req.body?.requestInfoPayload?.chat_id ??
    req.query?.chat_id ??
    null;

  const pathParts = req.path.split('/').filter(Boolean);
  const module = pathParts[1] || pathParts[0] || req.path;

  const SCRUB_KEYS = ['password', 'token', 'init_data', 'jwt_token', 'secret', 'authorization'];
  const rawBody = req.body || {};
  const scrubbedBody = Object.fromEntries(
    Object.entries(rawBody).map(([k, v]) =>
      SCRUB_KEYS.includes(k.toLowerCase()) ? [k, '[redacted]'] : [k, v]
    )
  );

  await notifyError('Unhandled Error', err.message, {
    endpoint: req.path,
    module,
    method: req.method,
    chat_id,
    body_snapshot: JSON.stringify(scrubbedBody).slice(0, 500),
    ip: req.ip
  });

  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<script data-csp-nonce>', `<script nonce="${res.locals.cspNonce}">`);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});