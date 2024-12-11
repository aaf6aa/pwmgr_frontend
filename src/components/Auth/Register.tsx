import React, { useState, useContext } from 'react';
import { register } from '../../services/api';
import { deriveMasterKey, deriveKeyHKDF, generateSalt, hashMasterPassword, ab2base64, uint82base64 } from '../../services/crypto';
import { AuthContext } from '../../context/AuthContext';

const Register: React.FC = () => {
  const { setToken, setMasterKey, setMetadataKey } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Generate master key salt on client
      const masterSalt = generateSalt();

      // Derive master key
      const masterKey = await deriveMasterKey(password, masterSalt);

      // Derive metadata key
      const metadataKey = await deriveKeyHKDF(masterKey, masterSalt, 'metadata');

      // Hash the master password before sending
      const passwordHash = ab2base64(await hashMasterPassword(password, username));

      // Send registration data to server
      const response = await register(username, passwordHash, uint82base64(masterSalt));
      if (response.status === 201 || response.status === 200) {
        setToken(response.data.token);
        setMasterKey(masterKey);
        setMetadataKey(metadataKey);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration failed', error);
      setError(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-10 bg-white shadow-md rounded-xl">
      <form onSubmit={handleRegister}>
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
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
        </div>
        <div className="mb-8">
          <label className="block text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
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
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
