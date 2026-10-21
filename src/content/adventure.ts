import { ADVENTURE_LEVELS, CHARACTERS, type AdventureLevel, type CharacterEntry } from '@/content';

export function adventureLevelId(index: number): string {
  const safe = Math.max(0, Math.min(79, Math.floor(index)));
  return `adventure-${String(safe + 1).padStart(2, '0')}`;
}

export function adventureLevelIndex(levelId: string | null | undefined): number | null {
  const match = /^adventure-(\d+)$/.exec(levelId ?? '');
  if (!match) return null;
  const order = Number(match[1]);
  if (!Number.isInteger(order) || order < 1 || order > 80) return null;
  return order - 1;
}

export function getAdventureLevel(index: number): AdventureLevel {
  return ADVENTURE_LEVELS[Math.max(0, Math.min(79, index))];
}

export function charactersForAdventureLevel(index: number): CharacterEntry[] {
  const level = getAdventureLevel(index);
  const byId = new Map<string, CharacterEntry>(
    CHARACTERS.map((entry) => [entry.id, entry as CharacterEntry]),
  );
  return level.characterIds
    .map((id) => byId.get(id))
    .filter((entry): entry is CharacterEntry => entry !== undefined);
}
