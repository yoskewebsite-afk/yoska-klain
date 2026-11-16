/* Shared preferences UI: floating accessibility panel + cookie / measurement choice (first-visit banner + footer panel).
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

  /* ---------- cookie & measurement preferences (15.11.2026) ----------
     Without a measurement provider (body[data-ga4] empty) nothing is collected: the panel only explains that.
     With one, the visitor chooses (equal buttons, nothing preselected), the choice is kept under "yoske-consent",
     and analytics.js loads the provider only after "measurement" is on. The footer button reopens this panel. */
  var CK = 'yoske-consent', ga = document.body.getAttribute('data-ga4') || '';
  function getConsent() { try { var c = JSON.parse(localStorage.getItem(CK) || 'null'); return c && c.v === 1 ? c : null; } catch (e) { return null; } }
  function setConsent(m) {
    var c = { v: 1, m: m ? 1 : 0, at: new Date().toISOString().slice(0, 10) };
    try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) { }
    window.__yoskeConsent = c;
    document.dispatchEvent(new CustomEvent('yoske:consent', { detail: c }));
  }
  window.__yoskeConsent = getConsent();
  var cookieLinks = document.querySelectorAll('[data-cookie-open]');
  var cd = dialog('cookie-panel', 'העדפות עוגיות ומדידה', null), cb = el('div', { class: 'pdlg__body' });
  cd.appendChild(cb);
  /* 16.11.2026: the site's own anonymous measurement (site.js, no cookies) is always available, so the visitor is always
     asked: a first-visit banner with two equal choices, and this panel from the footer at any time. */
  function paintCookies() {
    var c = getConsent(), on = !!(c && c.m);
    cb.innerHTML =
      '<p>אתם בוחרים מה פועל באתר. אפשר לשנות את הבחירה בכל רגע מהכפתור ״העדפות עוגיות ומדידה״ בתחתית העמוד.</p>' +
      '<ul class="pdlg__list">' +
      '<li><strong>חיוני, פעיל תמיד:</strong> האתר לא יוצר עוגיות. העדפות הנגישות והבחירה הזו נשמרות בדפדפן שלכם בלבד.</li>' +
      '<li><strong>מדידה אנונימית:</strong> ספירת כניסות לדפים ולחיצות על טלפון, וואטסאפ ומייל, ומאיזה סוג אתר הגעתם (למשל גוגל). בלי עוגיות, ובלי שם, טלפון, תוכן פנייה או כתובת IP. פועלת רק אם תאשרו.</li>' +
      (ga ? '<li><strong>Google Analytics:</strong> אותה מדידה נשלחת גם לגוגל, בלי פרטים מזהים. פועל רק אם תאשרו.</li>' : '') +
      '<li><strong>פניות:</strong> פרטים שאתם שולחים בטופס נשמרים רק במערכת הפניות של יוסק׳ה, כדי לחזור אליכם.</li></ul>' +
      '<button type="button" class="prow" role="switch" aria-checked="' + on + '" data-consent-toggle><span class="prow__l">מדידה אנונימית</span><span class="prow__s">' + (on ? 'פעיל' : 'כבוי') + '</span></button>' +
      '<div class="pdlg__foot"><button type="button" class="btn btn--line btn--sm" data-consent="0">רק חיוני</button><button type="button" class="btn btn--line btn--sm" data-consent="1">אישור מדידה</button><a class="pdlg__link" href="/privacy.html#cookies">מדיניות פרטיות</a></div>';
    cb.querySelector('[data-consent-toggle]').addEventListener('click', function () { setConsent(!on); paintCookies(); });
    Array.prototype.forEach.call(cb.querySelectorAll('[data-consent]'), function (b) {
      b.addEventListener('click', function () { setConsent(b.getAttribute('data-consent') === '1'); cd.close(); });
    });
  }
  Array.prototype.forEach.call(cookieLinks, function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); paintCookies(); cd.__op = a; show(cd, a); });
  });
  cd.addEventListener('close', function () { if (cd.__op) cd.__op.focus(); var bn = document.querySelector('.cbanner'); if (bn && getConsent()) bn.remove(); });
  // first visit with a provider configured: a small, non-blocking banner with two equal choices
  if (!getConsent()) {
    var bn = el('div', { class: 'cbanner', role: 'region', 'aria-label': 'עוגיות ומדידה' });
    bn.innerHTML = '<p class="cbanner__t"><strong>עוגיות ומדידה.</strong> האתר לא משתמש בעוגיות. נשמח לספור כניסות ולחיצות באופן אנונימי כדי לשפר אותו, בלי שם, טלפון או פרטים מזהים. זה יפעל רק אם תאשרו.</p>' +
      '<div class="btnrow"><button type="button" class="btn btn--line btn--sm" data-c="0">רק חיוני</button><button type="button" class="btn btn--line btn--sm" data-c="1">אישור מדידה</button><button type="button" class="linkbtn" data-c="more">פרטים</button></div>';
    document.body.appendChild(bn);
    Array.prototype.forEach.call(bn.querySelectorAll('[data-c]'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-c');
        if (v === 'more') { paintCookies(); show(cd, b); return; }
        setConsent(v === '1'); bn.remove();
      });
    });
  }
})();
