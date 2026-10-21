import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { createListenQuestions, evaluateListenAnswer } from '@/game-logic/listen';
import { colors, fonts, spacing } from '@/theme/tokens';

import { ChoiceGrid } from './ChoiceGrid';
import { CompletionPanel, GameScaffold } from './GameScaffold';
import type { GameProps } from './types';
import { useGameAudio } from './useGameAudio';

export function ListenGame({
  characters,
  audioIdByCharacterId,
  onFirstAnswer,
  onInteraction,
  onComplete,
  onExit,
}: GameProps) {
  const questions = useMemo(() => createListenQuestions(characters), [characters]);
  const [index, setIndex] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('听一听，找出这个字');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [disabledOptionIds, setDisabledOptionIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAudio = useGameAudio(audioIdByCharacterId);
  const question = questions[index];

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (finished || !question) return;
    playAudio(question.characterId);
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      setLocked(false);
    }, 1000);
    return () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
    };
  }, [finished, index, playAudio, question]);

  const advance = (nextScore: number, delay: number) => {
    timer.current = setTimeout(() => {
      if (index + 1 === questions.length) {
        setFinished(true);
        onComplete({ score: nextScore, total: questions.length, passed: true });
        return;
      }
      setIndex((value) => value + 1);
      setWrongAttempts(0);
      setHighlightedId(null);
      setWrongId(null);
      setDisabledOptionIds([]);
      setFeedback('听一听，找出这个字');
    }, delay);
  };

  const choose = (optionId: string) => {
    if (locked) return;
    onInteraction();
    const result = evaluateListenAnswer(question, optionId, wrongAttempts);
    if (wrongAttempts === 0) {
      onFirstAnswer({
        questionKey: question.id,
        characterId: question.characterId,
        correct: result.correct,
      });
    }

    if (result.kind === 'retry') {
      setWrongAttempts(1);
      setWrongId(optionId);
      setDisabledOptionIds((prev) => (prev.includes(optionId) ? prev : [...prev, optionId]));
      setFeedback('没关系，再听一次，慢慢来');
      playAudio(question.characterId);
      return;
    }

    setLocked(true);
    setWrongId(result.correct ? null : optionId);
    setHighlightedId(result.highlightOptionId);
    if (result.correct) {
      const nextScore = score + 1;
      setScore(nextScore);
      setFeedback('听对啦！');
      advance(nextScore, 650);
    } else {
      setFeedback('答案在这里，我们记住它');
      advance(score, 1200);
    }
  };

  return (
    <GameScaffold
      title="听音选字"
      subtitle=""
      progress={`${Math.min(index + 1, 6)}/6`}
      onExit={onExit}
    >
      {finished ? (
        <CompletionPanel
          title="听力练习完成"
          detail={`首次答对 ${score} 题`}
          passed
          onExit={onExit}
        />
      ) : (
        <>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.md,
            }}
          >
            <AudioButton
              size="lg"
              label={`播放第 ${index + 1} 题汉字发音`}
              onPress={() => {
                onInteraction();
                playAudio(question.characterId);
              }}
            />
            <View style={{ alignItems: 'center', marginTop: spacing.xs }}>
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 18, textAlign: 'center', marginTop: spacing.xs }}
              >
                {feedback}
              </Text>
            </View>
          </View>
          <ChoiceGrid
            options={question.options}
            disabled={locked}
            disabledOptionIds={disabledOptionIds}
            highlightedId={highlightedId}
            wrongId={wrongId}
            onChoose={choose}
          />
        </>
      )}
    </GameScaffold>
  );
}
