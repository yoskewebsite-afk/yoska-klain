/* Lead forms + upcoming dates (15.11.2026).
   - form[data-lead]: posts to /api/leads. Success is shown ONLY after the server answered 201 (saved in the CRM).
     Field errors from the server (422) are shown on the fields; a failed save shows a recoverable error with a retry
     and WhatsApp as a separate channel. One request at a time per form, one client_token per submit (no duplicates).
   - [data-upcoming]: the published dates still ahead, from /api/dates (admin -> tour_dates). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var track = function (n, p) { if (window.ytrack) window.ytrack(n, p); };
  var token = function () { return (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32); };
  var PHONE = /^(?:\+?972|0)(?:[23489]|5\d|7\d)\d{7}$/;
  var KIND_LABEL = { general: 'פנייה כללית', family: 'משפחה וחברים', org: 'חברה או ארגון', tour: 'סיור מסוים', date: 'מועד מהלוח', quiz: 'אחרי השאלון', sale: 'הרשמה' };

  function utm() {
    try { var q = new URLSearchParams(location.search), o = []; ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) o.push(k + '=' + q.get(k)); }); return o.join('&'); } catch (e) { return ''; }
  }

  function setErr(form, name, msg) {
    var input = form.elements[name], err = $('[data-err="' + name + '"]', form);
    if (!input || !err) return;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg || ''; err.hidden = !msg;
  }

  function initForm(form) {
    var btn = $('[type="submit"]', form), ok = $('[data-lead-ok]', form.parentNode), bad = $('[data-lead-bad]', form), busy = false, opened = false;
    form.__token = token();
    form.addEventListener('focusin', function () { if (!opened) { opened = true; track('form_open', { kind: form.elements.kind && form.elements.kind.value, page: location.pathname }); } });

    function check() {
      var f = form.elements, good = true, first = null;
      var name = (f.name.value || '').trim(), phone = (f.phone.value || '').replace(/[\s\-().]/g, '');
      if (name.length < 2) { setErr(form, 'name', 'כתבו איך לפנות אליכם (לפחות שתי אותיות).'); good = false; first = first || f.name; } else setErr(form, 'name', '');
      if (!PHONE.test(phone)) { setErr(form, 'phone', 'מספר הטלפון לא נראה תקין. נסו למשל 050-1234567.'); good = false; first = first || f.phone; } else setErr(form, 'phone', '');
      if (first) first.focus();
      return good;
    }
    ['name', 'phone'].forEach(function (n) { var i = form.elements[n]; i && i.addEventListener('blur', function () { if (i.getAttribute('aria-invalid') === 'true') check(); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      if (bad) bad.hidden = true;
      if (!check()) return;
      busy = true; btn.disabled = true; form.setAttribute('aria-busy', 'true');
      var label = btn.textContent; btn.textContent = 'שולחים…';
      var f = form.elements;
      var payload = {
        name: f.name.value, phone: f.phone.value, message: [f.message ? f.message.value.trim() : ''].concat($$('[data-msg]', form).filter(function (i) { return i.value.trim(); }).map(function (i) { return i.getAttribute('data-msg') + ': ' + i.value.trim(); })).filter(Boolean).join('\n').slice(0, 1500),
        kind: f.kind ? f.kind.value : 'general', tour_slug: f.tour_slug ? f.tour_slug.value : '', date_id: f.date_id ? f.date_id.value : '',
        website: f.website ? f.website.value : '', source_page: location.pathname + location.hash, source_ref: document.referrer.slice(0, 200),
        utm: utm(), client_token: form.__token, quiz: form.__quiz || null
      };
      fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (res) {
          if (res.s === 201 && res.j.ok) {
            track('lead_success', { kind: payload.kind, page: location.pathname });
            form.hidden = true;
            if (ok) { ok.hidden = false; ok.focus(); }
            form.reset(); form.__token = token();
            return;
          }
          if (res.s === 422 && res.j.fields) {
            if (res.j.fields.name) setErr(form, 'name', 'כתבו איך לפנות אליכם (לפחות שתי אותיות).');
            if (res.j.fields.phone) setErr(form, 'phone', 'מספר הטלפון לא נראה תקין. נסו למשל 050-1234567.');
            var inv = $('[aria-invalid="true"]', form); if (inv) inv.focus();
            return;
          }
          throw new Error(res.s);
        })
        .catch(function (err) {
          if (bad) {
            $('[data-bad-text]', bad).textContent = String(err.message) === '429'
              ? 'נשלחו מכאן כמה פניות ברצף. נסו שוב בעוד כמה דקות, או כתבו בוואטסאפ.'
              : 'הפנייה לא נשמרה, כנראה תקלה רגעית אצלנו. הפרטים שכתבתם עדיין כאן: אפשר לנסות שוב, או לכתוב בוואטסאפ.';
            bad.hidden = false; bad.focus();
          }
        })
        .then(function () { busy = false; btn.disabled = false; btn.textContent = label; form.removeAttribute('aria-busy'); });
    });

    var again = ok && $('[data-lead-again]', ok);
    if (again) again.addEventListener('click', function () { ok.hidden = true; form.hidden = false; form.elements.name.focus(); });
  }
  $$('form[data-lead]').forEach(initForm);

  /* presets: ?kind=family#contact, or a link with data-lead-kind / data-lead-tour / data-lead-date that points at a form */
  function preset(form, o) {
    if (!form) return;
    var k = form.elements.kind;
    if (o.kind && k) {
      if (k.tagName === 'SELECT' && !Array.prototype.some.call(k.options, function (op) { return op.value === o.kind; })) k.add(new Option(KIND_LABEL[o.kind] || o.kind, o.kind));
      k.value = o.kind;
    }
    if (form.elements.tour_slug && o.tour != null) form.elements.tour_slug.value = o.tour;
    if (form.elements.date_id && o.date != null) form.elements.date_id.value = o.date;
    if (o.note && form.elements.message && !form.elements.message.value) form.elements.message.value = o.note;
    var tag = $('[data-lead-context]', form);
    if (tag) { tag.textContent = o.label ? 'הפנייה תסומן: ' + o.label : ''; tag.hidden = !o.label; }
  }
  window.__leadPreset = preset;
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('kind')) preset($('form[data-lead]'), { kind: q.get('kind'), tour: q.get('tour') || '', date: q.get('date') || '',
      label: q.get('label') || KIND_LABEL[q.get('kind')], note: q.get('note') || '' });
  } catch (e) { }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lead-kind]');
    if (!a) return;
    var id = (a.getAttribute('href') || '').split('#')[1], form = id ? $('#' + id + ' form[data-lead]') || $('form[data-lead]') : $('form[data-lead]');
    if (!form || (a.pathname && a.pathname !== location.pathname)) return;
    preset(form, { kind: a.getAttribute('data-lead-kind'), tour: a.getAttribute('data-lead-tour') || '', date: a.getAttribute('data-lead-date') || '',
      label: a.getAttribute('data-lead-label') || KIND_LABEL[a.getAttribute('data-lead-kind')], note: a.getAttribute('data-lead-note') || '' });
  });

  /* ---------------- upcoming dates ---------------- */
  var fmt = function (d) {
    try { return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')); } catch (e) { return d; }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  $$('[data-upcoming]').forEach(function (box) {
    var list = $('[data-upcoming-list]', box), empty = $('[data-upcoming-empty]', box), only = box.getAttribute('data-tour') || '';
    var formSel = box.getAttribute('data-form') || '#contact';
    fetch('/api/dates', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var rows = (j.dates || []).filter(function (d) { return !only || d.tour_slug === only; });
        box.setAttribute('data-state', rows.length ? 'list' : 'empty');
        if (!rows.length) { empty.hidden = false; return; }
        list.innerHTML = rows.map(function (d) {
          var when = fmt(d.date) + (d.time ? ', ' + esc(d.time) : '');
          var more = d.tour_slug ? '<a class="textlink" href="/tours/' + esc(d.tour_slug) + '.html">על הסיור</a>' : '';
          var act = (d.action === 'register' || d.action === 'link') && d.action_url
            ? '<a class="btn btn--sun btn--sm" href="' + esc(d.action_url) + '" target="_blank" rel="noopener" data-track="' + (d.action === 'register' ? 'checkout_click' : 'date_link') + '" data-track-from="upcoming">' + (d.action === 'register' ? 'להרשמה ותשלום' : 'לפרטים והרשמה') + '<span class="visually-hidden"> ל' + esc(d.title) + ' (נפתח באתר אחר)</span></a>'
            : '<a class="btn btn--ink btn--sm" href="' + (formSel.charAt(0) === '/' ? formSel.replace('#', '?' + new URLSearchParams({ kind: 'date', date: d.id, tour: d.tour_slug || '', label: d.title + ', ' + fmt(d.date), note: 'אשמח להצטרף ל' + d.title + ' ב' + fmt(d.date) }).toString().replace(/&/g, '&amp;') + '#') : formSel) + '" data-lead-kind="date" data-lead-date="' + esc(d.id) + '" data-lead-tour="' + esc(d.tour_slug) + '" data-lead-label="' + esc(d.title + ', ' + fmt(d.date)) + '" data-lead-note="' + esc('אשמח להצטרף ל' + d.title + ' ב' + fmt(d.date)) + '">שמרו לי מקום<span class="visually-hidden"> ב' + esc(d.title) + '</span></a>';
          return '<li class="udate"><p class="udate__when"><svg class="bicon" aria-hidden="true"><use href="#b-calendar"/></svg><time datetime="' + esc(d.date) + '">' + when + '</time></p>' +
            '<h3 class="udate__title">' + esc(d.title) + '</h3>' +
            (d.meeting_point ? '<p class="udate__meta"><svg class="bicon" aria-hidden="true"><use href="#b-pin"/></svg>' + esc(d.meeting_point) + '</p>' : '') +
            (d.note ? '<p class="udate__note">' + esc(d.note) + '</p>' : '') +
            (d.price_note ? '<p class="udate__meta udate__price">' + esc(d.price_note) + '</p>' : '') +
            '<div class="btnrow">' + act + more + '</div></li>';
        }).join('');
        list.hidden = false;
      })
      .catch(function () { box.setAttribute('data-state', 'empty'); empty.hidden = false; });
  });
})();
