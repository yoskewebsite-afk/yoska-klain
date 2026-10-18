"""Static site generator for the Yoske Klein website.

Run from tools/:  python3 build_site.py
Reads ../site-src/home.html and the data below, writes the pages into ../prototype/.
There is no framework: the output is plain HTML that shares styles.css and app.js.

Content rules enforced here:
- A tour gets a detail page only when its description is sourced (see TOURS[...]['source']).
- No prices, dates, durations or ratings are written anywhere unless they come from a source.
"""
import json
import re
from html import escape
from pathlib import Path
from urllib.parse import quote

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / 'prototype'
SRC = PROJECT / 'site-src'
MEDIA = {p['filename'].split('/')[-1][:-4]: p for p in json.loads((PROJECT / 'media/media-manifest.json').read_text())['photos']}

PHONE_INTL = '972544361667'
PHONE_HUMAN = '054-4361667'
BRAZILAO = 'https://www.brazilao.com/organized-tours'
FB_REVIEWS = 'https://www.facebook.com/HaifaMyLove/reviews'
FB_PAGE = 'https://www.facebook.com/HaifaMyLove/'


def wa(text):
    return f'https://wa.me/{PHONE_INTL}?text={quote(text)}'


WA = {
    'general': wa('היי יוסק׳ה, הגענו דרך האתר ונשמח לתכנן טיול.'),
    'tours': wa('היי יוסק׳ה, נשמח לשמוע על הסיורים בחיפה.'),
    'fit': wa('היי יוסק׳ה, מה מתאים לנו? נשמח לעזרה בבחירת סיור.'),
    'family': wa('היי יוסק׳ה, נשמח לתכנן טיול למשפחה ולחברים.'),
    'org': wa('היי יוסק׳ה, נשמח לתכנן יום לצוות או לארגון.'),
    'sa': wa('היי יוסק׳ה, באילו מסעות בדרום אמריקה אתה מדריך?'),
    'meet': wa('היי יוסק׳ה, נשמח להכיר.'),
    'private': wa('היי יוסק׳ה, נשמח לסיור פרטי בחיפה.'),
}


def wa_tour(name):
    return wa(f'היי יוסק׳ה, נשמח לפרטים על הסיור ״{name}״.')


# Sources. Four tours are described in Yoske's own flyer; one in a 2026 post; two are names only.
SRC_FLYER = 'עלון ״סיורי חיפה אהובתי״ שפורסם בעמוד הפייסבוק ב-11.12.2022 (תחנות, מבנה ומשך)'
TOURS = [
    dict(slug='haifa-ahuvati', name='חיפה אהובתי', photo='bahai-bay', pos='50% 58%', featured=True, place='ציר הגנים הבהאיים, מהכרמל אל הים',
         blurb='הסיור המלא: הגנים הבהאיים, טיילת לואי, הכרמלית, כיכר פריז, הנמל ועוד, ביום אחד.',
         stops=['הגנים הבהאיים', 'טיילת לואי', 'הכרמלית', 'כיכר פריז', 'הנמל', 'תלתן'], duration='כ-5 עד 6 שעות', shape='סיור מעגלי',
         extra=[('bahai-bay', 'ציר הגנים הבהאיים עד הים, וקבוצה ליד השער'), ('yoske-guiding-view', 'יוסק׳ה מדבר אל קבוצה ליד המעקה, העיר והמפרץ מאחוריו')],
         alt='ציר הגנים הבהאיים יורד במדרגות עד העיר והים', source=SRC_FLYER),
    dict(slug='haifa-ahuvati-mekutzar', name='חיפה אהובתי מקוצר', photo='carmelit', pos='50% 40%', featured=True, place='ילדים מול קרון ברציף תחתי',
         blurb='הגרסה הקצרה: הגנים הבהאיים, טיילת לואי, הכרמלית, כיכר פריז, הנמל ועוד.',
         stops=['הגנים הבהאיים', 'טיילת לואי', 'הכרמלית', 'כיכר פריז', 'הנמל'], duration='כ-3 שעות', shape='סיור לא מעגלי',
         extra=[('bahai-bay', 'ציר הגנים הבהאיים עד הים, וקבוצה ליד השער'), ('carmelit', 'ילדים מציצים אל קרון ברציף')],
         alt='ילדים מציצים אל קרון ברציף תחתי', source=SRC_FLYER),
    dict(slug='haifa-shel-maala', name='חיפה של מעלה', photo='bahai-terraces', pos='50% 45%', featured=True, place='הגנים הבהאיים מלמעלה, העיר והנמל',
         blurb='העיר שלמעלה: הגנים הבהאיים, טיילת לואי, רובע המדרגות, תחנה בכרמלית, גן האם ועוד.',
         stops=['הגנים הבהאיים', 'טיילת לואי', 'רובע המדרגות', 'תחנה בכרמלית', 'גן האם'], duration='כ-2.5 שעות', shape='סיור לא מעגלי',
         extra=[('lookout-big-group', 'קבוצה גדולה מצטלמת מול הנוף'), ('telescope', 'ילד מביט במשקפת תצפית אל העיר והמפרץ')],
         alt='הגנים הבהאיים מלמעלה עם כיפת הזהב, העיר והנמל', source=SRC_FLYER),
    dict(slug='haifa-shel-mata', name='חיפה של מטה', photo='clock-tower', pos='50% 35%', featured=True, place='מגדל שעון מאבן',
         blurb='העיר שלמטה: בניין המפרש, מגדל השעון, כיכר פריז, השוק הטורקי, הנמל, המושבה הגרמנית ועוד.',
         stops=['בניין המפרש', 'מגדל השעון', 'כיכר פריז', 'השוק הטורקי', 'הנמל', 'המושבה הגרמנית'], duration='כ-2.5 שעות', shape='סיור לא מעגלי',
         extra=[('clock-tower', 'מגדל שעון מאבן מול שמיים כחולים'), ('stone-street', 'רחוב עם בנייני אבן ישנים')],
         alt='מגדל שעון מאבן מול שמיים כחולים', source=SRC_FLYER),
    dict(slug='sodot-veremazim', name='סודות ורמזים בחיפה', photo='heart-wide', pos='50% 60%', featured=True, place='״יש לחיפה חור בלב״, הפסל הצהוב מול המפרץ',
         blurb='סיור הפעלתי למשפחות ולילדים: יוצאים לעיר בעקבות רמזים וחידות, ומגלים בדרך את הסיפורים שלה.',
         audience='משפחות וילדים',
         extra=[('kids-guiding', 'יוסק׳ה מדריך קבוצת ילדים שמרימים ידיים כדי לענות'), ('lookout-kids', 'יוסק׳ה מסביר לילדים ולהורים ליד המעקה מול המפרץ')],
         alt='קבוצת משפחות עם יוסק׳ה ליד פסל הלב הצהוב מול המפרץ',
         source='פוסט בעמוד הפייסבוק מ-24.9.2026 (״סיור הפעלתי למשפחות וילדודס׳״) ותיאור הסיור שנמסר בבריף'),
    dict(slug='teima-mehaifa', name='טעימה מחיפה', photo='arches-group', pos='50% 50%'),
    dict(slug='teva-adam-hevra-sviva', name='טבע, אדם, חברה, סביבה', photo='square-group', pos='50% 45%'),
]
FEATURED = [t for t in TOURS if t.get('featured')]

