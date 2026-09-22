/* =====================================================================
   SPRITES  ·  Todo el pixel art se dibuja por codigo.
   Sin imagenes externas, sin licencias de terceros.

   Estilo: chibi y mono. Cabeza grande (casi la mitad del cuerpo), ojos
   grandes con brillo, mofletes sonrosados y bocas minusculas. La regla que
   siguen todos los personajes es: carita > realismo.

   Cada personaje se pre-renderiza una vez en un lienzo pequeno y luego se
   escala x2 con image-rendering: pixelated. Asi se ve nitido y va rapido.
   ===================================================================== */

export const TAM = 32;            // tamano de casilla en el lienzo
export const ANCHO_PJ = 16;       // ancho del personaje en "pixeles de sprite"
export const ALTO_PJ = 22;

/* ------------------------------------------------------------- colores */

/** Aclara (+) u oscurece (-) un color hexadecimal. */
export function ajustar(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + delta));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + delta));
  const b = Math.max(0, Math.min(255, (n & 255) + delta));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function crearLienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

/** Rectangulo de 1 unidad = 1 pixel de sprite. */
function r(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Rectangulo redondeado de pixeles (esquinas comidas). Para muebles monos. */
function rr(ctx, x, y, w, h, color, radio = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(x + radio, y, w - radio * 2, h);
  ctx.fillRect(x, y + radio, w, h - radio * 2);
}

/* ================================================================ CARAS */

/** Paleta de piel: tonos calidos y suaves, nada de grises. */
const PIEL = {
  sombra: -34,
  luz: 20
};

const TINTA = '#3a2b33';        // el "negro" del juego: marron oscuro, mas calido
const BLANCO_OJO = '#fdf6f0';
const MOFETE = '#f2909a';

/**
 * Dibuja un personaje dentro de una caja de 16x22, en plan chibi.
 * opciones: { frame, sentado, escribiendo, reparando, ceño, sonrisa, ojosCerrados }
 */
function dibujarCuerpo(ctx, aspecto, opciones = {}) {
  const { frame = 0, sentado = false, escribiendo = false, reparando = false } = opciones;
  const piel = aspecto.piel || '#f0c8a4';
  const pelo = aspecto.pelo || '#4a3226';
  const camisa = aspecto.camisa || '#6aa9d8';
  const pantalon = aspecto.pantalon || '#5a5878';
  const estilo = aspecto.estiloPelo || 'corto';

  const pielSombra = ajustar(piel, PIEL.sombra);
  const pielLuz = ajustar(piel, PIEL.luz);
  const camisaSombra = ajustar(camisa, -38);
  const camisaLuz = ajustar(camisa, 26);
  const pantalonSombra = ajustar(pantalon, -30);
  const peloLuz = ajustar(pelo, 34);
  const peloSombra = ajustar(pelo, -24);
  const zapato = '#6b4a4a';

  const bob = (!sentado && (frame === 1 || frame === 3)) ? -1 : 0;
  const base = sentado ? 4 : 0;

  /* ---------------------------------------------------------- piernas */
  if (sentado) {
    r(ctx, 4, 18 + base, 8, 5, pantalonSombra);
  } else if (reparando) {
    r(ctx, 4, 17 + bob, 3, 4, pantalon);
    r(ctx, 9, 17 + bob, 3, 4, pantalon);
    rr(ctx, 3, 20 + bob, 4, 2, zapato, 1);
    rr(ctx, 9, 20 + bob, 4, 2, zapato, 1);
  } else {
    const sep = frame === 1 ? -2 : frame === 3 ? 2 : 0;
    r(ctx, 5 + sep, 17 + bob, 2, 4, pantalon);
    r(ctx, 9 + sep, 17 + bob, 2, 4, pantalon);
    rr(ctx, 4 + sep, 20 + bob, 4, 2, zapato, 1);
    rr(ctx, 8 + sep, 20 + bob, 4, 2, zapato, 1);
    if (sep === 0) r(ctx, 7, 17 + bob, 2, 3, pantalonSombra);
  }

  /* ------------------------------------------------------------ torso */
  r(ctx, 4, 11 + base + bob, 8, 6, camisa);
  r(ctx, 4, 11 + base + bob, 8, 2, camisaLuz);
  r(ctx, 4, 15 + base + bob, 8, 2, camisaSombra);
  // Cuello de la camisa: un detalle minusculo que lo hace mas mono
  r(ctx, 6, 11 + base + bob, 4, 1, ajustar(camisa, 40));

  /* ------------------------------------------------------------ brazos */
  const brazo = escribiendo ? (frame % 2 === 0 ? 0 : 1) : 0;
  if (reparando) {
    r(ctx, 3, 13 + base, 2, 4, camisaSombra);
    r(ctx, 11, 13 + base, 2, 4, camisaSombra);
    r(ctx, 3, 17 + base, 2, 2, piel);
    r(ctx, 11, 17 + base, 2, 2, piel);
  } else if (sentado) {
    r(ctx, 2, 13 + base + brazo, 2, 3, camisa);
    r(ctx, 12, 13 + base + (1 - brazo), 2, 3, camisa);
    r(ctx, 2, 16 + base + brazo, 2, 2, piel);
    r(ctx, 12, 16 + base + (1 - brazo), 2, 2, piel);
  } else {
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    r(ctx, 2, 11 + bob - swing, 2, 4, camisa);
    r(ctx, 12, 11 + bob + swing, 2, 4, camisa);
    r(ctx, 2, 15 + bob - swing, 2, 2, piel);
    r(ctx, 12, 15 + bob + swing, 2, 2, piel);
  }

  /* --------------------------------------------------------- la cabeza */
  const cy = 1 + base + bob;          // borde superior de la cabeza
  r(ctx, 6, 10 + base + bob, 4, 2, pielSombra);   // cuello

  // Cabeza grande y redondeada: se le comen las esquinas para que no sea
  // un cuadrado. Eso es el 90% del look "mono".
  rr(ctx, 3, cy, 10, 10, piel, 2);
  r(ctx, 3, cy + 8, 10, 2, pielSombra);           // barbilla sombreada
  r(ctx, 4, cy + 1, 2, 3, pielLuz);               // brillo de la mejilla

  /* --------------------------------------------------------------- pelo */
  dibujarPelo(ctx, estilo, cy, pelo, peloLuz, peloSombra);

  /* ------------------------------------------------------------ la cara */
  const ojosY = cy + 4;
  const cerrados = opciones.ojosCerrados;

  if (cerrados) {
    // Ojos cerrados: dos arcos. Duerme placidamente.
    r(ctx, 5, ojosY + 1, 2, 1, TINTA);
    r(ctx, 9, ojosY + 1, 2, 1, TINTA);
  } else {
    // Ojos grandes con brillo: el truco mas viejo del pixel art mono.
    for (const ox of [5, 9]) {
      r(ctx, ox, ojosY, 2, 3, BLANCO_OJO);        // blanco
      r(ctx, ox, ojosY + 1, 2, 2, TINTA);         // pupila
      r(ctx, ox, ojosY, 1, 1, '#ffffff');         // brillo
    }
  }

  // Cejas: solo cuando esta enfadado. Comunican muchisimo.
  if (opciones.ceño) {
    r(ctx, 5, ojosY - 2, 2, 1, TINTA);
    r(ctx, 9, ojosY - 2, 2, 1, TINTA);
    r(ctx, 6, ojosY - 1, 1, 1, TINTA);
    r(ctx, 9, ojosY - 1, 1, 1, TINTA);
  }

  // Mofletes. Sin esto no es adorable, es un muñeco.
  if (!opciones.palido) {
    r(ctx, 4, ojosY + 4, 2, 1, MOFETE);
    r(ctx, 10, ojosY + 4, 2, 1, MOFETE);
  }

  // Boca minuscula
  const bocaY = ojosY + 5;
  if (opciones.sonrisa) {
    r(ctx, 7, bocaY, 2, 1, '#9a5058');
    r(ctx, 6, bocaY - 1, 1, 1, '#9a5058');
    r(ctx, 9, bocaY - 1, 1, 1, '#9a5058');
  } else if (opciones.ceño) {
    r(ctx, 6, bocaY, 4, 1, '#9a5058');
    r(ctx, 6, bocaY + 1, 1, 1, '#9a5058');
    r(ctx, 9, bocaY + 1, 1, 1, '#9a5058');
  } else {
    r(ctx, 7, bocaY, 2, 1, '#9a5058');
  }
}

/** Peinados monos. */
function dibujarPelo(ctx, estilo, cy, pelo, peloLuz, peloSombra) {
  switch (estilo) {
    case 'afro':
      rr(ctx, 2, cy - 3, 12, 6, pelo, 3);
      r(ctx, 1, cy - 1, 2, 5, pelo);
      r(ctx, 13, cy - 1, 2, 5, pelo);
      r(ctx, 3, cy - 3, 6, 2, peloLuz);
      break;

    case 'coleta':
      rr(ctx, 3, cy - 2, 10, 4, pelo, 2);
      r(ctx, 3, cy + 1, 1, 3, pelo);
      r(ctx, 12, cy + 1, 1, 3, pelo);
      r(ctx, 13, cy + 1, 2, 5, pelo);        // la coleta
      r(ctx, 14, cy + 2, 1, 3, peloSombra);
      r(ctx, 4, cy - 2, 5, 1, peloLuz);
      break;

    case 'melena':
      rr(ctx, 2, cy - 2, 12, 6, pelo, 2);
      r(ctx, 2, cy + 2, 2, 7, pelo);         // melena larga a los lados
      r(ctx, 12, cy + 2, 2, 7, pelo);
      r(ctx, 3, cy - 2, 6, 1, peloLuz);
      break;

    case 'moño':
      rr(ctx, 3, cy - 2, 10, 4, pelo, 2);
      r(ctx, 3, cy + 1, 1, 2, pelo);
      r(ctx, 12, cy + 1, 1, 2, pelo);
      rr(ctx, 6, cy - 5, 5, 4, pelo, 2);     // el moño
      r(ctx, 7, cy - 5, 3, 1, peloLuz);
      break;

    case 'calvo':
      r(ctx, 3, cy + 2, 1, 3, pelo);
      r(ctx, 12, cy + 2, 1, 3, pelo);
      r(ctx, 4, cy, 8, 1, pielClaro(pelo));
      break;

    default: // corto
      rr(ctx, 3, cy - 2, 10, 4, pelo, 2);
      r(ctx, 3, cy + 1, 1, 3, pelo);
      r(ctx, 12, cy + 1, 1, 3, pelo);
      r(ctx, 4, cy - 2, 6, 1, peloLuz);
      r(ctx, 9, cy + 1, 3, 1, peloSombra);
      break;
  }
}

/** Un tono clarito para la calva. */
function pielClaro(hex) { return ajustar(hex, 60); }

/** Genera todos los frames de un personaje y los deja listos para pintar. */
export function crearFramesPersonaje(aspecto) {
  const fabricar = (fn) => {
    const c = crearLienzo(ANCHO_PJ, ALTO_PJ);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    fn(ctx);
    return c;
  };

  return {
    caminar: [0, 1, 2, 3].map((f) => fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: f }))),
    quieto: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0 })),
    sentado: [0, 1].map((f) => fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { sentado: true, escribiendo: true, frame: f }))),
    reparando: [0, 1].map((f) => fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { reparando: true, frame: f }))),
    enfadado: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0, ceño: true })),
    feliz: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0, sonrisa: true })),
    dormido: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0, ojosCerrados: true, sonrisa: true })),
    asustado: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0, palido: true, ceño: true }))
  };
}

