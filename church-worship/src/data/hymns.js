/**
 * A starter hymnal: well-loved Catholic hymns and chants whose words are in
 * the public domain (authors and translators of the 1700s–1800s, and the
 * Latin of the Church), so they can ship with the app and be projected
 * freely. They go into the song library on first run; edit or delete any.
 *
 * `refrain` is added to the end of every verse's slide, so each verse is one
 * screen with its chorus.
 */

const H = (id, title, subtitle, season, verses, refrain) => ({ id, title, subtitle, season, verses, refrain })

export const HYMNS = [
  // --- General ---
  H('holy-god', 'Holy God, We Praise Thy Name', 'Te Deum · tr. Clarence Walworth, 1858', 'General', [
    'Holy God, we praise thy name;\nLord of all, we bow before thee!\nAll on earth thy sceptre claim,\nAll in heaven above adore thee;\nInfinite thy vast domain,\nEverlasting is thy reign.',
    'Hark! the loud celestial hymn\nAngel choirs above are raising;\nCherubim and seraphim,\nIn unceasing chorus praising,\nFill the heavens with sweet accord:\nHoly, holy, holy Lord!',
    'Lo! the apostolic train\nJoin the sacred name to hallow;\nProphets swell the loud refrain,\nAnd the white-robed martyrs follow;\nAnd from morn to set of sun,\nThrough the Church the song goes on.',
    'Holy Father, Holy Son,\nHoly Spirit, three we name thee,\nWhile in essence only one,\nUndivided God we claim thee;\nAnd adoring bend the knee,\nWhile we own the mystery.',
  ]),
  H('holy-holy-holy', 'Holy, Holy, Holy', 'Reginald Heber, 1826', 'General', [
    'Holy, holy, holy! Lord God Almighty!\nEarly in the morning our song shall rise to thee;\nHoly, holy, holy! merciful and mighty,\nGod in three Persons, blessed Trinity!',
    'Holy, holy, holy! All the saints adore thee,\nCasting down their golden crowns around the glassy sea;\nCherubim and seraphim falling down before thee,\nWhich wert, and art, and evermore shalt be.',
    'Holy, holy, holy! though the darkness hide thee,\nThough the eye of sinful man thy glory may not see,\nOnly thou art holy; there is none beside thee,\nPerfect in power, in love, and purity.',
    'Holy, holy, holy! Lord God Almighty!\nAll thy works shall praise thy name, in earth, and sky, and sea;\nHoly, holy, holy! merciful and mighty,\nGod in three Persons, blessed Trinity!',
  ]),
  H('praise-to-the-lord', 'Praise to the Lord, the Almighty', 'Joachim Neander · tr. Catherine Winkworth, 1863', 'General', [
    'Praise to the Lord, the Almighty, the King of creation!\nO my soul, praise him, for he is thy health and salvation!\nAll ye who hear,\nNow to his temple draw near;\nJoin me in glad adoration!',
    'Praise to the Lord, who o’er all things so wondrously reigneth,\nShelters thee under his wings, yea, so gently sustaineth!\nHast thou not seen\nHow thy desires e’er have been\nGranted in what he ordaineth?',
    'Praise to the Lord! O let all that is in me adore him!\nAll that hath life and breath, come now with praises before him!\nLet the Amen\nSound from his people again:\nGladly for aye we adore him.',
  ]),
  H('now-thank-we', 'Now Thank We All Our God', 'Martin Rinkart · tr. Catherine Winkworth, 1858', 'General', [
    'Now thank we all our God\nWith heart and hands and voices,\nWho wondrous things hath done,\nIn whom his world rejoices;\nWho from our mothers’ arms\nHath blessed us on our way\nWith countless gifts of love,\nAnd still is ours today.',
    'O may this bounteous God\nThrough all our life be near us,\nWith ever joyful hearts\nAnd blessed peace to cheer us;\nAnd keep us in his grace,\nAnd guide us when perplexed,\nAnd free us from all ills\nIn this world and the next.',
    'All praise and thanks to God\nThe Father now be given,\nThe Son, and him who reigns\nWith them in highest heaven,\nThe one eternal God,\nWhom earth and heaven adore;\nFor thus it was, is now,\nAnd shall be evermore.',
  ]),
  H('faith-of-our-fathers', 'Faith of Our Fathers', 'Frederick William Faber, 1849', 'General', [
    'Faith of our fathers, living still\nIn spite of dungeon, fire and sword:\nO how our hearts beat high with joy\nWhene’er we hear that glorious word!',
    'Our fathers, chained in prisons dark,\nWere still in heart and conscience free:\nHow sweet would be their children’s fate,\nIf they, like them, could die for thee!',
    'Faith of our fathers, we will love\nBoth friend and foe in all our strife:\nAnd preach thee too, as love knows how,\nBy kindly words and virtuous life.',
  ], 'Faith of our fathers, holy faith!\nWe will be true to thee till death.'),
  H('crown-him', 'Crown Him with Many Crowns', 'Matthew Bridges, 1851', 'General', [
    'Crown him with many crowns,\nThe Lamb upon his throne;\nHark! how the heavenly anthem drowns\nAll music but its own:\nAwake, my soul, and sing\nOf him who died for thee,\nAnd hail him as thy matchless King\nThrough all eternity.',
    'Crown him the Virgin’s Son,\nThe God incarnate born,\nWhose arm those crimson trophies won\nWhich now his brow adorn;\nFruit of the mystic Rose,\nAs of that Rose the Stem;\nThe Root whence mercy ever flows,\nThe Babe of Bethlehem.',
  ]),
  H('amazing-grace', 'Amazing Grace', 'John Newton, 1779', 'General', [
    'Amazing grace! how sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.',
    '’Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed!',
    'Through many dangers, toils and snares,\nI have already come;\n’Tis grace hath brought me safe thus far,\nAnd grace will lead me home.',
  ]),

  // --- Eucharist ---
  H('sweet-sacrament', 'Sweet Sacrament Divine', 'Francis Stanfield, 19th century', 'Eucharist', [
    'Sweet Sacrament divine,\nHid in thine earthly home,\nLo! round thy lowly shrine,\nWith suppliant hearts we come;\nJesus, to thee our voice we raise\nIn songs of love and heartfelt praise:\nSweet Sacrament divine,\nSweet Sacrament divine.',
    'Sweet Sacrament of peace,\nDear home of every heart,\nWhere restless yearnings cease,\nAnd sorrows all depart;\nThere in thine ear all trustfully\nWe tell our tale of misery,\nSweet Sacrament of peace,\nSweet Sacrament of peace.',
    'Sweet Sacrament of rest,\nArk from the ocean’s roar,\nWithin thy shelter blest\nSoon may we reach the shore;\nSave us, for still the tempest raves,\nSave, lest we sink beneath the waves:\nSweet Sacrament of rest,\nSweet Sacrament of rest.',
  ]),
  H('soul-of-my-saviour', 'Soul of My Saviour', 'Anima Christi · 19th century', 'Eucharist', [
    'Soul of my Saviour, sanctify my breast;\nBody of Christ, be thou my saving guest;\nBlood of my Saviour, bathe me in thy tide,\nWash me with water flowing from thy side.',
    'Strength and protection may thy Passion be;\nO blessed Jesus, hear and answer me;\nDeep in thy wounds, Lord, hide and shelter me;\nSo shall I never, never part from thee.',
    'Guard and defend me from the foe malign;\nIn death’s dread moments make me only thine;\nCall me and bid me come to thee on high,\nWhere I may praise thee with thy saints for aye.',
  ]),
  H('o-salutaris', 'O Salutaris Hostia', 'St Thomas Aquinas · Latin', 'Eucharist', [
    'O salutaris Hostia,\nQuae caeli pandis ostium:\nBella premunt hostilia,\nDa robur, fer auxilium.',
    'Uni trinoque Domino\nSit sempiterna gloria,\nQui vitam sine termino\nNobis donet in patria. Amen.',
  ]),
  H('tantum-ergo', 'Tantum Ergo', 'St Thomas Aquinas · Latin', 'Eucharist', [
    'Tantum ergo Sacramentum\nVeneremur cernui:\nEt antiquum documentum\nNovo cedat ritui:\nPraestet fides supplementum\nSensuum defectui.',
    'Genitori, Genitoque\nLaus et iubilatio,\nSalus, honor, virtus quoque\nSit et benedictio:\nProcedenti ab utroque\nCompar sit laudatio. Amen.',
  ]),
  H('panis-angelicus', 'Panis Angelicus', 'St Thomas Aquinas · Latin', 'Eucharist', [
    'Panis angelicus\nfit panis hominum;\ndat panis caelicus\nfiguris terminum:\nO res mirabilis!\nManducat Dominum\npauper, servus et humilis.',
    'Te trina Deitas\nunaque, poscimus:\nsic nos tu visita,\nsicut te colimus;\nper tuas semitas\nduc nos quo tendimus,\nad lucem quam inhabitas. Amen.',
  ]),

  // --- Our Lady ---
  H('immaculate-mary', 'Immaculate Mary', 'Lourdes Hymn · traditional', 'Our Lady', [
    'Immaculate Mary, thy praises we sing,\nWho reignest in splendour with Jesus our King.',
    'In heaven, the blessed thy glory proclaim;\nOn earth, we thy children invoke thy fair name.',
    'Thy name is our power, thy virtues our light,\nThy love is our comfort, thy pleading our might.',
    'We pray for our Mother, the Church upon earth,\nAnd bless, sweetest Lady, the land of our birth.',
  ], 'Ave, ave, ave, Maria!\nAve, ave, Maria!'),
  H('hail-holy-queen', 'Hail, Holy Queen Enthroned Above', 'Salve Regina · Roman Hymnal, 1884', 'Our Lady', [
    'Hail, holy Queen enthroned above, O Maria!\nHail, Mother of mercy and of love, O Maria!',
    'Our life, our sweetness here below, O Maria!\nOur hope in sorrow and in woe, O Maria!',
    'To thee we cry, poor sons of Eve, O Maria!\nTo thee we sigh, we mourn, we grieve, O Maria!',
  ], 'Triumph, all ye cherubim!\nSing with us, ye seraphim!\nHeaven and earth resound the hymn:\nSalve, salve, salve, Regina!'),
  H('salve-regina', 'Salve Regina', 'Latin', 'Our Lady', [
    'Salve, Regina, Mater misericordiae,\nvita, dulcedo, et spes nostra, salve.\nAd te clamamus, exsules filii Hevae.\nAd te suspiramus, gementes et flentes\nin hac lacrimarum valle.',
    'Eia ergo, advocata nostra,\nillos tuos misericordes oculos ad nos converte.\nEt Iesum, benedictum fructum ventris tui,\nnobis post hoc exsilium ostende.\nO clemens, O pia, O dulcis Virgo Maria.',
  ]),
  H('ave-maria', 'Ave Maria', 'Latin', 'Our Lady', [
    'Ave Maria, gratia plena, Dominus tecum.\nBenedicta tu in mulieribus,\net benedictus fructus ventris tui, Iesus.',
    'Sancta Maria, Mater Dei,\nora pro nobis peccatoribus,\nnunc et in hora mortis nostrae. Amen.',
  ]),
  H('regina-caeli', 'Regina Caeli', 'Latin · Easter Time', 'Our Lady', [
    'Regina caeli, laetare, alleluia.\nQuia quem meruisti portare, alleluia.\nResurrexit, sicut dixit, alleluia.\nOra pro nobis Deum, alleluia.',
  ]),

  // --- Seasons ---
  H('o-come-emmanuel', 'O Come, O Come, Emmanuel', 'Veni, veni, Emmanuel · tr. J. M. Neale, 1851', 'Advent', [
    'O come, O come, Emmanuel,\nAnd ransom captive Israel,\nThat mourns in lonely exile here\nUntil the Son of God appear.',
    'O come, thou Rod of Jesse, free\nThine own from Satan’s tyranny;\nFrom depths of hell thy people save,\nAnd give them victory o’er the grave.',
    'O come, thou Dayspring, come and cheer\nOur spirits by thine advent here;\nDisperse the gloomy clouds of night,\nAnd death’s dark shadows put to flight.',
    'O come, thou Key of David, come,\nAnd open wide our heavenly home;\nMake safe the way that leads on high,\nAnd close the path to misery.',
  ], 'Rejoice! Rejoice! Emmanuel\nShall come to thee, O Israel.'),
  H('o-come-all-ye-faithful', 'O Come, All Ye Faithful', 'Adeste Fideles · tr. Frederick Oakeley, 1841', 'Christmas', [
    'O come, all ye faithful, joyful and triumphant,\nO come ye, O come ye to Bethlehem;\nCome and behold him, born the King of angels:',
    'God of God, Light of Light,\nLo, he abhors not the Virgin’s womb;\nVery God, begotten, not created:',
    'Sing, choirs of angels, sing in exultation,\nSing, all ye citizens of heaven above;\nGlory to God in the highest:',
    'Yea, Lord, we greet thee, born this happy morning;\nJesu, to thee be glory given;\nWord of the Father, now in flesh appearing:',
  ], 'O come, let us adore him,\nO come, let us adore him,\nO come, let us adore him, Christ the Lord.'),
  H('silent-night', 'Silent Night', 'Joseph Mohr · tr. John Freeman Young, 1859', 'Christmas', [
    'Silent night, holy night,\nAll is calm, all is bright\nRound yon Virgin Mother and Child.\nHoly Infant so tender and mild,\nSleep in heavenly peace,\nSleep in heavenly peace.',
    'Silent night, holy night,\nShepherds quake at the sight;\nGlories stream from heaven afar,\nHeavenly hosts sing Alleluia!\nChrist the Saviour is born,\nChrist the Saviour is born!',
    'Silent night, holy night,\nSon of God, love’s pure light\nRadiant beams from thy holy face\nWith the dawn of redeeming grace,\nJesus, Lord, at thy birth,\nJesus, Lord, at thy birth.',
  ]),
  H('hark-the-herald', 'Hark! The Herald Angels Sing', 'Charles Wesley, 1739', 'Christmas', [
    'Hark! the herald angels sing,\n“Glory to the new-born King;\nPeace on earth, and mercy mild,\nGod and sinners reconciled!”\nJoyful, all ye nations, rise,\nJoin the triumph of the skies;\nWith th’angelic host proclaim,\n“Christ is born in Bethlehem!”',
    'Christ, by highest heaven adored;\nChrist, the everlasting Lord;\nLate in time behold him come,\nOffspring of a Virgin’s womb.\nVeiled in flesh the Godhead see;\nHail th’incarnate Deity,\nPleased as man with man to dwell,\nJesus, our Emmanuel.',
    'Hail the heaven-born Prince of Peace!\nHail the Sun of Righteousness!\nLight and life to all he brings,\nRisen with healing in his wings.\nMild he lays his glory by,\nBorn that man no more may die,\nBorn to raise the sons of earth,\nBorn to give them second birth.',
  ], 'Hark! the herald angels sing,\n“Glory to the new-born King!”'),
  H('joy-to-the-world', 'Joy to the World', 'Isaac Watts, 1719', 'Christmas', [
    'Joy to the world! the Lord is come;\nLet earth receive her King;\nLet every heart prepare him room,\nAnd heaven and nature sing.',
    'Joy to the earth! the Saviour reigns;\nLet men their songs employ;\nWhile fields and floods, rocks, hills, and plains\nRepeat the sounding joy.',
    'He rules the world with truth and grace,\nAnd makes the nations prove\nThe glories of his righteousness,\nAnd wonders of his love.',
  ]),
  H('o-sacred-head', 'O Sacred Head Surrounded', 'tr. Henry Williams Baker, 1861', 'Lent', [
    'O sacred Head, surrounded\nBy crown of piercing thorn!\nO bleeding Head, so wounded,\nReviled and put to scorn!\nOur sins have marred the glory\nOf thy most holy face,\nYet angel hosts adore thee,\nAnd tremble as they gaze.',
    'I see thy strength and vigour\nAll fading in the strife,\nAnd death with cruel rigour\nBereaving thee of life;\nO agony and dying!\nO love to sinners free!\nJesu, all grace supplying,\nO turn thy face on me.',
    'In this thy bitter Passion,\nGood Shepherd, think of me\nWith thy most sweet compassion,\nUnworthy though I be:\nBeneath thy cross abiding\nFor ever would I rest,\nIn thy dear love confiding,\nAnd with thy presence blest.',
  ]),
  H('jesus-christ-is-risen', 'Jesus Christ Is Risen Today', 'Lyra Davidica, 1708', 'Easter', [
    'Jesus Christ is risen today, Alleluia!\nOur triumphant holy day, Alleluia!\nWho did once upon the cross, Alleluia!\nSuffer to redeem our loss. Alleluia!',
    'Hymns of praise then let us sing, Alleluia!\nUnto Christ, our heavenly King, Alleluia!\nWho endured the cross and grave, Alleluia!\nSinners to redeem and save. Alleluia!',
    'But the pains which he endured, Alleluia!\nOur salvation have procured; Alleluia!\nNow above the sky he’s King, Alleluia!\nWhere the angels ever sing. Alleluia!',
  ]),
  H('come-holy-ghost', 'Come, Holy Ghost, Creator Blest', 'Veni Creator Spiritus · tr. Edward Caswall, 1849', 'Pentecost', [
    'Come, Holy Ghost, Creator blest,\nAnd in our hearts take up thy rest;\nCome with thy grace and heavenly aid,\nTo fill the hearts which thou hast made.',
    'O Comforter, to thee we cry,\nThou heavenly gift of God most high;\nThou fount of life and fire of love,\nAnd sweet anointing from above.',
    'Praise be to thee, Father and Son,\nAnd Holy Spirit, with them one;\nAnd may the Son on us bestow\nThe gifts that from the Spirit flow.',
  ]),
]

/** Library entries, ids stable so they're added once and never duplicated. */
export function starterSongs() {
  return HYMNS.map((h) => ({
    id: `hymn_${h.id}`,
    type: 'song',
    title: h.title,
    subtitle: h.subtitle,
    themeId: 'theme_default',
    background: null,
    notes: `Starter hymnal · ${h.season}`,
    autoAdvance: 0,
    starter: true,
    slides: h.verses.map((v, i) => ({
      id: `hymn_${h.id}_${i + 1}`,
      label: h.verses.length > 1 ? `Verse ${i + 1}` : '',
      body: h.refrain ? `${v}\n\n${h.refrain}` : v,
    })),
  }))
}
