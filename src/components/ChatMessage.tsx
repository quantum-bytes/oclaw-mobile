import React from 'react';
import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { DisplayMessage } from '../store/gateway-store';

const markdownStyles = {
  body: { color: '#e4e4e7', fontSize: 15, lineHeight: 22 },
  code_inline: {
    backgroundColor: '#27272a',
    color: '#a1a1aa',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'Courier',
  },
  fence: {
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 13,
    color: '#a1a1aa',
    fontFamily: 'Courier',
  },
  link: { color: '#60a5fa' },
  heading1: { color: '#fafafa', fontSize: 20, fontWeight: '700' as const },
  heading2: { color: '#fafafa', fontSize: 18, fontWeight: '600' as const },
  heading3: { color: '#fafafa', fontSize: 16, fontWeight: '600' as const },
  bullet_list_icon: { color: '#71717a' },
  ordered_list_icon: { color: '#71717a' },
  blockquote: {
    borderLeftColor: '#3f3f46',
    borderLeftWidth: 3,
    paddingLeft: 12,
    backgroundColor: 'transparent',
    marginVertical: 6,
  },
};

interface Props {
  message: DisplayMessage;
}

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isUser ? (
          <Markdown style={{ body: { color: '#fafafa', fontSize: 15, lineHeight: 22 } }}>
            {message.text}
          </Markdown>
        ) : (
          <>
            {message.tools && message.tools.length > 0 && (
              <View style={styles.toolsRow}>
                {message.tools.map((tool, i) => (
                  <View key={i} style={styles.toolBadge}>
                    <Markdown
                      style={{
                        body: { color: '#a1a1aa', fontSize: 12 },
                      }}
                    >
                      {`⚙ ${tool}`}
                    </Markdown>
                  </View>
                ))}
              </View>
            )}
            <Markdown style={markdownStyles}>{message.text || ' '}</Markdown>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1c1c1e',
    borderBottomLeftRadius: 4,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  toolBadge: {
    backgroundColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
