'use strict';

/**
 * MUNDO: el motor del juego.
 *
 * Bucle principal (tick cada ~1,2 s y cada tick es 1 hora de juego):
 *   1. Avanza el reloj.
 *   2. Simula el trabajo de cada empleado (esto NO gasta IA).
 *   3. Calcula la economia (calidad, clientes, ingresos, reputacion).
 *   4. Al acabar el dia, paga nominas y alquiler.
 *
 * La IA solo se usa cuando pasa algo INTERESANTE: el jugador interviene o le
 * habla a alguien. Eso es lo que mantiene el consumo bajo.
 */

const {
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
} = require('./agents');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (v) => Math.round(v * 10) / 10;

class Mundo {
  constructor(config, cliente) {
    this.cfg = config;
    this.cliente = cliente;
    this.consumo = config.consumo || {};
    this.niveles = config.niveles || [{ id: 'garaje', nombre: 'Garaje', coste: 0, maxEmpleados: 3, multiplicadorClientes: 1 }];

    this.oyentes = new Set();
    this.temporizador = null;
    this.generacion = 0;

    this.pendientes = [];
    this._bombeando = false;
    this.marcasLlamadas = [];
    this.modoAhorro = false;

    this.reiniciar();
  }

  // ---------------------------------------------------------------- estado

  reiniciar() {
    const j = this.cfg.juego;
    this.generacion++;

    this.dia = 1;
    this.hora = j.horaInicio;
    this.tick = 0;

    this.empresa = {
      nombre: 'PixelSoft',
      dinero: j.dineroInicial,
      precio: j.precioInicial,
      clientes: j.clientesIniciales,
      reputacion: j.reputacionInicial,
      calidad: j.calidadInicial,
      indiceNivel: 0,
      alquilerPorDia: j.alquilerPorDia,
      salarioPorDia: j.salarioPorDia,
      ingresoUltimaHora: 0,
      ingresoHoraMedio: null,
      costeUltimoDia: 0,
      tieneCafetera: false,
      apagon: false,
      historial: []
    };

    const modelo = this.cfg.modeloPorDefecto;
    this.agentes = (this.cfg.empleados || []).map((d, i) => crearEmpleado(d, i, modelo));

    this.sucesos = [];
    this.pendientes = [];
    this.marcasLlamadas = [];
    this.registrar('sistema', `${this.empresa.nombre} abre sus puertas en un garaje. ${this.agentes.length} empleados, ${j.dineroInicial} EUR en caja.`);
    this._emitir();
  }

