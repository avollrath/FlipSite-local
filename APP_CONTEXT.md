# FlipSite-local App Context Document

> Current runtime: Flask API, SQLite, cookie sessions, and local filesystem
> storage. Supabase references below describe the original repository and are
> retained only as migration context.

## 1. App Overview

**What it does:** FlipSite is an inventory and resale profit tracking application that helps users manage items they buy and sell. It tracks purchase/sale prices, profit margins, ROI, item conditions, categories, and provides analytics dashboards for monitoring resale business performance.

**Tech stack:**
- **Framework:** React 19.2.5
- **Language:** TypeScript 6.0
- **Build Tool:** Vite 8.0.10
- **Routing:** React Router DOM 7.14.2
- **UI Component Library:** shadcn/ui with Radix UI
- **State Management:** React Context API + TanStack React Query 5.100.6
- **Backend/Database:** Supabase (Auth, PostgreSQL, Storage)
- **Styling:** Tailwind CSS 3.4.17
- **Key Libraries:** Recharts 3.8.1 (charts), Lucide React 1.14.0 (icons), Sonner 2.0.7 (toasts), date-fns 4.1.0, react-image-crop 11.0.10

**Routing structure:**
- `/` – Landing page (public)
- `/login` – Authentication page
- `/dashboard` – Main dashboard with filters, snapshot KPIs, attention cards, and charts
- `/items` – Item list and detail view (with `/:itemId` param)
- `/analytics` – Redirects to `/dashboard`
- `/activity-report` – Activity/date range report
- `/report` – Redirects to `/activity-report`
- `/categories` – Category management
- `/import-export` – CSV import/export functionality
- `/settings` – User settings, theme customization, profile management

---

## 2. UI Structure & Layout

**Overall layout pattern:** Fixed left sidebar navigation (hidden on mobile) + sticky header + responsive main content area with horizontal padding and bottom padding for mobile nav.

**Sidebar specifications:**
- **Width:** 288px (w-72)
- **Position:** Fixed, full height, left-aligned, hidden on mobile (md: flex)
- **Background:** `--sidebar-bg` CSS variable (theme-dependent)
- **Padding:** 1.25rem (p-5)
- **Navigation items:** 6 items (Items, Dashboard, Activity Report, Categories, Import/Export, Settings)
- **Icons used:** Lucide React icons (Gauge, Package, BarChart3, CalendarRange, Tags, ArrowRightLeft, Settings, LogOut)
- **Active state behavior:** 
  - Active: `bg-accent/25`, `text-sidebar-accent`, bold font
  - Inactive: `text-sidebar-text/90`, opacity-70 icons
  - Hover: `bg-white/10`, icon opacity-100
  - Transitions: 200ms ease-out
- **User section:** Avatar display (14rem × 14rem) with fallback initial, positioned above logout button with border separator

**Header/topbar:**
- **Height:** 64px (h-16)
- **Sticky:** Yes, z-index 30
- **Background:** Surface color with 85% opacity and backdrop blur
- **Border:** Bottom border using `border-border-base`
- **Content:** Theme toggle button (Sun/Moon icon), demo mode banner (when applicable)
- **Theme toggle button:** 10 × 10 rounded-lg, border with hover state that highlights on accent color

**Main content grid/layout:**
- **Padding:** 1.25rem (px-5) on mobile, 2rem (px-8) on desktop
- **Vertical padding:** 2rem (py-8) top, 7rem (pb-28) on mobile, 2rem (pb-8) on desktop
- **System used:** CSS Grid + Flexbox via Tailwind utility classes
- **Animation:** Page transitions use `animate-page-transition` keyframe (fade + slide up)
- **Mobile nav:** Separate bottom navigation component (MobileNav.tsx) visible only on mobile

---

## 3. Component Inventory

**Layout Components:**
- [Layout.tsx](src/components/layout/Layout.tsx) – Main wrapper (sidebar + header + mobile nav + outlet)
- [Sidebar.tsx](src/components/layout/Sidebar.tsx) – Left navigation sidebar with user profile section
- [MobileNav.tsx](src/components/layout/MobileNav.tsx) – Bottom mobile navigation

