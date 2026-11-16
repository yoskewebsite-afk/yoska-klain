"""Site build, 16.11.2026: restructured to the client's implementation spec and final copy document.
It imports the v4 generator (shell, legal pages, quiz, gallery, admin, assets) and replaces the homepage, navigation, tour pages and
audience pages. Run from the project root:  python3 tools/build_site_v5.py
Spec decisions applied: no map, no value-pills section, no arch frames, no invented statistics (no 2016 / "5 tours" / "100% recommend"),
one external button (upcoming tours -> sales page), South America as an internal page, six tours + a separate families product."""
import importlib.util
import os
import re
import sys
from html import escape
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_v4 as v   # noqa: E402

base, SRC, ROOT = v.base, v.SRC, v.ROOT
spec = importlib.util.spec_from_file_location('v5copy', SRC / 'v5/copy.py'); C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)
spec = importlib.util.spec_from_file_location('objects', SRC / 'v4/objects.py'); OB = importlib.util.module_from_spec(spec); spec.loader.exec_module(OB)

WA, PHONE_INTL, PHONE_HUMAN, EMAIL = base.WA, v.PHONE_INTL, v.PHONE_HUMAN, v.EMAIL
SALES = v.TAKBULL            # external sales page: the only external registration/payment path
SA_URL = '/south-america.html'
hide_ext = '<span class="visually-hidden"> (קישור חיצוני, נפתח בלשונית חדשה)</span>'


def wa(text):
    return f'https://wa.me/{PHONE_INTL}?text={quote(text)}'


WA_TEXT = {'general': wa('היי יוסק׳ה, הגענו דרך האתר ונשמח לבדוק איזה סיור או יום יכול להתאים לנו.'),
           'orgs': wa('היי יוסק׳ה, הגענו דרך עמוד הארגונים ונשמח לדבר על יום לצוות שלנו.'),
           'families': wa('היי יוסק׳ה, הגענו דרך עמוד המשפחות ונשמח לבדוק איזו פעילות מתאימה לנו.'),
           'private': wa('היי יוסק׳ה, הגענו דרך עמוד הקבוצות הפרטיות ונשמח לתכנן טיול פרטי.')}


def wa_tour(name):
    return wa(f'היי יוסק׳ה, נשמח לבדוק מועד ופרטים עבור הסיור ״{name}״.')


def ext_btn(label, href, cls, track, frm=''):
    return (f'<a class="btn {cls}" href="{href}" target="_blank" rel="noopener" data-track="{track}" data-track-from="{frm}">{label}'
            f'<svg aria-hidden="true"><use href="#i-out"/></svg>{hide_ext}</a>')


# ------------------------------------------------------------------ data: tours
sodot = next(t for t in base.TOURS if t['slug'] == 'sodot-veremazim')
TOURS = []
for t in C.TOURS:
    d = dict(t)
    d['photo_name'], d['pos'] = t['photo']
    d['blurb'] = t['card'][0]
    d['place'] = t['card_title']
    d['duration'] = t.get('duration') or ''
    d['stops'] = []
    d['featured'] = True
    TOURS.append(d)
TOURS.append(dict(sodot, hidden=True, name='סודות ורמזים בחיפה'))     # kept only for the quiz; its page redirects to the families page
v.TOURS[:] = TOURS
v.FEATURED[:] = [t for t in TOURS if not t.get('hidden')]
v.PROCESS[:] = C.PROCESS
SHOWN = [t for t in TOURS if not t.get('hidden')]

# a new interest kind for private groups
v.KIND_OPTIONS[:] = [('tour', 'סיור בחיפה'), ('org', 'יום לצוות או לארגון'), ('family', 'פעילות למשפחה'), ('private', 'טיול פרטי לקבוצה'), ('general', 'עוד לא בטוח, רוצים לשמוע')]


# ------------------------------------------------------------------ shell: navigation, footer
NAV = [('/', 'בית', 'home'), ('/tours/', 'סיורים בחיפה', 'tours'), ('/orgs.html', 'ארגונים וחברות', 'orgs'), ('/families.html', 'משפחות', 'families'),
       (SA_URL, 'דרום אמריקה', 'sa'), ('/about.html', 'אודות', 'about'), ('/gallery.html', 'גלריה', 'gallery'), ('/contact.html', 'יצירת קשר', 'contact')]


def header(current, home):
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if k == current else ""}>{l}</a>' for h, l, k in NAV)
    extra = '<a href="/quiz.html">איזה סיור מתאים לנו?</a><a href="/private-groups.html">קבוצות פרטיות</a>'
    return f'''<header class="top{' top--home' if home else ''}" data-top>
    <a class="top__logo" href="/" aria-label="יוסק׳ה, לדף הבית">{v.LOGO}</a>
    <nav class="top__pill" aria-label="ניווט ראשי">{links}</nav>
    <div class="top__icons">
      <a class="btn btn--sun btn--sm top__quiz" href="{WA_TEXT['general']}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-from="header">דברו עם יוסק׳ה{hide_ext}</a>
      <a class="roundbtn" href="tel:+{PHONE_INTL}" aria-label="להתקשר: {PHONE_HUMAN}" data-track="phone_click"><svg aria-hidden="true"><use href="#i-phone"/></svg></a>
    </div>
    <button class="top__menu roundbtn" type="button" aria-expanded="false" aria-controls="menu" data-menu-btn><svg aria-hidden="true"><use href="#i-menu"/></svg><span class="visually-hidden">תפריט</span></button>
  </header>
  <div class="menu" id="menu" hidden data-menu>
    <nav aria-label="תפריט">{links}{extra}</nav>
    <p class="menu__contact"><a href="tel:+{PHONE_INTL}" dir="ltr">{PHONE_HUMAN}</a><a href="{WA_TEXT['general']}" target="_blank" rel="noopener">וואטסאפ</a><a href="{base.FB_PAGE}" target="_blank" rel="noopener">פייסבוק</a></p>
  </div>'''


v.header = header
v.NAV[:] = [(h, l, k, False) for h, l, k in NAV]
v.RAIL[:] = [('top', 'culture', 'פתיחה'), ('about', 'person', 'יוסק׳ה'), ('tours', 'route', 'הסיורים'), ('upcoming', 'calendar', 'סיורים קרובים'), ('services', 'group', 'שירותים'),
             ('abroad', 'globe', 'דרום אמריקה'), ('process', 'pin', 'איך זה עובד'), ('reviews', 'heart', 'המלצות'), ('quiz', 'nature', 'שאלון'), ('faq', 'question', 'שאלות'),
             ('contact', 'mobile', 'יצירת קשר')]
v.TABBAR[:] = ['about', 'tours', 'services', 'abroad', 'contact']

