extends Control
## Interfaz 2.2 (estilo Sims moderno): tarjetas flotantes de cristal.
##  - Arriba izquierda: reloj, tiempo y velocidad.   - Arriba derecha: dinero, camara, techos, menu.
##  - Abajo izquierda: tarjeta del Sim (avatar, gema, necesidades con iconos).
##  - Derecha: barra de iconos que abre un cajon deslizante (Comprar, Pueblo...).
## Se adapta a PC y movil (botones grandes, texto mayor) y escala por DPI sin
## emborronar: todo es vector/StyleBox y el texto se rasteriza al tamano final.

const Tema = preload("res://scripts/ui/tema.gd")
const Icono = preload("res://scripts/ui/icono.gd")
const MenuPrincipal = preload("res://scripts/ui/menu.gd")

var principal
var movil := false
var alto_btn := 38
# Barra superior
var reloj_lbl: Label
var reloj_sub: Label
var icono_tiempo
var prevision_caja: HBoxContainer
var dinero_lbl: Label
var botones_vel = []
# Sim
var panel_sim: PanelContainer
var sim_caja: VBoxContainer
var avatares: HBoxContainer
var sim_extra := false
var sim_scroll: ScrollContainer
var sim_col: VBoxContainer
# Cajon (paginas)
var rail: VBoxContainer
var rail_btns = {}
var cajon: PanelContainer
var cajon_titulo: Label
var cajon_cuerpo: Control
var paginas = {}
var pagina := ""
var _tw_cajon: Tween
# Contenido de las paginas
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
var menu: Control

const NEC_NOMBRE = {"hambre": "Hambre", "sueno": "Sueño", "diversion": "Diversión", "higiene": "Higiene", "social": "Social"}
const ACT = {"trabajar": "Trabajando", "cocinar": "Cocinando", "cafeteria": "En la cafetería", "comprar": "De compras", "dormir": "Durmiendo",
	"ducharse": "Duchándose", "parque": "En el parque", "gimnasio": "Entrenando", "charlar": "Con amigos", "videojuegos": "Jugando", "picoteo": "Picoteando"}
const PAGINAS = [["Comprar", "comprar"], ["Pueblo", "pueblo"], ["Trabajo", "trabajo"], ["Pixelgram", "pixelgram"], ["Diario", "diario"],
	["Motor IA", "ia"], ["Expansiones", "dlc"], ["Ajustes", "ajustes"]]
const NOMBRE_TIEMPO = {"despejado": "Soleado", "nublado": "Nublado", "lluvia": "Lluvia", "tormenta": "Tormenta", "nieve": "Nieve", "niebla": "Niebla", "calor": "Ola de calor", "granizo": "Granizo"}

func _ready() -> void:
	set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	mouse_filter = MOUSE_FILTER_IGNORE
	var args = OS.get_cmdline_user_args()
	movil = OS.has_feature("mobile") or args.has("--ui-movil") or get_viewport_rect().size.x < 900
	theme = Tema.crear(movil)
	alto_btn = theme.get_meta("alto_btn")
	_aplicar_escala()
	_montar_barra_superior()
	_montar_sim()
	_montar_rail_y_cajon()
	MotorIA.cambiado.connect(_pintar_ia); MotorIA.progreso.connect(func(id, f): if _barras_ia.has(id): _barras_ia[id].value = f * 100)
	Dlc.cambiado.connect(_pintar_dlc)
	_pintar_ia(); _pintar_dlc()
	_montar_ajustes()
	Juego.suceso.connect(func(_t): _pintar_diario())
	Llm.estado_cambiado.connect(_pintar_llm)
	get_tree().root.files_dropped.connect(func(f): for x in f: if x.ends_with(".zip"): _aviso(Mods.instalar_zip(x)); _pintar_mods())
	if Juego.agentes.size(): principal.seleccionado = Juego.agentes[0].id
	# Menu principal al arrancar (no en pruebas/capturas salvo que se pida)
	var en_prueba = args.has("--captura") or args.has("--prueba")
	if not en_prueba or args.has("--menu"): abrir_menu(true)
	if en_prueba: return
	await get_tree().create_timer(3.0).timeout
	_ofrecer_modelo()
	Actualizador.comprobar(false)

## Escala de interfaz: el stretch "canvas_items" ya escala con la ventana y
## rasteriza el texto a resolucion completa; aqui solo se aplica el ajuste
## del jugador (80-150 %) y un extra en pantallas muy densas.
func _aplicar_escala() -> void:
	var c = ConfigFile.new(); c.load("user://ajustes.cfg")
	var f: float = c.get_value("ui", "escala", 1.0)
	get_window().content_scale_factor = f
	get_window().content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS

func _notification(what: int) -> void:
	# Boton "atras" de Android: cierra el cajon o abre/cierra el menu.
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if pagina != "": cerrar_cajon()
		else: abrir_menu(not (menu and menu.visible))

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_ESCAPE:
			if pagina != "": cerrar_cajon()
			else: abrir_menu(not (menu and menu.visible))
			get_viewport().set_input_as_handled()
		elif ev.keycode == KEY_SPACE:
			Juego.velocidad = 1.0 if Juego.velocidad == 0.0 else 0.0; _pintar_velocidad()

# ------------------------------------------------------------------ piezas
func _panel(cristal := true) -> PanelContainer:
	var p = PanelContainer.new()
	if cristal and not movil: p.material = Tema.cristal()
	return p

func _tarjeta(tipo := "Tarjeta") -> PanelContainer:
	var p = PanelContainer.new(); p.theme_type_variation = tipo
	return p

func _lbl(t: String, tam := 0, color := Color(0, 0, 0, 0), tipo := "") -> Label:
	var l = Label.new(); l.text = t
	if tipo != "": l.theme_type_variation = tipo
	if tam > 0: l.add_theme_font_size_override("font_size", tam + (3 if movil else 0))
	if color.a > 0: l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

func _lbl1(t: String, tam := 0, color := Color(0, 0, 0, 0), tipo := "") -> Label:
	var l = _lbl(t, tam, color, tipo); l.autowrap_mode = TextServer.AUTOWRAP_OFF
	return l

func _barra(valor: float, alto := 10) -> ProgressBar:
	var p = ProgressBar.new(); p.max_value = 100; p.value = valor; p.show_percentage = false
	p.custom_minimum_size = Vector2(120, alto + (4 if movil else 0))
	var f = Tema.caja(_color_valor(valor), 99, 0, 0)
	p.add_theme_stylebox_override("fill", f)
	return p

func _color_valor(v: float) -> Color:
	return Tema.ACENTO if v > 60 else (Tema.AVISO if v > 30 else Tema.PELIGRO)

func _btn(t: String, f: Callable, tip := "", tipo := "") -> Button:
	var b = Button.new(); b.text = t; b.tooltip_text = tip; b.custom_minimum_size = Vector2(0, alto_btn); b.pressed.connect(f)
	if tipo != "": b.theme_type_variation = tipo
	b.focus_mode = Control.FOCUS_NONE if movil else Control.FOCUS_ALL
	_animar(b)
	return b

