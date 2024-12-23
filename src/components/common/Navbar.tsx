import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar: React.FC = () => {
  const { token, user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-amber-400 p-4 w-full flex justify-between fixed top-0 z-10 shadow-sm backdrop-filter backdrop-blur-lg bg-opacity-45">
      {token && (
        <div className="flex space-x-8 justify-center items-center w-screen">
          <div className="flex space-x-8 mr-auto">
            <Link to="/passwords" className="text-yellow-700 hover:text-black drop-shadow">
              Passwords
            </Link>
            <Link to="/notes" className="text-yellow-700 hover:text-black drop-shadow">
              Notes
            </Link>
          </div>
          <div className="text-amber-900">Hi, {user}</div>
          <button onClick={logout} className="ml-auto text-yellow-700 hover:text-black drop-shadow">
            Logout
          </button>
        </div>
      )}
      {!token && (
        <div className="flex space-x-8 justify-center items-center w-screen">
          <Link to="/login" className="ml-auto text-yellow-700 hover:text-black hover:text-black drop-shadow">
            Login
          </Link>
          <Link to="/register" className="ml-auto text-yellow-700 hover:text-black hover:text-black drop-shadow">
            Register
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
