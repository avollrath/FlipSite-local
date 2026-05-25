# FlipSite Repo Audit

## Executive Summary

FlipSite is a functional, coherent React/Supabase app with a clear product center: items, resale status, bundles, files, and profit visibility. The recent dashboard simplification improved the product direction, but the repo still shows many signs of organic iteration: very large page files, duplicated business rules, stale analytics helpers, mixed UI patterns, and accounting semantics spread across views.

Overall health: **medium**. The app builds, lints, and has a small useful test suite, but future changes are likely to regress business logic because bundle, keeping, profit, date, and filter rules are duplicated across `src/lib/utils.ts`, `src/lib/analytics.ts`, `src/pages/Items.tsx`, `src/pages/PeriodReport.tsx`, and `src/components/items/ItemDrawer.tsx`.

Latest validation run:

- `npm run lint` passed.
- `npm test` passed: 13 files, 66 tests.
- `npm run typecheck` passed.
- `npm run build` passed; route-level code splitting is active and the initial app chunk is no longer the full app bundle.

## Post-audit status

This section records the cleanup/refactor phase completed after the original audit. Findings below this section are retained as historical audit context; items listed here have been addressed or deliberately deferred.

### Completed

- Accounting centralization: `src/lib/itemAccounting.ts` now owns shared profit, ROI, sell value, keeping, sold/unsold, and bundle accounting helpers with fixture-driven tests.
- Bundle semantics: bundle children are revenue detail records, not standalone profit centers; child profit/ROI remain unavailable and aggregate profit/ROI rolls up to the parent bundle.
- ItemDrawer split: item details, bundle editing, file sections, payload mapping, and bundle child mapping were extracted from the drawer shell.
- Items page split: item list model, CSV export, table components, and gallery components were extracted from `src/pages/Items.tsx`.
- Period Report split: date/report model logic and report item components were extracted, and report calculations now rely on shared accounting semantics where safe.
- Item index/domain layer: `src/domain/items/itemIndex.ts` centralizes item relationship maps and derived aggregate collections.
- Route lazy loading: large routes are lazy-loaded from `src/App.tsx`, reducing the initial JS bundle from roughly 1.2 MB to roughly 238 KB minified.
- README/DX update: README reflects the merged Dashboard/report model, and `npm run typecheck` is available.

### Intentionally deferred

- Full TypeScript strict mode remains off. Supabase response typing was improved, but enabling strict mode should be a separate migration.
- Generated Supabase database types are still not wired in. The current typed client uses hand-maintained table shapes.
- Storage delete transaction cleanup remains deferred because it needs backend/storage behavior review.
- Pagination or virtualization for very large inventories remains deferred until real inventory size makes it necessary.
- Stale screenshots/assets and root data/design artifacts still need a separate content/assets cleanup pass.

### Remaining risks

- Analytics is still the largest async route chunk because charts and Recharts live there.
- Some historical helper exports remain for compatibility and should only be removed with caller verification.
- Demo-mode write blocking is client-side convenience, not a security boundary.
- Multi-step client mutations such as CSV import, category updates, bundle saves, and storage deletes are still not transactional.

### Recommended stopping point

Stop architecture cleanup here and resume normal feature work. Next maintenance pass should be scoped to one concrete goal, preferably strict-mode preparation, generated Supabase types, or storage consistency.

## Current Risks

These are the active risks after the cleanup/refactor phase. They supersede the older risk lists in the original audit snapshot below.

### Critical

- **Multi-step client mutations are still not transactional.** CSV import, category updates, bundle saves, bundle parent status sync, and storage deletes can partially fail because they run as client-side sequences.
- **Storage deletion can leave inconsistent state.** `deleteItemFile` removes the storage object first, then deletes the DB row. If DB deletion fails, the DB can point at a missing object.
- **Demo-mode write blocking is client-side convenience.** Real protection still depends on Supabase auth/RLS; client-only demo guards are not a security boundary.

### Medium

- **Full TypeScript strict mode remains deferred.** Supabase response typing improved, but `strict`, `strictNullChecks`, `noUncheckedIndexedAccess`, and generated Supabase types are still future work.
- **Large inventories still need a scale strategy.** The app fetches all items for major views and renders full filtered result sets. Pagination, virtualization, or server-side filtering should wait until real inventory size justifies it.
- **Analytics remains the largest async route chunk.** Route lazy loading fixed initial bundle size, but the dashboard/chart route is still heavy because of Recharts and chart UI.
- **Some historical helper exports remain.** Compatibility exports should only be removed after caller verification.

