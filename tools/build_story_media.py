"""Web derivatives for the 18.10.2026 enhanced photos (homepage «photo story»).

Run from the project root:  python3 tools/build_story_media.py
Sources (never overwritten): media/2026-10-18-enhanced/*.webp and media/2026-10-18-enhanced/masks/*.png
  - masks/yoske-hero-cutout.png: Yoske cut out of yoske-hero.webp (Apple Vision subject mask via tools/swift/subject_mask.swift,
    then tools/yoske_cutout_refine.py: sea patches, halo and edge colour clean-up). Crop box (149,258)-(608,941) of the source.
  - masks/mountain-valley-land.png: land (white) vs sky (black) for mountain-valley-wide.webp
    (tools/valley_sky_mask.py + tools/valley_skyline_fix.py).
Output: prototype/assets/story/. Widths never exceed the source width (no upscaling).
"""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

P = Path(__file__).resolve().parents[1]
SRC = P / 'media/2026-10-18-enhanced'
OUT = P / 'prototype/assets/story'
OUT.mkdir(parents=True, exist_ok=True)

PHOTOS = {  # name: widths
    'haifa-bay-clean': [640, 1024, 1672],
    'haifa-evening': [600, 1194],
    'haifa-lookout': [640, 1200, 1844],
    'mountain-valley-wide': [640, 1024, 1672],
    'mountain-path-clean': [640, 1024, 1448],
    'mountain-river': [480, 941],
    'village-story': [480, 941],
    'mountain-terraces': [480, 941],
}


def save(img, name, q=80):
    img.save(OUT / name, 'WEBP', quality=q, method=6)
    return OUT / name


def photos():
    for name, widths in PHOTOS.items():
        im = Image.open(SRC / f'{name}.webp').convert('RGB')
        for w in widths:
            w = min(w, im.width)
            save(im.resize((w, round(im.height * w / im.width)), Image.LANCZOS), f'{name}-{w}.webp', 82 if w > 1000 else 78)
    # portrait crop of the bay for phones: centred on the port and the city under it, native pixels (no upscaling)
    bay = Image.open(SRC / 'haifa-bay-clean.webp').convert('RGB')
    box = (560, 0, 560 + 529, 941)
    save(bay.crop(box), 'haifa-bay-clean-portrait-529.webp', 82)


def yoske():
    cut = Image.open(SRC / 'masks/yoske-hero-cutout.png')
    for w in (320, cut.width):
        save(cut.resize((w, round(cut.height * w / cut.width)), Image.LANCZOS), f'yoske-hero-cutout-{w}.webp', 88)
    print('yoske cutout', cut.size)


def ridges():
    im = np.array(Image.open(SRC / 'mountain-valley-wide.webp').convert('RGB'))
    H, W = im.shape[:2]
    land = np.array(Image.open(SRC / 'masks/mountain-valley-land.png').convert('L')).astype(np.float32) / 255
    land = cv2.GaussianBlur(land, (0, 0), 1.1)
    # the seam: above the valley floor it follows the real edge of the right ridge (it stands in front of the left one),
    # measured on the photo as the first dark run of pixels; through the field it is a wide soft band.
    lum = im.astype(np.float32).mean(2)
    edge = {}
    for y in range(40, 471):
        # the right ridge = the land run that reaches the right border (gaps under 4px ignored)
        x, gap = W - 1, 0
        while x > 0 and gap < 4:
            gap = 0 if land[y, x] > .5 else gap + 1
            x -= 1
        start = x + gap + 1
        if start > 760: edge[y] = start; continue
        # no sky gap in this row (bottom of the V): first dark run of the right slope
        row = (lum[y, 760:1500] < 92) & (land[y, 760:1500] > .5)
        hit = np.where(np.convolve(row.astype(np.float32), np.ones(6), 'valid') >= 6)[0]
        if len(hit): edge[y] = 760 + hit[0]
    ys_e = np.array(sorted(edge)); xs_e = np.array([edge[y] for y in ys_e], np.float32)
    xs_e = np.array([np.median(xs_e[max(0, i - 2):i + 3]) for i in range(len(xs_e))]) - 1
    lower = np.array([(470, xs_e[-1]), (620, 905), (780, 935), (941, 965)], np.float32)
    all_y = np.concatenate([ys_e, lower[1:, 0]]); all_x = np.concatenate([xs_e, lower[1:, 1]])
    seamx = np.interp(np.arange(H), all_y, all_x)
    seamx[:471] = np.minimum(seamx[:471], 1150)  # the left ridges never reach this far; keeps the tall tree's crown on the right layer
    d = np.arange(W)[None, :] - seamx[:, None]
    F = np.interp(np.arange(H), [470, 540], [1.5, 36.0])[:, None]
    print('ridge edge at y=300/400/470:', [round(float(np.interp(v, ys_e, xs_e))) for v in (300, 400, 470)])
    ss = lambda x: (lambda c: c * c * (3 - 2 * c))(np.clip(x, 0, 1))
    # left fades out over [-F, F]; right (drawn underneath) fades in over [-2F, -F] and is solid from -F on,
    # so at rest the two layers together are fully opaque and no light leaks through the seam
    left_a = land * (1 - ss((d + F) / (2 * F)))
    right_a = land * ss((d + 2 * F) / F)
    for side, a in (('left', left_a), ('right', right_a)):
        rgba = Image.fromarray(np.dstack([im, (a * 255).astype(np.uint8)]), 'RGBA')
        # full-frame layers keep the alignment trivial in CSS (both sit exactly on the base photo)
        for w in (836, W):
            save(rgba.resize((w, round(H * w / W)), Image.LANCZOS), f'valley-ridge-{side}-{w}.webp', 84)


if __name__ == '__main__':
    photos(); yoske(); ridges()
    for f in sorted(OUT.iterdir()):
        print(f'{f.name:44s} {Image.open(f).size} {f.stat().st_size // 1024}KB')
