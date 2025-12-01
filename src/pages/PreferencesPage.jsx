import { useState, useEffect } from "react";
import "../App.css";
import { fetchPreferences, updatePreferences } from "../api";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    dietType: "No Restriction",
    spiceLevel: "Medium",
    allergies: [],
    goals: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Options
  const dietTypes = ["No Restriction", "Vegan", "Vegetarian", "Keto", "Paleo", "Gluten-Free"];
  const spiceLevels = ["Mild", "Medium", "Spicy", "Very Spicy"];
  const allergyOptions = ["Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Shellfish", "Fish"];
  const goalOptions = ["Weight Loss", "Muscle Gain", "Maintain Weight", "Eat More Veggies", "Low Carb"];

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const data = await fetchPreferences();
      // Ensure arrays are initialized
      setPrefs({
        ...data,
        allergies: data.allergies || [],
        goals: data.goals || []
      });
    } catch (err) {
      console.error("Failed to load preferences", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePreferences(prefs);
      alert("Preferences saved successfully!");
    } catch (err) {
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (field, value) => {
    setPrefs(prev => {
      const list = prev[field];
      if (list.includes(value)) {
        return { ...prev, [field]: list.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...list, value] };
      }
    });
  };

  if (loading) return <div className="page-container"><p>Loading preferences...</p></div>;

  return (
    <div className="page-container">
      <div className="preferences-layout">
        <header className="page-header">
          <h1>Your Dietary Preferences</h1>
          <p className="subtitle">Customize your AI menu recommendations</p>
        </header>

        <form onSubmit={handleSave} className="preferences-form">
          
          {/* 1. Diet Type */}
          <section className="pref-section">
            <h3>Dietary Requirement</h3>
            <div className="chips-container">
              {dietTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  className={`chip-btn ${prefs.dietType === type ? "active" : ""}`}
                  onClick={() => setPrefs({ ...prefs, dietType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          {/* 2. Spice Level */}
          <section className="pref-section">
            <h3>Spice Tolerance</h3>
            <div className="slider-container">
              <div className="spice-labels">
                {spiceLevels.map(level => (
                  <span 
                    key={level} 
                    className={prefs.spiceLevel === level ? "active-text" : ""}
                    onClick={() => setPrefs({ ...prefs, spiceLevel: level })}
                    style={{cursor: "pointer"}}
                  >
                    {level}
                  </span>
                ))}
              </div>
              <input 
                type="range" 
                min="0" 
                max="3" 
                step="1"
                value={spiceLevels.indexOf(prefs.spiceLevel)}
                onChange={(e) => setPrefs({ ...prefs, spiceLevel: spiceLevels[e.target.value] })}
                className="range-slider"
              />
            </div>
          </section>

          {/* 3. Allergies */}
          <section className="pref-section">
            <h3>Allergies & Intolerances</h3>
            <div className="chips-container">
              {allergyOptions.map(allergy => (
                <button
                  key={allergy}
                  type="button"
                  className={`chip-btn multi ${prefs.allergies.includes(allergy) ? "active" : ""}`}
                  onClick={() => toggleSelection("allergies", allergy)}
                >
                  {allergy}
                </button>
              ))}
            </div>
          </section>

          {/* 4. Health Goals */}
          <section className="pref-section">
            <h3>Health Goals</h3>
            <div className="chips-container">
              {goalOptions.map(goal => (
                <button
                  key={goal}
                  type="button"
                  className={`chip-btn multi ${prefs.goals.includes(goal) ? "active" : ""}`}
                  onClick={() => toggleSelection("goals", goal)}
                >
                  {goal}
                </button>
              ))}
            </div>
          </section>

          <div className="form-footer">
            <button type="submit" className="btn-save-large" disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
