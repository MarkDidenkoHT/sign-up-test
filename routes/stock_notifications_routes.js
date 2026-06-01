const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

router.get('/stock-notifications', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stock_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/stock-notifications/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('stock_notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/stock-notifications', async (req, res, next) => {
  try {
    const { product_code, product_id, item_url, product_name, comment } = req.body;

    if (!product_code || !product_id || !item_url || !product_name) {
      return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
    }

    const { data, error } = await supabase
      .from('stock_notifications')
      .insert([{
        product_code,
        product_id,
        item_url,
        product_name,
        comment: comment || null,
        notification_sent: false,
        created_at: new Date().toISOString(),
        last_checked: null,
        notification_sent_at: null
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/stock-notifications/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_code, product_id, item_url, product_name, comment, notification_sent, last_checked, notification_sent_at } = req.body;

    const updateData = {};
    if (product_code !== undefined) updateData.product_code = product_code;
    if (product_id !== undefined) updateData.product_id = product_id;
    if (item_url !== undefined) updateData.item_url = item_url;
    if (product_name !== undefined) updateData.product_name = product_name;
    if (comment !== undefined) updateData.comment = comment;
    if (notification_sent !== undefined) updateData.notification_sent = notification_sent;
    if (last_checked !== undefined) updateData.last_checked = last_checked;
    if (notification_sent_at !== undefined) updateData.notification_sent_at = notification_sent_at;

    const { data, error } = await supabase
      .from('stock_notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/stock-notifications/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('stock_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Уведомление успешно удалено' });
  } catch (err) {
    next(err);
  }
});

router.post('/stock-notifications/fetch-product', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Не указан код товара' });
    }

    let cleanCode = code.trim();

    if (/^\d+$/.test(cleanCode)) {
      if (cleanCode.length <= 6) {
        cleanCode = `Т-${cleanCode.padStart(6, '0')}`;
      } else {
        cleanCode = `Т-${cleanCode}`;
      }
    } else if (cleanCode.startsWith('T-')) {
      cleanCode = 'Т-' + cleanCode.substring(2);
    } else if (!cleanCode.startsWith('Т-')) {
      cleanCode = `Т-${cleanCode}`;
    }

    const response = await fetch(`https://hi-tech.md/product-api.php?code=${encodeURIComponent(cleanCode)}&token=${process.env.HITECH_API_TOKEN}`);
    const data = await response.json();

    if (!data.success) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    const warehouses = data.additional?.warehouses || [];
    const hasStock = warehouses.some(w => w.warehouse_id !== '47' && parseInt(w.amount) > 0);

    res.json({
      success: true,
      data: {
        product_code: data.product_code,
        product_id: data.product_id,
        item_url: data.product_url,
        product_name: data.product.product,
        has_stock: hasStock,
        warehouses: warehouses.filter(w => w.warehouse_id !== '47' && parseInt(w.amount) > 0)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;