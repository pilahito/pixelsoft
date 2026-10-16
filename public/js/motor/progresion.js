/**
 * PROGRESION · contratos, investigacion de IA, plantas, rival, eventos y logros.
 * Funciona igual en el PC y en el movil (solo usa el estado del Mundo).
 */
const azar = (a, b) => a + Math.random() * (b - a);
const elegir = (l) => l[Math.floor(Math.random() * l.length)];

export const PLANTAS = [
  { id: 0, nombre: 'Garaje', coste: 0, bonoClientes: 1 },
  { id: 1, nombre: 'Planta 1 · Startup', coste: 2500, bonoClientes: 1.15, requiere: 'Termina 2 contratos' , contratos: 2 },
  { id: 2, nombre: 'Planta 2 · Scale-up', coste: 9000, bonoClientes: 1.35, requiere: 'Termina 6 contratos', contratos: 6 },
  { id: 3, nombre: 'Ático · Big Tech', coste: 30000, bonoClientes: 1.7, requiere: 'Termina 15 contratos', contratos: 15 }
];

/** Arbol de investigacion: cada nodo enseña un concepto real de IA. */
export const INVESTIGACION = [
  { id: 'tokens', nombre: 'Tokens', coste: 300, req: [], efecto: 'contratos +10% progreso',
    leccion: 'Un modelo no lee letras: lee tokens (trozos de palabra, ~4 caracteres). Pagas y esperas por token.' },
  { id: 'temperatura', nombre: 'Temperatura', coste: 450, req: ['tokens'], efecto: '+5 calidad',
    leccion: 'La temperatura reparte la probabilidad: baja = predecible, alta = creativa pero se lía.' },
  { id: 'contexto', nombre: 'Ventana de contexto', coste: 700, req: ['tokens'], efecto: 'empleados recuerdan más (+moral)',
    leccion: 'El contexto es la memoria de trabajo. Cuanto más metes, más lento y caro es cada paso.' },
  { id: 'cuantizacion', nombre: 'Cuantización', coste: 1100, req: ['contexto'], efecto: '-20% coste diario',
    leccion: 'Q4 guarda cada peso en 4 bits en vez de 16: el modelo cabe en menos RAM y casi no pierde calidad.' },
  { id: 'rag', nombre: 'RAG', coste: 1600, req: ['contexto', 'temperatura'], efecto: 'contratos +20% progreso',
    leccion: 'RAG busca documentos y los pega en el prompt: el modelo responde con datos que no memorizó.' },
  { id: 'finetune', nombre: 'Fine-tuning', coste: 3000, req: ['cuantizacion', 'rag'], efecto: '+10 reputación y +calidad',
    leccion: 'Afinar es seguir entrenando con tus ejemplos: el modelo aprende tu estilo, no hechos nuevos.' }
];

export const LOGROS = [
  { id: 'primer_contrato', nombre: 'Primer cliente', cond: (m) => m.progreso.contratosHechos >= 1 },
  { id: 'cinco_contratos', nombre: 'Agencia seria', cond: (m) => m.progreso.contratosHechos >= 5 },
  { id: 'rico', nombre: '10.000 en caja', cond: (m) => m.empresa.dinero >= 10000 },
  { id: 'sabio', nombre: 'Doctorado en IA', cond: (m) => m.progreso.investigado.length >= INVESTIGACION.length },
  { id: 'atico', nombre: 'Vistas al ático', cond: (m) => m.progreso.planta >= 3 },
  { id: 'rival', nombre: 'Adelantas al rival', cond: (m) => m.empresa.reputacion > m.progreso.rival.reputacion + 10 },
  { id: 'superviviente', nombre: 'Sobrevives 30 días', cond: (m) => m.dia >= 30 }
];

const CLIENTES = ['Panadería Paco', 'Ayuntamiento', 'Startup cripto', 'Clínica dental', 'Club de fútbol', 'Tienda de cómics', 'Banco Pixel', 'Academia de idiomas'];
const TRABAJOS = ['chatbot de atención', 'web con buscador', 'app de reservas', 'resumen de contratos', 'traductor interno', 'clasificador de correos'];

