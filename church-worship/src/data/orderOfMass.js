/**
 * The Order of Mass — the parts the congregation says or sings, in order.
 *
 * Every prayer ships in two public-domain forms:
 *  - `en`: traditional English — the long-standing Catholic translations
 *    (Gloria, Creeds, Sanctus, Agnus Dei, "Lord, I am not worthy…"), and for
 *    the texts that are newer than those, a plain rendering of the Latin in
 *    the same register. The short dialogues use the current responses.
 *  - `la`: the Latin of the Missale Romanum.
 *
 * The current English translation of the Roman Missal (© ICEL) is not
 * included. A parish pastes its own texts once on the Prayers page, under its
 * diocese's licence, and they are used from then on (see `useContent.prayers`).
 *
 * Lines starting "R. " are the people's response. `{gospel}` is filled with
 * the evangelist of the day.
 */

export const SECTIONS = [
  'Introductory Rites',
  'Liturgy of the Word',
  'Liturgy of the Eucharist',
  'Communion Rite',
  'Concluding Rites',
]

/**
 * `when` decides whether a part belongs at a given Mass:
 *  - 'always'
 *  - 'gloria': Sundays outside Advent and Lent, solemnities and feasts
 *  - 'creed': Sundays and solemnities
 * `slot` marks where the readings and hymns go.
 */
