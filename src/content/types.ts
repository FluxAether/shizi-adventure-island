export type Semester = 'fall' | 'spring';

export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly grade: 1 | 2;
  readonly semester: Semester;
  readonly order: number;
  readonly characterCount: number;
}

export interface AdventureLevel {
  readonly id: string;
  readonly island: number;
  readonly level: number;
  readonly order: number;
  readonly title: string;
  readonly characterIds: readonly string[];
}

export interface PetOutfit {
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

export interface PetDefinition {
  readonly id: string;
  readonly name: string;
  readonly unlockIsland: number;
  readonly outfits: readonly [PetOutfit, PetOutfit, PetOutfit];
}

export type AchievementKind = 'characters' | 'stars' | 'games' | 'islands' | 'streak';

export interface AchievementDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly stars: number;
  readonly threshold: number;
  readonly kind: AchievementKind;
}

export interface WordExample {
  readonly word: string;
  readonly pinyin: string;
}

export interface Reading {
  readonly key: string;
  readonly pinyin: string;
  readonly audioId: string;
  readonly words: readonly WordExample[];
}

export type IllustrationMotif =
  | 'number'
  | 'direction'
  | 'person'
  | 'family'
  | 'body'
  | 'sun'
  | 'moon'
  | 'weather'
  | 'water'
  | 'fire'
  | 'mountain'
  | 'plant'
  | 'animal'
  | 'fish'
  | 'bird'
  | 'food'
  | 'school'
  | 'transport'
  | 'place'
  | 'emotion'
  | 'action'
  | 'time'
  | 'color'
  | 'daily';

export interface CharacterIllustration {
  readonly sceneId: string;
  readonly alt: string;
  readonly motif: IllustrationMotif;
  readonly variant: string;
  readonly caption: string;
}

export interface CharacterEntry {
  readonly id: string;
  readonly hanzi: string;
  readonly levelId: string;
  readonly grade: 1 | 2;
  readonly semester: Semester;
  readonly order: number;
  readonly theme: string;
  readonly readings: readonly [Reading, ...Reading[]];
  readonly primaryReadingKey: string;
  readonly illustration: CharacterIllustration;
}

export type CharacterContent = CharacterEntry;
