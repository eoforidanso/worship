/**
 * Reassurance for a nervous volunteer: after a Mass is built, say plainly
 * what went in, how long it will take and whether anything is left to do.
 */

import { create } from "zustand";
import { readiness } from "./readiness";
import { sectionOf } from "./sections";
import { timeline } from "./timing";

export const useConfidence = create(() => ({ built: null }));

const homily = () => {
  try {
    return Number(localStorage.getItem("worship-homily") ?? 10);
  } catch {
    return 10;
  }
};

/** Estimated length of the plan in minutes (homily and the unprojected parts included). */
export function runtimeMinutes(items) {
  return Math.round(timeline(items, { homilyMinutes: homily() }).total / 60);
}

/** Call after a Mass is built: the banner on Live reads from this. */
export function announceBuilt(items, title) {
  const ready = readiness(items);
  const parts = new Set(items.map(sectionOf).filter(Boolean)).size;
  useConfidence.setState({
    built: {
      title,
      count: items.length,
      parts,
      minutes: runtimeMinutes(items),
      todo: ready.total - ready.ready,
      at: Date.now(),
    },
  });
}

export const dismissBuilt = () => useConfidence.setState({ built: null });

/** Open the readiness checklist in the service plan. */
export const openChecklist = () =>
  window.dispatchEvent(new Event("ambo-open-checklist"));
