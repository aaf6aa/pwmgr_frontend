// src/App.tsx
import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './components/Auth/Register';
import Login from './components/Auth/Login';
import PasswordList from './components/Password/PasswordList';
import NoteList from './components/Note/NoteList';
import Navbar from './components/common/Navbar';
import { setAuthToken } from './services/api';
import { useIdleTimer } from "react-idle-timer";

const AppRoutes: React.FC = () => {
  const { token, logout } = useContext(AuthContext);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Logout after 1 minute of inactivity
  useIdleTimer({
    timeout: 1 * 60 * 1000,
    onIdle: () => {
      if (token)
      {
        logout();
        setTimeout(function() { alert('You have been logged out due to inactivity.') }, 1); // Non-blocking alert
      }
    },
    debounce: 500
  });

  return (
    <Router>
      <Navbar />
      <div className="py-12 px-4 mt-8 mb-8">
        <Routes>
          <Route
            path="/"
            element={token ? <Navigate to="/passwords" /> : <Navigate to="/login" />}
          />
          <Route
            path="/register"
            element={!token ? <Register /> : <Navigate to="/passwords" />}
          />
          <Route
            path="/login"
            element={!token ? <Login /> : <Navigate to="/passwords" />}
          />
          <Route
            path="/passwords"
            element={token ? <PasswordList /> : <Navigate to="/login" />}
          />
          <Route
            path="/notes"
            element={token ? <NoteList /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<div className="p-6">404 Not Found</div>} />
        </Routes>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
