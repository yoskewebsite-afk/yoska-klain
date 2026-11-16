// Shared building blocks of the admin: DOM helper, API client, icons, toasts, drawers, dialogs, pickers, chart.
export const h = (tag, a = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked') n.checked = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  glass: '<path d="M12 3c3.5 4.2 6 7 6 10.2A6 6 0 0 1 6 13.2C6 10 8.5 7.2 12 3z"/><path d="M9.5 14a2.6 2.6 0 0 0 2.5 2.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>',
  grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.7A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.3-1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrowout: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  phoneui: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', desk: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.2v.1"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7M8 20v-6h8v6"/>', send: '<path d="M21 3 3 10.5l7 3 3 7z"/><path d="m10 13.5 11-10.5"/>',
};
export const icon = (n) => h('span', { html: `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`, style: 'display:contents' }).firstChild;

// ---------------------------------------------------------------- API
let CSRF = '';
export const setCsrf = (c) => { CSRF = c; };
export class ApiError extends Error { constructor(m, status, body) { super(m); this.status = status; this.body = body; } }
export async function api(method, url, body, opts = {}) {
  let r;
  try {
    r = await fetch(url, { method, credentials: 'same-origin', headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': CSRF } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError('אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.', 0); }
  if (opts.raw) return r;
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { document.dispatchEvent(new CustomEvent('admin:expired', { detail: j })); throw new ApiError(j.error || 'ההתחברות פגה.', 401, j); }
  if (!r.ok || j.ok === false) throw new ApiError(j.error || 'משהו השתבש.', r.status, j);
  return j;
}

// ---------------------------------------------------------------- toasts
let toastBox;
export function toast(msg, kind = '') {
  toastBox ||= document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite', role: 'status' }));
  const t = h('div', { class: 'toast' + (kind === 'err' ? ' toast--err' : ''), text: msg });
  toastBox.append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3200);
}

// ---------------------------------------------------------------- focus handling for overlays
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function trap(root, onEsc) {
  const opener = document.activeElement;
  const key = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onEsc(); }
    if (e.key !== 'Tab') return;
    const f = $$(FOCUSABLE, root).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', key);
  setTimeout(() => ($('[autofocus]', root) || $$(FOCUSABLE, root).find((x) => !x.matches('.drawer__h button')) || root).focus(), 30);
  return () => opener && opener.isConnected && opener.focus();
}

/** side drawer: returns {el, body, close}. onClose may veto (return false) */
export function drawer({ title, body, footer, cls = '', onClose }) {
  const scrim = h('div', { class: 'scrim' });
  const closeBtn = h('button', { class: 'btn btn--icon btn--ghost', type: 'button', 'aria-label': 'סגירה' }, icon('x'));
  const bodyEl = h('div', { class: 'drawer__b' }, body);
  const el = h('aside', { class: 'drawer ' + cls, role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div', { class: 'drawer__h' }, h('h2', { text: title }), closeBtn), bodyEl, footer ? h('div', { class: 'drawer__f' }, footer) : null);
  document.body.append(scrim, el);
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); });
  let back;
  const api_ = { el, body: bodyEl, close: async (force) => {
    if (!force && onClose && (await onClose()) === false) return;
    scrim.classList.remove('on'); el.classList.remove('on'); document.documentElement.style.overflow = '';
    setTimeout(() => { scrim.remove(); el.remove(); }, 240); back && back();
  } };
  closeBtn.addEventListener('click', () => api_.close());
  scrim.addEventListener('click', () => api_.close());
  back = trap(el, () => api_.close());
  return api_;
}

export function dialog({ title, body, actions = [], cls = '' }) {
  return new Promise((resolve) => {
    const scrim = h('div', { class: 'scrim' });
    const box = h('div', { class: 'dlg__box', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('h2', { text: title }), body, h('div', { class: 'dlg__f' }, actions.map((a) => h('button', { class: 'btn ' + (a.cls || ''), type: 'button', ...(a.focus ? { autofocus: '' } : {}), onclick: async () => { if (a.onclick && (await a.onclick()) === false) return; done(a.value); } }, a.label))));
    const wrap = h('div', { class: 'dlg ' + cls }, box);
    document.body.append(scrim, wrap);
    requestAnimationFrame(() => { scrim.classList.add('on'); box.classList.add('on'); });
    let back;
    const done = (v) => { scrim.classList.remove('on'); box.classList.remove('on'); setTimeout(() => { scrim.remove(); wrap.remove(); }, 200); back && back(); resolve(v); };
    scrim.addEventListener('click', () => done(undefined));
    back = trap(wrap, () => done(undefined));
  });
}
export const confirmDialog = ({ title, text, confirm = 'אישור', danger = false }) =>
  dialog({ title, body: h('p', { text }), actions: [{ label: 'ביטול', value: false }, { label: confirm, value: true, cls: danger ? 'btn--danger' : 'btn--primary', focus: true }] });

// ---------------------------------------------------------------- media (picker + upload)
export async function resizeForUpload(file) {
  if (file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('לא ניתן לקרוא את התמונה.');
  const max = 2000, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88));
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg'), { type: blob.type });
}
const b64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
export async function uploadFile(file, alt = '') {
  const f = await resizeForUpload(file);
  return (await api('POST', '/api/admin/media', { name: f.name, data: await b64(f), alt })).media;
}

