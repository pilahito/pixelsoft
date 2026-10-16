import { casaPara } from './pueblo.js';
/**
 * VIDA · la parte "Sims": necesidades, pueblo, tiendas, casa, amistades,
 * rasgos, habilidades, clima y estaciones.
 *
 * Patron de IA "utility AI" (como en Los Sims): cada necesidad da una
 * puntuacion y el personaje elige la actividad que mas le alivia.
 * La IA de verdad (LM Studio / movil) solo decide lo raro; esto es lo diario.
 */
const lim = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const elegir = (l) => l[Math.floor(Math.random() * l.length)];

export const NECESIDADES = ['hambre', 'sueno', 'diversion', 'higiene', 'social'];
export const NOMBRE_NECESIDAD = { hambre: '🍔 Hambre', sueno: '😴 Sueño', diversion: '🎮 Diversión', higiene: '🚿 Higiene', social: '💬 Social' };

export const RASGOS = {
  glotón: { hambre: 1.5 }, dormilón: { sueno: 1.4 }, fiestero: { diversion: 1.5, social: 1.3 },
  pulcro: { higiene: 1.5 }, solitario: { social: 0.5 }, currante: { trabajo: 1.25, diversion: 1.2 },
  creativo: { trabajo: 1.1 }, deportista: { gimnasio: 1.5 }
};

export const LUGARES = {
  oficina: { nombre: '🏢 Oficina', emoji: '🏢' },
  casa: { nombre: '🏠 Casa', emoji: '🏠' },
  super: { nombre: '🛒 Supermercado', emoji: '🛒' },
  cafeteria: { nombre: '☕ Cafetería', emoji: '☕' },
  parque: { nombre: '🌳 Parque', emoji: '🌳' },
  gimnasio: { nombre: '🏋️ Gimnasio', emoji: '🏋️' }
};

/** Actividades: donde, cuanto alivia cada necesidad por hora y lo que cuesta. */
const ACTIVIDADES = {
  cocinar: { lugar: 'casa', alivia: { hambre: 35 }, consume: 'comida', texto: 'cocina y come' },
  cafeteria: { lugar: 'cafeteria', alivia: { hambre: 30, social: 15 }, coste: 9, texto: 'come en la cafetería' },
  comprar: { lugar: 'super', alivia: {}, coste: 0, texto: 'hace la compra' },
  dormir: { lugar: 'casa', alivia: { sueno: 22 }, texto: 'duerme' },
  ducharse: { lugar: 'casa', alivia: { higiene: 60 }, texto: 'se ducha' },
  parque: { lugar: 'parque', alivia: { diversion: 25, social: 10 }, texto: 'pasea por el parque' },
  gimnasio: { lugar: 'gimnasio', alivia: { diversion: 15, sueno: -5, higiene: -15 }, coste: 4, texto: 'entrena en el gimnasio', habilidad: 'forma' },
  charlar: { lugar: 'cafeteria', alivia: { social: 35, diversion: 10 }, coste: 3, texto: 'queda con un amigo' },
  picoteo: { lugar: 'oficina', alivia: { hambre: 18 }, texto: 'picotea del office' },
  videojuegos: { lugar: 'casa', alivia: { diversion: 30 }, texto: 'juega a videojuegos' }
};

export const TIENDA = [
  { id: 'comida', nombre: '🥫 Comida (3 raciones)', precio: 15, tipo: 'consumible', cantidad: 3 },
  { id: 'cama', nombre: '🛏️ Cama buena', precio: 180, tipo: 'mueble', bono: { sueno: 1.4 } },
  { id: 'consola', nombre: '🎮 Consola', precio: 250, tipo: 'mueble', bono: { diversion: 1.4 } },
  { id: 'ducha', nombre: '🚿 Ducha de lluvia', precio: 140, tipo: 'mueble', bono: { higiene: 1.3 } },
  { id: 'cocina', nombre: '🍳 Cocina moderna', precio: 300, tipo: 'mueble', bono: { hambre: 1.3 } },
  { id: 'planta', nombre: '🪴 Planta', precio: 25, tipo: 'mueble', bono: { diversion: 1.05 } },
  { id: 'ropa', nombre: '👕 Ropa nueva', precio: 60, tipo: 'ropa', moral: 8 }
];

export const CASAS = [
  { id: 'piso', nombre: 'Piso compartido', alquiler: 8, compra: 0, huecos: 2 },
  { id: 'estudio', nombre: 'Estudio', alquiler: 15, compra: 3000, huecos: 4 },
  { id: 'casa', nombre: 'Casa con jardín', alquiler: 30, compra: 9000, huecos: 7 }
];

