import {
  Banknote,
  Boxes,
  ChevronDown,
  FilterX,
  Heart,
  Package,
  PackageSearch,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/charts/ChartCard'
import { KPICard } from '@/components/charts/KPICard'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { useItems } from '@/hooks/useItems'
import {
  average,
  buildDashboardMetrics,
  getEffectiveSoldAt,
} from '@/lib/analytics'
import { formatCompactCurrency, getChartColors } from '@/lib/chartUtils'
import { toSupabaseTimestamp } from '@/lib/dateInput'
import { formatMonthKey } from '@/lib/dateUtils'
import {
  getEffectiveItemStatus,
  isAggregateItem,
  isKeepingItem,
} from '@/lib/itemAccounting'
import { useTheme } from '@/lib/theme'
import {
  formatCurrency,
  getBuyPlatform,
  getSellPlatform,
  uniqueTextValues,
} from '@/lib/utils'
import type { Item } from '@/types'
import { useNavigate } from 'react-router-dom'

type DatePreset = 'all' | 'year' | '12m' | '6m' | '3m' | 'custom'
type FilterStatus = 'sold' | 'holding' | 'listed' | 'keeper'

type ChartDatum = {
  label: string
  profit?: number
  revenue?: number
  roi?: number
}

type TooltipPayload = {
  color?: string
  name: string
  payload?: Record<string, unknown>
  value: number
}

type TooltipProps = {
  active?: boolean
  label?: string
  payload?: TooltipPayload[]
}

const datePresetLabels: Record<DatePreset, string> = {
  '12m': 'Last 12 months',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  all: 'All time',
  custom: 'Custom range',
  year: 'This year',
}

const statusOptions: Array<{ label: string; value: FilterStatus }> = [
  { label: 'Sold', value: 'sold' },
  { label: 'Holding', value: 'holding' },
  { label: 'Listed', value: 'listed' },
  { label: 'Keeping', value: 'keeper' },
]

export function Analytics() {
  const { data: items = [], isLoading } = useItems()
  const navigate = useNavigate()
  const { mode, theme } = useTheme()
  const colors = useMemo(() => {
    return getChartColors(theme, mode === 'dark')
  }, [mode, theme])
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [buyPlatforms, setBuyPlatforms] = useState<string[]>([])
  const [sellPlatforms, setSellPlatforms] = useState<string[]>([])
  const [statuses, setStatuses] = useState<FilterStatus[]>([])

  const categoryOptions = useMemo(
    () => uniqueTextValues(items.map((item) => item.category)),
    [items],
  )
  const buyPlatformOptions = useMemo(
    () => uniqueTextValues(items.map((item) => getBuyPlatform(item))),
    [items],
  )
  const sellPlatformOptions = useMemo(
    () => uniqueTextValues(items.map((item) => getSellPlatform(item))),
    [items],
  )
  const dateRange = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [customFrom, customTo, datePreset],
  )
  const filteredItems = useMemo(
    () =>
      getFilteredCalculationItems(items, {
        categories,
        dateRange,
        buyPlatforms,
        statuses,
        sellPlatforms,
      }),
    [buyPlatforms, categories, dateRange, items, sellPlatforms, statuses],
  )
  const dashboardMetrics = useMemo(
    () => buildDashboardMetrics(filteredItems),
    [filteredItems],
  )
  const monthlyProfit = dashboardMetrics.profitByMonth
  const profitByCategory = dashboardMetrics.profitByCategory
  const profitByPlatform = dashboardMetrics.profitByPlatform
  const activeFilterCount =
    (datePreset === 'all' ? 0 : 1) +
    categories.length +
    buyPlatforms.length +
    sellPlatforms.length +
    statuses.length

  function clearFilters() {
    setDatePreset('all')
    setCustomFrom('')
    setCustomTo('')
    setCategories([])
    setBuyPlatforms([])
    setSellPlatforms([])
    setStatuses([])
  }

  if (isLoading) {
    return <LoadingGrid />
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted">
          A quick view of profit, cash, inventory, and what needs attention.
        </p>
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        categories={categories}
        categoryOptions={categoryOptions}
        customFrom={customFrom}
        customTo={customTo}
        datePreset={datePreset}
        buyPlatformOptions={buyPlatformOptions}
        buyPlatforms={buyPlatforms}
        statuses={statuses}
        onCategoriesChange={setCategories}
        onClear={clearFilters}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onDatePresetChange={setDatePreset}
        sellPlatformOptions={sellPlatformOptions}
        sellPlatforms={sellPlatforms}
        onBuyPlatformsChange={setBuyPlatforms}
        onSellPlatformsChange={setSellPlatforms}
        onStatusesChange={setStatuses}
      />

      <SectionHeading>Snapshot</SectionHeading>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Net Profit"
          value={dashboardMetrics.netProfit}
          subtitle={`${dashboardMetrics.soldCount} sold resale items`}
          icon={Banknote}
          trend={profitTrend(dashboardMetrics.netProfit)}
          color={dashboardMetrics.netProfit < 0 ? 'rose' : 'green'}
          formatter={formatCurrency}
        />
        <KPICard
          title="Revenue"
          value={dashboardMetrics.revenue}
          subtitle="Total sell price from sold items"
          icon={TrendingUp}
          trend={dashboardMetrics.revenue > 0 ? 'up' : 'neutral'}
          color="blue"
          formatter={formatCurrency}
        />
        <KPICard
          title="Cash Tied Up"
          value={dashboardMetrics.cashTiedUp}
          subtitle={`${dashboardMetrics.unsoldCount} unsold resale items`}
          icon={Boxes}
          trend="neutral"
          color="amber"
          formatter={formatCurrency}
          onClick={() => navigate('/items?inventory=1')}
        />
        <KPICard
          title="Keeping Value"
          value={dashboardMetrics.keepingValue}
          subtitle="Buy price of items kept"
          icon={Heart}
          trend="neutral"
          color="violet"
          formatter={formatCurrency}
          onClick={() => navigate('/items?status=keeper')}
        />
      </div>

      <SectionHeading>What needs attention</SectionHeading>
      <div className="grid gap-4 xl:grid-cols-3">
        <KPICard
          icon={Package}
          title="Best Flip"
          value={truncateText(dashboardMetrics.bestFlip?.name ?? 'No sold items', 24)}
          valueTitle={dashboardMetrics.bestFlip?.name}
          subtitle={
            dashboardMetrics.bestFlip
              ? `${formatCurrency(dashboardMetrics.bestFlip.profit)} profit`
              : 'Sell an item to unlock this'
          }
          trend={dashboardMetrics.bestFlip ? 'up' : 'neutral'}
          color="green"
          onClick={
            dashboardMetrics.bestFlip
              ? () => navigate(`/items?item=${dashboardMetrics.bestFlip?.tsid}`)
              : undefined
          }
        />
        <KPICard
          icon={TrendingDown}
          title="Biggest Loss"
          value={truncateText(dashboardMetrics.biggestLoss?.name ?? 'No losses yet', 24)}
          valueTitle={dashboardMetrics.biggestLoss?.name}
          subtitle={
            dashboardMetrics.biggestLoss
              ? `${formatCurrency(Math.abs(dashboardMetrics.biggestLoss.profit))} loss`
              : 'Loss-making flips show up here'
          }
          trend={dashboardMetrics.biggestLoss ? 'down' : 'neutral'}
          color="rose"
          onClick={
            dashboardMetrics.biggestLoss
              ? () => navigate(`/items?item=${dashboardMetrics.biggestLoss?.tsid}`)
              : undefined
          }
        />
        <KPICard
          icon={PackageSearch}
          title="Unsold Inventory"
          value={dashboardMetrics.unsoldCount}
          subtitle={
            dashboardMetrics.oldestUnsoldItem
              ? `${formatCurrency(dashboardMetrics.cashTiedUp)} tied up; oldest ${dashboardMetrics.oldestUnsoldItem.daysHeld}d`
              : 'No resale inventory waiting'
          }
          trend="neutral"
          color="indigo"
          onClick={() => navigate('/items?inventory=1')}
        />
      </div>

      <SectionHeading>Trends</SectionHeading>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartShell
          hasData={monthlyProfit.length > 0}
          legend={<DotLegend items={[{ color: colors.positive, label: 'Positive' }, { color: colors.negative, label: 'Negative' }]} />}
          title="Monthly Profit"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyProfit}>
              <ChartGradients colors={colors} idSuffix="analytics-monthly-profit" />
              <ChartGrid />
              <ChartXAxis
                dataKey="label"
                rotate={monthlyProfit.length > 6}
                tickFormatter={formatMonthKey}
              />
              <ChartYAxis />
              <ReferenceLine
                y={average(monthlyProfit.map((entry) => entry.profit ?? 0))}
                stroke={colors.muted}
                strokeDasharray="4 4"
                label={referenceLabel('avg')}
              />
              <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar
                activeBar={{ filter: 'brightness(1.15)', opacity: 1 }}
                animationDuration={600}
                animationEasing="ease-out"
                dataKey="profit"
                isAnimationActive
                maxBarSize={28}
                name="Profit"
                radius={[4, 4, 0, 0]}
              >
                {monthlyProfit.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={
                      (entry.profit ?? 0) >= 0
                        ? 'url(#gradientPositive-analytics-monthly-profit)'
                        : 'url(#gradientNegative-analytics-monthly-profit)'
                    }
                    opacity={0.85}
                    stroke="none"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ProfitBarChart colors={colors} data={profitByCategory} title="Profit by Category" />
        <ProfitBarChart colors={colors} data={profitByPlatform} title="Profit by Platform" />
        <InventoryAgeList
          items={dashboardMetrics.oldestUnsoldItems}
          onOpenItem={(itemId) => navigate(`/items?item=${itemId}`)}
        />
      </div>
    </section>
  )
}

