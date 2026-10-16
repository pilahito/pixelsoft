extends Node
## Simulacion de PixelSoft (port a GDScript de public/js/motor/*.js).
## Necesidades tipo Sims, empresa, pueblo que construyen las IAs, guardado.

signal cambiado
signal suceso(texto: String)

const VERSION = "2.1.0"
const RUTA_PARTIDA = "user://partida.json"
const NECESIDADES = ["hambre", "sueno", "diversion", "higiene", "social"]
const ANCHO = 40
const ALTO = 24
const CALLE_Y = 12

var RASGOS := {
	"glotón": {"hambre": 1.5}, "dormilón": {"sueno": 1.4}, "fiestero": {"diversion": 1.5, "social": 1.3},
	"pulcro": {"higiene": 1.5}, "solitario": {"social": 0.5}, "currante": {"trabajo": 1.25, "diversion": 1.2},
	"creativo": {"trabajo": 1.1}, "deportista": {"gimnasio": 1.5},
}
var ACTIVIDADES := {
	"cocinar": {"lugar": "casa", "alivia": {"hambre": 35}, "consume": "comida"},
	"cafeteria": {"lugar": "cafeteria", "alivia": {"hambre": 30, "social": 15}, "coste": 9},
	"comprar": {"lugar": "super", "alivia": {}},
	"dormir": {"lugar": "casa", "alivia": {"sueno": 22}},
	"ducharse": {"lugar": "casa", "alivia": {"higiene": 60}},
	"parque": {"lugar": "parque", "alivia": {"diversion": 25, "social": 10}},
	"gimnasio": {"lugar": "gimnasio", "alivia": {"diversion": 15, "sueno": -5, "higiene": -15}, "coste": 4, "habilidad": "forma"},
	"charlar": {"lugar": "cafeteria", "alivia": {"social": 35, "diversion": 10}, "coste": 3},
	"videojuegos": {"lugar": "casa", "alivia": {"diversion": 30}},
	"picoteo": {"lugar": "oficina", "alivia": {"hambre": 18}},
	"akia": {"lugar": "akia", "alivia": {"diversion": 20, "social": 10, "hambre": 15}, "coste": 5},
	"tiendas": {"lugar": "tienda", "alivia": {"diversion": 18, "social": 12}, "coste": 2},
	"montar": {"lugar": "casa", "alivia": {"diversion": 10}},
	"huerto": {"lugar": "casa", "alivia": {"diversion": 18}},
	"estudiar": {"lugar": "parque", "alivia": {"diversion": -2, "social": 8}},
	"pasear_perro": {"lugar": "parque", "alivia": {"diversion": 20, "social": 15, "higiene": -5}},
}
var TIENDA: Array = [
	{"id": "comida", "nombre": "Comida (3 raciones)", "precio": 15, "tipo": "consumible", "cantidad": 3, "cat": "Comida"},
	{"id": "cama", "nombre": "Cama buena", "precio": 180, "tipo": "mueble", "bono": {"sueno": 1.4}, "cat": "Dormitorio"},
	{"id": "consola", "nombre": "Consola", "precio": 250, "tipo": "mueble", "bono": {"diversion": 1.4}, "cat": "Ocio"},
	{"id": "ducha", "nombre": "Ducha de lluvia", "precio": 140, "tipo": "mueble", "bono": {"higiene": 1.3}, "cat": "Baño"},
	{"id": "cocina", "nombre": "Cocina moderna", "precio": 300, "tipo": "mueble", "bono": {"hambre": 1.3}, "cat": "Cocina"},
	{"id": "planta", "nombre": "Planta", "precio": 25, "tipo": "mueble", "bono": {"diversion": 1.05}, "cat": "Decoración"},
	{"id": "ropa", "nombre": "Ropa nueva", "precio": 60, "tipo": "ropa", "moral": 8, "cat": "Ropa"},
	# AKIA: muebles para montar (nombres pseudo-suecos, modelo de Kenney Furniture Kit)
	{"id": "soffa", "nombre": "SÖFFA sofá", "precio": 199, "tipo": "akia", "modelo": "loungeSofa", "bono": {"diversion": 1.15}, "cat": "Salón", "tienda": "akia"},
	{"id": "lunga", "nombre": "LÜNGA sofá largo", "precio": 349, "tipo": "akia", "modelo": "loungeSofaLong", "bono": {"diversion": 1.2, "social": 1.1}, "cat": "Salón", "tienda": "akia"},
	{"id": "kaffebord", "nombre": "KAFFEBÖRD mesita", "precio": 39, "tipo": "akia", "modelo": "tableCoffee", "cat": "Salón", "tienda": "akia"},
	{"id": "tvbank", "nombre": "TEVEBÄNK mueble TV", "precio": 89, "tipo": "akia", "modelo": "cabinetTelevision", "cat": "Salón", "tienda": "akia"},
	{"id": "sovsang", "nombre": "SÖVSÄNG cama doble", "precio": 299, "tipo": "akia", "modelo": "bedDouble", "bono": {"sueno": 1.35}, "cat": "Dormitorio", "tienda": "akia"},
	{"id": "smalsang", "nombre": "SMÅLSÄNG cama", "precio": 129, "tipo": "akia", "modelo": "bedSingle", "bono": {"sueno": 1.2}, "cat": "Dormitorio", "tienda": "akia"},
	{"id": "bokhylla", "nombre": "BÖKHYLLÄ estantería", "precio": 59, "tipo": "akia", "modelo": "bookcaseOpen", "bono": {"diversion": 1.05}, "cat": "Dormitorio", "tienda": "akia"},
	{"id": "kokbanken", "nombre": "KÖKBÄNKEN cocina", "precio": 399, "tipo": "akia", "modelo": "kitchenStove", "bono": {"hambre": 1.3}, "cat": "Cocina", "tienda": "akia"},
	{"id": "kylskap", "nombre": "KYLSKÅPP nevera", "precio": 249, "tipo": "akia", "modelo": "kitchenFridge", "bono": {"hambre": 1.1}, "cat": "Cocina", "tienda": "akia"},
	{"id": "stolen", "nombre": "STÖLEN silla", "precio": 25, "tipo": "akia", "modelo": "chairCushion", "cat": "Cocina", "tienda": "akia"},
	{"id": "bordet", "nombre": "BÖRDET mesa", "precio": 79, "tipo": "akia", "modelo": "table", "cat": "Cocina", "tienda": "akia"},
	{"id": "badkar", "nombre": "BÄDKAR bañera", "precio": 279, "tipo": "akia", "modelo": "bathtub", "bono": {"higiene": 1.4}, "cat": "Baño", "tienda": "akia"},
	{"id": "lampa", "nombre": "LÄMPA lámpara", "precio": 19, "tipo": "akia", "modelo": "lampRoundFloor", "bono": {"diversion": 1.03}, "cat": "Decoración", "tienda": "akia"},
	{"id": "vaxt", "nombre": "VÄXT planta", "precio": 12, "tipo": "akia", "modelo": "pottedPlant", "bono": {"diversion": 1.03}, "cat": "Decoración", "tienda": "akia"},
	{"id": "matta", "nombre": "MÄTTA alfombra", "precio": 29, "tipo": "akia", "modelo": "rugRectangle", "cat": "Decoración", "tienda": "akia"},
	{"id": "nalle", "nombre": "NÄLLE peluche", "precio": 9, "tipo": "akia", "modelo": "bear", "bono": {"social": 1.05}, "cat": "Decoración", "tienda": "akia"},
	{"id": "huerto", "nombre": "Kit de huerto ODLA", "precio": 45, "tipo": "akia", "modelo": "plantSmall1", "cat": "Jardín", "tienda": "akia"},
	# Medio Murk (electrónica)
	{"id": "pcgamer", "nombre": "PC gamer RTX 9090", "precio": 1200, "tipo": "mueble", "modelo": "desk", "bono": {"diversion": 1.3}, "trabajo": 1.3, "cat": "Electrónica", "tienda": "mediomurk"},
	{"id": "tele", "nombre": "Tele 75\" (no soy tonto)", "precio": 600, "tipo": "mueble", "modelo": "televisionModern", "bono": {"diversion": 1.25}, "cat": "Electrónica", "tienda": "mediomurk"},
	{"id": "consola2", "nombre": "Consola PixelStation 6", "precio": 450, "tipo": "mueble", "modelo": "speaker", "bono": {"diversion": 1.3}, "cat": "Electrónica", "tienda": "mediomurk"},
	{"id": "movil", "nombre": "Móvil Pear 17", "precio": 900, "tipo": "ropa", "moral": 12, "cat": "Electrónica", "tienda": "mediomurk"},
	{"id": "alarma", "nombre": "Alarma antirrobo", "precio": 150, "tipo": "mueble", "modelo": "radio", "cat": "Electrónica", "tienda": "mediomurk"},
	# Mercadogona / Lidel (comida)
	{"id": "hacendudo", "nombre": "Pack Hacendudo (5 raciones)", "precio": 12, "tipo": "consumible", "cantidad": 5, "cat": "Comida", "tienda": "mercadogona"},
	{"id": "lidelpack", "nombre": "Oferta semanal Lidel (6)", "precio": 11, "tipo": "consumible", "cantidad": 6, "cat": "Comida", "tienda": "lidel", "alias": "comida"},
	{"id": "pienso", "nombre": "Pienso y correa: adoptar perro", "precio": 80, "tipo": "mascota", "cat": "Mascotas", "tienda": "mercadogona"},
	# Ropa y deporte
	{"id": "zarrachaqueta", "nombre": "Chaqueta Zarra", "precio": 49, "tipo": "ropa", "moral": 8, "cat": "Ropa", "tienda": "zarra"},
	{"id": "primarcocamis", "nombre": "Camiseta Primarco (3 €)", "precio": 3, "tipo": "ropa", "moral": 2, "cat": "Ropa", "tienda": "primarco"},
	{"id": "bici", "nombre": "Bici Decatlhon", "precio": 199, "tipo": "ropa", "moral": 6, "cat": "Deporte", "tienda": "decatlhon"},
	{"id": "traje", "nombre": "Traje de boda (El Corte Inglez)", "precio": 500, "tipo": "ropa", "moral": 10, "cat": "Ropa", "tienda": "corteinglez"},
]
var TIPOS_EDIFICIO: Array = [
	{"id": "oficina", "nombre": "Oficina PixelSoft", "w": 6, "h": 4, "coste": 0, "lugar": "oficina", "unico": true},
	{"id": "casa", "nombre": "Casa", "w": 4, "h": 4, "coste": 400, "lugar": "casa", "necesidad": "sueno"},
	{"id": "super", "nombre": "Supermercado", "w": 5, "h": 4, "coste": 600, "lugar": "super", "necesidad": "hambre"},
	{"id": "cafeteria", "nombre": "Cafetería", "w": 4, "h": 4, "coste": 500, "lugar": "cafeteria", "necesidad": "social"},
	{"id": "parque", "nombre": "Parque", "w": 4, "h": 3, "coste": 250, "lugar": "parque", "necesidad": "diversion"},
	{"id": "gimnasio", "nombre": "Gimnasio", "w": 4, "h": 4, "coste": 550, "lugar": "gimnasio", "necesidad": "higiene"},
	{"id": "biblioteca", "nombre": "Biblioteca", "w": 4, "h": 4, "coste": 450, "lugar": "parque", "necesidad": "diversion", "rasgo": "solitario"},
	{"id": "arcade", "nombre": "Salón recreativo", "w": 4, "h": 4, "coste": 520, "lugar": "parque", "necesidad": "diversion", "rasgo": "fiestero"},
	{"id": "akia", "nombre": "AKIA", "w": 8, "h": 6, "coste": 900, "lugar": "akia", "necesidad": "diversion", "tienda": true, "desbloqueo": 0, "colores": ["#0a3fa6", "#ffd10d"]},
	{"id": "mercadogona", "nombre": "Mercadogona", "w": 6, "h": 4, "coste": 700, "lugar": "super", "necesidad": "hambre", "tienda": true, "desbloqueo": 7, "colores": ["#1d8a3a", "#ffffff"]},
	{"id": "mediomurk", "nombre": "Medio Murk", "w": 6, "h": 4, "coste": 900, "lugar": "tienda", "necesidad": "diversion", "tienda": true, "desbloqueo": 9, "colores": ["#c8102e", "#222222"]},
	{"id": "burguerkong", "nombre": "Burguer Kong", "w": 4, "h": 4, "coste": 600, "lugar": "cafeteria", "necesidad": "hambre", "tienda": true, "desbloqueo": 10, "colores": ["#f5a623", "#d62300"]},
	{"id": "zarra", "nombre": "Zarra", "w": 4, "h": 4, "coste": 650, "lugar": "tienda", "necesidad": "social", "tienda": true, "desbloqueo": 12, "colores": ["#111111", "#f2f2f2"]},
	{"id": "telepizzo", "nombre": "Telepizzo", "w": 4, "h": 4, "coste": 550, "lugar": "cafeteria", "necesidad": "hambre", "tienda": true, "desbloqueo": 13, "colores": ["#c4161c", "#2f7d32"]},
	{"id": "lidel", "nombre": "Lidel", "w": 5, "h": 4, "coste": 600, "lugar": "super", "necesidad": "hambre", "tienda": true, "desbloqueo": 14, "colores": ["#0050aa", "#fff000"]},
	{"id": "decatlhon", "nombre": "Decatlhon", "w": 6, "h": 4, "coste": 800, "lugar": "gimnasio", "necesidad": "higiene", "tienda": true, "desbloqueo": 16, "colores": ["#0082c3", "#ffffff"]},
	{"id": "primarco", "nombre": "Primarco", "w": 5, "h": 4, "coste": 600, "lugar": "tienda", "necesidad": "social", "tienda": true, "desbloqueo": 18, "colores": ["#0b2a5b", "#00b3e3"]},
	{"id": "corteinglez", "nombre": "El Corte Inglez", "w": 7, "h": 5, "coste": 1600, "lugar": "tienda", "necesidad": "social", "tienda": true, "desbloqueo": 22, "colores": ["#ffffff", "#0b8a3e"], "alto": 3},
	{"id": "fuente", "nombre": "Fuente", "w": 2, "h": 2, "coste": 80, "decoracion": true},
	{"id": "arbol", "nombre": "Árboles", "w": 1, "h": 1, "coste": 20, "decoracion": true},
]
const NOMBRES_PUEBLO = ["Villabit", "Pixelandia", "Tokenburgo", "San Prompt", "Villacontexto", "Puerto Kernel", "Valdebyte"]
const MOTIVOS = {"sueno": "Necesitamos más casas, que dormimos fatal.", "hambre": "Un super más cerca y comemos mejor.",
	"social": "Una cafetería para quedar con gente.", "tienda": "¡Han abierto franquicias en otras ciudades! Queremos una aquí.", "diversion": "Algo para desconectar al salir del curro.",
	"higiene": "Un gimnasio con duchas, por favor.", "decor": "El pueblo está muy soso. Pongamos algo bonito."}