_old_site_links = re.search(r'<a href="/tours/">הסיורים בחיפה</a>.*?<a href="/contact.html">יצירת קשר</a>', v.FOOTER, re.S)
assert _old_site_links, 'footer links not found'
v.FOOTER = v.FOOTER.replace(_old_site_links.group(0),
    '<a href="/tours/">הסיורים בחיפה</a><a href="/orgs.html">ארגונים וחברות</a><a href="/families.html">משפחות</a><a href="/private-groups.html">קבוצות פרטיות</a>'
    f'<a href="{SA_URL}">דרום אמריקה</a><a href="/about.html">אודות יוסק׳ה</a><a href="/gallery.html">גלריה</a><a href="/contact.html">יצירת קשר</a>')
v.FOOTER = re.sub(r'<a href="https://www\.brazilao\.com/organized-tours"[^>]*>.*?</a>', '', v.FOOTER, flags=re.S)


# ------------------------------------------------------------------ small building blocks
def lead_form(uid, kind='tour', tour_slug='', submit='שליחה', msg_label='משהו נוסף שכדאי לדעת', interest=False, extras=(), note=None):
    """A real lead form (saved in the CRM). extras: (name, label, type, placeholder) fields that are added to the message under their label."""
    opts = ''.join(f'<option value="{k}"{" selected" if k == kind else ""}>{l}</option>' for k, l in v.KIND_OPTIONS)
    kind_field = (f'<div class="field"><label for="{uid}-kind">במה מתעניינים?</label><select id="{uid}-kind" name="kind">{opts}</select></div>' if interest
                  else f'<input type="hidden" name="kind" value="{kind}">')
    ex = ''.join(f'<div class="field"><label for="{uid}-{n}">{l}</label><input id="{uid}-{n}" name="x_{n}" data-msg="{l}" type="{ty}" autocomplete="off" maxlength="120"></div>' for n, l, ty in extras)
    note = note or 'הפרטים משמשים רק כדי לחזור אליכם ולבדוק התאמה.'
    return f'''<form class="cform" data-lead novalidate aria-describedby="{uid}-note">
            <p class="cform__context" data-lead-context hidden></p>
            <div class="cform__row">
              <div class="field"><label for="{uid}-name">שם</label><input id="{uid}-name" name="name" autocomplete="name" required maxlength="80" aria-describedby="{uid}-name-err"><p class="field__err" id="{uid}-name-err" data-err="name" hidden></p></div>
              <div class="field"><label for="{uid}-phone">טלפון</label><input id="{uid}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required maxlength="20" aria-describedby="{uid}-phone-err"><p class="field__err" id="{uid}-phone-err" data-err="phone" hidden></p></div>
              {kind_field}{ex}
              <div class="field field--wide"><label for="{uid}-msg">{msg_label} <span class="opt">(לא חובה)</span></label><textarea id="{uid}-msg" name="message" rows="2" maxlength="1200"></textarea></div>
              <input type="hidden" name="tour_slug" value="{tour_slug}"><input type="hidden" name="date_id" value="">
              <div class="hp" aria-hidden="true"><label for="{uid}-web">אתר</label><input id="{uid}-web" name="website" tabindex="-1" autocomplete="off"></div>
              <button class="btn btn--sun cform__go" type="submit">{submit}</button>
            </div>
            <p class="note" id="{uid}-note">{note} <a class="textlink" href="/privacy.html#leads">מדיניות הפרטיות</a></p>
            <div class="form__bad" data-lead-bad hidden tabindex="-1" role="alert"><p data-bad-text></p><div class="btnrow"><button class="btn btn--ink btn--sm" type="submit">לנסות שוב</button><a class="btn btn--line btn--sm" href="{WA_TEXT['general']}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-from="form-error">לכתוב ליוסק׳ה בוואטסאפ{hide_ext}</a></div></div>
          </form>
          <div class="form__ok" data-lead-ok hidden tabindex="-1" role="status">
            <svg class="bicon" aria-hidden="true"><use href="#b-mobile"/></svg>
            <p><strong>הפרטים הגיעו ליוסק׳ה.</strong> הוא יחזור אליכם כדי להבין מי מגיע ומה יכול להתאים.</p>
            <button type="button" class="btn btn--line btn--sm" data-lead-again>לשלוח פנייה נוספת</button>
          </div>'''


def lead_card(uid, kind, h_light, h_bold, text, submit, msg_label, wa_key='general', extras=(), interest=False, tour_slug='', wa_link=None, sid='lead'):
    link = wa_link or WA_TEXT[wa_key]
    return f'''    <section class="wrap tourlead" id="{sid}" aria-labelledby="{uid}-t">
      <div class="contact__card">
        <div class="contact__head">
          <h2 class="duo-title" id="{uid}-t"><span class="duo-title__light">{h_light}</span> <span class="duo-title__bold">{h_bold}</span></h2>
          <p>{text}</p>
          <ul class="contact__lines"><li><a href="{link}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-from="{uid}"><svg aria-hidden="true"><use href="#i-chat"/></svg><span>מעדיפים WhatsApp? כתבו ליוסק׳ה</span>{hide_ext}</a></li></ul>
        </div>
        {lead_form(uid, kind, tour_slug, submit, msg_label, interest, extras)}
      </div>
    </section>'''


def prose(title_light, title_bold, paras, items=None, cls=''):
    ps = ''.join(f'<p>{p}</p>' for p in paras)
    ul = ('<ul class="checks">' + ''.join(f'<li>{v.bicon("pin")}<span>{i}</span></li>' for i in items) + '</ul>') if items else ''
    return f'''    <section class="wrap prose {cls}">
      {v.duo(title_light, title_bold, 'h2') if title_light or title_bold else ''}
      <div class="prose__body">{ps}{ul}</div>
    </section>'''


def faq_section(items, light, bold, uid='faq', aside=''):
    ds = ''.join(f'<details{" open" if i == 0 else ""}><summary>{q}<i aria-hidden="true"></i></summary><p>{a}</p></details>' for i, (q, a) in enumerate(items))
    return f'''    <section class="faq" id="{uid}" aria-labelledby="{uid}-t">
      <div class="wrap faq__in">
        <div><h2 class="duo-title" id="{uid}-t"><span class="duo-title__light">{light}</span> <span class="duo-title__bold">{bold}</span></h2>{aside}</div>
        <div class="faq__list">{ds}</div>
      </div>
    </section>'''


def tour_card(t):
    p, pos = t['photo']
    fit = f'<p class="tc2__fit"><b>מתאים במיוחד ל:</b> {t["fit"]}</p>' if t.get('fit') else ''
    dur = f'<p class="tc2__dur">{v.bicon("clock", "orange")}<span>משך משוער: {t["duration"]}</span></p>' if t.get('duration') else ''
    paras = ''.join(f'<p>{x}</p>' for x in (t['card'][:1] if True else t['card']))
    return f'''<li class="tc2"><a class="tc2__img" href="/tours/{t['slug']}.html" tabindex="-1" aria-hidden="true">{v.photo(p, '', '(min-width: 1000px) 26vw, (min-width: 600px) 44vw, 92vw', 'low', pos)}</a>
            <div class="tc2__body"><h3 class="tc2__name"><a href="/tours/{t['slug']}.html">{t['name']}</a></h3><p class="tc2__benefit">{t['card_title']}</p>{paras}{fit}{dur}
              <a class="btn btn--ink btn--sm" href="/tours/{t['slug']}.html" data-track="home_tour_card_open">{t['btn']}</a></div></li>'''


