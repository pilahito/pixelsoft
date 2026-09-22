'use strict';

/**
 * Cliente para el servidor local de modelos (LM Studio / llama-server).
 *
 * Dos cosas importantes que hay que entender de este servidor:
 *
 *  1) `--parallel 1`  -> solo atiende UNA peticion a la vez. Por eso todas las
 *     llamadas pasan por una cola (`enqueue`). Si no, el servidor las rechaza
 *     o las encola el solo y perdemos las metricas.
 *
 *  2) `--models-max 1` -> solo puede tener UN modelo cargado en VRAM. Cambiar
 *     de modelo obliga a descargar el anterior y cargar el nuevo (~5-10 s).
 *     Por eso `cargarModelo` es perezoso y contamos los cambios.
 *
 * Ademas: todo lo que entra y sale se guarda en un registro circular para que
 * el jugador pueda VER el prompt exacto y la respuesta cruda. Eso es el
 * "laboratorio de IA" del juego.
 */

import http from 'node:http';
import { execFileSync } from 'node:child_process';

/** Extrae el primer objeto JSON valido de un texto, aunque venga sucio. */
function extraerJson(raw) {
  if (!raw) return null;
  let texto = String(raw).trim();

  // Quitar vallas de markdown: ```json ... ```
  texto = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // Intento directo
  try {
    return JSON.parse(texto);
  } catch (_) {
    /* seguimos */
  }

  // Escaneo de llaves balanceadas, respetando cadenas y escapes
  const inicio = texto.indexOf('{');
  if (inicio === -1) return null;

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === '\\') escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') { enCadena = true; continue; }
    if (c === '{') profundidad++;
    else if (c === '}') {
      profundidad--;
      if (profundidad === 0) {
        const candidato = texto.slice(inicio, i + 1);
        try {
          return JSON.parse(candidato);
        } catch (_) {
          try {
            // Ultimo recurso: quitar comas finales
            return JSON.parse(candidato.replace(/,\s*([}\]])/g, '$1'));
          } catch (_) {
            return null;
          }
        }
      }
    }
  }
  return null;
}

/** Convierte los esquemas que usamos a la forma que espera llama.cpp. */
function cuerpoPeticion({ modelo, mensajes, temperatura, maxTokens, esquema }) {
  const cuerpo = {
    model: modelo,
    messages: mensajes,
    temperature: typeof temperatura === 'number' ? temperatura : 0.7,
    max_tokens: maxTokens || 400,
    stream: false
  };
  if (esquema) {
    cuerpo.response_format = {
      type: 'json_schema',
      json_schema: { name: 'respuesta', strict: true, schema: esquema }
    };
  }
  return cuerpo;
}

class ClienteLLM {
  constructor(opciones = {}) {
    this.baseUrl = opciones.baseUrl || 'http://127.0.0.1:8080';
    this.apiKey = opciones.apiKey || '';
    this.timeoutMs = opciones.timeoutMs || 240000;
    this.autoDescubrirClave = opciones.autoDescubrirClave !== false;

    /** Modelo que el servidor tiene cargado ahora mismo (segun nosotros). */
    this.modeloEnMemoria = null;

    /** Cola: garantiza una peticion simultanea. */
    this._cola = Promise.resolve();

    /** Registro circular de todas las llamadas (para el laboratorio de IA). */
    this.registro = [];
    this.maxRegistro = 200;

    this.estadisticas = {
      llamadas: 0,
      fallos: 0,
      tokensPrompt: 0,
      tokensRespuesta: 0,
      msTotales: 0,
      cambiosDeModelo: 0,
      enCola: 0
    };

    this.oyentes = new Set();
    this._escuchando = false;
  }

