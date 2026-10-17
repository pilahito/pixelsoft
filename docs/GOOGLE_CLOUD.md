# Guardado en la nube con Google (PixelSoft 2.x)

PixelSoft puede guardar la partida en el **Google Drive del jugador**, en la
carpeta oculta de la aplicación (`appDataFolder`). El permiso que se pide es
`https://www.googleapis.com/auth/drive.appdata`, el más restringido: el juego
**solo** ve sus propios archivos y no puede leer ni tocar el resto del Drive.
El jugador tampoco ve ese archivo en drive.google.com (aparece en *Drive →
Ajustes → Gestionar aplicaciones*, desde donde se puede borrar).

El juego **no trae ningún client id**: hasta que sigas esta guía, la sección
*Ajustes → Cuenta* no aparece. Los client id se guardan en un archivo tuyo
**fuera del repositorio** y se meten en el juego solo al exportar.

## Cómo inicia sesión en cada plataforma

| Plataforma | Tipo de cliente OAuth | Cómo funciona |
|---|---|---|
| PC (Windows) | **App de escritorio** | Abre tu navegador, inicias sesión y Google vuelve a `http://127.0.0.1:<puerto aleatorio>`, donde el juego escucha un momento. Con PKCE (S256). |
| Android | **TV y dispositivos de entrada limitada** | El juego muestra un código. Pulsas «Copiar código y abrir», se abre `google.com/device`, pegas el código, aceptas y vuelves al juego, que se conecta solo. |

¿Por qué en Android no se usa el cliente de tipo «Android»? Desde 2023 Google
desactiva por defecto las redirecciones con esquema propio (`com.pixelsoft.juego:/…`)
en los clientes Android, y la redirección a 127.0.0.1 en móviles está obsoleta.
Lo que Google recomienda es su SDK nativo (Credential Manager / Authorization API),
que obligaría a pasar el APK a compilación Gradle con un plugin de Android. El
flujo «de dispositivo» funciona hoy sin SDK, sin plugin y sin tocar el
AndroidManifest, y admite exactamente el permiso `drive.appdata`. El cliente
Android se puede crear igualmente (paso 6, opcional) por si más adelante se
hace el plugin nativo.

## Pasos en Google Cloud Console

Todo es gratis (no hace falta activar facturación).

1. **Proyecto.** Entra en <https://console.cloud.google.com/> con tu cuenta de
   Google → selector de proyectos (arriba) → **Proyecto nuevo** → nombre
   `PixelSoft` → **Crear**. Comprueba que queda seleccionado arriba.

2. **Activar la API de Drive.** Menú ☰ → **APIs y servicios → Biblioteca** →
   busca **Google Drive API** → **Habilitar**.

3. **Pantalla de consentimiento** (menú ☰ → **Google Auth Platform**, antes
   «Pantalla de consentimiento de OAuth») → **Empezar**:
   - *Información de la aplicación*: nombre `PixelSoft` y tu correo como
     correo de asistencia.
   - *Audiencia*: **Externos**.
   - *Información de contacto*: tu correo. Acepta la política y **Crear**.
   - **Audiencia → Usuarios de prueba → Añadir usuarios**: tu cuenta de Gmail
     (y la de cualquiera que vaya a probarlo; máximo 100). El estado de
     publicación se queda en **Pruebas**.
   - **Acceso a datos → Añadir o quitar permisos** → filtra por `drive.appdata`
     → marca `.../auth/drive.appdata` («Ver y gestionar los datos de
     configuración de su propia aplicación en Google Drive») → **Actualizar** →
     **Guardar**. Es un permiso **no sensible**.

4. **Cliente de PC.** **Google Auth Platform → Clientes → Crear cliente**:
   - Tipo de aplicación: **Aplicación de escritorio**. Nombre: `PixelSoft PC`.
   - **Crear** y copia el **ID de cliente** (`….apps.googleusercontent.com`) y
     el **secreto del cliente** (`GOCSPX-…`). No hace falta configurar URIs:
     los clientes de escritorio aceptan `127.0.0.1` con cualquier puerto.

5. **Cliente de Android (código en google.com/device).** Otra vez **Crear
   cliente**:
   - Tipo de aplicación: **TV y dispositivos de entrada limitada**. Nombre:
     `PixelSoft Android`.
   - **Crear** y copia su **ID de cliente** y su **secreto**. Sirve para las
     dos versiones (normal y privada).

6. **(Opcional, para el futuro) Clientes de tipo Android.** No los usa el juego
   actual; solo harían falta con un plugin nativo de inicio de sesión. Si
   quieres dejarlos hechos, crea dos clientes de tipo **Android**:

   | Nombre | Nombre del paquete | Huella SHA-1 |
   |---|---|---|
   | `PixelSoft Android (normal)` | `com.pixelsoft.juego` | `67:FD:A2:02:84:AC:D8:A9:72:EB:EC:34:27:C5:40:0E:75:FF:65:A8` |
   | `PixelSoft Android (privado)` | `com.pixelsoft.juego.privado` | `67:FD:A2:02:84:AC:D8:A9:72:EB:EC:34:27:C5:40:0E:75:FF:65:A8` |

   Esa huella es la del certificado de `G:\pixelsoft\apk\debug.keystore`
   (alias `pixelsoft`, `CN=PixelSoft, OU=Juego, O=PixelSoft, L=Madrid, C=ES`),
   la clave con la que se firman los APK desde la 2.0.0 (SHA-256
   `0B:B9:8F:39:59:43:4F:28:3E:82:14:14:F9:C0:E6:CC:33:AC:EF:2E:7A:8F:A0:0A:B8:D4:E7:1B:8B:9A:E7:C5`).
   Para comprobarla tú (te pedirá la contraseña del keystore):

   ```powershell
   & "C:\Program Files\Eclipse Adoptium\jre-17.0.20.101-hotspot\bin\keytool.exe" -list -v -keystore G:\pixelsoft\apk\debug.keystore -alias pixelsoft
   ```

