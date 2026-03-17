import { Redirect } from 'expo-router';
import { useConnectionStore } from '../src/store/connection-store';

// Auto-seed connection for simulator testing (reads device credentials from pair)
const store = useConnectionStore.getState();
if (store.connections.length === 0) {
  store.addConnection({
    host: '127.0.0.1',
    port: 39421,
    token: 'ollama',
    label: '127.0.0.1:39421',
    deviceId: 'a1d7f964c666ad314098f0b79501efa55e84f42792c2d040f7307889a281019d',
    deviceKey: 'jOuF4Nb/UUve8VfxNld1zPbnDKoak4x01wrojv3p8Gk=',
  });
}

export default function IndexScreen() {
  const activeId = useConnectionStore((s) => s.activeId);
  const connections = useConnectionStore((s) => s.connections);

  if (activeId && connections.some((c) => c.id === activeId)) {
    return <Redirect href="/chat" />;
  }

  return <Redirect href="/pair" />;
}
