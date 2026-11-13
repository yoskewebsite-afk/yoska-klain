// Interaction + accessibility checks for the 10.11.2026 rebuild (server on :4190).
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: exe });
const res = {};
const runAxe = async (p, name) => { await p.addScriptTag({ content: axe }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }))); res['axe ' + name] = r; };
for (const [pg, w, h, rm] of [['/', 1440, 900, 'reduce'], ['/', 390, 844, 'reduce'], ['/tours/haifa-ahuvati.html', 1440, 900, 'reduce'], ['/groups.html', 390, 844, 'reduce'], ['/gallery.html', 1440, 900, 'reduce']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: rm, bypassCSP: true });
  await p.goto('http://127.0.0.1:4190' + pg, { waitUntil: 'networkidle' }); await runAxe(p, `${pg} ${w}`); await p.close();
}
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' });
// map tabs: click + arrow keys
await p.click('#mt-haifa-shel-mata'); res.mapClick = await p.evaluate(() => ({ sel: document.querySelector('.chip[aria-selected=true]').textContent, on: [...document.querySelectorAll('.pin.is-on')].map(x => x.dataset.place), panel: !document.getElementById('mp-haifa-shel-mata').hidden }));
await p.keyboard.press('ArrowLeft'); res.mapKey = await p.evaluate(() => ({ sel: document.querySelector('.chip[aria-selected=true]').textContent, focus: document.activeElement.textContent }));
// card toggle + focus-within
await p.evaluate(() => document.getElementById('tours').scrollIntoView()); await p.waitForTimeout(800);
const t = await p.$('[data-card-toggle]'); await t.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
res.card = await p.evaluate(() => { const c = document.querySelector('[data-card]'); const d = c.querySelector('[data-card-details]'); return { open: c.classList.contains('is-open'), exp: c.querySelector('[data-card-toggle]').getAttribute('aria-expanded'), vis: getComputedStyle(d).visibility, tf: getComputedStyle(d).transform }; });
await p.keyboard.press('Escape'); res.cardEsc = await p.evaluate(() => document.querySelector('[data-card]').classList.contains('is-open'));
// rail next
const before = await p.evaluate(() => document.querySelector('[data-rail-track]').scrollLeft); await p.click('[data-rail-next]'); await p.waitForTimeout(900);
res.rail = { before, after: await p.evaluate(() => document.querySelector('[data-rail-track]').scrollLeft), prevDisabled: await p.evaluate(() => document.querySelector('[data-rail-prev]').disabled) };
// form: invalid, then valid
await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await p.waitForTimeout(600);
await p.click('.cform__go'); res.formEmpty = await p.evaluate(() => ({ nameErr: !document.getElementById('c-name-err').hidden, focus: document.activeElement.id, ready: !document.querySelector('[data-ready]').hidden }));
await p.fill('#c-name', 'בדיקה'); await p.fill('#c-phone', '12'); await p.click('.cform__go');
res.formBadPhone = await p.evaluate(() => ({ phoneErr: !document.getElementById('c-phone-err').hidden, inv: document.getElementById('c-phone').getAttribute('aria-invalid') }));
await p.fill('#c-phone', '050-1234567'); await p.fill('#c-msg', 'יום הולדת, 12 משתתפים'); await p.click('.cform__go');
res.formOk = await p.evaluate(() => ({ ready: !document.querySelector('[data-ready]').hidden, text: document.querySelector('[data-preview]').textContent, href: document.querySelector('[data-open-wa]').href.slice(0, 60), focus: document.activeElement.matches('[data-ready]'), sentClaim: /נשלחה(?! )/.test(document.querySelector('[data-ready]').textContent) && !/לא נשלחה/.test(document.querySelector('[data-ready]').textContent) }));
// side rail state
await p.evaluate(() => document.getElementById('faq').scrollIntoView()); await p.waitForTimeout(900);
res.rail2 = await p.evaluate(() => ({ on: document.querySelector('[data-siderail]').classList.contains('is-on'), cur: document.querySelector('.siderail [aria-current]')?.dataset.railLink }));
// reload in the middle of the hero sequence and in the middle of the page
await p.evaluate(() => window.__hero(.5)); await p.waitForTimeout(800); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
res.reloadMidHero = await p.evaluate(() => ({ y: Math.round(scrollY), introOp: getComputedStyle(document.querySelector('[data-hero-intro]')).opacity, headOp: getComputedStyle(document.querySelector('[data-hero-head]')).opacity }));
await p.screenshot({ path: 'output/v4/reload-mid-hero.jpg', quality: 70, type: 'jpeg' });
// scroll back up through the sequence: the headline must come back
await p.evaluate(() => window.__hero(0)); await p.waitForTimeout(1500);
res.backToTop = await p.evaluate(() => ({ headOp: getComputedStyle(document.querySelector('[data-hero-head]')).opacity, introOp: getComputedStyle(document.querySelector('[data-hero-intro]')).opacity }));
// release: just after the hero ends the map section starts with no gap jump
res.release = await p.evaluate(() => { const h = document.querySelector('.hero'); const m = document.getElementById('map'); return { heroBottom: Math.round(h.getBoundingClientRect().bottom + scrollY), mapTop: Math.round(m.getBoundingClientRect().top + scrollY) }; });
// resize mid-page
await p.evaluate(() => window.__hero(.3)); await p.waitForTimeout(600); await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(1200);
res.resize = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: innerWidth, sceneTop: getComputedStyle(document.querySelector('.hero__stage')).getPropertyValue('--scene-top') }));
await p.screenshot({ path: 'output/v4/resize-1024.jpg', quality: 70, type: 'jpeg' });
// keyboard: first tabs
await p.setViewportSize({ width: 1440, height: 900 }); await p.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' });
const tabs = []; for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); tabs.push(await p.evaluate(() => (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent).trim().slice(0, 30))); }
res.tabOrder = tabs; res.errs = errs;
console.log(JSON.stringify(res, null, 1));
await b.close();
