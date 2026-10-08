/* Short Bible stories for a child nearby. Original retellings. Original SVG. */
(() => {
  'use strict';
  const stories = [
    {
      id: 'creation',
      title: 'God makes the world',
      titleEs: 'Dios hace el mundo',
      art: 'sun',
      body: 'In the beginning there was no sun, no trees, and no people. God spoke, and light came. He made the sky and the sea, the land and the flowers, the fish and the birds and every animal. Then God made a man and a woman, and He blessed them. God looked at everything He had made, and it was very good. When the day was done, God rested. The world is a gift. We can say thank you.',
      bodyEs: 'Al principio no había sol, ni árboles, ni personas. Dios habló, y llegó la luz. Hizo el cielo y el mar, la tierra y las flores, los peces, las aves y todos los animales. Después Dios hizo a un hombre y a una mujer, y los bendijo. Dios miró todo lo que había hecho, y era muy bueno. Cuando el día terminó, Dios descansó. El mundo es un regalo. Podemos decir gracias.'
    },
    {
      id: 'noah',
      title: 'Noah and the big boat',
      titleEs: 'Noé y el barco grande',
      art: 'boat',
      body: 'God asked Noah to build a big boat. Noah obeyed, even when other people laughed. Two of each kind of animal came in, and Noah’s family came in too. Then the rain fell for a long, long time. The boat floated, and God kept them safe. When the water went down, Noah sent out a dove. The dove came back with a leaf. God put a rainbow in the sky. It was His promise to care for the earth.',
      bodyEs: 'Dios le pidió a Noé que construyera un barco grande. Noé obedeció, aunque otra gente se riera. Entraron dos animales de cada clase, y también la familia de Noé. Luego llovió por mucho, mucho tiempo. El barco flotó, y Dios los cuidó. Cuando el agua bajó, Noé soltó una paloma. La paloma volvió con una hoja. Dios puso un arcoíris en el cielo. Era su promesa de cuidar la tierra.'
    },
    {
      id: 'stars',
      title: 'Abraham and the stars',
      titleEs: 'Abraham y las estrellas',
      art: 'stars',
      body: 'Abraham and Sarah were old, and they had no child. God told Abraham to look up at the night sky. “Count the stars, if you can,” God said. “Your family will be like that.” Abraham could not count them all. He trusted God anyway. Later, God gave them a baby boy named Isaac. God keeps promises, even when we have to wait.',
      bodyEs: 'Abraham y Sara ya eran mayores, y no tenían hijos. Dios le dijo a Abraham que mirara el cielo de noche. “Cuenta las estrellas, si puedes”, dijo Dios. “Tu familia va a ser así.” Abraham no podía contarlas todas. Aun así, confió en Dios. Después, Dios les dio un niño llamado Isaac. Dios cumple sus promesas, aunque tengamos que esperar.'
    },
    {
      id: 'joseph',
      title: 'Joseph and his brothers',
      titleEs: 'José y sus hermanos',
      art: 'coat',
      body: 'Joseph’s father gave him a special coat. His brothers were jealous. They sent Joseph far away. Joseph was sad, and he had to work in a strange land. God stayed with him. Years later, Joseph helped a king save food for a hungry time. His brothers came looking for food. Joseph could have been angry. Instead he cried and hugged them. “You meant to hurt me,” he said, “but God used it for good.”',
      bodyEs: 'El papá de José le dio un manto especial. Sus hermanos tuvieron celos. Enviaron a José muy lejos. José estaba triste, y tuvo que trabajar en una tierra extraña. Dios se quedó con él. Años después, José ayudó a un rey a guardar comida para un tiempo de hambre. Sus hermanos vinieron a buscar comida. José pudo haberse enojado. En vez de eso, lloró y los abrazó. “Ustedes quisieron hacerme daño”, dijo, “pero Dios lo usó para bien.”'
    },
    {
      id: 'moses',
      title: 'Baby Moses',
      titleEs: 'El bebé Moisés',
      art: 'basket',
      body: 'A cruel king was afraid of the baby boys. Moses’ mother hid her baby as long as she could. Then she made a little basket and set it in the river grass. His sister Miriam watched nearby. A princess found the basket and loved the baby. Miriam was brave. She said, “I know someone who can help you care for him.” So Moses’ own mother got to hold him again. God sees the small ones. He had a plan for that baby.',
      bodyEs: 'Un rey cruel tenía miedo de los bebés varones. La mamá de Moisés escondió a su bebé todo lo que pudo. Después hizo una canasta y la puso entre las plantas del río. Su hermana Miriam miraba cerca. Una princesa encontró la canasta y quiso al bebé. Miriam fue valiente. Dijo: “Yo conozco a alguien que puede ayudarte a cuidarlo.” Así la mamá de Moisés pudo cargarlo otra vez. Dios ve a los pequeños. Tenía un plan para ese bebé.'
    },
    {
      id: 'david',
      title: 'David and Goliath',
      titleEs: 'David y Goliat',
      art: 'stone',
      body: 'Goliath was a giant soldier. He shouted at God’s people every day. The grown men were afraid. David was young. He took care of sheep. He told the king, “God helped me when a lion came. God will help me now.” David did not wear heavy armor. He picked up five smooth stones. He ran toward the giant and trusted God. One stone was enough. The people learned that God is stronger than any bully.',
      bodyEs: 'Goliat era un soldado gigante. Todos los días les gritaba al pueblo de Dios. Los hombres grandes tenían miedo. David era joven. Cuidaba ovejas. Le dijo al rey: “Dios me ayudó cuando vino un león. Dios me va a ayudar ahora.” David no se puso una armadura pesada. Recogió cinco piedras lisas. Corrió hacia el gigante y confió en Dios. Una piedra fue suficiente. El pueblo aprendió que Dios es más fuerte que cualquier bravucón.'
    },
    {
      id: 'daniel',
      title: 'Daniel and the lions',
      titleEs: 'Daniel y los leones',
      art: 'lion',
      body: 'Daniel loved God and prayed every day. Some men were jealous. They tricked the king into making a bad rule: nobody could pray except to the king. Daniel prayed anyway, with his window open. The king was sad, but he had to put Daniel in a den of lions. That night the king could not sleep. In the morning he ran to the den. Daniel was safe. God had sent an angel to shut the lions’ mouths. Daniel said, “My God sent his angel.”',
      bodyEs: 'Daniel amaba a Dios y oraba todos los días. Unos hombres tuvieron celos. Engañaron al rey para que hiciera una regla mala: nadie podía orar, solo al rey. Daniel oró de todos modos, con la ventana abierta. El rey se puso triste, pero tuvo que meter a Daniel en un foso de leones. Esa noche el rey no pudo dormir. En la mañana corrió al foso. Daniel estaba bien. Dios había enviado un ángel para cerrar la boca de los leones. Daniel dijo: “Mi Dios envió a su ángel.”'
    },
    {
      id: 'jonah',
      title: 'Jonah and the big fish',
      titleEs: 'Jonás y el pez grande',
      art: 'fish',
      body: 'God told Jonah to go to a city and tell the people to turn around. Jonah did not want to go. He got on a boat going the other way. A storm came. Jonah told the sailors the storm was because of him. They put him in the water, and a big fish swallowed him. Inside the fish, Jonah prayed. God heard him. The fish spit Jonah onto the land. Then Jonah went to the city. The people were sorry, and God was kind. God is kind to people who run, and He is kind when they come back.',
      bodyEs: 'Dios le dijo a Jonás que fuera a una ciudad y les dijera a las personas que cambiaran. Jonás no quería ir. Se subió a un barco que iba para el otro lado. Vino una tormenta. Jonás les dijo a los marineros que la tormenta era por él. Lo echaron al agua, y un pez grande se lo tragó. Adentro del pez, Jonás oró. Dios lo escuchó. El pez escupió a Jonás en la tierra. Entonces Jonás fue a la ciudad. La gente se arrepintió, y Dios fue bueno. Dios es bueno con quien huye, y es bueno cuando vuelve.'
    },
    {
      id: 'nativity',
      title: 'Jesus is born',
      titleEs: 'Jesús nace',
      art: 'star',
      body: 'Mary and Joseph traveled to Bethlehem. The inn was full, so they stayed where the animals were. That night Mary had a baby. She wrapped Him in cloth and laid Him in a manger. Angels told shepherds in the fields, “A Savior is born.” The shepherds hurried and found the baby, just as the angel said. They went home praising God. Jesus is God come close, small enough to be held.',
      bodyEs: 'María y José viajaron a Belén. El mesón estaba lleno, así que se quedaron donde estaban los animales. Esa noche María tuvo un bebé. Lo envolvió en telas y lo acostó en un pesebre. Los ángeles les dijeron a unos pastores en el campo: “Ha nacido un Salvador.” Los pastores fueron de prisa y encontraron al bebé, tal como dijo el ángel. Volvieron a casa alabando a Dios. Jesús es Dios que se acerca, tan pequeño que se puede cargar.'
    },
    {
      id: 'storm',
      title: 'Jesus calms the storm',
      titleEs: 'Jesús calma la tormenta',
      art: 'wave',
      body: 'Jesus and His friends were in a boat. Jesus was asleep. A storm came up fast. Waves splashed in. The friends were scared. They woke Jesus and said, “Teacher, do you not care that we are sinking?” Jesus stood up. He spoke to the wind and the sea: “Peace. Be still.” The wind stopped. The water was quiet. His friends were amazed. When you are afraid, you can call on Jesus. He hears you.',
      bodyEs: 'Jesús y sus amigos iban en un barco. Jesús estaba dormido. Una tormenta llegó de pronto. Las olas entraban. Los amigos tuvieron miedo. Despertaron a Jesús y dijeron: “Maestro, ¿no te importa que nos hundimos?” Jesús se levantó. Le habló al viento y al mar: “Paz. Calla.” El viento paró. El agua se quedó quieta. Sus amigos quedaron asombrados. Cuando tengas miedo, puedes llamar a Jesús. Él te escucha.'
    },
    {
      id: 'children',
      title: 'Jesus and the children',
      titleEs: 'Jesús y los niños',
      art: 'child',
      body: 'People brought their children to Jesus. They wanted Him to bless them. Some of the grown-ups said, “Do not bother the Teacher.” Jesus did not like that. He said, “Let the children come to me. Do not stop them. The kingdom of God belongs to people who trust like this.” Then Jesus took the children in His arms and blessed them. You are not too small for Jesus. He wants you near.',
      bodyEs: 'La gente llevaba a sus niños a Jesús. Querían que los bendijera. Algunos grandes dijeron: “No molesten al Maestro.” A Jesús no le gustó eso. Dijo: “Dejen que los niños vengan a mí. No se lo impidan. El reino de Dios es de quienes confían así.” Entonces Jesús tomó a los niños en sus brazos y los bendijo. Tú no eres demasiado pequeño para Jesús. Él te quiere cerca.'
    },
    {
      id: 'feeding',
      title: 'Five loaves and two fish',
      titleEs: 'Cinco panes y dos pescados',
      art: 'bread',
      body: 'A huge crowd stayed with Jesus all day. They were hungry, and the place was far from town. A boy had five small loaves and two fish. It did not look like enough. He shared it anyway. Jesus thanked God and broke the bread. The friends passed it out. Everyone ate until they were full, and there were baskets of leftovers. A small lunch, given to Jesus, became a feast. Sharing is never too small for God.',
      bodyEs: 'Una multitud enorme se quedó con Jesús todo el día. Tenían hambre, y el lugar estaba lejos del pueblo. Un niño tenía cinco panes pequeños y dos pescados. No parecía suficiente. Aun así, los compartió. Jesús dio gracias a Dios y partió el pan. Los amigos lo repartieron. Todos comieron hasta quedar llenos, y sobraron canastas. Un almuerzo pequeño, puesto en las manos de Jesús, se volvió un banquete. Compartir nunca es demasiado poco para Dios.'
    },
    {
      id: 'sheep',
      title: 'The lost sheep',
      titleEs: 'La oveja perdida',
      art: 'sheep',
      body: 'Jesus told a story. A shepherd had one hundred sheep. One wandered off. The shepherd did not say, “Oh well, I still have ninety-nine.” He went out to look. He looked until he found the one. Then he was so happy that he carried it home and called his friends to celebrate. Jesus said heaven is happy like that when one person comes back. If you ever feel lost, God is already looking for you.',
      bodyEs: 'Jesús contó una historia. Un pastor tenía cien ovejas. Una se alejó. El pastor no dijo: “Bueno, todavía tengo noventa y nueve.” Salió a buscarla. Buscó hasta encontrarla. Luego estaba tan feliz que la cargó a casa y llamó a sus amigos para celebrar. Jesús dijo que el cielo se alegra así cuando una persona regresa. Si alguna vez te sientes perdido, Dios ya te está buscando.'
    },
    {
      id: 'easter',
      title: 'Easter morning',
      titleEs: 'La mañana de Pascua',
      art: 'dawn',
      body: 'Jesus died on a cross because He loves us. His friends were very sad. They laid His body in a tomb and rolled a stone in front. Early on Sunday, women who loved Him went to the tomb. The stone was rolled away. The tomb was empty. An angel said, “He is not here. He is risen.” Jesus is alive. Death did not win. That is why we can sing on Easter morning: Jesus is alive, and He is with us.',
      bodyEs: 'Jesús murió en una cruz porque nos ama. Sus amigos estaban muy tristes. Pusieron su cuerpo en un sepulcro y rodaron una piedra enfrente. Muy temprano el domingo, unas mujeres que lo amaban fueron al sepulcro. La piedra estaba corrida. El sepulcro estaba vacío. Un ángel dijo: “No está aquí. Ha resucitado.” Jesús está vivo. La muerte no ganó. Por eso podemos cantar en la mañana de Pascua: Jesús está vivo, y está con nosotros.'
    }
  ];

  let openId = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function es() { return window.MsbI18n && MsbI18n.lang() === 'es'; }
  function pick(item, field) { return es() ? item[field + 'Es'] : item[field]; }

  function art(kind) {
    const scenes = {
      sun: '<circle cx="250" cy="48" r="26" fill="#e7c56a"/><path d="M20 130c40-36 80-36 120 0s80 36 160 0v30H20z" fill="#2f6f62"/>',
      boat: '<path d="M40 100h240l-24 36H70z" fill="#c4a15a"/><path d="M150 100V40l70 60z" fill="#d7ece4"/><path d="M30 148c30 16 60 16 90 0s60-16 90 0 60 16 80 0" fill="none" stroke="#7eb8c9" stroke-width="6"/>',
      stars: '<circle cx="70" cy="50" r="3" fill="#f3e2a4"/><circle cx="120" cy="36" r="2" fill="#f3e2a4"/><circle cx="180" cy="58" r="3" fill="#f3e2a4"/><circle cx="230" cy="40" r="2" fill="#f3e2a4"/><circle cx="260" cy="70" r="3" fill="#f3e2a4"/><path d="M40 140h240" stroke="#d7c39a" stroke-width="4"/>',
      coat: '<path d="M160 36l48 28v78H112V64z" fill="#c47b4a"/><path d="M160 36l-18 20h36z" fill="#e7c56a"/>',
      basket: '<path d="M70 90c20 50 160 50 180 0" fill="none" stroke="#c4a15a" stroke-width="8"/><circle cx="160" cy="78" r="16" fill="#f0d2b0"/><path d="M40 120c40 10 200 10 240 0" fill="none" stroke="#3d8f7a" stroke-width="6"/>',
      stone: '<circle cx="150" cy="120" r="16" fill="#d7c39a"/><path d="M210 40v90" stroke="#8d6b4a" stroke-width="10"/><circle cx="210" cy="36" r="18" fill="#c47b4a"/>',
      lion: '<circle cx="170" cy="90" r="36" fill="#c4a15a"/><circle cx="156" cy="84" r="4" fill="#1c2430"/><path d="M130 70l-20-24M150 60l-4-28M176 58l10-26M200 70l22-18" stroke="#e7c56a" stroke-width="6"/>',
      fish: '<ellipse cx="150" cy="96" rx="70" ry="32" fill="#3d8f7a"/><path d="M210 96l40-28v56z" fill="#2f6f62"/><circle cx="112" cy="90" r="4" fill="#f4efe4"/>',
      star: '<path d="M160 28l14 36h38l-30 24 12 38-34-22-34 22 12-38-30-24h38z" fill="#e7c56a"/>',
      wave: '<path d="M20 120c30-28 50 20 80 0s50-28 80 0 50 28 80 0 40-20 60 0" fill="none" stroke="#7eb8c9" stroke-width="8"/><path d="M120 70h90v18H120z" fill="#c4a15a"/>',
      child: '<circle cx="160" cy="70" r="22" fill="#f0d2b0"/><path d="M132 108h56l10 40h-76z" fill="#3d8f7a"/><circle cx="110" cy="78" r="14" fill="#e7c56a"/><circle cx="214" cy="78" r="14" fill="#c47b4a"/>',
      bread: '<ellipse cx="120" cy="110" rx="36" ry="18" fill="#e7c56a"/><ellipse cx="190" cy="100" rx="40" ry="20" fill="#c4a15a"/><ellipse cx="160" cy="78" rx="16" ry="8" fill="#7eb8c9"/>',
      sheep: '<ellipse cx="160" cy="100" rx="54" ry="32" fill="#f4efe4"/><circle cx="206" cy="86" r="16" fill="#f4efe4"/><circle cx="212" cy="84" r="2" fill="#1c2430"/><path d="M130 128v16M190 128v16" stroke="#c4a15a" stroke-width="6"/>',
      dawn: '<circle cx="230" cy="70" r="28" fill="#e7c56a"/><path d="M40 140h240" stroke="#d7c39a" stroke-width="8"/><path d="M70 140V78h36v62" fill="none" stroke="#f4efe4" stroke-width="6"/>'
    };
    return `<svg class="story-art" viewBox="0 0 320 180" role="img" aria-hidden="true"><rect width="320" height="180" rx="18" fill="currentColor" opacity=".08"/>${scenes[kind] || scenes.sun}</svg>`;
  }

  function showList(root) {
    const cards = stories.map(item => `<button class="card story-card" data-story="${esc(item.id)}">${art(item.art)}<h2>${esc(pick(item, 'title'))}</h2><span>Open</span></button>`).join('');
    root.innerHTML = `<span class="eyebrow">LITTLE ONES</span><h1>Stories for little ones</h1><p class="lead">Bible stories told simply, for a child close by.</p><div class="story-grid">${cards}</div>`;
  }

  function showOne(root, item) {
    const title = pick(item, 'title');
    const body = pick(item, 'body');
    root.innerHTML = `<button class="text-button back" data-story-back type="button">← Back</button><article class="story-read" data-i18n-skip><span class="eyebrow">A story to read together</span>${art(item.art)}<h1 class="story-title">${esc(title)}</h1><p class="story-body">${esc(body)}</p></article><div class="story-actions"><button class="primary" type="button" data-story-speak data-story-id="${esc(item.id)}">Read aloud</button><button class="secondary" type="button" data-story-stop>Stop</button></div>`;
  }

  function show(root) {
    const item = stories.find(entry => entry.id === openId);
    if (item) showOne(root, item);
    else showList(root);
  }

  function speak(item) {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') {
      const toast = document.getElementById('toast');
      if (toast) { toast.textContent = window.MsbI18n ? MsbI18n.t('This browser cannot read aloud.') : 'This browser cannot read aloud.'; toast.classList.add('show'); }
      return;
    }
    try { synth.cancel(); } catch { /* ignore */ }
    const utter = new SpeechSynthesisUtterance(`${pick(item, 'title')}. ${pick(item, 'body')}`);
    utter.lang = es() ? 'es-MX' : 'en-US';
    utter.rate = 0.92;
    try { synth.speak(utter); } catch { /* ignore */ }
  }

  document.addEventListener('click', event => {
    const open = event.target.closest('[data-story]');
    if (open && open.closest('#screen')) {
      openId = open.dataset.story;
      const root = document.getElementById('screen');
      if (root) show(root);
      if (window.MsbI18n) MsbI18n.apply(root);
      return;
    }
    if (event.target.closest('[data-story-back]')) {
      openId = null;
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* ignore */ }
      const root = document.getElementById('screen');
      if (root) show(root);
      if (window.MsbI18n) MsbI18n.apply(root);
      return;
    }
    const speakBtn = event.target.closest('[data-story-speak]');
    if (speakBtn) {
      const item = stories.find(entry => entry.id === speakBtn.dataset.storyId);
      if (item) speak(item);
      return;
    }
    if (event.target.closest('[data-story-stop]')) {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
  });

  window.MsbStories = { show, reset() { openId = null; } };
})();
