/**
 * MODS · solo datos (JSON) y recursos (png/ogg/wav). Nunca se ejecuta codigo de un mod.
 * Lo mismo vale en el PC (servidor) y en el movil.
 */
import { TIENDA } from './vida.js';
import { EVENTOS, CLIENTES, TRABAJOS, INVESTIGACION } from './progresion.js';

const TEXTO = (v, max = 80) => String(v == null ? '' : v).replace(/[<>]/g, '').slice(0, max);
const NUM = (v, a, b, def = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : def; };
const ID = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
const EFECTOS_OK = ['dinero', 'reputacion', 'clientes', 'calidad', 'energia', 'moral'];

/** Valida un mod.json y devuelve una version limpia o lanza un error en castellano. */
export function validarMod(json) {
  if (!json || typeof json !== 'object') throw new Error('mod.json no es un objeto JSON.');
  const id = ID(json.id || json.nombre || json.name);
  if (!id) throw new Error('El mod necesita "id" o "nombre".');
  const c = json.contenido || json.content || {};
  const lista = (x, n = 50) => (Array.isArray(x) ? x.slice(0, n) : []);
  return {
    id,
    nombre: TEXTO(json.nombre || json.name || id, 60),
    version: TEXTO(json.version || '1.0.0', 16),
    autor: TEXTO(json.autor || json.author || 'anónimo', 40),
    descripcion: TEXTO(json.descripcion || json.description || '', 300),
    contenido: {
      objetos: lista(c.objetos || c.items).map((o) => ({
        id: ID(o.id), nombre: TEXTO(o.nombre, 40), precio: NUM(o.precio, 1, 100000, 50),
        tipo: ['mueble', 'consumible', 'ropa'].includes(o.tipo) ? o.tipo : 'mueble',
        cantidad: NUM(o.cantidad, 1, 20, 1), moral: NUM(o.moral, 0, 30, 0),
        bono: Object.fromEntries(Object.entries(o.bono || {}).filter(([k]) => ['hambre', 'sueno', 'diversion', 'higiene', 'social'].includes(k)).map(([k, v]) => [k, NUM(v, 0.5, 2, 1)]))
      })).filter((o) => o.id && o.nombre),
      eventos: lista(c.eventos || c.events).map((e) => ({
        id: ID(e.id), texto: TEXTO(e.texto, 160), p: NUM(e.probabilidad, 0, 0.05, 0.01),
        efectos: Object.fromEntries(Object.entries(e.efectos || {}).filter(([k]) => EFECTOS_OK.includes(k)).map(([k, v]) => [k, NUM(v, -5000, 5000)]))
      })).filter((e) => e.id && e.texto),
      clientes: lista(c.clientes).map((x) => TEXTO(x, 40)).filter(Boolean),
      trabajos: lista(c.trabajos || c.contratos).map((x) => TEXTO(x, 40)).filter(Boolean),
      investigacion: lista(c.investigacion, 20).map((n) => ({
        id: ID(n.id), nombre: TEXTO(n.nombre, 40), coste: NUM(n.coste, 50, 50000, 500),
        req: lista(n.requiere, 5).map(ID), efecto: TEXTO(n.efecto, 80), leccion: TEXTO(n.leccion, 300)
      })).filter((n) => n.id && n.nombre),
      textos: Object.fromEntries(Object.entries(c.textos || c.traducciones || {}).slice(0, 300).map(([k, v]) => [TEXTO(k, 60), TEXTO(v, 200)]))
    },
    recursos: json.recursos || {}
  };
}

function aplicarEfectos(m, ef) {
  const e = m.empresa;
  if (ef.dinero) e.dinero += ef.dinero;
  if (ef.reputacion) e.reputacion = Math.max(0, Math.min(100, e.reputacion + ef.reputacion));
  if (ef.calidad) e.calidad = Math.max(0, Math.min(100, e.calidad + ef.calidad));
  if (ef.clientes) e.clientes = Math.max(0, e.clientes + ef.clientes);
  for (const a of m.agentes) {
    if (ef.energia) a.energia = Math.max(0, Math.min(100, a.energia + ef.energia));
    if (ef.moral) a.moral = Math.max(0, Math.min(100, a.moral + ef.moral));
  }
}

