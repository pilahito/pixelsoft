extends Node
## Expansiones oficiales (DLC) estilo Los Sims. El juego base esta completo;
## los packs se desbloquean con un codigo offline firmado con Ed25519
## (formato PS1-<carga base64url>.<firma base64url>, como los codigos CT1 de
## CloudTerm pero con su propio par de claves). La clave PRIVADA nunca esta en
## el repo; aqui solo va la publica. No hay pagos dentro del juego.
## Los mods de la comunidad (solo datos) siguen aparte en mods.gd.

signal cambiado
const CLAVE_PUBLICA_B64 = "xVsLOHu2ZylHwa+HMILaFaVUUut8HNfsxPuD7ETRwSg="   # clave publica PixelSoft (la privada vive solo en el PC del autor)

const PACKS = [
	{"id": "ciudad", "nombre": "Vida en la Ciudad", "desc": "Rascacielos, metro, apartamentos y vida nocturna. El pueblo puede llegar a metrópolis.", "portada": ["#1b2a4a", "#ffcc33"]},
	{"id": "espias", "nombre": "Espías y Misterio", "desc": "Misiones secretas, gadgets y una agencia oculta bajo la biblioteca.", "portada": ["#111111", "#c0392b"]},
	{"id": "mascotas", "nombre": "Mascotas", "desc": "Gatos, perros con razas, veterinario y concurso canino en el parque.", "portada": ["#f39c12", "#6d4c41"]},
	{"id": "tiendas", "nombre": "Tiendas de España", "desc": "Interiores completos de Mercadogona, El Corte Inglez, Zarra y más.", "portada": ["#c8102e", "#ffd10d"]},
	{"id": "akia_hogar", "nombre": "AKIA Hogar", "desc": "Cien muebles nuevos, cocinas a medida y el modo montaje avanzado.", "portada": ["#0a3fa6", "#ffd10d"]},
]
var desbloqueados: Array = []

func _ready() -> void:
	var c = ConfigFile.new()
	if c.load("user://dlc.cfg") == OK: desbloqueados = c.get_value("d", "packs", [])

func tiene(id: String) -> bool: return id in desbloqueados

## Verifica y canjea un codigo. Devuelve un mensaje para el jugador.
func canjear(codigo: String) -> String:
	codigo = codigo.strip_edges()
	if not codigo.begins_with("PS1-") or not "." in codigo: return "Formato de código no válido."
	var partes = codigo.substr(4).split(".")
	var carga = _b64url(partes[0]); var firma = _b64url(partes[1])
	if CLAVE_PUBLICA_B64 == "": return "Verificación de códigos no disponible."
	if not preload("res://scripts/ed25519.gd").verificar(Marshalls.base64_to_raw(CLAVE_PUBLICA_B64), carga, firma): return "Código no válido."
	var d = JSON.parse_string(carga.get_string_from_utf8())
	if typeof(d) != TYPE_DICTIONARY or not d.has("packs"): return "Código no válido."
	for p in d.packs: if not p in desbloqueados: desbloqueados.append(p)
	var c = ConfigFile.new(); c.set_value("d", "packs", desbloqueados); c.save("user://dlc.cfg")
	cambiado.emit()
	return "¡Desbloqueado: %s!" % ", ".join(d.packs)

func _b64url(s: String) -> PackedByteArray:
	s = s.replace("-", "+").replace("_", "/")
	while s.length() % 4: s += "="
	return Marshalls.base64_to_raw(s)
