/* =====================================================================
   RENDER  ·  Pinta la oficina en un canvas 2D.
   Mantiene su propio estado visual (posiciones interpoladas, frames de
   animacion) y lo actualiza en cada frame. El estado del JUEGO llega del
   servidor por SSE; aqui solo se le da forma.

   Clave del dibujo: cada cosa tiene una PROFUNDIDAD (su borde inferior).
   Se ordenan todas por profundidad y se pintan de atras hacia delante.
   Asi el escritorio tapa las piernas de quien esta sentado, y quien camina
   por delante se dibuja despues. Sin esto, los personajes "flotan".
   ===================================================================== */

import * as S from './sprites.js';

export const COLS = 22;
export const FILAS = 14;
const ESCALA = 2;

/** Distribucion de la oficina, en casillas. */
export const MAPA = {
  /** Puesto de trabajo: el monitor va en (mx,my) y la mesa ocupa 3x1 debajo. */
  escritorios: [
    { mx: 4, my: 2 },
    { mx: 4, my: 5 },
    { mx: 4, my: 8 },
    { mx: 9, my: 2 },
    { mx: 9, my: 5 },
    { mx: 9, my: 8 }
  ],
  sitios: {
    cafetera: { x: 17.5, y: 4 },
    sofa: { x: 17, y: 8 },
    planta: { x: 2.5, y: 12 },
    pizarra: { x: 15.5, y: 12 },
    pasillo: { x: 12.5, y: 8 }
  },
  ventanas: [5, 9, 13, 17],
  lamparas: [4, 10, 16],
  estanteria: { x: 20, y: 2 },
  alfombra: { x: 12, y: 3 },
  fuente: { x: 13, y: 11 },
  reloj: { x: 19, y: 0 }
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

/**
 * Que emoticono le sale por encima de la cabeza. Es lo que hace que se
 * entienda de un vistazo como esta cada uno sin leer un solo numero.
 */
function emoteDe(agente) {
  if (agente.dimitido) return null;
  if (agente.ordenador && agente.ordenador.virus) return 'virus';
  if (agente.estado === 'limpiando') return 'idea';
  if (agente.estado === 'reparando') return 'idea';
  if (agente.estado === 'descansando') return 'dormido';
  if (agente.estado === 'quejandose') return 'enfadado';
  if (agente.moral < 25) return 'enfadado';
  if (agente.moral > 82) return 'amor';
  if (agente.estado === 'motivado') return 'feliz';
  if (agente.energia < 18) return 'triste';
  return null;
}

/** Donde tiene que ponerse un empleado, en pixeles de mundo (a sus pies). */
function destinoSitio(agente, agentes) {
  const puesto = MAPA.escritorios[agente.indiceEscritorio];

  if (agente.sitio === 'companero') {
    const otro = agentes.find((a) => a.id !== agente.id && !a.dimitido);
    if (otro) {
      const d = MAPA.escritorios[otro.indiceEscritorio] || MAPA.escritorios[0];
      return { x: (d.mx + 2.6) * S.TAM, y: (d.my + 1) * S.TAM + 34, sentado: false };
    }
  }

  if (agente.sitio === 'escritorio' && puesto) {
    // Los pies justo por debajo del borde de la mesa: asi la mesa le tapa
    // las piernas y parece que esta sentado, no flotando.
    return { x: (puesto.mx + 0.5) * S.TAM, y: (puesto.my + 1) * S.TAM + 22, sentado: true };
  }

  const s = MAPA.sitios[agente.sitio] || MAPA.sitios.pasillo;
  return { x: s.x * S.TAM, y: s.y * S.TAM, sentado: false };
}

export class Renderizador {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = COLS * S.TAM * ESCALA;
    canvas.height = FILAS * S.TAM * ESCALA;
    this.ctx.imageSmoothingEnabled = false;

    this.visual = new Map();
    this.frames = new Map();
    this.t = 0;
    this.ambiente = this._crearAmbiente();
  }

  /** Suelo, paredes y decoracion fija: se pinta una vez y se reutiliza. */
  _crearAmbiente() {
    const c = S.crearLienzo(COLS * S.TAM, FILAS * S.TAM);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let y = 1; y <= FILAS - 2; y++) {
      for (let x = 1; x <= COLS - 2; x++) S.dibujarSuelo(ctx, x, y, x * 31 + y * 17);
    }
    for (let x = 0; x < COLS; x++) {
      S.dibujarPared(ctx, x, 0, x === 0 || x === COLS - 1);
      S.dibujarPared(ctx, x, FILAS - 1, x === 0 || x === COLS - 1);
    }
    for (let y = 0; y < FILAS; y++) {
      S.dibujarPared(ctx, 0, y, false);
      S.dibujarPared(ctx, COLS - 1, y, false);
    }

    S.dibujarAlfombra(ctx, MAPA.alfombra.x, MAPA.alfombra.y, 4, 3);
    for (const vx of MAPA.ventanas) S.dibujarVentana(ctx, vx, 0);
    S.dibujarPuerta(ctx, 10, FILAS - 1);
    return c;
  }

  _visualDe(agente) {
    if (!this.visual.has(agente.id)) {
      const d = destinoSitio(agente, [agente]);
      this.visual.set(agente.id, {
        x: d.x, y: d.y, dir: 1, caminando: false, sentado: false, frame: 0, tFrame: 0
      });
    }
    return this.visual.get(agente.id);
  }

  dibujar(estado, dt) {
    this.t += dt;
    const ctx = this.ctx;
    const apagon = !!(estado.empresa && estado.empresa.apagon);

    // ------------------------------------------------ 1. animaciones
    for (const agente of estado.agentes) {
      const v = this._visualDe(agente);
      const destino = destinoSitio(agente, estado.agentes);

      const dx = destino.x - v.x;
      const dy = destino.y - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.5) {
        const paso = Math.min(46 * (dt / 1000), dist);
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
    ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(this.ambiente, 0, 0);
    for (const lx of MAPA.lamparas) S.dibujarLampara(ctx, lx, 1);
    S.dibujarReloj(ctx, MAPA.reloj.x, MAPA.reloj.y, estado.hora);

    // ------------------------------------------------ 3. capa ordenada
    //
    // Cada elemento aporta su profundidad (el borde inferior). Se ordena de
    // menor a mayor y se pinta: lo mas "lejano" primero.
    //
    const capa = [];

    // Decoracion con su profundidad
    capa.push({ z: 3 * S.TAM + 30, f: () => S.dibujarEstanteria(ctx, MAPA.estanteria.x, MAPA.estanteria.y) });
    capa.push({ z: 11 * S.TAM + 12, f: () => S.dibujarPlanta(ctx, 1, 11, 0) });
    capa.push({ z: 12 * S.TAM + 12, f: () => S.dibujarPlanta(ctx, 20, 12, 2) });
    capa.push({ z: 11 * S.TAM + 16, f: () => S.dibujarPizarra(ctx, MAPA.sitios.pizarra.x - 1, 11) });
    capa.push({ z: 11 * S.TAM + 30, f: () => S.dibujarFuente(ctx, MAPA.fuente.x, MAPA.fuente.y) });
    capa.push({ z: 8 * S.TAM + 36, f: () => S.dibujarRack(ctx, 12, 8, this.t) });
    capa.push({ z: 8 * S.TAM + 30, f: () => S.dibujarImpresora(ctx, 15, 8) });
    capa.push({ z: 5 * S.TAM + 30, f: () => S.dibujarCafetera(ctx, 17, 3, !!(estado.empresa && estado.empresa.tieneCafetera)) });
    capa.push({ z: 7 * S.TAM + 30, f: () => S.dibujarSofa(ctx, 16, 6) });

    // Puestos de trabajo: monitor -> persona sentada -> mesa (la mesa tapa las piernas)
    //
    // OJO: se empareja por `indiceEscritorio`, NO por la posicion en el array.
    // Si no, al despedir a alguien y contratar a otro, se liarian los puestos.
    const porEscritorio = new Map();
    for (const a of estado.agentes) {
      if (!a.dimitido && a.indiceEscritorio != null) porEscritorio.set(a.indiceEscritorio, a);
    }

    MAPA.escritorios.forEach((d, i) => {
      const agente = porEscritorio.get(i) || null;
      const v = agente ? this._visualDe(agente) : null;
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
      const v = this._visualDe(agente);
      if (v.sentado) continue;                 // ya se ha pintado con su mesa
      capa.push({ z: v.y, f: () => this._dibujarAgente(ctx, agente, v) });
    }

    capa.sort((a, b) => a.z - b.z);
    for (const item of capa) item.f();

    // ------------------------------------------------ 4. apagon
    if (apagon) {
      ctx.fillStyle = 'rgba(6,8,16,0.66)';
      ctx.fillRect(0, 0, COLS * S.TAM, FILAS * S.TAM);
    }

    // ------------------------------------------------ 5. interfaz
    for (const agente of estado.agentes) {
      if (agente.dimitido) continue;
      this._dibujarEtiqueta(ctx, agente, this._visualDe(agente));
    }
    for (const agente of estado.agentes) {
      if (agente.dimitido || !agente.bocadillo) continue;
      this._dibujarBocadillo(ctx, agente, this._visualDe(agente));
    }
    // Los emoticonos van los ultimos, por encima de todo.
    for (const agente of estado.agentes) {
      const tipo = emoteDe(agente);
      if (!tipo) continue;
      const v = this._visualDe(agente);
      S.dibujarEmote(ctx, v.x + 13, v.y - S.ALTO_PJ * 2 - 24, tipo, this.t);
    }
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

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
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
    // Al que esta sentado le subimos mas la etiqueta: si no, tapa el monitor,
    // que es donde se ve lo que esta haciendo.
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
