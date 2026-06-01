import { addWatchBySymbol } from '../features/actions.js';

export default function register(bot) {
  bot.command('addwatch', async (ctx) => {
    const symbol = String(ctx.match || '').trim();
    if (!symbol) return ctx.reply('Use /addwatch BTC, /addwatch ETH, or /addwatch SOL.');
    await addWatchBySymbol(ctx, symbol);
  });
}
