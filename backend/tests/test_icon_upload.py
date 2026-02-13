"""
Test Icon Upload functionality for Admin Dashboard
Tests:
- Category icon upload (POST /api/admin/categories/{id}/icon)
- Category icon delete (DELETE /api/admin/categories/{id}/icon)
- Attribute icon upload (POST /api/admin/categories/{cat_id}/attributes/{attr_id}/icon)
- Attribute icon delete (DELETE /api/admin/categories/{cat_id}/attributes/{attr_id}/icon)
- Verify Locations API
- Verify Deeplinks API
- Verify Auth settings load
"""

import pytest
import requests
import os
import io

# Get the API base URL from environment
BASE_URL = "https://quick-sell-15.preview.emergentagent.com/api/admin"

# Test credentials from main agent
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


# Fixtures
@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def test_category_id(auth_headers):
    """Find a category to use for testing"""
    # List categories and get the first one
    response = requests.get(
        f"{BASE_URL}/categories?flat=true&include_hidden=true",
        headers=auth_headers
    )
    assert response.status_code == 200, f"Failed to list categories: {response.text}"
    categories = response.json()
    assert len(categories) > 0, "No categories found in database"
    return categories[0]["id"]


@pytest.fixture(scope="module")
def test_category_with_attributes(auth_headers):
    """Find a category that has attributes for testing"""
    response = requests.get(
        f"{BASE_URL}/categories?flat=true&include_hidden=true",
        headers=auth_headers
    )
    assert response.status_code == 200, f"Failed to list categories: {response.text}"
    
    categories = response.json()
    for cat in categories:
        attrs = cat.get("attributes", [])
        if attrs:
            return {"category_id": cat["id"], "attribute_id": attrs[0]["id"], "category_name": cat["name"], "attribute_name": attrs[0]["name"]}
    
    pytest.skip("No category with attributes found for testing")


@pytest.fixture(scope="module")
def png_file():
    """Create a simple PNG test file (1x1 red pixel)"""
    png_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
        0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    return png_data


