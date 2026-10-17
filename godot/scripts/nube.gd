extends Node
## Guardado en la nube con la cuenta de Google del jugador (autoload "Nube").
##
## - La partida se guarda en Google Drive, en la carpeta OCULTA de la app
##   (appDataFolder, scope drive.appdata): PixelSoft no ve el resto del Drive y
##   el jugador no ve ese archivo en drive.google.com.
## - PC: OAuth 2.0 para apps instaladas con PKCE (navegador del sistema +
##   redireccion a 127.0.0.1 con puerto aleatorio).
## - Android (y PC si no hay cliente de escritorio): flujo de "dispositivo"
##   (google.com/device + codigo), que funciona sin SDK nativo ni plugin.
## - Los client id NO estan en el repo: se leen de res://config_local/google_oauth.json
##   (inyectado al exportar con tools/nube/exportar-con-google.ps1) o de
##   user://google_oauth.json. Si no hay ninguno, la opcion no aparece en Ajustes.
## - El refresh token se guarda cifrado en user:// (clave ligada al dispositivo).
## - Sin conexion no se pierde nada: se compara el hash de la partida con el de la
##   ultima copia sincronizada y se reintenta cada minuto y al volver a la app.
## - La version publica y la privada usan archivos distintos en la nube.

signal estado_cambiado
signal conflicto(local: Dictionary, nube: Dictionary)
signal partida_descargada
signal url_autorizacion(url: String)
signal codigo_dispositivo(url: String, codigo: String)

const SCOPE = "https://www.googleapis.com/auth/drive.appdata"
const RUTAS_CONFIG = ["res://config_local/google_oauth.json", "user://google_oauth.json"]

# Endpoints (variables para poder apuntar a un servidor falso en las pruebas).
var URL_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
var URL_TOKEN = "https://oauth2.googleapis.com/token"
var URL_DEVICE = "https://oauth2.googleapis.com/device/code"
var URL_REVOKE = "https://oauth2.googleapis.com/revoke"
var URL_API = "https://www.googleapis.com/drive/v3"
var URL_UPLOAD = "https://www.googleapis.com/upload/drive/v3"

var variante := "privado" if OS.has_feature("privado") else "publica"
var ruta_partida := "user://partida.json"
var ruta_token := ""
var ruta_estado := ""
var modo_prueba := false        # pruebas: no abre el navegador ni recarga la escena
var forzar_tipo := ""           # pruebas: "escritorio" o "dispositivo"
var reintento_s := 60.0
var espera_guardado_s := 3.0
var tiempo_max_http := 25.0

var config := {}
var estado_texto := ""
var ocupado := false
var login_activo := false
var login_tipo := ""
var login_url := ""
var login_codigo := ""
var login_url_codigo := ""
var conflicto_pendiente := {}
var ultima_info_nube := {}

var _token := {}
var _estado := ConfigFile.new()
var _otra_vez := false
var _motivo_otra := ""
var _servidor: TCPServer
var _clientes: Array = []
var _verificador := ""
var _state := ""
var _redirect := ""
var _login_caduca := 0.0
var _t_reintento: Timer
var _t_guardado: Timer
var _saliendo := false
var _fallo_reciente := false

# ------------------------------------------------------------------ arranque
func _ready() -> void:
	if ruta_token == "": configurar_rutas("user://")
	_cargar_config()
	_t_reintento = Timer.new(); _t_reintento.one_shot = true; add_child(_t_reintento)
	_t_reintento.timeout.connect(func(): if conectado() and not ocupado: sincronizar("reintento"))
	_t_guardado = Timer.new(); _t_guardado.one_shot = true; add_child(_t_guardado)
	_t_guardado.timeout.connect(func(): if conectado() and auto(): sincronizar("guardar"))
	if modo_prueba: return
	var j = get_node_or_null("/root/Juego")
	if j and j.has_signal("guardado"): j.guardado.connect(_al_guardar)
	if not OS.has_feature("mobile") and conectado(): get_tree().set_auto_accept_quit(false)
	if conectado() and auto():
		await get_tree().create_timer(1.5).timeout
		sincronizar("abrir")

