const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== MEMORY OPTIMIZATION =====
// Store message context with automatic cleanup
const messageContext = new Map();
const MESSAGE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MESSAGE_TTL = 10 * 60 * 1000; // 10 minutes

// Cleanup expired messages
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [userId, entry] of messageContext.entries()) {
    if (now - entry.timestamp > MESSAGE_TTL) {
      messageContext.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired messages (${messageContext.size} remaining)`);
  }
}, MESSAGE_CLEANUP_INTERVAL);

function extractCourseCode(text) {
  const patterns = [
    /[A-Z]{2,4}\s?\d{3}[A-Z]?/g,
    /[A-Z]{2,4}\s?\d{4}[A-Z]?/g,
    /[A-Z]{3}\s?\d{3}/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0].replace(/\s+/g, '');
    }
  }
  return null;
}

function detectUrgency(text) {
  const urgentKeywords = [
    'urgent', 'emergency', 'immediately', 'asap', '‼️', '🚨',
    'last minute', 'changed', 'moved', 'cancelled', 'postponed',
    'deadline', 'closing', 'final', 'exam', 'test', 'cat'
  ];
  
  const lowerText = text.toLowerCase();
  let urgencyScore = 0;
  
  urgentKeywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      urgencyScore += 1;
    }
  });
  
  const exclamationCount = (text.match(/!/g) || []).length;
  urgencyScore += exclamationCount;
  
  return urgencyScore >= 3 ? 'urgent' : 'normal';
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  bot.sendMessage(chatId, 
    `👋 *Welcome to MSOMI ALERT, ${firstName}!*\n\n` +
    `I'm your class rep assistant. Forward me messages from your lecturer WhatsApp groups and I'll broadcast them to all students — even those without data.\n\n` +
    `*How to use:*\n` +
    `1️⃣ Forward any class message to me\n` +
    `2️⃣ I'll detect course code, urgency, and details\n` +
    `3️⃣ I'll send alerts to all registered students\n\n` +
    `*Commands:*\n` +
    `/register [course1,course2] - Register as class rep\n` +
    `/help - Get help\n\n` +
    `*Example:* Forward "CSC201 exam moved to LT3 tomorrow 7am"`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/register (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const coursesInput = match[1];
  
  const courses = coursesInput.split(',').map(c => c.trim().toUpperCase());
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/register-classrep`, {
      telegramId: userId,
      telegramUsername: msg.from.username,
      name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
      courses: courses
    });
    
    if (response.data.success) {
      bot.sendMessage(chatId, 
        `✅ *Registered as class rep!*\n\n` +
        `You'll now receive notifications for:\n` +
        courses.map(c => `📚 ${c}`).join('\n') +
        `\n\nForward me any course messages and I'll broadcast them.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    bot.sendMessage(chatId, '❌ Registration failed. Please try again.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || msg.caption || '';
  
  if (text.startsWith('/')) return;
  
  if (!text) {
    bot.sendMessage(chatId, 'Please forward a text message with the class update.');
    return;
  }
  
  bot.sendChatAction(chatId, 'typing');
  
  const courseCode = extractCourseCode(text);
  const urgency = detectUrgency(text);
  
  if (!courseCode) {
    bot.sendMessage(chatId, 
      '❌ *Could not detect course code*\n\n' +
      'Please include the course code (e.g., CSC201, BIT 401) in your message.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  let title = urgency === 'urgent' ? '🚨 URGENT: ' : '📢 Update: ';
  title += courseCode;
  
  let body = text.length > 100 ? text.substring(0, 97) + '...' : text;
  
  const previewMessage = 
    `📋 *Message Analysis*\n\n` +
    `*Course:* ${courseCode}\n` +
    `*Urgency:* ${urgency === 'urgent' ? '🔴 HIGH' : '🟡 Normal'}\n` +
    `\n*Preview:*\n${body}\n\n` +
    `Send this alert to all ${courseCode} students?`;
  
  bot.sendMessage(chatId, previewMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Send Now', callback_data: `send_${courseCode}_${urgency}` },
          { text: '❌ Cancel', callback_data: 'cancel' }
        ]
      ]
    }
  });
  
  // Store with TTL
  messageContext.set(userId, {
    courseCode,
    title,
    body: text,
    urgency,
    timestamp: Date.now()
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  if (data === 'cancel') {
    bot.editMessageText('❌ Alert cancelled.', {
      chat_id: chatId,
      message_id: msg.message_id
    });
    messageContext.delete(userId);
    return;
  }
  
  if (data.startsWith('send_')) {
    const parts = data.split('_');
    const courseCode = parts[1];
    const urgency = parts[2];
    
    const context = messageContext.get(userId);
    if (!context) {
      bot.sendMessage(chatId, '❌ Message expired. Please forward again.');
      return;
    }
    
    try {
      bot.editMessageText('📤 *Sending alerts...*', {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
      
      const response = await axios.post(`${BACKEND_URL}/api/notify/course`, {
        courseCode: courseCode,
        title: context.title,
        body: context.body,
        urgency: urgency,
        data: {
          forwardedBy: userId,
          source: 'telegram'
        }
      });
      
      if (response.data.success) {
        const summary = response.data.summary || {};
        bot.editMessageText(
          `✅ *Alert Sent Successfully!*\n\n` +
          `📊 *Stats:*\n` +
          `• Course: ${courseCode}\n` +
          `• Sent: ${summary.success || response.data.recipientCount || 'N/A'}\n` +
          `• Failed: ${summary.failure || 0}\n` +
          `• Urgency: ${urgency === 'urgent' ? '🔴 High' : '🟡 Normal'}\n\n` +
          `✨ Even students with zero data balance received this.`,
          {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
      }
    } catch (error) {
      console.error('Send error:', error.message);
      bot.editMessageText('❌ Failed to send alerts. Please try again.', {
        chat_id: chatId,
        message_id: msg.message_id
      });
    }
    
    // Cleanup
    messageContext.delete(userId);
  }
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    `🆘 *MSOMI ALERT Bot Help*\n\n` +
    `*What I do:*\n` +
    `Forward lecturer messages → I broadcast to all students for free\n\n` +
    `*How to forward:*\n` +
    `1. Open WhatsApp group with lecturer message\n` +
    `2. Long press message → Forward\n` +
    `3. Select "Msomi Alert Bot"\n` +
    `4. Confirm details → Send\n\n` +
    `*Tips for best results:*\n` +
    `• Include course code (CSC201, BIT 401)\n` +
    `• Include time and venue if relevant\n` +
    `• Mark urgent messages with 🚨 or URGENT`,
    { parse_mode: 'Markdown' }
  );
});

console.log('🤖 MSOMI ALERT Telegram Bot is running...');

module.exports = bot;
