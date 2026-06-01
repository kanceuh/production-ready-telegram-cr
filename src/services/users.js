import { col } from '../lib/db.js';
import { log, safeErr } from '../lib/logger.js';

export async function upsertUser(ctx) {
  const from = ctx.from;
  if (!from?.id) return;
  const mutable = {
    telegramUserId: String(from.id),
    chatId: ctx.chat?.id ? String(ctx.chat.id) : '',
    username: from.username || '',
    firstName: from.first_name || '',
    languageCode: from.language_code || '',
    isBlocked: false,
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  };
  delete mutable._id;
  delete mutable.createdAt;
  try {
    await col('users').updateOne(
      { telegramUserId: String(from.id) },
      { $setOnInsert: { createdAt: new Date() }, $set: mutable },
      { upsert: true }
    );
  } catch (err) {
    log.error('db write failed', { collection: 'users', operation: 'updateOne', err: safeErr(err) });
  }
}

export async function markUserBlocked(userId, blocked = true) {
  try {
    await col('users').updateOne(
      { telegramUserId: String(userId) },
      { $set: { isBlocked: blocked, updatedAt: new Date() } }
    );
  } catch (err) {
    log.error('db write failed', { collection: 'users', operation: 'markUserBlocked', err: safeErr(err) });
  }
}
