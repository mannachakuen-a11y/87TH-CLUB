// ------------------------------------------------------------------
// A generative on-brand visual engine. Given the brand's palette and a
// "world" DNA, it produces real SVG/HTML visuals (identity lockups,
// moodboards, social posts, hero creatives, campaign boards, template
// canvases). Deterministic: same brand + seed => same visual, so the OS
// feels coherent and repeatable rather than random decorative noise.
// ------------------------------------------------------------------

export interface BrandDNA {
  name: string;
  tagline?: string;
  accent: string;
  bgs: string[];
  fg: string;
  monoBg: string;
  serif: string;
  sans: string;
}

export function dnaFrom(project: {
  brandName: string;
  tagline?: string;
  palette: string[];
  accent: string;
  styleName?: string;
}): BrandDNA {
  const p = project.palette && project.palette.length ? project.palette : ["#0b0b0c", "#f1ede6", "#FF3231"];
  const accent = project.accent || "#FF3231";
  return {
    name: project.brandName,
    tagline: project.tagline || "EST. 2026",
    accent,
    bgs: [p[1] ?? "#f1ede6", p[0] ?? "#0b0b0c", p[2] ?? p[0] ?? "#0b0b0c"],
    fg: p[0] ?? "#0b0b0c",
    monoBg: p[0] ?? "#0b0b0c",
    serif: "Georgia, 'Times New Roman', serif",
    sans: "'Helvetica Neue', Arial, sans-serif",
  };
}

