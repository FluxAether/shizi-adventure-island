import { getCardsLayoutMode } from '../../src/components/cards-layout';

test('uses height-aware card layouts across phone and tablet screens', () => {
  expect(getCardsLayoutMode(320, 568)).toBe('tiny');
  expect(getCardsLayoutMode(390, 844)).toBe('compact');
  expect(getCardsLayoutMode(430, 932)).toBe('compact');
  expect(getCardsLayoutMode(768, 1024)).toBe('regular');
  expect(getCardsLayoutMode(844, 390)).toBe('regular');
});
