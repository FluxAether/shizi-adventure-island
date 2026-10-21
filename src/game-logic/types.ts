export const GAME_IDS = ['memory', 'listen', 'word-drag', 'challenge'] as const;
export type GameId = (typeof GAME_IDS)[number];

export interface GameWord {
  word: string;
  pinyin: string;
}

export interface GameCharacter {
  id: string;
  hanzi: string;
  pinyin: string;
  words: readonly GameWord[];
  levelId?: string;
  illustration?: {
    sceneId: string;
    alt: string;
  };
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface FirstAnswerResult {
  questionKey: string;
  characterId?: string;
  correct: boolean;
}

export type RandomSource = () => number;
