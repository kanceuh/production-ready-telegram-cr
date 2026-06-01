import { MongoClient } from 'mongodb';
import { log, safeErr } from './logger.js';

let client = null;
let db = null;

export async function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required for Crypto Watcher persistence.');
  }
  if (db) return db;
  try {
    client = new MongoClient(uri, { maxPoolSize: 8, ignoreUndefined: true });
    await client.connect();
    db = client.db();
    log.info('db connected');
    await ensureIndexes();
    return db;
  } catch (err) {
    log.error('db connect failed', { err: safeErr(err) });
    throw err;
  }
}

export function getDb() {
  if (!db) throw new Error('Database is not connected.');
  return db;
}

export function col(name) {
  return getDb().collection(name);
}

export async function ensureIndexes() {
  try {
    await col('users').createIndex({ telegramUserId: 1 }, { unique: true });
    await col('watchlist_items').createIndex({ userId: 1, coinId: 1 }, { unique: true });
    await col('alerts').createIndex({ status: 1, coinId: 1 });
    await col('alerts').createIndex({ userId: 1, status: 1, createdAt: -1 });
    await col('coins').createIndex({ symbol: 1 });
    await col('coins').createIndex({ coinId: 1 }, { unique: true });
    await col('cached_prices').createIndex({ coinId: 1, currency: 1 }, { unique: true });
    await col('notification_logs').createIndex({ alertId: 1, createdAt: -1 });
    log.info('db indexes ensured');
  } catch (err) {
    log.error('db index failure', { collection: 'multiple', operation: 'createIndex', err: safeErr(err) });
    throw err;
  }
}

export async function closeDb() {
  if (!client) return;
  await client.close();
  client = null;
  db = null;
}
