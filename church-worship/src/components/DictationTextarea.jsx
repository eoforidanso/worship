import { useEffect, useRef, useState } from "react";

/**
 * A textarea you can speak into. Same props as a plain `<textarea>`; a
 * microphone button in the corner starts dictation, and what is heard goes in
 * at the cursor through the field's own `onChange`, so it saves exactly as
 * typing would.
 *
 * Uses the browser's speech recognition (Chrome, Edge, Safari). Where there
 * is none (Firefox) the field is a plain textarea. Chrome sends the audio to
 * Google to transcribe, so dictation needs the internet even though the rest
 * of Ambo works offline.
 */

const Recognition =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : undefined;

// Spoken punctuation and layout, for when the recogniser adds none.
const SPOKEN = [
  [/\s*\bnew paragraph\b\s*/gi, "\n\n"],
  [/\s*\bnew line\b\s*/gi, "\n"],
  [/\s*\b(full stop|period)\b/gi, "."],
  [/\s*\bcomma\b/gi, ","],
  [/\s*\bquestion mark\b/gi, "?"],
  [/\s*\bexclamation (mark|point)\b/gi, "!"],
  [/\s*\bcolon\b/gi, ":"],
  [/\s*\bsemicolon\b/gi, ";"],
];

function tidy(heard) {
  let t = heard.trim();
  for (const [re, to] of SPOKEN) t = t.replace(re, to);
  // A capital after each sentence end and each new line.
  return t.replace(/([.?!]\s+|\n)([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

/** `text` joined onto `before`, with a space and a capital where they belong. */
function joinAt(before, text) {
  if (!text) return text;
  const startsSentence = !before.trim() || /[.?!]\s*$|\n\s*$/.test(before);
  if (startsSentence) text = text[0].toUpperCase() + text.slice(1);
  const gap = before && !/\s$/.test(before) && !/^[\n.,?!:;]/.test(text);
  return (gap ? " " : "") + text;
}

export default function DictationTextarea({ className = "", ...props }) {
  if (!Recognition) return <textarea className={className} {...props} />;
  return <Dictating className={className} {...props} />;
}

function Dictating({ className, ...props }) {
  const ref = useRef(null);
  const rec = useRef(null);
  const caret = useRef(null); // where the last phrase ended, until React catches up
  const latest = useRef(props);
  latest.current = props;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  // Never leave the microphone on after the field goes away.
  useEffect(() => () => rec.current?.abort(), []);

  const insert = (heard) => {
    const el = ref.current;
    const value = String(latest.current.value ?? "");
    const start = caret.current ?? (el ? el.selectionStart : value.length);
    const end = caret.current ?? (el ? el.selectionEnd : value.length);
    const before = value.slice(0, start);
    const piece = joinAt(before, tidy(heard));
    if (!piece) return;
    const next = before + piece + value.slice(end);
    latest.current.onChange?.({ target: { value: next } });
    // Two phrases can land in one event, before the field re-renders.
    latest.current = { ...latest.current, value: next };
    // Keep the cursor after what was just said, so the next phrase follows it.
    const at = start + piece.length;
    caret.current = at;
    requestAnimationFrame(() => {
      caret.current = null;
      if (!ref.current) return;
      ref.current.selectionStart = ref.current.selectionEnd = at;
    });
  };

  const start = () => {
    setError("");
    const r = new Recognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-GB";
    r.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) insert(res[0].transcript);
        else pending += res[0].transcript;
      }
      setInterim(pending);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone blocked — allow it in the browser’s site settings."
          : e.error === "network"
            ? "Dictation needs an internet connection."
            : "Dictation stopped — try again.",
      );
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      ref.current?.focus();
    } catch {
      setError("Couldn’t start the microphone.");
    }
  };

  const stop = () => rec.current?.stop();

  return (
    <div className={`dictation ${listening ? "listening" : ""}`}>
      <textarea ref={ref} className={className} {...props} />
      <button
        type="button"
        className="dictation-mic"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        title={
          listening
            ? "Stop dictation"
            : "Dictate — speak instead of typing. Say “new line”, “comma”, “full stop”."
        }
        aria-label={listening ? "Stop dictation" : "Start dictation"}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z"
          />
        </svg>
      </button>
      {(listening || error) && (
        <p className="dictation-status small" role="status">
          {error ||
            (interim ? <em>{interim}</em> : "Listening… speak now. Click the mic to stop.")}
        </p>
      )}
    </div>
  );
}