/* ============================================================== EMOTES */

/**
 * Los emoticonos que salen flotando sobre la cabeza. Es lo que hace que se
 * entienda de un vistazo como esta cada empleado sin leer nada.
 * tipo: 'feliz' | 'amor' | 'triste' | 'enfadado' | 'dormido' | 'virus' | 'idea'
 */
export function dibujarEmote(ctx, x, y, tipo, t = 0) {
  const flota = Math.sin(t / 260) * 2;
  const cy = y + flota;

  switch (tipo) {
    case 'amor': {
      r(ctx, x, cy, 2, 1, '#f2607a');
      r(ctx, x + 3, cy, 2, 1, '#f2607a');
      r(ctx, x - 1, cy + 1, 6, 2, '#f2607a');
      r(ctx, x, cy + 3, 4, 1, '#f2607a');
      r(ctx, x + 1, cy + 4, 2, 1, '#f2607a');
      break;
    }
    case 'feliz': {
      r(ctx, x, cy + 1, 5, 1, '#ffd76a');
      r(ctx, x - 1, cy + 2, 7, 3, '#ffd76a');
      r(ctx, x, cy + 5, 5, 1, '#ffd76a');
      r(ctx, x + 1, cy + 6, 3, 1, '#ffd76a');
      break;
    }
    case 'triste': {
      // Gotita de sudor
      r(ctx, x + 2, cy, 1, 1, '#7cd0f0');
      r(ctx, x + 1, cy + 1, 3, 2, '#7cd0f0');
      r(ctx, x, cy + 3, 5, 2, '#7cd0f0');
      r(ctx, x + 1, cy + 2, 1, 1, '#c8ecff');
      break;
    }
    case 'enfadado': {
      // Crucecita de enfado
      r(ctx, x, cy, 2, 2, '#e05a4a');
      r(ctx, x + 4, cy, 2, 2, '#e05a4a');
      r(ctx, x + 2, cy + 2, 2, 2, '#e05a4a');
      r(ctx, x, cy + 4, 2, 2, '#e05a4a');
      r(ctx, x + 4, cy + 4, 2, 2, '#e05a4a');
      break;
    }
    case 'dormido': {
      ctx.fillStyle = '#a8b8d8';
      ctx.font = 'bold 7px ui-monospace, monospace';
      ctx.fillText('z', x, cy + 4);
      ctx.font = 'bold 5px ui-monospace, monospace';
      ctx.fillText('z', x + 5, cy + 1);
      break;
    }
    case 'virus': {
      // Bicho verde: un circulito con patitas
      r(ctx, x + 1, cy + 1, 4, 4, '#5ec46a');
      r(ctx, x + 2, cy + 2, 1, 1, '#1a3a1a');
      r(ctx, x + 4, cy + 2, 1, 1, '#1a3a1a');
      r(ctx, x, cy, 1, 1, '#5ec46a');
      r(ctx, x + 5, cy, 1, 1, '#5ec46a');
      r(ctx, x, cy + 5, 1, 1, '#5ec46a');
      r(ctx, x + 5, cy + 5, 1, 1, '#5ec46a');
      break;
    }
    case 'idea': {
      r(ctx, x + 1, cy, 3, 1, '#ffe27a');
      r(ctx, x, cy + 1, 5, 4, '#ffe27a');
      r(ctx, x + 1, cy + 5, 3, 2, '#c8a83a');
      r(ctx, x + 1, cy + 2, 1, 1, '#fffbe0');
      break;
    }
    default:
      break;
  }
}

