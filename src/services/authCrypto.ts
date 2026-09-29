import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';

type PkceCrypto = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: {
    digest?: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>;
  };
};

// Supabase expects these WebCrypto APIs for S256 PKCE. This adapter provides
// only the missing native APIs, not a complete SubtleCrypto implementation.
export function installAuthCrypto(
  runtime: { crypto?: PkceCrypto } = globalThis as unknown as { crypto?: PkceCrypto },
): void {
  // Expo's web implementation delegates to browser crypto; patching it would
  // recurse. Browsers must use HTTPS (or localhost) for crypto.subtle.
  if (Platform.OS === 'web') return;
  const crypto = runtime.crypto ?? (runtime.crypto = {});
  crypto.getRandomValues ??= ExpoCrypto.getRandomValues;
  const subtle = crypto.subtle ?? (crypto.subtle = {});
  subtle.digest ??= async (algorithm, data) => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256')
      throw new Error('The authentication crypto adapter only supports SHA-256.');
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  };
}

installAuthCrypto();

export function requireAuthCrypto(): void {
  if (
    typeof globalThis.crypto?.getRandomValues !== 'function' ||
    typeof globalThis.crypto?.subtle?.digest !== 'function' ||
    typeof TextEncoder === 'undefined'
  ) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Secure sign-in requires HTTPS or localhost. Open the web app over HTTPS, or use email/password sign-in in the mobile app.'
        : 'Secure sign-in could not initialize. Restart Expo and reload the app; installed builds must include expo-crypto.',
    );
  }
}