## Archivos locales de la nube (token cifrado y estado), separados por variante.
func configurar_rutas(prefijo: String) -> void:
	var suf = "" if variante == "publica" else "_" + variante
	ruta_token = prefijo + "nube_token%s.dat" % suf
	ruta_estado = prefijo + "nube_estado%s.cfg" % suf
	_estado = ConfigFile.new(); _estado.load(ruta_estado)
	_cargar_token()

func nombre_remoto() -> String:
	return "pixelsoft_partida.json" if variante == "publica" else "pixelsoft_%s_partida.json" % variante

func _cargar_config() -> void:
	if not config.is_empty(): return
	for r in RUTAS_CONFIG:
		if FileAccess.file_exists(r):
			var d = _json(FileAccess.get_file_as_string(r))
			if d is Dictionary: config = d; return

func _cliente_ok(tipo: String) -> bool:
	var c = config.get(tipo, {})
	return c is Dictionary and str(c.get("client_id", "")) != "" and not str(c.get("client_id", "")).begins_with("TU_")

## "escritorio" (PC, loopback + PKCE), "dispositivo" (Android) o "" si no hay credenciales.
func tipo_cliente() -> String:
	if forzar_tipo != "": return forzar_tipo if _cliente_ok(forzar_tipo) else ""
	if not OS.has_feature("mobile") and _cliente_ok("escritorio"): return "escritorio"
	if _cliente_ok("dispositivo"): return "dispositivo"
	return ""

func disponible() -> bool: return tipo_cliente() != ""
func conectado() -> bool: return str(_token.get("refresh_token", "")) != ""
func cuenta() -> String: return str(_token.get("cuenta", ""))
func auto() -> bool: return _estado.get_value("s", "auto", true)
func poner_auto(si: bool) -> void: _est({"auto": si}); estado_cambiado.emit()
func ultima_copia() -> int: return int(_estado.get_value("s", "ultima_copia", 0))
func pendiente() -> bool: return _estado.get_value("s", "pendiente", false)

func _notification(what: int) -> void:
	if modo_prueba: return
	if what == NOTIFICATION_APPLICATION_RESUMED or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		if conectado() and auto() and pendiente() and not ocupado: sincronizar("reanudar")
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		_salir()

## Al cerrar la ventana en PC: intenta subir la ultima partida (maximo 8 s).
func _salir() -> void:
	if _saliendo: return
	_saliendo = true
	if conectado() and auto():
		get_tree().create_timer(8.0).timeout.connect(func(): get_tree().quit())
		_poner_estado("Subiendo la partida antes de salir…")
		await sincronizar("cerrar")
	get_tree().quit()

func _al_guardar() -> void:
	_est({"pendiente": true})
	if conectado() and auto(): _t_guardado.start(espera_guardado_s)

# ------------------------------------------------------------------ utilidades
func _json(t: String):
	var j = JSON.new()
	return j.data if j.parse(t) == OK else null

func _md5(b: PackedByteArray) -> String:
	if b.is_empty(): return ""
	var h = HashingContext.new(); h.start(HashingContext.HASH_MD5); h.update(b)
	return h.finish().hex_encode()

func _md5_local() -> String:
	return _md5(FileAccess.get_file_as_bytes(ruta_partida)) if FileAccess.file_exists(ruta_partida) else ""

static func b64url(b: PackedByteArray) -> String:
	return Marshalls.raw_to_base64(b).replace("+", "-").replace("/", "_").replace("=", "")

static func reto_pkce(verificador: String) -> String:
	return b64url(verificador.sha256_buffer())

func _aleatorio(n: int) -> String:
	return b64url(Crypto.new().generate_random_bytes(n))

func _form(d: Dictionary) -> PackedByteArray:
	var p := PackedStringArray()
	for k in d: p.append("%s=%s" % [k, str(d[k]).uri_encode()])
	return "&".join(p).to_utf8_buffer()

func _query(q: String) -> Dictionary:
	var r := {}
	for par in q.split("&", false):
		var i = par.find("=")
		if i < 0: r[par.uri_decode()] = ""
		else: r[par.substr(0, i).uri_decode()] = par.substr(i + 1).replace("+", " ").uri_decode()
	return r

func _est(d: Dictionary) -> void:
	for k in d: _estado.set_value("s", k, d[k])
	_estado.save(ruta_estado)