### Low

- **Docs/assets cleanup remains separate.** Screenshots, design files, CSV/XLSX artifacts, and older assets still need a content pass.
- **UI terminology still deserves polish.** Status/filter language is better centralized than before, but "inventory", "holding", "keeping", and "keeper" can still be confusing.

## Original Audit Snapshot

Historical findings from the initial audit are preserved below for context. Some items were resolved during the cleanup phase documented in **Post-audit status** and should not be treated as current repo state without re-verifying.

## Biggest Risks

### Critical

- **Profit/accounting definitions are not centralized enough.** `src/lib/utils.ts` owns `calculateItemProfit`, `calculateItemSellValue`, `calculateItemROI`, and `getEffectiveItemStatus`; `src/lib/analytics.ts` adds dashboard/report-style aggregations; `src/pages/PeriodReport.tsx` has its own `buildSummary` that computes `totalProfit = totalRevenue - soldCost` rather than reusing `calculateItemProfit`. This makes it easy for Dashboard, Period Report, CSV export, and Items table to disagree again.
- **Bundle math is under-modeled.** Bundle parent profit subtracts only parent `buy_price`; bundle child profit returns only `sell_price` in `calculateItemProfit`. That can be reasonable for aggregate parent rows, but child rows displayed independently can show misleading profit unless UI explains that split cost is not true standalone cost. Period report sold cost uses `item.buy_price`, which may double-count or undercount bundles depending on whether parent and children are included.
- **Large files are now architectural bottlenecks.** `src/components/items/ItemDrawer.tsx` is 1754 lines, `src/pages/Items.tsx` is 1527 lines, `src/pages/PeriodReport.tsx` is 1130 lines, and `src/pages/Analytics.tsx` is 961 lines. Each file mixes data rules, rendering, form state, derived calculations, and view-specific UX. That is the biggest maintainability risk.
- **Storage deletion can leave inconsistent state.** `deleteItemFile` in `src/lib/itemFiles.ts` removes the storage object first, then deletes the DB row. If DB deletion fails, the DB points at a missing object. Upload handles rollback in the other direction, but delete does not.

### Medium

