from __future__ import annotations
import colorsys, hashlib, json, math, random
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'assets/sources/source-manifest.json'
OUT = ROOT / 'public/assets/fabrics'
THUMBS = ROOT / 'public/assets/thumbs'
OUT.mkdir(parents=True, exist_ok=True)
THUMBS.mkdir(parents=True, exist_ok=True)

SHAPES = [
    ('square','方块'), ('triangle','三角'), ('oval','椭圆'), ('strip','条带'),
    ('petal','花瓣'), ('leaf','叶片'), ('arch','弧形'), ('irregular','不规则'),
    ('wave','波浪边'),
]

MATERIAL_MAP = {
    'denim':'牛仔', 'cotton':'棉布', 'hessian':'亚麻', 'wool':'毛呢', 'fleece':'毛绒',
    'satin':'缎面', 'crepe':'纱类', 'fur':'毛绒', 'knitted':'针织', 'corduroy':'灯芯绒',
    'stretchy':'弹力织物', 'polyester':'合成纤维', 'jacquard':'提花布',
}

PALETTE = {
    '米白':(224,215,198), '灰棕':(128,116,102), '红粉':(181,91,100), '黄橙':(210,157,58),
    '绿色':(88,116,78), '蓝紫':(65,91,135), '黑色':(42,40,39), '多色':(130,100,120),
}

def classify_color(rgb):
    r,g,b = rgb
    h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
    if v < .34: return '黑色'
    if s < .14 and v > .68: return '米白'
    if s < .22: return '灰棕'
    deg=h*360
    if deg < 25 or deg >= 335 or 315 <= deg < 335: return '红粉'
    if 25 <= deg < 75: return '黄橙'
    if 75 <= deg < 175: return '绿色'
    if 175 <= deg < 285: return '蓝紫'
    if 285 <= deg < 335: return '红粉'
    return '多色'

def classify_material(source):
    words = ' '.join(source.get('categories',[]) + source.get('tags',[])).lower()
    for token, name in MATERIAL_MAP.items():
        if token in words: return name
    return '未标注织物'

def classify_pattern(source):
    text = (' '.join(source.get('tags',[])) + ' ' + source.get('title','')).lower()
    if any(x in text for x in ['gingham','checker','checkered']): return '格纹'
    if any(x in text for x in ['floral','quatrefoil','jacquard']): return '花纹'
    if 'herringbone' in text: return '人字纹'
    if any(x in text for x in ['ribbed','corduroy','striped']): return '条纹'
    if 'denim' in text or 'twill' in text: return '斜纹'
    if any(x in text for x in ['fleece','fur','boucle','teddy']): return '绒面'
    return '素色'

def source_texture(path:Path, size=(760,560)):
    image=Image.open(path).convert('RGB')
    return ImageOps.fit(image,size,method=Image.Resampling.LANCZOS)

def shape_mask(name, size, seed):
    scale=4; w,h=size; W,H=w*scale,h*scale
    mask=Image.new('L',(W,H),0); d=ImageDraw.Draw(mask)
    m=28*scale
    if name=='square':
        d.rounded_rectangle((m,m,W-m,H-m),radius=18*scale,fill=255)
    elif name=='triangle':
        d.polygon([(W*.5,m),(W-m,H-m),(m,H-m)],fill=255)
    elif name=='oval':
        d.ellipse((m,m,W-m,H-m),fill=255)
    elif name=='strip':
        d.rounded_rectangle((m,H*.29,W-m,H*.71),radius=22*scale,fill=255)
    elif name=='petal':
        d.polygon([(m,H*.52),(W*.40,m),(W-m,H*.5),(W*.42,H-m)],fill=255)
    elif name=='leaf':
        d.polygon([(m,H*.52),(W*.45,m),(W-m,H*.48),(W*.46,H-m)],fill=255)
        d.ellipse((W*.40,H*.43,W*.54,H*.57),fill=255)
    elif name=='arch':
        d.pieslice((m,m,W-m,H*1.72),180,360,fill=255)
        d.rectangle((m,H*.47,W-m,H-m),fill=255)
    elif name=='wave':
        pts=[(m,H*.30)]
        for i in range(9):
            x=m+(W-2*m)*i/8; y=H*(.24 if i%2==0 else .35); pts.append((x,y))
        pts += [(W-m,H*.72)]
        for i in range(8,-1,-1):
            x=m+(W-2*m)*i/8; y=H*(.76 if i%2==0 else .65); pts.append((x,y))
        d.polygon(pts,fill=255)
    else:
        rnd=random.Random(seed)
        pts=[]
        for i in range(14):
            ang=2*math.pi*i/14; rad=(.39+rnd.uniform(-.08,.07))*min(W,H)
            pts.append((W/2+math.cos(ang)*rad*1.28,H/2+math.sin(ang)*rad*.88))
        d.polygon(pts,fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(1.3*scale))
    return mask.resize((w,h),Image.Resampling.LANCZOS)

