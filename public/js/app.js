/* =====================================================================
   APP  ·  Une el servidor con la interfaz.
   - Recibe el estado por SSE (el servidor empuja, el navegador no pregunta).
   - Mantiene el bucle de dibujo del canvas.
   - Manda los poderes de dios y las conversaciones.
   - Rellena el laboratorio de IA (prompt exacto + respuesta cruda).
   ===================================================================== */

import { Renderizador } from './render.js';
import * as S from './sprites.js';
import { sonidos } from './sonidos.js';

const $ = (id) => document.getElementById(id);

/* --------------------------------------------------------------- sonido */

/**
 * Los navegadores no dejan sonar nada hasta que el jugador toca la pantalla,
 * asi que el audio se despierta con el primer toque y ya se queda vivo.
 */
function despertarSonido() {
  sonidos.desbloquear();
  window.removeEventListener('pointerdown', despertarSonido);
  window.removeEventListener('keydown', despertarSonido);
}
window.addEventListener('pointerdown', despertarSonido);
window.addEventListener('keydown', despertarSonido);

/** Que suena con cada poder. Cada traste tiene su propio ruidito. */
const SONIDO_PODER = {
  precio: 'moneda',
  bono: 'bono',
  contratar: 'contratar',
  comprar_habitacion: 'habitacion',
  mejorar_oficina: 'habitacion',
  instalar_hardware: 'hardware',
  romper_ordenador: 'romper',
  meter_virus: 'virus',
  apagon: 'apagon',
  despedir: 'error',
  reganar: 'error',
  antivirus: 'reparado',
  arreglar_todo: 'reparado',
  arreglar_ordenador: 'reparado',
  cafetera: 'moneda',
  dia_libre: 'dia',
  subir_alquiler: 'error'
};

const lienzo = $('oficina');
/** Se crea al arrancar: necesita el config para saber donde va cada habitacion. */
let renderizador = null;

let estado = null;
let ultimoSucesoRender = null;
let objetivo = null;              // empleado seleccionado para las trastadas
let charlaCon = null;             // empleado con el que hablas
const hilos = new Map();          // id -> [{ rol, texto }]
let modelosCargados = [];

/* ------------------------------------------------- modo de funcionamiento */

/**
 * El MISMO juego funciona de dos maneras:
 *
 *   - Servidor (PC): el estado y la IA viven en el servidor. Esto es un mando
 *     que pinta lo que le llega por SSE.
 *   - Local (movil / abrir el HTML a pelo): el motor del juego corre AQUI,
 *     dentro del navegador, y los empleados piensan con el cerebro simulado.
 *
 * Se elige solo: si la pagina se abre como fichero (file://), se le pasa
 * ?local, o NO hay servidor que responda, va en modo local.
 */
let MODO_LOCAL = location.protocol === 'file:' || new URLSearchParams(location.search).has('local');

let mundoLocal = null;
let cerebroLocal = null;
/** Referencia al simulado, para poder volver a el si se suelta la IA real. */
let cerebroSimuladoLocal = null;
let configLocal = null;

/* ------------------------------------------------------------- utilidades */

function dinero(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('es-ES') + ' €';
}

let temporizadorBrindis = null;
function brindis(texto, esError = false) {
  const el = $('brindis');
  el.textContent = texto;
  el.classList.toggle('error', !!esError);
  el.classList.add('visible');
  clearTimeout(temporizadorBrindis);
  temporizadorBrindis = setTimeout(() => el.classList.remove('visible'), 4200);
}

async function pedir(ruta, opciones) {
  if (MODO_LOCAL) return pedirLocal(ruta, opciones);
  const res = await fetch(ruta, opciones);
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.mensaje || `Error ${res.status}`);
  return datos;
}

/**
 * En modo local no hay servidor: se atiende aqui mismo, contra el mundo que
 * vive en memoria. Es la misma API, para que el resto del programa no note
 * la diferencia.
 */
async function pedirLocal(ruta, opciones = {}) {
  const [camino, consulta] = ruta.split('?');
  const params = new URLSearchParams(consulta || '');
  const cuerpo = opciones.body ? JSON.parse(opciones.body) : {};

  switch (camino) {
    case '/api/state':
      return mundoLocal.snapshot();

    case '/api/dios': {
      const r = mundoLocal.dios(cuerpo.accion, cuerpo.carga || {});
      mundoLocal._emitir();
      if (!r.ok) throw new Error(r.mensaje);
      return r;
    }

    case '/api/hablar': {
      if (!cuerpo.agenteId || !cuerpo.mensaje) throw new Error('Falta el empleado o el mensaje.');
      const r = await mundoLocal.hablar(cuerpo.agenteId, String(cuerpo.mensaje).slice(0, 600));
      return { ok: true, ...r };
    }

    case '/api/laboratorio': {
      const limite = Math.min(60, Number(params.get('limite')) || 25);
      return {
        estadisticas: cerebroLocal.resumenEstadisticas(),
        mediaTokensPrompt: cerebroLocal.mediaTokensPrompt(),
        consumo: configLocal.consumo,
        llamadas: cerebroLocal.registro.slice(-limite).reverse()
      };
    }

    case '/api/cerebro': {
      const agente = mundoLocal.agentes.find((a) => a.id === cuerpo.agenteId || a.id === params.get('agenteId'));
      if (!agente) throw new Error('Ese empleado no existe.');

      if (opciones.method === 'POST') {
        if (typeof cuerpo.personalidad === 'string' && cuerpo.personalidad.trim()) {
          agente.personalidad = cuerpo.personalidad.trim().slice(0, 2000);
        }
        if (typeof cuerpo.temperatura === 'number') {
          agente.temperatura = Math.max(0, Math.min(1.5, cuerpo.temperatura));
        }
        if (Array.isArray(cuerpo.recuerdos)) {
          agente.recuerdos = cuerpo.recuerdos.slice(-20).map((r) => String(r).slice(0, 200));
        }
        mundoLocal.registrar('sistema', `Has ajustado el cerebro de ${agente.nombre}.`);
        mundoLocal._emitir();
        return { ok: true, mensaje: 'Cerebro actualizado.' };
      }

      const { systemPrompt } = await import('./motor/reglas.js');
      return {
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
      };
    }

    case '/api/modelos':
      return { ok: true, modelos: [], simulado: true, modeloEnMemoria: 'cerebro simulado' };

    case '/api/reiniciar':
      mundoLocal.reiniciar();
      return { ok: true, mensaje: 'Partida reiniciada.' };

    default:
      throw new Error('Ruta desconocida en modo local: ' + camino);
  }
}

