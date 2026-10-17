#!/usr/bin/env python3
"""
Draw the app icons: a gold cross in a soft glow of light on deep blue.

  python3 scripts/make-icons.py      (needs Pillow)

Writes public/icon-192.png, icon-512.png, icon-maskable-512.png and
apple-touch-icon.png. The maskable icon is full-bleed with the cross inside
the central safe zone, so any launcher shape (circle, squircle) crops cleanly.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'public'
NAVY_TOP, NAVY_BOTTOM = (20, 33, 66), (8, 12, 28)
GOLD, GOLD_LIGHT = (214, 172, 74), (246, 222, 150)


def gradient(size):
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(NAVY_TOP, NAVY_BOTTOM)))
    return img


def cross_mask(size, scale):
    """A Latin cross (long lower arm), centred slightly high, `scale` of the canvas tall."""
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    h = size * scale
    w = h * 0.62
    bar = h * 0.15
    cx, top = size / 2, size / 2 - h * 0.5
    beam_y = top + h * 0.28
    r = bar * 0.18
    d.rounded_rectangle([cx - bar / 2, top, cx + bar / 2, top + h], radius=r, fill=255)
    d.rounded_rectangle([cx - w / 2, beam_y, cx + w / 2, beam_y + bar], radius=r, fill=255)
    return m, (cx, beam_y + bar / 2)


def draw(size, scale, rounded):
    S = size * 4  # supersample for smooth edges
    img = gradient(S).convert('RGBA')

    # Light behind the cross.
    mask, (gx, gy) = cross_mask(S, scale)
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(24, 0, -1):
        rad = S * scale * 0.62 * i / 24
        a = round(70 * (1 - i / 24) ** 1.6)
        gd.ellipse([gx - rad, gy - rad, gx + rad, gy + rad], fill=(255, 214, 120, a))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(S * 0.02)))

    # The cross: a vertical gold gradient with a faint halo.
    halo = Image.new('RGBA', (S, S), (255, 226, 150, 0))
    halo.putalpha(mask.filter(ImageFilter.GaussianBlur(S * 0.012)).point(lambda v: v * 0.55))
    img = Image.alpha_composite(img, halo)
    gold = Image.new('RGBA', (S, S))
    gdraw = ImageDraw.Draw(gold)
    for y in range(S):
        t = min(1, max(0, (y - S * 0.15) / (S * 0.7)))
        gdraw.line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(GOLD_LIGHT, GOLD)) + (255,))
    gold.putalpha(mask)
    img = Image.alpha_composite(img, gold)

    if rounded:
        corner = Image.new('L', (S, S), 0)
        ImageDraw.Draw(corner).rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.22, fill=255)
        img.putalpha(corner)
    return img.resize((size, size), Image.LANCZOS)


draw(512, 0.62, True).save(OUT / 'icon-512.png')
draw(192, 0.62, True).save(OUT / 'icon-192.png')
draw(512, 0.46, False).save(OUT / 'icon-maskable-512.png')  # inside the 80% safe zone
draw(180, 0.58, False).convert('RGB').save(OUT / 'apple-touch-icon.png')  # iOS adds its own corners
print('icons written to', OUT)
