import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "../store/useContent";
import { useCue } from "../store/useLive";
import { describeDay, dayOf, partsOf } from "../lib/lectionary";
import { showsOn } from "../lib/announcements";
import { BIBLES, preferredBible } from "../lib/bible";
import { announceBuilt } from "../lib/confidence";

const longDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * The first thing an empty service shows: "What Mass are we celebrating?"
 * The day, one obvious action — build it — and what that will bring in.
 * The parish's own name and Mass times once they are set (asked here once).
 */
export default function Welcome() {
  const date = useContent((s) => s.plan.date);
  const parish = useContent((s) => s.parish);
  const announcements = useContent((s) => s.announcements);
  const cue = useCue((s) => s.cue);
  const navigate = useNavigate();
  const [day, setDay] = useState(null);
  const [facts, setFacts] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!date) return;
    (async () => {
      const [d, full] = await Promise.all([describeDay(date), dayOf(date)]);
      const option = full.options[0];
      let hymns = 0;
      if (option) {
        const { hymnSuggestionsFor } = await import("../lib/autoMass");
        hymns = Object.values(hymnSuggestionsFor(option, date)).filter(
          (l) => l?.length,
        ).length;
      }
      if (live) {
        setDay(d);
        setFacts({
          readings: option ? partsOf(option.readings).length : 0,
          hymns,
        });
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [date]);

  const notices = announcements.filter((a) => showsOn(a, date)).length;

  const build = async () => {
    setError("");
    setProgress("Starting…");
    try {
      const { buildDefaultMass } = await import("../lib/autoMass");
      const out = await buildDefaultMass(date, {
        onProgress: (_, label) => setProgress(label),
      });
      announceBuilt(
        useContent.getState().plan.items,
        useContent.getState().plan.title,
      );
      const first =
        out.items.find((it) => it.type === "scripture") ?? out.items[0];
      if (first) cue(first.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = parish?.name?.trim();
  const times = parish?.massTimes?.trim();

  return (
    // The Church year, felt before anything is built: the season lights the page.
    <div
      className="welcome-page"
      data-season={day?.season ?? ""}
      data-colour={day?.color ?? ""}
    >
      <div className="welcome">
        <p className="welcome-greeting">{greeting}</p>
        <h1 className="welcome-parish">{name || "Welcome to Ambo"}</h1>
        <div className={`welcome-day lit-border-${day?.color ?? "green"}`}>
          <p className="muted">{date ? longDate(date) : ""}</p>
          <h2>{day?.name ?? "…"}</h2>
          <p className="muted">
            {[day?.grade, day?.cycle].filter(Boolean).join(" · ")}
          </p>
          {times && <p className="welcome-times">{times} Mass</p>}
        </div>

        <button
          className="btn btn-gold btn-xl welcome-build"
          onClick={build}
          disabled={!!progress || !date}
        >
          {progress ? "Building the Mass…" : "✠ Build this day’s Mass"}
        </button>
        <p className="muted small welcome-progress">
          {progress || error || "Everything stays editable afterwards."}
        </p>

        <ul className="welcome-facts">
          <li className="ok">
            <span>✓</span> Readings ready — {facts ? facts.readings : "…"} from
            the Lectionary, in the {BIBLES[preferredBible()].label}
          </li>
          <li className="ok">
            <span>✓</span> The Order of Mass, with the Gloria and Creed as the
            day requires
          </li>
          <li className={facts?.hymns ? "ok" : "warn"}>
            <span>{facts?.hymns ? "✓" : "○"}</span>{" "}
            {facts?.hymns
              ? `Seasonal hymns suggested for ${facts.hymns} places`
              : "Hymns: choose them after building"}
          </li>
          <li className={notices ? "ok" : "warn"}>
            <span>{notices ? "✓" : "○"}</span>{" "}
            <span>
              {notices ? (
                `${notices} notice${notices === 1 ? "" : "s"} for this week, after Communion`
              ) : (
                <>
                  No notices for this week yet —{" "}
                  <button
                    className="link"
                    onClick={() => navigate("/announcements")}
                  >
                    add parish events, collections and thank-yous
                  </button>
                </>
              )}
            </span>
          </li>
        </ul>

        <p className="welcome-other small">
          <button className="link" onClick={() => navigate("/readings")}>
            Choose the readings first
          </button>{" "}
          · or start from <em>Other services…</em> in the plan (funeral,
          wedding, Benediction…)
        </p>

        {!parish?.setUp && <ParishSetup />}
      </div>
    </div>
  );
}

/** Asked once: the parish, its Mass times, its Bible. Editable later in Services. */
function ParishSetup() {
  const parish = useContent((s) => s.parish);
  const setParish = useContent((s) => s.setParish);
  const [name, setName] = useState(parish?.name ?? "");
  const [times, setTimes] = useState(parish?.massTimes ?? "");
  const [bible, setBible] = useState(preferredBible());
  const save = () => {
    setParish({ name: name.trim(), massTimes: times.trim(), setUp: true });
    try {
      localStorage.setItem("worship-bible", bible);
    } catch {
      /* preference only */
    }
  };
  return (
    <section className="parish-setup">
      <h3>Make Ambo your parish’s</h3>
      <label className="field">
        <span>Parish name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="St Mary’s Parish"
        />
      </label>
      <label className="field">
        <span>Mass times</span>
        <input
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          placeholder="Sunday 8:00 and 10:30"
        />
      </label>
      <div className="field">
        <span>Bible for the readings</span>
        <div className="segmented layout">
          {Object.entries(BIBLES).map(([id, b]) => (
            <button
              key={id}
              className={bible === id ? "on" : ""}
              onClick={() => setBible(id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setParish({ setUp: true })}
        >
          Not now
        </button>
        <span className="muted small">
          Change these any time under Services.
        </span>
      </div>
    </section>
  );
}
