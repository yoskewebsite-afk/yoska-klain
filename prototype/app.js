/* Yoske Klein — behaviour and motion (18.10.2026: landscape scenes rebuilt from the user's reels, Lenis smooth scroll).
   GSAP 3.13 + ScrollTrigger, native scroll, gsap.matchMedia() for desktop / mobile / reduced motion.
   Everything works without GSAP: controls fall back to instant state changes. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PHONE = '972544361667';
  const wa = text => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduceMQ.matches || location.search.includes('still');
  const gsap = window.gsap, ST = window.ScrollTrigger;

  /* ---------------- menu ---------------- */
  const menuBtn = $('.nav__menu'), menu = $('#menu');
  if (menuBtn && menu) {
    const setMenu = open => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? 'סגירה' : 'תפריט'; };
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------------- hero deck (reel DYj36b8ohUn): front card, neighbours peeking behind, arrows, dots, swipe ---------------- */
  const deck = $('[data-deck]');
  const heroState = { scrolled: false };
  if (deck) {
    const cards = $$('[data-card]', deck), dots = $$('[data-deck-dots] i', deck), pause = $('[data-deck-pause]', deck), n = cards.length;
    let cur = 0, timer = 0, paused = false, visible = true, hover = false;
    const layout = () => cards.forEach((c, k) => {
      let off = (k - cur + n) % n; if (off > n / 2) off -= n;
      c.dataset.off = String(Math.max(-2, Math.min(2, off)));
      c.setAttribute('aria-hidden', String(off !== 0));
      dots[k] && dots[k].classList.toggle('is-on', k === cur);
    });
    const go = d => { cur = (cur + d + n) % n; layout(); };
    const tick = () => { clearTimeout(timer); if (!paused && visible && !hover && !heroState.scrolled && !still()) timer = setTimeout(() => { go(1); tick(); }, 4200); };
    $('[data-deck-next]', deck).addEventListener('click', () => { go(1); tick(); });
    $('[data-deck-prev]', deck).addEventListener('click', () => { go(-1); tick(); });
    pause.addEventListener('click', () => { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'הפעלת ההחלפה האוטומטית' : 'עצירת ההחלפה האוטומטית'); tick(); });
    deck.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; tick(); } });
    deck.addEventListener('pointerleave', () => { hover = false; tick(); });
    deck.addEventListener('focusin', () => { hover = true; tick(); });
    deck.addEventListener('focusout', () => { hover = false; tick(); });
    // swipe: in RTL the next card waits on the left, so dragging it to the right brings it forward
    let x0 = null;
    deck.addEventListener('pointerdown', e => { if (!e.target.closest('button')) x0 = e.clientX; });
    deck.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { go(dx > 0 ? 1 : -1); tick(); } });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; tick(); }).observe(deck);
    heroState.front = () => cards[cur];
    heroState.tick = tick;
    layout(); tick();
  }

  /* ---------------- tours: Timed Cards (reel C4CjTo8Mlyx) ---------------- */
  const timed = $('[data-timed]');
  if (timed) {
    const bgs = $$('[data-bg]', timed), items = $$('[data-item]', timed), list = $('[data-cards]', timed), lis = $$('li', list);
    const bar = $('[data-timed-bar]', timed), num = $('[data-timed-num]', timed), pause = $('[data-timed-pause]', timed), n = bgs.length;
    let cur = 0, busy = false, paused = false, visible = false, hover = false, barTw = null, timer = 0;
    const motion = () => gsap && !still();
    const order = animate => {
      const first = new Map(lis.map(li => [li, li.getBoundingClientRect()]));
      for (let k = 1; k <= n; k++) list.appendChild(lis[(cur + k) % n]);
      lis.forEach(li => li.classList.toggle('is-active', +li.dataset.cardI === cur));
      if (!animate) return;
      lis.forEach(li => { const a = first.get(li), b = li.getBoundingClientRect(); if (!a.width || !b.width) return; gsap.fromTo(li, { x: a.left - b.left }, { x: 0, duration: .8, ease: 'power3.out' }); });
    };
    const run = () => {
      clearTimeout(timer); if (barTw) barTw.kill();
      if (paused || !visible || hover || still()) { if (bar && !barTw) bar.style.transform = 'scaleX(0)'; return; }
      if (gsap) barTw = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 7, ease: 'none', onComplete: () => show((cur + 1) % n, $(`[data-to="${(cur + 1) % n}"]`, timed)) });
      else timer = setTimeout(() => show((cur + 1) % n), 7000);
    };
    const show = (i, fromEl) => {
      if (busy || i === cur) return;
      busy = true;
      const prev = cur, nb = bgs[i], ob = bgs[prev], ni = items[i], oi = items[prev];
      cur = i; num.textContent = String(i + 1).padStart(2, '0');
      const done = () => { ob.classList.remove('is-on'); nb.classList.remove('is-in'); nb.classList.add('is-on'); nb.style.clipPath = ''; busy = false; run(); };
      oi.hidden = true; oi.classList.remove('is-on'); ni.hidden = false; ni.classList.add('is-on');
      if (motion()) {
        const st = timed.getBoundingClientRect(), r = (fromEl && fromEl.offsetParent ? fromEl : $(`[data-to="${i}"]`, timed)).getBoundingClientRect();
        nb.classList.add('is-in');
        gsap.fromTo(nb, { clipPath: `inset(${r.top - st.top}px ${st.right - r.right}px ${st.bottom - r.bottom}px ${r.left - st.left}px round 18px)` },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'power3.inOut', onComplete: done });
        gsap.fromTo(nb.querySelector('img'), { scale: 1.18 }, { scale: 1, duration: 1.5, ease: 'power3.out' });
        gsap.from(ni.children, { y: 34, autoAlpha: 0, duration: .7, stagger: .06, ease: 'power3.out', delay: .35 });
        order(true);
      } else { nb.classList.add('is-in'); order(false); done(); }
    };
    $$('[data-to]', timed).forEach(b => b.addEventListener('click', () => show(+b.dataset.to, b)));
    $('[data-timed-next]', timed).addEventListener('click', () => show((cur + 1) % n, $(`[data-to="${(cur + 1) % n}"]`, timed)));
    $('[data-timed-prev]', timed).addEventListener('click', () => show((cur - 1 + n) % n, null));
    pause.addEventListener('click', () => { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'הפעלת ההחלפה האוטומטית' : 'עצירת ההחלפה האוטומטית'); run(); });
    timed.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; run(); } });
    timed.addEventListener('pointerleave', () => { hover = false; run(); });
    timed.addEventListener('focusin', () => { hover = true; run(); });
    timed.addEventListener('focusout', e => { if (!timed.contains(e.relatedTarget)) { hover = false; run(); } });
    new IntersectionObserver(([e]) => { visible = e.intersectionRatio > .35; if (e.isIntersecting) bgs.forEach(b => { b.querySelector('img').loading = 'eager'; }); run(); }, { threshold: [0, .35, .7] }).observe(timed);
    order(false);
  }

  /* ---------------- matcher: pill sentence ---------------- */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const TOURS = {
      sodot: ['סודות ורמזים בחיפה', '/tours/sodot-veremazim.html', 'סיור חידות שנבנה למשפחות, עם עצירות שמתאימות לילדים.'],
      full: ['חיפה אהובתי', '/tours/haifa-ahuvati.html', 'הסיור המלא, מהגנים הבהאיים ועד הנמל, לקבוצה שיש לה יום.'],
      up: ['חיפה של מעלה', '/tours/haifa-shel-maala.html', 'הגנים, טיילת לואי ורובע המדרגות, בכשעתיים וחצי.'],
      down: ['חיפה של מטה', '/tours/haifa-shel-mata.html', 'העיר התחתית: מגדל השעון, השוק הטורקי והמושבה הגרמנית, בכשעתיים וחצי.'],
      short: ['חיפה אהובתי מקוצר', '/tours/haifa-ahuvati-mekutzar.html', 'טעימה מהכול בכשלוש שעות: הגנים, הכרמלית, כיכר פריז והנמל.'],
    };
    const pick = (who, what) => {
      if (who === 'משפחה עם ילדים' || what === 'חידות והפעלה לילדים') return TOURS.sodot;
      if (what === 'תצפיות וגנים') return TOURS.up;
      if (what === 'רחובות, שווקים וסיפורים') return TOURS.down;
      return who === 'צוות מהעבודה' ? TOURS.full : TOURS.short;
    };
    const result = $('[data-quiz-result]', quiz);
    const sel = name => quiz.querySelector(`input[name="${name}"]:checked`);
    const paint = name => {
      const i = sel(name), pill = $(`[data-pill-${name}]`, quiz);
      $(`[data-pill-${name}-t]`, quiz).textContent = i.dataset.short;
      pill.querySelector('img').src = `/assets/approved/${i.dataset.img}-480.webp`;
      if (gsap && !still()) gsap.fromTo(pill, { scale: .96 }, { scale: 1, duration: .45, ease: 'back.out(2)' });
    };
    quiz.addEventListener('change', e => { paint(e.target.name); result.hidden = true; });
    quiz.addEventListener('submit', e => {
      e.preventDefault();
      const who = sel('who').value, what = sel('what').value, [name, href, why] = pick(who, what);
      $('[data-quiz-tour]', quiz).textContent = name;
      $('[data-quiz-why]', quiz).textContent = why + (who === 'צוות מהעבודה' ? ' לצוות נבנה את היום סביב הקבוצה.' : '');
      $('[data-quiz-link]', quiz).href = href;
      $('[data-quiz-wa]', quiz).href = wa(`היי יוסק׳ה, ענינו על השאלון באתר.\nעם מי יוצאים: ${who}\nמה מסקרן: ${what}\nההצעה באתר: ${name}. נשמח לתאם.`);
      result.hidden = false; result.focus();
    });
  }

  /* ---------------- what awaits: expanding pill panels ---------------- */
  const awRow = $('[data-awaits]');
  if (awRow) {
    const items = $$('[data-aw]', awRow);
    const open = it => items.forEach(x => { const on = x === it; x.classList.toggle('is-open', on); x.querySelector('.aw__toggle').setAttribute('aria-expanded', String(on)); });
    items.forEach(it => {
      it.querySelector('.aw__toggle').addEventListener('click', () => open(it));
      it.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover) and (min-width: 900px)').matches) open(it); });
    });
  }

  /* ---------------- contact: prepares a WhatsApp draft, never sends ---------------- */
  const form = $('[data-contact]');
  if (form) {
    const ready = $('[data-ready]', form), preview = $('[data-preview]', form), openWa = $('[data-open-wa]', form);
    const fields = { name: $('#c-name'), phone: $('#c-phone'), msg: $('#c-msg') };
    const setErr = (el, bad) => { el.setAttribute('aria-invalid', String(bad)); const e = $(`#${el.id}-err`); if (e) e.hidden = !bad; if (bad) el.setAttribute('aria-describedby', `${el.id}-err`); else el.removeAttribute('aria-describedby'); };
    const phoneOk = v => /^(\+?972|0)\d{8,9}$/.test(v.replace(/[^\d+]/g, ''));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = fields.name.value.trim(), phone = fields.phone.value.trim(), msg = fields.msg.value.trim();
      const badName = !name, badPhone = !phoneOk(phone);
      setErr(fields.name, badName); setErr(fields.phone, badPhone);
      if (badName) return fields.name.focus();
      if (badPhone) return fields.phone.focus();
      const text = `היי יוסק׳ה, הגעתי דרך האתר.\nשם: ${name}\nטלפון: ${phone}` + (msg ? `\n${msg}` : '');
      preview.textContent = text; openWa.href = wa(text); ready.hidden = false; ready.focus();
    });
    form.addEventListener('input', e => { if (!ready.hidden) ready.hidden = true; if (e.target.getAttribute('aria-invalid') === 'true') setErr(e.target, false); });
    $('[data-edit]', form).addEventListener('click', () => { ready.hidden = true; fields.msg.focus(); });
  }

  /* ---------------- motion ---------------- */
  if (!gsap || !ST) { doc.classList.add('no-float'); doc.classList.remove('plan-on', 'fan-on', 'sea-on', 'gate-on'); return; }
  window.__motion = true;
  gsap.registerPlugin(ST);

  /* smooth scroll (the «Mostar» reel's main point): Lenis drives the page, GSAP's ticker drives Lenis */
  if (window.Lenis && !still()) {
    const lenis = new window.Lenis({ lerp: .085, wheelMultiplier: .95, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"], a[href^="/#"]'); if (!a) return;
      const id = a.getAttribute('href').replace(/^\/?#/, ''); const el = id && document.getElementById(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: -8, duration: 1.4 }); history.replaceState(null, '', '#' + id);
      setTimeout(() => { const f = el.querySelector('h1, h2, [tabindex]'); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); } }, 1450);
    });
    reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) lenis.destroy(); });
    window.__lenis = lenis;
  }

  const navBar = $('[data-nav]'), float = $('[data-float]');
  ST.create({ start: 8, end: 'max', onToggle: s => navBar && navBar.classList.toggle('is-solid', s.isActive) });
  if (navBar && document.body.classList.contains('home')) ST.create({ start: 0, end: 'max', onUpdate: s => navBar.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > 240 && !navBar.contains(document.activeElement)) });
  if (float && !$('[data-nf]')) doc.classList.add('no-float');
  else if (float) ST.create({ trigger: '.tc', start: 'top 70%', endTrigger: '#contact', end: 'top 75%', onToggle: s => float.classList.toggle('is-on', s.isActive) });

  const sampler = (path, box) => {
    const len = path.getTotalLength(), N = 240, pts = [];
    for (let k = 0; k <= N; k++) { const p = path.getPointAtLength(len * k / N); pts.push([p.x, p.y]); }
    return t => { const f = Math.min(Math.max(t, 0), 1) * N, k = Math.floor(f), r = f - k, a = pts[k], b = pts[Math.min(k + 1, N)]; return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]; };
  };

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px) and (prefers-reduced-motion: no-preference)', mob: '(max-width: 899px) and (prefers-reduced-motion: no-preference)' }, ctx => {
    const { desk } = ctx.conditions;
    if (location.search.includes('still')) { doc.classList.remove('plan-on', 'fan-on', 'sea-on', 'gate-on'); return; }
    ['fan-on', 'sea-on'].forEach(k => doc.classList.toggle(k, desk)); doc.classList.add('gate-on');
    const plan = $('[data-plan]');
    doc.classList.toggle('plan-on', !!(desk && plan));

    /* HERO (reel DYj36b8ohUn): entrance, then the front card opens to the whole screen and the tagline lands */
    const hero = $('[data-hero]');
    if (hero) {
      gsap.from('.hero__wall > *, .hero__tag', { y: 24, autoAlpha: 0, duration: .8, ease: 'power3.out', stagger: .08, delay: .3 });
      gsap.from('.deck__card', { y: 80, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: .06, delay: .2, clearProps: 'transform,opacity,visibility' });
      const full = $('[data-hero-full]'), stage = $('[data-hero-stage]');
      const rect = () => { const f = heroState.front(), s = stage.getBoundingClientRect(), r = f.getBoundingClientRect(); return [r.top - s.top, s.right - r.right, s.bottom - r.bottom, r.left - s.left]; };
      const fill = () => { const img = heroState.front().querySelector('img'); if (!full.firstChild || full.firstChild.dataset.k !== img.currentSrc) { full.innerHTML = ''; const c = new Image(); c.src = img.currentSrc || img.src; c.alt = ''; c.dataset.k = img.currentSrc; full.appendChild(c); } };
      let box = [0, 0, 0, 0];
      const htl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: s => { const was = heroState.scrolled; heroState.scrolled = s.progress > .02; if (was !== heroState.scrolled) { stage.classList.toggle('is-opening', heroState.scrolled); heroState.tick(); } },
        onLeaveBack: () => { box = rect(); fill(); } } });
      const clip = p => { const k = 1 - p; return `inset(${box[0] * k}px ${box[1] * k}px ${box[2] * k}px ${box[3] * k}px round ${28 * k}px)`; };
      const st = { p: 0 };
      htl.set(full, { autoAlpha: 1 }, .05)
        .fromTo(st, { p: 0 }, { p: 1, duration: .3, ease: 'power2.inOut', onStart: () => { box = rect(); fill(); }, onUpdate: () => { full.style.clipPath = clip(st.p); } }, .05)
        .to('.hero__wall, .hero__tag, .deck__nav, .deck__dots, .deck__pause', { autoAlpha: 0, duration: .12 }, .04)
        .set('[data-say-a], [data-say-b]', { visibility: 'visible' }, .3)
        .fromTo('[data-say-a] span', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: .1, stagger: .03, ease: 'power3.out' }, .36)
        .to('[data-say-a] span', { autoAlpha: 0, y: -40, duration: .07, stagger: .02, ease: 'power2.in' }, .54)
        .fromTo('[data-say-b] span', { autoAlpha: 0, y: 50, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: .1, stagger: .04, ease: 'power3.out' }, .6)
        .set('[data-hero-brand]', { visibility: 'visible' }, .8)
        .fromTo('[data-hero-brand]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .07 }, .8)
        .fromTo('[data-hero-brand] span', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .08, ease: 'power3.out' }, .85)
        .to({}, { duration: .07 }, .93);
      gsap.set(full, { autoAlpha: 0 });
      ctx.add(() => { full.style.clipPath = ''; stage.classList.remove('is-opening'); });
    }

    /* INTRO (reel DD68KjVzghB): one card, the stack builds, fans into an arc, settles into the row (desktop) */
    const fan = $('[data-fan]');
    if (desk && fan) {
      const row = $('[data-fan-row]'), fc = $$('[data-fan-card]', row), lead = fc.findIndex(c => c.classList.contains('fan__card--lead'));
      const d = el => (row.offsetWidth / 2) - (el.offsetLeft + el.offsetWidth / 2);
      const maxd = () => Math.max(...fc.map(c => Math.abs(d(c)))) || 1;
      const order = fc.map((c, k) => k).sort((a, b) => (a === lead ? -1 : b === lead ? 1 : Math.abs(a - lead) - Math.abs(b - lead)));
      const ftl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: fan, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } });
      fc.forEach(c => ftl.fromTo(c, { x: () => d(c), y: 40, scale: 1.45, rotation: 0, autoAlpha: c === fc[lead] ? 1 : 0 }, { x: () => d(c), y: 40, scale: 1.45, rotation: 0, autoAlpha: c === fc[lead] ? 1 : 0, duration: .001 }, 0));
      ftl.fromTo('[data-fan-head], [data-fan-foot], [data-fan-chip]', { autoAlpha: 0 }, { autoAlpha: 0, duration: .001 }, 0);
      order.slice(1).forEach((k, j) => ftl.to(fc[k], { autoAlpha: 1, rotation: (j % 2 ? 1 : -1) * (3 + j), duration: .03 }, .04 + j * .035));
      fc.forEach(c => ftl.to(c, { x: () => d(c) * .2, y: () => 10 + Math.pow(d(c) / maxd(), 2) * 70, rotation: () => -d(c) / maxd() * 16, scale: 1, duration: .2, ease: 'power2.inOut' }, .3));
      ftl.fromTo('[data-fan-head]', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .12, ease: 'power2.out' }, .36);
      fc.forEach(c => ftl.to(c, { x: 0, y: 0, rotation: 0, duration: .2, ease: 'power2.inOut' }, .6));
      ftl.fromTo('[data-fan-chip]', { autoAlpha: 0, scale: .6 }, { autoAlpha: 1, scale: 1, duration: .08, ease: 'back.out(2)', stagger: .03 }, .7)
        .fromTo('[data-fan-foot]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .1 }, .76)
        .to({}, { duration: .12 }, .88);
    } else if (fan) {
      gsap.from('[data-fan-card]', { y: 50, autoAlpha: 0, duration: .7, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '[data-fan-row]', start: 'top 88%', once: true } });
    }

    /* GATE (reel DbpwKmfStMC «Mostar»): fly through the Clock Tower arch, text over the blurred city, then glass cards */
    const gate = $('[data-gate]');
    if (gate) {
      const near = $('[data-gate-near]'), far = $('[data-gate-far]'), farImg = $('img', far);
      near.setAttribute('viewBox', desk ? '0 250 1032 830' : '0 0 1032 1445');
      let S = 12;
      const aim = () => {
        const m = near.getScreenCTM(), r = near.getBoundingClientRect(); if (!m) return;
        const pt = near.createSVGPoint(); pt.x = 517; pt.y = 858; const c = pt.matrixTransform(m);
        near.style.transformOrigin = `${c.x - r.left}px ${c.y - r.top}px`;
        S = Math.max(innerWidth * 1.25 / (109 * m.a), innerHeight * 1.25 / (293 * m.d));
      };
      gsap.set(near, { scale: 1 }); aim();
      gsap.set(far, { '--blur': '0px', '--veil': 0 });
      const gtl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: gate, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true, onRefreshInit: () => { gsap.set(near, { scale: 1 }); aim(); } } });
      gtl.fromTo('[data-gate-panel]', { autoAlpha: 0, y: 40 }, { autoAlpha: 0, y: 40, duration: .001 }, 0)
        .fromTo('[data-gate-cards] > li', { autoAlpha: 0, y: 70 }, { autoAlpha: 0, y: 70, duration: .001 }, 0)
        .fromTo(near, { scale: 1 }, { scale: () => S, duration: .36, ease: 'power2.in' }, .04)
        .fromTo(farImg, { scale: 1.4 }, { scale: 1, duration: .4, ease: 'power1.out' }, .04)
        .to('[data-gate-word]', { scale: 1.7, y: -60, autoAlpha: 0, duration: .2, ease: 'power1.in' }, .04)
        .to(near, { autoAlpha: 0, duration: .06 }, .34)
        .to(far, { '--blur': '12px', '--veil': .42, duration: .08 }, .42)
        .to('[data-gate-panel]', { autoAlpha: 1, y: 0, duration: .08, ease: 'power2.out' }, .45)
        .to('[data-gate-panel]', { autoAlpha: 0, y: -40, duration: .07, ease: 'power2.in' }, .64)
        .to(far, { '--blur': '0px', '--veil': .12, duration: .08 }, .66)
        .to('[data-gate-cards] > li', { autoAlpha: 1, y: 0, duration: .08, stagger: .025, ease: 'power2.out' }, .72)
        .to({}, { duration: .1 }, .9);
      ctx.add(() => { near.style.transformOrigin = ''; gsap.set(far, { clearProps: '--blur,--veil' }); });
    }

    /* SOUTH AMERICA (North Face «Explore → Deeper»): the word over the water, down through the mist, into the Andes (desktop) */
    const sea = $('[data-sea]');
    if (desk && sea) {
      const deep = $$('[data-sea-deep] > *');
      const stl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sea, start: 'top top', end: 'bottom bottom', scrub: true } });
      stl.fromTo(deep, { autoAlpha: 0, y: 40 }, { autoAlpha: 0, y: 40, duration: .001 }, 0)
        .fromTo('[data-sea-b]', { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 0, scale: 1.12, duration: .001 }, 0)
        .fromTo('[data-sea-a] img', { scale: 1.05 }, { scale: 1.32, yPercent: 6, duration: .45, ease: 'power1.in' }, .04)
        .to('[data-sea-word]', { yPercent: -160, autoAlpha: 0, duration: .3, ease: 'power1.in' }, .08)
        .fromTo('[data-sea-mist]', { autoAlpha: 0, yPercent: 35 }, { autoAlpha: 1, yPercent: 0, duration: .24, ease: 'power1.out' }, .16)
        .set('[data-sea-a]', { autoAlpha: 0 }, .42)
        .to('[data-sea-b]', { autoAlpha: 1, duration: .02 }, .4)
        .to('[data-sea-b]', { scale: 1, duration: .4, ease: 'power2.out' }, .4)
        .to('[data-sea-mist]', { yPercent: -45, autoAlpha: 0, duration: .22, ease: 'power1.in' }, .44)
        .to(deep, { autoAlpha: 1, y: 0, duration: .1, stagger: .035, ease: 'power2.out' }, .56)
        .to({}, { duration: .12 }, .88);
    }

    /* travel-site scene: the landscape drifts behind the glass cards */
    gsap.fromTo('.dwhy__bg img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.dwhy', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.dovals__grid li', { y: 40, autoAlpha: 0, scale: .9, duration: .7, ease: 'power3.out', stagger: .05, scrollTrigger: { trigger: '.dovals__grid', start: 'top 85%', once: true } });


    /* ===== V3 1. NF (The North Face «Explore → Deeper»): word on the water, ripple, dive, «לעומק» and the layout ===== */
    const nf = $('[data-nf]');
    if (nf) {
      const svgNS = 'http://www.w3.org/2000/svg';
      let disp = null;
      if (false) {   // the water ripple (underwater version) — off since 18.10: the dive now stays over Haifa
        const sv = document.createElementNS(svgNS, 'svg'); sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.style.position = 'absolute';
        sv.innerHTML = '<filter id="nf-ripple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
        document.body.appendChild(sv); disp = sv.querySelector('feDisplacementMap');
      }
      const els = $$('.nf__cols > li, .nf__big, .nf__para, .nf__photo', nf);
      const ntl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: nf, start: 'top top', end: 'bottom bottom', scrub: .6 } });
      ntl.fromTo('[data-nf-deeper]', { autoAlpha: 0, y: 30, filter: 'blur(10px)' }, { autoAlpha: 0, y: 30, filter: 'blur(10px)', duration: .001 }, 0)
        .fromTo(els, { autoAlpha: 0, y: 40 }, { autoAlpha: 0, y: 40, duration: .001 }, 0)
        .fromTo('[data-nf-rail]', { yPercent: 0 }, { yPercent: 230, duration: 1 }, 0)
        .to('[data-nf-word]', { y: () => -innerHeight * .45, autoAlpha: 0, scale: .96, duration: .2, ease: 'power2.in' }, .02)
        .to('[data-nf-yoske]', { yPercent: 42, xPercent: -8, autoAlpha: 0, duration: .2, ease: 'power2.in' }, 0)
        .fromTo('[data-nf-top]', { scale: 1, yPercent: 0 }, { scale: 1.18, yPercent: -34, duration: .3, ease: 'power2.in' }, .04)
        .to('[data-nf-top]', { autoAlpha: 0, duration: .08 }, .24)
        .fromTo('[data-nf-deep]', { scale: 1.2, yPercent: 8 }, { scale: 1, yPercent: 0, duration: .36, ease: 'power2.out' }, .12)
        .to('[data-nf-deeper]', { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: .12, ease: 'power2.out' }, .32)
        .to(els, { autoAlpha: 1, y: 0, duration: .1, stagger: .045, ease: 'power2.out' }, .44)
        .to({}, { duration: .2 }, .8);
      if (disp) ntl.fromTo(disp, { attr: { scale: 0 } }, { attr: { scale: 90 }, duration: .2, ease: 'power1.in' }, .06).set('[data-nf-top]', { filter: 'none' }, 0).set('[data-nf-top]', { filter: 'url(#nf-ripple)' }, .06);
    }

    /* ===== V3 2. TC (Timed Cards): every scroll step opens the next card into the whole background ===== */
    const tc = $('[data-tc]');
    if (tc) {
      const stage = $('[data-tc-stage]'), bgs = $$('[data-tc-bg]', tc), items = $$('[data-tc-item]', tc), list = $('[data-tc-cards]', tc), lis = $$('li', list), N = bgs.length - 1, line = $('[data-tc-line]', tc);
      let cur = 0, busy = null;
      const order = animate => {
        const first = new Map(lis.map(li => [li, li.getBoundingClientRect()]));
        const seq = []; for (let k = 1; k <= N; k++) seq.push(((cur - 1 + k) % N) + 1);
        seq.forEach(k => list.appendChild(lis[k - 1])); if (cur) list.appendChild(lis[cur - 1]);
        lis.forEach(li => li.classList.toggle('is-active', +li.dataset.tcCard === cur));
        if (animate) lis.forEach(li => { const a = first.get(li), b = li.getBoundingClientRect(); if (a.width && b.width && a.left !== b.left) gsap.fromTo(li, { x: a.left - b.left }, { x: 0, duration: .8, ease: 'power3.out' }); else if (b.width && !a.width) gsap.from(li, { autoAlpha: 0, x: 60, duration: .6, ease: 'power3.out' }); });
      };
      const go = (i, fromEl) => {
        if (i === cur) return;
        if (busy) busy.progress(1);
        const prev = cur, nb = bgs[i], ob = bgs[prev]; cur = i;
        items.forEach((it, k) => { it.hidden = k !== i; });
        gsap.fromTo(items[i].children, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, stagger: .06, ease: 'power3.out', delay: .25 });
        gsap.to(line, { scaleX: .27 + .73 * (i / N), duration: .8, ease: 'power3.out' });
        const card = fromEl || $(`[data-tc-to="${i}"]`, tc);
        const s = stage.getBoundingClientRect(), r = card && card.offsetParent ? card.getBoundingClientRect() : null;
        nb.classList.add('is-in');
        const done = () => { bgs.forEach(b => { if (b !== nb) b.classList.remove('is-on'); }); nb.classList.remove('is-in'); nb.classList.add('is-on'); nb.style.clipPath = ''; busy = null; };
        if (r && i > prev) busy = gsap.timeline({ onComplete: done })
          .fromTo(nb, { clipPath: `inset(${r.top - s.top}px ${s.right - r.right}px ${s.bottom - r.bottom}px ${r.left - s.left}px round 14px)` }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'power3.inOut' })
          .fromTo(nb.querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
        else busy = gsap.timeline({ onComplete: done }).fromTo(nb, { autoAlpha: 0 }, { autoAlpha: 1, duration: .6, ease: 'power2.out' });
        order(true);
      };
      bgs.forEach(b => { const im = b.querySelector('img'); im.loading = 'eager'; });
      const trig = ST.create({ trigger: tc, start: 'top top', end: 'bottom bottom', onUpdate: s => { const i = Math.min(N, Math.floor(s.progress * (N + .999))); if (i !== cur) go(i); } });
      const toStep = i => { const y = trig.start + (trig.end - trig.start) * ((i + .5) / (N + 1)); window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.1 }) : scrollTo({ top: y, behavior: 'smooth' }); };
      $$('[data-tc-to]', tc).forEach(b => b.addEventListener('click', () => toStep(+b.dataset.tcTo)));
      $('[data-tc-next]', tc).addEventListener('click', () => toStep(Math.min(N, cur + 1)));
      $('[data-tc-prev]', tc).addEventListener('click', () => toStep(Math.max(0, cur - 1)));
      order(false);
    }

    /* ===== V3 3. CONT: the landscape keeps going, the elements fly in from depth ===== */
    const cont = $('[data-cont]');
    if (cont) {
      const ce = $$('[data-cont-el]', cont);
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: cont, start: desk ? 'top top' : 'top 80%', end: desk ? 'bottom bottom' : 'center center', scrub: .5 } })
        .fromTo('[data-cont-bg] img', { scale: 1.25 }, { scale: 1, duration: .5, ease: 'power2.out' }, 0)
        .fromTo(ce, { autoAlpha: 0, scale: .72, z: 0, y: 80, filter: 'blur(14px)' }, { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: .14, stagger: .05, ease: 'power3.out' }, .08)
        .to({}, { duration: .25 }, .75);
    }

    /* ===== V3 4. OS (travel-site reel) ===== */
    if ($('.os')) {
      gsap.fromTo('.os__heroimg img', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.os__hero', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.to('[data-os-herocopy]', { yPercent: -40, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.os__hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.from('[data-os-box] .os__boxin > *', { y: 70, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '[data-os-box]', start: 'top 75%', once: true } });
      gsap.fromTo('[data-os-bg2]', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '[data-os-why]', start: 'center 60%', end: 'bottom 70%', scrub: true } });
      gsap.from('[data-os-card]', { y: 90, autoAlpha: 0, scale: .94, duration: .9, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.os__grid', start: 'top 85%', once: true } });
      // ovals: white ghosts that come into focus one by one (reel 7.3 → 7.8s), the second row drifts slower, the photos move inside
      const ov = $$('[data-ovals] li');
      gsap.fromTo(ov, { autoAlpha: .15, filter: 'blur(18px) saturate(0) brightness(1.6)', y: 50, scale: .9 },
        { autoAlpha: 1, filter: 'blur(0px) saturate(1) brightness(1)', y: 0, scale: 1, duration: 1.1, stagger: { each: .07, from: 'end' }, ease: 'power3.out', scrollTrigger: { trigger: '[data-ovals]', start: 'top 82%', once: true } });
      if (desk) {
        gsap.fromTo('[data-ovals]', { '--row2': '60px' }, { '--row2': '0px', ease: 'none', scrollTrigger: { trigger: '[data-ovals]', start: 'top bottom', end: 'bottom 40%', scrub: true } });
        $$('[data-ovals] img').forEach((im, k) => gsap.fromTo(im, { '--py': '-16%' }, { '--py': '0%', ease: 'none', scrollTrigger: { trigger: im, start: 'top bottom', end: 'bottom top', scrub: true } }));
      }
    }

    /* CONTACT (WanderNest): the landscape drifts behind the glass */
    gsap.fromTo('.contact__bg img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* matcher pills slide together like the reference row */
    gsap.from('.pills__row .pill', { xPercent: (k) => (k - 2) * -14, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.pills__row', start: 'top 85%', once: true } });

    /* what-awaits panels rise in sequence */
    gsap.from('[data-aw]', { y: 60, autoAlpha: 0, duration: .8, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '[data-awaits]', start: 'top 80%', once: true } });

    /* process: cable car travels between the three stops (desktop, pinned) */
    if (desk && plan) {
      const wire = $('[data-wire]'), pg = $('[data-plan-gondola]'), box = $('.plan__cable');
      const svg = wire.ownerSVGElement, wireBg = $('.plan__wire-bg', plan), D0 = wire.getAttribute('d');
      let len = 1, at = () => [0, 0];
      const buildWire = () => {
        const w = box.offsetWidth, h = box.offsetHeight; let k = 0;
        const d = D0.replace(/-?\d+(\.\d+)?/g, n => (k++ % 2 ? (+n / 200) * h : (+n / 1000) * w).toFixed(1));
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        wire.setAttribute('d', d); wireBg.setAttribute('d', d);
        len = wire.getTotalLength(); at = sampler(wire, box);
      };
      buildWire();
      const stops = [.17, .5, .83];
      const marks = stops.map(() => { const m = document.createElement('span'); m.className = 'plan__stop'; box.appendChild(m); return m; });
      const pos = { t: 0 };
      const setPG = () => { const [x, y] = at(pos.t); gsap.set(pg, { x: x - 20, y: y - 3 }); };
      const placeMarks = () => stops.forEach((t, k) => { const [x, y] = at(t); gsap.set(marks[k], { x: x - 7, y: y - 7 }); });
      const ptl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: setPG,
        scrollTrigger: { trigger: plan, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true, onRefreshInit: buildWire, onRefresh: () => { setPG(); placeMarks(); } } });
      const cards = $$('[data-step]', plan), C0 = { opacity: 0, y: 34 }, N0 = { autoAlpha: 0, y: 16 };
      ptl.fromTo(wire, { strokeDasharray: () => len, strokeDashoffset: () => len }, { strokeDasharray: () => len, strokeDashoffset: () => len, duration: .01 }, 0);
      cards.forEach(c => ptl.fromTo(c, C0, { ...C0, duration: .01 }, 0));
      ptl.fromTo('[data-plan-cta]', N0, { ...N0, duration: .01 }, 0);
      let t0 = 4;
      stops.forEach((t, k) => {
        const span = k === 0 ? 14 : 20;
        ptl.to(pos, { t, duration: span }, t0).to(wire, { strokeDashoffset: () => len * (1 - t), duration: span }, t0);
        t0 += span;
        ptl.fromTo(marks[k], { backgroundColor: '#2B3640' }, { backgroundColor: '#D43C10', duration: 1 }, t0 - 1)
          .fromTo(cards[k], C0, { opacity: 1, y: 0, duration: 7, ease: 'power2.out' }, t0 - 3);
        t0 += 6;
      });
      ptl.to(pos, { t: 1, duration: 8 }, t0).to(wire, { strokeDashoffset: 0, duration: 8 }, t0)
        .fromTo('[data-plan-cta]', N0, { autoAlpha: 1, y: 0, duration: 5, ease: 'power2.out' }, t0 + 2)
        .to({}, { duration: 10 }, t0 + 8);
      setPG(); placeMarks();
      ctx.add(() => marks.forEach(m => m.remove()));
    }

    /* calm reveals */
    const rv = $$('[data-reveal]');
    rv.forEach(el => el.classList.add('rv'));
    ST.batch(rv, { start: 'top 90%', once: true, onEnter: b => gsap.to(b, { autoAlpha: 1, y: 0, duration: .65, ease: 'power3.out', stagger: .08, overwrite: true }) });
    const onFocus = e => { const r = e.target.closest && e.target.closest('.rv'); if (r && +getComputedStyle(r).opacity < 1) gsap.to(r, { autoAlpha: 1, y: 0, duration: .2, overwrite: true }); };
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('focusin', onFocus); doc.classList.remove('plan-on', 'fan-on', 'sea-on', 'gate-on'); rv.forEach(el => el.classList.remove('rv')); };
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
  window.addEventListener('load', () => ST.refresh(), { once: true });

  // QA hook: window.__scene(0.5, '[data-plan]') jumps to a scroll progress of a pinned section
  window.__scene = (p, sel = '[data-plan]') => { const el = $(sel), top = el.getBoundingClientRect().top + scrollY; const y = top + (el.offsetHeight - innerHeight) * p; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo({ top: y, behavior: 'instant' }); };
})();
