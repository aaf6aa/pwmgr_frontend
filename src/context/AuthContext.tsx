import React, { createContext, useState } from 'react';
import { PasswordMetadata } from '../utils/types';

interface AuthContextType {
  token: string | null;
  masterKey: CryptoKey | null;
  metadataKey: CryptoKey | null;
  passwords: Map<string, PasswordMetadata>;
  setToken: (token: string) => void;
  setMasterKey: (key: CryptoKey) => void;
  setMetadataKey: (key: CryptoKey) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  masterKey: null,
  metadataKey: null,
  passwords: new Map<string, PasswordMetadata>(),
  setToken: () => {},
  setMasterKey: () => {},
  setMetadataKey: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC< { children: React.ReactNode } > = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [metadataKey, setMetadataKey] = useState<CryptoKey | null>(null);
  const [passwords, setPasswords] = useState<Map<string, PasswordMetadata>>(new Map<string, PasswordMetadata>());

  const logout = () => {
    setToken(null);
    setMasterKey(null);
    setMetadataKey(null);
    setPasswords(new Map<string, PasswordMetadata>());
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        masterKey,
        metadataKey,
        passwords,
        setToken,
        setMasterKey,
        setMetadataKey,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
