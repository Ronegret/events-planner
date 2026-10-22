"""
Events Planner · generador de marca e imágenes
----------------------------------------------
Parte de la carpeta con el material original (fotos generadas, logo dentro de
una imagen) y produce todo lo que la aplicación publica:

  assets/brand/   logo y monograma con transparencia (tinta y blanco)
  assets/icons/   iconos de la app (pantalla de inicio, favicon, maskable)
  assets/fotos/   las 15 fotos de espacios, recortadas y optimizadas
  src/data/contrato-imagenes.js   imágenes del contrato impreso (incrustadas)

Uso:  python scripts/construir-marca.py "<carpeta con el material>"

Por qué un script y no a mano: son ~30 archivos que dependen unos de otros
(el logo sale de una foto, los iconos salen del logo, el contrato lleva
copias de ambos). Si cambia el logo, se rehace todo de una vez y no queda
nada a medias.
"""
import base64, io, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ORIGEN = Path(sys.argv[1])
RAIZ = Path(__file__).resolve().parent.parent
TINTA = (32, 35, 13)           # el verde-negro del propio logo, medido en la imagen
MUSGO = (47, 58, 36)           # fondo de los iconos de la app
ETIQUETA_X = 146               # ancho de la mini-etiqueta del logo pegada en la esquina

def foto(n):
    """Las imágenes se identifican por su posición alfabética (01..30)."""
    return sorted(ORIGEN.glob("*.jpg"))[n - 1]

