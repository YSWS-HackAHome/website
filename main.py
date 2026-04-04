import os
import httpx
import uvicorn
import asyncpg
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from contextlib import asynccontextmanager
from typing import Optional, List, Dict
from datetime import datetime
from git import Repo
from fastapi import UploadFile, File
import shutil
from pathlib import Path
import base64
import uuid
import re
import json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_SLACK_IDS = os.getenv("ADMIN_SLACK_IDS", "").split(",")
ADMIN_SLACK_IDS = [sid.strip() for sid in ADMIN_SLACK_IDS if sid.strip()]

PRODUCTS = [
    {
        'id': 'p1',
        'name': 'Home Assistant Green',
        'price': 800,
        'category': 'Computing',
        'thumb': 'https://image.alza.cz/products/HA23_01/HA23_01.jpg'
    },
    {
        'id': 'p2',
        'name': 'Raspberry Pi 4 (2GB)',
        'price': 750,
        'category': 'Computing',
        'thumb': 'https://assets.raspberrypi.com/static/edb980577a310edd205b5372efe9bc22/8dbcc/15c25bce-9820-4787-abe8-b6a9815a94c8_4B%2BDESKTOP%2BFEATURED.jpg'
    },
    {
        'id': 'p3',
        'name': 'Arduino Starter Kit',
        'price': 400,
        'category': 'Microcontrollers',
        'thumb': 'https://store-usa.arduino.cc/cdn/shop/files/starterkit_00.front_934x700.jpg'
    },
    {
        'id': 'p4',
        'name': 'Arduino Nano',
        'price': 150,
        'category': 'Microcontrollers',
        'thumb': 'https://store-usa.arduino.cc/cdn/shop/files/A000005_03.front_934x700.jpg'
    },
    {
        'id': 'p5',
        'name': 'ESP32 Dev Board',
        'price': 180,
        'category': 'Microcontrollers',
        'thumb': 'https://botland.cz/img/cms/23341_1_kwadrat.jpg'
    },
    {
        'id': 'p6',
        'name': 'PIR Motion Sensor',
        'price': 80,
        'category': 'Sensors',
        'thumb': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBLzMct8jwIiqciBwqGr9ZryPV1RJf7dBL5g&s'
    },
    {
        'id': 'p7',
        'name': 'DHT22 Temp & Humidity Sensor',
        'price': 90,
        'category': 'Sensors',
        'thumb': 'https://cdn-shop.adafruit.com/970x728/385-00.jpg'
    },
    {
        'id': 'p8',
        'name': 'Ultrasonic Distance Sensor',
        'price': 70,
        'category': 'Sensors',
        'thumb': 'https://www.sparkfun.com/media/catalog/product/cache/a793f13fd3d678cea13d28206895ba0c/1/5/15569-Ultrasonic_Distance_Sensor_-_HC-SR04-01a.jpg'
    },
    {
        'id': 'p9',
        'name': 'Soldering Iron Kit',
        'price': 300,
        'category': 'Tools',
        'thumb': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3yD5N06OW207m5Ztt9o_6F-7k_b0JFfpqEw&s'
    },
    {
        'id': 'p10',
        'name': 'Breadboard + Jumper Wire Bundle',
        'price': 60,
        'category': 'Components',
        'thumb': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLi5Hz2CK6PBzXBuiIuEnianMptKae1xJ_hg&s'
    },
    {
        'id': 'p11',
        'name': 'RGB LED Strip (5m)',
        'price': 120,
        'category': 'Components',
        'thumb': 'https://media.hornbach.cz/hb/packshot/as.47135862.jpg?dvid=8'
    },
    {
        'id': 'p12',
        'name': 'Hack Club Sticker Pack',
        'price': 20,
        'category': 'Swag',
        'thumb': 'https://flavortown.hackclub.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6NTMyLCJwdXIiOiJibG9iX2lkIn19--00960983352d912aa3d30bbee91e810628fffb7f/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwiY3JvcF90b19jb250ZW50Ijp0cnVlLCJyZXNpemVfdG9fbGltaXQiOlszNjAsbnVsbF0sInNhdmVyIjp7InN0cmlwIjp0cnVlLCJxdWFsaXR5Ijo3NX19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--3652e0445c35f878da6dea0437a6dc5f7e803587/pile_of_stickers.png'
    },
]

