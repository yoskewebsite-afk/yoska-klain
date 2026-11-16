// ספריית מדיה: upload, pick again, accessible description, focal point (what stays in frame when cropped), where-used before removal.
import { h, icon, api, toast, drawer, confirmDialog, mediaGrid, uploadFile, debounce } from './ui.js';

export async function render(root) {
  let items = [], q = '', only = '';
  const status = h('p', { class: 'count', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, class: 'vh', tabindex: '-1', onchange: async (e) => { await up([...e.target.files]); e.target.value = ''; } });
  const up = async (files) => {
    for (const f of files) { status.textContent = `מעלים ${f.name}…`; try { const m = await uploadFile(f); items = [m, ...items.filter((x) => x.id !== m.id)]; paint(); } catch (e) { toast(e.message, 'err'); } }
    status.textContent = 'ההעלאה הסתיימה.';
  };
  const drop = h('div', { class: 'dropzone', ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'), ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); up([...e.dataTransfer.files]); } }, icon('upload'), h('b', { text: 'גררו תמונות לכאן' }), h('span', { class: 'count', text: 'JPG, PNG, WebP. התמונות מוקטנות אוטומטית ל-2000 פיקסלים כדי שהאתר יישאר מהיר.' }), h('button', { class: 'btn btn--primary', type: 'button', onclick: () => file.click() }, icon('upload'), 'בחירת קבצים'));
  const grid = h('div');
  const search = h('input', { type: 'search', placeholder: 'חיפוש לפי שם או תיאור', 'aria-label': 'חיפוש תמונה', oninput: debounce((e) => { q = e.target.value; paint(); }, 150) });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'מקור' }, [['', 'הכול'], ['mine', 'שהעליתי'], ['site', 'של האתר']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', 'aria-pressed': String(only === k), onclick: () => { only = k; [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(['', 'mine', 'site'][i] === k))); paint(); } }, l)));
  function paint() {
    const list = items.filter((m) => (!q || (m.name + ' ' + (m.alt || '')).includes(q)) && (!only || (only === 'mine' ? !m.builtin : m.builtin)));
    grid.replaceChildren(list.length ? mediaGrid({ items: list, selected: null, onPick: open }) : h('div', { class: 'empty' }, h('b', { text: 'אין תמונות להצגה' }), 'העלו תמונה או שנו את הסינון.'));
  }
  async function open(m) {
    let usage = [];
    try { usage = (await api('GET', `/api/admin/media/${m.id}/usage`)).usage; } catch { /* shown as unknown */ }
    const alt = h('input', { type: 'text', value: m.alt || '', placeholder: 'מה רואים בתמונה' });
    const img = h('img', { src: m.url, alt: '' }), focal = h('span', { class: 'focal' }), th = h('div', { class: 'thumb thumb--lg', style: 'cursor:crosshair' }, img, focal);
    let pos = m.pos || '50% 50%';
    const place = () => { const [x, y] = pos.split(' ').map(parseFloat); focal.style.cssText = `left:${x}%;top:${y}%`; };
    th.addEventListener('click', (e) => { const r = img.getBoundingClientRect(); pos = `${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%`; place(); });
    img.addEventListener('load', place);
    const prev = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, [['מחשב 16:9', '16/9'], ['מובייל 4:5', '4/5'], ['ריבוע', '1/1']].map(([l, r]) => h('figure', { style: 'margin:0;display:grid;gap:4px;width:' + (r === '16/9' ? '160px' : '96px') }, h('div', { class: 'thumb', style: `aspect-ratio:${r}` }, h('img', { src: m.url, alt: '', style: `object-position:${pos}` })), h('figcaption', { class: 'count', text: l }))));
    const save = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { try { const r = await api('PATCH', `/api/admin/media/${m.id}`, { alt: alt.value, pos }); Object.assign(m, r.media); toast('נשמר'); dr.close(true); paint(); } catch (e) { toast(e.message, 'err'); } } }, 'שמירה');
    const del = m.builtin ? null : h('button', { class: 'btn btn--danger', type: 'button', onclick: async () => {
      if (usage.filter((u) => u.state !== 'מובנה').length) { toast('התמונה בשימוש. הסירו אותה מהמקומות המופיעים ברשימה ואז מחקו.', 'err'); return; }
      if (!(await confirmDialog({ title: 'מחיקת תמונה', text: 'למחוק את התמונה מהספרייה? אי אפשר לבטל.', confirm: 'מחיקה', danger: true }))) return;
      try { await api('DELETE', `/api/admin/media/${m.id}`); items = items.filter((x) => x.id !== m.id); dr.close(true); paint(); toast('נמחקה'); } catch (e) { toast(e.message, 'err'); }
    } }, icon('trash'), 'מחיקה');
    const dr = drawer({ title: m.name, cls: 'drawer--wide', body: h('div', { style: 'display:grid;gap:16px' }, th, h('p', { class: 'count', text: 'לחצו על התמונה כדי לסמן את החלק החשוב. הוא יישאר בפריים גם כשהתמונה נחתכת במובייל או בכרטיס.' }), prev,
      h('div', { class: 'fld' }, h('label', { text: 'תיאור נגיש (alt)' }), alt), h('dl', { class: 'kv' }, h('dt', { text: 'מידות' }), h('dd', { class: 'num', text: `${m.w}×${m.h}` }), h('dt', { text: 'כתובת' }), h('dd', { class: 'ltr', text: m.url })),
      h('div', { class: 'group' }, h('span', { class: 'group__h', text: 'איפה משתמשים בתמונה' }), usage.length ? h('ul', { class: 'changes' }, usage.map((u) => h('li', {}, u.where, ' ', h('span', { class: 'tag tag--mute', text: u.state })))) : h('p', { class: 'count', text: 'התמונה לא בשימוש כרגע.' }))), footer: [save, del, h('button', { class: 'btn', type: 'button', onclick: () => dr.close() }, 'ביטול')] });
  }
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'ספריית מדיה' })), drop, file, h('div', { class: 'toolbar', style: 'margin-top:18px' }, h('div', { class: 'search' }, icon('search'), search), seg), status, grid);
  grid.replaceChildren(h('div', { class: 'glass skeleton', style: 'height:200px' }));
  try { items = (await api('GET', '/api/admin/media')).media; paint(); } catch (e) { grid.replaceChildren(h('div', { class: 'notice notice--danger', text: e.message })); }
}
