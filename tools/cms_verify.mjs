// Proves the templates + renderer reproduce the built static site: every page, with an empty snapshot (defaults only).
// usage: node tools/cms_verify.mjs   (after the site build + cms_extract.py)
import { readFileSync } from 'node:fs';
import { renderPage, assets } from '../api/_lib/render.mjs';
const root = new URL('../prototype/', import.meta.url).pathname;
const entity = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&nbsp;': ' ' };
const norm = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script type="application\/json" id="site-config">[\s\S]*?<\/script>/, '').replace(/<script src="\/site\.js"[^>]*><\/script>/, '')
  .replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (m) => entity[m]).replace(/>\s+</g, '><').replace(/\s+/g, ' ').replace(/\s*\/>/g, '>').replace(/> /g, '>').replace(/ </g, '<').trim();
const A = assets();
let bad = 0;
for (const [pid, p] of Object.entries(A.defaults.pages)) {
  const file = p.path === '/' ? 'index.html' : p.path.endsWith('/') ? p.path.slice(1) + 'index.html' : p.path.slice(1);
  const want = norm(readFileSync(root + file, 'utf8')), got = norm(renderPage({ snap: null, pid }));
  if (want === got) { console.log('same  ', file); continue; }
  bad++;
  let i = 0; while (i < want.length && want[i] === got[i]) i++;
  console.log('DIFF  ', file, 'at', i, '\n  want:', want.slice(Math.max(0, i - 80), i + 160), '\n  got :', got.slice(Math.max(0, i - 80), i + 160));
}
process.exit(bad ? 1 : 0);
