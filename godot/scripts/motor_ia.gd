extends Node
## Motor de IA (estilo Google AI Edge Gallery): backend, catalogo de modelos GGUF
## que el usuario descarga de Hugging Face (no se incluyen en el juego),
## deteccion de hardware, acelerador, temperatura/contexto y benchmark.
## Inferencia local: usa una GDExtension de llama.cpp si esta instalada
## (clase "LlamaContext"); si no, cae a LM Studio o al modo demo.

signal cambiado
signal progreso(id: String, fraccion: float)

const CATALOGO = [
	{"id": "smollm2-360m", "nombre": "SmolLM2 360M", "familia": "SmolLM2", "mb": 386, "ram": 1.0, "velocidad": 5, "licencia": "Apache-2.0",
		"url": "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf"},
	{"id": "qwen2.5-0.5b", "nombre": "Qwen2.5 0.5B", "familia": "Qwen2.5", "mb": 398, "ram": 1.2, "velocidad": 5, "licencia": "Apache-2.0",
		"url": "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"},
	{"id": "gemma3-1b", "nombre": "Gemma 3 1B", "familia": "Gemma", "mb": 806, "ram": 2.0, "velocidad": 4, "licencia": "Gemma Terms of Use",
		"url": "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf"},
	{"id": "qwen2.5-1.5b", "nombre": "Qwen2.5 1.5B", "familia": "Qwen2.5", "mb": 1120, "ram": 3.0, "velocidad": 3, "licencia": "Apache-2.0",
		"url": "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"},
	{"id": "gemma3n-e2b", "nombre": "Gemma 3n E2B", "familia": "Gemma", "mb": 2900, "ram": 4.0, "velocidad": 3, "licencia": "Gemma Terms of Use",
		"url": "https://huggingface.co/unsloth/gemma-3n-E2B-it-GGUF/resolve/main/gemma-3n-E2B-it-Q4_K_M.gguf"},
	{"id": "gemma3-4b", "nombre": "Gemma 3 4B", "familia": "Gemma", "mb": 2490, "ram": 5.5, "velocidad": 2, "licencia": "Gemma Terms of Use",
		"url": "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf"},
	{"id": "gemma3n-e4b", "nombre": "Gemma 3n E4B", "familia": "Gemma", "mb": 4500, "ram": 6.5, "velocidad": 2, "licencia": "Gemma Terms of Use",
		"url": "https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-Q4_K_M.gguf"},
	{"id": "qwen2.5-3b", "nombre": "Qwen2.5 3B", "familia": "Qwen2.5", "mb": 2100, "ram": 5.0, "velocidad": 2, "licencia": "Qwen Research License",
		"url": "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"},
]
const AVISO_GEMMA = "Los modelos Gemma se rigen por los Gemma Terms of Use (ai.google.dev/gemma/terms). Al descargarlos aceptas esas condiciones. PixelSoft no los incluye: se bajan de Hugging Face en tu dispositivo."

var backend = "demo"          # "local" | "lmstudio" | "lan" | "demo"
var modelo = ""
var acelerador = "cpu"        # "cpu" | "gpu"
var temperatura = 0.8
var contexto = 1024
var ram_gb = 4.0
var nucleos = 4
var descargas = {}            # id -> HTTPRequest
var ultimo_benchmark = ""

func _ready() -> void:
	var mem = OS.get_memory_info()
	ram_gb = float(mem.get("physical", 4.0 * 1073741824)) / 1073741824.0
	nucleos = OS.get_processor_count()
	DirAccess.make_dir_recursive_absolute("user://modelos")
	var c = ConfigFile.new()
	if c.load("user://motor_ia.cfg") == OK:
		backend = c.get_value("m", "backend", backend); modelo = c.get_value("m", "modelo", "")
		acelerador = c.get_value("m", "acelerador", acelerador); temperatura = c.get_value("m", "temperatura", temperatura)
		contexto = c.get_value("m", "contexto", contexto)
	else:
		modelo = recomendado()
		if OS.has_feature("mobile"): backend = "demo" if es_gama_baja() else "local"
		else: backend = "lmstudio"

func guardar() -> void:
	var c = ConfigFile.new(); c.load("user://motor_ia.cfg")
	for k in ["backend", "modelo", "acelerador", "temperatura", "contexto"]: c.set_value("m", k, get(k))
	c.save("user://motor_ia.cfg"); cambiado.emit()

## Moviles flojos: <3 GB de RAM o <=4 nucleos -> "IA simulada".
func es_gama_baja() -> bool: return ram_gb < 3.0 or nucleos <= 4

func ruta(id: String) -> String: return "user://modelos/%s.gguf" % id
func descargado(id: String) -> bool: return FileAccess.file_exists(ruta(id))
## Deja ~45% de la RAM para el sistema y el juego.
func cabe(m: Dictionary) -> bool: return m.ram <= ram_gb * 0.55
func recomendado() -> String:
	var mejor = CATALOGO[0].id
	for m in CATALOGO: if m.ram <= ram_gb * 0.4: mejor = m.id
	return mejor

func estimacion_tps(m: Dictionary) -> float:
	var base = {5: 30.0, 4: 18.0, 3: 10.0, 2: 6.0}[m.velocidad]
	if OS.has_feature("mobile"): base *= 0.45
	if acelerador == "gpu": base *= 1.6
	return base * clampf(nucleos / 8.0, 0.4, 2.0)

