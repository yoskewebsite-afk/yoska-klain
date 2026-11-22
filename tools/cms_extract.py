#!/usr/bin/env python3
"""Turns the built static site (prototype/*.html) into CMS inputs:

  cms/templates/<page>.html   page templates: editable text, links and images become {{tokens}};
                              sections are wrapped in <!--cms:s ID--> markers; data-driven parts (tours, nav,
                              contact form) are <!--cms:r NAME--> regions rendered by api/_lib/render.mjs
  cms/defaults.json           the content that is on the site today (the first import; never overwrites edits)
  cms/schema.json             the structure the admin screens need (sections, field groups, lists, dependencies)

Run after `python3 tools/build_site_v4.py`:   python3 tools/cms_extract.py
Nothing here invents content: every default is read from the built pages.
"""
import json
import re
import sys
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_site_v4 as B  # noqa: E402  (constants)
import build_site_v5 as B5  # noqa: E402
import build_site_v6 as B6  # noqa: E402  (importing applies the tour data of the live site; nothing is built)

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / 'prototype'
OUT = PROJECT / 'cms'

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
INLINE = {'span', 'b', 'strong', 'em', 'i', 'small', 'mark', 'u', 'abbr', 'sub', 'sup', 'time', 'bdi', 'code'}
SKIP_TAGS = {'svg', 'script', 'style', 'template', 'noscript', 'input', 'textarea', 'select', 'form', 'pre'}
BLOCK_LABEL = {'h1': 'כותרת ראשית', 'h2': 'כותרת', 'h3': 'כותרת משנה', 'h4': 'כותרת משנה', 'h5': 'כותרת משנה', 'h6': 'כותרת משנה',
               'p': 'פסקה', 'li': 'פריט ברשימה', 'summary': 'שאלה', 'figcaption': 'כיתוב', 'dt': 'מונח', 'dd': 'הסבר', 'label': 'תווית',
               'blockquote': 'ציטוט', 'button': 'כפתור', 'a': 'כפתור / קישור', 'div': 'טקסט', 'section': 'טקסט', 'article': 'טקסט'}

# ---------------------------------------------------------------- pages
STATIC = [  # (page id, built file, public path, label)
    ('index', 'index.html', '/', 'דף הבית'), ('tours', 'tours/index.html', '/tours/', 'הסיורים (רשימה)'), ('about', 'about.html', '/about.html', 'על יוסק׳ה'),
    ('families', 'families.html', '/families.html', 'משפחות'), ('orgs', 'orgs.html', '/orgs.html', 'חברות וארגונים'), ('private', 'private-groups.html', '/private-groups.html', 'קבוצות פרטיות'),
    ('south-america', 'south-america.html', '/south-america.html', 'דרום אמריקה'), ('contact', 'contact.html', '/contact.html', 'יצירת קשר'), ('quiz', 'quiz.html', '/quiz.html', 'שאלון התאמה'),
    ('sale', 'sale.html', '/sale.html', 'עמוד הרשמה (טיוטה)'), ('gallery', 'gallery.html', '/gallery.html', 'גלריה'), ('privacy', 'privacy.html', '/privacy.html', 'מדיניות פרטיות'),
    ('terms', 'terms.html', '/terms.html', 'תקנון ותנאי שימוש'), ('accessibility', 'accessibility.html', '/accessibility.html', 'הצהרת נגישות'), ('notfound', '404.html', '/404.html', 'עמוד 404'),
]
NOINDEX_DEFAULT = {'sale', 'notfound'}
REDIRECT_STUBS = [('/groups.html', '/families.html'), ('/tours/sodot-veremazim.html', '/families.html')]   # built as meta-refresh stubs by the site
PAGES = [(pid, f, path, label, '') for pid, f, path, label in STATIC] + [
    (f'tour-{t["slug"]}', f'tours/{t["slug"]}.html', f'/tours/{t["slug"]}.html', f'טיול: {t["name"]}', 'tours') for t in B5.TOURS if not t.get('hidden')]

