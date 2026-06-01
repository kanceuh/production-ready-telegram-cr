import { showWatchlist } from '../features/actions.js';

export default function register(bot) {
  bot.command('watchlist', async (ctx) => {
    await showWatchlist(ctx);
  });
}