func _btn_icono(icono: String, f: Callable, tip := "", tam := 0.0) -> Button:
	var lado = tam if tam > 0 else float(alto_btn)
	var b = Button.new(); b.theme_type_variation = "BotonIcono"; b.tooltip_text = tip
	b.custom_minimum_size = Vector2(lado, lado); b.pressed.connect(f); b.focus_mode = Control.FOCUS_NONE
	var i = Icono.crear(icono, 0, Tema.TEXTO); i.name = "Icono"
	b.add_child(i)
	i.set_anchors_preset(PRESET_FULL_RECT)
	i.offset_left = lado * 0.25; i.offset_top = lado * 0.25; i.offset_right = -lado * 0.25; i.offset_bottom = -lado * 0.25
	_animar(b)
	return b

## Microanimacion de hover/pulsacion (escala suave desde el centro).
func _animar(c: Control) -> void:
	c.mouse_entered.connect(func(): _rebote(c, 1.04))
	c.mouse_exited.connect(func(): _rebote(c, 1.0))
	if c is BaseButton: c.button_down.connect(func(): _rebote(c, 0.96)); c.button_up.connect(func(): _rebote(c, 1.0))

func _rebote(c: Control, s: float) -> void:
	if not is_instance_valid(c) or not c.is_inside_tree(): return
	c.pivot_offset = c.size / 2
	var tw = c.create_tween(); tw.tween_property(c, "scale", Vector2.ONE * s, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func _limpiar(c: Node) -> void:
	for h in c.get_children(): h.queue_free()

# ------------------------------------------------------------------ barra superior
func _montar_barra_superior() -> void:
	var m = 12.0 if not movil else 10.0
	# Reloj + tiempo + velocidad
	var izq = _panel(); add_child(izq)
	var h = HBoxContainer.new(); h.add_theme_constant_override("separation", 12); izq.add_child(h)
	icono_tiempo = Icono.crear("sol", 40 if movil else 34, Tema.AVISO); h.add_child(icono_tiempo)
	var v = VBoxContainer.new(); v.add_theme_constant_override("separation", 0); h.add_child(v)
	reloj_lbl = _lbl("", 0, Color(0, 0, 0, 0), "Titulo"); reloj_lbl.autowrap_mode = TextServer.AUTOWRAP_OFF; v.add_child(reloj_lbl)
	reloj_sub = _lbl("", 0, Color(0, 0, 0, 0), "Sub"); reloj_sub.autowrap_mode = TextServer.AUTOWRAP_OFF; v.add_child(reloj_sub)
	prevision_caja = HBoxContainer.new(); prevision_caja.add_theme_constant_override("separation", 4); v.add_child(prevision_caja)
	var sep = VSeparator.new(); sep.add_theme_stylebox_override("separator", Tema.caja(Color(1, 1, 1, 0.1), 0, 0)); h.add_child(sep)
	var seg = HBoxContainer.new(); seg.add_theme_constant_override("separation", 2); seg.size_flags_vertical = SIZE_SHRINK_CENTER; h.add_child(seg)
	for vel in [["pausa", 0.0, "Pausa (Espacio)"], ["play", 1.0, "Normal"], ["play2", 3.0, "Rápido x3"], ["play3", 8.0, "Ultrarrápido x8"]]:
		var b = _btn_icono(vel[0], func(): Juego.velocidad = vel[1]; _pintar_velocidad(), vel[2], 44.0 if not movil else 54.0)
		b.toggle_mode = true; b.set_meta("vel", vel[1]); seg.add_child(b); botones_vel.append(b)
	# Dinero + camara + techos + menu
	var der = _panel(); add_child(der)
	var h2 = HBoxContainer.new(); h2.add_theme_constant_override("separation", 6); h2.alignment = BoxContainer.ALIGNMENT_CENTER; der.add_child(h2)
	var chip = _tarjeta("Chip"); h2.add_child(chip)
	var hc = HBoxContainer.new(); chip.add_child(hc)
	hc.add_child(Icono.crear("dinero", 24 if movil else 20, Tema.AVISO))
	dinero_lbl = _lbl("", 0, Color(0, 0, 0, 0), "Titulo"); dinero_lbl.autowrap_mode = TextServer.AUTOWRAP_OFF; hc.add_child(dinero_lbl)
	var cm = OptionButton.new(); cm.tooltip_text = "Cámara (F1-F4). F12 = foto"; cm.custom_minimum_size.y = alto_btn; cm.focus_mode = Control.FOCUS_NONE
	for k in ["Libre", "Seguir", "1ª persona", "Foto"]: cm.add_item(k)
	cm.item_selected.connect(func(i): principal.modo_camara(["libre", "seguir", "primera", "foto"][i])); h2.add_child(cm)
	var bt = _btn_icono("techo", func(): principal.alternar_techos(), "Ocultar techos y fachadas para ver dentro", 44.0 if not movil else 54.0)
	bt.toggle_mode = true; h2.add_child(bt)
	h2.add_child(_btn_icono("menu", func(): abrir_menu(true), "Menú (Esc)", 44.0 if not movil else 54.0))
	_fijar.call_deferred(izq, PRESET_TOP_LEFT, m); _fijar.call_deferred(der, PRESET_TOP_RIGHT, m)
	_aparecer(izq, Vector2(0, -20)); _aparecer(der, Vector2(0, -20))

func _pintar_velocidad() -> void:
	for b in botones_vel: b.set_pressed_no_signal(is_equal_approx(b.get_meta("vel"), Juego.velocidad))

## Ancla un panel a una esquina segun su tamano minimo y lo hace crecer hacia dentro.
func _fijar(c: Control, preset: int, margen: float) -> void:
	c.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE, int(margen))
	c.grow_horizontal = Control.GROW_DIRECTION_BEGIN if preset in [PRESET_TOP_RIGHT, PRESET_CENTER_RIGHT, PRESET_BOTTOM_RIGHT] else Control.GROW_DIRECTION_END
	c.grow_vertical = Control.GROW_DIRECTION_BEGIN if preset in [PRESET_BOTTOM_LEFT, PRESET_BOTTOM_RIGHT] else (Control.GROW_DIRECTION_BOTH if preset == PRESET_CENTER_RIGHT else Control.GROW_DIRECTION_END)

## Entrada suave de un panel (desliza + aparece).
func _aparecer(c: Control, desde: Vector2, t := 0.35) -> void:
	# Solo opacidad y escala (no la posicion): asi no pelea con los anclajes.
	c.modulate.a = 0.0
	await get_tree().process_frame
	if not is_instance_valid(c): return
	c.pivot_offset = c.size * 0.5 - desde * 4.0
	c.scale = Vector2(0.97, 0.97)
	var tw = c.create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(c, "scale", Vector2.ONE, t); tw.tween_property(c, "modulate:a", 1.0, t)

