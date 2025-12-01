import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

export default function HealthyDayApp({ user }) {
  // Mock data for dashboard overview
  const [stats] = useState({
    fridgeCount: 12,
    expiringSoon: [
      { name: "Milk", days: 2 },
      { name: "Spinach", days: 3 }
    ],
    lastMenu: null // or { name: "Chicken Salad", calories: 350 }
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <h1>Welcome back, {user?.name || user?.username}! 👋</h1>
          <p className="date-text">{today}</p>
          <p className="banner-subtitle">
            Ready to cook something healthy today?
          </p>
        </div>
        <div className="banner-illustration">🥗</div>
      </div>

      {/* Quick Actions Grid */}
      <div className="dashboard-grid">
        {/* Card 1: Fridge Status */}
        <Link to="/ingredients" className="dash-card">
          <div className="card-icon-bg green">📦</div>
          <h3>My Fridge</h3>
          <p className="stat-number">{stats.fridgeCount}</p>
          <p className="stat-label">Items in stock</p>
          <div className="card-footer">Manage Ingredients →</div>
        </Link>

        {/* Card 2: Menu Status */}
        <Link to="/menu" className="dash-card highlight">
          <div className="card-icon-bg orange">👨‍🍳</div>
          <h3>Daily Menu</h3>
          {stats.lastMenu ? (
            <div>
              <p className="stat-text">{stats.lastMenu.name}</p>
              <p className="stat-label">Last generated</p>
            </div>
          ) : (
            <div>
              <p className="stat-text">Not generated yet</p>
              <p className="stat-label">Create your plan</p>
            </div>
          )}
          <div className="card-footer">Go to Generator →</div>
        </Link>

        {/* Card 3: Preferences */}
        <Link to="/preferences" className="dash-card">
          <div className="card-icon-bg blue">⚙️</div>
          <h3>Preferences</h3>
          <p className="stat-text">Vegetarian</p>
          <p className="stat-label">Dietary Profile</p>
          <div className="card-footer">Update Settings →</div>
        </Link>
      </div>

      {/* Alerts Section */}
      <div className="dashboard-section">
        <h2>⚠️ Expiring Soon</h2>
        <div className="alert-list">
          {stats.expiringSoon.map((item, i) => (
            <div key={i} className="alert-item">
              <span className="alert-icon">⏳</span>
              <div className="alert-info">
                <strong>{item.name}</strong>
                <span>Expires in {item.days} days</span>
              </div>
              <Link to="/ingredients" className="btn-check">Check</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
