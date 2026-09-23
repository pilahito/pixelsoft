/**
 * Se trae las piezas para que el movil pueda ejecutar un modelo de verdad sin
 * PC, y las deja listas en public/ia/:
 *
 *   transformers.bundle.js        la libreria + ONNX Runtime, TODO en un fichero
 *   ort-wasm-simd-threaded*.wasm  el motor compilado a WebAssembly
 *
 * ¿Por que un bundle y no los ficheros tal cual?
 * Porque transformers.js trae un `import("onnxruntime-web/webgpu")` con un
 * nombre "pelado", y el navegador no sabe resolver eso sin un import map.
 * Empaquetandolo con esbuild, esos nombres se resuelven al construirlo y el
 * navegador recibe un fichero limpio que funciona en cualquier sitio.
 *
 * public/ia/ esta en .gitignore (son ~45 MB). El script del APK llama a este
 * automaticamente si faltan.
 *
 * Uso:  node tools/traer-ia.js
 *
 * El MODELO en si (~350-500 MB) NO se baja aqui: eso lo hace el movil la
 * primera vez que le das al boton, y se lo queda guardado.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'public', 'ia');
const TEMPORAL = path.join(DESTINO, '.construir');

const VERSION_TRANSFORMERS = '4.3.0';

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

/* ------------------------------------------------------------- esbuild */

const CANDIDATOS_ESBUILD = [
  process.env.ESBUILD,
  path.join(process.env.USERPROFILE || '', '.lmstudio', '.internal', 'utils', 'esbuild.exe'),
  path.join(RAIZ, 'node_modules', '.bin', 'esbuild.cmd'),
  'esbuild'
].filter(Boolean);

function buscarEsbuild() {
  for (const c of CANDIDATOS_ESBUILD) {
    try {
      execFileSync(c, ['--version'], { stdio: 'pipe', timeout: 20000 });
      return c;
    } catch (_) { /* siguiente */ }
  }
  return null;
}

/** Ejecuta algo guardando la salida, para poder ensenarla si falla. */
function correr(programa, args, opciones = {}) {
  const esLote = /\.(bat|cmd)$/i.test(programa);
  const orden = esLote ? 'cmd.exe' : programa;
  const argumentos = esLote ? ['/c', programa, ...args] : args;
  return execFileSync(orden, argumentos, { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024, ...opciones });
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log('');
  console.log('  Trayendo las piezas de IA para el movil');
  console.log('  ' + '-'.repeat(56));

  const esbuild = buscarEsbuild();
  if (!esbuild) {
    console.error('  No encuentro esbuild, y hace falta para empaquetar.');
    console.error('  Instalalo con:  npm install -g esbuild');
    console.error('');
    process.exit(1);
  }
  console.log(`  esbuild: ${esbuild}`);

  fs.mkdirSync(DESTINO, { recursive: true });
  fs.rmSync(TEMPORAL, { recursive: true, force: true });
  fs.mkdirSync(TEMPORAL, { recursive: true });

  // --- 1. Traer los paquetes con npm (ya resuelve las dependencias solo)
  console.log('');
  console.log(`  Instalando @huggingface/transformers@${VERSION_TRANSFORMERS}...`);
  fs.writeFileSync(path.join(TEMPORAL, 'package.json'),
    JSON.stringify({ name: 'pixelsoft-ia', private: true, type: 'module' }, null, 2));

  try {
    correr('npm', [
      'install',
      `@huggingface/transformers@${VERSION_TRANSFORMERS}`,
      '--no-audit', '--no-fund', '--omit=optional', '--omit=dev', '--loglevel=error'
    ], { cwd: TEMPORAL, shell: process.platform === 'win32' });
  } catch (e) {
    console.error('\n  Fallo el npm install:', String(e.stderr || e.message).slice(0, 600));
    process.exit(1);
  }

  // --- 2. Empaquetar TODO en un solo fichero
  console.log('  Empaquetando con esbuild...');
  const entrada = path.join(TEMPORAL, 'entrada.js');
  fs.writeFileSync(entrada, "export * from '@huggingface/transformers';\n");

  const bundle = path.join(DESTINO, 'transformers.bundle.js');
  try {
    correr(esbuild, [
      entrada,
      '--bundle',
      '--format=esm',
      '--platform=browser',
      '--target=es2022',
      // sharp y onnxruntime-node son para Node: en el navegador no pintan nada
      '--external:sharp',
      '--external:onnxruntime-node',
      '--external:fs',
      '--external:path',
      `--outfile=${bundle}`,
      '--log-level=warning'
    ], { cwd: TEMPORAL });
  } catch (e) {
    console.error('\n  Fallo el empaquetado:', String(e.stderr || e.message).slice(0, 900));
    process.exit(1);
  }
  console.log(`  transformers.bundle.js            ${mb(fs.statSync(bundle).size).padStart(8)}`);

  // --- 3. Copiar el motor de WebAssembly (eso no se puede empaquetar)
  //
  // Van las CUATRO variantes a proposito. ONNX Runtime elige una u otra segun
  // lo que encuentre en el movil (varios nucleos, asyncify, WebGPU...), y el
  // nombre lo construye a trozos en tiempo de ejecucion, asi que no hay forma
  // de saber de antemano cual va a pedir. Mejor tenerlas todas que comerse un
  // 404 a mitad de la descarga del modelo.
  const distOrt = path.join(TEMPORAL, 'node_modules', 'onnxruntime-web', 'dist');
  if (!fs.existsSync(distOrt)) {
    console.error('\n  No encuentro onnxruntime-web dentro del npm install.');
    process.exit(1);
  }

  let total = fs.statSync(bundle).size;
  const motores = fs.readdirSync(distOrt)
    .filter((n) => /^ort-wasm-.*\.(mjs|wasm)$/.test(n));

  if (!motores.length) {
    console.error('\n  No hay ficheros ort-wasm-* en onnxruntime-web/dist');
    process.exit(1);
  }

  for (const nombre of motores) {
    const destino = path.join(DESTINO, nombre);
    fs.copyFileSync(path.join(distOrt, nombre), destino);
    const t = fs.statSync(destino).size;
    total += t;
    console.log(`  ${nombre.padEnd(40)} ${mb(t).padStart(8)}`);
  }

  // --- 4. Limpiar
  fs.rmSync(TEMPORAL, { recursive: true, force: true });

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
