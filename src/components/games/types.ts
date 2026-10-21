import type {
  FirstAnswerResult,
  GameCharacter,
  GameId,
} from '@/game-logic/types';

export interface GameOutcome {
  score: number;
  total: number;
  passed: boolean;
  timedOut?: boolean;
}

export interface GameProps {
  characters: readonly GameCharacter[];
  audioIdByCharacterId: Readonly<Record<string, string | undefined>>;
  onFirstAnswer: (answer: FirstAnswerResult) => void;
  onInteraction: () => void;
  onComplete: (outcome: GameOutcome) => void;
  onExit: () => void;
}

export const GAME_TITLES: Record<GameId, string> = {
  memory: '记忆翻翻乐',
  listen: '听音选字',
  'word-drag': '拖字成词',
  challenge: '限时挑战',
};
