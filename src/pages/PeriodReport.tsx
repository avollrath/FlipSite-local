import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { useItems } from '@/hooks/useItems'
import {
  getFirstItemImageThumbnails,
  type ItemImageThumbnail,
} from '@/lib/itemFiles'
import {
  cn,
  formatCurrency,
} from '@/lib/utils'
import { formatDateInputValue } from '@/lib/dateInput'
import {
  buildReportRows,
  buildReportSummary,
  getCustomRange,
  getPeriodItems,
  getPeriodRange,
  getPurchasedReportItems,
  getSoldReportItems,
  type Period,
  type ReportSortKey as SortKey,
  type ReportSortState as SortState,
  type ReportSummary,
} from '@/components/reports/periodReportModel'
import { PeriodReportItems } from '@/components/reports/PeriodReportItems'
import { createItemIndex } from '@/domain/items/itemIndex'
import type { Item } from '@/types'

const periodOptions: Array<{ label: string; value: Period }> = [
  { label: 'This month', value: 'this-month' },
  { label: 'Last month', value: 'last-month' },
  { label: 'Last 3 months', value: 'last-3-months' },
  { label: 'Last 6 months', value: 'last-6-months' },
  { label: 'This year', value: 'this-year' },
  { label: 'Custom', value: 'custom' },
]

const columns: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'bought_at', label: 'Date Bought' },
  { key: 'sold_at', label: 'Date Sold' },
  { key: 'buy_price', label: 'Buy Price' },
  { key: 'sell_price', label: 'Sell Price' },
  { key: 'profit', label: 'Profit' },
  { key: 'roi', label: 'ROI %' },
]

const thumbnailSize = 80
const dateInputClassName =
  'h-10 min-w-36 rounded-lg border border-border-base bg-card px-3 text-sm text-base outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10'

export function PeriodReport() {
  const { data: items = [], isLoading } = useItems()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>(() => getInitialPeriod())
  const [customFrom, setCustomFrom] = useState(() =>
    formatDateInputValue(getPeriodRange('this-month').from.toISOString()),
  )
  const [customTo, setCustomTo] = useState(() =>
    formatDateInputValue(getPeriodRange('this-month').to.toISOString()),
  )
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(
    () => new Set(),
  )
  const [sort, setSort] = useState<SortState>({
    direction: 'desc',
    key: 'bought_at',
  })
  const [sortTouched, setSortTouched] = useState(false)

  const range = useMemo(
    () =>
      period === 'custom'
        ? getCustomRange(customFrom, customTo)
        : getPeriodRange(period),
    [customFrom, customTo, period],
  )
  const itemIndex = useMemo(() => createItemIndex(items), [items])
  const childrenByBundle = itemIndex.childrenByBundleId
  const periodItems = useMemo(
    () => getPeriodItems(items, range),
    [items, range],
  )
  const summary = useMemo(
    () => buildReportSummary(periodItems, items, range),
    [items, periodItems, range],
  )
  const purchasedItems = useMemo(
    () =>
      getPurchasedReportItems({
        allItems: items,
        periodItems,
        range,
        sort,
        sortTouched,
      }),
    [items, periodItems, range, sort, sortTouched],
  )
  const soldItems = useMemo(
    () =>
      getSoldReportItems({
        allItems: items,
        periodItems,
        range,
        sort,
        sortTouched,
      }),
    [items, periodItems, range, sort, sortTouched],
  )
  const visibleRows = useMemo(
    () => [
      ...buildReportRows(purchasedItems, childrenByBundle, expandedBundles),
      ...buildReportRows(soldItems, childrenByBundle, expandedBundles),
    ],
    [childrenByBundle, expandedBundles, purchasedItems, soldItems],
  )
  const thumbnailItemIds = useMemo(
    () => visibleRows.map(({ item }) => item.tsid),
    [visibleRows],
  )
  const { data: thumbnailByItemId = new Map<string, ItemImageThumbnail>() } =
    useQuery({
      queryKey: ['item-image-thumbnails', thumbnailSize, thumbnailItemIds],
      enabled: thumbnailItemIds.length > 0,
      staleTime: 1000 * 60 * 30,
      queryFn: async () => {
        const thumbnails = await getFirstItemImageThumbnails(thumbnailItemIds, {
          size: thumbnailSize,
        })

        return new Map(
          thumbnails.map((thumbnail) => [thumbnail.item_id, thumbnail]),
        )
      },
    })

  useEffect(() => {
    localStorage.setItem('report-period', period)
  }, [period])

  function updateSort(key: SortKey) {
    setSortTouched(true)
    setSort((current) => ({
      direction:
        current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
      key,
    }))
  }

  function toggleBundle(itemId: string) {
    setExpandedBundles((current) => {
      const next = new Set(current)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  function openItem(item: Item) {
    navigate(`/items/${item.tsid}`)
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base">Activity Report</h1>
          <p className="mt-1 text-sm text-muted">
            Review what you bought, sold, kept, and earned.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'rounded-full border border-transparent px-4 py-1.5 text-sm font-medium transition-colors',
              period === option.value
                ? 'border-accent bg-accent text-accent-fg'
                : 'bg-surface-2 text-muted hover:border-subtle hover:text-[hsl(var(--text))]',
            )}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </button>
        ))}

        {period === 'custom' ? (
          <div className="ml-2 flex flex-wrap items-center gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted">
              From
              <DatePickerInput
                className={dateInputClassName}
                value={customFrom}
                onChange={setCustomFrom}
              />
            </label>
            <span className="mt-5 text-sm text-muted">-&gt;</span>
            <label className="grid gap-1 text-xs font-medium text-muted">
              To
              <DatePickerInput
                className={dateInputClassName}
                value={customTo}
                onChange={setCustomTo}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        <SummaryBar summary={summary} />
      </div>

      {periodItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PeriodReportItems
            allItems={items}
            childrenByBundle={childrenByBundle}
            columns={columns}
            expandedBundles={expandedBundles}
            onOpenItem={openItem}
            onToggleBundle={toggleBundle}
            onUpdateSort={updateSort}
            purchasedItems={purchasedItems}
            soldItems={soldItems}
            sort={sort}
            thumbnailByItemId={thumbnailByItemId}
          />

          <p className="text-sm text-muted">
            Showing {periodItems.length} items
          </p>
        </>
      )}
    </section>
  )
}

