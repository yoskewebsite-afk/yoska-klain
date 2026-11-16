// Admin authentication: scrypt password hashes, random session tokens (only their hash is stored), CSRF token per session.
import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, cookieHeader, sha256, rateLimit, ipHash, fail, readJson, send } from './http.mjs';
import { newId } from './store.mjs';

const scrypt = promisify(_scrypt);
const COOKIE = 'yoske_admin';
const SESSION_HOURS = 12;
const N = 16384;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const h = await scrypt(pw, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('hex')}$${h.toString('hex')}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, n, saltHex, hashHex] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  const h = await scrypt(pw, Buffer.from(saltHex, 'hex'), 64, { N: +n, r: 8, p: 1 });
  const want = Buffer.from(hashHex, 'hex');
  return h.length === want.length && timingSafeEqual(h, want);
}
export const passwordProblem = (pw) => (typeof pw !== 'string' || pw.length < 10 ? 'הסיסמה צריכה להכיל לפחות 10 תווים.' : null);

export async function userCount(store) { return (await store.list('users', { limit: 5 })).length; }
export async function createUser(store, { email, name, password, role = 'admin' }) {
  const id = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id)) throw Object.assign(new Error('כתובת המייל לא תקינה.'), { status: 400 });
  const bad = passwordProblem(password);
  if (bad) throw Object.assign(new Error(bad), { status: 400 });
  if (await store.get('users', id)) throw Object.assign(new Error('המשתמש כבר קיים.'), { status: 409 });
  await store.put('users', id, { email: id, name: String(name || '').slice(0, 80), role, pw: await hashPassword(password), createdAt: new Date().toISOString() });
  return id;
}

export async function login(store, req, res) {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const rl = await rateLimit(store, `login:${ipHash(req)}:${email}`, 6, 15 * 60);
  if (!rl.ok) return fail(res, 429, 'יותר מדי ניסיונות התחברות. נסו שוב בעוד כרבע שעה.');
  const user = email ? await store.get('users', email) : null;
  const ok = user ? await verifyPassword(String(body.password || ''), user.pw) : (await scrypt('x', 'y', 64, { N, r: 8, p: 1 }), false);   // same cost either way
  if (!ok) return fail(res, 401, 'המייל או הסיסמה לא נכונים.');
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_HOURS * 3600e3;
  await store.put('sessions', sha256(token), { email, csrf, exp, createdAt: new Date().toISOString() });
  await audit(store, email, 'login', {});
  send(res, 200, { ok: true, user: { email, name: user.name }, csrf }, { 'Set-Cookie': cookieHeader(COOKIE, token, { maxAge: SESSION_HOURS * 3600 }) });
}

export async function session(store, req) {
  const t = cookies(req)[COOKIE];
  if (!t || !store) return null;
  const s = await store.get('sessions', sha256(t));
  if (!s) return null;
  if (s.exp < Date.now()) { await store.del('sessions', sha256(t)); return { expired: true }; }
  const user = await store.get('users', s.email);
  if (!user) return null;
  return { email: s.email, name: user.name, role: user.role, csrf: s.csrf, token: t };
}

export async function logout(store, req, res) {
  const t = cookies(req)[COOKIE];
  if (t && store) await store.del('sessions', sha256(t));
  send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(COOKIE, '', { maxAge: 0 }) });
}

/** returns the session, or answers 401/403 and returns null. Mutating requests also need the CSRF header. */
export async function requireAdmin(store, req, res) {
  if (!store) { fail(res, 503, 'מסד הנתונים עדיין לא מחובר (חסרים SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY).', { code: 'no-store' }); return null; }
  const s = await session(store, req);
  if (!s || s.expired) { fail(res, 401, s?.expired ? 'ההתחברות פגה. התחברו שוב.' : 'צריך להתחבר.', { code: s?.expired ? 'expired' : 'auth' }); return null; }
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (req.headers['x-csrf-token'] !== s.csrf) { fail(res, 403, 'הבקשה נדחתה (אימות). רעננו את הדף ונסו שוב.', { code: 'csrf' }); return null; }
    const origin = req.headers.origin;
    if (origin && req.headers.host && new URL(origin).host !== req.headers.host) { fail(res, 403, 'מקור הבקשה לא מורשה.'); return null; }
  }
  return s;
}

export async function audit(store, who, action, detail) {
  try { await store.put('audit', `${Date.now().toString(36)}-${newId(3)}`, { at: new Date().toISOString(), who, action, detail }); } catch { /* an audit failure never blocks the action */ }
}
