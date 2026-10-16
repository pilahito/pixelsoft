"""
Genera los modelos 3D low-poly de PixelSoft y los exporta a glTF (.glb).

    blender -b -P tools/arte/modelos.py -- godot/assets/modelos

Todo sale de este script: no hay .blend a mano, asi los assets son
reproducibles. Estilo: low-poly, colores planos (toon) y techos en un objeto
aparte llamado "Techo*" para poder ocultarlos y ver el interior (vista Sims).
"""
import bpy, sys, os, math

SALIDA = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'modelos'
os.makedirs(SALIDA, exist_ok=True)

def limpiar():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for b in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for x in list(b):
            b.remove(x)

_mats = {}
def mat(nombre, rgb):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    return m

def caja(nombre, loc, dim, color, padre=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = nombre
    o.scale = dim
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat(nombre.split('_')[0] + str(color), color))
    if padre: o.parent = padre
    return o

def tejado(nombre, w, d, alto, z, color):
    """Tejado a dos aguas (prisma triangular)."""
    import bmesh
    me = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    hw, hd = w / 2 + 0.15, d / 2 + 0.15
    v = [bm.verts.new(p) for p in [(-hw, -hd, z), (hw, -hd, z), (hw, hd, z), (-hw, hd, z), (-hw, 0, z + alto), (hw, 0, z + alto)]]
    for f in [(0, 1, 5, 4), (3, 2, 5, 4)[::-1], (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]:
        bm.faces.new([v[i] for i in f])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat('tejado' + str(color), color))
    return o

def exportar(nombre):
    bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, nombre + '.glb'), export_format='GLB', export_apply=True, export_animations=True)
    print('->', nombre)

PARED = (0.93, 0.89, 0.80)
SUELO = (0.75, 0.6, 0.45)

def edificio(nombre, w, d, h, color_pared, color_tejado, interior):
    limpiar()
    caja('Suelo', (0, 0, 0.05), (w, d, 0.1), SUELO)
    t = 0.15
    # Paredes: la delantera mas baja (corte tipo Sims) para ver dentro.
    caja('Pared_tras', (0, d / 2 - t / 2, h / 2), (w, t, h), color_pared)
    caja('Pared_izq', (-w / 2 + t / 2, 0, h / 2), (t, d, h), color_pared)
    caja('Pared_der', (w / 2 - t / 2, 0, h / 2), (t, d, h), color_pared)
    caja('Pared_del_a', (-w / 4 - 0.3, -d / 2 + t / 2, h / 2), (w / 2 - 0.6, t, h), color_pared)
    caja('Pared_del_b', (w / 4 + 0.3, -d / 2 + t / 2, h / 2), (w / 2 - 0.6, t, h), color_pared)
    caja('Pared_dintel', (0, -d / 2 + t / 2, h - 0.25), (1.2, t, 0.5), color_pared)
    for x in (-w / 4 - 0.3, w / 4 + 0.3):
        caja('Ventana', (x, -d / 2 - 0.01, h * 0.55), (0.7, 0.05, 0.6), (0.55, 0.8, 0.95))
    tejado('Techo', w, d, 1.1, h, color_tejado)
    interior(w, d)
    exportar(nombre)

def int_casa(w, d):
    caja('Cama', (-w / 2 + 0.9, d / 2 - 1.1, 0.3), (1.0, 1.8, 0.4), (0.35, 0.5, 0.85))
    caja('Almohada', (-w / 2 + 0.9, d / 2 - 0.4, 0.55), (0.8, 0.3, 0.12), (1, 1, 1))
    caja('Mesa', (w / 4, 0, 0.4), (0.9, 0.9, 0.08), (0.55, 0.35, 0.2))
    caja('Pata', (w / 4, 0, 0.2), (0.12, 0.12, 0.4), (0.45, 0.28, 0.15))
    caja('Nevera', (w / 2 - 0.5, d / 2 - 0.5, 0.75), (0.6, 0.6, 1.5), (0.9, 0.92, 0.95))
    caja('Alfombra', (0, -0.3, 0.11), (1.6, 1.0, 0.02), (0.8, 0.3, 0.35))

