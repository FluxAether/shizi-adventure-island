import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AudioButton } from '@/components/audio-button';
import {
  CHALLENGE_DURATION_SECONDS,
  CHALLENGE_QUESTION_COUNT,
  createChallengeQuestions,
  evaluateChallengeAnswer,
  settleChallenge,
  type ChallengeResult,
} from '@/game-logic/challenge';
import { PulseView } from '@/components/animated';
import { useAudio } from '@/services/audio';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

import { ChoiceGrid } from './ChoiceGrid';
import { CompletionPanel, GameScaffold } from './GameScaffold';
import type { GameProps } from './types';
import { useGameAudio } from './useGameAudio';

export function ChallengeGame({
  characters,
  audioIdByCharacterId,
  onFirstAnswer,
  onInteraction,
  onComplete,
  onExit,
}: GameProps) {
  const questions = useMemo(() => createChallengeQuestions(characters), [characters]);
  const [index, setIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(CHALLENGE_DURATION_SECONDS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const completionSent = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAudio = useGameAudio(audioIdByCharacterId);
  const { play } = useAudio();
  const question = questions[index];

  const finish = useCallback((finalScore: number, finalAnsweredCount: number, seconds: number) => {
    if (completionSent.current) return;
    completionSent.current = true;
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    const outcome = settleChallenge(finalScore, finalAnsweredCount, seconds);
    setResult(outcome);
    onComplete({
      score: outcome.score,
      total: CHALLENGE_QUESTION_COUNT,
      passed: outcome.passed,
      timedOut: outcome.timedOut,
    });
  }, [onComplete]);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  useEffect(() => {
    if (remaining === 0 && !result) finish(score, answeredCount, 0);
  }, [remaining, result, score, answeredCount, finish]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const choose = (optionId: string) => {
    if (locked || result) return;
    onInteraction();
    const correct = evaluateChallengeAnswer(question, optionId);
    const nextScore = score + (correct ? 1 : 0);
    const nextAnsweredCount = answeredCount + 1;
    play(correct ? 'sfx-correct' : 'sfx-retry', { channel: 'effect' });
    setSelectedId(optionId);
    setHighlightedId(question.correctOptionId);
    setLocked(true);
    setScore(nextScore);
    setAnsweredCount(nextAnsweredCount);
    onFirstAnswer({
      questionKey: question.id,
      characterId: question.characterId,
      correct,
    });

    advanceTimer.current = setTimeout(() => {
      if (index + 1 === CHALLENGE_QUESTION_COUNT) {
        finish(nextScore, nextAnsweredCount, remaining);
        return;
      }
      setIndex((value) => value + 1);
      setSelectedId(null);
      setHighlightedId(null);
      setLocked(false);
    }, 500);
  };

  const timerPill = (
    <PulseView active={remaining <= 15} scaleTo={1.08} duration={600}>
      <View
        accessibilityLabel={`剩余 ${remaining} 秒`}
      style={{
        minHeight: 48,
        minWidth: 82,
        borderRadius: radii.pill,
        backgroundColor: remaining <= 15 ? colors.orangeSoft : colors.blueSoft,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <AppIcon name="clock" size={22} color={remaining <= 15 ? colors.orangeDeep : colors.blueDeep} />
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18, fontVariant: ['tabular-nums'] }}>
        {remaining}
      </Text>
      </View>
    </PulseView>
  );

  return (
    <GameScaffold
      title="限时挑战"
      subtitle="75 秒完成 10 题，答对 7 题即通关"
      trailing={timerPill}
      onExit={onExit}
    >
      {result ? (
        <CompletionPanel
          title={result.passed ? '挑战通关' : '这次很接近'}
          detail={`${result.score}/10${result.timedOut ? '，时间到' : ''}`}
          passed={result.passed}
          onExit={onExit}
        />
      ) : (
        <>
          <View
            style={{
              minHeight: 130,
              borderRadius: radii.xl,
              backgroundColor: colors.surface,
              borderWidth: 3,
              borderColor: colors.outline,
              padding: spacing.xl,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
            }}
          >
            <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 16 }}>
              第 {index + 1} / 10 题
            </Text>
            <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' }}>
              {question.prompt}
            </Text>
            {question.kind === 'listen' ? (
              <AudioButton
                label={`播放第 ${index + 1} 题发音`}
                onPress={() => {
                  onInteraction();
                  playAudio(question.characterId);
                }}
              />
            ) : null}
          </View>
          <ChoiceGrid
            options={question.options}
            disabled={locked}
            highlightedId={highlightedId}
            wrongId={selectedId && selectedId !== question.correctOptionId ? selectedId : null}
            onChoose={choose}
          />
        </>
      )}
    </GameScaffold>
  );
}