export function mediaGrid({ items, selected, onPick }) {
  return h('div', { class: 'mgrid', role: 'list' }, items.map((m) => h('button', { class: 'mcell', type: 'button', role: 'listitem', 'aria-pressed': String(selected === m.url), 'aria-label': `${m.name}${m.alt ? ': ' + m.alt : ''}`, onclick: () => onPick(m) },
    h('span', { class: 'thumb' }, h('img', { src: m.url, alt: '', loading: 'lazy' })), h('span', { class: 'chk' }, icon('check')), h('small', { text: m.name }))));
}

/** modal library: pick an existing picture or upload a new one. resolves with a media item, or null */
export function pickMedia({ current } = {}) {
  return new Promise(async (resolve) => {
    let items = [], q = '', onlyMine = false, chosen = null;
    const grid = h('div'), status = h('p', { class: 'count', 'aria-live': 'polite' });
    const search = h('input', { type: 'search', placeholder: 'חיפוש לפי שם', 'aria-label': 'חיפוש תמונה', oninput: (e) => { q = e.target.value; paint(); } });
    const mine = h('label', { class: 'switch' }, h('input', { type: 'checkbox', onchange: (e) => { onlyMine = e.target.checked; paint(); } }), h('span', { class: 'switch__t' }), 'רק שהעליתי');
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', class: 'vh', tabindex: '-1', onchange: async (e) => { if (e.target.files[0]) await up(e.target.files[0]); e.target.value = ''; } });
    const up = async (f) => { status.textContent = 'מעלים…'; try { const m = await uploadFile(f); items = [m, ...items.filter((x) => x.id !== m.id)]; chosen = m; paint(); status.textContent = 'הועלתה. אפשר לבחור אותה.'; } catch (err) { status.textContent = ''; toast(err.message, 'err'); } };
    const drop = h('div', { class: 'dropzone', ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'), ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) up(e.dataTransfer.files[0]); } },
      icon('upload'), h('span', { text: 'גררו תמונה לכאן, או' }), h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, 'העלאת תמונה חדשה'), h('span', { class: 'count', text: 'JPG, PNG, WebP. מוקטנת אוטומטית ל-2000 פיקסלים.' }));
    const paint = () => {
      const list = items.filter((m) => (!onlyMine || !m.builtin) && (!q || (m.name + ' ' + (m.alt || '')).includes(q)));
      grid.replaceChildren(list.length ? mediaGrid({ items: list, selected: chosen?.url || current, onPick: (m) => { chosen = m; paint(); } }) : h('div', { class: 'empty' }, h('b', { text: 'לא נמצאו תמונות' }), 'נסו חיפוש אחר או העלו תמונה חדשה.'));
    };
    const res = dialog({ title: 'ספריית התמונות', cls: 'dlg--lg', body: h('div', { style: 'display:grid;gap:14px' }, drop, file, h('div', { class: 'toolbar', style: 'margin:0' }, h('div', { class: 'search' }, icon('search'), search), mine), status, grid),
      actions: [{ label: 'ביטול', value: null }, { label: 'בחירה', cls: 'btn--primary', value: 'ok', onclick: () => { if (!chosen) { toast('בחרו תמונה מהרשימה.', 'err'); return false; } } }] });
    grid.replaceChildren(h('div', { class: 'skeleton', style: 'height:160px' }));
    try { items = (await api('GET', '/api/admin/media')).media; paint(); } catch (e) { grid.replaceChildren(h('div', { class: 'notice notice--danger', text: e.message })); }
    resolve(res.then((v) => (v === 'ok' ? chosen : null)));
  });
}

