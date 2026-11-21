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
    # 15.11.2026: the eight icons of the brand book (p.12), redrawn as vectors from the book's images on the same
    # 48 grid, stroke 3, round caps; navy + the one palette colour each icon has in the book.
    'route': '<path d="M11.5 35.5C15.5 31.5 20.5 32 24 29.5s2.6-5.4 2.2-8.2c-.4-2.9 1.6-5.2 5-6.3 3.3-1 5.5-2.3 6.8-4.5"/><circle class="o" cx="9" cy="38.5" r="3.6"/><circle class="nf" cx="9" cy="38.5" r="1"/><circle class="of" cx="38.6" cy="9.6" r="3.2"/>',
    'pin': '<path d="M24 42C16.5 33.5 11 27 11 20a13 13 0 0 1 26 0c0 7-5.5 13.5-13 22Z"/><circle class="t" cx="24" cy="20" r="4.6"/>',
    'group': '<circle class="g" cx="24" cy="12.5" r="4.6"/><path class="g" d="M15.5 39v-3.5a8.5 8.5 0 0 1 17 0V39"/><circle cx="11.5" cy="18" r="3.6"/><circle cx="36.5" cy="18" r="3.6"/><path d="M5.5 38.5c0-5.2 3.2-8.7 7.6-8.7M42.5 38.5c0-5.2-3.2-8.7-7.6-8.7"/>',
    'culture': '<path d="M11 40V13a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v27"/><path d="M6 40.5h36"/><path class="o" d="M18 40V25.5a6 6 0 0 1 12 0V40"/>',
    'calendar': '<rect x="7.5" y="12" width="33" height="28.5" rx="4.5"/><path d="M7.5 20.5h33M17 7.5v7M31 7.5v7"/><circle class="sf" cx="17" cy="28.5" r="1.9"/><circle class="sf" cx="24" cy="28.5" r="1.9"/><circle class="sf" cx="31" cy="28.5" r="1.9"/><circle class="sf" cx="17" cy="34.8" r="1.9"/><circle class="sf" cx="24" cy="34.8" r="1.9"/>',
    'mobile': '<rect x="14.5" y="5.5" width="19" height="37" rx="4.5"/><path class="t" d="M21 11h6"/><circle class="tf" cx="24" cy="36.4" r="1.7"/>',
    'camera': '<rect x="6" y="15" width="36" height="25" rx="5"/><path d="m16.5 15 2.8-4.5h9.4l2.8 4.5"/><circle class="s" cx="24" cy="27.5" r="6.4"/><circle class="nf" cx="35.2" cy="20.8" r="1.6"/>',
    'nature': '<path class="s" d="M7.5 24.8a16.5 16.5 0 0 1 33 0"/><path class="s" d="M14.5 24.8a9.5 9.5 0 0 1 19 0"/><path class="g" d="M5.5 40C11 34.5 17.5 31.3 24 31.3S37 34.5 42.5 40"/><path d="M3.5 40.6h41"/>',
    # older helpers in the same language (not in the book)
    'person': '<circle cx="24" cy="15" r="7"/><path class="b" d="M10 41c1.5-8 7-12.5 14-12.5S36.5 33 38 41"/>',
    'heart': '<path d="M24 40S7 30.5 7 18.5a8.5 8.5 0 0 1 17-3.5 8.5 8.5 0 0 1 17 3.5C41 30.5 24 40 24 40Z"/><path class="b" d="M14 18.5a4 4 0 0 1 4-4"/>',
    'question': '<circle cx="24" cy="24" r="17"/><path class="b" d="M19 19.5a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3v1.4"/><path class="b" d="M24 34.5v.1"/>',
    'globe': '<circle cx="24" cy="24" r="17"/><path class="b" d="M7.5 24h33M24 7c-4.6 4.8-7 10.6-7 17s2.4 12.2 7 17c4.6-4.8 7-10.6 7-17s-2.4-12.2-7-17Z"/>',
    'clock': '<circle cx="24" cy="24" r="17"/><path class="b" d="M24 14v10l7 4.5"/>',
}
ICONS48['gate'] = ICONS48['culture']   # old name, kept for markup that still says gate
ICONS48['sun'] = ICONS48['nature']
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
# 15.11.2026 menu (Yoske + partner feedback): tours, families, companies & organisations, ONE external tab for
# South America that goes straight to Brazilao (no inner page), and contact. Upcoming dates and the quiz have their
# own entries in the homepage sections and in the mobile menu.
NAV = [('/tours/', 'הסיורים', 'tours', False), ('/families.html', 'משפחות', 'families', False), ('/orgs.html', 'חברות וארגונים', 'orgs', False),
       ('/about.html', 'על יוסק׳ה', 'about', False), (base.BRAZILAO, 'דרום אמריקה', 'sa', True), ('/contact.html', 'יצירת קשר', 'contact', False)]
MENU_EXTRA = [('/#upcoming', 'סיורים קרובים'), ('/quiz.html', 'איזה סיור מתאים לנו?'), ('/gallery.html', 'גלריה')]
RAIL = [('top', 'culture', 'פתיחה'), ('unique', 'nature', 'הייחודיות'), ('about', 'person', 'יוסק׳ה'), ('map', 'pin', 'המפה'), ('tours', 'route', 'הסיורים'),
        ('upcoming', 'calendar', 'סיורים קרובים'), ('groups', 'group', 'לקבוצות'), ('moments', 'camera', 'מהשטח'),
        ('reviews', 'heart', 'המלצות'), ('abroad', 'globe', 'דרום אמריקה'), ('faq', 'question', 'שאלות'), ('contact', 'mobile', 'יצירת קשר'), ('trail', 'nature', 'ברגל')]
TABBAR = ['unique', 'tours', 'groups', 'about', 'contact']

LOGO = ('<img class="logo" src="/assets/brand/logo-horizontal.svg" width="473" height="159" '
        'alt="יוסק׳ה, טיולים, חברה, תרבות">')
EXT = '<svg class="ext" aria-hidden="true"><use href="#i-out"/></svg><span class="visually-hidden"> (באתר ברזילאו, נפתח בכרטיסייה חדשה)</span>'


def nav_links(current):
    out = []
    for h, l, k, ext in NAV:
        cur = ' aria-current="page"' if k == current else ''
        tgt = f' target="_blank" rel="noopener" data-track="outbound_brazilao"' if ext else ''
        out.append(f'<a href="{h}"{cur}{tgt}>{l}{EXT if ext else ""}</a>')
    return ''.join(out)


def header(current, home):
    links = nav_links(current)
    extra = ''.join(f'<a href="{h}">{l}</a>' for h, l in MENU_EXTRA)
    return f'''<header class="top{' top--home' if home else ''}" data-top>
    <a class="top__logo" href="/" aria-label="יוסק׳ה, לדף הבית">{LOGO}</a>
    <nav class="top__pill" aria-label="ניווט ראשי">{links}</nav>
    <div class="top__icons">
      <a class="btn btn--sun btn--sm top__quiz" href="/quiz.html" data-track="quiz_entry" data-track-from="header">איזה סיור מתאים לנו?</a>
      <a class="roundbtn" href="{WA['general']}" target="_blank" rel="noopener" aria-label="וואטסאפ ליוסק׳ה" data-track="whatsapp_click"><svg aria-hidden="true"><use href="#i-chat"/></svg></a>
      <a class="roundbtn" href="tel:+{PHONE_INTL}" aria-label="להתקשר: {PHONE_HUMAN}" data-track="phone_click"><svg aria-hidden="true"><use href="#i-phone"/></svg></a>
    </div>
    <button class="top__menu roundbtn" type="button" aria-expanded="false" aria-controls="menu" data-menu-btn><svg aria-hidden="true"><use href="#i-menu"/></svg><span class="visually-hidden">תפריט</span></button>
  </header>
  <div class="menu" id="menu" hidden data-menu>
    <nav aria-label="תפריט">{links}{extra}</nav>
    <p class="menu__contact"><a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a><a href="{WA['general']}" target="_blank" rel="noopener">וואטסאפ</a><a href="{base.FB_PAGE}" target="_blank" rel="noopener">פייסבוק</a></p>
  </div>'''


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
          <a href="/tours/">הסיורים בחיפה</a><a href="/#upcoming">סיורים קרובים</a><a href="/quiz.html">איזה סיור מתאים לנו?</a><a href="/families.html">סיורי משפחות</a><a href="/orgs.html">לחברות ולארגונים</a><a href="/about.html">על יוסק׳ה</a><a href="/gallery.html">גלריה</a><a href="/contact.html">יצירת קשר</a>
        </nav>
        <div>
          <h2>מדברים</h2>
          <a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a><a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>
          <a href="{WA['general']}" target="_blank" rel="noopener">וואטסאפ</a><a href="{base.FB_PAGE}" target="_blank" rel="noopener">פייסבוק</a>
          <a href="{base.BRAZILAO}" target="_blank" rel="noopener" data-track="outbound_brazilao">דרום אמריקה, באתר ברזילאו<span class="visually-hidden"> (נפתח בכרטיסייה חדשה)</span></a>
        </div>
        <nav aria-label="מידע משפטי ונגישות">
          <h2>מידע</h2>
          <a href="/privacy.html">מדיניות פרטיות</a><a href="/terms.html">תקנון ותנאי שימוש</a><a href="/accessibility.html">הצהרת נגישות</a><button type="button" class="linkbtn foot__prefs" data-cookie-open>העדפות עוגיות ומדידה</button>
        </nav>
      </div>
    </div>
    <p class="wrap foot__made"><span>עיצוב ופיתוח על ידי</span>{CREDIT_LOGO}</p>
    <p class="wrap foot__credits">צילום מקדש הבאב והטרסות: <a href="https://commons.wikimedia.org/wiki/File:Baha%27i_gardens_in_Haifa_39.jpg">Guillaume Paumier</a>, ויקישיתוף, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a> (הסרת השמיים, חיתוך והתאמת גודל). יתר הצילומים מהארכיון של יוסק׳ה קליין.</p>
  </footer>'''

HEAD_JS = ("(function(d,m){try{var p=JSON.parse(localStorage.getItem('yoske-a11y')||'{}');if(p.v===1){if(p.t>0&&p.t<4)d.classList.add('a11y-t'+p.t);"
           "if(p.c)d.classList.add('a11y-contrast');if(p.l)d.classList.add('a11y-links');if(p.m)d.classList.add('a11y-still')}}catch(e){}"
           "var s=m('(prefers-reduced-motion: reduce)').matches||location.search.indexOf('still')>-1||d.classList.contains('a11y-still');"
           "d.classList.add('js',s?'still':'motion')})(document.documentElement,matchMedia)")
_HJ = base64.b64encode(hashlib.sha256(HEAD_JS.encode()).digest()).decode()
# Measurement (15.11.2026): no provider is configured, so nothing is loaded. With GA4_ID set at build time the
# cookie panel offers a "measurement" switch and analytics.js loads gtag ONLY after that consent (CSP opened for it).
GA4_ID = os.environ.get('GA4_ID', '').strip()
_GA = " https://www.googletagmanager.com" if GA4_ID else ''
_GAC = " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" if GA4_ID else ''
CSP = (f"default-src 'self'; script-src 'self' 'sha256-{_HJ}'{_GA}; style-src 'self' 'unsafe-inline'; img-src 'self' data:{_GAC}; font-src 'self'; "
       f"connect-src 'self'{_GAC}; object-src 'none'; base-uri 'self'; form-action 'self'")


def _v(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


def page(path, title, description, body, current='', body_class='page', preload='', extra_js='', noindex=False, **_):
    home = body_class == 'home'
    indexable = LAUNCH and path != '404.html' and not noindex
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
<body class="{body_class}" data-ga4="{GA4_ID}">
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
    <button class="a11y-fab" type="button" aria-haspopup="dialog" data-a11y-open title="אפשרויות נגישות"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.6" r="1.7" fill="currentColor" stroke="none"/><path d="M5 8.6c4.4 1.4 9.6 1.4 14 0M12 9v5.2M12 14.2l-3.2 6M12 14.2l3.2 6"/></svg><span class="visually-hidden">אפשרויות נגישות</span></button>
  </aside>
  <script src="/vendor/lenis.min.js" defer></script>
  <script src="/vendor/gsap.min.js" defer></script>
  <script src="/vendor/ScrollTrigger.min.js" defer></script>
  <script src="/yoske.js?v={_v('yoske.js')}" defer></script>
  <script src="/prefs.js?v={_v('prefs.js')}" defer></script>
  <script src="/analytics.js?v={_v('analytics.js')}" defer></script>
  <script src="/forms.js?v={_v('forms.js')}" defer></script>{extra_js}
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
      <figure class="wrap phead__photo"><div class="frame frame--wide">{photo(name, alt, '(min-width: 1280px) 1180px, 92vw', 'eager', pos)}</div></figure>
    </section>'''


