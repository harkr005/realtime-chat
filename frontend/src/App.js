import React, { useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('Error parsing user from localStorage:', err);
      localStorage.removeItem('user');
      return null;
    }
  });

  return (
    <div className="app-container">
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <Chat user={user} onLogout={() => { localStorage.clear(); setUser(null); }} />
      )}
    </div>
  );
}

export default App;