/**
 * Canvas slide renderer.
 *
 * One function draws every surface in the app — planner thumbnails, the
 * composer preview, the projector output and the stage display — so what the
 * operator previews is pixel-for-pixel what the congregation sees.
 *
 * Everything is authored against a 1920x1080 design space and scaled to the
 * target canvas, so a 240px thumbnail and a 4K projector agree on layout.
 */

import { urlFor } from "./mediaStore";

export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

// --- image cache -----------------------------------------------------------

const imageCache = new Map();

/**
 * Returns a decoded image immediately if we already have it, otherwise kicks
 * off a load and returns null. Callers redraw when `onReady` fires.
 */
export function getImage(url, onReady) {
  if (!url) return null;
  const hit = imageCache.get(url);
  if (hit) {
    if (hit.complete && hit.naturalWidth) return hit;
    // Still loading: every surface waiting on it gets told, not just the first
    // to ask — otherwise thumbnails stay black while the preview fills in.
    if (onReady) hit.waiting.add(onReady);
    return null;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.waiting = new Set(onReady ? [onReady] : []);
  img.onload = () => {
    for (const fn of img.waiting) fn();
    img.waiting.clear();
  };
  img.onerror = () => imageCache.delete(url);
  img.src = url;
  imageCache.set(url, img);
  return null;
}

// --- video cache -----------------------------------------------------------

const videoCache = new Map();

/**
 * Video backgrounds, on the same terms as images: the renderer owns the
 * element, so every surface gets them through one path and no caller has to
 * mount a `<video>` of its own.
 *
 * Returns a playing element once there's a frame to draw, otherwise null.
 * Surfaces that animate (output, live preview) get motion; static ones
 * (thumbnails) draw whatever frame has landed, which is the right still.
 */
export function getVideo(url, onReady) {
  if (!url) return null;
  const hit = videoCache.get(url);
  if (hit) return hit.readyState >= 2 ? hit : null;

  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true; // autoplay is only allowed muted, and slides carry no sound
  v.loop = true;
  v.playsInline = true;
  v.preload = "auto";
  v.onloadeddata = () => {
    v.play().catch(() => {
      /* autoplay blocked until a gesture — the poster frame still draws */
    });
    onReady?.();
  };
  v.onerror = () => videoCache.delete(url);
  v.src = url;
  videoCache.set(url, v);
  return null;
}

// --- text layout -----------------------------------------------------------

/** Greedy word wrap. Explicit newlines are always honoured as hard breaks. */
function layoutLines(ctx, text, maxWidth) {
  const out = [];
  for (const hard of text.split("\n")) {
    if (!hard.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of hard.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Shrink the font until the wrapped text fits the text box. Caps at 12
 * iterations so a pathological slide can't stall the render loop.
 */
function fitText(ctx, text, theme, boxW, boxH, scale) {
  let size = theme.fontSize * scale;
  const min = 12 * scale;
  for (let i = 0; i < 12; i++) {
    ctx.font = `${theme.fontWeight} ${size}px ${theme.fontFamily}`;
    const lines = layoutLines(ctx, text, boxW);
    const height = lines.length * size * theme.lineHeight;
    if (height <= boxH || size <= min) return { lines, size };
    size = Math.max(min, size * Math.sqrt(boxH / height) * 0.98);
  }
  ctx.font = `${theme.fontWeight} ${size}px ${theme.fontFamily}`;
  return { lines: layoutLines(ctx, text, boxW), size };
}

// --- background ------------------------------------------------------------

/** Draw an image whole (object-fit: contain) — a poster or a PDF page keeps its edges. */
function drawContain(ctx, img, w, h) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Draw an image cropped to fill (object-fit: cover), never distorted. */
function drawCover(ctx, img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Liturgical colours as projector backgrounds: deep enough that white text
 * stays easy to read, with a soft light from above. "White" days (Christmas,
 * Easter, feasts of the Lord and of Our Lady) are a warm gold rather than
 * white, which would wash the words out.
 */
// The season's colour, as light: [the glow from above, how strong it is].
const LITURGICAL = {
  purple: ["#55308c", 0.75],
  white: ["#8a6d2c", 0.6],
  gold: ["#8a6d2c", 0.6],
  green: ["#22643f", 0.7],
  red: ["#8a222b", 0.7],
  pink: ["#8c4365", 0.7],
  rose: ["#8c4365", 0.7],
  black: ["#3a3a3a", 0.6],
};

export const hasLiturgical = (colour) => colour in LITURGICAL;

const NAVY = "#070c1c"; // cathedral blue-black: the base under every season
let grain = null; // a fine, barely-there texture, made once

function grainPattern(ctx) {
  if (grain === null) {
    grain = undefined;
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const g = c.getContext("2d");
      const img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 9; // ~3.5% — felt, not seen
      }
      g.putImageData(img, 0, 0);
      grain = c;
    } catch {
      /* no DOM (tests): no texture */
    }
  }
  return grain ? ctx.createPattern(grain, "repeat") : null;
}

/**
 * Deep navy, lit from above by the day's liturgical colour as if through a
 * high window, a trace of candle-gold low down, the edges falling into
 * shadow, and a fine grain. Calm behind the words, never washing them out.
 */
function drawLiturgical(ctx, colour, w, h) {
  const [light, strength] = LITURGICAL[colour];
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = strength;
  const g = ctx.createRadialGradient(
    w / 2,
    -h * 0.1,
    0,
    w / 2,
    -h * 0.1,
    h * 1.25,
  );
  g.addColorStop(0, light);
  g.addColorStop(0.55, `${light}55`);
  g.addColorStop(1, `${light}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const warm = ctx.createRadialGradient(
    w / 2,
    h * 1.05,
    0,
    w / 2,
    h * 1.05,
    w * 0.55,
  );
  warm.addColorStop(0, "rgba(232, 178, 92, 0.09)");
  warm.addColorStop(1, "rgba(232, 178, 92, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  const v = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    h * 0.35,
    w / 2,
    h * 0.45,
    w * 0.72,
  );
  v.addColorStop(0, "rgba(0, 0, 0, 0)");
  v.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  const pattern = grainPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawBackground(ctx, bg, w, h, onReady) {
  if (bg?.kind === "liturgical") {
    drawLiturgical(ctx, bg.colour, w, h);
    return;
  }
  if (!bg || bg.kind === "color") {
    ctx.fillStyle = bg?.value ?? "#000000";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Media is addressed by id and resolved to this session's object URL.
  // `bg.value` is the fallback for remote URLs and for plans saved before
  // media moved into IndexedDB — but a `blob:` value is always a dead
  // reference from an earlier session, so it counts as absent rather than
  // sending us down the image path to draw nothing.
  const stored = bg.mediaId ? urlFor(bg.mediaId) : null;
  const legacy = bg.value?.startsWith("blob:") ? null : bg.value;
  const src = stored ?? legacy ?? null;

  // No bytes for this background — fall back to the flat colour rather than
  // projecting a black rectangle where a photo should be. The text still draws
  // on top, so a missing file never costs the congregation the words.
  if (!src) {
    ctx.fillStyle = bg.fallback ?? "#0b1020";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  if (bg.kind === "image") {
    const img = getImage(src, onReady);
    if (img) (bg.fit === "contain" ? drawContain : drawCover)(ctx, img, w, h);
  } else if (bg.kind === "video") {
    // `bg.element` lets a caller supply its own element; otherwise the
    // renderer owns one, so every surface draws video through this path.
    const v = bg.element ?? getVideo(src, onReady);
    if (v && v.readyState >= 2 && v.videoWidth) {
      const scale = Math.max(w / v.videoWidth, h / v.videoHeight);
      const dw = v.videoWidth * scale;
      const dh = v.videoHeight * scale;
      ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
  }

  if (bg.dim) {
    ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// --- main entry ------------------------------------------------------------

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts
 * @param {object|null} opts.slide    the slide to draw, or null for none
 * @param {object}      opts.theme
 * @param {object|null} opts.background overrides the theme background
 * @param {boolean}     opts.blackout  black screen, nothing else
 * @param {boolean}     opts.cleared   keep the background, hide the text
 * @param {string|null} opts.logoUrl   drawn centred when `showLogo`
 * @param {boolean}     opts.showLogo
 * @param {number|null} opts.countdownTo epoch ms; replaces the slide text
 * @param {string}      opts.footer    small reference line under the text
 * @param {function}    opts.onReady   called when a lazily loaded asset lands
 */
export function renderSlide(ctx, opts) {
  const {
    slide,
    theme,
    background,
    blackout = false,
    cleared = false,
    logoUrl = null,
    showLogo = false,
    countdownTo = null,
    footer = "",
    litColour = "",
    onReady,
  } = opts;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scale = w / DESIGN_W;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (blackout) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  // A slide can carry its own picture (imported photos, PDF pages); otherwise
  // the item's background, otherwise the theme's.
  const themeBg =
    theme.liturgical && hasLiturgical(litColour)
      ? { kind: "liturgical", colour: litColour }
      : theme.background;
  drawBackground(
    ctx,
    slide?.background ?? background ?? themeBg,
    w,
    h,
    onReady,
  );

  if (showLogo) {
    const img = getImage(logoUrl, onReady);
    if (img) {
      const max = Math.min(w, h) * 0.5;
      const s = Math.min(max / img.naturalWidth, max / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    ctx.restore();
    return;
  }

  const text =
    countdownTo != null
      ? formatCountdown(countdownTo)
      : cleared
        ? ""
        : (slide?.body ?? "");
  if (!text.trim()) {
    ctx.restore();
    return;
  }

  const pad = theme.padding * scale;
  // The footer belongs to the slide's words, so it goes when they do (clear,
  // countdown) and takes its room out of the text box rather than overlapping.
  const foot = countdownTo == null && footer ? footer : "";
  const footSize = 34 * scale;
  const footRoom = foot ? footSize * 2 : 0;
  const boxW = w - pad * 2;
  const boxH = h - pad * 2 - footRoom;
  const display = theme.uppercase ? text.toUpperCase() : text;

  const { lines, size } = fitText(ctx, display, theme, boxW, boxH, scale);
  const lineH = size * theme.lineHeight;
  const blockH = lines.length * lineH;

  const x =
    theme.align === "left" ? pad : theme.align === "right" ? w - pad : w / 2;
  let y;
  if (theme.valign === "top") y = pad;
  else if (theme.valign === "bottom") y = h - pad - footRoom - blockH;
  else y = (h - footRoom - blockH) / 2;

  ctx.textAlign = theme.align;
  ctx.textBaseline = "top";

  if (theme.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
  }

  lines.forEach((line, i) => {
    const ly = y + i * lineH + (lineH - size) / 2;
    if (theme.outline) {
      ctx.lineWidth = Math.max(1, size * 0.045);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineJoin = "round";
      ctx.strokeText(line, x, ly);
    }
    ctx.fillStyle = theme.color;
    ctx.fillText(line, x, ly);
  });

  if (foot) {
    ctx.font = `500 ${footSize}px ${theme.fontFamily}`;
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = theme.color;
    ctx.textBaseline = "bottom";
    ctx.fillText(foot, x, h - Math.max(pad * 0.6, footSize));
  }

  ctx.restore();
}

/**
 * The reference line for a slide: its own (scripture lookup writes one per
 * slide), else the item's title and subtitle when the theme asks for it.
 */
export function footerFor(item, slide, theme) {
  if (!theme?.showFooter || !slide) return "";
  if (slide.footer) return slide.footer;
  return [item?.title, item?.subtitle].filter(Boolean).join(" · ");
}

export function formatCountdown(target) {
  const ms = Math.max(0, target - Date.now());
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
