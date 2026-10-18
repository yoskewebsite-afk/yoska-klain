/* 18.10.2026 — motion for the «film» after the hero: the shared Haifa backdrop, the trail, the process panels,
   Haifa in 3D (Three.js, loaded only when the section comes near) and the stacking places.
   Loaded after app.js and reuses its GSAP / ScrollTrigger / Lenis. Without them, or with reduced motion,
   every section stays readable as plain content (html.still). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || location.search.includes('still');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const film = $('[data-film]');
  if (!film) return;

  /* ---------------- Haifa in 3D ---------------- */
  const globe = $('[data-globe]'), canvas = $('[data-globe-canvas]'), marks = $$('[data-globe-list] li');
  const G = { progress: 0, ready: false, render: null };
  const setMark = i => marks.forEach((li, k) => li.classList.toggle('is-on', k === i));
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

  async function buildGlobe() {
    if (G.ready || !webgl) return;
    G.ready = true;
    const T = await import('/vendor/three.module.min.js');
    globe.classList.add('is-3d');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, .1, 100);
    scene.add(new T.HemisphereLight(0xf4fbff, 0x7aa58f, 1.7));
    const sun = new T.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-5, 9, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -.002;
    scene.add(sun);

    const C = { cream: 0xF3EFE4, green: 0x6E9F82, green2: 0xA8CBB0, deep: 0x2E6150, teal: 0x8FCFD8, white: 0xFBFAF6, gold: 0xE7B54A, orange: 0xE46A1E, red: 0xD2463A, blue: 0x5C8FB8, glass: 0x9CC3DB, yellow: 0xF2C230, stone: 0xD9CDB8, sea: 0x5FA7C6 };
    const mat = c => new T.MeshStandardMaterial({ color: c, roughness: .82, flatShading: true });
    const mesh = (g, c, x = 0, y = 0, z = 0) => { const m = new T.Mesh(g, mat(c)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
    const box = (w, h, d, c, x, y, z) => mesh(new T.BoxGeometry(w, h, d), c, x, y + h / 2, z);

    // the hill: a big low-poly sphere; we only ever see its top
    const R = 10, world = new T.Group(); world.position.y = -R - 1.35; scene.add(world);
    const hill = new T.Mesh(new T.IcosahedronGeometry(R, 6), mat(C.cream)); hill.receiveShadow = true; world.add(hill);

    const L = [];
    // 0 — Bahá'í gardens: green terraces down the slope and the shrine with the golden dome
    L[0] = (() => { const g = new T.Group();
      for (let i = 0; i < 6; i++) g.add(box(1.5 - i * .2, .12, .5, i % 2 ? C.green2 : C.green, 0, i * .12, .9 - i * .3));
      g.add(box(.42, .34, .42, C.white, 0, .72, -.75));
      const dome = mesh(new T.SphereGeometry(.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), C.gold, 0, 1.06, -.75); g.add(dome);
      for (const x of [-.95, .95]) { const c = mesh(new T.ConeGeometry(.1, .7, 6), C.deep, x, .35, .2); g.add(c); }
      return g; })();
    // 1 — the Carmelit: a sloping tunnel line with a red car
    L[1] = (() => { const g = new T.Group();
      const track = box(.18, .08, 2.2, C.stone, 0, .02, 0); track.rotation.x = -.28; g.add(track);
      const car = box(.34, .28, .7, C.red, 0, .22, .15); car.rotation.x = -.28; g.add(car);
      g.add(box(.36, .5, .36, C.white, .7, 0, -.7)); g.add(box(.3, .7, .3, C.stone, -.7, 0, -.5));
      return g; })();
    // 2 — the Sail Tower: a tall glass wedge
    L[2] = (() => { const g = new T.Group();
      const s = new T.Shape(); s.moveTo(-.32, 0); s.lineTo(.32, 0); s.lineTo(.32, 1.9); s.lineTo(-.32, 2.45); s.closePath();
      const tower = mesh(new T.ExtrudeGeometry(s, { depth: .36, bevelEnabled: false }), C.glass, 0, 0, -.18); g.add(tower);
      g.add(box(.5, .55, .5, C.white, .75, 0, .2)); g.add(box(.42, .8, .42, C.stone, -.72, 0, .1));
      return g; })();
    // 3 — the port: a gantry crane over a ship with containers
    L[3] = (() => { const g = new T.Group();
      const hull = box(1.7, .22, .48, C.blue, 0, 0, .55); g.add(hull);
      [[C.orange, -.5], [C.red, -.1], [C.teal, .3], [C.yellow, .62]].forEach(([c, x]) => g.add(box(.32, .18, .3, c, x, .22, .55)));
      for (const x of [-.55, .55]) g.add(box(.08, 1.3, .08, C.red, x, 0, -.25));
      g.add(box(1.35, .12, .14, C.red, 0, 1.3, -.25)); g.add(box(.12, .12, 1.1, C.red, .3, 1.3, .1));
      return g; })();
    // 4 — «יש לחיפה חור בלב»: the yellow heart with a hole
    L[4] = (() => { const g = new T.Group();
      const h = new T.Shape(); h.moveTo(0, .35); h.bezierCurveTo(0, .55, -.35, .75, -.55, .5); h.bezierCurveTo(-.8, .2, -.3, -.15, 0, -.45); h.bezierCurveTo(.3, -.15, .8, .2, .55, .5); h.bezierCurveTo(.35, .75, 0, .55, 0, .35);
      const hole = new T.Path(); hole.absarc(0, .17, .2, 0, Math.PI * 2, true); h.holes.push(hole);
      const heart = mesh(new T.ExtrudeGeometry(h, { depth: .16, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }), C.yellow, 0, .95, -.08);
      heart.scale.setScalar(1.25); g.add(heart);
      g.add(box(.9, .08, .5, C.stone, 0, 0, 0));
      return g; })();
    // 5 — the cable car: two pylons, the cable, two round cabins
    L[5] = (() => { const g = new T.Group();
      g.add(box(.12, 1.6, .12, C.deep, -.85, 0, 0)); g.add(box(.12, 1.1, .12, C.deep, .85, 0, 0));
      const cable = new T.Mesh(new T.CylinderGeometry(.012, .012, 1.85, 4), mat(C.deep)); cable.rotation.z = Math.PI / 2 + .29; cable.position.set(0, 1.35, 0); g.add(cable);
      for (const [x, y] of [[-.35, 1.2], [.3, 1.0]]) { const cab = mesh(new T.SphereGeometry(.17, 10, 8), C.teal, x, y, 0); cab.scale.set(1.15, .9, .9); g.add(cab); g.add(box(.02, .14, .02, C.deep, x, y + .1, 0)); }
      return g; })();

    // place the landmarks around the top of the hill; each stands on its own normal
    const lat = .2, N = L.length, up = new T.Vector3(0, 1, 0);
    L.forEach((g, k) => {
      const lon = (k / N) * Math.PI * 2;
      const n = new T.Vector3(Math.sin(lat) * Math.sin(lon), Math.cos(lat), Math.sin(lat) * Math.cos(lon)).normalize();
      g.position.copy(n).multiplyScalar(R); g.quaternion.setFromUnitVectors(up, n);
      g.rotateY(lon);  // face outwards
      world.add(g);
    });
    // a few cypresses and houses in between, so the hill reads as Haifa's slope
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    for (let i = 0; i < 46; i++) {
      const lon = rnd() * Math.PI * 2, la = .12 + rnd() * .3;
      if (L.some((_, k) => Math.abs(((lon - (k / N) * Math.PI * 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < .26 && la < .3)) continue;
      const n = new T.Vector3(Math.sin(la) * Math.sin(lon), Math.cos(la), Math.sin(la) * Math.cos(lon)).normalize();
      const o = rnd() < .55 ? mesh(new T.ConeGeometry(.07, .42 + rnd() * .25, 5), rnd() < .5 ? C.deep : C.green, 0, .22, 0)
        : (() => { const h = new T.Group(); h.add(box(.22, .18, .22, rnd() < .5 ? C.white : C.stone, 0, 0, 0)); const roof = mesh(new T.ConeGeometry(.18, .12, 4), C.orange, 0, .24, 0); roof.rotation.y = Math.PI / 4; h.add(roof); return h; })();
      const g = new T.Group(); g.add(o); g.position.copy(n).multiplyScalar(R); g.quaternion.setFromUnitVectors(up, n); world.add(g);
    }

    const size = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      const narrow = w / h < 1;
      camera.fov = narrow ? 46 : 30; camera.position.set(0, narrow ? 2.6 : 2.3, narrow ? 10.5 : 9); camera.lookAt(0, narrow ? .9 : .75, 0);
      camera.updateProjectionMatrix();
    };
    let visible = false, raf = 0, t0 = performance.now();
    const draw = now => {
      const idle = still ? 0 : Math.sin((now - t0) / 2600) * .025;
      world.rotation.y = -G.progress * Math.PI * 2 * (N - 1) / N + idle;
      const front = ((Math.round(G.progress * (N - 1)) % N) + N) % N; setMark(front);
      renderer.render(scene, camera);
    };
    const loop = now => { draw(now); raf = visible && !still ? requestAnimationFrame(loop) : 0; };
    G.render = () => { if (!raf) draw(performance.now()); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !still) raf = requestAnimationFrame(loop); }).observe(globe);
    new ResizeObserver(() => { size(); G.render(); }).observe(canvas);
    size(); setMark(0); G.render();
    if (ST) ST.refresh();
  }
  if (globe && canvas && webgl && !still) {
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); buildGlobe(); } }, { rootMargin: '900px 0px' }).observe(globe);
  }

  if (!gsap || !ST || still) return;
  gsap.registerPlugin(ST);

  /* ---------------- the shared backdrop: one Haifa shot per section, the wash follows the section ---------------- */
  const shots = $$('[data-shot]'), wash = $('[data-film-wash]');
  const WASH = { trail: .86, proc: .5, globe: .62, places: .3 };
  $$('[data-film-shot]', film).forEach(sec => ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: s => {
    if (!s.isActive) return;
    shots.forEach(sh => sh.classList.toggle('is-on', sh.dataset.shot === sec.dataset.filmShot));
    gsap.to(wash, { opacity: WASH[sec.className.split(' ')[0]] ?? .6, duration: .9, ease: 'power2.out', overwrite: true });
  } }));
  gsap.fromTo('.film__shot img', { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: film, start: 'top top', end: 'bottom bottom', scrub: true } });

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 900px)', phone: '(max-width: 899px)' }, ctx => {
    const { desk } = ctx.conditions;

    /* A. trail: the dashed paths draw across, the photo stops pop onto them, the line arrives */
    const ttl = gsap.timeline({ scrollTrigger: { trigger: '[data-trail]', start: 'top 85%', end: 'center 52%', scrub: .5 } });
    ttl.fromTo('.trail__paths', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', ease: 'none', duration: 1 }, 0)
      .from('[data-trail-pop]', { scale: 0, autoAlpha: 0, duration: .25, stagger: .12, ease: 'back.out(2.2)' }, .15)
      .from('[data-trail-text]', { y: 46, opacity: 0, duration: .4, stagger: .12, ease: 'power3.out' }, .3);
    gsap.to('.trail__dot', { y: i => (i % 2 ? -1 : 1) * 40, ease: 'none', scrollTrigger: { trigger: '[data-trail]', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* B. process: the title, then one panel joins per scroll step (desktop pinned), on phones each panel arrives as it enters */
    const steps = $$('[data-proc-step]');
    if (desk) {
      const ptl = gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: '[data-proc]', start: 'top top', end: 'bottom bottom', scrub: .6 } });
      ptl.from('.proc__title', { y: 60, opacity: 0, duration: .1 }, 0);
      steps.forEach((st, k) => {
        const at = .1 + k * .26;
        ptl.from($('.proc__img', st), { x: -220, rotationY: -38, opacity: 0, scale: .86, duration: .16 }, at)
          .from($('.proc__line', st), { scaleX: 0, transformOrigin: '100% 50%', duration: .1 }, at + .08)
          .from($('.proc__txt', st), { y: 30, opacity: 0, duration: .1 }, at + .1);
      });
      ptl.from('.proc__wa', { y: 30, opacity: 0, duration: .08 }, .86).to({}, { duration: .06 }, .94);
    } else {
      steps.forEach(st => gsap.from(st, { y: 70, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 92%', end: 'top 60%', scrub: .5 } }));
    }

    /* C. globe: scroll turns the hill; the caption follows the landmark in front */
    ST.create({ trigger: '[data-globe]', start: 'top top', end: 'bottom bottom', onUpdate: s => { G.progress = s.progress; if (G.render) G.render(); } });
    gsap.from('.globe__copy > *:not(ul)', { y: 40, opacity: 0, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '[data-globe]', start: 'top 70%', end: 'top 20%', scrub: .5 } });

    /* D. places: each card settles back (smaller, darker) as the next one slides over it */
    const cards = $$('[data-place]');
    cards.forEach((li, i) => {
      if (i === cards.length - 1) return;
      gsap.to($('.place__card', li), { scale: desk ? .9 : .93, filter: 'brightness(.62)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: `top ${desk ? 18 : 14}%`, scrub: true } });
    });
    gsap.from('.places__head > *', { y: 50, opacity: 0, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.places__head', start: 'top 90%', end: 'top 55%', scrub: .5 } });
  });
  // hero entrance (on the children, so the scroll timeline in app.js keeps the container)
  gsap.from('.nf__hero > *', { y: 36, opacity: 0, duration: 1, stagger: .09, ease: 'power3.out', delay: .15 });
  gsap.from('[data-nf-yoske]', { yPercent: 8, opacity: 0, duration: 1.2, ease: 'power3.out' });
  addEventListener('load', () => ST.refresh());
  // QA hook: window.__at('#process', .5) jumps to a progress inside a section
  window.__at = (sel, p) => { const el = $(sel), top = el.getBoundingClientRect().top + scrollY, h = Math.max(0, el.offsetHeight - innerHeight); const y = top + h * p; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); ST.update(); };
})();
