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
    },
    {
      "id": "ladder",
      "sound": "chime",
      "locked": true,
      "name": {
        "en": "Jacob's Ladder",
        "es": "La escalera de Jacob"
      },
      "lesson": {
        "en": "Jacob was all alone, far from home. God showed him a ladder up to heaven with angels on it, and promised: “I am with you wherever you go.”",
        "es": "Jacob estaba solo, lejos de casa. Dios le mostró una escalera hasta el cielo con ángeles, y le prometió: «Yo estoy contigo dondequiera que vayas»."
      },
      "quiz": {
        "en": "Jacob dreamed of angels going up and down. Which squishy reaches up to heaven?",
        "es": "Jacob soñó con ángeles que subían y bajaban. ¿Cuál squishy llega hasta el cielo?"
      },
      "at": {
        "en": [
          1,
          28,
          12
        ],
        "es": [
          1,
          28,
          12
        ]
      },
      "ref": {
        "en": "Genesis 28:12",
        "es": "Génesis 28:12"
      },
      "verse": {
        "en": "And he dreamed, and behold a ladder set up on the earth, and the top of it reached to heaven: and behold the angels of God ascending and descending on it.",
        "es": "Y soñó, y he aquí una escala que estaba apoyada en tierra, y su cabeza tocaba en el cielo: y he aquí ángeles de Dios que subían y descendían por ella."
      }
    },
    {
      "id": "raven",
      "sound": "caw",
      "locked": true,
      "name": {
        "en": "Elijah's Raven",
        "es": "El cuervo de Elías"
      },
      "lesson": {
        "en": "When there was no food, God sent ravens to bring Elijah bread and meat every morning and every evening. God takes care of you too!",
        "es": "Cuando no había comida, Dios envió cuervos para llevarle a Elías pan y carne cada mañana y cada tarde. ¡Dios también te cuida a ti!"
      },
      "quiz": {
        "en": "Which squishy brought bread to Elijah?",
        "es": "¿Cuál squishy le llevó pan a Elías?"
      },
      "at": {
        "en": [
          11,
          17,
          6
        ],
        "es": [
          11,
          17,
          6
        ]
      },
      "ref": {
        "en": "1 Kings 17:6",
        "es": "1 Reyes 17:6"
      },
      "verse": {
        "en": "And the ravens brought him bread and flesh in the morning, and bread and flesh in the evening; and he drank of the brook.",
        "es": "Y los cuervos le traían pan y carne por la mañana, y pan y carne á la tarde; y bebía del arroyo."
      }
    },
    {
      "id": "wheat",
      "sound": "rustle",
      "locked": true,
      "name": {
        "en": "Ruth's Wheat",
        "es": "El trigo de Rut"
      },
      "lesson": {
        "en": "Ruth stayed with Naomi and took care of her, gathering grain in the fields. She was loyal and kind, and God blessed her.",
        "es": "Rut se quedó con Noemí y la cuidó, recogiendo espigas en el campo. Fue fiel y bondadosa, y Dios la bendijo."
      },
      "quiz": {
        "en": "Ruth gathered grain to care for Naomi. Which squishy is a bundle of wheat?",
        "es": "Rut recogió espigas para cuidar a Noemí. ¿Cuál squishy es un manojo de trigo?"
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
      }
    },
    {
      "id": "oil",
      "sound": "glug",
      "locked": true,
      "name": {
        "en": "Widow's Oil Jar",
        "es": "La vasija de aceite"
      },
      "lesson": {
        "en": "A poor widow had only a little oil. She poured it into every jar she could find, and God kept it flowing until all the jars were full!",
        "es": "Una viuda pobre solo tenía un poco de aceite. Lo echó en todas las vasijas que encontró, ¡y Dios lo hizo seguir saliendo hasta llenarlas todas!"
      },
      "quiz": {
        "en": "God kept the oil flowing for the widow. Which squishy is her jar?",
        "es": "Dios hizo que el aceite siguiera saliendo para la viuda. ¿Cuál squishy es su vasija?"
      },
      "at": {
        "en": [
          12,
          4,
          6
        ],
        "es": [
          12,
          4,
          6
        ]
      },
      "ref": {
        "en": "2 Kings 4:6",
        "es": "2 Reyes 4:6"
      },
      "verse": {
        "en": "And it came to pass, when the vessels were full, that she said unto her son, Bring me yet a vessel. And he said unto her, There is not a vessel more. And the oil stayed.",
        "es": "Y como los vasos fueron llenos, dijo á un hijo suyo: Tráeme aún otro vaso. Y él dijo: No hay más vasos. Entonces cesó el aceite."
      }
    },
    {
      "id": "coin",
      "sound": "clink",
      "locked": true,
      "name": {
        "en": "The Lost Coin",
        "es": "La moneda perdida"
      },
      "lesson": {
        "en": "A woman lost one coin. She lit a lamp and swept the whole house until she found it, then she called her friends to celebrate! God is that happy when one person comes back to Him.",
        "es": "Una mujer perdió una moneda. Encendió una lámpara y barrió toda la casa hasta encontrarla, ¡y llamó a sus amigas para celebrar! Así de feliz está Dios cuando una persona vuelve a él."
      },
      "quiz": {
        "en": "Which squishy was lost and then found with great joy?",
        "es": "¿Cuál squishy se perdió y luego se encontró con mucha alegría?"
      },
      "at": {
        "en": [
          42,
          15,
          10
        ],
        "es": [
          42,
          15,
          10
        ]
      },
      "ref": {
        "en": "Luke 15:10",
        "es": "Lucas 15:10"
      },
      "verse": {
        "en": "Likewise, I say unto you, there is joy in the presence of the angels of God over one sinner that repenteth.",
        "es": "Así os digo que hay gozo delante de los ángeles de Dios por un pecador que se arrepiente."
      }
    },
    {
      "id": "donkey",
      "sound": "heehaw",
      "locked": true,
      "name": {
        "en": "Good Samaritan's Donkey",
        "es": "El burrito del buen samaritano"
      },
      "lesson": {
        "en": "A man was hurt by the road. The Good Samaritan stopped, bandaged him, put him on his donkey and took him to an inn. Jesus says: go and do the same.",
        "es": "Un hombre estaba herido junto al camino. El buen samaritano se detuvo, lo vendó, lo subió a su burrito y lo llevó a un mesón. Jesús dice: ve y haz tú lo mismo."
      },
      "quiz": {
        "en": "Which squishy carried the hurt man to the inn?",
        "es": "¿Cuál squishy llevó al hombre herido al mesón?"
      },
      "at": {
        "en": [
          42,
          10,
          37
        ],
        "es": [
          42,
          10,
          37
        ]
      },
      "ref": {
        "en": "Luke 10:37",
        "es": "Lucas 10:37"
      },
      "verse": {
        "en": "And he said, He that shewed mercy on him. Then said Jesus unto him, Go, and do thou likewise.",
        "es": "Y él dijo: El que usó con él de misericordia. Entonces Jesús le dijo: Ve, y haz tú lo mismo."
      }
    },
    {
      "id": "jar",
      "sound": "trumpet",
      "locked": true,
      "name": {
        "en": "Gideon's Jar",
        "es": "El cántaro de Gedeón"
      },
      "lesson": {
        "en": "Gideon had only 300 men. They broke their jars, held up their torches and blew their trumpets, and God gave them the victory. God can do big things with just a few!",
        "es": "Gedeón solo tenía 300 hombres. Quebraron sus cántaros, levantaron sus antorchas y tocaron sus trompetas, y Dios les dio la victoria. ¡Dios hace cosas grandes con muy pocos!"
      },
      "quiz": {
        "en": "Gideon's men broke their jars and their torches shone. Which squishy is a jar with a torch?",
        "es": "Los hombres de Gedeón quebraron sus cántaros y brillaron sus antorchas. ¿Cuál squishy es un cántaro con antorcha?"
      },
      "at": {
        "en": [
          7,
          7,
          20
        ],
        "es": [
          7,
          7,
          20
        ]
      },
      "ref": {
        "en": "Judges 7:20",
        "es": "Jueces 7:20"
      },
      "verse": {
        "en": "And the three companies blew the trumpets, and brake the pitchers, and held the lamps in their left hands, and the trumpets in their right hands to blow withal: and they cried, The sword of the LORD, and of Gideon.",
        "es": "Y los tres escuadrones tocaron las bocinas, y quebrando los cántaros tomaron en las manos izquierdas las teas, y en las derechas los cuernos con que tañían, y dieron grita: ¡La espada de Jehová y de Gedeón!"
      }
    },
    {
      "id": "crown",
      "sound": "royal",
      "locked": true,
      "name": {
        "en": "Esther's Crown",
        "es": "La corona de Ester"
      },
      "lesson": {
        "en": "Queen Esther was brave. She went to the king to save her people, and the king held out his golden scepter. God put her there “for such a time as this.”",
        "es": "La reina Ester fue valiente. Fue a ver al rey para salvar a su pueblo, y el rey le extendió su cetro de oro. Dios la puso allí «para esta hora»."
      },
      "quiz": {
        "en": "Which squishy is the crown of brave Queen Esther?",
        "es": "¿Cuál squishy es la corona de la valiente reina Ester?"
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
      }
    },
    {
      "id": "boat",
      "sound": "whoosh",
      "locked": true,
      "name": {
        "en": "Peter's Boat",
        "es": "La barca de Pedro"
      },
      "lesson": {
        "en": "Peter fished all night and caught nothing. Jesus said, “Let down your nets,” and the net filled with so many fish it began to break! Then Jesus made Peter a fisher of people.",
        "es": "Pedro pescó toda la noche y no sacó nada. Jesús le dijo: «Echa tus redes», ¡y la red se llenó de tantos peces que se rompía! Luego Jesús hizo a Pedro pescador de hombres."
      },
      "quiz": {
        "en": "Which squishy had a net so full of fish it began to break?",
        "es": "¿Cuál squishy tuvo una red tan llena de peces que se rompía?"
      },
      "at": {
        "en": [
          42,
          5,
          6
        ],
        "es": [
          42,
          5,
          6
        ]
      },
      "ref": {
        "en": "Luke 5:6",
        "es": "Lucas 5:6"
      },
      "verse": {
        "en": "And when they had this done, they inclosed a great multitude of fishes: and their net brake.",
        "es": "Y habiéndolo hecho, encerraron gran multitud de pescado, que su red se rompía."
      }
    },
    {
      "id": "tomb",
      "sound": "alleluia",
      "locked": true,
      "name": {
        "en": "Empty Tomb Stone",
        "es": "La piedra de la tumba vacía"
      },
      "lesson": {
        "en": "On Easter morning the big stone was rolled away and the tomb was empty. Jesus is alive! He is risen, just as He said.",
        "es": "En la mañana de Pascua la gran piedra fue quitada y la tumba estaba vacía. ¡Jesús vive! Ha resucitado, como dijo."
      },
      "quiz": {
        "en": "On Easter morning the stone was rolled away. Which squishy is that stone?",
        "es": "En la mañana de Pascua quitaron la piedra. ¿Cuál squishy es esa piedra?"
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
      }
    },
    {
      "id": "lily",
      "sound": "lily",
      "locked": true,
      "name": {
        "en": "Lily of the Field",
        "es": "El lirio del campo"
      },
      "lesson": {
        "en": "Jesus pointed to the lilies of the field. They do not work or worry, yet God dresses them in beauty. If God cares for flowers, He will surely care for you.",
        "es": "Jesús mostró los lirios del campo. No trabajan ni se preocupan, y aun así Dios los viste de belleza. Si Dios cuida de las flores, con más razón cuida de ti."
      },
      "quiz": {
        "en": "Jesus said, “Consider the lilies.” Which squishy is a flower of the field?",
        "es": "Jesús dijo: «Reparad los lirios». ¿Cuál squishy es una flor del campo?"
      },
      "at": {
        "en": [
          40,
          6,
          28
        ],
        "es": [
          40,
          6,
          28
        ]
      },
      "ref": {
        "en": "Matthew 6:28",
        "es": "Mateo 6:28"
      },
      "verse": {
        "en": "And why take ye thought for raiment? Consider the lilies of the field, how they grow; they toil not, neither do they spin:",
        "es": "Y por el vestido ¿por qué os congojáis? Reparad los lirios del campo, cómo crecen; no trabajan ni hilan;"
      }
    },
    {
      "id": "key",
      "sound": "keyturn",
      "locked": true,
      "name": {
        "en": "Ask-Seek-Knock Key",
        "es": "La llave de pedir y llamar"
      },
      "lesson": {
        "en": "Jesus taught us to keep asking, seeking and knocking in prayer. God loves to hear our questions and to open the door for us.",
        "es": "Jesús nos enseñó a seguir pidiendo, buscando y llamando en oración. A Dios le encanta escuchar nuestras preguntas y abrirnos la puerta."
      },
      "quiz": {
        "en": "“Knock, and it shall be opened.” Which squishy opens a door?",
        "es": "«Llamad, y se os abrirá». ¿Cuál squishy abre una puerta?"
      },
      "at": {
        "en": [
          40,
          7,
          7
        ],
        "es": [
          40,
          7,
          7
        ]
      },
      "ref": {
        "en": "Matthew 7:7",
        "es": "Mateo 7:7"
      },
      "verse": {
        "en": "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:",
        "es": "Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá."
      }
    },
    {
      "id": "pearl",
      "sound": "pearl",
      "locked": true,
      "name": {
        "en": "Pearl of Great Price",
        "es": "La perla preciosa"
      },
      "lesson": {
        "en": "In Jesus’ story, a merchant found one wonderful pearl and gave everything to have it. God’s kingdom is the greatest treasure of all.",
        "es": "En la historia de Jesús, un comerciante halló una perla preciosa y dio todo lo que tenía por ella. El reino de Dios es el tesoro más grande de todos."
      },
      "quiz": {
        "en": "A merchant sold everything to buy one treasure. Which squishy is it?",
        "es": "Un comerciante vendió todo para comprar un tesoro. ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          40,
          13,
          46
        ],
        "es": [
          40,
          13,
          46
        ]
      },
      "ref": {
        "en": "Matthew 13:46",
        "es": "Mateo 13:46"
      },
      "verse": {
        "en": "who, when he had found one pearl of great price, went and sold all that he had, and bought it.",
        "es": "Que hallando una preciosa perla, fué y vendió todo lo que tenía, y la compró."
      }
    },
    {
      "id": "manna",
      "sound": "manna",
      "locked": true,
      "name": {
        "en": "Manna from Heaven",
        "es": "El maná del cielo"
      },
      "lesson": {
        "en": "In the desert, God sent bread from heaven every morning. His people gathered just enough for each day, and learned to trust Him day by day.",
        "es": "En el desierto, Dios mandó pan del cielo cada mañana. Su pueblo recogía lo justo para cada día y aprendió a confiar en él día tras día."
      },
      "quiz": {
        "en": "God rained bread from heaven in the desert. Which squishy is it?",
        "es": "Dios hizo llover pan del cielo en el desierto. ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          2,
          16,
          4
        ],
        "es": [
          2,
          16,
          4
        ]
      },
      "ref": {
        "en": "Exodus 16:4",
        "es": "Éxodo 16:4"
      },
      "verse": {
        "en": "Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.",
        "es": "Y Jehová dijo á Moisés: He aquí yo os haré llover pan del cielo; y el pueblo saldrá, y cogerá para cada un día, para que yo le pruebe si anda en mi ley, ó no."
      }
    },
    {
      "id": "scroll",
      "sound": "scroll",
      "locked": true,
      "name": {
        "en": "Scripture Scroll",
        "es": "El rollo de la Escritura"
      },
      "lesson": {
        "en": "Long ago, God’s Word was written on scrolls. Jesus opened the scroll of Isaiah and read it to the people. God’s Word is still for us today.",
        "es": "Hace mucho tiempo, la Palabra de Dios se escribía en rollos. Jesús abrió el libro de Isaías y lo leyó al pueblo. La Palabra de Dios sigue siendo para nosotros hoy."
      },
      "quiz": {
        "en": "Jesus opened the book of Isaiah and read. Which squishy holds God’s Word?",
        "es": "Jesús abrió el libro de Isaías y leyó. ¿Cuál squishy guarda la Palabra de Dios?"
      },
      "at": {
        "en": [
          42,
          4,
          17
        ],
        "es": [
          42,
          4,
          17
        ]
      },
      "ref": {
        "en": "Luke 4:17",
        "es": "Lucas 4:17"
      },
      "verse": {
        "en": "And there was delivered unto him the book of the prophet Esaias. And when he had opened the book, he found the place where it was written,",
        "es": "Y fuéle dado el libro del profeta Isaías; y como abrió el libro, halló el lugar donde estaba escrito:"
      }
    },
    {
      "id": "shofar",
      "sound": "shofar",
      "locked": true,
      "name": {
        "en": "Praise Shofar",
        "es": "El shofar de alabanza"
      },
      "lesson": {
        "en": "God’s people blew the ram’s horn to call everyone together and to praise God. We can praise Him with music and with our voices too!",
        "es": "El pueblo de Dios tocaba el cuerno de carnero para reunir a todos y alabar a Dios. ¡Nosotros también podemos alabarle con música y con nuestra voz!"
      },
      "quiz": {
        "en": "“Praise him with the sound of the trumpet.” Which squishy is a horn?",
        "es": "«Alabadle á son de bocina». ¿Cuál squishy es un cuerno?"
      },
      "at": {
        "en": [
          19,
          150,
          3
        ],
        "es": [
          19,
          150,
          3
        ]
      },
      "ref": {
        "en": "Psalms 150:3",
        "es": "Salmos 150:3"
      },
      "verse": {
        "en": "Praise him with the sound of the trumpet: Praise him with the psaltery and harp.",
        "es": "Alabadle á son de bocina: alabadle con salterio y arpa."
      }
    },
    {
      "id": "tablets",
      "sound": "tablets",
      "locked": true,
      "name": {
        "en": "Tablets of Stone",
        "es": "Las tablas de piedra"
      },
      "lesson": {
        "en": "On Mount Sinai, God gave Moses two tablets of stone with His commandments. God’s law shows us how to love Him and love each other.",
        "es": "En el monte Sinaí, Dios le dio a Moisés dos tablas de piedra con sus mandamientos. La ley de Dios nos enseña a amarle a él y a amarnos unos a otros."
      },
      "quiz": {
        "en": "God wrote on them with His finger on Mount Sinai. Which squishy are they?",
        "es": "Dios escribió en ellas con su dedo en el monte Sinaí. ¿Cuál squishy son?"
      },
      "at": {
        "en": [
          2,
          31,
          18
        ],
        "es": [
          2,
          31,
          18
        ]
      },
      "ref": {
        "en": "Exodus 31:18",
        "es": "Éxodo 31:18"
      },
      "verse": {
        "en": "And he gave unto Moses, when he had made an end of communing with him upon mount Sinai, two tables of testimony, tables of stone, written with the finger of God.",
        "es": "Y dió á Moisés, como acabó de hablar con él en el monte de Sinaí, dos tablas del testimonio, tablas de piedra escritas con el dedo de Dios."
      }
    },
    {
      "id": "elephant",
      "sound": "elephant",
      "locked": true,
      "name": {
        "en": "Ark Elephant",
        "es": "El elefante del arca"
      },
      "lesson": {
        "en": "Big animals and little animals went into the ark two by two, just as God said. Noah obeyed, and God kept every one of them safe.",
        "es": "Animales grandes y pequeños entraron al arca de dos en dos, como Dios dijo. Noé obedeció, y Dios cuidó a cada uno de ellos."
      },
      "quiz": {
        "en": "Animals went into the ark two by two. Which squishy is a big one?",
        "es": "Los animales entraron al arca de dos en dos. ¿Cuál squishy es uno grande?"
      },
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
      "ref": {
        "en": "Genesis 7:9",
        "es": "Génesis 7:9"
      },
      "verse": {
        "en": "there went in two and two unto Noah into the ark, the male and the female, as God had commanded Noah.",
        "es": "De dos en dos entraron á Noé en el arca: macho y hembra, como mandó Dios á Noé."
      }
    },
    {
      "id": "honeycomb",
      "sound": "honey",
      "locked": true,
      "name": {
        "en": "Sweet Honeycomb",
        "es": "El panal dulce"
      },
      "lesson": {
        "en": "The psalm says God’s words are sweeter than honey. When we learn a verse by heart, we keep something sweet with us all day.",
        "es": "El salmo dice que las palabras de Dios son más dulces que la miel. Cuando aprendemos un versículo de memoria, llevamos algo dulce con nosotros todo el día."
      },
      "quiz": {
        "en": "God’s words are sweeter than this. Which squishy is it?",
        "es": "Las palabras de Dios son más dulces que esto. ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          19,
          119,
          103
        ],
        "es": [
          19,
          119,
          103
        ]
      },
      "ref": {
        "en": "Psalms 119:103",
        "es": "Salmos 119:103"
      },
      "verse": {
        "en": "How sweet are thy words unto my taste! Yea, sweeter than honey to my mouth!",
        "es": "¡Cuán dulces son á mi paladar tus palabras! más que la miel á mi boca."
      }
    },
    {
      "id": "anchor",
      "sound": "anchor",
      "locked": true,
      "name": {
        "en": "Anchor of Hope",
        "es": "El ancla de la esperanza"
      },
      "lesson": {
        "en": "An anchor holds a ship steady in a storm. Our hope in God is like an anchor for our soul: sure and steady, even when life feels stormy.",
        "es": "Un ancla mantiene firme al barco en la tormenta. Nuestra esperanza en Dios es como un ancla para el alma: segura y firme, aun cuando la vida parece una tormenta."
      },
      "quiz": {
        "en": "Our hope is an anchor of the soul. Which squishy is it?",
        "es": "Nuestra esperanza es el ancla del alma. ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          58,
          6,
          19
        ],
        "es": [
          58,
          6,
          19
        ]
      },
      "ref": {
        "en": "Hebrews 6:19",
        "es": "Hebreos 6:19"
      },
      "verse": {
        "en": "which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil;",
        "es": "La cual tenemos como segura y firme ancla del alma, y que entra hasta dentro del velo;"
      }
    },
    {
      "id": "shield",
      "sound": "shield",
      "locked": true,
      "name": {
        "en": "Shield of Faith",
        "es": "El escudo de la fe"
      },
      "lesson": {
        "en": "David knew that God was his strength and his shield. When we are scared, we can trust God to protect us and help us be brave.",
        "es": "David sabía que Dios era su fortaleza y su escudo. Cuando tenemos miedo, podemos confiar en que Dios nos protege y nos ayuda a ser valientes."
      },
      "quiz": {
        "en": "“The LORD is my strength and my ___.” Which squishy is it?",
        "es": "«Jehová es mi fortaleza y mi ___». ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          19,
          28,
          7
        ],
        "es": [
          19,
          28,
          7
        ]
      },
      "ref": {
        "en": "Psalms 28:7",
        "es": "Salmos 28:7"
      },
      "verse": {
        "en": "The LORD is my strength and my shield; my heart trusted in him, and I am helped: Therefore my heart greatly rejoiceth; and with my song will I praise him.",
        "es": "Jehová es mi fortaleza y mi escudo: en él esperó mi corazón, y fuí ayudado; por lo que se gozó mi corazón, y con mi canción le alabaré."
      }
    },
    {
      "id": "chariot",
      "sound": "chariot",
      "locked": true,
      "name": {
        "en": "Chariot of Fire",
        "es": "El carro de fuego"
      },
      "lesson": {
        "en": "Elijah walked with God all his life. At the end, a chariot of fire came and Elijah went up to heaven in a whirlwind. God is with His faithful friends always.",
        "es": "Elías anduvo con Dios toda su vida. Al final, vino un carro de fuego y Elías subió al cielo en un torbellino. Dios está siempre con sus amigos fieles."
      },
      "quiz": {
        "en": "Elijah went up to heaven when this appeared. Which squishy is it?",
        "es": "Elías subió al cielo cuando apareció esto. ¿Cuál squishy es?"
      },
      "at": {
        "en": [
          12,
          2,
          11
        ],
        "es": [
          12,
          2,
          11
        ]
      },
      "ref": {
        "en": "2 Kings 2:11",
        "es": "2 Reyes 2:11"
      },
      "verse": {
        "en": "And it came to pass, as they still went on, and talked, that, behold, there appeared a chariot of fire, and horses of fire, and parted them both asunder; and Elijah went up by a whirlwind into heaven.",
        "es": "Y aconteció que, yendo ellos hablando, he aquí, un carro de fuego con caballos de fuego apartó á los dos: y Elías subió al cielo en un torbellino."
      }
    },
    {
      "id": "lamp",
      "sound": "crunch",
      "locked": true,
      "glow": true,
      "final": true,
      "name": {
        "en": "Light of the World Lamp",
        "es": "Lámpara de la luz"
      },
      "lesson": {
        "en": "Jesus said, “I am the light of the world.” When you follow Jesus, you do not have to walk in the dark, because His light shows you the way. And His love can shine through you too!",
        "es": "Jesús dijo: «Yo soy la luz del mundo». Cuando sigues a Jesús, no tienes que andar en oscuridad, porque su luz te muestra el camino. ¡Y su amor también puede brillar en ti!"
      },
      "quiz": {
        "en": "Jesus said, “I am the light of the world.” Which squishy is glowing with light?",
        "es": "Jesús dijo: «Yo soy la luz del mundo». ¿Cuál squishy brilla con luz?"
      },
      "at": {
        "en": [
          43,
          8,
          12
        ],
        "es": [
          43,
          8,
          12
        ]
      },
      "ref": {
        "en": "John 8:12",
        "es": "Juan 8:12"
      },
      "verse": {
        "en": "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.",
        "es": "Y hablóles Jesús otra vez, diciendo: Yo soy la luz del mundo: el que me sigue, no andará en tinieblas, mas tendrá la lumbre de la vida."
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
          5,
          10,
          4
        ],
        "es": [
          5,
          10,
          4
        ]
      },
      "ref": {
        "en": "Deuteronomy 10:4",
        "es": "Deuteronomio 10:4"
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
