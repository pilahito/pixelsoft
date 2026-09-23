/**
 * Busca ficheros de texto corruptos: los que tienen bytes nulos o un monton de
 * caracteres raros. Viene bien despues de un susto con el disco.
 *
 * Uso:  node tools/revisar-corrupcion.js [carpeta]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(AQUI, '..');

const TEXTO = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.txt', '.xml', '.java', '.cmd', '.gitignore', '.gitattributes', '.yaml', '.yml']);
const SALTAR = ['node_modules', '.git', 'build', 'assets', '.build', 'capturas'];

function listar(absoluta) {
  if (!fs.existsSync(absoluta)) return [];
  const stat = fs.statSync(absoluta);
  if (stat.isFile()) return [absoluta];
  const salida = [];
  for (const e of fs.readdirSync(absoluta, { withFileTypes: true })) {
    if (SALTAR.includes(e.name)) continue;
    salida.push(...listar(path.join(absoluta, e.name)));
  }
  return salida;
}

let revisados = 0;
let sospechosos = 0;

for (const fichero of listar(RAIZ)) {
  const ext = path.extname(fichero).toLowerCase();
  const base = path.basename(fichero);
  const esTexto = TEXTO.has(ext) || base === '.gitignore' || base === '.gitattributes' || !ext;
  if (!esTexto) continue;

  const datos = fs.readFileSync(fichero);
  if (!datos.length) continue;
  revisados++;

  const nulos = datos.includes(0);
  let raros = 0;
  for (const b of datos) {
    // Fuera de ASCII imprimible, salto de linea, tabulador o UTF-8 alto
    if (b < 9 || (b > 13 && b < 32)) raros++;
  }
  const proporcion = raros / datos.length;

  if (nulos || proporcion > 0.02) {
    sospechosos++;
    console.log(`  SOSPECHOSO  ${path.relative(RAIZ, fichero)}  (${datos.length} B, ${(proporcion * 100).toFixed(1)}% raros${nulos ? ', con bytes nulos' : ''})`);
  }
}

console.log('');
console.log(`  revisados: ${revisados}   sospechosos: ${sospechosos}`);
process.exit(sospechosos ? 1 : 0);
