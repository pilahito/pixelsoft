extends RefCounted
## Tema visual de PixelSoft 2.2: tarjetas redondeadas con sombra suave,
## cristal esmerilado ligero (solo PC), tipografia Nunito nitida y colores
## tipo "Sims moderno" (verde gema + azul cielo sobre azul noche).

const FONDO = Color(0.075, 0.095, 0.15, 0.80)
const FONDO_MOVIL = Color(0.085, 0.105, 0.165, 0.94)
const TARJETA = Color(1, 1, 1, 0.055)
const ACENTO = Color("3ddc97")      # verde gema
const ACENTO2 = Color("4cc9f0")     # azul cielo
const TEXTO = Color("f3f6ff")
const TEXTO2 = Color("a9b6d3")
const AVISO = Color("ffd166")
const PELIGRO = Color("ff6b81")
const BORDE = Color(1, 1, 1, 0.10)

static var _cristal: Shader

static func fuente(peso := 600) -> Font:
	var f: FontFile = load("res://assets/fuentes/Nunito.ttf")
	# Nitidez: sin MSDF, hinting ligero, posicionamiento subpixel; el texto se
	# rasteriza al tamano final (stretch canvas_items), nunca se reescala.
	f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	f.hinting = TextServer.HINTING_LIGHT
	f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_AUTO
	f.multichannel_signed_distance_field = false
	f.generate_mipmaps = false
	var v = FontVariation.new(); v.base_font = f
	v.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): peso}
	return v

