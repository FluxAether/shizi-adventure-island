import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { AppIcon } from '@/components/app-icon';
import { colors, fonts, radii } from '@/theme/tokens';

export type RewardTone = 'reward' | 'info' | 'achievement' | 'pet';

export function RewardOverlay({
  visible,
  title,
  message,
  stars = 0,
  tone = 'reward',
  onDismiss,
}: {
  visible: boolean;
  title: string;
  message: string;
  stars?: number;
  tone?: RewardTone;
  onDismiss: () => void;
}) {
  const isReward = tone === 'reward' || tone === 'achievement' || tone === 'pet';
  const lottieSource =
    tone === 'achievement'
      ? require('../../assets/lottie/achievement-unlock.json')
      : tone === 'pet'
        ? require('../../assets/lottie/pet-unlock.json')
        : require('../../assets/lottie/success.json');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View
        entering={FadeIn.duration(180)}
        style={{ flex: 1, backgroundColor: '#10243888', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Animated.View
          entering={ZoomIn.springify().damping(80)}
          style={{
            width: '100%',
            maxWidth: 380,
            borderRadius: radii.hero,
            backgroundColor: colors.surface,
            padding: 28,
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 12px 32px #10243844',
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isReward ? colors.yellowSoft : colors.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isReward ? (
              <LottieView
                source={lottieSource}
                autoPlay
                loop
                style={{ position: 'absolute', width: 120, height: 120 }}
              />
            ) : null}
            <AppIcon
              name={tone === 'achievement' ? 'trophy' : tone === 'pet' ? 'pet' : isReward ? 'star' : 'check'}
              size={48}
              color={isReward ? colors.orange : colors.blueDeep}
            />
          </View>
          <Text selectable style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32, textAlign: 'center' }}>
            {title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 17, textAlign: 'center', lineHeight: 26 }}>
            {message}
          </Text>
          {stars > 0 && (
            <Text style={{ color: colors.orangeDeep, fontFamily: fonts.bodyBold, fontSize: 22 }}>
              +{stars} 颗星星
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isReward ? '收下奖励' : '知道了'}
            onPress={onDismiss}
            style={({ pressed }) => ({
              minHeight: 58,
              alignSelf: 'stretch',
              borderRadius: radii.xl,
              backgroundColor: colors.green,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 19 }}>
              {isReward ? '收下啦' : '知道了'}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function RewardToast({
  visible,
  title,
  message,
}: {
  visible: boolean;
  title: string;
  message?: string;
}) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        top: 88,
        zIndex: 20,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          minHeight: 52,
          maxWidth: 360,
          borderRadius: radii.pill,
          backgroundColor: colors.yellowSoft,
          borderWidth: 2,
          borderColor: colors.yellow,
          paddingHorizontal: 18,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 6px 0 rgba(134,83,0,0.18)',
        }}
      >
        <AppIcon name="star" size={22} color={colors.orange} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>{title}</Text>
          {message ? (
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>{message}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