/** Rehace el HTML de un contenedor conservando su scroll. */
function conScroll(contenedor, fn) {
  const arriba = contenedor.scrollTop;
  fn();
  contenedor.scrollTop = arriba;
}

/* ------------------------------------------------------ estado por SSE */

function conectar() {
  // Modo local: el mundo avisa directamente, sin red de por medio.
  if (MODO_LOCAL) {
    mundoLocal.alCambiar((nuevo) => {
      estado = nuevo;
      actualizarCabecera();
      actualizarRegistro();
      actualizarPanelActivo();
      actualizarSelectores();
    });
    $('ia-punto').className = 'punto ok';
    return;
  }

  const fuente = new EventSource('/api/stream');

  fuente.addEventListener('estado', (ev) => {
    estado = JSON.parse(ev.data);
    actualizarCabecera();
    actualizarRegistro();
    actualizarPanelActivo();
    actualizarSelectores();
  });

  fuente.addEventListener('ia', (ev) => {
    const d = JSON.parse(ev.data);
    parpadearIA(d);
  });

  fuente.addEventListener('cola', () => {
    if (estado) actualizarCabeceraIA();
  });

  fuente.onerror = () => {
    $('ia-punto').className = 'punto malo';
    $('ia-texto').textContent = 'sin conexión con el juego';
  };

  fuente.onopen = () => {
    $('ia-punto').className = 'punto ok';
  };
}

let temporizadorParpadeo = null;
function parpadearIA(d) {
  const punto = $('ia-punto');
  punto.className = 'punto ocupado';
  $('ia-texto').textContent = d.ok
    ? `${d.etiqueta} · ${d.ms} ms · ${d.tokensRespuesta} tok`
    : `fallo: ${d.error || 'desconocido'}`;
  if (!d.ok) punto.className = 'punto malo';
  clearTimeout(temporizadorParpadeo);
  temporizadorParpadeo = setTimeout(actualizarCabeceraIA, 3500);
}

/* ------------------------------------------------------------- cabecera */

function actualizarCabecera() {
  if (!estado) return;
  const e = estado.empresa;

  $('hud-dia').textContent = estado.dia;
  $('hud-hora').textContent = String(estado.hora).padStart(2, '0') + ':00';

  const turno = $('hud-turno');
  turno.textContent = estado.laboral ? 'turno' : 'fuera de hora';
  turno.classList.toggle('fuera', !estado.laboral);

  $('hud-dinero').textContent = dinero(e.dinero);
  $('hud-dinero').style.color = e.dinero < 0 ? 'var(--rojo)' : '#fff';
  $('hud-reputacion').textContent = Math.round(e.reputacion);
  $('hud-calidad').textContent = Math.round(e.calidad);
  $('hud-clientes').textContent = Math.round(e.clientes);
  $('hud-precio').textContent = Math.round(e.precio) + ' €';

  $('aviso-apagon').hidden = !e.apagon;

  actualizarCabeceraIA();
  actualizarMedidorPrecio();
  actualizarCuentas();
  actualizarHabitaciones();
  pintarNavSalas();
}

function actualizarCabeceraIA() {
  if (!estado) return;
  const ia = estado.ia;
  const punto = $('ia-punto');
  const pendientes = estado.pendientesIA;

  if (pendientes > 0) {
    punto.className = 'punto ocupado';
    $('ia-texto').textContent = `pensando… (${pendientes} en cola)`;
  } else if (ia.simulado) {
    punto.className = 'punto ok';
    $('ia-texto').textContent = `${ia.llamadas} decisiones · cerebro simulado`;
  } else {
    punto.className = 'punto ok';
    $('ia-texto').textContent =
      `${ia.llamadas} llamadas · ${ia.tokensTotales.toLocaleString('es-ES')} tokens · ${ia.msMedios} ms prom.`;
  }
  if (estado.modoAhorro) $('ia-texto').textContent += ' · MODO AHORRO';
}

/* ------------------------------------------------------------- registro */

function actualizarRegistro() {
  if (!estado) return;
  const sucesos = estado.sucesos;
  const ultimo = sucesos.length ? sucesos[sucesos.length - 1].t : 0;
  if (ultimo === ultimoSucesoRender) return;

  // Sonidito cuando alguien habla: un "pi" por empleado que dice algo nuevo.
  // Se mira solo lo que ha llegado desde la ultima vez, y con un tope, para
  // que no se convierta en una traca si hablan los seis a la vez.
  const nuevos = sucesos.filter((s) => s.t > (ultimoSucesoRender || 0));
  const voces = nuevos.filter((s) => s.tipo === 'dialogo').slice(0, 3);
  voces.forEach((s, i) => {
    // Un pelin mas agudo o mas grave segun quien hable: asi no suenan igual.
    const variantes = ['pi', 'piAgudo', 'piGrave'];
    setTimeout(() => sonidos.tocar(variantes[i % variantes.length]), i * 170);
  });
  if (nuevos.some((s) => s.tipo === 'dimision' || s.tipo === 'alerta')) sonidos.tocar('error');
  if (nuevos.some((s) => s.tipo === 'reparacion')) sonidos.tocar('reparado');
  if (nuevos.some((s) => s.tipo === 'dinero')) sonidos.tocar('dia');

  ultimoSucesoRender = ultimo;

  const lista = $('registro');
  const abajo = lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 40;

  lista.innerHTML = sucesos
    .slice()
    .reverse()
    .map((s) => {
      const hora = `${String(s.dia).padStart(2, '0')}d ${String(s.hora).padStart(2, '0')}:00`;
      return `<li class="${s.tipo}"><b>${hora}</b> ${escapar(s.texto)}</li>`;
    })
    .join('');

  if (abajo) lista.scrollTop = 0;   // lo mas nuevo arriba
}

