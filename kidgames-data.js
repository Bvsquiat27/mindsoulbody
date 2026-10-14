/* Data for the kids' Bible games (ages 9+). Every verse is word for word from
   the app's own KJV (bible/NN.json) and RV1909 (bible/rvr/NN.json) text;
   kidgames.test.mjs checks each one. "at" is [book, chapter, verse] per
   translation (verse numbers can differ, e.g. Jonah 2). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbKidGamesData = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
 "MAPS": [
  {
   "id": "exodus",
   "icon": "🏜️",
   "title": {
    "en": "The Exodus",
    "es": "El Éxodo"
   },
   "travel": "🚶",
   "land": "exodus",
   "stops": [
    {
     "x": 92,
     "y": 96,
     "name": {
      "en": "The Red Sea",
      "es": "El mar Rojo"
     },
     "q": {
      "en": "What did God do at the Red Sea?",
      "es": "¿Qué hizo Dios en el mar Rojo?"
     },
     "choices": {
      "en": [
       "Made a dry path through the sea",
       "Sent a big ship",
       "Froze the water"
      ],
      "es": [
       "Abrió un camino seco en el mar",
       "Mandó un barco grande",
       "Congeló el agua"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        14,
        21
       ],
       "es": [
        2,
        14,
        21
       ]
      },
      "text": {
       "en": "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided.",
       "es": "Y extendió Moisés su mano sobre la mar, é hizo Jehová que la mar se retirase por recio viento oriental toda aquella noche; y tornó la mar en seco, y las aguas quedaron divididas."
      },
      "ref": {
       "en": "Exodus 14:21",
       "es": "Éxodo 14:21"
      }
     }
    },
    {
     "x": 130,
     "y": 150,
     "name": {
      "en": "Marah",
      "es": "Mara"
     },
     "q": {
      "en": "The water at Marah was bitter. What did God make it?",
      "es": "El agua de Mara era amarga. ¿Cómo la dejó Dios?"
     },
     "choices": {
      "en": [
       "Sweet",
       "Salty",
       "Hot"
      ],
      "es": [
       "Dulce",
       "Salada",
       "Caliente"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        15,
        25
       ],
       "es": [
        2,
        15,
        25
       ]
      },
      "text": {
       "en": "And he cried unto the LORD; and the LORD shewed him a tree, which when he had cast into the waters, the waters were made sweet: there he made for them a statute and an ordinance, and there he proved them,",
       "es": "Y Moisés clamó á Jehová; y Jehová le mostró un árbol, el cual metídolo que hubo dentro de las aguas, las aguas se endulzaron. Allí les dió estatutos y ordenanzas, y allí los probó;"
      },
      "ref": {
       "en": "Exodus 15:25",
       "es": "Éxodo 15:25"
      }
     }
    },
    {
     "x": 150,
     "y": 182,
     "name": {
      "en": "Elim",
      "es": "Elim"
     },
     "q": {
      "en": "How many wells of water were at Elim?",
      "es": "¿Cuántas fuentes de agua había en Elim?"
     },
     "choices": {
      "en": [
       "Twelve",
       "Three",
       "Forty"
      ],
      "es": [
       "Doce",
       "Tres",
       "Cuarenta"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        15,
        27
       ],
       "es": [
        2,
        15,
        27
       ]
      },
      "text": {
       "en": "And they came to Elim, where were twelve wells of water, and threescore and ten palm trees: and they encamped there by the waters.",
       "es": "Y llegaron á Elim, donde había doce fuentes de aguas, y setenta palmas; y asentaron allí junto á las aguas."
      },
      "ref": {
       "en": "Exodus 15:27",
       "es": "Éxodo 15:27"
      }
     }
    },
    {
     "x": 196,
     "y": 214,
     "name": {
      "en": "Wilderness of Sin",
      "es": "Desierto de Sin"
     },
     "q": {
      "en": "What bread did God send from heaven?",
      "es": "¿Qué pan mandó Dios del cielo?"
     },
     "choices": {
      "en": [
       "Manna",
       "Pizza",
       "Cake"
      ],
      "es": [
       "El maná",
       "Pizza",
       "Pastel"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        16,
        15
       ],
       "es": [
        2,
        16,
        15
       ]
      },
      "text": {
       "en": "And when the children of Israel saw it, they said one to another, It is manna: for they wist not what it was. And Moses said unto them, This is the bread which the LORD hath given you to eat.",
       "es": "Y viéndolo los hijos de Israel, se dijeron unos á otros: ¿Qué es esto? porque no sabían qué era. Entonces Moisés les dijo: Es el pan que Jehová os da para comer."
      },
      "ref": {
       "en": "Exodus 16:15",
       "es": "Éxodo 16:15"
      }
     }
    },
    {
     "x": 236,
     "y": 236,
     "name": {
      "en": "Rephidim",
      "es": "Refidim"
     },
     "q": {
      "en": "Where did the water come from at Horeb?",
      "es": "¿De dónde salió el agua en Horeb?"
     },
     "choices": {
      "en": [
       "Out of a rock",
       "From the clouds",
       "From a river"
      ],
      "es": [
       "De una peña",
       "De las nubes",
       "De un río"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        17,
        6
       ],
       "es": [
        2,
        17,
        6
       ]
      },
      "text": {
       "en": "Behold, I will stand before thee there upon the rock in Horeb; and thou shalt smite the rock, and there shall come water out of it, that the people may drink. And Moses did so in the sight of the elders of Israel.",
       "es": "He aquí que yo estoy delante de ti allí sobre la peña en Horeb; y herirás la peña, y saldrán de ella aguas, y beberá el pueblo. Y Moisés lo hizo así en presencia de los ancianos de Israel."
      },
      "ref": {
       "en": "Exodus 17:6",
       "es": "Éxodo 17:6"
      }
     }
    },
    {
     "x": 262,
     "y": 252,
     "name": {
      "en": "Mount Sinai",
      "es": "Monte Sinaí"
     },
     "q": {
      "en": "What did God give His people at Mount Sinai?",
      "es": "¿Qué le dio Dios a su pueblo en el monte Sinaí?"
     },
     "choices": {
      "en": [
       "The Ten Commandments",
       "A golden crown",
       "A new city"
      ],
      "es": [
       "Los Diez Mandamientos",
       "Una corona de oro",
       "Una ciudad nueva"
      ]
     },
     "verse": {
      "at": {
       "en": [
        2,
        20,
        3
       ],
       "es": [
        2,
        20,
        3
       ]
      },
      "text": {
       "en": "Thou shalt have no other gods before me.",
       "es": "No tendrás dioses ajenos delante de mí."
      },
      "ref": {
       "en": "Exodus 20:3",
       "es": "Éxodo 20:3"
      }
     }
    }
   ]
  },
  {
   "id": "paul",
   "icon": "⛵",
   "title": {
    "en": "Paul sails to Rome",
    "es": "Pablo navega a Roma"
   },
   "travel": "⛵",
   "land": "sea",
   "stops": [
    {
     "x": 368,
     "y": 196,
     "name": {
      "en": "Caesarea",
      "es": "Cesarea"
     },
     "q": {
      "en": "Where was Paul’s ship going?",
      "es": "¿Adónde iba el barco de Pablo?"
     },
     "choices": {
      "en": [
       "Italy",
       "Egypt",
       "Spain"
      ],
      "es": [
       "Italia",
       "Egipto",
       "España"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        27,
        1
       ],
       "es": [
        44,
        27,
        1
       ]
      },
      "text": {
       "en": "And when it was determined that we should sail into Italy, they delivered Paul and certain other prisoners unto one named Julius, a centurion of Augustus' band.",
       "es": "MAS como fué determinado que habíamos de navegar para Italia, entregaron á Pablo y á algunos otros presos á un centurión, llamado Julio, de la compañía Augusta."
      },
      "ref": {
       "en": "Acts 27:1",
       "es": "Hechos 27:1"
      }
     }
    },
    {
     "x": 372,
     "y": 150,
     "name": {
      "en": "Sidon",
      "es": "Sidón"
     },
     "q": {
      "en": "What did kind Julius let Paul do at Sidon?",
      "es": "¿Qué le permitió el amable Julio a Pablo en Sidón?"
     },
     "choices": {
      "en": [
       "Visit his friends",
       "Go home",
       "Buy a boat"
      ],
      "es": [
       "Visitar a sus amigos",
       "Volver a casa",
       "Comprar un barco"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        27,
        3
       ],
       "es": [
        44,
        27,
        3
       ]
      },
      "text": {
       "en": "And the next day we touched at Sidon. And Julius courteously entreated Paul, and gave him liberty to go unto his friends to refresh himself.",
       "es": "Y otro día llegamos á Sidón; y Julio, tratando á Pablo con humanidad, permitióle que fuese á los amigos, para ser de ellos asistido."
      },
      "ref": {
       "en": "Acts 27:3",
       "es": "Hechos 27:3"
      }
     }
    },
    {
     "x": 238,
     "y": 186,
     "name": {
      "en": "Crete",
      "es": "Creta"
     },
     "q": {
      "en": "What did Paul warn the sailors about?",
      "es": "¿De qué advirtió Pablo a los marineros?"
     },
     "choices": {
      "en": [
       "The trip would bring harm",
       "They had no food",
       "The sea was too small"
      ],
      "es": [
       "El viaje traería daño",
       "No tenían comida",
       "El mar era muy chico"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        27,
        10
       ],
       "es": [
        44,
        27,
        10
       ]
      },
      "text": {
       "en": "and said unto them, Sirs, I perceive that this voyage will be with hurt and much damage, not only of the lading and ship, but also of our lives.",
       "es": "Diciéndoles: Varones, veo que con trabajo y mucho daño, no sólo de la cargazón y de la nave, mas aun de nuestras personas, habrá de ser la navegación."
      },
      "ref": {
       "en": "Acts 27:10",
       "es": "Hechos 27:10"
      }
     }
    },
    {
     "x": 170,
     "y": 214,
     "name": {
      "en": "The storm",
      "es": "La tormenta"
     },
     "q": {
      "en": "In the storm, what did Paul tell everyone?",
      "es": "En la tormenta, ¿qué les dijo Pablo a todos?"
     },
     "choices": {
      "en": [
       "Be of good cheer; I believe God",
       "Jump into the sea",
       "Hide below and cry"
      ],
      "es": [
       "Tened buen ánimo; confío en Dios",
       "Salten al mar",
       "Escóndanse y lloren"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        27,
        25
       ],
       "es": [
        44,
        27,
        25
       ]
      },
      "text": {
       "en": "Wherefore, sirs, be of good cheer: for I believe God, that it shall be even as it was told me.",
       "es": "Por tanto, oh varones, tened buen ánimo; porque yo confío en Dios que será así como me ha dicho;"
      },
      "ref": {
       "en": "Acts 27:25",
       "es": "Hechos 27:25"
      }
     }
    },
    {
     "x": 108,
     "y": 178,
     "name": {
      "en": "Malta",
      "es": "Malta"
     },
     "q": {
      "en": "On Malta a snake bit Paul. What happened?",
      "es": "En Malta una víbora mordió a Pablo. ¿Qué pasó?"
     },
     "choices": {
      "en": [
       "He shook it off and was not hurt",
       "He became very sick",
       "He ran away"
      ],
      "es": [
       "La sacudió al fuego y no le pasó nada",
       "Se enfermó mucho",
       "Salió corriendo"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        28,
        5
       ],
       "es": [
        44,
        28,
        5
       ]
      },
      "text": {
       "en": "And he shook off the beast into the fire, and felt no harm.",
       "es": "Mas él, sacudiendo la víbora en el fuego, ningún mal padeció."
      },
      "ref": {
       "en": "Acts 28:5",
       "es": "Hechos 28:5"
      }
     }
    },
    {
     "x": 88,
     "y": 60,
     "name": {
      "en": "Rome",
      "es": "Roma"
     },
     "q": {
      "en": "What did Paul do in Rome?",
      "es": "¿Qué hizo Pablo en Roma?"
     },
     "choices": {
      "en": [
       "Taught about the Lord Jesus",
       "Became a soldier",
       "Built a ship"
      ],
      "es": [
       "Enseñó del Señor Jesucristo",
       "Se hizo soldado",
       "Construyó un barco"
      ]
     },
     "verse": {
      "at": {
       "en": [
        44,
        28,
        31
       ],
       "es": [
        44,
        28,
        31
       ]
      },
      "text": {
       "en": "preaching the kingdom of God, and teaching those things which concern the Lord Jesus Christ, with all confidence, no man forbidding him.",
       "es": "Predicando el reino de Dios y enseñando lo que es del Señor Jesucristo con toda libertad, sin impedimento."
      },
      "ref": {
       "en": "Acts 28:31",
       "es": "Hechos 28:31"
      }
     }
    }
   ]
  },
  {
   "id": "abraham",
   "icon": "⛺",
   "title": {
    "en": "Abraham to Canaan",
    "es": "Abraham a Canaán"
   },
   "travel": "🐪",
   "land": "abraham",
   "stops": [
    {
     "x": 350,
     "y": 220,
     "name": {
      "en": "Ur",
      "es": "Ur"
     },
     "q": {
      "en": "What did God tell Abram to do?",
      "es": "¿Qué le dijo Dios a Abram que hiciera?"
     },
     "choices": {
      "en": [
       "Leave home for a land God would show him",
       "Build a tall tower",
       "Stay home and rest"
      ],
      "es": [
       "Salir de su tierra a la tierra que Dios le mostraría",
       "Construir una torre alta",
       "Quedarse en casa y descansar"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        12,
        1
       ],
       "es": [
        1,
        12,
        1
       ]
      },
      "text": {
       "en": "Now the LORD had said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father's house, unto a land that I will shew thee:",
       "es": "EMPERO Jehová había dicho á Abram: Vete de tu tierra y de tu parentela, y de la casa de tu padre, á la tierra que te mostraré;"
      },
      "ref": {
       "en": "Genesis 12:1",
       "es": "Génesis 12:1"
      }
     }
    },
    {
     "x": 250,
     "y": 50,
     "name": {
      "en": "Haran",
      "es": "Harán"
     },
     "q": {
      "en": "Who went with Abram when he left Haran?",
      "es": "¿Quién fue con Abram cuando salió de Harán?"
     },
     "choices": {
      "en": [
       "His nephew Lot",
       "A king",
       "Nobody at all"
      ],
      "es": [
       "Su sobrino Lot",
       "Un rey",
       "Nadie"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        12,
        4
       ],
       "es": [
        1,
        12,
        4
       ]
      },
      "text": {
       "en": "So Abram departed, as the LORD had spoken unto him; and Lot went with him: and Abram was seventy and five years old when he departed out of Haran.",
       "es": "Y fuése Abram, como Jehová le dijo; y fué con él Lot: y era Abram de edad de setenta y cinco años cuando salió de Harán."
      },
      "ref": {
       "en": "Genesis 12:4",
       "es": "Génesis 12:4"
      }
     }
    },
    {
     "x": 110,
     "y": 150,
     "name": {
      "en": "Shechem",
      "es": "Siquem"
     },
     "q": {
      "en": "What did God promise Abram here?",
      "es": "¿Qué le prometió Dios a Abram aquí?"
     },
     "choices": {
      "en": [
       "This land for his family",
       "A big palace",
       "A pile of gold"
      ],
      "es": [
       "Esta tierra para su familia",
       "Un gran palacio",
       "Un montón de oro"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        12,
        7
       ],
       "es": [
        1,
        12,
        7
       ]
      },
      "text": {
       "en": "And the LORD appeared unto Abram, and said, Unto thy seed will I give this land: and there builded he an altar unto the LORD, who appeared unto him.",
       "es": "Y apareció Jehová á Abram, y le dijo: A tu simiente daré esta tierra. Y edificó allí un altar á Jehová, que le había aparecido."
      },
      "ref": {
       "en": "Genesis 12:7",
       "es": "Génesis 12:7"
      }
     }
    },
    {
     "x": 98,
     "y": 182,
     "name": {
      "en": "Bethel",
      "es": "Bethel"
     },
     "q": {
      "en": "What did Abram build near Bethel?",
      "es": "¿Qué edificó Abram cerca de Bethel?"
     },
     "choices": {
      "en": [
       "An altar to the LORD",
       "A boat",
       "A city wall"
      ],
      "es": [
       "Un altar a Jehová",
       "Un barco",
       "Un muro"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        12,
        8
       ],
       "es": [
        1,
        12,
        8
       ]
      },
      "text": {
       "en": "And he removed from thence unto a mountain on the east of Beth-el, and pitched his tent, having Beth-el on the west, and Hai on the east: and there he builded an altar unto the LORD, and called upon the name of the LORD.",
       "es": "Y pasóse de allí á un monte al oriente de Bethel, y tendió su tienda, teniendo á Bethel al occidente y Hai al oriente: y edificó allí altar á Jehová, é invocó el nombre de Jehová."
      },
      "ref": {
       "en": "Genesis 12:8",
       "es": "Génesis 12:8"
      }
     }
    },
    {
     "x": 92,
     "y": 226,
     "name": {
      "en": "Hebron",
      "es": "Hebrón"
     },
     "q": {
      "en": "Where did Abram pitch his tent?",
      "es": "¿Dónde puso Abram su tienda?"
     },
     "choices": {
      "en": [
       "By the oaks of Mamre in Hebron",
       "Inside a cave by the sea",
       "On top of a pyramid"
      ],
      "es": [
       "En el alcornocal de Mamre, en Hebrón",
       "En una cueva junto al mar",
       "Encima de una pirámide"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        13,
        18
       ],
       "es": [
        1,
        13,
        18
       ]
      },
      "text": {
       "en": "Then Abram removed his tent, and came and dwelt in the plain of Mamre, which is in Hebron, and built there an altar unto the LORD.",
       "es": "Abram, pues, removiendo su tienda, vino y moró en el alcornocal de Mamre, que es en Hebrón, y edificó allí altar á Jehová."
      },
      "ref": {
       "en": "Genesis 13:18",
       "es": "Génesis 13:18"
      }
     }
    },
    {
     "x": 140,
     "y": 240,
     "name": {
      "en": "Under the stars",
      "es": "Bajo las estrellas"
     },
     "q": {
      "en": "What did God ask Abram to count?",
      "es": "¿Qué le pidió Dios a Abram que contara?"
     },
     "choices": {
      "en": [
       "The stars in the sky",
       "His sheep",
       "The grains of sand in his shoe"
      ],
      "es": [
       "Las estrellas del cielo",
       "Sus ovejas",
       "Los granos de arena de su sandalia"
      ]
     },
     "verse": {
      "at": {
       "en": [
        1,
        15,
        5
       ],
       "es": [
        1,
        15,
        5
       ]
      },
      "text": {
       "en": "And he brought him forth abroad, and said, Look now toward heaven, and tell the stars, if thou be able to number them: and he said unto him, So shall thy seed be.",
       "es": "Y sacóle fuera, y dijo: Mira ahora á los cielos, y cuenta las estrellas, si las puedes contar. Y le dijo: Así será tu simiente."
      },
      "ref": {
       "en": "Genesis 15:5",
       "es": "Génesis 15:5"
      }
     }
    }
   ]
  },
  {
   "id": "jonah",
   "icon": "🐋",
   "title": {
    "en": "Jonah to Nineveh",
    "es": "Jonás a Nínive"
   },
   "travel": "⛵",
   "land": "jonah",
   "stops": [
    {
     "x": 330,
     "y": 120,
     "name": {
      "en": "Joppa",
      "es": "Jope"
     },
     "q": {
      "en": "Where did Jonah try to go?",
      "es": "¿A dónde quiso ir Jonás?"
     },
     "choices": {
      "en": [
       "Far away to Tarshish",
       "Straight to Nineveh",
       "Home to bed"
      ],
      "es": [
       "Lejos, a Tarsis",
       "Derecho a Nínive",
       "A su casa a dormir"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        1,
        3
       ],
       "es": [
        32,
        1,
        3
       ]
      },
      "text": {
       "en": "But Jonah rose up to flee unto Tarshish from the presence of the LORD, and went down to Joppa; and he found a ship going to Tarshish: so he paid the fare thereof, and went down into it, to go with them unto Tarshish from the presence of the LORD.",
       "es": "Y Jonás se levantó para huir de la presencia de Jehová á Tarsis, y descendió á Joppe; y halló un navío que partía para Tarsis; y pagando su pasaje entró en él, para irse con ellos á Tarsis de delante de Jehová."
      },
      "ref": {
       "en": "Jonah 1:3",
       "es": "Jonás 1:3"
      }
     }
    },
    {
     "x": 220,
     "y": 140,
     "name": {
      "en": "The storm",
      "es": "La tormenta"
     },
     "q": {
      "en": "What did God send on the sea?",
      "es": "¿Qué mandó Dios sobre el mar?"
     },
     "choices": {
      "en": [
       "A great wind and a big storm",
       "A rainbow",
       "A school of dolphins"
      ],
      "es": [
       "Un gran viento y una gran tempestad",
       "Un arco iris",
       "Un grupo de delfines"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        1,
        4
       ],
       "es": [
        32,
        1,
        4
       ]
      },
      "text": {
       "en": "But the LORD sent out a great wind into the sea, and there was a mighty tempest in the sea, so that the ship was like to be broken.",
       "es": "Mas Jehová hizo levantar un gran viento en la mar, é hízose una tan gran tempestad en la mar, que pensóse se rompería la nave."
      },
      "ref": {
       "en": "Jonah 1:4",
       "es": "Jonás 1:4"
      }
     }
    },
    {
     "x": 130,
     "y": 190,
     "name": {
      "en": "The big fish",
      "es": "El gran pez"
     },
     "q": {
      "en": "How long was Jonah inside the fish?",
      "es": "¿Cuánto tiempo estuvo Jonás dentro del pez?"
     },
     "choices": {
      "en": [
       "Three days and three nights",
       "One hour",
       "A whole year"
      ],
      "es": [
       "Tres días y tres noches",
       "Una hora",
       "Un año entero"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        1,
        17
       ],
       "es": [
        32,
        2,
        1
       ]
      },
      "text": {
       "en": "Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.",
       "es": "MAS Jehová había prevenido un gran pez que tragase á Jonás: y estuvo Jonás en el vientre del pez tres días y tres noches."
      },
      "ref": {
       "en": "Jonah 1:17",
       "es": "Jonás 2:1"
      }
     }
    },
    {
     "x": 300,
     "y": 205,
     "name": {
      "en": "Dry land",
      "es": "Tierra seca"
     },
     "q": {
      "en": "What did God tell the fish to do?",
      "es": "¿Qué le mandó Dios al pez?"
     },
     "choices": {
      "en": [
       "Put Jonah out on dry land",
       "Swim to the bottom",
       "Keep Jonah forever"
      ],
      "es": [
       "Dejar a Jonás en tierra",
       "Nadar hasta el fondo",
       "Quedarse con Jonás para siempre"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        2,
        10
       ],
       "es": [
        32,
        2,
        10
       ]
      },
      "text": {
       "en": "And the LORD spake unto the fish, and it vomited out Jonah upon the dry land.",
       "es": "Yo empero con voz de alabanza te sacrificaré; pagaré lo que prometí. La salvación pertenece á Jehová. Y mandó Jehová al pez, y vomitó á Jonás en tierra."
      },
      "ref": {
       "en": "Jonah 2:10",
       "es": "Jonás 2:10"
      }
     }
    },
    {
     "x": 330,
     "y": 50,
     "name": {
      "en": "Nineveh",
      "es": "Nínive"
     },
     "q": {
      "en": "What kind of city was Nineveh?",
      "es": "¿Cómo era la ciudad de Nínive?"
     },
     "choices": {
      "en": [
       "A very great city, three days’ walk",
       "A tiny village",
       "A city under the sea"
      ],
      "es": [
       "Una ciudad muy grande, de tres días de camino",
       "Una aldea pequeñita",
       "Una ciudad bajo el mar"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        3,
        3
       ],
       "es": [
        32,
        3,
        3
       ]
      },
      "text": {
       "en": "So Jonah arose, and went unto Nineveh, according to the word of the LORD. Now Nineveh was an exceeding great city of three days' journey.",
       "es": "Y levantóse Jonás, y fué á Nínive, conforme á la palabra de Jehová. Y era Nínive ciudad sobremanera grande, de tres días de camino."
      },
      "ref": {
       "en": "Jonah 3:3",
       "es": "Jonás 3:3"
      }
     }
    },
    {
     "x": 372,
     "y": 72,
     "name": {
      "en": "The vine",
      "es": "La calabacera"
     },
     "q": {
      "en": "What did God make grow over Jonah?",
      "es": "¿Qué hizo crecer Dios sobre Jonás?"
     },
     "choices": {
      "en": [
       "A plant to shade his head",
       "A tall tree house",
       "A big umbrella"
      ],
      "es": [
       "Una planta para darle sombra",
       "Una casa en un árbol",
       "Un paraguas grande"
      ]
     },
     "verse": {
      "at": {
       "en": [
        32,
        4,
        6
       ],
       "es": [
        32,
        4,
        6
       ]
      },
      "text": {
       "en": "And the LORD God prepared a gourd, and made it to come up over Jonah, that it might be a shadow over his head, to deliver him from his grief. So Jonah was exceeding glad of the gourd.",
       "es": "Y preparó Jehová Dios una calabacera, la cual creció sobre Jonás para que hiciese sombra sobre su cabeza, y le defendiese de su mal: y Jonás se alegró grandemente por la calabacera."
      },
      "ref": {
       "en": "Jonah 4:6",
       "es": "Jonás 4:6"
      }
     }
    }
   ]
  },
  {
   "id": "ruth",
   "icon": "🌾",
   "title": {
    "en": "Ruth to Bethlehem",
    "es": "Rut a Belén"
   },
   "travel": "🚶",
   "land": "ruth",
   "stops": [
    {
     "x": 330,
     "y": 210,
     "name": {
      "en": "Moab",
      "es": "Moab"
     },
     "q": {
      "en": "What did Ruth promise Naomi?",
      "es": "¿Qué le prometió Rut a Noemí?"
     },
     "choices": {
      "en": [
       "Your God will be my God",
       "I will go back home",
       "I will find a new family"
      ],
      "es": [
       "Tu Dios será mi Dios",
       "Volveré a mi casa",
       "Buscaré otra familia"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        1,
        16
       ],
       "es": [
        8,
        1,
        16
       ]
      },
      "text": {
       "en": "And Ruth said, Intreat me not to leave thee, or to return from following after thee: for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and thy God my God:",
       "es": "Y Ruth respondió: No me ruegues que te deje, y me aparte de ti: porque donde quiera que tú fueres, iré yo; y donde quiera que vivieres, viviré. Tu pueblo será mi pueblo, y tu Dios mi Dios."
      },
      "ref": {
       "en": "Ruth 1:16",
       "es": "Rut 1:16"
      }
     }
    },
    {
     "x": 250,
     "y": 150,
     "name": {
      "en": "The road",
      "es": "El camino"
     },
     "q": {
      "en": "Who walked to Bethlehem together?",
      "es": "¿Quiénes caminaron juntas a Belén?"
     },
     "choices": {
      "en": [
       "Ruth and Naomi",
       "Ruth and a king",
       "Naomi and a lion"
      ],
      "es": [
       "Rut y Noemí",
       "Rut y un rey",
       "Noemí y un león"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        1,
        19
       ],
       "es": [
        8,
        1,
        19
       ]
      },
      "text": {
       "en": "So they two went until they came to Beth-lehem. And it came to pass, when they were come to Beth-lehem, that all the city was moved about them, and they said, Is this Naomi?",
       "es": "Anduvieron pues ellas dos hasta que llegaron á Beth-lehem: y aconteció que entrando en Beth-lehem, toda la ciudad se conmovió por razón de ellas, y decían: ¿No es ésta Noemi?"
      },
      "ref": {
       "en": "Ruth 1:19",
       "es": "Rut 1:19"
      }
     }
    },
    {
     "x": 150,
     "y": 110,
     "name": {
      "en": "Bethlehem",
      "es": "Belén"
     },
     "q": {
      "en": "When did they reach Bethlehem?",
      "es": "¿Cuándo llegaron a Belén?"
     },
     "choices": {
      "en": [
       "At the start of the barley harvest",
       "In the middle of winter snow",
       "On a stormy night at sea"
      ],
      "es": [
       "Al principio de la siega de la cebada",
       "En medio de la nieve del invierno",
       "En una noche de tormenta en el mar"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        1,
        22
       ],
       "es": [
        8,
        1,
        22
       ]
      },
      "text": {
       "en": "So Naomi returned, and Ruth the Moabitess, her daughter in law, with her, which returned out of the country of Moab: and they came to Beth-lehem in the beginning of barley harvest.",
       "es": "Así volvió Noemi y Ruth Moabita su nuera con ella; volvió de los campos de Moab, y llegaron á Beth-lehem en el principio de la siega de las cebadas."
      },
      "ref": {
       "en": "Ruth 1:22",
       "es": "Rut 1:22"
      }
     }
    },
    {
     "x": 100,
     "y": 160,
     "name": {
      "en": "The barley field",
      "es": "El campo de cebada"
     },
     "q": {
      "en": "Whose field did Ruth work in?",
      "es": "¿En el campo de quién trabajó Rut?"
     },
     "choices": {
      "en": [
       "The field of Boaz",
       "The king’s garden",
       "A field in Egypt"
      ],
      "es": [
       "El campo de Booz",
       "El jardín del rey",
       "Un campo en Egipto"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        2,
        3
       ],
       "es": [
        8,
        2,
        3
       ]
      },
      "text": {
       "en": "And she went, and came, and gleaned in the field after the reapers: and her hap was to light on a part of the field belonging unto Boaz, who was of the kindred of Elimelech.",
       "es": "Fué pues, y llegando, espigó en el campo en pos de los segadores: y aconteció por ventura, que la suerte del campo era de Booz, el cual era de la parentela de Elimelech."
      },
      "ref": {
       "en": "Ruth 2:3",
       "es": "Rut 2:3"
      }
     }
    },
    {
     "x": 70,
     "y": 120,
     "name": {
      "en": "Under His wings",
      "es": "Bajo sus alas"
     },
     "q": {
      "en": "Boaz said Ruth came to trust God, like hiding under...",
      "es": "Booz dijo que Rut vino a confiar en Dios, como cubrirse bajo..."
     },
     "choices": {
      "en": [
       "His wings",
       "A big rock",
       "A tent"
      ],
      "es": [
       "Sus alas",
       "Una gran roca",
       "Una tienda"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        2,
        12
       ],
       "es": [
        8,
        2,
        12
       ]
      },
      "text": {
       "en": "The LORD recompense thy work, and a full reward be given thee of the LORD God of Israel, under whose wings thou art come to trust.",
       "es": "Jehová galardone tu obra, y tu remuneración sea llena por Jehová Dios de Israel, que has venido para cubrirte debajo de sus alas."
      },
      "ref": {
       "en": "Ruth 2:12",
       "es": "Rut 2:12"
      }
     }
    },
    {
     "x": 140,
     "y": 70,
     "name": {
      "en": "The town gate",
      "es": "La puerta del pueblo"
     },
     "q": {
      "en": "Who was Ruth’s great-grandson?",
      "es": "¿Quién fue bisnieto de Rut?"
     },
     "choices": {
      "en": [
       "King David",
       "Moses",
       "Jonah"
      ],
      "es": [
       "El rey David",
       "Moisés",
       "Jonás"
      ]
     },
     "verse": {
      "at": {
       "en": [
        8,
        4,
        17
       ],
       "es": [
        8,
        4,
        17
       ]
      },
      "text": {
       "en": "And the women her neighbours gave it a name, saying, There is a son born to Naomi; and they called his name Obed: he is the father of Jesse, the father of David.",
       "es": "Y las vecinas diciendo, A Noemi ha nacido un hijo, le pusieron nombre; y llamáronle Obed. Este es padre de Isaí, padre de David."
      },
      "ref": {
       "en": "Ruth 4:17",
       "es": "Rut 4:17"
      }
     }
    }
   ]
  },
  {
   "id": "magi",
   "icon": "⭐",
   "title": {
    "en": "The wise men to Bethlehem",
    "es": "Los magos a Belén"
   },
   "travel": "🐫",
   "land": "magi",
   "stops": [
    {
     "x": 360,
     "y": 90,
     "name": {
      "en": "The East",
      "es": "El oriente"
     },
     "q": {
      "en": "What did the wise men see in the east?",
      "es": "¿Qué vieron los magos en el oriente?"
     },
     "choices": {
      "en": [
       "His star",
       "A big storm",
       "A flock of birds"
      ],
      "es": [
       "Su estrella",
       "Una gran tormenta",
       "Una bandada de aves"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        2
       ],
       "es": [
        40,
        2,
        2
       ]
      },
      "text": {
       "en": "saying, Where is he that is born King of the Jews? for we have seen his star in the east, and are come to worship him.",
       "es": "Diciendo: ¿Dónde está el Rey de los Judíos, que ha nacido? porque su estrella hemos visto en el oriente, y venimos á adorarle."
      },
      "ref": {
       "en": "Matthew 2:2",
       "es": "Mateo 2:2"
      }
     }
    },
    {
     "x": 250,
     "y": 130,
     "name": {
      "en": "The desert road",
      "es": "El camino del desierto"
     },
     "q": {
      "en": "Where were the wise men going?",
      "es": "¿A dónde iban los magos?"
     },
     "choices": {
      "en": [
       "To find the newborn King",
       "To buy camels",
       "To build a city"
      ],
      "es": [
       "A buscar al Rey que había nacido",
       "A comprar camellos",
       "A construir una ciudad"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        1
       ],
       "es": [
        40,
        2,
        1
       ]
      },
      "text": {
       "en": "Now when Jesus was born in Bethlehem of Judæa in the days of Herod the king, behold, there came wise men from the east to Jerusalem,",
       "es": "Y COMO fué nacido Jesús en Bethlehem de Judea en días del rey Herodes, he aquí unos magos vinieron del oriente á Jerusalem,"
      },
      "ref": {
       "en": "Matthew 2:1",
       "es": "Mateo 2:1"
      }
     }
    },
    {
     "x": 130,
     "y": 120,
     "name": {
      "en": "Jerusalem",
      "es": "Jerusalén"
     },
     "q": {
      "en": "When they left Jerusalem, what went before them?",
      "es": "Al salir de Jerusalén, ¿qué iba delante de ellos?"
     },
     "choices": {
      "en": [
       "The star",
       "A soldier",
       "A big cloud"
      ],
      "es": [
       "La estrella",
       "Un soldado",
       "Una gran nube"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        9
       ],
       "es": [
        40,
        2,
        9
       ]
      },
      "text": {
       "en": "When they had heard the king, they departed; and, lo, the star, which they saw in the east, went before them, till it came and stood over where the young child was.",
       "es": "Y ellos, habiendo oído al rey, se fueron: y he aquí la estrella que habían visto en el oriente, iba delante de ellos, hasta que llegando, se puso sobre donde estaba el niño."
      },
      "ref": {
       "en": "Matthew 2:9",
       "es": "Mateo 2:9"
      }
     }
    },
    {
     "x": 120,
     "y": 175,
     "name": {
      "en": "Great joy",
      "es": "Gran gozo"
     },
     "q": {
      "en": "How did they feel when they saw the star?",
      "es": "¿Cómo se sintieron al ver la estrella?"
     },
     "choices": {
      "en": [
       "Full of great joy",
       "Scared",
       "Sleepy"
      ],
      "es": [
       "Llenos de muy grande gozo",
       "Asustados",
       "Con sueño"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        10
       ],
       "es": [
        40,
        2,
        10
       ]
      },
      "text": {
       "en": "When they saw the star, they rejoiced with exceeding great joy.",
       "es": "Y vista la estrella, se regocijaron con muy grande gozo."
      },
      "ref": {
       "en": "Matthew 2:10",
       "es": "Mateo 2:10"
      }
     }
    },
    {
     "x": 125,
     "y": 215,
     "name": {
      "en": "Bethlehem",
      "es": "Belén"
     },
     "q": {
      "en": "What gifts did they give Jesus?",
      "es": "¿Qué regalos le dieron a Jesús?"
     },
     "choices": {
      "en": [
       "Gold, frankincense and myrrh",
       "Toys and candy",
       "Bread and fish"
      ],
      "es": [
       "Oro, incienso y mirra",
       "Juguetes y dulces",
       "Pan y peces"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        11
       ],
       "es": [
        40,
        2,
        11
       ]
      },
      "text": {
       "en": "And when they were come into the house, they saw the young child with Mary his mother, and fell down, and worshipped him: and when they had opened their treasures, they presented unto him gifts; gold, and frankincense, and myrrh.",
       "es": "Y entrando en la casa, vieron al niño con su madre María, y postrándose, le adoraron; y abriendo sus tesoros, le ofrecieron dones, oro é incienso y mirra."
      },
      "ref": {
       "en": "Matthew 2:11",
       "es": "Mateo 2:11"
      }
     }
    },
    {
     "x": 300,
     "y": 230,
     "name": {
      "en": "Another way home",
      "es": "Por otro camino"
     },
     "q": {
      "en": "Why did they go home another way?",
      "es": "¿Por qué volvieron por otro camino?"
     },
     "choices": {
      "en": [
       "God warned them in a dream",
       "They got lost",
       "The camels were tired"
      ],
      "es": [
       "Dios les avisó en un sueño",
       "Se perdieron",
       "Los camellos estaban cansados"
      ]
     },
     "verse": {
      "at": {
       "en": [
        40,
        2,
        12
       ],
       "es": [
        40,
        2,
        12
       ]
      },
      "text": {
       "en": "And being warned of God in a dream that they should not return to Herod, they departed into their own country another way.",
       "es": "Y siendo avisados por revelación en sueños que no volviesen á Herodes, se volvieron á su tierra por otro camino."
      },
      "ref": {
       "en": "Matthew 2:12",
       "es": "Mateo 2:12"
      }
     }
    }
   ]
  }
 ],
 "ORDER": [
  {
   "id": "beginnings",
   "title": {
    "en": "In the beginning",
    "es": "En el principio"
   },
   "cards": [
    "creation",
    "noah",
    "stars",
    "joseph",
    "moses"
   ],
   "verse": {
    "at": {
     "en": [
      1,
      1,
      1
     ],
     "es": [
      1,
      1,
      1
     ]
    },
    "text": {
     "en": "In the beginning God created the heaven and the earth.",
     "es": "EN el principio crió Dios los cielos y la tierra."
    },
    "ref": {
     "en": "Genesis 1:1",
     "es": "Génesis 1:1"
    }
   }
  },
  {
   "id": "kings",
   "title": {
    "en": "Brave and faithful",
    "es": "Valientes y fieles"
   },
   "cards": [
    "moses",
    "david",
    "jonah",
    "daniel",
    "nativity"
   ],
   "verse": {
    "at": {
     "en": [
      20,
      3,
      5
     ],
     "es": [
      20,
      3,
      5
     ]
    },
    "text": {
     "en": "Trust in the LORD with all thine heart; And lean not unto thine own understanding.",
     "es": "Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia."
    },
    "ref": {
     "en": "Proverbs 3:5",
     "es": "Proverbios 3:5"
    }
   }
  },
  {
   "id": "promise",
   "title": {
    "en": "God keeps His promise",
    "es": "Dios cumple su promesa"
   },
   "cards": [
    "stars",
    "moses",
    "david",
    "daniel",
    "nativity",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      42,
      2,
      11
     ],
     "es": [
      42,
      2,
      11
     ]
    },
    "text": {
     "en": "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.",
     "es": "Que os ha nacido hoy, en la ciudad de David, un Salvador, que es CRISTO el Señor."
    },
    "ref": {
     "en": "Luke 2:11",
     "es": "Lucas 2:11"
    }
   }
  },
  {
   "id": "whole",
   "title": {
    "en": "The whole story",
    "es": "Toda la historia"
   },
   "cards": [
    "creation",
    "noah",
    "joseph",
    "david",
    "jonah",
    "nativity"
   ],
   "verse": {
    "at": {
     "en": [
      40,
      28,
      6
     ],
     "es": [
      40,
      28,
      6
     ]
    },
    "text": {
     "en": "He is not here: for he is risen, as he said. Come, see the place where the Lord lay.",
     "es": "No está aquí; porque ha resucitado, como dijo. Venid, ved el lugar donde fué puesto el Señor."
    },
    "ref": {
     "en": "Matthew 28:6",
     "es": "Mateo 28:6"
    }
   }
  },
  {
   "id": "miracles",
   "title": {
    "en": "Jesus does wonders",
    "es": "Jesús hace maravillas"
   },
   "cards": [
    "nativity",
    "storm",
    "feeding",
    "children",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      40,
      8,
      27
     ],
     "es": [
      40,
      8,
      27
     ]
    },
    "text": {
     "en": "But the men marvelled, saying, What manner of man is this, that even the winds and the sea obey him!",
     "es": "Y los hombres se maravillaron, diciendo: ¿Qué hombre es éste, que aun los vientos y la mar le obedecen?"
    },
    "ref": {
     "en": "Matthew 8:27",
     "es": "Mateo 8:27"
    }
   }
  },
  {
   "id": "shepherd",
   "title": {
    "en": "Shepherds and sheep",
    "es": "Pastores y ovejas"
   },
   "cards": [
    "david",
    "nativity",
    "sheep",
    "children",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      43,
      10,
      14
     ],
     "es": [
      43,
      10,
      14
     ]
    },
    "text": {
     "en": "I am the good shepherd, and know my sheep, and am known of mine.",
     "es": "Yo soy el buen pastor; y conozco mis ovejas, y las mías me conocen."
    },
    "ref": {
     "en": "John 10:14",
     "es": "Juan 10:14"
    }
   }
  },
  {
   "id": "brave",
   "title": {
    "en": "Brave for God",
    "es": "Valientes para Dios"
   },
   "cards": [
    "noah",
    "moses",
    "david",
    "jonah",
    "daniel"
   ],
   "verse": {
    "at": {
     "en": [
      6,
      1,
      9
     ],
     "es": [
      6,
      1,
      9
     ]
    },
    "text": {
     "en": "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
     "es": "Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres."
    },
    "ref": {
     "en": "Joshua 1:9",
     "es": "Josué 1:9"
    }
   }
  },
  {
   "id": "jesus",
   "title": {
    "en": "The life of Jesus",
    "es": "La vida de Jesús"
   },
   "cards": [
    "nativity",
    "storm",
    "feeding",
    "sheep",
    "children",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      43,
      20,
      31
     ],
     "es": [
      43,
      20,
      31
     ]
    },
    "text": {
     "en": "but these are written, that ye might believe that Jesus is the Christ, the Son of God; and that believing ye might have life through his name.",
     "es": "Estas empero son escritas, para que creáis que Jesús es el Cristo, el Hijo de Dios; y para que creyendo, tengáis vida en su nombre."
    },
    "ref": {
     "en": "John 20:31",
     "es": "Juan 20:31"
    }
   }
  },
  {
   "id": "goodness",
   "title": {
    "en": "God is good",
    "es": "Dios es bueno"
   },
   "cards": [
    "creation",
    "stars",
    "joseph",
    "daniel",
    "feeding",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      19,
      145,
      9
     ],
     "es": [
      19,
      145,
      9
     ]
    },
    "text": {
     "en": "The LORD is good to all: And his tender mercies are over all his works.",
     "es": "Bueno es Jehová para con todos; y sus misericordias sobre todas sus obras."
    },
    "ref": {
     "en": "Psalms 145:9",
     "es": "Salmos 145:9"
    }
   }
  },
  {
   "id": "mercy",
   "title": {
    "en": "God never gives up",
    "es": "Dios nunca se rinde"
   },
   "cards": [
    "creation",
    "noah",
    "moses",
    "jonah",
    "sheep",
    "easter"
   ],
   "verse": {
    "at": {
     "en": [
      42,
      19,
      10
     ],
     "es": [
      42,
      19,
      10
     ]
    },
    "text": {
     "en": "For the Son of man is come to seek and to save that which was lost.",
     "es": "Porque el Hijo del hombre vino á buscar y á salvar lo que se había perdido."
    },
    "ref": {
     "en": "Luke 19:10",
     "es": "Lucas 19:10"
    }
   }
  }
 ],
 "PEOPLE": {
  "god": {
   "en": "God",
   "es": "Dios"
  },
  "cain": {
   "en": "Cain",
   "es": "Caín"
  },
  "samuel": {
   "en": "Samuel",
   "es": "Samuel"
  },
  "isaiah": {
   "en": "Isaiah",
   "es": "Isaías"
  },
  "ruth": {
   "en": "Ruth",
   "es": "Rut"
  },
  "david": {
   "en": "David",
   "es": "David"
  },
  "mary": {
   "en": "Mary",
   "es": "María"
  },
  "peter": {
   "en": "Peter",
   "es": "Pedro"
  },
  "jesus": {
   "en": "Jesus",
   "es": "Jesús"
  },
  "thomas": {
   "en": "Thomas",
   "es": "Tomás"
  },
  "moses": {
   "en": "Moses",
   "es": "Moisés"
  },
  "daniel": {
   "en": "Daniel",
   "es": "Daniel"
  },
  "jonah": {
   "en": "Jonah",
   "es": "Jonás"
  },
  "john": {
   "en": "John the Baptist",
   "es": "Juan el Bautista"
  },
  "disciples": {
   "en": "The disciples",
   "es": "Los discípulos"
  },
  "joshua": {
   "en": "Joshua",
   "es": "Josué"
  },
  "abraham": {
   "en": "Abraham",
   "es": "Abraham"
  },
  "joseph": {
   "en": "Joseph",
   "es": "José"
  },
  "elijah": {
   "en": "Elijah",
   "es": "Elías"
  },
  "esther": {
   "en": "Esther",
   "es": "Ester"
  },
  "job": {
   "en": "Job",
   "es": "Job"
  },
  "solomon": {
   "en": "Solomon",
   "es": "Salomón"
  },
  "gabriel": {
   "en": "The angel Gabriel",
   "es": "El ángel Gabriel"
  },
  "angels": {
   "en": "The angels",
   "es": "Los ángeles"
  },
  "paul": {
   "en": "Paul and Silas",
   "es": "Pablo y Silas"
  },
  "centurion": {
   "en": "The centurion",
   "es": "El centurión"
  },
  "zacchaeus": {
   "en": "Zacchaeus",
   "es": "Zaqueo"
  },
  "hannah": {
   "en": "Hannah",
   "es": "Ana"
  },
  "martha": {
   "en": "Martha",
   "es": "Marta"
  }
 },
 "PICTURES": {
  "creation": {
   "en": "God makes the world",
   "es": "Dios hace el mundo"
  },
  "noah": {
   "en": "Noah builds the ark",
   "es": "Noé construye el arca"
  },
  "stars": {
   "en": "Abraham counts the stars",
   "es": "Abraham cuenta las estrellas"
  },
  "joseph": {
   "en": "Joseph and his brothers",
   "es": "José y sus hermanos"
  },
  "moses": {
   "en": "Baby Moses in the basket",
   "es": "El bebé Moisés en la cesta"
  },
  "david": {
   "en": "David faces Goliath",
   "es": "David frente a Goliat"
  },
  "jonah": {
   "en": "Jonah and the big fish",
   "es": "Jonás y el gran pez"
  },
  "daniel": {
   "en": "Daniel in the lions’ den",
   "es": "Daniel en el foso de los leones"
  },
  "nativity": {
   "en": "Jesus is born",
   "es": "Nace Jesús"
  },
  "storm": {
   "en": "Jesus calms the storm",
   "es": "Jesús calma la tormenta"
  },
  "feeding": {
   "en": "Jesus feeds five thousand",
   "es": "Jesús alimenta a cinco mil"
  },
  "sheep": {
   "en": "The shepherd finds the lost sheep",
   "es": "El pastor halla la oveja perdida"
  },
  "children": {
   "en": "Jesus blesses the children",
   "es": "Jesús bendice a los niños"
  },
  "easter": {
   "en": "Jesus is risen",
   "es": "¡Jesús resucitó!"
  }
 },
 "QUOTES": [
  {
   "who": "god",
   "quote": {
    "en": "Let there be light",
    "es": "Sea la luz"
   },
   "verse": {
    "at": {
     "en": [
      1,
      1,
      3
     ],
     "es": [
      1,
      1,
      3
     ]
    },
    "text": {
     "en": "And God said, Let there be light: and there was light.",
     "es": "Y dijo Dios: Sea la luz: y fué la luz."
    },
    "ref": {
     "en": "Genesis 1:3",
     "es": "Génesis 1:3"
    }
   }
  },
  {
   "who": "cain",
   "quote": {
    "en": "Am I my brother's keeper?",
    "es": "¿soy yo guarda de mi hermano?"
   },
   "verse": {
    "at": {
     "en": [
      1,
      4,
      9
     ],
     "es": [
      1,
      4,
      9
     ]
    },
    "text": {
     "en": "And the LORD said unto Cain, Where is Abel thy brother? And he said, I know not: Am I my brother's keeper?",
     "es": "Y Jehová dijo á Caín: ¿Dónde está Abel tu hermano? Y él respondió: No sé; ¿soy yo guarda de mi hermano?"
    },
    "ref": {
     "en": "Genesis 4:9",
     "es": "Génesis 4:9"
    }
   }
  },
  {
   "who": "samuel",
   "quote": {
    "en": "Speak; for thy servant heareth.",
    "es": "Habla, que tu siervo oye."
   },
   "verse": {
    "at": {
     "en": [
      9,
      3,
      10
     ],
     "es": [
      9,
      3,
      10
     ]
    },
    "text": {
     "en": "And the LORD came, and stood, and called as at other times, Samuel, Samuel. Then Samuel answered, Speak; for thy servant heareth.",
     "es": "Y vino Jehová, y paróse, y llamó como las otras veces: ¡Samuel, Samuel! Entonces Samuel dijo: Habla, que tu siervo oye."
    },
    "ref": {
     "en": "1 Samuel 3:10",
     "es": "1 Samuel 3:10"
    }
   }
  },
  {
   "who": "isaiah",
   "quote": {
    "en": "Here am I; send me.",
    "es": "Heme aquí, envíame á mí."
   },
   "verse": {
    "at": {
     "en": [
      23,
      6,
      8
     ],
     "es": [
      23,
      6,
      8
     ]
    },
    "text": {
     "en": "Also I heard the voice of the Lord, saying, Whom shall I send, and who will go for us? Then said I, Here am I; send me.",
     "es": "Después oí la voz del Señor, que decía: ¿A quién enviaré, y quién nos irá? Entonces respondí yo: Heme aquí, envíame á mí."
    },
    "ref": {
     "en": "Isaiah 6:8",
     "es": "Isaías 6:8"
    }
   }
  },
  {
   "who": "ruth",
   "quote": {
    "en": "thy people shall be my people, and thy God my God",
    "es": "Tu pueblo será mi pueblo, y tu Dios mi Dios."
   },
   "verse": {
    "at": {
     "en": [
      8,
      1,
      16
     ],
     "es": [
      8,
      1,
      16
     ]
    },
    "text": {
     "en": "And Ruth said, Intreat me not to leave thee, or to return from following after thee: for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and thy God my God:",
     "es": "Y Ruth respondió: No me ruegues que te deje, y me aparte de ti: porque donde quiera que tú fueres, iré yo; y donde quiera que vivieres, viviré. Tu pueblo será mi pueblo, y tu Dios mi Dios."
    },
    "ref": {
     "en": "Ruth 1:16",
     "es": "Rut 1:16"
    }
   }
  },
  {
   "who": "david",
   "quote": {
    "en": "The LORD is my shepherd; I shall not want.",
    "es": "JEHOVÁ es mi pastor; nada me faltará."
   },
   "verse": {
    "at": {
     "en": [
      19,
      23,
      1
     ],
     "es": [
      19,
      23,
      1
     ]
    },
    "text": {
     "en": "The LORD is my shepherd; I shall not want.",
     "es": "JEHOVÁ es mi pastor; nada me faltará."
    },
    "ref": {
     "en": "Psalms 23:1",
     "es": "Salmos 23:1"
    }
   }
  },
  {
   "who": "mary",
   "quote": {
    "en": "Behold the handmaid of the Lord; be it unto me according to thy word.",
    "es": "He aquí la sierva del Señor; hágase á mí conforme á tu palabra."
   },
   "verse": {
    "at": {
     "en": [
      42,
      1,
      38
     ],
     "es": [
      42,
      1,
      38
     ]
    },
    "text": {
     "en": "And Mary said, Behold the handmaid of the Lord; be it unto me according to thy word. And the angel departed from her.",
     "es": "Entonces María dijo: He aquí la sierva del Señor; hágase á mí conforme á tu palabra. Y el ángel partió de ella."
    },
    "ref": {
     "en": "Luke 1:38",
     "es": "Lucas 1:38"
    }
   }
  },
  {
   "who": "peter",
   "quote": {
    "en": "Thou art the Christ, the Son of the living God.",
    "es": "Tú eres el Cristo, el Hijo del Dios viviente."
   },
   "verse": {
    "at": {
     "en": [
      40,
      16,
      16
     ],
     "es": [
      40,
      16,
      16
     ]
    },
    "text": {
     "en": "And Simon Peter answered and said, Thou art the Christ, the Son of the living God.",
     "es": "Y respondiendo Simón Pedro, dijo: Tú eres el Cristo, el Hijo del Dios viviente."
    },
    "ref": {
     "en": "Matthew 16:16",
     "es": "Mateo 16:16"
    }
   }
  },
  {
   "who": "jesus",
   "quote": {
    "en": "Suffer the little children to come unto me, and forbid them not",
    "es": "Dejad los niños venir, y no se lo estorbéis"
   },
   "verse": {
    "at": {
     "en": [
      41,
      10,
      14
     ],
     "es": [
      41,
      10,
      14
     ]
    },
    "text": {
     "en": "But when Jesus saw it, he was much displeased, and said unto them, Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God.",
     "es": "Y viéndolo Jesús, se enojó, y les dijo: Dejad los niños venir, y no se lo estorbéis; porque de los tales es el reino de Dios."
    },
    "ref": {
     "en": "Mark 10:14",
     "es": "Marcos 10:14"
    }
   }
  },
  {
   "who": "thomas",
   "quote": {
    "en": "My Lord and my God.",
    "es": "¡Señor mío, y Dios mío!"
   },
   "verse": {
    "at": {
     "en": [
      43,
      20,
      28
     ],
     "es": [
      43,
      20,
      28
     ]
    },
    "text": {
     "en": "And Thomas answered and said unto him, My Lord and my God.",
     "es": "Entonces Tomás respondió, y díjole: ¡Señor mío, y Dios mío!"
    },
    "ref": {
     "en": "John 20:28",
     "es": "Juan 20:28"
    }
   }
  },
  {
   "who": "moses",
   "quote": {
    "en": "Let my people go",
    "es": "Deja ir á mi pueblo"
   },
   "verse": {
    "at": {
     "en": [
      2,
      5,
      1
     ],
     "es": [
      2,
      5,
      1
     ]
    },
    "text": {
     "en": "And afterward Moses and Aaron went in, and told Pharaoh, Thus saith the LORD God of Israel, Let my people go, that they may hold a feast unto me in the wilderness.",
     "es": "DESPUÉS entraron Moisés y Aarón á Faraón, y le dijeron: Jehová, el Dios de Israel, dice así: Deja ir á mi pueblo á celebrarme fiesta en el desierto."
    },
    "ref": {
     "en": "Exodus 5:1",
     "es": "Éxodo 5:1"
    }
   }
  },
  {
   "who": "daniel",
   "quote": {
    "en": "My God hath sent his angel, and hath shut the lions' mouths",
    "es": "El Dios mío envió su ángel, el cual cerró la boca de los leones"
   },
   "verse": {
    "at": {
     "en": [
      27,
      6,
      22
     ],
     "es": [
      27,
      6,
      22
     ]
    },
    "text": {
     "en": "My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt.",
     "es": "El Dios mío envió su ángel, el cual cerró la boca de los leones, para que no me hiciesen mal: porque delante de él se halló en mí justicia: y aun delante de ti, oh rey, yo no he hecho lo que no debiese."
    },
    "ref": {
     "en": "Daniel 6:22",
     "es": "Daniel 6:22"
    }
   }
  },
  {
   "who": "jonah",
   "quote": {
    "en": "Out of the belly of hell cried I, And thou heardest my voice.",
    "es": "del vientre del sepulcro clamé, y mi voz oiste."
   },
   "verse": {
    "at": {
     "en": [
      32,
      2,
      2
     ],
     "es": [
      32,
      2,
      3
     ]
    },
    "text": {
     "en": "and said, I cried by reason of mine affliction unto the LORD, And he heard me; Out of the belly of hell cried I, And thou heardest my voice.",
     "es": "Y dijo: Clamé de mi tribulación á Jehová, y él me oyó; del vientre del sepulcro clamé, y mi voz oiste."
    },
    "ref": {
     "en": "Jonah 2:2",
     "es": "Jonás 2:3"
    }
   }
  },
  {
   "who": "john",
   "quote": {
    "en": "Behold the Lamb of God, which taketh away the sin of the world.",
    "es": "He aquí el Cordero de Dios, que quita el pecado del mundo."
   },
   "verse": {
    "at": {
     "en": [
      43,
      1,
      29
     ],
     "es": [
      43,
      1,
      29
     ]
    },
    "text": {
     "en": "The next day John seeth Jesus coming unto him, and saith, Behold the Lamb of God, which taketh away the sin of the world.",
     "es": "El siguiente día ve Juan á Jesús que venía á él, y dice: He aquí el Cordero de Dios, que quita el pecado del mundo."
    },
    "ref": {
     "en": "John 1:29",
     "es": "Juan 1:29"
    }
   }
  },
  {
   "who": "disciples",
   "quote": {
    "en": "Lord, save us: we perish.",
    "es": "Señor, sálvanos, que perecemos."
   },
   "verse": {
    "at": {
     "en": [
      40,
      8,
      25
     ],
     "es": [
      40,
      8,
      25
     ]
    },
    "text": {
     "en": "And his disciples came to him, and awoke him, saying, Lord, save us: we perish.",
     "es": "Y llegándose sus discípulos, le despertaron, diciendo: Señor, sálvanos, que perecemos."
    },
    "ref": {
     "en": "Matthew 8:25",
     "es": "Mateo 8:25"
    }
   }
  },
  {
   "who": "joshua",
   "quote": {
    "en": "as for me and my house, we will serve the LORD",
    "es": "yo y mi casa serviremos á Jehová"
   },
   "verse": {
    "at": {
     "en": [
      6,
      24,
      15
     ],
     "es": [
      6,
      24,
      15
     ]
    },
    "text": {
     "en": "And if it seem evil unto you to serve the LORD, choose you this day whom ye will serve; whether the gods which your fathers served that were on the other side of the flood, or the gods of the Amorites, in whose land ye dwell: but as for me and my house, we will serve the LORD.",
     "es": "Y si mal os parece servir á Jehová, escogeos hoy á quién sirváis; si á los dioses á quienes sirvieron vuestros padres, cuando estuvieron de esotra parte del río, ó á los dioses de los Amorrheos en cuya tierra habitáis: que yo y mi casa serviremos á Jehová."
    },
    "ref": {
     "en": "Joshua 24:15",
     "es": "Josué 24:15"
    }
   }
  },
  {
   "who": "abraham",
   "quote": {
    "en": "God will provide himself a lamb",
    "es": "Dios se proveerá de cordero"
   },
   "verse": {
    "at": {
     "en": [
      1,
      22,
      8
     ],
     "es": [
      1,
      22,
      8
     ]
    },
    "text": {
     "en": "And Abraham said, My son, God will provide himself a lamb for a burnt offering: so they went both of them together.",
     "es": "Y respondió Abraham: Dios se proveerá de cordero para el holocausto, hijo mío. E iban juntos."
    },
    "ref": {
     "en": "Genesis 22:8",
     "es": "Génesis 22:8"
    }
   }
  },
  {
   "who": "joseph",
   "quote": {
    "en": "ye thought evil against me; but God meant it unto good",
    "es": "Vosotros pensasteis mal sobre mí, mas Dios lo encaminó á bien"
   },
   "verse": {
    "at": {
     "en": [
      1,
      50,
      20
     ],
     "es": [
      1,
      50,
      20
     ]
    },
    "text": {
     "en": "But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive.",
     "es": "Vosotros pensasteis mal sobre mí, mas Dios lo encaminó á bien, para hacer lo que vemos hoy, para mantener en vida á mucho pueblo."
    },
    "ref": {
     "en": "Genesis 50:20",
     "es": "Génesis 50:20"
    }
   }
  },
  {
   "who": "david",
   "quote": {
    "en": "I come to thee in the name of the LORD of hosts",
    "es": "yo vengo á ti en el nombre de Jehová de los ejércitos"
   },
   "verse": {
    "at": {
     "en": [
      9,
      17,
      45
     ],
     "es": [
      9,
      17,
      45
     ]
    },
    "text": {
     "en": "Then said David to the Philistine, Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts, the God of the armies of Israel, whom thou hast defied.",
     "es": "Entonces dijo David al Filisteo: Tú vienes á mí con espada y lanza y escudo; mas yo vengo á ti en el nombre de Jehová de los ejércitos, el Dios de los escuadrones de Israel, que tú has provocado."
    },
    "ref": {
     "en": "1 Samuel 17:45",
     "es": "1 Samuel 17:45"
    }
   }
  },
  {
   "who": "elijah",
   "quote": {
    "en": "if the LORD be God, follow him",
    "es": "Si Jehová es Dios, seguidle"
   },
   "verse": {
    "at": {
     "en": [
      11,
      18,
      21
     ],
     "es": [
      11,
      18,
      21
     ]
    },
    "text": {
     "en": "And Elijah came unto all the people, and said, How long halt ye between two opinions? if the LORD be God, follow him: but if Baal, then follow him. And the people answered him not a word.",
     "es": "Y acercándose Elías á todo el pueblo, dijo: ¿Hasta cuándo claudicaréis vosotros entre dos pensamientos? Si Jehová es Dios, seguidle; y si Baal, id en pos de él. Y el pueblo no respondió palabra."
    },
    "ref": {
     "en": "1 Kings 18:21",
     "es": "1 Reyes 18:21"
    }
   }
  },
  {
   "who": "esther",
   "quote": {
    "en": "if I perish, I perish",
    "es": "si perezco, que perezca"
   },
   "verse": {
    "at": {
     "en": [
      17,
      4,
      16
     ],
     "es": [
      17,
      4,
      16
     ]
    },
    "text": {
     "en": "Go, gather together all the Jews that are present in Shushan, and fast ye for me, and neither eat nor drink three days, night or day: I also and my maidens will fast likewise; and so will I go in unto the king, which is not according to the law: and if I perish, I perish.",
     "es": "Ve, y junta á todos los Judíos que se hallan en Susán, y ayunad por mí, y no comáis ni bebáis en tres días, noche ni día: yo también con mis doncellas ayunaré igualmente, y así entraré al rey, aunque no sea conforme á la ley; y si perezco, que perezca."
    },
    "ref": {
     "en": "Esther 4:16",
     "es": "Ester 4:16"
    }
   }
  },
  {
   "who": "job",
   "quote": {
    "en": "I know that my redeemer liveth",
    "es": "Yo sé que mi Redentor vive"
   },
   "verse": {
    "at": {
     "en": [
      18,
      19,
      25
     ],
     "es": [
      18,
      19,
      25
     ]
    },
    "text": {
     "en": "For I know that my redeemer liveth, And that he shall stand at the latter day upon the earth:",
     "es": "Yo sé que mi Redentor vive, y al fin se levantará sobre el polvo:"
    },
    "ref": {
     "en": "Job 19:25",
     "es": "Job 19:25"
    }
   }
  },
  {
   "who": "solomon",
   "quote": {
    "en": "Give therefore thy servant an understanding heart",
    "es": "Da pues á tu siervo corazón dócil"
   },
   "verse": {
    "at": {
     "en": [
      11,
      3,
      9
     ],
     "es": [
      11,
      3,
      9
     ]
    },
    "text": {
     "en": "Give therefore thy servant an understanding heart to judge thy people, that I may discern between good and bad: for who is able to judge this thy so great a people?",
     "es": "Da pues á tu siervo corazón dócil para juzgar á tu pueblo, para discernir entre lo bueno y lo malo: porque ¿quién podrá gobernar este tu pueblo tan grande?"
    },
    "ref": {
     "en": "1 Kings 3:9",
     "es": "1 Reyes 3:9"
    }
   }
  },
  {
   "who": "gabriel",
   "quote": {
    "en": "For with God nothing shall be impossible.",
    "es": "Porque ninguna cosa es imposible para Dios."
   },
   "verse": {
    "at": {
     "en": [
      42,
      1,
      37
     ],
     "es": [
      42,
      1,
      37
     ]
    },
    "text": {
     "en": "For with God nothing shall be impossible.",
     "es": "Porque ninguna cosa es imposible para Dios."
    },
    "ref": {
     "en": "Luke 1:37",
     "es": "Lucas 1:37"
    }
   }
  },
  {
   "who": "angels",
   "quote": {
    "en": "Glory to God in the highest",
    "es": "Gloria en las alturas á Dios"
   },
   "verse": {
    "at": {
     "en": [
      42,
      2,
      14
     ],
     "es": [
      42,
      2,
      14
     ]
    },
    "text": {
     "en": "Glory to God in the highest, And on earth peace, good will toward men.",
     "es": "Gloria en las alturas á Dios, y en la tierra paz, buena voluntad para con los hombres."
    },
    "ref": {
     "en": "Luke 2:14",
     "es": "Lucas 2:14"
    }
   }
  },
  {
   "who": "john",
   "quote": {
    "en": "He must increase, but I must decrease.",
    "es": "A él conviene crecer, mas á mí menguar."
   },
   "verse": {
    "at": {
     "en": [
      43,
      3,
      30
     ],
     "es": [
      43,
      3,
      30
     ]
    },
    "text": {
     "en": "He must increase, but I must decrease.",
     "es": "A él conviene crecer, mas á mí menguar."
    },
    "ref": {
     "en": "John 3:30",
     "es": "Juan 3:30"
    }
   }
  },
  {
   "who": "jesus",
   "quote": {
    "en": "I am the resurrection, and the life",
    "es": "Yo soy la resurrección y la vida"
   },
   "verse": {
    "at": {
     "en": [
      43,
      11,
      25
     ],
     "es": [
      43,
      11,
      25
     ]
    },
    "text": {
     "en": "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live:",
     "es": "Dícele Jesús: Yo soy la resurrección y la vida: el que cree en mí, aunque esté muerto, vivirá."
    },
    "ref": {
     "en": "John 11:25",
     "es": "Juan 11:25"
    }
   }
  },
  {
   "who": "jesus",
   "quote": {
    "en": "I am the way, the truth, and the life",
    "es": "Yo soy el camino, y la verdad, y la vida"
   },
   "verse": {
    "at": {
     "en": [
      43,
      14,
      6
     ],
     "es": [
      43,
      14,
      6
     ]
    },
    "text": {
     "en": "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.",
     "es": "Jesús le dice: Yo soy el camino, y la verdad, y la vida: nadie viene al Padre, sino por mí."
    },
    "ref": {
     "en": "John 14:6",
     "es": "Juan 14:6"
    }
   }
  },
  {
   "who": "peter",
   "quote": {
    "en": "Silver and gold have I none; but such as I have give I thee",
    "es": "Ni tengo plata ni oro; mas lo que tengo te doy"
   },
   "verse": {
    "at": {
     "en": [
      44,
      3,
      6
     ],
     "es": [
      44,
      3,
      6
     ]
    },
    "text": {
     "en": "Then Peter said, Silver and gold have I none; but such as I have give I thee: In the name of Jesus Christ of Nazareth rise up and walk.",
     "es": "Y Pedro dijo: Ni tengo plata ni oro; mas lo que tengo te doy: en el nombre de Jesucristo de Nazaret, levántate y anda."
    },
    "ref": {
     "en": "Acts 3:6",
     "es": "Hechos 3:6"
    }
   }
  },
  {
   "who": "paul",
   "quote": {
    "en": "Believe on the Lord Jesus Christ, and thou shalt be saved",
    "es": "Cree en el Señor Jesucristo, y serás salvo"
   },
   "verse": {
    "at": {
     "en": [
      44,
      16,
      31
     ],
     "es": [
      44,
      16,
      31
     ]
    },
    "text": {
     "en": "And they said, Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.",
     "es": "Y ellos dijeron: Cree en el Señor Jesucristo, y serás salvo tú, y tu casa."
    },
    "ref": {
     "en": "Acts 16:31",
     "es": "Hechos 16:31"
    }
   }
  },
  {
   "who": "centurion",
   "quote": {
    "en": "Truly this was the Son of God.",
    "es": "Verdaderamente Hijo de Dios era éste."
   },
   "verse": {
    "at": {
     "en": [
      40,
      27,
      54
     ],
     "es": [
      40,
      27,
      54
     ]
    },
    "text": {
     "en": "Now when the centurion, and they that were with him, watching Jesus, saw the earthquake, and those things that were done, they feared greatly, saying, Truly this was the Son of God.",
     "es": "Y el centurión, y los que estaban con él guardando á Jesús, visto el terremoto, y las cosas que habían sido hechas, temieron en gran manera, diciendo: Verdaderamente Hijo de Dios era éste."
    },
    "ref": {
     "en": "Matthew 27:54",
     "es": "Mateo 27:54"
    }
   }
  },
  {
   "who": "jesus",
   "quote": {
    "en": "Be of good cheer; it is I; be not afraid.",
    "es": "Confiad, yo soy; no tengáis miedo."
   },
   "verse": {
    "at": {
     "en": [
      40,
      14,
      27
     ],
     "es": [
      40,
      14,
      27
     ]
    },
    "text": {
     "en": "But straightway Jesus spake unto them, saying, Be of good cheer; it is I; be not afraid.",
     "es": "Mas luego Jesús les habló, diciendo: Confiad, yo soy; no tengáis miedo."
    },
    "ref": {
     "en": "Matthew 14:27",
     "es": "Mateo 14:27"
    }
   }
  },
  {
   "who": "zacchaeus",
   "quote": {
    "en": "Behold, Lord, the half of my goods I give to the poor",
    "es": "He aquí, Señor, la mitad de mis bienes doy á los pobres"
   },
   "verse": {
    "at": {
     "en": [
      42,
      19,
      8
     ],
     "es": [
      42,
      19,
      8
     ]
    },
    "text": {
     "en": "And Zacchæus stood, and said unto the Lord; Behold, Lord, the half of my goods I give to the poor; and if I have taken any thing from any man by false accusation, I restore him fourfold.",
     "es": "Entonces Zaqueo, puesto en pie, dijo al Señor: He aquí, Señor, la mitad de mis bienes doy á los pobres; y si en algo he defraudado á alguno, lo vuelvo con el cuatro tanto."
    },
    "ref": {
     "en": "Luke 19:8",
     "es": "Lucas 19:8"
    }
   }
  },
  {
   "who": "hannah",
   "quote": {
    "en": "For this child I prayed",
    "es": "Por este niño oraba"
   },
   "verse": {
    "at": {
     "en": [
      9,
      1,
      27
     ],
     "es": [
      9,
      1,
      27
     ]
    },
    "text": {
     "en": "For this child I prayed; and the LORD hath given me my petition which I asked of him:",
     "es": "Por este niño oraba, y Jehová me dió lo que le pedí."
    },
    "ref": {
     "en": "1 Samuel 1:27",
     "es": "1 Samuel 1:27"
    }
   }
  },
  {
   "who": "martha",
   "quote": {
    "en": "I believe that thou art the Christ, the Son of God",
    "es": "yo he creído que tú eres el Cristo, el Hijo de Dios"
   },
   "verse": {
    "at": {
     "en": [
      43,
      11,
      27
     ],
     "es": [
      43,
      11,
      27
     ]
    },
    "text": {
     "en": "She saith unto him, Yea, Lord: I believe that thou art the Christ, the Son of God, which should come into the world.",
     "es": "Dícele: Sí, Señor; yo he creído que tú eres el Cristo, el Hijo de Dios, que has venido al mundo."
    },
    "ref": {
     "en": "John 11:27",
     "es": "Juan 11:27"
    }
   }
  }
 ],
 "SLING": {
  "intro": {
   "at": {
    "en": [
     9,
     17,
     40
    ],
    "es": [
     9,
     17,
     40
    ]
   },
   "text": {
    "en": "And he took his staff in his hand, and chose him five smooth stones out of the brook, and put them in a shepherd's bag which he had, even in a scrip; and his sling was in his hand: and he drew near to the Philistine.",
    "es": "Tomó su cayado en su mano, y escogióse cinco piedras lisas del arroyo, y púsolas en el saco pastoril y en el zurrón que traía, y con su honda en su mano vase hacia el Filisteo."
   },
   "ref": {
    "en": "1 Samuel 17:40",
    "es": "1 Samuel 17:40"
   }
  },
  "lesson": {
   "en": "David was only a shepherd boy, and Goliath was a giant. But David was not afraid, because he trusted God. Courage is not having no fear; it is trusting God and doing what is right even when you feel small.",
   "es": "David era solo un pastorcito, y Goliat era un gigante. Pero David no tuvo miedo, porque confiaba en Dios. Ser valiente no es no sentir miedo; es confiar en Dios y hacer lo correcto aunque te sientas pequeño."
  },
  "levels": [
   {
    "id": "z1",
    "path": "valley",
    "speed": 18,
    "colors": 3,
    "count": 26,
    "powers": [
     "slow"
    ],
    "title": {
     "en": "The brook valley",
     "es": "El valle del arroyo"
    },
    "verse": {
     "at": {
      "en": [
       6,
       1,
       9
      ],
      "es": [
       6,
       1,
       9
      ]
     },
     "text": {
      "en": "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
      "es": "Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres."
     },
     "ref": {
      "en": "Joshua 1:9",
      "es": "Josué 1:9"
     }
    }
   },
   {
    "id": "z2",
    "path": "brook",
    "speed": 22,
    "colors": 4,
    "count": 32,
    "powers": [
     "slow",
     "bomb"
    ],
    "title": {
     "en": "Along the brook",
     "es": "A lo largo del arroyo"
    },
    "verse": {
     "at": {
      "en": [
       19,
       27,
       1
      ],
      "es": [
       19,
       27,
       1
      ]
     },
     "text": {
      "en": "The LORD is my light and my salvation; whom shall I fear? The LORD is the strength of my life; of whom shall I be afraid?",
      "es": "JEHOVÁ es mi luz y mi salvación: ¿de quién temeré? Jehová es la fortaleza de mi vida: ¿de quién he de atemorizarme?"
     },
     "ref": {
      "en": "Psalms 27:1",
      "es": "Salmos 27:1"
     }
    }
   },
   {
    "id": "z3",
    "path": "spiral",
    "speed": 25,
    "colors": 4,
    "count": 38,
    "powers": [
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "The battle line",
     "es": "La línea de batalla"
    },
    "verse": {
     "at": {
      "en": [
       5,
       31,
       6
      ],
      "es": [
       5,
       31,
       6
      ]
     },
     "text": {
      "en": "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.",
      "es": "Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos: que Jehová tu Dios es el que va contigo: no te dejará ni te desamparará."
     },
     "ref": {
      "en": "Deuteronomy 31:6",
      "es": "Deuteronomio 31:6"
     }
    }
   },
   {
    "id": "z4",
    "path": "hills",
    "speed": 29,
    "colors": 5,
    "count": 42,
    "powers": [
     "slow",
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "The hills of Elah",
     "es": "Las colinas de Ela"
    },
    "verse": {
     "at": {
      "en": [
       23,
       41,
       10
      ],
      "es": [
       23,
       41,
       10
      ]
     },
     "text": {
      "en": "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
      "es": "No temas, que yo soy contigo; no desmayes, que yo soy tu Dios que te esfuerzo: siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia."
     },
     "ref": {
      "en": "Isaiah 41:10",
      "es": "Isaías 41:10"
     }
    }
   },
   {
    "id": "z5",
    "path": "camp",
    "speed": 33,
    "colors": 5,
    "count": 48,
    "powers": [
     "slow",
     "reverse",
     "bomb",
     "bomb"
    ],
    "title": {
     "en": "The giant’s camp",
     "es": "El campamento del gigante"
    },
    "verse": {
     "at": {
      "en": [
       9,
       17,
       47
      ],
      "es": [
       9,
       17,
       47
      ]
     },
     "text": {
      "en": "And all this assembly shall know that the LORD saveth not with sword and spear: for the battle is the LORD's, and he will give you into our hands.",
      "es": "Y sabrá toda esta congregación que Jehová no salva con espada y lanza; porque de Jehová es la guerra, y él os entregará en nuestras manos."
     },
     "ref": {
      "en": "1 Samuel 17:47",
      "es": "1 Samuel 17:47"
     }
    }
   },
   {
    "id": "z6",
    "path": "zig",
    "speed": 34,
    "colors": 5,
    "count": 50,
    "powers": [
     "slow",
     "bomb"
    ],
    "title": {
     "en": "Back and forth",
     "es": "Ida y vuelta"
    },
    "verse": {
     "at": {
      "en": [
       19,
       56,
       3
      ],
      "es": [
       19,
       56,
       3
      ]
     },
     "text": {
      "en": "What time I am afraid, I will trust in thee.",
      "es": "En el día que temo, yo en ti confío."
     },
     "ref": {
      "en": "Psalms 56:3",
      "es": "Salmos 56:3"
     }
    }
   },
   {
    "id": "z7",
    "path": "ribbon",
    "speed": 35,
    "colors": 5,
    "count": 52,
    "powers": [
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "The ribbon road",
     "es": "El camino de cinta"
    },
    "verse": {
     "at": {
      "en": [
       23,
       40,
       31
      ],
      "es": [
       23,
       40,
       31
      ]
     },
     "text": {
      "en": "but they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
      "es": "Mas los que esperan á Jehová tendrán nuevas fuerzas; levantarán las alas como águilas; correrán, y no se cansarán; caminarán, y no se fatigarán."
     },
     "ref": {
      "en": "Isaiah 40:31",
      "es": "Isaías 40:31"
     }
    }
   },
   {
    "id": "z8",
    "path": "ridge",
    "speed": 36,
    "colors": 5,
    "count": 54,
    "powers": [
     "slow",
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "Over the ridge",
     "es": "Sobre la loma"
    },
    "verse": {
     "at": {
      "en": [
       19,
       46,
       1
      ],
      "es": [
       19,
       46,
       1
      ]
     },
     "text": {
      "en": "God is our refuge and strength, A very present help in trouble.",
      "es": "DIOS es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones."
     },
     "ref": {
      "en": "Psalms 46:1",
      "es": "Salmos 46:1"
     }
    }
   },
   {
    "id": "z9",
    "path": "coil",
    "speed": 36,
    "colors": 5,
    "count": 56,
    "powers": [
     "slow",
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "The coil",
     "es": "La espiral"
    },
    "verse": {
     "at": {
      "en": [
       55,
       1,
       7
      ],
      "es": [
       55,
       1,
       7
      ]
     },
     "text": {
      "en": "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
      "es": "Porque no nos ha dado Dios el espíritu de temor, sino el de fortaleza, y de amor, y de templanza."
     },
     "ref": {
      "en": "2 Timothy 1:7",
      "es": "2 Timoteo 1:7"
     }
    }
   },
   {
    "id": "z10",
    "path": "whirl",
    "speed": 37,
    "colors": 5,
    "count": 58,
    "powers": [
     "slow",
     "zap",
     "bomb"
    ],
    "title": {
     "en": "The whirlwind",
     "es": "El remolino"
    },
    "verse": {
     "at": {
      "en": [
       50,
       4,
       13
      ],
      "es": [
       50,
       4,
       13
      ]
     },
     "text": {
      "en": "I can do all things through Christ which strengtheneth me.",
      "es": "Todo lo puedo en Cristo que me fortalece."
     },
     "ref": {
      "en": "Philippians 4:13",
      "es": "Filipenses 4:13"
     }
    }
   },
   {
    "id": "z11",
    "path": "serpent",
    "speed": 38,
    "colors": 5,
    "count": 60,
    "powers": [
     "reverse",
     "zap",
     "bomb",
     "slow"
    ],
    "title": {
     "en": "The long snake",
     "es": "La gran serpiente"
    },
    "verse": {
     "at": {
      "en": [
       20,
       3,
       5
      ],
      "es": [
       20,
       3,
       5
      ]
     },
     "text": {
      "en": "Trust in the LORD with all thine heart; And lean not unto thine own understanding.",
      "es": "Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia."
     },
     "ref": {
      "en": "Proverbs 3:5",
      "es": "Proverbios 3:5"
     }
    }
   },
   {
    "id": "z12",
    "path": "twin",
    "speed": 39,
    "colors": 5,
    "count": 62,
    "powers": [
     "slow",
     "zap",
     "reverse",
     "bomb"
    ],
    "title": {
     "en": "Twin trails",
     "es": "Senderos gemelos"
    },
    "verse": {
     "at": {
      "en": [
       19,
       23,
       4
      ],
      "es": [
       19,
       23,
       4
      ]
     },
     "text": {
      "en": "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; Thy rod and thy staff they comfort me.",
      "es": "Aunque ande en valle de sombra de muerte, no temeré mal alguno; porque tú estarás conmigo: tu vara y tu cayado me infundirán aliento."
     },
     "ref": {
      "en": "Psalms 23:4",
      "es": "Salmos 23:4"
     }
    }
   },
   {
    "id": "z13",
    "path": "maze",
    "speed": 40,
    "colors": 5,
    "count": 64,
    "powers": [
     "slow",
     "zap",
     "reverse",
     "bomb",
     "bomb"
    ],
    "title": {
     "en": "The maze",
     "es": "El laberinto"
    },
    "verse": {
     "at": {
      "en": [
       45,
       8,
       31
      ],
      "es": [
       45,
       8,
       31
      ]
     },
     "text": {
      "en": "What shall we then say to these things? If God be for us, who can be against us?",
      "es": "¿Pues qué diremos á esto? Si Dios por nosotros, ¿quién contra nosotros?"
     },
     "ref": {
      "en": "Romans 8:31",
      "es": "Romanos 8:31"
     }
    }
   },
   {
    "id": "z14",
    "path": "giant",
    "speed": 41,
    "colors": 5,
    "count": 66,
    "powers": [
     "slow",
     "zap",
     "reverse",
     "bomb",
     "zap"
    ],
    "title": {
     "en": "The giant’s path",
     "es": "El camino del gigante"
    },
    "verse": {
     "at": {
      "en": [
       46,
       16,
       13
      ],
      "es": [
       46,
       16,
       13
      ]
     },
     "text": {
      "en": "Watch ye, stand fast in the faith, quit you like men, be strong.",
      "es": "Velad, estad firmes en la fe; portaos varonilmente, y esforzaos."
     },
     "ref": {
      "en": "1 Corinthians 16:13",
      "es": "1 Corintios 16:13"
     }
    }
   },
   {
    "id": "z15",
    "path": "storm",
    "speed": 42,
    "colors": 5,
    "count": 68,
    "powers": [
     "slow",
     "zap",
     "reverse",
     "bomb",
     "zap",
     "slow"
    ],
    "title": {
     "en": "The final stand",
     "es": "La última batalla"
    },
    "verse": {
     "at": {
      "en": [
       49,
       6,
       10
      ],
      "es": [
       49,
       6,
       10
      ]
     },
     "text": {
      "en": "Finally, my brethren, be strong in the Lord, and in the power of his might.",
      "es": "Por lo demás, hermanos míos, confortaos en el Señor, y en la potencia de su fortaleza."
     },
     "ref": {
      "en": "Ephesians 6:10",
      "es": "Efesios 6:10"
     }
    }
   }
  ]
 },
 "VERSES": [
  {
   "id": "trust",
   "title": {
    "en": "When I am afraid",
    "es": "Cuando tengo miedo"
   },
   "verse": {
    "at": {
     "en": [
      19,
      56,
      3
     ],
     "es": [
      19,
      56,
      3
     ]
    },
    "text": {
     "en": "What time I am afraid, I will trust in thee.",
     "es": "En el día que temo, yo en ti confío."
    },
    "ref": {
     "en": "Psalms 56:3",
     "es": "Salmos 56:3"
    }
   }
  },
  {
   "id": "love",
   "title": {
    "en": "He loved us first",
    "es": "Él nos amó primero"
   },
   "verse": {
    "at": {
     "en": [
      62,
      4,
      19
     ],
     "es": [
      62,
      4,
      19
     ]
    },
    "text": {
     "en": "We love him, because he first loved us.",
     "es": "Nosotros le amamos á él, porque él nos amó primero."
    },
    "ref": {
     "en": "1 John 4:19",
     "es": "1 Juan 4:19"
    }
   }
  },
  {
   "id": "strength",
   "title": {
    "en": "Strength in Christ",
    "es": "Fuerza en Cristo"
   },
   "verse": {
    "at": {
     "en": [
      50,
      4,
      13
     ],
     "es": [
      50,
      4,
      13
     ]
    },
    "text": {
     "en": "I can do all things through Christ which strengtheneth me.",
     "es": "Todo lo puedo en Cristo que me fortalece."
    },
    "ref": {
     "en": "Philippians 4:13",
     "es": "Filipenses 4:13"
    }
   }
  },
  {
   "id": "lamp",
   "title": {
    "en": "A lamp for my feet",
    "es": "Lámpara a mis pies"
   },
   "verse": {
    "at": {
     "en": [
      19,
      119,
      105
     ],
     "es": [
      19,
      119,
      105
     ]
    },
    "text": {
     "en": "Thy word is a lamp unto my feet, And a light unto my path.",
     "es": "Lámpara es á mis pies tu palabra, y lumbrera á mi camino."
    },
    "ref": {
     "en": "Psalms 119:105",
     "es": "Salmos 119:105"
    }
   }
  },
  {
   "id": "heart",
   "title": {
    "en": "Hidden in my heart",
    "es": "Guardado en mi corazón"
   },
   "verse": {
    "at": {
     "en": [
      19,
      119,
      11
     ],
     "es": [
      19,
      119,
      11
     ]
    },
    "text": {
     "en": "Thy word have I hid in mine heart, That I might not sin against thee.",
     "es": "En mi corazón he guardado tus dichos, para no pecar contra ti."
    },
    "ref": {
     "en": "Psalms 119:11",
     "es": "Salmos 119:11"
    }
   }
  },
  {
   "id": "wholeheart",
   "title": {
    "en": "Trust with all your heart",
    "es": "Confía de todo corazón"
   },
   "verse": {
    "at": {
     "en": [
      20,
      3,
      5
     ],
     "es": [
      20,
      3,
      5
     ]
    },
    "text": {
     "en": "Trust in the LORD with all thine heart; And lean not unto thine own understanding.",
     "es": "Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia."
    },
    "ref": {
     "en": "Proverbs 3:5",
     "es": "Proverbios 3:5"
    }
   }
  },
  {
   "id": "friend",
   "title": {
    "en": "A true friend",
    "es": "Un amigo de verdad"
   },
   "verse": {
    "at": {
     "en": [
      20,
      17,
      17
     ],
     "es": [
      20,
      17,
      17
     ]
    },
    "text": {
     "en": "A friend loveth at all times, And a brother is born for adversity.",
     "es": "En todo tiempo ama el amigo; y el hermano para la angustia es nacido."
    },
    "ref": {
     "en": "Proverbs 17:17",
     "es": "Proverbios 17:17"
    }
   }
  },
  {
   "id": "godislove",
   "title": {
    "en": "God is love",
    "es": "Dios es amor"
   },
   "verse": {
    "at": {
     "en": [
      62,
      4,
      8
     ],
     "es": [
      62,
      4,
      8
     ]
    },
    "text": {
     "en": "He that loveth not knoweth not God; for God is love.",
     "es": "El que no ama, no conoce á Dios; porque Dios es amor."
    },
    "ref": {
     "en": "1 John 4:8",
     "es": "1 Juan 4:8"
    }
   }
  },
  {
   "id": "always",
   "title": {
    "en": "Jesus never changes",
    "es": "Jesús no cambia"
   },
   "verse": {
    "at": {
     "en": [
      58,
      13,
      8
     ],
     "es": [
      58,
      13,
      8
     ]
    },
    "text": {
     "en": "Jesus Christ the same yesterday, and to day, and for ever.",
     "es": "Jesucristo es el mismo ayer, y hoy, y por los siglos."
    },
    "ref": {
     "en": "Hebrews 13:8",
     "es": "Hebreos 13:8"
    }
   }
  },
  {
   "id": "rejoice",
   "title": {
    "en": "Be glad in the Lord",
    "es": "Gózate en el Señor"
   },
   "verse": {
    "at": {
     "en": [
      50,
      4,
      4
     ],
     "es": [
      50,
      4,
      4
     ]
    },
    "text": {
     "en": "Rejoice in the Lord alway: and again I say, Rejoice.",
     "es": "Gozaos en el Señor siempre: otra vez digo: Que os gocéis."
    },
    "ref": {
     "en": "Philippians 4:4",
     "es": "Filipenses 4:4"
    }
   }
  },
  {
   "id": "peace",
   "title": {
    "en": "Peacemakers",
    "es": "Los pacificadores"
   },
   "verse": {
    "at": {
     "en": [
      40,
      5,
      9
     ],
     "es": [
      40,
      5,
      9
     ]
    },
    "text": {
     "en": "Blessed are the peacemakers: for they shall be called the children of God.",
     "es": "Bienaventurados los pacificadores: porque ellos serán llamados hijos de Dios."
    },
    "ref": {
     "en": "Matthew 5:9",
     "es": "Mateo 5:9"
    }
   }
  },
  {
   "id": "goodshepherd",
   "title": {
    "en": "The good shepherd",
    "es": "El buen pastor"
   },
   "verse": {
    "at": {
     "en": [
      43,
      10,
      11
     ],
     "es": [
      43,
      10,
      11
     ]
    },
    "text": {
     "en": "I am the good shepherd: the good shepherd giveth his life for the sheep.",
     "es": "Yo soy el buen pastor: el buen pastor su vida da por las ovejas."
    },
    "ref": {
     "en": "John 10:11",
     "es": "Juan 10:11"
    }
   }
  },
  {
   "id": "goodtoall",
   "title": {
    "en": "Good to all",
    "es": "Bueno con todos"
   },
   "verse": {
    "at": {
     "en": [
      19,
      145,
      9
     ],
     "es": [
      19,
      145,
      9
     ]
    },
    "text": {
     "en": "The LORD is good to all: And his tender mercies are over all his works.",
     "es": "Bueno es Jehová para con todos; y sus misericordias sobre todas sus obras."
    },
    "ref": {
     "en": "Psalms 145:9",
     "es": "Salmos 145:9"
    }
   }
  },
  {
   "id": "fight",
   "title": {
    "en": "God fights for me",
    "es": "Dios pelea por mí"
   },
   "verse": {
    "at": {
     "en": [
      2,
      14,
      14
     ],
     "es": [
      2,
      14,
      14
     ]
    },
    "text": {
     "en": "The LORD shall fight for you, and ye shall hold your peace.",
     "es": "Jehová peleará por vosotros, y vosotros estaréis quedos."
    },
    "ref": {
     "en": "Exodus 14:14",
     "es": "Éxodo 14:14"
    }
   }
  }
 ],
 "WORDSEARCH": [
  {
   "id": "creation",
   "icon": "🌍",
   "title": {
    "en": "God makes the world",
    "es": "Dios hace el mundo"
   },
   "words": {
    "en": [
     "LIGHT",
     "WATER",
     "EARTH",
     "STARS",
     "FISH",
     "BIRDS"
    ],
    "es": [
     "LUZ",
     "AGUA",
     "TIERRA",
     "ESTRELLAS",
     "PECES",
     "AVES"
    ]
   },
   "verse": {
    "at": {
     "en": [
      1,
      1,
      1
     ],
     "es": [
      1,
      1,
      1
     ]
    },
    "text": {
     "en": "In the beginning God created the heaven and the earth.",
     "es": "EN el principio crió Dios los cielos y la tierra."
    },
    "ref": {
     "en": "Genesis 1:1",
     "es": "Génesis 1:1"
    }
   }
  },
  {
   "id": "noah",
   "icon": "🌈",
   "title": {
    "en": "Noah and the ark",
    "es": "Noé y el arca"
   },
   "words": {
    "en": [
     "ARK",
     "DOVE",
     "RAIN",
     "FLOOD",
     "RAINBOW",
     "ANIMALS"
    ],
    "es": [
     "ARCA",
     "PALOMA",
     "LLUVIA",
     "DILUVIO",
     "ARCO",
     "ANIMALES"
    ]
   },
   "verse": {
    "at": {
     "en": [
      1,
      9,
      13
     ],
     "es": [
      1,
      9,
      13
     ]
    },
    "text": {
     "en": "I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.",
     "es": "Mi arco pondré en las nubes, el cual será por señal de convenio entre mí y la tierra."
    },
    "ref": {
     "en": "Genesis 9:13",
     "es": "Génesis 9:13"
    }
   }
  },
  {
   "id": "david",
   "icon": "🪨",
   "title": {
    "en": "David the shepherd",
    "es": "David el pastor"
   },
   "words": {
    "en": [
     "SLING",
     "STONE",
     "SHEEP",
     "HARP",
     "GIANT",
     "KING"
    ],
    "es": [
     "HONDA",
     "PIEDRA",
     "OVEJAS",
     "ARPA",
     "GIGANTE",
     "REY"
    ]
   },
   "verse": {
    "at": {
     "en": [
      19,
      23,
      1
     ],
     "es": [
      19,
      23,
      1
     ]
    },
    "text": {
     "en": "The LORD is my shepherd; I shall not want.",
     "es": "JEHOVÁ es mi pastor; nada me faltará."
    },
    "ref": {
     "en": "Psalms 23:1",
     "es": "Salmos 23:1"
    }
   }
  },
  {
   "id": "nativity",
   "icon": "⭐",
   "title": {
    "en": "Jesus is born",
    "es": "Nace Jesús"
   },
   "words": {
    "en": [
     "MANGER",
     "STAR",
     "SHEPHERDS",
     "ANGEL",
     "MARY",
     "JOSEPH"
    ],
    "es": [
     "PESEBRE",
     "ESTRELLA",
     "PASTORES",
     "ÁNGEL",
     "MARÍA",
     "JOSÉ"
    ]
   },
   "verse": {
    "at": {
     "en": [
      42,
      2,
      11
     ],
     "es": [
      42,
      2,
      11
     ]
    },
    "text": {
     "en": "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.",
     "es": "Que os ha nacido hoy, en la ciudad de David, un Salvador, que es CRISTO el Señor."
    },
    "ref": {
     "en": "Luke 2:11",
     "es": "Lucas 2:11"
    }
   }
  },
  {
   "id": "fruit",
   "icon": "🍇",
   "title": {
    "en": "Fruit of the Spirit",
    "es": "El fruto del Espíritu"
   },
   "words": {
    "en": [
     "LOVE",
     "JOY",
     "PEACE",
     "GOODNESS",
     "FAITH",
     "GENTLENESS"
    ],
    "es": [
     "CARIDAD",
     "GOZO",
     "PAZ",
     "BONDAD",
     "TOLERANCIA",
     "BENIGNIDAD"
    ]
   },
   "verse": {
    "at": {
     "en": [
      48,
      5,
      22
     ],
     "es": [
      48,
      5,
      22
     ]
    },
    "text": {
     "en": "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,",
     "es": "Mas el fruto del Espíritu es: caridad, gozo, paz, tolerancia, benignidad, bondad, fe,"
    },
    "ref": {
     "en": "Galatians 5:22",
     "es": "Gálatas 5:22"
    }
   }
  },
  {
   "id": "easter",
   "icon": "🌅",
   "title": {
    "en": "Easter morning",
    "es": "Mañana de Pascua"
   },
   "words": {
    "en": [
     "TOMB",
     "STONE",
     "RISEN",
     "ANGEL",
     "LINEN",
     "GARDEN"
    ],
    "es": [
     "SEPULCRO",
     "PIEDRA",
     "RESUCITÓ",
     "ÁNGEL",
     "LIENZOS",
     "HUERTO"
    ]
   },
   "verse": {
    "at": {
     "en": [
      40,
      28,
      6
     ],
     "es": [
      40,
      28,
      6
     ]
    },
    "text": {
     "en": "He is not here: for he is risen, as he said. Come, see the place where the Lord lay.",
     "es": "No está aquí; porque ha resucitado, como dijo. Venid, ved el lugar donde fué puesto el Señor."
    },
    "ref": {
     "en": "Matthew 28:6",
     "es": "Mateo 28:6"
    }
   }
  },
  {
   "id": "jonah",
   "icon": "🐋",
   "title": {
    "en": "Jonah and the big fish",
    "es": "Jonás y el gran pez"
   },
   "words": {
    "en": [
     "SHIP",
     "STORM",
     "FISH",
     "SEA",
     "NINEVEH",
     "VINE"
    ],
    "es": [
     "BARCO",
     "TORMENTA",
     "PEZ",
     "MAR",
     "NÍNIVE",
     "CALABACERA"
    ]
   },
   "verse": {
    "at": {
     "en": [
      32,
      3,
      3
     ],
     "es": [
      32,
      3,
      3
     ]
    },
    "text": {
     "en": "So Jonah arose, and went unto Nineveh, according to the word of the LORD. Now Nineveh was an exceeding great city of three days' journey.",
     "es": "Y levantóse Jonás, y fué á Nínive, conforme á la palabra de Jehová. Y era Nínive ciudad sobremanera grande, de tres días de camino."
    },
    "ref": {
     "en": "Jonah 3:3",
     "es": "Jonás 3:3"
    }
   }
  },
  {
   "id": "moses",
   "icon": "🔥",
   "title": {
    "en": "Moses leads the way",
    "es": "Moisés guía al pueblo"
   },
   "words": {
    "en": [
     "BUSH",
     "STAFF",
     "SEA",
     "TABLETS",
     "MANNA",
     "EGYPT"
    ],
    "es": [
     "ZARZA",
     "VARA",
     "MAR",
     "TABLAS",
     "MANÁ",
     "EGIPTO"
    ]
   },
   "verse": {
    "at": {
     "en": [
      2,
      14,
      14
     ],
     "es": [
      2,
      14,
      14
     ]
    },
    "text": {
     "en": "The LORD shall fight for you, and ye shall hold your peace.",
     "es": "Jehová peleará por vosotros, y vosotros estaréis quedos."
    },
    "ref": {
     "en": "Exodus 14:14",
     "es": "Éxodo 14:14"
    }
   }
  },
  {
   "id": "joseph",
   "icon": "🧥",
   "title": {
    "en": "Joseph’s colorful coat",
    "es": "La túnica de José"
   },
   "words": {
    "en": [
     "COAT",
     "DREAM",
     "BROTHERS",
     "EGYPT",
     "GRAIN",
     "PRISON"
    ],
    "es": [
     "TÚNICA",
     "SUEÑO",
     "HERMANOS",
     "EGIPTO",
     "TRIGO",
     "CÁRCEL"
    ]
   },
   "verse": {
    "at": {
     "en": [
      1,
      50,
      20
     ],
     "es": [
      1,
      50,
      20
     ]
    },
    "text": {
     "en": "But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive.",
     "es": "Vosotros pensasteis mal sobre mí, mas Dios lo encaminó á bien, para hacer lo que vemos hoy, para mantener en vida á mucho pueblo."
    },
    "ref": {
     "en": "Genesis 50:20",
     "es": "Génesis 50:20"
    }
   }
  },
  {
   "id": "daniel",
   "icon": "🦁",
   "title": {
    "en": "Daniel and the lions",
    "es": "Daniel y los leones"
   },
   "words": {
    "en": [
     "LIONS",
     "DEN",
     "KING",
     "ANGEL",
     "PRAYER",
     "WINDOW"
    ],
    "es": [
     "LEONES",
     "FOSO",
     "REY",
     "ÁNGEL",
     "ORACIÓN",
     "VENTANA"
    ]
   },
   "verse": {
    "at": {
     "en": [
      27,
      6,
      22
     ],
     "es": [
      27,
      6,
      22
     ]
    },
    "text": {
     "en": "My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt.",
     "es": "El Dios mío envió su ángel, el cual cerró la boca de los leones, para que no me hiciesen mal: porque delante de él se halló en mí justicia: y aun delante de ti, oh rey, yo no he hecho lo que no debiese."
    },
    "ref": {
     "en": "Daniel 6:22",
     "es": "Daniel 6:22"
    }
   }
  },
  {
   "id": "loaves",
   "icon": "🍞",
   "title": {
    "en": "Bread for everyone",
    "es": "Pan para todos"
   },
   "words": {
    "en": [
     "BREAD",
     "FISH",
     "BASKETS",
     "BOY",
     "CROWD",
     "THANKS"
    ],
    "es": [
     "PANES",
     "PECES",
     "CESTAS",
     "MUCHACHO",
     "GENTE",
     "GRACIAS"
    ]
   },
   "verse": {
    "at": {
     "en": [
      43,
      6,
      35
     ],
     "es": [
      43,
      6,
      35
     ]
    },
    "text": {
     "en": "And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.",
     "es": "Y Jesús les dijo: Yo soy el pan de vida: el que á mí viene, nunca tendrá hambre; y el que en mí cree, no tendrá sed jamás."
    },
    "ref": {
     "en": "John 6:35",
     "es": "Juan 6:35"
    }
   }
  },
  {
   "id": "shepherd",
   "icon": "🐑",
   "title": {
    "en": "The good shepherd",
    "es": "El buen pastor"
   },
   "words": {
    "en": [
     "SHEPHERD",
     "SHEEP",
     "LAMB",
     "STAFF",
     "PASTURE",
     "WATER"
    ],
    "es": [
     "PASTOR",
     "OVEJAS",
     "CORDERO",
     "CAYADO",
     "PASTOS",
     "AGUAS"
    ]
   },
   "verse": {
    "at": {
     "en": [
      43,
      10,
      11
     ],
     "es": [
      43,
      10,
      11
     ]
    },
    "text": {
     "en": "I am the good shepherd: the good shepherd giveth his life for the sheep.",
     "es": "Yo soy el buen pastor: el buen pastor su vida da por las ovejas."
    },
    "ref": {
     "en": "John 10:11",
     "es": "Juan 10:11"
    }
   }
  },
  {
   "id": "armor",
   "icon": "🛡️",
   "title": {
    "en": "The armor of God",
    "es": "La armadura de Dios"
   },
   "words": {
    "en": [
     "BELT",
     "SHIELD",
     "HELMET",
     "SWORD",
     "TRUTH",
     "FAITH"
    ],
    "es": [
     "CINTO",
     "ESCUDO",
     "YELMO",
     "ESPADA",
     "VERDAD",
     "FE"
    ]
   },
   "verse": {
    "at": {
     "en": [
      49,
      6,
      11
     ],
     "es": [
      49,
      6,
      11
     ]
    },
    "text": {
     "en": "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
     "es": "Vestíos de toda la armadura de Dios, para que podáis estar firmes contra las asechanzas del diablo."
    },
    "ref": {
     "en": "Ephesians 6:11",
     "es": "Efesios 6:11"
    }
   }
  },
  {
   "id": "prayer",
   "icon": "🙏",
   "title": {
    "en": "Talking with God",
    "es": "Hablar con Dios"
   },
   "words": {
    "en": [
     "PRAY",
     "THANKS",
     "PRAISE",
     "SING",
     "HOPE",
     "PEACE"
    ],
    "es": [
     "ORAR",
     "GRACIAS",
     "ALABAR",
     "CANTAR",
     "ESPERANZA",
     "PAZ"
    ]
   },
   "verse": {
    "at": {
     "en": [
      50,
      4,
      6
     ],
     "es": [
      50,
      4,
      6
     ]
    },
    "text": {
     "en": "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
     "es": "Por nada estéis afanosos; sino sean notorias vuestras peticiones delante de Dios en toda oración y ruego, con hacimiento de gracias."
    },
    "ref": {
     "en": "Philippians 4:6",
     "es": "Filipenses 4:6"
    }
   }
  }
 ]
};
});
