export function normalizeSymbol(input) {
  return String(input || '').trim().replace(/^\$/u, '').toUpperCase();
}

export function compactUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  if (n >= 1000000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

export function formatChange(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '24h n/a';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}% 24h`;
}

export function formatTime(dateLike = new Date()) {
  return new Date(dateLike).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function shortId(id) {
  return String(id || '').slice(-8);
}
