import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  UserCircleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

const Header = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();

  const handleAccountClick = () => {
    navigate('/login');
  };

  return (
    <header className={`w-full py-3 px-4 sm:px-6 flex justify-between items-center fixed top-0 z-50 backdrop-blur-md ${darkMode ? 'bg-gray-900/80 text-gray-100 border-b border-gray-800' : 'bg-white/80 text-gray-800 border-b border-gray-200'} transition-all duration-300`}>
      {/* Left - Navigation */}
      <div className="flex items-center space-x-6">
        <Link 
          to="/home" 
          className="text-sm font-medium hover:text-blue-500 transition-colors duration-200 relative group"
        >
          Home
          <span className={`absolute -bottom-1 left-0 w-0 h-0.5 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} transition-all duration-300 group-hover:w-full`}></span>
        </Link>

      </div>

      {/* Right - Icons and Links */}
      <div className="flex items-center space-x-6">
        

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full transition-all duration-300 ${darkMode ? 'hover:bg-gray-700/80 text-yellow-300' : 'hover:bg-gray-200 text-gray-700'}`}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <SunIcon className="h-5 w-5 transform hover:rotate-180 transition-transform duration-500" />
          ) : (
            <MoonIcon className="h-5 w-5 transform hover:rotate-180 transition-transform duration-500" />
          )}
        </button>

        {/* Apps Button */}
        <button
          className={`p-2 rounded-full transition-all duration-300 ${darkMode ? 'hover:bg-gray-700/80' : 'hover:bg-gray-200'}`}
          aria-label="Google apps"
        >
          <Bars3BottomRightIcon className="h-5 w-5 hover:scale-110 transition-transform duration-200" />
        </button>

        {/* Account Button */}
        <button
          onClick={handleAccountClick}
          className={`p-1 rounded-full transition-all duration-300 ${darkMode ? 'hover:bg-gray-700/80' : 'hover:bg-gray-200'}`}
          aria-label="Google account"
        >
          <UserCircleIcon className="h-8 w-8 hover:scale-105 transition-transform duration-200" />
        </button>
      </div>
    </header>
  );
};

export default Header;