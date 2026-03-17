export interface PairInfo {
  host: string;
  port: number;
  token: string;
  deviceId?: string;
  deviceKey?: string; // base64-encoded Ed25519 seed (32 bytes)
}

/**
 * Parse an oclaw:// URI from QR code.
 * Format: oclaw://host:port?token=xxx&did=xxx&dkey=xxx
 * Rejects URIs with credentials, paths, or fragments.
 */
export function parseOclawURI(uri: string): PairInfo {
  const toParse = uri.trim();

  if (!toParse.startsWith('oclaw://')) {
    throw new Error('Invalid URI: must start with oclaw://');
  }

  const asHTTP = toParse.replace('oclaw://', 'http://');
  let parsed: URL;
  try {
    parsed = new URL(asHTTP);
  } catch {
    throw new Error('Invalid URI format');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Invalid URI: credentials not allowed');
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error('Invalid URI: path not allowed');
  }
  if (parsed.hash) {
    throw new Error('Invalid URI: fragment not allowed');
  }

  const host = parsed.hostname;
  if (!host) {
    throw new Error('Missing host in URI');
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : 39421;
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Invalid port number');
  }

  const token = parsed.searchParams.get('token');
  if (!token) {
    throw new Error('Missing token in URI');
  }

  const deviceId = parsed.searchParams.get('did') ?? undefined;
  const deviceKey = parsed.searchParams.get('dkey') ?? undefined;

  return { host, port, token, deviceId, deviceKey };
}