export const ORDER = [
  // --- Introductory Rites ---
  { id: 'hymn-entrance', section: 0, title: 'Entrance Hymn', slot: 'hymn' },
  {
    id: 'sign-greeting',
    section: 0,
    title: 'Sign of the Cross and Greeting',
    en: `In the name of the Father, and of the Son, and of the Holy Spirit.
R. Amen.

The Lord be with you.
R. And with your spirit.`,
    la: `In nomine Patris, et Filii, et Spiritus Sancti.
R. Amen.

Dominus vobiscum.
R. Et cum spiritu tuo.`,
  },
  {
    id: 'confiteor',
    section: 0,
    title: 'Penitential Act',
    en: `I confess to almighty God, and to you, my brethren, that I have sinned exceedingly in thought, word, deed and omission: through my fault, through my fault, through my most grievous fault.
Therefore I beseech blessed Mary ever Virgin, all the Angels and Saints, and you, my brethren, to pray for me to the Lord our God.

May almighty God have mercy on us, forgive us our sins, and bring us to life everlasting.
R. Amen.`,
    la: `Confiteor Deo omnipotenti et vobis, fratres, quia peccavi nimis cogitatione, verbo, opere et omissione: mea culpa, mea culpa, mea maxima culpa.
Ideo precor beatam Mariam semper Virginem, omnes Angelos et Sanctos, et vos, fratres, orare pro me ad Dominum Deum nostrum.

Misereatur nostri omnipotens Deus et, dimissis peccatis nostris, perducat nos ad vitam aeternam.
R. Amen.`,
  },
  {
    id: 'kyrie',
    section: 0,
    title: 'Kyrie',
    en: `Lord, have mercy.
R. Lord, have mercy.
Christ, have mercy.
R. Christ, have mercy.
Lord, have mercy.
R. Lord, have mercy.`,
    la: `Kyrie, eleison.
R. Kyrie, eleison.
Christe, eleison.
R. Christe, eleison.
Kyrie, eleison.
R. Kyrie, eleison.`,
  },
  {
    id: 'gloria',
    section: 0,
    title: 'Gloria',
    when: 'gloria',
    en: `Glory be to God on high, and on earth peace to men of good will.
We praise thee. We bless thee. We adore thee. We glorify thee. We give thee thanks for thy great glory.
O Lord God, heavenly King, God the Father almighty. O Lord Jesus Christ, the only-begotten Son.
O Lord God, Lamb of God, Son of the Father, who takest away the sins of the world, have mercy on us. Who takest away the sins of the world, receive our prayer. Who sittest at the right hand of the Father, have mercy on us.
For thou only art holy. Thou only art the Lord. Thou only, O Jesus Christ, together with the Holy Ghost, art most high in the glory of God the Father. Amen.`,
    la: `Gloria in excelsis Deo et in terra pax hominibus bonae voluntatis.
Laudamus te, benedicimus te, adoramus te, glorificamus te, gratias agimus tibi propter magnam gloriam tuam,
Domine Deus, Rex caelestis, Deus Pater omnipotens. Domine Fili unigenite, Iesu Christe,
Domine Deus, Agnus Dei, Filius Patris, qui tollis peccata mundi, miserere nobis; qui tollis peccata mundi, suscipe deprecationem nostram. Qui sedes ad dexteram Patris, miserere nobis.
Quoniam tu solus Sanctus, tu solus Dominus, tu solus Altissimus, Iesu Christe, cum Sancto Spiritu: in gloria Dei Patris. Amen.`,
  },

  // --- Liturgy of the Word ---
  { id: 'readings', section: 1, title: 'Readings', slot: 'readings' },
  {
    id: 'gospel-dialogue',
    section: 1,
    title: 'Before the Gospel',
    slot: 'before-gospel',
    en: `The Lord be with you.
R. And with your spirit.
A reading from the holy Gospel according to {gospel}.
R. Glory to you, O Lord.`,
    la: `Dominus vobiscum.
R. Et cum spiritu tuo.
Lectio sancti Evangelii secundum {gospel}.
R. Gloria tibi, Domine.`,
  },
  {
    id: 'creed',
    section: 1,
    title: 'Profession of Faith',
    when: 'creed',
    choices: { nicene: 'Nicene Creed', apostles: "Apostles' Creed" },
    en: {
      nicene: `I believe in one God, the Father almighty, maker of heaven and earth, and of all things visible and invisible.
And in one Lord Jesus Christ, the only-begotten Son of God, born of the Father before all ages; God of God, light of light, true God of true God; begotten, not made; consubstantial with the Father, by whom all things were made.
Who for us men, and for our salvation, came down from heaven, and was incarnate by the Holy Ghost of the Virgin Mary: and was made man.
He was crucified also for us, suffered under Pontius Pilate, and was buried. And the third day he rose again according to the Scriptures; and ascended into heaven, and sitteth at the right hand of the Father. And he shall come again with glory to judge the living and the dead; of whose kingdom there shall be no end.
And in the Holy Ghost, the Lord and giver of life, who proceedeth from the Father and the Son; who together with the Father and the Son is adored and glorified; who spoke by the prophets.
And one holy, catholic and apostolic Church. I confess one baptism for the remission of sins. And I look for the resurrection of the dead, and the life of the world to come. Amen.`,
      apostles: `I believe in God, the Father almighty, Creator of heaven and earth; and in Jesus Christ, his only Son, our Lord;
who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried.
He descended into hell; the third day he rose again from the dead; he ascended into heaven, and sitteth at the right hand of God the Father almighty; from thence he shall come to judge the living and the dead.
I believe in the Holy Ghost, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.`,
    },
    la: {
      nicene: `Credo in unum Deum, Patrem omnipotentem, factorem caeli et terrae, visibilium omnium et invisibilium.
Et in unum Dominum Iesum Christum, Filium Dei unigenitum, et ex Patre natum ante omnia saecula. Deum de Deo, lumen de lumine, Deum verum de Deo vero, genitum, non factum, consubstantialem Patri: per quem omnia facta sunt.
Qui propter nos homines et propter nostram salutem descendit de caelis. Et incarnatus est de Spiritu Sancto ex Maria Virgine, et homo factus est.
Crucifixus etiam pro nobis sub Pontio Pilato; passus et sepultus est, et resurrexit tertia die, secundum Scripturas, et ascendit in caelum, sedet ad dexteram Patris. Et iterum venturus est cum gloria, iudicare vivos et mortuos, cuius regni non erit finis.
Et in Spiritum Sanctum, Dominum et vivificantem: qui ex Patre Filioque procedit. Qui cum Patre et Filio simul adoratur et conglorificatur: qui locutus est per prophetas.
Et unam, sanctam, catholicam et apostolicam Ecclesiam. Confiteor unum baptisma in remissionem peccatorum. Et exspecto resurrectionem mortuorum, et vitam venturi saeculi. Amen.`,
      apostles: `Credo in Deum Patrem omnipotentem, Creatorem caeli et terrae, et in Iesum Christum, Filium eius unicum, Dominum nostrum,
qui conceptus est de Spiritu Sancto, natus ex Maria Virgine, passus sub Pontio Pilato, crucifixus, mortuus, et sepultus,
descendit ad inferos, tertia die resurrexit a mortuis, ascendit ad caelos, sedet ad dexteram Dei Patris omnipotentis, inde venturus est iudicare vivos et mortuos.
Credo in Spiritum Sanctum, sanctam Ecclesiam catholicam, sanctorum communionem, remissionem peccatorum, carnis resurrectionem, vitam aeternam. Amen.`,
    },
  },
  {
    id: 'universal-prayer',
    section: 1,
    title: 'Universal Prayer',
    en: `R. Lord, hear our prayer.`,
    la: `R. Te rogamus, audi nos.`,
  },

  // --- Liturgy of the Eucharist ---
  { id: 'hymn-offertory', section: 2, title: 'Offertory Hymn', slot: 'hymn' },
  {
    id: 'orate-fratres',
    section: 2,
    title: 'Pray, Brethren',
    en: `Pray, brethren, that my sacrifice and yours may be acceptable to God the Father almighty.
R. May the Lord receive the sacrifice from thy hands, to the praise and glory of his name, for our benefit, and that of all his holy Church.`,
    la: `Orate, fratres: ut meum ac vestrum sacrificium acceptabile fiat apud Deum Patrem omnipotentem.
R. Suscipiat Dominus sacrificium de manibus tuis ad laudem et gloriam nominis sui, ad utilitatem quoque nostram totiusque Ecclesiae suae sanctae.`,
  },
  {
    id: 'preface-dialogue',
    section: 2,
    title: 'Preface Dialogue',
    en: `The Lord be with you.
R. And with your spirit.
Lift up your hearts.
R. We lift them up to the Lord.
Let us give thanks to the Lord our God.
R. It is right and just.`,
    la: `Dominus vobiscum.
R. Et cum spiritu tuo.
Sursum corda.
R. Habemus ad Dominum.
Gratias agamus Domino Deo nostro.
R. Dignum et iustum est.`,
  },
  {
    id: 'sanctus',
    section: 2,
    title: 'Holy, Holy, Holy',
    en: `Holy, holy, holy, Lord God of hosts.
Heaven and earth are full of thy glory.
Hosanna in the highest.
Blessed is he that cometh in the name of the Lord.
Hosanna in the highest.`,
    la: `Sanctus, Sanctus, Sanctus Dominus Deus Sabaoth.
Pleni sunt caeli et terra gloria tua.
Hosanna in excelsis.
Benedictus qui venit in nomine Domini.
Hosanna in excelsis.`,
  },
  {
    id: 'mystery-of-faith',
    section: 2,
    title: 'The Mystery of Faith',
    choices: { one: 'First acclamation', two: 'Second acclamation', three: 'Third acclamation' },
    en: {
      one: `The mystery of faith.
R. We announce thy death, O Lord, and profess thy resurrection, until thou come.`,
      two: `The mystery of faith.
R. As often as we eat this bread and drink this cup, we announce thy death, O Lord, until thou come.`,
      three: `The mystery of faith.
R. Saviour of the world, save us, who by thy cross and resurrection hast set us free.`,
    },
    la: {
      one: `Mysterium fidei.
R. Mortem tuam annuntiamus, Domine, et tuam resurrectionem confitemur, donec venias.`,
      two: `Mysterium fidei.
R. Quotiescumque manducamus panem hunc et calicem bibimus, mortem tuam annuntiamus, Domine, donec venias.`,
      three: `Mysterium fidei.
R. Salvator mundi, salva nos, qui per crucem et resurrectionem tuam liberasti nos.`,
    },
  },
  {
    id: 'great-amen',
    section: 2,
    title: 'Doxology',
    en: `Through him, and with him, and in him, is to thee, God the Father almighty, in the unity of the Holy Ghost, all honour and glory, for ever and ever.
R. Amen.`,
    la: `Per ipsum, et cum ipso, et in ipso, est tibi Deo Patri omnipotenti, in unitate Spiritus Sancti, omnis honor et gloria per omnia saecula saeculorum.
R. Amen.`,
  },

  // --- Communion Rite ---
  {
    id: 'our-father',
    section: 3,
    title: 'The Lord’s Prayer',
    en: `Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven.
Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil.

R. For thine is the kingdom, and the power, and the glory, for ever.`,
    la: `Pater noster, qui es in caelis, sanctificetur nomen tuum; adveniat regnum tuum; fiat voluntas tua, sicut in caelo, et in terra.
Panem nostrum cotidianum da nobis hodie; et dimitte nobis debita nostra, sicut et nos dimittimus debitoribus nostris; et ne nos inducas in tentationem; sed libera nos a malo.

R. Quia tuum est regnum, et potestas, et gloria in saecula.`,
  },
  {
    id: 'sign-of-peace',
    section: 3,
    title: 'Sign of Peace',
    en: `The peace of the Lord be with you always.
R. And with your spirit.`,
    la: `Pax Domini sit semper vobiscum.
R. Et cum spiritu tuo.`,
  },
  {
    id: 'agnus-dei',
    section: 3,
    title: 'Lamb of God',
    en: `Lamb of God, who takest away the sins of the world, have mercy on us.
Lamb of God, who takest away the sins of the world, have mercy on us.
Lamb of God, who takest away the sins of the world, grant us peace.`,
    la: `Agnus Dei, qui tollis peccata mundi: miserere nobis.
Agnus Dei, qui tollis peccata mundi: miserere nobis.
Agnus Dei, qui tollis peccata mundi: dona nobis pacem.`,
  },
  {
    id: 'ecce-agnus',
    section: 3,
    title: 'Behold the Lamb of God',
    en: `Behold the Lamb of God, behold him who taketh away the sins of the world. Blessed are they who are called to the supper of the Lamb.
R. Lord, I am not worthy that thou shouldst enter under my roof; say but the word, and my soul shall be healed.`,
    la: `Ecce Agnus Dei, ecce qui tollit peccata mundi. Beati qui ad cenam Agni vocati sunt.
R. Domine, non sum dignus, ut intres sub tectum meum, sed tantum dic verbo, et sanabitur anima mea.`,
  },
  { id: 'hymn-communion', section: 3, title: 'Communion Hymn', slot: 'hymn' },

  // --- Concluding Rites ---
  {
    id: 'blessing-dismissal',
    section: 4,
    title: 'Blessing and Dismissal',
    en: `The Lord be with you.
R. And with your spirit.
May almighty God bless you, the Father, and the Son, and the Holy Spirit.
R. Amen.
Go forth, the Mass is ended.
R. Thanks be to God.`,
    la: `Dominus vobiscum.
R. Et cum spiritu tuo.
Benedicat vos omnipotens Deus, Pater, et Filius, et Spiritus Sanctus.
R. Amen.
Ite, missa est.
R. Deo gratias.`,
  },
  { id: 'hymn-recessional', section: 4, title: 'Recessional Hymn', slot: 'hymn' },
]