# ------------------------------------------------------------------ lead form (15.11.2026): saved in the CRM through /api/leads
KIND_OPTIONS = [('general', 'עוד לא בטוחים, רוצים לשמוע'), ('family', 'משפחה וחברים'), ('org', 'חברה, צוות או ארגון'), ('tour', 'סיור מסוים')]


def lead_form(uid, kind='general', tour_slug='', submit='שליחת הפנייה', msg_label='על מה חשבתם?', show_kind=True, extra_hidden=''):
    show_kind = False   # 21.11.2026 (partner): name, phone and an optional note only
    opts = ''.join(f'<option value="{v}"{" selected" if v == kind else ""}>{l}</option>' for v, l in KIND_OPTIONS)
    if kind not in [v for v, _ in KIND_OPTIONS]:
        opts += f'<option value="{kind}" selected>{ {"quiz": "אחרי השאלון", "sale": "הרשמה", "date": "מועד מהלוח"}.get(kind, kind) }</option>'
    kind_field = (f'<div class="field"><label for="{uid}-kind">מי מגיע?</label><select id="{uid}-kind" name="kind">{opts}</select></div>' if show_kind
                  else f'<input type="hidden" name="kind" value="{kind}">')
    return f'''<form class="cform" data-lead novalidate aria-describedby="{uid}-note">
            <p class="cform__context" data-lead-context hidden></p>
            <div class="cform__row">
              <div class="field"><label for="{uid}-name">שם</label><input id="{uid}-name" name="name" autocomplete="name" required maxlength="80" aria-describedby="{uid}-name-err"><p class="field__err" id="{uid}-name-err" data-err="name" hidden></p></div>
              <div class="field"><label for="{uid}-phone">טלפון</label><input id="{uid}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required maxlength="20" aria-describedby="{uid}-phone-err"><p class="field__err" id="{uid}-phone-err" data-err="phone" hidden></p></div>
              {kind_field}
              <div class="field field--wide"><label for="{uid}-msg">{msg_label} <span class="opt">(לא חובה)</span></label><textarea id="{uid}-msg" name="message" rows="2" maxlength="1500"></textarea></div>
              <input type="hidden" name="tour_slug" value="{tour_slug}"><input type="hidden" name="date_id" value="">{extra_hidden}
              <div class="hp" aria-hidden="true"><label for="{uid}-web">אתר</label><input id="{uid}-web" name="website" tabindex="-1" autocomplete="off"></div>
              <button class="btn btn--sun cform__go" type="submit">{submit}</button>
            </div>
            <p class="note" id="{uid}-note">הפרטים נשמרים במערכת הפניות של יוסק׳ה ומשמשים רק כדי לחזור אליכם ולתאם. <a class="textlink" href="/privacy.html#leads">מדיניות הפרטיות</a></p>
            <div class="form__bad" data-lead-bad hidden tabindex="-1" role="alert"><p data-bad-text></p><div class="btnrow"><button class="btn btn--ink btn--sm" type="submit">לנסות שוב</button><a class="btn btn--line btn--sm" href="{WA['general']}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-from="form-error">לכתוב בוואטסאפ</a></div></div>
          </form>
          <div class="form__ok" data-lead-ok hidden tabindex="-1" role="status">
            <svg class="bicon" aria-hidden="true"><use href="#b-mobile"/></svg>
            <p><strong>הפנייה התקבלה ונשמרה.</strong> יוסק׳ה יחזור אליכם בטלפון שהשארתם, בדרך כלל אחרי שהוא חוזר מהשטח. רוצים לדבר כבר עכשיו? <a class="textlink" href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a></p>
            <button type="button" class="btn btn--line btn--sm" data-lead-again>לשלוח פנייה נוספת</button>
          </div>'''


def upcoming_box(uid, tour='', form='#contact', empty_html=''):
    t = f' data-tour="{tour}"' if tour else ''
    empty = empty_html or ('<p>כרגע אין סיור פתוח בלוח. המועדים הבאים יעלו לכאן ברגע שייקבעו. '
                           f'רוצים שנודיע לכם, או לתאם תאריך משלכם? <a class="textlink" href="{form}" data-lead-kind="general" data-lead-note="אשמח לשמוע כשייפתח מועד חדש">השאירו פרטים</a>.</p>')
    return (f'<div class="upcoming" data-upcoming{t} data-form="{form}" id="{uid}" data-state="loading" aria-live="polite">'
            f'<ul class="upcoming__list" data-upcoming-list hidden></ul><div class="upcoming__empty" data-upcoming-empty hidden>{empty}</div>'
            f'<noscript><p>כדי לראות את המועדים הקרובים צריך JavaScript. אפשר גם להתקשר: {PHONE_HUMAN}</p></noscript></div>')


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
            ask = f'/?kind=tour&amp;tour={t["slug"]}#contact'
            details = (f'<p>עוד סיור מהרשימה של יוסק׳ה. הדף המלא שלו בדרך, ובינתיים הכי פשוט לשאול.</p>'
                       f'<div class="btnrow"><a class="btn btn--ink btn--sm" href="{ask}" data-lead-kind="tour" data-lead-tour="{t["slug"]}" data-lead-label="{escape(t["name"])}">לשאול על הסיור<span class="visually-hidden"> {escape(t["name"])}</span></a>'
                       f'<a class="textlink" href="{wa_tour(t["name"])}" target="_blank" rel="noopener">בוואטסאפ<span class="visually-hidden"> על {escape(t["name"])}</span></a></div>')
            link = ask
        out.append(f'''          <li class="acard" data-card>
            <div class="acard__media">{photo(name, '', '(min-width: 900px) 25vw, 78vw', 'low', pos)}<h3 class="acard__title"><a href="{link}">{escape(t['name'])}</a></h3></div>
            <button class="acard__toggle" type="button" aria-expanded="false" aria-controls="{did}" data-card-toggle>פרטים<span class="visually-hidden"> על {escape(t['name'])}</span><svg aria-hidden="true"><use href="#i-plus"/></svg></button>
            <div class="acard__details" id="{did}" data-card-details>{details}</div>
          </li>''')
    return '\n'.join(out)


# ------------------------------------------------------------------ 15.11.2026: sections from real material
# Topics: Yoske's own post of 11.12.2022 ("in addition to the sites we pass, we get to know the big picture of Haifa:
# origins, foundations and consequences of its unique issues (...)"). Example: his post of 1.8.2022 on the city's name.
TOPICS = [('group', 'דו-קיום', 'איך קהילות שונות חיות זו לצד זו בעיר אחת'), ('route', 'תעשייה, מפרץ ונמל', 'העיר שצמחה סביב הים והעבודה'),
          ('nature', 'זיהום אוויר', 'מה המחיר של עיר תעשייה, ומי משלם אותו'), ('culture', 'נדל״ן ייחודי', 'למה הבתים בחיפה נראים כמו שהם נראים'),
          ('nature', 'חזירי הבר', 'מה קורה כשהטבע נכנס לשכונות'), ('pin', 'פרויקטים עירוניים', 'מה העיר מתכננת, ומה זה אומר על מי שגר בה'),
          ('route', 'הבדלי גובה בעיר אחת', 'מהכרמל ועד העיר התחתית: מי גר למעלה ומי למטה')]
TOPICS_SRC = 'מתוך הפוסט של יוסק׳ה על סיורי חג החגים, 11.12.2022'

