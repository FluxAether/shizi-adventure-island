import {
  concealMemoryMismatch,
  createMemoryDeck,
  createMemoryState,
  isMemoryMatch,
  MEMORY_MISMATCH_DELAY_MS,
  selectMemoryCard,
} from '../../src/game-logic/memory';
import {
  createListenQuestions,
  evaluateListenAnswer,
} from '../../src/game-logic/listen';
import {
  createWordDragRounds,
  placeWordTile,
} from '../../src/game-logic/word-drag';
import {
  CHALLENGE_DURATION_SECONDS,
  CHALLENGE_PASS_SCORE,
  createChallengeQuestions,
  evaluateChallengeAnswer,
  settleChallenge,
} from '../../src/game-logic/challenge';
import type { GameCharacter } from '../../src/game-logic/types';

const characters: GameCharacter[] = [
  { id: 'u4e00', hanzi: '一', pinyin: 'yī', words: [{ word: '一天', pinyin: 'yì tiān' }] },
  { id: 'u4e8c', hanzi: '二', pinyin: 'èr', words: [{ word: '二月', pinyin: 'èr yuè' }] },
  { id: 'u4e09', hanzi: '三', pinyin: 'sān', words: [{ word: '三月', pinyin: 'sān yuè' }] },
  { id: 'u56db', hanzi: '四', pinyin: 'sì', words: [{ word: '四季', pinyin: 'sì jì' }] },
  { id: 'u4e94', hanzi: '五', pinyin: 'wǔ', words: [{ word: '五彩', pinyin: 'wǔ cǎi' }] },
  { id: 'u516d', hanzi: '六', pinyin: 'liù', words: [{ word: '六月', pinyin: 'liù yuè' }] },
  { id: 'u65e5', hanzi: '日', pinyin: 'rì', words: [{ word: '日光', pinyin: 'rì guāng' }] },
  { id: 'u6708', hanzi: '月', pinyin: 'yuè', words: [{ word: '月光', pinyin: 'yuè guāng' }] },
  { id: 'u5c71', hanzi: '山', pinyin: 'shān', words: [{ word: '山水', pinyin: 'shān shuǐ' }] },
  { id: 'u6c34', hanzi: '水', pinyin: 'shuǐ', words: [{ word: '水花', pinyin: 'shuǐ huā' }] },
];

const noShuffle = () => 0.999999;

describe('memory game', () => {
  it('creates exactly six pairs and twelve unique cards', () => {
    const deck = createMemoryDeck(characters, noShuffle);

    expect(deck).toHaveLength(12);
    expect(new Set(deck.map((card) => card.id)).size).toBe(12);

    const counts = new Map<string, number>();
    for (const card of deck) {
      counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual([2, 2, 2, 2, 2, 2]);
    expect(isMemoryMatch(deck[0], deck[1])).toBe(true);
  });

  it('uses pinyin for the matching card when illustration metadata is only thematic', () => {
    const deck = createMemoryDeck(
      characters.map((character, index) =>
        index === 0
          ? { ...character, illustration: { sceneId: 'scene-numbers', alt: '一字主题图' } }
          : character,
      ),
      noShuffle,
    );
    const matchingCard = deck.find((card) => card.id === `${characters[0].id}:pinyin`);

    expect(matchingCard).toMatchObject({
      pairId: characters[0].id,
      characterId: characters[0].id,
      face: 'pinyin',
      label: characters[0].pinyin,
    });
  });

  it('does not include visually identical pinyin cards in one deck', () => {
    const deck = createMemoryDeck(
      characters.map((character, index) =>
        index === 1 ? { ...character, pinyin: characters[0].pinyin } : character,
      ),
      noShuffle,
    );
    const pinyinLabels = deck.filter((card) => card.face === 'pinyin').map((card) => card.label);

    expect(new Set(pinyinLabels).size).toBe(6);
  });

  it('locks a mismatch until the 700ms conceal transition', () => {
    const deck = createMemoryDeck(characters, noShuffle);
    const first = selectMemoryCard(deck, createMemoryState(), deck[0].id);
    const differentPair = deck.find((card) => card.pairId !== deck[0].pairId)!;
    const mismatch = selectMemoryCard(deck, first.state, differentPair.id);

    expect(MEMORY_MISMATCH_DELAY_MS).toBe(700);
    expect(mismatch.resolution?.correct).toBe(false);
    expect(mismatch.state.locked).toBe(true);
    expect(concealMemoryMismatch(mismatch.state).openIds).toEqual([]);
  });
});

describe('listen game', () => {
  it('creates six questions with four unique options and one correct answer', () => {
    const questions = createListenQuestions(characters, noShuffle);

    expect(questions).toHaveLength(6);
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
      expect(
        question.options.filter((option) => option.id === question.correctOptionId),
      ).toHaveLength(1);
      expect(evaluateListenAnswer(question, question.correctOptionId, 0).kind).toBe(
        'correct',
      );
    }
  });

  it('retries gently once, then reveals the correct option', () => {
    const question = createListenQuestions(characters, noShuffle)[0];
    const wrong = question.options.find(
      (option) => option.id !== question.correctOptionId,
    )!;

    expect(evaluateListenAnswer(question, wrong.id, 0)).toEqual({
      kind: 'retry',
      correct: false,
      shouldAdvance: false,
      highlightOptionId: null,
    });
    expect(evaluateListenAnswer(question, wrong.id, 1)).toEqual({
      kind: 'reveal',
      correct: false,
      shouldAdvance: true,
      highlightOptionId: question.correctOptionId,
    });
  });
});

