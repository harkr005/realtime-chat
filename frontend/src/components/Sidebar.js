import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

export default function Sidebar({ currentUser, currentChat, changeChat, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchContacts() {
      if (currentUser) {
        try {
          const res = await axios.get(`${API_URL}/users/${currentUser.id || currentUser._id}`);
          setContacts(res.data);
        } catch (err) {
          console.error("Failed to load contacts", err);
        }
      }
    }
    fetchContacts();
  }, [currentUser]);

  const filteredContacts = contacts.filter(c =>
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar-container glass-panel">
      <div className="brand">
        <h3>🤖 BoloGPT</h3>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="contacts">
        {filteredContacts.map((contact) => (
          <div
            key={contact._id}
            className={`contact ${currentChat?._id === contact._id ? "selected" : ""}`}
            onClick={() => changeChat(contact)}
          >
            <div className="contact-avatar">
              <Avatar username={contact.username} image={contact.avatarImage} size="md" />
              {contact.isOnline && <span className="status-dot"></span>}
            </div>
            <div className="contact-info">
              <div className="contact-name">{contact.username}</div>
              <div className="contact-status">{contact.about}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="current-user">
        <div className="user-details">
          <Avatar username={currentUser.username} image={currentUser.avatarImage} size="md" />
          <div className="username">
            {currentUser.username}
            <span className="user-email">{currentUser.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <style jsx="true">{`
        .sidebar-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-right: none;
          background: var(--sidebar-bg);
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Scrollbar styles for entire sidebar */
        .sidebar-container::-webkit-scrollbar {
          width: 8px;
        }
        .sidebar-container::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .sidebar-container::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 10px;
        }
        .sidebar-container::-webkit-scrollbar-thumb:hover {
          background: var(--accent);
        }
        /* Firefox */
        .sidebar-container {
          scrollbar-width: thin;
          scrollbar-color: var(--glass-border) transparent;
        }

        .brand {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }
        .brand h3 { margin: 0; color: var(--accent); }
        
        .search-bar { 
          padding: 15px; 
          flex-shrink: 0; 
        }
        .search-bar input {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: var(--chat-bg);
          color: white;
        }

        .contacts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
          flex-shrink: 0;
        }

        .contact {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.3s;
          flex-shrink: 0;
        }
        .contact:hover { background: rgba(255,255,255,0.05); }
        .contact.selected { 
          background: linear-gradient(90deg, rgba(114, 9, 183, 0.5) 0%, rgba(114, 9, 183, 0.1) 100%);
          border-left: 4px solid var(--accent);
          box-shadow: 0 4px 15px rgba(114, 9, 183, 0.3);
        }

        .contact-avatar { position: relative; }
        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00ff00;
          border: 2px solid var(--sidebar-bg);
        }

        .contact-name { font-weight: 500; font-size: 1rem; }
        .contact-status { font-size: 0.8rem; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 150px; }

        .current-user {
          background: var(--chat-bg);
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--glass-border);
          flex-shrink: 0;
        }
        .user-details { display: flex; gap: 10px; align-items: center; }
        .username { display: flex; flex-direction: column; font-size: 0.9rem; font-weight: bold; }
        .user-email { font-size: 0.7rem; color: var(--text-secondary); font-weight: normal; }

        .logout-btn {
          background: transparent;
          color: var(--accent);
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
