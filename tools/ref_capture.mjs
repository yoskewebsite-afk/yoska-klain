// Live reference capture for motion study (not site assets). Usage: node ref_capture.mjs
// For every reference: open, wait, take states while wheel-scrolling. Writes JPGs + a JSON log.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../references');
const REFS = [
  ['01-jesko', 'jesko-live', 'https://jeskojets.com/', 16, 300],
  ['01-jesko', 'jesko-casestudy', 'https://thefirstthelast.agency/work/jesko-jets', 8, 900],
  ['01-jesko', 'jesko-dribbble', 'https://dribbble.com/shots/26998428-Jesko-Jets', 3, 900],
  ['02-telescope', 'telescope-live', 'https://tympanus.net/Tutorials/TelescopeZoom/', 14, 250],
  ['02-telescope', 'telescope-tutorial', 'https://tympanus.net/codrops/2025/10/29/building-a-layered-zoom-scroll-effect-with-gsap-scrollsmoother-and-scrolltrigger/', 3, 1400],
  ['03-sticky-grid', 'stickygrid-live', 'https://tympanus.net/Tutorials/StickyGridScroll/', 14, 300],
  ['04-supporting', 'cinematic3d', 'https://tympanus.net/Tutorials/Cinematic3DScroll/', 10, 400],
  ['04-supporting', 'igloo', 'https://www.igloo.inc/', 8, 600],
  ['04-supporting', 'chartogne-case', 'https://immersive-g.com/projects/chartogne-taillet-1', 6, 900],
  ['04-supporting', 'immersive-g', 'https://immersive-g.com/', 5, 900],
  ['04-supporting', 'nomadic-tribe', 'https://www.makemepulse.com/case-study/nomadic-tribe', 5, 900],
  ['04-supporting', 'jelly-glass', 'https://infinite-jelly-glass.shader.se/', 3, 500],
  ['04-supporting', 'northface-dribbble', 'https://dribbble.com/shots/3275340-Exploring-The-North-Face', 2, 900],
  ['04-supporting', 'timedcards-dribbble', 'https://dribbble.com/shots/11012652--Timed-Cards-Opening', 2, 900],
  ['04-supporting', 'scroll3dgrid', 'https://tympanus.net/Development/Scroll3DGrid/', 8, 500],
  ['04-supporting', '3dcarousel', 'https://tympanus.net/Development/3DCarousel/', 6, 500],
  ['04-supporting', 'horizontal-parallax', 'https://tympanus.net/Tutorials/HorizontalParallaxGallery/index.html', 6, 500],
  ['04-supporting', 'image-tube', 'https://tympanus.net/Tutorials/3DImageTubeR3F/', 6, 500],
  ['04-supporting', 'scroll-panels', 'https://tympanus.net/Development/ScrollPanels/', 8, 500],
  ['04-supporting', 'svg-mask', 'https://tympanus.net/Tutorials/SVGMaskScrollTransition/index2.html', 8, 400],
];
const only = process.argv[2];
const log = [];
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [dir, name, url, steps, px] of REFS) {
  if (only && !name.includes(only)) continue;
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' });
  const p = await ctx.newPage();
  const entry = { name, url, shots: [] };
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(6000);
    entry.title = await p.title();
    entry.height = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.mouse.move(720, 450);
    for (let i = 0; i <= steps; i++) {
      const f = `${name}-${String(i).padStart(2, '0')}.jpg`;
      await p.screenshot({ path: path.join(root, dir, f), quality: 62, type: 'jpeg' });
      entry.shots.push({ f, y: await p.evaluate(() => Math.round(scrollY)) });
      for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, px / 6); await p.waitForTimeout(50); }
      await p.waitForTimeout(1200);
    }
  } catch (e) { entry.error = e.message.split('\n')[0]; }
  log.push(entry); console.log(name, entry.error || `${entry.shots.length} shots, h=${entry.height}, ${entry.title}`);
  await ctx.close();
}
fs.writeFileSync(path.join(root, `capture-log${only ? '-' + only : ''}.json`), JSON.stringify(log, null, 1));
await b.close();