func _poner_estado(t: String) -> void:
	estado_texto = t; estado_cambiado.emit()

func _dispositivo() -> String:
	if OS.get_name() == "Android": return ("Android · " + OS.get_model_name()).substr(0, 40)
	return "PC (%s)" % OS.get_name()

## Fecha legible en la hora local del sistema.
static func texto_fecha(unix: int) -> String:
	if unix <= 0: return "—"
	var bias = int(Time.get_time_zone_from_system().get("bias", 0))
	var d = Time.get_datetime_dict_from_unix_time(unix + bias * 60)
	return "%02d/%02d/%04d %02d:%02d" % [d.day, d.month, d.year, d.hour, d.minute]

## Peticion HTTP. red=true si es un fallo de conexion o del servidor (se reintenta).
func _http(metodo: int, url: String, cab := PackedStringArray(), cuerpo := PackedByteArray()) -> Dictionary:
	var h := HTTPRequest.new()
	h.timeout = tiempo_max_http
	add_child(h)
	var err = h.request_raw(url, cab, metodo, cuerpo)
	if err != OK:
		h.queue_free()
		return {"ok": false, "red": true, "codigo": 0, "cuerpo": PackedByteArray(), "json": null}
	var r = await h.request_completed
	h.queue_free()
	var res: int = r[0]; var codigo: int = r[1]; var b: PackedByteArray = r[3]
	var j = null
	if b.size() > 0 and b.size() < 4_000_000 and (b[0] == 123 or b[0] == 91): j = _json(b.get_string_from_utf8())
	var ok = res == HTTPRequest.RESULT_SUCCESS and codigo >= 200 and codigo < 300
	return {"ok": ok, "red": res != HTTPRequest.RESULT_SUCCESS or codigo >= 500 or codigo == 429 or codigo == 0,
		"codigo": codigo, "cuerpo": b, "json": j}

func _post_form(url: String, d: Dictionary) -> Dictionary:
	return await _http(HTTPClient.METHOD_POST, url, PackedStringArray(["Content-Type: application/x-www-form-urlencoded"]), _form(d))

# ------------------------------------------------------------------ token cifrado
func _clave() -> String:
	return (OS.get_unique_id() + "|pixelsoft-nube-v1|" + variante).sha256_text()

func _cargar_token() -> void:
	_token = {}
	if not FileAccess.file_exists(ruta_token): return
	var f = FileAccess.open_encrypted_with_pass(ruta_token, FileAccess.READ, _clave())
	if f == null: return
	var d = _json(f.get_as_text()); f.close()
	if d is Dictionary: _token = d

func _guardar_token() -> void:
	var guardar = {"refresh_token": _token.get("refresh_token", ""), "tipo": _token.get("tipo", ""), "cuenta": _token.get("cuenta", "")}
	var f = FileAccess.open_encrypted_with_pass(ruta_token, FileAccess.WRITE, _clave())
	if f == null: return
	f.store_string(JSON.stringify(guardar)); f.close()

func _cliente(tipo: String) -> Dictionary:
	var c = config.get(tipo, {})
	return c if c is Dictionary else {}

## "" si hay token de acceso valido; "red" si no se pudo renovar por la red; "sesion" si Google la ha revocado.
func _token_valido() -> String:
	if str(_token.get("access_token", "")) != "" and Time.get_unix_time_from_system() < float(_token.get("caduca", 0)) - 30: return ""
	var c = _cliente(str(_token.get("tipo", "")))
	var d = {"client_id": c.get("client_id", ""), "refresh_token": _token.get("refresh_token", ""), "grant_type": "refresh_token"}
	if str(c.get("client_secret", "")) != "": d["client_secret"] = c.client_secret
	var r = await _post_form(URL_TOKEN, d)
	if r.ok and r.json is Dictionary and r.json.has("access_token"):
		_token["access_token"] = r.json.access_token
		_token["caduca"] = Time.get_unix_time_from_system() + float(r.json.get("expires_in", 3600))
		return ""
	if not r.red and r.json is Dictionary and str(r.json.get("error", "")) in ["invalid_grant", "invalid_client", "unauthorized_client"]:
		_cerrar_local()
		_poner_estado("Tu sesión de Google ha caducado o se ha retirado el permiso. Vuelve a iniciar sesión.")
		return "sesion"
	return "red"

