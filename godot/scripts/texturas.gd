class_name Texturas
extends RefCounted
## Texturas pintadas a mano para edificios (generadas con tools/arte/texturas.py).
## * Materiales con nombre (Fachada, Pared, Tejado, Suelo...): StandardMaterial3D
##   con proyeccion triplanar en espacio de mundo (no hacen falta UVs y los
##   ladrillos encajan entre piezas), tintado con el color del material.
## * Material "Color" de las casas (todo lo que no se tine): un shader que lee
##   la capa de textura del alfa del color de vertice -> 1 llamada de dibujo.
## Filtro: mipmaps + anisotropico (sin borrosidad ni parpadeo de lejos).
## Movil/Baja: 256 px sin normales. PC Media: 512. Alta/Ultra: 512 + normales.

const DIR = "res://assets/texturas/"
const CAPAS = ["liso", "madera", "piedra", "ladrillo", "cesped", "parquet", "baldosa", "tejas", "tela", "hormigon"]
## Repeticiones de la textura por metro (tamano del ladrillo, de la tabla...).
const ESCALA = {"liso": 0.5, "madera": 1.0, "piedra": 0.7, "ladrillo": 0.9, "cesped": 0.3, "parquet": 0.6,
	"baldosa": 0.8, "tejas": 0.8, "tela": 1.5, "hormigon": 0.3, "yeso": 0.35, "cristal": 0.9, "asfalto": 0.25}
const RUGOSIDAD = {"cristal": 0.08, "baldosa": 0.45, "liso": 0.8}
## Prefijo del nombre del material del .glb -> textura
const MAPA = {"Fachada": "yeso", "Pared": "yeso", "Tejado": "tejas", "tejado": "tejas", "Techo": "hormigon",
	"Puerta": "madera", "Contraventana": "madera", "Madera": "madera", "Escritorio": "madera", "Barra": "madera",
	"Banco": "madera", "tronco": "madera", "Suelo": "baldosa", "Cesped": "cesped", "Cristal": "cristal",
	"Ventana": "cristal", "piedra": "piedra", "Piedra": "piedra", "Estanteria": "liso", "MesaCafe": "liso", "Caja": "liso"}

const SHADER = """
shader_type spatial;
render_mode cull_back, diffuse_burley, specular_schlick_ggx;
uniform sampler2DArray capas : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float escalas[10];
uniform float nitidez = 6.0;
uniform sampler2DArray normales : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool usar_normales = false;
varying vec3 wpos;
varying vec3 wnrm;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	int id = clamp(int(floor(COLOR.a * 9.0 + 0.5)), 0, 9);
	vec3 b = pow(abs(wnrm), vec3(nitidez));
	b /= (b.x + b.y + b.z);
	vec3 p = wpos * escalas[id];
	float c = float(id);
	vec3 t = texture(capas, vec3(p.zy, c)).rgb * b.x + texture(capas, vec3(p.xz, c)).rgb * b.y + texture(capas, vec3(p.xy, c)).rgb * b.z;
	ALBEDO = COLOR.rgb * t;
	ROUGHNESS = clamp((id == 6 ? 0.5 : 0.85) - (dot(t, vec3(0.333)) - 0.85) * 0.6, 0.2, 1.0);
	if (usar_normales) {
		// Normales triplanares ("whiteout"): se suman en espacio de mundo
		vec3 nx = texture(normales, vec3(p.zy, c)).rgb * 2.0 - 1.0;
		vec3 ny = texture(normales, vec3(p.xz, c)).rgb * 2.0 - 1.0;
		vec3 nz = texture(normales, vec3(p.xy, c)).rgb * 2.0 - 1.0;
		vec3 n = wnrm;
		vec3 nw = normalize(n + vec3(0.0, nx.y, nx.x) * b.x + vec3(ny.x, 0.0, ny.y) * b.y + vec3(nz.x, nz.y, 0.0) * b.z);
		NORMAL = normalize((VIEW_MATRIX * vec4(nw, 0.0)).xyz);
	}
}
"""

static var tam := 512
static var normales := false
static var _tex := {}
static var _mats := {}       # clave -> StandardMaterial3D (se actualizan en caliente)
static var _capas_mat: ShaderMaterial
static var agua: Material = null   # agua con reflejos (PC); null = la del modelo

## Llamar al arrancar y al cambiar la calidad de texturas.
static func configurar(calidad_tex: String, movil: bool) -> void:
	var t = 256 if (movil or calidad_tex == "baja") else 512
	var n = calidad_tex == "alta" and not movil
	if t == tam and n == normales and not _tex.is_empty(): return
	tam = t; normales = n; _tex.clear()
	for k in _mats: _aplicar(_mats[k], _mats[k].get_meta("tipo"))
	if _capas_mat:
		_capas_mat.set_shader_parameter("capas", _array())
		_capas_mat.set_shader_parameter("usar_normales", normales)
		if normales: _capas_mat.set_shader_parameter("normales", _array_normales())