/** Arbol de habilidades por empleado (sube con el uso y se gasta en puntos). */
export const HABILIDADES = {
  programar: { nombre: '💻 Programar', efecto: '+trabajo en contratos' },
  carisma: { nombre: '🗣️ Carisma', efecto: '+amistad y +clientes' },
  cocina: { nombre: '🍳 Cocina', efecto: 'cocinar alivia más' },
  forma: { nombre: '💪 Forma física', efecto: 'se cansa menos' }
};

export const ESTACIONES = ['🌸 Primavera', '☀️ Verano', '🍂 Otoño', '❄️ Invierno'];
const CLIMAS = { 0: ['☀️', '🌦️', '☁️'], 1: ['☀️', '☀️', '⛈️'], 2: ['☁️', '🌧️', '🌦️'], 3: ['❄️', '☁️', '🌧️'] };

export function rasgosDe(id) {
  const r = Object.keys(RASGOS);
  let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = r[h % r.length], b = r[(h >>> 5) % r.length];
  return a === b ? [a] : [a, b];
}

export function crearVida(agente, i) {
  return {
    puntos: 0,
    necesidades: { hambre: 70 + Math.random() * 20, sueno: 75, diversion: 60, higiene: 80, social: 60 },
    rasgos: rasgosDe(agente.id),
    lugar: 'oficina',
    actividad: 'trabajar',
    dinero: 120,
    inventario: { comida: 2 },
    muebles: [],
    casa: 'piso',
    casaPropia: false,
    amistades: {},
    habilidades: { programar: 1, carisma: 1, cocina: 1, forma: 1 },
    xp: { programar: 0, carisma: 0, cocina: 0, forma: 0 }
  };
}

export function crearEntorno() {
  return { estacion: 0, clima: '☀️', diaEstacion: 1, tutorial: 0 };
}

function factorRasgo(v, clave) {
  return v.rasgos.reduce((f, r) => f * ((RASGOS[r] || {})[clave] || 1), 1);
}

function bonoMueble(v, clave) {
  return v.muebles.reduce((f, id) => f * (((TIENDA.find((t) => t.id === id) || {}).bono || {})[clave] || 1), 1);
}

function ganarXp(m, a, hab, n = 1) {
  const v = a.vida;
  v.xp[hab] = (v.xp[hab] || 0) + n;
  const nivel = v.habilidades[hab] || 1;
  if (nivel < 10 && v.xp[hab] >= nivel * 12) {
    v.xp[hab] = 0;
    v.habilidades[hab] = nivel + 1;
    v.puntos = (v.puntos || 0) + 1;
    m.registrar('sistema', `⭐ ${a.nombre} sube ${HABILIDADES[hab].nombre} a nivel ${nivel + 1}.`);
  }
}

/** Utility AI: puntua cada actividad segun lo que le falta al personaje. */
function elegirActividad(a, laboral) {
  const n = a.vida.necesidades;
  const v = a.vida;
  if (laboral && a.estado !== 'dimitido') {
    // En horario va a trabajar salvo que algo este en rojo.
    const urgente = NECESIDADES.find((k) => n[k] < 12);
    if (!urgente) return 'trabajar';
  }
  let mejor = 'dormir';
  let max = -Infinity;
  for (const [id, act] of Object.entries(ACTIVIDADES)) {
    let p = 0;
    for (const [k, val] of Object.entries(act.alivia)) p += ((100 - n[k]) / 100) ** 2 * val * factorRasgo(v, k);
    if (act.consume && !(v.inventario[act.consume] > 0)) p = -1;
    if (id === 'picoteo') p *= 0.35; // gratis pero poco saciante
    if (id === 'comprar') p = (v.inventario.comida || 0) < 1 && v.dinero >= 15 ? 30 : -1;
    if (act.coste && v.dinero < act.coste + 30) p = -1; // ahorran un colchon
    if (id === 'gimnasio') p *= factorRasgo(v, 'gimnasio');
    p += Math.random() * 2;
    if (p > max) { max = p; mejor = id; }
  }
  return mejor;
}

