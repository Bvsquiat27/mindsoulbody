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
 "ARK": {
  "animals": {
   "lion": "🦁",
   "elephant": "🐘",
   "giraffe": "🦒",
   "sheep": "🐑",
   "cow": "🐄",
   "horse": "🐎",
   "camel": "🐪",
   "rabbit": "🐇",
   "turtle": "🐢",
   "fox": "🦊",
   "bear": "🐻",
   "monkey": "🐒",
   "rooster": "🐓",
   "owl": "🦉",
   "zebra": "🦓",
   "pig": "🐖"
  },
  "names": {
   "lion": {
    "en": "lions",
    "es": "leones"
   },
   "elephant": {
    "en": "elephants",
    "es": "elefantes"
   },
   "giraffe": {
    "en": "giraffes",
    "es": "jirafas"
   },
   "sheep": {
    "en": "sheep",
    "es": "ovejas"
   },
   "cow": {
    "en": "cows",
    "es": "vacas"
   },
   "horse": {
    "en": "horses",
    "es": "caballos"
   },
   "camel": {
    "en": "camels",
    "es": "camellos"
   },
   "rabbit": {
    "en": "rabbits",
    "es": "conejos"
   },
   "turtle": {
    "en": "turtles",
    "es": "tortugas"
   },
   "fox": {
    "en": "foxes",
    "es": "zorros"
   },
   "bear": {
    "en": "bears",
    "es": "osos"
   },
   "monkey": {
    "en": "monkeys",
    "es": "monos"
   },
   "rooster": {
    "en": "roosters",
    "es": "gallos"
   },
   "owl": {
    "en": "owls",
    "es": "búhos"
   },
   "zebra": {
    "en": "zebras",
    "es": "cebras"
   },
   "pig": {
    "en": "pigs",
    "es": "cerdos"
   }
  },
  "levels": [
   {
    "id": "ark1",
    "pairs": [
     "lion",
     "elephant",
     "giraffe",
     "sheep"
    ],
    "seconds": 50,
    "verse": {
     "at": {
      "en": [
       1,
       7,
       9
      ],
      "es": [
       1,
       7,
       9
      ]
     },
     "text": {
      "en": "there went in two and two unto Noah into the ark, the male and the female, as God had commanded Noah.",
      "es": "De dos en dos entraron á Noé en el arca: macho y hembra, como mandó Dios á Noé."
     },
     "ref": {
      "en": "Genesis 7:9",
      "es": "Génesis 7:9"
     }
    }
   },
   {
    "id": "ark2",
    "pairs": [
     "cow",
     "horse",
     "camel",
     "rabbit",
     "turtle",
     "fox"
    ],
    "seconds": 60,
    "verse": {
     "at": {
      "en": [
       1,
       6,
       22
      ],
      "es": [
       1,
       6,
       22
      ]
     },
     "text": {
      "en": "Thus did Noah; according to all that God commanded him, so did he.",
      "es": "E hízolo así Noé; hizo conforme á todo lo que Dios le mandó."
     },
     "ref": {
      "en": "Genesis 6:22",
      "es": "Génesis 6:22"
     }
    }
   },
   {
    "id": "ark3",
    "pairs": [
     "bear",
     "monkey",
     "rooster",
     "owl",
     "zebra",
     "pig",
     "horse",
     "sheep"
    ],
    "seconds": 70,
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
   }
  ],
  "lesson": {
   "en": "God told Noah to build the ark and bring the animals in, two by two. Noah did not argue or wait. He obeyed, step by step, and God kept everyone in the ark safe. When we listen to God and do what He says, even when it is hard, we can trust Him to take care of us.",
   "es": "Dios le dijo a Noé que construyera el arca y metiera a los animales de dos en dos. Noé no discutió ni esperó. Obedeció paso a paso, y Dios cuidó a todos los que estaban en el arca. Cuando escuchamos a Dios y hacemos lo que nos dice, aunque sea difícil, podemos confiar en que él nos cuida."
  }
 },
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
