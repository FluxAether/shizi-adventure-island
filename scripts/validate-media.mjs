#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio', 'syllables-indextts-normalized');
const SCENE_DIR = path.join(ROOT, 'assets', 'illustrations', 'scenes');
const CHAR_PNG_DIR = path.join(ROOT, 'assets', 'illustrations', 'characters');
const CHAR_WEBP_DIR = path.join(ROOT, 'assets', 'illustrations', 'characters-webp');
const CHAR_IMAGE_REGISTRY_PATH = path.join(ROOT, 'src', 'content', 'character-images.ts');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_LEVEL_COUNTS = new Map([
  ['grade-1-fall', 100],
  ['grade-1-spring', 200],
  ['grade-2-fall', 250],
  ['grade-2-spring', 250],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasUrl(value) {
  if (typeof value === 'string') return /https?:\/\//i.test(value);
  if (Array.isArray(value)) return value.some(hasUrl);
  return value && typeof value === 'object' && Object.values(value).some(hasUrl);
}

async function validateAudio(filePath, deep) {
  const bytes = await readFile(filePath);
  const hasId3 = bytes.subarray(0, 3).toString('ascii') === 'ID3';
  const hasFrame = bytes.some((byte, index) => byte === 0xff && (bytes[index + 1] & 0xe0) === 0xe0);
  assert(bytes.length > 500 && (hasId3 || hasFrame), `${path.relative(ROOT, filePath)} is not a readable MP3`);
  if (!deep) return;

  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,format_name', '-of', 'json', filePath], { encoding: 'utf8' });
  assert(result.status === 0, `ffprobe rejected ${path.relative(ROOT, filePath)}: ${result.stderr.trim()}`);
  const format = JSON.parse(result.stdout).format;
  assert(format.format_name.includes('mp3') && Number(format.duration) > 0, `${path.relative(ROOT, filePath)} has no playable MP3 duration`);

  const volume = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const mean = Number(volume.stderr.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
  const peak = Number(volume.stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1]);
  assert(volume.status === 0 && Number.isFinite(mean) && Number.isFinite(peak), `ffmpeg could not measure ${path.relative(ROOT, filePath)}`);
  assert(mean >= -16.5, `${path.relative(ROOT, filePath)} is too quiet (${mean} dB mean)`);
  assert(peak <= -1, `${path.relative(ROOT, filePath)} may clip (${peak} dB peak)`);
}

async function main() {
  const deep = process.argv.includes('--deep');
  const source = JSON.parse(await readFile(path.join(ROOT, 'content', 'characters.json'), 'utf8'));
  const registry = await readFile(path.join(ROOT, 'src', 'content', 'registry.ts'), 'utf8');
  const characters = source.characters;

  assert(characters.length === 800, `Expected 800 characters, found ${characters.length}`);
  assert(new Set(characters.map(({ id }) => id)).size === 800, 'Character ids must be unique');
  assert(new Set(characters.map(({ hanzi }) => hanzi)).size === 800, 'Hanzi values must be unique');
  assert(!hasUrl(characters), 'Character content must not contain URLs');
  assert(!/https?:\/\//i.test(registry), 'Generated registry must not contain URLs');

  const audioIds = new Set();
  const sceneIds = new Set();
  for (const [levelId, expectedCount] of EXPECTED_LEVEL_COUNTS) {
    const entries = characters.filter((entry) => entry.levelId === levelId);
    assert(entries.length === expectedCount, `${levelId} expected ${expectedCount}, found ${entries.length}`);
    assert(entries.every((entry, index) => entry.order === index + 1), `${levelId} order must be contiguous`);
  }

  for (const entry of characters) {
    assert([...entry.hanzi].length === 1 && /\p{Script=Han}/u.test(entry.hanzi), `${entry.id} must contain one Han character`);
    assert(entry.theme && entry.illustration?.alt, `${entry.id} is missing theme or illustration alt text`);
    assert(entry.illustration.motif && entry.illustration.variant, `${entry.id} is missing illustration motif`);
    assert(typeof entry.illustration.caption === 'string', `${entry.id} illustration caption must be a string`);
    assert(!entry.illustration.alt.includes('、'), `${entry.id} illustration alt should describe the picture, not list example words`);
    assert(entry.readings.length >= 1, `${entry.id} has no readings`);
    assert(entry.readings.some(({ key }) => key === entry.primaryReadingKey), `${entry.id} primary reading is missing`);
    sceneIds.add(entry.illustration.sceneId);

    for (const reading of entry.readings) {
      assert(/^[a-zv]+[1-5]$/.test(reading.key), `${entry.id} has invalid numeric pinyin key ${reading.key}`);
      assert(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(reading.pinyin) || reading.key.endsWith('5'), `${entry.id} pinyin is missing a tone mark`);
      assert(reading.audioId === `syllable-${reading.key}`, `${entry.id} audio id does not match its reading key`);
      assert(reading.words.length >= 1 && reading.words.length <= 2, `${entry.id} must have one or two words`);
      assert(reading.words.every(({ word, pinyin }) => word.includes(entry.hanzi) && pinyin), `${entry.id} has an invalid word example`);
      audioIds.add(reading.audioId);
    }
  }

  const expectedAudioFiles = [...audioIds].map((id) => `${id.replace('syllable-', '')}.mp3`).sort();
  const actualAudioFiles = (await readdir(AUDIO_DIR)).filter((name) => name.endsWith('.mp3')).sort();
  assert(JSON.stringify(actualAudioFiles) === JSON.stringify(expectedAudioFiles), 'Audio directory and registry references differ');
  await Promise.all(actualAudioFiles.map((name) => validateAudio(path.join(AUDIO_DIR, name), deep)));

  const expectedSceneFiles = [...sceneIds].map((id) => `${id.replace('scene-', '')}.svg`).sort();
  const actualSceneFiles = (await readdir(SCENE_DIR)).filter((name) => name.endsWith('.svg')).sort();
  assert(JSON.stringify(actualSceneFiles) === JSON.stringify(expectedSceneFiles), 'Scene directory and registry references differ');
  for (const name of actualSceneFiles) {
    const svg = await readFile(path.join(SCENE_DIR, name), 'utf8');
    assert(/<svg[\s>]/.test(svg) && /viewBox=/.test(svg) && /<\/svg>\s*$/.test(svg), `${name} is not a renderable SVG`);
  }

  const firstIslandCharacters = characters.filter((entry) => entry.levelId === 'grade-1-fall');
  assert(firstIslandCharacters.length === 100, `Expected 100 first-island characters, found ${firstIslandCharacters.length}`);
  for (const entry of firstIslandCharacters) {
    const pngPath = path.join(CHAR_PNG_DIR, `${entry.id}.png`);
    const pngBytes = await readFile(pngPath).catch(() => null);
    assert(
      pngBytes && pngBytes.length > 100 && pngBytes.subarray(0, 8).equals(PNG_SIGNATURE),
      `First-island character ${entry.id} (${entry.hanzi}) is missing a valid non-empty PNG in assets/illustrations/characters/`,
    );
  }

  const imageRegistrySource = await readFile(CHAR_IMAGE_REGISTRY_PATH, 'utf8');
  const registeredWebpIds = [...imageRegistrySource.matchAll(/"(hanzi-\d{4})":\s*require\("\.\.\/\.\.\/assets\/illustrations\/characters-webp\/\1\.webp"\)/g)].map((match) => match[1]);
  assert(registeredWebpIds.length >= firstIslandCharacters.length, 'character-images.ts must register at least the first-island character illustrations');
  for (const id of registeredWebpIds) {
    const webpPath = path.join(CHAR_WEBP_DIR, `${id}.webp`);
    const webpBytes = await readFile(webpPath).catch(() => null);
    assert(
      webpBytes &&
        webpBytes.length > 100 &&
        webpBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        webpBytes.subarray(8, 12).toString('ascii') === 'WEBP',
      `${path.relative(ROOT, webpPath)} is missing or not a valid WebP image`,
    );
  }

  console.log(
    `Validated 800 characters, ${audioIds.size} MP3 files, ${firstIslandCharacters.length} first-island PNGs, ${registeredWebpIds.length} bundled WebPs, and ${sceneIds.size} SVG scenes${deep ? ' with ffprobe' : ''}.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
