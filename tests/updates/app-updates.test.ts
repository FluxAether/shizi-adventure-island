import * as Updates from "expo-updates";
import { Alert } from "react-native";

import { checkForAppUpdate } from "../../src/services/app-updates";

jest.mock("expo-updates", () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

test("downloads and reloads only after the user confirms", async () => {
  const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
  const originalDev = runtime.__DEV__;
  runtime.__DEV__ = false;

  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: true } as never);
  jest.mocked(Updates.fetchUpdateAsync).mockResolvedValue({ isNew: true } as never);
  jest.mocked(Updates.reloadAsync).mockResolvedValue(undefined);

  await checkForAppUpdate();
  expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();

  const confirm = alert.mock.calls[0][2]?.find(({ text }) => text === "立即更新");
  await confirm?.onPress?.();

  expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);

  alert.mockRestore();
  runtime.__DEV__ = originalDev;
});
