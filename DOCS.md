Crypto Watcher Bot

Crypto Watcher is a Telegram bot for cryptocurrency prices, watchlists, and price alerts. It uses CoinGecko first, then CoinMarketCap only when COINMARKETCAP_API_KEY is configured. MongoDB stores users, watchlists, alerts, coin metadata, and cached prices.

Commands

/start
Shows the welcome message and inline buttons for Price Lookup, Watchlist, Add Alert, and Help.

/help
Lists commands and examples.

/price <symbol>
Shows current USD price and 24h change.
Example: /price BTC

/watchlist
Shows your saved coins with prices when available.

/addwatch <symbol>
Adds a coin to your watchlist.
Example: /addwatch SOL

/removewatch <symbol>
Removes a coin from your watchlist.
Example: /removewatch ETH

/alert <symbol> <above|below> <price>
Creates a one-time alert.
Examples: /alert BTC above 90000, /alert ETH below 2500

/alerts
Lists your active and recently triggered alerts with IDs.

/removealert <id>
Removes an alert. Use /alerts to find the ID.

Environment variables

TELEGRAM_BOT_TOKEN is required. It is the Telegram token from BotFather.

MONGODB_URI is required. It stores users, watchlists, alerts, cached coin metadata, cached prices, and notification logs.

COINMARKETCAP_API_KEY is optional. If present, CoinMarketCap is used as a fallback when CoinGecko is unavailable.

ALERT_POLL_MS is optional and defaults to 60000.

MARKET_TIMEOUT_MS is optional and defaults to 10000.

PRICE_CACHE_TTL_MS is optional and defaults to 45000.

SYMBOL_CACHE_TTL_MS is optional and defaults to 21600000.

Setup

1) Copy .env.sample to .env.
2) Set TELEGRAM_BOT_TOKEN and MONGODB_URI.
3) Run npm install.
4) Run npm run dev for local development.
5) Run npm start for production.

Deployment notes

The bot runs as one Node.js process. It uses grammY long polling through @grammyjs/runner. On boot it clears any Telegram webhook with drop_pending_updates to avoid webhook and polling conflicts.

Alert notifications

The in-process polling loop checks active alerts at ALERT_POLL_MS. It groups alerts by coin, fetches prices in batches where possible, marks triggered alerts inactive, and sends one notification per triggered alert.

Troubleshooting

If the bot exits on startup, verify TELEGRAM_BOT_TOKEN and MONGODB_URI are set.

If prices are unavailable, CoinGecko may be rate limited or down. If cached prices exist, the bot labels them as cached or stale. If no cache exists, it asks the user to try later.

If MongoDB fails to connect, check the network allowlist, username, password, and database URI.

Logs never print secrets. Startup logs show only whether each env var is set.
