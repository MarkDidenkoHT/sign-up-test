const express = require('express');
const router = express.Router();
const { notifyError } = require('../utils/errorNotifier');
const { requireRole } = require('../middleware/auth');

const AEO_ROLES = ['admin', 'content'];

router.post('/mistral/generate', requireRole(...AEO_ROLES), async (req, res) => {
    const { messages, max_tokens = 1000, use_secondary_key = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        await notifyError('OpenRouter: API Key Not Configured', 'OPENROUTER_API_KEY is not set on server', {
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            use_secondary_key
        });
        return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://hi-tech.md',
                'X-Title': 'hi-tech SEO generator'
            },
            body: JSON.stringify({ model: 'deepseek/deepseek-v4-flash:free', max_tokens, messages, temperature: 0.9 })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'OpenRouter API error' });
        }

        const content = data.choices?.[0]?.message?.content || '';
        res.json({ success: true, content });

    } catch (err) {
        await notifyError('OpenRouter: Generate Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ error: err.message });
    }
});

router.post('/gemma/generate', requireRole(...AEO_ROLES), async (req, res) => {
    const { messages, max_tokens = 1000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        await notifyError('OpenRouter: API Key Not Configured', 'OPENROUTER_API_KEY is not set on server', {
            endpoint: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://hi-tech.md',
                'X-Title': 'hi-tech SEO generator'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-v4-flash:free',
                stream: false,
                temperature: 1,
                max_tokens,
                messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'OpenRouter API error' });
        }

        const content = data.choices?.[0]?.message?.content?.trim() || '';
        res.json({ success: true, content });

    } catch (err) {
        await notifyError('OpenRouter: Generate Error', err.message, {
            endpoint: req.path,
            method: req.method,
            stack: err.stack,
            ip: req.ip
        });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;