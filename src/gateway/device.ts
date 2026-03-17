import * as SecureStore from 'expo-secure-store';
import * as ed from '@noble/ed25519';
import { Platform } from 'react-native';
import { v4 as uuid } from 'uuid';
import type { DeviceInfo } from './protocol';

const DEVICE_ID_KEY = 'oclaw_device_id';
const PRIVATE_KEY_KEY = 'oclaw_device_privkey';
const PUBLIC_KEY_KEY = 'oclaw_device_pubkey';

// Use webcrypto SHA-512 for @noble/ed25519
// @noble/ed25519 v2 requires setting sha512
// In React Native, we use the built-in crypto.subtle
if (typeof globalThis.crypto?.subtle?.digest === 'function') {
  ed.etc.sha512Async = async (message: Uint8Array) => {
    const buf = await globalThis.crypto.subtle.digest('SHA-512', message as ArrayBufferView<ArrayBuffer>);
    return new Uint8Array(buf);
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateIdentity(): Promise<{
  deviceId: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  let privHex = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  let pubHex = await SecureStore.getItemAsync(PUBLIC_KEY_KEY);

  if (deviceId && privHex && pubHex) {
    return {
      deviceId,
      privateKey: fromHex(privHex),
      publicKey: fromHex(pubHex),
    };
  }

  // Generate new identity
  deviceId = uuid().replace(/-/g, '');
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  await SecureStore.setItemAsync(PRIVATE_KEY_KEY, toHex(privateKey));
  await SecureStore.setItemAsync(PUBLIC_KEY_KEY, toHex(publicKey));

  return { deviceId, privateKey, publicKey };
}

/**
 * Build DeviceInfo with Ed25519 signature for gateway auth.
 * Signing payload format matches Go client (client.go line 679):
 * v3|{deviceId}|mobile|mobile|operator|operator.admin,operator.read,operator.write|{signedAtMs}|{token}|{nonce}|{platform}|
 */
export async function getDeviceInfo(
  nonce: string,
  token: string,
): Promise<DeviceInfo | null> {
  try {
    const { deviceId, privateKey, publicKey } = await getOrCreateIdentity();

    const signedAt = Date.now();
    const scopes = 'operator.admin,operator.read,operator.write';
    const platform = Platform.OS;

    const payload = `v3|${deviceId}|mobile|mobile|operator|${scopes}|${signedAt}|${token}|${nonce}|${platform}|`;
    const payloadBytes = new TextEncoder().encode(payload);

    const signature = await ed.signAsync(payloadBytes, privateKey);

    return {
      id: deviceId,
      publicKey: toBase64(publicKey),
      signature: toBase64(signature),
      signedAt,
      nonce,
    };
  } catch {
    // Device signing is optional — return null if SecureStore is unavailable
    return null;
  }
}
