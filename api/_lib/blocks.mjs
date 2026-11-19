// Custom sections ("blocks") the owner adds from the admin. Each block is a type from a fixed library, built from the site's
// own design language (duo titles, soft boxes with the navy base, pill buttons, arch-topped photos), with design options that
// stay inside the brand (backgrounds, spacing, alignment, width, accent colour, image shape, columns, button style, entrance).
// The same spec is sent to the admin (labels, defaults, which fields a type has), validated here, and rendered here.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const txt = (v, n = 600) => String(v ?? '').replace(/\{\{|\}\}/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);

export const ID_RE = /^c-[a-z0-9]{4,16}$/;
export const MAX_BLOCKS = 40;

// ------------------------------------------------------------------ design options (value -> Hebrew label)
export const DESIGN = {
  bg: { label: 'רקע', options: { white: 'לבן', paper: 'אפור בהיר', sky: 'שמיים', sea: 'ים', sunsoft: 'שמש רכה', navy: 'כחול לילה' } },
  pad: { label: 'מרווח מלמעלה ומלמטה', options: { s: 'צפוף', m: 'רגיל', l: 'מרווח' } },
  align: { label: 'יישור הכותרת', options: { start: 'לימין', center: 'למרכז' } },
  width: { label: 'רוחב התוכן', options: { narrow: 'צר', normal: 'רגיל', wide: 'רחב' } },
  accent: { label: 'צבע ההדגשה בכותרת', options: { orange: 'כתום', teal: 'טורקיז', leaf: 'ירוק', sun: 'צהוב' } },
  shape: { label: 'צורת התמונות', options: { moon: 'קשת', box: 'פינות רכות', circle: 'עיגול' } },
  side: { label: 'צד התמונה', options: { start: 'מימין', end: 'משמאל' } },
  cols: { label: 'מספר עמודות', options: { 2: '2', 3: '3', 4: '4' } },
  btn: { label: 'סגנון הכפתור', options: { sun: 'צהוב', ink: 'כחול', line: 'מתאר' } },
  reveal: { label: 'כניסה בגלילה', options: { rise: 'עלייה עדינה', none: 'ללא' } },
};

