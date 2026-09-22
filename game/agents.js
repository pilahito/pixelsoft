'use strict';

/**
 * AGENTES: el cerebro de cada empleado.
 *
 * Aqui esta la parte mas importante para aprender como funciona una IA:
 *
 *   PERSONALIDAD (system prompt)  -> quien es
 *   ESTADO DEL MUNDO (user)       -> que esta pasando
 *   MEMORIA (recuerdos)           -> que le ha pasado antes
 *   ESQUEMA JSON                  -> que forma tiene su respuesta
 *
 * Todo eso se junta en un texto (= prompt), se lo Come el modelo, y lo que
 * devuelve se traduce en acciones del juego. El modelo NO toca el juego
 * directamente: solo PROPONE. Las reglas de aqui deciden que es valido.
 */

/** Acciones que un empleado puede elegir. El catalogo va en el prompt. */
const ACCIONES = {
  trabajar: {
    descripcion: 'ponerte a trabajar en el producto',
    efectos: { moral: 2, calidad: 1.4, energia: -4, estado: 'trabajando', sitio: 'escritorio' }
  },
  reparar: {
    descripcion: 'arreglar tu ordenador (solo sirve si lo tienes roto)',
    efectos: { estado: 'reparando', sitio: 'escritorio', repara: true, energia: -3 }
  },
  descansar: {
    descripcion: 'tomarte un respiro para recuperar fuerzas',
    efectos: { energia: 12, moral: 1, estado: 'descansando', sitio: 'sofa' }
  },
  cafe: {
    descripcion: 'ir a por un cafe (cuesta 8 euros a la empresa)',
    efectos: { dinero: -8, moral: 7, energia: 10, estado: 'cafe', sitio: 'cafetera' }
  },
  quejarse: {
    descripcion: 'desahogarte en voz alta',
    efectos: { moral: 5, reputacion: -0.4, estado: 'quejandose', sitio: 'pasillo' }
  },
  pedir_aumento: {
    descripcion: 'pedirle un aumento al jefe',
    efectos: { peticionAumento: true, moral: -2 }
  },
  motivarse: {
    descripcion: 'animarte a ti mismo y seguir adelante',
    efectos: { moral: 9, energia: 3, estado: 'motivado', sitio: 'escritorio' }
  },
  ayudar: {
    descripcion: 'ir a ayudar a un companero que va ahogado',
    efectos: { moral: 5, calidad: 0.7, energia: -3, estado: 'ayudando', sitio: 'companero' }
  },
  ignorar: {
    descripcion: 'no darle importancia y seguir a lo tuyo',
    efectos: { moral: -1 }
  },
  renunciar: {
    descripcion: 'dimitir y marcharte de la empresa',
    efectos: { dimite: true, estado: 'dimitido' }
  }
};

/** Esquema JSON que el modelo esta OBLIGADO a cumplir. */
const ESQUEMA_DECISION = {
  type: 'object',
  properties: {
    pensamiento: { type: 'string' },
    animo: { type: 'integer' },
    accion: { type: 'string', enum: Object.keys(ACCIONES) },
    dialogo: { type: 'string' },
    objetivo: { type: 'string' }
  },
  required: ['pensamiento', 'animo', 'accion', 'dialogo', 'objetivo'],
  additionalProperties: false
};

/** Esquema para la conversacion libre (hablar con el jefe). */
const ESQUEMA_CHARLA = {
  type: 'object',
  properties: {
    dialogo: { type: 'string' },
    animo: { type: 'integer' },
    recuerdo: { type: 'string' }
  },
  required: ['dialogo', 'animo', 'recuerdo'],
  additionalProperties: false
};

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

/** Redondea a 1 decimal, para que el JSON sea corto (menos tokens). */
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Construye el system prompt: la personalidad + las reglas del juego.
 * Se manda en TODAS las llamadas de este empleado.
 */
function systemPrompt(empleado) {
  const catalogo = Object.entries(ACCIONES)
    .map(([clave, a]) => `- ${clave}: ${a.descripcion}`)
    .join('\n');

  return [
    empleado.personalidad,
    '',
    'Trabajas en una empresa de software llamada PixelSoft. Hay un "jefe" que puede intervenir en la empresa cuando quiera: cambiar precios, romper ordenadores, dar bonus o hablar contigo. Tu no controlas al jefe.',
    '',
    `ACCIONES DISPONIBLES (elige exactamente una):\n${catalogo}`,
    '',
    'Responde SIEMPRE en espanol y SIEMPRE con un objeto JSON valido con estas claves:',
    '- "pensamiento": lo que piensas de verdad, 1 o 2 frases. Aqui puedes ser crudo.',
    '- "animo": tu moral actual, un numero entero de 0 a 100.',
    '- "accion": una de las acciones de la lista, escrita exactamente igual.',
    '- "dialogo": lo que dices en voz alta, UNA sola frase corta y natural.',
    '- "objetivo": que piensas hacer a continuacion, una frase muy corta.',
    '',
    'No escribas nada fuera del JSON. No uses markdown.'
  ].join('\n');
}

