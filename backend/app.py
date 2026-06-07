import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory
from werkzeug.utils import secure_filename


DATA_DIR = Path(os.environ.get("FLIPSITE_DATA_DIR", "/data"))
DATABASE_PATH = DATA_DIR / "flipsite.db"
FILES_DIR = DATA_DIR / "files"
AVATARS_DIR = DATA_DIR / "avatars"
FRONTEND_DIR = Path(os.environ.get("FLIPSITE_FRONTEND_DIR", "/app/dist"))
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
LOCAL_USER_ID = "local"

app = Flask(__name__, static_folder=None)
app.config.update(
    MAX_CONTENT_LENGTH=MAX_UPLOAD_BYTES,
)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_database():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    AVATARS_DIR.mkdir(parents=True, exist_ok=True)

    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                username TEXT,
                avatar_url TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS items (
                tsid TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                condition TEXT NOT NULL,
                buy_price REAL NOT NULL CHECK (buy_price >= 0),
                sell_price REAL CHECK (sell_price IS NULL OR sell_price >= 0),
                buy_platform TEXT,
                sell_platform TEXT,
                status TEXT NOT NULL CHECK (status IN ('holding', 'listed', 'sold', 'keeper')),
                bought_at TEXT NOT NULL,
                sold_at TEXT,
                notes TEXT,
                bundle_id TEXT REFERENCES items(tsid) ON DELETE SET NULL,
                is_bundle_parent INTEGER NOT NULL DEFAULT 0,
                cover_image_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS items_user_id_idx ON items(user_id);
            CREATE INDEX IF NOT EXISTS items_bundle_id_idx ON items(bundle_id);

            CREATE TABLE IF NOT EXISTS item_files (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES items(tsid) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL CHECK (file_type IN ('image', 'file')),
                original_name TEXT,
                mime_type TEXT,
                size_bytes INTEGER,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS item_files_item_id_idx ON item_files(item_id);
            CREATE INDEX IF NOT EXISTS item_files_user_id_idx ON item_files(user_id);
            """
        )
        db.execute(
            "INSERT OR IGNORE INTO profiles (id, updated_at) VALUES (?, ?)",
            (LOCAL_USER_ID, utc_now()),
        )


def use_local_data(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        return handler({"id": LOCAL_USER_ID}, *args, **kwargs)

    return wrapped


def row_to_dict(row):
    if row is None:
        return None

    value = dict(row)
    if "is_bundle_parent" in value:
        value["is_bundle_parent"] = bool(value["is_bundle_parent"])
    return value


def validate_item_payload(payload, partial=False):
    allowed = {
        "name",
        "category",
        "condition",
        "buy_price",
        "sell_price",
        "buy_platform",
        "sell_platform",
        "status",
        "bought_at",
        "sold_at",
        "notes",
        "bundle_id",
        "is_bundle_parent",
        "cover_image_id",
    }
    required = {"name", "category", "condition", "buy_price", "status", "bought_at"}
    clean = {key: payload[key] for key in allowed if key in payload}

    if not partial and not required.issubset(clean):
        raise ValueError("Missing required item fields")
    if "status" in clean and clean["status"] not in {"holding", "listed", "sold", "keeper"}:
        raise ValueError("Invalid item status")
    for key in ("buy_price", "sell_price"):
        if key in clean and clean[key] is not None:
            clean[key] = float(clean[key])
            if clean[key] < 0:
                raise ValueError(f"{key} cannot be negative")
    if "is_bundle_parent" in clean:
        clean["is_bundle_parent"] = 1 if clean["is_bundle_parent"] else 0
    return clean


def verify_bundle_parent(db, user_id, bundle_id):
    if not bundle_id:
        return
    parent = db.execute(
        """
        SELECT tsid FROM items
        WHERE tsid = ? AND user_id = ? AND is_bundle_parent = 1
        """,
        (bundle_id, user_id),
    ).fetchone()
    if not parent:
        raise ValueError("Bundle parent must belong to the current user")


def insert_item(db, user_id, payload):
    clean = validate_item_payload(payload)
    verify_bundle_parent(db, user_id, clean.get("bundle_id"))
    item_id = payload.get("tsid") or str(uuid.uuid4())
    created_at = payload.get("created_at") or utc_now()
    columns = [
        "tsid",
        "user_id",
        "name",
        "category",
        "condition",
        "buy_price",
        "sell_price",
        "buy_platform",
        "sell_platform",
        "status",
        "bought_at",
        "sold_at",
        "notes",
        "bundle_id",
        "is_bundle_parent",
        "cover_image_id",
        "created_at",
    ]
    values = {
        "tsid": item_id,
        "user_id": user_id,
        "sell_price": None,
        "buy_platform": None,
        "sell_platform": None,
        "sold_at": None,
        "notes": None,
        "bundle_id": None,
        "is_bundle_parent": 0,
        "cover_image_id": None,
        "created_at": created_at,
        **clean,
    }
    db.execute(
        f"INSERT INTO items ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
        tuple(values[column] for column in columns),
    )
    return db.execute("SELECT * FROM items WHERE tsid = ?", (item_id,)).fetchone()


def sync_bundle_parent(db, user_id, bundle_id):
    if not bundle_id:
        return
    parent = db.execute(
        "SELECT status FROM items WHERE tsid = ? AND user_id = ? AND is_bundle_parent = 1",
        (bundle_id, user_id),
    ).fetchone()
    if not parent or parent["status"] == "keeper":
        return
    children = db.execute(
        "SELECT status, sold_at FROM items WHERE bundle_id = ? AND user_id = ?",
        (bundle_id, user_id),
    ).fetchall()
    if not children or any(child["status"] != "sold" for child in children):
        return
    sold_dates = sorted(
        (child["sold_at"] for child in children if child["sold_at"]),
        reverse=True,
    )
    db.execute(
        "UPDATE items SET status = 'sold', sold_at = ? WHERE tsid = ? AND user_id = ?",
        (sold_dates[0] if sold_dates else utc_now(), bundle_id, user_id),
    )


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/items")
@use_local_data
def list_items(user):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/items")
@use_local_data
def create_items(user):
    payload = request.get_json(silent=True)
    rows = payload if isinstance(payload, list) else [payload]
    if not rows or any(not isinstance(row, dict) for row in rows):
        return jsonify({"error": "Invalid item payload"}), 400
    try:
        with get_db() as db:
            created = [insert_item(db, user["id"], row) for row in rows]
    except (ValueError, sqlite3.IntegrityError) as error:
        return jsonify({"error": str(error)}), 400
    result = [row_to_dict(row) for row in created]
    return jsonify(result if isinstance(payload, list) else result[0]), 201


@app.post("/api/bundles")
@use_local_data
def create_bundle(user):
    payload = request.get_json(silent=True) or {}
    parent_payload = payload.get("parent")
    children = payload.get("children", [])
    if not isinstance(parent_payload, dict) or not isinstance(children, list):
        return jsonify({"error": "Invalid bundle payload"}), 400
    try:
        with get_db() as db:
            parent = insert_item(
                db,
                user["id"],
                {**parent_payload, "is_bundle_parent": True},
            )
            for child in children:
                insert_item(
                    db,
                    user["id"],
                    {
                        **child,
                        "buy_price": child.get("buy_price", 0),
                        "bundle_id": parent["tsid"],
                        "bought_at": parent_payload["bought_at"],
                        "buy_platform": parent_payload.get("buy_platform"),
                        "is_bundle_parent": False,
                        "sell_platform": None,
                        "sell_price": None,
                        "sold_at": None,
                    },
                )
    except (ValueError, sqlite3.IntegrityError) as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(row_to_dict(parent)), 201


@app.patch("/api/items/<item_id>")
@use_local_data
def update_item(user, item_id):
    payload = request.get_json(silent=True) or {}
    try:
        clean = validate_item_payload(payload, partial=True)
        if not clean:
            return jsonify({"error": "No supported fields supplied"}), 400
        with get_db() as db:
            current = db.execute(
                "SELECT * FROM items WHERE tsid = ? AND user_id = ?",
                (item_id, user["id"]),
            ).fetchone()
            if not current:
                return jsonify({"error": "Item not found"}), 404
            verify_bundle_parent(db, user["id"], clean.get("bundle_id"))
            assignments = ", ".join(f"{column} = ?" for column in clean)
            db.execute(
                f"UPDATE items SET {assignments} WHERE tsid = ? AND user_id = ?",
                (*clean.values(), item_id, user["id"]),
            )
            updated = db.execute(
                "SELECT * FROM items WHERE tsid = ?",
                (item_id,),
            ).fetchone()
            if request.args.get("syncBundleParent", "1") != "0":
                sync_bundle_parent(db, user["id"], updated["bundle_id"])
    except (ValueError, sqlite3.IntegrityError) as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(row_to_dict(updated))


@app.delete("/api/items/<item_id>")
@use_local_data
def delete_item(user, item_id):
    with get_db() as db:
        file_rows = db.execute(
            "SELECT file_path FROM item_files WHERE item_id = ? AND user_id = ?",
            (item_id, user["id"]),
        ).fetchall()
        result = db.execute(
            "DELETE FROM items WHERE tsid = ? AND user_id = ?",
            (item_id, user["id"]),
        )
    if not result.rowcount:
        return jsonify({"error": "Item not found"}), 404
    for row in file_rows:
        (FILES_DIR / row["file_path"]).unlink(missing_ok=True)
    return "", 204


@app.patch("/api/categories")
@use_local_data
def update_category(user):
    payload = request.get_json(silent=True) or {}
    source = str(payload.get("source", "")).strip()
    target = str(payload.get("target", "")).strip()
    if not source or not target:
        return jsonify({"error": "Source and target are required"}), 400
    with get_db() as db:
        result = db.execute(
            "UPDATE items SET category = ? WHERE user_id = ? AND category = ?",
            (target, user["id"], source),
        )
    return jsonify({"updated": result.rowcount})


@app.get("/api/profile")
@use_local_data
def get_profile(user):
    with get_db() as db:
        profile = db.execute(
            "SELECT id, username, avatar_url, updated_at FROM profiles WHERE id = ?",
            (user["id"],),
        ).fetchone()
    return jsonify(row_to_dict(profile))


@app.put("/api/profile")
@use_local_data
def update_profile(user):
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    avatar_url = payload.get("avatar_url")
    updated_at = utc_now()
    with get_db() as db:
        db.execute(
            """
            INSERT INTO profiles (id, username, avatar_url, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                avatar_url = COALESCE(excluded.avatar_url, profiles.avatar_url),
                updated_at = excluded.updated_at
            """,
            (user["id"], username, avatar_url, updated_at),
        )
        profile = db.execute(
            "SELECT id, username, avatar_url, updated_at FROM profiles WHERE id = ?",
            (user["id"],),
        ).fetchone()
    return jsonify(row_to_dict(profile))


@app.post("/api/profile/avatar")
@use_local_data
def upload_avatar(user):
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "File is required"}), 400
    path = AVATARS_DIR / f"{user['id']}.webp"
    uploaded.save(path)
    avatar_url = f"/api/avatars/{user['id']}.webp"
    updated_at = utc_now()
    with get_db() as db:
        db.execute(
            "UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?",
            (avatar_url, updated_at, user["id"]),
        )
    return jsonify({"avatar_url": avatar_url, "updated_at": updated_at})


@app.get("/api/avatars/<filename>")
def serve_avatar(filename):
    return send_from_directory(AVATARS_DIR, secure_filename(filename))


@app.get("/api/items/<item_id>/files")
@use_local_data
def list_item_files(user, item_id):
    with get_db() as db:
        rows = db.execute(
            """
            SELECT * FROM item_files
            WHERE item_id = ? AND user_id = ?
            ORDER BY created_at DESC
            """,
            (item_id, user["id"]),
        ).fetchall()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/items/<item_id>/files")
@use_local_data
def upload_item_file(user, item_id):
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "File is required"}), 400
    with get_db() as db:
        item = db.execute(
            "SELECT tsid FROM items WHERE tsid = ? AND user_id = ?",
            (item_id, user["id"]),
        ).fetchone()
        if not item:
            return jsonify({"error": "Item not found"}), 404

        file_id = str(uuid.uuid4())
        original_name = uploaded.filename or "file"
        safe_name = secure_filename(original_name) or "file"
        relative_path = Path(user["id"]) / item_id / f"{file_id}-{safe_name}"
        destination = FILES_DIR / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        uploaded.save(destination)
        mime_type = uploaded.mimetype or "application/octet-stream"
        file_type = "image" if mime_type.startswith("image/") else "file"
        created_at = utc_now()
        db.execute(
            """
            INSERT INTO item_files (
                id, item_id, user_id, file_path, file_type,
                original_name, mime_type, size_bytes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file_id,
                item_id,
                user["id"],
                relative_path.as_posix(),
                file_type,
                original_name,
                mime_type,
                destination.stat().st_size,
                created_at,
            ),
        )
        row = db.execute(
            "SELECT * FROM item_files WHERE id = ?",
            (file_id,),
        ).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.delete("/api/files/<file_id>")
@use_local_data
def delete_item_file(user, file_id):
    with get_db() as db:
        row = db.execute(
            "SELECT file_path FROM item_files WHERE id = ? AND user_id = ?",
            (file_id, user["id"]),
        ).fetchone()
        if not row:
            return jsonify({"error": "File not found"}), 404
        db.execute(
            "UPDATE items SET cover_image_id = NULL WHERE cover_image_id = ? AND user_id = ?",
            (file_id, user["id"]),
        )
        db.execute(
            "DELETE FROM item_files WHERE id = ? AND user_id = ?",
            (file_id, user["id"]),
        )
    (FILES_DIR / row["file_path"]).unlink(missing_ok=True)
    return "", 204


@app.get("/api/files/<file_id>/content")
@use_local_data
def serve_item_file(user, file_id):
    with get_db() as db:
        row = db.execute(
            """
            SELECT file_path, original_name, mime_type
            FROM item_files WHERE id = ? AND user_id = ?
            """,
            (file_id, user["id"]),
        ).fetchone()
    if not row:
        return jsonify({"error": "File not found"}), 404
    return send_file(
        FILES_DIR / row["file_path"],
        mimetype=row["mime_type"],
        download_name=row["original_name"],
    )


@app.post("/api/files/urls")
@use_local_data
def item_file_urls(user):
    payload = request.get_json(silent=True) or {}
    file_paths = payload.get("file_paths", [])
    if not isinstance(file_paths, list):
        return jsonify({"error": "file_paths must be an array"}), 400
    if not file_paths:
        return jsonify({})
    placeholders = ",".join("?" for _ in file_paths)
    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT id, file_path FROM item_files
            WHERE user_id = ? AND file_path IN ({placeholders})
            """,
            (user["id"], *file_paths),
        ).fetchall()
    return jsonify(
        {
            row["file_path"]: f"/api/files/{row['id']}/content"
            for row in rows
        }
    )


@app.post("/api/files/thumbnails")
@use_local_data
def item_thumbnails(user):
    payload = request.get_json(silent=True) or {}
    item_ids = payload.get("item_ids", [])
    cover_images = payload.get("cover_images", {})
    if not isinstance(item_ids, list) or not item_ids:
        return jsonify([])
    placeholders = ",".join("?" for _ in item_ids)
    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT id, item_id, file_path, created_at FROM item_files
            WHERE user_id = ? AND file_type = 'image'
              AND item_id IN ({placeholders})
            ORDER BY created_at DESC
            """,
            (user["id"], *item_ids),
        ).fetchall()
    by_item = {}
    by_id = {row["id"]: row for row in rows}
    for item_id, file_id in cover_images.items():
        row = by_id.get(file_id)
        if row and row["item_id"] == item_id:
            by_item[item_id] = row
    for row in rows:
        by_item.setdefault(row["item_id"], row)
    return jsonify(
        [
            {
                "item_id": item_id,
                "file_path": row["file_path"],
                "signed_url": f"/api/files/{row['id']}/content",
            }
            for item_id, row in by_item.items()
        ]
    )


@app.get("/")
def frontend_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:path>")
def frontend_assets(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    target = FRONTEND_DIR / path
    if target.is_file():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


init_database()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
