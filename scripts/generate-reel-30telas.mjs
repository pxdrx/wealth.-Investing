// Wrapper Node sobre o CLI oficial `higgsfield` para gerar os 6 shots do Reel
// "30 Telas → 1 Decisão" (vide wealth.Investing/Instagram/Reels/30telas-1decisao-shotlist.md).
//
// Uso:
//   node scripts/generate-reel-30telas.mjs                # gera todos os shots
//   node scripts/generate-reel-30telas.mjs --shot 4       # gera só o shot 4
//   node scripts/generate-reel-30telas.mjs --dry-run      # imprime os comandos sem executar
//   node scripts/generate-reel-30telas.mjs --resume       # pula shots que já têm output
//
// Pré-requisito: `higgsfield` (alias `higgs` / `hf`) autenticado e no PATH.
// Output: a CLI imprime a URL do mp4 finalizado no stdout do --wait. Cada shot
// também grava .reels-output/30telas/shot-N.json com a saída JSON do job, de
// onde o consumer extrai a result URL para download (curl/CapCut import).
//
// Sintaxe real do CLI (descoberta via `higgsfield generate create --help` +
// `higgsfield model get cinematic_studio_video_v2`):
//   higgsfield generate create <model> --prompt "..." --aspect_ratio 9:16
//     --duration <int> --mode <std|pro> [--image <path>] --wait --json
// Não existem flags --negative-prompt, --seed, --fps, --resolution, --output.
// Negative prompt e seed precisam ir embutidos no texto do --prompt
// (concatenado em STYLE_SUFFIX abaixo).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "reels-output", "30telas");
const INPUT_DIR = resolve(OUT_DIR, "inputs");

const CLI_BIN = process.env.HIGGSFIELD_CLI ?? "higgsfield";
const HIGGS_MODEL = process.env.HIGGSFIELD_MODEL ?? "cinematic_studio_video_v2";
const HIGGS_QUALITY = process.env.HIGGSFIELD_QUALITY ?? "std"; // std | pro
const WAIT_TIMEOUT = process.env.HIGGSFIELD_WAIT_TIMEOUT ?? "20m";
const WAIT_INTERVAL = process.env.HIGGSFIELD_WAIT_INTERVAL ?? "5s";

const STYLE_SUFFIX = [
  "cinematic, anamorphic 35mm, shallow depth of field, volumetric haze",
  "24fps, color grade: cool teal shadows + warm desaturated highlights",
  "Kodak Vision3 500T film stock, no on-screen text unless specified",
  "no captions, no watermark, photoreal, no cartoon, no illustration",
].join(", ");

const NEGATIVE = [
  "text overlay, captions, subtitle, logo watermark, generated text artifacts",
  "warped hands, extra fingers, distorted face, oversaturated, neon arcade",
  "sci-fi spaceship, futuristic helmet, cyberpunk, motion blur smear",
  "plastic skin, uncanny valley",
].join(", ");

/**
 * Shot definitions — kept inline so this script is the single source of truth
 * for the pipeline. The narrative copy in the .md shotlist is human-facing;
 * this is machine-facing. Keep them in sync.
 */
