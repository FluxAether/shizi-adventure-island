#!/usr/bin/env node

/**
 * 汉字高质量插画流水线生成与资产同步工具
 *
 * 功能：
 * 1. 编译全量 800 汉字的儿童绘本扁平风 Prompt
 * 2. 导出 OpenAI Batch API / CLI JSONL 任务文件
 * 3. 基于 OPENAI_API_KEY 批量生成并下载图片 (支持断点续传与重试)
 * 4. 自动扫描已生成资产并更新 src/content/character-images.ts
 */

import { Buffer } from "node:buffer";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { PNG } from "pngjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHARACTERS_PATH = path.join(ROOT, "content", "characters.json");
const ASSETS_DIR = path.join(ROOT, "assets", "illustrations", "characters");
const BUNDLE_ASSETS_DIR = path.join(ROOT, "assets", "illustrations", "characters-webp");
const REGISTRY_OUT_PATH = path.join(ROOT, "src", "content", "character-images.ts");
const PROMPTS_OUT_PATH = path.join(ROOT, "tmp", "character-illustration-prompts.jsonl");
const PROGRESS_PATH = path.join(ROOT, "tmp", "illustration-progress.json");

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

// 数字量词映射：提供具体而生动的儿童图景，避免画成单调线条
const NUMBER_PROMPT_MAP = {
  one: "1 bright cheerful smiling sun shining warmly in the sky",
  two: "2 cute cheerful yellow ducklings swimming side-by-side on a calm pond",
  three: "3 colorful festive balloons (red, yellow, blue) floating together",
  four: "4 sweet juicy red strawberries with little green leaves",
  five: "5 bright smiling golden stars arranged in a friendly arc",
  six: "6 little colorful wooden building blocks stacked neatly",
  seven: "7 pretty blooming daisies with gentle colorful petals in a patch",
  eight: "8 sweet red cherries connected in cute pairs",
  nine: "9 tiny golden coins or cute shiny buttons sparkling softly",
  ten: "10 colorful friendly toy stars neatly gathered together in a joyful circle",
  few: "a small group of 2 or 3 cute red apples on a wooden table",
  many: "a joyful cluster of colorful blooming flowers in a lush garden",
  half: "a juicy watermelon sliced cleanly in half showing its vibrant red flesh and seeds",
};

// 空间与方位映射
const DIRECTION_PROMPT_MAP = {
  up: "a cute little bird happily perched up on top of a blooming tree branch",
  down: "a tiny friendly sprout growing under the soft warm soil",
  center: "a sweet red apple placed right in the center of a clean picnic mat",
  inside: "a cozy little puppy resting peacefully inside an open wooden toy box",
  out: "a cheerful bunny happily hopping out of a garden burrow",
  left: "a cute little bear pointing or walking towards the left side",
  right: "a cute friendly tiger cub walking towards the right side",
  north: "a cute cartoon compass showing a clear North star icon",
  south: "a tropical island scene with a warm sunny palm tree",
  east: "a gentle morning sunrise over distant rolling hills",
  west: "a peaceful golden sunset behind soft violet mountains",
  side: "two cute friendly animals standing neatly side-by-side",
  back: "a cute little kitten seen from behind looking at a warm window",
  front: "a cheerful cartoon animal looking straight forward with a friendly smile",
};

// 身体部位与五官映射
const BODY_PROMPT_MAP = {
  mouth: "a clean, cheerful cartoon smiling mouth with pearly white teeth and pink lips",
  tooth: "a cute smiling cartoon tooth sparkling clean with little sparkles",
  ear: "a cute, friendly cartoon ear listening attentively with gentle musical notes nearby",
  eye: "a bright, sparkling cartoon eye with big friendly pupil looking curious and joyful",
  hand: "a cute chubby cartoon child hand open and waving a friendly hello",
  head: "a cheerful round cartoon child head with a happy smiling expression",
  hair: "cute soft fluffy hair styled neatly on a happy child character",
  face: "a cute round blushing face with a joyful, gentle smile",
  neck: "a cute giraffe calf with a graceful neck wearing a little colorful scarf",
  foot: "two cute cartoon child footprints in soft golden beach sand",
  belly: "a cute round fluffy teddy bear tummy with a gentle patch",
  clothes: "a clean, colorful child jumper and tshirt neatly folded with cute buttons",
};