  /** Suscribirse a los cambios de estado del cliente (para SSE). */
  alCambiar(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  _emitir(tipo, datos) {
    for (const fn of this.oyentes) {
      try { fn(tipo, datos); } catch (_) { /* un oyente roto no rompe el juego */ }
    }
  }

  get enCola() {
    return this.estadisticas.enCola;
  }

  /**
   * Serializa el trabajo. `--parallel 1` significa que dos peticiones a la vez
   * solo consiguen que una espere; mejor controlarlo nosotros y poder informar
   * al jugador de cuantas quedan pendientes.
   */
  _encolar(tarea) {
    this.estadisticas.enCola++;
    this._emitir('cola', { enCola: this.estadisticas.enCola });
    const resultado = this._cola.then(() => tarea());
    this._cola = resultado.then(
      () => { this.estadisticas.enCola--; this._emitir('cola', { enCola: this.estadisticas.enCola }); },
      () => { this.estadisticas.enCola--; this._emitir('cola', { enCola: this.estadisticas.enCola }); }
    );
    return resultado;
  }

  /** Peticion HTTP cruda con timeout propio. */
  _peticion(metodo, ruta, cuerpo) {
    return new Promise((resolve, reject) => {
      let url;
      try {
        url = new URL(ruta, this.baseUrl);
      } catch (e) {
        reject(new Error('URL del servidor de modelos invalida: ' + this.baseUrl));
        return;
      }

      const datos = cuerpo ? Buffer.from(JSON.stringify(cuerpo), 'utf8') : null;
      const cabeceras = { Accept: 'application/json' };
      if (this.apiKey) cabeceras.Authorization = 'Bearer ' + this.apiKey;
      if (datos) {
        cabeceras['Content-Type'] = 'application/json';
        cabeceras['Content-Length'] = datos.length;
      }

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: metodo,
          headers: cabeceras
        },
        (res) => {
          const trozos = [];
          res.on('data', (c) => trozos.push(c));
          res.on('end', () => {
            const texto = Buffer.concat(trozos).toString('utf8');
            let json = null;
            try { json = JSON.parse(texto); } catch (_) { /* puede ser texto plano */ }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json !== null ? json : texto);
            } else {
              const detalle = json && json.error ? (json.error.message || JSON.stringify(json.error)) : texto.slice(0, 300);
              const err = new Error(`HTTP ${res.statusCode} en ${ruta}: ${detalle}`);
              err.status = res.statusCode;
              err.cuerpo = json;
              reject(err);
            }
          });
        }
      );

