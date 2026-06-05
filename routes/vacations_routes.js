const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');
const { requireRole } = require('../middleware/auth');

const VACATION_ROLES = ['admin', 'accountant'];

router.post('/vacations/update-requested', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const { requests } = req.body;

        if (!Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const results = [];

        for (const { tabNumber, totalDays } of requests) {
            if (!tabNumber || typeof totalDays !== 'number' || isNaN(totalDays) || totalDays < 0) continue;

            const daysValue = parseFloat(totalDays.toFixed(2));

            const { data: existing, error: selectError } = await supabase
                .from('vacations')
                .select('*')
                .eq('id_1c', String(tabNumber))
                .maybeSingle();

            if (selectError) {
                console.error('Select error:', selectError);
                continue;
            }

            if (existing) {
                const { error: updateError } = await supabase
                    .from('vacations')
                    .update({ Отпуск_Попросил: daysValue })
                    .eq('id_1c', String(tabNumber));

                if (updateError) {
                    console.error(`Update error for ${tabNumber}:`, updateError);
                } else {
                    results.push({ tabNumber, updated: true });
                }
            } else {
                const { error: insertError } = await supabase
                    .from('vacations')
                    .insert({
                        id_1c: String(tabNumber),
                        Отпуск_Попросил: daysValue,
                        Отпуск_Провели: 0,
                        Отпуск_Доступно: 0
                    });

                if (insertError) {
                    console.error(`Insert error for ${tabNumber}:`, insertError);
                } else {
                    results.push({ tabNumber, inserted: true });
                }
            }
        }

        res.json({ success: true, results });
    } catch (err) {
        next(err);
    }
});

router.post('/vacations/correct-available', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const { userName, newValue } = req.body;

        if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid userName' });
        }
        if (newValue === undefined || typeof newValue !== 'number' || isNaN(newValue) || newValue < 0) {
            return res.status(400).json({ error: 'Invalid newValue' });
        }

        const { error } = await supabase
            .from('users')
            .update({ vacations_available: newValue })
            .eq('user_name', userName.trim());

        if (error) throw error;

        res.json({ success: true, userName, newValue });
    } catch (err) {
        next(err);
    }
});

router.post('/vacations/save', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const { requestId, commentValue, totalDays } = req.body;

        if (!requestId) {
            return res.status(400).json({ error: 'requestId is required' });
        }

        const processedCommentValue =
            (commentValue && commentValue.trim() !== '')
                ? commentValue.trim().slice(0, 1000)
                : null;

        const { data: requestData, error: requestError } = await supabase
            .from('requests_info')
            .select('chat_id, accountant_notes')
            .eq('request_id', requestId)
            .single();

        if (requestError) throw requestError;
        if (!requestData) return res.status(404).json({ error: 'Request not found' });

        const { error: updateError } = await supabase
            .from('requests_info')
            .update({ accountant_notes: processedCommentValue })
            .eq('request_id', requestId);

        if (updateError) throw updateError;

        res.json({
            success: true,
            requestId,
            totalDays,
            action: processedCommentValue === null ? 'cleared' : 'set',
            previousComment: requestData.accountant_notes,
            newComment: processedCommentValue
        });

    } catch (err) {
        next(err);
    }
});

router.get('/vacations/requests', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const calculateDays = (a, b) => {
            const start = new Date(a);
            const end = new Date(b);
            let count = 0;
            while (start <= end) { count++; start.setDate(start.getDate() + 1); }
            return count;
        };

        const normalizeTime = (t) => t ? t.substring(0, 5) : null;

        const calculateFraction = (from, to) => {
            const f = normalizeTime(from);
            const t = normalizeTime(to);
            if (!f || !t) return 1;
            if (f === '09:00' && t === '18:00') return 1;
            const [fh, fm] = f.split(':').map(Number);
            const [th, tm] = t.split(':').map(Number);
            const hours = th + tm / 60 - (fh + fm / 60);
            return Math.max(0.1, hours / 9);
        };

        const [reqInfo, reqDates, users] = await Promise.all([
            supabase.from('requests_info').select('chat_id,request_id,time_from,time_to,status,accountant_notes').eq('request_type', 'vacation').eq('status', 'approved'),
            supabase.from('requests_dates').select('request_id,date'),
            supabase.from('users').select('chat_id,user_name,id_1c,vacations_available').eq('access', true)
        ]);

        if (reqInfo.error) throw reqInfo.error;
        if (reqDates.error) throw reqDates.error;
        if (users.error) throw users.error;

        const userMap = Object.fromEntries(
            users.data.map((u) => [
                u.chat_id,
                { name: u.user_name, tabNumber: u.id_1c, vacationsAvailable: u.vacations_available }
            ])
        );

        const dateMap = {};
        reqDates.data.forEach((d) => { (dateMap[d.request_id] ||= []).push(d.date); });

        const requests = reqInfo.data.map((r) => {
            const dates = (dateMap[r.request_id] || []).sort();
            if (!dates.length) return null;
            const u = userMap[r.chat_id];
            if (!u) return null;
            const start = new Date(dates[0]);
            const end = new Date(dates[dates.length - 1]);
            const totalDays = dates.length === 1
                ? calculateFraction(r.time_from, r.time_to)
                : calculateDays(dates[0], dates[dates.length - 1]);
            return {
                id: r.request_id,
                request_id: r.request_id,
                chat_id: r.chat_id,
                userName: u.name,
                tabNumber: u.tabNumber,
                vacations_available: u.vacationsAvailable,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                totalDays: parseFloat(totalDays.toFixed(2)),
                comment: r.accountant_notes || '',
                dates
            };
        }).filter(Boolean);

        const years = Array.from(
            new Set(requests.map((r) => new Date(r.startDate).getFullYear()))
        ).sort((a, b) => b - a);

        res.json({ success: true, data: { requests, years } });

    } catch (err) {
        next(err);
    }
});

router.post('/vacations/bulk-update-available', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const results = [];
        const errors = [];

        for (const { id_1c, newValue } of updates) {
            if (!id_1c || typeof newValue !== 'number' || isNaN(newValue) || newValue < 0) {
                errors.push({ id_1c, error: 'Invalid id_1c or newValue' });
                continue;
            }

            const { error } = await supabase
                .from('users')
                .update({ vacations_available: String(newValue) })
                .eq('id_1c', String(id_1c));

            if (error) {
                console.error(`Bulk update error for id_1c ${id_1c}:`, error);
                errors.push({ id_1c, error: error.message });
            } else {
                results.push({ id_1c, updated: true });
            }
        }

        res.json({ success: true, results, errors });
    } catch (err) {
        next(err);
    }
});

router.post('/vacations/preview-csv', requireRole(...VACATION_ROLES), async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Нет id_1c для поиска' });
        }

        const safeIds = ids.map(id => String(id).trim()).filter(Boolean);

        const { data, error } = await supabase
            .from('users')
            .select('id_1c, user_name, vacations_available')
            .in('id_1c', safeIds);

        if (error) throw error;

        res.json({ success: true, users: data || [] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;