// טיולים: the list of tours (what shows in the home rail, the map, the list page and each tour page) and the tour editor.
import { h, icon, api, toast, confirmDialog, pickMedia, clone, rid, statusTag } from './ui.js';
import { S, touch, saveDraft, onChange } from './state.js';
import { go, publishFlow } from './app.js';

const STATE = { published: ['מפורסם', 'ok'], hidden: ['מוסתר', 'mute'], archived: ['בארכיון', 'mute'] };
const hasPage = (t) => !!t.page;
let counts = {};

export async function render(root, params) {
  try { const r = await api('GET', '/api/admin/leads?limit=1000&view='); counts = {}; for (const l of r.leads) if (l.tour) counts[l.tour] = (counts[l.tour] || 0) + 1; } catch { counts = {}; }
  if (params.a) {
    if (params.a === 'new') return addNew();
    const t = S.tours.find((x) => x.slug === params.a);
    if (t) return editor(root, t, params.q);
  }
  return list(root);
}

function sortTours() { S.tours.sort((a, b) => a.order - b.order); S.tours.forEach((t, i) => (t.order = i)); }
function addNew() {
  const n = S.tours.length + 1;
  const base = clone(S.tours[0] || S.defaults.tours[0]);
  const slug = 'tour-' + rid().slice(0, 4);
  Object.assign(base, { id: slug, slug, name: 'סיור חדש', place: '', blurb: '', fit: '', btn: 'לשאול על הסיור', stops: [], duration: '', page: false, dates: [], status: 'hidden', home: false, featured: false, order: n });
  S.tours.push(base); touch('tours'); go('#/tours/' + slug);
}

function list(root) {
  sortTours();
  const savebar = savebarEl();
  const out = h('div', { class: 'grid', style: 'gap:12px' });
  const paint = () => {
    out.replaceChildren(...S.tours.map((t, i) => {
      const [stl, stc] = STATE[t.status] || STATE.hidden;
      return h('article', { class: 'glass tourrow' + (t.status !== 'published' ? ' is-off' : '') },
        h('div', { class: 'thumb tourrow__img' }, h('img', { src: t.card?.src || '', alt: '' })),
        h('div', { class: 'tourrow__main' }, h('a', { class: 'tourrow__name', href: '#/tours/' + t.slug, text: t.name }), h('span', { class: 'count', text: t.place || (hasPage(t) ? '' : 'אין עדיין עמוד לטיול: הכרטיס מפנה לוואטסאפ') }),
          h('div', { class: 'tourrow__tags' }, h('span', { class: `tag tag--${stc === 'ok' ? 'new' : 'mute'}`, text: stl }), t.home ? h('span', { class: 'tag', text: 'בדף הבית' }) : null, t.featured && hasPage(t) ? h('span', { class: 'tag', text: 'במפה' }) : null,
            h('a', { class: 'btn btn--sm btn--ghost', href: '#/leads?tour=' + t.slug, text: `${counts[t.slug] || 0} פניות` }))),
        h('div', { class: 'tourrow__act' },
          h('button', { class: 'btn btn--sm btn--icon', type: 'button', 'aria-label': 'העלאה בסדר', disabled: i === 0, onclick: () => move(i, -1) }, icon('up')), h('button', { class: 'btn btn--sm btn--icon', type: 'button', 'aria-label': 'הורדה בסדר', disabled: i === S.tours.length - 1, onclick: () => move(i, 1) }, icon('down')),
          h('a', { class: 'btn btn--sm', href: '#/tours/' + t.slug }, 'עריכה'), hasPage(t) ? h('a', { class: 'btn btn--sm', href: '#/pages/tour-' + t.slug }, 'עמוד הטיול') : null,
          h('button', { class: 'btn btn--sm btn--icon', type: 'button', 'aria-label': 'שכפול', title: 'שכפול', onclick: () => dup(t) }, icon('copy')),
          h('button', { class: 'btn btn--sm btn--icon', type: 'button', 'aria-label': t.status === 'published' ? 'הסתרה' : 'פרסום', title: t.status === 'published' ? 'הסתרה' : 'החזרה לפרסום', onclick: () => { t.status = t.status === 'published' ? 'hidden' : 'published'; touch('tours'); paint(); } }, icon(t.status === 'published' ? 'eyeoff' : 'eye'))));
    }));
  };
  function move(i, d) { const j = i + d; [S.tours[i], S.tours[j]] = [S.tours[j], S.tours[i]]; S.tours.forEach((t, k) => (t.order = k)); touch('tours'); paint(); }
  function dup(t) {
    const c = clone(t), slug = `${t.slug.replace(/-copy.*/, '')}-copy-${rid().slice(0, 3)}`;
    Object.assign(c, { id: slug, slug, name: t.name + ' (עותק)', status: 'hidden', order: S.tours.length }); S.tours.push(c); touch('tours'); paint(); toast('הטיול שוכפל ומוסתר. ערכו ופרסמו כשמוכן.');
  }
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'טיולים' }), h('span', { class: 'pagehead__sp' }), h('a', { class: 'btn btn--primary', href: '#/tours/new' }, icon('plus'), 'הוספת טיול')),
    savebar.el, h('p', { class: 'count', style: 'margin-bottom:12px', text: 'הסדר כאן קובע את הסדר בכל מקום באתר. הסתרה או ארכוב מורידים את הטיול מהאתר, אבל הפניות שהתקבלו עליו נשמרות.' }), out);
  paint();
  return savebar.off;
}

