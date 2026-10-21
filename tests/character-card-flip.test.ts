test('removes the inactive flashcard face from the Android draw tree', () => {
  const { readFileSync } = jest.requireActual('fs');
  const source = readFileSync('src/components/character-card.tsx', 'utf8');

  expect(source).toContain("display: flip.value < 0.5 ? 'flex' : 'none'");
  expect(source).toContain("display: flip.value >= 0.5 ? 'flex' : 'none'");
});
