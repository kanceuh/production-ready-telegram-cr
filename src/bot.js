import { Bot } from 'grammy';
import { log, safeErr } from './lib/logger.js';
import { upsertUser } from './services/users.js';
import { registerCallbacks } from './features/callbacks.js';

export function createBot(token) {
  const bot = new Bot(token);

  bot.use(async (ctx, next) => {
    await upsertUser(ctx);
    return next();
  });

  registerCallbacks(bot);

  bot.catch((err) => {
    log.error('telegram bot error', { err: safeErr(err.error || err) });
  });

  return bot;
}
