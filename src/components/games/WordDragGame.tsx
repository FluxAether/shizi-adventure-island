import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  createWordDragRounds,
  placeWordTile,
  type WordDragRound,
  type WordPlacements,
} from '@/game-logic/word-drag';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

import { CompletionPanel, GameScaffold } from './GameScaffold';
import type { GameProps } from './types';

const EMPTY_PLACEMENTS: WordPlacements = [null, null];

export function WordDragGame({ characters, onFirstAnswer, onInteraction, onComplete, onExit }: GameProps) {
  const rounds = useMemo(() => createWordDragRounds(characters), [characters]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [placements, setPlacements] = useState<WordPlacements>(EMPTY_PLACEMENTS);
  const [feedback, setFeedback] = useState('把两个字拖到正确的位置');
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const firstAttemptedRounds = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const round = rounds[roundIndex];
  const { width, height } = useWindowDimensions();
  const wide = width > height;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const attemptDrop = (tileIndex: number, slotIndex: 0 | 1 | null, gestureCorrect: boolean) => {
    onInteraction();
    const result =
      slotIndex === null
        ? { correct: false, completed: false, placements }
        : placeWordTile(round, placements, tileIndex, slotIndex);
    const correct = gestureCorrect && result.correct;

    const isFirstAttempt = !firstAttemptedRounds.current.has(round.id);
    const nextFirstTryScore = firstTryScore + (isFirstAttempt && correct ? 1 : 0);
    if (isFirstAttempt) {
      firstAttemptedRounds.current.add(round.id);
      onFirstAnswer({
        questionKey: round.id,
        characterId: round.characterId,
        correct,
      });
      if (correct) setFirstTryScore(nextFirstTryScore);
    }

    if (!correct) {
      setFeedback('快到啦，看看字的顺序再试一次');
      return;
    }

    setPlacements(result.placements);
    setFeedback(result.completed ? `${round.word}，组词成功` : '放对了，再放一个');
    if (!result.completed) return;

    timer.current = setTimeout(() => {
      if (roundIndex + 1 === rounds.length) {
        setFinished(true);
        onComplete({ score: nextFirstTryScore, total: 4, passed: true });
        return;
      }
      setRoundIndex((value) => value + 1);
      setPlacements([null, null]);
      setFeedback('把两个字拖到正确的位置');
    }, 800);
  };

  return (
    <GameScaffold
      title="拖字成词"
      subtitle="拖动字卡，按顺序组成双字词"
      progress={`${Math.min(roundIndex + 1, 4)}/4`}
      onExit={onExit}
      scroll={false}
    >
      {finished ? (
        <CompletionPanel
          title="四个词都完成了"
          detail={`首次拖对 ${firstTryScore} 个词`}
          passed
          onExit={onExit}
        />
      ) : (
        <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: spacing.md }}>
          <View
            style={{
              width: wide ? 260 : undefined,
              borderRadius: radii.lg,
              backgroundColor: colors.orangeSoft,
              padding: spacing.md,
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: colors.orangeDeep, fontFamily: fonts.bodyBold, fontSize: 18 }}>
              {round.pinyin}
            </Text>
            <Text accessibilityLiveRegion="polite" style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 17, textAlign: 'center' }}>
              {feedback}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <DragBoard
              key={round.id}
              round={round}
              placements={placements}
              onAttempt={attemptDrop}
            />
          </View>
        </View>
      )}
    </GameScaffold>
  );
}