function SummaryBar({ summary }: { summary: ReportSummary }) {
  const resaleCards = [
    { label: 'Purchased', value: String(summary.purchased) },
    { label: 'Sold', value: String(summary.sold) },
    { label: 'Paid', value: formatCurrency(summary.totalPaid) },
    { label: 'Revenue', value: formatCurrency(summary.totalRevenue) },
    {
      label: 'Profit',
      value: formatCurrency(summary.totalProfit),
      valueClassName: metricTextClassName(summary.totalProfit),
    },
    {
      label: 'Avg ROI',
      value: summary.avgROI === null ? '--' : `${summary.avgROI.toFixed(1)}%`,
      valueClassName: metricTextClassName(summary.avgROI),
    },
    {
      label: 'Best Flip',
      sub: summary.bestFlipProfit ? `${summary.bestFlipProfit} profit` : undefined,
      value: summary.bestFlip,
    },
  ]
  const inventoryCards = [
    { label: 'Kept', value: String(summary.kept) },
    {
      label: 'Keeping Spend',
      value: formatCurrency(summary.keepingSpend),
      valueClassName: 'text-base',
    },
    { label: 'Still Holding', value: String(summary.stillHolding) },
    { label: 'Holding Value', value: formatCurrency(summary.holdingValue) },
    { label: 'Avg Hold Time', value: summary.avgHoldTime },
  ]

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted">
          Resale Activity
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {resaleCards.map((kpi) => (
            <SummaryCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted">
          Inventory & Keeping
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {inventoryCards.map((kpi) => (
            <SummaryCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  sub,
  value,
  valueClassName,
}: {
  label: string
  sub?: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--accent) / 0.10) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <p className="truncate text-[11px] font-medium uppercase tracking-widest text-muted">
          {label}
        </p>
        <p
          className={cn('mt-1.5 truncate text-xl font-bold', valueClassName ?? 'text-base')}
          title={value}
        >
          {value}
        </p>
        {sub ? (
          <p className="mt-0.5 truncate text-xs text-muted" title={sub}>
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-subtle bg-card p-10 text-center shadow-sm">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-4xl">
        📅
      </div>
      <h3 className="mt-5 text-xl font-semibold">No items found for this period</h3>
      <p className="mt-2 text-sm text-muted">Try a different date range</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg bg-card"
        />
      ))}
    </div>
  )
}

function metricTextClassName(value?: number | null) {
  if (value === undefined) {
    return ''
  }

  if (value === null) {
    return 'font-semibold text-muted'
  }

  if (value === 0) {
    return 'font-semibold text-base'
  }

  return value > 0 ? 'font-semibold text-positive' : 'font-semibold text-negative'
}

function getInitialPeriod(): Period {
  if (typeof localStorage === 'undefined') {
    return 'this-month'
  }

  const storedPeriod = localStorage.getItem('report-period')

  return periodOptions.some((option) => option.value === storedPeriod)
    ? (storedPeriod as Period)
    : 'this-month'
}