PAST = [  # (date label, year, title, photos [(name, alt, pos)], caption, place-confirmed text or '')
    ('31.7.2022', 2022, 'משפחות מול המפרץ', [('lookout-kids', 'יוסק׳ה מסביר לילדים ולהורים ליד המעקה מול המפרץ', '50% 50%')], 'הסבר לילדים ולהורים ליד המעקה.', 'חיפה, מול המפרץ'),
    ('1.8.2022', 2022, 'לאורך ציר הגנים', [('bahai-bay', 'ציר הגנים הבהאיים יורד עד הים, וקבוצה ליד השער', '50% 60%')], 'הקבוצה בשער, והציר יורד עד הים.', 'הגנים הבהאיים'),
    ('אוקטובר 2022', 2022, '״חיפה אהובתי״ בחופשת החגים', [],
     'שמונה מועדים בחופשה, ״בין ההר לעיר התחתית, ליום מאושר ומעשיר״, כלשון הפוסט של יוסק׳ה.', ''),
    ('דצמבר 2022', 2022, 'חג החגים בחיפה', [('stairs-group', 'קבוצה גדולה עם יוסק׳ה יושבת על מדרגות ברחוב', '50% 45%'), ('red-sculpture-selfie', 'יוסק׳ה בסלפי מול קבוצה ליד פסל לב אדום מול המפרץ', '30% 55%')],
     'החודש של סיורי חג החגים, עם ״התמונה הרחבה של חיפה״: דו-קיום, נמל, תעשייה ועוד, ומועדים מיוחדים רק למשפחות. הצילומים מאותו חודש.', 'חיפה (פסל LOVE HAIFA)'),
    ('אוגוסט 2023', 2023, 'קבוצות קיץ', [('young-group', 'קבוצת צעירים מצטלמת מתחת לקשת', '50% 50%'), ('colorful-heart-group', 'קבוצה ליד פסל לב צבעוני מול הים', '50% 50%')], 'קבוצת צעירים וקבוצה ליד פסל לב צבעוני מול הים.', ''),
    ('ינואר 2025', 2025, 'בתצפית מעל העיר', [('yoske-guiding-view', 'יוסק׳ה מדבר אל קבוצה ליד המעקה, העיר והמפרץ מאחוריו', '50% 65%'), ('bahai-terraces', 'הגנים הבהאיים מלמעלה עם כיפת הזהב, העיר והנמל', '50% 45%')],
     'הסבר מול העיר והמפרץ, והגנים הבהאיים מלמעלה.', 'חיפה, הגנים הבהאיים'),
    ('אוגוסט 2025', 2025, 'I LOVE HAIFA', [('love-haifa-group', 'קבוצה מצטלמת ליד האותיות I love Haifa', '45% 60%')], 'תמונה קבוצתית ליד השלט.', 'חיפה'),
    ('ספטמבר 2025', 2025, 'יום בעיר', [('yoske-selfie-group', 'יוסק׳ה מצלם סלפי, הקבוצה יושבת מאחוריו ומנופפת', '50% 70%'), ('haifa-sunset', 'העיר והמפרץ בשקיעה, מבט מלמעלה', '50% 50%')], 'סלפי עם הקבוצה, ובסוף היום העיר בשקיעה.', 'חיפה בשקיעה'),
    ('אוקטובר 2025', 2025, 'אל התצפית לקראת ערב', [('lookout-dusk', 'אנשים על מרפסת תצפית מול העיר, הנמל והמפרץ לקראת ערב', '50% 50%'), ('cable-car', 'קרונית רכבל מול שמיים כחולים', '50% 50%')], 'מרפסת התצפית מול הנמל, וקרונית רכבל בדרך.', 'חיפה, מול הנמל'),
    ('31.12.2025', 2025, 'קבוצה בבית כנסת', [('synagogue-group', 'קבוצה בתוך בית כנסת עם פרוכת כחולה', '50% 55%')], 'ביקור בבית כנסת, מול הפרוכת.', ''),
    ('17.1.2026', 2026, 'קבוצה גדולה ברחובות', [('lookout-big-group', 'קבוצה גדולה מצטלמת מול הנוף', '50% 55%'), ('street-tour', 'קבוצה עומדת לאורך רחוב צר ומקשיבה', '50% 55%')], 'תמונה קבוצתית מול הנוף, והקשבה ברחוב צר.', ''),
    ('24.9.2026', 2026, '״סודות ורמזים בחיפה״', [('heart-wide', 'קבוצת משפחות עם יוסק׳ה ליד פסל הלב הצהוב מול המפרץ', '42% 60%'), ('kids-guiding', 'יוסק׳ה מדריך קבוצת ילדים שמרימים ידיים', '60% 35%')],
     'סיור הפעלתי למשפחות וילדים: יוצאים לעיר בעקבות רמזים וחידות.', 'חיפה (״יש לחיפה חור בלב״)'),
]


def topics_section():
    items = ''.join(f'<li class="topic"><svg class="bicon" aria-hidden="true"><use href="#b-{ic}"/></svg><h3>{h}</h3><p>{p}</p></li>' for ic, h, p in TOPICS)
    return f'''    <section class="topics" id="topics" aria-labelledby="topics-title">
      <svg class="bicon deco deco--j" aria-hidden="true" focusable="false"><use href="#b-culture"/></svg>
      <div class="wrap">
        <div class="sec-head">
          <h2 class="duo-title" id="topics-title"><span class="duo-title__light">מעבר לאתרים שעוברים בהם,</span> <span class="duo-title__bold">על מה מדברים <span class="hl hl--teal">בדרך</span></span></h2>
          <p class="topics__lede">״נכיר את התמונה הרחבה של חיפה: מקורות, יסודות והשלכות של העניינים הייחודיים לה״. אלה כמה מהנושאים שעולים בסיורים.</p>
        </div>
        <ul class="topics__grid">{items}</ul>
        <p class="topics__src">{TOPICS_SRC}.</p>
        <div class="example" role="group" aria-labelledby="ex-title">
          <p class="kicker"><svg class="bicon" aria-hidden="true"><use href="#b-group"/></svg>דוגמה מהשטח</p>
          <h3 class="example__title" id="ex-title">חי<span lang="en" dir="ltr">(He)</span>פה או חי<span lang="en" dir="ltr">(Ha)</span>פה?</h3>
          <p>יוסק׳ה שאל את העוקבים איך אומרים את שם העיר, והתשובות התחלקו כמעט חצי-חצי. ״וזה אומר שכולנו צדקנו״: בעברית אומרים חי(He)פה, במלרע, ובערבית ובלועזית חי(Ha)פה. ״עיר לכולם ולכולן. אני אישית קורא לה בשני האופנים״.</p>
          <p class="example__note">ככה נראית הזווית הסוציולוגית והאנתרופולוגית: שאלה קטנה על מילה אחת פותחת שיחה על מי חי בעיר ואיך.</p>
        </div>
      </div>
    </section>'''


def places_section():
    order, tours_at = [], {}
    for tr in TOURS:
        for st in tr.get('stops', []):
            if st == 'תלתן':
                continue
            key = 'הכרמלית' if st == 'תחנה בכרמלית' else st
            if key not in tours_at:
                order.append(key); tours_at[key] = []
            if tr['name'] not in tours_at[key]:
                tours_at[key].append(tr['name'])
    cls = ['teal', 'sun', 'orange', 'leaf']
    items = ''.join(f'<li class="place place--{cls[i % 4]}"><svg class="bicon" aria-hidden="true"><use href="#b-pin"/></svg><div><h3>{p}</h3>'
                    f'<p>{"<span>" + "</span><span>".join(escape(n) for n in tours_at[p]) + "</span>"}</p></div></li>' for i, p in enumerate(order))
    return f'''    <section class="places" id="places" aria-labelledby="places-title">
      <div class="wrap places__in">
        <div class="places__head">
          <h2 class="duo-title" id="places-title"><span class="duo-title__light">מהגנים והתצפיות ועד הנמל,</span> <span class="duo-title__bold">לאן <span class="hl">הולכים</span></span></h2>
          <p>המקומות שהסיורים עוברים בהם, ובאילו סיורים כל אחד מהם. המסלול המדויק נקבע מול הקבוצה.</p>
          <figure class="frame places__photo">{photo('bahai-terraces', 'הגנים הבהאיים מלמעלה עם כיפת הזהב, העיר והנמל', '(min-width: 900px) 36vw, 92vw', 'low', '50% 45%')}<figcaption>הגנים הבהאיים, מלמעלה</figcaption></figure>
        </div>
        <ul class="places__list">{items}</ul>
      </div>
      <p class="wrap places__src">לפי עלון הסיורים של יוסק׳ה. <a class="textlink" href="/tours/">לכל הסיורים</a></p>
    </section>'''


def past_section():
    cards = []
    for date, year, title, photos, cap, place in PAST:
        imgs = ''.join(f'<div class="past__img">{photo(n, alt, "(min-width: 900px) 22vw, 70vw", "low", pos)}</div>' for n, alt, pos in photos[:2])
        if not photos:   # a text-only post: the dates themselves are the picture
            imgs = '<div class="past__dates" aria-hidden="true"><svg class="bicon"><use href="#b-calendar"/></svg><span>2 · 3 · 6 · 7 · 9 · 13 · 14 · 16</span><small>באוקטובר</small></div>'
        pl = f'<p class="past__place"><svg class="bicon" aria-hidden="true"><use href="#b-pin"/></svg>{place}</p>' if place else ''
        cards.append(f'<li class="past__card" data-year="{year}"><div class="past__media past__media--{len(photos[:2])}">{imgs}</div>'
                     f'<div class="past__body"><p class="past__date"><svg class="bicon" aria-hidden="true"><use href="#b-calendar"/></svg>{date}</p>'
                     f'<h3>{title}</h3><p>{cap}</p>{pl}</div></li>')
    years = sorted({p[1] for p in PAST})
    return f'''    <section class="past" id="past" aria-labelledby="past-title">
      <svg class="bicon deco deco--k" aria-hidden="true" focusable="false"><use href="#b-camera"/></svg>
      <div class="wrap">
        <div class="sec-head">
          <h2 class="duo-title" id="past-title"><span class="duo-title__light">משפחות, חברים וצוותים, משנת 2022 ועד היום.</span> <span class="duo-title__bold">סיורים <span class="hl hl--sun-dark">שהיו</span></span></h2>
          <p class="past__years" aria-hidden="true">{''.join(f"<span>{y}</span>" for y in years)}</p>
        </div>
      </div>
      <div class="rail" data-rail>
        <button class="rail__btn rail__btn--prev" type="button" aria-label="לסיורים הקודמים" data-rail-prev><svg aria-hidden="true"><use href="#i-chev"/></svg></button>
        <ul class="rail__track past__track" data-rail-track tabindex="0" aria-label="סיורים שהיו, לפי תאריך. אפשר לגלול לצדדים">
          {''.join(cards)}
        </ul>
        <button class="rail__btn rail__btn--next" type="button" aria-label="לסיורים הבאים" data-rail-next><svg aria-hidden="true"><use href="#i-chev"/></svg></button>
      </div>
      <p class="wrap past__src">התאריכים והצילומים מהפוסטים בעמוד הפייסבוק של יוסק׳ה. מקום מצוין רק כשהוא נראה בתמונה או כתוב בפוסט. <a class="textlink" href="{base.FB_PAGE}" target="_blank" rel="noopener">לעמוד הפייסבוק</a></p>
    </section>'''


