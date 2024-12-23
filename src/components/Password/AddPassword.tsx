import React, { useState, useContext, Dispatch, SetStateAction } from 'react';
import { addEncryptedPassword } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ab2base64, calculatePasswordStrength, computeHMAC, deriveKeyHKDF, encryptAESGCM, generateSalt, str2ab } from '../../services/crypto';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Tooltip from '@mui/material/Tooltip';

const AddPassword: React.FC<{ setOpen: Dispatch<SetStateAction<boolean>> }> = ({ setOpen }) => {
  const { masterKey, metadataKey, deduplicationKey, integrityHmacKey, passwords, user } = useContext(AuthContext);
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
      // Get the current timestamp
      const timestamp = new Date().toISOString();

      const metadataInfo = JSON.stringify({ service, username, timestamp });

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
      const encryptedPasswordKey = await encryptAESGCM(kek, passwordKey.buffer);

      // Encrypt metadata
      const encryptedMetadata = await encryptAESGCM(metadataKey!, str2ab(metadataInfo));

      // Generate unique service-username hash using HMAC
      const hashInput = `${service.toLowerCase()}${username.toLowerCase()}${user?.toLowerCase()}`;
      const serviceUsernameHash = ab2base64(await computeHMAC(deduplicationKey!, hashInput)); // Compute HMAC and encode as Base64

      // Prepare payload
      const payload = {
        encryptedMetadata: ab2base64(encryptedMetadata),
        encryptedPassword: ab2base64(encryptedPassword),
        encryptedPasswordKey: ab2base64(encryptedPasswordKey),
        hkdfSalt: ab2base64(new Uint8Array(hkdfSalt).buffer),
        serviceUsernameHash: serviceUsernameHash, // Base64-encoded HMAC
      };

      // Compute HMAC of the payload
      const payloadString = JSON.stringify(payload);
      const payloadHmac = ab2base64(await computeHMAC(integrityHmacKey!, payloadString));

      // Send to server
      const addResponse = await addEncryptedPassword({ ...payload, hmac: payloadHmac });
      if (addResponse.status !== 201) {
        throw new Error('Failed to add password');
      }

      // Update local state
      const { id } = addResponse.data;
      passwords.set(id, { id, service, username, timestamp });
    } catch (error: any) {
      if (error.response?.status === 409) {
        setError('An entry with the same service and username already exists.');
      } else {
        console.error('Failed to add password', error);
        setError('Failed to add password. Please try again.');
      }
      setDisable(false);
    }
  };

  // Analyze password strength
  const { color, strength } = calculatePasswordStrength(password);

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
            <Tooltip title={`Password strength: ${strength}`} arrow>
              <button
                type="button"
                disabled={disable}
                className="text-gray-500"
              >
                <AssessmentIcon style={{ color }} />
              </button>
            </Tooltip>
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
