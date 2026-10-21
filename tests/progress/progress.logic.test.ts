import {
  applyAttemptProgress,
  applyCardReviewProgress,
  buildCardsRound,
  calculatePetFeed,
  calculateCardsRoundRewards,
  calculateRoundRewards,
  calculateNextMastery,
  idempotentReward,
  isAdventureLevelFullyPracticed,
  PET_FEED_COST_STARS,
} from "../../src/services/progress.logic";

describe("progress logic", () => {
  test("mastery moves within the 0-5 range", () => {
    expect(calculateNextMastery(3, true)).toBe(4);
    expect(calculateNextMastery(5, true)).toBe(5);
    expect(calculateNextMastery(0, false)).toBe(0);
  });

  test("a duplicate attempt cannot change mastery or grant stars", () => {
    const current = {
      attempts: 2,
      correctCount: 1,
      masteryScore: 2,
      correctDayCount: 1,
      lastCorrectDate: "2026-07-26",
      totalStars: 8,
    };

    expect(
      applyAttemptProgress(
        current,
        { correct: true, rewardStars: 3, answeredDate: "2026-07-27" },
        true,
      ),
    ).toEqual({ ...current, starsEarned: 0 });
    expect(idempotentReward(5, true)).toBe(0);
  });

  test("counts a correct day only once", () => {
    const current = {
      attempts: 1,
      correctCount: 1,
      masteryScore: 1,
      correctDayCount: 1,
      lastCorrectDate: "2026-07-27",
      totalStars: 1,
    };
    const updated = applyAttemptProgress(
      current,
      { correct: true, answeredDate: "2026-07-27" },
      false,
    );
    expect(updated.correctDayCount).toBe(1);
    expect(updated.masteryScore).toBe(2);
  });

  test("再看看只计一次已见，不处罚掌握度或奖励", () => {
    const current = {
      attempts: 3,
      correctCount: 2,
      masteryScore: 3,
      correctDayCount: 2,
      lastCorrectDate: "2026-07-27",
      totalStars: 12,
    };
    expect(applyCardReviewProgress(current)).toEqual({
      ...current,
      attempts: 4,
      starsEarned: 0,
    });
  });

  test("pet feeding charges ten stars once and rejects invalid XP", () => {
    expect(calculatePetFeed(PET_FEED_COST_STARS - 1, 20, 1, 5)).toEqual({
      fed: false,
      totalStars: 9,
      xp: 20,
      stage: 1,
    });
    expect(calculatePetFeed(25, 98, 1, 5)).toEqual({
      fed: true,
      totalStars: 15,
      xp: 103,
      stage: 2,
    });
    expect(() => calculatePetFeed(25, 0, 1, -1)).toThrow("xpGain must be positive");
  });

  test("round rewards are perfect/daily-goal aware and idempotent", () => {
    expect(
      calculateRoundRewards({
        score: 10,
        total: 10,
        newCharactersToday: 8,
        dailyGoalAlreadyClaimed: false,
        roundAlreadyCompleted: false,
      }),
    ).toEqual({ completionStars: 2, perfectStars: 3, dailyGoalStars: 10, starsEarned: 15 });
    expect(
      calculateRoundRewards({
        score: 10,
        total: 10,
        newCharactersToday: 8,
        dailyGoalAlreadyClaimed: false,
        roundAlreadyCompleted: true,
      }).starsEarned,
    ).toBe(0);
  });
});

  test("cards round awards completion and daily goal only when completed", () => {
    expect(
      calculateCardsRoundRewards({
        completed: true,
        newCharactersToday: 8,
        dailyGoalAlreadyClaimed: false,
        roundAlreadyCompleted: false,
      }),
    ).toEqual({ completionStars: 2, dailyGoalStars: 10, starsEarned: 12 });
    expect(
      calculateCardsRoundRewards({
        completed: false,
        newCharactersToday: 8,
        dailyGoalAlreadyClaimed: false,
        roundAlreadyCompleted: false,
      }).starsEarned,
    ).toBe(0);
  });

  test("cards round prefers unique unseen characters instead of padding early", () => {
    const characters = Array.from({ length: 10 }, (_, index) => ({
      id: `hanzi-${String(index + 1).padStart(4, "0")}`,
    }));
    const round = buildCardsRound(characters, []);
    expect(round.map((item) => item.id)).toEqual([
      "hanzi-0001",
      "hanzi-0002",
      "hanzi-0003",
      "hanzi-0004",
      "hanzi-0005",
      "hanzi-0006",
      "hanzi-0007",
      "hanzi-0008",
    ]);
    expect(new Set(round.map((item) => item.id)).size).toBe(8);
  });

  test("cards round deprioritizes characters from the previous completed round", () => {
    const characters = Array.from({ length: 10 }, (_, index) => ({
      id: `hanzi-${String(index + 1).padStart(4, "0")}`,
    }));
    const previousRound = [
      "hanzi-0001",
      "hanzi-0002",
      "hanzi-0003",
      "hanzi-0004",
      "hanzi-0005",
      "hanzi-0006",
      "hanzi-0007",
      "hanzi-0008",
    ];
    const progress = previousRound.map((characterId) => ({
      characterId,
      attempts: 1,
      masteryScore: 1,
      correctDayCount: 1,
    }));
    const round = buildCardsRound(characters, progress, { excludeIds: previousRound });
    expect(round.map((item) => item.id).slice(0, 2)).toEqual(["hanzi-0009", "hanzi-0010"]);
    expect(round.some((item) => item.id === "hanzi-0009")).toBe(true);
    expect(round.some((item) => item.id === "hanzi-0010")).toBe(true);
    // With only 10 characters in a level, some review overlap is expected after the new ones.
    expect(new Set(round.map((item) => item.id)).size).toBe(8);
  });

  test("cards round skips disabled characters", () => {
    const characters = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ];
    const round = buildCardsRound(
      characters,
      [{ characterId: "a", attempts: 0, masteryScore: 0, correctDayCount: 0, enabled: false }],
      { size: 2 },
    );
    expect(round.map((item) => item.id)).toEqual(["b", "c"]);
  });

  test("adventure level is complete only after every character was practiced", () => {
    const levelIds = ["a", "b", "c"];
    expect(
      isAdventureLevelFullyPracticed(levelIds, [
        { characterId: "a", attempts: 1 },
        { characterId: "b", attempts: 2 },
      ]),
    ).toBe(false);
    expect(
      isAdventureLevelFullyPracticed(levelIds, [
        { characterId: "a", attempts: 1 },
        { characterId: "b", attempts: 1 },
        { characterId: "c", attempts: 1 },
      ]),
    ).toBe(true);
    expect(isAdventureLevelFullyPracticed([], [{ characterId: "a", attempts: 1 }])).toBe(false);
  });

  test("disabled characters do not block adventure level completion", () => {
    const levelIds = ["a", "b", "c"];
    expect(
      isAdventureLevelFullyPracticed(levelIds, [
        { characterId: "a", attempts: 1, enabled: true },
        { characterId: "b", attempts: 1, enabled: true },
        { characterId: "c", attempts: 0, enabled: false },
      ]),
    ).toBe(true);
    expect(
      isAdventureLevelFullyPracticed(levelIds, [
        { characterId: "a", attempts: 1, enabled: true },
        { characterId: "c", attempts: 0, enabled: false },
      ]),
    ).toBe(false);
  });