/* ========================================================== MOBILIARIO */

/** Casilla de suelo tipo moqueta. El color lo pone la habitacion. */
export function dibujarSuelo(ctx, cx, cy, variante = 0, color = '#4a5a72') {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x, y, TAM, TAM, color);

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.fillRect(x + 2, y + 2, TAM - 4, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(x + 2, y + TAM - 6, TAM - 4, 2);

  if (variante % 9 === 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.055)';
    ctx.fillRect(x + 10, y + 12, 6, 6);
  }
}

/** Pared con rodapie. */
export function dibujarPared(ctx, cx, cy, esEsquina = false) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x, y, TAM, TAM, '#33314a');
  r(ctx, x, y + TAM - 7, TAM, 7, '#413e5e');
  r(ctx, x, y + TAM - 8, TAM, 1, '#56527a');
  if (esEsquina) r(ctx, x, y, TAM, 3, '#4a4768');
}

/** Ventana con cielo, nube y maceta. */
export function dibujarVentana(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 2, y + 3, TAM - 4, TAM - 11, '#6d9ed8', 2);
  r(ctx, x + 3, y + 4, TAM - 6, 9, '#8ab6e8');
  r(ctx, x + 6, y + 7, 8, 3, '#dceaf8');
  r(ctx, x + 15, y + 12, 7, 3, '#dceaf8');
  r(ctx, x + 2, y + 3, TAM - 4, 2, '#413e5e');
  r(ctx, x + 14, y + 3, 2, TAM - 11, '#413e5e');
}

