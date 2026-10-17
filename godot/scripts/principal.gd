extends Node3D
## Escena principal: el pueblo en 3D, los Sims y la interfaz.

const MODELOS = "res://assets/modelos/"
var escenas = {}
var nodos_edificio = {}     # id -> Node3D
var nodos_agente = {}       # id -> {raiz, anim, gema, pos}
var seleccionado = ""
var techos_visibles = true
var calidad = "medio"
var sol: DirectionalLight3D
var entorno: Environment
var camara_rig: Node3D
var camara: Camera3D
var ui: Control
var _arboles_hechos = false

func _ready() -> void:
	Engine.max_fps = 30   # suficiente para un juego de gestion y ahorra bateria
	Texturas.configurar("media", OS.has_feature("mobile"))
	_crear_mundo()
	ui = preload("res://scripts/interfaz.gd").new()
	ui.principal = self
	var capa = CanvasLayer.new(); add_child(capa); capa.add_child(ui)
	var auto = "medio" if OS.has_feature("mobile") else _calidad_auto()
	G.cargar(auto); calidad = G.preset
	aplicar_graficos()
	Juego.cambiado.connect(_sincronizar)
	_sincronizar()
	if OS.get_cmdline_user_args().has("--captura"): _captura_y_salir()
	if OS.get_cmdline_user_args().has("--prueba"):
		Juego.pueblo.modo = "libre"
		for i in 24 * 20: Juego.tick_hora()
		print("PRUEBA dia=%d dinero=%d edificios=%d propuestas=%s" % [Juego.dia, Juego.empresa.dinero, Juego.pueblo.edificios.size(), Juego.pueblo.propuestas.map(func(x): return x.nombre + "/" + x.estado)])
		for a in Juego.agentes: print("  ", a.nombre, " ", a.necesidades, " moral=", int(a.moral), " dinero=", int(a.dinero), " puntos=", a.puntos)
		var g = JSON.stringify(Juego.exportar()); print("  guardado bytes=", g.length(), " recarga=", Juego.importar(JSON.parse_string(g)))
		get_tree().quit()

func _leer_ajuste(k: String, def):
	var c = ConfigFile.new(); c.load("user://ajustes.cfg")
	return c.get_value("video", k, def)

func _guardar_ajuste(k: String, v) -> void:
	var c = ConfigFile.new(); c.load("user://ajustes.cfg"); c.set_value("video", k, v); c.save("user://ajustes.cfg")

func _notification(what: int) -> void:
	# En segundo plano no se pinta nada (bateria del movil).
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT: Engine.max_fps = 2
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN: Engine.max_fps = 30

# ------------------------------------------------------------- mundo 3D
func _crear_mundo() -> void:
	var we = WorldEnvironment.new()
	entorno = Environment.new()
	entorno.background_mode = Environment.BG_COLOR
	entorno.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	entorno.ambient_light_color = Color(0.75, 0.8, 0.9)
	entorno.ambient_light_energy = 0.35
	entorno.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	we.environment = entorno; add_child(we)
	sol = DirectionalLight3D.new(); sol.light_energy = 1.2; add_child(sol)
	# Suelo y calle
	var suelo = MeshInstance3D.new(); var pm = PlaneMesh.new(); pm.size = Vector2(Juego.ANCHO + 20, Juego.ALTO + 20)
	suelo.mesh = pm; suelo.position = Vector3(Juego.ANCHO / 2.0, 0, Juego.ALTO / 2.0)
	suelo.material_override = Texturas.material("cesped", Color(0.5, 0.78, 0.45)); add_child(suelo)
	var calle = MeshInstance3D.new(); var bm = BoxMesh.new(); bm.size = Vector3(Juego.ANCHO + 20, 0.04, 1.6)
	calle.mesh = bm; calle.position = Vector3(Juego.ANCHO / 2.0, 0.02, Juego.CALLE_Y + 0.5)
	calle.material_override = Texturas.material("asfalto", Color(0.38, 0.38, 0.42)); add_child(calle)
	var linea = MeshInstance3D.new(); var lm = BoxMesh.new(); lm.size = Vector3(Juego.ANCHO + 20, 0.05, 0.08)
	linea.mesh = lm; linea.position = calle.position + Vector3(0, 0.01, 0); linea.material_override = _mat(Color(0.95, 0.9, 0.6)); add_child(linea)
	# Camara
	camara_rig = Node3D.new(); camara_rig.set_script(preload("res://scripts/camara.gd"))
	var cam = Camera3D.new(); cam.name = "Camera3D"; cam.fov = 45; cam.far = 200
	camara_rig.add_child(cam); add_child(camara_rig); camara = cam
	for t in ["casa", "casa_campo", "casa_moderna", "casa_mediterranea", "oficina", "super", "cafeteria", "gimnasio", "biblioteca", "arcade", "parque", "fuente", "arbol", "persona"]:
		escenas[t] = load(MODELOS + t + ".glb")

func _mat(c: Color) -> StandardMaterial3D:
	var m = StandardMaterial3D.new(); m.albedo_color = c; m.roughness = 0.95
	return m

## Arboles con MultiMesh: cientos de arboles cuestan una sola llamada de dibujo.
func _crear_arboles() -> void:
	var lista: Array = Juego.pueblo.arboles
	for parte in [[CylinderMesh.new(), Color(0.45, 0.3, 0.18), 0.5, Vector3(0.3, 1, 0.3)], [SphereMesh.new(), Color(0.3, 0.62, 0.3), 1.5, Vector3(1.4, 1.6, 1.4)]]:
		var mm = MultiMesh.new(); mm.transform_format = MultiMesh.TRANSFORM_3D
		var malla: PrimitiveMesh = parte[0]
		if malla is CylinderMesh: malla.top_radius = 0.5; malla.bottom_radius = 0.5; malla.height = 1; malla.radial_segments = 6
		else: malla.radial_segments = 7; malla.rings = 4
		malla.material = _mat(parte[1])
		# Viento en las copas (solo PC; en movil sigue el material simple)
		if malla is SphereMesh and RenderingServer.get_rendering_device() != null and not OS.has_feature("mobile"): malla.material = GPC.material_arbol(parte[1])
		mm.mesh = malla; mm.instance_count = lista.size()
		for i in lista.size():
			var a = lista[i]
			var s: float = 0.8 + fmod(a[0] * 7.3 + a[1] * 3.1, 0.5)
			mm.set_instance_transform(i, Transform3D(Basis.from_scale(parte[3] * s), Vector3(a[0] + 0.5, parte[2] * s, a[1] + 0.5)))
		var mmi = MultiMeshInstance3D.new(); mmi.multimesh = mm; mmi.name = "Arboles"; add_child(mmi)
	_arboles_hechos = true

