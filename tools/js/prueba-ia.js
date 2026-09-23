// Prueba completa de la IA dentro del navegador:
//   1. Cambia al cerebro ONNX y lanza la descarga del modelo.
//   2. Espera (sin bloquear) a que este lista.
//   3. Provoca una subida de precio para que los empleados piensen DE VERDAD.
//   4. Abre el Laboratorio y despliega la respuesta CRUDA del modelo.
//
// Devuelve el control enseguida: el trabajo largo se hace con temporizadores,
// porque la herramienta de captura corta las evaluaciones a los 30 segundos.
(function () {
  const mundo = () => window.__pixelsoft && window.__pixelsoft.mundo();

  document.querySelector('.pestana[data-panel="cerebro"]').click();

  setTimeout(() => {
    document.querySelector('[data-cerebro="onnx"]').click();

    setTimeout(() => {
      const sel = document.getElementById('ia-modelo');
      if (sel && sel.options.length) {
        sel.value = 'HuggingFaceTB/SmolLM2-360M-Instruct';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const preparar = document.getElementById('ia-preparar');
      if (preparar) preparar.click();

      // A partir de aqui, a esperar sin bloquear
      const esperarLista = setInterval(() => {
        const m = mundo();
        if (!m || !m.cerebro || !m.cerebro.listo) return;
        clearInterval(esperarLista);

        // Ya hay IA de verdad: provocamos una reaccion
        const slider = document.getElementById('precio-slider');
        slider.value = 55;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));

        // Damos tiempo a que los tres piensen (cada uno tarda ~35 s)
        setTimeout(() => {
          // Un cartel bien grande con lo que devolvio el modelo, en crudo
          const registro = (window.__pixelsoft.cerebro && window.__pixelsoft.cerebro().registro) || [];
          const ultimas = registro.slice(-3);
          const caja = document.createElement('pre');
          caja.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;max-height:46vh;overflow:auto;'
            + 'margin:0;padding:10px;background:#0a0d13;color:#9fe0b5;font:11px ui-monospace,monospace;'
            + 'border-bottom:2px solid #4aa8e0;white-space:pre-wrap';
          caja.textContent = ultimas.map((r) => {
            return '### ' + r.etiqueta + '  (' + r.ms + ' ms)\n'
              + 'RESPUESTA CRUDA:\n' + (r.respuesta || '(vacia)')
              + '\nJSON extraido: ' + (r.json ? JSON.stringify(r.json) : 'NINGUNO')
              + '\n' + '-'.repeat(70);
          }).join('\n');

          document.body.appendChild(caja);
        }, 210000);
      }, 3000);
    }, 2200);
  }, 900);

  return 'descarga lanzada; el resto va con temporizadores';
})();
