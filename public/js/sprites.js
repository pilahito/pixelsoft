/* =====================================================================
   SPRITES  ·  Todo el pixel art se dibuja por codigo.
   Sin imagenes externas, sin licencias de terceros.
   Cada personaje se pre-renderiza una vez en un lienzo pequeno y luego se
   escala x2 con image-rendering: pixelated. Asi se ve nitido y va rapido.
   ===================================================================== */

export const TAM = 32;            // tamano de casilla en el lienzo
export const ANCHO_PJ = 16;       // ancho del personaje en "pixeles de sprite"
export const ALTO_PJ = 22;

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

/* ------------------------------------------------------------------ CARAS */

/**
 * Dibuja un personaje dentro de una caja de 16x22.
 * opciones: { frame, sentado, escribiendo, reparando, mirandoIzquierda }
 */
function dibujarCuerpo(ctx, aspecto, opciones = {}) {
  const { frame = 0, sentado = false, escribiendo = false, reparando = false } = opciones;
  const piel = aspecto.piel || '#e8b48c';
  const pelo = aspecto.pelo || '#3a2a1c';
  const camisa = aspecto.camisa || '#4a7fb5';
  const pantalon = aspecto.pantalon || '#333a4d';
  const estilo = aspecto.estiloPelo || 'corto';

  const pielSombra = ajustar(piel, -28);
  const camisaSombra = ajustar(camisa, -34);
  const camisaLuz = ajustar(camisa, 22);
  const pantalonSombra = ajustar(pantalon, -26);
  const peloLuz = ajustar(pelo, 26);
  const zapato = '#241f1c';

  // El "bob" del caminar: en los frames 1 y 3 el cuerpo sube 1 pixel.
  const bob = (!sentado && (frame === 1 || frame === 3)) ? -1 : 0;
  const base = sentado ? 4 : 0;

  // --- Piernas (o faldon si esta sentado, que el escritorio tapa)
  if (sentado) {
    r(ctx, 4, 18 + base, 8, 5, pantalonSombra);
  } else if (reparando) {
    // Agachado: piernas flexionadas
    r(ctx, 4, 17 + bob, 3, 4, pantalon);
    r(ctx, 9, 17 + bob, 3, 4, pantalon);
    r(ctx, 3, 20 + bob, 4, 2, zapato);
    r(ctx, 9, 20 + bob, 4, 2, zapato);
  } else {
    const sep = frame === 1 ? -2 : frame === 3 ? 2 : 0;
    r(ctx, 5 + sep, 17 + bob, 2, 4, pantalon);
    r(ctx, 9 + sep, 17 + bob, 2, 4, pantalon);
    r(ctx, 5 + sep, 20 + bob, 3, 2, zapato);
    r(ctx, 8 + sep, 20 + bob, 3, 2, zapato);
    if (sep === 0) r(ctx, 7, 17 + bob, 2, 3, pantalonSombra);
  }

  // --- Torso
  r(ctx, 4, 10 + base + bob, 8, 7, camisa);
  r(ctx, 4, 10 + base + bob, 8, 2, camisaLuz);      // hombros iluminados
  r(ctx, 4, 15 + base + bob, 8, 2, camisaSombra);   // bajo sombreado

  // --- Brazos
  const brazo = escribiendo ? (frame % 2 === 0 ? 0 : 1) : 0;
  if (reparando) {
    r(ctx, 3, 12 + base, 2, 4, camisaSombra);
    r(ctx, 11, 12 + base, 2, 4, camisaSombra);
    r(ctx, 3, 16 + base, 2, 2, piel);
    r(ctx, 11, 16 + base, 2, 2, piel);
  } else if (sentado) {
    r(ctx, 2, 12 + base + brazo, 2, 4, camisa);
    r(ctx, 12, 12 + base + (1 - brazo), 2, 4, camisa);
    r(ctx, 2, 16 + base + brazo, 2, 2, piel);
    r(ctx, 12, 16 + base + (1 - brazo), 2, 2, piel);
  } else {
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    r(ctx, 2, 10 + bob - swing, 2, 5, camisa);
    r(ctx, 12, 10 + bob + swing, 2, 5, camisa);
    r(ctx, 2, 15 + bob - swing, 2, 2, piel);
    r(ctx, 12, 15 + bob + swing, 2, 2, piel);
  }

  // --- Cuello
  r(ctx, 6, 9 + base + bob, 4, 2, pielSombra);

  // --- Cabeza
  const cabezaY = 2 + base + bob;
  r(ctx, 4, cabezaY, 8, 8, piel);
  r(ctx, 4, cabezaY + 6, 8, 2, pielSombra);   // menton sombreado

  // --- Pelo
  if (estilo === 'afro') {
    r(ctx, 3, cabezaY - 2, 10, 4, pelo);
    r(ctx, 2, cabezaY, 2, 4, pelo);
    r(ctx, 12, cabezaY, 2, 4, pelo);
    r(ctx, 3, cabezaY - 2, 6, 2, peloLuz);
  } else if (estilo === 'coleta') {
    r(ctx, 4, cabezaY - 1, 8, 3, pelo);
    r(ctx, 4, cabezaY + 1, 1, 3, pelo);
    r(ctx, 11, cabezaY + 1, 1, 3, pelo);
    r(ctx, 12, cabezaY + 2, 2, 5, pelo);       // coleta
    r(ctx, 4, cabezaY - 1, 5, 1, peloLuz);
  } else if (estilo === 'calvo') {
    r(ctx, 4, cabezaY + 1, 1, 3, pelo);
    r(ctx, 11, cabezaY + 1, 1, 3, pelo);
  } else {
    r(ctx, 4, cabezaY - 1, 8, 3, pelo);
    r(ctx, 4, cabezaY + 1, 1, 2, pelo);
    r(ctx, 11, cabezaY + 1, 1, 2, pelo);
    r(ctx, 4, cabezaY - 1, 6, 1, peloLuz);
  }

  // --- Cara
  const ojosY = cabezaY + 4;
  r(ctx, 6, ojosY, 1, 2, '#241f1c');
  r(ctx, 9, ojosY, 1, 2, '#241f1c');
  // Cejas: comunican el enfado sin decir nada
  if (opciones.ceño) {
    r(ctx, 5, ojosY - 1, 2, 1, '#241f1c');
    r(ctx, 9, ojosY - 1, 2, 1, '#241f1c');
  }
  // Boca
  if (opciones.sonrisa) r(ctx, 7, ojosY + 3, 3, 1, '#8a4a42');
  else r(ctx, 7, ojosY + 3, 2, 1, '#8a4a42');
}

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
    feliz: fabricar((ctx) => dibujarCuerpo(ctx, aspecto, { frame: 0, sonrisa: true }))
  };
}

