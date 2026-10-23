import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SlideCanvas from "../components/SlideCanvas";
import { useContent, DEFAULT_THEME } from "../store/useContent";
import { useCue } from "../store/useLive";
import {
  announcementItem,
  announcementSlide,
  showsOn,
} from "../lib/announcements";
import { storePicture } from "../lib/importer";
import DictationTextarea from "../components/DictationTextarea";

/**
 * Parish notices, kept here week to week and added to the service in one
 * step — after Communion, where they're given at Mass, or as a loop before
 * Mass. Each notice can carry an "until" date and drops off by itself after.
 */
export default function Announcements() {
  const navigate = useNavigate();
  const list = useContent((s) => s.announcements);
  const date = useContent((s) => s.plan.date);
  const theme = useContent(
    (s) => s.themes.find((t) => t.id === "theme_default") ?? DEFAULT_THEME,
  );
  const { addAnnouncement, placeAnnouncements } = useContent();
  const cue = useCue((s) => s.cue);

  const [where, setWhere] = useState(() =>
    readPref("worship-notices-where", "after-communion"),
  );
  const [seconds, setSeconds] = useState(() =>
    Number(readPref("worship-notices-seconds", 8)),
  );
  const [note, setNote] = useState("");
  const fileRef = useRef(null);

  const shown = useMemo(
    () => list.filter((a) => showsOn(a, date)),
    [list, date],
  );

  const add = () => {
    const item = announcementItem(list, date, where === "before" ? seconds : 0);
    placeAnnouncements(item, where);
    cue(item.id);
    writePref("worship-notices-where", where);
    writePref("worship-notices-seconds", seconds);
    setNote(
      `Added ${shown.length} notice${shown.length === 1 ? "" : "s"} ${
        where === "before"
          ? `at the start, changing every ${seconds}s`
          : "before the Blessing and Dismissal"
      }.`,
    );
  };

  const addPictures = async (files) => {
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      const mediaId = await storePicture(f, f.name, ["notice"]);
      addAnnouncement({ title: f.name.replace(/\.[^.]+$/, ""), mediaId });
    }
  };

  return (
    <div className="notices">
      <div className="prayers-head">
        <div>
          <h2 className="celebration-name">Announcements</h2>
          <p className="muted small">
            Parish notices, kept from week to week. {shown.length} of{" "}
            {list.length} will show on{" "}
            {date ? formatDate(date) : "the service date"}.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => addAnnouncement()}>
            + New notice
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            + Poster or picture
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addPictures([...e.target.files]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {list.length === 0 && (
        <p className="empty">
          No notices for this week yet. Add parish events, collections,
          thank-yous and community news — one notice each, or a poster as a
          picture. They go up after Communion and on a loop before Mass.
        </p>
      )}

      <ul className="notice-list">
        {list.map((a, i) => (
          <Notice
            key={a.id}
            a={a}
            index={i}
            count={list.length}
            date={date}
            theme={theme}
          />
        ))}
      </ul>

      {list.length > 0 && (
        <div className="notice-place">
          <div className="field inline">
            <span>Show</span>
            <div className="segmented layout">
              <button
                className={where === "after-communion" ? "on" : ""}
                onClick={() => setWhere("after-communion")}
              >
                After Communion
              </button>
              <button
                className={where === "before" ? "on" : ""}
                onClick={() => setWhere("before")}
              >
                Before Mass, on a loop
              </button>
            </div>
          </div>
          {where === "before" && (
            <label className="field inline">
              <span>Change every</span>
              <input
                type="number"
                min="3"
                max="60"
                value={seconds}
                onChange={(e) =>
                  setSeconds(Math.max(3, Number(e.target.value) || 8))
                }
              />
              <span>seconds</span>
            </label>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={add}
            disabled={!shown.length}
          >
            Add {shown.length} notice{shown.length === 1 ? "" : "s"} to service
          </button>
          {note && (
            <p className="added-note small">
              {note}{" "}
              <button className="btn btn-sm" onClick={() => navigate("/live")}>
                Go to Live
              </button>
            </p>
          )}
          <p className="muted small">
            Adding again replaces the notices already in the service, so edit
            here and add again any time.
          </p>
        </div>
      )}
    </div>
  );
}

function Notice({ a, index, count, date, theme }) {
  const { updateAnnouncement, removeAnnouncement, moveAnnouncement } =
    useContent();
  const set = (patch) => updateAnnouncement(a.id, patch);
  const fileRef = useRef(null);
  const expired = a.until && date && a.until < date;
  const slide = useMemo(() => announcementSlide(a), [a]);

  const takePicture = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    set({ mediaId: await storePicture(file, file.name, ["notice"]) });
  };

  return (
    <li className={`notice-card${showsOn(a, date) ? "" : " off"}`}>
      <div className="notice-preview">
        <SlideCanvas slide={slide} theme={theme} />
        <span className="muted small">
          {!a.active
            ? "Hidden"
            : expired
              ? "Ended — not shown"
              : "Shows on this date"}
        </span>
      </div>
      <div className="notice-fields">
        <input
          className="notice-title"
          placeholder="Title — e.g. Harvest Thanksgiving"
          value={a.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        {!a.mediaId && (
          <DictationTextarea
            rows={3}
            placeholder="What to say. You can paste a picture here instead."
            value={a.text}
            onChange={(e) => set({ text: e.target.value })}
            onPaste={(e) => {
              const f = e.clipboardData.files[0];
              if (f?.type.startsWith("image/")) {
                e.preventDefault();
                takePicture(f);
              }
            }}
          />
        )}
        <div className="row">
          {a.mediaId ? (
            <button
              className="btn btn-sm"
              onClick={() => set({ mediaId: null })}
            >
              Remove picture
            </button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              Use a picture
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              takePicture(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <label className="field inline">
            <span>Until</span>
            <input
              type="date"
              value={a.until ?? ""}
              onChange={(e) => set({ until: e.target.value })}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={a.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            <span>Show</span>
          </label>
          <span className="notice-order">
            <button
              className="icon-btn"
              disabled={index === 0}
              onClick={() => moveAnnouncement(a.id, -1)}
              title="Move up"
            >
              ↑
            </button>
            <button
              className="icon-btn"
              disabled={index === count - 1}
              onClick={() => moveAnnouncement(a.id, 1)}
              title="Move down"
            >
              ↓
            </button>
            <button
              className="icon-btn danger"
              title="Delete"
              onClick={() =>
                window.confirm(`Delete “${a.title || "this notice"}”?`) &&
                removeAnnouncement(a.id)
              }
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </li>
  );
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
