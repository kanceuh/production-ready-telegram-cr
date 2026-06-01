import { createAlertByArgs } from '../features/actions.js';

export default function register(bot) {
  bot.command('alert', async (ctx) => {
    const args = String(ctx.match || '').trim().split(/\s+/u).filter(Boolean);
    await createAlertByArgs(ctx, args);
  });
}