func descargar(id: String) -> void:
	var m = _modelo(id)
	if m.is_empty() or descargas.has(id) or not cabe(m): return
	var h = HTTPRequest.new(); add_child(h)
	h.download_file = ruta(id) + ".part"; h.use_threads = true
	descargas[id] = h
	h.request_completed.connect(func(r, codigo, _hd, _b):
		descargas.erase(id); h.queue_free()
		if r == OK and codigo == 200:
			DirAccess.rename_absolute(ruta(id) + ".part", ruta(id))
			if modelo == "" or not descargado(modelo): modelo = id; guardar()
		else: DirAccess.remove_absolute(ruta(id) + ".part")
		cambiado.emit())
	h.request(m.url); cambiado.emit()

func _process(_d: float) -> void:
	for id in descargas:
		var h: HTTPRequest = descargas[id]
		var total = h.get_body_size()
		progreso.emit(id, float(h.get_downloaded_bytes()) / total if total > 0 else 0.0)

func cancelar(id: String) -> void:
	if descargas.has(id): descargas[id].cancel_request(); descargas[id].queue_free(); descargas.erase(id); DirAccess.remove_absolute(ruta(id) + ".part"); cambiado.emit()

func borrar(id: String) -> void:
	if _cargado_id == id: _ctx = null; _modelo_llama = null; _cargado_id = ""
	DirAccess.remove_absolute(ruta(id))
	cambiado.emit()

func _modelo(id: String) -> Dictionary:
	for m in CATALOGO: if m.id == id: return m
	return {}

var _modelo_llama = null
var _ctx = null
var _cargado_id = ""
var _mutex = Mutex.new()
var tps_medido = 0.0

func hay_llama() -> bool: return ClassDB.class_exists("LlamaContext")

func _asegurar() -> bool:
	if not hay_llama() or modelo == "" or not descargado(modelo): return false
	if _cargado_id == modelo and _ctx != null: return true
	_modelo_llama = ClassDB.instantiate("LlamaModel")
	var gpu = 99 if acelerador == "gpu" else 0
	if _modelo_llama.call("load", ProjectSettings.globalize_path(ruta(modelo)), {"n_gpu_layers": gpu}) != OK: _modelo_llama = null; return false
	_ctx = ClassDB.instantiate("LlamaContext")
	var hilos = clampi(nucleos - 2 if OS.has_feature("mobile") else nucleos / 2, 2, 6)   # pocos hilos: menos calor y bateria
	if _ctx.call("create", _modelo_llama, {"n_ctx": contexto, "threads": hilos, "threads_batch": hilos}) != OK: _ctx = null; return false
	_cargado_id = modelo
	return true

func _plantilla(sistema: String, usuario: String) -> String:
	if modelo.begins_with("gemma"):
		return "<start_of_turn>user\n%s\n\n%s<end_of_turn>\n<start_of_turn>model\n" % [sistema, usuario]
	return "<|im_start|>system\n%s<|im_end|>\n<|im_start|>user\n%s<|im_end|>\n<|im_start|>assistant\n" % [sistema, usuario]

## Genera texto con el modelo local (bloqueante: llamalo desde un hilo).
## Devuelve "" si no hay motor local o no carga.
func generar(sistema: String, usuario: String, max_tokens := 60) -> String:
	if backend != "local": return ""
	_mutex.lock()
	var r = ""
	if _asegurar():
		_ctx.call("reset")
		_ctx.call("set_prompt", _plantilla(sistema, usuario))
		var t0 = Time.get_ticks_usec()
		r = str(_ctx.call("generate", max_tokens, {"temperature": temperatura, "top_p": 0.9, "top_k": 40, "repeat_penalty": 1.1,
			"stop_sequences": ["<end_of_turn>", "<|im_end|>", "\n\n"]}))
		var dt = (Time.get_ticks_usec() - t0) / 1000000.0
		var n = _modelo_llama.call("tokenize", r, false).size()
		if dt > 0: tps_medido = n / dt
	_mutex.unlock()
	return r.replace("<end_of_turn>", "").replace("<|im_end|>", "").strip_edges()

## Version asincrona: no congela el juego.
func generar_async(sistema: String, usuario: String, cb: Callable) -> void:
	WorkerThreadPool.add_task(func():
		var t = generar(sistema, usuario)
		cb.call_deferred(t))

func benchmark() -> String:
	var t0 = Time.get_ticks_msec()
	var r = generar("Eres un Sim de PixelSoft. Responde en español.", "Describe tu día en dos frases.", 64)
	if r == "":
		ultimo_benchmark = ("Sin motor local (falta el modelo o no carga). Estimado: %.0f tokens/s." % estimacion_tps(_modelo(modelo))) if modelo != "" else "Elige un modelo."
	else:
		ultimo_benchmark = "%.1f tokens/s (%s, %.1f s): «%s»" % [tps_medido, modelo, (Time.get_ticks_msec() - t0) / 1000.0, r.left(80)]
		if tps_medido < 3.0 and OS.has_feature("mobile"):
			backend = "demo"; guardar(); ultimo_benchmark += " — demasiado lento: se activa la IA simulada (puedes cambiarlo)."
	print("BENCH ", ultimo_benchmark)
	cambiado.emit(); return ultimo_benchmark
