import React from 'react';
import SearchBar from './Search'; // or './Search' if it's named Search.jsx
import { useLocation } from 'react-router-dom';

const ImageSearch = ({ darkMode }) => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') || '';

  const mockImages = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    src: `https://source.unsplash.com/random/300x300?sig=${i + 1}`,
    alt: `Image ${i + 1} related to ${query}`,
    title: `Image ${i + 1} about ${query}`,
    source: `https://example.com/image${i + 1}`
  }));

  return (
    <div className="px-4 py-6 min-h-screen">
      {/* Search Bar */}
      <div className="mb-6 max-w-2xl mx-auto">
        <SearchBar
          darkMode={darkMode}
          onSearch={() => {}}
          initialQuery={query}
        />
      </div>

      {/* Image Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {mockImages.map((image) => (
          <div key={image.id} className="group relative overflow-hidden rounded-lg">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-48 object-cover rounded-lg group-hover:brightness-75 transition duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-black bg-opacity-60 text-white p-2 rounded w-full">
                <p className="text-sm truncate">{image.title}</p>
                <a
                  href={image.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 hover:underline"
                >
                  View source
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageSearch;
