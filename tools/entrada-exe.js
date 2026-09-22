/**
 * Punto de entrada del ejecutable (PixelSoft.exe).
 *
 * Un .exe de Node lleva dentro el motor de Node y los ficheros del juego
 * incrustados como "assets". Dentro de un ejecutable asi NO se pueden cargar
 * ficheros sueltos del disco, asi que aqui se leen directamente de la memoria
 * del propio ejecutable y se le pasan al servidor.
 *
 * Ventaja: no se escribe NADA en el disco. No hay carpeta temporal, no hay
 * ficheros sueltos y no hay nada que se quede obsoleto.
 *
 * Este fichero se empaqueta con esbuild en un unico CommonJS antes de meterse
 * en el .exe (ver tools/construir-exe.js).
 */

import * as sea from 'node:sea';
import { iniciarServidor } from '../game/servidor.js';

if (!sea.isSea()) {
  console.error('');
  console.error('  Esto no es PixelSoft.exe: falta el contenido incrustado.');
  console.error('  Para jugar con Node instalado usa:  node server.js');
  console.error('');
  process.exit(1);
}

const claves = new Set(sea.getAssetKeys());
console.log(`  Contenido incrustado: ${claves.size} ficheros`);

/** Lee un fichero del juego desde los assets del ejecutable. */
async function leerEstatico(relativo) {
  const clave = 'public/' + relativo.replace(/\\/g, '/');
  if (!claves.has(clave)) throw new Error('No existe: ' + clave);

  // getRawAsset devuelve bytes (vale para cualquier fichero). Si no estuviera
  // disponible, se cae a leerlo como texto.
  try {
    return Buffer.from(sea.getRawAsset(clave));
  } catch (_) {
    return Buffer.from(sea.getAsset(clave, 'utf8'), 'utf8');
  }
}

const config = JSON.parse(sea.getAsset('public/config.json', 'utf8'));

// Si nadie ha pedido nada, se abre el navegador: es lo que espera alguien que
// hace doble clic en un .exe.
const args = process.argv.slice(2);
if (args.length === 0) args.push('--abrir');

iniciarServidor({ config, args, leerEstatico });
