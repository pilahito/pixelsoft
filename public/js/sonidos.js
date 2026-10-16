/**
 * SONIDOS  ·  Todo generado por codigo, como el pixel art.
 *
 * No hay ni un solo fichero de audio: los pitiditos se fabrican con la Web
 * Audio API en el momento, con ondas cuadradas y triangulares al estilo de las
 * consolas de 8 bits. Pesa cero y se puede trastear cambiando numeros.
 *
 * Ojo con una cosa: los navegadores NO dejan sonar nada hasta que el jugador
 * toca algo. Por eso el audio se crea en el primer toque (ver `desbloquear`).
 */

/** Cada sonido es una receta: notas [frecuencia, duracion] y tipo de onda. */
const RECETAS = {
  // Interfaz
  clic: { tipo: 'square', vol: 0.30, notas: [[660, 0.035]] },
  error: { tipo: 'square', vol: 0.34, notas: [[150, 0.09], [120, 0.16]] },

  // Los pitiditos de verdad: cuando habla un empleado
  pi: { tipo: 'square', vol: 0.26, notas: [[880, 0.045]] },
  piAgudo: { tipo: 'square', vol: 0.24, notas: [[1175, 0.045]] },
  piGrave: { tipo: 'square', vol: 0.24, notas: [[587, 0.05]] },

  // Cosas buenas
  moneda: { tipo: 'square', vol: 0.30, notas: [[988, 0.055], [1319, 0.13]] },
  bono: { tipo: 'square', vol: 0.30, notas: [[784, 0.055], [988, 0.055], [1319, 0.16]] },
  contratar: { tipo: 'square', vol: 0.30, notas: [[523, 0.07], [659, 0.07], [784, 0.15]] },
  habitacion: { tipo: 'square', vol: 0.32, notas: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.22]] },
  hardware: { tipo: 'square', vol: 0.28, notas: [[659, 0.05], [880, 0.05], [1175, 0.14]] },

  // Cosas malas
  romper: { tipo: 'sawtooth', vol: 0.30, ruido: 0.18, notas: [[320, 0.05], [180, 0.07], [90, 0.22]] },
  virus: { tipo: 'square', vol: 0.26, notas: [[420, 0.05], [560, 0.05], [360, 0.05], [640, 0.05], [300, 0.14]] },
  apagon: { tipo: 'triangle', vol: 0.32, notas: [[440, 0.07], [330, 0.07], [220, 0.07], [110, 0.26]] },

  // Ambiente
  dia: { tipo: 'triangle', vol: 0.22, notas: [[523, 0.10], [392, 0.18]] },
  reparado: { tipo: 'triangle', vol: 0.24, notas: [[659, 0.06], [880, 0.12]] }
};

class Sonidos {
  constructor() {
    this.ctx = null;
    this.activo = true;
    this.volumen = 0.5;
    this._ultimo = 0;

    try {
      this.activo = localStorage.getItem('pixelsoft.sonido') !== 'no';
      this.musica = localStorage.getItem('pixelsoft.musica') === 'si';
    } catch (_) { /* modo privado */ }
  }

  /**
   * Crea (o reanuda) el audio. Hay que llamarlo desde un gesto del jugador:
   * si no, el navegador lo deja en pausa y no suena nada.
   */
  desbloquear() {
    if (!this.activo) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.musica && !this._musicaT) setTimeout(() => this._arrancarMusica(), 0);
    } catch (_) { /* sin audio, el juego funciona igual */ }
  }

  activar(si) {
    this.activo = !!si;
    try { localStorage.setItem('pixelsoft.sonido', this.activo ? 'si' : 'no'); } catch (_) { /* da igual */ }
    if (this.activo) this.desbloquear();
  }

  /**
   * Musica chiptune generada al vuelo (sin ficheros, sin licencias): una
   * progresion I-V-vi-IV con bajo y arpegio muy suave.
   */
  alternarMusica() {
    this.musica = !this.musica;
    try { localStorage.setItem('pixelsoft.musica', this.musica ? 'si' : 'no'); } catch (_) {}
    if (this.musica) this._arrancarMusica(); else this._pararMusica();
  }

  _arrancarMusica() {
    this.desbloquear();
    if (!this.ctx || this._musicaT) return;
    const acordes = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const f = (n) => 440 * Math.pow(2, (n - 69) / 12);
    let paso = 0;
    const nota = (frec, ini, dur, tipo, vol) => {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = tipo; o.frequency.value = frec;
      g.gain.setValueAtTime(0, ini); g.gain.linearRampToValueAtTime(vol * this.volumen, ini + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
      o.connect(g).connect(this.ctx.destination); o.start(ini); o.stop(ini + dur + 0.05);
    };
    this._musicaT = setInterval(() => {
      if (!this.ctx || document.hidden) return;
      const t = this.ctx.currentTime + 0.05;
      const ac = acordes[Math.floor(paso / 8) % 4];
      if (paso % 8 === 0) nota(f(ac[0] - 24), t, 1.6, 'triangle', 0.09);
      nota(f(ac[paso % 3] + (paso % 8 > 4 ? 12 : 0)), t, 0.25, 'square', 0.025);
      paso++;
    }, 220);
  }

  _pararMusica() { clearInterval(this._musicaT); this._musicaT = null; }

  /** Toca un sonido por su nombre. Nunca lanza: si falla, se queda callado. */
  tocar(nombre) {
    if (!this.activo || !this.ctx) return;
    const receta = RECETAS[nombre];
    if (!receta) return;

    // Un freno tonto: si llegan diez eventos de golpe no queremos una traca.
    const ahora = performance.now();
    if (ahora - this._ultimo < 45) return;
    this._ultimo = ahora;

    try {
      const t0 = this.ctx.currentTime + 0.001;
      let t = t0;
      const vol = (receta.vol || 0.3) * this.volumen;

      if (receta.ruido) this._ruido(t0, receta.ruido * this.volumen);

      for (const [frec, dur] of receta.notas) {
        this._nota(frec, dur, receta.tipo || 'square', t, vol);
        t += dur;
      }
    } catch (_) { /* si el audio falla, el juego sigue */ }
  }

  /** Una nota corta con envolvente, para que no chasquee. */
  _nota(frec, dur, tipo, cuando, vol) {
    const osc = this.ctx.createOscillator();
    const gan = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frec, cuando);
    gan.gain.setValueAtTime(0.0001, cuando);
    gan.gain.linearRampToValueAtTime(vol, cuando + 0.008);
    gan.gain.exponentialRampToValueAtTime(0.0001, cuando + dur);
    osc.connect(gan);
    gan.connect(this.ctx.destination);
    osc.start(cuando);
    osc.stop(cuando + dur + 0.02);
  }

  /** Un golpe de ruido blanco. Da el "crac" de algo que se rompe. */
  _ruido(cuando, vol) {
    const dur = 0.18;
    const muestras = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) {
      // Va decayendo, si no suena a radio mal sintonizada
      datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
    }
    const fuente = this.ctx.createBufferSource();
    const gan = this.ctx.createGain();
    gan.gain.setValueAtTime(vol, cuando);
    fuente.buffer = buffer;
    fuente.connect(gan);
    gan.connect(this.ctx.destination);
    fuente.start(cuando);
  }
}

export const sonidos = new Sonidos();
export { RECETAS };
