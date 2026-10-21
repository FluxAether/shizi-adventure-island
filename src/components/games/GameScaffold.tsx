import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingView, StarBurst } from '@/components/animated';
import { AppIcon } from '@/components/app-icon';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

interface Props extends PropsWithChildren {
  title: string;
  subtitle: string;
  progress?: string;
  trailing?: ReactNode;
  onExit: () => void;
  scroll?: boolean;
}

export function GameScaffold({
  children,
  title,
  subtitle,
  progress,
  trailing,
  onExit,
  scroll = true,
}: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const content = (
    <View
      style={{
        width: '100%',
        maxWidth: wide ? 980 : 720,
        alignSelf: 'center',
        flex: scroll ? undefined : 1,
        gap: spacing.xl,
        paddingHorizontal: wide ? spacing.xxl : spacing.lg,
        paddingBottom: spacing.xl,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="退出游戏"
          onPress={onExit}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <AppIcon name="back" color={colors.blueDeep} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: wide ? 32 : 28 }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16 }}>
            {subtitle}
          </Text>
        </View>
        {trailing ??
          (progress ? (
            <View
              accessibilityLabel={`游戏进度 ${progress}`}
              style={{
                minHeight: 48,
                minWidth: 64,
                borderRadius: radii.pill,
                backgroundColor: colors.yellowSoft,
                paddingHorizontal: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>
                {progress}
              </Text>
            </View>
          ) : null)}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: spacing.md }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: spacing.md }}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function CompletionPanel({
  title,
  detail,
  passed,
  onExit,
}: {
  title: string;
  detail: string;
  passed: boolean;
  onExit: () => void;
}) {
  return (
    <View
      accessibilityRole="summary"
      style={{
        flex: 1,
        minHeight: 300,
        borderRadius: radii.xl,
        backgroundColor: passed ? colors.greenSoft : colors.orangeSoft,
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        position: 'relative',
      }}
    >
      <StarBurst trigger={passed ? 1 : 0} />
      <FloatingView distance={-10} duration={1600}>
        <AppIcon name={passed ? 'trophy' : 'cards'} size={72} color={passed ? colors.greenDeep : colors.orangeDeep} />
      </FloatingView>
      <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 36, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 18, textAlign: 'center' }}>
        {detail}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回学习地图"
        onPress={onExit}
        style={({ pressed }) => ({
          minWidth: 180,
          minHeight: 56,
          borderRadius: radii.pill,
          backgroundColor: colors.blueDeep,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <Text style={{ color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 18 }}>
          完成
        </Text>
      </Pressable>
    </View>
  );
}