**Chart Components:**
- [ChartCard.tsx](src/components/charts/ChartCard.tsx) – Reusable card wrapper for charts with title, subtitle, legend slots; empty state support with `hasData` prop
- [KPICard.tsx](src/components/charts/KPICard.tsx) – Card component for key performance indicators (sales figures, ROI, etc.)

**UI Components:**
- [Logo.tsx](src/components/ui/Logo.tsx) – Animated gradient logo that dynamically adapts to theme colors
- [AvatarCropper.tsx](src/components/ui/AvatarCropper.tsx) – Image cropping tool for user avatars
- [DatePickerInput.tsx](src/components/ui/DatePickerInput.tsx) – Date input component
- [ImageWithSkeleton.tsx](src/components/ui/ImageWithSkeleton.tsx) – Image with loading skeleton
- [sheet.tsx](src/components/ui/sheet.tsx) – Radix UI sheet/modal component (shadcn/ui)

**Item Components:**
- [ItemDrawer.tsx](src/components/items/ItemDrawer.tsx) – Drawer/modal for viewing/editing item details

**Other Components:**
- [ImageLightbox.tsx](src/components/ImageLightbox.tsx) – Full-screen image lightbox viewer

---

## 4. Design Tokens & Theming

**Color palette (CSS HSL variables):**

Multiple themes available. Here are the Midnight Indigo (default) light mode values:
- `--accent: 220 70% 55%` (primary action color – blue)
- `--accent-soft: 220 70% 92%` (light accent background)
- `--accent-fg: 0 0% 100%` (white text on accent)
- `--surface: 220 20% 97%` (main background)
- `--surface-2: 220 15% 92%` (secondary surface)
- `--card-bg: 0 0% 100%` (card/modal background)
- `--text: 220 25% 12%` (primary text color)
- `--text-muted: 220 15% 45%` (secondary/muted text)
- `--border: 220 15% 85%` (border color)
- `--positive: 158 60% 38%` (success/green color)
- `--negative: 4 75% 52%` (error/red color)
- `--sidebar-bg: 220 30% 12%` (dark sidebar background)
- `--sidebar-text: 220 20% 72%` (sidebar text color)
- `--sidebar-accent: 220 70% 72%` (highlighted sidebar item)

**Theme options:** 8 themes available
- Midnight Drop (midnight) – blue accent
- Forest Glass (emerald) – green accent
- Golden Hour (amber) – orange accent
- Cold Brew (slate) – neutral accent
- Neon Petal (rose) – pink accent
- Cyberpunk (cyberpunk) – cyan accent
- Cassette Futurism (cassette) – orange accent
- Colorful 80s (eighties) – purple accent

**Dark/light mode:**
- **Support:** Yes, full support
- **Detection:** `darkMode: 'class'` in Tailwind config
- **Toggle mechanism:** Button in header that calls `useTheme().toggleMode()`
- **System preference:** Sonner toast uses `theme="system"` by default
- **Persistence:** Stored in localStorage (`flipsite-theme-mode` key)
- **Dark mode CSS:** Applied to `.dark[data-theme="..."]` selectors

**Border radius values:**
- **Cards & containers:** `rounded-xl` (0.75rem)
- **Buttons & inputs:** `rounded-lg` (0.5rem)
- **Avatars/small elements:** `rounded-full` or `rounded-lg`
- **Select dropdowns:** `rounded-lg`

**Shadow styles:**
- **Subtle:** `shadow-sm` (0 1px 2px 0 rgba)
- **Default cards:** `shadow-sm`
- **Accent elements:** `shadow-2xl shadow-accent/20` (heavy shadow with color tint)
- **Focus states:** `ring-4 ring-accent/20 ring-offset-2 ring-offset-surface`

---

## 5. Typography

**Font family in use:**
- **Default:** Inter (serif fallback, loaded via Google Fonts)
- **Alternative options (user-selectable):**
  - DM Sans (`geist-sans`)
  - Plus Jakarta Sans (`plus-jakarta`)
  - JetBrains Mono (`jetbrains-mono` – monospace)
  - Michroma (`michroma`)
  - Electrolize (`electrolize`)
