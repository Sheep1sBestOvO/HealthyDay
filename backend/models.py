from flask_mongoengine import MongoEngine
import datetime

db = MongoEngine()

class User(db.Document):
    username = db.StringField(required=True, unique=True)
    password = db.StringField(required=True)
    created_at = db.DateTimeField(default=datetime.datetime.utcnow)

    def to_json(self):
        return {
            "id": str(self.id),
            "username": self.username,
            "created_at": self.created_at.isoformat()
        }

class CommonIngredient(db.Document):
    """Pre-filled database of common ingredients"""
    name = db.StringField(required=True, unique=True)
    default_unit = db.StringField(default="g")
    calories = db.FloatField(default=0)  # per 100g
    protein = db.FloatField(default=0)
    carbs = db.FloatField(default=0)
    fat = db.FloatField(default=0)
    category = db.StringField()  # e.g., "Vegetable", "Fruit", "Meat"

    def to_json(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "unit": self.default_unit,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fat": self.fat,
            "category": self.category
        }

class UserDefinedIngredient(db.Document):
    """User-created custom ingredients (available only to that user)"""
    user = db.ReferenceField(User, required=True)
    name = db.StringField(required=True)
    default_unit = db.StringField(default="g")
    calories = db.FloatField(default=0)
    protein = db.FloatField(default=0)
    carbs = db.FloatField(default=0)
    fat = db.FloatField(default=0)
    created_at = db.DateTimeField(default=datetime.datetime.utcnow)

    def to_json(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "unit": self.default_unit,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fat": self.fat,
            "isCustom": True
        }

class Ingredient(db.Document):
    """User's fridge ingredients (instances)"""
    user = db.ReferenceField(User, required=True)
    name = db.StringField(required=True)
    quantity = db.StringField()
    unit = db.StringField()
    expiry_date = db.StringField()  # Format: YYYY-MM-DD
    calories = db.FloatField(default=0)
    protein = db.FloatField(default=0)
    carbs = db.FloatField(default=0)
    fat = db.FloatField(default=0)
    created_at = db.DateTimeField(default=datetime.datetime.utcnow)

    def to_json(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit,
            "expiryDate": self.expiry_date,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fat": self.fat
        }

class UserPreference(db.Document):
    """User preferences for dietary habits and goals"""
    user = db.ReferenceField(User, required=True, unique=True)
    diet_type = db.StringField(default="No Restriction") # e.g., Vegan, Vegetarian, Keto
    spice_level = db.StringField(default="Medium") # e.g., Mild, Medium, Spicy
    allergies = db.ListField(db.StringField(), default=[]) # e.g., ["Peanuts", "Dairy"]
    health_goals = db.ListField(db.StringField(), default=[]) # e.g., ["Weight Loss", "Muscle Gain"]
    updated_at = db.DateTimeField(default=datetime.datetime.utcnow)

    def to_json(self):
        return {
            "dietType": self.diet_type,
            "spiceLevel": self.spice_level,
            "allergies": self.allergies,
            "goals": self.health_goals
        }

class SavedRecipe(db.Document):
    """User's saved/favorited recipes"""
    user = db.ReferenceField(User, required=True)
    name = db.StringField(required=True)
    description = db.StringField()
    available_ingredients = db.ListField(db.DictField(), default=[])
    missing_ingredients = db.ListField(db.DictField(), default=[])
    instructions = db.ListField(db.StringField(), default=[])
    nutrition = db.DictField(default={})  # {calories, protein, carbs, fat}
    cooking_time = db.StringField()
    difficulty = db.StringField()
    tags = db.ListField(db.StringField(), default=[])
    meal_type = db.StringField()  # Breakfast, Lunch, Dinner, Snack
    saved_at = db.DateTimeField(default=datetime.datetime.utcnow)

    def to_json(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "available_ingredients": self.available_ingredients,
            "missing_ingredients": self.missing_ingredients,
            "instructions": self.instructions,
            "nutrition": self.nutrition,
            "cookingTime": self.cooking_time,
            "difficulty": self.difficulty,
            "tags": self.tags,
            "mealType": self.meal_type,
            "savedAt": self.saved_at.isoformat()
        }