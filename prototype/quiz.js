/* "Which tour fits you?" (15.11.2026). One question per step, the ages question only for families with kids.
   The recommendation is shown before any contact details; it points only at tours that exist on the site, and
   falls back to a tailored day when nothing fits clearly. The answers can be sent with the lead (forms.js reads form.__quiz). */
(function () {
  'use strict';
  var root = document.querySelector('[data-quiz]');
  if (!root) return;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var TOURS = JSON.parse($('[data-quiz-tours]').textContent);
  var form = $('[data-quiz-form]'), steps = $$('.qstep'), back = $('[data-quiz-back]'), next = $('[data-quiz-next]');
  var bar = $('[data-quiz-bar]'), count = $('[data-quiz-count]'), result = $('[data-quiz-result]');
  var leadForm = $('form[data-lead]', result);
  var LABEL = {}; $$('.qopt').forEach(function (l) { var i = l.querySelector('input'); LABEL[i.name + ':' + i.value] = l.textContent.trim(); });
  var i = 0, started = false;

  function answers() {
    var a = {};
    steps.forEach(function (st) {
      var k = st.getAttribute('data-step'), ins = $$('input:checked', st).map(function (x) { return x.value; });
      a[k] = st.querySelector('[type=checkbox]') ? ins : ins[0] || '';
    });
    return a;
  }
  function active() { var a = answers(); return steps.filter(function (st) { var c = st.getAttribute('data-if'); if (!c) return true; var p = c.split('='); return a[p[0]] === p[1]; }); }

  function show(n) {
    var list = active(); i = Math.max(0, Math.min(n, list.length - 1));
    steps.forEach(function (st) { st.hidden = st !== list[i]; });
    $$('[data-qnum]').forEach(function (s) { s.textContent = ''; });
    back.hidden = i === 0;
    next.firstChild.nodeValue = i === list.length - 1 ? 'להמלצה' : 'הבאה';
    count.textContent = 'שאלה ' + (i + 1) + ' מתוך ' + list.length;
    bar.style.transform = 'scaleX(' + ((i + 1) / list.length).toFixed(3) + ')';
    return list[i];
  }

  function recommend(a) {
    var sc = {}, why = {}, ints = a.interests || [];
    Object.keys(TOURS).forEach(function (k) { sc[k] = 0; why[k] = []; });
    var add = function (k, n, w) { if (sc[k] === undefined) return; sc[k] += n; if (w && n > 0) why[k].push(w); };
    var has = function (x) { return ints.indexOf(x) > -1; };
    if (a.group === 'kids') { add('sodot-veremazim', 6, 'נבנה בשביל משפחות וילדים, עם חידות ורמזים בדרך'); }
    else add('sodot-veremazim', -4);
    if (has('game')) add('sodot-veremazim', 3, 'יש בו משחק: יוצאים לעיר בעקבות רמזים');
    if (a.time === 'full') add('haifa-ahuvati', 5, 'הסיור המלא, כ-5 עד 6 שעות, מתאים ליום ארוך');
    if (a.time === 'three') add('haifa-ahuvati-mekutzar', 5, 'כ-3 שעות, בדיוק הזמן שיש לכם');
    if (a.time === 'short') { add('haifa-shel-maala', 4, 'כ-2.5 שעות'); add('haifa-shel-mata', 4, 'כ-2.5 שעות'); }
    if (a.time === 'flex') { add('haifa-ahuvati', 1); add('haifa-ahuvati-mekutzar', 2, 'מכסה גם את הגנים וגם את העיר התחתית בכ-3 שעות'); }
    if (has('views')) { add('haifa-shel-maala', 3, 'עובר בתצפיות ובטיילת לואי'); add('haifa-ahuvati', 1); add('haifa-ahuvati-mekutzar', 1); }
    if (has('gardens')) { add('haifa-shel-maala', 2, 'מתחיל בגנים הבהאיים'); add('haifa-ahuvati', 2, 'עובר לאורך ציר הגנים הבהאיים'); add('haifa-ahuvati-mekutzar', 2, 'עובר בגנים הבהאיים'); }
    if (has('lower')) { add('haifa-shel-mata', 3, 'כולו בעיר התחתית: השוק הטורקי, הנמל ומגדל השעון'); add('haifa-ahuvati', 1); add('haifa-ahuvati-mekutzar', 1); }
    if (has('people')) { add('haifa-shel-mata', 1); }
    if (a.pace === 'calm') { add('haifa-ahuvati', -2); add('haifa-shel-maala', 1, 'קצר וקל יחסית לקצב רגוע'); }
    if (a.pace === 'active') { add('haifa-ahuvati', 1, 'מתאים לקבוצה שאוהבת ללכת'); }
    var best = Object.keys(sc).sort(function (x, y) { return sc[y] - sc[x]; })[0];
    var custom = sc[best] < 4 || (a.group === 'team' && has('people') && sc[best] < 7);
    return { best: best, custom: custom, reasons: why[best].slice(0, 3) };
  }

  function finish() {
    var a = answers(), r = recommend(a), t = TOURS[r.best];
    $('[data-r-kicker]').textContent = r.custom ? 'נראה שמתאים לכם' : 'הסיור שהכי מתאים לכם';
    $('[data-r-name]').textContent = r.custom ? 'יום בהתאמה לקבוצה שלכם' : t.name;
    $('[data-r-why]').textContent = r.custom
      ? 'לא מצאנו סיור קבוע אחד שעונה על הכול, וזה בדיוק המקרה ליום שנבנה סביבכם: יוסק׳ה בונה מסלול לפי תחומי העניין, הגילים והקצב. כנקודת פתיחה אפשר להסתכל על «' + t.name + '».'
      : t.blurb;
    var ul = $('[data-r-reasons]'); ul.innerHTML = '';
    (r.custom ? ['נבנה סביב תחומי העניין שבחרתם', 'בקצב ובמשך שמתאימים לקבוצה'] : r.reasons).forEach(function (w) { var li = document.createElement('li'); li.textContent = w; ul.appendChild(li); });
    var link = $('[data-r-link]'); link.href = t.url; link.textContent = r.custom ? 'להציץ ב«' + t.name + '»' : 'לדף הסיור';
    var summary = function (k) { var v = a[k]; if (Array.isArray(v)) return v.map(function (x) { return LABEL[k + ':' + x]; }).join(', '); return v ? LABEL[k + ':' + v] : ''; };
    if (leadForm) {
      leadForm.__quiz = { group: summary('group'), ages: a.group === 'kids' ? summary('ages') : '', time: summary('time'), interests: summary('interests'), pace: summary('pace'),
        result: r.custom ? 'יום בהתאמה (בסיס: ' + t.name + ')' : t.name, fit: r.reasons.join('; ') };
      leadForm.elements.tour_slug.value = r.best;
    }
    form.hidden = true; result.hidden = false; result.focus();
    if (window.ytrack) window.ytrack('quiz_complete', { result: r.custom ? 'custom' : r.best });
  }

  form.addEventListener('change', function () {
    if (!started) { started = true; if (window.ytrack) window.ytrack('quiz_start', {}); }
    var st = active()[i], e = st && st.querySelector('[data-qerr]'); if (e) e.hidden = true;
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = active()[i], err = st.querySelector('[data-qerr]');
    if (!st.querySelector('input:checked')) { err.hidden = false; st.querySelector('input').focus(); return; }
    if (i === active().length - 1) return finish();
    var nx = show(i + 1); nx.querySelector('input').focus();
  });
  back.addEventListener('click', function () { var p = show(i - 1); p.querySelector('input').focus(); });
  $('[data-quiz-restart]').addEventListener('click', function () { form.reset(); result.hidden = true; form.hidden = false; show(0).querySelector('input').focus(); });
  show(0);
})();