func _sincronizar() -> void:
	if not _arboles_hechos: _crear_arboles()
	_luz_del_dia()
	for e in Juego.pueblo.edificios: _edificio(e)
	for a in Juego.agentes: _agente(a)
	if ui: ui.refrescar()

func _luz_del_dia() -> void:
	var h: float = Juego.hora
	var t = (h - 6.0) / 12.0
	var de_dia = h >= 6 and h < 20
	sol.rotation = Vector3(-lerpf(0.2, PI - 0.2, clampf(t, 0, 1)) if de_dia else -0.9, 0.7, 0)
	sol.light_energy = 1.25 if de_dia else 0.15
	sol.light_color = Color(1, 0.85, 0.7) if (h < 8 or h >= 18) else Color(1, 0.98, 0.94)
	var cielo = Color(0.55, 0.75, 0.95)
	if h >= 18 and h < 21: cielo = Color(0.95, 0.6, 0.45)
	elif not de_dia: cielo = Color(0.06, 0.08, 0.18)
	entorno.background_color = cielo
	entorno.ambient_light_energy = 0.55 if de_dia else 0.25
	if _pc_ext:
		var nublado = 0.85 if Juego.clima.get("tipo", "") in ["lluvia", "tormenta", "niebla", "granizo", "nieve"] else 0.0
		GPC.hora(h, nublado)
		entorno.ambient_light_energy = (0.9 if de_dia else 0.12) * (0.5 if entorno.sdfgi_enabled else 1.0)
		# Noche de verdad: luna fria y tenue, niebla sin luz ambiente (asi brillan las ventanas)
		if not de_dia: sol.light_energy = 0.1; sol.light_color = Color(0.6, 0.7, 1.0)
		entorno.volumetric_fog_ambient_inject = 0.3 if de_dia else 0.02
		entorno.volumetric_fog_density = 0.006 if de_dia else 0.003
		entorno.ambient_light_sky_contribution = 0.75 if de_dia else 0.4
		if entorno.sdfgi_enabled: entorno.sdfgi_energy = 0.9 if de_dia else 0.4
	_luces_casas()

func _edificio(e: Dictionary) -> void:
	var n: Node3D = nodos_edificio.get(e.id)
	var t = Juego.tipo_edificio(e.tipo)
	if n == null:
		n = Node3D.new(); n.name = e.id; add_child(n)
		var modelo: String = t.get("modelo", e.tipo)
		if not escenas.has(modelo): modelo = "casa"
		# Casas: 4 estilos y colores distintos por casa (siempre el mismo para cada id).
		if modelo == "casa": modelo = CASAS[_hash_id(e.id) % CASAS.size()]
		var inst: Node3D = escenas[modelo].instantiate(); inst.name = "Modelo"
		if modelo.begins_with("casa"): _vestir_casa(inst, e.id)
		else: Texturas.vestir(inst)
		# Los modelos miran a +Y en Blender: la puerta hacia la calle.
		var arriba: bool = e.y < Juego.CALLE_Y
		inst.rotation.y = 0 if arriba else PI
		n.add_child(inst)
		n.position = Vector3(e.x + e.w / 2.0, 0, e.y + e.h / 2.0)
		# LOD por distancia: los muebles interiores pequenos desaparecen de lejos.
		for mi in inst.find_children("*", "MeshInstance3D", true, false):
			var tam = mi.get_aabb().size.length()
			if tam < 2.0 or mi.name == "Interior" or "Detalle" in mi.name:
				mi.visibility_range_end = maxf(45.0, 35.0 * G.v.get("lod", 1.0)); mi.visibility_range_end_margin = 4.0
				mi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_DISABLED
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var andamio = MeshInstance3D.new(); andamio.name = "Andamio"; var bm = BoxMesh.new(); bm.size = Vector3(e.w, 1, e.h)
		andamio.mesh = bm; var m = _mat(Color(0.95, 0.75, 0.2, 0.55)); m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; andamio.material_override = m
		n.add_child(andamio)
		var cartel = Label3D.new(); cartel.name = "Cartel"; cartel.billboard = BaseMaterial3D.BILLBOARD_ENABLED; cartel.font_size = 48
		cartel.outline_size = 12; cartel.pixel_size = 0.02; cartel.position = Vector3(0, 4, 0); cartel.no_depth_test = true; n.add_child(cartel)
		nodos_edificio[e.id] = n
	var obra: bool = e.progreso < 100
	var modelo_n: Node3D = n.get_node("Modelo")
	modelo_n.scale = Vector3.ONE * (0.25 + 0.75 * e.progreso / 100.0) if obra else Vector3.ONE
	modelo_n.position.y = -2.5 * (1 - e.progreso / 100.0) if obra else 0.0
	var andamio: MeshInstance3D = n.get_node("Andamio")
	andamio.visible = obra
	andamio.scale.y = 3.0; andamio.position.y = 1.5
	var cartel: Label3D = n.get_node("Cartel")
	cartel.text = ("%s %d%%" % [e.nombre, e.progreso]) if obra else e.nombre
	cartel.modulate = Color(1, 0.85, 0.3) if obra else Color(1, 1, 1, 0.85)
	cartel.font_size = 40 if obra else 30
	_techos(n)

func _techos(n: Node) -> void:
	for c in n.find_children("Techo*", "", true, false): c.visible = techos_visibles
	for c in n.find_children("Pared_del*", "", true, false): c.visible = techos_visibles
	_detalle_de(n)

func alternar_techos() -> void:
	techos_visibles = not techos_visibles
	for n in nodos_edificio.values(): _techos(n)

