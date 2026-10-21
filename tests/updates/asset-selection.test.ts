const loadConfig = require("../../app.config.js") as (args: {
  config: Record<string, unknown>;
}) => {
  version: string;
  updates: { assetPatternsToBeBundled?: string[] };
};

test("OTA whitelist keeps bulk hanzi/audio in the native binary", () => {
  const { version, updates } = loadConfig({ config: {} });
  const patterns = updates.assetPatternsToBeBundled ?? [];

  expect(version).toBe("1.3.0");
  expect(patterns.length).toBeGreaterThan(0);

  const joined = patterns.join("\n");
  expect(joined).not.toMatch(/characters-webp/);
  expect(joined).not.toMatch(/syllables-indextts/);
  expect(joined).not.toMatch(/illustrations\/characters(?:\/|$)/);

  expect(patterns).toEqual(
    expect.arrayContaining([
      "assets/images/**",
      "assets/audio/sfx/**",
      "assets/audio/bgm/**",
      "assets/illustrations/scenes/**",
      "assets/pets/**",
      "node_modules/**",
    ]),
  );
});
