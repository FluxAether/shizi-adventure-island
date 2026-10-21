import * as Updates from "expo-updates";
import { Alert, Platform } from "react-native";

export async function checkForAppUpdate(): Promise<void> {
  if (__DEV__ || Platform.OS === "web" || !Updates.isEnabled) return;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;

    Alert.alert(
      "发现新版本",
      "是否立即更新？更新完成后应用会自动重启。",
      [
        { text: "稍后", style: "cancel" },
        {
          text: "立即更新",
          onPress: async () => {
            try {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            } catch {
              Alert.alert("更新失败", "暂时无法完成更新，请检查网络后再试。");
            }
          },
        },
      ],
    );
  } catch {
    // Startup update checks should never block entering the app.
  }
}