func _agente(a: Dictionary) -> void:
	var d: Dictionary = nodos_agente.get(a.id, {})
	if d.is_empty():
		var raiz = Node3D.new(); raiz.name = "sim_" + a.id; add_child(raiz)
		var cuerpo: Node3D = escenas.persona.instantiate(); cuerpo.scale = Vector3.ONE * 0.9; raiz.add_child(cuerpo)
		var vest = _vestir_sim(cuerpo, a)
		var esc = 0.9 * a.get("altura", 1.0) * (0.6 if a.get("edad", 30) < 12 else (0.85 if a.get("edad", 30) < 18 else 1.0))
		cuerpo.scale = Vector3(esc * a.get("cuerpo", 1.0), esc, esc * a.get("cuerpo", 1.0))
		var anim: AnimationPlayer = cuerpo.find_children("*", "AnimationPlayer", true, false)[0] if cuerpo.find_children("*", "AnimationPlayer", true, false).size() else null
		if anim:
			for an in anim.get_animation_list(): anim.get_animation(an).loop_mode = Animation.LOOP_LINEAR
		# Gema de animo (plumbob): verde = feliz, amarillo = regular, rojo = mal.
		var gema = MeshInstance3D.new(); var gm = SphereMesh.new(); gm.radial_segments = 4; gm.rings = 1; gm.radius = 0.18; gm.height = 0.6
		gema.mesh = gm; gema.position.y = 2.2; raiz.add_child(gema)
		var nombre = Label3D.new(); nombre.text = a.nombre; nombre.billboard = BaseMaterial3D.BILLBOARD_ENABLED; nombre.font_size = 28
		nombre.outline_size = 8; nombre.pixel_size = 0.015; nombre.position.y = 2.65; nombre.no_depth_test = true; raiz.add_child(nombre)
		var inicio = Juego.puerta_de(a.lugar, a.id)
		raiz.position = Vector3(inicio.x, 0, inicio.y)
		var coche = MeshInstance3D.new(); var cm = BoxMesh.new(); cm.size = Vector3(1.6, 0.8, 0.9); coche.mesh = cm
		coche.position.y = 0.4; coche.visible = false; raiz.add_child(coche)
		# Sombra de mancha (blob) barata para movil.
		var mancha = MeshInstance3D.new(); var pm = PlaneMesh.new(); pm.size = Vector2(0.9, 0.9); mancha.mesh = pm
		var mm2 = StandardMaterial3D.new(); mm2.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; mm2.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		var g2 = GradientTexture2D.new(); g2.fill = GradientTexture2D.FILL_RADIAL; g2.fill_from = Vector2(0.5, 0.5); g2.fill_to = Vector2(1, 0.5)
		var gr = Gradient.new(); gr.set_color(0, Color(0, 0, 0, 0.45)); gr.set_color(1, Color(0, 0, 0, 0)); g2.gradient = gr
		mm2.albedo_texture = g2; mancha.material_override = mm2; mancha.position.y = 0.03
		mancha.visible = not sol.shadow_enabled; raiz.add_child(mancha)
		d = {"raiz": raiz, "anim": anim, "gema": gema, "cuerpo": cuerpo, "coche": coche, "uniforme": "", "mancha": mancha, "mat": vest.mat, "caras": vest.caras, "cara": ""}
		nodos_agente[a.id] = d
	# Uniforme de la carrera mientras trabaja.
	var uni: String = Juego.carrera_de(a).uniforme if a.actividad == "trabajar" and a.get("carrera", "") != "parado" else a.color
	if d.uniforme != uni:
		d.uniforme = uni
		d.mat.set_shader_parameter("camisa", Color.html(uni))
	var veh: String = Juego.carrera_de(a).vehiculo if a.lugar == "trabajo" else ""
	d.coche.visible = veh != ""
	if veh != "": d.coche.material_override = _mat(Color.html(Juego.carrera_de(a).uniforme).darkened(0.2))
	var m: float = a.moral
	var c = Color(0.2, 0.9, 0.3) if m > 60 else (Color(0.95, 0.85, 0.2) if m > 30 else Color(0.95, 0.25, 0.2))
	var gm2 = _mat(c); gm2.emission_enabled = true; gm2.emission = c * 0.6
	d.gema.material_override = gm2

var _frame = 0
var _acum_sim = {}
func _process(delta: float) -> void:
	_frame += 1
	_tiempo_visual(delta)
	if _pc_ext: GPC.paso(delta)
	if _fps_lbl and _fps_lbl.visible: _fps_lbl.text = "%d FPS" % Engine.get_frames_per_second()
	for a in Juego.agentes:
		var d: Dictionary = nodos_agente.get(a.id, {})
		if d.is_empty(): continue
		var raiz: Node3D = d.raiz
		# Sims lejos de la camara se actualizan 1 de cada 3 frames (time slicing).
		var lejos = raiz.position.distance_squared_to(camara_rig.objetivo) > 900.0
		_acum_sim[a.id] = _acum_sim.get(a.id, 0.0) + delta
		if lejos and (_frame + Juego.agentes.find(a)) % 3 != 0: continue
		delta = _acum_sim[a.id]; _acum_sim[a.id] = 0.0
		var meta = Juego.puerta_de(a.lugar, a.id)
		# Cada Sim tiene su sitio dentro del edificio (no se apilan).
		var idx = Juego.agentes.find(a)
		var destino = Vector3(meta.x + (idx % 3 - 1) * 1.3, 0, meta.y + (idx / 3 - 0.3) * 1.0)
		# Primero hasta la calle, luego por la calle, luego a la puerta.
		var en_calle = absf(raiz.position.z - (Juego.CALLE_Y + 0.5)) < 0.3
		var objetivo = destino
		if absf(raiz.position.x - destino.x) > 0.5:
			objetivo = Vector3(destino.x, 0, Juego.CALLE_Y + 0.5) if en_calle else Vector3(raiz.position.x, 0, Juego.CALLE_Y + 0.5)
		var dif = objetivo - raiz.position
		var anim = "Idle"
		if dif.length() > 0.08:
			var paso = minf(dif.length(), delta * 3.0 * Juego.velocidad)
			raiz.position += dif.normalized() * paso
			raiz.rotation.y = lerp_angle(raiz.rotation.y, atan2(dif.x, dif.z), 0.25)
			anim = "Walk"
			d.cuerpo.visible = not d.coche.visible
		else:
			d.cuerpo.visible = a.lugar != "trabajo"
			anim = ANIM_ACTIVIDAD.get(a.actividad, "Idle")
		if d.anim and d.anim.current_animation != anim and d.anim.has_animation(anim): d.anim.play(anim, 0.25)
		_cara(d, a, anim)
		d.gema.rotation.y += delta * 2.0
		d.gema.position.y = 2.2 + sin(Time.get_ticks_msec() / 400.0) * 0.06
		d.gema.visible = seleccionado == "" or seleccionado == a.id

