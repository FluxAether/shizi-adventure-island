import { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { WobbleView } from '@/components/animated';
import type { ChoiceOption } from '@/game-logic/types';
import { fonts, radii, spacing } from '@/theme/tokens';

const SLOT_THEMES = [
  { bg: '#00629F', border: '#004A7A', text: '#FFFFFF' },
  { bg: '#FFB961', border: '#865300', text: '#2B1700' },
  { bg: '#126D27', border: '#005318', text: '#FFFFFF' },
  { bg: '#BA1A1A', border: '#93000A', text: '#FFFFFF' },
];

function ChoiceItem({
  option,
  index,
  disabled,
  highlighted,
  wrong,
  wide,
  onChoose,
}: {
  option: ChoiceOption;
  index: number;
  disabled: boolean;
  highlighted: boolean;
  wrong: boolean;
  wide: boolean;
  onChoose: (id: string) => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (highlighted) {
      scale.value = withSequence(
        withSpring(1.12, { damping: 8, stiffness: 240 }),
        withSpring(1.05, { damping: 10, stiffness: 200 }),
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [highlighted, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const theme = SLOT_THEMES[index % SLOT_THEMES.length];
  const bgColor = highlighted ? '#126D27' : wrong ? '#BA1A1A' : theme.bg;
  const borderColor = highlighted ? '#005318' : wrong ? '#93000A' : theme.border;
  const textColor = highlighted || wrong ? '#FFFFFF' : theme.text;

  return (
    <View style={{ width: '50%', padding: spacing.sm, aspectRatio: 1 }}>
      <WobbleView trigger={wrong} style={{ width: '100%', height: '100%' }}>
        <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel={`选择 ${option.label}`}
          accessibilityState={{ disabled, selected: highlighted }}
          disabled={disabled}
          onPress={() => onChoose(option.id)}
          style={({ pressed }) => ({
            width: '100%',
            height: '100%',
            borderRadius: radii.xl,
            backgroundColor: bgColor,
            borderBottomWidth: pressed ? 3 : 10,
            borderBottomColor: borderColor,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed ? 7 : 0 }],
            opacity: disabled && !highlighted ? 0.35 : 1,
            boxShadow: highlighted ? '0 0 16px rgba(18, 109, 39, 0.4)' : undefined,
          })}
          >
            <Text
              style={{
                color: textColor,
                fontFamily: option.label.length <= 2 ? fonts.display : fonts.bodyBold,
                fontSize: option.label.length <= 2 ? (wide ? 72 : 64) : 24,
                textAlign: 'center',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        </Animated.View>
      </WobbleView>
    </View>
  );
}

export function ChoiceGrid({
  options,
  disabled,
  disabledOptionIds,
  highlightedId,
  wrongId,
  onChoose,
}: {
  options: readonly ChoiceOption[];
  disabled: boolean;
  disabledOptionIds?: readonly string[];
  highlightedId: string | null;
  wrongId?: string | null;
  onChoose: (id: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignSelf: 'center',
        width: '100%',
        maxWidth: wide ? 600 : 480,
      }}
    >
      {options.map((option, index) => (
        <ChoiceItem
          key={option.id}
          option={option}
          index={index}
          disabled={disabled || (disabledOptionIds?.includes(option.id) ?? false)}
          highlighted={option.id === highlightedId}
          wrong={option.id === wrongId}
          wide={wide}
          onChoose={onChoose}
        />
      ))}
    </View>
  );
}
