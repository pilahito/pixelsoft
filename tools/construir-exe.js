/**
 * Construye PixelSoft.exe: un ejecutable de Windows que lleva dentro Node y
 * el juego entero, para que funcione sin tener Node instalado.
 *
 *   node tools/construir-exe.js
 *
 * Genera PixelSoft.exe en la raiz del proyecto.
 *
 * Como funciona:
 *   1. esbuild empaqueta el servidor en UN solo fichero CommonJS (dentro de un
 *      ejecutable de Node no se pueden cargar modulos sueltos).
 *   2. Node incrusta ese fichero como programa principal y la carpeta public/
 *      como "assets" (ficheros en memoria).
 *   3. El resultado es un unico .exe autonomo.
 *
 * Necesita Node 24 o superior (usa --build-sea) y esbuild. No hace falta
 * instalar nada si tienes LM Studio: trae esbuild dentro.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const SALIDA = path.join(RAIZ, 'PixelSoft.exe');
const CARPETA_BUILD = path.join(RAIZ, '.build');
const BUNDLE = path.join(CARPETA_BUILD, 'pixelsoft.cjs');
const CONFIG_SEA = path.join(CARPETA_BUILD, 'sea-config.json');
const ENTRADA = path.join(AQUI, 'entrada-exe.js');

/* ------------------------------------------------------------- esbuild */

const CANDIDATOS_ESBUILD = [
  process.env.ESBUILD,
  path.join(process.env.USERPROFILE || '', '.lmstudio', '.internal', 'utils', 'esbuild.exe'),
  path.join(RAIZ, 'node_modules', '.bin', 'esbuild.cmd'),
  path.join(RAIZ, 'node_modules', '.bin', 'esbuild'),
  'esbuild'
].filter(Boolean);

function buscarEsbuild() {
  for (const candidato of CANDIDATOS_ESBUILD) {
    try {
      execFileSync(candidato, ['--version'], { stdio: 'pipe', timeout: 20000 });
      return candidato;
    } catch (_) {
      /* probamos el siguiente */
    }
  }
  return null;
}

/* -------------------------------------------------------------- ficheros */

/** Recorre una ruta y devuelve todos los ficheros que contiene. */
function listarFicheros(absoluta) {
  const stat = fs.statSync(absoluta);
  if (stat.isFile()) return [absoluta];
  const salida = [];
  for (const entrada of fs.readdirSync(absoluta, { withFileTypes: true })) {
    if (entrada.name.startsWith('.')) continue;
    salida.push(...listarFicheros(path.join(absoluta, entrada.name)));
  }
  return salida;
}

/* ------------------------------------------------------------------ main */

function main() {
  const version = process.versions.node.split('.').map(Number);
  if (version[0] < 24) {
    console.error(`\n  Necesitas Node 24 o superior para construir el .exe (tienes ${process.versions.node}).\n`);
    process.exit(1);
  }

  console.log('');
  console.log('  Construyendo PixelSoft.exe');
  console.log('  ' + '-'.repeat(56));

  const esbuild = buscarEsbuild();
  if (!esbuild) {
    console.error('  No encuentro esbuild.');
    console.error('  Instalalo con:  npm install -g esbuild');
    console.error('  O define la variable ESBUILD con la ruta al ejecutable.');
    console.error('');
    process.exit(1);
  }
  console.log(`  esbuild             : ${esbuild}`);

  fs.mkdirSync(CARPETA_BUILD, { recursive: true });

  // --- 1. Empaquetar el servidor en un solo fichero
  console.log('  Empaquetando el servidor...');
  try {
    execFileSync(esbuild, [
      ENTRADA,
      '--bundle',
      '--platform=node',
      '--format=cjs',
      '--target=node20',
      `--outfile=${BUNDLE}`,
      '--log-level=warning'
    ], { cwd: RAIZ, stdio: 'inherit' });
  } catch (e) {
    console.error('\n  Fallo el empaquetado con esbuild.\n');
    process.exit(1);
  }

  const kbBundle = (fs.statSync(BUNDLE).size / 1024).toFixed(0);
  console.log(`  Servidor empaquetado: ${kbBundle} KB`);

  // --- 2. Recoger los ficheros del juego que van incrustados
  //
  // Se deja fuera public/ia/ a proposito: son 84 MB de motor de IA para
  // ejecutar un modelo DENTRO del navegador, y eso es cosa del movil. En el PC
  // la IA la pone LM Studio, asi que meterlo aqui solo serviria para que el
  // .exe pesara el doble sin ganar nada. Si alguien le da al boton de la IA del
  // movil en el PC, el juego se lo dice con un mensaje claro en vez de romperse.
  const assets = {};
  let bytes = 0;
  for (const fichero of listarFicheros(path.join(RAIZ, 'public'))) {
    const clave = path.relative(RAIZ, fichero).replace(/\\/g, '/');
    if (clave.startsWith('public/ia/')) continue;
    assets[clave] = fichero;
    bytes += fs.statSync(fichero).size;
  }
  console.log(`  Ficheros incrustados: ${Object.keys(assets).length} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

  // --- 3. Construir el ejecutable
  if (fs.existsSync(SALIDA)) {
    try { fs.unlinkSync(SALIDA); } catch (_) { /* se sobreescribe igual */ }
  }

  fs.writeFileSync(CONFIG_SEA, JSON.stringify({
    main: path.relative(RAIZ, BUNDLE).replace(/\\/g, '/'),
    output: path.relative(RAIZ, SALIDA).replace(/\\/g, '/'),
    disableExperimentalSEAWarning: true,
    assets
  }, null, 2), 'utf8');

  console.log('  Empaquetando Node + juego...');
  try {
    execFileSync(process.execPath, [`--build-sea=${CONFIG_SEA}`], { cwd: RAIZ, stdio: 'pipe' });
  } catch (e) {
    console.error('\n  Fallo el empaquetado del ejecutable:', e.message, '\n');
    if (e.stderr) console.error(String(e.stderr));
    process.exit(1);
  }

  if (!fs.existsSync(SALIDA)) {
    console.error('\n  No se ha generado el ejecutable.\n');
    process.exit(1);
  }

  const mb = (fs.statSync(SALIDA).size / 1024 / 1024).toFixed(1);
  console.log('  ' + '-'.repeat(56));
  console.log(`  Listo: ${SALIDA}  (${mb} MB)`);
  console.log('');
  console.log('  Doble clic y se abre el navegador solo.');
  console.log('  Para jugar desde el movil:  PixelSoft.exe --red');
  console.log('');
}

main();