func seleccionar(id: String) -> void:
	seleccionado = id
	var d: Dictionary = nodos_agente.get(id, {})
	if not d.is_empty(): camara_rig.objetivo = d.raiz.position; camara_rig._aplicar()
	ui.refrescar()

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed:
		match ev.keycode:
			KEY_F1: modo_camara("libre")
			KEY_F2: modo_camara("seguir")
			KEY_F3: modo_camara("primera")
			KEY_F4: modo_camara("foto")
			KEY_F12:
				var r = "user://foto_%d.png" % Time.get_unix_time_from_system()
				get_viewport().get_texture().get_image().save_png(r); ui._aviso("Foto guardada: " + ProjectSettings.globalize_path(r))
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and ev.double_click:
		_elegir_en(ev.position)
	elif ev is InputEventScreenTouch and ev.double_tap:
		_elegir_en(ev.position)

func _elegir_en(p: Vector2) -> void:
	var cam: Camera3D = camara_rig.get_node("Camera3D")
	var mejor = ""; var md = 60.0
	for id in nodos_agente:
		var pos: Vector3 = nodos_agente[id].raiz.position + Vector3(0, 1, 0)
		if cam.is_position_behind(pos): continue
		var dd = cam.unproject_position(pos).distance_to(p)
		if dd < md: md = dd; mejor = id
	if mejor != "": seleccionar(mejor)

# ------------------------------------------------------------- calidad
var G = preload("res://scripts/graficos.gd").new()
var GPC = preload("res://scripts/graficos_pc.gd").new()
var _pc_ext := false   # extras de PC (cielo, AgX, SDFGI afinado...) activos
var _fps_lbl: Label

func poner_calidad(q: String) -> void:
	calidad = q
	G.poner_preset(q)
	aplicar_graficos()

## Aplica todos los ajustes en caliente.
func aplicar_graficos() -> void:
	var v = G.v
	var vp = get_viewport()
	var pc = RenderingServer.get_rendering_device() != null and not OS.has_feature("mobile")
	var sq = ["no", "baja", "media", "alta", "ultra"].find(v.sombras)
	sol.shadow_enabled = sq > 0
	if sq > 0:
		RenderingServer.directional_shadow_atlas_set_size([0, 1024, 2048, 4096, 8192][sq], true)
		sol.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS if sq >= 3 else DirectionalLight3D.SHADOW_ORTHOGONAL
	sol.directional_shadow_max_distance = v.dist_sombras
	sol.light_angular_distance = 1.5 if v.sombras_suaves else 0.0
	RenderingServer.directional_soft_shadow_filter_set_quality(RenderingServer.SHADOW_QUALITY_SOFT_HIGH if v.sombras_suaves else RenderingServer.SHADOW_QUALITY_HARD)
	entorno.sdfgi_enabled = pc and v.gi
	entorno.ssao_enabled = pc and v.ssao
	entorno.ssr_enabled = pc and v.ssr
	entorno.ssil_enabled = pc and v.ssil
	entorno.volumetric_fog_enabled = pc and v.niebla
	entorno.volumetric_fog_density = 0.0025; entorno.volumetric_fog_length = 120
	if pc and v.gi:
		entorno.sdfgi_energy = 0.7; entorno.ambient_light_energy = 0.25; entorno.ssao_intensity = 1.6
	entorno.glow_enabled = v.bloom; entorno.glow_intensity = 0.35; entorno.glow_bloom = 0.03
	# Antialiasing y escala
	vp.msaa_3d = Viewport.MSAA_DISABLED; vp.use_taa = false; vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_DISABLED
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	match v.aa:
		"fxaa": vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA
		"smaa": vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_SMAA
		"msaa2": vp.msaa_3d = Viewport.MSAA_2X
		"msaa4": vp.msaa_3d = Viewport.MSAA_4X
		"taa": vp.use_taa = pc
	# Escalado: FSR 2.2 (Forward+/Mobile con Vulkan/D3D12), FSR 1 o bilineal.
	# Solo afecta al 3D: la interfaz se dibuja siempre a resolucion completa.
	var esc: String = v.get("escalado", "Desactivado (100 %)")
	var rd = RenderingServer.get_rendering_device() != null
	vp.fsr_sharpness = 2.0 * (1.0 - clampf(v.get("nitidez", 0.8), 0.0, 1.0))
	if esc.begins_with("FSR 2") and rd:
		vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR2; vp.scaling_3d_scale = G.ESCALA_DE[esc]
		vp.msaa_3d = Viewport.MSAA_DISABLED; vp.use_taa = false   # FSR 2 ya hace su propio antialiasing temporal
	elif esc.begins_with("FSR") and rd:
		vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR; vp.scaling_3d_scale = G.ESCALA_DE.get(esc, 0.77)
	elif esc.begins_with("FSR"):
		vp.scaling_3d_scale = G.ESCALA_DE.get(esc, 0.77)   # Compatibility: bilineal
	elif esc.begins_with("Bilineal"):
		vp.scaling_3d_scale = v.escala / 100.0
	else:
		vp.scaling_3d_scale = 1.0
	vp.mesh_lod_threshold = 4.0 / v.lod
	Texturas.configurar(v.texturas, OS.has_feature("mobile") or OS.get_cmdline_user_args().has("--movil"))
	ProjectSettings.set_setting("rendering/textures/default_filters/texture_mipmap_bias", {"baja": 1.0, "media": 0.0, "alta": -0.5}[v.texturas])
	camara.far = v.vista
	Engine.max_fps = {"30": 30, "60": 60, "90": 90, "120": 120}.get(v.fps, 0)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if v.vsync else DisplayServer.VSYNC_DISABLED)
	# Profundidad de campo y "desenfoque de movimiento" (aprox. con DOF lejano en camara)
	var attr = CameraAttributesPractical.new()
	attr.dof_blur_far_enabled = v.dof; attr.dof_blur_far_distance = 60; attr.dof_blur_amount = 0.06
	attr.dof_blur_near_enabled = v.desenfoque and pc; attr.dof_blur_near_distance = 4
	camara.attributes = attr
	# Brillo, gamma y gradacion
	entorno.adjustment_enabled = true
	entorno.adjustment_brightness = v.brillo; entorno.adjustment_contrast = v.gamma
	entorno.adjustment_saturation = {"neutra": 1.0, "cartoon": 1.35, "cálida": 1.1, "cine": 1.05}[v.color]
	entorno.tonemap_mode = Environment.TONE_MAPPER_ACES if v.color == "cine" else Environment.TONE_MAPPER_LINEAR
	entorno.tonemap_exposure = 0.85 if v.color == "cine" else 1.0
	if v.color == "cine": entorno.adjustment_saturation = 1.2
	sol.light_color = Color(1, 0.93, 0.8) if v.color in ["cartoon", "cálida"] else Color(1, 0.98, 0.95)
	if v.color == "cartoon":
		entorno.ambient_light_energy = 0.9; entorno.ambient_light_color = Color(1, 0.95, 0.85)
	camara_rig.inclinacion_fija = 52.0 if v.color == "cartoon" and OS.has_feature("mobile") else -1.0
	_pc_ext = pc and v.get("cielo", false)
	GPC.aplicar(entorno, sol, v, _pc_ext, calidad == "ultra")
	Texturas.agua = GPC.material_agua() if pc else null
	if _pc_ext: _luz_del_dia()
	for d in nodos_agente.values(): d.mancha.visible = not sol.shadow_enabled
	_detalle_casas()
	_hierba(v.hierba)
	if _fps_lbl == null:
		_fps_lbl = Label.new(); ui.add_child(_fps_lbl); _fps_lbl.text = "000 FPS"
		_fps_lbl.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT, Control.PRESET_MODE_MINSIZE, 14); _fps_lbl.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_fps_lbl.visible = v.contador

