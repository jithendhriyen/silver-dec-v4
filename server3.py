from flask import Flask, request, Response, jsonify
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
from functools import lru_cache
import time
import hashlib
import uuid
from datetime import datetime, timedelta
import csv
import json
import shutil
from html.parser import HTMLParser

app = Flask(__name__)
CORS(app)

# Fix SQLite datetime warnings
sqlite3.register_adapter(datetime, lambda dt: dt.isoformat())
sqlite3.register_converter("datetime", lambda s: datetime.fromisoformat(s.decode()))

# ---------- Gateway Configuration with ipfs.io Priority ----------
GATEWAYS = {
    'ipfs_io': "https://ipfs.io/ipfs/",
    'cloudflare': "https://cloudflare-ipfs.com/ipfs/",
    'pinata': "https://gateway.pinata.cloud/ipfs/",
    'local': "http://127.0.0.1:8080/ipfs/"
}

# Primary gateway (ipfs.io gets priority)
CURRENT_GATEWAY = GATEWAYS['ipfs_io']

# Fallback gateways in order of preference
FALLBACK_GATEWAYS = [
    GATEWAYS['cloudflare'],
    GATEWAYS['pinata'],
    GATEWAYS['local']
]

# ---------- Performance Optimizations ----------
# Database connection pool
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

# Cache for metadata with longer TTL for external gateways
@lru_cache(maxsize=1000)
def cached_metadata_lookup(cid):
    """Cache metadata lookups to avoid repeated IPFS calls"""
    return _get_metadata_internal(cid)

# Enhanced session for HTTP requests
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
def get_gateway_url():
    """Get current primary gateway URL"""
    return CURRENT_GATEWAY

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

def classify_traffic_source(referrer, user_agent):
    """Classify traffic source type"""
    if not referrer or referrer == 'Direct':
        return 'direct', None
    elif 'google' in referrer.lower() or 'bing' in referrer.lower() or 'yahoo' in referrer.lower():
        return 'search', referrer
    elif 'ipfs.io' in referrer or 'gateway' in referrer:
        return 'gateway', referrer
    else:
        return 'referral', referrer

def track_view(cid, request, gateway_used=None):
    """Track a view event - ONLY for uploaded CIDs"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT 1 FROM uploads WHERE cid = ? LIMIT 1", (cid,))
        if not c.fetchone():
            return
            
        client_info = get_client_info(request)
        source_type, source_value = classify_traffic_source(client_info['referrer'], client_info['user_agent'])
        
        c.execute("""
            INSERT INTO analytics_views 
            (cid, ip_address, user_agent, referrer, gateway_used, session_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, (cid, client_info['ip_address'], client_info['user_agent'], 
              client_info['referrer'], gateway_used, client_info['session_id']))
        
        c.execute("""
            INSERT INTO analytics_traffic_sources 
            (cid, source_type, source_value, ip_address) 
            VALUES (?, ?, ?, ?)
        """, (cid, source_type, source_value, client_info['ip_address']))
        
        conn.commit()
    except Exception as e:
        print(f"Analytics tracking error: {e}")

def track_download(cid, request, gateway_used=None, file_size=0, completed=True):
    """Track a download event - ONLY for uploaded CIDs"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT 1 FROM uploads WHERE cid = ? LIMIT 1", (cid,))
        if not c.fetchone():
            return
            
        client_info = get_client_info(request)
        
        c.execute("""
            INSERT INTO analytics_downloads 
            (cid, ip_address, user_agent, referrer, gateway_used, file_size, download_completed, session_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cid, client_info['ip_address'], client_info['user_agent'], 
              client_info['referrer'], gateway_used, file_size, completed, client_info['session_id']))
        
        conn.commit()
    except Exception as e:
        print(f"Download tracking error: {e}")

# ---------- File Type Detection Helper Functions ----------
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

def parse_ipfs_ls_output(ls_output, parent_cid):
    """Parse IPFS ls command output"""
    entries = []
    for line in ls_output.strip().split("\n"):
        if line:
            parts = line.split(None, 2)
            if len(parts) >= 3:
                size, hash_cid, name = parts[0], parts[1], parts[2]
                
                # Check if it's a directory
                is_dir = False
                try:
                    ls_check = subprocess.run(
                        ["ipfs", "ls", hash_cid], 
                        capture_output=True, 
                        text=True, 
                        timeout=30
                    )
                    is_dir = ls_check.returncode == 0 and ls_check.stdout.strip()
                except:
                    pass
                
                file_type = "directory" if is_dir else mimetypes.guess_type(name)[0] or "application/octet-stream"
                preview_info = get_file_preview_info(name, file_type)
                
                entry = {
                    "name": name,
                    "cid": hash_cid,
                    "size": int(size) if size.isdigit() else 0,
                    "size_human": format_size(int(size)) if size.isdigit() else "0 B",
                    "type": file_type,
                    "is_directory": is_dir,
                    "parent_cid": parent_cid,
                    **preview_info
                }
                entries.append(entry)
    
    return entries

