extends Node3D
## Camara estilo Sims: orbitar (clic derecho / dos dedos girando), zoom
## (rueda / pellizco), desplazar (clic izquierdo arrastrando / un dedo).

var distancia = 30.0
var yaw = -0.6
var pitch = -0.85
var objetivo = Vector3(20, 0, 12)
var _toques = {}
var _dist_pellizco = 0.0
var _ang_toque = 0.0
@onready var cam: Camera3D = $Camera3D

func _ready() -> void:
	_aplicar()

func _aplicar() -> void:
	distancia = clampf(distancia, 6, 60)
	pitch = clampf(pitch, -1.45, -0.3)
	objetivo.x = clampf(objetivo.x, 0, 40); objetivo.z = clampf(objetivo.z, 0, 24)
	position = objetivo
	rotation = Vector3(pitch, yaw, 0)
	cam.position = Vector3(0, 0, distancia)

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP: distancia *= 0.9
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN: distancia *= 1.1
	elif ev is InputEventMouseMotion:
		if ev.button_mask & MOUSE_BUTTON_MASK_RIGHT:
			yaw -= ev.relative.x * 0.006; pitch -= ev.relative.y * 0.004
		elif ev.button_mask & MOUSE_BUTTON_MASK_LEFT or ev.button_mask & MOUSE_BUTTON_MASK_MIDDLE:
			_desplazar(ev.relative)
	elif ev is InputEventScreenTouch:
		if ev.pressed: _toques[ev.index] = ev.position
		else: _toques.erase(ev.index)
		if _toques.size() == 2:
			var p: Array = _toques.values()
			_dist_pellizco = p[0].distance_to(p[1]); _ang_toque = (p[1] - p[0]).angle()
	elif ev is InputEventScreenDrag:
		var antes: Vector2 = _toques.get(ev.index, ev.position)
		_toques[ev.index] = ev.position
		if _toques.size() == 1:
			_desplazar(ev.position - antes)
		elif _toques.size() == 2:
			var p: Array = _toques.values()
			var d: float = p[0].distance_to(p[1])
			var a: float = (p[1] - p[0]).angle()
			if _dist_pellizco > 0: distancia *= _dist_pellizco / d
			yaw -= wrapf(a - _ang_toque, -PI, PI)
			_dist_pellizco = d; _ang_toque = a
	_aplicar()

func _desplazar(rel: Vector2) -> void:
	var k = distancia * 0.0025
	var derecha = Vector3(cos(yaw), 0, -sin(yaw))
	var delante = Vector3(sin(yaw), 0, cos(yaw))
	objetivo -= derecha * rel.x * k + delante * rel.y * k
