from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Response, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import hmac
import hashlib
import jwt
import bcrypt
import razorpay
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
RAZORPAY_KEY_ID = os.environ['RAZORPAY_KEY_ID']
RAZORPAY_KEY_SECRET = os.environ['RAZORPAY_KEY_SECRET']
MOCK_PAYMENT = os.environ.get('MOCK_PAYMENT', 'true').lower() == 'true'
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "cardost"
storage_key: Optional[str] = None

try:
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if not MOCK_PAYMENT else None
except Exception:
    rzp_client = None

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============
class SignupReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ProductIn(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    categories: List[str] = []
    brand: Optional[str] = None
    image: str
    gallery: List[str] = []
    stock: int = 50
    rating: float = 4.5
    featured: bool = False
    is_published: bool = True
    is_best_seller: bool = False
    is_new_arrival: bool = False
    discount_percent: float = 0
    discount_flat: float = 0
    gst_percent: int = 18
    tags: List[str] = []
    car_brands: List[str] = []
    car_models: List[str] = []
    years: List[int] = []
    # SEO
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    seo_slug: Optional[str] = ""

class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    review_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewIn(BaseModel):
    name: str
    rating: int
    title: str
    comment: str

class Review(ReviewIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    is_approved: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Address(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str

class CreateOrderReq(BaseModel):
    items: List[CartItem]
    address: Address
    is_guest: bool = True
    coupon_code: Optional[str] = None

class VerifyPaymentReq(BaseModel):
    order_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

# ============ Helpers ============
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def make_token(uid: str, role: str = "user") -> str:
    payload = {
        "uid": uid,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    return payload

async def get_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user

def clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc

# ============ Auth ============
@api_router.post("/auth/signup")
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "name": req.name,
        "email": req.email,
        "phone": req.phone or "",
        "password": hash_pw(req.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = make_token(uid, "user")
    return {"token": token, "user": {"id": uid, "name": req.name, "email": req.email, "role": "user"}}

@api_router.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email})
    if not user or not check_pw(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user.get("role", "user"))
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user.get("role", "user")}}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["uid"]}, {"_id": 0, "password": 0})
    if not u:
        raise HTTPException(404, "Not found")
    return u

# ============ Settings (Admin-controlled config) ============
DEFAULT_SETTINGS = {
    "razorpay_key_id": "",
    "razorpay_key_secret": "",
    "razorpay_webhook_secret": "",
    "mock_payment": False,
    "shiprocket_email": "",
    "shiprocket_password": "",
    "shiprocket_channel_id": "",
    "shiprocket_pickup_location": "Primary",
    "shiprocket_enabled": False,
    "store_name": "CarDost",
    "support_email": "Autobotscarstudio@gmail.com",
    "support_phone": "+919063278724",
}

async def get_settings_doc():
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = {"id": "global", **DEFAULT_SETTINGS}
        await db.settings.insert_one(s)
    # Backfill any missing keys
    for k, v in DEFAULT_SETTINGS.items():
        if k not in s:
            s[k] = v
    return s

def get_active_razorpay_creds(settings: dict):
    kid = settings.get("razorpay_key_id") or RAZORPAY_KEY_ID
    ksec = settings.get("razorpay_key_secret") or RAZORPAY_KEY_SECRET
    mock = settings.get("mock_payment", False) if settings.get("razorpay_key_id") else MOCK_PAYMENT
    return kid, ksec, mock

def get_active_webhook_secret(settings: dict):
    return settings.get("razorpay_webhook_secret") or RAZORPAY_WEBHOOK_SECRET