describe('word drag game', () => {
  it('creates four two-character rounds and judges placements', () => {
    const rounds = createWordDragRounds(characters, noShuffle);
    expect(rounds).toHaveLength(4);
    expect(rounds.every((round) => [...round.word].length === 2)).toBe(true);

    const round = rounds[0];
    const result = placeWordTile(round, [null, null], 0, round.tiles[0].correctSlot);
    expect(result.correct).toBe(true);
    expect(result.placements[round.tiles[0].correctSlot]).toBe(round.tiles[0].id);

    const wrongSlot = round.tiles[0].correctSlot === 0 ? 1 : 0;
    expect(placeWordTile(round, [null, null], 0, wrongSlot).correct).toBe(false);
  });
});

describe('challenge game', () => {
  it('creates ten mixed questions with unique options and pure answer scoring', () => {
    const questions = createChallengeQuestions(characters, noShuffle);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.kind)).size).toBe(3);
    for (const question of questions) {
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
      expect(evaluateChallengeAnswer(question, question.correctOptionId)).toBe(true);
    }
  });

  it('passes at seven of ten and fails below the threshold or after timeout', () => {
    expect(CHALLENGE_DURATION_SECONDS).toBe(75);
    expect(CHALLENGE_PASS_SCORE).toBe(7);
    expect(settleChallenge(7, 10, 1)).toEqual({ passed: true, score: 7, timedOut: false });
    expect(settleChallenge(6, 10, 1)).toEqual({ passed: false, score: 6, timedOut: false });
    expect(settleChallenge(9, 9, 0)).toEqual({ passed: true, score: 9, timedOut: true });
  });
});

describe('game pool guards', () => {
  it('refuses listen and memory decks when fewer than six characters remain', () => {
    expect(() => createListenQuestions(characters.slice(0, 5), noShuffle)).toThrow('听音选字需要至少 6 个不同汉字');
    expect(() => createMemoryDeck(characters.slice(0, 5), noShuffle)).toThrow('记忆游戏需要 6 个读音不同的汉字');
  });

  it('refuses word-drag and challenge when the remaining pool is too small', () => {
    expect(() => createWordDragRounds(characters.slice(0, 3), noShuffle)).toThrow('拖字成词需要 4 个不同的双字词');
    expect(() => createChallengeQuestions(characters.slice(0, 9), noShuffle)).toThrow('限时挑战需要至少 10 个有词例的不同汉字');
  });
});
