// Prueba del modo movil: sube el precio, da un bono y abre la ficha de empleados
// para ver que el cerebro simulado reacciona de verdad.
(function () {
  const slider = document.getElementById('precio-slider');
  slider.value = 62;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));

  setTimeout(() => {
    const bono = document.querySelector('[data-dios="bono"]');
    if (bono) bono.click();
  }, 1500);

  setTimeout(() => {
    const pestana = document.querySelector('.pestana[data-panel="empleados"]');
    if (pestana) pestana.click();
  }, 7000);

  return 'precio + bono + panel empleados';
})();