// 动作与行为映射
const ACTION_PROMPT_MAP = {
  run: "a joyful little child running happily across a sunny green meadow",
  jump: "a cute energetic rabbit jumping high in the air with joyful expression",
  walk: "a cute child taking a peaceful walk along a flower-lined path",
  stand: "a little cartoon boy standing tall, upright, and proud with a gentle smile",
  sit: "a cute little bear sitting comfortably on a soft round floor cushion reading a book",
  look: "a curious child looking gently through a toy magnifying glass at a clover leaf",
  open: "a friendly wooden window or door opening gently with warm morning sunlight streaming in",
  close: "a neat storybook or small gift box closing gently with a pretty ribbon",
  fly: "a cute little bird soaring gracefully in the clear blue sky with fluffy clouds",
  knife: "a harmless cute wooden craft knife with safe rounded tip next to a sliced apple",
  go: "a happy child with a small backpack heading out on an exciting outdoor adventure",
  come: "a welcoming friendly mother cat calling her little kittens over with open paws",
  play: "two happy children playing joyfully together with colorful building blocks",
  swim: "a happy little duckling paddling joyfully in crystal clear blue water",
  eat: "a cute little child happily eating a bowl of warm rice with chopsticks",
};

// 日常语法虚词与抽象意象的情境化映射
const DAILY_PARTICLE_MAP = {
  "的": "a happy little bear proudly holding its favorite bright red balloon",
  "了": "a tiny seed that has completed its journey and bloomed into a radiant flower",
  "是": "a clear picture of an adorable kitten with a gentle checkmark of truth",
  "在": "a cozy little puppy sleeping peacefully in its comfy round pet bed",
  "和": "two adorable animal friends (a bunny and a bear) holding hands happily",
  "也": "two cute ducklings both wearing matching bright yellow rain hats",
  "又": "a happy child receiving another sweet gift box with joy",
  "个": "a single delicious shiny red apple sitting on a clean wooden plate",
  "可": "a happy smiling child giving a cheerful thumbs-up sign of approval",
  "用": "a pair of safe colorful children scissors neatly cutting paper crafts",
  "不": "a gentle, cute cartoon shake of head with soft neutral hands, saying polite no",
  "比": "two friendly trees side-by-side, one tall and one short, comparing height sweetly",
  "才": "a tiny morning sunbeam just appearing at dawn over a sleeping hill",
  "只": "a single cute fluffy chick standing peacefully alone in a soft green patch",
  "有": "an open treasure basket filled with colorful toys and sweet fruits",
  "把": "a gentle hand holding the wooden handle of a small gardening shovel",
  "样": "three neatly matched patterned wooden blocks demonstrating consistency",
  "对": "a friendly double checkmark formed with blooming flower vines",
  "自": "a cute child looking gently at their own warm reflection in a mirror",
  "己": "a cozy child hugging their own knees comfortably with a warm smile",
  "从": "a little path starting from a cozy house leading out to the green hills",
  "给": "a kind little girl handing a sweet flower bouquet to a friend",
  "着": "a warm glowing bedside lamp shining gently through the quiet night",
  "这": "a friendly cartoon hand gently pointing to a cute nearby strawberry",
  "那": "a friendly cartoon hand pointing towards a distant glowing rainbow",
  "很": "a giant glowing heart bursting with vibrant warmth and happiness",
  "更": "a bright glowing star shining even brighter than the soft stars around it",
  "最": "a shiny golden championship medal with a cute number 1 star badge",
  "再": "a happy child waving goodbye at the front door with a promise to meet again",
};

/**
 * 构造符合规范的高质量 Prompt
 */
