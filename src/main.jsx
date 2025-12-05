import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import App from './App.jsx'
import './index.css'
import "./components/AiButtonStyles.css";
import "./components/LoadingStyles.css"; 
import "./components/MealSelectorStyles.css";
import "./components/RecipeModalStyles.css";
import "./components/VoiceInputStyles.css"; // Add Voice Input styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)