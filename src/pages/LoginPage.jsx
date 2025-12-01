import { useState } from "react";
import "../App.css";
import { loginUser, registerUser } from "../api";

export default function LoginPage({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await registerUser(username, password);
        alert("Registration successful! Please log in.");
        setIsRegistering(false);
      } else {
        const data = await loginUser(username, password);
        onLogin(data.user);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className={`auth-page-container ${isRegistering ? "mode-register" : "mode-login"}`}>
      {/* Background Pattern Overlay */}
      <div className="bg-pattern"></div>

      <div className="auth-content-wrapper">
        <div className="auth-header-section">
          <div className="brand-logo">
            <span className="leaf-icon">🥗</span> 
            <span className="brand-name">Healthy Day</span>
          </div>
          
          <h1 className="auth-title">
            {isRegistering ? "Create Account" : "Welcome Back!"}
          </h1>
          <p className="auth-subtitle">
            {isRegistering 
              ? "Join us to start your healthy journey" 
              : "Login to manage your fridge & recipes"}
          </p>
        </div>

        <form className="auth-form-modern" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              className="modern-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              className="modern-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="error-pill">⚠️ {error}</div>}

          <div className="auth-actions">
            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? "Processing..." : isRegistering ? "REGISTER" : "LOGIN"}
            </button>
          </div>

          <div className="auth-switch">
            <p>
              {isRegistering ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button type="button" className="btn-text-switch" onClick={toggleMode}>
              {isRegistering ? "Login here" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
