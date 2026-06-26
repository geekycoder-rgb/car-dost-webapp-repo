"""
Tests for new CarDost features: ALL/universal car-brands, SEO fields,
admin banners / tax-rules / reviews moderation endpoints, products/filter
route ordering fix.
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
# Test credentials (seeded admin) — overridable via env
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_headers(session):
    r = session.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def universal_product(session, admin_headers):
    """Create a universal (car_brands=['ALL']) product, yield, then delete."""
    payload = {
        "name": f"TEST_Universal_Product_{uuid.uuid4().hex[:6]}",
        "description": "Fits every car",
        "price": 499.0,
        "category": "accessories",
        "image": "https://example.com/x.jpg",
        "stock": 10,
        "rating": 4.5,
        "featured": False,
        "is_published": True,
        "car_brands": ["ALL"],
        "car_models": [],
        "years": [],
        "tags": ["universal"],
        "meta_title": "Universal SEO Title",
        "meta_description": "Universal SEO desc for product",
        "seo_slug": "test-universal-product",
    }
    r = session.post(f"{API}/admin/products", headers=admin_headers, json=payload)
    assert r.status_code == 200, r.text
    p = r.json()
    yield p
    session.delete(f"{API}/admin/products/{p['id']}", headers=admin_headers)


# ---------- catalog: ALL pill ----------
class TestCarBrandsAll:
    def test_all_is_first_and_universal(self, session):
        r = session.get(f"{API}/catalog/car-brands")
        assert r.status_code == 200
        brands = r.json()
        assert isinstance(brands, list) and len(brands) > 0
        assert brands[0]["name"] == "ALL"
        assert brands[0].get("universal") is True
        # subsequent entries must NOT be universal
        for b in brands[1:]:
            assert b.get("universal") is not True


# ---------- products/filter route ordering + ALL inclusion ----------
class TestProductFilterUniversal:
    def test_filter_no_args_returns_published(self, session):
        r = session.get(f"{API}/products/filter")
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1

    def test_filter_by_brand_includes_universal(self, session, universal_product):
        r = session.get(f"{API}/products/filter", params={"car_brand": "Maruti Suzuki"})
        assert r.status_code == 200, r.text
        ids = [p["id"] for p in r.json()]
        assert universal_product["id"] in ids, (
            "Universal product missing from brand filter"
        )

    def test_filter_by_year_includes_universal(self, session, universal_product):
        r = session.get(f"{API}/products/filter", params={"year": 2020})
        assert r.status_code == 200, r.text
        ids = [p["id"] for p in r.json()]
        assert universal_product["id"] in ids, (
            "Universal product missing from year filter"
        )

    def test_filter_by_model_includes_universal(self, session, universal_product):
        r = session.get(f"{API}/products/filter", params={"car_model": "Swift"})
        assert r.status_code == 200, r.text
        ids = [p["id"] for p in r.json()]
        assert universal_product["id"] in ids

    def test_filter_route_does_not_collide_with_pid(self, session):
        # /products/filter must NOT be interpreted as /products/{pid='filter'}
        r = session.get(f"{API}/products/filter")
        assert r.status_code == 200  # not 404


# ---------- SEO persistence ----------
class TestProductSEO:
    def test_seo_fields_persist(self, session, universal_product):
        r = session.get(f"{API}/products/{universal_product['id']}")
        assert r.status_code == 200
        p = r.json()
        assert p["meta_title"] == "Universal SEO Title"
        assert p["meta_description"] == "Universal SEO desc for product"
        assert p["seo_slug"] == "test-universal-product"
        assert p["car_brands"] == ["ALL"]


# ---------- banners ----------
class TestBanners:
    def test_public_list_banners(self, session):
        r = session.get(f"{API}/banners")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_list_banners(self, session, admin_headers):
        r = session.get(f"{API}/admin/banners", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_banners_requires_auth(self, session):
        r = session.get(f"{API}/admin/banners")
        assert r.status_code == 401

    def test_create_update_delete_banner(self, session, admin_headers):
        body = {
            "title": "TEST Banner",
            "subtitle": "TEST sub",
            "badge": "B",
            "cta_text": "Go",
            "cta_link": "/shop",
            "mesh": "mesh-emerald",
            "accent": "#10B981",
            "image": "",
            "sort_order": 999,
            "is_active": True,
        }
        r = session.post(f"{API}/admin/banners", headers=admin_headers, json=body)
        assert r.status_code == 200
        bid = r.json()["id"]

        body["title"] = "TEST Banner Updated"
        r2 = session.put(f"{API}/admin/banners/{bid}", headers=admin_headers, json=body)
        assert r2.status_code == 200

        r3 = session.get(f"{API}/admin/banners", headers=admin_headers)
        assert any(
            b["id"] == bid and b["title"] == "TEST Banner Updated" for b in r3.json()
        )

        r4 = session.delete(f"{API}/admin/banners/{bid}", headers=admin_headers)
        assert r4.status_code == 200


# ---------- tax rules ----------
class TestTaxRules:
    def test_public_list_tax_rules(self, session):
        r = session.get(f"{API}/tax-rules")
        assert r.status_code == 200
        rates = sorted([rl["rate"] for rl in r.json()])
        # seeded: 0,5,12,18,28
        for expected in [0, 5, 12, 18, 28]:
            assert expected in rates
        # exactly one default and it's 18
        defaults = [rl for rl in r.json() if rl.get("is_default")]
        assert len(defaults) == 1 and defaults[0]["rate"] == 18

    def test_admin_create_update_delete_tax_rule(self, session, admin_headers):
        body = {
            "name": "TEST Rule",
            "rate": 7.5,
            "is_default": False,
            "description": "test",
        }
        r = session.post(f"{API}/admin/tax-rules", headers=admin_headers, json=body)
        assert r.status_code == 200

        listed = session.get(f"{API}/tax-rules").json()
        match = [rl for rl in listed if rl["name"] == "TEST Rule"]
        assert match
        rid = match[0]["id"]

        body["rate"] = 9.0
        r2 = session.put(
            f"{API}/admin/tax-rules/{rid}", headers=admin_headers, json=body
        )
        assert r2.status_code == 200

        r3 = session.delete(f"{API}/admin/tax-rules/{rid}", headers=admin_headers)
        assert r3.status_code == 200


# ---------- reviews moderation ----------
class TestReviewsModeration:
    def test_admin_reviews_requires_auth(self, session):
        r = session.get(f"{API}/admin/reviews")
        assert r.status_code == 401

    def test_admin_list_reviews(self, session, admin_headers):
        r = session.get(f"{API}/admin/reviews", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_review_toggle_and_delete(self, session, admin_headers, universal_product):
        pid = universal_product["id"]
        r = session.post(
            f"{API}/products/{pid}/reviews",
            json={
                "name": "TEST Reviewer",
                "rating": 5,
                "title": "Great",
                "comment": "Loved it",
            },
        )
        assert r.status_code == 200, r.text
        rid = r.json()["review"]["id"]

        # hide
        r2 = session.patch(
            f"{API}/admin/reviews/{rid}?is_approved=false", headers=admin_headers
        )
        assert r2.status_code == 200

        public = session.get(f"{API}/products/{pid}/reviews").json()
        assert not any(rv["id"] == rid for rv in public)

        # delete
        r3 = session.delete(f"{API}/admin/reviews/{rid}", headers=admin_headers)
        assert r3.status_code == 200
