import React from 'react';

const About = ({ darkMode }) => {
  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6">About Google</h1>
      
      <div className="space-y-4 leading-relaxed">
        <p>
          Google LLC is an American multinational technology company that specializes in Internet-related services and products, which include online advertising technologies, search engine, cloud computing, software, and hardware.
        </p>
        <p>
          Google was founded in September 1998 by Larry Page and Sergey Brin while they were Ph.D. students at Stanford University in California. Together they own about 14% of its shares and control 56% of the stockholder voting power through supervoting stock.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Our Mission</h2>
        <p>
          Google's mission is to organize the world's information and make it universally accessible and useful.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Our Products</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Google Search</li>
          <li>Google Chrome</li>
          <li>Android</li>
          <li>YouTube</li>
          <li>Google Maps</li>
          <li>Gmail</li>
          <li>Google Drive</li>
        </ul>
      </div>
    </div>
  );
};

export default About;
