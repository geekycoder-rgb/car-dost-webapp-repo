import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]


def _read_env_file_value(key: str):
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        if k.strip() == key:
            return v.strip().strip('"').strip("'")
    return None

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://stereo-connect-2.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL", "admin@cardost.in")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD") or os.environ.get("ADMIN_PASSWORD", "Admin@123")

MONGO_URL = os.environ.get("MONGO_URL") or _read_env_file_value("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or _read_env_file_value("DB_NAME")


@pytest.mark.skipif(not MONGO_URL or not DB_NAME, reason="MONGO_URL/DB_NAME required")
def test_admin_first_login_password_rotation_flow():
    client = MongoClient(MONGO_URL)
    users = client[DB_NAME].users

    admin = users.find_one({"email": ADMIN_EMAIL, "role": "admin"})
    assert admin, f"admin user not found for {ADMIN_EMAIL}"

    original_password_hash = admin.get("password")
    original_must_change = admin.get("must_change_password", False)
    original_password_changed_at = admin.get("password_changed_at")

    temp_password = f"TmpAdmin!{uuid.uuid4().hex[:8]}"

    try:
        baseline_login = requests.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        if baseline_login.status_code != 200:
            pytest.skip("Baseline admin password does not match TEST/ADMIN_PASSWORD")

        # Force a deterministic first-login state for this test.
        users.update_one(
            {"id": admin["id"]},
            {
                "$set": {
                    "must_change_password": True,
                },
                "$unset": {"password_changed_at": ""},
            },
        )

        blocked_login = requests.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        assert blocked_login.status_code == 403, blocked_login.text
        blocked_detail = blocked_login.json().get("detail")
        assert isinstance(blocked_detail, dict)
        assert blocked_detail.get("code") == "PASSWORD_CHANGE_REQUIRED"

        change = requests.post(
            f"{API}/auth/admin/first-login-password-change",
            json={
                "email": ADMIN_EMAIL,
                "current_password": ADMIN_PASSWORD,
                "new_password": temp_password,
            },
            timeout=20,
        )
        assert change.status_code == 200, change.text
        assert change.json().get("ok") is True

        old_login = requests.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        assert old_login.status_code == 401

        new_login = requests.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": temp_password},
            timeout=20,
        )
        assert new_login.status_code == 200, new_login.text
        body = new_login.json()
        assert body.get("user", {}).get("role") == "admin"
        assert body.get("token") or body.get("access_token")
    finally:
        restore_set = {
            "password": original_password_hash,
            "must_change_password": original_must_change,
        }
        restore_update = {"$set": restore_set}
        if original_password_changed_at:
            restore_set["password_changed_at"] = original_password_changed_at
        else:
            restore_update["$unset"] = {"password_changed_at": ""}

        users.update_one({"id": admin["id"]}, restore_update)
        client.close()