/** Escritorio: tablero calido, patas y cajonera con tiradores. */
export function dibujarEscritorio(ctx, cx, cy, anchoCasillas = 3) {
  const x = cx * TAM;
  const y = cy * TAM;
  const w = anchoCasillas * TAM;

  r(ctx, x + 5, y + 20, 5, 16, '#7a5636');
  r(ctx, x + w - 10, y + 20, 5, 16, '#7a5636');

  rr(ctx, x + w - 19, y + 23, 17, 15, '#9a7048', 1);
  r(ctx, x + w - 17, y + 26, 13, 3, '#b98a5e');
  r(ctx, x + w - 17, y + 32, 13, 3, '#b98a5e');

  rr(ctx, x, y + 15, w, 8, '#c99a68', 2);
  r(ctx, x + 1, y + 16, w - 2, 2, '#e0b585');
  r(ctx, x, y + 21, w, 2, '#8f6a45');
}

/** Una tacita de cafe, para que la mesa tenga vida. */
export function dibujarTaza(ctx, cx, cy, llena = true) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 22, y + 9, 7, 6, '#f0e6de', 1);
  r(ctx, x + 23, y + 10, 5, 2, llena ? '#8a5a3a' : '#e0d6ce');
  r(ctx, x + 29, y + 10, 2, 3, '#f0e6de');
}