function savebarEl(extra = []) {
  const status = h('span', { class: 'savebar__st', role: 'status' }, h('i'), h('span'));
  const save = h('button', { class: 'btn', type: 'button', onclick: async () => { save.setAttribute('aria-busy', 'true'); try { await saveDraft(); toast('הטיוטה נשמרה'); } catch (e) { toast(e.message, 'err'); } finally { save.removeAttribute('aria-busy'); paint(); } } }, icon('save'), 'שמור טיוטה');
  const el = h('div', { class: 'savebar glass shellglass' }, ...extra, status, h('span', { class: 'savebar__sp' }), save, h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await publishFlow(); paint(); } }, icon('send'), 'פרסום לאתר'));
  const paint = () => { status.className = 'savebar__st ' + (S.unsaved ? 'is-dirty' : 'is-saved'); status.lastChild.textContent = S.unsaved ? 'יש שינויים שלא נשמרו' : S.status?.dirty ? 'נשמר כטיוטה, עוד לא פורסם' : 'הכול מפורסם'; };
  paint();
  return { el, off: onChange(paint) };
}

function editor(root, t, q) {
  let tab = q.tab || 'details';
  const savebar = savebarEl([h('a', { class: 'btn btn--icon btn--ghost', href: '#/tours', 'aria-label': 'חזרה לרשימת הטיולים' }, icon('right')), h('b', { text: t.name })]);
  const panel = h('section', { class: 'glass card', style: 'display:grid;gap:18px' });
  const tabs = h('div', { class: 'tabs', style: 'margin-bottom:14px' });
  const upd = () => { touch('tours'); };
  const fld = (label, el, hint) => h('div', { class: 'fld' }, h('label', { text: label }), el, hint ? h('span', { class: 'hint', text: hint }) : null);
  const inp = (key, o = {}) => { const el = o.area ? h('textarea', { rows: String(o.rows || 3) }) : h('input', { type: o.type || 'text' }); el.value = t[key] ?? ''; if (o.dir) { el.dir = 'ltr'; el.classList.add('ltr'); } el.addEventListener('input', () => { t[key] = o.lower ? el.value.trim().toLowerCase() : el.value; upd(); if (key === 'name') savebar.el.querySelector('b').textContent = t.name; }); if (o.ph) el.placeholder = o.ph; return el; };
  const imgEdit = (key, label) => {
    const im = (t[key] ||= { src: '', alt: '' });
    const img = h('img', { src: im.src, alt: '' }), th = h('div', { class: 'thumb', style: 'aspect-ratio:16/10' }, img), focal = h('span', { class: 'focal', style: 'display:none' }); th.append(focal);
    const place = () => { img.src = im.src; if (im.pos) { const [x, y] = im.pos.split(' ').map(parseFloat); focal.style.cssText = `left:${x}%;top:${y}%;display:block`; } };
    th.addEventListener('click', (e) => { const r = th.getBoundingClientRect(); im.pos = `${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%`; place(); upd(); });
    const alt = h('input', { type: 'text', value: im.alt || '', placeholder: 'מה רואים בתמונה' }); alt.addEventListener('input', () => { im.alt = alt.value; upd(); });
    place();
    return h('div', { class: 'group' }, h('span', { class: 'group__h', text: label }), h('div', { class: 'imgfld', style: 'grid-template-columns:200px minmax(0,1fr)' }, th, h('div', { style: 'display:grid;gap:10px' }, fld('תיאור נגיש', alt),
      h('div', { class: 'imgfld__acts' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { const m = await pickMedia({ current: im.src }); if (m) { Object.assign(im, { src: m.url, srcset: '', w: String(m.w || ''), h: String(m.h || ''), alt: im.alt || m.alt || '', pos: m.pos }); alt.value = im.alt; place(); upd(); } } }, icon('image'), 'החלפה מהספרייה'), h('span', { class: 'hint count', text: 'לחצו על התמונה לבחירת נקודת המוקד.' })))));
  };

  const paint = () => {
    tabs.replaceChildren(...[['details', 'פרטים'], ['content', 'תוכן הכרטיס'], ['media', 'מדיה'], ['dates', 'מועדים']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', style: 'border:1px solid var(--line-strong);border-radius:10px', 'aria-pressed': String(tab === k), onclick: () => { tab = k; paint(); } }, l)));
    const c = [];
    if (tab === 'details') {
      const status = h('select', { 'aria-label': 'מצב פרסום' }, [['published', 'מפורסם'], ['hidden', 'מוסתר'], ['archived', 'בארכיון']].map(([v, l]) => h('option', { value: v, selected: t.status === v }, l))); status.addEventListener('change', () => { t.status = status.value; upd(); });
      const sw = (key, label, dis, note) => { const i = h('input', { type: 'checkbox', checked: !!t[key], disabled: dis }); i.addEventListener('change', () => { t[key] = i.checked; upd(); }); return h('div', {}, h('label', { class: 'switch' }, i, h('span', { class: 'switch__t' }), label), note ? h('p', { class: 'hint count', text: note }) : null); };
      const mode = h('select', { 'aria-label': 'סוג מחיר' }, [['quote', 'מחיר לפי הצעה'], ['fixed', 'מחיר קבוע']].map(([v, l]) => h('option', { value: v, selected: t.priceMode === v }, l))); mode.addEventListener('change', () => { t.priceMode = mode.value; upd(); price.disabled = mode.value !== 'fixed'; });
      const price = inp('price', { ph: 'למשל: 120 ₪ למשתתף' }); price.disabled = t.priceMode !== 'fixed';
      c.push(h('div', { class: 'grid grid--2' }, fld('שם הסיור', inp('name')), fld('מצב פרסום', status, 'הסתרה או ארכוב מורידים את הטיול ואת עמוד הטיול מהאתר. הפניות שהתקבלו נשמרות.')),
        fld('משך', inp('duration', { ph: 'כ־3 שעות' })),
        h('div', { class: 'group' }, h('span', { class: 'group__h', text: 'איפה הטיול מוצג' }), sw('home', 'בקרוסלת הסיורים בדף הבית', false), sw('featured', 'במפה בדף הבית', !hasPage(t), hasPage(t) ? '' : 'מוצג במפה רק לטיול שיש לו עמוד משלו.'), h('p', { class: 'count', text: 'בעמוד ״הסיורים״ מוצגים כל הטיולים המפורסמים. הסדר נקבע ברשימת הטיולים.' })),
        hasPage(t) ? h('p', { class: 'notice' }, 'לטיול הזה יש עמוד מלא. ', h('a', { href: '#/pages/tour-' + t.slug, text: 'עריכת טקסטים, תמונות וכותרות העמוד' })) : h('p', { class: 'notice notice--warn', text: 'לטיול הזה אין עדיין עמוד מלא באתר (עמוד טיול הוא עיצוב מלא שנבנה בנפרד). הכרטיס שלו מפנה לוואטסאפ.' }),
        h('p', { class: 'count' }, h('a', { href: '#/leads?tour=' + t.slug, text: `${counts[t.slug] || 0} פניות התקבלו על הטיול הזה` })));
    }
    if (tab === 'content') {
      const stops = h('textarea', { rows: '6', 'aria-label': 'תחנות' }); stops.value = (t.stops || []).join('\n'); stops.addEventListener('input', () => { t.stops = stops.value.split('\n').map((x) => x.trim()).filter(Boolean); upd(); });
      c.push(fld('כותרת הכרטיס (המקום או הסיפור)', inp('place')), fld('תיאור קצר', inp('blurb', { area: true, rows: 4 }), 'מוצג בכרטיס, בקרוסלה ובמפה.'), fld('מתאים במיוחד ל', inp('fit', { area: true, rows: 2 })), fld('טקסט הכפתור בכרטיס', inp('btn')),
        fld('תחנות במפה, אחת בכל שורה', stops, 'תחנות שהמערכת מכירה (״הגנים הבהאיים״, ״הנמל״ ועוד) מסומנות גם במפה.'));
    }
    if (tab === 'media') {
      c.push(imgEdit('card', 'תמונת הכרטיס (ברשימות ובדף הבית)'), h('p', { class: 'count', text: 'תמונות עמוד הטיול עצמו נערכות בעורך הדפים.' }));
    }
    if (tab === 'dates') c.push(h('p', { class: 'count', text: 'מועדים עתידיים מוצגים בקופסאות ״הסיורים הקרובים״ באתר דרך /api/dates. הוסיפו תאריך, שעה והערה.' }), datesEditor());
    panel.replaceChildren(...c);
  };
  function datesEditor() {
    const box = h('div', { style: 'display:grid;gap:10px' });
    const p = () => {
      box.replaceChildren(...(t.dates || []).map((d, i) => { const a = h('input', { type: 'date', value: d.date, 'aria-label': 'תאריך' }), tm = h('input', { type: 'text', placeholder: '17:00', value: d.time || '', 'aria-label': 'שעה' }), b = h('input', { type: 'text', placeholder: 'הערה / נקודת מפגש', value: d.note || '', 'aria-label': 'הערה' });
        a.addEventListener('input', () => { d.date = a.value; upd(); }); tm.addEventListener('input', () => { d.time = tm.value; upd(); }); b.addEventListener('input', () => { d.note = b.value; upd(); });
        return h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) 110px minmax(0,1.4fr) auto;gap:8px' }, a, tm, b, h('button', { class: 'btn btn--icon btn--ghost', type: 'button', 'aria-label': 'הסרת תאריך', onclick: () => { t.dates.splice(i, 1); upd(); p(); } }, icon('trash'))); }),
        h('button', { class: 'btn btn--sm', style: 'justify-self:start', type: 'button', onclick: () => { (t.dates ||= []).push({ date: '', time: '', note: '' }); upd(); p(); } }, icon('plus'), 'הוספת תאריך'));
    };
    p(); return box;
  }
  root.append(h('div', { class: 'pagehead', style: 'margin-bottom:12px' }, h('h1', { text: 'עריכת טיול' })), savebar.el, tabs, panel);
  paint();
  return savebar.off;
}
