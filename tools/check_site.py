"""Checks the generated site: every internal link, image, font and script must exist,
and no page may contain placeholder text. Run from tools/:  python3 check_site.py"""
import re, sys
from pathlib import Path
ROOT = Path('../prototype')
pages = [p for p in ROOT.rglob('*.html') if p.name != 'specimen.html']
bad = []
for p in pages:
    html = p.read_text()
    for m in re.finditer(r'(?:href|src)="(/[^"#?]*)(?:[#?][^"]*)?"', html):
        t = ROOT / m.group(1).lstrip('/')
        if t.is_dir(): t = t / 'index.html'
        if not t.exists(): bad.append(f'{p.relative_to(ROOT)}: missing {m.group(1)}')
    for m in re.finditer(r'srcset="([^"]+)"', html):
        for part in m.group(1).split(','):
            t = ROOT / part.strip().split(' ')[0].lstrip('/')
            if not t.exists(): bad.append(f'{p.relative_to(ROOT)}: missing {part.strip()}')
    # legal pages carry visible owner placeholders on purpose (see COMPLIANCE-AUDIT.md); every other page must have none
    legal = p.name in ('privacy.html', 'terms.html', 'accessibility.html')
    for token in ('%%', 'TODO', 'lorem', 'Lorem') + (() if legal else ('נדרש להשלים',)):
        if token in html: bad.append(f'{p.relative_to(ROOT)}: contains "{token}"')
    if legal: print(f'{p.name}: {html.count("נדרש להשלים")} owner placeholders (expected)')
    for m in re.finditer(r'href="#([\w-]+)"', html):
        if f'id="{m.group(1)}"' not in html: bad.append(f'{p.relative_to(ROOT)}: anchor #{m.group(1)} has no target')
    if html.count('<h1') != 1: bad.append(f'{p.relative_to(ROOT)}: expected exactly one h1, found {html.count("<h1")}')
css = (ROOT / 'styles.css').read_text()
for m in re.finditer(r'url\("(/[^"]+)"\)', css):
    if not (ROOT / m.group(1).lstrip('/')).exists(): bad.append('styles.css: missing ' + m.group(1))
print(len(pages), 'pages checked')
print('\n'.join(bad) if bad else 'all links, assets and anchors resolve; no placeholder text')
sys.exit(1 if bad else 0)
