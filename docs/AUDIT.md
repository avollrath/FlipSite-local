# FlipSite Audit Report

> Historical audit from the original Supabase edition. Supabase findings do
> not describe the current FlipSite-local runtime.
Generated: 2026-05-02

## Summary
24 issues found -- 4 High, 12 Medium, 8 Low

---

## 1. Code Quality & Consistency

### [HIGH] Platform split is still coupled to the legacy `platform` column
**File:** `src/hooks/useItems.ts:124-127`, `src/components/items/ItemDrawer.tsx:273-275`, `src/components/items/ItemDrawer.tsx:364-366`, `src/pages/ImportExport.tsx:325-327`, `src/types/index.ts:11-13`  
**Issue:** The app now supports `buy_platform` and `sell_platform`, but insert payloads still include `platform`. This is transitional, but the manual SQL note says `platform` may eventually be dropped. If it is dropped while the app still sends `platform`, inserts will fail with an unknown-column error.  
**Recommendation:** Keep `platform` only in read fallback helpers. Before dropping the DB column, remove it from `NewItem` insert/update payloads and use a compatibility layer that conditionally omits legacy fields.

### [MEDIUM] Several components/pages are too large to maintain comfortably
**File:** `src/components/items/ItemDrawer.tsx:1`, `src/pages/Items.tsx:1`, `src/pages/Analytics.tsx:1`, `src/pages/Dashboard.tsx:1`, `src/pages/Settings.tsx:1`  
**Issue:** Line counts are approximately 1532, 1320, 1281, 821, and 430 respectively. These files mix data shaping, UI rendering, chart formatting, mutation workflows, and utility logic.  
**Recommendation:** Split by responsibility: item form state, file section, bundle child editor, item list filters, chart data builders, and settings panels.

### [MEDIUM] Analytics logic is duplicated between the page and shared helper module
**File:** `src/pages/Analytics.tsx:1027-1229`, `src/lib/analytics.ts:37-168`  
**Issue:** `Analytics.tsx` defines local summary, monthly, profit breakdown, sold item, and filtering helpers while `src/lib/analytics.ts` already exports similar functions. This increases the chance that dashboard/categories/analytics drift in keeper, bundle, or platform handling.  
**Recommendation:** Move analytics calculations into `src/lib/analytics.ts` and make the page consume shared, tested helpers.

### [MEDIUM] Chart utilities and formatting are duplicated
**File:** `src/pages/Dashboard.tsx:843-875`, `src/pages/Analytics.tsx:1296-1335`  
**Issue:** Chart color extraction, compact currency formatting, and date bucketing live independently in dashboard and analytics. `Dashboard` still computes a `pie` palette even after the donut was replaced.  
**Recommendation:** Extract chart color and compact currency helpers into a shared chart utility and delete unused palette computation.

### [MEDIUM] Date handling uses several unrelated formats/parsers
**File:** `src/lib/utils.ts:151-162`, `src/lib/dateInput.ts:1-95`, `src/pages/Dashboard.tsx:817-840`, `src/pages/Analytics.tsx:1231-1260`  
**Issue:** The app mixes `date-fns`, `Intl.DateTimeFormat`, native `Date`, and string parsing such as `new Date(`${value} 1`)`. Month labels become locale-dependent strings and then get parsed back into dates.  
**Recommendation:** Store chart buckets as stable `yyyy-MM` keys and format only at render time. Keep one shared date formatting strategy for display.

### [LOW] Inline styles bypass the design-token/Tailwind pattern in several places
**File:** `src/pages/Items.tsx:1082-1097`, `src/components/charts/KPICard.tsx:61-65`, `src/pages/Settings.tsx:425-431`, `src/pages/Dashboard.tsx:410`, `src/pages/Analytics.tsx:942-993`  
**Issue:** Some inline styles are legitimate dynamic values, but they are scattered and inconsistent. Examples include gallery scrim gradients, KPI radial backgrounds, chart labels, legend dots, and font previews.  
**Recommendation:** Keep dynamic chart/font styles inline where necessary, but move reusable visual primitives such as gallery scrims and KPI glows into named CSS utilities.

