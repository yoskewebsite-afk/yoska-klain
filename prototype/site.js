/* First-party, cookie-free measurement for the admin dashboard. It runs ONLY after the visitor allowed measurement in the
   cookie panel (window.__yoskeConsent.m, set by prefs.js) and sends no names, phones, e-mails, message text or full addresses.
   Lead forms are handled by forms.js; this file never touches them. */
(function () {
  'use strict';
  var cfg = {};
  try { cfg = JSON.parse((document.getElementById('site-config') || {}).textContent || '{}'); } catch (e) { /* no config */ }
  var rnd = function () { var a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); };
  var allowed = function () { var c = window.__yoskeConsent; return !cfg.preview && !!(c && c.m); };
  var pageSid = null, pvSent = false, providers = [];
  var sid = function () { try { var s = sessionStorage.getItem('yoske-sid'); if (!s) { s = rnd(); sessionStorage.setItem('yoske-sid', s); } return s; } catch (e) { return pageSid || (pageSid = rnd()); } };
  function send(type, extra) {
    if (!allowed()) return;
    var body = { c: 1, type: type, eid: rnd(), sid: sid(), page: cfg.page || '', tour: cfg.tour || '' };
    for (var k in extra) body[k] = extra[k];
    providers.forEach(function (p) { try { p({ type: type, page: cfg.page, tour: cfg.tour }); } catch (e) { /* a provider must never break the page */ } });
    var json = JSON.stringify(body);
    try { if (navigator.sendBeacon && navigator.sendBeacon('/api/event', new Blob([json], { type: 'application/json' }))) return; } catch (e) { /* fall through */ }
    try { fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }); } catch (e) { /* offline */ }
  }
  function refInfo() {
    var host = ''; try { host = document.referrer ? new URL(document.referrer).hostname : ''; if (host === location.hostname) host = ''; } catch (e) { host = ''; }
    var utm = ''; try { utm = (new URLSearchParams(location.search).get('utm_source') || '').slice(0, 30); } catch (e) { /* none */ }
    return { ref: host, utm: utm };
  }
  function pageview() { if (pvSent || !allowed()) return; pvSent = true; send('pv', refInfo()); }   // once per page load: re-renders never double count
  document.addEventListener('yoske:consent', function () { if (!allowed()) { try { sessionStorage.removeItem('yoske-sid'); } catch (e) { /* nothing */ } } pageview(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) send('tel'); else if (/^https:\/\/wa\.me\//.test(h)) send('wa'); else if (h.indexOf('mailto:') === 0) send('mail');
  }, true);
  window.yoskeTrack = { addProvider: function (fn) { if (typeof fn === 'function') providers.push(fn); }, event: send };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageview); else pageview();
})();
