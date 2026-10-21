import type { PropsWithChildren, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radii } from '@/theme/tokens';

export function GameFrame({ title, subtitle, progress, children, trailing }: PropsWithChildren<{ title: string; subtitle: string; progress?: string; trailing?: ReactNode }>) {
  return (
    <AppScreen>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 30 }}>{title}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16 }}>{subtitle}</Text>
          </View>
          {trailing ?? (progress ? <View style={{ minHeight: 48, borderRadius: radii.pill, backgroundColor: colors.yellowSoft, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }}><AppIcon name="star" size={20} color={colors.orangeDeep} /><Text style={{ fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] }}>{progress}</Text></View> : null)}
        </View>
      </View>
      {children}
    </AppScreen>
  );
}
