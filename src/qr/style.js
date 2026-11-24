/*
 * QR styling renderer, ported from go.grusiber.com's old admin. The drawing
 * code is unchanged on purpose: saved designs must render exactly as before.
 * Input: rows from qrRows() + a design object. Output: an SVG string.
 *
 * design = {
 *   dot: "square" | "rounded" | "dots" | "fluid",
 *   eyeOuter: "square" | "rounded" | "circle" | "leaf",
 *   eyeInner: "square" | "rounded" | "dot" | "leaf",
 *   fg: "#000000", eye: "" (= fg), bg: "#ffffff",
 *   logo: { id: null | number, size: 0.22, pad: true },
 *   frame: { style: "none" | "terminal" | "brackets" | "matrix" | "hud" | "classic",
 *            text: "SCAN ME", color: "#00ff66", bg: "#0b0f0c" }
 * }
 */
/* eslint-disable */
export const MARGIN = 4; // quiet zone, in modules
const MONO = "ui-monospace, 'JetBrains Mono', 'Fira Code', Menlo, Consolas, 'DejaVu Sans Mono', monospace";

export const DEFAULT_DESIGN = {
  dot: "square",
  eyeOuter: "square",
  eyeInner: "square",
  fg: "#000000",
  eye: "",
  bg: "#ffffff",
  logo: { id: null, size: 0.22, pad: true },
  frame: { style: "none", text: "", color: "#00ff66", bg: "#0b0f0c" },
};

export const FRAME_DEFAULT_TEXT = {
  terminal: "$ ./scan_me.sh",
  brackets: "[ SCAN_ME ]",
  matrix: "> SCAN TO JACK IN",
  hud: "SCAN // CONNECT",
  classic: "SCAN ME",
};

