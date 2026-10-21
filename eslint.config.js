const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'design-references/**',
      'production/**',
      'content/**',
      'assets/**',
      'dist/**',
      '.expo/**',
      'node_modules/**',
    ],
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/services/audio/**/*.{ts,tsx}',
    ],
    rules: {
      // Reanimated shared values and expo-audio players intentionally mutate .value / player fields.
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: [
      'app/**/*.{ts,tsx}',
    ],
    rules: {
      // Screens hydrate local SQLite snapshots on mount; async setState after await is intentional.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
