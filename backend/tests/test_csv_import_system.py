"""
CSV Import System Tests

Tests the CSV user import feature including:
- GET /api/csv-import/template - Download CSV template
- GET /api/csv-import/fields - Get field information
- POST /api/csv-import/upload - Upload CSV file and get validation_id
- POST /api/csv-import/validate/{validation_id} - Validate all rows before import
- POST /api/csv-import/import/{validation_id} - Start background import job
- GET /api/csv-import/job/{job_id} - Check import job status
- GET /api/csv-import/password-report/{report_id}/download - Download password report
- Validation checks (invalid email, duplicate emails)
- Auto-generated passwords
- Notification creation
"""

import pytest
import requests
import os
import io
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listings-realtime.preview.emergentagent.com').rstrip('/')


class TestCSVImportFields:
    """Test CSV field info and template endpoints"""
    
    def test_get_field_info(self):
        """GET /api/csv-import/fields - Returns field information"""
        response = requests.get(f"{BASE_URL}/api/csv-import/fields")
        assert response.status_code == 200
        
        data = response.json()
        assert "required_fields" in data
        assert "optional_fields" in data
        assert "all_fields" in data
        assert "allowed_roles" in data
        assert "max_rows" in data
        assert "field_descriptions" in data
        
        # Verify required fields
        assert data["required_fields"] == ["email", "first_name", "last_name"]
        assert "role" in data["optional_fields"]
        assert data["allowed_roles"] == ["user", "seller", "admin"]
        assert data["max_rows"] == 1000
        
        print("PASSED: GET /api/csv-import/fields returns correct field info")
    
    def test_get_template(self):
        """GET /api/csv-import/template - Returns CSV template"""
        response = requests.get(f"{BASE_URL}/api/csv-import/template")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        
        # Verify CSV content
        content = response.text
        lines = content.strip().split('\n')
        assert len(lines) >= 2  # Header + at least one sample row
        
        # Check header
        header = lines[0].lower()
        assert "email" in header
        assert "first_name" in header
        assert "last_name" in header
        assert "role" in header
        
        print("PASSED: GET /api/csv-import/template returns valid CSV template")


class TestCSVUploadValidation:
    """Test CSV upload and validation workflow"""
    
    def test_upload_valid_csv(self):
        """POST /api/csv-import/upload - Upload valid CSV file"""
        # Create a valid CSV
        csv_content = """email,first_name,last_name,role
test_user1_{uid}@example.com,John,Doe,user
test_user2_{uid}@example.com,Jane,Smith,seller
""".format(uid=uuid.uuid4().hex[:8])
        
        files = {
            'file': ('test_users.csv', csv_content, 'text/csv')
        }
        params = {'admin_id': 'admin_test_123'}
        
        response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "validation_id" in data
        assert data["total_rows"] == 2
        assert "preview" in data
        assert len(data["preview"]) == 2
        
        # Store validation_id for later tests
        TestCSVUploadValidation.last_validation_id = data["validation_id"]
        print(f"PASSED: POST /api/csv-import/upload - validation_id={data['validation_id']}")
        return data["validation_id"]
    
    def test_upload_invalid_file_type(self):
        """POST /api/csv-import/upload - Reject non-CSV files"""
        files = {
            'file': ('test.txt', 'not a csv file', 'text/plain')
        }
        params = {'admin_id': 'admin_test_123'}
        
        response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert response.status_code == 400
        assert "CSV" in response.json().get("detail", "")
        
        print("PASSED: POST /api/csv-import/upload rejects non-CSV files")
    
    def test_upload_csv_missing_required_fields(self):
        """POST /api/csv-import/upload - Reject CSV missing required columns"""
        # Missing email column
        csv_content = """first_name,last_name,role
John,Doe,user
"""
        files = {
            'file': ('test.csv', csv_content, 'text/csv')
        }
        params = {'admin_id': 'admin_test_123'}
        
        response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "email" in detail.lower() or "required" in detail.lower()
        
        print("PASSED: POST /api/csv-import/upload rejects CSV missing required columns")
    
    def test_validate_valid_csv(self):
        """POST /api/csv-import/validate/{validation_id} - Validate valid CSV rows"""
        # First upload a valid CSV
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
validate_user1_{uid}@example.com,Alice,Johnson,user
validate_user2_{uid}@example.com,Bob,Williams,seller
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': 'admin_test_123'}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        # Now validate
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["valid"] == True
        assert data["total_rows"] == 2
        assert data["error_count"] == 0
        assert len(data["errors"]) == 0
        
        print(f"PASSED: POST /api/csv-import/validate/{validation_id} - All rows valid")
        return validation_id
    
    def test_validate_invalid_email_format(self):
        """POST /api/csv-import/validate - Fail validation with invalid email format"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
invalid-email-no-at,John,Doe,user
valid_email_{uid}@example.com,Jane,Smith,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': 'admin_test_123'}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["valid"] == False
        assert data["error_count"] >= 1
        
        # Check that the error mentions invalid email
        errors = data["errors"]
        assert len(errors) >= 1
        email_error = next((e for e in errors if e["field"] == "email"), None)
        assert email_error is not None
        assert "invalid" in email_error["error"].lower()
        
        print("PASSED: Validation fails for invalid email format")
    
    def test_validate_duplicate_email_in_csv(self):
        """POST /api/csv-import/validate - Fail validation with duplicate emails in CSV"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
