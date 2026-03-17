import React, { useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChatMessageBubble } from '../src/components/ChatMessage';
import { ChatInput } from '../src/components/ChatInput';
import { StreamingIndicator } from '../src/components/StreamingIndicator';
import { useGateway } from '../src/hooks/use-gateway';
import { useChat } from '../src/hooks/use-chat';
import { useGatewayStore, type DisplayMessage } from '../src/store/gateway-store';
import { useConnectionStore } from '../src/store/connection-store';

const STATUS_COLORS: Record<string, string> = {
  connected: '#22c55e',
  connecting: '#eab308',
  reconnecting: '#f97316',
  disconnected: '#ef4444',
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { client, connect, disconnect } = useGateway();
  const { send, abort, resetSession } = useChat(client);

  const status = useGatewayStore((s) => s.status);
  const messages = useGatewayStore((s) => s.messages);
  const currentAgent = useGatewayStore((s) => s.currentAgent);
  const agents = useGatewayStore((s) => s.agents);
  const streaming = useGatewayStore((s) => s.streaming);
  const getActive = useConnectionStore((s) => s.getActive);

  const agentName =
    agents.find((a) => a.id === currentAgent)?.name ?? currentAgent ?? 'Agent';

  // Connect on mount
  useEffect(() => {
    const conn = getActive();
    if (!conn) {
      router.replace('/pair');
      return;
    }

    connect(conn.host, conn.port, conn.token).catch(() => {
      // Will auto-reconnect
    });

    return () => disconnect();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, streaming]);

  const renderMessage: ListRenderItem<DisplayMessage> = ({ item }) => (
    <ChatMessageBubble message={item} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/agents')}>
          <Text style={styles.agentName}>{agentName}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] ?? '#ef4444' }]} />
          <TouchableOpacity onPress={() => router.push('/sessions')}>
            <Text style={styles.headerBtn}>Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetSession}>
            <Text style={styles.headerBtn}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              disconnect();
              router.replace('/pair');
            }}
          >
            <Text style={[styles.headerBtn, { color: '#ef4444' }]}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Send a message to start chatting</Text>
          </View>
        }
        ListFooterComponent={<StreamingIndicator />}
      />

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={send} onAbort={abort} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  agentName: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerBtn: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '500',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#3f3f46',
    fontSize: 16,
  },
});
