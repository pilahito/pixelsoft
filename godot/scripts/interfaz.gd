extends Control
## Interfaz: barra superior, panel del Sim (necesidades), y pestañas
## Comprar (catálogo por categorías) · Pueblo · Diario · Ajustes.

var principal
var barra: Label
var panel_sim: PanelContainer
var sim_caja: VBoxContainer
var pestanas: TabContainer
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
	var sc = ScrollContainer.new(); sc.name = "Diario"; pestanas.add_child(sc)
	diario = RichTextLabel.new(); diario.fit_content = true; diario.size_flags_horizontal = SIZE_EXPAND_FILL; diario.bbcode_enabled = true; sc.add_child(diario)
	ajustes_caja = _pestana("Ajustes")
	_montar_ajustes()
	Juego.suceso.connect(func(_t): _pintar_diario())
	Llm.estado_cambiado.connect(_pintar_llm)
	get_tree().root.files_dropped.connect(func(f): for x in f: if x.ends_with(".zip"): _aviso(Mods.instalar_zip(x)); _pintar_mods())
	if Juego.agentes.size(): principal.seleccionado = Juego.agentes[0].id
	await get_tree().create_timer(3.0).timeout
	Actualizador.comprobar(false)

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
	barra.text = "  %s · %s   ·   Día %d  %02d:00 %s   ·   %d €   ·   Rep. %d" % [e.nombre, Juego.pueblo.nombre, Juego.dia, Juego.hora, "" if Juego.es_noche() else "", e.dinero, e.reputacion]
	_pintar_sim(); _pintar_comprar(); _pintar_pueblo()

func _sim() -> Dictionary:
	for a in Juego.agentes: if a.id == principal.seleccionado: return a
	return Juego.agentes[0] if Juego.agentes.size() else {}

func _pintar_sim() -> void:
	_limpiar(sim_caja)
	var a = _sim()
	if a.is_empty(): return
	var cab = HBoxContainer.new(); sim_caja.add_child(cab)
	for b in Juego.agentes:
		var x = _btn(b.nombre, func(): principal.seleccionar(b.id)); x.flat = b.id != a.id; cab.add_child(x)
	var m: float = a.moral
	sim_caja.add_child(_lbl("%s %s · %s" % ["[feliz]" if m > 60 else ("[regular]" if m > 30 else "[mal]"), a.nombre, ACT.get(a.actividad, a.actividad)], 18))
	sim_caja.add_child(_lbl("Rasgos: " + ", ".join(a.rasgos) + "   ·   %d €" % a.dinero, 14, Color(0.7, 0.8, 0.9)))
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
	for q in ["bajo", "medio", "alto"]: h.add_child(_btn(q.capitalize(), func(): principal.poner_calidad(q); _aviso("Calidad: " + q)))
	c.add_child(_lbl("En el móvil empieza en Bajo (sin sombras, 60% de resolución) para no calentar.", 12, Color(0.7, 0.8, 0.9)))
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
