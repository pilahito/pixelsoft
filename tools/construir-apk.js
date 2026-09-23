/**
 * Construye PixelSoft.apk: el juego para Android, autonomo y sin dependencias.
 *
 *   node tools/construir-apk.js
 *
 * Genera PixelSoft.apk en la raiz del proyecto.
 *
 * No usa Gradle ni necesita internet: llama directamente a las herramientas del
 * SDK de Android (aapt2, d8, zipalign, apksigner) y al JDK. El APK lleva dentro
 * la carpeta public/ entera, asi que funciona sin PC y sin conexion.
 *
 * Necesita el SDK de Android. Se busca en estas rutas:
 *   C:\Android\Sdk, %LOCALAPPDATA%\Android\Sdk, o la variable ANDROID_HOME.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const PROYECTO = path.join(RAIZ, 'apk');
const CONSTRUIR = path.join(PROYECTO, 'build');
const ASSETS = path.join(PROYECTO, 'assets');
const SALIDA = path.join(RAIZ, 'PixelSoft.apk');

const API = '34';
const MIN_SDK = '21';
const TARGET_SDK = '34';

const NOMBRE_APP = 'PixelSoft';
const CLAVE_ALIAS = 'pixelsoft';
const CLAVE_PASS = 'pixelsoft';
const ALMACEN = path.join(PROYECTO, 'debug.keystore');

/* ------------------------------------------------------- buscar el SDK */

const CANDIDATOS_SDK = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  'C:\\Android\\Sdk',
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk')
].filter(Boolean);

function buscarSdk() {
  for (const candidato of CANDIDATOS_SDK) {
    if (candidato && fs.existsSync(path.join(candidato, 'build-tools'))) return candidato;
  }
  return null;
}

/** Busca la version mas alta de build-tools disponible. */
function buscarBuildTools(sdk) {
  const base = path.join(sdk, 'build-tools');
  const versiones = fs.readdirSync(base).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }));
  for (const v of versiones) {
    const aapt2 = path.join(base, v, 'aapt2.exe');
    if (fs.existsSync(aapt2)) return path.join(base, v);
  }
  return null;
}

function buscarPlataforma(sdk) {
  const base = path.join(sdk, 'platforms');
  if (!fs.existsSync(base)) return null;
  const preferida = path.join(base, 'android-' + API, 'android.jar');
  if (fs.existsSync(preferida)) return preferida;
  const versiones = fs.readdirSync(base).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }));
  for (const v of versiones) {
    const jar = path.join(base, v, 'android.jar');
    if (fs.existsSync(jar)) return jar;
  }
  return null;
}

function buscarEnJdk(nombre) {
  const javac = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', nombre + '.exe')
    : null;
  if (javac && fs.existsSync(javac)) return javac;

  // El JDK que trae Android Studio es el mas fiable para esto.
  const jbr = 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\' + nombre + '.exe';
  if (fs.existsSync(jbr)) return jbr;

  // Si esta en el PATH, lo usamos tal cual.
  try {
    execFileSync(nombre, ['-version'], { stdio: 'pipe', timeout: 15000 });
    return nombre;
  } catch (_) { /* no esta */ }
  return null;
}

/* ---------------------------------------------------------------- util */

/** Ejecuta un programa. Los .bat hay que lanzarlos a traves de cmd. */
function ejecutar(programa, args, opciones = {}) {
  const esLote = /\.(bat|cmd)$/i.test(programa);
  const orden = esLote ? 'cmd.exe' : programa;
  const argumentos = esLote ? ['/c', programa, ...args] : args;
  return execFileSync(orden, argumentos, {
    stdio: 'inherit',
    maxBuffer: 64 * 1024 * 1024,
    ...opciones
  });
}

function listarFicheros(absoluta) {
  const stat = fs.statSync(absoluta);
  if (stat.isFile()) return [absoluta];
  const salida = [];
  for (const entrada of fs.readdirSync(absoluta, { withFileTypes: true })) {
    salida.push(...listarFicheros(path.join(absoluta, entrada.name)));
  }
  return salida;
}

