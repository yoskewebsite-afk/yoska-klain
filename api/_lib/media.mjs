// Media library: uploads (validated by file signature, never trusting the browser's MIME), usage lookup, serving.
// The images that already ship with the site are listed from cms/media-index.json and cannot be deleted from here.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newId, buckets } from './store.mjs';
import { getDraft, getPublished } from './content.mjs';
import { effectiveTours, mergedSettings, assets } from './render.mjs';

const CMS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../cms');
const MAX_BYTES = 3_000_000;   // Vercel limits a request body to 4.5MB; JSON/base64 adds a third
const bad = (m, status = 400) => Object.assign(new Error(m), { status });
let BUILTIN;
export function builtin() {
  if (!BUILTIN) { try { BUILTIN = JSON.parse(readFileSync(path.join(CMS, 'media-index.json'), 'utf8')); } catch { BUILTIN = []; } }
  return BUILTIN;
}

/** type + size from the file's own bytes: png, jpeg, webp, gif. SVG is refused on purpose (scripts). */
export function sniff(buf) {
  if (buf.length > 24 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
    const f = buf.slice(12, 16).toString();
    if (f === 'VP8 ') return { mime: 'image/webp', ext: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (f === 'VP8L') { const b = buf.readUInt32LE(21); return { mime: 'image/webp', ext: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    if (f === 'VP8X') return { mime: 'image/webp', ext: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    return { mime: 'image/webp', ext: 'webp', w: 0, h: 0 };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { mime: 'image/jpeg', ext: 'jpg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { mime: 'image/jpeg', ext: 'jpg', w: 0, h: 0 };
  }
  if (buf.length > 10 && buf.slice(0, 3).toString() === 'GIF') return { mime: 'image/gif', ext: 'gif', w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  return null;
}

export async function upload(store, { name, data, alt }, who) {
  const buf = Buffer.from(String(data || ''), 'base64');
  if (!buf.length) throw bad('הקובץ ריק.');
  if (buf.length > MAX_BYTES) throw bad('התמונה גדולה מדי (עד 3MB). הדפדפן מקטין אוטומטית, נסו תמונה קטנה יותר.', 413);
  const t = sniff(buf);
  if (!t) throw bad('אפשר להעלות רק תמונות מסוג JPG, PNG, WebP או GIF.', 415);
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 12);
  const base = String(name || 'image').replace(/\.[^.]+$/, '').replace(/[^\w֐-׿-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
  const file = `${hash}.${t.ext}`;
  const id = 'u-' + hash;
  const existing = await store.get('media', id);
  if (existing) return existing;
  await store.putFile(buckets.media, file, buf, t.mime);
  const meta = { id, url: `/media/${file}`, name: base, mime: t.mime, bytes: buf.length, w: t.w, h: t.h, alt: String(alt || '').slice(0, 300), pos: '50% 50%', createdAt: new Date().toISOString(), by: who, builtin: false };
  await store.put('media', id, meta);
  return meta;
}

export async function list(store) {
  const mine = (await store.list('media', { limit: 5000 })).map((r) => r.data);
  const edits = Object.fromEntries(mine.filter((m) => m.builtin).map((m) => [m.id, m]));
  const base = builtin().map((b) => ({ ...b, ...(edits[b.id] || {}), builtin: true }));
  return [...mine.filter((m) => !m.builtin).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), ...base];
}

export async function patch(store, id, p) {
  let m = await store.get('media', id);
  if (!m) { const b = builtin().find((x) => x.id === id); if (!b) throw bad('התמונה לא נמצאה.', 404); m = { ...b }; }
  if (p.alt !== undefined) m.alt = String(p.alt).slice(0, 300);
  if (p.pos !== undefined && /^\d{1,3}% \d{1,3}%$/.test(p.pos)) m.pos = p.pos;
  if (p.name !== undefined) m.name = String(p.name).slice(0, 60);
  await store.put('media', id, m);
  return m;
}

/** every place (draft or published) that uses this address */
export async function usageOf(store, url) {
  const out = [];
  const A = assets();
  for (const [label, snap] of [['טיוטה', await getDraft(store)], ['פורסם', await getPublished(store)]]) {
    if (!snap) continue;
    for (const [pid, p] of Object.entries(snap.pages || {})) {
      const pageLabel = A.schema.pages[pid]?.label || pid;
      for (const [sid, s] of Object.entries(p.sec || {})) {
        const sec = A.schema.pages[pid]?.sections.find((x) => x.id === sid)?.label || sid;
        if (JSON.stringify(s.f || {}).includes(url) || JSON.stringify(s.l || {}).includes(url)) out.push({ where: `${pageLabel} › ${sec}`, state: label });
      }
      if (p.seo?.ogImage === url) out.push({ where: `${pageLabel} › תמונת שיתוף`, state: label });
    }
    for (const t of snap.tours || []) if (JSON.stringify([t.card, t.cover, t.gallery, t.seo]).includes(url)) out.push({ where: `טיול: ${t.name}`, state: label });
    const s = snap.settings || {};
    for (const k of ['logo', 'logoDark', 'ogImage']) if (s[k] === url) out.push({ where: `הגדרות › ${k}`, state: label });
  }
  const d = JSON.stringify(A.defaults.pages);
  if (d.includes(url)) out.push({ where: 'האתר כפי שנבנה (ברירת מחדל)', state: 'מובנה' });
  if (JSON.stringify(A.defaults.tours).includes(url)) out.push({ where: 'טיולים (ברירת מחדל)', state: 'מובנה' });
  return out;
}

export async function remove(store, id, force) {
  const m = await store.get('media', id);
  if (!m || m.builtin) throw bad('אי אפשר למחוק תמונה שהיא חלק מהאתר המובנה.', 403);
  const use = (await usageOf(store, m.url)).filter((u) => u.state !== 'מובנה');
  if (use.length && !force) throw Object.assign(bad('התמונה בשימוש. הסירו אותה משם לפני המחיקה.', 409), { usage: use });
  await store.delFile(buckets.media, m.url.replace('/media/', ''));
  await store.del('media', id);
}

export async function serve(store, file) {
  if (!/^[a-f0-9]{12}\.(png|jpg|webp|gif)$/.test(file)) return null;
  const f = await store.getFile(buckets.media, file);
  if (!f) return null;
  const ext = file.split('.').pop();
  return { buf: f.buf, mime: { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext] };
}