static func _imagen(nombre: String) -> Image:
	var src: Texture2D = load(DIR + nombre + ".png")
	if src == null: return null
	var img: Image = src.get_image()
	if img.is_compressed(): img.decompress()
	img.convert(Image.FORMAT_RGBA8)
	if img.get_width() != tam: img.resize(tam, tam, Image.INTERPOLATE_LANCZOS)
	img.generate_mipmaps()
	return img

static func tex(nombre: String) -> Texture2D:
	if not _tex.has(nombre):
		var img = _imagen(nombre)
		_tex[nombre] = ImageTexture.create_from_image(img) if img else null
	return _tex[nombre]

static func _array() -> Texture2DArray:
	if not _tex.has("__capas"):
		var imgs: Array[Image] = []
		for c in CAPAS: imgs.append(_imagen(c))
		var a = Texture2DArray.new(); a.create_from_images(imgs); _tex["__capas"] = a
	return _tex["__capas"]

## Normales de cada capa (plana si la capa no tiene mapa _n).
static func _array_normales() -> Texture2DArray:
	if not _tex.has("__normales"):
		var imgs: Array[Image] = []
		for c in CAPAS:
			var img: Image = _imagen(c + "_n") if ResourceLoader.exists(DIR + c + "_n.png") else null
			if img == null:
				img = Image.create(tam, tam, false, Image.FORMAT_RGBA8); img.fill(Color(0.5, 0.5, 1.0)); img.generate_mipmaps()
			imgs.append(img)
		var a = Texture2DArray.new(); a.create_from_images(imgs); _tex["__normales"] = a
	return _tex["__normales"]

static func _aplicar(m: StandardMaterial3D, tipo: String) -> void:
	m.albedo_texture = tex(tipo)
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	m.uv1_triplanar = true; m.uv1_world_triplanar = true; m.uv1_triplanar_sharpness = 4.0
	m.uv1_scale = Vector3.ONE * ESCALA.get(tipo, 0.5)
	var hay_n = normales and ResourceLoader.exists(DIR + tipo + "_n.png")
	m.normal_enabled = hay_n
	m.normal_texture = tex(tipo + "_n") if hay_n else null
	m.normal_scale = 0.8

## Material texturizado y tintado (compartido entre todos los que piden lo mismo).
static func material(tipo: String, color: Color, base: BaseMaterial3D = null) -> StandardMaterial3D:
	var clave = tipo + color.to_html()
	if not _mats.has(clave):
		var m: StandardMaterial3D = base.duplicate() if base is StandardMaterial3D else StandardMaterial3D.new()
		m.albedo_color = color; m.roughness = RUGOSIDAD.get(tipo, 0.9); m.set_meta("tipo", tipo)
		_aplicar(m, tipo); _mats[clave] = m
	return _mats[clave]

## Para materiales que el juego ya controla (cristal que brilla de noche...).
static func texturizar(m: StandardMaterial3D, tipo: String) -> void:
	m.set_meta("tipo", tipo); _aplicar(m, tipo); _mats["#" + str(m.get_instance_id())] = m

static func material_capas() -> ShaderMaterial:
	if _capas_mat == null:
		var sh = Shader.new(); sh.code = SHADER
		_capas_mat = ShaderMaterial.new(); _capas_mat.shader = sh
		var esc = PackedFloat32Array()
		for c in CAPAS: esc.append(ESCALA[c])
		_capas_mat.set_shader_parameter("escalas", esc)
		_capas_mat.set_shader_parameter("capas", _array())
		_capas_mat.set_shader_parameter("usar_normales", normales)
		if normales: _capas_mat.set_shader_parameter("normales", _array_normales())
	return _capas_mat

static func tipo_de(nombre_material: String) -> String:
	for p in MAPA:
		if nombre_material.begins_with(p): return MAPA[p]
	return ""

## Viste todas las superficies de un modelo. 'tintes' cambia el color por
## nombre de material (casas de colores distintos); 'saltar' las deja como estan.
static func vestir(inst: Node, tintes: Dictionary = {}, saltar: Array = []) -> void:
	for mi in inst.find_children("*", "MeshInstance3D", true, false):
		var malla: Mesh = mi.mesh
		if malla == null: continue
		for i in malla.get_surface_count():
			var m = malla.surface_get_material(i)
			if m == null: continue
			var n: String = m.resource_name
			if n in saltar: continue
			if n == "agua" and agua:
				mi.set_surface_override_material(i, agua); continue
			if n == "Color":
				mi.set_surface_override_material(i, material_capas()); continue
			var tipo = tipo_de(n)
			if tipo == "" or not (m is BaseMaterial3D): continue
			mi.set_surface_override_material(i, material(tipo, tintes.get(n, m.albedo_color), m))