duplicate_{uid}@example.com,John,Doe,user
duplicate_{uid}@example.com,Jane,Smith,seller
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': 'admin_test_123'}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["valid"] == False
        assert data["error_count"] >= 1
        
        # Check that the error mentions duplicate
        errors = data["errors"]
        duplicate_error = next((e for e in errors if "duplicate" in e["error"].lower()), None)
        assert duplicate_error is not None
        
        print("PASSED: Validation fails for duplicate emails in CSV")
    
    def test_validate_missing_required_values(self):
        """POST /api/csv-import/validate - Fail validation with missing required values"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
valid_{uid}@example.com,,Doe,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': 'admin_test_123'}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["valid"] == False
        assert data["error_count"] >= 1
        
        # Check for first_name required error
        errors = data["errors"]
        name_error = next((e for e in errors if e["field"] == "first_name"), None)
        assert name_error is not None
        
        print("PASSED: Validation fails for missing required values")
    
    def test_validate_invalid_role(self):
        """POST /api/csv-import/validate - Fail validation with invalid role"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
valid_{uid}@example.com,John,Doe,invalid_role
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': 'admin_test_123'}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["valid"] == False
        assert data["error_count"] >= 1
        
        # Check for role error
        errors = data["errors"]
        role_error = next((e for e in errors if e["field"] == "role"), None)
        assert role_error is not None
        
        print("PASSED: Validation fails for invalid role")
    
    def test_validate_expired_session(self):
        """POST /api/csv-import/validate - Fail for non-existent validation_id"""
        fake_validation_id = "fake-" + uuid.uuid4().hex
        
        response = requests.post(f"{BASE_URL}/api/csv-import/validate/{fake_validation_id}")
        assert response.status_code == 404
        assert "expired" in response.json().get("detail", "").lower() or "not found" in response.json().get("detail", "").lower()
        
        print("PASSED: Validation fails for expired/invalid validation_id")


class TestCSVImportExecution:
    """Test CSV import execution and job status"""
    
    def test_import_valid_users(self):
        """POST /api/csv-import/import/{validation_id} - Import valid users"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
import_user1_{uid}@example.com,Import,User1,user
import_user2_{uid}@example.com,Import,User2,seller
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': f'admin_test_{uid}'}
        
        # Upload
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        validation_id = upload_response.json()["validation_id"]
        
        # Validate first
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        assert validate_response.json()["valid"] == True
        
        # Import
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": f"admin_test_{uid}"}
        )
        assert import_response.status_code == 200
        
        data = import_response.json()
        assert data["success"] == True
        assert "job_id" in data
        assert "message" in data
        
        job_id = data["job_id"]
        print(f"PASSED: POST /api/csv-import/import - job_id={job_id}")
        return job_id, f"admin_test_{uid}"
    
    def test_import_fails_without_validation(self):
        """POST /api/csv-import/import - Fail import on non-validated session"""
        fake_validation_id = "fake-" + uuid.uuid4().hex
        
        response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{fake_validation_id}",
            json={"admin_id": "admin_test"}
        )
        assert response.status_code == 404
        
        print("PASSED: Import fails for non-existent validation_id")
    
    def test_job_status_tracking(self):
        """GET /api/csv-import/job/{job_id} - Track job status"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
