extends Node
## Mods = paquetes de datos (mod.json + imagenes/sonidos). Nunca codigo.
## Viven en user://mods/<id>/ (sobreviven a las actualizaciones).
## Se pueden instalar desde .zip (ZIPReader) en PC y Android.

const CARPETA = "user://mods"
const ORDEN = "user://mods/orden.json"
var mods: Array = []   # [{id, nombre, version, autor, descripcion, activo, contenido}]
var avisos: Array = []

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(CARPETA)
	recargar()

func recargar() -> void:
	mods.clear()
	var orden: Array = []
	if FileAccess.file_exists(ORDEN): orden = JSON.parse_string(FileAccess.get_file_as_string(ORDEN))
	var d = DirAccess.open(CARPETA)
	if d:
		for id in d.get_directories():
			var ruta = "%s/%s/mod.json" % [CARPETA, id]
			if not FileAccess.file_exists(ruta): continue
			var j = JSON.parse_string(FileAccess.get_file_as_string(ruta))
			var m = validar(j)
			if m.is_empty(): continue
			var o = orden.filter(func(x): return x.id == m.id)
			m.activo = o[0].activo if o.size() else true
			m.pos = orden.find(o[0]) if o.size() else 999
			mods.append(m)
	mods.sort_custom(func(a, b): return a.pos < b.pos)
	aplicar()

func guardar_orden() -> void:
	var f = FileAccess.open(ORDEN, FileAccess.WRITE)
	f.store_string(JSON.stringify(mods.map(func(m): return {"id": m.id, "activo": m.activo})))

func _id(v) -> String:
	var s = str(v).to_lower()
	var r = ""
	for c in s: if c in "abcdefghijklmnopqrstuvwxyz0123456789_-": r += c
	return r.substr(0, 40)

func validar(j) -> Dictionary:
	if typeof(j) != TYPE_DICTIONARY: return {}
	var id = _id(j.get("id", j.get("nombre", "")))
	if id == "": return {}
	return {"id": id, "nombre": str(j.get("nombre", id)).substr(0, 60), "version": str(j.get("version", "1.0.0")).substr(0, 16),
		"autor": str(j.get("autor", "anónimo")).substr(0, 40), "descripcion": str(j.get("descripcion", "")).substr(0, 300),
		"contenido": j.get("contenido", {})}

## Instala un .zip: solo se copian mod.json, png, webp, ogg y wav.
func instalar_zip(ruta: String) -> String:
	var z = ZIPReader.new()
	if z.open(ruta) != OK: return "No es un .zip válido."
	var ficheros = z.get_files()
	var json_ruta = ""
	for f in ficheros: if f.get_file() == "mod.json": json_ruta = f
	if json_ruta == "": return "El .zip no tiene mod.json."
	var m = validar(JSON.parse_string(z.read_file(json_ruta).get_string_from_utf8()))
	if m.is_empty(): return "mod.json no es válido."
	var destino = "%s/%s" % [CARPETA, m.id]
	DirAccess.make_dir_recursive_absolute(destino)
	for f in ficheros:
		var ext = f.get_extension().to_lower()
		if f.contains("..") or not (ext in ["json", "png", "webp", "ogg", "wav"]): continue
		var datos = z.read_file(f)
		if datos.size() > 4 * 1024 * 1024: continue
		var out = FileAccess.open(destino + "/" + f.get_file(), FileAccess.WRITE)
		out.store_buffer(datos)
	z.close()
	recargar(); guardar_orden()
	return "Mod instalado: " + m.nombre

func quitar(id: String) -> void:
	var d = "%s/%s" % [CARPETA, id]
	for f in DirAccess.get_files_at(d): DirAccess.remove_absolute(d + "/" + f)
	DirAccess.remove_absolute(d)
	recargar(); guardar_orden()

func mover(id: String, delta: int) -> void:
	var i = mods.find(mods.filter(func(m): return m.id == id)[0])
	var j = clampi(i + delta, 0, mods.size() - 1)
	var t = mods[i]; mods[i] = mods[j]; mods[j] = t
	guardar_orden(); aplicar()

func alternar(id: String) -> void:
	for m in mods: if m.id == id: m.activo = not m.activo
	guardar_orden(); aplicar()

## Mete el contenido en el juego. Si dos mods tocan el mismo id, gana el ultimo.
func aplicar() -> void:
	avisos.clear()
	if not is_instance_valid(Juego): return
	var base_t: Array = Juego.TIENDA.filter(func(x): return not x.has("_mod"))
	var base_e: Array = Juego.TIPOS_EDIFICIO.filter(func(x): return not x.has("_mod"))
	for m in mods:
		if not m.activo: continue
		var c: Dictionary = m.contenido
		for o in c.get("objetos", []):
			var it = {"id": _id(o.get("id", "")), "nombre": str(o.get("nombre", "?")).substr(0, 40), "precio": clampf(float(o.get("precio", 50)), 1, 100000),
				"tipo": o.get("tipo", "mueble") if o.get("tipo", "") in ["mueble", "consumible", "ropa"] else "mueble", "cantidad": clampi(int(o.get("cantidad", 1)), 1, 20),
				"moral": clampf(float(o.get("moral", 0)), 0, 30), "bono": o.get("bono", {}), "cat": str(o.get("categoria", "Mods")), "_mod": m.id}
			if it.id == "": continue
			var prev = base_t.filter(func(x): return x.id == it.id)
			if prev.size(): avisos.append("«%s» reemplaza el objeto %s." % [m.nombre, it.id]); base_t.erase(prev[0])
			base_t.append(it)
		for e in c.get("edificios", []):
			var ed = {"id": _id(e.get("id", "")), "nombre": str(e.get("nombre", "?")).substr(0, 40), "w": clampi(int(e.get("ancho", 3)), 1, 8), "h": clampi(int(e.get("fondo", 3)), 1, 8),
				"coste": clampf(float(e.get("coste", 400)), 10, 50000), "lugar": e.get("lugar", "parque") if e.get("lugar", "") in ["casa", "super", "cafeteria", "parque", "gimnasio"] else "parque",
				"necesidad": e.get("necesidad", "diversion"), "modelo": e.get("modelo", "casa"), "_mod": m.id}
			if ed.id != "": base_e.append(ed)
	Juego.TIENDA = base_t
	Juego.TIPOS_EDIFICIO = base_e
