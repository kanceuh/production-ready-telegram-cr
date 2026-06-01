import { showAlerts } from '../features/actions.js';

export default function register(bot) {
  bot.command('alerts', async (ctx) => {
    await showAlerts(ctx);
  });
}
