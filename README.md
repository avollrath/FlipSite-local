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
and a small Flask API. SQLite stores accounts, profiles, items, bundles, and
file metadata. Attachments and avatars live on the local filesystem.

## Docker

Create a `.env` file:

```env
FLIPSITE_SECRET_KEY=replace-with-a-long-random-value
FLIPSITE_ALLOW_SIGNUP=false
```

Then start the app:

```bash
docker compose up --build -d
```

The Unraid configuration stores persistent data in:

```text
/mnt/cache/appdata/flipsite/
|-- flipsite.db
|-- files/
`-- avatars/
```

The application is designed to be reverse-proxied at:

```text
http://jonsbo.local/flipsite/
```

On a fresh database, the first account can sign up. Further account creation is
disabled unless `FLIPSITE_ALLOW_SIGNUP=true`.

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

Create your local account in the browser, then run:

```bash
python backend/import_export.py \
  --database /data/flipsite.db \
  --export-dir /migration \
  --files-dir /data/files \
  --avatars-dir /data/avatars \
  --email you@example.com
```

The importer requires an empty local account and does not accept or store your
password.

Useful checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```


The demo inventory is seeded with realistic Finnish and European marketplace items — bundle examples, believable prices, local photos.
