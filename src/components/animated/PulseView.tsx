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
  scaleTo?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}>;

export function PulseView({ scaleTo = 1.04, duration = 1200, style, active = true, children }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(scale);
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(scaleTo, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(scale);
  }, [active, duration, scaleTo, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
