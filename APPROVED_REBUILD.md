> **הוחלף ב-16.10.2026:** העיצוב, הקופי והתנועה במסמך הזה נדחו. המסמכים בתוקף: DESIGN.md, COPY.he.md, STORYBOARD.md, DELIVERY_2026-10-16.md.

# Approved-image rebuild — 14 October 2026

Local preview: http://127.0.0.1:4181/ . Source: `site-src/home.html`; shared styles and interactions: `prototype/styles.css`, `prototype/app.js`. The static generator retains the five sourced tour detail pages, tour index, groups, gallery and 404 page.

## Checkpoint and visual system

`git status --short` confirmed that this directory is not a Git repository. A recoverable copy of the previous `site-src`, `prototype`, generator and README is in `_archive/2026-10-14-approved-rebuild/`. Original media and unrelated files were preserved.

The latest typography reference (`IMG_0414.PNG`) takes precedence over the serif typography in several approved compositions. Its font name is not visible. **Karantina Bold 700** is the selected licensed visual approximation, not a claimed identification. **Heebo 400–700** supplies body and UI text. Both are locally hosted; their OFL license files are in `prototype/fonts/`. No horizontal font stretching.

Palette: navy `#071d40`, sea blue `#03629f`, paper `#faf6ed`, orange accent `#ee6d15`, readable orange text/action fill `#c64d0a`. Large Hebrew headings, RTL controls, one primary pill action per composition, real image elements and live selectable text.

## Section manifest and motion mapping

All filenames below are from the supplied approved images in Downloads. The entire mockup images are **never shipped as section backgrounds**.

| Supplied file | Section and proportions | Crop/layers and controls | Motion reference → implementation |
|---|---|---|---|
| Haifa Bay Travel Discovery Hero-2.png | Panoramic opening, inset glass frame, centered heading, three lower-right thumbnails | Real Haifa panorama; translucent rounded navigation and frame; blue action; selectable thumbnails with selected state | A Timed Cards + restrained F/K approach → coordinated background selection, active thumbnail treatment, small scroll camera approach |
| Yoske_ Haifa Bay Through Clouds-4.png | Full-width landscape, centered heading, three lower text columns | Separate decorative CSS haze layers over real Haifa photo; small Yoske wordmark; orange rules | B North Face → foreground/back haze layers move apart during short native scroll interval |
| Discover Haifa Through Four Views-1.png | 38% left headline / 62% right destination cards | Four upright image cards, selected state, previous/next controls and moving progress indicator; real tour links | A → synchronized selected photograph, title link, card lift and progress; mobile native swipe with snap and active-card synchronization |
| Meet Yoske_ Blue-Poncho Travel Portrait-6.png | Original portrait on left 52%; editorial text on right | Actual blue poncho/cat photograph; soft edge; globe line graphic; expandable biography | D editorial concept → photograph and text enter together with a short vertical reveal |
| Moments that stay with you-7.png | Four photographs surround centered text | Original group/mural upper left, children right, lookout lower left and seated portrait lower right; gallery links | G Sticky Grid + H perspective → staggered entry and settling into the approved arrangement; mobile compact photo collage |
| Haifa Bay Guide Website Mockup-10.png | Three descending photographic stages from right to left | 01 group, 02 direction, 03 departure; orange connecting rules, original Haifa imagery, WhatsApp action | J cinematic + I spatial cards → gentle sequential scale focus within a short sticky interval |
| Haifa Bay Stories Unfold.png | Stable left photograph 63%; right editorial accordion 37% | Three HTML accordion buttons/regions, numbered stages, selected dots, changing image and caption; rounded image edge | L documented concept → click and scroll synchronization; F/J → final landscape expands rapidly before South America. Start-to-South-America distance is 200svh on desktop |
| Iguazu Falls_ South America beyond the sea-3.png | Full-width falls, large centered title, action lower left, portrait card lower right | Licensed real Iguazu panorama; original Yoske photo in Rio with explicit caption; Brazilao action | C/E concept + F/J feasible adaptation → short 2.5D approach, followed by stable readable scene |
| Haifa Bay travel FAQ section-5.png | Left landscape 60%; right editorial FAQ 40% | Real Haifa panorama; native details/summary with visible plus controls and telephone link | Subtle/static landscape and ordinary accessible accordion |
| Haifa Bay, Your Next Journey-9.png | Full-view sunset, centered title and contact actions | Original Haifa sunset; restrained edge framing; WhatsApp and telephone | C/K concept → slight approach that resolves into a stable CTA |
| IMG_0414.PNG | Typography reference only | Condensed heavy Hebrew display, clean sans-serif supporting text | No animation copied from the screenshot |

