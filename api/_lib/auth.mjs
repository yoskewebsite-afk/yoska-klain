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

// 19.11.2026: sign-in with a personal code instead of mail + password. The code is 6 to 12 digits, set by the signed-in
// admin in Settings, stored only as an scrypt hash. Guessing is capped twice: 5 tries per address per 15 minutes, and
// 30 tries per hour for the whole site (so a million combinations cannot be walked even from many addresses).
export const codeProblem = (c) => (!/^\d{6,12}$/.test(String(c || '')) ? 'הקוד צריך להיות 6 עד 12 ספרות.' : null);
export async function setCode(store, email, code) {
  const user = await store.get('users', email);
  if (!user) throw Object.assign(new Error('המשתמש לא נמצא.'), { status: 404 });
  if (code === null) { delete user.code; }
  else {
    const bad = codeProblem(code);
    if (bad) throw Object.assign(new Error(bad), { status: 400 });
    if (/^(\d)\1+$/.test(code) || '0123456789012'.includes(code) || '9876543210987'.includes(code)) throw Object.assign(new Error('הקוד קל מדי לניחוש (ספרות זהות או רצף). בחרו קוד אחר.'), { status: 400 });
    user.code = await hashPassword(code);
  }
  await store.put('users', email, user);
  await audit(store, email, code === null ? 'code-off' : 'code-set', {});
}
// 19.11.2026: the signed-in admin changes his own password (the current one is required)
export async function changePassword(store, email, current, next) {
  if (!(await rateLimit(store, `pwchange:${email}`, 5, 15 * 60)).ok) throw Object.assign(new Error('יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.'), { status: 429 });
  const user = await store.get('users', email);
  if (!user || !(await verifyPassword(String(current || ''), user.pw))) throw Object.assign(new Error('הסיסמה הנוכחית לא נכונה.'), { status: 400 });
  const bad = passwordProblem(next);
  if (bad) throw Object.assign(new Error(bad), { status: 400 });
  if (String(next) === String(current)) throw Object.assign(new Error('הסיסמה החדשה זהה לנוכחית.'), { status: 400 });
  user.pw = await hashPassword(String(next));
  await store.put('users', email, user);
  await audit(store, email, 'password-change', {});
}
async function userByCode(store, code) {
  const users = (await store.list('users', { limit: 20 })).map((r) => r.data || {});
  let hit = null;
  for (const u of users) if (u.code && !hit && await verifyPassword(code, u.code)) hit = u;
  if (!users.some((u) => u.code)) await scrypt('x', 'y', 64, { N, r: 8, p: 1 });
  return hit;
}

export async function login(store, req, res) {
  const body = await readJson(req);
  let email = String(body.email || '').trim().toLowerCase();
  let user = null, ok = false;
  if (body.code !== undefined) {
    const code = String(body.code || '').trim();
    const rl = await rateLimit(store, `login-code:${ipHash(req)}`, 5, 15 * 60);
    const rg = await rateLimit(store, 'login-code:all', 30, 60 * 60);
    if (!rl.ok || !rg.ok) return fail(res, 429, 'יותר מדי ניסיונות עם קוד. נסו שוב מאוחר יותר, או היכנסו עם מייל וסיסמה.');
    user = codeProblem(code) ? null : await userByCode(store, code);
    ok = !!user;
    if (!ok) return fail(res, 401, 'הקוד לא נכון.');
    email = user.email;
  } else {
    const rl = await rateLimit(store, `login:${ipHash(req)}:${email}`, 6, 15 * 60);
    if (!rl.ok) return fail(res, 429, 'יותר מדי ניסיונות התחברות. נסו שוב בעוד כרבע שעה.');
    user = email ? await store.get('users', email) : null;
    ok = user ? await verifyPassword(String(body.password || ''), user.pw) : (await scrypt('x', 'y', 64, { N, r: 8, p: 1 }), false);   // same cost either way
    if (!ok) return fail(res, 401, 'המייל או הסיסמה לא נכונים.');
  }
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_HOURS * 3600e3;
  await store.put('sessions', sha256(token), { email, csrf, exp, createdAt: new Date().toISOString() });
  await audit(store, email, 'login', {});
  send(res, 200, { ok: true, user: { email, name: user.name }, csrf }, { 'Set-Cookie': cookieHeader(COOKIE, token, { maxAge: SESSION_HOURS * 3600 }) });
}

// Every admin request checks the session. The two lookups (session + user) are kept for a few seconds in this warm
// instance, so a screen that fires several API calls pays for them once. Logout clears it; expiry is still checked each time.
const SESS_TTL = 20_000;
const SESS_CACHE = new Map();
export const forgetSession = (key) => SESS_CACHE.delete(key);

export async function session(store, req) {
  const t = cookies(req)[COOKIE];
  if (!t || !store) return null;
  const key = sha256(t);
  let hit = SESS_CACHE.get(key);
  if (!hit || Date.now() - hit.at > SESS_TTL) {
    const s = await store.get('sessions', key);
    const user = s ? await store.get('users', s.email) : null;
    hit = { at: Date.now(), s, user };
    if (SESS_CACHE.size > 200) SESS_CACHE.clear();
    if (s && user) SESS_CACHE.set(key, hit); else SESS_CACHE.delete(key);
  }
  const { s, user } = hit;
  if (!s) return null;
  if (s.exp < Date.now()) { SESS_CACHE.delete(key); await store.del('sessions', key); return { expired: true }; }
  if (!user) return null;
  return { email: s.email, name: user.name, role: user.role, csrf: s.csrf, token: t };
}

export async function logout(store, req, res) {
  const t = cookies(req)[COOKIE];
  if (t) forgetSession(sha256(t));
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
