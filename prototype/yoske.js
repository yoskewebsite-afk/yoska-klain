/* Yoske — behaviour and motion of the 10.11.2026 rebuild.
   Without JS, or with reduced motion, every section is a complete static page: the layered hero, the wipes and the
   reveals are switched on here only (html.hero-on / html.motion), after GSAP and ScrollTrigger are available. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduceMQ.matches || location.search.includes('still');
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

  /* ---------------- contact: prepares a WhatsApp draft, never sends ---------------- */
  const form = $('[data-contact]');
  if (form) {
    const ready = $('[data-ready]', form), preview = $('[data-preview]', form), openWa = $('[data-open-wa]', form);
    const f = { name: $('#c-name'), phone: $('#c-phone'), msg: $('#c-msg') };
    const phoneOk = v => /^(\+?972|0)\d{8,9}$/.test(v.replace(/[^\d+]/g, ''));
    const setErr = (el, bad) => { el.setAttribute('aria-invalid', String(bad)); $('#' + el.id + '-err').hidden = !bad; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.name.value.trim(), phone = f.phone.value.trim(), msg = f.msg.value.trim();
      const badName = !name, badPhone = !phoneOk(phone);
      setErr(f.name, badName); setErr(f.phone, badPhone);
      if (badName) return f.name.focus();
      if (badPhone) return f.phone.focus();
      const text = `היי יוסק׳ה, הגעתי דרך האתר.\nשם: ${name}\nטלפון: ${phone}` + (msg ? `\n${msg}` : '');
      preview.textContent = text; openWa.href = wa(text); ready.hidden = false; ready.focus();
    });
    ['name', 'phone'].forEach(k => f[k].addEventListener('input', () => { if (f[k].getAttribute('aria-invalid') === 'true') setErr(f[k], k === 'name' ? !f[k].value.trim() : !phoneOk(f[k].value)); }));
    $('[data-edit]', form).addEventListener('click', () => { ready.hidden = true; f.msg.focus(); });
  }

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
    }

    /* hero: the headline stays, the Shrine and the terraces rise over it, the scene anchors, the intro rises in front, release */
    const stage = $('[data-hero-stage]');
    if (stage) {
      root.classList.add('hero-on');
      const scene = $('[data-hero-scene]'), head = $('[data-hero-head]'), veil = $('[data-hero-veil]'), intro = $('[data-hero-intro]'),
        cta = $('[data-hero-cta]');
      // the scene sits right under the headline block (measured, so no line ever collides with the photo)
      const tallQ = '(max-width: 699px), (max-width: 999px) and (orientation: portrait)';
      const place = () => {
        const img = $('img', scene), w = img.getBoundingClientRect().width || innerWidth;
        const tall = matchMedia(tallQ).matches, ih = w * (tall ? 1763 / 1280 : 1434 / 2160);
        const hb = head.offsetTop + head.offsetHeight;
        stage.style.setProperty('--scene-top', Math.round(hb + (tall ? 14 : 8) - ih * (tall ? .02 : .075)) + 'px');
      };
      place(); addEventListener('resize', place);
      ST.addEventListener('refreshInit', place);
      const mm = gsap.matchMedia();
      mm.add({ any: 'all', narrow: tallQ }, ctx => {
        const wide = !ctx.conditions.narrow;
        const u = () => Math.min(innerWidth * .01, innerHeight * .016);
        const sceneTop = () => scene.offsetTop;
        const lift1 = () => wide ? -u() * 31 : -(sceneTop() - 46);
        const lift2 = () => wide ? -u() * 41 : -(sceneTop() - 10);
        gsap.set(scene, { transformOrigin: '50% 0%' });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true }
        });
        tl.to(scene, { y: lift1, duration: .45 }, 0)
          .to(cta, { autoAlpha: 0, duration: .12 }, .04)
          .to(head, { y: () => -u() * (wide ? 9 : 14), autoAlpha: 0, ease: 'power1.in', duration: .3 }, .1)
          .to(scene, { y: lift2, scale: wide ? 1.045 : 1.03, duration: .42 }, .45)
          .fromTo(veil, { yPercent: 100 }, { yPercent: 0, ease: 'power2.out', duration: .34 }, .36)
          .fromTo(intro, { y: () => innerHeight * .45, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', duration: .34 }, .44)
          .to({}, { duration: .16 }, .84);
        return () => gsap.set([scene, head, veil, intro, cta], { clearProps: 'all' });
      });
      window.__hero = p => { const t = ST.getAll().find(s => s.trigger === hero); if (t) scrollTo(0, t.start + (t.end - t.start) * p); };
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

    /* moments: the row drifts sideways with the scroll (desktop) */
    const row = $('[data-drift]');
    if (row) ST.matchMedia({ '(min-width: 700px)': () => {
      gsap.fromTo(row, { x: 0 }, { x: () => Math.max(0, row.scrollWidth - innerWidth + 80), ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: .6, invalidateOnRefresh: true } });
    } });

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
