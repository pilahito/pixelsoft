extends Node
## Simulacion de PixelSoft (port a GDScript de public/js/motor/*.js).
## Necesidades tipo Sims, empresa, pueblo que construyen las IAs, guardado.

signal cambiado
signal suceso(texto: String)

const VERSION = "2.0.0"
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
}
var TIENDA: Array = [
	{"id": "comida", "nombre": "Comida (3 raciones)", "precio": 15, "tipo": "consumible", "cantidad": 3, "cat": "Comida"},
	{"id": "cama", "nombre": "Cama buena", "precio": 180, "tipo": "mueble", "bono": {"sueno": 1.4}, "cat": "Dormitorio"},
	{"id": "consola", "nombre": "Consola", "precio": 250, "tipo": "mueble", "bono": {"diversion": 1.4}, "cat": "Ocio"},
	{"id": "ducha", "nombre": "Ducha de lluvia", "precio": 140, "tipo": "mueble", "bono": {"higiene": 1.3}, "cat": "Baño"},
	{"id": "cocina", "nombre": "Cocina moderna", "precio": 300, "tipo": "mueble", "bono": {"hambre": 1.3}, "cat": "Cocina"},
	{"id": "planta", "nombre": "Planta", "precio": 25, "tipo": "mueble", "bono": {"diversion": 1.05}, "cat": "Decoración"},
	{"id": "ropa", "nombre": "Ropa nueva", "precio": 60, "tipo": "ropa", "moral": 8, "cat": "Ropa"},
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
	{"id": "fuente", "nombre": "Fuente", "w": 2, "h": 2, "coste": 80, "decoracion": true},
	{"id": "arbol", "nombre": "Árboles", "w": 1, "h": 1, "coste": 20, "decoracion": true},
]
const NOMBRES_PUEBLO = ["Villabit", "Pixelandia", "Tokenburgo", "San Prompt", "Villacontexto", "Puerto Kernel", "Valdebyte"]
const MOTIVOS = {"sueno": "Necesitamos más casas, que dormimos fatal.", "hambre": "Un super más cerca y comemos mejor.",
	"social": "Una cafetería para quedar con gente.", "diversion": "Algo para desconectar al salir del curro.",
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
		"habilidades": {"programar": 1, "carisma": 1, "cocina": 1, "forma": 1}, "xp": {"programar": 0, "carisma": 0, "cocina": 0, "forma": 0}}

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
	if es_laboral():
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
			a.lugar = "oficina"; n.diversion -= 1; ganar_xp(a, "programar")
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
	for a in agentes: if a.actividad == "trabajar": trabajando += 1
	var precio_base: float = 18 + e.calidad * 0.35
	var factor = clampf(1 - (e.precio / precio_base - 1) * 0.6, 0.15, 1.35)
	var objetivo: float = (6 + e.reputacion * 0.25) * factor * (0.5 + e.calidad / 100.0)
	e.clientes += (objetivo - e.clientes) * 0.05
	e.dinero += e.clientes * e.precio * 0.11 * (e.calidad / 70.0) * (0.5 + 0.5 * trabajando / max(1, agentes.size()))
	e.calidad = clampf(e.calidad + trabajando * 0.05 - 0.02, 0, 100)

func cerrar_dia() -> void:
	var coste: float = agentes.size() * empresa.salario + empresa.alquiler
	empresa.dinero -= coste
	for a in agentes: a.dinero += maxf(25.0, empresa.salario) - (8.0 if a.casa == "" else 0.0)
	registrar("Fin del día %d: nóminas y alquiler -%d EUR. Caja: %d EUR." % [dia - 1, coste, empresa.dinero])
	cerrar_dia_pueblo()
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
			var pone = floorf(maxf(0, a.dinero - 30) * 0.1)
			a.dinero -= pone; obra.fondos += pone
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
	for t in TIPOS_EDIFICIO:
		if t.has("rasgo") and t.rasgo in a.rasgos and randf() < 0.5 and not pueblo.edificios.any(func(e): return e.tipo == t.id):
			return [t, MOTIVOS[t.necesidad]]
	var peor = "hambre"
	for k in NECESIDADES: if a.necesidades[k] < a.necesidades[peor]: peor = k
	var ops = TIPOS_EDIFICIO.filter(func(t): return t.get("necesidad", "") == peor and not t.get("unico", false))
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
		if agente.dinero < o.precio: return "%s no tiene %d EUR." % [agente.nombre, o.precio]
		if o.tipo == "mueble":
			if item_id in agente.muebles: return "Ya lo tiene."
			agente.muebles.append(item_id)
		elif o.tipo == "consumible": agente.inventario[item_id] = agente.inventario.get(item_id, 0) + o.cantidad
		else: agente.moral = minf(100, agente.moral + o.get("moral", 0))
		agente.dinero -= o.precio
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
	return {"v": 2, "dia": dia, "hora": hora, "tick": tick, "empresa": empresa, "agentes": agentes, "pueblo": pueblo, "sucesos": sucesos.slice(-50)}

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
	empresa = d.empresa; agentes = d.agentes; pueblo = d.pueblo; sucesos = d.get("sucesos", [])
	return true

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		guardar()
