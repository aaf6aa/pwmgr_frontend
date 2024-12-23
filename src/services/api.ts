import axios from 'axios';

const API_BASE_URL = process.env.PWMGR_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL || '/api',
});

// Add interceptor to include JWT token
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Authentication APIs

// Register: Send username, password hash, and master key salt
export const register = (username: string, password: string, masterSalt: string) =>
  api.post('/register', { username, password, masterSalt });

// Login: Send username and password hash
export const login = (username: string, password: string) =>
  api.post('/login', { username, password });

// Password Management APIs
export const getPasswordMetadata = () => api.get('/passwords');

export const addEncryptedPassword = (data: any) =>
  api.post('/passwords', data);

export const getEncryptedPasswordById = (id: string) =>
  api.get(`/passwords/${id}`);

export const deleteEncryptedPasswordById = (id: string) =>
  api.delete(`/passwords/${id}`);

// Note Management APIs
export const getNoteMetadata = () => api.get('/notes');

export const addEncryptedNote = (data: any) =>
  api.post('/notes', data);

export const getEncryptedNoteById = (id: string) =>
  api.get(`/notes/${id}`);

export const updateEncryptedNote = (id: string, data: any) =>
  api.put(`/notes/${id}`, data);

export const deleteEncryptedNoteById = (id: string) =>
  api.delete(`/notes/${id}`);
