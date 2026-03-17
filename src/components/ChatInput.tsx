import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';
import { useGatewayStore } from '../store/gateway-store';

interface Props {
  onSend: (text: string) => void;
  onAbort: () => void;
}

export function ChatInput({ onSend, onAbort }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const streaming = useGatewayStore((s) => s.streaming);
  const status = useGatewayStore((s) => s.status);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleSubmit = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    handleSend();
  };

  const disabled = status !== 'connected';

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[styles.input, disabled && styles.inputDisabled]}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        placeholder={disabled ? 'Not connected...' : 'Message...'}
        placeholderTextColor="#52525b"
        multiline
        maxLength={10000}
        editable={!disabled}
        returnKeyType="send"
        blurOnSubmit
      />
      {streaming ? (
        <TouchableOpacity style={styles.abortButton} onPress={onAbort}>
          <View style={styles.stopIcon} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <View style={styles.sendArrow} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    color: '#fafafa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
    marginRight: 8,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#27272a',
  },
  sendArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fafafa',
    transform: [{ rotate: '90deg' }],
    marginLeft: 2,
  },
  abortButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    backgroundColor: '#fafafa',
    borderRadius: 2,
  },
});
