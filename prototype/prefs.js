/* Shared preferences UI: floating accessibility panel + cookie explanation (essential-only site, so no first-visit banner).
   No external vendor. Saved choices live in localStorage under "yoske-a11y" (see the privacy page).
   Saved classes are applied before first paint by the tiny head script of every page; this file only wires the controls. */
(function () {
  'use strict';
  var KEY = 'yoske-a11y', V = 1, root = document.documentElement;
  var STEPS = ['100%', '112%', '125%', '150%'];
  var state = { v: V, t: 0, c: 0, l: 0, m: 0 };
  try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); if (s && s.v === V) state = { v: V, t: s.t | 0, c: s.c | 0, l: s.l | 0, m: s.m | 0 }; } catch (e) { /* storage blocked: works for this visit only */ }
  var osReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function save() { try { if (state.t || state.c || state.l || state.m) localStorage.setItem(KEY, JSON.stringify(state)); else localStorage.removeItem(KEY); } catch (e) { } }
  function apply() {
    STEPS.forEach(function (_, i) { root.classList.toggle('a11y-t' + i, state.t === i && i > 0); });
    root.classList.toggle('a11y-contrast', !!state.c);
    root.classList.toggle('a11y-links', !!state.l);
    root.classList.toggle('a11y-still', !!state.m);
  }
  apply();

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function dialog(id, title, opener) {
    var d = el('dialog', { class: 'pdlg', id: id, 'aria-labelledby': id + '-t' });
    var head = el('div', { class: 'pdlg__head' }, [el('h2', { id: id + '-t', text: title })]);
    var x = el('button', { type: 'button', class: 'pdlg__x', 'aria-label': 'סגירה' }); x.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    head.appendChild(x); d.appendChild(head);
    x.addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });          // backdrop
    d.addEventListener('keydown', function (e) {                                            // keep Tab inside the modal
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(d.querySelectorAll('button, a[href]'), function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !d.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !d.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    });
    d.addEventListener('close', function () { root.classList.remove('pdlg-open'); if (opener && opener.focus) opener.focus(); });
    document.body.appendChild(d);
    return d;
  }
  function show(d, opener) { d.__opener = opener; root.classList.add('pdlg-open'); if (!d.open) d.showModal(); }

  /* ---------- accessibility panel ---------- */
  var fab = document.querySelector('[data-a11y-open]');
  if (fab) {
    var panel = dialog('a11y-panel', 'אפשרויות נגישות', fab), body = el('div', { class: 'pdlg__body' });
    panel.appendChild(body);
    var rows = {};
    function row(key, label, hint) {
      var b = el('button', { type: 'button', class: 'prow', role: 'switch', 'aria-checked': 'false' }, [
        el('span', { class: 'prow__l', text: label }), el('span', { class: 'prow__s', text: 'כבוי' })]);
      if (hint) b.appendChild(el('span', { class: 'prow__h', text: hint }));
      body.appendChild(b); rows[key] = b; return b;
    }
    // text size: a stepper (smaller / current / larger)
    var size = el('div', { class: 'prow prow--size', role: 'group', 'aria-labelledby': 'a11y-size-l' });
    var minus = el('button', { type: 'button', class: 'pstep', 'aria-label': 'הקטנת טקסט' }); minus.textContent = 'א−';
    var plus = el('button', { type: 'button', class: 'pstep', 'aria-label': 'הגדלת טקסט' }); plus.textContent = 'א+';
    var cur = el('span', { class: 'prow__s', 'aria-live': 'polite' });
    size.appendChild(el('span', { class: 'prow__l', id: 'a11y-size-l', text: 'גודל טקסט' }));
    size.appendChild(el('span', { class: 'prow__ctl' }, [minus, cur, plus]));
    body.appendChild(size);
    var rc = row('c', 'ניגודיות גבוהה'), rl = row('l', 'הדגשת קישורים'), rm = row('m', 'הפחתת תנועה', osReduce ? 'מוגדר גם במכשיר שלכם' : 'הדף יתרענן להחלה');
    var reset = el('button', { type: 'button', class: 'pdlg__reset', text: 'איפוס הכול' });
    var more = el('a', { class: 'pdlg__link', href: '/accessibility.html', text: 'הצהרת נגישות' });
    var foot = el('div', { class: 'pdlg__foot' }, [reset, more]); body.appendChild(foot);
    var live = el('p', { class: 'visually-hidden', role: 'status' }); body.appendChild(live);

    function paint() {
      cur.textContent = STEPS[state.t];
      minus.disabled = state.t === 0; plus.disabled = state.t === STEPS.length - 1;
      [['c', rc], ['l', rl], ['m', rm]].forEach(function (p) {
        var on = !!state[p[0]] || (p[0] === 'm' && osReduce);
        p[1].setAttribute('aria-checked', String(on)); p[1].querySelector('.prow__s').textContent = on ? 'פעיל' : 'כבוי';
      });
      fab.classList.toggle('is-active', !!(state.t || state.c || state.l || state.m));
    }
    function change(msg) { apply(); save(); paint(); live.textContent = msg; }
    minus.addEventListener('click', function () { if (state.t > 0) { state.t--; change('גודל הטקסט ' + STEPS[state.t]); } });
    plus.addEventListener('click', function () { if (state.t < STEPS.length - 1) { state.t++; change('גודל הטקסט ' + STEPS[state.t]); } });
    rc.addEventListener('click', function () { state.c = state.c ? 0 : 1; change('ניגודיות גבוהה ' + (state.c ? 'פעילה' : 'כבויה')); });
    rl.addEventListener('click', function () { state.l = state.l ? 0 : 1; change('הדגשת קישורים ' + (state.l ? 'פעילה' : 'כבויה')); });
    rm.addEventListener('click', function () { state.m = state.m ? 0 : 1; apply(); save(); location.reload(); });   // motion is decided at load
    reset.addEventListener('click', function () { var m = state.m; state = { v: V, t: 0, c: 0, l: 0, m: 0 }; apply(); save(); paint(); if (m) location.reload(); else live.textContent = 'האפשרויות אופסו'; });
    fab.addEventListener('click', function () { paint(); show(panel, fab); });
    paint();
  }

  /* ---------- cookie preferences (opened from the footer) ---------- */
  var cookieLinks = document.querySelectorAll('[data-cookie-open]');
  if (cookieLinks.length) {
    var cd = dialog('cookie-panel', 'העדפות עוגיות', null), cb = el('div', { class: 'pdlg__body' });
    cb.innerHTML =
      '<p>האתר משתמש רק בדברים חיוניים לתפקוד שלו, ולכן אין כאן מה לאשר או לדחות.</p>' +
      '<ul class="pdlg__list">' +
      '<li><strong>חיוני, פעיל:</strong> אין עוגיות. אם תבחרו באפשרויות נגישות, העדפותיכם נשמרות רק בדפדפן שלכם (localStorage) כדי שיישארו בין עמודים. הן לא נשלחות לשום מקום, ואפשר למחוק אותן ב״איפוס הכול״.</li>' +
      '<li><strong>מדידה ושיווק:</strong> לא בשימוש. אין אנליטיקס, פיקסלים או פרסום. אם יתווסף שירות כזה, הוא ייטען רק אחרי אישור שלכם.</li></ul>' +
      '<div class="pdlg__foot"><a class="pdlg__link" href="/privacy.html#cookies">מדיניות פרטיות</a></div>';
    cd.appendChild(cb);
    Array.prototype.forEach.call(cookieLinks, function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); cd.__op = a; show(cd, a); });
    });
    cd.addEventListener('close', function () { if (cd.__op) cd.__op.focus(); });
  }
})();
