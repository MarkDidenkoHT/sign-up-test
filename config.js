const CONFIG = {
    SUPABASE: {
        URL: 'https://kgdzzauvivirfdwwcbhi.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZHp6YXV2aXZpcmZkd3djYmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDIxNzY0MDUsImV4cCI6MjAxNzc1MjQwNX0.1Mx97E4qhMp-TbiycqnD0w_gQ6Ntejs' // This should be your actual anon key
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