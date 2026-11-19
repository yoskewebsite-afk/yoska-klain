const f = document.getElementById('f');
if (f) {
  const err = document.getElementById('err'), go = document.getElementById('go');
  const setup = document.body.dataset.mode === 'setup';
  const show = (m) => { err.textContent = m; err.hidden = !m; };
  // 19.11.2026: sign-in with the personal code (shown only once a code was set in Settings)
  let way = f.querySelector('[data-way]') ? 'code' : 'pw';
  const ways = [...f.querySelectorAll('[data-way]')];
  const paintWay = () => {
    ways.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.way === way)));
    f.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== way; });
    (f.querySelector(way === 'code' ? '#code' : '#email') || {}).focus?.();
  };
  ways.forEach((b) => b.addEventListener('click', () => { way = b.dataset.way; show(''); paintWay(); }));
  if (ways.length) paintWay();
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); show('');
    const all = Object.fromEntries(new FormData(f));
    const v = way === 'code' ? { code: String(all.code || '').trim() } : { ...all, code: undefined };
    if (way === 'code' && !/^\d{6,12}$/.test(v.code)) return show('הקוד הוא 6 עד 12 ספרות.');
    if (way !== 'code' && (!v.email || !v.password)) return show('נא למלא מייל וסיסמה.');
    go.disabled = true; go.setAttribute('aria-busy', 'true');
    try {
      const r = await fetch(setup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { show(j.error || 'ההתחברות נכשלה. נסו שוב.'); return; }
      if (setup) {   // the first admin exists now: sign in right away
        const r2 = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v.email, password: v.password }) });
        if (!r2.ok) { show('המנהל נוצר. התחברו עכשיו.'); location.reload(); return; }
      }
      location.href = '/yoske-nihul-7k4q';
    } catch { show('אין חיבור לשרת. נסו שוב.'); }
    finally { go.disabled = false; go.removeAttribute('aria-busy'); }
  });
}
