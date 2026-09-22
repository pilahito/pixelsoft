// charla.js — corpus de respuestas de conversación (español de España)
// Módulo ES. Sin emojis: el texto se dibuja con una fuente monoespaciada de píxeles.

export const INTENCIONES = [
  { id: 'saludo',    patron: 'hola|buenas|qué tal|que tal|hey|buenos días|buenas tardes|buenas noches|saludos|qué pasa' },
  { id: 'precio',    patron: 'precio|precios|caro|barato|barata|tarifa|coste|cuesta|euros|subir el precio|bajar el precio' },
  { id: 'trabajo',   patron: 'trabajo|producto|calidad|código|codigo|proyecto|aplicación|aplicacion|app|sprint|tarea|avance|versión|version' },
  { id: 'ordenador', patron: 'ordenador|portátil|portatil|avería|averia|roto|romper|arreglar|reiniciar|pantalla|equipo|pc' },
  { id: 'sueldo',    patron: 'sueldo|salario|aumento|nómina|nomina|dinero|pagar|pagarte|cobrar|pasta|subida de sueldo' },
  { id: 'elogio',    patron: 'gracias|felicidades|enhorabuena|buen trabajo|genial|perfecto|bien hecho|ole|qué crack|te has lucido' },
  { id: 'amenaza',   patron: 'despedir|despido|echar|echarte|castigar|bronca|a la calle|estás fuera|estas fuera|te vas|fuera de aquí' },
  { id: 'presion',   patron: 'prisa|plazo|plazos|urgente|urgencia|entrega|entregar|ya mismo|cuanto antes|deadline|corriendo|deprisa' },
  { id: 'despedida', patron: 'adiós|adios|hasta luego|me voy|nos vemos|chao|bye|me piro|hasta mañana' },
  { id: 'generico',  patron: '.*' }
];