## Elige Ultra en GPUs dedicadas potentes.
func _calidad_auto() -> String:
	var gpu = RenderingServer.get_video_adapter_name().to_lower()
	var tipo = RenderingServer.get_video_adapter_type()
	if tipo == RenderingDevice.DEVICE_TYPE_DISCRETE_GPU and (gpu.contains("rtx") or gpu.contains("rx 6") or gpu.contains("rx 7") or gpu.contains("rx 9") or gpu.contains("arc")): return "ultra"
	if tipo == RenderingDevice.DEVICE_TYPE_DISCRETE_GPU: return "alto"
	return "medio"

var _nodo_hierba: MultiMeshInstance3D
func _hierba(densidad: float) -> void:
	if densidad <= 0:
		if _nodo_hierba: _nodo_hierba.visible = false
		return
	if _nodo_hierba:
		_nodo_hierba.visible = true; _nodo_hierba.multimesh.visible_instance_count = int(_nodo_hierba.multimesh.instance_count * densidad / 100.0); return
	var hoja = PrismMesh.new(); hoja.size = Vector3(0.06, 0.35, 0.02)
	var m = ShaderMaterial.new(); m.shader = Shader.new()
	m.shader.code = "shader_type spatial; render_mode cull_disabled; uniform float viento = 0.06;\nvoid vertex(){ vec3 w = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz; VERTEX.x += sin(TIME*2.0 + w.x*0.7 + w.z*0.5) * viento * (VERTEX.y + 0.17); }\nvoid fragment(){ ALBEDO = mix(vec3(0.2,0.45,0.15), vec3(0.42,0.7,0.28), UV.y); ROUGHNESS = 0.9; }"
	hoja.material = m
	var mm = MultiMesh.new(); mm.transform_format = MultiMesh.TRANSFORM_3D; mm.mesh = hoja
	var pos = []
	var rng = RandomNumberGenerator.new(); rng.seed = 7
	while pos.size() < 20000:
		var x = rng.randf_range(0, Juego.ANCHO); var z = rng.randf_range(0, Juego.ALTO)
		if absf(z - (Juego.CALLE_Y + 0.5)) < 1.6: continue
		var libre = true
		for e in Juego.pueblo.edificios:
			if x > e.x - 0.3 and x < e.x + e.w + 0.3 and z > e.y - 0.3 and z < e.y + e.h + 0.3: libre = false; break
		if libre: pos.append(Vector3(x, 0.17, z))
	mm.instance_count = pos.size()
	for i in pos.size():
		var t = Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.6, 1.4)), pos[i])
		mm.set_instance_transform(i, t)
	_nodo_hierba = MultiMeshInstance3D.new(); _nodo_hierba.multimesh = mm
	_nodo_hierba.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; add_child(_nodo_hierba)
	mm.visible_instance_count = int(mm.instance_count * densidad / 100.0)

