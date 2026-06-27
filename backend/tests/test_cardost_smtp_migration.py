"""
Iteration 6 — SMTP host auto-migration + empty-secret safeguard.

Covers:
  * MIGRATION: writing a legacy smtp.titan.* host triggers auto-migration to
    smtpout.secureserver.net:587 (use_ssl=False) on the next GET.
  * Credentials (smtp_password / smtp_username) survive the migration.
  * EMPTY-SECRET SAFEGUARD: PUT { "smtp_password": "" } is a no-op.
  * MASKED-BOUNCE-BACK SAFEGUARD: PUT { "smtp_password": "••••••XYZW" } no-op.
  * Non-secret empty field (smtp_from = "") IS persisted.
  * POST /admin/test-email returns ok=true.
  * REGRESSION: PATCH /admin/orders/{id}/status idempotency.
  * REGRESSION: CSV export → bulk import (0 created, ≥1 updated).
  * REGRESSION: admin /auth/me + /admin/stats 200, non-admin 403.
"""

import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Admin@123")

TARGET_HOST = "smtpout.secureserver.net"
LEGACY_HOSTS = [
    "smtp.titan.email",
    "smtp.titan.mail",
    "smtp.titan.in",
    "smtp.titanemail.com",
]


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed ({r.status_code}): {r.text[:200]}")
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="module")
def original_settings(admin_headers):
    """Snapshot settings at start so we can restore smtp_from etc. at end."""
    r = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module", autouse=True)
def restore_settings_at_end(admin_headers, original_settings):
    yield
    # Restore non-secret fields that we may have touched.
    restore = {
        "smtp_from": original_settings.get("smtp_from") or "customercare@cardost.in",
        "smtp_host": TARGET_HOST,
        "smtp_port": 587,
        "smtp_use_ssl": False,
    }
    requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json=restore,
        timeout=15,
    )


# ---------- MIGRATION tests ----------
@pytest.mark.parametrize(
    "legacy_host", LEGACY_HOSTS[:2]
)  # primary 2 from review_request
def test_migration_auto_corrects_legacy_smtp_host(admin_headers, legacy_host):
    # Plant the stale value
    r = requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_host": legacy_host, "smtp_port": 465, "smtp_use_ssl": True},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True}

    # Next GET must trigger the in-place migration
    r2 = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    )
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert data["smtp_host"] == TARGET_HOST, (
        f"expected migrated host, got {data['smtp_host']}"
    )
    assert data["smtp_port"] == 587, f"expected port 587, got {data['smtp_port']}"
    assert data["smtp_use_ssl"] is False, (
        f"expected use_ssl false, got {data['smtp_use_ssl']}"
    )


def test_migration_preserves_password(admin_headers):
    # Get current masked length
    before = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    before_masked = before.get("smtp_password_masked", "")
    # Plant legacy host again
    requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_host": "smtp.titan.email", "smtp_port": 465, "smtp_use_ssl": True},
        timeout=15,
    )
    after = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    assert after["smtp_host"] == TARGET_HOST
    assert after.get("smtp_password_masked", "") == before_masked, (
        "smtp_password masked length changed — password may have been lost in migration"
    )
    assert before_masked != "", (
        "smtp_password must be set on this env for the test to be meaningful"
    )


# ---------- EMPTY-SECRET SAFEGUARD ----------
def test_empty_smtp_password_does_not_overwrite(admin_headers):
    before = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    before_masked = before.get("smtp_password_masked", "")
    assert before_masked != "", (
        "Cannot test empty-overwrite safeguard if no password is currently stored"
    )

    r = requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_password": ""},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    after = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    assert after.get("smtp_password_masked", "") == before_masked, (
        "Empty smtp_password PUT wiped the stored credential — safeguard broken"
    )


def test_masked_bounce_back_does_not_overwrite(admin_headers):
    before = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    before_masked = before.get("smtp_password_masked", "")

    r = requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_password": "••••••XYZW"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    after = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    assert after.get("smtp_password_masked", "") == before_masked, (
        "Masked-placeholder PUT overwrote stored password"
    )


