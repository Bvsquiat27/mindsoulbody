/* Bible match-3 ("Manna Match"): chapters, levels and lessons.
   Verses are quoted word for word from the app's own KJV (bible/NN.json) and
   RV1909 (bible/rvr/NN.json) text; match3.test.mjs checks every one.
   "at" is [book id, chapter, verse] in each translation (the RV1909 Jonás 2:10
   also holds the words of KJV Jonah 2:9).
   goals: score n | collect n of a piece | stones (break every stone tile).
   stars: [final score for 2 stars, for 3 stars]; any win earns 1 star, and
   a win with half the moves or more unused earns at least 2.
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
    },
    {
      "id": "pentecost",
      "icon": "🔥",
      "name": {
        "en": "Pentecost",
        "es": "Pentecostés"
      },
      "intro": {
        "en": "Jesus went back to heaven and promised a Helper. On Pentecost the Holy Spirit came like wind and fire, and the church was born!",
        "es": "Jesús volvió al cielo y prometió un Consolador. En Pentecostés el Espíritu Santo vino como viento y fuego, ¡y nació la iglesia!"
      }
    },
    {
      "id": "gate",
      "icon": "🚪",
      "name": {
        "en": "The Beautiful Gate",
        "es": "La puerta la Hermosa"
      },
      "intro": {
        "en": "A man who could not walk sat at the temple gate every day. Peter and John had no money, but they had something better to give.",
        "es": "Un hombre que no podía caminar se sentaba cada día en la puerta del templo. Pedro y Juan no tenían dinero, pero tenían algo mejor que dar."
      }
    },
    {
      "id": "road",
      "icon": "✨",
      "name": {
        "en": "The road to Damascus",
        "es": "El camino a Damasco"
      },
      "intro": {
        "en": "Saul was against the followers of Jesus. On the road a bright light shone, Jesus spoke to him, and Saul’s heart was changed forever.",
        "es": "Saulo estaba en contra de los seguidores de Jesús. En el camino brilló una gran luz, Jesús le habló, y el corazón de Saulo cambió para siempre."
      }
    },
    {
      "id": "prison",
      "icon": "⛓️",
      "name": {
        "en": "Paul and Silas",
        "es": "Pablo y Silas"
      },
      "intro": {
        "en": "Paul and Silas were put in prison for telling people about Jesus. At midnight they sang, and God shook the walls!",
        "es": "Pablo y Silas fueron encarcelados por hablar de Jesús. A medianoche cantaron, ¡y Dios sacudió los muros!"
      }
    },
    {
      "id": "heaven",
      "icon": "👑",
      "name": {
        "en": "A new heaven",
        "es": "Un cielo nuevo"
      },
      "intro": {
        "en": "God showed John a beautiful promise. One day He will make everything new, and there will be no more tears!",
        "es": "Dios le mostró a Juan una hermosa promesa. ¡Un día hará todo nuevo, y ya no habrá más lágrimas!"
      }
    },
    {
      "id": "ruth",
      "icon": "🌾",
      "name": {
        "en": "Ruth and Naomi",
        "es": "Rut y Noemí"
      },
      "intro": {
        "en": "Ruth loved her mother-in-law Naomi and would not leave her. Together they walked to Bethlehem, and God took care of them!",
        "es": "Rut amaba a su suegra Noemí y no quiso dejarla. Juntas caminaron hasta Belén, ¡y Dios las cuidó!"
      }
    },
    {
      "id": "carmel",
      "icon": "🔥",
      "name": {
        "en": "Elijah on Mount Carmel",
        "es": "Elías en el monte Carmelo"
      },
      "intro": {
        "en": "Elijah asked God to show the people that He is the true God. God sent fire from heaven, even on a wet altar!",
        "es": "Elías le pidió a Dios que mostrara al pueblo que Él es el Dios verdadero. ¡Dios mandó fuego del cielo, aun sobre un altar mojado!"
      }
    },
    {
      "id": "esther",
      "icon": "👑",
      "name": {
        "en": "Queen Esther",
        "es": "La reina Ester"
      },
      "intro": {
        "en": "Esther was a brave queen. She asked the king to save her people, and God used her to bring them joy!",
        "es": "Ester fue una reina valiente. Le pidió al rey que salvara a su pueblo, ¡y Dios la usó para darles alegría!"
      }
    },
    {
      "id": "tree",
      "icon": "🌳",
      "name": {
        "en": "Zacchaeus",
        "es": "Zaqueo"
      },
      "intro": {
        "en": "Zacchaeus was a short man who climbed a tree to see Jesus. Jesus called him by name and came to his house!",
        "es": "Zaqueo era un hombre bajito que se subió a un árbol para ver a Jesús. ¡Jesús lo llamó por su nombre y fue a su casa!"
      }
    },
    {
      "id": "lost",
      "icon": "🐑",
      "name": {
        "en": "The lost sheep",
        "es": "La oveja perdida"
      },
      "intro": {
        "en": "A shepherd had a hundred sheep, and one got lost. He looked until he found it, and carried it home with joy!",
        "es": "Un pastor tenía cien ovejas, y una se perdió. La buscó hasta encontrarla, ¡y la llevó a casa con alegría!"
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
        "es": "En el principio crió Dios los cielos y la tierra."
      },
      "stars": [
        2400,
        3750
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
        2850,
        3750
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
        2150,
        3400
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
        3000,
        3500
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
        3100,
        4100
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
        3250,
        3350
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
        4300,
        4400
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
        4250,
        4850
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
        3150,
        3700
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
        "es": "Jehová es mi pastor; nada me faltará."
      },
      "stars": [
        3850,
        4550
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
        4100,
        4900
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
        "es": "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones."
      },
      "stars": [
        5000,
        5100
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
        3650,
        4000
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
        3550,
        4150
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
        3000,
        4350
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
        4100,
        4650
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
        4250,
        5250
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
        4250,
        4650
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
        4550,
        5250
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
        3200,
        3800
      ]
    },
    {
      "n": 21,
      "chapter": "pentecost",
      "seed": 23089,
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
          "n": 22
        }
      ],
      "moves": 26,
      "stones": null,
      "title": {
        "en": "Wind and fire",
        "es": "Viento y fuego"
      },
      "lesson": {
        "en": "The Holy Spirit filled the disciples, and they told everyone about Jesus in many languages.",
        "es": "El Espíritu Santo llenó a los discípulos, y hablaron de Jesús a todos en muchas lenguas."
      },
      "at": {
        "en": [
          44,
          2,
          4
        ],
        "es": [
          44,
          2,
          4
        ]
      },
      "ref": {
        "en": "Acts 2:4",
        "es": "Hechos 2:4"
      },
      "verse": {
        "en": "And they were all filled with the Holy Ghost, and began to speak with other tongues, as the Spirit gave them utterance.",
        "es": "Y fueron todos llenos del Espíritu Santo, y comenzaron á hablar en otras lenguas, como el Espíritu les daba que hablasen."
      },
      "stars": [
        3050,
        3350
      ]
    },
    {
      "n": 22,
      "chapter": "pentecost",
      "seed": 23238,
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
          "kind": "score",
          "n": 2600
        }
      ],
      "moves": 26,
      "stones": null,
      "title": {
        "en": "Three thousand friends",
        "es": "Tres mil amigos"
      },
      "lesson": {
        "en": "That day about three thousand people believed in Jesus and joined the church.",
        "es": "Ese día unas tres mil personas creyeron en Jesús y se unieron a la iglesia."
      },
      "at": {
        "en": [
          44,
          2,
          41
        ],
        "es": [
          44,
          2,
          41
        ]
      },
      "ref": {
        "en": "Acts 2:41",
        "es": "Hechos 2:41"
      },
      "verse": {
        "en": "Then they that gladly received his word were baptized: and the same day there were added unto them about three thousand souls.",
        "es": "Así que, los que recibieron su palabra, fueron bautizados: y fueron añadidas á ellos aquel día como tres mil personas."
      },
      "stars": [
        5150,
        5650
      ]
    },
    {
      "n": 23,
      "chapter": "gate",
      "seed": 23829,
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
          "kind": "stones"
        }
      ],
      "moves": 26,
      "stones": [
        "........",
        "........",
        "........",
        "...##...",
        "..####..",
        "...##...",
        "........",
        "........"
      ],
      "title": {
        "en": "In Jesus’ name",
        "es": "En el nombre de Jesús"
      },
      "lesson": {
        "en": "Peter had no silver or gold, but in Jesus’ name the man stood up and walked!",
        "es": "Pedro no tenía plata ni oro, ¡pero en el nombre de Jesús el hombre se levantó y caminó!"
      },
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
      "ref": {
        "en": "Acts 3:6",
        "es": "Hechos 3:6"
      },
      "verse": {
        "en": "Then Peter said, Silver and gold have I none; but such as I have give I thee: In the name of Jesus Christ of Nazareth rise up and walk.",
        "es": "Y Pedro dijo: Ni tengo plata ni oro; mas lo que tengo te doy: en el nombre de Jesucristo de Nazaret, levántate y anda."
      },
      "stars": [
        3200,
        3500
      ]
    },
    {
      "n": 24,
      "chapter": "gate",
      "seed": 23367,
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
          "piece": "star",
          "n": 16
        },
        {
          "kind": "collect",
          "piece": "leaf",
          "n": 16
        }
      ],
      "moves": 27,
      "stones": null,
      "title": {
        "en": "Walking and leaping",
        "es": "Andando y saltando"
      },
      "lesson": {
        "en": "The man walked and jumped and praised God. When God helps us, we can thank Him with joy!",
        "es": "El hombre andaba, saltaba y alababa a Dios. ¡Cuando Dios nos ayuda, podemos darle gracias con alegría!"
      },
      "at": {
        "en": [
          44,
          3,
          8
        ],
        "es": [
          44,
          3,
          8
        ]
      },
      "ref": {
        "en": "Acts 3:8",
        "es": "Hechos 3:8"
      },
      "verse": {
        "en": "And he leaping up stood, and walked, and entered with them into the temple, walking, and leaping, and praising God.",
        "es": "Y saltando, se puso en pie, y anduvo; y entró con ellos en el templo, andando, y saltando, y alabando á Dios."
      },
      "stars": [
        3000,
        3400
      ]
    },
    {
      "n": 25,
      "chapter": "road",
      "seed": 23620,
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
          "piece": "star",
          "n": 24
        }
      ],
      "moves": 26,
      "stones": null,
      "title": {
        "en": "A light from heaven",
        "es": "Una luz del cielo"
      },
      "lesson": {
        "en": "A light from heaven shone around Saul. Jesus can reach anyone, even someone who was against Him.",
        "es": "Una luz del cielo rodeó a Saulo. Jesús puede alcanzar a cualquiera, aun a alguien que estaba en su contra."
      },
      "at": {
        "en": [
          44,
          9,
          3
        ],
        "es": [
          44,
          9,
          3
        ]
      },
      "ref": {
        "en": "Acts 9:3",
        "es": "Hechos 9:3"
      },
      "verse": {
        "en": "And as he journeyed, he came near Damascus: and suddenly there shined round about him a light from heaven:",
        "es": "Y yendo por el camino, aconteció que llegando cerca de Damasco, súbitamente le cercó un resplandor de luz del cielo;"
      },
      "stars": [
        2850,
        3350
      ]
    },
    {
      "n": 26,
      "chapter": "road",
      "seed": 23652,
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
          "kind": "stones"
        }
      ],
      "moves": 27,
      "stones": [
        "........",
        "........",
        ".#....#.",
        ".##..##.",
        "........",
        ".##..##.",
        ".#....#.",
        "........"
      ],
      "title": {
        "en": "Eyes opened",
        "es": "Ojos abiertos"
      },
      "lesson": {
        "en": "Saul could see again, and he became Paul, who told the whole world about Jesus.",
        "es": "Saulo pudo ver otra vez y llegó a ser Pablo, que habló de Jesús a todo el mundo."
      },
      "at": {
        "en": [
          44,
          9,
          18
        ],
        "es": [
          44,
          9,
          18
        ]
      },
      "ref": {
        "en": "Acts 9:18",
        "es": "Hechos 9:18"
      },
      "verse": {
        "en": "And immediately there fell from his eyes as it had been scales: and he received sight forthwith, and arose, and was baptized.",
        "es": "Y luego le cayeron de los ojos como escamas, y recibió al punto la vista: y levantándose, fué bautizado."
      },
      "stars": [
        3150,
        3300
      ]
    },
    {
      "n": 27,
      "chapter": "prison",
      "seed": 23632,
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
          "kind": "score",
          "n": 2900
        }
      ],
      "moves": 29,
      "stones": null,
      "title": {
        "en": "Songs at midnight",
        "es": "Cantos a medianoche"
      },
      "lesson": {
        "en": "Even in prison, Paul and Silas prayed and sang to God. We can praise God when things are hard.",
        "es": "Aun en la cárcel, Pablo y Silas oraban y cantaban a Dios. Podemos alabar a Dios cuando las cosas son difíciles."
      },
      "at": {
        "en": [
          44,
          16,
          25
        ],
        "es": [
          44,
          16,
          25
        ]
      },
      "ref": {
        "en": "Acts 16:25",
        "es": "Hechos 16:25"
      },
      "verse": {
        "en": "And at midnight Paul and Silas prayed, and sang praises unto God: and the prisoners heard them.",
        "es": "Mas á media noche, orando Pablo y Silas, cantaban himnos á Dios: y los que estaban presos los oían."
      },
      "stars": [
        3850,
        4650
      ]
    },
    {
      "n": 28,
      "chapter": "prison",
      "seed": 24119,
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
          "kind": "stones"
        }
      ],
      "moves": 28,
      "stones": [
        "........",
        "........",
        "........",
        "##....##",
        "##....##",
        "........",
        "#.#..#.#",
        "........"
      ],
      "title": {
        "en": "The walls shake",
        "es": "Los muros tiemblan"
      },
      "lesson": {
        "en": "God sent an earthquake, the doors opened, and the chains fell off. Then the jailer and his family believed!",
        "es": "Dios mandó un terremoto, las puertas se abrieron y las cadenas se soltaron. ¡Y el carcelero y su familia creyeron!"
      },
      "at": {
        "en": [
          44,
          16,
          26
        ],
        "es": [
          44,
          16,
          26
        ]
      },
      "ref": {
        "en": "Acts 16:26",
        "es": "Hechos 16:26"
      },
      "verse": {
        "en": "And suddenly there was a great earthquake, so that the foundations of the prison were shaken: and immediately all the doors were opened, and every one's bands were loosed.",
        "es": "Entonces fué hecho de repente un gran terremoto, de tal manera que los cimientos de la cárcel se movían; y luego todas las puertas se abrieron, y las prisiones de todos se soltaron."
      },
      "stars": [
        3000,
        3550
      ]
    },
    {
      "n": 29,
      "chapter": "heaven",
      "seed": 23943,
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
        },
        {
          "kind": "collect",
          "piece": "fish",
          "n": 18
        }
      ],
      "moves": 28,
      "stones": null,
      "title": {
        "en": "No more tears",
        "es": "No más lágrimas"
      },
      "lesson": {
        "en": "God promises a day with no more crying or pain. He will wipe away every tear.",
        "es": "Dios promete un día sin llanto ni dolor. Él enjugará toda lágrima."
      },
      "at": {
        "en": [
          66,
          21,
          4
        ],
        "es": [
          66,
          21,
          4
        ]
      },
      "ref": {
        "en": "Revelation 21:4",
        "es": "Apocalipsis 21:4"
      },
      "verse": {
        "en": "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.",
        "es": "Y limpiará Dios toda lágrima de los ojos de ellos; y la muerte no será más; y no habrá más llanto, ni clamor, ni dolor: porque las primeras cosas son pasadas."
      },
      "stars": [
        2100,
        2550
      ]
    },
    {
      "n": 30,
      "chapter": "heaven",
      "seed": 23975,
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
          "kind": "stones"
        }
      ],
      "moves": 30,
      "stones": [
        "........",
        "........",
        "..####..",
        ".#....#.",
        ".#....#.",
        "..####..",
        "........",
        "........"
      ],
      "title": {
        "en": "All things new",
        "es": "Todo nuevo"
      },
      "lesson": {
        "en": "Jesus says: Behold, I make all things new. His love never ends!",
        "es": "Jesús dice: He aquí, yo hago nuevas todas las cosas. ¡Su amor nunca se acaba!"
      },
      "at": {
        "en": [
          66,
          21,
          5
        ],
        "es": [
          66,
          21,
          5
        ]
      },
      "ref": {
        "en": "Revelation 21:5",
        "es": "Apocalipsis 21:5"
      },
      "verse": {
        "en": "And he that sat upon the throne said, Behold, I make all things new. And he said unto me, Write: for these words are true and faithful.",
        "es": "Y el que estaba sentado en el trono dijo: He aquí, yo hago nuevas todas las cosas. Y me dijo: Escribe; porque estas palabras son fieles y verdaderas."
      },
      "stars": [
        4250,
        4750
      ]
    },
    {
      "n": 31,
      "chapter": "ruth",
      "seed": 25348,
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
          "piece": "leaf",
          "n": 20
        },
        {
          "kind": "score",
          "n": 2400
        }
      ],
      "moves": 28,
      "stones": null,
      "title": {
        "en": "Where you go, I will go",
        "es": "Donde tú vayas, iré yo"
      },
      "lesson": {
        "en": "Ruth stayed with Naomi and chose to love God too. Real friends stay close!",
        "es": "Rut se quedó con Noemí y escogió amar a Dios también. ¡Los buenos amigos se quedan cerca!"
      },
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
      "ref": {
        "en": "Ruth 1:16",
        "es": "Rut 1:16"
      },
      "verse": {
        "en": "And Ruth said, Intreat me not to leave thee, or to return from following after thee: for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and thy God my God:",
        "es": "Y Ruth respondió: No me ruegues que te deje, y me aparte de ti: porque donde quiera que tú fueres, iré yo; y donde quiera que vivieres, viviré. Tu pueblo será mi pueblo, y tu Dios mi Dios."
      },
      "stars": [
        3050,
        4050
      ]
    },
    {
      "n": 32,
      "chapter": "ruth",
      "seed": 25387,
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
          "kind": "stones"
        }
      ],
      "moves": 28,
      "stones": [
        "........",
        "........",
        ".#.##.#.",
        "........",
        ".#.##.#.",
        "........",
        "........",
        "........"
      ],
      "title": {
        "en": "Under His wings",
        "es": "Debajo de sus alas"
      },
      "lesson": {
        "en": "Ruth came to trust God, and He covered her like a bird covers its babies with its wings.",
        "es": "Rut vino a confiar en Dios, y Él la cubrió como un ave cubre a sus pollitos con sus alas."
      },
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
      "ref": {
        "en": "Ruth 2:12",
        "es": "Rut 2:12"
      },
      "verse": {
        "en": "The LORD recompense thy work, and a full reward be given thee of the LORD God of Israel, under whose wings thou art come to trust.",
        "es": "Jehová galardone tu obra, y tu remuneración sea llena por Jehová Dios de Israel, que has venido para cubrirte debajo de sus alas."
      },
      "stars": [
        3250,
        3600
      ]
    },
    {
      "n": 33,
      "chapter": "carmel",
      "seed": 25441,
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
          "kind": "score",
          "n": 3000
        }
      ],
      "moves": 28,
      "stones": null,
      "title": {
        "en": "Fire from heaven",
        "es": "Fuego del cielo"
      },
      "lesson": {
        "en": "Nothing is too hard for God. He answered Elijah’s prayer with fire!",
        "es": "Nada es difícil para Dios. ¡Respondió la oración de Elías con fuego!"
      },
      "at": {
        "en": [
          11,
          18,
          38
        ],
        "es": [
          11,
          18,
          38
        ]
      },
      "ref": {
        "en": "1 Kings 18:38",
        "es": "1 Reyes 18:38"
      },
      "verse": {
        "en": "Then the fire of the LORD fell, and consumed the burnt sacrifice, and the wood, and the stones, and the dust, and licked up the water that was in the trench.",
        "es": "Entonces cayó fuego de Jehová, el cual consumió el holocausto, y la leña, y las piedras, y el polvo, y aun lamió las aguas que estaban en la reguera."
      },
      "stars": [
        4400,
        5200
      ]
    },
    {
      "n": 34,
      "chapter": "carmel",
      "seed": 25458,
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
          "piece": "star",
          "n": 22
        },
        {
          "kind": "collect",
          "piece": "heart",
          "n": 18
        }
      ],
      "moves": 29,
      "stones": null,
      "title": {
        "en": "The LORD is God",
        "es": "¡Jehová es el Dios!"
      },
      "lesson": {
        "en": "When the people saw what God did, they all said: The LORD, He is God!",
        "es": "Cuando el pueblo vio lo que Dios hizo, todos dijeron: ¡Jehová es el Dios!"
      },
      "at": {
        "en": [
          11,
          18,
          39
        ],
        "es": [
          11,
          18,
          39
        ]
      },
      "ref": {
        "en": "1 Kings 18:39",
        "es": "1 Reyes 18:39"
      },
      "verse": {
        "en": "And when all the people saw it, they fell on their faces: and they said, The LORD, he is the God; the LORD, he is the God.",
        "es": "Y viéndolo todo el pueblo, cayeron sobre sus rostros, y dijeron: ¡Jehová es el Dios! ¡Jehová es el Dios!"
      },
      "stars": [
        2750,
        3600
      ]
    },
    {
      "n": 35,
      "chapter": "esther",
      "seed": 25498,
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
          "kind": "stones"
        }
      ],
      "moves": 29,
      "stones": [
        "........",
        "..#..#..",
        ".##..##.",
        "........",
        "........",
        ".##..##.",
        "..#..#..",
        "........"
      ],
      "title": {
        "en": "For such a time as this",
        "es": "Para esta hora"
      },
      "lesson": {
        "en": "God put Esther in the right place at the right time. He has a plan for you too!",
        "es": "Dios puso a Ester en el lugar justo en el momento justo. ¡Él tiene un plan para ti también!"
      },
      "at": {
        "en": [
          17,
          4,
          14
        ],
        "es": [
          17,
          4,
          14
        ]
      },
      "ref": {
        "en": "Esther 4:14",
        "es": "Ester 4:14"
      },
      "verse": {
        "en": "For if thou altogether holdest thy peace at this time, then shall there enlargement and deliverance arise to the Jews from another place; but thou and thy father's house shall be destroyed: and who knoweth whether thou art come to the kingdom for such a time as this?",
        "es": "Porque si absolutamente callares en este tiempo, respiro y libertación tendrán los Judíos de otra parte; mas tú y la casa de tu padre pereceréis. ¿Y quién sabe si para esta hora te han hecho llegar al reino?"
      },
      "stars": [
        4000,
        4700
      ]
    },
    {
      "n": 36,
      "chapter": "esther",
      "seed": 25539,
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
          "kind": "score",
          "n": 2500
        }
      ],
      "moves": 29,
      "stones": null,
      "title": {
        "en": "Light and gladness",
        "es": "Luz y alegría"
      },
      "lesson": {
        "en": "God turned a sad day into a happy one. His people had light and joy!",
        "es": "Dios cambió un día triste en un día feliz. ¡Su pueblo tuvo luz y gozo!"
      },
      "at": {
        "en": [
          17,
          8,
          16
        ],
        "es": [
          17,
          8,
          16
        ]
      },
      "ref": {
        "en": "Esther 8:16",
        "es": "Ester 8:16"
      },
      "verse": {
        "en": "The Jews had light, and gladness, and joy, and honour.",
        "es": "Los Judíos tuvieron luz y alegría, y gozo y honra."
      },
      "stars": [
        3150,
        4300
      ]
    },
    {
      "n": 37,
      "chapter": "tree",
      "seed": 25569,
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
          "piece": "leaf",
          "n": 24
        },
        {
          "kind": "collect",
          "piece": "grapes",
          "n": 18
        }
      ],
      "moves": 29,
      "stones": null,
      "title": {
        "en": "Come down!",
        "es": "¡Desciende!"
      },
      "lesson": {
        "en": "Jesus saw Zacchaeus up in the tree and called him by name. Jesus knows your name too!",
        "es": "Jesús vio a Zaqueo en el árbol y lo llamó por su nombre. ¡Jesús también sabe tu nombre!"
      },
      "at": {
        "en": [
          42,
          19,
          5
        ],
        "es": [
          42,
          19,
          5
        ]
      },
      "ref": {
        "en": "Luke 19:5",
        "es": "Lucas 19:5"
      },
      "verse": {
        "en": "And when Jesus came to the place, he looked up, and saw him, and said unto him, Zacchæus, make haste, and come down; for to day I must abide at thy house.",
        "es": "Y como vino á aquel lugar Jesús, mirando, le vió, y díjole: Zaqueo, date priesa, desciende, porque hoy es necesario que pose en tu casa."
      },
      "stars": [
        2650,
        3450
      ]
    },
    {
      "n": 38,
      "chapter": "tree",
      "seed": 25608,
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
          "kind": "stones"
        }
      ],
      "moves": 30,
      "stones": [
        "........",
        "...##...",
        "..####..",
        "...##...",
        "...##...",
        "...##...",
        "..#..#..",
        "........"
      ],
      "title": {
        "en": "Seek and save",
        "es": "Buscar y salvar"
      },
      "lesson": {
        "en": "Jesus came to look for people who are lost and bring them home to God.",
        "es": "Jesús vino a buscar a los que estaban perdidos y llevarlos de vuelta a Dios."
      },
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
      "ref": {
        "en": "Luke 19:10",
        "es": "Lucas 19:10"
      },
      "verse": {
        "en": "For the Son of man is come to seek and to save that which was lost.",
        "es": "Porque el Hijo del hombre vino á buscar y á salvar lo que se había perdido."
      },
      "stars": [
        2900,
        3850
      ]
    },
    {
      "n": 39,
      "chapter": "lost",
      "seed": 25646,
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
          "kind": "score",
          "n": 2500
        },
        {
          "kind": "collect",
          "piece": "heart",
          "n": 16
        }
      ],
      "moves": 30,
      "stones": null,
      "title": {
        "en": "Found!",
        "es": "¡Encontrada!"
      },
      "lesson": {
        "en": "The shepherd was so happy when he found his sheep. God is that happy when we come to Him!",
        "es": "El pastor se alegró mucho al encontrar su oveja. ¡Así se alegra Dios cuando venimos a Él!"
      },
      "at": {
        "en": [
          42,
          15,
          6
        ],
        "es": [
          42,
          15,
          6
        ]
      },
      "ref": {
        "en": "Luke 15:6",
        "es": "Lucas 15:6"
      },
      "verse": {
        "en": "And when he cometh home, he calleth together his friends and neighbours, saying unto them, Rejoice with me; for I have found my sheep which was lost.",
        "es": "Y viniendo á casa, junta á los amigos y á los vecinos, diciéndoles: Dadme el parabién, porque he hallado mi oveja que se había perdido."
      },
      "stars": [
        3950,
        4300
      ]
    },
    {
      "n": 40,
      "chapter": "lost",
      "seed": 25680,
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
          "kind": "stones"
        }
      ],
      "moves": 30,
      "stones": [
        "........",
        "........",
        ".#.##.#.",
        "........",
        "........",
        ".#.##.#.",
        "........",
        "........"
      ],
      "title": {
        "en": "The good shepherd",
        "es": "El buen pastor"
      },
      "lesson": {
        "en": "Jesus is our good shepherd. He loves His sheep so much that He gave His life for them.",
        "es": "Jesús es nuestro buen pastor. Ama tanto a sus ovejas que dio su vida por ellas."
      },
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
      "ref": {
        "en": "John 10:11",
        "es": "Juan 10:11"
      },
      "verse": {
        "en": "I am the good shepherd: the good shepherd giveth his life for the sheep.",
        "es": "Yo soy el buen pastor: el buen pastor su vida da por las ovejas."
      },
      "stars": [
        4000,
        4350
      ]
    }
  ];
  const api = { PIECES, CHAPTERS, LEVELS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMatchData = api;
})(typeof self !== 'undefined' ? self : this);
