import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { colors, fonts, spacing } from "@/theme/tokens";

export default function PrivacyScreen() {
  return (
    <AppScreen contentStyle={{ maxWidth: 760, paddingBottom: 48, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭隐私说明"
          onPress={() => router.back()}
          style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}
        >
          <AppIcon name="back" color={colors.blueDeep} />
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32 }}>隐私说明</Text>
      </View>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}>不收集账号</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 24 }}>
        识字冒险岛没有登录、没有广告、没有第三方追踪。学习进度、星星和家长设置都保存在这台设备上。
      </Text>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}>可能联网的事</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 24 }}>
        如果构建时启用了应用更新服务，启动时会向 Expo 更新服务检查是否有新版本，并在确认后才下载更新。字体由系统或应用内字体提供，不上传孩子的学习内容。
      </Text>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}>家长可以做什么</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 24 }}>
        在家长中心设置每日学习上限、开关声音，以及暂时屏蔽某些字。删除应用会同时删除本机学习记录。
      </Text>
    </AppScreen>
  );
}