export function buildCharacterPrompt(character) {
  const { hanzi, illustration, readings } = character;
  const motif = illustration.motif || "daily";
  const variant = illustration.variant || motif;
  const caption = illustration.caption || "";
  const firstWord = readings?.[0]?.words?.[0]?.word || hanzi;

  let subjectDescription = "";

  // 1. 优先检查特化映射
  if (DAILY_PARTICLE_MAP[hanzi]) {
    subjectDescription = DAILY_PARTICLE_MAP[hanzi];
  } else if (motif === "number" && NUMBER_PROMPT_MAP[variant]) {
    subjectDescription = NUMBER_PROMPT_MAP[variant];
  } else if (motif === "direction" && DIRECTION_PROMPT_MAP[variant]) {
    subjectDescription = DIRECTION_PROMPT_MAP[variant];
  } else if (motif === "body" && BODY_PROMPT_MAP[variant]) {
    subjectDescription = BODY_PROMPT_MAP[variant];
  } else if (motif === "action" && ACTION_PROMPT_MAP[variant]) {
    subjectDescription = ACTION_PROMPT_MAP[variant];
  } else if (caption) {
    // 2. 有明确 caption 时，围绕 caption 生成主体描述
    subjectDescription = `a delightful, recognizable illustration of ${caption} (concept representing Chinese character "${hanzi}"), featuring clean iconic details`;
  } else {
    // 3. 通用 fallback
    subjectDescription = `a clear, friendly, and joyful educational visual representing the meaning of "${hanzi}" (${firstWord})`;
  }

  return [
    "Use case: illustration-story",
    "Asset type: isolated die-cut sticker illustration for children chinese literacy learning flashcard",
    `Primary request: A high-quality charming children picture book flat illustration sticker representing the concept of the Chinese character "${hanzi}" (${caption || firstWord})`,
    "Scene/backdrop: isolated subject on a solid, clean, pure white background (#FFFFFF), white die-cut sticker outline contour, absolutely NO background scenery, NO grey tiles, NO checkerboard, NO frames, NO drop shadow on background",
    `Subject: ${subjectDescription}`,
    "Style/medium: warm modern children picture book flat vector illustration, bold friendly contours, gentle rounded lines, delightful die-cut sticker aesthetic, clean minimalist shapes",
    "Composition/framing: centered single subject with generous negative white space around edges, clean die-cut silhouette on pure white background",
    "Color palette: warm harmonious palette including soft coral, cheerful warm yellow, sky blue, sage green, and cream white",
    "Constraints: strictly NO text, NO Chinese characters, NO English letters, NO numbers, NO typography, NO watermark, high visual clarity for young children, clean white background",
    "Avoid: text, letters, words, written characters, photorealism, dark dreary shadows, scary elements, complex background scenery, checkerboard pattern, grey grid",
  ].join("\n");
}

/**
 * 导出全量 800 字的 Prompt 数据集
 */
export async function exportAllPrompts() {
  const source = JSON.parse(await readFile(CHARACTERS_PATH, "utf8"));
  const characters = source.characters;
  await mkdir(path.dirname(PROMPTS_OUT_PATH), { recursive: true });

  const lines = characters.map((character, index) => {
    const prompt = buildCharacterPrompt(character);
    return JSON.stringify({
      id: character.id,
      index: index + 1,
      hanzi: character.hanzi,
      theme: character.theme,
      caption: character.illustration.caption,
      motif: character.illustration.motif,
      variant: character.illustration.variant,
      prompt,
    });
  });

  await writeFile(PROMPTS_OUT_PATH, lines.join("\n") + "\n");
  console.log(`[export] Successfully exported ${characters.length} character prompts to ${path.relative(ROOT, PROMPTS_OUT_PATH)}`);
}

/**
 * 扫描打包用 WebP 目录并生成 src/content/character-images.ts。
 * 原 PNG 仍在 assets/illustrations/characters，不进运行时注册表。
 * 支持通过 progress 中的 reviewStatus 过滤被驳回（rejected）或仅放行已人工过闸（--approved-only）的资产。
 */