## Meter los client id en el juego (sin subirlos al repo)

1. Copia `tools/nube/google_oauth.ejemplo.json` a una carpeta **fuera del
   repositorio**, por ejemplo `D:\claves\google_oauth.json`, y rellénalo:

   ```json
   {
     "escritorio":  { "client_id": "….apps.googleusercontent.com", "client_secret": "GOCSPX-…" },
     "dispositivo": { "client_id": "….apps.googleusercontent.com", "client_secret": "GOCSPX-…" }
   }
   ```

   Los client id y secretos de apps instaladas **no son secretos de verdad**
   (cualquiera puede sacarlos del .exe), pero igualmente no van al repo.
   `godot/config_local/` y `google_oauth.json` están en `.gitignore`.

2. Exporta con el script, que copia el archivo a `godot/config_local/` solo
   durante la exportación y lo borra al acabar:

   ```powershell
   # PC (y APK sin tu firma):
   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json -Solo windows
   # Envolviendo otro script de exportación (APK firmado con tu clave):
   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json -Script tools\exportar-godot.ps1
   # PixelSoft Privado:
   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json -Script tools\dlc\exportar-privado.ps1 -ScriptArgs '-Codigo','D:\claves\codigo.txt','-Salida','G:\PixelSoft-Privado'
   ```

3. **Probar en el PC sin exportar:** copia el JSON a
   `%APPDATA%\Godot\app_userdata\PixelSoft\google_oauth.json` y abre el juego
   (o el editor). El juego también lo busca ahí.

## Usarlo en el juego

*Ajustes → Cuenta · Guardado en la nube*:

- **Iniciar sesión con Google** / **Cerrar sesión** (al cerrar se revoca el
  permiso; la partida local se queda).
- Estado, cuenta conectada y **Última copia** (fecha y hora).
- **Subir ahora** y **Descargar** (pide confirmación y enseña día y fecha de
  cada copia).
- **Sincronizar sola al guardar y al abrir** (activado por defecto). En PC, al
  cerrar la ventana espera hasta 8 s a que se suba la última partida.
- **Conflictos:** si la partida de este dispositivo y la de la nube han
  cambiado las dos desde la última sincronización, sale un diálogo con el
  **día de juego, la fecha y el dispositivo** de cada una para elegir. Si eliges
  la de la nube, la local se guarda aparte como `partida.json.antes_nube`.
- **Sin conexión:** no se pierde nada. El juego compara la huella (MD5) de la
  partida con la de la última copia sincronizada, marca «pendiente» y lo
  reintenta cada minuto y al volver a la app.
- La versión **normal** usa `pixelsoft_partida.json` y la **privada**
  `pixelsoft_privado_partida.json`: nunca se pisan.
- El *refresh token* se guarda **cifrado** en el dispositivo
  (`user://nube_token.dat`, clave ligada al aparato). Nunca va al repo ni a la nube.

## Avisos

- **Modo «Pruebas»:** Google caduca la sesión a los **7 días** en las apps que
  están en pruebas; el juego avisa y basta con volver a iniciar sesión. Para
  quitarlo, en *Google Auth Platform → Audiencia* pulsa **Publicar aplicación**.
  Con solo `drive.appdata` (no sensible) normalmente no hace falta la
  verificación de Google; hasta que la tenga, los jugadores verán el aviso de
  «Google no ha verificado esta aplicación» y pueden continuar en *Configuración
  avanzada*.
- Errores típicos: `access_denied` o «app bloqueada» → tu cuenta no está en
  *Usuarios de prueba*; `invalid_client` → client id o secreto mal copiados o
  del tipo equivocado (el de PC tiene que ser *Escritorio* y el de Android *TV y
  dispositivos de entrada limitada*).
- Quitar el acceso: <https://myaccount.google.com/permissions> → PixelSoft.

## Pruebas automáticas (sin credenciales)

```powershell
powershell -File tools\nube\probar-nube.ps1
```

Arranca un servidor **falso** de Google en `127.0.0.1` (`tools/nube/servidor-falso.cjs`)
y ejecuta `godot/tests/test_nube.gd` (50 comprobaciones): decisión de
sincronización, PKCE, inicio de sesión de PC por 127.0.0.1, flujo con código de
Android, subida y bajada en `appDataFolder`, conflictos, cola sin conexión,
renovación del token, token cifrado tras reiniciar, versión privada separada,
cierre de sesión y permiso retirado. Usa un `APPDATA` temporal, así que no toca
tus partidas.