static func caja(color: Color, radio := 16, margen := 12.0, sombra := 0, borde := Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = color
	s.set_corner_radius_all(radio)
	s.corner_detail = 10
	s.anti_aliasing = true
	s.set_content_margin_all(margen)
	if borde.a > 0:
		s.border_color = borde; s.set_border_width_all(1)
	if sombra > 0:
		s.shadow_color = Color(0, 0, 0, 0.28); s.shadow_size = sombra; s.shadow_offset = Vector2(0, sombra * 0.35)
	return s

## Material de cristal esmerilado para paneles (desenfoca el mundo 3D detras).
static func cristal() -> ShaderMaterial:
	if _cristal == null:
		_cristal = Shader.new()
		_cristal.code = """shader_type canvas_item;
uniform sampler2D pantalla : hint_screen_texture, filter_linear_mipmap;
uniform float desenfoque = 2.5;
void fragment() {
	vec4 c = COLOR;
	float cuerpo = smoothstep(0.5, 0.66, c.a);
	vec3 b = textureLod(pantalla, SCREEN_UV, desenfoque).rgb;
	COLOR = mix(c, vec4(mix(b, c.rgb, c.a), 1.0), cuerpo);
}"""
	var m = ShaderMaterial.new(); m.shader = _cristal
	return m

static func crear(movil: bool) -> Theme:
	var t = Theme.new()
	var fs = 19 if movil else 15
	t.default_font = fuente(600)
	t.default_font_size = fs
	var negrita = fuente(800)
	var fondo = FONDO_MOVIL if movil else FONDO
	var alto_btn = 52 if movil else 38
	# Paneles
	t.set_stylebox("panel", "PanelContainer", caja(fondo, 20, 14, 14, BORDE))
	t.set_stylebox("panel", "Panel", caja(fondo, 20, 14, 14, BORDE))
	t.set_type_variation("Tarjeta", "PanelContainer")
	t.set_stylebox("panel", "Tarjeta", caja(TARJETA, 14, 12, 0, Color(1, 1, 1, 0.06)))
	t.set_type_variation("TarjetaAcento", "PanelContainer")
	t.set_stylebox("panel", "TarjetaAcento", caja(Color(ACENTO, 0.14), 14, 12, 0, Color(ACENTO, 0.45)))
	t.set_type_variation("Chip", "PanelContainer")
	t.set_stylebox("panel", "Chip", caja(Color(1, 1, 1, 0.08), 99, 8, 0))
	# Texto
	t.set_color("font_color", "Label", TEXTO)
	t.set_type_variation("Titulo", "Label"); t.set_font("font", "Titulo", negrita); t.set_font_size("font_size", "Titulo", fs + 5)
	t.set_type_variation("TituloGrande", "Label"); t.set_font("font", "TituloGrande", negrita); t.set_font_size("font_size", "TituloGrande", fs * 3)
	t.set_type_variation("Sub", "Label"); t.set_color("font_color", "Sub", TEXTO2); t.set_font_size("font_size", "Sub", fs - 2)
	t.set_type_variation("Seccion", "Label"); t.set_font("font", "Seccion", negrita); t.set_color("font_color", "Seccion", ACENTO2); t.set_font_size("font_size", "Seccion", fs - 1)
	t.set_color("default_color", "RichTextLabel", TEXTO)
	t.set_font("bold_font", "RichTextLabel", negrita)
	# Botones
	for tipo in ["Button", "OptionButton", "MenuButton"]:
		var n = caja(Color(1, 1, 1, 0.075), 12, 10, 0); n.content_margin_left = 14; n.content_margin_right = 14
		var h = n.duplicate(); h.bg_color = Color(1, 1, 1, 0.15)
		var p = n.duplicate(); p.bg_color = ACENTO.darkened(0.05)
		var d = n.duplicate(); d.bg_color = Color(1, 1, 1, 0.03)
		var f = caja(Color(0, 0, 0, 0), 12, 10, 0, ACENTO2); f.set_border_width_all(2)
		t.set_stylebox("normal", tipo, n); t.set_stylebox("hover", tipo, h); t.set_stylebox("pressed", tipo, p)
		t.set_stylebox("hover_pressed", tipo, p); t.set_stylebox("disabled", tipo, d); t.set_stylebox("focus", tipo, f)
		t.set_color("font_color", tipo, TEXTO); t.set_color("font_hover_color", tipo, Color.WHITE)
		t.set_color("font_pressed_color", tipo, Color("0d2a1f")); t.set_color("font_hover_pressed_color", tipo, Color("0d2a1f"))
		t.set_color("font_disabled_color", tipo, Color(TEXTO2, 0.45)); t.set_color("font_focus_color", tipo, Color.WHITE)
		t.set_constant("h_separation", tipo, 8)
	# Boton principal (verde) y boton fantasma (sin fondo)
	t.set_type_variation("BotonAcento", "Button")
	var an = caja(ACENTO, 12, 10, 6); an.shadow_color = Color(ACENTO, 0.25)
	var ah = an.duplicate(); ah.bg_color = ACENTO.lightened(0.12)
	var ap = an.duplicate(); ap.bg_color = ACENTO.darkened(0.12)
	t.set_stylebox("normal", "BotonAcento", an); t.set_stylebox("hover", "BotonAcento", ah); t.set_stylebox("pressed", "BotonAcento", ap)
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: t.set_color(k, "BotonAcento", Color("0b2219"))
	t.set_font("font", "BotonAcento", negrita)
	t.set_type_variation("BotonActivo", "Button")
	var bn = caja(Color(ACENTO, 0.22), 12, 10, 0, Color(ACENTO, 0.7))
	t.set_stylebox("normal", "BotonActivo", bn); t.set_stylebox("hover", "BotonActivo", bn)
	t.set_color("font_color", "BotonActivo", ACENTO.lightened(0.4)); t.set_color("font_hover_color", "BotonActivo", Color.WHITE)
	t.set_type_variation("BotonIcono", "Button")
	var ic = caja(Color(0, 0, 0, 0), 14, 6, 0); var ich = caja(Color(1, 1, 1, 0.12), 14, 6, 0); var icp = caja(Color(ACENTO, 0.28), 14, 6, 0, Color(ACENTO, 0.8))
	t.set_stylebox("normal", "BotonIcono", ic); t.set_stylebox("hover", "BotonIcono", ich); t.set_stylebox("pressed", "BotonIcono", icp); t.set_stylebox("hover_pressed", "BotonIcono", icp)
	t.set_stylebox("focus", "BotonIcono", StyleBoxEmpty.new())
	t.set_type_variation("BotonPeligro", "Button")
	var pn = caja(Color(PELIGRO, 0.18), 12, 10, 0, Color(PELIGRO, 0.5)); t.set_stylebox("normal", "BotonPeligro", pn)
	t.set_color("font_color", "BotonPeligro", PELIGRO.lightened(0.3))
	# Campos
	var le = caja(Color(0, 0, 0, 0.28), 12, 10, 0, Color(1, 1, 1, 0.08))
	var lf = le.duplicate(); lf.border_color = ACENTO2; lf.set_border_width_all(2)
	t.set_stylebox("normal", "LineEdit", le); t.set_stylebox("focus", "LineEdit", lf); t.set_stylebox("read_only", "LineEdit", le)
	t.set_color("font_color", "LineEdit", TEXTO); t.set_color("font_placeholder_color", "LineEdit", Color(TEXTO2, 0.6)); t.set_color("caret_color", "LineEdit", ACENTO)
	t.set_constant("minimum_character_width", "LineEdit", 8)
	# Barras
	var pb = caja(Color(0, 0, 0, 0.32), 99, 0, 0); var pf = caja(ACENTO, 99, 0, 0)
	t.set_stylebox("background", "ProgressBar", pb); t.set_stylebox("fill", "ProgressBar", pf)
	t.set_color("font_color", "ProgressBar", TEXTO)
	# Deslizadores con tirador redondo dibujado (nitido)
	var sl = caja(Color(0, 0, 0, 0.35), 99, 0, 0); sl.content_margin_top = 3; sl.content_margin_bottom = 3
	var sa = caja(ACENTO, 99, 0, 0); sa.content_margin_top = 3; sa.content_margin_bottom = 3
	t.set_stylebox("slider", "HSlider", sl); t.set_stylebox("grabber_area", "HSlider", sa); t.set_stylebox("grabber_area_highlight", "HSlider", sa)
	var g = _circulo(22 if movil else 18, Color.WHITE, ACENTO)
	t.set_icon("grabber", "HSlider", g); t.set_icon("grabber_highlight", "HSlider", _circulo(22 if movil else 18, Color.WHITE, ACENTO2))
	# Interruptores
	t.set_icon("checked", "CheckButton", _interruptor(true, movil)); t.set_icon("unchecked", "CheckButton", _interruptor(false, movil))
	t.set_icon("checked_disabled", "CheckButton", _interruptor(true, movil)); t.set_icon("unchecked_disabled", "CheckButton", _interruptor(false, movil))
	t.set_color("font_color", "CheckButton", TEXTO); t.set_color("font_hover_color", "CheckButton", Color.WHITE); t.set_color("font_pressed_color", "CheckButton", TEXTO)
	t.set_stylebox("normal", "CheckButton", StyleBoxEmpty.new()); t.set_stylebox("pressed", "CheckButton", StyleBoxEmpty.new())
	t.set_stylebox("hover", "CheckButton", caja(Color(1, 1, 1, 0.05), 10, 4, 0)); t.set_stylebox("hover_pressed", "CheckButton", caja(Color(1, 1, 1, 0.05), 10, 4, 0))
	t.set_stylebox("focus", "CheckButton", StyleBoxEmpty.new())
	# Scroll fino
	for sb in ["VScrollBar", "HScrollBar"]:
		t.set_stylebox("scroll", sb, caja(Color(0, 0, 0, 0), 99, 0, 0))
		var gr = caja(Color(1, 1, 1, 0.18), 99, 0, 0); gr.content_margin_left = 3; gr.content_margin_right = 3; gr.content_margin_top = 3; gr.content_margin_bottom = 3
		t.set_stylebox("grabber", sb, gr)
		var grh = gr.duplicate(); grh.bg_color = Color(1, 1, 1, 0.32)
		t.set_stylebox("grabber_highlight", sb, grh); t.set_stylebox("grabber_pressed", sb, grh)
	# Popups, tooltips y dialogos
	var pp = caja(Color(0.09, 0.11, 0.17, 0.98), 14, 8, 10, BORDE)
	t.set_stylebox("panel", "PopupMenu", pp); t.set_stylebox("hover", "PopupMenu", caja(Color(ACENTO, 0.22), 8, 6, 0))
	t.set_color("font_color", "PopupMenu", TEXTO); t.set_color("font_hover_color", "PopupMenu", Color.WHITE)
	t.set_constant("v_separation", "PopupMenu", 12 if movil else 8)
	t.set_stylebox("panel", "TooltipPanel", caja(Color(0.06, 0.07, 0.11, 0.97), 10, 8, 6, BORDE))
	t.set_color("font_color", "TooltipLabel", TEXTO)
	t.set_stylebox("panel", "AcceptDialog", caja(Color(0.09, 0.11, 0.17, 1), 0, 16, 0))
	var wb = caja(Color(0.09, 0.11, 0.17, 1), 18, 0, 18, BORDE); wb.expand_margin_top = 34; wb.expand_margin_left = 2; wb.expand_margin_right = 2; wb.expand_margin_bottom = 2
	t.set_stylebox("embedded_border", "Window", wb); t.set_stylebox("embedded_unfocused_border", "Window", wb)
	t.set_color("title_color", "Window", TEXTO); t.set_font("title_font", "Window", negrita)
	t.set_constant("separation", "VBoxContainer", 8 if movil else 6)
	t.set_constant("separation", "HBoxContainer", 8)
	t.set_constant("h_separation", "HFlowContainer", 6); t.set_constant("v_separation", "HFlowContainer", 6)
	t.set_constant("h_separation", "GridContainer", 10); t.set_constant("v_separation", "GridContainer", 8 if movil else 6)
	t.set_meta("alto_btn", alto_btn)
	return t

static func _circulo(d: int, relleno: Color, borde: Color) -> ImageTexture:
	var im = Image.create(d * 2, d * 2, false, Image.FORMAT_RGBA8)
	var r = d - 1.0
	for y in d * 2:
		for x in d * 2:
			var dist = Vector2(x + 0.5 - d, y + 0.5 - d).length()
			var a = clampf(r - dist + 0.5, 0, 1)
			var c = relleno if dist < r - 3.0 else borde
			c = c.lerp(relleno, clampf(r - 3.0 - dist + 0.5, 0, 1)) if dist < r - 2.0 else borde
			im.set_pixel(x, y, Color(c, a))
	# se crea al doble y se reduce: borde suave
	im.resize(d, d, Image.INTERPOLATE_LANCZOS)
	return ImageTexture.create_from_image(im)

static func _interruptor(on: bool, movil: bool) -> ImageTexture:
	var w = 48 if movil else 40; var h = 28 if movil else 22
	var k = 2
	var im = Image.create(w * k, h * k, false, Image.FORMAT_RGBA8)
	var pista = ACENTO if on else Color(1, 1, 1, 0.22)
	var R = h * k / 2.0
	var cx = (w * k - R) if on else R
	for y in h * k:
		for x in w * k:
			var px = Vector2(x + 0.5, y + 0.5)
			var cc = Vector2(clampf(px.x, R, w * k - R), R)
			var dp = px.distance_to(cc)
			var a = clampf(R - dp + 0.5, 0, 1)
			var col = Color(pista, pista.a * a)
			var db = px.distance_to(Vector2(cx, R))
			var ab = clampf(R - 3.0 * k - db + 0.5, 0, 1)
			col = col.blend(Color(1, 1, 1, ab))
			im.set_pixel(x, y, col)
	im.resize(w, h, Image.INTERPOLATE_LANCZOS)
	return ImageTexture.create_from_image(im)
