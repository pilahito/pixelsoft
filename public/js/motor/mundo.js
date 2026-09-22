/**
 * MUNDO: el motor del juego. Es el MISMO codigo en el PC y en el movil.
 *
 * Bucle principal (tick cada ~1,2 s y cada tick es 1 hora de juego):
 *   1. Avanza el reloj.
 *   2. Simula el trabajo de cada empleado (esto NO gasta IA).
 *   3. Calcula la economia (calidad, clientes, ingresos, reputacion).
 *   4. Al acabar el dia, paga nominas y alquiler.
 *
 * Quien decide lo que piensan los empleados es el "cerebro", que se inyecta
 * desde fuera: real (modelo local por HTTP) o simulado (voces escritas).
 */

import {
  ACCIONES,
  NIVELES_HARDWARE,
  aplicarAccion,
  interpretarDecision,
  recordar,
  crearEmpleado,
  limitar
} from './reglas.js';
import { RECLUTAS } from './reclutas.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (v) => Math.round(v * 10) / 10;

class Mundo {
  /**
   * @param {object} config  El config.json entero
   * @param {object} cerebro Quien decide. Interfaz:
   *        decidir({agente, sucesos, mundo, etiqueta, maxTokens}) -> entrada
   *        charlar({agente, mensaje, mundo, maxTokens})           -> entrada
   *        resumenEstadisticas()
   *        enCola
   *        ilimitado  (true = no aplicar el tope de llamadas por minuto)
   */
  constructor(config, cerebro) {
    this.cfg = config;
    this.cerebro = cerebro;
    this.consumo = config.consumo || {};
    /** Las habitaciones que se pueden comprar. La primera es gratis. */
    this.habitaciones = config.habitaciones || [
      { id: 'trabajo', nombre: 'Zona de trabajo', coste: 0, escritorios: 3 }
    ];

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
      /** Habitaciones desbloqueadas. Se empieza con la zona de trabajo. */
      habitaciones: [this.habitaciones[0].id],
      alquilerPorDia: j.alquilerPorDia,
      salarioPorDia: j.salarioPorDia,
      ingresoUltimaHora: 0,
      ingresoHoraMedio: null,
      costeUltimoDia: 0,
      tieneCafetera: false,
      tieneAntivirus: false,
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
    this._propagarVirus();
    this._economia();
    this._bombear();
    this._emitir();
  }

  /**
   * Los virus se contagian solos entre ordenadores de la misma oficina.
   * Un antivirus instalado frena muchisimo el contagio, y un ordenador con
   * buen hardware resiste mejor.
   */
  _propagarVirus() {
    const infectados = this.agentes.filter((a) => !a.dimitido && a.ordenador.virus);
    if (!infectados.length) return;

    const sanos = this.agentes.filter((a) => !a.dimitido && !a.ordenador.virus && !a.ordenador.roto);
    if (!sanos.length) return;

    const antivirus = this.empresa.tieneAntivirus ? 0.3 : 1;
    // Con sala de servidores todo esta mejor montado y el bicho corre menos.
    const salaServidores = this.empresa.habitaciones.includes('servidores') ? 0.45 : 1;
    const probabilidad = 0.014 * infectados.length * antivirus * salaServidores;
    if (Math.random() > probabilidad) return;

    // Cuanta mejor hardware, mas dificil que entre.
    sanos.sort((a, b) => (a.ordenador.nivel || 1) - (b.ordenador.nivel || 1));
    const victima = sanos[0];

    victima.ordenador.virus = true;
    victima.ordenador.virusDesde = this.tick;
    victima.moral = limitar(victima.moral - 7, 0, 100);

    const texto = `El virus se ha pasado al ordenador de ${victima.nombre}.`;
    this.registrar('virus', texto);
    this.encolarReflexion(victima.id, `Tu ordenador se ha infectado: le ha llegado el virus de un companero. ${texto}`);
  }

  get laboral() {
    return this.hora >= 9 && this.hora < this.cfg.juego.horaFinTrabajo;
  }

  /* -------------------------------------------------------- habitaciones */

  /** Definicion de una habitacion por su id. */
  habitacion(id) {
    return this.habitaciones.find((h) => h.id === id) || null;
  }

