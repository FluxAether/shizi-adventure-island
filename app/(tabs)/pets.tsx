import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { FloatingView, StarBurst } from '@/components/animated';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PetArt } from '@/components/pet-art';
import { RewardOverlay } from '@/components/reward-overlay';
import { PETS } from '@/content';
import {
  buyOutfit,
  feedPet,
  loadPetStates,
  selectPet,
  selectPetOutfit,
  unlockPet,
} from '@/services/progress';
import { PET_FEED_COST_STARS } from '@/services/progress.logic';
import {
  selectProgress,
  selectRewards,
  useAppStore,
} from '@/store/use-app-store';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import type { PetState } from '@/types/progress';

function FloatingPetArt({
  id,
  outfitId,
  size = 160,
  triggerJump = 0,
  onPress,
}: {
  id: string;
  outfitId?: string | null;
  size?: number;
  triggerJump?: number;
  onPress?: () => void;
}) {
  const jumpY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (triggerJump > 0) {
      jumpY.value = withSequence(
        withTiming(-26, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 220, easing: Easing.bounce }),
      );
      rotateZ.value = withSequence(
        withTiming(-10, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
      scale.value = withSequence(
        withSpring(1.15, { damping: 8 }),
        withSpring(1, { damping: 10 }),
      );
    }
  }, [triggerJump, jumpY, rotateZ, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: jumpY.value },
      { rotate: `${rotateZ.value}deg` },
      { scale: scale.value },
    ],
  }));

  const content = (
    <FloatingView distance={-6} duration={1500}>
      <Animated.View style={animatedStyle}>
        <PetArt id={id} outfitId={outfitId} size={size} />
      </Animated.View>
    </FloatingView>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="小精灵互动" onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export default function PetsScreen() {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const progress = useAppStore(selectProgress);
  const rewards = useAppStore(selectRewards);
  const refreshAppState = useAppStore((state) => state.refreshAppState);
  const [pets, setPets] = useState<PetState[]>([]);
  const [selectedId, setSelectedId] = useState(rewards.selectedPetId);
  const [message, setMessage] = useState<{ title: string; body: string; stars?: number; tone?: 'reward' | 'info' | 'pet' } | null>(null);
  const [petJump, setPetJump] = useState(0);
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockedIsland = Math.floor(progress.unlockedAdventureLevel / 10);

  const reload = useCallback(async () => {
    const unlocked = PETS.filter((pet) => pet.unlockIsland <= unlockedIsland);
    for (const pet of unlocked) {
      await unlockPet(pet.id, pet.name).catch(() => undefined);
    }
    const states = await loadPetStates();
    setPets(states);
    const preferred = states.find((pet) => pet.selected)?.petId
      ?? states.find((pet) => pet.petId === rewards.selectedPetId)?.petId
      ?? unlocked[0]?.id
      ?? 'turtle';
    setSelectedId(preferred);
  }, [rewards.selectedPetId, unlockedIsland]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void reload()
        .catch(() => {
          if (!cancelled) {
            setMessage({ title: '精灵们还在路上', body: '请稍后再来看看它们。' });
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const selectedDefinition = useMemo(
    () => PETS.find((pet) => pet.id === selectedId) ?? PETS[0],
    [selectedId],
  );
  const selectedState = pets.find((pet) => pet.petId === selectedId) ?? null;
  const owned = new Set(selectedState?.ownedOutfitIds ?? ['default']);
  const selectedOutfit = selectedState?.selectedOutfitId ?? 'default';
  const happiness = Math.min(100, Math.round((selectedState?.xp ?? 0) % 100));

  return (
    <AppScreen contentStyle={{ paddingBottom: 120, gap: spacing.xl }}>
      {/* Page Title & Subtitle */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 34 }}>我的小精灵</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16 }}>
          点击小精灵查看它的状态吧！
        </Text>
      </View>

      {/* Selected Pet Bento Card */}
      <View
        style={{
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          padding: spacing.xl,
          borderBottomWidth: 8,
          borderBottomColor: '#E0E2E9',
          boxShadow: '0 12px 30px rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden',
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.blueSoft,
            opacity: 0.6,
          }}
        />

        <View style={{ flexDirection: wide ? 'row' : 'column', gap: spacing.lg, alignItems: 'center' }}>
          {/* Featured Pet Image Frame */}
          <View
            style={{
              width: wide ? 220 : '100%',
              height: wide ? 200 : 180,
              borderRadius: radii.lg,
              backgroundColor: '#FFDDB9',
              borderWidth: 4,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.md,
              position: 'relative',
            }}
          >
            {speech ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  backgroundColor: colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  borderWidth: 2,
                  borderColor: colors.outline,
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 }}>
                  {speech}
                </Text>
              </View>
            ) : null}
            <StarBurst trigger={petJump} />
            <FloatingPetArt
              id={selectedDefinition.id}
              outfitId={selectedOutfit}
              size={wide ? 170 : 160}
              triggerJump={petJump}
              onPress={() => {
                setPetJump((v) => v + 1);
                const lines = [
                  `${selectedDefinition.name}好喜欢你！`,
                  '今天我们学了好多字！',
                  '摸摸头，真舒服～',
                  '我们一起去闯下一座岛吧！',
                ];
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                setSpeech(randomLine);
                if (speechTimer.current) clearTimeout(speechTimer.current);
                speechTimer.current = setTimeout(() => setSpeech(null), 2500);
              }}
            />
          </View>

          {/* Pet Info & Actions */}
          <View style={{ flex: 1, width: '100%', gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28 }}>
                  {selectedDefinition.name}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: colors.blueSoft,
                    borderRadius: radii.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 13 }}>
                    等级 {selectedState?.stage ?? 1} 伙伴
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.greenSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="heart" color={colors.greenDeep} />
              </View>
            </View>

            {/* Happiness Progress Bar */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 14 }}>心情值</Text>
                <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 14 }}>{happiness}%</Text>
              </View>
              <View
                style={{
                  height: 16,
                  borderRadius: radii.pill,
                  backgroundColor: '#E0E2E9',
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#E5E8EF',
                }}
              >
                <View
                  style={{
                    width: `${Math.max(8, happiness)}%`,
                    height: '100%',
                    backgroundColor: colors.green,
                    borderRadius: radii.pill,
                  }}
                />
              </View>
            </View>

            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              {selectedDefinition.name}最喜欢和你一起探索识字岛啦！继续练习，让它更开心吧！
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`喂食${selectedDefinition.name}`}
                onPress={() => {
                  void feedPet(selectedDefinition.id, 12)
                    .then(async (result) => {
                      await refreshAppState();
                      await reload();
                      setMessage(
                        result.fed
                          ? { title: '吃得好香！', body: `${selectedDefinition.name}更开心了，用掉 ${PET_FEED_COST_STARS} 颗星星。`, tone: 'pet' }
                          : { title: '星星还不够', body: `喂食需要 ${PET_FEED_COST_STARS} 颗星星。` },
                      );
                      if (result.fed) {
                        setPetJump((v) => v + 1);
                        setSpeech('谢谢小主人，好饱呀！');
                        if (speechTimer.current) clearTimeout(speechTimer.current);
                        speechTimer.current = setTimeout(() => setSpeech(null), 2500);
                      }
                    })
                    .catch(() => setMessage({ title: '喂食失败了', body: '再试一次吧～' }));
                }}
                style={({ pressed }) => ({
                  minHeight: 52,
                  paddingHorizontal: 20,
                  borderRadius: radii.pill,
                  backgroundColor: colors.greenDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: pressed ? '0 2px 0 #002105' : '0 6px 0 #002105',
                  transform: [{ translateY: pressed ? 4 : 0 }],
                })}
              >
                <Text style={{ color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 16 }}>
                  喂食 {PET_FEED_COST_STARS}★
                </Text>
              </Pressable>

              <View
                style={{
                  minHeight: 52,
                  paddingHorizontal: 16,
                  borderRadius: radii.pill,
                  backgroundColor: colors.yellowSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  borderWidth: 2,
                  borderColor: colors.yellow,
                }}
              >
                <AppIcon name="star" color={colors.orange} size={22} />
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 17 }}>{rewards.stars}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Wooden Shelf Collection */}
      <View style={{ gap: 12, marginTop: spacing.sm }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 24 }}>伙伴货架</Text>
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 0 }}>
            {PETS.filter((pet) => pet.unlockIsland <= unlockedIsland || pet.unlockIsland === unlockedIsland + 1).map((pet) => {
              const unlocked = pet.unlockIsland <= unlockedIsland;
              const active = pet.id === selectedId;
              const shelfOutfit = pets.find((state) => state.petId === pet.id)?.selectedOutfitId ?? 'default';
              return (
                <Pressable
                  key={pet.id}
                  accessibilityRole="button"
                  accessibilityLabel={unlocked ? `选择${pet.name}` : `${pet.name}尚未解锁`}
                  disabled={!unlocked}
                  onPress={() => {
                    setSelectedId(pet.id);
                    void selectPet(pet.id).then(refreshAppState).then(reload).catch(() => undefined);
                  }}
                  style={({ pressed }) => ({
                    width: wide ? '23%' : '30%',
                    minHeight: 130,
                    borderRadius: radii.xl,
                    padding: 10,
                    backgroundColor: unlocked
                      ? active
                        ? '#FFDDB9'
                        : colors.surface
                      : 'rgba(248, 249, 255, 0.75)',
                    borderWidth: active ? 4 : unlocked ? 0 : 2,
                    borderStyle: unlocked ? 'solid' : 'dashed',
                    borderColor: active ? colors.orange : colors.outline,
                    boxShadow: active
                      ? pressed ? '0 3px 0 #E89409' : '0 8px 0 #E89409'
                      : pressed ? '0 3px 0 #BFC7D3' : '0 8px 0 #BFC7D3',
                    transform: [{ translateY: pressed ? 4 : 0 }],
                    opacity: unlocked ? 1 : 0.65,
                    gap: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  {unlocked ? (
                    <FloatingPetArt id={pet.id} outfitId={shelfOutfit} size={56} />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#E0E2E9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppIcon name="lock" color={colors.muted} size={24} />
                    </View>
                  )}
                  <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' }}>
                    {pet.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' }}>
                    {unlocked ? (active ? '当前伙伴' : `第 ${pet.unlockIsland + 1} 岛`) : '下一座岛见'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Star Shop Outfits */}
      <View style={{ gap: 12, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="star" color={colors.orange} size={24} />
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 24 }}>星星商店</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {selectedDefinition.outfits.map((outfit) => {
            const isOwned = owned.has(outfit.id) || outfit.price === 0;
            const isSelected = selectedOutfit === outfit.id;
            return (
              <Pressable
                key={outfit.id}
                accessibilityRole="button"
                accessibilityLabel={isOwned ? `穿上${outfit.name}` : `购买${outfit.name}`}
                onPress={() => {
                  if (isOwned) {
                    void selectPetOutfit(selectedDefinition.id, outfit.id)
                      .then(reload)
                      .catch(() => setMessage({ title: '换装失败了', body: '再试一次吧～' }));
                    return;
                  }
                  void buyOutfit(selectedDefinition.id, outfit.id, outfit.price)
                    .then(async (result) => {
                      await refreshAppState();
                      await reload();
                      if (result.purchased) {
                        await selectPetOutfit(selectedDefinition.id, outfit.id);
                        await reload();
                        setMessage({ title: '换装成功！', body: `${selectedDefinition.name}穿上了${outfit.name}。` });
                      } else if (result.reason === 'insufficient-stars') {
                        setMessage({ title: '星星还不够', body: `${outfit.name}需要 ${outfit.price} 颗星星。` });
                      }
                    })
                    .catch(() => setMessage({ title: '购买失败了', body: '再试一次吧～' }));
                }}
                style={({ pressed }) => ({
                  width: wide ? '31%' : '47%',
                  minHeight: 148,
                  borderRadius: radii.xl,
                  padding: 14,
                  backgroundColor: isSelected ? colors.greenSoft : colors.surface,
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: colors.green,
                  justifyContent: 'space-between',
                  boxShadow: pressed ? '0 2px 0 #D5DFEA' : '0 6px 0 #D5DFEA',
                  transform: [{ translateY: pressed ? 3 : 0 }],
                })}
              >
                <PetArt id={selectedDefinition.id} outfitId={outfit.id} size={72} />
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>{outfit.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: isSelected ? colors.greenDeep : colors.muted, fontFamily: fonts.bodyBold, fontSize: 13 }}>
                    {isOwned ? (isSelected ? '穿着中' : '已拥有') : `${outfit.price} 星星`}
                  </Text>
                  {!isOwned ? <AppIcon name="star" color={colors.orange} size={18} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <RewardOverlay
        visible={message !== null}
        title={message?.title ?? ''}
        message={message?.body ?? ''}
        stars={message?.stars}
        tone={message?.tone ?? (message?.stars ? 'reward' : 'info')}
        onDismiss={() => setMessage(null)}
      />
    </AppScreen>
  );
}
