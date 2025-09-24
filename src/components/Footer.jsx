// src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Use Link for internal routes

const Footer = ({ darkMode }) => {
  return (
    <footer className={`mt-auto w-full ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
      

      {/* Links Section */}
      <div className="px-6 py-3">
        <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/about" className="text-sm hover:underline">About</Link>
            <a href="#" className="text-sm hover:underline">Business</a>
            <a href="#" className="text-sm hover:underline">How Search works</a>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/privacy" className="text-sm hover:underline">Privacy</Link>
            <Link to="/terms" className="text-sm hover:underline">Terms</Link>
            <Link to="/settings" className="text-sm hover:underline">Settings</Link>
          </div>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
