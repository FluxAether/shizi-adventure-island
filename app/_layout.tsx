import {
  NotoSansSC_400Regular,
  NotoSansSC_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-sc";
import {
  ZCOOLKuaiLe_400Regular,
} from "@expo-google-fonts/zcool-kuaile";
import type { AudioSource } from "expo-audio";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AUDIO_ASSETS } from "@/content";
import { StudySessionProvider } from "@/services/StudySessionProvider";
import { checkForAppUpdate } from "@/services/app-updates";
import { AudioProvider } from "@/services/audio";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAppStore } from "@/store/use-app-store";
import { colors, fonts, radii } from "@/theme/tokens";

void SplashScreen.preventAutoHideAsync();

const AUDIO_SOURCES: Readonly<Record<string, AudioSource>> = {
  ...AUDIO_ASSETS,
  "sfx-tap": require("../assets/audio/sfx/tap.mp3"),
  "sfx-flip": require("../assets/audio/sfx/flip.mp3"),
  "sfx-correct": require("../assets/audio/sfx/correct.mp3"),
  "sfx-retry": require("../assets/audio/sfx/retry.mp3"),
  "sfx-reward": require("../assets/audio/sfx/reward.mp3"),
  "bgm-island": require("../assets/audio/bgm/island-loop.mp3"),
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansSC: NotoSansSC_400Regular,
    NotoSansSCBold: NotoSansSC_700Bold,
    ZCOOLKuaiLe: ZCOOLKuaiLe_400Regular,
  });
  const databaseHydrated = useAppStore((state) => state.databaseHydrated);
  const preferencesHydrated = useAppStore((state) => state.preferencesHydrated);
  const hydrateAppState = useAppStore((state) => state.hydrateAppState);
  const [startupFailed, setStartupFailed] = useState(false);
  const fontReady = fontsLoaded || Boolean(fontError);
  const appReady = fontReady && databaseHydrated && preferencesHydrated;

  const hydrate = useCallback(() => {
    setStartupFailed(false);
    void hydrateAppState().catch(() => setStartupFailed(true));
  }, [hydrateAppState]);

  useEffect(() => {
    queueMicrotask(hydrate);
  }, [hydrate]);

  useEffect(() => {
    if (appReady || startupFailed) {
      void SplashScreen.hideAsync();
    }
  }, [appReady, startupFailed]);

  useEffect(() => {
    if (appReady) {
      void checkForAppUpdate();
    }
  }, [appReady]);

  const sources = useMemo(() => AUDIO_SOURCES, []);

  if (startupFailed) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 28, backgroundColor: colors.canvas }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.ink }}>冒险岛还没准备好</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 17, color: colors.muted, textAlign: "center" }}>轻轻点一下，我们再试一次吧～</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重新准备冒险岛"
            onPress={hydrate}
            style={{ minWidth: 180, minHeight: 64, borderRadius: radii.xl, alignItems: "center", justifyContent: "center", backgroundColor: colors.orange }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink }}>再试一次</Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StudySessionProvider>
          <AudioProvider sources={sources}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(study)" />
              <Stack.Screen name="parent" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="privacy" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AudioProvider>
        </StudySessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