- **`tsconfig` is not strict.** `tsconfig.app.json` has useful unused checks but no `strict`, `strictNullChecks`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes`. Several current casts like `(data as Item[])` hide Supabase typing risk.
- **Dashboard cleanup left legacy exports in `src/lib/analytics.ts`.** `buildSummary`, `buildMonthlyRevenue`, `buildMonthlyProfit`, `buildTopFlips`, `buildRoiDistribution`, `buildDurationProfit`, and `buildCumulativeProfit` appear unused by current dashboard. Some may be useful later, but today they increase API surface and invite old patterns back.
- **Docs and screenshots are stale.** `README.md` still describes "Nine KPI cards, four charts" and a separate Analytics page, while the app now has Dashboard merged with analytics and simplified cards.
- **Client-side bulk mutations are fragile.** Category rename/merge, CSV import, bundle child saves, and bundle parent status sync are multi-step client operations without transaction boundaries.

### Low

- **`Flipping.csv`, `flipping.xlsx`, old logo SVGs, and design files are in the repo root/assets.** Some are probably source assets, some look like seed/data artifacts. They add noise and make onboarding harder.
- **Vite chunk-size warning is persistent.** Current build emits roughly a 1.2 MB main JS chunk. Acceptable for a side project, but worth watching.

## Architectural Observations

- Routing is simple and readable in `src/App.tsx`, but route components are too broad. `Items`, `PeriodReport`, `Analytics`, `Settings`, `ImportExport`, and `Categories` are page-level monoliths with local helper functions instead of feature modules.
- Feature boundaries are mostly implicit. There is no `features/items`, `features/dashboard`, `features/files`, or `features/bundles` split. Hooks and helpers exist, but core rules still live inside pages.
- `src/components/items/ItemDrawer.tsx` combines add-item form, edit-item form, bundle editing, pending file upload, existing file upload/delete, lightbox, suggestion combobox, delete panel, and profit preview. This is the clearest refactor hotspot.
- `src/pages/Items.tsx` combines list/grid layout, filters, URL param interpretation, sorting, CSV export, gallery sizing, table row rendering, gallery cards, status chips, bundle expansion, modals, empty/loading states, and CSV download helper.
- `src/pages/PeriodReport.tsx` duplicates Items row/card components and metrics logic. It should eventually reuse smaller Item row/card primitives or a shared item-table model.
- `src/lib/analytics.ts` is doing two jobs: reusable analytics functions and now dashboard metrics. That is fine short-term, but the old analytics exports should be classified as active, deprecated, or deleted later.
- `src/index.css` contains global app styles and a large landing-page design system in one file. Landing CSS comments appear encoding-corrupted in terminal output, and the file mixes product app tokens with marketing page utilities.
- Route naming still includes `/analytics` redirecting to `/dashboard`, which is fine for compatibility. Future docs/menu should stop referring to Analytics as a separate product area.

## Data Correctness Risks

- `calculateItemProfit` in `src/lib/utils.ts` has special bundle behavior:
  - Bundle parent: `parent sell + child sells - parent buy`.
  - Bundle child: `child sell_price`.
  - Standalone: `sell - buy`.
  This is not self-explanatory and is risky when child rows are shown in report/table contexts.
- `calculateItemROI` treats bundle children differently from `calculateItemProfit`: child ROI uses `(sell - buy) / buy`, while child profit returns `sell_price`. That means child profit and ROI are not based on the same numerator.
- `getSoldAggregateItems` in `src/lib/analytics.ts` requires effective status `sold` and sell value > 0. If an item is marked sold with zero sell price, it is excluded from dashboard revenue/profit. That may be intentional, but the UI allows `0,00` as valid money input and should define whether free/disposal sales count.
- `PeriodReport` calculates `totalProfit` independently from sold revenue minus sold item `buy_price`; it does not use `calculateItemProfit`. This can diverge for bundles.
- `PeriodReport.getBestFlip` chooses highest ROI, while Dashboard now chooses highest absolute profit. Both labels say "Best Flip" but mean different things.
- `isKeepingItem` treats category `"keeper"` or `"keeping"` as keeping even if status is not keeper. This is a legacy compatibility feature, but it means category naming changes can alter accounting semantics.
- Inventory filters differ by view:
  - Items `inventoryOnly` includes `holding`, `listed`, and `keeper`.
  - Dashboard cash tied up excludes keepers.
  This is defensible, but terminology should be clearer because "inventory" sometimes includes keepers and sometimes excludes them.
- Date parsing is split:
  - `src/lib/dateInput.ts` supports `dd/MM/yyyy` and native `yyyy-mm-dd`.
  - `src/pages/PeriodReport.tsx` has its own `parseDateInput`.
  - Analytics uses another local date-range helper.
  Multiple date parsers increase timezone and validation drift.
- `toSupabaseTimestamp` uses local midnight converted to ISO. Depending on user timezone, stored `timestamptz` can display as previous/next UTC date in other contexts.
- Currency formatting is consistently `de-DE` EUR in `formatCurrency`, but CSV/template examples omit the euro sign and money parsing strips a corrupted-looking `â‚¬` token in terminal output. Check file encoding and actual source bytes before changing.
- Import/export includes `bundle_id` and `is_bundle_parent`, but CSV import inserts rows directly into `items`. If imported bundle children reference parents not already present or not ordered correctly, trigger/policy can reject rows. There is no import strategy for remapping bundle IDs.

## UX/UI Findings

- Dashboard is much clearer after simplification. It now answers casual-user questions better than the prior admin-style analytics page.
- Items page is still dense. Filter bar, gallery/list controls, table columns, chips, drawer interactions, bundle states, and image state all compete for attention.
- Gallery/list parity has improved, but parity is maintained manually in `Items.tsx`. Status chip classes, bundle badges, metrics, and thumbnail behavior exist in separate render paths.
- Status terminology is inconsistent:
  - DB status is `keeper`.
  - UI often says "Keeping".
  - Filters sometimes show "Inventory", "In Inventory", "Holding", and "Keeping".
  Casual users can understand these, but accounting rules should use one product vocabulary.
- The edit drawer carries too many responsibilities. For a casual flipper, adding/editing item details, bundle management, file management, delete, and profit preview in one drawer can feel heavy.
- File upload UX has thoughtful pending upload handling, but failed pending uploads after item creation are easy to miss once the drawer closes or user navigates.
- `Categories` uses `window.confirm`, which feels out of step with the rest of the polished UI.
- Mobile nav has many destinations in a 3-column grid, likely spanning multiple rows. That can work, but it deserves a deliberate mobile IA pass.
- Empty states exist and are generally useful, but they are local and inconsistent in tone. Dashboard charts say "No sold items match these filters", Items says "Start tracking...", files say "No files uploaded yet", etc.
- README screenshots and product copy are stale, which hurts trust for new contributors and users.

## Performance Findings

- `useItems` fetches all items with `.select('*')` for every user and every major view. This is fine for small inventories, but there is no pagination, search query, server-side filtering, or virtualization.
- Items table and gallery render all filtered rows/cards. Large inventories with thumbnails will eventually need pagination, windowing, or a lazy grid.
- Thumbnail fetching signs one URL per first image using `Promise.all` in `getFirstItemImageThumbnails`. For many visible items, this can generate many signed URL requests at once.
- Thumbnail query key includes the full `thumbnailItemIds` array. Large arrays make cache keys heavy and cause frequent cache misses when sorting/filtering changes order.
- Dashboard/analytics calculations are O(n) to O(n log n) and run in `useMemo`, which is acceptable for current scale. Bundle helper functions repeatedly scan full item arrays inside calculations; central indexing would help at scale.
- `ItemDrawer` loads item files per item on drawer open and signs image URLs on demand. Good enough, but lightbox opening creates signed URLs one by one and can feel delayed.
- Image compression is client-side and capped to 200 KB, which is a strong choice for storage/loading. It may be too aggressive for receipts/manuals if they are images with text.
- Vite build warning shows the main JS chunk is over 500 KB after minification. Recharts, GSAP, React Image Crop, and all pages are likely in the initial bundle because routes are not lazy-loaded.

## Security & Privacy Findings

- Supabase RLS is present for `items`, `item_files`, `profiles`, and storage objects. Policies use authenticated user ownership checks, which is solid.
- The `items` table has a trigger ensuring bundle children belong to the same user as the parent. This is a good defense-in-depth measure.
- `item-files` bucket is private and signed URLs are used. Good.
- `avatars` bucket is public. That is common for avatars, but users should understand profile images become public URLs.
- Storage upload policy allows users to upload under their user folder, but it does not validate that the path item ID belongs to the same user. The DB insert policy does validate `item_files.item_id`, but raw orphaned storage objects under a user's folder are still possible if upload succeeds and DB insert fails or malicious clients upload arbitrary folder names.
- Storage policies do not show an update policy for `item-files`, but uploads use `upsert: false`, so that is acceptable.
- `.env` is ignored and not tracked, but it exists locally with a Supabase publishable key. Publishable keys are expected in frontend apps, but avoid committing real project URLs/keys unless intentionally public.
- Demo mode is enforced client-side for app mutations. Real protection depends on demo account permissions and RLS; client-side demo blocking can be bypassed by a modified client.
- No dangerous HTML rendering was found. No `dangerouslySetInnerHTML`.

## Code Quality Findings

- TypeScript is only partially strict. Missing `strict` allows unsafe null and API assumptions through.
- Supabase calls are not typed with generated Database types. Casts like `(data as Item[])` and `(data as ItemFile[])` bypass schema drift detection.
- Business rules are duplicated:
  - Item status labels and badge classes in `Items.tsx` and `PeriodReport.tsx`.
  - Bundle grouping in `Items.tsx`, `PeriodReport.tsx`, and `Analytics.tsx`.
  - Date range parsing in `dateInput.ts`, `Analytics.tsx`, and `PeriodReport.tsx`.
  - CSV export helpers in `src/lib/csv.ts` and local `Items.tsx` download logic.
- `src/lib/utils.ts` is a mixed bag: classnames, currency, money parsing, item accounting, platform accessors, status labels, and date formatting. It should be split later by domain.
- `src/lib/analytics.ts` exports unused legacy helpers. Lint does not catch exported unused functions.
- Test coverage is concentrated in low-level helpers. There are no tests for bundle accounting, dashboard metrics, period report metrics, item filtering/sorting, or drawer submit payloads.
- Error handling is usually user-friendly via toast, but many catch blocks collapse distinct failure modes into "Please try again", making support/debug harder.
- Formatting is inconsistent: some files use semicolons/double quotes (`Items.tsx`, `Layout.tsx`), others use no semicolons/single quotes. No formatter script exists.
- `README.md` and comments contain mojibake in terminal output. This may be console encoding, but if source bytes are corrupted it should be fixed separately.

## Technical Debt Hotspots

1. `src/components/items/ItemDrawer.tsx`
   - Too many responsibilities.
   - Bundle edit and file upload logic intermixed with form rendering.
   - High regression risk for add/edit/sold/bundle/file changes.

2. `src/pages/Items.tsx`
   - Filtering, sorting, layout, gallery sizing, CSV export, table, cards, modals, and badges in one file.
   - Manual parity between list and gallery views.

3. `src/pages/PeriodReport.tsx`
   - Duplicates item row/card rendering and accounting logic.
   - Most likely to drift from Dashboard and Items metrics.

4. `src/lib/utils.ts`
   - Core accounting logic lives in a generic utility file.
   - Needs domain-level names and tests.

5. `src/lib/analytics.ts`
   - Useful central place for calculations, but currently mixes old analytics helpers and new dashboard metrics.

6. `src/index.css`
   - Global app styles and landing page system coexist in one large stylesheet.

## Low-Hanging Improvements

- Add `npm run typecheck` as alias for `tsc -b`.
- Update `README.md` to match current Dashboard/Analytics merge.
- Add tests for `calculateItemProfit`, `calculateItemROI`, `buildDashboardMetrics`, and Period Report summary with standalone, bundle parent, bundle child, keeper, zero-sale, and unsold examples.
- Generate Supabase Database types and type `supabase` client.
- Extract `statusLabels`, `statusBadgeClassName`, and `bundle grouping` into shared modules.
- Move local CSV download in `Items.tsx` to `src/lib/csv.ts`.
- Add route-level lazy loading for Landing, Dashboard, Period Report, Import/Export, Settings, and Categories.
- Remove or mark deprecated unused analytics exports once confirmed not needed.
- Replace `window.confirm` in `Categories` with existing modal/dialog styling.
- Add a storage cleanup path for failed file DB deletes and/or orphaned storage objects.

## Recommended Refactor Priority

1. **Accounting correctness first**
   - Create a small `src/lib/itemAccounting.ts` or `src/domain/items/accounting.ts`.
   - Move sell value, profit, ROI, keeping, aggregate item, effective status, and bundle helpers there.
   - Add fixture-driven tests before changing UI.

2. **Shared item indexing**
   - Build one helper that returns `childrenByBundle`, `parentByChild`, `aggregateItems`, `soldItems`, `unsoldResaleItems`, and `keepers`.
   - Use it in Dashboard, Items, and Period Report to avoid repeated scans and rule drift.

3. **Split ItemDrawer**
   - Keep `ItemDrawer` as shell.
   - Extract `ItemDetailsForm`, `BundleEditor`, `PendingFilesSection`, `ExistingFilesSection`, and form-to-payload mapper.
   - Add tests around payload mapping.

4. **Split Items page**
   - Extract filter model, sort model, gallery components, table components, and CSV export.
   - Keep page file as composition and URL/query state.

5. **Normalize reports/dashboard**
   - Make Period Report consume shared accounting helpers.
   - Decide whether "Best Flip" means absolute profit or ROI everywhere.

6. **Supabase type and query improvements**
   - Add generated DB types.
   - Replace `.select('*')` with explicit fields or typed selectors.
   - Consider pagination/virtualization before inventories become large.

7. **UX polish**
   - Unify status/filter terminology.
   - Refresh docs/screenshots.
   - Standardize empty-state copy and destructive confirmation UI.

## Suggested Future Architecture Direction

Evolve gradually toward feature/domain modules without a full rewrite:

- `src/domain/items/`
  - `accounting.ts`
  - `bundles.ts`
  - `filters.ts`
  - `status.ts`
  - `fixtures.test.ts`

- `src/features/items/`
  - `ItemsPage.tsx`
  - `ItemTable.tsx`
  - `ItemGallery.tsx`
  - `ItemFilters.tsx`
  - `ItemDrawer/`

- `src/features/dashboard/`
  - `DashboardPage.tsx`
  - `dashboardMetrics.ts`
  - `DashboardSnapshot.tsx`
  - `DashboardTrends.tsx`

- `src/features/files/`
  - Upload/compression/storage helpers and UI sections.

- `src/services/supabase/`
  - Typed client, query functions, storage functions.

The main goal is not more abstraction. The goal is one home for each business rule, tested with real resale scenarios.