const r3 = (v) => Math.round(v * 1000) / 1000;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex = (c, fallback) => (/^#[0-9a-fA-F]{6}$/.test(c || "") ? c : fallback);

export function normalize(d) {
  d = d || {};
  const out = { ...DEFAULT_DESIGN, ...d };
  out.logo = { ...DEFAULT_DESIGN.logo, ...(d.logo || {}) };
  out.frame = { ...DEFAULT_DESIGN.frame, ...(d.frame || {}) };
  out.fg = hex(out.fg, "#000000");
  out.bg = hex(out.bg, "#ffffff");
  out.eye = out.eye ? hex(out.eye, out.fg) : "";
  out.frame.color = hex(out.frame.color, "#00ff66");
  out.frame.bg = hex(out.frame.bg, "#0b0f0c");
  out.logo.size = Math.min(0.3, Math.max(0.1, Number(out.logo.size) || 0.22));
  return out;
}

/** Rounded rect path with per-corner radii [tl, tr, br, bl]. */
function rrect(x, y, w, h, radii) {
  const [tl, tr, br, bl] = radii.map((r) => Math.min(r, w / 2, h / 2));
  let p = `M${r3(x + tl)} ${r3(y)}H${r3(x + w - tr)}`;
  if (tr) p += `A${r3(tr)} ${r3(tr)} 0 0 1 ${r3(x + w)} ${r3(y + tr)}`;
  p += `V${r3(y + h - br)}`;
  if (br) p += `A${r3(br)} ${r3(br)} 0 0 1 ${r3(x + w - br)} ${r3(y + h)}`;
  p += `H${r3(x + bl)}`;
  if (bl) p += `A${r3(bl)} ${r3(bl)} 0 0 1 ${r3(x)} ${r3(y + h - bl)}`;
  p += `V${r3(y + tl)}`;
  if (tl) p += `A${r3(tl)} ${r3(tl)} 0 0 1 ${r3(x + tl)} ${r3(y)}`;
  return p + "Z";
}

function eyeOuterPath(x, y, style) {
  const R = { square: [0, 0, 0, 0], rounded: [2, 2, 2, 2], circle: [3.5, 3.5, 3.5, 3.5], leaf: [3, 0, 3, 0] }[style] || [0, 0, 0, 0];
  const r = { square: [0, 0, 0, 0], rounded: [1.3, 1.3, 1.3, 1.3], circle: [2.5, 2.5, 2.5, 2.5], leaf: [2, 0, 2, 0] }[style] || [0, 0, 0, 0];
  return rrect(x, y, 7, 7, R) + rrect(x + 1, y + 1, 5, 5, r);
}

function eyeInnerPath(x, y, style) {
  const R = { square: [0, 0, 0, 0], rounded: [0.8, 0.8, 0.8, 0.8], dot: [1.5, 1.5, 1.5, 1.5], leaf: [1.5, 0, 1.5, 0] }[style] || [0, 0, 0, 0];
  return rrect(x + 2, y + 2, 3, 3, R);
}

/**
 * Draw the QR itself (quiet zone included) at the origin.
 * Returns { svg: inner markup, size: modules incl. margin }.
 */
function drawQr(rows, d, logoDataUrl) {
  const n = rows.length;
  const size = n + MARGIN * 2;
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  // Logo area: whole modules around the center, plus half a module of padding.
  let logoBox = null;
  if (logoDataUrl) {
    const L = d.logo.size * n;
    const lo = (n - L) / 2 - 0.5;
    const hi = (n + L) / 2 + 0.5;
    logoBox = { lo, hi };
  }
  const inLogo = (r, c) => logoBox && r + 1 > logoBox.lo && r < logoBox.hi && c + 1 > logoBox.lo && c < logoBox.hi;
  const dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && rows[r][c] === "1" && !inFinder(r, c) && !inLogo(r, c);

  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      const x = c + MARGIN;
      const y = r + MARGIN;
      switch (d.dot) {
        case "dots":
          path += `M${x + 0.05} ${y + 0.5}a.45 .45 0 1 0 .9 0a.45 .45 0 1 0 -.9 0Z`;
          break;
        case "rounded":
          path += rrect(x + 0.04, y + 0.04, 0.92, 0.92, [0.3, 0.3, 0.3, 0.3]);
          break;
        case "fluid": {
          const up = dark(r - 1, c), dn = dark(r + 1, c), lf = dark(r, c - 1), rt = dark(r, c + 1);
          const k = 0.5;
          path += rrect(x, y, 1, 1, [!up && !lf ? k : 0, !up && !rt ? k : 0, !dn && !rt ? k : 0, !dn && !lf ? k : 0]);
          break;
        }
        default:
          path += `M${x} ${y}h1v1h-1z`;
      }
    }
  }

  const eyeColor = d.eye || d.fg;
  let eyes = "";
  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = c + MARGIN, y = r + MARGIN;
    eyes += `<path fill-rule="evenodd" d="${eyeOuterPath(x, y, d.eyeOuter)}"/>`;
    eyes += `<path d="${eyeInnerPath(x, y, d.eyeInner)}"/>`;
  }

  let logo = "";
  if (logoBox) {
    const x = logoBox.lo + MARGIN + 0.5, w = logoBox.hi - logoBox.lo - 1;
    if (d.logo.pad) logo += `<rect x="${r3(x - 0.3)}" y="${r3(x - 0.3)}" width="${r3(w + 0.6)}" height="${r3(w + 0.6)}" rx="${r3(w * 0.12)}" fill="${d.bg}"/>`;
    logo += `<image href="${logoDataUrl}" x="${r3(x + 0.25)}" y="${r3(x + 0.25)}" width="${r3(w - 0.5)}" height="${r3(w - 0.5)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const crisp = d.dot === "square" ? ' shape-rendering="crispEdges"' : "";
  const svg =
    `<rect width="${size}" height="${size}" fill="${d.bg}"/>` +
    `<path fill="${d.fg}"${crisp} d="${path}"/>` +
    `<g fill="${eyeColor}">${eyes}</g>` +
    logo;
  return { svg, size };
}

function fitFont(text, maxWidth, maxSize) {
  // Monospace glyphs are ~0.6em wide.
  return r3(Math.min(maxSize, maxWidth / Math.max(1, String(text).length * 0.62)));
}

// Deterministic pseudo-random numbers, so a frame looks the same every render.
function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Wraps the QR (size S) in a frame. Returns { svg, w, h }. */
function drawFrame(qr, S, d, seed) {
  const f = d.frame;
  const text = f.text || FRAME_DEFAULT_TEXT[f.style] || "";
  const acc = f.color;
  const fbg = f.bg;
  const at = (x, y) => `<g transform="translate(${r3(x)} ${r3(y)})">${qr}</g>`;

  switch (f.style) {
    case "terminal": {
      const p = 2, bar = 4.2, foot = 7;
      const W = S + p * 2, H = bar + S + p + foot;
      const fs = fitFont(text + "_", W - 4, 2.6);
      const title = "grusiber@go: ~";
      return {
        w: W, h: H,
        svg:
          `<rect width="${W}" height="${H}" rx="1.6" fill="${fbg}"/>` +
          `<rect x=".25" y=".25" width="${W - 0.5}" height="${H - 0.5}" rx="1.4" fill="none" stroke="${acc}" stroke-opacity=".45" stroke-width=".5"/>` +
          `<path d="M.5 ${bar}H${W - 0.5}" stroke="${acc}" stroke-opacity=".3" stroke-width=".3"/>` +
          `<circle cx="2.4" cy="${bar / 2}" r=".75" fill="#ff5f57"/><circle cx="4.6" cy="${bar / 2}" r=".75" fill="#febc2e"/><circle cx="6.8" cy="${bar / 2}" r=".75" fill="#28c840"/>` +
          `<text x="${W / 2}" y="${bar / 2 + 0.55}" font-family="${MONO}" font-size="1.5" fill="${acc}" fill-opacity=".7" text-anchor="middle">${esc(title)}</text>` +
          at(p, bar + 0.6) +
          `<text x="2" y="${r3(bar + 0.6 + S + foot / 2 + fs * 0.35)}" font-family="${MONO}" font-size="${fs}" font-weight="700" fill="${acc}">${esc(text)}<tspan fill-opacity=".85">_</tspan></text>`,
      };
    }

    case "brackets": {
      const g = 3, foot = 7;
      const W = S + g * 2, H = S + g * 2 + foot;
      const L = Math.max(5, S * 0.18), t = 0.9;
      const x0 = 1, y0 = 1, x1 = W - 1, y1 = S + g * 2 - 1;
      const br =
        `M${x0} ${y0 + L}V${y0}H${x0 + L}` + `M${x1 - L} ${y0}H${x1}V${y0 + L}` +
        `M${x1} ${y1 - L}V${y1}H${x1 - L}` + `M${x0 + L} ${y1}H${x0}V${y1 - L}`;
      const fs = fitFont(text, W - 4, 3);
      return {
        w: W, h: H,
        svg:
          `<rect width="${W}" height="${H}" rx="1" fill="${fbg}"/>` +
          `<path d="${br}" fill="none" stroke="${acc}" stroke-width="${t}" stroke-linecap="square"/>` +
          at(g, g) +
          `<text x="${W / 2}" y="${r3(S + g * 2 + foot / 2 + fs * 0.3)}" font-family="${MONO}" font-size="${fs}" font-weight="700" fill="${acc}" text-anchor="middle" letter-spacing=".15">${esc(text)}</text>`,
      };
    }

    case "matrix": {
      const p = 4, foot = 8;
      const W = S + p * 2, H = S + p * 2 + foot;
      const rand = rng(seed + "matrix");
      const glyphs = "01アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>/*+=";
      let rain = "";
      const step = 1.6;
      for (let x = 0.8; x < W - 0.5; x += step) {
        const len = 4 + Math.floor(rand() * 14);
        let y = -2 + rand() * H;
        for (let i = 0; i < len && y < H; i++, y += 1.7) {
          if (y < 1) continue;
          const ch = glyphs[Math.floor(rand() * glyphs.length)];
          const op = i === len - 1 ? 1 : 0.22 + (i / len) * 0.6;
          rain += `<text x="${r3(x)}" y="${r3(y)}" fill-opacity="${r3(op)}">${esc(ch)}</text>`;
        }
      }
      const fs = fitFont(text, W - 6, 3);
      return {
        w: W, h: H,
        svg:
          `<rect width="${W}" height="${H}" rx="1.2" fill="${fbg}"/>` +
          `<g font-family="${MONO}" font-size="1.4" fill="${acc}">${rain}</g>` +
          `<rect x="${p - 0.6}" y="${p - 0.6}" width="${S + 1.2}" height="${S + 1.2}" rx=".6" fill="${fbg}" stroke="${acc}" stroke-width=".35"/>` +
          at(p, p) +
          `<rect x="${r3(W / 2 - (text.length * fs * 0.62) / 2 - 1.2)}" y="${r3(S + p * 2 + foot / 2 - fs * 0.85)}" width="${r3(text.length * fs * 0.62 + 2.4)}" height="${r3(fs * 1.5)}" fill="${fbg}"/>` +
          `<text x="${W / 2}" y="${r3(S + p * 2 + foot / 2 + fs * 0.25)}" font-family="${MONO}" font-size="${fs}" font-weight="700" fill="${acc}" text-anchor="middle">${esc(text)}</text>`,
      };
    }

    case "hud": {
      const p = 3.5, top = 3, foot = 7.5;
      const W = S + p * 2, H = top + S + p + foot;
      const c = 2.5; // chamfer
      const outline = `M${c} .5H${W - 0.5}V${H - c}L${W - c} ${H - 0.5}H.5V${c}Z`;
      let ticks = "";
      for (let x = 4; x < W - 4; x += 2) ticks += `M${r3(x)} ${H - 1.2}v-${x % 10 < 2 ? 0.9 : 0.45}`;
      const fs = fitFont(text, W - 8, 2.8);
      return {
        w: W, h: H,
        svg:
          `<rect width="${W}" height="${H}" fill="${fbg}"/>` +
          `<path d="${outline}" fill="none" stroke="${acc}" stroke-width=".4"/>` +
          `<path d="M${p - 1} ${top - 0.4}h4M${p - 1} ${top - 0.4}v4M${W - p + 1} ${top - 0.4}h-4M${W - p + 1} ${top - 0.4}v4M${p - 1} ${top + S + 1.4}h4M${p - 1} ${top + S + 1.4}v-4M${W - p + 1} ${top + S + 1.4}h-4M${W - p + 1} ${top + S + 1.4}v-4" stroke="${acc}" stroke-width=".55" fill="none"/>` +
          `<text x="${c + 0.8}" y="2.1" font-family="${MONO}" font-size="1.15" fill="${acc}" fill-opacity=".75">SYS://GO.GRUSIBER</text>` +
          `<text x="${W - 1.5}" y="2.1" font-family="${MONO}" font-size="1.15" fill="${acc}" fill-opacity=".75" text-anchor="end">● LIVE</text>` +
          at(p, top + 0.5) +
          `<path d="${ticks}" stroke="${acc}" stroke-opacity=".5" stroke-width=".2"/>` +
          `<text x="${W / 2}" y="${r3(top + S + p + foot / 2 - 0.2)}" font-family="${MONO}" font-size="${fs}" font-weight="700" fill="${acc}" text-anchor="middle" letter-spacing=".2">${esc(text)}</text>`,
      };
    }

    case "classic": {
      const p = 1.5, foot = 7;
      const W = S + p * 2, H = S + p * 2 + foot;
      const fs = fitFont(text, W - 4, 3.2);
      return {
        w: W, h: H,
        svg:
          `<rect width="${W}" height="${H}" rx="2" fill="${fbg}"/>` +
          at(p, p) +
          `<text x="${W / 2}" y="${r3(S + p * 2 + foot / 2 + fs * 0.25)}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${fs}" font-weight="800" fill="${acc}" text-anchor="middle" letter-spacing=".1">${esc(text)}</text>`,
      };
    }

    default:
      return { svg: qr, w: S, h: S };
  }
}

