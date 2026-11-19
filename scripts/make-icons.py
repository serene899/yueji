#!/usr/bin/env python3
"""生成阅迹 PWA 图标：暖纸底 + 朱砂印章方块 + 白色「阅」字（Noto Serif CJK）。"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
PAPER = (247, 242, 233)
CINNABAR = (168, 62, 33)


def draw(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new('RGB', (size, size), PAPER)
    d = ImageDraw.Draw(img)
    # 印章方块：maskable 留更多安全边距
    m = int(size * (0.20 if maskable else 0.13))
    r = int(size * 0.16)
    d.rounded_rectangle([m, m, size - m, size - m], radius=r, fill=CINNABAR)
    font = ImageFont.truetype(FONT, int(size * 0.44))
    d.text((size / 2, size / 2), '阅', font=font, fill=(255, 250, 240), anchor='mm')
    return img


draw(192).save(OUT / 'icon-192.png')
draw(512).save(OUT / 'icon-512.png')
draw(512, maskable=True).save(OUT / 'icon-maskable-512.png')
draw(180).save(OUT / 'apple-touch-icon.png')
draw(192).save(OUT.parent / 'favicon.png')
print('icons written to', OUT)
