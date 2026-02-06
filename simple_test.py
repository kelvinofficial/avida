#!/usr/bin/env python3
"""
Simple Backend API Test to isolate issues
"""

import requests
import json

# Get backend URL
BASE_URL = "https://responsive-redesign-3.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"
TEST_SESSION_TOKEN = "test_session_123"

def test_auth():
    """Test authentication"""
    print("=== Testing Authentication ===")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {TEST_SESSION_TOKEN}'
    }
    
    try:
        response = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=10)
        print(f"GET /api/auth/me - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"User: {data.get('name', 'Unknown')}")
            return True
        else:
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

def test_create_listing():
    """Test creating a listing with minimal data"""
    print("\n=== Testing Create Listing ===")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {TEST_SESSION_TOKEN}'
    }
    
    # Minimal listing data
    listing_data = {
        "title": "Test Item",
        "description": "A simple test item",
        "price": 10.0,
        "category_id": "electronics",
        "location": "Berlin"
    }
    
    try:
        response = requests.post(f"{API_URL}/listings", json=listing_data, headers=headers, timeout=10)
        print(f"POST /api/listings - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Created listing: {data.get('id', 'Unknown')}")
            return data.get('id')
        else:
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

def test_favorites():
    """Test favorites API"""
    print("\n=== Testing Favorites ===")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {TEST_SESSION_TOKEN}'
    }
    
    try:
        response = requests.get(f"{API_URL}/favorites", headers=headers, timeout=10)
        print(f"GET /api/favorites - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Favorites: {len(data)}")
            return True
        else:
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

def main():
    print("Simple Backend API Test")
    print("=" * 40)
    
    # Test auth first
    auth_ok = test_auth()
    
    if auth_ok:
        # Test create listing
        listing_id = test_create_listing()
        
        # Test favorites
        test_favorites()
    else:
        print("Authentication failed - skipping other tests")

if __name__ == "__main__":
    main()