const EMPLEADOS_INICIALES = [
	{"id": "ana", "nombre": "Ana", "puesto": "Programadora", "color": Color(0.85, 0.35, 0.35)},
	{"id": "bruno", "nombre": "Bruno", "puesto": "Diseñador", "color": Color(0.3, 0.6, 0.9)},
	{"id": "carla", "nombre": "Carla", "puesto": "Jefa de producto", "color": Color(0.4, 0.75, 0.4)},
]

var dia = 1
var hora = 8
var tick = 0
var empresa = {}
var agentes: Array = []
var pueblo = {}
var sucesos: Array = []
var velocidad = 1.0
var _acum = 0.0
const SEG_POR_HORA = 2.5

func _ready() -> void:
	randomize()
	Mods.aplicar()
	if not cargar():
		nueva_partida()

func nueva_partida() -> void:
	dia = 1; hora = 8; tick = 0
	empresa = {"nombre": "PixelSoft", "dinero": 500.0, "reputacion": 60.0, "calidad": 40.0, "clientes": 12.0, "precio": 20.0, "salario": 25.0, "alquiler": 15.0, "contratos_hechos": 0}
	agentes = []
	for i in EMPLEADOS_INICIALES.size():
		agentes.append(crear_agente(EMPLEADOS_INICIALES[i]))
	pueblo = crear_pueblo()
	sucesos = []
	# La IA genera vecinos y familias diversas desde el principio.
	for i in 3: crear_familia(false)
	registrar("%s abre sus puertas en %s." % [empresa.nombre, pueblo.nombre])

func rasgos_de(id: String) -> Array:
	var r = RASGOS.keys()
	var h = 7
	for c in id: h = (h * 31 + c.unicode_at(0)) & 0x7fffffff
	var a: String = r[h % r.size()]
	var b: String = r[(h >> 5) % r.size()]
	return [a] if a == b else [a, b]

