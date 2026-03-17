import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { QRScanner } from '../src/components/QRScanner';
import { parseOclawURI } from '../src/lib/parse-oclaw-uri';
import { useConnectionStore } from '../src/store/connection-store';
import { GatewayClient } from '../src/gateway/client';

type Mode = 'scan' | 'manual';

export default function PairScreen() {
  const [mode, setMode] = useState<Mode>('scan');
  const [testing, setTesting] = useState(false);
  const [manualURL, setManualURL] = useState('');
  const [manualToken, setManualToken] = useState('');
  const addConnection = useConnectionStore((s) => s.addConnection);

  const handleScanned = async (data: string) => {
    try {
      const info = parseOclawURI(data);
      await testAndSave(info.host, info.port, info.token);
    } catch (err) {
      Alert.alert('Invalid QR', err instanceof Error ? err.message : 'Could not parse QR code');
    }
  };

  const handleManualConnect = async () => {
    const trimmedURL = manualURL.trim();
    const trimmedToken = manualToken.trim();

    if (!trimmedURL || !trimmedToken) {
      Alert.alert('Missing fields', 'Enter both host:port and token');
      return;
    }

    // Parse host:port
    const parts = trimmedURL.split(':');
    const host = parts[0];
    const port = parts.length > 1 ? parseInt(parts[1], 10) : 39421;

    if (!host || isNaN(port)) {
      Alert.alert('Invalid address', 'Enter a valid host:port (e.g., 192.168.1.5:39421)');
      return;
    }

    await testAndSave(host, port, trimmedToken);
  };

  const testAndSave = async (host: string, port: number, token: string) => {
    setTesting(true);

    try {
      // Test connection
      const client = new GatewayClient(host, port, token);
      await client.connect();
      client.disconnect();

      // Save and navigate
      addConnection({
        host,
        port,
        token,
        label: `${host}:${port}`,
      });

      router.replace('/chat');
    } catch (err) {
      Alert.alert(
        'Connection Failed',
        err instanceof Error ? err.message : 'Could not connect to gateway',
      );
    } finally {
      setTesting(false);
    }
  };

  if (testing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Testing connection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'scan' && styles.toggleActive]}
          onPress={() => setMode('scan')}
        >
          <Text style={[styles.toggleText, mode === 'scan' && styles.toggleTextActive]}>
            Scan QR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'manual' && styles.toggleActive]}
          onPress={() => setMode('manual')}
        >
          <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'scan' ? (
        <View style={styles.scannerContainer}>
          <QRScanner onScanned={handleScanned} />
          <Text style={styles.hint}>
            Run `oclaw pair` in your terminal to generate a QR code
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.manualContainer}
        >
          <ScrollView contentContainerStyle={styles.manualContent}>
            <Text style={styles.label}>Gateway Address</Text>
            <TextInput
              style={styles.textInput}
              value={manualURL}
              onChangeText={setManualURL}
              placeholder="192.168.1.5:39421"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>Token</Text>
            <TextInput
              style={styles.textInput}
              value={manualToken}
              onChangeText={setManualToken}
              placeholder="Auth token"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <TouchableOpacity style={styles.connectButton} onPress={handleManualConnect}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Settings link */}
      <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/settings')}>
        <Text style={styles.settingsText}>Manage saved connections</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#27272a',
  },
  toggleText: {
    color: '#71717a',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fafafa',
  },
  scannerContainer: {
    flex: 1,
  },
  hint: {
    color: '#52525b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  manualContainer: {
    flex: 1,
  },
  manualContent: {
    padding: 16,
    gap: 8,
  },
  label: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#18181b',
    color: '#fafafa',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  connectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  connectButtonText: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsLink: {
    padding: 16,
    alignItems: 'center',
  },
  settingsText: {
    color: '#60a5fa',
    fontSize: 14,
  },
});