GALLERY = [
    ('lookout-dusk', 'אנשים על מרפסת תצפית מול העיר, הנמל והמפרץ לקראת ערב', 'wide'),
    ('yoske-selfie-group', 'יוסק׳ה מצלם סלפי מחייך, הקבוצה יושבת מאחוריו ומנופפת', 'tall'),
    ('heart-family', 'משפחות וילדים מצטלמים בתוך פסל הלב הצהוב, הים ברקע', 'wide'),
    ('bahai-bay', 'ציר הגנים הבהאיים עד הים, וקבוצה ליד השער', 'tall'),
    ('red-sculpture-selfie', 'יוסק׳ה בסלפי, מאחוריו קבוצה ליד פסל לב אדום מול המפרץ', 'wide'),
    ('kids-guiding', 'יוסק׳ה מדריך קבוצת ילדים שמרימים ידיים כדי לענות', 'tall'),
    ('haifa-sunset', 'העיר, המגדלים והמפרץ בשקיעה, מבט מלמעלה', 'tall'),
    ('streetart', 'קבוצת מטיילים עם יוסק׳ה מול ציור קיר צבעוני', 'wide'),
    ('telescope', 'ילד מביט במשקפת תצפית אל העיר והמפרץ', 'tall'),
    ('yoske-guiding-view', 'יוסק׳ה מדבר אל קבוצה ליד המעקה, העיר והמפרץ מאחוריו', 'wide'),
    ('clock-tower', 'מגדל שעון מאבן מול שמיים כחולים', 'tall'),
    ('colorful-bus', 'יוסק׳ה ליד אוטובוס תיירים צבעוני', 'wide'),
    ('lookout', 'יוסק׳ה מסביר מול מפרץ חיפה והנמל', 'wide'),
    ('mural-wall', 'ציור קיר של אישה ופרחים על קיר אבן', 'tall'),
    ('square-group', 'קבוצה יושבת בכיכר מרוצפת בצל עצים', 'wide'),
    ('bahai-terraces', 'הגנים הבהאיים מלמעלה עם כיפת הזהב, העיר והנמל', 'wide'),
    ('stone-street', 'רחוב עם בנייני אבן ישנים', 'tall'),
    ('carmelit', 'ילדים מציצים אל קרון ברציף', 'wide'),
    ('arch-door-group', 'קבוצה מצטלמת בפתח קשת אבן גדולה', 'tall'),
    ('heart-wide', 'קבוצה עם יוסק׳ה ליד פסל הלב הצהוב מול המפרץ', 'wide'),
    ('holiday-lights', 'עץ מואר וקישוטי אור ברחוב בערב', 'tall'),
    ('street-tour', 'קבוצה עומדת לאורך רחוב צר ומקשיבה', 'wide'),
    ('synagogue-group', 'קבוצה בתוך בית כנסת עם פרוכת כחולה', 'wide'),
    ('lookout-big-group', 'קבוצה גדולה מצטלמת מול הנוף', 'wide'),
    ('andes-trail', 'שביל עפר בהרים, אנשים הולכים עם תרמילים', 'wide'),
    ('rio', 'יוסק׳ה פורש ידיים מתחת לפסל ישו הגואל בריו דה ז׳ניירו', 'tall'),
    ('red-shirt', 'יוסק׳ה בחולצה אדומה על מדרגות מבנה עמודים', 'tall'),
    ('facade-old', 'חזית ישנה של בניין אבן עם מרפסות ותוספות', 'tall'),
    ('lookout-group-bay', 'קבוצה יושבת על מדרגות התצפית ומקשיבה, המפרץ מתחת', 'wide'),
    ('clock-tower-sky', 'מגדל שעון מאבן וחצר, שמיים מעוננים', 'tall'),
    ('cable-car', 'קרונית רכבל על כבל מול שמיים כחולים', 'wide'),
    ('stone-courtyard', 'חצר מרוצפת בין קירות אבן, קבוצה מקשיבה', 'wide'),
    ('andes-village', 'רחוב מרוצף ובית צבעוני למרגלות הרים, מאחד המסעות בדרום אמריקה', 'tall'),
    ('andes-alley', 'סמטה מרוצפת בין קירות אבן עתיקים, מאחד המסעות בדרום אמריקה', 'tall'),
    ('ponchos-group', 'יוסק׳ה בפונצ׳ו עם חברים מחייכים בטיול בדרום אמריקה', 'wide'),
]

ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>'
CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'


def img(name, alt, cls='', sizes='(min-width: 900px) 50vw, 100vw', eager=False, extra=''):
    m = MEDIA[name]
    c = f' class="{cls}"' if cls else ''
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<img{c} src="/assets/photos/{name}-sm.jpg" srcset="/assets/photos/{name}-xs.jpg 480w, /assets/photos/{name}-sm.jpg 820w, /assets/photos/{name}.jpg {min(m['width'], 1920)}w" '
            f'sizes="{sizes}" width="{m["width"]}" height="{m["height"]}" alt="{escape(alt)}" {load}{extra}>')


NAV_LINKS = [('/#board', 'הסיורים', 'tours'), ('/#groups', 'ימים לקבוצות', 'groups'), ('/#about', 'מי אני', 'about'), ('/#faq', 'שאלות', 'faq')]


