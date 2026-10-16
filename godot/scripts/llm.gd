extends Node
## Cliente de LM Studio / llama-server (API OpenAI). PC o por la wifi.
## Si no responde, el juego sigue con frases escritas (modo demo).

const CONFIG = "user://ajustes.cfg"
var url = "http://127.0.0.1:1234"
var modelo = ""
var conectado = false
var ultimo_error = ""
var _ocupado = false
signal estado_cambiado

func _ready() -> void:
	var c = ConfigFile.new()
	if c.load(CONFIG) == OK:
		url = c.get_value("llm", "url", url); modelo = c.get_value("llm", "modelo", "")
	probar()

func guardar_ajustes() -> void:
	var c = ConfigFile.new(); c.load(CONFIG)
	c.set_value("llm", "url", url); c.set_value("llm", "modelo", modelo); c.save(CONFIG)

func normalizar(u: String) -> String:
	u = u.strip_edges().trim_suffix("/").trim_suffix("/v1")
	if not u.begins_with("http"): u = "http://" + u
	if u.count(":") < 2: u += ":1234"
	return u

## Comprueba la conexion y lista modelos (timeout corto).
func probar(nueva_url := "") -> void:
	if nueva_url != "": url = normalizar(nueva_url); guardar_ajustes()
	var r = HTTPRequest.new(); r.timeout = 6; add_child(r)
	r.request_completed.connect(func(res, code, _h, body):
		r.queue_free()
		conectado = false
		if res != OK or code != 200:
			ultimo_error = "No hay LM Studio en %s. Activa el servidor (y «Serve on Local Network» si es otro equipo)." % url
		else:
			var j = JSON.parse_string(body.get_string_from_utf8())
			var lista: Array = []
			if typeof(j) == TYPE_DICTIONARY:
				for m in j.get("data", []):
					if not ("embed" in str(m.get("id", ""))): lista.append(m.id)
			if lista.is_empty(): ultimo_error = "Conecta, pero no hay modelos de chat cargados."
			else:
				conectado = true; ultimo_error = ""
				if modelo == "" or not (modelo in lista): modelo = lista[0]
		estado_cambiado.emit())
	if r.request(url + "/v1/models") != OK:
		r.queue_free(); ultimo_error = "URL no válida."; estado_cambiado.emit()

## Pide una frase corta; si falla, llama a con_respuesta con el texto de reserva.
func frase(sistema: String, pregunta: String, reserva: String, con_respuesta: Callable) -> void:
	# 1) IA en el dispositivo (por defecto en movil, sin servidores).
	if MotorIA.backend == "local" and MotorIA.descargado(MotorIA.modelo) and MotorIA.hay_llama():
		if _ocupado: con_respuesta.call(reserva); return
		_ocupado = true
		MotorIA.generar_async(sistema, pregunta, func(t):
			_ocupado = false
			con_respuesta.call(t if t != "" else reserva))
		return
	if not conectado or _ocupado:
		con_respuesta.call(reserva); return
	_ocupado = true
	var r = HTTPRequest.new(); r.timeout = 60; add_child(r)
	r.request_completed.connect(func(res, code, _h, body):
		r.queue_free(); _ocupado = false
		var texto = reserva
		if res == OK and code == 200:
			var j = JSON.parse_string(body.get_string_from_utf8())
			if typeof(j) == TYPE_DICTIONARY and j.has("choices"):
				texto = str(j.choices[0].message.get("content", reserva)).strip_edges()
		elif res != OK:
			conectado = false; estado_cambiado.emit()
		con_respuesta.call(texto.substr(0, 220)))
	var cuerpo = {"model": modelo, "temperature": 0.8, "max_tokens": 80, "messages": [
		{"role": "system", "content": sistema}, {"role": "user", "content": pregunta}]}
	r.request(url + "/v1/chat/completions", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(cuerpo))

func explicar_propuesta(autor: Dictionary, que: String, motivo: String) -> void:
	frase("Eres %s, %s de PixelSoft. Rasgos: %s. Hablas en español de España, una sola frase." % [autor.nombre, autor.puesto, ", ".join(autor.rasgos)],
		"Convence a tus compañeros de construir «%s» en el pueblo. Motivo: %s" % [que, motivo], "",
		func(t): if t != "": Juego.registrar("%s: «%s»" % [autor.nombre, t]))

## Charla entre dos empleados: la IA escribe la frase y la amistad sube (o baja).
func charla(a: Dictionary, b: Dictionary) -> void:
	frase("Eres %s (%s). Rasgos: %s. Responde con UNA frase amable o borde a tu compañero, en español de España." % [a.nombre, a.puesto, ", ".join(a.rasgos)],
		"Te encuentras con %s en %s. ¿Qué le dices?" % [b.nombre, a.lugar], "¡Hombre, %s! ¿Qué tal?" % b.nombre,
		func(t):
			var borde = t.to_lower().contains("déjame") or t.to_lower().contains("pesad")
			Juego.subir_amistad(a, b, -4.0 if borde else 5.0)
			Juego.registrar("%s → %s: «%s»" % [a.nombre, b.nombre, t]))
