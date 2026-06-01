import { ObjectId } from 'mongodb';
import { col } from '../lib/db.js';
import { log, safeErr } from '../lib/logger.js';

export async function createAlert({ userId, chatId, coin, direction, targetPrice }) {
  try {
    const active = await col('alerts').countDocuments({ userId: String(userId), status: 'active' });
    if (active >= 50) return { ok: false, reason: 'limit' };
    const doc = {
      userId: String(userId),
      chatId: String(chatId),
      coinId: coin.coinId,
      symbol: coin.symbol,
      name: coin.name,
      direction,
      targetPrice,
      currency: 'usd',
      status: 'active',
      triggerOnce: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await col('alerts').insertOne(doc);
    return { ok: true, id: String(res.insertedId), alert: { ...doc, _id: res.insertedId } };
  } catch (err) {
    log.error('db write failed', { collection: 'alerts', operation: 'insertOne', err: safeErr(err) });
    throw err;
  }
}

export async function listAlerts(userId, includeTriggered = true) {
  try {
    const statuses = includeTriggered ? ['active', 'triggered'] : ['active'];
    return await col('alerts').find({ userId: String(userId), status: { $in: statuses } }).sort({ status: 1, createdAt: -1 }).limit(30).toArray();
  } catch (err) {
    log.error('db read failed', { collection: 'alerts', operation: 'listAlerts', err: safeErr(err) });
    throw err;
  }
}

export async function removeAlert(userId, id) {
  if (!ObjectId.isValid(id)) return false;
  try {
    const res = await col('alerts').updateOne(
      { _id: new ObjectId(id), userId: String(userId), status: { $ne: 'deleted' } },
      { $set: { status: 'deleted', updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  } catch (err) {
    log.error('db write failed', { collection: 'alerts', operation: 'removeAlert', err: safeErr(err) });
    throw err;
  }
}

export async function getActiveAlerts(limit = 1000) {
  try {
    return await col('alerts').find({ status: 'active' }).limit(limit).toArray();
  } catch (err) {
    log.error('db read failed', { collection: 'alerts', operation: 'getActiveAlerts', err: safeErr(err) });
    throw err;
  }
}

export async function markAlertChecked(alertId, price) {
  try {
    await col('alerts').updateOne(
      { _id: alertId },
      { $set: { lastCheckedPrice: price, lastCheckedAt: new Date(), updatedAt: new Date() } }
    );
  } catch (err) {
    log.error('db write failed', { collection: 'alerts', operation: 'markAlertChecked', err: safeErr(err) });
  }
}

export async function markTriggered(alertId, price) {
  try {
    const res = await col('alerts').updateOne(
      { _id: alertId, status: 'active' },
      { $set: { status: 'triggered', triggeredAt: new Date(), lastNotifiedAt: new Date(), lastCheckedPrice: price, lastCheckedAt: new Date(), updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  } catch (err) {
    log.error('db write failed', { collection: 'alerts', operation: 'markTriggered', err: safeErr(err) });
    return false;
  }
}

export async function logNotification(doc) {
  try {
    await col('notification_logs').insertOne({ ...doc, createdAt: new Date() });
  } catch (err) {
    log.error('db write failed', { collection: 'notification_logs', operation: 'insertOne', err: safeErr(err) });
  }
}
