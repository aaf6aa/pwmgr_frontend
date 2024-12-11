import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar: React.FC = () => {
  const { token, logout } = useContext(AuthContext);

  return (
    <nav className="bg-amber-400 p-4 w-full flex justify-between fixed top-0 z-10 shadow-sm backdrop-filter backdrop-blur-lg bg-opacity-45">
      {token && (
        <div className="flex space-x-8 justify-center items-center w-screen">
          <Link to="/passwords" className="mr-auto text-yellow-700 hover:text-black drop-shadow">
            Passwords
          </Link>
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
