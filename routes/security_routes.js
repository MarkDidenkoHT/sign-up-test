const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { requireRole } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const SECURITY_ROLES = ['admin', 'security'];

router.get('/holidays', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка при загрузке праздничных дней' });
        }

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/security-report/save', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { user, month, comment, violations, requests } = req.body;

        if (!user || !month) {
            return res.status(400).json({ error: 'Missing required fields: user, month' });
        }

        const { data: existing, error: fetchError } = await supabase
            .from('security_report')
            .select('*')
            .eq('user', user)
            .eq('month', month)
            .maybeSingle();

        if (fetchError) {
            console.error(fetchError);
            return res.status(500).json({ error: 'Ошибка получения отчета' });
        }

        let result;

        if (existing) {
            const { data, error } = await supabase
                .from('security_report')
                .update({ comment, violations, requests })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('security_report')
                .insert({ user, month, comment, violations, requests })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json({ success: true, report: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/security-report', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { month, id } = req.query;

        let query = supabase.from('security_report').select('*');
        if (month) query = query.eq('month', month);
        if (id) query = query.eq('id', id);

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка получения отчетов' });
        }

        res.json({ success: true, reports: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/security-report/:id', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('security_report')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка получения отчета' });
        }

        res.json({ success: true, report: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/security-report/:id', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        if (!id || !comment) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('security_report')
            .update({ comment })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка при обновлении отчета' });
        }

        res.json({ success: true, report: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/security-report/:id', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Missing report ID' });
        }

        const { error } = await supabase
            .from('security_report')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка при удалении отчета' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/security-report/send', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { year, month } = req.body;

        if (!year || !month) {
            return res.status(400).json({ error: 'Missing year or month' });
        }

        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

        const { data: reports, error } = await supabase
            .from('security_report')
            .select('*')
            .eq('month', yearMonth);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка получения отчетов' });
        }

        const filteredReports = (reports || []).filter(
            r => r.comment && r.comment.trim() !== ''
        );

        if (filteredReports.length === 0) {
            return res.status(400).json({ error: 'Нет отчетов с комментариями для отправки' });
        }

        let message = `Данные о депремировании за ${month}.${year}:\n\n`;
        filteredReports.forEach(r => {
            message += `${r.user}: ${r.comment}\n`;
        });

        const tgResponse = await fetch(`${process.env.BOT_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.REPORT_CHAT_ID,
                text: message
            })
        });

        if (!tgResponse.ok) {
            const errText = await tgResponse.text();
            console.error(errText);
            return res.status(500).json({ error: 'Ошибка при отправке в Telegram' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/hikvision/save', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const { id, employee_id, first_name, last_name, access_date, arrive_time, leave_time, comment, resolved, device_name } = req.body;

        let result;

        if (id) {
            const updateData = { arrive_time, leave_time, comment };
            if (resolved === true) updateData.resolved = true;
            if (device_name) updateData.device_name = device_name;

            const { data, error } = await supabase
                .from('hikvision')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            const recordData = {
                employee_id,
                first_name,
                last_name,
                access_date,
                arrive_time,
                leave_time,
                comment,
                device_name
            };
            if (resolved === true) recordData.resolved = true;

            const { data, error } = await supabase
                .from('hikvision')
                .insert(recordData)
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json({ success: true, record: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/security-data', requireRole(...SECURITY_ROLES), async (req, res) => {
    try {
        const q = {
            year: Number(req.query.year),
            month: Number(req.query.month),
            department: (req.query.department || '').trim()
        };

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

        let hikvisionUrl =
            `${base}/hikvision?access_date=gte.${startDate}&access_date=lte.${endDate}` +
            `&order=access_date.asc,employee_id.asc`;

        if (q.department === 'Офис') {
            hikvisionUrl += `&device_name=eq.Office controller`;
        } else if (q.department === 'Фабрика') {
            hikvisionUrl += `&device_name=eq.mebelnaya`;
        } else if (q.department === 'Склад') {
            hikvisionUrl += `&device_name=eq.Sklad`;
        }

        let usersUrl =
            `${base}/users?select=id_1c,chat_id,user_name,time_arrive,time_leave,notify_violations,user_department`;

        if (q.department) {
            usersUrl += `&user_department=eq.${encodeURIComponent(q.department)}`;
        }

        const requestsDatesUrl =
            `${base}/requests_dates?select=request_id,date` +
            `&date=gte.${startDate}&date=lte.${endDate}`;

        const scheduleUrl =
            `${base}/schedule?month->>year=eq.${q.year}&month->>month=eq.${q.month}`;

        const [hikvision, users, requestsDates, schedule] = await Promise.all([
            pull(hikvisionUrl),
            pull(usersUrl),
            pull(requestsDatesUrl),
            pull(scheduleUrl)
        ]);

        const userIds = new Set(users.map(u => u.id_1c));

        let requestsInfo = [];
        const requestIds = [...new Set(requestsDates.map(r => r.request_id))];

        if (requestIds.length > 0) {
            const ids = requestIds.join(',');
            const requestsInfoUrl =
                `${base}/requests_info?select=chat_id,request_id,status,request_type` +
                `&request_id=in.(${ids})`;

            requestsInfo = await pull(requestsInfoUrl);
        }

        const filteredHikvision = Array.isArray(hikvision)
            ? hikvision.filter(row => userIds.has(row.last_name))
            : [];

        res.json({
            hikvision: filteredHikvision,
            users,
            requestsInfo,
            requestsDates,
            schedule
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Failed to load security data',
            details: err.message
        });
    }
});

module.exports = router;