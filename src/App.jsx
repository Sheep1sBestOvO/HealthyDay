import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HealthyDayApp from "./pages/HealthyDayApp"; // Dashboard
import FridgePage from "./pages/FridgePage"; // Will be IngredientsPage
import RecipeResultPage from "./pages/RecipeResultPage"; // MenuPage
import PreferencesPage from "./pages/PreferencesPage";
import SavedRecipesPage from "./pages/SavedRecipesPage";
import Header from "./components/Header";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore session from localStorage (simplified - verify on first API call)
  useEffect(() => {
    const storedUser = localStorage.getItem("healthy_day_user");
    const token = localStorage.getItem("token");
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data:", e);
        localStorage.removeItem("healthy_day_user");
        localStorage.removeItem("token");
      }
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem("healthy_day_user", JSON.stringify(loggedInUser));
    navigate("/"); 
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("healthy_day_user");
    navigate("/login");
  };

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Allow login page to be accessed without authentication
  if (location.pathname === "/login") {
    // If already logged in, redirect to dashboard
    if (user) {
      return <Navigate to="/" replace />;
    }
    // If not logged in, show login page
    return (
      <div className="app-root">
        <main className="app-main-container">
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          </Routes>
        </main>
      </div>
    );
  }

  // If not logged in and trying to access protected routes, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-root">
      {/* Show Header only if logged in */}
      {user && <Header user={user} onLogout={handleLogout} />}

      <main className="app-main-container">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<HealthyDayApp user={user} />} />
          
          {/* We map existing pages to new routes temporarily */}
          <Route path="/ingredients" element={<FridgePage user={user} />} />
          <Route path="/recipes" element={<RecipeResultPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/saved-recipes" element={<SavedRecipesPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
