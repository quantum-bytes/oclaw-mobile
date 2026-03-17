# oclaw mobile

React Native app for chatting with OpenClaw agents from your phone. Connects to any oclaw gateway instance via WebSocket.

## Quick Start

### Pairing

1. Run `oclaw pair` in your terminal to generate a QR code
2. Open the app and scan the QR code
3. Start chatting

### Manual Connection

Enter the gateway address (e.g., `192.168.1.5:39421`) and auth token manually.

## Development

```bash
npm install
npx expo start
```

Scan the Expo QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

## Tech Stack

- Expo SDK 55 + expo-router
- TypeScript
- zustand (state management)
- react-native-mmkv (persistence)
- @noble/ed25519 (device signing)
- expo-camera (QR scanning)
- react-native-markdown-display (message rendering)

## Architecture

```
app/           # Screens (expo-router file-based routing)
src/
  gateway/     # WebSocket client, protocol types, device signing
  store/       # zustand stores (connections + live state)
  hooks/       # React hooks (gateway lifecycle, chat operations)
  components/  # UI components (chat bubbles, input, QR scanner)
  lib/         # Utilities (URI parsing, content extraction)
```

The app connects to the OpenClaw gateway using the same WebSocket protocol as the terminal TUI. It supports:

- Real-time streaming chat
- Agent switching
- Session management
- Auto-reconnect with exponential backoff
- Ed25519 device authentication