# ------------------------------------------------------------------ pages
def render(src, form_id='c', lead_kind='general'):
    """Fill a site-src/v4 fragment: data tokens, photos, icons."""
    body = (SRC / f'v4/{src}').read_text().replace('%%ABOUT_BLOCK%%', (SRC / 'v4/about-block.html').read_text())
    shots = (SRC / 'v4/review-shots.html').read_text(encoding='utf-8').splitlines(keepends=True)
    lead, more = [l for l in shots if 'data-lead-shot' in l], [l for l in shots if 'data-lead-shot' not in l]
    chips, panels = map_parts()
    rep = {'%%MAP_CHIPS%%': chips, '%%MAP_PANELS%%': panels, '%%MAP_SVG%%': map_svg(), '%%TOPICS%%': topics_section(), '%%PLACES%%': places_section(), '%%PAST%%': past_section(), '%%TOUR_CARDS%%': tour_cards(), '%%UPCOMING%%': upcoming_box('home-up'), '%%PROCESS%%': process_rows(),
           '%%LEAD_FORM%%': lead_form(form_id, lead_kind), '%%REVIEW_SHOTS_MORE%%': ''.join(more), '%%REVIEW_MORE_N%%': str(len(more)),
           '%%PHONE%%': PHONE_HUMAN, '%%PHONE_INTL%%': PHONE_INTL, '%%EMAIL%%': EMAIL, '%%BRAZILAO%%': base.BRAZILAO,
           '%%FB_REVIEWS%%': base.FB_REVIEWS, '%%FB_PAGE%%': base.FB_PAGE, '%%REVIEW_SHOTS%%': ''.join(lead)}
    rep.update({f'%%WA_{k}%%': v for k, v in WA.items()})
    for k, v in rep.items():
        body = body.replace(k, v)

    def ph(m):
        name, alt, sizes, *rest = m.group(1).split('|')
        return photo(name, alt, sizes, rest[0] if rest else '', rest[1] if len(rest) > 1 else '')
    body = re.sub(r'%%PHOTO:(.*?)%%(?!%)', ph, body)   # (?!%): a position like "50% 45%" may end the token with "%%%"
    body = re.sub(r'%%ICON:([a-z]+)%%', lambda m: f'<svg class="bicon" aria-hidden="true"><use href="#b-{m.group(1)}"/></svg>', body)
    left = body.replace('%%HERO%%', '')
    assert '%%' not in left, left[left.index('%%'):left.index('%%') + 60]
    return body


def with_objects(body):
    """Floating objects from Yoske's world (site-src/v4/objects.py), placed right inside their sections."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('objects', SRC / 'v4/objects.py'); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    for sid, markup in mod.OBJECTS.items():
        m = re.search(rf'<section [^>]*id="{sid}"[^>]*>\n', body)
        if m:
            body = body[:m.end()] + markup + body[m.end():]
    return body


def home():
    # HERO=a|b|c|d picks the hero (15.11.2026: four options for the client to choose from; see DELIVERY_2026-11-15.md)
    hv = os.environ.get('HERO', 'a')   # the client's choice, 15.11.2026: A (the original)
    pre = {'a': '<link rel="preload" as="image" href="/assets/v4/hero-wide-1440.webp" media="(min-width: 700px)" fetchpriority="high">',
           'b': '<link rel="preload" as="image" href="/assets/hero2/yoske-840.webp" fetchpriority="high">',
           'c': '<link rel="preload" as="image" href="/assets/story/haifa-bay-clean-1672.webp" media="(min-width: 700px)" fetchpriority="high">',
           'd': '<link rel="preload" as="image" href="/assets/hero4/yoske-bay-1672.webp" fetchpriority="high">'}[hv]
    return page('index.html', 'יוסק׳ה | טיולים, חברה, תרבות. סיורים בחיפה',
                'סיורים בחיפה עם יוסק׳ה קליין, דרך האנשים, הסיפורים והתרבות שמרכיבים את המקום. סיורים קבועים, סיורי משפחות וימים לחברות ולארגונים.',
                with_objects(render('home.html').replace('%%HERO%%', render(f'hero-{hv}.html'))), body_class='home', preload=pre)


def first_h1(body):
    """An inner page built from a homepage fragment: its first section title becomes the page's h1."""
    i = body.index('<h2 class="duo-title'); j = body.index('</h2>', i)
    return body[:i] + '<h1' + body[i + 3:j] + '</h1>' + body[j + 5:]


def lead_block(uid, kind, light, bold, text, msg):
    return f'''    <section class="wrap tourlead" id="lead" aria-labelledby="{uid}-t">
      <div class="contact__card">
        <div class="contact__head">
          <h2 class="duo-title" id="{uid}-t"><span class="duo-title__light">{light}</span> <span class="duo-title__bold">{bold}</span></h2>
          <p>{text}</p>
        </div>
        {lead_form(uid, kind, '', 'שליחת הפנייה', msg)}
      </div>
    </section>'''


def about_page():
    body = '<div class="pagetop"></div>\n' + first_h1(render('about.html'))
    return page('about.html', 'נעים להכיר, יוסק׳ה | יוסק׳ה', 'יוסק׳ה קליין: מדריך ומפיק טיולים מבעד לעדשה סוציולוגית ואנתרופולוגית. הזווית, הסיורים שהיו ורגעים מהשטח.', body, current='about')


def families_page():
    body = ('<div class="pagetop"></div>\n' + first_h1(render('families.html'))
            + lead_block('fl', 'family', 'ספרו על המשפחה,', 'נבנה יחד את <span class="hl">היום</span>', 'כמה אתם, בני כמה הילדים ומתי נוח לכם. יוסק׳ה יחזור אליכם בטלפון.', 'כמה אתם, גילאים, מתי?'))
    return page('families.html', 'סיורי משפחות בחיפה | יוסק׳ה', 'סיורי משפחות בחיפה עם יוסק׳ה קליין: ״סודות ורמזים בחיפה״ וימים בהתאמה לפי הגילים והקצב.', body, current='families')


def orgs_page():
    body = ('<div class="pagetop"></div>\n' + first_h1(render('orgs.html'))
            + lead_block('ol', 'org', 'ספרו על הצוות,', 'ותקבלו <span class="hl">הצעה מסודרת</span>', 'כמה משתתפים, מה המטרה של היום ומתי. יוסק׳ה יחזור אליכם עם הצעה.', 'כמה משתתפים, מטרה, תאריך?'))
    return page('orgs.html', 'ימי גיבוש לחברות ולארגונים | יוסק׳ה', 'ימי גיבוש וסיורים לחברות, צוותים וארגונים בחיפה, שנבנים סביב האנשים, עם יוסק׳ה קליין.', body, current='orgs')


def contact_page():
    body = '<div class="pagetop"></div>\n' + first_h1(render('contact.html', 'cp'))
    return page('contact.html', 'יצירת קשר | יוסק׳ה', 'השאירו פרטים ויוסק׳ה יחזור אליכם, או התקשרו ושלחו וואטסאפ. ושאלות נפוצות לפני שבוחרים סיור.', body, current='contact')


def groups_redirect():
    html = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>למשפחות ולארגונים | יוסק׳ה</title>'
            '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/families.html"><link rel="canonical" href="/families.html"></head>'
            '<body><p><a href="/families.html">לסיורי משפחות</a> · <a href="/orgs.html">לחברות ולארגונים</a></p></body></html>')
    (ROOT / 'groups.html').write_text(html)
    return 'groups.html'


def cta_band(light, bold, label, href, ext=True):
    tgt = ' target="_blank" rel="noopener"' if ext else ''
    return f'''    <section class="wrap ctaband">
      {duo(light, bold, 'h2', 'duo-title--center')}
      <a class="btn btn--sun" href="{href}"{tgt}>{label}<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </section>'''


def quiz_band(from_):
    return f'''    <section class="wrap quizband" aria-labelledby="qb-{from_}">
      <svg class="bicon quizband__icon" aria-hidden="true"><use href="#b-route"/></svg>
      <div><h2 class="h-card" id="qb-{from_}">לא בטוחים איזה סיור מתאים?</h2><p>חמש שאלות קצרות על הקבוצה, הזמן והקצב, והמלצה על סיור שקיים בפועל. פרטי קשר רק אם תרצו.</p></div>
      <a class="btn btn--sun" href="/quiz.html" data-track="quiz_entry" data-track-from="{from_}">לשאלון ההתאמה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </section>'''


def tours_index():
    body = phead('חמישה סיורים קבועים, ועוד ימים בהתאמה.', 'הסיורים <span class="hl">בחיפה</span>',
                 'מהגנים והתצפיות ועד העיר התחתית, דרך האנשים והסיפורים שמרכיבים את המקום. בחרו סיור, או ספרו מי אתם ונבחר יחד.',
                 'lookout-dusk', 'אנשים על מרפסת תצפית מול העיר, הנמל והמפרץ לקראת ערב', '50% 55%') + f'''
    <section class="wrap" aria-labelledby="tours-list-title">
      <h2 class="visually-hidden" id="tours-list-title">הסיורים הקבועים</h2>
      <ul class="cardgrid">
{tour_cards()}
      </ul>
    </section>
    <section class="wrap tourdates" aria-labelledby="ti-up">
      <h2 class="h-card" id="ti-up">{bicon("calendar")}מועדים קרובים</h2>
      {upcoming_box('tours-up', '', '/contact.html#contact')}
    </section>
{topics_section()}
{places_section()}
{quiz_band('tours-index')}'''
    return page('tours/index.html', 'הסיורים בחיפה | יוסק׳ה', 'הסיורים בחיפה עם יוסק׳ה קליין, מהגנים והתצפיות ועד העיר התחתית, וימים בהתאמה לקבוצות.', body, current='tours')


