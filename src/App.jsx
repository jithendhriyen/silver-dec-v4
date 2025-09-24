import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import SearchResults from './components/SearchResults';
import ImageSearch from './components/ImageSearch';
import About from './pages/About';
import Images from './pages/Images';
import Login from './pages/Login';
import Privacy from './pages/Privacy';
import Settings from './pages/Settings';
import Store from './pages/Store';
import Terms from './pages/Terms';
import Signup from './pages/signup';



function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Router>
      <div className={`flex flex-col min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-black'}`}>
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />

        <main className="flex-grow pt-20 p-4">
<Routes>
  {/* ✅ Default path shows Home */}
  <Route path="/" element={<Home darkMode={darkMode} />} />

  {/* 🔁 Redirect /home to / */}
  <Route path="/home" element={<Navigate to="/" />} />

  <Route path="/search" element={<SearchResults darkMode={darkMode} />} />
  <Route path="/login" element={<Login darkMode={darkMode} />} />
  <Route path="/privacy" element={<Privacy darkMode={darkMode} />} />
  <Route path="/settings" element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />} />
  <Route path="/store" element={<Store darkMode={darkMode} />} />
  <Route path="/terms" element={<Terms darkMode={darkMode} />} />
  <Route path="/signup" element={<Signup darkMode={darkMode} />} />
  <Route path="/about" element={<About darkMode={darkMode} />} />
</Routes>


        </main>

        <Footer darkMode={darkMode} />
      </div>
    </Router>
  );
}

export default App;