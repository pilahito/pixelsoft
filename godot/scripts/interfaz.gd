extends Control
## Interfaz: barra superior, panel del Sim (necesidades), y pestañas
## Comprar (catálogo por categorías) · Pueblo · Diario · Ajustes.

var principal
var barra: Label
var panel_sim: PanelContainer
var sim_caja: VBoxContainer
var pestanas: TabContainer
var trabajo_caja: VBoxContainer
var graficos_caja: VBoxContainer
var ia_caja: VBoxContainer
var dlc_caja: VBoxContainer
var _barras_ia = {}
var pixel_caja: VBoxContainer
var comprar_caja: VBoxContainer
var categoria = "Todo"
var pueblo_caja: VBoxContainer
var diario: RichTextLabel
var ajustes_caja: VBoxContainer
var mods_caja: VBoxContainer
var estado_llm: Label
var estado_act: Label
const NEC_NOMBRE = {"hambre": "Hambre", "sueno": "Sueño", "diversion": "Diversión", "higiene": "Higiene", "social": "Social"}
const ACT = {"trabajar": "Trabajando", "cocinar": "Cocinando", "cafeteria": "En la cafetería", "comprar": "De compras", "dormir": "Durmiendo",
	"ducharse": "Duchándose", "parque": "En el parque", "gimnasio": "Entrenando", "charlar": "Con amigos", "videojuegos": "Jugando", "picoteo": "Picoteando"}

func _ready() -> void:
	set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	size = get_viewport_rect().size
	mouse_filter = MOUSE_FILTER_IGNORE
	theme = _tema()
	var movil = OS.has_feature("mobile") or get_viewport_rect().size.x < 900
	# Barra superior
	var top = PanelContainer.new(); top.set_anchors_preset(PRESET_TOP_WIDE); add_child(top)
	var hb = HBoxContainer.new(); top.add_child(hb)
	barra = Label.new(); barra.size_flags_horizontal = SIZE_EXPAND_FILL; hb.add_child(barra)
	for v in [["II", 0.0], ["▶", 1.0], ["▶▶", 3.0], ["▶▶▶", 8.0]]:
		var b = Button.new(); b.text = v[0]; b.tooltip_text = "Velocidad x%s" % v[1]; b.custom_minimum_size = Vector2(48, 40)
		b.pressed.connect(func(): Juego.velocidad = v[1]); hb.add_child(b)
	var cm = OptionButton.new(); cm.tooltip_text = "Cámara (F1-F4). F12 = foto"
	for m in ["Libre", "Seguir", "Primera persona", "Foto"]: cm.add_item(m)
	cm.item_selected.connect(func(i): principal.modo_camara(["libre", "seguir", "primera", "foto"][i])); hb.add_child(cm)
	var bt = Button.new(); bt.text = "Techos"; bt.tooltip_text = "Ocultar techos y paredes para ver dentro"; bt.pressed.connect(func(): principal.alternar_techos()); hb.add_child(bt)
	# Panel del Sim (izquierda abajo)
	panel_sim = PanelContainer.new(); add_child(panel_sim)
	panel_sim.set_anchors_and_offsets_preset(PRESET_BOTTOM_LEFT, PRESET_MODE_MINSIZE, 10)
	panel_sim.grow_vertical = Control.GROW_DIRECTION_BEGIN
	panel_sim.custom_minimum_size = Vector2(360, 0)
	sim_caja = VBoxContainer.new(); panel_sim.add_child(sim_caja)
	# Pestañas (derecha)
	pestanas = TabContainer.new(); add_child(pestanas)
	pestanas.set_anchors_and_offsets_preset(PRESET_RIGHT_WIDE)
	var ancho = 380.0 if not movil else get_viewport_rect().size.x * 0.48
	pestanas.offset_left = -ancho - 10; pestanas.offset_right = -10; pestanas.offset_top = 60; pestanas.offset_bottom = -10
	comprar_caja = _pestana("Comprar")
	pueblo_caja = _pestana("Pueblo")
	trabajo_caja = _pestana("Trabajo")
	pixel_caja = _pestana("Pixelgram")
	var sc = ScrollContainer.new(); sc.name = "Diario"; pestanas.add_child(sc)
	diario = RichTextLabel.new(); diario.fit_content = true; diario.size_flags_horizontal = SIZE_EXPAND_FILL; diario.bbcode_enabled = true; sc.add_child(diario)
	ia_caja = _pestana("Motor IA")
	dlc_caja = _pestana("Expansiones")
	ajustes_caja = _pestana("Ajustes")
	MotorIA.cambiado.connect(_pintar_ia); MotorIA.progreso.connect(func(id, f): if _barras_ia.has(id): _barras_ia[id].value = f * 100)
	Dlc.cambiado.connect(_pintar_dlc)
	_pintar_ia(); _pintar_dlc()
	_montar_ajustes()
	Juego.suceso.connect(func(_t): _pintar_diario())
	Llm.estado_cambiado.connect(_pintar_llm)
	get_tree().root.files_dropped.connect(func(f): for x in f: if x.ends_with(".zip"): _aviso(Mods.instalar_zip(x)); _pintar_mods())
	if Juego.agentes.size(): principal.seleccionado = Juego.agentes[0].id
	await get_tree().create_timer(3.0).timeout
	_ofrecer_modelo()
	Actualizador.comprobar(false)