function escapar(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------------------------------------------------- panel de poderes */

function actualizarMedidorPrecio() {
  const e = estado.empresa;
  const justo = e.precioBase;
  const ratio = e.ratioPrecio;

  $('precio-justo').textContent = `precio justo: ${Math.round(justo)} €`;

  // La aguja va de 0 a 2x el precio justo.
  const pct = Math.max(0, Math.min(100, (ratio / 2) * 100));
  $('precio-aguja').style.left = pct + '%';

  // Franja verde alrededor del precio justo (0.9x a 1.15x)
  const z = $('precio-zona');
  z.style.left = (0.9 / 2 * 100) + '%';
  z.style.width = ((1.15 - 0.9) / 2 * 100) + '%';

  let nota;
  if (ratio < 0.9) nota = 'Estás regalando el producto. Entran clientes pero no el dinero.';
  else if (ratio <= 1.15) nota = 'Zona sana: cobras lo que el producto vale.';
  else if (ratio <= 1.5) nota = 'Vas caro. Ganas más por cliente, pero la reputación se resiente.';
  else nota = 'Abuso. Los clientes se van y los empleados lo van a notar.';

  $('precio-nota').textContent = nota;
  if (!sliderActivo) {
    $('precio-slider').value = Math.round(e.precio);
    $('precio-valor').textContent = Math.round(e.precio) + ' €';
  }
}

function actualizarCuentas() {
  const e = estado.empresa;
  const beneficio = e.ingresoPorDia - e.costePorDia;
  const filas = [
    ['Habitaciones', `${e.habitaciones.length} de 6`],
    ['Escritorios', `${e.empleados} ocupados de ${e.escritorios}`],
    ['Clientes potenciales', '×' + e.multiplicadorClientes.toFixed(2)],
    ['Ingresos / día (estimado)', dinero(e.ingresoPorDia), e.ingresoPorDia > 0 ? 'bien' : ''],
    ['Costes / día (nóminas + alquiler)', '−' + dinero(e.costePorDia), 'mal'],
    ['Beneficio / día', (beneficio >= 0 ? '+' : '') + dinero(beneficio), beneficio >= 0 ? 'bien' : 'mal'],
    ['Alquiler diario', dinero(e.alquilerPorDia)],
    ['Cafetera', e.tieneCafetera ? 'sí ☕' : 'no'],
    ['Antivirus', e.tieneAntivirus ? 'instalado 🛡️' : 'no']
  ];

  $('cuentas').innerHTML = filas
    .map(([k, v, clase]) => `<div class="cuenta-fila"><span class="k">${k}</span><span class="v ${clase || ''}">${v}</span></div>`)
    .join('');
}

/* ------------------------------------------------------- habitaciones */

function actualizarHabitaciones() {
  const contenedor = $('habitaciones');
  if (!contenedor || !estado) return;

  const e = estado.empresa;
  const todas = (configLocal && configLocal.habitaciones) || [];
  const compradas = e.habitaciones || [];

  contenedor.innerHTML = todas
    .map((h) => {
      const tiene = compradas.includes(h.id);
      if (tiene) {
        return `<div class="sala comprada">
          <div class="sala-cab"><strong>${escapar(h.nombre)}</strong><span class="insignia ok">en uso</span></div>
          <div class="sala-aporta">${escapar(h.aporta)}</div>
        </div>`;
      }
      const puede = e.dinero >= h.coste;
      return `<div class="sala">
        <div class="sala-cab"><strong>${escapar(h.nombre)}</strong><span class="insignia">${dinero(h.coste)}</span></div>
        <div class="sala-aporta">${escapar(h.lema)}<br><em>${escapar(h.aporta)}</em></div>
        <button class="btn ${puede ? 'bonito' : ''}" data-comprar-sala="${h.id}" ${puede ? '' : 'disabled'}>
          ${puede ? 'Comprar ' + escapar(h.nombre) : 'Te faltan ' + dinero(h.coste - e.dinero)}
        </button>
      </div>`;
    })
    .join('');
}

document.addEventListener('click', (ev) => {
  const boton = ev.target.closest('[data-comprar-sala]');
  if (!boton) return;
  enviarDios('comprar_habitacion', { habitacionId: boton.dataset.comprarSala });
});

/* --------------------------------------------------------- panel activo */

let panelActivo = 'poderes';

function actualizarPanelActivo() {
  if (panelActivo === 'empleados') actualizarEmpleados();
  if (panelActivo === 'laboratorio') actualizarLaboratorio();
  if (panelActivo === 'cerebro') actualizarCerebroVista();
}

document.querySelectorAll('.pestana').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.pestana').forEach((b) => b.classList.remove('activa'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('activo'));
    boton.classList.add('activa');
    panelActivo = boton.dataset.panel;
    $('panel-' + panelActivo).classList.add('activo');
    actualizarPanelActivo();
    if (panelActivo === 'laboratorio') cargarLaboratorio();
    if (panelActivo === 'cerebro') cargarModelos();
  });
});

function actualizarEmpleados() {
  const contenedor = $('tarjetas-empleados');
  conScroll(contenedor, () => {
    contenedor.innerHTML = estado.agentes.map(tarjetaEmpleado).join('');
  });
}

const NOMBRE_ESTADO = {
  trabajando: 'trabajando',
  pensando: 'pensando…',
  reparando: 'reparando el PC',
  limpiando: 'quitando el virus',
  bloqueado: 'PC roto, parado',
  descansando: 'descansando',
  holgazaneando: 'holgazaneando',
  cafe: 'en el café',
  quejandose: 'quejándose',
  motivado: 'motivado',
  ayudando: 'ayudando',
  sin_luz: 'sin luz',
  dimitido: 'se marchó'
};

const NOMBRE_HARDWARE = ['básico', 'bueno', 'pro'];

