from flask import Flask, request, Response, jsonify, g
from flask_cors import CORS
from urllib.parse import unquote, quote
import requests
import subprocess
import mimetypes
import io
import sqlite3
import os
from werkzeug.utils import secure_filename
import magic
from threading import Lock
import threading
from functools import lru_cache, wraps
import time
import hashlib
import uuid
from datetime import datetime, timedelta
import csv
import json
import shutil
from html.parser import HTMLParser
import jwt
from supabase import create_client, Client

app = Flask(__name__)
CORS(app)

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'your-supabase-url')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'your-service-key')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', 'your-jwt-secret')

# Initialize Supabase client with service key for admin operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Fix SQLite datetime warnings
sqlite3.register_adapter(datetime, lambda dt: dt.isoformat())
sqlite3.register_converter("datetime", lambda s: datetime.fromisoformat(s.decode()))

# ---------- Gateway Configuration ----------
GATEWAYS = {
    'ipfs_io': "https://ipfs.io/ipfs/",
    'cloudflare': "https://cloudflare-ipfs.com/ipfs/",
    'pinata': "https://gateway.pinata.cloud/ipfs/",
    'local': "http://13.60.17.161:8080/ipfs/"
}

CURRENT_GATEWAY = GATEWAYS['ipfs_io']
FALLBACK_GATEWAYS = [
    GATEWAYS['cloudflare'],
    GATEWAYS['pinata'],
    GATEWAYS['local']
]

# ---------- Database Setup ----------
db_lock = Lock()
local_data = threading.local()

def get_db_connection():
    """Get thread-local database connection"""
    if not hasattr(local_data, 'connection'):
        local_data.connection = sqlite3.connect('users.db', check_same_thread=False)
        local_data.connection.execute('PRAGMA journal_mode=WAL')
        local_data.connection.execute('PRAGMA synchronous=NORMAL')
        local_data.connection.execute('PRAGMA cache_size=10000')
        local_data.connection.execute('PRAGMA temp_store=MEMORY')
    return local_data.connection

# ---------- Authentication Middleware ----------
def verify_jwt_token(token):
    """Verify JWT token and return user info"""
    try:
        # Decode JWT token using Supabase JWT secret
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator to require authentication for endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        try:
            # Extract token from "Bearer <token>" format
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Store user info in g for use in the endpoint
        g.user_id = payload.get('sub')  # Supabase user ID
        g.user_email = payload.get('email')
        g.token = token
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_current_user():
    """Get current authenticated user info"""
    return {
        'id': getattr(g, 'user_id', None),
        'email': getattr(g, 'user_email', None)
    }

# ---------- Enhanced Session for HTTP Requests ----------
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(
    pool_connections=20,
    pool_maxsize=50,
    max_retries=5
)
session.mount('http://', adapter)
session.mount('https://', adapter)

session.headers.update({
    'User-Agent': 'IPFS-Gateway-Client/1.0',
    'Accept': '*/*',
    'Connection': 'keep-alive'
})

# ---------- Gateway Helper Functions ----------
def try_multiple_gateways(cid, operation='get', **kwargs):
    """Try multiple gateways with ipfs.io priority"""
    gateways_to_try = [CURRENT_GATEWAY] + FALLBACK_GATEWAYS
    
    for gateway in gateways_to_try:
        try:
            url = gateway + cid
            
            if operation == 'head':
                response = session.head(url, timeout=60, allow_redirects=True, **kwargs)
            elif operation == 'get':
                response = session.get(url, timeout=90, allow_redirects=True, **kwargs)
            elif operation == 'stream':
                response = session.get(url, stream=True, timeout=120, allow_redirects=True, **kwargs)
            
            if response.status_code == 200:
                return response, gateway
                
        except Exception as e:
            print(f"Gateway {gateway} failed: {str(e)}")
            continue
    
    raise Exception("All gateways failed")

