import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useOutputOpen } from "../lib/outputPresence";
import { restored, ago } from "../lib/restored";
import SafeBoundary from "../components/SafeBoundary";
import PreviewDock from "../components/PreviewDock";
import ServicePlanner from "../components/ServicePlanner";
import { useLive, useCue } from "../store/useLive";
import { useContent } from "../store/useContent";
import { subscribeStatus } from "../lib/broadcast";
import {
  subscribePwa,
  applyUpdate,
  dismissOfflineReady,
  promptInstall,
  installHelp,
} from "../lib/pwa";
import { describeDay } from "../lib/lectionary";
import { useLiturgicalColour } from "../lib/useLiturgicalColour";
import { startRemoteControl } from "../lib/remote";
import { startHistory, undo, redo } from "../lib/history";

const TABS = [
  { to: "/live", label: "Live" },
  { to: "/readings", label: "Readings" },
  { to: "/prayers", label: "Prayers" },
  { to: "/announcements", label: "Announcements" },
  { to: "/library", label: "Services" },
  { to: "/compose", label: "Compose" },
  { to: "/media", label: "Media" },
  { to: "/themes", label: "Themes" },
];

export default function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The service plan panel: always open on a laptop by default; on a tablet
  // it slides over the page and closes once an item is picked.
  const narrow = () => window.matchMedia("(max-width: 900px)").matches;
  const [railOpen, setRailOpen] = useState(() => {
    const saved = readPref("worship-rail");
    return saved ? saved === "open" && !narrow() : !narrow();
  });
  const [dockOpen, setDockOpen] = useState(
    () => readPref("worship-dock") !== "closed",
  );
  const setDock = (open) => {
    setDockOpen(open);
    writePref("worship-dock", open ? "open" : "closed");
  };
  const setRail = (open) => {
    setRailOpen(open);
    writePref("worship-rail", open ? "open" : "closed");
  };
  useEffect(() => {
    const close = () => narrow() && setRailOpen(false);
    window.addEventListener("worship-picked", close);
    return () => window.removeEventListener("worship-picked", close);
  }, []);
  const planTitle = useContent((s) => s.plan.title);
  const setPlanTitle = useContent((s) => s.setPlanTitle);
  const planDate = useContent((s) => s.plan.date);
  const planId = useContent((s) => s.plan.id);
  const parishName = useContent((s) => s.parish?.name);
  useEffect(() => {
    document.title = parishName?.trim()
      ? `${parishName.trim()} — Ambo`
      : "Ambo";
  }, [parishName]);
  const setPlanDate = useContent((s) => s.setPlanDate);

  useGlobalShortcuts();
  useAutoAdvance();
  useEffect(() => startRemoteControl(), []);
  useEffect(() => startHistory(), []);
  // On a phone the tabs scroll sideways: keep the current one in view.
  useEffect(() => {
    document
      .querySelector(".tab.active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  useLiturgicalColour();
  const status = useConnectionStatus();

  return (
    <div className={`shell${railOpen ? "" : " rail-closed"}`}>
      <header className="topbar">
        <div className="brand">
          <button
            className="icon-btn rail-toggle"
            onClick={() => setRail(!railOpen)}
            title={railOpen ? "Hide the service plan" : "Show the service plan"}
            aria-label="Service plan"
            aria-expanded={railOpen}
          >
            ☰
          </button>
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt="Ambo"
            title="Ambo"
          />
          <input
            className="plan-title"
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            aria-label="Service title"
          />
          <input
            className="plan-date"
            type="date"
            value={planDate ?? ""}
            onChange={(e) => setPlanDate(e.target.value)}
            aria-label="Service date"
          />
          <LiturgicalDay
            date={planDate}
            planId={planId}
            onOpen={() => navigate("/readings")}
          />
        </div>

        <nav className="tabs">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? "tab active" : "tab")}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <span className={`conn conn-${status}`} title={`Sync: ${status}`}>
            {status === "online" ? "Network sync" : "Local only"}
          </span>
          <LiveStrip />
          <InstallButton />
          <button
            className="btn btn-glass"
            onClick={() => openWindow("/stage", "stage")}
          >
            Stage
          </button>
          <OutputButton />
        </div>
      </header>

      <Shortcuts />
      <RestoredNotice />
      <OfflineNotice />
      <BackupReminder />

      <div className="body">
        <aside className="rail">
          <SafeBoundary variant="page">
            <ServicePlanner onEdit={(id) => navigate(`/compose/${id}`)} />
          </SafeBoundary>
        </aside>
        <main className="main">
          <SafeBoundary variant="page" resetKey={pathname}>
            <Outlet />
          </SafeBoundary>
        </main>
        {/* Live, Compose and Readings have their own previews; every other tab gets this one. */}
        {dockOpen && !/^\/(live|compose|readings)/.test(pathname) && (
          <SafeBoundary variant="page">
            <PreviewDock onClose={() => setDock(false)} />
          </SafeBoundary>
        )}
        {!dockOpen && !/^\/(live|compose|readings)/.test(pathname) && (
          <button
            className="dock-reopen"
            onClick={() => setDock(true)}
            title="Show the preview"
          >
            Preview ◂
          </button>
        )}
      </div>
    </div>
  );
}

