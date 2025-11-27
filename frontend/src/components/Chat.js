import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { connectSocket, getSocket } from '../services/socket';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Chat({ user, onLogout }) {
  const [toId, setToId] = useState("");
  const [messages, setMessages] = useState([]);   // must be an array
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [showUnreadBanner, setShowUnreadBanner] = useState(false);
  const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const unreadBannerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const toIdRef = useRef(toId);

  const myId = user?.id || user?._id;

  // Update ref when toId changes
  useEffect(() => {
    toIdRef.current = toId;
  }, [toId]);

  // Find first unread message index
  const findFirstUnreadIndex = useCallback((msgs) => {
    return msgs.findIndex(m => m.from !== myId && !m.read);
  }, [myId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (fromUserId) => {
    if (!fromUserId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/messages/read/${fromUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to mark messages as read
      setMessages(prev => prev.map(m => 
        m.from === fromUserId ? { ...m, read: true } : m
      ));
      setShowUnreadBanner(false);
      setFirstUnreadIndex(-1);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, []);

  // Scroll to unread banner or bottom
  useEffect(() => {
    if (showUnreadBanner && unreadBannerRef.current) {
      unreadBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showUnreadBanner]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const s = connectSocket(token);        // create or reuse
    socketRef.current = s;                 // IMPORTANT: assign to ref
    window.socket = s;                     // for quick console debugging
    console.log('socket assigned to window.socket ->', !!s);

    if (!s) {
      console.error('No socket created — token missing or connect failed');
      return;
    }

    s.on('connect', () => console.log('socket connected (client) id=', s.id, 'user:', JSON.parse(localStorage.getItem('user'))?.id));
    s.on('connect_error', (err) => console.error('socket connect_error', err));
    s.on('disconnect', () => console.log('socket disconnected (client)'));
    s.on('newMessage', async (msg) => {
      console.log('newMessage (client):', msg);
      const currentToId = toIdRef.current?.trim();
      const myUserId = JSON.parse(localStorage.getItem('user'))?.id;
      
      // If we're actively chatting with this person and they sent us a message,
      // mark it as read immediately
      if (msg.from === currentToId && msg.to === myUserId) {
        // Mark as read on server
        try {
          const token = localStorage.getItem('token');
          await axios.post(`${API}/messages/read/${msg.from}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          msg.read = true; // Mark locally as read
        } catch (err) {
          console.error('Error auto-marking message as read:', err);
        }
      }
      
      // ensure messages is array when updating
      setMessages(prev => Array.isArray(prev) ? [...prev, msg] : [msg]);
    });

    // Listen for messages being marked as read
    s.on('messagesRead', ({ by }) => {
      console.log('Messages marked as read by:', by);
    });

    // ask server to join personal room (safe)
    const myUser = JSON.parse(localStorage.getItem('user'));
    if (myUser?.id) s.emit('joinRoom', String(myUser.id));

    return () => {
      if (s) s.disconnect();
      window.socket = null;
      socketRef.current = null;
    };
  }, []);

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!toId) return alert('Paste the other user id into "Chat with" field.');
      const res = await axios.get(`${API}/messages/${toId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = res.data;
      // If API returns object with nested array, adapt (common shapes)
      if (data && data.messages && Array.isArray(data.messages)) data = data.messages;
      const arr = Array.isArray(data) ? data : (data ? [data] : []);
      
      // Check for unread messages
      const unreadIdx = findFirstUnreadIndex(arr);
      if (unreadIdx !== -1) {
        setFirstUnreadIndex(unreadIdx);
        setShowUnreadBanner(true);
      } else {
        setFirstUnreadIndex(-1);
        setShowUnreadBanner(false);
      }
      
      setMessages(arr);
      console.log('loaded messages ->', arr);
    } catch (err) {
      console.error('loadMessages error', err);
      setMessages([]); // fallback
    }
  };

  const sendMessage = () => {
    const toClean = (toId || '').trim();
    const textClean = (text || '').trim();

    if (!toClean) {
      alert('Enter the other user id to chat with');
      return;
    }
    if (!textClean) return; // don't send empty messages

    console.log('EMIT sendMessage -> to:', toClean, 'text:', textClean);

    const s = socketRef.current;
    if (!s || !s.connected) {
      console.error('Socket not connected', s);
      alert('Socket not connected. Make sure backend is running.');
      return;
    }

    // emit to server (server will broadcast back to both users)
    s.emit('sendMessage', { to: toClean, text: textClean });

    // When you reply, mark their messages as read
    if (showUnreadBanner) {
      markMessagesAsRead(toClean);
    }

    setText(''); // clear input
  };

  return (
    <div>
      <h2>Welcome {user?.username}</h2>

      <button onClick={onLogout}>Logout</button>

      <br /><br />

      <input
        placeholder="Enter user ID to chat with"
        value={toId}
        onChange={(e) => setToId(e.target.value)}
      />
      <button onClick={loadMessages}>Load Messages</button>

      <div 
        ref={chatContainerRef}
        style={{ border: "1px solid #ccc", height: "300px", overflow: "auto", marginTop: 10 }}
      >
        {(Array.isArray(messages) ? messages : []).map((m, index) => (
          <React.Fragment key={m._id || m.createdAt || Math.random()}>
            {/* Unread messages banner */}
            {showUnreadBanner && index === firstUnreadIndex && (
              <div 
                ref={unreadBannerRef}
                onClick={() => markMessagesAsRead(toId.trim())}
                style={{
                  background: '#25D366',
                  color: 'white',
                  textAlign: 'center',
                  padding: '8px',
                  margin: '10px 0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                ↓ {messages.filter(msg => msg.from !== myId && !msg.read).length} UNREAD MESSAGES — Click to mark as read
              </div>
            )}
            <div style={{ textAlign: (m.from === myId) ? "right" : "left", margin: 10 }}>
              <div>{m.text}</div>
              <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
            </div>
          </React.Fragment>
        ))}

        {typing && <i>typing...</i>}
        <div ref={messagesEndRef} />
      </div>

      <input
        style={{ width: "80%", marginTop: 10 }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          // emit typing only if socket exists
          if (socketRef?.current) {
            socketRef.current.emit("typing", { to: toId.trim(), typing: !!e.target.value });
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
