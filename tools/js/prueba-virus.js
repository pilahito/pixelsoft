// Prueba de los poderes nuevos: virus a Carla, hardware a Ana, y abre las fichas.
(function () {
  const sel = document.getElementById('objetivo-select');

  function elegir(id) {
    sel.value = id;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  elegir('carla');
  document.querySelector('[data-dios="meter_virus"]').click();

  setTimeout(() => {
    elegir('ana');
    document.querySelector('[data-dios="instalar_hardware"]').click();
  }, 1200);

  setTimeout(() => {
    document.querySelector('.pestana[data-panel="empleados"]').click();
  }, 7000);

  return 'virus + hardware + fichas';
})();