function copiarCarpeta(origen, destino) {
  let n = 0;
  for (const fichero of listarFicheros(origen)) {
    const rel = path.relative(origen, fichero);
    const dst = path.join(destino, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(fichero, dst);
    n++;
  }
  return n;
}

/* ---------------------------------------------------------------- main */

function main() {
  console.log('');
  console.log('  Construyendo PixelSoft.apk');
  console.log('  ' + '-'.repeat(56));

  const sdk = buscarSdk();
  if (!sdk) {
    console.error('  No encuentro el SDK de Android.');
    console.error('  Define la variable ANDROID_HOME con su ruta.');
    console.error('');
    process.exit(1);
  }
  const bt = buscarBuildTools(sdk);
  const androidJar = buscarPlataforma(sdk);
  const javac = buscarEnJdk('javac');
  const keytool = buscarEnJdk('keytool');

  if (!bt || !androidJar || !javac || !keytool) {
    console.error('  Faltan herramientas del SDK:');
    if (!bt) console.error('    - build-tools');
    if (!androidJar) console.error('    - platforms/android-XX/android.jar');
    if (!javac) console.error('    - javac (JDK)');
    if (!keytool) console.error('    - keytool (JDK)');
    console.error('');
    process.exit(1);
  }

  const aapt2 = path.join(bt, 'aapt2.exe');
  const d8 = path.join(bt, 'd8.bat');
  const zipalign = path.join(bt, 'zipalign.exe');
  const apksigner = path.join(bt, 'apksigner.bat');

  console.log(`  SDK              : ${sdk}`);
  console.log(`  build-tools      : ${path.basename(bt)}`);
  console.log(`  android.jar      : ${path.relative(sdk, androidJar)}`);

  // --- Limpieza
  fs.rmSync(CONSTRUIR, { recursive: true, force: true });
  fs.rmSync(ASSETS, { recursive: true, force: true });
  fs.mkdirSync(path.join(CONSTRUIR, 'clases'), { recursive: true });
  fs.mkdirSync(path.join(CONSTRUIR, 'dex'), { recursive: true });
  fs.mkdirSync(path.join(CONSTRUIR, 'gen'), { recursive: true });

  // --- 0. Las piezas de IA tienen que estar antes de copiar public/, o el APK
  //        saldria sin motor de inferencia y la IA del movil no funcionaria.
  const piezaIA = path.join(RAIZ, 'public', 'ia', 'transformers.bundle.js');
  if (!fs.existsSync(piezaIA)) {
    console.log('  Faltan las piezas de IA (transformers.js + ONNX). Las traigo...');
    ejecutar(process.execPath, [path.join(RAIZ, 'tools', 'traer-ia.js')]);
    if (!fs.existsSync(piezaIA)) {
      console.error('\n  No he podido traer las piezas de IA. El APK saldria sin IA real.\n');
      process.exit(1);
    }
  }

  // --- 1. Copiar el juego a los assets del APK
  const nFicheros = copiarCarpeta(path.join(RAIZ, 'public'), path.join(ASSETS, 'www'));
  let bytes = 0;
  for (const f of listarFicheros(ASSETS)) bytes += fs.statSync(f).size;
  console.log(`  Juego incrustado : ${nFicheros} ficheros (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

  // --- 2. Compilar recursos
  console.log('  Compilando recursos...');
  const zipRecursos = path.join(CONSTRUIR, 'recursos.zip');
  ejecutar(aapt2, ['compile', '--dir', path.join(PROYECTO, 'res'), '-o', zipRecursos]);

  // --- 3. Enlazar: genera el APK base con recursos y assets
  //
  // OJO: los recursos compilados van como argumento POSICIONAL. El flag -R es
  // para "overlays" (recursos que sustituyen a otros), y con -R falla diciendo
  // que nuestros estilos no sobreescriben nada.
  console.log('  Enlazando recursos y assets...');
  const apkBase = path.join(CONSTRUIR, 'base.apk');
  ejecutar(aapt2, [
    'link',
    '-o', apkBase,
    '-I', androidJar,
    '--manifest', path.join(PROYECTO, 'AndroidManifest.xml'),
    '-A', ASSETS,
    '--java', path.join(CONSTRUIR, 'gen'),
    '--min-sdk-version', MIN_SDK,
    '--target-sdk-version', TARGET_SDK,
    '--no-version-vectors',
    zipRecursos
  ]);

  // --- 4. Compilar el Java
  //
  // Nota: javac NO deja combinar --release con -bootclasspath. Con --release 8
  // las clases java.* salen de la propia firma del JDK, y android.jar en el
  // classpath aporta las android.*. Bytecode Java 8, que es lo mas compatible.
  console.log('  Compilando el codigo Java...');
  const fuentes = listarFicheros(path.join(PROYECTO, 'java')).filter((f) => f.endsWith('.java'));
  const generadas = listarFicheros(path.join(CONSTRUIR, 'gen')).filter((f) => f.endsWith('.java'));

  ejecutar(javac, [
    '--release', '8',
    '-nowarn',
    '-classpath', androidJar,
    '-d', path.join(CONSTRUIR, 'clases'),
    ...fuentes,
    ...generadas
  ]);

  // --- 5. Convertir a DEX
  console.log('  Generando el DEX...');
  const clases = listarFicheros(path.join(CONSTRUIR, 'clases')).filter((f) => f.endsWith('.class'));
  ejecutar(d8, [
    '--lib', androidJar,
    '--min-api', MIN_SDK,
    '--output', path.join(CONSTRUIR, 'dex'),
    ...clases
  ]);

  // --- 6. Meter el DEX dentro del APK
  console.log('  Montando el APK...');
  const dex = path.join(CONSTRUIR, 'dex', 'classes.dex');
  if (!fs.existsSync(dex)) {
    console.error('\n  No se ha generado classes.dex\n');
    process.exit(1);
  }
  const jar = buscarEnJdk('jar');
  // jar uf anade el fichero al zip existente sin tocar lo demas.
  ejecutar(jar, ['uf', apkBase, '-C', path.join(CONSTRUIR, 'dex'), 'classes.dex']);

  // --- 7. Alinear
  console.log('  Alineando...');
  const alineado = path.join(CONSTRUIR, 'alineado.apk');
  ejecutar(zipalign, ['-f', '-p', '4', apkBase, alineado]);

  // --- 8. Firmar (clave de depuracion, generada la primera vez)
  if (!fs.existsSync(ALMACEN)) {
    console.log('  Creando la clave de firma...');
    ejecutar(keytool, [
      '-genkeypair',
      '-keystore', ALMACEN,
      '-alias', CLAVE_ALIAS,
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '10000',
      '-storepass', CLAVE_PASS,
      '-keypass', CLAVE_PASS,
      '-dname', 'CN=PixelSoft, OU=Juego, O=PixelSoft, L=Madrid, C=ES'
    ]);
  }

  console.log('  Firmando...');
  fs.rmSync(SALIDA, { force: true });
  ejecutar(apksigner, [
    'sign',
    '--ks', ALMACEN,
    '--ks-key-alias', CLAVE_ALIAS,
    '--ks-pass', 'pass:' + CLAVE_PASS,
    '--key-pass', 'pass:' + CLAVE_PASS,
    '--out', SALIDA,
    alineado
  ]);

  // --- 9. Verificar
  console.log('  Verificando la firma...');
  try {
    ejecutar(apksigner, ['verify', '--verbose', SALIDA]);
  } catch (_) {
    console.error('\n  La verificacion de la firma ha fallado.\n');
    process.exit(1);
  }

  const mb = (fs.statSync(SALIDA).size / 1024 / 1024).toFixed(2);
  console.log('  ' + '-'.repeat(56));
  console.log(`  Listo: ${SALIDA}  (${mb} MB)`);
  console.log('');
  console.log('  Para instalarlo en el movil:');
  console.log('    1. Pasa PixelSoft.apk al telefono (cable, Drive, Telegram...).');
  console.log('    2. Abrelo y acepta "instalar apps de origen desconocido".');
  console.log('');
  console.log('  Con el emulador o el movil conectados por USB:');
  console.log(`    adb install -r "${SALIDA}"`);
  console.log('');
}

main();