function tarjetaEmpleado(a) {
  const d = a.ultimaDecision;
  const clases = ['tarjeta'];
  if (a.dimitido) clases.push('dimitido');
  if (a.ordenador.roto) clases.push('roto');

  const barra = (etiqueta, valor, color) => `
    <div class="barra-fila">
      <span>${etiqueta}</span>
      <span class="barra-pista"><span class="barra-relleno" style="width:${Math.max(0, Math.min(100, valor))}%;background:${color}"></span></span>
      <span class="barra-valor">${Math.round(valor)}</span>
    </div>`;

  const colorMoral = a.moral > 66 ? 'var(--verde)' : a.moral > 33 ? 'var(--ambar)' : 'var(--rojo)';

  return `
  <div class="${clases.join(' ')}">
    <div class="tarjeta-cab">
      <div>
        <strong>${escapar(a.nombre)}</strong>
        <div class="puesto">${escapar(a.puesto)}</div>
      </div>
      <span class="estado">${NOMBRE_ESTADO[a.estado] || a.estado}</span>
    </div>
    <div class="barras">
      ${barra('moral', a.moral, colorMoral)}
      ${barra('energía', a.energia, '#4a9ede')}
      ${barra('habilidad', a.habilidad, '#9a7ae0')}
      ${barra('PC', a.ordenador.salud, a.ordenador.roto ? 'var(--rojo)' : 'var(--verde)')}
    </div>
    <div class="cuenta-fila" style="margin-bottom:7px">
      <span class="k">temperatura ${a.temperatura}</span>
      <span class="v">${escapar(a.modelo)}</span>
    </div>
    <div class="cuenta-fila" style="margin-bottom:7px">
      <span class="k">PC ${NOMBRE_HARDWARE[(a.ordenador.nivel || 1) - 1]}</span>
      <span class="v">
        ${a.ordenador.roto ? '💥 roto' : ''}
        ${a.ordenador.virus ? '🦠 con virus' : ''}
        ${!a.ordenador.roto && !a.ordenador.virus ? '✅ sano' : ''}
      </span>
    </div>
    ${a.peticionAumento ? '<div class="dicho" style="border-left-color:var(--ambar);color:#ffe2b0">Te ha pedido un aumento de sueldo.</div>' : ''}
    ${d && d.dialogo ? `<div class="dicho"><span class="rotulo">ÚLTIMA FRASE</span>${escapar(d.dialogo)}</div>` : ''}
    ${d && d.pensamiento ? `<div class="dicho pensamiento"><span class="rotulo">LO QUE PIENSA DE VERDAD</span>${escapar(d.pensamiento)}</div>` : ''}
    ${d && d.objetivo ? `<div class="dicho objetivo"><span class="rotulo">SE HA PROPUESTO</span>${escapar(d.objetivo)}</div>` : ''}
    ${d ? `<div class="cuenta-fila"><span class="k">última decisión: ${escapar(d.accion || '—')}</span><span class="v">${d.ms} ms · ${d.tokensPrompt}+${d.tokensRespuesta} tok</span></div>` : '<p class="nota">Todavía no ha tenido que pensar en nada.</p>'}
    <div class="memoria" style="margin-top:7px">
      <span class="etiqueta">MEMORIA (${a.recuerdos.length})</span>
      ${a.recuerdos.length ? '<ul>' + a.recuerdos.map((r) => `<li>${escapar(r)}</li>`).join('') + '</ul>' : '<p class="nota">Vacía.</p>'}
    </div>
  </div>`;
}

/* ------------------------------------------------------------ laboratorio */

let firmaLaboratorio = '';
let firmaMetricas = '';
let llamadasAbiertas = new Set();
let llamadasVistas = -1;

async function cargarLaboratorio() {
  try {
    const datos = await pedir('/api/laboratorio?limite=20');
    if (panelActivo !== 'laboratorio') return;
    pintarLaboratorio(datos);
  } catch (e) {
    /* silencioso: se reintenta */
  }
}

async function actualizarLaboratorio() {
  if (!estado) return;
  pintarMetricas(estado.ia);

  // Solo volvemos a pedir el registro cuando ha habido alguna llamada nueva.
  // Si no, estariamos machacando el servidor cada tick sin motivo.
  if (estado.ia.llamadas !== llamadasVistas) {
    llamadasVistas = estado.ia.llamadas;
    await cargarLaboratorio();
  }
}

function pintarMetricas(ia) {
  const sim = !!ia.simulado;
  const filas = [
    [sim ? 'Decisiones tomadas' : 'Llamadas al modelo', ia.llamadas],
    ['Fallos', ia.fallos],
    [sim ? 'Tokens (estimados)' : 'Tokens de prompt', ia.tokensPrompt.toLocaleString('es-ES')],
    [sim ? 'Tokens de salida (est.)' : 'Tokens generados', ia.tokensRespuesta.toLocaleString('es-ES')],
    ['Latencia media', ia.msMedios + ' ms'],
    [sim ? 'Cambios de modelo' : 'Cambios de modelo', ia.cambiosDeModelo]
  ];

  const firma = filas.map((f) => f[1]).join('|');
  if (firma === firmaMetricas) return;
  firmaMetricas = firma;

  $('lab-metricas').innerHTML = filas
    .map(([k, v]) => `<div class="metrica"><span class="etiqueta">${k}</span><strong>${v}</strong></div>`)
    .join('');
}

function pintarLaboratorio(datos) {
  pintarMetricas(datos.estadisticas);

  // Si la lista de llamadas no ha cambiado, NO tocamos el DOM: si lo
  // rehicieramos, se cerrarian las llamadas que el jugador acaba de desplegar
  // y no podria leer el prompt.
  const firma = datos.llamadas.map((c) => c.id).join(',');
  if (firma === firmaLaboratorio) return;
  firmaLaboratorio = firma;

  const contenedor = $('lab-llamadas');
  conScroll(contenedor, () => {
    contenedor.innerHTML = datos.llamadas.map(llamadaHtml).join('');
  });
}

function llamadaHtml(c) {
  const estado = c.ok ? '<span class="insignia ok">ok</span>' : '<span class="insignia malo">fallo</span>';
  const sim = c.simulado ? '<span class="insignia sim">SIMULADO</span>' : '';
  const carga = c.cambioDeModelo ? '<span class="insignia carga">cargó modelo</span>' : '';
  const esquema = c.esquema ? '<span class="insignia">JSON forzado</span>' : '';
  const abierta = llamadasAbiertas.has(c.id) ? 'abierta' : '';

  const mensajes = (c.mensajes || [])
    .map((m) => `<span class="rol">### ${m.role}</span>\n${escapar(m.content)}`)
    .join('\n\n');

  return `
  <div class="llamada ${c.ok ? '' : 'fallo'} ${abierta}" data-id="${c.id}">
    <div class="llamada-cab">
      ${estado} ${sim} ${carga} ${esquema}
      <span class="quien">${escapar(c.etiqueta)}</span>
      <span class="meta">${c.ms} ms · ${c.tokensPrompt}+${c.tokensRespuesta} tok · T=${c.temperatura}</span>
    </div>
    <div class="llamada-cuerpo">
      <p class="nota">Esto es lo que ${c.simulado ? 'SE LE HABRÍA MANDADO a un modelo real' : 'recibió el modelo'} (${c.modelo}):</p>
      <pre class="prompt-crudo">${mensajes}</pre>
      <p class="nota">Y esto es lo que ${c.simulado ? 'decidió el cerebro simulado' : 'devolvió el modelo'}, en crudo:</p>
      <pre class="prompt-crudo">${escapar(c.respuesta || c.error || '(vacío)')}</pre>
    </div>
  </div>`;
}

document.addEventListener('click', (ev) => {
  const cab = ev.target.closest('.llamada-cab');
  if (!cab) return;
  const caja = cab.parentElement;
  const id = Number(caja.dataset.id);
  caja.classList.toggle('abierta');
  if (caja.classList.contains('abierta')) llamadasAbiertas.add(id);
  else llamadasAbiertas.delete(id);
});

/* --------------------------------------------------------------- cerebro */

