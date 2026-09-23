// Segunda prueba dentro del APK: ¿el aislamiento esta activo y, aun asi, se
// puede bajar el modelo de HuggingFace? Las dos cosas a la vez son la clave:
// el aislamiento da varios nucleos, pero no puede bloquear la descarga.
(async () => {
  const salida = {
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer,
    nucleos: navigator.hardwareConcurrency
  };

  // Sin descargar nada gordo: solo el config.json del modelo
  const url = 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/resolve/main/config.json';
  try {
    const r = await fetch(url);
    const t = await r.text();
    salida.huggingface = r.status + ' · ' + t.length + ' bytes';
  } catch (e) {
    salida.huggingface = 'BLOQUEADO: ' + e.message;
  }

  // Y el motor de nuestro propio origen
  try {
    const r = await fetch('./ia/transformers.bundle.js', { method: 'HEAD' });
    salida.motor = r.status + ' · ' + (r.headers.get('content-type') || '?');
  } catch (e) {
    salida.motor = 'FALLA: ' + e.message;
  }

  return JSON.stringify(salida, null, 2);
})();
