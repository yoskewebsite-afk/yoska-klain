// דפים וסקשנים: pick a page, pick a section, edit the fields that section really renders, preview, save a draft, publish.
import { h, icon, api, toast, drawer, dialog, confirmDialog, pickMedia, clone, rid, $ } from './ui.js';
import { S, pageDef, order, setOrder, pageState, secState, val, setVal, items, setItems, seoOf, setSeo, pathOf, saveDraft, touch, onChange } from './state.js';
import { go, publishFlow, historyFlow, unsavedDialog } from './app.js';

const ICONS = ['gate', 'pin', 'route', 'person', 'group', 'camera', 'heart', 'question', 'globe', 'phone', 'clock', 'sun'];
const ICON_LABEL = { gate: 'שער', pin: 'סיכה', route: 'מסלול', person: 'אדם', group: 'קבוצה', camera: 'מצלמה', heart: 'לב', question: 'שאלה', globe: 'גלובוס', phone: 'טלפון', clock: 'שעון', sun: 'שמש' };
const SHARED = 'shared';

export async function render(root, params) {
  const pid = params.a, sid = params.b;
  if (!pid) return renderIndex(root);
  if (pid === SHARED) return renderEditor(root, SHARED, sid);
  if (!S.schema.pages[pid]) { root.append(h('div', { class: 'notice notice--danger', text: 'העמוד לא נמצא.' })); return; }
  return renderEditor(root, pid, sid, params.q);
}

// ------------------------------------------------------------ page list
function renderIndex(root) {
  const mk = (pid) => {
    const p = S.schema.pages[pid], seo = seoOf(pid), secs = p.sections.length;
    const hidden = p.sections.filter((s) => S.draft.pages[pid]?.sec?.[s.id]?.hidden).length;
    return h('a', { class: 'rowlink glass', style: 'padding:14px 18px;border-radius:16px;margin-bottom:10px;min-height:68px', href: '#/pages/' + pid },
      h('div', { class: 'rowlink__t' }, h('b', { text: p.label }), h('span', { class: 'ltr', text: pathOf(pid) + (seo.noindex ? ' · לא לאינדוקס' : '') })),
      h('span', { class: 'count', text: `${secs} בלוקים${hidden ? ` · ${hidden} מוסתרים` : ''}` }), icon('left'));
  };
  const ids = Object.keys(S.schema.pages), plain = ids.filter((p) => !p.startsWith('tour-')), tourPages = ids.filter((p) => p.startsWith('tour-'));
  const rows = plain.map(mk), trows = tourPages.map(mk);
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'דפים וסקשנים' }), h('span', { class: 'pagehead__sp' }), h('button', { class: 'btn', type: 'button', onclick: historyFlow }, icon('history'), 'היסטוריית פרסומים')),
    h('p', { class: 'count', style: 'margin-bottom:16px', text: 'בחרו דף, ואז סקשן לעריכה. עמודי הטיולים נערכים במסך ״טיולים״. כל שינוי נשמר כטיוטה ומופיע באתר רק אחרי ״פרסום לאתר״.' }),
    h('div', {}, rows),
    h('h2', { class: 'card__h', style: 'margin:22px 0 10px', text: 'עמודי הטיולים' }), h('div', {}, trows),
    h('a', { class: 'rowlink glass', style: 'padding:14px 18px;border-radius:16px;min-height:68px', href: '#/pages/shared' }, h('div', { class: 'rowlink__t' }, h('b', { text: 'כותרת עליונה, תפריט ופוטר' }), h('span', { text: 'משותף: מוצג בכל הדפים. כאן עורכים את קישורי התפריט וטקסט הפוטר.' })), icon('left')));
}

