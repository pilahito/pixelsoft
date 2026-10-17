extends Node
## Busca versiones nuevas en GitHub (pilahito/pixelsoft) y actualiza.
## PC: baja el .exe nuevo, un .cmd espera a que se cierre el juego, lo cambia y lo reabre.
## Android: abre el APK; Android lo instala encima (misma firma) sin borrar la partida.
## La partida y los mods viven en user://, que no se toca al actualizar.

signal estado(texto: String)
signal hay_version(info: Dictionary)
const API = "https://api.github.com/repos/pilahito/pixelsoft/releases/latest"
const CFG = "user://ajustes.cfg"
## DLL del motor de IA (llama.cpp) que van junto al .exe en Windows.
const DLLS = ["llama.dll", "ggml.dll", "ggml-base.dll", "ggml-cpu.dll", "libgodot_llama.windows.template_release.x86_64.dll"]

static func es_mas_nueva(a: String, b: String) -> bool:
	var pa = a.trim_prefix("v").split("."); var pb = b.trim_prefix("v").split(".")
	for i in 3:
		var x = int(pa[i]) if i < pa.size() else 0
		var y = int(pb[i]) if i < pb.size() else 0
		if x != y: return x > y
	return false

func comprobar(manual: bool) -> void:
	var c = ConfigFile.new(); c.load(CFG)
	if not manual and Time.get_unix_time_from_system() - float(c.get_value("act", "ultima", 0)) < 6 * 3600: return
	c.set_value("act", "ultima", Time.get_unix_time_from_system()); c.save(CFG)
	estado.emit("⏳ Buscando…")
	var r = HTTPRequest.new(); r.timeout = 10; add_child(r)
	r.request_completed.connect(func(res, code, _h, body):
		r.queue_free()
		if res != OK or code != 200: estado.emit("No pude consultar GitHub."); return
		var j = JSON.parse_string(body.get_string_from_utf8())
		var v = str(j.get("tag_name", ""))
		if not es_mas_nueva(v, Juego.VERSION):
			# Misma version pero sin las DLL de la IA (p. ej. se bajo solo el .exe): ofrecer bajarlas.
			var z = ""
			for a in j.get("assets", []):
				if str(a.name).ends_with("-windows.zip"): z = a.browser_download_url
			if z != "" and not faltan_dlls().is_empty() and v.trim_prefix("v") == Juego.VERSION and (manual or c.get_value("act", "omitida", "") != v):
				hay_version.emit({"version": v, "notas": "", "url": j.get("html_url", ""), "exe": "", "apk": "", "zip": z, "solo_ia": true})
				return
			estado.emit("Tienes la última versión (%s)." % Juego.VERSION); return
		if not manual and c.get_value("act", "omitida", "") == v: return
		var info = {"version": v, "notas": j.get("body", ""), "url": j.get("html_url", ""), "exe": "", "apk": "", "zip": ""}
		for a in j.get("assets", []):
			if str(a.name).ends_with(".exe"): info.exe = a.browser_download_url
			if str(a.name).ends_with(".apk"): info.apk = a.browser_download_url
			if str(a.name).ends_with("-windows.zip"): info.zip = a.browser_download_url
		estado.emit("Hay una versión nueva: " + v)
		hay_version.emit(info))
	r.request(API, ["Accept: application/vnd.github+json", "User-Agent: PixelSoft"])

## DLL de la IA que faltan junto al .exe (solo Windows exportado).
func faltan_dlls() -> Array:
	if OS.get_name() != "Windows" or OS.has_feature("editor"): return []
	var dir = OS.get_executable_path().get_base_dir()
	return DLLS.filter(func(d): return not FileAccess.file_exists(dir.path_join(d)))

func omitir(v: String) -> void:
	var c = ConfigFile.new(); c.load(CFG); c.set_value("act", "omitida", v); c.save(CFG)

func instalar(info: Dictionary) -> void:
	Juego.guardar()
	if OS.get_name() == "Android":
		if info.apk == "": OS.shell_open(info.url); return
		OS.shell_open(info.apk)
		estado.emit("Descargando el APK: ábrelo al terminar y pulsa «Actualizar».")
		return
	if OS.get_name() != "Windows" or (info.exe == "" and info.get("zip", "") == "") or OS.has_feature("editor"):
		OS.shell_open(info.url); return
	var exe = OS.get_executable_path()
	var faltan = faltan_dlls()
	# Si faltan las DLL de la IA (o hay que renovarlas), mejor el .zip completo: trae el .exe y las DLL.
	if info.get("zip", "") != "" and (faltan.size() > 0 or info.exe == ""):
		_bajar_zip(info, exe, faltan)
	elif info.exe != "":
		_bajar_exe(info, exe)
	else:
		OS.shell_open(info.url)