/* -------------------------------------------------------------- MOBILIARIO */

/** Casilla de suelo tipo moqueta con damero suave. */
export function dibujarSuelo(ctx, cx, cy, variante = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  const claro = (cx + cy) % 2 === 0;
  r(ctx, x, y, TAM, TAM, claro ? '#3d4a5c' : '#394555');

  // Vetas sutiles para que no parezca plano
  ctx.fillStyle = claro ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.05)';
  ctx.fillRect(x + 2, y + 2, TAM - 4, 2);
  ctx.fillRect(x + 2, y + TAM - 6, TAM - 4, 2);

  if (variante % 7 === 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(x + 10, y + 12, 6, 6);
  }
}

/** Pared superior con rodapie y luces. */
export function dibujarPared(ctx, cx, cy, esEsquina = false) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x, y, TAM, TAM, '#232a38');
  r(ctx, x, y + TAM - 6, TAM, 6, '#2f3849');
  r(ctx, x, y + TAM - 7, TAM, 1, '#414d63');
  if (esEsquina) r(ctx, x, y, TAM, 3, '#3a4459');
}

/** Ventana con cielo y una nube. */
export function dibujarVentana(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 2, y + 4, TAM - 4, TAM - 12, '#4a6fa5');
  r(ctx, x + 2, y + 4, TAM - 4, 10, '#5d85bd');
  r(ctx, x + 6, y + 7, 8, 3, '#cfe0f2');
  r(ctx, x + 16, y + 11, 6, 3, '#cfe0f2');
  r(ctx, x, y + 2, TAM, 3, '#2f3849');
  r(ctx, x, y + TAM - 8, TAM, 2, '#2f3849');
  r(ctx, x + 14, y + 4, 2, TAM - 12, '#2f3849');   // travesano
}

