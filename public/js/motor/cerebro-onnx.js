/**
 * CEREBRO ONNX  ·  una IA de verdad DENTRO del movil.
 *
 * Un telefono no puede con un modelo de 9B, pero si con uno de 0,5B (unos
 * 470 MB). Aqui se carga con ONNX Runtime Web y se ejecuta en el propio
 * navegador del movil, sin PC y sin conexion (una vez descargado el modelo).
 *
 * Es el MISMO motor de juego y el MISMO prompt que usa el PC: lo unico que
 * cambia es quien responde. Por eso el Laboratorio de IA sigue teniendo
 * sentido en el movil, y se puede comparar.
 *
 * Lo que hay que tener claro antes de usarlo:
 *   - La primera vez hay que DESCARGAR el modelo (~470 MB). Despues queda
 *     guardado y ya no hace falta conexion.
 *   - Cada decision tarda unos segundos (mas que el gemma-9B del PC).
 *   - Un modelo de 0,5B escribe peor: sus frases son mas sosas que las del
 *     cerebro simulado, que las escribi a mano una a una.
 */

import {
  systemPrompt,
  promptReaccion,
  promptCharla,
  interpretarDecision,
  extraerJson,
  limitar
} from './reglas.js';

/** Donde estan los ficheros de transformers.js y ONNX (van dentro del APK). */
const RUTA_IA = new URL('../../ia/', import.meta.url).href;

/**
 * Modelos que se pueden usar. El tamano es el del fichero que se descarga.
 * Todos estan en formato ONNX, que es el que entiende ONNX Runtime Web.
 */
export const MODELOS = [
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    nombre: 'Qwen 2.5 · 0,5B',
    mb: 490,
    nota: 'El que mejor escribe de los tres. Es el recomendado.',
    recomendado: true
  },
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    nombre: 'SmolLM2 · 360M',
    mb: 260,
    nota: 'La mitad de descarga. Escribe mas simple.'
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct',
    nombre: 'Qwen 2.5 · 1,5B',
    mb: 1100,
    nota: 'El que mejor razona, pero ocupa mucho y va lento.'
  }
];

const estimarTokens = (texto) => Math.ceil(String(texto || '').length / 4);

/* --------------------------------------------------------------- cerebro */

export class CerebroONNX {
  constructor() {
    /** No gasta nada externo: se ejecuta en el propio movil. */
    this.ilimitado = true;
    this.simulado = false;
    this.enElMovil = true;

    this.modeloElegido = MODELOS[0].id;
    this.tuberia = null;
    this.estado = 'sin-preparar';       // sin-preparar | descargando | cargando | listo | error
    this.mensajeEstado = 'La IA todavia no esta preparada.';
    this.progreso = 0;
    this.detalle = '';
    this.dispositivo = null;
    this.error = null;

    this.registro = [];
    this.maxRegistro = 60;
    this._enCurso = 0;
    this.oyentes = new Set();

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
  get modeloEnMemoria() { return this.tuberia ? this.modeloElegido : null; }
  get listo() { return this.estado === 'listo'; }

  /** El Laboratorio y la interfaz se apuntan aqui para ver el progreso. */
  alProgresar(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  _avisar() {
    const info = this.info();
    for (const fn of this.oyentes) {
      try { fn(info); } catch (_) { /* un oyente roto no rompe nada */ }
    }
  }

  info() {
    return {
      estado: this.estado,
      mensaje: this.mensajeEstado,
      progreso: this.progreso,
      detalle: this.detalle,
      dispositivo: this.dispositivo,
      modelo: this.modeloElegido,
      error: this.error
    };
  }

  async conectar() { return { ok: true, modelos: 1, enElMovil: true }; }
  async listarModelos() {
    return MODELOS.map((m) => ({ id: m.id, estado: 'descargable', conocido: { nota: m.nota } }));
  }
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
      cambiosDeModelo: e.cambiosDeModelo,
      enCola: this._enCurso,
      modeloEnMemoria: this.modeloEnMemoria,
      simulado: false,
      enElMovil: true
    };
  }

  /* --------------------------------------------------------- preparacion */

