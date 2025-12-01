import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HealthyDayApp from "./pages/HealthyDayApp"; // Dashboard
import FridgePage from "./pages/FridgePage"; // Will be IngredientsPage
import RecipeResultPage from "./pages/RecipeResultPage"; // MenuPage
import PreferencesPage from "./pages/PreferencesPage";
import Header from "./components/Header";

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("healthy_day_user");
    const token = localStorage.getItem("token");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
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

  // If not logged in, redirect to login (except for login page itself)
  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" />;
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
          <Route path="/menu" element={<RecipeResultPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
