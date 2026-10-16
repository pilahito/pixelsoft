/**
 * PUEBLO · el pueblo que construyen las propias IAs.
 *
 * Cada noche un empleado propone algo segun lo que le falta (necesidades y
 * rasgos). Los demas votan, ponen dinero de su sueldo y, cuando hay fondos,
 * lo construyen poco a poco. El jefe puede aprobar/vetar o dejarles libres.
 * Con una IA de verdad conectada, el empleado explica su propuesta con el
 * modelo; en modo demo usa frases escritas.
 */
export const ANCHO = 40;
export const ALTO = 24;
export const CALLE_Y = 12;

/** Tipos de edificio (los mods pueden añadir mas). lugar = a donde va la gente. */
export const TIPOS_EDIFICIO = [
  { id: 'oficina', nombre: 'Oficina PixelSoft', w: 5, h: 3, coste: 0, lugar: 'oficina', estilo: 'piedra', unico: true },
  { id: 'casa', nombre: 'Casa', w: 3, h: 3, coste: 400, lugar: 'casa', estilo: 'ladrillo', necesidad: 'sueno' },
  { id: 'super', nombre: 'Supermercado', w: 4, h: 3, coste: 600, lugar: 'super', estilo: 'piedra', necesidad: 'hambre' },
  { id: 'cafeteria', nombre: 'Cafetería', w: 3, h: 3, coste: 500, lugar: 'cafeteria', estilo: 'ladrillo', necesidad: 'social' },
  { id: 'parque', nombre: 'Parque', w: 4, h: 3, coste: 250, lugar: 'parque', estilo: 'parque', necesidad: 'diversion' },
  { id: 'gimnasio', nombre: 'Gimnasio', w: 3, h: 3, coste: 550, lugar: 'gimnasio', estilo: 'piedra', necesidad: 'higiene' },
  { id: 'biblioteca', nombre: 'Biblioteca', w: 3, h: 3, coste: 450, lugar: 'parque', estilo: 'piedra', necesidad: 'diversion', rasgo: 'solitario' },
  { id: 'arcade', nombre: 'Salón recreativo', w: 3, h: 3, coste: 520, lugar: 'parque', estilo: 'ladrillo', necesidad: 'diversion', rasgo: 'fiestero' },
  { id: 'fuente', nombre: 'Fuente', w: 1, h: 1, coste: 80, lugar: null, estilo: 'fuente', decoracion: true },
  { id: 'arbol', nombre: 'Árboles', w: 1, h: 1, coste: 20, lugar: null, estilo: 'arbol', decoracion: true }
];

const NOMBRES_PUEBLO = ['Villabit', 'Pixelandia', 'Tokenburgo', 'San Prompt', 'Villacontexto', 'Puerto Kernel', 'Valdebyte'];
const MOTIVOS = {
  sueno: 'Necesitamos más casas, que dormimos fatal.',
  hambre: 'Un super más cerca y comemos mejor.',
  social: 'Una cafetería para quedar con gente.',
  diversion: 'Algo para desconectar al salir del curro.',
  higiene: 'Un gimnasio con duchas, por favor.',
  decor: 'El pueblo está muy soso. Pongamos algo bonito.'
};

const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const tipo = (id) => TIPOS_EDIFICIO.find((t) => t.id === id);

export function crearPueblo(semilla = 'pixelsoft') {
  const h = hash(semilla);
  const p = {
    nombre: NOMBRES_PUEBLO[h % NOMBRES_PUEBLO.length],
    bandera: ['#e94560', '#f5c518', '#3fa7d6', '#59cd90', '#9b5de5', '#f15bb5'].filter((_, i) => (h >> i) & 1).slice(0, 3),
    edificios: [],
    propuestas: [],
    modo: 'aprobar',       // 'aprobar' = el jefe decide · 'libre' = deciden ellos
    version: 1,
    siguienteId: 1,
    arboles: []
  };
  if (p.bandera.length < 2) p.bandera = ['#3fa7d6', '#f5c518'];
  // Pueblo inicial: lo minimo para vivir.
  colocar(p, 'oficina', 17, CALLE_Y - 3, true);
  colocar(p, 'casa', 6, CALLE_Y - 3, true, 'piso');
  colocar(p, 'super', 25, CALLE_Y + 1, true);
  colocar(p, 'cafeteria', 11, CALLE_Y + 1, true);
  colocar(p, 'parque', 30, CALLE_Y - 3, true);
  colocar(p, 'gimnasio', 2, CALLE_Y + 1, true);
  for (let i = 0; i < 26; i++) {
    const x = (hash(semilla + i) % ANCHO), y = (hash('y' + semilla + i) % ALTO);
    if (libre(p, x, y, 1, 1)) p.arboles.push([x, y]);
  }
  return p;
}

function libre(p, x, y, w, h) {
  if (x < 0 || y < 0 || x + w > ANCHO || y + h > ALTO) return false;
  if (y <= CALLE_Y && y + h > CALLE_Y) return false; // la calle no se pisa
  for (const e of p.edificios) {
    if (x < e.x + e.w + 1 && x + w + 1 > e.x && y < e.y + e.h && y + h > e.y) return false;
  }
  return true;
}