PERMANENT_ITEMS = [
    # {
    #     'id': 'ship_01',
    #     'name': 'TEST FEE',
    #     'price': 0.0,
    #     'quantity': 1
    # }
]

PRODUCTS_DICT = {p['id']: p for p in PRODUCTS}
db_pool = None

async def send_discord_webhook(embed_data: dict, webhook_url: str = None):
    webhook_url = webhook_url or os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        logger.warning("Discord webhook URL not configured")
        return
    
    # Process embed fields to handle base64 images
    if 'fields' in embed_data:
        for field in embed_data['fields']:
            if field.get('name') == 'Thumbnail' and field.get('value'):
                value = field['value']
                # Check if it's a base64 image (starts with data:image/)
                if isinstance(value, str) and value.startswith('data:image/'):
                    # Replace with a placeholder
                    field['value'] = '🖼️ [Image too large to display]'
                # Also check if it's extremely long (over 500 chars)
                elif len(value) > 500:
                    field['value'] = value[:200] + '... [truncated]'
    
    # Also check thumbnail field if it exists directly
    if 'thumbnail' in embed_data and embed_data['thumbnail']:
        thumbnail = embed_data['thumbnail']
        if isinstance(thumbnail, dict) and 'url' in thumbnail:
            url = thumbnail['url']
            if isinstance(url, str) and (url.startswith('data:image/') or len(url) > 500):
                embed_data['thumbnail'] = {'url': 'https://via.placeholder.com/150?text=Image+Too+Large'}
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json={"embeds": [embed_data]})
    except Exception as e:
        logger.error(f"Failed to send Discord webhook: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    await init_db()
    logger.info("Server started")
    
    yield
    
    if db_pool:
        await db_pool.close()
    logger.info("Database pool closed")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    session_cookie="hackahome_session",
    max_age=604800
)

oauth = OAuth()
oauth.register(
    name='hackclub',
    client_id=os.getenv("HACKCLUB_CLIENT_ID"),
    client_secret=os.getenv("HACKCLUB_CLIENT_SECRET"),
    server_metadata_url='https://auth.hackclub.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email name profile slack_id verification_status email'}
)

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    desc: Optional[str] = Field(None, max_length=500)
    github: Optional[str] = None
    website: Optional[str] = None
    hackatime: Optional[str] = Field(None, max_length=100)
    thumb: Optional[str] = None
    
    @field_validator('github')
    @classmethod
    def validate_github(cls, v):
        if v and not re.match(r'^[\w\-]+/[\w\-]+$', v):
            raise ValueError('Invalid format: username/repo')
        return v
    
    @field_validator('desc', 'github', 'website', 'hackatime', 'thumb')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v
    
class DevLogCreate(BaseModel):
    projectId: str
    title: str = Field(..., min_length=1, max_length=200)
    timeSpent: float = Field(..., gt=0, le=1000)
    content: str = Field(..., min_length=1, max_length=10000)

class PurchaseItemRequest(BaseModel):
    id: str
    quantity: int = Field(1, ge=1)

class PurchaseRequest(BaseModel):
    items: List[PurchaseItemRequest]

class ProjectSubmit(BaseModel):
    projectId: str

class AdminProjectReview(BaseModel):
    projectId: str
    action: str  # "approve" or "revision"
    reviewerNotes: Optional[str] = Field(None, max_length=1000)
    rewardAmount: Optional[float] = Field(None, ge=0, le=10000)

async def init_db():
    global db_pool
    db_pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        min_size=5,
        max_size=20
    )
    
    async with db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(100),
                balance DECIMAL(12,2) DEFAULT 0,
                avatar TEXT,
                slack_id VARCHAR(255),
                email VARCHAR(255),
                sub VARCHAR(255),
                verification_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100),
                description TEXT,
                github VARCHAR(100),
                website VARCHAR(200),
                hackatime VARCHAR(100),
                thumb TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                submitted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS dev_logs (
                id BIGSERIAL PRIMARY KEY,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
                title VARCHAR(200),
                time_spent DECIMAL(5,1),
                content TEXT,
                log_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20),
                amount DECIMAL(12,2),
                balance_before DECIMAL(12,2),
                balance_after DECIMAL(12,2),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id BIGSERIAL PRIMARY KEY,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                items JSONB,
                total_price DECIMAL(12,2),
                status VARCHAR(20) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("Database initialized")

