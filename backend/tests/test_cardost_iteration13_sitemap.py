"""Iteration 13 — Sitemap XSL PI removal + dynamic regen end-to-end regression.

Covers:
  - GET /sitemap.xml (preview origin) — clean XML, no <?xml-stylesheet?>, parses, 35 URLs
  - GET /api/seo/sitemap.xml — same cleanliness, identical URL set
  - Googlebot UA still gets the same response (no bot challenge)
  - Dynamic regen on product create/delete (file mtime advances within 3s; loc reflects new id)
  - Admin manual regen returns expected shape and writes clean XML
  - robots.txt regression: Sitemap directive intact, Disallow rules intact
  - Auth on /api/admin/sitemap/regenerate (401 unauth, 403 non-admin)
"""

import os
import io
import re
import time
import uuid
import xml.etree.ElementTree as ET

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")
SITEMAP_DISK_PATH = "/app/frontend/public/sitemap.xml"
GOOGLEBOT_UA = (
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
)


# -------- helpers --------
def _parse(xml_body: str):
    return ET.parse(io.StringIO(xml_body)).getroot()


def _first_two_nonblank(xml_body: str):
    lines = [ln for ln in xml_body.splitlines() if ln.strip()]
    return lines[0], lines[1]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


# -------- 1. XML CLEANLINESS (/sitemap.xml) --------
class TestSitemapXmlCleanliness:
    def test_status_and_content_type(self):
        r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15)
        assert r.status_code == 200
        assert "xml" in r.headers.get("content-type", "").lower()

    def test_no_xsl_processing_instruction(self):
        body = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15).text
        assert "<?xml-stylesheet" not in body, (
            "Sitemap must NOT contain <?xml-stylesheet PI"
        )

    def test_first_two_nonblank_lines(self):
        body = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15).text
        l1, l2 = _first_two_nonblank(body)
        assert l1 == '<?xml version="1.0" encoding="UTF-8"?>', f"L1={l1!r}"
        assert l2 == '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', (
            f"L2={l2!r}"
        )

    def test_parses_and_has_urls(self):
        body = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15).text
        root = _parse(body)
        ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        assert root.tag == f"{ns}urlset"
        urls = root.findall(f"{ns}url")
        assert len(urls) >= 7, f"expected >=7 urls (static pages), got {len(urls)}"


# -------- 2. /api/seo/sitemap.xml --------
class TestBackendDynamicSitemap:
    def test_api_endpoint_clean(self):
        r = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<?xml-stylesheet" not in body
        _parse(body)  # raises if malformed
        l1, l2 = _first_two_nonblank(body)
        assert l1.startswith("<?xml version=")
        assert l2.startswith("<urlset")

    def test_url_set_matches_disk(self):
        api_body = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=15).text
        disk_body = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15).text
        ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        api_locs = sorted(
            e.text for e in _parse(api_body).findall(f"{ns}url/{ns}loc")
        )
        disk_locs = sorted(
            e.text for e in _parse(disk_body).findall(f"{ns}url/{ns}loc")
        )
        assert api_locs == disk_locs, (
            f"Mismatch between /api/seo/sitemap.xml and /sitemap.xml url sets"
        )


# -------- 3. Googlebot UA --------
class TestGooglebotUA:
    def test_googlebot_gets_same_clean_xml(self):
        r = requests.get(
            f"{BASE_URL}/sitemap.xml",
            headers={"User-Agent": GOOGLEBOT_UA},
            timeout=15,
        )
        assert r.status_code == 200
        assert "xml" in r.headers.get("content-type", "").lower()
        assert "<?xml-stylesheet" not in r.text
        _parse(r.text)


