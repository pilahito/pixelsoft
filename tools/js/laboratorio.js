// Abre el panel "Laboratorio IA" y despliega la ultima llamada al modelo,
// para poder ver el prompt exacto y la respuesta cruda en la captura.
document.querySelector('.pestana[data-panel="laboratorio"]').click();
setTimeout(() => {
  const cabecera = document.querySelector('.llamada-cab');
  if (cabecera) cabecera.click();
}, 2200);
'panel abierto';
