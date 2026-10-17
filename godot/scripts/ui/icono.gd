extends Control
## Iconos vectoriales dibujados con _draw(): nitidos a cualquier escala/DPI,
## sin texturas ni emojis (que en Android/Windows salen distintos).

var tipo := "estrella"
var color := Color.WHITE
var texto := ""          # para el avatar (inicial)
var anillo := Color(0, 0, 0, 0)

static func crear(t: String, tam := 22.0, c := Color.WHITE) -> Control:
	var i = load("res://scripts/ui/icono.gd").new()
	i.tipo = t; i.color = c
	i.custom_minimum_size = Vector2(tam, tam)
	i.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return i

func poner(t: String, c = null) -> void:
	tipo = t
	if c != null: color = c
	queue_redraw()

func _P(v: Vector2) -> Vector2:
	var s = minf(size.x, size.y) * 0.5
	return size * 0.5 + v * s

func _R(r: float) -> float:
	return r * minf(size.x, size.y) * 0.5

func _poly(pts: Array, c := color) -> void:
	var pp = PackedVector2Array()
	for p in pts: pp.append(_P(p))
	draw_colored_polygon(pp, c)
	# borde suavizado: polilinea antialias encima del contorno
	pp.append(pp[0]); draw_polyline(pp, c, 1.0, true)

func _linea(a: Vector2, b: Vector2, g := 0.14, c := color) -> void:
	draw_line(_P(a), _P(b), c, _R(g), true)
	draw_circle(_P(a), _R(g) * 0.5, c, true, -1.0, true); draw_circle(_P(b), _R(g) * 0.5, c, true, -1.0, true)

func _arco(cen: Vector2, r: float, a0: float, a1: float, g := 0.14, c := color) -> void:
	draw_arc(_P(cen), _R(r), a0, a1, 32, c, _R(g), true)

func _circ(cen: Vector2, r: float, c := color) -> void:
	draw_circle(_P(cen), _R(r), c, true, -1.0, true)

