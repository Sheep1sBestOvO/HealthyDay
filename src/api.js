// src/api.js

const API_BASE = "http://localhost:5000/api";

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// --- Auth ---

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  // Store token
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
}

export async function registerUser(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Registration failed");
  }
  return res.json();
}

export function logoutUser() {
  localStorage.removeItem("token");
}

// -----------------------------
// Ingredient API (Real DB)
// -----------------------------

export async function fetchFridge() {
  const res = await fetch(`${API_BASE}/ingredients`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch ingredients");
  return res.json();
}

export async function addIngredient(ingredient) {
  const res = await fetch(`${API_BASE}/ingredients`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(ingredient),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add ingredient");
  }
  return res.json();
}

export async function updateIngredient(id, ingredient) {
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(ingredient),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update ingredient");
  }
  return res.json();
}

export async function deleteIngredient(id) {
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete ingredient");
  return res.json();
}

// -----------------------------
// Common Ingredient Search
// -----------------------------

export async function searchCommonIngredients(query) {
  const res = await fetch(`${API_BASE}/common-ingredients/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function seedCommonIngredients() {
  // Helper to seed DB if needed
  await fetch(`${API_BASE}/admin/seed-common`, { method: "POST" });
}

// -----------------------------
// Preferences API
// -----------------------------

export async function fetchPreferences() {
  const res = await fetch(`${API_BASE}/preferences`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json();
}

export async function updatePreferences(prefs) {
  const res = await fetch(`${API_BASE}/preferences`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error("Failed to update preferences");
  return res.json();
}

// -----------------------------
// Chat mock (optional)
// -----------------------------
export async function sendChatMessage(message) {
  // This would be connected to an AI endpoint later
  return {
    reply: "Here are some ideas!",
    recipes: [
      {
        id: 1,
        name: "Chicken Salad",
        tags: ["healthy", "high protein"],
        calories: 350,
        protein: 28,
        carbs: 10,
        fat: 18,
        usedIngredients: ["chicken"],
        description: "A simple fresh chicken salad.",
      },
    ],
  };
}