func crear_agente(d: Dictionary) -> Dictionary:
	return {"id": d.id, "nombre": d.nombre, "puesto": d.puesto, "color": d.color.to_html(), "moral": 70.0, "energia": 80.0, "habilidad": 40.0,
		"necesidades": {"hambre": 80.0, "sueno": 75.0, "diversion": 60.0, "higiene": 80.0, "social": 60.0},
		"rasgos": rasgos_de(d.id), "lugar": "oficina", "actividad": "trabajar", "dinero": 120.0,
		"inventario": {"comida": 2}, "muebles": [], "casa": "", "amistades": {}, "puntos": 0,
		"habilidades": {"programar": 1, "carisma": 1, "cocina": 1, "forma": 1}, "xp": {"programar": 0, "carisma": 0, "cocina": 0, "forma": 0},
		"modelo": ["character-female-a", "character-male-b", "character-female-c", "character-male-d", "character-female-e", "character-male-f"][hash(d.id) % 6],
		"por_montar": [], "deco": {}, "perro": false, "edad": d.get("edad", 25 + hash(d.id) % 15), "pareja": "", "casado": false, "tornillos": 0,
		"piel": d.get("piel", PIELES[hash(d.id) % PIELES.size()]), "pelo": d.get("pelo", PELOS[hash(d.id + "p") % PELOS.size()]),
		"cuerpo": d.get("cuerpo", [0.9, 1.0, 1.1][hash(d.id + "c") % 3]), "altura": d.get("altura", 0.94 + (hash(d.id + "a") % 12) / 100.0),
		"familia": d.get("familia", d.id), "padres": d.get("padres", []), "hijos": [], "tradicion": d.get("tradicion", ""),
		"enfermo": 0, "paraguas": false, "abrigo": false, "carrera": d.get("carrera", "programador")}

func registrar(t: String) -> void:
	sucesos.append({"dia": dia, "hora": hora, "texto": t})
	if sucesos.size() > 200: sucesos.pop_front()
	suceso.emit(t)

# ------------------------------------------------------------------ tiempo
func _process(delta: float) -> void:
	_acum += delta * velocidad
	while _acum >= SEG_POR_HORA:
		_acum -= SEG_POR_HORA
		tick_hora()

func es_laboral() -> bool:
	return hora >= 9 and hora < 18

func es_noche() -> bool:
	return hora >= 21 or hora < 7

func tick_hora() -> void:
	tick += 1; hora += 1
	if hora >= 24:
		hora = 0; dia += 1
		cerrar_dia()
	tick_vida()
	tick_economia()
	tick_obras()
	tick_extras()
	tick_clima()
	if tick % 12 == 0: guardar()
	cambiado.emit()

func factor_rasgo(a: Dictionary, k: String) -> float:
	var f = 1.0
	for r in a.rasgos: f *= RASGOS.get(r, {}).get(k, 1.0)
	return f

func bono_mueble(a: Dictionary, k: String) -> float:
	var f = 1.0
	for id in a.muebles:
		for t in TIENDA:
			if t.id == id: f *= t.get("bono", {}).get(k, 1.0)
	return f

func elegir_actividad(a: Dictionary) -> String:
	var n: Dictionary = a.necesidades
	if quiere_quedarse_en_casa(a): return "dormir" if n.sueno < 60 else "videojuegos"
	if es_nino(a) and hora >= 9 and hora < 14 and a.edad >= 6: return "estudiar" if ACTIVIDADES.has("estudiar") else "leer"
	if a.get("carrera", "programador") != "parado" and en_horario(a) and not es_nino(a):
		var urgente = false
		for k in NECESIDADES: if n[k] < 12: urgente = true
		if not urgente: return "trabajar"
	var mejor = "dormir"; var maxp = -INF
	for id in ACTIVIDADES:
		var act: Dictionary = ACTIVIDADES[id]
		var p = 0.0
		for k in act.alivia: p += pow((100.0 - n[k]) / 100.0, 2) * act.alivia[k] * factor_rasgo(a, k)
		if act.has("consume") and a.inventario.get(act.consume, 0) <= 0: p = -1
		if id == "comprar": p = 30.0 if a.inventario.get("comida", 0) < 1 and a.dinero >= 15 else -1.0
		if id == "picoteo": p *= 0.35
		if act.has("coste") and a.dinero < act.coste + 30: p = -1
		if id == "gimnasio": p *= factor_rasgo(a, "gimnasio")
		if id == "montar": p = 25.0 if a.get("por_montar", []).size() > 0 else -1.0
		if id == "huerto" and not ("huerto" in a.muebles): p = -1
		if id == "pasear_perro" and not a.get("perro", false): p = -1
		if id == "akia" and not _hay_edificio("akia"): p = -1
		if id == "akia" and rebajas_akia: p *= 1.6
		if id == "tiendas" and not _hay_lugar("tienda"): p = -1
		p += randf() * 2.0
		if p > maxp: maxp = p; mejor = id
	return mejor

func ganar_xp(a: Dictionary, hab: String) -> void:
	a.xp[hab] = a.xp.get(hab, 0) + 1
	var nivel: int = a.habilidades[hab]
	if nivel < 10 and a.xp[hab] >= nivel * 12:
		a.xp[hab] = 0; a.habilidades[hab] = nivel + 1; a.puntos += 1
		registrar("%s sube %s a nivel %d." % [a.nombre, hab, nivel + 1])

func tick_vida() -> void:
	var noche = es_noche()
	for a in agentes:
		var n: Dictionary = a.necesidades
		n.hambre -= 4.0 * factor_rasgo(a, "hambre")
		n.sueno -= (4.0 if noche else 2.5) * factor_rasgo(a, "sueno") / (1.0 + (a.habilidades.forma - 1) * 0.04)
		n.diversion -= 2.5 * factor_rasgo(a, "diversion")
		n.higiene -= 2.0 * factor_rasgo(a, "higiene")
		n.social -= 2.0 * factor_rasgo(a, "social")
		var act = elegir_actividad(a)
		if noche and act != "dormir" and n.sueno < 55: act = "dormir"
		a.actividad = act
		if act == "trabajar":
			a.lugar = "oficina" if a.get("carrera", "programador") == "programador" else "trabajo"
			n.diversion -= 1; tick_trabajo(a)
		else:
			var d: Dictionary = ACTIVIDADES[act]
			a.lugar = d.lugar
			for k in d.alivia:
				var x: float = d.alivia[k] * bono_mueble(a, k)
				if act == "cocinar": x *= 1.0 + (a.habilidades.cocina - 1) * 0.08
				n[k] += x
			if d.has("consume"): a.inventario[d.consume] -= 1
			if d.has("coste"): a.dinero -= d.coste
			if act == "comprar" and a.dinero >= 15: a.dinero -= 15; a.inventario.comida = a.inventario.get("comida", 0) + 3
			if act == "cocinar": ganar_xp(a, "cocina")
			if d.has("habilidad"): ganar_xp(a, d.habilidad)
			if act in ["charlar", "parque", "cafeteria"]:
				for b in agentes:
					if b != a and b.lugar == a.lugar:
						subir_amistad(a, b, 3.0 + a.habilidades.carisma * 0.6)
						if act == "charlar" and randf() < 0.3: Llm.charla(a, b)
						ganar_xp(a, "carisma"); break
		for k in NECESIDADES: n[k] = clampf(n[k], 0, 100)
		var media = 0.0
		for k in NECESIDADES: media += n[k]
		media /= NECESIDADES.size()
		a.moral = clampf(a.moral + (media - 60) * 0.015, 0, 100)
		a.energia = clampf(a.energia + (n.sueno - 55) * 0.015, 0, 100)

func subir_amistad(a: Dictionary, b: Dictionary, cuanto: float) -> void:
	var antes: float = a.amistades.get(b.id, 0.0)
	a.amistades[b.id] = clampf(antes + cuanto, -100, 100)
	b.amistades[a.id] = clampf(b.amistades.get(a.id, 0.0) + cuanto * 0.8, -100, 100)
	if antes < 50 and a.amistades[b.id] >= 50:
		registrar("%s y %s ya son buenos amigos." % [a.nombre, b.nombre])

func tick_economia() -> void:
	if not es_laboral(): return
	var e = empresa
	var trabajando = 0
	for a in agentes: if a.actividad == "trabajar" and a.get("carrera", "programador") == "programador": trabajando += 1
	var precio_base: float = 18 + e.calidad * 0.35
	var factor = clampf(1 - (e.precio / precio_base - 1) * 0.6, 0.15, 1.35)
	var objetivo: float = (6 + e.reputacion * 0.25) * factor * (0.5 + e.calidad / 100.0)
	e.clientes += (objetivo - e.clientes) * 0.05
	e.dinero += e.clientes * e.precio * 0.11 * (e.calidad / 70.0) * (0.5 + 0.5 * trabajando / max(1, agentes.size()))
	e.calidad = clampf(e.calidad + trabajando * 0.05 - 0.02, 0, 100)

func cerrar_dia() -> void:
	var progs = agentes.filter(func(x): return x.get("carrera", "programador") == "programador")
	var coste: float = progs.size() * empresa.salario + empresa.alquiler
	empresa.dinero -= coste
	for a in agentes:
		if not es_nino(a): a.dinero -= (8.0 if a.casa == "" else 0.0)
		else: a.dinero = maxf(a.dinero, 0.0)
		if a in progs: a.dinero += maxf(25.0, empresa.salario) + a.get("nivel", 0) * 10
	registrar("Fin del día %d: nóminas y alquiler -%d EUR. Caja: %d EUR." % [dia - 1, coste, empresa.dinero])
	cerrar_dia_pueblo()
	cerrar_dia_extras()
	cerrar_dia_familias()
	guardar()

