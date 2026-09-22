/**
 * CEREBRO SIMULADO  ·  El que va dentro del movil.
 *
 * Un telefono no puede ejecutar un modelo de 9B: eso vive en el PC. Asi que en
 * el APK los empleados piensan con ESTO: reglas + un corpus de frases escritas
 * a mano para cada personaje.
 *
 * Lo honesto es decirlo claro: aqui NO hay una IA. Hay un simulador que imita
 * el comportamiento de una. Sirve para jugar en cualquier sitio, pero las
 * reacciones no las inventa un modelo.
 *
 * Para que el juego siga siendo didactico, este cerebro apunta en su registro
 * el prompt que SE LE HABRIA MANDADO a un modelo real, y la decision que ha
 * tomado en su lugar. Asi el Laboratorio IA sigue teniendo sentido.
 */

import { aplicarAccion, ACCIONES } from './reglas.js';
import { systemPrompt, promptReaccion, promptCharla } from './reglas.js';
import { VOCES } from './voces.js';
import { INTENCIONES, RESPUESTAS, COLETILLAS } from './charla.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const azar = () => Math.random();
const elegir = (lista) => (lista && lista.length ? lista[Math.floor(azar() * lista.length)] : null);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

/** Estimacion de tokens: en español ronda 1 token cada 4 caracteres. */
const estimarTokens = (texto) => Math.ceil(String(texto || '').length / 4);

/** Frases de emergencia, por si el corpus no cubre a algun personaje. */
const VOCES_BASE = {
  dialogo: { alta: ['Vale, me pongo.'], baja: ['Estoy hasta arriba.'] },
  pensamiento: { alta: ['Vamos a ello.'], baja: ['No puedo mas.'] },
  _objetivos: ['Seguir con lo mio.']
};

/* --------------------------------------------------- leer el suceso */

/**
 * Traduce el texto del suceso a una de las ocho familias que tienen frases.
 * Los textos vienen de mundo.js y van sin tildes a proposito.
 */
export function clasificarSucesos(sucesos) {
  const texto = (Array.isArray(sucesos) ? sucesos.join(' ') : String(sucesos || '')).toLowerCase();

  if (/destrozado el ordenador|humeando/.test(texto)) return 'ordenador_roto';
  if (/ordenador nuevo/.test(texto)) return 'bono';
  if (/bono/.test(texto)) return 'bono';
  if (/bronca/.test(texto)) return 'bronca';
  if (/despedido|dimit|se marcha de pixelsoft/.test(texto)) return 'despido';
  if (/se incorpora|contratad/.test(texto)) return 'fichaje';
  if (/cafetera/.test(texto)) return 'bono';
  if (/casa antes de tiempo|dia libre/.test(texto)) return 'bono';
  if (/luz/.test(texto)) return 'ordenador_roto';
  if (/alquiler/.test(texto)) return 'precio_subida';

  const pct = texto.match(/precio un ([+-]?\d+)\s*%/);
  if (pct) return Number(pct[1]) < 0 ? 'precio_bajada' : 'precio_subida';
  if (/dejo el precio/.test(texto)) return 'rutina';
  if (/precio/.test(texto)) return 'precio_subida';

  return 'rutina';
}

/* --------------------------------------------------- elegir accion */

/**
 * Puntua cada accion posible segun el estado del empleado y lo que ha pasado.
 * Luego se elige con un poco de ruido, para que no sea siempre predecible.
 */
export function elegirAccion(agente, mundo, evento) {
  const e = mundo.empresa;
  const precioBase = 18 + e.calidad * 0.35;
  const ratio = e.precio / Math.max(1, precioBase);
  const sensible = agente.sensibilidadPrecio != null ? agente.sensibilidadPrecio : 0.4;
  const punt = {};
  const suma = (k, v) => { punt[k] = (punt[k] || 0) + v; };

  // Lo normal es trabajar.
  suma('trabajar', 10);

  if (agente.ordenador && agente.ordenador.roto) {
    suma('reparar', 45);
    suma('quejarse', 12);
    suma('trabajar', -12);
  }
  if (agente.energia < 35) { suma('descansar', 12); suma('cafe', 9); suma('trabajar', -5); }
  if (agente.energia < 15) { suma('descansar', 22); suma('cafe', 15); suma('trabajar', -12); }
  if (agente.moral < 40) { suma('quejarse', 14); suma('trabajar', -4); }
  if (agente.moral < 22) { suma('quejarse', 14); suma('pedir_aumento', 9); suma('renunciar', 5); }

  if (ratio > 1.25) suma('quejarse', 12 * sensible * 2);
  if (ratio > 1.6) { suma('quejarse', 12); suma('renunciar', 3); }

  switch (evento) {
    case 'bono': suma('motivarse', 26); suma('cafe', 8); break;
    case 'bronca': suma('quejarse', 18); suma('motivarse', 12); suma('renunciar', 4); break;
    case 'ordenador_roto': suma('reparar', 40); suma('quejarse', 16); suma('renunciar', 2); break;
    case 'precio_subida': suma('quejarse', 18); suma('pedir_aumento', 4); break;
    case 'precio_bajada': suma('trabajar', 9); suma('motivarse', 7); break;
    case 'fichaje': suma('ayudar', 13); suma('trabajar', 4); break;
    case 'despido': suma('motivarse', 8); suma('quejarse', 9); suma('descansar', 6); break;
    default: break;
  }

  // Caprichos y despistes, para que no sea un robot.
  if (azar() < 0.12) suma('cafe', 10);
  if (azar() < 0.07) suma('ignorar', 14);
  if (azar() < 0.05) suma('ayudar', 10);

  let mejor = 'trabajar';
  let mejorPunt = -Infinity;
  for (const clave of Object.keys(punt)) {
    const p = punt[clave] + azar() * 8;
    if (p > mejorPunt) { mejorPunt = p; mejor = clave; }
  }
  return mejor;
}

