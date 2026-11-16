// Creates (or resets) an admin user directly in the configured store.
//   node tools/admin_user.mjs --email you@example.com --name "שם"            (asks for the password; nothing is echoed or logged)
//   node tools/admin_user.mjs --email you@example.com --password '…' --reset  (non-interactive, for scripts and tests)
// Uses the same environment as the site: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or the local .data folder.
import readline from 'node:readline';
import { getStore } from '../api/_lib/store.mjs';
import { createUser, hashPassword, passwordProblem } from '../api/_lib/auth.mjs';

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const store = getStore();
if (!store) { console.error('אין מסד נתונים מוגדר (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'); process.exit(1); }
const email = (arg('email') || '').toLowerCase();
if (!email) { console.error('חסר --email'); process.exit(1); }

async function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = rl._writeToOutput; rl._writeToOutput = (s) => { if (!rl.stdoutMuted) w.call(rl, s); }; rl.stdoutMuted = false;
    process.stdout.write(q); rl.stdoutMuted = true;
    rl.question('', (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
const password = arg('password') || (await ask('סיסמה (10 תווים לפחות): '));
const bad = passwordProblem(password);
if (bad) { console.error(bad); process.exit(1); }
const existing = await store.get('users', email);
if (existing && !process.argv.includes('--reset')) { console.error('המשתמש כבר קיים. להחלפת סיסמה הוסיפו --reset.'); process.exit(1); }
if (existing) { await store.put('users', email, { ...existing, pw: await hashPassword(password) }); console.log('הסיסמה עודכנה:', email); }
else { await createUser(store, { email, name: arg('name') || '', password }); console.log('המנהל נוצר:', email); }