const EVENTOS = [
  { id: 'viral', p: 0.02, texto: '🚀 ¡Un tuit sobre PixelSoft se hace viral! +reputación y clientes.', aplicar: (m) => { m.empresa.reputacion = Math.min(100, m.empresa.reputacion + 8); m.empresa.clientes += 6; } },
  { id: 'hacker', p: 0.012, texto: '🕵️ Ataque hacker: os roban datos y dinero.', aplicar: (m) => { const r = m.empresa.tieneAntivirus || m.progreso.investigado.includes('finetune') ? 0.3 : 1; m.empresa.dinero -= Math.round(400 * r); m.empresa.reputacion = Math.max(0, m.empresa.reputacion - 4 * r); } },
  { id: 'gpu', p: 0.015, texto: '📉 Bajan las GPUs: el mantenimiento de hoy sale gratis.', aplicar: (m) => { m.empresa.dinero += 150; } },
  { id: 'cafe', p: 0.02, texto: '☕ Llega café de especialidad: todos con más energía.', aplicar: (m) => { for (const a of m.agentes) a.energia = Math.min(100, a.energia + 20); } },
  { id: 'inversor', p: 0.008, texto: '💼 Un inversor ángel os da 1.500 EUR por un 0% (es un buen tío).', aplicar: (m) => { m.empresa.dinero += 1500; } }
];

export function crearProgreso() {
  return {
    planta: 0,
    contratos: [],
    contratoActivo: null,
    contratosHechos: 0,
    contratosFallidos: 0,
    investigado: [],
    logros: [],
    rival: { nombre: 'MegaByte S.A.', reputacion: 35, clientes: 20 },
    tutorial: 0,
    ultimoEvento: null
  };
}

function nuevoContrato(m) {
  const nivel = 1 + m.progreso.planta + Math.floor(m.progreso.contratosHechos / 3);
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    cliente: elegir(CLIENTES),
    trabajo: elegir(TRABAJOS),
    trabajoTotal: Math.round(azar(40, 70) * nivel),
    progreso: 0,
    calidadMin: Math.min(90, Math.round(35 + nivel * 6 + azar(-5, 5))),
    pago: Math.round(azar(350, 600) * nivel),
    dias: 2 + Math.floor(azar(0, 3)),
    plazo: null
  };
}

export function multiplicadorPlanta(m) {
  return PLANTAS[m.progreso.planta].bonoClientes;
}

/** Cada hora de juego. */
export function tickProgreso(m) {
  const p = m.progreso;
  while (p.contratos.length < 3) p.contratos.push(nuevoContrato(m));

  const c = p.contratoActivo;
  if (c && m.laboral && !m.empresa.apagon) {
    let ritmo = 0;
    for (const a of m.agentes) {
      if (a.dimitido || a.estado === 'durmiendo') continue;
      ritmo += (a.habilidad || 50) / 50 * (0.4 + (a.energia || 50) / 100) * (0.5 + (a.moral || 50) / 100);
    }
    if (p.investigado.includes('tokens')) ritmo *= 1.1;
    if (p.investigado.includes('rag')) ritmo *= 1.2;
    c.progreso = Math.min(c.trabajoTotal, c.progreso + ritmo);
    if (c.progreso >= c.trabajoTotal) {
      const e = m.empresa;
      const bueno = e.calidad >= c.calidadMin;
      const pago = bueno ? c.pago : Math.round(c.pago * 0.5);
      e.dinero += pago;
      e.reputacion = Math.max(0, Math.min(100, e.reputacion + (bueno ? 3 : -3)));
      p.contratosHechos++;
      p.contratoActivo = null;
      m.registrar('dinero', bueno
        ? `✅ Contrato entregado a ${c.cliente}: +${pago} EUR. ¡Cliente encantado!`
        : `⚠️ ${c.cliente} recibe el ${c.trabajo}, pero esperaba calidad ${c.calidadMin}. Solo paga ${pago} EUR.`);
    }
  }

  // Eventos aleatorios (como mucho uno cada 12 horas de juego).
  if (!p.ultimoEvento || m.tick - p.ultimoEvento > 12) {
    for (const ev of EVENTOS) {
      if (Math.random() < ev.p) {
        ev.aplicar(m);
        m.registrar('alerta', ev.texto);
        p.ultimoEvento = m.tick;
        break;
      }
    }
  }

  for (const l of LOGROS) {
    if (!p.logros.includes(l.id) && l.cond(m)) {
      p.logros.push(l.id);
      m.registrar('sistema', `🏆 Logro desbloqueado: ${l.nombre}`);
    }
  }
}

