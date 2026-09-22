/**
 * SERVIDOR DEL JUEGO  ·  la logica, sin ataduras de donde se ejecute.
 *
 * Este modulo NO arranca solo: exporta `iniciarServidor()` y quien lo llama
 * decide de donde salen los ficheros. Asi el mismo codigo sirve para:
 *
 *   - `node server.js`         -> los ficheros se leen del disco
 *   - PixelSoft.exe            -> los ficheros vienen incrustados en el .exe
 *
 * Eso es lo que permite empaquetar el juego en un unico ejecutable: dentro de
 * un .exe de Node no se pueden cargar ficheros sueltos, asi que todo tiene que
 * estar ya dentro y leerse desde memoria.
 *
 * Hace tres cosas:
 *   1. Sirve el juego (HTML, CSS, JS).
 *   2. Da una API JSON para los poderes de dios, hablar y el laboratorio.
 *   3. Mantiene un canal SSE (/api/stream) para mandar el estado en vivo.
 *
 * Y por debajo habla con TU servidor local de modelos (LM Studio / llama.cpp).
 * El navegador NUNCA llama al modelo directamente; lo hace este servidor.
 * Motivo: el modelo pide cabecera Authorization y ademas hay que serializar
 * las peticiones (tu llama-server corre con --parallel 1).
 */

import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

import { CerebroReal } from './cerebro-real.js';
import { Mundo } from '../public/js/motor/mundo.js';
import { systemPrompt } from '../public/js/motor/reglas.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};

function responderJson(res, codigo, objeto) {
  const cuerpo = JSON.stringify(objeto);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo),
    'Cache-Control': 'no-store'
  });
  res.end(cuerpo);
}

function leerCuerpo(req, limite = 1_000_000) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const trozos = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > limite) {
        reject(new Error('Cuerpo de la peticion demasiado grande'));
        req.destroy();
        return;
      }
      trozos.push(c);
    });
    req.on('end', () => {
      const texto = Buffer.concat(trozos).toString('utf8');
      if (!texto) return resolve({});
      try { resolve(JSON.parse(texto)); } catch (e) { reject(new Error('JSON invalido en la peticion')); }
    });
    req.on('error', reject);
  });
}

/** IP de la red local, para decirte donde tiene que apuntar el movil. */
function ipLocal() {
  try {
    const redes = os.networkInterfaces();
    for (const nombre of Object.keys(redes)) {
      for (const iface of redes[nombre] || []) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
  } catch (_) { /* da igual */ }
  return null;
}

function abrirNavegador(direccion) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', direccion], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [direccion], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [direccion], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (_) { /* si no se puede, no pasa nada */ }
}

/**
 * Arranca el juego.
 *
 * @param {object}   opciones.config         El config.json ya leido
 * @param {function} opciones.leerEstatico   (rutaRelativa) -> Promise<Buffer>
 * @param {string[]} opciones.args           Argumentos de linea de comandos
 * @param {boolean}  opciones.simulado       true = cerebro simulado (sin modelos)
 */
