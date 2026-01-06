import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
// Extract base URL for health check (remove /api)
const BASE_URL = API.replace('/api', '');

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [serverStatus, setServerStatus] = useState("checking"); // checking, online, offline

  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get(`${BASE_URL}/health`);
        setServerStatus("online");
      } catch (err) {
        console.error("Server Health Check Failed:", err);
        setServerStatus("offline");
      }
    };
    checkServer();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Simple validation
    if (mode === 'register' && !username) return setError("Username is required");
    if (!email || !password) return setError("Email and Password are required");

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload = mode === 'login' ? { email, password } : { username, email, password };

    try {
      const res = await axios.post(`${API}${endpoint}`, payload);

      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);

      onLogin(res.data.user);
    } catch (err) {
      console.error("Login Error:", err);
      if (err.response && err.response.data && err.response.data.msg) {
        setError(err.response.data.msg);
      } else {
        // Detailed network error message
        setError(`Cannot connect to server at ${API}. Is the backend running? (${err.message})`);
      }
    }
  };

  return (
    <div className="login-container glass-panel">
      <div className="brand">
        <h1>💬 ChatApp</h1>
        <p>{mode === 'login' ? "Welcome Back!" : "Create Account"}</p>
      </div>

      {/* Server Status Indicator */}
      <div className={`server-status ${serverStatus}`}>
        {serverStatus === 'checking' && "🔄 Checking Server..."}
        {serverStatus === 'online' && "🟢 Server Online"}
        {serverStatus === 'offline' && (
          <span>
            🔴 Server Unreachable<br />
            <small style={{ opacity: 0.8 }}>Ensure backend is running at {BASE_URL}</small>
          </span>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}
        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="auth-btn">
          {mode === 'login' ? "Access Chat" : "Register"}
        </button>
      </form>

      <div className="switch-auth">
        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
        <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(""); }}>
          {mode === 'login' ? " Register" : " Login"}
        </span>
      </div>

      <style jsx="true">{`
        .login-container {
            padding: 40px;
            width: 100%;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            color: white;
            text-align: center;
            background: var(--sidebar-bg);
        }
        .brand h1 { margin: 0; color: var(--primary); font-size: 2.5rem; }
        .brand p { margin: 5px 0 0; color: var(--text-secondary); }

        .server-status {
          padding: 8px;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-bottom: -10px;
        }
        .server-status.checking { background: rgba(255, 255, 255, 0.1); color: #ccc; }
        .server-status.online { background: rgba(0, 255, 128, 0.15); color: #00ff80; border: 1px solid rgba(0,255,128,0.2); }
        .server-status.offline { background: rgba(255, 77, 77, 0.15); color: #ff4d4d; border: 1px solid rgba(255,77,77,0.2); }

        .input-group input {
            width: 100%;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid var(--glass-border);
            background: var(--bg-color);
            color: white;
            margin-bottom: 10px;
        }
        .input-group input:focus { border-color: var(--primary); }

        .auth-btn {
            width: 100%;
            padding: 15px;
            background: var(--primary);
            color: white;
            border-radius: 12px;
            font-weight: bold;
            font-size: 1rem;
            margin-top: 10px;
        }
        .auth-btn:hover { background: var(--accent); }

        .error-msg {
            color: #ff4d4d;
            background: rgba(255, 77, 77, 0.1);
            padding: 10px;
            border-radius: 5px;
            font-size: 0.9rem;
            word-break: break-all;
        }

        .switch-auth {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        .switch-auth span {
            color: var(--primary);
            cursor: pointer;
            font-weight: bold;
        }
        .switch-auth span:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}