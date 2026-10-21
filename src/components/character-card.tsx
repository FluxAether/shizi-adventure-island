import { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AudioButton } from '@/components/audio-button';
import { getCardsLayoutMode } from '@/components/cards-layout';
import { CharacterIllustration } from '@/components/character-illustration';
import { AppIcon } from '@/components/app-icon';
import type { CharacterContent } from '@/content/models';
import { colors, fonts, motion, radii } from '@/theme/tokens';

type Props = {
  character: CharacterContent;
  favorited: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFavorite: () => void;
  onSpeak: (audioId?: string) => void;
};

export function CharacterCard({ character, favorited, onPrevious, onNext, onFavorite, onSpeak }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const layoutMode = getCardsLayoutMode(width, height);
  const compact = layoutMode !== 'regular';
  const tiny = layoutMode === 'tiny';
  const flip = useSharedValue(0);
  const translateX = useSharedValue(0);
  const speechScale = useSharedValue(1);
  const [readingOverride, setReadingOverride] = useState<{ id: string; key: string } | null>(null);
  const readingKey = readingOverride?.id === character.id ? readingOverride.key : character.primaryReadingKey;
  const primary = character.readings.find((reading) => reading.key === readingKey) ?? character.readings[0];
  const boxedHanzi = [...character.hanzi].length === 1 && '一二三十'.includes(character.hanzi);

  useEffect(() => {
    flip.value = 0;
    translateX.value = 0;
    speechScale.value = 1;
  }, [character.id, flip, translateX, speechScale]);

  const triggerSpeechAnimation = () => {
    speechScale.value = withSequence(
      withSpring(1.08, { damping: 10, stiffness: 220 }),
      withSpring(0.96, { damping: 10, stiffness: 220 }),
      withSpring(1, { damping: 12, stiffness: 180 }),
    );
  };

  const handleSpeak = (audioId?: string) => {
    triggerSpeechAnimation();
    onSpeak(audioId);
  };

  const tap = Gesture.Tap().runOnJS(true).onEnd(() => {
    flip.value = withTiming(flip.value > 0.5 ? 0 : 1, { duration: 300 });
  });
  const longPress = Gesture.LongPress().minDuration(450).runOnJS(true).onEnd((_event, success) => {
    if (success) onFavorite();
  });
  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-18, 18])
    .runOnJS(true)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -70 || event.velocityX < -650) onNext();
      else if (event.translationX > 70 || event.velocityX > 650) onPrevious();
      translateX.value = withSpring(0, motion);
    });
  const gesture = Gesture.Race(longPress, pan, tap);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotateZ: `${translateX.value / 1200}rad` }],
    opacity: interpolate(Math.abs(translateX.value), [0, 220], [1, 0.55]),
  }));
  const speechStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speechScale.value }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    display: flip.value < 0.5 ? 'flex' : 'none',
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    display: flip.value >= 0.5 ? 'flex' : 'none',
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [-180, 0])}deg` }],
  }));

  const face = {
    position: 'absolute' as const,
    inset: 0,
   borderRadius: radii.hero,
   borderCurve: 'continuous' as const,
   alignItems: 'center' as const,
   justifyContent: 'center' as const,
    padding: tiny ? 8 : compact ? 16 : 20,
   backfaceVisibility: 'hidden' as const,
 };

  return (
    <View style={{ flex: 1, gap: tiny ? 8 : compact ? 12 : 18, alignItems: 'center', justifyContent: 'space-evenly' }}>
      <View style={{ width: '100%', maxWidth: 420, maxHeight: wide ? 420 : 460, flex: 1, justifyContent: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="上一个汉字"
          onPress={onPrevious}
          style={{
            position: 'absolute',
            left: -6,
            zIndex: 2,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 0 #D5DFEA',
          }}
        >
          <AppIcon name="back" color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="下一个汉字"
          onPress={onNext}
          style={{
            position: 'absolute',
            right: -6,
            zIndex: 2,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 0 #D5DFEA',
            transform: [{ scaleX: -1 }],
          }}
        >
          <AppIcon name="back" color={colors.muted} />
        </Pressable>

        <GestureDetector gesture={gesture}>
          <Animated.View
            accessibilityLabel={`汉字${character.hanzi}，点击翻面，左右滑动换字，长按收藏`}
            style={[
              {
                flex: 1,
                borderRadius: radii.hero,
                boxShadow: '0 12px 30px rgba(0,98,159,0.10), 0 6px 0 rgba(0,98,159,0.15)',
                backgroundColor: colors.surface,
              },
              containerStyle,
            ]}
          >
            <Animated.View style={[face, { backgroundColor: colors.surface }, frontStyle]}>
              <Pressable
                accessibilityRole="button"
               accessibilityLabel={favorited ? '取消收藏' : '收藏汉字'}
               onPress={onFavorite}
               hitSlop={12}
                style={{ position: 'absolute', top: tiny ? 12 : 16, right: tiny ? 12 : 16, zIndex: 3 }}
              >
                <AppIcon name="star" size={tiny ? 24 : 28} color={favorited ? colors.yellow : colors.outline} />
              </Pressable>
              <Animated.View
                style={[
                  boxedHanzi
                    ? {
                        minWidth: tiny ? 60 : compact ? 88 : 110,
                        minHeight: tiny ? 60 : compact ? 88 : 110,
                        borderWidth: 3,
                        borderColor: colors.outline,
                        borderRadius: radii.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.canvas,
                      }
                    : undefined,
                  speechStyle,
                ]}
              >
                <Text
                  selectable
                  style={{
                    color: colors.ink,
                    fontFamily: fonts.bodyBold,
                    fontSize: tiny ? 48 : compact ? 76 : wide ? 96 : 108,
                    lineHeight: tiny ? 56 : compact ? 84 : wide ? 104 : 116,
                    marginTop: 0,
                  }}
                >
                  {character.hanzi}
                </Text>
              </Animated.View>
              {character.readings.length > 1 ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: tiny ? 2 : 4 }}>
                  {character.readings.map((reading) => {
                    const selected = reading.key === primary.key;
                    return (
                      <Pressable
                        key={reading.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`读音${reading.pinyin}`}
                        onPress={() => {
                          setReadingOverride({ id: character.id, key: reading.key });
                          handleSpeak(reading.audioId);
                        }}
                        style={{
                          minHeight: tiny ? 28 : 32,
                          paddingHorizontal: 10,
                          borderRadius: radii.pill,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? colors.blueSoft : colors.canvas,
                          borderWidth: 2,
                          borderColor: selected ? colors.blue : colors.outline,
                        }}
                      >
                        <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: tiny ? 13 : 15 }}>{reading.pinyin}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: tiny ? 16 : compact ? 20 : 24, marginTop: tiny ? 2 : 3 }}>{primary.pinyin}</Text>
              )}
              <View style={{ marginTop: tiny ? 6 : compact ? 10 : 14 }}>
                <Animated.View style={speechStyle}>
                  <CharacterIllustration
                    character={character}
                    size={tiny ? 130 : compact ? 180 : wide ? 200 : 220}
                  />
                </Animated.View>
              </View>
              <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: tiny ? 11 : compact ? 12 : 13, marginTop: tiny ? 4 : compact ? 6 : 8 }}>
                点卡片看组词
              </Text>
            </Animated.View>
            <Animated.View style={[face, { backgroundColor: colors.yellowSoft }, backStyle]}>
              <View style={{ alignItems: 'center', gap: tiny ? 6 : compact ? 8 : 12 }}>
                <Text selectable style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: tiny ? 18 : compact ? 22 : 28 }}>
                  {primary.pinyin}{character.readings.length > 1 ? ' · 多音字' : ''}
                </Text>
                <Text selectable style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: tiny ? 36 : compact ? 48 : 64 }}>
                  {character.hanzi}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  {primary.words.map((item) => (
                    <Text
                      key={item.word}
                      selectable
                      style={{
                        color: colors.ink,
                        fontFamily: fonts.bodyBold,
                        fontSize: tiny ? 13 : compact ? 16 : 18,
                        backgroundColor: colors.surface,
                        paddingHorizontal: tiny ? 8 : compact ? 12 : 14,
                        paddingVertical: tiny ? 4 : compact ? 6 : 8,
                        borderRadius: radii.pill,
                      }}
                    >
                      {item.word}
                    </Text>
                  ))}
                </View>
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: tiny ? 12 : 14, textAlign: 'center' }}>
                  再听一次，记住它
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
      <AudioButton onPress={handleSpeak} size={compact ? 'md' : 'lg'} />
    </View>
  );
}


