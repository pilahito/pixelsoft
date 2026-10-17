"""
Casas de PixelSoft 2.2: 4 estilos con parcela (jardin, camino, valla), porche,
puerta, ventanas con marco y un interior amueblado.

    blender -b -P tools/arte/casas.py -- godot/assets/modelos

Convenciones que usa el juego (principal.gd):
  * La fachada mira a -Y en Blender (= hacia la calle en Godot).
  * Objetos "Techo*" y "Pared_del*": se ocultan con el boton Techos (vista Sims).
  * Objeto "Detalle*": solo en calidad Alta/Ultra (flores, tablillas, molduras).
  * Objeto "Interior": muebles; se apaga de lejos (LOD).
  * Vacios "Luz_*": ahi el juego pone luces calidas por la noche (PC).
  * Materiales "Fachada", "Tejado", "Puerta", "Contraventana": el juego los
    tine por casa para que no haya dos iguales. "Cristal" brilla de noche.
Todo se une por grupos al final: pocas mallas por casa = ligero en movil.
"""
import bpy, bmesh, sys, os, math

SALIDA = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'modelos'
os.makedirs(SALIDA, exist_ok=True)

COL = {
    'Fachada': (0.95, 0.90, 0.80), 'Tejado': (0.78, 0.30, 0.24), 'Madera': (0.62, 0.42, 0.26),
    'Marco': (0.97, 0.97, 0.95), 'Cristal': (0.55, 0.78, 0.95), 'Puerta': (0.30, 0.45, 0.70),
    'Cesped': (0.42, 0.70, 0.34), 'Camino': (0.78, 0.74, 0.68), 'Valla': (0.97, 0.97, 0.95),
    'Suelo_int': (0.78, 0.60, 0.42), 'Pared_int': (0.96, 0.93, 0.86), 'Zocalo': (0.85, 0.82, 0.76),
    'Tela': (0.35, 0.55, 0.85), 'Blanco': (0.97, 0.97, 0.97), 'Metal': (0.62, 0.64, 0.68),
    'Oscuro': (0.14, 0.15, 0.18), 'Hoja': (0.28, 0.62, 0.30), 'Flor_r': (0.95, 0.35, 0.45),
    'Flor_a': (1.0, 0.85, 0.25), 'Flor_v': (0.70, 0.45, 0.95), 'Piedra': (0.70, 0.70, 0.72),
    'Alfombra': (0.85, 0.40, 0.38), 'Contraventana': (0.25, 0.55, 0.75), 'Lampara': (1.0, 0.92, 0.70),
    'Terracota': (0.80, 0.45, 0.28), 'Hormigon': (0.82, 0.82, 0.80), 'Cojin': (0.98, 0.80, 0.35),
    'Seto': (0.22, 0.50, 0.25), 'Ladrillo': (0.70, 0.36, 0.28), 'Azulejo': (0.85, 0.93, 0.97),
}

def limpiar():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for b in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for x in list(b):
            b.remove(x)

def mat(nombre):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*COL[nombre], 1)
    b.inputs['Roughness'].default_value = 0.15 if nombre == 'Cristal' else (0.5 if nombre == 'Metal' else 0.85)
    if nombre == 'Metal':
        b.inputs['Metallic'].default_value = 0.6
    if nombre == 'Lampara':
        b.inputs['Emission Color'].default_value = (*COL[nombre], 1)
        b.inputs['Emission Strength'].default_value = 1.5
    return m

GRUPO = {}  # objeto -> grupo

# Materiales que el juego necesita por separado (tinte por casa o brillo de
# noche). Todo lo demas va a un unico material "Color" con colores de vertice:
# muchas menos llamadas de dibujo por casa (clave en moviles).
PROPIOS = {'Fachada', 'Tejado', 'Puerta', 'Contraventana', 'Cristal', 'Lampara'}
COL['Color'] = (1.0, 1.0, 1.0)

def _fin(o, nombre, m, grupo):
    o.name = nombre
    o.data.materials.clear()
    propio = m in PROPIOS
    o.data.materials.append(mat(m if propio else 'Color'))
    ca = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    c = (1.0, 1.0, 1.0, 1.0) if propio else (*COL[m], 1.0)
    for d in ca.data:
        d.color = c
    o.data.color_attributes.active_color = ca
    GRUPO[o.name] = grupo
    return o

