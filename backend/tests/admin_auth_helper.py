import atexit
import os
import uuid

import requests

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover - optional for environments without pymongo
    MongoClient = None

LEGACY_ADMIN_EMAILS = ["admin@cardost.com"]
_CURRENT_ADMIN_PASSWORD = None
_RESTORE_REGISTERED = False
_ORIGINAL_ADMIN_STATE = None


def _read_env_file_value(key: str):
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return None
    with open(env_path, "r", encoding="utf-8") as handle:
        for line in handle:
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            if k.strip() == key:
                return v.strip().strip('"').strip("'")
    return None


def _get_collection():
    mongo_url = os.environ.get("MONGO_URL") or _read_env_file_value("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or _read_env_file_value("DB_NAME")
    if not mongo_url or not db_name or MongoClient is None:
        return None, None
    client = MongoClient(mongo_url)
    return client, client[db_name].users


def _restore_admin_state():
    global _ORIGINAL_ADMIN_STATE
    if not _ORIGINAL_ADMIN_STATE:
        return
    client, users = _get_collection()
    if not client or users is None:
        return
    try:
        original = _ORIGINAL_ADMIN_STATE
        restore_set = {
            "email": original["email"],
            "password": original["password"],
            "must_change_password": original.get("must_change_password", False),
        }
        restore_update = {"$set": restore_set}
        if original.get("password_changed_at"):
            restore_set["password_changed_at"] = original["password_changed_at"]
        else:
            restore_update["$unset"] = {"password_changed_at": ""}
        users.update_one({"id": original["id"]}, restore_update)
        users.delete_many(
            {
                "email": {"$in": LEGACY_ADMIN_EMAILS},
                "role": "admin",
                "id": {"$ne": original["id"]},
            }
        )
    finally:
        client.close()


def _register_restore(admin_email: str):
    global _RESTORE_REGISTERED, _ORIGINAL_ADMIN_STATE
    if _RESTORE_REGISTERED:
        return
    client, users = _get_collection()
    if not client or users is None:
        return
    try:
        admin = users.find_one({"email": admin_email, "role": "admin"})
        if not admin:
            legacy = users.find_one({"email": {"$in": LEGACY_ADMIN_EMAILS}, "role": "admin"})
            admin = legacy
        if admin:
            _ORIGINAL_ADMIN_STATE = {
                "id": admin["id"],
                "email": admin["email"],
                "password": admin["password"],
                "must_change_password": admin.get("must_change_password", False),
                "password_changed_at": admin.get("password_changed_at"),
            }
            atexit.register(_restore_admin_state)
            _RESTORE_REGISTERED = True
    finally:
        client.close()


def get_admin_token(http_client, api_base: str, admin_email: str, admin_password: str) -> str:
    global _CURRENT_ADMIN_PASSWORD

    _register_restore(admin_email)

    candidates = []
    if _CURRENT_ADMIN_PASSWORD:
        candidates.append(_CURRENT_ADMIN_PASSWORD)
    if admin_password not in candidates:
        candidates.append(admin_password)

    last_error = None
    for password in candidates:
        response = http_client.post(
            f"{api_base}/auth/login",
            json={"email": admin_email, "password": password},
            timeout=20,
        )
        if response.status_code == 200:
            body = response.json()
            _CURRENT_ADMIN_PASSWORD = password
            return body.get("token") or body.get("access_token")

        detail = None
        try:
            detail = response.json().get("detail")
        except Exception:
            detail = response.text

        if response.status_code == 403 and isinstance(detail, dict) and detail.get("code") == "PASSWORD_CHANGE_REQUIRED":
            new_password = f"TestAdmin!{uuid.uuid4().hex[:10]}"
            change = http_client.post(
                f"{api_base}/auth/admin/first-login-password-change",
                json={
                    "email": admin_email,
                    "current_password": password,
                    "new_password": new_password,
                },
                timeout=20,
            )
            if change.status_code != 200:
                last_error = f"password change failed: {change.status_code} {change.text}"
                continue
            _CURRENT_ADMIN_PASSWORD = new_password
            relogin = http_client.post(
                f"{api_base}/auth/login",
                json={"email": admin_email, "password": new_password},
                timeout=20,
            )
            if relogin.status_code == 200:
                body = relogin.json()
                return body.get("token") or body.get("access_token")
            last_error = f"relogin failed: {relogin.status_code} {relogin.text}"
            continue

        last_error = f"admin login failed: {response.status_code} {response.text}"

    raise AssertionError(last_error or "admin login failed")


def get_admin_headers(http_client, api_base: str, admin_email: str, admin_password: str):
    token = get_admin_token(http_client, api_base, admin_email, admin_password)
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
