// Backups: everything that is not code. Content (draft, published, every revision), leads, users, media records and files,
// audit log and measurement events. The same dump format is written by the nightly cron, by the admin button and by tools/backup.mjs.
import { newId, buckets } from './store.mjs';

const COLLECTIONS = ['content', 'revisions', 'leads', 'users', 'media', 'audit', 'events'];
export const KEEP = +process.env.BACKUP_KEEP || 14;

export async function dump(store, { files = false } = {}) {
  const out = { format: 'yoske-backup-1', at: new Date().toISOString(), store: store.kind, collections: {}, files: {} };
  for (const c of COLLECTIONS) {
    const rows = await store.list(c, { limit: 100000 });
    out.collections[c] = rows.map((r) => ({ id: r.id, created_at: r.created_at, updated_at: r.updated_at, data: r.data }));
  }
  const names = await store.listFiles(buckets.media);
  out.files[buckets.media] = [];
  for (const name of names) {
    if (!files) { out.files[buckets.media].push({ name }); continue; }
    const f = await store.getFile(buckets.media, name);
    if (f) out.files[buckets.media].push({ name, mime: f.mime, b64: f.buf.toString('base64') });
  }
  return out;
}

export function summarize(d) {
  return { at: d.at, counts: Object.fromEntries(Object.entries(d.collections).map(([k, v]) => [k, v.length])), mediaFiles: (d.files[buckets.media] || []).length };
}

/** writes a dump into a store (used to rehearse a restore on a scratch directory; never called against live data by itself) */
export async function restoreInto(target, d) {
  if (d.format !== 'yoske-backup-1') throw new Error('פורמט גיבוי לא מוכר');
  for (const [c, rows] of Object.entries(d.collections)) for (const r of rows) await target.put(c, r.id, r.data);
  for (const f of d.files[buckets.media] || []) if (f.b64) await target.putFile(buckets.media, f.name, Buffer.from(f.b64, 'base64'), f.mime);
  return summarize(d);
}

/** a stored backup (JSON in the backup bucket + a small record), pruned to the newest KEEP */
export async function createStored(store, who = 'cron') {
  const d = await dump(store, { files: false });
  const id = d.at.replace(/[:.]/g, '-');
  const buf = Buffer.from(JSON.stringify(d));
  await store.putFile(buckets.backups, `backup-${id}.json`, buf, 'application/json');
  const meta = { id, name: `backup-${id}.json`, at: d.at, by: who, bytes: buf.length, ...summarize(d) };
  await store.put('backups', id, meta);
  const all = await store.list('backups', { limit: 500 });
  for (const r of all.slice(KEEP)) { await store.delFile(buckets.backups, r.data.name); await store.del('backups', r.id); }
  return meta;
}
export async function listStored(store) { return (await store.list('backups', { limit: 100 })).map((r) => r.data); }
export async function readStored(store, id) { const m = await store.get('backups', id); if (!m) return null; const f = await store.getFile(buckets.backups, m.name); return f ? { name: m.name, buf: f.buf } : null; }
export { newId };
