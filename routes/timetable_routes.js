const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

const ALLOWED_REQUEST_FIELDS = new Set([
    'chat_id', 'request_id', 'request_type', 'status', 'message_id',
    'accountant_notes', 'comment', 'from_hours', 'to_hours', 'task_group',
    'time_from', 'time_to', 'request_date'
]);

const MANAGER_CHAT_IDS = {};
const DEFAULT_MANAGER_CHAT_ID = process.env.MANAGER_GROUP_CHAT_ID_2;

function getManagerChatId(chatId) {
    return MANAGER_CHAT_IDS[chatId] || DEFAULT_MANAGER_CHAT_ID;
}

function isValidRequestId(val) {
    return typeof val === 'string' && /^[\w\-]{1,100}$/.test(val);
}

function isValidDate(val) {
    return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

router.post('/timetable/notify-manager', async (req, res, next) => {
    try {
        const { data, userData, chatId } = req.body;
        const sessionChatId = req.session.user_chat_id;

        if (String(chatId) !== String(sessionChatId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');

        const managerChatId = getManagerChatId(String(chatId));
        if (!managerChatId) throw new Error('Manager chat ID not configured');

        const sortedDates = [...data.dates].sort();
        const formatDate = (dateStr) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        };
        const formatTime = (t) => t ? t.substring(0, 5) : '—';

        const formattedDates = sortedDates.length === 1
            ? formatDate(sortedDates[0])
            : `${formatDate(sortedDates[0])} — ${formatDate(sortedDates[sortedDates.length - 1])}`;

        const timeInfo = data.fromHours ? ` с ${formatTime(data.fromHours)} до ${formatTime(data.toHours)}` : " (полный день)";
        const typeMap = { vacation: "Отпуск", sickday: "Больничный", work: "По работе", other: "Другое" };

        const message =
            `*Сотрудник:* ${userData?.user_name || "Неизвестно"} (${userData?.user_department || "Неизвестно"})\n` +
            `*Тип запроса:* ${typeMap[data.taskGroup] || "Другое"}\n` +
            `*Даты:* ${formattedDates}${timeInfo}\n` +
            `*Комментарий:* ${data.comment || "Без комментариев"}`;

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: managerChatId,
                text: message,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ Одобрить", callback_data: `approve|${data.requestId}|${chatId}` },
                        { text: "❌ Отклонить", callback_data: `reject|${data.requestId}|${chatId}` }
                    ]]
                }
            })
        });

        const result = await response.json();
        res.json({ success: true, messageId: result.result?.message_id });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/update-manager-message', async (req, res, next) => {
    try {
        const { messageId, data, userData, chatId } = req.body;
        const sessionChatId = req.session.user_chat_id;

        if (String(chatId) !== String(sessionChatId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');

        const managerChatId = getManagerChatId(String(chatId));
        if (!managerChatId) throw new Error('Manager chat ID not configured');

        const sortedDates = [...data.dates].sort();
        const formatDate = (dateStr) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        };
        const formatTime = (t) => t ? t.substring(0, 5) : '—';

        const formattedDates = sortedDates.length === 1
            ? formatDate(sortedDates[0])
            : `${formatDate(sortedDates[0])} — ${formatDate(sortedDates[sortedDates.length - 1])}`;

        const timeInfo = data.fromHours ? ` с ${formatTime(data.fromHours)} до ${formatTime(data.toHours)}` : " (полный день)";
        const typeMap = { vacation: "Отпуск", sickday: "Больничный", work: "По работе", other: "Другое" };

        const message =
            `*Сотрудник:* ${userData?.user_name || "Неизвестно"} (${userData?.user_department || "Неизвестно"})\n` +
            `*Тип запроса:* ${typeMap[data.taskGroup] || "Другое"}\n` +
            `*Даты:* ${formattedDates}${timeInfo}\n` +
            `*Комментарий:* ${data.comment || "Без комментариев"}\n\n*[ОТРЕДАКТИРОВАНО]*`;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: managerChatId,
                message_id: messageId,
                text: message,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ Одобрить", callback_data: `approve|${data.requestId}|${chatId}` },
                        { text: "❌ Отклонить", callback_data: `reject|${data.requestId}|${chatId}` }
                    ]]
                }
            })
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/delete-manager-message', async (req, res, next) => {
    try {
        const { messageId, chatId } = req.body;
        const sessionChatId = req.session.user_chat_id;

        if (String(chatId) !== String(sessionChatId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');

        const managerChatId = getManagerChatId(String(chatId));
        if (!managerChatId) throw new Error('Manager chat ID not configured');

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: managerChatId, message_id: messageId })
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/create-request-info', async (req, res, next) => {
    try {
        const { requestInfoPayload } = req.body;
        const sessionChatId = req.session.user_chat_id;

        if (!requestInfoPayload || typeof requestInfoPayload !== 'object') {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const safePayload = {};
        for (const key of Object.keys(requestInfoPayload)) {
            if (ALLOWED_REQUEST_FIELDS.has(key)) {
                safePayload[key] = requestInfoPayload[key];
            }
        }

        if (String(safePayload.chat_id) !== String(sessionChatId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { data, error } = await supabase
            .from('requests_info')
            .insert(safePayload)
            .select();

        if (error) throw error;

        res.json({ data });
    } catch (err) {
        next(err);
    }
});

router.get('/timetable/user-history/:chatId', async (req, res, next) => {
    try {
        const sessionChatId = req.session.user_chat_id;

        const { data: requestsInfo, error: infoError } = await supabase
            .from('requests_info')
            .select('*')
            .eq('chat_id', sessionChatId);

        if (infoError) throw infoError;

        if (!requestsInfo || requestsInfo.length === 0) {
            return res.json({ success: true, requests: [] });
        }

        const requestIds = requestsInfo.map(r => r.request_id);

        const { data: allDates, error: datesError } = await supabase
            .from('requests_dates')
            .select('*')
            .in('request_id', requestIds);

        if (datesError) throw datesError;

        const datesByRequestId = {};
        (allDates || []).forEach(d => {
            if (!datesByRequestId[d.request_id]) datesByRequestId[d.request_id] = [];
            datesByRequestId[d.request_id].push(d.date);
        });

        const combined = requestsInfo.map(info => ({
            ...info,
            dates_requested: (datesByRequestId[info.request_id] || []).join("$"),
            dates: (datesByRequestId[info.request_id] || []).sort(),
        }));

        res.json({ success: true, requests: combined });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/create-request-date', async (req, res, next) => {
    try {
        const { requestId, date } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });
        if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = await supabase
            .from('requests_dates')
            .insert({ request_id: requestId, date });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/timetable/update-request-message', async (req, res, next) => {
    try {
        const { requestId, messageId } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = await supabase
            .from('requests_info')
            .update({ message_id: messageId })
            .eq('request_id', requestId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/timetable/update-request-info', async (req, res, next) => {
    try {
        const { requestId, payload } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });
        if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const safePayload = {};
        for (const key of Object.keys(payload)) {
            if (ALLOWED_REQUEST_FIELDS.has(key)) safePayload[key] = payload[key];
        }

        const { error } = await supabase
            .from('requests_info')
            .update(safePayload)
            .eq('request_id', requestId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/timetable/delete-request-dates', async (req, res, next) => {
    try {
        const { requestId } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = await supabase
            .from('requests_dates')
            .delete()
            .eq('request_id', requestId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/add-request-date', async (req, res, next) => {
    try {
        const { requestId, date } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });
        if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = await supabase
            .from('requests_dates')
            .insert({ request_id: requestId, date });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.post('/timetable/delete-telegram-message', async (req, res, next) => {
    try {
        const { chatId, messageId } = req.body;

        if (!chatId || !messageId) {
            return res.status(400).json({ error: 'chatId and messageId are required' });
        }

        if (String(chatId) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const response = await fetch(`${process.env.BOT_API_URL}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: Number(chatId),
                message_id: Number(messageId)
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: responseText });
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/timetable/delete-request-info', async (req, res, next) => {
    try {
        const { requestId } = req.body;

        if (!isValidRequestId(requestId)) return res.status(400).json({ error: 'Invalid requestId' });

        const { data: existing } = await supabase
            .from('requests_info')
            .select('chat_id')
            .eq('request_id', requestId)
            .single();

        if (!existing || String(existing.chat_id) !== String(req.session.user_chat_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = await supabase
            .from('requests_info')
            .delete()
            .eq('request_id', requestId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.get('/timetable/attendance-data', async (req, res, next) => {
    try {
        const sessionChatId = req.session.user_chat_id;
        
        if (!sessionChatId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const q = {
            year: Number(req.query.year),
            month: Number(req.query.month)
        };

        if (!q.year || !q.month || q.month < 1 || q.month > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }

        const startDate = new Date(q.year, q.month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(q.year, q.month, 0).toISOString().split('T')[0];

        const base = process.env.SUPABASE_URL;
        const headers = {
            apikey: process.env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Range: '0-1999'
        };

        const pull = async (url) => {
            const resp = await fetch(url, { headers });
            const text = await resp.text();
            const json = text ? JSON.parse(text) : [];
            if (!resp.ok) throw new Error('fetch failed');
            return json;
        };

        const userUrl = `${base}/users?select=id_1c,chat_id,user_name,time_arrive,time_leave,notify_violations,user_department,vacations_available&chat_id=eq.${sessionChatId}`;
        const users = await pull(userUrl);

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = users[0];
        const userId1c = currentUser.id_1c;

        let hikvisionUrl = `${base}/hikvision?access_date=gte.${startDate}&access_date=lte.${endDate}&last_name=eq.${userId1c}&order=access_date.asc`;
        const hikvision = await pull(hikvisionUrl);

        const requestsDatesUrl = `${base}/requests_dates?select=request_id,date&date=gte.${startDate}&date=lte.${endDate}`;
        const requestsDates = await pull(requestsDatesUrl);

        let requestsInfo = [];
        const requestIds = [...new Set(requestsDates.map(r => r.request_id))];

        if (requestIds.length > 0) {
            const ids = requestIds.join(',');
            const requestsInfoUrl = `${base}/requests_info?select=chat_id,request_id,status,request_type&request_id=in.(${ids})&chat_id=eq.${sessionChatId}`;
            requestsInfo = await pull(requestsInfoUrl);
        }

        const scheduleUrl = `${base}/schedule?month->>year=eq.${q.year}&month->>month=eq.${q.month}`;
        const schedule = await pull(scheduleUrl);

        res.json({
            hikvision: Array.isArray(hikvision) ? hikvision : [],
            users: [currentUser],
            requestsInfo,
            requestsDates: requestsDates.filter(r => requestsInfo.some(ri => ri.request_id === r.request_id)),
            schedule: Array.isArray(schedule) ? schedule : []
        });

    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;