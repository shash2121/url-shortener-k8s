import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="text-xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LinkShrink
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-white/60 hover:text-white transition-colors text-sm">
                Dashboard
              </Link>
              <Link to="/admin" className="text-white/60 hover:text-white transition-colors text-sm">
                Admin
              </Link>
              <span className="text-white/35 text-sm">{user?.email}</span>
              <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost px-4 py-2 text-sm">
                Login
              </Link>
              <Link to="/signup" className="btn-primary px-4 py-2 text-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