// ------------------------------------------------------------ editor
async function renderEditor(root, pid, sid0, q = {}) {
  const shared = pid === SHARED;
  const def = shared ? { label: 'כותרת עליונה, תפריט ופוטר', path: '(כל הדפים)', sections: Object.entries(S.schema.shared).map(([id, v]) => ({ id, label: v.label, groups: v.groups, lists: [], regions: [], deps: [], locked: false })) } : pageDef(pid);
  let tab = q.tab === 'seo' && !shared ? 'seo' : 'sections';
  let sid = sid0 || null;
  const secs = def.sections;
  const getSec = (id) => secs.find((s) => s.id === id);

  const status = h('span', { class: 'savebar__st', role: 'status' }, h('i'), h('span'));
  const saveBtn = h('button', { class: 'btn', type: 'button', onclick: doSave }, icon('save'), 'שמור טיוטה');
  const prevBtn = h('button', { class: 'btn', type: 'button', onclick: () => openPreview() }, icon('eye'), 'תצוגה מקדימה');
  const pubBtn = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await publishFlow(); paintStatus(); } }, icon('send'), 'פרסום לאתר');
  const bar = h('div', { class: 'savebar glass shellglass' }, h('a', { class: 'btn btn--icon btn--ghost', href: '#/pages', 'aria-label': 'חזרה לרשימת הדפים' }, icon('right')), h('b', { text: def.label }), status, h('span', { class: 'savebar__sp' }), saveBtn, prevBtn, pubBtn);
  const list = h('nav', { class: 'ed__list glass', 'aria-label': 'סקשנים בדף' });
  const panel = h('section', { class: 'ed__panel glass' });
  const tabs = h('div', { class: 'tabs' });
  root.append(h('div', { class: 'pagehead', style: 'margin-bottom:12px' }, h('h1', { text: def.label }), h('span', { class: 'ltr count', text: shared ? '' : pathOf(pid) })), bar, shared ? null : tabs, h('div', { class: 'ed' }, list, panel));

  function paintStatus() {
    const dirty = S.unsaved;
    status.className = 'savebar__st ' + (dirty ? 'is-dirty' : 'is-saved');
    status.lastChild.textContent = dirty ? 'יש שינויים שלא נשמרו' : S.status?.dirty ? 'נשמר כטיוטה, עוד לא פורסם' : 'הכול מפורסם';
  }
  async function doSave() {
    saveBtn.setAttribute('aria-busy', 'true');
    try { await saveDraft(); toast('הטיוטה נשמרה'); } catch (e) { toast(e.message, 'err'); } finally { saveBtn.removeAttribute('aria-busy'); paintStatus(); }
  }
  const off = onChange(paintStatus); paintStatus();

  // ---- left list of sections (order, hide, drag)
  function paintList() {
    const ord = shared ? def.sections.map((x) => x.id) : order(pid);
    const hasSel = !!sid && tab === 'sections';
    list.className = 'ed__list glass' + (hasSel ? ' has-sel' : ''); panel.className = 'ed__panel glass' + (!hasSel && tab === 'sections' ? ' no-sel' : '');
    list.replaceChildren(h('p', { class: 'count', style: 'padding:4px 8px', text: 'סדר הסקשנים בדף. אפשר לגרור או להשתמש בחצים.' }), ...ord.map((id, idx) => {
      const s = getSec(id), st = S.draft.pages[pid]?.sec?.[id] || {}, hid = !!(st.hidden || st.removed);
      const el = h('div', { class: 'sec' + (hid ? ' is-hidden' : ''), draggable: s.locked || shared ? null : 'true', 'aria-current': String(id === sid) },
        s.locked || shared ? h('span', { class: 'mv', title: s.locked ? 'נעול במקומו' : '' }, s.locked ? icon('lock') : null) : h('span', { class: 'mv grip', 'aria-hidden': 'true' }, icon('grip')),
        h('button', { class: 'sec__main', type: 'button', onclick: () => { sid = id; tab = 'sections'; paintList(); paintPanel(); history.replaceState(null, '', `#/pages/${pid}/${id}`); } }, h('span', { text: s.label }), hid ? h('span', { class: 'tag tag--mute', text: st.removed ? 'הוסר' : 'מוסתר' }) : null),
        shared || s.locked ? null : h('button', { class: 'mv', type: 'button', 'aria-label': 'העלאה', disabled: idx <= (secs.find((x) => x.locked) ? 1 : 0) || idx === 0, onclick: () => move(idx, -1) }, icon('up')),
        shared || s.locked ? null : h('button', { class: 'mv', type: 'button', 'aria-label': 'הורדה', disabled: idx === ord.length - 1, onclick: () => move(idx, 1) }, icon('down')));
      if (!s.locked && !shared) {
        el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; });
        el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragover'); }); el.addEventListener('dragleave', () => el.classList.remove('dragover'));
        el.addEventListener('drop', (e) => { e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); const o = order(pid); const a = o.indexOf(from), b = o.indexOf(id); if (a < 0 || b < 0 || a === b) return; o.splice(b, 0, o.splice(a, 1)[0]); if (lockedFirst(o)) { setOrder(pid, o); paintList(); } });
      }
      return el;
    }));
  }
  const lockedFirst = (o) => secs.every((s, i) => !s.locked || o.indexOf(s.id) === i) || (toast('הסקשן הנעול חייב להישאר במקומו.', 'err'), false);
  function move(idx, d) { const o = order(pid); const j = idx + d; if (j < 0 || j >= o.length) return; [o[idx], o[j]] = [o[j], o[idx]]; if (lockedFirst(o)) { setOrder(pid, o); paintList(); } }

  // ---- tabs
  function paintTabs() {
    tabs.replaceChildren(...[['sections', 'סקשנים ותוכן'], ['seo', 'SEO וכתובת העמוד']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', style: 'border:1px solid var(--line-strong);border-radius:10px', 'aria-pressed': String(tab === k), onclick: () => { tab = k; if (k === 'seo') sid = null; paintTabs(); paintList(); paintPanel(); } }, l)));
  }

  // ---- right panel
  function paintPanel() {
    if (tab === 'seo') return paintSeo();
    if (!sid) { panel.replaceChildren(h('div', { class: 'empty' }, h('b', { text: 'בחרו סקשן לעריכה' }), 'הסקשנים מופיעים לפי הסדר בדף. כל סקשן מציג את השדות שהוא באמת יודע להציג.')); return; }
    const s = getSec(sid); if (!s) { panel.replaceChildren(h('div', { class: 'notice notice--danger', text: 'הסקשן לא נמצא.' })); return; }
    const st = shared ? { hidden: false } : S.draft.pages[pid]?.sec?.[sid] || {};
    const children = [h('div', { class: 'ed__crumb' }, h('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => { sid = null; paintList(); paintPanel(); history.replaceState(null, '', `#/pages/${pid}`); } }, icon('right'), 'הסקשנים'), h('span', { text: def.label }), '›', h('b', { text: s.label }))];
    if (shared) children.push(h('div', { class: 'notice notice--warn' }, h('strong', { text: 'שינוי כאן יתפרסם בכל הדפים באתר.' })));
    if (!shared) {
      const dis = s.locked;
      children.push(h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' },
        h('label', { class: 'switch', title: dis ? 'סקשן הפתיחה נעול' : '' }, h('input', { type: 'checkbox', checked: !st.hidden, disabled: dis, onchange: (e) => toggleHidden(s, !e.target.checked, e.target) }), h('span', { class: 'switch__t' }), h('span', { text: st.hidden ? 'מוסתר באתר' : 'מוצג באתר' })),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => openPreview(s.id) }, icon('eye'), 'הצגה בתצוגה מקדימה'),
        s.locked ? h('span', { class: 'tag tag--mute' }, 'נעול: הסקשן תלוי ברצף הגלילה ובגזרת יוסק׳ה') : s.scripted ? h('span', { class: 'tag tag--mute', text: 'כולל אנימציית גלילה' }) : null));
      if (s.deps?.length) children.push(h('div', { class: 'notice' }, h('strong', { text: 'תלויות בסקשן הזה' }), h('ul', { class: 'deps', style: 'margin:0;padding:0' }, s.deps.map((d) => h('li', { text: d + '. הסתרה מסירה אותם אוטומטית מהניווט.' })))));
    }
    if (s.regions?.length) children.push(h('div', { class: 'notice' }, h('strong', { text: 'חלקים שמנוהלים במקום אחר' }), h('p', { text: regionNote(s.regions) }), h('a', { class: 'btn btn--sm', style: 'justify-self:start', href: s.regions.includes('form-contact') ? '#/forms' : '#/tours' }, s.regions.includes('form-contact') ? 'למסך הטפסים' : 'למסך הטיולים')));
    for (const g of s.groups) children.push(group(g, s));
    for (const l of s.lists) children.push(listEditor(l, s));
    if (!s.groups.length && !s.lists.length && !s.regions.length) children.push(h('p', { class: 'count', text: 'אין בסקשן הזה טקסטים או תמונות לעריכה.' }));
    panel.replaceChildren(...children);
  }
  const regionNote = (r) => r.includes('form-contact') ? 'שדות הטופס, חובת המילוי, הודעת ההצלחה ויעד ההתראות נערכים במסך הטפסים.' : 'רשימת הטיולים, הכרטיסים והמפה נבנים אוטומטית מהטיולים שהוגדרו במסך הטיולים.';

  async function toggleHidden(s, hide, input) {
    if (hide && s.deps?.length) {
      const ok = await confirmDialog({ title: `להסתיר את ״${s.label}״?`, text: `הסקשן יוסתר ויוסרו ממנו הקישורים: ${s.deps.join('; ')}. אפשר להחזיר אותו בכל רגע.`, confirm: 'הסתרה', danger: true });
      if (!ok) { input.checked = true; return; }
    }
    secState(pid, s.id).hidden = hide; touch('pages', pid); paintList(); paintPanel();
  }

  // ---- a group of fields
  function group(g, s) {
    const key = (k) => k;
    const body = [];
    for (const f of g.fields) body.push(field(f, s, key));
    const label = g.kind === 'image' ? 'תמונה' : `${g.label}${g.num > 1 ? ' ' + g.num : ''}`;
    return h('div', { class: 'group' }, h('div', { class: 'group__h', text: label }), ...body);
  }
  const owner = (s) => (shared ? 'shared' : pid);
  function field(f, s) {
    const k = f.key;
    if (f.kind === 'text') {
      const v = val(pid === SHARED ? 'index' : pid, k) ?? '';
      const el = f.long || String(v).length > 70 || String(v).includes('\n') ? h('textarea', { rows: '3' }) : h('input', { type: 'text' });
      el.value = v; el.setAttribute('aria-label', f.label || 'טקסט');
      el.addEventListener('input', () => { setVal(shared ? 'index' : pid, s.id, k, el.value); });
      return h('div', { class: 'fld' }, f.label ? h('label', { text: f.label }) : null, el);
    }
    if (f.kind === 'url') {
      const v = val(shared ? 'index' : pid, k) ?? '';
      const el = h('input', { type: 'text', class: 'ltr', dir: 'ltr', placeholder: '/tours/ או https://…', value: v, 'aria-label': 'כתובת הקישור' });
      el.addEventListener('input', () => setVal(shared ? 'index' : pid, s.id, k, el.value));
      return h('div', { class: 'fld' }, h('label', { text: 'לאן הקישור מוביל' }), el, /\{\{set\./.test(v) ? h('span', { class: 'hint', text: 'חלק מהכתובת מתעדכן אוטומטית מהגדרות האתר (טלפון/וואטסאפ).' }) : null);
    }
    if (f.kind === 'image') return imageField(shared ? 'index' : pid, s.id, k, f.locked, null);
    return null;
  }
  const OWN = (x) => x;

  function imageField(P, S_, k, locked, itemCtx) {
    const get = () => (itemCtx ? itemCtx.item[k] : val(P, k)) || {};
    const set = (v) => { if (itemCtx) { itemCtx.item[k] = v; itemCtx.commit(); } else setVal(P, S_, k, v); paintThumb(); };
    const v0 = get();
    const img = h('img', { src: v0.src && !v0.src.includes('{{') ? v0.src : '', alt: '' });
    const focal = h('span', { class: 'focal', style: 'display:none' });
    const thumb = h('div', { class: 'thumb' }, img, focal);
    const alt = h('input', { type: 'text', 'aria-label': 'תיאור נגיש לתמונה', value: v0.alt || '', placeholder: 'מה רואים בתמונה (לקורא מסך ולגוגל)' });
    function paintThumb() { const v = get(); img.src = v.src || ''; if (v.pos) { const [x, y] = v.pos.split(' ').map((n) => parseFloat(n)); focal.style.cssText = `left:${x}%;top:${y}%`; focal.style.display = 'block'; } }
    alt.addEventListener('input', () => set({ ...get(), alt: alt.value }));
    thumb.addEventListener('click', (e) => { if (locked) return; const r = thumb.getBoundingClientRect(); set({ ...get(), pos: `${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%` }); });
    paintThumb();
    return h('div', { class: 'imgfld' }, thumb, h('div', { style: 'display:grid;gap:10px' }, h('div', { class: 'fld' }, h('label', { text: 'תיאור נגיש (alt)' }), alt),
      locked ? h('p', { class: 'notice', text: 'תמונת הפתיחה צמודה לגזרת יוסק׳ה ולרצף הגלילה, ולכן אי אפשר להחליף אותה כאן.' })
        : h('div', { class: 'imgfld__acts' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { const m = await pickMedia({ current: get().src }); if (m) { set({ ...get(), src: m.url, srcset: '', s: [], w: String(m.w || ''), h: String(m.h || ''), alt: alt.value || m.alt || '', pos: m.pos && m.pos !== '50% 50%' ? m.pos : get().pos }); alt.value = get().alt; } } }, icon('image'), 'החלפה מהספרייה'),
          h('span', { class: 'hint count', text: 'לחיצה על התמונה קובעת את נקודת המוקד שתישאר בפריים כשהיא נחתכת.' }))));
  }

  // ---- repeating items
  function listEditor(l, s) {
    const P = shared ? 'index' : pid;
    const box = h('div', { class: 'group' });
    const commit = () => setItems(P, s.id, l.key, cur);
    let cur = items(P, s.id, l.key);
    const paint = () => {
      box.replaceChildren(h('div', { class: 'group__h' }, h('span', { text: l.label }), h('span', { class: 'count', text: `${cur.length} פריטים` }), h('span', { style: 'flex:1' }),
        h('button', { class: 'btn btn--sm btn--primary', type: 'button', onclick: addItem }, icon('plus'), l.hasImages ? 'הוספת תמונה' : `הוספת ${l.itemLabel}`)),
        ...cur.map((it, i) => item(it, i)));
      if (!cur.length) box.append(h('p', { class: 'count', text: 'הרשימה ריקה.' }));
    };
    async function addItem() {
      const base = clone(cur[cur.length - 1] || S.defaults.pages[P].lists[l.key][0]); base.id = rid();
      if (l.hasImages) { const m = await pickMedia({}); if (!m) return; for (const g of l.groups) for (const f of g.fields) if (f.kind === 'image') base[f.key] = { src: m.url, srcset: '', s: [], w: String(m.w || ''), h: String(m.h || ''), alt: m.alt || '', pos: base[f.key]?.pos }; }
      cur.push(base); commit(); paint();
    }
    const move = (i, d) => { const j = i + d; if (j < 0 || j >= cur.length) return; [cur[i], cur[j]] = [cur[j], cur[i]]; commit(); paint(); };
    function item(it, i) {
      const fields = [];
      for (const g of l.groups) for (const f of g.fields) {
        if (f.kind === 'text') { const long = f.long || String(it[f.key] || '').length > 70; const el = long ? h('textarea', { rows: '3' }) : h('input', { type: 'text' }); el.value = it[f.key] ?? ''; el.setAttribute('aria-label', `${g.label} ${l.itemLabel} ${i + 1}`); el.addEventListener('input', () => { it[f.key] = el.value; commit(); }); fields.push(h('div', { class: 'fld' }, h('label', { text: g.label }), el)); }
        else if (f.kind === 'url') { const el = h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: it[f.key] ?? '', 'aria-label': 'כתובת הקישור' }); el.addEventListener('input', () => { it[f.key] = el.value; commit(); }); fields.push(h('div', { class: 'fld' }, h('label', { text: 'קישור' }), el)); }
        else if (f.kind === 'image') fields.push(imageField(P, s.id, f.key, false, { item: it, commit }));
        else if (f.kind === 'icon') { const sel = h('select', { 'aria-label': 'אייקון' }, ICONS.map((n) => h('option', { value: n, selected: it[f.key] === n }, ICON_LABEL[n]))); sel.addEventListener('change', () => { it[f.key] = sel.value; commit(); }); fields.push(h('div', { class: 'fld' }, h('label', { text: 'אייקון' }), sel)); }
      }
      return h('div', { class: 'item' }, h('div', { class: 'item__h' }, h('span', { text: `${l.itemLabel} ${i + 1}` }), h('span', { class: 'sp' }),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': 'העלאה', disabled: i === 0, onclick: () => move(i, -1) }, icon('up')), h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': 'הורדה', disabled: i === cur.length - 1, onclick: () => move(i, 1) }, icon('down')),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': 'שכפול', onclick: () => { const c = clone(it); c.id = rid(); cur.splice(i + 1, 0, c); commit(); paint(); } }, icon('copy')),
        h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': 'הסרה', onclick: async () => { if (await confirmDialog({ title: 'הסרת פריט', text: `להסיר את ${l.itemLabel} ${i + 1}? הפריט יוסר מהאתר אחרי הפרסום (אפשר לשחזר גרסה).`, confirm: 'הסרה', danger: true })) { cur.splice(i, 1); commit(); paint(); } } }, icon('trash'))), ...fields);
    }
    paint();
    return box;
  }

  // ---- SEO tab
  function paintSeo() {
    const seo = seoOf(pid), isHome = pid === 'index', canMove = !['index', 'notfound'].includes(pid);
    const count = (el, min, max) => { const c = h('span', { class: 'count' }); const upd = () => { const n = el.value.length; c.textContent = `${n} תווים`; c.className = 'count' + (n > max || (n && n < min) ? ' bad' : ''); }; el.addEventListener('input', upd); upd(); return c; };
    const title = h('input', { type: 'text', value: seo.title || '', 'aria-label': 'כותרת SEO' }), desc = h('textarea', { rows: '3', 'aria-label': 'תיאור מטא' }); desc.value = seo.description || '';
    const path = h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: pathOf(pid), disabled: !canMove, 'aria-label': 'כתובת העמוד' });
    const noidx = h('input', { type: 'checkbox', checked: !!seo.noindex, onchange: () => setSeo(pid, 'noindex', noidx.checked) });
    const snippetT = h('div', { class: 'snippet__t' }), snippetD = h('div', { class: 'snippet__d' }), snippetU = h('div', { class: 'snippet__u' });
    const base = (S.settings.siteUrl || 'https://האתר-שלכם').replace(/\/+$/, '');
    const upd = () => { snippetT.textContent = title.value || '(חסרה כותרת)'; snippetD.textContent = desc.value || '(חסר תיאור. גוגל ישלוף קטע מהעמוד)'; snippetU.textContent = base + path.value; };
    title.addEventListener('input', () => { setSeo(pid, 'title', title.value); upd(); }); desc.addEventListener('input', () => { setSeo(pid, 'description', desc.value); upd(); });
    path.addEventListener('input', () => { setSeo(pid, 'path', path.value.trim().toLowerCase()); upd(); });
    const og = seo.ogImage || '';
    const ogImg = h('img', { src: og, alt: '', style: 'max-width:220px;border-radius:10px' });
    const warnings = (S.report || []).filter((r) => r.where === def.label && r.level !== 'info');
    const h1 = S.schema.pages[pid].sections.flatMap((x) => x.groups).find((g) => g.label === 'כותרת ראשית');
    upd();
    panel.replaceChildren(h('h2', { class: 'card__h', text: 'SEO וכתובת העמוד' }),
      warnings.length ? h('div', { class: 'notice notice--warn' }, h('strong', { text: 'שימו לב' }), h('ul', { class: 'deps', style: 'margin:0;padding:0' }, warnings.map((w) => h('li', { text: w.msg })))) : null,
      h('div', { class: 'snippet', 'aria-label': 'תצוגה מקדימה בגוגל' }, snippetT, snippetU, snippetD),
      h('div', { class: 'fld' }, h('label', { text: 'כותרת SEO' }), title, count(title, 15, 65), h('span', { class: 'hint', text: 'עד כ-60 תווים. הכותרת הראשית בעמוד נערכת בסקשן הפתיחה.' })),
      h('div', { class: 'fld' }, h('label', { text: 'תיאור מטא' }), desc, count(desc, 50, 170)),
      h('div', { class: 'fld' }, h('label', { text: 'כתובת העמוד' }), path, h('span', { class: 'hint', text: canMove ? 'שינוי כתובת יוצר אוטומטית הפניה 301 מהכתובת הישנה ומעדכן את הקישורים הפנימיים והמפה. אפשר להשתמש באותיות לטיניות קטנות, ספרות ומקפים.' : isHome ? 'כתובת דף הבית קבועה.' : 'כתובת קבועה.' })),
      h('div', { class: 'fld' }, h('label', { text: 'תמונה לשיתוף ברשתות' }), og ? ogImg : h('span', { class: 'hint', text: 'ללא תמונה ייעודית נעשה שימוש בתמונת השיתוף הכללית של האתר.' }),
        h('div', { class: 'imgfld__acts' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { const m = await pickMedia({ current: og }); if (m) { setSeo(pid, 'ogImage', m.url); paintSeo(); } } }, icon('image'), og ? 'החלפה' : 'בחירה מהספרייה'), og ? h('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => { setSeo(pid, 'ogImage', ''); paintSeo(); } }, 'הסרה') : null)),
      h('label', { class: 'switch' }, noidx, h('span', { class: 'switch__t' }), 'לא להציג בגוגל (noindex) ולהוציא ממפת האתר'),
      h1 ? h('p', { class: 'count', text: 'מבנה הכותרות: הכותרת הראשית (H1) היא הכותרת הראשונה בסקשן הפתיחה, וכותרות הסקשנים הן H2. עורכים אותן בלשונית ״סקשנים ותוכן״.' }) : null);
  }

  // ---- preview (the real site components, draft content, protected by the admin session)
  async function openPreview(secId) {
    if (S.unsaved) { try { await saveDraft(); } catch (e) { return toast(e.message, 'err'); } }
    const path = shared ? '/' : pathOf(pid);
    let mobile = false;
    const frame = h('iframe', { title: 'תצוגה מקדימה של הטיוטה', src: `/__preview${path === '/' ? '/' : path}${secId ? '#' + secId : ''}` });
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'גודל מסך' }, [['desk', 'מחשב', false], ['phoneui', 'מובייל', true]].map(([ic, l, m]) => h('button', { class: 'seg__b', type: 'button', 'aria-pressed': String(mobile === m), onclick: () => { mobile = m; frame.classList.toggle('is-mobile', m); [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === (m ? 1 : 0)))); } }, icon(ic), l)));
    const dr = drawer({ title: 'תצוגה מקדימה: ' + def.label, cls: 'drawer--full', body: h('div', { class: 'preview', style: 'margin:-20px;height:calc(100% + 40px)' }, h('div', { class: 'preview__bar' }, seg, h('span', { class: 'count', text: 'זו הטיוטה, מוצגת דרך רכיבי האתר עצמו. האתר הציבורי לא משתנה עד הפרסום.' })), h('div', { class: 'preview__stage' }, frame)),
      footer: [h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { dr.close(); await publishFlow(); paintStatus(); } }, icon('send'), 'פרסום לאתר'), h('button', { class: 'btn', type: 'button', onclick: () => dr.close() }, 'חזרה לעריכה')] });
  }

  paintTabs(); paintList(); paintPanel();
  return () => off();
}