/** Monitor. El color de pantalla cuenta lo que esta haciendo el empleado. */
export function dibujarMonitor(ctx, cx, cy, colorPantalla, encendido = true, infectado = false) {
  const x = cx * TAM;
  const y = cy * TAM;

  r(ctx, x + 13, y + 13, 6, 4, '#4a4768');
  rr(ctx, x + 8, y + 16, 16, 3, '#4a4768', 1);

  rr(ctx, x + 4, y - 3, 24, 18, '#3a3850', 2);
  r(ctx, x + 5, y - 2, 22, 2, '#565274');
  r(ctx, x + 5, y - 1, 22, 1, '#6a6690');

  if (!encendido) {
    rr(ctx, x + 7, y + 1, 18, 12, '#22203a', 1);
    return;
  }

  if (infectado) {
    // Pantalla infectada: fondo verde enfermizo y barras de basura.
    rr(ctx, x + 7, y + 1, 18, 12, '#12331a', 1);
    ctx.fillStyle = '#4ae05a';
    ctx.fillRect(x + 8, y + 2, 16, 1);
    ctx.fillRect(x + 8, y + 5, 10, 1);
    ctx.fillRect(x + 8, y + 8, 14, 1);
    ctx.fillRect(x + 8, y + 11, 7, 1);
    ctx.fillStyle = '#8af09a';
    ctx.fillRect(x + 19, y + 4, 4, 4);
    ctx.fillRect(x + 20, y + 5, 1, 1);
    ctx.fillRect(x + 22, y + 5, 1, 1);
    ctx.fillRect(x + 20, y + 7, 3, 1);
    return;
  }

  rr(ctx, x + 7, y + 1, 18, 12, colorPantalla, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fillRect(x + 9, y + 3, 9, 1);
  ctx.fillRect(x + 9, y + 5, 12, 1);
  ctx.fillRect(x + 9, y + 7, 6, 1);
  ctx.fillRect(x + 9, y + 9, 11, 1);
  // Carita en la pantalla cuando va todo bien
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x + 20, y + 4, 1, 1);
  ctx.fillRect(x + 22, y + 4, 1, 1);
  ctx.fillRect(x + 20, y + 7, 3, 1);
}

