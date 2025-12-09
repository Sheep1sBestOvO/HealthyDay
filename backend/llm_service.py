# llm_service.py
# LLM Service for Recipe Generation using Groq API

import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

# 1. Try loading from current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')
print(f"Looking for .env at: {env_path}")

if os.path.exists(env_path):
    print(".env file found!")
    load_dotenv(env_path)
else:
    print(".env file NOT found at expected path!")

# 2. Fallback: Try manual read if load_dotenv fails
if not os.getenv("GROQ_API_KEY"):
    print("GROQ_API_KEY not found in env, trying manual read...")
    try:
        with open(env_path, 'r', encoding='utf-8-sig') as f: # Try with BOM
            for line in f:
                if line.startswith("GROQ_API_KEY="):
                    key = line.strip().split("=", 1)[1]
                    os.environ["GROQ_API_KEY"] = key
                    print("Manually loaded GROQ_API_KEY")
    except Exception as e:
        print(f"Manual read failed: {e}")
        # Try without BOM
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith("GROQ_API_KEY="):
                        key = line.strip().split("=", 1)[1]
                        os.environ["GROQ_API_KEY"] = key
                        print("Manually loaded GROQ_API_KEY (utf-8)")
        except Exception as e2:
            print(f"Manual read failed again: {e2}")

# Initialize Groq client (FREE API - No credit card needed)
# Get your API key from: https://console.groq.com/
client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

