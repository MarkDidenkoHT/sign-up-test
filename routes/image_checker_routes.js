const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { notifyError } = require('../utils/errorNotifier');
const { requireRole } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const IMAGE_CHECKER_ROLES = ['admin', 'content', 'marketing', 'category_manager'];

const isValidSession = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidId = (value) =>
  typeof value === 'string' || typeof value === 'number'
    ? /^\d{1,20}$/.test(String(value))
    : false;

router.get('/image-checker/sessions', requireRole(...IMAGE_CHECKER_ROLES), async (req, res) => {
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('check_images')
      .select('session')
      .order('session', { ascending: false });

    if (sessionsError) throw sessionsError;

    const uniqueSessions = [...new Set((sessions || []).map(s => s.session))];

    const sessionsWithProducts = await Promise.all(
      uniqueSessions.map(async (sessionDate) => {
        const { data: products, error: productsError } = await supabase
          .from('check_images')
          .select('*')
          .eq('session', sessionDate);

        if (productsError) throw productsError;

        return {
          session: sessionDate,
          products: products || []
        };
      })
    );

    res.json({
      success: true,
      data: sessionsWithProducts
    });
  } catch (err) {
    console.error('Error getting sessions:', err);
    await notifyError('Image Checker: Get Sessions Error', err.message, {
      endpoint: req.path,
      method: req.method,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки сессий'
    });
  }
});

router.get('/image-checker/session/:session', requireRole(...IMAGE_CHECKER_ROLES), async (req, res) => {
  try {
    const { session } = req.params;

    if (!isValidSession(session)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный формат сессии'
      });
    }

    const { data, error } = await supabase
      .from('check_images')
      .select('*')
      .eq('session', session)
      .order('product_code', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error('Error getting session products:', err);
    await notifyError('Image Checker: Get Session Products Error', err.message, {
      endpoint: req.path,
      method: req.method,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки товаров сессии'
    });
  }
});

router.post('/image-checker/update-result', requireRole(...IMAGE_CHECKER_ROLES), async (req, res) => {
  try {
    const { id, result } = req.body;

    if (!id || !isValidId(id) || result === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля'
      });
    }

    const { data, error } = await supabase
      .from('check_images')
      .update({
        result: result,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('Error updating product result:', err);
    await notifyError('Image Checker: Update Result Error', err.message, {
      endpoint: req.path,
      method: req.method,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления результата'
    });
  }
});

router.get('/image-checker/categories', requireRole(...IMAGE_CHECKER_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('check_images')
      .select('product_category')
      .not('product_category', 'is', null)
      .not('product_category', 'eq', '');

    if (error) throw error;

    const categories = [...new Set((data || []).map(item => item.product_category))];

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('Error getting categories:', err);
    await notifyError('Image Checker: Get Categories Error', err.message, {
      endpoint: req.path,
      method: req.method,
      stack: err.stack,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки категорий'
    });
  }
});

module.exports = router;