## Primera vez en movil: ofrece bajar el modelo recomendado (luego funciona sin internet).
func _ofrecer_modelo() -> void:
	var M = MotorIA
	if M.backend != "local" or M.descargado(M.modelo) or not M.hay_llama(): return
	var c = ConfigFile.new(); if c.load("user://motor_ia.cfg") == OK and c.get_value("m", "ofrecido", false): return
	var m = M._modelo(M.modelo)
	var d = ConfirmationDialog.new(); add_child(d)
	d.title = "IA en tu móvil"
	d.dialog_text = "PixelSoft puede pensar con una IA dentro de tu móvil, sin servidores.\nRecomendado: %s (%d MB). Mejor con wifi. Después funciona sin internet.\nMientras tanto se usa la IA simulada." % [m.nombre, m.mb]
	d.ok_button_text = "Descargar"; d.cancel_button_text = "Más tarde"
	d.confirmed.connect(func(): M.descargar(M.modelo); abrir("Motor IA"))
	d.popup_centered()
	c.set_value("m", "ofrecido", true); c.save("user://motor_ia.cfg")

func _tema() -> Theme:
	var t = Theme.new()
	var sb = StyleBoxFlat.new(); sb.bg_color = Color(0.09, 0.11, 0.17, 0.92); sb.set_corner_radius_all(10); sb.set_content_margin_all(10)
	sb.border_color = Color(0.35, 0.8, 0.95, 0.5); sb.set_border_width_all(2)
	t.set_stylebox("panel", "PanelContainer", sb)
	t.set_stylebox("panel", "TabContainer", sb)
	var bn = StyleBoxFlat.new(); bn.bg_color = Color(0.17, 0.22, 0.33); bn.set_corner_radius_all(8); bn.set_content_margin_all(8)
	var bh = bn.duplicate(); bh.bg_color = Color(0.24, 0.32, 0.48)
	var bp = bn.duplicate(); bp.bg_color = Color(0.3, 0.75, 0.45)
	t.set_stylebox("normal", "Button", bn); t.set_stylebox("hover", "Button", bh); t.set_stylebox("pressed", "Button", bp)
	t.set_font_size("font_size", "Label", 16); t.set_font_size("font_size", "Button", 16)
	t.set_color("font_color", "Label", Color(0.93, 0.95, 1))
	return t

func _pestana(nombre: String) -> VBoxContainer:
	var sc = ScrollContainer.new(); sc.name = nombre; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; pestanas.add_child(sc)
	var v = VBoxContainer.new(); v.size_flags_horizontal = SIZE_EXPAND_FILL; sc.add_child(v)
	return v

