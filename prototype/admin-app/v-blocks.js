// Sections the owner adds: the library (pick a type) and the editor (content + design). The spec comes from the server
// (api/_lib/blocks.mjs via the bundle), so labels, defaults and options are the same on both sides.
import { h, icon, drawer, pickMedia, clone, rid, confirmDialog } from './ui.js';
import { S, touch, editBlock } from './state.js';
import { linkPicker } from './links.js';

// ------------------------------------------------------------ small wireframes of each type (pure markup, styled in admin.css)
const L = (cls, n = 1) => Array.from({ length: n }, () => h('i', { class: cls }));
const THUMB = {
  text: () => [h('div', { class: 'wf wf--col' }, L('wf-l wf-l--t'), L('wf-l wf-l--t wf-l--b'), L('wf-l', 3), L('wf-btn'))],
  split: () => [h('div', { class: 'wf wf--row' }, h('i', { class: 'wf-img wf-img--moon' }), h('div', { class: 'wf wf--col' }, L('wf-l wf-l--t wf-l--b'), L('wf-l', 2), L('wf-btn')))],
  banner: () => [h('div', { class: 'wf wf--banner' }, L('wf-l wf-l--t wf-l--inv'), L('wf-l wf-l--t wf-l--b wf-l--inv'), L('wf-btn'))],
  cards: () => [h('div', { class: 'wf wf--col' }, L('wf-l wf-l--t wf-l--b'), h('div', { class: 'wf wf--grid' }, ...L('wf-card', 3)))],
  quote: () => [h('div', { class: 'wf wf--col wf--center' }, h('b', { class: 'wf-q', text: '”' }), L('wf-l wf-l--t'), L('wf-l wf-l--t'), L('wf-dot'))],
  cta: () => [h('div', { class: 'wf wf--box' }, L('wf-l wf-l--t wf-l--b'), L('wf-l'), L('wf-btn'))],
  faq: () => [h('div', { class: 'wf wf--col' }, L('wf-l wf-l--t wf-l--b'), ...L('wf-row', 4))],
  gallery: () => [h('div', { class: 'wf wf--col' }, L('wf-l wf-l--t wf-l--b'), h('div', { class: 'wf wf--grid' }, ...L('wf-img', 3)))],
  facts: () => [h('div', { class: 'wf wf--col wf--center' }, L('wf-l wf-l--t wf-l--b'), h('div', { class: 'wf wf--grid' }, ...Array.from({ length: 3 }, () => h('span', { class: 'wf-num' }, h('b', { text: '10' }), h('i', { class: 'wf-l' })))))],
};

/** library: choose what to add. Resolves with the type, or null. */
export function openLibrary() {
  return new Promise((resolve) => {
    let picked = null;
    const tiles = Object.entries(S.blocks.types).map(([type, T]) => h('button', { class: 'bt', type: 'button', onclick: () => { picked = type; dr.close(); } },
      h('span', { class: 'bt__thumb', 'aria-hidden': 'true' }, ...(THUMB[type] ? THUMB[type]() : [])), h('b', { text: T.label }), h('span', { text: T.desc })));
    const dr = drawer({ title: 'הוספת סקשן', cls: 'drawer--wide', body: h('div', { style: 'display:grid;gap:14px' }, h('p', { class: 'count', text: 'כל סקשן בנוי מהעיצוב של האתר, עם תוכן לדוגמה שמחליפים. אחרי ההוספה אפשר לשנות טקסטים, תמונות ועיצוב, ולגרור אותו למקום אחר בדף.' }), h('div', { class: 'btgrid' }, tiles)),
      onClose: () => resolve(picked) });
  });
}

