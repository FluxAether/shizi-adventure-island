import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChallengeGame,
  ListenGame,
  MemoryGame,
  WordDragGame,
  type GameOutcome,
} from '@/components/games';
import {
  primaryPinyin,
  primaryReading,
  primaryWords,
} from '@/content/registry';
import {
  adventureLevelId,
  adventureLevelIndex,
  charactersForAdventureLevel,
} from '@/content/adventure';
import { RewardOverlay } from '@/components/reward-overlay';
import {
  GAME_IDS,
  type FirstAnswerResult,
  type GameCharacter,
  type GameId,
} from '@/game-logic/types';
import {
  completeStudyRound,
  finishStudySession,
  loadCharacterProgresses,
  recordAnswer,
  startStudySession,
} from '@/services/progress';
import { useAppStore } from '@/store';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isGameId(value: string | undefined): value is GameId {
  return value !== undefined && (GAME_IDS as readonly string[]).includes(value);
}

function gameNeedsMoreCharacters(gameId: GameId, characters: readonly GameCharacter[]): boolean {
  const unique = new Set(characters.map((item) => item.id));
  if (gameId === 'listen' || gameId === 'memory') return unique.size < 6;
  if (gameId === 'word-drag') {
    const words = new Set(
      characters.flatMap((item) => item.words.filter(({ word }) => [...word].length === 2).map(({ word }) => word)),
    );
    return words.size < 4;
  }
  return unique.size < 10 || characters.filter((item) => item.words.length > 0).length < 10;
}

