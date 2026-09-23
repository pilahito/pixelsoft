// Comprobacion de que el extractor de JSON compartido aguanta lo que le echan
// los modelos pequenos: markdown, prosa alrededor, comas finales...
import { extraerJson } from '../public/js/motor/reglas.js';

const pruebas = [
  ['json limpio', '{"a":1}'],
  ['con markdown', 'Claro, aqui tienes:\n```json\n{"accion":"trabajar","animo":70}\n```'],
  ['llave dentro de texto', '  { "a": [1,2,3], "b": "con } dentro" }  '],
  ['coma final', '{"a":1,"b":2,}'],
  ['sin json', 'no hay json aqui'],
  ['json anidado', 'bla {"x":{"y":1},"z":2} bla']
];

let fallos = 0;
for (const [nombre, entrada] of pruebas) {
  const salida = extraerJson(entrada);
  console.log(`  ${nombre.padEnd(24)} -> ${JSON.stringify(salida)}`);
  if (nombre === 'sin json' && salida !== null) fallos++;
  if (nombre !== 'sin json' && salida === null) fallos++;
}
console.log('');
console.log(fallos ? `  ${fallos} fallos` : '  todas bien');
process.exit(fallos ? 1 : 0);