- **Font loading:** Applied via CSS custom property `--font-family`, switched using `[data-font="..."]` attribute on HTML element
- **Global font:** Tailwind `extend.fontFamily.sans` uses `var(--font-family)`

**Font size scale (Tailwind utilities):**
- **Headings:**
  - `text-4xl` (2.25rem, 36px) – Page titles (h1)
  - `text-lg` (1.125rem, 18px) – Chart titles
  - `text-base` (1rem, 16px) – Default body, section headers
  - `text-sm` (0.875rem, 14px) – Secondary content, labels
  - `text-xs` (0.75rem, 12px) – Captions, helper text, muted info
- **Component-specific:**
  - Nav items: `text-sm`
  - Toast notifications: Varies (Sonner default)
  - Select/input: `text-sm` (h-11 height for inputs)

**Font weights used:**
- **Font-semibold (600):** Page titles, nav active state, KPI labels, chart titles
- **Font-medium (500):** Nav items, buttons, secondary headings
- **Font-normal (400):** Body text, table content, descriptions

---

## 6. Charts & Data Visualization

**Charting library:** Recharts 3.8.1

**Chart types present:**
- **AreaChart** – Used for trend lines (e.g., sales over time)
- **BarChart** – Used for categorical comparisons (e.g., profit by category)
- **CartesianGrid** – Gridlines for reference
- **Tooltip** – Custom tooltips showing data on hover
- **XAxis / YAxis** – Axes with labels
- **LabelList** – Direct labels on chart elements
- **ReferenceLine** – Horizontal/vertical reference lines

**Chart colors/theme configuration:**
- **Function:** `getChartColors(theme, dark)` in [chartUtils.ts](src/lib/chartUtils.ts)
- **Colors returned:**
  - `accent` – Primary highlight color (uses `--accent` CSS var)
  - `border` – Grid/border color (uses `--border` CSS var)
  - `muted` – Secondary text (uses `--text-muted` CSS var)
  - `positive` – Success/profit color (uses `--positive` CSS var, green)
  - `negative` – Loss/red color (uses `--negative` CSS var)
- **CSS variable extraction:** Uses `getCSSVar()` which reads computed HSL values via `getComputedStyle()`
- **Currency formatting:** Euro currency with compact notation (e.g., "1.5k€", "€123.45")

---

## 7. State Management & Data Flow

**State management architecture:**
- **Local component state:** React `useState` hook
- **Global auth state:** AuthContext (custom) – manages user login/signup/logout, demo mode detection
- **Theme state:** ThemeContext (custom) – manages theme, dark mode, font selection; persisted to localStorage
- **Server state:** TanStack React Query (react-query) – manages API data caching, synchronization, refetching
- **Query client:** Configured as singleton in App.tsx root

**Data fetching:**
- **Backend:** Supabase (PostgreSQL database + Auth service)
- **Supabase client:** Initialized in [lib/supabase.ts](src/lib/supabase.ts)
- **Auth flow:**
  - Uses `supabase.auth.signInWithPassword()` for login
  - Uses `supabase.auth.signUp()` for registration
  - Uses `supabase.auth.getUser()` and `supabase.auth.onAuthStateChange()` for session management
  - Demo mode detected via email pattern matching (`isDemoModeEmail()`)
- **Custom hooks for data:**
  - `useAuth()` – User authentication state
  - `useProfile()` – User profile data
  - `useItems()` – Inventory items list
  - `useDemoGuard()` – Demo mode protection

**Notable data models:**

**Item:**
```typescript
type Item = {
  tsid: string              // Unique identifier
  user_id: string           // Foreign key to users
  name: string              // Item name
  category: string          // Category classification
  condition: string         // Item condition
  buy_price: number         // Purchase price
  sell_price: number | null // Sale price (null if not sold)
  platform?: string | null  // Sales platform
  buy_platform?: string | null
  sell_platform?: string | null
  status: 'holding' | 'listed' | 'sold' | 'keeper'
  bought_at: string         // Date purchased
  sold_at: string | null    // Date sold
  notes: string | null      // User notes
  created_at: string        // Record creation timestamp
  bundle_id?: string | null // Parent bundle reference
  is_bundle_parent?: boolean
}
```

