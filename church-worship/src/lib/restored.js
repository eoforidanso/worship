/**
 * "Your service was restored." Everything is saved as it changes (the store
 * persists to this computer), but nobody feels that unless they're told.
 * This remembers when the plan last changed, and on opening says what came
 * back and how recent it is.
 */

import { useContent } from "../store/useContent";

const KEY = "ambo-saved-at";
const read = () => {
  try {
    return Number(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};

// As the app opens: what was there before anything changes.
const plan = useContent.getState().plan;
export const restored = plan?.items?.length
  ? { title: plan.title, count: plan.items.length, savedAt: read() }
  : null;

let last = 0;
useContent.subscribe((s, prev) => {
  if (s.plan === prev.plan) return;
  const now = Date.now();
  if (now - last < 2000) return; // a burst of typing is one save
  last = now;
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    /* nothing to lose by not knowing */
  }
});

/** "just now", "4 minutes ago", "yesterday at 19:40", "on 12 October" */
export function ago(ms) {
  if (!ms) return "";
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600)
    return `${Math.round(s / 60)} minute${Math.round(s / 60) === 1 ? "" : "s"} ago`;
  const d = new Date(ms);
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return `today at ${time}`;
  if (d.toDateString() === yesterday.toDateString())
    return `yesterday at ${time}`;
  return `on ${d.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;
}
