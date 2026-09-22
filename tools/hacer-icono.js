/**
 * Genera PixelSoft.ico dibujando el icono pixel a pixel.
 *
 * No usa ninguna libreria de imagenes: monta el PNG a mano (con zlib, que ya
 * viene con Node) y luego lo envuelve en un ICO. Un ICO moderno puede llevar
 * dentro un PNG tal cual, asi que no hace falta comprimir nada mas.
 *
 * Uso:  node tools/hacer-icono.js
 * Genera PixelSoft.ico en la raiz del proyecto.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const LADO = 256;          // lado final del icono, en pixeles reales
const REJILLA = 32;        // dibujamos en una rejilla de 32x32
const BLOQUE = LADO / REJILLA;

/* ------------------------------------------------------------ el dibujo */

/**
 * El icono: un monitor con carita. Pantalla encendida en verde (el color de
 * "trabajando" en el juego) y ojos oscuros con brillo, mofletes y sonrisa.
 *
 * La primera version tenia los ojos blancos sobre pantalla oscura y se leian
 * como dos rectangulos sueltos. Con la pantalla clara y los ojos oscuros se
 * entiende a cualquier tamano, que es de lo que va un icono.
 */
function dibujar() {
  const lienzo = new Array(REJILLA * REJILLA).fill(null);
  const pon = (x, y, color) => {
    if (x < 0 || y < 0 || x >= REJILLA || y >= REJILLA) return;
    lienzo[y * REJILLA + x] = color;
  };
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pon(x, y, color);
  };

  // Fondo
  rect(0, 0, REJILLA - 1, REJILLA - 1, '#0d1017');

  // Mesa calida
  rect(1, 29, 30, 30, '#c99a68');
  rect(1, 29, 30, 29, '#e0b585');
  rect(2, 31, 29, 31, '#8f6a45');

  // Patas del monitor
  rect(14, 25, 17, 26, '#4a4768');
  rect(10, 27, 21, 28, '#3a3850');

  // Marco del monitor
  rect(3, 4, 28, 24, '#3a3850');
  rect(3, 4, 28, 5, '#565274');
  rect(3, 23, 28, 24, '#2a2740');

  // Pantalla encendida
  rect(5, 7, 26, 22, '#3fbf6f');
  rect(5, 7, 26, 8, '#5fd88a');       // reflejo de arriba

  // Ojos oscuros, grandes, con brillo
  for (const ox of [9, 19]) {
    rect(ox, 12, ox + 3, 17, '#17301f');
    rect(ox, 12, ox + 1, 13, '#ffffff');
  }

  // Mofletes
  rect(6, 19, 8, 20, '#e07a86');
  rect(23, 19, 25, 20, '#e07a86');

  // Sonrisa
  rect(14, 20, 17, 20, '#17301f');
  rect(13, 19, 13, 19, '#17301f');
  rect(18, 19, 18, 19, '#17301f');

  // Lucecita de encendido
  rect(25, 23, 26, 23, '#e0b93a');

  return lienzo;
}

/* --------------------------------------------------------- PNG a mano */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const nombre = Buffer.from(tipo, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nombre, datos])), 0);
  return Buffer.concat([largo, nombre, datos, crc]);
}

/** Convierte la rejilla de colores en un PNG RGBA. */
function aPng(lienzo) {
  // Filas RGBA con byte de filtro 0 delante
  const crudo = Buffer.alloc(LADO * (LADO * 4 + 1));
  let p = 0;
  for (let y = 0; y < LADO; y++) {
    crudo[p++] = 0;                                  // filtro: ninguno
    for (let x = 0; x < LADO; x++) {
      const color = lienzo[Math.floor(y / BLOQUE) * REJILLA + Math.floor(x / BLOQUE)] || '#000000';
      crudo[p++] = parseInt(color.slice(1, 3), 16);
      crudo[p++] = parseInt(color.slice(3, 5), 16);
      crudo[p++] = parseInt(color.slice(5, 7), 16);
      crudo[p++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(LADO, 0);
  ihdr.writeUInt32BE(LADO, 4);
  ihdr.writeUInt8(8, 8);    // 8 bits por canal
  ihdr.writeUInt8(6, 9);    // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

/** Envuelve el PNG en un ICO (formato moderno: el ICO lleva el PNG dentro). */
function aIco(png) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);   // reservado
  cabecera.writeUInt16LE(1, 2);   // 1 = icono
  cabecera.writeUInt16LE(1, 4);   // cuantos

  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(0, 0);        // ancho 0 = 256
  entrada.writeUInt8(0, 1);        // alto 0 = 256
  entrada.writeUInt8(0, 2);        // colores
  entrada.writeUInt8(0, 3);        // reservado
  entrada.writeUInt16LE(1, 4);     // planos
  entrada.writeUInt16LE(32, 6);    // bits por pixel
  entrada.writeUInt32LE(png.length, 8);
  entrada.writeUInt32LE(22, 12);   // donde empieza el PNG

  return Buffer.concat([cabecera, entrada, png]);
}

/* ------------------------------------------------------------------ main */

const lienzo = dibujar();
const png = aPng(lienzo);

const salidaPng = path.join(RAIZ, 'PixelSoft.png');
const salidaIco = path.join(RAIZ, 'PixelSoft.ico');
fs.writeFileSync(salidaPng, png);
fs.writeFileSync(salidaIco, aIco(png));

console.log('');
console.log('  Icono de PixelSoft generado');
console.log('  ' + '-'.repeat(46));
console.log(`  ${salidaIco}  (${(fs.statSync(salidaIco).size / 1024).toFixed(1)} KB)`);
console.log(`  ${salidaPng}  (${(fs.statSync(salidaPng).size / 1024).toFixed(1)} KB)`);
console.log('');