LENS = ('הזווית של יוסק׳ה סוציולוגית ואנתרופולוגית: הוא מסתכל על מקום דרך האנשים, החברה והתרבות שלו. '
        'בפועל זה אומר שהתחנות הן נקודת פתיחה לשיחה על מי חי כאן, איך קהילות ותרבויות שונות חיות זו לצד זו, ומה אפשר ללמוד מזה על כולנו. '
        'ויש גם הרבה צחוק בדרך: האיזון בין העשרה לשמחה הוא חלק מהתוכנית.')
FOR_ALL = 'לכל קבוצה, מכל רקע ומכל גיל. כל סיור נבנה מחדש סביב הקבוצה: תחומי העניין, הקצב והאנשים שבה.'


def tour_page(t):
    """15.11.2026: one repeated structure for every tour page. Only sourced data is printed; a block without a source
    is left out (no invented stops, times, prices, difficulty or accessibility)."""
    facts = []
    if t.get('duration'):
        facts.append(f'<li>{bicon("clock", "orange")}<div><p class="facts__k">משך משוער</p><p class="facts__v">{t["duration"]}</p></div></li>')
    if t.get('shape'):
        facts.append(f'<li>{bicon("route")}<div><p class="facts__k">מבנה</p><p class="facts__v">{t["shape"]}</p></div></li>')
    facts.append(f'<li>{bicon("group")}<div><p class="facts__k">למי זה מתאים</p><p class="facts__v">{t.get("audience") or FOR_ALL}</p></div></li>')
    facts.append(f'<li>{bicon("calendar")}<div><p class="facts__k">מחיר ומועדים</p><p class="facts__v">לפי הקבוצה והתאריך. מועדים פתוחים מופיעים למטה, ואפשר לתאם מועד משלכם.</p></div></li>')
    stops = ''
    if t.get('stops'):
        stops = ('<div class="stops"><h3 class="h-sub">בדרך עוברים, בין השאר, ב:</h3><ol>' + ''.join(f'<li>{bicon("pin")}<span>{s}</span></li>' for s in t['stops'])
                 + '<li class="stops__more"><span>ועוד</span></li></ol><p class="stops__src">התחנות לפי עלון הסיורים של יוסק׳ה. המסלול המדויק נקבע מול הקבוצה.</p></div>')
    if not t.get('topics') and t.get('stops'):
        t = dict(t, topics=[f'{h}: {p}' for _, h, p in TOPICS])
    topics = ''
    if t.get('topics'):
        topics = ('<section class="wrap tourtopics" aria-labelledby="tt-title"><h2 class="duo-title" id="tt-title"><span class="duo-title__light">מה חוקרים בדרך</span> '
                  '<span class="duo-title__bold">נושאים <span class="hl hl--teal">שעולים בסיורים</span></span></h2><ul>' + ''.join(f'<li>{bicon("culture")}<span>{x}</span></li>' for x in t['topics']) + f'</ul><p class="topics__src">{TOPICS_SRC}. נושאי ההדרכה המדויקים של הסיור הזה נקבעים לפי הקבוצה.</p></section>')
    gal = ''.join(f'<li class="frame">{photo(n, alt, "(min-width: 900px) 40vw, 90vw")}</li>' for n, alt in t['extra'])
    name = escape(t['name'])
    body = phead(escape(t['place']), name, t['blurb'], t['photo'], t['alt'], t['pos'], back=('/tours/', 'לכל הסיורים')) + f'''
    <section class="wrap tourintro" aria-labelledby="ti-title">
      <div class="tourintro__lens">
        <h2 class="duo-title" id="ti-title"><span class="duo-title__light">מה חווים ומה לומדים</span> <span class="duo-title__bold">יותר מרשימת <span class="hl">תחנות</span></span></h2>
        <p>{LENS}</p>
        {stops}
      </div>
      <ul class="facts" aria-label="פרטי הסיור">{''.join(facts)}</ul>
    </section>
{topics}
    <section class="wrap tourdates" aria-labelledby="td-title">
      <h2 class="h-card" id="td-title">{bicon("calendar")}מועדים קרובים ל«{name}»</h2>
      {upcoming_box('tour-dates', t['slug'], '#tour-lead', '<p>אין כרגע מועד פתוח לסיור הזה בלוח. אפשר לתאם אותו לקבוצה שלכם, בתאריך שנוח לכם: השאירו פרטים למטה.</p>')}
    </section>
    <section class="wrap tourlead" id="tour-lead" aria-labelledby="tl-title">
      <div class="contact__card">
        <div class="contact__head">
          <h2 class="duo-title" id="tl-title"><span class="duo-title__light">רוצים לצאת לסיור הזה?</span> <span class="duo-title__bold">נתאם <span class="hl">יחד</span></span></h2>
          <p>כתבו כמה אתם ומתי נוח לכם. יוסק׳ה יחזור אליכם עם מועד, מחיר ונקודת מפגש לפני שסוגרים משהו.</p>
          <ul class="contact__lines">
            <li><a href="tel:+{PHONE_INTL}" data-track="phone_click"><svg aria-hidden="true"><use href="#i-phone"/></svg><span dir="ltr">{PHONE_HUMAN}</span></a></li>
            <li><a href="{wa_tour(t['name'])}" target="_blank" rel="noopener" data-track="whatsapp_click"><svg aria-hidden="true"><use href="#i-chat"/></svg><span>או בוואטסאפ</span></a></li>
          </ul>
        </div>
        {lead_form('tl', 'tour', t['slug'], 'לבקש מועד לסיור', 'כמה אתם, ומתי נוח לכם?')}
      </div>
    </section>
    <section class="wrap tourgal" aria-labelledby="tg-title">
      <h2 class="h-card" id="tg-title">{bicon("camera")}מהשטח</h2>
      <ul>{gal}</ul>
      <a class="btn btn--line" href="/tours/"><svg class="flip" aria-hidden="true"><use href="#i-arrow"/></svg>חזרה לכל הסיורים</a>
    </section>'''
    return page(f'tours/{t["slug"]}.html', f'{t["name"]} | יוסק׳ה', t['blurb'], body, current='tours', noindex=bool(t.get('draft')))


PROCESS = [
    ('מספרים לי על הקבוצה', 'כמה אתם, בני כמה, מה מסקרן אתכם ומה המטרה של היום: חגיגה משפחתית, יום גיבוש או פשוט לגלות את העיר. אפשר בטופס, בטלפון או בוואטסאפ.'),
    ('בוחרים כיוון', 'יוסק׳ה מציע סיור קיים שמתאים לכם, או בונה יום משלכם סביב תחומי העניין והקצב של הקבוצה. סוגרים מראש נקודת מפגש, משך, מחיר ומה כלול.'),
    ('יוצאים לדרך', 'נפגשים בשטח. הולכים, עוצרים, צוחקים ושואלים. אם מישהו בקבוצה מתעניין במשהו בדרך, כנראה שנעצור שם.'),
    ('ומה נשאר אחרי', 'יום כיפי ומגבש, וגם כמה שאלות שממשיכים לחשוב עליהן: על העיר, על האנשים שחיים בה, ועלינו.'),
]


def process_rows(open_first=True):
    return ''.join(f'<details class="prow-acc"{" open" if (i == 0 and open_first) else ""}><summary><span class="prow-acc__n">0{i + 1}</span>{h}<i aria-hidden="true"></i></summary><p>{t}</p></details>'
                   for i, (h, t) in enumerate(PROCESS))


def groups():
    body = phead('משפחה, חברים או צוות מהעבודה.', 'יום לקבוצה, <span class="hl">שנבנה סביב האנשים</span>',
                 'ספרו מי מגיע, מה מעניין אתכם וכמה זמן יש לכם. משם בונים יחד מסלול שמתאים לקבוצה, לקצב ולמטרה של היום.',
                 'heart-family', 'משפחות וילדים מצטלמים בתוך פסל הלב הצהוב, הים ברקע', '50% 42%') + f'''
    <section class="wrap audience" id="families" aria-labelledby="g-fam">
      <figure class="frame audience__photo">{photo('lookout-kids', 'יוסק׳ה מסביר לילדים ולהורים ליד המעקה מול המפרץ', '(min-width: 900px) 46vw, 92vw')}</figure>
      <div class="audience__copy">
        <p class="kicker">{bicon("group")}למשפחות ולחברים</p>
        <h2 class="duo-title" id="g-fam"><span class="duo-title__light">יום הולדת, מפגש משפחתי או שבת עם חברים.</span> <span class="duo-title__bold">סיור שכולם <span class="hl hl--teal">נהנים בו</span></span></h2>
        <p>גם עם ילדים. ״סודות ורמזים בחיפה״ נבנה בשביל משפחות: חידות ורמזים שמובילים אל הסיפורים של העיר. אפשר גם לבנות יום אחר, לפי הגילים והקצב.</p>
        <div class="btnrow"><a class="btn btn--ink" href="#group-lead" data-lead-kind="family">לתכנן יום למשפחה</a><a class="btn btn--line" href="/tours/sodot-veremazim.html">לסיור המשפחות</a></div>
      </div>
    </section>
    <section class="wrap audience audience--flip" id="orgs" aria-labelledby="g-org">
      <figure class="frame audience__photo">{photo('lookout-big-group', 'קבוצה גדולה מצטלמת בתצפית מעל המפרץ', '(min-width: 900px) 46vw, 92vw')}</figure>
      <div class="audience__copy">
        <p class="kicker">{bicon("culture")}לחברות, לצוותים ולארגונים</p>
        <h2 class="duo-title" id="g-org"><span class="duo-title__light">יום גיבוש ברגל בעיר,</span> <span class="duo-title__bold">שמדברים עליו <span class="hl">גם אחרי</span></span></h2>
        <p>יום שנבנה סביב האנשים ומה שמעניין אותם: מפגש עם העיר, עם הקהילות שחיות בה ועם הסיפורים שלה, בקצב שמתאים לצוות. מספרים על הקבוצה, ומקבלים הצעה מסודרת.</p>
        <div class="btnrow"><a class="btn btn--ink" href="#group-lead" data-lead-kind="org">לקבל הצעה ליום צוות</a><a class="btn btn--line" href="/tours/">לכל הסיורים</a></div>
      </div>
    </section>
    <section class="process process--page" aria-labelledby="g-proc">
      <div class="process__bg" aria-hidden="true">{photo('lookout-group-bay', '', '100vw', 'low', '50% 60%')}</div>
      <div class="wrap process__in">
        <h2 class="duo-title duo-title--on-ink" id="g-proc"><span class="duo-title__light">מהשיחה הראשונה ועד הדרך,</span> <span class="duo-title__bold">איך זה <span class="hl hl--sun">עובד</span></span></h2>
        <div class="process__rows">{process_rows()}</div>
      </div>
    </section>
    <section class="wrap tourlead" id="group-lead" aria-labelledby="gl-title">
      <div class="contact__card">
        <div class="contact__head">
          <h2 class="duo-title" id="gl-title"><span class="duo-title__light">ספרו על הקבוצה,</span> <span class="duo-title__bold">נבנה את <span class="hl">היום</span></span></h2>
          <p>יוסק׳ה חוזר לכל פנייה בטלפון, עם שאלות על הקבוצה והצעה למסלול.</p>
        </div>
        {lead_form('gl', 'family', '', 'שליחת הפנייה', 'כמה אתם, מתי, ומה מעניין אתכם?')}
      </div>
    </section>'''
    return page('groups.html', 'למשפחות ולארגונים | יוסק׳ה', 'סיורים בהתאמה למשפחות, לחברים, לצוותים ולארגונים בחיפה, עם יוסק׳ה קליין.', body, current='families')