def nav(current=''):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    links = ''.join(a(*l) for l in NAV_LINKS)
    return (f'<header class="nav" data-nav>\n'
            f'    <a class="wordmark" href="/" aria-label="יוסק׳ה קליין, לדף הבית">יוסק׳ה קליין<span>הדרכה והפקת טיולים</span></a>\n'
            f'    <nav class="nav__links" aria-label="ניווט ראשי">{links}</nav>\n'
            f'    <a class="nav__phone" href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a>\n'
            f'    <a class="btn btn--orange btn--sm nav__cta" href="{WA["general"]}" target="_blank" rel="noopener">נדבר בוואטסאפ</a>\n'
            f'    <button class="nav__menu" type="button" aria-expanded="false" aria-controls="menu">תפריט</button>\n'
            f'  </header>\n'
            f'  <nav class="menu" id="menu" aria-label="תפריט" hidden>{links}<a href="/#contact">יצירת קשר</a>'
            f'<a class="menu__phone" href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a></nav>')


FOOTER = f'''<footer class="foot">
    <div class="wrap foot__in">
      <div class="foot__brand">
        <p class="wordmark wordmark--foot">יוסק׳ה קליין<span>הדרכה והפקת טיולים</span></p>
        <p class="foot__contact"><a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a> · <a href="{WA['general']}" target="_blank" rel="noopener">וואטסאפ</a> · <a href="{FB_PAGE}" target="_blank" rel="noopener">פייסבוק</a></p>
      </div>
      <nav class="foot__links" aria-label="קישורים">
        <a href="/tours/">הסיורים בחיפה</a>
        <a href="/groups.html">למשפחות ולארגונים</a>
        <a href="/gallery.html">גלריה</a>
        <a href="{BRAZILAO}" target="_blank" rel="noopener">מסעות באתר ברזילאו</a>
      </nav>
      <nav class="foot__links foot__legal" aria-label="מידע משפטי ונגישות">
        <a href="/privacy.html">מדיניות פרטיות</a>
        <a href="/terms.html">תקנון ותנאי שימוש</a>
        <a href="/accessibility.html">הצהרת נגישות</a>
      </nav>
    </div>
    <p class="wrap credits">צילום הגנים הבהאיים: <a href="https://commons.wikimedia.org/wiki/File:Israel_-_Haifa_-_Bahai_Gardens_004.jpg">EdoM, נחלת הכלל</a>. צילום איגואסו: <a href="https://commons.wikimedia.org/wiki/File:Iguazu_Falls_Panorama_2009.jpg">Mario Roberto Durán Ortiz</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> (חיתוך והתאמת גודל). יתר הצילומים מהארכיון של יוסק׳ה קליין.</p>
  </footer>'''


# Inline head script: sets motion classes before first paint. Its hash is pinned in the Content-Security-Policy.
HEAD_JS = ("(function(d,m){var still=m('(prefers-reduced-motion: reduce)').matches||location.search.indexOf('still')>-1;d.classList.add('js',still?'still':'motion');"
           "if(!still){var c=m('(min-width: 900px)').matches?['plan-on','fan-on','sea-on','gate-on']:['gate-on'];c.forEach(function(k){d.classList.add(k)});"
           "addEventListener('load',function(){if(!window.__motion)c.forEach(function(k){d.classList.remove(k)})})}})(document.documentElement,matchMedia)")
import base64, hashlib
_HJ = base64.b64encode(hashlib.sha256(HEAD_JS.encode()).digest()).decode()
# Everything is self-hosted; external sites are only plain links. style-src needs inline attributes (object-position, --t) and GSAP's CSSOM writes.
CSP = (f"default-src 'self'; script-src 'self' 'sha256-{_HJ}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'")


