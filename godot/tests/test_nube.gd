extends SceneTree
## Pruebas de la nube (scripts/nube.gd) contra un servidor FALSO local de Google.
## No usa credenciales reales ni Internet. Lo lanza tools/nube/probar-nube.ps1:
##   godot --headless --path godot -s res://tests/test_nube.gd -- --falso=http://127.0.0.1:47831

const NUBE = preload("res://scripts/nube.gd")
const DIR = "user://prueba_nube/"
var F := "http://127.0.0.1:47831"
var fallos := 0
var pasos := 0

func _initialize() -> void:
	for a in OS.get_cmdline_user_args(): if a.begins_with("--falso="): F = a.substr(8)
	_correr.call_deferred()

func ok(cond: bool, que: String) -> void:
	pasos += 1
	if cond: print("  OK  ", que)
	else: fallos += 1; printerr("  FALLO  ", que)

func ctl(ruta: String, cuerpo := "") -> Dictionary:
	var h = HTTPRequest.new(); h.timeout = 5.0; root.add_child(h)
	h.request_raw(F + ruta, PackedStringArray(), HTTPClient.METHOD_POST, cuerpo.to_utf8_buffer())
	var r = await h.request_completed
	h.queue_free()
	var j = JSON.parse_string(r[3].get_string_from_utf8())
	return j if j is Dictionary else {}

func esperar(cond: Callable, s := 10.0) -> bool:
	var t = Time.get_ticks_msec()
	while not cond.call():
		if Time.get_ticks_msec() - t > s * 1000: return false
		await process_frame
	return true

func nube(variante := "publica", tipo := "escritorio") -> Node:
	var n = NUBE.new()
	n.modo_prueba = true; n.variante = variante; n.forzar_tipo = tipo
	n.reintento_s = 1.0; n.tiempo_max_http = 5.0
	n.config = {"escritorio": {"client_id": "escritorio-falso", "client_secret": "secreto-escritorio"},
		"dispositivo": {"client_id": "dispositivo-falso", "client_secret": "secreto-dispositivo"}}
	n.URL_AUTH = F + "/o/oauth2/v2/auth"; n.URL_TOKEN = F + "/token"; n.URL_DEVICE = F + "/device/code"
	n.URL_REVOKE = F + "/revoke"; n.URL_API = F + "/drive/v3"; n.URL_UPLOAD = F + "/upload/drive/v3"
	n.ruta_partida = DIR + ("partida.json" if variante == "publica" else "partida_privado.json")
	n.configurar_rutas(DIR)
	root.add_child(n)
	return n

func partida(ruta: String, dia: int, extra := "") -> String:
	var t = JSON.stringify({"v": 2, "dia": dia, "hora": 9, "tick": dia * 100, "empresa": {"dinero": 500 + dia, "nota": extra}, "agentes": [], "pueblo": {}})
	var f = FileAccess.open(ruta, FileAccess.WRITE); f.store_string(t); f.close()
	return t

func remoto(nombre: String) -> Dictionary:
	var e = await ctl("/_ctl/estado")
	for a in e.get("archivos", []): if a.name == nombre: return a
	return {}

func _borrar_dir() -> void:
	var g = ProjectSettings.globalize_path(DIR)
	if DirAccess.dir_exists_absolute(g):
		for f in DirAccess.get_files_at(g): DirAccess.remove_absolute(g + f)
	DirAccess.make_dir_recursive_absolute(g)