function DragBoard({
  round,
  placements,
  onAttempt,
}: {
  round: WordDragRound;
  placements: WordPlacements;
  onAttempt: (tileIndex: number, slotIndex: 0 | 1 | null, correct: boolean) => void;
}) {
  const [width, setWidth] = useState(320);
  const tileSize = Math.max(68, Math.min(88, (width - 64) / 2));
  const gap = Math.min(28, Math.max(16, width * 0.05));
  const left = (width - tileSize * 2 - gap) / 2;
  const slotXs: [number, number] = [left, left + tileSize + gap];
  const slotY = 18;
  const sourceY = Math.min(190, Math.max(142, tileSize + 70));
  const targetCharacters = [...round.word] as [string, string];
  const placedLabels = placements.map((tileId) =>
    tileId ? round.tiles.find((tile) => tile.id === tileId)?.label : null,
  );
  const updateWidth = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={updateWidth}
      style={{ flex: 1, minHeight: sourceY + tileSize + 30, position: 'relative' }}
    >
      {slotXs.map((x, index) => (
        <View
          key={`slot:${index}`}
          accessibilityLabel={`第 ${index + 1} 个字的位置${placedLabels[index] ? `，已放入 ${placedLabels[index]}` : ''}`}
          style={{
            position: 'absolute',
            left: x,
            top: slotY,
            width: tileSize,
            height: tileSize,
            borderRadius: radii.md,
            borderWidth: 3,
            borderStyle: 'dashed',
            borderColor: placedLabels[index] ? colors.green : colors.blue,
            backgroundColor: placedLabels[index] ? colors.greenSoft : colors.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 40 }}>
            {placedLabels[index] ?? '□'}
          </Text>
        </View>
      ))}
      {round.tiles.map((tile, tileIndex) => (
        <DraggableCharacterTile
          key={tile.id}
          tileIndex={tileIndex}
          label={tile.label}
          correctSlot={tile.correctSlot}
          size={tileSize}
          sourceX={slotXs[tileIndex]}
          sourceY={sourceY}
          slotXs={slotXs}
          slotY={slotY}
          targetCharacters={targetCharacters}
          placements={placements}
          tileId={tile.id}
          onAttempt={onAttempt}
        />
      ))}
    </View>
  );
}

function DraggableCharacterTile({
  tileIndex,
  label,
  correctSlot,
  size,
  sourceX,
  sourceY,
  slotXs,
  slotY,
  targetCharacters,
  placements,
  tileId,
  onAttempt,
}: {
  tileIndex: number;
  label: string;
  correctSlot: 0 | 1;
  size: number;
  sourceX: number;
  sourceY: number;
  slotXs: [number, number];
  slotY: number;
  targetCharacters: [string, string];
  placements: WordPlacements;
  tileId: string;
  onAttempt: (tileIndex: number, slotIndex: 0 | 1 | null, correct: boolean) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const placedSlot = placements.findIndex((value) => value === tileId);

  useEffect(() => {
    if (placedSlot >= 0) {
      translateX.value = withSpring(slotXs[placedSlot] - sourceX);
      translateY.value = withSpring(slotY - sourceY);
    } else {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  }, [placedSlot, slotXs, slotY, sourceX, sourceY, translateX, translateY]);

  const gesture = Gesture.Pan()
    .enabled(placedSlot < 0)
    .minDistance(3)
    .onBegin(() => {
      scale.value = withSpring(1.08);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const centerX = sourceX + size / 2 + event.translationX;
      const centerY = sourceY + size / 2 + event.translationY;
      let target: 0 | 1 | null = null;
      for (let slot = 0; slot < 2; slot += 1) {
        if (
          centerX >= slotXs[slot] &&
          centerX <= slotXs[slot] + size &&
          centerY >= slotY &&
          centerY <= slotY + size
        ) {
          target = slot as 0 | 1;
        }
      }
      const correct =
        target !== null && placements[target] === null && targetCharacters[target] === label;
      if (correct && target !== null) {
        translateX.value = withSpring(slotXs[target] - sourceX);
        translateY.value = withSpring(slotY - sourceY);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      scheduleOnRN(onAttempt, tileIndex, target, correct);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`字卡 ${label}，拖到第 ${correctSlot + 1} 个位置`}
        accessibilityHint="拖动字卡，或双击自动放到正确位置"
        accessibilityState={{ disabled: placedSlot >= 0 }}
        onAccessibilityTap={() => onAttempt(tileIndex, correctSlot, true)}
        style={[
          {
            position: 'absolute',
            left: sourceX,
            top: sourceY,
            width: size,
            height: size,
            borderRadius: radii.md,
            backgroundColor: placedSlot >= 0 ? colors.greenSoft : colors.surface,
            borderWidth: 3,
            borderColor: placedSlot >= 0 ? colors.green : colors.orange,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 42 }}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
