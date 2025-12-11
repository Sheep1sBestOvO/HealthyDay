import { useState, useEffect, useRef } from "react";
import "../App.css";
import { fetchFridge, addIngredient, deleteIngredient, searchCommonIngredients, updateIngredient, parseIngredientList, getNutritionInfo } from "../api";

export default function FridgePage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Search / Autocomplete State
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form State
  const [newIng, setNewIng] = useState({ 
    name: "", 
    quantity: "", 
    unit: "",
    expiryDate: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Confirm Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, []);

  // State for AI nutrition fetching
  const [fetchingNutrition, setFetchingNutrition] = useState(false);

  // Debounce search for common ingredients
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (ingredientSearch.trim().length > 1) {
        try {
          const results = await searchCommonIngredients(ingredientSearch);
          setSuggestions(results);
          setShowSuggestions(true);
          
          // If no suggestions found and user has typed a complete word, try AI nutrition
          if (results.length === 0 && ingredientSearch.trim().length > 2 && !showSuggestions) {
            // Wait a bit more to see if user is still typing
            setTimeout(async () => {
              const currentSearch = ingredientSearch.trim();
              if (currentSearch.length > 2 && !suggestions.length) {
                setFetchingNutrition(true);
                try {
                  const nutrition = await getNutritionInfo(currentSearch);
                  if (nutrition) {
                    setNewIng(prev => ({
                      ...prev,
                      calories: nutrition.calories || prev.calories,
                      protein: nutrition.protein || prev.protein,
                      carbs: nutrition.carbs || prev.carbs,
                      fat: nutrition.fat || prev.fat
                    }));
                  }
                } catch (err) {
                  console.log("Could not fetch nutrition:", err);
                } finally {
                  setFetchingNutrition(false);
                }
              }
            }, 1500); // Wait 1.5s after user stops typing
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [ingredientSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchFridge();
      setIngredients(data);
    } catch (err) {
      console.error("Failed to load ingredients", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setNewIng({
      ...newIng,
      name: item.name,
      unit: item.default_unit || item.unit || "g", // Auto-fill unit from DB
      calories: item.calories || "",
      protein: item.protein || "",
      carbs: item.carbs || "",
      fat: item.fat || ""
    });
    setIngredientSearch(item.name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameToUse = newIng.name || ingredientSearch; // Use search input if name empty
    if (!nameToUse.trim()) {
      alert("Please enter ingredient name.");
      return;
    }
    if (!newIng.quantity || isNaN(parseFloat(newIng.quantity))) {
      alert("Please enter a valid quantity before saving.");
      return;
    }

    try {
      const payload = { ...newIng, name: nameToUse };
      
      if (isEditing) {
        const updated = await updateIngredient(editingId, payload);
        setIngredients((prev) => prev.map(item => item.id === editingId ? updated : item));
        handleCancelEdit();
      } else {
        const added = await addIngredient(payload);
        setIngredients((prev) => [...prev, added]);
        handleResetForm();
      }
    } catch (err) {
      alert(isEditing ? "Failed to update ingredient" : "Failed to add ingredient");
    }
  };

  const handleEditClick = (item) => {
    setIsEditing(true);
    setEditingId(item.id);
    setNewIng({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate || "",
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat
    });
    setIngredientSearch(item.name);
  };

  const handleResetForm = () => {
    setNewIng({ 
      name: "", quantity: "", unit: "", expiryDate: "",
      calories: "", protein: "", carbs: "", fat: ""
    });
    setIngredientSearch("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    handleResetForm();
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteIngredient(itemToDelete);
      setIngredients((prev) => prev.filter((item) => item.id !== itemToDelete));
      if (editingId === itemToDelete) handleCancelEdit();
    } catch (err) {
      alert("Failed to delete");
    } finally {
      setShowConfirm(false);
      setItemToDelete(null);
    }
  };

  // Voice Quick Add removed

  // Filter logic
  const filteredIngredients = ingredients.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to determine freshness status color
  const getFreshnessStatus = (expiryDate) => {
    if (!expiryDate) return "status-good"; // Default
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "status-expired";
    if (daysLeft <= 3) return "status-warning";
    return "status-good";
  };

  return (
    <div className="page-container split-layout">
      {/* Custom Confirm Modal */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <div className="modal-icon-wrapper">
              <span className="modal-icon">🗑️</span>
            </div>
            <h3>Delete Ingredient?</h3>
            <p>This action cannot be undone. The ingredient will be permanently removed from your fridge.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel: Management Form */}
      <aside className="control-panel">
        <div className="panel-header">
          <h2>{isEditing ? "Edit Ingredient" : "My Fridge"}</h2>
        </div>

        <div className="add-section">
          <h3>{isEditing ? "Update Item" : "Add New Ingredient"}</h3>
          
          <form onSubmit={handleSubmit} className="vertical-form">
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Ingredient Name</label>
              <div style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  placeholder="Search (e.g. Apple, Chicken)..."
                  value={ingredientSearch}
                  onChange={(e) => {
                    setIngredientSearch(e.target.value);
                    setNewIng({ ...newIng, name: e.target.value }); // Update manual name too
                  }}
                  onFocus={() => ingredientSearch.length > 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-fetch-nutrition"
                  onClick={async () => {
                    const searchTerm = ingredientSearch.trim();
                    if (!searchTerm || searchTerm.length < 2) {
                      alert("Please enter an ingredient name first.");
                      return;
                    }
                    if (!newIng.quantity || isNaN(parseFloat(newIng.quantity))) {
                      alert("Please enter a valid quantity before checking nutrition.");
                      return;
                    }

                    // Check cache first
                    const cacheKey = `nutrition_${searchTerm.toLowerCase()}_${newIng.quantity}_${newIng.unit || ""}`;
                    const cached = localStorage.getItem(cacheKey);
                    const cacheTime = localStorage.getItem(`${cacheKey}_timestamp`);
                    const now = Date.now();
                    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
                    
                    if (cached && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
                      try {
                        const nutrition = JSON.parse(cached);
                        setNewIng(prev => ({
                          ...prev,
                          calories: (nutrition.total && nutrition.total.calories) || nutrition.calories || prev.calories,
                          protein: (nutrition.total && nutrition.total.protein) || nutrition.protein || prev.protein,
                          carbs: (nutrition.total && nutrition.total.carbs) || nutrition.carbs || prev.carbs,
                          fat: (nutrition.total && nutrition.total.fat) || nutrition.fat || prev.fat,
                          expiryDate: nutrition.suggestedExpiryDate || prev.expiryDate
                        }));
                        return;
                      } catch (e) {
                        // Cache parse error, continue to API call
                      }
                    }

                    setFetchingNutrition(true);
                    try {
                      const nutrition = await getNutritionInfo(searchTerm, newIng.quantity, newIng.unit);
                      if (nutrition && !nutrition.error) {
                        // Cache the result
                        localStorage.setItem(cacheKey, JSON.stringify(nutrition));
                        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
                        
                        setNewIng(prev => ({
                          ...prev,
                          calories: (nutrition.total && nutrition.total.calories) || nutrition.calories || prev.calories,
                          protein: (nutrition.total && nutrition.total.protein) || nutrition.protein || prev.protein,
                          carbs: (nutrition.total && nutrition.total.carbs) || nutrition.carbs || prev.carbs,
                          fat: (nutrition.total && nutrition.total.fat) || nutrition.fat || prev.fat,
                          expiryDate: nutrition.suggestedExpiryDate || prev.expiryDate
                        }));
                      } else if (nutrition && nutrition.error === "rate_limit") {
                        console.warn("API rate limit reached.");
                      } else {
                        console.warn("Failed to fetch nutrition info.");
                      }
                    } catch (err) {
                      console.error("Error fetching nutrition:", err);
                    } finally {
                      setFetchingNutrition(false);
                    }
                  }}
                  disabled={fetchingNutrition || !ingredientSearch.trim() || ingredientSearch.trim().length < 2}
                  title="Fetch nutrition info from AI"
                >
                  {fetchingNutrition ? "Searching..." : "Check Nutrition"}
          </button>
        </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((item) => (
                    <div 
                      key={item.id} 
                      className="suggestion-item"
                      onMouseDown={() => handleSelectSuggestion(item)} 
                    >
                      <div className="suggestion-main">
                        <strong>{item.name}</strong>
                        <span className={`suggestion-category ${item.isCustom ? 'badge-custom' : 'badge-common'}`}>
                          {item.isCustom ? "User Defined" : (item.category || "Common")}
                        </span>
                      </div>
                      <div className="suggestion-meta">
                        <span>{item.calories} kcal</span>
                        <span>P: {item.protein}g</span>
                        <span>C: {item.carbs}g</span>
                        <span>F: {item.fat}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Quantity</label>
                <input
                  placeholder="e.g. 500"
                  value={newIng.quantity}
                  onChange={(e) => setNewIng({ ...newIng, quantity: e.target.value })}
                />
              </div>
              <div className="form-group half">
                <label>Unit</label>
                <select
                  value={newIng.unit}
                  onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })}
                  className="unit-select"
                >
                  <option value="">Select unit...</option>
                  <option value="pcs">pcs (pieces)</option>
                  <option value="g">g (grams)</option>
                  <option value="kg">kg (kilograms)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="L">L (liters)</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp (tablespoon)</option>
                  <option value="tsp">tsp (teaspoon)</option>
                  <option value="oz">oz (ounces)</option>
                  <option value="lb">lb (pounds)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Nutrition (per 100g/serving)</label>
              <div className="nutrition-grid">
                <div className="form-group">
                  <input
                    placeholder="Cal"
                    type="number"
                    title="Calories (kcal)"
                    value={newIng.calories || ""}
                    onChange={(e) => setNewIng({ ...newIng, calories: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <input
                    placeholder="Prot"
                    type="number"
                    title="Protein (g)"
                    value={newIng.protein || ""}
                    onChange={(e) => setNewIng({ ...newIng, protein: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <input
                    placeholder="Carb"
                    type="number"
                    title="Carbs (g)"
                    value={newIng.carbs || ""}
                    onChange={(e) => setNewIng({ ...newIng, carbs: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <input
                    placeholder="Fat"
                    type="number"
                    title="Fat (g)"
                    value={newIng.fat || ""}
                    onChange={(e) => setNewIng({ ...newIng, fat: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                value={newIng.expiryDate}
                min={todayStr}
                onChange={(e) => setNewIng({ ...newIng, expiryDate: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-add-large">
                {isEditing ? "Update Ingredient" : "Add Ingredient"}
              </button>
              {isEditing && (
                <button type="button" className="btn-cancel" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </aside>

      {/* Right Panel: Visual Fridge */}
      <main className="fridge-visual-container">
        {/* Wrapper needed for z-index layering over background */}
        <div className="fridge-content-wrapper">
          <div className="fridge-top-bar">
            <input 
              type="text" 
              placeholder="Search inside fridge..." 
              className="fridge-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="fridge-interior">
            {loading ? (
              <div className="loading-text">Cooling down...</div>
            ) : filteredIngredients.length === 0 ? (
              <div className="empty-fridge-placeholder">
                <span>The fridge is empty.</span>
              </div>
            ) : (
              <div className="shelf-stack">
                {filteredIngredients.map((item) => {
                  const statusClass = getFreshnessStatus(item.expiryDate);
                  return (
                    <div key={item.id} className={`shelf-item-card ${statusClass}`}>
                      <div className="item-details" onClick={() => handleEditClick(item)} style={{cursor: 'pointer'}}>
                        <h4>{item.name}</h4>
                        <div className="item-meta">
                          <span className="meta-qty">Qty: {item.quantity} {item.unit}</span>
                          {item.expiryDate && (
                            <span className="meta-date">Expires: {item.expiryDate}</span>
                          )}
                        </div>
                        {/* Nutrition Info */}
                        {(item.calories || item.protein || item.carbs || item.fat) && (
                          <div className="item-nutrition">
                            {item.calories && <span className="nutri-badge">Cal: {Math.round(item.calories)}</span>}
                            {item.protein && <span className="nutri-badge">P: {item.protein}g</span>}
                            {item.carbs && <span className="nutri-badge">C: {item.carbs}g</span>}
                            {item.fat && <span className="nutri-badge">F: {item.fat}g</span>}
                          </div>
                        )}
                      </div>
                      <div className="item-actions">
                        <button className="btn-icon" onClick={() => handleEditClick(item)} title="Edit">✏️</button>
                        <button className="btn-icon" onClick={() => confirmDelete(item.id)} title="Delete">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
