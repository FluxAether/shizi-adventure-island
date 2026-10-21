const { brand } = require('./brand.config');

const easProjectId =
  process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '';
const appOwner = process.env.EXPO_OWNER || undefined;
const bundleIdentifier =
  process.env.APP_BUNDLE_ID ||
  process.env.EXPO_PUBLIC_APP_BUNDLE_ID ||
  'com.example.shiziadventureisland';

/** @type {import('expo/config').ConfigFunction} */
module.exports = ({ config }) => ({
  ...config,
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  ...(appOwner ? { owner: appOwner } : {}),
  version: '1.3.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    ...config.updates,
    ...(easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : {}),
    checkAutomatically: 'NEVER',
    // Keep large static media in the native binary. OTA only ships JS + small assets.
    assetPatternsToBeBundled: [
      'assets/images/**',
      'assets/audio/sfx/**',
      'assets/audio/bgm/**',
      'assets/illustrations/scenes/**',
      'assets/pets/**',
      'assets/lottie/**',
      'node_modules/**',
    ],
  },
  orientation: 'default',
  userInterfaceStyle: 'light',
  icon: './assets/images/icon.png',
  ios: {
    ...config.ios,
    infoPlist: {
      CFBundleDisplayName: brand.name,
      ITSAppUsesNonExemptEncryption: false,
    },
    bundleIdentifier,
    supportsTablet: true,
  },
  android: {
    ...config.android,
    package: bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: brand.backgroundColor,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    // SPA mode avoids Node SSR/static export paths that break AsyncStorage + expo-sqlite web.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-asset',
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: brand.backgroundColor,
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
      },
    ],
    './plugins/with-ios-27-scene-lifecycle',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    router: {
      ...(config.extra?.router ?? {}),
    },
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
});