const BASE = {
  tienda: TIENDA.slice(), eventos: EVENTOS.slice(), clientes: CLIENTES.slice(),
  trabajos: TRABAJOS.slice(), investigacion: INVESTIGACION.slice()
};
const reemplazar = (arr, nuevo) => { arr.length = 0; arr.push(...nuevo); };

/**
 * Aplica los mods activos EN ORDEN. Devuelve avisos de conflicto (dos mods
 * con el mismo id de contenido: gana el ultimo de la lista).
 */
export function aplicarMods(mods) {
  const avisos = [];
  const tienda = BASE.tienda.slice(), eventos = BASE.eventos.slice(), inv = BASE.investigacion.slice();
  const clientes = BASE.clientes.slice(), trabajos = BASE.trabajos.slice();
  const duenio = {};
  const meter = (arr, item, tipo, mod) => {
    const k = tipo + ':' + item.id;
    const i = arr.findIndex((x) => x.id === item.id);
    if (i >= 0) { avisos.push(`«${mod.nombre}» reemplaza ${tipo} "${item.id}"${duenio[k] ? ` de «${duenio[k]}»` : ' del juego base'}.`); arr[i] = item; }
    else arr.push(item);
    duenio[k] = mod.nombre;
  };
  for (const mod of mods) {
    if (!mod.activo) continue;
    const c = mod.contenido;
    c.objetos.forEach((o) => meter(tienda, o, 'objeto', mod));
    c.eventos.forEach((e) => meter(eventos, { id: e.id, p: e.p, texto: e.texto, aplicar: (m) => aplicarEfectos(m, e.efectos) }, 'evento', mod));
    c.investigacion.forEach((n) => meter(inv, n, 'investigación', mod));
    clientes.push(...c.clientes);
    trabajos.push(...c.trabajos);
  }
  reemplazar(TIENDA, tienda); reemplazar(EVENTOS, eventos); reemplazar(INVESTIGACION, inv);
  reemplazar(CLIENTES, clientes); reemplazar(TRABAJOS, trabajos);
  return avisos;
}

/** Lector de .zip minimo (store + deflate) usando DecompressionStream. */
export async function leerZip(buffer) {
  const dv = new DataView(buffer);
  let fin = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('Eso no parece un .zip válido.');
  const n = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const ficheros = {};
  const dec = new TextDecoder();
  for (let k = 0; k < n && k < 500; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true);
    const tam = dv.getUint32(p + 20, true);
    const real = dv.getUint32(p + 24, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = dec.decode(new Uint8Array(buffer, p + 46, ln));
    p += 46 + ln + le + lc;
    if (nombre.endsWith('/') || nombre.includes('..') || real > 8 * 1024 * 1024) continue;
    const ini = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const datos = new Uint8Array(buffer, ini, tam);
    let bytes;
    if (metodo === 0) bytes = datos;
    else if (metodo === 8) bytes = new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else continue;
    ficheros[nombre] = bytes;
  }
  const clave = Object.keys(ficheros).find((f) => /(^|\/)mod\.json$/.test(f));
  if (!clave) throw new Error('El .zip no tiene mod.json.');
  const json = JSON.parse(dec.decode(ficheros[clave]));
  // Recursos: solo imagenes y sonidos, como data: URL (sin rutas ni codigo).
  json.recursos = {};
  for (const [f, b] of Object.entries(ficheros)) {
    const ext = (f.split('.').pop() || '').toLowerCase();
    const mime = { png: 'image/png', webp: 'image/webp', ogg: 'audio/ogg', wav: 'audio/wav', mp3: 'audio/mpeg' }[ext];
    if (!mime || b.length > 2 * 1024 * 1024) continue;
    let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    json.recursos[f.split('/').pop()] = `data:${mime};base64,${btoa(bin)}`;
  }
  return validarMod(json);
}