def caja(loc, dim, m, grupo='Base', rot=(0, 0, 0), nombre='c'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = dim
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return _fin(o, nombre, m, grupo)

def cil(loc, r, h, m, grupo='Base', v=10, nombre='cil', rot=(0, 0, 0), r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    bpy.ops.object.transform_apply(rotation=True)
    return _fin(o, nombre, m, grupo)

def bola(loc, r, m, grupo='Detalle', esc=(1, 1, 1), sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.object
    o.scale = esc
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_flat()
    return _fin(o, 'bola', m, grupo)

def malla(nombre, verts, caras, m, grupo):
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in verts]
    for f in caras:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    return _fin(o, nombre, m, grupo)

def luz(nombre, loc):
    e = bpy.data.objects.new('Luz_' + nombre, None)
    e.location = loc
    bpy.context.collection.objects.link(e)

def unir_y_exportar(nombre):
    """Une todo por grupos (Base, Techo, Pared_del, Interior, Detalle, ...)."""
    grupos = {}
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH':
            continue
        grupos.setdefault(GRUPO.get(o.name, 'Base'), []).append(o)
    for g, objs in grupos.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = g; j.data.name = g
        # Une vertices duplicados para que el sombreado plano sea limpio
    bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, nombre + '.glb'), export_format='GLB', export_apply=True, export_extras=False,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    GRUPO.clear()
    print('->', nombre)

# ------------------------------------------------------------------ piezas
def ventana(cx, cy, cz, w, h, cara, grupo_pared='Base', contraventanas=False, jardinera=False):
    """Ventana con marco, cruz, alfeizar. cara: '-y' '+y' '-x' '+x'."""
    s = -1 if cara[0] == '-' else 1
    eje_y = cara[1] == 'y'
    f = 0.06  # grosor del marco
    def P(u, n, z):  # u = a lo largo de la pared, n = hacia fuera
        return (cx + u, cy + s * n, z) if eje_y else (cx + s * n, cy + u, z)
    def D(du, dn, dz):
        return (du, dn, dz) if eje_y else (dn, du, dz)
    caja(P(0, 0.03, cz), D(w, 0.02, h), 'Cristal', grupo_pared, nombre='Cristal')
    caja(P(0, 0.06, cz + h / 2), D(w + 2 * f, 0.07, f), 'Marco', grupo_pared)
    caja(P(0, 0.06, cz - h / 2), D(w + 2 * f, 0.07, f), 'Marco', grupo_pared)
    caja(P(-w / 2 - f / 2, 0.06, cz), D(f, 0.07, h), 'Marco', grupo_pared)
    caja(P(w / 2 + f / 2, 0.06, cz), D(f, 0.07, h), 'Marco', grupo_pared)
    caja(P(0, 0.06, cz), D(0.035, 0.05, h), 'Marco', grupo_pared)
    caja(P(0, 0.06, cz), D(w, 0.05, 0.035), 'Marco', grupo_pared)
    caja(P(0, 0.11, cz - h / 2 - 0.04), D(w + 0.22, 0.14, 0.05), 'Marco', grupo_pared)  # alfeizar
    if contraventanas:
        for u in (-w / 2 - 0.2, w / 2 + 0.2):
            caja(P(u, 0.06, cz), D(w / 2 - 0.02, 0.04, h + 0.06), 'Contraventana', 'Detalle' if grupo_pared == 'Base' else grupo_pared)
    if jardinera:
        g = 'Detalle' if grupo_pared == 'Base' else grupo_pared
        caja(P(0, 0.2, cz - h / 2 - 0.14), D(w + 0.1, 0.16, 0.14), 'Madera', g)
        for i in range(5):
            u = -w / 2 + 0.06 + i * (w - 0.12) / 4
            bola(P(u, 0.22, cz - h / 2 - 0.02), 0.07, ['Flor_r', 'Flor_a', 'Flor_v', 'Flor_r', 'Flor_a'][i], g)

def puerta(cx, cy, z0, w, h, grupo='Pared_del'):
    caja((cx, cy - 0.04, z0 + h / 2), (w, 0.06, h), 'Puerta', grupo)
    caja((cx, cy - 0.07, z0 + h + 0.04), (w + 0.16, 0.08, 0.08), 'Marco', grupo)
    caja((cx - w / 2 - 0.04, cy - 0.07, z0 + h / 2), (0.08, 0.08, h), 'Marco', grupo)
    caja((cx + w / 2 + 0.04, cy - 0.07, z0 + h / 2), (0.08, 0.08, h), 'Marco', grupo)
    caja((cx, cy - 0.075, z0 + h * 0.72), (w * 0.5, 0.02, h * 0.22), 'Cristal', grupo, nombre='Cristal')
    cil((cx + w * 0.32, cy - 0.09, z0 + h * 0.48), 0.03, 0.04, 'Metal', grupo, v=8, rot=(math.pi / 2, 0, 0))

def tejado_dos_aguas(cx, cy, w, d, z, alto, m='Tejado', voladizo=0.22, grosor=0.09, hastial='Fachada', chimenea=True):
    """Dos faldones con grosor + cumbrera + hastiales triangulares."""
    hw, hd = w / 2, d / 2
    ang = math.atan2(alto, hd)
    lon = math.hypot(hd, alto) + voladizo
    for s in (-1, 1):
        dy, dz = s * math.cos(ang), -math.sin(ang)          # direccion cumbrera -> alero
        ny, nz = s * math.sin(ang), math.cos(ang)            # normal hacia fuera
        my = cy + dy * lon / 2 + ny * grosor / 2
        mz = z + alto + dz * lon / 2 + nz * grosor / 2
        caja((cx, my, mz), (w + 2 * voladizo, lon, grosor), m, 'Techo', rot=(-s * ang, 0, 0))
    caja((cx, cy, z + alto + grosor), (w + 2 * voladizo + 0.04, 0.16, 0.12), m, 'Techo')
    for sx in (-1, 1):
        x = cx + sx * (hw - 0.075)
        malla('hastial', [(x - 0.075, cy - hd, z), (x - 0.075, cy + hd, z), (x - 0.075, cy, z + alto),
                          (x + 0.075, cy - hd, z), (x + 0.075, cy + hd, z), (x + 0.075, cy, z + alto)],
              [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], hastial, 'Techo')
    if chimenea:
        caja((cx + w * 0.28, cy + d * 0.18, z + alto * 0.9), (0.38, 0.38, alto * 0.9 + 0.2), 'Ladrillo', 'Techo')
        caja((cx + w * 0.28, cy + d * 0.18, z + alto * 1.37), (0.46, 0.46, 0.08), 'Piedra', 'Techo')
    # Tablillas del tejado (solo Alta/Ultra; se ocultan tambien con Techos)
    for s in (-1, 1):
        dy, dz = s * math.cos(ang), -math.sin(ang)
        ny, nz = s * math.sin(ang), math.cos(ang)
        for i in range(1, 5):
            t = i / 5 * lon
            caja((cx, cy + dy * t + ny * (grosor + 0.015), z + alto + dz * t + nz * (grosor + 0.015)), (w + 2 * voladizo, 0.05, 0.03), m, 'Techo_Detalle', rot=(-s * ang, 0, 0))

def tejado_cuatro_aguas(cx, cy, w, d, z, alto, m='Terracota', vol=0.25):
    hw, hd = w / 2 + vol, d / 2 + vol
    r = max(0.0, (w - d) / 2)
    g = 0.1
    v = [(cx - hw, cy - hd, z), (cx + hw, cy - hd, z), (cx + hw, cy + hd, z), (cx - hw, cy + hd, z),
         (cx - r, cy, z + alto), (cx + r, cy, z + alto),
         (cx - hw, cy - hd, z - g), (cx + hw, cy - hd, z - g), (cx + hw, cy + hd, z - g), (cx - hw, cy + hd, z - g)]
    malla('tejado4', v, [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (6, 9, 8, 7), (0, 6, 7, 1), (1, 7, 8, 2), (2, 8, 9, 3), (3, 9, 6, 0)], m, 'Techo')
    # Tejas (filas)
    for i in range(1, 4):
        t = i / 4
        caja((cx, cy - hd * (1 - t) - 0.02, z + alto * t + 0.03), (2 * (r + (hw - r) * (1 - t)), 0.06, 0.04), m, 'Techo_Detalle', rot=(math.atan2(alto, hd), 0, 0))

def valla_madera(x0, x1, y, eje='x', alto=0.55, hueco=None, grupo_tabla='Detalle_valla'):
    """Valla de jardin: postes + 2 travesanos (siempre) y tablillas (Alta/Ultra)."""
    largo = abs(x1 - x0)
    n = max(2, int(largo / 0.8) + 1)
    def p(u, z):
        return (u, y, z) if eje == 'x' else (y, u, z)
    def dd(a, b, c):
        return (a, b, c) if eje == 'x' else (b, a, c)
    tramos = [(x0, x1)] if hueco is None else [(x0, hueco[0]), (hueco[1], x1)]
    for a, b in tramos:
        if abs(b - a) < 0.1:
            continue
        m = (a + b) / 2; L = abs(b - a)
        for z in (alto * 0.35, alto * 0.75):
            caja(p(m, z), dd(L, 0.04, 0.06), 'Valla', 'Valla')
        k = max(2, int(L / 0.8) + 1)
        for i in range(k):
            caja(p(a + (b - a) * i / (k - 1), alto / 2 + 0.05), dd(0.08, 0.08, alto + 0.1), 'Valla', 'Valla')
        nt = int(L / 0.16)
        for i in range(nt):
            u = a + (b - a) * (i + 0.5) / nt
            caja(p(u, alto / 2), dd(0.07, 0.03, alto), 'Valla', grupo_tabla)

def arbusto(x, y, r=0.28, flores=True):
    bola((x, y, r * 0.8), r, 'Hoja', 'Valla', esc=(1, 1, 0.85))
    if flores:
        for i in range(3):
            a = i * 2.1
            bola((x + math.cos(a) * r * 0.6, y + math.sin(a) * r * 0.6, r * 1.35), 0.05, ['Flor_r', 'Flor_a', 'Flor_v'][i], 'Detalle')

def maceta(x, y, r=0.14):
    cil((x, y, r * 0.8), r, r * 1.6, 'Terracota', 'Base', v=10, r2=r * 0.75)
    bola((x, y, r * 2.0), r * 1.2, 'Hoja', 'Base', esc=(1, 1, 1.1))

def parcela(cesped='Cesped'):
    caja((0, 0, 0.02), (4, 4, 0.04), cesped, 'Base')
    # camino de losas hasta el porche
    for i in range(3):
        caja((0, -1.88 + i * 0.22, 0.045), (0.6, 0.18, 0.03), 'Camino', 'Base')

def interior(x0, x1, y0, y1, z0, h, estilo='clasico'):
    """Interior: dormitorio a la izquierda con bano, salon-cocina a la derecha."""
    W = x1 - x0; D = y1 - y0
    caja(((x0 + x1) / 2, (y0 + y1) / 2, z0 + 0.01), (W, D, 0.04), 'Suelo_int', 'Base')
    xp = x0 + W * 0.40  # tabique
    # tabique con hueco de paso
    caja((xp, y1 - (D * 0.55) / 2, z0 + h * 0.45), (0.08, D * 0.55, h * 0.9), 'Pared_int', 'Base')
    caja((xp, y0 + 0.25, z0 + h * 0.45), (0.08, 0.5, h * 0.9), 'Pared_int', 'Base')
    I = 'Interior'
    # Dormitorio: cama con cabecero, mesilla, lampara
    bx = x0 + 0.62
    caja((bx, y1 - 0.85, z0 + 0.22), (0.95, 1.5, 0.26), 'Madera', I)
    caja((bx, y1 - 0.88, z0 + 0.4), (0.9, 1.4, 0.12), 'Blanco', I)
    caja((bx, y1 - 1.05, z0 + 0.47), (0.94, 1.0, 0.05), 'Tela', I)
    caja((bx, y1 - 0.28, z0 + 0.5), (0.7, 0.22, 0.1), 'Cojin', I)
    caja((bx, y1 - 0.08, z0 + 0.55), (1.0, 0.07, 0.65), 'Madera', I)
    caja((bx + 0.7, y1 - 0.25, z0 + 0.22), (0.35, 0.35, 0.44), 'Madera', I)
    cil((bx + 0.7, y1 - 0.25, z0 + 0.55), 0.08, 0.22, 'Lampara', I, v=8, r2=0.05)
    # Bano: banera + vater + azulejo
    caja((x0 + 0.5, y0 + 0.42, z0 + 0.24), (0.85, 0.55, 0.45), 'Blanco', I)
    caja((x0 + 0.5, y0 + 0.42, z0 + 0.44), (0.7, 0.4, 0.06), 'Azulejo', I)
    cil((xp - 0.25, y0 + 0.3, z0 + 0.2), 0.14, 0.38, 'Blanco', I, v=10)
    caja((xp - 0.25, y0 + 0.1, z0 + 0.45), (0.3, 0.12, 0.35), 'Blanco', I)
    # Cocina en la pared del fondo
    kx0 = xp + 0.25; kx1 = x1 - 0.15
    caja(((kx0 + kx1) / 2, y1 - 0.3, z0 + 0.42), (kx1 - kx0, 0.5, 0.84), 'Blanco', I)
    caja(((kx0 + kx1) / 2, y1 - 0.3, z0 + 0.86), (kx1 - kx0 + 0.04, 0.54, 0.05), 'Piedra', I)
    caja((kx1 - 0.3, y1 - 0.3, z0 + 0.95), (0.55, 0.52, 1.9), 'Metal', I)  # nevera
    caja((kx0 + 0.45, y1 - 0.3, z0 + 0.9), (0.5, 0.4, 0.02), 'Oscuro', I)  # vitro
    caja(((kx0 + kx1) / 2 - 0.2, y1 - 0.12, z0 + 1.55), (kx1 - kx0 - 0.7, 0.3, 0.5), 'Madera', I)  # altillos
    # Comedor
    tx = (kx0 + kx1) / 2 + 0.2; ty = y0 + D * 0.62
    cil((tx, ty, z0 + 0.38), 0.06, 0.74, 'Madera', I, v=8)
    cil((tx, ty, z0 + 0.76), 0.42, 0.05, 'Madera', I, v=14)
    for a in (0.0, math.pi):
        sx = tx + math.cos(a) * 0.62
        caja((sx, ty, z0 + 0.25), (0.32, 0.32, 0.06), 'Madera', I)
        caja((sx + math.cos(a) * 0.15, ty, z0 + 0.48), (0.05, 0.32, 0.45), 'Madera', I)
    # Salon: sofa + tele + alfombra
    sy = y0 + 0.55
    caja((tx - 0.05, ty - 0.1, z0 + 0.035), (1.4, 0.9, 0.02), 'Alfombra', I)
    caja((kx0 + 0.75, sy, z0 + 0.2), (1.25, 0.6, 0.3), 'Tela', I)
    caja((kx0 + 0.75, sy - 0.24, z0 + 0.45), (1.25, 0.14, 0.5), 'Tela', I)
    for sx in (-0.6, 0.6):
        caja((kx0 + 0.75 + sx, sy, z0 + 0.32), (0.14, 0.6, 0.35), 'Tela', I)
    caja((kx0 + 0.5, sy + 0.05, z0 + 0.42), (0.3, 0.12, 0.25), 'Cojin', I)
    maceta(x1 - 0.25, y0 + 0.3)
    # Detalles interiores (Alta/Ultra)
    caja((x0 + 0.02 + 0.03, (y0 + y1) / 2, z0 + 1.4), (0.02, 0.5, 0.4), 'Flor_v', 'Detalle')  # cuadro
    caja((xp + 0.06, y1 - 0.9, z0 + 1.4), (0.02, 0.45, 0.35), 'Flor_a', 'Detalle')
    for i in range(4):
        caja((kx1 - 0.85 + i * 0.12, y1 - 0.3, z0 + 0.94), (0.06, 0.06, 0.12 + 0.03 * i), ['Flor_r', 'Cojin', 'Hoja', 'Blanco'][i], 'Detalle')
    luz('salon', ((kx0 + kx1) / 2, (y0 + y1) / 2, z0 + h - 0.35))
    luz('dormitorio', (bx + 0.2, y1 - 1.0, z0 + h - 0.35))

def paredes(x0, x1, y0, y1, z0, h, m='Fachada', puerta_x=0.0, puerta_w=0.8):
    """Paredes: fondo y laterales fijas; la fachada (Pared_del) se oculta."""
    t = 0.12
    W = x1 - x0; D = y1 - y0; cx = (x0 + x1) / 2; cy = (y0 + y1) / 2
    caja((cx, y1 - t / 2, z0 + h / 2), (W - 2 * t, t, h), m, 'Base')
    caja((x0 + t / 2, cy, z0 + h / 2), (t, D, h), m, 'Base')
    caja((x1 - t / 2, cy, z0 + h / 2), (t, D, h), m, 'Base')
    # interior de las paredes (color claro) y zocalo
    caja((cx, y1 - t - 0.005, z0 + h / 2), (W - 2 * t, 0.01, h - 0.02), 'Pared_int', 'Base')
    caja((x0 + t + 0.005, cy, z0 + h / 2), (0.01, D - 2 * t, h - 0.02), 'Pared_int', 'Base')
    caja((x1 - t - 0.005, cy, z0 + h / 2), (0.01, D - 2 * t, h - 0.02), 'Pared_int', 'Base')
    # fachada con hueco de puerta
    a = puerta_x - puerta_w / 2 - 0.08; b = puerta_x + puerta_w / 2 + 0.08
    caja(((x0 + t + a) / 2, y0 + t / 2, z0 + h / 2), (a - x0 - t, t, h), m, 'Pared_del_fachada')
    caja(((b + x1 - t) / 2, y0 + t / 2, z0 + h / 2), (x1 - t - b, t, h), m, 'Pared_del_fachada')
    caja((puerta_x, y0 + t / 2, z0 + h - (h - 2.0) / 2), (b - a, t, h - 2.0), m, 'Pared_del_fachada')
    # zocalo exterior
    for (lx, ly, dx, dy) in ((cx, y1 + 0.01, W + 0.04, t + 0.04), (x0 - 0.01, cy, t + 0.04, D), (x1 + 0.01, cy, t + 0.04, D)):
        caja((lx, ly, z0 + 0.12), (dx, dy, 0.24), 'Zocalo', 'Base')
    caja(((x0 + a) / 2, y0 - 0.01, z0 + 0.12), (a - x0 + 0.02, t + 0.04, 0.24), 'Zocalo', 'Pared_del_fachada')
    caja(((b + x1) / 2, y0 - 0.01, z0 + 0.12), (x1 - b + 0.02, t + 0.04, 0.24), 'Zocalo', 'Pared_del_fachada')

# ------------------------------------------------------------------ estilos
X0, X1, Y0, Y1 = -1.75, 1.75, -1.15, 1.7
Z0 = 0.15

def base_casa(h):
    caja((0, (Y0 + Y1) / 2, Z0 / 2 + 0.02), (X1 - X0 + 0.1, Y1 - Y0 + 0.1, Z0), 'Piedra', 'Base')  # cimiento
    paredes(X0, X1, Y0, Y1, Z0, h)
    puerta(0.0, Y0, Z0, 0.72, 1.85)
    interior(X0 + 0.12, X1 - 0.12, Y0 + 0.12, Y1 - 0.12, Z0, h)

def casa_clasica():
    limpiar()
    h = 2.3
    parcela()
    base_casa(h)
    for x in (-1.05, 1.05):
        ventana(x, Y0, Z0 + 1.25, 0.7, 0.75, '-y', 'Pared_del_fachada', contraventanas=True, jardinera=True)
    ventana(X0, 0.3, Z0 + 1.25, 0.7, 0.7, '-x')
    ventana(X1, 0.3, Z0 + 1.25, 0.7, 0.7, '+x')
    ventana(0.6, Y1, Z0 + 1.3, 0.8, 0.7, '+y')
    tejado_dos_aguas(0, (Y0 + Y1) / 2, X1 - X0, Y1 - Y0, Z0 + h, 1.15)
    # Porche: tarima, dos columnas y tejadillo
    caja((0, Y0 - 0.32, Z0 / 2 + 0.04), (1.5, 0.6, Z0), 'Madera', 'Base')
    for x in (-0.65, 0.65):
        cil((x, Y0 - 0.55, Z0 + 1.0), 0.05, 2.0, 'Marco', 'Base', v=8)
    caja((0, Y0 - 0.32, Z0 + 2.05), (1.7, 0.75, 0.08), 'Tejado', 'Techo_porche', rot=(0.18, 0, 0))
    caja((0, Y0 - 0.25, Z0 + 2.12), (0.12, 0.08, 0.12), 'Lampara', 'Base')
    luz('porche', (0, Y0 - 0.35, Z0 + 1.9))
    caja((0, Y0 - 0.7, 0.07), (0.6, 0.18, 0.1), 'Piedra', 'Base')  # escalon
    valla_madera(-1.95, 1.95, -1.95, 'x', hueco=(-0.4, 0.4))
    valla_madera(-1.87, 1.83, -1.95, 'y'); valla_madera(-1.87, 1.83, 1.95, 'y')
    valla_madera(-1.95, 1.95, 1.92, 'x')
    for x in (-1.45, -0.9, 0.9, 1.45):
        arbusto(x, -1.6)
    # Buzon
    cil((1.6, -1.75, 0.45), 0.03, 0.9, 'Madera', 'Base', v=6)
    caja((1.6, -1.75, 0.95), (0.2, 0.3, 0.18), 'Contraventana', 'Base')
    unir_y_exportar('casa')

def casa_campo():
    limpiar()
    h = 2.2
    parcela()
    base_casa(h)
    for x in (-1.05, 1.05):
        ventana(x, Y0, Z0 + 1.2, 0.62, 0.7, '-y', 'Pared_del_fachada', contraventanas=True, jardinera=True)
    ventana(X0, 0.3, Z0 + 1.2, 0.6, 0.65, '-x', contraventanas=True)
    ventana(X1, 0.3, Z0 + 1.2, 0.6, 0.65, '+x', contraventanas=True)
    tejado_dos_aguas(0, (Y0 + Y1) / 2, X1 - X0, Y1 - Y0, Z0 + h, 1.45, m='Tejado', hastial='Madera')
    # Porche corrido de madera con barandilla
    caja((0, Y0 - 0.38, Z0 / 2 + 0.04), (X1 - X0, 0.7, Z0), 'Madera', 'Base')
    for x in (-1.65, -0.5, 0.5, 1.65):
        caja((x, Y0 - 0.68, Z0 + 1.05), (0.1, 0.1, 2.1), 'Madera', 'Base')
    for a, b in ((-1.65, -0.5), (0.5, 1.65)):
        caja(((a + b) / 2, Y0 - 0.68, Z0 + 0.55), (b - a, 0.06, 0.06), 'Madera', 'Base')
        for i in range(7):
            caja((a + (b - a) * (i + 0.5) / 7, Y0 - 0.68, Z0 + 0.3), (0.04, 0.04, 0.5), 'Madera', 'Detalle')
    caja((0, Y0 - 0.4, Z0 + 2.12), (X1 - X0 + 0.3, 0.9, 0.08), 'Tejado', 'Techo_porche', rot=(0.22, 0, 0))
    luz('porche', (0, Y0 - 0.4, Z0 + 1.9))
    # Mecedora y barril de flores
    caja((-1.1, Y0 - 0.35, Z0 + 0.3), (0.45, 0.45, 0.06), 'Madera', 'Detalle')
    caja((-1.1, Y0 - 0.15, Z0 + 0.55), (0.45, 0.06, 0.5), 'Madera', 'Detalle')
    cil((1.6, -1.6, 0.2), 0.2, 0.4, 'Madera', 'Base', v=10)
    bola((1.6, -1.6, 0.48), 0.22, 'Hoja', 'Base')
    # Valla rustica (postes y troncos) y huerto
    valla_madera(-1.95, 1.95, -1.95, 'x', hueco=(-0.4, 0.4), alto=0.5)
    valla_madera(-1.87, 1.83, -1.95, 'y', alto=0.5); valla_madera(-1.87, 1.83, 1.95, 'y', alto=0.5)
    for i in range(3):
        caja((-1.3 + i * 0.35, -1.65, 0.07), (0.25, 0.4, 0.08), 'Madera', 'Base')
        for j in range(2):
            bola((-1.3 + i * 0.35, -1.75 + j * 0.2, 0.17), 0.07, 'Hoja', 'Detalle')
    unir_y_exportar('casa_campo')

def casa_moderna():
    limpiar()
    h = 2.5
    parcela()
    caja((0, (Y0 + Y1) / 2, Z0 / 2 + 0.02), (X1 - X0 + 0.1, Y1 - Y0 + 0.1, Z0), 'Hormigon', 'Base')
    paredes(X0, X1, Y0, Y1, Z0, h, puerta_x=-0.9)
    puerta(-0.9, Y0, Z0, 0.8, 2.0)
    interior(X0 + 0.12, X1 - 0.12, Y0 + 0.12, Y1 - 0.12, Z0, h)
    # Ventanal grande y franja de madera en la fachada
    ventana(0.7, Y0, Z0 + 1.15, 1.6, 1.7, '-y', 'Pared_del_fachada')
    caja((-0.9, Y0 - 0.075, Z0 + 2.3), (1.1, 0.03, 0.35), 'Madera', 'Pared_del_fachada')
    for i in range(6):
        caja((X0 + 0.15 + i * 0.12, Y0 - 0.09, Z0 + 1.0), (0.05, 0.03, 1.9), 'Madera', 'Pared_del_fachada')
    ventana(X1, 0.4, Z0 + 1.4, 1.2, 0.5, '+x')
    ventana(X0, 0.6, Z0 + 1.4, 0.9, 0.5, '-x')
    ventana(-0.4, Y1, Z0 + 1.2, 1.6, 1.4, '+y')
    # Cubierta plana con voladizo y peto
    caja((0, (Y0 + Y1) / 2 - 0.15, Z0 + h + 0.08), (X1 - X0 + 0.5, Y1 - Y0 + 0.7, 0.16), 'Oscuro', 'Techo')
    caja((0, (Y0 + Y1) / 2 - 0.15, Z0 + h + 0.2), (X1 - X0 + 0.3, Y1 - Y0 + 0.5, 0.08), 'Hormigon', 'Techo')
    caja((0.9, 0.6, Z0 + h + 0.35), (0.8, 0.6, 0.25), 'Metal', 'Techo')  # maquina clima
    for i in range(3):  # placas solares
        caja((-0.9 + i * 0.5, 0.2, Z0 + h + 0.38), (0.45, 0.8, 0.04), 'Oscuro', 'Techo_Detalle', rot=(0.25, 0, 0))
    # Terraza de madera, tumbona y seto
    caja((0.7, Y0 - 0.4, 0.07), (2.2, 0.75, 0.1), 'Madera', 'Base')
    caja((1.2, Y0 - 0.4, 0.2), (0.5, 0.9, 0.08), 'Blanco', 'Detalle', rot=(0.0, 0, 0))
    caja((0.4, Y0 - 0.4, 0.3), (0.5, 0.5, 0.05), 'Oscuro', 'Detalle')
    luz('porche', (-0.9, Y0 - 0.4, Z0 + 2.3))
    for (x0, x1, y, eje) in ((-1.95, -0.6, -1.92, 'x'), (0.0, 1.95, -1.92, 'x')):
        caja(((x0 + x1) / 2, y, 0.3), (x1 - x0, 0.3, 0.55), 'Seto', 'Valla')
    caja((-1.92, 0, 0.3), (0.3, 3.6, 0.55), 'Seto', 'Valla')
    caja((1.92, 0, 0.3), (0.3, 3.6, 0.55), 'Seto', 'Valla')
    for x in (-1.92, 1.92):
        for i in range(6):
            bola((x, -1.5 + i * 0.6, 0.6), 0.16, 'Seto', 'Detalle', esc=(1.2, 1.2, 0.6))
    # Camino de losas grandes hasta la puerta
    for i in range(3):
        caja((-0.3, -1.88 + i * 0.25, 0.05), (0.6, 0.2, 0.03), 'Hormigon', 'Base')
    caja((-1.6, -1.6, 0.4), (0.12, 0.12, 0.8), 'Oscuro', 'Base')
    caja((-1.6, -1.6, 0.84), (0.14, 0.14, 0.08), 'Lampara', 'Base')
    unir_y_exportar('casa_moderna')

def casa_mediterranea():
    limpiar()
    h = 2.3
    COL['Fachada'] = (0.98, 0.97, 0.94)
    parcela()
    base_casa(h)
    for x in (-1.05, 1.05):
        ventana(x, Y0, Z0 + 1.25, 0.55, 0.8, '-y', 'Pared_del_fachada', contraventanas=True)
        maceta(x, Y0 - 0.25, 0.12)
    ventana(X0, 0.3, Z0 + 1.25, 0.55, 0.75, '-x', contraventanas=True)
    ventana(X1, 0.3, Z0 + 1.25, 0.55, 0.75, '+x', contraventanas=True)
    tejado_cuatro_aguas(0, (Y0 + Y1) / 2, X1 - X0, Y1 - Y0, Z0 + h, 0.95)
    # Pergola con parra sobre la entrada
    for x in (-0.7, 0.7):
        caja((x, Y0 - 0.75, Z0 + 1.1), (0.1, 0.1, 2.2), 'Madera', 'Base')
    for i in range(5):
        caja((-0.7 + i * 0.35, Y0 - 0.38, Z0 + 2.2), (0.06, 0.9, 0.08), 'Madera', 'Techo_porche')
    for i in range(6):
        bola((-0.75 + i * 0.3, Y0 - 0.4 + (i % 2) * 0.2, Z0 + 2.3), 0.16, 'Hoja', 'Detalle')
    luz('porche', (0, Y0 - 0.4, Z0 + 2.0))
    # Muro bajo de piedra encalado, con macetas de terracota
    for (x0, x1, y, eje) in ((-1.95, -0.45, -1.93, 'x'), (0.45, 1.95, -1.93, 'x')):
        caja(((x0 + x1) / 2, y, 0.25), (x1 - x0, 0.16, 0.5), 'Blanco', 'Valla')
        caja(((x0 + x1) / 2, y, 0.52), (x1 - x0 + 0.04, 0.2, 0.05), 'Terracota', 'Valla')
    for x in (-1.93, 1.93):
        caja((x, 0, 0.25), (0.16, 3.85, 0.5), 'Blanco', 'Valla')
        caja((x, 0, 0.52), (0.2, 3.9, 0.05), 'Terracota', 'Valla')
    caja((0, 1.93, 0.25), (3.85, 0.16, 0.5), 'Blanco', 'Valla')
    for (x, y) in ((-1.5, -1.55), (1.5, -1.55), (-1.5, 1.4)):
        maceta(x, y, 0.16)
    # Limonero
    cil((1.4, 1.2, 0.5), 0.07, 1.0, 'Madera', 'Base', v=6)
    bola((1.4, 1.2, 1.15), 0.42, 'Hoja', 'Base')
    for i in range(5):
        a = i * 1.3
        bola((1.4 + math.cos(a) * 0.3, 1.2 + math.sin(a) * 0.3, 1.1 + (i % 2) * 0.2), 0.05, 'Flor_a', 'Detalle')
    COL['Fachada'] = (0.95, 0.90, 0.80)
    unir_y_exportar('casa_mediterranea')

casa_clasica()
casa_campo()
casa_moderna()
casa_mediterranea()
