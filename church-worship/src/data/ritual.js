/**
 * Readings for ritual Masses, from the Lectionary for Mass: Masses for the
 * Dead and the Celebration of Marriage. Citations only; the text comes from
 * the built-in Bible (or the parish's own, pasted) like any other reading.
 * The family or the couple chooses one of each; the first is the default.
 *
 * `extras` are the rite's own moments, added as title slides in the Order of
 * Mass so the operator knows where they fall.
 */

export const RITUALS = {
  funeral: {
    title: 'Funeral Mass',
    who: 'For (name of the deceased)',
    gloria: false,
    readings: {
      first_reading:
        'Wisdom 3:1-9|Wisdom 4:7-15|Isaiah 25:6a, 7-9|Lamentations 3:17-26|Daniel 12:1-3|2 Maccabees 12:43-46|Job 19:1, 23-27a',
      responsorial_psalm:
        'Psalm 23:1-3a, 3b-4, 5, 6|Psalm 25:6 and 7b, 17-18, 20-21|Psalm 27:1, 4, 7 and 8b and 9a, 13-14|Psalm 42:2, 3, 5; 43:3, 4, 5|Psalm 63:2, 3-4, 5-6, 8-9|Psalm 103:8 and 10, 13-14, 15-16, 17-18|Psalm 116:5, 6, 10-11, 15-16ac|Psalm 122:1-2, 4-5, 6-7, 8-9|Psalm 130:1-2, 3-4, 5-6, 7-8',
      second_reading:
        'Romans 6:3-9|Romans 5:5-11|Romans 5:17-21|Romans 8:14-23|Romans 8:31b-35, 37-39|Romans 14:7-9, 10c-12|1 Corinthians 15:20-28|1 Corinthians 15:51-57|2 Corinthians 4:14-5:1|2 Corinthians 5:1, 6-10|Philippians 3:20-21|1 Thessalonians 4:13-18|2 Timothy 2:8-13|1 John 3:1-2|1 John 3:14-16|Revelation 14:13|Revelation 20:11-21:1|Revelation 21:1-5a, 6b-7',
      gospel_acclamation: 'John 11:25a, 26|Matthew 11:25|John 6:39',
      gospel:
        'John 14:1-6|John 11:17-27|John 11:32-45|John 6:37-40|John 6:51-58|John 5:24-29|John 12:23-28|John 17:24-26|John 19:17-18, 25-30|Matthew 5:1-12a|Matthew 11:25-30|Matthew 25:1-13|Matthew 25:31-46|Mark 15:33-39; 16:1-6|Luke 7:11-17|Luke 12:35-40|Luke 23:33, 39-43|Luke 23:44-46, 50, 52-53; 24:1-6a|Luke 24:13-35',
    },
    extras: [
      // Replaces the Blessing and Dismissal.
      { after: 'hymn-communion', title: 'Final Commendation', body: 'Final Commendation' },
      { after: 'Final Commendation', title: 'Song of Farewell', hymn: true },
    ],
    drop: ['blessing-dismissal', 'hymn-recessional'],
  },
  wedding: {
    title: 'Wedding Mass',
    who: 'Names of the couple',
    gloria: true,
    readings: {
      first_reading:
        'Genesis 1:26-28, 31a|Genesis 2:18-24|Genesis 24:48-51, 58-67|Tobit 7:6-14|Tobit 8:4b-8|Proverbs 31:10-13, 19-20, 30-31|Song of Songs 2:8-10, 14, 16a; 8:6-7a|Sirach 26:1-4, 13-16|Jeremiah 31:31-32a, 33-34a',
      responsorial_psalm:
        'Psalm 128:1-2, 3, 4-5|Psalm 33:12 and 18, 20-21, 22|Psalm 34:2-3, 4-5, 6-7, 8-9|Psalm 103:1-2, 8 and 13, 17-18a|Psalm 112:1bc-2, 3-4, 5-7a, 7bc-8, 9|Psalm 145:8-9, 10 and 15, 17-18|Psalm 148:1-2, 3-4, 9-10, 11-13a, 13c-14a',
      second_reading:
        '1 Corinthians 12:31-13:8a|Romans 8:31b-35, 37-39|Romans 12:1-2, 9-18|Romans 15:1b-3a, 5-7, 13|1 Corinthians 6:13c-15a, 17-20|Ephesians 4:1-6|Ephesians 5:2a, 21-33|Philippians 4:4-9|Colossians 3:12-17|Hebrews 13:1-4a, 5-6b|1 Peter 3:1-9|1 John 3:18-24|1 John 4:7-12|Revelation 19:1, 5-9a',
      gospel_acclamation: '1 John 4:8, 11|1 John 4:12|1 John 4:16',
      gospel:
        'John 2:1-11|Matthew 5:1-12a|Matthew 5:13-16|Matthew 7:21, 24-29|Matthew 19:3-6|Matthew 22:35-40|Mark 10:6-9|John 15:9-12|John 15:12-16|John 17:20-26',
    },
    extras: [
      { after: 'gospel', title: 'The Celebration of Matrimony', body: 'The Celebration of Matrimony' },
      { before: 'sign-of-peace', title: 'Nuptial Blessing', body: 'Nuptial Blessing' },
    ],
    drop: [],
  },
}

/** A Mass "option" for a rite, in the same shape the Readings page uses for days. */
export function ritualOption(kind, day) {
  const r = RITUALS[kind]
  return {
    id: `ritual:${kind}`,
    title: r.title,
    mass: '',
    note: '',
    ritual: kind,
    cycles: day.cycles,
    readings: r.readings,
    // Ranked like a feast so the Order of Mass treats it as a solemn celebration;
    // Gloria and Creed are then set by the rite (see Readings).
    event: {
      key: `Ritual${kind}`,
      name: r.title,
      grade: 4,
      color: kind === 'funeral' ? 'purple' : 'white',
      season: day.principal?.season ?? '',
    },
  }
}
