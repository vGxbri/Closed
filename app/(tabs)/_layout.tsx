import { Stack } from "expo-router";

export default function GlobalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="groups" />
    </Stack>
  );
}
