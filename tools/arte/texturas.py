"""
Texturas pintadas a mano (estilo cartoon) para PixelSoft. Todas son
repetibles (tileables) y casi todas neutras/claras: el juego las multiplica
por el color de cada material, asi una sola textura de yeso sirve para
fachadas de cualquier color.

    python3 tools/arte/texturas.py godot/assets/texturas

Genera <nombre>.png (512x512, color) y <nombre>_n.png (mapa de normales,
solo en Alto/Ultra). En movil el juego las reduce a 256 al cargarlas.
Sin dependencias raras: numpy + Pillow. Todo original (sin fotos).
"""
import sys, os
import numpy as np
from PIL import Image

N = 512
OUT = sys.argv[1] if len(sys.argv) > 1 else 'texturas'
os.makedirs(OUT, exist_ok=True)
R = np.random.default_rng(2026)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

def ruido(escala, sx=1.0, sy=1.0, seed=None):
    """Ruido suave periodico (FFT): 'escala' = tamano de la mancha en px."""
    r = np.random.default_rng(seed) if seed is not None else R
    w = r.standard_normal((N, N))
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f * sx, f * sy)
    k = np.exp(-((fx ** 2 + fy ** 2) * (escala ** 2)) * 2.0)
    n = np.real(np.fft.ifft2(np.fft.fft2(w) * k))
    n -= n.min(); n /= max(n.max(), 1e-6)
    return n * 2 - 1

def pincel(fuerza=0.04):
    """Trazos de pincel: ruido alargado en diagonal suave + manchas."""
    return ruido(40, 0.35, 1.6) * fuerza + ruido(90) * fuerza * 0.8

def guardar(nombre, rgb, alto=None, fuerza_normal=2.0):
    rgb = np.clip(rgb, 0, 1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, nombre + '.png'), optimize=True)
    if alto is not None:
        gx = (np.roll(alto, -1, 1) - np.roll(alto, 1, 1)) * fuerza_normal
        gy = (np.roll(alto, -1, 0) - np.roll(alto, 1, 0)) * fuerza_normal
        nz = np.ones_like(alto)
        l = np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
        # Convencion OpenGL (Y+), la que usa Godot
        nrm = np.stack([-gx / l, gy / l, nz / l], -1) * 0.5 + 0.5
        Image.fromarray((nrm * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, nombre + '_n.png'), optimize=True)
    print('->', nombre)

def gris(v):
    return np.repeat(v[..., None], 3, -1)

def bisel(d, ancho):
    """0 en el borde de la pieza, 1 en el interior, con rampa suave."""
    return np.clip(d / ancho, 0, 1)

# ---------------------------------------------------------------- yeso
def yeso():
    v = 0.93 + pincel(0.035) + ruido(6) * 0.012
    manchas = np.clip(ruido(120, seed=3), 0.55, 1) - 0.55
    v -= manchas * 0.12
    guardar('yeso', gris(v), alto=ruido(5) * 0.6 + ruido(30) * 0.6, fuerza_normal=0.8)

