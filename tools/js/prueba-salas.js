// Compra todas las habitaciones (usando el gancho de depuracion) para poder
// ver la oficina entera en la captura.
(function () {
  const gancho = window.__pixelsoft;
  if (!gancho) return 'sin gancho de depuracion';

  const mundo = gancho.mundo();
  mundo.empresa.dinero = 30000;

  for (const h of mundo.habitacionesDisponibles()) {
    mundo.dios('comprar_habitacion', { habitacionId: h.id });
  }
  mundo._emitir();
  document.getElementById('precio-slider').value = 30;
  document.querySelector('[data-dios="instalar_hardware"]');
  document.querySelector('.pestana[data-panel="poderes"]').click();

  return 'habitaciones: ' + mundo.empresa.habitaciones.length + ', caja ' + Math.round(mundo.empresa.dinero);
})();