export const RESPUESTAS = {
  ana: {
    saludo: [
      "Hola. Estoy con una revisión, pero te escucho.",
      "Buenas. Si es rápido, mejor, que tengo el editor abierto."
    ],
    precio: [
      "Si subimos el precio, que sea porque el producto lo vale, no porque toque.",
      "Más caro con estos bugs es pedirle al cliente que pague nuestra deuda técnica."
    ],
    trabajo: [
      "El módulo de pagos ya no pierde datos, pero hay dos casos límite que no me gustan.",
      "Voy avanzando, aunque cada arreglo destapa otra cosa que estaba mal desde el principio."
    ],
    ordenador: [
      "Mi portátil va a pedales, pero mientras compile no pienso parar.",
      "Se me ha roto el equipo y llevo media mañana peleándome con él para no perder el hilo."
    ],
    sueldo: [
      "No te voy a mentir: si hablamos de sueldo, hablamos de que llevo dos años igual.",
      "Un aumento estaría bien, pero prefiero que primero arreglemos lo que está roto."
    ],
    elogio: [
      "Gracias, pero el mérito es que por fin nadie tiene que parchear esto a mano.",
      "Me alegra oírlo. Aun así, yo todavía le veo tres cosas que mejorar."
    ],
    amenaza: [
      "Puedes despedirme, pero quien herede esto tardará meses en entenderlo.",
      "Si me echas por decir la verdad sobre el código, allá tú, pero la verdad sigue ahí."
    ],
    presion: [
      "Puedo correr, pero si me apuras vas a recibir algo rápido y mal hecho.",
      "Dame dos días y te lo entrego bien; dame dos horas y te traigo un desastre."
    ],
    despedida: [
      "Vale, me pongo otra vez con esto. Hasta luego.",
      "Nos vemos. Y no toques el código mientras no esté, por favor."
    ],
    generico: [
      "No sé muy bien por dónde vas, pero apunta: lo urgente es la validación.",
      "Entendido. Yo sigo con lo mío, que no se va a arreglar solo."
    ]
  },

  bruno: {
    saludo: [
      "Buenas. Estaba mirando métricas, que es lo que da de comer.",
      "Hola, jefe. Te escucho mientras el gráfico de latencia sube solo."
    ],
    precio: [
      "Subir el precio es la optimización más barata que existe: cero líneas de código.",
      "Si un cliente se va por veinte euros, nunca fue nuestro cliente objetivo."
    ],
    trabajo: [
      "El proyecto avanza y el sistema aguanta, aunque no gracias a nuestra arquitectura.",
      "Tenemos deuda técnica como para hipotecar el próximo trimestre, pero es asumible."
    ],
    ordenador: [
      "Un ordenador roto es un cuello de botella con teclado: sustitúyelo o reasigna carga.",
      "Ese equipo lleva más tiempo caído que nuestros servidores en horario laboral."
    ],
    sueldo: [
      "Subir sueldos sin subir ingresos es escalar el gasto, y el gasto no escala bien.",
      "Si quieres pagar más, perfecto: dime de qué línea del presupuesto lo saco."
    ],
    elogio: [
      "Gracias. Acepto el halago, aunque el mérito es del sistema y no de la gente.",
      "Me alegra que lo veas así; yo ya lo tenía apuntado en mi informe."
    ],
    amenaza: [
      "Puedes prescindir de mí, pero el bus factor acaba de bajar a uno: tú.",
      "Despídeme si quieres; quien entre tendrá que leer mis comentarios, y son largos."
    ],
    presion: [
      "Comprimir plazos sin recortar alcance no es liderazgo, es aritmética creativa.",
      "Podemos entregar ya, si aceptas que el lanzamiento haga de fase de pruebas."
    ],
    despedida: [
      "Hasta luego. Voy a revisar los logs, que nunca duermen.",
      "Nos vemos. Intentaré que la infraestructura siga en pie mientras no estás."
    ],
    generico: [
      "Interesante, pero aterrízalo: qué métrica mejora y cuánto cuesta.",
      "Anotado. Lo traduzco a requisitos, que es lo único que entiende el equipo."
    ]
  },

  carla: {
    saludo: [
      "¡Buenas! Justo salía de un ticket que me ha quitado diez años de vida.",
      "Hola, jefe. Vengo de aguantar a un cliente, así que cuidado conmigo hoy."
    ],
    precio: [
      "¡Que no suba el precio, que me comen viva! Ya me llaman ladrones por WhatsApp.",
      "Si subimos un euro, mañana tengo cuarenta correos y tres amenazas de denuncia."
    ],
    trabajo: [
      "El producto va, pero cada dos por tres se cae y me toca poner la cara a mí.",
      "Estoy hasta arriba de bugs, y el cliente no distingue un fallo de una traición."
    ],
    ordenador: [
      "¡Mi ordenador se ha muerto otra vez! Ha hecho un ruido y se ha apagado del todo.",
      "Si no me arreglas el equipo, te juro que acabo tomando notas en servilletas."
    ],
    sueldo: [
      "¡Ay, el sueldo! Por ese dinero casi me sale más a cuenta llorar en casa.",
      "Un aumento me vendría de lujo, que llevo meses pagando el transporte de mi bolsillo."
    ],
    elogio: [
      "¡Ay, gracias! Aunque no me lo digas mucho, que me malacostumbro.",
      "Gracias, jefe. Me lo apunto, que hoy hacía falta oír algo bonito."
    ],
    amenaza: [
      "¿Despedirme? ¡Perfecto, así duermo! Aunque te aviso: el teléfono seguirá sonando.",
      "Me echas y en dos días vuelves a llamarme, porque nadie aguanta a estos clientes."
    ],
    presion: [
      "¡Que me metes prisa! Vale, vale, pero luego no llores si algo se rompe.",
      "Entrego ya, pero lo entrego con los dedos cruzados y rezando, ¿eh?"
    ],
    despedida: [
      "¡Me piro! Si alguien llama enfadado, no estoy, que conste.",
      "Hasta luego, jefe. Voy a ver si desconecto, aunque el móvil no me deje."
    ],
    generico: [
      "Ni idea de qué me hablas, pero seguro que acaba siendo culpa mía.",
      "Vale, jefe, lo que tú digas. Yo mientras sigo apagando fuegos."
    ]
  },

  dani: {
    saludo: [
      "¡Hola, jefe! Justo estaba leyendo la documentación, ¡bueno, intentándolo!",
      "¡Buenas! Qué ganas tenía de que llegaras y me explicaras una cosa."
    ],
    precio: [
      "¿Subimos el precio? ¡Uy, yo de números entiendo poco, pero suena importante!",
      "Yo pago lo que haga falta, aunque mi sueldo de becario no da para mucho, jeje."
    ],
    trabajo: [
      "¡Estoy con una tarea nueva! Aún no sé muy bien qué hace, pero me encanta.",
      "He avanzado un montón, creo. Bueno, he borrado algo, pero creo que se recupera."
    ],
    ordenador: [
      "¡Se me ha roto el ordenador! Bueno, creo que he sido yo, pero no estoy seguro.",
      "Lo he reiniciado tres veces y sigue igual; ¿eso es malo, verdad?"
    ],
    sueldo: [
      "¿Un aumento? ¡Uy! Yo encantado, aunque creo que primero tendría que ser fijo, ¿no?",
      "Con lo que cobro me llega justo, pero aprendo mucho, ¡eso también cuenta!"
    ],
    elogio: [
      "¡Gracias, jefe! Me voy a apuntar lo que he hecho para repetirlo.",
      "¿En serio? ¡Qué ilusión! Se lo voy a contar a mi madre ahora mismo."
    ],
    amenaza: [
      "¿Despedirme? ¡No, por favor! Prometo no volver a tocar la base de datos.",
      "Me puedes echar, pero antes dime qué he hecho mal, ¡para no repetirlo!"
    ],
    presion: [
      "¡Voy, voy! Aunque todavía no sé cómo se hace, ¿me lo explicas rápido?",
      "Prisa, vale. ¿Y si lo hago mal por ir rápido, luego me riñes o no?"
    ],
    despedida: [
      "¡Adiós, jefe! Mañana vengo con más preguntas, aviso.",
      "Hasta luego. Voy a apuntar todo lo de hoy antes de que se me olvide."
    ],
    generico: [
      "¡Ah, vale! No lo he entendido del todo, ¿me lo repites con un ejemplo?",
      "Interesante. ¿Eso lo apunto en el documento o en mi cuaderno?"
    ]
  },

  elena: {
    saludo: [
      "Hola. Estaba ajustando espaciados; ahora mismo todo me parece mal.",
      "Buenas. Te escucho, pero tengo la rejilla a medio corregir."
    ],
    precio: [
      "Podemos subir el precio si la experiencia lo justifica; si no, es vestir mal el producto.",
      "Caro no es el problema; caro y cutre sí, y ahora mismo roza lo segundo."
    ],
    trabajo: [
      "El producto funciona, pero visualmente hay cosas que no puedo defender.",
      "Voy bien, aunque cada pantalla nueva me obliga a rehacer la anterior."
    ],
    ordenador: [
      "Mi equipo se ha roto y con él la calibración de color; no es un detalle menor.",
      "Sin ordenador no puedo revisar nada, y entregar a ciegas no va a pasar."
    ],
    sueldo: [
      "Un sueldo acorde estaría bien, aunque me preocupa más que respetemos el diseño.",
      "Si hablamos de dinero, hablemos también de contratar a alguien que me ayude."
    ],
    elogio: [
      "Gracias. Me alegra que se note, porque el detalle solo se nota cuando está bien.",
      "Lo agradezco. Aun así, la pantalla de ajustes sigue sin convencerme."
    ],
    amenaza: [
      "Puedes despedirme, pero el criterio visual se va conmigo y eso no se documenta.",
      "Si me echas por defender el diseño, lo aceptaré, pero no firmaré algo feo."
    ],
    presion: [
      "Puedo ir más rápido si aceptas que quede mediocre; yo no lo recomiendo.",
      "El plazo es tuyo, la calidad es mía, y no pienso canjear una por otra."
    ],
    despedida: [
      "Hasta luego. Dejo el archivo ordenado, que luego nadie encuentra nada.",
      "Nos vemos. Voy a seguir con la tipografía, que aún baila un píxel."
    ],
    generico: [
      "No sé si eso encaja en el producto, pero puedo bocetarlo y lo vemos.",
      "Entendido. Lo tendré en cuenta si no rompe la coherencia visual."
    ]
  }
};

