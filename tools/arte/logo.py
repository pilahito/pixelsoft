"""Genera el logo de PixelSoft: gema verde (estilo plumbob) con una P pixelada.

Salidas (python3 tools/arte/logo.py, solo necesita Pillow):
  godot/assets/logo/logo.svg            vectorial (fuente)
  godot/assets/logo/logo_1024.png       logo grande (menu, README)
  godot/icono.png (256)                 icono del proyecto Godot
  godot/icono.ico                       icono del .exe (16..256)
  godot/assets/logo/android_*.png       iconos de Android (192 + adaptativos 432)
  PixelSoft.png / PixelSoft.ico         copia en la raiz
"""
import os
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
G = os.path.join(RAIZ, "godot")
OUT = os.path.join(G, "assets", "logo")
os.makedirs(OUT, exist_ok=True)

S = 1024
FONDO_A, FONDO_B = (24, 44, 74), (9, 16, 32)       # azul noche
GLOW = (61, 220, 132)
# Gema: punta arriba, cintura algo alta, punta abajo mas larga (plumbob)
T, L, R, B, M = (512, 96), (250, 420), (774, 420), (512, 936), (566, 420)
CARAS = [((T, L, M), (150, 246, 170)), ((T, M, R), (70, 214, 120)),
         ((L, M, B), (44, 182, 96)), ((M, R, B), (22, 132, 68))]
BORDE = (6, 52, 30)
# P pixelada (rejilla 6x7, trazo de 2 pixeles)
P = ["#####.", "######", "##..##", "######", "#####.", "##....", "##...."]
CEL = 44


def hex_(c):
    return "#%02x%02x%02x" % c


def p_celdas(cx=500, cy=480, cel=CEL):
    x0, y0 = cx - len(P[0]) * cel / 2, cy - 7 * cel / 2
    return [(x0 + i * cel, y0 + j * cel, cel) for j, f in enumerate(P) for i, ch in enumerate(f) if ch == "#"]


def gradiente(size, a, b):
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        g.putpixel((0, y), tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3)))
    return g.resize((size, size))


