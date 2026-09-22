// eventos-extra.js — Corpus de diálogos y pensamientos en español de España.
// Juego pixel art de gestión de una empresa de software.
// 8 personajes x 2 eventos x (3+3 diálogo | 2+2 pensamiento) = 160 frases.
// Eventos: virus (el jefe infecta la máquina) y hardware (el jefe mejora el equipo).
// Solo texto plano: sin emojis ni símbolos que la fuente de píxeles no pueda dibujar.

export const EVENTOS_EXTRA = {
  ana: {
    virus: {
      dialogo: {
        alta: [
          "Jefe, mi máquina tiene veinte ventanas abiertas y yo no he abierto ninguna.",
          "Hay un mensaje pidiendo dinero en mi escritorio. Muy sutil todo.",
          "Los ficheros están cifrados. Esto no lo arreglo yo en un rato."
        ],
        baja: [
          "Otra vez. Mi equipo, mi trabajo y ahora también mi paciencia.",
          "No pienso tocar nada hasta que alguien me explique qué ha pasado.",
          "Me ha borrado la carpeta de notas. Un año de apuntes. Perfecto."
        ]
      },
      pensamiento: {
        alta: [
          "El código está a salvo en el repo. El resto me da igual.",
          "Alguien ha tocado mi máquina y no precisamente con cariño."
        ],
        baja: [
          "Si hubiera hecho push esta mañana, ni me enteraría.",
          "Estoy harta de arreglar desastres que no he causado."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "Ahora sí. Compila en la mitad de tiempo y sin ventilar.",
          "Gracias, pero lo siguiente que pido es un monitor decente.",
          "Le he metido caña al build y ni se ha inmutado. Bien."
        ],
        baja: [
          "Mejor máquina, mismos plazos imposibles. Qué ilusión.",
          "El ordenador va fino y yo sigo yendo cuesta abajo.",
          "Gracias por el hierro. Ahora falta gente, no gigahercios."
        ]
      },
      pensamiento: {
        alta: [
          "Con esta máquina el refactor deja de dar miedo.",
          "A ver si con este hierro cierro el backlog de una vez."
        ],
        baja: [
          "Arreglan el ordenador, no el problema de fondo.",
          "Rápido por fuera, quemado por dentro. Como todos."
        ]
      }
    }
  },

  bruno: {
    virus: {
      dialogo: {
        alta: [
          "Un cifrado no autorizado en un nodo. Interesante vector de entrada.",
          "El equipo de desarrollo está comprometido. Literalmente.",
          "Voy a tratarlo como un incidente, no como una anécdota."
        ],
        baja: [
          "Sin redundancia, un incidente pequeño se convierte en una pérdida.",
          "Le hemos dado al malware la misma superficie de ataque de siempre.",
          "El rescate no negocia; nosotros tampoco deberíamos."
        ]
      },
      pensamiento: {
        alta: [
          "Esto es un fallo de perímetro, no de la persona.",
          "Ninguna arquitectura sobrevive a un usuario con prisa."
        ],
        baja: [
          "Llevo dos años pidiendo segmentar la red. Dos.",
          "Cuando el coste del desastre supera el de la prevención, es tarde."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "Más memoria: menos swapping, menos espera, más rendimiento.",
          "Buena inversión. El hardware se amortiza en semanas de trabajo.",
          "Apruebo el gasto. Rara vez digo eso de algo."
        ],
        baja: [
          "Hardware nuevo, mismo roadmap congelado. Bonito contraste.",
          "Gasta en discos y ahorra en plantilla. Es una estrategia.",
          "El hierro va sobrado; el equipo no."
        ]
      },
      pensamiento: {
        alta: [
          "Un cuello de botella menos en el sistema. Lo firmo.",
          "Ahora el límite vuelve a ser el de siempre: las personas."
        ],
        baja: [
          "Optimizan la máquina mientras la arquitectura sigue coja.",
          "Comprar potencia es fácil. Dirigirla, no."
        ]
      }
    }
  },

  carla: {
    virus: {
      dialogo: {
        alta: [
          "¡Jefe, mi ordenador está poseído! ¡Hay ventanas por todas partes!",
          "¡Me pide dinero! ¡A mí! ¡Que no tengo ni para el café!",
          "Vale, me río, pero mañana tengo cuarenta tickets esperando."
        ],
        baja: [
          "¡Que no puedo trabajar, jefe, que esto está muerto literalmente!",
          "Dos veces esta semana. DOS. Yo ya no sé ni qué decir.",
          "He llamado al cliente con el ordenador pitando de fondo. Genial."
        ]
      },
      pensamiento: {
        alta: [
          "Menos mal que las capturas las tengo en el móvil.",
          "Esto mañana lo cuento en la cocina y me hago famosa."
        ],
        baja: [
          "Encima tendré que pedir perdón yo por los retrasos.",
          "Estoy llorando de risa y de pena a la vez, oye."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "¡Jefe, esto vuela! ¡He abierto cincuenta pestañas y ni se queja!",
          "¡Qué rapidísimo! Ahora sí puedo contestar a todo el mundo.",
          "¡Me lo quedo! ¡Y lo mimo como a un hijo!"
        ],
        baja: [
          "Va rapidísimo, sí. Lástima de los cien tickets acumulados.",
          "Gracias por el cacharro, pero yo pedía un compañero.",
          "¡Ay, qué bien va! ¡Y qué sola sigo!"
        ]
      },
      pensamiento: {
        alta: [
          "Con esto igual hasta salgo a mi hora algún día.",
          "Le voy a poner un fondo de pantalla bonito y todo."
        ],
        baja: [
          "Un ordenador nuevo no me quita los ojos de encima.",
          "Rápido el PC, lenta la vida. Menudo cambio."
        ]
      }
    }
  },

  dani: {
    virus: {
      dialogo: {
        alta: [
          "¡Ana! ¡Le han salido ventanas solas a mi ordenador! ¡Mira, mira!",
          "¿Esto es un virus? ¿O es una actualización rara? Pregunto.",
          "Voy a apagarlo, ¿no? ¿O mejor lo dejo encendido?"
        ],
        baja: [
          "Perdón, perdón, perdón. ¿Se ha roto algo importante de verdad?",
          "Yo no he abierto nada raro. Bueno, igual un correo. Igual.",
          "¿Me vais a echar por esto? Es que no sé ni qué ha pasado."
        ]
      },
      pensamiento: {
        alta: [
          "Seguro que he hecho clic donde no debía. Segurísimo.",
          "Qué miedo. Ojalá no sea culpa mía esta vez."
        ],
        baja: [
          "Siempre la lío yo. Siempre. Estoy gafado.",
          "Igual mi portátil de casa va mejor que este. Qué pena."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "¡Me han puesto más RAM! ¡Ahora puedo abrir dos cosas a la vez!",
          "¡Es una pasada! ¡Arranca en nada! ¡Gracias, gracias, gracias!",
          "¿Esto es para mí solo o lo comparto con alguien?"
        ],
        baja: [
          "Guau, gracias. Con lo torpe que soy, me da miedo tocarlo.",
          "¿Seguro que me lo merezco? Es que yo todavía rompo cosas.",
          "¡Qué rápido va! ¿Y ahora qué hago con tanto tiempo?"
        ]
      },
      pensamiento: {
        alta: [
          "Con esto igual ya no tardo media hora en compilar.",
          "Voy a cuidarlo muchísimo, lo prometo."
        ],
        baja: [
          "Me lo dan a mí y seguro que lo estropeo en un mes.",
          "Prefiero que no se enteren de lo poco que lo aprovecho."
        ]
      }
    }
  },

  elena: {
    virus: {
      dialogo: {
        alta: [
          "Mi pantalla está llena de ventanas grises. Es horrible de mirar.",
          "Ha aparecido un mensaje con una calavera mal dibujada. Cutrísimo.",
          "Respiro. Mis maquetas están en la nube, solo faltaría eso."
        ],
        baja: [
          "Se ha llevado la carpeta de tipografías. La de años de trabajo.",
          "Ahora mi escritorio es un collage sin criterio. Y me duele.",
          "No pienso trabajar así. Prefiero esperar a tener algo decente."
        ]
      },
      pensamiento: {
        alta: [
          "Ni un virus respeta una buena jerarquía visual.",
          "Lo que me da rabia es perder la tarde, no el susto."
        ],
        baja: [
          "Un desastre más sobre una semana ya de por sí fea.",
          "Me están dejando sin herramientas y con prisa. Mala mezcla."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "Ahora los degradados se ven suaves. Se nota muchísimo.",
          "Con esta pantalla por fin puedo juzgar bien un color.",
          "Gracias. Esto sí respeta el trabajo que hago."
        ],
        baja: [
          "Va rápido, sí. Pero el sistema de diseño sigue hecho un desastre.",
          "Gracias por el equipo. Lástima que el proceso siga igual.",
          "Bonito cacharro para seguir trabajando con prisa. Otra vez."
        ]
      },
      pensamiento: {
        alta: [
          "Un equipo a la altura cambia lo que uno se atreve a diseñar.",
          "Voy a revisar la paleta entera aprovechando esto."
        ],
        baja: [
          "Me dan herramientas buenas y plazos imposibles. Clásico.",
          "La máquina mejora; el criterio de la casa, no."
        ]
      }
    }
  },

  sofia: {
    virus: {
      dialogo: {
        alta: [
          "Que alguien me diga cuánto cuesta esto antes de que me dé algo.",
          "Si hay que pagar un rescate, eso va contra el presupuesto de marzo.",
          "He apuntado la hora exacta del incidente. Por si acaso."
        ],
        baja: [
          "Esto nos va a costar un dineral y saldrá de mi partida.",
          "Llevo la cuenta de todo lo que se rompe este mes. Va por catorce.",
          "No hay dinero para esto. No lo hay. Que nadie me lo pida."
        ]
      },
      pensamiento: {
        alta: [
          "Un día parado es facturación perdida. Y eso no se recupera.",
          "Voy a mirar si el seguro cubre estas cosas."
        ],
        baja: [
          "Cada desastre de estos me quita años de vida y de caja.",
          "Si sigue así, en junio no pagamos ni la nómina."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "¿Cuánto ha costado? Dime la cifra exacta, por favor.",
          "Si entra en el presupuesto de este trimestre, lo acepto.",
          "La amortización son tres años. Lo he calculado ya."
        ],
        baja: [
          "Nadie me ha consultado el precio. Otra vez. Qué sorpresa.",
          "Muy bonito el ordenador. A ver de dónde saco yo ese dinero.",
          "Con lo que ha costado esto, más vale que dure diez años."
        ]
      },
      pensamiento: {
        alta: [
          "Espero que esta compra dure tanto como promete.",
          "Un gasto bien justificado lo firmo sin dramas."
        ],
        baja: [
          "Se gastan el dinero en hierro y luego no hay para personal.",
          "Voy a tener que cuadrar esto recortando en otro sitio."
        ]
      }
    }
  },

  marcos: {
    virus: {
      dialogo: {
        alta: [
          "Esa máquina la aíslo yo ahora mismo. Nadie la toca hasta que yo diga.",
          "Primero el cable de red fuera. Luego ya hablamos del susto.",
          "Tengo backup del viernes. No es perfecto, pero es algo."
        ],
        baja: [
          "Llevo media vida diciendo que no se abre nada raro. Media.",
          "Ese equipo estaba limpio y ahora hay que reinstalarlo entero.",
          "Os aviso: si tocan el rack, lo pago yo en paciencia."
        ]
      },
      pensamiento: {
        alta: [
          "Me ha tocado una máquina de mi parque. Eso no se hace.",
          "El backup estaba, que es lo único que me consuela."
        ],
        baja: [
          "Otro marrón para mí y encima con prisa. Cómo no.",
          "Restaurar esto me va a costar el fin de semana entero."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "¿Quién ha instalado esto? Quiero saberlo antes de tocarlo.",
          "Buena caja, buen disipador. Alguien ha elegido bien. Raro.",
          "Al rack le vendría bien la mitad de este cariño."
        ],
        baja: [
          "Hardware nuevo y ni un aviso al de sistemas. Como siempre.",
          "Muy bonito, pero yo tengo el rack con quince años encima.",
          "Si algo peta ahí dentro, la culpa será mía. Ya lo verás."
        ]
      },
      pensamiento: {
        alta: [
          "Si lo han montado bien, no lo desmonto. Hoy no.",
          "Con ese disco los backups tardan la mitad. Bien pensado."
        ],
        baja: [
          "Mejoran el PC de uno y el servidor sigue tosiendo.",
          "Otro trasto que mantener y ni un euro para el CPD."
        ]
      }
    }
  },

  lucia: {
    virus: {
      dialogo: {
        alta: [
          "Esto no sale de aquí, ¿vale? La reputación es lo primero.",
          "Mientras se arregla, yo llamo a los clientes y les doy cariño.",
          "Un susto así se cuenta bien y hasta genera confianza."
        ],
        baja: [
          "Si esto se filtra, perdemos dos cuentas grandes. Lo digo ya.",
          "Llevo toda la mañana sonriendo por teléfono y por dentro grito.",
          "Un virus no me quita clientes, pero un rumor sí."
        ]
      },
      pensamiento: {
        alta: [
          "Si lo gestionamos bien, hasta quedamos de profesionales.",
          "Nadie tiene que enterarse de esto por un tercero."
        ],
        baja: [
          "La marca aguanta mucho, pero no es infinita.",
          "Como un cliente lo publique en redes, estamos muertos."
        ]
      }
    },

    hardware: {
      dialogo: {
        alta: [
          "¡Esto hay que contarlo! Un equipo que va rápido vende solo.",
          "Con esto atendemos el doble de clientes y con mejor cara.",
          "Gracias, jefe. Esto es invertir en la experiencia del cliente."
        ],
        baja: [
          "Muy rápido todo, pero los clientes siguen esperando respuesta.",
          "Qué bien el ordenador. ¿Y el comercial que pedí para vender?",
          "Presumen de equipo nuevo y luego fallamos en las entregas."
        ]
      },
      pensamiento: {
        alta: [
          "Un buen equipo también es un argumento de venta.",
          "Voy a mencionarlo en la próxima propuesta, seguro."
        ],
        baja: [
          "La reputación no se arregla con un disco más rápido.",
          "Prefiero que inviertan en prometer menos y cumplir más."
        ]
      }
    }
  }
};
