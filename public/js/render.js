/* =====================================================================
   RENDER  ·  Pinta la oficina en un canvas 2D.

   La oficina son seis HABITACIONES en una rejilla de 3x2. Al principio solo
   esta comprada la zona de trabajo; las demas salen a oscuras con un
   candado, y se van abriendo cuando el jefe las compra.

   No hay muros entre habitaciones a proposito: cada una tiene su suelo y su
   mobiliario, y entre ellas hay una franja de pasillo. Asi los personajes
   pueden caminar de una a otra sin necesidad de calcular rutas (que seria
   mucho mas complicado y no aporta nada al juego).

   Clave del dibujo: cada cosa tiene una PROFUNDIDAD (su borde inferior).
   Se ordenan todas por profundidad y se pintan de atras hacia delante.
   ===================================================================== */

import * as S from './sprites.js';

export const COLS = 30;
export const FILAS = 20;
const ESCALA = 2;
const LADO = 10;          // cada habitacion mide 10x10 casillas

/** Suelo de cada habitacion. Cada una tiene su tono para distinguirse. */
const SUELO_HABITACION = {
  trabajo: ['#4a5a72', '#455468'],
  descanso: ['#5c4a72', '#554468'],
  servidores: ['#3e4a58', '#394450'],
  ampliacion: ['#4a5a72', '#455468'],
  reuniones: ['#5a5240', '#544c3b'],
  cocina: ['#5c5a48', '#555344']
};

/** Puestos de trabajo, en orden. Los tres primeros son de la zona de trabajo
 *  y los tres siguientes del ala ampliada. */
const ESCRITORIOS = [
  { mx: 3, my: 2 }, { mx: 6, my: 2 }, { mx: 3, my: 5 },
  { mx: 3, my: 12 }, { mx: 6, my: 12 }, { mx: 3, my: 15 }
];

/** A que habitacion pertenece cada escritorio. */
const HABITACION_ESCRITORIO = ['trabajo', 'trabajo', 'trabajo', 'ampliacion', 'ampliacion', 'ampliacion'];

/** Donde se puede ir un empleado. `sala` = habitacion que tiene que estar comprada. */
const SITIOS = {
  cafetera: { x: 16.5, y: 3, sala: 'descanso' },
  sofa: { x: 13.5, y: 5, sala: 'descanso' },
  fuente: { x: 12.5, y: 2, sala: 'descanso' },
  planta: { x: 11.5, y: 8, sala: 'descanso' },
  pizarra: { x: 14.5, y: 15, sala: 'reuniones' },
  nevera: { x: 22.5, y: 12, sala: 'cocina' },
  rack: { x: 24.5, y: 3, sala: 'servidores' },
  pasillo: { x: 14.5, y: 9.5, sala: null }
};

/** Que mobiliario se dibuja en cada habitacion. */
const MOBILIARIO = {
  descanso: (ctx, t) => {
    S.dibujarAlfombra(ctx, 12, 4, 5, 3);
    S.dibujarSofa(ctx, 12, 2);
    S.dibujarCafetera(ctx, 16, 2, true);
    S.dibujarFuente(ctx, 11, 5);
    S.dibujarPlanta(ctx, 10, 8, 0);
    S.dibujarPlanta(ctx, 18, 8, 2);
    S.dibujarEstanteria(ctx, 18, 1);
  },
  servidores: (ctx, t) => {
    S.dibujarRack(ctx, 22, 2, t);
    S.dibujarRack(ctx, 24, 2, t + 400);
    S.dibujarRack(ctx, 22, 6, t + 800);
    S.dibujarRack(ctx, 26, 5, t + 1200);
    S.dibujarImpresora(ctx, 27, 1);
    S.dibujarEstanteria(ctx, 20, 8);
  },
  reuniones: (ctx, t) => {
    S.dibujarMesaReunion(ctx, 13, 13);
    S.dibujarPizarra(ctx, 15, 12);
    S.dibujarPlanta(ctx, 10, 18, 1);
    S.dibujarPlanta(ctx, 18, 18, 3);
  },
  cocina: (ctx, t) => {
    S.dibujarCocina(ctx, 22, 12);
    S.dibujarImpresora(ctx, 26, 16);
    S.dibujarPlanta(ctx, 20, 18, 2);
    S.dibujarPlanta(ctx, 28, 11, 1);
  },
  trabajo: null,
  ampliacion: null
};

