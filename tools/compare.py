"""Side-by-side: live reference state (left) vs our implementation (right). Run from the project root."""
from PIL import Image, ImageDraw
R = 'references/'; V = 'captures/v3/'
PAIRS = {
    'jesko-vs-hero.jpg': [('01-jesko/jesko-live-00', 'hero-0'), ('01-jesko/jesko-live-01', 'hero-0_35'), ('01-jesko/jesko-live-06', 'hero-0_75'), ('01-jesko/jesko-live-11', 'close-0')],
    'telescope-vs-close.jpg': [('02-telescope/telescope-live-00', 'close-0'), ('02-telescope/telescope-live-01', 'close-0_4'), ('02-telescope/telescope-live-02', 'close-0_6'), ('02-telescope/telescope-live-03', 'close-0_95')],
    'stickygrid-vs-moments.jpg': [('03-sticky-grid/stickygrid-live-03', 'moments-0_15'), ('03-sticky-grid/stickygrid-live-04', 'moments-0_6'), ('03-sticky-grid/stickygrid-live-07', 'moments-1')],
}
for out, items in PAIRS.items():
    W, H = 640, 400
    s = Image.new('RGB', (W * 2, len(items) * (H + 24)), 'white'); d = ImageDraw.Draw(s)
    for r, (ref, ours) in enumerate(items):
        for c, (f, label) in enumerate(((R + ref + '.jpg', 'REF ' + ref.split('/')[-1]), (V + '1440-' + ours + '.jpg', 'OURS ' + ours))):
            im = Image.open(f).convert('RGB'); im.thumbnail((W - 6, H)); x, y = c * W, r * (H + 24)
            s.paste(im, (x + 3, y)); d.text((x + 6, y + H + 5), label, fill='black')
    s.save(V + 'compare/' + out, quality=80); print(out)
