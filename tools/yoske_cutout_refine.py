from PIL import Image
import numpy as np, cv2, sys
SRC='/Users/yanaimizrahi/Documents/yoske-cinematic-handoff/media/2026-10-18-enhanced/yoske-hero.webp'
im=np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
a=np.array(Image.open('yoske-mask.png').convert('L')).astype(np.float32)/255
r,g,b=im[...,0],im[...,1],im[...,2]
H,W=a.shape; yy,xx=np.mgrid[0:H,0:W]
blue=b-np.maximum(r,g); sat=im.max(2)-im.min(2); lum=im.mean(2)
# distance from outside of mask (only treat a band near the silhouette + enclosed holes)
core=(a>0.5).astype(np.uint8)
dist=cv2.distanceTransform(core,cv2.DIST_L2,5)
sea=np.clip((blue-35)/25,0,1)*np.clip((sat-45)/30,0,1)*(yy<870)
sea=cv2.GaussianBlur(sea,(0,0),1.0)
a2=a*(1-sea)
roi=np.zeros_like(a)
roi[285:430,270:350]=1; roi[625:705,490:548]=1
warm=(r-b)
holes=roi*np.clip((lum-128)/25,0,1)*np.clip((14-warm)/14,0,1)
holes=cv2.GaussianBlur(holes,(0,0),0.8)
a2=a2*(1-holes)
gc=np.load('hand_fix.npy').astype(np.float32)/255
hx0,hy0,hx1,hy1=480,585,575,705
sub=a2[hy0:hy1,hx0:hx1]
R=im[hy0:hy1,hx0:hx1]
cityish=((R[...,0]-R[...,2])<38)&(R.mean(2)>118)
keep=gc*(1-cityish)
keep=cv2.GaussianBlur(keep,(0,0),0.7)
a2[hy0:hy1,hx0:hx1]=np.minimum(sub,keep)
halo=((lum>175)&(sat<45)&(a<0.97)&(dist<4)).astype(np.float32)
a2=a2*(1-0.65*halo)
a2=cv2.GaussianBlur(a2,(0,0),0.5); a2=np.clip((a2-0.06)/0.94,0,1)
solid=(a2>0.98)&(sea<0.05)
fg=im.copy(); filled=solid.copy(); est=np.zeros_like(im)
for s in (1.5,3,6,12,24):
    m=filled.astype(np.float32)
    num=cv2.GaussianBlur(im*m[...,None],(0,0),s); den=cv2.GaussianBlur(m,(0,0),s)
    e=num/np.maximum(den,1e-4)[...,None]
    new=(~filled)&(den>0.05)
    est[new]=e[new]; filled|=new
w=np.clip(1-a2,0,1)[...,None]*(~solid)[...,None]
fg=fg*(1-w)+est*w
out=np.dstack([np.clip(fg,0,255),a2*255]).astype(np.uint8)
x0,y0,x1,y1=149,258,608,941
cut=Image.fromarray(out,'RGBA').crop((x0,y0,x1,y1)); cut.save('yoske-cut-refined.png')
for name,col in [('rv-orange',(240,140,60)),('rv-navy',(14,42,71))]:
    bgc=Image.new('RGB',cut.size,col); bgc.paste(cut,(0,0),cut); bgc.save(name+'.png')
head=cut.crop((40,-10,380,230)).resize((680,480)); bgc=Image.new('RGB',head.size,(240,140,60)); bgc.paste(head,(0,0),head); bgc.save('rv-head.png')
hand=cut.crop((300,300,459,480)).resize((477,540)); bgc=Image.new('RGB',hand.size,(240,140,60)); bgc.paste(hand,(0,0),hand); bgc.save('rv-hand.png')
