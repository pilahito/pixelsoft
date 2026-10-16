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
var ui: Control
var _arboles_hechos = false

func _ready() -> void:
	Engine.max_fps = 30   # suficiente para un juego de gestion y ahorra bateria
	_crear_mundo()
	ui = preload("res://scripts/interfaz.gd").new()
	ui.principal = self
	var capa = CanvasLayer.new(); add_child(capa); capa.add_child(ui)
	var auto = "bajo" if OS.has_feature("mobile") else "medio"
	poner_calidad(_leer_ajuste("calidad", auto))
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
	suelo.material_override = _mat(Color(0.42, 0.68, 0.36)); add_child(suelo)
	var calle = MeshInstance3D.new(); var bm = BoxMesh.new(); bm.size = Vector3(Juego.ANCHO + 20, 0.04, 1.6)
	calle.mesh = bm; calle.position = Vector3(Juego.ANCHO / 2.0, 0.02, Juego.CALLE_Y + 0.5)
	calle.material_override = _mat(Color(0.35, 0.35, 0.38)); add_child(calle)
	var linea = MeshInstance3D.new(); var lm = BoxMesh.new(); lm.size = Vector3(Juego.ANCHO + 20, 0.05, 0.08)
	linea.mesh = lm; linea.position = calle.position + Vector3(0, 0.01, 0); linea.material_override = _mat(Color(0.95, 0.9, 0.6)); add_child(linea)
	# Camara
	camara_rig = Node3D.new(); camara_rig.set_script(preload("res://scripts/camara.gd"))
	var cam = Camera3D.new(); cam.name = "Camera3D"; cam.fov = 45; cam.far = 200
	camara_rig.add_child(cam); add_child(camara_rig)
	for t in ["casa", "oficina", "super", "cafeteria", "gimnasio", "biblioteca", "arcade", "parque", "fuente", "arbol", "personaje"]:
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

func _edificio(e: Dictionary) -> void:
	var n: Node3D = nodos_edificio.get(e.id)
	var t = Juego.tipo_edificio(e.tipo)
	if n == null:
		n = Node3D.new(); n.name = e.id; add_child(n)
		var modelo: String = t.get("modelo", e.tipo)
		if not escenas.has(modelo): modelo = "casa"
		var inst: Node3D = escenas[modelo].instantiate(); inst.name = "Modelo"
		# Los modelos miran a +Y en Blender: la puerta hacia la calle.
		var arriba: bool = e.y < Juego.CALLE_Y
		inst.rotation.y = 0 if arriba else PI
		n.add_child(inst)
		n.position = Vector3(e.x + e.w / 2.0, 0, e.y + e.h / 2.0)
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

func alternar_techos() -> void:
	techos_visibles = not techos_visibles
	for n in nodos_edificio.values(): _techos(n)

func _agente(a: Dictionary) -> void:
	var d: Dictionary = nodos_agente.get(a.id, {})
	if d.is_empty():
		var raiz = Node3D.new(); raiz.name = "sim_" + a.id; add_child(raiz)
		var cuerpo: Node3D = escenas.personaje.instantiate(); cuerpo.scale = Vector3.ONE * 0.9; raiz.add_child(cuerpo)
		var color = Color.html(a.color)
		for mi in cuerpo.find_children("*", "MeshInstance3D", true, false):
			if "Torso" in mi.name or "Brazo" in mi.name: mi.material_override = _mat(color)
		var anim: AnimationPlayer = cuerpo.find_children("*", "AnimationPlayer", true, false)[0] if cuerpo.find_children("*", "AnimationPlayer", true, false).size() else null
		# Gema de animo (plumbob): verde = feliz, amarillo = regular, rojo = mal.
		var gema = MeshInstance3D.new(); var gm = SphereMesh.new(); gm.radial_segments = 4; gm.rings = 1; gm.radius = 0.18; gm.height = 0.6
		gema.mesh = gm; gema.position.y = 2.2; raiz.add_child(gema)
		var nombre = Label3D.new(); nombre.text = a.nombre; nombre.billboard = BaseMaterial3D.BILLBOARD_ENABLED; nombre.font_size = 28
		nombre.outline_size = 8; nombre.pixel_size = 0.015; nombre.position.y = 2.65; nombre.no_depth_test = true; raiz.add_child(nombre)
		var inicio = Juego.puerta_de(a.lugar, a.id)
		raiz.position = Vector3(inicio.x, 0, inicio.y)
		d = {"raiz": raiz, "anim": anim, "gema": gema}
		nodos_agente[a.id] = d
	var m: float = a.moral
	var c = Color(0.2, 0.9, 0.3) if m > 60 else (Color(0.95, 0.85, 0.2) if m > 30 else Color(0.95, 0.25, 0.2))
	var gm2 = _mat(c); gm2.emission_enabled = true; gm2.emission = c * 0.6
	d.gema.material_override = gm2

func _process(delta: float) -> void:
	for a in Juego.agentes:
		var d: Dictionary = nodos_agente.get(a.id, {})
		if d.is_empty(): continue
		var raiz: Node3D = d.raiz
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
		else:
			anim = {"dormir": "Sleep", "trabajar": "Sit", "videojuegos": "Sit", "cafeteria": "Sit"}.get(a.actividad, "Idle")
		if d.anim and d.anim.current_animation != anim and d.anim.has_animation(anim): d.anim.play(anim, 0.2)
		d.gema.rotation.y += delta * 2.0
		d.gema.position.y = 2.2 + sin(Time.get_ticks_msec() / 400.0) * 0.06
		d.gema.visible = seleccionado == "" or seleccionado == a.id

func seleccionar(id: String) -> void:
	seleccionado = id
	var d: Dictionary = nodos_agente.get(id, {})
	if not d.is_empty(): camara_rig.objetivo = d.raiz.position; camara_rig._aplicar()
	ui.refrescar()

func _unhandled_input(ev: InputEvent) -> void:
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
func poner_calidad(q: String) -> void:
	calidad = q
	_guardar_ajuste("calidad", q)
	var vp = get_viewport()
	match q:
		"bajo":
			sol.shadow_enabled = false; vp.scaling_3d_scale = 0.6; vp.msaa_3d = Viewport.MSAA_DISABLED
		"medio":
			sol.shadow_enabled = true; vp.scaling_3d_scale = 0.85; vp.msaa_3d = Viewport.MSAA_DISABLED
			RenderingServer.directional_shadow_atlas_set_size(2048, true)
		"alto":
			sol.shadow_enabled = true; vp.scaling_3d_scale = 1.0; vp.msaa_3d = Viewport.MSAA_4X
			RenderingServer.directional_shadow_atlas_set_size(4096, true)

func _captura_y_salir() -> void:
	var args = OS.get_cmdline_user_args()
	for i in 6: Juego.tick_hora()
	if args.has("--sin-techos"): alternar_techos()
	if args.has("--noche"): Juego.hora = 22; _sincronizar()
	if args.has("--sim"): seleccionar(Juego.agentes[0].id); camara_rig.distancia = 14; camara_rig._aplicar()
	if args.has("--pestana"): ui.abrir(args[args.find("--pestana") + 1])
	for i in 90: await get_tree().process_frame
	var img = get_viewport().get_texture().get_image()
	var ruta: String = args[args.find("--captura") + 1]
	img.save_png(ruta)
	get_tree().quit()
