# Rebuilds assets/og-install.jpg. Run from the repo root:
#   python3 _ops/make-og-install.py <grok-photo.jpg> assets/og-install.jpg

import sys, io
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
W, H = 1200, 630
AMBER = (232, 163, 58); WHITE = (255, 255, 255); INK = (10, 10, 10)
F = 'office-leak-repair/fonts/'
cond = lambda s: ImageFont.truetype(F + 'barlow-condensed-800.woff2', s)
semi = lambda s: ImageFont.truetype(F + 'barlow-semi-condensed-600.woff2', s)

# Background: cover-crop to 1200x630, keep the full figure
im = Image.open(src).convert('RGB')
sc = W / im.width
im = im.resize((W, round(im.height * sc)), Image.LANCZOS)
top = 25
im = im.crop((0, top, W, top + H))

# Left-to-right darkening so text reads
grad = Image.new('L', (W, 1))
for x in range(W):
    t = x / 700
    a = 255 if t <= 0.45 else (0 if t >= 1 else int(255 * (1 - (t - 0.45) / 0.55) ** 1.6))
    grad.putpixel((x, 0), a)
im = Image.composite(Image.new('RGB', (W, H), INK), im, grad.resize((W, H)))
d = ImageDraw.Draw(im)

X = 72
def spaced(xy, text, font, fill, track):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + track

# Eyebrow
spaced((X, 78), 'FOR 1-9 PERSON CONSTRUCTION CREWS', semi(21), AMBER, 2.6)

# Headline: size so the widest line fits 560px
lines = [('Every lead you', False), ('miss is', False), ('a job you already', True), ('paid to get.', True)]
size = 68
while max(d.textlength(t, font=cond(size)) for t, _ in lines) > 500: size -= 1
f = cond(size); lh = round(size * 1.04); y = 120
for text, bar in lines:
    if bar:
        w = d.textlength(text, font=f)
        b = d.textbbox((X, y), text, font=f)
        d.rectangle((X - 10, b[1] - 6, X + w + 10, b[3] + 7), fill=AMBER)
        d.text((X, y), text, font=f, fill=INK)
    else:
        d.text((X, y), text, font=f, fill=WHITE)
    y += lh + (10 if bar else 0)

# Offer line
d.text((X, y + 22), 'The 14-Day Front-to-Back Ops Install', font=semi(27), fill=WHITE)

# Logo on a white plate, bottom-left
logo = Image.open('assets/logo.png').convert('RGBA')
lw = 118; logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
px, py, pad = X, H - 44 - logo.height, 8
d.rounded_rectangle((px, py - pad, px + lw + pad * 2, py + logo.height + pad), radius=6, fill=WHITE)
im.paste(logo, (px + pad, py), logo)

for q in (88, 84, 80, 76, 72):
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    if buf.tell() < 300_000: break
open(out, 'wb').write(buf.getvalue())
print('font', size, 'quality', q, 'bytes', buf.tell(), im.size)
