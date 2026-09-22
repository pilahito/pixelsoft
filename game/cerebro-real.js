/**
 * CEREBRO REAL  ·  Solo existe en el PC.
 *
 * Envuelve el cliente del servidor de modelos (LM Studio / llama-server) y le
 * da al mundo la misma interfaz que el cerebro simulado. Asi el motor del
 * juego no sabe si detras hay una IA de verdad o reglas escritas a mano.
 *
 * Aqui es donde de verdad se construye el prompt y se pide la decision.
 */

import { ClienteLLM } from './llm.js';
import {
  ESQUEMA_DECISION,
  ESQUEMA_CHARLA,
  systemPrompt,
  promptReaccion,
  promptCharla
} from '../public/js/motor/reglas.js';

export class CerebroReal {
  constructor(opciones = {}) {
    this.cliente = new ClienteLLM(opciones);
    /** El mundo no limita las llamadas: ya lo hace el propio cliente. */
    this.ilimitado = false;
    this.simulado = false;
  }

  get enCola() { return this.cliente.enCola; }
  get modeloEnMemoria() { return this.cliente.modeloEnMemoria; }
  get registro() { return this.cliente.registro; }

  alCambiar(fn) { return this.cliente.alCambiar(fn); }
  listarModelos() { return this.cliente.listarModelos(); }
  conectar() { return this.cliente.conectar(); }
  resumenEstadisticas() { return this.cliente.resumenEstadisticas(); }
  mediaTokensPrompt() { return this.cliente.mediaTokensPrompt(); }

  /** El empleado reacciona a uno o varios sucesos. */
  async decidir({ agente, sucesos, mundo, etiqueta, maxTokens }) {
    const prompt = promptReaccion(mundo, agente, sucesos.join(' · '));

    const entrada = await this.cliente.chat({
      modelo: agente.modelo,
      mensajes: [
        { role: 'system', content: systemPrompt(agente) },
        { role: 'user', content: prompt }
      ],
      temperatura: agente.temperatura,
      maxTokens,
      esquema: ESQUEMA_DECISION,
      etiqueta,
      agenteId: agente.id
    });

    entrada.prompt = prompt;
    return entrada;
  }

  /** El jefe le habla directamente. */
  async charlar({ agente, mensaje, mundo, maxTokens }) {
    const prompt = promptCharla(mundo, agente, mensaje);

    const entrada = await this.cliente.chat({
      modelo: agente.modelo,
      mensajes: [
        { role: 'system', content: systemPrompt(agente) },
        { role: 'user', content: prompt }
      ],
      temperatura: agente.temperatura,
      maxTokens,
      esquema: ESQUEMA_CHARLA,
      etiqueta: `Hablar con ${agente.nombre}`,
      agenteId: agente.id
    });

    entrada.prompt = prompt;
    return entrada;
  }
}
