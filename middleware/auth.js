const jwt = require('jsonwebtoken');
const supabase = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET;

async function verifySession(req, res, next) {
    try {
        const cookieToken = req.cookies?.session_token;
        const authHeader = req.headers['authorization'];
        const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const token = cookieToken || headerToken;

        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        try {
            jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { data: session, error } = await supabase
            .from('sessions')
            .select('user_chat_id, role')
            .eq('jwt_token', token)
            .eq('active', true)
            .gte('expired_at', new Date().toISOString())
            .single();

        if (error || !session) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        req.session = {
            user_chat_id: session.user_chat_id,
            role: session.role
        };

        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !roles.includes(req.session.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        next();
    };
}

module.exports = { verifySession, requireRole };