# ------------------------------------------------------------------ tarjeta del Sim
func _montar_sim() -> void:
	var m = 12.0 if not movil else 10.0
	var col = VBoxContainer.new(); add_child(col); col.mouse_filter = MOUSE_FILTER_IGNORE; sim_col = col
	var ancho = 380.0 if not movil else 440.0
	col.custom_minimum_size.x = ancho
	# Tira de avatares (todos los Sims), desplazable
	var tira = _panel(); col.add_child(tira)
	tira.add_theme_stylebox_override("panel", Tema.caja(Tema.FONDO_MOVIL if movil else Tema.FONDO, 99, 6, 10, Tema.BORDE))
	var sc = ScrollContainer.new(); sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; sc.custom_minimum_size = Vector2(ancho - 12, 46 if not movil else 58)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	tira.add_child(sc)
	avatares = HBoxContainer.new(); avatares.add_theme_constant_override("separation", 4); sc.add_child(avatares)
	panel_sim = _panel(); col.add_child(panel_sim)
	# Con scroll propio: si hay mucho detalle no tapa la barra de arriba.
	sim_scroll = ScrollContainer.new(); sim_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; panel_sim.add_child(sim_scroll)
	sim_caja = VBoxContainer.new(); sim_caja.size_flags_horizontal = SIZE_EXPAND_FILL; sim_scroll.add_child(sim_caja)
	_fijar(col, PRESET_BOTTOM_LEFT, m)
	_aparecer(col, Vector2(-30, 0), 0.45)

func _pintar_avatares(sel: Dictionary) -> void:
	_limpiar(avatares)
	var lado = 42.0 if not movil else 54.0
	for b in Juego.agentes:
		var bt = Button.new(); bt.theme_type_variation = "BotonIcono"; bt.custom_minimum_size = Vector2(lado, lado); bt.focus_mode = Control.FOCUS_NONE
		bt.tooltip_text = b.nombre
		var av = Icono.crear("avatar", lado - 8, Color.html(b.color)); av.texto = b.nombre.left(1)
		av.anillo = _color_valor(b.moral) if b.id == sel.get("id", "") else Color(1, 1, 1, 0.0)
		av.position = Vector2(4, 4); bt.add_child(av)
		bt.pressed.connect(func(): principal.seleccionar(b.id))
		_animar(bt); avatares.add_child(bt)

func _sim() -> Dictionary:
	for a in Juego.agentes: if a.id == principal.seleccionado: return a
	return Juego.agentes[0] if Juego.agentes.size() else {}

func _pintar_sim() -> void:
	_limpiar(sim_caja)
	var a = _sim()
	_pintar_avatares(a)
	if a.is_empty(): return
	var m: float = a.moral
	# Cabecera: avatar grande + nombre + actividad + gema
	var cab = HBoxContainer.new(); cab.add_theme_constant_override("separation", 12); sim_caja.add_child(cab)
	var av = Icono.crear("avatar", 54 if movil else 48, Color.html(a.color)); av.texto = a.nombre.left(1); av.anillo = _color_valor(m); cab.add_child(av)
	var vn = VBoxContainer.new(); vn.add_theme_constant_override("separation", 0); vn.size_flags_horizontal = SIZE_EXPAND_FILL; cab.add_child(vn)
	var ln = _lbl(a.nombre, 0, Color(0, 0, 0, 0), "Titulo"); ln.autowrap_mode = TextServer.AUTOWRAP_OFF; ln.clip_text = true; vn.add_child(ln)
	vn.add_child(_lbl("%s · %d años · %d €" % [ACT.get(a.actividad, a.actividad), a.edad, a.dinero], 0, Color(0, 0, 0, 0), "Sub"))
	var gema = Icono.crear("gema", 30 if movil else 26, _color_valor(m)); gema.tooltip_text = "Ánimo %d" % m; cab.add_child(gema)
	# Carrera
	var car = a.get("carrera", "programador")
	if car == "parado":
		sim_caja.add_child(_lbl("En paro · busca trabajo en Trabajo", 0, Tema.AVISO, "Sub"))
	else:
		var c = Juego.CARRERAS[car]
		var hc = HBoxContainer.new(); sim_caja.add_child(hc)
		hc.add_child(Icono.crear("trabajo", 18 if not movil else 22, Tema.ACENTO2))
		var lc = _lbl("%s · %s · %02d-%02d h · %d €/día" % [c.nombre, c.titulos[a.get("nivel", 0)], c.inicio, c.fin, Juego.sueldo_de(a)], 0, Color(0, 0, 0, 0), "Sub")
		lc.size_flags_horizontal = SIZE_EXPAND_FILL; hc.add_child(lc)
		var rb = _barra(a.get("rendimiento", 0), 6); rb.tooltip_text = "Rendimiento hacia el ascenso"
		rb.add_theme_stylebox_override("fill", Tema.caja(Tema.ACENTO2, 99, 0, 0)); sim_caja.add_child(rb)
	# Tarjeta de decision
	var tj = a.get("tarjeta", null)
	if tj != null:
		var t = _tarjeta("TarjetaAcento"); sim_caja.add_child(t)
		var vt = VBoxContainer.new(); t.add_child(vt)
		vt.add_child(_lbl(tj.texto, 0, Tema.AVISO))
		var hb2 = HBoxContainer.new(); vt.add_child(hb2)
		var b1 = _btn(tj.a[0], func(): Juego.resolver_tarjeta(a, "a"), "", "BotonAcento"); b1.size_flags_horizontal = SIZE_EXPAND_FILL; hb2.add_child(b1)
		var b2 = _btn(tj.b[0], func(): Juego.resolver_tarjeta(a, "b")); b2.size_flags_horizontal = SIZE_EXPAND_FILL; hb2.add_child(b2)
	# Necesidades: icono + barra
	var g = GridContainer.new(); g.columns = 2; g.add_theme_constant_override("h_separation", 16); sim_caja.add_child(g)
	for k in Juego.NECESIDADES:
		var v: float = a.necesidades[k]
		var f = HBoxContainer.new(); f.size_flags_horizontal = SIZE_EXPAND_FILL; f.tooltip_text = "%s %d%%" % [NEC_NOMBRE[k], v]; f.mouse_filter = Control.MOUSE_FILTER_PASS
		var ic = Icono.crear(k, 20 if not movil else 24, _color_valor(v).lerp(Color.WHITE, 0.25)); f.add_child(ic)
		var vb = VBoxContainer.new(); vb.add_theme_constant_override("separation", 1); vb.size_flags_horizontal = SIZE_EXPAND_FILL; f.add_child(vb)
		var l = _lbl(NEC_NOMBRE[k], 12, Tema.TEXTO2); l.autowrap_mode = TextServer.AUTOWRAP_OFF; vb.add_child(l)
		var br = _barra(v, 7); br.custom_minimum_size.x = 110; br.size_flags_horizontal = SIZE_EXPAND_FILL; vb.add_child(br)
		g.add_child(f)
	# Puntos de habilidad y detalle (plegable; en movil van dentro de "Más")
	if a.puntos > 0 and (not movil or sim_extra):
		var hp = HFlowContainer.new(); sim_caja.add_child(hp)
		for k in a.habilidades:
			hp.add_child(_btn("%s %d  +" % [k.capitalize(), a.habilidades[k]], func(): Juego.gastar_punto(a, k), "Gastar 1 punto de habilidad", "BotonActivo"))
		sim_caja.add_child(_lbl("%d punto(s) para gastar" % a.puntos, 12, Tema.AVISO))
	var mas = _btn(("Menos detalles" if sim_extra else "Más detalles"), func(): sim_extra = not sim_extra; _pintar_sim())
	mas.flat = true; mas.custom_minimum_size.y = alto_btn * 0.8; sim_caja.add_child(mas)
	if sim_extra:
		var t2 = _tarjeta(); sim_caja.add_child(t2)
		var ve = VBoxContainer.new(); t2.add_child(ve)
		ve.add_child(_lbl("RASGOS", 0, Color(0, 0, 0, 0), "Seccion"))
		var fr = HFlowContainer.new(); ve.add_child(fr)
		for r in a.rasgos:
			var ch = _tarjeta("Chip"); var lr = _lbl(r.capitalize(), 12); lr.autowrap_mode = TextServer.AUTOWRAP_OFF; ch.add_child(lr); fr.add_child(ch)
		if a.puntos <= 0:
			ve.add_child(_lbl("HABILIDADES", 0, Color(0, 0, 0, 0), "Seccion"))
			var hab = HFlowContainer.new(); ve.add_child(hab)
			for k in a.habilidades:
				var ch = _tarjeta("Chip"); var lh = _lbl("%s %d" % [k.capitalize(), a.habilidades[k]], 12); lh.autowrap_mode = TextServer.AUTOWRAP_OFF; ch.add_child(lh); hab.add_child(ch)
		ve.add_child(_lbl("FAMILIA", 0, Color(0, 0, 0, 0), "Seccion"))
		ve.add_child(_lbl(Juego.arbol_familiar(a) + ("  · enfermo/a" if a.get("enfermo", 0) > 0 else ""), 13))
		var am = []
		for id in a.amistades:
			for b in Juego.agentes: if b.id == id: am.append("%s %d" % [b.nombre.get_slice(" ", 0), a.amistades[id]])
		ve.add_child(_lbl("AMISTADES", 0, Color(0, 0, 0, 0), "Seccion"))
		ve.add_child(_lbl(", ".join(am) if am.size() else "Aún nadie", 13, Tema.TEXTO2))
	_ajustar_sim.call_deferred()