func abrir(nombre: String) -> void:
	for i in pestanas.get_tab_count():
		if nombre.to_lower() in pestanas.get_tab_title(i).to_lower(): pestanas.current_tab = i

func _limpiar(c: Node) -> void:
	for h in c.get_children(): h.queue_free()

func _lbl(t: String, tam := 16, color := Color(0.93, 0.95, 1)) -> Label:
	var l = Label.new(); l.text = t; l.add_theme_font_size_override("font_size", tam); l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

func _barra(valor: float) -> ProgressBar:
	var p = ProgressBar.new(); p.max_value = 100; p.value = valor; p.show_percentage = false; p.custom_minimum_size = Vector2(150, 16)
	var f = StyleBoxFlat.new(); f.set_corner_radius_all(6)
	f.bg_color = Color(0.3, 0.85, 0.4) if valor > 60 else (Color(0.95, 0.8, 0.25) if valor > 30 else Color(0.95, 0.3, 0.25))
	var b = StyleBoxFlat.new(); b.bg_color = Color(0.15, 0.17, 0.24); b.set_corner_radius_all(6)
	p.add_theme_stylebox_override("fill", f); p.add_theme_stylebox_override("background", b)
	return p

func _btn(t: String, f: Callable, tip := "") -> Button:
	var b = Button.new(); b.text = t; b.tooltip_text = tip; b.custom_minimum_size = Vector2(0, 40); b.pressed.connect(f)
	return b

func refrescar() -> void:
	var e = Juego.empresa
	var c = Juego.clima
	var prev = " ".join(c.prevision.map(func(x): return x.tipo.left(4)))
	barra.text = "  %s · %s (%s)  ·  Día %d %02d:00 · %s  ·  Tiempo: %s (prev: %s)  ·  %d €" % [e.nombre, Juego.pueblo.nombre, Juego.nivel_ciudad(), Juego.dia, Juego.hora, Juego.estacion(), c.tipo, prev, e.dinero]
	_pintar_sim(); _pintar_comprar(); _pintar_pueblo(); _pintar_trabajo(); _pintar_pixelgram()

func _sim() -> Dictionary:
	for a in Juego.agentes: if a.id == principal.seleccionado: return a
	return Juego.agentes[0] if Juego.agentes.size() else {}

