import { removeWatchBySymbol } from '../features/actions.js';

export default function register(bot) {
  bot.command('removewatch', async (ctx) => {
    const symbol = String(ctx.match || '').trim();
    if (!symbol) return ctx.reply('Use /removewatch BTC.');
    await removeWatchBySymbol(ctx, symbol);
  });
}