async def get_current_user(request: Request):
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('id')
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="Invalid user session")
    
    async with db_pool.acquire() as conn:
        user_data = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1", user_id
        )
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user_data)

async def get_current_admin(current_user: Dict = Depends(get_current_user)):
    """Check if the current user is an admin based on Slack ID"""
    slack_id = current_user.get('slack_id')
    
    if not slack_id:
        raise HTTPException(status_code=403, detail="Admin access required - No Slack ID found")
    
    if slack_id not in ADMIN_SLACK_IDS:
        raise HTTPException(status_code=403, detail="Admin access required - Unauthorized")
    
    return current_user

async def log_transaction(conn, user_id: str, type: str, amount: float, 
                         balance_before: float, balance_after: float, 
                         description: str):
    await conn.execute("""
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, user_id, type, amount, balance_before, balance_after, description)

@app.get('/api/info')
async def get_info():
    return {
        "version": Repo(search_parent_directories=True).head.object.hexsha[:7]
    }

@app.get('/api/shop')
async def get_shop():
    return {
        "inventory": PRODUCTS,
        "permanent_fees": PERMANENT_ITEMS
    }

@app.post('/api/purchase')
async def purchase_items(request: PurchaseRequest, current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            user = await conn.fetchrow("SELECT balance FROM users WHERE id = $1 FOR UPDATE", current_user['id'])
            current_balance = float(user['balance'])
            
            final_items = []
            running_total = 0.0

            for req in request.items:
                product = PRODUCTS_DICT.get(req.id)
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {req.id} not found")
                
                line_total = float(product['price'] * req.quantity)
                running_total += line_total
                final_items.append({
                    "id": product['id'],
                    "name": product['name'],
                    "unit_price": product['price'],
                    "quantity": req.quantity,
                    "subtotal": line_total
                })

            for fee in PERMANENT_ITEMS:
                fee_total = float(fee['price'] * fee['quantity'])
                running_total += fee_total
                final_items.append({
                    **fee,
                    "subtotal": fee_total
                })

            if current_balance < running_total:
                raise HTTPException(status_code=400, detail="Insufficient balance")

            new_balance = current_balance - running_total
            await conn.execute("UPDATE users SET balance = $1 WHERE id = $2", new_balance, current_user['id'])

            await conn.execute("""
                INSERT INTO orders (user_id, items, total_price)
                VALUES ($1, $2, $3)
            """, current_user['id'], json.dumps(final_items), running_total)

            await log_transaction(
                conn, 
                current_user['id'], 
                'purchase', 
                -running_total,
                current_balance, 
                new_balance, 
                f"Purchase: {len(request.items)} items + shipping"
            )

            embed = {
                "title": "🛒 New Order Placed",
                "color": 0x00ff00,
                "fields": [
                    {"name": "User", "value": current_user.get('name', 'Unknown'), "inline": True},
                    {"name": "Total Paid", "value": f"${running_total:.2f}", "inline": True},
                    {"name": "Items", "value": "\n".join([f"{item['name']} x{item['quantity']}" for item in final_items]), "inline": False}
                ],
                "timestamp": datetime.utcnow().isoformat()
            }
            await send_discord_webhook(embed)

            return {
                "success": True,
                "total_paid": running_total,
                "remaining_balance": new_balance,
                "receipt": final_items
            }
        
@app.get('/api/orders')
async def get_orders(current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", current_user['id'])
        return [dict(r) for r in rows]

@app.get('/api/login')
async def login(request: Request):
    return await oauth.hackclub.authorize_redirect(
        request, "https://hackahome.nullbyte.rip/api/oauth/callback"
    )

@app.get('/api/oauth/callback')
async def oauth_callback(request: Request):
    token = await oauth.hackclub.authorize_access_token(request)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://auth.hackclub.com/api/v1/me",
            headers={"Authorization": f"Bearer {token['access_token']}"}
        )
        data = resp.json()
        user_data = data.get('identity', {})

        if user_data.get('ysws_eligible', False) is False:
            return RedirectResponse('/ineligible')
        
        user_id = user_data.get('id')
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        oidc_name = f"{first_name} {last_name}".strip()
        
        email = user_data.get('primary_email')
        slack_id = user_data.get('slack_id')
        verification_status = user_data.get('verification_status', 'unverified')

        avatar_base64 = None
        if slack_id:
            try:
                r = await client.get(f"https://cachet.dunkirk.sh/users/{slack_id}")
                if r.status_code == 200:
                    r_data = r.json()
                    image_url = r_data.get("imageUrl")
                    
                    if image_url:
                        img_resp = await client.get(image_url)
                        if img_resp.status_code == 200:
                            encoded_img = base64.b64encode(img_resp.content).decode('utf-8')
                            mime_type = img_resp.headers.get("Content-Type", "image/png")
                            avatar_base64 = f"data:{mime_type};base64,{encoded_img}"
            except Exception as e:
                logger.error(f"Failed to fetch avatar for {slack_id}: {e}")

        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO users (id, name, slack_id, email, sub, verification_status, avatar)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    name = COALESCE(NULLIF(users.name, ''), EXCLUDED.name),
                    slack_id = EXCLUDED.slack_id,
                    email = EXCLUDED.email,
                    sub = EXCLUDED.sub,
                    verification_status = EXCLUDED.verification_status,
                    avatar = COALESCE(users.avatar, EXCLUDED.avatar),
                    updated_at = CURRENT_TIMESTAMP
            """, user_id, oidc_name, slack_id, email, user_id, verification_status, avatar_base64)
            
            db_user = await conn.fetchrow("SELECT name FROM users WHERE id = $1", user_id)
            
            session_user = {
                'id': user_id,
                'name': db_user['name'],
                'slack_id': slack_id,
                'email': email,
                'sub': user_id,
                'verification_status': verification_status
            }
            
            request.session['user'] = session_user
            
            await conn.execute("""
                UPDATE users SET balance = COALESCE(balance, 0)
                WHERE id = $1 AND balance IS NULL
            """, user_id)
    
    return RedirectResponse('/dashboard')

