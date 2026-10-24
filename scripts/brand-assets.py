"""Rebuild web branding from the original root icon.png (requires Pillow)."""
from pathlib import Path
import base64
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public'
source = Image.open(ROOT / 'icon.png').convert('RGB')
# Discard near-white paper texture; preserve the supplied mark's exact silhouette.
gray = ImageOps.grayscale(source)
bounds = gray.point(lambda p: 255 if p < 100 else 0).getbbox()
if not bounds:
    raise ValueError('No dark logo found in icon.png')
gray = gray.crop(bounds)
alpha = gray.point(lambda p: max(0, min(255, round((240 - p) * 255 / 220))))
mark = Image.new('RGBA', gray.size, (23, 23, 28, 0))
mark.putalpha(alpha)

def tile(size, padding=0.12, background=None, white=False):
    result = Image.new('RGBA', (size, size), background or (0, 0, 0, 0))
    logo = mark.copy()
    if white:
        logo.paste((245, 245, 247), (0, 0, *logo.size), logo.getchannel('A'))
        logo.putalpha(mark.getchannel('A'))
    logo.thumbnail((round(size * (1 - padding * 2)),) * 2, Image.Resampling.LANCZOS)
    result.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return result

# Tight display asset has only a small safety margin; favicon retains clear edges.
tile(256, 0.025).save(OUT / 'logo.png', optimize=True)
tile(256, 0.025, white=True).save(OUT / 'logo-light.png', optimize=True)
for size in (48, 96, 192, 512):
    tile(size, background='white').convert('RGB').save(OUT / f'favicon-{size}.png', optimize=True)
tile(180, background='white').convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)
tile(64, background='white').save(OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
# Keep the previous public icon URL working for cached pages/bookmarks.
encoded = base64.b64encode((OUT / 'favicon-512.png').read_bytes()).decode('ascii')
(OUT / 'favicon.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'
    f'<image width="512" height="512" href="data:image/png;base64,{encoded}"/></svg>\n',
    encoding='utf-8',
)

# Add the actual brand to the existing product preview without replacing its content.
preview = Image.open(OUT / 'typing-animation-generator.png').convert('RGB')
if preview.size != (1200, 630):
    raise ValueError('Expected a 1200x630 product preview')
preview.save(OUT / 'product-preview.png') if not (OUT / 'product-preview.png').exists() else None
preview = Image.open(OUT / 'product-preview.png').convert('RGB')
draw = ImageDraw.Draw(preview)
draw.rectangle((0, 0, 1199, 110), fill=preview.getpixel((10, 10)))
brand = tile(44, 0.025, white=True)
preview.paste(brand, (56, 40), brand)
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 28)
draw.text((114, 41), 'Typing Animation', font=font, fill='#F5F5F7')
preview.save(OUT / 'typing-animation-generator.png', optimize=True)
print(f'Logo bounds: {bounds}; generated display, favicon, touch and sharing assets.')
