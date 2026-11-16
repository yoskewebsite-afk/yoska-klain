// Restores a backup folder (from tools/backup.mjs) into a LOCAL scratch store. It never writes to Supabase.
//   node tools/restore.mjs backups/<timestamp> --to .data-restore
// To bring data back into production, load the same backup.json into the live project with a deliberate, reviewed script.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dir = process.argv[2], ti = process.argv.indexOf('--to');
if (!dir || ti < 0) { console.error('usage: node tools/restore.mjs <backup folder> --to <scratch folder>'); process.exit(1); }
process.env.CMS_STORE = 'file'; process.env.CMS_DATA_DIR = path.resolve(process.argv[ti + 1]);
delete process.env.SUPABASE_URL;
const { getStore } = await import('../api/_lib/store.mjs');
const { restoreInto } = await import('../api/_lib/backup.mjs');
const d = JSON.parse(readFileSync(path.join(dir, 'backup.json'), 'utf8'));
for (const f of d.files.media || []) f.b64 = readFileSync(path.join(dir, 'media', f.name)).toString('base64');
console.log('restored into', process.env.CMS_DATA_DIR, JSON.stringify(await restoreInto(getStore(), d)), 'media files on disk:', readdirSync(path.join(dir, 'media')).length);
