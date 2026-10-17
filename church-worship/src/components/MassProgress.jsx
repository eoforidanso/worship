import { useMemo } from "react";
import { sectionOf, SECTIONS } from "../lib/sections";
import { timeline } from "../lib/timing";

/**
 * Where we are in the Mass: its parts in order, each as wide as it usually
 * takes (the timeline's estimates, homily and Eucharistic Prayer included),
 * the part now on screen in gold and a mark at the very point. Helps a
 * volunteer stay oriented. Only for a Mass — a plan without its parts shows
 * nothing.
 */
export default function MassProgress({ items, liveId }) {
  const bar = useMemo(() => {
    const t = timeline(items);
    if (!t.total) return null;
    const parts = new Map();
    let current = null;
    let at = null;
    let section = null;
    for (const row of t.rows) {
      if (row.item) section = sectionOf(row.item) ?? section;
      if (!section) continue;
      const p = parts.get(section) ?? {
        name: section,
        seconds: 0,
        start: row.start,
      };
      p.seconds += row.seconds;
      parts.set(section, p);
      if (row.item?.id === liveId) {
        current = section;
        at = row.start + row.seconds / 2;
      }
    }
    if (parts.size < 2) return null;
    const list = SECTIONS.filter((s) => parts.has(s)).map((s) => parts.get(s));
    const first = list[0].start;
    const total = list.reduce((a, p) => a + p.seconds, 0);
    return {
      list: list.map((p) => ({ ...p, share: p.seconds / total })),
      current,
      at: at == null ? null : Math.min(1, Math.max(0, (at - first) / total)),
    };
  }, [items, liveId]);
  if (!bar) return null;
  const idx = bar.list.findIndex((p) => p.name === bar.current);
  return (
    <div
      className="mass-progress"
      aria-label={bar.current ? `Now: ${bar.current}` : "The parts of the Mass"}
    >
      <div className="mass-progress-track">
        {bar.list.map((p, i) => (
          <span
            key={p.name}
            className={`mp-seg${i === idx ? " now" : ""}${idx >= 0 && i < idx ? " done" : ""}`}
            style={{ flexGrow: p.share }}
            title={p.name}
          >
            <span className="mp-label">{p.name}</span>
          </span>
        ))}
        {bar.at != null && (
          <span className="mp-mark" style={{ left: `${bar.at * 100}%` }} />
        )}
      </div>
    </div>
  );
}
