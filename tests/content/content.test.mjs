import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const run = (...args) => spawnSync(process.execPath, args, { encoding: 'utf8' });

test('content snapshot has the approved distribution and stays generated', async () => {
  const source = JSON.parse(await readFile(new URL('../../content/characters.json', import.meta.url), 'utf8'));
  assert.equal(source.characters.length, 800);
  assert.equal(new Set(source.characters.map(({ hanzi }) => hanzi)).size, 800);
  assert.deepEqual(source.levels.map(({ characterCount }) => characterCount), [100, 200, 250, 250]);

  const result = run('scripts/build-content.mjs', '--check');
  assert.equal(result.status, 0, result.stderr);
});

test('every registry reference resolves to valid offline media', () => {
  const result = run('scripts/validate-media.mjs');
  assert.equal(result.status, 0, result.stderr);
});

test('illustration catalog covers every snapshot character with child-friendly captions', async () => {
  const source = JSON.parse(await readFile(new URL('../../content/characters.json', import.meta.url), 'utf8'));
  const catalog = await import('../../scripts/illustration-catalog.mjs');
  const missing = source.characters.filter(({ hanzi }) => !catalog.CHARACTER_ILLUSTRATIONS[hanzi]);
  assert.equal(missing.length, 0, missing.map(({ hanzi }) => hanzi).join(''));

  for (const entry of source.characters) {
    const expected = catalog.illustrationFor(entry.hanzi);
    assert.equal(entry.theme, expected.theme);
    assert.deepEqual(entry.illustration, expected.illustration);
    assert.equal(catalog.BLOCKED_CAPTIONS.has(entry.illustration.caption), false);
    assert.equal(catalog.captionAllowed(entry.hanzi, entry.illustration.caption), true);
  }
});

