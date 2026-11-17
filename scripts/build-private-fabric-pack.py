from __future__ import annotations

import colorsys
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SHEET_DIR = ROOT / "assets/private-source/sheets"
BASE_DIR = ROOT / "assets/private-source/extracted"
OUT_DIR = ROOT / "public/assets/private-fabrics"
THUMB_DIR = ROOT / "public/assets/private-thumbs"
CATALOG_PATH = ROOT / "public/assets/private-texture-pieces.json"

for directory in (BASE_DIR, OUT_DIR, THUMB_DIR):
    directory.mkdir(parents=True, exist_ok=True)


SHAPES = [
    ("square", "方块"),
    ("triangle", "三角"),
    ("oval", "椭圆"),
    ("strip", "条带"),
    ("petal", "花瓣"),
    ("leaf", "叶片"),
    ("arch", "弧形"),
    ("irregular", "不规则"),
    ("wave", "波浪边"),
]


SHEETS = [
    {
        "file": "old-garden.png",
        "slug": "old-garden",
        "series": "旧布花园",
        "grid": (4, 3),
        "items": [
            ("燕麦小花棉", "棉布", "碎花", "米白"),
            ("茜红旧亚麻", "亚麻", "素色", "红粉"),
            ("苔绿方格棉", "棉布", "格纹", "绿色"),
            ("雾蓝水洗棉", "棉布", "素色", "蓝紫"),
            ("深棕植物提花", "提花布", "植物纹", "灰棕"),
            ("旧蓝窄条棉", "棉布", "条纹", "蓝紫"),
            ("雏菊刺绣麻", "亚麻", "刺绣", "米白"),
            ("芥末黄旧麻", "亚麻", "素色", "黄橙"),
            ("水洗靛蓝牛仔", "牛仔", "斜纹", "蓝紫"),
            ("紫花燕麦棉", "棉布", "碎花", "米白"),
            ("灰粉旧棉", "棉布", "素色", "红粉"),
            ("烟灰棕格纹", "棉布", "格纹", "灰棕"),
        ],
    },
    {
        "file": "cottage-checks.png",
        "slug": "cottage-checks",
        "series": "乡居格纹",
        "grid": (3, 4),
        "items": [
            ("奶油红点棉", "棉布", "点点", "米白"),
            ("鼠尾草小花", "棉布", "碎花", "绿色"),
            ("旧蓝细条棉", "棉布", "条纹", "蓝紫"),
            ("陶红方格棉", "棉布", "格纹", "红粉"),
            ("雾蓝窗格麻", "亚麻", "格纹", "米白"),
            ("褪色牛仔棉", "牛仔", "斜纹", "蓝紫"),
            ("茶玫瑰碎花", "棉布", "碎花", "红粉"),
            ("原色粗织麻", "亚麻", "素色", "灰棕"),
            ("旧玫瑰格纹条", "棉布", "格纹", "红粉"),
            ("弯月小花棉", "棉布", "碎花", "米白"),
            ("靛蓝弯格棉", "棉布", "格纹", "蓝紫"),
            ("灰绿枝花棉", "棉布", "碎花", "绿色"),
        ],
    },
    {
        "file": "dusk-botanicals.png",
        "slug": "dusk-botanicals",
        "series": "暮色植物",
        "grid": (4, 3),
        "items": [
            ("夜色繁花棉", "棉布", "植物纹", "黑色"),
            ("旧纸大花棉", "棉布", "植物纹", "灰棕"),
            ("灰雾枝花绣", "亚麻", "刺绣", "灰棕"),
            ("森林古典提花", "提花布", "植物纹", "绿色"),
            ("墨色修补格纹", "棉布", "格纹", "灰棕"),
            ("暮紫补丁亚麻", "亚麻", "修补", "红粉"),
            ("深靛植物印花", "棉布", "植物纹", "蓝紫"),
            ("苔藓毛呢", "毛呢", "素色", "绿色"),
            ("烟灰条纹旧麻", "亚麻", "条纹", "灰棕"),
            ("蔓越莓旧花棉", "棉布", "植物纹", "红粉"),
            ("古董奶油花边", "蕾丝", "镂空花纹", "米白"),
            ("藕紫枝果刺绣", "亚麻", "刺绣", "红粉"),
        ],
    },
    {
        "file": "indigo-sheers.png",
        "slug": "indigo-sheers",
        "series": "靛蓝与薄绡",
        "grid": (4, 3),
        "items": [
            ("手染靛蓝棉", "棉布", "印染", "蓝紫"),
            ("浅洗牛仔", "牛仔", "斜纹", "蓝紫"),
            ("蓝白大方格", "棉布", "格纹", "蓝紫"),
            ("蓝十字原色棉", "棉布", "几何", "米白"),
            ("铁锈红亚麻", "亚麻", "素色", "黄橙"),
            ("粉雾蓝棉", "棉布", "素色", "蓝紫"),
            ("苔绿羊毛毡", "毛毡", "素色", "绿色"),
            ("烟蓝透明薄纱", "欧根纱", "半透明", "蓝紫"),
            ("暖白透明纱", "纱类", "半透明", "米白"),
            ("赭金旧缎", "缎面", "素色", "黄橙"),
            ("原色籽点亚麻", "亚麻", "素色", "米白"),
            ("靛蓝抽象印花", "棉布", "几何", "蓝紫"),
        ],
    },
]


