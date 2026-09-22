// voces.js — Corpus de diálogos y pensamientos en español de España.
// Juego pixel art de gestión de una empresa de software.
// 5 personajes x 8 eventos x (3+3 diálogo | 2+2 pensamiento) = 400 frases + 25 objetivos.
// Solo texto plano: sin emojis ni símbolos que la fuente de píxeles no pueda dibujar.

export const VOCES = {
  ana: {
    precio_subida: {
      dialogo: {
        alta: [
          "Subir el precio sin mejorar nada es pedir más por lo mismo.",
          "Si el producto aguanta, el precio aguanta. De momento aguanta.",
          "Los clientes se quejan, pero seguirán pagando si funciona."
        ],
        baja: [
          "Otra vez subiendo el precio y mirando para otro lado.",
          "Que se lo cuenten a los del ticket de las once, no a mí.",
          "Yo aviso: esto se nos va a caer encima en dos semanas."
        ]
      },
      pensamiento: {
        alta: [
          "Mientras no me toquen el código, que suban lo que quieran.",
          "El precio es cosa del jefe; la calidad es cosa mía."
        ],
        baja: [
          "Nos estamos cargando la confianza del cliente por cuatro euros.",
          "Y encima tendré que arreglar yo el desastre. Como siempre."
        ]
      }
    },

    precio_bajada: {
      dialogo: {
        alta: [
          "Más clientes con menos margen: bienvenidos al volumen.",
          "Barato atrae a gente que llama tres veces al día.",
          "Vale, pero que nadie me pida features nuevas con ese precio."
        ],
        baja: [
          "Bajamos el precio y seguimos con el mismo equipo. Genial.",
          "Regalar el producto no lo hace mejor, solo más popular.",
          "Esto es una liquidación, no una estrategia."
        ]
      },
      pensamiento: {
        alta: [
          "Si entra más gente, al menos el producto se usa.",
          "Prefiero un cliente contento a un precio bonito en la web."
        ],
        baja: [
          "Vamos a trabajar el doble por la mitad. Qué bonito.",
          "El jefe cree que bajar el precio arregla el producto. No."
        ]
      }
    },

    ordenador_roto: {
      dialogo: {
        alta: [
          "Jefe, eso era mi máquina y tenía cosas sin subir.",
          "Le ha dado una patada y ha echado humo. Literal.",
          "Vale, respiro. ¿Hay backup o lloro directamente?"
        ],
        baja: [
          "Otra vez. Es la segunda máquina que me revienta este mes.",
          "Se ha cargado el portátil donde tenía el entorno montado.",
          "Perfecto. Ahora a montar todo desde cero. Otra vez."
        ]
      },
      pensamiento: {
        alta: [
          "Menos mal que hago push cada hora. Casi siempre.",
          "Es un cacharro, se arregla. Lo que no se arregla es el día."
        ],
        baja: [
          "Me estáis quitando las herramientas y pidiendo milagros.",
          "Yo con esto ya no puedo trabajar. Y nadie lo va a notar."
        ]
      }
    },

    bono: {
      dialogo: {
        alta: [
          "Gracias. Me viene bien, no lo voy a negar.",
          "Un bono esta vez sí. Apuntado queda.",
          "Pues mira, hoy invito yo al café de las seis."
        ],
        baja: [
          "Un bono no tapa tres meses de prisas.",
          "Gracias, pero yo pedía una persona más, no un pago extra.",
          "Me lo quedo, pero no compra mi silencio."
        ]
      },
      pensamiento: {
        alta: [
          "Al menos se han acordado de que existimos.",
          "Este mes pago la revisión del coche sin sudar."
        ],
        baja: [
          "Prefiero que arreglen el backlog antes que mi cuenta.",
          "El dinero calma el cabreo, no lo cura."
        ]
      }
    },

    bronca: {
      dialogo: {
        alta: [
          "Lo he entendido. Cuando te calmes, hablamos del bug.",
          "Delante de todos, muy profesional. Gracias.",
          "Vale, jefe. Pero el fallo sigue ahí."
        ],
        baja: [
          "Gritar no arregla el servidor, solo molesta al equipo.",
          "La próxima vez me lo dices a solas o no me lo dices.",
          "He aguantado, pero esto no se me olvida."
        ]
      },
      pensamiento: {
        alta: [
          "Que grite lo que quiera. Yo tengo razón y lo sabe.",
          "Respira, Ana. Mañana será otro ticket urgente."
        ],
        baja: [
          "Me ha humillado delante de Dani. Con lo que cuesta enseñarle.",
          "Si vuelve a pasar, cojo el portátil y me voy a casa."
        ]
      }
    },

    fichaje: {
      dialogo: {
        alta: [
          "Bienvenido. Te enseño el repo y lo que no se toca.",
          "Un par de manos más. Ya era hora, de verdad.",
          "Aquí nadie muerde. Bueno, Bruno a veces."
        ],
        baja: [
          "Otro nuevo y todavía no han cubierto la baja de marzo.",
          "Que no toque producción hasta que yo lo revise.",
          "Encantada, pero yo no tengo tiempo de formar a nadie."
        ]
      },
      pensamiento: {
        alta: [
          "A ver si con ayuda puedo cerrar el sprint sin overtime.",
          "Pobrecillo, no sabe dónde se está metiendo."
        ],
        baja: [
          "Traen gente nueva mientras al que se fue no lo han reemplazado.",
          "Yo ya no puedo ser el manual de la casa y el bombero."
        ]
      }
    },

    despido: {
      dialogo: {
        alta: [
          "Lo siento de verdad. Si necesitas referencia, me escribes.",
          "Se va uno de los buenos. Eso no se repone fácil.",
          "Mucha suerte. Y guarda mi número."
        ],
        baja: [
          "Despedir a quien apagaba fuegos. Brillante.",
          "Hoy ha sido él. Mañana me toca a mí, ya lo verás.",
          "Así que esa era la reunión. Qué asco de día."
        ]
      },
      pensamiento: {
        alta: [
          "Espero que encuentre algo mejor. Lo merece.",
          "Nos dejan cojos y dicen que hay que apretar más."
        ],
        baja: [
          "Estoy mirando ofertas desde el móvil. Por si acaso.",
          "Le han echado por decir lo que yo llevo diciendo un año."
        ]
      }
    },

    rutina: {
      dialogo: {
        alta: [
          "Reviso la pull request y me voy a por un café.",
          "Día tranquilo. Aprovecho y limpio deuda técnica.",
          "Tres tickets, dos reuniones y a casa. Normal."
        ],
        baja: [
          "Otro día de apagar fuegos sin tocar el roadmap.",
          "Sigo esperando que alguien revise mi pull request de ayer.",
          "Pues nada, a rezar para que no pete nada hoy."
        ]
      },
      pensamiento: {
        alta: [
          "Si consigo cerrar el bug de ayer, día redondo.",
          "Me gusta cuando el código se queda quieto y callado."
        ],
        baja: [
          "Un día más sin que nadie mire lo que hago.",
          "Creo que llevo seis semanas sin escribir una feature nueva."
        ]
      }
    },

    _objetivos: [
      "A ver si acabo el refactor hoy.",
      "Voy a revisar los tickets pendientes.",
      "Tengo que hablar con Bruno del servidor.",
      "Me apetece un café y silencio.",
      "Quiero dejar el código limpio antes del viernes."
    ]
  },

  bruno: {
    precio_subida: {
      dialogo: {
        alta: [
          "Precio arriba: el margen respira y el churn dirá la verdad.",
          "Si el producto escala, el precio escala con él. Siguiente.",
          "Subimos. El que se vaya no era nuestro cliente ideal."
        ],
        baja: [
          "Subimos precio con la infraestructura en llamas. Poético.",
          "Aviso: cada queja de Carla es retención cayendo.",
          "Precio premium, servicio de ONG. Un clásico de esta casa."
        ]
      },
      pensamiento: {
        alta: [
          "El precio es posicionamiento, no capricho. Que aprendan.",
          "Si aguantan la subida, tenemos poder de fijación."
        ],
        baja: [
          "Sin mejorar el uptime, esto es subir el precio de un coche sin ruedas.",
          "Nos van a dejar por competidores que cobran la mitad."
        ]
      }
    },

    precio_bajada: {
      dialogo: {
        alta: [
          "Bajamos el precio: cambiamos margen por volumen. Clásico.",
          "Adquisición agresiva. La retención es el problema de mañana.",
          "Barato, sí. Pero cada cliente nuevo cuesta soporte."
        ],
        baja: [
          "Bajar precio es un parche, no una arquitectura.",
          "Vamos a escalar en coste fijo y decrecer en ingreso. Genial.",
          "Esto es deuda técnica, pero de la financiera."
        ]
      },
      pensamiento: {
        alta: [
          "Volumen alto con churn bajo y ganamos. Si no, no.",
          "Prefiero esto a quedarnos sin usuarios, sinceramente."
        ],
        baja: [
          "Regalar el producto no arregla que se caiga cada martes.",
          "El jefe confunde barato con competitivo. Error de novato."
        ]
      }
    },

    ordenador_roto: {
      dialogo: {
        alta: [
          "Hardware caído: coste de reposición, cero discusión. Siguiente.",
          "Le has dado de baja al nodo de desarrollo. Bien hecho.",
          "Comprueba el backup y seguimos. El drama no compila."
        ],
        baja: [
          "Destruir herramienta de trabajo es optimizar a la inversa.",
          "Un portátil menos, un cuello de botella más. Buen ratio.",
          "El coste del hardware es lo de menos; el contexto perdido no."
        ]
      },
      pensamiento: {
        alta: [
          "Si tiene backup, esto son veinte minutos y un ticket.",
          "El hardware se amortiza; la paciencia de un senior, no."
        ],
        baja: [
          "Esto es un fallo de gestión, no un accidente.",
          "Cada vez que rompe algo, la productividad cae en picado."
        ]
      }
    },

    bono: {
      dialogo: {
        alta: [
          "Bono aprobado. Es un buen ROI si evita una renuncia.",
          "Es un incentivo puntual, no un plan de compensación.",
          "Disfrútalo. Y recuerda que esto es variable, no fijo."
        ],
        baja: [
          "Un bono es un parche en un sistema con fugas.",
          "Pagamos bonus en vez de arreglar el roadmap. Interesante.",
          "Esto retrasa la renuncia, no la elimina."
        ]
      },
      pensamiento: {
        alta: [
          "Sale más barato que perder a alguien y reentrenar.",
          "Ojalá esto fuera un aumento y no un gesto."
        ],
        baja: [
          "Con un bono no se compensa un año de caos.",
          "Yo también lo cobro. Y también lo veo insuficiente."
        ]
      }
    },

    bronca: {
      dialogo: {
        alta: [
          "Bronca recibida. Traducida a requisitos, ya está.",
          "Gritar es una interfaz pésima para pedir cambios.",
          "Anotado. Ahora hablemos de la causa raíz, no del tono."
        ],
        baja: [
          "Un líder que grita es un sistema sin control de errores.",
          "Has perdido al equipo en una sola frase. Eficiencia pura.",
          "Yo aguanto, pero el junior de al lado no debería ver esto."
        ]
      },
      pensamiento: {
        alta: [
          "Le dejo desahogarse y luego le paso el informe.",
          "El ego también tiene su propio uptime."
        ],
        baja: [
          "Esto no es liderazgo, es gestión por miedo.",
          "Me está costando mantener la cara de póker."
        ]
      }
    },

    fichaje: {
      dialogo: {
        alta: [
          "Nuevo nodo en el clúster. Esperemos que escale.",
          "Bienvenido. Documenta todo o no ha pasado.",
          "Contratar es invertir. Que rinda es cosa nuestra."
        ],
        baja: [
          "Más gente sin cambiar el proceso: más reuniones, mismo output.",
          "Onboarding sin documentación: eso es un bug conocido.",
          "A ver cuánto tarda en irse como el anterior."
        ]
      },
      pensamiento: {
        alta: [
          "Si esta incorporación funciona, la carga se reparte.",
          "Necesitamos manos. También necesitamos cabeza."
        ],
        baja: [
          "Traen efectivos mientras el problema es de arquitectura.",
          "Ley de Brooks en vivo y en directo."
        ]
      }
    },

    despido: {
      dialogo: {
        alta: [
          "Decisión tomada. Era cuestión de rendimiento, no de persona.",
          "Recortar aquí tiene sentido si el rol era redundante.",
          "Le he dado una salida decente. Es lo mínimo."
        ],
        baja: [
          "Despedir sin plan de sucesión es dejar un servicio sin réplica.",
          "Hemos perdido conocimiento tácito. Eso no se recompra.",
          "Recortar plantilla para tapar un mal producto. Error de manual."
        ]
      },
      pensamiento: {
        alta: [
          "Duro, pero el margen no se negocia.",
          "Si no rinde, no escala. Y sin escalar no hay empresa."
        ],
        baja: [
          "Estamos optimizando lo que no era el cuello de botella.",
          "Esto huele a que la siguiente decisión me afecta a mí."
        ]
      }
    },

    rutina: {
      dialogo: {
        alta: [
          "Reviso métricas, cierro el backlog y a otra cosa.",
          "Martes tranquilo. Aprovecho para mirar los costes de AWS.",
          "Todo verde en el panel. Casi me aburro."
        ],
        baja: [
          "Otro día apagando fuegos con el roadmap congelado.",
          "Nada nuevo, salvo que la deuda técnica sube sola.",
          "Reunión de daily y luego reunión de la reunión. Productividad."
        ]
      },
      pensamiento: {
        alta: [
          "Día aburrido es día rentable. Lo firmo.",
          "Voy a mirar si podemos bajar la factura del cloud."
        ],
        baja: [
          "Estamos navegando sin rumbo y con el motor gripado.",
          "Odio los días en los que solo gestiono el desorden."
        ]
      }
    },

    _objetivos: [
      "Voy a revisar los márgenes del trimestre.",
      "Toca priorizar el roadmap con datos.",
      "Quiero medir el churn de esta semana.",
      "A ver si reduzco la factura de servidores.",
      "Necesito una charla con el jefe sobre estrategia."
    ]
  },

  carla: {
    precio_subida: {
      dialogo: {
        alta: [
          "Ya está, ya han subido el precio. Me van a comer viva.",
          "Tres correos de queja antes del café. Récord absoluto.",
          "Pues nada, a decirle a la gente que ahora vale más."
        ],
        baja: [
          "¡Que me matan, jefe, que me están matando por el precio!",
          "El cliente de Bilbao me ha dicho que nos den. Literal.",
          "He perdido dos cuentas hoy y solo son las once."
        ]
      },
      pensamiento: {
        alta: [
          "Con lo bien que iba todo y ahora a apagar incendios.",
          "Voy a preparar una plantilla de respuesta, por dignidad."
        ],
        baja: [
          "Que suba el precio el que no habla con ellos, no yo.",
          "Estoy harta de poner la cara por decisiones que no tomo."
        ]
      }
    },

    precio_bajada: {
      dialogo: {
        alta: [
          "Precio abajo, avalancha de gente. Que Dios me pille confesada.",
          "Ahora entra todo el mundo. Soporte va a parecer un mercadillo.",
          "Más barato y más clientes. O sea, más curro para mí."
        ],
        baja: [
          "Bajamos precios y me llegan cien tickets de golpe. Cien.",
          "Esto es un Black Friday permanente y yo soy la caja.",
          "Barato atrae a gente que pregunta si el botón se puede pulsar."
        ]
      },
      pensamiento: {
        alta: [
          "Al menos están entrando clientes. Algo es algo.",
          "A ver si con el volumen nos pagan otro compañero."
        ],
        baja: [
          "Voy a explotar. Y no es exageración, es estadística.",
          "Menos dinero por cliente y el mismo soporte. Genial, oye."
        ]
      }
    },

    ordenador_roto: {
      dialogo: {
        alta: [
          "¡Mi ordenador! ¡Humo! ¡Hay humo de verdad!",
          "Jefe, eso hacía falta para trabajar, ¿eh? Lo digo por algo.",
          "Se ha muerto delante de mí. Ha sido traumático."
        ],
        baja: [
          "¡Que me quedo sin máquina y sin ganas, jefe!",
          "Otra vez. Ya llevo dos esta semana, no es normal.",
          "Estoy trabajando con el portátil viejo que pesa tres kilos."
        ]
      },
      pensamiento: {
        alta: [
          "Menos mal que los tickets están en la nube.",
          "Le voy a poner una funda de esas de burbujas."
        ],
        baja: [
          "Y ahora con qué atiendo yo a los clientes, dime.",
          "Esto me pasa por no esconder el ordenador."
        ]
      }
    },

    bono: {
      dialogo: {
        alta: [
          "¡Un bono! ¡Voy a cenar fuera esta noche!",
          "Gracias, jefe. Por una vez me voy a callar.",
          "Un bono, qué ilusión. Me lo gasto en zapatos."
        ],
        baja: [
          "Un bono. Guay. Con eso pago la mitad del psicólogo.",
          "Gracias, pero yo pedía vacaciones, no dinero.",
          "Me viene bien, pero no me arregla el cabreo."
        ]
      },
      pensamiento: {
        alta: [
          "Por fin algo bueno en esta semana de locos.",
          "Aunque con lo que he currado, se queda corto."
        ],
        baja: [
          "El dinero no tapa que llevo dos meses sin respirar.",
          "Me lo quedo, pero sigo mirando portales de empleo."
        ]
      }
    },

    bronca: {
      dialogo: {
        alta: [
          "Vale, vale, lo he pillado. No hacía falta gritar.",
          "Delante de todos, pues muy bien. Muy elegante.",
          "Voy a llorar un poco en el baño y vuelvo."
        ],
        baja: [
          "¡No me grites, que yo no te he faltado!",
          "Me ha puesto verde delante de medio equipo. Medio.",
          "He aguantado porque necesito el sueldo, nada más."
        ]
      },
      pensamiento: {
        alta: [
          "Se le ha ido la pinza, mañana se le pasa.",
          "Yo tengo la conciencia tranquila, que es lo importante."
        ],
        baja: [
          "Me tiemblan las manos. Qué día, madre mía.",
          "Yo no cobro para esto, de verdad que no."
        ]
      }
    },

    fichaje: {
      dialogo: {
        alta: [
          "¡Bienvenido! Te voy a contar toooodo lo que falla.",
          "Un compañero nuevo, ¡qué alegría! Ya no estoy sola.",
          "Tú y yo vamos a llevarnos genial, ya lo verás."
        ],
        baja: [
          "Bienvenido. Corre, que este barco se hunde.",
          "Otro nuevo. Ojalá dure más que el de febrero.",
          "Qué ilusión, ahora seremos dos para mil tickets."
        ]
      },
      pensamiento: {
        alta: [
          "Por fin alguien con quien quejarme en la cocina.",
          "Le voy a enseñar las tripas del sistema sin filtros."
        ],
        baja: [
          "Pobrecillo, no sabe la que le espera.",
          "Contratan a uno y se van dos. Matemáticas de empresa."
        ]
      }
    },

    despido: {
      dialogo: {
        alta: [
          "Se va y me da mucha pena. Era buenísimo.",
          "Qué fuerte. Espero que le vaya genial fuera.",
          "Le he dado un abrazo y mi número. Por si acaso."
        ],
        baja: [
          "¡Que han echado a Marta! ¡A Marta! ¡Pero esto qué es!",
          "Nos quedamos sin gente y con los mismos clientes.",
          "Hoy él, mañana yo. Que nadie se engañe."
        ]
      },
      pensamiento: {
        alta: [
          "Se va uno de los que sostenía esto. Miedo me da.",
          "Voy a actualizar mi currículum, por salud mental."
        ],
        baja: [
          "Estoy temblando. Literalmente temblando.",
          "Yo la próxima vez no me callo, lo juro."
        ]
      }
    },

    rutina: {
      dialogo: {
        alta: [
          "Día normal, por fin. Cuarenta tickets y a casa.",
          "Hoy no ha explotado nada. Toquemos madera.",
          "Voy a por un café y sigo con la bandeja de entrada."
        ],
        baja: [
          "Otro día de currar sin que nadie lo vea.",
          "Cincuenta mensajes y ni uno era un gracias.",
          "Estoy quemadísima y solo son las diez de la mañana."
        ]
      },
      pensamiento: {
        alta: [
          "Si acabo la bandeja hoy, me merezco una siesta.",
          "Me gusta cuando los clientes solo escriben para saludar."
        ],
        baja: [
          "Voy a pedir vacaciones aunque sea sin sueldo.",
          "Nadie se da cuenta de lo que hago hasta que no lo hago."
        ]
      }
    },

    _objetivos: [
      "Voy a por un café bien grande.",
      "Tengo que contestar cuarenta tickets.",
      "A ver si sobrevivo a esta mañana.",
      "Quiero pedir vacaciones esta semana.",
      "Voy a quejarme un rato en la cocina."
    ]
  },

  dani: {
    precio_subida: {
      dialogo: {
        alta: [
          "¿Y ahora sube el precio? ¿Eso es bueno o malo?",
          "He visto la web cambiada, ¡qué rápido lo hacéis todo!",
          "O sea que cobramos más. ¿Eso significa que nos va mejor?"
        ],
        baja: [
          "Perdón, ¿he hecho algo mal con lo del precio?",
          "Me han escrito dos clientes enfadados y no sé qué decir.",
          "¿Puedo contestarles yo o mejor no toco nada?"
        ]
      },
      pensamiento: {
        alta: [
          "Ojalá algún día entender todo esto de los márgenes.",
          "Mola cuando pasan cosas nuevas, aunque no las entienda."
        ],
        baja: [
          "Creo que he mandado un correo mal y no me atrevo a decirlo.",
          "Me da miedo que me echen por no saber responder."
        ]
      }
    },

    precio_bajada: {
      dialogo: {
        alta: [
          "¡Más barato! ¿Eso quiere decir que vendemos más?",
          "He leído que bajar precios atrae clientes. ¡Como en las rebajas!",
          "¿Y si es más barato ganamos menos? Qué lío."
        ],
        baja: [
          "¿Bajamos precios y aun así hay que trabajar más? No lo pillo.",
          "Me han dicho que ahora entra mucha más gente. ¿Y yo qué hago?",
          "Perdón por preguntar tanto, es que no entiendo nada."
        ]
      },
      pensamiento: {
        alta: [
          "Esto de la estrategia es como un juego de números.",
          "Me gustaría que alguien me explicase el margen de una vez."
        ],
        baja: [
          "Cada día entiendo menos cómo funciona esta empresa.",
          "Igual pregunto demasiado y molesto a todos."
        ]
      }
    },

    ordenador_roto: {
      dialogo: {
        alta: [
          "¡Se ha roto un ordenador! ¿Lo arreglo yo? ¡Puedo intentarlo!",
          "Ha salido humo. Nunca había visto salir humo de un PC.",
          "¿Llamamos a alguien o lo abro y miro dentro?"
        ],
        baja: [
          "Uy. Uy. Creo que ha sido culpa mía. Lo siento mucho.",
          "Se me ha caído el café encima y ahora no enciende.",
          "Perdón, perdón, ¿esto tiene arreglo?"
        ]
      },
      pensamiento: {
        alta: [
          "Ojalá aprender a montar uno desde cero algún día.",
          "Por suerte no era el mío. Qué alivio, madre mía."
        ],
        baja: [
          "Siempre rompo algo. Siempre. Es que no aprendo.",
          "Seguro que me descuentan el portátil de la nómina."
        ]
      }
    },

    bono: {
      dialogo: {
        alta: [
          "¡¿Un bono?! ¡¿En serio?! ¡Muchísimas gracias!",
          "¡Es mi primer bono! ¡Voy a llamar a mi madre!",
          "¡Qué pasada! ¿Esto pasa todos los meses?"
        ],
        baja: [
          "Un bono... gracias. No sé si merecerlo, la verdad.",
          "Gracias, jefe. Aunque creo que trabajo poquito todavía.",
          "¿Esto va aparte del sueldo o es lo mismo?"
        ]
      },
      pensamiento: {
        alta: [
          "Me lo voy a guardar enterito para el alquiler.",
          "Qué bien, así ya no les pido dinero a mis padres."
        ],
        baja: [
          "Con lo poco que hago, no sé si debería cogerlo.",
          "Igual es una indirecta de que me espabile."
        ]
      }
    },

    bronca: {
      dialogo: {
        alta: [
          "Perdón, de verdad. Lo arreglo ahora mismo, ¿vale?",
          "Sí, sí, tienes razón. Lo he hecho fatal. Perdón.",
          "Voy a apuntarlo todo para no volver a fallar."
        ],
        baja: [
          "Lo siento mucho. ¿Puedo ir al baño un momento?",
          "No era mi intención, de verdad que no.",
          "Me he quedado en blanco. No sabía qué decir."
        ]
      },
      pensamiento: {
        alta: [
          "Vale, me lo merecía. A aprender y adelante.",
          "Los jefes también se estresan, pobre hombre."
        ],
        baja: [
          "Me he sentido fatal. Fatal de verdad.",
          "Igual no valgo para esto y debería irme a casa."
        ]
      }
    },

    fichaje: {
      dialogo: {
        alta: [
          "¡Hola! ¡Yo soy Dani, el becario! ¿Tú de qué eres?",
          "¡Qué guay! ¿Me enseñas cómo trabajas tú?",
          "¡Bienvenido! ¿Quieres que te traiga un café?"
        ],
        baja: [
          "Hola. Yo soy el que rompe cosas. Ya te aviso.",
          "Bienvenido. A mí me quedan dos meses, si aguanto.",
          "Holaa. ¿Tú también estás perdido como yo?"
        ]
      },
      pensamiento: {
        alta: [
          "¡Por fin alguien más nuevo que yo!",
          "Ojalá hacernos amigos, aquí no conozco a nadie de mi edad."
        ],
        baja: [
          "Ahora hay otro por debajo mío. Pobrecillo.",
          "Yo aviso: aquí se trabaja muchísimo y se cobra poquito."
        ]
      }
    },

    despido: {
      dialogo: {
        alta: [
          "¿Se va? ¿Pero por qué? ¡Si era súper majo!",
          "Le voy a escribir un mensaje de despedida bonito.",
          "Espero que le vaya bien. Se lo merece, de verdad."
        ],
        baja: [
          "¿Han echado a alguien? ¿Y ahora qué pasa con su trabajo?",
          "Me da muchísima pena. Y también miedo, la verdad.",
          "¿Yo también puedo desaparecer así de un día para otro?"
        ]
      },
      pensamiento: {
        alta: [
          "Qué fuerte. En las empresas pasan estas cosas, ¿no?",
          "Voy a portarme muy bien no vaya a ser."
        ],
        baja: [
          "Si echan a los buenos, a mí me queda nada.",
          "Me tiembla todo. ¿Hoy hacía falta que viniera?"
        ]
      }
    },

    rutina: {
      dialogo: {
        alta: [
          "¡Buenos días! ¿En qué te puedo ayudar hoy?",
          "He aprendido a hacer un commit sin liarla. ¡Progreso!",
          "¿Alguien quiere café? Voy a la máquina."
        ],
        baja: [
          "Holaa. ¿Hay algo que pueda hacer? ¿Nada? Vale.",
          "Llevo dos horas mirando la pantalla y no sé qué tocar.",
          "Perdón, ¿me puedes explicar esto otra vez?"
        ]
      },
      pensamiento: {
        alta: [
          "Hoy quiero aprender algo nuevo, lo que sea.",
          "Me encanta este trabajo aunque no entienda la mitad."
        ],
        baja: [
          "Siento que estorbo más que ayudo.",
          "Voy a preguntar una cosa y si me dicen que no, me callo."
        ]
      }
    },

    _objetivos: [
      "Voy a preguntar cómo funciona el repositorio.",
      "A ver si hoy no rompo nada.",
      "Quiero aprender a hacer un deploy.",
      "Voy a apuntar todo en mi cuaderno.",
      "Me gustaría caerle bien a Ana."
    ]
  },

  elena: {
    precio_subida: {
      dialogo: {
        alta: [
          "El precio sube, el producto debería verse igual de cuidado.",
          "Si cobramos más, la interfaz no puede tener bordes torcidos.",
          "Subir precio es una promesa: que el detalle la sostenga."
        ],
        baja: [
          "Cobramos más por una experiencia que sigue a medio cocer.",
          "Un precio premium con un onboarding torpe es una mentira.",
          "Los clientes van a mirar todo con lupa. Y con razón."
        ]
      },
      pensamiento: {
        alta: [
          "Si el precio sube, que suba también la sensación de calidad.",
          "Puedo aprovechar para pulir la pantalla de pago."
        ],
        baja: [
          "Vendemos caro algo que se siente barato. Me duele.",
          "El precio no arregla un flujo de compra confuso."
        ]
      }
    },

    precio_bajada: {
      dialogo: {
        alta: [
          "Más accesible, bien. Pero no por eso menos cuidado.",
          "Bajar el precio no debería abaratar la experiencia.",
          "Ojalá esto nos traiga gente que aprecie el detalle."
        ],
        baja: [
          "Barato y mal acabado es la peor combinación posible.",
          "Si bajamos precio, la marca pierde aire. Cuidado.",
          "Vamos a parecer un bazar, no un producto."
        ]
      },
      pensamiento: {
        alta: [
          "El diseño no depende del precio. La percepción, sí.",
          "Voy a estudiar cómo lo comunicamos visualmente."
        ],
        baja: [
          "Nos estamos posicionando como saldo y eso no se deshace.",
          "Cada decisión así deja una marca en la identidad."
        ]
      }
    },

    ordenador_roto: {
      dialogo: {
        alta: [
          "Mi pantalla está humeando. Y yo estaba a punto de exportar.",
          "Ese ordenador tenía mis maquetas sin guardar. Ay.",
          "Respiro. Todo está en la nube. Todo está en la nube."
        ],
        baja: [
          "Se ha roto con las tres propuestas de logo dentro.",
          "Otra herramienta menos para hacer las cosas bien.",
          "Trabajar así es como pintar con los ojos cerrados."
        ]
      },
      pensamiento: {
        alta: [
          "Menos mal que soy obsesiva con los backups.",
          "El hardware se reemplaza; el tiempo perdido no."
        ],
        baja: [
          "Sin equipo decente no se puede cuidar el detalle.",
          "Esto no es un accidente, es falta de respeto al trabajo."
        ]
      }
    },

    bono: {
      dialogo: {
        alta: [
          "Gracias. Lo usaré para un monitor con buena gama de color.",
          "Un bono, qué detalle. Aunque no era lo que pedía.",
          "Gracias, jefe. Se agradece el gesto, de verdad."
        ],
        baja: [
          "Un bono no compensa trabajar con software de hace diez años.",
          "Gracias, pero yo pedía tiempo para hacer las cosas bien.",
          "Prefiero un proceso sensato a un sobre con dinero."
        ]
      },
      pensamiento: {
        alta: [
          "Me vendrá bien para el curso de tipografía.",
          "Es bonito que reconozcan algo, aunque sea con dinero."
        ],
        baja: [
          "El dinero tapa el ruido, no la falta de criterio.",
          "Un bono no arregla una identidad visual hecha a prisas."
        ]
      }
    },

    bronca: {
      dialogo: {
        alta: [
          "Entendido. Cuando quieras hablamos del diseño con calma.",
          "He recibido el mensaje. Y el tono, por desgracia.",
          "Vale. Yo también tengo cosas que decir, pero luego."
        ],
        baja: [
          "Gritarme no va a alinear mejor los píxeles.",
          "Delante de todos, qué falta de elegancia.",
          "He mantenido la compostura. No era fácil."
        ]
      },
      pensamiento: {
        alta: [
          "Yo tengo razón y el tiempo me lo dará.",
          "Mañana se le habrá pasado y seguiremos."
        ],
        baja: [
          "Un jefe que grita es un jefe sin criterio.",
          "Esto deja una marca. Y las marcas se ven."
        ]
      }
    },

    fichaje: {
      dialogo: {
        alta: [
          "Bienvenido. Te enseño la guía de estilo, es corta pero sagrada.",
          "Qué bien, gente nueva con ojos nuevos.",
          "Encantada. Si ves algo mal alineado, dímelo."
        ],
        baja: [
          "Hola. Hay una guía de estilo. Nadie la lee. Suerte.",
          "Bienvenido. Ojalá te dejen hacer las cosas bien.",
          "Encantada. Aviso: aquí todo se hace con prisa."
        ]
      },
      pensamiento: {
        alta: [
          "A ver si esta persona respeta el sistema de diseño.",
          "Me gusta enseñar por qué cada margen está donde está."
        ],
        baja: [
          "Otro que va a improvisar colores, lo presiento.",
          "Traen gente, pero no cambian la manera de trabajar."
        ]
      }
    },

    despido: {
      dialogo: {
        alta: [
          "Lo siento mucho. Se va alguien con muy buen ojo.",
          "Qué pérdida. Espero que encuentre un sitio mejor.",
          "Cuídate, de verdad. Y no pierdas el criterio."
        ],
        baja: [
          "Se llevan a la única persona que cuidaba el detalle.",
          "Despedir así deja el producto a la deriva.",
          "Hoy ha sido él. La próxima línea del organigrama soy yo."
        ]
      },
      pensamiento: {
        alta: [
          "Las empresas se vuelven grises cuando se va la gente buena.",
          "Voy a guardar sus archivos bien ordenados."
        ],
        baja: [
          "Sin criterio, esto se convertirá en un collage.",
          "Estoy cansada de ver cómo se rompe lo que construimos."
        ]
      }
    },

    rutina: {
      dialogo: {
        alta: [
          "Hoy toca repasar el sistema de espaciados. Mi plan perfecto.",
          "Voy a ajustar los iconos. Un píxel menos y respira.",
          "Día tranquilo, ideal para ordenar la librería de componentes."
        ],
        baja: [
          "Otro día corrigiendo lo que se hizo deprisa y mal.",
          "Nadie ve la diferencia entre bien y regular. Nadie.",
          "Voy a seguir maquetando en una pantalla que no es la mía."
        ]
      },
      pensamiento: {
        alta: [
          "Si dejo el sistema limpio hoy, mañana se trabaja mejor.",
          "Me encanta cuando todo encaja en la retícula."
        ],
        baja: [
          "El detalle es lo primero que se sacrifica y lo primero que se nota.",
          "Hago cosas bonitas que nadie va a mirar."
        ]
      }
    },

    _objetivos: [
      "Voy a repasar la guía de estilo.",
      "Quiero pulir la pantalla de inicio.",
      "Tengo que revisar el contraste de los colores.",
      "A ver si alineo de una vez los iconos.",
      "Me apetece ordenar la librería de componentes."
    ]
  }
};
