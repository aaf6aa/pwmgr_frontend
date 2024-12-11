// Helper to convert string to ArrayBuffer
export const str2ab = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Helper to convert ArrayBuffer to string
export const ab2str = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// Helper to convert Uint8Array to Base64 string
export const uint82base64 = (buffer: Uint8Array): string => {
  let binary = '';
  buffer.forEach((byte) => (binary += String.fromCharCode(byte)));
  return window.btoa(binary);
};

// Helper to convert Base64 string to Uint8Array
export const base642uint8 = (base64: string): Uint8Array => {
  const binary = window.atob(base64);
  const buffer = new Uint8Array(binary.length);
  buffer.forEach((_, i) => (buffer[i] = binary.charCodeAt(i)));
  return buffer;
};

// Helper to convert ArrayBuffer to Base64 string
export const ab2base64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
export const base642ab = (base64: string): ArrayBuffer => {
  let binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Hash master password using PBKDF2 with username as salt
export const hashMasterPassword = async (
  password: string,
  username: string
): Promise<ArrayBuffer> => {
  const salt = await window.crypto.subtle.digest(
    'SHA-256',
    str2ab(username)
  );

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    str2ab(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  return window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
};

// Derive master key from password using PBKDF2
export const deriveMasterKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    str2ab(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const masterKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return window.crypto.subtle.importKey(
    'raw',
    masterKeyBits,
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveKey']
  );
};

// HKDF derivation
export const deriveKeyHKDF = async (
  masterKey: CryptoKey,
  salt: Uint8Array,
  info: string
): Promise<CryptoKey> => {
  return window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: str2ab(info),
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const AES_GCM_IV_LENGTH = 12;

// AES-GCM encryption
export const encryptAESGCM = async (
  key: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.byteLength);
  return result.buffer;
};

// AES-GCM decryption
export const decryptAESGCM = async (
  key: CryptoKey,
  ciphertext: ArrayBuffer
): Promise<ArrayBuffer> => {
  const iv = new Uint8Array(ciphertext.slice(0, AES_GCM_IV_LENGTH));
  ciphertext = new Uint8Array(ciphertext.slice(AES_GCM_IV_LENGTH)).buffer;

  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );
};

// Generate random salt
export const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};
