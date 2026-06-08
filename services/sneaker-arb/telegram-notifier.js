'use strict';

import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram credentials not set. Skipping notification.');
    console.log('Message would have been:', message);
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log('Telegram notification sent!');
  } catch (error) {
    console.error('Error sending Telegram notification:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const msg = process.argv[2] || 'Test alert from Sneaker Arb Agent';
  sendTelegramAlert(msg);
}