  /** Mira si el movil tiene WebGPU (mucho mas rapido) o tiramos de CPU. */
  async _detectarDispositivo() {
    try {
      if (navigator.gpu && await navigator.gpu.requestAdapter()) return 'webgpu';
    } catch (_) { /* sin webgpu */ }
    return 'wasm';
  }

  /**
   * Descarga (si hace falta) y carga el modelo. Se puede llamar varias veces:
   * si ya esta listo, no hace nada.
   */
  async preparar(modeloId) {
    if (modeloId) this.modeloElegido = modeloId;
    if (this.estado === 'listo' && this.tuberia) return true;
    if (this.estado === 'descargando' || this.estado === 'cargando') return false;

    try {
      this.error = null;
      this.estado = 'descargando';
      this.mensajeEstado = 'Descargando el motor de IA...';
      this.progreso = 0;
      this._avisar();

      // transformers.js se carga solo cuando hace falta: son 440 KB que no
      // queremos cargar si el jugador usa el cerebro simulado.
      const transformers = await import(/* @vite-ignore */ RUTA_IA + 'transformers.web.min.js');
      const { pipeline, env } = transformers;

      // Los ficheros del modelo NO estan en el juego: se bajan de HuggingFace
      // la primera vez. Aqui se le dice donde tiene que buscar.
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;

      // El motor de ONNX (el .wasm) SI va dentro del APK, para que no haya que
      // bajarlo nunca.
      const tieneHilos = typeof SharedArrayBuffer !== 'undefined';
      env.backends.onnx.wasm.wasmPaths = RUTA_IA;
      if (tieneHilos && navigator.hardwareConcurrency) {
        env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency);
      } else {
        env.backends.onnx.wasm.numThreads = 1;
      }

      this.dispositivo = await this._detectarDispositivo();
      // En WebGPU va bien medio precision; en CPU, cuantizado a 8 bits.
      const dtype = this.dispositivo === 'webgpu' ? 'q4f16' : 'q8';

      this.estado = 'descargando';
      this.mensajeEstado = `Descargando ${this.modeloElegido} (${dtype})...`;

      let totalBytes = 0;
      let bajados = 0;

      const progreso = (p) => {
        if (!p) return;
        if (p.status === 'initiate' && p.total) totalBytes += p.total;
        if (p.status === 'progress') {
          bajados = (p.loaded || 0);
          this.detalle = p.file || '';
          this.progreso = totalBytes ? Math.min(99, Math.round((bajados / totalBytes) * 100)) : 0;
          this._avisar();
        }
        if (p.status === 'ready' && p.file) {
          this.detalle = `${p.file} listo`;
          this._avisar();
        }
      };

      this.tuberia = await pipeline('text-generation', this.modeloElegido, {
        dtype,
        device: this.dispositivo,
        progress_callback: progreso
      });

      this.estado = 'listo';
      this.progreso = 100;
      this.detalle = this.dispositivo === 'webgpu' ? 'Acelerado por GPU' : 'Ejecutando en el procesador';
      this.mensajeEstado = 'IA lista.';
      this._avisar();
      return true;
    } catch (e) {
      this.estado = 'error';
      this.error = e && e.message ? e.message : String(e);
      this.mensajeEstado = 'No he podido preparar la IA.';
      this._avisar();
      return false;
    }
  }

  /** Suelta el modelo de la memoria (el fichero descargado se queda). */
  async descargar() {
    try {
      if (this.tuberia && this.tuberia.dispose) await this.tuberia.dispose();
    } catch (_) { /* da igual */ }
    this.tuberia = null;
    this.estado = 'sin-preparar';
    this.mensajeEstado = 'La IA esta descargada pero no cargada.';
    this._avisar();
  }

  /* ------------------------------------------------------------ generar */

  /** Saca el texto de la respuesta, sea cual sea la forma que devuelva. */
  _texto(salida) {
    if (!salida) return '';
    const primero = Array.isArray(salida) ? salida[0] : salida;
    if (!primero) return '';
    const gt = primero.generated_text;
    if (typeof gt === 'string') return gt;
    if (Array.isArray(gt) && gt.length) {
      const ultimo = gt[gt.length - 1];
      return ultimo && ultimo.content ? String(ultimo.content) : '';
    }
    return '';
  }

  async _generar(mensajes, { temperatura, maxTokens }) {
    const inicio = Date.now();
    const salida = await this.tuberia(mensajes, {
      max_new_tokens: Math.min(maxTokens || 140, 180),
      do_sample: true,
      temperature: limitar(temperatura == null ? 0.7 : temperatura, 0.1, 1.5),
      top_p: 0.9,
      repetition_penalty: 1.15,
      return_full_text: false
    });
    return { texto: this._texto(salida), ms: Date.now() - inicio };
  }

  _apuntar(entrada) {
    this.registro.push(entrada);
    if (this.registro.length > this.maxRegistro) this.registro.shift();
    this.estadisticas.llamadas++;
    this.estadisticas.tokensPrompt += entrada.tokensPrompt;
    this.estadisticas.tokensRespuesta += entrada.tokensRespuesta;
    this.estadisticas.msTotales += entrada.ms;
  }

  /* ---------------------------------------------------------- la interfaz */

  /** El empleado reacciona a lo que ha pasado. */
  async decidir({ agente, sucesos, mundo, etiqueta }) {
    if (!this.listo) throw new Error('La IA del movil todavia no esta preparada.');

    this._enCurso++;
    const system = systemPrompt(agente);
    const prompt = promptReaccion(mundo, agente, (Array.isArray(sucesos) ? sucesos : [sucesos]).join(' · '));

    try {
      const { texto, ms } = await this._generar(
        [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        { temperatura: agente.temperatura, maxTokens: 140 }
      );

      const json = extraerJson(texto);
      const entrada = {
        id: this.registro.length ? this.registro[this.registro.length - 1].id + 1 : 1,
        t: Date.now(),
        etiqueta,
        agenteId: agente.id,
        modelo: `${this.modeloElegido} (${this.dispositivo})`,
        temperatura: agente.temperatura,
        maxTokens: 140,
        esquema: json ? Object.keys(json) : null,
        mensajes: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        cambioDeModelo: false,
        ok: true,
        error: null,
        respuesta: texto,
        pensamiento: null,
        json,
        enElMovil: true,
        aviso: json ? null : 'El modelo no devolvio JSON valido; se ignorara su accion.',
        ms,
        tokensPrompt: estimarTokens(system) + estimarTokens(prompt),
        tokensRespuesta: estimarTokens(texto),
        tokPorSegundo: ms > 0 ? Number((estimarTokens(texto) / (ms / 1000)).toFixed(1)) : 0
      };

      this._apuntar(entrada);
      return entrada;
    } catch (e) {
      this.estadisticas.fallos++;
      this.estadisticas.llamadas++;
      throw e;
    } finally {
      this._enCurso--;
    }
  }

  /** El jefe le habla directamente. */
  async charlar({ agente, mensaje, mundo }) {
    if (!this.listo) throw new Error('La IA del movil todavia no esta preparada.');

    this._enCurso++;
    const system = systemPrompt(agente);
    const prompt = promptCharla(mundo, agente, mensaje);

    try {
      const { texto, ms } = await this._generar(
        [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        { temperatura: agente.temperatura, maxTokens: 160 }
      );

      const json = extraerJson(texto);
      const entrada = {
        id: this.registro.length ? this.registro[this.registro.length - 1].id + 1 : 1,
        t: Date.now(),
        etiqueta: `Hablar con ${agente.nombre}`,
        agenteId: agente.id,
        modelo: `${this.modeloElegido} (${this.dispositivo})`,
        temperatura: agente.temperatura,
        maxTokens: 160,
        esquema: json ? Object.keys(json) : null,
        mensajes: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        cambioDeModelo: false,
        ok: true,
        error: null,
        respuesta: texto,
        pensamiento: null,
        json,
        enElMovil: true,
        prompt,
        ms,
        tokensPrompt: estimarTokens(system) + estimarTokens(prompt),
        tokensRespuesta: estimarTokens(texto),
        tokPorSegundo: ms > 0 ? Number((estimarTokens(texto) / (ms / 1000)).toFixed(1)) : 0
      };

      this._apuntar(entrada);
      return entrada;
    } catch (e) {
      this.estadisticas.fallos++;
      this.estadisticas.llamadas++;
      throw e;
    } finally {
      this._enCurso--;
    }
  }
}

export { interpretarDecision };
