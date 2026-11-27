// Run once by hand: `pnpm dlx tsx scripts/make-og.ts` (or `pnpm exec tsx ...`).
// Writes public/og-source.svg, then renders public/og.png (1200x630) with
// headless Edge or Chrome, so no image library has to be a dependency. The
// product name comes from src/config/site.ts at generation time. Colours are
// read from the dark theme block in src/theme/tokens.css. Not part of prebuild:
// public/og.png is committed.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const at = (path: string): string => fileURLToPath(new URL(path, root));

// site.ts reads `window` and import.meta.env, so read the name from its text.
function readName(): string {
  const source = readFileSync(at('src/config/site.ts'), 'utf8');
  const match = /name: '([^']+)',/.exec(source);
  if (!match?.[1])
    throw new Error('Could not find the product name in site.ts');
  return match[1];
}

function darkToken(css: string, token: string): string {
  const block = css.slice(css.indexOf(":root[data-theme='dark']"));
  const match = new RegExp(`${token}: *(#[0-9a-fA-F]{6})`).exec(block);
  if (!match?.[1])
    throw new Error(`Token ${token} not found in the dark theme`);
  return match[1];
}

type OgColors = Record<
  | 'bg'
  | 'text'
  | 'textMuted'
  | 'accent'
  | 'accent2'
  | 'heroFrom'
  | 'heroVia'
  | 'heroTo'
  | 'heroGlowB',
  string
>;

export function buildOgSvg(name: string, c: OgColors): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.heroFrom}" />
      <stop offset="0.55" stop-color="${c.heroVia}" />
      <stop offset="1" stop-color="${c.heroTo}" />
    </linearGradient>
    <linearGradient id="step" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${c.accent}" />
      <stop offset="1" stop-color="${c.accent2}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1080" cy="80" r="220" fill="${c.heroGlowB}" opacity="0.6" />
  <g transform="translate(400 150) scale(0.62)">
  <g fill="url(#step)">
    <rect x="700" y="440" width="120" height="90" rx="10" opacity="0.55" />
    <rect x="830" y="370" width="120" height="160" rx="10" opacity="0.7" />
    <rect x="960" y="290" width="120" height="240" rx="10" opacity="0.85" />
    <rect x="1090" y="200" width="80" height="330" rx="10" />
  </g>
  <g stroke="${c.accent}" stroke-width="4" fill="${c.bg}">
    <line x1="760" y1="420" x2="890" y2="350" />
    <line x1="890" y1="350" x2="1020" y2="270" />
    <line x1="1020" y1="270" x2="1130" y2="180" />
    <circle cx="760" cy="420" r="12" />
    <circle cx="890" cy="350" r="12" />
    <circle cx="1020" cy="270" r="12" />
    <circle cx="1130" cy="180" r="12" />
  </g>
  </g>
  <text x="80" y="270" font-family="Segoe UI, Arial, sans-serif" font-size="120" font-weight="700" fill="${c.text}">${name}</text>
  <text x="84" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="36" fill="${c.accent}">Learn computer networking, one step at a time</text>
  <text x="84" y="420" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="${c.textMuted}">Plain-English lessons, simulations, quizzes and labs</text>
</svg>
`;
}

function findBrowser(): string {
  const candidates = [
    process.env.BROWSER_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Set BROWSER_PATH to msedge or chrome');
  return found;
}

function main(): void {
  const css = readFileSync(at('src/theme/tokens.css'), 'utf8');
  const read = (token: string) => darkToken(css, token);
  const colors: OgColors = {
    bg: read('--bg'),
    text: read('--text'),
    textMuted: read('--text-muted'),
    accent: read('--accent'),
    accent2: read('--accent-2'),
    heroFrom: read('--hero-from'),
    heroVia: read('--hero-via'),
    heroTo: read('--hero-to'),
    heroGlowB: read('--hero-glow-b'),
  };
  const svgPath = at('public/og-source.svg');
  writeFileSync(svgPath, buildOgSvg(readName(), colors));
  const png = at('public/og.png');
  const result = spawnSync(
    findBrowser(),
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1200,630',
      `--screenshot=${png}`,
      pathToFileURL(svgPath).href,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error('Browser screenshot failed');
  console.log('make-og: wrote public/og-source.svg and public/og.png');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
