import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, fonts, motion, radii } from '@/theme/tokens';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  shadowColor?: string;
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({ title, onPress, color = colors.yellow, shadowColor = '#D97706', icon, disabled, accessibilityLabel }: Props) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value }],
  }));

  return (
    <View style={{ paddingBottom: 6 }}>
      <View style={{ position: 'absolute', inset: 0, top: 6, borderRadius: radii.xl, backgroundColor: shadowColor }} />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => { pressed.value = withSpring(5, motion); }}
        onPressOut={() => { pressed.value = withSpring(0, motion); }}
        style={[{
          minHeight: 64,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: disabled ? colors.outline : color,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }, animatedStyle]}
      >
        {icon}
        <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 20 }}>{title}</Text>
      </AnimatedPressable>
    </View>
  );
}
