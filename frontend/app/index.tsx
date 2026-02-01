import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to tabs layout which has the bottom navigation
  return <Redirect href="/(tabs)" />;
}
