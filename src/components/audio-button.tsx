import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppIcon } from "@/components/app-icon";
import { colors } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AudioButton({
  onPress,
  label = "播放汉字发音",
  size = "md",
}: {
  onPress: () => void;
  label?: string;
  size?: "md" | "lg";
}) {
  const scale = useSharedValue(1);
  const bounceY = useSharedValue(0);
  const wave = useSharedValue(0);
  const isLg = size === "lg";
  const dimension = isLg ? 128 : 64;
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (isLg) {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      wave.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    }
  }, [isLg, bounceY, wave]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave.value, [0, 1], [1, 1.35]) }],
    opacity: interpolate(wave.value, [0, 1], [0.4, 0]),
  }));

  if (isLg) {
    return (
      <Animated.View
        style={[
          bounceStyle,
          {
            width: dimension + 32,
            height: dimension + 32,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          },
        ]}
      >
        {/* Sound wave ripple outer ring */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: dimension + 24,
              height: dimension + 24,
              borderRadius: (dimension + 24) / 2,
              borderWidth: 4,
              borderColor: "#E89409",
            },
            waveStyle,
          ]}
        />
        {/* Halo outer rings */}
        <View
          style={{
            position: "absolute",
            width: dimension + 24,
            height: dimension + 24,
            borderRadius: (dimension + 24) / 2,
            borderWidth: 2,
            borderColor: "#FFE0B2",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: dimension + 8,
            height: dimension + 8,
            borderRadius: (dimension + 8) / 2,
            borderWidth: 2,
            borderColor: "#FFF3E0",
          }}
        />
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            scale.value = withSequence(withSpring(1.1), withSpring(1));
            onPress();
          }}
          style={[
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: "#E89409",
              borderBottomWidth: 8,
              borderBottomColor: "#663E00",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 30px rgba(232, 148, 9, 0.3)",
            },
            pressStyle,
          ]}
        >
          <AppIcon name="volume" size={64} color="#FFFFFF" />
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        scale.value = withSequence(withSpring(1.14), withSpring(1));
        onPress();
      }}
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 5px 0 #C7DCEA",
        },
        pressStyle,
      ]}
    >
      <AppIcon name="volume" size={31} color={colors.blueDeep} />
    </AnimatedPressable>
  );
}
