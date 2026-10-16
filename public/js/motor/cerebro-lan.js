/**
 * CEREBRO LAN · El movil usa LM Studio del PC por la red de casa.
 *
 * En LM Studio: Developer -> Server -> "Serve on Local Network" y "Enable CORS".
 * Si el PC no responde, el mundo vuelve al cerebro simulado (modo demo).
 */
import { ESQUEMA_DECISION, ESQUEMA_CHARLA, systemPrompt, promptReaccion, promptCharla, extraerJson } from './reglas.js';

export function normalizarUrl(u) {
  u = String(u || '').trim().replace(/\/+$/, '').replace(/\/v1$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
  if (/^http:\/\/[^/:]+$/i.test(u)) u += ':1234';
  return u;
}

async function pedirJson(url, opciones = {}, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opciones, signal: ctl.signal });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch (_) {}
    if (!r.ok) {
      const e = new Error(`HTTP ${r.status}: ${(json && json.error && (json.error.message || json.error)) || texto.slice(0, 200)}`);
      e.status = r.status; throw e;
    }
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`El PC tardó más de ${Math.round(ms / 1000)} s en responder`);
    if (e instanceof TypeError) throw new Error('No llego al PC. Revisa la IP, que estéis en la misma wifi y que LM Studio tenga activados "Serve on Local Network" y "Enable CORS".');
    throw e;
  } finally { clearTimeout(t); }
}

export async function probarServidor(base) {
  const j = await pedirJson(normalizarUrl(base) + '/v1/models', {}, 6000);
  return ((j && j.data) || []).map((m) => m.id).filter((id) => id && !/embed/i.test(id));
}

export class CerebroLAN {
  constructor(base, modelo) {
    this.base = normalizarUrl(base);
    this.modelo = modelo;
    this.ilimitado = false;
    this.simulado = false;
    this.enCola = 0;
    this.registro = [];
    this.est = { llamadas: 0, fallos: 0, tokensPrompt: 0, tokensRespuesta: 0, ms: 0 };
    this._cola = Promise.resolve();
  }
  alCambiar() { return () => {}; }
  mediaTokensPrompt() { return this.est.llamadas ? Math.round(this.est.tokensPrompt / this.est.llamadas) : 0; }
  resumenEstadisticas() {
    const e = this.est;
    return { llamadas: e.llamadas, fallos: e.fallos, tokensPrompt: e.tokensPrompt, tokensRespuesta: e.tokensRespuesta,
      tokensTotales: e.tokensPrompt + e.tokensRespuesta, msMedios: e.llamadas ? Math.round(e.ms / e.llamadas) : 0,
      cambiosDeModelo: 0, enCola: this.enCola, modeloEnMemoria: this.modelo };
  }

  _chat(agente, prompt, esquema, etiqueta, maxTokens) {
    this.enCola++;
    const tarea = this._cola.then(async () => {
      const inicio = Date.now();
      const entrada = { t: inicio, etiqueta, agenteId: agente.id, modelo: this.modelo, prompt, ok: false };
      const cuerpo = {
        model: this.modelo,
        messages: [{ role: 'system', content: systemPrompt(agente) }, { role: 'user', content: prompt }],
        temperature: typeof agente.temperatura === 'number' ? agente.temperatura : 0.7,
        max_tokens: maxTokens || 400,
        response_format: { type: 'json_schema', json_schema: { name: 'respuesta', strict: true, schema: esquema } }
      };
      try {
        let j;
        try {
          j = await pedirJson(this.base + '/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }, 120000);
        } catch (e) {
          if (e.status !== 400) throw e;
          delete cuerpo.response_format;
          j = await pedirJson(this.base + '/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }, 120000);
        }
        const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
        const texto = String(msg.content || msg.reasoning_content || '');
        Object.assign(entrada, { ok: true, respuesta: texto, json: extraerJson(texto), ms: Date.now() - inicio,
          tokensPrompt: (j.usage && j.usage.prompt_tokens) || 0, tokensRespuesta: (j.usage && j.usage.completion_tokens) || 0 });
        this.est.tokensPrompt += entrada.tokensPrompt; this.est.tokensRespuesta += entrada.tokensRespuesta;
        return entrada;
      } catch (e) {
        this.est.fallos++; entrada.error = e.message; throw e;
      } finally {
        this.est.llamadas++; this.est.ms += Date.now() - inicio;
        this.registro.push(entrada); if (this.registro.length > 100) this.registro.shift();
      }
    });
    this._cola = tarea.catch(() => {}).finally(() => { this.enCola--; });
    return tarea;
  }

  decidir({ agente, sucesos, mundo, etiqueta, maxTokens }) {
    return this._chat(agente, promptReaccion(mundo, agente, sucesos.join(' · ')), ESQUEMA_DECISION, etiqueta, maxTokens);
  }
  charlar({ agente, mensaje, mundo, maxTokens }) {
    return this._chat(agente, promptCharla(mundo, agente, mensaje), ESQUEMA_CHARLA, `Hablar con ${agente.nombre}`, maxTokens);
  }
}
