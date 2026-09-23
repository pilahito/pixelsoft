// Comprueba si el navegador esta en modo "aislado", que es lo que hace falta
// para SharedArrayBuffer y, con el, para que el motor de IA use varios nucleos.
JSON.stringify({
  crossOriginIsolated: window.crossOriginIsolated,
  sharedArrayBuffer: typeof SharedArrayBuffer,
  hardwareConcurrency: navigator.hardwareConcurrency,
  webgpu: !!navigator.gpu,
  secureContext: window.isSecureContext
});
