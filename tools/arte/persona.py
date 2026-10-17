"""
Sims de PixelSoft 2.2: cuerpo con mejores proporciones (cabeza grande estilo
cartoon), cara con ojos, cejas y boca, 4 expresiones, 6 peinados, falda
opcional y 7 animaciones (Idle, Walk, Sit, Sleep, Wave, Eat, Dance).

    blender -b -P tools/arte/persona.py -- godot/assets/modelos

Ligero en movil: todo el cuerpo es UNA malla con UN material; el juego pinta
piel, ropa, zapatos y pelo con un shader que lee la "ranura" del alfa del
color de vertice (ver _vestir_sim en principal.gd). Por Sim se dibujan solo
3 mallas: Cuerpo + Pelo_<estilo> + Cara_<expresion> (+ Falda si la lleva).
Ranuras (alfa * 8): 0 color fijo del vertice, 1 piel, 2 camiseta,
3 pantalon/falda, 4 zapatos, 5 pelo/cejas, 6 antebrazo (piel o manga larga),
7 pierna baja (piel con pantalon corto/falda o pantalon largo).
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector

SALIDA = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'modelos'
os.makedirs(SALIDA, exist_ok=True)

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
for b in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
    for x in list(b): b.remove(x)

MAT = bpy.data.materials.new('Sim'); MAT.use_nodes = True
NEGRO, BLANCO, ROSA, BOCA = (0.05, 0.04, 0.05), (1, 1, 1), (0.95, 0.45, 0.5), (0.45, 0.12, 0.15)

# ------------------------------------------------------------- esqueleto
bpy.ops.object.armature_add(location=(0, 0, 0))
arm = bpy.context.object; arm.name = 'Esqueleto'
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
r = eb[0]; r.name = 'Raiz'; r.head = (0, 0, 0.84); r.tail = (0, 0, 0.94)
def hueso(n, h, t, p):
    b = eb.new(n); b.head = h; b.tail = t; b.parent = eb[p]; b.use_connect = False; return b
hueso('Torso', (0, 0, 0.92), (0, 0, 1.32), 'Raiz')
hueso('Cabeza', (0, 0, 1.34), (0, 0, 1.78), 'Torso')
for s, n in ((-1, 'I'), (1, 'D')):
    hueso('Brazo' + n, (0.24 * s, 0, 1.27), (0.26 * s, 0, 1.03), 'Torso')
    hueso('Antebrazo' + n, (0.26 * s, 0, 1.03), (0.27 * s, 0, 0.80), 'Brazo' + n)
    hueso('Pierna' + n, (0.095 * s, 0, 0.84), (0.095 * s, 0, 0.46), 'Raiz')
    hueso('Espinilla' + n, (0.095 * s, 0, 0.46), (0.095 * s, 0, 0.08), 'Pierna' + n)
for b in eb: b.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')

# ------------------------------------------------------------- piezas
PIEZAS = {}  # grupo final -> [objetos]

def _fin(o, grupo, hueso_, ranura, rgb=(1, 1, 1), suave=True):
    o.data.materials.clear(); o.data.materials.append(MAT)
    ca = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for d in ca.data: d.color = (*rgb, ranura / 8.0)
    o.data.color_attributes.active_color = ca
    vg = o.vertex_groups.new(name=hueso_); vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    if suave: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(50))
    else: bpy.ops.object.shade_flat()
    o.select_set(False)
    PIEZAS.setdefault(grupo, []).append(o)
    return o

def _activo():
    o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); return o

def bola(loc, esc, grupo, hueso_, ranura, rgb=(1, 1, 1), seg=12, anillos=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=anillos, radius=1, location=loc)
    o = bpy.context.object; o.scale = esc; _activo()
    return _fin(o, grupo, hueso_, ranura, rgb)

def tubo(p0, p1, r0, r1, grupo, hueso_, ranura, rgb=(1, 1, 1), v=8, esc_y=1.0):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r0, radius2=r1, depth=d.length, location=(p0 + p1) / 2)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    o.scale = (1, esc_y, 1); _activo()
    return _fin(o, grupo, hueso_, ranura, rgb)

def caja(loc, dim, grupo, hueso_, ranura, rgb=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = dim; _activo()
    return _fin(o, grupo, hueso_, ranura, rgb, suave=False)

def casquete(r, centro, plano_co, plano_no, grupo, esc=(1, 1, 1), ranura=5, quitar_dentro=True):
    """Media esfera cortada por un plano (pelo)."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=9, radius=r, location=centro)
    o = bpy.context.object; o.scale = esc; _activo()
    bm = bmesh.new(); bm.from_mesh(o.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    co = Vector(plano_co) - Vector(centro)
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=plano_no, clear_inner=quitar_dentro)
    bm.to_mesh(o.data); bm.free()
    return _fin(o, grupo, 'Cabeza', ranura)

