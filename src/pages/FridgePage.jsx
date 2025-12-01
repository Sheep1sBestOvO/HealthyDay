import "../App.css";
import FridgePanel from "./FridgePanel";

export default function FridgePage({ user, onLogout, onBackToMain }) {
  return (
    <div className="app fridge-page">
      <header className="app-header">
        <div className="header-left">
          <h1>Healthy Day 🥗</h1>
        </div>

        {/* no header-center here, otherwise text will appear in the middle */}
        <div className="header-right">
          <button className="secondary-btn" onClick={onBackToMain}>
            Back to main
          </button>
          <span className="welcome-text">Hi, {user?.name}</span>
          <button className="logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="fridge-page-main">
        <div className="fridge-page-inner">
          <FridgePanel />
        </div>
      </main>
    </div>
  );
}