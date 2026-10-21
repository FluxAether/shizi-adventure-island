import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "../../src/components/app-screen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
}));

test("applies the top safe area exactly once on scrolling screens", async () => {
  await render(
    <AppScreen>
      <Text>Navigation bar</Text>
    </AppScreen>,
  );
  const root = screen.root!;
  const contentStyle = StyleSheet.flatten(root.props.contentContainerStyle);

  expect(root.props.contentInsetAdjustmentBehavior).toBe("never");
  expect(contentStyle.paddingTop).toBe(59);
});
