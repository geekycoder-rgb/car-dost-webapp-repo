"""Backend regression tests for the 3 bug fixes (Jan 2026 iteration 4):
  (1) review_count is present on /products list & detail and updates on POST review
  (2) /products/filter bridges legacy car_brand/car_model/year → compatible_variants
  (3) (out of backend scope, UI-only) AdminCategories image upload — only the
      /admin/upload helper endpoint is sanity-checked here.

Run with:
  REACT_APP_BACKEND_URL=https://stereo-connect-2.preview.emergentagent.com \
    pytest backend/tests/test_cardost_bugfixes.py -v
"""

import os
import io
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
ADMIN_EMAIL = "admin@cardost.com"
ADMIN_PASS = "Admin@123"

# Product with one real approved 5-star review (from review_request context)
PRODUCT_WITH_REVIEW_ID = "fb7ad847-b945-4df8-96ee-964e3cb0b77b"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=20,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in admin login response: {r.json()}"
    return tok


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ───────────────────────── (1) review_count exposure ─────────────────────────
class TestReviewCountField:
    def test_products_list_includes_review_count(self):
        r = requests.get(f"{BASE_URL}/api/products", timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        for p in items:
            assert "review_count" in p, f"product missing review_count: {p.get('id')}"
            assert isinstance(p["review_count"], int)
            assert p["review_count"] >= 0

    def test_product_with_one_review_reports_correct_counts(self):
        r = requests.get(
            f"{BASE_URL}/api/products/{PRODUCT_WITH_REVIEW_ID}", timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == PRODUCT_WITH_REVIEW_ID
        assert data["review_count"] >= 1, (
            f"expected ≥1 review, got {data['review_count']}"
        )
        assert data["rating"] and float(data["rating"]) > 0
        # GET /reviews returns approved reviews only
        rr = requests.get(
            f"{BASE_URL}/api/products/{PRODUCT_WITH_REVIEW_ID}/reviews", timeout=20
        )
        assert rr.status_code == 200
        reviews = rr.json()
        assert isinstance(reviews, list)
        assert len(reviews) == data["review_count"], (
            f"reviews list length {len(reviews)} != review_count {data['review_count']}"
        )

    def test_majority_of_products_have_zero_reviews(self):
        """Sanity check: per agent context 18/19 products have review_count==0."""
        r = requests.get(f"{BASE_URL}/api/products", timeout=20)
        items = r.json()
        zero_count = sum(1 for p in items if p.get("review_count", 0) == 0)
        assert zero_count >= len(items) - 2, (
            f"expected ≥{len(items) - 2} zero-review products, found {zero_count}/{len(items)}"
        )


# ───────────────── (2) POST review increments counters ─────────────────
class TestReviewSubmissionUpdatesCounters:
    def test_post_review_updates_rating_and_count(self):
        # Pick a product with 0 reviews for clean delta math
        all_prods = requests.get(f"{BASE_URL}/api/products", timeout=20).json()
        target = next(
            (
                p
                for p in all_prods
                if p.get("review_count", 0) == 0 and p["id"] != PRODUCT_WITH_REVIEW_ID
            ),
            None,
        )
        assert target, "no zero-review product available for test"
        pid = target["id"]
        before = requests.get(f"{BASE_URL}/api/products/{pid}", timeout=20).json()
        assert before["review_count"] == 0

        payload = {
            "name": f"TEST_Reviewer_{uuid.uuid4().hex[:6]}",
            "rating": 4,
            "title": "TEST_AutoReview",
            "comment": "Automated regression review — please ignore / cleanup.",
        }
        post = requests.post(
            f"{BASE_URL}/api/products/{pid}/reviews", json=payload, timeout=20
        )
        assert post.status_code == 200, post.text
        body = post.json()
        assert body.get("ok") is True
        new_review_id = body["review"]["id"]

        after = requests.get(f"{BASE_URL}/api/products/{pid}", timeout=20).json()
        assert after["review_count"] == 1, (
            f"expected review_count=1 after POST, got {after['review_count']}"
        )
        assert float(after["rating"]) == 4.0, (
            f"expected rating=4.0, got {after['rating']}"
        )

        # also reflected in /products list endpoint
        list_after = requests.get(f"{BASE_URL}/api/products", timeout=20).json()
        target_in_list = next(p for p in list_after if p["id"] == pid)
        assert target_in_list["review_count"] == 1

        # cleanup: delete review via admin
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
            timeout=20,
        )
        tok = r.json().get("token") or r.json().get("access_token")
        d = requests.delete(
            f"{BASE_URL}/api/admin/reviews/{new_review_id}",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=20,
        )
        assert d.status_code == 200
        final = requests.get(f"{BASE_URL}/api/products/{pid}", timeout=20).json()
        assert final["review_count"] == 0, "cleanup failed, review_count not reset"


# ───────────────── (3) Vehicle tagging bridge filter ─────────────────
class TestVehicleTaggingFilterBridge:
    """Creates a product tagged with the Hyundai Creta 1st-gen variant via
    compatible_variants[] (legacy fields empty) and asserts the legacy flat
    filter dropdowns now surface it."""

    @pytest.fixture(scope="class")
    def hyundai_creta_v1_variant(self):
        tree = requests.get(f"{BASE_URL}/api/catalog/tree", timeout=20).json()
        # tree shape: [{id,name,models:[{id,name,variants:[{id,name,start_year,end_year}]}]}]
        hyundai = next((m for m in tree if m["name"].lower() == "hyundai"), None)
        assert hyundai, "Hyundai not in catalog"
        creta = next(
            (md for md in hyundai["models"] if md["name"].lower() == "creta"), None
        )
        assert creta, "Creta not in Hyundai catalog"
        # Find a variant whose range covers 2018 (1st gen 2015-2020)
        v = next(
            (
                vt
                for vt in creta["variants"]
                if vt.get("start_year", 9999) <= 2018
                and (vt.get("end_year") is None or vt.get("end_year") >= 2018)
            ),
            None,
        )
        assert v, f"no 2018-covering variant found in Creta: {creta['variants']}"
        return {"make_id": hyundai["id"], "model_id": creta["id"], "variant": v}

    @pytest.fixture(scope="class")
    def tagged_product(self, admin_headers, hyundai_creta_v1_variant):
        variant_id = hyundai_creta_v1_variant["variant"]["id"]
        payload = {
            "name": "TEST_BridgeProduct_CretaV1",
            "slug": f"test-bridge-creta-v1-{uuid.uuid4().hex[:6]}",
            "price": 9999,
            "stock": 5,
            "category": "android-stereos",
            "description": "Bridge filter regression test product",
            "image": "https://placehold.co/200",
            "images": [],
            "compatible_variants": [variant_id],
            # explicitly clear legacy
            "car_brands": [],
            "car_models": [],
            "years": [],
            "is_published": True,
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=payload,
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text
        prod = r.json()
        yield prod
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/products/{prod['id']}",
            headers=admin_headers,
            timeout=20,
        )

    def test_filter_by_car_brand_hyundai_returns_product(self, tagged_product):
        r = requests.get(
            f"{BASE_URL}/api/products/filter",
            params={"car_brand": "Hyundai"},
            timeout=20,
        )
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert tagged_product["id"] in ids, (
            f"Hyundai filter missed bridged product. got {ids[:8]}"
        )

    def test_filter_by_car_model_creta_returns_product(self, tagged_product):
        r = requests.get(
            f"{BASE_URL}/api/products/filter", params={"car_model": "Creta"}, timeout=20
        )
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert tagged_product["id"] in ids, "Creta model filter missed bridged product"

    def test_filter_by_year_2018_returns_product(self, tagged_product):
        r = requests.get(
            f"{BASE_URL}/api/products/filter", params={"year": 2018}, timeout=20
        )
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert tagged_product["id"] in ids, (
            "year=2018 filter missed bridged product (variant covers 2015-2020)"
        )

    def test_filter_by_year_2030_excludes_product(self, tagged_product):
        r = requests.get(
            f"{BASE_URL}/api/products/filter", params={"year": 2030}, timeout=20
        )
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert tagged_product["id"] not in ids, (
            "year=2030 must NOT surface a 2015-2020 variant product"
        )

    def test_combined_brand_model_year_filter(self, tagged_product):
        r = requests.get(
            f"{BASE_URL}/api/products/filter",
            params={"car_brand": "Hyundai", "car_model": "Creta", "year": 2018},
            timeout=20,
        )
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert tagged_product["id"] in ids, (
            "combined Hyundai+Creta+2018 missed bridged product"
        )

    def test_universal_product_still_surfaces(self, admin_headers):
        """Universal product (car_brands=['ALL']) must surface in any filter."""
        payload = {
            "name": "TEST_UniversalBridge",
            "slug": f"test-universal-{uuid.uuid4().hex[:6]}",
            "price": 100,
            "stock": 1,
            "category": "android-stereos",
            "description": "Universal",
            "image": "https://placehold.co/200",
            "images": [],
            "compatible_variants": [],
            "car_brands": ["ALL"],
            "car_models": [],
            "years": [],
            "is_published": True,
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=payload,
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text
        uid = r.json()["id"]
        try:
            for params in (
                {"car_brand": "Hyundai"},
                {"car_model": "Creta"},
                {"year": 2018},
                {"year": 2030},
            ):
                rr = requests.get(
                    f"{BASE_URL}/api/products/filter", params=params, timeout=20
                )
                assert rr.status_code == 200
                ids = [p["id"] for p in rr.json()]
                assert uid in ids, f"Universal product missing for filter {params}"
        finally:
            requests.delete(
                f"{BASE_URL}/api/admin/products/{uid}",
                headers=admin_headers,
                timeout=20,
            )


# ───────────────── (4) Admin upload endpoint sanity ─────────────────
class TestAdminUploadEndpoint:
    def test_upload_small_png_returns_url(self, admin_headers):
        # 1x1 transparent PNG
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4"
            b"\x89\x00\x00\x00\rIDATx\x9cc\xfc\xcf\xc0P\x0f\x00\x05\x01\x01\x02p\xb0%9\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("test_pixel.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload",
            files=files,
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"], f"no url in upload response: {data}"