func _draw() -> void:
	if size.x < 2.0 or size.y < 2.0: return
	var c = color
	match tipo:
		"hambre":  # tenedor y cuchillo
			_linea(Vector2(-0.35, -0.75), Vector2(-0.35, 0.75)); _linea(Vector2(-0.6, -0.75), Vector2(-0.6, -0.2)); _linea(Vector2(-0.1, -0.75), Vector2(-0.1, -0.2))
			_arco(Vector2(-0.35, -0.25), 0.25, 0, PI)
			_poly([Vector2(0.35, -0.8), Vector2(0.62, -0.5), Vector2(0.62, 0.05), Vector2(0.45, 0.05)]); _linea(Vector2(0.5, 0.0), Vector2(0.5, 0.75))
		"sueno": _luna(Vector2(0.05, 0), 0.8)
		"diversion", "estrella":
			var pts = []
			for i in 10:
				var r = 0.85 if i % 2 == 0 else 0.38
				var a = -PI / 2 + i * PI / 5
				pts.append(Vector2(cos(a), sin(a)) * r)
			_poly(pts)
		"higiene": _gota()
		"social":  # bocadillo
			draw_rect(Rect2(_P(Vector2(-0.8, -0.65)), Vector2(_R(1.6), _R(1.05))), c, true)
			_poly([Vector2(-0.35, 0.35), Vector2(-0.05, 0.35), Vector2(-0.45, 0.8)])
			for x in [-0.4, 0.0, 0.4]: _circ(Vector2(x, -0.12), 0.11, Color(0, 0, 0, 0.45))
		"dinero":
			_circ(Vector2.ZERO, 0.82); _circ(Vector2.ZERO, 0.62, c.darkened(0.25)); _circ(Vector2.ZERO, 0.5, c)
			draw_string(get_theme_default_font(), _P(Vector2(-0.3, 0.32)), "€", HORIZONTAL_ALIGNMENT_LEFT, -1, int(_R(1.0)), c.darkened(0.55))
		"sol", "calor", "despejado":
			_circ(Vector2.ZERO, 0.4)
			for i in 8:
				var a = i * TAU / 8
				_linea(Vector2(cos(a), sin(a)) * 0.6, Vector2(cos(a), sin(a)) * 0.85, 0.13)
		"luna": _luna(Vector2.ZERO, 0.75)
		"nublado", "nube": _nube(Vector2(0, 0.1), c)
		"lluvia":
			_nube(Vector2(0, -0.2), c)
			for x in [-0.4, 0.0, 0.4]: _linea(Vector2(x, 0.35), Vector2(x - 0.12, 0.75), 0.12, Color(0.55, 0.8, 1))
		"tormenta":
			_nube(Vector2(0, -0.25), c.darkened(0.15))
			_poly([Vector2(0.05, 0.2), Vector2(-0.25, 0.6), Vector2(0.0, 0.6), Vector2(-0.15, 0.95), Vector2(0.3, 0.45), Vector2(0.05, 0.45), Vector2(0.2, 0.2)], Color(1, 0.85, 0.3))
		"nieve", "granizo":
			for i in 3:
				var a = i * PI / 3
				_linea(Vector2(cos(a), sin(a)) * 0.8, -Vector2(cos(a), sin(a)) * 0.8, 0.12)
			_circ(Vector2.ZERO, 0.16)
		"niebla":
			for y in [-0.45, 0.0, 0.45]: _linea(Vector2(-0.75 + absf(y) * 0.3, y), Vector2(0.75 - absf(y) * 0.2, y), 0.16)
		"pausa":
			draw_rect(Rect2(_P(Vector2(-0.5, -0.6)), Vector2(_R(0.35), _R(1.2))), c); draw_rect(Rect2(_P(Vector2(0.15, -0.6)), Vector2(_R(0.35), _R(1.2))), c)
		"play": _poly([Vector2(-0.4, -0.65), Vector2(0.6, 0), Vector2(-0.4, 0.65)])
		"play2":
			_poly([Vector2(-0.8, -0.6), Vector2(0.05, 0), Vector2(-0.8, 0.6)]); _poly([Vector2(-0.05, -0.6), Vector2(0.8, 0), Vector2(-0.05, 0.6)])
		"play3":
			for x in [-0.9, -0.35, 0.2]: _poly([Vector2(x, -0.5), Vector2(x + 0.6, 0), Vector2(x, 0.5)])
		"camara":
			draw_rect(Rect2(_P(Vector2(-0.8, -0.45)), Vector2(_R(1.6), _R(1.1))), c); _poly([Vector2(-0.3, -0.45), Vector2(-0.15, -0.7), Vector2(0.25, -0.7), Vector2(0.4, -0.45)])
			_circ(Vector2(0, 0.1), 0.33, Color(0, 0, 0, 0.5)); _circ(Vector2(0, 0.1), 0.2)
		"techo", "casa":
			_poly([Vector2(0, -0.85), Vector2(0.85, -0.05), Vector2(-0.85, -0.05)])
			draw_rect(Rect2(_P(Vector2(-0.55, -0.1)), Vector2(_R(1.1), _R(0.85))), c)
			draw_rect(Rect2(_P(Vector2(-0.14, 0.3)), Vector2(_R(0.28), _R(0.45))), Color(0, 0, 0, 0.45))
		"menu":
			for y in [-0.5, 0.0, 0.5]: _linea(Vector2(-0.7, y), Vector2(0.7, y), 0.16)
		"comprar":  # bolsa
			_poly([Vector2(-0.7, -0.3), Vector2(0.7, -0.3), Vector2(0.6, 0.85), Vector2(-0.6, 0.85)])
			_arco(Vector2(0, -0.3), 0.32, PI, TAU, 0.13)
		"pueblo":
			draw_rect(Rect2(_P(Vector2(-0.85, -0.2)), Vector2(_R(0.6), _R(1.05))), c)
			draw_rect(Rect2(_P(Vector2(-0.15, -0.8)), Vector2(_R(0.55), _R(1.65))), c)
			draw_rect(Rect2(_P(Vector2(0.5, -0.4)), Vector2(_R(0.4), _R(1.25))), c)
			for y in [-0.6, -0.3, 0.0, 0.3]: draw_rect(Rect2(_P(Vector2(-0.02, y)), Vector2(_R(0.12), _R(0.12))), Color(0, 0, 0, 0.4))
		"trabajo":  # maletin
			draw_rect(Rect2(_P(Vector2(-0.85, -0.4)), Vector2(_R(1.7), _R(1.15))), c)
			_arco(Vector2(0, -0.4), 0.28, PI, TAU, 0.13); _linea(Vector2(-0.85, 0.05), Vector2(0.85, 0.05), 0.08, Color(0, 0, 0, 0.35))
		"pixelgram", "corazon":
			_circ(Vector2(-0.33, -0.2), 0.4); _circ(Vector2(0.33, -0.2), 0.4); _poly([Vector2(-0.72, -0.08), Vector2(0.72, -0.08), Vector2(0, 0.8)])
		"diario":  # libro
			_poly([Vector2(-0.85, -0.6), Vector2(-0.05, -0.45), Vector2(-0.05, 0.75), Vector2(-0.85, 0.6)])
			_poly([Vector2(0.85, -0.6), Vector2(0.05, -0.45), Vector2(0.05, 0.75), Vector2(0.85, 0.6)])
		"ia":  # chip
			draw_rect(Rect2(_P(Vector2(-0.55, -0.55)), Vector2(_R(1.1), _R(1.1))), c)
			for i in 3:
				var o = -0.35 + i * 0.35
				_linea(Vector2(o, -0.85), Vector2(o, -0.55), 0.1); _linea(Vector2(o, 0.55), Vector2(o, 0.85), 0.1)
				_linea(Vector2(-0.85, o), Vector2(-0.55, o), 0.1); _linea(Vector2(0.55, o), Vector2(0.85, o), 0.1)
			draw_rect(Rect2(_P(Vector2(-0.25, -0.25)), Vector2(_R(0.5), _R(0.5))), Color(0, 0, 0, 0.4))
		"dlc":  # regalo
			draw_rect(Rect2(_P(Vector2(-0.75, -0.2)), Vector2(_R(1.5), _R(1.0))), c)
			draw_rect(Rect2(_P(Vector2(-0.85, -0.45)), Vector2(_R(1.7), _R(0.3))), c.lightened(0.15))
			draw_rect(Rect2(_P(Vector2(-0.1, -0.45)), Vector2(_R(0.2), _R(1.25))), Color(0, 0, 0, 0.35))
			_arco(Vector2(-0.25, -0.6), 0.2, 0, TAU, 0.1); _arco(Vector2(0.25, -0.6), 0.2, 0, TAU, 0.1)
		"ajustes":  # engranaje
			var pts = []
			for i in 32:
				var a = i * TAU / 32.0
				var r = 0.85 if (i / 2) % 2 == 0 else 0.62
				pts.append(Vector2(cos(a), sin(a)) * r)
			_poly(pts); _circ(Vector2.ZERO, 0.3, Color(0, 0, 0, 0.5))
		"cerrar":
			_linea(Vector2(-0.55, -0.55), Vector2(0.55, 0.55), 0.17); _linea(Vector2(0.55, -0.55), Vector2(-0.55, 0.55), 0.17)
		"mas": _linea(Vector2(-0.6, 0), Vector2(0.6, 0), 0.17); _linea(Vector2(0, -0.6), Vector2(0, 0.6), 0.17)
		"flecha_abajo": _poly([Vector2(-0.6, -0.25), Vector2(0.6, -0.25), Vector2(0, 0.45)])
		"flecha_arriba": _poly([Vector2(-0.6, 0.25), Vector2(0.6, 0.25), Vector2(0, -0.45)])
		"gema":  # plumbob
			_poly([Vector2(0, -0.95), Vector2(0.45, 0), Vector2(0, 0.95), Vector2(-0.45, 0)])
			_poly([Vector2(0, -0.95), Vector2(0.45, 0), Vector2(0, 0)], c.lightened(0.35))
		"avatar":
			if anillo.a > 0: _circ(Vector2.ZERO, 1.0, anillo)
			_circ(Vector2.ZERO, 0.84 if anillo.a > 0 else 1.0, c)
			var f = get_theme_default_font(); var fs = int(_R(0.95))
			var w = f.get_string_size(texto, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
			draw_string(f, size * 0.5 + Vector2(-w.x / 2, fs * 0.36), texto, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1) if c.get_luminance() < 0.6 else Color(0.1, 0.12, 0.18))
		_: _circ(Vector2.ZERO, 0.5)

