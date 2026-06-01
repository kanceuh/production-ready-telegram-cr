import { showPrice } from '../features/actions.js';

export default function register(bot) {
  bot.command('price', async (ctx) => {
    await showPrice(ctx, ctx.match);
  });
}
