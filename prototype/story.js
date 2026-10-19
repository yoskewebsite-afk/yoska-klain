/* 18.10.2026 (round 2) — motion for the hero and the «film» after it. Loaded after app.js and reuses its GSAP,
   ScrollTrigger and Lenis. Without them, or with reduced motion, everything stays readable (html.still).
   Hero = the North Face dive (reel BpZ9TdMl08b 2.4–3.6s) with a cloud bank instead of the waterline; the film keeps one
   Haifa photograph underneath and comes out of the same clouds. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || location.search.includes('still');
  const hx = $('[data-hx]'), film = $('[data-film]');
  if (!hx || !film || !gsap || !ST || still) return;
  gsap.registerPlugin(ST);
  const vh = () => innerHeight;

  // the floating WhatsApp button: hidden over the hero, on afterwards (app.js only knew the old hero)
  const float = $('[data-float]');
  if (float) { document.documentElement.classList.remove('no-float'); ST.create({ trigger: film, start: 'top 60%', endTrigger: '#contact', end: 'top 80%', onToggle: s => float.classList.toggle('is-on', s.isActive) }); }

  /* the hero card: the four tours, one after another, with the counter and the bars (like the reference's 01/10) */
  const card = $('[data-hx-card]');
  if (card) {
    const T = [['/tours/haifa-ahuvati.html', 'bahai-bay', 'חיפה אהובתי'], ['/tours/haifa-shel-maala.html', 'bahai-terraces', 'חיפה של מעלה'],
               ['/tours/haifa-shel-mata.html', 'clock-tower', 'חיפה של מטה'], ['/tours/sodot-veremazim.html', 'heart-wide', 'סודות ורמזים']];
    T.forEach(t => { const i = new Image(); i.src = `/assets/approved/${t[1]}-480.webp`; });
    const img = $('[data-hx-card-img]'), link = $('[data-hx-card-link]'), name = $('[data-hx-card-name]'), num = $('[data-hx-card-num]'), bars = $$('.hx__bars i');
    let k = 0, hover = false;
    card.addEventListener('pointerenter', () => { hover = true; }); card.addEventListener('pointerleave', () => { hover = false; });
    card.addEventListener('focusin', () => { hover = true; }); card.addEventListener('focusout', () => { hover = false; });
    setInterval(() => {
      if (hover || scrollY > innerHeight) return;
      k = (k + 1) % T.length;
      gsap.to(img, { opacity: 0, duration: .25, onComplete: () => { img.src = `/assets/approved/${T[k][1]}-480.webp`; gsap.to(img, { opacity: 1, duration: .45 }); } });
      link.href = T[k][0]; name.textContent = T[k][2]; num.textContent = String(k + 1).padStart(2, '0');
      bars.forEach((b, i) => b.classList.toggle('is-on', i === k));
    }, 4200);
  }

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px)', phone: '(max-width: 899px)' }, ctx => {
    const { desk } = ctx.conditions;

    /* ---------- HERO: hold → the clouds rise and swallow Yoske → «מקרוב» between sky and clouds → into the white ---------- */
    const h = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hx, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } });
    // 1. the camera descends over the bay in one continuous move (the North Face pan, reel 2.0–3.0s): the photo slides up,
    //    the headline leaves faster than the photo, Yoske a little slower (he stands closer to us)
    // the North Face move (reel BpZ9TdMl08b 2.0–3.0s): the water starts to ripple and the camera dives towards the bay
    let disp = null;
    if (desk) {
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.style.position = 'absolute';
      sv.innerHTML = '<filter id="hx-ripple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.003 0.022" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.appendChild(sv); disp = sv.querySelector('feDisplacementMap');
      ctx.add(() => () => sv.remove());
    }
    h.to('[data-hx-cue]', { opacity: 0, duration: .04 }, 0)
            .to('[data-hx-word]', { yPercent: -38, opacity: 0, duration: .26, ease: 'sine.in' }, .02)
      .to('[data-hx-hero]', { y: () => -vh() * .3, duration: .24, ease: 'sine.in' }, .02)
      .to('[data-hx-hero]', { opacity: 0, duration: .1, ease: 'sine.in' }, .05)
      .to('[data-hx-shade]', { opacity: 0, duration: .3 }, .04)
      .to('[data-hx-sky]', { opacity: 0, duration: .07, ease: 'sine.in' }, .3)
      .fromTo('[data-hx-bay]', { scale: 1.08 }, { scale: 1.02, duration: .4, ease: 'sine.out' }, .3);
    if (disp) h.set('[data-hx-sky]', { filter: 'none' }, 0).set('[data-hx-sky]', { filter: 'url(#hx-ripple)' }, .1)
      .fromTo(disp, { attr: { scale: 0 } }, { attr: { scale: 26 }, duration: .22, ease: 'sine.in' }, .12)
      .set('[data-hx-sky]', { filter: 'none' }, .44);
    h
      // 2. the cloud bank rises like the waterline and swallows Yoske; «מקרוב» arrives between the sky and the clouds
      .fromTo('[data-hx-clouds]', { y: 0 }, { y: () => -vh() * (desk ? .36 : .44), duration: .32, ease: 'sine.out' }, .24)
      .fromTo('[data-hx-wisps]', { y: 0 }, { y: () => -vh() * 1.35, duration: .42, ease: 'sine.inOut' }, .22)
      .fromTo('[data-hx-closer]', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: .12, ease: 'sine.out' }, .4)
      .fromTo('[data-hx-fog]', { opacity: 0 }, { opacity: 1, duration: .1 }, .48)
      .fromTo('[data-hx-cols]', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .1, ease: 'sine.out' }, .5)
      // 3. hold, then the clouds close over everything and the page continues in the white
      .to('[data-hx-clouds]', { y: () => -vh() * 1.75, duration: .22, ease: 'sine.in' }, .78)
      .to('[data-hx-closer]', { y: () => -vh() * .35, opacity: 0, duration: .18, ease: 'sine.in' }, .8)
      .to('[data-hx-cols]', { y: () => -vh() * .5, opacity: 0, duration: .16, ease: 'sine.in' }, .82)
      .to('[data-hx-fog]', { y: () => -vh() * .9, duration: .22, ease: 'sine.in' }, .78);

    /* ---------- FILM backdrop: one photograph; the clouds lift off it between the trail and the process ---------- */
    // the bay stays under the whole film: very faint behind the trail (as before), then it comes through for the process
    const wash = $('[data-film-wash]');
    gsap.fromTo(wash, { opacity: 1 }, { opacity: .86, ease: 'none', scrollTrigger: { trigger: '[data-trail]', start: 'top top', end: 'top -30%', scrub: true } });
    gsap.fromTo(wash, { opacity: .86 }, { opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '[data-proc]', start: 'top 100%', end: 'top 15%', scrub: true } });
    gsap.fromTo('[data-film-shot]', { yPercent: -2, scale: 1.08 }, { yPercent: 2, scale: 1, ease: 'none', scrollTrigger: { trigger: film, start: 'top top', end: 'bottom bottom', scrub: true } });

    /* ---------- A. TRAIL: the paths draw in, the photos travel along them ---------- */
    const svg = $('[data-trail-svg]'), paths = $$('[data-trail-path]'), dots = $$('[data-dot]'), stage = $('.trail__stage');
    const lens = paths.map(p => p.getTotalLength());
    const placeDots = p => {
      const box = svg.getBoundingClientRect(), sb = stage.getBoundingClientRect(), cb = $('.trail__copy').getBoundingClientRect(), sx = box.width / 2000, sy = box.height / 640;
      dots.forEach((d, i) => {
        const [pi, off] = d.dataset.dot.split(',').map(Number);
        const f = Math.min(.98, Math.max(.02, off + (p - .5) * (desk ? .34 : .26) * (i % 2 ? -1 : 1)));
        const pt = paths[pi].getPointAtLength(f * lens[pi]);
        const x = box.left - sb.left + pt.x * sx, y = box.top - sb.top + pt.y * sy;
        const cx = Math.abs(x - (cb.left - sb.left + cb.width / 2)) / (cb.width / 2 + 90), cy = Math.abs(y - (cb.top - sb.top + cb.height / 2)) / (cb.height / 2 + (desk ? 90 : 10));
        gsap.set(d, { x, y, '--o': Math.min(1, Math.max(0, ((desk ? Math.max(cx, cy) : cy) - 1.15) / .15)) });
      });
    };
    const tt = gsap.timeline({ scrollTrigger: { trigger: '[data-trail]', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => placeDots(s.progress), onRefresh: s => placeDots(s.progress) } });
    tt.fromTo(svg, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: .4, ease: 'none' }, 0)
      .from(dots, { scale: 0, duration: .12, stagger: .04, ease: 'back.out(2.4)' }, .05)
      .from('[data-trail-text]', { y: 50, opacity: 0, duration: .18, stagger: .08, ease: 'power3.out' }, .08)
      .to({}, { duration: .2 }, .8);
    placeDots(0);

    /* ---------- B. PROCESS: one panel per scroll step ---------- */
    const steps = $$('[data-proc-step]');
    if (desk) {
      const pt = gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: '[data-proc]', start: 'top top', end: 'bottom bottom', scrub: .6 } });
      pt.from('.proc__title', { y: 60, opacity: 0, duration: .1 }, 0);
      steps.forEach((st, k) => {
        const at = .1 + k * .26;
        pt.from($('.proc__img', st), { x: -240, rotationY: -40, opacity: 0, scale: .84, duration: .16 }, at)
          .from($('.proc__line', st), { scaleX: 0, transformOrigin: '100% 50%', duration: .1 }, at + .08)
          .from($('.proc__txt', st), { y: 30, opacity: 0, duration: .1 }, at + .1);
      });
      pt.from('.proc__wa', { y: 30, opacity: 0, duration: .08 }, .86).to({}, { duration: .06 }, .94);
    } else {
      steps.forEach(st => gsap.from(st, { y: 80, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 95%', end: 'top 60%', scrub: .5 } }));
    }

    /* ---------- C. REVIEWS: strips slide over each other; the one underneath settles back ---------- */
    const strips = $$('[data-rv-strip]');
    strips.forEach((li, i) => {
      gsap.from(li, { y: 120, rotationX: -8, transformPerspective: 1400, ease: 'power2.out', scrollTrigger: { trigger: li, start: 'top bottom', end: 'top 40%', scrub: .5 } });
      if (i < strips.length - 1) gsap.to(li, { scale: .93, filter: 'brightness(.6)', ease: 'none', scrollTrigger: { trigger: strips[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
    });
    gsap.from('.rv__head > *', { y: 50, opacity: 0, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.rv__head', start: 'top 92%', end: 'top 55%', scrub: .5 } });

    /* ---------- D. PLACES on glass: the panels rise over the bay in two rows, faster than the photo (the reel's parallax) ---------- */
    const cards = $$('[data-lg-card]');
    gsap.from('.lg__title', { y: 40, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: '[data-lg]', start: 'top 80%', end: 'top 45%', scrub: .5 } });
    cards.forEach((c, i) => {
      const t = gsap.timeline({ scrollTrigger: { trigger: '[data-lg]', start: `top ${75 - (i % 3) * 4}%`, end: 'bottom 30%', scrub: .6 } });
      t.fromTo(c, { y: (i < 2 ? 160 : 260) * (desk ? 1 : .5) }, { y: (i < 2 ? -30 : -60) * (desk ? 1 : .4), ease: 'none', duration: 1 }, 0)
        .fromTo(c, { opacity: 0 }, { opacity: 1, duration: .22, ease: 'none' }, 0);
    });
  });

  addEventListener('load', () => ST.refresh());
  // QA hook: window.__at('#process', .5) jumps to a progress inside a section
  window.__at = (sel, p) => { const el = $(sel), top = el.getBoundingClientRect().top + scrollY, h = Math.max(0, el.offsetHeight - innerHeight); const y = top + h * p; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); ST.update(); };
})();
