import { PET_IMAGE_ASSETS, resolvePetImage } from '@/components/pet-art';
import { PETS } from '@/content';

describe('pet artwork', () => {
  it('has an image for every registered pet outfit', () => {
    const expectedKeys = PETS.flatMap((pet) => pet.outfits.map((outfit) => `${pet.id}:${outfit.id}`)).sort();

    expect(Object.keys(PET_IMAGE_ASSETS).sort()).toEqual(expectedKeys);
  });

  it('loads every mapped bundled image', () => {
    expect(Object.values(PET_IMAGE_ASSETS).every((asset) => asset.source)).toBe(true);
  });

  it('uses the selected outfit image and falls back missing keys to the pet default, then turtle', () => {
    expect(resolvePetImage('rabbit', 'cloud-cape').key).toBe('rabbit:cloud-cape');
    expect(resolvePetImage('rabbit', 'missing-outfit').key).toBe('rabbit:default');
    expect(resolvePetImage('missing', 'missing').key).toBe('turtle:default');
  });
});