/** Al cerrar cada dia. */
export function cerrarDiaProgreso(m) {
  const p = m.progreso;
  const c = p.contratoActivo;
  if (c) {
    c.plazo--;
    if (c.plazo < 0) {
      p.contratoActivo = null;
      p.contratosFallidos++;
      m.empresa.reputacion = Math.max(0, m.empresa.reputacion - 6);
      m.registrar('alerta', `❌ Se pasó el plazo del contrato de ${c.cliente}. -6 reputación.`);
    }
  }
  // El rival crece solo, y te roba clientes si tu reputacion es peor.
  const r = p.rival;
  r.reputacion = Math.max(10, Math.min(95, r.reputacion + azar(-1, 2.2)));
  r.clientes = Math.max(5, r.clientes * azar(0.97, 1.06));
  if (r.reputacion > m.empresa.reputacion + 5) {
    const robados = Math.min(m.empresa.clientes * 0.08, 4);
    m.empresa.clientes -= robados;
    if (robados > 0.5) m.registrar('alerta', `🏢 ${r.nombre} os quita ${Math.round(robados)} clientes. Sube tu reputación.`);
  }
  // Rotar una oferta vieja.
  if (p.contratos.length) p.contratos.shift();
}

/** Ajustes del coste diario por investigaciones. */
export function factorCoste(m) {
  return m.progreso.investigado.includes('cuantizacion') ? 0.8 : 1;
}

export function accionProgreso(m, accion, carga) {
  const p = m.progreso;
  const e = m.empresa;
  if (accion === 'aceptar_contrato') {
    if (p.contratoActivo) return { ok: false, mensaje: 'Ya tenéis un contrato en marcha. Terminadlo primero.' };
    const i = p.contratos.findIndex((c) => String(c.id) === String(carga.id));
    if (i < 0) return { ok: false, mensaje: 'Ese contrato ya no está disponible.' };
    const c = p.contratos.splice(i, 1)[0];
    c.plazo = c.dias;
    p.contratoActivo = c;
    const texto = `El jefe acepta un ${c.trabajo} para ${c.cliente}: ${c.pago} EUR en ${c.dias} días (calidad mínima ${c.calidadMin}).`;
    m.registrar('dios', texto);
    m.encolarReflexionATodos(texto);
    return { ok: true, mensaje: texto };
  }
  if (accion === 'investigar') {
    const n = INVESTIGACION.find((x) => x.id === carga.id);
    if (!n) return { ok: false, mensaje: 'Esa investigación no existe.' };
    if (p.investigado.includes(n.id)) return { ok: false, mensaje: 'Ya lo habéis investigado.' };
    if (!n.req.every((r) => p.investigado.includes(r))) return { ok: false, mensaje: 'Primero investiga lo anterior del árbol.' };
    if (e.dinero < n.coste) return { ok: false, mensaje: `Necesitas ${n.coste} EUR.` };
    e.dinero -= n.coste;
    p.investigado.push(n.id);
    if (n.id === 'temperatura') e.calidad = Math.min(100, e.calidad + 5);
    if (n.id === 'contexto') for (const a of m.agentes) a.moral = Math.min(100, a.moral + 8);
    if (n.id === 'finetune') { e.reputacion = Math.min(100, e.reputacion + 10); e.calidad = Math.min(100, e.calidad + 8); }
    const texto = `🔬 Investigado: ${n.nombre}. ${n.leccion}`;
    m.registrar('sistema', texto);
    return { ok: true, mensaje: texto };
  }
  if (accion === 'subir_planta') {
    const sig = PLANTAS[p.planta + 1];
    if (!sig) return { ok: false, mensaje: 'Ya estáis en lo más alto.' };
    if (p.contratosHechos < sig.contratos) return { ok: false, mensaje: `${sig.requiere} para mudaros.` };
    if (e.dinero < sig.coste) return { ok: false, mensaje: `La mudanza cuesta ${sig.coste} EUR.` };
    e.dinero -= sig.coste;
    p.planta++;
    const texto = `🏢 ¡Mudanza! PixelSoft se va a ${sig.nombre}. Más clientes os encuentran.`;
    m.registrar('dios', texto);
    m.encolarReflexionATodos(texto);
    return { ok: true, mensaje: texto };
  }
  return null;
}

export function vistaProgreso(m) {
  const p = m.progreso;
  return {
    ...p,
    plantas: PLANTAS.map(({ id, nombre, coste, requiere, contratos }) => ({ id, nombre, coste, requiere, contratos })),
    investigacion: INVESTIGACION.map((n) => ({ ...n, hecho: p.investigado.includes(n.id), disponible: n.req.every((r) => p.investigado.includes(r)) })),
    logrosTodos: LOGROS.map((l) => ({ id: l.id, nombre: l.nombre, hecho: p.logros.includes(l.id) }))
  };
}
