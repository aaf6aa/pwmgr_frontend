import React, { useEffect, useState, useContext  } from 'react';
import AddPassword from "./AddPassword"
import ViewPassword from "./ViewPassword"
import { getPasswordMetadata, deleteEncryptedPasswordById } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { decryptAESGCM, ab2str, base642ab } from '../../services/crypto';
import { PasswordMetadata } from '../../utils/types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete'

const PasswordList: React.FC = () => {
  const { token, metadataKey, passwords } = useContext(AuthContext);
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null)

  const deletePassword = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      // Send delete request
      await deleteEncryptedPasswordById(id);
      passwords.delete(id);
    } catch (error: any) {
      console.error('Failed to delete password', error);
      setError('Failed to delete password.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchMetadata = async () => {
      setError(null);
      try {
        const response = await getPasswordMetadata();
        const encryptedMetadataList = response.data;
  
        for (const encryptedMetadata of encryptedMetadataList) {
          // Decrypt metadata using metadata key
          try
          {
            const decryptedMetadata = JSON.parse(ab2str(await decryptAESGCM(metadataKey!, base642ab(encryptedMetadata.encryptedMetadata))));
            const metadata: PasswordMetadata = {
              id: encryptedMetadata.id,
              service: decryptedMetadata.service,
              username: decryptedMetadata.username,
            }
            passwords.set(metadata.id, metadata);
          } catch (error: any) {
            console.error('Failed to decrypt password metadata for ', encryptedMetadata.id, error);
          }
        }
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch password metadata', error);
        setError('Failed to fetch passwords.');
      } finally {
        setLoading(false);
      }
    };
  
    if (token && metadataKey) {
      fetchMetadata();
    }
  }, [token, metadataKey, passwords]);

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto p-6 bg-white shadow-md rounded-xl">
      {passwords.size === 0 ? (
        <p>No passwords stored.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2 text-amber-700">Service</th>
              <th className="px-4 py-2 text-amber-700">Username</th>
              <th className="px-4 py-2 text-amber-700"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from(passwords.values()).map((pwd) => (
              <tr key={pwd.id} className="border-t">
                <td className="px-4 py-2 text-yellow-700">{pwd.service}</td>
                <td className="px-4 py-2 text-yellow-700">{pwd.username}</td>
                <td className="px-4 py-2 flex space-x-2 float-right">
                  <button onClick={() => { setViewOpen(true); setViewId(pwd.id); } } className="text-amber-500 hover:text-amber-800" aria-label="View">
                    <VisibilityIcon />
                  </button>
                  <button onClick={() => deletePassword(pwd.id)} className="text-red-500 hover:text-red-800" aria-label="Delete">
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        onClick={() => setAddOpen(true)}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-4 rounded-full fixed bottom-8 right-8 shadow-lg"
      >
        <AddIcon className="text-white" />
      </button>
      {/* Refresh the password list after adding a new password */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false) } className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-50" aria-hidden="true" />
        <DialogPanel className="fixed inset-0 h-1/2 w-3/4 m-auto md-shadow">
          <AddPassword setOpen={setAddOpen} />
        </DialogPanel>
      </Dialog>
      <Dialog open={viewOpen} onClose={() => setViewOpen(false) } className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-50" aria-hidden="true" />
        <DialogPanel className="fixed inset-0 h-1/2 w-3/4 m-auto md-shadow">
          <ViewPassword id={viewId!} setOpen={setViewOpen}/>
        </DialogPanel>
      </Dialog>
    </div>
  );
};

export default PasswordList;
