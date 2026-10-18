/* Yoske Klein — homepage behaviour and motion (18.10.2026, «photo story»).
   GSAP 3.13 + ScrollTrigger + Lenis (already in the project). Sticky stages are plain CSS; ScrollTrigger only scrubs
   transforms and opacity. Three main moves: the opening, the tour stack, the mountains that open onto the sea.
   Without GSAP, or with reduced motion, the page falls back to html.still and everything is readable and usable. */
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
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let lenis = null;

  /* ---------------- menu ---------------- */
  const menuBtn = $('.nav__menu'), menu = $('#menu');
  if (menuBtn && menu) {
    const setMenu = open => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? 'סגירה' : 'תפריט'; };
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
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

  /* ---------------- route: nodes on the illustrated line ---------------- */
  const rtLine = $('[data-rt-line]'), rtNodes = $('[data-rt-nodes]'), rtStops = $$('[data-rt-list] li');
  const rtFrac = rtStops.map((_, k) => k / Math.max(1, rtStops.length - 1));
  let rtLen = 0;
  if (rtLine && rtNodes) {
    rtLen = rtLine.getTotalLength();
    const NS = 'http://www.w3.org/2000/svg';
    rtFrac.forEach((f, k) => {
      const p = rtLine.getPointAtLength(f * rtLen), g = document.createElementNS(NS, 'g'), c = document.createElementNS(NS, 'circle'), t = document.createElementNS(NS, 'text');
      g.setAttribute('class', 'rt__node' + (k === 0 ? ' is-on' : '')); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 15);
      t.setAttribute('x', p.x); t.setAttribute('y', p.y + 1); t.textContent = k + 1; g.append(c, t); rtNodes.append(g);
    });
  }
  const rtFigs = $$('[data-fig]'), rtBase = $('[data-fig-base]');
  const setStop = i => {
    rtStops.forEach((li, k) => li.classList.toggle('is-on', k <= i));
    $$('.rt__node', rtNodes || document).forEach((n, k) => n.classList.toggle('is-on', k <= i));
    const fig = rtFigs.find(f => +f.dataset.fig === i);
    rtFigs.forEach(f => f.classList.toggle('is-on', f === fig));
    if (rtBase) rtBase.classList.toggle('is-on', !fig);
  };
  const setRoute = frac => {
    if (!rtLine) return;
    rtLine.style.strokeDasharray = rtLen; rtLine.style.strokeDashoffset = rtLen * (1 - frac);
    let i = 0; rtFrac.forEach((f, k) => { if (frac >= f - .001) i = k; });
    setStop(i);
  };

  /* ---------------- behind the picture: thumbnail → large view with the story ---------------- */
  const dlg = $('[data-story-dialog]');
  if (dlg) {
    const imgBox = $('[data-sd-img]', dlg), kick = $('[data-sd-kicker]', dlg), title = $('[data-sd-title]', dlg), body = $('[data-sd-body]', dlg);
    let opener = null;
    let y0 = 0;
    const open = btn => {
      opener = btn; y0 = scrollY;
      const tpl = $(`[data-story-tpl="${btn.dataset.story}"]`).content;
      kick.textContent = $('.kicker', tpl).textContent; title.textContent = $('h3', tpl).textContent;
      body.replaceChildren(...$$('div > p', tpl).map(p => p.cloneNode(true)));
      const src = $('img', btn), img = src.cloneNode();
      img.sizes = '(min-width: 860px) 60vw, 100vw'; img.loading = 'eager'; img.removeAttribute('fetchpriority');
      imgBox.replaceChildren(img);
      if (lenis) lenis.stop();
      dlg.showModal();
      if (gsap && !still()) {
        const a = src.getBoundingClientRect(), b = imgBox.getBoundingClientRect();
        gsap.fromTo(imgBox, { x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height, transformOrigin: '0 0' },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .6, ease: 'power3.out', clearProps: 'transform' });
        gsap.fromTo($('.sd__text', dlg).children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .05, delay: .18, ease: 'power2.out' });
      }
      $('[data-sd-close]', dlg).focus();
    };
    $$('[data-story]').forEach(b => b.addEventListener('click', () => open(b)));
    $('[data-sd-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => {
      if (opener) opener.focus({ preventScroll: true });
      if (Math.abs(scrollY - y0) > 1) scrollTo(0, y0); // back to exactly where the reader was
      if (lenis) { lenis.scrollTo(y0, { immediate: true, force: true }); lenis.start(); }
    });
  }

  /* ---------------- motion ---------------- */
  if (!gsap || !ST || still()) { setRoute(1); doc.classList.add('no-float'); return; }
  window.__motion = true;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  // smooth scroll: Lenis drives the page, GSAP's ticker drives Lenis
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: .09, wheelMultiplier: .95, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"], a[href^="/#"]'); if (!a) return;
      const id = a.getAttribute('href').replace(/^\/?#/, ''); const el = id && document.getElementById(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: 0, duration: 1.4 }); history.replaceState(null, '', '#' + id);
      setTimeout(() => { const f = el.querySelector('h1, h2'); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); } }, 1450);
    });
    reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) location.reload(); });
    window.__lenis = lenis;
  }

  const op = $('[data-op]');
  const navBar = $('[data-nav]'), float = $('[data-float]');
  // the nav stays transparent over the whole opening (the sky continues), then turns solid
  ST.create({ trigger: op, start: () => `bottom ${navBar ? navBar.offsetHeight : 76}px`, end: 'max', onToggle: s => navBar && navBar.classList.toggle('is-solid', s.isActive) });
  ST.create({ start: 0, end: 'max', onUpdate: s => navBar && navBar.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > 240 && !navBar.contains(document.activeElement)) });
  // the floating WhatsApp button: on phones only where it covers no running text (photo scenes and the gallery)
  if (float) (matchMedia('(min-width: 900px)').matches ? [['#tours', 'top 60%', '#contact', 'top 80%']] : [['#journeys', 'top 50%', '#stories', 'top 90%']])
    .forEach(([a, sa, b, eb]) => ST.create({ trigger: a, start: sa, endTrigger: b, end: eb, onToggle: s => float.classList.toggle('is-on', s.isActive) }));

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px)', phone: '(max-width: 899px)' }, ctx => {
    const { desk } = ctx.conditions;

    /* 1+2. opening: Yoske and the headline leave, the bay stays, three places light up in turn */
    const scene = $('[data-op-scene]'), yoske = $('[data-op-yoske]'), hero = $('[data-op-hero]'), eyes = $('[data-op-eyes]');
    const pins = $$('[data-pin]'), steps = $$('[data-step]'), title = $('.op__eyes-title');
    gsap.set(eyes, { opacity: 0 }); gsap.set(steps, { opacity: 0, y: 26 }); gsap.set(pins, { autoAlpha: 0, scale: .6 });
    const W = [[.26, .47], [.47, .7], [.7, 1.01]];
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: op, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onUpdate: s => { const p = s.progress; pins.forEach((pin, k) => pin.classList.toggle('is-on', p >= W[k][0] && p < W[k][1])); } } });
    tl.to('[data-op-cue]', { autoAlpha: 0, duration: .04 }, 0)
      .to(hero, { y: -80, autoAlpha: 0, duration: .13, ease: 'power1.in' }, .01)
      .to(yoske, { xPercent: desk ? -14 : -10, yPercent: 16, scale: .94, autoAlpha: 0, duration: .17, ease: 'power1.in' }, 0)
      .to(scene, { scale: 1.035, duration: .22 }, 0)
      .to('[data-op-shade]', { autoAlpha: desk ? 0 : 1, duration: .12 }, .08)
      .to('[data-op-shade2]', { autoAlpha: desk ? 1 : 0, duration: .12 }, .1)
      .to(eyes, { opacity: 1, duration: .01 }, .17)
      .from(title, { y: 46, opacity: 0, duration: .07, ease: 'power2.out' }, .17)
      .to(pins, { autoAlpha: 1, scale: 1, duration: .05, stagger: .015, ease: 'back.out(2)' }, .2);
    // desktop: a small drift towards each place; phones: the photo slides so the active place sits in the free middle band
    const toPin = (k, axis) => () => {
      const r = { l: scene.offsetLeft, t: scene.offsetTop, w: scene.offsetWidth, h: scene.offsetHeight }, pin = pins[k];
      const px = r.l + parseFloat(pin.style.getPropertyValue('--x')) / 100 * r.w, py = r.t + parseFloat(pin.style.getPropertyValue('--y')) / 100 * r.h;
      return axis === 'x' ? clamp(innerWidth / 2 - px, innerWidth - (r.l + r.w), -r.l) : clamp(innerHeight * .5 - py, innerHeight - (r.t + r.h), -r.t);
    };
    const pan = desk ? [{ xPercent: 0, yPercent: 0, scale: 1.05 }, { xPercent: -1.4, yPercent: -.6, scale: 1.065 }, { xPercent: .6, yPercent: -2, scale: 1.075 }]
      : [0, 1, 2].map(k => ({ x: toPin(k, 'x'), y: toPin(k, 'y'), scale: 1.04 }));
    steps.forEach((st, k) => {
      const [a, b] = W[k];
      tl.to(st, { opacity: 1, y: 0, duration: .045, ease: 'power2.out' }, a);
      tl.to(scene, { ...pan[k], duration: .08, ease: 'power1.inOut' }, a - .02);
      if (k < steps.length - 1) tl.to(st, { opacity: 0, y: -22, duration: .035, ease: 'power1.in' }, b - .035);
    });
    tl.to({}, { duration: .01 }, .99); // keep the timeline exactly 1 long so the windows above match scroll progress

    /* 3. tours: the 3D stack. Each card holds still for a while before the next one comes forward. */
    if (desk) {
      const tr = $('[data-tr]'), cards = $$('[data-tk]'), n = cards.length, num = $('[data-tr-num]');
      const pose = p => cards.forEach((c, i) => {
        const d = i - p;
        if (d >= 0) gsap.set(c, { y: -d * 30, z: -d * 90, rotationX: d * 3, scale: 1 - d * .045, opacity: d > 2.6 ? clamp(3.4 - d, 0, 1) : 1, zIndex: n - i });
        else gsap.set(c, { y: d * innerHeight * .78, z: -d * 120, rotationX: d * 12, scale: 1, opacity: clamp(1 + d * 1.25, 0, 1), zIndex: n + 1 });
      });
      const map = r => { const x = clamp(r * 1.12, 0, 1) * (n - 1), k = Math.min(n - 2, Math.floor(x)), f = x - k, g = clamp((f - .32) / .68, 0, 1); return k + g * g * (3 - 2 * g); };
      const trST = ST.create({ trigger: tr, start: 'top top', end: 'bottom bottom', onUpdate: s => { const p = map(s.progress); pose(p); if (num) num.textContent = Math.round(p) + 1; } });
      pose(0);
      // keyboard: a link in a card that waits behind brings its card to the front
      cards.forEach((c, i) => c.addEventListener('focusin', () => {
        const target = trST.start + ((i / (n - 1)) * .9 / 1.12 + .02) * (trST.end - trST.start);
        if (Math.abs(map((window.scrollY - trST.start) / (trST.end - trST.start)) - i) > .2) (lenis ? lenis.scrollTo(target, { immediate: true }) : scrollTo(0, target));
      }));
    }

    /* 4. sample round: the line draws, the stops and the photo follow it */
    if (rtLine) ST.create({ trigger: desk ? '[data-rt]' : '.rt__visual', start: desk ? 'top top' : 'top 75%', end: desk ? 'bottom bottom' : 'bottom 35%',
      onUpdate: s => setRoute(clamp(s.progress * 1.12, 0, 1)), onRefresh: s => setRoute(clamp(s.progress * 1.12, 0, 1)) });

    /* 5. about: scattered photos settle into their grid */
    const ph = $$('[data-ab-ph]'), k = desk ? 1 : .45;
    const scatter = [[-60, 120, -5, .86], [-140, 260, 7, .8], [120, 200, -9, .82], [-200, 380, 6, .78], [40, 420, -7, .8], [220, 340, 10, .76]];
    const abTl = gsap.timeline({ scrollTrigger: { trigger: '[data-ab-photos]', start: 'top 92%', end: desk ? 'center 52%' : 'center 60%', scrub: .5 } });
    ph.forEach((el, i) => { const [x, y, r, s] = scatter[i % scatter.length]; abTl.fromTo(el, { x: x * k, y: y * k, rotation: r, scale: s }, { x: 0, y: 0, rotation: 0, scale: 1, ease: 'power2.out', duration: 1 }, i * .04); });

    /* 7. moments from the road: horizontal gallery (phones keep native swipe) */
    if (desk) {
      const jr = $('[data-jr]'), track = $('[data-jr-track]');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const size = () => { jr.style.height = `${dist() + innerHeight}px`; };
      size();
      gsap.to(track, { x: () => dist(), ease: 'none', scrollTrigger: { trigger: jr, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true, onRefreshInit: size } });
      ctx.add(() => () => { jr.style.height = ''; });
    }

    /* 6. mountains → sea: the path moves forward, the valley takes over, the ridges part and the bay remains */
    const mt = $('[data-mt]'), spacer = $('[data-mt-spacer]');
    const mtl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: mt, start: 'top top', end: () => `+=${spacer.offsetHeight}`, scrub: .7 } });
    mtl.fromTo('[data-mt-path]', { scale: 1 }, { scale: 1.32, yPercent: 3, duration: .3, ease: 'power1.in' }, 0)
      .to('[data-mt-path]', { autoAlpha: 0, duration: .06 }, .24)
      .fromTo('[data-mt-valley]', { scale: 1.12 }, { scale: 1, duration: .16, ease: 'power2.out' }, .24)
      .from('[data-mt-l1]', { y: 60, opacity: 0, duration: .07, ease: 'power2.out' }, .3)
      .to('[data-mt-full]', { autoAlpha: 0, duration: .1 }, .4)
      .fromTo('[data-mt-bay]', { scale: 1.1 }, { scale: 1, duration: .55, ease: 'power1.out' }, .4)
      .to('[data-mt-ridge-l]', { xPercent: -104, yPercent: 7, scale: 1.4, duration: .46, ease: 'power2.in' }, .42)
      .to('[data-mt-ridge-r]', { xPercent: 104, yPercent: 9, scale: 1.55, duration: .38, ease: 'power2.in' }, .45)
      .from('[data-mt-l2]', { y: 60, opacity: 0, duration: .08, ease: 'power2.out' }, .7)
      .to({}, { duration: .1 }, .9);

    /* 9. joining: the photo grid settles with a light scale; the reviews below never move */
    gsap.fromTo('[data-jn-grid]', { scale: desk ? 1.14 : 1.06 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.jn__gridwrap', start: 'top 92%', end: 'top 15%', scrub: .5 } });
    gsap.fromTo('[data-jn-grid] li', { y: 60, autoAlpha: .35 }, { y: 0, autoAlpha: 1, stagger: { each: .06, from: 'center' }, ease: 'power2.out', scrollTrigger: { trigger: '.jn__gridwrap', start: 'top 88%', end: 'top 30%', scrub: .5 } });
  });

  /* 11. contact: the headline is revealed once through its line masks */
  gsap.fromTo('[data-ct-line]', { yPercent: 108 }, { yPercent: 0, duration: 1.1, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: '[data-ct]', start: 'top 62%', once: true } });

  setRoute(0);
  addEventListener('load', () => ST.refresh());
  // QA hook: window.__at('#back-to-sea', 0.5) jumps to a scroll progress inside a sticky section
  window.__at = (sel, p) => { const el = $(sel), top = el.getBoundingClientRect().top + scrollY, h = el.offsetHeight - innerHeight; const y = top + h * p; lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); ST.update(); };
})();