# ---------- Gateway HTML Parser ----------
def parse_gateway_directory_html(html_content, parent_cid):
    """Parse gateway HTML to extract directory entries"""
    
    class DirectoryParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.entries = []
            self.in_link = False
            self.current_link = None
            self.current_text = ""
            
        def handle_starttag(self, tag, attrs):
            if tag == 'a':
                self.in_link = True
                for attr_name, attr_value in attrs:
                    if attr_name == 'href' and attr_value.startswith('/ipfs/'):
                        self.current_link = attr_value.replace('/ipfs/', '')
                        break
                        
        def handle_data(self, data):
            if self.in_link:
                self.current_text += data
                
        def handle_endtag(self, tag):
            if tag == 'a' and self.in_link:
                if self.current_link and self.current_text.strip():
                    name = self.current_text.strip()
                    if name not in ['..', '.']:  # Skip parent directory links
                        is_dir = name.endswith('/')
                        clean_name = name.rstrip('/')
                        file_type = "directory" if is_dir else mimetypes.guess_type(clean_name)[0] or "application/octet-stream"
                        preview_info = get_file_preview_info(clean_name, file_type)
                        
                        self.entries.append({
                            "name": clean_name,
                            "cid": self.current_link.split('/')[-1] if '/' in self.current_link else self.current_link,
                            "size": 0,
                            "size_human": "0 B",
                            "type": file_type,
                            "is_directory": is_dir,
                            "parent_cid": parent_cid,
                            **preview_info
                        })
                
                self.in_link = False
                self.current_link = None
                self.current_text = ""
    
    parser = DirectoryParser()
    try:
        parser.feed(html_content)
        return parser.entries
    except:
        return []

def format_size(size_bytes):
    """Format file size"""
    if size_bytes == 0: return "0 B"
    elif size_bytes < 1024: return f"{size_bytes} B"
    elif size_bytes < 1048576: return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1073741824: return f"{size_bytes / 1048576:.1f} MB"
    else: return f"{size_bytes / 1073741824:.1f} GB"

