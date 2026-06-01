const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { notifyError } = require('../utils/errorNotifier');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

router.get('/car-requests/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;

        const { data, error } = await supabase
            .from('car_requests')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, requests: data });
    } catch (error) {
        console.error('Error fetching car requests:', error);
        await notifyError('Car Requests: Get By ChatId Error', error.message, {
            endpoint: req.path,
            method: req.method,
            chatId: req.params.chatId,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/check-car-availability', async (req, res) => {
    try {
        const { car, request_date, time_from, time_to, excludeRequestId } = req.body;

        let query = supabase
            .from('car_requests')
            .select('*')
            .eq('car', car)
            .eq('request_date', request_date)
            .or(`time_from.lte.${time_to},time_to.gte.${time_from}`);

        if (excludeRequestId) {
            query = query.neq('id', excludeRequestId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const available = data.length === 0;

        res.json({ available });
    } catch (error) {
        console.error('Error checking car availability:', error);
        await notifyError('Car Requests: Check Availability Error', error.message, {
            endpoint: req.path,
            method: req.method,
            body: req.body,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ available: false, error: error.message });
    }
});

router.post('/car-requests', async (req, res) => {
    try {
        const { car, chat_id, request_date, time_from, time_to, comment } = req.body;

        const { data, error } = await supabase
            .from('car_requests')
            .insert([{ car, chat_id, request_date, time_from, time_to, comment }])
            .select();

        if (error) throw error;

        res.json({ success: true, request: data[0] });
    } catch (error) {
        console.error('Error creating car request:', error);
        await notifyError('Car Requests: Create Error', error.message, {
            endpoint: req.path,
            method: req.method,
            body: req.body,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/car-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { car, request_date, time_from, time_to, comment } = req.body;

        const { data, error } = await supabase
            .from('car_requests')
            .update({ car, request_date, time_from, time_to, comment })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, request: data[0] });
    } catch (error) {
        console.error('Error updating car request:', error);
        await notifyError('Car Requests: Update Error', error.message, {
            endpoint: req.path,
            method: req.method,
            requestId: req.params.id,
            body: req.body,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/car-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('car_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting car request:', error);
        await notifyError('Car Requests: Delete Error', error.message, {
            endpoint: req.path,
            method: req.method,
            requestId: req.params.id,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/all-car-requests', async (req, res) => {
    try {
        const { data: carRequests, error: carError } = await supabase
            .from('car_requests')
            .select('*')
            .order('request_date', { ascending: true });

        if (carError) throw carError;

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('chat_id, user_name');

        if (usersError) throw usersError;

        const userMap = {};
        users.forEach(user => {
            userMap[user.chat_id] = user.user_name;
        });

        const requestsWithUserNames = carRequests.map(request => ({
            ...request,
            user_name: userMap[request.chat_id] || 'Неизвестно'
        }));

        res.json({ success: true, requests: requestsWithUserNames });
    } catch (error) {
        console.error('Error fetching all car requests:', error);
        await notifyError('Car Requests: Get All Error', error.message, {
            endpoint: req.path,
            method: req.method,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;