// ------------------------------------------------------------------ the library
// c: content fields (kind: text | long | link | image), items: repeating items, d: design options this type uses + defaults
const HEAD = ['kicker', 't1', 't2', 'body'];
export const TYPES = {
  text: {
    label: 'כותרת וטקסט', desc: 'כותרת בשני משקלים, פסקאות וכפתור. מתאים להסבר קצר או לפתיחה של נושא.',
    c: [...HEAD, 'link'], d: { bg: 'white', pad: 'm', align: 'start', width: 'narrow', accent: 'orange', btn: 'sun', reveal: 'rise' },
    sample: { t1: 'כמה מילים על', t2: 'הדרך *שלנו*', body: 'כתבו כאן פסקה או שתיים. שורה ריקה מתחילה פסקה חדשה.', link: { label: 'לדבר עם יוסק׳ה', href: 'wa' } },
  },
  split: {
    label: 'תמונה וטקסט', desc: 'תמונה גדולה לצד כותרת, טקסט וכפתור. אפשר לבחור באיזה צד התמונה.',
    c: [...HEAD, 'link', 'img'], d: { bg: 'white', pad: 'm', align: 'start', width: 'normal', accent: 'orange', shape: 'moon', side: 'start', btn: 'sun', reveal: 'rise' },
    sample: { t1: 'מה מחכה', t2: 'לכם *בדרך*', body: 'תיאור קצר של החוויה, המקום או הקבוצה.', link: { label: 'לפרטים', href: '/contact.html' } },
  },
  banner: {
    label: 'תמונת רוחב', desc: 'תמונה על כל רוחב המסך עם כותרת וכפתור מעליה. טוב למעבר בין נושאים.',
    c: ['kicker', 't1', 't2', 'body', 'link', 'img'], d: { pad: 'l', align: 'start', accent: 'sun', btn: 'sun', reveal: 'rise' },
    sample: { t1: 'חיפה', t2: 'כמו *שלא* הכרתם', link: { label: 'לסיורים', href: '/tours/' } },
  },
  cards: {
    label: 'כרטיסים', desc: 'שניים עד ארבעה כרטיסים בשורה, עם תמונה, כותרת, טקסט וקישור.',
    c: HEAD, items: { label: 'כרטיס', max: 12, f: ['img', 'title', 'text', 'link'] },
    d: { bg: 'paper', pad: 'm', align: 'start', width: 'wide', accent: 'orange', shape: 'moon', cols: '3', reveal: 'rise' },
    sample: { t1: 'שלוש דרכים', t2: 'לצאת *לדרך*' },
    sampleItems: [{ title: 'למשפחות', text: 'חידות ומשימות שגם הילדים באמת משתתפים בהן.', link: { label: 'לפרטים', href: '/families.html' } },
      { title: 'לארגונים', text: 'יום גיבוש עם תוכן שמחזיק את הקבוצה.', link: { label: 'לפרטים', href: '/orgs.html' } },
      { title: 'לקבוצות פרטיות', text: 'סיור קיים או יום שנבנה בדיוק בשבילכם.', link: { label: 'לפרטים', href: '/private-groups.html' } }],
  },
  quote: {
    label: 'ציטוט או המלצה', desc: 'משפט אחד גדול ממי שכבר טייל, עם שם ותמונה קטנה.',
    c: ['quote', 'name', 'role', 'img'], d: { bg: 'sea', pad: 'l', align: 'center', width: 'narrow', accent: 'orange', reveal: 'rise' },
    sample: { quote: 'כתבו כאן את המשפט שהכי מתאר את החוויה.', name: 'שם המטייל', role: 'קבוצה, חברה או עיר' },
  },
  cta: {
    label: 'קריאה לפעולה', desc: 'תיבה בולטת עם כותרת, משפט וכפתור לוואטסאפ, טלפון או עמוד אחר.',
    c: ['t1', 't2', 'body', 'link', 'link2'], d: { bg: 'white', pad: 'm', align: 'center', width: 'normal', accent: 'orange', btn: 'sun', reveal: 'rise' },
    sample: { t1: 'רוצים שיוסק׳ה', t2: 'יחזור *אליכם*?', body: 'כתבו בקצרה מי מגיע ומתי, והוא יחזור עם כיוון מתאים.', link: { label: 'לכתוב בוואטסאפ', href: 'wa' }, link2: { label: 'או להתקשר', href: 'tel' } },
  },
  faq: {
    label: 'שאלות ותשובות', desc: 'רשימת שאלות שנפתחות בלחיצה.',
    c: HEAD, items: { label: 'שאלה', max: 30, f: ['q', 'a'] }, d: { bg: 'white', pad: 'm', align: 'start', width: 'narrow', accent: 'orange', reveal: 'none' },
    sample: { t1: 'רגע,', t2: 'ומה *לגבי*...?' },
    sampleItems: [{ q: 'כמה זמן נמשך הסיור?', a: 'בין שעתיים וחצי לשש שעות, לפי המסלול.' }, { q: 'אפשר לתאם לקבוצה פרטית?', a: 'כן. כתבו ליוסק׳ה ונבנה יחד את היום.' }],
  },
  gallery: {
    label: 'גלריית תמונות', desc: 'כמה תמונות בשורה, עם כיתוב קצר מתחת לכל אחת.',
    c: HEAD, items: { label: 'תמונה', max: 24, f: ['img', 'cap'] }, d: { bg: 'white', pad: 'm', align: 'start', width: 'wide', accent: 'teal', shape: 'box', cols: '3', reveal: 'rise' },
    sample: { t1: 'רגעים', t2: 'מהדרך' }, sampleItems: [],
  },
  facts: {
    label: 'מספרים ועובדות', desc: 'שורה של מספרים גדולים עם הסבר קצר, למשל שנות ניסיון או מספר קבוצות.',
    c: HEAD, items: { label: 'עובדה', max: 6, f: ['num', 'label'] }, d: { bg: 'sky', pad: 'm', align: 'center', width: 'wide', accent: 'orange', cols: '3', reveal: 'rise' },
    sample: { t1: 'יוסק׳ה', t2: 'במספרים' },
    sampleItems: [{ num: '10+', label: 'שנים של הדרכה' }, { num: '6', label: 'מסלולים בחיפה' }, { num: '1', label: 'יוסק׳ה אחד' }],
  },
};