/** Bloque compacto del estado del mundo. Corto = menos tokens. */
function bloqueMundo(mundo) {
  const e = mundo.empresa;
  return [
    `DIA ${mundo.dia} · ${String(mundo.hora).padStart(2, '0')}:00`,
    `Caja: ${Math.round(e.dinero)} EUR | Precio: ${r1(e.precio)} EUR | Reputacion: ${Math.round(e.reputacion)}/100 | Calidad: ${Math.round(e.calidad)}/100 | Clientes: ${Math.round(e.clientes)}`
  ].join('\n');
}

/** Bloque con los datos del propio empleado y de sus companeros. */
function bloqueEquipo(mundo, empleado) {
  const yo = `Tu: ${empleado.nombre} (${empleado.puesto}) | energia ${Math.round(empleado.energia)}/100 | moral ${Math.round(empleado.moral)}/100 | habilidad ${Math.round(empleado.habilidad)}/100 | ordenador al ${Math.round(empleado.ordenador.salud)}%`;

  // Si tiene el ordenador roto hay que dejarlo MUY claro: los modelos pequenos
  // se pierden si el dato importante va enterrado entre numeros.
  const averia = empleado.ordenador.roto
    ? '\nAVERIA: TU ORDENADOR ESTA ROTO Y NO PUEDES TRABAJAR. Puedes arreglarlo tu (accion "reparar") o quejarte.'
    : '';

  const otros = mundo.agentes
    .filter((a) => a.id !== empleado.id && !a.dimitido)
    .map((a) => `${a.nombre} (${a.estado}, moral ${Math.round(a.moral)})`)
    .join(', ');

  const lineaOtros = otros ? `\nCompaneros: ${otros}` : '';
  return yo + averia + lineaOtros;
}

/** Bloque de memoria: LO QUE EL MODELO RECUERDA. Lo demas se ha olvidado. */
function bloqueMemoria(empleado) {
  if (!empleado.recuerdos.length) return 'No recuerdas nada relevante todavia.';
  return ['Lo que recuerdas (lo mas antiguo puede haberse olvidado):']
    .concat(empleado.recuerdos.map((r) => `- ${r}`))
    .join('\n');
}

/**
 * Prompt completo para que el empleado reaccione a un suceso.
 * `suceso` es un texto corto del tipo "El jefe ha subido el precio un 20%".
 */
function promptReaccion(mundo, empleado, suceso) {
  return [
    bloqueMundo(mundo),
    '',
    bloqueEquipo(mundo, empleado),
    '',
    bloqueMemoria(empleado),
    '',
    `SUCESO: ${suceso}`,
    '',
    'Reacciona como ' + empleado.nombre + ' y decide tu accion.'
  ].join('\n');
}

/** Prompt para una conversacion libre con el jefe. */
function promptCharla(mundo, empleado, mensajeJefe) {
  const historial = empleado.conversacion.map((m) => {
    const quien = m.rol === 'jefe' ? 'JEFE' : empleado.nombre.toUpperCase();
    return `${quien}: ${m.texto}`;
  });

  return [
    bloqueMundo(mundo),
    '',
    bloqueEquipo(mundo, empleado),
    '',
    bloqueMemoria(empleado),
    '',
    historial.length ? 'Conversacion reciente:\n' + historial.join('\n') : 'El jefe se acerca a hablarte por primera vez.',
    '',
    `JEFE: ${mensajeJefe}`,
    '',
    `Responde como ${empleado.nombre}. Ademas, en "recuerdo" apunta en una frase muy corta que quieres acordarte de esta conversacion.`
  ].join('\n');
}

/**
 * Aplica los efectos de una accion al empleado y a la empresa.
 * Devuelve una lista de sucesos legibles para el registro del juego.
 */
