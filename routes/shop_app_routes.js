const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verifySession, requireRole } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fetchProductData(itemCode, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const API_TOKEN = process.env.HITECH_API_TOKEN;

            let normalizedCode = itemCode;
            if (!/^[ТT]-\d{9}$/i.test(itemCode)) {
                const digits = itemCode.replace(/\D/g, '');
                normalizedCode = `Т-${digits.padStart(9, '0')}`;
            }

            const apiUrl = `https://hi-tech.md/product-api.php?code=${encodeURIComponent(normalizedCode)}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${API_TOKEN}`
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 429) {
                        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (!data.success) {
                    return { exists: false, fullData: null };
                }

                return { exists: true, fullData: data };
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            if (attempt === retries) {
                return { exists: false, fullData: null };
            }
            await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        }
    }
    return { exists: false, fullData: null };
}

async function sendPriceTagNotification(itemCode, errorType, comment, reportedBy, category) {
    const itemUrl = `https://hi-tech.md/?match=all&subcats=Y&pcode_from_q=Y&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${itemCode}&dispatch=products.search&security_hash=787aa6c42a72d38a492508e533b6d589`;
    
    let reportedByName = reportedBy;
    try {
        const { data: userData, error } = await supabase
            .from('shop_users')
            .select('shop_user_name')
            .eq('chat_id', reportedBy)
            .single();
        
        if (!error && userData && userData.shop_user_name) {
            reportedByName = userData.shop_user_name;
        }
    } catch (error) {
        console.error(`Failed to fetch user name for chat_id ${reportedBy}:`, error);
    }
    
    let targetChatIds = [];
    let botToken;
    let message;
    
    if (errorType === 'характеристика') {
        botToken = process.env.TELEGRAM_BOT_TOKEN_FOR_CONTENT;
        targetChatIds = ['1592273204'];
        message = `🔧 Новый запрос на исправление характеристик товара
📦 Код товара: ${itemCode}
🔗 Ссылка на товар: ${itemUrl}
🗂️ Тип ошибки: ${errorType}
🏷️ Категория: ${category}
👤 Сотрудник: ${reportedByName}
📝 Комментарий: ${comment || 'Не указан'}
📅 Время: ${new Date().toLocaleString('ru-RU', {timeZone: 'Europe/Chisinau'})}`;
        
        console.log(`Routing 'характеристика' task for item ${itemCode} to content group (${targetChatIds.join(', ')})`);
        
    } else if (errorType === 'пиктограмма') {
        botToken = process.env.TELEGRAM_BOT_TOKEN_FOR_CATEG_MNGR;
        targetChatIds = ['204128644'];
        message = `🖼️ Новая задача по пиктограмме
📦 Код товара: ${itemCode}
🔗 Ссылка на товар: ${itemUrl}
🗂️ Тип ошибки: ${errorType}
🏷️ Категория: ${category}
👤 Сотрудник: ${reportedByName}
📝 Комментарий: ${comment || 'Не указан'}
📅 Время: ${new Date().toLocaleString('ru-RU', {timeZone: 'Europe/Chisinau'})}`;
        
        console.log(`Routing 'пиктограмма' task for item ${itemCode} to specific user (${targetChatIds.join(', ')})`);
        
    } else if (errorType === 'название' || errorType === 'цена') {
        botToken = process.env.TELEGRAM_BOT_TOKEN_FOR_CATEG_MNGR;
        
        try {
            const { data: categoryUsers, error: usersError } = await supabase
                .from('users')
                .select('chat_id')
                .eq('user_category', category);
            
            if (usersError) {
                console.error(`Error fetching users for category '${category}':`, usersError);
                console.error(`Cannot route ${errorType} task for item ${itemCode} - database error`);
                return { success: false, error: 'Database error when fetching category users' };
            }
            
            if (!categoryUsers || categoryUsers.length === 0) {
                console.error(`No users found for category '${category}' - cannot route ${errorType} task for item ${itemCode}`);
                return { success: false, error: `No users found for category: ${category}` };
            }
            
            targetChatIds = categoryUsers.map(user => user.chat_id.toString());
            console.log(`Found ${categoryUsers.length} users for category '${category}': ${targetChatIds.join(', ')}`);
            
        } catch (error) {
            console.error(`Exception while querying users for category '${category}':`, error);
            console.error(`Cannot route ${errorType} task for item ${itemCode} - query exception`);
            return { success: false, error: 'Failed to query category users' };
        }
        
        message = `🏷️ Новая задача по ценнику
📦 Код товара: ${itemCode}
🔗 Ссылка на товар: ${itemUrl}
🗂️ Тип ошибки: ${errorType}
🏷️ Категория: ${category}
👤 Сотрудник: ${reportedByName}
📝 Комментарий: ${comment || 'Не указан'}
📅 Время: ${new Date().toLocaleString('ru-RU', {timeZone: 'Europe/Chisinau'})}`;
        
        console.log(`Routing '${errorType}' task for item ${itemCode} to category '${category}' users (${targetChatIds.join(', ')})`);
        
    } else {
        console.error(`Unknown error type '${errorType}' for item ${itemCode} - no routing configured`);
        return { success: false, error: `Unknown error type: ${errorType}` };
    }
    
    if (!botToken) {
        console.error(`Bot token not configured for error type '${errorType}' - cannot send notifications`);
        return { success: false, error: `Bot token not configured for error type: ${errorType}` };
    }
    
    if (!targetChatIds || targetChatIds.length === 0) {
        console.error(`No target chat IDs determined for error type '${errorType}' and category '${category}' - cannot send notifications`);
        return { success: false, error: 'No target recipients found' };
    }
    
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const results = [];
    
    console.log(`Attempting to send ${targetChatIds.length} notification(s) for ${errorType} task (item: ${itemCode})`);
    
    for (const chatId of targetChatIds) {
        try {
            console.log(`Sending notification to chat_id ${chatId}...`);
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: false
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Telegram API error for chat_id ${chatId}: HTTP ${response.status} - ${errorText}`);
                results.push({ chatId, success: false, error: `HTTP ${response.status}: ${errorText}` });
            } else {
                const result = await response.json();
                console.log(`Notification successfully sent to chat_id ${chatId}:`, result);
                results.push({ chatId, success: true, result });
            }
        } catch (error) {
            console.error(`Exception while sending notification to chat_id ${chatId}:`, error);
            results.push({ chatId, success: false, error: error.message });
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`Notification summary for ${errorType} task (item: ${itemCode}): ${successCount} successful, ${failCount} failed out of ${results.length} total`);
    
    if (successCount === 0) {
        console.error(`All notifications failed for ${errorType} task (item: ${itemCode})`);
        return { success: false, error: 'All notifications failed', results };
    } else if (failCount > 0) {
        console.warn(`Partial success for ${errorType} task (item: ${itemCode}): ${failCount} notifications failed`);
        return { success: true, warning: `${failCount} notifications failed`, results };
    } else {
        console.log(`All notifications sent successfully for ${errorType} task (item: ${itemCode})`);
        return { success: true, results };
    }
}

router.post('/create-price-tag-task', verifySession, async (req, res, next) => {
    try {
        const { chatId, itemCode, errorTypes, comment, category } = req.body;

        if (!chatId || !itemCode || !errorTypes || !Array.isArray(errorTypes) || errorTypes.length === 0 || !category) {
            return res.status(400).json({ success: false, error: 'Missing required fields: chatId, itemCode, errorTypes (array), category' });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('user_name, user_team')
            .eq('chat_id', chatId)
            .single();

        if (userError) {
            console.warn(`Could not fetch user for chatId=${chatId}:`, userError);
        }

        const reporterName = user?.user_name || null;
        const shopName = user?.user_team || null;

        const productResult = await fetchProductData(itemCode);
        const itemName = productResult.exists && productResult.fullData?.product?.product
            ? productResult.fullData.product.product.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
            : null;

        const createdTasks = [];
        const errors = [];

        for (const errorType of errorTypes) {
            try {
                const { data, error } = await supabase
                    .from('price_tag_tasks')
                    .insert({
                        item_code: itemCode,
                        item_name: itemName,
                        error_type: [errorType],
                        comment: comment || null,
                        category,
                        status: 'new',
                        reported_by: chatId,
                        reported_by_name: reporterName,
                        shop_name: shopName,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    console.error(`Failed to create task for ${errorType}:`, error);
                    errors.push(`Failed to create task for ${errorType}`);
                    continue;
                }

                createdTasks.push({ errorType, taskId: data.id, itemName });

                try {
                    await sendPriceTagNotification(itemCode, errorType, comment, chatId, category);
                } catch (telegramError) {
                    console.error(`Telegram notification failed for ${errorType}:`, telegramError);
                }
            } catch (taskError) {
                console.error(`Failed to create task for ${errorType}:`, taskError);
                errors.push(`Failed to create task for ${errorType}`);
            }
        }

        if (createdTasks.length > 0) {
            res.json({ success: true, createdTasks, itemName, errors: errors.length > 0 ? errors : undefined });
        } else {
            res.status(500).json({ success: false, error: 'Failed to create any tasks', details: errors.length > 0 ? errors : undefined });
        }
    } catch (err) {
        next(err);
    }
});

router.post('/price-tags', verifySession, async (req, res, next) => {
    try {
        const { chatId, itemCode } = req.body;

        if (!chatId || !itemCode) {
            return res.status(400).json({ success: false, error: 'Missing required fields: chatId, itemCode' });
        }

        const { data: tasks, error } = await supabase
            .from('price_tag_tasks')
            .select('*')
            .eq('item_code', itemCode)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const processedTasks = tasks.map(task => ({
            ...task,
            error_type_display: Array.isArray(task.error_type)
                ? task.error_type.join(', ')
                : task.error_type || 'Не указан'
        }));

        res.json({ success: true, tags: processedTasks });
    } catch (err) {
        next(err);
    }
});

router.post('/update-price-tag-comment', verifySession, async (req, res, next) => {
    try {
        const { chatId, taskId, comment } = req.body;

        if (!chatId || !taskId || !comment) {
            return res.status(400).json({ success: false, error: 'Missing required fields: chatId, taskId, comment' });
        }

        const { data: existingTask, error: fetchError } = await supabase
            .from('price_tag_tasks')
            .select('reported_by, status')
            .eq('id', taskId)
            .single();

        if (fetchError) throw fetchError;

        if (existingTask.reported_by !== chatId) {
            return res.status(403).json({ success: false, error: 'Not authorized to edit this task' });
        }

        if (existingTask.status !== 'new') {
            return res.status(400).json({ success: false, error: 'Cannot edit completed or in-progress tasks' });
        }

        const { data, error } = await supabase
            .from('price_tag_tasks')
            .update({ comment, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, task: data, message: 'Комментарий успешно обновлен' });
    } catch (err) {
        next(err);
    }
});

router.post('/product-info', verifySession, async (req, res, next) => {
    try {
        const { itemCode } = req.body;

        if (!itemCode) {
            return res.status(400).json({ success: false, error: 'Missing required field: itemCode' });
        }

        const productResult = await fetchProductData(itemCode);

        if (!productResult.exists || !productResult.fullData) {
            return res.json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, product: productResult.fullData.product, additional: productResult.fullData.additional });
    } catch (err) {
        next(err);
    }
});

router.post('/my-messages', verifySession, async (req, res, next) => {
    try {
        const { chatId } = req.body;

        const { data: allMessages, error } = await supabase
            .from('shops_sent_msgs')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const myMessages = allMessages.filter(msg => {
            if (Array.isArray(msg.recipients) && msg.recipients.includes(String(chatId))) return true;
            if (!msg.recipients || msg.recipients.length === 0) return true;
            return false;
        }).map(m => {
            let replied = false;
            try {
                const replies = typeof m.replies === 'string' ? JSON.parse(m.replies) : m.replies;
                replied = Array.isArray(replies) && replies.some(r => String(r.chat_id) === String(chatId));
            } catch {}
            return { ...m, replied };
        });

        res.json({ success: true, messages: myMessages });
    } catch (err) {
        next(err);
    }
});

module.exports = router;