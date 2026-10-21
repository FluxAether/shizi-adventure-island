import { shuffle, uniqueBy } from './random';
import type { GameCharacter, RandomSource } from './types';

export interface MemoryCard {
  id: string;
  pairId: string;
  characterId: string;
  face: 'hanzi' | 'pinyin';
  label: string;
}

export const MEMORY_MISMATCH_DELAY_MS = 700;

export interface MemoryState {
  openIds: string[];
  matchedPairIds: string[];
  moves: number;
  locked: boolean;
  completed: boolean;
}

export interface MemoryTransition {
  state: MemoryState;
  resolution: null | {
    questionKey: string;
    characterId: string;
    correct: boolean;
  };
}

export function createMemoryState(): MemoryState {
  return {
    openIds: [],
    matchedPairIds: [],
    moves: 0,
    locked: false,
    completed: false,
  };
}

export function createMemoryDeck(
  characters: readonly GameCharacter[],
  random: RandomSource = Math.random,
): MemoryCard[] {
  const selected = uniqueBy(
    shuffle(uniqueBy(characters, (item) => item.id), random),
    (item) => item.pinyin,
  ).slice(0, 6);
  if (selected.length !== 6) throw new Error('记忆游戏需要 6 个读音不同的汉字');

  return shuffle(
    selected.flatMap((character) => [
      {
        id: `${character.id}:hanzi`,
        pairId: character.id,
        characterId: character.id,
        face: 'hanzi' as const,
        label: character.hanzi,
      },
      {
        id: `${character.id}:pinyin`,
        pairId: character.id,
        characterId: character.id,
        face: 'pinyin' as const,
        label: character.pinyin,
      },
    ]),
    random,
  );
}

export function isMemoryMatch(first: MemoryCard, second: MemoryCard): boolean {
  return first.id !== second.id && first.pairId === second.pairId;
}

export function selectMemoryCard(
  deck: readonly MemoryCard[],
  state: MemoryState,
  cardId: string,
): MemoryTransition {
  const card = deck.find((item) => item.id === cardId);
  if (
    !card ||
    state.locked ||
    state.openIds.includes(card.id) ||
    state.matchedPairIds.includes(card.pairId)
  ) {
    return { state, resolution: null };
  }
  if (state.openIds.length === 0) {
    return { state: { ...state, openIds: [card.id] }, resolution: null };
  }

  const first = deck.find((item) => item.id === state.openIds[0]);
  if (!first) return { state: { ...state, openIds: [] }, resolution: null };
  const correct = isMemoryMatch(first, card);
  const moves = state.moves + 1;
  const matchedPairIds = correct
    ? [...state.matchedPairIds, card.pairId]
    : state.matchedPairIds;
  return {
    state: {
      ...state,
      openIds: correct ? [] : [first.id, card.id],
      matchedPairIds,
      moves,
      locked: !correct,
      completed: matchedPairIds.length === 6,
    },
    resolution: {
      questionKey: `memory:${moves}`,
      characterId: card.characterId,
      correct,
    },
  };
}

export function concealMemoryMismatch(state: MemoryState): MemoryState {
  if (!state.locked) return state;
  return { ...state, openIds: [], locked: false };
}
