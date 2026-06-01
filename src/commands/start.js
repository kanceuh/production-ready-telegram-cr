import { mainMenu } from '../features/actions.js';

export default function register(bot) {
  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to Crypto Watcher. Track crypto prices, manage a watchlist, and get alerts when targets are hit.', { reply_markup: mainMenu() });
  });
}
