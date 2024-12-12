import React, { useState, useContext, Dispatch, SetStateAction } from 'react';
import { addEncryptedPassword } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ab2base64, deriveKeyHKDF, encryptAESGCM, generateSalt, str2ab } from '../../services/crypto';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const AddPassword: React.FC<{ setOpen: Dispatch<SetStateAction<boolean>> }> = ({ setOpen }) => {
  const { masterKey, metadataKey, passwords } = useContext(AuthContext);
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [disable, setDisable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSecurePassword = () => {
    const length = 14;
    const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$&*_+:?';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }
    setPassword(password);
  };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDisable(true);
    try {
      const metadataInfo = JSON.stringify({ service, username });

      // Generate random key for password encryption
      const passwordKey = window.crypto.getRandomValues(new Uint8Array(32));
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        passwordKey,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );

      // Encrypt the password using AES-GCM
      const encryptedPassword = await encryptAESGCM(cryptoKey, str2ab(password));

      // Derive KEK using HKDF with password metadata as info
      const hkdfSalt = generateSalt();
      const kek = await deriveKeyHKDF(masterKey!, hkdfSalt, metadataInfo);

      // Encrypt the password key with KEK
      const encryptedPasswordKey = await encryptAESGCM(kek, passwordKey);

      // Encrypt metadata
      const encryptedMetadata = await encryptAESGCM(metadataKey!, str2ab(metadataInfo));

      // Prepare payload
      const payload = {
        encryptedMetadata: ab2base64(encryptedMetadata),
        encryptedPassword: ab2base64(encryptedPassword),
        encryptedPasswordKey: ab2base64(encryptedPasswordKey),
        hkdfSalt: ab2base64(hkdfSalt),
      };

      // Send to server
      const addResponse = await addEncryptedPassword(payload);
      if (addResponse.status !== 201) {
        throw new Error('Failed to add password');
      }

      // Update local state
      const { id } = addResponse.data;
      passwords.set(id, { id, service, username });

      
    } catch (error: any) {
      console.error('Failed to add password', error);
      setError('Failed to add password. Please try again.');
      setDisable(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-10 bg-white shadow-md rounded-xl">
      <form onSubmit={handleAddPassword}>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Service</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
            disabled={disable}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Username</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={disable}
          />
        </div>
        <div className="mb-8">
          <label className="block text-gray-700 mb-2">Password</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disable}
            />
            <button
              type="button"
              onClick={generateSecurePassword}
              disabled={disable}
              className="text-amber-500 hover:text-amber-800"
            >
              <AutoAwesomeIcon />
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-6 text-red-500">
            {error}
          </div>
        )}
        {disable && (
          <div className="mb-6 text-green-500">
            Password added successfully!
          </div>
        )}
        <div className="flex justify-between pt-2">
          <button onClick={() => setOpen(false)}>
            <ArrowBackIcon className="text-amber-500 hover:text-amber-800 drop-shadow-sm" />
          </button>
          <button
            type="submit"
            disabled={disable}
          >
            <AddIcon className={`text-amber-500 hover:text-amber-800 drop-shadow-sm ${disable ? 'opacity-50 cursor-not-allowed' : ''
            }`} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPassword;