# ------------------------------------------------------------ ladrillo
def ladrillo():
    filas, cols = 8, 4
    h, w = N / filas, N / cols
    fila = (yy // h).astype(int)
    off = (fila % 2) * w / 2
    col = (((xx + off) // w).astype(int)) % cols
    lx = (xx + off) % w; ly = yy % h
    junta = 7
    d = np.minimum.reduce([lx, w - lx, ly, h - ly]) - junta / 2
    dentro = d > 0
    # color por ladrillo
    ids = fila * 31 + col * 7
    tono = np.array([R.uniform(-0.07, 0.07) for _ in range(400)])[ids % 400]
    base = np.stack([0.74 + tono, 0.38 + tono * 0.6, 0.29 + tono * 0.4], -1)
    b = bisel(d, 7)
    luz = np.where((ly < h * 0.35) & dentro, 0.06, 0) * (1 - b) * 2  # canto de arriba claro
    som = np.where((ly > h * 0.65) & dentro, -0.09, 0) * (1 - b) * 2  # canto de abajo oscuro
    ladr = base * (1 + pincel(0.06)[..., None]) + (luz + som)[..., None]
    mortero = gris(0.80 + ruido(4) * 0.03)
    rgb = np.where(dentro[..., None], ladr, mortero)
    alto = np.where(dentro, 0.6 + 0.4 * b, 0) + ruido(4) * 0.1
    guardar('ladrillo', rgb, alto=alto, fuerza_normal=3.0)

# --------------------------------------------------------------- madera
def madera(nombre='madera', tablas=4, parquet=False):
    h = N / tablas
    fila = (yy // h).astype(int)
    largo = N if not parquet else N / 2
    off = (fila % 2) * largo / 2 if parquet else (fila * 173) % N
    lx = (xx + off) % largo; ly = yy % h
    d = np.minimum.reduce([ly, h - ly] + ([lx, largo - lx] if parquet else []))
    junta = d < 3
    veta = np.sin((yy + ruido(70, 0.3, 2.5, seed=5) * 28) * (2 * np.pi / 13.0)) * 0.5 + 0.5
    nudo = np.zeros_like(xx)
    for _ in range(6):
        cx, cy = R.uniform(0, N), R.uniform(0, N)
        dd = np.sqrt(((xx - cx + N / 2) % N - N / 2) ** 2 / 3 + ((yy - cy + N / 2) % N - N / 2) ** 2)
        nudo += np.exp(-dd / 5) * 0.5
    tono = np.array([R.uniform(-0.06, 0.06) for _ in range(64)])[(fila * 5 + ((xx + off) // largo).astype(int)) % 64]
    v = 0.86 + veta * 0.09 + tono + pincel(0.03) - nudo * 0.25
    v = v - np.exp(-d / 4) * 0.12
    rgb = np.stack([v, v * 0.93, v * 0.84], -1)  # madera neutra calida, se tine
    rgb = np.where(junta[..., None], rgb * 0.55, rgb)
    alto = np.where(junta, 0, 0.7) + veta * 0.15
    guardar(nombre, rgb, alto=alto, fuerza_normal=2.0)

# ----------------------------------------------------------------- tejas
def tejas():
    filas, cols = 8, 6
    h, w = N / filas, N / cols
    fila = (yy // h).astype(int)
    off = (fila % 2) * w / 2
    lx = (xx + off) % w / w - 0.5; ly = (yy % h) / h
    # teja redondeada por abajo (escama)
    borde = 0.62 + 0.38 * np.sqrt(np.clip(1 - (2 * lx) ** 2, 0, 1))
    dentro = ly < borde
    sombra = np.clip((ly - borde + 0.25) / 0.25, 0, 1)  # oscurece hacia el borde
    tono = np.array([R.uniform(-0.05, 0.05) for _ in range(300)])[(fila * 13 + (((xx + off) // w).astype(int)) % cols) % 300]
    v = 0.95 + tono + pincel(0.04) - sombra * 0.16 - ly * 0.08
    v = np.where(dentro, v, 0.62)
    v = v - np.exp(-np.abs(np.abs(lx) - 0.5) * w / 2.0) * 0.15  # separacion vertical
    alto = np.where(dentro, 0.5 + ly * 0.5, 0.0)
    guardar('tejas', gris(v), alto=alto, fuerza_normal=3.0)

# ---------------------------------------------------------------- piedra
def piedra(nombre='piedra', celdas=28, gris_base=0.86):
    pts = R.uniform(0, N, (celdas, 2))
    d1 = np.full((N, N), 1e9); d2 = np.full((N, N), 1e9); idc = np.zeros((N, N), int)
    for i, (px, py) in enumerate(pts):
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d = np.sqrt((xx - px - ox) ** 2 + (yy - py - oy) ** 2)
                m = d < d1
                d2 = np.where(m, d1, np.minimum(d2, d))
                idc = np.where(m, i, idc); d1 = np.where(m, d, d1)
    borde = d2 - d1
    tono = R.uniform(-0.08, 0.08, celdas)[idc]
    v = gris_base + tono + pincel(0.05) + ruido(5) * 0.02
    b = bisel(borde - 4, 10)
    v = v * (0.75 + 0.25 * b)
    v = np.where(borde < 4, 0.52, v)
    rgb = np.stack([v * 1.0, v * 0.98, v * 0.95], -1)
    guardar(nombre, rgb, alto=np.where(borde < 4, 0, 0.4 + 0.6 * b), fuerza_normal=2.5)

# --------------------------------------------------------------- baldosa
def baldosa():
    n = 4; t = N / n
    lx = xx % t; ly = yy % t
    d = np.minimum.reduce([lx, t - lx, ly, t - ly])
    junta = d < 4
    ck = ((xx // t + yy // t) % 2) * 0.04
    v = 0.92 - ck + pincel(0.02) + np.clip(1 - d / 10, 0, 1) * -0.04
    brillo = np.exp(-((lx - t * 0.3) ** 2 + (ly - t * 0.3) ** 2) / (t * t * 0.02)) * 0.05
    v = np.where(junta, 0.7, v + brillo)
    guardar('baldosa', gris(v), alto=np.where(junta, 0, 0.8), fuerza_normal=2.0)

# ---------------------------------------------------------------- cesped
def cesped():
    v = ruido(60) * 0.06 + ruido(8) * 0.05
    briznas = np.clip(ruido(2.0, 3.0, 0.5, seed=9), 0.3, 1) - 0.3
    g = 0.88 + v + briznas * 0.18
    rgb = np.stack([g * 0.92, g, g * 0.82], -1)
    guardar('cesped', rgb)

def asfalto():
    v = 0.9 + ruido(3) * 0.05 + ruido(50) * 0.04 + (R.random((N, N)) > 0.985) * 0.08
    guardar('asfalto', gris(v), alto=ruido(2) * 0.3, fuerza_normal=0.8)

def tela():
    t = np.sin(xx * 2 * np.pi / 6) * np.sin(yy * 2 * np.pi / 6)
    v = 0.92 + t * 0.03 + pincel(0.03)
    guardar('tela', gris(v), alto=t * 0.3, fuerza_normal=1.0)

def liso():
    """Grano muy suave para los objetos de color (muebles, valla...)."""
    guardar('liso', gris(0.95 + pincel(0.03) + ruido(4) * 0.01))

def hormigon():
    """Placas de hormigon con juntas y agujeritos del encofrado."""
    t = N / 2
    lx = xx % t; ly = yy % t
    d = np.minimum.reduce([lx, t - lx, ly, t - ly])
    v = 0.9 + ruido(25) * 0.04 + ruido(3) * 0.02 + pincel(0.02)
    hueco = np.minimum((lx - t / 6) % (t / 3), 0) + 0
    ag = (np.hypot((lx % (t / 3)) - t / 6, (ly % (t / 3)) - t / 6) < 3)
    v = np.where(d < 2.5, 0.68, v - ag * 0.12)
    guardar('hormigon', gris(v), alto=np.where(d < 2.5, 0, 0.7) - ag * 0.3, fuerza_normal=1.5)

def cristal():
    g = 1 - yy / N
    v = 0.78 + g * 0.22
    reflejo = (np.abs(((xx + yy) % N) - N * 0.35) < 26) * 0.18 + (np.abs(((xx + yy) % N) - N * 0.5) < 9) * 0.14
    r = v + reflejo
    rgb = np.stack([r * 0.92, r * 0.97, r], -1)
    guardar('cristal', rgb)

yeso(); ladrillo(); madera(); madera('parquet', 8, parquet=True); tejas(); piedra(); baldosa()
cesped(); asfalto(); tela(); liso(); cristal(); hormigon()
