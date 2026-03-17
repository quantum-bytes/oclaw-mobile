// Protocol types — direct port from internal/gateway/protocol.go

// --- Frames ---

export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: RPCError;
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
}

export interface RPCError {
  code: number;
  message: string;
}

export type Frame = RequestFrame | ResponseFrame | EventFrame;

// --- Connection ---

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: ClientInfo;
  caps: string[];
  auth: Record<string, string>;
  device?: DeviceInfo;
  role: string;
  scopes: string[];
}

export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
  mode: string;
  instanceId: string;
}

export interface DeviceInfo {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
}

export interface ChallengePayload {
  nonce: string;
}

export interface HelloPayload {
  type: 'hello-ok';
  protocol: number;
  policy?: HelloPolicy;
  features?: HelloFeatures;
}

export interface HelloPolicy {
  tickIntervalMs: number;
  maxPayload?: number;
}

export interface HelloFeatures {
  methods: string[];
  events: string[];
}

// --- Chat ---

export interface ChatSendParams {
  sessionKey: string;
  message: string;
  thinking?: string;
  timeoutMs?: number;
  idempotencyKey: string;
}

export interface ChatAbortParams {
  sessionKey: string;
}

export interface ChatHistoryParams {
  sessionKey: string;
}

export interface SessionsListParams {
  agentId?: string;
}

// --- Responses ---

export interface AgentInfo {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
}

export interface AgentsListResponse {
  agents: AgentInfo[];
}

export interface SessionInfo {
  key: string;
  agentId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

// --- Chat Events ---

export interface ChatEvent {
  sessionKey: string;
  runId: string;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: ChatMessage;
  errorMessage?: string;
  usage?: unknown;
  stopReason?: string;
}

export interface AgentEvent {
  runId: string;
  stream: 'lifecycle' | 'assistant' | 'thinking' | 'tool';
  sessionKey: string;
  data: {
    phase?: 'start' | 'end';
    startedAt?: number;
    endedAt?: number;
    name?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
  thinking?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
}
