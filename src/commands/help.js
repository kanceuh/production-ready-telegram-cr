export default function register(bot) {
  bot.command('help', async (ctx) => {
    await ctx.reply('Commands\n/start main menu\n/help examples\n/price BTC price and 24h change\n/watchlist your saved coins\n/addwatch BTC add a coin\n/removewatch BTC remove a coin\n/alert BTC above 70000 create alert\n/alert ETH below 2500 create alert\n/alerts list active alerts\n/removealert <id> remove an alert\n\nExamples\n/price SOL\n/addwatch ETH\n/alert BTC above 90000');
  });
}