QUIZ = [
    ('group', 'מי מגיע?', 'one', [('kids', 'משפחה עם ילדים'), ('adults', 'משפחה או חברים, מבוגרים'), ('team', 'צוות, חברה או ארגון'), ('few', 'זוג או כמה חברים')]),
    ('ages', 'בני כמה הילדים?', 'one', [('small', 'עד 8'), ('mid', '8 עד 12'), ('teen', 'נוער'), ('mixed', 'גילים מעורבים')]),
    ('time', 'כמה זמן יש לכם?', 'one', [('short', 'כשעתיים וחצי'), ('three', 'כשלוש שעות'), ('full', 'יום ארוך, 5 שעות ומעלה'), ('flex', 'גמישים')]),
    ('interests', 'מה מסקרן אתכם? (אפשר כמה)', 'many', [('views', 'תצפיות ונוף'), ('gardens', 'הגנים הבהאיים'), ('lower', 'העיר התחתית, השוק והנמל'),
                                                      ('people', 'אנשים, קהילות וסיפורים'), ('game', 'חידות ומשחק')]),
    ('pace', 'איזה קצב מתאים לקבוצה?', 'one', [('calm', 'רגוע, עם הרבה עצירות'), ('mid', 'בינוני'), ('active', 'הולכים הרבה, בכיף')]),
]


def quiz():
    import json as _j
    tours = {t['slug']: {'name': t['name'], 'blurb': t.get('blurb', ''), 'duration': t.get('duration', ''), 'url': f"/tours/{t['slug']}.html"}
             for t in TOURS if t.get('blurb')}
    steps = []
    for i, (key, q, mode, opts) in enumerate(QUIZ):
        typ = 'checkbox' if mode == 'many' else 'radio'
        items = ''.join(f'<label class="qopt"><input type="{typ}" name="{key}" value="{v}"><span>{l}</span></label>' for v, l in opts)
        cond = ' data-if="group=kids"' if key == 'ages' else ''
        steps.append(f'<fieldset class="qstep" data-step="{key}"{cond} hidden><legend class="qstep__q"><span class="qstep__n" data-qnum></span>{q}</legend><div class="qopts">{items}</div>'
                     f'<p class="field__err" data-qerr hidden>בחרו תשובה כדי להמשיך.</p></fieldset>')
    body = f'''    <section class="phead phead--plain quizhead">
      <div class="wrap">
        <a class="back" href="/"><svg aria-hidden="true"><use href="#i-arrow"/></svg>לדף הבית</a>
        {duo('חמש שאלות קצרות,', 'איזה סיור <span class="hl">מתאים לכם?</span>')}
        <p class="phead__lede">ההמלצה מופיעה מיד, על סיור שקיים בפועל. פרטי קשר רק אם תרצו שיוסק׳ה יחזור אליכם.</p>
      </div>
    </section>
    <section class="wrap quiz" data-quiz aria-labelledby="quiz-h">
      <h2 class="visually-hidden" id="quiz-h">השאלון</h2>
      <script type="application/json" data-quiz-tours>{_j.dumps(tours, ensure_ascii=False)}</script>
      <form class="quiz__card" data-quiz-form novalidate>
        <div class="quiz__bar" aria-hidden="true"><i data-quiz-bar></i></div>
        <p class="quiz__count" data-quiz-count aria-live="polite"></p>
        {''.join(steps)}
        <div class="btnrow quiz__nav"><button type="button" class="btn btn--line" data-quiz-back hidden>הקודמת</button><button type="submit" class="btn btn--ink" data-quiz-next>הבאה<svg aria-hidden="true"><use href="#i-arrow"/></svg></button></div>
      </form>
      <div class="quiz__result" data-quiz-result hidden tabindex="-1">
        <p class="kicker">{bicon("route")}ההמלצה שלנו</p>
        <h2 class="duo-title"><span class="duo-title__light" data-r-kicker></span> <span class="duo-title__bold" data-r-name></span></h2>
        <p class="quiz__why" data-r-why></p>
        <ul class="quiz__reasons" data-r-reasons></ul>
        <div class="btnrow"><a class="btn btn--ink" data-r-link href="/tours/">לדף הסיור</a><button type="button" class="btn btn--line" data-quiz-restart>לענות מחדש</button></div>
        <div class="contact__card quiz__lead">
          <div class="contact__head"><h3 class="h-card">רוצים שיוסק׳ה יחזור אליכם?</h3><p>התשובות שלכם יצורפו לפנייה, כדי שלא תצטרכו להסביר הכול מההתחלה.</p></div>
          {lead_form('ql', 'quiz', '', 'שליחת הפנייה עם התשובות', 'משהו נוסף שכדאי לדעת?', show_kind=False)}
        </div>
      </div>
    </section>'''
    return page('quiz.html', 'איזה סיור מתאים לכם? | יוסק׳ה', 'שאלון קצר שממליץ על סיור בחיפה לפי הקבוצה, הזמן, תחומי העניין והקצב.', body,
                extra_js=f'\n  <script src="/quiz.js?v={_v("quiz.js")}" defer></script>')


TAKBULL = 'https://paypage.takbull.co.il/3BEQx'   # payment page received from the owner (15.11.2026); the offer it sells is not identified yet


def sale():
    """Sales page, DRAFT: the offer behind the payment link is not in the project materials. The structure is complete and
    every missing fact is marked; the page stays noindex and unlinked until the owner fills them in."""
    T = lambda x: f'<mark class="tbd">[נדרש להשלים: {x}]</mark>'
    body = f'''    <p class="draftbar" role="note"><strong>טיוטה.</strong> העמוד לא מקושר מהאתר ולא מופיע בחיפוש עד שיושלמו הפרטים המסומנים.</p>
    <section class="sale">
      <div class="wrap sale__in">
        <div class="sale__copy">
          <p class="kicker">{bicon("calendar")}{T("שם ההצעה, למשל סיור מסוים במועד מסוים")}</p>
          {duo('יום אחד בחיפה,', 'שממשיכים לחשוב עליו <span class="hl">גם אחרי</span>')}
          <p class="phead__lede">סיור עם יוסק׳ה הוא יום כיפי ומגבש, דרך האנשים, הקהילות והסיפורים שמרכיבים את העיר. {T("תיאור ההצעה במשפט אחד")}</p>
          <ul class="facts sale__facts">
            <li>{bicon("calendar")}<div><p class="facts__k">מתי</p><p class="facts__v">{T("תאריך ושעה")}</p></div></li>
            <li>{bicon("pin")}<div><p class="facts__k">נקודת מפגש</p><p class="facts__v">{T("נקודת מפגש")}</p></div></li>
            <li>{bicon("clock", "orange")}<div><p class="facts__k">משך</p><p class="facts__v">{T("משך")}</p></div></li>
            <li>{bicon("group")}<div><p class="facts__k">למי זה מתאים</p><p class="facts__v">{T("קהל, גילים, מספר משתתפים")}</p></div></li>
          </ul>
        </div>
        <aside class="sale__buy" aria-labelledby="buy-h">
          <h2 class="h-card" id="buy-h">הרשמה ותשלום</h2>
          <p class="sale__price">{T("מחיר למשתתף / לקבוצה, כולל מע״מ אם רלוונטי")}</p>
          <p>מה כלול: {T("מה כלול ומה לא")}</p>
          <p>ביטול ושינוי: {T("מדיניות ביטול לפי חוק הגנת הצרכן")}</p>
          <a class="btn btn--sun sale__pay" href="{TAKBULL}" target="_blank" rel="noopener" data-track="checkout_click" data-track-from="sale">למעבר לתשלום מאובטח<svg aria-hidden="true"><use href="#i-out"/></svg><span class="visually-hidden"> (דף הסליקה של Takbull, נפתח בכרטיסייה חדשה)</span></a>
          <p class="note">התשלום מתבצע בדף הסליקה של Takbull. פרטי האשראי לא עוברים דרך האתר הזה.</p>
        </aside>
      </div>
    </section>
    <section class="wrap tourintro" aria-labelledby="sale-what">
      <div class="tourintro__lens">
        <h2 class="duo-title" id="sale-what"><span class="duo-title__light">מה חווים</span> <span class="duo-title__bold">ומה <span class="hl hl--teal">לוקחים הביתה</span></span></h2>
        <p>{LENS}</p>
        <p>{T("2–3 דוגמאות לנושאי ההדרכה של הסיור הזה, מהסילבוס")}</p>
      </div>
      <figure class="frame">{photo('streetart', 'קבוצת מטיילים עם יוסק׳ה מול ציור קיר צבעוני', '(min-width: 900px) 40vw, 92vw')}</figure>
    </section>
    <section class="wrap tourlead" id="sale-lead" aria-labelledby="sl-title">
      <div class="contact__card">
        <div class="contact__head"><h2 class="duo-title" id="sl-title"><span class="duo-title__light">שאלה לפני שנרשמים?</span> <span class="duo-title__bold">נחזור <span class="hl">אליכם</span></span></h2></div>
        {lead_form('sl', 'sale', '', 'שליחה', 'מה תרצו לדעת?', show_kind=False)}
      </div>
    </section>'''
    return page('sale.html', 'הרשמה לסיור | יוסק׳ה', 'הרשמה ותשלום לסיור עם יוסק׳ה קליין בחיפה.', body, noindex=True)


