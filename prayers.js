/* A Scripture-first daily prayer rule on the Pray tab, plus the Church's
   older prayers and the prayer rope under Go deeper.
   Main-path prayers quote the KJV and the Reina-Valera 1909 word for word.
   The older prayers are Isabel Florence Hapgood's translation in Service Book of the
   Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (Boston and New York:
   Houghton, Mifflin and Company, 1906). That edition is in the public domain.
   Rubrics in this file say which office each prayer is taken from. */
(() => {
  'use strict';
  const ROPE_KEY = 'msb_prayer_rope';
  const RULE_KEY = 'msb_prayer_rule';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const PRAYERS = [
    {
      id:'morning',
      title:'Morning Prayers',
      blurb:'The First Hour: worship, the prayer of the hours, and the morning light.',
      blocks:[
        ['rubric','From the First Hour. Begin with the Trisagion Prayers when they are part of your rule.'],
        ['text','O come, let us worship God our King. O come, let us worship and fall down before Christ, our King and our God. O come, let us worship and fall down before the Very Christ, our King and our God.'],
        ['text','What shall we call thee, O thou who art full of grace? Heaven, for from thee shone forth the Sun of Righteousness; Paradise, for thou hast budded forth the Flower of Immortality; Virgin, for thou hast remained undefiled; Pure Mother, for thou hast held in thy holy embrace thy Son, who is God of all. Beseech thou him that he will save our souls.'],
        ['text','Order my steps in thy word, and so shall no wickedness have dominion over me. O deliver me from the wrongful dealings of men, and so shall I keep thy commandments. Show the light of thy countenance upon thy servant, and teach me thy statutes.'],
        ['text','Let my mouth be filled with thy praise, O Lord, that I may sing of thy glory and honour all the day long.'],
        ['text','Thou who, at all times, and at every hour, both in heaven and on earth, art worshipped and glorified, O Christ our God, long-suffering and plenteous in mercy and compassion; who lovest the just and showest mercy to those who are hardened in sin; who callest all men to repentance through the promise of good things to come: Do thou, the same Lord, receive also our supplications at this present time, and direct our lives according to thy commandments. Sanctify our souls; purify our bodies; set aright our minds; and deliver us from all calamity, wrath and distress. Compass us round about with thy holy Angels; that, guided and guarded by their host, we may attain unto the unity of the faith, and unto the comprehension of thine ineffable glory. For blessed art thou unto ages of ages. Amen.'],
        ['text','More honourable than the Cherubim, and beyond compare more glorious than the Seraphim, thou who without defilement barest God the Word, true Birth-giver of God, we magnify thee.'],
        ['text','O Christ, the true Light, which illumineth and sanctifieth every man who cometh into the world! Let the light of thy countenance be showed upon us, that in it we may behold the light ineffable; and guide our footsteps aright, to the keeping of thy commandments; through the intercessions of thine all-pure Mother, and of all the Saints. Amen.'],
        ['rubric','Prayer of St. Ephraim the Syrian, said with a reverence at the end of each sentence.'],
        ['text','O Lord and Master of my life, grant not unto me a spirit of slothfulness, of discouragement, of lust of power, of vain babbling.'],
        ['text','But vouchsafe unto thy servant the spirit of continence, of meekness, of patience, and of love.'],
        ['text','Yea, O Lord and King, grant that I may perceive my own transgressions, and judge not my brother. For blessed art thou unto ages of ages. Amen.'],
        ['rubric','Then twelve times: O God, cleanse thou me, a sinner. Then the whole prayer is said once more.']
      ]
    },
    {
      id:'evening',
      title:'Evening Prayers',
      blurb:'From Grand Compline: the day is past, the Creed, and the evening hymns.',
      blocks:[
        ['rubric','From the Office of Grand Compline. Begin with the Trisagion Prayers when they are part of your rule.'],
        ['text','The day is past; I thank thee, O Lord: Grant me, I entreat thee, that this evening and this night I fall into no sin; and save me, O my Saviour.'],
        ['text','The day is past; I sing praises unto thee, O Master. Grant, I entreat thee, that this evening and this night I may be without guile; and save me, O Saviour.'],
        ['text','The day is past: I hymn thee, Holy One. Grant, I entreat thee, that this evening and this night I may be assailed by no temptation; and save me, O Saviour.'],
        ['text','With songs unceasing the Bodiless Powers of the Cherubim glorify thee; the six-winged beings, the Seraphim, with voices perpetual, extol thee exceedingly. With thrice-holy songs, all the Host of the Angels laud thee. For thou art the Father before all worlds, and hast with thee thy Son, who also is from everlasting; and hast also the Spirit of Life, coequal in honour, and showest forth the Trinity Undivided. O most holy Virgin, Mother of God, and ye eye-witnesses and servants of the Word, with all the company of the Prophets and the Martyrs, who have attained unto life immortal: Pray ye zealously for us all, for all we are in dire distress; that, being delivered from the wiles of the Evil One, we may loudly sing the Angelic Song: Holy, Holy, Holy Thrice-Holy Lord, have mercy upon us, and save us. Amen.'],
        ['text','I believe in one God the Father Almighty, Maker of heaven and earth, and of all things visible and invisible: And in one Lord Jesus Christ, the only-begotten Son of God, begotten of his Father before all worlds; Light of Light, Very God of very God, begotten, not made, being of one Essence with the Father; by whom all things were made; who, for us men, and for our salvation, came down from heaven, and was incarnate by the Holy Ghost of the Virgin Mary, and was made man. And was crucified also for us under Pontius Pilate; and suffered and was buried. And the third day he rose again, according to the Scriptures. And ascended into heaven, and sitteth on the right hand of the Father. And he shall come again with glory to judge both the quick and the dead; whose kingdom shall have no end. And in the Holy Ghost, the Lord and Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified, who spake by the Prophets. In one Holy Catholic and Apostolic Church. I acknowledge one Baptism for the remission of sins. I look for the Resurrection of the dead, and the Life of the world to come. Amen.'],
        ['text','O all-holy Sovereign Lady, Birth-giver of God, pray for us sinners.'],
        ['text','O all ye heavenly Host of Angels and Archangels, pray for us sinners.'],
        ['text','O holy John, Prophet, and Forerunner, and Baptist of our Lord Jesus Christ, pray for us sinners.'],
        ['text','O holy, glorious Apostles, Prophets and Martyrs, and all Saints, pray for us sinners.'],
        ['text','O God, cleanse us sinners, and have mercy upon us.'],
        ['text','Lighten mine eyes, O Christ my God, that I sleep not unto death; lest mine enemy say: I have prevailed against him.'],
        ['text','Be thou the defender of my soul, O God, for I walk amid a multitude of snares. Deliver me from them and save me, O Good One: for thou lovest mankind.'],
        ['text','And since, through our manifold iniquities, we have no boldness, do thou, O Virgin Birth-giver of God, make fervent entreaty unto him who was born of thee: for the prayer of a mother availeth much unto the benignity of the Master. Despise not the petitions of sinners, O All-Pure One; for gracious and mighty to save is he who deigned to suffer for us.'],
        ['text','Thou knowest, O Lord my Creator, the sleepless vigilance of mine invisible enemies, and the frailty of my miserable flesh. Into thy hands, therefore, will I commit my spirit. Cover me with the wings of thy goodness, that I sleep not unto death; and enlighten the eyes of my spiritual understanding, that I may delight in thy divine words: and make me, in a time acceptable unto thee, to glorify thee in praise, as the only Good One, who loveth mankind.']
      ]
    },
    {
      id:'trisagion',
      title:'Trisagion Prayers',
      blurb:'The usual beginning of the Church’s prayers.',
      blocks:[
        ['rubric','The usual beginning, as printed throughout the Service Book. From Pascha until Pentecost, “O heavenly King” is left unsaid.'],
        ['text','Glory to thee, our God; glory to thee.'],
        ['text','O heavenly King, the Comforter, Spirit of Truth, who art in all places and fillest all things; Treasury of good things and Giver of life: Come and take up thine abode in us, and cleanse us from every stain; and save our souls, O Good One.'],
        ['rubric','Thrice, each time with the sign of the cross and a reverence.'],
        ['text','O Holy God, Holy Mighty, Holy Immortal One, have mercy upon us.'],
        ['text','Glory to the Father, and to the Son, and to the Holy Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['text','O all-holy Trinity, have mercy upon us. O Lord, wash away our sins. O Master, pardon our transgressions. O Holy One, visit and heal our infirmities, for thy Name’s sake.'],
        ['rubric','Lord, have mercy. Thrice.'],
        ['text','Glory to the Father, and to the Son, and to the Holy Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['text','Our Father, who art in heaven, Hallowed be thy Name. Thy kingdom come. Thy will be done on earth, as it is in heaven. Give us this day our daily bread. And forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation; but deliver us from the Evil One.'],
        ['text','For thine is the kingdom, and the power, and the glory, of the Father, and of the Son, and of the Holy Spirit, now, and ever, and unto ages of ages. Amen.']
      ]
    },
    {
      id:'meals',
      title:'Prayers before and after meals',
      blurb:'The Vigil’s blessing of bread, and the thanksgiving that follows it.',
      blocks:[
        ['rubric','Before the meal. The blessing of the loaves at the All-Night Vigil, prayed over the food.'],
        ['text','O Lord Jesus Christ our God, who didst bless the five loaves and didst therewith feed the five thousand: Do thou, the same Lord, bless these loaves, wheat, wine and oil; and multiply them in this holy habitation, and in all thy world; and sanctify all the faithful who shall partake of them. For it is thou, O Christ our God, who dost bless and sanctify and nourish all things; and unto thee we ascribe glory, with thy Father which hath no beginning, and thine all-holy, good, and life-creating Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['rubric','After the meal. From the close of that same blessing.'],
        ['text','Blessed be the Name of the Lord, henceforth and forever.'],
        ['text','O taste, and see, how gracious the Lord is: blessed is the man that trusteth in him. O fear the Lord, ye that are his saints; for they that fear him lack nothing.'],
        ['text','Glory to thee, O Christ our God, our sure hope; glory to thee.'],
        ['text','Through the prayers of our holy Fathers, O Lord Jesus Christ our God, have mercy upon us. Amen.']
      ]
    },
    {
      id:'workday',
      title:'For the Workday: Before and After',
      titleEs:'Para el trabajo: antes y después',
      blurb:'For the ones who care for everyone else: a short send-off and a coming-home prayer.',
      blurbEs:'Para quienes cuidan a todos los demás: una oración breve al salir y una al volver a casa.',
      blocks:[
        ['rubric','Before work. Pray Psalm 91:4: He shall cover thee with his feathers, and under his wings shalt thou trust.'],
        ['text','Lord, You are my refuge and my fortress. Cover the people I will serve today, steady my hands, sharpen what I notice, and let me be kind when I am tired. I go in Your name, and I am not going alone.'],
        ['rubric','After work, before you go home.'],
        ['text','Lord, I saw hard things today and I hand them to You: every face, every need, every outcome I could not change. What was mine to carry is done. Wash this day off me. Let me come home whole, and let the people I love get the rested version of me. Amen.']
      ],
      blocksEs:[
        ['rubric','Antes del trabajo. Ora el Salmo 91:4: Con sus plumas te cubrirá, y debajo de sus alas estarás seguro.'],
        ['text','Señor, tú eres mi refugio y mi fortaleza. Cubre a las personas a quienes voy a servir hoy, afirma mis manos, aclara lo que noto y hazme amable aun cuando esté cansada. Voy en tu nombre, y no voy sola.'],
        ['rubric','Después del trabajo, antes de volver a casa.'],
        ['text','Señor, hoy vi cosas difíciles y te las entrego: cada rostro, cada necesidad, cada resultado que no pude cambiar. Lo que me tocaba cargar ya terminó. Límpiame de este día y déjame llegar a casa entera, para que los que amo reciban la versión descansada de mí. Amén.']
      ]
    },
    {
      id:'communion',
      title:'Prayers before Holy Communion',
      blurb:'The prayers said immediately before receiving the Holy Mysteries.',
      blocks:[
        ['rubric','From “Prayers in preparation for the Holy Communion,” and from the Communion in the Liturgy. These are said after confession and the Church’s fast, as your priest directs.'],
        ['text','I believe, O Lord, and I confess, that thou art in very truth the Christ, the Son of the living God, who didst come into the world to save sinners, of whom I am chief. And I believe that this is, of a truth, thine all-pure Body, and that this is thine own precious Blood. Wherefore, I beseech thee, have mercy upon me, and forgive my transgressions, whether voluntary or involuntary; whether of word or of deed; whether committed with knowledge or in ignorance. And vouchsafe that I may partake without condemnation of thine all-pure Mysteries, unto the remission of my sins, and unto life eternal. Amen.'],
        ['text','Of thy Mystical Supper, O Son of God, accept me to-day as a communicant: for I will not speak of thy Mystery to thine enemies, neither, like Judas, will I give thee a kiss; but like the thief will I confess thee: Remember me, O Lord, in thy kingdom.'],
        ['text','And let not this participation in thy Holy Mysteries be unto judgment upon me, or unto condemnation, O Lord, but unto the healing of soul and body.'],
        ['rubric','A prayer of St. John of Damascus.'],
        ['text','I stand before the doors of thy temple, yet refrain not from wicked thoughts. But O Christ-God, who didst justify the publican, and didst show mercy upon the woman of Cana, and didst open the doors of Paradise to the thief, — open thou unto me also thy loving-kindness, and accept thou me, who am come and who touch thee, as thou didst accept also the woman who was a sinner, and the woman who had an issue of blood. One of them, through touching the hem of thy garment, received perfect healing; and the other, clasping thine all-pure feet, carried away the forgiveness of her sins. And let me not be consumed, all-accursed though I be, through daring to receive thy Body. But accept thou me, as thou didst accept them, and illumine my spiritual senses, consuming my sinful offences: through the prayers of Her who bore thee without seed, and of the heavenly Powers. For blessed art thou, unto ages of ages. Amen.']
      ]
    }
  ];
  const PRAYER_ES = {
    morning: {
      titleEs: 'Oraciones de la mañana',
      blurbEs: 'La Primera Hora: adoración, la oración de las horas y la luz de la mañana.',
      blocksEs: [
        ['rubric','De la Primera Hora. Empieza con las oraciones del Trisagio cuando formen parte de tu regla.'],
        ['text','Venid, adoremos a Dios, nuestro Rey. Venid, adoremos y postrémonos ante Cristo, nuestro Rey y nuestro Dios. Venid, adoremos y postrémonos ante el mismo Cristo, nuestro Rey y nuestro Dios.'],
        ['text','¿Cómo te llamaremos, llena de gracia? Cielo, porque de ti salió el Sol de justicia. Paraíso, porque brotó de ti la Flor de la inmortalidad. Virgen, porque permaneciste sin mancha. Madre pura, porque en tu santo abrazo tuviste a tu Hijo, Dios de todos. Ruégale que salve nuestras almas.'],
        ['text','Ordena mis pasos en tu palabra, y ninguna maldad se enseñoreará de mí. Líbrame de la opresión de los hombres, y guardaré tus mandamientos. Haz resplandecer tu rostro sobre tu siervo, y enséñame tus estatutos.'],
        ['text','Llénese mi boca de tu alabanza, Señor, para cantar tu gloria y tu honor todo el día.'],
        ['text','Cristo Dios nuestro, tú que en todo tiempo y a toda hora eres adorado y glorificado en el cielo y en la tierra; paciente, rico en misericordia y compasión; que amas al justo y tienes piedad del que está endurecido en el pecado; que llamas a todos al arrepentimiento con la promesa de los bienes que vendrán: recibe también ahora nuestras súplicas y dirige nuestra vida según tus mandamientos. Santifica nuestras almas, purifica nuestros cuerpos, endereza nuestra mente y líbranos de toda calamidad, ira y angustia. Rodéanos con tus santos ángeles, para que, guiados y guardados por ellos, lleguemos a la unidad de la fe y a contemplar tu gloria inefable. Porque bendito eres por los siglos de los siglos. Amén.'],
        ['text','Más honorable que los querubines e incomparablemente más gloriosa que los serafines, tú que sin corrupción diste a luz a Dios el Verbo, verdadera Madre de Dios, te magníficamos.'],
        ['text','Cristo, luz verdadera, que iluminas y santificas a todo hombre que viene al mundo: haz brillar sobre nosotros la luz de tu rostro, para que en ella veamos la luz inefable, y guía bien nuestros pasos para guardar tus mandamientos, por las súplicas de tu Madre purísima y de todos los santos. Amén.'],
        ['rubric','Oración de san Efrén el Sirio. Al final de cada frase, una reverencia.'],
        ['text','Señor y Dueño de mi vida, no me des espíritu de pereza, de desaliento, de afán de poder ni de hablar en vano.'],
        ['text','Dame más bien a mí, tu siervo, espíritu de castidad, de humildad, de paciencia y de amor.'],
        ['text','Sí, Señor y Rey, concédeme ver mis propias faltas y no juzgar a mi hermano. Porque bendito eres por los siglos de los siglos. Amén.'],
        ['rubric','Después, doce veces: Oh Dios, límpiame a mí, pecador. Luego se dice otra vez toda la oración.']
      ]
    },
    evening: {
      titleEs: 'Oraciones de la noche',
      blurbEs: 'De Completas: el día ya pasó, el Credo y los himnos de la noche.',
      blocksEs: [
        ['rubric','Del oficio de Completas. Empieza con las oraciones del Trisagio cuando formen parte de tu regla.'],
        ['text','El día ya pasó. Te doy gracias, Señor. Te ruego que esta tarde y esta noche no caiga en pecado, y sálvame, Salvador mío.'],
        ['text','El día ya pasó. Te alabo, Dueño mío. Te ruego que esta tarde y esta noche esté sin engaño, y sálvame, Salvador.'],
        ['text','El día ya pasó. Te canto, Santo. Te ruego que esta tarde y esta noche no me venza la tentación, y sálvame, Salvador.'],
        ['text','Con cantos que no cesan, las potestades incorpóreas de los querubines te glorifican. Los seres de seis alas, los serafines, te exaltan sin descanso. Con cantos tres veces santos, todo el ejército de los ángeles te alaba. Porque tú eres el Padre antes de todos los siglos, y tienes contigo a tu Hijo, que también es desde la eternidad, y al Espíritu de vida, igual en honor, y manifiestas la Trinidad indivisible. Virgen santísima, Madre de Dios, y vosotros, testigos y servidores del Verbo, con todo el coro de los profetas y los mártires que alcanzaron la vida inmortal: orad con fervor por todos nosotros, porque estamos en gran apuro, para que, libres de las trampas del maligno, cantemos fuerte el himno de los ángeles: Santo, Santo, Santo, Señor tres veces santo, ten piedad de nosotros y sálvanos. Amén.'],
        ['text','Creo en un solo Dios, Padre todopoderoso, Creador del cielo y de la tierra, de todo lo visible y lo invisible. Y en un solo Señor, Jesucristo, Hijo único de Dios, nacido del Padre antes de todos los siglos. Luz de Luz, Dios verdadero de Dios verdadero, engendrado, no creado, de la misma esencia que el Padre, por quien todo fue hecho. Que por nosotros y por nuestra salvación bajó del cielo, y por el Espíritu Santo se encarnó de la Virgen María, y se hizo hombre. Fue crucificado por nosotros bajo Poncio Pilato, padeció y fue sepultado. Y resucitó al tercer día, conforme a las Escrituras. Y subió al cielo, y está sentado a la derecha del Padre. Y vendrá otra vez con gloria a juzgar a vivos y muertos, y su reino no tendrá fin. Y en el Espíritu Santo, Señor y dador de vida, que procede del Padre, que con el Padre y el Hijo es adorado y glorificado, y que habló por los profetas. En una Iglesia santa, católica y apostólica. Confieso un solo bautismo para el perdón de los pecados. Espero la resurrección de los muertos y la vida del mundo venidero. Amén.'],
        ['text','Soberana santísima, Madre de Dios, ruega por nosotros, pecadores.'],
        ['text','Ejército celestial de ángeles y arcángeles, rogad por nosotros, pecadores.'],
        ['text','San Juan, profeta, precursor y bautista de nuestro Señor Jesucristo, ruega por nosotros, pecadores.'],
        ['text','Santos y gloriosos apóstoles, profetas y mártires, y todos los santos, rogad por nosotros, pecadores.'],
        ['text','Oh Dios, límpianos a nosotros, pecadores, y ten piedad de nosotros.'],
        ['text','Ilumina mis ojos, Cristo Dios mío, para que no duerma hacia la muerte, no sea que mi enemigo diga: pude contra él.'],
        ['text','Sé tú el defensor de mi alma, Dios, porque camino entre muchas trampas. Líbrame de ellas y sálvame, tú que eres bueno y amas al ser humano.'],
        ['text','Y como por nuestras muchas faltas no tenemos osadía, tú, Virgen Madre de Dios, ruégale con fervor al que nació de ti, porque la oración de una madre alcanza mucho ante la bondad del Dueño. No desprecies las súplicas de los pecadores, Purísima, porque es bondadoso y poderoso para salvar el que quiso padecer por nosotros.'],
        ['text','Tú conoces, Señor, mi Creador, la vigilancia sin sueño de mis enemigos invisibles y la fragilidad de mi carne. En tus manos encomiendo mi espíritu. Cúbreme con las alas de tu bondad, para que no duerma hacia la muerte, e ilumina los ojos de mi entendimiento, para que me goce en tus palabras divinas. Y haz que, en el tiempo que te agrade, te glorifique con alabanza, a ti, el único bueno, que amas al ser humano.']
      ]
    },
    trisagion: {
      titleEs: 'Oraciones del Trisagio',
      blurbEs: 'El comienzo de costumbre de las oraciones de la Iglesia.',
      blocksEs: [
        ['rubric','El comienzo de costumbre, como está en el libro de servicios. Desde Pascua hasta Pentecostés no se dice “Rey celestial”.'],
        ['text','Gloria a ti, Dios nuestro, gloria a ti.'],
        ['text','Rey celestial, Consolador, Espíritu de verdad, que estás en todas partes y lo llenas todo, tesoro de bienes y dador de vida: ven y habita en nosotros, límpianos de toda mancha y salva, Bondadoso, nuestras almas.'],
        ['rubric','Tres veces, cada una con la señal de la cruz y una reverencia.'],
        ['text','Santo Dios, Santo Fuerte, Santo Inmortal, ten piedad de nosotros.'],
        ['text','Gloria al Padre, y al Hijo, y al Espíritu Santo, ahora y siempre y por los siglos de los siglos. Amén.'],
        ['text','Trinidad santísima, ten piedad de nosotros. Señor, lava nuestros pecados. Dueño, perdona nuestras faltas. Santo, visita y sana nuestras enfermedades, por tu Nombre.'],
        ['rubric','Señor, ten piedad. Tres veces.'],
        ['text','Gloria al Padre, y al Hijo, y al Espíritu Santo, ahora y siempre y por los siglos de los siglos. Amén.'],
        ['text','Padre nuestro, que estás en los cielos, santificado sea tu Nombre. Venga tu reino. Hágase tu voluntad en la tierra como en el cielo. El pan nuestro de cada día, dánoslo hoy. Y perdónanos nuestras deudas, así como nosotros perdonamos a nuestros deudores. Y no nos dejes caer en la tentación, mas líbranos del maligno.'],
        ['text','Porque tuyo es el reino, el poder y la gloria, del Padre, y del Hijo, y del Espíritu Santo, ahora y siempre y por los siglos de los siglos. Amén.']
      ]
    },
    meals: {
      titleEs: 'Oraciones antes y después de comer',
      blurbEs: 'La bendición del pan en la vigilia, y la acción de gracias que la sigue.',
      blocksEs: [
        ['rubric','Antes de la comida. La bendición de los panes en la vigilia de toda la noche, dicha sobre la comida.'],
        ['text','Señor Jesucristo, Dios nuestro, que bendijiste los cinco panes y con ellos alimentaste a los cinco mil: bendice también estos panes, el trigo, el vino y el aceite. Multiplícalos en esta casa santa y en todo tu mundo, y santifica a todos los fieles que van a participar de ellos. Porque tú, Cristo Dios nuestro, bendices, santificas y alimentas todas las cosas, y a ti te damos gloria, con tu Padre que no tiene principio, y tu Espíritu santísimo, bueno y dador de vida, ahora y siempre y por los siglos de los siglos. Amén.'],
        ['rubric','Después de la comida. Del cierre de esa misma bendición.'],
        ['text','Bendito sea el Nombre del Señor, desde ahora y para siempre.'],
        ['text','Gustad, y ved que es bueno Jehová: dichoso el hombre que confiará en él. Temed a Jehová, vosotros sus santos, porque nada falta a los que le temen.'],
        ['text','Gloria a ti, Cristo Dios nuestro, esperanza nuestra, gloria a ti.'],
        ['text','Por las oraciones de nuestros santos padres, Señor Jesucristo, Dios nuestro, ten piedad de nosotros. Amén.']
      ]
    },
    communion: {
      titleEs: 'Oraciones antes de la Sagrada Comunión',
      blurbEs: 'Las oraciones que se dicen justo antes de recibir los Santos Misterios.',
      blocksEs: [
        ['rubric','De las “Oraciones de preparación para la Sagrada Comunión” y de la comunión en la Liturgia. Se dicen después de la confesión y del ayuno de la Iglesia, como te indique tu sacerdote.'],
        ['text','Creo, Señor, y confieso que tú eres en verdad el Cristo, el Hijo del Dios vivo, que viniste al mundo a salvar a los pecadores, de los cuales yo soy el primero. Y creo que esto es de verdad tu Cuerpo purísimo, y que esto es tu Sangre preciosa. Por eso te ruego: ten piedad de mí y perdona mis faltas, voluntarias e involuntarias, de palabra o de obra, cometidas a sabiendas o por ignorancia. Y concédeme participar sin condenación de tus Misterios purísimos, para perdón de mis pecados y para vida eterna. Amén.'],
        ['text','De tu Cena mística, Hijo de Dios, recíbeme hoy como comulgante. Porque no hablaré de tu Misterio a tus enemigos, ni te daré un beso como Judas, sino que, como el ladrón, te confesaré: acuérdate de mí, Señor, en tu reino.'],
        ['text','Que esta participación en tus Santos Misterios no sea para juicio ni para condenación, Señor, sino para la sanidad del alma y del cuerpo.'],
        ['rubric','Oración de san Juan Damasceno.'],
        ['text','Estoy ante las puertas de tu templo y no me aparto de los malos pensamientos. Pero, Cristo Dios, que justificaste al publicano, tuviste misericordia de la mujer de Canaán y abriste las puertas del paraíso al ladrón: ábreme también tu bondad y recíbeme, que vengo y te toco, como recibiste a la mujer pecadora y a la que padecía flujo de sangre. Una, al tocar el borde de tu manto, recibió la salud completa. La otra, abrazando tus pies purísimos, se llevó el perdón de sus pecados. Que yo no me consuma, aunque sea digno de toda condena, por atreverme a recibir tu Cuerpo. Recíbeme como las recibiste a ellas, e ilumina mis sentidos espirituales, consumiendo mis ofensas, por las oraciones de la que te dio a luz sin semilla y de las potestades celestiales. Porque bendito eres por los siglos de los siglos. Amén.']
      ]
    }
  };
  for (const item of PRAYERS) Object.assign(item, PRAYER_ES[item.id] || {});

  /* The daily rule on the Pray tab: Scripture and plain prayer only. */
  const SCRIPTURE_PRAYERS = [
    {
      id:'our-father',
      title:'The Lord’s Prayer',
      titleEs:'El Padrenuestro',
      blurb:'The prayer Jesus taught, from Matthew 6.',
      blurbEs:'La oración que Jesús enseñó, de Mateo 6.',
      blocks:[
        ['rubric','Matthew 6:9–13. Pray it slowly, one line at a time.'],
        ['text','After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name. Thy kingdom come. Thy will be done in earth, as it is in heaven. Give us this day our daily bread. And forgive us our debts, as we forgive our debtors. And lead us not into temptation, but deliver us from evil: For thine is the kingdom, and the power, and the glory, for ever. Amen.']
      ],
      blocksEs:[
        ['rubric','Mateo 6:9–13. Óralo despacio, una línea a la vez.'],
        ['text','Vosotros pues, oraréis así: Padre nuestro que estás en los cielos, santificado sea tu nombre. Venga tu reino. Sea hecha tu voluntad, como en el cielo, así también en la tierra. Danos hoy nuestro pan cotidiano. Y perdónanos nuestras deudas, como también nosotros perdonamos á nuestros deudores. Y no nos metas en tentación, mas líbranos del mal: porque tuyo es el reino, y el poder, y la gloria, por todos los siglos. Amén.']
      ]
    },
    {
      id:'morning-psalms',
      title:'Morning: new mercies',
      titleEs:'En la mañana: misericordias nuevas',
      blurb:'Three short verses to start the day, then your own words.',
      blurbEs:'Tres versículos cortos para empezar el día, y después tus propias palabras.',
      blocks:[
        ['rubric','Psalm 5:3'],
        ['text','My voice shalt thou hear in the morning, O LORD; In the morning will I direct my prayer unto thee, and will look up.'],
        ['rubric','Lamentations 3:22–23'],
        ['text','It is of the LORD\'s mercies that we are not consumed, Because his compassions fail not. They are new every morning: Great is thy faithfulness.'],
        ['rubric','Psalm 143:8'],
        ['text','Cause me to hear thy lovingkindness in the morning; For in thee do I trust: Cause me to know the way wherein I should walk; For I lift up my soul unto thee.'],
        ['rubric','Then tell Him plainly what today holds, and ask for what you need.']
      ],
      blocksEs:[
        ['rubric','Salmo 5:3'],
        ['text','Oh Jehová, de mañana oirás mi voz; de mañana me presentaré á ti, y esperaré.'],
        ['rubric','Lamentaciones 3:22–23'],
        ['text','Es por la misericordia de Jehová que no somos consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.'],
        ['rubric','Salmo 143:8'],
        ['text','Hazme oir por la mañana tu misericordia, porque en ti he confiado: hazme saber el camino por donde ande, porque á ti he alzado mi alma.'],
        ['rubric','Luego cuéntale con sencillez lo que trae el día, y pídele lo que necesitas.']
      ]
    },
    {
      id:'evening-psalms',
      title:'Evening: lie down in peace',
      titleEs:'En la noche: en paz me acostaré',
      blurb:'Hand the day back to God and rest.',
      blurbEs:'Devuélvele el día a Dios y descansa.',
      blocks:[
        ['rubric','Psalm 141:2'],
        ['text','Let my prayer be set forth before thee as incense; And the lifting up of my hands as the evening sacrifice.'],
        ['rubric','Thank Him for one good thing from today. Name one thing you need to let go of.'],
        ['rubric','Psalm 4:8'],
        ['text','I will both lay me down in peace, and sleep: For thou, LORD, only makest me dwell in safety.']
      ],
      blocksEs:[
        ['rubric','Salmo 141:2'],
        ['text','Sea enderezada mi oración delante de ti como un perfume, el don de mis manos como la ofrenda de la tarde.'],
        ['rubric','Dale gracias por una cosa buena de hoy. Nombra una cosa que necesitas soltar.'],
        ['rubric','Salmo 4:8'],
        ['text','En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me harás estar confiado.']
      ]
    },
    {
      id:'table',
      title:'At the table',
      titleEs:'En la mesa',
      blurb:'A verse before the meal and a thank-you after.',
      blurbEs:'Un versículo antes de comer y un gracias después.',
      blocks:[
        ['rubric','Before the meal. Psalm 145:15–16'],
        ['text','The eyes of all wait upon thee; And thou givest them their meat in due season. Thou openest thine hand, And satisfiest the desire of every living thing.'],
        ['rubric','After the meal. Psalm 107:1'],
        ['text','O give thanks unto the LORD, for he is good: For his mercy endureth for ever.']
      ],
      blocksEs:[
        ['rubric','Antes de comer. Salmo 145:15–16'],
        ['text','Los ojos de todos esperan en ti, y tú les das su comida en su tiempo. Abres tu mano, y colmas de bendición á todo viviente.'],
        ['rubric','Después de comer. Salmo 107:1'],
        ['text','Alabad á Jehová, porque es bueno; porque para siempre es su misericordia.']
      ]
    },
    PRAYERS.find(item => item.id === 'workday')
  ].filter(Boolean);
  /* The Church's older prayers (Hapgood). They sit in the rule beside the Scripture prayers and are listed again under Go deeper. */
  const OLDER_PRAYERS = PRAYERS.filter(item => item.id !== 'workday');
  const RULE_PRAYERS = SCRIPTURE_PRAYERS.concat(OLDER_PRAYERS);

  const DEFAULT_RULE = SCRIPTURE_PRAYERS.map(item => item.id);
  let openId = '';
  let wakeSentinel = null;
  let practiceOpen = false;

  function todayKey(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function readJson(key){
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  }
  function ropeTotal(rope){
    if (rope.preset === 'custom') {
      const n = Math.round(Number(rope.custom));
      if (n >= 1 && n <= 500) return n;
    }
    if (rope.preset === 50 || rope.preset === 100 || rope.preset === 33) return rope.preset;
    return 33;
  }
  function loadRope(){
    const saved = readJson(ROPE_KEY) || {};
    const rope = {
      preset: saved.preset === 'custom' || saved.preset === 50 || saved.preset === 100 ? saved.preset : 33,
      custom: Math.round(Number(saved.custom)) || 33,
      count: Math.max(0, Math.round(Number(saved.count)) || 0),
      ropes: Math.max(0, Math.round(Number(saved.ropes)) || 0),
      today: Math.max(0, Math.round(Number(saved.today)) || 0),
      complete: !!saved.complete,
      day: typeof saved.day === 'string' ? saved.day : ''
    };
    if (rope.day !== todayKey()) {
      rope.count = 0;
      rope.ropes = 0;
      rope.today = 0;
      rope.complete = false;
      rope.day = todayKey();
      writeJson(ROPE_KEY, rope);
    }
    if (rope.count > ropeTotal(rope)) rope.count = 0;
    return rope;
  }
  function loadRule(){
    const saved = readJson(RULE_KEY) || {};
    /* Keep every saved id, including ids this version does not show, so an older or newer rule is never wiped. */
    const included = Array.isArray(saved.included)
      ? Array.from(new Set(saved.included.filter(id => typeof id === 'string' && id)))
      : DEFAULT_RULE.slice();
    const rule = {
      included,
      day: typeof saved.day === 'string' ? saved.day : '',
      done: saved.done && typeof saved.done === 'object' ? saved.done : {}
    };
    if (!Array.isArray(saved.included)) rule.included = DEFAULT_RULE.slice();
    if (rule.day !== todayKey()) {
      rule.done = {};
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
    }
    return rule;
  }
  function knotLabel(rope){
    const total = ropeTotal(rope);
    if (esPrayer()) {
      if (rope.complete) return `${total} de ${total}. Cordón completo.`;
      return `${rope.count} de ${total}.`;
    }
    if (rope.complete) return `${total} of ${total}. Rope complete.`;
    return `${rope.count} of ${total}.`;
  }
  function ropeHtml(){
    const rope = loadRope();
    const total = ropeTotal(rope);
    const sizes = [33, 50, 100];
    const wake = practiceOpen && typeof navigator !== 'undefined' && navigator.wakeLock ? '<p class="rope-wake">The screen stays awake while this page is open.</p>' : '';
    return `<section class="card prayer-rope" id="prayer-rope"><span class="eyebrow">THE JESUS PRAYER</span><h2>Prayer rope</h2><p class="muted">Choose the knots, then tap once for each. A short pulse marks a knot. A stronger pulse marks a finished rope. Today’s count stays on this device.</p><div class="rope-sizes" role="group" aria-label="Knots on the rope">${sizes.map(size => `<button type="button" class="rope-size ${rope.preset===size?'active':''}" data-rope-size="${size}" aria-pressed="${rope.preset===size}">${size}</button>`).join('')}<button type="button" class="rope-size ${rope.preset==='custom'?'active':''}" data-rope-size="custom" aria-pressed="${rope.preset==='custom'}">Custom</button></div>${rope.preset==='custom'?`<label class="rope-custom">Custom knots<input id="rope-custom" type="number" min="1" max="500" inputmode="numeric" value="${esc(rope.custom)}" aria-label="Custom knot count"></label>`:''}<button type="button" class="rope-tap ${rope.complete?'rope-complete':''}" data-rope-tap aria-label="Advance one knot. ${esc(knotLabel(rope))} ${esc(ropePrayer())}"><span class="rope-prayer">${esc(ropePrayer())}</span><strong class="rope-count">${rope.complete?total:rope.count}<small> / ${total}</small></strong><span class="rope-hint">${rope.complete?'Rope complete. Tap to begin the next.':'Tap for the next knot'}</span></button><div class="rope-stats"><div><strong>${rope.ropes}</strong><small>${rope.ropes===1?'rope':'ropes'} completed</small></div><div><strong>${rope.today}</strong><small>knots today</small></div></div><p id="rope-live" class="visually-hidden" aria-live="polite"></p>${wake}</section>`;
  }
  function prayerBody(item){
    return item.blocks.map(([kind, text]) => kind==='rubric' ? `<p class="prayer-rubric">${esc(text)}</p>` : `<p>${esc(text)}</p>`).join('');
  }
  function esPrayer(){ return !!(window.MsbI18n && MsbI18n.lang() === 'es'); }
  function ropePrayer(){
    return esPrayer()
      ? 'Señor Jesucristo, Hijo de Dios, ten misericordia de mí, pecador.'
      : 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.';
  }
  function prayerView(item){
    if (!esPrayer() || !item || !item.titleEs) return item;
    return { id: item.id, title: item.titleEs, blurb: item.blurbEs || item.blurb, blocks: item.blocksEs || item.blocks };
  }
  function ruleHtml(){
    const rule = loadRule();
    const inRule = RULE_PRAYERS.filter(item => rule.included.includes(item.id));
    const doneCount = inRule.filter(item => rule.done[item.id]).length;
    const row = item => {
      const view = prayerView(item);
      const included = rule.included.includes(item.id);
      const done = !!rule.done[item.id];
      const open = openId === item.id;
      return `<article class="rule-row ${included?'':'rule-off'}"><div class="rule-top"><label class="rule-include"><input type="checkbox" data-prayer-rule="${item.id}" ${included?'checked':''}><span>In my rule</span></label><label class="rule-done"><input type="checkbox" data-prayer-done="${item.id}" ${done?'checked':''} ${included?'':'disabled'}><span>Prayed today</span></label></div><h3>${esc(view.title)}</h3><p class="muted">${esc(view.blurb)}</p><button type="button" class="secondary" data-prayer-open="${item.id}" aria-expanded="${open}">${open?(esPrayer()?'Cerrar el texto':'Close the text'):(esPrayer()?`Leer: ${esc(view.title)}`:`Read ${esc(view.title)}`)}</button>${open?`<div class="prayer-text" id="prayer-text-${item.id}">${prayerBody(view)}</div>`:''}</article>`;
    };
    const rows = SCRIPTURE_PRAYERS.map(row).join('')
      + `<h3 class="rule-group">${esPrayer() ? 'Las oraciones antiguas de la Iglesia' : 'The Church’s older prayers'}</h3>`
      + OLDER_PRAYERS.map(row).join('');
    const source = esPrayer()
      ? '<p class="prayer-source">Escritura de la Reina-Valera 1909. Oraciones antiguas en inglés de Isabel Florence Hapgood, <cite>Service Book of the Holy Orthodox-Catholic Apostolic Church</cite> (Houghton, Mifflin and Company, 1906), de dominio público. La versión en español sigue esos textos.</p>'
      : '<p class="prayer-source">Scripture from the King James Version. Older prayers from Isabel Florence Hapgood, <cite>Service Book of the Holy Orthodox-Catholic Apostolic Church</cite> (Houghton, Mifflin and Company, 1906). That translation is in the public domain.</p>';
    return `<section class="card prayer-rule" id="prayer-rule"><span class="eyebrow">A DAILY RULE</span><h2>Prayer rule</h2><p class="muted">Choose which prayers belong in your rule. Check off the ones you pray today. The list clears after midnight on this device.</p><p class="rule-progress">${inRule.length?(esPrayer()?`${doneCount} de ${inRule.length} oradas hoy`:`${doneCount} of ${inRule.length} prayed today`):(esPrayer()?'Agrega al menos una oración a tu regla.':'Add at least one prayer to your rule.')}</p><div class="rule-list">${rows}</div>${source}</section>`;
  }
  function deeperHtml(){
    const rows = OLDER_PRAYERS.map(item => {
      const view = prayerView(item);
      const open = openId === item.id;
      return `<article class="rule-row"><h3>${esc(view.title)}</h3><p class="muted">${esc(view.blurb)}</p><button type="button" class="secondary" data-prayer-open="${item.id}" aria-expanded="${open}">${open ? (esPrayer() ? 'Cerrar el texto' : 'Close the text') : (esPrayer() ? `Leer: ${esc(view.title)}` : `Read ${esc(view.title)}`)}</button>${open ? `<div class="prayer-text" id="prayer-text-${item.id}">${prayerBody(view)}</div>` : ''}</article>`;
    }).join('');
    const intro = esPrayer()
      ? '<p class="muted">Estas son oraciones que los cristianos han orado por muchos siglos: las Horas, las Completas, el Trisagio y las oraciones antes de la Comunión. Puedes leerlas sin prisa, cuando quieras.</p>'
      : '<p class="muted">Prayers Christians have prayed for many centuries: the Hours, Compline, the Trisagion, and the prayers before Communion. Read them slowly, whenever you like.</p>';
    const source = esPrayer()
      ? '<p class="prayer-source">Textos en inglés de Isabel Florence Hapgood, <cite>Service Book of the Holy Orthodox-Catholic Apostolic Church</cite> (Houghton, Mifflin and Company, 1906), de dominio público. La versión en español sigue esos textos.</p>'
      : '<p class="prayer-source">Texts from Isabel Florence Hapgood, <cite>Service Book of the Holy Orthodox-Catholic Apostolic Church</cite> (Houghton, Mifflin and Company, 1906). That translation is in the public domain. Modern service-book translations are not used here.</p>';
    return `<section class="card prayer-rule" id="prayer-deeper"><span class="eyebrow">${esPrayer() ? 'ORACIONES ANTIGUAS' : 'OLDER PRAYERS'}</span><h2>${esPrayer() ? 'Las oraciones antiguas de la Iglesia' : 'The Church’s older prayers'}</h2>${intro}<div class="rule-list">${rows}</div>${source}</section>`;
  }
  function html(){ return ropeHtml() + ruleHtml(); }
  function paint(){
    const rope = document.getElementById('prayer-rope');
    const rule = document.getElementById('prayer-rule');
    const deeper = document.getElementById('prayer-deeper');
    if (rope) rope.outerHTML = ropeHtml();
    if (deeper) deeper.outerHTML = deeperHtml();
    if (rule) rule.outerHTML = ruleHtml();
    if (window.MsbI18n) {
      ['prayer-rope', 'prayer-rule', 'prayer-deeper'].forEach(id => {
        const node = document.getElementById(id);
        if (node) MsbI18n.apply(node);
      });
    }
  }
  function announce(message){
    const live = document.getElementById('rope-live');
    if (live) live.textContent = message;
  }
  function advance(){
    const rope = loadRope();
    const total = ropeTotal(rope);
    if (rope.complete) {
      rope.complete = false;
      rope.count = 1;
      rope.today += 1;
      if (window.haptic) window.haptic();
    } else {
      rope.count += 1;
      rope.today += 1;
      if (rope.count >= total) {
        rope.count = total;
        rope.complete = true;
        rope.ropes += 1;
        if (window.hapticStrong) window.hapticStrong();
        else if (window.haptic) window.haptic();
      } else if (window.haptic) window.haptic();
    }
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
    if (rope.complete) announce(`Rope complete. ${rope.ropes} ${rope.ropes===1?'rope':'ropes'} today. ${rope.today} knots today.`);
    else announce(`Knot ${rope.count} of ${total}. ${rope.today} knots today.`);
  }
  function setPreset(preset){
    const rope = loadRope();
    rope.preset = preset === 'custom' ? 'custom' : Number(preset);
    rope.count = 0;
    rope.complete = false;
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
    if (preset === 'custom') document.getElementById('rope-custom')?.focus();
  }
  function setCustom(value){
    const rope = loadRope();
    const n = Math.round(Number(value));
    if (!(n >= 1 && n <= 500)) return;
    rope.preset = 'custom';
    rope.custom = n;
    rope.count = 0;
    rope.complete = false;
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
  }
  async function acquireWake(){
    if (!practiceOpen || !navigator.wakeLock) return;
    try {
      wakeSentinel = await navigator.wakeLock.request('screen');
    } catch { wakeSentinel = null; }
  }
  async function releaseWake(){
    const sentinel = wakeSentinel;
    wakeSentinel = null;
    if (!sentinel) return;
    try { await sentinel.release(); } catch { /* already released */ }
  }
  function onShow(){ practiceOpen = true; acquireWake(); }
  function onHide(){ practiceOpen = false; releaseWake(); }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquireWake();
  });
  document.addEventListener('click', event => {
    const size = event.target.closest('[data-rope-size]');
    if (size && size.closest('#prayer-rope')) { setPreset(size.dataset.ropeSize); return; }
    const tap = event.target.closest('[data-rope-tap]');
    if (tap) { advance(); return; }
    const open = event.target.closest('[data-prayer-open]');
    if (open && open.closest('#prayer-rule, #prayer-deeper')) {
      openId = openId === open.dataset.prayerOpen ? '' : open.dataset.prayerOpen;
      paint();
      if (openId) document.getElementById(`prayer-text-${openId}`)?.scrollIntoView({block:'nearest'});
    }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === 'rope-custom') { setCustom(target.value); return; }
    if (target.dataset.prayerRule) {
      const rule = loadRule();
      const id = target.dataset.prayerRule;
      rule.included = target.checked ? Array.from(new Set([...rule.included, id])) : rule.included.filter(item => item !== id);
      if (!target.checked) delete rule.done[id];
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
      paint();
      return;
    }
    if (target.dataset.prayerDone) {
      const rule = loadRule();
      const id = target.dataset.prayerDone;
      if (!rule.included.includes(id)) return;
      if (target.checked) rule.done[id] = true;
      else delete rule.done[id];
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
      paint();
    }
  });
  window.MsbPrayers = { html, deeperHtml, onShow, onHide };
})();