export async function syncRegistry(options = {}) {
  const approvedOnly = Boolean(options.approvedOnly);
  await mkdir(BUNDLE_ASSETS_DIR, { recursive: true });
  const files = await readdir(BUNDLE_ASSETS_DIR);
  const imageFiles = files.filter((name) => name.endsWith(".webp")).sort();

  let progress = {};
  try {
    progress = JSON.parse(await readFile(PROGRESS_PATH, "utf8"));
  } catch {}

  const entries = [];
  for (const filename of imageFiles) {
    const id = path.basename(filename, path.extname(filename));
    const reviewStatus = progress[id]?.reviewStatus;
    if (reviewStatus === "rejected") {
      continue;
    }
    if (approvedOnly && reviewStatus !== "approved") {
      continue;
    }
    entries.push(`  "${id}": require("../../assets/illustrations/characters-webp/${filename}"),`);
  }

  const content = [
    "// Generated by scripts/generate-character-illustrations.mjs. Do not edit by hand.",
    "import type { ImageSource } from 'expo-image';",
    "",
    "/**",
    " * 已生成的汉字位图插画静态资源索引表",
    " * 优先加载此处登记的位图资产，若未生成则平滑回退至程序化 SVG 几何插画。",
    " */",
    "export const CHARACTER_IMAGE_ASSETS: Readonly<Record<string, number | ImageSource>> = {",
    ...entries,
    "};",
    "",
    "/**",
    " * 获取指定汉字 ID 的位图资源，不存在时返回 undefined",
    " */",
    "export function getCharacterImageSource(id: string): (number | ImageSource) | undefined {",
    "  return CHARACTER_IMAGE_ASSETS[id];",
    "}",
    "",
    "/**",
    " * 检查指定汉字是否拥有高质量位图插画",
    " */",
    "export function hasCharacterImage(id: string): boolean {",
    "  return Boolean(CHARACTER_IMAGE_ASSETS[id]);",
    "}",
    "",
  ].join("\n");

  await writeFile(REGISTRY_OUT_PATH, content);
  console.log(`[sync] Updated ${path.relative(ROOT, REGISTRY_OUT_PATH)} with ${entries.length} image assets.`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

/**
 * 原 PNG 留在 characters/。打包用 WebP 写到 characters-webp/：长边最多 640，q80。
 */
export async function convertBundleWebp(options = {}) {
  const maxWidth = Number(options.maxWidth || 640);
  const quality = Number(options.quality || 80);
  const concurrency = Math.max(1, parseInt(options.concurrency || "8", 10));
  const force = Boolean(options.force);

  await mkdir(BUNDLE_ASSETS_DIR, { recursive: true });
  const files = (await readdir(ASSETS_DIR))
    .filter((name) => name.endsWith(".png"))
    .sort();

  let converted = 0;
  let skipped = 0;
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= files.length) return;
      const filename = files[current];
      const src = path.join(ASSETS_DIR, filename);
      const dest = path.join(BUNDLE_ASSETS_DIR, `${path.basename(filename, ".png")}.webp`);
      if (!force && existsSync(dest)) {
        skipped += 1;
        continue;
      }
      await runFfmpeg([
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        src,
        "-vf",
        `scale='min(${maxWidth},iw)':-2:flags=lanczos`,
        "-c:v",
        "libwebp",
        "-lossless",
        "0",
        "-quality",
        String(quality),
        "-compression_level",
        "6",
        "-preset",
        "picture",
        dest,
      ]);
      converted += 1;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`[bundle-webp] ${converted} converted, ${skipped} skipped, ${files.length} source PNGs -> ${path.relative(ROOT, BUNDLE_ASSETS_DIR)} (maxWidth=${maxWidth}, q=${quality}).`);
}

/**
 * 打印或测试单字 Prompt
 */
