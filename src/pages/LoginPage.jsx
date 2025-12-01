// src/pages/LoginPage.jsx
import { useState } from "react";
import "../App.css";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("Please enter a username.");
      return;
    }
    // Simple front-end demo login
    onLogin({ name: username.trim() });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">Healthy Day 🥗</h1>
        <p className="login-subtitle">
          Get healthy recipe ideas based on what&apos;s in your fridge.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            Username
            <input
              className="login-input"
              placeholder="e.g., stella"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="login-label">
            Password
            <input
              className="login-input"
              type="password"
              placeholder="Any password is fine for this demo."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" className="login-button">
            Log in
          </button>
        </form>

        <p className="login-hint">
          * This is a course demo. Your credentials are not sent to any real
          server.
        </p>
      </div>
    </div>
  );
}