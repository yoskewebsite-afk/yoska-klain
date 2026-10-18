/* Added sections (18.10.2026) — motion for the new sections only. Loaded after app.js, which keeps the menu, the
   contact form, Lenis smooth scroll and the nav for the whole page; this file reuses that same Lenis (window.__lenis).
   Without GSAP, or with reduced motion, the new sections fall back to html.still and stay readable. */
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
  const L = () => window.__lenis || null;

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
      if (L()) L().stop();
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
      if (L()) { L().scrollTo(y0, { immediate: true, force: true }); L().start(); }
    });
  }

  /* ---------------- motion ---------------- */
  if (!gsap || !ST || still()) { setRoute(1); return; }
  gsap.registerPlugin(ST);
  const op = $('[data-op]');
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

  setRoute(0);
  addEventListener('load', () => ST.refresh());
  // QA hook: window.__at('#back-to-sea', 0.5) jumps to a scroll progress inside a sticky section
  window.__at = (sel, p) => { const el = $(sel), top = el.getBoundingClientRect().top + scrollY, h = el.offsetHeight - innerHeight; const y = top + h * p; L() ? L().scrollTo(y, { immediate: true }) : scrollTo(0, y); ST.update(); };
})();