async function cargarModelos() {
  if (MODO_LOCAL) return;              // no hay modelos que elegir
  if (modelosCargados.length) return;
  try {
    const datos = await pedir('/api/modelos');
    modelosCargados = datos.modelos || [];
    const sel = $('cerebro-modelo');
    sel.innerHTML = modelosCargados
      .map((m) => {
        const roto = m.conocido && m.conocido.roto;
        const nota = m.conocido ? (m.conocido.recomendado ? '  (recomendado)' : '') : '';
        return `<option value="${m.id}" ${roto ? 'disabled' : ''}>${m.id}${nota}${roto ? '  [ROTO]' : ''}</option>`;
      })
      .join('');
  } catch (e) {
    $('cerebro-modelo').innerHTML = '<option>No disponible</option>';
  }
}

async function actualizarCerebroVista() {
  const sel = $('cerebro-select');
  if (!sel.options.length && estado) {
    sel.innerHTML = estado.agentes.map((a) => `<option value="${a.id}">${escapar(a.nombre)}</option>`).join('');
    sel.value = charlaCon || estado.agentes[0].id;
  }
  await cargarCerebro(sel.value);
}

async function cargarCerebro(id) {
  if (!id) return;
  try {
    const d = await pedir('/api/cerebro?agenteId=' + encodeURIComponent(id));
    $('cerebro-personalidad').value = d.personalidad;
    $('cerebro-temp').value = d.temperatura;
    $('cerebro-temp-valor').textContent = Number(d.temperatura).toFixed(2);
    $('cerebro-modelo').value = d.modelo;
    $('cerebro-prompt').textContent = d.systemPrompt;
    $('cerebro-memoria').innerHTML = d.recuerdos.length
      ? '<ul>' + d.recuerdos.map((r) => `<li>${escapar(r)}</li>`).join('') + '</ul>'
      : '<p class="nota">Todavía no recuerda nada.</p>';
    actualizarAvisoModelo();
  } catch (e) {
    brindis(e.message, true);
  }
}

function actualizarAvisoModelo() {
  const elegido = $('cerebro-modelo').value;
  const cargado = estado && estado.ia ? estado.ia.modeloEnMemoria : null;
  $('cerebro-aviso-modelo').textContent =
    cargado && elegido && elegido !== cargado
      ? `· cambiará de modelo (recarga de ~8 s)`
      : '';
}

$('cerebro-select').addEventListener('change', (e) => cargarCerebro(e.target.value));
$('cerebro-modelo').addEventListener('change', actualizarAvisoModelo);
$('cerebro-temp').addEventListener('input', (e) => {
  $('cerebro-temp-valor').textContent = Number(e.target.value).toFixed(2);
});
$('cerebro-ver').addEventListener('click', () => {
  const pre = $('cerebro-prompt');
  pre.hidden = !pre.hidden;
});
$('cerebro-guardar').addEventListener('click', async () => {
  try {
    await pedir('/api/cerebro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agenteId: $('cerebro-select').value,
        personalidad: $('cerebro-personalidad').value,
        temperatura: Number($('cerebro-temp').value),
        modelo: $('cerebro-modelo').value
      })
    });
    brindis('Cerebro actualizado. Habla con él para ver el cambio.');
  } catch (e) {
    brindis(e.message, true);
  }
});

/* ------------------------------------------- cerebro del movil (IA real) */

/**
 * En el movil se puede elegir entre DOS cerebros:
 *
 *   - simulado: reglas y frases escritas a mano. Instantaneo y sin descargas.
 *   - onnx:     un modelo de verdad ejecutandose DENTRO del telefono.
 *
 * El motor del juego no nota la diferencia: solo pide decisiones y le da igual
 * quien las tome. Por eso cambiar de uno a otro es tan simple como reemplazar
 * `mundoLocal.cerebro`.
 */
let cerebroONNX = null;
let catalogoIA = [];
let cerebroElegido = 'simulado';

try {
  cerebroElegido = localStorage.getItem('pixelsoft.cerebro') || 'simulado';
} catch (_) { /* navegacion privada: no pasa nada */ }

function guardarEleccionCerebro(tipo) {
  cerebroElegido = tipo;
  try { localStorage.setItem('pixelsoft.cerebro', tipo); } catch (_) { /* da igual */ }
}

function pintarCerebroActual() {
  const texto = $('cerebro-actual');
  if (!texto) return;
  if (cerebroElegido === 'onnx') {
    const m = catalogoIA.find((x) => x.id === (cerebroONNX && cerebroONNX.modeloElegido));
    texto.innerHTML = `Ahora mismo: <strong>IA real en el móvil</strong>` +
      (m ? ` (${escapar(m.nombre)})` : '') + '. Tarda unos segundos por decisión.';
  } else {
    texto.innerHTML = 'Ahora mismo: <strong>cerebro simulado</strong>. Instantáneo y sin descargas.';
  }
}

async function cargarCatalogoIA() {
  const sel = $('ia-modelo');
  if (!sel || sel.options.length) return;
  try {
    const modulo = await import('./motor/cerebro-onnx.js');
    catalogoIA = modulo.MODELOS;
    sel.innerHTML = catalogoIA
      .map((m) => `<option value="${m.id}">${escapar(m.nombre)} · ~${m.mb} MB${m.recomendado ? '  (recomendado)' : ''}</option>`)
      .join('');
    sel.addEventListener('change', actualizarNotaModelo);
    actualizarNotaModelo();
  } catch (e) {
    $('ia-estado').textContent = 'No he podido cargar la lista de modelos: ' + e.message;
  }
}

function actualizarNotaModelo() {
  const sel = $('ia-modelo');
  if (!sel) return;
  const m = catalogoIA.find((x) => x.id === sel.value);
  $('ia-nota').textContent = m ? m.nota : '';
}

/** Pinta el estado de la descarga/carga segun lo que diga el cerebro. */
function pintarEstadoIA(info) {
  const caja = $('ia-progreso-caja');
  const barra = $('ia-progreso');
  const detalle = $('ia-detalle');
  const estado = $('ia-estado');
  if (!caja || !info) return;

  const enMarcha = info.estado === 'descargando' || info.estado === 'cargando';
  caja.hidden = !enMarcha && info.estado !== 'error';

  if (barra) barra.style.width = Math.max(0, Math.min(100, info.progreso || 0)) + '%';
  if (detalle) detalle.textContent = info.detalle || info.mensaje || '';

  if (info.estado === 'listo') {
    estado.textContent = `✅ IA lista (${info.dispositivo === 'webgpu' ? 'acelerada por GPU' : 'en el procesador'}). ` +
      'Los empleados ya piensan con el modelo de verdad.';
  } else if (info.estado === 'error') {
    estado.textContent = '❌ ' + (info.error || 'No he podido preparar la IA.');
  } else if (enMarcha) {
    estado.textContent = `${info.mensaje} ${info.progreso || 0}%`;
  } else {
    estado.textContent = info.mensaje || '';
  }
}

