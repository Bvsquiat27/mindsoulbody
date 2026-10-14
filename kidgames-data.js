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
  }
 ]
};
});
