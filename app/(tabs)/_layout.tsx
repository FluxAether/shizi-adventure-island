import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { fonts, radii } from "@/theme/tokens";

const tabs: Record<string, { title: string; icon: AppIconName }> = {
  index: { title: "首页", icon: "home" },
  cards: { title: "识字卡", icon: "cards" },
  pets: { title: "小宠物", icon: "pet" },
  achievements: { title: "成就", icon: "trophy" },
};

type TabBarProps = NonNullable<ComponentProps<typeof Tabs>["tabBar"]>;

function CustomTabBar({ state, descriptors, navigation }: Parameters<TabBarProps>[0]) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 4,
        borderTopColor: "#EBEEF5",
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        boxShadow: "0 -8px 20px rgba(0,0,0,0.08)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 16) + 4,
      }}
    >
      {state.routes.map((route: { key: string; name: string; params?: object }, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tabInfo = tabs[route.name] ?? { title: options.title ?? route.name, icon: "home" as AppIconName };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const activeColor = "#19722B";
        const inactiveColor = "#707882";

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: isFocused ? 20 : 10,
              paddingVertical: 6,
              borderRadius: radii.md,
              backgroundColor: isFocused ? "#9CF49C" : "transparent",
              boxShadow: isFocused ? "0 4px 0 #126D27" : "none",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <AppIcon
              name={tabInfo.icon}
              color={isFocused ? activeColor : inactiveColor}
              size={24}
            />
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 2,
                color: isFocused ? activeColor : inactiveColor,
              }}
            >
              {tabInfo.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {Object.entries(tabs).map(([name, item]) => (
        <Tabs.Screen key={name} name={name} options={{ title: item.title }} />
      ))}
    </Tabs>
  );
}
