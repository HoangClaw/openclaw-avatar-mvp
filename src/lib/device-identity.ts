const STORAGE_KEY = "openclaw-device-identity-v1";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fingerprintPublicKey(publicKey: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", publicKey.buffer);
  return bytesToHex(new Uint8Array(hash));
}

export type DeviceIdentity = {
  deviceId: string;
  publicKey: string; // base64url of raw 32-byte Ed25519 public key
  privateKey: string; // base64url of raw 32-byte Ed25519 private key
};

type StoredIdentity = {
  version: 1;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
};

async function generateIdentity(): Promise<DeviceIdentity> {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);
  const rawPriv = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
  );
  const rawPub = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey)
  );
  const deviceId = await fingerprintPublicKey(rawPub);
  return {
    deviceId,
    publicKey: base64UrlEncode(rawPub),
    privateKey: base64UrlEncode(rawPriv),
  };
}

export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredIdentity;
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === "string" &&
        typeof parsed.publicKey === "string" &&
        typeof parsed.privateKey === "string"
      ) {
        return {
          deviceId: parsed.deviceId,
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
        };
      }
    }
  } catch {
    // fall through to regenerate
  }

  const identity = await generateIdentity();
  const stored: StoredIdentity = {
    version: 1,
    deviceId: identity.deviceId,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    createdAtMs: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return identity;
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
}): string {
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
  ].join("|");
}

export async function signDevicePayload(
  privateKeyBase64Url: string,
  payload: string
): Promise<string> {
  const keyData = base64UrlDecode(privateKeyBase64Url);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  const data = new TextEncoder().encode(payload);
  const sig = new Uint8Array(await crypto.subtle.sign("Ed25519", key, data));
  return base64UrlEncode(sig);
}