## Alto del panel del Sim: lo que ocupe, pero sin pasar de la barra superior.
func _ajustar_sim() -> void:
	if not is_instance_valid(sim_scroll): return
	var alto_vista = get_viewport_rect().size.y
	var libre = alto_vista - (110.0 if not movil else 104.0) - (66.0 if not movil else 78.0) - 40.0
	sim_scroll.custom_minimum_size.y = minf(sim_caja.get_combined_minimum_size().y, maxf(160.0, libre))
	# Encoge tambien hacia abajo (crecer hacia arriba no deshace solo)
	sim_col.offset_top = sim_col.offset_bottom - sim_col.get_combined_minimum_size().y

# ------------------------------------------------------------------ rail + cajon
func _montar_rail_y_cajon() -> void:
	var m = 12.0 if not movil else 10.0
	var lado = 50.0 if not movil else 62.0
	var rp = _panel(); add_child(rp)
	rp.add_theme_stylebox_override("panel", Tema.caja(Tema.FONDO_MOVIL if movil else Tema.FONDO, 22, 6, 14, Tema.BORDE))
	rail = VBoxContainer.new(); rail.add_theme_constant_override("separation", 4); rp.add_child(rail)
	for p in PAGINAS:
		var b = _btn_icono(p[1], func(): alternar(p[0]), p[0], lado); b.toggle_mode = true
		rail.add_child(b); rail_btns[p[0]] = b
	_fijar.call_deferred(rp, PRESET_CENTER_RIGHT, m)
	_aparecer(rp, Vector2(30, 0), 0.45)
	# Cajon
	cajon = _panel(); add_child(cajon); cajon.visible = false
	cajon.set_anchors_preset(PRESET_RIGHT_WIDE)
	var vw = get_viewport_rect().size.x / get_window().content_scale_factor
	var ancho = 420.0 if not movil else clampf(vw * 0.55, 380, 640)
	cajon.offset_right = -(m + lado + 12 + 16); cajon.offset_left = cajon.offset_right - ancho
	cajon.offset_top = 96 if not movil else 104; cajon.offset_bottom = -m
	var v = VBoxContainer.new(); v.add_theme_constant_override("separation", 10); cajon.add_child(v)
	var cab = HBoxContainer.new(); v.add_child(cab)
	cajon_titulo = _lbl("", 0, Color(0, 0, 0, 0), "Titulo"); cajon_titulo.size_flags_horizontal = SIZE_EXPAND_FILL; cab.add_child(cajon_titulo)
	cab.add_child(_btn_icono("cerrar", cerrar_cajon, "Cerrar (Esc)", 36.0 if not movil else 48.0))
	var hs = HSeparator.new(); hs.add_theme_stylebox_override("separator", Tema.caja(Color(1, 1, 1, 0.08), 0, 0)); v.add_child(hs)
	cajon_cuerpo = Control.new(); cajon_cuerpo.size_flags_vertical = SIZE_EXPAND_FILL; v.add_child(cajon_cuerpo)
	comprar_caja = _pagina("Comprar")
	pueblo_caja = _pagina("Pueblo")
	trabajo_caja = _pagina("Trabajo")
	pixel_caja = _pagina("Pixelgram")
	var sc = _scroll("Diario")
	diario = RichTextLabel.new(); diario.fit_content = true; diario.size_flags_horizontal = SIZE_EXPAND_FILL; diario.bbcode_enabled = true; sc.add_child(diario)
	ia_caja = _pagina("Motor IA")
	dlc_caja = _pagina("Expansiones")
	ajustes_caja = _pagina("Ajustes")

func _scroll(nombre: String) -> ScrollContainer:
	var sc = ScrollContainer.new(); sc.name = nombre; sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.set_anchors_and_offsets_preset(PRESET_FULL_RECT); sc.visible = false
	cajon_cuerpo.add_child(sc); paginas[nombre] = sc
	return sc

func _pagina(nombre: String) -> VBoxContainer:
	var sc = _scroll(nombre)
	var v = VBoxContainer.new(); v.size_flags_horizontal = SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 8); sc.add_child(v)
	return v

func alternar(nombre: String) -> void:
	if pagina == nombre: cerrar_cajon()
	else: abrir(nombre)

func abrir(nombre: String) -> void:
	var elegido = ""
	for p in PAGINAS: if nombre.to_lower() in p[0].to_lower(): elegido = p[0]; break
	if elegido == "": return
	var ya_abierto = pagina != ""
	pagina = elegido
	for k in paginas: paginas[k].visible = k == elegido
	for k in rail_btns: rail_btns[k].set_pressed_no_signal(k == elegido)
	cajon_titulo.text = elegido
	_pintar_pagina()
	cajon.visible = true
	if _tw_cajon: _tw_cajon.kill()
	_tw_cajon = cajon.create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if not ya_abierto:
		cajon.modulate.a = 0.0; cajon.pivot_offset = Vector2(cajon.size.x, cajon.size.y * 0.5); cajon.scale = Vector2(0.96, 0.96)
	_tw_cajon.tween_property(cajon, "modulate:a", 1.0, 0.22); _tw_cajon.tween_property(cajon, "scale", Vector2.ONE, 0.25)

func cerrar_cajon() -> void:
	pagina = ""
	for k in rail_btns: rail_btns[k].set_pressed_no_signal(false)
	if _tw_cajon: _tw_cajon.kill()
	cajon.pivot_offset = Vector2(cajon.size.x, cajon.size.y * 0.5)
	_tw_cajon = cajon.create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	_tw_cajon.tween_property(cajon, "modulate:a", 0.0, 0.16); _tw_cajon.tween_property(cajon, "scale", Vector2(0.96, 0.96), 0.16)
	_tw_cajon.chain().tween_callback(func(): if pagina == "": cajon.visible = false)

