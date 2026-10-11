/* Bible squishies: the characters, their lessons, and the question bank.
   Verses are quoted word for word from the app's own KJV (bible/NN.json) and
   RV1909 (bible/rvr/NN.json) text; squishy.test.mjs checks every one.
   "at" is [book id, chapter, verse] in each translation (Jonah 1:17 in the
   KJV is Jonás 2:1 in the RV1909). In each question the first choice is the
   right one; the game shuffles them. */
(function (root) {
  'use strict';
  const SQUISHIES = [
    {
      "id": "lamb",
      "sound": "baa",
      "locked": false,
      "name": {
        "en": "Little Lamb",
        "es": "Corderito"
      },
      "lesson": {
        "en": "Jesus is the Good Shepherd. He knows each of His sheep, and He loves you so much that He gave His life for you.",
        "es": "Jesús es el buen pastor. Conoce a cada una de sus ovejas, y te ama tanto que dio su vida por ti."
      },
      "quiz": {
        "en": "Jesus said He is the Good Shepherd. Which squishy is one of His sheep?",
        "es": "Jesús dijo que él es el buen pastor. ¿Cuál squishy es una de sus ovejas?"
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
      }
    },
    {
      "id": "dove",
      "sound": "coo",
      "locked": false,
      "name": {
        "en": "Noah's Dove",
        "es": "La paloma de Noé"
      },
      "lesson": {
        "en": "After the big flood, the dove came back to Noah with a fresh olive leaf. God kept Noah's family safe, and the earth was ready again.",
        "es": "Después del gran diluvio, la paloma volvió a Noé con una hoja de olivo. Dios cuidó a la familia de Noé, y la tierra estaba lista otra vez."
      },
      "quiz": {
        "en": "Who brought Noah an olive leaf?",
        "es": "¿Quién le trajo a Noé una hoja de olivo?"
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
      }
    },
    {
      "id": "fish",
      "sound": "bubbles",
      "locked": false,
      "name": {
        "en": "Jonah's Big Fish",
        "es": "El gran pez de Jonás"
      },
      "lesson": {
        "en": "Jonah ran away from what God asked. God sent a great fish to swallow him, and inside the fish Jonah prayed. God heard him and gave him another chance.",
        "es": "Jonás huyó de lo que Dios le pidió. Dios preparó un gran pez que se lo tragó, y dentro del pez Jonás oró. Dios lo escuchó y le dio otra oportunidad."
      },
      "quiz": {
        "en": "Who kept Jonah inside for three days and three nights?",
        "es": "¿Quién tuvo a Jonás adentro tres días y tres noches?"
      },
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
      "ref": {
        "en": "Jonah 1:17",
        "es": "Jonás 2:1"
      },
      "verse": {
        "en": "Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.",
        "es": "MAS Jehová había prevenido un gran pez que tragase á Jonás: y estuvo Jonás en el vientre del pez tres días y tres noches."
      }
    },
    {
      "id": "lion",
      "sound": "purr",
      "locked": false,
      "name": {
        "en": "Daniel's Lion",
        "es": "El león de Daniel"
      },
      "lesson": {
        "en": "Daniel prayed to God every day. When he was put in the lions' den, God sent His angel to shut the lions' mouths, and Daniel was safe.",
        "es": "Daniel oraba a Dios todos los días. Cuando lo echaron al foso de los leones, Dios envió a su ángel a cerrar la boca de los leones, y Daniel quedó a salvo."
      },
      "quiz": {
        "en": "Whose mouth did God's angel shut to keep Daniel safe?",
        "es": "¿A quién le cerró la boca el ángel de Dios para cuidar a Daniel?"
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
      }
    },
    {
      "id": "star",
      "sound": "twinkle",
      "locked": false,
      "name": {
        "en": "Star of Bethlehem",
        "es": "La estrella de Belén"
      },
      "lesson": {
        "en": "Wise men followed a bright star to find the baby Jesus. When they saw the star, they were filled with joy!",
        "es": "Unos sabios siguieron una estrella brillante para encontrar al niño Jesús. ¡Cuando vieron la estrella, se llenaron de alegría!"
      },
      "quiz": {
        "en": "What did the wise men follow to find the baby Jesus?",
        "es": "¿Qué siguieron los sabios para encontrar al niño Jesús?"
      },
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
      "ref": {
        "en": "Matthew 2:10",
        "es": "Mateo 2:10"
      },
      "verse": {
        "en": "When they saw the star, they rejoiced with exceeding great joy.",
        "es": "Y vista la estrella, se regocijaron con muy grande gozo."
      }
    },
    {
      "id": "rainbow",
      "sound": "chime",
      "locked": false,
      "name": {
        "en": "Rainbow",
        "es": "Arcoíris"
      },
      "lesson": {
        "en": "After the flood, God put a rainbow in the clouds. It is the sign of His promise, and God always keeps His promises.",
        "es": "Después del diluvio, Dios puso un arcoíris en las nubes. Es la señal de su promesa, y Dios siempre cumple sus promesas."
      },
      "quiz": {
        "en": "What did God put in the clouds as the sign of His promise?",
        "es": "¿Qué puso Dios en las nubes como señal de su promesa?"
      },
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
      "ref": {
        "en": "Genesis 9:13",
        "es": "Génesis 9:13"
      },
      "verse": {
        "en": "I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.",
        "es": "Mi arco pondré en las nubes, el cual será por señal de convenio entre mí y la tierra."
      }
    },
    {
      "id": "stone",
      "sound": "boing",
      "locked": true,
      "name": {
        "en": "David's Sling Stone",
        "es": "La piedra de David"
      },
      "lesson": {
        "en": "David was only a boy, but he trusted God. He faced the giant Goliath with a sling and a small stone, in the name of the Lord.",
        "es": "David era apenas un muchacho, pero confiaba en Dios. Enfrentó al gigante Goliat con una honda y una piedrita, en el nombre del Señor."
      },
      "quiz": {
        "en": "What did David put in his sling to face Goliath?",
        "es": "¿Qué puso David en su honda para enfrentar a Goliat?"
      },
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
      "ref": {
        "en": "1 Samuel 17:45",
        "es": "1 Samuel 17:45"
      },
      "verse": {
        "en": "Then said David to the Philistine, Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts, the God of the armies of Israel, whom thou hast defied.",
        "es": "Entonces dijo David al Filisteo: Tú vienes á mí con espada y lanza y escudo; mas yo vengo á ti en el nombre de Jehová de los ejércitos, el Dios de los escuadrones de Israel, que tú has provocado."
      }
    },
    {
      "id": "loaves",
      "sound": "squish",
      "locked": true,
      "name": {
        "en": "Loaves and Fishes",
        "es": "Panes y peces"
      },
      "lesson": {
        "en": "A boy shared five small loaves and two little fishes. Jesus gave thanks and fed a huge crowd, and everyone had as much as they wanted.",
        "es": "Un muchacho compartió cinco panes y dos pececillos. Jesús dio gracias y alimentó a una gran multitud, y todos comieron lo que quisieron."
      },
      "quiz": {
        "en": "What did the boy share so Jesus could feed the crowd?",
        "es": "¿Qué compartió el muchacho para que Jesús alimentara a la multitud?"
      },
      "at": {
        "en": [
          43,
          6,
          11
        ],
        "es": [
          43,
          6,
          11
        ]
      },
      "ref": {
        "en": "John 6:11",
        "es": "Juan 6:11"
      },
      "verse": {
        "en": "And Jesus took the loaves; and when he had given thanks, he distributed to the disciples, and the disciples to them that were set down; and likewise of the fishes as much as they would.",
        "es": "Y tomó Jesús aquellos panes, y habiendo dado gracias, repartió á los discípulos, y los discípulos á los que estaban recostados: asimismo de los peces, cuanto querían."
      }
    },
    {
      "id": "seed",
      "sound": "pip",
      "locked": true,
      "name": {
        "en": "Mustard Seed",
        "es": "Semilla de mostaza"
      },
      "lesson": {
        "en": "A mustard seed is very tiny. Jesus said that even faith as small as a mustard seed can trust God for big things.",
        "es": "La semilla de mostaza es muy pequeñita. Jesús dijo que hasta una fe tan pequeña como un grano de mostaza puede confiar en Dios para cosas grandes."
      },
      "quiz": {
        "en": "Which tiny thing did Jesus use to teach about faith?",
        "es": "¿Qué cosa pequeñita usó Jesús para enseñar sobre la fe?"
      },
      "at": {
        "en": [
          40,
          17,
          20
        ],
        "es": [
          40,
          17,
          20
        ]
      },
      "ref": {
        "en": "Matthew 17:20",
        "es": "Mateo 17:20"
      },
      "verse": {
        "en": "And Jesus said unto them, Because of your unbelief: for verily I say unto you, If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.",
        "es": "Y Jesús les dijo: Por vuestra incredulidad; porque de cierto os digo, que si tuviereis fe como un grano de mostaza, diréis á este monte: Pásate de aquí allá: y se pasará: y nada os será imposible."
      }
    },
    {
      "id": "bush",
      "sound": "whoosh",
      "locked": true,
      "name": {
        "en": "Burning Bush",
        "es": "La zarza ardiente"
      },
      "lesson": {
        "en": "Moses saw a bush on fire, but it did not burn up! God spoke to Moses from the bush and called him to help His people.",
        "es": "Moisés vio una zarza que ardía en fuego, ¡pero no se consumía! Dios le habló a Moisés desde la zarza y lo llamó para ayudar a su pueblo."
      },
      "quiz": {
        "en": "What was on fire but did not burn up?",
        "es": "¿Qué ardía en fuego pero no se consumía?"
      },
      "at": {
        "en": [
          2,
          3,
          2
        ],
        "es": [
          2,
          3,
          2
        ]
      },
      "ref": {
        "en": "Exodus 3:2",
        "es": "Éxodo 3:2"
      },
      "verse": {
        "en": "And the angel of the LORD appeared unto him in a flame of fire out of the midst of a bush: and he looked, and, behold, the bush burned with fire, and the bush was not consumed.",
        "es": "Y apareciósele el Angel de Jehová en una llama de fuego en medio de una zarza: y él miró, y vió que la zarza ardía en fuego, y la zarza no se consumía."
      }
    },
    {
      "id": "basket",
      "sound": "giggle",
      "locked": true,
      "name": {
        "en": "Baby Moses' Basket",
        "es": "La canastita de Moisés"
      },
      "lesson": {
        "en": "Baby Moses' mother made him a little basket and laid it by the river. God watched over him, and he was safe.",
        "es": "La mamá del bebé Moisés le hizo una canastita y la puso a la orilla del río. Dios lo cuidó, y estuvo a salvo."
      },
      "quiz": {
        "en": "What did baby Moses float in by the river?",
        "es": "¿En qué flotó el bebé Moisés a la orilla del río?"
      },
      "at": {
        "en": [
          2,
          2,
          3
        ],
        "es": [
          2,
          2,
          3
        ]
      },
      "ref": {
        "en": "Exodus 2:3",
        "es": "Éxodo 2:3"
      },
      "verse": {
        "en": "And when she could not longer hide him, she took for him an ark of bulrushes, and daubed it with slime and with pitch, and put the child therein; and she laid it in the flags by the river's brink.",
        "es": "Pero no pudiendo ocultarle más tiempo, tomó una arquilla de juncos, y calafateóla con pez y betún, y colocó en ella al niño, y púsolo en un carrizal á la orilla del río:"
      }
    },
    {
      "id": "tree",
      "sound": "rustle",
      "locked": true,
      "name": {
        "en": "Zacchaeus' Tree",
        "es": "El árbol de Zaqueo"
      },
      "lesson": {
        "en": "Zacchaeus was too short to see Jesus, so he climbed a tree. Jesus stopped, called him by name, and went to his house.",
        "es": "Zaqueo era muy bajito para ver a Jesús, así que se subió a un árbol. Jesús se detuvo, lo llamó por su nombre y fue a su casa."
      },
      "quiz": {
        "en": "Where did Zacchaeus climb to see Jesus?",
        "es": "¿Adónde se subió Zaqueo para ver a Jesús?"
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
      }
    },
    {
      "id": "ark",
      "sound": "creak",
      "locked": true,
      "name": {
        "en": "Noah's Ark",
        "es": "El arca de Noé"
      },
      "lesson": {
        "en": "God told Noah to build a big boat called an ark. Noah obeyed and did everything God asked, and God kept his family and the animals safe.",
        "es": "Dios le dijo a Noé que construyera un barco grande llamado arca. Noé obedeció e hizo todo lo que Dios le mandó, y Dios cuidó a su familia y a los animales."
      },
      "quiz": {
        "en": "What big boat did Noah build when he obeyed God?",
        "es": "¿Qué barco grande construyó Noé cuando obedeció a Dios?"
      },
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
      "ref": {
        "en": "Genesis 6:22",
        "es": "Génesis 6:22"
      },
      "verse": {
        "en": "Thus did Noah; according to all that God commanded him, so did he.",
        "es": "E hízolo así Noé; hizo conforme á todo lo que Dios le mandó."
      }
    },
    {
      "id": "coat",
      "sound": "swish",
      "locked": true,
      "name": {
        "en": "Joseph's Coat",
        "es": "La túnica de José"
      },
      "lesson": {
        "en": "Joseph’s father, Israel, gave him a coat of many colors. Joseph went through hard times, but God was with him and used him to help many people.",
        "es": "Israel, el padre de José, le dio una túnica de muchos colores. José pasó por momentos difíciles, pero Dios estaba con él y lo usó para ayudar a mucha gente."
      },
      "quiz": {
        "en": "What special gift did Joseph get from his father?",
        "es": "¿Qué regalo especial recibió José de su padre?"
      },
      "at": {
        "en": [
          1,
          37,
          3
        ],
        "es": [
          1,
          37,
          3
        ]
      },
      "ref": {
        "en": "Genesis 37:3",
        "es": "Génesis 37:3"
      },
      "verse": {
        "en": "Now Israel loved Joseph more than all his children, because he was the son of his old age: and he made him a coat of many colours.",
        "es": "Y amaba Israel á José más que á todos sus hijos, porque le había tenido en su vejez: y le hizo una ropa de diversos colores."
      }
    }
  ];

  const QUESTIONS = [
    {
      "id": "q1",
      "q": {
        "en": "Who was swallowed by a big fish?",
        "es": "¿A quién se tragó un gran pez?"
      },
      "choices": {
        "en": [
          "Jonah",
          "Peter",
          "Noah",
          "David"
        ],
        "es": [
          "Jonás",
          "Pedro",
          "Noé",
          "David"
        ]
      },
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
      "ref": {
        "en": "Jonah 1:17",
        "es": "Jonás 2:1"
      },
      "key": {
        "en": "Jonah",
        "es": "Jonás"
      }
    },
    {
      "id": "q2",
      "q": {
        "en": "How many days and nights did it rain while Noah was in the ark?",
        "es": "¿Cuántos días y noches llovió mientras Noé estaba en el arca?"
      },
      "choices": {
        "en": [
          "40",
          "7",
          "12",
          "100"
        ],
        "es": [
          "40",
          "7",
          "12",
          "100"
        ]
      },
      "at": {
        "en": [
          1,
          7,
          12
        ],
        "es": [
          1,
          7,
          12
        ]
      },
      "ref": {
        "en": "Genesis 7:12",
        "es": "Génesis 7:12"
      },
      "key": {
        "en": "forty days",
        "es": "cuarenta días"
      }
    },
    {
      "id": "q3",
      "q": {
        "en": "Which sea did God’s people cross on dry land with Moses?",
        "es": "¿Qué mar cruzó el pueblo de Dios en seco con Moisés?"
      },
      "choices": {
        "en": [
          "The Red Sea",
          "The Dead Sea",
          "The Sea of Galilee",
          "The Great Sea"
        ],
        "es": [
          "El mar Rojo (mar Bermejo)",
          "El mar Muerto",
          "El mar de Galilea",
          "El mar Grande"
        ]
      },
      "at": {
        "en": [
          58,
          11,
          29
        ],
        "es": [
          58,
          11,
          29
        ]
      },
      "ref": {
        "en": "Hebrews 11:29",
        "es": "Hebreos 11:29"
      },
      "key": {
        "en": "Red sea",
        "es": "mar Bermejo"
      }
    },
    {
      "id": "q4",
      "q": {
        "en": "Who was put in the lions' den?",
        "es": "¿A quién echaron al foso de los leones?"
      },
      "choices": {
        "en": [
          "Daniel",
          "Joseph",
          "Elijah",
          "Paul"
        ],
        "es": [
          "Daniel",
          "José",
          "Elías",
          "Pablo"
        ]
      },
      "at": {
        "en": [
          27,
          6,
          16
        ],
        "es": [
          27,
          6,
          16
        ]
      },
      "ref": {
        "en": "Daniel 6:16",
        "es": "Daniel 6:16"
      },
      "key": {
        "en": "Daniel",
        "es": "Daniel"
      }
    },
    {
      "id": "q5",
      "q": {
        "en": "What did David use to defeat Goliath?",
        "es": "¿Qué usó David para vencer a Goliat?"
      },
      "choices": {
        "en": [
          "A sling and a stone",
          "A sword",
          "A bow and arrow",
          "A spear"
        ],
        "es": [
          "Una honda y una piedra",
          "Una espada",
          "Un arco y una flecha",
          "Una lanza"
        ]
      },
      "at": {
        "en": [
          9,
          17,
          49
        ],
        "es": [
          9,
          17,
          49
        ]
      },
      "ref": {
        "en": "1 Samuel 17:49",
        "es": "1 Samuel 17:49"
      },
      "key": {
        "en": "stone",
        "es": "piedra"
      }
    },
    {
      "id": "q6",
      "q": {
        "en": "How many loaves did the boy have when Jesus fed the crowd?",
        "es": "¿Cuántos panes tenía el muchacho cuando Jesús alimentó a la multitud?"
      },
      "choices": {
        "en": [
          "Five",
          "Two",
          "Seven",
          "Twelve"
        ],
        "es": [
          "Cinco",
          "Dos",
          "Siete",
          "Doce"
        ]
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
      "key": {
        "en": "five",
        "es": "cinco"
      }
    },
    {
      "id": "q7",
      "q": {
        "en": "Who climbed a sycamore tree to see Jesus?",
        "es": "¿Quién se subió a un sicómoro para ver a Jesús?"
      },
      "choices": {
        "en": [
          "Zacchaeus",
          "Peter",
          "Matthew",
          "Thomas"
        ],
        "es": [
          "Zaqueo",
          "Pedro",
          "Mateo",
          "Tomás"
        ]
      },
      "at": {
        "en": [
          42,
          19,
          4
        ],
        "es": [
          42,
          19,
          4
        ]
      },
      "ref": {
        "en": "Luke 19:4",
        "es": "Lucas 19:4"
      },
      "key": {
        "en": "sycomore",
        "es": "sicómoro"
      }
    },
    {
      "id": "q8",
      "q": {
        "en": "In which town was Jesus born?",
        "es": "¿En qué pueblo nació Jesús?"
      },
      "choices": {
        "en": [
          "Bethlehem",
          "Nazareth",
          "Jerusalem",
          "Capernaum"
        ],
        "es": [
          "Belén",
          "Nazaret",
          "Jerusalén",
          "Capernaum"
        ]
      },
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
      "ref": {
        "en": "Matthew 2:1",
        "es": "Mateo 2:1"
      },
      "key": {
        "en": "Bethlehem",
        "es": "Bethlehem"
      }
    },
    {
      "id": "q9",
      "q": {
        "en": "What did God set in the clouds as a sign of His promise?",
        "es": "¿Qué puso Dios en las nubes como señal de su promesa?"
      },
      "choices": {
        "en": [
          "A rainbow",
          "A star",
          "A dove",
          "The moon"
        ],
        "es": [
          "Un arcoíris",
          "Una estrella",
          "Una paloma",
          "La luna"
        ]
      },
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
      "ref": {
        "en": "Genesis 9:13",
        "es": "Génesis 9:13"
      },
      "key": {
        "en": "bow in the cloud",
        "es": "arco pondré"
      }
    },
    {
      "id": "q10",
      "q": {
        "en": "Who built the ark?",
        "es": "¿Quién construyó el arca?"
      },
      "choices": {
        "en": [
          "Noah",
          "Moses",
          "Abraham",
          "Jonah"
        ],
        "es": [
          "Noé",
          "Moisés",
          "Abraham",
          "Jonás"
        ]
      },
      "at": {
        "en": [
          58,
          11,
          7
        ],
        "es": [
          58,
          11,
          7
        ]
      },
      "ref": {
        "en": "Hebrews 11:7",
        "es": "Hebreos 11:7"
      },
      "key": {
        "en": "Noah",
        "es": "Noé"
      }
    },
    {
      "id": "q11",
      "q": {
        "en": "On which day did God rest from His work?",
        "es": "¿En qué día reposó Dios de su obra?"
      },
      "choices": {
        "en": [
          "The seventh day",
          "The first day",
          "The third day",
          "The tenth day"
        ],
        "es": [
          "El día séptimo",
          "El primer día",
          "El tercer día",
          "El décimo día"
        ]
      },
      "at": {
        "en": [
          1,
          2,
          2
        ],
        "es": [
          1,
          2,
          2
        ]
      },
      "ref": {
        "en": "Genesis 2:2",
        "es": "Génesis 2:2"
      },
      "key": {
        "en": "seventh day",
        "es": "día séptimo"
      }
    },
    {
      "id": "q12",
      "q": {
        "en": "How many apostles did Jesus choose?",
        "es": "¿Cuántos apóstoles escogió Jesús?"
      },
      "choices": {
        "en": [
          "Twelve",
          "Seven",
          "Ten",
          "Three"
        ],
        "es": [
          "Doce",
          "Siete",
          "Diez",
          "Tres"
        ]
      },
      "at": {
        "en": [
          42,
          6,
          13
        ],
        "es": [
          42,
          6,
          13
        ]
      },
      "ref": {
        "en": "Luke 6:13",
        "es": "Lucas 6:13"
      },
      "key": {
        "en": "twelve",
        "es": "doce"
      }
    },
    {
      "id": "q13",
      "q": {
        "en": "What was the name of the mother of Jesus?",
        "es": "¿Cómo se llamaba la madre de Jesús?"
      },
      "choices": {
        "en": [
          "Mary",
          "Martha",
          "Sarah",
          "Ruth"
        ],
        "es": [
          "María",
          "Marta",
          "Sara",
          "Rut"
        ]
      },
      "at": {
        "en": [
          40,
          1,
          18
        ],
        "es": [
          40,
          1,
          18
        ]
      },
      "ref": {
        "en": "Matthew 1:18",
        "es": "Mateo 1:18"
      },
      "key": {
        "en": "Mary",
        "es": "María"
      }
    },
    {
      "id": "q14",
      "q": {
        "en": "At the wedding in Cana, what did Jesus turn water into?",
        "es": "En la boda de Caná, ¿en qué convirtió Jesús el agua?"
      },
      "choices": {
        "en": [
          "Wine",
          "Milk",
          "Honey",
          "Oil"
        ],
        "es": [
          "Vino",
          "Leche",
          "Miel",
          "Aceite"
        ]
      },
      "at": {
        "en": [
          43,
          2,
          9
        ],
        "es": [
          43,
          2,
          9
        ]
      },
      "ref": {
        "en": "John 2:9",
        "es": "Juan 2:9"
      },
      "key": {
        "en": "wine",
        "es": "vino"
      }
    },
    {
      "id": "q15",
      "q": {
        "en": "Who received a coat of many colors from his father?",
        "es": "¿Quién recibió de su padre una túnica de muchos colores?"
      },
      "choices": {
        "en": [
          "Joseph",
          "Benjamin",
          "David",
          "Isaac"
        ],
        "es": [
          "José",
          "Benjamín",
          "David",
          "Isaac"
        ]
      },
      "at": {
        "en": [
          1,
          37,
          3
        ],
        "es": [
          1,
          37,
          3
        ]
      },
      "ref": {
        "en": "Genesis 37:3",
        "es": "Génesis 37:3"
      },
      "key": {
        "en": "Joseph",
        "es": "José"
      }
    },
    {
      "id": "q16",
      "q": {
        "en": "Who was the first man?",
        "es": "¿Quién fue el primer hombre?"
      },
      "choices": {
        "en": [
          "Adam",
          "Abel",
          "Noah",
          "Abraham"
        ],
        "es": [
          "Adán",
          "Abel",
          "Noé",
          "Abraham"
        ]
      },
      "at": {
        "en": [
          46,
          15,
          45
        ],
        "es": [
          46,
          15,
          45
        ]
      },
      "ref": {
        "en": "1 Corinthians 15:45",
        "es": "1 Corintios 15:45"
      },
      "key": {
        "en": "first man Adam",
        "es": "primer hombre Adam"
      }
    },
    {
      "id": "q17",
      "q": {
        "en": "From what did God call to Moses?",
        "es": "¿Desde dónde llamó Dios a Moisés?"
      },
      "choices": {
        "en": [
          "A bush",
          "A mountain cave",
          "A boat",
          "A well"
        ],
        "es": [
          "Una zarza",
          "Una cueva",
          "Un barco",
          "Un pozo"
        ]
      },
      "at": {
        "en": [
          2,
          3,
          4
        ],
        "es": [
          2,
          3,
          4
        ]
      },
      "ref": {
        "en": "Exodus 3:4",
        "es": "Éxodo 3:4"
      },
      "key": {
        "en": "bush",
        "es": "zarza"
      }
    },
    {
      "id": "q18",
      "q": {
        "en": "How many commandments did God write on the tablets of stone?",
        "es": "¿Cuántos mandamientos escribió Dios en las tablas de piedra?"
      },
      "choices": {
        "en": [
          "Ten",
          "Five",
          "Seven",
          "Twelve"
        ],
        "es": [
          "Diez",
          "Cinco",
          "Siete",
          "Doce"
        ]
      },
      "at": {
        "en": [
          2,
          34,
          28
        ],
        "es": [
          2,
          34,
          28
        ]
      },
      "ref": {
        "en": "Exodus 34:28",
        "es": "Éxodo 34:28"
      },
      "key": {
        "en": "ten commandments",
        "es": "diez palabras"
      }
    },
    {
      "id": "q19",
      "q": {
        "en": "At Jericho, what fell down when the people shouted?",
        "es": "En Jericó, ¿qué se cayó cuando el pueblo gritó?"
      },
      "choices": {
        "en": [
          "The wall",
          "A tower of gold",
          "A big tree",
          "The city gate only"
        ],
        "es": [
          "El muro",
          "Una torre de oro",
          "Un árbol grande",
          "Solo la puerta"
        ]
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
      "key": {
        "en": "wall fell down",
        "es": "muro cayó"
      }
    },
    {
      "id": "q20",
      "q": {
        "en": "Who walked on the water to go to Jesus?",
        "es": "¿Quién caminó sobre el agua para ir a Jesús?"
      },
      "choices": {
        "en": [
          "Peter",
          "John",
          "Andrew",
          "James"
        ],
        "es": [
          "Pedro",
          "Juan",
          "Andrés",
          "Jacobo"
        ]
      },
      "at": {
        "en": [
          40,
          14,
          29
        ],
        "es": [
          40,
          14,
          29
        ]
      },
      "ref": {
        "en": "Matthew 14:29",
        "es": "Mateo 14:29"
      },
      "key": {
        "en": "Peter",
        "es": "Pedro"
      }
    },
    {
      "id": "q21",
      "q": {
        "en": "What went before the wise men and stopped over the young child?",
        "es": "¿Qué iba delante de los magos y se detuvo sobre el niño?"
      },
      "choices": {
        "en": [
          "A star",
          "An angel",
          "A cloud",
          "A bird"
        ],
        "es": [
          "Una estrella",
          "Un ángel",
          "Una nube",
          "Un pájaro"
        ]
      },
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
      "ref": {
        "en": "Matthew 2:9",
        "es": "Mateo 2:9"
      },
      "key": {
        "en": "star",
        "es": "estrella"
      }
    },
    {
      "id": "q22",
      "q": {
        "en": "What did God make when He said, “Let there be…”, on the first day?",
        "es": "¿Qué hizo Dios el primer día cuando dijo: “Sea…”?"
      },
      "choices": {
        "en": [
          "Light",
          "Fish",
          "Trees",
          "People"
        ],
        "es": [
          "La luz",
          "Los peces",
          "Los árboles",
          "Las personas"
        ]
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
      "key": {
        "en": "Let there be light",
        "es": "Sea la luz"
      }
    }
  ];

  const api = { SQUISHIES, QUESTIONS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyData = api;
})(typeof self !== 'undefined' ? self : this);
