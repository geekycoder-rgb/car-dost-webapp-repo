#!/usr/bin/env python3
from PIL import Image
import numpy as np
import cv2
from collections import Counter

IN='frontend/public/cardostlogo.png'
OUT='frontend/public/cardostlogo.refined.svg'
K=4  # fewer color clusters for simpler shapes
MIN_AREA=800  # ignore small fragments
BLUR_K=3  # gaussian blur kernel

im=Image.open(IN).convert('RGBA')
arr=np.array(im)
alpha=arr[:,:,3]
mask=(alpha>10)
if mask.sum()==0:
    raise SystemExit('No non-transparent pixels')

# smooth image to reduce noise
rgb=arr[:,:,:3]
rgb_blur=cv2.GaussianBlur(rgb,(BLUR_K,BLUR_K),0)

# prepare pixels for kmeans
pixels=rgb_blur[mask]
Z=pixels.reshape((-1,3)).astype(np.float32)
criteria=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,20,0.5)
ret,label,center=cv2.kmeans(Z,K,None,criteria,20,cv2.KMEANS_PP_CENTERS)
centers=np.uint8(center)
labels=label.flatten()
count=Counter(labels)
clusters=[(count[i],i) for i in range(len(centers))]
clusters.sort(reverse=True)

h,w=alpha.shape
svg_parts=[]
svg_header=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet">\n'
svg_parts.append(svg_header)

# build lab image mapping
lab_img=np.full((h,w),-1,dtype=np.int32)
idx=0
for y in range(h):
    for x in range(w):
        if mask[y,x]:
            lab_img[y,x]=int(labels[idx])
            idx+=1

# process clusters from most to least used
for usage,ci in clusters:
    col=centers[ci].tolist()
    cmap=(lab_img==ci).astype('uint8')*255
    if cmap.sum()==0:
        continue
    # morphological operations: close then open to smooth shapes
    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
    cmap=cv2.morphologyEx(cmap,cv2.MORPH_CLOSE,kernel,iterations=2)
    cmap=cv2.morphologyEx(cmap,cv2.MORPH_OPEN,kernel,iterations=1)
    contours, _ = cv2.findContours(cmap, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        continue
    hexcol='#%02x%02x%02x' % tuple(col)
    for cnt in contours:
        area=cv2.contourArea(cnt)
        if area<MIN_AREA:
            continue
        # simplify contour more aggressively for smoother shapes
        epsilon=0.02*cv2.arcLength(cnt,True)
        approx=cv2.approxPolyDP(cnt,epsilon,True)
        # optional smoothing: convert polygon to bezier-like by inserting midpoints (keeps small size)
        pts=[(p[0][0],p[0][1]) for p in approx]
        if len(pts)<3:
            continue
        path='M ' + ' '.join([f'{int(x)},{int(y)}' for x,y in pts]) + ' Z'
        svg_parts.append(f'<path d="{path}" fill="{hexcol}" stroke="none"/>\n')

svg_parts.append('</svg>')
with open(OUT,'w') as f:
    f.writelines(svg_parts)
print('Wrote',OUT)