def color_family(rgb: tuple[float, float, float]) -> str:
    r, g, b = rgb
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if v < 0.3:
        return "黑色"
    if s < 0.14 and v > 0.67:
        return "米白"
    if s < 0.2:
        return "灰棕"
    deg = h * 360
    if deg < 28 or deg > 325:
        return "红粉"
    if deg < 76:
        return "黄橙"
    if deg < 175:
        return "绿色"
    if deg < 288:
        return "蓝紫"
    return "红粉"


def clean_rgba(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    solid = Image.new("RGB", image.size, (0, 0, 0))
    solid.paste(image.convert("RGB"), mask=alpha.point(lambda a: 255 if a > 180 else 0))
    stats = ImageStat.Stat(image.convert("RGB"), mask=alpha.point(lambda a: 255 if a > 180 else 0))
    average = tuple(int(v) for v in (stats.mean[:3] or (130, 120, 105)))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 7:
                pixels[x, y] = (*average, 0)
            elif a < 150:
                strength = (150 - a) / 190
                pixels[x, y] = (
                    int(r * (1 - strength) + average[0] * strength),
                    int(g * (1 - strength) + average[1] * strength),
                    int(b * (1 - strength) + average[2] * strength),
                    a,
                )
    return image


def extract_cell(sheet: Image.Image, columns: int, rows: int, index: int, sheer: bool) -> Image.Image:
    column = index % columns
    row = index // columns
    x0 = round(sheet.width * column / columns)
    x1 = round(sheet.width * (column + 1) / columns)
    y0 = round(sheet.height * row / rows)
    y1 = round(sheet.height * (row + 1) / rows)
    cell = sheet.crop((x0, y0, x1, y1))
    alpha = cell.getchannel("A")
    threshold = 8 if sheer else 24
    bbox = alpha.point(lambda a: 255 if a > threshold else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"No visible fabric in cell {index + 1}")
    left, top, right, bottom = bbox
    pad = 7
    crop = cell.crop((max(0, left - pad), max(0, top - pad), min(cell.width, right + pad), min(cell.height, bottom + pad)))
    return clean_rgba(crop)


def shape_mask(name: str, size: tuple[int, int], seed: int) -> Image.Image:
    scale = 4
    width, height = size
    w, h = width * scale, height * scale
    margin = 25 * scale
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    if name == "square":
        draw.rounded_rectangle((margin, margin, w - margin, h - margin), radius=10 * scale, fill=255)
    elif name == "triangle":
        draw.polygon([(w * 0.5, margin), (w - margin, h - margin), (margin, h - margin)], fill=255)
    elif name == "oval":
        draw.ellipse((margin, margin, w - margin, h - margin), fill=255)
    elif name == "strip":
        draw.rounded_rectangle((margin, h * 0.33, w - margin, h * 0.67), radius=11 * scale, fill=255)
    elif name in ("petal", "leaf"):
        start = (margin, h * 0.52)
        tip = (w - margin, h * 0.5)
        upper_height = h * (0.08 if name == "petal" else 0.16)
        lower_height = h * (0.92 if name == "petal" else 0.84)

        def cubic(p0, p1, p2, p3, t):
            u = 1 - t
            return (
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            )

        points = [cubic(start, (w * 0.28, upper_height), (w * 0.70, upper_height), tip, step / 24) for step in range(25)]
        points += [cubic(tip, (w * 0.70, lower_height), (w * 0.28, lower_height), start, step / 24) for step in range(1, 25)]
        draw.polygon(points, fill=255)
    elif name == "arch":
        draw.pieslice((margin, margin, w - margin, h * 1.66), 180, 360, fill=255)
        draw.rectangle((margin, h * 0.47, w - margin, h - margin), fill=255)
    elif name == "wave":
        points = [(margin, h * 0.3)]
        for step in range(9):
            x = margin + (w - 2 * margin) * step / 8
            points.append((x, h * (0.24 if step % 2 == 0 else 0.35)))
        points.append((w - margin, h * 0.72))
        for step in range(8, -1, -1):
            x = margin + (w - 2 * margin) * step / 8
            points.append((x, h * (0.76 if step % 2 == 0 else 0.65)))
        draw.polygon(points, fill=255)
    else:
        rng = random.Random(seed)
        points = []
        for step in range(18):
            angle = math.tau * step / 18
            radius = (0.39 + rng.uniform(-0.07, 0.055)) * min(w, h)
            points.append((w / 2 + math.cos(angle) * radius * 1.28, h / 2 + math.sin(angle) * radius * 0.88))
        draw.polygon(points, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.7 * scale))
    return mask.resize((width, height), Image.Resampling.LANCZOS)


