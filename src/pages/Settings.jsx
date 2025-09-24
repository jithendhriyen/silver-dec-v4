import React, { useState } from 'react';
import { 
  CogIcon,
  MoonIcon,
  SunIcon,
  CheckIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const Settings = ({ darkMode, setDarkMode }) => {
  const [searchLanguage, setSearchLanguage] = useState('English');
  const [safeSearch, setSafeSearch] = useState('Moderate');
  const [resultsPerPage, setResultsPerPage] = useState('10');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <CogIcon className="h-8 w-8 mr-3 text-blue-500" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Search Preferences
          </h1>
        </div>
        
        <div className="space-y-8">
          {/* Appearance Section */}
          <section className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-sm transition-all duration-200 hover:shadow-md`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                {darkMode ? (
                  <MoonIcon className="h-5 w-5 text-blue-400" />
                ) : (
                  <SunIcon className="h-5 w-5 text-blue-600" />
                )}
              </span>
              Appearance Settings
            </h2>
            
            <div className="space-y-4 pl-11">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {darkMode ? 'Dark theme reduces eye strain' : 'Light theme is easier to read'}
                  </p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative inline-flex items-center h-7 rounded-full w-14 transition-colors focus:outline-none ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block w-5 h-5 transform transition-transform ${
                      darkMode ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'
                    } rounded-full shadow-md`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Language Section */}
          <section className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-sm transition-all duration-200 hover:shadow-md`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </span>
              Language & Region
            </h2>
            
            <div className="space-y-4 pl-11">
              <div className="relative">
                <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search Language
                </label>
                <div className="relative">
                  <select
                    value={searchLanguage}
                    onChange={(e) => setSearchLanguage(e.target.value)}
                    className={`appearance-none w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Japanese</option>
                    <option>Chinese</option>
                    <option>Russian</option>
                  </select>
                  <ChevronDownIcon className={`absolute right-3 top-3.5 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              </div>
            </div>
          </section>

          {/* SafeSearch Section */}
          <section className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-sm transition-all duration-200 hover:shadow-md`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              SafeSearch Filters
            </h2>
            
            <div className="space-y-3 pl-11">
              <div className={`p-4 rounded-lg cursor-pointer transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${
                safeSearch === 'Strict' ? (darkMode ? 'bg-gray-700 border border-blue-500' : 'bg-blue-50 border border-blue-500') : ''
              }`}
                onClick={() => setSafeSearch('Strict')}
              >
                <div className="flex items-start">
                  <div className={`flex items-center justify-center h-5 w-5 rounded-full border mr-3 mt-0.5 ${
                    safeSearch === 'Strict' ? 'bg-blue-500 border-blue-500' : (darkMode ? 'border-gray-500' : 'border-gray-300')
                  }`}>
                    {safeSearch === 'Strict' && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-medium">Strict</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Filter both explicit text and explicit images
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg cursor-pointer transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${
                safeSearch === 'Moderate' ? (darkMode ? 'bg-gray-700 border border-blue-500' : 'bg-blue-50 border border-blue-500') : ''
              }`}
                onClick={() => setSafeSearch('Moderate')}
              >
                <div className="flex items-start">
                  <div className={`flex items-center justify-center h-5 w-5 rounded-full border mr-3 mt-0.5 ${
                    safeSearch === 'Moderate' ? 'bg-blue-500 border-blue-500' : (darkMode ? 'border-gray-500' : 'border-gray-300')
                  }`}>
                    {safeSearch === 'Moderate' && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-medium">Moderate</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Filter explicit images only (default behavior)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg cursor-pointer transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${
                safeSearch === 'Off' ? (darkMode ? 'bg-gray-700 border border-blue-500' : 'bg-blue-50 border border-blue-500') : ''
              }`}
                onClick={() => setSafeSearch('Off')}
              >
                <div className="flex items-start">
                  <div className={`flex items-center justify-center h-5 w-5 rounded-full border mr-3 mt-0.5 ${
                    safeSearch === 'Off' ? 'bg-blue-500 border-blue-500' : (darkMode ? 'border-gray-500' : 'border-gray-300')
                  }`}>
                    {safeSearch === 'Off' && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-medium">Off</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Do not filter my search results
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results Section */}
          <section className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-sm transition-all duration-200 hover:shadow-md`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`p-2 mr-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              Search Results
            </h2>
            
            <div className="space-y-4 pl-11">
              <div className="relative">
                <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Results Per Page
                </label>
                <div className="relative">
                  <select
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(e.target.value)}
                    className={`appearance-none w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="10">10 results</option>
                    <option value="20">20 results</option>
                    <option value="30">30 results</option>
                    <option value="50">50 results</option>
                    <option value="100">100 results</option>
                  </select>
                  <ChevronDownIcon className={`absolute right-3 top-3.5 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                saved 
                  ? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')
              }`}
            >
              {saved ? (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Settings Saved
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;