/** The prayers (not slots), for the Prayers page. */
export const PRAYERS = ORDER.filter((p) => !p.slot || p.slot === 'before-gospel')

/** Text of one prayer in one language, with a variant where there is a choice. */
export function builtInText(part, lang, choice) {
  const t = part[lang]
  if (t == null) return ''
  if (typeof t === 'string') return t
  return t[choice] ?? Object.values(t)[0]
}

/**
 * Does this part belong at this Mass?
 * `isSunday`, `grade` (0–7) and `season` come from the calendar.
 */
export function belongs(part, { isSunday, grade, season }) {
  // Grade 7 covers both great days (Christmas, the Easter Octave, Holy
  // Thursday) and penitential ones (Ash Wednesday, Holy Week, the Sundays of
  // Advent and Lent), so the season decides those.
  if (part.when === 'gloria') {
    if (isSunday) return season !== 'ADVENT' && season !== 'LENT'
    if (grade >= 4 && grade <= 6) return true // feasts and solemnities, in any season
    if (grade === 7) return ['CHRISTMAS', 'EASTER', 'EASTER_TRIDUUM'].includes(season)
    return false
  }
  if (part.when === 'creed') {
    if (isSunday || grade === 6) return true
    return grade === 7 && season === 'CHRISTMAS' // Christmas Day on a weekday
  }
  return true
}