  alCambiar(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  _emitir() {
    for (const fn of this.oyentes) {
      try { fn(this.snapshot()); } catch (_) { /* un oyente roto no rompe el juego */ }
    }
  }

  registrar(tipo, texto) {
    const entrada = { t: Date.now(), dia: this.dia, hora: this.hora, tipo, texto };
    this.sucesos.push(entrada);
    if (this.sucesos.length > 300) this.sucesos.shift();
    return entrada;
  }

  // ------------------------------------------------------------- bucle

  iniciar() {
    if (this.temporizador) return;
    this.temporizador = setInterval(() => this.tickJuego(), this.cfg.juego.tickMs);
    if (this.temporizador.unref) this.temporizador.unref();
  }

  detener() {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  tickJuego() {
    this.tick++;
    this.hora++;
    if (this.hora >= 24) {
      this.hora = 0;
      this.dia++;
      this._cerrarDia();
    }

    this._avanzarAgentes();
    this._economia();
    this._bombear();
    this._emitir();
  }

  get laboral() {
    return this.hora >= 9 && this.hora < this.cfg.juego.horaFinTrabajo;
  }

  /**
   * Simulacion del trabajo diario. Aqui NO hay IA: son reglas.
   * Este es el contraste que hay que entender: la IA decide lo raro,
   * las reglas gobiernan lo de cada dia.
   */
  _avanzarAgentes() {
    const e = this.empresa;

    for (const a of this.agentes) {
      a._diaActual = this.dia;
      if (a.dimitido) continue;

      // La moral alta recupera energia; la baja la desgasta.
      const impulsoMoral = (a.moral - 50) / 100;

      if (a.ordenador.roto) {
        // Un ordenador roto bloquea el trabajo. El empleado lo repara solo.
        a.estado = a.reparando ? 'reparando' : 'bloqueado';

        // Red de seguridad: si el modelo no eligio "reparar", el empleado se
        // pone a ello de todos modos al cabo de unos turnos. Nadie se queda
        // mirando un monitor humeante para siempre.
        if (!a.reparando) {
          a.bloqueadoTicks = (a.bloqueadoTicks || 0) + 1;
          if (a.bloqueadoTicks > 3) {
            a.reparando = true;
            a.bloqueadoTicks = 0;
            this.registrar('reparacion', `${a.nombre} se cansa de esperar y empieza a arreglar el ordenador por su cuenta.`);
          }
        }

        if (a.reparando) {
          a.ordenador.salud = limitar(a.ordenador.salud + 7, 0, 100);
          a.energia = limitar(a.energia - 2.5, 0, 100);
          if (a.ordenador.salud >= 100) {
            a.ordenador.roto = false;
            a.reparando = false;
            a.bloqueadoTicks = 0;
            a.estado = 'trabajando';
            a.moral = limitar(a.moral + 4, 0, 100);
            this.registrar('reparacion', `${a.nombre} ha terminado de arreglar su ordenador. Vuelve al trabajo.`);
            recordar(a, 'Arregle mi ordenador yo mismo tras una averia.', this.consumo.maxRecuerdos);
          }
        }
        continue;
      }

      if (e.apagon) {
        a.estado = 'sin_luz';
        a.energia = limitar(a.energia - 1.5, 0, 100);
        a.moral = limitar(a.moral - 0.15, 0, 100);
        continue;
      }

      if (!this.laboral) {
        // Fuera de horario: descansan.
        a.estado = 'descansando';
        a.energia = limitar(a.energia + 3 + impulsoMoral, 0, 100);
        a.moral = limitar(a.moral + 0.15 * impulsoMoral, 0, 100);
        continue;
      }

      // Horario laboral normal.
      //
      // Las reacciones que eligio la IA son momentaneas: cuando caducan, el
      // empleado vuelve a su mesa. Y si venia de descansar fuera de horario,
      // al empezar el dia tambien vuelve al trabajo.
      if (a.estadoHasta && this.tick >= a.estadoHasta) {
        a.estadoHasta = null;
        a.estado = 'trabajando';
        a.sitio = 'escritorio';
      } else if (!a.estadoHasta && a.estado === 'descansando') {
        a.estado = 'trabajando';
        a.sitio = 'escritorio';
      }

      const rinde = (a.habilidad / 50) * (a.energia / 100) * (a.ordenador.salud / 100);
      a.energia = limitar(a.energia - 1.4 + impulsoMoral * 0.5, 0, 100);
      a.habilidad = limitar(a.habilidad + 0.03 * (a.energia / 100), 0, 100);
      a.moral = limitar(a.moral - 0.05 - Math.max(0, 30 - a.energia) * 0.01, 0, 100);

      // Agotado o desmotivado: se pone a holgazanear en vez de trabajar.
      if (a.energia < 12 || a.moral < 18) {
        a.estado = 'holgazaneando';
        a.energia = limitar(a.energia + 1.5, 0, 100);
        a.moral = limitar(a.moral + 0.1, 0, 100);
      } else if (a.estado === 'holgazaneando' || a.estado === 'bloqueado') {
        a.estado = 'trabajando';
      }

      if (a.estado === 'trabajando') {
        e.calidad = limitar(e.calidad + 0.045 * rinde, 0, 100);
      }

      a._rinde = rinde;
    }
  }

  /** Economia: la parte que el jugador manipula con los precios. */
  _economia() {
    const e = this.empresa;
    if (!this.laboral || e.apagon) {
      e.ingresoUltimaHora = 0;
      return;
    }

    // El "precio justo" sube con la calidad: mejor producto aguanta mejor precio.
    const precioBase = 18 + e.calidad * 0.35;

    // Elasticidad: si cobras mas de lo justo pierdes clientes... pero ganas mas
    // por cada uno. Hay un punto dulce, y pasarse sale caro en reputacion.
    const ratio = e.precio / Math.max(1, precioBase);
    const factorPrecio = limitar(1 - (ratio - 1) * 0.6, 0.15, 1.35);

    const nivel = this.niveles[e.indiceNivel];
    const objetivo = (6 + e.reputacion * 0.25) * factorPrecio * (0.5 + e.calidad / 100) * nivel.multiplicadorClientes;
    e.clientes += (objetivo - e.clientes) * 0.05;
    e.clientes = Math.max(0, e.clientes);

    const ingreso = e.clientes * e.precio * 0.11 * (e.calidad / 70);
    e.dinero += ingreso;
    e.ingresoUltimaHora = ingreso;

    // Media suavizada: sirve para que el panel de cuentas enseñe un ingreso
    // realista tambien de noche, cuando no entra nada.
    e.ingresoHoraMedio = e.ingresoHoraMedio == null
      ? ingreso
      : e.ingresoHoraMedio * 0.92 + ingreso * 0.08;

    // Reputacion: sube si el producto es bueno, baja si cobras de mas.
    const sobreprecio = Math.max(0, ratio - 1);
    e.reputacion = limitar(
      e.reputacion + (e.calidad - e.reputacion) * 0.012 - sobreprecio * 1.2,
      0,
      100
    );

    // El sobreprecio quema a los empleados: mas tickets, mas quejas.
    if (sobreprecio > 0.02) {
      for (const a of this.agentes) {
        if (a.dimitido) continue;
        const sensibilidad = a.sensibilidadPrecio != null ? a.sensibilidadPrecio : 0.4;
        a.moral = limitar(a.moral - sobreprecio * 1.6 * sensibilidad, 0, 100);
      }
    }

    // Calidad: se oxida sola si nadie la mantiene.
    e.calidad = limitar(e.calidad - 0.02, 0, 100);
  }

  _cerrarDia() {
    const e = this.empresa;
    const vivos = this.agentes.filter((a) => !a.dimitido).length;
    const coste = vivos * e.salarioPorDia + e.alquilerPorDia;
    e.dinero -= coste;
    e.costeUltimoDia = coste;

    this.registrar(
      'dinero',
      `Fin del dia ${this.dia - 1}: nominas de ${vivos} empleados y alquiler = -${coste} EUR. Caja: ${Math.round(e.dinero)} EUR.`
    );

    e.historial.push({
      dia: this.dia - 1,
      dinero: Math.round(e.dinero),
      clientes: Math.round(e.clientes),
      calidad: Math.round(e.calidad),
      reputacion: Math.round(e.reputacion)
    });
    if (e.historial.length > 60) e.historial.shift();

    if (e.dinero < 0) {
      this.registrar('alerta', 'La caja esta en numeros rojos. Si sigue asi, tendras que despedir a alguien.');
    }
  }

  // ------------------------------------------------------- cola de la IA

  _puedeLlamar() {
    const ahora = Date.now();
    const tope = this.consumo.maxLlamadasPorMinuto || 18;
    this.marcasLlamadas = this.marcasLlamadas.filter((t) => ahora - t < 60000);
    const puede = this.marcasLlamadas.length < tope;
    if (!puede && !this.modoAhorro) {
      this.modoAhorro = true;
      this.registrar('sistema', `Modo ahorro: ${tope} llamadas al modelo por minuto es el tope. Las siguientes esperan su turno.`);
      this._emitir();
    } else if (puede && this.modoAhorro) {
      this.modoAhorro = false;
    }
    return puede;
  }

  /**
   * Pide a un empleado que reaccione a un suceso.
   * Si ya tenia una reflexion pendiente, se FUSIONAN: asi cinco cosas seguidas
   * cuestan una sola llamada al modelo en vez de cinco.
   */
  encolarReflexion(agenteId, texto) {
    const yaEsta = this.pendientes.find((p) => p.agenteId === agenteId);
    if (yaEsta) {
      if (!yaEsta.sucesos.includes(texto)) yaEsta.sucesos.push(texto);
      return;
    }
    this.pendientes.push({ agenteId, sucesos: [texto] });
    const a = this.agentes.find((x) => x.id === agenteId);
    if (a && !a.dimitido) {
      a.pensando = true;
      a.pensandoMotivo = texto;
    }
    this._bombear();
  }

  encolarReflexionATodos(texto) {
    for (const a of this.agentes) {
      if (!a.dimitido) this.encolarReflexion(a.id, texto);
    }
  }

  async _bombear() {
    if (this._bombeando) return;
    this._bombeando = true;
    const miGeneracion = this.generacion;

    try {
      while (this.pendientes.length) {
        if (miGeneracion !== this.generacion) return; // el juego se reinicio
        if (!this._puedeLlamar()) {
          await esperar(2500);
          continue;
        }
        const tarea = this.pendientes.shift();
        const agente = this.agentes.find((a) => a.id === tarea.agenteId);
        if (!agente || agente.dimitido) continue;

        await this._reflexionar(agente, tarea.sucesos, miGeneracion);
        this.marcasLlamadas.push(Date.now());

        const pausa = this.consumo.pausaEntreLlamadasMs || 0;
        if (pausa) await esperar(pausa);
      }
    } finally {
      this._bombeando = false;
      if (this.pendientes.length) setTimeout(() => this._bombear(), 50);
    }
  }

  /** Una llamada real al modelo local. Aqui es donde "piensa" el empleado. */
  async _reflexionar(agente, sucesos, miGeneracion) {
    if (miGeneracion !== this.generacion) return;

    agente.pensando = true;
    for (const s of sucesos) recordar(agente, s, this.consumo.maxRecuerdos);

    const prompt = promptReaccion(this, agente, sucesos.join(' · '));
    const etiqueta = `${agente.nombre} reacciona`;

    let entrada;
    try {
      entrada = await this.cliente.chat({
        modelo: agente.modelo,
        mensajes: [
          { role: 'system', content: systemPrompt(agente) },
          { role: 'user', content: prompt }
        ],
        temperatura: agente.temperatura,
        maxTokens: this.consumo.maxTokensDecision || 220,
        esquema: ESQUEMA_DECISION,
        etiqueta,
        agenteId: agente.id
      });
    } catch (e) {
      agente.pensando = false;
      agente.pensandoMotivo = null;
      this.registrar('error', `${agente.nombre} no pudo pensar: ${e.message}`);
      return;
    }

    if (miGeneracion !== this.generacion) return;

    agente.pensando = false;
    agente.pensandoMotivo = null;

    const decision = interpretarDecision(entrada.json);
    agente.ultimaDecision = {
      pensamiento: decision.pensamiento,
      dialogo: decision.dialogo,
      objetivo: decision.objetivo,
      accion: decision.accion,
      animoDeclarado: decision.animo,
      t: Date.now(),
      tokensPrompt: entrada.tokensPrompt,
      tokensRespuesta: entrada.tokensRespuesta,
      ms: entrada.ms,
      modelo: entrada.modelo,
      temperatura: entrada.temperatura
    };

    // El animo que declara el modelo se mezcla con el real: no le hacemos
    // caso ciego, porque un modelo pequeno exagera.
    if (decision.animo != null) {
      agente.moral = limitar(agente.moral * 0.6 + decision.animo * 0.4, 0, 100);
    }

    if (decision.dialogo) {
      agente.bocadillo = { texto: decision.dialogo, t: Date.now() };
      this.registrar('dialogo', `${agente.nombre}: "${decision.dialogo}"`);
    }

    if (decision.accion) {
      const sucesosAplicados = aplicarAccion(this, agente, decision.accion);
      this.registrar('accion', `${agente.nombre} decide: ${ACCIONES[decision.accion].descripcion}.`);
      for (const s of sucesosAplicados) this.registrar(s.tipo, s.texto);

      // Acciones que merecen respuesta automatica del jefe (la empresa).
      if (decision.accion === 'renunciar') {
        this.registrar('alerta', `${agente.nombre} ha dimitido. Su escritorio queda vacio.`);
      }
    } else if (entrada.aviso) {
      this.registrar('aviso', `${agente.nombre} respondio algo que no era JSON valido; se ignoro su accion.`);
    }

    if (decision.objetivo) {
      recordar(agente, `Me propuse: ${decision.objetivo}`, this.consumo.maxRecuerdos);
    }

    this._emitir();
  }

  // ---------------------------------------------------- conversacion libre

  /** El jugador le habla directamente a un empleado. */
  async hablar(agenteId, mensaje) {
    const agente = this.agentes.find((a) => a.id === agenteId);
    if (!agente) throw new Error('Ese empleado no existe.');
    if (agente.dimitido) throw new Error(`${agente.nombre} ya no trabaja aqui.`);

    agente.conversacion.push({ rol: 'jefe', texto: mensaje });
    while (agente.conversacion.length > (this.consumo.maxTurnosConversacion || 8)) {
      agente.conversacion.shift();
    }

    const prompt = promptCharla(this, agente, mensaje);

    const entrada = await this.cliente.chat({
      modelo: agente.modelo,
      mensajes: [
        { role: 'system', content: systemPrompt(agente) },
        { role: 'user', content: prompt }
      ],
      temperatura: agente.temperatura,
      maxTokens: this.consumo.maxTokensChat || 260,
      esquema: ESQUEMA_CHARLA,
      etiqueta: `Hablar con ${agente.nombre}`,
      agenteId: agente.id
    });

    const json = entrada.json || {};
    const dialogo = String(json.dialogo || entrada.respuesta || '...').trim();
    const animo = Number.isFinite(json.animo) ? limitar(Math.round(json.animo), 0, 100) : null;
    const recuerdo = String(json.recuerdo || '').trim();

    agente.conversacion.push({ rol: agente.id, texto: dialogo });
    while (agente.conversacion.length > (this.consumo.maxTurnosConversacion || 8)) {
      agente.conversacion.shift();
    }

    if (animo != null) agente.moral = limitar(agente.moral * 0.5 + animo * 0.5, 0, 100);

    // Hablar con el jefe sube la moral: te sientes escuchado.
    agente.moral = limitar(agente.moral + 3, 0, 100);
    agente.bocadillo = { texto: dialogo, t: Date.now() };

    if (recuerdo) recordar(agente, recuerdo, this.consumo.maxRecuerdos);

    agente.ultimaCharla = {
      t: Date.now(),
      mensajeJefe: mensaje,
      respuesta: dialogo,
      tokensPrompt: entrada.tokensPrompt,
      tokensRespuesta: entrada.tokensRespuesta,
      ms: entrada.ms,
      modelo: entrada.modelo,
      temperatura: entrada.temperatura
    };

    this.registrar('dialogo', `${agente.nombre}: "${dialogo}"`);
    this._emitir();

    return {
      dialogo,
      animo,
      prompt,
      metricas: {
        tokensPrompt: entrada.tokensPrompt,
        tokensRespuesta: entrada.tokensRespuesta,
        ms: entrada.ms,
        modelo: entrada.modelo,
        temperatura: entrada.temperatura
      }
    };
  }

  // -------------------------------------------------------- poderes de dios

  /**
   * Todos los poderes devuelven { ok, mensaje, afectados }.
   * Cada uno genera sucesos que hacen PENSAR a los empleados afectados.
   */
  dios(accion, carga = {}) {
    const e = this.empresa;
    const busca = (id) => this.agentes.find((a) => a.id === id);

    switch (accion) {
      case 'precio': {
        const nuevo = Number(carga.valor);
        if (!Number.isFinite(nuevo) || nuevo < 1 || nuevo > 500) {
          return { ok: false, mensaje: 'El precio debe estar entre 1 y 500 EUR.' };
        }
        const viejo = e.precio;
        e.precio = nuevo;
        const pct = Math.round(((nuevo - viejo) / viejo) * 100);
        const signo = pct >= 0 ? '+' : '';
        const texto = pct === 0
          ? `El jefe dejo el precio en ${r1(nuevo)} EUR.`
          : `El jefe ha cambiado el precio un ${signo}${pct}%: de ${r1(viejo)} a ${r1(nuevo)} EUR.`;
        this.registrar('dios', texto);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'romper_ordenador': {
        const a = busca(carga.agenteId);
        if (!a) return { ok: false, mensaje: 'Ese empleado no existe.' };
        if (a.ordenador.roto) return { ok: false, mensaje: `El ordenador de ${a.nombre} ya estaba roto.` };
        a.ordenador.salud = 0;
        a.ordenador.roto = true;
        a.ordenador.rotoDesde = this.tick;
        a.reparando = false;
        a.estado = 'bloqueado';
        a.moral = limitar(a.moral - 12, 0, 100);
        const texto = `El jefe ha destrozado el ordenador de ${a.nombre}. Esta humeando y no arranca.`;
        this.registrar('dios', texto);
        this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'arreglar_ordenador': {
        const a = busca(carga.agenteId);
        if (!a) return { ok: false, mensaje: 'Ese empleado no existe.' };
        a.ordenador.salud = 100;
        a.ordenador.roto = false;
        a.reparando = false;
        a.estado = 'trabajando';
        const texto = `El jefe ha traido un ordenador nuevo para ${a.nombre}.`;
        this.registrar('dios', texto);
        this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'bono': {
        const cantidad = Math.round(Number(carga.cantidad) || 0);
        if (cantidad <= 0) return { ok: false, mensaje: 'El bono tiene que ser positivo.' };
        if (cantidad > e.dinero) return { ok: false, mensaje: 'No hay tanto dinero en caja.' };

        const destinatarios = carga.agenteId
          ? [busca(carga.agenteId)].filter(Boolean)
          : this.agentes.filter((a) => !a.dimitido);
        if (!destinatarios.length) return { ok: false, mensaje: 'No hay a quien darle el bono.' };

        const total = cantidad * destinatarios.length;
        if (total > e.dinero) return { ok: false, mensaje: `Eso costaria ${total} EUR y solo hay ${Math.round(e.dinero)} EUR.` };

        e.dinero -= total;
        for (const a of destinatarios) {
          a.moral = limitar(a.moral + 18, 0, 100);
          a.energia = limitar(a.energia + 6, 0, 100);
        }
        const nombres = destinatarios.map((a) => a.nombre).join(', ');
        const texto = `El jefe ha repartido un bono de ${cantidad} EUR a ${nombres}.`;
        this.registrar('dios', `${texto} (coste total ${total} EUR)`);
        for (const a of destinatarios) this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'reganar': {
        const a = busca(carga.agenteId);
        if (!a) return { ok: false, mensaje: 'Ese empleado no existe.' };
        a.moral = limitar(a.moral - 20, 0, 100);
        a.energia = limitar(a.energia + 10, 0, 100); // el susto espabila
        const texto = `El jefe le ha echado una bronca a ${a.nombre} delante de todos.`;
        this.registrar('dios', texto);
        this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'cafetera': {
        if (e.tieneCafetera) return { ok: false, mensaje: 'Ya hay cafetera.' };
        const precio = 180;
        if (e.dinero < precio) return { ok: false, mensaje: `La cafetera cuesta ${precio} EUR y no llega la caja.` };
        e.dinero -= precio;
        e.tieneCafetera = true;
        const texto = 'El jefe ha comprado una cafetera decente. El cafe ya no es agua sucia.';
        this.registrar('dios', `${texto} (-${precio} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'subir_alquiler': {
        const aumento = Math.round(Number(carga.cantidad) || 10);
        e.alquilerPorDia += aumento;
        const texto = `El jefe ha subido el alquiler de la oficina ${aumento} EUR al dia. Ahora son ${e.alquilerPorDia} EUR diarios.`;
        this.registrar('dios', texto);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'apagon': {
        e.apagon = !e.apagon;
        const texto = e.apagon
          ? 'El jefe ha cortado la luz. Todos los ordenadores estan apagados.'
          : 'El jefe ha devuelto la luz. Los ordenadores arrancan de nuevo.';
        this.registrar('dios', texto);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'dia_libre': {
        this.hora = 19; // salta el horario laboral
        for (const a of this.agentes) {
          if (a.dimitido) continue;
          a.moral = limitar(a.moral + 12, 0, 100);
          a.energia = limitar(a.energia + 25, 0, 100);
        }
        const texto = 'El jefe ha mandado a todo el mundo a casa antes de tiempo. Dia libre pagado.';
        this.registrar('dios', texto);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'despedir': {
        const a = busca(carga.agenteId);
        if (!a || a.dimitido) return { ok: false, mensaje: 'Ese empleado no esta trabajando aqui.' };
        a.dimitido = true;
        a.estado = 'dimitido';
        a.bocadillo = { texto: '...', t: Date.now() };
        e.reputacion = limitar(e.reputacion - 2, 0, 100);
        const texto = `El jefe ha despedido a ${a.nombre}. Recoge sus cosas y se va.`;
        this.registrar('dios', texto);
        for (const otro of this.agentes) {
          if (!otro.dimitido) {
            otro.moral = limitar(otro.moral - 6, 0, 100);
            this.encolarReflexion(otro.id, texto);
          }
        }
        return { ok: true, mensaje: texto };
      }

      case 'contratar': {
        const nivel = this.niveles[e.indiceNivel];
        const vivos = this.agentes.filter((a) => !a.dimitido);
        if (vivos.length >= nivel.maxEmpleados) {
          return {
            ok: false,
            mensaje: `En ${nivel.nombre} solo caben ${nivel.maxEmpleados} empleados. Amplia la oficina para meter a mas.`
          };
        }

        const yaEstan = new Set(vivos.map((a) => a.id));
        const candidato = (this.cfg.candidatos || []).find((c) => !yaEstan.has(c.id));
        if (!candidato) {
          return { ok: false, mensaje: 'No queda nadie en la lista de candidatos.' };
        }

        const coste = this.cfg.costeContratacion || 0;
        if (e.dinero < coste) {
          return { ok: false, mensaje: `Contratar cuesta ${coste} EUR (prueba, entrevistas, equipo) y no llega la caja.` };
        }
        e.dinero -= coste;

        // Buscamos el primer escritorio libre (los despedidos lo dejan libre).
        const ocupados = new Set(vivos.map((a) => a.indiceEscritorio));
        let indice = 0;
        while (ocupados.has(indice)) indice++;

        const fichaje = crearEmpleado(candidato, indice, this.cfg.modeloPorDefecto);
        this.agentes.push(fichaje);

        const texto = `${fichaje.nombre} se incorpora a PixelSoft como ${fichaje.puesto.toLowerCase()}.`;
        this.registrar('dios', `${texto} Ya sois ${vivos.length + 1} en la oficina. (-${coste} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: `${texto} Le toca el escritorio ${indice + 1}.` };
      }

      case 'mejorar_oficina': {
        const siguiente = this.niveles[e.indiceNivel + 1];
        if (!siguiente) return { ok: false, mensaje: 'La oficina ya esta al maximo.' };
        if (e.dinero < siguiente.coste) {
          return { ok: false, mensaje: `Ampliar a ${siguiente.nombre} cuesta ${siguiente.coste} EUR y no llega la caja.` };
        }
        e.dinero -= siguiente.coste;
        e.indiceNivel++;
        const texto = `La empresa se muda: ahora es ${siguiente.nombre}. Caben hasta ${siguiente.maxEmpleados} empleados.`;
        this.registrar('dios', `${texto} (-${siguiente.coste} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      default:
        return { ok: false, mensaje: `Poder desconocido: ${accion}` };
    }
  }

  // ------------------------------------------------------------- snapshot

  /** Version del estado que viaja al navegador. */
  snapshot() {
    const e = this.empresa;
    const precioBase = 18 + e.calidad * 0.35;
    const nivel = this.niveles[e.indiceNivel];
    const siguiente = this.niveles[e.indiceNivel + 1] || null;

    return {
      dia: this.dia,
      hora: this.hora,
      tick: this.tick,
      laboral: this.laboral,
      modoAhorro: this.modoAhorro,
      pendientesIA: this.pendientes.length + this.cliente.enCola,
      empresa: {
        ...e,
        precioBase,
        ratioPrecio: e.precio / Math.max(1, precioBase),
        nivelNombre: nivel.nombre,
        nivelId: nivel.id,
        maxEmpleados: nivel.maxEmpleados,
        siguienteNivel: siguiente ? { nombre: siguiente.nombre, coste: siguiente.coste } : null,
        ingresoPorDia: Math.round((e.ingresoHoraMedio || 0) * 9),
        costePorDia: this.agentes.filter((a) => !a.dimitido).length * e.salarioPorDia + e.alquilerPorDia,
        historial: e.historial.slice(-40)
      },
      agentes: this.agentes.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        puesto: a.puesto,
        aspecto: a.aspecto,
        modelo: a.modelo,
        temperatura: a.temperatura,
        sitio: a.sitio,
        estado: a.estado,
        energia: a.energia,
        moral: a.moral,
        habilidad: a.habilidad,
        ordenador: a.ordenador,
        dimitido: a.dimitido,
        pensando: a.pensando,
        pensandoMotivo: a.pensandoMotivo,
        peticionAumento: a.peticionAumento,
        bocadillo: a.bocadillo && Date.now() - a.bocadillo.t < 14000 ? a.bocadillo : null,
        recuerdos: a.recuerdos,
        conversacion: a.conversacion,
        ultimaDecision: a.ultimaDecision,
        indiceEscritorio: a.indiceEscritorio
      })),
      sucesos: this.sucesos.slice(-60),
      ia: this.cliente.resumenEstadisticas()
    };
  }
}

module.exports = { Mundo };