## Elige Ultra en GPUs dedicadas potentes.
func _captura_y_salir() -> void:
	var args = OS.get_cmdline_user_args()
	for i in 6: Juego.tick_hora()
	if args.has("--sin-techos"): alternar_techos()
	if args.has("--noche"): Juego.hora = 22; _sincronizar()
	if args.has("--sim"): seleccionar(Juego.agentes[0].id); camara_rig.distancia = 14; camara_rig._aplicar()
	if args.has("--escaparate"):
		# Los 4 estilos de casa en fila, fuera del pueblo (capturas/comparativas)
		for i in CASAS.size():
			var inst: Node3D = escenas[CASAS[i]].instantiate()
			inst.position = Vector3(6 + i * 4.8, 0, Juego.ALTO + 3.0); _vestir_casa(inst, "escaparate%d" % (i * 7 + 3))
			var n = Node3D.new(); n.name = "escaparate_%d" % i; add_child(n); n.add_child(inst); nodos_edificio[n.name] = n; _techos(n)
		camara_rig.distancia = 16.0; camara_rig.yaw = 0.18; camara_rig.pitch = -0.58; camara_rig._aplicar()
		camara_rig.position = Vector3(13.2, 0.8, Juego.ALTO + 3.0)
	if args.has("--desfile"):
		# Fila de Sims fuera del pueblo: cada uno con una animacion y animo distintos.
		var anims = ["Idle", "Walk", "Wave", "Dance", "Eat", "Sit", "Idle", "Wave", "Dance", "Sleep"]
		var nombres = ["Aisha", "Kenji", "Lucía", "Kwame", "Priya", "Lars", "Mei", "Thiago", "Amara", "Iker"]
		for i in anims.size():
			var fa = {"id": "desfile%d" % (i * 13 + 5), "color": Color.from_hsv(fmod(i * 0.137, 1.0), 0.6, 0.9).to_html(), "moral": [90, 70, 85, 95, 50, 40, 20, 80, 90, 60][i],
				"piel": Juego.PIELES[(i * 3) % Juego.PIELES.size()], "pelo": Juego.PELOS[i % Juego.PELOS.size()], "peinado": PEINADOS[i % PEINADOS.size()], "falda": i in [2, 5, 8]}
			var c: Node3D = escenas.persona.instantiate(); var v = _vestir_sim(c, fa)
			c.position = Vector3(6 + i * 1.3, 0, Juego.ALTO + 3.0); add_child(c)
			var ap: AnimationPlayer = c.find_children("*", "AnimationPlayer", true, false)[0]
			for an in ap.get_animation_list(): ap.get_animation(an).loop_mode = Animation.LOOP_LINEAR
			ap.play(anims[i]); ap.seek(0.3 + i * 0.17, true)
			_cara({"cara": "", "caras": v.caras}, fa, anims[i])
		camara_rig.distancia = float(args[args.find("--desfile") + 1]) if args.size() > args.find("--desfile") + 1 and args[args.find("--desfile") + 1].is_valid_float() else 8.0
		camara_rig.yaw = 0.0; camara_rig.pitch = -0.32; camara_rig._aplicar()
		camara_rig.position = Vector3(6 + 4.5 * 1.3, 0.9, Juego.ALTO + 3.0)
	if args.has("--casa"):
		# Encuadra la casa N (para capturas de los modelos nuevos)
		var casas = Juego.pueblo.edificios.filter(func(e): return e.tipo == "casa" and e.progreso >= 100)
		if casas.size():
			var e = casas[int(args[args.find("--casa") + 1]) % casas.size()]
			camara_rig.objetivo = Vector3(e.x + e.w / 2.0, 0.8, e.y + e.h / 2.0); camara_rig.distancia = 11.0
			camara_rig.yaw = -0.6 if e.y < Juego.CALLE_Y else PI - 0.6; camara_rig.pitch = -0.85; camara_rig._aplicar()
			print("CASA ", e.nombre, " modelo=", CASAS[_hash_id(e.id) % CASAS.size()], " total=", casas.size())
	if args.has("--clima"):
		Juego.clima.tipo = args[args.find("--clima") + 1]; Juego.clima.horas = 99
		if Juego.clima.tipo == "nieve": Juego.clima.nieve = 0.8
		elif Juego.clima.tipo == "despejado": Juego.clima.nieve = 0.0; Juego.clima.charcos = 0.0
		else: Juego.clima.charcos = 1.0
	if args.has("--perf"):
		var q = args[args.find("--perf") + 1]
		if q == "movil": G.v = G.PRESETS.medio_movil.duplicate(); G.v.contador = false; aplicar_graficos()
		elif q == "v21":
			# Ultra tal y como estaba en la 2.1 (sin los extras nuevos de PC), para comparar
			poner_calidad("ultra"); G.v.cielo = false
		else: poner_calidad(q)
		if args.has("--fsr2"): G.v.escalado = "FSR 2.2 · Calidad"
		G.v.fps = "sin límite"; G.v.vsync = false; aplicar_graficos()
		Juego.velocidad = 8.0
		for i in 120: await get_tree().process_frame
		var t0 = Time.get_ticks_usec(); var frames = 0; var peor = 0.0; var dc = 0.0
		while Time.get_ticks_usec() - t0 < 8000000:
			var f0 = Time.get_ticks_usec()
			await get_tree().process_frame
			var ft = (Time.get_ticks_usec() - f0) / 1000.0
			peor = maxf(peor, ft); frames += 1
			dc += Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		var seg = (Time.get_ticks_usec() - t0) / 1000000.0
		print("PERF %s fps=%.1f ms=%.2f peor=%.1fms drawcalls=%d objetos=%d ram=%.0fMB vram=%.0fMB" % [q, frames / seg, seg * 1000.0 / frames, peor, dc / frames,
			Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME), OS.get_static_memory_usage() / 1048576.0,
			Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0])
		get_tree().quit(); return
	if args.has("--bench"):
		MotorIA.backend = "local"; MotorIA.modelo = args[args.find("--bench") + 1]
		MotorIA.benchmark(); MotorIA.benchmark()
		get_tree().quit(); return
	if args.has("--ultra"): poner_calidad("ultra")
	if args.has("--v21"): G.v.cielo = false; aplicar_graficos()
	if args.has("--fsr2"): G.v.escalado = "FSR 2.2 · Calidad"; aplicar_graficos()
	if args.has("--movil"): G.v = G.PRESETS.medio_movil.duplicate(); G.v.contador = true; calidad = "medio"; aplicar_graficos()
	if args.has("--pestana"): ui.abrir(args[args.find("--pestana") + 1])
	if args.has("--sin-ui"):
		ui.visible = false
		for l in find_children("*", "Label3D", true, false): l.visible = false
	for i in 90: await get_tree().process_frame
	var img = get_viewport().get_texture().get_image()
	var ruta: String = args[args.find("--captura") + 1]
	img.save_png(ruta)
	get_tree().quit()


# ------------------------------------------------------------- tiempo atmosferico (visual)
var _lluvia: GPUParticles3D
var _nieve_p: GPUParticles3D
var _manto: MeshInstance3D
var _rayo = 0.0
var _clima_visto = ""

func _particulas(color: Color, tam: Vector2, vel: float, cantidad: int) -> GPUParticles3D:
	var p = GPUParticles3D.new(); p.amount = cantidad; p.lifetime = 1.6 if vel > 5 else 5.0
	p.visibility_aabb = AABB(Vector3(-30, -20, -30), Vector3(60, 40, 60))
	var pm = ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX; pm.emission_box_extents = Vector3(25, 0.5, 25)
	pm.direction = Vector3(0.15, -1, 0); pm.spread = 3 if vel > 5 else 25; pm.initial_velocity_min = vel; pm.initial_velocity_max = vel * 1.2; pm.gravity = Vector3(0, -2, 0)
	p.process_material = pm
	var q = QuadMesh.new(); q.size = tam
	var m = StandardMaterial3D.new(); m.albedo_color = color; m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y if vel > 5 else BaseMaterial3D.BILLBOARD_ENABLED
	q.material = m; p.draw_pass_1 = q
	p.position.y = 18; p.emitting = false; add_child(p)
	return p