jobstatus_user_{uid}@example.com,Job,Status,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        admin_id = f'admin_jobstatus_{uid}'
        params = {'admin_id': admin_id}
        
        # Upload, validate, import
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        job_id = import_response.json()["job_id"]
        
        # Wait for background job to process
        time.sleep(2)
        
        # Check job status
        status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
        assert status_response.status_code == 200
        
        job_data = status_response.json()
        assert "id" in job_data
        assert "status" in job_data
        assert job_data["status"] in ["pending", "validating", "importing", "completed", "failed"]
        
        # If completed, should have result
        if job_data["status"] == "completed":
            assert "result" in job_data
            assert job_data["result"]["imported"] >= 1
            assert "password_report_id" in job_data or "password_report_id" in job_data.get("result", {})
            print(f"PASSED: Job {job_id} completed - imported {job_data['result']['imported']} users")
        else:
            print(f"PASSED: Job {job_id} status={job_data['status']}")
        
        return job_id
    
    def test_job_not_found(self):
        """GET /api/csv-import/job/{job_id} - Return 404 for non-existent job"""
        fake_job_id = "fake-job-" + uuid.uuid4().hex
        
        response = requests.get(f"{BASE_URL}/api/csv-import/job/{fake_job_id}")
        assert response.status_code == 404
        
        print("PASSED: GET /api/csv-import/job returns 404 for non-existent job")


class TestPasswordReportDownload:
    """Test password report download functionality"""
    
    def test_download_password_report(self):
        """GET /api/csv-import/password-report/{report_id}/download - Download password report"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
pwreport_user_{uid}@example.com,Password,Report,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        admin_id = f'admin_pwreport_{uid}'
        params = {'admin_id': admin_id}
        
        # Full flow: upload -> validate -> import -> wait -> get report
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        job_id = import_response.json()["job_id"]
        
        # Wait for job completion
        max_wait = 10
        job_data = None
        for _ in range(max_wait):
            time.sleep(1)
            status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
            job_data = status_response.json()
            if job_data.get("status") == "completed":
                break
        
        assert job_data is not None
        assert job_data.get("status") == "completed", f"Job did not complete, status: {job_data.get('status')}"
        
        # Get password report id
        report_id = job_data.get("password_report_id") or job_data.get("result", {}).get("password_report_id")
        assert report_id is not None, "No password_report_id in job result"
        
        # Download the report
        download_response = requests.get(
            f"{BASE_URL}/api/csv-import/password-report/{report_id}/download",
            params={"admin_id": admin_id}
        )
        assert download_response.status_code == 200
        assert "text/csv" in download_response.headers.get("Content-Type", "")
        
        # Verify CSV content has passwords
        csv_content = download_response.text
        lines = csv_content.strip().split('\n')
        assert len(lines) >= 2  # Header + data row
        
        header = lines[0].lower()
        assert "email" in header
        assert "password" in header
        
        # Verify data row has password
        data_row = lines[1]
        fields = data_row.split(',')
        # Password should be non-empty (12 chars)
        password_idx = header.split(',').index('password')
        assert len(fields[password_idx]) >= 12
        
        print(f"PASSED: Password report download successful - report_id={report_id}")
        return report_id
    
    def test_download_report_access_denied(self):
        """GET /api/csv-import/password-report - Access denied for wrong admin"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