export const FIELD = {
  kicker: { kind: 'text', label: 'כותרת קטנה מעל (לא חובה)', max: 60 },
  t1: { kind: 'text', label: 'שורת כותרת עליונה (דקה)', max: 120 },
  t2: { kind: 'text', label: 'שורת כותרת מודגשת', hint: 'מילה בין כוכביות, *כך*, תיצבע בצבע ההדגשה.', max: 120 },
  body: { kind: 'long', label: 'טקסט', hint: 'שורה ריקה מתחילה פסקה חדשה.', max: 2400 },
  link: { kind: 'link', label: 'כפתור' }, link2: { kind: 'link', label: 'קישור נוסף (לא חובה)' },
  img: { kind: 'image', label: 'תמונה' },
  quote: { kind: 'long', label: 'הציטוט', max: 600 }, name: { kind: 'text', label: 'שם', max: 80 }, role: { kind: 'text', label: 'תיאור קצר (לא חובה)', max: 120 },
  title: { kind: 'text', label: 'כותרת', max: 100 }, text: { kind: 'long', label: 'טקסט', max: 600 },
  q: { kind: 'text', label: 'שאלה', max: 200 }, a: { kind: 'long', label: 'תשובה', max: 1500 },
  cap: { kind: 'text', label: 'כיתוב (לא חובה)', max: 140 },
  num: { kind: 'text', label: 'המספר', max: 12 }, label: { kind: 'text', label: 'מה הוא אומר', max: 80 },
};

/** what the admin needs: labels, fields, design options, defaults, samples */
export function spec() { return { types: TYPES, fields: FIELD, design: DESIGN, max: MAX_BLOCKS }; }

