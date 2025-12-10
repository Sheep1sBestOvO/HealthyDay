import { useState } from "react";
import "../App.css";
import { loginUser, registerUser, changePasswordByUsername } from "../api";

export default function LoginPage({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");

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
    setNewPassword("");
    setChangingPassword(false);
    setChangeMessage("");
  };

  const handleChangePassword = async () => {
    setError("");
    setChangeMessage("");
    if (!username.trim() || !newPassword.trim()) {
      setError("Please enter username and new password.");
      return;
    }
    setLoading(true);
    try {
      await changePasswordByUsername(username.trim(), newPassword.trim());
      setChangeMessage("Password updated. Please log in with your new password.");
      setPassword("");
      setNewPassword("");
      setChangingPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

          {!isRegistering && (
            <div className="auth-switch" style={{ marginTop: "0.5rem" }}>
              <p>Need to change password?</p>
              {!changingPassword ? (
                <button
                  type="button"
                  className="btn-text-switch"
                  onClick={() => {
                    setChangingPassword(true);
                    setChangeMessage("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Change password
                </button>
              ) : (
                <div className="change-password-box">
                  <input
                    type="password"
                    className="modern-input"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn-auth-submit"
                    onClick={handleChangePassword}
                    disabled={loading}
                    style={{ marginTop: "0.5rem" }}
                  >
                    {loading ? "Saving..." : "Save new password"}
                  </button>
                  <button
                    type="button"
                    className="btn-text-switch"
                    onClick={() => {
                      setChangingPassword(false);
                      setNewPassword("");
                      setChangeMessage("");
                    }}
                    disabled={loading}
                    style={{ marginTop: "0.25rem" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="auth-switch">
            <p>
              {isRegistering ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button type="button" className="btn-text-switch" onClick={toggleMode}>
              {isRegistering ? "Login here" : "Create account"}
            </button>
          </div>

          {changeMessage && !isRegistering && (
            <div className="success-pill">✅ {changeMessage}</div>
          )}
        </form>
      </div>
    </div>
  );
}
