import { shuffle, uniqueBy } from './random';
import type { ChoiceOption, GameCharacter, RandomSource } from './types';

export interface ListenQuestion {
  id: string;
  characterId: string;
  options: ChoiceOption[];
  correctOptionId: string;
}

export type ListenAnswerResult =
  | {
      kind: 'correct';
      correct: true;
      shouldAdvance: true;
      highlightOptionId: string;
    }
  | {
      kind: 'retry';
      correct: false;
      shouldAdvance: false;
      highlightOptionId: null;
    }
  | {
      kind: 'reveal';
      correct: false;
      shouldAdvance: true;
      highlightOptionId: string;
    };

export function createListenQuestions(
  characters: readonly GameCharacter[],
  random: RandomSource = Math.random,
): ListenQuestion[] {
  const pool = uniqueBy(characters, (item) => item.hanzi);
  if (pool.length < 6) throw new Error('听音选字需要至少 6 个不同汉字');

  return shuffle(pool, random)
    .slice(0, 6)
    .map((answer, index) => {
      const distractors = shuffle(
        pool.filter((item) => item.id !== answer.id),
        random,
      ).slice(0, 3);
      const options = shuffle([answer, ...distractors], random).map((item) => ({
        id: item.id,
        label: item.hanzi,
      }));
      return {
        id: `listen:${index}:${answer.id}`,
        characterId: answer.id,
        options,
        correctOptionId: answer.id,
      };
    });
}

export function evaluateListenAnswer(
  question: ListenQuestion,
  selectedOptionId: string,
  previousWrongAttempts: number,
): ListenAnswerResult {
  if (selectedOptionId === question.correctOptionId) {
    return {
      kind: 'correct',
      correct: true,
      shouldAdvance: true,
      highlightOptionId: question.correctOptionId,
    };
  }
  if (previousWrongAttempts === 0) {
    return {
      kind: 'retry',
      correct: false,
      shouldAdvance: false,
      highlightOptionId: null,
    };
  }
  return {
    kind: 'reveal',
    correct: false,
    shouldAdvance: true,
    highlightOptionId: question.correctOptionId,
  };
}