/** Escritorio con tablero, patas y cajonera. */
export function dibujarEscritorio(ctx, cx, cy, anchoCasillas = 3) {
  const x = cx * TAM;
  const y = cy * TAM;
  const w = anchoCasillas * TAM;

  // Patas
  r(ctx, x + 4, y + 20, 5, 16, '#4a3626');
  r(ctx, x + w - 9, y + 20, 5, 16, '#4a3626');
  // Cajonera
  r(ctx, x + w - 18, y + 24, 16, 14, '#6b4e34');
  r(ctx, x + w - 16, y + 27, 12, 3, '#8a6743');
  r(ctx, x + w - 16, y + 33, 12, 3, '#8a6743');
  // Tablero
  r(ctx, x, y + 16, w, 7, '#a3764f');
  r(ctx, x, y + 16, w, 2, '#bd8b5f');
  r(ctx, x, y + 21, w, 2, '#7d5a3c');
}

/** Monitor. El color de pantalla cuenta lo que esta haciendo el empleado. */
export function dibujarMonitor(ctx, cx, cy, colorPantalla, encendido = true) {
  const x = cx * TAM;
  const y = cy * TAM;

  // Pie y cuello
  r(ctx, x + 12, y + 14, 8, 3, '#2a2f3a');
  r(ctx, x + 8, y + 16, 16, 2, '#2a2f3a');
  // Marco
  r(ctx, x + 5, y - 2, 22, 17, '#1c2029');
  r(ctx, x + 5, y - 2, 22, 2, '#333a48');
  // Pantalla
  if (encendido) {
    r(ctx, x + 7, y, 18, 12, colorPantalla);
    // "Codigo" parpadeante
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 9, y + 2, 9, 1);
    ctx.fillRect(x + 9, y + 4, 12, 1);
    ctx.fillRect(x + 9, y + 6, 6, 1);
    ctx.fillRect(x + 9, y + 8, 11, 1);
  } else {
    r(ctx, x + 7, y, 18, 12, '#14171d');
  }
}

/** Sofa de descanso. */
export function dibujarSofa(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x, y + 6, TAM * 2, 22, '#5a4a7a');
  r(ctx, x, y + 6, TAM * 2, 6, '#6d5a92');
  r(ctx, x + 2, y + 14, TAM * 2 - 4, 12, '#6a5789');
  r(ctx, x, y + 26, TAM * 2, 4, '#3f3357');
  r(ctx, x - 3, y + 8, 4, 20, '#4a3c66');
  r(ctx, x + TAM * 2 - 1, y + 8, 4, 20, '#4a3c66');
}

