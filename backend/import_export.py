import argparse
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def load_json(path):
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main():
    parser = argparse.ArgumentParser(
        description="Import Supabase JSON exports into a FlipSite-local database."
    )
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--export-dir", required=True, type=Path)
    parser.add_argument("--files-dir", required=True, type=Path)
    parser.add_argument("--avatars-dir", required=True, type=Path)
    parser.add_argument("--source-user-id")
    args = parser.parse_args()

    items = load_json(args.export_dir / "items.json")
    item_files = load_json(args.export_dir / "item_files.json")
    profiles = load_json(args.export_dir / "profiles.json")
    users = load_json(args.export_dir / "users.json")

    source_user_id = args.source_user_id
    if not source_user_id:
        personal_users = [
            row for row in users
            if str(row.get("email", "")).lower() != "demo@flipsite.app"
        ]
        source_user = personal_users[0] if len(personal_users) == 1 else None
        if source_user:
            source_user_id = source_user["id"]
    if not source_user_id:
        source_ids = {
            row.get("user_id")
            for row in items
            if isinstance(row, dict) and row.get("user_id")
        }
        if len(source_ids) != 1:
            raise SystemExit("Provide --source-user-id when export contains zero or multiple users.")
        source_user_id = source_ids.pop()

    connection = sqlite3.connect(args.database)
    connection.execute("PRAGMA foreign_keys = ON")
    imported_items = 0
    imported_files = 0
    try:
        user_id = "local"
        existing_items = connection.execute(
            "SELECT COUNT(*) FROM items WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        if existing_items:
            raise SystemExit("Local database already has items; import requires an empty database.")

        profile = next((row for row in profiles if row.get("id") == source_user_id), {})
        avatars_root = args.export_dir / "storage" / "avatars"
        if (avatars_root / "avatars").is_dir():
            avatars_root /= "avatars"
        source_avatar = avatars_root / source_user_id / "avatar.webp"
        avatar_url = None
        if source_avatar.exists():
            args.avatars_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_avatar, args.avatars_dir / f"{user_id}.webp")
            avatar_url = f"/api/avatars/{user_id}.webp"
        connection.execute(
            """
            INSERT INTO profiles (id, username, avatar_url, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                avatar_url = excluded.avatar_url,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                profile.get("username"),
                avatar_url,
                profile.get("updated_at") or utc_now(),
            ),
        )

        for row in sorted(items, key=lambda item: bool(item.get("bundle_id"))):
            if row.get("user_id") != source_user_id:
                continue
            connection.execute(
                """
                INSERT INTO items (
                    tsid, user_id, name, category, condition, buy_price, sell_price,
                    buy_platform, sell_platform, status, bought_at, sold_at, notes,
                    bundle_id, is_bundle_parent, cover_image_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["tsid"],
                    user_id,
                    row["name"],
                    row["category"],
                    row["condition"],
                    row["buy_price"],
                    row.get("sell_price"),
                    row.get("buy_platform") or row.get("platform"),
                    row.get("sell_platform"),
                    row["status"],
                    row["bought_at"],
                    row.get("sold_at"),
                    row.get("notes"),
                    row.get("bundle_id"),
                    bool(row.get("is_bundle_parent")),
                    row.get("cover_image_id"),
                    row.get("created_at") or utc_now(),
                ),
            )
            imported_items += 1

        storage_root = args.export_dir / "storage" / "item-files"
        if (storage_root / "item-files").is_dir():
            storage_root /= "item-files"
        for row in item_files:
            if row.get("user_id") != source_user_id:
                continue
            source = storage_root / row["file_path"]
            suffix = Path(row.get("original_name") or row["file_path"]).name
            relative_path = Path(user_id) / row["item_id"] / f"{row['id']}-{suffix}"
            destination = args.files_dir / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            if source.exists():
                shutil.copy2(source, destination)
            connection.execute(
                """
                INSERT INTO item_files (
                    id, item_id, user_id, file_path, file_type, original_name,
                    mime_type, size_bytes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["item_id"],
                    user_id,
                    relative_path.as_posix(),
                    row["file_type"],
                    row.get("original_name"),
                    row.get("mime_type"),
                    row.get("size_bytes"),
                    row.get("created_at") or utc_now(),
                ),
            )
            imported_files += 1

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Imported {imported_items} items and {imported_files} file records.")


if __name__ == "__main__":
    main()