def objects_for(body, mapping):
    for sid, markup in mapping.items():
        m = re.search(rf'<section [^>]*id="{sid}"[^>]*>\n', body)
        if m:
            body = body[:m.end()] + markup + body[m.end():]
    return body


CAMERA_FLY = OB.obj('camera', OB.CAMERA_IMG, y=0, r=0, travel='camera')
CABLE = ('      <svg class="cable" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M-20 18L1460 112"/></svg>\n' + OB.obj('cabin', OB.CABIN, y=0, r=0, travel='cable'))
PLANE = ('      <svg class="trailline" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-trail d="M1460 340C1180 320 1020 160 760 170S360 60 -20 30"/></svg>\n' + OB.obj('plane', OB.PLANE_IMG, y=0, r=0, travel='plane'))


# ------------------------------------------------------------------ homepage
def hero():
    h = (SRC / 'v4/hero-a.html').read_text()
    h = re.sub(r'<h1 class="hero__title" id="hero-title">.*?</h1>', '<h1 class="hero__title" id="hero-title"><span class="hero__l1">תפסיקו לשבור את הראש</span> <span class="hero__l2">על הטיול הבא</span></h1>', h, flags=re.S)
    h = re.sub(r'<p class="hero__sub">.*?</p>', '<p class="hero__sub">סיורים בחיפה וימי גיבוש לארגונים, לצוותים, למשפחות ולקבוצות. עם תוכן מעניין, תכנון מסודר ויוסק׳ה אחד שיודע להחזיק את היום.</p>', h, flags=re.S)
    h = re.sub(r'<a class="btn btn--ink hero__cta".*?</a>', ext_btn('לסיורים הקרובים', SALES, 'btn--ink hero__cta" data-hero-cta data-x="1', 'hero_upcoming_tours_click', 'hero'), h, flags=re.S)
    return h


def reviews():
    shots = (SRC / 'v4/review-shots.html').read_text(encoding='utf-8').splitlines(keepends=True)
    lead, more = [l for l in shots if 'data-lead-shot' in l], [l for l in shots if 'data-lead-shot' not in l]
    return f'''    <section class="rwall" id="reviews" aria-labelledby="reviews-title" data-rwall>
      <div class="rwall__stage" data-rwall-stage>
        <div class="rwall__head">
          <h2 class="rwall__title" id="reviews-title">מה החברים לדרך <span class="hl hl--sun">מספרים</span></h2>
          <p class="rwall__src">מטיילים, משפחות וצוותים כבר כתבו. חבל שרק יוסק׳ה יראה.</p>
        </div>
        <ul class="rwall__grid" data-rwall-grid aria-label="ביקורות של מטיילים. כל אחת נפתחת בגודל מלא">
{''.join(lead)}        </ul>
      </div>
    </section>
    <section class="rwall-more" aria-label="ביקורות נוספות">
      <div class="wrap rwall__more">
        <button type="button" class="btn btn--line" aria-expanded="false" aria-controls="reviews-more" data-more-reviews>לעוד {len(more)} ביקורות</button>
        <ul class="rwall__extra" id="reviews-more" hidden aria-label="ביקורות נוספות">
{''.join(more)}        </ul>
      </div>
    </section>'''