/** Una hora de vida para todos. */
export function tickVida(m) {
  const env = m.entorno;
  const noche = m.hora >= 22 || m.hora < 7;
  const lluvia = /🌧️|⛈️/.test(env.clima);
  for (const a of m.agentes) {
    if (a.dimitido) continue;
    if (!a.vida) a.vida = crearVida(a, m.agentes.indexOf(a));
    const v = a.vida;
    const n = v.necesidades;
    // Decaen solas (los rasgos aceleran algunas).
    n.hambre -= 4 * factorRasgo(v, 'hambre');
    n.sueno -= (noche ? 4 : 2.5) * factorRasgo(v, 'sueno') / (1 + (v.habilidades.forma - 1) * 0.04);
    n.diversion -= 2.5 * factorRasgo(v, 'diversion');
    n.higiene -= 2 * factorRasgo(v, 'higiene');
    n.social -= 2 * factorRasgo(v, 'social');

    let act = elegirActividad(a, m.laboral && !noche);
    if (noche && act !== 'dormir' && n.sueno < 55) act = 'dormir';
    if (lluvia && act === 'parque') act = 'videojuegos';
    v.actividad = act;

    if (act === 'trabajar') {
      v.lugar = 'oficina';
      n.diversion -= 1;
      ganarXp(m, a, 'programar');
    } else {
      const d = ACTIVIDADES[act];
      v.lugar = d.lugar;
      for (const [k, val] of Object.entries(d.alivia)) {
        let x = val * bonoMueble(v, k);
        if (act === 'cocinar') x *= 1 + (v.habilidades.cocina - 1) * 0.08;
        n[k] += x;
      }
      if (d.consume) v.inventario[d.consume]--;
      if (d.coste) v.dinero -= d.coste;
      if (act === 'comprar' && v.dinero >= 15) { v.dinero -= 15; v.inventario.comida = (v.inventario.comida || 0) + 3; }
      if (act === 'cocinar') ganarXp(m, a, 'cocina');
      if (d.habilidad) ganarXp(m, a, d.habilidad);
      if (act === 'charlar' || act === 'parque' || act === 'cafeteria') {
        // Hace amigos con quien este en el mismo sitio.
        const otro = m.agentes.find((b) => b !== a && !b.dimitido && b.vida && b.vida.lugar === v.lugar);
        if (otro) {
          const sube = 3 + v.habilidades.carisma * 0.6;
          v.amistades[otro.id] = lim((v.amistades[otro.id] || 0) + sube, -100, 100);
          otro.vida.amistades[a.id] = lim((otro.vida.amistades[a.id] || 0) + sube * 0.8, -100, 100);
          ganarXp(m, a, 'carisma');
          if (v.amistades[otro.id] >= 50 && v.amistades[otro.id] - sube < 50) {
            m.registrar('sistema', `💛 ${a.nombre} y ${otro.nombre} ya son buenos amigos.`);
          }
        }
      }
    }
    for (const k of NECESIDADES) n[k] = lim(n[k]);

    // La vida afecta al trabajo: necesidades bajas -> moral y energia bajan.
    const media = NECESIDADES.reduce((s, k) => s + n[k], 0) / NECESIDADES.length;
    a.moral = lim(a.moral + (media - 60) * 0.015);
    a.energia = lim(a.energia + (n.sueno - 55) * 0.015);
  }
}

/** Cobro de nominas y alquileres a cada empleado al cerrar el dia. */
export function cerrarDiaVida(m) {
  const env = m.entorno;
  env.diaEstacion++;
  if (env.diaEstacion > 7) {
    env.diaEstacion = 1;
    env.estacion = (env.estacion + 1) % 4;
    m.registrar('sistema', `Llega la estación: ${ESTACIONES[env.estacion]}.`);
  }
  env.clima = elegir(CLIMAS[env.estacion]);
  for (const a of m.agentes) {
    if (a.dimitido || !a.vida) continue;
    const v = a.vida;
    v.dinero += Math.max(25, m.empresa.salarioPorDia); // lo que le queda limpio de la nomina
    if (!v.casaPropia) v.dinero -= (CASAS.find((c) => c.id === v.casa) || CASAS[0]).alquiler;
  }
}

