export const GAME_IDS = ["memory", "listen", "word-drag", "challenge"] as const;

export type GameId = (typeof GAME_IDS)[number];
export type StudyActivity = "cards" | GameId;

interface StartStudySessionBase {
  characterId?: string;
  levelId?: string;
}

export type StartStudySessionInput = StartStudySessionBase & (
  | { activity: StudyActivity; gameId?: GameId }
  | { activity?: undefined; gameId: GameId }
);

export interface RecordAnswerInput extends StartStudySessionBase {
  gameId: GameId;
  sessionId: string;
  questionKey: string;
  correct: boolean;
  answeredAt?: number;
  rewardStars?: number;
}

export interface RecordCardResponseInput {
  sessionId: string;
  questionKey: string;
  characterId: string;
  known: boolean;
  answeredAt?: number;
  rewardStars?: number;
}

export interface RecordAnswerResult {
  duplicate: boolean;
  masteryScore: number;
  starsEarned: number;
  totalStars: number;
}

export interface CompleteStudyRoundInput {
  sessionId: string;
  gameId: GameId;
  levelId: string;
  score: number;
  total: number;
  passed: boolean;
  activeMs: number;
}

export interface CompleteStudyRoundResult {
  duplicate: boolean;
  completionStars: number;
  perfectStars: number;
  dailyGoalStars: number;
  starsEarned: number;
  totalStars: number;
}

export interface CompleteCardsRoundInput {
  sessionId: string;
  levelId: string;
  score: number;
  total: number;
  activeMs: number;
}

export interface CompleteCardsRoundResult {
  duplicate: boolean;
  completionStars: number;
  dailyGoalStars: number;
  starsEarned: number;
  totalStars: number;
  /** True when every enabled character in the level has been practiced. */
  levelReadyForChallenge: boolean;
}

export interface ProgressSummary {
  todayLearned: number;
  streakDays: number;
  masteredCount: number;
  familiarCount: number;
  unfamiliarCount: number;
  totalSeen: number;
  unlockedAdventureLevel: number;
  /** How many characters of the current adventure level have been practiced. */
  currentLevelLearned: number;
  /** Character count of the current adventure level (usually 10). */
  currentLevelSize: number;
  activeSeconds: number;
  correctRate: number;
  lifetimeStars: number;
  gameRoundsCompleted: number;
}

export interface RewardSummary {
  stars: number;
  selectedPetId: string;
  reward: {
    lastDailyRewardDate: string | null;
    unlockedAchievementIds: string[];
  };
}

export interface AppSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  musicVolume: number;
  voiceVolume: number;
  effectsVolume: number;
  studyDurationMinutes: number;
}

export interface ClaimDailyRewardInput {
  dateKey: string;
  rewardKey: string;
  stars: number;
}

export interface ClaimRewardResult {
  claimed: boolean;
  totalStars: number;
}

export interface UnlockAchievementInput {
  achievementId: string;
  stars?: number;
  unlockedAt?: number;
}

export interface PetState {
  petId: string;
  name: string;
  stage: number;
  xp: number;
  selected: boolean;
  ownedOutfitIds: string[];
  selectedOutfitId: string | null;
}

export interface BuyOutfitResult {
  purchased: boolean;
  reason: "purchased" | "owned" | "insufficient-stars";
  totalStars: number;
}

export interface FeedPetResult {
  fed: boolean;
  reason: "fed" | "insufficient-stars";
  totalStars: number;
  pet: PetState;
}

export interface AchievementState {
  achievementId: string;
  unlockedAt: number;
  stars: number;
  claimedAt: number | null;
}

export interface ParentReportDay {
  date: string;
  activeSeconds: number;
  attempts: number;
  correctRate: number;
  starsEarned: number;
}

export interface ParentReport {
  days: number;
  activeSeconds: number;
  attempts: number;
  correctRate: number;
  starsEarned: number;
  learnedCharacters: number;
  daily: ParentReportDay[];
}

export interface CharacterProgress {
  characterId: string;
  attempts: number;
  correctCount: number;
  masteryScore: number;
  correctDayCount: number;
  lastCorrectDate: string | null;
  stars: number;
  enabled: boolean;
  favorite: boolean;
}

export interface LevelProgress {
  levelId: string;
  gameId: GameId;
  attempts: number;
  correctCount: number;
  stars: number;
  completedAt: number | null;
}
