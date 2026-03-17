import '../src/lib/crypto-polyfill';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#09090b' },
          headerTintColor: '#fafafa',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#09090b' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pair" options={{ title: 'Connect', headerBackVisible: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen
          name="agents"
          options={{
            title: 'Agents',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="sessions"
          options={{
            title: 'Sessions',
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Connections' }} />
      </Stack>
    </>
  );
}