def add_fray(mask, seed):
    rnd=random.Random(seed)
    out=mask.copy(); d=ImageDraw.Draw(out)
    w,h=out.size
    for _ in range(110):
        side=rnd.randrange(4)
        if side<2:
            x=rnd.randint(25,w-25); y=rnd.choice([rnd.randint(18,42),rnd.randint(h-42,h-18)])
        else:
            x=rnd.choice([rnd.randint(18,42),rnd.randint(w-42,w-18)]); y=rnd.randint(25,h-25)
        length=rnd.randint(4,18)
        d.line((x,y,x+rnd.randint(-length,length),y+rnd.randint(-length,length)),fill=rnd.randint(60,155),width=1)
    return out

with MANIFEST.open() as f: manifest=json.load(f)

pieces=[]
for index,source in enumerate(manifest['sources']):
    texture=source_texture(ROOT/source['localFile'])
    stat=ImageStat.Stat(texture.resize((1,1))).mean[:3]
    primary=classify_color(stat)
    material=classify_material(source)
    pattern=classify_pattern(source)
    variants=[SHAPES[(index*2)%len(SHAPES)],SHAPES[(index*2+3)%len(SHAPES)],SHAPES[(index*2+6)%len(SHAPES)]]
    for n,(shape,shape_zh) in enumerate(variants):
        seed=int(hashlib.md5(f"{source['id']}-{shape}".encode()).hexdigest()[:8],16)
        mask=add_fray(shape_mask(shape,texture.size,seed),seed)
        rgba=texture.convert('RGBA');rgba.putalpha(mask)
        bbox=rgba.getbbox();rgba=rgba.crop(bbox)
        canvas=OUT/f"{source['id']}-{shape}.webp"
        rgba.save(canvas,'WEBP',quality=88,method=6)
        thumb=rgba.copy();thumb.thumbnail((280,210),Image.Resampling.LANCZOS)
        thumb.save(THUMBS/f"{source['id']}-{shape}.webp",'WEBP',quality=78,method=6)
        pieces.append({
            'id':f"tex-{source['id']}-{shape}", 'name':f"{source['chineseName']}·{shape_zh}", 'category':'fabric',
            'color':primary, 'colors':[primary], 'shape':shape, 'shapeName':shape_zh, 'pattern':pattern, 'material':material,
            'series':'开放纹理布片', 'width':round(rgba.width*.34), 'height':round(rgba.height*.34),
            'thumbnail':f"/assets/thumbs/{source['id']}-{shape}.webp", 'canvas':f"/assets/fabrics/{source['id']}-{shape}.webp",
            'sourceId':source['id'], 'sourceType':'开放纹理加工', 'author':source['author'], 'sourceUrl':source['originalPage'],
            'license':source['license'], 'licenseUrl':source['licenseUrl'], 'attribution':f"{source['title']} / {source['provider']} / CC0",
            'processing':f"由 {source['localFile']} 裁为{shape_zh}透明 WebP；抗锯齿蒙版、保留纹理、加入轻微纤维毛边。",
            'tags':list(dict.fromkeys([primary,shape_zh,material,pattern,source['chineseName']] + source.get('tags',[])[:6])),
            'edge':'毛边' if shape in ['irregular','wave','petal','leaf'] else '裁边', 'transparent':True,
        })

with (ROOT/'public/assets/texture-pieces.json').open('w') as f:json.dump(pieces,f,ensure_ascii=False,indent=2)
print(f"Processed {manifest['total']} sources into {len(pieces)} transparent WebP pieces.")