# ------------------------------------------------------------------ pueblo
func tipo_edificio(id: String) -> Dictionary:
	for t in TIPOS_EDIFICIO: if t.id == id: return t
	return {}

func crear_pueblo() -> Dictionary:
	var p = {"nombre": NOMBRES_PUEBLO[randi() % NOMBRES_PUEBLO.size()], "bandera": [Color.from_hsv(randf(), 0.7, 0.9).to_html(), Color.from_hsv(randf(), 0.7, 0.9).to_html()],
		"edificios": [], "propuestas": [], "modo": "aprobar", "siguiente": 1, "arboles": []}
	pueblo = p
	_colocar("oficina", 17, CALLE_Y - 4, true)
	_colocar("casa", 6, CALLE_Y - 4, true, "Piso compartido")
	_colocar("super", 25, CALLE_Y + 1, true)
	_colocar("cafeteria", 11, CALLE_Y + 1, true)
	_colocar("parque", 30, CALLE_Y - 3, true)
	_colocar("gimnasio", 2, CALLE_Y + 1, true)
	_colocar("akia", 30, CALLE_Y + 1, true)
	for i in 30:
		var x = randi() % ANCHO; var y = randi() % ALTO
		if _libre(x, y, 1, 1): p.arboles.append([x, y])
	return p

func _libre(x: int, y: int, w: int, h: int) -> bool:
	if x < 0 or y < 0 or x + w > ANCHO or y + h > ALTO: return false
	if y <= CALLE_Y and y + h > CALLE_Y: return false
	for e in pueblo.edificios:
		if x < e.x + e.w + 1 and x + w + 1 > e.x and y < e.y + e.h and y + h > e.y: return false
	return true

func _colocar(tipo: String, x: int, y: int, hecho: bool, nombre := "") -> Dictionary:
	var t = tipo_edificio(tipo)
	var e = {"id": "e%d" % pueblo.siguiente, "tipo": tipo, "x": x, "y": y, "w": t.w, "h": t.h, "progreso": 100.0 if hecho else 0.0, "nombre": nombre if nombre != "" else t.nombre, "dueno": ""}
	pueblo.siguiente += 1
	pueblo.edificios.append(e)
	pueblo.arboles = pueblo.arboles.filter(func(a): return not (a[0] >= x and a[0] < x + t.w and a[1] >= y and a[1] < y + t.h))
	return e

func _hueco(t: Dictionary) -> Vector2i:
	for d in ANCHO:
		for x in [ANCHO / 2 + d, ANCHO / 2 - d]:
			for y in [CALLE_Y - t.h, CALLE_Y + 1, CALLE_Y - t.h - 5, CALLE_Y + 6]:
				if _libre(x, y, t.w, t.h): return Vector2i(x, y)
	return Vector2i(-1, -1)

func puerta_de(lugar: String, agente_id: String) -> Vector2:
	if lugar == "trabajo": return Vector2(ANCHO + 2.0, CALLE_Y + 0.5)  # se van a trabajar fuera del pueblo
	var mejor = null
	for e in pueblo.edificios:
		if e.progreso < 100 or tipo_edificio(e.tipo).get("lugar", "") != lugar: continue
		if e.dueno == agente_id: mejor = e; break
		if mejor == null and e.dueno == "": mejor = e
	if mejor == null: return Vector2(ANCHO / 2.0, CALLE_Y + 0.5)
	return Vector2(mejor.x + mejor.w / 2.0, mejor.y + mejor.h / 2.0)

func cerrar_dia_pueblo() -> void:
	var p = pueblo
	var pendientes = p.propuestas.filter(func(x): return x.estado in ["votando", "esperando_jefe", "aprobada"])
	if pendientes.size() < 2 and agentes.size() > 0:
		var autor: Dictionary = agentes[randi() % agentes.size()]
		var elegido = _que_proponer(autor)
		var t: Dictionary = elegido[0]
		var votos = 0
		for a in agentes:
			var sirve: bool = t.has("necesidad") and a.necesidades[t.necesidad] < 65
			if a == autor or sirve or a.amistades.get(autor.id, 0) > 20 or randf() < 0.35: votos += 1
		var estado = "rechazada"
		if votos * 2 > agentes.size(): estado = "aprobada" if p.modo == "libre" else "esperando_jefe"
		var prop = {"id": "p%d" % p.siguiente, "tipo": t.id, "nombre": t.nombre, "autor": autor.id, "autor_nombre": autor.nombre,
			"motivo": elegido[1], "votos": votos, "fondos": 0.0, "coste": t.coste, "estado": estado, "dia": dia}
		p.siguiente += 1
		p.propuestas.append(prop)
		registrar("%s propone: %s. «%s» Votos %d/%d. %s" % [autor.nombre, t.nombre, elegido[1], votos, agentes.size(),
			{"rechazada": "Rechazada.", "aprobada": "¡Aprobada!", "esperando_jefe": "Decides tú."}[estado]])
		Llm.explicar_propuesta(autor, t.nombre, elegido[1])
	for obra in p.propuestas:
		if obra.estado != "aprobada": continue
		for a in agentes:
			# Impuesto municipal (6 EUR) + un 10% de lo que ahorran.
			var pone = 6.0 + floorf(maxf(0, a.dinero - 30) * 0.1)
			pone = minf(pone, maxf(0, a.dinero))
			a.dinero -= pone; obra.fondos += pone
		# La empresa, si va bien, aporta un 4% de la caja.
		if empresa.dinero > 800:
			var e_pone = floorf(empresa.dinero * 0.04)
			empresa.dinero -= e_pone; obra.fondos += e_pone
		obra.fondos = minf(obra.fondos, obra.coste)
		if obra.fondos >= obra.coste:
			var t = tipo_edificio(obra.tipo)
			var h = _hueco(t)
			if h.x < 0: obra.estado = "rechazada"
			else:
				var e = _colocar(obra.tipo, h.x, h.y, false)
				e.propuesta = obra.id; obra.estado = "en_obras"
				registrar("Empiezan las obras de %s." % obra.nombre)
		break
	p.propuestas = p.propuestas.filter(func(x): return not (x.estado in ["rechazada", "hecha"]) or dia - x.dia < 4)

func _que_proponer(a: Dictionary) -> Array:
	# Franquicias que se desbloquean al crecer el pueblo.
	var n: int = pueblo.edificios.size()
	for t in TIPOS_EDIFICIO:
		if t.get("tienda", false) and n >= t.get("desbloqueo", 0) and not pueblo.edificios.any(func(e): return e.tipo == t.id) and randf() < 0.5:
			return [t, MOTIVOS.tienda]
	for t in TIPOS_EDIFICIO:
		if t.has("rasgo") and t.rasgo in a.rasgos and randf() < 0.5 and not pueblo.edificios.any(func(e): return e.tipo == t.id):
			return [t, MOTIVOS[t.necesidad]]
	var peor = "hambre"
	for k in NECESIDADES: if a.necesidades[k] < a.necesidades[peor]: peor = k
	# No repetir: si ya hay 2 del mismo tipo, mejor otra cosa.
	var ops = TIPOS_EDIFICIO.filter(func(t): return t.get("necesidad", "") == peor and not t.get("unico", false) and pueblo.edificios.filter(func(e): return e.tipo == t.id).size() < 2)
	if ops.is_empty() or a.necesidades[peor] > 70:
		var d = TIPOS_EDIFICIO.filter(func(t): return t.get("decoracion", false))
		return [d[randi() % d.size()], MOTIVOS.decor]
	return [ops[randi() % ops.size()], MOTIVOS[peor]]

func tick_obras() -> void:
	for e in pueblo.edificios:
		if e.progreso >= 100: continue
		var libres = agentes.filter(func(a): return not (a.actividad in ["trabajar", "dormir"])).size()
		e.progreso = minf(100, e.progreso + 2 + libres * 1.5)
		if e.progreso >= 100:
			for pr in pueblo.propuestas: if pr.id == e.get("propuesta", ""): pr.estado = "hecha"
			registrar("¡Inaugurado: %s en %s!" % [e.nombre, pueblo.nombre])
			for a in agentes: a.moral = minf(100, a.moral + 4)

func decidir_propuesta(id: String, aprobar: bool) -> void:
	for pr in pueblo.propuestas:
		if pr.id == id and pr.estado == "esperando_jefe":
			pr.estado = "aprobada" if aprobar else "rechazada"
			registrar(("Apruebas: %s." if aprobar else "Vetas: %s.") % pr.nombre)
	cambiado.emit()

