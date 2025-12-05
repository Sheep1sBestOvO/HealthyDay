import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateRecipes, fetchFridge, saveRecipe } from "../api";
import "../App.css";

export default function RecipeResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mealType, setMealType] = useState("Dinner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load recipes from localStorage or location state, keyed by mealType
  const loadRecipesFromStorage = (type) => {
    const storageKey = `recipes_${type}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if data is recent (less than 1 hour old)
        const timestamp = parsed.timestamp || 0;
        const now = Date.now();
        if (now - timestamp < 60 * 60 * 1000) { // 1 hour
          return parsed.recipes || [];
        }
      } catch (e) {
        console.error("Failed to parse stored recipes:", e);
      }
    }
    // Fallback to location state if available
    return location.state?.recipes || [];
  };

  const [recipes, setRecipes] = useState(() => loadRecipesFromStorage("Dinner"));
  
  // Modal State
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Load recipes when mealType changes
  useEffect(() => {
    const storedRecipes = loadRecipesFromStorage(mealType);
    if (storedRecipes.length > 0) {
      setRecipes(storedRecipes);
    } else if (location.state?.recipes && mealType === "Dinner") {
      // Only use location state for initial load
      setRecipes(location.state.recipes);
    }
  }, [mealType]);

  const handleGenerate = async (type) => {
    const selectedType = type || mealType;
    setMealType(selectedType);
    setLoading(true);
    setError(null);
    try {
      const data = await generateRecipes(selectedType);
      setRecipes(data.recipes);
      // Store in localStorage with mealType key
      const storageKey = `recipes_${selectedType}`;
      localStorage.setItem(storageKey, JSON.stringify({
        recipes: data.recipes,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    handleGenerate(mealType);
  };

  const [showCookModal, setShowCookModal] = useState(false);
  const [cookRecipe, setCookRecipe] = useState(null);
  const [deductionList, setDeductionList] = useState([]);
  const [fridgeIngredients, setFridgeIngredients] = useState([]);

  useEffect(() => {
    // Load fridge ingredients when cook modal opens
    if (showCookModal && cookRecipe) {
      loadFridgeForCook();
    }
  }, [showCookModal]);

  const loadFridgeForCook = async () => {
    try {
      const data = await fetchFridge();
      setFridgeIngredients(data);
      // Match recipe ingredients with fridge inventory
      buildDeductionList(cookRecipe, data);
    } catch (err) {
      console.error("Failed to load fridge:", err);
    }
  };

  const buildDeductionList = (recipe, fridge) => {
    const list = [];
    if (recipe.available_ingredients) {
      recipe.available_ingredients.forEach((reqIng) => {
        // Try to find matching ingredient in fridge (fuzzy match by name)
        const match = fridge.find(f => 
          f.name.toLowerCase().includes(reqIng.name.toLowerCase()) ||
          reqIng.name.toLowerCase().includes(f.name.toLowerCase())
        );
        if (match) {
          list.push({
            recipeIng: reqIng,
            fridgeIng: match,
            deductQty: reqIng.quantity, // Default: use recipe requirement
            deductUnit: reqIng.unit,
            canDeduct: true
          });
        }
      });
    }
    setDeductionList(list);
  };

  const handleCook = (recipe) => {
    setCookRecipe(recipe);
    setShowCookModal(true);
  };

  const handleConfirmCook = async () => {
    // TODO: Implement actual deduction API calls
    alert(`Cooking ${cookRecipe.name}! Deducting ${deductionList.length} ingredients.`);
    setShowCookModal(false);
    setCookRecipe(null);
    setDeductionList([]);
  };

  return (
    <div className="recipe-page-layout">
      <header className="recipe-page-header">
        <button onClick={() => navigate("/ingredients")} className="btn-back">
          ← Back to Fridge
        </button>
        <h1>🍽️ AI Chef's Menu</h1>
      </header>

      <div className="controls-bar" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
        {/* Meal Type Selector */}
        <div className="meal-selector" style={{margin: 0}}>
          {["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => (
            <button
              key={type}
              className={`meal-tab ${mealType === type ? "active" : ""}`}
              onClick={() => {
                setMealType(type);
                // Check if we have cached recipes for this meal type
                const storageKey = `recipes_${type}`;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                  try {
                    const parsed = JSON.parse(stored);
                    const timestamp = parsed.timestamp || 0;
                    const now = Date.now();
                    // Use cache if less than 1 hour old
                    if (now - timestamp < 60 * 60 * 1000 && parsed.recipes && parsed.recipes.length > 0) {
                      setRecipes(parsed.recipes);
                      return; // Don't generate new recipes
                    }
                  } catch (e) {
                    console.error("Failed to parse stored recipes:", e);
                  }
                }
                // No cache or cache expired, generate new recipes
                handleGenerate(type);
              }}
              disabled={loading}
            >
              {type}
            </button>
          ))}
        </div>
        
        {/* Refresh Button */}
        <button className="btn-refresh" onClick={handleRefresh} disabled={loading}>
          🔄 Shuffle
        </button>
      </div>

      <main className="recipe-page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Planning 6 delicious <strong>{mealType}</strong> options for you...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => handleGenerate()} className="btn-primary">Try Again</button>
          </div>
        ) : recipes.length === 0 ? (
          <div className="empty-state">
            <p>Select a meal type to generate recipes based on your fridge!</p>
          </div>
        ) : (
          <div className="cards-grid">
            {recipes.map((r, index) => (
              <div 
                key={index} 
                className="recipe-card-modern large-card clickable"
                onClick={() => setSelectedRecipe(r)}
                style={{cursor: 'pointer'}}
              >
                <div className="card-header">
                  <h4>{r.name}</h4>
                  <span className="calorie-badge">🔥 {r.nutrition?.calories || 0} kcal</span>
                </div>
                
                <p className="recipe-desc">{r.description}</p>
                
                <div className="nutrition-row">
                  <div className="nutri-item">
                    <span className="label">Prot</span>
                    <span className="value">{r.nutrition?.protein || 0}g</span>
                  </div>
                  <div className="nutri-item">
                    <span className="label">Carb</span>
                    <span className="value">{r.nutrition?.carbs || 0}g</span>
                  </div>
                  <div className="nutri-item">
                    <span className="label">Fat</span>
                    <span className="value">{r.nutrition?.fat || 0}g</span>
                  </div>
                </div>

                <div className="card-tags">
                   {r.tags?.map(tag => <span key={tag} className="tag-pill">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelectedRecipe(null)}>×</button>
            
            <div className="modal-header">
              <h2>{selectedRecipe.name}</h2>
              <div className="modal-badges">
                <span className="calorie-badge">🔥 {selectedRecipe.nutrition?.calories} kcal</span>
                <span className="tag-pill">⏱️ {selectedRecipe.cookingTime}</span>
                <span className="tag-pill">👨‍🍳 {selectedRecipe.difficulty}</span>
              </div>
            </div>

            <div className="modal-content">
              {/* Left Col: Ingredients */}
              <div className="details-section">
                <div className="section-title">🛒 Ingredients</div>
                
                {/* Available Ingredients */}
                {selectedRecipe.available_ingredients?.length > 0 && (
                  <div className="ingredient-group">
                    <h5 style={{color: '#4CAF50', margin: '0.5rem 0'}}>In Your Fridge</h5>
                    <ul className="ingredient-list">
                      {selectedRecipe.available_ingredients.map((ing, i) => (
                        <li key={i} className="ingredient-item">
                          <span className="ing-icon status-available">✓</span>
                          <span className="ing-text">
                            {ing.name} <span className="ing-qty">({ing.quantity} {ing.unit})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Ingredients */}
                {selectedRecipe.missing_ingredients?.length > 0 && (
                  <div className="ingredient-group" style={{marginTop: '1rem'}}>
                    <h5 style={{color: '#ef5350', margin: '0.5rem 0'}}>Missing (To Buy)</h5>
                    <ul className="ingredient-list">
                      {selectedRecipe.missing_ingredients.map((ing, i) => (
                        <li key={i} className="ingredient-item">
                          <span className="ing-icon status-missing">⚠️</span>
                          <span className="ing-text">
                            {ing.name} <span className="ing-qty">({ing.quantity} {ing.unit})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Col: Instructions */}
              <div className="details-section">
                <div className="section-title">📝 Instructions</div>
                {selectedRecipe.instructions?.map((step, i) => (
                  <div key={i} className="instruction-step">
                    <div className="step-num">{i + 1}</div>
                    <div className="step-text">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedRecipe(null)}>Close</button>
              <button 
                className="btn-save" 
                onClick={async () => {
                  try {
                    await saveRecipe({
                      ...selectedRecipe,
                      mealType: mealType
                    });
                    alert("Recipe saved to your collection!");
                  } catch (err) {
                    if (err.message.includes("already saved")) {
                      alert("This recipe is already in your saved collection.");
                    } else {
                      alert("Failed to save recipe: " + err.message);
                    }
                  }
                }}
              >
                ⭐ Save Recipe
              </button>
              <button className="btn-cook" onClick={() => {
                setSelectedRecipe(null);
                handleCook(selectedRecipe);
              }}>
                👨‍🍳 Cook This!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cook Confirmation Modal */}
      {showCookModal && cookRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setShowCookModal(false)}>
          <div className="recipe-modal cook-confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setShowCookModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>Confirm Ingredients to Deduct</h2>
              <p style={{color: '#666', marginTop: '0.5rem'}}>Adjust quantities before cooking:</p>
            </div>

            <div className="deduction-list" style={{padding: '2rem', maxHeight: '400px', overflowY: 'auto'}}>
              {deductionList.length === 0 ? (
                <p>No matching ingredients found in your fridge.</p>
              ) : (
                deductionList.map((item, idx) => {
                  const fridgeQty = parseFloat(item.fridgeIng.quantity) || 0;
                  const reqQty = parseFloat(item.deductQty) || 0;
                  const unitMatch = item.fridgeIng.unit === item.deductUnit;
                  
                  return (
                    <div key={idx} className="deduction-item" style={{
                      padding: '1rem',
                      marginBottom: '1rem',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      border: unitMatch ? '1px solid #4CAF50' : '1px solid #ffca28'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                        <strong>{item.recipeIng.name}</strong>
                        {!unitMatch && (
                          <span style={{fontSize: '0.8rem', color: '#ff9800'}}>⚠️ Unit mismatch</span>
                        )}
                      </div>
                      <div style={{fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem'}}>
                        Recipe needs: <strong>{item.recipeIng.quantity} {item.recipeIng.unit}</strong><br/>
                        Your stock: <strong>{item.fridgeIng.quantity} {item.fridgeIng.unit}</strong>
                      </div>
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <label style={{fontSize: '0.85rem'}}>Deduct:</label>
                        <input
                          type="number"
                          value={item.deductQty}
                          onChange={(e) => {
                            const updated = [...deductionList];
                            updated[idx].deductQty = e.target.value;
                            setDeductionList(updated);
                          }}
                          min="0"
                          max={fridgeQty}
                          step="0.1"
                          style={{
                            width: '80px',
                            padding: '0.4rem',
                            border: '1px solid #ddd',
                            borderRadius: '6px'
                          }}
                        />
                        <span style={{fontSize: '0.85rem', color: '#666'}}>{item.deductUnit}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCookModal(false)}>Cancel</button>
              <button 
                className="btn-cook" 
                onClick={handleConfirmCook}
                disabled={deductionList.length === 0}
              >
                ✅ Confirm & Cook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