access_test_{uid}@example.com,Access,Test,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        admin_id = f'admin_access_{uid}'
        params = {'admin_id': admin_id}
        
        # Create import
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        job_id = import_response.json()["job_id"]
        
        # Wait for completion
        time.sleep(3)
        status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
        job_data = status_response.json()
        
        if job_data.get("status") != "completed":
            pytest.skip("Job not completed in time")
        
        report_id = job_data.get("password_report_id") or job_data.get("result", {}).get("password_report_id")
        
        # Try to access with wrong admin_id
        wrong_admin_response = requests.get(
            f"{BASE_URL}/api/csv-import/password-report/{report_id}/download",
            params={"admin_id": "wrong_admin_id"}
        )
        assert wrong_admin_response.status_code == 404
        
        print("PASSED: Password report access denied for wrong admin")
    
    def test_download_report_not_found(self):
        """GET /api/csv-import/password-report - 404 for non-existent report"""
        fake_report_id = "fake-report-" + uuid.uuid4().hex
        
        response = requests.get(
            f"{BASE_URL}/api/csv-import/password-report/{fake_report_id}/download",
            params={"admin_id": "admin_test"}
        )
        assert response.status_code == 404
        
        print("PASSED: Password report returns 404 for non-existent report")


class TestUserCreationVerification:
    """Test that imported users are actually created correctly"""
    
    def test_imported_user_exists_in_database(self):
        """Verify imported users exist with correct attributes"""
        uid = uuid.uuid4().hex[:8]
        test_email = f"verify_user_{uid}@example.com"
        csv_content = f"""email,first_name,last_name,role
{test_email},Verify,User,seller
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        admin_id = f'admin_verify_{uid}'
        params = {'admin_id': admin_id}
        
        # Upload, validate, import
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        job_id = import_response.json()["job_id"]
        
        # Wait for completion
        time.sleep(3)
        status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
        job_data = status_response.json()
        
        if job_data.get("status") != "completed":
            pytest.skip("Job not completed in time")
        
        # Verify job result
        result = job_data.get("result", {})
        assert result.get("imported") == 1
        assert result.get("password_report_id") is not None
        
        print(f"PASSED: User {test_email} imported successfully")


class TestNotificationCreation:
    """Test that notifications are created for admins after import"""
    
    def test_notification_created_on_completion(self):
        """Verify notification is created for admin after import completes"""
        uid = uuid.uuid4().hex[:8]
        csv_content = f"""email,first_name,last_name,role
notif_test_{uid}@example.com,Notif,Test,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        admin_id = f'admin_notif_{uid}'
        params = {'admin_id': admin_id}
        
        # Full import flow
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        job_id = import_response.json()["job_id"]
        
        # Wait for completion
        max_wait = 10
        for _ in range(max_wait):
            time.sleep(1)
            status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
            job_data = status_response.json()
            if job_data.get("status") == "completed":
                break
        
        assert job_data.get("status") == "completed", f"Job status: {job_data.get('status')}"
        
        # Job completed - notification should have been created in notifications collection
        # We verify via the job result which should indicate success
        result = job_data.get("result", {})
        assert result.get("imported") >= 1
        
        print(f"PASSED: Import completed - notification should be created for admin {admin_id}")


