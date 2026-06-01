import { InlineKeyboard } from 'grammy';
import { cfg } from '../lib/config.js';
import { log, safeErr } from '../lib/logger.js';
import { getActiveAlerts, markAlertChecked, markTriggered, logNotification } from './alerts.js';
import { getPrices } from './market.js';
import { markUserBlocked } from './users.js';
import { compactUsd, formatTime } from '../utils/format.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let stopped = false;
let running = false;

function notificationKeyboard() {
  return new InlineKeyboard()
    .text('View Alerts', 'alerts')
    .text('Add New Alert', 'help:alert')
    .row()
    .text('Watchlist', 'watchlist');
}

export function stopAlertPolling() {
  stopped = true;
}

export async function startAlertPolling(bot) {
  stopped = false;
  log.info('alert polling started', { intervalMs: cfg.ALERT_POLL_MS });
  while (!stopped) {
    if (running) {
      log.warn('alert polling cycle skipped', { reason: 'previous cycle running' });
      await sleep(cfg.ALERT_POLL_MS);
      continue;
    }
    running = true;
    const started = Date.now();
    try {
      await runCycle(bot);
      log.info('alert polling cycle end', { ms: Date.now() - started });
    } catch (err) {
      log.error('alert polling failure', { err: safeErr(err) });
    } finally {
      running = false;
    }
    await sleep(cfg.ALERT_POLL_MS);
  }
}

async function runCycle(bot) {
  log.info('alert polling cycle start');
  const alerts = await getActiveAlerts();
  log.info('alert polling active alerts loaded', { count: alerts.length });
  if (!alerts.length) return;
  const coinsById = new Map();
  for (const a of alerts) coinsById.set(a.coinId, { coinId: a.coinId, symbol: a.symbol, name: a.name });
  const prices = await getPrices([...coinsById.values()]);
  for (const alert of alerts) {
    const price = prices.get(alert.coinId);
    if (!price?.price) continue;
    await markAlertChecked(alert._id, price.price);
    const hit = alert.direction === 'above' ? price.price >= alert.targetPrice : price.price <= alert.targetPrice;
    if (!hit) continue;
    const claimed = await markTriggered(alert._id, price.price);
    if (!claimed) continue;
    const text = `${alert.symbol} alert triggered\nDirection: ${alert.direction}\nTarget: ${compactUsd(alert.targetPrice)}\nCurrent: ${compactUsd(price.price)}\nTime: ${formatTime(new Date())}`;
    try {
      const msg = await bot.api.sendMessage(alert.chatId, text, { reply_markup: notificationKeyboard() });
      await logNotification({ userId: alert.userId, chatId: alert.chatId, alertId: String(alert._id), coinId: alert.coinId, type: 'alert_triggered', status: 'sent', telegramMessageId: msg.message_id, message: text });
    } catch (err) {
      const message = safeErr(err);
      await logNotification({ userId: alert.userId, chatId: alert.chatId, alertId: String(alert._id), coinId: alert.coinId, type: 'alert_triggered', status: 'failed', errorMessage: message });
      log.error('telegram alert notification failed', { err: message, alertId: String(alert._id) });
      if (message.includes('blocked') || message.includes('403')) await markUserBlocked(alert.userId, true);
    }
  }
}
