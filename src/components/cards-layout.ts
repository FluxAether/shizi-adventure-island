export type CardsLayoutMode = 'regular' | 'compact' | 'tiny';

export function getCardsLayoutMode(width: number, height: number): CardsLayoutMode {
  if (width > height || width >= 768 || height >= 1000) return 'regular';
  return height < 700 ? 'tiny' : 'compact';
}