def gema(size=S, con_p=True, escala=1.0, sombra=True):
    """Gema (y P) en RGBA transparente. escala<1 la encoge hacia el centro."""
    k = 4  # supermuestreo
    W = size * k
    im = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    f = W / S

    def tr(p):
        return ((512 + (p[0] - 512) * escala) * f, (516 + (p[1] - 516) * escala) * f)

    if sombra:
        sh = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        ImageDraw.Draw(sh).polygon([tr((p[0], p[1] + 26)) for p in (T, R, B, L)], fill=(0, 0, 0, 110))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28 * f)))
    d = ImageDraw.Draw(im)
    d.polygon([tr(p) for p in (T, R, B, L)], fill=BORDE)
    # Caras ligeramente encogidas para dejar ver un borde oscuro fino
    for pts, col in CARAS:
        cx = sum(p[0] for p in pts) / 3; cy = sum(p[1] for p in pts) / 3
        sp = [(cx + (p[0] - cx) * 0.97, cy + (p[1] - cy) * 0.97) for p in pts]
        d.polygon([tr(p) for p in sp], fill=col)
    # Brillo en la cara superior izquierda
    d.polygon([tr(p) for p in ((512, 150), (330, 400), (420, 400))], fill=(220, 255, 228))
    if con_p:
        for x, y, c in p_celdas():
            d.rectangle([*tr((x + 10, y + 12)), *tr((x + c + 10, y + c + 12))], fill=(4, 60, 32, 150))
        for x, y, c in p_celdas():
            d.rectangle([*tr((x, y)), *tr((x + c, y + c))], fill=(255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def fondo(size, radio=0.22, completo=False):
    g = gradiente(size, FONDO_A, FONDO_B).convert("RGBA")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    r = size * 0.36
    ImageDraw.Draw(glow).ellipse([size / 2 - r, size * 0.5 - r, size / 2 + r, size * 0.5 + r], fill=GLOW + (90,))
    g.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.12)))
    if completo:
        return g
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * radio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(g, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


def icono(size, con_p=True):
    im = fondo(size)
    im.alpha_composite(gema(size, con_p=con_p, escala=0.86))
    return im


def svg():
    def pts(ps):
        return " ".join("%g,%g" % (512 + (x - 512) * 0.86, 516 + (y - 516) * 0.86) for x, y in ps)
    caras = "\n".join('    <polygon points="%s" fill="%s"/>' % (pts(p), hex_(c)) for p, c in CARAS)
    cel = "\n".join('    <rect x="%g" y="%g" width="%g" height="%g" fill="#ffffff"/>' % (
        512 + (x - 512) * 0.86, 516 + (y - 516) * 0.86, c * 0.86, c * 0.86) for x, y, c in p_celdas())
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{hex_(FONDO_A)}"/><stop offset="1" stop-color="{hex_(FONDO_B)}"/>
    </linearGradient>
    <radialGradient id="g" cx="0.5" cy="0.5" r="0.45">
      <stop offset="0" stop-color="{hex_(GLOW)}" stop-opacity="0.35"/><stop offset="1" stop-color="{hex_(GLOW)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="225" fill="url(#f)"/>
  <rect width="1024" height="1024" rx="225" fill="url(#g)"/>
  <polygon points="{pts((T, R, B, L))}" fill="{hex_(BORDE)}"/>
  <g>
{caras}
    <polygon points="{pts(((512, 150), (330, 400), (420, 400)))}" fill="#dcffe4"/>
  </g>
  <g>
{cel}
  </g>
</svg>
'''


if __name__ == "__main__":
    open(os.path.join(OUT, "logo.svg"), "w").write(svg())
    big = icono(1024); big.save(os.path.join(OUT, "logo_1024.png"))
    gema(512, escala=1.0).save(os.path.join(OUT, "gema_512.png"))
    i256 = icono(256); i256.save(os.path.join(G, "icono.png")); i256.save(os.path.join(RAIZ, "PixelSoft.png"))
    # ICO: a 16/24 px sin la P (solo la gema) para que se lea
    tam = [16, 24, 32, 48, 64, 128, 256]
    imgs = [icono(t, con_p=t >= 32) for t in tam]
    for ruta in (os.path.join(G, "icono.ico"), os.path.join(RAIZ, "PixelSoft.ico")):
        imgs[-1].save(ruta, format="ICO", sizes=[(t, t) for t in tam], append_images=imgs[:-1])
    # Android
    icono(192).save(os.path.join(OUT, "android_192.png"))
    fondo(432, completo=True).convert("RGB").save(os.path.join(OUT, "android_fondo_432.png"))
    gema(432, escala=0.62, sombra=False).save(os.path.join(OUT, "android_frente_432.png"))
    mono = gema(432, escala=0.62, sombra=False).split()[3]
    Image.merge("RGBA", (Image.new("L", (432, 432), 255),) * 3 + (mono,)).save(os.path.join(OUT, "android_mono_432.png"))
    # Hoja de prueba de tamanos
    hoja = Image.new("RGBA", (16 + 24 + 32 + 48 + 64 + 128 + 256 + 8 * 20, 296), (40, 40, 46, 255))
    x = 20
    for t, im in zip(tam, imgs):
        hoja.alpha_composite(im, (x, 276 - t)); x += t + 20
    hoja.save(os.path.join(RAIZ, "capturas", "logo_tamanos.png"))
    print("ok")


def splash():
    """Pantalla de arranque 1920x1080: logo + nombre con Nunito."""
    from PIL import ImageFont
    W, H = 1920, 1080
    im = Image.new("RGBA", (W, H), (9, 16, 32, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W / 2 - 320, 380 - 320, W / 2 + 320, 380 + 320], fill=GLOW + (60,))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    im.alpha_composite(gema(520, escala=1.0), (W // 2 - 260, 120))
    f = ImageFont.truetype(os.path.join(G, "assets", "fuentes", "Nunito.ttf"), 120)
    try:
        f.set_variation_by_axes([900])
    except Exception:
        pass
    d = ImageDraw.Draw(im)
    d.text((W / 2, 760), "PixelSoft", font=f, fill=(240, 246, 255), anchor="ma")
    im.convert("RGB").save(os.path.join(OUT, "splash.png"))


if __name__ == "__main__":
    splash()