func _pintar_pagina() -> void:
	match pagina:
		"Comprar": _pintar_comprar()
		"Pueblo": _pintar_pueblo()
		"Trabajo": _pintar_trabajo()
		"Pixelgram": _pintar_pixelgram()
		"Diario": _pintar_diario()
		"Ajustes": _pintar_graficos()

# ------------------------------------------------------------------ menu
func abrir_menu(si: bool) -> void:
	if menu == null:
		menu = MenuPrincipal.new(); menu.ui = self; add_child(menu)
	if si: menu.mostrar()
	else: menu.ocultar()

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

# ------------------------------------------------------------------ refresco
func refrescar() -> void:
	var e = Juego.empresa
	var c = Juego.clima
	var noche = Juego.es_noche()
	reloj_lbl.text = "Día %d · %02d:00" % [Juego.dia, Juego.hora]
	reloj_sub.text = "%s · %s · %s" % [Juego.pueblo.nombre, Juego.estacion().capitalize(), NOMBRE_TIEMPO.get(c.tipo, c.tipo)]
	var ti = c.tipo
	if ti == "despejado" and noche: ti = "luna"
	icono_tiempo.poner(ti, Tema.AVISO if ti in ["despejado", "calor", "sol"] else (Color("dfe7ff") if ti != "luna" else Color("ffe9a8")))
	icono_tiempo.tooltip_text = "Previsión: " + ", ".join(c.prevision.map(func(x): return NOMBRE_TIEMPO.get(x.tipo, x.tipo)))
	_limpiar(prevision_caja)
	var lp = _lbl("Previsión", 11, Tema.TEXTO2); lp.autowrap_mode = TextServer.AUTOWRAP_OFF; prevision_caja.add_child(lp)
	for p in c.prevision:
		var ic = Icono.crear(p.tipo, 16 if not movil else 20, Color(1, 1, 1, 0.75)); ic.tooltip_text = NOMBRE_TIEMPO.get(p.tipo, p.tipo); ic.mouse_filter = Control.MOUSE_FILTER_PASS
		prevision_caja.add_child(ic)
	dinero_lbl.text = _miles(int(e.dinero)) + " €"
	dinero_lbl.tooltip_text = "%s · %s (%s)" % [e.nombre, Juego.pueblo.nombre, Juego.nivel_ciudad()]
	_pintar_velocidad()
	_pintar_sim()
	if pagina in ["Comprar", "Pueblo", "Trabajo", "Pixelgram"]: _pintar_pagina()

func _miles(n: int) -> String:
	var s = str(absi(n)); var r = ""
	while s.length() > 3: r = "." + s.right(3) + r; s = s.left(s.length() - 3)
	return ("-" if n < 0 else "") + s + r

# ------------------------------------------------------------------ paginas
func _pintar_comprar() -> void:
	_limpiar(comprar_caja)
	var a = _sim()
	var cab = _tarjeta("TarjetaAcento"); comprar_caja.add_child(cab)
	var hc = HBoxContainer.new(); cab.add_child(hc)
	hc.add_child(Icono.crear("comprar", 22, Tema.ACENTO))
	var lc = _lbl1("Paga %s" % a.get("nombre", ""), 0); lc.size_flags_horizontal = SIZE_EXPAND_FILL; hc.add_child(lc)
	hc.add_child(_lbl1("%s €" % _miles(int(a.get("dinero", 0))), 0, Color(0, 0, 0, 0), "Titulo"))
	var cats = ["Todo"]
	for o in Juego.TIENDA: if not (o.cat in cats): cats.append(o.cat)
	var fila = HFlowContainer.new(); comprar_caja.add_child(fila)
	for c in cats:
		var b = _btn(c, func(): categoria = c; _pintar_comprar(), "", "BotonActivo" if c == categoria else "")
		b.custom_minimum_size.y = alto_btn * 0.85; fila.add_child(b)
	var g = GridContainer.new(); g.columns = 2 if not movil else 2; g.add_theme_constant_override("h_separation", 8); g.add_theme_constant_override("v_separation", 8); comprar_caja.add_child(g)
	for o in Juego.TIENDA:
		if categoria != "Todo" and o.cat != categoria: continue
		var t = _tarjeta(); t.size_flags_horizontal = SIZE_EXPAND_FILL; g.add_child(t)
		var v = VBoxContainer.new(); t.add_child(v)
		var tienda = o.get("tienda", "")
		v.add_child(_lbl(o.nombre, 0))
		v.add_child(_lbl(o.cat + ((" · " + tienda.capitalize()) if tienda != "" else "") + ("  · ya lo tienes" if o.id in a.get("muebles", []) else ""), 0, Color(0, 0, 0, 0), "Sub"))
		var hb = HBoxContainer.new(); v.add_child(hb)
		var pl = _lbl1("%s €" % _miles(o.precio), 0, Tema.AVISO, "Titulo"); pl.size_flags_horizontal = SIZE_EXPAND_FILL; hb.add_child(pl)
		var b = _btn("Comprar", func(): _aviso(Juego.comprar(a, o.id)), "", "BotonAcento"); b.disabled = a.get("dinero", 0) < o.precio
		if b.disabled: b.theme_type_variation = ""
		hb.add_child(b)

func _pintar_pueblo() -> void:
	_limpiar(pueblo_caja)
	var p = Juego.pueblo
	var cab = _tarjeta("TarjetaAcento"); pueblo_caja.add_child(cab)
	var vc = VBoxContainer.new(); cab.add_child(vc)
	vc.add_child(_lbl(p.nombre, 0, Color(0, 0, 0, 0), "Titulo"))
	var band = HBoxContainer.new(); band.add_theme_constant_override("separation", 0); vc.add_child(band)
	for c in p.bandera:
		var r = Panel.new(); r.custom_minimum_size = Vector2(36, 20); r.add_theme_stylebox_override("panel", Tema.caja(Color.html(c), 4, 0)); band.add_child(r)
	vc.add_child(_lbl("%s · %d edificios · las IAs proponen y votan qué construir con su sueldo." % [Juego.nivel_ciudad(), p.edificios.size()], 0, Color(0, 0, 0, 0), "Sub"))
	pueblo_caja.add_child(_btn("Modo: " + ("deciden ellos solos" if p.modo == "libre" else "tú apruebas"), func(): p.modo = "aprobar" if p.modo == "libre" else "libre"; refrescar()))
	for pr in p.propuestas:
		var est = {"votando": "Votando", "esperando_jefe": "Decides tú", "aprobada": "Juntando dinero", "en_obras": "En obras", "hecha": "Hecha", "rechazada": "Rechazada"}[pr.estado]
		var t = _tarjeta("TarjetaAcento" if pr.estado == "esperando_jefe" else "Tarjeta"); pueblo_caja.add_child(t)
		var v = VBoxContainer.new(); t.add_child(v)
		var h = HBoxContainer.new(); v.add_child(h)
		var ln = _lbl(pr.nombre, 0, Color(0, 0, 0, 0), "Titulo"); ln.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(ln)
		var ch = _tarjeta("Chip"); ch.add_child(_lbl1(est, 12, Tema.ACENTO2)); h.add_child(ch)
		v.add_child(_lbl("Propone %s: «%s»" % [pr.autor_nombre, pr.motivo], 0, Color(0, 0, 0, 0), "Sub"))
		var pb = _barra(100.0 * pr.fondos / maxf(1.0, pr.coste), 8); pb.add_theme_stylebox_override("fill", Tema.caja(Tema.ACENTO2, 99, 0, 0)); v.add_child(pb)
		v.add_child(_lbl("%s / %s €" % [_miles(int(pr.fondos)), _miles(int(pr.coste))], 12, Tema.TEXTO2))
		if pr.estado == "esperando_jefe":
			var hb = HBoxContainer.new(); v.add_child(hb)
			var b1 = _btn("Aprobar", func(): Juego.decidir_propuesta(pr.id, true), "", "BotonAcento"); b1.size_flags_horizontal = SIZE_EXPAND_FILL; hb.add_child(b1)
			var b2 = _btn("Vetar", func(): Juego.decidir_propuesta(pr.id, false), "", "BotonPeligro"); b2.size_flags_horizontal = SIZE_EXPAND_FILL; hb.add_child(b2)
		if pr.estado == "aprobada": v.add_child(_btn("Pagar el resto con la empresa", func(): Juego.donar_a_obra()))

