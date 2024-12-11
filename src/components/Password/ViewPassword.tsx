import React, { useEffect, useState, useContext, Dispatch, SetStateAction } from 'react';
import { getEncryptedPasswordById } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { decryptAESGCM, deriveKeyHKDF, ab2str, base642ab, base642uint8 } from '../../services/crypto';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface EncryptedPasswordResponse {
  encryptedMetadata: string;
  encryptedPassword: string;
  encryptedPasswordKey: string;
  hkdfSalt: string;
}

const ViewPassword: React.FC<{ id: string, setOpen: Dispatch<SetStateAction<boolean>> }> = ({ id, setOpen }) => {
  const { masterKey, metadataKey } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPassword = async () => {
      setError(null);
      try {
        const response = await getEncryptedPasswordById(id!);
        const data: EncryptedPasswordResponse = response.data;

        // Decrypt metadata
        const decryptedMetadata = JSON.parse(ab2str(await decryptAESGCM(metadataKey!, base642ab(data.encryptedMetadata))));
        setMetadata(decryptedMetadata);

        // Derive KEK using HKDF
        const metadataInfo = JSON.stringify({ service: decryptedMetadata.service, username: decryptedMetadata.username });
        const hkdfSalt = base642uint8(data.hkdfSalt);
        const kek = await deriveKeyHKDF(masterKey!, hkdfSalt, metadataInfo);

        // Decrypt password key
        const decryptedKey = await decryptAESGCM(kek, base642ab(data.encryptedPasswordKey));

        // Import decrypted password key
        const passwordKey = await window.crypto.subtle.importKey(
          'raw',
          decryptedKey,
          'AES-GCM',
          false,
          ['decrypt']
        );

        // Decrypt password
        const decryptedPassword = ab2str(await decryptAESGCM(passwordKey, base642uint8(data.encryptedPassword)));
        setPassword(decryptedPassword);
      } catch (error: any) {
        console.error('Failed to retrieve password', error);
        setError('Failed to retrieve password.');
      }
    };

    if (id && masterKey) {
      fetchPassword();
    }
  }, [id, masterKey, metadataKey]);

  return (
    <div className="max-w-md mx-auto p-10 bg-white shadow-md rounded-xl">
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Service</label>
        <div className="w-full px-3 py-2 border rounded">
          {metadata ? metadata.service : null}
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Username</label>
        <div className="w-full px-3 py-2 border rounded">
          {metadata ? metadata.username : null}
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Password</label>
        <div className="w-full px-3 py-2 border rounded">
          {password}
        </div>
      </div>
      {error && (
        <div className="mb-6 text-red-500">
          Could not load password!
        </div>
      )}
      {!metadata && (
        <div className="mb-6">
          Password not found.
        </div>
      )}
      <div className="flex justify-between pt-2">
        <button onClick={() => setOpen(false)}>
          <ArrowBackIcon className="ml-auto text-amber-500 hover:text-amber-800 drop-shadow-sm" />
        </button>
      </div>
    </div>
  );
};

export default ViewPassword;