/** Acciones del jugador sobre la vida de un empleado. */
export function accionVida(m, accion, carga) {
  const a = m.agentes.find((x) => x.id === carga.agenteId);
  if (!['comprar_objeto', 'cambiar_casa', 'comprar_casa', 'tutorial', 'gastar_punto', 'decorar'].includes(accion)) return null;
  if (accion === 'tutorial') { m.entorno.tutorial = Number(carga.paso) || 0; return { ok: true, mensaje: '' }; }
  if (!a || !a.vida) return { ok: false, mensaje: 'Elige un empleado.' };
  const v = a.vida;
  if (accion === 'gastar_punto') {
    const h = carga.id;
    if (!HABILIDADES[h]) return { ok: false, mensaje: 'Esa habilidad no existe.' };
    if (!(v.puntos > 0)) return { ok: false, mensaje: `${a.nombre} no tiene puntos. Se ganan subiendo habilidades.` };
    if (v.habilidades[h] >= 10) return { ok: false, mensaje: 'Ya está al máximo.' };
    v.puntos--; v.habilidades[h]++;
    if (h === 'programar') a.habilidad = lim(a.habilidad + 4);
    return { ok: true, mensaje: `⭐ ${a.nombre}: ${HABILIDADES[h].nombre} sube a ${v.habilidades[h]}.` };
  }
  if (accion === 'decorar') {
    // Modo construir: coloca (o quita) un mueble suyo en una casilla de su casa.
    const huecos = (CASAS.find((c) => c.id === v.casa) || CASAS[0]).huecos;
    const celda = Number(carga.celda);
    if (!(celda >= 0 && celda < 24)) return { ok: false, mensaje: 'Casilla no válida.' };
    v.decoracion = v.decoracion || {};
    if (!carga.id) { delete v.decoracion[celda]; return { ok: true, mensaje: 'Quitado.' }; }
    if (!v.muebles.includes(carga.id)) return { ok: false, mensaje: 'Primero cómpralo en la tienda.' };
    for (const k of Object.keys(v.decoracion)) if (v.decoracion[k] === carga.id) delete v.decoracion[k];
    if (Object.keys(v.decoracion).length >= huecos) return { ok: false, mensaje: 'No caben más muebles en esta casa.' };
    v.decoracion[celda] = carga.id;
    return { ok: true, mensaje: 'Mueble colocado.' };
  }
  if (accion === 'comprar_objeto') {
    const o = TIENDA.find((t) => t.id === carga.id);
    if (!o) return { ok: false, mensaje: 'Ese objeto no existe.' };
    if (v.dinero < o.precio) return { ok: false, mensaje: `${a.nombre} no tiene ${o.precio} EUR (tiene ${Math.round(v.dinero)}).` };
    if (o.tipo === 'mueble') {
      const huecos = (CASAS.find((c) => c.id === v.casa) || CASAS[0]).huecos;
      if (v.muebles.includes(o.id)) return { ok: false, mensaje: 'Ya lo tiene en casa.' };
      if (v.muebles.length >= huecos) return { ok: false, mensaje: 'No cabe más en esa casa. Múdate a una más grande.' };
      v.muebles.push(o.id);
    } else if (o.tipo === 'consumible') {
      v.inventario[o.id] = (v.inventario[o.id] || 0) + o.cantidad;
    } else if (o.moral) {
      a.moral = lim(a.moral + o.moral);
    }
    v.dinero -= o.precio;
    const t = `🛍️ ${a.nombre} compra ${o.nombre}.`;
    m.registrar('sistema', t);
    return { ok: true, mensaje: t };
  }
  const c = CASAS.find((x) => x.id === carga.id);
  if (!c) return { ok: false, mensaje: 'Esa casa no existe.' };
  if (accion === 'cambiar_casa') {
    v.casa = c.id; v.casaPropia = false;
    if (c.id !== 'piso' && m.pueblo) casaPara(m, a, c.id, false);
    v.muebles = v.muebles.slice(0, c.huecos);
    return { ok: true, mensaje: `🏠 ${a.nombre} alquila: ${c.nombre} (${c.alquiler} EUR/día).` };
  }
  if (!c.compra) return { ok: false, mensaje: 'Esa no se vende.' };
  if (v.dinero < c.compra) return { ok: false, mensaje: `Hacen falta ${c.compra} EUR.` };
  v.dinero -= c.compra; v.casa = c.id; v.casaPropia = true;
  if (m.pueblo) casaPara(m, a, c.id, true);
  const t = `🔑 ¡${a.nombre} se compra ${c.nombre}! Se acabó el alquiler.`;
  m.registrar('sistema', t);
  return { ok: true, mensaje: t };
}

export function vistaVida(m) {
  return {
    entorno: { ...m.entorno, estacionNombre: ESTACIONES[m.entorno.estacion], noche: m.hora >= 21 || m.hora < 7 },
    tienda: TIENDA, casas: CASAS, lugares: LUGARES
  };
}