const SHOTS = [
  {
    n: 1,
    label: "HOOK",
    mode: "text-to-video",
    duration: 5,
    seed: 30001,
    prompt: [
      "A lone male trader silhouette in his late 30s sits in a dim home office,",
      "back to camera, facing a curved wall of 30 stacked monitors arranged in",
      "a 6x5 grid. Each screen flickers with chaotic financial data: candlestick",
      "charts, scrolling Bloomberg-style news tickers, heat maps pulsing red and",
      "green, a central bank press conference paused mid-frame, an economic",
      "calendar with multiple rows highlighted, oil price graphs spiking. The",
      "room is otherwise dark. Volumetric haze diffuses the screen glow. A single",
      "warm desk lamp throws a soft amber halo on the trader's shoulders.",
      "Camera: slow dolly push-in from behind, low angle. No on-screen text.",
    ].join(" "),
  },
  {
    n: 2,
    label: "AUTORIDADE",
    mode: "text-to-video",
    duration: 5,
    seed: 30002,
    prompt: [
      "Continuing the same scene: same trader, same monitor wall. A single thin",
      "emerald-green cursor (hex #00B37E, 2px stroke, no glow halo) appears in",
      "the corner of the upper-left monitor and begins to glide screen to screen",
      "with surgical precision, jumping diagonally across the grid. As the cursor",
      "passes each monitor it briefly underlines one specific data point — a Fed",
      "dot plot value, a DXY level reading 104.32, a COT positioning bar, an",
      "RSI divergence on a candlestick chart — and that data point lights up",
      "white and lifts off the screen as a small luminous particle, the size of",
      "a firefly. The chaotic background data continues underneath but slightly",
      "dimmed. Camera: slow lateral tracking shot following the cursor's path.",
    ].join(" "),
  },
  {
    n: 3,
    label: "TENSÃO",
    mode: "text-to-video",
    duration: 5,
    seed: 30003,
    prompt: [
      "Continuing the same scene: dozens of luminous white particles of data",
      "extracted from the screens drift through the air toward the trader,",
      "forming a slow-orbiting constellation around his head and upper torso.",
      "Each particle is a tiny floating fragment of text or number, barely",
      "legible. The 30 monitors continue to flicker chaotically in the",
      "background, slightly out of focus. The emerald-green cursor (#00B37E)",
      "pulses at the center of the constellation like a slow heartbeat.",
      "Camera: smooth orbit 90 degrees counter-clockwise around the trader,",
      "finally revealing his face for the first time — calm, attentive, no fear,",
      "eyes tracking a particle. Volumetric god rays through the haze.",
    ].join(" "),
  },
  {
    n: 4,
    label: "SÍNTESE",
    mode: "text-to-video",
    duration: 5,
    seed: 30004,
    prompt: [
      "The orbiting particles suddenly accelerate inward and converge into the",
      "single central monitor. The chaotic data on that one screen wipes clean",
      "to pure white (#FFFFFF) and is replaced by a minimalist Apple-style",
      "verdict card: small uppercase tag TRADING in black on light gray pill at",
      "the top, large heading EURUSD in Inter 600 typeface 72px color #1A1A1A,",
      "thin emerald accent bar (#00B37E) on the left edge full card height,",
      "three monospaced lines reading Entry 1.0850, Stop 1.0820, Target 1.0920,",
      "subtle wordmark wealth.investing in Inter 500 18px color #6B6B6B at the",
      "bottom-right corner. The 29 surrounding monitors begin to dim. Camera:",
      "fast push-in onto the central monitor until the verdict card fills the",
      "entire frame. Mood: resolution, the silence after a storm.",
    ].join(" "),
  },
  {
    n: 5,
    label: "PAYOFF",
    mode: "text-to-video",
    duration: 4,
    seed: 30005,
    prompt: [
      "Reverse wide shot from inside the monitor wall looking back at the trader,",
      "who is seated in his chair in three-quarter profile. 29 of the 30",
      "monitors fade to black one by one in a wave pattern, starting from the",
      "periphery and moving inward. Only the central monitor remains lit,",
      "displaying the clean verdict card from the previous shot, now visible",
      "from behind so its glow rim-lights the back of the trader's head and",
      "shoulders with a soft white halo. The trader leans back slowly in his",
      "chair and exhales. The room is now dim and silent. Camera: locked off,",
      "slight rack focus pulling from the screen to the trader's face at the",
      "2.5s mark.",
    ].join(" "),
  },
  {
    n: 6,
    label: "CTA",
    mode: "image-to-video",
    duration: 4,
    seed: 30006,
    inputImage: resolve(INPUT_DIR, "shot6-verdict-card.png"),
    prompt: [
      "Subtle parallax push-in on the report card UI. The emerald status pulse",
      "(small dot, top-left of the verdict block, color #00B37E) animates one",
      "single soft pulse at the 1.5s mark of the shot. The card sits centered",
      "on a soft cream background (#F7F6F3). Hold steady for 2s. At the 2.5s",
      "mark, the wealth.investing wordmark fades in below the card in Inter 500",
      "20px color #1A1A1A, with a thin emerald (#00B37E) underline that draws",
      "itself left to right over 0.4s. No motion blur, no zoom past 1.05x.",
      "Clean product-shot energy, like an Apple keynote close. Photoreal UI,",
      "no film grain.",
    ].join(" "),
  },
];

