"""
Test Email Notification Service and Location Filter APIs
Tests for iteration 193
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://badge-fix-3.preview.emergentagent.com').rstrip('/')


class TestEmailNotificationService:
    """Tests for email notification service via SendGrid"""
    
    def test_email_status_endpoint_returns_ready(self):
        """GET /api/email/status should return status: ready"""
        response = requests.get(f"{BASE_URL}/api/email/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields are present
        assert "sendgrid_installed" in data
        assert "api_key_configured" in data
        assert "from_email" in data
        assert "from_name" in data
        assert "status" in data
        
        # Verify SendGrid is properly configured
        assert data["sendgrid_installed"] == True
        assert data["api_key_configured"] == True
        assert data["status"] == "ready"
        assert data["from_email"] == "donotreply@avida.co.tz"
        assert data["from_name"] == "avida"
        
        print(f"Email status endpoint working: {data}")
    
    def test_email_test_endpoint_sends_email(self):
        """POST /api/email/test should successfully send test email"""
        payload = {
            "to_email": "kelvincharlesm@gmail.com",
            "subject": "Avida API Test Email",
            "body": "This is a test email from avida notification system testing via pytest."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify success response
        assert data["success"] == True
        assert "message" in data
        assert "Email sent successfully" in data["message"]
        assert data["details"]["recipient"] == "kelvincharlesm@gmail.com"
        
        print(f"Test email sent successfully: {data}")
    
    def test_email_test_with_notification_type(self):
        """POST /api/email/test with notification_type parameter"""
        payload = {
            "to_email": "kelvincharlesm@gmail.com",
            "subject": "Security Alert Test",
            "body": "This is a security alert notification test.",
            "notification_type": "security_alert"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        print(f"Security alert email sent: {data}")


class TestLocationFilterAPI:
    """Tests for location-based feed filtering"""
    
    def test_location_filter_with_city_parameter(self):
        """GET /api/feed/listings with city parameter should return filtered results"""
        response = requests.get(f"{BASE_URL}/api/feed/listings?city=Dar%20es%20Salaam")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert "nextCursor" in data
        assert "totalApprox" in data
        assert "serverTime" in data
        assert "hasMore" in data
        
        # Items could be empty if no listings match - that's OK for this test
        # The main goal is to verify the API works correctly
        assert isinstance(data["items"], list)
        
        print(f"City filter returned {len(data['items'])} items, total approx: {data['totalApprox']}")
    
    def test_location_filter_with_country_parameter(self):
        """GET /api/feed/listings with country parameter should return filtered results"""
        response = requests.get(f"{BASE_URL}/api/feed/listings?country=TZ")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert "totalApprox" in data
        assert isinstance(data["items"], list)
        
        print(f"Country filter returned {len(data['items'])} items")
    
    def test_location_filter_with_multiple_params(self):
        """GET /api/feed/listings with city and country parameters combined"""
        response = requests.get(f"{BASE_URL}/api/feed/listings?country=TZ&city=Arusha")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert isinstance(data["items"], list)
        
        print(f"Combined location filter returned {len(data['items'])} items")
    
    def test_feed_listings_without_location_filter(self):
        """GET /api/feed/listings without location params should return all active listings"""
        response = requests.get(f"{BASE_URL}/api/feed/listings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert "totalApprox" in data
        assert "serverTime" in data
        
        # Without filter, should return more results
        print(f"Unfiltered feed returned {len(data['items'])} items, total: {data['totalApprox']}")
    
    def test_location_filter_with_region_parameter(self):
        """GET /api/feed/listings with region parameter"""
        response = requests.get(f"{BASE_URL}/api/feed/listings?region=Dar%20es%20Salaam")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert isinstance(data["items"], list)
        
        print(f"Region filter returned {len(data['items'])} items")


class TestFeedAPIStructure:
    """Tests to verify feed API response structure"""
    
    def test_feed_item_structure(self):
        """Verify each item in feed has correct structure"""
        response = requests.get(f"{BASE_URL}/api/feed/listings?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 0:
            item = data["items"][0]
            
            # Verify item structure based on FEED_PROJECTION
            expected_fields = [
                "id", "title", "price", "currency", "cityName", 
                "countryCode", "category", "createdAt", "sellerId"
            ]
            
            for field in expected_fields:
                assert field in item, f"Missing field: {field}"
            
            print(f"Feed item structure verified: {list(item.keys())}")
        else:
            print("No items in feed to verify structure")
    
    def test_feed_pagination(self):
        """Test cursor-based pagination"""
        # First request
        response1 = requests.get(f"{BASE_URL}/api/feed/listings?limit=5")
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1.get("nextCursor"):
            # Second request with cursor
            response2 = requests.get(f"{BASE_URL}/api/feed/listings?limit=5&cursor={data1['nextCursor']}")
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Items should be different
            if len(data1["items"]) > 0 and len(data2["items"]) > 0:
                assert data1["items"][0]["id"] != data2["items"][0]["id"]
            
            print("Pagination working correctly")
        else:
            print("Not enough items to test pagination")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
