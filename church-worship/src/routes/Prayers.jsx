import { useContent } from '../store/useContent'
import { PRAYERS, SECTIONS, builtInText } from '../data/orderOfMass'
import { prayerText } from '../lib/orderOfMass'

const USES = [
  ['en', 'Traditional English'],
  ['la', 'Latin'],
  ['parish', 'Our missal'],
]

/**
 * The Order of Mass prayers, set up once.
 *
 * Each prayer can use the built-in traditional English, the Latin, or the
 * parish's own wording pasted from its missal — the current translation is
 * licensed to dioceses, so it can't ship with the app, but once pasted here
 * it is used at every Mass and travels in every backup file.
 */
export default function Prayers() {
  const prayers = useContent((s) => s.prayers)
  const setPrayer = useContent((s) => s.setPrayer)
  const setAll = (use) => PRAYERS.forEach((p) => setPrayer(p.id, { use }))
  const pasted = PRAYERS.filter((p) => {
    const pr = prayers[p.id]
    return pr?.text?.trim() || Object.values(pr?.texts ?? {}).some((t) => t?.trim())
  }).length

  return (
    <div className="prayers">
      <div className="prayers-head">
        <div>
          <h2 className="celebration-name">Prayers of the Mass</h2>
          <p className="muted small">
            The people’s parts, used when you add a whole Mass from the Readings page. Paste your missal’s
            texts once under <em>Our missal</em> and they are used every time. {pasted} of {PRAYERS.length}{' '}
            pasted.
          </p>
        </div>
        <div className="row">
          <span className="muted small">Use for all:</span>
          {USES.map(([id, label]) => (
            <button key={id} className="btn btn-sm" onClick={() => setAll(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {SECTIONS.map((section, si) => (
        <section key={section}>
          <h3>{section}</h3>
          <ul className="prayer-list">
            {PRAYERS.filter((p) => p.section === si).map((part) => (
              <PrayerRow
                key={part.id}
                part={part}
                pref={prayers[part.id] ?? {}}
                prefs={prayers}
                set={setPrayer}
              />
            ))}
          </ul>
        </section>
      ))}

      <p className="muted small fineprint">
        Built-in English is the traditional Catholic wording (public domain); where a text is newer than that
        wording, it is rendered plainly from the Latin. The short responses use today’s words. The current
        English translation of the Roman Missal is © ICEL and licensed through your bishops’ conference —
        paste it under that licence.
      </p>
    </div>
  )
}

function PrayerRow({ part, pref, prefs, set }) {
  const use = pref.use ?? 'en'
  const choiceIds = part.choices ? Object.keys(part.choices) : null
  const choice = pref.choice ?? choiceIds?.[0]
  const own = part.choices ? (pref.texts?.[choice] ?? '') : (pref.text ?? '')
  const setOwn = (value) =>
    part.choices ? set(part.id, { texts: { ...pref.texts, [choice]: value } }) : set(part.id, { text: value })

  return (
    <li className="prayer-row">
      <div className="part-row">
        <span className="part-label prayer-title">{part.title}</span>
        {choiceIds && (
          <select value={choice} onChange={(e) => set(part.id, { choice: e.target.value })}>
            {choiceIds.map((c) => (
              <option key={c} value={c}>
                {part.choices[c]}
              </option>
            ))}
          </select>
        )}
        <div className="segmented source">
          {USES.map(([id, label]) => (
            <button key={id} className={use === id ? 'on' : ''} onClick={() => set(part.id, { use: id })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {use === 'parish' ? (
        <textarea
          rows={Math.min(12, Math.max(4, builtInText(part, 'en', choice).split('\n').length + 1))}
          placeholder={`Paste the ${part.title} from your missal. Start the people’s lines with “R. ”.`}
          value={own}
          onChange={(e) => setOwn(e.target.value)}
        />
      ) : (
        <pre className="prayer-preview">{prayerText(part, prefs, choice)}</pre>
      )}
      {use === 'parish' && !own.trim() && (
        <p className="muted small">Nothing pasted yet — the traditional English is used until you do.</p>
      )}
    </li>
  )
}
