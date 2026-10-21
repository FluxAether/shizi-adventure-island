import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = PropsWithChildren<{
  axis?: 'x' | 'y';
  distance?: number;
  duration?: number;
  symmetric?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function FloatingView({
  axis = 'y',
  distance = -8,
  duration = 1800,
  symmetric = false,
  style,
  children,
}: Props) {
  const offset = useSharedValue(0);

  useEffect(() => {
    const steps = symmetric
      ? [
          withTiming(distance, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-distance, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
        ]
      : [
          withTiming(distance, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
        ];
    offset.value = withRepeat(withSequence(...steps), -1, true);
    return () => cancelAnimation(offset);
  }, [distance, duration, offset, symmetric]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [axis === 'x' ? { translateX: offset.value } : { translateY: offset.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
