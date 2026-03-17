import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useGatewayStore } from '../src/store/gateway-store';
import type { AgentInfo, ChatHistoryResponse } from '../src/gateway/protocol';
import { useGateway } from '../src/hooks/use-gateway';
import { extractText, extractThinking, extractToolCalls } from '../src/lib/content';
import { v4 as uuid } from 'uuid';

export default function AgentsScreen() {
  const agents = useGatewayStore((s) => s.agents);
  const currentAgent = useGatewayStore((s) => s.currentAgent);
  const { client } = useGateway();

  const handleSelect = async (agent: AgentInfo) => {
    const store = useGatewayStore.getState();
    store.setCurrentAgent(agent.id);

    const sessionKey = `agent:${agent.id}:main`;
    store.setCurrentSession(sessionKey);
    store.setMessages([]);

    // Fetch history for this agent
    if (client.current?.connected) {
      try {
        const res = await client.current.request<ChatHistoryResponse>('chat.history', {
          sessionKey,
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
        // New session
      }
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.id === currentAgent && styles.rowActive]}
            onPress={() => handleSelect(item)}
          >
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.emoji ? `${item.emoji} ` : ''}
                {item.name}
              </Text>
              {item.model && <Text style={styles.model}>{item.model}</Text>}
            </View>
            {item.id === currentAgent && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No agents available</Text>
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
  name: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
  },
  model: {
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
