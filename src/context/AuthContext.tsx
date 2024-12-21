import React, { createContext, useState } from 'react';
import { PasswordMetadata } from '../utils/types';

interface AuthContextType {
  token: string | null;
  masterKey: CryptoKey | null;
  metadataKey: CryptoKey | null;
  hmacKey: CryptoKey | null;
  integrityHmacKey: CryptoKey | null;
  user: string | null;
  passwords: Map<string, PasswordMetadata>;
  setToken: (token: string) => void;
  setMasterKey: (key: CryptoKey) => void;
  setMetadataKey: (key: CryptoKey) => void;
  setIntegrityHmacKey: (key: CryptoKey) => void;
  setHmacKey: (key: CryptoKey) => void;
  setUser: (username: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  masterKey: null,
  metadataKey: null,
  hmacKey: null,
  integrityHmacKey: null,
  user: null,
  passwords: new Map<string, PasswordMetadata>(),
  setToken: () => {},
  setMasterKey: () => {},
  setMetadataKey: () => {},
  setIntegrityHmacKey: () => {},
  setHmacKey: () => {},
  setUser: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC< { children: React.ReactNode } > = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [metadataKey, setMetadataKey] = useState<CryptoKey | null>(null);
  const [hmacKey, setHmacKey] = useState<CryptoKey | null>(null);
  const [integrityHmacKey, setIntegrityHmacKey] = useState<CryptoKey | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Map<string, PasswordMetadata>>(new Map<string, PasswordMetadata>());

  const logout = () => {
    setToken(null);
    setMasterKey(null);
    setMetadataKey(null);
    setHmacKey(null);
    setIntegrityHmacKey(null);
    setUser(null);
    setPasswords(new Map<string, PasswordMetadata>());
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        masterKey,
        metadataKey,
        hmacKey,
        integrityHmacKey,
        user,
        passwords,
        setToken,
        setMasterKey,
        setMetadataKey,
        setIntegrityHmacKey,
        setHmacKey,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
