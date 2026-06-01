const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

router.get('/stop-list', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('stop_list')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;