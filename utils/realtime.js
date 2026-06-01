const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_MAIN_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const chatConnections = new Map();
const moduleConnections = new Set();
let supabaseSubscription = null;

function broadcastToConnections(connections, data) {
  if (!connections) return;
  connections.forEach(connection => {
    if (!connection.isAlive) return;
    try {
      connection.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      connection.isAlive = false;
    }
  });
}

function broadcastToChat(chatId, data) {
  broadcastToConnections(chatConnections.get(chatId), data);
}

function broadcastToModuleClients(data) {
  broadcastToConnections(moduleConnections, data);
}

function removeChatConnection(chatId, connection) {
  const connections = chatConnections.get(chatId);
  if (!connections) return;
  connections.delete(connection);
  if (connections.size === 0) {
    chatConnections.delete(chatId);
  }
}

function registerChatConnection(req, res, chatId) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', chatId })}\n\n`);

  const connection = {
    id: Date.now(),
    res,
    chatId,
    isAlive: true
  };

  if (!chatConnections.has(chatId)) {
    chatConnections.set(chatId, new Set());
  }
  chatConnections.get(chatId).add(connection);

  const heartbeat = setInterval(() => {
    if (!connection.isAlive) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
      connection.isAlive = false;
    }
  }, 30000);

  const cleanup = () => {
    clearInterval(heartbeat);
    connection.isAlive = false;
    removeChatConnection(chatId, connection);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
}

function registerModuleConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'module_connected' })}\n\n`);

  const connection = {
    id: Date.now(),
    res,
    isAlive: true
  };

  moduleConnections.add(connection);

  const heartbeat = setInterval(() => {
    if (!connection.isAlive) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
      connection.isAlive = false;
    }
  }, 30000);

  const cleanup = () => {
    clearInterval(heartbeat);
    connection.isAlive = false;
    moduleConnections.delete(connection);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
}

function handleSupabasePayload(payload) {
  if (!payload || !payload.table || !payload.new) {
    return;
  }

  if (payload.table === 'chat' && payload.new.chat_id) {
    const eventType = payload.eventType === 'UPDATE' ? 'message_updated' : 'new_message';
    broadcastToChat(payload.new.chat_id, {
      type: eventType,
      message: payload.new
    });
    return;
  }

  if (payload.table === 'module_usage_stats') {
    broadcastToModuleClients({
      type: 'module_stats_updated',
      payload: payload.new
    });
    return;
  }

  if (payload.table === 'test_answers') {
    broadcastToModuleClients({
      type: payload.eventType === 'INSERT' ? 'new_test_result' : 'test_result_updated',
      result_id: payload.new.id,
      chat_id: payload.new.chat_id,
      test_id: payload.new.test_id,
      created_at: payload.new.created_at
    });
    return;
  }
}

function startSupabaseRealtime() {
  if (supabaseSubscription) {
    return supabaseSubscription;
  }

  supabaseSubscription = supabase
    .channel('chat-and-pr-updates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat' },
      payload => { handleSupabasePayload(payload); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'module_usage_stats' },
      payload => { handleSupabasePayload(payload); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'test_answers' },
      payload => { handleSupabasePayload(payload); }
    )
    .subscribe(status => {
      console.log('Supabase realtime status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Supabase realtime subscribed successfully');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Supabase realtime error, will retry...');
        setTimeout(startSupabaseRealtime, 5000);
      }
    });

  return supabaseSubscription;
}

function shutdownRealtime() {
  if (supabaseSubscription) {
    supabaseSubscription.unsubscribe();
    supabaseSubscription = null;
  }
}

process.on('SIGTERM', shutdownRealtime);
process.on('SIGINT', shutdownRealtime);

module.exports = {
  supabase,
  initRealtime: startSupabaseRealtime,
  registerChatConnection,
  registerModuleConnection,
  broadcastToChat
};