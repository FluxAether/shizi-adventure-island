export interface AttemptProgressValues {
  attempts: number;
  correctCount: number;
  masteryScore: number;
  correctDayCount: number;
  lastCorrectDate: string | null;
  totalStars: number;
}

export interface AttemptProgressUpdate extends AttemptProgressValues {
  starsEarned: number;
}

export const PET_FEED_COST_STARS = 10;
export const ROUND_COMPLETION_STARS = 2;
export const PERFECT_ROUND_STARS = 3;
export const DAILY_GOAL_STARS = 10;

export interface PetFeedCalculation {
  fed: boolean;
  totalStars: number;
  xp: number;
  stage: number;
}

export interface RoundRewardCalculation {
  completionStars: number;
  perfectStars: number;
  dailyGoalStars: number;
  starsEarned: number;
}

export function calculateNextMastery(current: number, correct: boolean): number {
  return Math.max(0, Math.min(5, Math.round(current) + (correct ? 1 : -1)));
}

export function normalizeStars(stars: number | undefined, fallback = 0): number {
  const value = stars ?? fallback;
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function applyAttemptProgress(
  current: AttemptProgressValues,
  input: { correct: boolean; rewardStars?: number; answeredDate: string },
  duplicate: boolean,
): AttemptProgressUpdate {
  if (duplicate) {
    return { ...current, starsEarned: 0 };
  }

  const starsEarned = input.correct ? normalizeStars(input.rewardStars, 1) : 0;
  const isNewCorrectDay =
    input.correct && current.lastCorrectDate !== input.answeredDate;

  return {
    attempts: current.attempts + 1,
    correctCount: current.correctCount + (input.correct ? 1 : 0),
    masteryScore: calculateNextMastery(current.masteryScore, input.correct),
    correctDayCount: current.correctDayCount + (isNewCorrectDay ? 1 : 0),
    lastCorrectDate: input.correct ? input.answeredDate : current.lastCorrectDate,
    totalStars: current.totalStars + starsEarned,
    starsEarned,
  };
}

export function applyCardReviewProgress(
  current: AttemptProgressValues,
): AttemptProgressUpdate {
  return {
    ...current,
    attempts: current.attempts + 1,
    starsEarned: 0,
  };
}

export function idempotentReward(stars: number, alreadyClaimed: boolean): number {
  return alreadyClaimed ? 0 : normalizeStars(stars);
}

export function calculatePetFeed(
  totalStars: number,
  currentXp: number,
  currentStage: number,
  xpGain: number,
): PetFeedCalculation {
  if (!Number.isFinite(xpGain) || xpGain <= 0) {
    throw new Error("xpGain must be positive");
  }
  if (totalStars < PET_FEED_COST_STARS) {
    return { fed: false, totalStars, xp: currentXp, stage: currentStage };
  }

  const xp = currentXp + Math.floor(xpGain);
  return {
    fed: true,
    totalStars: totalStars - PET_FEED_COST_STARS,
    xp,
    stage: Math.max(currentStage, 1 + Math.floor(xp / 100)),
  };
}

export function calculateRoundRewards(input: {
  score: number;
  total: number;
  newCharactersToday: number;
  dailyGoalAlreadyClaimed: boolean;
  roundAlreadyCompleted: boolean;
}): RoundRewardCalculation {
  if (input.roundAlreadyCompleted) {
    return { completionStars: 0, perfectStars: 0, dailyGoalStars: 0, starsEarned: 0 };
  }

  const completionStars = ROUND_COMPLETION_STARS;
  const perfectStars = input.total > 0 && input.score === input.total ? PERFECT_ROUND_STARS : 0;
  const dailyGoalStars = input.newCharactersToday >= 8 && !input.dailyGoalAlreadyClaimed
    ? DAILY_GOAL_STARS
    : 0;
  return {
    completionStars,
    perfectStars,
    dailyGoalStars,
    starsEarned: completionStars + perfectStars + dailyGoalStars,
  };
}

export function calculateCardsRoundRewards(input: {
  completed: boolean;
  newCharactersToday: number;
  dailyGoalAlreadyClaimed: boolean;
  roundAlreadyCompleted: boolean;
}): Pick<RoundRewardCalculation, "completionStars" | "dailyGoalStars" | "starsEarned"> {
  if (input.roundAlreadyCompleted || !input.completed) {
    return { completionStars: 0, dailyGoalStars: 0, starsEarned: 0 };
  }

  const completionStars = ROUND_COMPLETION_STARS;
  const dailyGoalStars = input.newCharactersToday >= 8 && !input.dailyGoalAlreadyClaimed
    ? DAILY_GOAL_STARS
    : 0;
  return {
    completionStars,
    dailyGoalStars,
    starsEarned: completionStars + dailyGoalStars,
  };
}

export const CARDS_ROUND_SIZE = 8;
export const ADVENTURE_LEVEL_CHARACTER_COUNT = 10;

/**
 * Characters that still count toward clearing a level.
 * Missing progress rows are treated as enabled (default); explicit enabled=false is skipped
 * so parent-disabled characters cannot soft-lock progression.
 */
export function requiredAdventureLevelCharacterIds(
  levelCharacterIds: readonly string[],
  progress: readonly { characterId: string; enabled?: boolean }[],
): string[] {
  const byId = new Map(progress.map((item) => [item.characterId, item]));
  return levelCharacterIds.filter((id) => byId.get(id)?.enabled !== false);
}

/** A level is ready to clear once every required (enabled) character has been practiced. */
export function isAdventureLevelFullyPracticed(
  levelCharacterIds: readonly string[],
  progress: readonly { characterId: string; attempts: number; enabled?: boolean }[],
): boolean {
  const requiredIds = requiredAdventureLevelCharacterIds(levelCharacterIds, progress);
  if (requiredIds.length === 0) return false;
  const practiced = new Set(
    progress.filter((item) => item.attempts > 0).map((item) => item.characterId),
  );
  return requiredIds.every((id) => practiced.has(id));
}

export interface CardsRoundCharacter {
  id: string;
}

export interface CardsRoundProgress {
  characterId: string;
  attempts: number;
  masteryScore: number;
  correctDayCount: number;
  enabled?: boolean;
}

/**
 * Build a study round of unique cards when possible.
 * Prefers never-studied characters, then lowest mastery, and deprioritizes
 * characters from the previous completed round so re-entry feels fresh.
 */
export function buildCardsRound<T extends CardsRoundCharacter>(
  characters: readonly T[],
  progress: readonly CardsRoundProgress[],
  options?: { excludeIds?: readonly string[]; size?: number },
): T[] {
  const size = options?.size ?? CARDS_ROUND_SIZE;
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("size must be a positive integer");
  }

  const byId = new Map(progress.map((item) => [item.characterId, item]));
  const exclude = new Set(options?.excludeIds ?? []);
  const eligible = characters.filter((item) => byId.get(item.id)?.enabled !== false);
  if (eligible.length === 0) return [];

  const ranked = [...eligible].sort((left, right) => {
    const leftProgress = byId.get(left.id);
    const rightProgress = byId.get(right.id);
    const leftExcluded = exclude.has(left.id) ? 1 : 0;
    const rightExcluded = exclude.has(right.id) ? 1 : 0;
    if (leftExcluded !== rightExcluded) return leftExcluded - rightExcluded;

    const leftFresh = !leftProgress || leftProgress.attempts === 0 ? 0 : 1;
    const rightFresh = !rightProgress || rightProgress.attempts === 0 ? 0 : 1;
    if (leftFresh !== rightFresh) return leftFresh - rightFresh;

    const leftMastery = leftProgress?.masteryScore ?? 0;
    const rightMastery = rightProgress?.masteryScore ?? 0;
    if (leftMastery !== rightMastery) return leftMastery - rightMastery;

    const leftDays = leftProgress?.correctDayCount ?? 0;
    const rightDays = rightProgress?.correctDayCount ?? 0;
    if (leftDays !== rightDays) return leftDays - rightDays;

    return left.id.localeCompare(right.id);
  });

  // Prefer unique characters; only pad with repeats when the level pool is smaller than size.
  const unique = ranked.slice(0, Math.min(size, ranked.length));
  const round = [...unique];
  for (let index = 0; round.length < size && unique.length > 0; index += 1) {
    round.push(unique[index % unique.length]);
  }
  return round;
}

