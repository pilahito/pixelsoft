/**
 * Se trae las piezas necesarias para que el movil pueda ejecutar un modelo de
 * verdad sin depender del PC:
 *
 *   - transformers.js  (la libreria que carga y usa el modelo)
 *   - ONNX Runtime Web (el motor que ejecuta el modelo en el navegador)
 *
 * Van a public/ia/, que esta en .gitignore porque son ~41 MB de binarios.
 * El script que construye el APK lo llama solo si faltan, asi que normalmente
 * no hace falta ejecutarlo a mano.
 *
 * Uso:  node tools/traer-ia.js
 *
 * El MODELO en si (~460 MB) NO se descarga aqui: eso se lo baja el movil la
 * primera vez que le des al boton, y se lo queda guardado.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'public', 'ia');

const VERSION_TRANSFORMERS = '4.3.0';
const VERSION_ORT = '1.31.0-dev.20260914-8d85527a0';

const BASE_T = `https://registry.npmjs.org/@huggingface/transformers/-/transformers-${VERSION_TRANSFORMERS}.tgz`;
const BASE_O = `https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-${VERSION_ORT}.tgz`;

/**
 * Cada pieza: de donde sale dentro del paquete y como se llama en public/ia/.
 * Los dos .wasm son grandes porque son el motor entero compilado a WebAssembly:
 * el normal para CPU y el "jsep" para cuando el movil tiene WebGPU.
 */
const PIEZAS = [
  { paquete: 'transformers', origen: 'package/dist/transformers.web.min.js', destino: 'transformers.web.min.js' },
  { paquete: 'ort', origen: 'package/dist/ort-wasm-simd-threaded.mjs', destino: 'ort-wasm-simd-threaded.mjs' },
  { paquete: 'ort', origen: 'package/dist/ort-wasm-simd-threaded.wasm', destino: 'ort-wasm-simd-threaded.wasm' },
  { paquete: 'ort', origen: 'package/dist/ort-wasm-simd-threaded.jsep.mjs', destino: 'ort-wasm-simd-threaded.jsep.mjs' },
  { paquete: 'ort', origen: 'package/dist/ort-wasm-simd-threaded.jsep.wasm', destino: 'ort-wasm-simd-threaded.jsep.wasm' }
];

/* -------------------------------------------------------------- utilidades */

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

/** Descarga una URL a un fichero, informando del progreso a saltos. */
async function descargar(url, destino, etiqueta) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${etiqueta}`);

  const total = Number(res.headers.get('content-length') || 0);
  const trozos = [];
  let leidos = 0;
  let ultimoAviso = -1;

  for await (const trozo of res.body) {
    trozos.push(trozo);
    leidos += trozo.length;
    if (!total) continue;
    // Solo avisamos cada 25%: si no, en una consola sin terminal esto escupe
    // miles de lineas y no hay quien lea nada.
    const tramo = Math.floor((leidos / total) * 4);
    if (tramo !== ultimoAviso) {
      ultimoAviso = tramo;
      console.log(`    ${etiqueta} ... ${Math.min(100, tramo * 25)}%`);
    }
  }

  fs.writeFileSync(destino, Buffer.concat(trozos));
  return leidos;
}

/* -------------------------------------------------------------------- main */

async function main() {
  console.log('');
  console.log('  Trayendo las piezas de IA para el movil');
  console.log('  ' + '-'.repeat(56));
  console.log(`  transformers.js ${VERSION_TRANSFORMERS}`);
  console.log(`  onnxruntime-web ${VERSION_ORT}`);
  console.log('');

  fs.mkdirSync(DESTINO, { recursive: true });

  // Cada paquete se extrae en SU PROPIA carpeta: si no, el segundo pisaria al
  // primero, porque los dos .tgz llevan dentro una carpeta "package/".
  const temporal = path.join(DESTINO, '.tmp');
  fs.rmSync(temporal, { recursive: true, force: true });
  fs.mkdirSync(temporal, { recursive: true });

  const { execFileSync } = await import('node:child_process');

  for (const [nombre, url] of [['transformers', BASE_T], ['ort', BASE_O]]) {
    const suya = path.join(temporal, nombre);
    fs.mkdirSync(suya, { recursive: true });
    const tgz = path.join(suya, `${nombre}.tgz`);
    const tam = await descargar(url, tgz, `paquete ${nombre}`);
    execFileSync('tar', ['-xzf', tgz, '-C', suya], { stdio: 'pipe' });
    fs.unlinkSync(tgz);
    console.log(`  paquete ${nombre.padEnd(24)} ${mb(tam)}`);
  }

  console.log('');
  let total = 0;
  for (const pieza of PIEZAS) {
    const origen = path.join(temporal, pieza.paquete, pieza.origen);
    if (!fs.existsSync(origen)) {
      console.error(`  FALTA ${pieza.origen} dentro del paquete ${pieza.paquete}`);
      process.exit(1);
    }
    const destino = path.join(DESTINO, pieza.destino);
    fs.copyFileSync(origen, destino);
    const tam = fs.statSync(destino).size;
    total += tam;
    console.log(`  ${pieza.destino.padEnd(38)} ${mb(tam).padStart(8)}`);
  }

  fs.rmSync(temporal, { recursive: true, force: true });

  console.log('  ' + '-'.repeat(56));
  console.log(`  Total: ${mb(total)} en public/ia/`);
  console.log('');
  console.log('  (El modelo en si no va aqui: se lo baja el movil la primera vez)');
  console.log('');
}

main().catch((e) => {
  console.error('\n  Fallo:', e.message, '\n');
  process.exit(1);
});