# cache-busting: the browser must never pair new HTML with an old stylesheet or script
def _v(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


def page(path, title, description, body, current='', body_class='page', preload=''):
    html = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="robots" content="noindex">
  <link rel="icon" href="data:,">
  <script>{HEAD_JS}</script>
  <meta http-equiv="Content-Security-Policy" content="{CSP}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="preload" href="/fonts/noto-sans-hebrew-wdth-wght-hebrew.woff2" as="font" type="font/woff2" crossorigin>
  {preload}
  <link rel="stylesheet" href="/styles.css?v={_v('styles.css')}">
</head>
<body class="{body_class}">
  <a class="skip" href="#main">דילוג לתוכן</a>
  {nav(current)}
  <main id="main">
{body}
  </main>
  {FOOTER}
  <aside aria-label="פנייה מהירה"><a class="float-cta" href="{WA['general']}" target="_blank" rel="noopener" data-float>{CHAT}<span>נדבר בוואטסאפ</span></a></aside>
  <script src="/vendor/lenis.min.js" defer></script>
  <script src="/vendor/gsap.min.js" defer></script>
  <script src="/vendor/ScrollTrigger.min.js" defer></script>
  <script src="/app.js?v={_v('app.js')}" defer></script>
</body>
</html>
'''
    html = re.sub(r'<span class="c-blue">(.*?)</span>', r'\1', html)
    html = re.sub(r'<span class="c-orange">(.*?)</span>', r'<em>\1</em>', html)
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    return path


def page_hero(kicker, title_html, lede, photo, alt, pos='50% 50%'):
    return f'''    <section class="phero">
      <div class="phero__media">{img(photo, alt, sizes='100vw', eager=True, extra=f' style="object-position:{pos}"')}</div>
      <div class="phero__copy">
        <p class="kicker">{kicker}</p>
        <h1 class="display display--xl">{title_html}</h1>
        <p class="lead">{lede}</p>
      </div>
    </section>'''


# ------------------------------------------------------------------ home
def home():
    body = (SRC / 'home.html').read_text()
    def approved_photo(match):
        from PIL import Image
        name, alt, sizes, extra = match.group(1).split('|')
        w, h = Image.open(ROOT / f'assets/approved/{name}-1920.webp').size
        variants = []
        for size in [480, 960, 1920]:
            actual = Image.open(ROOT / f'assets/approved/{name}-{size}.webp').width
            if actual not in [v[0] for v in variants]: variants.append((actual, size))
        srcset = ', '.join(f'/assets/approved/{name}-{nominal}.webp {actual}w' for actual, nominal in variants)
        loading = {'eager': 'fetchpriority="high"', 'low': 'loading="lazy" decoding="async" fetchpriority="low"'}.get(extra, 'loading="lazy" decoding="async"')
        if extra == 'defer':  # loaded by app.js after the page load (hero slides that are not visible yet)
            return f'<img data-src="/assets/approved/{name}-960.webp" data-srcset="{srcset}" sizes="{escape(sizes)}" width="{w}" height="{h}" alt="{escape(alt)}" decoding="async">'
        return f'<img src="/assets/approved/{name}-960.webp" srcset="{srcset}" sizes="{escape(sizes)}" width="{w}" height="{h}" alt="{escape(alt)}" {loading}>'
    body = body.replace('%%BOARD%%', board_rows()).replace('%%TIMED%%', timed_tours())
    for k, v in tc_parts().items():
        body = body.replace(k, v)
    body = re.sub(r'%%PHOTO:(.*?)%%', approved_photo, body)
    rep = {
        '%%ARROW%%': ARROW, '%%CHAT%%': CHAT, '%%PHONE%%': PHONE_HUMAN, '%%PHONE_INTL%%': PHONE_INTL,
        '%%BRAZILAO%%': BRAZILAO, '%%FB_REVIEWS%%': FB_REVIEWS, '%%FB_PAGE%%': FB_PAGE, '%%BOARD%%': board_rows(),
        '%%IMG_STREET%%': img('stone-street', 'רחוב עם בנייני אבן ישנים וחלונות כחולים', sizes='100vw'),
        '%%IMG_YOSKE%%': img('lookout', 'יוסק׳ה מסביר בתצפית, מפרץ חיפה והנמל מאחוריו', sizes='(min-width: 900px) 44vw, 100vw', extra=' style="object-position:70% 40%"'),
        '%%IMG_GROUP_PLACE%%': img('lookout-group-bay', 'קבוצה יושבת על מדרגות התצפית ומקשיבה, המפרץ והעיר מתחת', sizes='(min-width: 900px) 62vw, 100vw', extra=' style="object-position:60% 50%"'),
        '%%IMG_GROUP_MOMENT%%': img('heart-family', 'משפחות וילדים מצטלמים בתוך פסל הלב הצהוב, הים ברקע', sizes='(min-width: 900px) 22vw, 60vw'),
        '%%IMG_ANDES%%': img('andes-valley', 'עמק חקלאי רחב בין הרים גבוהים, מאחד המסעות בדרום אמריקה', sizes='100vw'),
        '%%IMG_RIO%%': img('rio', 'יוסק׳ה פורש ידיים מתחת לפסל ישו הגואל בריו דה ז׳ניירו', sizes='(min-width: 900px) 12vw, 30vw'),
        '%%IMG_FINAL%%': img('haifa-sunset', 'חיפה בשעת שקיעה: השכונות, המגדלים, הנמל והמפרץ', sizes='100vw', extra=' style="object-position:50% 30%"'),
    }
    for k, v in WA.items():
        rep[f'%%WA_{k}%%'] = v
    for k, v in rep.items():
        body = body.replace(k, v)
    assert '%%' not in body, 'unreplaced token in home.html: ' + body[body.index('%%'):body.index('%%') + 40]
    return page('index.html', 'יוסק׳ה קליין | סיורים בחיפה',
                'סיורים בחיפה עם יוסק׳ה קליין, בין המקומות שמכירים לסיפורים שעוד לא שמענו. גם ימי חוויה לקבוצות ומסעות בדרום אמריקה.',
                body, current='home', body_class='home',
                preload='<link rel="preload" as="image" href="/assets/approved/haifa-panorama-1920.webp" imagesrcset="/assets/approved/haifa-panorama-960.webp 960w, /assets/approved/haifa-panorama-1920.webp 1920w" imagesizes="100vw" fetchpriority="high">')


BOARD_PHOTO = {'haifa-ahuvati': 'gardens', 'haifa-ahuvati-mekutzar': 'carmelit', 'haifa-shel-maala': 'bahai-terraces',
               'haifa-shel-mata': 'clock-tower', 'sodot-veremazim': 'heart-wide'}


TC = [  # (slug, background scene, card photo, card object-position) — order of the queue, next to the headline first
    ('haifa-ahuvati', 't-haifa-panorama', 'haifa-panorama', '35% 80%'),
    ('haifa-shel-maala', 't-gardens', 'gardens', '50% 50%'),
    ('haifa-shel-mata', 't-streetart', 'mural', '50% 30%'),
    ('sodot-veremazim', 't-heart-wide', 'stone-street', '60% 50%'),
    ('haifa-ahuvati-mekutzar', 't-carmelit', 'carmelit', '50% 40%'),
]


def tc_parts():
    """Timed Cards dressed like the user's image: one background + one text block per tour, and the card queue."""
    by = {t['slug']: t for t in TOURS}
    bgs, items, cards = [], [], []
    for k, (slug, bg, card, pos) in enumerate(TC, 1):
        t = by[slug]
        w = t['name'].split(' ')
        name = escape(w[0]) + ' <em>' + escape(' '.join(w[1:])) + '</em>' if len(w) > 1 else escape(t['name'])
        dur = t.get('duration') or 'לפי הקבוצה'
        aud = 'למשפחות ולילדים' if t.get('audience') else 'לכל הקבוצות'
        bgs.append(f'          <figure class="tc__bg" data-tc-bg><img src="/assets/scenes/{bg}.webp" width="1920" height="1080" alt="{escape(t["alt"])}" loading="lazy"></figure>')
        items.append(f'''          <div class="tc__item" data-tc-item hidden>
            <p class="tc__kicker">{escape(t['place'])}</p>
            <h3 class="tc__title">{name}</h3>
            <p class="tc__sub">{escape(t['blurb'])}</p>
            <p class="tc__meta">{dur} · {aud} · בתיאום מראש</p>
            <a class="tc__btn" href="/tours/{slug}.html"><span>לפרטי הסיור</span><i aria-hidden="true"><svg><use href="#i-arrow"/></svg></i></a>
          </div>''')
        cards.append(f'          <li data-tc-card="{k}"><button type="button" class="tcc" data-tc-to="{k}" aria-label="לסיור {escape(t["name"])}"><img src="/assets/approved/{card}-480.webp" alt="" loading="lazy" style="object-position:{pos}"><b>{escape(t["name"].replace(" בחיפה", ""))}</b></button></li>')
    return {'%%TC_BGS%%': '\n'.join(bgs), '%%TC_ITEMS%%': '\n'.join(items), '%%TC_CARDS%%': '\n'.join(cards)}


def timed_tours():
    """Timed Cards (reel C4CjTo8Mlyx): one full-bleed place per tour, its text on the side, the other tours as cards."""
    def photo(name, alt, sizes, eager=False):
        from PIL import Image
        w, h = Image.open(ROOT / f'assets/approved/{name}-1920.webp').size
        srcset = ', '.join(f'/assets/approved/{name}-{n}.webp {Image.open(ROOT / f"assets/approved/{name}-{n}.webp").width}w' for n in (480, 960, 1920))
        load = '' if eager else ' loading="lazy" decoding="async"'
        return f'<img src="/assets/approved/{name}-960.webp" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{escape(alt)}"{load}>'
    bgs, items, cards = [], [], []
    for k, t in enumerate(FEATURED):
        on = ' is-on' if k == 0 else ''
        fam = t.get('audience') == 'משפחות וילדים'
        tag = '<span class="tag tag--orange">למשפחות</span>' if fam else '<span class="tag">לכולם</span>'
        dur = t.get('duration') or 'לפי הקבוצה'
        words = t['name'].split(' ')
        cut = (len(words) + 1) // 2
        name = ' '.join(words[:cut]) + (' <span class="br">' + ' '.join(words[cut:]) + '</span>' if words[cut:] else '')
        bgs.append(f'          <figure class="tours__bg{on}" data-bg style="--pos:{t["pos"]}">{photo(t["photo"], t["alt"], "100vw", k == 0)}</figure>')
        items.append(f'''          <article class="tours__item{on}" data-item{'' if k == 0 else ' hidden'}>
            <p class="tours__place">{t['place']}</p>
            <h3 class="tours__name">{name}</h3>
            <p class="tours__blurb">{t['blurb']}</p>
            <p class="tours__meta">{tag}<span>{dur}</span><span>בתיאום מראש</span></p>
            <div class="tours__acts">
              <a class="yarrow" href="/tours/{t['slug']}.html" aria-label="לפרטי הסיור {t['name']}"><svg><use href="#i-arrow"/></svg></a>
              <a class="btn btn--line" href="/tours/{t['slug']}.html">לפרטי הסיור</a>
              <a class="tours__ask" href="{wa_tour(t['name'])}" target="_blank" rel="noopener">לבדוק מועד<span class="visually-hidden"> ל{t['name']}</span></a>
            </div>
          </article>''')
        cards.append(f'            <li data-card-i="{k}"><button type="button" class="tcard" data-to="{k}" aria-label="להציג את {t["name"]}"><img src="/assets/approved/{t["photo"]}-480.webp" width="480" height="600" alt="" loading="lazy" style="object-position:{t["pos"]}"><span>{t["name"]}</span></button></li>')
    n = len(FEATURED)
    return (f'        <div class="tours__bgs">\n' + '\n'.join(bgs) + '\n        </div>\n        <div class="tours__shade" aria-hidden="true"></div>\n'
            f'        <div class="tours__copy" aria-live="polite">\n' + '\n'.join(items) + '\n        </div>\n'
            f'        <ul class="tours__cards" data-cards>\n' + '\n'.join(cards) + '\n        </ul>\n'
            f'''        <div class="tours__ctrl">
          <button type="button" class="tours__btn" data-timed-prev aria-label="הסיור הקודם"><svg><use href="#i-arrow"/></svg></button>
          <button type="button" class="tours__btn" data-timed-next aria-label="הסיור הבא"><svg><use href="#i-arrow"/></svg></button>
          <span class="tours__bar" aria-hidden="true"><i data-timed-bar></i></span>
          <button type="button" class="tours__btn tours__pause" data-timed-pause aria-pressed="false" aria-label="עצירת ההחלפה האוטומטית"><span></span></button>
          <span class="tours__num" aria-hidden="true"><b data-timed-num>01</b> / {n:02d}</span>
        </div>''')


def board_rows():
    rows = []
    for t in FEATURED:
        fam = t.get('audience') == 'משפחות וילדים'
        tag = '<span class="tag tag--orange">למשפחות</span>' if fam else '<span class="tag">לכולם</span>'
        dur = t.get('duration') or 'לפי הקבוצה'
        rows.append(f'''          <div class="brow" role="row" data-reveal>
            <span role="cell" class="brow__name"><a href="/tours/{t['slug']}.html">«{t['name']}»</a></span>
            <span role="cell">{tag}</span>
            <span role="cell" class="brow__meta">{dur}</span>
            <span role="cell" class="brow__meta"><a class="brow__ask" href="{wa_tour(t['name'])}" target="_blank" rel="noopener">בתיאום מראש<span class="visually-hidden">, בדיקת מועדים ל{t['name']}</span></a></span>
            <span role="cell"><a class="yarrow" href="/tours/{t['slug']}.html" aria-label="לפרטי הסיור {t['name']}"><svg><use href="#i-arrow"/></svg></a></span>
          </div>''')
    return '\n'.join(rows)


# ------------------------------------------------------------------ tours
def tours_index():
    cards = []
    for t in TOURS:
        if t.get('blurb'):
            action = f'<a class="btn btn--primary" href="/tours/{t["slug"]}.html">לפרטי הסיור {ARROW}</a>'
            text = f'<p>{t["blurb"]}</p>'
        else:
            action = f'<a class="btn btn--quiet" href="{wa_tour(t["name"])}" target="_blank" rel="noopener">{CHAT} לשאול על הסיור</a>'
            text = ''
        cards.append(f'''        <article class="tourcard">
          <div class="tourcard__media win">{img(t['photo'], '', sizes='(min-width: 900px) 30vw, 92vw', extra=f' style="object-position:{t["pos"]}"')}<span class="win__rim"></span></div>
          <h2 class="display display--card">{t['name']}</h2>
          {text}
          {action}
        </article>''')
    body = page_hero('סיורים בחיפה', 'הסיורים <span class="br">בחיפה.</span>',
                     'חמישה סיורים קבועים, מהגנים והתצפיות ועד העיר התחתית. בחרו סיור ותאמו איתי מועד, או ספרו לי מה אתם מחפשים ונבחר יחד.',
                     'yoske-guiding-view', 'יוסק׳ה מדבר אל קבוצה ליד המעקה, העיר והמפרץ מאחוריו', '50% 62%') + f'''
    <section class="wrap">
      <div class="tourgrid">
{chr(10).join(cards)}
      </div>
      <div class="callout">
        <h2 class="display display--m"><span class="c-orange">לא בטוחים</span> <span class="c-blue">מה מתאים לכם?</span></h2>
        <p>ספרו לי מי מגיע ומה מסקרן אתכם, ואעזור לכם למצוא את הכיוון המתאים.</p>
        <a class="btn btn--primary btn--lg" href="{WA['fit']}" target="_blank" rel="noopener">יוסק׳ה, מה מתאים לנו? {ARROW}</a>
      </div>
    </section>'''
    return page('tours/index.html', 'סיורים בחיפה | יוסק׳ה קליין', 'הסיורים של יוסק׳ה קליין בחיפה.', body, current='tours')


def tour_page(t):
    facts = []
    if t.get('stops'):
        facts.append('<div class="facts__wide"><dt>בין התחנות</dt><dd><ul class="stops">' + ''.join(f'<li>{x}</li>' for x in t['stops']) + '<li>ועוד</li></ul></dd></div>')
    if t.get('duration'):
        facts.append(f'<div><dt>משך משוער</dt><dd>{t["duration"]}</dd></div>')
    if t.get('shape'):
        facts.append(f'<div><dt>מבנה</dt><dd>{t["shape"]}</dd></div>')
    if t.get('audience'):
        facts.append(f'<div><dt>למי זה מתאים</dt><dd>{t["audience"]}</dd></div>')
    facts.append('<div><dt>מחיר ומועדים</dt><dd>תלויים בקבוצה ובתאריך. דברו איתי ונברר יחד.</dd></div>')
    duo = ''.join(f'<figure class="win">{img(n, alt, sizes="(min-width: 900px) 30vw, 92vw")}<span class="win__rim"></span></figure>' for n, alt in t['extra'])
    body = page_hero('סיור בחיפה', f'<span class="c-blue">{t["name"]}</span>', t['blurb'], t['photo'], t['alt'], t['pos']) + f'''
    <section class="wrap wrap--narrow">
      <dl class="facts">
        {chr(10).join(facts)}
      </dl>
      <div class="actions">
        <a class="btn btn--primary btn--lg" href="{wa_tour(t['name'])}" target="_blank" rel="noopener">לתאם את הסיור {ARROW}</a>
        <a class="btn btn--quiet btn--lg" href="/tours/">לכל הסיורים בחיפה</a>
      </div>
      <div class="duo">{duo}</div>
    </section>'''
    return page(f'tours/{t["slug"]}.html', f'{t["name"]} | יוסק׳ה קליין', t['blurb'], body, current='tours')


# ------------------------------------------------------------------ groups, gallery, 404
def groups():
    body = page_hero('למשפחות ולארגונים', 'יום לקבוצה, <span class="br">שנבנה סביב האנשים.</span>',
                     'משפחה, חברים או צוות מהעבודה: ספרו לי מי מגיע, מה מעניין אתכם וכמה זמן יש לכם. משם נבנה יחד מסלול שמתאים לקבוצה, לקצב ולמטרה של היום.',
                     'heart-family', 'משפחות וילדים מצטלמים בתוך פסל הלב הצהוב, הים ברקע', '50% 42%') + f'''
    <section class="wrap">
      <ol class="steps">
        <li><h2 class="display display--card">מכירים</h2><p>מתחילים בשיחה עליכם.</p></li>
        <li><h2 class="display display--card">מתכננים</h2><p>בוחרים כיוון ומדייקים את הפרטים.</p></li>
        <li><h2 class="display display--card">יוצאים</h2><p>נפגשים לחוויה שתוכננה עבורכם.</p></li>
      </ol>
      <div class="choice">
        <article class="choice__card">
          <figure class="win">{img('heart-wide', 'קבוצת משפחות עם יוסק׳ה ליד פסל הלב הצהוב מול המפרץ', sizes='(min-width: 900px) 44vw, 92vw')}<span class="win__rim"></span></figure>
          <h2 class="display display--m"><span class="c-orange">משפחה</span> <span class="c-blue">וחברים</span></h2>
          <a class="btn btn--primary btn--lg" href="{WA['family']}" target="_blank" rel="noopener">טיול למשפחה ולחברים {ARROW}</a>
        </article>
        <article class="choice__card">
          <figure class="win">{img('red-sculpture-selfie', 'יוסק׳ה בסלפי, מאחוריו קבוצה ליד פסל לב אדום מול המפרץ', sizes='(min-width: 900px) 44vw, 92vw')}<span class="win__rim"></span></figure>
          <h2 class="display display--m"><span class="c-blue">צוות</span> <span class="c-orange">או ארגון</span></h2>
          <a class="btn btn--primary btn--lg" href="{WA['org']}" target="_blank" rel="noopener">יום לצוות או לארגון {ARROW}</a>
        </article>
      </div>
    </section>'''
    return page('groups.html', 'למשפחות ולארגונים | יוסק׳ה קליין', 'טיולים וימי חוויה בהתאמה אישית למשפחות, לחברים, לצוותים ולארגונים.', body, current='groups')


def gallery():
    items = '\n'.join(
        f'        <figure class="gitem gitem--{shape} win"><a href="/assets/photos/{n}.jpg" aria-label="לפתיחת התמונה בגודל מלא: {escape(alt)}">{img(n, alt, sizes="(min-width: 900px) 33vw, 92vw")}</a><span class="win__rim"></span></figure>'
        for n, alt, shape in GALLERY)
    body = f'''    <section class="wrap wrap--top">
      <p class="kicker">גלריה</p>
      <h1 class="display display--xl"><span class="c-orange">ככה זה נראה</span> <span class="c-blue">כשאנחנו יוצאים לדרך.</span></h1>
      <p class="lead">האנשים, המקומות והרגעים שביניהם. כמה תמונות מהטיולים שלי, כדי שתוכלו להרגיש קצת מהאווירה עוד לפני שנפגשים.</p>
      <div class="ggrid">
{items}
      </div>
      <div class="callout">
        <h2 class="display display--m"><span class="c-blue">רוצים להיות</span> <span class="c-orange">בתמונה הבאה?</span></h2>
        <a class="btn btn--primary btn--lg" href="{WA['general']}" target="_blank" rel="noopener">בואו נטייל יחד {ARROW}</a>
      </div>
    </section>'''
    return page('gallery.html', 'גלריה | יוסק׳ה קליין', 'תמונות מהטיולים של יוסק׳ה קליין.', body, current='gallery')


def not_found():
    body = f'''    <section class="wrap wrap--top lost">
      <p class="kicker">404</p>
      <h1 class="display display--xl"><span class="c-blue">העמוד הזה</span> <span class="c-orange">יצא לטייל.</span></h1>
      <p class="lead">לא מצאנו את מה שחיפשתם. אפשר לחזור לדף הבית, לעבור לסיורים בחיפה, או פשוט לכתוב לי.</p>
      <div class="actions">
        <a class="btn btn--primary btn--lg" href="/">לדף הבית {ARROW}</a>
        <a class="btn btn--quiet btn--lg" href="/tours/">לסיורים בחיפה</a>
        <a class="btn btn--quiet btn--lg" href="{WA['general']}" target="_blank" rel="noopener">{CHAT} נדבר בוואטסאפ</a>
      </div>
    </section>'''
    return page('404.html', 'העמוד לא נמצא | יוסק׳ה קליין', 'העמוד לא נמצא.', body)


# ------------------------------------------------------------------ legal pages
# Written from the site's verified behaviour (see COMPLIANCE-AUDIT.md). Unknown business facts stay as visible placeholders.
def TBD(x):
    return f'<mark class="tbd">[נדרש להשלים: {x}]</mark>'


LEGAL_UPDATED = '16.10.2026'
TEL = f'<a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a>'


def legal_page(path, title, desc, intro, sections):
    secs = '\n'.join(f'      <section><h2 class="display display--card">{h}</h2>{c}</section>' for h, c in sections)
    body = (f'    <article class="wrap wrap--top legal">\n      <p class="kicker">עודכן לאחרונה: {LEGAL_UPDATED}</p>\n'
            f'      <h1 class="display display--m">{title}</h1>\n      <p class="lead">{intro}</p>\n{secs}\n    </article>')
    return page(path, f'{title} | יוסק׳ה קליין', desc, body)


def privacy():
    return legal_page('privacy.html', 'מדיניות פרטיות', 'איזה מידע האתר של יוסק׳ה קליין אוסף ומה נעשה בו.',
        'בקצרה: האתר הזה לא שומר ולא שולח מידע אישי. אין בו עוגיות, אין כלי מדידה ואין פרסום. מידע מגיע אליי רק כשאתם בוחרים לשלוח הודעה או להתקשר.', [
        ('מי מפעיל את האתר', f'<p>האתר מופעל על ידי יוסק׳ה קליין, הדרכה והפקת טיולים ({TBD("שם משפטי מלא ומספר עוסק")}). טלפון: {TEL}. דוא״ל לפניות בנושא פרטיות: {TBD("כתובת דוא״ל")}.</p>'),
        ('מה האתר אוסף',
         '<p><strong>הטופס ״ספרו לי על היום״:</strong> השם, הטלפון והטקסט שאתם כותבים נשארים בדפדפן שלכם. הלחיצה על ״מכינים הודעה בוואטסאפ״ רק מציגה טיוטה. ההודעה נפתחת בוואטסאפ בלחיצה נפרדת, ומגיעה אליי רק אם אתם שולחים אותה משם.</p>'
         '<p><strong>השאלון ״איזה סיור מתאים לכם?״:</strong> התשובות נשמרות רק בזיכרון של הדף ונמחקות כשסוגרים אותו. אם תבחרו לשלוח אותן, הן ייפתחו כהודעת וואטסאפ באותו אופן.</p>'
         '<p><strong>שיחה, וואטסאפ או פייסבוק:</strong> כשאתם פונים אליי ישירות, אני מקבל את מה שאתם שולחים, למשל שם, מספר טלפון, מספר משתתפים, גילים, צרכים מיוחדים ומועד מבוקש.</p>'),
        ('עוגיות ומעקב', '<p>האתר לא משתמש בעוגיות (Cookies), באחסון מקומי בדפדפן, בכלי ניתוח תנועה, בפיקסלים של רשתות חברתיות או בפרסום. הגופנים, התמונות והקוד נטענים מהאתר עצמו ולא משירותים חיצוניים. אם יתווסף כלי כזה, המדיניות תעודכן, וכלים שאינם חיוניים לא ייטענו לפני שתאשרו.</p>'),
        ('מידע טכני', f'<p>כמו בכל אתר, שרת האחסון עשוי לרשום פרטים טכניים על בקשות לדפים: כתובת IP, סוג דפדפן, הדף שנטען ושעה. ספק האחסון ותקופת השמירה של הרישום: {TBD("ספק האחסון ומדיניות היומנים שלו")}.</p>'),
        ('למה משמש המידע', '<p>כדי לחזור אליכם, לענות על שאלות ולתכנן ולתאם את הסיור או היום שביקשתם. אני לא מוכר את המידע ולא מעביר אותו לאחרים לצורכי פרסום. לא אשלח לכם דברי פרסומת בלי הסכמה מפורשת ונפרדת, ותמיד אפשר לבקש להפסיק.</p>'),
        ('שירותים של אחרים', '<p>וואטסאפ ופייסבוק הם שירותים של חברת Meta. הודעה שנשלחת דרכם כפופה גם למדיניות הפרטיות שלהם. הקישורים לאתר ברזילאו, לוויקימדיה ולפייסבוק מובילים לאתרים אחרים, עם מדיניות משלהם.</p>'),
        ('כמה זמן נשמר המידע', f'<p>{TBD("כמה זמן נשמרות פניות והתכתבויות, ומתי הן נמחקות")}.</p>'),
        ('הזכויות שלכם', f'<p>לפי חוק הגנת הפרטיות, התשמ״א-1981, אפשר לבקש לעיין במידע שנשמר עליכם ולבקש לתקן או למחוק אותו. פנו בטלפון {TEL} או בדוא״ל {TBD("כתובת דוא״ל")}.</p>'),
        ('צילומים באתר', '<p>באתר מופיעים צילומים מסיורים, ובחלקם משתתפים. מי שמזהה את עצמו ומבקש להסיר צילום, מוזמן לפנות, והצילום יוסר.</p>'),
        ('ילדים', '<p>הטופס מיועד למבוגרים שמתאמים סיור. ילדים לא צריכים למלא אותו.</p>'),
        ('שינויים', '<p>המדיניות תתעדכן אם האתר ישתנה. תאריך העדכון האחרון מופיע בראש הדף.</p>'),
    ])


def terms():
    return legal_page('terms.html', 'תקנון ותנאי שימוש', 'תנאי השימוש באתר של יוסק׳ה קליין.',
        'האתר מציג מידע על סיורים בחיפה, על ימים לקבוצות ועל מסעות בדרום אמריקה דרך ברזילאו. הזמנה ותיאום נעשים בשיחה, ולא דרך האתר.', [
        ('מפעיל האתר', f'<p>יוסק׳ה קליין, הדרכה והפקת טיולים ({TBD("שם משפטי מלא ומספר עוסק")}). כתובת למשלוח דואר: {TBD("כתובת")}. טלפון: {TEL}.</p>'),
        ('המידע על הסיורים', '<p>תיאורי המסלולים, התחנות והמשכים באתר הם מידע כללי. המסלול, המשך, המחיר והמועד נקבעים בתיאום לפני כל סיור, ויכולים להשתנות לפי הקבוצה, מזג האוויר, אירועים בעיר וגישה למקומות. אין באתר הצעת מחיר או התחייבות למועד.</p>'),
        ('הזמנה, תשלום וביטול', f'<p>האתר לא מקבל הזמנות או תשלומים. את הפרטים (מחיר, מה כלול, תנאי תשלום ותנאי ביטול) תקבלו לפני שסוגרים. תנאי הביטול: {TBD("מדיניות ביטול ושינוי לסיורים ולימי קבוצה, בהתאם לחוק הגנת הצרכן, התשמ״א-1981, ולתקנות הביטול")}. אין בתקנון הזה כדי לגרוע מזכויות שהחוק נותן לצרכנים.</p>'),
        ('השתתפות בסיור', f'<p>חלק מהמסלולים כוללים עליות, מדרגות והליכה ממושכת. כדאי לספר מראש על מגבלות הליכה, צרכי נגישות או גילאי ילדים, כדי לבדוק התאמה. ביטוח והוראות בטיחות: {TBD("האם יש ביטוח ומה נדרש מהמשתתפים")}.</p>'),
        ('מסעות בדרום אמריקה', '<p>המסעות המאורגנים בדרום אמריקה מופעלים על ידי ברזילאו. ההזמנה, התשלום ותנאי ההתקשרות למסעות האלה נעשים מול ברזילאו ולפי התנאים שבאתר שלה.</p>'),
        ('תוכן וזכויות', '<p>הטקסטים והצילומים באתר שייכים ליוסק׳ה קליין, למעט צילומים שמצוין לידם מקור אחר (הגנים הבהאיים ומפלי איגואסו, לפי הרישיונות שבתחתית הדף). אין להעתיק או לפרסם אותם בלי רשות. הציטוטים מהמלצות לקוחים ממה שמטיילים פרסמו בעמוד הפייסבוק.</p>'),
        ('קישורים לאתרים אחרים', '<p>האתר מקשר לוואטסאפ, לפייסבוק, לברזילאו ולוויקימדיה. לאתרים האלה תנאים ומדיניות פרטיות משלהם.</p>'),
        ('דין וסמכות', f'<p>על התקנון חל הדין הישראלי. מקום השיפוט: {TBD("בית המשפט המוסמך")}.</p>'),
        ('שינויים ופנייה', f'<p>התקנון יכול להתעדכן. שאלות? {TEL} או <a href="{WA["general"]}" target="_blank" rel="noopener">וואטסאפ</a>.</p>'),
    ])


def accessibility():
    return legal_page('accessibility.html', 'הצהרת נגישות', 'הצהרת הנגישות של האתר של יוסק׳ה קליין.',
        'חשוב לי שכל מי שרוצה לטייל איתי יוכל להשתמש באתר. הדף הזה מתאר מה נעשה, מה עדיין לא נבדק, ואיך לפנות אם משהו לא עובד.', [
        ('רמת הנגישות', '<p>האתר נבנה במטרה לעמוד בתקן הישראלי ת״י 5568, המבוסס על הנחיות WCAG ברמה AA. בבדיקות שנעשו לא נמצאו הפרות בכלי הבדיקה האוטומטי axe-core, ובדיקות ידניות של מקלדת, ניגודיות ותנועה עברו. בדיקות כאלה אינן מבטיחות נגישות מלאה, ולכן חשוב לי לשמוע אם נתקלתם בבעיה.</p>'),
        ('מה נעשה באתר', '<ul class="legal__list"><li>מבנה סמנטי בעברית מימין לשמאל, עם כותרות לפי סדר, אזורי ניווט ותוכן מסומנים, וקישור ״דילוג לתוכן״.</li>'
            '<li>ניווט מלא במקלדת, עם סימון פוקוס בולט. הכפתור הצף לא מסתיר פריטים שהפוקוס עליהם.</li>'
            '<li>ניגודיות צבעים ברמת AA, כולל טקסט שמופיע מעל צילומים (נמדד על הפיקסלים בפועל).</li>'
            '<li>טקסט חלופי לצילומים בעלי משמעות; צילומים קישוטיים מוסתרים מקוראי מסך.</li>'
            '<li>טפסים עם תוויות, הודעות שגיאה ברורות, ובלי שליחה אוטומטית.</li>'
            '<li>כיבוד ההגדרה ״הפחתת תנועה״: אנימציות הגלילה מתבטלות וכל התוכן מוצג ברצף רגיל. התוכן זמין גם בלי JavaScript.</li>'
            '<li>התאמה לטלפון, לטאבלט ולמחשב, בלי גלילה לרוחב.</li></ul>'),
        ('מגבלות ידועות', '<ul class="legal__list"><li>בסצנת הגלילה בראש הדף, כרטיסי הסיורים מופיעים רק כשגוללים אליהם. כל הסיורים זמינים גם ברשימה ״הסיור הבא שלכם מתחיל כאן״, שאפשר להגיע אליה במקלדת.</li>'
            '<li>האתר עדיין לא נבדק עם קוראי מסך (NVDA, VoiceOver) ולא על ידי מורשה נגישות.</li>'
            '<li>וואטסאפ, פייסבוק ואתר ברזילאו הם אתרים חיצוניים, והנגישות שלהם באחריותם.</li></ul>'),
        ('נגישות בסיורים עצמם', '<p>בחיפה יש מדרגות, עליות ומדרכות צרות, וכל מסלול שונה. ספרו לי מראש על צרכי נגישות, ונבדוק יחד אם יש מסלול מתאים או התאמות אפשריות.</p>'),
        ('פנייה בנושא נגישות', f'<p>רכז/ת נגישות: {TBD("שם")}. טלפון: {TEL}. דוא״ל: {TBD("כתובת דוא״ל")}. כדאי לציין באיזה דף הייתה הבעיה ומה ניסיתם לעשות.</p>'),
        ('עדכון', f'<p>ההצהרה עודכנה ב-{LEGAL_UPDATED}, לאחר בדיקה של גרסת האתר מאותו יום.</p>'),
    ])


if __name__ == '__main__':
    built = [home(), tours_index()] + [tour_page(t) for t in TOURS if t.get('blurb')] + [groups(), gallery(), not_found(), privacy(), terms(), accessibility()]
    print('built:', ', '.join(built))
