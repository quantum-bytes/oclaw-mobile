import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useGatewayStore } from '../src/store/gateway-store';
import { useGateway } from '../src/hooks/use-gateway';
import { extractText, extractThinking, extractToolCalls } from '../src/lib/content';
import { v4 as uuid } from 'uuid';
import type { SessionsListResponse, ChatHistoryResponse, SessionInfo } from '../src/gateway/protocol';

export default function SessionsScreen() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const currentSession = useGatewayStore((s) => s.currentSession);
  const currentAgent = useGatewayStore((s) => s.currentAgent);
  const { client } = useGateway();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!client.current?.connected) return;
    try {
      const res = await client.current.request<SessionsListResponse>('sessions.list', {
        agentId: currentAgent,
      });
      setSessions(res.sessions);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleSelect = async (session: SessionInfo) => {
    const store = useGatewayStore.getState();
    store.setCurrentSession(session.key);
    store.setMessages([]);

    if (client.current?.connected) {
      try {
        const res = await client.current.request<ChatHistoryResponse>('chat.history', {
          sessionKey: session.key,
        });
        store.setMessages(
          res.messages.map((m) => ({
            id: uuid(),
            role: m.role,
            text: extractText(m),
            thinking: extractThinking(m) || undefined,
            tools: extractToolCalls(m).length > 0 ? extractToolCalls(m) : undefined,
            timestamp: Date.now(),
          })),
        );
      } catch {
        // new session
      }
    }

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#60a5fa" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.key === currentSession && styles.rowActive]}
            onPress={() => handleSelect(item)}
          >
            <View style={styles.info}>
              <Text style={styles.label}>{item.label || item.key}</Text>
              <Text style={styles.date}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            {item.key === currentSession && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No sessions yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rowActive: {
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  info: {
    flex: 1,
  },
  label: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '500',
  },
  date: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  empty: {
    color: '#3f3f46',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
