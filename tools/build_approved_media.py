"""Responsive derivatives. Only resize/crop real photographs; never synthesize people or scenery."""
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'prototype/assets/approved'; out.mkdir(parents=True,exist_ok=True)
# Source photographs remain in media/; derivatives are reproducible.
sources=ROOT/'media/approved-originals'; sources.mkdir(exist_ok=True)
for n in ['haifa-gardens','iguazu-panorama']:
 p=Path('/tmp')/(n+'.jpg')
 if p.exists() and not (sources/(n+'.jpg')).exists(): (sources/(n+'.jpg')).write_bytes(p.read_bytes())
images={p.stem:ImageOps.exif_transpose(Image.open(p)).convert('RGB') for p in (ROOT/'prototype/assets/photos').glob('*.jpg') if not p.stem.endswith(('-sm','-xs'))}
images['gardens']=Image.open(sources/'haifa-gardens.jpg').convert('RGB')
images['iguazu']=Image.open(sources/'iguazu-panorama.jpg').convert('RGB')
original=ImageOps.exif_transpose(Image.open(ROOT/'media/facebook-originals/fb-845822378219479.jpg'))
images['haifa-panorama']=original.crop((1250,0,3013,1100))
for name,im in images.items():
 for w in [480,960,1920]:
  width=min(w,im.width); h=round(im.height*width/im.width)
  im.resize((width,h),Image.Resampling.LANCZOS).save(out/f'{name}-{w}.webp',quality=84,method=6)
print('Prepared',len(images),'photographs, three responsive sizes each')
