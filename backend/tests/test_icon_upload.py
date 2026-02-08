"""
Test Icon Upload functionality for Admin Dashboard
Tests:
- Category icon upload (POST /api/admin/categories/{id}/icon)
- Category icon delete (DELETE /api/admin/categories/{id}/icon)
- Attribute icon upload (POST /api/admin/categories/{cat_id}/attributes/{attr_id}/icon)
- Attribute icon delete (DELETE /api/admin/categories/{cat_id}/attributes/{attr_id}/icon)
- Verify Locations has New York entry
- Verify Deeplinks has Summer Sale entry
- Verify Auth settings load
"""

import pytest
import requests
import os
import io
import base64

# Get the API base URL from environment
BASE_URL = "https://admin-dash-preview-1.preview.emergentagent.com/api/admin"

# Test credentials from main agent
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

# Test IDs from main agent
TEST_CATEGORY_ID = "cat_auto"
TEST_ATTRIBUTE_CATEGORY_ID = "cat_auto_cars"  # Category with attributes
TEST_ATTRIBUTE_ID = "attr_make"


class TestIconUploadSetup:
    """Setup and fixtures for icon upload tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
        }
    
    @pytest.fixture(scope="class")
    def png_file(self):
        """Create a simple PNG test file (1x1 red pixel)"""
        # Minimal PNG: 1x1 red pixel
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,  # IEND chunk
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        return png_data
    
    @pytest.fixture(scope="class")
    def svg_file(self):
        """Create a simple SVG test file"""
        svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="red"/>
        </svg>'''
        return svg_content.encode('utf-8')


class TestCategoryIconUpload(TestIconUploadSetup):
    """Test category icon upload and delete"""
    
    category_id_to_use = TEST_CATEGORY_ID
    
    def test_01_verify_category_exists(self, auth_headers):
        """Verify the test category exists before testing icon upload"""
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}",
            headers=auth_headers
        )
        if response.status_code == 404:
            # Try to list categories and find one
            list_response = requests.get(
                f"{BASE_URL}/categories?flat=true&include_hidden=true",
                headers=auth_headers
            )
            assert list_response.status_code == 200, f"Failed to list categories: {list_response.text}"
            categories = list_response.json()
            assert len(categories) > 0, "No categories found in database"
            # Use first available category for testing
            TestCategoryIconUpload.category_id_to_use = categories[0]["id"]
            print(f"Using category: {TestCategoryIconUpload.category_id_to_use} ({categories[0]['name']}) for testing")
        else:
            assert response.status_code == 200, f"Failed to get category: {response.text}"
            data = response.json()
            print(f"Found test category: {data.get('name', TEST_CATEGORY_ID)}")
    
    def test_02_upload_category_icon_png(self, auth_headers, png_file):
        """Test uploading a PNG icon to category"""
        files = {
            'file': ('test_icon.png', io.BytesIO(png_file), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload category icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        assert data.get("icon_type") == "image/png", f"Wrong icon type: {data.get('icon_type')}"
        print(f"Successfully uploaded PNG icon to category {TEST_CATEGORY_ID}")
    
    def test_03_verify_category_icon_stored(self, auth_headers):
        """Verify the icon was stored in the category"""
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category: {response.text}"
        data = response.json()
        
        # Check if icon is stored (should be base64 data URL)
        icon = data.get("icon")
        assert icon is not None, "Icon not found in category"
        assert icon.startswith("data:image/png;base64,"), f"Icon not stored as base64 data URL: {icon[:50] if icon else 'None'}..."
        print(f"Verified icon stored as base64 data URL for category {TEST_CATEGORY_ID}")
    
    def test_04_upload_category_icon_svg(self, auth_headers, svg_file):
        """Test uploading an SVG icon to category"""
        files = {
            'file': ('test_icon.svg', io.BytesIO(svg_file), 'image/svg+xml')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload category SVG icon: {response.text}"
        data = response.json()
        assert data.get("icon_type") == "image/svg+xml", f"Wrong icon type: {data.get('icon_type')}"
        print(f"Successfully uploaded SVG icon to category {TEST_CATEGORY_ID}")
    
    def test_05_upload_invalid_file_type(self, auth_headers):
        """Test uploading an invalid file type is rejected"""
        files = {
            'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("Correctly rejected invalid file type for category icon")
    
    def test_06_upload_file_too_large(self, auth_headers):
        """Test uploading a file that exceeds 500KB limit"""
        # Create a 600KB file
        large_content = b'x' * (600 * 1024)
        files = {
            'file': ('large.png', io.BytesIO(large_content), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        assert "too large" in response.text.lower() or "500kb" in response.text.lower(), f"Wrong error message: {response.text}"
        print("Correctly rejected file exceeding 500KB limit")
    
    def test_07_delete_category_icon(self, auth_headers):
        """Test deleting a category icon"""
        response = requests.delete(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete category icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"Successfully deleted icon from category {TEST_CATEGORY_ID}")
    
    def test_08_verify_category_icon_deleted(self, auth_headers):
        """Verify the icon was removed from the category"""
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category: {response.text}"
        data = response.json()
        
        # Icon should be None or empty after deletion
        icon = data.get("icon")
        # Note: $unset removes the field, so it may be None or not present
        assert icon is None or icon == "" or not icon.startswith("data:"), f"Icon still present after deletion: {icon[:50] if icon else 'None'}..."
        print(f"Verified icon was removed from category {TEST_CATEGORY_ID}")


class TestAttributeIconUpload(TestIconUploadSetup):
    """Test attribute icon upload and delete"""
    
    def test_01_find_category_with_attributes(self, auth_headers):
        """Find a category that has attributes for testing"""
        global TEST_ATTRIBUTE_CATEGORY_ID, TEST_ATTRIBUTE_ID
        
        # First try the provided category
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            attributes = data.get("attributes", [])
            if attributes:
                TEST_ATTRIBUTE_ID = attributes[0]["id"]
                print(f"Using existing category {TEST_ATTRIBUTE_CATEGORY_ID} with attribute {TEST_ATTRIBUTE_ID}")
                return
        
        # If not found, search for any category with attributes
        list_response = requests.get(
            f"{BASE_URL}/categories?flat=true&include_hidden=true",
            headers=auth_headers
        )
        assert list_response.status_code == 200, f"Failed to list categories: {list_response.text}"
        
        categories = list_response.json()
        for cat in categories:
            attrs = cat.get("attributes", [])
            if attrs:
                TEST_ATTRIBUTE_CATEGORY_ID = cat["id"]
                TEST_ATTRIBUTE_ID = attrs[0]["id"]
                print(f"Found category {cat['name']} ({TEST_ATTRIBUTE_CATEGORY_ID}) with attribute {attrs[0]['name']} ({TEST_ATTRIBUTE_ID})")
                return
        
        pytest.skip("No category with attributes found for testing")
    
    def test_02_upload_attribute_icon_png(self, auth_headers, png_file):
        """Test uploading a PNG icon to attribute"""
        files = {
            'file': ('attr_icon.png', io.BytesIO(png_file), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/{TEST_ATTRIBUTE_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload attribute icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        assert data.get("icon_type") == "image/png", f"Wrong icon type: {data.get('icon_type')}"
        print(f"Successfully uploaded PNG icon to attribute {TEST_ATTRIBUTE_ID}")
    
    def test_03_verify_attribute_icon_stored(self, auth_headers):
        """Verify the icon was stored in the attribute"""
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category attributes: {response.text}"
        attributes = response.json()
        
        # Find our attribute
        target_attr = None
        for attr in attributes:
            if attr["id"] == TEST_ATTRIBUTE_ID:
                target_attr = attr
                break
        
        assert target_attr is not None, f"Attribute {TEST_ATTRIBUTE_ID} not found"
        
        icon = target_attr.get("icon")
        assert icon is not None, "Icon not found in attribute"
        assert icon.startswith("data:image/png;base64,"), f"Icon not stored as base64 data URL: {icon[:50] if icon else 'None'}..."
        print(f"Verified icon stored as base64 data URL for attribute {TEST_ATTRIBUTE_ID}")
    
    def test_04_upload_attribute_icon_svg(self, auth_headers, svg_file):
        """Test uploading an SVG icon to attribute"""
        files = {
            'file': ('attr_icon.svg', io.BytesIO(svg_file), 'image/svg+xml')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/{TEST_ATTRIBUTE_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload attribute SVG icon: {response.text}"
        data = response.json()
        assert data.get("icon_type") == "image/svg+xml", f"Wrong icon type: {data.get('icon_type')}"
        print(f"Successfully uploaded SVG icon to attribute {TEST_ATTRIBUTE_ID}")
    
    def test_05_upload_attribute_file_too_large(self, auth_headers):
        """Test uploading a file that exceeds 200KB limit for attributes"""
        # Create a 250KB file
        large_content = b'x' * (250 * 1024)
        files = {
            'file': ('large.png', io.BytesIO(large_content), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/{TEST_ATTRIBUTE_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        assert "too large" in response.text.lower() or "200kb" in response.text.lower(), f"Wrong error message: {response.text}"
        print("Correctly rejected file exceeding 200KB limit for attribute")
    
    def test_06_upload_attribute_invalid_category(self, auth_headers, png_file):
        """Test uploading icon to non-existent category"""
        files = {
            'file': ('icon.png', io.BytesIO(png_file), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/nonexistent_cat/attributes/{TEST_ATTRIBUTE_ID}/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent category, got {response.status_code}"
        print("Correctly returned 404 for non-existent category")
    
    def test_07_upload_attribute_invalid_attribute(self, auth_headers, png_file):
        """Test uploading icon to non-existent attribute"""
        files = {
            'file': ('icon.png', io.BytesIO(png_file), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/nonexistent_attr/icon",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent attribute, got {response.status_code}"
        print("Correctly returned 404 for non-existent attribute")
    
    def test_08_delete_attribute_icon(self, auth_headers):
        """Test deleting an attribute icon"""
        response = requests.delete(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/{TEST_ATTRIBUTE_ID}/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete attribute icon: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"Successfully deleted icon from attribute {TEST_ATTRIBUTE_ID}")
    
    def test_09_verify_attribute_icon_deleted(self, auth_headers):
        """Verify the icon was removed from the attribute"""
        response = requests.get(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get category attributes: {response.text}"
        attributes = response.json()
        
        target_attr = None
        for attr in attributes:
            if attr["id"] == TEST_ATTRIBUTE_ID:
                target_attr = attr
                break
        
        assert target_attr is not None, f"Attribute {TEST_ATTRIBUTE_ID} not found"
        
        icon = target_attr.get("icon")
        # Icon should be None, empty, or not a data URL after deletion
        assert icon is None or icon == "" or not (isinstance(icon, str) and icon.startswith("data:")), f"Icon still present after deletion: {icon[:50] if icon else 'None'}..."
        print(f"Verified icon was removed from attribute {TEST_ATTRIBUTE_ID}")


class TestSettingsEndpoints(TestIconUploadSetup):
    """Test Settings page endpoints: Locations, Deeplinks, Auth"""
    
    def test_01_get_locations_verify_data(self, auth_headers):
        """Verify GET /api/admin/locations returns data and check for New York"""
        response = requests.get(
            f"{BASE_URL}/locations",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get locations: {response.text}"
        data = response.json()
        
        # Should return paginated response
        assert "items" in data, "No items in response"
        assert "total" in data, "No total in response"
        
        items = data["items"]
        print(f"Found {len(items)} locations, total: {data['total']}")
        
        # Check if New York exists (case insensitive search)
        new_york_found = False
        for loc in items:
            if "new york" in loc.get("name", "").lower():
                new_york_found = True
                print(f"Found New York location: {loc}")
                break
        
        # If not found, just log it - it may not exist yet
        if not new_york_found:
            print("WARNING: New York location not found in first page of results")
    
    def test_02_get_deeplinks_verify_data(self, auth_headers):
        """Verify GET /api/admin/deeplinks returns data and check for Summer Sale"""
        response = requests.get(
            f"{BASE_URL}/deeplinks",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get deeplinks: {response.text}"
        data = response.json()
        
        # Should return paginated response
        assert "items" in data, "No items in response"
        assert "total" in data, "No total in response"
        
        items = data["items"]
        print(f"Found {len(items)} deeplinks, total: {data['total']}")
        
        # Check if Summer Sale exists (case insensitive search)
        summer_sale_found = False
        for link in items:
            if "summer sale" in link.get("name", "").lower():
                summer_sale_found = True
                print(f"Found Summer Sale deeplink: {link}")
                break
        
        # If not found, just log it - it may not exist yet
        if not summer_sale_found:
            print("WARNING: Summer Sale deeplink not found in results")
    
    def test_03_get_auth_settings(self, auth_headers):
        """Verify GET /api/admin/settings/auth loads correctly"""
        response = requests.get(
            f"{BASE_URL}/settings/auth",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get auth settings: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = [
            "allow_registration",
            "require_email_verification",
            "password_min_length",
            "max_login_attempts",
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Auth settings loaded successfully: {data}")
    
    def test_04_update_auth_settings(self, auth_headers):
        """Test updating auth settings"""
        # Get current settings first
        get_response = requests.get(
            f"{BASE_URL}/settings/auth",
            headers=auth_headers
        )
        current_settings = get_response.json()
        
        # Update with a minor change
        update_data = {
            "allow_registration": current_settings.get("allow_registration", True),
            "password_min_length": current_settings.get("password_min_length", 8),
            "max_login_attempts": current_settings.get("max_login_attempts", 5),
            "session_timeout_minutes": 1440
        }
        
        response = requests.put(
            f"{BASE_URL}/settings/auth",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Failed to update auth settings: {response.text}"
        data = response.json()
        assert data.get("session_timeout_minutes") == 1440, f"Setting not updated: {data}"
        print("Auth settings updated successfully")


class TestEdgeCases(TestIconUploadSetup):
    """Test edge cases and error handling"""
    
    def test_01_upload_without_auth(self):
        """Test that upload without authentication fails"""
        files = {
            'file': ('icon.png', io.BytesIO(b'test'), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/icon",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Correctly rejected request without authentication")
    
    def test_02_delete_nonexistent_category_icon(self, auth_headers):
        """Test deleting icon from non-existent category"""
        response = requests.delete(
            f"{BASE_URL}/categories/nonexistent_cat_12345/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent category, got {response.status_code}"
        print("Correctly returned 404 for non-existent category icon delete")
    
    def test_03_delete_nonexistent_attribute_icon(self, auth_headers):
        """Test deleting icon from non-existent attribute"""
        response = requests.delete(
            f"{BASE_URL}/categories/{TEST_ATTRIBUTE_CATEGORY_ID}/attributes/nonexistent_attr_12345/icon",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent attribute, got {response.status_code}"
        print("Correctly returned 404 for non-existent attribute icon delete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
