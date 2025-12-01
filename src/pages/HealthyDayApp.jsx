// src/pages/HealthyDayApp.jsx
import { useState } from "react";
import "../App.css";
import { sendChatMessage } from "../api";
import FridgePanel from "./FridgePanel";

export default function HealthyDayApp({ user, onLogout, onOpenFridgePage }) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: `Hi! I'm Healthy Day 🤖. Welcome, ${
        user?.name || "friend"
      }! Tell me what you have in your fridge and I'll suggest some healthy recipes.`,
    },
  ]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const userMsg = { from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    setLoading(true);
    try {
      const res = await sendChatMessage(text);
      const botMsg = {
        from: "bot",
        text:
          res.reply ||
          "Here are some recipe ideas based on what you told me.",
      };
      setMessages((prev) => [...prev, botMsg]);

      if (Array.isArray(res.recipes)) {
        setRecipes(res.recipes);
      }
    } catch (err) {
      console.error(err);
      const botMsg = {
        from: "bot",
        text:
          "Sorry, I’m having trouble connecting to the kitchen right now. Please try again in a minute.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header with centered subtitle */}
      <header className="app-header">
        <div className="header-left">
          <h1>Healthy Day 🥗</h1>
        </div>

        <div className="header-center">
          <p>Healthy recipes based on the ingredients in your fridge.</p>
        </div>

        <div className="header-right">
          <button className="secondary-btn" onClick={onOpenFridgePage}>
            Fridge page
          </button>
          <span className="welcome-text">Hi, {user?.name}</span>
          <button className="logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Left: fridge panel (add/remove ingredients) */}
        <FridgePanel />

        {/* Right: chat + recipes */}
        <section className="panel chat-panel">
          <div className="chat-box">
            <h2>Chat with Healthy Day 🤖</h2>

            <div className="chat-messages">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`chat-message ${
                    m.from === "user" ? "from-user" : "from-bot"
                  }`}
                >
                  <div className="bubble">{m.text}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-message from-bot">
                  <div className="bubble">Thinking about recipes…</div>
                </div>
              )}
            </div>

            <form className="chat-input-row" onSubmit={handleSendMessage}>
              <input
                placeholder="Tell me what you feel like eating, or what’s in your fridge."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button>Send</button>
            </form>
          </div>

          <div className="recipes-panel">
            <h3>Recommended recipes 🍽️</h3>
            {recipes.length === 0 && (
              <p className="empty">
                No recommendations yet. Try telling me what you have in the
                chat box.
              </p>
            )}
            <div className="recipes-grid">
              {recipes.map((r) => (
                <div key={r.id} className="recipe-card">
                  <h4>{r.name}</h4>
                  {r.tags && (
                    <div className="tags">
                      {r.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.calories && (
                    <p className="nutrition">
                      ~{r.calories} kcal · protein {r.protein} g · carbs{" "}
                      {r.carbs} g · fat {r.fat} g
                    </p>
                  )}
                  {r.usedIngredients && (
                    <p className="ingredients">
                      Uses: {r.usedIngredients.join(", ")}
                    </p>
                  )}
                  {r.description && (
                    <p className="desc">{r.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}