export const COLETILLAS = {
  moralBaja: {
    ana:   ["Aunque hoy me cuesta arrancar, la verdad."],
    bruno: ["Lo cual, estadísticamente, no mejora el ánimo."],
    carla: ["Y encima hoy no tengo ni ganas de reírme."],
    dani:  ["Pero bueno, ¡mañana será mejor, seguro!"],
    elena: ["Últimamente todo me parece cuesta arriba."]
  },
  ordenadorRoto: {
    ana:   ["Y con este trasto, cada minuto cuesta el doble."],
    bruno: ["Mi equipo caído es un punto único de fallo, por cierto."],
    carla: ["Y mi ordenador sigue muerto, por si te interesa."],
    dani:  ["Ah, y mi ordenador hace cosas raras, por cierto."],
    elena: ["Sin equipo, lo que ves en pantalla no está revisado."]
  },
  precioCaro: {
    ana:   ["Y con este precio, al cliente se le acaban las excusas."],
    bruno: ["A ese precio, el margen deja de ser una teoría."],
    carla: ["Y a este precio, los clientes me van a comer viva."],
    dani:  ["Ojalá pudiera pagarlo, con mi sueldo no llego."],
    elena: ["A este precio, lo mínimo es que se vea impecable."]
  },
  sinEnergia: {
    ana:   ["Aviso: llevo ocho horas seguidas y ya no rindo."],
    bruno: ["Mi rendimiento sigue una curva decreciente, y va por el suelo."],
    carla: ["Estoy fundida, aviso, que hoy no me queda ni voz."],
    dani:  ["Estoy cansadísimo, pero aguanto, ¡tranquilo!"],
    elena: ["Necesito parar, el pulso ya no me da para ajustar píxeles."]
  }
};
