#!/usr/bin/env python3
"""
CarDost — DB index & seed migration.

Run once after first `docker compose up`, and any time you add a new
hot query pattern. Safe to re-run — Mongo ignores duplicate index specs.

Usage:
    docker compose -f deploy/docker-compose.yml run --rm backend \
        python /srv/cardost/init_indexes.py

    # or directly from the host with the right MONGO_URL:
    MONGO_URL=mongodb://... DB_NAME=cardost python init_indexes.py
"""
from __future__ import annotations

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient


async def main() -> int:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "cardost")
    if not mongo_url:
        print("ERROR: MONGO_URL env var is required", file=sys.stderr)
        return 2

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # ───────────────────────── INDEXES ─────────────────────────
    # Format: (collection, index_spec, kwargs)
    plan = [
        # users — login by email, dedupe by id
        ("users",        [("email", 1)], {"unique": True, "sparse": True}),
        ("users",        [("id", 1)],    {"unique": True}),

        # products — id lookup, slug lookup, full catalog filters
        ("products",     [("id", 1)],         {"unique": True}),
        ("products",     [("seo_slug", 1)],   {"sparse": True}),
        ("products",     [("category", 1), ("is_published", 1)], {}),
        ("products",     [("compatible_variants", 1)], {}),
        ("products",     [("name", "text"), ("description", "text"), ("tags", "text")], {"default_language": "english"}),

        # orders — list by user, lookup by order id, admin sort by date
        ("orders",       [("id", 1)],         {"unique": True}),
        ("orders",       [("user_id", 1),     ("created_at", -1)], {}),
        ("orders",       [("address.email", 1), ("created_at", -1)], {}),
        ("orders",       [("address.phone", 1), ("created_at", -1)], {}),
        ("orders",       [("status", 1),      ("created_at", -1)], {}),
        ("orders",       [("razorpay_order_id", 1)], {"sparse": True}),

        # vehicle catalog hierarchy
        ("car_makes",    [("id", 1)],         {"unique": True}),
        ("car_makes",    [("slug", 1)],       {"unique": True, "sparse": True}),
        ("car_models",   [("id", 1)],         {"unique": True}),
        ("car_models",   [("make_id", 1)],    {}),
        ("car_variants", [("id", 1)],         {"unique": True}),
        ("car_variants", [("model_id", 1)],   {}),

        # categories, banners, reviews, coupons, tax, contacts, files, settings
        ("categories",   [("slug", 1)],  {"unique": True}),
        ("banners",      [("id", 1)],    {"unique": True}),
        ("reviews",      [("product_id", 1), ("created_at", -1)], {}),
        ("coupons",      [("code", 1)],  {"unique": True}),
        ("tax_rules",    [("id", 1)],    {"unique": True}),
        ("contacts",     [("created_at", -1)], {}),
        ("files",        [("storage_path", 1)], {"unique": True, "sparse": True}),
        ("settings",     [("id", 1)],    {"unique": True}),
    ]

    print(f"→ Connecting to {mongo_url.split('@')[-1]} db={db_name}")
    for collection, keys, kwargs in plan:
        try:
            name = await db[collection].create_index(keys, **kwargs)
            print(f"  ✓ {collection:<14} {name}")
        except Exception as e:
            print(f"  ✗ {collection:<14} {keys} — {e}")

    # ───────────────────────── SETTINGS BOOTSTRAP ─────────────────────────
    # Ensures the singleton settings doc exists so admin loads cleanly on first run.
    if not await db.settings.find_one({"id": "global"}):
        await db.settings.insert_one({
            "id": "global",
            "store_name": "CarDost",
            "support_email": "support@your-domain.com",
            "support_phone": "+91-0000000000",
            "smtp_enabled": False,
            "smtp_port": 587,
            "low_stock_threshold": 5,
            "low_stock_alerts_enabled": True,
            "mock_payment": True,            # safe default — flip off in Admin once Razorpay is live
            "shiprocket_enabled": False,
        })
        print("  ✓ settings        bootstrapped singleton doc")

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