**Derived data:**
- `calculateItemProfit()` – Profit = sell_price - buy_price
- `calculateItemROI()` – ROI = (profit / buy_price) × 100
- `calculateItemSellValue()` – Determines current sell value based on status
- Analytics aggregations in [lib/analytics.ts](src/lib/analytics.ts)

---

## 8. Key Conventions

**Naming conventions:**
- **Files:** PascalCase for components (e.g., `Dashboard.tsx`, `ChartCard.tsx`), camelCase for utilities/hooks (e.g., `chartUtils.ts`, `useAuth.ts`)
- **Components:** PascalCase function names exported from files
- **CSS classes:** Tailwind utility classes (lowercase with hyphens, e.g., `flex`, `items-center`)
- **CSS variables:** kebab-case, prefixed with `--` (e.g., `--accent`, `--sidebar-bg`)
- **Data attributes:** kebab-case (e.g., `[data-theme="midnight"]`, `[data-font="inter"]`)
- **Props:** camelCase (TypeScript interfaces)

**Notable patterns:**
- **Protected Routes:** `ProtectedRoute` component in App.tsx wraps authenticated pages; redirects to login if user not authenticated
- **Theme Context Provider:** `ThemeProvider` wraps entire app, exposes `useTheme()` hook
- **Auth Context Provider:** `AuthProvider` wraps entire app, exposes `useAuth()` hook
- **Query Client Provider:** TanStack React Query provider at root for server state
- **Compound components:** ChartCard is a compound component with flexible children and optional slots (legend)
- **Render props pattern:** Some components use render props for flexible content rendering
- **Custom hooks:** Encapsulate auth, theme, data fetching logic; composable across pages
- **Page components:** Located in [src/pages/](src/pages/), correspond to routes
- **Supabase RLS:** Row-level security policies on database (inferred from migrations)
- **Demo mode:** Special email pattern for demo accounts with read-only access
- **Keyboard event handling:** Transition effects on active/focus states (slight scale/translateY)

**CSS transitions:**
- Default transition: `duration-200 ease-out` on buttons, links, inputs
- Page transition animation: `animate-page-transition` (fade + slide up, ~300-400ms)
- Custom keyframes: `auth-card`, `auth-form`, `page-transition`, `soft-pop`, `shimmer`, `fadeIn`

**Accessibility:**
- Semantic HTML: `<button>`, `<select>`, `<nav>`, `<header>`, `<main>`, `<article>`
- ARIA labels: `aria-hidden`, `aria-label` on icon buttons
- Focus rings: 4px accent ring with 2px offset on focus-visible
- Skip links or reduced motion: Not explicitly mentioned but transitions use `ease-out` for smoothness
- Mobile: Responsive design with mobile nav, hidden sidebar on mobile

---

## Appendix: File Organization Summary

```
src/
  components/
    charts/          → ChartCard, KPICard
    items/          → ItemDrawer
    layout/         → Layout, Sidebar, MobileNav
    ui/             → Logo, AvatarCropper, DatePickerInput, ImageWithSkeleton, sheet
    ImageLightbox.tsx
  hooks/            → useAuth, useProfile, useItems, useDemoGuard
  lib/
    theme.ts        → ThemeProvider, useTheme, theme options
    supabase.ts     → Supabase client config
    chartUtils.ts   → getChartColors, formatCompactCurrency
    analytics.ts    → Data aggregations and KPI calculations
    dateUtils.ts    → Date formatting and parsing
    utils.ts        → Shared utility functions
  pages/            → Dashboard, Items, Analytics, Report, etc.
  types/
    index.ts        → Item, ItemStatus types
  styles/
    themes.css      → Theme definitions (8 themes × 2 modes)
  index.css         → Global styles, Tailwind, keyframes
```
