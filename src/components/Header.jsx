import { Link, useLocation, useNavigate } from "react-router-dom";
import "../App.css";

export default function Header({ user, onLogout }) {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <header className="app-header-global">
      <div className="header-left">
        <Link to="/" className="logo-link">
          <span className="logo-icon">🥗</span>
          <span className="logo-text">Healthy Day</span>
        </Link>
      </div>

      <nav className="header-nav">
        <Link to="/" className={isActive("/")}>Dashboard</Link>
        <Link to="/ingredients" className={isActive("/ingredients")}>My Fridge</Link>
        <Link to="/preferences" className={isActive("/preferences")}>Preferences</Link>
        <Link to="/menu" className={`${isActive("/menu")} btn-nav-highlight`}>
          ✨ Generate Menu
        </Link>
      </nav>

      <div className="header-right">
        <span className="user-welcome">Hi, {user?.name || user?.username}</span>
        <button className="btn-logout" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

