// Full backup to a local folder: backups/<timestamp>/backup.json (content, leads, users, media records, audit, events) + media/ files.
//   node tools/backup.mjs [--out backups]          uses the same env as the site (Supabase, or the local .data folder)
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getStore } from '../api/_lib/store.mjs';
import { dump, summarize } from '../api/_lib/backup.mjs';

const i = process.argv.indexOf('--out');
const store = getStore();
if (!store) { console.error('אין מסד נתונים מוגדר.'); process.exit(1); }
const d = await dump(store, { files: true });
const dir = path.resolve(i > 0 ? process.argv[i + 1] : 'backups', d.at.replace(/[:.]/g, '-'));
mkdirSync(path.join(dir, 'media'), { recursive: true });
for (const f of d.files.media || []) if (f.b64) { writeFileSync(path.join(dir, 'media', f.name), Buffer.from(f.b64, 'base64')); delete f.b64; }
writeFileSync(path.join(dir, 'backup.json'), JSON.stringify(d));
console.log('backup written to', dir, JSON.stringify(summarize(d)));