  /** Cuantas habitaciones lleva compradas la empresa. */
  get numHabitaciones() {
    return this.empresa.habitaciones.length;
  }

  /** Cuantos escritorios hay disponibles ahora mismo. */
  get escritoriosDisponibles() {
    return this.empresa.habitaciones.reduce((total, id) => {
      const h = this.habitacion(id);
      return total + (h && h.escritorios ? h.escritorios : 0);
    }, 0);
  }

  /**
   * Cuanta mas oficina, mas clientes potenciales. Premia ampliar en vez de
   * limitarse a exprimir el precio.
   */
  get multiplicadorClientes() {
    return 1 + 0.13 * Math.max(0, this.numHabitaciones - 1);
  }

  /** Con cocina aguantan mejor la jornada sin desplomarse. */
  get gastoEnergia() {
    return this.empresa.habitaciones.includes('cocina') ? 0.74 : 1;
  }

  /** La sala de reuniones hace que el producto mejore mas rapido. */
  get bonusCalidad() {
    return this.empresa.habitaciones.includes('reuniones') ? 1.35 : 1;
  }

  /** Las habitaciones que aun quedan por comprar. */
  habitacionesDisponibles() {
    return this.habitaciones.filter((h) => !this.empresa.habitaciones.includes(h.id));
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

      // --- VIRUS -------------------------------------------------------
      // Un ordenador con virus no se para: sigue encendido, pero arrastra
      // todo. Si el empleado decide limpiarlo, va avanzando poco a poco.
      if (a.ordenador.virus) {
        a.moral = limitar(a.moral - 0.22, 0, 100);
        a.energia = limitar(a.energia - 0.5, 0, 100);

        if (a.limpiando && this.laboral) {
          a.estado = 'limpiando';
          a.progresoVirus = (a.progresoVirus || 0) + 11;
          a.energia = limitar(a.energia - 2, 0, 100);
          if (a.progresoVirus >= 100) {
            a.ordenador.virus = false;
            a.limpiando = false;
            a.progresoVirus = 0;
            a.estado = 'trabajando';
            a.moral = limitar(a.moral + 9, 0, 100);
            this.registrar('virus', `${a.nombre} ha limpiado el virus. Su ordenador vuelve a ir fino.`);
            recordar(a, 'Limpie un virus de mi ordenador.', this.consumo.maxRecuerdos);
          }
          continue;
        }
      } else {
        a.limpiando = false;
        a.progresoVirus = 0;
      }

      if (!this.laboral) {
        // Fuera de horario: descansan. Con sala de descanso se recuperan
        // muchisimo mejor, que es justo para lo que se compra.
        const comodo = this.empresa.habitaciones.includes('descanso') ? 1.9 : 1;
        a.estado = 'descansando';
        a.energia = limitar(a.energia + 3 * comodo + impulsoMoral, 0, 100);
        a.moral = limitar(a.moral + 0.15 * impulsoMoral * comodo, 0, 100);
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

      // Cuanto rinde: habilidad, energia, salud del ordenador, si tiene virus
      // y el hardware que le haya instalado el jefe.
      const factorVirus = a.ordenador.virus ? 0.45 : 1;
      const factorHardware = (NIVELES_HARDWARE[(a.ordenador.nivel || 1) - 1] || { bonus: 1 }).bonus;
      const rinde = (a.habilidad / 50) * (a.energia / 100) * (a.ordenador.salud / 100) * factorVirus * factorHardware;

      a.energia = limitar(a.energia - 1.4 * this.gastoEnergia + impulsoMoral * 0.5, 0, 100);
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
        e.calidad = limitar(e.calidad + 0.045 * rinde * this.bonusCalidad, 0, 100);
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

    const nivel = { multiplicadorClientes: this.multiplicadorClientes };
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
    // El cerebro simulado no gasta nada, asi que no tiene sentido frenarlo.
    if (this.cerebro.ilimitado) return true;

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

    const etiqueta = `${agente.nombre} reacciona`;

    // El "cerebro" puede ser real (modelo local por HTTP) o simulado (reglas y
    // voces escritas a mano). El mundo no sabe ni le importa cual es: solo pide
    // una decision con esta forma.
    let entrada;
    try {
      entrada = await this.cerebro.decidir({
        agente,
        sucesos,
        mundo: this,
        etiqueta,
        maxTokens: this.consumo.maxTokensDecision || 220
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

    const entrada = await this.cerebro.charlar({
      agente,
      mensaje,
      mundo: this,
      maxTokens: this.consumo.maxTokensChat || 260
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
      prompt: entrada.prompt || null,
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
        const vivos = this.agentes.filter((a) => !a.dimitido);
        const mesas = this.escritoriosDisponibles;

        if (vivos.length >= mesas) {
          return {
            ok: false,
            mensaje: `Solo hay ${mesas} escritorios y ya estan todos ocupados. Compra una habitacion con mas mesas.`
          };
        }

        const yaEstan = new Set(vivos.map((a) => a.id));
        // Los candidatos salen del config y ademas de reclutas.js, que es
        // donde vive el corpus de voz de los fichajes nuevos.
        const candidatos = [...(this.cfg.candidatos || []), ...(RECLUTAS.personas || [])];
        const candidato = candidatos.find((c) => !yaEstan.has(c.id));
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

      case 'meter_virus': {
        const a = busca(carga.agenteId);
        if (!a) return { ok: false, mensaje: 'Ese empleado no existe.' };
        if (a.ordenador.roto) return { ok: false, mensaje: `El ordenador de ${a.nombre} esta roto. Arreglalo antes de infectarlo.` };
        if (a.ordenador.virus) return { ok: false, mensaje: `El ordenador de ${a.nombre} ya tiene un virus.` };

        a.ordenador.virus = true;
        a.ordenador.virusDesde = this.tick;
        a.limpiando = false;
        a.progresoVirus = 0;
        a.moral = limitar(a.moral - 10, 0, 100);

        const texto = `El jefe ha metido un virus en el ordenador de ${a.nombre}. La pantalla se ha llenado de ventanas raras.`;
        this.registrar('dios', texto);
        this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'antivirus': {
        if (e.tieneAntivirus) return { ok: false, mensaje: 'La oficina ya tiene antivirus instalado.' };
        const precio = 240;
        if (e.dinero < precio) return { ok: false, mensaje: `El antivirus cuesta ${precio} EUR y no llega la caja.` };

        e.dinero -= precio;
        e.tieneAntivirus = true;

        let limpios = 0;
        for (const a of this.agentes) {
          if (a.dimitido) continue;
          if (a.ordenador.virus) {
            a.ordenador.virus = false;
            a.limpiando = false;
            a.progresoVirus = 0;
            a.moral = limitar(a.moral + 6, 0, 100);
            limpios++;
          }
        }

        const texto = `El jefe ha instalado un antivirus en toda la oficina.${limpios ? ` Ha limpiado ${limpios} ordenador${limpios > 1 ? 'es' : ''} de golpe.` : ' Ahora los virus se contagian mucho menos.'}`;
        this.registrar('dios', `${texto} (-${precio} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'instalar_hardware': {
        const a = busca(carga.agenteId);
        if (!a) return { ok: false, mensaje: 'Ese empleado no existe.' };

        const nivel = a.ordenador.nivel || 1;
        if (nivel >= NIVELES_HARDWARE.length) {
          return { ok: false, mensaje: `El ordenador de ${a.nombre} ya es de lo mejorcito. No hay nada que ampliar.` };
        }

        const precio = nivel === 1 ? 380 : 850;
        if (e.dinero < precio) {
          return { ok: false, mensaje: `Ampliar el ordenador de ${a.nombre} cuesta ${precio} EUR y no llega la caja.` };
        }

        e.dinero -= precio;
        a.ordenador.nivel = nivel + 1;
        a.ordenador.salud = 100;
        a.moral = limitar(a.moral + 9, 0, 100);
        a.energia = limitar(a.energia + 4, 0, 100);

        const nuevo = NIVELES_HARDWARE[nivel];
        const texto = `El jefe le ha ampliado el ordenador a ${a.nombre}: mas RAM, disco rapido y grafica. Ahora es ${nuevo.nombre}.`;
        this.registrar('dios', `${texto} (-${precio} EUR)`);
        this.encolarReflexion(a.id, texto);
        return { ok: true, mensaje: texto };
      }

      case 'arreglar_todo': {
        const precio = 120;
        const estropeados = this.agentes.filter((a) => !a.dimitido && (a.ordenador.roto || a.ordenador.virus));
        if (!estropeados.length) {
          return { ok: false, mensaje: 'Ahora mismo no hay ningun ordenador roto ni infectado.' };
        }
        if (e.dinero < precio) {
          return { ok: false, mensaje: `Ponerlo todo a punto cuesta ${precio} EUR y no llega la caja.` };
        }

        e.dinero -= precio;
        for (const a of estropeados) {
          a.ordenador.roto = false;
          a.ordenador.virus = false;
          a.ordenador.salud = 100;
          a.reparando = false;
          a.limpiando = false;
          a.progresoVirus = 0;
          a.bloqueadoTicks = 0;
          a.estado = 'trabajando';
          a.moral = limitar(a.moral + 5, 0, 100);
        }

        const texto = `El jefe ha dejado como nuevos ${estropeados.length} ordenador${estropeados.length > 1 ? 'es' : ''}.`;
        this.registrar('dios', `${texto} (-${precio} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      case 'comprar_habitacion': {
        const disponibles = this.habitacionesDisponibles();
        if (!disponibles.length) return { ok: false, mensaje: 'La oficina ya esta completa. No queda sitio.' };

        // Sin id, se compra la mas barata que quede (es lo que hace el boton
        // generico de "ampliar la oficina").
        const h = carga.habitacionId
          ? this.habitacion(carga.habitacionId)
          : disponibles.slice().sort((a, b) => a.coste - b.coste)[0];

        if (!h) return { ok: false, mensaje: 'Esa habitacion no existe.' };
        if (e.habitaciones.includes(h.id)) return { ok: false, mensaje: `Ya tienes ${h.nombre}.` };
        if (e.dinero < h.coste) {
          return { ok: false, mensaje: `${h.nombre} cuesta ${h.coste} EUR y no llega la caja.` };
        }

        e.dinero -= h.coste;
        e.habitaciones.push(h.id);
        // Emocion y moral: estrenar sitio sienta de maravilla.
        for (const a of this.agentes) {
          if (!a.dimitido) a.moral = limitar(a.moral + 11, 0, 100);
        }

        const texto = `La empresa estrena habitacion: ${h.nombre}. ${h.aporta}.`;
        this.registrar('dios', `${texto} (-${h.coste} EUR)`);
        this.encolarReflexionATodos(texto);
        return { ok: true, mensaje: texto };
      }

      // Alias viejo, por si algo llama al poder anterior.
      case 'mejorar_oficina':
        return this.dios('comprar_habitacion', {});

      default:
        return { ok: false, mensaje: `Poder desconocido: ${accion}` };
    }
  }

  // ------------------------------------------------------------- snapshot

  /** Version del estado que viaja al navegador. */
  snapshot() {
    const e = this.empresa;
    const precioBase = 18 + e.calidad * 0.35;
    const vivos = this.agentes.filter((a) => !a.dimitido).length;

    return {
      dia: this.dia,
      hora: this.hora,
      tick: this.tick,
      laboral: this.laboral,
      modoAhorro: this.modoAhorro,
      pendientesIA: this.pendientes.length + this.cerebro.enCola,
      empresa: {
        ...e,
        precioBase,
        ratioPrecio: e.precio / Math.max(1, precioBase),
        multiplicadorClientes: this.multiplicadorClientes,
        escritorios: this.escritoriosDisponibles,
        empleados: vivos,
        habitacionesDisponibles: this.habitacionesDisponibles().map((h) => ({
          id: h.id,
          nombre: h.nombre,
          coste: h.coste,
          lema: h.lema,
          aporta: h.aporta
        })),
        ingresoPorDia: Math.round((e.ingresoHoraMedio || 0) * 9),
        costePorDia: vivos * e.salarioPorDia + e.alquilerPorDia,
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
      ia: this.cerebro.resumenEstadisticas()
    };
  }
}

export { Mundo };