### [LOW] Hardcoded non-theme colors remain in special-case code
**File:** `src/lib/compressImage.ts:103`, `src/pages/Items.tsx:1094-1097`, `src/assets/vite.svg:1`, `src/assets/react.svg:1`  
**Issue:** `#ffffff` is used as the JPEG compression background, and gallery overlays use fixed black `rgba(...)`. These are intentional technical/contrast choices, but they bypass the theme system. The Vite/React SVGs also contain hardcoded colors.  
**Recommendation:** Leave compression and scrim colors if intentional, but document them as exceptions. Remove unused Vite/React assets.

### [LOW] Prop naming and action naming are mostly consistent, but component-local handlers vary
**File:** `src/components/items/ItemDrawer.tsx:315-340`, `src/components/items/ItemDrawer.tsx:981-1024`, `src/components/ImageLightbox.tsx:11-17`  
**Issue:** Public props are generally consistent (`onClose`, `onChange`, `onOpenChange`), but large local components mix `handle*`, `upload*`, `refresh*`, and `open*` names across similar async flows.  
**Recommendation:** When splitting `ItemDrawer`, normalize action names per subcomponent (`onUpload`, `onDelete`, `onRefresh`) and keep implementation functions private.

---

## 2. Dead Code & Leftovers

### [MEDIUM] Unused shadcn-style UI components are still present
**File:** `src/components/ui/popover.tsx:1-34`, `src/components/ui/command.tsx:1-103`  
**Issue:** `rg` finds no imports of these components outside their own files. Their packages (`@radix-ui/react-popover`, `cmdk`) may therefore be unnecessary too.  
**Recommendation:** Delete unused components and remove unused dependencies if no planned feature needs them.

### [LOW] Unused scaffold assets remain in `src/assets`
**File:** `src/assets/vite.svg:1`, `src/assets/react.svg:1`  
**Issue:** These starter assets are not referenced by the app.  
**Recommendation:** Remove them to reduce noise.

### [LOW] `src/App.css` appears unused
**File:** `src/App.css:1-158`  
**Issue:** No import of `App.css` appears in `src`. The app uses `src/index.css` and Tailwind instead.  
**Recommendation:** Delete `App.css` after confirming no build tooling imports it implicitly.

### [LOW] Unused utility exports remain
**File:** `src/lib/utils.ts:37-49`, `src/lib/utils.ts:191-192`  
**Issue:** `calcROI` and `selectTriggerClass` are exported but not imported anywhere. `calcProfit` is used, but `calcROI` has no current caller.  
**Recommendation:** Remove unused exports or add tests/callers if they are intended shared APIs.

### [LOW] Some shared analytics exports are unused after page-local rewrites
**File:** `src/lib/analytics.ts:41-112`  
**Issue:** `buildAnalyticsSummary`, `buildProfitByCategory`, and `buildProfitByPlatform` are exported but not used by current pages.  
**Recommendation:** Either reuse them from `Analytics.tsx` or delete them.

### [LOW] Duplicate Tailwind classes appear in several className strings
**File:** `src/components/items/ItemDrawer.tsx:429`, `src/components/items/ItemDrawer.tsx:775`, `src/components/items/ItemDrawer.tsx:853`, `src/components/items/ItemDrawer.tsx:870`, `src/pages/Items.tsx:1083`  
**Issue:** Several strings contain repeated classes such as duplicate `bg-surface-2`, duplicate hover classes, or overlapping `border-accent` variants.  
**Recommendation:** Deduplicate when touching these components next.

### [LOW] No TODO/FIXME/HACK or production `console.log` statements found
**File:** `src/**`, `supabase/**`  
**Issue:** The audit did not find leftover TODO/FIXME/HACK markers or console logging.  
**Recommendation:** No action needed.

### [LOW] Font imports match the active font list
**File:** `index.html:8`, `src/lib/theme.ts:79-99`, `src/index.css:20-37`  
**Issue:** No stale Lora/Jersey imports were found. Imported Google Fonts match active options.  
**Recommendation:** No action needed.

---

## 3. Security

### [HIGH] Schema allows cross-user bundle references unless constrained elsewhere
**File:** `supabase/schema.sql:144-146`, `src/pages/ImportExport.tsx:318`, `src/hooks/useItems.ts:358-370`  
**Issue:** `bundle_id` is only a foreign key to `items(tsid)` in the manual migration note. RLS on inserted rows checks the inserted row's `user_id`, but it does not prove the referenced parent bundle belongs to the same user. A guessed UUID could create a cross-user relationship even if the other item remains unreadable.  
**Recommendation:** Add a trigger or composite foreign key pattern that enforces child `user_id` matches parent `user_id`, and validate imported `bundle_id` values client-side before insert.

