import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedRecipes, deleteSavedRecipe } from "../api";
import "../App.css";

export default function SavedRecipesPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = async () => {
    setLoading(true);
    try {
      const data = await getSavedRecipes();
      setRecipes(data);
    } catch (err) {
      console.error("Failed to load saved recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this recipe from your saved collection?")) {
      try {
        await deleteSavedRecipe(id);
        setRecipes(prev => prev.filter(r => r.id !== id));
        if (selectedRecipe?.id === id) {
          setSelectedRecipe(null);
        }
      } catch (err) {
        alert("Failed to delete recipe: " + err.message);
      }
    }
  };

  return (
    <div className="recipe-page-layout">
      <header className="recipe-page-header">
        <button onClick={() => navigate("/")} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>⭐ Saved Recipes</h1>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your saved recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h2>No Saved Recipes Yet</h2>
          <p>Start saving your favorite recipes from the AI menu generator!</p>
          <button className="btn-primary" onClick={() => navigate("/recipes")}>
            Go to Recipe Generator
          </button>
        </div>
      ) : (
        <>
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card-modern" onClick={() => setSelectedRecipe(recipe)}>
                <div className="card-header">
                  <h4>{recipe.name}</h4>
                  {recipe.nutrition?.calories && (
                    <span className="calorie-badge">{Math.round(recipe.nutrition.calories)} kcal</span>
                  )}
                </div>
                <p className="recipe-desc">{recipe.description}</p>
                {recipe.mealType && (
                  <span className="tag-pill">{recipe.mealType}</span>
                )}
                <div className="card-footer-actions">
                  <button 
                    className="btn-icon-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(recipe.id);
                    }}
                    title="Remove from saved"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recipe Detail Modal */}
          {selectedRecipe && (
            <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
              <div className="recipe-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{selectedRecipe.name}</h2>
                  <button className="btn-close" onClick={() => setSelectedRecipe(null)}>×</button>
                </div>
                
                <div className="modal-content">
                  <p className="recipe-description">{selectedRecipe.description}</p>
                  
                  {selectedRecipe.nutrition && (
                    <div className="nutrition-row">
                      <div className="nutri-item">
                        <span className="label">Calories</span>
                        <span className="value">{Math.round(selectedRecipe.nutrition.calories || 0)}</span>
                      </div>
                      <div className="nutri-item">
                        <span className="label">Protein</span>
                        <span className="value">{selectedRecipe.nutrition.protein || 0}g</span>
                      </div>
                      <div className="nutri-item">
                        <span className="label">Carbs</span>
                        <span className="value">{selectedRecipe.nutrition.carbs || 0}g</span>
                      </div>
                      <div className="nutri-item">
                        <span className="label">Fat</span>
                        <span className="value">{selectedRecipe.nutrition.fat || 0}g</span>
                      </div>
                    </div>
                  )}

                  {selectedRecipe.available_ingredients && selectedRecipe.available_ingredients.length > 0 && (
                    <div className="ingredients-section">
                      <h3>Available Ingredients</h3>
                      <ul>
                        {selectedRecipe.available_ingredients.map((ing, i) => (
                          <li key={i}>{ing.name} - {ing.quantity} {ing.unit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedRecipe.missing_ingredients && selectedRecipe.missing_ingredients.length > 0 && (
                    <div className="ingredients-section">
                      <h3>Missing Ingredients</h3>
                      <ul>
                        {selectedRecipe.missing_ingredients.map((ing, i) => (
                          <li key={i}>{ing.name} - {ing.quantity} {ing.unit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                    <div className="instructions-section">
                      <h3>Instructions</h3>
                      <ol>
                        {selectedRecipe.instructions.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setSelectedRecipe(null)}>Close</button>
                  <button className="btn-danger" onClick={() => handleDelete(selectedRecipe.id)}>
                    Remove from Saved
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