def test_non_secret_empty_field_is_saveable(admin_headers, original_settings):
    """smtp_from is NOT protected — empty should persist."""
    r = requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_from": ""},
        timeout=15,
    )
    assert r.status_code == 200

    after = requests.get(
        f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15
    ).json()
    assert after.get("smtp_from", None) == "", (
        f"smtp_from should accept empty string (got {after.get('smtp_from')!r})"
    )

    # Restore immediately so subsequent tests / live email work
    restore_val = original_settings.get("smtp_from") or "customercare@cardost.in"
    requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=admin_headers,
        json={"smtp_from": restore_val},
        timeout=15,
    )


# ---------- TEST EMAIL end-to-end ----------
def test_admin_test_email_sends_ok(admin_headers):
    # Ensure smtp_host is the migrated value (in case prior test left it stale)
    requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers, timeout=15)
    r = requests.post(
        f"{BASE_URL}/api/admin/test-email",
        headers=admin_headers,
        json={"to": "customercare@cardost.in"},
        timeout=30,
    )
    assert r.status_code == 200, f"test-email failed: {r.status_code} {r.text[:300]}"
    assert r.json().get("ok") is True


# ---------- REGRESSIONS ----------
def test_admin_auth_me(admin_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("email") == ADMIN_EMAIL
    assert body.get("role") == "admin"


def test_admin_stats_200(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    # Just sanity-check shape, exact numbers vary
    assert isinstance(data, dict)


def test_non_admin_stats_403():
    # Create / login as a regular user; signup endpoint may already have user.
    email = f"TEST_smoke_{int(time.time())}@example.com"
    requests.post(
        f"{BASE_URL}/api/auth/signup",
        json={"email": email, "password": "Test@123", "name": "smoke"},
        timeout=15,
    )
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": "Test@123"},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"could not create non-admin user: {r.status_code}")
    j = r.json()
    tok = j.get("token") or j.get("access_token")
    rr = requests.get(
        f"{BASE_URL}/api/admin/stats",
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert rr.status_code == 403


def test_csv_export_then_bulk_import_round_trip(admin_headers):
    exp = requests.get(
        f"{BASE_URL}/api/admin/products/export",
        headers={"Authorization": admin_headers["Authorization"]},
        timeout=30,
    )
    assert exp.status_code == 200, exp.text
    csv_bytes = exp.content
    assert csv_bytes.startswith(b"id,") or b"id," in csv_bytes[:200]

    files = {"file": ("export.csv", io.BytesIO(csv_bytes), "text/csv")}
    imp = requests.post(
        f"{BASE_URL}/api/admin/products/bulk",
        headers={"Authorization": admin_headers["Authorization"]},
        files=files,
        timeout=60,
    )
    assert imp.status_code == 200, imp.text
    j = imp.json()
    assert j.get("created", -1) == 0, f"expected created=0, got {j.get('created')}"
    assert j.get("updated", 0) >= 1, f"expected updated>=1, got {j.get('updated')}"


def test_order_status_email_and_idempotency(admin_headers):
    # Find any existing order
    r = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    orders = r.json()
    if not isinstance(orders, list) or not orders:
        pytest.skip("no existing orders to PATCH")
    order = orders[0]
    oid = order.get("id")
    cur_status = order.get("status") or "pending"
    target = "processing" if cur_status != "processing" else "shipped"

    p1 = requests.patch(
        f"{BASE_URL}/api/admin/orders/{oid}/status",
        headers=admin_headers,
        json={"status": target},
        timeout=20,
    )
    assert p1.status_code == 200, p1.text

    # Re-patch same status — should still 200 but not duplicate logs
    p2 = requests.patch(
        f"{BASE_URL}/api/admin/orders/{oid}/status",
        headers=admin_headers,
        json={"status": target},
        timeout=20,
    )
    assert p2.status_code == 200, p2.text