func _correr() -> void:
	await process_frame
	print("Pruebas de la nube · datos en ", ProjectSettings.globalize_path(DIR))
	_borrar_dir()
	await ctl("/_ctl/reset")

	print("· Lógica pura")
	ok(NUBE.decidir("", "", "") == "nada", "sin nada en ningún sitio → nada")
	ok(NUBE.decidir("a", "", "") == "subir", "solo local → subir")
	ok(NUBE.decidir("", "", "b") == "bajar", "solo nube → bajar")
	ok(NUBE.decidir("a", "a", "b") == "bajar", "nube cambió, local igual → bajar")
	ok(NUBE.decidir("b", "a", "a") == "subir", "local cambió, nube igual → subir")
	ok(NUBE.decidir("b", "a", "c") == "conflicto", "las dos cambiaron → conflicto")
	ok(NUBE.decidir("b", "", "c") == "conflicto", "primera vez y distintas → conflicto")
	ok(NUBE.decidir("x", "a", "x") == "nada", "iguales → nada")
	ok(NUBE.reto_pkce("dBjftJeZ4CVP-mJ92K9qNaa9mZU1-U2VhA7iEWxGzlE") == "oQyIbivcrdYdxRR2pbjwoZGvVgQIB5z6vy0hX61oVUU", "PKCE S256 igual que Node/crypto")

	print("· Sin credenciales: la opción se oculta")
	var vacia = NUBE.new(); vacia.modo_prueba = true; vacia.config = {"x": 1}; vacia.configurar_rutas(DIR + "vacia_")
	ok(not vacia.disponible(), "sin client id → disponible() = false")
	vacia.free()

	print("· PC: inicio de sesión con navegador + 127.0.0.1 + PKCE")
	var n = nube()
	ok(not n.conectado(), "empieza sin sesión")
	var url := [""]
	n.url_autorizacion.connect(func(u): url[0] = u)
	n.iniciar_sesion()
	ok(url[0].begins_with(F + "/o/oauth2/v2/auth?") and url[0].contains("code_challenge_method=S256") and url[0].contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A"), "URL de autorización con PKCE y redirect loopback")
	# "Navegador": GET a la URL; el servidor falso redirige a 127.0.0.1:<puerto>/?code=..&state=..
	var nav = HTTPRequest.new(); root.add_child(nav); nav.request(url[0])
	var rnav = await nav.request_completed
	ok(rnav[1] == 200 and rnav[3].get_string_from_utf8().contains("Listo"), "la página local responde «¡Listo!» al navegador")
	ok(await esperar(func(): return n.conectado() and n.cuenta() != "" and not n.ocupado), "sesión iniciada (código canjeado con code_verifier)")
	ok(n.cuenta() == "Jugador de prueba", "muestra la cuenta")
	var crudo = FileAccess.get_file_as_bytes(n.ruta_token)
	ok(crudo.size() > 0 and crudo.hex_encode().find("1//".to_utf8_buffer().hex_encode()) < 0, "refresh token guardado CIFRADO")
	# estado engañoso: un state distinto se rechaza
	ok(n._query("a=1&b=x%2Fy") == {"a": "1", "b": "x/y"}, "parseo de la query")

	print("· Primera subida y archivo en appDataFolder")
	partida(n.ruta_partida, 3)
	await n.sincronizar("guardar")
	var r = await remoto("pixelsoft_partida.json")
	ok(not r.is_empty() and r.parents == ["appDataFolder"], "creado pixelsoft_partida.json en appDataFolder")
	ok(r.get("contenido", "") == FileAccess.get_file_as_string(n.ruta_partida), "contenido idéntico")
	ok(str(r.appProperties.get("dia")) == "3", "metadatos con el día de juego")
	ok(n.ultima_copia() > 0 and not n.pendiente(), "última copia anotada y nada pendiente")
	var e0 = await ctl("/_ctl/estado")
	await n.sincronizar("abrir")
	var e1 = await ctl("/_ctl/estado")
	ok(e1.cuenta.subidas == e0.cuenta.subidas, "sin cambios no vuelve a subir")

	print("· Otro dispositivo guarda; aquí no se jugó → se descarga al abrir")
	var t7 = JSON.stringify({"v": 2, "dia": 7, "hora": 10, "tick": 700, "empresa": {"dinero": 900}, "agentes": [], "pueblo": {}})
	await ctl("/_ctl/poner?nombre=pixelsoft_partida.json&dia=7", t7)
	var bajada := [false]; n.partida_descargada.connect(func(): bajada[0] = true)
	await n.sincronizar("abrir")
	ok(bajada[0] and FileAccess.get_file_as_string(n.ruta_partida) == t7, "partida del día 7 descargada")
	ok(FileAccess.file_exists(n.ruta_partida + ".antes_nube"), "copia de seguridad de la anterior")

	print("· Conflicto: las dos cambiaron → se pregunta, con fecha y día")
	var conf := [{}, {}]
	n.conflicto.connect(func(l, nu): conf[0] = l; conf[1] = nu)
	await ctl("/_ctl/poner?nombre=pixelsoft_partida.json&dia=9", JSON.stringify({"v": 2, "dia": 9, "hora": 1, "tick": 1, "empresa": {}, "agentes": [], "pueblo": {}}))
	var t8 = partida(n.ruta_partida, 8)
	await n.sincronizar("guardar")
	ok(conf[0].get("dia") == 8 and conf[1].get("dia") == 9, "conflicto: este dispositivo día 8 / nube día 9")
	ok(conf[0].get("fecha", 0) > 0 and conf[1].get("fecha", 0) > 0 and conf[1].get("dispositivo", "").contains("Android"), "con fecha y dispositivo de cada copia")
	ok(FileAccess.get_file_as_string(n.ruta_partida) == t8, "mientras no elige, no se toca nada")
	await n.resolver_conflicto("local")
	ok((await remoto("pixelsoft_partida.json")).contenido == t8, "elige «este dispositivo» → la nube pasa a día 8")
	await ctl("/_ctl/poner?nombre=pixelsoft_partida.json&dia=11", JSON.stringify({"v": 2, "dia": 11, "hora": 1, "tick": 1, "empresa": {}, "agentes": [], "pueblo": {}}))
	partida(n.ruta_partida, 10)
	await n.sincronizar("guardar")
	ok(n.conflicto_pendiente.get("nube", {}).get("dia") == 11, "nuevo conflicto (día 10 / día 11)")
	await n.resolver_conflicto("nube")
	ok(JSON.parse_string(FileAccess.get_file_as_string(n.ruta_partida)).dia == 11, "elige «Google Drive» → la partida local pasa a día 11")
	await n.sincronizar("guardar")
	ok(n.conflicto_pendiente.is_empty() and n.estado_texto.contains("al día"), "después queda todo al día")

	print("· Sin conexión: se queda en cola y se sube al volver")
	var buena = n.URL_API
	n.URL_API = "http://127.0.0.1:9"; n.URL_UPLOAD = "http://127.0.0.1:9/upload"
	var t12 = partida(n.ruta_partida, 12)
	n._al_guardar()
	await n.sincronizar("guardar")
	ok(n.pendiente() and n.estado_texto.contains("Sin conexión"), "sin red: queda pendiente («Sin conexión…»)")
	n.URL_API = buena; n.URL_UPLOAD = F + "/upload/drive/v3"
	ok(await esperar(func(): return not n.pendiente(), 8.0), "vuelve la red: el reintento automático la sube")
	ok((await remoto("pixelsoft_partida.json")).contenido == t12, "la nube tiene el día 12")

	print("· Tokens: caducan y se renuevan solos")
	await ctl("/_ctl/caducar")
	var ref0 = (await ctl("/_ctl/estado")).cuenta.refrescos
	partida(n.ruta_partida, 13)
	await n.sincronizar("guardar")
	var e2 = await ctl("/_ctl/estado")
	ok(e2.cuenta.refrescos > ref0 and (await remoto("pixelsoft_partida.json")).appProperties.dia == "13", "401 → renueva con el refresh token y sube")

	print("· El token cifrado sobrevive a reiniciar el juego")
	n.queue_free(); await process_frame
	var n2 = nube()
	ok(n2.conectado() and n2.cuenta() == "Jugador de prueba", "sesión recuperada tras reiniciar")
	await n2.sincronizar("abrir")
	ok(n2.estado_texto.contains("al día"), "y sincroniza sin pedir nada")

	print("· Versión privada: archivo distinto en la nube")
	var p = nube("privado")
	ok(not p.conectado(), "la privada tiene su propia sesión")
	var urlp := [""]; p.url_autorizacion.connect(func(u): urlp[0] = u)
	p.iniciar_sesion()
	var nav2 = HTTPRequest.new(); root.add_child(nav2); nav2.request(urlp[0]); await nav2.request_completed
	ok(await esperar(func(): return p.conectado() and not p.ocupado), "sesión en la privada")
	var tp = partida(p.ruta_partida, 50, "privada")
	await p.sincronizar("guardar")
	ok((await remoto("pixelsoft_privado_partida.json")).get("contenido", "") == tp, "sube a pixelsoft_privado_partida.json")
	ok((await remoto("pixelsoft_partida.json")).appProperties.dia == "13", "la copia de la versión normal no se toca")

	print("· Android: inicio de sesión con código (google.com/device)")
	var d = nube("movil", "dispositivo")
	d.ruta_partida = DIR + "partida_movil.json"
	var cod := ["", ""]; d.codigo_dispositivo.connect(func(u, c): cod[0] = u; cod[1] = c)
	d.iniciar_sesion()
	ok(await esperar(func(): return cod[1] != ""), "muestra la URL y el código")
	ok(cod[0] == "https://www.google.com/device" and cod[1] == "WXYZ-ABCD", "URL y código tal cual los da Google")
	ok(await esperar(func(): return d.conectado() and not d.ocupado, 15.0), "tras «authorization_pending» se conecta solo")
	ok((await ctl("/_ctl/estado")).cuenta.devPolls >= 3, "ha esperado al usuario (sondeo)")
	await d.sincronizar("abrir")
	ok(not FileAccess.file_exists(d.ruta_partida), "variante sin copia: no inventa nada")

	print("· Cerrar sesión y sesión revocada")
	await p.cerrar_sesion()
	ok(not p.conectado() and not FileAccess.file_exists(p.ruta_token), "cerrar sesión borra el token")
	ok((await ctl("/_ctl/estado")).cuenta.revocados >= 1, "y lo revoca en Google")
	await ctl("/_ctl/revocar_todo"); await ctl("/_ctl/caducar")
	partida(n2.ruta_partida, 14)
	await n2.sincronizar("guardar")
	ok(not n2.conectado() and n2.estado_texto.contains("caducado"), "permiso retirado → sesión cerrada con aviso")
	ok(FileAccess.file_exists(n2.ruta_partida), "la partida local sigue ahí")

	print("\n%d comprobaciones, %d fallos" % [pasos, fallos])
	_borrar_dir()
	quit(1 if fallos else 0)
