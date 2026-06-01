const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');
const ExcelJS = require('exceljs');

function normalizeShopName(name) {
    return name.trim().toLowerCase();
}

router.post('/send-relocation-mail', async (req, res) => {
    try {
        let relocations = [];
        let shops = [];
        let userEmail = null;

        if (Array.isArray(req.body.relocations)) {
            relocations = req.body.relocations;
        } else if (typeof req.body.relocations === 'string') {
            relocations = JSON.parse(req.body.relocations || '[]');
        }

        if (Array.isArray(req.body.shops)) {
            shops = req.body.shops;
        } else if (typeof req.body.shops === 'string') {
            shops = JSON.parse(req.body.shops || '[]');
        }

        if (req.body.userEmail) userEmail = String(req.body.userEmail).trim();

        if (!relocations.length) return res.status(400).json({ error: 'No relocation data provided' });
        if (!shops.length) return res.status(400).json({ error: 'No shop data provided' });

        const workbook = new ExcelJS.Workbook();

        const shopTasks = {};
        relocations.forEach(r => {
            if (!shopTasks[r.fromShop]) shopTasks[r.fromShop] = { give: [], receive: [] };
            if (!shopTasks[r.toShop]) shopTasks[r.toShop] = { give: [], receive: [] };
            shopTasks[r.fromShop].give.push(r);
            shopTasks[r.toShop].receive.push(r);
        });

        for (const shopName in shopTasks) {
            const tasks = shopTasks[shopName];
            const sheet = workbook.addWorksheet(shopName.substring(0, 31));

            sheet.columns = [
                { header: 'Тип',       key: 'Тип' },
                { header: 'Артикул',   key: 'Артикул' },
                { header: 'Описание',  key: 'Описание' },
                { header: 'Магазин',   key: 'Магазин' },
                { header: 'Количество', key: 'Количество' },
            ];

            tasks.give.forEach(r => sheet.addRow({
                Тип: 'Отдать',
                Артикул: r.article,
                Описание: r.description,
                Магазин: r.toShop,
                Количество: r.amount
            }));

            tasks.receive.forEach(r => sheet.addRow({
                Тип: 'Получить',
                Артикул: r.article,
                Описание: r.description,
                Магазин: r.fromShop,
                Количество: r.amount
            }));
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const attachmentBase64 = Buffer.from(buffer).toString('base64');

        const edgeResp = await fetch('https://diycwsgcxhjizctjftjy.supabase.co/functions/v1/super-processor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment: attachmentBase64, userEmail })
        });

        const edgeResult = await edgeResp.json();

        if (!edgeResp.ok) throw new Error(edgeResult.error || 'Ошибка отправки писем');

        res.json({ success: true, edgeResult });

    } catch (err) {
        console.error('send-relocation-mail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/shops/:shopId', async (req, res) => {
    try {
        const { shopId } = req.params;
        const updatedData = req.body;

        const { data, error } = await supabase
            .from('shops')
            .update(updatedData)
            .eq('id', shopId)
            .select();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        console.error('update shop error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/shop-distribution-settings/:productType', async (req, res) => {
    try {
        const { productType } = req.params;

        const { error } = await supabase
            .from('shop_distribution_settings')
            .delete()
            .eq('product_type', productType);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('delete distribution error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/shop-distribution-settings', async (req, res) => {
    try {
        const payload = req.body;

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ error: 'Нет данных для сохранения' });
        }

        const { data, error } = await supabase
            .from('shop_distribution_settings')
            .upsert(payload, { onConflict: 'product_type' })
            .select();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        console.error('save distribution error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/shop-relocation-settings/:productType', async (req, res) => {
    try {
        const { productType } = req.params;

        const { error } = await supabase
            .from('shop_relocation_settings')
            .delete()
            .eq('product_type', productType);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('delete relocation error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/shop-relocation-settings', async (req, res) => {
    try {
        const payload = req.body;

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ error: 'Нет данных для сохранения' });
        }

        const { data, error } = await supabase
            .from('shop_relocation_settings')
            .upsert(payload, { onConflict: 'product_type' })
            .select();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (err) {
        console.error('save relocation error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/shop-distribution-settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shop_distribution_settings')
            .select('*');

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('get distribution error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/shop-relocation-settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shop_relocation_settings')
            .select('*');

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('get relocation error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;