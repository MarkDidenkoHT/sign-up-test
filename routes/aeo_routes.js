const express = require('express');
const router = express.Router();
const { notifyError } = require('../utils/errorNotifier');
const { requireRole } = require('../middleware/auth');

const AEO_ROLES = ['admin', 'content'];

router.post('/deepseek/generate', requireRole(...AEO_ROLES), async (req, res) => {
    const { messages, max_tokens = 1000, temperature = 0.9 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.DEEPSEEK_API_TOKEN;

    if (!apiKey) {
        await notifyError('DeepSeek: API Key Not Configured', 'DEEPSEEK_API_TOKEN is not set on server', {
            endpoint: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(500).json({ error: 'DeepSeek API key not configured on server' });
    }

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model: 'deepseek-chat', max_tokens, temperature, messages, stream: false })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'DeepSeek API error' });
        }

        const content = data.choices?.[0]?.message?.content?.trim() || '';
        res.json({ success: true, content });

    } catch (err) {
        await notifyError('DeepSeek: Generate Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;