/** Descarga (si hace falta) y activa la IA real dentro del telefono. */
async function prepararIA() {
  const boton = $('ia-preparar');
  const modelo = $('ia-modelo') && $('ia-modelo').value;
  if (!modelo) return;

  boton.disabled = true;
  try {
    if (!cerebroONNX) {
      const { CerebroONNX } = await import('./motor/cerebro-onnx.js');
      cerebroONNX = new CerebroONNX();
      cerebroONNX.alProgresar(pintarEstadoIA);
    }

    pintarEstadoIA(cerebroONNX.info());
    const bien = await cerebroONNX.preparar(modelo);
    pintarEstadoIA(cerebroONNX.info());

    if (bien && mundoLocal) {
      mundoLocal.cerebro = cerebroONNX;
      try { localStorage.setItem('pixelsoft.modelo', modelo); } catch (_) { /* da igual */ }
      mundoLocal.registrar('sistema', `La IA del movil esta lista (${modelo}). Los empleados ya piensan con un modelo de verdad.`);
      mundoLocal._emitir();
      guardarEleccionCerebro('onnx');
      pintarCerebroActual();
      ajustarCintaLocal();
      brindis('IA lista. Dale a un poder de dios y mira cómo reaccionan.');
    }
  } catch (e) {
    $('ia-estado').textContent = '❌ ' + e.message;
  } finally {
    boton.disabled = false;
  }
}

/** Vuelve al cerebro simulado y suelta el modelo de la memoria. */
async function liberarIA() {
  if (cerebroONNX) await cerebroONNX.descargar();
  if (mundoLocal) {
    const { CerebroSimulado } = await import('./motor/cerebro-simulado.js');
    mundoLocal.cerebro = cerebroSimuladoLocal || new CerebroSimulado();
    mundoLocal._emitir();
  }
  guardarEleccionCerebro('simulado');
  pintarCerebroActual();
  ajustarCintaLocal();
  $('ia-estado').textContent = 'Modelo liberado. Sigue descargado en el telefono: volver a activarlo es instantaneo.';
}

document.querySelectorAll('[data-cerebro]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const tipo = boton.dataset.cerebro;
    $('ia-movil').hidden = tipo !== 'onnx';
    if (tipo === 'onnx') {
      await cargarCatalogoIA();
      if (cerebroONNX && cerebroONNX.listo) {
        // Ya estaba descargado: se activa sin volver a bajar nada.
        mundoLocal.cerebro = cerebroONNX;
        guardarEleccionCerebro('onnx');
        pintarCerebroActual();
        ajustarCintaLocal();
        pintarEstadoIA(cerebroONNX.info());
        mundoLocal._emitir();
      }
    } else {
      await liberarIA();
    }
  });
});

$('ia-preparar') && $('ia-preparar').addEventListener('click', prepararIA);
$('ia-liberar') && $('ia-liberar').addEventListener('click', liberarIA);

/* -------------------------------------------------------- poderes de dios */

async function enviarDios(accion, carga = {}, silencioso = false) {
  try {
    const r = await pedir('/api/dios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, carga })
    });
    if (!silencioso) brindis(r.mensaje);
    sonidos.tocar(SONIDO_PODER[accion] || 'clic');
    return r;
  } catch (e) {
    brindis(e.message, true);
    sonidos.tocar('error');
    return null;
  }
}

/* --------------------------------------------------------------- sonido */

// Cualquier boton de la interfaz hace su clic. Se hace aqui, en un solo sitio,
// en vez de ir boton por boton.
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.btn, .chip, .chip-sala, .pestana, .zoom-btn, .btn-sonido')) return;
  despertarSonido();
  // Los poderes ya suenan con lo suyo, asi que aqui solo los botones normales.
  if (ev.target.closest('[data-dios]')) return;
  sonidos.tocar('clic');
}, true);

const botonSonido = $('btn-sonido');
function pintarBotonSonido() {
  if (!botonSonido) return;
  botonSonido.textContent = sonidos.activo ? '🔊' : '🔇';
  botonSonido.classList.toggle('apagado', !sonidos.activo);
  botonSonido.title = sonidos.activo ? 'Apagar los sonidos' : 'Encender los sonidos';
}
if (botonSonido) {
  botonSonido.addEventListener('click', () => {
    sonidos.activar(!sonidos.activo);
    pintarBotonSonido();
    if (sonidos.activo) sonidos.tocar('pi');
  });
  pintarBotonSonido();
}

let sliderActivo = false;
const slider = $('precio-slider');

slider.addEventListener('pointerdown', () => { sliderActivo = true; });
slider.addEventListener('input', () => {
  $('precio-valor').textContent = slider.value + ' €';
});
slider.addEventListener('change', async () => {
  sliderActivo = false;
  await enviarDios('precio', { valor: Number(slider.value) });
});

document.querySelectorAll('[data-dios]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const accion = boton.dataset.dios;
    const necesitaAgente = boton.dataset.requiereAgente === '1';

    if (necesitaAgente && !objetivo) {
      brindis('Elige antes un empleado abajo del todo.', true);
      return;
    }

    const carga = {};
    if (necesitaAgente) carga.agenteId = objetivo;
    if (accion === 'bono') carga.cantidad = 50;

    await enviarDios(accion, carga);
  });
});

/* --------------------------------------------------------------- charla */

function pintarDestinos() {
  const contenedor = $('charla-destinos');
  contenedor.innerHTML = estado.agentes
    .map((a) => `<button class="chip ${a.id === charlaCon ? 'activo' : ''} ${a.dimitido ? 'dimitido' : ''}" data-charla="${a.id}" ${a.dimitido ? 'disabled' : ''}>${escapar(a.nombre)}</button>`)
    .join('');
}

function pintarHilo() {
  const contenedor = $('charla-hilo');
  if (!charlaCon) {
    contenedor.innerHTML = '<p class="vacio">Elige a quién le hablas y escribe abajo.</p>';
    return;
  }
  const hilo = hilos.get(charlaCon) || [];
  if (!hilo.length) {
    contenedor.innerHTML = '<p class="vacio">Todavía no le has dicho nada. Prueba: «¿cómo va todo?»</p>';
    return;
  }
  contenedor.innerHTML = hilo
    .map((t) => `<div class="turno ${t.rol}"><span class="quien">${t.rol === 'jefe' ? 'TÚ' : escapar(nombreDe(t.agenteId))}</span><span class="texto">${escapar(t.texto)}</span></div>`)
    .join('');
  contenedor.scrollTop = contenedor.scrollHeight;
}

