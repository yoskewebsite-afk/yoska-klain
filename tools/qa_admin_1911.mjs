// 19.11.2026 QA of the admin: secret path, code nudge, code card, code sign-in, upcoming-tours editor.
// node tools/qa_admin_1911.mjs <base> <outdir> <email> <password>
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [base, out, email, pw] = process.argv.slice(2);
const A = base + '/yoske-nihul-7k4q';
const b = await chromium.launch({ executablePath: exe });
for (const [w, hgt] of [[1280, 860], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: hgt }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(A); if (await p.$('[data-way="pw"]')) await p.click('[data-way="pw"]'); await p.fill('#email', email); await p.fill('#password', pw); await p.click('#go');
  await p.waitForSelector('#main', { timeout: 15000 }); await p.waitForTimeout(3200);
  await p.screenshot({ path: `${out}/adm-${w}-nudge.png` });
  const nudge = await p.$('.dlg__box h2'); console.log(w, 'nudge:', nudge ? await nudge.textContent() : 'none');
  if (nudge) await p.click('.dlg__box .btn--primary');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/adm-${w}-settings.png` });
  if (w > 700) {
    await p.fill('#code input >> nth=0', '730194'); await p.fill('#code input >> nth=1', '730194');
    await p.click('#code .btn--primary'); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/adm-${w}-code-on.png` });
    await p.goto(A + '#/pages/index'); await p.waitForTimeout(2000);
    await p.screenshot({ path: `${out}/adm-${w}-pages.png` });
  }
  console.log(w, 'errors', errs);
  await ctx.close();
}
// sign-in with the code
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(A); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/adm-login-code.png` });
await p.fill('#code', '730194'); await p.click('#go');
await p.waitForSelector('#main', { timeout: 15000 }).then(() => console.log('code sign-in: ok'), () => console.log('code sign-in: FAILED'));
const old = await (await fetch(base + '/admin')).text(); console.log('/admin is the admin?', /כניסה למערכת|app\.js/.test(old));
await b.close();