func donar_a_obra() -> void:
	for pr in pueblo.propuestas:
		if pr.estado == "aprobada":
			var c = minf(empresa.dinero, pr.coste - pr.fondos)
			if c > 0: empresa.dinero -= c; pr.fondos += c; registrar("La empresa pone %d EUR para %s." % [c, pr.nombre])
			break
	cambiado.emit()

func comprar(agente: Dictionary, item_id: String) -> String:
	for o in TIENDA:
		if o.id != item_id: continue
		var precio: float = o.precio * (0.7 if rebajas_akia and o.get("tienda", "") == "akia" else 1.0)
		if o.has("tienda") and not _hay_edificio(o.tienda): return "Todavía no hay %s en el pueblo." % tipo_edificio(o.tienda).get("nombre", o.tienda)
		if agente.dinero < precio: return "%s no tiene %d EUR." % [agente.nombre, precio]
		if o.tipo == "akia":
			agente.por_montar.append(item_id)
			agente.dinero -= precio
			registrar("%s compra %s en AKIA. Viene en 47 piezas." % [agente.nombre, o.nombre])
			cambiado.emit(); return "Comprado. Ahora toca montarlo en casa."
		if o.tipo == "mascota":
			if agente.get("perro", false): return "Ya tiene perro."
			agente.perro = true; agente.dinero -= precio
			registrar("%s adopta un perro. Se llama Bit." % agente.nombre); publicar(agente, "Os presento a Bit. #perro")
			cambiado.emit(); return "¡Perro adoptado!"
		if o.tipo == "mueble":
			if item_id in agente.muebles: return "Ya lo tiene."
			agente.muebles.append(item_id)
		elif o.tipo == "consumible": agente.inventario["comida"] = agente.inventario.get("comida", 0) + o.cantidad
		else: agente.moral = minf(100, agente.moral + o.get("moral", 0))
		agente.dinero -= precio
		registrar("%s compra %s." % [agente.nombre, o.nombre])
		cambiado.emit()
		return "Comprado."
	return "No existe."

func gastar_punto(agente: Dictionary, hab: String) -> void:
	if agente.puntos > 0 and agente.habilidades[hab] < 10:
		agente.puntos -= 1; agente.habilidades[hab] += 1
		if hab == "programar": agente.habilidad = minf(100, agente.habilidad + 4)
		cambiado.emit()

# ------------------------------------------------------------------ guardado
func exportar() -> Dictionary:
	return {"v": 2, "dia": dia, "hora": hora, "tick": tick, "empresa": empresa, "agentes": agentes, "pueblo": pueblo, "sucesos": sucesos.slice(-50), "pixelgram": pixelgram.slice(-30), "clima": clima}

func guardar() -> void:
	var f = FileAccess.open(RUTA_PARTIDA + ".tmp", FileAccess.WRITE)
	if f == null: return
	f.store_string(JSON.stringify(exportar()))
	f.close()
	DirAccess.rename_absolute(ProjectSettings.globalize_path(RUTA_PARTIDA + ".tmp"), ProjectSettings.globalize_path(RUTA_PARTIDA))

func cargar() -> bool:
	if not FileAccess.file_exists(RUTA_PARTIDA): return false
	var d = JSON.parse_string(FileAccess.get_file_as_string(RUTA_PARTIDA))
	return importar(d)

## Acepta partidas de PixelSoft 2 y tambien las de la 1.x (navegador) si se
## copian a user://partida.json: se rescatan dia, empresa y nombres.
func importar(d) -> bool:
	if typeof(d) != TYPE_DICTIONARY or not d.has("empresa"): return false
	if int(d.get("v", 1)) == 1:
		nueva_partida()
		dia = int(d.get("dia", 1))
		empresa.dinero = float(d.empresa.get("dinero", 500)); empresa.reputacion = float(d.empresa.get("reputacion", 60))
		empresa.calidad = float(d.empresa.get("calidad", 40))
		registrar("Partida de PixelSoft 1.x importada.")
		return true
	dia = int(d.dia); hora = int(d.hora); tick = int(d.tick)
	empresa = d.empresa; agentes = d.agentes; pueblo = d.pueblo; sucesos = d.get("sucesos", []); pixelgram = d.get("pixelgram", []); clima = d.get("clima", clima)
	for a in agentes:
		var base = crear_agente({"id": a.id, "nombre": a.nombre, "puesto": a.puesto, "color": Color.html(a.color)})
		for k in base: if not a.has(k): a[k] = base[k]
	return true

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		guardar()

# ================================================================ CARRERAS
## Cada carrera: horario, sueldo por nivel, habilidad que pide, uniforme,
## vehiculo y tarjetas de suceso con dos opciones.
var CARRERAS := {
	"programador": {"nombre": "Programador (PixelSoft)", "inicio": 9, "fin": 18, "sueldo": [25, 40, 60, 90, 130], "habilidad": "programar", "uniforme": "#3a6fd8", "vehiculo": "", "titulos": ["Becario", "Junior", "Senior", "Lead", "CTO"]},
	"espia": {"nombre": "Espía", "inicio": 20, "fin": 2, "sueldo": [40, 70, 110, 160, 240], "habilidad": "carisma", "uniforme": "#111111", "vehiculo": "Deportivo negro", "titulos": ["Informante", "Agente", "Agente doble", "Jefe de célula", "Agente 00Pixel"]},
	"policia": {"nombre": "Policía", "inicio": 8, "fin": 16, "sueldo": [30, 45, 65, 90, 120], "habilidad": "forma", "uniforme": "#1b2f6b", "vehiculo": "Coche patrulla", "titulos": ["Cadete", "Agente", "Inspector", "Comisario", "Jefe de policía"]},
	"medico": {"nombre": "Médico", "inicio": 7, "fin": 15, "sueldo": [35, 60, 95, 140, 200], "habilidad": "programar", "uniforme": "#f2f2f2", "vehiculo": "Ambulancia", "titulos": ["Celador", "Enfermero", "Residente", "Cirujano", "Jefe de planta"]},
	"chef": {"nombre": "Chef", "inicio": 12, "fin": 22, "sueldo": [22, 35, 55, 85, 120], "habilidad": "cocina", "uniforme": "#ffffff", "vehiculo": "", "titulos": ["Friegaplatos", "Pinche", "Cocinero", "Jefe de cocina", "Estrella Michelín"]},
	"astronauta": {"nombre": "Astronauta", "inicio": 6, "fin": 14, "sueldo": [40, 70, 120, 190, 300], "habilidad": "forma", "uniforme": "#e8e8e8", "vehiculo": "Cohete", "titulos": ["Probador de cápsulas", "Piloto", "Comandante", "Viajero lunar", "Héroe galáctico"]},
	"streamer": {"nombre": "Youtuber / Streamer", "inicio": 16, "fin": 23, "sueldo": [5, 20, 60, 120, 250], "habilidad": "carisma", "uniforme": "#9146ff", "vehiculo": "", "titulos": ["0 suscriptores", "Microinfluencer", "Partner", "Estrella", "Leyenda de Pixeltube"]},
	"bombero": {"nombre": "Bombero", "inicio": 8, "fin": 20, "sueldo": [30, 45, 65, 85, 110], "habilidad": "forma", "uniforme": "#d62300", "vehiculo": "Camión de bomberos", "titulos": ["Voluntario", "Bombero", "Cabo", "Sargento", "Jefe de bomberos"]},
	"musico": {"nombre": "Músico", "inicio": 18, "fin": 1, "sueldo": [10, 25, 50, 100, 200], "habilidad": "carisma", "uniforme": "#6b2c91", "vehiculo": "Furgoneta de gira", "titulos": ["Músico callejero", "Bar de copas", "Telonero", "Cabeza de cartel", "Estrella de rock"]},
	"cientifico": {"nombre": "Científico", "inicio": 9, "fin": 17, "sueldo": [30, 50, 80, 120, 180], "habilidad": "programar", "uniforme": "#cfe8ff", "vehiculo": "", "titulos": ["Ayudante", "Investigador", "Doctor", "Catedrático", "Premio Nobelito"]},
	"criminal": {"nombre": "Criminal", "inicio": 22, "fin": 4, "sueldo": [20, 45, 90, 150, 260], "habilidad": "carisma", "uniforme": "#3d3d3d", "vehiculo": "Coche robado", "titulos": ["Carterista", "Ladrón", "Atracador", "Capo", "Cerebro criminal"]},
	"deportista": {"nombre": "Deportista", "inicio": 9, "fin": 15, "sueldo": [15, 35, 70, 140, 280], "habilidad": "forma", "uniforme": "#00a650", "vehiculo": "", "titulos": ["Aficionado", "Semiprofesional", "Titular", "Internacional", "Balón de Píxel"]},
	"politico": {"nombre": "Político", "inicio": 10, "fin": 18, "sueldo": [25, 45, 80, 130, 200], "habilidad": "carisma", "uniforme": "#2b2b6b", "vehiculo": "Coche oficial", "titulos": ["Becario del partido", "Concejal", "Teniente de alcalde", "Alcalde", "Presidente"]},
}
const TARJETAS := [
	{"carrera": "espia", "texto": "Te ofrecen un microfilm a cambio de un bocadillo.", "a": ["Aceptar el trato", 25, -5], "b": ["Detenerle con tu reloj-láser", 10, 15]},
	{"carrera": "policia", "texto": "Un señor aparca en doble fila para comprar churros.", "a": ["Multarle", 15, -5], "b": ["Pedirle un churro", -5, 15]},
	{"carrera": "medico", "texto": "Un paciente dice que le duele 'todo'.", "a": ["Pedir mil pruebas", 20, -5], "b": ["Recetar reposo y caldo", 5, 10]},
	{"carrera": "chef", "texto": "Se acaban los huevos en plena hora punta.", "a": ["Improvisar tortilla sin huevo", 25, 5], "b": ["Correr al Mercadogona", 10, -5]},
	{"carrera": "astronauta", "texto": "Notas un ruido raro en la cápsula.", "a": ["Darle un golpecito", 30, -10], "b": ["Leer el manual entero", 10, 0]},
	{"carrera": "streamer", "texto": "Tu directo se llena de trolls.", "a": ["Banearlos con estilo", 15, 5], "b": ["Hacer un vídeo reacción", 30, -10]},
	{"carrera": "bombero", "texto": "Un gato se ha subido a una farola.", "a": ["Escalera y paciencia", 15, 10], "b": ["Atraerlo con atún", 20, 5]},
	{"carrera": "musico", "texto": "Se rompe una cuerda a mitad del solo.", "a": ["Seguir con el kazoo", 30, 10], "b": ["Parar y cambiarla", 5, -5]},
	{"carrera": "cientifico", "texto": "Tu experimento brilla en la oscuridad.", "a": ["Publicarlo", 25, 5], "b": ["Usarlo de lámpara", 5, 15]},
	{"carrera": "criminal", "texto": "La caja fuerte tiene la clave escrita en un pósit.", "a": ["Abrirla", 35, -10], "b": ["Dejar una nota de seguridad", -10, 20]},
	{"carrera": "deportista", "texto": "El rival te provoca antes del partido.", "a": ["Responder en el campo", 25, 5], "b": ["Contestar en Pixelgram", 10, -10]},
	{"carrera": "politico", "texto": "Prometiste un metro y no hay presupuesto.", "a": ["Inaugurar una maqueta", 20, -5], "b": ["Pedir perdón", 5, 15]},
	{"carrera": "programador", "texto": "Producción se cae un viernes a las 17:55.", "a": ["Arreglarlo en caliente", 25, -10], "b": ["Echarle la culpa a la caché", 5, 5]},
]

