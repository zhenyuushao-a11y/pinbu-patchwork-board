import json, math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
private_catalog=ROOT/'public/assets/private-texture-pieces.json'
catalog=private_catalog if private_catalog.exists() else ROOT/'public/assets/texture-pieces.json'
items=json.loads(catalog.read_text())
cols,cell_w,cell_h=12,150,122
rows=math.ceil(len(items)/cols)
sheet=Image.new('RGB',(cols*cell_w,rows*cell_h),(241,235,224))
d=ImageDraw.Draw(sheet)
for index,item in enumerate(items):
    x=(index%cols)*cell_w;y=(index//cols)*cell_h
    d.rectangle((x,y,x+cell_w/2,y+cell_h),fill=(246,241,232))
    d.rectangle((x+cell_w/2,y,x+cell_w,y+cell_h),fill=(65,62,58))
    im=Image.open(ROOT/('public'+item['thumbnail'])).convert('RGBA')
    im.thumbnail((cell_w-16,cell_h-20),Image.Resampling.LANCZOS)
    px=x+(cell_w-im.width)//2;py=y+(cell_h-im.height)//2-5
    sheet.paste(im,(px,py),im)
    d.text((x+6,y+cell_h-14),item['id'].replace('private-','')[:22],fill=(54,48,43))
sheet.save(ROOT/'public/assets/fabric-overview.webp','WEBP',quality=84,method=5)
print(f'Overview: {len(items)} pieces, {sheet.width}×{sheet.height}')
