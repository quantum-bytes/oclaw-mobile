import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useConnectionStore, type SavedConnection } from '../src/store/connection-store';

export default function SettingsScreen() {
  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const removeConnection = useConnectionStore((s) => s.removeConnection);
  const setActive = useConnectionStore((s) => s.setActive);

  const handleDelete = (conn: SavedConnection) => {
    Alert.alert('Remove Connection', `Remove ${conn.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeConnection(conn.id);
          if (conn.id === activeId && connections.length <= 1) {
            router.replace('/pair');
          }
        },
      },
    ]);
  };

  const handleSelect = (conn: SavedConnection) => {
    setActive(conn.id);
    router.replace('/chat');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.row, item.id === activeId && styles.rowActive]}>
            <TouchableOpacity style={styles.info} onPress={() => handleSelect(item)}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.detail}>
                {item.host}:{item.port}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtn}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No saved connections</Text>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/pair')}
          >
            <Text style={styles.addButtonText}>Add Connection</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rowActive: {
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  info: {
    flex: 1,
  },
  label: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  empty: {
    color: '#3f3f46',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '500',
  },
});
