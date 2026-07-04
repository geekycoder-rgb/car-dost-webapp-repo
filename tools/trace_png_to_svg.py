#!/usr/bin/env python3
from PIL import Image
import numpy as np
import cv2
from collections import Counter

IN='frontend/public/cardostlogo.png'
OUT='frontend/public/cardostlogo.svg'
K=6  # color clusters
MIN_AREA=200  # ignore tiny noise

im=Image.open(IN).convert('RGBA')
# Convert to RGBA numpy
arr=np.array(im)
# Separate alpha
alpha=arr[:,:,3]
# Mask of non-transparent
mask=(alpha>10)
# Prepare colors from non-transparent pixels
pixels=arr[:,:,:3][mask]
if len(pixels)==0:
    raise SystemExit('No non-transparent pixels found')
# K-means color quantization
Z=pixels.reshape((-1,3)).astype(np.float32)
criteria=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,10,1.0)
ret,label,center=cv2.kmeans(Z,K,None,criteria,10,cv2.KMEANS_PP_CENTERS)
centers=np.uint8(center)
labels=label.flatten()
# Count cluster usage and sort by popularity
count=Counter(labels)
clusters=[(count[i],i) for i in range(len(centers))]
clusters.sort(reverse=True)

h,w=alpha.shape
svg_parts=[]
svg_header=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet">\n'
svg_parts.append(svg_header)
# For each cluster, create mask and find contours
for usage,ci in clusters:
    col=centers[ci].tolist()
    # build binary mask for this color cluster in full image
    full_labels=np.zeros((h,w),np.uint8)
    # assign labels to non-transparent pixels
    it=iter(labels)
    lab_img=np.zeros((h,w),np.int32)-1
    idx=0
    for y in range(h):
        for x in range(w):
            if mask[y,x]:
                lab_img[y,x]=int(labels[idx])
                idx+=1
    # mask for this cluster
    cmap=(lab_img==ci).astype('uint8')*255
    if cmap.sum()==0:
        continue
    # morphological clean
    kernel=np.ones((3,3),np.uint8)
    cmap=cv2.morphologyEx(cmap,cv2.MORPH_OPEN,kernel,iterations=1)
    # find contours
    contours, _ = cv2.findContours(cmap, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        continue
    hexcol='#%02x%02x%02x' % tuple(col)
    for cnt in contours:
        area=cv2.contourArea(cnt)
        if area<MIN_AREA:
            continue
        # simplify contour
        epsilon=0.01*cv2.arcLength(cnt,True)
        approx=cv2.approxPolyDP(cnt,epsilon,True)
        # build path
        path='M '
        path += ' '.join([f'{p[0][0]},{p[0][1]}' for p in approx])
        path += ' Z'
        svg_parts.append(f'<path d="{path}" fill="{hexcol}" stroke="none"/>\n')

svg_parts.append('</svg>')
with open(OUT,'w') as f:
    f.writelines(svg_parts)
print('Wrote',OUT)
