extends Control
## Menu principal / de pausa: tarjeta de cristal a la izquierda sobre el pueblo
## en 3D (la camara gira despacio detras). Esc lo abre y lo cierra.

const Tema = preload("res://scripts/ui/tema.gd")
const Icono = preload("res://scripts/ui/icono.gd")

## Pagina de apoyo voluntario en Ko-fi (se abre en el navegador; no hay pagos
## dentro del juego). Vacia = los botones «Apoya PixelSoft» no se muestran.
const KOFI = ""

var ui
var tarjeta: PanelContainer
var _vel_antes := 1.0
var _girando := false

func _ready() -> void:
	set_anchors_and_offsets_preset(PRESET_FULL_RECT)
	mouse_filter = MOUSE_FILTER_STOP
	visible = false
	# Degradado oscuro a la izquierda para que se lea el texto
	var fondo = TextureRect.new(); fondo.set_anchors_and_offsets_preset(PRESET_FULL_RECT); fondo.mouse_filter = MOUSE_FILTER_IGNORE
	var g = GradientTexture2D.new(); g.width = 256; g.height = 4
	var gr = Gradient.new(); gr.set_color(0, Color(0.03, 0.04, 0.08, 0.82)); gr.set_color(1, Color(0.03, 0.04, 0.08, 0.15)); g.gradient = gr
	fondo.texture = g; fondo.stretch_mode = TextureRect.STRETCH_SCALE; fondo.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	add_child(fondo)
	var movil: bool = ui.movil
	# Columna a la izquierda, centrada en vertical (robusto a cualquier alto)
	var colm = VBoxContainer.new(); colm.alignment = BoxContainer.ALIGNMENT_CENTER; colm.mouse_filter = MOUSE_FILTER_IGNORE; add_child(colm)
	colm.set_anchors_and_offsets_preset(PRESET_LEFT_WIDE)
	colm.offset_left = 56 if not movil else 32; colm.offset_top = 16; colm.offset_bottom = -16
	tarjeta = PanelContainer.new(); colm.add_child(tarjeta)
	if not movil: tarjeta.material = Tema.cristal()
	tarjeta.add_theme_stylebox_override("panel", Tema.caja(Color(0.07, 0.09, 0.15, 0.78 if not movil else 0.94), 28, 32, 24, Tema.BORDE))
	tarjeta.custom_minimum_size.x = 380 if not movil else 460
	var v = VBoxContainer.new(); v.add_theme_constant_override("separation", 12 if not movil else 14); tarjeta.add_child(v)
	var logo = HBoxContainer.new(); logo.add_theme_constant_override("separation", 14); v.add_child(logo)
	var marca = TextureRect.new(); marca.texture = load("res://assets/logo/gema_512.png")
	marca.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; marca.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var lado := 64 if not movil else 78; marca.custom_minimum_size = Vector2(lado, lado)
	marca.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; marca.mouse_filter = MOUSE_FILTER_IGNORE
	logo.add_child(marca)
	var vt = VBoxContainer.new(); vt.add_theme_constant_override("separation", -6); logo.add_child(vt)
	var t = Label.new(); t.text = "PixelSoft"; t.theme_type_variation = "TituloGrande"; vt.add_child(t)
	var s = Label.new(); s.text = "Vida en %s · v%s" % [Juego.pueblo.nombre, Juego.VERSION]; s.theme_type_variation = "Sub"; vt.add_child(s)
	var sep = HSeparator.new(); sep.add_theme_stylebox_override("separator", Tema.caja(Color(1, 1, 1, 0.08), 0, 0)); v.add_child(sep)
	var resumen = Label.new(); resumen.theme_type_variation = "Sub"; resumen.name = "Resumen"; v.add_child(resumen)
	v.add_child(_boton("Continuar", "play", ocultar, "BotonAcento"))
	v.add_child(_boton("Ajustes", "ajustes", func(): ocultar(); ui.abrir("Ajustes")))
	v.add_child(_boton("Expansiones", "dlc", func(): ocultar(); ui.abrir("Expansiones")))
	v.add_child(_boton("Guardar partida", "diario", func(): Juego.guardar(); ui._aviso("Guardado.")))
	v.add_child(_boton("Partida nueva", "mas", func(): ui._confirmar_nueva()))
	if KOFI != "": v.add_child(_boton("Apoya PixelSoft en Ko-fi", "corazon", func(): OS.shell_open(KOFI), "BotonKofi"))
	if not OS.has_feature("mobile") and not OS.has_feature("web"):
		v.add_child(_boton("Salir", "cerrar", func(): Juego.guardar(); get_tree().quit(), "BotonPeligro"))
	var pie = Label.new(); pie.text = "Esc: menú · Espacio: pausa · F1-F4: cámara · F12: foto"; pie.theme_type_variation = "Sub"
	pie.add_theme_font_size_override("font_size", 12 if not movil else 15); pie.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if movil: pie.text = "Toca dos veces a un Sim para elegirlo · pellizca para hacer zoom"
	v.add_child(pie)

