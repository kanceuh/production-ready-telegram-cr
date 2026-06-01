export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  COINMARKETCAP_API_KEY: process.env.COINMARKETCAP_API_KEY || '',
  ALERT_POLL_MS: Number(process.env.ALERT_POLL_MS || 60000),
  MARKET_TIMEOUT_MS: Number(process.env.MARKET_TIMEOUT_MS || 10000),
  PRICE_CACHE_TTL_MS: Number(process.env.PRICE_CACHE_TTL_MS || 45000),
  SYMBOL_CACHE_TTL_MS: Number(process.env.SYMBOL_CACHE_TTL_MS || 21600000),
};

export function envHealth() {
  return {
    TELEGRAM_BOT_TOKEN_set: Boolean(cfg.TELEGRAM_BOT_TOKEN),
    MONGODB_URI_set: Boolean(cfg.MONGODB_URI),
    COINMARKETCAP_API_KEY_set: Boolean(cfg.COINMARKETCAP_API_KEY),
  };
}
