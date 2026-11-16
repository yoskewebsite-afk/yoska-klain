// Storage adapter. One tiny interface, two backends:
//   * Supabase (REST + Storage) when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set  -> production
//   * local JSON files under CMS_DATA_DIR (default <project>/.data)                       -> development, tests, restore checks
// On Vercel without Supabase credentials there is deliberately NO backend: private APIs answer 503 and the public site
// keeps serving the content that was built into it. Documents are small JSON objects addressed by (collection, id).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'media';
const BACKUP_BUCKET = process.env.SUPABASE_BACKUP_BUCKET || 'backups';

export const newId = (n = 9) => randomBytes(n).toString('hex');
const safe = (s) => String(s).replace(/[^\w.\-@]/g, '_');

// ---------------------------------------------------------------- file backend
function fileStore(dir) {
  const p = (col, id) => path.join(dir, safe(col), safe(id) + '.json');
  const ensure = (f) => fs.mkdir(path.dirname(f), { recursive: true });
  return {
    kind: 'file',
    async get(col, id) {
      try { return JSON.parse(await fs.readFile(p(col, id), 'utf8')).data; } catch { return null; }
    },
    async put(col, id, data, { ifAbsent = false } = {}) {
      const f = p(col, id);
      await ensure(f);
      let created = new Date().toISOString();
      try {
        const old = JSON.parse(await fs.readFile(f, 'utf8'));
        if (ifAbsent) return { created: false };
        created = old.created_at;
      } catch { /* new */ }
      const tmp = f + '.' + newId(3) + '.tmp';
      await fs.writeFile(tmp, JSON.stringify({ created_at: created, updated_at: new Date().toISOString(), data }));
      await fs.rename(tmp, f);
      return { created: true };
    },
    async del(col, id) { await fs.rm(p(col, id), { force: true }); },
    async list(col, { since, until, limit = 5000 } = {}) {
      const d = path.join(dir, safe(col));
      let names = [];
      try { names = await fs.readdir(d); } catch { return []; }
      const rows = [];
      for (const n of names) {
        if (!n.endsWith('.json')) continue;
        try {
          const r = JSON.parse(await fs.readFile(path.join(d, n), 'utf8'));
          if (since && r.created_at < since) continue;
          if (until && r.created_at > until) continue;
          rows.push({ id: n.slice(0, -5), created_at: r.created_at, updated_at: r.updated_at, data: r.data });
        } catch { /* skip broken */ }
      }
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows.slice(0, limit);
    },
    async putFile(bucket, name, buf, mime) {
      const f = path.join(dir, '_files', safe(bucket), safe(name));
      await ensure(f);
      await fs.writeFile(f, buf);
      await fs.writeFile(f + '.mime', mime || 'application/octet-stream');
    },
    async getFile(bucket, name) {
      const f = path.join(dir, '_files', safe(bucket), safe(name));
      try { return { buf: await fs.readFile(f), mime: await fs.readFile(f + '.mime', 'utf8').catch(() => 'application/octet-stream') }; } catch { return null; }
    },
    async delFile(bucket, name) {
      const f = path.join(dir, '_files', safe(bucket), safe(name));
      await fs.rm(f, { force: true }); await fs.rm(f + '.mime', { force: true });
    },
    async listFiles(bucket) {
      try { return (await fs.readdir(path.join(dir, '_files', safe(bucket)))).filter((n) => !n.endsWith('.mime')); } catch { return []; }
    },
  };
}

// ---------------------------------------------------------------- supabase backend
function supabaseStore(url, key) {
  const base = url.replace(/\/+$/, '');
  // legacy JWT keys (eyJ…) go in both headers; the newer opaque secret keys (sb_secret_…) are not JWTs and must be sent as `apikey` only
  const h = (extra = {}) => ({ apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), ...extra });
  const rest = async (qs, init = {}) => {
    const r = await fetch(`${base}/rest/v1/kv?${qs}`, { ...init, headers: h({ 'Content-Type': 'application/json', ...(init.headers || {}) }) });
    if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r;
  };
  const q = (v) => encodeURIComponent(v);
  return {
    kind: 'supabase',
    async get(col, id) {
      const r = await rest(`col=eq.${q(col)}&id=eq.${q(id)}&select=data&limit=1`);
      const rows = await r.json();
      return rows[0]?.data ?? null;
    },
    async put(col, id, data, { ifAbsent = false } = {}) {
      const now = new Date().toISOString();
      const r = await rest('on_conflict=col,id', {
        method: 'POST',
        headers: { Prefer: `resolution=${ifAbsent ? 'ignore' : 'merge'}-duplicates,return=representation` },
        body: JSON.stringify({ col, id, data, updated_at: now }),
      });
      const rows = await r.json();
      return { created: rows.length > 0 };
    },
    async del(col, id) { await rest(`col=eq.${q(col)}&id=eq.${q(id)}`, { method: 'DELETE' }); },
    async list(col, { since, until, limit = 5000 } = {}) {
      const out = [];
      for (let off = 0; off < limit; off += 1000) {
        let qs = `col=eq.${q(col)}&select=id,data,created_at,updated_at&order=created_at.desc&limit=${Math.min(1000, limit - off)}&offset=${off}`;
        if (since) qs += `&created_at=gte.${q(since)}`;
        if (until) qs += `&created_at=lte.${q(until)}`;
        const rows = await (await rest(qs)).json();
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    },
    async putFile(bucket, name, buf, mime) {
      const r = await fetch(`${base}/storage/v1/object/${bucket}/${q(name)}`, { method: 'POST', headers: h({ 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' }), body: buf });
      if (!r.ok) throw new Error(`storage ${r.status}: ${(await r.text()).slice(0, 200)}`);
    },
    async getFile(bucket, name) {
      const r = await fetch(`${base}/storage/v1/object/${bucket}/${q(name)}`, { headers: h() });
      if (!r.ok) return null;
      return { buf: Buffer.from(await r.arrayBuffer()), mime: r.headers.get('content-type') || 'application/octet-stream' };
    },
    async delFile(bucket, name) { await fetch(`${base}/storage/v1/object/${bucket}/${q(name)}`, { method: 'DELETE', headers: h() }); },
    async listFiles(bucket) {
      const r = await fetch(`${base}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: h({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix: '', limit: 1000 }) });
      return r.ok ? (await r.json()).map((o) => o.name) : [];
    },
  };
}

let CACHED;
export function getStore() {
  if (CACHED !== undefined) return CACHED;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.CMS_STORE !== 'file' && url && key) CACHED = supabaseStore(url, key);
  else if (process.env.CMS_STORE === 'file' || !process.env.VERCEL) CACHED = fileStore(process.env.CMS_DATA_DIR || path.join(PROJECT, '.data'));
  else CACHED = null;
  return CACHED;
}
export function resetStore() { CACHED = undefined; }
export const buckets = { media: BUCKET, backups: BACKUP_BUCKET };
