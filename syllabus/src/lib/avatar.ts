// Deterministic SVG "photo" generator — gives seed profiles attractive,
// offline placeholder images (no external image hosts needed for the demo).

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES: [string, string][] = [
  ["#8a1c2b", "#d1495b"], // crimson
  ["#1f4d38", "#2f6f50"], // forest
  ["#3b3b58", "#6d6da3"], // dusk
  ["#7a4419", "#c9822f"], // amber
  ["#144552", "#2c7a7b"], // teal
  ["#5b2333", "#a53860"], // wine
  ["#2d3142", "#4f5d75"], // slate
  ["#6a4c93", "#a685c8"], // violet
];

function initials(label: string): string {
  const parts = label.replace(/[^a-zA-Z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarSvg(seed: string, label = ""): string {
  const h = hash(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const rot = h % 60;
  const mono = initials(label || seed);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="${escapeXml(
    label || "profile photo"
  )}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${rot} 0.5 0.5)">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <rect width="600" height="800" fill="url(#grid)"/>
  <circle cx="300" cy="315" r="150" fill="rgba(255,255,255,0.14)"/>
  <text x="300" y="315" font-family="Georgia, serif" font-size="150" font-weight="700"
        fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">${escapeXml(
          mono
        )}</text>
  <rect x="70" y="560" width="460" height="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="70" y="600" width="360" height="4" fill="rgba(255,255,255,0.18)"/>
  <rect x="70" y="640" width="410" height="4" fill="rgba(255,255,255,0.14)"/>
  <text x="300" y="735" font-family="Georgia, serif" font-size="26" letter-spacing="6"
        fill="rgba(255,255,255,0.7)" text-anchor="middle">RESYLLABUS</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}
