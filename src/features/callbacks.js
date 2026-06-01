import { showPrice, showWatchlist, addWatchBySymbol, removeWatchBySymbol, showAlerts, removeAlertById, replyOrEdit } from './actions.js';

export function registerCallbacks(bot) {
  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    await replyOrEdit(ctx, 'Commands\n/start opens the main menu.\n/help shows examples.\n/price BTC shows price and 24h change.\n/watchlist lists saved coins.\n/addwatch BTC saves a coin.\n/removewatch BTC removes one.\n/alert BTC above 70000 creates an alert.\n/alerts lists alerts.\n/removealert <id> removes one.');
  });
  bot.callbackQuery(/^help:(price|alert)$/u, async (ctx) => {
    await ctx.answerCallbackQuery();
    const kind = ctx.match[1];
    await replyOrEdit(ctx, kind === 'price' ? 'Send /price BTC to look up a coin.' : 'Send /alert BTC above 70000 or /alert ETH below 2500.');
  });
  bot.callbackQuery('watchlist', async (ctx) => { await ctx.answerCallbackQuery(); await showWatchlist(ctx); });
  bot.callbackQuery('alerts', async (ctx) => { await ctx.answerCallbackQuery(); await showAlerts(ctx); });
  bot.callbackQuery(/^price:(.+)$/u, async (ctx) => { await ctx.answerCallbackQuery(); await showPrice(ctx, ctx.match[1]); });
  bot.callbackQuery(/^addwatch:(.+)$/u, async (ctx) => { await ctx.answerCallbackQuery(); await addWatchBySymbol(ctx, ctx.match[1]); });
  bot.callbackQuery(/^removewatch:(.+)$/u, async (ctx) => { await ctx.answerCallbackQuery(); await removeWatchBySymbol(ctx, ctx.match[1]); });
  bot.callbackQuery(/^removealert:(.+)$/u, async (ctx) => { await ctx.answerCallbackQuery(); await removeAlertById(ctx, ctx.match[1]); });
  bot.callbackQuery('cancel', async (ctx) => { await ctx.answerCallbackQuery('Cancelled'); try { await ctx.deleteMessage(); } catch {} });
}
