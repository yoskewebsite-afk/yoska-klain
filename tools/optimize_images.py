"""Re-encodes the heavy photos the site serves (prototype/assets/{approved,photos,v4,story}) at web quality, in place.
Same file name, same format, same pixel size, so no page changes. A file is replaced only when it gets at least 15%
smaller, so running it again does nothing. Review screenshots, cutouts and brand files are left alone (text and edges).
    python3 tools/optimize_images.py            # dry run: prints what it would save
    python3 tools/optimize_images.py --write
"""
import io
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DIRS = ['approved', 'photos', 'v4', 'story']
WEBP_Q, JPEG_Q, MIN_GAIN = 74, 78, 0.15
write = '--write' in sys.argv


def encode(path):
    im = Image.open(path)
    icc = im.info.get('icc_profile')
    if path.suffix.lower() in ('.jpg', '.jpeg'):
        im = ImageOps.exif_transpose(im).convert('RGB')     # the orientation is baked in, so dropping EXIF keeps the look
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=JPEG_Q, optimize=True, progressive=True, **({'icc_profile': icc} if icc else {}))
    else:
        if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=WEBP_Q, method=6, **({'icc_profile': icc} if icc else {}))
    return buf.getvalue()


before = after = n = 0
for d in DIRS:
    for f in sorted((ROOT / 'prototype/assets' / d).rglob('*')):
        if f.suffix.lower() not in ('.webp', '.jpg', '.jpeg'):
            continue
        old = f.stat().st_size
        try:
            new = encode(f)
        except Exception as e:      # an unreadable file is reported, never replaced
            print('skip', f.relative_to(ROOT), e); continue
        if len(new) <= old * (1 - MIN_GAIN):
            before += old; after += len(new); n += 1
            if write:
                f.write_bytes(new)
print(f"{n} files: {before / 1e6:.1f}MB -> {after / 1e6:.1f}MB ({'written' if write else 'dry run'})")
