/**
 * PROBAR EL APK POR DENTRO
 *
 * Arranca el APK en el emulador o en un movil enchufado, se engancha al WebView
 * por el protocolo de depuracion de Chrome y ejecuta codigo JavaScript dentro
 * de la pagina. Sirve para comprobar cosas que desde fuera no se ven: si el
 * motor de IA carga, si el aislamiento esta activo, que dice la consola...
 *
 * Uso:
 *   node tools/probar-apk.js "expresion javascript a evaluar"
 *   node tools/probar-apk.js --captura salida.png "expresion"
 *
 * Necesita que el APK tenga activada la depuracion del WebView (MainActivity
 * llama a setWebContentsDebuggingEnabled).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const ADB = process.env.ADB || 'C:\\Android\\Sdk\\platform-tools\\adb.exe';
const PAQUETE = 'com.pixelsoft.juego';
const PUERTO = 9223;

const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();

/* --------------------------------------------------------- conectar a CDP */

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarObjetivo(intentos = 30) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json`);
      const lista = await r.json();
      const pagina = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pagina) return pagina;
    } catch (_) { /* todavia no */ }
    await dormir(1000);
  }
  throw new Error('No he podido engancharme al WebView. ¿Esta el APK abierto y con depuracion activada?');
}

/** Cliente CDP minimo, el mismo rollo que usa captura.js. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pendientes = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pendientes.has(m.id)) {
        const { resolver, rechazar } = this.pendientes.get(m.id);
        this.pendientes.delete(m.id);
        if (m.error) rechazar(new Error(m.error.message));
        else resolver(m.result);
      }
    });
  }

  enviar(method, params = {}, limite = 180000) {
    const id = ++this.id;
    return new Promise((resolver, rechazar) => {
      this.pendientes.set(id, { resolver, rechazar });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pendientes.has(id)) {
          this.pendientes.delete(id);
          rechazar(new Error('Timeout en ' + method));
        }
      }, limite);
    });
  }
}

/* -------------------------------------------------------------------- main */

async function main() {
  const args = process.argv.slice(2);
  let captura = null;
  if (args[0] === '--captura') {
    captura = args[1];
    args.splice(0, 2);
  }
  const expresion = args.join(' ') || 'JSON.stringify({listo:true})';

  console.log('');
  console.log('  Probando el APK por dentro');
  console.log('  ' + '-'.repeat(52));

  const dispositivos = adb('devices').split('\n').slice(1).filter((l) => l.includes('device'));
  if (!dispositivos.length) {
    console.error('  No hay ningun movil ni emulador conectado.');
    process.exit(1);
  }
  console.log(`  dispositivos: ${dispositivos.length}`);

  // Arrancar limpio
  adb('shell', 'am', 'force-stop', PAQUETE);
  await dormir(1200);
  adb('shell', 'am', 'start', '-n', `${PAQUETE}/.MainActivity`);
  console.log('  APK arrancado, esperando al WebView...');
  await dormir(6000);

  // Buscar el socket del WebView y traerlo a un puerto local
  const unix = adb('shell', 'cat', '/proc/net/unix');
  const lineas = unix.split('\n').filter((l) => l.includes('webview_devtools_remote'));
  if (!lineas.length) {
    console.error('  El WebView no expone depuracion. ¿Seguro que el APK es el nuevo?');
    process.exit(1);
  }
  // El nombre viene con una arroba delante (@webview_devtools_remote_1234),
  // pero adb no la espera en localabstract: hay que quitarsela.
  const socket = lineas[0].trim().split(/\s+/).pop().replace(/^@/, '');
  console.log(`  socket: ${socket}`);

  try { adb('forward', '--remove', `tcp:${PUERTO}`); } catch (_) { /* no estaba */ }
  adb('forward', `tcp:${PUERTO}`, `localabstract:${socket}`);

  const objetivo = await esperarObjetivo();
  console.log(`  enganchado a: ${objetivo.url || objetivo.title}`);

  // Conectar y evaluar
  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('No he podido abrir el canal CDP')), { once: true });
  });

  const cdp = new Cdp(ws);
  await cdp.enviar('Runtime.enable');
  await cdp.enviar('Page.enable');

  console.log('');
  console.log('  Evaluando...');
  const r = await cdp.enviar('Runtime.evaluate', {
    expression: expresion,
    awaitPromise: true,
    returnByValue: true
  });

  if (r.exceptionDetails) {
    console.log('  ERROR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  } else {
    const v = r.result.value;
    console.log('  ' + (typeof v === 'string' ? v : JSON.stringify(v, null, 2)));
  }

  if (captura) {
    const destino = path.resolve(captura);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const foto = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(destino, Buffer.from(foto.data, 'base64'));
    console.log(`  captura: ${destino}`);
  }

  ws.close();
  try { adb('forward', '--remove', `tcp:${PUERTO}`); } catch (_) { /* da igual */ }
  console.log('');
}

main().catch((e) => {
  console.error('\n  Fallo:', e.message, '\n');
  process.exit(1);
});
