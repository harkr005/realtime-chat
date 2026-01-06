import React, { useEffect, useRef } from 'react';
import Avatar from './Avatar';
import CustomAudioPlayer from './CustomAudioPlayer';

const MessageArea = ({ messages, currentChat, currentUser, scrollRef, typing }) => {
  // Simple time formatter if date-fns is not available
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Date formatter for dividers
  const formatDateDivider = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="chat-messages">
      {messages.map((msg, index) => {
        const fromSelf = msg.fromSelf || msg.from === (currentUser.id || currentUser._id);
        const prevMsg = messages[index - 1];
        const showDivider = !prevMsg ||
          new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

        return (
          <React.Fragment key={msg._id || index}>
            {showDivider && (
              <div className="date-divider">
                <span>{formatDateDivider(msg.createdAt)}</span>
              </div>
            )}
            <div className={`message ${fromSelf ? "sended" : "received"}`}>
              <div className="content">
                {msg.type === "image" ? (
                  <img src={msg.image} alt="Sent attachment" className="message-image" />
                ) : msg.type === "audio" ? (
                  <CustomAudioPlayer src={msg.audio} />
                ) : (
                  <p>{msg.text}</p>
                )}
                <div className="meta">
                  <span className="timestamp">{msg.createdAt ? formatTime(msg.createdAt) : "Just now"}</span>
                  {fromSelf && (
                    <span className={`ticks ${msg.read ? "read" : ""}`}>
                      {msg.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={scrollRef} />

      {typing && (
        <div className="message received typing-indicator">
          <div className="content typing-bubble">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .chat-messages {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          overflow-y: auto;
          min-height: 0; /* IMPT: Keeps scrollbar working */
        }
        
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }

        .message {
          display: flex;
          align-items: center;
        }
        .message.sended { justify-content: flex-end; }
        .message.received { justify-content: flex-start; }

        .content {
          max-width: 60%;
          padding: 12px 20px;
          font-size: 1rem;
          border-radius: 18px;
          color: #d1d1d1;
          position: relative;
          word-wrap: break-word;
          animation: fadeIn 0.3s ease;
        }

        .sended .content {
          background-color: var(--bubble-sent);
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .received .content {
          background-color: var(--bubble-received);
          border-bottom-left-radius: 4px;
        }

        .timestamp {
          font-size: 0.65rem;
          opacity: 0.7;
        }

        .meta {
           display: flex;
           align-items: center;
           justify-content: flex-end;
           gap: 5px;
           margin-top: 5px; 
        }

        .ticks {
           font-size: 0.7rem;
           color: #aaa;
           line-height: 1;
        }
        .ticks.read {
           color: #4da6ff; /* Blue for read */
        }

        /* Typing Animation */
        .typing-bubble {
          display: flex;
          gap: 5px;
          padding: 15px !important;
          align-items: center;
        }
        .typing-bubble span {
          width: 8px;
          height: 8px;
          background: #aaa;
          border-radius: 50%;
          animation: typing 1.5s infinite ease-in-out;
        }
        .typing-bubble span:nth-child(1) { animation-delay: 0s; }
        .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
        .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }

        .date-divider {
          display: flex;
          justify-content: center;
          margin: 15px 0;
        }
        .date-divider span {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
        }

        .message-image {
          max-width: 100%;
          border-radius: 10px;
          margin-bottom: 5px;
          display: block;
        }

        .message-audio {
          width: 250px;
          margin-bottom: 5px;
        }

        @keyframes typing {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MessageArea;