SECTION_LABELS = {
    'top': 'פתיחה (הירו)', 'map': 'בחירת סיור במפה', 'tours': 'הסיורים', 'about': 'נעים להכיר', 'groups': 'קבוצות',
    'moments': 'ככה זה נראה בשטח', 'reviews': 'המלצות', 'faq': 'שאלות ותשובות', 'abroad': 'מסעות בדרום אמריקה',
    'contact': 'יצירת קשר', 'trail': 'ברגל ובגובה העיניים',
}
# sections whose layout is tied to a scroll sequence or to the hero cut-out: cannot move or disappear
LOCKED = {'index': {'top'}}
# lists that can be edited as repeating items: (page, container selector (tag.class), label, item label)
LISTS = [
    ('index', 'ul.values', 'ערכים', 'ערך'),
    ('index', 'ol.steps', 'שלבים', 'שלב'),
    ('index', 'dl.about__facts', 'עובדות על יוסק׳ה', 'עובדה'),
    ('index', 'ul.groups__cards', 'כרטיסי קבוצות', 'כרטיס'),
    ('index', 'ul.sgs__grid', 'תמונות הגלריה', 'תמונה'),
    ('index', 'ul.rwall__grid', 'צילומי ההמלצות', 'המלצה'),
    ('index', 'div.faq__list', 'שאלות ותשובות', 'שאלה'),
    ('index', 'ul.abroad__facts', 'עובדות על המסעות', 'עובדה'),
    ('index', 'ul.abroad__cards', 'תמונות מהמסעות', 'תמונה'),
    ('groups', 'ol.steps', 'שלבים', 'שלב'),
    ('groups', 'ul.cardgrid', 'כרטיסי קבוצות', 'כרטיס'),
    ('gallery', 'ul.ggrid', 'תמונות הגלריה', 'תמונה'),
]
# the hero photo is paired with the Yoske cut-out and a decorative copy, so its images stay locked
LOCK_IMAGES = {('index', 'top')}


# ---------------------------------------------------------------- html tree with offsets
class Node:
    __slots__ = ('tag', 'attrs', 's', 'oe', 'ce', 'e', 'parent', 'kids')

    def __init__(self, tag, attrs, s, oe, parent):
        self.tag, self.attrs, self.s, self.oe, self.ce, self.e, self.parent, self.kids = tag, attrs, s, oe, None, None, parent, []

    def cls(self):
        return (self.attrs.get('class') or ('', 0, 0))[0].split()

    def attr(self, k):
        v = self.attrs.get(k)
        return v[0] if v else None


ATTR_RE = re.compile(r'([^\s"\'<>/=]+)(?:\s*=\s*("([^"]*)"|\'([^\']*)\'|[^\s>]+))?')


def parse_attrs(raw, base):
    out = {}
    inner = raw[1 + len(re.match(r'<([^\s/>]+)', raw).group(1)):]
    off = base + (len(raw) - len(inner))
    for m in ATTR_RE.finditer(inner):
        name = m.group(1).lower()
        if m.group(2) is None:
            out[name] = ('', -1, -1)
        elif m.group(3) is not None or m.group(4) is not None:
            g = 3 if m.group(3) is not None else 4
            out[name] = (m.group(g), off + m.start(g), off + m.end(g))
        else:
            out[name] = (m.group(2), off + m.start(2), off + m.end(2))
    return out


