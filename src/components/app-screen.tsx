import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  header?: ReactNode;
  contentStyle?: ViewStyle;
}>;

export function AppScreen({ children, scroll = true, header, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const { flex, ...restContentStyle } = contentStyle ?? {};
  const innerStyle: ViewStyle = {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: Math.max(insets.top, spacing.lg),
    paddingBottom: Math.max(insets.bottom + 88, 104),
    ...restContentStyle,
  };

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={[{ flex: 1 }, innerStyle]}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={[{ flexGrow: 1 }, innerStyle]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
    >
      {header}
      {children}
    </ScrollView>
  );
}