function nombreDe(id) {
  const a = estado && estado.agentes.find((x) => x.id === id);
  return a ? a.nombre : id;
}

document.addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-charla]');
  if (!chip) return;
  charlaCon = chip.dataset.charla;
  objetivo = charlaCon;
  $('objetivo-select').value = charlaCon;
  pintarDestinos();
  pintarHilo();
});

async function enviarCharla() {
  const entrada = $('charla-texto');
  const texto = entrada.value.trim();
  if (!texto) return;
  if (!charlaCon) {
    brindis('Elige antes con quién hablas.', true);
    return;
  }

  const hilo = hilos.get(charlaCon) || [];
  hilo.push({ rol: 'jefe', texto });
  hilos.set(charlaCon, hilo);
  entrada.value = '';
  pintarHilo();

  const contenedor = $('charla-hilo');
  const espera = document.createElement('div');
  espera.className = 'turno agente';
  espera.innerHTML = `<span class="quien">${escapar(nombreDe(charlaCon))}</span><span class="pensando">está pensando… (el modelo tarda unos segundos)</span>`;
  contenedor.appendChild(espera);
  contenedor.scrollTop = contenedor.scrollHeight;

  const agenteId = charlaCon;
  try {
    const r = await pedir('/api/hablar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agenteId, mensaje: texto })
    });
    const h = hilos.get(agenteId) || [];
    h.push({ rol: 'agente', texto: r.dialogo, agenteId });
    hilos.set(agenteId, h);
  } catch (e) {
    const h = hilos.get(agenteId) || [];
    h.push({ rol: 'agente', texto: '(no ha podido responder: ' + e.message + ')', agenteId });
    hilos.set(agenteId, h);
  }
  pintarHilo();
  if (panelActivo === 'empleados') actualizarEmpleados();
}

$('charla-enviar').addEventListener('click', enviarCharla);
$('charla-texto').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') enviarCharla();
});

/* ------------------------------------------------------------ selectores */

function actualizarSelectores() {
  if (!estado) return;

  const sel = $('objetivo-select');
  const antes = sel.value;
  sel.innerHTML = estado.agentes
    .map((a) => `<option value="${a.id}" ${a.dimitido ? 'disabled' : ''}>${escapar(a.nombre)}${a.dimitido ? ' (se marchó)' : ''}</option>`)
    .join('');
  if (antes) sel.value = antes;
  if (!objetivo) objetivo = sel.value;

  if (!charlaCon && estado.agentes.length) charlaCon = estado.agentes[0].id;
  pintarDestinos();
}

$('objetivo-select').addEventListener('change', (e) => {
  objetivo = e.target.value;
});

/* ------------------------------------------------- zoom en el movil */

/**
 * En un movil, la oficina entera son unos 9 px por personaje: no se ve nada.
 * Asi que por defecto se acerca (el lienzo se hace mas ancho que la pantalla)
 * y se puede arrastrar en horizontal. Al elegir a alguien, se centra en el.
 */
const cajaLienzo = $('lienzo-caja');
const botonZoom = $('zoom-btn');
const esMovil = () => window.matchMedia('(max-width: 760px)').matches;

function ponerZoom(activo) {
  cajaLienzo.classList.toggle('zoom', activo);
  botonZoom.classList.toggle('activo', activo);
  botonZoom.title = activo ? 'Alejar (ver toda la oficina)' : 'Acercar (ver a los empleados)';
}

if (esMovil()) ponerZoom(true);

botonZoom.addEventListener('click', () => {
  ponerZoom(!cajaLienzo.classList.contains('zoom'));
});

/** Deja al empleado elegido en el centro de la vista. */
function centrarEnEmpleado(id) {
  if (!renderizador || !cajaLienzo.classList.contains('zoom') || !estado) return;
  const v = renderizador.visual.get(id);
  if (!v) return;
  const rect = lienzo.getBoundingClientRect();
  if (!rect.width) return;
  const x = v.x * 2 * (rect.width / lienzo.width);
  cajaLienzo.scrollLeft = Math.max(0, x - cajaLienzo.clientWidth / 2);
}

/* ------------------------------------------- navegador de habitaciones */

/**
 * Con seis habitaciones y el zoom puesto, en un movil solo se ve un trozo.
 * Arrastrar el dedo a ciegas para encontrar a alguien es incomodisimo, asi que
 * se ponen botones para saltar directamente a cada sala comprada.
 */
function pintarNavSalas() {
  const cont = $('salas-nav');
  if (!cont || !estado) return;

  const todas = (configLocal && configLocal.habitaciones) || [];
  const compradas = estado.empresa.habitaciones || [];
  const firma = compradas.join(',');

  // No rehacer el DOM en cada tick: se perderia el scroll del propio navegador.
  if (cont.dataset.firma === firma) return;
  cont.dataset.firma = firma;

  cont.innerHTML = todas
    .filter((h) => compradas.includes(h.id))
    .map((h) => `<button class="chip-sala" data-sala="${h.id}">${escapar(h.nombre)}</button>`)
    .join('');
}

/** Lleva la vista a una habitacion concreta. */
function centrarEnSala(id) {
  if (!renderizador || !configLocal || !estado) return;
  const sala = (configLocal.habitaciones || []).find((h) => h.id === id);
  if (!sala) return;

  // Si no hay zoom, ya se ve toda la oficina: no hay nada que mover.
  if (!cajaLienzo.classList.contains('zoom')) return;

  const rect = lienzo.getBoundingClientRect();
  if (!rect.width) return;

  // Centro de la sala, de casillas a pixeles de pantalla.
  const centroMundo = (sala.x + sala.ancho / 2) * S.TAM;
  const x = centroMundo * 2 * (rect.width / lienzo.width);
  cajaLienzo.scrollLeft = Math.max(0, x - cajaLienzo.clientWidth / 2);

  document.querySelectorAll('.chip-sala').forEach((b) => b.classList.toggle('activa', b.dataset.sala === id));
}

document.addEventListener('click', (ev) => {
  const boton = ev.target.closest('[data-sala]');
  if (boton) centrarEnSala(boton.dataset.sala);
});

/* ------------------------------------------------- clic en un personaje */

