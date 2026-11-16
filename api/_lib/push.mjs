// Web Push (RFC 8030 + 8291 aes128gcm + VAPID RFC 8292), written with node:crypto only. Used to notify Yossi's phone when a lead arrives,
// even when the admin app is closed. Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (node tools/gen_vapid.mjs) and a subscription saved from the admin app.
import { createECDH, createPrivateKey, createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, sign } from 'node:crypto';

const b64u = (b) => Buffer.from(b).toString('base64url');
const fromB64u = (s) => Buffer.from(String(s), 'base64url');

export function vapidKeys() {
  const e = createECDH('prime256v1'); e.generateKeys();
  return { publicKey: b64u(e.getPublicKey()), privateKey: b64u(e.getPrivateKey()) };
}
export const configured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const publicKey = () => process.env.VAPID_PUBLIC_KEY || '';

function vapidJwt(audience) {
  const pub = fromB64u(process.env.VAPID_PUBLIC_KEY), d = fromB64u(process.env.VAPID_PRIVATE_KEY);
  const key = createPrivateKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: b64u(d) } });
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: process.env.VAPID_SUBJECT || 'mailto:admin@example.com' }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

/** RFC 8291 encryption of one message for one subscription */
export function encrypt(sub, payload, { asKeys, salt } = {}) {
  const ua = fromB64u(sub.keys.p256dh), auth = fromB64u(sub.keys.auth);
  const ecdh = createECDH('prime256v1');
  if (asKeys) ecdh.setPrivateKey(fromB64u(asKeys)); else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(ua);
  const ikm = Buffer.from(hkdfSync('sha256', secret, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32));
  const s = salt || randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', ikm, s, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, s, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([s, rs, Buffer.from([asPub.length]), asPub, ct]);
}
/** the receiving side, used by the self-test (browsers do this for real) */
export function decrypt(body, uaPrivate, uaPublic, authSecret) {
  const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const ecdh = createECDH('prime256v1'); ecdh.setPrivateKey(fromB64u(uaPrivate));
  const ua = fromB64u(uaPublic), secret = ecdh.computeSecret(asPub);
  const ikm = Buffer.from(hkdfSync('sha256', secret, fromB64u(authSecret), Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return plain.subarray(0, plain.lastIndexOf(2)).toString();
}

export async function sendOne(sub, message) {
  const u = new URL(sub.endpoint);
  const r = await fetch(sub.endpoint, { method: 'POST', signal: AbortSignal.timeout(6000), headers: {
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high',
    Authorization: `vapid t=${vapidJwt(`${u.protocol}//${u.host}`)}, k=${process.env.VAPID_PUBLIC_KEY}` }, body: encrypt(sub, JSON.stringify(message)) });
  return r.status;
}

const idOf = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 24);
export async function save(store, email, sub) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw Object.assign(new Error('מנוי התראות לא תקין.'), { status: 400 });
  await store.put('push', idOf(sub.endpoint), { email, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, at: new Date().toISOString() });
}
export async function remove(store, endpoint) { await store.del('push', idOf(endpoint)); }

/** best effort: a failed push never affects the lead. Dead subscriptions (404/410) are removed. */
export async function broadcast(store, message) {
  if (!configured()) return { sent: 0, reason: 'not-configured' };
  const rows = await store.list('push', { limit: 200 });
  let sent = 0;
  for (const r of rows) {
    try {
      const st = await sendOne(r.data.sub, message);
      if (st === 404 || st === 410) await store.del('push', r.id); else if (st < 300) sent++;
    } catch { /* offline device or push service hiccup */ }
  }
  return { sent, total: rows.length };
}