class Tree(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.ls = [0]
        for m in re.finditer('\n', src):
            self.ls.append(m.end())
        self.root = Node('#root', {}, 0, 0, None)
        self.root.ce = len(src)
        self.root.e = len(src)
        self.stack = [self.root]
        self.feed(src)
        self.close()

    def off(self):
        l, c = self.getpos()
        return self.ls[l - 1] + c

    def handle_starttag(self, tag, attrs):
        s = self.off()
        raw = self.get_starttag_text()
        n = Node(tag, parse_attrs(raw, s), s, s + len(raw), self.stack[-1])
        self.stack[-1].kids.append(n)
        if tag in VOID or raw.endswith('/>'):
            n.ce = n.e = n.oe
            return
        self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        s = self.off()
        raw = self.get_starttag_text()
        n = Node(tag, parse_attrs(raw, s), s, s + len(raw), self.stack[-1])
        n.ce = n.e = n.oe
        self.stack[-1].kids.append(n)

    def handle_endtag(self, tag):
        s = self.off()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                n = self.stack[i]
                n.ce = s
                n.e = s + len(f'</{tag}>')
                del self.stack[i:]
                return


def find(node, tag=None, cls=None, attr=None):
    """first descendant (document order) matching tag / class / attribute presence"""
    for k in node.kids:
        if (tag is None or k.tag == tag) and (cls is None or cls in k.cls()) and (attr is None or attr in k.attrs):
            return k
        r = find(k, tag, cls, attr)
        if r:
            return r
    return None


def walk(node):
    for k in node.kids:
        yield k
        yield from walk(k)


# ---------------------------------------------------------------- field scanner
class Scan:
    """collects groups/fields and source splices for one root (a section, a list item, a chrome block)"""

    def __init__(self, src, prefix, lock_images=False, special=None, ext_always=False):
        self.src, self.prefix, self.lock_images, self.special, self.ext_always = src, prefix, lock_images, special or {}, ext_always
        self.groups, self.splices, self.values = [], [], {}
        self.n = {'t': 0, 'l': 0, 'img': 0, 'ic': 0}
        self.label_n = {}

    def key(self, kind):
        self.n[kind] += 1
        return f'{self.prefix}{kind}{self.n[kind]}'

    def group(self, label, kind='text'):
        self.label_n[label] = self.label_n.get(label, 0) + 1
        g = {'id': f'g{len(self.groups) + 1}', 'label': label, 'num': self.label_n[label], 'kind': kind, 'fields': []}
        self.groups.append(g)
        return g

    def skip(self, n):
        if n.tag in SKIP_TAGS:
            return True
        if 'visually-hidden' in n.cls() or n.attr('aria-hidden') == 'true' or 'data-cms-skip' in n.attrs or 'sprite' in n.cls():
            return True
        return False

    def run(self, box, a, b):
        txt = self.src[a:b]
        m = re.match(r'(\s*)(.*?)(\s*)$', txt, re.S)
        core = m.group(2)
        if not core or not re.search(r'\w', re.sub(r'\{\{[^}]*\}\}', '', core)):
            return
        if re.fullmatch(r'\{\{[^}]*\}\}', core):
            return
        if box['g'] is None:
            box['g'] = self.group(BLOCK_LABEL.get(box['tag'], 'טקסט'))
        k = self.key('t')
        self.splices.append((a + len(m.group(1)), a + len(m.group(1)) + len(core), '{{%s}}' % k))
        self.values[k] = unescape(core)
        box['g']['fields'].append({'key': k, 'kind': 'text', 'long': len(core) > 70})

    def gaps(self, node, box):
        pos = node.oe
        for kid in node.kids:
            self.text_between(pos, kid.s, box)
            pos = kid.e if kid.e is not None else pos
        self.text_between(pos, node.ce, box)

    def text_between(self, a, b, box):
        if b <= a:
            return
        seg = self.src[a:b]
        last = 0
        for m in re.finditer(r'<!--.*?-->', seg, re.S):
            self.run(box, a + last, a + m.start())
            last = m.end()
        self.run(box, a + last, b)

    def attr_field(self, node, name, kind, label, g):
        v = node.attrs.get(name)
        if not v or v[1] < 0 or re.fullmatch(r'(tel:\+?|mailto:)?\{\{set\.\w+\}\}', v[0]):
            return None
        k = self.key('l' if kind == 'url' else 't')
        self.splices.append((v[1], v[2], '{{%s}}' % k))
        self.values[k] = unescape(v[0])
        g['fields'].append({'key': k, 'kind': kind, 'label': label})
        return k

    def image(self, node, pic=None):
        if node.attr('src') is None or '{{set.' in node.attr('src'):
            return
        k = self.key('img')
        val = {'src': unescape(node.attr('src')), 'alt': unescape(node.attr('alt') or '')}
        for name, prop in (('src', 'src'), ('srcset', 'srcset'), ('alt', 'alt'), ('width', 'w'), ('height', 'h')):
            v = node.attrs.get(name)
            if v and v[1] >= 0:
                self.splices.append((v[1], v[2], '{{%s.%s}}' % (k, prop)))
                if prop in ('srcset',):
                    val['srcset'] = unescape(v[0])
                if prop in ('w', 'h'):
                    val[prop] = v[0]
        raw = self.src[node.s:node.oe]
        sm = re.search(r' style="object-position:([^";]*)"', raw)
        if sm:       # the focal point of the photo (which part stays in frame when it is cropped)
            self.splices.append((node.s + sm.start(1), node.s + sm.end(1), '{{%s.pos}}' % k))
            val['pos'] = unescape(sm.group(1))
        elif pic is None and not self.lock_images:
            self.splices.append((node.oe - 1, node.oe - 1, '{{sty:%s}}' % k))
        if pic is not None:
            srcs = [c for c in pic.kids if c.tag == 'source']
            val['s'] = []
            for i, s in enumerate(srcs):
                v = s.attrs.get('srcset')
                if v and v[1] >= 0:
                    self.splices.append((v[1], v[2], '{{%s.s%d}}' % (k, i)))
                    val['s'].append(unescape(v[0]))
        g = self.group('תמונה', 'image')
        g['fields'].append({'key': k, 'kind': 'image', 'locked': self.lock_images})
        self.values[k] = val

    def scan(self, node, box):
        self.gaps_and_kids(node, box)

    def gaps_and_kids(self, node, box):
        pos = node.oe
        for kid in node.kids:
            self.text_between(pos, kid.s, box)
            pos = kid.e if kid.e is not None else pos
            if id(kid) in self.special:
                continue
            if kid.tag == 'svg' and self.ext_always and 'bicon' in kid.cls():   # the brand icon of a list item is a choice
                u = find(kid, 'use')
                v = u and u.attrs.get('href')
                if v and v[0].startswith('#b-'):
                    k = self.key('ic')
                    self.splices.append((v[1] + 3, v[2], '{{%s}}' % k)); self.values[k] = v[0][3:]
                    g = self.group('אייקון', 'icon'); g['fields'].append({'key': k, 'kind': 'icon'})
                continue
            if self.skip(kid):
                continue
            t = kid.tag
            if t == 'img':
                self.image(kid)
            elif t == 'picture':
                im = find(kid, 'img')
                if im:
                    self.image(im, kid)
            elif t == 'a' and kid.attr('href') is not None:
                g = self.group('כפתור / קישור', 'link')
                im = find(kid, 'img')
                hk = self.attr_field(kid, 'href', 'url', 'קישור', g)
                raw = self.src[kid.s:kid.oe]
                m = re.search(r' target="_blank" rel="noopener"', raw)
                if hk and m:  # external links open in a new tab; decided from the final address at render time
                    self.splices.append((kid.s + m.start(), kid.s + m.end(), '{{ext:%s}}' % hk))
                elif hk and self.ext_always:
                    self.splices.append((kid.oe - 1, kid.oe - 1, '{{ext:%s}}' % hk))
                if kid.attr('aria-label'):
                    self.attr_field(kid, 'aria-label', 'text', 'תווית לקורא מסך', g)
                nb = {'g': g, 'tag': 'a'}
                self.gaps_and_kids(kid, nb)
                if not [f for f in g['fields'] if f['kind'] == 'text']:
                    pass
            elif t == 'button':
                self.gaps_and_kids(kid, {'g': None, 'tag': 'button'})
            elif t in INLINE:
                self.gaps_and_kids(kid, box)
            elif t == 'br':
                pass
            else:
                self.gaps_and_kids(kid, {'g': None, 'tag': t})
        self.text_between(pos, node.ce, box)


def splice(src, start, end, splices, extra=()):
    """source[start:end] with the splices applied (offsets are absolute)"""
    out, pos = [], start
    for a, b, rep in sorted([s for s in list(splices) + list(extra) if s[0] >= start and s[1] <= end], key=lambda s: s[0]):
        if a < pos:
            raise ValueError(f'overlapping splice at {a}')
        out.append(src[pos:a])
        out.append(rep)
        pos = b
    out.append(src[pos:end])
    return ''.join(out)


# ---------------------------------------------------------------- global tokens (site settings)
def tokenise(src):
    gen = B.WA['general']
    pairs = [
        (gen, 'https://wa.me/{{set.waNumber}}?text={{set.waTextEnc}}'),
        (f'https://wa.me/{B.PHONE_INTL}', 'https://wa.me/{{set.waNumber}}'),
        (f'tel:+{B.PHONE_INTL}', 'tel:+{{set.phoneIntl}}'),
        (B.PHONE_HUMAN, '{{set.phone}}'),
        (B.EMAIL, '{{set.email}}'),
        ('src="/assets/brand/logo-horizontal-on-navy.svg"', 'src="{{set.logoDark}}"'),
        ('src="/assets/brand/logo-horizontal.svg"', 'src="{{set.logo}}"'),
        ('content="יוסק׳ה קליין"', 'content="{{set.siteName}}"'),
    ]
    for a, b in pairs:
        src = src.replace(a, b)
    src = re.sub(r'https://www\.facebook\.com/HaifaMyLove/(?!reviews)', '{{set.facebook}}', src)
    return src


# ---------------------------------------------------------------- one page
def head_tokens(src, seo):
    """title/description/robots/og tags become tokens; canonical + og:url/image + twitter come from {{{seo.extra}}}"""
    m = re.search(r'<title>(.*?)</title>', src, re.S)
    seo['title'] = unescape(m.group(1))
    src = src.replace(m.group(0), '<title>{{seo.title}}</title>')
    m = re.search(r'<meta name="description" content="(.*?)">', src, re.S)
    seo['description'] = unescape(m.group(1))
    src = src.replace(m.group(0), '<meta name="description" content="{{seo.description}}">')
    src = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="{{seo.robots}}">', src)
    src = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="{{seo.ogTitle}}">', src)
    src = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="{{seo.ogDescription}}">', src)
    src = re.sub(r'\n  <link rel="canonical"[^\n]*', '', src)
    src = re.sub(r'\n  <meta property="og:(url|image[^"]*)"[^\n]*', '', src)
    src = re.sub(r'\n  <meta name="twitter:card"[^\n]*', '', src)
    src = src.replace('<meta property="og:description" content="{{seo.ogDescription}}">', '<meta property="og:description" content="{{seo.ogDescription}}">{{{seo.extra}}}', 1)
    # the page-specific preloads (hero photos) stay literal; consent/measurement config is injected before </head>
    src = src.replace('</head>', '{{{head.extra}}}</head>', 1)
    return src


LIST_LABELS = {'values': 'ערכים', 'steps': 'שלבים', 'about__facts': 'עובדות', 'groups__cards': 'כרטיסי קבוצות', 'sgs__grid': 'תמונות הגלריה', 'rwall__grid': 'צילומי ההמלצות',
               'faq__list': 'שאלות ותשובות', 'abroad__facts': 'עובדות', 'abroad__cards': 'תמונות', 'ggrid': 'תמונות הגלריה', 'checks': 'נקודות', 'facts': 'עובדות', 'cardgrid': 'כרטיסים'}
TWO_OK = {'about__facts'}


def auto_lists(sec, special):
    """containers whose children are repeated items of the same shape (outermost first): they become add/remove/reorder lists"""
    out = []

    def rec(n):
        for k in n.kids:
            if id(k) in special or k.tag in SKIP_TAGS or k.attr('aria-hidden') == 'true' or k.tag == 'nav':
                continue
            kids = [x for x in k.kids if x.tag not in ('script', 'style')]
            cl = k.cls()
            need = 2 if TWO_OK & set(cl) else 3
            first = (kids[0].cls() or [''])[0] if kids else ''
            if (len(kids) >= need and k.tag in ('ul', 'ol', 'dl', 'div') and len({x.tag for x in kids}) == 1 and kids[0].tag in ('li', 'details', 'div', 'figure', 'article')
                    and all(((x.cls() or [''])[0] == first) for x in kids) and not any(x.attr('id') for x in kids) and not any(find(x, 'form') for x in kids)
                    and not any(x.attr('data-card') is not None or x.attr('role') in ('tab', 'tabpanel') for x in kids)):
                out.append(k)
                continue
            rec(k)
    rec(sec)
    return out


def container_for(root, sel):
    tag, cls = sel.split('.')
    for n in walk(root):
        if n.tag == tag and cls in n.cls():
            return n
    return None


def item_nodes(c):
    return [k for k in c.kids if k.tag not in ('script', 'style')]


def build_page(pid, fname, label, current):
    src = tokenise((ROOT / fname).read_text())
    seo = {}
    src = head_tokens(src, seo)
    src = src.replace('</body>', '  <script src="/site.js" defer data-cms></script>\n</body>', 1)
    t = Tree(src)
    html = next(k for k in t.root.kids if k.tag == 'html')
    body = next(k for k in html.kids if k.tag == 'body')
    main = next(k for k in body.kids if k.tag == 'main')
    splices = []   # (a, b, replacement) applied to the final template
    schema_sections, defaults_fields, defaults_lists, shared_sections = [], {}, {}, {}

    def region(node, name, args='', whole=False):
        a, b = (node.s, node.e) if whole else (node.oe, node.ce)
        splices.append((a, b, f'<!--cms:r {name}{(" " + args) if args else ""}--><!--/cms:r-->'))

    # ---- chrome: the top bar, the mobile menu and the footer are shared by every page (one set of fields for all of them)
    chrome_scans = {}
    for name, node in (('head', next((k for k in body.kids if k.tag == 'header'), None)), ('menu', find(body, 'div', 'menu')), ('foot', next((k for k in body.kids if k.tag == 'footer'), None))):
        if node is None:
            continue
        sc = Scan(src, f'shared.{name}.')
        sc.scan(node, {'g': None, 'tag': node.tag})
        splices.extend(sc.splices)
        chrome_scans[name] = sc
    chrome_scan = chrome_scans.get('foot')
    cur = ''

    # ---- main
    sections = [k for k in main.kids if k.tag in ('section', 'article', 'div')]
    n_anon = 0
    sec_ids = []
    for sn in sections:
        n_anon += 1
        sid = sn.attr('id') or f'blk{n_anon}'
        sec_ids.append(sid)
        special = {}
        lists = []
        regions_here = []
        # data-driven regions
        if pid == 'index' and sid == 'map':
            ch, pa = find(sn, attr='data-map-chips'), find(sn, attr='data-map-panel')
            region(ch, 'tour-chips'); region(pa, 'tour-panels'); special[id(ch)] = special[id(pa)] = 1
            regions_here += ['tour-chips', 'tour-panels']
        if pid == 'index' and sid == 'tours':
            tr = find(sn, attr='data-rail-track'); region(tr, 'tour-cards-rail'); special[id(tr)] = 1
            regions_here.append('tour-cards-rail')
        if pid == 'tours':
            ul = find(sn, 'ul', 'tgrid')
            if ul:
                region(ul, 'tour-cards-grid'); special[id(ul)] = 1
                regions_here.append('tour-cards-grid')
        for fm in [x for x in walk(sn) if x.tag == 'form']:   # lead forms are code, not content: the labels and texts around them are editable
            special[id(fm)] = 1
        for x in walk(sn):                                    # the live dates box and other scripted islands keep their own markup
            if x.attr('data-upcoming') is not None or x.attr('data-quiz') is not None:
                special[id(x)] = 1
        # lists
        for c in auto_lists(sn, special):
            cl = c.cls()
            llabel = next((v for k, v in LIST_LABELS.items() if k in cl), 'רשימת פריטים')
            ilabel = 'פריט'
            if id(c) in special:
                continue
            items = item_nodes(c)
            lkey = f'{sid}.list{len(lists) + 1}'
            scans, vals = [], []
            for it in items:
                sc = Scan(src, 'i.', special={}, ext_always=True)
                sc.scan(it, {'g': None, 'tag': it.tag})
                cv = it.attrs.get('class')   # per-item shape/modifier classes survive duplication
                if cv and cv[1] >= 0:
                    sc.splices.append((cv[1], cv[2], '{{i.cls}}')); sc.values['i.cls'] = unescape(cv[0])
                scans.append(sc); vals.append(sc.values)
            sig = lambda sc: ([(f['key'], f['kind']) for g in sc.groups for f in g['fields']], 'i.cls' in sc.values)
            if any(sig(s) != sig(scans[-1]) for s in scans):
                print(f'  ! list {pid}/{lkey} ({'.'.join(c.cls())}): items differ in structure, left as plain content', file=sys.stderr)
                continue
            # attributes that differ between items at the same position (colour modifiers of icons and dots, inline styles) stay per item
            seqs = [[n for n in walk(it)] for it in items]
            if len({len(q) for q in seqs}) == 1 and all([n.tag for n in q] == [n.tag for n in seqs[0]] for q in seqs):
                na = 0
                for pos in range(len(seqs[0])):
                    for an in sorted({k for q in seqs for k in q[pos].attrs if k in ('class', 'style') or k.startswith('data-')}):
                        av = [q[pos].attrs.get(an) for q in seqs]
                        if (all(v is not None and v[1] >= 0 for v in av) and len({v[0] for v in av}) > 1\
                                and not any(a < av[-1][2] and av[-1][1] < b for a, b, _ in scans[-1].splices)):
                            na += 1
                            tk = f'i.a{na}'
                            for sc, v in zip(scans, av):
                                sc.values[tk] = unescape(v[0])
                            lv = av[-1]
                            scans[-1].splices.append((lv[1], lv[2], '{{%s}}' % tk))
            last = items[-1]
            tpl = splice(src, last.s, last.e, scans[-1].splices)
            if last.tag == 'details':
                tpl = tpl.replace('<details>', '<details{{#if first}} open{{/if}}>', 1).replace('<details open>', '<details{{#if first}} open{{/if}}>', 1)
            splices.append((c.oe, c.ce, f'<!--cms:list {lkey}-->{tpl}<!--/cms:list-->'))
            special[id(c)] = 1
            defaults_lists[lkey] = vals
            lists.append({'key': lkey, 'label': llabel, 'itemLabel': ilabel, 'groups': scans[-1].groups,
                          'min': 0, 'hasImages': any(f['kind'] == 'image' for g in scans[-1].groups for f in g['fields'])})
        sc = Scan(src, f'{sid}.', lock_images=(pid, sid) in LOCK_IMAGES, special=special)
        sc.scan(sn, {'g': None, 'tag': sn.tag})
        splices.extend(sc.splices)
        defaults_fields.update(sc.values)
        # dependencies: anchors that other parts of the page point to
        deps = []
        if sn.attr('id'):
            rail = [x for x in walk(body) if x.attr('data-rail-link') == sid]
            navs = [x for x in walk(body) if (x.attr('href') or '') in (f'#{sid}', f'/#{sid}') and x.attr('data-rail-link') is None]
            if rail:
                deps.append('ניווט הצד והתפריט התחתון בדף')
            if navs:
                deps.append('קישורי עוגן אל הסקשן (' + ', '.join(sorted({unescape(re.sub(r"<[^>]+>", "", src[x.oe:x.ce]).strip()) or 'קישור' for x in navs})[:4]) + ')')
        scripted = any(k.startswith('data-') and k not in ('data-reveal',) for x in [sn] + list(walk(sn)) for k in x.attrs) and sid in ('top', 'map', 'moments', 'reviews', 'trail')
        head = find(sn, cls='duo-title') or find(sn, 'h1') or find(sn, 'h2') or find(sn, 'h3')
        title = unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', src[head.oe:head.ce])).strip()) if head else ''
        lab = SECTION_LABELS.get(sid) or (title[:48] if title else f'בלוק {n_anon}')
        schema_sections.append({
            'id': sid, 'label': lab, 'title': title[:80], 'locked': sid in LOCKED.get(pid, set()), 'scripted': scripted,
            'groups': sc.groups, 'lists': lists, 'regions': regions_here, 'deps': deps,
        })
    # wrap sections: markers go around each top-level block of main
    for sid, sn in zip(sec_ids, sections):
        splices.append((sn.s, sn.s, f'<!--cms:s {sid}-->'))
        splices.append((sn.e, sn.e, f'<!--/cms:s {sid}-->'))
    # section markers are zero-width: apply them last at equal offsets; others first
    tpl = apply_all(src, splices)
    return {'tpl': tpl, 'seo': seo, 'sections': schema_sections, 'fields': defaults_fields, 'lists': defaults_lists,
            'chrome': chrome_scan, 'chromes': chrome_scans, 'current': current}


def apply_all(src, splices):
    # sort: by start; zero-width inserts that begin a section come before content, end markers after
    order = sorted(splices, key=lambda s: (s[0], s[1] - s[0]))
    out, pos = [], 0
    for a, b, rep in order:
        if a < pos:
            raise ValueError(f'overlap at {a} < {pos}: {rep[:60]}')
        out.append(src[pos:a]); out.append(rep); pos = b
    out.append(src[pos:])
    return ''.join(out)


# ---------------------------------------------------------------- tours
def photo_info(name, pos=''):
    """what B.photo() needs, so the runtime can rebuild the same <img>"""
    from PIL import Image
    variants = []
    for n in (480, 960, 1920):
        f = ROOT / f'assets/approved/{name}-{n}.webp'
        if f.exists():
            w = Image.open(f).width
            if w not in [v[0] for v in variants]:
                variants.append((w, n))
    w, h = Image.open(ROOT / f'assets/approved/{name}-{variants[-1][1]}.webp').size
    return {'src': f'/assets/approved/{name}-960.webp', 'srcset': ', '.join(f'/assets/approved/{name}-{n}.webp {wd}w' for wd, n in variants), 'w': w, 'h': h, 'pos': pos}


def tours_defaults():
    out = []
    for i, t in enumerate(B5.TOURS):
        cname, cpos = (t['photo'] + ('50% 50%',))[:2] if isinstance(t['photo'], (tuple, list)) else (t['photo'], t.get('pos', '50% 50%'))
        hidden = bool(t.get('hidden'))
        out.append({
            'id': t['slug'], 'slug': t['slug'], 'name': t['name'], 'place': t.get('place', ''), 'blurb': t.get('blurb', ''), 'fit': t.get('fit', ''), 'btn': t.get('btn') or f'לפרטי {t["name"]}',
            'stops': t.get('stops', []), 'duration': t.get('duration', ''), 'page': not hidden, 'dates': [],
            'card': dict(photo_info(cname, cpos), alt=''), 'status': 'hidden' if hidden else 'published', 'home': not hidden, 'featured': not hidden, 'order': i,
        })
    return out


def media_index(defaults):
    """the pictures that already ship with the site, so the library can offer them (name, size, the alt text used today)"""
    from PIL import Image
    seen, out = {}, []

    def walk_vals(v):
        if isinstance(v, dict):
            if 'src' in v and isinstance(v['src'], str):
                yield v
            for x in v.values():
                yield from walk_vals(x)
        elif isinstance(v, list):
            for x in v:
                yield from walk_vals(x)

    for im in walk_vals([defaults['pages'], defaults['tours'], defaults['shared']]):
        u = im['src']
        if u.startswith('/assets/') and u not in seen:
            seen[u] = im.get('alt', '')
    for f in sorted((ROOT / 'assets/approved').glob('*-960.webp')):
        seen.setdefault(f'/assets/approved/{f.name}', '')
    for f in sorted((ROOT / 'assets/photos').glob('*-sm.jpg')):
        seen.setdefault(f'/assets/photos/{f.name}', '')
    for u, alt in seen.items():
        f = ROOT / u.lstrip('/')
        if not f.exists():
            continue
        w, h = Image.open(f).size
        name = f.stem.replace('-960', '').replace('-sm', '')
        out.append({'id': 'b-' + re.sub(r'\W+', '-', u.strip('/'))[-60:], 'url': u, 'name': name, 'w': w, 'h': h, 'alt': alt, 'pos': '50% 50%', 'group': u.split('/')[2]})
    return out


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / 'templates').mkdir(exist_ok=True)
    defaults = {'version': 2, 'pages': {}, 'shared': {'fields': {}}}
    schema = {'version': 2, 'pages': {}, 'shared': {}}
    SHARED_LABEL = {'head': 'כותרת עליונה ותפריט', 'menu': 'תפריט במובייל', 'foot': 'פוטר האתר'}
    for pid, fname, path, label, cur in PAGES:
        print('extract', pid, fname)
        r = build_page(pid, fname, label, cur)
        (OUT / 'templates' / f'{pid}.html').write_text(r['tpl'])
        seo = dict(r['seo'])
        if pid in NOINDEX_DEFAULT:
            seo['noindex'] = True
        defaults['pages'][pid] = {'path': path, 'seo': seo, 'fields': r['fields'], 'lists': r['lists'], **({'tour': pid[5:]} if pid.startswith('tour-') else {})}
        schema['pages'][pid] = {'id': pid, 'label': label, 'path': path, 'current': cur, 'sections': r['sections'], 'order': [s['id'] for s in r['sections']], **({'tour': pid[5:]} if pid.startswith('tour-') else {})}
        for name, sc in r['chromes'].items():
            if name not in schema['shared']:
                schema['shared'][name] = {'label': SHARED_LABEL[name], 'groups': sc.groups}
                defaults['shared']['fields'].update(sc.values)
            else:
                same = all(defaults['shared']['fields'].get(k) == v for k, v in sc.values.items())
                if not same:
                    diff = [k for k, v in sc.values.items() if defaults['shared']['fields'].get(k) != v][:3]
                    print(f'  ! shared {name} differs on {pid}: {diff}', file=sys.stderr)
    defaults['tours'] = tours_defaults()
    # 19.11.2026: sections the home page starts with as "added sections" (the owner edits, hides, moves or deletes them in the
    # admin like any section he added himself): the upcoming tours (items empty until he adds a tour) and the client logos
    # (not shown until logos are uploaded). Nothing invented: the texts and links are the ones the upcoming section had.
    # 22.11.2026 (owner): the section shows his real tours right away, each with its photo, a line, and a register-and-pay
    # button that opens his payment page (no dates are invented: the owner adds a date per tour in the admin when there is one)
    TRIPS = [{'id': 't-' + t['slug'], 'tour': t['slug'], 'title': t['name'], 'text': t.get('place', ''),
              'img': {'src': t['card']['src'], 'w': t['card'].get('w', ''), 'h': t['card'].get('h', ''), 'alt': t['name'], 'pos': t['card'].get('pos', '')},
              'reg': {'label': 'להרשמה ותשלום', 'href': B.TAKBULL}}
             for t in defaults['tours'] if t.get('status') == 'published' and t.get('card')]
    defaults['pages']['index']['custom'] = {
        'c-logos01': {'type': 'logos', 'c': {'t1': 'כבר יצאנו', 't2': 'לדרך *עם*'}, 'd': {'bg': 'white', 'pad': 's', 'align': 'center', 'accent': 'orange'}, 'items': []},
        'c-trips01': {'type': 'trips', 'c': {
            't1': 'רוצים להצטרף לסיור בלי לארגן קבוצה משלכם?', 't2': 'הסיורים *הקרובים*',
            'body': 'כאן מופיעים הסיורים הפתוחים להרשמה. בעמוד ההרשמה מחכים כל המועדים, הפרטים ואפשרות להזמין מקום ולשלם.',
            'link': {'label': 'למועדים, הרשמה ותשלום', 'href': B.TAKBULL}, 'link2': {'label': 'לקטלוג בוואטסאפ', 'href': 'https://wa.me/c/972544361667'}, 'link3': {'label': 'לא בטוחים? לשאלון ההתאמה', 'href': '/quiz.html'}},
            'd': {'bg': 'sunsoft', 'pad': 'm', 'align': 'start', 'width': 'wide', 'accent': 'sun', 'shape': 'moon', 'cols': '3', 'btn': 'sun', 'reveal': 'rise', 'anchor': 'upcoming'}, 'items': TRIPS},
    }
    ids = schema['pages']['index']['order']
    order = list(ids)
    order.insert(order.index('top') + 1, 'c-logos01')
    order.insert(order.index('tours') + 1, 'c-trips01')
    defaults['pages']['index']['order'] = order
    defaults['settings'] = {
        'siteName': 'יוסק׳ה קליין', 'phone': B.PHONE_HUMAN, 'whatsapp': B.PHONE_INTL, 'waText': 'היי יוסק׳ה, הגענו דרך האתר ונשמח לתכנן טיול.',
        'email': B.EMAIL, 'facebook': B.base.FB_PAGE, 'instagram': '', 'logo': '/assets/brand/logo-horizontal.svg', 'logoDark': '/assets/brand/logo-horizontal-on-navy.svg',
        'siteUrl': B.SITE_URL, 'indexable': bool(B.LAUNCH), 'ogImage': B.OG_IMAGE,
    }
    defaults['forms'] = {}
    defaults['redirects'] = [{'from': a, 'to': b, 'auto': True} for a, b in REDIRECT_STUBS]
    (OUT / 'media-index.json').write_text(json.dumps(media_index(defaults), ensure_ascii=False, indent=0))
    (OUT / 'defaults.json').write_text(json.dumps(defaults, ensure_ascii=False, indent=1))
    (OUT / 'schema.json').write_text(json.dumps(schema, ensure_ascii=False, indent=1))
    n_f = sum(len(p['fields']) for p in defaults['pages'].values())
    print(f'ok: {len(PAGES)} templates, {n_f} fields, {sum(len(p["lists"]) for p in defaults["pages"].values())} lists, {len(defaults["tours"])} tours')


if __name__ == '__main__':
    main()
