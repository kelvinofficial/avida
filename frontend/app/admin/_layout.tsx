import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="businessProfiles" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="photography-guides" />
      <Stack.Screen name="users" />
      <Stack.Screen name="vouchers" />
    </Stack>
  );
}