def home_body():
    about = f'''    <section class="ab3" id="about" aria-labelledby="about-title">
      <div class="wrap ab3__in">
        <figure class="ab3__photo frame" data-reveal>{v.photo('lookout', 'יוסק׳ה קליין מסביר לקבוצה בתצפית, מפרץ חיפה והנמל מאחוריו', '(min-width: 900px) 34vw, 90vw', '', '45% 50%')}</figure>
        <div class="ab3__copy">
          <h2 class="duo-title" id="about-title"><span class="duo-title__light">נעים להכיר,</span> <span class="duo-title__bold">יוסק׳ה <span class="hl">קליין</span></span></h2>
          {''.join(f'<p class="ab3__p ab3__p--{i}">{p}</p>' for i, p in enumerate(C.ABOUT_HOME))}
          <a class="btn btn--ink" href="/about.html">להכיר את יוסק׳ה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
      <ul class="wrap benefits" aria-label="מה מקבלים בסיור">
        {''.join(f'<li class="benefit"><svg class="bicon" aria-hidden="true"><use href="#b-{ic}"/></svg><h3>{h}</h3><p>{p}</p></li>' for ic, h, p in C.BENEFITS)}
      </ul>
    </section>'''
    tours = f'''    <section class="tours2" id="tours" aria-labelledby="tours-title">
      <div class="wrap">
        <div class="sec-head">
          <h2 class="duo-title" id="tours-title"><span class="duo-title__light">הסיורים של יוסק׳ה</span> <span class="duo-title__bold">בחיפה</span></h2>
        </div>
        <p class="sec-sub">יש ימים שרוצים לראות את התמונה הגדולה, ויש ימים שבא להיכנס לרחובות, לטעמים ולסיפורים הקטנים. בחרו את חיפה שמתאימה ליום שלכם.</p>
        <ul class="tgrid">{''.join(tour_card(t) for t in SHOWN)}</ul>
        <div class="btnrow tours2__more"><a class="btn btn--ink" href="/tours/" data-track="home_all_tours_click">לכל הסיורים בחיפה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a></div>
      </div>
    </section>'''
    upcoming = f'''    <section class="upsec2" id="upcoming" aria-labelledby="up-title">
      <div class="wrap upsec2__in">
        <div><h2 class="duo-title" id="up-title"><span class="duo-title__light">רוצים להצטרף לסיור</span> <span class="duo-title__bold">הסיורים <span class="hl hl--sun-dark">הקרובים</span></span></h2></div>
        <div class="upsec2__copy"><p>רוצים להצטרף לסיור בלי לארגן קבוצה משלכם? בעמוד הסיורים הקרובים מחכים המועדים הפתוחים, כל הפרטים ואפשרות להזמין מקום ולשלם.</p>
          {ext_btn('למועדים, הרשמה ותשלום', SALES, 'btn--sun', 'upcoming_sales_page_click', 'home')}</div>
      </div>
    </section>'''
    svc = [('building', 'orgs', 'ארגונים וצוותים', 'יום גיבוש שגם התוכן בו מחזיק את הקבוצה',
            'יום מחוץ למשרד צריך לעבוד בשביל מי שרצו פעילות, בשביל מי שרצו אוכל, וגם בשביל מי שבאו כי היה כתוב ביומן. יוסק׳ה מחבר בין סיור, תוכן ואפשרויות נוספות ליום אחד שיש לו קצב והיגיון, ולא לרשימת פעילויות שנפגשו במקרה.', '/orgs.html', 'לתכנון יום לצוות', 'heart-wide'),
           ('family', 'families', 'משפחות', 'פעילות משפחתית שגם הילדים באמת משתתפים בה',
            'לא גוררים את הילדים מאחורי מדריך ומקווים לטוב. ב״סודות ורמזים בחיפה״ הם מקבלים חידות, משימות ורמזים שמכניסים אותם לתוך הסיפור, והמבוגרים מגלים יחד איתם את העיר מזווית אחרת.', '/families.html', 'לפעילויות למשפחות', 'lookout-kids'),
           ('private', 'private', 'קבוצות פרטיות', 'יש קבוצה. עכשיו צריך להפוך אותה ליום מוצלח.',
            'חברים, קהילה, אורחים או אירוע פרטי. אפשר לבחור סיור קיים או לדבר עם יוסק׳ה על יום שמתאים לזמן, להרכב ולמה שמעניין אתכם. לא צריך להגיע עם מסלול מוכן.', '/private-groups.html', 'לתכנון טיול פרטי', 'stairs-group')]
    cards = ''.join(f'<li class="svc svc--{k}"><div class="svc__img">{v.photo(ph, "", "(min-width: 900px) 30vw, 92vw", "low")}</div><div class="svc__body"><p class="kicker">{v.bicon("group" if i != 1 else "person")}{name}</p><h3>{h}</h3><p>{txt}</p><a class="btn btn--ink btn--sm" href="{href}" data-track="{k}_contact_click">{btn}</a></div></li>'
                    for i, (_, k, name, h, txt, href, btn, ph) in enumerate(svc))
    services = f'''    <section class="services" id="services" aria-labelledby="svc-title">
      <div class="wrap">
        <div class="sec-head"><h2 class="duo-title" id="svc-title"><span class="duo-title__light">טיול פרטי, יום גיבוש</span> <span class="duo-title__bold">או אירוע <span class="hl hl--teal">משפחתי</span></span></h2></div>
        <p class="sec-sub">קבוצה מהעבודה, משפחה, חברים או אירוע שאתם רוצים לציין בדרך קצת אחרת. לכל אחד יש סיבה אחרת לצאת, ולכן גם היום עצמו לא צריך להיראות אותו דבר.</p>
        <ul class="svcgrid">{cards}</ul>
      </div>
    </section>'''
    abroad = f'''    <section class="sa" id="abroad" aria-labelledby="abroad-title">
      <div class="wrap sa__in">
        <figure class="sa__photo frame">{v.photo('rio', 'יוסק׳ה פורש ידיים מתחת לפסל ישו הגואל בריו דה ז׳ניירו', '(min-width: 900px) 34vw, 90vw', 'low', '50% 38%')}</figure>
        <div class="sa__copy">
          <h2 class="duo-title" id="abroad-title"><span class="duo-title__light">חיפה במרכז, ולא רק היא</span> <span class="duo-title__bold">יוסק׳ה בדרום <span class="hl hl--teal">אמריקה</span></span></h2>
          <p>חיפה נמצאת במרכז האתר, אבל היא לא המקום היחיד שבו יוסק׳ה מדריך. לעיתים הוא מדריך קבוצות ישראליות במסעות המאורגנים של ברזילאו בדרום אמריקה, ומביא גם לשם את אותה סקרנות לאנשים, לתרבות ולסיפורים שמאחורי הנוף.</p>
          <p>בעמוד המלא תוכלו להכיר את ברזיל, ארגנטינה, צ׳ילה, פרו ואקוודור, להבין מה מאפיין כל יעד ולראות באילו מסעות יוסק׳ה מדריך. ההרשמה, המסלולים והתפעול נעשים דרך ברזילאו.</p>
          <a class="btn btn--ink" href="{SA_URL}" data-track="sa_page_click">למסעות בדרום אמריקה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
    </section>'''
    process = f'''    <section class="process" id="process" aria-labelledby="proc-title">
      <div class="process__bg" aria-hidden="true">{v.photo('lookout-group-bay', '', '100vw', 'low', '50% 60%')}</div>
      <div class="wrap process__in">
        <h2 class="duo-title duo-title--on-ink" id="proc-title"><span class="duo-title__light">איך זה</span> <span class="duo-title__bold">עובד <span class="hl hl--sun">בפועל</span></span></h2>
        <div class="process__rows">{v.process_rows()}</div>
        <a class="btn btn--sun" href="#contact" data-track="cta_process">מתחילים בשיחה</a>
      </div>
    </section>'''
    quiz = f'''    <section class="quizsec" id="quiz" aria-labelledby="quiz-t">
      <div class="wrap quizsec__in">
        <div><h2 class="duo-title" id="quiz-t"><span class="duo-title__light">עונים על כמה שאלות,</span> <span class="duo-title__bold">איזה סיור בחיפה <span class="hl">מתאים לכם?</span></span></h2></div>
        <div class="quizsec__copy"><p>עונים על כמה שאלות קצרות על האנשים, הקצב ומה שעושה לכם טוב בטיול. בסוף תקבלו את הסיור שהכי מתאים לתשובות שלכם וקישור לעמוד המלא שלו.</p>
          <a class="btn btn--sun" href="/quiz.html" data-track="quiz_entry" data-track-from="home">מתחילים<svg aria-hidden="true"><use href="#i-arrow"/></svg></a></div>
      </div>
    </section>'''
    faq = faq_section(C.FAQ, 'רגע,', 'ומה לגבי<span class="hl">...?</span>', aside='<p class="faq__aside">לא מצאתם תשובה? <a class="textlink" href="#contact">כתבו ליוסק׳ה</a>.</p>')
    contact = f'''    <section class="contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        <div class="contact__card">
          <div class="contact__head">
            <h2 class="duo-title" id="contact-title"><span class="duo-title__light">רוצים שיוסק׳ה יחזור אליכם</span> <span class="duo-title__bold">עם כיוון <span class="hl">מתאים?</span></span></h2>
            <p>ספרו בקצרה מי מגיע ומה אתם מחפשים. יוסק׳ה יחזור אליכם, ישאל את מה שצריך ויעזור להבין איזה סיור או יום יכול להתאים.</p>
            <ul class="contact__lines">
              <li><a href="{WA_TEXT['general']}" target="_blank" rel="noopener" data-track="whatsapp_click"><svg aria-hidden="true"><use href="#i-chat"/></svg><span>מעדיפים WhatsApp? כתבו ליוסק׳ה</span>{hide_ext}</a></li>
              <li><a href="tel:+{PHONE_INTL}" data-track="phone_click"><svg aria-hidden="true"><use href="#i-phone"/></svg><span dir="ltr">{PHONE_HUMAN}</span></a></li>
              <li><a href="mailto:{EMAIL}"><svg aria-hidden="true"><use href="#i-mail"/></svg><span dir="ltr">{EMAIL}</span></a></li>
            </ul>
          </div>
          {lead_form('c', 'tour', '', 'אני רוצה שיוסק׳ה יחזור אליי', 'משהו נוסף שכדאי לדעת', True, (('people', 'כמה משתתפים בערך?', 'text'), ('dates', 'תאריך או טווח תאריכים', 'text')))}
        </div>
      </div>
    </section>'''
    body = '\n'.join([hero(), about, tours, upcoming, services, abroad, process, reviews(), quiz, faq, contact])
    return objects_for(body, {'tours': CAMERA_FLY, 'services': CABLE, 'abroad': PLANE})