func carrera_de(a: Dictionary) -> Dictionary:
	return CARRERAS.get(a.get("carrera", "programador"), CARRERAS.programador)

func en_horario(a: Dictionary) -> bool:
	var c = carrera_de(a)
	if c.inicio < c.fin: return hora >= c.inicio and hora < c.fin
	return hora >= c.inicio or hora < c.fin

func ofertas(a: Dictionary) -> Array:
	var r = []
	for id in CARRERAS:
		if id != a.get("carrera", ""): r.append(id)
	return r

func cambiar_carrera(a: Dictionary, id: String) -> String:
	if not CARRERAS.has(id): return "Ese trabajo no existe."
	a.carrera = id; a.nivel = 0; a.rendimiento = 0.0
	var c = CARRERAS[id]
	registrar("%s empieza como %s (%s)." % [a.nombre, c.titulos[0], c.nombre])
	publicar(a, "¡Nuevo curro! Ahora soy %s. Deseadme suerte." % c.titulos[0])
	cambiado.emit()
	return "Contratado."

func dejar_trabajo(a: Dictionary) -> void:
	registrar("%s deja su trabajo de %s." % [a.nombre, carrera_de(a).nombre])
	a.carrera = "parado"; cambiado.emit()

func resolver_tarjeta(a: Dictionary, opcion: String) -> void:
	var t = a.get("tarjeta", null)
	if t == null: return
	var o = t[opcion]
	a.rendimiento = clampf(a.get("rendimiento", 0.0) + o[1], 0, 120)
	a.moral = clampf(a.moral + o[2], 0, 100)
	registrar("%s: «%s» → %s." % [a.nombre, t.texto, o[0]])
	a.tarjeta = null
	cambiado.emit()

## Una hora de trabajo: rendimiento, tarjetas y ascensos.
func tick_trabajo(a: Dictionary) -> void:
	var id: String = a.get("carrera", "programador")
	if id == "parado": return
	var c = CARRERAS[id]
	var n: Dictionary = a.necesidades
	var animo = (n.hambre + n.sueno + n.diversion) / 300.0
	a.rendimiento = clampf(a.get("rendimiento", 0.0) + 1.5 + animo * 2.0 + a.habilidades.get(c.habilidad, 1) * 0.2, 0, 120)
	ganar_xp(a, c.habilidad)
	if a.get("tarjeta", null) == null and randf() < 0.06:
		var ops = TARJETAS.filter(func(t): return t.carrera == id)
		if ops.size(): a.tarjeta = ops[randi() % ops.size()]
	var nivel: int = a.get("nivel", 0)
	if a.rendimiento >= 100 and nivel < 4 and a.habilidades.get(c.habilidad, 1) >= (nivel + 1) * 2:
		a.nivel = nivel + 1; a.rendimiento = 20.0
		registrar("Ascenso: %s ya es %s (%s)." % [a.nombre, c.titulos[a.nivel], c.nombre])
		publicar(a, "¡Me han ascendido a %s!" % c.titulos[a.nivel])
		Llm.frase("Eres %s. Hablas en español de España." % a.nombre, "Te acaban de ascender a %s. Dilo en una frase emocionada." % c.titulos[a.nivel], "", func(t): if t != "": registrar("%s: «%s»" % [a.nombre, t]))

func sueldo_de(a: Dictionary) -> float:
	var id: String = a.get("carrera", "programador")
	if id == "parado": return 0.0
	return float(CARRERAS[id].sueldo[a.get("nivel", 0)])

# ================================================================ PIXELGRAM
var pixelgram: Array = []
const FRASES_POST := ["Hoy toca %s. #vidaPixel", "No sé ni qué hora es. %s", "Lunes otra vez... %s", "Me encanta %s.", "%s y yo, mejores amigos."]

func publicar(a: Dictionary, texto: String) -> void:
	pixelgram.append({"autor": a.nombre, "texto": texto, "likes": randi() % 20, "dia": dia, "hora": hora})
	if pixelgram.size() > 60: pixelgram.pop_front()

func post_aleatorio(a: Dictionary) -> void:
	var sitio = {"akia": "AKIA", "cafeteria": "el café", "parque": "el parque", "gimnasio": "el gym", "tienda": "ir de tiendas", "casa": "estar en casa", "oficina": "currar"}.get(a.lugar, a.lugar)
	var reserva: String = FRASES_POST[randi() % FRASES_POST.size()] % sitio
	Llm.frase("Eres %s y escribes en Pixelgram, una red social. Una frase corta con un hashtag, en español de España." % a.nombre,
		"Estás en %s. ¿Qué publicas?" % sitio, reserva, func(t): publicar(a, t))

# ================================================================ EXTRAS
var rebajas_akia = false

