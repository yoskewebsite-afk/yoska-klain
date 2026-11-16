"""Floating objects (15.11.2026), in the spirit of viennainhebrew.com's plane and plate: a few large things from Yoske's
world that drift in from the edge of a section and move with the scroll. Drawn in the brand book's language
(navy outline, palette fills); the cable car is a real cut-out from his own photo of the Haifa cable car.
Each entry: section id -> markup. Decorative only (aria-hidden)."""

N, T, S, O, G, W = '#2A3A5C', '#25A0B5', '#F2B632', '#F7643C', '#2E9E7A', '#FFFFFF'
G0 = f'stroke="{N}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'

BINOCULARS = f'''<svg viewBox="0 0 200 200"><g {G0}>
  <path d="M44 62C30 26 170 26 156 62" fill="none" stroke="{O}"/>
  <rect x="42" y="38" width="34" height="42" rx="10" fill="{G}"/><rect x="124" y="38" width="34" height="42" rx="10" fill="{G}"/>
  <rect x="28" y="70" width="62" height="100" rx="24" fill="{T}"/><rect x="110" y="70" width="62" height="100" rx="24" fill="{T}"/>
  <rect x="84" y="88" width="32" height="36" rx="8" fill="{N}"/>
  <circle cx="59" cy="150" r="21" fill="{S}"/><circle cx="141" cy="150" r="21" fill="{S}"/>
  <path d="M50 142a11 11 0 0 1 11-8M132 142a11 11 0 0 1 11-8" stroke="{W}"/></g></svg>'''

CAMERA = f'''<svg viewBox="0 0 200 170"><g {G0}>
  <path d="M30 46C12 10 188 10 170 46" fill="none" stroke="{T}"/>
  <path d="M66 48l12-20h44l12 20" fill="{N}"/>
  <rect x="18" y="46" width="164" height="104" rx="20" fill="{S}"/>
  <rect x="18" y="72" width="164" height="40" fill="{O}"/>
  <circle cx="100" cy="98" r="40" fill="{N}"/><circle cx="100" cy="98" r="25" fill="{T}"/>
  <path d="M88 88a14 14 0 0 1 14-9" stroke="{W}"/>
  <rect x="146" y="56" width="22" height="12" rx="4" fill="{W}"/></g></svg>'''

COMPASS = f'''<svg viewBox="0 0 200 200"><g {G0}>
  <circle cx="100" cy="100" r="84" fill="{W}"/><circle cx="100" cy="100" r="66" fill="none" stroke="{T}" stroke-width="7"/>
  <path d="M100 26v12M100 162v12M26 100h12M162 100h12" />
  <path d="M100 44l17 56h-34Z" fill="{O}"/><path d="M100 156l17-56h-34Z" fill="{N}"/>
  <circle cx="100" cy="100" r="9" fill="{S}"/></g></svg>'''

FOLDED_MAP = f'''<svg viewBox="0 0 220 170"><g {G0}>
  <path d="M10 30l64-20 66 20 70-20v130l-70 20-66-20-64 20Z" fill="#E3F3F6"/>
  <path d="M74 10v130M140 30v130" />
  <path d="M74 10l66 20v130l-66-20Z" fill="#FDF3DC"/>
  <path d="M30 118C60 70 96 128 122 82S178 60 192 44" fill="none" stroke="{O}" stroke-dasharray="9 10"/>
  <path d="M192 44c-10-16 10-26 14-14 3 9-6 18-14 14Z" fill="{O}"/><circle cx="30" cy="118" r="7" fill="{G}"/></g></svg>'''

BACKPACK = f'''<svg viewBox="0 0 180 210"><g {G0}>
  <path d="M66 34c0-20 48-20 48 0" fill="none"/>
  <rect x="26" y="36" width="128" height="160" rx="34" fill="{G}"/>
  <path d="M26 92c0-40 128-40 128 0v6H26Z" fill="{T}"/>
  <rect x="52" y="120" width="76" height="56" rx="14" fill="{S}"/><path d="M52 140h76"/>
  <circle cx="90" cy="98" r="7" fill="{S}"/></g></svg>'''

PLANE = f'''<svg viewBox="0 0 220 140"><g {G0}>
  <path d="M8 70L212 10 130 128 104 86Z" fill="{W}"/><path d="M104 86L212 10 92 120Z" fill="{T}"/><path d="M104 86l-12 34 30-22" fill="{N}"/></g></svg>'''

CABIN = ('<img src="/assets/objects/cable-car-cabin.webp" width="313" height="434" alt="" loading="lazy" decoding="async">')


def obj(cls, art, y=-.08, r=0, x=0, travel=''):
    t = f' data-travel="{travel}"' if travel else ''
    return (f'      <div class="obj obj--{cls}" aria-hidden="true" data-float data-y="{y}" data-r="{r}" data-x="{x}"{t}>'
            f'<div class="obj__bob">{art}</div></div>\n')


PLANE_IMG = '<img src="/assets/objects/plane-787.webp" width="1217" height="333" alt="" loading="lazy" decoding="async">'
CAMERA_IMG = '<img src="/assets/objects/camera-pentax.webp" width="854" height="670" alt="" loading="lazy" decoding="async">'

# 16.11.2026: real photographs only (the client: "make them real, not drawn, more mature"). Cable car: Yoske's own photo
# of the Haifa cable car; plane and camera: Wikimedia Commons, credited on the terms page.
OBJECTS = {
    'about': obj('camera', CAMERA_IMG, y=.08, r=-.01),
    'groups': ('      <svg class="cable" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M-20 18L1460 112"/></svg>\n'
               + obj('cabin', CABIN, y=0, r=0, travel='cable')),
    'abroad': ('      <svg class="trailline" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-trail d="M1460 340C1180 320 1020 160 760 170S360 60 -20 30"/></svg>\n'
               + obj('plane', PLANE_IMG, y=0, r=0, travel='plane')),
}
