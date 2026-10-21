import { shuffle, uniqueBy } from './random';
import type { GameCharacter, RandomSource } from './types';

export interface WordTile {
  id: string;
  label: string;
  correctSlot: 0 | 1;
}

export interface WordDragRound {
  id: string;
  characterId: string;
  word: string;
  pinyin: string;
  tiles: [WordTile, WordTile];
}

export type WordPlacements = [string | null, string | null];

export interface WordPlacementResult {
  correct: boolean;
  completed: boolean;
  placements: WordPlacements;
}

export function createWordDragRounds(
  characters: readonly GameCharacter[],
  random: RandomSource = Math.random,
): WordDragRound[] {
  const candidates = uniqueBy(
    characters.flatMap((character) =>
      character.words
        .filter(({ word }) => [...word].length === 2)
        .map((word) => ({ characterId: character.id, ...word })),
    ),
    (item) => item.word,
  );
  const selected = shuffle(candidates, random).slice(0, 4);
  if (selected.length !== 4) throw new Error('拖字成词需要 4 个不同的双字词');

  return selected.map((item, roundIndex) => {
    const charactersInWord = [...item.word] as [string, string];
    const tiles = shuffle(
      charactersInWord.map((label, slot) => ({
        id: `word:${roundIndex}:${slot}`,
        label,
        correctSlot: slot as 0 | 1,
      })),
      random,
    ) as [WordTile, WordTile];
    return {
      id: `word:${roundIndex}:${item.characterId}`,
      characterId: item.characterId,
      word: item.word,
      pinyin: item.pinyin,
      tiles,
    };
  });
}

export function placeWordTile(
  round: WordDragRound,
  placements: WordPlacements,
  tileIndex: number,
  slotIndex: 0 | 1,
): WordPlacementResult {
  const tile = round.tiles[tileIndex];
  const targetCharacter = [...round.word][slotIndex];
  if (!tile || placements[slotIndex] !== null || tile.label !== targetCharacter) {
    return { correct: false, completed: false, placements };
  }

  const next = placements.map((value) => (value === tile.id ? null : value)) as WordPlacements;
  next[slotIndex] = tile.id;
  return {
    correct: true,
    completed: next.every((value) => value !== null),
    placements: next,
  };
}

