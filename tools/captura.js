'use strict';

/**
 * Herramienta de verificacion: abre el juego en Edge headless, espera, hace
 * una captura PNG y ademas informa de los errores de consola.
 *
 * Sirve para comprobar que el pixel art y la interfaz se pintan de verdad
 * sin tener que abrir el navegador a mano.
 *
 * Uso:
 *   node tools/captura.js [url] [salida.png] [ancho] [alto] [esperaMs] [jsAntes]
 *
 * Ejemplo:
 *   node tools/captura.js http://127.0.0.1:3777 captura.png 1600 1000 5000
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RUTAS_EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

const url = process.argv[2] || 'http://127.0.0.1:3777';
const salida = path.resolve(process.argv[3] || 'captura.png');
const ancho = Number(process.argv[4] || 1600);
const alto = Number(process.argv[5] || 1000);
const espera = Number(process.argv[6] || 5000);

// El JS a ejecutar antes de la captura. Si empieza por @, se lee de un fichero
// (comodo para scripts largos y para no pelearse con las comillas del shell).
let jsAntes = process.argv[7] || '';
if (jsAntes.startsWith('@')) jsAntes = fs.readFileSync(jsAntes.slice(1), 'utf8');

const navegador = RUTAS_EDGE.find((p) => fs.existsSync(p));
if (!navegador) {
  console.error('No encuentro Edge ni Chrome en las rutas habituales.');
  process.exit(1);
}

const PUERTO_CDP = 9222 + Math.floor(Math.random() * 500);
// Perfil FIJO, no uno nuevo cada vez. Importa mucho: asi el navegador conserva
// lo que tenga cacheado entre pruebas. Cuando el modelo de IA son 350 MB,
// bajarlo en cada ejecucion es una tortura. Para empezar de cero:
//   PIXELSOFT_PERFIL_LIMPIO=1 node tools/captura.js ...
const perfil = path.join(os.tmpdir(), 'pixelsoft-cdp');
if (process.env.PIXELSOFT_PERFIL_LIMPIO) {
  fs.rmSync(perfil, { recursive: true, force: true });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function obtenerObjetivo() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`);
      const lista = await r.json();
      const pagina = lista.find((t) => t.type === 'page');
      if (pagina && pagina.webSocketDebuggerUrl) return pagina;
    } catch (_) { /* aun no ha arrancado */ }
    await esperar(250);
  }
  throw new Error('Edge no ha abierto el puerto de depuracion.');
}

/** Cliente CDP minimo sobre WebSocket. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pendientes = new Map();
    this.errores = [];
    this.avisos = [];

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pendientes.has(msg.id)) {
        const { resolver, rechazar } = this.pendientes.get(msg.id);
        this.pendientes.delete(msg.id);
        if (msg.error) rechazar(new Error(msg.error.message));
        else resolver(msg.result);
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        this.errores.push((d.exception && d.exception.description) || d.text || 'excepcion');
      }
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        const texto = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        (msg.params.type === 'error' ? this.errores : this.avisos).push(texto);
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.errores.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
      }
    });
  }

  enviar(method, params = {}) {
    const id = ++this.id;
    // 120 s y no 30: cuando el navegador esta ejecutando un modelo de IA puede
    // tardar bastante en atender una captura de pantalla.
    const limite = 120000;
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

(async () => {
  const proceso = spawn(navegador, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${perfil}`,
    `--window-size=${ancho},${alto}`,
    `--remote-debugging-port=${PUERTO_CDP}`,
    'about:blank'
  ], { stdio: 'ignore', detached: false });

  try {
    const objetivo = await obtenerObjetivo();
    const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res);
      ws.addEventListener('error', () => rej(new Error('No he podido conectar con Edge')));
    });

    const cdp = new Cdp(ws);
    await cdp.enviar('Runtime.enable');
    await cdp.enviar('Log.enable');
    await cdp.enviar('Page.enable');
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: ancho, height: alto, deviceScaleFactor: 1, mobile: false
    });

    await cdp.enviar('Page.navigate', { url });
    await esperar(espera);

    if (jsAntes) {
      const r = await cdp.enviar('Runtime.evaluate', { expression: jsAntes, awaitPromise: true, returnByValue: true });
      console.log('  JS ejecutado ->', JSON.stringify(r.result && r.result.value));
      await esperar(Number(process.argv[8] || 1500));
    }

    const captura = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, Buffer.from(captura.data, 'base64'));

    // Un poco de informacion util del propio juego
    const info = await cdp.enviar('Runtime.evaluate', {
      returnByValue: true,
      expression: `JSON.stringify({
        dinero: (document.getElementById('hud-dinero')||{}).textContent,
        dia: (document.getElementById('hud-dia')||{}).textContent,
        calidad: (document.getElementById('hud-calidad')||{}).textContent,
        ia: (document.getElementById('ia-texto')||{}).textContent,
        sucesos: (document.getElementById('registro')||{children:[]}).children.length,
        cuentas: (document.getElementById('cuentas')||{children:[]}).children.length,
        destinos: (document.getElementById('charla-destinos')||{children:[]}).children.length,
        canvas: (function(c){ return c ? c.width+'x'+c.height : 'sin canvas'; })(document.getElementById('oficina'))
      })`
    });

    console.log('  Captura guardada en    :', salida);
    console.log('  Estado de la interfaz  :', info.result.value);
    console.log('  Errores de consola     :', cdp.errores.length);
    cdp.errores.slice(0, 15).forEach((e) => console.log('     ! ' + String(e).split('\n')[0]));
    if (cdp.avisos.length) {
      console.log('  Avisos                 :', cdp.avisos.length);
      cdp.avisos.slice(0, 5).forEach((a) => console.log('     ~ ' + String(a).split('\n')[0]));
    }

    ws.close();
  } catch (e) {
    console.error('Fallo la captura:', e.message);
    process.exitCode = 1;
  } finally {
    proceso.kill();
  }
})();