/** Sofa blandito. */
export function dibujarSofa(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x, y + 5, TAM * 2, 23, '#7a6aa8', 3);
  rr(ctx, x + 1, y + 4, TAM * 2 - 2, 7, '#9182c0', 3);
  rr(ctx, x + 3, y + 14, TAM * 2 - 6, 12, '#8a7ab8', 2);
  r(ctx, x + 3, y + 26, TAM * 2 - 6, 3, '#5c4f80');
  rr(ctx, x - 4, y + 7, 5, 21, '#63558e', 2);
  rr(ctx, x + TAM * 2 - 1, y + 7, 5, 21, '#63558e', 2);
  // Cojin
  rr(ctx, x + 20, y + 9, 12, 10, '#e8a0b8', 2);
  r(ctx, x + 22, y + 11, 8, 1, '#f5c0d0');
}

/** Cafetera con jarra y lucecita. */
export function dibujarCafetera(ctx, cx, cy, tieneCafetera) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 6, y + 2, 20, 26, tieneCafetera ? '#5a5478' : '#484264', 2);
  r(ctx, x + 7, y + 3, 18, 3, tieneCafetera ? '#726a92' : '#5c5680');
  rr(ctx, x + 9, y + 7, 14, 7, '#2a2740', 1);
  if (tieneCafetera) {
    r(ctx, x + 10, y + 9, 12, 4, '#a05a30');
    r(ctx, x + 11, y + 9, 10, 1, '#d0824a');
    r(ctx, x + 22, y + 4, 2, 2, '#6ce89a');
  } else {
    r(ctx, x + 10, y + 9, 12, 4, '#38344f');
    r(ctx, x + 22, y + 4, 2, 2, '#a04a4a');
  }
  rr(ctx, x + 10, y + 16, 12, 9, '#38344f', 1);
  r(ctx, x + 12, y + 18, 8, 5, tieneCafetera ? '#8a5a38' : '#4a4a5a');
}

/** Planta frondosa. */
export function dibujarPlanta(ctx, cx, cy, semilla = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 9, y + 20, 14, 11, '#c07a4a', 2);
  r(ctx, x + 9, y + 20, 14, 3, '#d88f5c');
  r(ctx, x + 11, y + 18, 10, 3, '#7a5636');
  const verdes = ['#5aa85e', '#6cc06e', '#4a9450'];
  const puntos = [[10, 5], [16, 3], [13, 8], [6, 10], [19, 9], [14, 13], [8, 14]];
  puntos.forEach(([px, py], i) => {
    const v = verdes[(i + semilla) % verdes.length];
    rr(ctx, x + px, y + py, 6, 5, v, 1);
  });
  r(ctx, x + 14, y + 12, 3, 8, '#3f7a44');
}

/** Pizarra con Garabatos. */
export function dibujarPizarra(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x - 4, y + 2, TAM * 2 + 8, 26, '#9a7048', 2);
  rr(ctx, x - 1, y + 5, TAM * 2 + 2, 20, '#f2f0e8', 1);
  ctx.fillStyle = '#4a9ede';
  ctx.fillRect(x + 3, y + 8, 22, 2);
  ctx.fillRect(x + 3, y + 12, 30, 2);
  ctx.fillStyle = '#e0705a';
  ctx.fillRect(x + 3, y + 16, 14, 2);
  ctx.fillRect(x + 21, y + 16, 16, 2);
  ctx.fillStyle = '#5ec46a';
  ctx.fillRect(x + 40, y + 8, 14, 2);
}

