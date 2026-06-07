# FlipSite

**Personal inventory and resale tracker** — built for people who buy and sell things and want to know if they're actually making money.

This repository is the self-hosted edition of
[FlipSite](https://github.com/avollrath/FlipSite). It runs entirely on your own
server with SQLite and local file storage.

![FlipSite landing page](src/assets/landing.jpg)

I built this because I was maintaining a spreadsheet to track my flips and it kept breaking in ways spreadsheets break — bundle math fell apart, receipts lived in email, photos were nowhere, and the profit numbers were always slightly wrong. FlipSite replaced the spreadsheet. Now I use it every day.

![Dashboard](src/assets/dashboard.jpg)
*Snapshot cards, attention prompts, and trend charts. Keeper items are tracked separately so they don't pollute resale numbers.*

<table>
<tr>
<td width="50%" valign="top">

**Track what you own**

Every item you keep — electronics, gear, furniture, anything — can have photos, receipts, manuals, and a purchase date attached. You always know what you paid, where you bought it, and where the documentation is. No more digging through email for a warranty or trying to remember if that lens cost 200 or 250.

</td>
<td width="50%" valign="top">

**Track what you flip**

Profit is sell price minus buy price, minus fees, minus shipping — and it handles bundles correctly. If you buy a camera kit for one price and sell the pieces separately, the math still works. You get the actual number you walked away with, and your ROI per flip.

</td>
</tr>
</table>

## Items

Everything lives in the items list. Table view lays out the metrics — sortable columns, profit and ROI per row, bundle relationships inline, status badges at a glance. Gallery view lets you browse by photo, which is how you actually think about physical inventory.

<table>
<tr>
<td width="50%">

![Gallery view](src/assets/items_gallery.jpg)
*Gallery — browse by photo*

</td>
<td width="50%">

![List view](src/assets/items_list.jpg)
*Table — sortable, with profit and ROI per row*

</td>
</tr>
</table>

Each item stores: name, category, condition, buy and sell price, buy and sell platform, status, dates bought and sold, notes, and any attached files.

Four statuses: **holding**, **listed**, **sold**, **keeping**. Keeping items are excluded from resale calculations — they show up in their own cards on the dashboard but don't skew your flip numbers.

Bundles let you buy a collection for one price and sell the pieces separately. Each child item tracks its own sale while the bundle correctly accounts for what the original purchase cost. The math that spreadsheets handle badly.

## Dashboard and reports

Dashboard combines the main snapshot with trend charts and filters. Activity Report gives a focused date range view for asking things like "how did I do on camera gear last quarter" or "which platform is actually working best." Bundle children stay visible as revenue detail while profit and ROI roll up to the parent bundle.

![Dashboard trends](src/assets/analytics.jpg)

## Settings

Eight color themes, each working in both light and dark mode: Midnight Drop, Forest Glass, Golden Hour, Cold Brew, Neon Petal, Cyberpunk, Cassette Futurism, Colorful 80s. Light and dark toggle independently from the theme. Six font options: Inter, DM Sans, Plus Jakarta Sans, JetBrains Mono, Michroma, Electrolize.

![Settings](src/assets/settings.jpg)

## Stack

React and TypeScript on the frontend, Vite for the build, Tailwind for styling,
and a small Flask API. SQLite stores profiles, items, bundles, and
file metadata. Attachments and avatars live on the local filesystem. No cloud
services, no accounts — everything stays on your machine.

## Running with Docker

Build and start:

```bash
docker compose up --build -d
```

The app runs on port **5001** by default (`compose.yaml` maps 5001 → 5000 inside
the container). Open `http://<your-server>:5001` in a browser.

### Persistent data

All data is stored in the volume mapped to `/data` inside the container. With the
default `compose.yaml` that is:

```text
/mnt/cache/appdata/flipsite/
├── flipsite.db       # SQLite database
├── files/            # item attachments
└── avatars/          # profile images
```

Adjust the volume path in `compose.yaml` to match your own server layout:

```yaml
volumes:
  - /your/path/appdata/flipsite:/data
```

### Unraid

The image works as a plain Docker container in Unraid's Docker manager. Set the
host path for the `/data` volume to wherever you store appdata (e.g.
`/mnt/cache/appdata/flipsite`), map host port 5001 to container port 5000, and
set the restart policy to `unless-stopped`. No template file is required.

To reverse-proxy through Nginx Proxy Manager or a similar tool, forward traffic
to `http://<unraid-ip>:5001`. If you serve the app under a sub-path (e.g.
`/flipsite/`), update `vite.config.ts` → `base` and rebuild the image.

The self-hosted edition is single-user and has no login. Only expose it on a
trusted local network.

## Supabase Migration

Export these tables as JSON:

```text
items.json
item_files.json
profiles.json
```

Download Storage buckets under:

```text
storage/item-files/
storage/avatars/
```

Run:

```bash
python backend/import_export.py \
  --database /data/flipsite.db \
  --export-dir /migration \
  --files-dir /data/files \
  --avatars-dir /data/avatars
```

The importer requires an empty local database. It selects the single non-demo
user from the export, or accepts `--source-user-id` when needed.

Useful checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```


The demo inventory is seeded with realistic Finnish and European marketplace items — bundle examples, believable prices, local photos.