### [MEDIUM] Raw Supabase/internal errors are shown directly to users
**File:** `src/hooks/useItems.ts:229-231`, `src/pages/Categories.tsx:85-87`, `src/pages/ImportExport.tsx:135-137`, `src/pages/Login.tsx:45-48`, `src/lib/itemFiles.ts:34-39`  
**Issue:** Several catch/onError paths pass `error.message` directly to `toast.error` or UI state. This can leak table/column names, policy names, constraint names, or SQL wording.  
**Recommendation:** Log detailed errors only in development and show stable, user-safe messages in production.

### [MEDIUM] `item_files` queries rely mostly on RLS rather than explicit user filters
**File:** `src/lib/itemFiles.ts:92-103`, `src/lib/itemFiles.ts:106-123`, `src/lib/itemFiles.ts:148-156`  
**Issue:** `getItemFiles`, `deleteItemFile`, and thumbnail queries do not add `user_id = auth.uid()` in the query. RLS policies protect rows, but explicit filters reduce accidental over-fetching and make intent obvious.  
**Recommendation:** After retrieving the authenticated user, include `user_id` filters on item file queries where possible.

### [MEDIUM] Storage upload policy has no ownership check against an item id in the path
**File:** `supabase/schema.sql:119-127`  
**Issue:** The storage insert policy verifies only that the first path segment is the user's id. It does not verify that the second segment is an item id owned by that user. The DB insert policy catches mismatched `item_files` rows, but raw orphan objects can be uploaded under any `{user_id}/{item_id}/...` path.  
**Recommendation:** Add server-side cleanup for orphaned uploads or enforce path/item ownership through a storage policy helper if feasible.

### [LOW] Auth-protected routes are correctly gated before app pages render
**File:** `src/App.tsx:24-37`, `src/hooks/useItems.ts:29-35`  
**Issue:** Protected routes show a loader while auth is resolving, and item queries are disabled without a user id.  
**Recommendation:** No action needed.

### [LOW] LocalStorage contains only UI preferences/defaults
**File:** `src/lib/theme.ts:116-130`, `src/lib/settings.ts:38-89`, `src/pages/Items.tsx:339-341`  
**Issue:** Stored values include theme, font, default category/platform/status/condition, and preferred item view. No tokens or secrets were found in app-controlled localStorage keys.  
**Recommendation:** No action needed; avoid adding auth/session data to localStorage manually.

### [LOW] Environment variables are not committed with secrets
**File:** `.env.example:1-2`, `src/lib/supabase.ts:3-7`  
**Issue:** `.env.example` only contains empty `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` placeholders. The public anon key is necessarily exposed to the browser through Vite.  
**Recommendation:** Keep service role keys out of Vite env vars.

### [LOW] Package set does not show obvious vulnerable patterns from static reading
**File:** `package.json:14-42`  
**Issue:** No server-side secret-handling packages or deprecated auth libraries stand out. The repo includes `@shadcn/ui`, `cmdk`, and Radix Popover even though related components appear unused.  
**Recommendation:** Run `npm audit` separately and prune unused UI dependencies.

---

## 4. Data Handling & Integrity

### [HIGH] `schema.sql` is not a faithful current schema
**File:** `supabase/schema.sql:3-18`, `supabase/schema.sql:139-155`  
**Issue:** The base `items` table still defines `platform text not null` and omits `bundle_id`, `is_bundle_parent`, `buy_platform`, and `sell_platform`. Those are only manual comment blocks. A fresh setup from `schema.sql` would not match the app's current TypeScript model and insert payloads.  
**Recommendation:** Convert manual ALTER blocks into real migrations and update the canonical schema to reflect the current DB state.

### [HIGH] Optional `DROP COLUMN platform` note conflicts with current app writes
**File:** `supabase/schema.sql:154-155`, `src/components/items/ItemDrawer.tsx:273`, `src/pages/ImportExport.tsx:326`, `src/hooks/useItems.ts:126`  
**Issue:** The schema note says dropping `platform` is optional after verification, but the app still sends `platform` on several insert paths. Running the drop now would break creates/imports.  
**Recommendation:** Remove all write-time `platform` payloads before telling operators the column can be safely dropped.

