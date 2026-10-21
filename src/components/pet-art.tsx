import { Image } from "expo-image";

import { PETS } from "@/content";

type PetImageAsset = {
  key: string;
  source: number;
};

export const PET_IMAGE_ASSETS = {
  "turtle:default": { key: "turtle:default", source: require("../../assets/pets/turtle/default.webp") },
  "turtle:sailor-hat": { key: "turtle:sailor-hat", source: require("../../assets/pets/turtle/sailor-hat.webp") },
  "turtle:star-shell": { key: "turtle:star-shell", source: require("../../assets/pets/turtle/star-shell.webp") },
  "rabbit:default": { key: "rabbit:default", source: require("../../assets/pets/rabbit/default.webp") },
  "rabbit:carrot-pin": { key: "rabbit:carrot-pin", source: require("../../assets/pets/rabbit/carrot-pin.webp") },
  "rabbit:cloud-cape": { key: "rabbit:cloud-cape", source: require("../../assets/pets/rabbit/cloud-cape.webp") },
  "panda:default": { key: "panda:default", source: require("../../assets/pets/panda/default.webp") },
  "panda:bamboo-pack": { key: "panda:bamboo-pack", source: require("../../assets/pets/panda/bamboo-pack.webp") },
  "panda:scholar-hat": { key: "panda:scholar-hat", source: require("../../assets/pets/panda/scholar-hat.webp") },
  "fox:default": { key: "fox:default", source: require("../../assets/pets/fox/default.webp") },
  "fox:leaf-scarf": { key: "fox:leaf-scarf", source: require("../../assets/pets/fox/leaf-scarf.webp") },
  "fox:moon-crown": { key: "fox:moon-crown", source: require("../../assets/pets/fox/moon-crown.webp") },
  "deer:default": { key: "deer:default", source: require("../../assets/pets/deer/default.webp") },
  "deer:flower-wreath": { key: "deer:flower-wreath", source: require("../../assets/pets/deer/flower-wreath.webp") },
  "deer:rainbow-bell": { key: "deer:rainbow-bell", source: require("../../assets/pets/deer/rainbow-bell.webp") },
  "otter:default": { key: "otter:default", source: require("../../assets/pets/otter/default.webp") },
  "otter:shell-bag": { key: "otter:shell-bag", source: require("../../assets/pets/otter/shell-bag.webp") },
  "otter:wave-cape": { key: "otter:wave-cape", source: require("../../assets/pets/otter/wave-cape.webp") },
  "owl:default": { key: "owl:default", source: require("../../assets/pets/owl/default.webp") },
  "owl:round-glasses": { key: "owl:round-glasses", source: require("../../assets/pets/owl/round-glasses.webp") },
  "owl:book-satchel": { key: "owl:book-satchel", source: require("../../assets/pets/owl/book-satchel.webp") },
  "dragon:default": { key: "dragon:default", source: require("../../assets/pets/dragon/default.webp") },
  "dragon:golden-horn": { key: "dragon:golden-horn", source: require("../../assets/pets/dragon/golden-horn.webp") },
  "dragon:galaxy-cape": { key: "dragon:galaxy-cape", source: require("../../assets/pets/dragon/galaxy-cape.webp") },
} as const satisfies Record<string, PetImageAsset>;

type PetImageKey = keyof typeof PET_IMAGE_ASSETS;

function findPetImage(key: string) {
  return Object.hasOwn(PET_IMAGE_ASSETS, key)
    ? PET_IMAGE_ASSETS[key as PetImageKey]
    : undefined;
}

export function resolvePetImage(id: string, outfitId?: string | null) {
  return findPetImage(`${id}:${outfitId ?? "default"}`)
    ?? findPetImage(`${id}:default`)
    ?? PET_IMAGE_ASSETS["turtle:default"];
}

export function PetArt({ id, outfitId, size = 230 }: { id: string; outfitId?: string | null; size?: number }) {
  const asset = resolvePetImage(id, outfitId);
  const definition = PETS.find((pet) => pet.id === id) ?? PETS[0];
  const outfit = definition.outfits.find((item) => item.id === outfitId);
  const accessibilityLabel = outfit && outfit.id !== "default" && asset.key === `${id}:${outfit.id}`
    ? `${definition.name}，${outfit.name}宠物形象`
    : `${definition.name}宠物形象`;

  return (
    <Image
      accessible
      accessibilityLabel={accessibilityLabel}
      contentFit="contain"
      source={asset.source}
      style={{ width: size, height: size }}
      transition={150}
    />
  );
}