// ---------------------------------------------------------------- chart (SVG, tooltip on hover/touch, table fallback)
const fmtDay = (k) => new Date(k + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
export function chart({ data, series, kind = 'line', ariaLabel, unit = '' }) {
  const wrap = h('div', { class: 'chart' });
  const W = 700, H = 250, m = { l: 40, r: 14, t: 14, b: 30 };
  const maxV = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.k] || 0)));
  const step = maxV <= 5 ? 1 : Math.pow(10, Math.floor(Math.log10(maxV / 4))) * ([1, 2, 5].find((x) => maxV / (x * Math.pow(10, Math.floor(Math.log10(maxV / 4)))) <= 5) || 10);
  const top = Math.ceil(maxV / step) * step;
  const x = (i) => m.l + (data.length === 1 ? (W - m.l - m.r) / 2 : (i * (W - m.l - m.r)) / (data.length - 1));
  const bw = (W - m.l - m.r) / data.length;
  const xb = (i) => m.l + bw * i + bw / 2;
  const y = (v) => H - m.b - (v / top) * (H - m.t - m.b);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', ariaLabel);
  const add = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
  for (let v = 0; v <= top; v += step) { add('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid-l' }); add('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }).textContent = v; }
  const every = Math.ceil(data.length / 7);
  data.forEach((d, i) => { if (i % every === 0) add('text', { x: kind === 'bar' ? xb(i) : x(i), y: H - 8, 'text-anchor': 'middle' }).textContent = fmtDay(d.k); });
  if (kind === 'bar') data.forEach((d, i) => { const v = d[series[0].k] || 0; if (v) add('rect', { x: xb(i) - Math.min(14, bw * .36), y: y(v), width: Math.min(28, bw * .72), height: y(0) - y(v), rx: 4, class: 'bar-r' }); });
  else series.forEach((s, si) => { add('path', { d: data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[s.k] || 0).toFixed(1)}`).join(''), class: si ? 'ln2' : 'ln1' }); });
  const defs = add('defs', {});
  const lg = add('linearGradient', { id: 'areafill', x1: 0, x2: 0, y1: 0, y2: 1 }, defs); add('stop', { offset: 0, 'stop-color': 'var(--chart-1)', 'stop-opacity': .28 }, lg); add('stop', { offset: 1, 'stop-color': 'var(--chart-1)', 'stop-opacity': 0 }, lg);
  const bg = add('linearGradient', { id: 'barfill', x1: 0, x2: 0, y1: 0, y2: 1 }, defs); add('stop', { offset: 0, 'stop-color': 'var(--chart-2)' }, bg); add('stop', { offset: 1, 'stop-color': 'var(--chart-1)' }, bg);
  if (kind !== 'bar') svg.insertBefore(add('path', { class: 'area', d: data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[series[0].k] || 0).toFixed(1)}`).join('') + `L${x(data.length - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z` }), svg.querySelector('.ln1'));
  const hov = add('line', { y1: m.t, y2: H - m.b, class: 'hov', style: 'display:none' });
  const dots = series.map((s, si) => add('circle', { r: 5, class: si ? 'dot2' : 'dot', style: 'display:none' }));
  const tip = h('div', { class: 'tip', style: 'display:none' });
  const move = (ev) => {
    const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
    let i = kind === 'bar' ? Math.floor((px - m.l) / bw) : Math.round(((px - m.l) / (W - m.l - m.r)) * (data.length - 1));
    i = Math.max(0, Math.min(data.length - 1, i)); const d = data[i], cx = kind === 'bar' ? xb(i) : x(i);
    hov.setAttribute('x1', cx); hov.setAttribute('x2', cx); hov.style.display = '';
    dots.forEach((c, si) => { c.setAttribute('cx', cx); c.setAttribute('cy', y(d[series[si].k] || 0)); c.style.display = kind === 'bar' ? 'none' : ''; });
    tip.replaceChildren(h('b', { text: new Date(d.k + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long' }) }), ...series.map((s) => h('span', {}, s.label, h('em', { text: (d[s.k] || 0) + unit }))));
    tip.style.display = ''; tip.style.left = `${(cx / W) * 100}%`; tip.style.top = `${(y(Math.max(...series.map((s) => d[s.k] || 0))) / H) * 100}%`;
  };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { hov.style.display = 'none'; dots.forEach((c) => (c.style.display = 'none')); tip.style.display = 'none'; });
  const legend = h('div', { class: 'legend' }, series.map((s, i) => h('span', {}, h('i', { class: i ? 'd' : '' }), s.label)));
  const table = h('details', { style: 'margin-top:10px' }, h('summary', { text: 'הצגה כטבלה', style: 'cursor:pointer;font-weight:600;color:var(--text-2)' }),
    h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { text: 'תאריך' }), series.map((s) => h('th', { text: s.label })))), h('tbody', {}, data.map((d) => h('tr', { style: 'cursor:default' }, h('td', { text: fmtDay(d.k) }), series.map((s) => h('td', { class: 'num', text: d[s.k] || 0 }))))))));
  wrap.append(svg, tip, kind === 'bar' ? '' : legend, table);
  return wrap;
}

export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (iso ? new Date(iso).toLocaleDateString('he-IL', opts) : '');
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const STATUS = { new: 'חדשה', contacted: 'נוצר קשר', waiting: 'ממתינה לתשובה', won: 'נסגר טיול', lost: 'נסגר ללא הזמנה' };
export const statusTag = (s) => h('span', { class: `tag tag--${s}`, text: STATUS[s] || s });
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const rid = () => Math.random().toString(36).slice(2, 10);
