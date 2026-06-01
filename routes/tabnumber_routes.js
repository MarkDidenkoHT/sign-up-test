const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { requireRole } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_ROLES = ['admin', 'shop_director', 'hr'];

const SAFE_USER_SELECT = 'chat_id, user_name, role, access, user_department, user_team, id_1c, time_arrive, time_leave, notify_violations, work_days';

const ALLOWED_USER_FIELDS = new Set([
    'user_name',
    'user_department',
    'user_team',
    'role',
    'chat_id',
    'id_1c',
    'time_arrive',
    'time_leave',
    'access',
    'notify_violations',
    'work_days'
]);

function isValidId(val) {
    return /^\d+$/.test(String(val));
}

function isValidChatId(val) {
    return /^\d{1,20}$/.test(String(val));
}

function isValidDate(val) {
    return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

router.get('/tabnumber-users', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select(SAFE_USER_SELECT)
            .order('user_name');

        if (error) throw error;

        res.json({ users });
    } catch (err) {
        next(err);
    }
});

router.get('/tabnumber-users/:chatId', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { chatId } = req.params;

        if (!isValidChatId(chatId)) {
            return res.status(400).json({ error: 'Invalid chatId' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select(SAFE_USER_SELECT)
            .eq('chat_id', chatId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({ user: user || null });
    } catch (err) {
        next(err);
    }
});

router.patch('/tabnumber-users/:userId', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { field, value } = req.body;
        const modified_by = req.session.user_chat_id;

        if (!isValidId(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        if (!field || !ALLOWED_USER_FIELDS.has(field)) {
            return res.status(400).json({ error: 'Invalid field' });
        }

        let safeValue = value;
        if (field === 'access' || field === 'notify_violations') {
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                return res.status(400).json({ error: 'Invalid value for boolean field' });
            }
            safeValue = value === true || value === 'true';
        } else if (field === 'role') {
            const validRoles = ['new','employee','hr','team_lead','manager','director','content',
                'accountant','security','marketing','category_manager','secretary','revisor',
                'service','shop_director','construction','piaza','casta','zavgar','shop','admin'];
            if (!validRoles.includes(value)) {
                return res.status(400).json({ error: 'Invalid role value' });
            }
        } else if (field === 'chat_id' || field === 'id_1c') {
            if (!isValidChatId(value)) {
                return res.status(400).json({ error: 'Invalid value for ' + field });
            }
        } else if (typeof value === 'string') {
            safeValue = value.trim().slice(0, 500);
        }

        const { data: oldData, error: fetchError } = await supabase
            .from('users')
            .select(SAFE_USER_SELECT)
            .eq('id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        const updateData = {};
        updateData[field] = safeValue;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select();

        if (error) throw error;

        if (field === 'work_days') {
            const { data: userData } = await supabase
                .from('users')
                .select('user_name')
                .eq('id', userId)
                .single();

            if (userData) {
                const { data: modifierData } = await supabase
                    .from('users')
                    .select('user_name')
                    .eq('chat_id', modified_by)
                    .single();

                await supabase
                    .from('schedule_adjustment_logs')
                    .insert({
                        user_chat_id: modified_by,
                        schedule_adjustment_data: {
                            modified_by: modified_by,
                            modified_by_name: modifierData?.user_name || modified_by,
                            user_name: userData.user_name,
                            field: field,
                            old_value: oldData?.[field] || null,
                            new_value: safeValue
                        }
                    });
            }
        }

        res.json({ success: true, user: data?.[0] });
    } catch (err) {
        next(err);
    }
});

router.post('/tabnumber-users', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { user_name, chat_id, id_1c, role, user_department, user_team,
                time_arrive, time_leave, access, notify_violations } = req.body;

        if (!chat_id || !isValidChatId(chat_id)) {
            return res.status(400).json({ error: 'Invalid or missing chat_id' });
        }

        const validRoles = ['new','employee','hr','team_lead','manager','director','content',
            'accountant','security','marketing','category_manager','secretary','revisor',
            'service','shop_director','construction','piaza','casta','zavgar','shop','admin'];

        const userData = {
            chat_id: String(chat_id),
            user_name: typeof user_name === 'string' ? user_name.trim().slice(0, 200) : null,
            id_1c: id_1c && isValidChatId(id_1c) ? String(id_1c) : null,
            role: role && validRoles.includes(role) ? role : 'new',
            user_department: typeof user_department === 'string' ? user_department.trim().slice(0, 100) : null,
            user_team: typeof user_team === 'string' ? user_team.trim().slice(0, 100) : null,
            time_arrive: typeof time_arrive === 'string' ? time_arrive.trim().slice(0, 10) : null,
            time_leave: typeof time_leave === 'string' ? time_leave.trim().slice(0, 10) : null,
            access: access === true || access === 'true',
            notify_violations: notify_violations === true || notify_violations === 'true'
        };

        const { data: existingUser } = await supabase
            .from('users')
            .select('chat_id')
            .eq('chat_id', userData.chat_id)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'User with this chat_id already exists' });
        }

        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();

        if (error) throw error;

        res.json({ success: true, user: data?.[0] });
    } catch (err) {
        next(err);
    }
});

