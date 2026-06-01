import { cfg } from '../lib/config.js';
import { col } from '../lib/db.js';
import { log, safeErr } from '../lib/logger.js';
import { TtlCache } from '../utils/cache.js';
import { normalizeSymbol } from '../utils/format.js';

const COINGECKO = 'https://api.coingecko.com/api/v3';
const CMC = 'https://pro-api.coinmarketcap.com/v2';
const symbolCache = new TtlCache({ max: 5000, ttlMs: cfg.SYMBOL_CACHE_TTL_MS });
const priceCache = new TtlCache({ max: 5000, ttlMs: cfg.PRICE_CACHE_TTL_MS });
const negativeCache = new TtlCache({ max: 1000, ttlMs: 900000 });

const COMMON = {
  BTC: { coinId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  ETH: { coinId: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  SOL: { coinId: 'solana', symbol: 'SOL', name: 'Solana' },
  BNB: { coinId: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  XRP: { coinId: 'ripple', symbol: 'XRP', name: 'XRP' },
  ADA: { coinId: 'cardano', symbol: 'ADA', name: 'Cardano' },
  DOGE: { coinId: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  AVAX: { coinId: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  DOT: { coinId: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  MATIC: { coinId: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
};

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchJson(url, options = {}, meta = {}) {
  const { signal, clear } = withTimeout(cfg.MARKET_TIMEOUT_MS);
  const started = Date.now();
  log.info('market api call start', meta);
  try {
    const res = await fetch(url, { ...options, signal, headers: { 'User-Agent': 'CryptoWatcherBot/1.0', ...(options.headers || {}) } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      const message = json?.status?.error_message || json?.error || json?.message || text || `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    log.info('market api call success', { ...meta, ms: Date.now() - started });
    return json;
  } catch (err) {
    log.warn('market api call failure', { ...meta, err: safeErr(err) });
    throw err;
  } finally {
    clear();
  }
}

async function saveCoin(coin) {
  try {
    await col('coins').updateOne(
      { coinId: coin.coinId },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: { symbol: coin.symbol, name: coin.name, coinId: coin.coinId, updatedAt: new Date(), lastResolvedAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    log.error('db write failed', { collection: 'coins', operation: 'updateOne', err: safeErr(err) });
  }
}

export async function resolveCoin(input) {
  const symbol = normalizeSymbol(input);
  if (!symbol) return null;
  if (negativeCache.get(symbol)) return null;
  const cached = symbolCache.get(symbol);
  if (cached) return cached;
  if (COMMON[symbol]) {
    symbolCache.set(symbol, COMMON[symbol]);
    await saveCoin(COMMON[symbol]);
    return COMMON[symbol];
  }
  try {
    const row = await col('coins').findOne({ symbol });
    if (row) {
      const coin = { coinId: row.coinId, symbol: row.symbol, name: row.name };
      symbolCache.set(symbol, coin);
      return coin;
    }
  } catch (err) {
    log.error('db read failed', { collection: 'coins', operation: 'findOne', err: safeErr(err) });
  }
  try {
    const url = `${COINGECKO}/search?query=${encodeURIComponent(symbol)}`;
    const data = await fetchJson(url, {}, { provider: 'coingecko', operation: 'search', symbol });
    const coins = Array.isArray(data?.coins) ? data.coins : [];
    const exact = coins.find((c) => String(c.symbol || '').toUpperCase() === symbol) || coins[0];
    if (!exact?.id) {
      negativeCache.set(symbol, true);
      return null;
    }
    const coin = { coinId: exact.id, symbol: String(exact.symbol || symbol).toUpperCase(), name: exact.name || symbol };
    symbolCache.set(symbol, coin);
    await saveCoin(coin);
    return coin;
  } catch (err) {
    const stale = await staleCoin(symbol);
    if (stale) return stale;
    negativeCache.set(symbol, true);
    return null;
  }
}

async function staleCoin(symbol) {
  try {
    const row = await col('coins').findOne({ symbol });
    return row ? { coinId: row.coinId, symbol: row.symbol, name: row.name } : null;
  } catch (err) {
    log.error('db read failed', { collection: 'coins', operation: 'staleCoin', err: safeErr(err) });
    return null;
  }
}

async function savePrice(p) {
  try {
    await col('cached_prices').updateOne(
      { coinId: p.coinId, currency: 'usd' },
      { $setOnInsert: { }, $set: { ...p, currency: 'usd', updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    log.error('db write failed', { collection: 'cached_prices', operation: 'updateOne', err: safeErr(err) });
  }
}

export async function getPrices(coins) {
  const result = new Map();
  const missing = [];
  for (const coin of coins) {
    const cached = priceCache.get(coin.coinId);
    if (cached) result.set(coin.coinId, cached);
    else missing.push(coin);
  }
  if (!missing.length) return result;
  try {
    const ids = missing.map((c) => c.coinId).join(',');
    const url = `${COINGECKO}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const data = await fetchJson(url, {}, { provider: 'coingecko', operation: 'simple_price', count: missing.length });
    for (const coin of missing) {
      const raw = data?.[coin.coinId];
      if (!raw?.usd) continue;
      const p = { coinId: coin.coinId, symbol: coin.symbol, name: coin.name, price: Number(raw.usd), change24h: Number(raw.usd_24h_change), provider: 'CoinGecko', fetchedAt: new Date(), stale: false };
      priceCache.set(coin.coinId, p);
      result.set(coin.coinId, p);
      await savePrice(p);
    }
  } catch {}
  const stillMissing = missing.filter((c) => !result.has(c.coinId));
  if (stillMissing.length && cfg.COINMARKETCAP_API_KEY) {
    await fillFromCoinMarketCap(stillMissing, result);
  }
  for (const coin of stillMissing) {
    if (result.has(coin.coinId)) continue;
    try {
      const row = await col('cached_prices').findOne({ coinId: coin.coinId, currency: 'usd' });
      if (row) result.set(coin.coinId, { ...row, stale: true, provider: `${row.provider || 'cache'} cached` });
    } catch (err) {
      log.error('db read failed', { collection: 'cached_prices', operation: 'findOne', err: safeErr(err) });
    }
  }
  return result;
}

async function fillFromCoinMarketCap(coins, result) {
  try {
    const symbols = [...new Set(coins.map((c) => c.symbol))].join(',');
    const url = `${CMC}/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbols)}&convert=USD`;
    const data = await fetchJson(url, { headers: { 'X-CMC_PRO_API_KEY': cfg.COINMARKETCAP_API_KEY } }, { provider: 'coinmarketcap', operation: 'quotes_latest', count: coins.length });
    for (const coin of coins) {
      const rows = data?.data?.[coin.symbol];
      const item = Array.isArray(rows) ? rows[0] : rows;
      const usd = item?.quote?.USD;
      if (!usd?.price) continue;
      const p = { coinId: coin.coinId, symbol: coin.symbol, name: coin.name, price: Number(usd.price), change24h: Number(usd.percent_change_24h), provider: 'CoinMarketCap', fetchedAt: new Date(), stale: false };
      priceCache.set(coin.coinId, p);
      result.set(coin.coinId, p);
      await savePrice(p);
    }
  } catch {}
}

export async function getPriceForSymbol(symbol) {
  const coin = await resolveCoin(symbol);
  if (!coin) return { coin: null, price: null };
  const prices = await getPrices([coin]);
  return { coin, price: prices.get(coin.coinId) || null };
}