func _pintar_sim() -> void:
	_limpiar(sim_caja)
	var a = _sim()
	if a.is_empty(): return
	var cab = HFlowContainer.new(); cab.custom_minimum_size.x = 340; sim_caja.add_child(cab)
	for b in Juego.agentes:
		var x = _btn(b.nombre.get_slice(" ", 0), func(): principal.seleccionar(b.id)); x.flat = b.id != a.id; cab.add_child(x)
	var m: float = a.moral
	sim_caja.add_child(_lbl("%s %s · %s" % ["[feliz]" if m > 60 else ("[regular]" if m > 30 else "[mal]"), a.nombre, ACT.get(a.actividad, a.actividad)], 18))
	sim_caja.add_child(_lbl("Rasgos: " + ", ".join(a.rasgos) + "   ·   %d €" % a.dinero, 14, Color(0.7, 0.8, 0.9)))
	var car = a.get("carrera", "programador")
	if car == "parado": sim_caja.add_child(_lbl("En paro · busca trabajo en la pestaña Trabajo", 13, Color(1, 0.7, 0.5)))
	else:
		var c = Juego.CARRERAS[car]
		sim_caja.add_child(_lbl("%s · %s (%02d-%02d h) · %d €/día" % [c.nombre, c.titulos[a.get("nivel", 0)], c.inicio, c.fin, Juego.sueldo_de(a)], 13, Color(0.75, 0.9, 1)))
		var rb = _barra(a.get("rendimiento", 0)); rb.tooltip_text = "Rendimiento hacia el ascenso"; sim_caja.add_child(rb)
	var tj = a.get("tarjeta", null)
	if tj != null:
		sim_caja.add_child(_lbl("Tarjeta: " + tj.texto, 14, Color(1, 0.85, 0.3)))
		var hb2 = HBoxContainer.new(); sim_caja.add_child(hb2)
		hb2.add_child(_btn(tj.a[0], func(): Juego.resolver_tarjeta(a, "a")))
		hb2.add_child(_btn(tj.b[0], func(): Juego.resolver_tarjeta(a, "b")))
	var g = GridContainer.new(); g.columns = 2; sim_caja.add_child(g)
	for k in Juego.NECESIDADES:
		var ln = _lbl(NEC_NOMBRE[k], 14); ln.autowrap_mode = TextServer.AUTOWRAP_OFF; ln.custom_minimum_size.x = 90
		g.add_child(ln); var br = _barra(a.necesidades[k]); br.size_flags_horizontal = SIZE_EXPAND_FILL; g.add_child(br)
	var hab = HFlowContainer.new(); sim_caja.add_child(hab)
	for k in a.habilidades:
		var t = "%s %d" % [k.capitalize(), a.habilidades[k]]
		if a.puntos > 0: hab.add_child(_btn(t + " +", func(): Juego.gastar_punto(a, k), "Gastar 1 punto de habilidad"))
		else:
			var lh = _lbl(t + "   ", 13); lh.autowrap_mode = TextServer.AUTOWRAP_OFF; hab.add_child(lh)
	if a.puntos > 0: sim_caja.add_child(_lbl("%d punto(s) para gastar" % a.puntos, 13, Color(1, 0.85, 0.3)))
	var am = []
	for id in a.amistades:
		for b in Juego.agentes: if b.id == id: am.append("%s %s %d" % ["" if a.amistades[id] >= 50 else "", b.nombre, a.amistades[id]])
	sim_caja.add_child(_lbl("%d años · %s" % [a.edad, Juego.arbol_familiar(a)] + ("  · enfermo/a" if a.get("enfermo", 0) > 0 else ""), 13, Color(0.85, 0.8, 1)))
	sim_caja.add_child(_lbl("Amistades: " + (", ".join(am) if am.size() else "aún nadie"), 13, Color(0.8, 0.85, 0.95)))

func _pintar_comprar() -> void:
	_limpiar(comprar_caja)
	var a = _sim()
	comprar_caja.add_child(_lbl("Modo comprar · paga %s (%d €)" % [a.get("nombre", ""), a.get("dinero", 0)], 15))
	var cats = ["Todo"]
	for o in Juego.TIENDA: if not (o.cat in cats): cats.append(o.cat)
	var fila = HFlowContainer.new(); comprar_caja.add_child(fila)
	for c in cats:
		var b = _btn(c, func(): categoria = c; _pintar_comprar()); b.flat = c != categoria; fila.add_child(b)
	for o in Juego.TIENDA:
		if categoria != "Todo" and o.cat != categoria: continue
		var h = HBoxContainer.new(); comprar_caja.add_child(h)
		var l = _lbl("%s\n%d € · %s%s" % [o.nombre, o.precio, o.cat, " " if o.id in a.get("muebles", []) else ""], 14); l.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(l)
		var b = _btn("Comprar", func(): _aviso(Juego.comprar(a, o.id))); b.disabled = a.get("dinero", 0) < o.precio; h.add_child(b)

