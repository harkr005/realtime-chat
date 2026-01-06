import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import MessageArea from './MessageArea';
import Avatar from './Avatar';
import EmojiPicker from 'emoji-picker-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:5000';

export default function Chat({ user, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef();

  // Connect to Socket
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found for socket connection');
        return;
      }

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✓ Socket connected');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      setSocket(newSocket);
      return () => {
        newSocket.off('connect');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Handle Socket Events
  useEffect(() => {
    if (socket) {
      // Identity
      socket.emit("joinRoom", user.id || user._id);

      const handleNewMessage = (msg) => {
        if (currentChat && (msg.from === currentChat._id || msg.to === currentChat._id)) {
          setMessages((prev) => {
            const exists = prev.some(m => m._id === msg._id);
            if (exists) return prev;
            // If message is from current chat, mark as read immediately
            if (msg.from === currentChat._id) {
              markAsRead(currentChat._id);
            }
            return [...prev, { ...msg, fromSelf: msg.from === (user.id || user._id) }];
          });
        }
      };

      const handleTyping = ({ from, typing }) => {
        if (currentChat && from === currentChat._id) {
          setIsTyping(typing);
        }
      };

      const handleMessagesRead = ({ from }) => {
        if (currentChat && from === currentChat._id) {
          setMessages(prev => prev.map(msg =>
            msg.to === currentChat._id ? { ...msg, read: true } : msg
          ));
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('messagesRead', handleMessagesRead);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('messagesRead', handleMessagesRead);
      };
    }
  }, [socket, currentChat, user]);

  // Mark messages as read API call
  const markAsRead = async (fromId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/messages/read/${fromId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  // Load Messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (currentChat) {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };

          // Mark as read when opening chat
          markAsRead(currentChat._id);

          const res = await axios.get(`${API_URL}/messages/${currentChat._id}`, config);
          setMessages(res.data.map(m => ({ ...m, fromSelf: m.from === (user.id || user._id) })));
        } catch (err) {
          console.error("Error loading messages:", err);
        }
      }
    };
    fetchMessages();
  }, [currentChat, user]);

  // Handle Send
  const handleSend = async (e) => {
    e.preventDefault();
    if (text.trim().length > 0 && socket && socket.connected && currentChat) {
      socket.emit('sendMessage', { to: currentChat._id, text });
      setText("");
    }
  };

  // Handle Typing
  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !currentChat) return;

    socket.emit('typing', { to: currentChat._id, typing: true });

    setTimeout(() => {
      socket.emit('typing', { to: currentChat._id, typing: false });
    }, 2000);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChangeChat = (chat) => {
    setCurrentChat(chat);
  };

  // Handle Emoji Click
  const onEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  // Audio Recording Logic
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });
        handleAudioUpload(audioFile);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file); // Multer logic reuses 'image' field for file uploads ideally, or we can update backend to accept 'file' field but 'image' works as generic key if we don't change backend validation

    // NOTE: In the backend 'upload.single('image')' is used. keeping it consistent.

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const audioUrl = res.data.imageUrl; // Backend returns { imageUrl: ... }

      socket.emit('sendMessage', {
        to: currentChat._id,
        text: "",
        type: "audio",
        audio: audioUrl
      });
    } catch (err) {
      console.error("Audio upload failed:", err);
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const imageUrl = res.data.imageUrl;
      // Send image message via socket
      socket.emit('sendMessage', {
        to: currentChat._id,
        text: "",
        type: "image",
        image: imageUrl
      });
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-body glass-panel">
        <div className="sidebar-wrapper">
          <Sidebar
            currentUser={user}
            changeChat={handleChangeChat}
            currentChat={currentChat}
            onLogout={onLogout}
          />
        </div>

        <div className="chat-area-wrapper">
          {currentChat ? (
            <>
              <div className="chat-header">
                <Avatar username={currentChat.username} image={currentChat.avatarImage} size="md" />
                <div className="header-info">
                  <h3>{currentChat.username}</h3>
                  <span className="status-text">
                    {isTyping ? "Typing..." : "Online"}
                  </span>
                </div>
              </div>

              <MessageArea
                messages={messages}
                currentChat={currentChat}
                currentUser={user}
                scrollRef={scrollRef}
                typing={isTyping}
              />

              <div className="chat-input-container">
                {showEmoji && (
                  <div className="emoji-picker-wrapper">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme="dark"
                      width="100%"
                      height="350px"
                    />
                  </div>
                )}
                <div className="chat-input">
                  <button
                    className="emoji-btn"
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                  >
                    😊
                  </button>
                  <label className="emoji-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    📎
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </label>
                  <button
                    className={`emoji-btn ${isRecording ? "recording" : ""}`}
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    style={{ color: isRecording ? '#ff4d4d' : 'inherit' }}
                  >
                    {isRecording ? "⏹" : "🎤"}
                  </button>
                  <form className="input-form" onSubmit={handleSend}>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={text}
                      onChange={handleTyping}
                      onFocus={() => setShowEmoji(false)}
                    />
                    <button type="submit" className="send-btn">➤</button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="welcome-screen">
              <Avatar username={user.username} image={user.avatarImage} size="xl" />
              <h2>Welcome, {user.username}!</h2>
              <p>Select a contact to start chatting.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .chat-container {
          height: 90vh;
          width: 90vw;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .chat-body {
          height: 100%;
          width: 100%;
          display: grid;
          grid-template-columns: 25% 75%;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .chat-container {
             width: 100vw;
             height: 100vh;
             border-radius: 0;
          }
          .chat-body { 
            grid-template-columns: 100%;
            border-radius: 0;
            border: none;
          }
          .sidebar-wrapper { 
            display: ${currentChat ? 'none' : 'block'}; 
            width: 100%;
            height: 100%;
          }
          .chat-area-wrapper { 
            display: ${currentChat ? 'flex' : 'none'}; 
            width: 100%;
            height: 100%;
          }
        }

        .chat-area-wrapper {
          display: flex;
          flex-direction: column;
          background: var(--chat-bg);
          height: 100%;
          min-height: 0; 
          position: relative;
        }

        .chat-header {
          padding: 15px 30px;
          display: flex;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.1);
          flex-shrink: 0;
        }
        .header-info h3 { margin: 0; font-size: 1.1rem; }
        .status-text { font-size: 0.8rem; color: var(--primary); }

        .chat-input-container {
           position: relative;
           flex-shrink: 0;
        }

        .emoji-picker-wrapper {
          position: absolute;
          bottom: 80px;
          left: 20px;
          z-index: 10;
        }

        .chat-input {
          padding: 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .emoji-btn {
           background: transparent;
           border: none;
           font-size: 1.5rem;
           cursor: pointer;
           padding: 5px;
           border-radius: 50%;
           transition: 0.2s;
        }
        .emoji-btn:hover { background: rgba(255,255,255,0.1); }
        .emoji-btn.recording {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 77, 77, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
        }

        .input-form {
          display: flex;
          width: 100%;
          gap: 10px;
        }

        .chat-input input {
          flex: 1;
          padding: 12px 20px;
          border-radius: 30px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 1rem;
        }
        .send-btn {
          background: var(--primary);
          color: white;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 1.2rem;
          cursor: pointer;
          border: none;
        }
        .send-btn:hover { background: var(--accent); }

        .welcome-screen {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            gap: 20px;
        }
      `}</style>
    </div>
  );
}