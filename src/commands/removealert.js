import { removeAlertById } from '../features/actions.js';

export default function register(bot) {
  bot.command('removealert', async (ctx) => {
    const id = String(ctx.match || '').trim();
    if (!id) return ctx.reply('Use /removealert <id>. You can find IDs with /alerts.');
    await removeAlertById(ctx, id);
  });
}