func _api(metodo: int, url: String, cab := PackedStringArray(), cuerpo := PackedByteArray(), reintentar := true) -> Dictionary:
	var e = await _token_valido()
	if e != "": return {"ok": false, "red": e == "red", "sesion": e == "sesion", "codigo": 0, "json": null, "cuerpo": PackedByteArray()}
	var c2 := cab.duplicate(); c2.append("Authorization: Bearer " + str(_token.access_token))
	var r = await _http(metodo, url, c2, cuerpo)
	if r.codigo == 401 and reintentar:
		_token["access_token"] = ""
		return await _api(metodo, url, cab, cuerpo, false)
	return r

# ------------------------------------------------------------------ iniciar sesion
func iniciar_sesion() -> void:
	if login_activo or conectado(): return
	var tipo = tipo_cliente()
	if tipo == "": _poner_estado("Falta la configuración de Google (client id)."); return
	login_activo = true; login_tipo = tipo; login_url = ""; login_codigo = ""
	_login_caduca = Time.get_unix_time_from_system() + 600
	if tipo == "escritorio": _login_loopback()
	else: _login_dispositivo()

func cancelar_login() -> void:
	login_activo = false
	_parar_servidor()
	_poner_estado("Inicio de sesión cancelado.")

func _parar_servidor(cerrar_clientes := true) -> void:
	if _servidor: _servidor.stop(); _servidor = null
	if not cerrar_clientes: return
	for c in _clientes: c.peer.disconnect_from_host()
	_clientes.clear()

func _login_loopback() -> void:
	_servidor = TCPServer.new()
	var puerto := 0
	for _i in 25:
		var p = randi_range(49152, 65000)
		if _servidor.listen(p, "127.0.0.1") == OK: puerto = p; break
	if puerto == 0:
		_servidor = null; login_activo = false
		_poner_estado("No se pudo abrir el puerto local para el inicio de sesión."); return
	_redirect = "http://127.0.0.1:%d" % puerto
	_verificador = _aleatorio(48)
	_state = _aleatorio(18)
	var c = _cliente("escritorio")
	var q = {"client_id": c.client_id, "redirect_uri": _redirect, "response_type": "code", "scope": SCOPE,
		"code_challenge": reto_pkce(_verificador), "code_challenge_method": "S256", "state": _state}
	login_url = URL_AUTH + "?" + _form(q).get_string_from_utf8()
	_poner_estado("Se ha abierto el navegador: inicia sesión con Google y vuelve a PixelSoft.")
	url_autorizacion.emit(login_url)
	if not modo_prueba: OS.shell_open(login_url)

func abrir_enlace_login() -> void:
	if login_url != "": OS.shell_open(login_url)
	elif login_url_codigo != "": OS.shell_open(login_url_codigo)

func _process(_d: float) -> void:
	if login_activo and Time.get_unix_time_from_system() > _login_caduca:
		cancelar_login(); _poner_estado("El inicio de sesión ha caducado. Inténtalo de nuevo."); return
	while _servidor and _servidor.is_connection_available():
		_clientes.append({"peer": _servidor.take_connection(), "buf": PackedByteArray(), "t": Time.get_ticks_msec(), "hecho": false})
	for c in _clientes.duplicate():
		var peer: StreamPeerTCP = c.peer
		peer.poll()
		if c.hecho or Time.get_ticks_msec() - c.t > 15000 or peer.get_status() != StreamPeerTCP.STATUS_CONNECTED:
			if Time.get_ticks_msec() - c.t > 300 or peer.get_status() != StreamPeerTCP.STATUS_CONNECTED:
				peer.disconnect_from_host(); _clientes.erase(c)
			continue
		var n = peer.get_available_bytes()
		if n > 0: c.buf.append_array(peer.get_data(n)[1])
		var txt: String = c.buf.get_string_from_utf8()
		if txt.find("\r\n\r\n") < 0 and txt.find("\n\n") < 0: continue
		c.hecho = true; c.t = Time.get_ticks_msec()
		_atender(peer, txt.get_slice("\n", 0).strip_edges())

