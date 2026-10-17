/**
 * Is the projector window open? The Output window says so every couple of
 * seconds (and once more as it closes); the operator window listens, so the
 * Output button can say truthfully whether anything reaches the room.
 * Works across machines too when the relay is running.
 */

import { useEffect, useState } from "react";
import { publish, subscribe } from "./broadcast";

const BEAT_MS = 2000;
const GONE_MS = 5000;

/** In the Output window: announce it, keep announcing it, say goodbye. */
export function useAnnounceOutput() {
  useEffect(() => {
    const beat = () => publish("output-alive", {});
    beat();
    const t = setInterval(beat, BEAT_MS);
    const off = subscribe((msg) => msg.type === "output-ping" && beat());
    const bye = () => publish("output-bye", {});
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(t);
      off();
      window.removeEventListener("pagehide", bye);
      bye();
    };
  }, []);
}

/** In the operator window: true while an Output window is open somewhere. */
export function useOutputOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let last = 0;
    const off = subscribe((msg) => {
      if (msg.type === "output-alive") {
        last = Date.now();
        setOpen(true);
      }
      if (msg.type === "output-bye") {
        last = 0;
        setOpen(false);
      }
    });
    publish("output-ping", {}); // an Output window already open answers at once
    const t = setInterval(() => setOpen(Date.now() - last < GONE_MS), 1000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);
  return open;
}