func _tiempo_visual(delta: float) -> void:
	var movil = OS.has_feature("mobile")
	var budget = 1.0 if not movil else 0.12   # presupuesto de particulas
	if _lluvia == null:
		_lluvia = _particulas(Color(0.7, 0.8, 1, 0.55), Vector2(0.03, 0.5), 18, int(5000 * budget))
		_nieve_p = _particulas(Color(1, 1, 1, 0.9), Vector2(0.07, 0.07), 1.5, int(3000 * budget))
		_manto = MeshInstance3D.new(); var pm = PlaneMesh.new(); pm.size = Vector2(Juego.ANCHO + 20, Juego.ALTO + 20); _manto.mesh = pm
		var mm = StandardMaterial3D.new(); mm.albedo_color = Color(1, 1, 1, 0); mm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; mm.roughness = 0.9
		_manto.material_override = mm; _manto.position = Vector3(Juego.ANCHO / 2.0, 0.07, Juego.ALTO / 2.0); add_child(_manto)
	var c = Juego.clima
	var t: String = c.tipo
	_lluvia.global_position = Vector3(camara_rig.objetivo.x, 18, camara_rig.objetivo.z)
	_nieve_p.global_position = _lluvia.global_position
	_lluvia.emitting = t in ["lluvia", "tormenta", "granizo"]
	_nieve_p.emitting = t == "nieve"
	if t == "granizo": _lluvia.draw_pass_1.size = Vector2(0.08, 0.08)
	elif _lluvia.draw_pass_1.size.x != 0.03: _lluvia.draw_pass_1.size = Vector2(0.03, 0.5)
	# Manto de nieve que cuaja y suelo mojado reflectante (charcos) en Alto/Ultra.
	var mat: StandardMaterial3D = _manto.material_override
	var alto = calidad in ["alto", "ultra"]
	if c.nieve > 0.01:
		mat.albedo_color = Color(0.97, 0.98, 1, c.nieve * 0.9); mat.roughness = 0.9; mat.metallic = 0.0
	elif alto and c.charcos > 0.01:
		mat.albedo_color = Color(0.25, 0.3, 0.35, c.charcos * 0.35); mat.roughness = 0.05; mat.metallic = 0.3
	else: mat.albedo_color.a = 0.0
	# Niebla
	entorno.fog_enabled = t == "niebla" or (t in ["lluvia", "tormenta"] and not movil)
	entorno.fog_density = 0.04 if t == "niebla" else 0.008
	entorno.fog_light_color = Color(0.75, 0.78, 0.82)
	# Tormenta: relampagos y trueno
	if t == "tormenta" and randf() < delta * 0.15 * Juego.velocidad: _rayo = 1.0; _trueno()
	_rayo = maxf(0.0, _rayo - delta * 4)
	sol.light_energy = lerpf(sol.light_energy, (0.5 if t in ["lluvia", "tormenta", "nublado", "niebla", "nieve", "granizo"] else (1.5 if t == "calor" else 1.2)) if not Juego.es_noche() else 0.15, 0.05) + _rayo * 3.0
	# Viento: la hierba se mece (shader de vertices, sin coste de CPU)
	if _nodo_hierba: _nodo_hierba.multimesh.mesh.material.set_shader_parameter("viento", 0.25 if t in ["tormenta", "lluvia", "granizo"] else 0.06)
	if _clima_visto != t:
		_clima_visto = t
		if ui: ui.refrescar()

func _trueno() -> void:
	var f = "res://assets/kenney/sfx/trueno.ogg"
	if not ResourceLoader.exists(f): return
	var a = AudioStreamPlayer.new(); a.stream = load(f); a.volume_db = -6; add_child(a); a.play()
	a.finished.connect(a.queue_free)

func modo_camara(m: String) -> void:
	camara_rig.poner_modo(m)
	if m in ["seguir", "primera"]:
		var d = nodos_agente.get(seleccionado, {})
		if not d.is_empty(): camara_rig.seguir_a = d.raiz
	ui.visible = m != "foto"


# ------------------------------------------------------------- casas 2.2
const CASAS = ["casa", "casa_campo", "casa_moderna", "casa_mediterranea"]
const PALETA_FACHADA = ["#f4ead8", "#f7d9c4", "#dce8f2", "#e6f0d8", "#f6e7a8", "#f2d0d6", "#d9d3ec", "#ffffff", "#c9dfe0", "#efc9a4"]
const PALETA_TEJADO = ["#c4473a", "#5a6b8c", "#3f6e52", "#8a4f3a", "#2f3a4a", "#b86a2c", "#7a3e5c"]
const PALETA_PUERTA = ["#2f6fb0", "#c0392b", "#2e8b57", "#f1c40f", "#6d4c41", "#1f2937", "#e67e22", "#8e44ad"]
var _cristal_casas: StandardMaterial3D
var _lampara_casas: StandardMaterial3D
var _luces: Array = []

func _hash_id(t: String) -> int:
	var h = 5381
	for c in t: h = ((h << 5) + h + c.unicode_at(0)) & 0x7fffffff
	return h

func _mat_compartido(nombre: String) -> StandardMaterial3D:
	if nombre == "Cristal":
		if _cristal_casas == null:
			_cristal_casas = StandardMaterial3D.new(); _cristal_casas.albedo_color = Color(0.55, 0.78, 0.95); _cristal_casas.roughness = 0.08
			_cristal_casas.metallic = 0.2; _cristal_casas.emission_enabled = true; _cristal_casas.emission = Color(1.0, 0.78, 0.45)
			Texturas.texturizar(_cristal_casas, "cristal")
		return _cristal_casas
	if _lampara_casas == null:
		_lampara_casas = StandardMaterial3D.new(); _lampara_casas.albedo_color = Color(1, 0.93, 0.72)
		_lampara_casas.emission_enabled = true; _lampara_casas.emission = Color(1, 0.85, 0.55)
	return _lampara_casas

## Tine fachada/tejado/puerta por casa y comparte cristal y lamparas (que
## brillan de noche con un solo cambio de material para todo el pueblo).
func _vestir_casa(inst: Node3D, id: String) -> void:
	var h = _hash_id(id)
	var colores = {
		"Fachada": Color.html(PALETA_FACHADA[h % PALETA_FACHADA.size()]),
		"Tejado": Color.html(PALETA_TEJADO[(h >> 4) % PALETA_TEJADO.size()]),
		"Puerta": Color.html(PALETA_PUERTA[(h >> 8) % PALETA_PUERTA.size()]),
		"Contraventana": Color.html(PALETA_PUERTA[(h >> 12) % PALETA_PUERTA.size()]).lightened(0.15),
	}
	# Texturas pintadas (yeso, tejas, madera, ladrillo...) tintadas por casa.
	Texturas.vestir(inst, colores, ["Cristal", "Lampara"])
	for mi in inst.find_children("*", "MeshInstance3D", true, false):
		var malla: Mesh = mi.mesh
		if malla == null: continue
		for i in malla.get_surface_count():
			var m = malla.surface_get_material(i)
			if m and m.resource_name in ["Cristal", "Lampara"]: mi.set_surface_override_material(i, _mat_compartido(m.resource_name))
	# Puntos de luz interiores (se encienden de noche; solo con sombras/PC)
	for p in inst.find_children("Luz_*", "", true, false):
		var l = OmniLight3D.new(); l.light_color = Color(1, 0.74, 0.46); l.omni_range = 3.2 if not "porche" in p.name else 2.4
		l.light_energy = 0.0; l.shadow_enabled = false; l.visible = false; l.distance_fade_enabled = true; l.distance_fade_begin = 40; l.distance_fade_length = 10
		p.add_child(l); _luces.append(l)
	_detalle_de(inst)
	_luces_casas()