def admin():
    """/admin/: tour dates (add, edit, publish, hide, delete) and the leads CRM. Talks only to /api/admin/*."""
    html = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ניהול | יוסק׳ה</title>
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'">
  <link rel="icon" href="/assets/brand/symbol.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/yoske.css?v={_v('yoske.css')}">
  <link rel="stylesheet" href="/admin/admin.css?v={_v('admin/admin.css')}">
</head>
<body class="adm">
  {SPRITE}
  <header class="adm__top"><img src="/assets/brand/logo-horizontal.svg" width="180" height="60" alt="יוסק׳ה"><h1>ניהול האתר</h1><button type="button" class="btn btn--line btn--sm" data-logout hidden>יציאה</button></header>
  <main class="adm__main" id="main">
    <p class="adm__status" data-status role="status"></p>
    <form class="adm__login contact__card" data-login hidden>
      <h2 class="h-card">כניסה</h2>
      <div class="field"><label for="pw">סיסמה</label><input id="pw" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn--ink" type="submit">כניסה</button>
      <p class="field__err" data-login-err hidden></p>
    </form>
    <div data-app hidden>
      <nav class="adm__tabs" role="tablist" aria-label="אזורי ניהול">
        <button type="button" role="tab" id="tab-dates" aria-controls="panel-dates" aria-selected="true">מועדים קרובים</button>
        <button type="button" role="tab" id="tab-leads" aria-controls="panel-leads" aria-selected="false" tabindex="-1">פניות (CRM)</button>
      </nav>
      <section id="panel-dates" role="tabpanel" aria-labelledby="tab-dates">
        <form class="adm__form contact__card" data-date-form>
          <h2 class="h-card" data-date-form-title>מועד חדש</h2>
          <input type="hidden" name="id">
          <div class="adm__grid">
            <div class="field"><label for="d-title">שם הסיור או האירוע</label><input id="d-title" name="title" required maxlength="120"></div>
            <div class="field"><label for="d-tour">דף סיור באתר (לא חובה)</label><select id="d-tour" name="tour_slug"><option value="">ללא</option>{''.join(f'<option value="{t["slug"]}">{escape(t["name"])}</option>' for t in TOURS if t.get('blurb'))}</select></div>
            <div class="field"><label for="d-date">תאריך</label><input id="d-date" name="date" type="date" required></div>
            <div class="field"><label for="d-time">שעה (לא חובה)</label><input id="d-time" name="time" type="time"></div>
            <div class="field"><label for="d-meet">נקודת מפגש (לא חובה)</label><input id="d-meet" name="meeting_point" maxlength="160"></div>
            <div class="field"><label for="d-price">מחיר, כפי שיוצג (לא חובה)</label><input id="d-price" name="price_note" maxlength="80"></div>
            <div class="field field--wide"><label for="d-note">הערה קצרה (לא חובה)</label><input id="d-note" name="note" maxlength="300"></div>
            <div class="field"><label for="d-action">הפעולה בכפתור</label><select id="d-action" name="action"><option value="enquire">טופס פנייה (שמרו לי מקום)</option><option value="register">הרשמה ותשלום (קישור סליקה)</option><option value="link">קישור אחר</option></select></div>
            <div class="field"><label for="d-url">קישור (להרשמה או לקישור אחר)</label><input id="d-url" name="action_url" type="url" dir="ltr" placeholder="https://"></div>
            <label class="adm__check"><input type="checkbox" name="published"> פורסם באתר</label>
          </div>
          <p class="field__err" data-date-err hidden></p>
          <div class="btnrow"><button class="btn btn--ink" type="submit">שמירה</button><button class="btn btn--line" type="button" data-date-cancel hidden>ביטול עריכה</button></div>
        </form>
        <h2 class="h-card">כל המועדים</h2>
        <p class="adm__hint">באתר מופיעים רק מועדים שסומנו ״פורסם״ ושהתאריך שלהם עוד לא עבר.</p>
        <div class="adm__table" data-dates></div>
      </section>
      <section id="panel-leads" role="tabpanel" aria-labelledby="tab-leads" hidden>
        <div class="btnrow"><button type="button" class="btn btn--line btn--sm" data-leads-refresh>רענון</button><button type="button" class="btn btn--line btn--sm" data-leads-csv>ייצוא CSV</button></div>
        <div class="adm__table" data-leads></div>
      </section>
    </div>
  </main>
  <script src="/admin/admin.js?v={_v('admin/admin.js')}" defer></script>