# Cuerpo (ranuras: piel / ropa)
C = 'Cuerpo'
tubo((0, 0, 0.86), (0, 0, 1.30), 0.15, 0.175, C, 'Torso', 2, v=10, esc_y=0.68)        # camiseta
bola((0, 0, 1.28), (0.19, 0.12, 0.07), C, 'Torso', 2)                                  # hombros redondos
tubo((0, 0, 0.78), (0, 0, 0.92), 0.14, 0.15, C, 'Raiz', 3, v=10, esc_y=0.7)           # cadera
caja((0, -0.001, 0.885), (0.31, 0.215, 0.03), C, 'Raiz', 0, (0.18, 0.14, 0.1))          # cinturon
tubo((0, 0, 1.30), (0, 0, 1.40), 0.05, 0.05, C, 'Cabeza', 1, v=8)                      # cuello
bola((0, 0, 1.57), (0.2, 0.19, 0.21), C, 'Cabeza', 1, seg=16, anillos=10)              # cabeza
bola((0, -0.19, 1.54), (0.026, 0.025, 0.03), C, 'Cabeza', 1, seg=8, anillos=5)         # nariz
for s in (-1, 1):
    bola((0.2 * s, 0, 1.56), (0.035, 0.025, 0.05), C, 'Cabeza', 1, seg=8, anillos=5)   # orejas
    n = 'D' if s > 0 else 'I'
    tubo((0.24 * s, 0, 1.28), (0.26 * s, 0, 1.03), 0.058, 0.05, C, 'Brazo' + n, 2)    # manga
    tubo((0.26 * s, 0, 1.04), (0.27 * s, 0, 0.82), 0.045, 0.038, C, 'Antebrazo' + n, 6)
    bola((0.272 * s, -0.005, 0.77), (0.045, 0.035, 0.055), C, 'Antebrazo' + n, 1, seg=8, anillos=6)  # mano
    tubo((0.095 * s, 0, 0.86), (0.095 * s, 0, 0.45), 0.075, 0.062, C, 'Pierna' + n, 3)
    tubo((0.095 * s, 0, 0.47), (0.095 * s, 0, 0.09), 0.058, 0.048, C, 'Espinilla' + n, 7)
    caja((0.095 * s, -0.035, 0.045), (0.11, 0.2, 0.09), C, 'Espinilla' + n, 4)           # zapato
    caja((0.095 * s, -0.035, 0.005), (0.115, 0.205, 0.02), C, 'Espinilla' + n, 0, (0.95, 0.95, 0.92))  # suela

# Falda (opcional)
tubo((0, 0, 0.92), (0, 0, 0.56), 0.15, 0.24, 'Falda', 'Raiz', 3, v=12, esc_y=0.8)

# Caras: ojos + cejas + boca segun el animo
FY = -0.178  # superficie frontal de la cara
def ojos(grupo, cerrados=False, grandes=False):
    for s in (-1, 1):
        x = 0.072 * s
        if cerrados:
            caja((x, FY - 0.012, 1.585), (0.05, 0.01, 0.009), grupo, 'Cabeza', 0, NEGRO)
        else:
            e = 1.12 if grandes else 1.0
            bola((x, FY - 0.008, 1.59), (0.026 * e, 0.012, 0.036 * e), grupo, 'Cabeza', 0, NEGRO, seg=10, anillos=6)
            bola((x + 0.008, FY - 0.019, 1.603), (0.008, 0.004, 0.008), grupo, 'Cabeza', 0, BLANCO, seg=6, anillos=4)

def cejas(grupo, inclinacion, alto=1.645):
    for s in (-1, 1):
        caja((0.075 * s, FY - 0.006, alto), (0.06, 0.012, 0.013), grupo, 'Cabeza', 5, rot=(0, -inclinacion * s, 0))

def boca(grupo, curva, ancho=0.075, z=1.505, abierta=False):
    """Boca con 5 segmentos sobre un arco: curva>0 sonrisa, <0 tristeza."""
    n = 5
    for i in range(n):
        t = (i + 0.5) / n * 2 - 1
        x = t * ancho / 2
        zz = z + curva * (t * t - 0.33)
        pend = math.atan(curva * 2 * t * 2 / ancho)
        caja((x, FY - 0.004 - 0.01 * (1 - t * t), zz), (ancho / n * 1.15, 0.012, 0.012 if not abierta else 0.024), grupo, 'Cabeza', 0, BOCA, rot=(0, -pend, 0))

