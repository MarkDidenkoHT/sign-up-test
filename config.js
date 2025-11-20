const CONFIG = {
    SUPABASE: {
        URL: 'https://kgdzzauvivirfdwwcbhi.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZHp6YXV2aXZpcmZkd3djYmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjU0NjUsImV4cCI6MjA3OTEwMTQ2NX0._rX8an82IBbUzrU3vW4H2gH_zwbZ2IWqUBTD5w5mcs0'
    },
    TELEGRAM: {
        BOT_TOKEN: '8437917788:AAE49Bhhg5UsFB4nr9rU-Z-kTQaVC49I4fA',
        CHAT_ID: '594689636'
    },
    COOKIE: {
        NAME: 'user_profile',
        DURATION: 365
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}