export function iniciarServidor({ config, leerEstatico, args = [], simulado = false }) {
  const A_LA_RED = args.includes('--red');
  const ABRIR = args.includes('--abrir');

  const argPuerto = args.find((a) => /^\d+$/.test(a));
  const PUERTO = argPuerto ? Number(argPuerto) : (config.servidor.puerto || 3777);

  // Por defecto SOLO localhost. Con --red se abre a la red de casa para poder
  // jugar desde el movil. Es una decision explicita del usuario.
  const HOST = A_LA_RED ? '0.0.0.0' : (config.servidor.host || '127.0.0.1');

  const cerebro = new CerebroReal({
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    timeoutMs: config.llm.timeoutMs,
    autoDescubrirClave: config.llm.autoDescubrirClave
  });

  const mundo = new Mundo(config, cerebro);

  // ------------------------------------------------------------- SSE (vivo)
  const suscriptores = new Set();

  const enviarATodos = (evento, datos) => {
    const carga = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
    for (const res of suscriptores) {
      try { res.write(carga); } catch (_) { suscriptores.delete(res); }
    }
  };

  mundo.alCambiar((estado) => enviarATodos('estado', estado));

  cerebro.alCambiar((tipo, datos) => {
    if (tipo === 'llamadaFin') {
      enviarATodos('ia', {
        etiqueta: datos.etiqueta,
        agenteId: datos.agenteId,
        modelo: datos.modelo,
        ok: datos.ok,
        error: datos.error,
        ms: datos.ms,
        tokensPrompt: datos.tokensPrompt,
        tokensRespuesta: datos.tokensRespuesta,
        tokPorSegundo: datos.tokPorSegundo,
        cambioDeModelo: datos.cambioDeModelo,
        respuestaCorta: datos.respuesta ? String(datos.respuesta).slice(0, 220) : null
      });
    }
    if (tipo === 'cola') enviarATodos('cola', datos);
  });

  // --------------------------------------------------------- ficheros
  async function servirEstatico(req, res, rutaUrl) {
    let relativo = decodeURIComponent(rutaUrl.split('?')[0]);
    if (relativo === '/' || relativo === '') relativo = '/index.html';

    // Normalizamos y quitamos cualquier intento de salirse de la carpeta.
    const limpio = path.posix.normalize(relativo.replace(/\\/g, '/')).replace(/^\/+/, '');
    if (limpio.startsWith('..') || limpio.includes('../')) {
      res.writeHead(403).end('Prohibido');
      return;
    }

    try {
      const datos = await leerEstatico(limpio);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(limpio).toLowerCase()] || 'application/octet-stream',
        'Content-Length': datos.length,
        'Cache-Control': 'no-store'
      });
      res.end(datos);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado: ' + limpio);
    }
  }

  // ------------------------------------------------------------- rutas
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const ruta = url.pathname;

    try {
      if (ruta === '/api/state' && req.method === 'GET') {
        return responderJson(res, 200, mundo.snapshot());
      }

      if (ruta === '/api/stream' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no'
        });
        res.write(`event: estado\ndata: ${JSON.stringify(mundo.snapshot())}\n\n`);
        suscriptores.add(res);
        const latido = setInterval(() => {
          try { res.write(': latido\n\n'); } catch (_) { /* se limpiara solo */ }
        }, 25000);
        req.on('close', () => {
          clearInterval(latido);
          suscriptores.delete(res);
        });
        return;
      }

      if (ruta === '/api/dios' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        const resultado = mundo.dios(cuerpo.accion, cuerpo.carga || {});
        mundo._emitir();
        return responderJson(res, resultado.ok ? 200 : 400, resultado);
      }

      if (ruta === '/api/hablar' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        if (!cuerpo.agenteId || !cuerpo.mensaje) {
          return responderJson(res, 400, { ok: false, mensaje: 'Falta el empleado o el mensaje.' });
        }
        try {
          const r = await mundo.hablar(cuerpo.agenteId, String(cuerpo.mensaje).slice(0, 600));
          return responderJson(res, 200, { ok: true, ...r });
        } catch (e) {
          return responderJson(res, 500, { ok: false, mensaje: e.message });
        }
      }

      if (ruta === '/api/laboratorio' && req.method === 'GET') {
        const limite = Math.min(60, Number(url.searchParams.get('limite')) || 25);
        const registro = cerebro.registro.slice(-limite).reverse();
        return responderJson(res, 200, {
          estadisticas: cerebro.resumenEstadisticas(),
          mediaTokensPrompt: cerebro.mediaTokensPrompt(),
          consumo: config.consumo,
          llamadas: registro
        });
      }

      if (ruta === '/api/cerebro' && req.method === 'GET') {
        const id = url.searchParams.get('agenteId');
        const agente = mundo.agentes.find((a) => a.id === id);
        if (!agente) return responderJson(res, 404, { ok: false, mensaje: 'Ese empleado no existe.' });
        return responderJson(res, 200, {
          ok: true,
          id: agente.id,
          nombre: agente.nombre,
          modelo: agente.modelo,
          temperatura: agente.temperatura,
          personalidad: agente.personalidad,
          systemPrompt: systemPrompt(agente),
          recuerdos: agente.recuerdos,
          conversacion: agente.conversacion,
          ultimaDecision: agente.ultimaDecision,
          ultimaCharla: agente.ultimaCharla
        });
      }

      if (ruta === '/api/cerebro' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        const agente = mundo.agentes.find((a) => a.id === cuerpo.agenteId);
        if (!agente) return responderJson(res, 404, { ok: false, mensaje: 'Ese empleado no existe.' });

        if (typeof cuerpo.personalidad === 'string' && cuerpo.personalidad.trim()) {
          agente.personalidad = cuerpo.personalidad.trim().slice(0, 2000);
        }
        if (typeof cuerpo.temperatura === 'number') {
          agente.temperatura = Math.max(0, Math.min(1.5, cuerpo.temperatura));
        }
        if (typeof cuerpo.modelo === 'string' && cuerpo.modelo.trim()) {
          agente.modelo = cuerpo.modelo.trim();
        }
        if (Array.isArray(cuerpo.recuerdos)) {
          agente.recuerdos = cuerpo.recuerdos.slice(-20).map((r) => String(r).slice(0, 200));
        }
        mundo.registrar('sistema', `Has ajustado el cerebro de ${agente.nombre} (modelo ${agente.modelo}, temperatura ${agente.temperatura}).`);
        mundo._emitir();
        return responderJson(res, 200, { ok: true, mensaje: 'Cerebro actualizado. Se aplicara en su proxima llamada.' });
      }

      if (ruta === '/api/modelos' && req.method === 'GET') {
        try {
          const modelos = await cerebro.listarModelos();
          const conocidos = config.modelosConocidos || {};
          return responderJson(res, 200, {
            ok: true,
            baseUrl: config.llm.baseUrl,
            modeloEnMemoria: cerebro.modeloEnMemoria,
            modeloPorDefecto: config.modeloPorDefecto,
            modelos: modelos.map((m) => ({ ...m, conocido: conocidos[m.id] || null }))
          });
        } catch (e) {
          return responderJson(res, 502, { ok: false, mensaje: 'No puedo hablar con el servidor de modelos: ' + e.message });
        }
      }

      if (ruta === '/api/reiniciar' && req.method === 'POST') {
        mundo.reiniciar();
        return responderJson(res, 200, { ok: true, mensaje: 'Partida reiniciada.' });
      }

      if (req.method === 'GET') return servirEstatico(req, res, ruta);

      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Metodo no permitido');
    } catch (e) {
      console.error('Error atendiendo', ruta, '-', e.message);
      if (!res.headersSent) responderJson(res, 500, { ok: false, mensaje: e.message });
      else res.end();
    }
  });

  // ---------------------------------------------------------- arranque
  (async () => {
    console.log('');
    console.log('  PIXELSOFT  -  tus IAs locales jugando a ser una empresa');
    console.log('  ' + '-'.repeat(58));
    console.log(`  Servidor de modelos : ${config.llm.baseUrl}`);
    console.log(`  Modelo por defecto  : ${config.modeloPorDefecto}`);

    if (simulado) {
      console.log('  Modo                : SIMULADO (sin modelos)');
    } else {
      const ping = await cerebro.conectar();
      if (ping.ok) {
        console.log(`  Conexion con la IA  : OK (${ping.modelos} modelos disponibles)`);
        if (ping.claveDescubierta) console.log(`  Clave API           : descubierta automaticamente (${ping.claveDescubierta})`);
      } else {
        console.log(`  Conexion con la IA  : FALLO -> ${ping.error}`);
        console.log('  El juego arrancara igual, pero los empleados no podran pensar.');
        console.log('  Arranca LM Studio con el servidor local activado en el puerto 8080.');
      }
    }

    mundo.iniciar();

    servidor.listen(PUERTO, HOST, () => {
      const local = `http://127.0.0.1:${PUERTO}`;
      console.log('  ' + '-'.repeat(58));
      console.log(`  Juega en este PC    : ${local}`);

      if (A_LA_RED) {
        const ip = ipLocal();
        console.log(`  ABIERTO A LA RED    : ${ip ? `http://${ip}:${PUERTO}` : '(no he encontrado tu IP local)'}`);
        console.log('  Desde el movil, abre esa direccion en el navegador.');
        console.log('  Cualquiera en tu WiFi puede entrar: usalo en redes de confianza.');
      } else {
        console.log('  Para jugar desde el movil: arranca con --red');
      }

      console.log('  ' + '-'.repeat(58));
      console.log('  Ctrl+C para parar.');
      console.log('');

      if (ABRIR) abrirNavegador(local);
    });
  })();

  servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\n  El puerto ${PUERTO} esta ocupado. Prueba: PixelSoft.exe 4000\n`);
    } else {
      console.error('\n  Error del servidor:', e.message, '\n');
    }
    process.exit(1);
  });

  const cerrar = () => {
    console.log('\n  Cerrando PixelSoft...');
    mundo.detener();
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);

  return { servidor, mundo, cerebro };
}
