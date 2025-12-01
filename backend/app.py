from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from models import db, User, Ingredient, CommonIngredient, UserDefinedIngredient, UserPreference

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
    
    pref.save()
    return jsonify(pref.to_json()), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
