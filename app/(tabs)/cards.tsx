import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";

import { StarBurst } from "@/components/animated";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { getCardsLayoutMode } from "@/components/cards-layout";
import { CharacterCard } from "@/components/character-card";
import { RewardOverlay, RewardToast } from "@/components/reward-overlay";
import {
  primaryReading,
  type CharacterEntry,
} from "@/content";
import { adventureLevelId, charactersForAdventureLevel } from "@/content/adventure";
import { useAudio } from "@/services/audio";
import {
  buildCardsRound,
  completeCardsRound,
  finishStudySession,
  loadCharacterProgress,
  loadCharacterProgresses,
  loadLastCardsRoundCharacterIds,
  recordCardResponse,
  remainingStudySeconds,
  selectCharacter,
  startStudySession,
  toggleFavorite,
} from "@/services/progress";
import { getRemainingStudyMs } from "@/services/studyTimer";
import {
  selectProgress,
  selectRewards,
  selectSettings,
  useAppStore,
} from "@/store/use-app-store";
import { colors, fonts, radii, spacing } from "@/theme/tokens";

export default function CardsScreen() {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const compact = getCardsLayoutMode(width, height) !== "regular";
  const progressSummary = useAppStore(selectProgress);
  const rewards = useAppStore(selectRewards);
  const settings = useAppStore(selectSettings);
  const { play } = useAudio();
  const [round, setRound] = useState<CharacterEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [reward, setReward] = useState<{
    title: string;
    message: string;
    stars: number;
    tone: "reward" | "info";
  } | null>(null);
  const [toast, setToast] = useState<{ title: string; message?: string } | null>(null);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const starCounterScale = useSharedValue(1);
  const starCounterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starCounterScale.value }],
  }));
  const [answeredCount, setAnsweredCount] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setEarnedStars] = useState(0);
  const [isEmpty, setIsEmpty] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const pendingWritesRef = useRef<Promise<unknown>>(Promise.resolve());
  const answeredCountRef = useRef(0);
  const earnedStarsRef = useRef(0);
  const settlingRef = useRef(false);
  const card = round[index];

  const showToast = useCallback((next: { title: string; message?: string }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = setTimeout(() => setToast(null), 1200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const levelIndex = Math.min(79, progressSummary.unlockedAdventureLevel);
  const levelId = adventureLevelId(levelIndex);
  const levelCharacters = useMemo(
    () => charactersForAdventureLevel(levelIndex),
    [levelIndex],
  );

  const closeSession = useCallback((activeMs?: number) => {
    if (settlingRef.current) return;
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    sessionRef.current = null;
    const timer = useAppStore.getState().stopStudy();
    const finalActiveMs = activeMs ?? timer.accumulatedActiveMs;
    pendingWritesRef.current = pendingWritesRef.current
      .then(() => finishStudySession(sessionId, finalActiveMs))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Drop stale UI immediately so re-entry after a finished round never shows old cards.
      answeredCountRef.current = 0;
      setAnsweredCount(0);
      earnedStarsRef.current = 0;
      setRound([]);
      setIndex(0);
      setReward(null);
      setEarnedStars(0);
      setIsEmpty(false);
      setLimitReached(false);
      setAnswering(false);

      // Restart on focus so tab switches and "开始冒险" re-entry always open a fresh session.
      void Promise.all([
        loadCharacterProgresses(levelCharacters.map((item) => item.id)),
        remainingStudySeconds(settings.studyDurationMinutes),
        loadLastCardsRoundCharacterIds(),
      ]).then(async ([characterProgress, remainingSeconds, lastRoundIds]) => {
        if (cancelled) return;
        if (remainingSeconds <= 0) {
          setLimitReached(true);
          setIsEmpty(false);
          setRound([]);
          setReward(null);
          return;
        }
        // Exclude the previous completed round so re-entry shows different characters when possible.
        const nextRound = buildCardsRound(levelCharacters, characterProgress, {
          excludeIds: lastRoundIds,
        });
        if (nextRound.length === 0) {
          setIsEmpty(true);
          setRound([]);
          setReward(null);
          return;
        }
        setIsEmpty(false);
        const sessionId = await startStudySession({ activity: "cards", levelId });
        if (cancelled) {
          void finishStudySession(sessionId);
          return;
        }
        sessionRef.current = sessionId;
        answeredCountRef.current = 0;
      setAnsweredCount(0);
        earnedStarsRef.current = 0;
        setEarnedStars(0);
        setLimitReached(false);
        setReward(null);
        void useAppStore.getState().startStudy(sessionId, Date.now(), remainingSeconds / 60);
        // Always start a new session from the first card so completed rounds don't resume at the end.
        setRound(nextRound);
        setIndex(0);
      });
      return () => {
        cancelled = true;
        closeSession();
      };
    }, [closeSession, levelCharacters, levelId, settings.studyDurationMinutes]),
  );

  useEffect(() => {
    if (!card) return;
    void selectCharacter(card.id);
    void loadCharacterProgress(card.id).then((item) => {
      setFavorite(item?.favorite ?? false);
    });
  }, [card]);

  const moveTo = useCallback((nextIndex: number) => {
    if (round.length === 0) return;
    useAppStore.getState().markInteraction();
    setIndex((nextIndex + round.length) % round.length);
  }, [round.length]);

  const finishCard = useCallback(async (known: boolean) => {
    const sessionId = sessionRef.current;
    if (!card || !sessionId || answering) return;
    setAnswering(true);
    useAppStore.getState().markInteraction();
    try {
      const result = await recordCardResponse({
        sessionId,
        questionKey: `card-${index}-${card.id}`,
        characterId: card.id,
        known,
        rewardStars: known ? 1 : 0,
      });
      if (!result.duplicate) {
        answeredCountRef.current += 1;
        setAnsweredCount(answeredCountRef.current);
      }
      if (known) {
        setBurstTrigger((v) => v + 1);
        starCounterScale.value = withSequence(
          withSpring(1.35, { damping: 8, stiffness: 220 }),
          withSpring(1, { damping: 12, stiffness: 180 }),
        );
        play("sfx-correct", { channel: "effect" });
        if (settings.hapticsEnabled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        earnedStarsRef.current += result.starsEarned;
        setEarnedStars(earnedStarsRef.current);
        if (result.starsEarned > 0) {
          showToast({ title: `太棒了！认识了“${card.hanzi}”`, message: `+${result.starsEarned} 颗星星` });
        } else {
          showToast({ title: `太棒了！认识了“${card.hanzi}”` });
        }
      } else {
        play("sfx-retry", { channel: "effect" });
        if (settings.hapticsEnabled) void Haptics.selectionAsync();
        play(primaryReading(card).audioId, { channel: "voice" });
        showToast({ title: '再听一次，慢慢记' });
      }
      await useAppStore.getState().refreshAppState();
      // Settle only after every card slot is actually answered (not merely viewing the last card).
      const reachedLimit = getRemainingStudyMs(useAppStore.getState().study, Date.now()) === 0;
      const roundDone = answeredCountRef.current >= round.length;
      if (roundDone || reachedLimit) {
        const activeSessionId = sessionRef.current;
        if (!activeSessionId) {
          return;
        }
        settlingRef.current = true;
        sessionRef.current = null;
        const stopped = useAppStore.getState().stopStudy();
        let settlementStars = 0;
        let levelReadyForChallenge = false;
        try {
          const settlement = await completeCardsRound({
            sessionId: activeSessionId,
            levelId,
            // Actual answered slots only — prevents clearing a round by jumping to the last card.
            score: Math.min(answeredCountRef.current, round.length),
            total: round.length,
            activeMs: stopped.accumulatedActiveMs,
          });
          settlementStars = settlement.starsEarned;
          levelReadyForChallenge = settlement.levelReadyForChallenge;
        } catch {
          await finishStudySession(activeSessionId, stopped.accumulatedActiveMs).catch(() => undefined);
        } finally {
          settlingRef.current = false;
        }
        await useAppStore.getState().refreshAppState();
        const remainingToLearn = Math.max(
          0,
          useAppStore.getState().progress.currentLevelSize -
            useAppStore.getState().progress.currentLevelLearned,
        );
        setReward({
          tone: reachedLimit ? "info" : "reward",
          title: reachedLimit
            ? "今天已经很棒啦！"
            : levelReadyForChallenge
              ? "本关汉字练完啦！"
              : "这一轮完成啦！",
          message: reachedLimit
            ? "明天再来冒险吧！"
            : levelReadyForChallenge
              ? "太棒了！去闯关挑战，答对 7 题就能过关。"
              : remainingToLearn > 0
                ? `本关还剩 ${remainingToLearn} 个汉字，继续开始冒险就能去闯关哦。`
                : "本关汉字已练完，去闯关挑战答对 7 题即可过关。",
          stars: earnedStarsRef.current + settlementStars,
        });
      } else {
        moveTo(index + 1);
      }
    } finally {
      setAnswering(false);
    }
  }, [answering, card, index, levelId, moveTo, play, round.length, settings.hapticsEnabled, showToast, starCounterScale]);

  if (limitReached) {
    return (
      <AppScreen scroll={false} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 30, textAlign: "center" }}>今天已经很棒啦！</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 17, textAlign: "center" }}>明天再来冒险吧！</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回首页"
          onPress={() => router.replace("/(tabs)")}
          style={{
            minWidth: 180,
            minHeight: 58,
            borderRadius: radii.xl,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.green,
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}>回首页</Text>
        </Pressable>
      </AppScreen>
    );
  }

  if (isEmpty) {
    return (
      <AppScreen scroll={false} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 26, textAlign: "center" }}>
          还没有选择要学的汉字哦～
        </Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16, textAlign: "center" }}>
          去家长中心开启汉字
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="去家长中心"
            onPress={() => router.push("/parent")}
            style={{
              minWidth: 140,
              minHeight: 52,
              borderRadius: radii.xl,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.green,
            }}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>去家长中心</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回首页"
            onPress={() => router.replace("/(tabs)")}
            style={{
              minWidth: 120,
              minHeight: 52,
              borderRadius: radii.xl,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.canvas,
              borderWidth: 2,
              borderColor: colors.outline,
            }}
          >
            <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 16 }}>回首页</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (!card) {
    return (
      <AppScreen scroll={false} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 18 }}>正在邀请汉字朋友…</Text>
      </AppScreen>
    );
  }

  const progressRatio = (index + 1) / Math.max(1, round.length);
  const progressWidth = `${progressRatio * 100}%` as const;

  return (
    <AppScreen contentStyle={{ gap: compact ? spacing.md : spacing.lg, paddingBottom: wide ? spacing.xl : 120 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回首页"
          onPress={() => {
            closeSession();
            router.replace("/(tabs)");
          }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 0 #D5DFEA",
          }}
        >
          <AppIcon name="back" color={colors.blueDeep} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 20, textAlign: "center" }}>
          今日进度
        </Text>
        <Animated.View
          style={[
            {
              minHeight: 44,
              borderRadius: radii.pill,
              backgroundColor: colors.orange,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 0 #865300",
            },
            starCounterAnimatedStyle,
          ]}
        >
          <AppIcon name="star" size={18} color={colors.yellow} />
          <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 }}>{rewards.stars}</Text>
        </Animated.View>
      </View>

      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' }}>
        {answeredCount}/{round.length} · 再练 {Math.max(0, round.length - answeredCount)} 个完成本轮
      </Text>
      <View style={{ width: "100%", height: 16, borderRadius: radii.pill, backgroundColor: "#EBEEF5", justifyContent: "center" }}>
        <View style={{ width: progressWidth, height: "100%", borderRadius: radii.pill, backgroundColor: colors.greenDeep }} />
        <View
          style={{
            position: "absolute",
            left: `${Math.max(8, Math.min(92, progressRatio * 100))}%`,
            marginLeft: -18,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.yellow,
            borderWidth: 3,
            borderColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 0 #865300",
          }}
        >
          <AppIcon name="star" size={16} color={colors.orangeDeep} />
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <StarBurst trigger={burstTrigger} />
        <CharacterCard
          character={card}
          favorited={favorite}
          onPrevious={() => moveTo(index - 1)}
          onNext={() => moveTo(index + 1)}
          onFavorite={() => {
            useAppStore.getState().markInteraction();
            void toggleFavorite(card.id).then((value) => {
              setFavorite(value);
              if (settings.hapticsEnabled) void Haptics.selectionAsync();
            });
          }}
          onSpeak={(audioId) => {
            useAppStore.getState().markInteraction();
            play(audioId ?? primaryReading(card).audioId, { channel: "voice" });
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="再看看这个字"
          disabled={answering}
          onPress={() => void finishCard(false)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: compact ? 66 : 76,
            borderRadius: radii.xl,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.blueSoft,
            opacity: pressed ? 0.85 : 1,
            boxShadow: pressed ? "0 2px 0 #B7D7EA" : "0 6px 0 #B7D7EA",
            transform: [{ translateY: pressed ? 4 : 0 }],
          })}
        >
          <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 19 }}>再看看</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="我认识这个字"
          disabled={answering}
          onPress={() => void finishCard(true)}
          style={({ pressed }) => ({
            flex: 1.8,
            minHeight: compact ? 66 : 76,
            borderRadius: radii.xl,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.greenDeep,
            borderWidth: 2,
            borderColor: colors.green,
            opacity: pressed ? 0.9 : 1,
            boxShadow: pressed ? "0 2px 0 #002105" : "0 6px 0 #002105",
            transform: [{ translateY: pressed ? 4 : 0 }],
          })}
        >
          <AppIcon name="check" color={colors.surface} />
          <Text style={{ color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 22 }}>我认识</Text>
        </Pressable>
      </View>

      <RewardToast visible={toast !== null} title={toast?.title ?? ''} message={toast?.message} />

      <RewardOverlay
        visible={reward !== null}
        title={reward?.title ?? ""}
        message={reward?.message ?? ""}
        stars={reward?.stars ?? 0}
        tone={reward?.tone}
        onDismiss={() => {
          // Clear finished-round UI before leaving so the next visit always reloads fresh.
          setReward(null);
          setRound([]);
          setIndex(0);
          answeredCountRef.current = 0;
      setAnsweredCount(0);
          earnedStarsRef.current = 0;
          setEarnedStars(0);
          router.replace("/(tabs)");
        }}
      />
    </AppScreen>
  );
}