func tick_extras() -> void:
	for a in agentes:
		# Perderse en AKIA (pasa mucho).
		if a.lugar == "akia" and randf() < 0.05 and not a.get("perdido", false):
			a.perdido = true; registrar("%s se ha perdido en AKIA entre los sofás. Sigue las flechas amarillas…" % a.nombre)
		elif a.get("perdido", false) and randf() < 0.3:
			a.perdido = false; a.necesidades.hambre = minf(100, a.necesidades.hambre + 25)
			registrar("%s encuentra la salida… por la cafetería. Albóndigas. Ánimo +." % a.nombre); a.moral = minf(100, a.moral + 6)
		# Montar muebles de AKIA (minijuego automático).
		if a.actividad == "montar" and a.por_montar.size() > 0:
			var mueble: String = a.por_montar.pop_front()
			var exito = randf() < 0.45 + a.habilidades.programar * 0.05
			var sobran = randi() % 4
			a.tornillos = a.get("tornillos", 0) + sobran
			if exito:
				a.muebles.append(mueble); a.moral = minf(100, a.moral + 8)
				registrar("%s monta %s a la primera. ¡Orgullo sueco! (Sobran %d tornillos.)" % [a.nombre, _nombre_obj(mueble), sobran])
				publicar(a, "Montado sin instrucciones. Sobran %d tornillos, pero eso es normal, ¿no? #AKIA" % sobran)
			else:
				a.por_montar.append(mueble); a.moral = maxf(0, a.moral - 6)
				registrar("%s se pelea con las instrucciones de %s. Mañana lo intenta otra vez." % [a.nombre, _nombre_obj(mueble)])
			if a.pareja != "":
				var p = _agente(a.pareja)
				if p and p.lugar == a.lugar:
					subir_amistad(a, p, 4.0 if exito else -8.0)
					if not exito: registrar("%s y %s discuten montando el mueble: «¡Esa pieza va al revés!»" % [a.nombre, p.nombre])
		# Huerto: comida gratis.
		if a.actividad == "huerto":
			a.inventario.comida = a.inventario.get("comida", 0) + (1 if randf() < 0.4 else 0)
		# Incendio en la cocina si cocina fatal.
		if a.actividad == "cocinar" and a.habilidades.cocina < 3 and randf() < 0.03:
			a.necesidades.higiene = maxf(0, a.necesidades.higiene - 30); a.moral = maxf(0, a.moral - 10)
			if a.muebles.size(): a.muebles.pop_back()
			registrar("¡Fuego en la cocina de %s! Llegan los bomberos y lo apagan. Se pierde un mueble." % a.nombre)
			publicar(a, "Hoy he conocido a los bomberos. No preguntéis. #cocina")
			for b in agentes:
				if b.get("carrera", "") == "bombero": b.rendimiento = minf(120, b.rendimiento + 20); registrar("%s apaga el fuego. ¡Héroe!" % b.nombre)
	if hora == 2:
		for a in agentes:
			if randf() < 0.03 and a.dinero > 50:
				if "alarma" in a.muebles: registrar("Un ladrón intenta entrar en casa de %s, pero salta la alarma. ¡Huye!" % a.nombre)
				else:
					var robo = floorf(a.dinero * 0.3); a.dinero -= robo
					registrar("¡Robo en casa de %s! Se llevan %d €. (Medio Murk vende alarmas.)" % [a.nombre, robo])
					for b in agentes: if b.get("carrera", "") == "policia": b.rendimiento += 15
	if randf() < 0.04 and agentes.size(): post_aleatorio(agentes[randi() % agentes.size()])

func _agente(id: String):
	for a in agentes: if a.id == id: return a
	return null

func _nombre_obj(id: String) -> String:
	for o in TIENDA: if o.id == id: return o.nombre
	return id

func cerrar_dia_extras() -> void:
	# Catálogo AKIA semanal: rebajas los domingos.
	rebajas_akia = dia % 7 == 0
	if rebajas_akia: registrar("¡Sale el nuevo catálogo de AKIA! Hoy, todo un 30% más barato.")
	for a in agentes:
		# Cumpleaños cada 12 días: fiesta.
		if (dia + hash(a.id)) % 12 == 0:
			a.edad += 1
			registrar("¡Cumpleaños de %s! %d años. Fiesta en el parque." % [a.nombre, a.edad])
			publicar(a, "¡%d tacos! Gracias por las felicitaciones." % a.edad)
			for b in agentes: b.necesidades.social = minf(100, b.necesidades.social + 25); b.moral = minf(100, b.moral + 4)
		# Pareja y boda.
		for b in agentes:
			if b == a or a.pareja != "" or b.pareja != "": continue
			if a.amistades.get(b.id, 0) >= 90 and b.amistades.get(a.id, 0) >= 90 and randf() < 0.3:
				a.pareja = b.id; b.pareja = a.id
				registrar("%s y %s empiezan a salir." % [a.nombre, b.nombre])
				publicar(a, "Oficialmente con %s." % b.nombre)
		if a.pareja != "" and not a.casado and a.dinero > 300 and randf() < 0.1:
			var p = _agente(a.pareja)
			if p:
				a.casado = true; p.casado = true; a.dinero -= 300
				registrar("¡Boda de %s y %s en el parque! Todo el pueblo invitado." % [a.nombre, p.nombre])
				publicar(a, "¡Nos hemos casado!")
				for b in agentes: b.moral = minf(100, b.moral + 10); b.necesidades.social = 100
		if a.get("carrera", "programador") != "programador": a.dinero += sueldo_de(a)


func _hay_edificio(tipo: String) -> bool:
	return pueblo.edificios.any(func(e): return e.tipo == tipo and e.progreso >= 100)

func _hay_lugar(lugar: String) -> bool:
	return pueblo.edificios.any(func(e): return e.progreso >= 100 and tipo_edificio(e.tipo).get("lugar", "") == lugar)

## Nivel del pueblo segun lo que ha crecido.
func nivel_ciudad() -> String:
	var n: int = pueblo.edificios.size()
	return "Metrópolis" if n >= 35 else ("Ciudad" if n >= 20 else ("Villa" if n >= 12 else "Pueblo"))

## Modo decorar: coloca un mueble montado en una casilla de su casa (4x4).
func decorar(a: Dictionary, celda: int, mueble: String) -> void:
	if mueble == "": a.deco.erase(str(celda))
	elif mueble in a.muebles:
		for k in a.deco.keys(): if a.deco[k] == mueble: a.deco.erase(k)
		a.deco[str(celda)] = mueble
	cambiado.emit()

func modelo_de(item: String) -> String:
	for o in TIENDA: if o.id == item: return o.get("modelo", "")
	return ""


# ================================================================ DIVERSIDAD Y FAMILIAS
## Tonos de piel de muy claro a muy oscuro, colores de pelo naturales y teñidos.
const PIELES = ["#f6dcc8", "#eec4a3", "#e0ac83", "#c98e63", "#a8714a", "#8a5a3b", "#6b4429", "#4a2e1d", "#f1c9a5", "#d7a27c"]
const PELOS = ["#1b1b1b", "#3b2414", "#6b4423", "#a8743f", "#e2c27a", "#b5452b", "#d9d9d9", "#5a3a8c", "#2a6fdb", "#e86aa8"]
## Nombres de muchas regiones del mundo.
const NOMBRES = ["Lucía", "Hugo", "Aisha", "Mateo", "Yuki", "Kwame", "Sofía", "Arjun", "Fatima", "Liam", "Mei", "Omar", "Valentina", "Kenji", "Amara",
	"Diego", "Priya", "Noah", "Leilani", "Iker", "Zainab", "Chen", "Nia", "Mikel", "Ana", "Tariq", "Ingrid", "Kofi", "Inés", "Ravi", "Daniela",
	"Aiyana", "Nikolai", "Hana", "Santiago", "Ayesha", "Tomás", "Esi", "Lars", "Mariam", "Pablo", "Sun-hee", "Thiago", "Amina", "Joaquín", "Saoirse"]
const APELLIDOS = ["García", "Okafor", "Nakamura", "Haddad", "Fernández", "Kowalski", "Nguyen", "Mensah", "Romero", "Singh", "Larsen", "Mahmoud",
	"Silva", "Kim", "Etxeberria", "Moreno", "Chukwu", "Rossi", "Herrera", "Yilmaz", "Begum", "Ortega", "Takahashi", "Diallo"]
## Ceremonias (cada familia puede tener o no una tradicion; todas se celebran con respeto).
const TRADICIONES = {
	"": {"bebe": "fiesta de bienvenida", "joven": ""},
	"cristiana": {"bebe": "bautizo", "joven": "primera comunión"},
	"judia": {"bebe": "fiesta de nombre", "joven": "bar/bat mitzvá"},
	"musulmana": {"bebe": "aqiqah", "joven": ""},
	"hindu": {"bebe": "namakarana", "joven": ""},
	"latina": {"bebe": "bautizo", "joven": "quinceañera"},
	"laica": {"bebe": "fiesta de bienvenida", "joven": "fiesta de mayoría de edad"},
}

func _nombre_nuevo() -> String:
	var usados = agentes.map(func(x): return x.nombre)
	for i in 40:
		var n: String = NOMBRES[randi() % NOMBRES.size()]
		if not n in usados: return n
	return NOMBRES[randi() % NOMBRES.size()] + " " + str(randi() % 90)

