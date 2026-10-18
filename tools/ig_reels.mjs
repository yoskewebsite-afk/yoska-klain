// Download the user's Instagram reference reels (study only). Saves mp4 + og image per reel.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const out = process.argv[2];
const IDS = ['reel/C4CjTo8Mlyx','reel/DD68KjVzghB','reel/DYj36b8ohUn','p/BpZ9TdMl08b','reel/DaDGxmCsg92','p/DU-gvYFDNL_','reel/DbpwKmfStMC'];
const b = await chromium.launch({ executablePath: exe });
for (const id of IDS) {
  const name = id.split('/')[1];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' });
  const p = await ctx.newPage();
  const vids = new Map();
  p.on('response', async r => { const u = r.url(); if (/\.mp4/.test(u) && r.ok()) { try { const buf = await r.body(); const key = u.split('?')[0]; if (!vids.has(key) || vids.get(key).length < buf.length) vids.set(key, buf); } catch {} } });
  try {
    await p.goto('https://www.instagram.com/' + id + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(6000);
    const info = await p.evaluate(() => ({ title: document.title, og: document.querySelector('meta[property="og:image"]')?.content, ogv: document.querySelector('meta[property="og:video"]')?.content, desc: document.querySelector('meta[property="og:description"]')?.content, vsrc: [...document.querySelectorAll('video')].map(v => v.currentSrc || v.src) }));
    await p.screenshot({ path: path.join(out, name + '-page.jpg'), quality: 60, type: 'jpeg' });
    if (info.ogv) { const r = await ctx.request.get(info.ogv); if (r.ok()) fs.writeFileSync(path.join(out, name + '-og.mp4'), await r.body()); }
    if (info.og) { const r = await ctx.request.get(info.og); if (r.ok()) fs.writeFileSync(path.join(out, name + '-og.jpg'), await r.body()); }
    let i = 0; for (const [k, buf] of vids) fs.writeFileSync(path.join(out, `${name}-net${i++}.mp4`), buf);
    console.log(name, JSON.stringify({ ...info, net: vids.size }).slice(0, 400));
  } catch (e) { console.log(name, 'ERR', e.message.split('\n')[0]); }
  await ctx.close();
}
await b.close();