function FilterBar({
  activeFilterCount,
  buyPlatformOptions,
  buyPlatforms,
  categories,
  categoryOptions,
  customFrom,
  customTo,
  datePreset,
  sellPlatformOptions,
  sellPlatforms,
  statuses,
  onBuyPlatformsChange,
  onCategoriesChange,
  onClear,
  onCustomFromChange,
  onCustomToChange,
  onDatePresetChange,
  onSellPlatformsChange,
  onStatusesChange,
}: {
  activeFilterCount: number
  buyPlatformOptions: string[]
  buyPlatforms: string[]
  categories: string[]
  categoryOptions: string[]
  customFrom: string
  customTo: string
  datePreset: DatePreset
  sellPlatformOptions: string[]
  sellPlatforms: string[]
  statuses: FilterStatus[]
  onBuyPlatformsChange: (values: string[]) => void
  onCategoriesChange: (values: string[]) => void
  onClear: () => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  onDatePresetChange: (value: DatePreset) => void
  onSellPlatformsChange: (values: string[]) => void
  onStatusesChange: (values: FilterStatus[]) => void
}) {
  return (
    <div className="sticky top-0 z-20 rounded-xl bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Date range
          <select
            className={filterControlClassName}
            value={datePreset}
            onChange={(event) => onDatePresetChange(event.target.value as DatePreset)}
          >
            {Object.entries(datePresetLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {datePreset === 'custom' ? (
          <>
            <label className="grid gap-1 text-xs font-medium text-muted">
              From
              <DatePickerInput
                className={filterControlClassName}
                value={customFrom}
                onChange={onCustomFromChange}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted">
              To
              <DatePickerInput
                className={filterControlClassName}
                value={customTo}
                onChange={onCustomToChange}
              />
            </label>
          </>
        ) : null}
        <MultiSelect
          label="Category"
          allLabel="All categories"
          options={categoryOptions}
          values={categories}
          onChange={onCategoriesChange}
        />
        <MultiSelect
          label="Bought from"
          allLabel="All sources"
          options={buyPlatformOptions}
          values={buyPlatforms}
          onChange={onBuyPlatformsChange}
        />
        <MultiSelect
          label="Sold on"
          allLabel="All channels"
          options={sellPlatformOptions}
          values={sellPlatforms}
          onChange={onSellPlatformsChange}
        />
        <MultiSelect
          label="Status"
          allLabel="All statuses"
          options={statusOptions.map((status) => status.label)}
          values={statuses.map((status) => statusOptions.find((option) => option.value === status)?.label ?? status)}
          onChange={(labels) =>
            onStatusesChange(
              labels
                .map((label) => statusOptions.find((option) => option.label === label)?.value)
                .filter((value): value is FilterStatus => Boolean(value)),
            )
          }
        />
        {activeFilterCount > 0 ? (
          <div className="mb-0.5 flex items-center gap-2 rounded-full bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            {activeFilterCount} active filters
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted transition hover:text-base"
              onClick={onClear}
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MultiSelect({
  allLabel,
  label,
  onChange,
  options,
  values,
}: {
  allLabel: string
  label: string
  onChange: (values: string[]) => void
  options: string[]
  values: string[]
}) {
  const summary = values.length === 0 ? allLabel : values.join(', ')

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <details className="group relative">
      <summary className="grid cursor-pointer list-none gap-1 text-xs font-medium text-muted [&::-webkit-details-marker]:hidden">
        {label}
        <span className={`${filterControlClassName} flex items-center justify-between gap-2 pr-10`}>
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </span>
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 w-60 rounded-lg bg-card p-2 shadow-lg">
        <button
          type="button"
          className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-muted transition hover:bg-surface-2"
          onClick={() => onChange([])}
        >
          {allLabel}
        </button>
        <div className="max-h-56 overflow-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-base transition hover:bg-surface-2"
            >
              <input
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                type="checkbox"
                checked={values.includes(option)}
                onChange={() => toggle(option)}
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  )
}

function ProfitBarChart({
  colors,
  data,
  title,
}: {
  colors: ReturnType<typeof getChartColors>
  data: ChartDatum[]
  title: string
}) {
  const gradientSuffix = `analytics-${title.toLowerCase().replaceAll(' ', '-')}`

  return (
    <ChartShell
      hasData={data.length > 0}
      legend={<DotLegend items={[{ color: colors.accent, label: 'Profit' }, { color: colors.negative, label: 'Loss' }]} />}
      title={title}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <ChartGradients colors={colors} idSuffix={gradientSuffix} />
          <ChartGrid />
          <ChartXAxis dataKey="label" rotate={data.length > 6} />
          <ChartYAxis />
          <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar
            activeBar={{ fill: colors.accent, filter: 'brightness(1.15)', opacity: 1 }}
            animationDuration={600}
            animationEasing="ease-out"
            dataKey="profit"
            isAnimationActive
            maxBarSize={28}
            name="Profit"
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={
                  (entry.profit ?? 0) >= 0
                    ? `url(#gradientAccent-${gradientSuffix})`
                    : `url(#gradientNegative-${gradientSuffix})`
                }
                opacity={0.85}
                stroke="none"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

function InventoryAgeList({
  items,
  onOpenItem,
}: {
  items: Array<{ buyPrice: number; daysHeld: number; name: string; tsid: string }>
  onOpenItem: (itemId: string) => void
}) {
  return (
    <ChartCard
      hasData={items.length > 0}
      title="Oldest Unsold Items"
      emptyText="No unsold resale inventory for selected filters."
    >
      <div className="divide-y divide-subtle">
        {items.map((item) => (
          <button
            key={item.tsid}
            type="button"
            className="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:text-accent"
            onClick={() => onOpenItem(item.tsid)}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-base">
                {item.name}
              </span>
              <span className="mt-1 block text-xs text-muted">
                {formatCurrency(item.buyPrice)} tied up
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-subtle px-2.5 py-1 text-xs font-semibold text-muted">
              Held {item.daysHeld}d
            </span>
          </button>
        ))}
      </div>
    </ChartCard>
  )
}


function ChartShell({
  children,
  hasData,
  legend,
  title,
}: {
  children: React.ReactNode
  hasData: boolean
  legend?: React.ReactNode
  title: string
}) {
  return (
    <div className="min-h-[280px]">
      <ChartCard hasData title={title} legend={hasData ? legend : undefined}>
        {hasData ? children : <EmptyChart />}
      </ChartCard>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="grid h-[220px] place-items-center rounded-lg border border-dashed border-subtle bg-surface-2/50 text-center">
      <div>
        <PackageSearch className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
        <p className="mt-2 text-sm text-muted">No sold items match these filters</p>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 text-xs font-medium uppercase tracking-widest text-muted">
      {children}
    </h2>
  )
}

function ChartGrid() {
  return (
    <CartesianGrid
      stroke="hsl(var(--border))"
      strokeDasharray="2 4"
      strokeOpacity={0.5}
      vertical={false}
    />
  )
}

function ChartGradients({
  colors,
  idSuffix,
}: {
  colors: ReturnType<typeof getChartColors>
  idSuffix: string
}) {
  return (
    <defs>
      <linearGradient id={`gradientAccent-${idSuffix}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.95} />
        <stop offset="100%" stopColor={colors.accent} stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id={`gradientPositive-${idSuffix}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={colors.positive} stopOpacity={0.95} />
        <stop offset="100%" stopColor={colors.positive} stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id={`gradientNegative-${idSuffix}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={colors.negative} stopOpacity={0.95} />
        <stop offset="100%" stopColor={colors.negative} stopOpacity={0.5} />
      </linearGradient>
    </defs>
  )
}

function ChartXAxis({
  dataKey,
  preserve,
  rotate = false,
  tickFormatter,
}: {
  dataKey: string
  preserve?: boolean
  rotate?: boolean
  tickFormatter?: (value: string) => string
}) {
  return (
    <XAxis
      axisLine={false}
      dataKey={dataKey}
      fontSize={11}
      height={rotate ? 54 : 28}
      interval={preserve ? 'preserveStartEnd' : 0}
      stroke="hsl(var(--text-muted))"
      textAnchor={rotate ? 'end' : 'middle'}
      tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }}
      tickFormatter={(value) =>
        tickFormatter ? tickFormatter(String(value)) : String(value)
      }
      tickLine={false}
      tickMargin={8}
      angle={rotate ? -35 : 0}
    />
  )
}

function ChartYAxis() {
  return (
    <YAxis
      axisLine={false}
      fontSize={11}
      stroke="hsl(var(--text-muted))"
      tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }}
      tickFormatter={(value) => formatCompactCurrency(Number(value))}
      tickLine={false}
      width={48}
    />
  )
}

function CurrencyTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg bg-card px-3 py-2 text-xs text-muted shadow-lg">
      {label ? <p className="mb-1 text-xs text-muted">{formatChartLabel(label)}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          <span className="text-xs font-bold text-base">
            {formatCurrency(entry.value)}
          </span>
        </p>
      ))}
    </div>
  )
}


function DotLegend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-lg bg-card"
        />
      ))}
    </div>
  )
}

function profitTrend(value: number) {
  if (value > 0) {
    return 'up'
  }

  if (value < 0) {
    return 'down'
  }

  return 'neutral'
}

function getFilteredCalculationItems(
  items: Item[],
  filters: {
    buyPlatforms: string[]
    categories: string[]
    dateRange: { from: Date | null; to: Date | null }
    sellPlatforms: string[]
    statuses: FilterStatus[]
  },
) {
  const aggregateItems = items.filter(isAggregateItem)
  const matchedAggregateItems = aggregateItems.filter((item) =>
    matchesFilters(item, items, filters),
  )
  const matchedIds = new Set(matchedAggregateItems.map((item) => item.tsid))
  const childItems = items.filter((item) => item.bundle_id && matchedIds.has(item.bundle_id))

  return [...matchedAggregateItems, ...childItems]
}

function matchesFilters(
  item: Item,
  allItems: Item[],
  filters: {
    buyPlatforms: string[]
    categories: string[]
    dateRange: { from: Date | null; to: Date | null }
    sellPlatforms: string[]
    statuses: FilterStatus[]
  },
) {
  const status = normalizeStatus(item, allItems)
  const date = new Date(
    status === 'sold' ? getEffectiveSoldAt(item, allItems) ?? item.sold_at ?? item.bought_at : item.bought_at,
  )

  return (
    matchesOption(filters.categories, item.category) &&
    matchesOption(filters.buyPlatforms, getBuyPlatform(item)) &&
    matchesOption(filters.sellPlatforms, getSellPlatform(item)) &&
    (filters.statuses.length === 0 || filters.statuses.includes(status)) &&
    isWithinDateRange(date, filters.dateRange)
  )
}

function normalizeStatus(item: Item, allItems: Item[]): FilterStatus {
  return isKeepingItem(item) ? 'keeper' : getEffectiveItemStatus(item, allItems)
}

function getDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date()
  const end = endOfDay(now)

  if (preset === 'all') {
    return { from: null, to: null }
  }

  if (preset === 'custom') {
    return {
      from: parseDateRangeInput(customFrom, startOfDay),
      to: parseDateRangeInput(customTo, endOfDay),
    }
  }

  if (preset === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: end }
  }

  const months = preset === '12m' ? 12 : preset === '6m' ? 6 : 3
  const from = new Date(now)
  from.setMonth(from.getMonth() - months)

  return { from: startOfDay(from), to: end }
}

function isWithinDateRange(date: Date, range: { from: Date | null; to: Date | null }) {
  if (Number.isNaN(date.getTime())) {
    return false
  }

  if (range.from && date < range.from) {
    return false
  }

  if (range.to && date > range.to) {
    return false
  }

  return true
}

function startOfDay(date: Date) {
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(date: Date) {
  date.setHours(23, 59, 59, 999)
  return date
}

function parseDateRangeInput(value: string, boundary: (date: Date) => Date) {
  const timestamp = toSupabaseTimestamp(value)

  return timestamp ? boundary(new Date(timestamp)) : null
}

function matchesOption(selectedValues: string[], value: string) {
  return (
    selectedValues.length === 0 ||
    selectedValues.some((selectedValue) => selectedValue.toLowerCase() === value.toLowerCase())
  )
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value
}

function formatChartLabel(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? formatMonthKey(value) : value
}

function referenceLabel(value: string) {
  return {
    fill: 'hsl(var(--text-muted))',
    fontSize: 11,
    position: 'insideTopRight' as const,
    value,
  }
}

const filterControlClassName =
  'h-10 min-w-40 max-w-56 rounded-lg border border-border-base bg-card px-3 pr-10 text-sm text-base outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10'
