import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useGatewayStore } from '../store/gateway-store';

export function StreamingIndicator() {
  const streaming = useGatewayStore((s) => s.streaming);
  const statusMessage = useGatewayStore((s) => s.statusMessage);
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!streaming) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [streaming, opacity]);

  if (!streaming) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity }]} />
      <Text style={styles.text}>{statusMessage || 'Thinking...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
    marginRight: 8,
  },
  text: {
    color: '#71717a',
    fontSize: 13,
  },
});
