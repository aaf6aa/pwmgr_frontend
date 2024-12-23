import React, { createContext, useState } from 'react';
import { PasswordMetadata, NoteMetadata } from '../utils/types';

interface AuthContextType {
  token: string | null;
  masterKey: CryptoKey | null;
  metadataKey: CryptoKey | null;
  deduplicationKey: CryptoKey | null;
  integrityHmacKey: CryptoKey | null;
  user: string | null;
  passwords: Map<string, PasswordMetadata>;
  notes: Map<string, NoteMetadata>;
  setToken: (token: string) => void;
  setMasterKey: (key: CryptoKey) => void;
  setMetadataKey: (key: CryptoKey) => void;
  setDeduplicationKey: (key: CryptoKey) => void;
  setIntegrityHmacKey: (key: CryptoKey) => void;
  setUser: (username: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  masterKey: null,
  metadataKey: null,
  deduplicationKey: null,
  integrityHmacKey: null,
  user: null,
  passwords: new Map<string, PasswordMetadata>(),
  notes: new Map<string, NoteMetadata>(),
  setToken: () => {},
  setMasterKey: () => {},
  setMetadataKey: () => {},
  setDeduplicationKey: () => {},
  setIntegrityHmacKey: () => {},
  setUser: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC< { children: React.ReactNode } > = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [metadataKey, setMetadataKey] = useState<CryptoKey | null>(null);
  const [deduplicationKey, setDeduplicationKey] = useState<CryptoKey | null>(null);
  const [integrityHmacKey, setIntegrityHmacKey] = useState<CryptoKey | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Map<string, PasswordMetadata>>(new Map<string, PasswordMetadata>());
  const [notes, setNotes] = useState<Map<string, NoteMetadata>>(new Map<string, NoteMetadata>());

  const logout = () => {
    setToken(null);
    setMasterKey(null);
    setMetadataKey(null);
    setDeduplicationKey(null);
    setIntegrityHmacKey(null);
    setUser(null);
    setPasswords(new Map<string, PasswordMetadata>());
    setNotes(new Map<string, NoteMetadata>());
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        masterKey,
        metadataKey,
        deduplicationKey,
        integrityHmacKey,
        user,
        passwords,
        notes,
        setToken,
        setMasterKey,
        setMetadataKey,
        setDeduplicationKey,
        setIntegrityHmacKey,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