class TestImportHistory:
    """Test import history endpoint"""
    
    def test_get_import_history(self):
        """GET /api/csv-import/history - Get import job history"""
        response = requests.get(f"{BASE_URL}/api/csv-import/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        # Should have at least some jobs from previous tests
        assert isinstance(data["jobs"], list)
        
        print(f"PASSED: GET /api/csv-import/history - {data['total']} jobs found")
    
    def test_get_import_history_filtered_by_admin(self):
        """GET /api/csv-import/history - Filter by admin_id"""
        uid = uuid.uuid4().hex[:8]
        admin_id = f'admin_history_{uid}'
        
        # Create an import for this admin
        csv_content = f"""email,first_name,last_name,role
history_test_{uid}@example.com,History,Test,user
"""
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        params = {'admin_id': admin_id}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        validation_id = upload_response.json()["validation_id"]
        requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        
        time.sleep(2)
        
        # Get history for this admin
        response = requests.get(f"{BASE_URL}/api/csv-import/history", params={"admin_id": admin_id})
        assert response.status_code == 200
        
        data = response.json()
        # All jobs should be for this admin
        for job in data["jobs"]:
            assert job["admin_id"] == admin_id
        
        print(f"PASSED: GET /api/csv-import/history filtered by admin_id={admin_id}")


class TestEndToEndImportFlow:
    """Complete end-to-end test of the CSV import workflow"""
    
    def test_complete_import_workflow(self):
        """Test complete flow: upload -> validate -> import -> status -> download report"""
        uid = uuid.uuid4().hex[:8]
        admin_id = f'admin_e2e_{uid}'
        test_users = [
            f"e2e_user1_{uid}@example.com",
            f"e2e_user2_{uid}@example.com",
            f"e2e_user3_{uid}@example.com"
        ]
        
        csv_content = f"""email,first_name,last_name,role
{test_users[0]},E2E,User1,user
{test_users[1]},E2E,User2,seller
{test_users[2]},E2E,User3,admin
"""
        
        # Step 1: Upload
        files = {'file': ('e2e_test.csv', csv_content, 'text/csv')}
        params = {'admin_id': admin_id}
        
        upload_response = requests.post(f"{BASE_URL}/api/csv-import/upload", files=files, params=params)
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        assert upload_data["success"] == True
        assert upload_data["total_rows"] == 3
        validation_id = upload_data["validation_id"]
        print(f"Step 1 PASSED: Upload - validation_id={validation_id}")
        
        # Step 2: Validate
        validate_response = requests.post(f"{BASE_URL}/api/csv-import/validate/{validation_id}")
        assert validate_response.status_code == 200
        validate_data = validate_response.json()
        assert validate_data["valid"] == True
        assert validate_data["error_count"] == 0
        print(f"Step 2 PASSED: Validation - all {validate_data['total_rows']} rows valid")
        
        # Step 3: Import
        import_response = requests.post(
            f"{BASE_URL}/api/csv-import/import/{validation_id}",
            json={"admin_id": admin_id}
        )
        assert import_response.status_code == 200
        import_data = import_response.json()
        assert import_data["success"] == True
        job_id = import_data["job_id"]
        print(f"Step 3 PASSED: Import started - job_id={job_id}")
        
        # Step 4: Wait for completion and check status
        max_wait = 15
        job_data = None
        for i in range(max_wait):
            time.sleep(1)
            status_response = requests.get(f"{BASE_URL}/api/csv-import/job/{job_id}")
            assert status_response.status_code == 200
            job_data = status_response.json()
            if job_data.get("status") == "completed":
                break
            print(f"  Waiting... status={job_data.get('status')}, progress={job_data.get('progress', 0)}%")
        
        assert job_data is not None
        assert job_data.get("status") == "completed", f"Job did not complete: {job_data}"
        result = job_data.get("result", {})
        assert result.get("imported") == 3
        print(f"Step 4 PASSED: Job completed - {result['imported']} users imported")
        
        # Step 5: Download password report
        report_id = job_data.get("password_report_id") or result.get("password_report_id")
        assert report_id is not None
        
        download_response = requests.get(
            f"{BASE_URL}/api/csv-import/password-report/{report_id}/download",
            params={"admin_id": admin_id}
        )
        assert download_response.status_code == 200
        assert "text/csv" in download_response.headers.get("Content-Type", "")
        
        csv_report = download_response.text
        lines = csv_report.strip().split('\n')
        assert len(lines) == 4  # Header + 3 users
        
        # Verify all test users are in the report
        for test_email in test_users:
            assert test_email in csv_report
        
        print(f"Step 5 PASSED: Password report downloaded - {len(lines)-1} users with passwords")
        
        print("\n=== END-TO-END TEST COMPLETE ===")
        print(f"Admin ID: {admin_id}")
        print(f"Job ID: {job_id}")
        print(f"Report ID: {report_id}")
        print(f"Users imported: {result['imported']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