func _pintar_diario() -> void:
	var t = ""
	for s in Juego.sucesos.slice(-40): t = "[color=#7fd8ff]Día %d · %02d:00[/color]\n%s\n\n" % [s.dia, s.hora, s.texto] + t
	diario.text = t

func _pintar_trabajo() -> void:
	_limpiar(trabajo_caja)
	var a = _sim()
	if a.is_empty(): return
	trabajo_caja.add_child(_lbl("Ofertas para %s (periódico, ordenador y Pixelgram)" % a.nombre, 0, Color(0, 0, 0, 0), "Sub"))
	var car = a.get("carrera", "programador")
	if car != "parado": trabajo_caja.add_child(_btn("Dejar el trabajo actual", func(): Juego.dejar_trabajo(a), "", "BotonPeligro"))
	for id in Juego.ofertas(a):
		var c = Juego.CARRERAS[id]
		var t = _tarjeta(); trabajo_caja.add_child(t)
		var v = VBoxContainer.new(); t.add_child(v)
		var h = HBoxContainer.new(); v.add_child(h)
		h.add_child(Icono.crear("trabajo", 20, Tema.ACENTO2))
		var ln = _lbl(c.nombre, 0, Color(0, 0, 0, 0), "Titulo"); ln.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(ln)
		h.add_child(_lbl1("%d-%d €/día" % [c.sueldo[0], c.sueldo[4]], 0, Tema.AVISO))
		v.add_child(_lbl("%02d-%02d h · %s%s" % [c.inicio, c.fin, c.habilidad.capitalize(), (" · " + c.vehiculo) if c.vehiculo != "" else ""], 0, Color(0, 0, 0, 0), "Sub"))
		v.add_child(_btn("Solicitar puesto de " + c.titulos[0], func(): _aviso(Juego.cambiar_carrera(a, id)), "", "BotonAcento"))

func _pintar_pixelgram() -> void:
	_limpiar(pixel_caja)
	var l = Juego.pixelgram.duplicate(); l.reverse()
	if l.is_empty(): pixel_caja.add_child(_lbl("Nadie ha publicado aún.", 0, Color(0, 0, 0, 0), "Sub"))
	for p in l.slice(0, 25):
		var t = _tarjeta(); pixel_caja.add_child(t)
		var v = VBoxContainer.new(); t.add_child(v)
		var h = HBoxContainer.new(); v.add_child(h)
		var av = Icono.crear("avatar", 32 if not movil else 40, Color.from_hsv(fmod(hash(p.autor) / 1000.0, 1.0), 0.45, 0.85)); av.texto = str(p.autor).left(1).to_upper(); h.add_child(av)
		var vn = VBoxContainer.new(); vn.add_theme_constant_override("separation", 0); vn.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(vn)
		vn.add_child(_lbl("@" + str(p.autor), 0, Color("d8b4ff")))
		vn.add_child(_lbl("Día %d · %02d:00" % [p.dia, p.hora], 11, Tema.TEXTO2))
		v.add_child(_lbl(p.texto, 0))
		var hl = HBoxContainer.new(); v.add_child(hl)
		hl.add_child(Icono.crear("corazon", 16 if not movil else 20, Tema.PELIGRO)); hl.add_child(_lbl1("%d me gusta" % p.likes, 12, Tema.TEXTO2))

# ------------------------------------------------------------------ ajustes
func _seccion(c: Container, t: String) -> VBoxContainer:
	var tj = _tarjeta(); c.add_child(tj)
	var v = VBoxContainer.new(); tj.add_child(v)
	v.add_child(_lbl(t.to_upper(), 0, Color(0, 0, 0, 0), "Seccion"))
	return v

