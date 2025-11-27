import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const register = async () => {
    const res = await axios.post(`${API}/auth/register`, { username, email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    onLogin(res.data.user);
  };

  const login = async () => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    onLogin(res.data.user);
  };

  return (
    <div>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      {mode === "register" && (
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      )}
      <br />

      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <br />

      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <br />

      {mode === "login" ? (
        <button onClick={login}>Login</button>
      ) : (
        <button onClick={register}>Register</button>
      )}

      <br /><br />

      <button onClick={() => setMode(mode === "login" ? "register" : "login")}>
        Switch to {mode === "login" ? "Register" : "Login"}
      </button>
    </div>
  );
}
