"""Static site generator, 10.11.2026 rebuild (design reference: viennainhebrew.com, Yoske's brand book).

Run from the project root:  python3 tools/build_site_v4.py
It reuses the business data and the legal texts of build_site.py (tours, stops, WhatsApp drafts, gallery, legal sections)
and replaces only the presentation: page shell, homepage, tour pages, groups, gallery, 404 and the legal page frame.
Output: prototype/ (shared yoske.css + yoske.js). The previous generator stays untouched in build_site.py.
"""
import base64
import hashlib
import os
import re
from html import escape
from pathlib import Path

from PIL import Image

import build_site as base

ROOT, SRC = base.ROOT, base.SRC
WA, TOURS, FEATURED = base.WA, base.TOURS, base.FEATURED
PHONE_INTL, PHONE_HUMAN = base.PHONE_INTL, '054-436-1667'   # same number, written as in the brand book
# Pre-launch switches (rimov-final-checks). Nothing here is invented: while a value is empty the matching tag/link is simply not emitted.
#   SITE_URL   production origin, e.g. https://example.co.il  -> canonical, og:url, absolute og:image, sitemap.xml
#   LAUNCH=1   (with SITE_URL) removes noindex and opens robots.txt. Without it the site stays noindex + Disallow: / (demo/staging).
#   RIMOV_URL  address of the studio's site -> makes the credit logo a link. Empty = logo without a link.
SITE_URL = os.environ.get('SITE_URL', '').rstrip('/')
LAUNCH = os.environ.get('LAUNCH') == '1' and bool(SITE_URL)
RIMOV_URL = os.environ.get('RIMOV_URL', 'https://rimov-technologies.vercel.app/')   # given by the owner 13.11.2026
OG_IMAGE = '/assets/brand/og-share-1200x630.jpg'
EMAIL = 'yoske.kashlah27@gmail.com'                              # brand book, page 16
wa_tour = base.wa_tour