/** Lampara de techo con su halo. */
export function dibujarLampara(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 14, y, 4, 6, '#4a4768');
  rr(ctx, x + 8, y + 6, 16, 5, '#f0e2b8', 2);
  ctx.fillStyle = 'rgba(255,240,190,0.08)';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 11);
  ctx.lineTo(x + 24, y + 11);
  ctx.lineTo(x + 34, y + 30);
  ctx.lineTo(x - 2, y + 30);
  ctx.closePath();
  ctx.fill();
}

/** Estanteria con libros de colores. */
export function dibujarEstanteria(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x, y, TAM, TAM, '#8a6440', 2);
  const libros = ['#e0705a', '#4a9ede', '#5ec46a', '#e8c05a', '#a87ad0', '#e0985a'];
  for (let fila = 0; fila < 3; fila++) {
    const fy = y + 3 + fila * 10;
    r(ctx, x + 2, fy, TAM - 4, 8, '#4a3524');
    let bx = x + 3;
    for (let i = 0; i < 6; i++) {
      const ancho = 3 + ((i + fila) % 2);
      r(ctx, bx, fy + 1, ancho, 7, libros[(i + fila * 2) % libros.length]);
      bx += ancho + 1;
      if (bx > x + TAM - 5) break;
    }
  }
}

/** Puerta de salida. */
export function dibujarPuerta(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x, y - 10, TAM, TAM + 10, '#8a6440', 2);
  rr(ctx, x + 3, y - 6, TAM - 6, TAM + 6, '#a87c52', 1);
  rr(ctx, x + 5, y - 4, TAM - 10, 11, '#7aa8d0', 1);
  r(ctx, x + TAM - 10, y + 9, 3, 3, '#e8c05a');
}

/** Alfombra decorativa. */
export function dibujarAlfombra(ctx, cx, cy, ancho = 3, alto = 2) {
  const x = cx * TAM;
  const y = cy * TAM;
  const w = ancho * TAM;
  const h = alto * TAM;
  rr(ctx, x, y, w, h, '#6a5480', 3);
  rr(ctx, x + 4, y + 4, w - 8, h - 8, '#8270a0', 2);
  rr(ctx, x + 10, y + 10, w - 20, h - 20, '#6a5480', 2);
}

/** Fuente de agua: el garrafon de siempre. */
export function dibujarFuente(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 10, y + 4, 12, 4, '#5a5478');
  rr(ctx, x + 11, y + 8, 10, 14, '#7ac8e8', 2);
  r(ctx, x + 12, y + 9, 8, 12, '#9edcf4');
  rr(ctx, x + 9, y + 22, 14, 9, '#d8dae4', 2);
  r(ctx, x + 9, y + 22, 14, 2, '#eef0f6');
  r(ctx, x + 13, y + 24, 6, 3, '#4a4768');
}

/** Reloj de pared. */
export function dibujarReloj(ctx, cx, cy, hora = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 9, y + 5, 14, 14, '#f0e2b8', 2);
  r(ctx, x + 15, y + 8, 2, 5, TINTA);
  const ang = (hora / 24) * Math.PI * 2;
  ctx.fillStyle = '#e0705a';
  ctx.fillRect(Math.round(x + 15 + Math.sin(ang) * 4), Math.round(y + 11 - Math.cos(ang) * 4), 2, 2);
}

/** Rack de servidores: el corazon de una empresa de software. */
export function dibujarRack(ctx, cx, cy, t = 0, infectado = false) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 4, y - 10, 24, 42, '#38344f', 2);
  r(ctx, x + 5, y - 9, 22, 3, '#4e4a70');
  r(ctx, x + 5, y - 9, 2, 41, '#4e4a70');
  r(ctx, x + 25, y - 9, 2, 41, '#2a2740');

  for (let i = 0; i < 6; i++) {
    const uy = y - 5 + i * 6;
    r(ctx, x + 7, uy, 18, 5, '#2a2740');
    r(ctx, x + 8, uy + 1, 3, 3, '#1c1a30');
    const fase = Math.floor(t / 240 + i) % 3;
    const color = infectado
      ? (fase === 0 ? '#8ae05a' : '#3a6a2a')
      : (fase === 0 ? '#6ce89a' : '#2a5a42');
    r(ctx, x + 9, uy + 2, 1, 1, color);
    r(ctx, x + 13, uy + 1, 9, 1, infectado && fase === 1 ? '#8ae05a' : '#3a4560');
    r(ctx, x + 13, uy + 3, 6, 1, '#3a4560');
  }
  r(ctx, x + 6, y + 32, 5, 4, '#2a2740');
  r(ctx, x + 21, y + 32, 5, 4, '#2a2740');
}

