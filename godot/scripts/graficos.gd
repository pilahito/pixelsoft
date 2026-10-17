extends RefCounted
## Ajustes graficos avanzados (estilo CoD). Se guardan por dispositivo en
## user://graficos.cfg y se aplican en caliente sin reiniciar.

## Escalado del 3D (DLSS no existe en Godot; FSR 2.2 es la alternativa abierta).
const ESCALADOS = ["Desactivado (100 %)", "FSR 2.2 · Calidad", "FSR 2.2 · Equilibrado", "FSR 2.2 · Rendimiento", "FSR 1 · Calidad", "Bilineal (escala manual)"]
const ESCALA_DE = {"FSR 2.2 · Calidad": 0.67, "FSR 2.2 · Equilibrado": 0.59, "FSR 2.2 · Rendimiento": 0.5, "FSR 1 · Calidad": 0.77}

const OPCIONES = [
	# [clave, nombre, tipo, valores/rango, solo_pc]
	["sombras", "Calidad de sombras", "lista", ["no", "baja", "media", "alta", "ultra"], false],
	["dist_sombras", "Distancia de sombras", "rango", [20, 200, 10], false],
	["sombras_suaves", "Sombras suaves", "bool", null, false],
	["gi", "Iluminación global (SDFGI)", "bool", null, true],
	["ssao", "Oclusión ambiental (SSAO)", "bool", null, true],
	["ssr", "Reflejos (SSR)", "bool", null, true],
	["ssil", "Luz indirecta (SSIL)", "bool", null, true],
	["niebla", "Niebla volumétrica", "bool", null, true],
	["bloom", "Bloom / resplandor", "bool", null, false],
	["aa", "Antialiasing", "lista", ["no", "fxaa", "smaa", "msaa2", "msaa4", "taa"], false],
	["escalado", "Escalado", "lista", ESCALADOS, false, "DLSS no está disponible en el motor; FSR 2 hace lo mismo y funciona en NVIDIA, AMD e Intel. La interfaz y los textos se dibujan siempre a resolución completa."],
	["nitidez", "Nitidez del escalado", "rango", [0.0, 1.0, 0.05], false],
	["escala", "Escala de render % (solo «Bilineal»)", "rango", [50, 100, 5], false],
	["texturas", "Calidad de texturas", "lista", ["baja", "media", "alta"], false],
	["lod", "Distancia de detalle (LOD)", "rango", [0.5, 4.0, 0.25], false],
	["hierba", "Densidad de hierba", "rango", [0, 100, 10], false],
	["vista", "Distancia de visión", "rango", [60, 400, 20], false],
	["fps", "Límite de FPS", "lista", ["30", "60", "90", "120", "sin límite"], false],
	["vsync", "VSync", "bool", null, false],
	["desenfoque", "Desenfoque de movimiento", "bool", null, true],
	["dof", "Profundidad de campo", "bool", null, false],
	["brillo", "Brillo", "rango", [0.6, 1.4, 0.05], false],
	["gamma", "Gamma / contraste", "rango", [0.7, 1.3, 0.05], false],
	["color", "Gradación de color", "lista", ["neutra", "cartoon", "cálida", "cine"], false],
	["cielo", "Cielo dinámico, nubes y luz de cine (AgX)", "bool", null, true],
	["contador", "Contador de FPS", "bool", null, false],
]

const PRESETS = {
	"bajo": {"sombras": "no", "dist_sombras": 30, "sombras_suaves": false, "gi": false, "ssao": false, "ssr": false, "ssil": false, "niebla": false, "bloom": false, "aa": "fxaa", "escala": 85, "texturas": "baja", "lod": 0.75, "hierba": 0, "vista": 100, "fps": "30", "vsync": true, "desenfoque": false, "dof": false, "brillo": 1.0, "gamma": 1.0, "color": "neutra", "cielo": false, "escalado": "Bilineal (escala manual)", "nitidez": 0.8},
	"medio": {"sombras": "media", "dist_sombras": 60, "sombras_suaves": false, "gi": false, "ssao": false, "ssr": false, "ssil": false, "niebla": false, "bloom": false, "aa": "fxaa", "escala": 100, "texturas": "media", "lod": 1.0, "hierba": 0, "vista": 160, "fps": "60", "vsync": true, "desenfoque": false, "dof": false, "brillo": 1.0, "gamma": 1.0, "color": "neutra", "cielo": false, "escalado": "Desactivado (100 %)", "nitidez": 0.8},
	"alto": {"sombras": "alta", "dist_sombras": 100, "sombras_suaves": true, "gi": false, "ssao": true, "ssr": false, "ssil": false, "niebla": false, "bloom": true, "aa": "msaa4", "escala": 100, "texturas": "alta", "lod": 2.0, "hierba": 40, "vista": 260, "fps": "60", "vsync": true, "desenfoque": false, "dof": false, "brillo": 1.0, "gamma": 1.0, "color": "neutra", "cielo": true, "escalado": "Desactivado (100 %)", "nitidez": 0.8},
	"ultra": {"sombras": "ultra", "dist_sombras": 160, "sombras_suaves": true, "gi": true, "ssao": true, "ssr": true, "ssil": true, "niebla": true, "bloom": true, "aa": "msaa4", "escala": 100, "texturas": "alta", "lod": 4.0, "hierba": 100, "vista": 400, "fps": "sin límite", "vsync": true, "desenfoque": false, "dof": false, "brillo": 1.0, "gamma": 1.05, "color": "cine", "cielo": true, "escalado": "Desactivado (100 %)", "nitidez": 0.8},
	# Movil 'Medio' = estilo Clash of Clans
	"medio_movil": {"sombras": "no", "dist_sombras": 40, "sombras_suaves": false, "gi": false, "ssao": false, "ssr": false, "ssil": false, "niebla": false, "bloom": false, "aa": "msaa2", "escala": 100, "texturas": "media", "lod": 1.0, "hierba": 0, "vista": 140, "fps": "60", "vsync": true, "desenfoque": false, "dof": false, "brillo": 1.05, "gamma": 1.08, "color": "cartoon", "cielo": false, "escalado": "Desactivado (100 %)", "nitidez": 0.8},
}

const RUTA = "user://graficos.cfg"
var v: Dictionary = {}
var preset = "medio"

func cargar(por_defecto: String) -> void:
	var c = ConfigFile.new()
	if c.load(RUTA) == OK:
		preset = c.get_value("g", "preset", por_defecto)
		v = PRESETS.get(_clave_preset(preset), PRESETS.medio).duplicate()
		for k in c.get_section_keys("g"): if k != "preset": v[k] = c.get_value("g", k)
	else: poner_preset(por_defecto)
	if not v.has("contador"): v.contador = false
	if v.get("aa", "") == "fsr2": v.aa = "no"; v.escalado = "FSR 2.2 · Calidad"   # ajuste antiguo

func poner_preset(p: String) -> void:
	preset = p
	if p != "personalizado":
		var cont = v.get("contador", false)
		v = PRESETS[_clave_preset(p)].duplicate(); v.contador = cont
	guardar()

func _clave_preset(p: String) -> String:
	return "medio_movil" if p == "medio" and OS.has_feature("mobile") else p

func cambiar(k: String, valor) -> void:
	v[k] = valor; preset = "personalizado"; guardar()

func guardar() -> void:
	var c = ConfigFile.new()
	c.set_value("g", "preset", preset)
	for k in v: c.set_value("g", k, v[k])
	c.save(RUTA)