def int_oficina(w, d):
    for i in range(3):
        x = -w / 2 + 1.3 + i * 1.6
        caja('Escritorio', (x, 0.5, 0.45), (1.2, 0.7, 0.08), (0.6, 0.42, 0.25))
        caja('Monitor', (x, 0.7, 0.75), (0.6, 0.06, 0.4), (0.1, 0.1, 0.12))
        caja('Pantalla', (x, 0.66, 0.75), (0.52, 0.02, 0.32), (0.3, 0.85, 0.9))
        caja('Silla', (x, 0.0, 0.3), (0.45, 0.45, 0.08), (0.2, 0.2, 0.25))
    caja('Servidor', (w / 2 - 0.6, d / 2 - 0.6, 0.9), (0.6, 0.6, 1.8), (0.15, 0.15, 0.2))

def int_super(w, d):
    for i in range(3):
        caja('Estanteria', (-w / 2 + 1 + i * 1.4, 0.6, 0.6), (0.4, 2.0, 1.2), (0.7, 0.7, 0.75))
        caja('Producto', (-w / 2 + 1 + i * 1.4, 0.6, 1.0), (0.45, 1.8, 0.2), [(0.9, 0.4, 0.2), (0.3, 0.7, 0.3), (0.95, 0.85, 0.3)][i])
    caja('Caja', (w / 2 - 1, -d / 2 + 1, 0.5), (1.2, 0.6, 1.0), (0.85, 0.25, 0.25))

def int_cafe(w, d):
    caja('Barra', (0, d / 2 - 0.7, 0.55), (w - 1, 0.6, 1.1), (0.5, 0.3, 0.2))
    caja('Cafetera', (0.6, d / 2 - 0.7, 1.25), (0.4, 0.35, 0.35), (0.2, 0.2, 0.2))
    for x in (-w / 4, w / 4):
        caja('MesaCafe', (x, -0.3, 0.45), (0.8, 0.8, 0.07), (0.95, 0.95, 0.95))

def int_gym(w, d):
    caja('Cinta', (-w / 4, 0.3, 0.2), (0.7, 1.6, 0.3), (0.2, 0.2, 0.22))
    caja('Banco', (w / 4, 0.3, 0.3), (0.5, 1.4, 0.15), (0.85, 0.2, 0.2))
    caja('Pesas', (w / 4, 0.3, 0.65), (1.4, 0.1, 0.1), (0.4, 0.4, 0.45))

def int_vacio(w, d):
    pass

def arbol(nombre='arbol'):
    limpiar()
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.15, depth=1.0, location=(0, 0, 0.5))
    bpy.context.object.data.materials.append(mat('tronco', (0.45, 0.3, 0.18)))
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.8, depth=1.6, location=(0, 0, 1.6))
    bpy.context.object.data.materials.append(mat('hoja', (0.3, 0.65, 0.3)))
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.6, depth=1.2, location=(0, 0, 2.3))
    bpy.context.object.data.materials.append(mat('hoja', (0.3, 0.65, 0.3)))
    exportar(nombre)

def fuente():
    limpiar()
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.9, depth=0.4, location=(0, 0, 0.2))
    bpy.context.object.data.materials.append(mat('piedra', (0.7, 0.7, 0.72)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.75, depth=0.05, location=(0, 0, 0.38))
    bpy.context.object.data.materials.append(mat('agua', (0.35, 0.65, 0.95)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12, depth=1.0, location=(0, 0, 0.7))
    bpy.context.object.data.materials.append(mat('piedra', (0.7, 0.7, 0.72)))
    exportar('fuente')

def parque():
    limpiar()
    caja('Cesped', (0, 0, 0.03), (4, 3, 0.06), (0.4, 0.75, 0.35))
    caja('Banco', (0, -0.9, 0.3), (1.2, 0.35, 0.08), (0.6, 0.4, 0.25))
    for x, y in ((-1.4, 0.8), (1.4, 0.9), (0.2, 1.0)):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.6, location=(x, y, 1.1))
        bpy.context.object.data.materials.append(mat('hoja', (0.3, 0.65, 0.3)))
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.1, depth=0.7, location=(x, y, 0.35))
        bpy.context.object.data.materials.append(mat('tronco', (0.45, 0.3, 0.18)))
    exportar('parque')

