"""
Iteration 5 regression suite — focuses on the new fix surface:
  1. JWT auth path (get_current_user payload init)
  2. File upload + serve roundtrip (upload_image / serve_file data,ct init)
  3. CSV bulk export/import roundtrip with upsert
  4. Order status update email trigger (idempotency)
  5. RBAC unchanged
"""

import io
import os
import csv
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")
TEST_USER_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@12345")

# Tiny valid JPEG (10x10 red) — base85 of a real JPEG byte stream
TINY_JPEG = bytes.fromhex(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
    "07090908"
    "0a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c283729"
    "2c30313434341f27393d38323c2e333432ffc0000b0801000100010111"
    "00ffc4001f0000010501010101010100000000000000000102030405060708090a0b"
    "ffc400b5100002010303020403050504040000017d01020300041105122131410613"
    "516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728"
    "292a3435363738393a434445464748494a535455565758595a636465666768696a7374"
    "75767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4"
    "b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1"
    "f2f3f4f5f6f7f8f9faffda0008010100003f00fbd0ffd9"
)


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


# ---------------- 1. JWT / get_current_user paths ----------------
class TestAuthPaths:
    def test_admin_login_returns_admin_role_and_token(self, session):
        r = session.post(
            f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert (
            "token" in data
            and isinstance(data["token"], str)
            and len(data["token"]) > 20
        )
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL

    def test_me_with_admin_token_returns_admin_profile(self, session, admin_headers):
        r = session.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        # uid + role from payload (the var we just re-initialised)
        assert body.get("role") == "admin"
        assert body.get("email") == ADMIN_EMAIL

    def test_me_without_token_returns_401(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_me_with_invalid_token_returns_401(self, session):
        # Critical: the except-branch in get_current_user MUST still raise, not return {}
        r = requests.get(
            f"{API}/auth/me", headers={"Authorization": "Bearer not.a.real.jwt"}
        )
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"

    def test_me_with_malformed_token_returns_401(self, session):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer xxx"})
        assert r.status_code == 401


# ---------------- 2. Admin endpoints reachable (auth round-trip) ----------------
class TestAdminEndpointsReachable:
    # Note: /admin/products is POST-only (creates a product); product listing
    # in admin uses the public /products endpoint. We test that separately.
    @pytest.mark.parametrize(
        "path",
        [
            "/admin/stats",
            "/admin/orders",
            "/admin/messages",
            "/admin/settings",
        ],
    )
    def test_admin_endpoint_200(self, session, admin_headers, path):
        r = session.get(f"{API}{path}", headers=admin_headers)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"

    def test_non_admin_user_gets_403_on_admin_stats(self, session):
        # signup throwaway user
        email = f"TEST_regress_{uuid.uuid4().hex[:6]}@cardost-test.com"
        s = session.post(
            f"{API}/auth/signup",
            json={
                "name": "Regress User",
                "email": email,
                "phone": "9999999999",
                "password": TEST_USER_PASSWORD,
            },
        )
        assert s.status_code == 200, s.text
        utok = s.json()["token"]
        r = session.get(
            f"{API}/admin/stats", headers={"Authorization": f"Bearer {utok}"}
        )
        assert r.status_code == 403


# ---------------- 3. Products read smoke ----------------
class TestProductsRead:
    def test_products_list_has_at_least_19(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 19, f"expected ≥19 products, got {len(items)}"

    def test_product_detail_404_for_garbage(self, session):
        r = session.get(f"{API}/products/no-such-id-zzzz")
        assert r.status_code == 404

    def test_product_detail_200_for_real_id(self, session):
        r = session.get(f"{API}/products")
        pid = r.json()[0]["id"]
        r2 = session.get(f"{API}/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == pid


# ---------------- 4. File upload + serve roundtrip ----------------
class TestUploadServe:
    def test_upload_jpeg_then_serve(self, admin_token):
        url = f"{API}/admin/upload"
        files = {"file": ("regress.jpg", TINY_JPEG, "image/jpeg")}
        r = requests.post(
            url,
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and body["url"].startswith("/api/files/")
        assert body["path"]

        # GET the URL
        full = f"{BASE_URL}{body['url']}"
        r2 = requests.get(full, timeout=30)
        assert r2.status_code == 200, f"serve_file failed: {r2.status_code}"
        ct = r2.headers.get("Content-Type", "")
        assert ct.startswith("image/"), f"unexpected content-type {ct}"
        assert len(r2.content) > 50

    def test_upload_rejects_non_image(self, admin_token):
        files = {"file": ("regress.txt", b"hello", "text/plain")}
        r = requests.post(
            f"{API}/admin/upload",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 400


# ---------------- 5. CSV bulk export/import roundtrip ----------------
EXPECTED_BULK_COLUMNS = [
    "id",
    "name",
    "description",
    "price",
    "original_price",
    "category",
    "categories",
    "brand",
    "image",
    "gallery",
    "stock",
    "rating",
    "featured",
    "is_published",
    "is_best_seller",
    "is_new_arrival",
    "discount_percent",
    "discount_flat",
    "gst_percent",
    "tags",
    "car_brands",
    "car_models",
    "years",
    "compatible_variants",
    "meta_title",
    "meta_description",
    "seo_slug",
]


class TestCSVRoundtrip:
    def test_export_returns_csv_with_27_columns(self, admin_token):
        r = requests.get(
            f"{API}/admin/products/export",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        ct = r.headers.get("Content-Type", "")
        assert "text/csv" in ct, f"got {ct}"
        text = r.text
        reader = csv.reader(io.StringIO(text))
        header = next(reader)
        assert header == EXPECTED_BULK_COLUMNS, (
            f"column mismatch:\nexpected={EXPECTED_BULK_COLUMNS}\ngot={header}"
        )
        rows = list(reader)
        assert len(rows) >= 19, f"expected ≥19 product rows, got {len(rows)}"

    def test_export_then_reimport_updates_zero_creates(self, admin_token):
        # 1. export
        r = requests.get(
            f"{API}/admin/products/export",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        csv_bytes = r.content
        # 2. re-upload as bulk
        files = {"file": ("roundtrip.csv", csv_bytes, "text/csv")}
        r2 = requests.post(
            f"{API}/admin/products/bulk",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60,
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body.get("updated", 0) >= 1, body
        assert body.get("created", 0) == 0, f"reimport should not create; got {body}"

    def test_bulk_import_creates_new_product(self, admin_token):
        slug = f"test-regress-{uuid.uuid4().hex[:6]}"
        rows = [EXPECTED_BULK_COLUMNS]
        new_row = {c: "" for c in EXPECTED_BULK_COLUMNS}
        new_row.update(
            {
                "name": f"TEST_Regression Product {slug}",
                "description": "Generated by iteration 5 regression test",
                "price": "999",
                "category": "Accessories",
                "image": "https://placehold.co/300x300.png",
                "stock": "10",
                "is_published": "true",
                "seo_slug": slug,
            }
        )
        rows.append([new_row[c] for c in EXPECTED_BULK_COLUMNS])
        buf = io.StringIO()
        w = csv.writer(buf)
        for r in rows:
            w.writerow(r)
        files = {"file": ("new.csv", buf.getvalue().encode("utf-8"), "text/csv")}
        r = requests.post(
            f"{API}/admin/products/bulk",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("created", 0) == 1, body
        assert body.get("updated", 0) == 0, body
        # cleanup: find by slug and delete
        lst = requests.get(f"{API}/products").json()
        match = [p for p in lst if p.get("seo_slug") == slug]
        if match:
            requests.delete(
                f"{API}/admin/products/{match[0]['id']}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )


# ---------------- 6. Admin product CRUD ----------------
class TestAdminProductCRUD:
    def test_full_crud_roundtrip(self, admin_token):
        h = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "name": f"TEST_Regress CRUD {uuid.uuid4().hex[:6]}",
            "description": "regress crud",
            "price": 499.0,
            "category": "Accessories",
            "image": "https://placehold.co/300x300.png",
            "stock": 5,
            "is_published": True,
        }
        c = requests.post(f"{API}/admin/products", json=payload, headers=h)
        assert c.status_code == 200, c.text
        pid = c.json()["id"]
        try:
            g = requests.get(f"{API}/products/{pid}")
            assert g.status_code == 200
            assert g.json()["name"] == payload["name"]

            u = requests.put(
                f"{API}/admin/products/{pid}", json={**payload, "stock": 99}, headers=h
            )
            assert u.status_code == 200
            g2 = requests.get(f"{API}/products/{pid}")
            assert g2.json()["stock"] == 99
        finally:
            d = requests.delete(f"{API}/admin/products/{pid}", headers=h)
            assert d.status_code == 200
            g3 = requests.get(f"{API}/products/{pid}")
            assert g3.status_code == 404


# ---------------- 7. Order status update — idempotency & response ----------------
class TestOrderStatusUpdate:
    def test_patch_order_status_idempotent(self, admin_token):
        h = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }
        # find any existing order
        r = requests.get(f"{API}/admin/orders", headers=h)
        assert r.status_code == 200
        orders = r.json()
        if not orders:
            pytest.skip("no orders to patch")
        oid = orders[0]["id"]
        current = orders[0].get("status", "pending")
        # pick a status different from current
        target = "processing" if current != "processing" else "shipped"
        r1 = requests.patch(
            f"{API}/admin/orders/{oid}/status", json={"status": target}, headers=h
        )
        assert r1.status_code == 200, r1.text
        assert r1.json().get("ok") is True
        # patch again with same status — should still 200 but logically no email
        r2 = requests.patch(
            f"{API}/admin/orders/{oid}/status", json={"status": target}, headers=h
        )
        assert r2.status_code == 200, r2.text

    def test_patch_order_status_rejects_invalid_status(self, admin_token):
        h = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }
        r = requests.get(f"{API}/admin/orders", headers=h)
        orders = r.json()
        if not orders:
            pytest.skip("no orders to patch")
        oid = orders[0]["id"]
        r2 = requests.patch(
            f"{API}/admin/orders/{oid}/status",
            json={"status": "bogus_status_value"},
            headers=h,
        )
        assert r2.status_code == 400
