const SENSITIVE_KEYS = new Set(['password', 'token', 'init_data', 'jwt_token', 'secret', 'authorization']);

function scrubContext(context) {
  const scrubbed = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      scrubbed[key] = '[redacted]';
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

function getBotApiUrl() {
  const botApiUrl = process.env.BOT_API_URL;
  if (!botApiUrl) {
    console.error('BOT_API_URL environment variable not set');
    return null;
  }
  return botApiUrl;
}

async function notifyError(errorTitle, errorMessage, context = {}) {
  const botApiUrl = getBotApiUrl();
  if (!botApiUrl) return false;

  const adminChatId = process.env.ADMIN_CHAT_ID;
  if (!adminChatId) {
    console.error('ADMIN_CHAT_ID environment variable not set');
    return false;
  }

  try {
    const timestamp = new Date().toISOString();

    const safeContext = scrubContext({ ...context });
    delete safeContext.stack;

    const contextStr = Object.entries(safeContext)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const fullMessage = `
🚨 *Backend Error Alert*

*Title:* ${errorTitle}
*Time:* ${timestamp}

*Error:*
\`\`\`
${errorMessage}
\`\`\`

${contextStr ? `*Context:*\n\`\`\`\n${contextStr}\n\`\`\`` : ''}
    `.trim();

    const response = await fetch(`${botApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: fullMessage,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      console.error('Failed to send error notification:', response.statusText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
}

function createErrorHandler(serviceName) {
  return async (error, context = {}) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await notifyError(serviceName, errorMessage, context);
  };
}

module.exports = {
  notifyError,
  createErrorHandler
};