@app.get('/api/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse('/')

@app.get('/api/user')
async def get_user(current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        projects = await conn.fetch("""
            SELECT id, name, description as desc, github, website, thumb, hackatime, status
            FROM projects 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        """, current_user['id'])
        
        dev_logs = await conn.fetch("""
            SELECT id, project_id as "projectId", title, time_spent as "timeSpent",
                   to_char(log_date, 'MM/DD/YYYY') as date, content
            FROM dev_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        """, current_user['id'])
        
        return {
            "account": {
                "sub": current_user.get('sub', ''),
                "name": current_user.get('name', ''),
                "balance": float(current_user.get('balance', 0)),
                "slack_id": current_user.get('slack_id', ''),
                "email": current_user.get('email', ''),
                "verification_status": current_user.get('verification_status', 'unverified'),
                "avatar": current_user.get('avatar', '🧪')
            },
            "projects": [dict(p) for p in projects],
            "devLogs": [dict(d) for d in dev_logs]
        }

@app.patch('/api/account')
async def update_account(update: AccountUpdate, current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        update_fields = []
        values = []
        param_count = 1
        
        if update.name is not None:
            update_fields.append(f"name = ${param_count}")
            values.append(update.name)
            param_count += 1
        if update.avatar is not None:
            update_fields.append(f"avatar = ${param_count}")
            values.append(update.avatar)
            param_count += 1
        
        if update_fields:
            update_fields.append(f"updated_at = CURRENT_TIMESTAMP")
            values.append(current_user['id'])
            
            await conn.execute(f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = ${param_count}
            """, *values)
            
            user = await conn.fetchrow(
                "SELECT name, avatar, balance FROM users WHERE id = $1", 
                current_user['id']
            )
            return {
                "name": user['name'], 
                "avatar": user['avatar'], 
                "balance": float(user['balance'])
            }
    
    return {"message": "No updates"}

@app.patch('/api/projects/{project_id}')
async def update_project(project_id: str, update: ProjectUpdate, current_user: Dict = Depends(get_current_user)):
    # Define allowed columns that can be updated (whitelist)
    ALLOWED_UPDATE_COLUMNS = {
        'name': 'name',
        'desc': 'description',  # map frontend field to DB column
        'description': 'description',
        'github': 'github',
        'website': 'website',
        'thumb': 'thumb',
        'hackatime': 'hackatime'
    }
    
    async with db_pool.acquire() as conn:
        # First verify project ownership
        project_exists = await conn.fetchrow(
            "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
            project_id, current_user['id']
        )
        if not project_exists:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized access")
        
        # Get the update data
        update_data = update.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        # Handle 'desc' to 'description' mapping
        if "desc" in update_data:
            update_data["description"] = update_data.pop("desc") if update_data["desc"] else None
        
        # Convert empty strings to NULL for optional fields
        for field in ['github', 'website', 'thumb', 'hackatime']:
            if field in update_data and update_data[field] == "":
                update_data[field] = None

        update_parts = []
        values = []
        param_counter = 1
        
        for field_name, field_value in update_data.items():
            # Check if this field is allowed to be updated
            if field_name not in ALLOWED_UPDATE_COLUMNS:
                logger.warning(f"Attempted to update disallowed field: {field_name} by user {current_user['id']}")
                continue  # Skip disallowed fields instead of raising error (defense in depth)
            
            db_column = ALLOWED_UPDATE_COLUMNS[field_name]
            update_parts.append(f"{db_column} = ${param_counter}")
            values.append(field_value)
            param_counter += 1
        
        # Always update the timestamp
        update_parts.append(f"updated_at = CURRENT_TIMESTAMP")
        
        if not update_parts:
            # No valid fields to update
            raise HTTPException(status_code=400, detail="No valid fields provided for update")
        
        # Add the WHERE clause parameter
        values.append(project_id)
        
        # Build the query - column names are from whitelist, safe from injection
        query = f"""
            UPDATE projects 
            SET {', '.join(update_parts)} 
            WHERE id = ${param_counter}
            RETURNING id, name, description, github, website, thumb, hackatime
        """
        
        try:
            # Execute the query
            updated_project = await conn.fetchrow(query, *values)
            
            if not updated_project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Convert None values to empty strings for frontend consistency
            result = {
                "id": updated_project['id'],
                "name": updated_project['name'] or "",
                "desc": updated_project['description'] or "",
                "github": updated_project['github'] or "",
                "website": updated_project['website'] or "",
                "thumb": updated_project['thumb'] or "",
                "hackatime": updated_project['hackatime'] or ""
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating project {project_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to update project")
                
@app.post('/api/projects')
async def create_project(project: ProjectUpdate, current_user: Dict = Depends(get_current_user)):
    # raise HTTPException(status_code=400, detail="Project creation is currently disabled for all users.")
    if not project.name:
        raise HTTPException(status_code=400, detail="Project name is required")
    
    project_data = {
        "name": project.name,
        "desc": project.desc if project.desc else None,
        "github": project.github if project.github else None,
        "website": project.website if project.website else None,
        "thumb": project.thumb if project.thumb else "🛠️",
        "hackatime": project.hackatime if project.hackatime else None
    }

    project_id = str(uuid.uuid4())
    async with db_pool.acquire() as conn:
        try:
            await conn.execute("""
                INSERT INTO projects (
                    id, user_id, name, description, github, website, thumb, hackatime, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
            """, 
            project_id, 
            current_user['id'], 
            project_data["name"], 
            project_data["desc"],
            project_data["github"], 
            project_data["website"], 
            project_data["thumb"], 
            project_data["hackatime"])
            
            return {
                "id": project_id,
                "name": project_data["name"],
                "desc": project_data["desc"] or "",
                "github": project_data["github"] or "",
                "website": project_data["website"] or "",
                "thumb": project_data["thumb"],
                "hackatime": project_data["hackatime"] or "",
                "status": "draft"
            }
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post('/api/projects/submit')
async def submit_project(submit_data: ProjectSubmit, current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        project = await conn.fetchrow(
            "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
            submit_data.projectId, current_user['id']
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['status'] == 'submitted':
            raise HTTPException(status_code=400, detail="Project already submitted for review")
        
        await conn.execute("""
            UPDATE projects 
            SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
            WHERE id = $1
        """, submit_data.projectId)
        
        await conn.execute("""
            INSERT INTO dev_logs (user_id, project_id, title, time_spent, content, log_date)
            VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
        """, current_user['id'], submit_data.projectId, "Project Submitted for Review", 0, "This project has been submitted for review")
        
        # Build the webhook embed with ALL project info
        embed = {
            "title": "📋 PROJECT SUBMITTED FOR REVIEW",
            "color": 0xffa500,
            "fields": [
                {"name": "Project ID", "value": f"`{project['id']}`", "inline": False},
                {"name": "Project Name", "value": project['name'], "inline": True},
                {"name": "User", "value": current_user.get('name', 'Unknown'), "inline": True},
                {"name": "User ID", "value": f"`{current_user['id']}`", "inline": True},
                {"name": "Email", "value": current_user.get('email', 'N/A'), "inline": True},
                {"name": "Description", "value": project['description'][:300] + ("..." if len(project['description'] or '') > 300 else "") or "No description", "inline": False},
                {"name": "GitHub", "value": f"https://github.com/{project['github']}" if project['github'] else "Not provided", "inline": True},
                {"name": "Website", "value": project['website'] or "Not provided", "inline": True},
                {"name": "Hackatime", "value": project['hackatime'] or "Not provided", "inline": True},
                {"name": "Thumbnail", "value": project['thumb'] or "🛠️", "inline": True},
                {"name": "Created At", "value": project['created_at'].strftime("%Y-%m-%d %H:%M UTC") if project['created_at'] else "Unknown", "inline": True}
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "HackaHome Review System"}
        }
        await send_discord_webhook(embed)
        
        return {
            "message": "Project submitted for review",
            "projectId": submit_data.projectId,
            "status": "submitted"
        }
    
@app.post('/api/devlogs')
async def create_devlog(log: DevLogCreate, current_user: Dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        project = await conn.fetchrow(
            "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
            log.projectId, current_user['id']
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        result = await conn.fetchrow("""
            INSERT INTO dev_logs (user_id, project_id, title, time_spent, content, log_date)
            VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
            RETURNING id
        """, current_user['id'], log.projectId, log.title, log.timeSpent, log.content)
        
        embed = {
            "title": "📝 New Dev Log Entry",
            "color": 0x3498db,
            "fields": [
                {"name": "User", "value": current_user.get('name', 'Unknown'), "inline": True},
                {"name": "Project", "value": project['name'], "inline": True},
                {"name": "Title", "value": log.title, "inline": True},
                {"name": "Time Spent", "value": f"{log.timeSpent} hours", "inline": True},
                {"name": "Content", "value": log.content[:500] + ("..." if len(log.content) > 500 else ""), "inline": False}
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        await send_discord_webhook(embed)
        
        return {
            "id": result['id'],
            "projectId": log.projectId,
            "title": log.title,
            "timeSpent": log.timeSpent,
            "date": datetime.now().strftime("%-m/%-d/%Y"),
            "content": log.content
        }

@app.get('/api/transactions')
async def get_transactions(limit: int = 50, current_user: Dict = Depends(get_current_user)):
    limit = min(max(1, limit), 100)
    
    async with db_pool.acquire() as conn:
        transactions = await conn.fetch("""
            SELECT id, type, amount, balance_before, balance_after, description, created_at
            FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
        """, current_user['id'], limit)
        return [dict(t) for t in transactions]

# ============ ADMIN ENDPOINTS ============

@app.get('/api/admin/users')
async def admin_get_users(
    page: int = 1, 
    limit: int = 20,
    search: Optional[str] = None,
    current_user: Dict = Depends(get_current_admin)
):
    """Get all users with pagination and search"""
    offset = (page - 1) * limit
    limit = min(max(1, limit), 100)
    
    async with db_pool.acquire() as conn:
        # Build query with optional search
        where_clause = ""
        params = []
        param_count = 1
        
        if search:
            where_clause = f"WHERE name ILIKE ${param_count} OR email ILIKE ${param_count} OR slack_id ILIKE ${param_count}"
            params.append(f"%{search}%")
            param_count += 1
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM users {where_clause}"
        total = await conn.fetchval(count_query, *params)
        
        # Get paginated users
        query = f"""
            SELECT id, name, balance, slack_id, email, verification_status, 
                   avatar, created_at, updated_at
            FROM users 
            {where_clause}
            ORDER BY created_at DESC 
            LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        params.extend([limit, offset])
        
        users = await conn.fetch(query, *params)
        
        return {
            "users": [dict(u) for u in users],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

@app.get('/api/admin/users/{user_id}/projects')
async def admin_get_user_projects(
    user_id: str,
    current_user: Dict = Depends(get_current_admin)
):
    """Get all projects for a specific user"""
    async with db_pool.acquire() as conn:
        # Check if user exists
        user = await conn.fetchrow(
            "SELECT id, name, email, slack_id, balance FROM users WHERE id = $1",
            user_id
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's projects
        projects = await conn.fetch("""
            SELECT id, name, description, github, website, thumb, hackatime, 
                   status, submitted_at, created_at, updated_at
            FROM projects 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        """, user_id)
        
        return {
            "user": dict(user),
            "projects": [dict(p) for p in projects]
        }

@app.post('/api/admin/projects/review')
async def admin_review_project(
    review: AdminProjectReview,
    current_user: Dict = Depends(get_current_admin)
):
    """Approve or request revision for a project"""
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            # Get project details
            project = await conn.fetchrow("""
                SELECT p.*, u.id as user_id, u.name as user_name, u.email, u.balance, u.slack_id
                FROM projects p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = $1
            """, review.projectId)
            
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            if project['status'] != 'submitted':
                raise HTTPException(
                    status_code=400, 
                    detail=f"Project status is '{project['status']}', expected 'submitted'"
                )
            
            if review.action == "approve":
                # Update project status
                await conn.execute("""
                    UPDATE projects 
                    SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                """, review.projectId)
                
                # Add reward balance if specified
                reward_amount = review.rewardAmount or 0
                old_balance = float(project['balance'])
                new_balance = old_balance + reward_amount
                
                if reward_amount > 0:
                    await conn.execute("""
                        UPDATE users 
                        SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    """, reward_amount, project['user_id'])
                    
                    # Log transaction
                    await log_transaction(
                        conn,
                        project['user_id'],
                        'reward',
                        reward_amount,
                        old_balance,
                        new_balance,
                        f"Project approval reward for: {project['name']}"
                    )
                
                # Add admin dev log
                admin_note = f"✅ PROJECT APPROVED\n\n"
                admin_note += f"Reward: ${reward_amount:.2f}\n"
                if review.reviewerNotes:
                    admin_note += f"\nReviewer notes: {review.reviewerNotes}"
                
                await conn.execute("""
                    INSERT INTO dev_logs (user_id, project_id, title, time_spent, content, log_date)
                    VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                """, project['user_id'], review.projectId, "Project Approved", 0, admin_note)
                
                # Send Discord notification
                embed = {
                    "title": "✅ PROJECT APPROVED",
                    "color": 0x00ff00,
                    "fields": [
                        {"name": "Project", "value": project['name'], "inline": True},
                        {"name": "User", "value": project['user_name'], "inline": True},
                        {"name": "Reward", "value": f"${reward_amount:.2f}", "inline": True},
                        {"name": "Reviewed By", "value": current_user.get('name', 'Admin'), "inline": True}
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                if review.reviewerNotes:
                    embed["fields"].append({
                        "name": "Reviewer Notes", 
                        "value": review.reviewerNotes[:500], 
                        "inline": False
                    })
                
                await send_discord_webhook(embed)
                
                return {
                    "message": "Project approved successfully",
                    "projectId": review.projectId,
                    "rewardAmount": reward_amount,
                    "newBalance": new_balance
                }
                
            elif review.action == "revision":
                # Update project status back to draft
                await conn.execute("""
                    UPDATE projects 
                    SET status = 'draft', updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                """, review.projectId)
                
                # Add admin dev log with revision notes
                revision_note = f"🔄 REVISION REQUESTED\n\n"
                revision_note += f"Changes requested by reviewer:\n{review.reviewerNotes or 'No specific notes provided'}\n\n"
                revision_note += f"Please make the requested changes and resubmit your project."
                
                await conn.execute("""
                    INSERT INTO dev_logs (user_id, project_id, title, time_spent, content, log_date)
                    VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                """, project['user_id'], review.projectId, "Revision Requested", 0, revision_note)
                
                # Send Discord notification
                embed = {
                    "title": "🔄 REVISION REQUESTED",
                    "color": 0xffa500,
                    "fields": [
                        {"name": "Project", "value": project['name'], "inline": True},
                        {"name": "User", "value": project['user_name'], "inline": True},
                        {"name": "Reviewed By", "value": current_user.get('name', 'Admin'), "inline": True},
                        {"name": "Changes Requested", "value": review.reviewerNotes or "No specific notes provided", "inline": False}
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                await send_discord_webhook(embed)
                
                return {
                    "message": "Revision requested for project",
                    "projectId": review.projectId,
                    "status": "draft"
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'revision'")

@app.get('/api/admin/stats')
async def admin_get_stats(current_user: Dict = Depends(get_current_admin)):
    """Get admin dashboard statistics"""
    async with db_pool.acquire() as conn:
        # Get various stats
        stats = await conn.fetchrow("""
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM projects) as total_projects,
                (SELECT COUNT(*) FROM projects WHERE status = 'submitted') as pending_reviews,
                (SELECT COUNT(*) FROM projects WHERE status = 'approved') as approved_projects,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'reward') as total_rewards_paid,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders) as total_shop_revenue,
                (SELECT COUNT(*) FROM dev_logs) as total_dev_logs
        """)
        
        # Get recent submissions
        recent_submissions = await conn.fetch("""
            SELECT p.id, p.name, p.status, p.submitted_at, u.name as user_name, u.id as user_id
            FROM projects p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'submitted'
            ORDER BY p.submitted_at DESC
            LIMIT 10
        """)
        
        return {
            "stats": dict(stats),
            "recent_submissions": [dict(s) for s in recent_submissions]
        }

@app.get('/api/admin/pending-reviews')
async def admin_get_pending_reviews(
    page: int = 1,
    limit: int = 10,
    current_user: Dict = Depends(get_current_admin)
):
    """Get all projects pending review with pagination"""
    offset = (page - 1) * limit
    limit = min(max(1, limit), 50)
    
    async with db_pool.acquire() as conn:
        # Get total count
        total = await conn.fetchval("""
            SELECT COUNT(*) FROM projects WHERE status = 'submitted'
        """)
        
        # Get pending projects with user info
        projects = await conn.fetch("""
            SELECT p.*, u.name as user_name, u.email, u.slack_id
            FROM projects p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'submitted'
            ORDER BY p.submitted_at ASC
            LIMIT $1 OFFSET $2
        """, limit, offset)
        
        return {
            "projects": [dict(p) for p in projects],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

@app.get('/api/admin/users/{user_id}/devlogs')
async def admin_get_user_devlogs(
    user_id: str,
    project_id: Optional[str] = None,
    limit: int = 50,
    current_user: Dict = Depends(get_current_admin)
):
    limit = min(max(1, limit), 200)
    
    async with db_pool.acquire() as conn:
        # Check if user exists
        user = await conn.fetchrow(
            "SELECT id, name, email FROM users WHERE id = $1",
            user_id
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build query
        if project_id:
            # Verify project belongs to user
            project = await conn.fetchrow(
                "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
                project_id, user_id
            )
            if not project:
                raise HTTPException(status_code=404, detail="Project not found or doesn't belong to user")
            
            devlogs = await conn.fetch("""
                SELECT dl.*, p.name as project_name
                FROM dev_logs dl
                JOIN projects p ON dl.project_id = p.id
                WHERE dl.user_id = $1 AND dl.project_id = $2
                ORDER BY dl.created_at DESC
                LIMIT $3
            """, user_id, project_id, limit)
        else:
            devlogs = await conn.fetch("""
                SELECT dl.*, p.name as project_name
                FROM dev_logs dl
                JOIN projects p ON dl.project_id = p.id
                WHERE dl.user_id = $1
                ORDER BY dl.created_at DESC
                LIMIT $2
            """, user_id, limit)
        
        return {
            "user": dict(user),
            "devlogs": [dict(d) for d in devlogs],
            "count": len(devlogs)
        }

# ============ CDN ENDPOINTS ============

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount the static directory so images are accessible via URL
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...), 
    current_user: Dict = Depends(get_current_user)
):
    # 1. Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 2. Create a unique filename
    file_extension = Path(file.filename).suffix
    if not file_extension:
        file_extension = ".png" # fallback
        
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    try:
        # 3. Save the file to disk
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Could not save file")

    return {"name": unique_filename}


# ============ OTHER ENDPOINTS ============

@app.get('/health')
async def health():
    try:
        async with db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy"}

dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

@app.get("/favicon.svg")
async def favicon():
    return FileResponse("dist/favicon.svg")

@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
