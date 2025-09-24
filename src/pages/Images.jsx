import React from 'react';

const Images = ({ darkMode }) => {
  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6">Google Images</h1>
      <p className="mb-6 leading-relaxed">
        Google Images is a search service owned by Google that allows users to search the World Wide Web for images.
        It was introduced on July 12, 2001.
      </p>
      
      <h2 className="text-2xl font-semibold mb-4">Features</h2>
      <ul className={`list-disc pl-6 space-y-2 mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <li>Search by image (reverse image search)</li>
        <li>Advanced search filters (size, color, type, time, usage rights)</li>
        <li>Visually similar images</li>
        <li>Collections and albums</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">How to Use</h2>
      <ol className={`list-decimal pl-6 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <li>Go to the Google Images homepage</li>
        <li>Enter your search query in the search box</li>
        <li>Use the filters to refine your search</li>
        <li>Click on an image to view it in more detail</li>
      </ol>
    </div>
  );
};

export default Images;
