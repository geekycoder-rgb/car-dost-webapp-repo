"""Iteration 7 — Category SEO fields (meta_title, meta_description) round-trip tests.
Verifies POST/GET/PUT/DELETE on /api/admin/categories preserve and surface meta_title/meta_description,
and that the public GET /api/categories also returns them.
"""

import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")

TEST_SLUG = f"test-seo-cat-{int(time.time())}"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"no token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_headers):
    yield
    # teardown — best-effort
    try:
        requests.delete(
            f"{BASE_URL}/api/admin/categories/{TEST_SLUG}",
            headers=admin_headers,
            timeout=10,
        )
    except Exception:
        pass


class TestCategorySEOFields:
    def test_create_category_with_seo_fields(self, admin_headers):
        body = {
            "slug": TEST_SLUG,
            "name": "Test SEO Category",
            "description": "test cat",
            "icon": "Package",
            "is_active": True,
            "sort_order": 999,
            "meta_title": "TEST_SEO Buy Test Online India | CarDost",
            "meta_description": "TEST_SEO description for category meta description testing 120-160 chars approx pad pad pad.",
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=body,
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
        assert r.json().get("ok") is True

    def test_public_get_returns_meta_fields(self):
        r = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        match = next((c for c in cats if c.get("slug") == TEST_SLUG), None)
        assert match is not None, "newly created cat missing from public list"
        assert match.get("meta_title") == "TEST_SEO Buy Test Online India | CarDost"
        assert "TEST_SEO description" in match.get("meta_description", "")

    def test_admin_get_returns_meta_fields(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/categories", headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        cats = r.json()
        match = next((c for c in cats if c.get("slug") == TEST_SLUG), None)
        assert match is not None
        assert match["meta_title"].startswith("TEST_SEO ")
        assert match["meta_description"].startswith("TEST_SEO ")

    def test_update_seo_fields(self, admin_headers):
        body = {
            "slug": TEST_SLUG,
            "name": "Test SEO Category",
            "description": "test cat",
            "icon": "Package",
            "is_active": True,
            "sort_order": 999,
            "meta_title": "TEST_SEO Updated Title",
            "meta_description": "TEST_SEO Updated Description text here.",
        }
        r = requests.put(
            f"{BASE_URL}/api/admin/categories/{TEST_SLUG}",
            json=body,
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200

        r2 = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        match = next((c for c in r2.json() if c.get("slug") == TEST_SLUG), None)
        assert match["meta_title"] == "TEST_SEO Updated Title"
        assert match["meta_description"] == "TEST_SEO Updated Description text here."

    def test_clearing_meta_fields_persists_empty(self, admin_headers):
        body = {
            "slug": TEST_SLUG,
            "name": "Test SEO Category",
            "description": "test cat",
            "icon": "Package",
            "is_active": True,
            "sort_order": 999,
            "meta_title": "",
            "meta_description": "",
        }
        r = requests.put(
            f"{BASE_URL}/api/admin/categories/{TEST_SLUG}",
            json=body,
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        match = next((c for c in r2.json() if c.get("slug") == TEST_SLUG), None)
        assert match["meta_title"] == ""
        assert match["meta_description"] == ""

    def test_delete_category(self, admin_headers):
        r = requests.delete(
            f"{BASE_URL}/api/admin/categories/{TEST_SLUG}",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        slugs = [c["slug"] for c in r2.json()]
        assert TEST_SLUG not in slugs

    def test_unauthenticated_cannot_create(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json={
                "slug": "nope-x",
                "name": "nope",
                "meta_title": "x",
                "meta_description": "y",
            },
            timeout=10,
        )
        assert r.status_code in (401, 403)
