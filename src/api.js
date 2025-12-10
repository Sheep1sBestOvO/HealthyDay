// src/api.js

const API_BASE = "http://localhost:5001/api";

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// Helper to handle 401 errors (token expired/invalid)
function handleAuthError() {
  localStorage.removeItem("token");
  localStorage.removeItem("healthy_day_user");
  // Redirect to login if not already there
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// Helper to check response and handle 401
async function checkResponse(res) {
  if (res.status === 401) {
    handleAuthError();
    const err = await res.json().catch(() => ({ error: "Session expired" }));
    throw new Error(err.error || "Session expired. Please login again.");
  }
  return res;
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
  await checkResponse(res);
  if (!res.ok) throw new Error("Failed to fetch ingredients");
  return res.json();
}

export async function addIngredient(ingredient) {
  const res = await fetch(`${API_BASE}/ingredients`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(ingredient),
  });
  await checkResponse(res);
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
  await checkResponse(res);
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
  await checkResponse(res);
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
  await checkResponse(res);
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
  await checkResponse(res);
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json();
}

export async function updatePreferences(prefs) {
  const res = await fetch(`${API_BASE}/preferences`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(prefs),
  });
  await checkResponse(res);
  if (!res.ok) throw new Error("Failed to update preferences");
  return res.json();
}

// -----------------------------
// Recipe Generation API (LLM)
// -----------------------------

export async function generateRecipes(mealType = "Dinner") {
  const res = await fetch(`${API_BASE}/recipes/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ mealType }),
  });
  await checkResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to generate recipes");
  }
  return res.json();
}

// -----------------------------
// Voice Input / LLM Parsing API
// -----------------------------

export async function parseIngredientList(text) {
  const res = await fetch(`${API_BASE}/ingredients/parse`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  await checkResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to parse ingredients");
  }
  return res.json();
}

// -----------------------------
// Nutrition Info API (LLM)
// -----------------------------

export async function getNutritionInfo(ingredientName) {
  const res = await fetch(`${API_BASE}/ingredients/nutrition`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: ingredientName }),
  });
  await checkResponse(res);
  if (!res.ok) {
    const err = await res.json();
    // Return error object instead of throwing for rate limit
    if (res.status === 429 || err.error === "rate_limit") {
      return { error: "rate_limit", message: err.message || "API rate limit reached" };
    }
    throw new Error(err.error || "Failed to get nutrition information");
  }
  return res.json();
}

// -----------------------------
// Saved Recipes API
// -----------------------------

export async function getSavedRecipes() {
  const res = await fetch(`${API_BASE}/saved-recipes`, {
    headers: getAuthHeaders(),
  });
  await checkResponse(res);
  if (!res.ok) throw new Error("Failed to fetch saved recipes");
  return res.json();
}

export async function saveRecipe(recipe) {
  const res = await fetch(`${API_BASE}/saved-recipes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(recipe),
  });
  await checkResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save recipe");
  }
  return res.json();
}

// -----------------------------
// Account
// -----------------------------

export async function changePasswordByUsername(username, newPassword) {
  const res = await fetch(`${API_BASE}/change-password-username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to change password");
  }
  return res.json();
}

export async function deleteSavedRecipe(id) {
  const res = await fetch(`${API_BASE}/saved-recipes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await checkResponse(res);
  if (!res.ok) throw new Error("Failed to delete saved recipe");
  return res.json();
}