func _responder(peer: StreamPeerTCP, codigo: String, titulo: String, texto: String) -> void:
	var html = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>PixelSoft</title><meta name=\"viewport\" content=\"width=device-width\"></head>" + \
		"<body style=\"font-family:sans-serif;background:#09102a;color:#eef;text-align:center;padding:60px\"><h1>%s</h1><p>%s</p></body></html>" % [titulo, texto]
	var b = html.to_utf8_buffer()
	var cab = "HTTP/1.1 %s\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %d\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n" % [codigo, b.size()]
	peer.put_data(cab.to_utf8_buffer()); peer.put_data(b)

func _atender(peer: StreamPeerTCP, linea: String) -> void:
	# "GET /?state=...&code=... HTTP/1.1"
	var partes = linea.split(" ")
	var ruta = partes[1] if partes.size() > 1 else "/"
	var i = ruta.find("?")
	var q = _query(ruta.substr(i + 1)) if i >= 0 else {}
	if not q.has("code") and not q.has("error"):
		_responder(peer, "404 Not Found", "PixelSoft", ""); return
	if str(q.get("state", "")) != _state:
		_responder(peer, "400 Bad Request", "Algo no cuadra", "La respuesta no corresponde a este inicio de sesión. Vuelve a intentarlo desde PixelSoft.")
		return
	_parar_servidor(false)   # deja que la respuesta llegue al navegador
	if q.has("error"):
		_responder(peer, "200 OK", "Inicio de sesión cancelado", "Puedes cerrar esta pestaña.")
		login_activo = false; _poner_estado("No se concedió el permiso (%s)." % q.error); return
	_responder(peer, "200 OK", "¡Listo!", "Ya puedes cerrar esta pestaña y volver a PixelSoft.")
	_canjear_codigo(str(q.code))

func _canjear_codigo(code: String) -> void:
	var c = _cliente("escritorio")
	var d = {"code": code, "client_id": c.client_id, "redirect_uri": _redirect, "grant_type": "authorization_code", "code_verifier": _verificador}
	if str(c.get("client_secret", "")) != "": d["client_secret"] = c.client_secret
	_poner_estado("Conectando con Google…")
	var r = await _post_form(URL_TOKEN, d)
	login_activo = false
	if not (r.ok and r.json is Dictionary and r.json.has("refresh_token")):
		_poner_estado("Google no aceptó el inicio de sesión%s." % ("" if not r.json is Dictionary else " (" + str(r.json.get("error", r.codigo)) + ")"))
		return
	await _sesion_iniciada(r.json, "escritorio")