      req.setTimeout(this.timeoutMs, () => {
        req.destroy(new Error(`El modelo tardo mas de ${Math.round(this.timeoutMs / 1000)}s en responder`));
      });
      req.on('error', reject);
      if (datos) req.write(datos);
      req.end();
    });
  }

  /** Lista los modelos que ofrece el servidor. */
  async listarModelos() {
    const r = await this._peticion('GET', '/v1/models');
    const lista = (r && r.data) || [];
    return lista.map((m) => ({
      id: m.id,
      estado: m.status ? m.status.value : 'desconocido',
      arquitectura: m.architecture || null
    }));
  }

  /** Comprueba que el servidor responde. */
  async ping() {
    try {
      const modelos = await this.listarModelos();
      return { ok: true, modelos: modelos.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Intenta averiguar la clave API leyendo la linea de comandos del
   * llama-server. Es comodo: el usuario no tiene que copiarla a mano.
   */
  static descubrirClave() {
    try {
      const ps = 'Get-CimInstance Win32_Process -Filter "Name=\'llama-server.exe\'" | Select-Object -Expand CommandLine';
      const salida = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true
      });
      const m = salida.match(/--api-key\s+("([^"]+)"|(\S+))/);
      if (m) return m[2] || m[3];
    } catch (_) {
      /* no pasa nada, seguimos sin clave */
    }
    return null;
  }

  /** Comprueba la conexion y, si falla por clave, intenta descubrirla. */
  async conectar() {
    let ping = await this.ping();
    if (ping.ok) return ping;

    if (this.autoDescubrirClave) {
      const clave = ClienteLLM.descubrirClave();
      if (clave && clave !== this.apiKey) {
        this.apiKey = clave;
        ping = await this.ping();
        if (ping.ok) {
          ping.claveDescubierta = clave;
          return ping;
        }
      }
    }
    return ping;
  }

  /**
   * Una llamada de chat. Se encola automaticamente.
   *
   * Devuelve un objeto con la respuesta ya normalizada mas todas las metricas,
   * porque el juego necesita mostrarselas al jugador.
   */
  async chat(opciones) {
    const {
      modelo,
      mensajes,
      temperatura = 0.7,
      maxTokens = 400,
      esquema = null,
      etiqueta = 'llamada',
      agenteId = null
    } = opciones;

    return this._encolar(async () => {
      const cambioDeModelo = this.modeloEnMemoria !== modelo;
      const entrada = {
        id: this.registro.length ? this.registro[this.registro.length - 1].id + 1 : 1,
        t: Date.now(),
        etiqueta,
        agenteId,
        modelo,
        temperatura,
        maxTokens,
        esquema: esquema ? esquema.properties && Object.keys(esquema.properties) : null,
        mensajes: JSON.parse(JSON.stringify(mensajes)),
        cambioDeModelo,
        ok: false,
        error: null,
        respuesta: null,
        pensamiento: null,
        ms: 0,
        msHastaPrimerToken: null,
        tokensPrompt: 0,
        tokensRespuesta: 0,
        tokPorSegundo: 0
      };

      const inicio = Date.now();
      this._emitir('llamadaInicio', entrada);

      try {
        const bruto = await this._peticion(
          'POST',
          '/v1/chat/completions',
          cuerpoPeticion({ modelo, mensajes, temperatura, maxTokens, esquema })
        );

        entrada.ms = Date.now() - inicio;
        const eleccion = bruto && bruto.choices && bruto.choices[0];
        const msg = eleccion ? eleccion.message || {} : {};

        // Algunos modelos (sobre todo los que "razonan") mandan el texto en
        // reasoning_content y dejan content vacio. Hay que mirar los dos.
        let contenido = msg.content;
        if ((contenido === null || contenido === undefined || String(contenido).trim() === '') && msg.reasoning_content) {
          contenido = msg.reasoning_content;
          entrada.vinoDeRazonamiento = true;
        }
        contenido = contenido === null || contenido === undefined ? '' : String(contenido);

        entrada.respuesta = contenido;
        entrada.pensamiento = msg.reasoning_content ? String(msg.reasoning_content) : null;
        entrada.finishReason = eleccion ? eleccion.finish_reason : null;

        const uso = bruto && bruto.usage ? bruto.usage : {};
        entrada.tokensPrompt = uso.prompt_tokens || 0;
        entrada.tokensRespuesta = uso.completion_tokens || 0;
        entrada.tokPorSegundo = entrada.ms > 0
          ? Number((entrada.tokensRespuesta / (entrada.ms / 1000)).toFixed(1))
          : 0;

        // El modelo queda cargado si la peticion ha ido bien.
        if (cambioDeModelo) {
          this.estadisticas.cambiosDeModelo++;
          this.modeloEnMemoria = modelo;
        }

        entrada.json = esquema ? extraerJson(contenido) : null;
        if (esquema && !entrada.json) {
          entrada.aviso = 'La respuesta no era JSON valido; se usara el texto tal cual.';
        }
        entrada.ok = true;

        this.estadisticas.llamadas++;
        this.estadisticas.tokensPrompt += entrada.tokensPrompt;
        this.estadisticas.tokensRespuesta += entrada.tokensRespuesta;
        this.estadisticas.msTotales += entrada.ms;

        this._registrar(entrada);
        this._emitir('llamadaFin', entrada);
        return entrada;
      } catch (e) {
        entrada.ms = Date.now() - inicio;
        entrada.error = e.message;
        entrada.ok = false;
        this.estadisticas.llamadas++;
        this.estadisticas.fallos++;
        this.estadisticas.msTotales += entrada.ms;

        // Si el fallo puede ser de modelo, olvidamos cual esta cargado para
        // forzar una recarga en el siguiente intento.
        if (e.status === 404 || /model/i.test(e.message)) this.modeloEnMemoria = null;

        this._registrar(entrada);
        this._emitir('llamadaFin', entrada);
        throw e;
      }
    });
  }

  _registrar(entrada) {
    this.registro.push(entrada);
    if (this.registro.length > this.maxRegistro) this.registro.shift();
  }

  /** Version resumida para enviar al navegador en cada actualizacion. */
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
      enCola: e.enCola,
      modeloEnMemoria: this.modeloEnMemoria
    };
  }

  /**
   * Promedio de tokens de prompt: sirve para que el jugador VEA como la memoria
   * hace crecer el contexto y con ella el coste.
   */
  mediaTokensPrompt() {
    const conDatos = this.registro.filter((r) => r.ok && r.tokensPrompt > 0);
    if (!conDatos.length) return 0;
    return Math.round(conDatos.reduce((a, r) => a + r.tokensPrompt, 0) / conDatos.length);
  }
}

export { ClienteLLM, extraerJson };