func _luna(cen: Vector2, r: float) -> void:
	# media luna = circulo menos circulo desplazado (recorte geometrico)
	var A = PackedVector2Array(); var B = PackedVector2Array()
	for i in 32:
		var a = i * TAU / 32.0
		A.append(_P(cen + Vector2(cos(a), sin(a)) * r))
		B.append(_P(cen + Vector2(0.42, -0.2) * r + Vector2(cos(a), sin(a)) * r * 0.8))
	for poly in Geometry2D.clip_polygons(A, B):
		if Geometry2D.is_polygon_clockwise(poly): continue
		draw_colored_polygon(poly, color)
		var pl = poly.duplicate(); pl.append(poly[0]); draw_polyline(pl, color, 1.0, true)

func _gota() -> void:
	var pts = [Vector2(0, -0.9)]
	for i in 17:
		var a = -PI * 0.15 + i * (PI * 1.3 / 16.0)
		pts.append(Vector2(0, 0.25) + Vector2(cos(a), sin(a)) * 0.55)
	_poly(pts)

func _nube(o: Vector2, c: Color) -> void:
	_circ(o + Vector2(-0.4, 0.1), 0.35, c); _circ(o + Vector2(0.05, -0.15), 0.45, c); _circ(o + Vector2(0.45, 0.1), 0.33, c)
	draw_rect(Rect2(_P(o + Vector2(-0.4, 0.05)), Vector2(_R(0.85), _R(0.38))), c)
