// Renders the brand symbol on a green tile into the PNG icons the phone needs (home-screen icon + manifest).
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const svg = fs.readFileSync(path.join(root, 'prototype/assets/brand/symbol.svg'), 'utf8');
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: exe });
for (const n of [180, 192, 512]) {
  const p = await b.newPage({ viewport: { width: n, height: n } });
  await p.setContent(`<body style="margin:0;width:${n}px;height:${n}px;display:grid;place-items:center;background:linear-gradient(145deg,#3C9068,#226649 55%,#164A35)"><div style="width:${n * 0.62}px;height:${n * 0.62}px;background:#fff;border-radius:${n * 0.18}px;display:grid;place-items:center;padding:${n * 0.06}px;box-sizing:border-box">${svg.replace('<svg', `<svg style="width:100%;height:100%"`)}</div></body>`);
  await p.screenshot({ path: path.join(root, `prototype/admin-app/icon-${n}.png`) });
}
await b.close(); console.log('icons written');
