/* Measurement layer (15.11.2026). Pages call window.ytrack(name, props) for the events the client asked for:
   page_view, cta clicks, form_open, lead_success, quiz_complete, checkout_click, outbound / whatsapp / phone.
   Rules: never send names, phones, messages or quiz answers (those live only in the CRM); load a provider only when
   one is configured (body[data-ga4]) AND the visitor turned "measurement" on in the cookie panel (prefs.js).
   Without both, events are dropped here. ?debug-track shows them in the console for testing. */
(function () {
  'use strict';
  var ga = document.body.getAttribute('data-ga4') || '', loaded = false, queue = [];
  var debug = location.search.indexOf('debug-track') > -1;
  var SAFE = /^(from|kind|tour|page|label|step|result|target|dest)$/;
  function clean(props) { var o = {}; for (var k in props || {}) if (SAFE.test(k) && props[k] != null) o[k] = String(props[k]).slice(0, 60); return o; }
  function allowed() { var c = window.__yoskeConsent; return !!(ga && c && c.m); }
  function load() {
    if (loaded || !allowed()) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga, { anonymize_ip: true, send_page_view: true });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
    document.head.appendChild(s);
    queue.splice(0).forEach(function (e) { window.gtag('event', e[0], e[1]); });
  }
  window.ytrack = function (name, props) {
    var p = clean(props);
    if (debug) console.info('[ytrack]', name, p, allowed() ? 'sent' : 'dropped (no provider or no consent)');
    if (!allowed()) return;
    if (!loaded) { queue.push([name, p]); load(); return; }
    window.gtag('event', name, p);
  };
  document.addEventListener('yoske:consent', function () { load(); });
  load();
  // declarative clicks: <a data-track="name" data-track-from="where">
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-track]');
    if (a) window.ytrack(a.getAttribute('data-track'), { from: a.getAttribute('data-track-from') || '', page: location.pathname });
  });
})();