/** What the Church celebrates on the service date, from the built-in calendar. */
function LiturgicalDay({ date, planId, onOpen }) {
  const [info, setInfo] = useState(null);
  const setAutoTitle = useContent((s) => s.setAutoTitle);
  useEffect(() => {
    let live = true;
    setInfo(null);
    if (date)
      describeDay(date)
        .then((d) => {
          if (!live) return;
          setInfo(d);
          if (d) setAutoTitle(d.name); // only while the service hasn't been named by hand
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [date, planId, setAutoTitle]); // a new service on the same date gets named too
  if (!info) return null;
  return (
    <button
      className="lit-day"
      onClick={onOpen}
      title={`${info.name} · ${info.cycle} — open the readings`}
    >
      <span className={`lit-dot lit-${info.color}`} />
      <span className="lit-day-name">{info.name}</span>
      <span className="muted">{info.cycle}</span>
    </button>
  );
}

/**
 * Install the app on this computer: its own window and dock/Start-menu icon,
 * opening straight onto Live, working with no network. One click where the
 * browser allows it; otherwise the steps for this browser.
 */
function InstallButton() {
  const [{ canInstall, installed }, setPwa] = useState({
    canInstall: false,
    installed: false,
  });
  const [help, setHelp] = useState(false);
  useEffect(() => subscribePwa(setPwa), []);
  if (installed) return null;
  return (
    <span className="install">
      <button
        className="btn"
        title="Install as an app on this computer"
        onClick={() => (canInstall ? promptInstall() : setHelp((v) => !v))}
      >
        ⤓<span className="wide-label"> Install app</span>
      </button>
      {help && (
        <span className="install-help" role="dialog">
          <strong>Install Ambo</strong>
          <span>{installHelp()}</span>
          <span className="muted small">
            Installed, it opens in its own window from the dock or Start menu,
            straight onto Live, and runs with no internet.
          </span>
          <button className="btn btn-sm" onClick={() => setHelp(false)}>
            OK
          </button>
        </span>
      )}
    </span>
  );
}

/**
 * Output, in three unmistakable states: Off (grey — no projector window),
 * Ready (blue — the window is open, nothing showing: black, cleared or no
 * slide yet) and Live (gold, with a slow pulse — the room is seeing a slide).
 */
/** What the room is seeing, as one of: off · ready · live (plus blackout/cleared), and which item. */
function useOnAir() {
  const open = useOutputOpen();
  const { itemId, slideIndex, blackout, cleared } = useLive();
  // Live only when the projector really draws a slide: one in this plan.
  const item = useContent(
    (st) => st.plan.items.find((i) => i.id === itemId) ?? null,
  );
  const showing = !!item?.slides[slideIndex];
  const state = !open
    ? "off"
    : showing && !blackout && !cleared
      ? "live"
      : "ready";
  return {
    open,
    state,
    item: showing ? item : null,
    slideIndex,
    blackout,
    cleared,
  };
}

function OutputButton() {
  const { state, blackout } = useOnAir();
  const word = {
    off: "Off",
    ready: blackout ? "Black" : "Ready",
    live: "Live",
  }[state];
  const title = {
    off: "Open the projector window — on the second screen when one is connected",
    ready: blackout
      ? "The projector window is open and showing black"
      : "The projector window is open; nothing is showing yet",
    live: "Live — the projector is showing a slide now",
  }[state];
  return (
    <button
      className={`btn output-btn output-${state}`}
      onClick={openOutput}
      title={title}
      aria-label={`Output: ${word}`}
    >
      <span className="output-light" aria-hidden="true" />
      Output
      <span className="output-state">{word}</span>
    </button>
  );
}

/**
 * Always in view during Mass: what the congregation is seeing right now.
 * "● LIVE · Penitential Act · 2/5", gold and slowly pulsing; "■ BLACK" or
 * "TEXT HIDDEN" when those are on. Gone when the projector shows nothing.
 */
function LiveStrip() {
  const { open, item, slideIndex, blackout, cleared } = useOnAir();
  const navigate = useNavigate();
  if (!open || !item) return null;
  const kind = blackout ? "black" : cleared ? "cleared" : "live";
  const label = { live: "Live", black: "Black", cleared: "Text hidden" }[kind];
  return (
    <button
      className={`live-strip live-strip-${kind}`}
      onClick={() => navigate("/live")}
      title="What the congregation is seeing now — open Live"
      aria-live="polite"
    >
      <span className="live-strip-light" aria-hidden="true" />
      <span className="live-strip-label">{label}</span>
      <span className="live-strip-title">{item.title}</span>
      {item.slides.length > 1 && (
        <span className="live-strip-pos">
          {slideIndex + 1}/{item.slides.length}
        </span>
      )}
    </button>
  );
}

function openWindow(path, name) {
  // These bypass the router, so they need the deploy base themselves.
  window.open(
    `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/"),
    name,
    "width=1280,height=720",
  );
}

/**
 * Open the projector window on the projector. Where the browser can see the
 * other screens (Chrome/Edge, after asking once), it opens filling the
 * second screen; elsewhere it opens a normal window to drag across.
 */
async function openOutput() {
  const url = `${import.meta.env.BASE_URL}/output`.replace(/\/{2,}/g, "/");
  if ("getScreenDetails" in window) {
    try {
      const details = await window.getScreenDetails();
      const target =
        details.screens.find(
          (s) => s !== details.currentScreen && !s.isInternal,
        ) ?? details.screens.find((s) => s !== details.currentScreen);
      if (target) {
        const features = [
          "popup",
          "fullscreen", // honoured where the browser allows full-screen pop-ups
          `left=${target.availLeft}`,
          `top=${target.availTop}`,
          `width=${target.availWidth}`,
          `height=${target.availHeight}`,
        ].join(",");
        if (window.open(url, "output", features)) return;
      }
    } catch {
      /* permission refused, or no API: open normally */
    }
  }
  window.open(url, "output", "width=1280,height=720");
}

/**
 * Operator-only chrome: confirmation that the app is cached, and an update
 * that waits to be asked for. Neither ever appears on /output or /stage.
 */
function OfflineNotice() {
  const [{ needRefresh, offlineReady }, setPwa] = useState({
    needRefresh: false,
    offlineReady: false,
  });
  useEffect(() => subscribePwa(setPwa), []);

  if (needRefresh) {
    return (
      <div className="notice notice-update" role="status">
        <span>A newer version is ready. It won't load until you say so.</span>
        <button className="btn btn-primary" onClick={applyUpdate}>
          Reload now
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="notice" role="status">
        <span>
          Ready to work offline — this service will run with the network down.
        </span>
        <button className="btn btn-quiet" onClick={dismissOfflineReady}>
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}

/**
 * Everything lives in this one browser. Once there is something worth
 * losing, ask for a backup weekly — gently, and never on the projector.
 */
/** On opening: the service came back, and how recent it is. Leaves by itself. */
function RestoredNotice() {
  const [shown, setShown] = useState(!!restored);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), 12000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown) return null;
  const when = ago(restored.savedAt);
  return (
    <div className="notice notice-restored" role="status">
      <span>
        <strong>✓ Restored</strong> — {restored.title || "your service"},{" "}
        {restored.count} item
        {restored.count === 1 ? "" : "s"}
        {when ? `, as last saved ${when}` : ""}. Every change is saved on this
        computer as you work.
      </span>
      <button className="btn btn-quiet" onClick={() => setShown(false)}>
        OK
      </button>
    </div>
  );
}

function BackupReminder() {
  const last = useContent((s) => s.lastBackupAt);
  const snoozed = useContent((s) => s.backupSnoozedUntil);
  const hasWork = useContent(
    // The starter hymnal ships with the app, so on its own it isn't work to lose.
    (s) =>
      s.songs.some((x) => !x.starter) ||
      s.services.length > 0 ||
      s.announcements.length > 0 ||
      s.plan.items.length > 5,
  );
  const snoozeBackup = useContent((s) => s.snoozeBackup);
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const week = 7 * 86400000;
  if (!hasWork || now < (snoozed ?? 0) || (last && now - last < week))
    return null;
  const days = last ? Math.floor((now - last) / 86400000) : null;
  return (
    <div className="notice" role="status">
      <span>
        {days == null
          ? "Not backed up yet — a backup file keeps your services, hymns and pictures safe."
          : `Last backup ${days} days ago.`}
      </span>
      <button
        className="btn btn-soft"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { exportBundle } = await import("../lib/bundle");
          await exportBundle("all").finally(() => setBusy(false));
        }}
      >
        {busy ? "Saving…" : "Back up now"}
      </button>
      <button className="btn btn-quiet" onClick={() => snoozeBackup(3)}>
        Later
      </button>
      <button
        className="btn btn-quiet"
        onClick={() => snoozeBackup(36500)}
        title="Stop these reminders. Back up any time from Services → Export."
      >
        Don’t remind me
      </button>
    </div>
  );
}

/** "?" anywhere: every key the app knows, by where it works. */
function Shortcuts() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("worship-shortcuts", toggle);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("worship-shortcuts", toggle);
      window.removeEventListener("keydown", esc);
    };
  }, []);
  if (!open) return null;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl+";
  const groups = [
    [
      "During Mass (any tab)",
      [
        ["→  ↓  Space  PgDn", "Next slide"],
        ["←  ↑  PgUp", "Previous slide"],
        ["B", "Blackout"],
        ["C", "Clear text, keep the background"],
        ["L", "Show the logo"],
        ["1 – 9", "That slide of the selected item"],
      ],
    ],
    [
      "On Live",
      [
        ["Enter", "Put the selected item on screen"],
        ["Esc", "Reset the screen"],
      ],
    ],
    [
      "Readings",
      [
        ["N  /  P", "Next / previous Sunday"],
        ["]  /  [", "Next / previous day"],
        ["T", "Today"],
        ["J  /  K", "Next / previous reading in the preview"],
        ["F  or  /", "Find a feast or saint"],
        ["A", "Add the Mass to the service"],
      ],
    ],
    [
      "Anywhere",
      [
        ["S", "Find a song to add"],
        [`${mod}Z`, "Undo"],
        [mac ? "⇧⌘Z" : "Ctrl+Y", "Redo"],
        ["?", "This list"],
      ],
    ],
  ];
  return (
    <div className="shortcuts-backdrop" onClick={() => setOpen(false)}>
      <div
        className="shortcuts"
        role="dialog"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row between">
          <h2 className="celebration-name">Keyboard shortcuts</h2>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="shortcut-groups">
          {groups.map(([title, keys]) => (
            <section key={title}>
              <h3>{title}</h3>
              <dl>
                {keys.map(([k, what]) => (
                  <div key={k}>
                    <dt>
                      <kbd>{k}</kbd>
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="muted small">
          Keys are ignored while you type in a box, so typing never moves the
          projector.
        </p>
      </div>
    </div>
  );
}

function useConnectionStatus() {
  const [status, setStatus] = useState("offline");
  useEffect(() => subscribeStatus(setStatus), []);
  return status;
}

/**
 * Items with `autoAdvance` set (announcements, a pre-service loop) step
 * through their slides on a timer and wrap round, never leaving the item. It
 * runs here in the shell, not on the Live tab, so switching tabs mid-loop
 * doesn't stop it; it pauses while the screen is blacked out, cleared or on
 * the logo.
 */
function useAutoAdvance() {
  const { itemId, slideIndex, blackout, cleared, showLogo } = useLive();
  const item = useContent(
    (s) => s.plan.items.find((it) => it.id === itemId) ?? null,
  );
  const seconds = item?.autoAdvance ?? 0;
  const count = item?.slides.length ?? 0;

  useEffect(() => {
    if (!itemId || seconds <= 0 || count < 2 || blackout || cleared || showLogo)
      return;
    const t = setTimeout(() => {
      const live = useLive.getState();
      if (live.itemId === itemId)
        live.push({ slideIndex: (live.slideIndex + 1) % count });
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [itemId, slideIndex, seconds, count, blackout, cleared, showLogo]);
}

/**
 * Operator keyboard control. Ignored while a text field has focus so typing
 * lyrics never advances the projector.
 */
const onLive = () => /\/live\/?$/.test(window.location.pathname);

function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      // ⌘Z / Ctrl+Z undo the plan, ⇧⌘Z / Ctrl+Y redo — except in a text box,
      // where they keep undoing the typing as usual.
      if ((e.metaKey || e.ctrlKey) && !typing) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          return undo();
        }
        if ((k === "z" && e.shiftKey) || k === "y") {
          e.preventDefault();
          return redo();
        }
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const live = useLive.getState();

      // 1–9: put that slide of the cued item on screen.
      if (/^[1-9]$/.test(e.key)) {
        const id = useCue.getState().itemId ?? live.itemId;
        const item = useContent
          .getState()
          .plan.items.find((it) => it.id === id);
        const i = Number(e.key) - 1;
        if (item && i < item.slides.length) {
          e.preventDefault();
          live.goTo(item.id, i);
        }
        return;
      }

      switch (e.key) {
        case "Enter": {
          // Take the cued item live — but only from the plan, never from a
          // focused button, where Enter already means "press this".
          if (el && el.tagName === "BUTTON") return;
          // Only on Live: elsewhere Enter is for the page (and must never project by accident).
          if (!onLive()) return;
          const id = useCue.getState().itemId;
          if (id && id !== live.itemId) {
            e.preventDefault();
            live.goTo(id, 0);
          }
          break;
        }
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          live.next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          live.prev();
          break;
        case "b":
        case "B":
          e.preventDefault();
          live.toggleBlackout();
          break;
        case "l":
        case "L":
          e.preventDefault();
          live.toggleLogo();
          break;
        case "c":
        case "C":
          e.preventDefault();
          live.toggleClear();
          break;
        case "Escape":
          // Only on Live: on other tabs Esc closes things, it must not clear the projector.
          if (!onLive()) return;
          e.preventDefault();
          live.reset();
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new Event("worship-shortcuts"));
          break;
        case "s":
        case "S":
          // Find a song: the library box under the plan.
          if (onLive()) return;
          {
            const box = document.querySelector(".quick-add input");
            if (box) {
              e.preventDefault();
              box.focus();
            }
          }
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function readPref(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preference only */
  }
}
