// Section screenshots of the Baikal-based rebuild. node baikal_qa.mjs <w> <h> [reduce]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, reduce] = process.argv.slice(2);
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'output/baikal', `${w}x${h}${reduce ? '-reduce' : ''}`);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const m = +w < 900;
const p = await b.newPage({ viewport: { width: +w, height: +h }, isMobile: m, hasTouch: m, reducedMotion: reduce ? 'reduce' : 'no-preference' });
const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', x => x.type() === 'error' && errors.push(x.text()));
await p.goto(process.env.URL || 'http://localhost:4190/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1600);
const shot = async n => { await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, `${n}.jpg`), quality: 72, type: 'jpeg' }); };
await shot('00-hero');
const go = async (sel, off = 80) => { await p.evaluate(([s, o]) => { const el = document.querySelector(s); scrollTo({ top: el.getBoundingClientRect().top + scrollY - o, behavior: 'instant' }); }, [sel, off]); };
for (const [n, s] of [['01-intro', '.intro'], ['02-match', '#match'], ['03-board', '#board'], ['04-awaits', '#groups'], ['05-band', '.band']]) { await go(s); await shot(n); }
for (const v of [0, .35, .65, 1]) { await p.evaluate(v => window.__scene(v), v).catch(() => {}); if (!(await p.evaluate(() => document.documentElement.classList.contains('plan-on')))) { await go('#plan'); } await shot(`06-plan-${Math.round(v * 100)}`); if (!(await p.evaluate(() => document.documentElement.classList.contains('plan-on')))) break; }
for (const [n, s] of [['07-about', '#about'], ['08-proof', '.proof'], ['09-sa', '#south-america'], ['10-faq', '#faq'], ['11-contact', '#contact']]) { await go(s); await shot(n); }
await p.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await shot('12-footer');
const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ errors, overflow: ov, cls: await p.evaluate(() => document.documentElement.className) }));
await b.close();