</body>
</html>
'''
    out = ROOT / 'admin/index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    return 'admin/index.html'


# the two tours that have only a name so far: their pages are built ONLY with DRAFTS=1 (local review), never linked,
# until the syllabus gives verified content (CONTENT_GAPS / DELIVERY_2026-11-15).
DRAFT_TOURS = [
    dict(slug='teima-mehaifa', name='טעימה מחיפה', photo='arches-group', pos='50% 50%', draft=True, place='טיוטה: ממתין לסילבוס מיוסק׳ה',
         blurb='[טיוטה] תיאור הסיור יתווסף מהסילבוס שבקטלוג של יוסק׳ה.', extra=[('arches-group', 'קבוצה מתחת לקשתות אבן')], alt='קבוצה מתחת לקשתות אבן'),
    dict(slug='teva-adam-hevra-sviva', name='טבע, אדם, חברה, סביבה', photo='square-group', pos='50% 45%', draft=True, place='טיוטה: ממתין לסילבוס מיוסק׳ה',
         blurb='[טיוטה] תיאור הסיור יתווסף מהסילבוס שבקטלוג של יוסק׳ה.', extra=[('square-group', 'קבוצה יושבת בכיכר מרוצפת בצל עצים')], alt='קבוצה יושבת בכיכר מרוצפת בצל עצים'),
]


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


LEGAL_UPDATED = '15.11.2026'


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
            '<li>טפסים עם תוויות, הודעות שגיאה ברורות ליד השדה, והודעת אישור רק אחרי שהפנייה נשמרה. השאלון עובד במקלדת, שאלה אחר שאלה.</li>'
            '<li>כיבוד ההגדרה ״הפחתת תנועה״: אנימציות הגלילה מתבטלות וכל התוכן מוצג ברצף רגיל.</li>'
            '<li>כפתור ״אפשרויות נגישות״ קבוע בכל עמוד: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, הפחתת תנועה ואיפוס. הבחירה נשמרת במכשיר בלבד.</li>'
            '<li>התאמה לטלפון, לטאבלט ולמחשב, בלי גלילה לרוחב.</li></ul>'),
        ('מגבלות ידועות', '<ul class="legal__list"><li>קיר ההמלצות מציג צילומי מסך של ביקורות. כל צילום נפתח בגודל מלא, ולכל אחד יש תיאור עם שם הכותב/ת; הטקסט עצמו לא מוקלד באתר.</li>'
            '<li>האתר עדיין לא נבדק עם קוראי מסך (NVDA, VoiceOver) ולא על ידי מורשה נגישות.</li>'
            '<li>וואטסאפ, פייסבוק ואתר ברזילאו הם אתרים חיצוניים, והנגישות שלהם באחריותם.</li></ul>'),
        ('נגישות בסיורים עצמם', '<p>בחיפה יש מדרגות, עליות ומדרכות צרות, וכל מסלול שונה. ספרו לי מראש על צרכי נגישות, ונבדוק יחד אם יש מסלול מתאים או התאמות אפשריות.</p>'),
        ('פנייה בנושא נגישות', f'<p>איש הקשר לפניות בנושא נגישות באתר ובסיורים: {tbd("שם איש/אשת הקשר")}. טלפון: {TEL}. דוא״ל: <a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>. כדאי לציין באיזה דף הייתה הבעיה ומה ניסיתם לעשות, ונחזור אליכם.</p>'),
        ('עדכון', f'<p>ההצהרה עודכנה ב-{LEGAL_UPDATED}, לאחר בדיקה של גרסת האתר מאותו יום.</p>'),
    ])


def privacy():
    """15.11.2026: rewritten for the lead form + CRM, the quiz, the dates and consent-gated measurement.
    Every business fact that is not known stays a visible [נדרש להשלים] mark (see LEGAL_TODO in DELIVERY_2026-11-15.md)."""
    TEL = f'<a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a>'
    MAIL = f'<a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>'
    T = tbd
    return legal_page('privacy.html', 'מדיניות פרטיות', 'איזה מידע האתר של יוסק׳ה קליין אוסף, למה, איפה הוא נשמר ואיך מבקשים למחוק אותו.',
        'בקצרה: מידע אישי מגיע אלינו רק כשאתם שולחים טופס או פונים ישירות. הוא נשמר במערכת הפניות של יוסק׳ה ומשמש רק כדי לחזור אליכם ולתאם. כלי מדידה, אם יופעל, ייטען רק אחרי שתאשרו.', [
        ('מי אחראי למידע', f'<p>האתר מופעל על ידי יוסק׳ה קליין, הדרכה והפקת טיולים ({T("שם משפטי מלא ומספר עוסק")}). פניות בנושא פרטיות: {MAIL}, טלפון {TEL}. מי מטפל בפניות האלה: {T("שם האחראי/ת לטיפול בפניות פרטיות")}.</p>'),
        ('<span id="leads">מה נאסף בטפסים</span>',
         '<p><strong>טופס יצירת קשר, טופס בדף סיור ובקשה למועד:</strong> שם, טלפון, סוג הפנייה (למשל משפחה או ארגון), הסיור או המועד שבחרתם, ותוכן ההודעה אם כתבתם. נשמרים גם הדף שממנו נשלחה הפנייה, האתר שהפנה אליו (אם יש) ותגיות קמפיין בכתובת (utm) אם הגעתם מקישור כזה.</p>'
         '<p><strong>השאלון ״איזה סיור מתאים לכם?״:</strong> התשובות נשארות בדפדפן ומשמשות להצגת ההמלצה. הן נשלחות רק אם תבחרו לשלוח פנייה בסוף השאלון, ואז הן מצורפות לפנייה.</p>'
         '<p><strong>פנייה ישירה</strong> בטלפון, בוואטסאפ או בפייסבוק: מה שאתם בוחרים לשתף, למשל מספר משתתפים, גילים, צרכים מיוחדים ומועד מבוקש.</p>'),
        ('למה משמש המידע', '<p>כדי לחזור אליכם, להציע ולתאם סיור, ולנהל את הפניות (למשל לסמן שחזרנו אליכם). המידע לא נמכר ולא מועבר לאחרים לצורכי פרסום. לא תישלח אליכם פרסומת בלי הסכמה מפורשת ונפרדת.</p>'),
        ('איפה המידע נשמר', f'<p>האתר מתארח ב-Vercel. הפניות נשמרות במאגר מידע מאובטח (Supabase, בשרתים באיחוד האירופי, פרנקפורט), שהגישה אליו מוגבלת לשרת של האתר ולממשק הניהול של יוסק׳ה, בסיסמה. תוכן הפניות ותשובות השאלון לא נשלחים לשום כלי מדידה.</p>'),
        ('<span id="cookies">עוגיות, אחסון בדפדפן ומדידה</span>',
         '<p><strong>חיוני:</strong> האתר לא יוצר עוגיות לגולשים. העדפות הנגישות שבחרתם ובחירת העוגיות נשמרות בדפדפן שלכם בלבד (localStorage, המפתחות <bdi dir="ltr">yoske-a11y</bdi> ו-<bdi dir="ltr">yoske-consent</bdi>). בממשק הניהול, למורשים בלבד, נשמרת עוגיית כניסה חיונית.</p>'
         f'<p><strong>מדידה:</strong> אם תאשרו בחלון ״העדפות עוגיות ומדידה״, האתר סופר בעצמו (בלי ספק חיצוני ובלי עוגיות) כניסות לדפים, לחיצות על טלפון, וואטסאפ ומייל, ומאיזה סוג אתר הגעתם (למשל גוגל או פייסבוק). הספירה נשמרת באותו מאגר מאובטח, בלי שם, טלפון, מייל, תוכן פנייה או כתובת IP. בלי אישור לא נספר דבר. אפשר לפתוח את החלון בכל עת מהכפתור בתחתית כל עמוד ולשנות את הבחירה. תקופת השמירה של נתוני הספירה: {T("תקופת השמירה של נתוני הספירה")}.</p>'),
        ('תשלום', '<p>אם תירשמו לסיור בתשלום, התשלום מתבצע בדף הסליקה של Takbull, אתר חיצוני. פרטי האשראי לא עוברים דרך האתר הזה, והם כפופים למדיניות של חברת הסליקה.</p>'),
        ('מידע טכני', f'<p>כמו בכל אתר, שרת האחסון רושם פרטים טכניים על בקשות לדפים: כתובת IP, סוג דפדפן, הדף שנטען ושעה. תקופת השמירה של היומנים: {T("תקופת השמירה של יומני Vercel בחבילה שנבחרה")}.</p>'),
        ('כמה זמן נשמר המידע', f'<p>{T("כמה זמן נשמרות פניות שלא התקדמו, ופניות של לקוחות, ומתי הן נמחקות")}.</p>'),
        ('הזכויות שלכם', f'<p>לפי חוק הגנת הפרטיות, התשמ״א-1981, אפשר לבקש לעיין במידע שנשמר עליכם, לתקן אותו או למחוק אותו. פנו ל-{MAIL} או בטלפון {TEL}, ונענה תוך {T("זמן מענה")}.</p>'),
        ('שירותים של אחרים', '<p>וואטסאפ ופייסבוק הם שירותים של Meta, ופנייה דרכם כפופה גם למדיניות שלהם. הקישורים לאתר ברזילאו, ל-Takbull ולוויקימדיה מובילים לאתרים אחרים, עם מדיניות משלהם.</p>'),
        ('צילומים באתר', '<p>באתר מופיעים צילומים מסיורים, ובחלקם משתתפים. מי שמזהה את עצמו ומבקש להסיר צילום, מוזמן לפנות, והצילום יוסר.</p>'),
        ('ילדים', '<p>הטפסים מיועדים למבוגרים שמתאמים סיור.</p>'),
        ('שינויים', '<p>המדיניות תתעדכן כשהאתר משתנה. תאריך העדכון האחרון מופיע בראש הדף.</p>'),
    ])


def terms():
    TEL = f'<a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a>'
    T = tbd
    return legal_page('terms.html', 'תקנון ותנאי שימוש', 'תנאי השימוש באתר של יוסק׳ה קליין, ותנאי הזמנה וביטול.',
        'האתר מציג מידע על סיורים בחיפה, על סיורי משפחות ועל ימים לחברות ולארגונים. אפשר לשלוח בו פנייה, ובמועדים מסוימים גם להירשם ולשלם בדף סליקה חיצוני.', [
        ('מפעיל האתר', f'<p>יוסק׳ה קליין, הדרכה והפקת טיולים ({T("שם משפטי מלא ומספר עוסק")}). כתובת למשלוח דואר: {T("כתובת")}. טלפון: {TEL}.</p>'),
        ('המידע על הסיורים', '<p>תיאורי המסלולים, התחנות והמשכים באתר הם מידע כללי. המסלול, המשך, המחיר והמועד נקבעים בתיאום, ויכולים להשתנות לפי הקבוצה, מזג האוויר, אירועים בעיר וגישה למקומות. פנייה באתר אינה הזמנה ואינה התחייבות למועד.</p>'),
        ('הזמנה ותשלום', f'<p>סיור פרטי נסגר בשיחה, אחרי שקיבלתם מחיר ופרטים. במועד פתוח שמוצע בו כפתור ״הרשמה ותשלום״, התשלום מתבצע בדף הסליקה של Takbull. מה כלול במחיר, מתי מקבלים אישור וקבלה: {T("תהליך ההרשמה, האישור והקבלה")}.</p>'),
        ('ביטול ושינוי', f'<p>{T("מדיניות ביטול ושינוי לסיורים פרטיים ולמועדים פתוחים, כולל דמי ביטול והחזרים, בהתאם לחוק הגנת הצרכן, התשמ״א-1981, ולתקנות הגנת הצרכן (ביטול עסקה)")}. ביטול סיור מצד המדריך (למשל בגלל מזג אוויר): {T("מה קורה במקרה כזה")}. אין בתקנון כדי לגרוע מזכויות שהחוק נותן לצרכנים.</p>'),
        ('השתתפות בסיור', f'<p>חלק מהמסלולים כוללים עליות, מדרגות והליכה ממושכת. כדאי לספר מראש על מגבלות הליכה, צרכי נגישות או גילאי ילדים. ביטוח והוראות בטיחות: {T("האם יש ביטוח ומה נדרש מהמשתתפים")}.</p>'),
        ('מסעות בדרום אמריקה', '<p>הלשונית ״דרום אמריקה״ מובילה לאתר ברזילאו, שמפעילה את המסעות המאורגנים. ההזמנה, התשלום ותנאי ההתקשרות למסעות האלה נעשים מול ברזילאו ולפי התנאים שבאתר שלה.</p>'),
        ('תוכן וזכויות', '<p>הטקסטים והצילומים באתר שייכים ליוסק׳ה קליין, למעט צילומים שמצוין לידם מקור אחר. אין להעתיק או לפרסם אותם בלי רשות. צילומי ההמלצות הם ממה שמטיילים פרסמו או שלחו.</p>'),
        ('קרדיטים לצילומים', '<ul class="legal__list">'
            '<li>המטוס בדף הבית: צילום <a href="https://commons.wikimedia.org/wiki/File:Singapore_Airlines_Boeing_787_9V-SCI_Perth_2024_(01).jpg" target="_blank" rel="noopener">Bahnfrend</a>, ויקישיתוף, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. נעשו בו חיתוך מהרקע והתאמת גודל.</li>'
            '<li>המצלמה בדף הבית: צילום <a href="https://commons.wikimedia.org/wiki/File:Pentax_MX_(black)_with_film.jpg" target="_blank" rel="noopener">Bilby</a>, ויקישיתוף, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. נעשו בו חיתוך מהרקע וחיתוך של גליל הפילם.</li>'
            '<li>צילום מקדש הבאב והטרסות: <a href="https://commons.wikimedia.org/wiki/File:Baha%27i_gardens_in_Haifa_39.jpg" target="_blank" rel="noopener">Guillaume Paumier</a>, ויקישיתוף, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a> (הסרת השמיים, חיתוך והתאמת גודל).</li>'
            '<li>יתר הצילומים, כולל קרונית הרכבל, מהארכיון של יוסק׳ה קליין.</li></ul>'),
        ('קישורים לאתרים אחרים', '<p>האתר מקשר לוואטסאפ, לפייסבוק, לברזילאו, ל-Takbull ולוויקימדיה. לאתרים האלה תנאים ומדיניות פרטיות משלהם.</p>'),
        ('דין וסמכות', f'<p>על התקנון חל הדין הישראלי. מקום השיפוט: {T("בית המשפט המוסמך")}.</p>'),
        ('שינויים ופנייה', f'<p>התקנון יכול להתעדכן. שאלות? {TEL} או <a href="{WA["general"]}" target="_blank" rel="noopener">וואטסאפ</a>.</p>'),
    ])


# route the shared legal texts through the new frame
base.page = page
base.legal_page = legal_page
base.TBD = tbd
base.LEGAL_UPDATED = LEGAL_UPDATED

if __name__ == '__main__':
    built = [home(), tours_index()] + [tour_page(t) for t in TOURS if t.get('blurb')] + [families_page(), orgs_page(), about_page(), contact_page(), gallery(), not_found(), privacy(), terms(), accessibility(), quiz()]
    extra = [sale(), admin(), groups_redirect()]
    if os.environ.get('DRAFTS') == '1':
        extra += [tour_page(t) for t in DRAFT_TOURS]
    else:
        for t in DRAFT_TOURS:
            (ROOT / f'tours/{t["slug"]}.html').unlink(missing_ok=True)
    print('also (not in sitemap):', ', '.join(extra))
    print('built:', ', '.join(built))
    # robots.txt / sitemap.xml: closed until LAUNCH=1 with SITE_URL (no domain is invented)
    if LAUNCH:
        urls = [('/' if b == 'index.html' else '/' + b.replace('index.html', '')) for b in built if b != '404.html']
        today = __import__('datetime').date.today().isoformat()
        (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + '\n'.join(f'  <url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>' for u in urls) + '\n</urlset>\n')
        (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /sale.html\nSitemap: {SITE_URL}/sitemap.xml\n')
    else:
        (ROOT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (ROOT / 'sitemap.xml').unlink(missing_ok=True)
    print('seo:', 'LAUNCH (indexable, sitemap)' if LAUNCH else 'closed (noindex, Disallow: /)')
