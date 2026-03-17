import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useConnectionStore } from '../src/store/connection-store';

export default function IndexScreen() {
  const activeId = useConnectionStore((s) => s.activeId);
  const connections = useConnectionStore((s) => s.connections);

  useEffect(() => {
    // Redirect based on whether we have a saved connection
    if (activeId && connections.some((c) => c.id === activeId)) {
      router.replace('/chat');
    } else {
      router.replace('/pair');
    }
  }, [activeId, connections]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#60a5fa" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
