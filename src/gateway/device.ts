import * as ed from '@noble/ed25519';
// @ts-ignore - exports map requires .js extension
import { sha512 } from '@noble/hashes/sha2.js';
import { Platform } from 'react-native';
import type { DeviceInfo } from './protocol';

// Use @noble/hashes for SHA-512 (works in Hermes without crypto.subtle)
ed.etc.sha512Sync = sha512;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build DeviceInfo with Ed25519 signature for gateway auth.
 * Uses device credentials provided via QR code pairing.
 *
 * Signing payload format matches Go client (client.go line 679):
 * v3|{deviceId}|cli|cli|operator|operator.admin,operator.read,operator.write|{signedAtMs}|{token}|{nonce}|{platform}|
 */
export function getDeviceInfo(
  nonce: string,
  token: string,
  deviceId?: string,
  deviceKeyB64?: string,
): DeviceInfo | null {
  if (!deviceId || !deviceKeyB64) {
    return null;
  }

  try {
    const seed = fromBase64(deviceKeyB64);
    const publicKey = ed.getPublicKey(seed);

    const signedAt = Date.now();
    const scopes = 'operator.admin,operator.read,operator.write';
    // Must match the device's registered platform to avoid re-pairing
    const platform = 'darwin';

    const payload = `v3|${deviceId}|cli|cli|operator|${scopes}|${signedAt}|${token}|${nonce}|${platform}|`;
    const payloadBytes = new TextEncoder().encode(payload);

    const signature = ed.sign(payloadBytes, seed);

    return {
      id: deviceId,
      publicKey: toBase64(publicKey),
      signature: toBase64(signature),
      signedAt,
      nonce,
    };
  } catch (err) {
    console.error('[oclaw] Device signing failed:', err);
    return null;
  }
}
