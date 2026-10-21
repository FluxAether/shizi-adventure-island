import { getCharacterIllustrationSpec } from '@/components/character-illustration';
import { CHARACTERS, getCharacterImageSource, hasCharacterImage } from '@/content';

function characterFor(hanzi: string) {
  const character = CHARACTERS.find((entry) => entry.hanzi === hanzi);
  if (!character) throw new Error(`Missing test character: ${hanzi}`);
  return character;
}

function specFor(hanzi: string) {
  return getCharacterIllustrationSpec(characterFor(hanzi));
}

describe('character illustrations', () => {
  it('reads illustration identity from content for all 800 characters', () => {
    const specs = CHARACTERS.map(getCharacterIllustrationSpec);
    const keys = new Set(specs.map((spec) => spec.key));

    expect(specs).toHaveLength(800);
    expect(keys.size).toBe(800);
    expect(
      CHARACTERS.every((entry, index) => {
        const spec = specs[index];
        return (
          spec.motif === entry.illustration.motif &&
          spec.variant === entry.illustration.variant &&
          spec.word === (entry.illustration.caption || entry.hanzi) &&
          typeof entry.illustration.caption === 'string' &&
          Boolean(entry.illustration.motif) &&
          Boolean(entry.illustration.variant) &&
          Boolean(entry.illustration.sceneId) &&
          !entry.illustration.alt.includes('、') &&
          /[一-鿿]/.test(entry.theme)
        );
      }),
    ).toBe(true);
  });

  it('uses concrete motifs for common pictographic characters', () => {
    expect(specFor('火')).toMatchObject({ motif: 'fire', variant: 'fire', word: '火苗' });
    expect(specFor('日')).toMatchObject({ motif: 'sun', variant: 'sun', word: '太阳' });
    expect(specFor('月')).toMatchObject({ motif: 'moon', variant: 'moon', word: '月亮' });
    expect(specFor('鱼')).toMatchObject({ motif: 'fish', variant: 'fish', word: '小鱼' });
    expect(specFor('鸟')).toMatchObject({ motif: 'bird', variant: 'bird', word: '小鸟' });
    expect(specFor('手')).toMatchObject({ motif: 'body', variant: 'hand', word: '小手' });
    expect(specFor('车')).toMatchObject({ motif: 'transport', variant: 'car', word: '小车' });
    expect(specFor('爱')).toMatchObject({ motif: 'emotion', variant: 'heart', word: '爱心' });
  });

  it('keeps grade-1-fall pictographs child-drawable', () => {
    const grade1Fall = CHARACTERS.filter((entry) => entry.levelId === 'grade-1-fall');
    expect(grade1Fall).toHaveLength(100);

    const expected = {
      一: { motif: 'number', variant: 'one', caption: '' },
      上: { motif: 'direction', variant: 'up', caption: '上面' },
      口: { motif: 'body', variant: 'mouth', caption: '大口' },
      日: { motif: 'sun', variant: 'sun', caption: '太阳' },
      火: { motif: 'fire', variant: 'fire', caption: '火苗' },
      田: { motif: 'plant', variant: 'field', caption: '田地' },
      子: { motif: 'family', variant: 'child', caption: '孩子' },
      水: { motif: 'water', variant: 'water', caption: '小河' },
      心: { motif: 'emotion', variant: 'heart', caption: '爱心' },
      月: { motif: 'moon', variant: 'moon', caption: '月亮' },
      公: { motif: 'place', variant: 'park', caption: '公园' },
      马: { motif: 'animal', variant: 'horse', caption: '小马' },
      鸟: { motif: 'bird', variant: 'bird', caption: '小鸟' },
      爸: { motif: 'family', variant: 'dad', caption: '爸爸' },
      妈: { motif: 'family', variant: 'mom', caption: '妈妈' },
      白: { motif: 'color', variant: 'white', caption: '白色' },
    } as const;

    for (const [hanzi, illustration] of Object.entries(expected)) {
      expect(characterFor(hanzi).illustration).toMatchObject(illustration);
      expect(characterFor(hanzi).levelId).toBe('grade-1-fall');
    }
  });

  it('hides captions that are empty and keeps remaining captions short', () => {
    const captions = CHARACTERS.map((entry) => entry.illustration.caption).filter(Boolean);
    expect(captions.every((caption) => caption.length >= 2 && caption.length <= 4)).toBe(true);
    expect(characterFor('了').illustration.caption).toBe('');
    expect(characterFor('个').illustration.caption).toBe('');
    expect(specFor('了').word).toBe('了');
  });

  it('provides image asset lookup with safe fallback', () => {
    expect(getCharacterImageSource('non-existent-id')).toBeUndefined();
    expect(hasCharacterImage('non-existent-id')).toBe(false);
  });
});