func _login_dispositivo() -> void:
	var c = _cliente("dispositivo")
	_poner_estado("Pidiendo un código a Google…")
	var r = await _post_form(URL_DEVICE, {"client_id": c.client_id, "scope": SCOPE})
	if not login_activo: return
	if not (r.ok and r.json is Dictionary and r.json.has("device_code")):
		login_activo = false
		_poner_estado("No se pudo pedir el código a Google%s." % (" (sin conexión)" if r.red else ""))
		return
	var dev: Dictionary = r.json
	login_codigo = str(dev.user_code)
	login_url_codigo = str(dev.get("verification_url", dev.get("verification_uri", "https://www.google.com/device")))
	var intervalo = maxf(1.0, float(dev.get("interval", 5)))
	_login_caduca = Time.get_unix_time_from_system() + float(dev.get("expires_in", 1800))
	_poner_estado("Abre %s e introduce el código %s." % [login_url_codigo, login_codigo])
	codigo_dispositivo.emit(login_url_codigo, login_codigo)
	while login_activo:
		await get_tree().create_timer(intervalo).timeout
		if not login_activo: return
		var d = {"client_id": c.client_id, "device_code": dev.device_code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code"}
		if str(c.get("client_secret", "")) != "": d["client_secret"] = c.client_secret
		var t = await _post_form(URL_TOKEN, d)
		if not login_activo: return
		if t.ok and t.json is Dictionary and t.json.has("refresh_token"):
			login_activo = false
			await _sesion_iniciada(t.json, "dispositivo"); return
		var e = str(t.json.get("error", "")) if t.json is Dictionary else ""
		if e == "authorization_pending" or t.red: continue
		if e == "slow_down": intervalo += 5.0; continue
		login_activo = false
		_poner_estado("No se concedió el permiso." if e == "access_denied" else "El código ha caducado o no es válido. Inténtalo de nuevo.")
		return

func _sesion_iniciada(j: Dictionary, tipo: String) -> void:
	_token = {"refresh_token": j.refresh_token, "access_token": j.get("access_token", ""), "tipo": tipo,
		"caduca": Time.get_unix_time_from_system() + float(j.get("expires_in", 3600)), "cuenta": ""}
	login_codigo = ""; login_url = ""; login_url_codigo = ""
	# Cuenta nueva: no se sabe que copia corresponde a la ultima sincronizacion.
	_est({"base": "", "id": "", "pendiente": true})
	_guardar_token()
	var a = await _api(HTTPClient.METHOD_GET, URL_API + "/about?fields=" + "user(emailAddress,displayName)".uri_encode())
	if a.ok and a.json is Dictionary and a.json.has("user"):
		_token["cuenta"] = str(a.json.user.get("emailAddress", a.json.user.get("displayName", "")))
		_guardar_token()
	if not OS.has_feature("mobile") and not modo_prueba: get_tree().set_auto_accept_quit(false)
	_poner_estado("Sesión iniciada.")
	await sincronizar("login")

func cerrar_sesion() -> void:
	login_activo = false
	_parar_servidor()
	var rt = str(_token.get("refresh_token", ""))
	_cerrar_local()
	if rt != "": await _post_form(URL_REVOKE, {"token": rt})
	_poner_estado("Sesión cerrada. Tu partida sigue en este dispositivo.")

func _cerrar_local() -> void:
	_token = {}
	if FileAccess.file_exists(ruta_token): DirAccess.remove_absolute(ProjectSettings.globalize_path(ruta_token) if ruta_token.begins_with("user://") else ruta_token)
	_est({"base": "", "id": "", "pendiente": false, "ultima_copia": 0})
	conflicto_pendiente = {}
	if not modo_prueba and is_inside_tree(): get_tree().set_auto_accept_quit(true)
	estado_cambiado.emit()

# ------------------------------------------------------------------ sincronizar
## Decision de 3 vias: hash local, hash de la ultima copia sincronizada (base) y
## hash de la nube. "nada", "subir", "bajar" o "conflicto".
static func decidir(local: String, base: String, nube: String) -> String:
	if local == nube: return "nada"
	if nube == "": return "subir"
	if local == "": return "bajar"
	if local == base: return "bajar"
	if nube == base: return "subir"
	return "conflicto"

func info_local() -> Dictionary:
	if not FileAccess.file_exists(ruta_partida): return {}
	var d = _json(FileAccess.get_file_as_string(ruta_partida))
	var r = {"fecha": FileAccess.get_modified_time(ruta_partida), "dispositivo": "Este dispositivo", "dia": 0, "hora": 0}
	if d is Dictionary: r.dia = int(d.get("dia", 0)); r.hora = int(d.get("hora", 0))
	return r

func _info_remota(a: Dictionary) -> Dictionary:
	if a.is_empty(): return {}
	var p = a.get("appProperties", {}); if not p is Dictionary: p = {}
	var fecha = int(p.get("guardado", 0))
	if fecha == 0 and a.has("modifiedTime"):
		fecha = int(Time.get_unix_time_from_datetime_string(str(a.modifiedTime).get_slice(".", 0).replace("Z", "")))
	return {"fecha": fecha, "dia": int(p.get("dia", 0)), "hora": int(p.get("hora", 0)), "dispositivo": str(p.get("dispositivo", "Otro dispositivo"))}

func _propiedades(datos: PackedByteArray) -> Dictionary:
	var d = _json(datos.get_string_from_utf8())
	var ver = str(ProjectSettings.get_setting("application/config/version", ""))
	var p = {"guardado": str(int(Time.get_unix_time_from_system())), "dispositivo": _dispositivo(), "version": ver, "variante": variante}
	if d is Dictionary: p["dia"] = str(int(d.get("dia", 0))); p["hora"] = str(int(d.get("hora", 0)))
	return p

## Busca la copia de esta variante en la carpeta oculta. {ok, archivo} (archivo = {} si no hay).
func _remoto() -> Dictionary:
	var q = "name = '%s' and trashed = false" % nombre_remoto()
	var url = URL_API + "/files?spaces=appDataFolder&pageSize=10&fields=" + "files(id,name,modifiedTime,md5Checksum,appProperties)".uri_encode() + "&q=" + q.uri_encode()
	var r = await _api(HTTPClient.METHOD_GET, url)
	if not r.ok: return r
	var fs = r.json.get("files", []) if r.json is Dictionary else []
	var a = {}
	for f in fs:   # si hubiera duplicados, la mas reciente
		if a.is_empty() or str(f.get("modifiedTime", "")) > str(a.get("modifiedTime", "")): a = f
	r["archivo"] = a
	ultima_info_nube = _info_remota(a)
	return r

## Sincroniza (espera a que termine). motivo: abrir, guardar, login, reintento, reanudar, cerrar...
func sincronizar(motivo := "") -> void:
	if not conectado(): return
	if ocupado:
		_otra_vez = true; _motivo_otra = motivo
		while ocupado: await get_tree().process_frame
		return
	ocupado = true
	_fallo_reciente = false
	_poner_estado("Sincronizando…")
	await _sincronizar_una(motivo)
	# Si ha fallado (sin red) no se repite aqui: ya hay un reintento programado.
	while _otra_vez and conectado() and not _fallo_reciente:
		_otra_vez = false
		await _sincronizar_una(_motivo_otra)
	_otra_vez = false
	ocupado = false
	estado_cambiado.emit()

func _sincronizar_una(motivo: String) -> void:
	var rr = await _remoto()
	if not rr.ok: _fallo(rr); return
	var arch: Dictionary = rr.archivo
	var lh = _md5_local()
	var rh = str(arch.get("md5Checksum", ""))
	var accion = decidir(lh, str(_estado.get_value("s", "base", "")), rh)
	# Bajar sola solo al abrir: durante la partida puede haber progreso sin guardar.
	if accion == "bajar" and lh != "" and not motivo in ["abrir", "login", "reanudar"]: accion = "conflicto"
	match accion:
		"nada":
			_est({"base": lh, "id": arch.get("id", ""), "pendiente": false})
			if lh != "" and ultima_copia() == 0: _est({"ultima_copia": int(Time.get_unix_time_from_system())})
			_poner_estado("Todo al día." if lh != "" else "Aún no hay partida guardada.")
		"subir": await _hacer_subida(str(arch.get("id", "")))
		"bajar": await _hacer_bajada(arch)
		"conflicto":
			conflicto_pendiente = {"local": info_local(), "nube": _info_remota(arch), "archivo": arch}
			_poner_estado("Hay dos partidas distintas: elige cuál quieres conservar.")
			conflicto.emit(conflicto_pendiente.local, conflicto_pendiente.nube)

func _fallo(r: Dictionary) -> void:
	_fallo_reciente = true
	if r.get("sesion", false): return
	_est({"pendiente": true})
	if r.get("red", false):
		_poner_estado("Sin conexión: la copia se subirá en cuanto vuelva la red.")
	else:
		var m = ""
		if r.get("json") is Dictionary and r.json.get("error") is Dictionary: m = str(r.json.error.get("message", ""))
		_poner_estado("Google Drive respondió con un error (%d) %s" % [r.get("codigo", 0), m])
	if is_inside_tree() and conectado(): _t_reintento.start(reintento_s)

func _subir(datos: PackedByteArray, id: String) -> Dictionary:
	var limite = "pixelsoft" + _aleatorio(12).replace("-", "a").replace("_", "b")
	var meta = {"appProperties": _propiedades(datos)}
	if id == "": meta["name"] = nombre_remoto(); meta["parents"] = ["appDataFolder"]; meta["mimeType"] = "application/json"
	var cuerpo := PackedByteArray()
	cuerpo.append_array(("--%s\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n%s\r\n--%s\r\nContent-Type: application/json\r\n\r\n" % [limite, JSON.stringify(meta), limite]).to_utf8_buffer())
	cuerpo.append_array(datos)
	cuerpo.append_array(("\r\n--%s--\r\n" % limite).to_utf8_buffer())
	var url = URL_UPLOAD + ("/files" if id == "" else "/files/" + id) + "?uploadType=multipart&fields=" + "id,modifiedTime,md5Checksum,appProperties".uri_encode()
	return await _api(HTTPClient.METHOD_POST if id == "" else HTTPClient.METHOD_PATCH, url,
		PackedStringArray(["Content-Type: multipart/related; boundary=" + limite]), cuerpo)

func _hacer_subida(id: String) -> void:
	if not FileAccess.file_exists(ruta_partida): _poner_estado("No hay partida que subir."); return
	var datos = FileAccess.get_file_as_bytes(ruta_partida)
	var r = await _subir(datos, id)
	if r.codigo == 404 and id != "": r = await _subir(datos, "")   # la copia se borro en la nube
	if not r.ok: _fallo(r); return
	var j = r.json if r.json is Dictionary else {}
	_est({"base": str(j.get("md5Checksum", _md5(datos))), "id": str(j.get("id", id)), "pendiente": false, "ultima_copia": int(Time.get_unix_time_from_system())})
	ultima_info_nube = _info_remota(j)
	_poner_estado("Copia subida a Google Drive.")

func _hacer_bajada(arch: Dictionary) -> void:
	var r = await _api(HTTPClient.METHOD_GET, URL_API + "/files/%s?alt=media" % arch.id)
	if not r.ok: _fallo(r); return
	var datos: PackedByteArray = r.cuerpo
	var h = _md5(datos)
	var d = _json(datos.get_string_from_utf8())
	if (arch.has("md5Checksum") and h != str(arch.md5Checksum)) or not (d is Dictionary and d.has("empresa")):
		_poner_estado("La copia de la nube está dañada; no se ha tocado tu partida."); return
	var g = ProjectSettings.globalize_path(ruta_partida)
	if FileAccess.file_exists(ruta_partida): DirAccess.copy_absolute(g, g + ".antes_nube")
	var f = FileAccess.open(ruta_partida + ".nube", FileAccess.WRITE)
	if f == null: _poner_estado("No se pudo escribir la partida."); return
	f.store_buffer(datos); f.close()
	DirAccess.rename_absolute(g + ".nube", g)
	_est({"base": h, "id": str(arch.id), "pendiente": false, "ultima_copia": int(Time.get_unix_time_from_system())})
	_poner_estado("Partida descargada de Google Drive (día %d)." % int(d.get("dia", 0)))
	partida_descargada.emit()
	_aplicar_partida()

func _aplicar_partida() -> void:
	if modo_prueba: return
	var j = get_node_or_null("/root/Juego")
	if j and j.cargar() and get_tree().current_scene: get_tree().reload_current_scene()

## Eleccion del jugador ante un conflicto: "local", "nube" o "luego".
func resolver_conflicto(eleccion: String) -> void:
	var c = conflicto_pendiente
	conflicto_pendiente = {}
	if c.is_empty() or eleccion == "luego": estado_cambiado.emit(); return
	await _con_bloqueo("subir_id" if eleccion == "local" else "bajar_arch", c.archivo)

## Botones "Subir ahora" y "Descargar" (forzados: no comparan con la ultima copia).
func subir_ahora() -> void: await _con_bloqueo("subir")
func descargar_ahora() -> void: await _con_bloqueo("bajar")

## Para el dialogo de "Descargar": datos de la copia de la nube sin tocar nada.
func consultar_nube() -> Dictionary:
	var rr = await _remoto()
	if not rr.ok: _fallo(rr); return {"error": true}
	return _info_remota(rr.archivo)

func _con_bloqueo(que: String, arch := {}) -> void:
	if not conectado(): return
	while ocupado: await get_tree().process_frame
	ocupado = true
	_poner_estado("Sincronizando…")
	if que == "subir_id": await _hacer_subida(str(arch.get("id", "")))
	elif que == "bajar_arch": await _hacer_bajada(arch)
	else:
		var rr = await _remoto()
		if not rr.ok: _fallo(rr)
		elif que == "subir": await _hacer_subida(str(rr.archivo.get("id", "")))
		elif rr.archivo.is_empty(): _poner_estado("Todavía no hay ninguna copia en Google Drive.")
		else: await _hacer_bajada(rr.archivo)
	ocupado = false
	estado_cambiado.emit()
