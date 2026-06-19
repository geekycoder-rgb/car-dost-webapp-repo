from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

try:
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if not MOCK_PAYMENT else None
except Exception:
    rzp_client = None

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

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
    brand: Optional[str] = None
    image: str
    stock: int = 50
    rating: float = 4.5
    featured: bool = False

class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# ============ Products ============
@api_router.get("/products")
async def list_products(category: Optional[str] = None, featured: Optional[bool] = None, q: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
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
    return [
        {"slug": "android-stereos", "name": "Android Stereos", "icon": "Monitor"},
        {"slug": "speakers", "name": "Speakers", "icon": "Speaker"},
        {"slug": "amplifiers", "name": "Amplifiers", "icon": "Zap"},
        {"slug": "dash-cameras", "name": "Dash Cameras", "icon": "Camera"},
        {"slug": "led-lights", "name": "LED Lights", "icon": "Lightbulb"},
        {"slug": "perfumes", "name": "Car Perfumes", "icon": "Sparkles"},
        {"slug": "accessories", "name": "Accessories", "icon": "Wrench"},
    ]

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

# ============ Orders / Payment ============
@api_router.post("/orders/create")
async def create_order(req: CreateOrderReq, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # Resolve user (optional for guest)
    user_id = None
    if creds:
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("uid")
        except jwt.PyJWTError:
            pass

    # Compute total from DB prices (trust server, not client)
    items_detail = []
    total = 0.0
    for item in req.items:
        p = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(400, f"Product {item.product_id} not found")
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

    order_id = str(uuid.uuid4())
    amount_paise = int(round(total * 100))

    razorpay_order_id = None
    if not MOCK_PAYMENT and rzp_client:
        try:
            r_order = rzp_client.order.create({
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
        "total": total,
        "amount_paise": amount_paise,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": None,
        "status": "created",
        "mock": MOCK_PAYMENT,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)

    return {
        "order_id": order_id,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "amount": amount_paise,
        "currency": "INR",
        "mock": MOCK_PAYMENT,
        "total": total
    }

@api_router.post("/orders/verify")
async def verify_payment(req: VerifyPaymentReq):
    order = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    if MOCK_PAYMENT or order.get("mock"):
        await db.orders.update_one(
            {"id": req.order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": f"mock_pay_{uuid.uuid4().hex[:12]}",
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"ok": True, "status": "paid", "order_id": req.order_id}

    if not (req.razorpay_order_id and req.razorpay_payment_id and req.razorpay_signature):
        raise HTTPException(400, "Missing payment fields")

    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        await db.orders.update_one({"id": req.order_id}, {"$set": {"status": "failed"}})
        raise HTTPException(400, "Invalid signature")

    await db.orders.update_one(
        {"id": req.order_id},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": req.razorpay_payment_id,
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"ok": True, "status": "paid", "order_id": req.order_id}

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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
