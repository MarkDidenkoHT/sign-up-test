const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');
const { requireRole } = require('../middleware/auth');
const multer = require('multer');
const crypto = require('crypto');

const RENTAL_ROLES = ['admin', 'hr', 'accountant', 'revisor'];

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

function safeStorageFileName(prefix, ext) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
}

function extractStoragePath(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/rental/');
    if (parts.length === 2 && parts[1]) return parts[1];
  } catch (_) {}
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

router.get('/rental/list', requireRole(...RENTAL_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rental')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Rental list error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/rental/create', requireRole(...RENTAL_ROLES), async (req, res) => {
  try {
    const { rental_data } = req.body;
    const manager_chat_id = req.session.user_chat_id;

    if (!rental_data || !rental_data.title || !rental_data.address) {
      return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }

    const { data, error } = await supabase
      .from('rental')
      .insert({
        rental_data: rental_data,
        active: true,
        manager_chat_id: manager_chat_id
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Rental create error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/rental/update/:id', requireRole(...RENTAL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user_chat_id;
    const userRole = req.session.role;
    const { rental_data, active } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('rental')
      .select('rental_data, manager_chat_id')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    if (userRole !== 'admin' && String(existing.manager_chat_id) !== String(userId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (existing.rental_data?.images && rental_data?.images) {
      const removedImages = existing.rental_data.images.filter(img => !rental_data.images.includes(img));
      for (const imageUrl of removedImages) {
        const storagePath = extractStoragePath(imageUrl);
        if (storagePath) {
          const { error: deleteError } = await supabase.storage.from('rental').remove([storagePath]);
          if (deleteError) console.error('Failed to delete image from storage:', deleteError);
        }
      }
    }

    const updateData = {};
    if (rental_data !== undefined) updateData.rental_data = rental_data;
    if (active !== undefined) updateData.active = active;
    updateData.updated_at = new Date();

    const { data, error } = await supabase
      .from('rental')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Rental update error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/rental/delete/:id', requireRole(...RENTAL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user_chat_id;
    const userRole = req.session.role;

    const { data: existing, error: fetchError } = await supabase
      .from('rental')
      .select('rental_data, manager_chat_id')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    if (userRole !== 'admin' && String(existing.manager_chat_id) !== String(userId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (existing.rental_data?.images) {
      for (const imageUrl of existing.rental_data.images) {
        const storagePath = extractStoragePath(imageUrl);
        if (storagePath) {
          const { error: deleteError } = await supabase.storage.from('rental').remove([storagePath]);
          if (deleteError) console.error('Failed to delete image from storage:', deleteError);
        }
      }
    }

    const { error } = await supabase
      .from('rental')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Rental delete error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/rental/upload-image', requireRole(...RENTAL_ROLES), upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
      return res.status(400).json({ success: false, error: 'Invalid image file' });
    }

    const fileName = safeStorageFileName('rental', detected.ext);

    const { data, error } = await supabase.storage
      .from('rental')
      .upload(fileName, file.buffer, {
        contentType: detected.mime,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Rental upload error:', error);
      return res.status(500).json({ success: false, error: 'Upload failed' });
    }

    const { data: publicData } = supabase.storage
      .from('rental')
      .getPublicUrl(fileName);

    res.json({
      success: true,
      viewLink: publicData.publicUrl,
      path: data.path
    });
  } catch (err) {
    console.error('Rental upload error:', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

router.post('/rental/delete-image', requireRole(...RENTAL_ROLES), async (req, res) => {
  try {
    const { url } = req.body;

    if (url) {
      const storagePath = extractStoragePath(url);
      if (!storagePath) {
        return res.status(400).json({ success: false, error: 'Invalid image URL' });
      }

      const { error } = await supabase.storage
        .from('rental')
        .remove([storagePath]);

      if (error) {
        console.error('Rental delete-image error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;