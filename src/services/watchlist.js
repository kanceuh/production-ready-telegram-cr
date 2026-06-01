import { col } from '../lib/db.js';
import { log, safeErr } from '../lib/logger.js';

export async function addWatch(userId, coin) {
  try {
    const count = await col('watchlist_items').countDocuments({ userId: String(userId) });
    if (count >= 50) return { ok: false, reason: 'limit' };
    await col('watchlist_items').updateOne(
      { userId: String(userId), coinId: coin.coinId },
      { $setOnInsert: { createdAt: new Date() }, $set: { userId: String(userId), coinId: coin.coinId, symbol: coin.symbol, name: coin.name, updatedAt: new Date() } },
      { upsert: true }
    );
    return { ok: true };
  } catch (err) {
    log.error('db write failed', { collection: 'watchlist_items', operation: 'addWatch', err: safeErr(err) });
    throw err;
  }
}

export async function removeWatch(userId, coinId) {
  try {
    const res = await col('watchlist_items').deleteOne({ userId: String(userId), coinId });
    return res.deletedCount > 0;
  } catch (err) {
    log.error('db write failed', { collection: 'watchlist_items', operation: 'removeWatch', err: safeErr(err) });
    throw err;
  }
}

export async function listWatch(userId) {
  try {
    return await col('watchlist_items').find({ userId: String(userId) }).sort({ }).toArray();
  } catch (err) {
    log.error('db read failed', { collection: 'watchlist_items', operation: 'listWatch', err: safeErr(err) });
    throw err;
  }
}