def generate_recipes(ingredients, preferences, meal_type="Dinner"):
    """
    Generate recipes based on user's fridge ingredients and preferences.
    
    Args:
        ingredients: List of ingredient objects
        preferences: User preference object
        meal_type: Breakfast, Lunch, Dinner, etc.
    """
    
    # Build ingredient list string
    ingredient_list = []
    for ing in ingredients:
        qty = f"{ing.get('quantity', '')} {ing.get('unit', '')}".strip()
        if qty:
            ingredient_list.append(f"- {ing['name']} ({qty})")
        else:
            ingredient_list.append(f"- {ing['name']}")
    
    ingredients_text = "\n".join(ingredient_list) if ingredient_list else "No specific ingredients available"
    
    # Build preferences context
    diet_info = f"Dietary requirement: {preferences.get('dietType', 'No Restriction')}"
    spice_info = f"Spice level preference: {preferences.get('spiceLevel', 'Medium')}"
    allergies = preferences.get('allergies', [])
    allergies_text = f"Allergies/Intolerances: {', '.join(allergies)}" if allergies else "No known allergies"
    goals = preferences.get('goals', [])
    goals_text = f"Health goals: {', '.join(goals)}" if goals else "General health"
    
    # Structured Prompt Engineering
    system_prompt = """You are a professional nutritionist and chef AI assistant. 
Your task is to generate healthy, delicious recipes based on available ingredients and user preferences.
Always provide accurate nutritional information and clear, step-by-step cooking instructions.
IMPORTANT: You must identify which ingredients are available in the user's fridge and which ones are missing.
Return your response as a valid JSON array of recipe objects."""

    user_prompt = f"""Generate 6 creative and healthy {meal_type} recipes using the following ingredients from the user's fridge:

AVAILABLE INGREDIENTS (Fridge):
{ingredients_text}

USER PREFERENCES:
{diet_info}
{spice_info}
{allergies_text}
{goals_text}
Meal Type: {meal_type}

REQUIREMENTS:
1. The recipes MUST be suitable for {meal_type}.
2. Respect dietary restrictions and allergies strictly
3. Match the spice level preference
4. Align with health goals
5. Calculate accurate nutritional values per serving
6. Provide clear, step-by-step cooking instructions
7. List ingredients with specific quantities. 
   - 'available_ingredients': List of ingredients used that are present in the fridge (name, quantity, unit). 
     **CRITICAL**: You MUST use the SAME UNIT as listed in the 'AVAILABLE INGREDIENTS' section above. 
     For example, if fridge has "Egg (2 pcs)", your recipe MUST use "pcs" or "whole" for eggs, do NOT convert to grams.
     If fridge has "Milk (1 liter)", use "ml" or "liter", do not use "cups".
   - 'missing_ingredients': List of ingredients that need to be purchased (name, quantity, unit).
8. PRIORITIZE using the available ingredients as much as possible.

OUTPUT FORMAT (JSON array):
[
  {{
    "name": "Recipe Name",
    "description": "Brief description",
    "available_ingredients": [
      {{ "name": "Chicken Breast", "quantity": "200", "unit": "g" }},
      {{ "name": "Spinach", "quantity": "1", "unit": "cup" }}
    ],
    "missing_ingredients": [
      {{ "name": "Olive Oil", "quantity": "1", "unit": "tbsp" }},
      {{ "name": "Salt", "quantity": "1", "unit": "pinch" }}
    ],
    "instructions": ["Step 1", "Step 2"],
    "nutrition": {{ "calories": 350, "protein": 25, "carbs": 30, "fat": 12 }},
    "cookingTime": "30 minutes",
    "difficulty": "Easy",
    "tags": ["high-protein", "quick"]
  }}
]

IMPORTANT: Return ONLY valid JSON."""

    try:
        # Debug: Check API Key
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            print("Error: GROQ_API_KEY is missing in environment variables.")
            raise ValueError("GROQ_API_KEY not found")
        print(f"Using Groq API Key: {api_key[:5]}... (length: {len(api_key)})")

        # Call Groq API (using latest Llama 3.3 model)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",  # Updated to latest supported model
            temperature=0.7,
            max_tokens=4000 # Increased token limit for 6 recipes
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Parse JSON response
        # Groq sometimes wraps JSON in markdown, so we extract it
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Try to parse as JSON object first (if wrapped in {"recipes": [...]})
        try:
            # Clean up response text (sometimes LLMs add comments or markdown outside JSON)
            # Find the first '[' and the last ']'
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']')
            
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx+1]
                recipes = json.loads(json_str)
            else:
                # Fallback: try full text
                parsed = json.loads(response_text)
                if "recipes" in parsed:
                    recipes = parsed["recipes"]
                elif isinstance(parsed, list):
                    recipes = parsed
                else:
                    recipes = [parsed] if parsed else []
                    
        except json.JSONDecodeError as json_err:
            print(f"JSON Parse Error: {json_err}")
            print(f"Raw LLM Response: {response_text}")
            
            # Extreme Fallback: Try to fix common trailing comma issue or truncated JSON
            try:
                import re
                # Remove trailing commas before closing braces/brackets
                fixed_json = re.sub(r',\s*([\]}])', r'\1', response_text)
                
                # Attempt to close truncated JSON array
                if '[' in fixed_json and not fixed_json.strip().endswith(']'):
                    # Find the last complete object closing '}'
                    last_brace = fixed_json.rfind('}')
                    if last_brace != -1:
                        # Cut off at the last complete object and close the array
                        fixed_json = fixed_json[:last_brace+1] + ']'
                        print("Attempted to auto-close truncated JSON array")

                start_idx = fixed_json.find('[')
                end_idx = fixed_json.rfind(']')
                if start_idx != -1 and end_idx != -1:
                    recipes = json.loads(fixed_json[start_idx:end_idx+1])
                else:
                    raise Exception("Could not extract JSON array")
            except Exception as e2:
                print(f"Fix attempt failed: {e2}")
                recipes = []
        
        return recipes if isinstance(recipes, list) else []
        
    except Exception as e:
        print(f"Error calling Groq API: {str(e)}")
        # Fallback: return a simple mock recipe
        return [{
            "name": "Simple Healthy Meal",
            "description": "A quick and healthy meal using your available ingredients.",
            "ingredients": [ing.get('name', 'Ingredient') for ing in ingredients[:3]],
            "instructions": [
                "Prepare your ingredients",
                "Cook according to your preferences",
                "Serve and enjoy!"
            ],
            "nutrition": {
                "calories": 300,
                "protein": 20,
                "carbs": 25,
                "fat": 10
            },
            "cookingTime": "20 minutes",
            "difficulty": "Easy",
            "tags": ["quick", "healthy"]
        }]

