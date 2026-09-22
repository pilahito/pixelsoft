/**
 * Arranque del juego en el PC, con Node instalado:
 *
 *   node server.js            -> solo tu PC
 *   node server.js --red      -> abierto a la red local (para el movil)
 *   node server.js --abrir    -> abre el navegador solo
 *   node server.js 4000       -> otro puerto
 *
 * La logica esta en game/servidor.js. Aqui solo se resuelve de donde salen
 * los ficheros (del disco) y se arranca.
 *
 * Si lo que quieres es un ejecutable sin depender de Node, usa PixelSoft.exe
 * (se construye con `node tools/construir-exe.js`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { iniciarServidor } from './game/servidor.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, 'public');

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(PUBLICO, 'config.json'), 'utf8'));
} catch (e) {
  console.error('No he podido leer public/config.json:', e.message);
  process.exit(1);
}

iniciarServidor({
  config,
  args: process.argv.slice(2),
  leerEstatico: (relativo) => fs.promises.readFile(path.join(PUBLICO, relativo))
});