function colocar(p, tipoId, x, y, hecho = false, nombre = null) {
  const t = tipo(tipoId);
  const e = { id: 'e' + p.siguienteId++, tipo: tipoId, x, y, w: t.w, h: t.h, progreso: hecho ? 100 : 0, nombre: nombre || t.nombre, dueno: null };
  p.edificios.push(e);
  p.arboles = p.arboles.filter(([ax, ay]) => !(ax >= x && ax < x + t.w && ay >= y && ay < y + t.h));
  p.version++;
  return e;
}

/** Busca un hueco cerca de la calle, alternando arriba y abajo. */
function buscarHueco(p, t) {
  for (let d = 0; d < ANCHO; d++) {
    for (const x of [Math.floor(ANCHO / 2) + d, Math.floor(ANCHO / 2) - d]) {
      for (const y of [CALLE_Y - t.h, CALLE_Y + 1, CALLE_Y - t.h - 4, CALLE_Y + 5]) {
        if (libre(p, x, y, t.w, t.h)) return { x, y };
      }
    }
  }
  return null;
}

/** Donde esta (en casillas) la puerta del edificio de un tipo de lugar. */
export function puertaDe(p, lugar, agenteId) {
  const candidatos = p.edificios.filter((e) => e.progreso >= 100 && tipo(e.tipo) && tipo(e.tipo).lugar === lugar);
  let e = candidatos.find((x) => x.dueno === agenteId) || candidatos.find((x) => !x.dueno) || candidatos[0];
  if (!e) return { x: ANCHO / 2, y: CALLE_Y };
  const arriba = e.y < CALLE_Y;
  return { x: e.x + Math.floor(e.w / 2), y: arriba ? e.y + e.h : e.y - 1, edificio: e.id };
}

/** Elige que propone un empleado: lo que mas le falta, matizado por rasgos. */
function queProponer(a, p) {
  const n = a.vida.necesidades;
  const rasgos = a.vida.rasgos || [];
  const porRasgo = TIPOS_EDIFICIO.find((t) => t.rasgo && rasgos.includes(t.rasgo) && !p.edificios.some((e) => e.tipo === t.id));
  if (porRasgo && Math.random() < 0.5) return { t: porRasgo, motivo: MOTIVOS[porRasgo.necesidad] };
  const peor = Object.entries(n).sort((x, y) => x[1] - y[1])[0][0];
  const opciones = TIPOS_EDIFICIO.filter((t) => t.necesidad === peor && !t.unico);
  if (!opciones.length || n[peor] > 70) {
    const d = TIPOS_EDIFICIO.filter((t) => t.decoracion);
    return { t: d[Math.floor(Math.random() * d.length)], motivo: MOTIVOS.decor };
  }
  return { t: opciones[Math.floor(Math.random() * opciones.length)], motivo: MOTIVOS[peor] };
}

/** Cada noche: proponer, votar, aportar dinero y avanzar obras. */
export function cerrarDiaPueblo(m) {
  const p = m.pueblo;
  const vivos = m.agentes.filter((a) => !a.dimitido && a.vida);
  if (!vivos.length) return;

  // 1) Una propuesta nueva si no hay demasiadas.
  if (p.propuestas.filter((x) => x.estado !== 'hecha').length < 2) {
    const autor = vivos[Math.floor(Math.random() * vivos.length)];
    const { t, motivo } = queProponer(autor, p);
    const prop = { id: 'p' + p.siguienteId++, tipo: t.id, nombre: t.nombre, autor: autor.id, autorNombre: autor.nombre, motivo, votos: {}, fondos: 0, coste: t.coste, estado: 'votando', dia: m.dia };
    // Votan: si les sirve o si quieren al autor.
    for (const a of vivos) {
      const sirve = t.necesidad && a.vida.necesidades[t.necesidad] < 65;
      const amigo = (a.vida.amistades[autor.id] || 0) > 20;
      prop.votos[a.id] = a === autor || sirve || amigo || Math.random() < 0.35;
    }
    const si = Object.values(prop.votos).filter(Boolean).length;
    prop.estado = si * 2 > vivos.length ? (p.modo === 'libre' ? 'aprobada' : 'esperando_jefe') : 'rechazada';
    p.propuestas.push(prop);
    m.registrar('sistema', `🗳️ ${autor.nombre} propone construir: ${t.nombre}. «${motivo}» Votos: ${si}/${vivos.length}. ${prop.estado === 'rechazada' ? 'Rechazada.' : prop.estado === 'aprobada' ? '¡Aprobada!' : 'Falta que decidas tú (Vida → Pueblo).'}`);
    // Con IA real: que el autor lo explique con sus palabras (sin bloquear).
    if (m.cerebro && !m.cerebro.simulado && typeof m.encolarReflexion === 'function') {
      m.encolarReflexion(autor.id, `Has propuesto construir "${t.nombre}" en el pueblo porque: ${motivo} Explícalo a tus compañeros en una frase.`);
    }
  }

  // 2) Aportaciones: cada uno pone un 10% de sus ahorros a las obras aprobadas.
  const obra = p.propuestas.find((x) => x.estado === 'aprobada');
  if (obra) {
    for (const a of vivos) {
      const pone = Math.floor(Math.max(0, a.vida.dinero - 30) * 0.1);
      a.vida.dinero -= pone;
      obra.fondos += pone;
    }
    if (obra.fondos >= obra.coste) {
      const t = tipo(obra.tipo);
      const hueco = t && buscarHueco(p, t);
      if (!hueco) { obra.estado = 'rechazada'; m.registrar('alerta', `No queda sitio en ${p.nombre} para ${obra.nombre}.`); }
      else {
        const e = colocar(p, obra.tipo, hueco.x, hueco.y, false);
        e.propuesta = obra.id;
        obra.estado = 'en_obras';
        obra.edificio = e.id;
        m.registrar('sistema', `🏗️ Empiezan las obras de ${obra.nombre} en ${p.nombre}.`);
      }
    }
  }
  p.propuestas = p.propuestas.filter((x) => !(x.estado === 'rechazada' || x.estado === 'hecha') || m.dia - x.dia < 4);
}