def home():
    pre = '<link rel="preload" as="image" href="/assets/v4/hero-wide-1440.webp" media="(min-width: 700px)" fetchpriority="high">'
    return v.page('index.html', 'יוסק׳ה | טיולים, חברה, תרבות. סיורים בחיפה',
                  'סיורים בחיפה וימי גיבוש לארגונים, לצוותים, למשפחות ולקבוצות. עם תוכן מעניין, תכנון מסודר ויוסק׳ה אחד שיודע להחזיק את היום.',
                  home_body(), current='home', body_class='home', preload=pre)


# ------------------------------------------------------------------ tours
def tours_index():
    rows = ''.join(f'<tr><th scope="row"><a href="/tours/{t["slug"]}.html">{t["name"]}</a></th><td>{t["card_title"]}</td><td>{t["duration"] or "נקבע מול יוסק׳ה"}</td><td>{t.get("fit") or "מי שאוהבים אוכל טוב וסיפור טוב"}</td></tr>' for t in SHOWN)
    body = v.phead('אפשר להתחיל מהכרמל ולרדת עד הנמל.', 'איזו חיפה בא לכם <span class="hl">להכיר?</span>',
                   'אפשר להתחיל מהכרמל ולרדת עד הנמל, להישאר בחלק העליון, להיכנס לרחובות של העיר התחתית או להכיר את חיפה דרך האוכל. כל סיור פותח חלק אחר של העיר, אבל כולם מחברים בין המקום לבין האנשים, החברה והתרבות שמאחוריו.',
                   'lookout-dusk', 'אנשים על מרפסת תצפית מול העיר, הנמל והמפרץ לקראת ערב', '50% 55%') + f'''
    <section class="wrap prose"><div class="prose__body"><p>בחרו לפי הזמן שיש לכם ולפי מה שמסקרן אתכם. אם עדיין לא ברור, שאלון ההתאמה או שיחה קצרה עם יוסק׳ה יעשו סדר.</p></div></section>
    <section class="wrap" aria-labelledby="tl-title">
      <h2 class="duo-title" id="tl-title"><span class="duo-title__light">הכרטיסים מציגים את ההבדל בין האפשרויות.</span> <span class="duo-title__bold">הסיורים <span class="hl">בחיפה</span></span></h2>
      <p class="sec-sub">בעמוד של כל סיור מחכים המסלול, הנושאים, משך ההליכה וכל מה שכדאי לדעת לפני שסוגרים.</p>
      <ul class="tgrid">{''.join(tour_card(t) for t in SHOWN)}</ul>
    </section>
    <section class="wrap cmp" aria-labelledby="cmp-t"><h2 class="h-card" id="cmp-t">השוואה קצרה</h2>
      <div class="cmp__scroll" tabindex="0" role="region" aria-label="טבלת השוואה בין הסיורים, אפשר לגלול לצדדים"><table><thead><tr><th>סיור</th><th>סוג החוויה</th><th>משך</th><th>מתאים במיוחד</th></tr></thead><tbody>{rows}</tbody></table></div>
    </section>
{v.quiz_band('tours-index')}
    <section class="wrap ctaband">
      <h2 class="duo-title duo-title--center"><span class="duo-title__light">לא בטוחים מה מתאים?</span> <span class="duo-title__bold">ספרו ליוסק׳ה <span class="hl">מי מגיע</span></span></h2>
      <p class="phead__lede">ספרו ליוסק׳ה מי מגיע, כמה זמן יש ומה בדרך כלל גורם לקבוצה שלכם ליהנות.</p>
      <a class="btn btn--sun" href="/contact.html" data-track="tours_ask_click">יוסק׳ה, מה מתאים לנו?<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </section>'''
    return v.page('tours/index.html', 'הסיורים בחיפה | יוסק׳ה', 'איזו חיפה בא לכם להכיר? סיורים בחיפה עם יוסק׳ה קליין, מהכרמל ועד הנמל, העיר התחתית והאוכל.', body, current='tours')


def tour_page(t):
    name = t['name']
    p, pos = t['photo']
    paras = ''.join(f'<p>{x}</p>' for x in t['intro'])
    facts = ''.join(f'<li>{v.bicon(ic, "orange" if ic == "clock" else "teal")}<div><p class="facts__k">{k}</p><p class="facts__v">{val}</p></div></li>' for ic, k, val in t['facts'])
    facts_html = f'<ul class="facts" aria-label="מידע מהיר">{facts}</ul>' if facts else ''
    meet = ''
    if t.get('meet'):
        meet = f'''    <section class="wrap prose"><h2 class="duo-title"><span class="duo-title__light">{t['meet_title']}</span> <span class="duo-title__bold">בדרך</span></h2><div class="prose__body">{''.join(f'<p>{x}</p>' for x in t['meet'])}</div></section>''' if t['meet_title'] != 'מה פוגשים בדרך' else \
               f'''    <section class="wrap prose"><h2 class="duo-title"><span class="duo-title__light">מה פוגשים</span> <span class="duo-title__bold">בדרך</span></h2><div class="prose__body">{''.join(f'<p>{x}</p>' for x in t['meet'])}</div></section>'''
    cols = ''
    if t.get('forwhom') or t.get('useful'):
        fw = ('<div><h2 class="h-card">למי הסיור מתאים</h2><ul class="checks">' + ''.join(f'<li>{v.bicon("group")}<span>{x}</span></li>' for x in t['forwhom']) + '</ul></div>') if t.get('forwhom') else ''
        us = ('<div><h2 class="h-card">מידע שימושי</h2><ul class="checks">' + ''.join(f'<li>{v.bicon("pin")}<span>{x}</span></li>' for x in t['useful']) + '</ul></div>') if t.get('useful') else ''
        cols = f'<section class="wrap twocol">{fw}{us}</section>'
    gal = ''.join(f'<li class="frame">{v.photo(n, alt, "(min-width: 900px) 40vw, 90vw")}</li>' for n, alt in t['extra'])
    others = ''.join(f'<li><a class="chip2" href="/tours/{o["slug"]}.html">{o["name"]}<svg aria-hidden="true"><use href="#i-arrow"/></svg></a></li>' for o in SHOWN if o['slug'] != t['slug'])
    h_title = t.get('page_title', name)
    body = v.phead('סיור בחיפה עם יוסק׳ה', h_title, t['hero_sub'], p, t['alt'], pos, back=('/tours/', 'לכל הסיורים')) + f'''
    <section class="wrap tourintro" aria-labelledby="ti-{t['slug']}">
      <div class="tourintro__lens"><h2 class="visually-hidden" id="ti-{t['slug']}">על הסיור</h2>{paras}</div>
      {facts_html}
    </section>
{meet}
{cols}
    <section class="wrap tourgal" aria-labelledby="tg-title"><h2 class="h-card" id="tg-title">{v.bicon("camera")}תמונות מהשטח</h2><ul>{gal}</ul></section>
{lead_card('tl', 'tour', t['cta_h'], '', t['cta_p'], t['cta_btn'], 'כמה אתם, מתי, ומה חשוב לדעת?', tour_slug=t['slug'], wa_link=wa_tour(name))}
    <section class="wrap more2"><h2 class="h-card">סיורים נוספים בחיפה</h2><ul>{others}</ul></section>'''
    return v.page(f'tours/{t["slug"]}.html', f'{name} | יוסק׳ה', t['hero_sub'], body, current='tours')


