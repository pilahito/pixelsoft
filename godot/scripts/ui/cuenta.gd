extends VBoxContainer
## Ajustes → Cuenta: guardado en la nube con Google (ver scripts/nube.gd).
## Si el juego se exporto sin client id de Google, la seccion no aparece.

const Tema = preload('res://scripts/ui/tema.gd')

var ui: Control
var N: Node

static func montar(ui_: Control, caja: Container) -> void:
	var nube = ui_.get_node_or_null("/root/Nube")
	if nube == null or not nube.disponible(): return
	var sec = ui_._seccion(caja, "Cuenta · Guardado en la nube")
	var p = load("res://scripts/ui/cuenta.gd").new()
	p.ui = ui_; p.N = nube
	sec.add_child(p)

func _ready() -> void:
	N.estado_cambiado.connect(_pintar)
	N.codigo_dispositivo.connect(func(_u, _c): _pintar())
	N.conflicto.connect(func(_l, _n): _dialogo_conflicto())
	_pintar()
	if not N.conflicto_pendiente.is_empty(): _dialogo_conflicto.call_deferred()

func _sub(t: String) -> Label: return ui._lbl(t, 0, Color(0, 0, 0, 0), "Sub")

func _fila(botones: Array) -> HBoxContainer:
	var h = HBoxContainer.new(); add_child(h)
	for b in botones: b.size_flags_horizontal = SIZE_EXPAND_FILL; h.add_child(b)
	return h

func _pintar() -> void:
	for c in get_children(): c.queue_free()
	if N.login_activo:
		if N.login_tipo == "dispositivo" and N.login_codigo != "":
			add_child(ui._lbl("1. Abre %s (en este móvil o en otro aparato)." % N.login_url_codigo.replace("https://", ""), 0))
			add_child(ui._lbl("2. Inicia sesión con Google y escribe este código:", 0))
			var cod = ui._lbl(N.login_codigo, 30, Tema.ACENTO); cod.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; add_child(cod)
			_fila([ui._btn("Copiar código y abrir", func(): DisplayServer.clipboard_set(N.login_codigo); N.abrir_enlace_login(), "", "BotonAcento"),
				ui._btn("Cancelar", N.cancelar_login)])
			add_child(_sub("Cuando aceptes en Google, PixelSoft se conectará solo."))
		else:
			add_child(_sub(N.estado_texto))
			_fila([ui._btn("Abrir el navegador otra vez", N.abrir_enlace_login), ui._btn("Cancelar", N.cancelar_login)])
		return
	if not N.conectado():
		add_child(_sub("Guarda tu partida en tu Google Drive, en una carpeta oculta que solo ve PixelSoft (no puede leer el resto de tu Drive). Así puedes seguir en el PC y en el móvil."))
		add_child(ui._btn("Iniciar sesión con Google", N.iniciar_sesion, "", "BotonAcento"))
		if N.estado_texto != "": add_child(_sub(N.estado_texto))
		return
	add_child(ui._lbl("Conectado" + ((" · " + N.cuenta()) if N.cuenta() != "" else ""), 0, Tema.ACENTO))
	var uc = N.ultima_copia()
	add_child(_sub("Última copia: " + (N.texto_fecha(uc) if uc > 0 else "todavía ninguna") + (" · pendiente de subir" if N.pendiente() else "")))
	if N.estado_texto != "": add_child(_sub(N.estado_texto))
	var au = CheckButton.new(); au.text = "Sincronizar sola al guardar y al abrir"; au.button_pressed = N.auto()
	au.toggled.connect(func(x): N.poner_auto(x)); add_child(au)
	var s = ui._btn("Subir ahora", func(): Juego.guardar(); N.subir_ahora(), "", "BotonAcento")
	var d = ui._btn("Descargar", _confirmar_descarga)
	s.disabled = N.ocupado; d.disabled = N.ocupado
	_fila([s, d])
	add_child(ui._btn("Cerrar sesión", N.cerrar_sesion, "", "BotonPeligro"))
	if N.variante != "publica": add_child(_sub("Versión privada: su copia va en un archivo distinto al de la versión normal."))

func _linea(titulo: String, i: Dictionary) -> String:
	if i.is_empty(): return "%s: no hay partida" % titulo
	return "%s: día %d · guardada el %s · %s" % [titulo, int(i.get("dia", 0)), N.texto_fecha(int(i.get("fecha", 0))), i.get("dispositivo", "")]

func _dialogo_conflicto() -> void:
	var c = N.conflicto_pendiente
	if c.is_empty(): return
	var dl = ConfirmationDialog.new(); ui.add_child(dl)
	dl.title = "¿Qué partida quieres conservar?"
	dl.dialog_text = "Tu partida de este dispositivo y la de Google Drive son distintas.\n\n%s\n%s\n\nSi eliges la de Google Drive, la de este dispositivo se guarda aparte como copia de seguridad (partida.json.antes_nube)." % [_linea("Este dispositivo", c.local), _linea("Google Drive", c.nube)]
	dl.dialog_autowrap = true
	dl.ok_button_text = "Usar la de este dispositivo"
	dl.cancel_button_text = "Decidir luego"
	dl.add_button("Usar la de Google Drive", true, "nube")
	var elegido = [false]
	dl.confirmed.connect(func(): elegido[0] = true; N.resolver_conflicto("local"))
	dl.custom_action.connect(func(a): if a == "nube": elegido[0] = true; dl.hide(); N.resolver_conflicto("nube"))
	dl.canceled.connect(func(): if not elegido[0]: N.resolver_conflicto("luego"))
	dl.visibility_changed.connect(func(): if not dl.visible: dl.queue_free())
	dl.popup_centered(Vector2i(620, 300))

func _confirmar_descarga() -> void:
	var i = await N.consultar_nube()
	if i.has("error"): return
	if i.is_empty(): ui._aviso("Todavía no hay ninguna copia en Google Drive."); return
	var dl = ConfirmationDialog.new(); ui.add_child(dl)
	dl.title = "Descargar de Google Drive"
	dl.dialog_text = "Se cambiará la partida de este dispositivo por la de Google Drive.\n\n%s\n%s\n\nLa actual se guarda aparte como copia de seguridad." % [_linea("Este dispositivo", N.info_local()), _linea("Google Drive", i)]
	dl.dialog_autowrap = true
	dl.ok_button_text = "Descargar"; dl.cancel_button_text = "Cancelar"
	dl.confirmed.connect(N.descargar_ahora)
	dl.visibility_changed.connect(func(): if not dl.visible: dl.queue_free())
	dl.popup_centered(Vector2i(620, 280))