# ------------------------------------------------------------------ icons
# Brand book p.12: one line, even stroke, rounded caps and joins, navy + one palette colour, 48 grid, stroke 3.
ICONS48 = {
    'gate': '<path class="b" d="M12 40V21a12 12 0 0 1 24 0v19"/><path d="M7 40h34"/><path d="M19 40V26a5 5 0 0 1 10 0v14"/>',
    'pin': '<path d="M24 42S11 30.5 11 21a13 13 0 0 1 26 0c0 9.5-13 21-13 21Z"/><circle class="b" cx="24" cy="21" r="4.5"/>',
    'route': '<circle class="b" cx="11" cy="37" r="4"/><circle class="b" cx="37" cy="11" r="4"/><path d="M14.5 34.5C20 29 15 23 22 21.5s9.5-3 12-7.5"/>',
    'person': '<circle cx="24" cy="15" r="7"/><path class="b" d="M10 41c1.5-8 7-12.5 14-12.5S36.5 33 38 41"/>',
    'group': '<circle cx="24" cy="14" r="5"/><path d="M14.5 39c0-6.5 4-10.5 9.5-10.5s9.5 4 9.5 10.5"/><circle class="b" cx="10.5" cy="19" r="4"/><circle class="b" cx="37.5" cy="19" r="4"/><path class="b" d="M4 36c0-5 2.8-8.5 6.5-8.5M44 36c0-5-2.8-8.5-6.5-8.5"/>',
    'camera': '<rect x="6" y="14" width="36" height="25" rx="5"/><path d="m17 14 3-5h8l3 5"/><circle class="b" cx="24" cy="26.5" r="6.5"/>',
    'heart': '<path d="M24 40S7 30.5 7 18.5a8.5 8.5 0 0 1 17-3.5 8.5 8.5 0 0 1 17 3.5C41 30.5 24 40 24 40Z"/><path class="b" d="M14 18.5a4 4 0 0 1 4-4"/>',
    'question': '<circle cx="24" cy="24" r="17"/><path class="b" d="M19 19.5a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3v1.4"/><path class="b" d="M24 34.5v.1"/>',
    'globe': '<circle cx="24" cy="24" r="17"/><path class="b" d="M7.5 24h33M24 7c-4.6 4.8-7 10.6-7 17s2.4 12.2 7 17c4.6-4.8 7-10.6 7-17s-2.4-12.2-7-17Z"/>',
    'phone': '<path d="M11 7h6.5l3 8.5-4 2.8a24 24 0 0 0 13.2 13.2l2.8-4 8.5 3V37a4 4 0 0 1-4 4A34 34 0 0 1 7 11a4 4 0 0 1 4-4Z"/><path class="b" d="M29 7.5A12 12 0 0 1 40.5 19"/>',
    'clock': '<circle cx="24" cy="24" r="17"/><path class="b" d="M24 14v10l7 4.5"/>',
    'sun': '<path class="b" d="M9 34a15 15 0 0 1 30 0"/><path class="b" d="M15.5 34a8.5 8.5 0 0 1 17 0"/><path d="M5 40h38"/>',
}
ICONS24 = {
    'arrow': '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    'chev': '<path d="m14.5 5-7 7 7 7"/>',
    'up': '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    'chat': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10.5c.5 2 2.3 3.9 4.5 4.5"/>',
    'fb': '<path d="M15 8h-2a1 1 0 0 0-1 1v3h3l-.5 3H12v6"/><circle cx="12" cy="12" r="9.5"/>',
    'mail': '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5.5L19.5 8"/>',
    'phone': '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    'out': '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h10"/>',
    'close': '<path d="m6 6 12 12M18 6 6 18"/>',
}
SPRITE = ('<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">'
          + ''.join(f'<symbol id="b-{k}" viewBox="0 0 48 48">{v}</symbol>' for k, v in ICONS48.items())
          + ''.join(f'<symbol id="i-{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONS24.items()) + '</svg>')


def bicon(name, accent='teal'):
    return f'<svg class="bicon bicon--{accent}" aria-hidden="true"><use href="#b-{name}"/></svg>'


# ------------------------------------------------------------------ images
def photo(name, alt, sizes, mode='', pos=''):
    """An approved photo with its three widths (480/960/1920). mode: eager | low | ''."""
    variants = []
    for n in (480, 960, 1920):
        f = ROOT / f'assets/approved/{name}-{n}.webp'
        if f.exists():
            w = Image.open(f).width
            if w not in [v[0] for v in variants]:
                variants.append((w, n))
    w, h = Image.open(ROOT / f'assets/approved/{name}-{variants[-1][1]}.webp').size
    srcset = ', '.join(f'/assets/approved/{name}-{n}.webp {wd}w' for wd, n in variants)
    load = {'eager': 'fetchpriority="high"', 'low': 'loading="lazy" decoding="async" fetchpriority="low"'}.get(mode, 'loading="lazy" decoding="async"')
    st = f' style="object-position:{pos}"' if pos else ''
    alt_attr = f'alt="{escape(alt)}"' if alt else 'alt=""'
    return f'<img src="/assets/approved/{name}-960.webp" srcset="{srcset}" sizes="{escape(sizes)}" width="{w}" height="{h}" {alt_attr} {load}{st}>'


# ------------------------------------------------------------------ shell
NAV = [('/#tours', 'הסיורים'), ('/#groups', 'לקבוצות'), ('/#about', 'יוסק׳ה'), ('/gallery.html', 'גלריה'), ('/#contact', 'יצירת קשר')]
RAIL = [('top', 'gate', 'פתיחה'), ('map', 'pin', 'המפה'), ('tours', 'route', 'הסיורים'), ('about', 'person', 'יוסק׳ה'),
        ('groups', 'group', 'לקבוצות'), ('moments', 'camera', 'מהשטח'), ('reviews', 'heart', 'המלצות'),
        ('faq', 'question', 'שאלות'), ('abroad', 'globe', 'מעבר לים'), ('contact', 'phone', 'יצירת קשר'), ('trail', 'route', 'ברגל')]
TABBAR = ['map', 'tours', 'about', 'groups', 'faq', 'contact']

LOGO = ('<img class="logo" src="/assets/brand/logo-horizontal.svg" width="473" height="159" '
        'alt="יוסק׳ה, טיולים, חברה, תרבות">')


def header(current, home):
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if key_of(h) == current else ""}>{l}</a>' for h, l in NAV)
    return f'''<header class="top{' top--home' if home else ''}" data-top>
    <a class="top__logo" href="/" aria-label="יוסק׳ה, לדף הבית">{LOGO}</a>
    <nav class="top__pill" aria-label="ניווט ראשי">{links}</nav>
    <div class="top__icons">
      <a class="roundbtn" href="{WA['general']}" target="_blank" rel="noopener" aria-label="וואטסאפ ליוסק׳ה"><svg aria-hidden="true"><use href="#i-chat"/></svg></a>
      <a class="roundbtn" href="{base.FB_PAGE}" target="_blank" rel="noopener" aria-label="עמוד הפייסבוק"><svg aria-hidden="true"><use href="#i-fb"/></svg></a>
      <a class="roundbtn" href="tel:+{PHONE_INTL}" aria-label="להתקשר: {PHONE_HUMAN}"><svg aria-hidden="true"><use href="#i-phone"/></svg></a>
    </div>
    <button class="top__menu roundbtn" type="button" aria-expanded="false" aria-controls="menu" data-menu-btn><svg aria-hidden="true"><use href="#i-menu"/></svg><span class="visually-hidden">תפריט</span></button>
  </header>
  <div class="menu" id="menu" hidden data-menu>
    <nav aria-label="תפריט">{links}<a href="/tours/">כל הסיורים בחיפה</a></nav>
    <p class="menu__contact"><a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a><a href="{WA['general']}" target="_blank" rel="noopener">וואטסאפ</a></p>
  </div>'''


def key_of(href):
    return {'/#tours': 'tours', '/#groups': 'groups', '/#about': 'about', '/gallery.html': 'gallery', '/#contact': 'contact'}.get(href, '')


def rails():
    side = ''.join(f'<li><a href="#{i}" data-rail-link="{i}"><svg class="bicon" aria-hidden="true"><use href="#b-{ic}"/></svg><span>{l}</span></a></li>' for i, ic, l in RAIL)
    tabs = ''.join(f'<li><a href="#{i}" data-rail-link="{i}"><svg class="bicon" aria-hidden="true"><use href="#b-{ic}"/></svg><span>{l}</span></a></li>' for i, ic, l in RAIL if i in TABBAR)
    return (f'<nav class="siderail" aria-label="ניווט בין חלקי הדף" data-siderail><span class="siderail__bar" aria-hidden="true"><i data-rail-progress></i></span><ul>{side}</ul></nav>\n'
            f'  <nav class="tabbar" aria-label="ניווט מהיר בדף" data-tabbar><ul>{tabs}</ul></nav>')


_RIMOV_IMG = '<img src="/assets/brand/rimov-credit-white.webp" width="640" height="204" alt="{alt}" loading="lazy">'
CREDIT_LOGO = (f'<a href="{RIMOV_URL}" target="_blank" rel="noopener" aria-label="לאתר של מעצבי ומפתחי האתר, RIMOV Technologies">' + _RIMOV_IMG.format(alt='') + '</a>'
               if RIMOV_URL else _RIMOV_IMG.format(alt='RIMOV Technologies'))

FOOTER = f'''<footer class="foot">
    <div class="foot__curve" aria-hidden="true"></div>
    <div class="wrap foot__in">
      <div class="foot__brand">
        <img src="/assets/brand/logo-horizontal-on-navy.svg" width="473" height="159" alt="יוסק׳ה, טיולים, חברה, תרבות" loading="lazy">
        <p class="foot__say">ניפגש <span>בדרך.</span></p>
      </div>
      <div class="foot__cols">
        <nav aria-label="באתר">
          <h2>באתר</h2>
          <a href="/tours/">הסיורים בחיפה</a><a href="/groups.html">למשפחות ולארגונים</a><a href="/gallery.html">גלריה</a><a href="/#contact">יצירת קשר</a>
        </nav>
        <div>
          <h2>מדברים</h2>
          <a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a><a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>
          <a href="{WA['general']}" target="_blank" rel="noopener">וואטסאפ</a><a href="{base.FB_PAGE}" target="_blank" rel="noopener">פייסבוק</a>
        </div>
        <nav aria-label="מידע משפטי ונגישות">
          <h2>מידע</h2>
          <a href="/privacy.html">מדיניות פרטיות</a><a href="/terms.html">תקנון ותנאי שימוש</a><a href="/accessibility.html">הצהרת נגישות</a>
          <a href="{base.BRAZILAO}" target="_blank" rel="noopener">מסעות באתר ברזילאו</a>
        </nav>
      </div>
    </div>
    <p class="wrap foot__made"><span>עיצוב ופיתוח על ידי</span>{CREDIT_LOGO}</p>
    <p class="wrap foot__credits">צילום מקדש הבאב והטרסות: <a href="https://commons.wikimedia.org/wiki/File:Baha%27i_gardens_in_Haifa_39.jpg">Guillaume Paumier</a>, ויקישיתוף, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a> (הסרת השמיים, חיתוך והתאמת גודל). יתר הצילומים מהארכיון של יוסק׳ה קליין.</p>
  </footer>'''

HEAD_JS = ("(function(d,m){var s=m('(prefers-reduced-motion: reduce)').matches||location.search.indexOf('still')>-1;"
           "d.classList.add('js',s?'still':'motion')})(document.documentElement,matchMedia)")
_HJ = base64.b64encode(hashlib.sha256(HEAD_JS.encode()).digest()).decode()
CSP = (f"default-src 'self'; script-src 'self' 'sha256-{_HJ}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'")


def _v(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


def page(path, title, description, body, current='', body_class='page', preload='', **_):
    home = body_class == 'home'
    indexable = LAUNCH and path != '404.html'
    url = f'{SITE_URL}/' + ('' if path == 'index.html' else path.replace('index.html', ''))
    seo = (f'\n  <link rel="canonical" href="{url}">\n  <meta property="og:url" content="{url}">' if indexable else '')
    seo += (f'\n  <meta property="og:image" content="{SITE_URL}{OG_IMAGE}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">'
            f'\n  <meta property="og:image:alt" content="יוסק׳ה קליין עומד ליד מעקה מול מפרץ חיפה, מוקף בקבוצה">\n  <meta name="twitter:card" content="summary_large_image">' if SITE_URL else '')
    html = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="robots" content="{'index, follow' if indexable else 'noindex'}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:site_name" content="יוסק׳ה קליין">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">{seo}
  <meta name="theme-color" content="#2A3A5C">
  <link rel="icon" href="/assets/brand/symbol.svg" type="image/svg+xml">
  <script>{HEAD_JS}</script>
  <meta http-equiv="Content-Security-Policy" content="{CSP}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="preload" href="/fonts/heebo-hebrew-300-900.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/karantina-hebrew-700.woff2" as="font" type="font/woff2" crossorigin>
  {preload}
  <link rel="stylesheet" href="/yoske.css?v={_v('yoske.css')}">
</head>
<body class="{body_class}">
  <a class="skip" href="#main">דילוג לתוכן</a>
  {SPRITE}
  {header(current, home)}
  {rails() if home else ''}
  <main id="main">
{body}
  </main>
  {FOOTER}
  <aside aria-label="פנייה מהירה">
    <a class="fab" href="{WA['general']}" target="_blank" rel="noopener" data-fab><svg aria-hidden="true"><use href="#i-chat"/></svg><span>נדבר בוואטסאפ</span></a>
    <a class="totop" href="#main" aria-label="חזרה לראש העמוד" data-totop><svg aria-hidden="true"><use href="#i-up"/></svg></a>
  </aside>
  <script src="/vendor/lenis.min.js" defer></script>
  <script src="/vendor/gsap.min.js" defer></script>
  <script src="/vendor/ScrollTrigger.min.js" defer></script>
  <script src="/yoske.js?v={_v('yoske.js')}" defer></script>
</body>
</html>
'''
    html = re.sub(r'<span class="c-blue">(.*?)</span>', r'\1', html)
    html = re.sub(r'<span class="c-orange">(.*?)</span>', r'<span class="hl">\1</span>', html)
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    return path


def duo(light, bold, tag='h1', cls='', id_=''):
    i = f' id="{id_}"' if id_ else ''
    return f'<{tag} class="duo-title {cls}"{i}><span class="duo-title__light">{light}</span> <span class="duo-title__bold">{bold}</span></{tag}>'


def phead(light, bold, lede, name, alt, pos='50% 50%', back=''):
    b = f'<a class="back" href="{back[0]}"><svg aria-hidden="true"><use href="#i-arrow"/></svg>{back[1]}</a>' if back else ''
    return f'''    <section class="phead">
      <div class="wrap">
        {b}
        {duo(light, bold)}
        <p class="phead__lede">{lede}</p>
      </div>
      <figure class="wrap phead__photo"><div class="bigarch">{photo(name, alt, '(min-width: 1280px) 1180px, 92vw', 'eager', pos)}</div></figure>
    </section>'''


# ------------------------------------------------------------------ the map (schematic, real stops only)
# Positions are schematic: the sea to the north, downtown along the port, the Carmel slope to the south.
PLACES = {
    'port': ('הנמל', 616, 206), 'sail': ('בניין המפרש', 790, 236), 'market': ('השוק הטורקי', 468, 262),
    'paris': ('כיכר פריז', 606, 300), 'clock': ('מגדל השעון', 748, 318), 'german': ('המושבה הגרמנית', 268, 282),
    'bahai': ('הגנים הבהאיים', 330, 380), 'louis': ('טיילת לואי', 392, 486), 'stairs': ('רובע המדרגות', 500, 410),
    'carmelit': ('הכרמלית', 640, 410), 'ganhaem': ('גן האם', 676, 512),
}
STOP_KEYS = {'הגנים הבהאיים': 'bahai', 'טיילת לואי': 'louis', 'הכרמלית': 'carmelit', 'תחנה בכרמלית': 'carmelit', 'כיכר פריז': 'paris',
             'הנמל': 'port', 'רובע המדרגות': 'stairs', 'גן האם': 'ganhaem', 'בניין המפרש': 'sail', 'מגדל השעון': 'clock',
             'השוק הטורקי': 'market', 'המושבה הגרמנית': 'german'}


def map_svg():
    pins = []
    for k, (label, x, y) in PLACES.items():
        w = 18 + len(label) * 11
        lx = x - w / 2
        pins.append(f'<g class="pin" data-place="{k}" transform="translate(0 0)"><circle class="pin__dot" cx="{x}" cy="{y}" r="7"/>'
                    f'<g class="pin__tag"><rect x="{lx:.0f}" y="{y - 40}" width="{w}" height="26" rx="8"/><text x="{x}" y="{y - 22}">{label}</text></g></g>')
    return f'''            <div class="map__scroll" data-map-scroll tabindex="0" role="region" aria-label="המפה, אפשר לגלול לצדדים"><svg class="hmap" viewBox="0 0 900 600" role="img" aria-labelledby="hmap-t" data-hmap>
              <title id="hmap-t">מפה סכמטית של חיפה: הים בצפון, העיר התחתית לאורך הנמל, הגנים הבהאיים במורד הכרמל וטיילת לואי בראשו</title>
              <path class="hmap__sea" d="M0 0H900V138C800 160 700 182 600 196C500 210 420 214 330 230C230 248 120 286 0 330Z"/>
              <path class="hmap__coast" d="M900 138C800 160 700 182 600 196C500 210 420 214 330 230C230 248 120 286 0 330"/>
              <path class="hmap__pier" d="M560 204C600 176 650 150 712 132"/>
              <g class="hmap__streets"><path d="M120 340C260 300 420 300 560 330S800 350 900 300"/><path d="M60 420C240 380 400 410 560 440S780 440 900 400"/><path d="M200 520C340 480 480 520 620 540S820 520 900 500"/><path d="M300 250C330 330 360 420 380 520"/><path d="M700 240C690 330 690 430 700 560"/><path d="M460 230C470 300 500 380 560 430"/></g>
              <g class="hmap__ridge"><path d="M0 560C180 510 360 520 520 548S780 560 900 530"/><path d="M0 590C200 548 380 560 540 584S800 590 900 566"/></g>
              <path class="hmap__axis" d="M268 282L392 486"/>
              <path class="hmap__carmelit" d="M606 300L640 410L676 512"/>
              <text class="hmap__sealabel" x="300" y="120">הים התיכון</text><text class="hmap__sealabel" x="760" y="80">מפרץ חיפה</text><text class="hmap__mtlabel" x="170" y="560">הכרמל</text>
              {''.join(pins)}
            </svg></div>'''


def map_parts():
    chips, panels = [], []
    for k, t in enumerate(FEATURED):
        sel = 'true' if k == 0 else 'false'
        stops = [STOP_KEYS[s] for s in t.get('stops', []) if s in STOP_KEYS]
        chips.append(f'            <button class="chip" type="button" role="tab" id="mt-{t["slug"]}" aria-selected="{sel}" aria-controls="mp-{t["slug"]}" tabindex="{0 if k == 0 else -1}" data-stops="{" ".join(stops)}">{escape(t["name"])}</button>')
        facts = []
        if t.get('duration'):
            facts.append(f'<li>{bicon("clock", "orange")}<span>{t["duration"]}</span></li>')
        if t.get('shape'):
            facts.append(f'<li>{bicon("route", "orange")}<span>{t["shape"]}</span></li>')
        if t.get('audience'):
            facts.append(f'<li>{bicon("group", "orange")}<span>{t["audience"]}</span></li>')
        stops_line = ('<p class="mpanel__stops"><b>בין התחנות:</b> ' + ', '.join(t['stops']) + ' ועוד.</p>') if t.get('stops') else \
            '<p class="mpanel__stops">המסלול נקבע לפי הקבוצה והגילים, ולכן אין לו תחנות קבועות במפה.</p>'
        panels.append(f'''            <div class="mpanel" role="tabpanel" id="mp-{t['slug']}" aria-labelledby="mt-{t['slug']}"{'' if k == 0 else ' hidden'}>
              <p class="mpanel__place">{escape(t['place'])}</p>
              <h3 class="mpanel__name">{escape(t['name'])}</h3>
              {stops_line}
              <ul class="mpanel__facts">{''.join(facts)}</ul>
              <div class="btnrow"><a class="btn btn--ink btn--sm" href="/tours/{t['slug']}.html">לפרטי הסיור<svg aria-hidden="true"><use href="#i-arrow"/></svg></a><a class="textlink" href="{wa_tour(t['name'])}" target="_blank" rel="noopener">לבדוק מועד<span class="visually-hidden"> ל{escape(t['name'])}</span></a></div>
            </div>''')
    return '\n'.join(chips), '\n'.join(panels)


CARD_PHOTO = {'haifa-ahuvati': ('bahai-bay', '50% 62%'), 'haifa-ahuvati-mekutzar': ('carmelit', '50% 40%'),
              'haifa-shel-maala': ('bahai-terraces', '50% 45%'), 'haifa-shel-mata': ('clock-tower', '50% 35%'),
              'sodot-veremazim': ('heart-wide', '42% 60%'), 'teima-mehaifa': ('arches-group', '50% 50%'),
              'teva-adam-hevra-sviva': ('square-group', '50% 45%')}


def tour_cards():
    out = []
    for t in TOURS:
        name, pos = CARD_PHOTO[t['slug']]
        did = f'td-{t["slug"]}'
        if t.get('blurb'):
            meta = ' · '.join(x for x in (t.get('duration'), t.get('audience') or 'לכל הקבוצות', 'בתיאום מראש') if x)
            details = (f'<p class="acard__place">{escape(t["place"])}</p><p>{escape(t["blurb"])}</p><p class="acard__meta">{meta}</p>'
                       f'<div class="btnrow"><a class="btn btn--ink btn--sm" href="/tours/{t["slug"]}.html">לפרטי הסיור<span class="visually-hidden"> {escape(t["name"])}</span></a>'
                       f'<a class="textlink" href="{wa_tour(t["name"])}" target="_blank" rel="noopener">לתאם<span class="visually-hidden"> את {escape(t["name"])}</span></a></div>')
            link = f'/tours/{t["slug"]}.html'
        else:
            details = (f'<p>עוד סיור מהרשימה של יוסק׳ה. הפרטים המלאים עדיין לא באתר, אז הכי פשוט לשאול.</p>'
                       f'<div class="btnrow"><a class="btn btn--ink btn--sm" href="{wa_tour(t["name"])}" target="_blank" rel="noopener">לשאול על הסיור<span class="visually-hidden"> {escape(t["name"])}</span></a></div>')
            link = wa_tour(t['name'])
        out.append(f'''          <li class="acard" data-card>
            <div class="acard__media">{photo(name, '', '(min-width: 900px) 25vw, 78vw', 'low', pos)}<h3 class="acard__title"><a href="{link}"{' target="_blank" rel="noopener"' if not t.get('blurb') else ''}>{escape(t['name'])}</a></h3></div>
            <button class="acard__toggle" type="button" aria-expanded="false" aria-controls="{did}" data-card-toggle>פרטים<span class="visually-hidden"> על {escape(t['name'])}</span><svg aria-hidden="true"><use href="#i-plus"/></svg></button>
            <div class="acard__details" id="{did}" data-card-details>{details}</div>
          </li>''')
    return '\n'.join(out)


# ------------------------------------------------------------------ pages
def home():
    body = (SRC / 'v4/home.html').read_text()
    chips, panels = map_parts()
    rep = {'%%MAP_CHIPS%%': chips, '%%MAP_PANELS%%': panels, '%%MAP_SVG%%': map_svg(), '%%TOUR_CARDS%%': tour_cards(),
           '%%PHONE%%': PHONE_HUMAN, '%%PHONE_INTL%%': PHONE_INTL, '%%EMAIL%%': EMAIL, '%%BRAZILAO%%': base.BRAZILAO,
           '%%FB_REVIEWS%%': base.FB_REVIEWS, '%%FB_PAGE%%': base.FB_PAGE,
           '%%REVIEW_SHOTS%%': (SRC / 'v4/review-shots.html').read_text(encoding='utf-8')}
    rep.update({f'%%WA_{k}%%': v for k, v in WA.items()})
    for k, v in rep.items():
        body = body.replace(k, v)

    def ph(m):
        name, alt, sizes, *rest = m.group(1).split('|')
        return photo(name, alt, sizes, rest[0] if rest else '', rest[1] if len(rest) > 1 else '')
    body = re.sub(r'%%PHOTO:(.*?)%%(?!%)', ph, body)  # (?!%): a position like "50% 45%" may end the token with "%%%"
    assert '%%' not in body, body[body.index('%%'):body.index('%%') + 60]
    pre = ('<link rel="preload" as="image" href="/assets/v4/hero-wide-1440.webp" media="(min-width: 700px)" '
           'imagesrcset="/assets/v4/hero-wide-960.webp 960w, /assets/v4/hero-wide-1440.webp 1440w, /assets/v4/hero-wide-2160.webp 2160w" imagesizes="max(116vw, 150svh)" fetchpriority="high">\n'
           '  <link rel="preload" as="image" href="/assets/v4/hero-tall-960.webp" media="(max-width: 699px)" '
           'imagesrcset="/assets/v4/hero-tall-640.webp 640w, /assets/v4/hero-tall-960.webp 960w, /assets/v4/hero-tall-1280.webp 1280w" imagesizes="140vw" fetchpriority="high">')
    return page('index.html', 'יוסק׳ה | טיולים, חברה, תרבות. סיורים בחיפה',
                'סיורים בחיפה עם יוסק׳ה קליין, דרך האנשים, הסיפורים והתרבות שמרכיבים את המקום. סיורים קבועים, ימים לקבוצות ומסעות בדרום אמריקה.',
                body, body_class='home', preload=pre)


def cta_band(light, bold, label, href, ext=True):
    tgt = ' target="_blank" rel="noopener"' if ext else ''
    return f'''    <section class="wrap ctaband">
      {duo(light, bold, 'h2', 'duo-title--center')}
      <a class="btn btn--sun" href="{href}"{tgt}>{label}<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </section>'''


def tours_index():
    body = phead('חמישה סיורים קבועים, ועוד ימים בהתאמה.', 'הסיורים <span class="hl">בחיפה</span>',
                 'מהגנים והתצפיות ועד העיר התחתית. בחרו סיור ותאמו איתי מועד, או ספרו לי מה אתם מחפשים ונבחר יחד.',
                 'yoske-guiding-view', 'יוסק׳ה מדבר אל קבוצה ליד המעקה, העיר והמפרץ מאחוריו', '50% 62%') + f'''
    <section class="wrap" aria-labelledby="tours-list-title">
      <h2 class="visually-hidden" id="tours-list-title">הסיורים הקבועים</h2>
      <ul class="cardgrid">
{tour_cards()}
      </ul>
    </section>
{cta_band('לא בטוחים מה מתאים לכם?', 'ספרו לי מי <span class="hl">מגיע</span>', 'יוסק׳ה, מה מתאים לנו?', WA['fit'])}'''
    return page('tours/index.html', 'הסיורים בחיפה | יוסק׳ה', 'חמישה סיורים קבועים בחיפה עם יוסק׳ה קליין, מהגנים והתצפיות ועד העיר התחתית, וימים בהתאמה לקבוצות.', body, current='tours')


def tour_page(t):
    facts = []
    if t.get('duration'):
        facts.append(f'<li>{bicon("clock", "orange")}<div><p class="facts__k">משך משוער</p><p class="facts__v">{t["duration"]}</p></div></li>')
    if t.get('shape'):
        facts.append(f'<li>{bicon("route", "orange")}<div><p class="facts__k">מבנה</p><p class="facts__v">{t["shape"]}</p></div></li>')
    if t.get('audience'):
        facts.append(f'<li>{bicon("group", "orange")}<div><p class="facts__k">למי זה מתאים</p><p class="facts__v">{t["audience"]}</p></div></li>')
    facts.append(f'<li>{bicon("sun", "orange")}<div><p class="facts__k">מחיר ומועדים</p><p class="facts__v">תלויים בקבוצה ובתאריך. דברו איתי ונברר יחד.</p></div></li>')
    stops = ''
    if t.get('stops'):
        stops = ('<div class="stops"><h2 class="h-card">בין התחנות</h2><ol>' + ''.join(f'<li>{bicon("pin", "orange")}<span>{s}</span></li>' for s in t['stops'])
                 + '<li class="stops__more"><span>ועוד</span></li></ol></div>')
    gal = ''.join(f'<li class="archframe">{photo(n, alt, "(min-width: 900px) 40vw, 90vw")}</li>' for n, alt in t['extra'])
    name, pos = CARD_PHOTO[t['slug']]
    body = phead(escape(t['place']), escape(t['name']), t['blurb'], t['photo'] if t['photo'] != 'carmelit' else 'carmelit', t['alt'], t['pos'],
                 back=('/tours/', 'לכל הסיורים')) + f'''
    <section class="wrap tourbody">
      <div class="tourbody__main">
        {stops}
        <ul class="facts" aria-label="פרטי הסיור">{''.join(facts)}</ul>
      </div>
      <aside class="tourbody__aside" aria-label="תיאום">
        <div class="bookcard">
          <h2 class="h-card">לתאם את «{escape(t['name'])}»</h2>
          <p>שלחו לי כמה אתם ומתי נוח לכם. אחזור אליכם עם מועד, מחיר ונקודת מפגש לפני שסוגרים.</p>
          <a class="btn btn--sun" href="{wa_tour(t['name'])}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-chat"/></svg>לתאם בוואטסאפ</a>
          <a class="textlink" href="tel:+{PHONE_INTL}">או להתקשר: <span dir="ltr">{PHONE_HUMAN}</span></a>
        </div>
      </aside>
    </section>
    <section class="wrap tourgal" aria-labelledby="tg-title">
      <h2 class="h-card" id="tg-title">מהסיור</h2>
      <ul>{gal}</ul>
      <a class="btn btn--line" href="/tours/"><svg aria-hidden="true"><use href="#i-arrow"/></svg>חזרה לכל הסיורים</a>
    </section>'''
    body = body.replace('<svg aria-hidden="true"><use href="#i-arrow"/></svg>חזרה', '<svg class="flip" aria-hidden="true"><use href="#i-arrow"/></svg>חזרה')
    return page(f'tours/{t["slug"]}.html', f'{t["name"]} | יוסק׳ה', t['blurb'], body, current='tours')


def groups():
    body = phead('משפחה, חברים או צוות מהעבודה.', 'יום לקבוצה, <span class="hl">שנבנה סביב האנשים</span>',
                 'ספרו לי מי מגיע, מה מעניין אתכם וכמה זמן יש לכם. משם נבנה יחד מסלול שמתאים לקבוצה, לקצב ולמטרה של היום.',
                 'heart-family', 'משפחות וילדים מצטלמים בתוך פסל הלב הצהוב, הים ברקע', '50% 42%') + f'''
    <section class="wrap gsteps">
      <ol class="steps steps--row">
        <li><b>מכירים</b><span>מתחילים בשיחה עליכם.</span></li>
        <li><b>מתכננים</b><span>בוחרים כיוון ומדייקים את הפרטים.</span></li>
        <li><b>יוצאים</b><span>נפגשים לחוויה שתוכננה עבורכם.</span></li>
      </ol>
    </section>
    <section class="wrap">
      <ul class="cardgrid cardgrid--2">
        <li class="acard acard--open"><div class="acard__media">{photo('heart-wide', 'קבוצת משפחות עם יוסק׳ה ליד פסל הלב הצהוב מול המפרץ', '(min-width: 900px) 44vw, 92vw')}</div>
          <div class="acard__body"><h2 class="h-card">משפחה וחברים</h2><p>יום הולדת, מפגש משפחתי או סתם שבת עם חברים. גם עם ילדים.</p><a class="btn btn--ink btn--sm" href="{WA['family']}" target="_blank" rel="noopener">טיול למשפחה ולחברים</a></div></li>
        <li class="acard acard--open"><div class="acard__media">{photo('red-sculpture-selfie', 'יוסק׳ה בסלפי, מאחוריו קבוצה ליד פסל לב אדום מול המפרץ', '(min-width: 900px) 44vw, 92vw')}</div>
          <div class="acard__body"><h2 class="h-card">צוות או ארגון</h2><p>יום גיבוש ברגל בעיר, שנבנה סביב האנשים ומה שמעניין אותם.</p><a class="btn btn--ink btn--sm" href="{WA['org']}" target="_blank" rel="noopener">יום לצוות או לארגון</a></div></li>
      </ul>
    </section>
{cta_band('רוצים לבדוק כיוון?', 'נדבר על <span class="hl">היום שלכם</span>', 'לכתוב ליוסק׳ה', WA['general'])}'''
    return page('groups.html', 'למשפחות ולארגונים | יוסק׳ה', 'טיולים וימי חוויה בהתאמה אישית למשפחות, לחברים, לצוותים ולארגונים.', body, current='groups')


def gallery():
    items = '\n'.join(
        f'        <li class="gitem gitem--{shape}"><a href="/assets/photos/{n}.jpg" aria-label="לפתיחת התמונה בגודל מלא: {escape(alt)}">{base.img(n, alt, sizes="(min-width: 900px) 30vw, 46vw")}</a></li>'
        for n, alt, shape in base.GALLERY)
    body = f'''    <section class="phead phead--plain">
      <div class="wrap">
        {duo('האנשים, המקומות והרגעים שביניהם.', 'ככה זה נראה <span class="hl">בשטח</span>')}
        <p class="phead__lede">כמה תמונות מהטיולים, כדי להרגיש קצת מהאווירה עוד לפני שנפגשים.</p>
      </div>
    </section>
    <section class="wrap">
      <ul class="ggrid">
{items}
      </ul>
    </section>
{cta_band('רוצים להיות', 'בתמונה <span class="hl">הבאה?</span>', 'בואו נטייל יחד', WA['general'])}'''
    return page('gallery.html', 'גלריה | יוסק׳ה', 'גלריית תמונות מהטיולים של יוסק׳ה קליין בחיפה: האנשים, המקומות והרגעים שביניהם.', body, current='gallery')


def not_found():
    body = f'''    <section class="phead phead--plain lost">
      <div class="wrap">
        {duo('404', 'העמוד הזה <span class="hl">יצא לטייל.</span>')}
        <p class="phead__lede">לא מצאנו את מה שחיפשתם. אפשר לחזור לדף הבית, לעבור לסיורים בחיפה, או פשוט לכתוב לי.</p>
        <div class="btnrow"><a class="btn btn--ink" href="/">לדף הבית</a><a class="btn btn--line" href="/tours/">לסיורים בחיפה</a><a class="btn btn--line" href="{WA['general']}" target="_blank" rel="noopener">נדבר בוואטסאפ</a></div>
      </div>
    </section>'''
    return page('404.html', 'העמוד לא נמצא | יוסק׳ה', 'העמוד שחיפשתם לא נמצא. אפשר לחזור לדף הבית, לעבור לסיורים בחיפה או לכתוב ליוסק׳ה בוואטסאפ.', body)


def legal_page(path, title, desc, intro, sections):
    secs = '\n'.join(f'      <section><h2 class="h-card">{h}</h2>{c}</section>' for h, c in sections)
    body = (f'    <article class="wrap legal">\n      <p class="legal__date">עודכן לאחרונה: {LEGAL_UPDATED}</p>\n'
            f'      {duo("", title)}\n      <p class="phead__lede">{intro}</p>\n{secs}\n    </article>')
    return page(path, f'{title} | יוסק׳ה', desc, body)


LEGAL_UPDATED = '10.11.2026'


def tbd(x):
    """The brand book gives the e-mail address; every other owner fact stays a visible placeholder."""
    if 'דוא״ל' in x and 'כתובת' in x:
        return f'<a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>'
    return f'<mark class="tbd">[נדרש להשלים: {x}]</mark>'


def accessibility():
    TEL = f'<a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a>'
    return legal_page('accessibility.html', 'הצהרת נגישות', 'הצהרת הנגישות של האתר של יוסק׳ה קליין.',
        'חשוב לי שכל מי שרוצה לטייל איתי יוכל להשתמש באתר. הדף הזה מתאר מה נעשה, מה עדיין לא נבדק, ואיך לפנות אם משהו לא עובד.', [
        ('רמת הנגישות', '<p>האתר נבנה במטרה לעמוד בתקן הישראלי ת״י 5568, המבוסס על הנחיות WCAG ברמה AA. בדיקות אוטומטיות וידניות של מקלדת, ניגודיות ותנועה נעשו בגרסה הזו, אבל הן אינן מבטיחות נגישות מלאה, ולכן חשוב לי לשמוע אם נתקלתם בבעיה.</p>'),
        ('מה נעשה באתר', '<ul class="legal__list"><li>מבנה סמנטי בעברית מימין לשמאל, עם כותרות לפי סדר, אזורי ניווט ותוכן מסומנים, וקישור ״דילוג לתוכן״.</li>'
            '<li>ניווט מלא במקלדת, עם סימון פוקוס בולט. פרטי הסיורים נפתחים גם בכפתור ״פרטים״, ולא רק במעבר עכבר.</li>'
            '<li>טקסט חלופי לצילומים בעלי משמעות; צילומים קישוטיים מוסתרים מקוראי מסך.</li>'
            '<li>טפסים עם תוויות, הודעות שגיאה ברורות, ובלי שליחה אוטומטית.</li>'
            '<li>כיבוד ההגדרה ״הפחתת תנועה״: אנימציות הגלילה מתבטלות וכל התוכן מוצג ברצף רגיל.</li>'
            '<li>התאמה לטלפון, לטאבלט ולמחשב, בלי גלילה לרוחב.</li></ul>'),
        ('מגבלות ידועות', '<ul class="legal__list"><li>המפה בדף הבית היא איור סכמטי. כל המידע שבה מופיע גם בטקסט שלצידה.</li>'
            '<li>האתר עדיין לא נבדק עם קוראי מסך (NVDA, VoiceOver) ולא על ידי מורשה נגישות.</li>'
            '<li>וואטסאפ, פייסבוק ואתר ברזילאו הם אתרים חיצוניים, והנגישות שלהם באחריותם.</li></ul>'),
        ('נגישות בסיורים עצמם', '<p>בחיפה יש מדרגות, עליות ומדרכות צרות, וכל מסלול שונה. ספרו לי מראש על צרכי נגישות, ונבדוק יחד אם יש מסלול מתאים או התאמות אפשריות.</p>'),
        ('פנייה בנושא נגישות', f'<p>רכז/ת נגישות: {tbd("שם")}. טלפון: {TEL}. דוא״ל: <a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>. כדאי לציין באיזה דף הייתה הבעיה ומה ניסיתם לעשות.</p>'),
        ('עדכון', f'<p>ההצהרה עודכנה ב-{LEGAL_UPDATED}, לאחר בדיקה של גרסת האתר מאותו יום.</p>'),
    ])


def privacy():
    """Same text as build_site.privacy(), without the matcher (removed from the site) and with the e-mail from the brand book."""
    html_path = base.privacy()
    f = ROOT / html_path
    t = f.read_text()
    t = re.sub(r'<p><strong>השאלון ״איזה סיור מתאים לכם\?״:</strong>.*?</p>', '<p><strong>המפה והכרטיסים בדף הבית:</strong> הבחירה בסיור במפה או פתיחת כרטיס לא נשמרת ולא נשלחת לשום מקום.</p>', t)
    t = t.replace('הלחיצה על ״מכינים הודעה בוואטסאפ״ רק מציגה טיוטה.', 'הלחיצה על ״מכינים הודעה בוואטסאפ״ רק מציגה טיוטה בדף.')
    f.write_text(t)
    return html_path


# route the shared legal texts through the new frame
base.page = page
base.legal_page = legal_page
base.TBD = tbd
base.LEGAL_UPDATED = LEGAL_UPDATED

if __name__ == '__main__':
    built = [home(), tours_index()] + [tour_page(t) for t in TOURS if t.get('blurb')] + [groups(), gallery(), not_found(), privacy(), base.terms(), accessibility()]
    print('built:', ', '.join(built))
    # robots.txt / sitemap.xml: closed until LAUNCH=1 with SITE_URL (no domain is invented)
    if LAUNCH:
        urls = [('/' if b == 'index.html' else '/' + b.replace('index.html', '')) for b in built if b != '404.html']
        today = __import__('datetime').date.today().isoformat()
        (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + '\n'.join(f'  <url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>' for u in urls) + '\n</urlset>\n')
        (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n')
    else:
        (ROOT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (ROOT / 'sitemap.xml').unlink(missing_ok=True)
    print('seo:', 'LAUNCH (indexable, sitemap)' if LAUNCH else 'closed (noindex, Disallow: /)')