ojos('Cara_feliz', grandes=True); cejas('Cara_feliz', -0.12, 1.65); boca('Cara_feliz', 0.022, 0.085, abierta=True)
for s in (-1, 1):
    bola((0.12 * s, FY + 0.02, 1.53), (0.03, 0.01, 0.018), 'Cara_feliz', 'Cabeza', 0, ROSA, seg=8, anillos=4)
ojos('Cara_normal'); cejas('Cara_normal', 0.0); boca('Cara_normal', 0.006, 0.065)
ojos('Cara_triste'); cejas('Cara_triste', 0.35, 1.64); boca('Cara_triste', -0.016, 0.06, z=1.495)
ojos('Cara_dormida', cerrados=True); cejas('Cara_dormida', -0.05, 1.635)
bola((0, FY - 0.004, 1.5), (0.014, 0.008, 0.016), 'Cara_dormida', 'Cabeza', 0, BOCA, seg=8, anillos=4)

# Peinados (todos con ranura 5 = color de pelo)
HC = (0, 0.01, 1.585)
casquete(0.215, HC, (0, 0, 1.6), (0, 0.55, 1), 'Pelo_corto', esc=(1, 1, 1.02))
casquete(0.222, HC, (0, 0, 1.61), (0, 0.5, 1), 'Pelo_largo', esc=(1.02, 1.02, 1.03))
caja((0, 0.11, 1.42), (0.38, 0.1, 0.36), 'Pelo_largo', 'Cabeza', 5)
for s in (-1, 1): caja((0.19 * s, 0.02, 1.47), (0.06, 0.16, 0.26), 'Pelo_largo', 'Cabeza', 5)
casquete(0.218, HC, (0, 0, 1.6), (0, 0.5, 1), 'Pelo_coleta')
bola((0, 0.2, 1.62), (0.06, 0.06, 0.06), 'Pelo_coleta', 'Cabeza', 5, seg=8, anillos=6)
tubo((0, 0.23, 1.6), (0, 0.27, 1.36), 0.055, 0.03, 'Pelo_coleta', 'Cabeza', 5, v=8)
casquete(0.216, HC, (0, 0, 1.6), (0, 0.5, 1), 'Pelo_mono')
bola((0, 0.06, 1.81), (0.085, 0.08, 0.07), 'Pelo_mono', 'Cabeza', 5, seg=10, anillos=6)
casquete(0.27, (0, 0.03, 1.64), (0, 0, 1.56), (0, 0.85, 1), 'Pelo_afro', esc=(1.05, 1, 0.95))
casquete(0.207, HC, (0, 0, 1.63), (0, 0.4, 1), 'Pelo_rapado')
for i, s in enumerate((-1, 1)):  # flequillo del corto
    bola((0.07 * s, -0.17, 1.69), (0.08, 0.04, 0.035), 'Pelo_corto', 'Cabeza', 5, seg=8, anillos=5)

# Unir por grupo y atar al esqueleto
for g, objs in PIEZAS.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active; j.name = g; j.data.name = g
    j.parent = arm
    md = j.modifiers.new('arm', 'ARMATURE'); md.object = arm

# ------------------------------------------------------------- animaciones
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
pb = arm.pose.bones
for b in pb: b.rotation_mode = 'XYZ'

def accion(nombre, claves):
    """claves: [(frame, {hueso: (rot_xyz, loc_xyz|None)})]"""
    act = bpy.data.actions.new(nombre)
    arm.animation_data_create(); arm.animation_data.action = act
    for f, poses in claves:
        for b in pb: b.rotation_euler = (0, 0, 0); b.location = (0, 0, 0)
        for hb, (rot, loc) in poses.items():
            if hb.startswith(('Brazo', 'Antebrazo')):
                rot = (rot[0], rot[1], -rot[2])  # en los brazos +Z = hacia fuera/arriba
            pb[hb].rotation_euler = rot
            if loc: pb[hb].location = loc
        for b in pb:
            b.keyframe_insert('rotation_euler', frame=f); b.keyframe_insert('location', frame=f)
    act.use_fake_user = True
    tr = arm.animation_data.nla_tracks.new(); tr.name = nombre
    tr.strips.new(nombre, 1, act)
    arm.animation_data.action = None

def P(**k):
    return {h: (v if isinstance(v, tuple) and len(v) == 2 and isinstance(v[0], tuple) else (v, None)) for h, v in k.items()}