func _pintar_pueblo() -> void:
	_limpiar(pueblo_caja)
	var p = Juego.pueblo
	pueblo_caja.add_child(_lbl("%s" % p.nombre, 20))
	var band = HBoxContainer.new(); pueblo_caja.add_child(band)
	for c in p.bandera: var r = ColorRect.new(); r.color = Color.html(c); r.custom_minimum_size = Vector2(40, 22); band.add_child(r)
	pueblo_caja.add_child(_lbl("Las IAs proponen y votan qué construir. Ponen dinero de su sueldo.", 13, Color(0.7, 0.8, 0.9)))
	var modo = _btn("Modo: " + ("deciden ellos solos" if p.modo == "libre" else "tú apruebas"), func(): p.modo = "aprobar" if p.modo == "libre" else "libre"; refrescar())
	pueblo_caja.add_child(modo)
	for pr in p.propuestas:
		var est = {"votando": "", "esperando_jefe": "Decides tú", "aprobada": "Juntando dinero", "en_obras": "En obras", "hecha": "Hecha", "rechazada": "Rechazada"}[pr.estado]
		pueblo_caja.add_child(_lbl("%s · propone %s\n«%s»\n%s · %d/%d €" % [pr.nombre, pr.autor_nombre, pr.motivo, est, pr.fondos, pr.coste], 14))
		if pr.estado == "esperando_jefe":
			var h = HBoxContainer.new(); pueblo_caja.add_child(h)
			h.add_child(_btn("Aprobar", func(): Juego.decidir_propuesta(pr.id, true)))
			h.add_child(_btn("Vetar", func(): Juego.decidir_propuesta(pr.id, false)))
		if pr.estado == "aprobada": pueblo_caja.add_child(_btn("Pagar el resto con la empresa", func(): Juego.donar_a_obra()))
	pueblo_caja.add_child(_lbl("Edificios: %d" % p.edificios.size(), 13))

func _pintar_diario() -> void:
	var t = ""
	for s in Juego.sucesos.slice(-40): t = "[color=#8aa]D%d %02d:00[/color] %s\n" % [s.dia, s.hora, s.texto] + t
	diario.text = t

# --------------------------------------------------------------- ajustes
func _montar_ajustes() -> void:
	var c = ajustes_caja
	c.add_child(_lbl("Calidad gráfica", 18))
	var h = HBoxContainer.new(); c.add_child(h)
	for q in (["bajo", "medio", "alto"] if OS.has_feature("mobile") else ["bajo", "medio", "alto", "ultra"]):
		h.add_child(_btn(q.capitalize(), func(): principal.poner_calidad(q); _pintar_graficos()))
	c.add_child(_btn("Gráficos avanzados…", func(): graficos_caja.visible = not graficos_caja.visible; _pintar_graficos()))
	graficos_caja = VBoxContainer.new(); graficos_caja.visible = false; c.add_child(graficos_caja)
	var ab = CheckButton.new(); ab.text = "Ahorro de batería (30 FPS, menos CPU)"
	ab.button_pressed = OS.low_processor_usage_mode
	ab.toggled.connect(func(x): OS.low_processor_usage_mode = x; principal.G.cambiar("fps", "30" if x else "60"); principal.aplicar_graficos()); c.add_child(ab)
	c.add_child(_lbl("IA: LM Studio (PC o por la wifi)", 18))
	var url = LineEdit.new(); url.text = Llm.url; url.placeholder_text = "http://192.168.1.50:1234"; c.add_child(url)
	c.add_child(_btn("Probar conexión", func(): Llm.probar(url.text)))
	estado_llm = _lbl("", 13); c.add_child(estado_llm); _pintar_llm()
	c.add_child(_lbl("Sin conexión, los Sims usan frases escritas (modo demo).", 12, Color(0.7, 0.8, 0.9)))
	c.add_child(_lbl("Mods (solo datos)", 18))
	c.add_child(_btn("Instalar .zip", _elegir_zip))
	mods_caja = VBoxContainer.new(); c.add_child(mods_caja); _pintar_mods()
	c.add_child(_lbl("Actualizaciones · versión %s" % Juego.VERSION, 18))
	c.add_child(_btn("Buscar actualizaciones", func(): Actualizador.comprobar(true)))
	estado_act = _lbl("", 13); c.add_child(estado_act)
	Actualizador.estado.connect(func(t): estado_act.text = t)
	Actualizador.hay_version.connect(_dialogo_actualizacion)
	c.add_child(_lbl("Partida", 18))
	c.add_child(_btn("Guardar ahora", func(): Juego.guardar(); _aviso("Guardado.")))
	c.add_child(_btn("Partida nueva", func(): Juego.nueva_partida(); get_tree().reload_current_scene()))
	c.add_child(_lbl("Créditos: modelos 3D hechos con Blender (tools/arte), motor Godot (MIT). Ver CREDITS.md.", 12, Color(0.7, 0.8, 0.9)))

