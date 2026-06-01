import 'dotenv/config';
import { run } from '@grammyjs/runner';
import { cfg, envHealth } from './lib/config.js';
import { log, safeErr } from './lib/logger.js';

let runnerHandle = null;
let stopping = false;

process.on('unhandledRejection', (err) => {
  log.error('unhandled rejection', { err: safeErr(err) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error('uncaught exception', { err: safeErr(err) });
  process.exit(1);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startPolling(bot) {
  let backoff = 2000;
  while (!stopping) {
    try {
      log.info('telegram polling starting');
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      runnerHandle = run(bot);
      log.info('telegram polling started');
      await runnerHandle.task();
      backoff = 2000;
    } catch (err) {
      const message = safeErr(err);
      log.warn('telegram polling failure', { err: message, backoffMs: backoff });
      if (!message.includes('409') && !message.toLowerCase().includes('conflict')) {
        await sleep(backoff);
      } else {
        await sleep(backoff);
      }
      backoff = Math.min(backoff === 2000 ? 5000 : backoff * 2, 20000);
    } finally {
      if (runnerHandle) {
        try { await runnerHandle.stop(); } catch {}
        runnerHandle = null;
      }
    }
  }
}

async function boot() {
  try {
    log.info('boot start');
    log.info('env sanity', envHealth());
    if (!cfg.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is required. Add it in your environment and redeploy.');
      process.exit(1);
    }
    if (!cfg.MONGODB_URI) {
      console.error('MONGODB_URI is required for watchlists, alerts, and cached prices.');
      process.exit(1);
    }
    const { connectDb, closeDb } = await import('./lib/db.js');
    const { createBot } = await import('./bot.js');
    const { registerCommands } = await import('./commands/loader.js');
    const { startAlertPolling, stopAlertPolling } = await import('./services/alertPoller.js');

    await connectDb(cfg.MONGODB_URI);
    const bot = createBot(cfg.TELEGRAM_BOT_TOKEN);
    await bot.init();
    await registerCommands(bot);
    await bot.api.setMyCommands([
      { command: 'start', description: 'Open the main menu' },
      { command: 'help', description: 'Show commands and examples' },
      { command: 'price', description: 'Look up a crypto price' },
      { command: 'watchlist', description: 'Show your saved coins' },
      { command: 'addwatch', description: 'Add a coin to your watchlist' },
      { command: 'removewatch', description: 'Remove a watched coin' },
      { command: 'alert', description: 'Create a price alert' },
      { command: 'alerts', description: 'List your alerts' },
      { command: 'removealert', description: 'Remove an alert' },
    ]);

    const memTimer = setInterval(() => {
      const m = process.memoryUsage();
      log.info('memory', { rssMB: Math.round(m.rss / 1e6), heapUsedMB: Math.round(m.heapUsed / 1e6) });
    }, 60000);

    const shutdown = async () => {
      if (stopping) return;
      stopping = true;
      clearInterval(memTimer);
      stopAlertPolling();
      if (runnerHandle) await runnerHandle.stop();
      await closeDb();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    startAlertPolling(bot).catch((err) => log.error('alert poller crashed', { err: safeErr(err) }));
    await startPolling(bot);
  } catch (err) {
    log.error('boot failed', { err: safeErr(err), code: err?.code });
    if (err?.code === 'ERR_MODULE_NOT_FOUND') console.error('Check that all src imports include .js extensions and files exist.');
    process.exit(1);
  }
}

boot();
