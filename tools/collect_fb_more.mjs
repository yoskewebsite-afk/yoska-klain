// Collects the photographs of Yoske's public Facebook page that are reachable WITHOUT logging in.
// Each photo page is opened, the largest rendered image is saved, and the visible post text is recorded.
// Usage: node collect_fb.mjs            (ids below are the ones the logged-out page exposed on 12.10.2026)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, '../media/facebook-originals');
const IDS = (process.env.IDS || [
  '1128594563275591', '1128594489942265', '1128594433275604', '1128594389942275', '1128594319942282',
  '1128594253275622', '1127707486697632', '1121437287324652',
  '127749633360094', '112521064880269', '112520281547014',
  '617135927754793', '615672397901146', '615667807901605', '300758659392523', '300740866060969',
  '180511841417206', '127749650026759', '107107818754927'
].join(',')).split(',');

const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: 'he-IL' });
const page = await ctx.newPage();
const index = [];

for (const id of IDS) {
  const url = 'https://www.facebook.com/photo/?fbid=' + id;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    const info = await page.evaluate(() => {
      const i = [...document.images].filter((x) => x.naturalWidth > 300).sort((a, b) => b.naturalWidth - a.naturalWidth)[0];
      const text = document.body.innerText.split('עוד בפייסבוק')[0];
      return i ? { src: i.src, w: i.naturalWidth, h: i.naturalHeight, text } : { text };
    });
    if (!info.src) { index.push({ id, url, error: 'no image visible without login' }); continue; }
    const res = await ctx.request.get(info.src);
    const file = 'fb-' + id + '.jpg';
    fs.writeFileSync(path.join(out, file), await res.body());
    index.push({ id, url, file, width: info.w, height: info.h, pageText: info.text.replace(/\n{2,}/g, '\n').trim().slice(0, 1800) });
    console.log('saved', file, info.w + 'x' + info.h);
  } catch (e) {
    index.push({ id, url, error: String(e.message).slice(0, 120) });
    console.log('failed', id);
  }
}

const texts={};
fs.writeFileSync(path.join(out, '_index-2026-10-14.json'), JSON.stringify({ collected: new Date().toISOString().slice(0, 10), loggedIn: false, photos: index }, null, 2));
await browser.close();

