import { useCallback, type MutableRefObject } from 'react';
import { v4 as uuid } from 'uuid';
import type { GatewayClient } from '../gateway/client';
import { useGatewayStore } from '../store/gateway-store';

export function useChat(clientRef: MutableRefObject<GatewayClient | null>) {
  const send = useCallback(
    async (text: string) => {
      const client = clientRef.current;
      const s = useGatewayStore.getState();
      if (!client?.connected || !s.currentSession) return;

      // Add user message
      s.addMessage({
        id: uuid(),
        role: 'user',
        text,
        timestamp: Date.now(),
      });

      try {
        await client.request('chat.send', {
          sessionKey: s.currentSession,
          message: text,
          idempotencyKey: uuid(),
        });
      } catch (err) {
        s.setStatusMessage(err instanceof Error ? err.message : 'Send failed');
        s.setStreaming(false);
      }
    },
    [clientRef],
  );

  const abort = useCallback(async () => {
    const client = clientRef.current;
    const s = useGatewayStore.getState();
    if (!client?.connected || !s.currentSession) return;

    try {
      await client.request('chat.abort', { sessionKey: s.currentSession });
    } catch {
      // ignore
    }
  }, [clientRef]);

  const resetSession = useCallback(async () => {
    const client = clientRef.current;
    const s = useGatewayStore.getState();
    if (!client?.connected || !s.currentSession) return;

    try {
      await client.request('sessions.reset', { sessionKey: s.currentSession });
      s.setMessages([]);
    } catch (err) {
      s.setStatusMessage(err instanceof Error ? err.message : 'Reset failed');
    }
  }, [clientRef]);

  return { send, abort, resetSession };
}
