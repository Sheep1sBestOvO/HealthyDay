import requests
import json

BASE_URL = "http://localhost:5000/api/admin/seed-common"

def seed():
    try:
        response = requests.post(BASE_URL)
        if response.status_code == 201:
            print("✅ Successfully seeded database!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed to seed. Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    seed()