// ------------------------------------------------------------------ validation
const cleanHref = (v) => {
  const s = String(v ?? '').trim().slice(0, 500);
  if (['wa', 'tel', 'mail', ''].includes(s)) return s;
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s) && !/^\s*javascript:/i.test(s)) return s.replace(/["<>\s]/g, '');
  return '';
};
const cleanImg = (v) => {
  if (!v || typeof v !== 'object') return null;
  const src = String(v.src || '').trim();
  if (!/^(\/|https:\/\/)/.test(src) || /["<>\s]/.test(src)) return null;
  return { src: src.slice(0, 500), w: txt(v.w, 6).replace(/\D/g, ''), h: txt(v.h, 6).replace(/\D/g, ''), alt: txt(v.alt, 300), pos: /^\d{1,3}% \d{1,3}%$/.test(v.pos || '') ? v.pos : '' };
};
function cleanField(k, v) {
  const f = FIELD[k];
  if (!f) return undefined;
  if (f.kind === 'image') return cleanImg(v);
  if (f.kind === 'link') return v && typeof v === 'object' ? { label: txt(v.label, 60), href: cleanHref(v.href) } : null;
  return txt(v, f.max || 600);
}
export function cleanBlock(b) {
  const T = TYPES[b?.type];
  if (!T) throw Object.assign(new Error('סוג סקשן לא מוכר.'), { status: 400 });
  const out = { type: b.type, c: {}, d: {} };
  for (const k of T.c) { const v = cleanField(k, b.c?.[k]); if (v != null && v !== '') out.c[k] = v; }
  for (const [k, def] of Object.entries(T.d)) { const v = String(b.d?.[k] ?? def); out.d[k] = Object.hasOwn(DESIGN[k].options, v) ? v : def; }
  const anchor = String(b.d?.anchor || '').trim().toLowerCase();
  if (anchor && /^[a-z][a-z0-9-]{1,30}$/.test(anchor)) out.d.anchor = anchor;
  if (T.items) {
    const arr = Array.isArray(b.items) ? b.items.slice(0, T.items.max) : [];
    out.items = arr.map((it) => { const r = { id: txt(it?.id, 24).replace(/[^\w-]/g, '') || Math.random().toString(36).slice(2, 8) }; for (const k of T.items.f) { const v = cleanField(k, it?.[k]); if (v != null && v !== '') r[k] = v; } return r; });
  }
  return out;
}

// ------------------------------------------------------------------ rendering
const marked = (s, accent) => esc(s).replace(/\*([^*]{1,80})\*/g, `<span class="hl hl--${accent}">$1</span>`);
const paras = (s, cls = '') => String(s || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const hrefOf = (h) => (h === 'wa' ? 'https://wa.me/{{set.waNumber}}?text={{set.waTextEnc}}' : h === 'tel' ? 'tel:+{{set.phoneIntl}}' : h === 'mail' ? 'mailto:{{set.email}}' : esc(h));
const ext = (h) => (h === 'wa' || /^https?:/i.test(h) ? ' target="_blank" rel="noopener"' : '');
function btn(l, style, dark) {
  if (!l?.label || !l.href) return '';
  const cls = style === 'ink' ? (dark ? 'btn--on-ink' : 'btn--ink') : style === 'line' ? (dark ? 'btn--on-ink' : 'btn--line') : 'btn--sun';
  return `<a class="btn ${cls}" href="${hrefOf(l.href)}"${ext(l.href)}>${esc(l.label)}${l.href === 'wa' || /^https?:/i.test(l.href) ? '<span class="visually-hidden"> (נפתח בלשונית חדשה)</span>' : ''}</a>`;
}
const textlink = (l) => (l?.label && l.href ? `<a class="textlink" href="${hrefOf(l.href)}"${ext(l.href)}>${esc(l.label)}</a>` : '');
function img(im, sizes, cls = '') {
  if (!im?.src) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(im.src)}"${im.w ? ` width="${esc(im.w)}" height="${esc(im.h)}"` : ''} sizes="${esc(sizes)}" alt="${esc(im.alt || '')}" loading="lazy" decoding="async"${im.pos ? ` style="object-position:${esc(im.pos)}"` : ''}>`;
}
function head(c, d, hid, { body = true } = {}) {
  const t1 = c.t1 ? `<span class="duo-title__light">${esc(c.t1)}</span>` : '';
  const t2 = c.t2 ? `<span class="duo-title__bold">${marked(c.t2, d.accent || 'orange')}</span>` : '';
  if (!t1 && !t2 && !c.kicker && !(body && c.body)) return '';
  return `<div class="cb__head">${c.kicker ? `<p class="cb__kicker">${esc(c.kicker)}</p>` : ''}${t1 || t2 ? `<h2 class="duo-title cb__title" id="${hid}">${t1}${t1 && t2 ? ' ' : ''}${t2}</h2>` : ''}${body && c.body ? `<div class="cb__body">${paras(c.body)}</div>` : ''}</div>`;
}

export function renderBlock(cid, b) {
  const T = TYPES[b.type];
  if (!T) return '';
  const d = { ...T.d, ...(b.d || {}) }, c = b.c || {}, items = b.items || [];
  const dark = d.bg === 'navy' || b.type === 'banner';
  const hid = `${cid}-t`;
  const rv = d.reveal === 'rise' ? ' data-reveal' : '';
  const cls = ['cb', `cb--${b.type}`, `cb-bg--${b.type === 'banner' ? 'img' : d.bg || 'white'}`, `cb-pad--${d.pad || 'm'}`, `cb-al--${d.align || 'start'}`, `cb-w--${d.width || 'normal'}`,
    d.shape ? `cb-shape--${d.shape}` : '', d.cols ? `cb-cols--${d.cols}` : '', `cb-ac--${d.accent || 'orange'}`, d.side ? `cb-side--${d.side}` : '', dark ? 'cb--dark' : '', b.type === 'faq' ? 'faq' : ''].filter(Boolean).join(' ');
  const hasTitle = !!(c.t1 || c.t2);
  const open = `<section class="${cls}" id="${esc(d.anchor || cid)}" data-cb="${cid}"${hasTitle ? ` aria-labelledby="${hid}"` : ' aria-label="' + esc(T.label) + '"'}>`;
  let inner = '';
  switch (b.type) {
    case 'text':
      inner = `<div class="wrap cb__in"${rv}>${head(c, d, hid)}${c.link?.label ? `<div class="btnrow cb__acts">${btn(c.link, d.btn, dark)}</div>` : ''}</div>`;
      break;
    case 'split':
      inner = `<div class="wrap cb__in cb-split">${c.img?.src ? `<figure class="cb-split__media cb-media"${rv}>${img(c.img, '(min-width: 900px) 46vw, 92vw')}</figure>` : ''}<div class="cb-split__text"${rv}>${head(c, d, hid)}${c.link?.label ? `<div class="btnrow cb__acts">${btn(c.link, d.btn, dark)}</div>` : ''}</div></div>`;
      break;
    case 'banner':
      inner = `${c.img?.src ? `<div class="cb-banner__media">${img(c.img, '100vw')}</div>` : ''}<div class="wrap cb__in cb-banner__in"${rv}>${head(c, d, hid)}${c.link?.label ? `<div class="btnrow cb__acts">${btn(c.link, d.btn, true)}</div>` : ''}</div>`;
      break;
    case 'cards':
      inner = `<div class="wrap cb__in">${head(c, d, hid)}<ul class="cb-cards" role="list">${items.map((it) => `<li class="cb-card"${rv}>${it.img?.src ? `<div class="cb-card__media cb-media">${img(it.img, '(min-width: 1000px) 30vw, (min-width: 600px) 46vw, 92vw')}</div>` : ''}<div class="cb-card__body">${it.title ? `<h3 class="cb-card__t">${esc(it.title)}</h3>` : ''}${it.text ? paras(it.text) : ''}${it.link?.label && it.link.href ? `<a class="btn btn--line btn--sm cb-card__a" href="${hrefOf(it.link.href)}"${ext(it.link.href)}>${esc(it.link.label)}${it.title ? `<span class="visually-hidden">: ${esc(it.title)}</span>` : ''}</a>` : ''}</div></li>`).join('')}</ul></div>`;
      break;
    case 'quote':
      inner = `<div class="wrap cb__in"${rv}><figure class="cb-quote"><svg class="cb-quote__mark" viewBox="0 0 64 48" aria-hidden="true"><path d="M27 4C13 9 5 19 5 32c0 7 4 12 10 12 6 0 10-4 10-10 0-5-4-9-9-9-1 0-2 0-3 1 1-7 7-13 16-17zm32 0C45 9 37 19 37 32c0 7 4 12 10 12 6 0 10-4 10-10 0-5-4-9-9-9-1 0-2 0-3 1 1-7 7-13 16-17z"/></svg><blockquote class="cb-quote__q">${paras(c.quote)}</blockquote>${c.name ? `<figcaption class="cb-quote__who">${c.img?.src ? img(c.img, '64px', 'cb-quote__img') : ''}<span><b>${esc(c.name)}</b>${c.role ? `<span>${esc(c.role)}</span>` : ''}</span></figcaption>` : ''}</figure></div>`;
      break;
    case 'cta':
      inner = `<div class="wrap cb__in"><div class="cb-cta"${rv}>${head(c, d, hid)}<div class="btnrow cb__acts">${btn(c.link, d.btn, false)}${textlink(c.link2)}</div></div></div>`;
      break;
    case 'faq':
      inner = `<div class="wrap cb__in">${head(c, d, hid)}<div class="faq__list cb-faq">${items.filter((it) => it.q).map((it) => `<details><summary>${esc(it.q)}<i aria-hidden="true"></i></summary>${paras(it.a)}</details>`).join('')}</div></div>`;
      break;
    case 'gallery':
      inner = `<div class="wrap cb__in">${head(c, d, hid)}<ul class="cb-gallery" role="list">${items.filter((it) => it.img?.src).map((it) => `<li${rv}><figure class="cb-gallery__f"><div class="cb-media">${img(it.img, '(min-width: 1000px) 30vw, 46vw')}</div>${it.cap ? `<figcaption>${esc(it.cap)}</figcaption>` : ''}</figure></li>`).join('')}</ul></div>`;
      break;
    case 'facts':
      inner = `<div class="wrap cb__in">${head(c, d, hid)}<dl class="cb-facts">${items.filter((it) => it.num).map((it) => `<div class="cb-fact"${rv}><dt class="cb-fact__n">${marked(it.num.replace(/^\*|\*$/g, ''), d.accent)}</dt><dd>${esc(it.label || '')}</dd></div>`).join('')}</dl></div>`;
      break;
    default: return '';
  }
  return `${open}${inner}</section>`;
}
