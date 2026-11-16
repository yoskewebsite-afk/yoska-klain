// Small HTTP helpers shared by every function (plain Node req/res, so Vercel and the local dev server behave the same).
import { createHash } from 'node:crypto';

export const SECRET = process.env.SESSION_SECRET || (process.env.VERCEL ? '' : 'local-dev-secret-not-for-production');
export const isProd = !!process.env.VERCEL;

export function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  const payload = isObj ? JSON.stringify(body) : body;
  res.statusCode = status;
  const h = { 'Cache-Control': 'no-store', ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...headers };
  for (const [k, v] of Object.entries(h)) res.setHeader(k, v);
  res.end(payload ?? '');
}
export const fail = (res, status, message, extra = {}) => send(res, status, { ok: false, error: message, ...extra });

export async function readJson(req, limit = 7_000_000) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;   // Vercel pre-parsed
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw Object.assign(new Error('גוף הבקשה גדול מדי'), { status: 413 });
    chunks.push(c);
  }
  const txt = Buffer.concat(chunks).toString('utf8');
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { throw Object.assign(new Error('JSON לא תקין'), { status: 400 }); }
}

export function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}
export function cookieHeader(name, value, { maxAge, httpOnly = true } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${httpOnly ? '; HttpOnly' : ''}${isProd ? '; Secure' : ''}${maxAge !== undefined ? `; Max-Age=${maxAge}` : ''}`;
}
export const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
export const ipHash = (req) => createHash('sha256').update(clientIp(req) + '|' + SECRET).digest('hex').slice(0, 16);
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** counts hits per key in a fixed window, stored in the same store (works across serverless instances) */
export async function rateLimit(store, key, max, windowSec) {
  if (!store) return { ok: true, count: 0 };
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const id = `${sha256(key).slice(0, 24)}-${slot}`;
  const cur = (await store.get('ratelimit', id)) || { n: 0 };
  cur.n += 1;
  await store.put('ratelimit', id, cur);
  return { ok: cur.n <= max, count: cur.n };
}
export const urlOf = (req) => new URL(req.url, 'http://x');
