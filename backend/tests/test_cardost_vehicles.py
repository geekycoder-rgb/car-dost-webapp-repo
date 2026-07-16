"""Vehicle Catalog v2 tests - hierarchical Make->Model->Variant + filter/order integration."""

import os
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

# Test credentials (seeded admin) — overridable via env
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")

EXPECTED_MAKES = {
    "Honda",
    "Hyundai",
    "Kia",
    "Mahindra",
    "Maruti Suzuki",
    "Skoda",
    "Tata Motors",
    "Toyota",
    "Volkswagen",
}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="session")
def tree():
    r = requests.get(f"{API}/catalog/tree", timeout=15)
    assert r.status_code == 200
    return r.json()


# -------- Catalog read endpoints --------
class TestCatalogRead:
    def test_makes_returns_9_sorted(self):
        r = requests.get(f"{API}/catalog/makes", timeout=15)
        assert r.status_code == 200
        makes = r.json()
        names = [m["name"] for m in makes]
        assert set(names) == EXPECTED_MAKES, f"Got {names}"
        assert names == sorted(names), "Not sorted by name"

    def test_tree_has_55_variants(self, tree):
        assert len(tree) == 9
        total_variants = 0
        total_models = 0
        for mk in tree:
            total_models += len(mk["models"])
            for m in mk["models"]:
                total_variants += len(m["variants"])
        assert total_variants == 55, f"Expected 55 variants, got {total_variants}"
        assert total_models == 28, f"Expected 28 models, got {total_models}"

    def test_tree_creta_1st_gen(self, tree):
        hyundai = next(mk for mk in tree if mk["name"] == "Hyundai")
        creta = next(m for m in hyundai["models"] if m["name"] == "Creta")
        v1 = next(v for v in creta["variants"] if v["name"] == "1st Generation")
        assert v1["start_year"] == 2015
        assert v1["end_year"] == 2020
        assert v1["notes"], "notes should be non-empty"
        assert v1["facelift_years"], "facelift_years should be non-empty"

    def test_models_filtered_by_make(self, tree):
        honda = next(mk for mk in tree if mk["name"] == "Honda")
        r = requests.get(
            f"{API}/catalog/models", params={"make_id": honda["id"]}, timeout=15
        )
        assert r.status_code == 200
        models = r.json()
        assert all(m["make_id"] == honda["id"] for m in models)
        names = {m["name"] for m in models}
        assert names == {"City", "Amaze"}

    def test_variants_filtered_by_model(self, tree):
        honda = next(mk for mk in tree if mk["name"] == "Honda")
        amaze = next(m for m in honda["models"] if m["name"] == "Amaze")
        r = requests.get(
            f"{API}/catalog/variants", params={"model_id": amaze["id"]}, timeout=15
        )
        assert r.status_code == 200
        variants = r.json()
        assert len(variants) == 2
        assert all(v["model_id"] == amaze["id"] for v in variants)

    def test_variant_label(self, tree):
        hyundai = next(mk for mk in tree if mk["name"] == "Hyundai")
        creta = next(m for m in hyundai["models"] if m["name"] == "Creta")
        v1 = next(v for v in creta["variants"] if v["name"] == "1st Generation")
        r = requests.get(f"{API}/catalog/variant/{v1['id']}/label", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "Hyundai" in data["label"]
        assert "Creta" in data["label"]
        assert "1st Generation" in data["label"]
        assert "2015" in data["label"]
        assert "2020" in data["label"]


# -------- Admin catalog CRUD + cascade --------
class TestAdminCatalogCRUD:
    def test_make_model_variant_create_update_delete_cascade(self, admin_headers):
        # Create make
        r = requests.post(
            f"{API}/admin/catalog/makes",
            json={"name": "TESTBrand"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        mk = r.json()
        mid = mk["id"]
        assert mk["slug"] == "testbrand"

        # Create model
        r = requests.post(
            f"{API}/admin/catalog/models",
            json={"make_id": mid, "name": "TESTModel"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        model = r.json()
        mod_id = model["id"]

        # Create variant
        r = requests.post(
            f"{API}/admin/catalog/variants",
            json={
                "model_id": mod_id,
                "name": "TESTVariant",
                "start_year": 2020,
                "end_year": None,
            },
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        v = r.json()
        assert v["start_year"] == 2020
        assert v["end_year"] is None

        # Update make
        r = requests.put(
            f"{API}/admin/catalog/makes/{mid}",
            json={"name": "TESTBrand2"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200

        # Delete make - cascade
        r = requests.delete(
            f"{API}/admin/catalog/makes/{mid}", headers=admin_headers, timeout=15
        )
        assert r.status_code == 200

        # Verify cascade: model + variant gone
        r = requests.get(f"{API}/catalog/models", params={"make_id": mid}, timeout=15)
        assert r.json() == []
        r = requests.get(
            f"{API}/catalog/variants", params={"model_id": mod_id}, timeout=15
        )
        assert r.json() == []

    def test_unauthorized_make_create(self):
        r = requests.post(
            f"{API}/admin/catalog/makes", json={"name": "Hack"}, timeout=10
        )
        assert r.status_code in (401, 403)


# -------- Product + filter integration --------
@pytest.fixture
def sample_variant_ids(tree):
    """(make_id, model_id, variant_id) for Hyundai Creta 1st Gen, plus other variant id for negative."""
    hyundai = next(mk for mk in tree if mk["name"] == "Hyundai")
    creta = next(m for m in hyundai["models"] if m["name"] == "Creta")
    v1 = next(v for v in creta["variants"] if v["name"] == "1st Generation")
    # other variant (Honda City 3rd Gen)
    honda = next(mk for mk in tree if mk["name"] == "Honda")
    city = next(m for m in honda["models"] if m["name"] == "City")
    other_v = city["variants"][0]
    return {
        "make_id": hyundai["id"],
        "model_id": creta["id"],
        "variant_id": v1["id"],
        "other_variant_id": other_v["id"],
        "other_make_id": honda["id"],
        "other_model_id": city["id"],
    }


@pytest.fixture
def compat_product(admin_headers, sample_variant_ids):
    body = {
        "name": "TEST_VehFilterProduct",
        "description": "Test product for variant filter",
        "price": 1000,
        "category": "accessories",
        "image": "https://example.com/p.jpg",
        "compatible_variants": [sample_variant_ids["variant_id"]],
        "car_brands": [],
    }
    r = requests.post(
        f"{API}/admin/products", json=body, headers=admin_headers, timeout=15
    )
    assert r.status_code == 200, r.text
    p = r.json()
    yield p
    requests.delete(
        f"{API}/admin/products/{p['id']}", headers=admin_headers, timeout=15
    )


@pytest.fixture
def universal_product(admin_headers):
    body = {
        "name": "TEST_UniversalProduct",
        "description": "uni",
        "price": 500,
        "category": "accessories",
        "image": "https://example.com/u.jpg",
        "car_brands": ["ALL"],
    }
    r = requests.post(
        f"{API}/admin/products", json=body, headers=admin_headers, timeout=15
    )
    assert r.status_code == 200, r.text
    p = r.json()
    yield p
    requests.delete(
        f"{API}/admin/products/{p['id']}", headers=admin_headers, timeout=15
    )


class TestProductCompatibility:
    def test_create_product_persists_compatible_variants(
        self, compat_product, sample_variant_ids
    ):
        r = requests.get(f"{API}/products/{compat_product['id']}", timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert sample_variant_ids["variant_id"] in p["compatible_variants"]

    def test_filter_by_variant_id(
        self, compat_product, universal_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"variant_id": sample_variant_ids["variant_id"]},
            timeout=15,
        )
        assert r.status_code == 200
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] in ids, "compat product missing"
        assert universal_product["id"] in ids, (
            "universal product missing (should appear for any variant)"
        )

    def test_filter_by_other_variant_excludes_compat(
        self, compat_product, universal_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"variant_id": sample_variant_ids["other_variant_id"]},
            timeout=15,
        )
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] not in ids
        assert universal_product["id"] in ids

    def test_filter_by_model_id(
        self, compat_product, universal_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"model_id": sample_variant_ids["model_id"]},
            timeout=15,
        )
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] in ids
        assert universal_product["id"] in ids

    def test_filter_by_other_model_excludes_compat(
        self, compat_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"model_id": sample_variant_ids["other_model_id"]},
            timeout=15,
        )
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] not in ids

    def test_filter_by_make_id(
        self, compat_product, universal_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"make_id": sample_variant_ids["make_id"]},
            timeout=15,
        )
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] in ids
        assert universal_product["id"] in ids

    def test_filter_by_other_make_excludes_compat(
        self, compat_product, sample_variant_ids
    ):
        r = requests.get(
            f"{API}/products/filter",
            params={"make_id": sample_variant_ids["other_make_id"]},
            timeout=15,
        )
        ids = {p["id"] for p in get_items(r.json())}
        assert compat_product["id"] not in ids

    def test_legacy_filter_still_works(self, admin_headers):
        body = {
            "name": "TEST_LegacyProduct",
            "description": "legacy",
            "price": 700,
            "category": "accessories",
            "image": "https://example.com/l.jpg",
            "car_brands": ["Hyundai"],
            "car_models": ["Creta"],
            "years": [2018],
        }
        r = requests.post(
            f"{API}/admin/products", json=body, headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        try:
            r = requests.get(
                f"{API}/products/filter", params={"car_brand": "Hyundai"}, timeout=15
            )
            ids = {p["id"] for p in get_items(r.json())}
            assert pid in ids

            r = requests.get(
                f"{API}/products/filter", params={"car_model": "Creta"}, timeout=15
            )
            ids = {p["id"] for p in get_items(r.json())}
            assert pid in ids

            r = requests.get(
                f"{API}/products/filter", params={"year": 2018}, timeout=15
            )
            ids = {p["id"] for p in get_items(r.json())}
            assert pid in ids
        finally:
            requests.delete(
                f"{API}/admin/products/{pid}", headers=admin_headers, timeout=15
            )


# -------- Order with vehicle fields --------
class TestOrderVehiclePersistence:
    def test_order_preserves_vehicle_fields(self, compat_product, sample_variant_ids):
        vehicle_label = "Hyundai Creta · 1st Generation (2015–2020)"
        body = {
            "items": [
                {
                    "product_id": compat_product["id"],
                    "quantity": 1,
                    "vehicle_variant_id": sample_variant_ids["variant_id"],
                    "vehicle_label": vehicle_label,
                }
            ],
            "address": {
                "full_name": "Test User",
                "phone": "9999999999",
                "email": "test@example.com",
                "line1": "1 Test St",
                "city": "Mumbai",
                "state": "MH",
                "pincode": "400001",
            },
            "is_guest": True,
        }
        r = requests.post(f"{API}/orders/create", json=body, timeout=20)
        assert r.status_code == 200, r.text
        order_id = r.json()["order_id"]

        r = requests.get(f"{API}/orders/{order_id}", timeout=15)
        assert r.status_code == 200
        order = r.json()
        item = order["items"][0]
        assert item["vehicle_variant_id"] == sample_variant_ids["variant_id"]
        assert item["vehicle_label"] == vehicle_label

    def test_order_without_vehicle_fields_still_works(self, universal_product):
        body = {
            "items": [{"product_id": universal_product["id"], "quantity": 1}],
            "address": {
                "full_name": "Test User",
                "phone": "9999999999",
                "email": "test@example.com",
                "line1": "1 Test St",
                "city": "Mumbai",
                "state": "MH",
                "pincode": "400001",
            },
            "is_guest": True,
        }
        r = requests.post(f"{API}/orders/create", json=body, timeout=20)
        assert r.status_code == 200
        order_id = r.json()["order_id"]
        r = requests.get(f"{API}/orders/{order_id}", timeout=15)
        item = r.json()["items"][0]
        assert item["vehicle_variant_id"] is None
        assert item["vehicle_label"] == ""
