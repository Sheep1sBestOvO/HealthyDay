// src/App.jsx
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import HealthyDayApp from "./pages/HealthyDayApp";
import FridgePage from "./pages/FridgePage";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("main"); // "main" or "fridge"

  const handleLogout = () => {
    setUser(null);
    setView("main"); // reset to main view when logging out
  };

  // Not logged in → show login page
  if (!user) {
    return (
      <LoginPage
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          setView("main");
        }}
      />
    );
  }

  // Logged in + fridge view → dedicated fridge page
  if (view === "fridge") {
    return (
      <FridgePage
        user={user}
        onLogout={handleLogout}
        onBackToMain={() => setView("main")}
      />
    );
  }

  // Logged in + main view → main Healthy Day app (fridge + chat + recipes)
  return (
    <HealthyDayApp
      user={user}
      onLogout={handleLogout}
      onOpenFridgePage={() => setView("fridge")}
    />
  );
}