func _detalle_de(n: Node) -> void:
	var alto = calidad in ["alto", "ultra"] or G.v.get("lod", 1.0) >= 2.0
	for d in n.find_children("*Detalle*", "MeshInstance3D", true, false):
		d.set_meta("detalle", true); d.visible = alto and (techos_visibles or not d.name.begins_with("Techo"))

func _detalle_casas() -> void:
	for n in nodos_edificio.values(): _detalle_de(n)
	_luces_casas()

func _luces_casas() -> void:
	var h: float = Juego.hora
	var noche = h >= 19 or h < 7
	var anoche = clampf((h - 18.0) / 2.0, 0, 1) if h >= 18 else (1.0 if h < 6 else clampf((7.0 - h), 0, 1))
	if _cristal_casas: _cristal_casas.emission_energy_multiplier = 1.4 * anoche
	if _lampara_casas: _lampara_casas.emission_energy_multiplier = 0.3 + 2.0 * anoche
	# Luces reales solo en PC (Forward+) y calidad media o superior
	var pc = not OS.has_feature("mobile") and calidad != "bajo"
	for l in _luces:
		if not is_instance_valid(l): continue
		l.visible = pc and noche
		l.light_energy = (1.5 if _pc_ext else 1.1) * anoche

# ================================================================ SIMS
## Animacion segun lo que hace el Sim cuando ya ha llegado.
const ANIM_ACTIVIDAD = {"dormir": "Sleep", "trabajar": "Sit", "videojuegos": "Sit", "cafeteria": "Eat", "cocinar": "Eat",
	"picoteo": "Eat", "charlar": "Wave", "parque": "Dance", "gimnasio": "Dance"}
const PEINADOS = ["corto", "largo", "coleta", "mono", "afro", "rapado"]
const PANTALONES = ["#2f3e5c", "#3b3b3b", "#6b4f3a", "#556b2f", "#8a8f99", "#1f4e79", "#7a2e3a", "#c2b280", "#d9d4c7"]
const ZAPATOS = ["#222222", "#f2f2f2", "#7a4a2a", "#b03030", "#2a5db0", "#e0b030"]
const SHADER_SIM = """
shader_type spatial;
render_mode cull_back, diffuse_burley, specular_schlick_ggx;
uniform vec3 piel : source_color = vec3(0.88, 0.67, 0.51);
uniform vec3 camisa : source_color = vec3(0.25, 0.55, 0.85);
uniform vec3 pantalon : source_color = vec3(0.2, 0.22, 0.35);
uniform vec3 zapatos : source_color = vec3(0.13, 0.13, 0.13);
uniform vec3 pelo : source_color = vec3(0.23, 0.14, 0.08);
uniform bool manga_larga = false;
uniform bool pierna_larga = true;
void fragment() {
	int s = int(floor(COLOR.a * 8.0 + 0.5));
	vec3 c = COLOR.rgb;
	if (s == 1) c *= piel;
	else if (s == 2) c *= camisa;
	else if (s == 3) c *= pantalon;
	else if (s == 4) c *= zapatos;
	else if (s == 5) c *= pelo;
	else if (s == 6) c *= manga_larga ? camisa : piel;
	else if (s == 7) c *= pierna_larga ? pantalon : piel;
	ALBEDO = c;
	ROUGHNESS = s == 5 ? 0.55 : (s == 0 ? 0.35 : 0.85);
	RIM = 0.25; RIM_TINT = 0.6;
}
"""
var _shader_sim: Shader

## Piel, ropa y peinado (siempre los mismos para cada Sim). Un material por Sim.
func _vestir_sim(cuerpo: Node3D, a: Dictionary) -> Dictionary:
	if _shader_sim == null: _shader_sim = Shader.new(); _shader_sim.code = SHADER_SIM
	var h = _hash_id(a.id)
	var m = ShaderMaterial.new(); m.shader = _shader_sim
	m.set_shader_parameter("piel", Color.html(a.get("piel", "#e0ac83")))
	m.set_shader_parameter("pelo", Color.html(a.get("pelo", "#3b2414")))
	m.set_shader_parameter("camisa", Color.html(a.color))
	m.set_shader_parameter("pantalon", Color.html(PANTALONES[(h >> 3) % PANTALONES.size()]))
	m.set_shader_parameter("zapatos", Color.html(ZAPATOS[(h >> 7) % ZAPATOS.size()]))
	var falda = a.get("falda", (h >> 11) % 4 == 0)
	m.set_shader_parameter("manga_larga", (h >> 13) % 3 == 0)
	m.set_shader_parameter("pierna_larga", not falda and (h >> 15) % 5 != 0)
	var peinado: String = a.get("peinado", PEINADOS[(h >> 17) % PEINADOS.size()])
	var caras = {}
	for mi in cuerpo.find_children("*", "MeshInstance3D", true, false):
		mi.material_override = m
		var n: String = mi.name
		if n.begins_with("Pelo_"): mi.visible = n == "Pelo_" + peinado
		elif n == "Falda": mi.visible = falda
		elif n.begins_with("Cara_"): caras[n.substr(5)] = mi; mi.visible = n == "Cara_normal"
	return {"mat": m, "caras": caras}

## Expresion segun el animo (o dormido).
func _cara(d: Dictionary, a: Dictionary, anim: String) -> void:
	var m: float = a.moral
	var c = "dormida" if anim == "Sleep" else ("feliz" if m > 60 or anim == "Dance" else ("normal" if m > 30 else "triste"))
	if c == d.cara or not d.caras.has(c): return
	d.cara = c
	for k in d.caras: d.caras[k].visible = k == c