function parseArgs(argv) {
  const args = { dryRun: false, resume: false, shot: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--resume") args.resume = true;
    else if (a === "--shot") args.shot = Number.parseInt(argv[++i], 10);
  }
  return args;
}

function buildCommand(shot) {
  const outFile = resolve(OUT_DIR, `shot-${shot.n}.mp4`);
  // Higgsfield's video models do not expose --negative-prompt or --seed flags,
  // so we inline both into the prompt body. The model still respects them as
  // soft guidance via prompt weighting.
  const fullPrompt = [
    shot.prompt,
    STYLE_SUFFIX,
    `Negative: ${NEGATIVE}.`,
    `Reference seed ${shot.seed} for visual continuity.`,
  ].join(" ");

  // higgsfield generate create <model> [--param value]... [--image <path>]
  const cmd = [CLI_BIN, "generate", "create", HIGGS_MODEL];
  cmd.push("--prompt", fullPrompt);
  cmd.push("--aspect_ratio", "9:16");
  cmd.push("--duration", String(shot.duration));
  cmd.push("--mode", HIGGS_QUALITY);
  if (shot.inputImage) cmd.push("--image", shot.inputImage);
  cmd.push("--wait");
  cmd.push("--wait-timeout", WAIT_TIMEOUT);
  cmd.push("--wait-interval", WAIT_INTERVAL);
  cmd.push("--json");

  return { cmd, outFile };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(INPUT_DIR, { recursive: true });

  const target = args.shot
    ? SHOTS.filter((s) => s.n === args.shot)
    : SHOTS;

  if (target.length === 0) {
    console.error(`No shot ${args.shot} found. Valid: 1..${SHOTS.length}`);
    process.exit(1);
  }

  console.log(`[reel-30telas] ${target.length} shot(s) queued. Output: ${OUT_DIR}`);
  if (args.dryRun) console.log("[reel-30telas] DRY RUN — commands will be printed only.\n");

  for (const shot of target) {
    const { cmd, outFile } = buildCommand(shot);

    if (args.resume && existsSync(outFile)) {
      console.log(`[shot ${shot.n} ${shot.label}] SKIP (already exists: ${outFile})`);
      continue;
    }

    if (shot.inputImage && !existsSync(shot.inputImage)) {
      console.error(
        `[shot ${shot.n} ${shot.label}] MISSING INPUT IMAGE: ${shot.inputImage}\n` +
        `  → see wealth.Investing/Instagram/Reels/30telas-1decisao-shotlist.md §"Como gerar a imagem de input"`
      );
      if (!args.dryRun) process.exit(2);
    }

    console.log(`\n[shot ${shot.n} ${shot.label}] (${shot.duration}s, mode=${shot.mode}, seed=${shot.seed})`);
    console.log(`  > ${cmd.map((p) => (p.includes(" ") ? `"${p}"` : p)).join(" ")}`);

    if (args.dryRun) continue;

    const t0 = Date.now();
    const result = spawnSync(cmd[0], cmd.slice(1), {
      stdio: "inherit",
      encoding: "utf8",
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (result.error) {
      console.error(`[shot ${shot.n}] FAILED to launch ${CLI_BIN}: ${result.error.message}`);
      console.error(`  → check that higgsfield-cli is installed and authenticated.`);
      console.error(`  → override binary path with HIGGSFIELD_CLI env var if needed.`);
      process.exit(3);
    }
    if (result.status !== 0) {
      console.error(`[shot ${shot.n}] FAILED with exit code ${result.status} after ${elapsed}s`);
      process.exit(result.status ?? 4);
    }

    console.log(`[shot ${shot.n}] DONE in ${elapsed}s → ${outFile}`);
  }

  console.log(`\n[reel-30telas] All shots done. Next: import into CapCut/DaVinci, add VO + sound design.`);
  console.log(`[reel-30telas] Editing guide: wealth.Investing/Instagram/Reels/30telas-1decisao-shotlist.md §"Pós-produção"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