## La IA crea una familia diversa al azar (cualquier combinacion: pareja de
## cualquier genero, monoparental, con o sin hijos, adoptivos, abuelos...).
func crear_familia(llegada := false) -> Array:
	var ape: String = APELLIDOS[randi() % APELLIDOS.size()]
	var trad: String = TRADICIONES.keys()[randi() % TRADICIONES.size()]
	var fid = "f%d_%d" % [dia, randi() % 9999]
	var adultos = 1 + int(randf() < 0.65)
	var miembros = []
	for i in adultos:
		var id = "s%d%d" % [Time.get_ticks_usec() % 100000, randi() % 999]
		miembros.append(crear_agente({"id": id, "nombre": _nombre_nuevo() + " " + ape, "puesto": "vecino", "color": Color.from_hsv(randf(), 0.6, 0.85),
			"edad": 22 + randi() % 45, "familia": fid, "tradicion": trad, "carrera": CARRERAS.keys()[randi() % CARRERAS.size()]}))
	if adultos == 2:
		miembros[0].pareja = miembros[1].id; miembros[1].pareja = miembros[0].id
		miembros[0].casado = randf() < 0.6; miembros[1].casado = miembros[0].casado
		miembros[0].amistades[miembros[1].id] = 95.0; miembros[1].amistades[miembros[0].id] = 95.0
	for i in randi() % 3:
		var hijo = crear_agente({"id": "s%d%d" % [Time.get_ticks_usec() % 100000, randi() % 999], "nombre": _nombre_nuevo() + " " + ape, "puesto": "peque",
			"color": Color.from_hsv(randf(), 0.6, 0.9), "edad": 3 + randi() % 14, "familia": fid, "tradicion": trad, "carrera": "parado",
			"padres": miembros.slice(0, adultos).map(func(x): return x.id)})
		for m in miembros.slice(0, adultos): m.hijos.append(hijo.id)
		miembros.append(hijo)
	for m in miembros: m.dinero = 300.0; agentes.append(m)
	if llegada: registrar("Llega al pueblo la familia %s (%d miembros). ¡Bienvenidos!" % [ape, miembros.size()])
	return miembros

func es_nino(a: Dictionary) -> bool: return a.get("edad", 30) < 18

func cerrar_dia_familias() -> void:
	# Recien llegados cada ~10 dias mientras haya casas (tope para que vaya fluido).
	if dia % 10 == 0 and agentes.size() < 24: crear_familia(true)
	for a in agentes.duplicate():
		if es_nino(a) and a.padres.size():   # paga semanal de la familia
			var pa = _agente(a.padres[0])
			if pa and pa.dinero > 20: pa.dinero -= 10; a.dinero += 10
		if es_nino(a) and a.edad in [7, 8] and (dia + hash(a.id)) % 12 == 0:
			var c = TRADICIONES.get(a.tradicion, TRADICIONES[""]).joven
			if c != "": registrar("Hoy %s celebra su %s con la familia y amigos." % [a.nombre, c])
		if es_nino(a) and a.edad == 15 and a.tradicion == "latina" and (dia + hash(a.id)) % 12 == 0:
			registrar("¡Quinceañera de %s! Baile en el parque." % a.nombre)
		# Bebes (o adopcion) en parejas estables, sin importar el genero.
		if a.pareja != "" and a.edad < 45 and randf() < 0.015 and agentes.size() < 24:
			var p = _agente(a.pareja)
			if p and a.id < p.id:
				var adopta = randf() < 0.3
				var bebe = crear_agente({"id": "s%d%d" % [Time.get_ticks_usec() % 100000, randi() % 999], "nombre": _nombre_nuevo() + ((" " + a.nombre.get_slice(" ", 1)) if " " in a.nombre else ""),
					"puesto": "peque", "color": Color.from_hsv(randf(), 0.5, 0.95), "edad": 0 if not adopta else 2 + randi() % 6, "familia": a.familia,
					"tradicion": a.tradicion, "carrera": "parado", "padres": [a.id, p.id],
					"piel": a.piel if randf() < 0.5 or adopta else p.piel})
				a.hijos.append(bebe.id); p.hijos.append(bebe.id); agentes.append(bebe)
				if adopta: registrar("%s y %s adoptan a %s. ¡Familia más grande!" % [a.nombre, p.nombre, bebe.nombre])
				else:
					registrar("¡%s y %s dan la bienvenida a %s!" % [a.nombre, p.nombre, bebe.nombre])
					var cer = TRADICIONES.get(a.tradicion, TRADICIONES[""]).bebe
					registrar("La familia organiza un/a %s para %s." % [cer, bebe.nombre])
				publicar(a, "Os presentamos a %s ❤" % bebe.nombre.get_slice(" ", 0))

func arbol_familiar(a: Dictionary) -> String:
	var n = func(ids): return ", ".join(ids.map(func(i): var x = _agente(i); return x.nombre if x else "?"))
	var t = []
	if a.padres.size(): t.append("Padres/madres: " + n.call(a.padres))
	if a.pareja != "": var p = _agente(a.pareja); if p: t.append(("Cónyuge: " if a.casado else "Pareja: ") + p.nombre)
	if a.hijos.size(): t.append("Hijos/as: " + n.call(a.hijos))
	return " · ".join(t) if t.size() else "Sin familia en el pueblo"

# ================================================================ TIEMPO METEOROLOGICO
## Dura horas o dias de juego; la estacion lo sesga. Hay prevision de 3 dias.
var clima = {"tipo": "despejado", "horas": 24, "nieve": 0.0, "charcos": 0.0, "prevision": []}
const CLIMAS = ["despejado", "nublado", "lluvia", "tormenta", "nieve", "niebla", "calor", "granizo"]
const PESOS_ESTACION = {
	"primavera": [4, 3, 3, 1, 0, 1, 0, 0.3], "verano": [6, 1, 1, 1, 0, 0, 3, 0.3],
	"otoño": [3, 3, 3, 1, 0, 2, 0, 0.3], "invierno": [2, 3, 2, 0.5, 3, 2, 0, 0.5]}

func estacion(d: int = -1) -> String:
	if d < 0: d = dia
	return ["primavera", "verano", "otoño", "invierno"][int((d - 1) / 7) % 4]

func _sortear_clima(d: int) -> Dictionary:
	var w = PESOS_ESTACION[estacion(d)]; var tot = 0.0
	for x in w: tot += x
	var r = randf() * tot
	for i in CLIMAS.size():
		r -= w[i]
		if r <= 0: return {"tipo": CLIMAS[i], "horas": 6 + randi() % 42}
	return {"tipo": "despejado", "horas": 24}

func tick_clima() -> void:
	if clima.prevision.is_empty():
		for i in 3: clima.prevision.append(_sortear_clima(dia + i))
	clima.horas -= 1
	if clima.horas <= 0:
		var sig = clima.prevision.pop_front(); clima.prevision.append(_sortear_clima(dia + 3))
		clima.tipo = sig.tipo; clima.horas = sig.horas
		registrar("El tiempo cambia: %s." % clima.tipo)
	# Nieve que cuaja y se derrite poco a poco; charcos que se secan.
	clima.nieve = clampf(clima.nieve + (0.06 if clima.tipo == "nieve" else (-0.02 if clima.tipo != "calor" else -0.08)), 0, 1)
	clima.charcos = clampf(clima.charcos + (0.15 if clima.tipo in ["lluvia", "tormenta", "granizo"] else -0.04), 0, 1)
	var fuera = ["parque", "trabajo", "calle", "akia", "tienda", "super"]
	for a in agentes:
		var n = a.necesidades
		var en_calle = a.lugar in fuera
		match clima.tipo:
			"lluvia", "tormenta", "granizo":
				if en_calle and not a.paraguas:
					n.higiene = maxf(0, n.higiene - 3); a.moral = maxf(0, a.moral - 1)
					if randf() < 0.01: _enfermar(a, "un resfriado por mojarse")
				if a.dinero > 15 and not a.paraguas and randf() < 0.05: a.paraguas = true; a.dinero -= 12; registrar("%s se compra un paraguas." % a.nombre)
			"nieve":
				if en_calle and not a.abrigo and randf() < 0.01: _enfermar(a, "un catarro por el frío")
				if a.dinero > 50 and not a.abrigo and randf() < 0.05: a.abrigo = true; a.dinero -= 40; registrar("%s estrena abrigo." % a.nombre)
				if a.lugar == "parque" and clima.nieve > 0.4 and randf() < 0.1:
					n.diversion = minf(100, n.diversion + 25); registrar("%s hace un muñeco de nieve en el parque." % a.nombre)
			"calor":
				n.higiene = maxf(0, n.higiene - 1.5); n.sueno = maxf(0, n.sueno - 0.5)
			"despejado":
				if a.lugar == "parque": a.moral = minf(100, a.moral + 0.5)
		if a.enfermo > 0 and hora == 0: a.enfermo -= 1; if a.enfermo == 0: registrar("%s ya se ha recuperado." % a.nombre)

func _enfermar(a: Dictionary, causa: String) -> void:
	if a.enfermo > 0: return
	a.enfermo = 2 + randi() % 2; a.moral = maxf(0, a.moral - 10)
	registrar("%s pilla %s y se queda en casa." % [a.nombre, causa])
	for b in agentes: if b.get("carrera", "") == "medico": b.rendimiento = minf(120, b.rendimiento + 10)

func quiere_quedarse_en_casa(a: Dictionary) -> bool:
	return a.enfermo > 0 or (clima.tipo in ["tormenta", "granizo"] and not "aventurero" in a.rasgos)
