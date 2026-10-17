import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useContent } from "../store/useContent";
import { useLive, useCue } from "../store/useLive";
import { urlFor } from "../lib/mediaStore";
import { ORDER } from "../data/orderOfMass";
import { sectionOf } from "../lib/sections";
import { filesToItems, textToItem } from "../lib/importer";
import { readiness } from "../lib/readiness";
import { useHistory, undo, redo, restoreSnapshot } from "../lib/history";
import { DRAG_SONG, DRAG_READING, buildDroppedReading } from "../lib/dragTypes";
import { TEMPLATES } from "../lib/autoMass";
import { timeline, clock, fmtDuration } from "../lib/timing";

const TYPE_META = {
  song: { icon: "♪", label: "Song" },
  scripture: { icon: "✝", label: "Scripture" },
  text: { icon: "¶", label: "Text" },
  // Older plans may still hold these; they are no longer offered as new items.
  media: { icon: "▣", label: "Pictures" },
  countdown: { icon: "◷", label: "Countdown" },
};
const ADDABLE = ["song", "scripture", "text"];

export default function ServicePlanner({ onEdit }) {
  const items = useContent((s) => s.plan.items);
  const moveItem = useContent((s) => s.moveItem);
  const addItem = useContent((s) => s.addItem);
  const clearPlan = useContent((s) => s.clearPlan);
  const insertItems = useContent((s) => s.insertItems);
  const insertItemsAt = useContent((s) => s.insertItemsAt);
  const addFromLibrary = useContent((s) => s.addFromLibrary);
  const [dropAt, setDropAt] = useState(null); // { id, before } while dragging over the plan

  // List or Timeline: the timeline shows when each part starts and how long it takes.
  const [view, setView] = useState(() => readPref("worship-plan-view", "list"));
  const [startAt, setStartAt] = useState(() =>
    readPref("worship-mass-start", ""),
  );
  const [homily, setHomily] = useState(() =>
    Number(readPref("worship-homily", 10)),
  );
  const times = useMemo(() => {
    if (view !== "timeline") return null;
    const t = timeline(items, { homilyMinutes: homily });
    const byId = new Map();
    const gapsAfter = new Map();
    let last = null;
    for (const row of t.rows) {
      if (row.item) {
        byId.set(row.item.id, row);
        last = row.item.id;
      } else if (last) gapsAfter.set(last, row);
    }
    return { ...t, byId, gapsAfter };
  }, [view, items, homily]);

  /** The row under the pointer, and whether the drop lands above or below it. */
  const dropTarget = (y) => {
    const rows = [...document.querySelectorAll(".plan-row[data-id]")];
    if (!rows.length) return null;
    for (const row of rows) {
      const r = row.getBoundingClientRect();
      if (y < r.bottom) {
        const placeholder = row.classList.contains("placeholder");
        return {
          id: row.dataset.id,
          before: !placeholder && y < r.top + r.height / 2,
          fill: placeholder,
        };
      }
    }
    return { id: rows.at(-1).dataset.id, before: false };
  };
  const ready = useMemo(() => readiness(items), [items]);
  const [checkOpen, setCheckOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [dropped, setDropped] = useState(null); // files dropped on the plan, for the panel

  // Imports land after the selected item, and the first one is selected.
  const placeItems = (newItems) => {
    if (!newItems.length) return;
    insertItems(newItems, cuedId);
    cue(newItems[0].id);
  };
  const importFiles = async (files, report) => {
    const { items: made, skipped } = await filesToItems(files, report);
    placeItems(made);
    return { made, skipped };
  };

  const liveItemId = useLive((s) => s.itemId);
  const goTo = useLive((s) => s.goTo);
  const cuedId = useCue((s) => s.itemId);
  const cue = useCue((s) => s.cue);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // A click cues the item. In the composer it opens it there instead; either
  // way nothing reaches the projector until a slide is chosen.
  const pick = (id) => {
    cue(id);
    window.dispatchEvent(new Event("worship-picked")); // a tablet closes the plan panel
    if (pathname.startsWith("/compose")) navigate(`/compose/${id}`);
    else if (!pathname.startsWith("/live")) navigate("/live");
  };

  // A small activation distance keeps a plain click from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    moveItem(from, to);
  };

  const handleAdd = (type) => {
    const id = addItem(type, cuedId); // after the selected item, not lost at the bottom
    cue(id);
    onEdit?.(id);
  };

  return (
    <div
      className={`planner${dropping ? " dropping" : ""}`}
      onDragOver={(e) => {
        const types = [...e.dataTransfer.types];
        const ours = types.includes(DRAG_SONG) || types.includes(DRAG_READING);
        if (!ours && !types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
        setDropAt(ours ? dropTarget(e.clientY) : null);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setDropping(false);
          setDropAt(null);
        }
      }}
      onDrop={async (e) => {
        setDropping(false);
        const target = dropTarget(e.clientY);
        setDropAt(null);
        const song = e.dataTransfer.getData(DRAG_SONG);
        const reading = e.dataTransfer.getData(DRAG_READING);
        if (song || reading) e.preventDefault();
        if (song) {
          // Dropped on a hymn place: fills it. Anywhere else: goes in there.
          const id = addFromLibrary(song, target?.id ?? null, target?.before);
          if (id) cue(id);
          return;
        }
        if (reading) {
          const made = await buildDroppedReading(JSON.parse(reading));
          if (made.length) {
            insertItemsAt(made, target?.id ?? null, target?.before);
            cue(made[0].id);
          }
          return;
        }
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setImporting(true); // the panel opens and reports progress
        setDropped([...e.dataTransfer.files]);
      }}
    >
      <div className="planner-head">
        <h2>Service plan</h2>
        <span className="row">
          <span className="muted">{items.length} items</span>
          <HistoryButtons />
          <span className="segmented layout plan-view">
            {["list", "timeline"].map((v) => (
              <button
                key={v}
                className={view === v ? "on" : ""}
                onClick={() => {
                  setView(v);
                  writePref("worship-plan-view", v);
                }}
                title={
                  v === "timeline"
                    ? "When each part starts, and how long it takes"
                    : "The plan"
                }
              >
                {v === "list" ? "List" : "Timeline"}
              </button>
            ))}
          </span>
          {items.length > 0 && (
            <button
              className="icon-btn"
              title="Clear the plan"
              onClick={() => {
                if (
                  !window.confirm(
                    "Remove every item from this service? Saved services and the library are not touched.",
                  )
                )
                  return;
                useLive.getState().push({ itemId: null, slideIndex: 0 });
                cue(null);
                clearPlan();
              }}
            >
              Clear
            </button>
          )}
        </span>
      </div>

      {items.length > 0 && (
        <button
          className={`readiness${ready.ready === ready.total ? " all" : ""}${checkOpen ? " open" : ""}`}
          onClick={() => setCheckOpen((v) => !v)}
          aria-expanded={checkOpen}
          title="Show what is ready and what still needs attention"
        >
          <span className="readiness-text">
            {ready.ready === ready.total
              ? "✓ Ready for Mass"
              : `Ready ${ready.ready} of ${ready.total} · ${ready.total - ready.ready} to check →`}
          </span>
          <span className="readiness-bar">
            <span
              style={{
                width: `${(100 * ready.ready) / Math.max(1, ready.total)}%`,
              }}
            />
          </span>
        </button>
      )}
      {items.length > 0 && checkOpen && (
        <Checklist
          items={items}
          ready={ready}
          onFix={(id) => pick(id)}
          onClose={() => setCheckOpen(false)}
        />
      )}

      {items.length === 0 && (
        <OneClickMass
          onDone={(id) => id && cue(id)}
          onCustomise={() => navigate("/readings")}
        />
      )}

      {times && items.length > 0 && (
        <div className="timeline-bar">
          <label className="field inline">
            <span>Starts</span>
            <input
              type="time"
              value={startAt}
              onChange={(e) => {
                setStartAt(e.target.value);
                writePref("worship-mass-start", e.target.value);
              }}
            />
          </label>
          <label className="field inline">
            <span>Homily</span>
            <input
              type="number"
              min="0"
              max="60"
              value={homily}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                setHomily(v);
                writePref("worship-homily", v);
              }}
            />
            <span>min</span>
          </label>
          <strong className="timeline-total">
            ≈ {fmtDuration(times.total)}
            {startAt ? ` · ends ${clock(startAt, times.total)}` : ""}
          </strong>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="plan-list">
            {items.map((item, i) => {
              const section = sectionOf(item);
              // Compare with the last item that had a section, so a song added
              // mid-Mass doesn't make its section's heading appear twice.
              const prev = items
                .slice(0, i)
                .map(sectionOf)
                .filter(Boolean)
                .at(-1);
              const heading = section && section !== prev ? section : null;
              // "4/5": how much of this part of the Mass is ready.
              const sectionItems = heading
                ? items.filter((x) => sectionOf(x) === section)
                : [];
              const sectionReady = sectionItems.filter(
                (x) => !ready.items.get(x.id)?.length,
              ).length;
              return (
                <Fragment key={item.id}>
                  {heading && (
                    <li className="plan-section" aria-hidden="true">
                      <span>{heading}</span>
                      <span
                        className={
                          sectionReady === sectionItems.length
                            ? "sec-ok"
                            : "sec-warn"
                        }
                      >
                        {sectionReady}/{sectionItems.length}
                      </span>
                    </li>
                  )}
                  <PlanRow
                    item={item}
                    dropMark={
                      dropAt?.id === item.id
                        ? dropAt.fill
                          ? "fill"
                          : dropAt.before
                            ? "before"
                            : "after"
                        : ""
                    }
                    issues={ready.items.get(item.id) ?? []}
                    time={
                      times?.byId.get(item.id) && {
                        at: clock(startAt, times.byId.get(item.id).start),
                        length: times.byId.get(item.id).seconds
                          ? fmtDuration(times.byId.get(item.id).seconds)
                          : "",
                      }
                    }
                    live={item.id === liveItemId}
                    cued={item.id === cuedId && item.id !== liveItemId}
                    onPick={() => pick(item.id)}
                    onGoLive={() => goTo(item.id, 0)}
                    onEdit={() => onEdit?.(item.id)}
                  />
                  {times?.gapsAfter.get(item.id) && (
                    <li className="plan-gap" aria-hidden="true">
                      <span>
                        {clock(startAt, times.gapsAfter.get(item.id).start)}
                      </span>
                      <span>{times.gapsAfter.get(item.id).gap}</span>
                      <span>
                        {fmtDuration(times.gapsAfter.get(item.id).seconds)}
                      </span>
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <LibraryQuickAdd afterId={cuedId} onAdded={(id) => cue(id)} />

      {importing && (
        <ImportPanel
          onFiles={importFiles}
          onText={(t) => placeItems([textToItem(t)])}
          onClose={() => setImporting(false)}
          incoming={dropped}
          onTaken={() => setDropped(null)}
        />
      )}

      <div className="planner-add">
        {ADDABLE.map((type) => (
          <button
            key={type}
            className="btn btn-ghost"
            onClick={() => handleAdd(type)}
          >
            <span aria-hidden="true">{TYPE_META[type].icon}</span>{" "}
            {TYPE_META[type].label}
          </button>
        ))}
        <button
          className={`btn btn-ghost${importing ? " on" : ""}`}
          onClick={() => setImporting((v) => !v)}
        >
          ⊕ Paste or file
        </button>
        {items.length > 0 && (
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/readings")}
          >
            ✠ Mass &amp; readings
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Paste text or a picture, choose files, or drop them anywhere on the plan:
 * text files, PDFs (a slide per page) and pictures (a slide each).
 */
function ImportPanel({ onFiles, onText, onClose, incoming, onTaken }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const run = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setStatus("Importing…");
    try {
      const { made, skipped } = await onFiles(files, setStatus);
      const slides = made.reduce((n, it) => n + it.slides.length, 0);
      setStatus(
        [
          made.length
            ? `Added ${made.length} item${made.length === 1 ? "" : "s"} (${slides} slide${slides === 1 ? "" : "s"}).`
            : "",
          ...skipped.map((s) => `${s.name}: ${s.reason}`),
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (err) {
      setStatus(`Couldn't import: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Files dropped on the plan arrive here — once each, even if the effect
  // runs twice (React's development double-mount).
  const taken = useRef(null);
  useEffect(() => {
    if (!incoming?.length || taken.current === incoming) return;
    taken.current = incoming;
    onTaken();
    run(incoming);
  }, [incoming]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="import-panel">
      <textarea
        rows={4}
        value={text}
        placeholder={
          "Paste text or a picture here.\nA blank line starts a new slide."
        }
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const files = [...e.clipboardData.files];
          if (files.length) {
            e.preventDefault(); // a copied picture: import it rather than paste its name
            run(files);
          }
        }}
      />
      <div className="row">
        <button
          className="btn btn-primary btn-sm"
          disabled={!text.trim() || busy}
          onClick={() => {
            onText(text);
            setText("");
            setStatus("Added the text.");
          }}
        >
          Add text
        </button>
        <button
          className="btn btn-sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Choose files…
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".txt,.md,text/plain,application/pdf,.pdf,image/*"
          onChange={(e) => {
            run([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="muted small">
        {status ||
          "Text files, PDFs (a slide per page) and pictures. You can also drop files anywhere on the plan."}
      </p>
    </div>
  );
}

/** ↶ ↷ and the list of snapshots — nothing done to the plan is permanent. */
function HistoryButtons() {
  const { canUndo, canRedo, snapshots } = useHistory();
  const [open, setOpen] = useState(false);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <span className="history">
      <button
        className="icon-btn"
        disabled={!canUndo}
        onClick={undo}
        title={`Undo (${mac ? "⌘Z" : "Ctrl+Z"})`}
      >
        ↶
      </button>
      <button
        className="icon-btn"
        disabled={!canRedo}
        onClick={redo}
        title={`Redo (${mac ? "⇧⌘Z" : "Ctrl+Y"})`}
      >
        ↷
      </button>
      <button
        className={`icon-btn${open ? " on" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="History"
      >
        🕘
      </button>
      {open && (
        <span className="history-pop" role="dialog">
          <strong>Snapshots</strong>
          <span className="muted small">
            Taken before each big change. Restoring keeps a copy of what’s here
            now.
          </span>
          {snapshots.length === 0 && (
            <span className="muted small">None yet.</span>
          )}
          <ol>
            {snapshots.map((s) => (
              <li key={s.at}>
                <span className="plan-text">
                  <span className="plan-title-text">{s.label}</span>
                  <span className="muted small">
                    {new Date(s.at).toLocaleString([], {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {s.title} · {s.count} items
                  </span>
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    restoreSnapshot(s.at);
                    setOpen(false);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ol>
        </span>
      )}
    </span>
  );
}

/**
 * Before Mass: every part, grouped as the Mass runs, ✓ ready or ⚠ with what
 * it still needs and a way straight to it. Problems first in each part.
 */
function Checklist({ items, ready, onFix, onClose }) {
  const groups = [];
  for (const it of items) {
    const name = sectionOf(it) ?? "Opening";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, rows: [] }));
    g.rows.push({ it, issues: ready.items.get(it.id) ?? [] });
  }
  const todo = ready.total - ready.ready;
  return (
    <div className="checklist-panel" role="region" aria-label="Mass readiness">
      <div className="row between">
        <strong>
          {todo ? `${todo} to check before Mass` : "✓ Everything is ready"}
        </strong>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close the checklist"
        >
          ×
        </button>
      </div>
      {groups.map((g) => {
        const bad = g.rows.filter((r) => r.issues.length);
        return (
          <section key={g.name}>
            <h4>
              {g.name}
              <span className={bad.length ? "sec-warn" : "sec-ok"}>
                {g.rows.length - bad.length}/{g.rows.length}
              </span>
            </h4>
            <ul>
              {[...bad, ...g.rows.filter((r) => !r.issues.length)].map(
                ({ it, issues }) => (
                  <li key={it.id} className={issues.length ? "warn" : "ok"}>
                    <span className="mark">{issues.length ? "⚠" : "✓"}</span>
                    <span className="what">
                      {it.lectionary?.slot && !it.placeholder
                        ? `${it.subtitle}: ${it.title}`
                        : it.title}
                      {issues.length > 0 && (
                        <span className="why">{issues.join(" · ")}</span>
                      )}
                    </span>
                    {issues.length > 0 && (
                      <button
                        className="btn btn-sm"
                        onClick={() => onFix(it.id)}
                      >
                        Fix
                      </button>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * An empty service: build the whole Mass for its date in one press — the
 * readings, the prayers, suggested hymns and this week's notices — or go and
 * choose them first.
 */
function OneClickMass({ onDone, onCustomise }) {
  const date = useContent((s) => s.plan.date);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const build = async () => {
    setError("");
    setProgress("Starting…");
    try {
      const { buildDefaultMass } = await import("../lib/autoMass");
      const out = await buildDefaultMass(date, {
        onProgress: (_, label) => setProgress(label),
      });
      onDone(
        out.items.find((it) => it.type === "scripture")?.id ?? out.items[0]?.id,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };
  const navigate = useNavigate();
  const template = async (kind) => {
    if (!kind) return;
    setError("");
    setProgress("Starting…");
    try {
      const { buildTemplate } = await import("../lib/autoMass");
      const out = await buildTemplate(kind, date, {
        onProgress: (_, label) => setProgress(label),
      });
      if (out.open) navigate(out.open);
      else
        onDone(
          out.items.find((it) => it.type === "scripture")?.id ??
            out.items[0]?.id,
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };
  return (
    <div className="planner-empty">
      <button
        className="btn btn-gold full"
        onClick={build}
        disabled={!!progress || !date}
      >
        {progress ? "Building the Mass…" : "✠ Build this day’s Mass"}
      </button>
      <p className="muted small">
        {progress ||
          error ||
          "Readings, the Order of Mass, suggested hymns and this week’s notices — everything stays editable."}
      </p>
      <div className="row">
        <select
          className="template-pick"
          value=""
          disabled={!!progress}
          aria-label="Other services"
          onChange={(e) => template(e.target.value)}
        >
          <option value="">Other services…</option>
          {TEMPLATES.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={onCustomise}>
          Choose readings first →
        </button>
      </div>
    </div>
  );
}

/** Type-ahead over the song library, so a song goes in without leaving Live. */
function LibraryQuickAdd({ afterId, onAdded }) {
  const songs = useContent((s) => s.songs);
  const addFromLibrary = useContent((s) => s.addFromLibrary);
  const [q, setQ] = useState("");

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return songs
      .filter(
        (x) =>
          x.title.toLowerCase().includes(needle) ||
          (x.subtitle ?? "").toLowerCase().includes(needle) ||
          (x.notes ?? "").toLowerCase().includes(needle) || // "Christmas", "Our Lady", "Eucharist"…
          x.slides.some((sl) => sl.body.toLowerCase().includes(needle)),
      )
      .slice(0, 6);
  }, [songs, q]);

  if (!songs.length) return null;

  const add = (libId) => {
    const id = addFromLibrary(libId, afterId);
    setQ("");
    if (id) onAdded?.(id);
  };

  return (
    <div className="quick-add">
      <input
        className="search"
        placeholder={`Add from library (${songs.length})…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) add(hits[0].id);
          if (e.key === "Escape") setQ("");
        }}
      />
      {hits.length > 0 && (
        <ul className="quick-hits">
          {hits.map((x) => (
            <li key={x.id}>
              <button onClick={() => add(x.id)}>
                <span>{TYPE_META[x.type]?.icon ?? "¶"}</span>
                <span className="plan-text">
                  <span className="plan-title-text">{x.title}</span>
                  {x.subtitle && (
                    <span className="muted small">{x.subtitle}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && hits.length === 0 && (
        <p className="muted small">No match in the library.</p>
      )}
    </div>
  );
}

function PlanRow({
  item,
  live,
  cued,
  onPick,
  onGoLive,
  onEdit,
  issues = [],
  dropMark = "",
  time = null,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });
  const removeItem = useContent((s) => s.removeItem);
  const duplicateItem = useContent((s) => s.duplicateItem);
  const saveToLibrary = useContent((s) => s.saveToLibrary);
  const meta = TYPE_META[item.type] ?? TYPE_META.text;

  // Keep the item on screen in the plan as the Mass moves on.
  const rowRef = useRef(null);
  useEffect(() => {
    // Selected or newly added items scroll into view too, so an add is never invisible.
    if (live || cued)
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [live, cued]);
  const ref = (el) => {
    rowRef.current = el;
    setNodeRef(el);
  };

  return (
    <li
      ref={ref}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-id={item.id}
      className={`plan-row${live ? " on-air" : ""}${cued ? " cued" : ""}${isDragging ? " dragging" : ""}${item.placeholder ? " placeholder" : ""}${dropMark ? ` drop-${dropMark}` : ""}`}
    >
      <button
        className="grip"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.title}`}
      >
        ⠿
      </button>

      <button className="plan-row-main" onDoubleClick={onEdit} onClick={onPick}>
        {time ? (
          <span
            className="plan-time"
            title={time.length ? `about ${time.length}` : ""}
          >
            {time.at}
          </span>
        ) : (
          <span className="plan-icon" aria-hidden="true">
            {meta.icon}
          </span>
        )}
        <span className="plan-text">
          <span className="plan-title-text">
            {item.title}
            <ItemOfflineDot item={item} />
          </span>
          <span className="muted small plan-sub">
            {item.placeholder
              ? "Select, then add a song from the library"
              : [
                  item.lectionary &&
                  ORDER.some((p) => p.id === item.lectionary.part)
                    ? ""
                    : item.subtitle,
                  time?.length
                    ? `≈ ${time.length}`
                    : item.slides.length > 1
                      ? `${item.slides.length} slides`
                      : "",
                  item.autoAdvance > 0 ? `loops ${item.autoAdvance}s` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
        </span>
        <span
          className={`plan-status ${issues.length ? "warn" : "ok"}`}
          title={issues.length ? issues.join("\n") : "Ready"}
          aria-label={
            issues.length ? `Needs attention: ${issues.join("; ")}` : "Ready"
          }
        >
          {issues.length ? "⚠" : "✓"}
        </span>
      </button>

      {(cued || live) && (
        <span className="plan-actions">
          <button
            className="icon-btn live-btn"
            onClick={onGoLive}
            title="Go live"
          >
            ▶
          </button>
          <button
            className="icon-btn"
            onClick={() => saveToLibrary(item.id)}
            title={item.libraryId ? "Update in library" : "Save to library"}
          >
            {item.libraryId ? "★" : "☆"}
          </button>
          <button className="icon-btn" onClick={onEdit} title="Edit">
            ✎
          </button>
          <button
            className="icon-btn"
            onClick={() => duplicateItem(item.id)}
            title="Duplicate"
          >
            ⧉
          </button>
          <button
            className="icon-btn danger"
            onClick={() => {
              if (live) {
                if (
                  !window.confirm(
                    `“${item.title}” is on screen right now. Remove it anyway?`,
                  )
                )
                  return;
                useLive.getState().push({ itemId: null, slideIndex: 0 });
              }
              removeItem(item.id);
            }}
            title="Remove"
          >
            ×
          </button>
        </span>
      )}
    </li>
  );
}

/**
 * Whether this item will actually project with no network.
 *
 * Only shown when there's something to say — an item with a plain colour
 * background is unconditionally fine and doesn't need a badge arguing
 * otherwise. Green is deliberately silent for the common case.
 */
function ItemOfflineDot({ item }) {
  const bg = item.background;
  if (!bg || bg.kind === "color") return null;

  const resolved = bg.mediaId ? urlFor(bg.mediaId) : bg.value;
  if (resolved && !bg.mediaId && /^https?:/i.test(bg.value ?? "")) {
    return (
      <span
        className="dot dot-remote"
        title="Background is online only — needs the network"
      />
    );
  }
  if (!resolved) {
    return (
      <span
        className="dot dot-missing"
        title="Background unavailable offline"
      />
    );
  }
  return null;
}

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* preference only */
  }
}
