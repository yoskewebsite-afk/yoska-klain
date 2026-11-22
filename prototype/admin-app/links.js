// 23.11.2026: choosing where a link goes from a list (pages of the site, sections of the home page, WhatsApp, phone, mail)
// instead of typing an address. "Another address…" still opens the free text field for outside links.
import { h } from './ui.js';
import { S, pathOf } from './state.js';

const HOME_SECTIONS = [['#about', 'נעים להכיר'], ['#tours', 'הסיורים'], ['#upcoming', 'הסיורים הקרובים'], ['#groups', 'קבוצות ומשפחות'], ['#moments', 'ככה זה נראה בשטח'],
  ['#reviews', 'המלצות'], ['#abroad', 'דרום אמריקה'], ['#faq', 'שאלות ותשובות'], ['#contact', 'טופס יצירת קשר']];
const SPECIAL = [['wa', 'וואטסאפ ליוסק׳ה'], ['tel', 'שיחת טלפון ליוסק׳ה'], ['mail', 'מייל ליוסק׳ה']];

/** groups of [value, label] for the picker */
export function linkOptions({ special = false } = {}) {
  const pages = Object.values(S.schema.pages || {}).filter((p) => p.id !== 'notfound' && !p.tour).map((p) => [pathOf(p.id), p.label]);
  const tours = Object.values(S.schema.pages || {}).filter((p) => p.tour).map((p) => [pathOf(p.id), p.label.replace(/^טיול:\s*/, 'סיור: ')]);
  const out = [['עמודים באתר', pages], ['עמודי הסיורים', tours], ['סקשן בדף הבית', HOME_SECTIONS.map(([a, l]) => ['/' + a, l])]];
  if (special) out.unshift(['פנייה ישירה', SPECIAL]);
  return out;
}

const known = (href, groups) => groups.some(([, list]) => list.some(([v]) => v === href));

/**
 * A select + a free address field (shown only for "another address").
 * get(): current href, set(href): new href. Returns the element.
 */
export function linkPicker(href0, set, { special = false, label = 'לאן הקישור מוביל', placeholder = 'https://…' } = {}) {
  const groups = linkOptions({ special });
  const href = href0 || '';
  const isKnown = known(href, groups);
  const sel = h('select', { 'aria-label': label },
    h('option', { value: '', selected: !href }, 'בחרו עמוד או סקשן…'),
    ...groups.map(([g, list]) => h('optgroup', { label: g }, ...list.map(([v, l]) => h('option', { value: v, selected: v === href }, l)))),
    h('option', { value: '__other', selected: !!href && !isKnown }, 'כתובת אחרת (קישור חיצוני)…'));
  const url = h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: href && !isKnown ? href : '', placeholder, 'aria-label': 'כתובת הקישור' });
  const urlWrap = h('div', { class: 'fld' }, h('label', { text: 'כתובת' }), url,
    /\{\{set\./.test(href) ? h('span', { class: 'hint', text: 'חלק מהכתובת מתעדכן אוטומטית מהגדרות האתר (טלפון/וואטסאפ).' }) : null);
  const show = () => { urlWrap.hidden = sel.value !== '__other'; };
  sel.addEventListener('change', () => { show(); if (sel.value === '__other') { url.focus(); set(url.value.trim()); } else set(sel.value); });
  url.addEventListener('input', () => set(url.value.trim()));
  show();
  return h('div', { class: 'linkpick', style: 'display:grid;gap:10px' }, h('div', { class: 'fld' }, h('label', { text: label }), sel), urlWrap);
}
