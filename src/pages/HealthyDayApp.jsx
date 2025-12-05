import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchFridge, fetchPreferences } from "../api";
import "../App.css";

export default function HealthyDayApp({ user }) {
  const [stats, setStats] = useState({
    fridgeCount: 0,
    expiringSoon: [],
    dietary: "Standard"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [fridgeData, prefData] = await Promise.all([
          fetchFridge(),
          fetchPreferences()
        ]);

        // Process Fridge Data
        const today = new Date();
        const expiring = fridgeData.filter(item => {
          if (!item.expiryDate) return false;
          const expiry = new Date(item.expiryDate);
          const diffTime = expiry - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          return diffDays <= 3 && diffDays >= 0; // Expiring in next 3 days
        }).map(item => {
          const diffDays = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
          return { ...item, days: diffDays };
        }).sort((a, b) => a.days - b.days).slice(0, 3); // Top 3

        // Process Preferences
        const dietaryLabel = prefData.dietaryType || "Standard";

        setStats({
          fridgeCount: fridgeData.length,
          expiringSoon: expiring,
          dietary: dietaryLabel
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
          <p className="stat-number">{loading ? "..." : stats.fridgeCount}</p>
          <p className="stat-label">Items in stock</p>
          <div className="card-footer">Manage Ingredients →</div>
        </Link>

        {/* Card 2: Saved Recipes */}
        <Link to="/saved-recipes" className="dash-card highlight">
          <div className="card-icon-bg orange">⭐</div>
          <h3>Saved Recipes</h3>
          <div>
            <p className="stat-text">Favorites</p>
            <p className="stat-label">Your collection</p>
          </div>
          <div className="card-footer">View Collection →</div>
        </Link>

        {/* Card 3: Preferences */}
        <Link to="/preferences" className="dash-card">
          <div className="card-icon-bg blue">⚙️</div>
          <h3>Preferences</h3>
          <p className="stat-text">{loading ? "..." : stats.dietary}</p>
          <p className="stat-label">Dietary Profile</p>
          <div className="card-footer">Update Settings →</div>
        </Link>
      </div>

      {/* Alerts Section */}
      <div className="dashboard-section">
        <h2>Expiring Soon</h2>
        <div className="alert-list">
          {loading ? (
            <p className="loading-text">Checking freshness...</p>
          ) : stats.expiringSoon.length > 0 ? (
            stats.expiringSoon.map((item, i) => (
              <div key={i} className="alert-item">
                <span className="alert-icon">⏳</span>
                <div className="alert-info">
                  <strong>{item.name}</strong>
                  <span>Expires in {item.days} day{item.days !== 1 ? 's' : ''}</span>
                </div>
                <Link to="/ingredients" className="btn-check">Check</Link>
              </div>
            ))
          ) : (
            <div className="empty-alert-state">
              <span className="alert-icon-good">✅</span>
              <div className="alert-info">
                <strong>All good!</strong>
                <span>No items expiring soon.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
