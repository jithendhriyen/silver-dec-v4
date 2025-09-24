import React from 'react';

const Store = ({ darkMode }) => {
  const products = [
    {
      id: 1,
      name: 'Pixel 7 Pro',
      price: '$899',
      image: 'https://source.unsplash.com/featured/?google,phone',
      description: 'The Google phone with the best camera and battery life.'
    },
    {
      id: 2,
      name: 'Pixel Buds Pro',
      price: '$199',
      image: 'https://source.unsplash.com/featured/?earbuds',
      description: 'Premium sound with active noise cancellation.'
    },
    {
      id: 3,
      name: 'Nest Hub (2nd Gen)',
      price: '$99',
      image: 'https://source.unsplash.com/featured/?smart,display',
      description: 'Smart display with Google Assistant.'
    },
    {
      id: 4,
      name: 'Chromecast with Google TV',
      price: '$49',
      image: 'https://source.unsplash.com/featured/?streaming,device',
      description: 'Stream what you love in up to 4K HDR.'
    }
  ];

  return (
    <div className={`max-w-6xl mx-auto px-4 py-8 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-8">Google Store</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className={`rounded-lg overflow-hidden shadow-md transition-transform hover:scale-105 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {product.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="font-bold">{product.price}</span>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    darkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Buy
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Store;
