import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

export default function RecipeResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipes } = location.state || { recipes: [] };

  return (
    <div className="recipe-page-layout">
      <header className="recipe-page-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Back to Fridge
        </button>
        <h1>🍽️ Today's Menu</h1>
      </header>

      <main className="recipe-page-content">
        {recipes.length === 0 ? (
          <div className="empty-state">
            <p>No recipes generated yet.</p>
            <button onClick={() => navigate("/")} className="btn-primary">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {recipes.map((r) => (
              <div key={r.id} className="recipe-card-modern large-card">
                <div className="card-header">
                  <h4>{r.name}</h4>
                  <span className="calorie-badge">🔥 {r.calories} kcal</span>
                </div>
                
                <p className="recipe-desc">{r.description}</p>
                
                <div className="nutrition-row">
                  <div className="nutri-item">
                    <span className="label">Protein</span>
                    <span className="value">{r.protein}g</span>
                  </div>
                  <div className="nutri-item">
                    <span className="label">Carbs</span>
                    <span className="value">{r.carbs}g</span>
                  </div>
                  <div className="nutri-item">
                    <span className="label">Fat</span>
                    <span className="value">{r.fat}g</span>
                  </div>
                </div>

                <div className="ingredients-used">
                  <strong>Uses:</strong> {r.usedIngredients?.join(", ")}
                </div>

                <div className="card-tags">
                   {r.tags?.map(tag => <span key={tag} className="tag-pill">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

