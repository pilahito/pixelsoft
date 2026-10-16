extends Node
## Busca versiones nuevas en GitHub (pilahito/pixelsoft) y actualiza.
## PC: baja el .exe nuevo, un .cmd espera a que se cierre el juego, lo cambia y lo reabre.
## Android: abre el APK; Android lo instala encima (misma firma) sin borrar la partida.
## La partida y los mods viven en user://, que no se toca al actualizar.

signal estado(texto: String)
signal hay_version(info: Dictionary)
const API = "https://api.github.com/repos/pilahito/pixelsoft/releases/latest"
const CFG = "user://ajustes.cfg"

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
		if not es_mas_nueva(v, Juego.VERSION): estado.emit("Tienes la última versión (%s)." % Juego.VERSION); return
		if not manual and c.get_value("act", "omitida", "") == v: return
		var info = {"version": v, "notas": j.get("body", ""), "url": j.get("html_url", ""), "exe": "", "apk": ""}
		for a in j.get("assets", []):
			if str(a.name).ends_with(".exe"): info.exe = a.browser_download_url
			if str(a.name).ends_with(".apk"): info.apk = a.browser_download_url
		estado.emit("Hay una versión nueva: " + v)
		hay_version.emit(info))
	r.request(API, ["Accept: application/vnd.github+json", "User-Agent: PixelSoft"])

func omitir(v: String) -> void:
	var c = ConfigFile.new(); c.load(CFG); c.set_value("act", "omitida", v); c.save(CFG)

func instalar(info: Dictionary) -> void:
	Juego.guardar()
	if OS.get_name() == "Android":
		if info.apk == "": OS.shell_open(info.url); return
		OS.shell_open(info.apk)
		estado.emit("Descargando el APK: ábrelo al terminar y pulsa «Actualizar».")
		return
	if OS.get_name() != "Windows" or info.exe == "" or OS.has_feature("editor"):
		OS.shell_open(info.url); return
	estado.emit("⏳ Descargando la actualización…")
	var exe = OS.get_executable_path()
	var nuevo = exe + ".nuevo"
	var r = HTTPRequest.new(); r.download_file = nuevo; r.timeout = 600; add_child(r)
	r.request_completed.connect(func(res, code, _h, _b):
		r.queue_free()
		if res != OK or code != 200 or FileAccess.get_file_as_bytes(nuevo).size() < 5_000_000:
			DirAccess.remove_absolute(nuevo); estado.emit("La descarga falló."); return
		var pid = OS.get_process_id()
		var cmd = OS.get_user_data_dir() + "/actualizar.cmd"
		var f = FileAccess.open(cmd, FileAccess.WRITE)
		f.store_string("@echo off\r\n:espera\r\ntasklist /FI \"PID eq %d\" | find \"%d\" >nul && (timeout /t 1 >nul & goto espera)\r\nmove /y \"%s\" \"%s.viejo\" >nul\r\nmove /y \"%s\" \"%s\" >nul || move /y \"%s.viejo\" \"%s\" >nul\r\nstart \"\" \"%s\"\r\ndel \"%s.viejo\" >nul 2>&1\r\n" % [pid, pid, exe, exe, nuevo, exe, exe, exe, exe, exe])
		f.close()
		OS.create_process("cmd.exe", ["/c", cmd])
		get_tree().quit())
	r.request(info.exe, ["User-Agent: PixelSoft"])
