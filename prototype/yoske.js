/* Yoske — behaviour and motion of the 10.11.2026 rebuild.
   Without JS, or with reduced motion, every section is a complete static page: the layered hero, the wipes and the
   reveals are switched on here only (html.hero-on / html.motion), after GSAP and ScrollTrigger are available. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduceMQ.matches || location.search.includes('still') || document.documentElement.classList.contains('a11y-still');
  const PHONE = '972544361667';
  const wa = text => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

  /* ---------------- menu (phones and tablets) ---------------- */
  const menuBtn = $('[data-menu-btn]'), menu = $('[data-menu]');
  if (menuBtn && menu) {
    const icon = $('use', menuBtn);
    const set = open => {
      menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
      icon.setAttribute('href', open ? '#i-close' : '#i-menu');
      if (open) $('a', menu).focus();
    };
    menuBtn.addEventListener('click', () => set(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { set(false); menuBtn.focus(); } });
  }

  /* ---------------- map: tabs that light the tour's stops ---------------- */
  const chipsBox = $('[data-map-chips]');
  if (chipsBox) {
    const chips = $$('.chip', chipsBox), svg = $('[data-hmap]');
    const pins = $$('.pin', svg);
    const select = (chip, focus) => {
      chips.forEach(c => { const on = c === chip; c.setAttribute('aria-selected', String(on)); c.tabIndex = on ? 0 : -1; $('#' + c.getAttribute('aria-controls')).hidden = !on; });
      const stops = chip.dataset.stops.split(' ').filter(Boolean);
      pins.forEach(p => p.classList.toggle('is-on', stops.includes(p.dataset.place)));
      svg.classList.toggle('has-route', stops.length > 0);
      if (focus) chip.focus();
      if (window.gsap && !still()) gsap.fromTo($$('.pin.is-on .pin__tag', svg), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .38, stagger: .05, ease: 'power2.out', overwrite: true });
    };
    chips.forEach((c, i) => {
      c.addEventListener('click', () => select(c));
      c.addEventListener('keydown', e => {
        const k = { ArrowLeft: 1, ArrowRight: -1, Home: -99, End: 99 }[e.key];   // RTL: left is "next"
        if (k === undefined) return;
        e.preventDefault();
        const j = k === 99 ? chips.length - 1 : k === -99 ? 0 : (i + k + chips.length) % chips.length;
        select(chips[j], true);
      });
    });
    select(chips[0]);
    const sc = $('[data-map-scroll]');
    if (sc) requestAnimationFrame(() => { sc.scrollLeft = -(sc.scrollWidth - sc.clientWidth) / 2; });
  }

  /* ---------------- arch cards: details on hover, focus or the «פרטים» button ---------------- */
  const cards = $$('[data-card]');
  const closeAll = except => cards.forEach(c => { if (c !== except && c.classList.contains('is-open')) { c.classList.remove('is-open'); $('[data-card-toggle]', c).setAttribute('aria-expanded', 'false'); } });
  cards.forEach(card => {
    const btn = $('[data-card-toggle]', card);
    btn.addEventListener('click', () => {
      const open = !card.classList.contains('is-open');
      closeAll(card); card.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
    });
    card.addEventListener('keydown', e => { if (e.key === 'Escape' && card.classList.contains('is-open')) { btn.click(); btn.focus(); } });
  });

  /* ---------------- card rail: arrows + edge states (RTL scroll positions are negative) ---------------- */
  $$('[data-rail]').forEach(rail => {
    const track = $('[data-rail-track]', rail), prev = $('[data-rail-prev]', rail), next = $('[data-rail-next]', rail);
    const step = () => { const li = $('li', track); return li ? li.getBoundingClientRect().width + 28 : 320; };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2, pos = Math.abs(track.scrollLeft);
      prev.disabled = pos <= 2; next.disabled = pos >= max;
    };
    next.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: still() ? 'auto' : 'smooth' }));
    prev.addEventListener('click', () => track.scrollBy({ left: step(), behavior: still() ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
  });

  /* ---------------- page rail, tab bar, back-to-top ---------------- */
  const side = $('[data-siderail]'), tabs = $('[data-tabbar]'), totop = $('[data-totop]'), hero = $('[data-hero]');
  const links = $$('[data-rail-link]');
  const sections = [...new Set(links.map(a => a.dataset.railLink))].map(id => document.getElementById(id)).filter(Boolean);
  if (sections.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.removeAttribute('aria-current'));
      links.filter(a => a.dataset.railLink === e.target.id).forEach(a => a.setAttribute('aria-current', 'true'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, h = innerHeight, doc = document.documentElement.scrollHeight - h;
      const past = hero ? y > hero.offsetHeight - h * .9 : y > h * .5;
      side && side.classList.toggle('is-on', past);
      tabs && tabs.classList.toggle('is-on', hero ? y > h * .55 : true);
      totop && totop.classList.toggle('is-on', y > h * 1.4);
      side && side.style.setProperty('--p', (y / Math.max(doc, 1)).toFixed(4));
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* hero (11.11.2026, as on the reference): the headline is sticky, the photo scrolls over it in the page flow.
     Only the placement is measured here: the photo starts right under the subline (its cut-out sky may sit behind
     the subline's last pixels), the CTA sits on the photo just below that sky. Runs with or without motion. */
  const heroPlace = () => {
    const stage = $('[data-hero-stage]'), head = $('[data-hero-head]'), scene = $('[data-hero-scene]');
    if (!stage || !head || !scene) return;
    const place = () => {
      const tall = matchMedia('(max-width: 699px), (max-width: 999px) and (orientation: portrait)').matches;
      const r = tall ? 1280 / 1763 : 2160 / 1434, sky = tall ? .05 : .15;
      const h = document.documentElement.clientWidth / r;
      const hb = head.offsetTop + head.offsetHeight;
      const top = Math.round(hb + (tall ? 14 : 18) - sky * h);
      scene.parentElement.style.setProperty('--scene-top', top + 'px');
      scene.style.setProperty('--cta-top', Math.round(sky * h + (tall ? 18 : 30)) + 'px');
    };
    // Yoske: the middle of his raised hand (6% / 14% of the cut-out) sits just above the first letter (ש) of the second line
    const yoske = $('[data-hero-yoske]'), l2 = $('.hero__l2'), fore = $('[data-hero-fore]');
    const placeYoske = () => {
      if (!yoske || !l2) return;
      const tn = [...l2.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (!tn) return;
      const rg = document.createRange(), k = tn.textContent.search(/\S/); rg.setStart(tn, k); rg.setEnd(tn, k + 1);
      // measured on the page at rest (the scene may already have moved, so take scrollY out)
      const sh = rg.getBoundingClientRect(), sr = scene.getBoundingClientRect(), iw = document.documentElement.clientWidth, ih = innerHeight;
      const narrow = innerWidth < 700, ratio = 908 / 900, hx = sh.left + sh.width * .55;
      const shTop = sh.top + scrollY, scTop = sr.top + scrollY;
      const w = narrow ? Math.min(iw * .44, 190) : Math.max(240, Math.min((iw + 70 - hx) / .94, ih * .62 / ratio, 520)), h = w * ratio;
      const shiftX = narrow ? 0 : iw * .03;
      // his fingertips reach the top of the ש (never above it)
      let y = shTop - scTop + sh.height * .18 - h * .058;
      const imgH = $('img', scene).getBoundingClientRect().height;
      // wide screens: his waist (the end of the cut-out) must stand in the trees: the photo is solid from ~21% of its
      // height on the right, the trees under the stone house from ~30%
      if (!narrow) y = Math.max(y, imgH * .3 + 70 - h);
      // phones: the headline spans the whole width, so he stands on the photo under the button, among its trees
      else y = imgH * .3 - h;
      yoske.style.setProperty('--yw', Math.round(w) + 'px');
      // phones: the ש can sit at the very edge, keep him (most of him) on screen
      const x = narrow ? iw - sr.left - w * .9 : hx - shiftX - sr.left - w * .06;
      yoske.style.setProperty('--yx', Math.round(x) + 'px');
      yoske.style.setProperty('--yy', Math.round(y) + 'px');
      yoske.classList.remove('is-fade');
      if (fore) fore.style.setProperty('--fy', Math.round(y + h - (narrow ? 45 : 95)) + 'px');
    };
    const both = () => { place(); placeYoske(); };
    both(); addEventListener('resize', both);
    document.fonts && document.fonts.ready.then(both);
  };
  heroPlace();

  /* long reviews: a few lines and "read more" (live text stays in the page) */
  $$('.rcard blockquote').forEach(q => {
    if (q.textContent.length < 240) return;
    q.classList.add('is-long'); q.id = q.id || 'rq' + Math.random().toString(36).slice(2, 8);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rcard__more';
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', q.id); b.textContent = 'קראו עוד';
    b.addEventListener('click', () => { const o = q.classList.toggle('is-open'); b.setAttribute('aria-expanded', o); b.textContent = o ? 'פחות' : 'קראו עוד'; });
    q.after(b);
  });

  /* 15.11.2026: sections that animate when they arrive (lines draw, values fill, the balance levels): .is-in once */
  if (!still()) {
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io2.unobserve(e.target); } }), { rootMargin: '0px 0px -18% 0px' });
    $$('.uq, .groups, .doodle, .about--full, [data-pop], .uq__card, .ab2, .tc2').forEach(el => io2.observe(el));
    // floating objects: drift and turn with the scroll; the cable car and the paper plane travel across their section
    const objs = $$('[data-float]');
    if (objs.length) {
      let tk = false;
      const run = () => { tk = false; const vh = innerHeight, vw = document.documentElement.clientWidth;
        objs.forEach(el => { const sec = el.parentElement, r = sec.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
          const c = r.top + r.height / 2 - vh / 2, d = el.dataset;
          if (d.travel) {
            const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
            if (d.travel === 'cable') {
              const x = -p * (vw + 220) + 40, y = p * Math.min(100, vw * .066);
              el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
            }
            if (d.travel === 'camera') {
              const x = -p * (vw + 260) + 90, y = 6 + 14 * Math.sin(p * Math.PI * 3);
              el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) rotate(' + (8 * Math.sin(p * Math.PI * 2)).toFixed(1) + 'deg)';
            }
            if (d.travel === 'plane') {
              const x = -p * (vw + 260) + 90, y = 330 - p * 320 - 40 * Math.sin(p * Math.PI);
              el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) rotate(' + (5 + 9 * p).toFixed(1) + 'deg)';
              const tr = sec.querySelector('.trailline'); if (tr) tr.style.clipPath = 'inset(0 0 0 ' + (100 - p * 100).toFixed(1) + '%)';
            }
            return;
          }
          el.style.transform = 'translate(' + (c * +d.x).toFixed(1) + 'px,' + (c * +d.y).toFixed(1) + 'px) rotate(' + (c * +d.r).toFixed(1) + 'deg)';
        }); };
      addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(run); } }, { passive: true }); addEventListener('resize', run); run();
    }

    // counters: count up once, when they arrive
    const io3 = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io3.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
      const step = t => { const k = Math.min(1, (t - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = v + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { rootMargin: '0px 0px -15% 0px' });
    $$('[data-count]').forEach(el => io3.observe(el));
    // parallax: photos with data-parallax drift at their own speed while their section is on screen
    const par = $$('[data-parallax]');
    if (par.length) {
      let tick = false;
      const move = () => { tick = false; par.forEach(el => { const r = el.parentElement.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return;
        const c = (r.top + r.height / 2 - innerHeight / 2); el.style.translate = '0 ' + (c * +el.dataset.parallax).toFixed(1) + 'px'; }); };
      addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(move); } }, { passive: true }); move();
    }
  }

  /* 15.11.2026: the rest of the review shots, one click away (the wall itself opens with the strongest twelve) */
  const moreBtn = $('[data-more-reviews]');
  if (moreBtn) moreBtn.addEventListener('click', () => {
    const box = document.getElementById(moreBtn.getAttribute('aria-controls')), open = box.hidden;
    box.hidden = !open; moreBtn.setAttribute('aria-expanded', String(open));
    moreBtn.textContent = open ? 'להסתיר את הביקורות הנוספות' : moreBtn.dataset.label || moreBtn.textContent;
    if (open) { moreBtn.dataset.label = moreBtn.dataset.label || ''; const first = box.querySelector('a'); if (first) first.focus(); }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
  if (moreBtn) moreBtn.dataset.label = moreBtn.textContent;

  /* review shots open full size in a dialog (the wall shows them small) */
  const shots = $$('[data-shot]');
  if (shots.length && window.HTMLDialogElement) {
    const box = document.createElement('dialog'); box.className = 'shotbox'; box.setAttribute('aria-label', 'ביקורת בגודל מלא');
    box.innerHTML = '<button class="shotbox__x" type="button" aria-label="סגירה">×</button>';
    document.body.append(box);
    const bi = new Image(); // gets its src on the first open, so no empty image ever sits in the page
    bi.decoding = 'async';
    $('.shotbox__x', box).addEventListener('click', () => box.close());
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    shots.forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); bi.src = a.href; bi.alt = $('img', a).alt; if (!bi.isConnected) box.append(bi); box.showModal(); box.scrollTop = 0;
    }));
  }

  /* the trail: round photos parked on (or, with motion, travelling along) the two dashed paths, faded where they would
     cover the text. Ported from the 18.10 story.js. */
  const trail = (() => {
    const svg = $('[data-trail-svg]'), stage = $('[data-trail-stage]');
    if (!svg || !stage) return null;
    const paths = $$('[data-trail-path]', svg), dots = $$('[data-dot]', stage), copy = $('.trail__copy', stage);
    const lens = paths.map(p => p.getTotalLength());
    const place = p => {
      const desk = innerWidth >= 900;
      const box = svg.getBoundingClientRect(), sb = stage.getBoundingClientRect(), cb = copy.getBoundingClientRect(), sx = box.width / 2000, sy = box.height / 640;
      dots.forEach((d, i) => {
        const [pi, off] = d.dataset.dot.split(',').map(Number);
        const f = Math.min(.98, Math.max(.02, off + (p - .5) * (desk ? .34 : .26) * (i % 2 ? -1 : 1)));
        const pt = paths[pi].getPointAtLength(f * lens[pi]);
        const x = box.left - sb.left + pt.x * sx, y = box.top - sb.top + pt.y * sy;
        const cx = Math.abs(x - (cb.left - sb.left + cb.width / 2)) / (cb.width / 2 + 90), cy = Math.abs(y - (cb.top - sb.top + cb.height / 2)) / (cb.height / 2 + (desk ? 70 : 10));
        d.style.transform = `translate(${x}px, ${y}px)`;
        d.style.setProperty('--o', Math.min(1, Math.max(0, ((desk ? Math.max(cx, cy) : cy) - 1.1) / .15)));
      });
    };
    let last = .5;
    place(last);
    addEventListener('resize', () => place(last));
    document.fonts && document.fonts.ready.then(() => place(last));
    return { place: p => { last = p; place(p); }, svg, dots };
  })();

  /* ---------------- motion ---------------- */
  const motion = () => {
    if (still() || !window.gsap || !window.ScrollTrigger) return;
    const ST = window.ScrollTrigger; gsap.registerPlugin(ST);
    window.__motion = true;

    // smooth wheel scrolling on desktop pointers (touch keeps native scrolling)
    if (window.Lenis && matchMedia('(pointer: fine)').matches) {
      const lenis = new window.Lenis({ lerp: .1, wheelMultiplier: 1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1), el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault(); lenis.scrollTo(el, { offset: id === 'top' ? 0 : -8, duration: 1.2 });
        history.replaceState(null, '', '#' + id);
        if (el.tabIndex < 0 && !/^(A|BUTTON|INPUT)$/.test(el.tagName)) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
      }));
      reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) lenis.destroy(); });
      window.__lenis = lenis;
      // the pinned scenes set their own heights when ScrollTrigger measures; Lenis must learn the new page length
      ST.addEventListener('refresh', () => lenis.resize());
    }

    /* section titles: the light line rises, the bold line is typed in (a stepped wipe from the right) */
    $$('main section:not(.hero) .duo-title').forEach(t => {
      const l = $('.duo-title__light', t), b = $('.duo-title__bold', t);
      if (l) l.setAttribute('data-rise', '');
      if (b) b.setAttribute('data-wipe', '');
      ST.create({ trigger: t, start: 'top 82%', once: true, onEnter: () => { l && l.classList.add('is-in'); setTimeout(() => b && b.classList.add('is-in'), 240); } });
    });

    /* the big arc of the map section draws in as the section arrives */
    const arc = $('[data-arc]');
    if (arc) gsap.fromTo(arc, { scale: .72, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, ease: 'power2.out', scrollTrigger: { trigger: '[data-map]', start: 'top 85%', end: 'top 20%', scrub: .5 } });

    /* cards and frames: a short rise, in groups */
    const rev = $$('[data-reveal], .rail__track > li, .cardgrid > li').filter(el => el.getBoundingClientRect().top > innerHeight * .9);
    if (rev.length) gsap.set(rev, { y: 34, opacity: 0 });
    if (rev.length) ST.batch(rev, {
      start: 'top 90%', once: true,
      onEnter: els => gsap.fromTo(els, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .08, ease: 'power3.out', overwrite: true })
    });

    /* moments: "Sticky Grid Scroll" by Theo Plawinski for Codrops (MIT; Copyright (c) 2025 Theo Plawinski,
       (c) 2009-2025 Codrops; full notice in /vendor/sticky-grid-scroll/LICENSE). Ported 1:1 from src/scripts/index.js
       of the demo; the site's own Lenis + ScrollTrigger drive it (no second scroller). */
    const sgs = $('[data-sgs]');
    if (sgs) {
      root.classList.add('sgs-on');
      const wrapper = $('[data-sgs-wrapper]', sgs), content = $('.sgs__content', sgs), title = $('.sgs__title', sgs),
        description = $('.sgs__desc', sgs), button = $('.sgs__btn', sgs), grid = $('.sgs__grid', sgs), items = $$('.sgs__item', sgs);
      // the photos are lazy; load them before the scene arrives (the demo preloads them)
      ST.create({ trigger: sgs, start: 'top 300%', once: true, onEnter: () => $$('img', sgs).forEach(i => { i.loading = 'eager'; }) });
      // initContent
      gsap.set([description, button], { opacity: 0, pointerEvents: 'none' });
      const dy0 = (content.offsetHeight - title.offsetHeight) / 2;
      const titleOffsetY = (dy0 / content.offsetHeight) * 100;
      gsap.set(title, { yPercent: titleOffsetY });
      // groupItemsByColumn
      const numColumns = 3, columns = Array.from({ length: numColumns }, () => []);
      items.forEach((item, index) => columns[index % numColumns].push(item));
      // addParallaxOnScroll
      gsap.from(wrapper, { yPercent: -100, ease: 'none', scrollTrigger: { trigger: sgs, start: 'top bottom', end: 'top top', scrub: true } });
      // animateTitleOnScroll
      gsap.from(title, { opacity: 0, duration: .7, ease: 'power1.out', scrollTrigger: { trigger: sgs, start: 'top 57%', toggleActions: 'play none none reset' } });
      // gridRevealTimeline
      const gridReveal = () => {
        const timeline = gsap.timeline();
        const wh = window.innerHeight, dy = wh - (wh - grid.offsetHeight) / 2;
        columns.forEach((column, colIndex) => {
          const fromTop = colIndex % 2 === 0;
          timeline.from(column, { y: dy * (fromTop ? -1 : 1), stagger: { each: .06, from: fromTop ? 'end' : 'start' }, ease: 'power1.inOut' }, 'grid-reveal');
        });
        return timeline;
      };
      // gridZoomTimeline
      const gridZoom = () => {
        const timeline = gsap.timeline({ defaults: { duration: 1, ease: 'power3.inOut' } });
        timeline.to(grid, { scale: 2.05 });
        timeline.to(columns[0], { xPercent: -40 }, '<');
        timeline.to(columns[2], { xPercent: 40 }, '<');
        timeline.to(columns[1], { yPercent: index => (index < Math.floor(columns[1].length / 2) ? -1 : 1) * 40, duration: .5, ease: 'power1.inOut' }, '-=0.5');
        return timeline;
      };
      // toggleContent
      const toggleContent = (isVisible = true) => {
        gsap.timeline({ defaults: { overwrite: 'auto' } }) // demo: true; 'auto' keeps the title's fade-in alive when ScrollTrigger refreshes after load
          .to(title, { yPercent: isVisible ? 0 : titleOffsetY, duration: .7, ease: 'power2.inOut' })
          .to([description, button], { opacity: isVisible ? 1 : 0, duration: .4, ease: `power1.${isVisible ? 'inOut' : 'out'}`, pointerEvents: isVisible ? 'all' : 'none' }, isVisible ? '-=90%' : '<');
      };
      // animateGridOnScroll
      const tl = gsap.timeline({ scrollTrigger: { trigger: sgs, start: 'top 25%', end: 'bottom bottom', scrub: true } });
      tl.add(gridReveal()).add(gridZoom(), '-=0.6').add(() => toggleContent(tl.scrollTrigger.direction === 1), '-=0.32');
      // 15.11.2026 (partner, mobile): hold the finished scene a moment before the page scrolls on, so the words are read whole
      tl.to({}, { duration: innerWidth < 700 ? .55 : .25 });
      window.__sgs = p => { const s = tl.scrollTrigger; scrollTo(0, s.start + (s.end - s.start) * p); };
    }

    /* reviews wall (screenshots): thrown in fast in waves (right, left, below), a wide arc in depth (near ones big, far
       ones small and tilted), they settle into the wall, the wall pans up inside the pinned stage until its last row,
       release. Card transforms end at zero and the pan is a plain translate, so nothing jumps at the release. */
    const rw = $('[data-rwall]');
    if (rw) {
      root.classList.add('rwall-on');
      const stage = $('[data-rwall-stage]', rw), grid = $('[data-rwall-grid]', rw), cards = $$('.rshot', rw), n = cards.length;
      const narrow = () => innerWidth < 700;
      let geo = [], arcSet = [], pan = 0;
      // the shots are lazy and start off-screen; load them before the wall arrives
      ST.create({ trigger: rw, start: 'top 300%', once: true, onEnter: () => $$('img', rw).forEach(i => { i.loading = 'eager'; }) });
      const measure = () => {
        gsap.set(cards, { clearProps: 'transform' }); gsap.set(grid, { clearProps: 'transform' });
        const ih = innerHeight, sw = stage.offsetWidth;
        const gx = grid.offsetLeft, gy = grid.offsetTop;
        pan = Math.max(0, gy + grid.offsetHeight - (ih - 24));
        rw.style.setProperty('--rwall-h', Math.round(ih * (narrow() ? 2.1 : 2.4) + pan * 1.15) + 'px');
        // the arc: every shot on a desktop, the ten nearest the first screen on a phone (fewer moving at once)
        const byTop = cards.map((c, i) => [c.offsetTop, i]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
        arcSet = narrow() ? byTop.slice(0, 10) : byTop.slice();
        const inArc = new Set(arcSet), m = arcSet.length, mid = (m - 1) / 2;
        // keep the arc in the wall's left-to-right order so the landing never crosses
        const order = arcSet.slice().sort((a, b) => cards[a].offsetLeft - cards[b].offsetLeft || cards[a].offsetTop - cards[b].offsetTop);
        const R = narrow() ? sw * 1.05 : Math.min(sw * .6, 820), spread = narrow() ? 34 : 64;
        const ax = sw / 2, ay = ih * .6 + R;
        geo = cards.map((c, i) => {
          const cx = gx + c.offsetLeft + c.offsetWidth / 2, cy = gy + c.offsetTop + c.offsetHeight / 2;
          if (!inArc.has(i)) return { cx, cy, arc: false, wave: 2, zi: 0 };
          const k = order.indexOf(i), th = m > 1 ? -spread + (2 * spread * k) / (m - 1) : 0, rad = th * Math.PI / 180;
          const near = 1 - Math.abs(k - mid) / Math.max(mid, 1);
          return {
            cx, cy, arc: true, x: ax + R * Math.sin(rad) - cx, y: ay - R * Math.cos(rad) - cy,
            rz: th * .5, ry: -th * .4, z: -40 - (1 - near) * 320, s: (narrow() ? .55 : .5) + near * .22, wave: k % 3, zi: Math.round(near * 20)
          };
        });
        cards.forEach((c, i) => { c.style.zIndex = geo[i].zi; c.style.position = 'relative'; });
      };
      measure();
      ST.addEventListener('refreshInit', measure);
      const from = i => {
        const g = geo[i], w = g.wave, iw = innerWidth, ih = innerHeight, bx = g.arc ? g.x : 0, by = g.arc ? g.y : 0;
        return {
          x: bx + (w === 0 ? iw * .8 : w === 1 ? -iw * .8 : (i % 2 ? 60 : -60)), y: by + (w === 2 ? ih : -ih * .1),
          rotationZ: w === 0 ? 34 : w === 1 ? -34 : (i % 2 ? 18 : -18), rotationY: w === 0 ? -65 : w === 1 ? 65 : 0,
          rotationX: w === 2 ? 50 : 8, z: -800, scale: (g.arc ? g.s : 1) * .8, opacity: 0
        };
      };
      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: rw, start: 'top top', end: 'bottom bottom', scrub: .4, invalidateOnRefresh: true } });
      // 1. the throw: fast, overlapping waves
      cards.forEach((c, i) => {
        if (!geo[i].arc) return;
        const k = arcSet.indexOf(i);
        tl.fromTo(c, { x: () => from(i).x, y: () => from(i).y, rotationZ: () => from(i).rotationZ, rotationY: () => from(i).rotationY,
          rotationX: () => from(i).rotationX, z: -800, scale: () => from(i).scale, opacity: 0 },
        { x: () => geo[i].x, y: () => geo[i].y, rotationZ: () => geo[i].rz, rotationY: () => geo[i].ry, rotationX: 0, z: () => geo[i].z,
          scale: () => geo[i].s, opacity: 1, duration: .1, ease: 'power4.out' }, .01 + (k % 3) * .02 + Math.floor(k / 3) * .016);
      });
      // 2. the arc holds a beat, then 3. every shot settles into the wall (the ones not on the arc come straight in from below)
      const land = .3;
      cards.forEach((c, i) => {
        if (geo[i].arc) return;
        tl.fromTo(c, { x: () => from(i).x, y: () => from(i).y, rotationZ: () => from(i).rotationZ, rotationX: () => from(i).rotationX, z: -400, scale: .8, opacity: 0 },
          { x: 0, y: 0, rotationZ: 0, rotationX: 0, z: 0, scale: 1, opacity: 1, duration: .2, ease: 'power3.out' }, land + .02);
      });
      tl.to(cards.filter((c, i) => geo[i].arc), { x: 0, y: 0, z: 0, rotationZ: 0, rotationY: 0, scale: 1, duration: .2, ease: 'power2.inOut',
        stagger: { each: .004, from: 'center' } }, land);
      // 4. the wall pans up inside the stage until its last row is in view
      tl.to(grid, { y: () => -pan, duration: .42, ease: 'none' }, .55).to({}, { duration: .04 });
      window.__rwall = p => { const s = tl.scrollTrigger; scrollTo(0, s.start + (s.end - s.start) * p); };
    }

    /* the trail: the paths draw in, the photos pop onto them and travel with the scroll, the words rise */
    if (trail) {
      root.classList.add('motion-on');
      const tt = gsap.timeline({ scrollTrigger: { trigger: '[data-trail]', start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
        onUpdate: s => trail.place(s.progress), onRefresh: s => trail.place(s.progress) } });
      tt.fromTo(trail.svg, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: .4, ease: 'none' }, 0)
        .from(trail.dots.map(d => $('img', d)), { scale: 0, duration: .12, stagger: .04, ease: 'back.out(2.4)' }, .05)
        .from('[data-trail-text]', { y: 50, opacity: 0, duration: .18, stagger: .08, ease: 'power3.out' }, .08)
        .to({}, { duration: .2 }, .8);
    }

    /* inner pages: the big arch photo settles */
    const big = $('.bigarch img');
    if (big) gsap.fromTo(big, { scale: 1.08 }, { scale: 1, duration: 1.4, ease: 'power2.out' });

    const refresh = () => ST.refresh();
    document.fonts && document.fonts.ready.then(refresh);
    addEventListener('load', refresh, { once: true });
  };
  if (document.readyState === 'complete' || window.gsap) motion();
  else addEventListener('DOMContentLoaded', motion, { once: true });
})();
