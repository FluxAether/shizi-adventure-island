import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { colors } from '@/theme/tokens';

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const PARTICLE_DISTANCES = [55, 75, 60, 80, 55, 70, 65, 75];
const PARTICLE_COLORS = [
  colors.yellow,
  colors.orange,
  '#4FACFE',
  '#FFD700',
  '#FF6B6B',
  colors.green,
  colors.yellow,
  '#FF9F43',
];

function StarParticle({
  angle,
  distance,
  color,
  progress,
}: {
  angle: number;
  distance: number;
  color: string;
  progress: SharedValue<number>;
}) {
  const rad = (angle * Math.PI) / 180;
  const targetX = Math.cos(rad) * distance;
  const targetY = Math.sin(rad) * distance;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = targetX * p;
    const translateY = targetY * p - p * 15;
    const scale = p === 0 ? 0 : p < 0.5 ? p * 2.4 : Math.max(0, 1.2 - (p - 0.5) * 2.4);
    const opacity = p === 0 ? 0 : p < 0.8 ? 1 : Math.max(0, (1 - p) * 5);

    return {
      transform: [{ translateX }, { translateY }, { scale }, { rotate: `${p * 180}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      <AppIcon name="star" size={20} color={color} />
    </Animated.View>
  );
}

export function StarBurst({ trigger }: { trigger: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger > 0) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [trigger, progress]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {PARTICLE_ANGLES.map((angle, idx) => (
        <StarParticle
          key={idx}
          angle={angle}
          distance={PARTICLE_DISTANCES[idx]}
          color={PARTICLE_COLORS[idx]}
          progress={progress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
