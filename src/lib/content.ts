import type { ChatMessage, ContentBlock } from '../gateway/protocol';

/**
 * Extract display text from a ChatMessage's content field.
 * Mirrors internal/chat/message.go ExtractText.
 */
export function extractText(message: ChatMessage): string {
  const { content } = message;

  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return String(content);
  }

  const parts: string[] = [];
  for (const block of content) {
    switch (block.type) {
      case 'text':
        if (block.text) parts.push(block.text);
        break;
      case 'tool_use':
        if (block.name) parts.push(`[tool: ${block.name}]`);
        break;
      case 'tool_result':
        if (block.text) parts.push(block.text);
        break;
    }
  }
  return parts.join('\n');
}

/**
 * Extract thinking text from content blocks.
 */
export function extractThinking(message: ChatMessage): string {
  if (message.thinking) return message.thinking;

  if (!Array.isArray(message.content)) return '';

  return message.content
    .filter((b): b is ContentBlock & { thinking: string } =>
      b.type === 'thinking' && !!b.thinking
    )
    .map((b) => b.thinking)
    .join('\n');
}

/**
 * Extract tool call names from content blocks.
 */
export function extractToolCalls(message: ChatMessage): string[] {
  if (!Array.isArray(message.content)) return [];

  return message.content
    .filter((b) => b.type === 'tool_use' && b.name)
    .map((b) => b.name!);
}
