# FlipSite

Self-hosted inventory and resale tracker. React/TypeScript frontend, Flask API, SQLite database, local file storage. No cloud services, no accounts.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Flask (Python), Gunicorn
- **Storage:** SQLite + local filesystem
- **Container:** Single Docker image, port 5000

## Features

- Items with four statuses: `holding`, `listed`, `sold`, `keeping`
- Profit = sell − buy − fees − shipping, with correct bundle math
- Bundles: one purchase price split across multiple sold child items
- Keepers excluded from resale calculations
- Table and gallery views, sortable columns, per-row profit and ROI
- Dashboard with snapshot cards and trend charts
- Activity report with date range and platform filters
- File attachments (photos, receipts, manuals) per item
- Eight color themes, light/dark mode, six font options

## Docker

```bash
docker compose up --build -d
```

Port mapping: host `5001` → container `5000`. Adjust in `compose.yaml`.

### Persistent data

Mount a host directory to `/data` inside the container:

```yaml
volumes:
  - /your/appdata/flipsite:/data
```

Container writes:

```
/data/
├── flipsite.db
├── files/
└── avatars/
```

### Unraid

In Unraid's Docker manager: map host path (e.g. `/mnt/cache/appdata/flipsite`) to container path `/data`, host port 5001 to container port 5000, restart policy `unless-stopped`. No template required.

To reverse-proxy via Nginx Proxy Manager, point to `http://<unraid-ip>:5001`. If serving under a sub-path, update `base` in `vite.config.ts` and rebuild.

Single-user, no authentication. Keep on a trusted local network.

## Supabase Migration

Export from Supabase dashboard as JSON:

```
items.json
item_files.json
profiles.json
```

Download storage buckets to:

```
storage/item-files/
storage/avatars/
```

Run the importer against an empty local database:

```bash
python backend/import_export.py \
  --database /data/flipsite.db \
  --export-dir /migration \
  --files-dir /data/files \
  --avatars-dir /data/avatars
```

Pass `--source-user-id` if the export contains multiple non-demo users.

## Development

```bash
npm run lint
npm test
npm run typecheck
npm run build
```
