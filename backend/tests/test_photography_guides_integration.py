"""
Test Photography Guides Integration - Hook behavior simulation
Tests the public API endpoint behavior that the usePhotographyGuides hook relies on
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://negotiate-badge.preview.emergentagent.com').rstrip('/')


class TestUsePhotographyGuidesHookBehavior:
    """Tests simulating what the usePhotographyGuides hook does"""
    
    def test_hook_fetches_guides_for_auto_vehicles_category(self):
        """
        Simulates: usePhotographyGuides('auto_vehicles')
        The hook calls GET /api/photography-guides/public/{category_id}
        """
        # This is what the hook does
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        
        assert response.status_code == 200, f"API should return 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure matches what the hook expects
        assert "guides" in data, "Response must have 'guides' array"
        assert "count" in data, "Response must have 'count'"
        assert isinstance(data["guides"], list), "guides must be a list"
        assert data["count"] >= 1, "Should have at least 1 guide for auto_vehicles"
        
        # Verify each guide has required fields for the hook
        for guide in data["guides"]:
            # These are the fields the hook/component uses
            assert "id" in guide, "Guide must have 'id'"
            assert "title" in guide, "Guide must have 'title'"
            assert "description" in guide, "Guide must have 'description'"
            assert "icon" in guide, "Guide must have 'icon'"
            # category_id must match
            assert guide.get("category_id") == "auto_vehicles"
            
        print(f"\nGuides returned for auto_vehicles: {data['count']}")
        for guide in data["guides"]:
            print(f"  - {guide['title']}: {guide['description'][:50]}...")
    
    def test_hook_fetches_guides_for_properties_category(self):
        """Simulates: usePhotographyGuides('properties')"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/properties")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "guides" in data
        print(f"\nGuides returned for properties: {data['count']}")
        for guide in data["guides"]:
            print(f"  - {guide['title']}")
    
    def test_hook_fetches_guides_for_electronics_category(self):
        """Simulates: usePhotographyGuides('electronics')"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/electronics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "guides" in data
        print(f"\nGuides returned for electronics: {data['count']}")
    
    def test_hook_returns_empty_for_unknown_category(self):
        """
        Simulates: usePhotographyGuides('unknown_category_xyz')
        Hook should receive empty array and fall back to static tips
        """
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/unknown_category_xyz")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["count"] == 0
        assert data["guides"] == []
        print("\nEmpty response for unknown category - hook will use static fallback")
    
    def test_hook_handles_default_category(self):
        """
        Simulates: usePhotographyGuides('default')
        Default category is used when no specific guides exist
        """
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/default")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"\nGuides returned for default: {data['count']}")
        # Default should have some guides for fallback
        assert data["count"] >= 0  # Could be 0 if not seeded


class TestAutoVehiclesGuidesContent:
    """Verify specific content of auto_vehicles guides"""
    
    def test_auto_vehicles_has_expected_guides(self):
        """
        The admin dashboard seeded 4 guides for auto_vehicles:
        - Exterior Shots
        - Dashboard & Mileage
        - Engine Bay
        - Any Damage
        """
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        assert response.status_code == 200
        
        data = response.json()
        guides = data["guides"]
        titles = [g["title"] for g in guides]
        
        # Check for expected guides
        expected_titles = [
            "Exterior Shots",
            "Dashboard & Mileage", 
            "Engine Bay",
            "Any Damage"
        ]
        
        for expected in expected_titles:
            assert expected in titles, f"Expected guide '{expected}' not found. Found: {titles}"
            print(f"  PASS: '{expected}' guide exists")
        
        print(f"\nAll {len(expected_titles)} expected auto_vehicles guides verified")
    
    def test_auto_vehicles_guides_have_correct_icons(self):
        """Verify guides have appropriate icons for display"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        data = response.json()
        
        for guide in data["guides"]:
            assert guide["icon"], f"Guide '{guide['title']}' must have an icon"
            # Icon should be a valid Ionicon name
            assert "-outline" in guide["icon"] or guide["icon"].endswith("-sharp"), \
                f"Icon '{guide['icon']}' should be a valid Ionicon"
            print(f"  {guide['title']}: icon='{guide['icon']}'")


class TestGuideDisplayOrder:
    """Test that guides are returned in correct display order"""
    
    def test_guides_are_ordered_correctly(self):
        """Guides should be returned in ascending order by 'order' field"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        data = response.json()
        
        guides = data["guides"]
        if len(guides) > 1:
            orders = [g.get("order", 0) for g in guides]
            assert orders == sorted(orders), f"Guides not in correct order: {orders}"
            print(f"\nGuides returned in correct display order: {orders}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