/** Cafetera con jarra y Luz de "listo". */
export function dibujarCafetera(ctx, cx, cy, tieneCafetera) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 6, y + 2, 20, 26, tieneCafetera ? '#3a4250' : '#2f3540');
  r(ctx, x + 6, y + 2, 20, 3, tieneCafetera ? '#4e586a' : '#3d444f');
  r(ctx, x + 9, y + 7, 14, 6, '#1a1e26');
  if (tieneCafetera) {
    r(ctx, x + 10, y + 8, 12, 4, '#8a4a2a');       // cafe
    r(ctx, x + 11, y + 8, 10, 1, '#c07a4a');
    r(ctx, x + 22, y + 4, 2, 2, '#5ee08a');         // luz verde
  } else {
    r(ctx, x + 10, y + 8, 12, 4, '#2a2f38');
    r(ctx, x + 22, y + 4, 2, 2, '#8a3a3a');         // luz roja: averiada
  }
  r(ctx, x + 10, y + 16, 12, 8, '#232830');
  r(ctx, x + 12, y + 18, 8, 5, tieneCafetera ? '#6b4a30' : '#3a3a3a');
}

/** Planta de oficina. */
export function dibujarPlanta(ctx, cx, cy, semilla = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 9, y + 20, 14, 11, '#8a5a3a');
  r(ctx, x + 9, y + 20, 14, 3, '#a06c46');
  r(ctx, x + 11, y + 18, 10, 3, '#4a3428');
  const verdes = ['#3f7d4a', '#4f9159', '#356b40'];
  const puntos = [[10, 6], [16, 4], [13, 9], [7, 11], [19, 10], [14, 14], [9, 15]];
  puntos.forEach(([px, py], i) => {
    const v = verdes[(i + semilla) % verdes.length];
    r(ctx, x + px, y + py, 5, 4, v);
  });
  r(ctx, x + 13, y + 12, 3, 8, '#3a5c3a');   // tallo
}

/** Pizarra con garabatos. */
export function dibujarPizarra(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x - 4, y + 2, TAM * 2 + 8, 26, '#6b4e34');
  r(ctx, x - 1, y + 5, TAM * 2 + 2, 20, '#e8e8e0');
  ctx.fillStyle = '#2a6fb5';
  ctx.fillRect(x + 3, y + 8, 22, 2);
  ctx.fillRect(x + 3, y + 12, 30, 2);
  ctx.fillStyle = '#c0453a';
  ctx.fillRect(x + 3, y + 16, 14, 2);
  ctx.fillRect(x + 21, y + 16, 16, 2);
  ctx.fillStyle = '#3a8a4a';
  ctx.fillRect(x + 40, y + 8, 14, 2);
}

/** Lampara de techo. */
export function dibujarLampara(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 14, y, 4, 6, '#3a4459');
  r(ctx, x + 8, y + 6, 16, 4, '#d8d2b0');
  ctx.fillStyle = 'rgba(255,240,190,0.07)';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 10);
  ctx.lineTo(x + 24, y + 10);
  ctx.lineTo(x + 34, y + 30);
  ctx.lineTo(x - 2, y + 30);
  ctx.closePath();
  ctx.fill();
}

/** Estanteria con libros de colores. */
export function dibujarEstanteria(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x, y, TAM, TAM, '#5a4028');
  const libros = ['#c0453a', '#3a7ac0', '#3a8a4a', '#d4a03a', '#8a4aa0', '#c07a3a'];
  for (let fila = 0; fila < 3; fila++) {
    const fy = y + 3 + fila * 10;
    r(ctx, x + 2, fy, TAM - 4, 8, '#2f2118');
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
  r(ctx, x, y - 10, TAM, TAM + 10, '#4a3626');
  r(ctx, x + 3, y - 6, TAM - 6, TAM + 6, '#6b4e34');
  r(ctx, x + 4, y - 5, TAM - 8, 12, '#5a7391');   // cristal
  r(ctx, x + TAM - 9, y + 10, 3, 3, '#d4c060');   // pomo
}

