import React, { useEffect, useState, useContext, Dispatch, SetStateAction } from 'react';
import { addEncryptedNote, getEncryptedNoteById, updateEncryptedNote } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  decryptAESGCM, 
  deriveKeyHKDF, 
  ab2str, 
  str2ab,
  base642ab, 
  base642uint8,
  ab2base64,
  verifyHMAC,
  computeHMAC,
  generateSalt,
  encryptAESGCM
} from '../../services/crypto';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

interface EncryptedNoteResponse {
  encryptedMetadata: string;
  encryptedNote: string;
  encryptedNoteKey: string;
  hkdfSalt: string;
  titleHash: string;
  hmac: string;
}

const NoteDialog: React.FC<{ 
  id: string | null, 
  setOpen: Dispatch<SetStateAction<boolean>>,
  onSave: () => void
}> = ({ id, setOpen, onSave }) => {
  const { masterKey, metadataKey, integrityHmacKey, deduplicationKey, notes, user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      setError(null);
      try {
        const response = await getEncryptedNoteById(id!);
        const data: EncryptedNoteResponse = response.data;

        // Verify HMAC of the received data
        const receivedHmac = base642ab(data.hmac);
        const payloadString = JSON.stringify({
          encryptedMetadata: data.encryptedMetadata,
          encryptedNote: data.encryptedNote,
          encryptedNoteKey: data.encryptedNoteKey,
          hkdfSalt: data.hkdfSalt,
          titleHash: data.titleHash,
        });
        const isValid = await verifyHMAC(integrityHmacKey!, payloadString, receivedHmac);
        if (!isValid) {
          throw new Error('Data integrity check failed.');
        }

        // Decrypt metadata
        const decryptedMetadata = JSON.parse(ab2str(await decryptAESGCM(metadataKey!, base642ab(data.encryptedMetadata))));
        setTitle(decryptedMetadata.title);

        // Derive KEK using HKDF
        const metadataInfo = JSON.stringify({ 
          title: decryptedMetadata.title, 
          timestamp: decryptedMetadata.timestamp,
          lastModified: decryptedMetadata.lastModified 
        });
        const hkdfSalt = base642uint8(data.hkdfSalt);
        const kek = await deriveKeyHKDF(masterKey!, hkdfSalt, metadataInfo);

        // Decrypt body key
        const decryptedKey = await decryptAESGCM(kek, base642ab(data.encryptedNoteKey));

        // Import decrypted body key
        const bodyKey = await window.crypto.subtle.importKey(
          'raw',
          decryptedKey,
          'AES-GCM',
          false,
          ['decrypt']
        );

        // Decrypt body
        const decryptedBody = ab2str(await decryptAESGCM(bodyKey, new Uint8Array(base642uint8(data.encryptedNote)).buffer));
        setBody(decryptedBody);
      } catch (error: any) {
        console.error('Failed to retrieve note', error);
        setError('Failed to retrieve note.');
      }
    };

    if (id && masterKey) {
      fetchNote();
    }
  }, [id, masterKey, metadataKey, integrityHmacKey]);

  const handleSave = async () => {
    setError(null);
    setLoading(true);

    try {
      // Generate unique title hash using HMAC
      const hashInput = `${title.toLowerCase()}${user?.toLowerCase()}`;
      const titleHash = ab2base64(await computeHMAC(deduplicationKey!, hashInput));

      // Generate random encryption key for the body
      const bodyKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
      );
      const exportedBodyKey = await window.crypto.subtle.exportKey('raw', bodyKey);

      // Generate new salt for HKDF
      const hkdfSalt = generateSalt();

      // Create metadata with timestamps
      const now = new Date().toISOString();
      const metadata = {
        title,
        timestamp: id ? undefined : now, // Only set timestamp for new notes
        lastModified: now
      };

      // Derive KEK using HKDF
      const metadataInfo = JSON.stringify(metadata);
      const kek = await deriveKeyHKDF(masterKey!, hkdfSalt, metadataInfo);

      // Encrypt the body key with KEK
      const encryptedNoteKey = await encryptAESGCM(kek, exportedBodyKey);

      // Encrypt the body with the body key
      const encryptedNote = await encryptAESGCM(bodyKey, str2ab(body));

      // Encrypt the metadata
      const encryptedMetadata = await encryptAESGCM(metadataKey!, str2ab(JSON.stringify(metadata)));

      // Prepare the payload
      const payload = {
        encryptedMetadata: ab2base64(encryptedMetadata),
        encryptedNote: ab2base64(encryptedNote),
        encryptedNoteKey: ab2base64(encryptedNoteKey),
        hkdfSalt: ab2base64(new Uint8Array(hkdfSalt).buffer),
        titleHash
      };

      // Calculate HMAC
      const hmac = await computeHMAC(integrityHmacKey!, JSON.stringify(payload));

      // Send to server and update local state
      if (id) {
        await updateEncryptedNote(id, { ...payload, hmac: ab2base64(hmac) });
        notes.set(id, {
          id,
          title,
          timestamp: new Date(metadata.timestamp!).toLocaleString() || new Date(notes.get(id)!.timestamp).toLocaleString(),
          lastModified: new Date(metadata.lastModified).toLocaleString()
        });
      } else {
        const response = await addEncryptedNote({ ...payload, hmac: ab2base64(hmac) });
        const { id: newId } = response.data;
        notes.set(newId, {
          id: newId,
          title,
          timestamp: new Date(metadata.timestamp!).toLocaleString(),
          lastModified: new Date(metadata.lastModified).toLocaleString()
        });
      }

      onSave();
      setOpen(false);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setError('A note with the same title already exists.');
      } else {
        console.error('Failed to save note', error);
        setError('Failed to save note.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-10 bg-white shadow-md rounded-xl">
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Enter note title"
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Note</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 border rounded h-64 resize-none"
          placeholder="Enter your note"
        />
      </div>

      {error && (
        <div className="mb-6 text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => setOpen(false)} disabled={loading}>
          <ArrowBackIcon className="text-amber-500 hover:text-amber-800 drop-shadow-sm" />
        </button>
        <button 
          onClick={handleSave} 
          disabled={loading || !title.trim() || !body.trim()}
          className="text-amber-500 hover:text-amber-800 drop-shadow-sm disabled:opacity-50"
        >
          <SaveIcon />
        </button>
      </div>
    </div>
  );
};

export default NoteDialog;
