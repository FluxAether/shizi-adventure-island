const {
  LEGACY_REACT_NATIVE_START,
  SCENE_DELEGATE,
  SCENE_MANIFEST,
  migrateAppDelegate,
} = jest.requireActual("../../plugins/with-ios-27-scene-lifecycle");

test("moves React Native startup to the iOS scene lifecycle", () => {
  const appDelegate = `before\n${LEGACY_REACT_NATIVE_START}\nafter`;

  expect(migrateAppDelegate(appDelegate)).toBe("before\nafter");
  expect(SCENE_DELEGATE).toContain("UIWindowSceneDelegate");
  expect(SCENE_DELEGATE).toContain("UIWindow(windowScene: windowScene)");
  expect(SCENE_MANIFEST.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0])
    .toEqual({
      UISceneConfigurationName: "Default Configuration",
      UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
    });
});