/** Color de la pantalla segun lo que hace el empleado. */
function colorPantalla(estado) {
  switch (estado) {
    case 'trabajando': return '#3fbf6f';
    case 'pensando': return '#4aa8e0';
    case 'reparando': return '#e0a83a';
    case 'limpiando': return '#a8e04a';
    case 'bloqueado': return '#c0453a';
    case 'holgazaneando': return '#8a8a5a';
    case 'quejandose': return '#c0773a';
    case 'ayudando': return '#5ad0c0';
    default: return '#14171d';
  }
}

const ENCENDIDA = ['trabajando', 'pensando', 'reparando', 'limpiando', 'bloqueado', 'holgazaneando', 'quejandose', 'ayudando'];

/** Que emoticono le sale por encima de la cabeza. */
function emoteDe(agente) {
  if (agente.dimitido) return null;
  if (agente.ordenador && agente.ordenador.virus) return 'virus';
  if (agente.estado === 'limpiando' || agente.estado === 'reparando') return 'idea';
  if (agente.estado === 'descansando') return 'dormido';
  if (agente.estado === 'quejandose') return 'enfadado';
  if (agente.moral < 25) return 'enfadado';
  if (agente.moral > 82) return 'amor';
  if (agente.estado === 'motivado') return 'feliz';
  if (agente.energia < 18) return 'triste';
  return null;
}