func _bajar_exe(info: Dictionary, exe: String) -> void:
	estado.emit("⏳ Descargando la actualización…")
	var nuevo = exe + ".nuevo"
	var r = HTTPRequest.new(); r.download_file = nuevo; r.timeout = 600; add_child(r)
	r.request_completed.connect(func(res, code, _h, _b):
		r.queue_free()
		if res != OK or code != 200 or FileAccess.get_file_as_bytes(nuevo).size() < 5_000_000:
			DirAccess.remove_absolute(nuevo); estado.emit("La descarga falló."); return
		_cambiar_y_reiniciar(exe, []))
	r.request(info.exe, ["User-Agent: PixelSoft"])

## Baja el .zip de Windows y saca el .exe y las DLL como "<nombre>.nuevo";
## el .cmd los pone en su sitio cuando el juego se ha cerrado (las DLL en uso
## no se pueden sobrescribir con el juego abierto).
func _bajar_zip(info: Dictionary, exe: String, faltan: Array) -> void:
	estado.emit("⏳ Descargando la actualización y el motor de IA (%d DLL)…" % faltan.size() if faltan.size() else "⏳ Descargando la actualización…")
	var zip_ruta = OS.get_user_data_dir().path_join("actualizacion.zip")
	var r = HTTPRequest.new(); r.download_file = zip_ruta; r.timeout = 900; add_child(r)
	r.request_completed.connect(func(res, code, _h, _b):
		r.queue_free()
		if res != OK or code != 200:
			DirAccess.remove_absolute(zip_ruta)
			if info.exe != "": _bajar_exe(info, exe)
			else: estado.emit("La descarga falló.")
			return
		var z = ZIPReader.new()
		if z.open(zip_ruta) != OK: estado.emit("El .zip está dañado."); return
		var dir = exe.get_base_dir(); var puestos: Array = []; var hay_exe = false
		for f in z.get_files():
			var nombre = f.get_file()
			var es_exe = nombre.to_lower().ends_with(".exe")
			if es_exe and info.get("solo_ia", false): continue
			if not es_exe and not nombre.to_lower().ends_with(".dll"): continue
			var datos = z.read_file(f)
			if es_exe and datos.size() < 5_000_000: continue
			var destino = exe + ".nuevo" if es_exe else dir.path_join(nombre) + ".nuevo"
			var w = FileAccess.open(destino, FileAccess.WRITE)
			if w == null: continue
			w.store_buffer(datos); w.close()
			if es_exe: hay_exe = true
			else: puestos.append(dir.path_join(nombre))
		z.close(); DirAccess.remove_absolute(zip_ruta)
		if not hay_exe and puestos.is_empty(): estado.emit("El .zip no traía el juego."); return
		_cambiar_y_reiniciar(exe if hay_exe else "", puestos, exe))
	r.request(info.zip, ["User-Agent: PixelSoft"])

## .cmd que espera a que se cierre el juego, coloca lo nuevo y lo vuelve a abrir.
func _cambiar_y_reiniciar(exe: String, dlls: Array, abrir: String = "") -> void:
	if abrir == "": abrir = exe
	var pid = OS.get_process_id()
	var t = "@echo off\r\n:espera\r\ntasklist /FI \"PID eq %d\" | find \"%d\" >nul && (timeout /t 1 >nul & goto espera)\r\n" % [pid, pid]
	for d in dlls:
		var w = d.replace("/", "\\")
		t += "move /y \"%s.nuevo\" \"%s\" >nul\r\n" % [w, w]
	if exe != "":
		var e = exe.replace("/", "\\")
		t += "move /y \"%s\" \"%s.viejo\" >nul\r\nmove /y \"%s.nuevo\" \"%s\" >nul || move /y \"%s.viejo\" \"%s\" >nul\r\n" % [e, e, e, e, e, e]
		t += "del \"%s.viejo\" >nul 2>&1\r\n" % e
	t += "start \"\" \"%s\"\r\n" % abrir.replace("/", "\\")
	var cmd = OS.get_user_data_dir() + "/actualizar.cmd"
	var f = FileAccess.open(cmd, FileAccess.WRITE)
	f.store_string(t); f.close()
	OS.create_process("cmd.exe", ["/c", cmd])
	get_tree().quit()