func _boton(texto: String, icono: String, f: Callable, tipo := "") -> Button:
	var b = Button.new(); b.text = "      " + texto; b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.custom_minimum_size.y = 50 if not ui.movil else 60
	if tipo != "": b.theme_type_variation = tipo
	b.focus_mode = Control.FOCUS_NONE
	var col = Color("0b2219") if tipo == "BotonAcento" else Tema.TEXTO
	var i = Icono.crear(icono, 20 if not ui.movil else 24, col); b.add_child(i)
	b.resized.connect(func(): i.position = Vector2(16, (b.size.y - i.size.y) / 2))
	b.pressed.connect(f)
	ui._animar(b)
	return b

func mostrar() -> void:
	if visible: return
	_vel_antes = Juego.velocidad if Juego.velocidad > 0 else 1.0
	Juego.velocidad = 0.0
	_resumen()
	visible = true; _girando = true
	move_to_front()
	modulate.a = 0.0
	tarjeta.pivot_offset = Vector2(0, tarjeta.size.y / 2)
	tarjeta.scale = Vector2(0.97, 0.97)
	var tw = create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "modulate:a", 1.0, 0.3); tw.tween_property(tarjeta, "scale", Vector2.ONE, 0.35)
	_hud(0.0)
	ui._pintar_velocidad()

func ocultar() -> void:
	if not visible: return
	Juego.velocidad = _vel_antes; _girando = false
	var tw = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(self, "modulate:a", 0.0, 0.2)
	tw.tween_callback(func(): visible = false)
	ui._pintar_velocidad()
	_hud(1.0)

## Dia/hora/Sims siempre al dia (el reloj puede avanzar justo al abrir el menu).
func _resumen() -> void:
	var r: Label = tarjeta.find_child("Resumen", true, false)
	if r: r.text = "Día %d · %02d:00 · %d Sims · %s" % [Juego.dia, Juego.hora, Juego.agentes.size(), Juego.nivel_ciudad()]

## El HUD se oculta mientras el menu esta abierto (vista limpia del pueblo).
## Se ocultan de verdad (no solo transparencia) y tambien los paneles que se
## abran o se reconstruyan con el menu abierto; al cerrar vuelven los que habia.
var _ocultos: Array = []
func _hud(a: float) -> void:
	if a == 0.0:
		for c in ui.get_children():
			if c == self or not (c is Control) or not c.visible or c.has_meta("sobre_menu"): continue
			c.visible = false
			if not c in _ocultos: _ocultos.append(c)
		return
	for c in _ocultos:
		if not is_instance_valid(c): continue
		c.visible = true; c.modulate.a = 0.0
		var tw = c.create_tween(); tw.tween_property(c, "modulate:a", 1.0, 0.25)
	_ocultos.clear()

func _process(d: float) -> void:
	if visible and _girando:
		_hud(0.0); _resumen()
	# Plano de presentacion: la camara orbita despacio mientras el menu esta abierto.
	if _girando and ui.principal and ui.principal.camara_rig:
		ui.principal.camara_rig.yaw += d * 0.05
		ui.principal.camara_rig._aplicar()