function aplicarAccion(mundo, empleado, accion) {
  const def = ACCIONES[accion];
  const sucesos = [];
  if (!def) return [{ tipo: 'aviso', texto: `${empleado.nombre} dudo y no hizo nada.` }];

  const ef = def.efectos || {};

  if (typeof ef.moral === 'number') empleado.moral = limitar(empleado.moral + ef.moral, 0, 100);
  if (typeof ef.energia === 'number') empleado.energia = limitar(empleado.energia + ef.energia, 0, 100);
  if (typeof ef.calidad === 'number') mundo.empresa.calidad = limitar(mundo.empresa.calidad + ef.calidad, 0, 100);
  if (typeof ef.reputacion === 'number') mundo.empresa.reputacion = limitar(mundo.empresa.reputacion + ef.reputacion, 0, 100);
  if (typeof ef.dinero === 'number') mundo.empresa.dinero += ef.dinero;
  if (ef.estado) empleado.estado = ef.estado;
  if (ef.sitio) empleado.sitio = ef.sitio;

  // Las decisiones de la IA son momentaneas: un enfado, un cafe, un descanso.
  // Caducan, y el empleado vuelve a su mesa. Si no, se quedaria plantado en
  // mitad de la oficina para siempre.
  if (ef.estado && ef.estado !== 'dimitido' && ef.estado !== 'reparando') {
    empleado.estadoHasta = mundo.tick + 8;
  }

  if (ef.repara) {
    empleado.reparando = true;
    sucesos.push({ tipo: 'reparacion', texto: `${empleado.nombre} se pone a arreglar su ordenador.` });
  }
  if (ef.peticionAumento) {
    empleado.peticionAumento = true;
    sucesos.push({ tipo: 'peticion', texto: `${empleado.nombre} te pide un aumento de sueldo.` });
  }
  if (ef.dimite) {
    empleado.dimitido = true;
    sucesos.push({ tipo: 'dimision', texto: `${empleado.nombre} DIMITE. Se marcha de PixelSoft.` });
  }

  return sucesos;
}

/** Convierte la respuesta del modelo en algo usable, con red de seguridad. */
function interpretarDecision(respuestaJson) {
  const bruto = respuestaJson || {};
  const accion = ACCIONES[bruto.accion] ? bruto.accion : null;
  return {
    pensamiento: String(bruto.pensamiento || '').trim(),
    animo: Number.isFinite(bruto.animo) ? limitar(Math.round(bruto.animo), 0, 100) : null,
    accion,
    dialogo: String(bruto.dialogo || '').trim(),
    objetivo: String(bruto.objetivo || '').trim()
  };
}

/** Añade un recuerdo, olvidando los mas antiguos (esto ES el contexto). */
function recordar(empleado, texto, maxRecuerdos) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return;
  const entrada = `Dia ${empleado._diaActual || '?'}: ${limpio}`;
  empleado.recuerdos.push(entrada);
  while (empleado.recuerdos.length > maxRecuerdos) empleado.recuerdos.shift();
}

/** Crea un empleado nuevo a partir de la definicion del config. */
function crearEmpleado(def, indice, modelo) {
  return {
    id: def.id,
    nombre: def.nombre,
    puesto: def.puesto,
    aspecto: def.aspecto,
    personalidad: def.personalidad,
    temperatura: typeof def.temperatura === 'number' ? def.temperatura : 0.7,
    modelo: def.modelo || modelo,
    /** Cuanto le afecta al empleado que el jefe suba los precios (0 a 1). */
    sensibilidadPrecio: typeof def.sensibilidadPrecio === 'number' ? def.sensibilidadPrecio : 0.4,
    indiceEscritorio: indice,
    sitio: 'escritorio',   // todos empiezan en su mesa, trabajando
    estado: 'trabajando',
    energia: 70 + Math.round(Math.random() * 20),
    moral: 60 + Math.round(Math.random() * 20),
    habilidad: 30 + Math.round(Math.random() * 30),
    ordenador: { salud: 100, roto: false, rotoDesde: null },
    recuerdos: [],
    conversacion: [],
    ultimaDecision: null,
    ultimaCharla: null,
    pensando: false,
    pensandoMotivo: null,
    reparando: false,
    peticionAumento: false,
    dimitido: false,
    _diaActual: 1
  };
}

module.exports = {
  ACCIONES,
  ESQUEMA_DECISION,
  ESQUEMA_CHARLA,
  systemPrompt,
  promptReaccion,
  promptCharla,
  aplicarAccion,
  interpretarDecision,
  recordar,
  crearEmpleado,
  limitar
};
