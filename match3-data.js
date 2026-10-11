/* Bible match-3 ("Manna Match"): chapters, levels and lessons.
   Verses are quoted word for word from the app's own KJV (bible/NN.json) and
   RV1909 (bible/rvr/NN.json) text; match3.test.mjs checks every one.
   "at" is [book id, chapter, verse] in each translation (the RV1909 Jonás 2:10
   also holds the words of KJV Jonah 2:9).
   goals: score n | collect n of a piece | stones (break every stone tile).
   stars: [score for 2 stars, score for 3 stars]; any win earns 1 star.
   stones: 8 rows from the top, "#" is a stone tile. */
(function (root) {
  'use strict';
  const PIECES = ['star', 'fish', 'grapes', 'loaf', 'leaf', 'heart'];
  const CHAPTERS = [
    {
      "id": "creation",
      "icon": "🌍",
      "name": {
        "en": "Creation",
        "es": "La creación"
      },
      "intro": {
        "en": "In the beginning, God made everything: the sky, the sea, the plants, the animals, and people too. Everything He made was good!",
        "es": "En el principio, Dios hizo todo: el cielo, el mar, las plantas, los animales y también a las personas. ¡Todo lo que hizo era bueno!"
      }
    },
    {
      "id": "noah",
      "icon": "🌈",
      "name": {
        "en": "Noah's ark",
        "es": "El arca de Noé"
      },
      "intro": {
        "en": "Noah loved God and built a big ark, just as God told him. God kept Noah, his family and the animals safe through the flood.",
        "es": "Noé amaba a Dios y construyó un arca muy grande, tal como Dios le dijo. Dios cuidó a Noé, a su familia y a los animales durante el diluvio."
      }
    },
    {
      "id": "sea",
      "icon": "🌊",
      "name": {
        "en": "Moses and the Red Sea",
        "es": "Moisés y el mar Rojo"
      },
      "intro": {
        "en": "God's people were slaves in Egypt. God sent Moses to lead them out, and when they reached the Red Sea, God made a path right through the water!",
        "es": "El pueblo de Dios era esclavo en Egipto. Dios envió a Moisés para sacarlos de allí, y cuando llegaron al mar Rojo, ¡Dios abrió un camino en medio del agua!"
      }
    },
    {
      "id": "jericho",
      "icon": "🎺",
      "name": {
        "en": "The walls of Jericho",
        "es": "Los muros de Jericó"
      },
      "intro": {
        "en": "Joshua and God's people came to the strong city of Jericho. God told them to march around it for seven days, and then to shout!",
        "es": "Josué y el pueblo de Dios llegaron a la fuerte ciudad de Jericó. Dios les dijo que marcharan alrededor de ella durante siete días, ¡y después gritaran!"
      }
    },
    {
      "id": "david",
      "icon": "🐑",
      "name": {
        "en": "David the shepherd",
        "es": "David el pastor"
      },
      "intro": {
        "en": "David was a young shepherd boy who loved God. God chose him to be king, because God saw that David's heart loved Him.",
        "es": "David era un joven pastor que amaba a Dios. Dios lo eligió para ser rey, porque vio que el corazón de David lo amaba."
      }
    },
    {
      "id": "daniel",
      "icon": "🦁",
      "name": {
        "en": "Daniel and the lions",
        "es": "Daniel y los leones"
      },
      "intro": {
        "en": "Daniel prayed to God every day, even when a new law said he must not. He was thrown into a den of lions, but God was with him.",
        "es": "Daniel oraba a Dios todos los días, aun cuando una ley nueva lo prohibía. Lo echaron en un foso de leones, pero Dios estaba con él."
      }
    },
    {
      "id": "jonah",
      "icon": "🐋",
      "name": {
        "en": "Jonah and the big fish",
        "es": "Jonás y el gran pez"
      },
      "intro": {
        "en": "God asked Jonah to go to the city of Nineveh, but Jonah ran away on a ship. A great fish swallowed him, and inside the fish Jonah prayed.",
        "es": "Dios le pidió a Jonás que fuera a la ciudad de Nínive, pero Jonás huyó en un barco. Un gran pez se lo tragó, y dentro del pez Jonás oró."
      }
    },
    {
      "id": "birth",
      "icon": "⭐",
      "name": {
        "en": "Jesus is born",
        "es": "Nace Jesús"
      },
      "intro": {
        "en": "In the little town of Bethlehem, Mary had a baby named Jesus. Angels sang, shepherds came running, and a bright star shone above.",
        "es": "En el pueblito de Belén, María tuvo un bebé llamado Jesús. Los ángeles cantaron, los pastores llegaron corriendo y una estrella brillante resplandecía."
      }
    },
    {
      "id": "loaves",
      "icon": "🍞",
      "name": {
        "en": "Jesus feeds 5,000",
        "es": "Jesús alimenta a 5.000"
      },
      "intro": {
        "en": "A huge crowd came to listen to Jesus, and they grew hungry. A boy shared his five loaves and two fish, and Jesus fed everyone!",
        "es": "Una gran multitud vino a escuchar a Jesús y les dio hambre. Un muchacho compartió sus cinco panes y dos peces, ¡y Jesús dio de comer a todos!"
      }
    },
    {
      "id": "easter",
      "icon": "✝️",
      "name": {
        "en": "Jesus is alive!",
        "es": "¡Jesús vive!"
      },
      "intro": {
        "en": "Jesus died on the cross for us and was laid in a tomb. But on the third day, the stone was rolled away. Jesus is alive!",
        "es": "Jesús murió en la cruz por nosotros y lo pusieron en una tumba. Pero al tercer día, la piedra había sido quitada. ¡Jesús vive!"
      }
    }
  ];
  const LEVELS = [
    {
      "n": 1,
      "chapter": "creation",
      "seed": 7001,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "score",
          "n": 600
        }
      ],
      "moves": 20,
      "stones": null,
      "title": {
        "en": "In the beginning",
        "es": "En el principio"
      },
      "lesson": {
        "en": "God made the whole world, and He made you too. Everything around you shows how great and good God is.",
        "es": "Dios hizo el mundo entero, y también te hizo a ti. Todo lo que te rodea muestra lo grande y bueno que es Dios."
      },
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
      "ref": {
        "en": "Genesis 1:1",
        "es": "Génesis 1:1"
      },
      "verse": {
        "en": "In the beginning God created the heaven and the earth.",
        "es": "EN el principio crió Dios los cielos y la tierra."
      },
      "stars": [
        1650,
        2350
      ]
    },
    {
      "n": 2,
      "chapter": "creation",
      "seed": 111730,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "star",
          "n": 12
        }
      ],
      "moves": 20,
      "stones": null,
      "title": {
        "en": "Let there be light",
        "es": "Sea la luz"
      },
      "lesson": {
        "en": "God made light just by speaking. When things feel dark, remember that God is light and He is with you.",
        "es": "Dios hizo la luz solo con su palabra. Cuando todo parezca oscuro, recuerda que Dios es luz y está contigo."
      },
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
      "ref": {
        "en": "Genesis 1:3",
        "es": "Génesis 1:3"
      },
      "verse": {
        "en": "And God said, Let there be light: and there was light.",
        "es": "Y dijo Dios: Sea la luz: y fué la luz."
      },
      "stars": [
        1700,
        2400
      ]
    },
    {
      "n": 3,
      "chapter": "noah",
      "seed": 216459,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "leaf",
          "n": 15
        }
      ],
      "moves": 20,
      "stones": null,
      "title": {
        "en": "The olive leaf",
        "es": "La hoja de olivo"
      },
      "lesson": {
        "en": "The dove came back with an olive leaf: the flood was ending! God takes care of His people, even in a storm.",
        "es": "La paloma volvió con una hoja de olivo: ¡el diluvio se estaba acabando! Dios cuida a los suyos, aun en medio de la tormenta."
      },
      "at": {
        "en": [
          1,
          8,
          11
        ],
        "es": [
          1,
          8,
          11
        ]
      },
      "ref": {
        "en": "Genesis 8:11",
        "es": "Génesis 8:11"
      },
      "verse": {
        "en": "and the dove came in to him in the evening; and, lo, in her mouth was an olive leaf pluckt off: so Noah knew that the waters were abated from off the earth.",
        "es": "Y la paloma volvió á él á la hora de la tarde; y he aquí que traía una hoja de oliva tomada en su pico: y entendió Noé que las aguas se habían retirado de sobre la tierra."
      },
      "stars": [
        1650,
        2100
      ]
    },
    {
      "n": 4,
      "chapter": "noah",
      "seed": 321188,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "score",
          "n": 1500
        }
      ],
      "moves": 22,
      "stones": null,
      "title": {
        "en": "God's promise",
        "es": "La promesa de Dios"
      },
      "lesson": {
        "en": "The rainbow reminds us of God's promise. God always keeps His promises, every single one.",
        "es": "El arcoíris nos recuerda la promesa de Dios. Dios siempre cumple sus promesas, todas y cada una."
      },
      "at": {
        "en": [
          1,
          9,
          15
        ],
        "es": [
          1,
          9,
          15
        ]
      },
      "ref": {
        "en": "Genesis 9:15",
        "es": "Génesis 9:15"
      },
      "verse": {
        "en": "and I will remember my covenant, which is between me and you and every living creature of all flesh; and the waters shall no more become a flood to destroy all flesh.",
        "es": "Y acordarme he del pacto mío, que hay entre mí y vosotros y toda alma viviente de toda carne; y no serán más las aguas por diluvio para destruir toda carne."
      },
      "stars": [
        2000,
        2350
      ]
    },
    {
      "n": 5,
      "chapter": "sea",
      "seed": 425917,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "fish",
          "n": 18
        }
      ],
      "moves": 22,
      "stones": null,
      "title": {
        "en": "A path through the sea",
        "es": "Un camino en el mar"
      },
      "lesson": {
        "en": "When there seemed to be no way, God made a way. Nothing is too hard for God.",
        "es": "Cuando parecía que no había salida, Dios abrió un camino. Nada es demasiado difícil para Dios."
      },
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
      "ref": {
        "en": "Exodus 14:21",
        "es": "Éxodo 14:21"
      },
      "verse": {
        "en": "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided.",
        "es": "Y extendió Moisés su mano sobre la mar, é hizo Jehová que la mar se retirase por recio viento oriental toda aquella noche; y tornó la mar en seco, y las aguas quedaron divididas."
      },
      "stars": [
        2100,
        2750
      ]
    },
    {
      "n": 6,
      "chapter": "sea",
      "seed": 530646,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 22,
      "stones": [
        "........",
        "........",
        "........",
        "..###...",
        "...###..",
        "........",
        "........",
        "........"
      ],
      "title": {
        "en": "Stand still",
        "es": "Estad quietos"
      },
      "lesson": {
        "en": "Moses told the people not to be afraid, because God would fight for them. You can trust God when you feel scared.",
        "es": "Moisés le dijo al pueblo que no tuviera miedo, porque Dios pelearía por ellos. Puedes confiar en Dios cuando sientas miedo."
      },
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
      "ref": {
        "en": "Exodus 14:14",
        "es": "Éxodo 14:14"
      },
      "verse": {
        "en": "The LORD shall fight for you, and ye shall hold your peace.",
        "es": "Jehová peleará por vosotros, y vosotros estaréis quedos."
      },
      "stars": [
        1500,
        1900
      ]
    },
    {
      "n": 7,
      "chapter": "jericho",
      "seed": 635375,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 25,
      "stones": [
        "........",
        "........",
        "........",
        "........",
        ".######.",
        "...##...",
        "...##...",
        "........"
      ],
      "title": {
        "en": "The walls fall down",
        "es": "Los muros caen"
      },
      "lesson": {
        "en": "God's people obeyed and shouted, and the walls fell down flat. When we trust and obey God, He does great things.",
        "es": "El pueblo de Dios obedeció y gritó, y los muros se cayeron. Cuando confiamos en Dios y lo obedecemos, él hace cosas grandes."
      },
      "at": {
        "en": [
          6,
          6,
          20
        ],
        "es": [
          6,
          6,
          20
        ]
      },
      "ref": {
        "en": "Joshua 6:20",
        "es": "Josué 6:20"
      },
      "verse": {
        "en": "So the people shouted when the priests blew with the trumpets: and it came to pass, when the people heard the sound of the trumpet, and the people shouted with a great shout, that the wall fell down flat, so that the people went up into the city, every man straight before him, and they took the city.",
        "es": "Entonces el pueblo dió grita, y los sacerdotes tocaron las bocinas: y aconteció que como el pueblo hubo oído el sonido de la bocina, dió el pueblo grita con gran vocerío, y el muro cayó á plomo. El pueblo subió luego á la ciudad, cada uno en derecho de sí, y tomáronla."
      },
      "stars": [
        1950,
        3450
      ]
    },
    {
      "n": 8,
      "chapter": "jericho",
      "seed": 740104,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 25,
      "stones": [
        "........",
        "........",
        ".##..##.",
        ".##..##.",
        "........",
        ".##..##.",
        ".##..##.",
        "........"
      ],
      "title": {
        "en": "Be strong and brave",
        "es": "Sé fuerte y valiente"
      },
      "lesson": {
        "en": "God told Joshua to be strong and brave, because He would be with him wherever he went. God is with you too.",
        "es": "Dios le dijo a Josué que fuera fuerte y valiente, porque estaría con él dondequiera que fuera. Dios también está contigo."
      },
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
      "ref": {
        "en": "Joshua 1:9",
        "es": "Josué 1:9"
      },
      "verse": {
        "en": "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
        "es": "Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres."
      },
      "stars": [
        2550,
        3400
      ]
    },
    {
      "n": 9,
      "chapter": "david",
      "seed": 844833,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "heart"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "heart",
          "n": 20
        }
      ],
      "moves": 22,
      "stones": null,
      "title": {
        "en": "God looks at the heart",
        "es": "Dios mira el corazón"
      },
      "lesson": {
        "en": "People look at the outside, but God looks at the heart. What matters most is a heart that loves God.",
        "es": "Las personas miran lo de afuera, pero Dios mira el corazón. Lo más importante es un corazón que ama a Dios."
      },
      "at": {
        "en": [
          9,
          16,
          7
        ],
        "es": [
          9,
          16,
          7
        ]
      },
      "ref": {
        "en": "1 Samuel 16:7",
        "es": "1 Samuel 16:7"
      },
      "verse": {
        "en": "But the LORD said unto Samuel, Look not on his countenance, or on the height of his stature; because I have refused him: for the LORD seeth not as man seeth; for man looketh on the outward appearance, but the LORD looketh on the heart.",
        "es": "Y Jehová respondió á Samuel: No mires á su parecer, ni á lo grande de su estatura, porque yo lo desecho; porque Jehová mira no lo que el hombre mira; pues que el hombre mira lo que está delante de sus ojos, mas Jehová mira el corazón."
      },
      "stars": [
        1850,
        2300
      ]
    },
    {
      "n": 10,
      "chapter": "david",
      "seed": 949562,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "heart"
      ],
      "goals": [
        {
          "kind": "score",
          "n": 2500
        }
      ],
      "moves": 22,
      "stones": null,
      "title": {
        "en": "The Lord is my shepherd",
        "es": "Jehová es mi pastor"
      },
      "lesson": {
        "en": "David wrote that the Lord is his shepherd. Like a good shepherd, God cares for you and gives you what you need.",
        "es": "David escribió que el Señor es su pastor. Como un buen pastor, Dios te cuida y te da lo que necesitas."
      },
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
      "ref": {
        "en": "Psalms 23:1",
        "es": "Salmos 23:1"
      },
      "verse": {
        "en": "The LORD is my shepherd; I shall not want.",
        "es": "JEHOVÁ es mi pastor; nada me faltará."
      },
      "stars": [
        2850,
        3400
      ]
    },
    {
      "n": 11,
      "chapter": "daniel",
      "seed": 1054291,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "score",
          "n": 3000
        }
      ],
      "moves": 24,
      "stones": null,
      "title": {
        "en": "Daniel prays",
        "es": "Daniel ora"
      },
      "lesson": {
        "en": "Daniel kept praying, and God sent His angel to shut the lions' mouths. You can talk to God anytime, anywhere.",
        "es": "Daniel siguió orando, y Dios envió a su ángel para cerrar la boca de los leones. Puedes hablar con Dios en cualquier momento y lugar."
      },
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
      "ref": {
        "en": "Daniel 6:22",
        "es": "Daniel 6:22"
      },
      "verse": {
        "en": "My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt.",
        "es": "El Dios mío envió su ángel, el cual cerró la boca de los leones, para que no me hiciesen mal: porque delante de él se halló en mí justicia: y aun delante de ti, oh rey, yo no he hecho lo que no debiese."
      },
      "stars": [
        3200,
        3800
      ]
    },
    {
      "n": 12,
      "chapter": "daniel",
      "seed": 1159020,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 24,
      "stones": [
        "........",
        "........",
        "..####..",
        "..#..#..",
        "..#..#..",
        "..####..",
        "........",
        "........"
      ],
      "title": {
        "en": "Our safe place",
        "es": "Nuestro refugio"
      },
      "lesson": {
        "en": "God is our safe place and our strength. When you need help, God is always near.",
        "es": "Dios es nuestro refugio y nuestra fuerza. Cuando necesites ayuda, Dios siempre está cerca."
      },
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
      "ref": {
        "en": "Psalms 46:1",
        "es": "Salmos 46:1"
      },
      "verse": {
        "en": "God is our refuge and strength, A very present help in trouble.",
        "es": "DIOS es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones."
      },
      "stars": [
        2300,
        3950
      ]
    },
    {
      "n": 13,
      "chapter": "jonah",
      "seed": 1263749,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "fish",
          "n": 25
        }
      ],
      "moves": 24,
      "stones": null,
      "title": {
        "en": "The big fish",
        "es": "El gran pez"
      },
      "lesson": {
        "en": "God heard Jonah's prayer from inside the fish and brought him safely to land. God hears you when you pray.",
        "es": "Dios escuchó la oración de Jonás desde dentro del pez y lo llevó sano y salvo a tierra. Dios te escucha cuando oras."
      },
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
      "ref": {
        "en": "Jonah 2:10",
        "es": "Jonás 2:10"
      },
      "verse": {
        "en": "And the LORD spake unto the fish, and it vomited out Jonah upon the dry land.",
        "es": "Yo empero con voz de alabanza te sacrificaré; pagaré lo que prometí. La salvación pertenece á Jehová. Y mandó Jehová al pez, y vomitó á Jonás en tierra."
      },
      "stars": [
        2150,
        2650
      ]
    },
    {
      "n": 14,
      "chapter": "jonah",
      "seed": 1368478,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 24,
      "stones": [
        "........",
        ".#....#.",
        "..#..#..",
        "...##...",
        "...##...",
        "..#..#..",
        ".#....#.",
        "........"
      ],
      "title": {
        "en": "A second chance",
        "es": "Una segunda oportunidad"
      },
      "lesson": {
        "en": "Jonah went to Nineveh, and the people believed God. God gives second chances, and He loves everyone.",
        "es": "Jonás fue a Nínive, y la gente creyó a Dios. Dios da segundas oportunidades y ama a todos."
      },
      "at": {
        "en": [
          32,
          3,
          5
        ],
        "es": [
          32,
          3,
          5
        ]
      },
      "ref": {
        "en": "Jonah 3:5",
        "es": "Jonás 3:5"
      },
      "verse": {
        "en": "So the people of Nineveh believed God, and proclaimed a fast, and put on sackcloth, from the greatest of them even to the least of them.",
        "es": "Y los hombres de Nínive creyeron á Dios, y pregonaron ayuno, y vistiéronse de sacos desde el mayor de ellos hasta el menor de ellos."
      },
      "stars": [
        2050,
        3450
      ]
    },
    {
      "n": 15,
      "chapter": "birth",
      "seed": 1473207,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "star",
          "n": 25
        }
      ],
      "moves": 24,
      "stones": null,
      "title": {
        "en": "A Savior is born",
        "es": "Ha nacido un Salvador"
      },
      "lesson": {
        "en": "The angel brought good news: a Savior was born! Jesus came because God loves us so much.",
        "es": "El ángel trajo buenas noticias: ¡nació un Salvador! Jesús vino porque Dios nos ama muchísimo."
      },
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
      "ref": {
        "en": "Luke 2:11",
        "es": "Lucas 2:11"
      },
      "verse": {
        "en": "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.",
        "es": "Que os ha nacido hoy, en la ciudad de David, un Salvador, que es CRISTO el Señor."
      },
      "stars": [
        2050,
        2600
      ]
    },
    {
      "n": 16,
      "chapter": "birth",
      "seed": 1577936,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "score",
          "n": 3000
        }
      ],
      "moves": 25,
      "stones": null,
      "title": {
        "en": "Glory to God",
        "es": "Gloria a Dios"
      },
      "lesson": {
        "en": "The angels praised God on the night Jesus was born. You can praise God too, with songs and a thankful heart.",
        "es": "Los ángeles alabaron a Dios la noche en que nació Jesús. Tú también puedes alabar a Dios con canciones y un corazón agradecido."
      },
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
      "ref": {
        "en": "Luke 2:14",
        "es": "Lucas 2:14"
      },
      "verse": {
        "en": "Glory to God in the highest, And on earth peace, good will toward men.",
        "es": "Gloria en las alturas á Dios, y en la tierra paz, buena voluntad para con los hombres."
      },
      "stars": [
        3250,
        3700
      ]
    },
    {
      "n": 17,
      "chapter": "loaves",
      "seed": 1682665,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "loaf",
          "n": 20
        }
      ],
      "moves": 24,
      "stones": null,
      "title": {
        "en": "Five loaves",
        "es": "Cinco panes"
      },
      "lesson": {
        "en": "A boy shared his small lunch, and Jesus used it to feed thousands. When you share what you have, God can do big things with it.",
        "es": "Un muchacho compartió su pequeño almuerzo, y Jesús lo usó para alimentar a miles. Cuando compartes lo que tienes, Dios puede hacer cosas grandes con eso."
      },
      "at": {
        "en": [
          43,
          6,
          9
        ],
        "es": [
          43,
          6,
          9
        ]
      },
      "ref": {
        "en": "John 6:9",
        "es": "Juan 6:9"
      },
      "verse": {
        "en": "There is a lad here, which hath five barley loaves, and two small fishes: but what are they among so many?",
        "es": "Un muchacho está aquí que tiene cinco panes de cebada y dos pececillos; ¿mas qué es esto entre tantos?"
      },
      "stars": [
        2450,
        3300
      ]
    },
    {
      "n": 18,
      "chapter": "loaves",
      "seed": 1787394,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "loaf",
          "n": 15
        },
        {
          "kind": "collect",
          "piece": "fish",
          "n": 15
        }
      ],
      "moves": 26,
      "stones": null,
      "title": {
        "en": "Bread of life",
        "es": "El pan de vida"
      },
      "lesson": {
        "en": "Jesus said He is the bread of life. Just as food fills your tummy, Jesus fills your heart.",
        "es": "Jesús dijo que él es el pan de vida. Así como la comida llena tu pancita, Jesús llena tu corazón."
      },
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
      "ref": {
        "en": "John 6:35",
        "es": "Juan 6:35"
      },
      "verse": {
        "en": "And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.",
        "es": "Y Jesús les dijo: Yo soy el pan de vida: el que á mí viene, nunca tendrá hambre; y el que en mí cree, no tendrá sed jamás."
      },
      "stars": [
        2350,
        3000
      ]
    },
    {
      "n": 19,
      "chapter": "easter",
      "seed": 1892123,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf"
      ],
      "goals": [
        {
          "kind": "stones"
        }
      ],
      "moves": 28,
      "stones": [
        "........",
        "........",
        ".######.",
        ".#....#.",
        ".#....#.",
        ".######.",
        "........",
        "........"
      ],
      "title": {
        "en": "The stone rolled away",
        "es": "La piedra quitada"
      },
      "lesson": {
        "en": "The tomb was empty, just as Jesus said! Jesus is alive, and that is the happiest news of all.",
        "es": "¡La tumba estaba vacía, tal como Jesús dijo! Jesús vive, y esa es la noticia más feliz de todas."
      },
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
      "ref": {
        "en": "Matthew 28:6",
        "es": "Mateo 28:6"
      },
      "verse": {
        "en": "He is not here: for he is risen, as he said. Come, see the place where the Lord lay.",
        "es": "No está aquí; porque ha resucitado, como dijo. Venid, ved el lugar donde fué puesto el Señor."
      },
      "stars": [
        2450,
        3700
      ]
    },
    {
      "n": 20,
      "chapter": "easter",
      "seed": 1996852,
      "pieces": [
        "star",
        "fish",
        "grapes",
        "loaf",
        "leaf",
        "heart"
      ],
      "goals": [
        {
          "kind": "collect",
          "piece": "heart",
          "n": 20
        }
      ],
      "moves": 30,
      "stones": null,
      "title": {
        "en": "Life forever",
        "es": "Vida para siempre"
      },
      "lesson": {
        "en": "Jesus is the resurrection and the life. Everyone who believes in Him will live with Him forever.",
        "es": "Jesús es la resurrección y la vida. Todos los que creen en él vivirán con él para siempre."
      },
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
      "ref": {
        "en": "John 11:25",
        "es": "Juan 11:25"
      },
      "verse": {
        "en": "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live:",
        "es": "Dícele Jesús: Yo soy la resurrección y la vida: el que cree en mí, aunque esté muerto, vivirá."
      },
      "stars": [
        2100,
        2500
      ]
    }
  ];
  const api = { PIECES, CHAPTERS, LEVELS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMatchData = api;
})(typeof self !== 'undefined' ? self : this);