func _pintar_llm() -> void:
	if estado_llm: estado_llm.text = ("Conectado · " + Llm.modelo) if Llm.conectado else ("" + (Llm.ultimo_error if Llm.ultimo_error != "" else "Sin probar"))

func _pintar_mods() -> void:
	if mods_caja == null: return
	_limpiar(mods_caja)
	if Mods.mods.is_empty(): mods_caja.add_child(_lbl("No tienes mods.", 13))
	for m in Mods.mods:
		mods_caja.add_child(_lbl("%s %s v%s · %s\n%s" % ["" if m.activo else "⏸", m.nombre, m.version, m.autor, m.descripcion], 13))
		var h = HBoxContainer.new(); mods_caja.add_child(h)
		h.add_child(_btn("▲", func(): Mods.mover(m.id, -1); _pintar_mods(), "Cargar antes"))
		h.add_child(_btn("▼", func(): Mods.mover(m.id, 1); _pintar_mods(), "Cargar después"))
		h.add_child(_btn("Desactivar" if m.activo else "Activar", func(): Mods.alternar(m.id); _pintar_mods()))
		h.add_child(_btn("", func(): Mods.quitar(m.id); _pintar_mods()))
	for av in Mods.avisos: mods_caja.add_child(_lbl("" + av, 12, Color(1, 0.8, 0.4)))

func _elegir_zip() -> void:
	var fd = FileDialog.new()
	fd.file_mode = FileDialog.FILE_MODE_OPEN_FILE; fd.access = FileDialog.ACCESS_FILESYSTEM
	fd.filters = PackedStringArray(["*.zip ; Mod de PixelSoft"]); fd.use_native_dialog = true
	fd.file_selected.connect(func(p): _aviso(Mods.instalar_zip(p)); _pintar_mods())
	add_child(fd); fd.popup_centered(Vector2i(700, 500))

func _dialogo_actualizacion(info: Dictionary) -> void:
	var d = ConfirmationDialog.new()
	d.title = "PixelSoft %s disponible" % info.version
	d.dialog_text = "Tienes la %s. Tu partida y tus mods se conservan.\n\n%s" % [Juego.VERSION, str(info.notas).substr(0, 900)]
	d.ok_button_text = "Actualizar ahora"; d.cancel_button_text = "Más tarde"
	d.add_button("Omitir esta versión", true, "omitir")
	d.confirmed.connect(func(): Actualizador.instalar(info))
	d.custom_action.connect(func(a): if a == "omitir": Actualizador.omitir(info.version); d.hide())
	add_child(d); d.popup_centered(Vector2i(560, 360))

func _aviso(t: String) -> void:
	var l = _lbl(t, 16); var p = PanelContainer.new(); p.add_child(l); add_child(p)
	p.set_anchors_preset(PRESET_CENTER_TOP); p.position.y = 70
	var tw = create_tween(); tw.tween_interval(2.2); tw.tween_property(p, "modulate:a", 0.0, 0.5); tw.tween_callback(p.queue_free)

func _pintar_trabajo() -> void:
	_limpiar(trabajo_caja)
	var a = _sim()
	if a.is_empty(): return
	trabajo_caja.add_child(_lbl("Ofertas para %s (periódico, ordenador y Pixelgram)" % a.nombre, 15))
	var car = a.get("carrera", "programador")
	if car != "parado": trabajo_caja.add_child(_btn("Dejar el trabajo actual", func(): Juego.dejar_trabajo(a)))
	for id in Juego.ofertas(a):
		var c = Juego.CARRERAS[id]
		var tx = "%s · %d-%d €/día · %02d-%02d h · %s%s" % [c.nombre, c.sueldo[0], c.sueldo[4], c.inicio, c.fin, c.habilidad.capitalize(), (" · " + c.vehiculo) if c.vehiculo != "" else ""]
		trabajo_caja.add_child(_btn(tx, func(): _aviso(Juego.cambiar_carrera(a, id)), "Solicitar el puesto de " + c.titulos[0]))

