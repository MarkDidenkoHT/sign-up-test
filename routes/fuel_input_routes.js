const express = require('express');
const router = express.Router();

router.post('/update-sheet', async (req, res) => {
    try {
        const response = await fetch(
            'https://script.google.com/macros/s/AKfycbwquqdak_W4FtI4lHU7ME73TSPnGQKx7QG1YLXWm3TCGiQYpWLhWihLVWPEe_sBxAx5lA/exec',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'promo_update' })
            }
        );

        const text = await response.text();
        console.log('✅ Apps Script response:', text);

        res.json({ success: true, result: text });
    } catch (err) {
        console.error('❌ Failed to update Google Sheet:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;