/** Impresora. */
export function dibujarImpresora(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 5, y + 6, 22, 16, '#5a5478', 2);
  r(ctx, x + 6, y + 7, 20, 3, '#726a92');
  r(ctx, x + 8, y + 10, 16, 4, '#2a2740');
  r(ctx, x + 9, y + 2, 14, 5, '#f2f0e8');
  r(ctx, x + 9, y + 3, 14, 1, '#d8d6cc');
  r(ctx, x + 22, y + 8, 3, 3, '#6ce89a');
  rr(ctx, x + 7, y + 22, 18, 7, '#413e5e', 1);
  r(ctx, x + 9, y + 23, 14, 2, '#f2f0e8');
}

/** Mesa de reuniones con sillas. */
export function dibujarMesaReunion(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x, y + 6, TAM * 2, 22, '#c99a68', 3);
  r(ctx, x + 1, y + 7, TAM * 2 - 2, 3, '#e0b585');
  r(ctx, x, y + 26, TAM * 2, 3, '#8f6a45');
  // Sillas
  for (const sx of [x - 8, x + TAM * 2 + 2]) {
    rr(ctx, sx, y + 10, 7, 12, '#7a6aa8', 2);
  }
  // Un portatil encima
  rr(ctx, x + 20, y + 2, 14, 6, '#3a3850', 1);
  r(ctx, x + 21, y + 3, 12, 4, '#4aa8e0');
}

/** Nevera y microondas de la cocina. */
export function dibujarCocina(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  rr(ctx, x + 2, y - 6, 18, 40, '#e2e4ee', 2);
  r(ctx, x + 3, y - 5, 16, 2, '#f4f6fc');
  r(ctx, x + 4, y + 15, 14, 1, '#c0c4d4');
  rr(ctx, x + 14, y + 2, 2, 8, '#b0b4c4', 1);
  rr(ctx, x + 14, y + 22, 2, 8, '#b0b4c4', 1);
  rr(ctx, x + 22, y, 8, 14, '#5a5478', 1);
  r(ctx, x + 23, y + 1, 6, 8, '#2a2740');
  r(ctx, x + 24, y + 2, 4, 3, '#f0a84a');
}

/** Gato de la oficina. Un detalle tonto que hace el sitio mas hogareño. */
export function dibujarGato(ctx, x, y, frame = 0, color = '#e8a860') {
  const bob = frame % 2 === 0 ? 0 : 1;
  const sombra = ajustar(color, -40);
  // Cuerpo
  rr(ctx, x - 5, y - 7 + bob, 11, 7, color, 2);
  // Cabeza
  rr(ctx, x + 4, y - 12 + bob, 8, 7, color, 2);
  // Orejas
  r(ctx, x + 4, y - 14 + bob, 2, 2, color);
  r(ctx, x + 10, y - 14 + bob, 2, 2, color);
  // Ojos
  r(ctx, x + 6, y - 10 + bob, 1, 1, '#2a2030');
  r(ctx, x + 9, y - 10 + bob, 1, 1, '#2a2030');
  // Cola
  r(ctx, x - 8, y - 10 + bob, 4, 2, sombra);
  r(ctx, x - 10, y - 12 + bob, 2, 3, sombra);
  // Patitas
  r(ctx, x - 3, y + bob, 2, 1, sombra);
  r(ctx, x + 2, y + bob, 2, 1, sombra);
}