# ---------- Initialize DB ----------
def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    
    # Create CID history table
    c.execute('''
        CREATE TABLE IF NOT EXISTS cid_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create bookmarks table
    c.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            type TEXT,
            size INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create uploads table
    c.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL UNIQUE,
            fileName TEXT NOT NULL,
            fileSize INTEGER DEFAULT 0,
            fileType TEXT,
            visibility TEXT DEFAULT 'public',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Analytics tables
    c.execute('''
        CREATE TABLE IF NOT EXISTS analytics_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
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
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS analytics_traffic_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cid TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_value TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Groups tables
    c.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS group_cids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            cid TEXT NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (group_id, cid),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
    ''')
    
    # Add indexes for better query performance
    c.execute('CREATE INDEX IF NOT EXISTS idx_history_cid ON cid_history(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_history_timestamp ON cid_history(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_bookmarks_cid ON bookmarks(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_bookmarks_timestamp ON bookmarks(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_uploads_cid ON uploads(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_uploads_timestamp ON uploads(timestamp DESC)')
    
    # Analytics indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_views_cid ON analytics_views(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_views_timestamp ON analytics_views(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_downloads_cid ON analytics_downloads(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_downloads_timestamp ON analytics_downloads(timestamp DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_traffic_cid ON analytics_traffic_sources(cid)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_analytics_traffic_timestamp ON analytics_traffic_sources(timestamp DESC)')
    
    # Group indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_group_cids_group_id ON group_cids(group_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_group_cids_cid ON group_cids(cid)')
    
    # Enable WAL mode for better concurrency
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA synchronous=NORMAL')
    c.execute('PRAGMA cache_size=10000')
    
    conn.commit()
    conn.close()

init_db()

# ---------- Gateway Management Routes ----------
@app.route("/gateway", methods=["POST"])
def set_gateway():
    global CURRENT_GATEWAY
    data = request.json
    gateway_name = data.get("gateway", "ipfs_io")
    
    if gateway_name in GATEWAYS:
        CURRENT_GATEWAY = GATEWAYS[gateway_name]
        return jsonify({"message": f"Gateway switched to {gateway_name}", "url": CURRENT_GATEWAY}), 200
    else:
        return jsonify({"error": "Invalid gateway", "available": list(GATEWAYS.keys())}), 400

@app.route("/gateway", methods=["GET"])
def get_current_gateway():
    current_name = next((k for k, v in GATEWAYS.items() if v == CURRENT_GATEWAY), "custom")
    return jsonify({
        "current_gateway": current_name, 
        "url": CURRENT_GATEWAY,
        "available_gateways": GATEWAYS
    })

# ---------- Helper Functions ----------
@lru_cache(maxsize=500)
def get_extension(content_type):
    """Cached extension lookup"""
    ext = mimetypes.guess_extension(content_type)
    return ext if ext else ""

# ---------- Database Operations ----------
@app.route("/history", methods=["POST"])
def save_history():
    data = request.json
    cid = data.get("cid")
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT OR IGNORE INTO cid_history (cid) VALUES (?)", (cid,))
        conn.commit()
        return jsonify({"message": "CID saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["GET"])
def get_history():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, timestamp FROM cid_history ORDER BY timestamp DESC LIMIT 50")
        rows = c.fetchall()
        return jsonify([{"cid": row[0], "timestamp": row[1]} for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["DELETE"])
def delete_history_entry():
    data = request.get_json()
    cid = data.get("cid")

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cid_history WHERE cid = ?", (cid,))
        conn.commit()
        return jsonify({"message": f"CID {cid} deleted from history"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Bookmark Operations ----------
@app.route("/bookmarks", methods=["POST"])
def add_bookmark():
    data = request.json
    cid = data.get("cid")
    title = data.get("title", f"Content {cid[:8]}..." if cid else "Untitled")
    content_type = data.get("type", "unknown")
    size = data.get("size", 0)
    
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute(
            "INSERT OR REPLACE INTO bookmarks (cid, title, type, size) VALUES (?, ?, ?, ?)",
            (cid, title, content_type, size)
        )
        conn.commit()
        return jsonify({"message": "Bookmark added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/bookmarks", methods=["GET"])
def get_bookmarks():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, title, type, size, timestamp FROM bookmarks ORDER BY timestamp DESC")
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
def delete_bookmark():
    data = request.get_json()
    cid = data.get("cid")

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM bookmarks WHERE cid = ?", (cid,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Bookmark not found"}), 404
        conn.commit()
        return jsonify({"message": f"Bookmark {cid} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/bookmarks/check/<cid>", methods=["GET"])
def check_bookmark(cid):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT 1 FROM bookmarks WHERE cid = ? LIMIT 1", (cid,))
        exists = c.fetchone() is not None
        return jsonify({"bookmarked": exists}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Upload Operations ----------
@app.route("/uploads", methods=["POST"])
def save_upload():
    data = request.json
    cid = data.get("cid")
    fileName = data.get("fileName", "Untitled")
    fileSize = data.get("fileSize", 0)
    fileType = data.get("fileType", "unknown")
    visibility = data.get("visibility", "public")
    timestamp = data.get("timestamp")
    
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        if timestamp:
            c.execute(
                "INSERT OR REPLACE INTO uploads (cid, fileName, fileSize, fileType, visibility, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (cid, fileName, fileSize, fileType, visibility, timestamp)
            )
        else:
            c.execute(
                "INSERT OR REPLACE INTO uploads (cid, fileName, fileSize, fileType, visibility) VALUES (?, ?, ?, ?, ?)",
                (cid, fileName, fileSize, fileType, visibility)
            )
        
        conn.commit()
        return jsonify({"message": "Upload saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/uploads", methods=["GET"])
def get_uploads():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT cid, fileName, fileSize, fileType, visibility, timestamp FROM uploads ORDER BY timestamp DESC")
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
def delete_upload():
    data = request.get_json()
    cid = data.get("cid")

    if not cid:
        return jsonify({"error": "CID not provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM uploads WHERE cid = ?", (cid,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Upload not found"}), 404
        conn.commit()
        return jsonify({"message": f"Upload {cid} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Group Operations ----------
@app.route("/groups", methods=["POST"])
def create_group():
    """Create a new group with custom name"""
    data = request.json
    name = data.get("name")
    
    if not name or not name.strip():
        return jsonify({"error": "Group name is required"}), 400
    
    name = name.strip()
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id FROM groups WHERE name = ?", (name,))
        if c.fetchone():
            return jsonify({"error": "Group name already exists"}), 409
        
        now = datetime.now().isoformat()
        c.execute("INSERT INTO groups (name, created_at) VALUES (?, ?)", (name, now))
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
def get_groups():
    """Get all groups with their CIDs - FIXED CID field mapping"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id, name, created_at FROM groups ORDER BY created_at DESC")
        groups = c.fetchall()
        
        result = []
        for group in groups:
            group_id, group_name, created_at = group
            
            c.execute("""
                SELECT gc.cid, gc.added_at, u.fileName, u.fileSize, u.fileType 
                FROM group_cids gc
                LEFT JOIN uploads u ON gc.cid = u.cid
                WHERE gc.group_id = ?
                ORDER BY gc.added_at DESC
            """, (group_id,))
            cids_data = c.fetchall()
            
            cids = []
            for cid_row in cids_data:
                file_size = cid_row[3] if cid_row[3] is not None else 0
                cids.append({
                    "cid": cid_row[0],  # FIX: Use index 0 for the actual CID
                    "added_at": cid_row[1],
                    "fileName": cid_row[2] if cid_row[2] else f"File_{cid_row[0][:8]}", # FIX: Use correct CID reference
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

@app.route("/groups/<int:group_id>", methods=["GET"])
def get_group(group_id):
    """Get specific group with its CIDs - FIXED CID field mapping"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id, name, created_at FROM groups WHERE id = ?", (group_id,))
        group = c.fetchone()
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("""
            SELECT gc.cid, gc.added_at, u.fileName, u.fileSize, u.fileType 
            FROM group_cids gc
            LEFT JOIN uploads u ON gc.cid = u.cid
            WHERE gc.group_id = ?
            ORDER BY gc.added_at DESC
        """, (group_id,))
        cids_data = c.fetchall()
        
        cids = []
        for cid_row in cids_data:
            file_size = cid_row[3] if cid_row[3] is not None else 0
            cids.append({
                "cid": cid_row[0],  # FIX: Use index 0 for the actual CID
                "added_at": cid_row[1],
                "fileName": cid_row[2] if cid_row[2] else f"File_{cid_row[0][:8]}", # FIX: Use correct CID reference
                "fileSize": file_size,
                "fileType": cid_row[4] if cid_row[4] else "unknown",
                "size_human": format_size(file_size) if isinstance(file_size, (int, float)) and file_size > 0 else "0 B"
            })
        
        result = {
            "id": group[0],
            "name": group[1],
            "created_at": group[2],
            "cids": cids,
            "cid_count": len(cids)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups/<int:group_id>/add", methods=["POST"])
def add_cid_to_group(group_id):
    """Add CID to a group"""
    data = request.json
    cid = data.get("cid")
    
    if not cid:
        return jsonify({"error": "CID is required"}), 400
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT name FROM groups WHERE id = ?", (group_id,))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("SELECT 1 FROM group_cids WHERE group_id = ? AND cid = ?", (group_id, cid))
        if c.fetchone():
            return jsonify({"error": "CID already exists in this group"}), 409
        
        now = datetime.now().isoformat()
        c.execute("INSERT INTO group_cids (group_id, cid, added_at) VALUES (?, ?, ?)", 
                  (group_id, cid, now))
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
def remove_cid_from_group(group_id):
    """Remove CID from a group"""
    data = request.json
    cid = data.get("cid")
    
    if not cid:
        return jsonify({"error": "CID is required"}), 400
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT name FROM groups WHERE id = ?", (group_id,))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("DELETE FROM group_cids WHERE group_id = ? AND cid = ?", (group_id, cid))
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
def delete_group(group_id):
    """Delete a group and all its CID associations"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT name FROM groups WHERE id = ?", (group_id,))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("DELETE FROM groups WHERE id = ?", (group_id,))
        conn.commit()
        
        return jsonify({
            "message": f"Group '{group[0]}' deleted successfully",
            "group_id": group_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/groups/<int:group_id>/rename", methods=["PUT"])
def rename_group(group_id):
    """Rename a group"""
    data = request.json
    new_name = data.get("name")
    
    if not new_name or not new_name.strip():
        return jsonify({"error": "New group name is required"}), 400
    
    new_name = new_name.strip()
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT name FROM groups WHERE id = ?", (group_id,))
        group = c.fetchone()
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        c.execute("SELECT id FROM groups WHERE name = ? AND id != ?", (new_name, group_id))
        if c.fetchone():
            return jsonify({"error": "Group name already exists"}), 409
        
        c.execute("UPDATE groups SET name = ? WHERE id = ?", (new_name, group_id))
        conn.commit()
        
        return jsonify({
            "message": f"Group renamed from '{group[0]}' to '{new_name}' successfully",
            "group_id": group_id,
            "old_name": group[0],
            "new_name": new_name
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Trending Content ----------
@lru_cache(maxsize=1)
def get_trending_cached():
    """Cache trending data since it's static"""
    return [
        {"cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"}, 
        {"cid": "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX"},
        {"cid": "QmUCF47VHN8PfUVjYfeL2MWUaeKN2twrQSfi8i4Shcu8dz"}
    ]

@app.route("/trending", methods=["GET"])
def get_trending():
    return jsonify(get_trending_cached())

# ---------- Enhanced Content Fetching ----------
@app.route("/fetch/<cid>", methods=["GET"])
def fetch_cid_content(cid):
    try:
        decoded_cid = unquote(cid.strip("/"))
        
        head_res, used_gateway = try_multiple_gateways(decoded_cid, 'head')
        
        track_view(decoded_cid, request, used_gateway)
        
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

# ---------- Upload Endpoint ----------
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    visibility = request.form.get('visibility', 'public')

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

# ---------- Folder Upload Endpoint ----------
@app.route('/upload-folder', methods=['POST'])
def upload_folder():
    """Handle folder upload with multiple files"""
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files')
    visibility = request.form.get('visibility', 'public')
    
    if not files:
        return jsonify({'error': 'No files selected'}), 400

    # Create temporary directory for folder structure
    temp_dir = os.path.join(os.getcwd(), 'temp_uploads', str(uuid.uuid4()))
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Extract folder structure and save files
        folder_name = None
        file_results = []
        
        # Process each file and maintain directory structure
        for i, file in enumerate(files):
            if file.filename == '':
                continue
                
            # Get the relative path for this file
            path_key = f'paths_{i}'
            relative_path = request.form.get(path_key, file.filename)
            
            # Extract folder name from first file's path
            if folder_name is None and '/' in relative_path:
                folder_name = relative_path.split('/')[0]
            elif folder_name is None:
                folder_name = f"uploaded_folder_{int(time.time())}"
            
            # Create directory structure
            file_path = os.path.join(temp_dir, relative_path)
            file_dir = os.path.dirname(file_path)
            os.makedirs(file_dir, exist_ok=True)
            
            # Save file
            file.save(file_path)
            
            file_results.append({
                'path': relative_path,
                'size': os.path.getsize(file_path),
                'type': mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            })

        # Upload folder to IPFS
        ipfs_env = os.environ.copy()
        
        if visibility == 'private':
            ipfs_env["IPFS_PATH"] = os.path.expanduser("~/.ipfs-private")
            # Use --offline for private uploads
            result = subprocess.run(
                ["ipfs", "--offline", "add", "-r", "-Q", temp_dir],
                env=ipfs_env,
                capture_output=True,
                text=True,
                check=True,
                timeout=300
            )
        else:
            ipfs_env["IPFS_PATH"] = os.path.expanduser("~/.ipfs")
            # Upload recursively to maintain folder structure
            result = subprocess.run(
                ["ipfs", "add", "-r", "-Q", temp_dir],
                env=ipfs_env,
                capture_output=True,
                text=True,
                check=True,
                timeout=300
            )

        # Parse IPFS output - last line is the folder CID
        output_lines = result.stdout.strip().split('\n')
        folder_cid = output_lines[-1] if output_lines else None
        
        if not folder_cid:
            raise Exception("No CID returned from IPFS")

        # Get individual file CIDs from output
        individual_cids = output_lines[:-1] if len(output_lines) > 1 else []
        
        # Update file results with CIDs
        for i, cid in enumerate(individual_cids):
            if i < len(file_results):
                file_results[i]['cid'] = cid

        # Provide to DHT for public uploads
        if visibility == 'public':
            threading.Thread(target=lambda: subprocess.run(
                ["ipfs", "dht", "provide", folder_cid],
                env=ipfs_env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=300
            ), daemon=True).start()

        # Calculate total size
        total_size = sum(f['size'] for f in file_results)

        return jsonify({
            'success': True,
            'message': 'Folder uploaded successfully to IPFS',
            'folderCid': folder_cid,
            'folderName': folder_name,
            'visibility': visibility,
            'totalSize': total_size,
            'fileCount': len(file_results),
            'files': file_results
        }), 200

    except subprocess.CalledProcessError as e:
        return jsonify({
            'success': False,
            'error': 'Failed to add folder to IPFS', 
            'details': e.stderr
        }), 500
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Folder upload timeout - too many files or network slow. Please try again.'
        }), 408
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Failed to clean up temp directory: {e}")

# ---------- Enhanced Metadata ----------
def _get_metadata_internal(decoded_cid):
    """Internal metadata function for caching with gateway fallback"""
    try:
        head_res, used_gateway = try_multiple_gateways(decoded_cid, 'head')
        
        content_type = head_res.headers.get("Content-Type", "unknown")
        content_length = head_res.headers.get("Content-Length")
        size = int(content_length) if content_length else 0
        
        is_dir = content_type == "text/html" or "directory" in content_type.lower()
        
        if size == 0:
            try:
                stat_result = subprocess.run(
                    ["ipfs", "object", "stat", decoded_cid], 
                    capture_output=True, 
                    text=True, 
                    timeout=60
                )
                if stat_result.returncode == 0:
                    for line in stat_result.stdout.splitlines():
                        if line.startswith("CumulativeSize:"):
                            size = int(line.split(":", 1)[1].strip())
                            break
            except Exception as e:
                print(f"IPFS object stat failed for {decoded_cid}: {e}")
        
        return {
            "cid": decoded_cid,
            "size": size,
            "type": content_type,
            "is_dir": is_dir,
            "gateway_used": used_gateway
        }
        
    except Exception as e:
        try:
            print(f"Trying local IPFS commands for {decoded_cid}")
            stat_result = subprocess.run(
                ["ipfs", "object", "stat", decoded_cid], 
                capture_output=True, 
                text=True, 
                timeout=90
            )
            size = 0
            if stat_result.returncode == 0:
                for line in stat_result.stdout.splitlines():
                    if line.startswith("CumulativeSize:"):
                        size = int(line.split(":", 1)[1].strip())
                        break

            ls_result = subprocess.run(
                ["ipfs", "ls", decoded_cid], 
                capture_output=True, 
                text=True, 
                timeout=60
            )
            is_dir = ls_result.returncode == 0 and ls_result.stdout.strip()

            return {
                "cid": decoded_cid,
                "size": size,
                "type": "unknown",
                "is_dir": is_dir,
                "gateway_used": "local_ipfs_command"
            }
        except Exception as final_e:
            raise Exception(f"Could not fetch metadata from any source: {str(final_e)}")

@app.route("/metadata")
def get_metadata():
    cid = request.args.get("cid")
    if not cid:
        return jsonify({"error": "Missing CID"}), 400

    try:
        cid = cid.strip("/")
        decoded_cid = unquote(cid)
        
        metadata = cached_metadata_lookup(decoded_cid)
        return jsonify(metadata)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- IPFS Folder Navigation Routes ----------
@app.route("/navigate")
def navigate_to_file():
    """Navigate to a specific file or folder within IPFS"""
    parent_cid = request.args.get("parent")
    file_name = request.args.get("name")
    
    if not parent_cid or not file_name:
        return jsonify({"error": "Missing parent CID or file name"}), 400

    try:
        # Construct the IPFS path
        full_path = f"{parent_cid}/{quote(file_name)}"
        
        # Get the specific CID for this file/folder
        try:
            result = subprocess.run(
                ["ipfs", "resolve", f"/ipfs/{full_path}"], 
                capture_output=True, 
                text=True, 
                timeout=60
            )
            
            if result.returncode == 0:
                # Extract CID from the resolve output
                resolved_path = result.stdout.strip()
                file_cid = resolved_path.replace("/ipfs/", "")
                
                return jsonify({
                    "success": True,
                    "parent_cid": parent_cid,
                    "file_name": file_name,
                    "file_cid": file_cid,
                    "full_path": full_path,
                    "resolved_path": resolved_path
                })
            else:
                # Fallback: try to get the file CID from ls output
                ls_result = subprocess.run(
                    ["ipfs", "ls", parent_cid], 
                    capture_output=True, 
                    text=True, 
                    timeout=60
                )
                
                if ls_result.returncode == 0:
                    for line in ls_result.stdout.strip().split("\n"):
                        if line:
                            parts = line.split(None, 2)
                            if len(parts) >= 3 and parts[2] == file_name:
                                file_cid = parts[1]
                                return jsonify({
                                    "success": True,
                                    "parent_cid": parent_cid,
                                    "file_name": file_name,
                                    "file_cid": file_cid,
                                    "full_path": full_path,
                                    "method": "ls_lookup"
                                })
                
                return jsonify({"error": "File not found in directory"}), 404
                
        except Exception as e:
            print(f"Navigation error: {e}")
            return jsonify({"error": f"Navigation failed: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Enhanced Directory Listing with Navigation Support ----------
@app.route("/ls")
def list_cid():
    """Enhanced directory listing with proper navigation support"""
    cid_path = request.args.get("cid")
    if not cid_path:
        return jsonify({"error": "Missing CID"}), 400

    try:
        decoded_cid = unquote(cid_path.strip("/"))
        
        # Try IPFS ls command first
        try:
            result = subprocess.run(
                ["ipfs", "ls", decoded_cid], 
                capture_output=True, 
                text=True, 
                timeout=90
            )
            
            if result.returncode == 0:
                entries = parse_ipfs_ls_output(result.stdout, decoded_cid)
                
                return jsonify({
                    "cid": decoded_cid,
                    "entries": entries,
                    "method": "local_ipfs",
                    "total_items": len(entries),
                    "is_directory": True
                })
        except Exception as ls_err:
            print(f"IPFS ls failed for {decoded_cid}: {ls_err}")

        # Fallback to gateway method
        try:
            r, used_gateway = try_multiple_gateways(decoded_cid, 'get')
            if 'text/html' in r.headers.get('Content-Type', ''):
                entries = parse_gateway_directory_html(r.text, decoded_cid)
                return jsonify({
                    "cid": decoded_cid, 
                    "entries": entries, 
                    "method": "gateway_html",
                    "gateway_used": used_gateway,
                    "total_items": len(entries),
                    "is_directory": True
                })
        except Exception as gateway_err:
            print(f"Gateway directory listing failed for {decoded_cid}: {gateway_err}")

        return jsonify({"error": "Could not list directory contents"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- File Preview for Folder Files ----------
@app.route("/preview-file")
def preview_folder_file():
    """Preview a file within a folder structure"""
    parent_cid = request.args.get("parent_cid")
    file_cid = request.args.get("file_cid") 
    filename = request.args.get("filename", "file")
    
    if not file_cid:
        return "Missing file CID", 400

    try:
        decoded_cid = unquote(file_cid.strip("/"))
        
        # Use multiple gateways with streaming
        r, used_gateway = try_multiple_gateways(decoded_cid, 'stream')

        if r.status_code != 200:
            return f"Error fetching content: {r.status_code}", 404

        content_type = r.headers.get("Content-Type", "application/octet-stream")
        
        # If content type is not detected, guess from filename
        if content_type == "application/octet-stream" and filename:
            guessed_type = mimetypes.guess_type(filename)[0]
            if guessed_type:
                content_type = guessed_type
        
        content_length = r.headers.get("Content-Length", 0)
        
        # Track the view
        track_view(decoded_cid, request, used_gateway)
        
        # Stream the content directly WITHOUT download headers for inline viewing
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
                "X-Parent-CID": parent_cid or "unknown",
                "X-Filename": filename
            }
        )

    except Exception as e:
        return f"Server error: {str(e)}", 500

# ---------- Preview Content (for inline viewing) ----------
@app.route("/preview")
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
        
        # Track the view
        track_view(decoded_cid, request, used_gateway)
        
        # Stream the content directly WITHOUT download headers
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
                # NO Content-Disposition header - this allows inline viewing
                "Cache-Control": "public, max-age=3600",
                "X-Gateway-Used": used_gateway
            }
        )

    except Exception as e:
        return f"Server error: {str(e)}", 500

# ---------- Enhanced Content Download (Force Download) ----------
@app.route("/download")
def download_content():
    """Force download content with attachment headers"""
    cid = request.args.get("cid")
    filename = request.args.get("filename", None)
    
    if not cid:
        return "Missing CID", 400

    try:
        cid = cid.strip("/")
        decoded_cid = unquote(cid)
        
        r, used_gateway = try_multiple_gateways(decoded_cid, 'stream')

        if r.status_code != 200:
            return f"Error fetching content: {r.status_code}", 404

        content_type = r.headers.get("Content-Type", "application/octet-stream")
        content_length = r.headers.get("Content-Length", 0)
        
        # Track the download
        track_download(decoded_cid, request, used_gateway, int(content_length) if content_length else 0)
        
        # Use custom filename if provided
        if filename:
            final_filename = filename
        else:
            ext = get_extension(content_type)
            final_filename = f"{cid}{ext}"

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
                "Content-Disposition": f'attachment; filename="{final_filename}"',  # Force download
                "X-Gateway-Used": used_gateway
            }
        )

    except Exception as e:
        return f"Server error: {str(e)}", 500

# ---------- Legacy Content Endpoint (for backward compatibility) ----------
@app.route("/content")
def get_content():
    """Legacy content endpoint - redirects to preview for inline viewing"""
    cid = request.args.get("cid")
    filename = request.args.get("filename", None)
    
    if not cid:
        return "Missing CID", 400

    try:
        cid = cid.strip("/")
        decoded_cid = unquote(cid)
        
        r, used_gateway = try_multiple_gateways(decoded_cid, 'stream')

        if r.status_code != 200:
            return f"Error fetching content: {r.status_code}", 404

        content_type = r.headers.get("Content-Type", "application/octet-stream")
        content_length = r.headers.get("Content-Length", 0)
        
        track_view(decoded_cid, request, used_gateway)
        
        if filename:
            final_filename = filename
        else:
            ext = get_extension(content_type)
            final_filename = f"{cid}{ext}"

        def generate():
            try:
                for chunk in r.iter_content(chunk_size=8192):
                    yield chunk
            except Exception as e:
                yield f"Stream error: {str(e)}".encode()

        # Check if it's a PDF or other previewable content
        if content_type == 'application/pdf' or content_type.startswith('image/') or content_type.startswith('video/'):
            # Return without download headers for inline viewing
            return Response(
                generate(),
                content_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=3600",
                    "X-Gateway-Used": used_gateway
                }
            )
        else:
            # Force download for other file types
            return Response(
                generate(),
                content_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{final_filename}"',
                    "X-Gateway-Used": used_gateway
                }
            )

    except Exception as e:
        return f"Server error: {str(e)}", 500

# ---------- Private Preview ----------
@app.route('/preview-private/<cid>', methods=['GET'])
def preview_private(cid):
    try:
        track_view(cid, request, "private_ipfs")
        
        ipfs_env = os.environ.copy()
        ipfs_env["IPFS_PATH"] = os.path.expanduser("~/.ipfs-private")

        result = subprocess.run(
            ["ipfs", "cat", cid],
            env=ipfs_env,
            capture_output=True,
            check=True,
            timeout=120
        )
        content = result.stdout

        mime = magic.Magic(mime=True)
        mime_type = mime.from_buffer(content[:1024])

        extension = mimetypes.guess_extension(mime_type) or ''

        return Response(
            content,
            content_type=mime_type,
            headers={
                "Content-Disposition": f'inline; filename="{cid}{extension}"'
            }
        )
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Failed to read private CID", "details": e.stderr.decode()}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Request timeout - content too large or not available"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Analytics Dashboard Routes ----------
@app.route("/analytics/dashboard", methods=["GET"])
def get_analytics_dashboard():
    """Get comprehensive analytics dashboard data for uploaded CIDs only"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        c.execute("""
            SELECT COUNT(*) FROM analytics_views 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (start_date,))
        total_views = c.fetchone()[0]
        
        c.execute("""
            SELECT COUNT(*) FROM analytics_downloads 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (start_date,))
        total_downloads = c.fetchone()[0]
        
        c.execute("""
            SELECT COUNT(DISTINCT cid) FROM analytics_views 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (start_date,))
        unique_cids = c.fetchone()[0]
        
        c.execute("""
            SELECT v.cid, COUNT(*) as views, u.fileName 
            FROM analytics_views v
            JOIN uploads u ON v.cid = u.cid
            WHERE v.timestamp >= ? 
            GROUP BY v.cid 
            ORDER BY views DESC 
            LIMIT 10
        """, (start_date,))
        top_viewed = [{"cid": row[0], "views": row[1], "filename": row[2]} for row in c.fetchall()]
        
        c.execute("""
            SELECT d.cid, COUNT(*) as downloads, u.fileName 
            FROM analytics_downloads d
            JOIN uploads u ON d.cid = u.cid
            WHERE d.timestamp >= ? 
            GROUP BY d.cid 
            ORDER BY downloads DESC 
            LIMIT 10
        """, (start_date,))
        top_downloaded = [{"cid": row[0], "downloads": row[1], "filename": row[2]} for row in c.fetchall()]
        
        c.execute("""
            SELECT source_type, COUNT(*) as count 
            FROM analytics_traffic_sources 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
            GROUP BY source_type 
            ORDER BY count DESC
        """, (start_date,))
        traffic_sources = [{"source": row[0], "count": row[1]} for row in c.fetchall()]
        
        c.execute("""
            SELECT gateway_used, COUNT(*) as count 
            FROM analytics_views 
            WHERE timestamp >= ? AND gateway_used IS NOT NULL AND cid IN (SELECT cid FROM uploads)
            GROUP BY gateway_used 
            ORDER BY count DESC
        """, (start_date,))
        gateway_usage = [{"gateway": row[0], "count": row[1]} for row in c.fetchall()]
        
        return jsonify({
            "period_days": days,
            "totals": {
                "views": total_views,
                "downloads": total_downloads,
                "unique_cids": unique_cids
            },
            "top_viewed": top_viewed,
            "top_downloaded": top_downloaded,
            "traffic_sources": traffic_sources,
            "gateway_usage": gateway_usage
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analytics/cid/<cid>", methods=["GET"])
def get_cid_analytics(cid):
    """Get detailed analytics for a specific CID"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT fileName FROM uploads WHERE cid = ?", (cid,))
        upload_info = c.fetchone()
        if not upload_info:
            return jsonify({"error": "Analytics only available for uploaded content"}), 403
        
        days = request.args.get('days', 7, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        # Total stats
        c.execute("SELECT COUNT(*) FROM analytics_views WHERE cid = ? AND timestamp >= ?", (cid, start_date))
        total_views = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM analytics_downloads WHERE cid = ? AND timestamp >= ?", (cid, start_date))
        total_downloads = c.fetchone()[0]
        
        c.execute("SELECT COUNT(DISTINCT ip_address) FROM analytics_views WHERE cid = ? AND timestamp >= ?", (cid, start_date))
        unique_users = c.fetchone()[0]
        
        # Peak day
        c.execute("""
            SELECT DATE(timestamp) as date, COUNT(*) as views 
            FROM analytics_views 
            WHERE cid = ? AND timestamp >= ? 
            GROUP BY DATE(timestamp) 
            ORDER BY views DESC 
            LIMIT 1
        """, (cid, start_date))
        peak_result = c.fetchone()
        peak_day = peak_result[0] if peak_result else None
        peak_day_views = peak_result[1] if peak_result else 0
        
        # Recent activity
        c.execute("""
            SELECT 'view' as action, timestamp, user_agent, referrer
            FROM analytics_views 
            WHERE cid = ? AND timestamp >= ? 
            UNION ALL 
            SELECT 'download' as action, timestamp, user_agent, referrer
            FROM analytics_downloads 
            WHERE cid = ? AND timestamp >= ? 
            ORDER BY timestamp DESC 
            LIMIT 20
        """, (cid, start_date, cid, start_date))
        
        recent_activity = []
        for row in c.fetchall():
            recent_activity.append({
                "action": row[0],
                "timestamp": row[1],
                "user_agent": row[2],
                "referrer": row[3]
            })
        
        return jsonify({
            "cid": cid,
            "filename": upload_info[0],
            "period_days": days,
            "total_views": total_views,
            "total_downloads": total_downloads,
            "unique_users": unique_users,
            "peak_day": peak_day,
            "peak_day_views": peak_day_views,
            "recent_activity": recent_activity
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analytics/export", methods=["GET"])
def export_analytics():
    """Export analytics data as CSV"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        export_type = request.args.get('type', 'views')
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        if export_type == 'views':
            c.execute("""
                SELECT v.cid, v.ip_address, v.user_agent, v.referrer, v.gateway_used, v.timestamp, u.fileName
                FROM analytics_views v
                JOIN uploads u ON v.cid = u.cid
                WHERE v.timestamp >= ? 
                ORDER BY v.timestamp DESC
            """, (start_date,))
            columns = ['CID', 'IP Address', 'User Agent', 'Referrer', 'Gateway', 'Timestamp', 'Filename']
        elif export_type == 'downloads':
            c.execute("""
                SELECT d.cid, d.ip_address, d.user_agent, d.referrer, d.gateway_used, d.file_size, d.download_completed, d.timestamp, u.fileName
                FROM analytics_downloads d
                JOIN uploads u ON d.cid = u.cid
                WHERE d.timestamp >= ? 
                ORDER BY d.timestamp DESC
            """, (start_date,))
            columns = ['CID', 'IP Address', 'User Agent', 'Referrer', 'Gateway', 'File Size', 'Completed', 'Timestamp', 'Filename']
        else:
            c.execute("""
                SELECT t.cid, t.source_type, t.source_value, t.ip_address, t.timestamp, u.fileName
                FROM analytics_traffic_sources t
                JOIN uploads u ON t.cid = u.cid
                WHERE t.timestamp >= ? 
                ORDER BY t.timestamp DESC
            """, (start_date,))
            columns = ['CID', 'Source Type', 'Source Value', 'IP Address', 'Timestamp', 'Filename']
        
        rows = c.fetchall()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)
        writer.writerows(rows)
        
        csv_data = output.getvalue()
        output.close()
        
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=analytics_{export_type}_{days}days.csv'
            }
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analytics/realtime", methods=["GET"])
def get_realtime_analytics():
    """Get real-time analytics (last hour)"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        one_hour_ago = datetime.now() - timedelta(hours=1)
        
        c.execute("""
            SELECT COUNT(*) FROM analytics_views 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (one_hour_ago,))
        recent_views = c.fetchone()[0]
        
        c.execute("""
            SELECT COUNT(*) FROM analytics_downloads 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (one_hour_ago,))
        recent_downloads = c.fetchone()[0]
        
        c.execute("""
            SELECT COUNT(DISTINCT session_id) FROM analytics_views 
            WHERE timestamp >= ? AND cid IN (SELECT cid FROM uploads)
        """, (one_hour_ago,))
        active_sessions = c.fetchone()[0]
        
        c.execute("""
            SELECT v.cid, COUNT(*) as activity, u.fileName
            FROM analytics_views v
            JOIN uploads u ON v.cid = u.cid
            WHERE v.timestamp >= ? 
            GROUP BY v.cid 
            ORDER BY activity DESC 
            LIMIT 5
        """, (one_hour_ago,))
        hot_cids = [{"cid": row[0], "activity": row[1], "filename": row[2]} for row in c.fetchall()]
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "recent_views": recent_views,
            "recent_downloads": recent_downloads,
            "active_sessions": active_sessions,
            "hot_cids": hot_cids
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Health Check ----------
@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        test_cid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
        head_res, used_gateway = try_multiple_gateways(test_cid, 'head')
        
        return jsonify({
            "status": "healthy",
            "primary_gateway": CURRENT_GATEWAY,
            "gateway_used": used_gateway,
            "response_code": head_res.status_code
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "primary_gateway": CURRENT_GATEWAY
        }), 503

if __name__ == "__main__":
    print(f"🚀 Starting IPFS Gateway Client with primary gateway: {CURRENT_GATEWAY}")
    print(f"🌐 Available gateways: {list(GATEWAYS.keys())}")
    print("⚠️  Extended timeouts enabled for slow IPFS operations")
    print("📊 Analytics dashboard enabled - tracking views, downloads, and traffic sources")
    print("🔒 Analytics filtered to uploaded content only")
    print("📥 Custom filename downloads enabled")
    print("👥 Group management feature enabled")
    print("🔍 PDF Preview support enabled with /preview endpoint")
    print("📁 Folder upload support enabled with /upload-folder endpoint")
    print("🗂️  Enhanced folder browsing with file preview support enabled!")
    print("📄 File preview support for images, videos, PDFs, and text files")
    print("🚀 IPFS Folder Navigation and Preview Features Active!")
    print("✅ ALL CRITICAL BUGS FIXED - Complete working backend!")
    print("🔧 GROUP CID MAPPING BUG FIXED - File sizes should now display correctly!")
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)

