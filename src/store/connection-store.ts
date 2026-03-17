import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'oclaw-connections' });

export interface SavedConnection {
  id: string;
  host: string;
  port: number;
  token: string;
  label: string;
  deviceId?: string;
  deviceKey?: string; // base64-encoded Ed25519 seed
  addedAt: number;
}

interface ConnectionState {
  connections: SavedConnection[];
  activeId: string | null;

  addConnection: (conn: Omit<SavedConnection, 'id' | 'addedAt'>) => string;
  removeConnection: (id: string) => void;
  setActive: (id: string | null) => void;
  getActive: () => SavedConnection | null;
}

function loadPersistedState(): { connections: SavedConnection[]; activeId: string | null } {
  try {
    const raw = storage.getString('state');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { connections: [], activeId: null };
}

function persist(state: { connections: SavedConnection[]; activeId: string | null }) {
  storage.set('state', JSON.stringify(state));
}

export const useConnectionStore = create<ConnectionState>((set, get) => {
  const initial = loadPersistedState();

  return {
    ...initial,

    addConnection: (conn) => {
      const id = `${conn.host}:${conn.port}`;
      set((state) => {
        // Update existing or add new
        const existing = state.connections.findIndex((c) => c.id === id);
        const entry: SavedConnection = { ...conn, id, addedAt: Date.now() };
        const connections =
          existing >= 0
            ? state.connections.map((c, i) => (i === existing ? entry : c))
            : [...state.connections, entry];
        const next = { connections, activeId: id };
        persist(next);
        return next;
      });
      return id;
    },

    removeConnection: (id) => {
      set((state) => {
        const connections = state.connections.filter((c) => c.id !== id);
        const activeId = state.activeId === id ? null : state.activeId;
        const next = { connections, activeId };
        persist(next);
        return next;
      });
    },

    setActive: (id) => {
      set((state) => {
        const next = { connections: state.connections, activeId: id };
        persist(next);
        return next;
      });
    },

    getActive: () => {
      const { connections, activeId } = get();
      return connections.find((c) => c.id === activeId) ?? null;
    },
  };
});