### [MEDIUM] Existing bundle children do not inherit changed parent platform/date fields on edit
**File:** `src/components/items/ItemDrawer.tsx:340-370`  
**Issue:** New bundle children inherit parent `bought_at` and buy platform, but existing child updates only write name/category/condition/status/buy price. If the parent's bought-from platform changes, existing children keep stale values.  
**Recommendation:** Decide whether inheritance is one-time or live. If live, update child `buy_platform` and relevant dates when the parent changes.

### [MEDIUM] Dashboard monthly buy volume includes keeper purchases
**File:** `src/pages/Dashboard.tsx:689-700`  
**Issue:** This may be intentional based on prior requirements, but it is inconsistent with some "investment inventory" wording. The buy side includes all aggregate items including keepers while sell/profit excludes keepers.  
**Recommendation:** Rename the chart or document that "Buy Volume" means cash spent, including kept items.

### [MEDIUM] Financial values are calculated with JavaScript floats
**File:** `src/lib/utils.ts:22-49`, `src/pages/Dashboard.tsx:565-577`, `src/pages/Analytics.tsx:1047-1069`, `src/lib/analytics.ts:54-69`  
**Issue:** Supabase stores `numeric(12,2)`, but the client sums decimal currency values as JS numbers. Small rounding errors can accumulate over many items.  
**Recommendation:** Store/compute cents as integers in client calculations or round to cents after every aggregate.

### [MEDIUM] Date bucketing parses localized month labels back into dates
**File:** `src/pages/Dashboard.tsx:835-840`, `src/pages/Analytics.tsx:1287-1295`, `src/lib/analytics.ts:190-196`  
**Issue:** Month labels are produced by `Intl.DateTimeFormat` and later parsed with `new Date(`${label} 1`)`. This is fragile across locales and can sort incorrectly.  
**Recommendation:** Use stable bucket keys such as `2026-05`, sort by the key, and format labels for display only.

### [MEDIUM] CSV import can partially create rows without transaction semantics
**File:** `src/pages/ImportExport.tsx:123-137`  
**Issue:** Bulk insert is one request, but there is no higher-level recovery or duplicate detection. If Supabase returns partial behavior or future import logic becomes multi-step, the UI only reports a raw error and cannot roll back dependent data.  
**Recommendation:** Keep import as a single insert or move import into an RPC/Edge Function if bundle reconstruction or file references are added.

### [LOW] Keeper exclusions are mostly consistent in profit/revenue calculations
**File:** `src/lib/utils.ts:69-118`, `src/pages/Dashboard.tsx:550-724`, `src/pages/Analytics.tsx:1215-1224`, `src/lib/analytics.ts:37-39`  
**Issue:** Core profit, sell value, ROI, dashboard, and analytics helpers exclude keepers for profit/revenue. Category stats intentionally count all buy value in `totalBuyValue`.  
**Recommendation:** Add regression tests for keeper behavior across dashboard and analytics calculations.

### [LOW] Null handling is mostly defensive, but item buy prices are assumed present
**File:** `src/pages/Dashboard.tsx:697`, `src/pages/Analytics.tsx:1060`, `src/lib/analytics.ts:54`  
**Issue:** `buy_price` is `not null` in schema, so this is safe under current DB rules. If imported or legacy data violates that assumption, totals can become `NaN`.  
**Recommendation:** Keep schema constraints, or use `(item.buy_price ?? 0)` consistently in aggregates.

### [LOW] No optimistic updates were found
**File:** `src/hooks/useItems.ts:80-224`, `src/components/items/ItemDrawer.tsx:954-990`  
**Issue:** Mutations invalidate queries after success rather than mutating cache optimistically. This avoids most stale rollback problems.  
**Recommendation:** No action needed unless optimistic UI is introduced later.

---

## 5. Quick Wins

- Delete `src/assets/vite.svg`, `src/assets/react.svg`, and likely `src/App.css` if confirmed unused.
- Remove unused exports `calcROI` and `selectTriggerClass` from `src/lib/utils.ts`.
- Remove unused `src/components/ui/popover.tsx` and `src/components/ui/command.tsx`, then prune `@radix-ui/react-popover` and `cmdk` if no future use is planned.
- Replace raw Supabase error toasts with stable user-facing messages in `Categories`, `ImportExport`, `Login`, and mutation hooks.
- Convert the platform and bundle comment blocks in `supabase/schema.sql` into real migrations before the next schema-dependent feature.
