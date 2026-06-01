'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { hashPassword } = require('../utils/password');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const SHOP_ROLES = ['shop', 'shop_director'];

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';

function generatePassword(length = 12) {
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes).map(b => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

function getBotUrl(role) {
    return SHOP_ROLES.includes(role)
        ? process.env.BOT_API_URL_FOR_SHOP
        : process.env.BOT_API_URL;
}

async function sendBotMessage(chatId, text, role) {
    const botUrl = getBotUrl(role);
    if (!botUrl) throw new Error('Bot URL not configured');
    const response = await fetch(`${botUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
    if (!response.ok) throw new Error(`Bot API error: ${response.status}`);
}

const requestIdLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => `reset_step1_${req.body?.chat_id || req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Try again in an hour.' }
});

const verifyIdLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => `reset_step2_${req.body?.chat_id || req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Try again in an hour.' }
});

router.post('/password-reset/request', requestIdLimiter, async (req, res) => {
    try {
        const { chat_id } = req.body;

        if (!chat_id || !/^\d{1,20}$/.test(String(chat_id))) {
            return res.status(400).json({ success: false, error: 'Invalid chat_id' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, chat_id, role, id_1c, access')
            .eq('chat_id', String(chat_id))
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!user || !user.access || !user.id_1c) {
            return res.json({ success: true });
        }

        try {
            await sendBotMessage(
                user.chat_id,
                `🔐 *Запрос на сброс пароля*\n\nВаш код подтверждения: \`${user.id_1c}\`\n\nВведите его на странице входа для сброса пароля.`,
                user.role
            );
        } catch (botErr) {
            console.error('[password-reset] bot message failed:', botErr.message);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('[password-reset] request error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/password-reset/verify', verifyIdLimiter, async (req, res) => {
    try {
        const { chat_id, id_1c } = req.body;

        if (!chat_id || !/^\d{1,20}$/.test(String(chat_id))) {
            return res.status(400).json({ success: false, error: 'Invalid chat_id' });
        }
        if (!id_1c || typeof id_1c !== 'string' || id_1c.trim().length === 0 || id_1c.length > 50) {
            return res.status(400).json({ success: false, error: 'Invalid id_1c' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, chat_id, user_name, role, id_1c, access')
            .eq('chat_id', String(chat_id))
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!user || !user.access || !user.id_1c) {
            return res.status(401).json({ success: false, error: 'Verification failed' });
        }

        if (user.id_1c.trim() !== id_1c.trim()) {
            return res.status(401).json({ success: false, error: 'Verification failed' });
        }

        const newPassword = generatePassword();
        const hashed = await hashPassword(newPassword);

        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashed })
            .eq('id', user.id);

        if (updateError) throw updateError;

        const adminChatId = process.env.ADMIN_CHAT_ID;
        if (adminChatId) {
            try {
                await sendBotMessage(
                    adminChatId,
                    `🔑 *Сброс пароля*\n\nПользователь: *${user.user_name || user.chat_id}*\nChat ID: \`${user.chat_id}\`\nНовый пароль: \`${newPassword}\``,
                    user.role
                );
            } catch (botErr) {
                console.error('[password-reset] admin notification failed:', botErr.message);
            }
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('[password-reset] verify error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;