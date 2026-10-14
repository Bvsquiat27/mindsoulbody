/* Short Bible stories for a child nearby. Original retellings.
   Illustrations are original art in img/stories/. See img/stories/README.md. */
(() => {
  'use strict';
  const stories = [
    {
      id: 'creation',
      title: 'God makes the world',
      titleEs: 'Dios hace el mundo',
      alt: 'A bright new world of light, water, and trees',
      altEs: 'Un mundo nuevo, con luz, agua y árboles',
      body: 'In the beginning there was no sun, no trees, and no people. God spoke, and light came. He made the sky and the sea, the land and the flowers, the fish and the birds and every animal. Then God made a man and a woman, and He blessed them. God looked at everything He had made, and it was very good. When the day was done, God rested. The world is a gift. We can say thank you.',
      bodyEs: 'Al principio no había sol, ni árboles, ni personas. Dios dijo: “Sea la luz”, y fue la luz. Hizo el cielo y el mar, la tierra y las flores, los peces, las aves y todos los animales. Después Dios hizo a un hombre y a una mujer, y los bendijo. Dios miró todo lo que había hecho, y era muy bueno. Cuando el día terminó, Dios descansó. El mundo es un regalo. Podemos darle gracias.'
    },
    {
      id: 'noah',
      title: 'Noah and the big boat',
      titleEs: 'Noé y el arca',
      alt: 'A wooden boat floating under a rainbow',
      altEs: 'Un barco de madera flotando bajo un arcoíris',
      body: 'God asked Noah to build a big boat. Noah obeyed, even when other people laughed. Two of each kind of animal came in, and Noah’s family came in too. Then the rain fell for a long, long time. The boat floated, and God kept them safe. When the water went down, Noah sent out a dove. The dove came back with a leaf. God put a rainbow in the sky. It was His promise to care for the earth.',
      bodyEs: 'Dios le pidió a Noé que construyera un arca muy grande. Noé obedeció, aunque otras personas se burlaban de él. Entraron dos animales de cada clase, y también la familia de Noé. Luego llovió por mucho, mucho tiempo. El arca flotó, y Dios los cuidó. Cuando el agua bajó, Noé soltó una paloma. La paloma volvió con una hoja. Dios puso un arcoíris en el cielo. Era su promesa de cuidar la tierra.'
    },
    {
      id: 'stars',
      title: 'Abraham and the stars',
      titleEs: 'Abraham y las estrellas',
      alt: 'A night sky full of stars',
      altEs: 'Un cielo de noche lleno de estrellas',
      body: 'Abraham and Sarah were old, and they had no child. God told Abraham to look up at the night sky. “Count the stars, if you can,” God said. “Your family will be like that.” Abraham could not count them all. He trusted God anyway. Later, God gave them a baby boy named Isaac. God keeps promises, even when we have to wait.',
      bodyEs: 'Abraham y Sara ya eran mayores, y no tenían hijos. Dios le dijo a Abraham que mirara el cielo de noche. “Cuenta las estrellas, si puedes”, dijo Dios. “Tu familia va a ser así.” Abraham no podía contarlas todas. Aun así, confió en Dios. Después, Dios les dio un niño llamado Isaac. Dios cumple sus promesas, aunque tengamos que esperar.'
    },
    {
      id: 'ladder',
      title: "Jacob's dream",
      titleEs: "El sueño de Jacob",
      alt: "A boy asleep under the stars with a shining stairway to heaven",
      altEs: "Un joven dormido bajo las estrellas con una escalera brillante hacia el cielo",
      body: "Jacob had to leave home and walk a long way. When night came, he lay down on the ground and used a stone for a pillow. He was all alone. Then he dreamed. He saw a stairway that reached all the way up to heaven, and God’s angels were going up and down on it. God spoke to him: “I am with you. I will keep you safe wherever you go. I will not leave you.” Jacob woke up and said, “God is in this place, and I did not know it.” Even when we feel alone, God is near.",
      bodyEs: "Jacob tuvo que irse de su casa y caminar muy lejos. Cuando llegó la noche, se acostó en el suelo y usó una piedra como almohada. Estaba solo. Entonces soñó. Vio una escalera que llegaba hasta el cielo, y los ángeles de Dios subían y bajaban por ella. Dios le habló: “Yo estoy contigo. Te voy a cuidar por dondequiera que vayas. No te voy a dejar.” Jacob despertó y dijo: “Dios está en este lugar, y yo no lo sabía.” Aunque te sientas solo, Dios está cerca de ti."
    },
    {
      id: 'joseph',
      title: 'Joseph and his brothers',
      titleEs: 'José y sus hermanos',
      alt: 'A young man in a colorful coat',
      altEs: 'Un joven con un manto de colores',
      body: 'Joseph’s father gave him a special coat. His brothers were jealous. They sent Joseph far away. Joseph was sad, and he had to work in a strange land. God stayed with him. Years later, Joseph helped a king save food for a hungry time. His brothers came looking for food. Joseph could have been angry. Instead he cried and hugged them. “You meant to hurt me,” he said, “but God used it for good.”',
      bodyEs: 'El papá de José le dio un manto especial. Sus hermanos tuvieron celos. Enviaron a José muy lejos. José estaba triste, y tuvo que trabajar en una tierra extraña. Dios se quedó con él. Años después, José ayudó a un rey a guardar comida para un tiempo de hambre. Sus hermanos vinieron a buscar comida. José pudo haberse enojado. En vez de eso, lloró y los abrazó. “Ustedes quisieron hacerme daño”, dijo, “pero Dios lo usó para bien.”'
    },
    {
      id: 'moses',
      title: 'Baby Moses',
      titleEs: 'El bebé Moisés',
      alt: 'A baby resting in a basket among the river reeds',
      altEs: 'Un bebé descansando en una canasta entre las plantas del río',
      body: 'A cruel king was afraid of the baby boys. Moses’ mother hid her baby as long as she could. Then she made a little basket and set it in the river grass. His sister Miriam watched nearby. A princess found the basket and loved the baby. Miriam was brave. She said, “I know someone who can help you care for him.” So Moses’ own mother got to hold him again. God sees the small ones. He had a plan for that baby.',
      bodyEs: 'Un rey cruel tenía miedo de los bebés varones. La mamá de Moisés escondió a su bebé todo lo que pudo. Después hizo una canasta y la puso entre las plantas del río. Su hermana miraba desde cerca. Una princesa encontró la canasta y se encariñó con el bebé. Miriam fue valiente. Dijo: “Yo conozco a alguien que puede ayudarte a cuidarlo.” Así la mamá de Moisés pudo cargarlo otra vez. Dios ve a los pequeños. Tenía un plan para ese bebé.'
    },
    {
      id: 'redsea',
      title: "A path through the sea",
      titleEs: "Un camino en el mar",
      alt: "Families walking on a dry path between tall walls of water",
      altEs: "Familias caminando por un camino seco entre altas paredes de agua",
      body: "God’s people had left Egypt at last. But then they came to the edge of a big sea, and the king’s chariots were coming behind them. The people were scared. Moses said, “Do not be afraid. The Lord will fight for you. You only need to be still.” Moses held out his hand over the sea. All night a strong wind blew, and the water opened up like two tall walls. The people walked across on dry ground, mothers and fathers, children and grandparents, sheep and goats. God made a way where there was no way.",
      bodyEs: "Por fin, el pueblo de Dios había salido de Egipto. Pero llegaron a la orilla de un mar muy grande, y los carros del rey venían detrás. La gente tenía miedo. Moisés dijo: “No tengan miedo. El Señor va a pelear por ustedes. Solo quédense tranquilos.” Moisés extendió la mano sobre el mar. Toda la noche sopló un viento fuerte, y el agua se abrió como dos paredes altas. El pueblo cruzó por tierra seca: mamás y papás, niños y abuelos, ovejas y cabras. Dios abrió un camino donde no había camino."
    },
    {
      id: 'samuel',
      title: "Samuel hears God",
      titleEs: "Samuel escucha a Dios",
      alt: "A boy sitting up on his mat at night beside a small lamp",
      altEs: "Un niño sentado en su cama de noche junto a una lamparita",
      body: "Samuel was a boy who helped the old priest Eli in God’s house. One night, while the little lamp was still burning, Samuel heard a voice: “Samuel!” He ran to Eli. “Here I am.” “I did not call you,” said Eli. “Go back to bed.” It happened again, and again. Then Eli understood. “It is God who is calling you. Say, ‘Speak, Lord, for your servant is listening.’” The voice came once more: “Samuel, Samuel!” And Samuel said, “Speak, for I am listening.” God loves to talk with children, and you can listen too.",
      bodyEs: "Samuel era un niño que ayudaba al viejo sacerdote Elí en la casa de Dios. Una noche, cuando la lamparita todavía estaba encendida, Samuel oyó una voz: “¡Samuel!” Corrió a donde estaba Elí. “Aquí estoy.” “Yo no te llamé”, dijo Elí. “Vuelve a acostarte.” Pasó otra vez, y otra vez. Entonces Elí entendió. “Es Dios quien te llama. Dile: ‘Habla, Señor, que tu siervo escucha.’” La voz vino una vez más: “¡Samuel, Samuel!” Y Samuel dijo: “Habla, que estoy escuchando.” A Dios le gusta hablar con los niños, y tú también puedes escuchar."
    },
    {
      id: 'david',
      title: 'David and Goliath',
      titleEs: 'David y Goliat',
      alt: 'A young shepherd facing a giant',
      altEs: 'Un pastor joven frente a un gigante',
      body: 'Goliath was a giant soldier. He shouted at God’s people every day. The grown men were afraid. David was young. He took care of sheep. He told the king, “God helped me when a lion came. God will help me now.” David did not wear heavy armor. He picked up five smooth stones. He ran toward the giant and trusted God. One stone was enough. The people learned that God is stronger than any bully.',
      bodyEs: 'Goliat era un soldado gigante. Todos los días le gritaba al pueblo de Dios. Los soldados de Israel tenían miedo. David era joven. Cuidaba ovejas. Le dijo al rey: “Dios me ayudó cuando vino un león. Dios me va a ayudar ahora.” David no se puso una armadura pesada. Recogió cinco piedras lisas. Corrió hacia el gigante y confió en Dios. Una piedra fue suficiente. El pueblo aprendió que Dios es más fuerte que cualquier bravucón.'
    },
    {
      id: 'daniel',
      title: 'Daniel and the lions',
      titleEs: 'Daniel y los leones',
      alt: 'A man standing safely among lions',
      altEs: 'Un hombre a salvo entre los leones',
      body: 'Daniel loved God and prayed every day. Some men were jealous. They tricked the king into making a bad rule: nobody could pray except to the king. Daniel prayed anyway, with his window open. The king was sad, but he had to put Daniel in a den of lions. That night the king could not sleep. In the morning he ran to the den. Daniel was safe. God had sent an angel to shut the lions’ mouths. Daniel said, “My God sent his angel.”',
      bodyEs: 'Daniel amaba a Dios y oraba todos los días. Unos hombres tuvieron celos. Engañaron al rey para que hiciera una ley mala: nadie podía orar a nadie más que al rey. Daniel oró de todos modos, con la ventana abierta. El rey se puso triste, pero tuvo que meter a Daniel en un foso de leones. Esa noche el rey no pudo dormir. Muy de mañana corrió al foso. Daniel estaba sano y salvo. Dios había enviado un ángel para cerrar la boca de los leones. Daniel dijo: “Mi Dios envió a su ángel.”'
    },
    {
      id: 'jonah',
      title: 'Jonah and the big fish',
      titleEs: 'Jonás y el pez grande',
      alt: 'A big fish and a man at the shore',
      altEs: 'Un pez grande y un hombre en la orilla',
      body: 'God told Jonah to go to a city and tell the people to turn around. Jonah did not want to go. He got on a boat going the other way. A storm came. Jonah told the sailors the storm was because of him. They put him in the water, and a big fish swallowed him. Inside the fish, Jonah prayed. God heard him. The fish spit Jonah onto the land. Then Jonah went to the city. The people were sorry, and God was kind. God is kind to people who run, and He is kind when they come back.',
      bodyEs: 'Dios le dijo a Jonás que fuera a una ciudad y les dijera a las personas que se arrepintieran y se volvieran a Dios. Jonás no quería ir. Se subió a un barco que iba para el otro lado. Vino una tormenta. Jonás les dijo a los marineros que la tormenta era por él. Lo echaron al agua, y un pez grande se lo tragó. Adentro del pez, Jonás oró. Dios lo escuchó. El pez escupió a Jonás en la tierra. Entonces Jonás fue a la ciudad. La gente se arrepintió, y Dios fue bueno. Dios es bueno con quien huye, y es bueno cuando vuelve.'
    },
    {
      id: 'nativity',
      title: 'Jesus is born',
      titleEs: 'Jesús nace',
      alt: 'Mary, Joseph, and the baby Jesus',
      altEs: 'María, José y el niño Jesús',
      body: 'Mary and Joseph traveled to Bethlehem. The inn was full, so they stayed where the animals were. That night Mary had a baby. She wrapped Him in cloth and laid Him in a manger. Angels told shepherds in the fields, “A Savior is born.” The shepherds hurried and found the baby, just as the angel said. They went home praising God. Jesus is God come close, small enough to be held.',
      bodyEs: 'María y José viajaron a Belén. El mesón estaba lleno, así que se quedaron donde estaban los animales. Esa noche María tuvo un bebé. Lo envolvió en pañales y lo acostó en un pesebre. Los ángeles les dijeron a unos pastores en el campo: “Ha nacido un Salvador.” Los pastores fueron de prisa y encontraron al bebé, tal como dijo el ángel. Volvieron a casa alabando a Dios. Jesús es Dios que se acerca, tan pequeñito que se podía cargar en brazos.'
    },
    {
      id: 'storm',
      title: 'Jesus calms the storm',
      titleEs: 'Jesús calma la tormenta',
      alt: 'A boat on a stormy sea',
      altEs: 'Un barco en un mar de tormenta',
      body: 'Jesus and His friends were in a boat. Jesus was asleep. A storm came up fast. Waves splashed in. The friends were scared. They woke Jesus and said, “Teacher, do you not care that we are sinking?” Jesus stood up. He spoke to the wind and the sea: “Peace. Be still.” The wind stopped. The water was quiet. His friends were amazed. When you are afraid, you can call on Jesus. He hears you.',
      bodyEs: 'Jesús y sus amigos iban en un barco. Jesús estaba dormido. Una tormenta llegó de pronto. Las olas entraban. Los amigos tuvieron miedo. Despertaron a Jesús y le dijeron: “Maestro, ¿no te importa que nos estemos hundiendo?” Jesús se levantó. Le habló al viento y al mar: “¡Calla, enmudece!” El viento paró. El agua se quedó quieta. Sus amigos quedaron asombrados. Cuando tengas miedo, puedes llamar a Jesús. Él te escucha.'
    },
    {
      id: 'children',
      title: 'Jesus and the children',
      titleEs: 'Jesús y los niños',
      alt: 'Jesus with children close beside him',
      altEs: 'Jesús con niños bien cerca de él',
      body: 'People brought their children to Jesus. They wanted Him to bless them. Some of the grown-ups said, “Do not bother the Teacher.” Jesus did not like that. He said, “Let the children come to me. Do not stop them. The kingdom of God belongs to people who trust like this.” Then Jesus took the children in His arms and blessed them. You are not too small for Jesus. He wants you near.',
      bodyEs: 'La gente llevaba a sus niños a Jesús. Querían que los bendijera. Algunos adultos dijeron: “No molesten al Maestro.” A Jesús no le gustó eso. Dijo: “Dejen que los niños vengan a mí. No se lo impidan. El reino de Dios es de quienes confían así.” Entonces Jesús tomó a los niños en sus brazos y los bendijo. Tú no eres demasiado pequeño para Jesús. Él te quiere cerca.'
    },
    {
      id: 'feeding',
      title: 'Five loaves and two fish',
      titleEs: 'Cinco panes y dos pescados',
      alt: 'Bread and fish shared with a hungry crowd',
      altEs: 'Pan y pescado compartidos con una multitud hambrienta',
      body: 'A huge crowd stayed with Jesus all day. They were hungry, and the place was far from town. A boy had five small loaves and two fish. It did not look like enough. He shared it anyway. Jesus thanked God and broke the bread. The friends passed it out. Everyone ate until they were full, and there were baskets of leftovers. A small lunch, given to Jesus, became a feast. Sharing is never too small for God.',
      bodyEs: 'Una multitud enorme se quedó con Jesús todo el día. Tenían hambre, y el lugar estaba lejos del pueblo. Un niño tenía cinco panes pequeños y dos pescados. No parecía suficiente. Aun así, los compartió. Jesús dio gracias a Dios y partió el pan. Los amigos lo repartieron. Todos comieron hasta quedar llenos, y sobraron canastas. Un almuerzo pequeño, puesto en las manos de Jesús, se volvió un banquete. Para Dios, nada de lo que compartes es demasiado poco.'
    },
    {
      id: 'sheep',
      title: 'The lost sheep',
      titleEs: 'La oveja perdida',
      alt: 'A shepherd carrying a lost sheep home',
      altEs: 'Un pastor que carga a casa una oveja perdida',
      body: 'Jesus told a story. A shepherd had one hundred sheep. One wandered off. The shepherd did not say, “Oh well, I still have ninety-nine.” He went out to look. He looked until he found the one. Then he was so happy that he carried it home and called his friends to celebrate. Jesus said heaven is happy like that when one person comes back. If you ever feel lost, God is already looking for you.',
      bodyEs: 'Jesús contó una historia. Un pastor tenía cien ovejas. Una se alejó. El pastor no dijo: “Bueno, todavía tengo noventa y nueve.” Salió a buscarla. Buscó hasta encontrarla. Luego estaba tan feliz que la puso sobre sus hombros y la llevó a casa y llamó a sus amigos para celebrar. Jesús dijo que el cielo se alegra así cuando una persona regresa. Si alguna vez te sientes perdido, Dios ya te está buscando.'
    },
    {
      id: 'easter',
      title: 'Easter morning',
      titleEs: 'La mañana de la Resurrección',
      alt: 'An empty tomb in the light of morning',
      altEs: 'Un sepulcro vacío a la luz de la mañana',
      body: 'Jesus died on a cross because He loves us. His friends were very sad. They laid His body in a tomb and rolled a stone in front. Early on Sunday, women who loved Him went to the tomb. The stone was rolled away. The tomb was empty. An angel said, “He is not here. He is risen.” Jesus is alive. Death did not win. That is why we can sing on Easter morning: Jesus is alive, and He is with us.',
      bodyEs: 'Jesús murió en una cruz porque nos ama. Sus amigos estaban muy tristes. Pusieron su cuerpo en un sepulcro y pusieron una gran piedra en la entrada. Muy temprano el domingo, unas mujeres que lo amaban fueron al sepulcro. La piedra ya no estaba en su lugar. El sepulcro estaba vacío. Un ángel dijo: “No está aquí. Ha resucitado.” Jesús está vivo. La muerte no ganó. Por eso podemos cantar en la mañana de la Resurrección: Jesús está vivo, y está con nosotros.'
    }
  ];
  /* One verse per story, word for word from bible/NN.json (KJV) and
     bible/rvr/NN.json (Reina-Valera 1909). A test checks them. */
  const VERSES = {
  "creation": {
  "ref": [
  1,
  1,
  31
  ],
  "en": "And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day.",
  "es": "Y vió Dios todo lo que había hecho, y he aquí que era bueno en gran manera. Y fué la tarde y la mañana el día sexto.",
  "refEn": "Genesis 1:31",
  "refEs": "Génesis 1:31"
  },
  "noah": {
  "ref": [
  1,
  9,
  13
  ],
  "en": "I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.",
  "es": "Mi arco pondré en las nubes, el cual será por señal de convenio entre mí y la tierra.",
  "refEn": "Genesis 9:13",
  "refEs": "Génesis 9:13"
  },
  "stars": {
  "ref": [
  1,
  15,
  5
  ],
  "en": "And he brought him forth abroad, and said, Look now toward heaven, and tell the stars, if thou be able to number them: and he said unto him, So shall thy seed be.",
  "es": "Y sacóle fuera, y dijo: Mira ahora á los cielos, y cuenta las estrellas, si las puedes contar. Y le dijo: Así será tu simiente.",
  "refEn": "Genesis 15:5",
  "refEs": "Génesis 15:5"
  },
  "joseph": {
  "ref": [
  1,
  50,
  20
  ],
  "en": "But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive.",
  "es": "Vosotros pensasteis mal sobre mí, mas Dios lo encaminó á bien, para hacer lo que vemos hoy, para mantener en vida á mucho pueblo.",
  "refEn": "Genesis 50:20",
  "refEs": "Génesis 50:20"
  },
  "ladder": {
  "ref": [
  1,
  28,
  15
  ],
  "en": "And, behold, I am with thee, and will keep thee in all places whither thou goest, and will bring thee again into this land; for I will not leave thee, until I have done that which I have spoken to thee of.",
  "es": "Y he aquí, yo soy contigo, y te guardaré por donde quiera que fueres, y te volveré á esta tierra; porque no te dejaré hasta tanto que haya hecho lo que te he dicho.",
  "refEn": "Genesis 28:15",
  "refEs": "Génesis 28:15"
  },
  "moses": {
  "ref": [
  2,
  2,
  10
  ],
  "en": "And the child grew, and she brought him unto Pharaoh's daughter, and he became her son. And she called his name Moses: and she said, Because I drew him out of the water.",
  "es": "Y como creció el niño, ella lo trajo á la hija de Faraón, la cual lo prohijó, y púsole por nombre Moisés, diciendo: Porque de las aguas lo saqué.",
  "refEn": "Exodus 2:10",
  "refEs": "Éxodo 2:10"
  },
  "redsea": {
  "ref": [
  2,
  14,
  14
  ],
  "en": "The LORD shall fight for you, and ye shall hold your peace.",
  "es": "Jehová peleará por vosotros, y vosotros estaréis quedos.",
  "refEn": "Exodus 14:14",
  "refEs": "Éxodo 14:14"
  },
  "samuel": {
  "ref": [
  9,
  3,
  10
  ],
  "en": "And the LORD came, and stood, and called as at other times, Samuel, Samuel. Then Samuel answered, Speak; for thy servant heareth.",
  "es": "Y vino Jehová, y paróse, y llamó como las otras veces: ¡Samuel, Samuel! Entonces Samuel dijo: Habla, que tu siervo oye.",
  "refEn": "1 Samuel 3:10",
  "refEs": "1 Samuel 3:10"
  },
  "david": {
  "ref": [
  9,
  17,
  37
  ],
  "en": "David said moreover, The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine. And Saul said unto David, Go, and the LORD be with thee.",
  "es": "Y añadió David: Jehová que me ha librado de las garras del león y de las garras del oso, él también me librará de la mano de este Filisteo. Y dijo Saúl á David: Ve, y Jehová sea contigo.",
  "refEn": "1 Samuel 17:37",
  "refEs": "1 Samuel 17:37"
  },
  "daniel": {
  "ref": [
  27,
  6,
  22
  ],
  "en": "My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt.",
  "es": "El Dios mío envió su ángel, el cual cerró la boca de los leones, para que no me hiciesen mal: porque delante de él se halló en mí justicia: y aun delante de ti, oh rey, yo no he hecho lo que no debiese.",
  "refEn": "Daniel 6:22",
  "refEs": "Daniel 6:22"
  },
  "jonah": {
  "ref": [
  32,
  3,
  10
  ],
  "en": "And God saw their works, that they turned from their evil way; and God repented of the evil, that he had said that he would do unto them; and he did it not.",
  "es": "Y vió Dios lo que hicieron, que se convirtieron de su mal camino: y arrepintióse del mal que había dicho les había de hacer, y no lo hizo.",
  "refEn": "Jonah 3:10",
  "refEs": "Jonás 3:10"
  },
  "nativity": {
  "ref": [
  42,
  2,
  11
  ],
  "en": "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.",
  "es": "Que os ha nacido hoy, en la ciudad de David, un Salvador, que es CRISTO el Señor.",
  "refEn": "Luke 2:11",
  "refEs": "Lucas 2:11"
  },
  "storm": {
  "ref": [
  41,
  4,
  39
  ],
  "en": "And he arose, and rebuked the wind, and said unto the sea, Peace, be still. And the wind ceased, and there was a great calm.",
  "es": "Y levantándose, increpó al viento, y dijo á la mar: Calla, enmudece. Y cesó el viento, y fué hecha grande bonanza.",
  "refEn": "Mark 4:39",
  "refEs": "Marcos 4:39"
  },
  "children": {
  "ref": [
  41,
  10,
  14
  ],
  "en": "But when Jesus saw it, he was much displeased, and said unto them, Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God.",
  "es": "Y viéndolo Jesús, se enojó, y les dijo: Dejad los niños venir, y no se lo estorbéis; porque de los tales es el reino de Dios.",
  "refEn": "Mark 10:14",
  "refEs": "Marcos 10:14"
  },
  "feeding": {
  "ref": [
  43,
  6,
  35
  ],
  "en": "And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.",
  "es": "Y Jesús les dijo: Yo soy el pan de vida: el que á mí viene, nunca tendrá hambre; y el que en mí cree, no tendrá sed jamás.",
  "refEn": "John 6:35",
  "refEs": "Juan 6:35"
  },
  "sheep": {
  "ref": [
  42,
  15,
  6
  ],
  "en": "And when he cometh home, he calleth together his friends and neighbours, saying unto them, Rejoice with me; for I have found my sheep which was lost.",
  "es": "Y viniendo á casa, junta á los amigos y á los vecinos, diciéndoles: Dadme el parabién, porque he hallado mi oveja que se había perdido.",
  "refEn": "Luke 15:6",
  "refEs": "Lucas 15:6"
  },
  "easter": {
  "ref": [
  40,
  28,
  6
  ],
  "en": "He is not here: for he is risen, as he said. Come, see the place where the Lord lay.",
  "es": "No está aquí; porque ha resucitado, como dijo. Venid, ved el lugar donde fué puesto el Señor.",
  "refEn": "Matthew 28:6",
  "refEs": "Mateo 28:6"
  }
  };

  let openId = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function es() { return window.MsbI18n && MsbI18n.lang() === 'es'; }
  function pick(item, field) { return es() ? item[field + 'Es'] : item[field]; }

  function picture(item, size) {
    const full = `img/stories/${item.id}.webp`;
    const card = `img/stories/${item.id}-512.webp`;
    const alt = esc(pick(item, 'alt'));
    const src = size === 'card' ? card : full;
    return `<img class="${size === 'card' ? 'story-cover' : 'story-hero'}" src="${src}" srcset="${card} 512w, ${full} 1024w" sizes="${size === 'card' ? '(min-width: 720px) 46vw, 100vw' : '100vw'}" width="1024" height="576" alt="${alt}" loading="lazy" decoding="async">`;
  }

  const prayer = {
    en: 'God, you are near. Thank you for this day. Thank you for the people who love me. Hold me while I sleep. Keep me safe. Give me a quiet heart. Amen.',
    es: 'Dios, tú estás cerca. Gracias por este día. Gracias por las personas que me quieren. Abrázame mientras duermo. Cuídame. Dame un corazón tranquilo. Amén.'
  };
  let bedtime = null;
  let music = null;
  let coloringId = null;
  let coloringDrawing = null;
  let squishyOn = false;
  let matchOn = false;
  let kidGamesOn = false;
  const coloring = () => window.MsbColoring;
  const storyTitle = id => { const item = stories.find(entry => entry.id === id); return item ? pick(item, 'title') : id; };

  function speechRow() {
    const rates = window.MsbSpeech ? MsbSpeech.rateHtml() : '';
    return `<div class="story-actions"><button class="primary" type="button" data-story-speak>Read aloud</button><button class="secondary" type="button" data-speech-pause>Pause</button><button class="secondary" type="button" data-speech-stop>Stop</button>${rates}</div>`;
  }

  function showList(root) {
    const cards = stories.map(item => `<button class="card story-card" data-story="${esc(item.id)}">${picture(item, 'card')}<h2>${esc(pick(item, 'title'))}</h2><span>Open</span></button>`).join('');
    root.innerHTML = `<span class="eyebrow">LITTLE ONES</span><h1>Stories for little ones</h1><p class="lead">Bible stories told simply, for a child close by.</p><button class="card bedtime-entry" type="button" data-bedtime><span class="eyebrow">LITTLE ONES</span><strong>Bedtime</strong><span>A story, a prayer, and a quiet night sky</span></button>${window.MsbKidGames ? '<button class="card squishy-entry kg-entry" type="button" data-kg-enter data-i18n-skip><span class="kg-entry-art" aria-hidden="true">🔎🖼️💬</span><span><span class="eyebrow">' + (es() ? 'JUEGOS' : 'GAMES') + '</span><strong>' + (es() ? 'Juegos bíblicos' : 'Bible games') + '</strong><span>' + (es() ? 'Squishies de la Biblia, Combina el maná, sopa de letras y más' : 'Bible squishies, Manna Match, word search and more') + '</span></span></button>' : ''}<div class="story-grid">${cards}</div>${coloring() ? coloring().gridHtml(storyTitle) : ''}`;
  }

  function verseHtml(item) {
    const v = VERSES[item.id]; if (!v) return '';
    return `<blockquote class="story-verse"><p>“${esc(es() ? v.es : v.en)}”</p><cite>${esc(es() ? v.refEs : v.refEn)} · ${es() ? 'RV 1909' : 'KJV'}</cite></blockquote>`;
  }
  function showOne(root, item) {
    const title = pick(item, 'title');
    const body = pick(item, 'body');
    root.innerHTML = `<button class="text-button back" data-story-back type="button">← Back</button><article class="story-read" data-read-block data-i18n-skip><span class="eyebrow">${es()?'Una historia para leer juntos':'A story to read together'}</span>${picture(item, 'hero')}<h1 class="story-title">${esc(title)}</h1><p class="story-body">${esc(body)}</p>${verseHtml(item)}</article>${speechRow()}<p><button class="secondary" type="button" data-bedtime data-bedtime-story="${esc(item.id)}">Bedtime</button>${coloring() && coloring().has(item.id) ? ` <button class="secondary" type="button" data-coloring-open="${esc(item.id)}" data-i18n-skip>🖍️ ${es() ? 'Colorear' : 'Color it'}</button>` : ''}</p>`;
  }

  function bedtimeStory() {
    return stories.find(item => item.id === (bedtime && bedtime.story)) || stories.find(item => item.id === 'stars') || stories[0];
  }

  function stars() {
    let html = '';
    for (let i = 0; i < 42; i += 1) {
      const left = (i * 37) % 100;
      const top = (i * 53) % 78;
      html += `<i class="star" style="left:${left}%;top:${top}%"></i>`;
    }
    return html;
  }

  function showBedtime(root) {
    const item = bedtimeStory();
    const step = bedtime.step;
    if (step === 'prayer') {
      const words = es() ? prayer.es : prayer.en;
      root.innerHTML = `<button class="text-button back" data-bedtime-back type="button">← Back</button><article class="story-read bedtime-prayer" data-read-block><span class="eyebrow">BEDTIME</span><h1>A small prayer</h1><p class="story-body">${esc(words)}</p></article>${speechRow()}<p><button class="primary" type="button" data-bedtime-next="sky">Play the night</button></p>`;
      return;
    }
    if (step === 'sky') {
      const minutes = bedtime.minutes || 20;
      root.innerHTML = `<section class="bedtime-sky" data-i18n-skip><div class="bedtime-stars" aria-hidden="true">${stars()}</div><div class="bedtime-copy"><span class="eyebrow">${es() ? 'HORA DE DORMIR' : 'BEDTIME'}</span><h1>${es() ? 'El cielo está quieto' : 'The sky is quiet'}</h1><p>${es() ? 'La cajita de música suena bajito. La pantalla se queda así hasta que termine el tiempo.' : 'The music box plays softly. The screen stays like this until the time is done.'}</p><div class="bedtime-timers" role="group" aria-label="${es() ? 'Tiempo para dormir' : 'Sleep timer'}">${[10, 20, 30].map(n => `<button type="button" class="secondary${minutes === n ? ' active' : ''}" aria-pressed="${minutes === n}" data-bedtime-minutes="${n}">${n} min</button>`).join('')}</div><button class="text-button" type="button" data-bedtime-back>${es() ? 'Volver a la oración' : 'Back to the prayer'}</button></div></section>`;
      return;
    }
    const at = stories.indexOf(item), total = stories.length;
    const prev = stories[(at - 1 + total) % total], nxt = stories[(at + 1) % total];
    root.innerHTML = `<section class="bedtime-read"><button class="text-button back" data-bedtime-back type="button" data-i18n-skip>← ${es() ? 'Historias' : 'Stories'}</button><article class="story-read" data-read-block data-i18n-skip><span class="eyebrow">${es() ? 'HORA DE DORMIR' : 'BEDTIME'}</span>${picture(item, 'hero')}<h1 class="story-title">${esc(pick(item, 'title'))}</h1><p class="story-body">${esc(pick(item, 'body'))}</p>${verseHtml(item)}</article><nav class="bedtime-steps" aria-label="${es() ? 'Historias' : 'Stories'}"><button class="secondary" type="button" data-bedtime-step="-1" aria-label="${esc((es() ? 'Anterior: ' : 'Previous: ') + pick(prev, 'title'))}">← ${es() ? 'Anterior' : 'Previous'}</button><span class="bedtime-pos" aria-live="polite">${es() ? `${at + 1} de ${total}` : `${at + 1} of ${total}`}</span><button class="secondary" type="button" data-bedtime-step="1" aria-label="${esc((es() ? 'Siguiente: ' : 'Next: ') + pick(nxt, 'title'))}">${es() ? 'Siguiente' : 'Next'} →</button></nav>${speechRow()}<p><button class="primary" type="button" data-bedtime-next="prayer">${es() ? 'Una oración corta' : 'A small prayer'}</button></p></section>`;
    if (bedtime.reading) setTimeout(() => { if (bedtime && bedtime.step === 'story' && bedtime.reading) speakFrom(root); }, 0);
  }

  /* the coloring book may render a moment after Stories: wait for it, then scroll */
  function scrollToColoring(tries = 40) {
    const book = document.querySelector('.coloring-book');
    if (book) { book.scrollIntoView({ block: 'start', behavior: 'auto' }); return true; }
    if (tries <= 0) { window.scrollTo({ top: 0, behavior: 'auto' }); return false; }
    setTimeout(() => scrollToColoring(tries - 1), 75);
    return false;
  }

  function show(root) {
    if (squishyOn && window.MsbSquishy) { MsbSquishy.open(root); return; }
    if (matchOn && window.MsbMatch) { MsbMatch.open(root); return; }
    if (kidGamesOn && window.MsbKidGames) { MsbKidGames.open(root); return; }
    if (coloringId && coloring()) { const drawingId = coloringDrawing; coloringDrawing = null; coloring().open(root, coloringId, storyTitle(coloringId), { drawingId }); return; }
    if (bedtime) showBedtime(root);
    else {
      const item = stories.find(entry => entry.id === openId);
      if (item) showOne(root, item);
      else showList(root);
    }
  }

  function speakFrom(root) {
    const block = root.querySelector('[data-read-block]');
    if (!block || !window.MsbSpeech) return;
    const nodes = [...block.querySelectorAll('h1, p')].filter(el => el.textContent.trim());
    let token = null;
    if (bedtime && bedtime.step === 'story') { bedtime.reading = true; token = bedtime.readToken = { last: false, stopped: false }; }
    MsbSpeech.speak({
      lang: es() ? 'es' : 'en',
      chunks: nodes.map(el => ({ text: el.textContent.trim(), el })),
      onChunk: (chunk, index) => { if (chunk.el) chunk.el.scrollIntoView({ block: 'nearest' }); if (token) token.last = index === nodes.length - 1; },
      onDone: () => {
        /* bedtime read-aloud carries on to the next story when one finishes on its own */
        if (!token || !bedtime || bedtime.readToken !== token || !token.last || token.stopped) return;
        token.stopped = true;
        bedtime.advance = setTimeout(() => {
          if (!bedtime || bedtime.readToken !== token || bedtime.step !== 'story') return;
          const at = stories.indexOf(bedtimeStory());
          if (at >= stories.length - 1) { bedtime.reading = false; return; }
          bedtime.story = stories[at + 1].id; refresh(); window.scrollTo({ top: 0, behavior: 'auto' });
        }, 1500);
      }
    });
  }

  /* The night screen promises to stay on until the timer ends, so hold a
     screen wake lock for exactly that long. The browser drops the lock when
     the tab is hidden; it is taken again when the tab comes back. */
  let screenLock = null;
  async function holdScreen(on) {
    if (!on) {
      const current = screenLock;
      screenLock = null;
      try { await current?.release(); } catch { /* already released */ }
      return;
    }
    if (!navigator.wakeLock?.request || screenLock) return;
    try {
      screenLock = await navigator.wakeLock.request('screen');
      screenLock.addEventListener?.('release', () => { screenLock = null; });
    } catch { screenLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && music && Date.now() < music.until) holdScreen(true);
  });

  function stopMusic() {
    holdScreen(false);
    if (!music) return;
    const ctx = music.ctx;
    try {
      music.gain.gain.cancelScheduledValues(ctx.currentTime);
      music.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    } catch { /* ignore */ }
    clearTimeout(music.timer);
    clearTimeout(music.release);
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 400);
    music = null;
    if (window.msbYieldAudio) { try { window.msbYieldAudio('bedtime', false); } catch { /* ignore */ } }
  }

  function startMusic(minutes) {
    stopMusic();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    const endAt = ctx.currentTime + minutes * 60;
    master.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.5);
    master.gain.setValueAtTime(0.07, Math.max(ctx.currentTime + 1.6, endAt - 20));
    master.gain.linearRampToValueAtTime(0.0001, endAt);
    const notes = [329.63, 329.63, 392, 329.63, 329.63, 392, 329.63, 392, 523.25, 493.88, 440, 440, 523.25, 440, 392, 349.23, 349.23, 392, 329.63, 293.66, 261.63];
    const beats = [0.5, 0.5, 1, 0.5, 0.5, 1, 0.45, 0.45, 0.7, 0.3, 1, 0.5, 0.5, 0.7, 0.3, 1, 0.5, 0.5, 0.7, 0.3, 1.4];
    let when = ctx.currentTime + 0.15;
    let step = 0;
    const schedule = () => {
      if (!music || music.ctx !== ctx) return;
      while (when < ctx.currentTime + 6 && when < endAt) {
        const dur = beats[step % beats.length] * 0.62;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[step % notes.length];
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.8, when + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(when);
        osc.stop(when + dur + 0.02);
        when += dur * 0.96;
        step += 1;
      }
      if (when < endAt) music.timer = setTimeout(schedule, 900);
    };
    music = { ctx, gain: master, timer: null, until: Date.now() + minutes * 60000, release: setTimeout(() => holdScreen(false), minutes * 60000) };
    holdScreen(true);
    if (window.msbYieldAudio) { try { window.msbYieldAudio('bedtime', true); } catch { /* ignore */ } }
    schedule();
  }

  function stepStory(dir) {
    const at = stories.indexOf(bedtimeStory());
    const reading = !!bedtime.reading;
    clearTimeout(bedtime.advance);
    bedtime.readToken = null;
    if (window.MsbSpeech) MsbSpeech.stop();
    bedtime.reading = reading;
    bedtime.story = stories[(at + dir + stories.length) % stories.length].id;
    refresh();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const nav = document.querySelector(`[data-bedtime-step="${dir}"]`); if (nav) nav.focus({ preventScroll: true });
  }
  /* Stop and Pause end the bedtime read-aloud chain (capture runs before speech.js) */
  document.addEventListener('click', event => {
    if (bedtime && event.target.closest && event.target.closest('#screen [data-speech-stop]')) { bedtime.reading = false; clearTimeout(bedtime.advance); if (bedtime.readToken) bedtime.readToken.stopped = true; }
  }, true);
  function refresh() {
    const root = document.getElementById('screen');
    if (root) show(root);
    if (window.MsbI18n) MsbI18n.apply(root);
  }

  document.addEventListener('click', event => {
    const screen = document.getElementById('screen');
    if (!screen || !event.target.closest('#screen')) return;
    if (event.target.closest('[data-bedtime]')) {
      const chosen = event.target.closest('[data-bedtime-story]')?.dataset.bedtimeStory;
      bedtime = { step: 'story', story: chosen || openId || 'stars', minutes: 20 };
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      return;
    }
    const step = event.target.closest('[data-bedtime-step]');
    if (step && bedtime) { stepStory(Number(step.dataset.bedtimeStep) || 1); return; }
    if (event.target.closest('[data-bedtime-back]')) {
      if (!bedtime) return;
      bedtime.reading = false; clearTimeout(bedtime.advance);
      if (bedtime.step === 'sky') { stopMusic(); bedtime.step = 'prayer'; }
      else if (bedtime.step === 'prayer') bedtime.step = 'story';
      else { stopMusic(); bedtime = null; }
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      return;
    }
    const next = event.target.closest('[data-bedtime-next]');
    if (next && bedtime) {
      bedtime.reading = false; clearTimeout(bedtime.advance);
      bedtime.step = next.dataset.bedtimeNext;
      if (bedtime.step === 'sky') startMusic(bedtime.minutes || 20);
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      return;
    }
    const minutes = event.target.closest('[data-bedtime-minutes]');
    if (minutes && bedtime) {
      bedtime.minutes = Number(minutes.dataset.bedtimeMinutes) || 20;
      startMusic(bedtime.minutes);
      refresh();
      return;
    }
    const color = event.target.closest('[data-coloring-open]');
    if (color && coloring()) {
      coloringId = color.dataset.coloringOpen;
      bedtime = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    /* a locked squishy's Go button: straight to the game that unlocks it */
    const go = event.target.closest('[data-sq-go-match], [data-sq-go-game], [data-sq-go-color]');
    if (go) {
      squishyOn = false;
      if (window.MsbSquishy) MsbSquishy.close();
      bedtime = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      matchOn = go.hasAttribute('data-sq-go-match') && !!window.MsbMatch;
      kidGamesOn = go.hasAttribute('data-sq-go-game') && !!window.MsbKidGames;
      refresh();
      const game = go.dataset.sqGoGame;
      if (kidGamesOn && game && game !== 'hub') MsbKidGames.openGame(game);
      else if (go.hasAttribute('data-sq-go-color')) { scrollToColoring(); return; }
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-squishy-open]') && window.MsbSquishy) {
      squishyOn = true;
      kidGamesOn = false;
      if (window.MsbKidGames) MsbKidGames.close();
      bedtime = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-match-open]') && window.MsbMatch) {
      matchOn = true;
      kidGamesOn = false;
      squishyOn = false;
      if (window.MsbKidGames) MsbKidGames.close();
      bedtime = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-kg-enter]') && window.MsbKidGames) {
      kidGamesOn = true;
      bedtime = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-kg-exit]')) {
      kidGamesOn = false;
      if (window.MsbKidGames) MsbKidGames.close();
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-match-exit]')) {
      matchOn = false;
      if (window.MsbMatch) MsbMatch.close();
      /* both now live in the Bible games hub: go back there */
      kidGamesOn = !!window.MsbKidGames;
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-squishy-exit]')) {
      squishyOn = false;
      if (window.MsbSquishy) MsbSquishy.close();
      /* both now live in the Bible games hub: go back there */
      kidGamesOn = !!window.MsbKidGames;
      refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (event.target.closest('[data-coloring-back]')) {
      coloringId = null;
      if (coloring()) coloring().close();
      refresh();
      return;
    }
    const open = event.target.closest('[data-story]');
    if (open) {
      openId = open.dataset.story;
      bedtime = null;
      refresh();
      return;
    }
    if (event.target.closest('[data-story-back]')) {
      openId = null;
      if (window.MsbSpeech) MsbSpeech.stop();
      refresh();
      return;
    }
    if (event.target.closest('[data-story-speak]')) speakFrom(screen);
  });

  window.MsbStories = {
    show,
    stories: () => stories.map(item => ({ ...item })),
    verses: VERSES,
    bedtimeOn: () => !!bedtime,
    /* Reopen a coloring page, optionally with a drawing from My drawings loaded. */
    openColoring(id, drawingId) {
      if (!coloring() || !coloring().has(id)) return false;
      openId = null;
      bedtime = null;
      coloringId = id;
      coloringDrawing = drawingId || null;
      return true;
    },
    reset() {
      openId = null;
      coloringId = null;
      squishyOn = false;
      if (window.MsbSquishy) MsbSquishy.close();
      matchOn = false;
      if (window.MsbMatch) MsbMatch.close();
      kidGamesOn = false;
      if (window.MsbKidGames) MsbKidGames.close();
      if (window.MsbColoring) MsbColoring.close();
      bedtime = null;
      stopMusic();
      if (window.MsbSpeech) MsbSpeech.stop();
    }
  };
})();