func _pintar_pixelgram() -> void:
	_limpiar(pixel_caja)
	var l = Juego.pixelgram.duplicate(); l.reverse()
	if l.is_empty(): pixel_caja.add_child(_lbl("Nadie ha publicado aún.", 14))
	for p in l.slice(0, 25):
		pixel_caja.add_child(_lbl("@%s · día %d %02d:00" % [p.autor, p.dia, p.hora], 13, Color(0.9, 0.6, 1)))
		pixel_caja.add_child(_lbl(p.texto + "   (%d me gusta)" % p.likes, 14))

## Menu grafico avanzado: cada cambio se aplica al momento (vista previa en vivo).
func _pintar_graficos() -> void:
	if graficos_caja == null or not graficos_caja.visible: return
	_limpiar(graficos_caja)
	var G = principal.G
	graficos_caja.add_child(_lbl("Preajuste: " + G.preset.capitalize(), 14, Color(1, 0.85, 0.3)))
	var movil = OS.has_feature("mobile")
	for o in G.OPCIONES:
		var k: String = o[0]
		var fila = HBoxContainer.new(); graficos_caja.add_child(fila)
		var l = _lbl(o[1] + (" (solo PC)" if o[4] and movil else ""), 13); l.custom_minimum_size.x = 170; l.autowrap_mode = TextServer.AUTOWRAP_OFF; fila.add_child(l)
		match o[2]:
			"bool":
				var cb = CheckButton.new(); cb.button_pressed = G.v.get(k, false); cb.disabled = o[4] and movil
				cb.toggled.connect(func(x): G.cambiar(k, x); principal.aplicar_graficos()); fila.add_child(cb)
			"lista":
				var ob = OptionButton.new()
				for it in o[3]: ob.add_item(it)
				ob.selected = o[3].find(str(G.v.get(k, o[3][0])))
				ob.item_selected.connect(func(i): G.cambiar(k, o[3][i]); principal.aplicar_graficos()); fila.add_child(ob)
			"rango":
				var sl = HSlider.new(); sl.min_value = o[3][0]; sl.max_value = o[3][1]; sl.step = o[3][2]
				sl.value = G.v.get(k, o[3][0]); sl.custom_minimum_size.x = 130; sl.size_flags_horizontal = SIZE_EXPAND_FILL
				var vl = _lbl(str(sl.value), 12)
				sl.value_changed.connect(func(x): vl.text = str(x); G.cambiar(k, x); principal.aplicar_graficos())
				fila.add_child(sl); fila.add_child(vl)