# Brazos un poco separados del cuerpo en reposo
REP = dict(BrazoI=(0, 0, -0.08), BrazoD=(0, 0, 0.08), AntebrazoI=(-0.1, 0, 0), AntebrazoD=(-0.1, 0, 0))
def con(**k):
    d = dict(REP); d.update(k); return P(**d)

accion('Idle', [(1, con()), (30, con(Raiz=((0, 0, 0), (0, 0.012, 0)), Cabeza=(0.05, 0.06, 0), BrazoI=(0, 0, -0.11), BrazoD=(0, 0, 0.11))), (60, con())])

a = 0.55
def paso(s):
    return con(PiernaI=(a * s, 0, 0), PiernaD=(-a * s, 0, 0), EspinillaI=(0.5 if s < 0 else 0.1, 0, 0), EspinillaD=(0.5 if s > 0 else 0.1, 0, 0),
               BrazoI=(-a * 0.8 * s, 0, -0.08), BrazoD=(a * 0.8 * s, 0, 0.08), AntebrazoI=(-0.35, 0, 0), AntebrazoD=(-0.35, 0, 0),
               Torso=(0.04, 0.06 * s, 0))
def medio(s):
    return con(Raiz=((0, 0, 0), (0, 0.03, 0)), EspinillaI=(0.3 if s > 0 else 0.05, 0, 0), EspinillaD=(0.3 if s < 0 else 0.05, 0, 0),
               AntebrazoI=(-0.3, 0, 0), AntebrazoD=(-0.3, 0, 0), Torso=(0.04, 0, 0))
accion('Walk', [(1, paso(1)), (7, medio(1)), (13, paso(-1)), (19, medio(-1)), (25, paso(1))])

SENT = dict(PiernaI=(-1.5, 0, 0), PiernaD=(-1.5, 0, 0), EspinillaI=(1.5, 0, 0), EspinillaD=(1.5, 0, 0),
            Raiz=((0, 0, 0), (0, -0.38, 0.05)), BrazoI=(-0.45, 0, -0.05), BrazoD=(-0.45, 0, 0.05), AntebrazoI=(-0.6, 0, 0), AntebrazoD=(-0.6, 0, 0))
def sentado(**k):
    d = dict(SENT); d.update(k); return P(**d)
accion('Sit', [(1, sentado()), (40, sentado(Cabeza=(0.08, 0.1, 0))), (80, sentado())])

TUMB = dict(Raiz=((-1.57, 0, 0), (0, -0.4, 0.5)), BrazoI=(0, 0, -0.15), BrazoD=(0, 0, 0.15))
accion('Sleep', [(1, P(**TUMB)), (40, P(**dict(TUMB, Torso=(0.03, 0, 0)))), (80, P(**TUMB))])

def saludo(z):
    return con(BrazoD=(0, 0, 2.55), AntebrazoD=(0, 0, z), Cabeza=(0, -0.12, 0.08), Torso=(0, 0, 0.04))
accion('Wave', [(1, saludo(0.0)), (8, saludo(0.5)), (16, saludo(-0.2)), (24, saludo(0.5)), (32, saludo(0.0)), (44, con()), (60, con())])

def come(arriba):
    return sentado(BrazoD=(-0.5, 0, 0.12), AntebrazoD=(-2.05 if arriba else -1.2, 0, 0.15), Cabeza=(0.12 if arriba else 0.05, 0, 0))
accion('Eat', [(1, come(False)), (14, come(True)), (22, come(True)), (36, come(False)), (60, come(False))])

def baile(s, abajo):
    y = -0.05 if abajo else 0.03
    return P(Raiz=((0, 0.25 * s, 0.06 * s), (0, y, 0)), Torso=(0, -0.2 * s, -0.08 * s), Cabeza=(0, 0.15 * s, 0.1 * s),
             BrazoI=(-0.3, 0, -2.3 if s > 0 else -0.6), BrazoD=(-0.3, 0, 0.6 if s > 0 else 2.3),
             AntebrazoI=(-0.6, 0, 0), AntebrazoD=(-0.6, 0, 0),
             PiernaI=(-0.25 if abajo else 0, 0, 0), PiernaD=(-0.25 if abajo else 0, 0, 0),
             EspinillaI=(0.45 if abajo else 0, 0, 0), EspinillaD=(0.45 if abajo else 0, 0, 0))
accion('Dance', [(1, baile(1, False)), (7, baile(1, True)), (13, baile(-1, False)), (19, baile(-1, True)), (25, baile(1, False))])

bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'persona.glb'), export_format='GLB', export_animations=True,
                          export_nla_strips=True, export_animation_mode='NLA_TRACKS', export_vertex_color='ACTIVE', export_all_vertex_colors=False)
print('-> persona')
