#!/usr/bin/env python3
"""
Backend API Testing Suite for Local Marketplace App
Tests all backend APIs including auth-protected endpoints
"""

import requests
import json
import os
import sys
from datetime import datetime, timezone, timedelta
import uuid

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    return "https://wheeldeals-72.preview.emergentagent.com"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

# Test session token (will be created via MongoDB)
TEST_SESSION_TOKEN = "test_session_123"
TEST_USER_ID = "user_test123"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {TEST_SESSION_TOKEN}'
        })
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
        print()
    
    def test_health_check(self):
        """Test health check endpoints"""
        print("=== Testing Health Check APIs ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{API_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_result("GET /api/ - Root endpoint", True, f"Status: {response.status_code}")
                else:
                    self.log_result("GET /api/ - Root endpoint", False, "Missing expected fields", data)
            else:
                self.log_result("GET /api/ - Root endpoint", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/ - Root endpoint", False, f"Exception: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.session.get(f"{API_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("GET /api/health - Health check", True, f"Status: {response.status_code}")
                else:
                    self.log_result("GET /api/health - Health check", False, "Invalid health response", data)
            else:
                self.log_result("GET /api/health - Health check", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/health - Health check", False, f"Exception: {str(e)}")
    
    def test_categories_api(self):
        """Test categories API"""
        print("=== Testing Categories API ===")
        
        # Test get all categories
        try:
            response = self.session.get(f"{API_URL}/categories", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if categories have required fields
                    first_cat = data[0]
                    required_fields = ['id', 'name', 'icon', 'subcategories', 'attributes']
                    if all(field in first_cat for field in required_fields):
                        self.log_result("GET /api/categories - List categories", True, f"Found {len(data)} categories")
                    else:
                        self.log_result("GET /api/categories - List categories", False, "Missing required fields", first_cat)
                else:
                    self.log_result("GET /api/categories - List categories", False, "Empty or invalid response", data)
            else:
                self.log_result("GET /api/categories - List categories", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/categories - List categories", False, f"Exception: {str(e)}")
        
        # Test get single category
        try:
            response = self.session.get(f"{API_URL}/categories/electronics", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == 'electronics':
                    self.log_result("GET /api/categories/{id} - Single category", True, f"Category: {data.get('name')}")
                else:
                    self.log_result("GET /api/categories/{id} - Single category", False, "Invalid category data", data)
            else:
                self.log_result("GET /api/categories/{id} - Single category", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/categories/{id} - Single category", False, f"Exception: {str(e)}")
    
    def test_listings_api(self):
        """Test listings API (both public and auth-protected)"""
        print("=== Testing Listings API ===")
        
        # Test get listings (public)
        try:
            response = self.session.get(f"{API_URL}/listings", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'listings' in data and 'total' in data and 'page' in data:
                    self.log_result("GET /api/listings - List listings", True, f"Found {data['total']} listings")
                else:
                    self.log_result("GET /api/listings - List listings", False, "Invalid response format", data)
            else:
                self.log_result("GET /api/listings - List listings", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/listings - List listings", False, f"Exception: {str(e)}")
        
        # Test get listings with filters
        try:
            params = {'category': 'electronics', 'min_price': 10, 'max_price': 1000, 'search': 'phone'}
            response = self.session.get(f"{API_URL}/listings", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/listings - With filters", True, f"Filtered results: {data.get('total', 0)}")
            else:
                self.log_result("GET /api/listings - With filters", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/listings - With filters", False, f"Exception: {str(e)}")
        
        # Test create listing (auth required)
        try:
            listing_data = {
                "title": "Test iPhone 15 Pro",
                "description": "Brand new iPhone 15 Pro in excellent condition. Comes with original box and charger.",
                "price": 899.99,
                "negotiable": True,
                "category_id": "electronics",
                "subcategory": "Phones",
                "condition": "New",
                "location": "Berlin, Germany",
                "images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="],
                "attributes": {
                    "brand": "Apple",
                    "model": "iPhone 15 Pro",
                    "storage": "256GB"
                }
            }
            
            response = self.session.post(f"{API_URL}/listings", json=listing_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and data.get('title') == listing_data['title']:
                    self.created_listing_id = data['id']
                    self.log_result("POST /api/listings - Create listing", True, f"Created listing: {data['id']}")
                else:
                    self.log_result("POST /api/listings - Create listing", False, "Invalid response format", data)
            else:
                self.log_result("POST /api/listings - Create listing", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/listings - Create listing", False, f"Exception: {str(e)}")
        
        # Test get my listings (auth required)
        try:
            response = self.session.get(f"{API_URL}/listings/my", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/listings/my - My listings", True, f"Found {len(data)} user listings")
                else:
                    self.log_result("GET /api/listings/my - My listings", False, "Invalid response format", data)
            else:
                self.log_result("GET /api/listings/my - My listings", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/listings/my - My listings", False, f"Exception: {str(e)}")
    
    def test_auth_api(self):
        """Test authentication API"""
        print("=== Testing Auth API ===")
        
        # Test get current user (should work with test session)
        try:
            response = self.session.get(f"{API_URL}/auth/me", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'user_id' in data and 'email' in data:
                    self.log_result("GET /api/auth/me - Current user", True, f"User: {data.get('name', 'Unknown')}")
                else:
                    self.log_result("GET /api/auth/me - Current user", False, "Invalid user data", data)
            else:
                self.log_result("GET /api/auth/me - Current user", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/auth/me - Current user", False, f"Exception: {str(e)}")
        
        # Test session exchange (would need valid session_id from Emergent Auth)
        try:
            session_data = {"session_id": "test_session_id_123"}
            response = self.session.post(f"{API_URL}/auth/session", json=session_data, timeout=10)
            # This will likely fail without valid Emergent Auth session, but we test the endpoint
            if response.status_code in [200, 401]:
                if response.status_code == 200:
                    self.log_result("POST /api/auth/session - Session exchange", True, "Session exchange successful")
                else:
                    self.log_result("POST /api/auth/session - Session exchange", True, "Endpoint working (401 expected without valid session)")
            else:
                self.log_result("POST /api/auth/session - Session exchange", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/auth/session - Session exchange", False, f"Exception: {str(e)}")
        
        # Test logout (but don't actually logout to keep session for other tests)
        try:
            # Create a separate session for logout test to preserve main session
            logout_session = requests.Session()
            logout_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {TEST_SESSION_TOKEN}'
            })
            response = logout_session.post(f"{API_URL}/auth/logout", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("POST /api/auth/logout - Logout", True, "Logout endpoint working")
                else:
                    self.log_result("POST /api/auth/logout - Logout", False, "Invalid response", data)
            else:
                self.log_result("POST /api/auth/logout - Logout", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/auth/logout - Logout", False, f"Exception: {str(e)}")
    
    def test_favorites_api(self):
        """Test favorites API (auth required)"""
        print("=== Testing Favorites API ===")
        
        # Test get favorites
        try:
            response = self.session.get(f"{API_URL}/favorites", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/favorites - Get favorites", True, f"Found {len(data)} favorites")
                else:
                    self.log_result("GET /api/favorites - Get favorites", False, "Invalid response format", data)
            else:
                self.log_result("GET /api/favorites - Get favorites", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/favorites - Get favorites", False, f"Exception: {str(e)}")
        
        # Test add to favorites (need a listing ID)
        if hasattr(self, 'created_listing_id'):
            try:
                response = self.session.post(f"{API_URL}/favorites/{self.created_listing_id}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'message' in data:
                        self.log_result("POST /api/favorites/{id} - Add favorite", True, "Added to favorites")
                    else:
                        self.log_result("POST /api/favorites/{id} - Add favorite", False, "Invalid response", data)
                else:
                    self.log_result("POST /api/favorites/{id} - Add favorite", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST /api/favorites/{id} - Add favorite", False, f"Exception: {str(e)}")
            
            # Test remove from favorites
            try:
                response = self.session.delete(f"{API_URL}/favorites/{self.created_listing_id}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'message' in data:
                        self.log_result("DELETE /api/favorites/{id} - Remove favorite", True, "Removed from favorites")
                    else:
                        self.log_result("DELETE /api/favorites/{id} - Remove favorite", False, "Invalid response", data)
                else:
                    self.log_result("DELETE /api/favorites/{id} - Remove favorite", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("DELETE /api/favorites/{id} - Remove favorite", False, f"Exception: {str(e)}")
        else:
            self.log_result("POST /api/favorites/{id} - Add favorite", False, "No listing ID available for testing")
            self.log_result("DELETE /api/favorites/{id} - Remove favorite", False, "No listing ID available for testing")
    
    def test_conversations_api(self):
        """Test conversations/messaging API (auth required)"""
        print("=== Testing Conversations API ===")
        
        # Test get conversations
        try:
            response = self.session.get(f"{API_URL}/conversations", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/conversations - Get conversations", True, f"Found {len(data)} conversations")
                else:
                    self.log_result("GET /api/conversations - Get conversations", False, "Invalid response format", data)
            else:
                self.log_result("GET /api/conversations - Get conversations", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/conversations - Get conversations", False, f"Exception: {str(e)}")
        
        # Test create conversation (need a listing ID)
        if hasattr(self, 'created_listing_id'):
            try:
                params = {'listing_id': self.created_listing_id}
                response = self.session.post(f"{API_URL}/conversations", params=params, timeout=10)
                if response.status_code in [200, 400]:  # 400 expected if trying to message own listing
                    if response.status_code == 200:
                        data = response.json()
                        if 'id' in data:
                            self.conversation_id = data['id']
                            self.log_result("POST /api/conversations - Create conversation", True, f"Created conversation: {data['id']}")
                        else:
                            self.log_result("POST /api/conversations - Create conversation", False, "Invalid response format", data)
                    else:
                        # 400 is expected when trying to message own listing
                        self.log_result("POST /api/conversations - Create conversation", True, "Endpoint working (400 expected for own listing)")
                else:
                    self.log_result("POST /api/conversations - Create conversation", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST /api/conversations - Create conversation", False, f"Exception: {str(e)}")
        else:
            self.log_result("POST /api/conversations - Create conversation", False, "No listing ID available for testing")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Backend API Tests")
        print(f"Backend URL: {BASE_URL}")
        print(f"API URL: {API_URL}")
        print(f"Test Session Token: {TEST_SESSION_TOKEN}")
        print("=" * 60)
        
        # Initialize test data
        self.created_listing_id = None
        self.conversation_id = None
        
        # Run tests
        self.test_health_check()
        self.test_categories_api()
        self.test_listings_api()
        self.test_auth_api()
        self.test_favorites_api()
        self.test_conversations_api()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        return passed_tests, failed_tests

def main():
    """Main test execution"""
    print("Local Marketplace Backend API Test Suite")
    print("=" * 60)
    
    # Create test user and session in MongoDB first
    print("⚠️  IMPORTANT: Make sure test user and session are created in MongoDB:")
    print("Run this MongoDB command first:")
    print("""
mongosh --eval "
use('test_database');
var userId = 'user_test123';
var sessionToken = 'test_session_123';
db.users.insertOne({
  user_id: userId,
  email: 'test@example.com',
  name: 'Test User',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Created test user and session');
"
    """)
    print("=" * 60)
    
    # Run tests
    tester = APITester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()