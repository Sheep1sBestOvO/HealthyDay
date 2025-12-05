import { useState, useEffect, useRef } from "react";
import "../App.css";
import { fetchFridge, addIngredient, deleteIngredient, searchCommonIngredients, updateIngredient, parseIngredientList, getNutritionInfo } from "../api";
import "../components/VoiceInputStyles.css";

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

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [parsedIngredients, setParsedIngredients] = useState([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

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
    if (!nameToUse.trim()) return;

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

  // Voice Input Handlers
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // 连续模式，用户手动控制停止
    recognition.interimResults = true; // 显示实时识别结果
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("Listening...");
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      finalTranscriptRef.current = finalTranscript.trim();
      setTranscript(finalTranscriptRef.current || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setTranscript("Error: " + event.error);
    };

    recognition.onend = () => {
      // 只有在用户手动停止时才处理，如果是错误导致的停止则忽略
      if (!isRecording) {
        // 用户手动停止，处理结果
        const finalText = finalTranscriptRef.current;
        if (finalText && finalText !== "Listening..." && !finalText.includes("Error:")) {
          handleParseTranscript(finalText);
        } else {
          setTranscript("");
        }
      }
      // 如果是错误导致的停止，isRecording 仍然是 true，不处理
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false); // 先设置状态，这样 onend 知道是手动停止
      recognitionRef.current.stop();
    }
  };

  const handleParseTranscript = async (text) => {
    if (!text || text === "Listening...") return;
    setParsing(true);
    // Keep the transcript visible in modal
    finalTranscriptRef.current = text;
    try {
      const parsed = await parseIngredientList(text);
      if (parsed.ingredients && parsed.ingredients.length > 0) {
        // Show confirmation modal with original text and parsed list
        setParsedIngredients(parsed.ingredients);
        setShowVoiceConfirm(true);
      } else {
        alert("No ingredients found. Please try again.");
        finalTranscriptRef.current = "";
      }
    } catch (err) {
      alert("Failed to parse ingredients: " + err.message);
      finalTranscriptRef.current = "";
    } finally {
      setParsing(false);
      setTranscript(""); // Clear the preview, but keep in finalTranscriptRef for modal
    }
  };

  const handleConfirmVoiceAdd = async () => {
    let successCount = 0;
    for (const ing of parsedIngredients) {
      try {
        const added = await addIngredient(ing);
        setIngredients((prev) => [...prev, added]);
        successCount++;
      } catch (err) {
        console.error(`Failed to add ${ing.name}:`, err);
      }
    }
    setShowVoiceConfirm(false);
    setParsedIngredients([]);
    if (successCount > 0) {
      alert(`Successfully added ${successCount} ingredient(s)!`);
    }
  };

  const handleRemoveParsedIngredient = (index) => {
    setParsedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditParsedIngredient = (index, field, value) => {
    const updated = [...parsedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setParsedIngredients(updated);
  };

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

      {/* Voice Input Confirmation Modal */}
      {showVoiceConfirm && (
        <div className="confirm-modal-overlay">
          <div className="voice-confirm-modal">
            <div className="modal-header">
              <h3>📝 Review Your Shopping List</h3>
              <p className="modal-subtitle">Check the AI interpretation below</p>
            </div>
            
            {/* User's Original Text */}
            <div className="voice-original-text-section">
              <div className="section-label">Your voice input</div>
              <div className="original-text-wrapper">
                <textarea
                  className="original-text-box editable"
                  value={finalTranscriptRef.current || transcript}
                  onChange={(e) => {
                    finalTranscriptRef.current = e.target.value;
                    setTranscript(e.target.value);
                  }}
                  placeholder="Your voice input will appear here..."
                  rows={3}
                />
                <button
                  className="btn-reparse"
                  onClick={async () => {
                    const text = finalTranscriptRef.current || transcript;
                    if (!text.trim()) {
                      alert("Please enter some text to parse.");
                      return;
                    }
                    setParsing(true);
                    try {
                      const parsed = await parseIngredientList(text);
                      if (parsed.ingredients && parsed.ingredients.length > 0) {
                        setParsedIngredients(parsed.ingredients);
                      } else {
                        alert("No ingredients found. Please try again.");
                      }
                    } catch (err) {
                      alert("Failed to parse ingredients: " + err.message);
                    } finally {
                      setParsing(false);
                    }
                  }}
                  disabled={parsing || !(finalTranscriptRef.current || transcript).trim()}
                >
                  {parsing ? "Parsing..." : "🔄 Re-parse"}
                </button>
              </div>
            </div>

            {/* AI Parsed List */}
            <div className="voice-parsed-section">
              <div className="section-label">Here's what I found</div>
              <div className="parsed-ingredients-list">
                {parsedIngredients.length === 0 ? (
                  <p style={{textAlign: 'center', color: '#666', padding: '2rem'}}>No ingredients found. Please try again.</p>
                ) : (
                  parsedIngredients.map((ing, index) => (
                    <div key={index} className="parsed-ingredient-item">
                      <button 
                        className="remove-parsed-btn"
                        onClick={() => handleRemoveParsedIngredient(index)}
                        title="Remove"
                      >
                        ×
                      </button>
                      <div className="parsed-ing-fields">
                        <input
                          type="text"
                          value={ing.name || ""}
                          onChange={(e) => handleEditParsedIngredient(index, 'name', e.target.value)}
                          placeholder="Ingredient name"
                          className="parsed-input-name"
                        />
                        <div className="parsed-qty-unit">
                          <input
                            type="text"
                            value={ing.quantity || ""}
                            onChange={(e) => handleEditParsedIngredient(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className="parsed-input-qty"
                          />
                          <select
                            value={ing.unit || ""}
                            onChange={(e) => handleEditParsedIngredient(index, 'unit', e.target.value)}
                            className="parsed-input-unit"
                          >
                            <option value="">Unit</option>
                            <option value="pcs">pcs</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="cup">cup</option>
                            <option value="tbsp">tbsp</option>
                            <option value="tsp">tsp</option>
                            <option value="oz">oz</option>
                            <option value="lb">lb</option>
                          </select>
                        </div>
                        <input
                          type="date"
                          value={ing.expiryDate || ""}
                          onChange={(e) => handleEditParsedIngredient(index, 'expiryDate', e.target.value)}
                          placeholder="Expiry Date"
                          className="parsed-input-date"
                          title="Expiry Date"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
        </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => {
                setShowVoiceConfirm(false);
                setParsedIngredients([]);
                finalTranscriptRef.current = "";
              }}>
                Cancel
          </button>
              <button 
                className="btn-add-large" 
                onClick={handleConfirmVoiceAdd}
                disabled={parsedIngredients.length === 0}
              >
                ✅ Add {parsedIngredients.length} Item(s)
          </button>
        </div>
          </div>
        </div>
      )}

      {/* Left Panel: Management Form */}
      <aside className="control-panel">
        <div className="panel-header">
          <h2>{isEditing ? "Edit Ingredient" : "My Fridge"}</h2>
          <p className="panel-subtitle">{isEditing ? "Update details below" : "Manage ingredients & nutrition"}</p>
        </div>

        <div className="add-section">
          <h3>{isEditing ? "Update Item" : "Add New Ingredient"}</h3>
          {!isEditing && <p className="helper-text">Search database or enter manually</p>}
          
          {/* Voice Input Section */}
          {!isEditing && (
            <div className="voice-input-section">
              <h4 className="voice-section-title">Voice Quick Add</h4>
              <p className="voice-hint">Say your shopping list, e.g., "I bought 2 eggs, 1 liter of milk, and 3 apples"</p>
              
              <div className="voice-button-wrapper">
                <button
                  type="button"
                  className={`btn-voice-circle ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={parsing}
                  title={isRecording ? "Stop Recording" : "Start Voice Input"}
                >
                  {isRecording ? (
                    <span className="mic-icon-stop">⏹</span>
                  ) : (
                    <span className="mic-icon">🎤</span>
                  )}
          </button>
                {isRecording && <div className="recording-ripple"></div>}
              </div>
              
              {parsing && (
                <div className="voice-parsing">
                  <div className="spinner-small"></div>
                  <span>AI is parsing your list...</span>
                </div>
              )}
            </div>
          )}
          
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

                    // Check cache first
                    const cacheKey = `nutrition_${searchTerm.toLowerCase()}`;
                    const cached = localStorage.getItem(cacheKey);
                    const cacheTime = localStorage.getItem(`${cacheKey}_timestamp`);
                    const now = Date.now();
                    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
                    
                    if (cached && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
                      try {
                        const nutrition = JSON.parse(cached);
                        setNewIng(prev => ({
                          ...prev,
                          calories: nutrition.calories || prev.calories,
                          protein: nutrition.protein || prev.protein,
                          carbs: nutrition.carbs || prev.carbs,
                          fat: nutrition.fat || prev.fat,
                          expiryDate: nutrition.suggestedExpiryDate || prev.expiryDate
                        }));
                        return;
                      } catch (e) {
                        // Cache parse error, continue to API call
                      }
                    }

                    setFetchingNutrition(true);
                    try {
                      const nutrition = await getNutritionInfo(searchTerm);
                      if (nutrition && !nutrition.error) {
                        // Cache the result
                        localStorage.setItem(cacheKey, JSON.stringify(nutrition));
                        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
                        
                        setNewIng(prev => ({
                          ...prev,
                          calories: nutrition.calories || prev.calories,
                          protein: nutrition.protein || prev.protein,
                          carbs: nutrition.carbs || prev.carbs,
                          fat: nutrition.fat || prev.fat,
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