# ---------- Analytics Helper Functions ----------
def get_client_info(request):
    """Extract client information for analytics"""
    real_ip = (
        request.headers.get('X-Forwarded-For', '').split(',')[0].strip() or
        request.headers.get('X-Real-IP', '') or
        request.remote_addr
    )
    
    return {
        'ip_address': real_ip,
        'user_agent': request.headers.get('User-Agent', 'Unknown'),
        'referrer': request.headers.get('Referer', 'Direct'),
        'session_id': request.headers.get('X-Session-ID', str(uuid.uuid4())[:8])
    }

def track_view(cid, request, user_id=None, gateway_used=None):
    """Track a view event - ONLY for uploaded CIDs by the user"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Only track views for user's own uploads
        if user_id:
            c.execute("SELECT 1 FROM uploads WHERE cid = ? AND user_id = ? LIMIT 1", (cid, user_id))
            if not c.fetchone():
                return
            
            client_info = get_client_info(request)
            
            c.execute("""
                INSERT INTO analytics_views 
                (cid, user_id, ip_address, user_agent, referrer, gateway_used, session_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cid, user_id, client_info['ip_address'], client_info['user_agent'], 
                  client_info['referrer'], gateway_used, client_info['session_id']))
            
            conn.commit()
    except Exception as e:
        print(f"Analytics tracking error: {e}")

def track_download(cid, request, user_id=None, gateway_used=None, file_size=0, completed=True):
    """Track a download event - ONLY for uploaded CIDs by the user"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Only track downloads for user's own uploads
        if user_id:
            c.execute("SELECT 1 FROM uploads WHERE cid = ? AND user_id = ? LIMIT 1", (cid, user_id))
            if not c.fetchone():
                return
            
            client_info = get_client_info(request)
            
            c.execute("""
                INSERT INTO analytics_downloads 
                (cid, user_id, ip_address, user_agent, referrer, gateway_used, file_size, download_completed, session_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cid, user_id, client_info['ip_address'], client_info['user_agent'], 
                  client_info['referrer'], gateway_used, file_size, completed, client_info['session_id']))
            
            conn.commit()
    except Exception as e:
        print(f"Download tracking error: {e}")

# ---------- Database Initialization ----------
def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    
    # Create CID history table with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS cid_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create bookmarks table with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            type TEXT,
            size INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cid, user_id)
        )
    ''')
    
    # Create uploads table with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            fileName TEXT NOT NULL,
            fileSize INTEGER DEFAULT 0,
            fileType TEXT,
            visibility TEXT DEFAULT 'public',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cid, user_id)
        )
    ''')
    
    # Analytics tables with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS analytics_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            referrer TEXT,
            gateway_used TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS analytics_downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            referrer TEXT,
            gateway_used TEXT,
            file_size INTEGER DEFAULT 0,
            download_completed BOOLEAN DEFAULT TRUE,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id TEXT
        )
    ''')
    
    # Groups tables with user_id
    c.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(name, user_id)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS group_cids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            cid TEXT NOT NULL,
            user_id TEXT NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (group_id, cid),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
    ''')
    
    # Create indexes for better query performance
    c.execute('CREATE INDEX IF NOT EXISTS idx_history_user_cid ON cid_history(user_id, cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_history_timestamp ON cid_history(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_bookmarks_user_cid ON bookmarks(user_id, cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_bookmarks_timestamp ON bookmarks(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_uploads_user_cid ON uploads(user_id, cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_uploads_timestamp ON uploads(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_views_user_cid ON analytics_views(user_id, cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_downloads_user_cid ON analytics_downloads(user_id, cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_group_cids_user_id ON group_cids(user_id)')
    
    # Enable WAL mode for better concurrency
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA synchronous=NORMAL')
    c.execute('PRAGMA cache_size=10000')
    
    conn.commit()
    conn.close()

init_db()

# ---------- Authentication Routes ----------
@app.route("/auth/user", methods=["GET"])
@require_auth
def get_user_profile():
    """Get current user profile"""
    user = get_current_user()
    return jsonify({
        "id": user['id'],
        "email": user['email']
    }), 200

