"""Build, 16.11.2026 (v6): the PREVIOUS homepage, section for section and design for design (site-src/v4/home.html: uniqueness,
about, map, tours, upcoming, groups, moments, reviews, South America, FAQ, contact, trail), with the client's FINAL COPY swapped in.
The structure rules of the implementation spec are deliberately NOT applied here (client request). Inner pages come from v5.
Run:  python3 tools/build_site_v6.py"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_v4 as v   # noqa: E402

# keep the v4 shell (header, rail, tab bar) that the previous version used; v5 changes them on import
_keep = dict(header=v.header, NAV=list(v.NAV), RAIL=list(v.RAIL), TABBAR=list(v.TABBAR), lead_form=v.lead_form, render=v.render, tour_cards=v.tour_cards)
import build_site_v5 as v5   # noqa: E402
v.header = _keep['header']; v.NAV[:] = _keep['NAV']; v.RAIL[:] = _keep['RAIL']; v.TABBAR[:] = _keep['TABBAR']
C = v5.C

# ------------------------------------------------------------------ data touches for the map and the cards
STOPS = {'haifa-ahuvati': ['הגנים הבהאיים', 'טיילת לואי', 'הכרמלית', 'כיכר פריז', 'הנמל'],
         'haifa-ahuvati-mekutzar': ['הגנים הבהאיים', 'טיילת לואי', 'הכרמלית', 'כיכר פריז', 'הנמל'],
         'haifa-shel-maala': ['הגנים הבהאיים', 'טיילת לואי', 'רובע המדרגות', 'תחנה בכרמלית', 'גן האם'],
         'haifa-shel-mata': ['בניין המפרש', 'מגדל השעון', 'כיכר פריז', 'השוק הטורקי', 'הנמל', 'המושבה הגרמנית']}


def short(text, n=150):
    out = ''
    for s in re.split(r'(?<=\.)\s+', text):
        out = (out + ' ' + s).strip()
        if len(out) >= n:
            break
    return out


for t in v.TOURS:
    if t['slug'] in STOPS:
        t['stops'] = STOPS[t['slug']]
    if 'card' in t:
        t['blurb'] = short(t['card'][0])


def tour_cards():
    saved = v.TOURS[:]
    v.TOURS[:] = [t for t in saved if not t.get('hidden')]
    try:
        html = _keep['tour_cards']()
    finally:
        v.TOURS[:] = saved
    return html.replace(' · לכל הקבוצות', '')


def upcoming_box(uid, tour='', form='#contact', empty_html=''):
    return (f'<div class="upcoming2" id="{uid}"><p>בעמוד הסיורים הקרובים מחכים המועדים הפתוחים, כל הפרטים ואפשרות להזמין מקום ולשלם.</p>'
            f'{v5.ext_btn("למועדים, הרשמה ותשלום", v5.SALES, "btn--sun", "upcoming_sales_page_click", "home")}</div>')


def home_lead_form(uid, kind='general', *a, **k):
    return v5.lead_form(uid, 'tour', '', 'אני רוצה שיוסק׳ה יחזור אליי', 'משהו נוסף שכדאי לדעת', True,
                        (('people', 'כמה משתתפים בערך?', 'text'), ('dates', 'תאריך או טווח תאריכים', 'text')))


# ------------------------------------------------------------------ copy swaps
def sub(body, pattern, repl, flags=re.S, must=True):
    new, n = re.subn(pattern, lambda m: repl, body, count=1, flags=flags)
    if must and not n:
        print('WARNING: copy swap not applied:', pattern[:70])
    return new


def faq_details():
    return ''.join(f'<details{" open" if i == 0 else ""}><summary>{q}<i aria-hidden="true"></i></summary><p>{a}</p></details>' for i, (q, a) in enumerate(C.FAQ))


def swap_faq(body):
    body = sub(body, r'<h2 class="duo-title" id="faq-title">.*?</h2>', '<h2 class="duo-title" id="faq-title"><span class="duo-title__light">רגע,</span> <span class="duo-title__bold">ומה לגבי<span class="hl">...?</span></span></h2>', must=False)
    body = sub(body, r'<div class="faq__list">.*?</div>(?=\s*</div>\s*</section>)', f'<div class="faq__list">{faq_details()}</div>', must=False)
    return body


def swap_home(body):
    # uniqueness: the two claims the copy document retires are replaced by its promise
    body = sub(body, r'<p class="uq__big">המוצר הכי.*?</p>', '<p class="uq__big">יום שבו <mark class="mk mk--orange">נהנים, לומדים ומתחברים</mark>, בלי שאחד הדברים יבוא על חשבון האחרים.</p>', must=False)
    body = sub(body, r'<p>כולם יוצאים מהסיור עם חוויה בלתי נשכחת.*?</p>', '<p>יוסק׳ה מחבר בין ידע, שיחה ותכנון מסודר, וקורא את הקבוצה לאורך כל היום.</p>', must=False)
    # about
    body = sub(body, r'<h2 class="duo-title" id="about-title">.*?</h2>', '<h2 class="duo-title" id="about-title"><span class="duo-title__light">נעים להכיר,</span> <span class="duo-title__bold">יוסק׳ה <span class="hl">קליין</span></span></h2>')
    paras = f'<p class="ab2__lead">{ABOUT_SHORT[0]}</p>' + ''.join(f'<p class="ab2__p">{p}</p>' for p in ABOUT_SHORT[1:])
    body = sub(body, r'<p class="ab2__lead">.*?</p>', paras)
    dots = ['teal', 'sun', 'orange']
    ben = ''.join(f'<li><span class="ab2__dot ab2__dot--{dots[i]}"></span><b>{h}</b><span>{p}</span></li>' for i, (_, h, p) in enumerate(C.BENEFITS))
    body = sub(body, r'<ol class="ab2__time" data-time>.*?</ol>', f'<ol class="ab2__time" data-time>{ben}</ol>')
    body = sub(body, r'<dl class="ab2__nums">.*?</dl>', '')
    body = body.replace('עוד עליי ועל הסיורים שהיו', 'להכיר את יוסק׳ה')
    # tours
    body = body.replace('<span class="duo-title__light">יוצאים לדרך ברגל, בגובה העיניים.</span> <span class="duo-title__bold">הסיורים <span class="hl">בחיפה</span></span>',
                        '<span class="duo-title__light">בחרו את חיפה שמתאימה ליום שלכם.</span> <span class="duo-title__bold">הסיורים של יוסק׳ה <span class="hl">בחיפה</span></span>')
    # upcoming
    body = body.replace('<span class="duo-title__light">מצטרפים לסיור פתוח?</span> <span class="duo-title__bold">סיורים <span class="hl hl--sun-dark">קרובים</span></span>',
                        '<span class="duo-title__light">רוצים להצטרף לסיור בלי לארגן קבוצה משלכם?</span> <span class="duo-title__bold">הסיורים <span class="hl hl--sun-dark">הקרובים</span></span>')
    # groups: services copy + the process steps
    body = body.replace('<span class="duo-title__light">משפחה, חברים או צוות מהעבודה?</span>', '<span class="duo-title__light">טיול פרטי, יום גיבוש או אירוע משפחתי.</span>')
    body = sub(body, r'<p>ספרו לי מי מגיע, מה מעניין אתכם.*?</p>', '<p>קבוצה מהעבודה, משפחה, חברים או אירוע שאתם רוצים לציין בדרך קצת אחרת. לכל אחד יש סיבה אחרת לצאת, ולכן גם היום עצמו לא צריך להיראות אותו דבר.</p>')
    steps = ''.join(f'<li><b>{h}</b><span>{t}</span></li>' for h, t in C.PROCESS)
    body = sub(body, r'<ol class="steps" data-steps>.*?</ol>', f'<ol class="steps" data-steps>{steps}</ol>')
    cards = [('משפחות', 'פעילות משפחתית שגם הילדים באמת משתתפים בה: חידות, משימות ורמזים שמכניסים אותם לתוך הסיפור.', '/families.html', 'לפעילויות למשפחות'),
             ('ארגונים וצוותים', 'יום גיבוש שגם התוכן בו מחזיק את הקבוצה: סיור, תוכן ואפשרויות נוספות ליום אחד שיש לו קצב והיגיון.', '/orgs.html', 'לתכנון יום לצוות'),
             ('קבוצות פרטיות', 'יש קבוצה. עכשיו צריך להפוך אותה ליום מוצלח. אפשר לבחור סיור קיים או לדבר עם יוסק׳ה על יום שמתאים לכם.', '/private-groups.html', 'לתכנון טיול פרטי')]
    for h, p, href, label in cards:
        body = sub(body, r'<div class="acard__body"><h3>(?:משפחה וחברים|צוות או ארגון|ילדים ומשפחות)</h3>.*?</div>',
                   f'<div class="acard__body"><h3>{h}</h3><p>{p}</p><a class="btn btn--line btn--sm" href="{href}" data-track="{href.strip("/").split(".")[0]}_contact_click">{label}</a></div>')
    # reviews
    body = sub(body, r'<h2 class="rwall__title" id="reviews-title">.*?</h2>', '<h2 class="rwall__title" id="reviews-title">מה החברים לדרך <span class="hl hl--sun">מספרים</span></h2>')
    body = sub(body, r'<p class="rwall__src">.*?</p>', '<p class="rwall__src">מטיילים, משפחות וצוותים כבר כתבו. חבל שרק יוסק׳ה יראה.</p>')
    # South America
    body = body.replace('<span class="duo-title__light">רוצים לראות עוד עולם?</span> <span class="duo-title__bold">מסעות בדרום אמריקה</span>',
                        '<span class="duo-title__light">חיפה במרכז, ולא רק היא.</span> <span class="duo-title__bold">יוסק׳ה בדרום אמריקה</span>')
    body = body.replace('מדריך שם מאז 2016', 'מדריך לעיתים במסעות ברזילאו').replace('ברזיל · ארגנטינה · פרו · אקוודור', 'ברזיל · ארגנטינה · צ׳ילה · פרו · אקוודור')
    body = sub(body, r'<p>מאז 2016 אני מדריך.*?</p>', '<p>לעיתים יוסק׳ה מדריך קבוצות ישראליות במסעות המאורגנים של ברזילאו בדרום אמריקה, ומביא גם לשם את אותה סקרנות לאנשים, לתרבות ולסיפורים שמאחורי הנוף. ההרשמה, המסלולים והתפעול נעשים דרך ברזילאו.</p>')
    body = sub(body, r'<a class="btn btn--line abroad__more".*?</a>', f'<a class="btn btn--line abroad__more" href="{v5.SA_URL}" data-track="sa_page_click">למסעות בדרום אמריקה<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>')
    # FAQ
    body = swap_faq(body)
    # contact
    body = body.replace('<span class="duo-title__light">ספרו על היום שאתם מדמיינים,</span> <span class="duo-title__bold">ניפגש <span class="hl">בדרך</span></span>',
                        '<span class="duo-title__light">רוצים שיוסק׳ה יחזור אליכם</span> <span class="duo-title__bold">עם כיוון <span class="hl">מתאים?</span></span>')
    body = sub(body, r'<p>השאירו שם וטלפון, ויוסק׳ה יחזור אליכם\..*?</p>', '<p>ספרו בקצרה מי מגיע ומה אתם מחפשים. יוסק׳ה יחזור אליכם, ישאל את מה שצריך ויעזור להבין איזה סיור או יום יכול להתאים.</p>')
    body = body.replace('<span>וואטסאפ</span>', '<span>מעדיפים WhatsApp? כתבו ליוסק׳ה</span>')
    # 17.11.2026 (partner): no closing section before the footer
    body = sub(body, r'\n\s*<!-- =+[^>]*?trail[^>]*?-->\s*(?=<section class="trail")', '\n', must=False)
    body = sub(body, r'\s*<section class="trail".*?</section>', '')
    # services: the teal panel with the waves stays (owner, 17.11.2026: no photo there)
    # 19.11.2026 (partner): the areas map goes; the upcoming tours become an added section the owner runs from the admin
    # (cms defaults: custom block "trips" with anchor #upcoming); the client logos too (custom block "logos", shown once
    # logos are uploaded); the uniqueness block («איזון נכון: אושר + העשרה») moves down, it cannot open the page
    body = cut_section(body, 'map')
    body = cut_section(body, 'upsec')
    # 19.11.2026 evening (owner): the uniqueness block (value pills + balance) reads childish: it goes
    uq = re.search(r'\n\s*<!-- =+ UNIQUENESS.*?</section>', body, re.S)
    body = body[:uq.start()] + body[uq.end():]
    return body


def cut_section(body, cls):
    m = re.search(r'\n\s*<!-- =+(?:(?!-->).)*-->\s*<section class="%s".*?</section>' % re.escape(cls), body, re.S)
    if not m:
        print('WARNING: section not found:', cls)
        return body
    return body[:m.start()] + body[m.end():]


# ------------------------------------------------------------------ 17.11.2026 round (partner feedback)
HERO_SUB = '<b class="hero__key">סיורים בחיפה וימי גיבוש</b> עם תוכן מעניין, ויוסק׳ה אחד שיודע להחזיק את היום.'

# the home about, cut to its core (same facts as C.ABOUT_HOME, the key words marked so it reads at a glance)
ABOUT_SHORT = [
    'אני יוסק׳ה, ואני <mark class="mk mk--sun">אוהב אנשים כמעט כמו שאני אוהב לטייל</mark>. למזלי, מצאתי עבודה שמחברת בין השניים.',
    'אני מדריך ומפיק <b>סיורים בחיפה</b>, ולעיתים גם קבוצות במסעות <b>בדרום אמריקה</b>. אני מגיע לכל מקום <mark class="mk mk--teal">דרך האנשים, התרבות והסיפורים</mark> שמאחורי מה שרואים ברחוב.',
    'הרקע שלי ב<b>סוציולוגיה ובאנתרופולוגיה</b> נכנס לסיור <mark class="mk mk--orange">כשיחה, לא כהרצאה</mark>. אני מחזיק את הקצב וקורא את הקבוצה, כדי שכל אחד ירגיש חלק מהיום.',
]

# Approved client logos for the strip «כבר יצאנו לדרך עם» (spec 8.2): (file in prototype/assets/clients/, organisation name).
# Only logos with publication approval go here. While the list is empty the strip is not rendered (no placeholders).
CLIENT_LOGOS = []


def logos_strip():
    if not CLIENT_LOGOS:
        return ''
    items = ''.join(f'<li><img src="/assets/clients/{f}" alt="{html_escape(n)}" loading="lazy" decoding="async"></li>' for f, n in CLIENT_LOGOS)
    dup = ''.join(f'<li aria-hidden="true"><img src="/assets/clients/{f}" alt="" loading="lazy" decoding="async"></li>' for f, _ in CLIENT_LOGOS)
    return (f'''    <section class="logos" id="logos" aria-labelledby="logos-title">
      <h2 class="logos__title" id="logos-title">כבר יצאנו לדרך עם</h2>
      <div class="logos__view" tabindex="0" data-logos><ul class="logos__track">{items}{dup}</ul></div>
    </section>''')


def html_escape(s):
    from html import escape
    return escape(s, quote=True)


def hero6():
    h = v5.hero()
    return sub(h, r'<p class="hero__sub">.*?</p>', f'<p class="hero__sub">{HERO_SUB}</p>')


def render(src, form_id='c', lead_kind='general'):
    if src == 'home.html':
        v.lead_form = home_lead_form
        try:
            body = _keep['render'](src, form_id, lead_kind)
        finally:
            v.lead_form = _keep['lead_form']
        body = body.replace('%%HERO%%', hero6())
        return swap_home(body)
    body = _keep['render'](src, form_id, lead_kind)
    return swap_faq(body) if src == 'contact.html' else body


def home():
    body = v5.objects_for(v.render('home.html'), {'tours': v5.CAMERA_FLY, 'groups': v5.CABLE, 'abroad': v5.PLANE})
    pre = '<link rel="preload" as="image" href="/assets/hero26/garden-2400.webp" media="(min-width: 700px)" fetchpriority="high">'
    return v.page('index.html', 'יוסק׳ה | טיולים, חברה, תרבות. סיורים בחיפה',
                  'סיורים בחיפה וימי גיבוש לארגונים, לצוותים, למשפחות ולקבוצות. עם תוכן מעניין, תכנון מסודר ויוסק׳ה אחד שיודע להחזיק את היום.',
                  body, body_class='home', preload=pre)



def dedupe_page_heads():
    """19.11.2026 (owner): inner page heads said the same sentence twice (the light title line and the lede under it).
    When the lede only repeats the light line, the lede goes."""
    root = Path(__file__).resolve().parents[1] / 'prototype'
    norm = lambda t: re.sub(r'[^\w\u0590-\u05FF]+', ' ', re.sub(r'<[^>]+>', '', t)).strip()
    for f in list(root.glob('*.html')) + list(root.glob('tours/*.html')):
        html = f.read_text()
        m = re.search(r'<section class="phead[^"]*">.*?<span class="duo-title__light">(.*?)</span>.*?(\s*<p class="phead__lede">(.*?)</p>)', html, re.S)
        if not m:
            continue
        # the page's main button sat alone under the head: it moves into the head, under the title and the lede
        html0 = html
        cta = re.search(r'(</section>)(<div class="wrap">(<a class="btn[^"]*"[^>]*>.*?</a>)</div>)', html[m.start():], re.S)
        if cta and html[m.start():].find('</section>') == cta.start(1):
            a, b = m.start() + cta.start(2), m.start() + cta.end(2)
            btn = cta.group(3)
            html = html[:a] + html[b:]
            end_wrap = html.find('</div>', html.find('<div class="wrap">', m.start()))
            html = html[:end_wrap] + f'\n        <div class="phead__acts">{btn}</div>\n      ' + html[end_wrap:]
            print('  page head: button moved into the head in', f.name)
        if html != html0:
            f.write_text(html)
            m = re.search(r'<section class="phead[^"]*">.*?<span class="duo-title__light">(.*?)</span>.*?(\s*<p class="phead__lede">(.*?)</p>)', html, re.S)
            if not m:
                continue
        light, lede = norm(m.group(1)), norm(m.group(3))
        if light and lede and (lede.startswith(light[:28]) or light.startswith(lede[:28])):
            f.write_text(html[:m.start(2)] + html[m.end(2):])
            print('  page head: dropped the repeated lede in', f.name)


if __name__ == '__main__':
    v.RAIL[:] = [r for r in v.RAIL if r[0] != 'trail']   # the closing trail section is gone (17.11.2026)
    # 19.11.2026: no map; the uniqueness block sits after the reviews; the rail follows the page order
    rail = {r[0]: r for r in v.RAIL}
    v.RAIL[:] = [rail[k] for k in ('top', 'about', 'tours', 'upcoming', 'groups', 'moments', 'reviews', 'abroad', 'faq', 'contact')]
    v.TABBAR[:] = ['about', 'tours', 'upcoming', 'groups', 'contact']
    v.tour_cards = tour_cards
    v.upcoming_box = upcoming_box
    v.render = render
    v5.home = home
    try:
        v5.main()   # ends with an error on the retired prototype/admin/admin.css; the pages are written by then
    finally:
        dedupe_page_heads()