@pytest.fixture(scope="module")
def svg_file():
    """Create a simple SVG test file"""
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="red"/>
    </svg>'''
    return svg_content.encode('utf-8')


# ========================
# Category Icon Tests
# ========================

class TestCategoryIconUpload:
    """Test category icon upload and delete"""
    
    def test_upload_category_icon_png(self, auth_headers, test_category_id, png_file):
        """Test uploading a PNG icon to category"""
        files = {'file': ('test_icon.png', io.BytesIO(png_file), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload category icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        assert data.get("icon_type") == "image/png", f"Wrong icon type: {data.get('icon_type')}"
        print(f"SUCCESS: Uploaded PNG icon to category {test_category_id}")
    
    def test_verify_category_icon_stored(self, auth_headers, test_category_id):
        """Verify the icon was stored in the category"""
        response = requests.get(
            f"{BASE_URL}/categories/{test_category_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category: {response.text}"
        data = response.json()
        
        icon = data.get("icon")
        assert icon is not None, "Icon not found in category"
        assert icon.startswith("data:image/png;base64,"), f"Icon not stored as base64: {icon[:50] if icon else 'None'}..."
        print(f"SUCCESS: Verified icon stored as base64 for category {test_category_id}")
    
    def test_upload_category_icon_svg(self, auth_headers, test_category_id, svg_file):
        """Test uploading an SVG icon to category"""
        files = {'file': ('test_icon.svg', io.BytesIO(svg_file), 'image/svg+xml')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload SVG: {response.text}"
        data = response.json()
        assert data.get("icon_type") == "image/svg+xml", f"Wrong icon type: {data.get('icon_type')}"
        print(f"SUCCESS: Uploaded SVG icon to category {test_category_id}")
    
    def test_upload_invalid_file_type(self, auth_headers, test_category_id):
        """Test uploading an invalid file type is rejected"""
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Correctly rejected invalid file type")
    
    def test_upload_file_too_large(self, auth_headers, test_category_id):
        """Test uploading a file that exceeds 500KB limit"""
        large_content = b'x' * (600 * 1024)  # 600KB
        files = {'file': ('large.png', io.BytesIO(large_content), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        print("SUCCESS: Correctly rejected file exceeding 500KB limit")
    
    def test_delete_category_icon(self, auth_headers, test_category_id):
        """Test deleting a category icon"""
        response = requests.delete(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"SUCCESS: Deleted icon from category {test_category_id}")
    
    def test_verify_category_icon_deleted(self, auth_headers, test_category_id):
        """Verify the icon was removed from the category"""
        response = requests.get(
            f"{BASE_URL}/categories/{test_category_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category: {response.text}"
        data = response.json()
        
        icon = data.get("icon")
        # Icon should be None, empty, or not a data URL after deletion
        assert icon is None or icon == "" or not (isinstance(icon, str) and icon.startswith("data:")), f"Icon still present: {icon[:50] if icon else 'None'}..."
        print(f"SUCCESS: Verified icon was removed from category {test_category_id}")


# ========================
# Attribute Icon Tests
# ========================

class TestAttributeIconUpload:
    """Test attribute icon upload and delete"""
    
    def test_upload_attribute_icon_png(self, auth_headers, test_category_with_attributes, png_file):
        """Test uploading a PNG icon to attribute"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        files = {'file': ('attr_icon.png', io.BytesIO(png_file), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{cat_id}/attributes/{attr_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload attribute icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        assert data.get("icon_type") == "image/png", f"Wrong icon type: {data.get('icon_type')}"
        print(f"SUCCESS: Uploaded PNG icon to attribute {attr_id} in category {cat_id}")
    
    def test_verify_attribute_icon_stored(self, auth_headers, test_category_with_attributes):
        """Verify the icon was stored in the attribute"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        response = requests.get(
            f"{BASE_URL}/categories/{cat_id}/attributes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get attributes: {response.text}"
        attributes = response.json()
        
        target_attr = None
        for attr in attributes:
            if attr["id"] == attr_id:
                target_attr = attr
                break
        
        assert target_attr is not None, f"Attribute {attr_id} not found"
        
        icon = target_attr.get("icon")
        assert icon is not None, "Icon not found in attribute"
        assert icon.startswith("data:image/png;base64,"), f"Icon not stored as base64: {icon[:50] if icon else 'None'}..."
        print(f"SUCCESS: Verified icon stored for attribute {attr_id}")
    
    def test_upload_attribute_icon_svg(self, auth_headers, test_category_with_attributes, svg_file):
        """Test uploading an SVG icon to attribute"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        files = {'file': ('attr_icon.svg', io.BytesIO(svg_file), 'image/svg+xml')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{cat_id}/attributes/{attr_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload SVG: {response.text}"
        data = response.json()
        assert data.get("icon_type") == "image/svg+xml", f"Wrong icon type: {data.get('icon_type')}"
        print(f"SUCCESS: Uploaded SVG icon to attribute {attr_id}")
    
    def test_upload_attribute_file_too_large(self, auth_headers, test_category_with_attributes):
        """Test uploading a file that exceeds 200KB limit for attributes"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        large_content = b'x' * (250 * 1024)  # 250KB
        files = {'file': ('large.png', io.BytesIO(large_content), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{cat_id}/attributes/{attr_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        print("SUCCESS: Correctly rejected file exceeding 200KB limit for attribute")
    
    def test_upload_attribute_invalid_category(self, auth_headers, test_category_with_attributes, png_file):
        """Test uploading icon to non-existent category"""
        attr_id = test_category_with_attributes["attribute_id"]
        
        files = {'file': ('icon.png', io.BytesIO(png_file), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/nonexistent_cat/attributes/{attr_id}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Correctly returned 404 for non-existent category")
    
    def test_upload_attribute_invalid_attribute(self, auth_headers, test_category_with_attributes, png_file):
        """Test uploading icon to non-existent attribute"""
        cat_id = test_category_with_attributes["category_id"]
        
        files = {'file': ('icon.png', io.BytesIO(png_file), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{cat_id}/attributes/nonexistent_attr/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Correctly returned 404 for non-existent attribute")
    
    def test_delete_attribute_icon(self, auth_headers, test_category_with_attributes):
        """Test deleting an attribute icon"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        response = requests.delete(
            f"{BASE_URL}/categories/{cat_id}/attributes/{attr_id}/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"SUCCESS: Deleted icon from attribute {attr_id}")
    
    def test_verify_attribute_icon_deleted(self, auth_headers, test_category_with_attributes):
        """Verify the icon was removed from the attribute"""
        cat_id = test_category_with_attributes["category_id"]
        attr_id = test_category_with_attributes["attribute_id"]
        
        response = requests.get(
            f"{BASE_URL}/categories/{cat_id}/attributes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get attributes: {response.text}"
        attributes = response.json()
        
        target_attr = None
        for attr in attributes:
            if attr["id"] == attr_id:
                target_attr = attr
                break
        
        assert target_attr is not None, f"Attribute {attr_id} not found"
        
        icon = target_attr.get("icon")
        assert icon is None or icon == "" or not (isinstance(icon, str) and icon.startswith("data:")), f"Icon still present: {icon[:50] if icon else 'None'}..."
        print(f"SUCCESS: Verified icon was removed from attribute {attr_id}")


# ========================
# Settings Page Tests
# ========================

class TestSettingsEndpoints:
    """Test Settings page endpoints: Locations, Deeplinks, Auth"""
    
    def test_get_locations(self, auth_headers):
        """Verify GET /api/admin/locations returns data"""
        response = requests.get(f"{BASE_URL}/locations", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get locations: {response.text}"
        data = response.json()
        
        assert "items" in data, "No items in response"
        assert "total" in data, "No total in response"
        
        items = data["items"]
        print(f"SUCCESS: Found {len(items)} locations, total: {data['total']}")
        
        # Check if New York exists
        new_york_found = any("new york" in loc.get("name", "").lower() for loc in items)
        if new_york_found:
            print("SUCCESS: Found New York location")
        else:
            print("WARNING: New York location not found in first page")
    
    def test_get_deeplinks(self, auth_headers):
        """Verify GET /api/admin/deeplinks returns data"""
        response = requests.get(f"{BASE_URL}/deeplinks", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get deeplinks: {response.text}"
        data = response.json()
        
        assert "items" in data, "No items in response"
        assert "total" in data, "No total in response"
        
        items = data["items"]
        print(f"SUCCESS: Found {len(items)} deeplinks, total: {data['total']}")
        
        # Check if Summer Sale exists
        summer_sale_found = any("summer sale" in link.get("name", "").lower() for link in items)
        if summer_sale_found:
            print("SUCCESS: Found Summer Sale deeplink")
        else:
            print("WARNING: Summer Sale deeplink not found in results")
    
    def test_get_auth_settings(self, auth_headers):
        """Verify GET /api/admin/settings/auth loads correctly"""
        response = requests.get(f"{BASE_URL}/settings/auth", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get auth settings: {response.text}"
        data = response.json()
        
        expected_fields = ["allow_registration", "require_email_verification", "password_min_length", "max_login_attempts"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"SUCCESS: Auth settings loaded with {len(data)} settings")


# ========================
# Edge Cases & Error Handling
# ========================

class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_upload_without_auth(self, test_category_id):
        """Test that upload without authentication fails"""
        files = {'file': ('icon.png', io.BytesIO(b'test'), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/categories/{test_category_id}/icon",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Correctly rejected request without authentication")
    
    def test_delete_nonexistent_category_icon(self, auth_headers):
        """Test deleting icon from non-existent category"""
        response = requests.delete(
            f"{BASE_URL}/categories/nonexistent_cat_12345/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Correctly returned 404 for non-existent category")
    
    def test_delete_nonexistent_attribute_icon(self, auth_headers, test_category_with_attributes):
        """Test deleting icon from non-existent attribute"""
        cat_id = test_category_with_attributes["category_id"]
        
        response = requests.delete(
            f"{BASE_URL}/categories/{cat_id}/attributes/nonexistent_attr_12345/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Correctly returned 404 for non-existent attribute")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