def personaje():
    """Personaje con esqueleto simple y 4 animaciones: Idle, Walk, Sit, Sleep."""
    limpiar()
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'Esqueleto'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    raiz = eb[0]; raiz.name = 'Raiz'; raiz.head = (0, 0, 0.9); raiz.tail = (0, 0, 1.3)
    def hueso(n, h, t, p):
        b = eb.new(n); b.head = h; b.tail = t; b.parent = eb[p]; return b
    hueso('Cabeza', (0, 0, 1.3), (0, 0, 1.7), 'Raiz')
    hueso('PiernaI', (-0.12, 0, 0.9), (-0.12, 0, 0.1), 'Raiz')
    hueso('PiernaD', (0.12, 0, 0.9), (0.12, 0, 0.1), 'Raiz')
    hueso('BrazoI', (-0.3, 0, 1.3), (-0.3, 0, 0.8), 'Raiz')
    hueso('BrazoD', (0.3, 0, 1.3), (0.3, 0, 0.8), 'Raiz')
    bpy.ops.object.mode_set(mode='OBJECT')
    piezas = [
        ('Torso', (0, 0, 1.1), (0.45, 0.25, 0.5), (0.25, 0.55, 0.85), 'Raiz'),
        ('Cabeza', (0, 0, 1.5), (0.32, 0.3, 0.32), (0.96, 0.8, 0.66), 'Cabeza'),
        ('Pelo', (0, 0.02, 1.68), (0.34, 0.32, 0.1), (0.3, 0.2, 0.12), 'Cabeza'),
        ('PiernaI', (-0.12, 0, 0.5), (0.16, 0.18, 0.8), (0.2, 0.22, 0.35), 'PiernaI'),
        ('PiernaD', (0.12, 0, 0.5), (0.16, 0.18, 0.8), (0.2, 0.22, 0.35), 'PiernaD'),
        ('BrazoI', (-0.3, 0, 1.05), (0.12, 0.14, 0.5), (0.25, 0.55, 0.85), 'BrazoI'),
        ('BrazoD', (0.3, 0, 1.05), (0.12, 0.14, 0.5), (0.25, 0.55, 0.85), 'BrazoD'),
    ]
    for n, loc, dim, col, hueso_ in piezas:
        o = caja('P' + n, loc, dim, col)
        vg = o.vertex_groups.new(name=hueso_)
        vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.parent = arm
        md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    pb = arm.pose.bones
    for b in pb: b.rotation_mode = 'XYZ'

    def accion(nombre, claves, fin):
        act = bpy.data.actions.new(nombre)
        arm.animation_data_create(); arm.animation_data.action = act
        for f, poses in claves:
            for b in pb:
                b.rotation_euler = (0, 0, 0); b.location = (0, 0, 0)
            for hb, rot, loc in poses:
                pb[hb].rotation_euler = rot
                if loc: pb[hb].location = loc
            for b in pb:
                b.keyframe_insert('rotation_euler', frame=f)
                b.keyframe_insert('location', frame=f)
        act.use_fake_user = True
        tr = arm.animation_data.nla_tracks.new(); tr.name = nombre
        tr.strips.new(nombre, 1, act)
        arm.animation_data.action = None

    a = 0.6
    accion('Idle', [(1, [('Raiz', (0, 0, 0), (0, 0, 0))]), (20, [('Raiz', (0, 0, 0), (0, 0.03, 0)), ('Cabeza', (0.08, 0, 0), None)]), (40, [('Raiz', (0, 0, 0), (0, 0, 0))])], 40)
    accion('Walk', [(1, [('PiernaI', (a, 0, 0), None), ('PiernaD', (-a, 0, 0), None), ('BrazoI', (-a, 0, 0), None), ('BrazoD', (a, 0, 0), None)]),
                    (11, [('PiernaI', (-a, 0, 0), None), ('PiernaD', (a, 0, 0), None), ('BrazoI', (a, 0, 0), None), ('BrazoD', (-a, 0, 0), None)]),
                    (21, [('PiernaI', (a, 0, 0), None), ('PiernaD', (-a, 0, 0), None), ('BrazoI', (-a, 0, 0), None), ('BrazoD', (a, 0, 0), None)])], 21)
    sit = [('PiernaI', (-1.5, 0, 0), None), ('PiernaD', (-1.5, 0, 0), None), ('Raiz', (0, 0, 0), (0, -0.4, 0)), ('BrazoI', (-0.5, 0, 0), None), ('BrazoD', (-0.5, 0, 0), None)]
    accion('Sit', [(1, sit), (30, sit)], 30)
    dormir = [('Raiz', (-1.57, 0, 0), (0, -0.4, 0.5))]
    accion('Sleep', [(1, dormir), (30, dormir)], 30)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'personaje.glb'), export_format='GLB', export_animations=True, export_nla_strips=True, export_animation_mode='NLA_TRACKS')
    print('-> personaje')

