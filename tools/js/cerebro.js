// Abre el panel Cerebro (personalidad + temperatura) y muestra el prompt exacto.
document.querySelector('.pestana[data-panel="cerebro"]').click();
setTimeout(() => {
  const ver = document.getElementById('cerebro-ver');
  if (ver) ver.click();
}, 1500);
'panel cerebro';