function esc(s?: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

// -------- IDENTITY LOCKUP (a logo/wordmark visual) --------
export function identityLockup(d: BrandDNA, seed = 1): string {
  const rnd = mulberry(hash(d.name) + seed);
  const num = Math.floor(rnd() * 200) + 1; // "87" style two-digit monogram
  const two = String(Math.floor(rnd() * 100)).padStart(2, "0");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" rx="28" fill="${d.monoBg}"/>
    <rect x="16" y="16" width="368" height="368" rx="20" fill="none" stroke="${d.fg}.4" stroke-width="1"/>
    <text x="200" y="220" font-family="${d.serif}" font-size="150" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="-4">${two}</text>
    <rect x="120" y="258" width="160" height="3" fill="${d.accent}"/>
    <text x="200" y="292" font-family="${d.sans}" font-size="16" fill="#fff" text-anchor="middle" letter-spacing="8">${esc(d.name.toUpperCase())}</text>
    <text x="200" y="316" font-family="${d.sans}" font-size="10" fill="#fff" opacity=".6" text-anchor="middle" letter-spacing="4">${esc(d.tagline)}</text>
  </svg>`;
}

// -------- MOODBOARD / WORLD BOARD (tile collage) --------
export function moodboard(d: BrandDNA, seed = 1): string {
  const rnd = mulberry(hash(d.name) + seed + 7);
  const palette = [d.fg, d.accent, d.bgs[0], "#d9d2c4", "#3a3a3c", "#e8e2d6"];
  const tiles = Array.from({ length: 9 }, (_, i) => {
    const c = palette[Math.floor(rnd() * palette.length)];
    const rx = 0;
    const words = ["WORLD", "FORM", "TEXTURE", "LIGHT", "MOVEMENT", "CULTURE", "SCENE", "PEOPLE", "CODE"];
    return `<rect x="${(i % 3) * 140 + 10}" y="${Math.floor(i / 3) * 140 + 10}" width="128" height="128" rx="${rx}" fill="${c}" opacity="${i === 4 ? 1 : 0.9}"/>
      <text x="${(i % 3) * 140 + 74}" y="${Math.floor(i / 3) * 140 + 74}" font-family="${d.sans}" font-size="9" text-anchor="middle" fill="${c === d.fg || c === "#3a3a3c" ? "#fff" : "#0b0b0c"}" letter-spacing="2" opacity=".8">${words[i]}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440">
    <rect width="440" height="440" fill="${d.bgs[0]}"/>
    ${tiles}
    <text x="220" y="418" font-family="${d.sans}" font-size="10" fill="#0b0b0c" text-anchor="middle" letter-spacing="6">${esc(d.name.toUpperCase())} · WORLD</text>
  </svg>`;
}

// -------- SOCIAL POST (portrait 4:5) --------
export function socialPost(d: BrandDNA, seed = 1, kicker = "THE DROP", headline = "NO. 87"): string {
  const rnd = mulberry(hash(d.name) + seed + 21);
  const idx = Math.floor(rnd() * d.bgs.length);
  const bg = d.bgs[idx];
  const fg = bg === d.fg || bg === "#0b0b0c" ? "#fff" : "#0b0b0c";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900">
    <rect width="720" height="900" fill="${bg}"/>
    <circle cx="${200 + rnd() * 320}" cy="${220 + rnd() * 240}" r="${90 + rnd() * 80}" fill="${d.accent}" opacity=".9"/>
    <rect x="60" y="60" width="200" height="3" fill="${d.accent}"/>
    <text x="60" y="120" font-family="${d.sans}" font-size="20" fill="${fg}" letter-spacing="8">${esc(kicker)}</text>
    <text x="60" y="420" font-family="${d.serif}" font-size="140" font-weight="700" fill="${fg}" letter-spacing="-3">${esc(headline)}</text>
    <text x="60" y="470" font-family="${d.serif}" font-size="140" fill="${d.accent}" opacity=".85">${esc(headline)}</text>
    <text x="60" y="560" font-family="${d.sans}" font-size="18" fill="${fg}" opacity=".8">${esc(d.tagline)}</text>
    <text x="60" y="812" font-family="${d.sans}" font-size="14" fill="${fg}" opacity=".7" letter-spacing="4">${esc(d.name.toUpperCase())}</text>
    <text x="660" y="812" font-family="${d.sans}" font-size="14" fill="${fg}" opacity=".7" text-anchor="end" letter-spacing="2">SHOP</text>
  </svg>`;
}

// -------- HERO CREATIVE (campaign, wide 16:9) --------
export function heroCreative(d: BrandDNA, seed = 1, headline = "A NEW SEASON", sub = "The world, framed by the brand."): string {
  const rnd = mulberry(hash(d.name) + seed + 31);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="${d.monoBg}"/>
    <rect x="0" y="0" width="1600" height="900" fill="url(#g)"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${d.fg}"/><stop offset="1" stop-color="${d.accent}" stop-opacity=".85"/>
    </linearGradient></defs>
    <circle cx="${rnd() * 800 + 400}" cy="${rnd() * 200 + 250}" r="260" fill="none" stroke="${d.accent}" stroke-width="2" opacity=".6"/>
    <rect x="120" y="120" width="120" height="3" fill="${d.accent}"/>
    <text x="120" y="360" font-family="${d.serif}" font-size="150" font-weight="700" fill="#fff" letter-spacing="-4">${esc(headline)}</text>
    <text x="120" y="430" font-family="${d.serif}" font-size="150" fill="#fff" opacity=".5">${esc(headline)}</text>
    <text x="120" y="520" font-family="${d.sans}" font-size="24" fill="#fff" opacity=".85">${esc(sub)}</text>
    <text x="120" y="820" font-family="${d.sans}" font-size="16" fill="#fff" opacity=".7" letter-spacing="6">${esc(d.name.toUpperCase())} · ${esc(d.tagline)}</text>
  </svg>`;
}

// -------- TEMPLATE CANVAS (used to seed Design Studio) --------
export function templateCanvas(d: BrandDNA, kind: "homepage" | "product" | "social" | "poster" | "board" | "book" | "campaign"): { id: string; width: number; height: number; name: string; palette: string[] } {
  const dims: Record<string, [number, number, string]> = {
    homepage: [1080, 1920, "Website · Homepage Concept"],
    product: [1080, 1080, "Website · Product Page"],
    social: [1080, 1350, "Social · Feed Post"],
    poster: [720, 1080, "Poster · A4"],
    board: [1600, 900, "Campaign · Board"],
    book: [1600, 1200, "Brand Book · Cover"],
    campaign: [1920, 1080, "Campaign · Hero"],
  };
  const [w, h, name] = dims[kind];
  return { id: `canvas_${hash(kind)}_${Date.now().toString(36)}`, width: w, height: h, name, palette: [d.accent, d.fg, d.bgs[0]] };
}

// -------- PALETTE board --------
export function paletteBoard(d: BrandDNA): string {
  const swatches = [d.fg, d.accent, d.bgs[0], d.bgs[2] ?? "#3a3a3c", "#d9d2c4"].map((c, i) => {
    const light = c === "#fff" || c === "#f1ede6" || c === "#d9d2c4" || c === "#e8e2d6";
    return `<rect x="${i * 120 + 20}" y="40" width="100" height="360" rx="14" fill="${c}"/>
      <text x="${i * 120 + 70}" y="430" font-family="${d.sans}" font-size="10" fill="#0b0b0c" text-anchor="middle" letter-spacing="1">#${c.replace("#", "").toUpperCase()}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fff"/>${swatches}<text x="20" y="22" font-family="${d.sans}" font-size="12" fill="#999" letter-spacing="3">PALETTE</text></svg>`;
}

export function toDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
