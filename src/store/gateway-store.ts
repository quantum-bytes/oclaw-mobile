import { create } from 'zustand';
import type { AgentInfo, SessionInfo } from '../gateway/protocol';
import type { ConnectionStatus } from '../gateway/client';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  thinking?: string;
  tools?: string[];
  runId?: string;
  timestamp: number;
}

interface GatewayState {
  // Connection
  status: ConnectionStatus;
  setStatus: (s: ConnectionStatus) => void;

  // Agents
  agents: AgentInfo[];
  currentAgent: string | null;
  setAgents: (agents: AgentInfo[]) => void;
  setCurrentAgent: (id: string) => void;

  // Sessions
  sessions: SessionInfo[];
  currentSession: string | null;
  setSessions: (sessions: SessionInfo[]) => void;
  setCurrentSession: (key: string | null) => void;

  // Messages
  messages: DisplayMessage[];
  setMessages: (msgs: DisplayMessage[]) => void;
  addMessage: (msg: DisplayMessage) => void;
  updateMessageByRunId: (runId: string, update: Partial<DisplayMessage>) => void;

  // Streaming
  streaming: boolean;
  streamText: string;
  statusMessage: string;
  setStreaming: (v: boolean) => void;
  setStreamText: (text: string) => void;
  setStatusMessage: (msg: string) => void;

  // Reset
  reset: () => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),

  agents: [],
  currentAgent: null,
  setAgents: (agents) => set({ agents }),
  setCurrentAgent: (id) => set({ currentAgent: id }),

  sessions: [],
  currentSession: null,
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (key) => set({ currentSession: key }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessageByRunId: (runId, update) =>
    set((s) => {
      const msgs = [...s.messages];
      // Find message by runId (most recent match)
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].runId === runId) {
          msgs[i] = { ...msgs[i], ...update };
          return { messages: msgs };
        }
      }
      return s;
    }),

  streaming: false,
  streamText: '',
  statusMessage: '',
  setStreaming: (streaming) => set({ streaming }),
  setStreamText: (streamText) => set({ streamText }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  reset: () =>
    set({
      status: 'disconnected',
      agents: [],
      currentAgent: null,
      sessions: [],
      currentSession: null,
      messages: [],
      streaming: false,
      streamText: '',
      statusMessage: '',
    }),
}));