func _montar_ajustes() -> void:
	var c = _seccion(ajustes_caja, "Calidad gráfica")
	var h = HBoxContainer.new(); c.add_child(h)
	for q in (["bajo", "medio", "alto"] if OS.has_feature("mobile") else ["bajo", "medio", "alto", "ultra"]):
		var b = _btn(q.capitalize(), func(): principal.poner_calidad(q); _pintar_graficos(); _aviso("Calidad: " + q.capitalize()))
		b.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(b)
	c.add_child(_btn("Gráficos avanzados…", func(): graficos_caja.visible = not graficos_caja.visible; _pintar_graficos()))
	graficos_caja = VBoxContainer.new(); graficos_caja.visible = false; c.add_child(graficos_caja)
	var ab = CheckButton.new(); ab.text = "Ahorro de batería (30 FPS)"
	ab.button_pressed = OS.low_processor_usage_mode
	ab.toggled.connect(func(x): OS.low_processor_usage_mode = x; principal.G.cambiar("fps", "30" if x else "60"); principal.aplicar_graficos()); c.add_child(ab)
	# Interfaz
	var ui = _seccion(ajustes_caja, "Interfaz")
	var cf = ConfigFile.new(); cf.load("user://ajustes.cfg")
	var fila = HBoxContainer.new(); ui.add_child(fila)
	var lt = _lbl("Tamaño", 0); lt.custom_minimum_size.x = 90; lt.autowrap_mode = TextServer.AUTOWRAP_OFF; fila.add_child(lt)
	var sl = HSlider.new(); sl.min_value = 0.8; sl.max_value = 1.5; sl.step = 0.05; sl.value = cf.get_value("ui", "escala", 1.0); sl.size_flags_horizontal = SIZE_EXPAND_FILL
	sl.size_flags_vertical = SIZE_SHRINK_CENTER; fila.add_child(sl)
	var vl = _lbl("%d %%" % int(sl.value * 100), 0); vl.custom_minimum_size.x = 56; fila.add_child(vl)
	sl.value_changed.connect(func(x): vl.text = "%d %%" % int(x * 100))
	sl.drag_ended.connect(func(_c): var k = ConfigFile.new(); k.load("user://ajustes.cfg"); k.set_value("ui", "escala", sl.value); k.save("user://ajustes.cfg"); _aplicar_escala())
	ui.add_child(_lbl("Siempre a resolución completa: el texto y los iconos se dibujan nítidos a cualquier tamaño.", 0, Color(0, 0, 0, 0), "Sub"))
	# IA
	var ia = _seccion(ajustes_caja, "IA: LM Studio (PC o por la wifi)")
	var url = LineEdit.new(); url.text = Llm.url; url.placeholder_text = "http://192.168.1.50:1234"; url.custom_minimum_size.y = alto_btn; ia.add_child(url)
	ia.add_child(_btn("Probar conexión", func(): Llm.probar(url.text)))
	estado_llm = _lbl("", 0, Color(0, 0, 0, 0), "Sub"); ia.add_child(estado_llm); _pintar_llm()
	ia.add_child(_lbl("Sin conexión, los Sims usan frases escritas (modo demo).", 0, Color(0, 0, 0, 0), "Sub"))
	var md = _seccion(ajustes_caja, "Mods (solo datos)")
	md.add_child(_btn("Instalar .zip", _elegir_zip))
	mods_caja = VBoxContainer.new(); md.add_child(mods_caja); _pintar_mods()
	var ac = _seccion(ajustes_caja, "Actualizaciones · versión %s" % Juego.VERSION)
	ac.add_child(_btn("Buscar actualizaciones", func(): Actualizador.comprobar(true)))
	estado_act = _lbl("", 0, Color(0, 0, 0, 0), "Sub"); ac.add_child(estado_act)
	Actualizador.estado.connect(func(t): estado_act.text = t)
	Actualizador.hay_version.connect(_dialogo_actualizacion)
	var pa = _seccion(ajustes_caja, "Partida")
	pa.add_child(_btn("Guardar ahora", func(): Juego.guardar(); _aviso("Guardado."), "", "BotonAcento"))
	pa.add_child(_btn("Partida nueva", _confirmar_nueva, "", "BotonPeligro"))
	ajustes_caja.add_child(_lbl("Créditos: modelos 3D hechos con Blender (tools/arte), motor Godot (MIT), fuente Nunito (OFL). Ver CREDITS.md.", 0, Color(0, 0, 0, 0), "Sub"))

func _confirmar_nueva() -> void:
	var d = ConfirmationDialog.new(); add_child(d)
	d.title = "Partida nueva"; d.dialog_text = "Se empezará un pueblo nuevo. La partida actual se perderá si no la has guardado."
	d.ok_button_text = "Empezar de cero"; d.cancel_button_text = "Cancelar"
	d.confirmed.connect(func(): Juego.nueva_partida(); get_tree().reload_current_scene())
	d.popup_centered(Vector2i(520, 200))

func _pintar_llm() -> void:
	if estado_llm: estado_llm.text = ("Conectado · " + Llm.modelo) if Llm.conectado else (Llm.ultimo_error if Llm.ultimo_error != "" else "Sin probar")

func _pintar_mods() -> void:
	if mods_caja == null: return
	_limpiar(mods_caja)
	if Mods.mods.is_empty(): mods_caja.add_child(_lbl("No tienes mods.", 0, Color(0, 0, 0, 0), "Sub"))
	for m in Mods.mods:
		mods_caja.add_child(_lbl("%s%s v%s · %s\n%s" % ["" if m.activo else "(pausado) ", m.nombre, m.version, m.autor, m.descripcion], 13))
		var h = HBoxContainer.new(); mods_caja.add_child(h)
		h.add_child(_btn_icono("flecha_arriba", func(): Mods.mover(m.id, -1); _pintar_mods(), "Cargar antes"))
		h.add_child(_btn_icono("flecha_abajo", func(): Mods.mover(m.id, 1); _pintar_mods(), "Cargar después"))
		h.add_child(_btn("Desactivar" if m.activo else "Activar", func(): Mods.alternar(m.id); _pintar_mods()))
		h.add_child(_btn_icono("cerrar", func(): Mods.quitar(m.id); _pintar_mods(), "Quitar mod"))
	for av in Mods.avisos: mods_caja.add_child(_lbl(av, 12, Tema.AVISO))

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

## Aviso flotante (toast) que baja desde arriba y se desvanece.
var _avisos_n := 0
func _aviso(t: String) -> void:
	var p = _panel(false); p.mouse_filter = MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", Tema.caja(Color(0.06, 0.08, 0.12, 0.95), 99, 12, 12, Color(Tema.ACENTO, 0.5)))
	var h = HBoxContainer.new(); p.add_child(h)
	h.add_child(Icono.crear("gema", 18 if not movil else 22, Tema.ACENTO))
	var l = _lbl(t, 0); l.autowrap_mode = TextServer.AUTOWRAP_OFF; h.add_child(l)
	add_child(p)
	p.set_anchors_preset(PRESET_CENTER_TOP); p.grow_horizontal = Control.GROW_DIRECTION_BOTH
	var y = (90.0 if not movil else 100.0) + _avisos_n * 56.0; _avisos_n += 1
	p.offset_top = y - 20; p.modulate.a = 0.0
	var tw = p.create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.set_parallel(true); tw.tween_property(p, "offset_top", y, 0.3); tw.tween_property(p, "modulate:a", 1.0, 0.2)
	tw.chain().tween_interval(2.2)
	tw.chain().tween_property(p, "modulate:a", 0.0, 0.4)
	tw.chain().tween_callback(func(): _avisos_n = maxi(0, _avisos_n - 1); p.queue_free())

## Menu grafico avanzado: cada cambio se aplica al momento (vista previa en vivo).
func _pintar_graficos() -> void:
	if graficos_caja == null or not graficos_caja.visible: return
	_limpiar(graficos_caja)
	var G = principal.G
	graficos_caja.add_child(_lbl("Preajuste: " + G.preset.capitalize(), 0, Tema.AVISO))
	var mov = OS.has_feature("mobile")
	for o in G.OPCIONES:
		var k: String = o[0]
		var fila = HBoxContainer.new(); graficos_caja.add_child(fila)
		var l = _lbl(o[1] + (" (solo PC)" if o[4] and mov else ""), 13); l.custom_minimum_size.x = 170; l.size_flags_horizontal = SIZE_EXPAND_FILL; fila.add_child(l)
		match o[2]:
			"bool":
				var cb = CheckButton.new(); cb.button_pressed = G.v.get(k, false); cb.disabled = o[4] and mov
				cb.toggled.connect(func(x): G.cambiar(k, x); principal.aplicar_graficos()); fila.add_child(cb)
			"lista":
				var ob = OptionButton.new(); ob.focus_mode = Control.FOCUS_NONE
				for it in o[3]: ob.add_item(it)
				ob.selected = o[3].find(str(G.v.get(k, o[3][0])))
				ob.item_selected.connect(func(i): G.cambiar(k, o[3][i]); principal.aplicar_graficos()); fila.add_child(ob)
			"rango":
				var sl = HSlider.new(); sl.min_value = o[3][0]; sl.max_value = o[3][1]; sl.step = o[3][2]
				sl.value = G.v.get(k, o[3][0]); sl.custom_minimum_size.x = 120; sl.size_flags_horizontal = SIZE_EXPAND_FILL; sl.size_flags_vertical = SIZE_SHRINK_CENTER
				var vl = _lbl(str(sl.value), 12); vl.custom_minimum_size.x = 40
				sl.value_changed.connect(func(x): vl.text = str(x); G.cambiar(k, x); principal.aplicar_graficos())
				fila.add_child(sl); fila.add_child(vl)