func _pintar_ia() -> void:
	_limpiar(ia_caja); _barras_ia.clear()
	var M = MotorIA
	ia_caja.add_child(_lbl("Tu dispositivo: %.1f GB RAM · %d núcleos" % [M.ram_gb, M.nucleos], 14))
	ia_caja.add_child(_lbl("Motor local llama.cpp: " + ("listo" if M.hay_llama() else "no instalado en esta versión"), 13, Color(0.6, 1, 0.6) if M.hay_llama() else Color(1, 0.7, 0.5)))
	var hb = HBoxContainer.new(); ia_caja.add_child(hb)
	for b in [["local", "En el dispositivo"], ["lmstudio", "LM Studio (PC)"], ["lan", "Red local"], ["demo", "IA simulada"]]:
		var x = _btn(b[1], func(): M.backend = b[0]; M.guardar()); x.flat = M.backend != b[0]; hb.add_child(x)
	ia_caja.add_child(_lbl("IA simulada: sin modelo real; los Sims usan plantillas y la IA de utilidad (necesidades, rasgos, amistades) para hablar y decidir. Se activa sola en móviles con menos de 3 GB de RAM, CPU flojo o benchmark lento. Puedes cambiarlo arriba.", 12, Color(0.7, 0.8, 0.9)))
	var hb2 = HBoxContainer.new(); ia_caja.add_child(hb2)
	for a in ["cpu", "gpu"]:
		var x = _btn("Acelerador " + a.to_upper(), func(): M.acelerador = a; M.guardar()); x.flat = M.acelerador != a; hb2.add_child(x)
	for s in [["Temperatura", "temperatura", 0.0, 1.5, 0.05], ["Contexto", "contexto", 256, 4096, 256]]:
		var f = HBoxContainer.new(); ia_caja.add_child(f)
		var l = _lbl("%s: %s" % [s[0], M.get(s[1])], 13); l.custom_minimum_size.x = 140; f.add_child(l)
		var sl = HSlider.new(); sl.min_value = s[2]; sl.max_value = s[3]; sl.step = s[4]; sl.value = M.get(s[1]); sl.size_flags_horizontal = SIZE_EXPAND_FILL
		sl.drag_ended.connect(func(_c): M.set(s[1], sl.value if s[1] == "temperatura" else int(sl.value)); M.guardar()); f.add_child(sl)
	ia_caja.add_child(_btn("Benchmark", func(): _aviso(M.benchmark())))
	if M.ultimo_benchmark != "": ia_caja.add_child(_lbl(M.ultimo_benchmark, 12))
	var rec = M.recomendado()
	for m in M.CATALOGO:
		var t = "%s · %d MB · %.1f GB RAM · ~%.0f tok/s" % [m.nombre, m.mb, m.ram, M.estimacion_tps(m)]
		if m.id == rec: t += "  [Recomendado para tu dispositivo]"
		if m.id == M.modelo: t += "  (activo)"
		ia_caja.add_child(_lbl(t, 13, Color(1, 0.85, 0.3) if m.id == rec else Color(0.93, 0.95, 1)))
		ia_caja.add_child(_lbl("Licencia: " + m.licencia, 11, Color(0.7, 0.8, 0.9)))
		var f = HBoxContainer.new(); ia_caja.add_child(f)
		if not M.cabe(m): f.add_child(_lbl("Bloqueado: demasiado grande para este dispositivo", 12, Color(1, 0.5, 0.5)))
		elif M.descargas.has(m.id):
			var pb = _barra(0); pb.size_flags_horizontal = SIZE_EXPAND_FILL; f.add_child(pb); _barras_ia[m.id] = pb
			f.add_child(_btn("Cancelar", func(): M.cancelar(m.id)))
		elif M.descargado(m.id):
			f.add_child(_btn("Usar", func(): M.modelo = m.id; M.guardar()))
			f.add_child(_btn("Borrar", func(): M.borrar(m.id)))
		else:
			f.add_child(_btn("Descargar (%d MB, mejor con wifi)" % m.mb, func(): M.descargar(m.id)))
	ia_caja.add_child(_lbl(M.AVISO_GEMMA, 11, Color(0.7, 0.8, 0.9)))

func _pintar_dlc() -> void:
	_limpiar(dlc_caja)
	dlc_caja.add_child(_lbl("Expansiones oficiales. El juego base está completo.", 14))
	for p in Dlc.PACKS:
		var pc = PanelContainer.new(); var sb = StyleBoxFlat.new(); sb.bg_color = Color.html(p.portada[0]); sb.border_color = Color.html(p.portada[1]); sb.set_border_width_all(3); sb.set_corner_radius_all(8)
		pc.add_theme_stylebox_override("panel", sb); dlc_caja.add_child(pc)
		var v = VBoxContainer.new(); pc.add_child(v)
		v.add_child(_lbl(p.nombre, 18, Color.html(p.portada[1])))
		v.add_child(_lbl(p.desc, 13))
		v.add_child(_lbl("Instalado" if Dlc.tiene(p.id) else "Bloqueado", 13, Color(0.5, 1, 0.5) if Dlc.tiene(p.id) else Color(1, 0.7, 0.5)))
	var le = LineEdit.new(); le.placeholder_text = "PS1-..."; dlc_caja.add_child(le)
	dlc_caja.add_child(_btn("Canjear código", func(): _aviso(Dlc.canjear(le.text))))
	dlc_caja.add_child(_lbl("Los mods de la comunidad siguen en Ajustes → Mods.", 12, Color(0.7, 0.8, 0.9)))