def parse_ingredients_from_text(text):
    """
    Parse natural language text into structured ingredient list with nutrition info.
    Example: "I bought 2 eggs, 1 liter of milk, and 3 apples"
    Returns: [{"name": "Egg", "quantity": "2", "unit": "pcs", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11}, ...]
    """
    system_prompt = """You are a helpful assistant that extracts ingredient information from natural language and provides nutrition data.
Return ONLY a valid JSON array of ingredient objects with nutrition information per 100g."""

    user_prompt = f"""Extract ingredient information from this text: "{text}"

For each ingredient mentioned, extract:
- name: The ingredient name (standardized, e.g., "Egg" not "eggs")
- quantity: The number/amount (as string, e.g., "2", "1.5", "500")
- unit: The unit (pcs, g, kg, ml, L, cup, tbsp, tsp, oz, lb). If not specified, infer from context:
  - Eggs, apples, bananas → "pcs"
  - Milk, water, juice → "ml" or "L"
  - Meat, vegetables (by weight) → "g" or "kg"
  - Spices, small amounts → "tsp" or "tbsp"
- calories: Nutrition calories per 100g (number)
- protein: Protein per 100g in grams (number)
- carbs: Carbohydrates per 100g in grams (number)
- fat: Fat per 100g in grams (number)
- expiryDate: Suggested expiry date in YYYY-MM-DD format (string). Consider typical shelf life:
  - Fresh produce: 3-7 days from today
  - Dairy: 5-7 days
  - Meat/poultry: 1-3 days
  - Eggs: 3-5 weeks
  - Dry goods: 6-12 months

OUTPUT FORMAT (JSON array):
[
  {{ "name": "Egg", "quantity": "2", "unit": "pcs", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "expiryDate": "2025-12-25" }},
  {{ "name": "Milk", "quantity": "1", "unit": "L", "calories": 42, "protein": 3.4, "carbs": 5, "fat": 1, "expiryDate": "2025-12-10" }},
  {{ "name": "Apple", "quantity": "3", "unit": "pcs", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "expiryDate": "2025-12-08" }}
]

Provide accurate nutrition information per 100g for each ingredient. Return ONLY valid JSON, no additional text."""

    try:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found")

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,  # Lower temperature for more consistent parsing
            max_tokens=1000
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Extract JSON array
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']')
        
        if start_idx != -1 and end_idx != -1:
            json_str = response_text[start_idx:end_idx+1]
            ingredients = json.loads(json_str)
            return ingredients if isinstance(ingredients, list) else []
        else:
            return []
            
    except Exception as e:
        print(f"Error parsing ingredients: {str(e)}")
        return []

def get_nutrition_info(ingredient_name):
    """
    Get nutrition information (per 100g) and suggested expiry date for an ingredient using LLM.
    Returns: dict with calories, protein, carbs, fat, suggestedExpiryDate
    """
    from datetime import datetime, timedelta
    
    system_prompt = """You are a nutrition and food safety expert. Given an ingredient name, provide:
1. Accurate nutrition information per 100g
2. A suggested expiry date (typical shelf life from today)
Return ONLY a valid JSON object with these exact fields: calories, protein, carbs, fat, suggestedExpiryDate.
All nutrition values should be numbers (floats or integers).
suggestedExpiryDate should be in YYYY-MM-DD format, representing a typical expiry date from today."""
    
    user_prompt = f"""What is the nutrition information per 100g for "{ingredient_name}" and what is a typical expiry date (from today)?
    
    Consider typical shelf life:
    - Fresh produce (fruits, vegetables): 3-7 days
    - Dairy (milk, yogurt): 5-7 days
    - Meat, poultry: 1-3 days
    - Eggs: 3-5 weeks
    - Dry goods (rice, pasta): 6-12 months
    
    Return a JSON object in this exact format:
    {{
      "calories": 52,
      "protein": 0.3,
      "carbs": 14,
      "fat": 0.2,
      "suggestedExpiryDate": "2025-12-10"
    }}
    
    Return ONLY the JSON object, no additional text or markdown."""
    
    try:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            # Graceful failure when API key isn't configured
            return {"error": "missing_api_key", "message": "GROQ_API_KEY is not set."}

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2, # Low temperature for factual data
            max_tokens=200
        )
        response_text = chat_completion.choices[0].message.content
        
        # Extract JSON from response
        json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            # Remove trailing commas
            json_str = re.sub(r',\s*([}])', r'\1', json_str)
            parsed = json.loads(json_str)
            
            # Validate and return
            result = {
                "calories": float(parsed.get("calories", 0)),
                "protein": float(parsed.get("protein", 0)),
                "carbs": float(parsed.get("carbs", 0)),
                "fat": float(parsed.get("fat", 0))
            }
            # Add suggested expiry date if provided
            if "suggestedExpiryDate" in parsed:
                result["suggestedExpiryDate"] = parsed["suggestedExpiryDate"]
            return result
        else:
            print(f"No JSON found in LLM response: {response_text}")
            return None
            
    except Exception as e:
        error_str = str(e)
        print(f"Error calling Groq API for nutrition info: {error_str}")
        
        # Check for rate limit error
        if "rate_limit" in error_str.lower() or "429" in error_str:
            print("⚠️ Rate limit reached. Consider using cached data or waiting.")
            return {"error": "rate_limit", "message": "API rate limit reached. Please try again later."}
        
        return None
