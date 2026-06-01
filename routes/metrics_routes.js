const express = require('express');
const router = express.Router();
const { notifyError } = require('../utils/errorNotifier');

router.all('/metrica', async (req, res) => {
    try {
        const params = req.method === 'GET' ? req.query : (req.body.params || {});
        const query = new URLSearchParams(params).toString();
        const fullUrl = `https://api-metrica.yandex.net/stat/v1/data?${query}`;

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `OAuth ${process.env.YANDEX_METRICA_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            await notifyError('Metrica API Error', `HTTP ${response.status}: ${errText}`, {
                endpoint: req.path,
                method: req.method,
                status: response.status,
                query,
                ip: req.ip
            });
            return res.status(response.status).json({ error: errText });
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Metrica proxy error:', err);
        await notifyError('Metrica Proxy Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;