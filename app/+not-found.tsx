import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radii } from '@/theme/tokens';

export default function NotFoundScreen() {
  return (
    <AppScreen>
      <Stack.Screen options={{ title: '迷路啦' }} />
      <View style={{ minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text selectable style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 38 }}>这座小岛还没开放</Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 17 }}>回到码头，再选一次吧～</Text>
        <Link href="/" style={{ minHeight: 56, paddingHorizontal: 24, paddingVertical: 16, borderRadius: radii.pill, backgroundColor: colors.blue, color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}>
          回到首页
        </Link>
      </View>
    </AppScreen>
  );
}