def sodot_redirect():
    html = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>סודות ורמזים בחיפה | יוסק׳ה</title><meta name="robots" content="noindex">'
            '<meta http-equiv="refresh" content="0; url=/families.html"><link rel="canonical" href="/families.html"></head><body><p><a href="/families.html">לעמוד המשפחות</a></p></body></html>')
    (ROOT / 'tours/sodot-veremazim.html').write_text(html)
    return 'tours/sodot-veremazim.html'


# ------------------------------------------------------------------ audience pages
def orgs_page():
    steps = [('מבינים את הצוות', 'מספר משתתפים, גילאים, תפקידים, מטרת היום, זמן ותקציב.'), ('בונים כיוון', 'יוסק׳ה מציע סיור קיים או מבנה יום ומסביר מה מתאים ולמה.'),
             ('מדייקים את הפרטים', 'תוכן, קצב, אוכל, מעברים, מפגש וסיום.'), ('יוצאים לדרך', 'הצוות מגיע ליום שנבנה כיחידה אחת, לא כאוסף תחנות.')]
    st = ''.join(f'<li><span class="n4">{i + 1}</span><h3>{h}</h3><p>{p}</p></li>' for i, (h, p) in enumerate(steps))
    body = (v.phead('תוכן, תכנון ואווירה שמחברת בין אנשים שונים.', 'יום בחיפה שהצוות <span class="hl">באמת נכנס אליו</span>',
                    'תוכן, תכנון ואווירה שמחברת בין אנשים שונים, גם כשלא כולם מגיעים עם אותה רמת התלהבות מסיור מודרך.', 'stairs-group', 'קבוצה גדולה עם יוסק׳ה יושבת על מדרגות ברחוב', '50% 45%')
            + f'<div class="wrap"><a class="btn btn--sun" href="#lead" data-lead-kind="org" data-track="organizations_lead_start">לתכנון יום לצוות</a></div>'
            + prose('', 'יום גיבוש טוב לא מתחיל <span class="hl">בבחירת אטרקציה</span>', ['הוא מתחיל בהבנה של האנשים: מי מגיע, מה הצוות עבר יחד, מה רוצים שיקרה ביום הזה ומה ממש לא מתאים לו.',
                    'יוסק׳ה בונה את היום סביב הקבוצה ומחבר בין סיור בחיפה, תוכן חברתי־תרבותי, אוכל ופעילויות מאושרות. המטרה היא לא למלא שעות, אלא ליצור רצף שבו אנשים זזים, מדברים, לומדים, צוחקים ומקבלים הזדמנות לפגוש זה את זה מחוץ לתפקידים הרגילים.'])
            + prose('למה זה עובד', 'לצוותים <span class="hl hl--teal">שונים</span>', ['בכל צוות יש מי שרוצים היסטוריה, מי שמחכים לאוכל, מי שמעדיפים פעילות ומי שהיו שמחים לדעת מתי חוזרים למשרד. יוסק׳ה אינו מתעלם מהפערים האלה. הוא משתמש בהם כדי לבנות יום עם קצב, גיוון ומקום ליותר מסוג אחד של עניין.',
                    'מאחורי הקלילות יש תכנון: רצף, זמנים, נקודות מפגש, מעברים ודרך ברורה להחזיק את הקבוצה. ביום עצמו התוכן מגיע בגובה העיניים, בלי להפוך את הגיבוש ליום לימודים.'])
            + prose('מה אפשר', 'לבנות', [], ['סיור תוכן בחיפה.', 'יום סביב נושא חברתי, תרבותי או סביבתי.', 'שילוב אוכל או טעימות, לפי האפשרויות הפעילות.', 'משימות ושיחה קבוצתית.', 'יום רחב יותר המשלב כמה חלקים, לאחר אישור ותכנון.'])
            + f'<section class="wrap" aria-labelledby="o4"><h2 class="duo-title" id="o4"><span class="duo-title__light">איך זה</span> <span class="duo-title__bold">עובד</span></h2><ol class="steps4">{st}</ol></section>'
            + prose('', 'ומה אם חלק מהצוות <span class="hl">לא אוהב סיורים?</span>', ['היום אינו מבוסס על עמידה והקשבה בלבד. הרחוב, השאלות, המעברים והקבוצה הם חלק מהדרך שבה התוכן עובר. בשיחה הראשונה בודקים מה עלול לאבד את האנשים ומתכננים בהתאם.'])
            + lead_card('ol', 'org', 'ספרו ליוסק׳ה', 'על הצוות', 'לא צריך להגיע עם תכנית. צריך לדעת מי מגיע, מה אתם רוצים להשיג ומה מסגרת הזמן.', 'לתכנון יום לצוות', 'הערות או צרכים מיוחדים', 'orgs',
                      extras=(('org', 'ארגון ותפקיד', 'text'), ('email', 'אימייל', 'email'), ('people', 'מספר משתתפים', 'text'), ('dates', 'תאריך או טווח', 'text'), ('goal', 'מטרת היום', 'text'))))
    return v.page('orgs.html', 'ימי גיבוש לחברות ולארגונים | יוסק׳ה', 'יום בחיפה שהצוות באמת נכנס אליו: תוכן, תכנון ואווירה שמחברת בין אנשים שונים, עם יוסק׳ה קליין.', body, current='orgs')


