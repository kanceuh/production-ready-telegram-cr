import { InlineKeyboard } from 'grammy';
import { addWatch, listWatch, removeWatch } from '../services/watchlist.js';
import { createAlert, listAlerts, removeAlert } from '../services/alerts.js';
import { getPriceForSymbol, getPrices, resolveCoin } from '../services/market.js';
import { compactUsd, formatChange, shortId } from '../utils/format.js';

export function mainMenu() {
  return new InlineKeyboard()
    .text('Price Lookup', 'help:price')
    .text('Watchlist', 'watchlist')
    .row()
    .text('Add Alert', 'help:alert')
    .text('Help', 'help');
}

export function priceKeyboard(symbol) {
  return new InlineKeyboard()
    .text('Refresh Price', `price:${symbol}`)
    .text('Add Alert', 'help:alert')
    .row()
    .text('Watchlist', 'watchlist')
    .text('Add to Watchlist', `addwatch:${symbol}`);
}

export async function replyOrEdit(ctx, text, keyboard) {
  const opts = keyboard ? { reply_markup: keyboard } : {};
  if (ctx.callbackQuery?.message) {
    try { await ctx.editMessageText(text, opts); return; } catch {}
  }
  await ctx.reply(text, opts);
}

export async function showPrice(ctx, symbol) {
  const userSymbol = String(symbol || '').trim();
  if (!userSymbol) {
    return replyOrEdit(ctx, 'Try /price BTC, /price ETH, or /price SOL.', new InlineKeyboard().text('Cancel', 'cancel'));
  }
  const { coin, price } = await getPriceForSymbol(userSymbol);
  if (!coin) return replyOrEdit(ctx, 'I could not find that coin. Try BTC, ETH, SOL, or check the spelling.');
  if (!price) return replyOrEdit(ctx, 'Market data is temporarily unavailable and I do not have a cached price yet. Please try again later.');
  const stale = price.stale ? '\nUsing cached or stale market data.' : '';
  const text = `${coin.name} (${coin.symbol})\nPrice: ${compactUsd(price.price)}\nChange: ${formatChange(price.change24h)}\nSource: ${price.provider}${stale}`;
  return replyOrEdit(ctx, text, priceKeyboard(coin.symbol));
}

export async function addWatchBySymbol(ctx, symbol) {
  const coin = await resolveCoin(symbol);
  if (!coin) return replyOrEdit(ctx, 'I could not find that coin. Try BTC, ETH, SOL, or check the spelling.');
  const res = await addWatch(ctx.from.id, coin);
  if (!res.ok && res.reason === 'limit') return replyOrEdit(ctx, 'Your watchlist is full. Remove a coin before adding another.');
  return replyOrEdit(ctx, `${coin.symbol} was added to your watchlist.`, new InlineKeyboard().text('Watchlist', 'watchlist').text('Add Alert', 'help:alert'));
}

export async function removeWatchBySymbol(ctx, symbol) {
  const coin = await resolveCoin(symbol);
  if (!coin) return replyOrEdit(ctx, 'I could not find that coin on your watchlist.');
  const ok = await removeWatch(ctx.from.id, coin.coinId);
  return replyOrEdit(ctx, ok ? `${coin.symbol} was removed from your watchlist.` : `${coin.symbol} was not on your watchlist.`, new InlineKeyboard().text('Back to Watchlist', 'watchlist'));
}

export async function showWatchlist(ctx) {
  const rows = await listWatch(ctx.from.id);
  if (!rows.length) return replyOrEdit(ctx, 'Your watchlist is empty. Add one with /addwatch BTC.', new InlineKeyboard().text('Add Alert', 'help:alert').text('Price Lookup', 'help:price'));
  const prices = await getPrices(rows);
  const lines = ['Your watchlist'];
  for (const row of rows) {
    const p = prices.get(row.coinId);
    lines.push(p ? `${row.symbol}: ${compactUsd(p.price)} (${formatChange(p.change24h)})${p.stale ? ' cached' : ''}` : `${row.symbol}: price unavailable`);
  }
  const kb = new InlineKeyboard().text('Refresh Price', 'watchlist').text('Add Alert', 'help:alert');
  for (const row of rows.slice(0, 6)) kb.row().text(`Remove ${row.symbol}`, `removewatch:${row.symbol}`).text(`${row.symbol} Price`, `price:${row.symbol}`);
  return replyOrEdit(ctx, lines.join('\n'), kb);
}

export async function createAlertByArgs(ctx, args) {
  const [rawSymbol, rawDirection, rawPrice] = args;
  if (!rawSymbol || !rawDirection || !rawPrice) return replyOrEdit(ctx, 'Use /alert BTC above 70000 or /alert ETH below 2500.');
  const direction = String(rawDirection).toLowerCase();
  const targetPrice = Number(rawPrice);
  if (!['above', 'below'].includes(direction)) return replyOrEdit(ctx, 'Direction must be above or below. Example: /alert BTC above 70000');
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return replyOrEdit(ctx, 'Target price must be a positive number. Example: /alert SOL below 100');
  const coin = await resolveCoin(rawSymbol);
  if (!coin) return replyOrEdit(ctx, 'I could not find that coin. Try BTC, ETH, SOL, or check the spelling.');
  const res = await createAlert({ userId: ctx.from.id, chatId: ctx.chat.id, coin, direction, targetPrice });
  if (!res.ok && res.reason === 'limit') return replyOrEdit(ctx, 'You already have the maximum number of active alerts. Remove one first.');
  return replyOrEdit(ctx, `Alert created for ${coin.symbol}\nTrigger: ${direction} ${compactUsd(targetPrice)}\nID: ${shortId(res.id)}`, new InlineKeyboard().text('View Alerts', 'alerts').text('Watchlist', 'watchlist'));
}

export async function showAlerts(ctx) {
  const rows = await listAlerts(ctx.from.id);
  if (!rows.length) return replyOrEdit(ctx, 'You have no alerts yet. Create one with /alert BTC above 70000.', new InlineKeyboard().text('Add New Alert', 'help:alert').text('Watchlist', 'watchlist'));
  const lines = ['Your alerts'];
  const kb = new InlineKeyboard().text('Add New Alert', 'help:alert').text('Watchlist', 'watchlist');
  for (const row of rows) {
    lines.push(`${shortId(row._id)} ${row.symbol} ${row.direction} ${compactUsd(row.targetPrice)} ${row.status}`);
    if (row.status === 'active') kb.row().text(`Remove ${shortId(row._id)}`, `removealert:${row._id}`);
  }
  return replyOrEdit(ctx, lines.join('\n'), kb);
}

export async function removeAlertById(ctx, id) {
  const ok = await removeAlert(ctx.from.id, id);
  return replyOrEdit(ctx, ok ? 'Alert removed.' : 'I could not find an active alert with that ID for your account.', new InlineKeyboard().text('View Alerts', 'alerts'));
}