/* --------------------------------------------------- elegir frases */

const vozDe = (id) => (VOCES && VOCES[id]) || null;

function fraseDe(id, evento, tipo, tier) {
  const voz = vozDe(id);
  const bloque = voz && voz[evento];
  const escogido = bloque && bloque[tipo] && bloque[tipo][tier];
  if (escogido && escogido.length) return elegir(escogido);
  const respaldo = VOCES_BASE[tipo] && VOCES_BASE[tipo][tier];
  return elegir(respaldo) || '...';
}

function objetivoDe(id) {
  const voz = vozDe(id);
  const lista = (voz && voz._objetivos) || VOCES_BASE._objetivos;
  return elegir(lista) || VOCES_BASE._objetivos[0];
}

/* --------------------------------------------------- conversacion */

export function detectarIntencion(mensaje) {
  const texto = String(mensaje || '').toLowerCase();
  for (const it of INTENCIONES || []) {
    if (!it || it.id === 'generico' || !it.patron) continue;
    try {
      if (new RegExp(it.patron, 'i').test(texto)) return it.id;
    } catch (_) { /* patron mal escrito: se ignora y se sigue */ }
  }
  return 'generico';
}

function coletillaDe(id, agente, mundo) {
  if (!COLETILLAS) return null;
  const e = mundo.empresa;
  const precioBase = 18 + e.calidad * 0.35;
  const candidatas = [];

  if (agente.moral < 35) candidatas.push('moralBaja');
  if (agente.energia < 30) candidatas.push('sinEnergia');
  if (agente.ordenador && agente.ordenador.roto) candidatas.push('ordenadorRoto');
  if (e.precio / Math.max(1, precioBase) > 1.3) candidatas.push('precioCaro');

  if (!candidatas.length || azar() > 0.55) return null;
  const grupo = COLETILLAS[elegir(candidatas)];
  const lista = grupo && grupo[id];
  return elegir(lista);
}

/* --------------------------------------------------- el cerebro */

export class CerebroSimulado {
  constructor() {
    /** No gasta nada, asi que el mundo no le pone freno. */
    this.ilimitado = true;
    this.simulado = true;

    this.registro = [];
    this.maxRegistro = 60;
    this._enCurso = 0;
    this._ultimaFrase = new Map();

    this.estadisticas = {
      llamadas: 0,
      fallos: 0,
      tokensPrompt: 0,
      tokensRespuesta: 0,
      msTotales: 0,
      cambiosDeModelo: 0
    };
  }

  get enCola() { return this._enCurso; }
  get modeloEnMemoria() { return 'cerebro simulado'; }

  alCambiar() { return () => {}; }
  async conectar() { return { ok: true, modelos: 0, simulado: true }; }
  async listarModelos() { return []; }
  mediaTokensPrompt() {
    const conDatos = this.registro.filter((r) => r.tokensPrompt > 0);
    if (!conDatos.length) return 0;
    return Math.round(conDatos.reduce((a, r) => a + r.tokensPrompt, 0) / conDatos.length);
  }

  resumenEstadisticas() {
    const e = this.estadisticas;
    return {
      llamadas: e.llamadas,
      fallos: e.fallos,
      tokensPrompt: e.tokensPrompt,
      tokensRespuesta: e.tokensRespuesta,
      tokensTotales: e.tokensPrompt + e.tokensRespuesta,
      msMedios: e.llamadas ? Math.round(e.msTotales / e.llamadas) : 0,
      cambiosDeModelo: 0,
      enCola: this._enCurso,
      modeloEnMemoria: 'cerebro simulado',
      simulado: true
    };
  }

  _apuntar(entrada) {
    this.registro.push(entrada);
    if (this.registro.length > this.maxRegistro) this.registro.shift();
    this.estadisticas.llamadas++;
    this.estadisticas.tokensPrompt += entrada.tokensPrompt;
    this.estadisticas.tokensRespuesta += entrada.tokensRespuesta;
    this.estadisticas.msTotales += entrada.ms;
  }

