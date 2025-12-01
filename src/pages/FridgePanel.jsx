// src/components/FridgePanel.jsx
import { useEffect, useState } from "react";
import "../App.css";
import { fetchFridge, addIngredient, deleteIngredient } from "../api";

export default function FridgePanel() {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "",
  });

  // Load existing ingredients on first render
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFridge();
        setFridgeItems(data);
      } catch (err) {
        console.error("Failed to load fridge items:", err);
      }
    })();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newIngredient.name.trim()) {
      alert("Please enter an ingredient name.");
      return;
    }

    try {
      const created = await addIngredient(newIngredient);
      setFridgeItems((prev) => [...prev, created]);
      setNewIngredient({ name: "", quantity: "", unit: "" });
    } catch (err) {
      console.error("Failed to add ingredient:", err);
      alert("Failed to add ingredient.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteIngredient(id);
      setFridgeItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete ingredient:", err);
      alert("Failed to delete ingredient.");
    }
  };

  return (
    <section className="panel fridge-panel">
      <h2>My Fridge 🧊</h2>

      <form className="fridge-form" onSubmit={handleAdd}>
        <input
          placeholder="Ingredient name (e.g., chicken breast)"
          value={newIngredient.name}
          onChange={(e) =>
            setNewIngredient((prev) => ({ ...prev, name: e.target.value }))
          }
        />
        <input
          placeholder="Amount"
          value={newIngredient.quantity}
          onChange={(e) =>
            setNewIngredient((prev) => ({
              ...prev,
              quantity: e.target.value,
            }))
          }
        />
        <input
          placeholder="Unit (g, pieces, ml...)"
          value={newIngredient.unit}
          onChange={(e) =>
            setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))
          }
        />
        <button type="submit">Add</button>
      </form>

      <ul className="fridge-list">
        {fridgeItems.length === 0 && (
          <li className="empty">No ingredients recorded yet.</li>
        )}
        {fridgeItems.map((item) => (
          <li key={item.id} className="fridge-item">
            <span>
              {item.name}{" "}
              {item.quantity && `${item.quantity}${item.unit || ""}`}
            </span>
            <button onClick={() => handleDelete(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}