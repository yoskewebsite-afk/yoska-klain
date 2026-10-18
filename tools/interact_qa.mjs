// Interaction QA for the rebuilt homepage: matcher, contact draft, menu, anchors, sub-pages. node interact_qa.mjs
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const BASE = process.env.URL || 'http://localhost:4190';
const out = path.resolve(path.dirname(new globalThis.URL(import.meta.url).pathname), 'output/scene-qa/interact'); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const res = []; const ok = (name, cond, extra = '') => { res.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push(String(e))); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
await p.goto(BASE + '/', { waitUntil: 'networkidle' });

// matcher (pill sentence)
await p.locator('#match').scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
await p.locator('.chips label', { hasText: 'צוות מהעבודה' }).click();
ok('quiz: pill text follows choice', (await p.textContent('[data-pill-who-t]')).includes('צוות'));
await p.locator('.chips label', { hasText: 'רחובות, שווקים וסיפורים' }).click();
await p.click('[data-quiz-next]');
ok('quiz: team + streets -> חיפה של מטה', (await p.textContent('[data-quiz-tour]')).includes('של מטה'));
const waHref = await p.getAttribute('[data-quiz-wa]', 'href');
ok('quiz: WhatsApp draft carries answers', decodeURIComponent(waHref).includes('צוות מהעבודה') && waHref.startsWith('https://wa.me/972544361667'));
await p.locator('.chips label', { hasText: 'משפחה עם ילדים' }).click();
ok('quiz: changing an answer hides the old result', !(await p.isVisible('[data-quiz-result]')));
await p.click('[data-quiz-next]');
ok('quiz: family -> סודות ורמזים', (await p.textContent('[data-quiz-tour]')).includes('סודות'));
await p.screenshot({ path: path.join(out, 'quiz-result.jpg'), quality: 70, type: 'jpeg' });

// hero cards
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(300);
const before = await p.textContent('[data-hero-label]');
await p.click('[data-thumb]'); await p.waitForTimeout(1400);
ok('hero: thumbnail swaps the photo', (await p.textContent('[data-hero-label]')) !== before && (await p.$$eval('[data-slide].is-on', x => x.length)) === 1);
await p.click('[data-pause]'); ok('hero: pause toggles', (await p.getAttribute('[data-pause]', 'aria-pressed')) === 'true');

// what awaits
await p.locator('#groups').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
await p.click('[data-aw]:nth-child(3) .aw__toggle');
ok('awaits: panel opens, others close', await p.$eval('[data-aw]:nth-child(3)', e => e.classList.contains('is-open')) && (await p.$$eval('[data-aw].is-open', x => x.length)) === 1);

// band slider
await p.locator('.band').scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
const cap0 = await p.textContent('[data-band-cap]'); await p.click('[data-band-next]');
ok('band: next changes slide', (await p.textContent('[data-band-cap]')) !== cap0);

// contact
await p.locator('#contact').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await p.click('[data-contact] button[type=submit]');
ok('contact: name required', await p.isVisible('#c-name-err'));
await p.fill('#c-name', 'בדיקה'); await p.fill('#c-phone', '12'); await p.click('[data-contact] button[type=submit]');
ok('contact: bad phone rejected', await p.isVisible('#c-phone-err') && !(await p.isVisible('[data-ready]')));
await p.fill('#c-phone', '050-1234567'); await p.fill('#c-msg', 'יום לצוות של 15 איש'); await p.click('[data-contact] button[type=submit]');
ok('contact: draft prepared, nothing sent', await p.isVisible('[data-ready]'));
const pre = await p.textContent('[data-preview]');
ok('contact: preview has details', pre.includes('בדיקה') && pre.includes('050-1234567') && pre.includes('15'));
ok('contact: opens WhatsApp only via link', (await p.getAttribute('[data-open-wa]', 'href')).startsWith('https://wa.me/972544361667?text='));
await p.screenshot({ path: path.join(out, 'contact-ready.jpg'), quality: 70, type: 'jpeg' });
await p.fill('#c-msg', 'שינוי'); ok('contact: editing hides stale draft', !(await p.isVisible('[data-ready]')));

// faq
const faqOpen = await p.$$eval('.faq details', d => d.map(x => x.open));
await p.click('.faq details:nth-of-type(2) summary'); ok('faq: toggles', await p.$eval('.faq details:nth-of-type(2)', d => d.open) && faqOpen[0]);

// anchors from hero
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(300);
await p.click('.hero__cta a[href="#board"]'); await p.waitForTimeout(1600);
const bTop = await p.$eval('#board', e => Math.round(e.getBoundingClientRect().top));
ok('anchor: hero CTA -> #board', bTop >= 0 && bTop < 160, `top=${bTop}`);
const rowHit = await p.evaluate(() => { const a = document.querySelector('.yarrow'); const r = a.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && a.contains(el); });
ok('board: yellow arrows clickable', rowHit);

// keyboard: skip link
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.keyboard.press('Tab'); ok('keyboard: first Tab = skip link', (await p.evaluate(() => document.activeElement.className)) === 'skip');

// mobile menu
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage(); mp.on('pageerror', e => errors.push('mobile ' + e));
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
await mp.click('.nav__menu'); ok('menu: opens', await mp.isVisible('#menu'));
await mp.click('#menu a[href="/#faq"]'); await mp.waitForTimeout(1500); ok('menu: closes after navigation', !(await mp.isVisible('#menu')));
const ov = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok('mobile: no horizontal overflow', ov <= 0, `${ov}`);

// sub-pages
for (const u of ['/tours/', '/tours/haifa-shel-mata.html', '/groups.html', '/gallery.html', '/404.html', '/privacy.html', '/terms.html', '/accessibility.html']) {
  const sp = await ctx.newPage(); const e = []; sp.on('pageerror', x => e.push(String(x)));
  const r = await sp.goto(BASE + u, { waitUntil: 'networkidle' });
  ok(`page ${u}`, r.status() === 200 && e.length === 0, e.join(';'));
  await sp.screenshot({ path: path.join(out, `page${u.replace(/\W+/g, '-')}.jpg`), quality: 60, type: 'jpeg' }); await sp.close();
}
ok('no console/page errors', errors.length === 0, errors.join(' | '));
console.log(res.join('\n'));
fs.writeFileSync(path.join(out, 'report.txt'), res.join('\n'));
await b.close();