/** Alfombra decorativa (se pinta sobre el suelo). */
export function dibujarAlfombra(ctx, cx, cy, ancho = 3, alto = 2) {
  const x = cx * TAM;
  const y = cy * TAM;
  const w = ancho * TAM;
  const h = alto * TAM;
  r(ctx, x, y, w, h, '#4a3a5c');
  r(ctx, x + 4, y + 4, w - 8, h - 8, '#5a4870');
  r(ctx, x + 10, y + 10, w - 20, h - 20, '#4a3a5c');
  // Borlas
  ctx.fillStyle = '#7a6890';
  for (let i = 0; i < ancho * 4; i++) {
    ctx.fillRect(x + 4 + i * 8, y - 2, 3, 3);
    ctx.fillRect(x + 4 + i * 8, y + h - 1, 3, 3);
  }
}

/** Fuente de agua: el clasico garrafon de oficina. */
export function dibujarFuente(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 10, y + 4, 12, 4, '#3a4450');
  r(ctx, x + 11, y + 8, 10, 14, '#5aa8d0');    // garrafa
  r(ctx, x + 12, y + 9, 8, 12, '#7cc4e4');
  r(ctx, x + 11, y + 6, 10, 3, '#8ad4f0');
  r(ctx, x + 9, y + 22, 14, 8, '#c8ccd4');     // cuerpo
  r(ctx, x + 9, y + 22, 14, 2, '#e0e4ea');
  r(ctx, x + 12, y + 24, 8, 3, '#2a3038');     // pitorro
}

/** Reloj de pared, para que se vea que corre el tiempo. */
export function dibujarReloj(ctx, cx, cy, hora = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 9, y + 6, 14, 14, '#d8d2b0');
  r(ctx, x + 10, y + 7, 12, 12, '#f0ead0');
  r(ctx, x + 15, y + 9, 2, 6, '#2a2a2a');       // aguja horas
  const ang = (hora / 24) * Math.PI * 2;
  ctx.fillStyle = '#a03a3a';
  ctx.fillRect(x + 15 + Math.sin(ang) * 4, y + 13 - Math.cos(ang) * 4, 2, 2);
}

/** Rack de servidores: el corazon de una empresa de software. */
export function dibujarRack(ctx, cx, cy, t = 0) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 4, y - 10, 24, 42, '#20262e');
  r(ctx, x + 4, y - 10, 24, 3, '#39424e');
  r(ctx, x + 4, y - 10, 2, 42, '#39424e');
  r(ctx, x + 26, y - 10, 2, 42, '#161b21');

  for (let i = 0; i < 6; i++) {
    const uy = y - 5 + i * 6;
    r(ctx, x + 7, uy, 18, 5, '#141920');
    r(ctx, x + 8, uy + 1, 3, 3, '#0d1116');
    // Luces que parpadean
    const fase = Math.floor(t / 240 + i) % 3;
    r(ctx, x + 9, uy + 2, 1, 1, fase === 0 ? '#5ee08a' : '#1f3a2a');
    r(ctx, x + 13, uy + 1, 9, 1, fase === 1 ? '#4aa8e0' : '#2a3648');
    r(ctx, x + 13, uy + 3, 6, 1, '#2a3648');
  }
  r(ctx, x + 6, y + 32, 5, 4, '#141920');
  r(ctx, x + 21, y + 32, 5, 4, '#141920');
}

/** Impresora de oficina, con su bandeja y su luz. */
export function dibujarImpresora(ctx, cx, cy) {
  const x = cx * TAM;
  const y = cy * TAM;
  r(ctx, x + 5, y + 6, 22, 16, '#3a4250');
  r(ctx, x + 5, y + 6, 22, 3, '#4e586a');
  r(ctx, x + 8, y + 10, 16, 4, '#1a1f26');
  r(ctx, x + 9, y + 2, 14, 5, '#e8e8e0');     // folio asomando
  r(ctx, x + 9, y + 3, 14, 1, '#c8ccd4');
  r(ctx, x + 22, y + 8, 3, 3, '#5ee08a');
  r(ctx, x + 7, y + 22, 18, 6, '#2a3038');     // bandeja
  r(ctx, x + 9, y + 23, 14, 2, '#e8e8e0');
}


