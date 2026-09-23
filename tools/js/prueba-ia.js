// Cambia al cerebro ONNX (IA real dentro del navegador) y lo prepara.
// Se usa el modelo mas pequeno para que la prueba no eternice la descarga.
(async () => {
  document.querySelector('.pestana[data-panel="cerebro"]').click();
  await new Promise((r) => setTimeout(r, 900));

  const boton = document.querySelector('[data-cerebro="onnx"]');
  if (!boton) return 'no encuentro el boton de IA real';
  boton.click();

  await new Promise((r) => setTimeout(r, 2500));

  const sel = document.getElementById('ia-modelo');
  if (sel && sel.options.length) {
    sel.value = 'HuggingFaceTB/SmolLM2-360M-Instruct';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const preparar = document.getElementById('ia-preparar');
  if (!preparar) return 'no encuentro el boton de preparar';
  preparar.click();

  return 'descarga lanzada';
})();