class SettingsUpdate(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    mock_payment: Optional[bool] = None
    shiprocket_email: Optional[str] = None
    shiprocket_password: Optional[str] = None
    shiprocket_channel_id: Optional[str] = None
    shiprocket_pickup_location: Optional[str] = None
    shiprocket_enabled: Optional[bool] = None
    store_name: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None

@api_router.get("/admin/settings")
async def admin_get_settings(_=Depends(get_admin)):
    s = await get_settings_doc()
    # Mask secrets in response
    def mask(v): return ("•" * 6 + v[-4:]) if v and len(v) > 6 else ""
    s["razorpay_key_secret_masked"] = mask(s.get("razorpay_key_secret", ""))
    s["razorpay_webhook_secret_masked"] = mask(s.get("razorpay_webhook_secret", ""))
    s["shiprocket_password_masked"] = mask(s.get("shiprocket_password", ""))
    s.pop("razorpay_key_secret", None)
    s.pop("razorpay_webhook_secret", None)
    s.pop("shiprocket_password", None)
    return s

@api_router.put("/admin/settings")
async def admin_update_settings(body: SettingsUpdate, _=Depends(get_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return {"ok": True}

@api_router.get("/settings/public")
async def public_settings():
    s = await get_settings_doc()
    return {
        "store_name": s.get("store_name"),
        "support_email": s.get("support_email"),
        "support_phone": s.get("support_phone"),
    }

# ============ Shiprocket Integration ============
SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external"
_shiprocket_token = {"token": None, "expires_at": None}

async def shiprocket_login(email: str, password: str) -> Optional[str]:
    if not email or not password:
        return None
    if _shiprocket_token["token"] and _shiprocket_token["expires_at"] and _shiprocket_token["expires_at"] > datetime.now(timezone.utc):
        return _shiprocket_token["token"]
    try:
        r = requests.post(f"{SHIPROCKET_BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
        r.raise_for_status()
        token = r.json().get("token")
        if token:
            _shiprocket_token["token"] = token
            _shiprocket_token["expires_at"] = datetime.now(timezone.utc) + timedelta(days=8)
        return token
    except Exception as e:
        logger.error(f"Shiprocket login failed: {e}")
        return None

async def shiprocket_create_order(order: dict) -> dict:
    settings = await get_settings_doc()
    if not settings.get("shiprocket_enabled"):
        return {"skipped": True, "reason": "shiprocket disabled"}
    token = await shiprocket_login(settings.get("shiprocket_email", ""), settings.get("shiprocket_password", ""))
    if not token:
        return {"error": "auth failed"}
    addr = order["address"]
    items = order["items"]
    total_weight = max(0.5, len(items) * 0.5)  # rough estimate kg
    payload = {
        "order_id": order["id"][:30],
        "order_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "pickup_location": settings.get("shiprocket_pickup_location") or "Primary",
        "channel_id": settings.get("shiprocket_channel_id") or "",
        "billing_customer_name": addr["full_name"],
        "billing_last_name": "",
        "billing_address": addr["line1"],
        "billing_address_2": addr.get("line2") or "",
        "billing_city": addr["city"],
        "billing_pincode": addr["pincode"],
        "billing_state": addr["state"],
        "billing_country": "India",
        "billing_email": addr["email"],
        "billing_phone": addr["phone"],
        "shipping_is_billing": True,
        "order_items": [{
            "name": i["name"][:60],
            "sku": i["product_id"][:30],
            "units": i["quantity"],
            "selling_price": i["price"],
            "discount": "",
            "tax": "",
            "hsn": 851829
        } for i in items],
        "payment_method": "Prepaid",
        "sub_total": order["total"],
        "length": 30, "breadth": 20, "height": 10, "weight": total_weight,
    }
    try:
        r = requests.post(f"{SHIPROCKET_BASE}/orders/create/adhoc",
                          json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"raw": r.text}
        if r.status_code >= 400:
            logger.error(f"Shiprocket order create error: {data}")
            return {"error": data}
        return data
    except Exception as e:
        logger.error(f"Shiprocket request failed: {e}")
        return {"error": str(e)}

async def trigger_shiprocket(order_doc: dict):
    """Fire-and-forget shiprocket order creation; updates order doc with shiprocket response."""
    try:
        result = await shiprocket_create_order(order_doc)
        await db.orders.update_one(
            {"id": order_doc["id"]},
            {"$set": {"shiprocket": result, "shiprocket_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception as e:
        logger.error(f"shiprocket trigger failed: {e}")

# ============ Coupons ============
class CouponIn(BaseModel):
    code: str
    type: str  # 'percent' | 'flat' | 'free_shipping'
    value: float = 0
    min_order: float = 0
    max_discount: float = 0  # 0 = unlimited
    usage_limit: int = 0  # 0 = unlimited
    expires_at: Optional[str] = None  # ISO date
    is_active: bool = True
    description: Optional[str] = ""
    customer_emails: List[str] = []  # empty = all customers

def normalize_code(c: str) -> str:
    return (c or "").strip().upper()

async def validate_coupon(code: str, subtotal: float, email: Optional[str] = None):
    if not code:
        return None, None
    c = await db.coupons.find_one({"code": normalize_code(code)}, {"_id": 0})
    if not c:
        raise HTTPException(400, "Invalid coupon code")
    if not c.get("is_active", True):
        raise HTTPException(400, "Coupon is disabled")
    if c.get("expires_at"):
        try:
            exp = datetime.fromisoformat(c["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise HTTPException(400, "Coupon has expired")
        except ValueError:
            pass
    if c.get("usage_limit", 0) > 0 and c.get("used_count", 0) >= c["usage_limit"]:
        raise HTTPException(400, "Coupon usage limit reached")
    if subtotal < c.get("min_order", 0):
        raise HTTPException(400, f"Minimum order of ₹{c['min_order']} required")
    allowed = c.get("customer_emails", [])
    if allowed and email and email.lower() not in [e.lower() for e in allowed]:
        raise HTTPException(400, "Coupon not valid for this customer")
    # Compute discount
    discount = 0.0
    if c["type"] == "percent":
        discount = round(subtotal * (c["value"] / 100), 2)
        if c.get("max_discount", 0) > 0:
            discount = min(discount, c["max_discount"])
    elif c["type"] == "flat":
        discount = min(c["value"], subtotal)
    elif c["type"] == "free_shipping":
        discount = 0  # shipping is free in app — coupon valid but no extra discount
    return c, round(discount, 2)

@api_router.post("/coupons/validate")
async def validate_coupon_endpoint(body: dict):
    code = body.get("code", "")
    subtotal = float(body.get("subtotal", 0))
    email = body.get("email")
    c, discount = await validate_coupon(code, subtotal, email)
    return {
        "ok": True,
        "code": c["code"],
        "type": c["type"],
        "discount": discount,
        "description": c.get("description", ""),
    }

@api_router.get("/admin/coupons")
async def admin_list_coupons(_=Depends(get_admin)):
    return await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/admin/coupons")
async def admin_create_coupon(body: CouponIn, _=Depends(get_admin)):
    if body.type not in ("percent", "flat", "free_shipping"):
        raise HTTPException(400, "Invalid coupon type")
    code = normalize_code(body.code)
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(400, "Coupon code already exists")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "code": code, "used_count": 0,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.coupons.insert_one(doc)
    return {"ok": True}

@api_router.put("/admin/coupons/{code}")
async def admin_update_coupon(code: str, body: CouponIn, _=Depends(get_admin)):
    upd = body.model_dump()
    upd["code"] = normalize_code(body.code)
    res = await db.coupons.update_one({"code": normalize_code(code)}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/admin/coupons/{code}")
async def admin_delete_coupon(code: str, _=Depends(get_admin)):
    await db.coupons.delete_one({"code": normalize_code(code)})
    return {"ok": True}

# ============ Banners / Homepage Slides ============
class BannerIn(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    badge: Optional[str] = ""
    cta_text: Optional[str] = "Shop Now"
    cta_link: Optional[str] = "/shop"
    mesh: Optional[str] = "mesh-indigo"  # mesh-indigo, mesh-stereo, mesh-speakers, mesh-amber, mesh-emerald
    accent: Optional[str] = "#A5B4FC"
    image: Optional[str] = ""
    sort_order: int = 0
    is_active: bool = True

@api_router.get("/banners")
async def list_banners():
    items = await db.banners.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return items

@api_router.get("/admin/banners")
async def admin_list_banners(_=Depends(get_admin)):
    items = await db.banners.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return items

@api_router.post("/admin/banners")
async def admin_create_banner(body: BannerIn, _=Depends(get_admin)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.banners.insert_one(doc)
    return {"ok": True, "id": doc["id"]}

@api_router.put("/admin/banners/{bid}")
async def admin_update_banner(bid: str, body: BannerIn, _=Depends(get_admin)):
    res = await db.banners.update_one({"id": bid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/admin/banners/{bid}")
async def admin_delete_banner(bid: str, _=Depends(get_admin)):
    await db.banners.delete_one({"id": bid})
    return {"ok": True}

# ============ Tax Rules ============
class TaxRuleIn(BaseModel):
    name: str
    rate: float  # percent
    is_default: bool = False
    description: Optional[str] = ""

@api_router.get("/tax-rules")
async def list_tax_rules():
    return await db.tax_rules.find({}, {"_id": 0}).sort("rate", 1).to_list(50)

@api_router.post("/admin/tax-rules")
async def create_tax_rule(body: TaxRuleIn, _=Depends(get_admin)):
    if body.is_default:
        await db.tax_rules.update_many({}, {"$set": {"is_default": False}})
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.tax_rules.insert_one(doc)
    return {"ok": True}

@api_router.put("/admin/tax-rules/{rid}")
async def update_tax_rule(rid: str, body: TaxRuleIn, _=Depends(get_admin)):
    if body.is_default:
        await db.tax_rules.update_many({"id": {"$ne": rid}}, {"$set": {"is_default": False}})
    res = await db.tax_rules.update_one({"id": rid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/admin/tax-rules/{rid}")
async def delete_tax_rule(rid: str, _=Depends(get_admin)):
    await db.tax_rules.delete_one({"id": rid})
    return {"ok": True}

# ============ Reviews ============
async def recalculate_product_rating(product_id: str):
    pipe = [
        {"$match": {"product_id": product_id, "is_approved": True}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "cnt": {"$sum": 1}}}
    ]
    agg = await db.reviews.aggregate(pipe).to_list(1)
    if agg:
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"rating": round(float(agg[0]["avg"]), 2), "review_count": int(agg[0]["cnt"])}}
        )
    else:
        await db.products.update_one({"id": product_id}, {"$set": {"review_count": 0}})

@api_router.get("/products/{pid}/reviews")
async def list_reviews(pid: str):
    reviews = await db.reviews.find({"product_id": pid, "is_approved": True}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reviews

@api_router.post("/products/{pid}/reviews")
async def create_review(pid: str, body: ReviewIn):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "Rating must be 1-5")
    if not body.name.strip() or not body.title.strip() or not body.comment.strip():
        raise HTTPException(400, "All fields required")
    review = Review(product_id=pid, **body.model_dump())
    await db.reviews.insert_one(review.model_dump())
    await recalculate_product_rating(pid)
    return {"ok": True, "review": review.model_dump()}

@api_router.get("/admin/reviews")
async def admin_list_reviews(_=Depends(get_admin)):
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reviews

@api_router.patch("/admin/reviews/{rid}")
async def admin_toggle_review(rid: str, is_approved: bool, _=Depends(get_admin)):
    r = await db.reviews.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    await db.reviews.update_one({"id": rid}, {"$set": {"is_approved": is_approved}})
    await recalculate_product_rating(r["product_id"])
    return {"ok": True}

@api_router.delete("/admin/reviews/{rid}")
async def admin_delete_review(rid: str, _=Depends(get_admin)):
    r = await db.reviews.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    await db.reviews.delete_one({"id": rid})
    await recalculate_product_rating(r["product_id"])
    return {"ok": True}

# ============ Products ============
@api_router.get("/products")
async def list_products(category: Optional[str] = None, featured: Optional[bool] = None, q: Optional[str] = None,
                        best_seller: Optional[bool] = None, new_arrival: Optional[bool] = None,
                        published_only: bool = True):
    query = {}
    if published_only:
        query["is_published"] = {"$ne": False}
    if category and category != "all":
        # match either single legacy field or multi-category array
        query["$or"] = [{"category": category}, {"categories": category}]
    if featured is not None:
        query["featured"] = featured
    if best_seller is not None:
        query["is_best_seller"] = best_seller
    if new_arrival is not None:
        query["is_new_arrival"] = new_arrival
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    items = await db.products.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.get("/products/{pid}")
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p

@api_router.get("/categories")
async def categories():
    items = await db.categories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return items

@api_router.get("/admin/categories")
async def admin_list_categories(_=Depends(get_admin)):
    items = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return items

class CategoryIn(BaseModel):
    slug: str
    name: str
    description: Optional[str] = ""
    image: Optional[str] = ""
    icon: Optional[str] = "Package"
    parent_slug: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

@api_router.post("/admin/categories")
async def admin_create_category(body: CategoryIn, _=Depends(get_admin)):
    if await db.categories.find_one({"slug": body.slug}):
        raise HTTPException(400, "Slug already exists")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.categories.insert_one(doc)
    return {"ok": True}

@api_router.put("/admin/categories/{slug}")
async def admin_update_category(slug: str, body: CategoryIn, _=Depends(get_admin)):
    if body.slug != slug:
        await db.products.update_many({"categories": slug}, {"$set": {"categories.$": body.slug}})
        await db.products.update_many({"category": slug}, {"$set": {"category": body.slug}})
    res = await db.categories.update_one({"slug": slug}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.patch("/admin/categories/reorder")
async def admin_reorder_categories(orders: List[dict], _=Depends(get_admin)):
    for o in orders:
        await db.categories.update_one({"slug": o["slug"]}, {"$set": {"sort_order": int(o.get("sort_order", 0))}})
    return {"ok": True}

@api_router.delete("/admin/categories/{slug}")
async def admin_delete_category(slug: str, _=Depends(get_admin)):
    in_use = await db.products.count_documents({"$or": [{"category": slug}, {"categories": slug}]})
    if in_use > 0:
        raise HTTPException(400, f"Category in use by {in_use} product(s). Reassign first.")
    await db.categories.delete_one({"slug": slug})
    return {"ok": True}

# ============ Automotive Catalog ============
CAR_BRANDS_MODELS = {
    "Maruti Suzuki": ["Swift", "Baleno", "Brezza", "WagonR", "Alto", "Dzire", "Ertiga", "XL6", "Ciaz", "S-Presso", "Celerio", "Ignis", "Grand Vitara", "Jimny", "Fronx", "Invicto"],
    "Hyundai": ["i20", "i10", "Creta", "Venue", "Verna", "Aura", "Alcazar", "Tucson", "Kona Electric", "Exter", "Ioniq 5"],
    "Tata": ["Nexon", "Punch", "Harrier", "Safari", "Altroz", "Tiago", "Tigor", "Curvv", "Nexon EV", "Punch EV"],
    "Mahindra": ["Thar", "XUV700", "XUV300", "XUV400", "Scorpio-N", "Scorpio Classic", "Bolero", "Bolero Neo", "Marazzo", "BE 6", "XEV 9e"],
    "Honda": ["City", "Amaze", "Elevate", "WR-V", "Jazz", "Civic"],
    "Toyota": ["Innova Crysta", "Innova Hycross", "Fortuner", "Hilux", "Glanza", "Urban Cruiser Hyryder", "Camry", "Vellfire"],
    "Kia": ["Seltos", "Sonet", "Carens", "Carnival", "EV6"],
    "Volkswagen": ["Virtus", "Taigun", "Tiguan"],
    "Skoda": ["Kushaq", "Slavia", "Kodiaq", "Superb"],
    "Renault": ["Kwid", "Triber", "Kiger"],
    "Nissan": ["Magnite", "X-Trail"],
    "MG": ["Hector", "Astor", "Gloster", "ZS EV", "Comet EV", "Windsor EV"],
    "Ford": ["EcoSport", "Endeavour", "Figo", "Aspire"],
    "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS"],
    "BMW": ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7"],
    "Audi": ["A4", "A6", "Q3", "Q5", "Q7", "Q8"],
}

@api_router.get("/catalog/car-brands")
async def car_brands():
    return [{"name": b, "model_count": len(m)} for b, m in CAR_BRANDS_MODELS.items()]

@api_router.get("/catalog/car-models")
async def car_models(brand: Optional[str] = None):
    if brand:
        brands = [b.strip() for b in brand.split(",") if b.strip()]
        result = []
        for b in brands:
            for m in CAR_BRANDS_MODELS.get(b, []):
                result.append({"brand": b, "model": m})
        return result
    return [{"brand": b, "model": m} for b, ms in CAR_BRANDS_MODELS.items() for m in ms]

@api_router.get("/catalog/years")
async def years():
    current = datetime.now().year
    return list(range(current, 1999, -1))

# Update product list endpoint with extended filters
@api_router.get("/products/filter")
async def filter_products(
    category: Optional[str] = None,
    car_brand: Optional[str] = None,
    car_model: Optional[str] = None,
    year: Optional[int] = None,
    tag: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    q: Optional[str] = None,
):
    query = {"is_published": {"$ne": False}}
    if category and category != "all":
        query["$or"] = [{"category": category}, {"categories": category}]
    if car_brand: query["car_brands"] = {"$in": [b.strip() for b in car_brand.split(",")]}
    if car_model: query["car_models"] = {"$in": [m.strip() for m in car_model.split(",")]}
    if year: query["years"] = year
    if tag: query["tags"] = tag
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None: query["price"]["$gte"] = min_price
        if max_price is not None: query["price"]["$lte"] = max_price
    if q: query["name"] = {"$regex": q, "$options": "i"}
    items = await db.products.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.post("/admin/products")
async def create_product(p: ProductIn, _=Depends(get_admin)):
    prod = Product(**p.model_dump())
    await db.products.insert_one(prod.model_dump())
    return clean(prod.model_dump())

@api_router.put("/admin/products/{pid}")
async def update_product(pid: str, p: ProductIn, _=Depends(get_admin)):
    res = await db.products.update_one({"id": pid}, {"$set": p.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/admin/products/{pid}")
async def delete_product(pid: str, _=Depends(get_admin)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}

# ============ Bulk CSV Import ============
import csv
import io

@api_router.post("/admin/products/bulk")
async def bulk_import_products(file: UploadFile = File(...), _=Depends(get_admin)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")
    reader = csv.DictReader(io.StringIO(text))
    required = {"name", "description", "price", "category", "image"}
    if not reader.fieldnames or not required.issubset({h.strip() for h in reader.fieldnames}):
        raise HTTPException(400, f"CSV must have columns: {', '.join(sorted(required))} (optional: original_price, brand, stock, rating, featured)")

    created = 0
    errors = []
    for i, row in enumerate(reader, start=2):  # row 1 is header
        try:
            p_in = ProductIn(
                name=row["name"].strip(),
                description=row["description"].strip(),
                price=float(row["price"]),
                original_price=float(row["original_price"]) if row.get("original_price") else None,
                category=row["category"].strip(),
                brand=row.get("brand", "").strip() or None,
                image=row["image"].strip(),
                stock=int(row.get("stock") or 50),
                rating=float(row.get("rating") or 4.5),
                featured=str(row.get("featured", "")).strip().lower() in ("true", "1", "yes", "y"),
            )
            prod = Product(**p_in.model_dump())
            await db.products.insert_one(prod.model_dump())
            created += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)[:120]})
    return {"created": created, "errors": errors[:20], "error_count": len(errors)}

# ============ File Upload (Emergent Object Storage) ============
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # refresh key once and retry
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB

@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), user=Depends(get_admin)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only JPG/PNG/WEBP/GIF allowed")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "Max file size is 5MB")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/products/{file_id}.{ext}"
    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(500, "Upload failed")
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "uploaded_by": user["uid"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Public URL via our backend
    public_url = f"/api/files/{result['path']}"
    return {"url": public_url, "path": result["path"], "size": len(data)}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "File not found")
    try:
        data, ct = get_object(path)
    except Exception as e:
        logger.error(f"File fetch failed: {e}")
        raise HTTPException(500, "File fetch failed")
    return Response(content=data, media_type=record.get("content_type") or ct, headers={"Cache-Control": "public, max-age=86400"})

# ============ Orders / Payment ============
@api_router.post("/orders/create")
async def create_order(req: CreateOrderReq, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    settings = await get_settings_doc()
    active_kid, active_ksec, active_mock = get_active_razorpay_creds(settings)

    # Resolve user (optional for guest)
    user_id = None
    if creds:
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("uid")
        except jwt.PyJWTError:
            pass

    # Compute total from DB prices (trust server, not client) + check stock
    items_detail = []
    total = 0.0
    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(400, "Invalid quantity")
        p = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(400, f"Product {item.product_id} not found")
        if p.get("stock", 0) < item.quantity:
            raise HTTPException(400, f"Insufficient stock for {p['name']}. Only {p.get('stock', 0)} left.")
        line_total = p["price"] * item.quantity
        total += line_total
        items_detail.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": p["image"],
            "price": p["price"],
            "quantity": item.quantity,
            "line_total": line_total
        })

    if total <= 0:
        raise HTTPException(400, "Empty order")

    # Apply coupon
    coupon_data = None
    discount = 0.0
    if req.coupon_code:
        c, discount = await validate_coupon(req.coupon_code, total, req.address.email)
        coupon_data = {"code": c["code"], "type": c["type"], "discount": discount, "description": c.get("description", "")}
        total = max(0, total - discount)

    order_id = str(uuid.uuid4())
    amount_paise = int(round(total * 100))

    razorpay_order_id = None
    if not active_mock and active_kid and active_ksec:
        try:
            client = razorpay.Client(auth=(active_kid, active_ksec))
            r_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order_id[:40],
                "payment_capture": 1
            })
            razorpay_order_id = r_order["id"]
        except Exception as e:
            logger.error(f"Razorpay error: {e}")
            raise HTTPException(500, "Payment gateway error")

    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "is_guest": req.is_guest or user_id is None,
        "items": items_detail,
        "address": req.address.model_dump(),
        "subtotal": total + discount,
        "coupon": coupon_data,
        "discount": discount,
        "total": total,
        "amount_paise": amount_paise,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": None,
        "status": "created",
        "mock": active_mock,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    if coupon_data:
        await db.coupons.update_one({"code": coupon_data["code"]}, {"$inc": {"used_count": 1}})

    return {
        "order_id": order_id,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_key_id": active_kid,
        "amount": amount_paise,
        "currency": "INR",
        "mock": active_mock,
        "total": total
    }

@api_router.post("/orders/verify")
async def verify_payment(req: VerifyPaymentReq):
    order = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    async def decrement_stock():
        for it in order["items"]:
            await db.products.update_one(
                {"id": it["product_id"]},
                {"$inc": {"stock": -it["quantity"]}}
            )

    if MOCK_PAYMENT or order.get("mock"):
        if order.get("status") != "paid":
            await decrement_stock()
        await db.orders.update_one(
            {"id": req.order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": f"mock_pay_{uuid.uuid4().hex[:12]}",
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        updated = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
        if updated: await trigger_shiprocket(updated)
        return {"ok": True, "status": "paid", "order_id": req.order_id}

    if not (req.razorpay_order_id and req.razorpay_payment_id and req.razorpay_signature):
        raise HTTPException(400, "Missing payment fields")

    body_bytes = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
    settings = await get_settings_doc()
    _, active_ksec, _ = get_active_razorpay_creds(settings)
    expected = hmac.new(active_ksec.encode(), body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        await db.orders.update_one({"id": req.order_id}, {"$set": {"status": "failed"}})
        raise HTTPException(400, "Invalid signature")

    if order.get("status") != "paid":
        await decrement_stock()
    await db.orders.update_one(
        {"id": req.order_id},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": req.razorpay_payment_id,
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    updated = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    if updated: await trigger_shiprocket(updated)
    return {"ok": True, "status": "paid", "order_id": req.order_id}

ALLOWED_STATUSES = ["paid", "processing", "shipped", "delivered", "cancelled"]

# ============ Razorpay Webhook ============
from fastapi import Request

@api_router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    body = await request.body()
    settings = await get_settings_doc()
    active_webhook_secret = get_active_webhook_secret(settings)
    _, active_ksec, _ = get_active_razorpay_creds(settings)
    if not active_webhook_secret:
        logger.error("Webhook received but secret not configured")
        raise HTTPException(503, "Webhook secret not configured")
    if not x_razorpay_signature:
        raise HTTPException(400, "Missing signature")
    expected = hmac.new(active_webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        logger.warning("Webhook signature mismatch")
        raise HTTPException(400, "Invalid signature")

    import json as _json
    try:
        event = _json.loads(body)
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event_type = event.get("event")
    payment = event.get("payload", {}).get("payment", {}).get("entity", {}) or {}
    rzp_order_id = payment.get("order_id")
    rzp_payment_id = payment.get("id")
    logger.info(f"Razorpay webhook: {event_type} order={rzp_order_id} payment={rzp_payment_id}")

    if not rzp_order_id:
        return {"ok": True, "handled": False}

    order = await db.orders.find_one({"razorpay_order_id": rzp_order_id}, {"_id": 0})
    if not order:
        return {"ok": True, "handled": False, "reason": "order not found"}

    # Idempotent
    if order.get("status") == "paid" and event_type in ("payment.captured", "payment.authorized"):
        return {"ok": True, "handled": True, "already_paid": True}

    if event_type in ("payment.captured", "payment.authorized", "order.paid"):
        for it in order["items"]:
            await db.products.update_one({"id": it["product_id"]}, {"$inc": {"stock": -it["quantity"]}})
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": rzp_payment_id,
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "webhook_event": event_type
            }}
        )
        updated = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
        if updated: await trigger_shiprocket(updated)
    elif event_type == "payment.failed":
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"status": "failed", "webhook_event": event_type, "failure_reason": payment.get("error_description")}}
        )

    return {"ok": True, "handled": True, "event": event_type}

class OrderStatusUpdate(BaseModel):
    status: str

@api_router.patch("/admin/orders/{oid}/status")
async def update_order_status(oid: str, body: OrderStatusUpdate, _=Depends(get_admin)):
    if body.status not in ALLOWED_STATUSES:
        raise HTTPException(400, f"Status must be one of {ALLOWED_STATUSES}")
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    # If cancelling a previously-paid order, restock items
    if body.status == "cancelled" and order.get("status") in ("paid", "processing", "shipped"):
        for it in order["items"]:
            await db.products.update_one(
                {"id": it["product_id"]},
                {"$inc": {"stock": it["quantity"]}}
            )
    update = {"status": body.status, f"{body.status}_at": datetime.now(timezone.utc).isoformat()}
    await db.orders.update_one({"id": oid}, {"$set": update})
    return {"ok": True, "status": body.status}

@api_router.get("/orders/{oid}")
async def get_order(oid: str):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")
    return o

@api_router.get("/my/orders")
async def my_orders(user=Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["uid"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

@api_router.get("/admin/orders")
async def admin_orders(_=Depends(get_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.get("/admin/stats")
async def admin_stats(_=Depends(get_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"status": "paid"})
    pipe = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_agg = await db.orders.aggregate(pipe).to_list(1)
    revenue = revenue_agg[0]["total"] if revenue_agg else 0
    product_count = await db.products.count_documents({})
    user_count = await db.users.count_documents({"role": "user"})
    return {
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "revenue": revenue,
        "products": product_count,
        "users": user_count
    }

# ============ Contact ============
class ContactReq(BaseModel):
    name: str
    email: EmailStr
    message: str
    phone: Optional[str] = ""

@api_router.post("/contact")
async def contact(req: ContactReq):
    doc = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(doc)
    return {"ok": True}

# ============ Seed ============
SEED_PRODUCTS = [
    # Android Stereos
    {"name": "CarDost X9 Pro 10\" Android Stereo", "description": "10.1-inch Full HD IPS touchscreen Android 13 head unit with 4GB RAM, 64GB storage, Wireless CarPlay & Android Auto, GPS, Bluetooth 5.0, FM/AM, AHD camera support.", "price": 18999, "original_price": 24999, "category": "android-stereos", "brand": "CarDost", "image": "https://images.pexels.com/photos/4141878/pexels-photo-4141878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 25, "rating": 4.8, "featured": True},
    {"name": "Autotek Multimedia 9\" Android Player", "description": "9-inch Android 12 touchscreen with WiFi, Bluetooth, Mirror Link, USB & SD card support. Universal double-din fit.", "price": 12499, "original_price": 16999, "category": "android-stereos", "brand": "Autotek", "image": "https://images.pexels.com/photos/28984412/pexels-photo-28984412.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 30, "rating": 4.5, "featured": True},
    {"name": "RoadLink Android Multimedia Player 7\"", "description": "Compact 7-inch Android stereo with reverse camera input, steering control, 2GB RAM.", "price": 7499, "original_price": 9999, "category": "android-stereos", "brand": "RoadLink", "image": "https://images.pexels.com/photos/4078064/pexels-photo-4078064.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 40, "rating": 4.3, "featured": False},
    # Speakers
    {"name": "Sony XS-FB1620E 6.5\" Coaxial Speakers", "description": "260W peak power, 6.5-inch 2-way coaxial speakers with mica reinforced cellular fibre cones.", "price": 2499, "original_price": 3499, "category": "speakers", "brand": "Sony", "image": "https://images.unsplash.com/photo-1608538770329-65941f62f9f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxjYXIlMjBhdWRpbyUyMHNwZWFrZXIlMjBtYWNyb3xlbnwwfHx8fDE3ODE4OTgwOTB8MA&ixlib=rb-4.1.0&q=85", "stock": 60, "rating": 4.7, "featured": True},
    {"name": "Pioneer TS-A6976S 6x9\" 3-Way Speakers", "description": "450W max, 6x9-inch 3-way coaxial speakers with multilayer mica matrix cone for crystal-clear sound.", "price": 4999, "original_price": 6499, "category": "speakers", "brand": "Pioneer", "image": "https://images.pexels.com/photos/20703567/pexels-photo-20703567.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 35, "rating": 4.8, "featured": True},
    {"name": "JBL Stage1621 6.5\" Coaxial", "description": "Premium JBL 6.5-inch speakers, 250W max power. Powerful bass and crisp highs.", "price": 3299, "original_price": 4299, "category": "speakers", "brand": "JBL", "image": "https://images.pexels.com/photos/8133495/pexels-photo-8133495.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 45, "rating": 4.6, "featured": False},
    # Amplifiers
    {"name": "Xxygen ONAE 2727 3500W Mono Amp", "description": "Class D mono block amplifier, 3500W max power, perfect for subwoofers. Low-pass filter, bass boost.", "price": 8999, "original_price": 12999, "category": "amplifiers", "brand": "Xxygen", "image": "https://images.pexels.com/photos/13811121/pexels-photo-13811121.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 15, "rating": 4.6, "featured": True},
    {"name": "Magnetz MGT-A160 4-Channel Amplifier", "description": "1600W 4-channel amplifier with built-in crossover, bridgeable channels.", "price": 6499, "original_price": 8999, "category": "amplifiers", "brand": "Magnetz", "image": "https://images.pexels.com/photos/13972228/pexels-photo-13972228.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 20, "rating": 4.4, "featured": False},
    # Dash Cameras
    {"name": "CarDost 4K Front + Rear Dash Cam", "description": "4K UHD dash camera with rear cam, WiFi, GPS, night vision, 170° wide angle, loop recording, G-sensor.", "price": 5999, "original_price": 8499, "category": "dash-cameras", "brand": "CarDost", "image": "https://images.unsplash.com/photo-1574649341254-c3cf3421df77?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxkYXNoJTIwY2FtJTIwaW5zaWRlJTIwY2FyfGVufDB8fHx8MTc4MTg5ODA5Nnww&ixlib=rb-4.1.0&q=85", "stock": 30, "rating": 4.7, "featured": True},
    {"name": "Car Rear View Reverse Camera HD", "description": "Waterproof HD reverse parking camera with night vision, 170° wide angle, universal fit.", "price": 1299, "original_price": 1999, "category": "dash-cameras", "brand": "Generic", "image": "https://images.pexels.com/photos/1970816/pexels-photo-1970816.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 80, "rating": 4.3, "featured": False},
    # LED Lights
    {"name": "Premium LED Headlight H4 200W", "description": "Ultra-bright H4 LED headlights, 20000LM, 6000K cool white, plug-and-play. Pair.", "price": 1899, "original_price": 2999, "category": "led-lights", "brand": "Generic", "image": "https://images.pexels.com/photos/9754665/pexels-photo-9754665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 100, "rating": 4.5, "featured": False},
    {"name": "RGB Interior Footwell LED Strip Kit", "description": "App-controlled RGB LED strips for car interior. Music sync, 16M colors, easy install.", "price": 1499, "original_price": 2299, "category": "led-lights", "brand": "Generic", "image": "https://images.pexels.com/photos/14101380/pexels-photo-14101380.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 60, "rating": 4.4, "featured": True},
    # Perfumes
    {"name": "Bullsone Premium Car Perfume", "description": "Long-lasting car air freshener with elegant fragrance. 110ml bottle, lasts 60+ days.", "price": 599, "original_price": 899, "category": "perfumes", "brand": "Bullsone", "image": "https://images.unsplash.com/photo-1778530207612-b46210636834?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxjYXIlMjBwZXJmdW1lJTIwYWlyJTIwZnJlc2hlbmVyfGVufDB8fHx8MTc4MTg5ODA5Nnww&ixlib=rb-4.1.0&q=85", "stock": 200, "rating": 4.6, "featured": False},
    {"name": "Hanging Wood Diffuser - Black Ice", "description": "Hanging car diffuser with Black Ice fragrance. Premium wooden cap design.", "price": 349, "original_price": 499, "category": "perfumes", "brand": "Generic", "image": "https://images.unsplash.com/photo-1778530207938-ab559649165a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwyfHxjYXIlMjBwZXJmdW1lJTIwYWlyJTIwZnJlc2hlbmVyfGVufDB8fHx8MTc4MTg5ODA5Nnww&ixlib=rb-4.1.0&q=85", "stock": 150, "rating": 4.3, "featured": False},
    # Accessories
    {"name": "Blind Spot Mirror (Pair)", "description": "360° rotatable convex blind spot mirrors. Eliminate blind spots. Easy stick-on install.", "price": 299, "original_price": 499, "category": "accessories", "brand": "Generic", "image": "https://images.pexels.com/photos/2127613/pexels-photo-2127613.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 250, "rating": 4.2, "featured": False},
    {"name": "Anti-Fog Film for Windshield", "description": "Premium anti-fog film. Keeps windshield clear in rainy/foggy weather. Pack of 4 sheets.", "price": 499, "original_price": 799, "category": "accessories", "brand": "Generic", "image": "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 120, "rating": 4.1, "featured": False},
]

@app.on_event("startup")
async def startup_event():
    # Init object storage
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (uploads may not work): {e}")
    # Seed admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": ADMIN_EMAIL,
            "phone": "",
            "password": hash_pw(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user seeded")

    # Seed default categories if empty
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        DEFAULT_CATS = [
            {"slug": "android-stereos", "name": "Android Stereos", "icon": "Monitor", "sort_order": 1, "is_active": True, "description": "10\" Touchscreen, CarPlay, GPS"},
            {"slug": "speakers", "name": "Speakers", "icon": "Speaker", "sort_order": 2, "is_active": True, "description": "Sony, JBL, Pioneer audio speakers"},
            {"slug": "amplifiers", "name": "Amplifiers", "icon": "Zap", "sort_order": 3, "is_active": True, "description": "Mono and multi-channel amps"},
            {"slug": "dash-cameras", "name": "Dash Cameras", "icon": "Camera", "sort_order": 4, "is_active": True, "description": "Front and rear dash cams"},
            {"slug": "led-lights", "name": "LED Lights", "icon": "Lightbulb", "sort_order": 5, "is_active": True, "description": "Headlights and interior LEDs"},
            {"slug": "perfumes", "name": "Car Perfumes", "icon": "Sparkles", "sort_order": 6, "is_active": True, "description": "Air fresheners and diffusers"},
            {"slug": "accessories", "name": "Accessories", "icon": "Wrench", "sort_order": 7, "is_active": True, "description": "Blind spot mirrors, films, etc."},
            {"slug": "key-chains", "name": "Key Chains", "icon": "Key", "sort_order": 8, "is_active": True, "description": "Premium key covers"},
            {"slug": "body-covers", "name": "Body Covers", "icon": "Shirt", "sort_order": 9, "is_active": True, "description": "Custom-fit car body covers"},
        ]
        for c in DEFAULT_CATS:
            c["id"] = str(uuid.uuid4())
            c["parent_slug"] = None
            c["image"] = ""
            c["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.categories.insert_one(c)
        logger.info(f"Seeded {len(DEFAULT_CATS)} categories")

    # Migrate existing products: backfill 'categories' array from legacy 'category' field
    products_to_migrate = await db.products.find(
        {"$or": [{"categories": {"$exists": False}}, {"categories": {"$size": 0}}]}, {"_id": 0, "id": 1, "category": 1}
    ).to_list(1000)
    for p in products_to_migrate:
        if p.get("category"):
            await db.products.update_one({"id": p["id"]}, {"$set": {"categories": [p["category"]]}})
    if products_to_migrate:
        logger.info(f"Migrated {len(products_to_migrate)} products to multi-category")

    # Backfill product flag defaults
    await db.products.update_many({"is_published": {"$exists": False}}, {"$set": {"is_published": True}})
    await db.products.update_many({"is_best_seller": {"$exists": False}}, {"$set": {"is_best_seller": False}})
    await db.products.update_many({"is_new_arrival": {"$exists": False}}, {"$set": {"is_new_arrival": False}})

    # Seed sample coupons if empty
    if await db.coupons.count_documents({}) == 0:
        sample = [
            {"code": "SAVE5", "type": "percent", "value": 5, "min_order": 500, "max_discount": 500, "usage_limit": 0,
             "expires_at": None, "is_active": True, "description": "5% off on prepaid orders ₹500+", "customer_emails": []},
            {"code": "FIRST100", "type": "flat", "value": 100, "min_order": 1000, "max_discount": 100, "usage_limit": 0,
             "expires_at": None, "is_active": True, "description": "Flat ₹100 off on first order ₹1000+", "customer_emails": []},
            {"code": "BASS500", "type": "flat", "value": 500, "min_order": 5000, "max_discount": 500, "usage_limit": 0,
             "expires_at": None, "is_active": True, "description": "₹500 off on speakers/amps ₹5000+", "customer_emails": []},
        ]
        for c in sample:
            c["id"] = str(uuid.uuid4())
            c["used_count"] = 0
            c["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.coupons.insert_one(c)
        logger.info(f"Seeded {len(sample)} sample coupons")

    # Seed banners if empty
    if await db.banners.count_documents({}) == 0:
        banners = [
            {"title": "MEGA SOUND SALE", "subtitle": "Up to 76% OFF on selected products", "badge": "EXTRA 5% OFF ON PREPAID · CODE SAVE5",
             "cta_text": "Shop Now", "cta_link": "/shop", "mesh": "mesh-indigo", "accent": "#A5B4FC",
             "image": "https://images.pexels.com/photos/9530906/pexels-photo-9530906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=720&w=1920",
             "sort_order": 1, "is_active": True},
            {"title": "ANDROID STEREOS", "subtitle": "10\" Touchscreen · CarPlay · GPS", "badge": "Starting ₹7,499",
             "cta_text": "Explore Stereos", "cta_link": "/shop?category=android-stereos", "mesh": "mesh-stereo", "accent": "#FBBF24",
             "image": "https://images.pexels.com/photos/4078064/pexels-photo-4078064.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=720&w=1920",
             "sort_order": 2, "is_active": True},
            {"title": "BASS LEGENDS", "subtitle": "Sony · JBL · Pioneer · Magnetz", "badge": "Free Shipping All India",
             "cta_text": "Shop Speakers", "cta_link": "/shop?category=speakers", "mesh": "mesh-speakers", "accent": "#FBCFE8",
             "image": "https://images.unsplash.com/photo-1608538770329-65941f62f9f8?crop=entropy&cs=srgb&fm=jpg&w=1920",
             "sort_order": 3, "is_active": True},
        ]
        for b in banners:
            b["id"] = str(uuid.uuid4())
            b["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.banners.insert_one(b)
        logger.info(f"Seeded {len(banners)} banners")

    # Seed tax rules if empty
    if await db.tax_rules.count_documents({}) == 0:
        rules = [
            {"name": "GST 0% (Exempt)", "rate": 0, "is_default": False, "description": "Tax-exempt items"},
            {"name": "GST 5%", "rate": 5, "is_default": False, "description": "Essential goods"},
            {"name": "GST 12%", "rate": 12, "is_default": False, "description": "Standard"},
            {"name": "GST 18%", "rate": 18, "is_default": True, "description": "Most car audio products"},
            {"name": "GST 28%", "rate": 28, "is_default": False, "description": "Luxury items"},
        ]
        for r in rules:
            r["id"] = str(uuid.uuid4())
            r["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.tax_rules.insert_one(r)
        logger.info(f"Seeded {len(rules)} tax rules")

    # Seed products
    count = await db.products.count_documents({})
    if count == 0:
        for p in SEED_PRODUCTS:
            prod = Product(**p)
            await db.products.insert_one(prod.model_dump())
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
