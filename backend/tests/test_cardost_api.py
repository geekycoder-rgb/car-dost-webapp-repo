"""
CarDost backend API tests - covers auth, products, orders/payment (mock),
admin CRUD/stats, contact, and guest+logged-in checkout flows.
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

# Helper to extract items from paginated or non-paginated responses
def get_items(response_data):
    """Extract items from paginated response or return as-is if not paginated"""
    if isinstance(response_data, dict) and "items" in response_data:
        return response_data["items"]
    return response_data

# Test credentials (seeded admin) — overridable via env, see /app/memory/test_credentials.md
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")

# unique test user per run
RUN_ID = uuid.uuid4().hex[:6]
TEST_USER_EMAIL = f"TEST_user_{RUN_ID}@cardost-test.com"
TEST_USER_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@12345")
TEST_USER_NAME = "Test User"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="session")
def user_token(session):
    # Signup
    r = session.post(
        f"{API}/auth/signup",
        json={
            "name": TEST_USER_NAME,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "phone": "9999999999",
        },
    )
    assert r.status_code == 200, f"Signup failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["email"] == TEST_USER_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def first_product(session):
    r = session.get(f"{API}/products")
    assert r.status_code == 200
    items = get_items(r.json())
    assert len(items) >= 1
    return items[0]


# ---------------- products ----------------
class TestProducts:
    def test_list_all(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        data = get_items(r.json())
        assert isinstance(data, list)
        assert len(data) >= 16, f"Expected at least 16 seeded products, got {len(data)}"
        # validate shape
        p = data[0]
        for k in ("id", "name", "price", "category", "image"):
            assert k in p

    def test_list_featured(self, session):
        r = session.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        items = get_items(r.json())
        assert len(items) > 0
        assert all(p["featured"] is True for p in items)

    def test_list_by_category(self, session):
        r = session.get(f"{API}/products", params={"category": "android-stereos"})
        assert r.status_code == 200
        items = get_items(r.json())
        assert len(items) > 0
        assert all(p["category"] == "android-stereos" for p in items)

    def test_search_q(self, session):
        r = session.get(f"{API}/products", params={"q": "Android"})
        assert r.status_code == 200
        items = get_items(r.json())
        assert len(items) > 0
        assert all("android" in p["name"].lower() for p in items)

    def test_get_product_by_id(self, session, first_product):
        r = session.get(f"{API}/products/{first_product['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == first_product["id"]

    def test_get_product_404(self, session):
        r = session.get(f"{API}/products/nonexistent_id_xyz")
        assert r.status_code == 404

    def test_categories(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        slugs = [c["slug"] for c in cats]
        for s in [
            "android-stereos",
            "speakers",
            "amplifiers",
            "dash-cameras",
            "led-lights",
            "perfumes",
            "accessories",
        ]:
            assert s in slugs


# ---------------- auth ----------------
class TestAuth:
    def test_signup_duplicate(self, session, user_token):
        # user_token fixture ensures TEST user is already registered
        r = session.post(
            f"{API}/auth/signup",
            json={"name": "Dup", "email": TEST_USER_EMAIL, "password": "abc12345"},
        )
        assert r.status_code == 400

    def test_login_invalid(self, session):
        r = session.post(
            f"{API}/auth/login", json={"email": TEST_USER_EMAIL, "password": "WRONG"}
        )
        assert r.status_code == 401

    def test_login_success(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert data["user"]["role"] == "user"

    def test_me_authenticated(self, session, user_headers):
        r = session.get(f"{API}/auth/me", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL

    def test_me_unauthenticated(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- guest checkout flow ----------------
class TestGuestCheckout:
    def test_guest_create_and_verify_order(self, session, first_product):
        payload = {
            "items": [{"product_id": first_product["id"], "quantity": 2}],
            "address": {
                "full_name": "Guest Buyer",
                "phone": "9012345678",
                "email": "guest@test.com",
                "line1": "1 Main",
                "line2": "",
                "city": "Mumbai",
                "state": "MH",
                "pincode": "400001",
            },
            "is_guest": True,
        }
        r = session.post(f"{API}/orders/create", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "order_id" in data
        if not data.get("mock"):
            pytest.skip(
                "Razorpay is in LIVE mode on this env — checkout flow needs a real signature to verify. Toggle Admin → Integrations → Razorpay → MOCK_MODE for QA."
            )
        assert data["mock"] is True
        expected_total = first_product["price"] * 2
        assert abs(data["total"] - expected_total) < 0.01

        # verify mock payment
        oid = data["order_id"]
        r2 = session.post(f"{API}/orders/verify", json={"order_id": oid})
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "paid"

        # get order back
        r3 = session.get(f"{API}/orders/{oid}")
        assert r3.status_code == 200
        order = r3.json()
        assert order["status"] == "paid"
        assert order["is_guest"] is True
        assert order["user_id"] is None
        assert order["razorpay_payment_id"].startswith("mock_pay_")

    def test_empty_order_rejected(self, session):
        r = session.post(
            f"{API}/orders/create",
            json={
                "items": [],
                "address": {
                    "full_name": "X",
                    "phone": "9000000000",
                    "email": "x@x.com",
                    "line1": "x",
                    "city": "x",
                    "state": "x",
                    "pincode": "100000",
                },
                "is_guest": True,
            },
        )
        # No items -> total 0 -> 400
        assert r.status_code in (400, 422)

    def test_invalid_product_rejected(self, session):
        r = session.post(
            f"{API}/orders/create",
            json={
                "items": [{"product_id": "no_such_product", "quantity": 1}],
                "address": {
                    "full_name": "X",
                    "phone": "9000000000",
                    "email": "x@x.com",
                    "line1": "x",
                    "city": "x",
                    "state": "x",
                    "pincode": "100000",
                },
                "is_guest": True,
            },
        )
        assert r.status_code == 400


# ---------------- logged in checkout ----------------
class TestUserCheckout:
    def test_logged_in_order_linked_to_user(self, session, user_headers, first_product):
        payload = {
            "items": [{"product_id": first_product["id"], "quantity": 1}],
            "address": {
                "full_name": "User Buyer",
                "phone": "9011112222",
                "email": TEST_USER_EMAIL,
                "line1": "10 Park",
                "city": "Delhi",
                "state": "DL",
                "pincode": "110001",
            },
            "is_guest": False,
        }
        r = session.post(f"{API}/orders/create", json=payload, headers=user_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        oid = data["order_id"]
        if not data.get("mock"):
            pytest.skip(
                "Razorpay is in LIVE mode on this env — checkout flow needs a real signature to verify. Toggle Admin → Integrations → Razorpay → MOCK_MODE for QA."
            )

        r2 = session.post(f"{API}/orders/verify", json={"order_id": oid})
        assert r2.status_code == 200

        r3 = session.get(f"{API}/my/orders", headers=user_headers)
        assert r3.status_code == 200
        orders = r3.json()
        assert any(o["id"] == oid for o in orders), "Order not linked to user"
        # Verify the linked order is paid
        linked = next(o for o in orders if o["id"] == oid)
        assert linked["status"] == "paid"
        assert linked["user_id"] is not None

    def test_my_orders_requires_auth(self, session):
        r = session.get(f"{API}/my/orders")
        assert r.status_code == 401


# ---------------- admin ----------------
class TestAdminAuth:
    def test_admin_routes_require_auth(self, session):
        r = session.get(f"{API}/admin/stats")
        assert r.status_code == 401
        r = session.get(f"{API}/admin/orders")
        assert r.status_code == 401

    def test_admin_routes_forbidden_for_user(self, session, user_headers):
        r = session.get(f"{API}/admin/stats", headers=user_headers)
        assert r.status_code == 403
        r = session.post(
            f"{API}/admin/products",
            headers=user_headers,
            json={
                "name": "x",
                "description": "x",
                "price": 1,
                "category": "x",
                "image": "x",
            },
        )
        assert r.status_code == 403


class TestAdminCRUD:
    created_pid = None

    def test_admin_stats(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_orders", "paid_orders", "revenue", "products", "users"):
            assert k in d
        assert d["products"] >= 16
        assert d["paid_orders"] >= 1  # we made paid orders above
        assert d["revenue"] > 0

    def test_admin_orders_list(self, session, admin_headers):
        r = session.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_create_update_delete_product(self, session, admin_headers):
        # CREATE
        payload = {
            "name": "TEST_Admin_Product",
            "description": "Testing admin CRUD",
            "price": 1234.0,
            "category": "accessories",
            "brand": "TEST",
            "image": "https://example.com/x.jpg",
            "stock": 10,
            "rating": 4.0,
            "featured": False,
        }
        r = session.post(f"{API}/admin/products", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert "id" in prod
        assert prod["name"] == "TEST_Admin_Product"
        pid = prod["id"]

        # GET to verify persistence
        r2 = session.get(f"{API}/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["price"] == 1234.0

        # UPDATE
        payload["price"] = 999.0
        payload["name"] = "TEST_Admin_Product_Updated"
        r3 = session.put(
            f"{API}/admin/products/{pid}", headers=admin_headers, json=payload
        )
        assert r3.status_code == 200

        r4 = session.get(f"{API}/products/{pid}")
        assert r4.status_code == 200
        assert r4.json()["price"] == 999.0
        assert r4.json()["name"] == "TEST_Admin_Product_Updated"

        # DELETE
        r5 = session.delete(f"{API}/admin/products/{pid}", headers=admin_headers)
        assert r5.status_code == 200

        r6 = session.get(f"{API}/products/{pid}")
        assert r6.status_code == 404

    def test_unpublished_visibility_admin_only(self, session, admin_headers):
        payload = {
            "name": "TEST_Unpublished_Product",
            "description": "Hidden from public listings",
            "price": 1111.0,
            "category": "accessories",
            "brand": "TEST",
            "image": "https://example.com/u.jpg",
            "stock": 7,
            "rating": 4.0,
            "featured": False,
            "is_published": False,
        }
        created = session.post(f"{API}/admin/products", headers=admin_headers, json=payload)
        assert created.status_code == 200, created.text
        pid = created.json()["id"]

        try:
            public_detail = session.get(f"{API}/products/{pid}")
            assert public_detail.status_code == 404

            public_list = session.get(f"{API}/products")
            assert public_list.status_code == 200
            public_items = get_items(public_list.json())
            public_ids = {p["id"] for p in public_items}
            assert pid not in public_ids

            admin_list = session.get(
                f"{API}/admin/products",
                headers=admin_headers,
                params={"is_published": "false", "limit": 100},
            )
            assert admin_list.status_code == 200
            admin_ids = {p["id"] for p in get_items(admin_list.json())}
            assert pid in admin_ids
        finally:
            session.delete(f"{API}/admin/products/{pid}", headers=admin_headers)


# ---------------- contact ----------------
class TestContact:
    def test_contact_submit(self, session):
        r = session.post(
            f"{API}/contact",
            json={
                "name": "TEST Contact",
                "email": "test@contact.com",
                "phone": "9999999999",
                "message": "Hello CarDost team",
            },
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_contact_invalid_email(self, session):
        r = session.post(
            f"{API}/contact",
            json={"name": "X", "email": "not-an-email", "message": "hi"},
        )
        assert r.status_code == 422
