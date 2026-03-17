import { useEffect, useRef, useCallback } from 'react';
import { GatewayClient } from '../gateway/client';
import { ReconnectManager } from '../gateway/reconnect';
import { useGatewayStore } from '../store/gateway-store';
import { extractText, extractThinking, extractToolCalls } from '../lib/content';
import { v4 as uuid } from 'uuid';
import type {
  AgentsListResponse,
  ChatHistoryResponse,
  ChatEvent,
  AgentEvent,
  ChatMessage,
  EventFrame,
} from '../gateway/protocol';
import type { DisplayMessage } from '../store/gateway-store';

function chatMessageToDisplay(msg: ChatMessage): DisplayMessage {
  return {
    id: uuid(),
    role: msg.role,
    text: extractText(msg),
    thinking: extractThinking(msg) || undefined,
    tools: extractToolCalls(msg).length > 0 ? extractToolCalls(msg) : undefined,
    timestamp: Date.now(),
  };
}

export function useGateway() {
  const clientRef = useRef<GatewayClient | null>(null);
  const reconnectRef = useRef<ReconnectManager | null>(null);
  // Track runs that received chat events (for lifecycle end fallback)
  const runsWithChatEvents = useRef<Set<string>>(new Set());
  // Track completed run IDs for dedup
  const completedRuns = useRef<Set<string>>(new Set());

  const fetchAgentsAndHistory = useCallback(async (client: GatewayClient, agentId?: string) => {
    try {
      const agentsRes = await client.request<AgentsListResponse>('agents.list');
      useGatewayStore.getState().setAgents(agentsRes.agents);

      const current = agentId ?? agentsRes.agents[0]?.id;
      if (current) {
        useGatewayStore.getState().setCurrentAgent(current);

        const sessionKey = `agent:${current}:main`;
        useGatewayStore.getState().setCurrentSession(sessionKey);

        try {
          const historyRes = await client.request<ChatHistoryResponse>('chat.history', {
            sessionKey,
          });
          const msgs = historyRes.messages.map(chatMessageToDisplay);
          useGatewayStore.getState().setMessages(msgs);
        } catch {
          useGatewayStore.getState().setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents/history:', err);
    }
  }, []);

  const connect = useCallback(
    async (host: string, port: number, token: string) => {
      if (clientRef.current) {
        reconnectRef.current?.stop();
        clientRef.current.disconnect();
      }

      const client = new GatewayClient(host, port, token);
      clientRef.current = client;

      client.events.on('connected', () => {
        useGatewayStore.getState().setStatus('connected');
      });

      client.events.on('disconnected', () => {
        const s = useGatewayStore.getState();
        if (s.status !== 'disconnected') {
          useGatewayStore.getState().setStatus('reconnecting');
        }
      });

      client.events.on('event', (evt: EventFrame) => {
        handleEvent(evt);
      });

      const reconnect = new ReconnectManager(client, () => {
        fetchAgentsAndHistory(client);
      });
      reconnectRef.current = reconnect;

      useGatewayStore.getState().setStatus('connecting');
      await client.connect();
      await fetchAgentsAndHistory(client);
    },
    [fetchAgentsAndHistory],
  );

  const handleEvent = useCallback((evt: EventFrame) => {
    if (evt.event === 'agent') {
      handleAgentEvent(evt.payload as AgentEvent);
    } else if (evt.event === 'chat') {
      handleChatEvent(evt.payload as ChatEvent);
    }
  }, []);

  const handleAgentEvent = useCallback((payload: AgentEvent) => {
    const s = useGatewayStore.getState();
    if (payload.sessionKey !== s.currentSession) return;

    if (payload.stream === 'lifecycle') {
      if (payload.data.phase === 'start') {
        s.setStreaming(true);
        s.setStatusMessage('Thinking...');
      } else if (payload.data.phase === 'end') {
        if (!runsWithChatEvents.current.has(payload.runId)) {
          fetchLatestResponse(payload.sessionKey);
        }
      }
    } else if (payload.stream === 'assistant') {
      s.setStatusMessage('Responding...');
    } else if (payload.stream === 'thinking') {
      s.setStatusMessage('Reasoning...');
    } else if (payload.stream === 'tool') {
      const name = payload.data.name ?? 'tool';
      s.setStatusMessage(`Using ${name}...`);
    }
  }, []);

  const handleChatEvent = useCallback((payload: ChatEvent) => {
    const s = useGatewayStore.getState();
    if (payload.sessionKey !== s.currentSession) return;

    if (payload.state === 'delta') {
      runsWithChatEvents.current.add(payload.runId);
      if (payload.message) {
        const text = extractText(payload.message);

        // Find or create assistant message for this runId
        const existing = s.messages.find(
          (m) => m.runId === payload.runId && m.role === 'assistant',
        );
        if (existing) {
          s.updateMessageByRunId(payload.runId, { text });
        } else {
          s.addMessage({
            id: uuid(),
            role: 'assistant',
            text,
            runId: payload.runId,
            timestamp: Date.now(),
          });
        }
        s.setStreamText(text);
      }
    } else if (payload.state === 'final') {
      // Set-based dedup: skip if already completed
      if (completedRuns.current.has(payload.runId)) return;
      completedRuns.current.add(payload.runId);
      runsWithChatEvents.current.add(payload.runId);

      if (payload.message) {
        const text = extractText(payload.message);
        const thinking = extractThinking(payload.message) || undefined;
        const tools = extractToolCalls(payload.message);
        const toolsList = tools.length > 0 ? tools : undefined;

        const existing = s.messages.find(
          (m) => m.runId === payload.runId && m.role === 'assistant',
        );
        if (existing) {
          s.updateMessageByRunId(payload.runId, { text, thinking, tools: toolsList });
        } else if (text) {
          s.addMessage({
            id: uuid(),
            role: 'assistant',
            text,
            thinking,
            tools: toolsList,
            runId: payload.runId,
            timestamp: Date.now(),
          });
        }
      }

      s.setStreaming(false);
      s.setStreamText('');
      s.setStatusMessage('');

      // Bound set sizes
      if (completedRuns.current.size > 100) {
        completedRuns.current.clear();
      }
      if (runsWithChatEvents.current.size > 100) {
        runsWithChatEvents.current.clear();
      }
    } else if (payload.state === 'error') {
      s.setStreaming(false);
      s.setStreamText('');
      s.setStatusMessage(payload.errorMessage ?? 'Error');
    } else if (payload.state === 'aborted') {
      s.setStreaming(false);
      s.setStreamText('');
      s.setStatusMessage('Aborted');
    }
  }, []);

  const fetchLatestResponse = useCallback(async (sessionKey?: string) => {
    const client = clientRef.current;
    const s = useGatewayStore.getState();
    const key = sessionKey ?? s.currentSession;
    if (!client?.connected || !key) return;

    try {
      const res = await client.request<ChatHistoryResponse>('chat.history', {
        sessionKey: key,
      });
      if (useGatewayStore.getState().currentSession === key) {
        const msgs = res.messages.map(chatMessageToDisplay);
        useGatewayStore.getState().setMessages(msgs);
      }
    } catch {
      // ignore
    }
    if (useGatewayStore.getState().currentSession === key) {
      useGatewayStore.getState().setStreaming(false);
      useGatewayStore.getState().setStreamText('');
      useGatewayStore.getState().setStatusMessage('');
    }
  }, []);

  const disconnect = useCallback(() => {
    reconnectRef.current?.stop();
    clientRef.current?.disconnect();
    clientRef.current = null;
    reconnectRef.current = null;
    runsWithChatEvents.current.clear();
    completedRuns.current.clear();
    useGatewayStore.getState().reset();
  }, []);

  useEffect(() => {
    return () => {
      reconnectRef.current?.stop();
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    client: clientRef,
    connect,
    disconnect,
    fetchAgentsAndHistory,
  };
}