def families_page():
    opts = [('מרכז הכרמל', 'פעילות עירונית באזור מרכז הכרמל, עם חידות ורמזים שמובילים בין נקודות וסיפורים. הפעילות נמשכת כשעתיים, באורך של כ־1.3 ק״מ ומתאימה לגילאי 5 עד 13.'),
            ('המושבה הגרמנית', 'פעילות בין הרחובות והסיפורים של המושבה, עם משימות שמזמינות את הילדים להסתכל על מבנים, פרטים והקשר שבין השכונה לעיר.'),
            ('שקמונה', 'פעילות ליד הים שמאפשרת לחבר בין טבע, עבר, עיר וסביבה דרך חיפוש, תנועה ומשימות משפחתיות.'),
            ('מערת אליהו וסטלה מאריס', 'פעילות שמחברת בין הר, ים, אמונות וסיפורים מקומיים באזור שיש בו כמה שכבות תרבותיות במרחק קצר.')]
    oc = ''.join(f'<li class="fopt"><span class="fopt__n">{i + 1}</span><h3>{h}</h3><p>{p}</p></li>' for i, (h, p) in enumerate(opts))
    parents = [('לאילו גילאים זה מתאים?', 'הגילאים משתנים בין הפעילויות. מוסרים ליוסק׳ה את גילאי הילדים ובודקים איזו אפשרות מתאימה.'),
               ('ומה אם הילד או הילדה לא אוהבים להקשיב להסברים?', 'הפעילות בנויה על משימות, חיפוש ורמזים. התוכן מגיע כחלק מהמשחק ולא כהרצאה ארוכה.'),
               ('אפשר להגיע עם עגלה?', 'המסלולים שונים זה מזה. בודקים מראש את רמת ההליכה, המדרגות וההתאמה לעגלה בכל אזור.'),
               ('אפשר להזמין ליום הולדת או מפגש משפחתי?', 'מספרים ליוסק׳ה מה מציינים, מי מגיע ומה מסגרת הזמן, ובודקים איזו פעילות ואיזה מבנה יכולים להתאים.')]
    body = (v.phead('חידות, משימות ורמזים שמכניסים את כל המשפחה לעיר.', 'פעילות בחיפה שבה הילדים הם <span class="hl">חלק מהסיפור</span>',
                    'חידות, משימות ורמזים שמכניסים את כל המשפחה לעיר, בלי לגרור אף אחד מאחור ובלי להפוך את היום לשיעור.', 'lookout-kids', 'יוסק׳ה מסביר לילדים ולהורים ליד המעקה מול המפרץ', '50% 50%')
            + '<div class="wrap"><a class="btn btn--sun" href="#lead" data-lead-kind="family" data-track="family_contact_click">למציאת הפעילות למשפחה שלנו</a></div>'
            + prose('', 'ב״סודות ורמזים בחיפה״ הילדים <span class="hl hl--teal">לא מחכים</span>', ['הם מחפשים, פותרים, שואלים ומובילים את המשפחה אל הסיפור הבא. הפעילות משלבת משחק עם תוכן ומאפשרת גם למבוגרים לראות את העיר אחרת. בוחרים את האזור לפי הגילאים, הזמן והקצב של המשפחה, ויוצאים ליום שבו כולם משתתפים.'])
            + f'<section class="wrap" aria-labelledby="f4"><h2 class="duo-title" id="f4"><span class="duo-title__light">ארבע אפשרויות</span> <span class="duo-title__bold">בחיפה</span></h2><ol class="opts">{oc}</ol></section>'
            + prose('איך', 'בוחרים', ['לא לפי הכותרת היפה ביותר, אלא לפי הגילאים, משך הזמן, רמת ההליכה, עגלות, נגישות ומה שהילדים אוהבים לעשות. יוסק׳ה עובר אתכם על האפשרויות ועוזר לבחור.'])
            + faq_section(parents, 'שאלות', 'של <span class="hl">הורים</span>', 'pf')
            + lead_card('fl', 'family', 'לבדיקת פעילות', 'למשפחה', 'ספרו בני כמה הילדים, כמה זמן יש ומתי תרצו לצאת. יוסק׳ה יחזור אליכם.', 'לבדיקת פעילות למשפחה', 'גילאי הילדים ומה שחשוב לדעת', 'families',
                      extras=(('people', 'כמה אתם בערך?', 'text'), ('dates', 'תאריך או טווח', 'text'))))
    return v.page('families.html', 'פעילות משפחתית בחיפה | יוסק׳ה', 'פעילות בחיפה שבה הילדים הם חלק מהסיפור: חידות, משימות ורמזים לכל המשפחה, עם יוסק׳ה קליין.', body, current='families')


def private_page():
    body = (v.phead('לחברים, קהילות, אורחים ואירועים פרטיים שרוצים יותר מעוד מפגש סביב שולחן.', 'יש קבוצה. <span class="hl">בואו נבנה לה</span> יום בחיפה.',
                    'לחברים, קהילות, אורחים ואירועים פרטיים שרוצים יותר מעוד מפגש סביב שולחן.', 'lookout-big-group', 'קבוצה גדולה מצטלמת בתצפית מעל המפרץ', '50% 60%')
            + prose('', 'בוחרים סיור קיים, או <span class="hl hl--teal">יום רחב יותר</span>', ['אפשר לבחור אחד מהסיורים הקיימים או לבנות יום רחב יותר סביב הזמן, ההרכב ומה שמעניין את הקבוצה. יוסק׳ה עוזר לבחור את האזור, הקצב והתוכן ומוודא שהיום מרגיש מחובר ולא כמו רשימת תחנות.',
                    'הקבוצה יכולה להגיע בשביל חיפה, בשביל תוכן, בשביל אוכל או פשוט בשביל זמן משותף. השיחה הראשונה נועדה להבין מה חשוב לכם ומה יעזור לכולם להיכנס ליום.'])
            + '<div class="wrap"><a class="btn btn--ink" href="/tours/">לכל הסיורים בחיפה</a></div>'
            + lead_card('pl', 'private', 'ספרו על הקבוצה', 'ונבנה את <span class="hl">היום</span>', 'מי מגיע, כמה אתם ומה הייתם רוצים שיקרה ביום הזה.', 'לתכנון טיול פרטי', 'מה מעניין את הקבוצה?', 'private',
                      extras=(('people', 'כמה משתתפים בערך?', 'text'), ('dates', 'תאריך או טווח', 'text'))))
    return v.page('private-groups.html', 'טיול פרטי לקבוצה בחיפה | יוסק׳ה', 'יש קבוצה? בואו נבנה לה יום בחיפה: סיור קיים או יום רחב יותר, לפי הזמן, ההרכב ומה שמעניין אתכם.', body, current='')


