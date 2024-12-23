import React, { useState, useContext } from 'react';
import { login } from '../../services/api';
import { deriveMasterKey, hashMasterPassword, ab2base64, base642uint8, deriveKeyHKDF, deriveHMACKey } from '../../services/crypto';
import { AuthContext } from '../../context/AuthContext';

const Login: React.FC = () => {
  const { setToken, setMasterKey, setMetadataKey, setDeduplicationKey, setIntegrityHmacKey, setUser } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Hash the master password before sending
      const masterPasswordHash = ab2base64(await hashMasterPassword(password, username));

      // Send login request
      const response = await login(username, masterPasswordHash);
      if (response.status === 200) {
        const { token, masterSalt } = response.data;
        setToken(token);
        setUser(username);

        // Convert master salt to Uint8Array
        const masterSaltBytes = base642uint8(masterSalt);

        // Derive master key
        const masterKey = await deriveMasterKey(password, masterSaltBytes);
        
        // Derive metadata key
        const metadataKey = await deriveKeyHKDF(masterKey, masterSaltBytes, 'metadata');

        // Derive deduplication HMAC key
        const deduplicationKey = await deriveHMACKey(masterKey, masterSaltBytes, 'deduplication-hmac');

        // Derive integrity HMAC key
        const integrityHmacKey = await deriveHMACKey(masterKey, masterSaltBytes, 'integrity-hmac');
        
        setMasterKey(masterKey);
        setMetadataKey(metadataKey);
        setDeduplicationKey(deduplicationKey);
        setIntegrityHmacKey(integrityHmacKey);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Login failed', error);
      setError(error.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-10 bg-white shadow-md rounded-xl">
      <form onSubmit={handleLogin}>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Username</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="mb-8">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        {error && (
          <div className="mb-6 text-red-500">
            {error}
          </div>
        )}
        <button
          type="submit"
          className={`sm:flex justify-center mx-auto w-32 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
