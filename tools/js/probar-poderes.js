// Comprueba que TODOS los botones de dios hacen algo. Antes tres de ellos
// ("alquiler", "arreglar", "romper") se llamaban distinto en el HTML que en el
// motor, y al pulsarlos salia "Poder desconocido".
(async () => {
  document.querySelector('.pestana[data-panel="poderes"]').click();
  await new Promise((r) => setTimeout(r, 600));

  // Coger un empleado, que "romper" y "arreglar" lo necesitan
  const selector = document.getElementById('agente-select');
  if (selector && selector.options.length) {
    selector.selectedIndex = 0;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const botones = [...document.querySelectorAll('[data-dios]')];
  const resultados = [];

  for (const boton of botones) {
    const accion = boton.dataset.dios;
    boton.click();
    await new Promise((r) => setTimeout(r, 450));

    // El aviso de brindis es donde sale "Poder desconocido: X" o el mensaje
    const brindis = document.querySelector('.brindis, #brindis');
    const texto = brindis ? brindis.textContent.trim() : '(sin aviso)';
    resultados.push(`${accion.padEnd(20)} -> ${texto.slice(0, 60)}`);
  }

  return resultados.join('\n');
})();