# ── Logo ────────────────────────────────────────────────────────────────────
def logo_transparente(color):
    """Tinta oscura sobre blanco → PNG con transparencia, en el color pedido."""
    g = np.array(Image.open(foto(17)).convert("L")).astype(float)
    a = np.clip((255 - g) / (255 - sum(TINTA) / 3), 0, 1)
    a = np.clip((a - 0.08) / 0.92, 0, 1)             # fuera el ruido JPEG
    rgba = np.zeros(g.shape + (4,), np.uint8)
    rgba[..., :3] = color
    rgba[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")

def recortar(img, margen=20):
    caja = img.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    x0, y0, x1, y1 = caja
    return img.crop((max(0, x0 - margen), max(0, y0 - margen), x1 + margen, y1 + margen))

def monograma(img):
    """El «EP» con sus hojas: la parte de arriba, hasta el hueco antes de EVENTS."""
    a = np.array(img.getchannel("A")) > 40
    filas = a.any(axis=1)
    y, vacio = 0, 0
    while y < len(filas) and not filas[y]:
        y += 1
    while y < len(filas):
        vacio = 0 if filas[y] else vacio + 1
        if vacio > 8:
            break
        y += 1
    return recortar(img.crop((0, 0, img.width, y - vacio)), 10)

def guardar_png(img, ruta):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    img.save(ruta, optimize=True)

logo = recortar(logo_transparente(TINTA))
logo_b = recortar(logo_transparente((255, 255, 255)))
mono = monograma(logo)
mono_b = monograma(logo_b)
B = RAIZ / "assets/brand"
guardar_png(logo, B / "ep-logo.png")
guardar_png(logo_b, B / "ep-logo-blanco.png")
guardar_png(mono, B / "ep-monograma.png")
guardar_png(mono_b, B / "ep-monograma-blanco.png")

# ── Iconos de la app ────────────────────────────────────────────────────────
def icono(lado, ocupa, ruta):
    """Monograma blanco centrado sobre musgo. `ocupa` = fracción del lado."""
    lienzo = Image.new("RGBA", (lado, lado), MUSGO + (255,))
    m = mono_b.copy()
    m.thumbnail((int(lado * ocupa), int(lado * ocupa)), Image.LANCZOS)
    lienzo.alpha_composite(m, ((lado - m.width) // 2, (lado - m.height) // 2))
    guardar_png(lienzo.convert("RGB"), ruta)

I = RAIZ / "assets/icons"
icono(512, 0.56, I / "icon-512.png")
icono(192, 0.56, I / "icon-192.png")
icono(180, 0.56, I / "apple-touch-icon.png")
# «maskable»: el sistema recorta hasta un círculo del 80 %, así que el dibujo
# tiene que caber en el 60 % central o se corta en algunos móviles.
icono(512, 0.42, I / "icon-maskable-512.png")
icono(192, 0.42, I / "icon-maskable-192.png")

# favicon.ico: los navegadores lo piden en la raíz aunque la página declare otro
# icono; sin él, cada visita deja un 404 en el registro del servidor.
fav = Image.open(I / "icon-192.png").convert("RGBA")
fav.save(RAIZ / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# ── Fotos ───────────────────────────────────────────────────────────────────
# (número en la carpeta original, nombre final, ¿lleva etiqueta que recortar?)
FOTOS = [
    (2,  "bosque-ceremonia",     True),  (3,  "invernadero-banquete", True),
    (5,  "jardin-fiesta",        True),  (8,  "mesa-dulce",           True),
    (9,  "terraza-banquete",     True), (10, "bienvenida-mesa",      True),
    (11, "jardin-iluminado",     True),  (12, "zona-lounge",          True),
    (13, "detalles-invitados",   True),  (14, "pasillo-petalos",      True),
    (15, "arco-rosas",           True),  (18, "masia-lounge",         True),
    (22, "patio-mediterraneo",   True),  (23, "acantilado-ceremonia", True),
    (27, "mesa-detalle",         True),
]
F = RAIZ / "assets/fotos"
F.mkdir(parents=True, exist_ok=True)
limpias = {}
for n, nombre, con_etiqueta in FOTOS:
    im = Image.open(foto(n)).convert("RGB")
    # La etiqueta ocupa 143×133 px en la esquina superior izquierda. Quitar solo
    # esa franja de la izquierda conserva toda la altura (arcos y techos) y
    # pierde un 14 % de ancho, que en estas composiciones es entorno.
    if con_etiqueta:
        im = im.crop((ETIQUETA_X, 0, im.width, im.height))
    im.save(F / f"{nombre}.jpg", quality=84, optimize=True, progressive=True)
    limpias[nombre] = im

# ── Imágenes del contrato impreso ───────────────────────────────────────────
def data_uri(img, formato, **kw):
    b = io.BytesIO()
    img.save(b, formato, optimize=True, **kw)
    mime = "jpeg" if formato == "JPEG" else "png"
    return f"data:image/{mime};base64," + base64.b64encode(b.getvalue()).decode()

def franja(im, ancho, alto, centro_y):
    """Recorte a una proporción concreta, centrado verticalmente en `centro_y` (0-1)."""
    prop = ancho / alto
    w = im.width
    h = int(w / prop)
    y0 = int(max(0, min(im.height - h, im.height * centro_y - h / 2)))
    return im.crop((0, y0, w, y0 + h)).resize((ancho, alto), Image.LANCZOS)

cabecera = franja(limpias["acantilado-ceremonia"], 1000, 125, 0.50)
cabecera = ImageEnhance.Brightness(cabecera).enhance(0.62)   # el título va en blanco encima
novios = franja(limpias["bosque-ceremonia"], 1100, 300, 0.56)
cierre = limpias["pasillo-petalos"].resize((900, int(900 * limpias["pasillo-petalos"].height / limpias["pasillo-petalos"].width)), Image.LANCZOS)
firma = mono.copy(); firma.thumbnail((300, 300), Image.LANCZOS)
logo_b_c = logo_b.copy(); logo_b_c.thumbnail((380, 380), Image.LANCZOS)
logo_v_c = logo.copy(); logo_v_c.thumbnail((380, 380), Image.LANCZOS)

IMG = {
    "cabecera": data_uri(cabecera, "JPEG", quality=72),
    "novios": data_uri(novios, "JPEG", quality=76),
    "cierre": data_uri(cierre, "JPEG", quality=74),
    "firma": data_uri(firma, "PNG"),
    "logoBlanco": data_uri(logo_b_c, "PNG"),
    "logoVerde": data_uri(logo_v_c, "PNG"),
}
salida = RAIZ / "src/data/contrato-imagenes.js"
salida.write_text(
    "// Imágenes del contrato impreso de Events Planner.\n"
    "// GENERADO por scripts/construir-marca.py: no editar a mano.\n"
    "//\n"
    "// Van incrustadas (data URI) porque el contrato se imprime en una ventana\n"
    "// creada con document.write, donde las rutas relativas a /assets no siempre\n"
    "// resuelven. Incrustadas, el documento se imprime igual desde cualquier sitio.\n\n"
    "const IMG_CONTRATO = {\n"
    + "".join(f'  {k}: "{v}",\n' for k, v in IMG.items())
    + "};\n\nexport { IMG_CONTRATO };\n",
    encoding="utf-8",
)

# ── Comprobación: si algo falló, que pare aquí y no más tarde ───────────────
esperados = [RAIZ / "favicon.ico", B / "ep-logo.png", B / "ep-logo-blanco.png", B / "ep-monograma.png",
             I / "icon-512.png", I / "icon-maskable-192.png", salida]
esperados += [F / f"{nombre}.jpg" for _, nombre, _ in FOTOS]
faltan = [str(p) for p in esperados if not p.exists() or p.stat().st_size < 500]
assert not faltan, f"faltan o están vacíos: {faltan}"
assert logo.width > 300 and mono.height < logo.height * 0.6, "el recorte del logo no cuadra"
print(f"logo {logo.size}  monograma {mono.size}  fotos {len(FOTOS)}  contrato {salida.stat().st_size // 1024} KB")