func _pintar_ia() -> void:
	_limpiar(ia_caja); _barras_ia.clear()
	var M = MotorIA
	var cab = _tarjeta("TarjetaAcento"); ia_caja.add_child(cab)
	var vc = VBoxContainer.new(); cab.add_child(vc)
	var hc = HBoxContainer.new(); vc.add_child(hc)
	hc.add_child(Icono.crear("ia", 24, Tema.ACENTO))
	var ld = _lbl("Tu dispositivo: %.1f GB RAM · %d núcleos" % [M.ram_gb, M.nucleos], 0); ld.size_flags_horizontal = SIZE_EXPAND_FILL; hc.add_child(ld)
	vc.add_child(_lbl("Motor local llama.cpp: " + ("listo" if M.hay_llama() else "no instalado en esta versión"), 0, Tema.ACENTO if M.hay_llama() else Tema.AVISO))
	var hb = HFlowContainer.new(); ia_caja.add_child(hb)
	for b in [["local", "En el dispositivo"], ["lmstudio", "LM Studio (PC)"], ["lan", "Red local"], ["demo", "IA simulada"]]:
		hb.add_child(_btn(b[1], func(): M.backend = b[0]; M.guardar(), "", "BotonActivo" if M.backend == b[0] else ""))
	ia_caja.add_child(_lbl("IA simulada: sin modelo real; los Sims usan plantillas y la IA de utilidad (necesidades, rasgos, amistades) para hablar y decidir. Se activa sola en móviles con menos de 3 GB de RAM, CPU flojo o benchmark lento.", 0, Color(0, 0, 0, 0), "Sub"))
	var hb2 = HBoxContainer.new(); ia_caja.add_child(hb2)
	for a in ["cpu", "gpu"]:
		var x = _btn("Acelerador " + a.to_upper(), func(): M.acelerador = a; M.guardar(), "", "BotonActivo" if M.acelerador == a else ""); x.size_flags_horizontal = SIZE_EXPAND_FILL; hb2.add_child(x)
	for s in [["Temperatura", "temperatura", 0.0, 1.5, 0.05], ["Contexto", "contexto", 256, 4096, 256]]:
		var f = HBoxContainer.new(); ia_caja.add_child(f)
		var l = _lbl("%s: %s" % [s[0], M.get(s[1])], 13); l.custom_minimum_size.x = 150; f.add_child(l)
		var sl = HSlider.new(); sl.min_value = s[2]; sl.max_value = s[3]; sl.step = s[4]; sl.value = M.get(s[1]); sl.size_flags_horizontal = SIZE_EXPAND_FILL; sl.size_flags_vertical = SIZE_SHRINK_CENTER
		sl.drag_ended.connect(func(_c): M.set(s[1], sl.value if s[1] == "temperatura" else int(sl.value)); M.guardar()); f.add_child(sl)
	ia_caja.add_child(_btn("Benchmark", func(): _aviso(M.benchmark())))
	if M.ultimo_benchmark != "": ia_caja.add_child(_lbl(M.ultimo_benchmark, 12))
	var rec = M.recomendado()
	for m in M.CATALOGO:
		var t = _tarjeta("TarjetaAcento" if m.id == rec else "Tarjeta"); ia_caja.add_child(t)
		var v = VBoxContainer.new(); t.add_child(v)
		var hn = HBoxContainer.new(); v.add_child(hn)
		var ln = _lbl(m.nombre, 0, Color(0, 0, 0, 0), "Titulo"); ln.size_flags_horizontal = SIZE_EXPAND_FILL; hn.add_child(ln)
		if m.id == rec: var ch = _tarjeta("Chip"); ch.add_child(_lbl1("Recomendado", 12, Tema.ACENTO)); hn.add_child(ch)
		if m.id == M.modelo: var ch2 = _tarjeta("Chip"); ch2.add_child(_lbl1("Activo", 12, Tema.ACENTO2)); hn.add_child(ch2)
		v.add_child(_lbl("%d MB · %.1f GB RAM · ~%.0f tok/s · Licencia: %s" % [m.mb, m.ram, M.estimacion_tps(m), m.licencia], 0, Color(0, 0, 0, 0), "Sub"))
		var f = HBoxContainer.new(); v.add_child(f)
		if not M.cabe(m): f.add_child(_lbl("Bloqueado: demasiado grande para este dispositivo", 12, Tema.PELIGRO))
		elif M.descargas.has(m.id):
			var pb = _barra(0); pb.size_flags_horizontal = SIZE_EXPAND_FILL; pb.size_flags_vertical = SIZE_SHRINK_CENTER; f.add_child(pb); _barras_ia[m.id] = pb
			f.add_child(_btn("Cancelar", func(): M.cancelar(m.id)))
		elif M.descargado(m.id):
			f.add_child(_btn("Usar", func(): M.modelo = m.id; M.guardar(), "", "BotonAcento"))
			f.add_child(_btn("Borrar", func(): M.borrar(m.id), "", "BotonPeligro"))
		else:
			f.add_child(_btn("Descargar (%d MB, mejor con wifi)" % m.mb, func(): M.descargar(m.id)))
	ia_caja.add_child(_lbl(M.AVISO_GEMMA, 11, Tema.TEXTO2))

func _pintar_dlc() -> void:
	_limpiar(dlc_caja)
	dlc_caja.add_child(_lbl("Expansiones oficiales. El juego base está completo.", 0, Color(0, 0, 0, 0), "Sub"))
	for p in Dlc.PACKS:
		var pc = PanelContainer.new()
		var c1 = Color.html(p.portada[0]); var c2 = Color.html(p.portada[1])
		pc.add_theme_stylebox_override("panel", Tema.caja(c1, 16, 14, 8, Color(c2, 0.7)))
		dlc_caja.add_child(pc)
		var v = VBoxContainer.new(); pc.add_child(v)
		var h = HBoxContainer.new(); v.add_child(h)
		h.add_child(Icono.crear("dlc", 26, c2))
		var ln = _lbl(p.nombre, 0, c2, "Titulo"); ln.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(ln)
		var ch = _tarjeta("Chip"); ch.add_child(_lbl1("Instalado" if Dlc.tiene(p.id) else "Bloqueado", 12, Tema.ACENTO if Dlc.tiene(p.id) else Tema.AVISO)); h.add_child(ch)
		v.add_child(_lbl(p.desc, 0, Color(1, 1, 1, 0.85)))
	var le = LineEdit.new(); le.placeholder_text = "PS1-..."; le.custom_minimum_size.y = alto_btn; dlc_caja.add_child(le)
	dlc_caja.add_child(_btn("Canjear código", func(): _aviso(Dlc.canjear(le.text)), "", "BotonAcento"))
	dlc_caja.add_child(_lbl("Los mods de la comunidad siguen en Ajustes → Mods.", 0, Color(0, 0, 0, 0), "Sub"))
