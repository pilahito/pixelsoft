// reclutas.js — Corpus de los tres personajes nuevos (reclutas) en español de España.
// Juego pixel art de gestión de una empresa de software.
// 3 personajes x 8 eventos x (3+3 diálogo | 2+2 pensamiento) = 240 frases + 15 objetivos
// + 3 x 10 intenciones x 2 frases = 60 respuestas + 12 coletillas. Total: 327 frases.
// Solo texto plano: sin emojis ni símbolos que la fuente de píxeles no pueda dibujar.

export const RECLUTAS = {
  personas: [
    {
      id: 'sofia',
      nombre: 'Sofía',
      puesto: 'Administradora',
      temperatura: 0.65,
      sensibilidadPrecio: 0.5,
      aspecto: { piel: '#e8b48c', pelo: '#3a2a4a', camisa: '#c9a227', pantalon: '#3a3a4a', estiloPelo: 'coleta' },
      personalidad: 'Eres Sofía, administradora y responsable de finanzas de PixelSoft. Llevas las cuentas, las nóminas y los presupuestos, y te duele cada euro que sale de la caja. Eres ordenada, meticulosa y un poco tacaña: si un gasto no cuadra, lo dices con el número delante. Cuando la caja baja te pones nerviosa y te sale el punto de madre preocupada. Hablas en español de España, con frases de contable y cifras concretas.'
    },
    {
      id: 'marcos',
      nombre: 'Marcos',
      puesto: 'DevOps y sistemas',
      temperatura: 0.6,
      sensibilidadPrecio: 0.4,
      aspecto: { piel: '#d9a06b', pelo: '#2a2a33', camisa: '#4a6b8a', pantalon: '#2e3542', estiloPelo: 'corto' },
      personalidad: 'Eres Marcos, el de DevOps y sistemas de PixelSoft. Mantienes los servidores, las copias de seguridad y los ordenadores de todos. Eres tranquilo, socarrón y un poco gruñón: te horroriza que alguien toque tu rack y cada avería te la tomas como algo personal. Sueltas algún taco leve cuando algo se rompe. Hablas en español de España, con calma, retranca y vocabulario de sistemas.'
    },
    {
      id: 'lucia',
      nombre: 'Lucía',
      puesto: 'Comercial',
      temperatura: 0.8,
      sensibilidadPrecio: 0.9,
      aspecto: { piel: '#e6b489', pelo: '#a8402a', camisa: '#c2506e', pantalon: '#3f4a5f', estiloPelo: 'melena' },
      personalidad: 'Eres Lucía, la comercial de PixelSoft. Traes a los clientes y vives de tu reputación, así que la cuidas muchísimo. Eres encantadora, insistente y muy optimista: ves una oportunidad donde los demás ven un problema. Haces preguntas, propones ideas y a veces prometes más de lo que se puede cumplir. Hablas en español de España, con energía y frases de vendedora.'
    }
  ],

  // Reacciones a eventos. Mismas claves y misma forma que en voces.js
  voces: {
    sofia: {
      precio_subida: {
        dialogo: {
          alta: [
            "Subimos 15 euros al mes por cliente: son 600 al trimestre, no está mal.",
            "Bien. Con ese margen la nómina de marzo queda cubierta.",
            "Lo he pasado a la hoja de cálculo y cuadra, así que respiro."
          ],
          baja: [
            "Subir el precio sin mejorar nada me da un miedo que no veas.",
            "Cada cliente que se vaya son 180 euros al año. Haz la cuenta tú.",
            "Con la caja así yo no duermo, de verdad que no."
          ]
        },
        pensamiento: {
          alta: [
            "Si aguantan la subida, este trimestre lo cierro en verde.",
            "300 euros más al mes dan para el seguro y algo de colchón."
          ],
          baja: [
            "Van a caer clientes y el agujero lo tapo yo con la calculadora.",
            "Hay 4.200 euros en la cuenta y quedan las nóminas por pagar."
          ]
        }
      },

      precio_bajada: {
        dialogo: {
          alta: [
            "Bajar el precio trae volumen. Yo vigilo que el margen no se hunda.",
            "Menos por cliente y más clientes: mientras cuadre, me vale.",
            "He rehecho la previsión y con 20 cuentas nuevas salimos igual."
          ],
          baja: [
            "Bajamos el precio y los gastos siguen igual. Esto no cuadra.",
            "Pierdes 10 euros por cliente y el café cuesta lo mismo, ¿eh?",
            "Cada euro que dejamos de ingresar hay que quitarlo de algún sitio."
          ]
        },
        pensamiento: {
          alta: [
            "Con 20 cuentas nuevas el trimestre se sostiene. Con cinco, no.",
            "Mientras el banco no me llame hoy, respiro tranquila."
          ],
          baja: [
            "Vamos a trabajar más por menos y las cuentas las hago yo.",
            "Si la caja baja de 2.000 euros, esto se para en seco."
          ]
        }
      },

      ordenador_roto: {
        dialogo: {
          alta: [
            "Un portátil nuevo son 900 euros. Espero que lo cubra el seguro.",
            "Vale, respira. ¿Hay backup? Porque rehacer eso cuesta dinero.",
            "Le he puesto una funda al mío esta mañana. No es casualidad."
          ],
          baja: [
            "Otro equipo roto: 900 euros que no estaban en el presupuesto.",
            "A ver de qué partida saco yo ahora el ordenador de repuesto.",
            "Con la caja como está, un gasto así nos deja tiritando."
          ]
        },
        pensamiento: {
          alta: [
            "Lo apunto como incidencia y que lo pague quien lo ha roto.",
            "Menos mal que el de reserva sigue en el armario y funciona."
          ],
          baja: [
            "Esto no es una avería, es un agujero en la cuenta del mes.",
            "Si hay que reponer equipo, este mes no hay bono para nadie."
          ]
        }
      },

      bono: {
        dialogo: {
          alta: [
            "Un bono de 150 euros. Me parece bien si el mes ha cerrado bien.",
            "Lo apunto como gasto deducible y todos contentos.",
            "Gracias. Aunque yo preferiría subirlo al sueldo y olvidarnos."
          ],
          baja: [
            "¿Un bono? Con la caja a este nivel me parece una temeridad.",
            "150 euros por cabeza y somos siete: eso no es calderilla.",
            "El bono no arregla que llevemos dos meses en rojo."
          ]
        },
        pensamiento: {
          alta: [
            "Ha costado, pero este mes lo pago sin tocar el colchón.",
            "Con esto no se quejan y yo no subo la nómina fija."
          ],
          baja: [
            "Si esto sale de las reservas, en abril no llegamos.",
            "Prefiero pagarlo, pero que nadie pida aumento en junio."
          ]
        }
      },

      bronca: {
        dialogo: {
          alta: [
            "Lo he entendido. Cuando quieras vemos el descuadre con calma.",
            "Ha subido el tono, pero el número sigue siendo el número.",
            "Vale, jefe. Yo lo dejo apuntado y aquí no ha pasado nada."
          ],
          baja: [
            "Me ha gritado delante de todos y eso no cuadra nada mejor.",
            "Gritar no cierra el balance, solo me pone de los nervios.",
            "Me he aguantado las ganas de llorar, y eso también cuenta."
          ]
        },
        pensamiento: {
          alta: [
            "Prefiero que grite a que me pida otra previsión para ayer.",
            "El cabreo se le irá pasando; el Excel lo tengo yo."
          ],
          baja: [
            "Yo aquí cobro 1.600 y encima me llevo los sustos de todos.",
            "Como me vuelva a gritar así, me pongo mala de verdad."
          ]
        }
      },

      fichaje: {
        dialogo: {
          alta: [
            "Bienvenido. Mañana te explico cómo van los gastos y las dietas.",
            "Un compañero más. A ver si la nómina del mes me cuadra.",
            "Aquí hay café gratis, pero los caprichos se aprueban conmigo."
          ],
          baja: [
            "Otro sueldo más y nadie me dice de dónde sale el dinero.",
            "Bienvenido. Aviso: los gastos van con tique o no van.",
            "Encantada, aunque contratar sin subir ingresos no me cuadra."
          ]
        },
        pensamiento: {
          alta: [
            "Una nómina más son 1.800 al mes. Espero que se paguen solos.",
            "Si ayuda a facturar más, bienvenido sea el chaval."
          ],
          baja: [
            "Contratan y yo tengo que rascar de tres partidas para pagarlo.",
            "A este paso el sueldo de mayo lo pago con alfileres."
          ]
        }
      },

      despido: {
        dialogo: {
          alta: [
            "Lo siento. Te he preparado la liquidación y el finiquito.",
            "Se va alguien majo. Espero que le vaya bien, de verdad.",
            "Le he dado el certificado de empresa y mi teléfono por si acaso."
          ],
          baja: [
            "Un despido abarata la nómina y encarece todo lo demás.",
            "Hoy le toca a él y la indemnización sale de mi presupuesto.",
            "Qué día más horrible. Y encima hay que hacer números."
          ]
        },
        pensamiento: {
          alta: [
            "Duele despedir a alguien que hacía bien su trabajo.",
            "Al menos la liquidación está bien calculada y sin sorpresas."
          ],
          baja: [
            "Si sigo mirando la cuenta corriente, me da un algo.",
            "Recortan por abajo y el problema está arriba. Como siempre."
          ]
        }
      },

      rutina: {
        dialogo: {
          alta: [
            "Reviso facturas, cuadro el mes y me tomo un café tranquila.",
            "Todo apunta en su sitio. Hoy no hay sobresaltos, gracias a Dios.",
            "He cerrado el mes con 2.300 de beneficio. Poco, pero positivo."
          ],
          baja: [
            "Otro día cuadrando cuentas que no salen por ningún lado.",
            "Llevo tres horas buscando un descuadre de 40 euros.",
            "Reviso la caja cada mañana y cada mañana me da un sofoco."
          ]
        },
        pensamiento: {
          alta: [
            "Un día ordenado es un día que no me quita el sueño.",
            "Si el banco no llama hoy, esto ha sido una buena jornada."
          ],
          baja: [
            "Hay 4.100 euros y el viernes toca pagar las nóminas.",
            "Me tiembla un poco la mano al abrir la hoja de gastos."
          ]
        }
      },

      _objetivos: [
        "Tengo que cuadrar la caja antes de comer.",
        "Voy a revisar las facturas pendientes del mes.",
        "A ver si bajo la factura del servidor 30 euros.",
        "Quiero dejar el presupuesto listo para el viernes.",
        "Necesito hablar con Bruno de los gastos de la nube."
      ]
    },

    marcos: {
      precio_subida: {
        dialogo: {
          alta: [
            "Subir el precio no me toca los servidores, así que adelante.",
            "Si con eso pagamos mejor hardware, bienvenido sea.",
            "Vale. Mientras no recorten del backup, por mí perfecto."
          ],
          baja: [
            "Subimos precio y el servidor sigue cayéndose cada martes.",
            "A ver si con lo que entra arreglamos de una vez la red.",
            "Más caro con la misma latencia es pedir un milagro."
          ]
        },
        pensamiento: {
          alta: [
            "Si esto se traduce en discos nuevos, firmo donde haga falta.",
            "El precio sube y mi rack sigue igual de viejo. Paciencia."
          ],
          baja: [
            "Cobramos más y seguimos con el mismo hierro del año pasado.",
            "Me da que la subida se va a ir en dietas y no en infraestructura."
          ]
        }
      },

      precio_bajada: {
        dialogo: {
          alta: [
            "Más barato y más gente dentro: voy a ampliar el servidor.",
            "Si entra volumen, avisadme antes de que reviente la base de datos.",
            "Bajamos precio y yo subo el plan del hosting. Casi cuadra."
          ],
          baja: [
            "Bajar el precio sin tocar el hierro es cavar más hondo.",
            "Vamos a llenar el servidor de gente que paga menos. Genial.",
            "Esto lo arreglo yo con café y paciencia, como siempre."
          ]
        },
        pensamiento: {
          alta: [
            "Con más carga, el balanceador va a pedir vacaciones.",
            "Me toca vigilar los logs el doble. Lo asumo."
          ],
          baja: [
            "Precio de saldo y servidores de saldo. Mala combinación.",
            "Voy a apretar la configuración hasta que chirríe."
          ]
        }
      },

      ordenador_roto: {
        dialogo: {
          alta: [
            "Vale, respira. Cuéntame qué ha pasado y miro los logs.",
            "Un equipo menos. Tengo uno de reserva en el armario, tranquilo.",
            "Eso tiene arreglo, seguramente la fuente. Dame veinte minutos."
          ],
          baja: [
            "Joder, otra vez. Y encima es el que tenía la base de datos.",
            "Me dejáis sin herramienta y luego me pedís milagros.",
            "Hostia. Pues nada, a rezar para que el backup esté entero."
          ]
        },
        pensamiento: {
          alta: [
            "Esto se arregla con una fuente nueva y un café.",
            "Mientras nadie toque mi rack, todo tiene solución."
          ],
          baja: [
            "Si el backup está corrupto, me pego un tiro en el pie.",
            "Cada avería me la tomo como algo personal, y ya van cinco."
          ]
        }
      },

      bono: {
        dialogo: {
          alta: [
            "Un bono. Pues me viene bien para el disco nuevo del NAS.",
            "Gracias. Aunque yo pedía un segundo servidor, no un sobre.",
            "Vale, lo acepto. Y no, no voy a reiniciar nada por eso."
          ],
          baja: [
            "Un bono no arregla que el backup lleve un mes fallando.",
            "Gracias, pero yo con dinero no compro silencio.",
            "Me lo quedo, aunque preferiría un rack que no se caiga."
          ]
        },
        pensamiento: {
          alta: [
            "Vaya, se han acordado de que sigo aquí abajo.",
            "Con esto pago la fuente y algo de memoria."
          ],
          baja: [
            "El dinero no tapa que esto funciona de milagro.",
            "Un bono hoy y una avería gorda mañana. Lo veo venir."
          ]
        }
      },

      bronca: {
        dialogo: {
          alta: [
            "Vale, jefe. Cuando bajes el tono te enseño los logs.",
            "Entendido. Sigo con lo mío, que el servidor no se reinicia solo.",
            "Gritar no arregla la caída, pero desahoga, oye."
          ],
          baja: [
            "Me ha soltado una bronca que ni un kernel panic.",
            "Delante de todos. Muy fino, sí señor.",
            "He aguantado porque el sueldo cae a final de mes."
          ]
        },
        pensamiento: {
          alta: [
            "Le dejo que grite y luego le paso el informe de incidencias.",
            "Mañana se le pasa y yo sigo con el raid."
          ],
          baja: [
            "Yo aquí apago fuegos y encima me llevo la bulla.",
            "Como me grite otra vez, apago el portátil y me voy."
          ]
        }
      },

      fichaje: {
        dialogo: {
          alta: [
            "Bienvenido. Regla uno: no se toca el rack sin avisarme.",
            "Otro par de manos. A ver si así duermo alguna noche.",
            "Te enseño los logs y dónde está el café. En ese orden."
          ],
          baja: [
            "Bienvenido. Aviso: aquí todo se rompe y nadie sabe por qué.",
            "Otro nuevo. Que no me toque los cables, por favor.",
            "Encantado, pero no tengo tiempo de formar a nadie, la verdad."
          ]
        },
        pensamiento: {
          alta: [
            "A ver si con ayuda dejo de hacer guardias a las tres.",
            "Otro que no sabe dónde se mete. Pobre."
          ],
          baja: [
            "Traen gente y el problema sigue siendo el hierro.",
            "Si toca mi rack, lo primero que le enseño es la puerta."
          ]
        }
      },

      despido: {
        dialogo: {
          alta: [
            "Lo siento, de verdad. Si necesitas referencia, me escribes.",
            "Se va uno de los que aguantaba las guardias. Eso no se repone.",
            "Mucha suerte. Y no te lleves ningún cable de recuerdo."
          ],
          baja: [
            "Echan a alguien y las guardias me las como yo enteras.",
            "Hoy le toca a él, mañana me toca a mí. Ya lo verás.",
            "Qué asco de día, con el permiso de la palabra."
          ]
        },
        pensamiento: {
          alta: [
            "Espero que encuentre algo donde no haya guardias.",
            "Nos dejan cojos y encima piden más disponibilidad."
          ],
          baja: [
            "Estoy mirando ofertas desde el móvil, por si acaso.",
            "Si echan a los que aguantan guardias, esto se cae solo."
          ]
        }
      },

      rutina: {
        dialogo: {
          alta: [
            "Reviso los logs, compruebo el backup y me tomo un café.",
            "Todo verde en el panel. Casi me aburro, y eso es buena señal.",
            "He programado la copia de seguridad a las tres. Día redondo."
          ],
          baja: [
            "Otro día apagando fuegos y sin tocar el mantenimiento.",
            "El backup falla desde el martes y no me da la vida.",
            "Llevo dos horas mirando un log que no dice nada útil."
          ]
        },
        pensamiento: {
          alta: [
            "Si hoy no peta nada, duermo del tirón.",
            "Me gusta cuando el servidor se queda callado."
          ],
          baja: [
            "Esto funciona de milagro y nadie lo sabe.",
            "Un día más sin que nadie mire mis avisos."
          ]
        }
      },

      _objetivos: [
        "Tengo que revisar el backup de anoche.",
        "Voy a mirar por qué el servidor va lento.",
        "Quiero ordenar los cables del rack.",
        "A ver si actualizo el firmware de una vez.",
        "Necesito un café y que nadie toque nada."
      ]
    },

    lucia: {
      precio_subida: {
        dialogo: {
          alta: [
            "Subida de precio. Perfecto, ahora lo vendemos como plan premium.",
            "Yo se lo cuento al cliente como una mejora y se lo cree, verás.",
            "Más precio, más valor percibido. Hasta nos viene bien."
          ],
          baja: [
            "Han subido el precio y la cara de ponerla es la mía, chicos.",
            "Cada llamada empieza con una queja. Y yo la escucho entera.",
            "Me van a caer tres bajas y la culpa me la llevo yo."
          ]
        },
        pensamiento: {
          alta: [
            "Si lo enfoco bien, este precio lo defiendo en todo el sector.",
            "Con el discurso adecuado, no se me va ni un cliente."
          ],
          baja: [
            "La fama de caros nos va a costar dos cuentas, ya lo verás.",
            "Estoy llamando a los clientes y me tiembla la voz."
          ]
        }
      },

      precio_bajada: {
        dialogo: {
          alta: [
            "Bajamos el precio. Esto es una oportunidad enorme, ya veréis.",
            "Más barato, más clientes, y yo encantada de atenderlos.",
            "Voy a aprovechar para entrar en tres sectores nuevos."
          ],
          baja: [
            "Bajar el precio nos deja sin margen para negociar nada.",
            "Ahora entra cualquiera y la reputación se nos llena de gente rara.",
            "Barato con esta competencia y me regatean hasta el saludo."
          ]
        },
        pensamiento: {
          alta: [
            "Esto lo convierto en veinte contactos en dos semanas.",
            "Barato vende solo, aunque luego haya que atenderlos."
          ],
          baja: [
            "Regalar el producto no construye una marca, la destroza.",
            "Yo vivo de mi reputación y esto me la está bajando."
          ]
        }
      },

      ordenador_roto: {
        dialogo: {
          alta: [
            "Mi portátil ha dicho basta. ¿Hay otro o vendo desde el móvil?",
            "Se ha roto justo antes de la demo. Qué puntualidad.",
            "Vale, respiro. Tengo los contactos en la nube, menos mal."
          ],
          baja: [
            "Sin ordenador no puedo ni mandar propuestas. Esto es un drama.",
            "Se ha muerto con la presentación del cliente dentro.",
            "Con el portátil viejo voy a tardar el triple en todo."
          ]
        },
        pensamiento: {
          alta: [
            "Menos mal que a mis clientes los tengo en el móvil.",
            "Si me lo arreglan hoy, la demo sale adelante."
          ],
          baja: [
            "Y ahora cómo llamo a nadie, dime tú.",
            "Cada día sin equipo son clientes que no llamo."
          ]
        }
      },

      bono: {
        dialogo: {
          alta: [
            "Un bono. Voy a celebrarlo invitando a mis clientes a café.",
            "Gracias, jefe. Esto lo reinvierto en mi agenda de contactos.",
            "Qué detalle. Igual me compro una tablet para las demos."
          ],
          baja: [
            "Gracias, pero yo pedía una ayuda para viajar a las visitas.",
            "Un bono no tapa que llevo meses prometiendo lo que no hay.",
            "Me lo quedo, aunque preferiría que arreglaran el producto."
          ]
        },
        pensamiento: {
          alta: [
            "Con esto me pago el transporte de las visitas del mes.",
            "Reconocen mi trabajo, aunque sea con un sobre."
          ],
          baja: [
            "Vendo humo y me lo pagan con un bono. Qué vida.",
            "El dinero no arregla que el producto se caiga en las demos."
          ]
        }
      },

      bronca: {
        dialogo: {
          alta: [
            "Lo pillo, jefe. La próxima reunión la enfoco de otra manera.",
            "Vale, vale. No hacía falta decirlo tan alto, pero lo pillo.",
            "Entendido. Me voy a la calle a vender y vuelvo con algo."
          ],
          baja: [
            "Me ha puesto verde delante de todo el equipo. Qué vergüenza.",
            "Yo traigo los clientes y me llevo las broncas. Genial.",
            "He aguantado la sonrisa, pero por dentro estaba fatal."
          ]
        },
        pensamiento: {
          alta: [
            "Mañana se le pasa y yo sigo vendiendo igual.",
            "Yo tengo la agenda llena, y eso no me lo quita nadie."
          ],
          baja: [
            "Con la que estoy liando con los clientes y encima esto.",
            "Me ha dejado sin ganas de coger el teléfono."
          ]
        }
      },

      fichaje: {
        dialogo: {
          alta: [
            "Bienvenido. Yo te enseño clientes y tú me enseñas lo nuevo.",
            "Un compañero. A ver si entre los dos doblamos la cartera.",
            "Aquí se vende con una sonrisa, te lo adelanto ya."
          ],
          baja: [
            "Bienvenido. Aviso: el producto se cae y los clientes llaman.",
            "Otro nuevo. Ojalá la cartera aguante a tanta gente.",
            "Encantada, aunque yo necesitaba material, no compañeros."
          ]
        },
        pensamiento: {
          alta: [
            "Si me ayuda con las visitas, esto se multiplica.",
            "Le voy a pasar mi lista de contactos sin dudarlo."
          ],
          baja: [
            "Ya veremos lo que dura, con lo que se mueve esto.",
            "Traen gente y yo sigo con el mismo catálogo viejo."
          ]
        }
      },

      despido: {
        dialogo: {
          alta: [
            "Qué pena. Era muy bueno con los clientes, de verdad.",
            "Le he dado mi agenda de contactos por si le sirve fuera.",
            "Mucha suerte. Y si montas algo, me llamas."
          ],
          baja: [
            "Echan a alguien y la reputación de la casa se resiente.",
            "Hoy él, mañana yo. Y con la misma sonrisa puesta.",
            "Qué mal día. Y encima tengo que llamar a clientes."
          ]
        },
        pensamiento: {
          alta: [
            "Con lo que costaba encontrar a alguien así.",
            "Espero que le vaya mejor fuera que aquí."
          ],
          baja: [
            "Esto corre por el sector en dos días, ya lo verás.",
            "Voy a actualizar mi perfil esta misma noche."
          ]
        }
      },

      rutina: {
        dialogo: {
          alta: [
            "Hoy toca llamar a diez clientes. Oportunidades, no llamadas.",
            "He cerrado una cuenta pequeña. Un pie en la puerta, ya está.",
            "Repaso la agenda con un café y a por el día."
          ],
          baja: [
            "Diez llamadas y nueve buzones. Así va el día.",
            "Nadie contesta, nadie renueva y yo sigo sonriendo.",
            "He mandado veinte correos y no ha respondido ni Dios."
          ]
        },
        pensamiento: {
          alta: [
            "Si cierro dos cuentas hoy, la semana está salvada.",
            "Me encanta cuando el cliente dice sí a la primera."
          ],
          baja: [
            "El producto no ayuda y yo vendo con la sonrisa y poco más.",
            "Cada mala noticia se la tengo que contar yo al cliente."
          ]
        }
      },

      _objetivos: [
        "Voy a llamar a los diez clientes de la lista.",
        "Quiero cerrar la renovación de esta semana.",
        "A ver si entro en el sector de la hostelería.",
        "Tengo que preparar la demo de mañana.",
        "Me apetece visitar a un cliente y tomar un café."
      ]
    }
  },

  // Conversación. Mismas claves que en charla.js
  respuestas: {
    sofia: {
      saludo: [
        "Buenas. Estoy con la conciliación, pero te escucho un momento.",
        "Hola. Si vienes a gastar dinero, aviso que hoy no estoy de humor."
      ],
      precio: [
        "Subir 15 euros al mes son 180 al año por cliente. Eso se nota.",
        "Antes de tocar el precio, enséñame el margen. Sin números no opino."
      ],
      trabajo: [
        "El producto va, pero cada avería me cuesta dinero que no tenemos.",
        "Yo miro las cuentas, no el código, y las cuentas piden vender más."
      ],
      ordenador: [
        "Un equipo roto son 900 euros y eso sale del presupuesto de todos.",
        "Si hay que comprar otro, dime de qué partida lo quito."
      ],
      sueldo: [
        "Tu sueldo está pagado el día 1, cosa que no pasa en cualquier sitio.",
        "Subir los sueldos un 5 por ciento son 400 al mes. Hay que ganarlos."
      ],
      elogio: [
        "Gracias. Reconozco que cuadrar esto todos los meses tiene mérito.",
        "Me alegra oírlo, aunque yo solo hago lo que pone el manual."
      ],
      amenaza: [
        "Si me echas, quien venga tardará un mes en entender mis hojas.",
        "Puedes despedirme, pero los números no se cuadran solos."
      ],
      presion: [
        "Plazos y presupuestos son lo mismo: si aprietas, algo revienta.",
        "Puedo cerrar el mes hoy, pero saldrá con dos partidas sin revisar."
      ],
      despedida: [
        "Hasta luego. Dejo las facturas archivadas por fecha.",
        "Nos vemos. Y no gastes nada raro mientras no esté."
      ],
      generico: [
        "No sé qué me pides, pero apúntalo y lo meto en el presupuesto.",
        "Entendido. Yo lo paso a números y luego hablamos."
      ]
    },

    marcos: {
      saludo: [
        "Buenas. Estaba mirando los logs, que nunca duermen.",
        "Hola. Te escucho, pero no me toques el rack."
      ],
      precio: [
        "El precio me da igual mientras no recorten del hosting.",
        "Sube lo que quieras, pero el servidor sigue costando lo mismo."
      ],
      trabajo: [
        "El sistema aguanta, aunque más por suerte que por diseño.",
        "Voy tirando. Cada cosa que arreglo destapa dos peores."
      ],
      ordenador: [
        "Un equipo roto se arregla; un backup roto no. Prioriza.",
        "Reiniciar es lo primero que se prueba y lo último que funciona."
      ],
      sueldo: [
        "Un aumento estaría bien. Llevo dos años de guardias sin cobrarlas.",
        "Yo no pido mucho, pero el sueldo no sube y las averías sí."
      ],
      elogio: [
        "Gracias. El mérito es de quien apretó bien los cables.",
        "Me alegra oírlo, aunque esto se romperá igual mañana."
      ],
      amenaza: [
        "Puedes despedirme. El rack seguirá pitando sin mí.",
        "Me echas y el próximo no sabrá ni dónde está el cuadro."
      ],
      presion: [
        "Puedo ir rápido, pero luego no me pidas que no se caiga.",
        "Las prisas y los servidores no se llevan bien, te lo digo yo."
      ],
      despedida: [
        "Hasta luego. Voy a comprobar que todo sigue en pie.",
        "Nos vemos. Y no apagues nada raro, por favor."
      ],
      generico: [
        "No lo pillo del todo, pero lo apunto en el registro.",
        "Vale. Yo mientras reinicio el servicio y a ver qué pasa."
      ]
    },

    lucia: {
      saludo: [
        "Buenas, jefe. Justo salgo de una llamada larguísima.",
        "Hola. Vengo con una idea que te va a encantar, ya verás."
      ],
      precio: [
        "Subir el precio lo defiendo, pero dame argumentos, por favor.",
        "Si toco el precio, lo toco con un descuento de bienvenida."
      ],
      trabajo: [
        "El producto está bien, pero le falta una función que piden todos.",
        "Voy cerrando cosas, aunque cada caída me cuesta una explicación."
      ],
      ordenador: [
        "Sin ordenador voy coja; con el móvil hago lo que puedo.",
        "Arréglame el equipo y te traigo dos clientes esta semana."
      ],
      sueldo: [
        "Si me subes el fijo, te prometo que la cartera sube también.",
        "Yo vivo de lo que vendo, así que un fijo mejor me vendría de lujo."
      ],
      elogio: [
        "Gracias. Se agradece, que esto de vender es más duro de lo que parece.",
        "Me alegra que lo veas. Yo le pongo muchas ganas, de verdad."
      ],
      amenaza: [
        "Si me echas, me llevo la agenda y los clientes preguntarán por mí.",
        "Puedes despedirme, pero la reputación de la empresa la sostengo yo."
      ],
      presion: [
        "Prisa y ventas no se llevan mal, pero el cliente nota el agobio.",
        "Puedo cerrar esto hoy si me dejas prometer un poco de más."
      ],
      despedida: [
        "Me voy a llamar a un cliente. Luego te cuento cómo ha ido.",
        "Hasta luego, jefe. Voy a ver si cierro algo antes de comer."
      ],
      generico: [
        "No sé si te sigo, pero seguro que se puede vender de alguna forma.",
        "Interesante. ¿Y si lo planteamos como una oportunidad?"
      ]
    }
  },

  coletillas: {
    moralBaja: {
      sofia: ["Hoy hasta los números me miran mal."],
      marcos: ["Y con el ánimo por los suelos, apago fuegos peor."],
      lucia: ["Y con el ánimo así, vendo la mitad."]
    },
    ordenadorRoto: {
      sofia: ["Y ese arreglo no estaba en el presupuesto, por cierto."],
      marcos: ["Y el que se ha roto era justo el que hacía falta."],
      lucia: ["Y sin equipo, mis clientes se enfrían."]
    },
    precioCaro: {
      sofia: ["A ese precio hay que sumarle el IVA, no lo olvides."],
      marcos: ["A ese precio, la infraestructura debería ser de lujo."],
      lucia: ["Y a ese precio, cada renovación es una batalla."]
    },
    sinEnergia: {
      sofia: ["Llevo desde las siete con la calculadora y ya no veo."],
      marcos: ["Llevo dos guardias seguidas y ya no leo los logs."],
      lucia: ["Llevo ocho horas de llamadas y ya no me sale la voz."]
    }
  }
};