export default function GameRoute() {
  const params = useLocalSearchParams<{ gameId?: string | string[]; levelId?: string | string[] }>();
  const rawGameId = firstParam(params.gameId);
  const requestedLevelId = firstParam(params.levelId);
  const gameId = isGameId(rawGameId) ? rawGameId : null;
  const progress = useAppStore((state) => state.progress);
  const settings = useAppStore((state) => state.settings);
  const requestedIndex = adventureLevelIndex(requestedLevelId) ?? progress.unlockedAdventureLevel;
  const adventureLevel = Math.max(0, Math.min(progress.unlockedAdventureLevel, requestedIndex, 79));
  const levelId = adventureLevelId(adventureLevel);
  const dailyLimitReached = progress.activeSeconds >= settings.studyDurationMinutes * 60;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [settlement, setSettlement] = useState<{
    stars: number;
    passed: boolean;
  } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const pendingWritesRef = useRef<Promise<unknown>>(Promise.resolve());
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  const levelCharacters = useMemo(
    () => charactersForAdventureLevel(adventureLevel),
    [adventureLevel],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCharacterProgresses(levelCharacters.map((item) => item.id)).then((rows) => {
      if (cancelled) return;
      setDisabledIds(new Set(rows.filter((row) => row.enabled === false).map((row) => row.characterId)));
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [levelCharacters]);

  const playableCharacters = useMemo(
    () => levelCharacters.filter((entry) => !disabledIds.has(entry.id)),
    [disabledIds, levelCharacters],
  );
  const characters = useMemo<GameCharacter[]>(
    () =>
      playableCharacters.map((entry) => ({
        id: entry.id,
        hanzi: entry.hanzi,
        pinyin: primaryPinyin(entry),
        words: primaryWords(entry).map((word) => ({ word: word.word, pinyin: word.pinyin })),
        illustration: entry.illustration,
        levelId: entry.levelId,
      })),
    [playableCharacters],
  );
  const audioIdByCharacterId = useMemo<Readonly<Record<string, string | undefined>>>(
    () =>
      Object.fromEntries(
        playableCharacters.map((entry) => [entry.id, primaryReading(entry).audioId]),
      ),
    [playableCharacters],
  );

  const closeSession = useCallback(() => {
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) return;
    sessionRef.current = null;
    const stopped = useAppStore.getState().stopStudy();
    pendingWritesRef.current = pendingWritesRef.current
      .then(() => finishStudySession(activeSessionId, stopped.accumulatedActiveMs))
      .catch(() => setSaveFailed(true));
  }, []);

  useEffect(() => {
    if (!gameId || dailyLimitReached) return;
    let cancelled = false;
    void startStudySession({ gameId, levelId })
      .then((id) => {
        if (cancelled) {
          void finishStudySession(id);
          return;
        }
        sessionRef.current = id;
        const remainingMinutes = Math.max(
          1 / 60,
          settings.studyDurationMinutes - progress.activeSeconds / 60,
        );
        void useAppStore.getState().startStudy(id, Date.now(), remainingMinutes);
        setSessionId(id);
      })
      .catch(() => {
        if (!cancelled) setStartFailed(true);
      });
    return () => {
      cancelled = true;
      closeSession();
    };
  }, [closeSession, dailyLimitReached, gameId, levelId, progress.activeSeconds, settings.studyDurationMinutes]);

  if (!gameId) {
    return <RouteStatus title="没有这个游戏" detail="请从学习地图选择四种游戏之一" />;
  }
  if (dailyLimitReached) {
    return <RouteStatus title="今天已经很棒啦！" detail="明天再来冒险吧！" />;
  }
  if (startFailed) {
    return <RouteStatus title="暂时无法开始" detail="学习记录没有准备好，请返回后再试" />;
  }
  if (!sessionId) {
    return <RouteStatus title="正在准备游戏" detail="马上就好" showBack={false} />;
  }

  const onFirstAnswer = (answer: FirstAnswerResult) => {
    useAppStore.getState().markInteraction();
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) return;
    pendingWritesRef.current = pendingWritesRef.current
      .then(() => recordAnswer({
        sessionId: activeSessionId,
        questionKey: answer.questionKey,
        gameId,
        characterId: answer.characterId,
        levelId,
        correct: answer.correct,
      }))
      .catch(() => setSaveFailed(true));
  };
  const onInteraction = () => useAppStore.getState().markInteraction();
  const onComplete = (outcome: GameOutcome) => {
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) return;
    sessionRef.current = null;
    const stopped = useAppStore.getState().stopStudy();
    pendingWritesRef.current = pendingWritesRef.current
      .then(() => completeStudyRound({
        sessionId: activeSessionId,
        gameId,
        levelId,
        score: outcome.score,
        total: outcome.total,
        passed: outcome.passed,
        activeMs: stopped.accumulatedActiveMs,
      }))
      .then((result) => {
        setSettlement({ stars: result.starsEarned, passed: outcome.passed });
        return useAppStore.getState().refreshAppState();
      })
      .catch(() => setSaveFailed(true));
  };
  const onExit = () => {
    closeSession();
    router.back();
  };
  const common = {
    characters,
    audioIdByCharacterId,
    onFirstAnswer,
    onInteraction,
    onComplete,
    onExit,
  };
  if (gameNeedsMoreCharacters(gameId, characters)) {
    return (
      <RouteStatus
        title="本关字太少"
        detail="去家长中心打开几个字，再回来玩吧"
      />
    );
  }

  const game =
    gameId === 'memory' ? (
      <MemoryGame {...common} />
    ) : gameId === 'listen' ? (
      <ListenGame {...common} />
    ) : gameId === 'word-drag' ? (
      <WordDragGame {...common} />
    ) : (
      <ChallengeGame {...common} />
    );

  return (
    <View style={{ flex: 1 }}>
      {game}
      {saveFailed ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            bottom: spacing.lg,
            minHeight: 56,
            borderRadius: radii.md,
            backgroundColor: colors.orangeSoft,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.orangeDeep, fontFamily: fonts.bodyBold, textAlign: 'center' }}>
            这次学习记录暂时没保存，游戏仍可继续
          </Text>
        </View>
      ) : null}
      <RewardOverlay
        visible={settlement !== null}
        title={
          gameId === 'challenge'
            ? settlement?.passed
              ? '本关通过啦！'
              : '这次很接近'
            : '太棒了！'
        }
        message={
          gameId === 'challenge'
            ? settlement?.passed
              ? '小勇士成功守护了这一关！可以去下一关继续冒险。'
              : '再试一次，答对 7 题就能通关哦。'
            : '这一轮的汉字朋友都记住你啦。'
        }
        stars={settlement?.stars ?? 0}
        tone={gameId === 'challenge' && settlement?.passed === false ? 'info' : 'reward'}
        onDismiss={() => setSettlement(null)}
      />
    </View>
  );
}

function RouteStatus({
  title,
  detail,
  showBack = true,
}: {
  title: string;
  detail: string;
  showBack?: boolean;
}) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 17, textAlign: 'center' }}>
        {detail}
      </Text>
      {showBack ? (
        <Text
          accessibilityRole="button"
          accessibilityLabel="返回学习地图"
          onPress={() => router.back()}
          style={{
            minHeight: 56,
            minWidth: 168,
            borderRadius: radii.pill,
            backgroundColor: colors.blueDeep,
            color: colors.surface,
            fontFamily: fonts.bodyBold,
            fontSize: 18,
            textAlign: 'center',
            textAlignVertical: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          返回
        </Text>
      ) : null}
    </SafeAreaView>
  );
}