def fray(mask: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed)
    output = mask.copy()
    draw = ImageDraw.Draw(output)
    width, height = output.size
    for _ in range(170):
        side = rng.randrange(4)
        if side < 2:
            x = rng.randint(22, width - 22)
            y = rng.choice([rng.randint(15, 38), rng.randint(height - 38, height - 15)])
        else:
            x = rng.choice([rng.randint(15, 38), rng.randint(width - 38, width - 15)])
            y = rng.randint(22, height - 22)
        length = rng.randint(3, 18)
        draw.line((x, y, x + rng.randint(-length, length), y + rng.randint(-length, length)), fill=rng.randint(55, 170), width=1)
    return output


def secondary_colors(image: Image.Image, primary: str) -> list[str]:
    thumb = image.convert("RGB").resize((36, 36))
    colors = thumb.quantize(colors=5).convert("RGB").getcolors(36 * 36) or []
    families = [primary]
    for _, rgb in sorted(colors, reverse=True):
        family = color_family(rgb)
        if family not in families:
            families.append(family)
        if len(families) == 3:
            break
    return families


pieces: list[dict] = []
source_records: list[dict] = []

for sheet_spec in SHEETS:
    sheet_path = SHEET_DIR / sheet_spec["file"]
    sheet = Image.open(sheet_path).convert("RGBA")
    columns, rows = sheet_spec["grid"]
    for index, (name, material, pattern, expected_color) in enumerate(sheet_spec["items"]):
        sheer = pattern == "半透明"
        source_id = f"private-{sheet_spec['slug']}-{index + 1:02d}"
        base = extract_cell(sheet, columns, rows, index, sheer)
        base_path = BASE_DIR / f"{source_id}.png"
        base.save(base_path, "PNG", optimize=True)
        source_records.append(
            {
                "id": source_id,
                "name": name,
                "series": sheet_spec["series"],
                "material": material,
                "pattern": pattern,
                "sourceSheet": f"assets/private-source/sheets/{sheet_spec['file']}",
                "extractedFile": str(base_path.relative_to(ROOT)),
                "sourceType": "生成素材",
                "usage": "私人本地学习素材包；发布前需重新审查",
            }
        )
        opaque_mask = base.getchannel("A").point(lambda a: 255 if a > 80 else 0)
        mean = ImageStat.Stat(base.convert("RGB"), mask=opaque_mask).mean[:3]
        detected_color = color_family(tuple(mean))
        primary_color = expected_color or detected_color
        colors = secondary_colors(base, primary_color)

        for shape, shape_name in SHAPES:
            seed = int(hashlib.sha256(f"{source_id}-{shape}".encode()).hexdigest()[:8], 16)
            canvas_size = (560, 420)
            texture = ImageOps.fit(base, canvas_size, method=Image.Resampling.LANCZOS)
            mask = fray(shape_mask(shape, canvas_size, seed), seed)
            alpha = ImageChops.multiply(texture.getchannel("A"), mask)
            if sheer:
                alpha = alpha.point(lambda a: min(190, int(a * 0.78)))
            texture.putalpha(alpha)
            bbox = texture.getbbox()
            if not bbox:
                continue
            texture = texture.crop(bbox)
            filename = f"{source_id}-{shape}.webp"
            texture.save(OUT_DIR / filename, "WEBP", quality=88, method=2)
            thumb = texture.copy()
            thumb.thumbnail((250, 188), Image.Resampling.LANCZOS)
            thumb.save(THUMB_DIR / filename, "WEBP", quality=80, method=1)
            pieces.append(
                {
                    "id": f"{source_id}-{shape}",
                    "name": f"{name}·{shape_name}",
                    "category": "fabric",
                    "color": primary_color,
                    "colors": colors,
                    "shape": shape,
                    "shapeName": shape_name,
                    "pattern": pattern,
                    "material": material,
                    "series": sheet_spec["series"],
                    "width": round(texture.width * 0.36),
                    "height": round(texture.height * 0.36),
                    "thumbnail": f"/assets/private-thumbs/{filename}",
                    "canvas": f"/assets/private-fabrics/{filename}",
                    "sourceId": source_id,
                    "sourceType": "生成素材",
                    "author": "拼布项目 · 图像生成",
                    "sourceUrl": "",
                    "license": "私人学习使用",
                    "attribution": "根据用户参考提炼气质后生成的原创布料纹理",
                    "processing": f"从生成素材表 {sheet_spec['file']} 分离、去除透明底杂色，裁为{shape_name}并输出透明 WebP。",
                    "tags": list(dict.fromkeys([name, sheet_spec["series"], material, pattern, primary_color, *colors, shape_name, "旧布", "手作", "毛边"])),
                    "edge": "毛边",
                    "transparent": True,
                }
            )

CATALOG_PATH.write_text(json.dumps(pieces, ensure_ascii=False, indent=2), encoding="utf-8")
(ROOT / "assets/private-source/manifest.json").write_text(
    json.dumps(
        {
            "version": 1,
            "scope": "私人本地学习素材包，不随当前公开站点发布",
            "baseSources": len(source_records),
            "generatedPieces": len(pieces),
            "sources": source_records,
        },
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)

print(f"Built {len(pieces)} pieces from {len(source_records)} generated base swatches.")
