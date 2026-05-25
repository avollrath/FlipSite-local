# FlipSite

**Personal inventory and resale tracker** — built for people who buy and sell things and want to know if they're actually making money.

[**Live demo →**](https://flipsite-three.vercel.app/) &nbsp;·&nbsp; Demo login: `demo@flipsite.app` / `demo1234`

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

React and TypeScript on the frontend, Vite for the build, Tailwind for styling. Supabase handles auth, Postgres, file storage, and row-level security — the schema includes a bundle ownership trigger that keeps profit math consistent when items are reparented. TanStack Query for data fetching, Recharts for the charts, GSAP for landing page animations, deployed on Vercel.

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create a Supabase project, enable Email/Password auth, and run `supabase/schema.sql` in the SQL editor.

Useful checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

## Demo

The live demo runs at [flipsite-three.vercel.app](https://flipsite-three.vercel.app/) with a read-only demo account:

`demo@flipsite.app` / `demo1234`

The demo inventory is seeded with realistic Finnish and European marketplace items — bundle examples, believable prices, local photos.