router.get('/tabnumber-schedule', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { year, month } = req.query;

        let query = supabase.from('schedule').select('*');

        if (year && month) {
            const y = parseInt(year);
            const m = parseInt(month);
            if (!Number.isInteger(y) || !Number.isInteger(m) || y < 2000 || y > 2100 || m < 1 || m > 12) {
                return res.status(400).json({ error: 'Invalid year or month' });
            }
            query = query.contains('month', { year: y, month: m });
        }

        const { data: schedule, error } = await query;
        if (error) throw error;

        res.json({ schedule: schedule || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/tabnumber-schedule', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { chat_id, date, status } = req.body;
        const modified_by = req.session.user_chat_id;

        if (!chat_id || !isValidChatId(chat_id)) {
            return res.status(400).json({ error: 'Invalid chat_id' });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
        }

        const safeStatus = status === null || status === ''
            ? null
            : typeof status === 'string' ? status.trim().slice(0, 50) : null;

        const dateYear = parseInt(date.split('-')[0]);
        const dateMonth = parseInt(date.split('-')[1]);

        const { data: existing } = await supabase
            .from('schedule')
            .select('*')
            .eq('chat_id', chat_id)
            .contains('month', { year: dateYear, month: dateMonth })
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Schedule row not found for this user and month' });
        }

        const currentWorkDays = existing.work_days || {};
        const oldStatus = currentWorkDays[date] || null;

        if (!safeStatus) {
            delete currentWorkDays[date];
        } else {
            currentWorkDays[date] = safeStatus;
        }

        const { data, error } = await supabase
            .from('schedule')
            .update({ work_days: currentWorkDays })
            .eq('id', existing.id)
            .select();

        if (error) throw error;

        const { data: modifierData } = await supabase
            .from('users')
            .select('user_name')
            .eq('chat_id', modified_by)
            .single();

        const { data: targetData } = await supabase
            .from('users')
            .select('user_name')
            .eq('chat_id', chat_id)
            .single();

        await supabase
            .from('schedule_adjustment_logs')
            .insert({
                user_chat_id: modified_by,
                schedule_adjustment_data: {
                    modified_by: modified_by,
                    modified_by_name: modifierData?.user_name || modified_by,
                    user_name: targetData?.user_name || chat_id,
                    chat_id: chat_id,
                    date: date,
                    old_status: oldStatus,
                    new_status: safeStatus
                }
            });

        res.json({ success: true, schedule: data?.[0] });
    } catch (err) {
        next(err);
    }
});

router.get('/tabnumber-logs', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
        const { team } = req.query;

        let query = supabase
            .from('schedule_adjustment_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (team) {
            const safeTeam = String(team).trim().slice(0, 100);
            const { data: teamUsers } = await supabase
                .from('users')
                .select('chat_id')
                .eq('user_team', safeTeam);

            const teamChatIds = teamUsers?.map(u => u.chat_id) || [];

            if (teamChatIds.length > 0) {
                query = query.in('user_chat_id', teamChatIds);
            } else {
                return res.json({ logs: [] });
            }
        }

        const { data: logs, error } = await query;

        if (error) throw error;

        res.json({ logs: logs || [] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;