const f = document.getElementById('f');
if (f) {
  const err = document.getElementById('err'), go = document.getElementById('go');
  const setup = document.body.dataset.mode === 'setup';
  const show = (m) => { err.textContent = m; err.hidden = !m; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); show('');
    const v = Object.fromEntries(new FormData(f));
    if (!v.email || !v.password) return show('נא למלא מייל וסיסמה.');
    go.disabled = true; go.setAttribute('aria-busy', 'true');
    try {
      const r = await fetch(setup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { show(j.error || 'ההתחברות נכשלה. נסו שוב.'); return; }
      if (setup) {   // the first admin exists now: sign in right away
        const r2 = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v.email, password: v.password }) });
        if (!r2.ok) { show('המנהל נוצר. התחברו עכשיו.'); location.reload(); return; }
      }
      location.href = '/admin';
    } catch { show('אין חיבור לשרת. נסו שוב.'); }
    finally { go.disabled = false; go.removeAttribute('aria-busy'); }
  });
}
