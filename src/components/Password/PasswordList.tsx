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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const PasswordList: React.FC = () => {
  const { token, metadataKey, passwords } = useContext(AuthContext);
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<keyof PasswordMetadata | null>(null); // Column to sort by
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Sorting order
  const [filterText, setFilterText] = useState(''); // Text for filtering

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
              timestamp: new Date(decryptedMetadata.timestamp).toLocaleString(), // Convert to local date and time
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

  // Sort passwords based on the selected column and order
  const sortedPasswords = Array.from(passwords.values()).sort((a, b) => {
    if (!sortBy) return 0;
    const valueA = a[sortBy]!.toString().toLowerCase();
    const valueB = b[sortBy]!.toString().toLowerCase();

    if (sortOrder === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

  // Filter passwords based on the filter text
  const filteredPasswords = sortedPasswords.filter(
    (pwd) =>
      pwd.service.toLowerCase().includes(filterText.toLowerCase()) ||
      pwd.username.toLowerCase().includes(filterText.toLowerCase())
  );

  const toggleSort = (column: keyof PasswordMetadata) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto p-6 bg-white shadow-md rounded-xl">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by service or username"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      {passwords.size === 0 ? (
        <p>No passwords stored.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
            <th className="px-4 py-2 text-amber-700">
                <button
                  onClick={() => toggleSort('service')}
                  className="flex items-center gap-1"
                >
                  Service
                  {sortBy === 'service' && (
                    sortOrder === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-amber-700">
                <button
                  onClick={() => toggleSort('username')}
                  className="flex items-center gap-1"
                >
                  Username
                  {sortBy === 'username' && (
                    sortOrder === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-amber-700">
                <button
                  onClick={() => toggleSort('timestamp')}
                  className="flex items-center gap-1"
                >
                  Added On
                  {sortBy === 'timestamp' && (
                    sortOrder === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-amber-700"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from(filteredPasswords.values()).map((pwd) => (
              <tr key={pwd.id} className="border-t">
                <td className="px-4 py-2 text-yellow-700">{pwd.service}</td>
                <td className="px-4 py-2 text-yellow-700">{pwd.username}</td>
                <td className="px-4 py-2 text-yellow-700">{pwd.timestamp}</td> {/* Display timestamp */}
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