export async function printSample(hanziOrId) {
  const source = JSON.parse(await readFile(CHARACTERS_PATH, "utf8"));
  const character = source.characters.find(
    (item) => item.hanzi === hanziOrId || item.id === hanziOrId,
  ) || source.characters[0];

  console.log("=============================================");
  console.log(`Character: ${character.hanzi} (${character.id})`);
  console.log(`Theme: ${character.theme} | Motif: ${character.illustration.motif} | Variant: ${character.illustration.variant}`);
  console.log("---------------------------------------------");
  console.log(buildCharacterPrompt(character));
  console.log("=============================================");
}

/**
 * 自动提取背景并生成真正的 RGBA 透明 PNG
 */
function convertToTransparentPng(inputBuffer) {
  const tmpInput = path.join(ROOT, "tmp", `raw-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  const tmpPng = `${tmpInput}.png`;

  try {
    writeFileSync(tmpInput, inputBuffer);
    execFileSync("sips", ["-s", "format", "png", tmpInput, "--out", tmpPng], { stdio: "pipe" });

    const pngBuf = execFileSync("cat", [tmpPng]);
    const png = PNG.sync.read(pngBuf);
    const { width, height, data } = png;

    const visited = new Uint8Array(width * height);
    const queue = [];

    function isBg(r, g, b) {
      return r >= 238 && g >= 238 && b >= 238;
    }

    function push(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      const p = idx * 4;
      if (isBg(data[p], data[p + 1], data[p + 2])) {
        queue.push(x, y);
      }
    }

    for (let x = 0; x < width; x++) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      push(0, y);
      push(width - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = y * width + x;
      const p = idx * 4;
      data[p + 3] = 0; // Alpha = 0 (透明)

      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    return PNG.sync.write(png);
  } finally {
    try { if (existsSync(tmpInput)) unlinkSync(tmpInput); } catch {}
    try { if (existsSync(tmpPng)) unlinkSync(tmpPng); } catch {}
  }
}

function loadStyleReferencePart(styleRefPath) {
  if (!styleRefPath) return null;
  const resolved = path.resolve(ROOT, styleRefPath);
  if (!existsSync(resolved)) {
    throw new Error(`Style reference image not found: ${styleRefPath}`);
  }
  const ext = path.extname(resolved).toLowerCase();
  const mimeType =
    ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const data = execFileSync("base64", ["-i", resolved], { encoding: "utf8" }).replace(/\s+/g, "");
  return { type: "image", mime_type: mimeType, data };
}

/**
 * 调用 Gemini Interactions API 生成单张插画 (返回 PNG Buffer，支持传入固定风格参考图锁风格)
 */
async function generateWithGemini(prompt, apiKey, model = DEFAULT_GEMINI_IMAGE_MODEL, styleRefPart = null) {
  const input = [];
  if (styleRefPart) {
    input.push(styleRefPart);
    input.push({
      type: "text",
      text: "Use the attached reference image strictly to lock the line weight, color warmth, character proportions, and flat picture-book sticker style. Do NOT copy the reference object itself; draw the requested target subject below:\n\n" + prompt,
    });
  } else {
    input.push({ type: "text", text: prompt });
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let base64Data = null;
  for (const step of data.steps || []) {
    for (const c of step.content || []) {
      if (c.type === "image" && c.data) {
        base64Data = c.data;
        break;
      }
    }
    if (base64Data) break;
  }

  if (!base64Data) {
    throw new Error(`No image data returned in Gemini response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const rawBuffer = Buffer.from(base64Data, "base64");
  return convertToTransparentPng(rawBuffer);
}

/**
 * 调用 OpenAI DALL-E / Images API 生成单张插画 (返回 PNG Buffer)
 */
async function generateWithOpenAI(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API HTTP ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error("No image URL in OpenAI response");

  const imageStream = await fetch(imageUrl);
  if (!imageStream.ok) throw new Error(`Failed to download OpenAI image: ${imageStream.status}`);

  const arrayBuffer = await imageStream.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 批量生成执行器 (支持 GEMINI_API_KEY 与 OPENAI_API_KEY，支持并发控制与断点续跑)
 */
export async function runGeneration(options = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const provider = options.provider || (geminiKey ? "gemini" : openaiKey ? "openai" : null);
  const apiKey = provider === "gemini" ? geminiKey : openaiKey;
  const model = options.model || (provider === "gemini" ? (process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL) : "gpt-image-2");

  if (!apiKey) {
    console.error("\n[Error] Neither GEMINI_API_KEY nor OPENAI_API_KEY is set in environment.");
    console.error("To run live generation with Gemini Interactions API:");
    console.error('  export GEMINI_API_KEY="AIza..."');
    console.error("  node scripts/generate-character-illustrations.mjs --generate\n");
    return;
  }

  console.log(`[generate] Engine: ${provider.toUpperCase()} | Model: ${model}`);

  const source = JSON.parse(await readFile(CHARACTERS_PATH, "utf8"));
  let targetCharacters = source.characters;
  const styleRefPart = loadStyleReferencePart(options.styleRef || process.env.ILLUSTRATION_STYLE_REF);

  if (options.character) {
    const match = targetCharacters.filter(
      (item) => item.hanzi === options.character || item.id === options.character,
    );
    if (match.length > 0) {
      targetCharacters = match;
      console.log(`[generate] Scoped to character: ${options.character}`);
    } else {
      console.error(`[Error] Character not found: ${options.character}`);
      return;
    }
  } else if (options.range) {
    const [startStr, endStr] = options.range.split("-");
    const start = Math.max(1, parseInt(startStr, 10));
    const end = Math.min(targetCharacters.length, parseInt(endStr, 10));
    targetCharacters = targetCharacters.slice(start - 1, end);
    console.log(`[generate] Scoped to range ${start} - ${end} (${targetCharacters.length} characters)`);
  } else if (!options.all) {
    targetCharacters = targetCharacters.filter((item) => item.levelId === "grade-1-fall");
    console.log(
      `[generate] Defaulting to Island 1 (${targetCharacters.length} characters, grade-1-fall). Pass --all or --range 1-800 after Island 1 acceptance.`,
    );
  }

  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });

  let progress = {};
  try { progress = JSON.parse(await readFile(PROGRESS_PATH, "utf8")); } catch {}

  const concurrency = Math.max(1, parseInt(options.concurrency || "2", 10));
  console.log(`[generate] Starting generation for ${targetCharacters.length} characters (Concurrency: ${concurrency})...`);

  let currentIndex = 0;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  async function worker(workerId) {
    while (true) {
      const idx = currentIndex++;
      if (idx >= targetCharacters.length) break;

      const char = targetCharacters[idx];
      const destPath = path.join(ASSETS_DIR, `${char.id}.png`);
      const destWebp = path.join(ASSETS_DIR, `${char.id}.webp`);

      if (!options.force && progress[char.id]?.status === "completed" && (existsSync(destPath) || existsSync(destWebp))) {
        skipCount += 1;
        console.log(`[${idx + 1}/${targetCharacters.length}] Skip existing ${char.hanzi} (${char.id})`);
        continue;
      }

      const prompt = buildCharacterPrompt(char);
      console.log(`[${idx + 1}/${targetCharacters.length}][W${workerId}] Generating ${char.hanzi} (${char.id})...`);

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts += 1;
        try {
          const buffer = provider === "gemini"
            ? await generateWithGemini(prompt, apiKey, model, styleRefPart)
            : await generateWithOpenAI(prompt, apiKey);

          await writeFile(destPath, buffer);
          progress[char.id] = {
            status: "completed",
            reviewStatus: progress[char.id]?.reviewStatus || "pending-review",
            hanzi: char.hanzi,
            provider,
            model,
            styleRef: options.styleRef || process.env.ILLUSTRATION_STYLE_REF || null,
            path: path.relative(ROOT, destPath),
            completedAt: new Date().toISOString(),
          };
          await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
          successCount += 1;
          success = true;
          console.log(`  ✓ Saved ${char.id} (${char.hanzi}) [${buffer.length} bytes]`);
        } catch (err) {
          console.error(`  ✗ Attempt ${attempts} failed for ${char.id} (${char.hanzi}):`, err.message);
          if (attempts < maxAttempts) {
            const delay = attempts * 3000;
            await new Promise((r) => setTimeout(r, delay));
          } else {
            failCount += 1;
            progress[char.id] = {
              status: "failed",
              hanzi: char.hanzi,
              provider,
              error: err.message,
              failedAt: new Date().toISOString(),
            };
            await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
          }
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log("\n---------------------------------------------");
  console.log(`Summary: ${successCount} generated, ${skipCount} skipped, ${failCount} failed.`);
  await syncRegistry({ approvedOnly: options.approvedOnly });
}

export async function updateReviewStatus(target, reviewStatus) {
  const source = JSON.parse(await readFile(CHARACTERS_PATH, "utf8"));
  await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
  let progress = {};
  try {
    progress = JSON.parse(await readFile(PROGRESS_PATH, "utf8"));
  } catch {}

  let matched = [];
  if (target === "all") {
    matched = source.characters;
  } else if (target === "island1") {
    matched = source.characters.filter((item) => item.levelId === "grade-1-fall");
  } else if (/^\d+-\d+$/.test(target)) {
    const [startStr, endStr] = target.split("-");
    const start = Math.max(1, parseInt(startStr, 10));
    const end = Math.min(source.characters.length, parseInt(endStr, 10));
    matched = source.characters.slice(start - 1, end);
  } else {
    matched = source.characters.filter((item) => item.id === target || item.hanzi === target);
  }

  for (const char of matched) {
    progress[char.id] = {
      ...(progress[char.id] || { status: "completed", hanzi: char.hanzi }),
      reviewStatus,
      reviewedAt: new Date().toISOString(),
    };
  }
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  console.log(`[review] Marked ${matched.length} character(s) as ${reviewStatus}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const approvedOnly = args.includes("--approved-only");

  function getArgValue(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  }

  if (args.includes("--approve")) {
    await updateReviewStatus(getArgValue("--approve") || "island1", "approved");
    await syncRegistry({ approvedOnly });
    return;
  }

  if (args.includes("--reject")) {
    const target = getArgValue("--reject");
    if (!target) throw new Error("--reject requires a character id, hanzi, or range");
    await updateReviewStatus(target, "rejected");
    await syncRegistry({ approvedOnly });
    return;
  }

  if (args.includes("--generate") || args.includes("-g")) {
    const range = getArgValue("--range");
    const character = getArgValue("--character") || getArgValue("-c");
    const concurrency = getArgValue("--concurrency");
    const model = getArgValue("--model");
    const provider = getArgValue("--provider");
    const styleRef = getArgValue("--style-ref");
    const force = args.includes("--force");
    const all = args.includes("--all");

    await runGeneration({
      range,
      character,
      concurrency,
      model,
      provider,
      styleRef,
      force,
      all,
      approvedOnly,
    });
    return;
  }

  if (args.includes("--export-prompts") || args.includes("-e")) {
    await exportAllPrompts();
    return;
  }

  if (args.includes("--sync-registry") || args.includes("-s")) {
    await syncRegistry({ approvedOnly });
    return;
  }

  if (args.includes("--bundle-webp")) {
    await convertBundleWebp({
      maxWidth: getArgValue("--max-width"),
      quality: getArgValue("--quality"),
      concurrency: getArgValue("--concurrency"),
      force: args.includes("--force"),
    });
    await syncRegistry({ approvedOnly });
    return;
  }

  if (args.includes("--sample")) {
    const target = args[args.indexOf("--sample") + 1] || "一";
    await printSample(target);
    return;
  }

  // 默认同时导出 Prompts 并同步当前资产索引
  await exportAllPrompts();
  await syncRegistry();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  });
}