def akia():
    """Tienda de muebles gigante (parodia): caja azul con franja amarilla."""
    limpiar()
    AZUL, AMARILLO = (0.05, 0.25, 0.65), (1.0, 0.82, 0.05)
    caja('Suelo', (0, 0, 0.05), (14, 10, 0.1), (0.8, 0.8, 0.78))
    caja('Techo_caja', (0, 0, 5.2), (14, 10, 0.4), AZUL)
    caja('Pared_tras', (0, 4.9, 2.6), (14, 0.2, 5.2), AZUL)
    caja('Pared_izq', (-6.9, 0, 2.6), (0.2, 10, 5.2), AZUL)
    caja('Pared_der', (6.9, 0, 2.6), (0.2, 10, 5.2), AZUL)
    caja('Pared_del_a', (-4.0, -4.9, 2.6), (6, 0.2, 5.2), AZUL)
    caja('Pared_del_b', (4.0, -4.9, 2.6), (6, 0.2, 5.2), AZUL)
    caja('Pared_del_franja', (0, -5.02, 4.2), (14.05, 0.1, 0.9), AMARILLO)
    bpy.ops.object.text_add(location=(0, -5.1, 3.7), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.object; t.data.body = 'AKIA'; t.data.align_x = 'CENTER'; t.data.size = 1.6; t.data.extrude = 0.08
    t.name = 'Pared_del_letras'
    bpy.ops.object.convert(target='MESH')
    bpy.context.object.data.materials.append(mat('amarillo', AMARILLO))
    exportar('akia')

def perro():
    limpiar()
    MARRON = (0.65, 0.45, 0.25)
    caja('Cuerpo', (0, 0, 0.35), (0.3, 0.6, 0.25), MARRON)
    caja('Cabeza', (0, 0.38, 0.5), (0.24, 0.24, 0.22), MARRON)
    caja('Hocico', (0, 0.52, 0.46), (0.12, 0.1, 0.1), (0.2, 0.15, 0.1))
    for x in (-0.1, 0.1):
        caja('Oreja', (x, 0.36, 0.64), (0.06, 0.08, 0.1), (0.4, 0.25, 0.12))
        for y in (-0.2, 0.2):
            caja('Pata', (x, y, 0.12), (0.08, 0.08, 0.24), MARRON)
    caja('Cola', (0, -0.36, 0.45), (0.05, 0.15, 0.05), MARRON)
    exportar('perro')

def flecha():
    limpiar()
    import bmesh
    me = bpy.data.meshes.new('flecha'); bm = bmesh.new()
    pts = [(-0.15, -0.4), (0.15, -0.4), (0.15, 0.05), (0.32, 0.05), (0, 0.45), (-0.32, 0.05), (-0.15, 0.05)]
    vs = [bm.verts.new((x, y, 0.02)) for x, y in pts]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('flecha', me); bpy.context.collection.objects.link(o)
    o.data.materials.append(mat('amarillo', (1.0, 0.82, 0.05)))
    exportar('flecha')

akia()
perro()
flecha()
edificio('casa', 4, 4, 2.4, PARED, (0.8, 0.3, 0.25), int_casa)
edificio('oficina', 6, 4, 3.0, (0.85, 0.87, 0.9), (0.3, 0.4, 0.6), int_oficina)
edificio('super', 5, 4, 2.8, (0.95, 0.95, 0.9), (0.25, 0.6, 0.35), int_super)
edificio('cafeteria', 4, 4, 2.6, (0.95, 0.85, 0.75), (0.55, 0.3, 0.2), int_cafe)
edificio('gimnasio', 4, 4, 2.8, (0.8, 0.85, 0.95), (0.85, 0.4, 0.15), int_gym)
edificio('biblioteca', 4, 4, 2.8, (0.85, 0.8, 0.7), (0.4, 0.25, 0.5), int_vacio)
edificio('arcade', 4, 4, 2.6, (0.3, 0.25, 0.4), (0.9, 0.3, 0.6), int_vacio)
parque()
arbol()
fuente()
personaje()