export class Renderizador {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} config  El config.json, para saber donde va cada habitacion
   */
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = COLS * S.TAM * ESCALA;
    canvas.height = FILAS * S.TAM * ESCALA;

    /**
     * Cuantos pixeles de canvas mide una casilla del mundo. Empieza valiendo
     * ESCALA, pero `ajustarTamano()` lo recalcula segun lo que se vea en
     * pantalla. Puede ser decimal: todo el dibujo son rectangulos, no imagenes,
     * asi que aguanta bien cualquier escala.
     */
    this.escala = ESCALA;

    this.ctx.imageSmoothingEnabled = false;

    this.habitaciones = (config && config.habitaciones) || [
      { id: 'trabajo', nombre: 'Zona de trabajo', x: 0, y: 0, ancho: 10, alto: 10 }
    ];

    this.visual = new Map();
    this.frames = new Map();
    this.t = 0;
    this.ambiente = null;
    this._ultimoTamano = '';
  }

  /**
   * Dimensiona el canvas a los pixeles que ocupa DE VERDAD en pantalla.
   *
   * Esto era el culpable de que el texto se viera borroso. Antes el canvas
   * media siempre 1920x1280 y el navegador lo encogia para que cupiera en su
   * hueco: al encogerlo, los carteles de los nombres y los bocadillos, que van
   * dibujados DENTRO del canvas, acababan hechos papilla. En Windows porque el
   * hueco es mas estrecho que 1920, y en el movil mucho peor.
   *
   * Ahora el canvas mide justo lo que ocupa (multiplicado por la densidad de
   * pantalla), asi que cada pixel del canvas cae en un pixel fisico y el texto
   * sale nitido.
   */
  ajustarTamano() {
    const caja = this.canvas.parentElement;
    if (!caja) return;

    const estilo = getComputedStyle(caja);
    const anchoHueco = caja.clientWidth
      - parseFloat(estilo.paddingLeft || 0) - parseFloat(estilo.paddingRight || 0);
    const altoHueco = caja.clientHeight
      - parseFloat(estilo.paddingTop || 0) - parseFloat(estilo.paddingBottom || 0);
    if (anchoHueco <= 0 || altoHueco <= 0) return;

    // Con el zoom puesto el lienzo es mas ancho que su hueco, a proposito:
    // entonces se arrastra con el dedo.
    const factor = caja.classList.contains('zoom') ? 1.95 : 1;

    // Que quepa por los dos lados, sin deformar la proporcion de la oficina.
    let anchoCss = Math.min(anchoHueco, altoHueco * (COLS / FILAS)) * factor;
    anchoCss = Math.max(320, anchoCss);

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const ancho = Math.round(anchoCss * dpr);
    const alto = Math.round(ancho * (FILAS / COLS));

    const firma = `${ancho}x${alto}`;
    if (this._ultimoTamano === firma) return;
    this._ultimoTamano = firma;

    this.canvas.width = ancho;
    this.canvas.height = alto;
    this.escala = ancho / (COLS * S.TAM);
    // Al cambiar el tamano hay que volver a apagarlo: se reinicia solo.
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Definicion de una habitacion por id. */
  _sala(id) {
    return this.habitaciones.find((h) => h.id === id) || null;
  }

  /** Dibuja el suelo de una habitacion en el lienzo de ambiente. */
  _pintarSala(ctx, sala) {
    const tonos = SUELO_HABITACION[sala.id] || SUELO_HABITACION.trabajo;
    for (let y = sala.y; y < sala.y + sala.alto; y++) {
      for (let x = sala.x; x < sala.x + sala.ancho; x++) {
        const claro = (x + y) % 2 === 0;
        S.dibujarSuelo(ctx, x, y, x * 31 + y * 17, claro ? tonos[0] : tonos[1]);
      }
    }
  }

  /** El suelo y los pasillos: se pinta una vez y se reutiliza. */
  _crearAmbiente() {
    if (this.ambiente) return this.ambiente;

    const c = S.crearLienzo(COLS * S.TAM, FILAS * S.TAM);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Pasillo de fondo en toda la oficina
    for (let y = 0; y < FILAS; y++) {
      for (let x = 0; x < COLS; x++) {
        S.dibujarSuelo(ctx, x, y, x * 31 + y * 17, '#3a4254');
      }
    }

    // Suelo propio de cada habitacion
    for (const sala of this.habitaciones) this._pintarSala(ctx, sala);

    // Franjas de pasillo entre habitaciones (separacion visual, no muros)
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let col = 1; col * LADO < COLS; col++) ctx.fillRect(col * LADO * S.TAM - 1, 0, 2, FILAS * S.TAM);
    for (let fila = 1; fila * LADO < FILAS; fila++) ctx.fillRect(0, fila * LADO * S.TAM - 1, COLS * S.TAM, 2);

    // Muros exteriores
    for (let x = 0; x < COLS; x++) {
      S.dibujarPared(ctx, x, 0, x === 0 || x === COLS - 1);
      S.dibujarPared(ctx, x, FILAS - 1, x === 0 || x === COLS - 1);
    }
    for (let y = 0; y < FILAS; y++) {
      S.dibujarPared(ctx, 0, y, false);
      S.dibujarPared(ctx, COLS - 1, y, false);
    }

    // Ventanas y puerta
    for (const vx of [4, 8, 14, 18, 24, 28]) S.dibujarVentana(ctx, vx, 0);
    S.dibujarPuerta(ctx, 14, FILAS - 1);

    this.ambiente = c;
    return c;
  }

  _visualDe(agente, habitaciones) {
    if (!this.visual.has(agente.id)) {
      const d = this._destino(agente, [agente], habitaciones);
      this.visual.set(agente.id, {
        x: d.x, y: d.y, dir: 1, caminando: false, sentado: false, frame: 0, tFrame: 0
      });
    }
    return this.visual.get(agente.id);
  }

  /** Donde tiene que ponerse un empleado, en pixeles de mundo (a sus pies). */
  _destino(agente, agentes, habitaciones) {
    const puesto = ESCRITORIOS[agente.indiceEscritorio];
    const suSala = HABITACION_ESCRITORIO[agente.indiceEscritorio];

    // Si su escritorio esta en una sala sin comprar, se queda en el pasillo.
    if (puesto && (!suSala || habitaciones.includes(suSala))) {
      if (agente.sitio === 'escritorio') {
        return { x: (puesto.mx + 0.5) * S.TAM, y: (puesto.my + 1) * S.TAM + 22, sentado: true };
      }
    }

    if (agente.sitio === 'companero') {
      const otro = agentes.find((a) => a.id !== agente.id && !a.dimitido);
      if (otro) {
        const d = ESCRITORIOS[otro.indiceEscritorio] || ESCRITORIOS[0];
        return { x: (d.mx + 2.8) * S.TAM, y: (d.my + 1) * S.TAM + 34, sentado: false };
      }
    }

    const s = SITIOS[agente.sitio];
    // Si el sitio esta en una sala que no esta comprada, se va al pasillo.
    if (s && (!s.sala || habitaciones.includes(s.sala))) {
      return { x: s.x * S.TAM, y: s.y * S.TAM, sentado: false };
    }

    // Ultimo recurso: su mesa si puede, y si no el pasillo.
    if (puesto && (!suSala || habitaciones.includes(suSala))) {
      return { x: (puesto.mx + 0.5) * S.TAM, y: (puesto.my + 1) * S.TAM + 22, sentado: true };
    }
    return { x: SITIOS.pasillo.x * S.TAM, y: SITIOS.pasillo.y * S.TAM, sentado: false };
  }

  dibujar(estado, dt) {
    this.t += dt;
    const ctx = this.ctx;
    const apagon = !!(estado.empresa && estado.empresa.apagon);
    const salas = (estado.empresa && estado.empresa.habitaciones) || ['trabajo'];

    // ------------------------------------------------ 1. animaciones
    for (const agente of estado.agentes) {
      const v = this._visualDe(agente, salas);
      const destino = this._destino(agente, estado.agentes, salas);

      const dx = destino.x - v.x;
      const dy = destino.y - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.5) {
        const paso = Math.min(52 * (dt / 1000), dist);
        v.x += (dx / dist) * paso;
        v.y += (dy / dist) * paso;
        v.caminando = true;
        v.sentado = false;
        if (Math.abs(dx) > 0.4) v.dir = dx > 0 ? 1 : -1;
        v.tFrame += dt;
        if (v.tFrame > 130) {
          v.tFrame = 0;
          v.frame = (v.frame + 1) % 4;
        }
      } else {
        v.x = destino.x;
        v.y = destino.y;
        v.caminando = false;
        v.sentado = destino.sentado;
        v.frame = 0;
      }

      if (!this.frames.has(agente.id)) {
        this.frames.set(agente.id, S.crearFramesPersonaje(agente.aspecto));
      }
    }

    // ------------------------------------------------ 2. lienzo
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(this._crearAmbiente(), 0, 0);

    // ------------------------------------------------ 3. capa ordenada
    const capa = [];

    for (const sala of this.habitaciones) {
      if (!salas.includes(sala.id)) continue;      // sin comprar: no hay muebles
      const pintar = MOBILIARIO[sala.id];
      if (!pintar) continue;
      const z = (sala.y + sala.alto) * S.TAM;
      capa.push({ z, f: () => pintar(ctx, this.t) });
    }

    // Escritorios: monitor -> persona sentada -> mesa (la mesa tapa las piernas)
    const porEscritorio = new Map();
    for (const a of estado.agentes) {
      if (!a.dimitido && a.indiceEscritorio != null) porEscritorio.set(a.indiceEscritorio, a);
    }

    ESCRITORIOS.forEach((d, i) => {
      const sala = HABITACION_ESCRITORIO[i];
      if (!salas.includes(sala)) return;           // su sala no esta comprada

      const agente = porEscritorio.get(i) || null;
      const v = agente ? this._visualDe(agente, salas) : null;
      const activo = agente && !agente.dimitido;
      const estadoPinta = activo ? (agente.pensando ? 'pensando' : agente.estado) : null;
      const infectado = !!(activo && agente.ordenador && agente.ordenador.virus);

      capa.push({
        z: d.my * S.TAM + 15,
        f: () => S.dibujarMonitor(
          ctx, d.mx, d.my,
          infectado ? '#8ae05a' : (estadoPinta ? colorPantalla(estadoPinta) : '#14171d'),
          !!estadoPinta && ENCENDIDA.includes(estadoPinta) && !apagon,
          infectado
        )
      });

      if (activo && v && v.sentado) {
        capa.push({ z: (d.my + 1) * S.TAM + 22, f: () => this._dibujarAgente(ctx, agente, v) });
      }

      capa.push({ z: (d.my + 1) * S.TAM + 40, f: () => S.dibujarEscritorio(ctx, d.mx - 1, d.my + 1, 3) });
    });

    // Empleados de pie o andando
    for (const agente of estado.agentes) {
      if (agente.dimitido) continue;
      const v = this._visualDe(agente, salas);
      if (v.sentado) continue;
      capa.push({ z: v.y, f: () => this._dibujarAgente(ctx, agente, v) });
    }

    capa.sort((a, b) => a.z - b.z);
    for (const item of capa) item.f();

    // ------------------------------------------------ 4. habitaciones cerradas
    for (const sala of this.habitaciones) {
      if (salas.includes(sala.id)) continue;
      this._dibujarSalaCerrada(ctx, sala, estado);
    }

    // ------------------------------------------------ 5. apagon
    if (apagon) {
      ctx.fillStyle = 'rgba(6,8,16,0.66)';
      ctx.fillRect(0, 0, COLS * S.TAM, FILAS * S.TAM);
    }

    // ------------------------------------------------ 6. interfaz
    //
    // OJO con el orden: las habitaciones cerradas se pintan en el paso 4, asi
    // que si aqui pintaramos las etiquetas y los bocadillos de todo el mundo,
    // los que estuvieran detras de una puerta cerrada se verian A TRAVES de
    // ella. Parecia que los empleados se colaban en salas sin comprar. Por eso
    // se salta a quien este tapado.
    for (const agente of estado.agentes) {
      if (agente.dimitido) continue;
      const v = this._visualDe(agente, salas);
      if (this._tapadoPorSalaCerrada(v.x, v.y, salas)) continue;
      this._dibujarEtiqueta(ctx, agente, v);
    }
    for (const agente of estado.agentes) {
      if (agente.dimitido || !agente.bocadillo) continue;
      const v = this._visualDe(agente, salas);
      if (this._tapadoPorSalaCerrada(v.x, v.y, salas)) continue;
      this._dibujarBocadillo(ctx, agente, v);
    }
    for (const agente of estado.agentes) {
      const tipo = emoteDe(agente);
      if (!tipo) continue;
      const v = this._visualDe(agente, salas);
      if (this._tapadoPorSalaCerrada(v.x, v.y, salas)) continue;
      S.dibujarEmote(ctx, v.x + 13, v.y - S.ALTO_PJ * 2 - 24, tipo, this.t);
    }
  }

  /**
   * ¿Ese punto cae dentro de una habitacion que no esta comprada?
   *
   * Sirve para no pintar nada encima de las salas cerradas. Los empleados SI
   * pueden cruzar por delante de una puerta cerrada de camino a otro sitio: lo
   * que no puede es que se les vea la cara a traves de ella.
   */
  _tapadoPorSalaCerrada(x, y, salas) {
    for (const sala of this.habitaciones) {
      if (salas.includes(sala.id)) continue;
      if (x >= sala.x * S.TAM && x <= (sala.x + sala.ancho) * S.TAM &&
          y >= sala.y * S.TAM && y <= (sala.y + sala.alto) * S.TAM) {
        return true;
      }
    }
    return false;
  }

  /** Una habitacion sin comprar: a oscuras, con candado y precio. */
  _dibujarSalaCerrada(ctx, sala, estado) {
    const x = sala.x * S.TAM;
    const y = sala.y * S.TAM;
    const w = sala.ancho * S.TAM;
    const h = sala.alto * S.TAM;

    // Opaco, no semitransparente: una puerta cerrada no deja ver lo que hay
    // dentro. Con algo de transparencia se le veian las caras a los empleados
    // que pasaban por detras, y parecia que se colaban.
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(x, y, w, h);

    // Una rejilla muy tenue, para que se vea que ahi dentro hay una sala y no
    // un agujero negro.
    ctx.strokeStyle = 'rgba(64,76,100,0.20)';
    ctx.lineWidth = 1;
    for (let i = 1; i < sala.ancho; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * S.TAM, y);
      ctx.lineTo(x + i * S.TAM, y + h);
      ctx.stroke();
    }
    for (let j = 1; j < sala.alto; j++) {
      ctx.beginPath();
      ctx.moveTo(x, y + j * S.TAM);
      ctx.lineTo(x + w, y + j * S.TAM);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(120,130,160,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.setLineDash([]);

    const cx = x + w / 2;
    const cy = y + h / 2;

    // Candado
    ctx.fillStyle = '#8b98b0';
    ctx.fillRect(cx - 9, cy - 16, 18, 14);
    ctx.fillStyle = '#6a7688';
    ctx.fillRect(cx - 5, cy - 24, 10, 10);
    ctx.fillStyle = '#8b98b0';
    ctx.fillRect(cx - 7, cy - 22, 14, 8);
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(cx - 2, cy - 12, 4, 6);

    ctx.textAlign = 'center';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.fillStyle = '#dbe3f0';
    ctx.fillText(sala.nombre, cx, cy + 14);
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#9fd8f5';
    ctx.fillText(sala.coste + ' €', cx, cy + 28);
    ctx.font = '8px ui-monospace, monospace';
    ctx.fillStyle = '#6f7d95';
    ctx.fillText(sala.aporta || '', cx, cy + 42);
    ctx.textAlign = 'center';
  }

  _dibujarAgente(ctx, agente, v) {
    const frames = this.frames.get(agente.id);
    if (!frames) return;

    let lienzo;
    if (agente.estado === 'reparando' || agente.estado === 'limpiando') lienzo = frames.reparando[v.frame % 2];
    else if (v.caminando) lienzo = frames.caminar[v.frame % 4];
    else if (v.sentado) lienzo = frames.sentado[Math.floor(this.t / 380) % 2];
    else if (agente.estado === 'sin_luz') lienzo = frames.quieto;
    else if (agente.ordenador && agente.ordenador.virus) lienzo = frames.asustado;
    else if (agente.moral < 25) lienzo = frames.enfadado;
    else if (agente.moral > 80) lienzo = frames.feliz;
    else lienzo = frames.quieto;

    const ancho = S.ANCHO_PJ * 2;
    const alto = S.ALTO_PJ * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(v.x, v.y - 1, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (v.dir < 0) {
      ctx.translate(v.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(lienzo, -ancho / 2, v.y - alto, ancho, alto);
    } else {
      ctx.drawImage(lienzo, v.x - ancho / 2, v.y - alto, ancho, alto);
    }
    ctx.restore();

    if (agente.estado === 'reparando' && Math.floor(this.t / 160) % 2 === 0) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(v.x + 14, v.y - 26, 3, 3);
      ctx.fillRect(v.x + 20, v.y - 18, 2, 2);
    }
    if (agente.ordenador && agente.ordenador.roto && agente.estado !== 'reparando') {
      const fase = Math.floor(this.t / 300) % 3;
      ctx.fillStyle = 'rgba(160,160,170,0.5)';
      ctx.fillRect(v.x - 4 + fase * 4, v.y - 62 - fase * 5, 4, 4);
      ctx.fillRect(v.x + 2 + fase * 3, v.y - 70 - fase * 4, 3, 3);
    }
  }

  _dibujarEtiqueta(ctx, agente, v) {
    const hueco = v.sentado ? 36 : 16;
    const y = v.y - S.ALTO_PJ * 2 - hueco;

    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    const anchoNombre = ctx.measureText(agente.nombre).width + 10;
    ctx.fillStyle = 'rgba(10,13,20,0.82)';
    ctx.fillRect(v.x - anchoNombre / 2, y - 11, anchoNombre, 13);
    ctx.fillStyle = agente.pensando ? '#6fc4f0' : '#e6ebf5';
    ctx.fillText(agente.nombre, v.x, y);

    const ancho = 34;
    const bx = v.x - ancho / 2;
    const by = y + 4;

    ctx.fillStyle = 'rgba(10,13,20,0.85)';
    ctx.fillRect(bx - 1, by - 1, ancho + 2, 8);

    const colorMoral = agente.moral > 66 ? '#4ec97a' : agente.moral > 33 ? '#e0b93a' : '#e05a4a';
    ctx.fillStyle = colorMoral;
    ctx.fillRect(bx, by, (ancho * agente.moral) / 100, 3);

    ctx.fillStyle = '#4a9ede';
    ctx.fillRect(bx, by + 4, (ancho * agente.energia) / 100, 3);

    // Nivel de ordenador: una rayita por nivel, bien visible
    const nivel = (agente.ordenador && agente.ordenador.nivel) || 1;
    for (let i = 0; i < nivel; i++) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(bx + i * 5, by + 9, 3, 2);
    }

    if (agente.pensando) {
      const n = Math.floor(this.t / 260) % 4;
      ctx.fillStyle = '#6fc4f0';
      for (let i = 0; i < n; i++) ctx.fillRect(v.x - 8 + i * 6, y - 24, 4, 4);
      ctx.font = '7px ui-monospace, monospace';
      ctx.fillStyle = '#9fd8f5';
      ctx.fillText('pensando...', v.x, y - 28);
      ctx.font = 'bold 9px ui-monospace, monospace';
    }
  }

  _dibujarBocadillo(ctx, agente, v) {
    const texto = agente.bocadillo.texto;
    if (!texto) return;

    ctx.font = '8px ui-monospace, monospace';
    const maxAncho = 150;
    const palabras = String(texto).split(/\s+/);
    const lineas = [];
    let actual = '';
    for (const p of palabras) {
      const prueba = actual ? actual + ' ' + p : p;
      if (ctx.measureText(prueba).width > maxAncho && actual) {
        lineas.push(actual);
        actual = p;
      } else {
        actual = prueba;
      }
      if (lineas.length >= 4) break;
    }
    if (actual) lineas.push(actual);
    if (!lineas.length) return;

    const ancho = Math.min(maxAncho, Math.max(...lineas.map((l) => ctx.measureText(l).width))) + 10;
    const alto = lineas.length * 10 + 8;
    let bx = v.x - ancho / 2;
    let by = v.y - S.ALTO_PJ * 2 - (v.sentado ? 58 : 36) - alto;

    bx = Math.max(3, Math.min(COLS * S.TAM - ancho - 3, bx));
    by = Math.max(3, by);

    ctx.fillStyle = 'rgba(250,250,252,0.96)';
    ctx.fillRect(bx, by, ancho, alto);
    ctx.fillStyle = '#d8dde6';
    ctx.fillRect(bx, by + alto - 2, ancho, 2);
    ctx.fillStyle = 'rgba(250,250,252,0.96)';
    ctx.beginPath();
    ctx.moveTo(v.x - 4, by + alto);
    ctx.lineTo(v.x + 4, by + alto);
    ctx.lineTo(v.x, by + alto + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a1f2b';
    ctx.textAlign = 'left';
    lineas.forEach((l, i) => ctx.fillText(l, bx + 5, by + 11 + i * 10));
    ctx.textAlign = 'center';
  }
}
