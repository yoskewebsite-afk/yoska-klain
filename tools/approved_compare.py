"""Approved composition (left) versus working-site screenshot (right)."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
base=Path(__file__).resolve().parent/'output/playwright';out=base/'comparisons';out.mkdir(exist_ok=True)
refs=Path.home()/'Downloads'
manifest=[('home','Haifa Bay Travel Discovery Hero-2.png'),('perspective','Yoske_ Haifa Bay Through Clouds-4.png'),('tours','Discover Haifa Through Four Views-1.png'),('about','Meet Yoske_ Blue-Poncho Travel Portrait-6.png'),('moments','Moments that stay with you-7.png'),('plan','Haifa Bay Guide Website Mockup-10.png'),('stories','Haifa Bay Stories Unfold.png'),('south-america','Iguazu Falls_ South America beyond the sea-3.png'),('faq','Haifa Bay travel FAQ section-5.png'),('contact','Haifa Bay, Your Next Journey-9.png')]
for key,name in manifest:
 sheet=Image.new('RGB',(1680,580),'#e8e5de');d=ImageDraw.Draw(sheet)
 for x,f,label in [(0,refs/name,'APPROVED COMPOSITION'),(840,base/f'desktop-{key}.jpg','WORKING WEBSITE / KARANTINA + HEEBO')]:
  im=Image.open(f).convert('RGB');im.thumbnail((840,540));sheet.paste(im,(x,(540-im.height)//2+35));d.text((x+20,12),label,fill='#071d40')
 sheet.save(out/f'{key}.jpg',quality=87)
# Refresh two mobile files after the final contrast adjustment.
for key in ['perspective','contact']:
 src=base/f'390-sel-_{key}.jpg'
 if src.exists(): (base/f'mobile-{key}.jpg').write_bytes(src.read_bytes())
print(len(manifest),'paired comparisons saved')