lienzo.addEventListener('click', (ev) => {
  if (!renderizador || !estado) return;
  const rect = lienzo.getBoundingClientRect();
  // Convertir coordenadas de pantalla a coordenadas de mundo del canvas.
  const x = (ev.clientX - rect.left) / rect.width * (lienzo.width / 2);
  const y = (ev.clientY - rect.top) / rect.height * (lienzo.height / 2);

  let elegido = null;
  let mejor = 1000;
  for (const a of estado.agentes) {
    const v = renderizador.visual.get(a.id);
    if (!v) continue;
    const d = Math.hypot(v.x - x, v.y - 20 - y);
    if (d < 28 && d < mejor) {
      mejor = d;
      elegido = a;
    }
  }
  if (elegido) {
    objetivo = elegido.id;
    charlaCon = elegido.id;
    $('objetivo-select').value = elegido.id;
    pintarDestinos();
    pintarHilo();
    centrarEnEmpleado(elegido.id);

    // En el PC, ademas, se abre su ficha. En el movil NO: cambiaria de panel y
    // te sacaria de la oficina justo cuando acabas de tocar a alguien.
    if (!esMovil()) {
      document.querySelector('.pestana[data-panel="empleados"]').click();
    }
    brindis(`Has seleccionado a ${elegido.nombre}.`);
  }
});

/* ------------------------------------------------- bucle de dibujo */

let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(100, ahora - ultimo);
  ultimo = ahora;
  if (estado && renderizador) {
    renderizador.dibujar(estado, dt);
  }
  requestAnimationFrame(bucle);
}

/* ------------------------------------------------------------ arranque */

async function iniciar() {
  // El config hace falta SIEMPRE, tambien con servidor: el renderizador
  // necesita saber donde esta cada habitacion del plano.
  try {
    const res = await fetch('config.json');
    configLocal = await res.json();
  } catch (e) {
    brindis('No he podido leer config.json: ' + e.message, true);
  }

  renderizador = new Renderizador(lienzo, configLocal);

  if (MODO_LOCAL) {
    await iniciarLocal();
  } else {
    try {
      estado = await pedir('/api/state');
      actualizarCabecera();
      actualizarRegistro();
      actualizarSelectores();
      actualizarCuentas();
      if (panelActivo === 'empleados') actualizarEmpleados();
    } catch (e) {
      // No hay servidor al otro lado (es el APK, o alguien ha abierto el HTML
      // desde un sitio sin backend). En vez de dejar la pantalla en blanco,
      // el juego se arranca aqui mismo con el cerebro simulado.
      MODO_LOCAL = true;
      console.info('Sin servidor: arrancando en modo autonomo.', e.message);
      await iniciarLocal();
    }
  }
  conectar();
  requestAnimationFrame(bucle);
  setInterval(() => {
    if (panelActivo === 'laboratorio') cargarLaboratorio();
  }, 6000);
}

/** Arranca el juego entero dentro del navegador, sin servidor. */
async function iniciarLocal() {
  try {
    const [{ Mundo }, { CerebroSimulado }] = await Promise.all([
      import('./motor/mundo.js'),
      import('./motor/cerebro-simulado.js')
    ]);

    // El config ya se ha leido en iniciar().
    cerebroLocal = new CerebroSimulado();
    cerebroSimuladoLocal = cerebroLocal;
    mundoLocal = new Mundo(configLocal, cerebroLocal);
    mundoLocal.iniciar();

    estado = mundoLocal.snapshot();
    ajustarInterfazLocal();

    // Si la ultima vez eligio la IA del movil, se intenta reactivar sola
    // (el modelo ya esta descargado, asi que es instantaneo).
    if (cerebroElegido === 'onnx') {
      try {
        const { CerebroONNX } = await import('./motor/cerebro-onnx.js');
        cerebroONNX = new CerebroONNX();
        cerebroONNX.alProgresar(pintarEstadoIA);
        const bien = await cerebroONNX.preparar(localStorage.getItem('pixelsoft.modelo') || undefined);
        if (bien) {
          mundoLocal.cerebro = cerebroONNX;
          estado = mundoLocal.snapshot();
        } else {
          guardarEleccionCerebro('simulado');
        }
      } catch (_) {
        guardarEleccionCerebro('simulado');
      }
    }
    pintarCerebroActual();
    ajustarCintaLocal();

    // Gancho de depuracion: permite trastear la partida desde la consola del
    // navegador (o desde las pruebas automaticas). No afecta al juego.
    window.__pixelsoft = {
      mundo: () => mundoLocal,
      cerebro: () => cerebroLocal,
      estado: () => estado
    };

    actualizarCabecera();
    actualizarRegistro();
    actualizarSelectores();
    actualizarCuentas();
  } catch (e) {
    brindis('No he podido arrancar el juego: ' + e.message, true);
    console.error(e);
  }
}

/** La cinta de arriba dice con que cerebro estan pensando ahora mismo. */
function ajustarCintaLocal() {
  const cinta = $('cinta-local');
  if (!cinta) return;
  if (cerebroElegido === 'onnx' && cerebroONNX && cerebroONNX.listo) {
    cinta.innerHTML = '🧠 Modo autónomo · los empleados piensan con una <strong>IA de verdad dentro del teléfono</strong>';
  } else {
    cinta.innerHTML = '🧠 Modo autónomo · los empleados reaccionan con un <strong>cerebro simulado</strong>, no con un modelo real';
  }
}

/** En modo local hay cosas que no aplican: no hay modelo ni servidor. */
function ajustarInterfazLocal() {
  document.body.classList.add('modo-local');
  const cinta = $('cinta-local');
  if (cinta) cinta.hidden = false;

  // El selector de modelo no tiene sentido: no hay modelos que elegir.
  const campoModelo = $('cerebro-modelo') && $('cerebro-modelo').closest('.campo');
  if (campoModelo) campoModelo.hidden = true;

  const intro = $('intro-poderes');
  if (intro) {
    intro.innerHTML = 'Eres el jefe. Estás jugando <strong>sin PC</strong>: los empleados ' +
      'reaccionan con un <strong>cerebro simulado</strong> (reglas y frases escritas a mano), ' +
      'no con un modelo de verdad. Aun así todo lo demás funciona igual.';
  }

  const introLab = $('intro-laboratorio');
  if (introLab) {
    introLab.innerHTML = 'Aquí ves <strong>qué se le habría mandado</strong> a un modelo real y ' +
      'qué ha decidido el cerebro simulado en su lugar. Es la misma estructura: ' +
      'un texto entra, un JSON sale.';
  }
}

iniciar();
