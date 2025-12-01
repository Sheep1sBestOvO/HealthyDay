// src/api.js

// --- Mock storage ---
let _fridge = [
  // Example initial data (optional):
  // { id: 1, name: "Eggs", quantity: "6", unit: "pcs" },
  // { id: 2, name: "Broccoli", quantity: "1", unit: "head" }
];

let _nextId = 1;

// Simulate network delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------
// Fetch fridge items
// -----------------------------
export async function fetchFridge() {
  await delay(200);
  return [..._fridge];
}

// -----------------------------
// Add ingredient  ✔ THIS IS THE KEY
// -----------------------------
export async function addIngredient(ingredient) {
  await delay(200);

  if (!ingredient.name) {
    throw new Error("Invalid ingredient: name required");
  }

  const newItem = {
    id: _nextId++,
    name: ingredient.name.trim(),
    quantity: ingredient.quantity || "",
    unit: ingredient.unit || "",
  };

  _fridge.push(newItem);
  return newItem;
}

// -----------------------------
// Delete ingredient
// -----------------------------
export async function deleteIngredient(id) {
  await delay(200);
  _fridge = _fridge.filter(item => item.id !== id);
  return { success: true };
}

// -----------------------------
// Chat mock (optional)
// -----------------------------
export async function sendChatMessage(message) {
  await delay(300);

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
        description: "A simple fresh chicken salad."
      }
    ]
  };
}