/** Cada hora: las obras avanzan (mas rapido si hay gente libre). */
export function tickPueblo(m) {
  const p = m.pueblo;
  for (const e of p.edificios) {
    if (e.progreso >= 100) continue;
    const libres = m.agentes.filter((a) => !a.dimitido && a.vida && a.vida.actividad !== 'trabajar' && a.vida.actividad !== 'dormir').length;
    e.progreso = Math.min(100, e.progreso + 2 + libres * 1.5);
    if (e.progreso >= 100) {
      p.version++;
      const prop = p.propuestas.find((x) => x.id === e.propuesta);
      if (prop) prop.estado = 'hecha';
      m.registrar('sistema', `🎉 ¡Inaugurado: ${e.nombre} en ${p.nombre}!`);
      for (const a of m.agentes) if (!a.dimitido) a.moral = Math.min(100, a.moral + 4);
    }
  }
}

/** Una casa para un empleado (al alquilar/comprar). */
export function casaPara(m, agente, nombre, inmediata) {
  const p = m.pueblo;
  const vieja = p.edificios.find((e) => e.dueno === agente.id);
  if (vieja) { vieja.dueno = null; }
  const t = tipo('casa');
  const hueco = buscarHueco(p, t);
  if (!hueco) return null;
  const e = colocar(p, 'casa', hueco.x, hueco.y, inmediata, `Casa de ${agente.nombre}`);
  e.dueno = agente.id;
  e.estilo = nombre;
  return e;
}

export function accionPueblo(m, accion, carga) {
  const p = m.pueblo;
  if (accion === 'pueblo_modo') {
    p.modo = p.modo === 'libre' ? 'aprobar' : 'libre';
    return { ok: true, mensaje: p.modo === 'libre' ? 'Ahora las IAs deciden solas qué construir.' : 'Ahora tú apruebas o vetas cada propuesta.' };
  }
  if (accion === 'pueblo_aprobar' || accion === 'pueblo_vetar') {
    const prop = p.propuestas.find((x) => x.id === carga.id && x.estado === 'esperando_jefe');
    if (!prop) return { ok: false, mensaje: 'Esa propuesta ya no está pendiente.' };
    prop.estado = accion === 'pueblo_aprobar' ? 'aprobada' : 'rechazada';
    const t = accion === 'pueblo_aprobar' ? `✅ Apruebas: ${prop.nombre}. A juntar dinero.` : `⛔ Vetas: ${prop.nombre}. ${prop.autorNombre} no está contento.`;
    if (accion === 'pueblo_vetar') { const a = m.agentes.find((x) => x.id === prop.autor); if (a) a.moral = Math.max(0, a.moral - 6); }
    m.registrar('dios', t);
    return { ok: true, mensaje: t };
  }
  if (accion === 'pueblo_donar') {
    const prop = p.propuestas.find((x) => x.estado === 'aprobada');
    if (!prop) return { ok: false, mensaje: 'No hay ninguna obra juntando dinero.' };
    const cant = Math.min(m.empresa.dinero, prop.coste - prop.fondos);
    if (cant <= 0) return { ok: false, mensaje: 'No hay dinero en caja.' };
    m.empresa.dinero -= cant; prop.fondos += cant;
    return { ok: true, mensaje: `La empresa pone ${Math.round(cant)} EUR para ${prop.nombre}. Las obras empiezan esta noche.` };
  }
  return null;
}

export function vistaPueblo(m) {
  return { ...m.pueblo, tipos: TIPOS_EDIFICIO.map(({ id, nombre, w, h, estilo, lugar }) => ({ id, nombre, w, h, estilo, lugar })), ancho: ANCHO, alto: ALTO, calleY: CALLE_Y };
}
