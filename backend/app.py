from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models import (
    db,
    User,
    Ingredient,
    CommonIngredient,
    UserDefinedIngredient,
    UserPreference,
    SavedRecipe,
    DailyCalorieLog
)
from llm_service import generate_recipes, get_nutrition_info

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

app = Flask(__name__)
# Enable CORS explicitly for API routes (and root) so preflight requests succeed
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}, r"/": {"origins": "*"}},
    supports_credentials=True
)

@app.after_request
def add_cors_headers(response):
    # Ensure preflight responses are not blocked
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# MongoDB Configuration
app.config['MONGODB_SETTINGS'] = {
    'host': os.getenv("MONGO_URI", "mongodb://localhost:27017/healthyday_db")
}

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key")  # Change this in production!
jwt = JWTManager(app)

# Initialize DB with app
db.init_app(app)

@app.route('/')
def home():
    return jsonify({"message": "HealthyDay Backend is running!"})

# -------------------------
# Auth Routes
# -------------------------

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.objects(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    hashed_password = generate_password_hash(password)
    
    try:
        new_user = User(username=username, password=hashed_password)
        new_user.save()
        # Create default preference
        UserPreference(user=new_user).save()
        return jsonify({"message": "User registered successfully", "user": new_user.to_json()}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.objects(username=username).first()

    if user and check_password_hash(user.password, password):
        # Create JWT Token
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful",
            "user": user.to_json(),
            "token": access_token
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# -------------------------
# Ingredient Routes (User)
# -------------------------

@app.route('/api/ingredients', methods=['GET'])
@jwt_required()
def get_ingredients():
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    ingredients = Ingredient.objects(user=user)
    return jsonify([ing.to_json() for ing in ingredients]), 200

@app.route('/api/ingredients', methods=['POST'])
@jwt_required()
def add_ingredient():
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json
    
    ing_name = data.get('name')
    
    try:
        # 1. Save as Fridge Ingredient (Instance)
        new_ingredient = Ingredient(
            user=user,
            name=ing_name,
            quantity=str(data.get('quantity', '')),
            unit=data.get('unit', ''),
            expiry_date=data.get('expiryDate', ''),
            calories=float(data.get('calories', 0) or 0),
            protein=float(data.get('protein', 0) or 0),
            carbs=float(data.get('carbs', 0) or 0),
            fat=float(data.get('fat', 0) or 0)
        )
        new_ingredient.save()

        # 2. Check if we should save as Custom Ingredient for future use
        # Only if it doesn't exist in Common DB and User Defined DB
        common_exists = CommonIngredient.objects(name__iexact=ing_name).first()
        user_defined_exists = UserDefinedIngredient.objects(user=user, name__iexact=ing_name).first()
        
        if not common_exists and not user_defined_exists:
            UserDefinedIngredient(
                user=user,
                name=ing_name,
                default_unit=data.get('unit', ''),
                calories=float(data.get('calories', 0) or 0),
                protein=float(data.get('protein', 0) or 0),
                carbs=float(data.get('carbs', 0) or 0),
                fat=float(data.get('fat', 0) or 0)
            ).save()

        return jsonify(new_ingredient.to_json()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/ingredients/<id>', methods=['PUT'])
@jwt_required()
def update_ingredient(id):
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json
    
    ingredient = Ingredient.objects(id=id, user=user).first()
    if not ingredient:
        return jsonify({"error": "Ingredient not found"}), 404
    
    try:
        ingredient.name = data.get('name', ingredient.name)
        ingredient.quantity = str(data.get('quantity', ingredient.quantity))
        ingredient.unit = data.get('unit', ingredient.unit)
        ingredient.expiry_date = data.get('expiryDate', ingredient.expiry_date)
        ingredient.calories = float(data.get('calories', ingredient.calories) or 0)
        ingredient.protein = float(data.get('protein', ingredient.protein) or 0)
        ingredient.carbs = float(data.get('carbs', ingredient.carbs) or 0)
        ingredient.fat = float(data.get('fat', ingredient.fat) or 0)
        
        ingredient.save()
        return jsonify(ingredient.to_json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/ingredients/<id>', methods=['DELETE'])
@jwt_required()
def delete_ingredient(id):
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    
    ingredient = Ingredient.objects(id=id, user=user).first()
    if not ingredient:
        return jsonify({"error": "Ingredient not found"}), 404
    
    ingredient.delete()
    return jsonify({"message": "Deleted successfully"}), 200

# -------------------------
# Search Routes (Common + UserDefined)
# -------------------------

@app.route('/api/common-ingredients/search', methods=['GET'])
@jwt_required()
def search_ingredients():
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    query = request.args.get('q', '')
    
    if not query:
        return jsonify([])
    
    # 1. Search Common Ingredients
    common_results = CommonIngredient.objects(name__icontains=query).limit(5)
    common_list = [item.to_json() for item in common_results]
    
    # 2. Search User Defined Ingredients
    user_results = UserDefinedIngredient.objects(user=user, name__icontains=query).limit(5)
    user_list = [item.to_json() for item in user_results]
    
    # Merge results (User defined first, then common)
    return jsonify(user_list + common_list)

@app.route('/api/admin/seed-common', methods=['POST'])
def seed_common_ingredients():
    """Populate the DB with some initial data"""
    seed_data = [
        {"name": "Apple", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "category": "Fruit"},
        {"name": "Banana", "calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3, "category": "Fruit"},
        {"name": "Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "category": "Meat"},
        {"name": "Egg", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "category": "Dairy"},
        {"name": "Milk (Whole)", "calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "category": "Dairy"},
        {"name": "Spinach", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4, "category": "Vegetable"},
        {"name": "Rice (White)", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "category": "Grain"},
        {"name": "Salmon", "calories": 208, "protein": 20, "carbs": 0, "fat": 13, "category": "Seafood"},
        {"name": "Broccoli", "calories": 34, "protein": 2.8, "carbs": 6.6, "fat": 0.4, "category": "Vegetable"},
        {"name": "Oats", "calories": 389, "protein": 16.9, "carbs": 66, "fat": 6.9, "category": "Grain"},
        {"name": "Avocado", "calories": 160, "protein": 2, "carbs": 8.5, "fat": 14.7, "category": "Fruit"},
        {"name": "Beef (Ground)", "calories": 250, "protein": 26, "carbs": 0, "fat": 15, "category": "Meat"},
        {"name": "Carrot", "calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2, "category": "Vegetable"},
        {"name": "Yogurt (Greek)", "calories": 59, "protein": 10, "carbs": 3.6, "fat": 0.4, "category": "Dairy"},
        {"name": "Almonds", "calories": 579, "protein": 21, "carbs": 22, "fat": 49, "category": "Nut"},
        {"name": "Potato", "calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "category": "Vegetable"},
        {"name": "Tomato", "calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "category": "Vegetable"},
        {"name": "Cheese (Cheddar)", "calories": 402, "protein": 25, "carbs": 1.3, "fat": 33, "category": "Dairy"},
        {"name": "Pasta", "calories": 131, "protein": 5, "carbs": 25, "fat": 1.1, "category": "Grain"},
        {"name": "Tuna (Canned)", "calories": 132, "protein": 28, "carbs": 0, "fat": 1, "category": "Seafood"},
    ]
    
    count = 0
    for item in seed_data:
        if not CommonIngredient.objects(name=item["name"]).first():
            CommonIngredient(**item).save()
            count += 1
            
    return jsonify({"message": f"Seeded {count} new ingredients"}), 201

# -------------------------
# Preference Routes
# -------------------------

@app.route('/api/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    
    pref = UserPreference.objects(user=user).first()
    if not pref:
        # Create default if not exists
        pref = UserPreference(user=user)
        pref.save()
        
    return jsonify(pref.to_json()), 200

@app.route('/api/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json
    
    pref = UserPreference.objects(user=user).first()
    if not pref:
        pref = UserPreference(user=user)
    
    pref.diet_type = data.get('dietType', pref.diet_type)
    pref.spice_level = data.get('spiceLevel', pref.spice_level)
    pref.allergies = data.get('allergies', pref.allergies)
    pref.health_goals = data.get('goals', pref.health_goals)
    pref.conditions = data.get('conditions', pref.conditions)
    pref.notes = data.get('notes', pref.notes)
    
    pref.save()
    return jsonify(pref.to_json()), 200

# -------------------------
# Calorie Tracking Routes
# -------------------------

@app.route('/api/calories', methods=['POST'])
@jwt_required()
def add_calorie_log():
    """Add a calorie intake entry for the current user"""
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json or {}

    # Parse calories
    try:
        calories = float(data.get('calories', 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid calories value"}), 400

    if calories <= 0:
        return jsonify({"error": "Calories must be greater than zero"}), 400

    # Parse date (YYYY-MM-DD), default to today (UTC)
    date_str = data.get('date')
    if date_str:
        try:
            log_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        log_date = datetime.utcnow().date()

    try:
        log = DailyCalorieLog(
            user=user,
            date=log_date,
            calories=calories,
            meal_type=data.get('mealType', ''),
            note=data.get('note', '')
        )
        log.save()
        return jsonify(log.to_json()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/calories/summary', methods=['GET'])
@jwt_required()
def get_calorie_summary():
    """Get calorie totals by day within a date range (defaults to last 7 days)"""
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()

    today = datetime.utcnow().date()
    end_str = request.args.get('end')
    start_str = request.args.get('start')

    # Determine date range
    if end_str:
        try:
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400
    else:
        end_date = today

    if start_str:
        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400
    else:
        start_date = end_date - timedelta(days=6)

    if start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date"}), 400

    logs = DailyCalorieLog.objects(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')

    # Aggregate totals per day
    daily_totals = {}
    for log in logs:
        key = log.date.isoformat()
        daily_totals[key] = daily_totals.get(key, 0) + log.calories

    daily_totals_list = [{"date": d, "calories": c} for d, c in sorted(daily_totals.items())]
    total_calories = sum(daily_totals.values())

    return jsonify({
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "totalCalories": total_calories,
        "dailyTotals": daily_totals_list,
        "entries": [log.to_json() for log in logs]
    }), 200

# -------------------------
# Voice Input / LLM Parsing Route
# -------------------------

@app.route('/api/ingredients/parse', methods=['POST'])
@jwt_required()
def parse_ingredient_list():
    """
    Parse natural language text (e.g., "I bought eggs, milk, and apples")
    into structured ingredient list using LLM.
    """
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "Text is required"}), 400
    
    try:
        from llm_service import parse_ingredients_from_text
        ingredients = parse_ingredients_from_text(text)
        return jsonify({"ingredients": ingredients}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ingredients/nutrition', methods=['POST'])
@jwt_required()
def get_ingredient_nutrition():
    """Get nutrition info for an ingredient using LLM"""
    data = request.json
    ingredient_name = data.get('name', '').strip()
    
    if not ingredient_name:
        return jsonify({"error": "Ingredient name is required"}), 400
    
    try:
        nutrition = get_nutrition_info(ingredient_name)
        if nutrition:
            # Check if it's a rate limit error
            if isinstance(nutrition, dict) and nutrition.get("error") == "rate_limit":
                return jsonify({
                    "error": "rate_limit",
                    "message": nutrition.get("message", "API rate limit reached. Please try again later.")
                }), 429
            return jsonify(nutrition), 200
        else:
            return jsonify({"error": "Failed to get nutrition information"}), 500
    except Exception as e:
        error_str = str(e)
        if "rate_limit" in error_str.lower() or "429" in error_str:
            return jsonify({
                "error": "rate_limit",
                "message": "API rate limit reached. Please try again later."
            }), 429
        return jsonify({"error": str(e)}), 500

# -------------------------
# Recipe Generation Routes (LLM)
# -------------------------

@app.route('/api/recipes/generate', methods=['POST'])
@jwt_required()
def generate_recipe():
    """
    Generate recipes based on user's fridge ingredients and preferences.
    Uses Groq LLM API for intelligent recipe generation.
    """
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    
    # Get user's fridge ingredients
    ingredients = Ingredient.objects(user=user)
    ingredients_list = [ing.to_json() for ing in ingredients]
    
    if not ingredients_list:
        return jsonify({"error": "No ingredients in your fridge. Please add some ingredients first."}), 400
    
    # Get user preferences
    pref = UserPreference.objects(user=user).first()
    if not pref:
        pref = UserPreference(user=user)
        pref.save()
    
    preferences = pref.to_json()
    
    # Get meal type from request
    data = request.json or {}
    meal_type = data.get('mealType', 'Dinner')
    
    try:
        # Call LLM service to generate recipes
        recipes = generate_recipes(ingredients_list, preferences, meal_type)
        
        return jsonify({
            "recipes": recipes,
            "count": len(recipes),
            "message": "Recipes generated successfully!"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate recipes: {str(e)}"}), 500

# -------------------------
# Saved Recipes Routes
# -------------------------

@app.route('/api/saved-recipes', methods=['GET'])
@jwt_required()
def get_saved_recipes():
    """Get all saved recipes for the current user"""
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    
    saved_recipes = SavedRecipe.objects(user=user).order_by('-saved_at')
    return jsonify([recipe.to_json() for recipe in saved_recipes]), 200

@app.route('/api/saved-recipes', methods=['POST'])
@jwt_required()
def save_recipe():
    """Save a recipe to user's collection"""
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    data = request.json
    
    # Check if recipe already exists (by name and user)
    existing = SavedRecipe.objects(user=user, name=data.get('name')).first()
    if existing:
        return jsonify({"error": "Recipe already saved"}), 409
    
    try:
        saved_recipe = SavedRecipe(
            user=user,
            name=data.get('name'),
            description=data.get('description', ''),
            available_ingredients=data.get('available_ingredients', []),
            missing_ingredients=data.get('missing_ingredients', []),
            instructions=data.get('instructions', []),
            nutrition=data.get('nutrition', {}),
            cooking_time=data.get('cookingTime', ''),
            difficulty=data.get('difficulty', ''),
            tags=data.get('tags', []),
            meal_type=data.get('mealType', '')
        )
        saved_recipe.save()
        return jsonify(saved_recipe.to_json()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/saved-recipes/<id>', methods=['DELETE'])
@jwt_required()
def delete_saved_recipe(id):
    """Remove a saved recipe"""
    current_user_id = get_jwt_identity()
    user = User.objects(id=current_user_id).first()
    
    recipe = SavedRecipe.objects(id=id, user=user).first()
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
    
    recipe.delete()
    return jsonify({"message": "Recipe removed from saved"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)
