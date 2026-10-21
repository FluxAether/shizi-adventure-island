import { Stack } from 'expo-router';

export default function StudyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        orientation: 'all',
        animation: 'fade',
      }}
    />
  );
}

