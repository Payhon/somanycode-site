#!/usr/bin/env python3
"""Generate logo and favicon assets for somanycode.com using Pillow."""

from PIL import Image, ImageDraw, ImageFont
import math
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public")

# Color palette
BG_TOP = (26, 26, 46)       # #1a1a2e
BG_BOTTOM = (22, 33, 62)    # #16213e
ACCENT_1 = (0, 212, 255)    # #00d4ff
ACCENT_2 = (0, 180, 216)    # #00b4d8
ACCENT_3 = (0, 119, 182)    # #0077b6
ACCENT_4 = (2, 62, 138)     # #023e8a
GLOW = (0, 212, 255, 80)

def rounded_rectangle(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    r = radius
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def draw_logo(size=512, bg=True):
    """Draw the main logo icon."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if not bg else BG_TOP)
    draw = ImageDraw.Draw(img)

    if bg:
        # Draw gradient background (simulate with vertical bands)
        for y in range(size):
            ratio = y / size
            r = int(BG_TOP[0] * (1 - ratio) + BG_BOTTOM[0] * ratio)
            g = int(BG_TOP[1] * (1 - ratio) + BG_BOTTOM[1] * ratio)
            b = int(BG_TOP[2] * (1 - ratio) + BG_BOTTOM[2] * ratio)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Logo design: 4 code blocks arranged in a staggered pattern
    # Represents "many codes" - multiple code blocks
    block_size = int(size * 0.18)
    gap = int(size * 0.06)
    corner_radius = int(block_size * 0.25)
    center_x = size // 2
    center_y = size // 2

    # Calculate positions for 4 blocks in a 2x2 staggered layout
    # Top-left, Top-right (lower), Bottom-left (higher), Bottom-right
    offsets = [
        (-1, -1.3),   # top-left, raised
        (0.3, -0.5),  # top-right, middle
        (-0.3, 0.5),  # bottom-left, middle
        (1, 1.3),     # bottom-right, lowered
    ]
    colors = [ACCENT_1, ACCENT_2, ACCENT_3, ACCENT_4]

    for (ox, oy), color in zip(offsets, colors):
        x = center_x + int(ox * (block_size + gap)) - block_size // 2
        y = center_y + int(oy * (block_size + gap)) - block_size // 2

        # Draw glow/shadow behind block
        glow_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_img)
        glow_draw.rounded_rectangle(
            [x - 4, y - 4, x + block_size + 4, y + block_size + 4],
            radius=corner_radius + 2,
            fill=(*color, 40)
        )
        img = Image.alpha_composite(img, glow_img)
        draw = ImageDraw.Draw(img)

        # Draw block
        draw.rounded_rectangle(
            [x, y, x + block_size, y + block_size],
            radius=corner_radius,
            fill=color
        )

        # Draw inner code symbol on each block
        symbol_size = int(block_size * 0.5)
        if ox < 0 and oy < 0:
            # < symbol
            sx, sy = x + block_size // 2, y + block_size // 2
            draw.polygon([
                (sx + symbol_size//3, sy - symbol_size//2),
                (sx - symbol_size//3, sy),
                (sx + symbol_size//3, sy + symbol_size//2),
            ], fill=(255, 255, 255, 180))
        elif ox > 0 and oy > 0:
            # > symbol
            sx, sy = x + block_size // 2, y + block_size // 2
            draw.polygon([
                (sx - symbol_size//3, sy - symbol_size//2),
                (sx + symbol_size//3, sy),
                (sx - symbol_size//3, sy + symbol_size//2),
            ], fill=(255, 255, 255, 180))
        elif ox < 0 and oy > 0:
            # / symbol
            sx, sy = x + block_size // 2, y + block_size // 2
            w = symbol_size // 6
            h = symbol_size
            draw.polygon([
                (sx + w, sy - h//2),
                (sx - w, sy - h//2),
                (sx - w, sy + h//2),
                (sx + w, sy + h//2),
            ], fill=(255, 255, 255, 180))
        else:
            # · symbol (dot)
            sx, sy = x + block_size // 2, y + block_size // 2
            r = symbol_size // 5
            draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 255, 255, 180))

    return img


def draw_text_logo(size=512):
    """Draw logo with text '多码网' below icon."""
    icon_size = int(size * 0.55)
    icon = draw_logo(icon_size, bg=True)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Paste icon at top-center
    icon_x = (size - icon_size) // 2
    icon_y = int(size * 0.05)
    img.paste(icon, (icon_x, icon_y), icon)

    # Try to use a nice font, fallback to default
    text = "多码网"
    text_color = (255, 255, 255, 255)
    font_size = int(size * 0.18)

    # Try system fonts
    font_paths = [
        "/System/Library/Fonts/PingFang.ttc",  # macOS Chinese
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",  # Linux
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    ]

    font = None
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                pass

    if font is None:
        font = ImageFont.load_default()

    # Draw text
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (size - text_w) // 2
    text_y = icon_y + icon_size + int(size * 0.08)

    draw.text((text_x, text_y), text, font=font, fill=text_color)

    return img


def generate_favicon(source_img, sizes=[16, 32, 48, 64, 128, 180]):
    """Generate favicon in multiple sizes."""
    results = {}
    for s in sizes:
        favicon = source_img.resize((s, s), Image.LANCZOS)
        results[s] = favicon
    return results


def generate_svg_logo():
    """Generate an SVG version of the logo for crisp rendering."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" ry="96" fill="url(#bg)"/>

  <!-- Block 1: top-left, cyan -->
  <rect x="130" y="110" width="92" height="92" rx="23" ry="23" fill="#00d4ff" opacity="0.95"/>
  <polygon points="170,145 170,167 152,156" fill="white" opacity="0.7"/>

  <!-- Block 2: top-right, blue -->
  <rect x="250" y="150" width="92" height="92" rx="23" ry="23" fill="#00b4d8" opacity="0.95"/>
  <circle cx="296" cy="196" r="12" fill="white" opacity="0.7"/>

  <!-- Block 3: bottom-left, darker blue -->
  <rect x="170" y="230" width="92" height="92" rx="23" ry="23" fill="#0077b6" opacity="0.95"/>
  <polygon points="230,265 230,287 212,276" fill="white" opacity="0.7" transform="rotate(90 221 276)"/>

  <!-- Block 4: bottom-right, deepest blue -->
  <rect x="290" y="270" width="92" height="92" rx="23" ry="23" fill="#023e8a" opacity="0.95"/>
  <polygon points="330,305 330,327 348,316" fill="white" opacity="0.7"/>
</svg>'''
    return svg


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Generating logo assets...")

    # 1. Main logo PNG (512x512)
    logo = draw_logo(512, bg=True)
    logo_path = os.path.join(OUTPUT_DIR, "logo.png")
    logo.save(logo_path, "PNG")
    print(f"  ✓ {logo_path}")

    # 2. Logo with text (512x512)
    logo_text = draw_text_logo(512)
    logo_text_path = os.path.join(OUTPUT_DIR, "logo-text.png")
    logo_text.save(logo_text_path, "PNG")
    print(f"  ✓ {logo_text_path}")

    # 3. Transparent logo (for dark/light modes)
    logo_transparent = draw_logo(512, bg=False)
    logo_transp_path = os.path.join(OUTPUT_DIR, "logo-transparent.png")
    logo_transparent.save(logo_transp_path, "PNG")
    print(f"  ✓ {logo_transp_path}")

    # 4. SVG Logo
    svg = generate_svg_logo()
    svg_path = os.path.join(OUTPUT_DIR, "logo.svg")
    with open(svg_path, "w") as f:
        f.write(svg)
    print(f"  ✓ {svg_path}")

    # 5. Favicon sizes
    favicons = generate_favicon(logo)
    for size, img in favicons.items():
        path = os.path.join(OUTPUT_DIR, f"favicon-{size}x{size}.png")
        img.save(path, "PNG")
        print(f"  ✓ {path}")

    # 6. Apple touch icon
    apple_icon = logo.resize((180, 180), Image.LANCZOS)
    apple_path = os.path.join(OUTPUT_DIR, "apple-touch-icon.png")
    apple_icon.save(apple_path, "PNG")
    print(f"  ✓ {apple_path}")

    # 7. Simple 32x32 favicon
    favicon_32 = favicons[32]
    favicon_path = os.path.join(OUTPUT_DIR, "favicon.ico")
    # Pillow doesn't support ICO directly with alpha well, save as PNG
    favicon_32.save(os.path.join(OUTPUT_DIR, "favicon.png"), "PNG")
    print(f"  ✓ {os.path.join(OUTPUT_DIR, 'favicon.png')}")

    print(f"\nAll assets saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
