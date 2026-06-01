Crypto Watcher Bot

A production-ready Telegram bot for crypto prices, watchlists, and one-time price alerts.

Features

1) /price BTC returns USD price and 24h change.
2) /watchlist, /addwatch, and /removewatch manage saved coins.
3) /alert, /alerts, and /removealert manage above and below alerts.
4) Inline buttons support refresh, watchlist, add alert, remove, and help actions.
5) CoinGecko is the primary market API.
6) CoinMarketCap is an optional fallback when COINMARKETCAP_API_KEY is present.
7) MongoDB stores users, watchlists, alerts, cached coin metadata, cached prices, and notification logs.
8) The alert polling loop runs in the same Node.js process.

Architecture

src/index.js boots the process, validates env vars, connects MongoDB, starts grammY polling, and starts alert polling.
src/bot.js creates the grammY bot and callback handlers.
src/commands contains Telegram slash commands.
src/services contains market data, watchlist, alert, user, and polling logic.
src/lib contains config, database, and logging helpers.
src/utils contains formatting and cache helpers.

Setup

1) Install Node.js 18 or newer.
2) Create a Telegram bot with BotFather.
3) Create a MongoDB database.
4) Copy .env.sample to .env.
5) Set TELEGRAM_BOT_TOKEN and MONGODB_URI.
6) Optionally set COINMARKETCAP_API_KEY.
7) Run npm install.
8) Run npm run dev.

Commands

/start opens the main menu.
Example response: Welcome to Crypto Watcher with buttons for Price Lookup, Watchlist, Add Alert, and Help.

/help shows commands and examples.

/price BTC shows Bitcoin price and 24h change.

/addwatch ETH adds Ethereum to your watchlist.

/watchlist lists saved coins and prices.

/removewatch ETH removes Ethereum from your watchlist.

/alert BTC above 90000 creates a one-time alert.

/alert SOL below 100 creates a below alert.

/alerts lists your active and triggered alerts.

/removealert <id> removes an alert that belongs to you.

Integrations

CoinGecko endpoints used:
https://api.coingecko.com/api/v3/search
https://api.coingecko.com/api/v3/simple/price

CoinMarketCap endpoint used only when COINMARKETCAP_API_KEY is set:
https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest

External API calls have timeouts, logs, and fallback behavior. If live APIs fail and cached data exists, stale data is shown clearly. If no usable data exists, the user receives a friendly API-down message.

Database

Collections:
users stores Telegram user profile and status.
coins stores cached coin metadata.
watchlist_items stores user-specific watchlist entries.
alerts stores active, triggered, and deleted alerts.
cached_prices stores last known market data.
notification_logs stores alert notification delivery attempts.

Indexes are created for application fields only. The code never creates an _id index.

Deployment

Use one Render web service or worker-style service that runs npm start. Set TELEGRAM_BOT_TOKEN and MONGODB_URI. COINMARKETCAP_API_KEY is optional. The build command is npm run build and the start command is npm start.

Troubleshooting

If Telegram polling conflicts occur during deploy overlap, the runner logs the conflict, backs off, and retries.

If MongoDB fails, the bot exits with a clear message because persistent storage is required for alerts and watchlists.

If prices fail, check CoinGecko availability and rate limits. Add COINMARKETCAP_API_KEY for fallback coverage.

Logs are production-safe and only print env presence booleans, never secrets.
