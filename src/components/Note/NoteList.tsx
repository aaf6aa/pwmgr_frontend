import React, { useEffect, useState, useContext  } from 'react';
import NoteDialog from "./NoteDialog"
import { getNoteMetadata, deleteEncryptedNoteById } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { decryptAESGCM, ab2str, base642ab } from '../../services/crypto';
import { NoteMetadata } from '../../utils/types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const NoteList: React.FC = () => {
  const { token, metadataKey, notes } = useContext(AuthContext);
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof NoteMetadata | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  const deleteNote = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      await deleteEncryptedNoteById(id);
      notes.delete(id);
    } catch (error: any) {
      console.error('Failed to delete note', error);
      setError('Failed to delete note.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchMetadata = async () => {
      setError(null);
      try {
        const response = await getNoteMetadata();
        const encryptedMetadataList = response.data;
        for (const encryptedMetadata of encryptedMetadataList) {
          try {
            const decryptedMetadata = JSON.parse(ab2str(await decryptAESGCM(metadataKey!, base642ab(encryptedMetadata.encryptedMetadata))));
            const metadata: NoteMetadata = {
              id: encryptedMetadata.id,
              title: decryptedMetadata.title,
              timestamp: new Date(decryptedMetadata.timestamp).toLocaleString(),
              lastModified: new Date(decryptedMetadata.lastModified).toLocaleString(),
            }
            notes.set(metadata.id, metadata);
          } catch (error: any) {
            console.error('Failed to decrypt note metadata for ', encryptedMetadata.id, error);
          }
        }
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch note metadata', error);
        setError('Failed to fetch notes.');
      } finally {
        setLoading(false);
      }
    };
  
    if (token && metadataKey) {
      fetchMetadata();
    }
  }, [token, metadataKey, notes]);

  // Sort notes based on the selected column and order
  const sortedNotes = Array.from(notes.values()).sort((a, b) => {
    if (!sortBy) return 0;
    const valueA = a[sortBy]!.toString().toLowerCase();
    const valueB = b[sortBy]!.toString().toLowerCase();

    if (sortOrder === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

  // Filter notes based on the filter text
  const filteredNotes = sortedNotes.filter(
    (note) => note.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const toggleSort = (column: keyof NoteMetadata) => {
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
          placeholder="Filter by title"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      {notes.size === 0 ? (
        <p>No notes stored.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2 text-amber-700">
                <button
                  onClick={() => toggleSort('title')}
                  className="flex items-center gap-1"
                >
                  Title
                  {sortBy === 'title' && (
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
              <th className="px-4 py-2 text-amber-700">
                <button
                  onClick={() => toggleSort('lastModified')}
                  className="flex items-center gap-1"
                >
                  Last Modified
                  {sortBy === 'lastModified' && (
                    sortOrder === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-amber-700"></th>
            </tr>
          </thead>
          <tbody>
            {filteredNotes.map((note) => (
              <tr key={note.id} className="border-t">
                <td className="px-4 py-2 text-yellow-700">{note.title}</td>
                <td className="px-4 py-2 text-yellow-700">{note.timestamp}</td>
                <td className="px-4 py-2 text-yellow-700">{note.lastModified}</td>
                <td className="px-4 py-2 flex space-x-2 float-right">
                  <button onClick={() => { setDialogOpen(true); setEditId(note.id); }} className="text-amber-500 hover:text-amber-800" aria-label="View">
                    <VisibilityIcon />
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="text-red-500 hover:text-red-800" aria-label="Delete">
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        onClick={() => { setDialogOpen(true); setEditId(null); }}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-4 rounded-full fixed bottom-8 right-8 shadow-lg"
      >
        <AddIcon className="text-white" />
      </button>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-50" aria-hidden="true" />
        <DialogPanel className="fixed inset-0 h-3/4 w-3/4 m-auto md-shadow">
          <NoteDialog id={editId} setOpen={setDialogOpen} onSave={() => setDialogOpen(false)}/>
        </DialogPanel>
      </Dialog>
    </div>
  );
};

export default NoteList;