def about_page():
    body = ('<div class="pagetop"></div><div class="flyzone">' + OB.obj('camera', OB.CAMERA_IMG, y=0, r=0, travel='camera') + '</div>'
            + v.phead('מדריך ומפיק טיולים בחיפה, עם סקרנות לתרבות, לחברה ולמה שקורה כשאנשים ומקום נפגשים.', 'אני יוסק׳ה, ואני אוהב אנשים <span class="hl">כמעט כמו שאני אוהב לטייל</span>',
                    'מדריך ומפיק טיולים בחיפה, עם סקרנות לתרבות, לחברה ולמה שקורה כשאנשים ומקום נפגשים.', 'portrait-warm', 'יוסק׳ה קליין בפונצ׳ו כחול ליד קיר פרחים צבעוני', '50% 35%')
            + prose('הסיפור', 'שלי', ['מצאתי בעבודה הזאת חיבור בין כמה דברים שמעניינים אותי באמת: אנשים, מקומות, תרבות והשאלות שמסתתרות מאחורי מה שנראה מובן מאליו.',
                    'אני מגיע לסיור עם ידע ותכנון, אבל לא רוצה שהקבוצה תרגיש שהיא נכנסה לשיעור. הלימודים שלי בסוציולוגיה ובאנתרופולוגיה נותנים לי כלים לקרוא תופעות חברתיות ותרבותיות; העבודה בשטח מלמדת אותי איך להפוך אותן לסיפור שאפשר להבין, לשאול עליו וליהנות ממנו.'])
            + prose('איך אני רואה', 'סיור טוב', ['סיור טוב אינו רק רצף של עובדות. הוא צריך לתת חופש להגיב למה שקורה, שמחה שאינה מאולצת, תוכן שמעשיר בלי להכביד וחיבור אמיתי בין האנשים שהגיעו יחד.',
                    'אני רוצה שהקבוצה תצא עם יותר מידע, אבל גם עם יותר שיחה. עם רגעים מצחיקים, אבל גם עם מחשבה אחת או שתיים שנכנסות לחיים האישיים. עם תחושה שהיום היה מקצועי ומסודר, בלי שהסדר השתלט על החוויה.'])
            + prose('', 'למה <span class="hl hl--teal">חיפה</span>', ['חיפה נותנת לי בדיוק את החיבור הזה. הר וים, נמל וגנים, שכונות שונות, דתות, תרבויות, תחבורה, תעשייה וטבע. היא עיר שאפשר להסתכל עליה מכמה כיוונים וכל פעם לקבל סיפור אחר.'])
            + prose('מעבר', 'לחיפה', ['לעיתים אני מדריך גם קבוצות ישראליות במסעות של ברזילאו בדרום אמריקה. המקומות משתנים, אבל הסקרנות נשארת: להבין אנשים ותרבות, ולא להסתפק רק בנוף.'])
            + f'<section class="wrap ctaband"><a class="btn btn--sun" href="/tours/" data-track="about_tours_click">לסיורים של יוסק׳ה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a></section>')
    return v.page('about.html', 'אודות יוסק׳ה | יוסק׳ה', 'יוסק׳ה קליין, מדריך ומפיק טיולים בחיפה, עם סקרנות לתרבות, לחברה ולמה שקורה כשאנשים ומקום נפגשים.', body, current='about')


def sa_page():
    cs = ''
    photos = {'ברזיל': ('rio', 'יוסק׳ה פורש ידיים מתחת לפסל ישו הגואל בריו דה ז׳ניירו'), 'ארגנטינה': None, 'צ׳ילה': None, 'פרו': None, 'אקוודור': None}
    for i, (country, text, links) in enumerate(C.COUNTRIES):
        ls = ''.join(ext_btn(label, C.BRAZILAO_TRIPS + slug + '/', 'btn--line btn--sm', 'brazilao_trip_click', slug) for label, slug in links)
        cs += f'<li class="country"><span class="country__n">{i + 1}</span><div><h3>{country}</h3><p>{text}</p><div class="btnrow">{ls}</div></div></li>'
    body = ('<div class="pagetop"></div><div class="flyzone">' + OB.obj('plane', OB.PLANE_IMG, y=0, r=0, travel='plane') + '</div>'
            + v.phead('מסעות מאורגנים של ברזילאו שבהם יוסק׳ה מדריך לעיתים קבוצות ישראליות ומחבר בין נוף, אנשים ותרבות.', 'דרום אמריקה <span class="hl">עם יוסק׳ה</span>',
                      'מסעות מאורגנים של ברזילאו שבהם יוסק׳ה מדריך לעיתים קבוצות ישראליות ומחבר בין נוף, אנשים ותרבות.', 'rio', 'יוסק׳ה פורש ידיים מתחת לפסל ישו הגואל בריו דה ז׳ניירו', '50% 35%')
            + prose('', 'דרום אמריקה אינה רק <span class="hl hl--teal">רשימת יעדים</span>', ['כל מדינה וכל מסע פותחים עולם אחר של חברה, תרבות, היסטוריה ונוף. יוסק׳ה מביא למסעות את אותה דרך עבודה שמאפיינת אותו בחיפה: הרבה ידע, סקרנות לאנשים ותוכן שמגיע בשיחה ולא בהרצאה.',
                    'ברזילאו היא הגוף שמפעיל את המסעות, מנהל את המסלולים, המועדים וההרשמה. בעמוד זה אפשר להכיר את היעדים ולראות את הקישורים הרלוונטיים למסעות שבהם יוסק׳ה מדריך.'])
            + f'<section class="wrap" aria-labelledby="cn"><h2 class="visually-hidden" id="cn">היעדים</h2><ol class="countries">{cs}</ol></section>'
            + prose('שקיפות', '', ['המסעות מופעלים על ידי ברזילאו. יוסק׳ה אינו מדריך בכל מועד ובכל מסלול. בכל יעד מוצג קישור מדויק למסע הפעיל ולמידע המעודכן.'], cls='prose--note')
            + f'<section class="wrap ctaband">{ext_btn("למסעות הפעילים בברזילאו", "https://www.brazilao.com/organized-tours", "btn--sun", "brazilao_trip_click", "sa-page")}</section>')
    return v.page('south-america.html', 'דרום אמריקה עם יוסק׳ה | יוסק׳ה', 'מסעות מאורגנים של ברזילאו שבהם יוסק׳ה מדריך לעיתים קבוצות ישראליות: ברזיל, ארגנטינה, צ׳ילה, פרו ואקוודור.', body, current='sa')


# ------------------------------------------------------------------ wiring
def main():
    v.home, v.tours_index, v.tour_page = home, tours_index, tour_page
    built = [home(), tours_index()] + [tour_page(t) for t in SHOWN] + [sodot_redirect()]
    built += [orgs_page(), families_page(), private_page(), about_page(), sa_page(), v.contact_page(), v.gallery(), v.not_found(), v.privacy(), v.terms(), v.accessibility(), v.quiz()]
    v.groups_redirect()
    extra = [v.sale(), v.admin()]
    print('built:', ', '.join(built))
    print('also (not in sitemap):', ', '.join(extra), 'groups.html (redirect)')
    if v.LAUNCH:
        urls = [('/' if b == 'index.html' else '/' + b.replace('index.html', '')) for b in built if b not in ('404.html', 'tours/sodot-veremazim.html')]
        today = __import__('datetime').date.today().isoformat()
        (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(f'  <url><loc>{v.SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>' for u in urls) + '\n</urlset>\n')
        (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /sale.html\nSitemap: {v.SITE_URL}/sitemap.xml\n')
    else:
        (ROOT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (ROOT / 'sitemap.xml').unlink(missing_ok=True)


if __name__ == '__main__':
    main()