No Stella Maris route scene, no map drawn across a landscape, no extra waterfall interstitial, and no duplicate planning section. No WebGL or additional animation dependencies. One native-scroll requestAnimationFrame scheduler; only visible sections receive transform updates; no idle animation loop. Reduced motion removes pinning and spatial motion while preserving controls and content. Keyboard focus, Escape for mobile menu, accordion arrow/Home/End navigation, and touch scrolling are supported.

## Reference inspection and availability

The supplied Instagram links A/B/C/D/E were attempted on 14 October 2026 and failed to load through the web reader. They were **not watched**. The two Revital demos each received one availability attempt and were inaccessible; their documented accordion concept was implemented independently. Shir Uziel's catalog was also unavailable. No template purchases, protected files or authentication bypasses.

The original [Timed Cards](https://dribbble.com/shots/11012652--Timed-Cards-Opening) and [North Face](https://dribbble.com/shots/3275340-Exploring-The-North-Face) pages were readable. Their existing local reference captures were reviewed as stills; no claim of newly viewing their complete animation.

[Telescope](https://tympanus.net/Tutorials/TelescopeZoom/), [Sticky Grid](https://tympanus.net/Tutorials/StickyGridScroll/), [Perspective Grid](https://tympanus.net/Development/Scroll3DGrid/), [3D Carousel](https://tympanus.net/Development/3DCarousel/) and [Jesko](https://jeskojets.com/) pages were accessible. Existing project browser-capture contact sheets of Telescope and Sticky Grid were visually inspected for their start/middle/end progression. The Cinematic3DScroll URL returned an empty text response, so its live animation was not verified in this turn. The 60fps recorded-reference page was readable; its video was not watched. Implementation uses the supplied section-specific descriptions rather than claiming inaccessible motion was observed.

## Photographs and exact-match limits

The hero, cloud scene, initial destination, planning third stage, initial accordion and FAQ use a crop from Yoske's original `fb-845822378219479.jpg` (x1250–3013, y0–1100). This keeps the real railing, port and bay and excludes visitors on the left. There is no inpainting. The portrait, participants, mural and lookout photographs use the existing original archive. Their appearance was not synthesized or reshaped.

A real [Bahai Gardens photo by EdoM](https://commons.wikimedia.org/wiki/File:Israel_-_Haifa_-_Bahai_Gardens_004.jpg), released into the public domain, supplies one thumbnail. The [Iguazu panorama by Mario Roberto Durán Ortiz](https://commons.wikimedia.org/wiki/File:Iguazu_Falls_Panorama_2009.jpg) is CC BY-SA 4.0, with visible footer attribution, source/license links and modification notice. Its resized/cropped derivatives remain under that license. Full source photographs are retained in `media/approved-originals/`.

Composition follows the supplied images, with deliberate photographic differences: the real Haifa view has a railing rather than the generated garden foreground; the sunset does not contain the mockup's imaginary stone arch; Yoske's South America inset is his real Rio photograph rather than the generated red-shirt waterfall portrait. The typography is the selected approximation. Decorative haze is a CSS treatment, not a weather claim. These are not pixel-identical reconstructions of generated scenery.

This is a local preview, not a public deployment. The pre-existing archive's participant/photo publication permissions have not been independently audited. No new permissions are inferred from public Facebook availability.

## Verification evidence

`tools/output/playwright/qa-report.json` records actual Chromium checks and performance conditions. `desktop-*.jpg` / `mobile-*.jpg` show each composition. `comparisons/` holds the implementation beside each approved image. `walkthrough.webm` is recorded from the real browser using actual scrolling and controls, with start/mid/end captures of the pinned accordion transition.

The QA covers 1440×900, 390×844, 320×740, 768×1024, and desktop reduced motion; all section widths; real hero and carousel controls; forward/backward scroll synchronization; accordion clicks; FAQ; mobile menu/Escape; retained inner pages; image loading; JS/console errors. The throttled measurement uses a fresh context, cache disabled, 1.6 Mbit/s downstream, 150 ms latency and CPU ×4. It is a local laboratory measurement, not field data or a Lighthouse score. Final throttled run: LCP 988 ms, CLS 0, resource transfer 395,007 bytes. Desktop initial LCP 112 ms on localhost. See JSON for the full results. INP and production/CDN performance are not measured.