  /** El empleado reacciona a lo que ha pasado. */
  async decidir({ agente, sucesos, mundo, etiqueta }) {
    this._enCurso++;
    const inicio = Date.now();

    try {
      // Pequena pausa: hace que se vea el "pensando..." y que las reacciones
      // lleguen escalonadas, como cuando respondia el modelo de verdad.
      await esperar(500 + azar() * 900);

      const evento = clasificarSucesos(sucesos);
      const tier = agente.moral >= 45 ? 'alta' : 'baja';

      const accion = elegirAccion(agente, mundo, evento);
      const dialogo = fraseDe(agente.id, evento, 'dialogo', tier);
      const pensamiento = fraseDe(agente.id, evento, 'pensamiento', tier);
      const objetivo = objetivoDe(agente.id);

      const animo = limitar(Math.round(agente.moral + (azar() * 20 - 10)), 0, 100);

      const json = { pensamiento, animo, accion, dialogo, objetivo };
      const respuesta = JSON.stringify(json, null, 2);

      // El prompt que se le habria mandado a un modelo real. Se guarda para
      // que el Laboratorio IA siga ensenando como funciona esto por dentro.
      const prompt = promptReaccion(mundo, agente, (Array.isArray(sucesos) ? sucesos : [sucesos]).join(' · '));
      const system = systemPrompt(agente);

      const entrada = {
        id: this.registro.length ? this.registro[this.registro.length - 1].id + 1 : 1,
        t: Date.now(),
        etiqueta,
        agenteId: agente.id,
        modelo: 'cerebro simulado',
        temperatura: agente.temperatura,
        maxTokens: 0,
        esquema: ['pensamiento', 'animo', 'accion', 'dialogo', 'objetivo'],
        mensajes: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        cambioDeModelo: false,
        ok: true,
        error: null,
        respuesta,
        pensamiento,
        json,
        simulado: true,
        ms: Date.now() - inicio,
        tokensPrompt: estimarTokens(system) + estimarTokens(prompt),
        tokensRespuesta: estimarTokens(respuesta),
        tokPorSegundo: 0
      };

      this._apuntar(entrada);
      return entrada;
    } finally {
      this._enCurso--;
    }
  }

  /** El jefe le habla. Aqui se elige frase por intencion del mensaje. */
  async charlar({ agente, mensaje, mundo, maxTokens }) {
    this._enCurso++;
    const inicio = Date.now();

    try {
      await esperar(450 + azar() * 800);

      const intencion = detectarIntencion(mensaje);
      const voz = RESPUESTAS && RESPUESTAS[agente.id];
      let dialogo = elegir(voz && voz[intencion]);

      // Evita repetir exactamente la misma frase dos veces seguidas.
      if (dialogo && this._ultimaFrase.get(agente.id) === dialogo) {
        const alternativa = elegir(voz && voz[intencion]);
        if (alternativa) dialogo = alternativa;
      }
      if (!dialogo) dialogo = 'Ya, jefe. Lo tendre en cuenta.';

      const coletilla = coletillaDe(agente.id, agente, mundo);
      if (coletilla) dialogo = dialogo.replace(/[.\s]+$/, '') + '. ' + coletilla;

      this._ultimaFrase.set(agente.id, dialogo);

      // El animo que declara depende de lo que le hayas dicho.
      let delta = 0;
      if (intencion === 'elogio') delta = 9;
      if (intencion === 'amenaza') delta = -11;
      if (intencion === 'presion') delta = -5;
      if (intencion === 'sueldo') delta = 3;
      if (intencion === 'saludo') delta = 2;

      const animo = limitar(Math.round(agente.moral + delta + (azar() * 8 - 4)), 0, 100);

      const recorte = String(mensaje || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      const recuerdo = `El jefe me dijo: "${recorte}"`;

      const json = { dialogo, animo, recuerdo };
      const respuesta = JSON.stringify(json, null, 2);

      const prompt = promptCharla(mundo, agente, mensaje);
      const system = systemPrompt(agente);

      const entrada = {
        id: this.registro.length ? this.registro[this.registro.length - 1].id + 1 : 1,
        t: Date.now(),
        etiqueta: `Hablar con ${agente.nombre}`,
        agenteId: agente.id,
        modelo: 'cerebro simulado',
        temperatura: agente.temperatura,
        maxTokens: 0,
        esquema: ['dialogo', 'animo', 'recuerdo'],
        mensajes: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        cambioDeModelo: false,
        ok: true,
        error: null,
        respuesta,
        pensamiento: null,
        json,
        simulado: true,
        prompt,
        ms: Date.now() - inicio,
        tokensPrompt: estimarTokens(system) + estimarTokens(prompt),
        tokensRespuesta: estimarTokens(respuesta),
        tokPorSegundo: 0
      };

      this._apuntar(entrada);
      return entrada;
    } finally {
      this._enCurso--;
    }
  }
}

export { ACCIONES, aplicarAccion };
