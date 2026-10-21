import { shuffle, uniqueBy } from './random';
import type { ChoiceOption, GameCharacter, RandomSource } from './types';

export const CHALLENGE_QUESTION_COUNT = 10;
export const CHALLENGE_DURATION_SECONDS = 75;
export const CHALLENGE_PASS_SCORE = 7;

export type ChallengeKind = 'listen' | 'pinyin' | 'word';

export interface ChallengeQuestion {
  id: string;
  kind: ChallengeKind;
  characterId: string;
  prompt: string;
  options: ChoiceOption[];
  correctOptionId: string;
}

export interface ChallengeResult {
  passed: boolean;
  score: number;
  timedOut: boolean;
}

const QUESTION_KINDS: readonly ChallengeKind[] = [
  'listen',
  'pinyin',
  'word',
  'listen',
  'pinyin',
  'word',
  'listen',
  'pinyin',
  'word',
  'listen',
];

export function createChallengeQuestions(
  characters: readonly GameCharacter[],
  random: RandomSource = Math.random,
): ChallengeQuestion[] {
  const pool = uniqueBy(characters, (item) => item.id).filter((item) => item.words.length > 0);
  if (pool.length < CHALLENGE_QUESTION_COUNT) {
    throw new Error('限时挑战需要至少 10 个有词例的不同汉字');
  }

  return shuffle(pool, random)
    .slice(0, CHALLENGE_QUESTION_COUNT)
    .map((answer, index) => buildQuestion(answer, pool, QUESTION_KINDS[index], index, random));
}

function buildQuestion(
  answer: GameCharacter,
  pool: readonly GameCharacter[],
  kind: ChallengeKind,
  index: number,
  random: RandomSource,
): ChallengeQuestion {
  const label = (item: GameCharacter) => {
    if (kind === 'pinyin') return item.pinyin;
    if (kind === 'word') return item.words[0].word;
    return item.hanzi;
  };
  const answerLabel = label(answer);
  const distractors = shuffle(
    uniqueBy(
      pool.filter((item) => item.id !== answer.id && label(item) !== answerLabel),
      label,
    ),
    random,
  ).slice(0, 3);
  if (distractors.length !== 3) throw new Error('限时挑战选项不足');

  const optionCharacters = shuffle([answer, ...distractors], random);
  const options = optionCharacters.map((item) => ({ id: item.id, label: label(item) }));
  const prompt =
    kind === 'listen'
      ? '听一听，选出正确的字'
      : kind === 'pinyin'
        ? `“${answer.hanzi}”的拼音是什么？`
        : `哪个词里有“${answer.hanzi}”？`;

  return {
    id: `challenge:${index}:${answer.id}`,
    kind,
    characterId: answer.id,
    prompt,
    options,
    correctOptionId: answer.id,
  };
}

export function evaluateChallengeAnswer(
  question: ChallengeQuestion,
  selectedOptionId: string,
): boolean {
  return selectedOptionId === question.correctOptionId;
}

export function settleChallenge(
  correctCount: number,
  answeredCount: number,
  remainingSeconds: number,
): ChallengeResult {
  const score = Math.max(0, Math.min(correctCount, answeredCount, CHALLENGE_QUESTION_COUNT));
  return {
    passed: score >= CHALLENGE_PASS_SCORE,
    score,
    timedOut: remainingSeconds <= 0,
  };
}
