"""Sets every ?v= cache-bust hash in the built pages and the CMS templates to the md5 (first 10 chars) of the file.
Run after build_site_v6.py + cms_extract.py:   python3 tools/bust_cache.py"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / 'prototype'
pages = list(STATIC.rglob('*.html')) + list((ROOT / 'cms/templates').glob('*.html'))
pat = re.compile(r'((?:href|src)="/([^"?]+\.(?:css|js))\?v=)([0-9a-f]+)"')
cache = {}


def h(rel):
    if rel not in cache:
        f = STATIC / rel
        cache[rel] = hashlib.md5(f.read_bytes()).hexdigest()[:10] if f.exists() else None
    return cache[rel]


n = 0
for p in pages:
    if 'node_modules' in p.parts:
        continue
    s = p.read_text(encoding='utf-8')
    new = pat.sub(lambda m: f'{m.group(1)}{h(m.group(2)) or m.group(3)}"', s)
    if new != s:
        p.write_text(new, encoding='utf-8'); n += 1
print(n, 'files updated;', {k: v for k, v in cache.items() if v})