# -------- 4. Dynamic regen on product CRUD --------
class TestDynamicRegen:
    def test_create_product_triggers_regen_and_delete_clears_it(self, admin_headers):
        # snapshot mtime
        assert os.path.exists(SITEMAP_DISK_PATH), "on-disk sitemap missing"
        mtime_before = os.path.getmtime(SITEMAP_DISK_PATH)

        # fetch a category slug to satisfy product schema
        cats = requests.get(f"{BASE_URL}/api/categories", timeout=15).json()
        assert isinstance(cats, list) and cats, "no categories available"
        cat_slug = cats[0]["slug"]

        unique = f"test-sitemap-regen-{uuid.uuid4().hex[:8]}"
        product_payload = {
            "name": f"TEST_Sitemap Regen Product {unique}",
            "description": "test sitemap dynamic regen",
            "price": 999,
            "category": cat_slug,
            "image": "https://example.com/placeholder.png",
            "gallery": [],
            "stock": 1,
            "is_published": True,
            "seo_slug": unique,
        }
        created = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_payload,
            headers=admin_headers,
            timeout=15,
        )
        assert created.status_code in (200, 201), (
            f"product create failed: {created.status_code} {created.text}"
        )
        body = created.json()
        product_id = body.get("id") or body.get("_id") or body.get("product", {}).get(
            "id"
        )

        # wait up to 3.5s for the background task to rewrite the file
        deadline = time.time() + 3.5
        regen_seen = False
        while time.time() < deadline:
            if os.path.getmtime(SITEMAP_DISK_PATH) > mtime_before:
                regen_seen = True
                break
            time.sleep(0.25)
        assert regen_seen, "sitemap mtime did not advance after product create"

        # confirm new slug/id appears somewhere in a <loc> via the live API
        api_body = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=15).text
        appears = (unique in api_body) or (product_id and str(product_id) in api_body)
        assert appears, (
            f"new product (slug={unique}, id={product_id}) not in dynamic sitemap"
        )

        # cleanup: DELETE and verify it disappears
        mtime_after_create = os.path.getmtime(SITEMAP_DISK_PATH)
        # the API uses slug-based deletion if available — try id first, slug fallback
        del_resp = None
        if product_id:
            del_resp = requests.delete(
                f"{BASE_URL}/api/admin/products/{product_id}",
                headers=admin_headers,
                timeout=15,
            )
        if del_resp is None or del_resp.status_code not in (200, 204):
            del_resp = requests.delete(
                f"{BASE_URL}/api/admin/products/{unique}",
                headers=admin_headers,
                timeout=15,
            )
        assert del_resp.status_code in (200, 204), (
            f"delete failed: {del_resp.status_code} {del_resp.text}"
        )

        # wait up to 3.5s for regen after delete
        deadline = time.time() + 3.5
        regen_seen = False
        while time.time() < deadline:
            if os.path.getmtime(SITEMAP_DISK_PATH) > mtime_after_create:
                regen_seen = True
                break
            time.sleep(0.25)
        assert regen_seen, "sitemap mtime did not advance after product delete"

        api_body2 = requests.get(f"{BASE_URL}/api/seo/sitemap.xml", timeout=15).text
        assert unique not in api_body2, (
            "deleted product slug still present in dynamic sitemap"
        )


# -------- 5. Admin manual regen --------
class TestAdminManualRegen:
    def test_admin_regenerate_returns_expected_shape(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/sitemap/regenerate",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("reason") == "admin"
        assert isinstance(data.get("url_count"), int) and data["url_count"] >= 7
        assert "/app/frontend/public/sitemap.xml" in data.get("written", [])
        # build dir may or may not exist; if skipped, reason should be 'parent dir missing'
        skipped = data.get("skipped", [])
        for s in skipped:
            assert "reason" in s and "path" in s

        # verify on-disk file is clean
        with open(SITEMAP_DISK_PATH, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert "<?xml-stylesheet" not in content


# -------- 6. robots.txt regression --------
class TestRobotsTxt:
    def test_robots_has_sitemap_and_disallows(self):
        r = requests.get(f"{BASE_URL}/robots.txt", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "Sitemap: https://cardost.in/sitemap.xml" in body
        # /api/seo/ must NOT be the advertised sitemap path
        assert "/api/seo/sitemap.xml" not in body
        for rule in ("Disallow: /admin", "Disallow: /api"):
            assert rule in body, f"missing {rule!r} in robots.txt"


# -------- 7. Auth on regen endpoint --------
class TestRegenAuth:
    def test_unauthenticated_blocked(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/sitemap/regenerate", timeout=15
        )
        assert r.status_code in (401, 403), f"got {r.status_code}: {r.text}"

    def test_non_admin_blocked(self):
        # Try to register or login a customer
        email = f"test_sitemap_user_{uuid.uuid4().hex[:8]}@test.com"
        password = "Test@12345"
        reg = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": password, "name": "Sitemap Tester", "phone": "+919999999999"},
            timeout=15,
        )
        if reg.status_code not in (200, 201):
            pytest.skip(f"could not create non-admin user: {reg.status_code} {reg.text}")
        login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=15,
        )
        if login.status_code != 200:
            pytest.skip(f"non-admin login failed: {login.status_code} {login.text}")
        token = login.json().get("token") or login.json().get("access_token")
        if not token:
            pytest.skip("non-admin token missing in login response")
        r = requests.post(
            f"{BASE_URL}/api/admin/sitemap/regenerate",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        assert r.status_code in (401, 403), (
            f"non-admin should be blocked but got {r.status_code}: {r.text}"
        )
