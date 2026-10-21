import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { AppIcon } from '@/components/app-icon';
import { colors, fonts, radii } from '@/theme/tokens';

export function ProgressHeader({
  learned,
  streak,
  stars,
  title = '今日进度',
}: {
  learned?: number;
  streak?: number;
  stars: number;
  title?: string;
}) {
  const pill = (
    icon: 'cards' | 'fire' | 'star',
    value: number,
    label: string,
    tint: string,
    iconColor: string,
  ) => (
    <View
      accessibilityLabel={`${label}${value}`}
      style={{
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: radii.pill,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: colors.outline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <AppIcon name={icon} size={18} color={iconColor} />
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.canvas,
        borderBottomLeftRadius: radii.lg,
        borderBottomRightRadius: radii.lg,
        boxShadow: '0 6px 0 rgba(0,0,0,0.05)',
        paddingBottom: 4,
      }}
    >
      <Text style={{ flex: 1, color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 20 }}>{title}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {typeof streak === 'number' ? pill('fire', streak, '连续学习', colors.surface, colors.orange) : null}
        {typeof learned === 'number' ? pill('cards', learned, '今日新字', colors.blueSoft, colors.blueDeep) : null}
        {pill('star', stars, '星星', colors.surface, colors.yellow)}
        <Link href="/parent" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开家长中心"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface,
              boxShadow: '0 4px 0 #D5DFEA',
            }}
          >
            <AppIcon name="settings" color={colors.blueDeep} size={24} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
