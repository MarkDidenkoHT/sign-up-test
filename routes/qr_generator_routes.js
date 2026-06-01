const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ALLOWED_IMAGE_SIGNATURES = [
    { mime: 'image/jpeg', ext: 'jpg',  bytes: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/png',  ext: 'png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: 'image/gif',  ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
    { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectImageType(buffer) {
    for (const sig of ALLOWED_IMAGE_SIGNATURES) {
        if (sig.bytes.every((b, i) => buffer[i] === b)) return sig;
    }
    return null;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

function isValidId(val) {
    return /^\d{1,20}$/.test(String(val));
}

async function getUserName(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_name')
            .eq('chat_id', String(userId))
            .single();
        if (error || !data) return String(userId);
        return data.user_name || String(userId);
    } catch (_) {
        return String(userId);
    }
}

router.get('/qr-codes', async (req, res) => {
    const userId = req.session.user_chat_id;
    try {
        const { data, error } = await supabase
            .from('qr_codes')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ codes: data });
    } catch (err) {
        console.error('QR get all error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/qr-codes/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user_chat_id;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });
    try {
        const { data, error } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        if (String(data.created_by) !== String(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ code: data });
    } catch (err) {
        console.error('QR get by id error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/qr-codes/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user_chat_id;
    const { qr_description } = req.body;

    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!qr_description || typeof qr_description !== 'string') {
        return res.status(400).json({ error: 'Missing qr_description field' });
    }

    try {
        const { data: record, error: fetchError } = await supabase
            .from('qr_codes')
            .select('created_by')
            .eq('id', id)
            .single();
        if (fetchError) throw fetchError;
        if (!record) return res.status(404).json({ error: 'Not found' });
        if (String(record.created_by) !== String(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data, error } = await supabase
            .from('qr_codes')
            .update({ qr_description: qr_description.trim().slice(0, 500) })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        res.json({ success: true, code: data });
    } catch (err) {
        console.error('QR patch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/qr-codes/upload', upload.single('file'), async (req, res) => {
    const userId = req.session.user_chat_id;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const qrUrl = typeof req.body.qr_url === 'string' ? req.body.qr_url.trim() : '';
    const qrDescription = typeof req.body.qr_description === 'string'
        ? req.body.qr_description.trim().slice(0, 500)
        : 'Без названия';

    if (!qrUrl) return res.status(400).json({ error: 'Missing qr_url field' });

    const detected = detectImageType(req.file.buffer);
    if (!detected) {
        return res.status(400).json({ error: 'Invalid image file' });
    }

    try {
        const fileName = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${detected.ext}`;

        const { error: uploadError } = await supabase.storage
            .from('qr_codes')
            .upload(fileName, req.file.buffer, {
                contentType: detected.mime,
                upsert: false,
            });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('qr_codes')
            .getPublicUrl(fileName);

        const { data, error } = await supabase
            .from('qr_codes')
            .insert({
                qr_code_image_url: urlData.publicUrl,
                qr_code_url: qrUrl,
                qr_description: qrDescription,
                created_by: userId,
            })
            .select()
            .single();
        if (error) throw error;

        res.json({ success: true, code: data });
    } catch (err) {
        console.error('QR upload error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/qr-codes/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user_chat_id;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });
    try {
        const { data: record, error: fetchError } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) throw fetchError;
        if (!record) return res.status(404).json({ error: 'Not found' });
        if (String(record.created_by) !== String(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (record.qr_code_image_url) {
            try {
                const url = new URL(record.qr_code_image_url);
                const pathParts = url.pathname.split('/qr_codes/');
                if (pathParts.length === 2) {
                    await supabase.storage.from('qr_codes').remove([pathParts[1]]);
                }
            } catch (_) {}
        }

        const { error } = await supabase
            .from('qr_codes')
            .delete()
            .eq('id', id);
        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('QR delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/qr-codes-users/names', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('chat_id, user_name');
        if (error) throw error;
        const map = {};
        for (const u of data) {
            if (u.chat_id) map[String(u.chat_id)] = u.user_name || u.chat_id;
        }
        res.json({ names: map });
    } catch (err) {
        console.error('QR users names error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;