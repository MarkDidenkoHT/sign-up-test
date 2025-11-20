const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const CONFIG = require('./config.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Supabase client
const supabase = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);

// API Routes

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { name, phone, profile_id } = req.body;
        
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_profile_id', profile_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        // Create profile if doesn't exist
        if (!existingProfile) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([
                    { 
                        user_profile_id: profile_id,
                        role: 'client'
                    }
                ]);

            if (insertError) {
                throw insertError;
            }
        }

        res.json({ success: true, profile_id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get masters
app.get('/api/masters', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('masters')
            .select('*');

        if (error) throw error;

        // Add some default data for demo
        const mastersWithDefaults = data.map(master => ({
            ...master,
            image: master.image || '/images/professional-nail-technician-woman-in-elegant-salo.jpg',
            experience: master.experience || '5'
        }));

        res.json(mastersWithDefaults);
    } catch (error) {
        console.error('Error fetching masters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get services
app.get('/api/services', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create booking
app.post('/api/booking', async (req, res) => {
    try {
        const { user_profile_id, service_type, master_id, request_time } = req.body;

        const { data, error } = await supabase
            .from('requests')
            .insert([
                {
                    user_profile_id,
                    service_type,
                    master_id,
                    request_time,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        res.json({ success: true, booking_id: data[0]?.id });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notify Telegram about new sign-up
app.post('/api/notify-telegram', async (req, res) => {
    try {
        const { name, phone, profile_id } = req.body;
        
        const message = `🆕 Новый пользователь зарегистрировался!\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n🆔 ID: ${profile_id}\n⏰ Время: ${new Date().toLocaleString('ru-RU')}`;

        const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CONFIG.TELEGRAM.CHAT_ID,
                text: message
            })
        });

        if (!response.ok) {
            console.error('Telegram notification failed');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Telegram notification error:', error);
        res.status(500).json({ error: 'Notification failed' });
    }
});

// Serve the main app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});