# ---------- History Operations (User-Specific) ----------
@app.route("/history", methods=["POST"])
@require_auth
def save_history():
    data = request.json
    cid = data.get("cid")
    user_id = g.user_id
    
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT OR IGNORE INTO cid_history (cid, user_id) VALUES (?, ?)", (cid, user_id))
        conn.commit()
        return jsonify({"message": "CID saved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["GET"])
@require_auth
def get_history():
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, timestamp FROM cid_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50", (user_id,))
        rows = c.fetchall()
        return jsonify([{"cid": row[0], "timestamp": row[1]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["DELETE"])
@require_auth
def delete_history_entry():
    data = request.get_json()
    cid = data.get("cid")
    user_id = g.user_id

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cid_history WHERE cid = ? AND user_id = ?", (cid, user_id))
        conn.commit()
        return jsonify({"message": f"CID {cid} deleted from history"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Bookmark Operations (User-Specific) ----------
@app.route("/bookmarks", methods=["POST"])
@require_auth
def add_bookmark():
    data = request.json
    cid = data.get("cid")
    title = data.get("title", f"Content {cid[:8]}..." if cid else "Untitled")
    content_type = data.get("type", "unknown")
    size = data.get("size", 0)
    user_id = g.user_id
    
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute(
            "INSERT OR REPLACE INTO bookmarks (cid, user_id, title, type, size) VALUES (?, ?, ?, ?, ?)",
            (cid, user_id, title, content_type, size)
        )
        conn.commit()
        return jsonify({"message": "Bookmark added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/bookmarks", methods=["GET"])
@require_auth
def get_bookmarks():
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, title, type, size, timestamp FROM bookmarks WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
        rows = c.fetchall()
        
        bookmarks = []
        for row in rows:
            bookmarks.append({
                "cid": row[0],
                "title": row[1],
                "type": row[2],
                "size": row[3],
                "size_human": format_size(row[3]) if isinstance(row[3], (int, float)) and row[3] > 0 else "0 B",
                "timestamp": row[4]
            })
        
        return jsonify(bookmarks), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/bookmarks", methods=["DELETE"])
@require_auth
def delete_bookmark():
    data = request.get_json()
    cid = data.get("cid")
    user_id = g.user_id

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM bookmarks WHERE cid = ? AND user_id = ?", (cid, user_id))
        if cursor.rowcount == 0:
            return jsonify({"error": "Bookmark not found"}), 404
        conn.commit()
        return jsonify({"message": f"Bookmark {cid} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/bookmarks/check/<cid>", methods=["GET"])
@require_auth
def check_bookmark(cid):
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT 1 FROM bookmarks WHERE cid = ? AND user_id = ? LIMIT 1", (cid, user_id))
        exists = c.fetchone() is not None
        return jsonify({"bookmarked": exists}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Upload Operations (User-Specific) ----------
@app.route("/uploads", methods=["POST"])
@require_auth
def save_upload():
    data = request.json
    cid = data.get("cid")
    fileName = data.get("fileName", "Untitled")
    fileSize = data.get("fileSize", 0)
    fileType = data.get("fileType", "unknown")
    visibility = data.get("visibility", "public")
    timestamp = data.get("timestamp")
    user_id = g.user_id
    
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        if timestamp:
            c.execute(
                "INSERT OR REPLACE INTO uploads (cid, user_id, fileName, fileSize, fileType, visibility, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (cid, user_id, fileName, fileSize, fileType, visibility, timestamp)
            )
        else:
            c.execute(
                "INSERT OR REPLACE INTO uploads (cid, user_id, fileName, fileSize, fileType, visibility) VALUES (?, ?, ?, ?, ?, ?)",
                (cid, user_id, fileName, fileSize, fileType, visibility)
            )
        
        conn.commit()
        return jsonify({"message": "Upload saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/uploads", methods=["GET"])
@require_auth
def get_uploads():
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, fileName, fileSize, fileType, visibility, timestamp FROM uploads WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
        rows = c.fetchall()
        
        uploads = []
        for row in rows:
            uploads.append({
                "cid": row[0],
                "fileName": row[1],
                "fileSize": row[2],
                "fileType": row[3],
                "visibility": row[4],
                "timestamp": row[5],
                "size_human": format_size(row[2]) if isinstance(row[2], (int, float)) and row[2] > 0 else "0 B"
            })
        
        return jsonify(uploads), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/uploads", methods=["DELETE"])
@require_auth
def delete_upload():
    data = request.get_json()
    cid = data.get("cid")
    user_id = g.user_id

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM uploads WHERE cid = ? AND user_id = ?", (cid, user_id))
        if cursor.rowcount == 0:
            return jsonify({"error": "Upload not found"}), 404
        conn.commit()
        return jsonify({"message": f"Upload {cid} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Group Operations (User-Specific) ----------
@app.route("/groups", methods=["POST"])
@require_auth
def create_group():
    """Create a new group with custom name"""
    data = request.json
    name = data.get("name")
    user_id = g.user_id
    
    if not name or not name.strip():
        return jsonify({"error": "Group name is required"}), 400
    
    name = name.strip()
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id FROM groups WHERE name = ? AND user_id = ?", (name, user_id))
        if c.fetchone():
            return jsonify({"error": "Group name already exists"}), 409
        
        now = datetime.now().isoformat()
        c.execute("INSERT INTO groups (name, user_id, created_at) VALUES (?, ?, ?)", (name, user_id, now))
        group_id = c.lastrowid
        conn.commit()
        
        return jsonify({
            "id": group_id,
            "name": name,
            "created_at": now,
            "message": "Group created successfully"
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups", methods=["GET"])
@require_auth
def get_groups():
    """Get all groups with their CIDs for the current user"""
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id, name, created_at FROM groups WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        groups = c.fetchall()
        
        result = []
        for group in groups:
            group_id, group_name, created_at = group
            
            c.execute("""
                SELECT gc.cid, gc.added_at, u.fileName, u.fileSize, u.fileType 
                FROM group_cids gc
                LEFT JOIN uploads u ON gc.cid = u.cid AND u.user_id = ?
                WHERE gc.group_id = ? AND gc.user_id = ?
                ORDER BY gc.added_at DESC
            """, (user_id, group_id, user_id))
            cids_data = c.fetchall()
            
            cids = []
            for cid_row in cids_data:
                file_size = cid_row[3] if cid_row[3] is not None else 0
                cids.append({
                    "cid": cid_row[0],
                    "added_at": cid_row[1],
                    "fileName": cid_row[2] if cid_row[2] else f"File_{cid_row[0][:8]}",
                    "fileSize": file_size,
                    "fileType": cid_row[4] if cid_row[4] else "unknown",
                    "size_human": format_size(file_size) if isinstance(file_size, (int, float)) and file_size > 0 else "0 B"
                })
            
            result.append({
                "id": group_id,
                "name": group_name,
                "created_at": created_at,
                "cids": cids,
                "cid_count": len(cids)
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups/<int:group_id>/add", methods=["POST"])
@require_auth
def add_cid_to_group(group_id):
    """Add CID to a group"""
    data = request.json
    cid = data.get("cid")
    user_id = g.user_id
    
    if not cid:
        return jsonify({"error": "CID is required"}), 400
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verify group belongs to user
        c.execute("SELECT name FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("SELECT 1 FROM group_cids WHERE group_id = ? AND cid = ?", (group_id, cid))
        if c.fetchone():
            return jsonify({"error": "CID already exists in this group"}), 409
        
        now = datetime.now().isoformat()
        c.execute("INSERT INTO group_cids (group_id, cid, user_id, added_at) VALUES (?, ?, ?, ?)", 
                  (group_id, cid, user_id, now))
        conn.commit()
        
        return jsonify({
            "message": f"CID added to group '{group[0]}' successfully",
            "group_id": group_id,
            "cid": cid,
            "added_at": now
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups/<int:group_id>/remove", methods=["POST"])
@require_auth
def remove_cid_from_group(group_id):
    """Remove CID from a group"""
    data = request.json
    cid = data.get("cid")
    user_id = g.user_id
    
    if not cid:
        return jsonify({"error": "CID is required"}), 400
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verify group belongs to user
        c.execute("SELECT name FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("DELETE FROM group_cids WHERE group_id = ? AND cid = ? AND user_id = ?", (group_id, cid, user_id))
        if c.rowcount == 0:
            return jsonify({"error": "CID not found in this group"}), 404
        
        conn.commit()
        
        return jsonify({
            "message": f"CID removed from group '{group[0]}' successfully",
            "group_id": group_id,
            "cid": cid
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups/<int:group_id>", methods=["DELETE"])
@require_auth
def delete_group(group_id):
    """Delete a group and all its CID associations"""
    user_id = g.user_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verify group belongs to user
        c.execute("SELECT name FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("DELETE FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        conn.commit()
        
        return jsonify({
            "message": f"Group '{group[0]}' deleted successfully",
            "group_id": group_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Utility Functions ----------
def format_size(size_bytes):
    """Format file size"""
    if size_bytes == 0: return "0 B"
    elif size_bytes < 1024: return f"{size_bytes} B"
    elif size_bytes < 1048576: return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1073741824: return f"{size_bytes / 1048576:.1f} MB"
    else: return f"{size_bytes / 1073741824:.1f} GB"

def get_file_preview_info(filename, content_type=None):
    """Get preview information for a file"""
    file_ext = os.path.splitext(filename)[1].lower()
    
    # Define previewable file types
    image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'}
    video_exts = {'.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'}
    audio_exts = {'.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'}
    document_exts = {'.pdf', '.txt', '.md', '.html', '.htm', '.xml', '.json', '.csv'}
    code_exts = {'.js', '.py', '.java', '.cpp', '.c', '.css', '.php', '.rb', '.go', '.rs', '.ts'}
    
    preview_type = "download"  # default
    icon_class = "file"
    
    if file_ext in image_exts or (content_type and content_type.startswith('image/')):
        preview_type = "image"
        icon_class = "image"
    elif file_ext in video_exts or (content_type and content_type.startswith('video/')):
        preview_type = "video"
        icon_class = "video"
    elif file_ext in audio_exts or (content_type and content_type.startswith('audio/')):
        preview_type = "audio"
        icon_class = "audio"
    elif file_ext == '.pdf' or content_type == 'application/pdf':
        preview_type = "pdf"
        icon_class = "pdf"
    elif file_ext in document_exts or (content_type and content_type.startswith('text/')):
        preview_type = "text"
        icon_class = "document"
    elif file_ext in code_exts:
        preview_type = "code"
        icon_class = "code"
    
    return {
        "preview_type": preview_type,
        "icon_class": icon_class,
        "extension": file_ext,
        "can_preview": preview_type != "download"
    }

# ---------- File Upload Endpoints ----------
@app.route('/upload', methods=['POST'])
@require_auth
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    visibility = request.form.get('visibility', 'public')
    user_id = g.user_id

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    UPLOAD_BASE_FOLDER = os.path.join(os.getcwd(), 'uploads')
    UPLOAD_FOLDER = os.path.join(UPLOAD_BASE_FOLDER, visibility)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        ipfs_env = os.environ.copy()

        if visibility == 'private':
            ipfs_env["IPFS_PATH"] = os.path.expanduser("~/.ipfs-private")
            result = subprocess.run(
                ["ipfs", "--offline", "add", "-Q", filepath],
                env=ipfs_env,
                capture_output=True,
                text=True,
                check=True,
                timeout=180
            )
        else:
            ipfs_env["IPFS_PATH"] = os.path.expanduser("~/.ipfs")
            result = subprocess.run(
                ["ipfs", "add", "-Q", filepath],
                env=ipfs_env,
                capture_output=True,
                text=True,
                check=True,
                timeout=180
            )
            cid = result.stdout.strip()
            threading.Thread(target=lambda: subprocess.run(
                ["ipfs", "dht", "provide", cid],
                env=ipfs_env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=300
            ), daemon=True).start()

        cid = result.stdout.strip()
        
        # Save upload to database with user_id
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(
            "INSERT OR REPLACE INTO uploads (cid, user_id, fileName, fileSize, fileType, visibility) VALUES (?, ?, ?, ?, ?, ?)",
            (cid, user_id, filename, file.size, file.content_type or 'unknown', visibility)
        )
        conn.commit()
        
        try:
            os.remove(filepath)
        except:
            pass

        return jsonify({
            'message': 'File uploaded and added to IPFS',
            'cid': cid,
            'visibility': visibility
        }), 200

    except subprocess.CalledProcessError as e:
        return jsonify({'error': 'Failed to add to IPFS', 'details': e.stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Upload timeout - file too large or network slow. Please try again.'}), 408

# ---------- Content Fetching Routes ----------
@app.route("/fetch/<cid>", methods=["GET"])
def fetch_cid_content(cid):
    try:
        decoded_cid = unquote(cid.strip("/"))
        
        head_res, used_gateway = try_multiple_gateways(decoded_cid, 'head')
        
        # Track view if user is authenticated
        user_id = getattr(g, 'user_id', None)
        if user_id:
            track_view(decoded_cid, request, user_id, used_gateway)
        
        content_type = head_res.headers.get("Content-Type", "")
        
        text = None
        if content_type.startswith("text/"):
            try:
                file_res, _ = try_multiple_gateways(decoded_cid, 'get')
                text = file_res.content.decode("utf-8", errors="replace")
            except Exception as e:
                print(f"Failed to get text content: {e}")

        return jsonify({
            "cid": decoded_cid,
            "type": content_type,
            "text": text,
            "gateway_used": used_gateway
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/preview", methods=["GET"])
def preview_content():
    """Serve content for inline preview (no download headers)"""
    cid = request.args.get("cid")
    
    if not cid:
        return "Missing CID", 400

    try:
        cid = cid.strip("/")
        decoded_cid = unquote(cid)
        
        # Use multiple gateways with streaming
        r, used_gateway = try_multiple_gateways(decoded_cid, 'stream')

        if r.status_code != 200:
            return f"Error fetching content: {r.status_code}", 404

        content_type = r.headers.get("Content-Type", "application/octet-stream")
        content_length = r.headers.get("Content-Length", 0)
        
        # Track the view if user is authenticated
        user_id = getattr(g, 'user_id', None)
        if user_id:
            track_view(decoded_cid, request, user_id, used_gateway)
        
        def generate():
            try:
                for chunk in r.iter_content(chunk_size=8192):
                    yield chunk
            except Exception as e:
                yield f"Stream error: {str(e)}".encode()

        return Response(
            generate(),
            content_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "X-Gateway-Used": used_gateway,
                "X-Content-Length": str(content_length)
            }
        )

    except Exception as e:
        return f"Server error: {str(e)}", 500

# ---------- Public Routes (No Auth Required) ----------
@app.route("/trending", methods=["GET"])
def get_trending():
    """Get trending content (public)"""
    trending_cids = [
        {"cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"}, 
        {"cid": "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX"},
        {"cid": "QmUCF47VHN8PfUVjYfeL2MWUaeKN2twrQSfi8i4Shcu8dz"}
    ]
    return jsonify(trending_cids)

@app.route("/gateway", methods=["GET"])
def get_current_gateway():
    """Get current gateway info (public)"""
    current_name = next((k for k, v in GATEWAYS.items() if v == CURRENT_GATEWAY), "custom")
    return jsonify({
        "current_gateway": current_name, 
        "url": CURRENT_GATEWAY,
        "available_gateways": GATEWAYS
    })

# ---------- Error Handlers ----------
@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "Authentication required"}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "Access forbidden"}), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