/** Full render: rows (array of "0101…" strings) → standalone SVG string. */
export function render(rows, design, opts) {
  opts = opts || {};
  const d = normalize(design);
  const { svg: qr, size } = drawQr(rows, d, opts.logoDataUrl || null);
  const framed = drawFrame(qr, size, d, opts.seed || rows.join("").slice(0, 64));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(framed.w)} ${r3(framed.h)}">` +
    framed.svg +
    `</svg>`
  );
}

// ---------- helpers for the designer UI ----------

function luminance(hexColor) {
  const v = [1, 3, 5].map((i) => parseInt(hexColor.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** Scan-safety warnings for a design. */
export function warnings(design, hasLogo) {
  const d = normalize(design);
  const out = [];
  const lf = luminance(d.fg), lb = luminance(d.bg), le = luminance(d.eye || d.fg);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  if (lf > lb || le > lb) out.push("kod arka plandan açık renkli (ters). çoğu telefon kamerası ters kodları okuyamaz.");
  else if (ratio(lf, lb) < 4 || ratio(le, lb) < 4) out.push("kod ile arka plan arasında kontrast düşük. daha koyu bir kod rengi ya da daha açık bir arka plan seç.");
  if (hasLogo && d.logo.size > 0.25) out.push("logo büyük. basmadan önce birkaç telefonla okutup dene.");
  return out;
}

/** Small fake matrix for button previews. */
export function sampleRows(n) {
  n = n || 21;
  const rand = rng("sample" + n);
  const rows = [];
  for (let r = 0; r < n; r++) {
    let s = "";
    for (let c = 0; c < n; c++) s += rand() < 0.5 ? "1" : "0";
    rows.push(s);
  }
  return rows;
}