// ------------------------------------------------------------ editor
export function blockEditor({ pid, cid, onChange }) {
  const b = editBlock(pid, cid);
  const T = S.blocks.types[b.type], F = S.blocks.fields, D = S.blocks.design;
  let tab = 'content';
  const box = h('div', { style: 'display:grid;gap:16px' });
  const commit = () => { touch('pages', pid); onChange && onChange(); };

  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div', { style: 'display:grid;gap:16px' });
  function paintTabs() {
    tabs.replaceChildren(...[['content', 'תוכן'], ['design', 'עיצוב']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', role: 'tab', 'aria-selected': String(tab === k), 'aria-pressed': String(tab === k), style: 'border:1px solid var(--line-strong);border-radius:10px', onclick: () => { tab = k; paintTabs(); paint(); } }, l)));
  }
  function paint() { body.replaceChildren(...(tab === 'content' ? content() : design())); }

  // ---- content
  function content() {
    const out = [];
    const heads = T.c.filter((k) => ['kicker', 't1', 't2', 'body', 'quote', 'name', 'role'].includes(k));
    if (heads.length) out.push(h('div', { class: 'group' }, h('div', { class: 'group__h', text: b.type === 'quote' ? 'הציטוט' : 'כותרת וטקסט' }), ...heads.map((k) => textField(F[k], () => b.c[k], (v) => { b.c[k] = v; commit(); }))));
    for (const k of T.c.filter((x) => F[x]?.kind === 'link')) out.push(h('div', { class: 'group' }, h('div', { class: 'group__h', text: F[k].label }), linkField(() => b.c[k], (v) => { b.c[k] = v; commit(); })));
    if (T.c.includes('img')) out.push(h('div', { class: 'group' }, h('div', { class: 'group__h', text: b.type === 'quote' ? 'תמונה קטנה של הממליץ (לא חובה)' : b.type === 'banner' ? 'תמונת הרקע' : 'תמונה' }), imageField(() => b.c.img, (v) => { b.c.img = v; commit(); })));
    if (T.items) out.push(itemsEditor());
    return out;
  }
  function itemsEditor() {
    const I = T.items;
    b.items ||= [];
    const wrap = h('div', { class: 'group' });
    const paintItems = () => {
      wrap.replaceChildren(h('div', { class: 'group__h' }, h('span', { text: { cards: 'הכרטיסים', faq: 'השאלות', gallery: 'התמונות', facts: 'המספרים', trips: 'הסיורים הפתוחים', logos: 'הלוגואים' }[b.type] || 'פריטים' }), h('span', { class: 'count', text: `${b.items.length} מתוך ${I.max}` }), h('span', { style: 'flex:1' }),
        h('button', { class: 'btn btn--sm btn--primary', type: 'button', disabled: b.items.length >= I.max, onclick: add }, icon('plus'), `הוספת ${I.label}`)),
      ...b.items.map((it, i) => h('div', { class: 'item' }, h('div', { class: 'item__h' }, h('span', { text: `${I.label} ${i + 1}` }), h('span', { class: 'sp' }),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': `העלאת ${I.label} ${i + 1}`, disabled: i === 0, onclick: () => mv(i, -1) }, icon('up')),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': `הורדת ${I.label} ${i + 1}`, disabled: i === b.items.length - 1, onclick: () => mv(i, 1) }, icon('down')),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': `שכפול ${I.label} ${i + 1}`, disabled: b.items.length >= I.max, onclick: () => { b.items.splice(i + 1, 0, { ...clone(it), id: rid() }); commit(); paintItems(); } }, icon('copy')),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': `הסרת ${I.label} ${i + 1}`, onclick: () => { b.items.splice(i, 1); commit(); paintItems(); } }, icon('trash'))),
        // 21.11.2026: upcoming tours: one tap fills the item from one of his tours (name, photo, a short line, its page)
        b.type === 'trips' ? h('div', { class: 'fld' }, h('label', { text: 'בחירה מהסיורים שלי (ממלא את הפרטים, ואפשר לשנות אחר כך)' }), (() => {
          const sel = h('select', { 'aria-label': 'בחירת סיור' }, h('option', { value: '', text: 'סיור חדש / אחר' }), ...(S.tours || []).filter((t) => t.status !== 'archived').map((t) => h('option', { value: t.slug, text: t.name })));
          sel.value = it.tour || '';
          sel.addEventListener('change', () => {
            const t = (S.tours || []).find((x) => x.slug === sel.value); it.tour = sel.value || undefined;
            if (t) { it.title = t.name; if (t.card?.src) it.img = { src: t.card.src, w: t.card.w || '', h: t.card.h || '', alt: t.card.alt || t.name, pos: t.card.pos || '' }; it.text = it.text || t.place || '';
              if (!it.reg?.href) it.reg = { label: 'להרשמה ותשלום', href: t.page ? `/tours/${t.slug}.html` : 'wa' }; }
            commit(); paintItems();
          });
          return sel;
        })()) : null,
        ...I.f.map((k) => F[k].kind === 'image' ? imageField(() => it[k], (v) => { it[k] = v; commit(); })
          : F[k].kind === 'link' ? h('div', { class: 'fld' }, h('label', { text: k === 'reg' ? F[k].label : 'קישור (לא חובה)' }), linkField(() => it[k], (v) => { it[k] = v; commit(); }, true))
            : textField(F[k], () => it[k], (v) => { it[k] = v; commit(); })))));
      if (!b.items.length) wrap.append(h('p', { class: 'count', text: b.type === 'trips' ? 'אין כרגע סיורים פתוחים, ולכן הסקשן לא מופיע באתר. ״הוספת סיור״ מחזיר אותו.' : b.type === 'logos' ? 'אין עדיין לוגואים, ולכן הרצועה לא מופיעה באתר.' : b.type === 'gallery' ? 'עדיין אין תמונות. ״הוספת תמונה״ פותח את ספריית המדיה.' : 'הרשימה ריקה.' }));
    };
    const mv = (i, d) => { const j = i + d; [b.items[i], b.items[j]] = [b.items[j], b.items[i]]; commit(); paintItems(); };
    async function add() {
      const it = { id: rid() };
      if (I.f.includes('img')) { const m = await pickMedia({}); if (!m) return; it.img = { src: m.url, w: String(m.w || ''), h: String(m.h || ''), alt: m.alt || '', pos: m.pos && m.pos !== '50% 50%' ? m.pos : '' }; }
      b.items.push(it); commit(); paintItems();
    }
    paintItems();
    return wrap;
  }

  // ---- design
  function design() {
    const out = [];
    const keys = Object.keys(T.d);
    const bgKeys = keys.filter((k) => k === 'bg');
    if (bgKeys.length) out.push(h('div', { class: 'fld' }, h('label', { text: D.bg.label }), h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': D.bg.label },
      ...Object.entries(D.bg.options).map(([v, l]) => h('button', { class: 'swatch swatch--' + v, type: 'button', role: 'radio', 'aria-checked': String(b.d.bg === v), title: l, onclick: () => { b.d.bg = v; commit(); paint(); } }, h('i', { 'aria-hidden': 'true' }), h('span', { text: l }))))));
    for (const k of keys.filter((x) => x !== 'bg')) {
      const opt = D[k];
      if (k === 'accent') {
        out.push(h('div', { class: 'fld' }, h('label', { text: opt.label }), h('div', { class: 'swatches swatches--dots', role: 'radiogroup', 'aria-label': opt.label },
          ...Object.entries(opt.options).map(([v, l]) => h('button', { class: 'swatch swatch--ac-' + v, type: 'button', role: 'radio', 'aria-checked': String(b.d.accent === v), title: l, onclick: () => { b.d.accent = v; commit(); paint(); } }, h('i', { 'aria-hidden': 'true' }), h('span', { text: l }))))));
        continue;
      }
      out.push(h('div', { class: 'fld' }, h('label', { text: opt.label }), h('div', { class: 'seg', role: 'radiogroup', 'aria-label': opt.label },
        ...Object.entries(opt.options).map(([v, l]) => h('button', { class: 'seg__b', type: 'button', role: 'radio', 'aria-checked': String(String(b.d[k]) === v), onclick: () => { b.d[k] = v; commit(); paint(); } }, l)))));
    }
    const anchor = h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: b.d.anchor || '', placeholder: 'למשל: workshops', 'aria-label': 'שם לעוגן' });
    anchor.addEventListener('input', () => { const v = anchor.value.trim().toLowerCase(); if (v && !/^[a-z][a-z0-9-]{1,30}$/.test(v)) { anchor.setAttribute('aria-invalid', 'true'); return; } anchor.removeAttribute('aria-invalid'); if (v) b.d.anchor = v; else delete b.d.anchor; commit(); });
    out.push(h('div', { class: 'fld' }, h('label', { text: 'עוגן לקישור מהתפריט (לא חובה)' }), anchor, h('span', { class: 'hint', text: 'אותיות לטיניות קטנות, ספרות ומקפים. אחר כך אפשר לקשר לסקשן בכתובת כמו /#workshops.' })));
    out.push(h('p', { class: 'count', text: 'הצבעים, הפונטים והצורות לקוחים מהעיצוב של האתר, כך שכל שילוב נשאר בשפת המותג וקריא גם בטלפון.' }));
    return out;
  }

  // ---- field widgets
  function textField(f, get, set) {
    const long = f.kind === 'long';
    const el = long ? h('textarea', { rows: '4' }) : h('input', { type: 'text' });
    el.value = get() ?? ''; el.setAttribute('aria-label', f.label);
    if (f.max) el.maxLength = f.max;
    el.addEventListener('input', () => set(el.value));
    return h('div', { class: 'fld' }, h('label', { text: f.label }), el, f.hint ? h('span', { class: 'hint', text: f.hint }) : null);
  }
  function linkField(get, set, compact) {
    const v0 = get() || { label: '', href: '' };
    const kind = (href) => (href === 'wa' ? 'wa' : href === 'tel' ? 'tel' : href === 'mail' ? 'mail' : href ? 'url' : 'none');
    let k = kind(v0.href);
    const label = h('input', { type: 'text', value: v0.label || '', placeholder: 'מה כתוב על הכפתור', 'aria-label': 'טקסט הכפתור', maxLength: 60 });
    let urlVal = k === 'url' ? v0.href : '';
    const url = linkPicker(urlVal, (nv) => { urlVal = nv; save(); }, { label: 'עמוד או כתובת' });   // 23.11.2026: pick from a list
    const sel = h('select', { 'aria-label': 'לאן הכפתור מוביל' }, [['none', 'בלי כפתור'], ['wa', 'וואטסאפ ליוסק׳ה'], ['tel', 'שיחת טלפון'], ['mail', 'מייל'], ['url', 'עמוד באתר או כתובת אחרת']].map(([v, l]) => h('option', { value: v, selected: k === v }, l)));
    const save = () => { const href = k === 'url' ? urlVal : k === 'none' ? '' : k; set(k === 'none' ? null : { label: label.value, href }); };
    const show = () => { url.parentNode.hidden = k !== 'url'; label.parentNode.hidden = k === 'none'; };
    sel.addEventListener('change', () => { k = sel.value; if (k !== 'none' && !label.value) label.value = { wa: 'לכתוב בוואטסאפ', tel: 'להתקשר', mail: 'לשלוח מייל', url: 'לפרטים' }[k]; show(); save(); });
    label.addEventListener('input', save);
    const el = h('div', { style: 'display:grid;gap:10px' }, h('div', { class: 'fld' }, compact ? null : h('label', { text: 'לאן מוביל' }), sel), h('div', { class: 'fld' }, h('label', { text: 'טקסט' }), label), h('div', {}, url));
    queueMicrotask(show);
    return el;
  }
  function imageField(get, set) {
    const im = h('img', { alt: '' });
    const focal = h('span', { class: 'focal', style: 'display:none' });
    const thumb = h('div', { class: 'thumb', title: 'לחיצה על התמונה קובעת את נקודת המוקד' }, im, focal);
    const alt = h('input', { type: 'text', placeholder: 'מה רואים בתמונה (לקורא מסך ולגוגל)', 'aria-label': 'תיאור נגיש לתמונה' });
    const paintImg = () => { const v = get() || {}; im.src = v.src || ''; thumb.classList.toggle('is-empty', !v.src); alt.value = v.alt || ''; if (v.pos) { const [x, y] = v.pos.split(' ').map(parseFloat); focal.style.cssText = `left:${x}%;top:${y}%`; focal.style.display = 'block'; } else focal.style.display = 'none'; };
    alt.addEventListener('input', () => { const v = get(); if (v) set({ ...v, alt: alt.value }); });
    thumb.addEventListener('click', (e) => { const v = get(); if (!v?.src) return; const r = thumb.getBoundingClientRect(); set({ ...v, pos: `${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%` }); paintImg(); });
    const choose = async () => { const v = get() || {}; const m = await pickMedia({ current: v.src }); if (!m) return; set({ src: m.url, w: String(m.w || ''), h: String(m.h || ''), alt: alt.value || m.alt || '', pos: m.pos && m.pos !== '50% 50%' ? m.pos : '' }); paintImg(); };
    paintImg();
    return h('div', { class: 'imgfld' }, thumb, h('div', { style: 'display:grid;gap:10px' },
      h('div', { class: 'imgfld__acts' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: choose }, icon('image'), 'בחירה מהספרייה'), h('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => { set(null); paintImg(); } }, 'הסרה')),
      h('div', { class: 'fld' }, h('label', { text: 'תיאור נגיש (alt)' }), alt)));
  }

  paintTabs(); paint();
  box.append(tabs, body);
  return box;
}

export const confirmRemove = (label) => confirmDialog({ title: 'מחיקת הסקשן', text: `למחוק את ״${label}״ מהדף? הוא יוסר מהאתר אחרי הפרסום. אפשר לשחזר גרסה קודמת מהיסטוריית הפרסומים.`, confirm: 'מחיקה', danger: true });
