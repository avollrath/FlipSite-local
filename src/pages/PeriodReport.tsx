import {
  Banknote,
  Boxes,
  Heart,
  PackageOpen,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
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
  calculateItemProfit,
  getEffectiveItemStatus,
  isKeepingItem,
} from '@/lib/itemAccounting'
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
  isDateInRange,
  sortReportItems,
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
  { key: 'bought_at', label: 'Bought' },
  { key: 'sold_at', label: 'Sold' },
  { key: 'buy_price', label: 'Buy cost' },
  { key: 'sell_price', label: 'Revenue' },
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
  const keptItems = useMemo(
    () =>
      sortReportItems(
        periodItems.filter(
          (item) => isDateInRange(item.bought_at, range) && isKeepingItem(item),
        ),
        sortTouched ? sort : { direction: 'desc', key: 'bought_at' },
        items,
      ),
    [items, periodItems, range, sort, sortTouched],
  )
  const holdingItems = useMemo(
    () =>
      sortReportItems(
        periodItems.filter((item) => {
          if (!isDateInRange(item.bought_at, range) || isKeepingItem(item)) {
            return false
          }

          const status = getEffectiveItemStatus(item, items)

          return status === 'holding' || status === 'listed'
        }),
        sortTouched ? sort : { direction: 'desc', key: 'bought_at' },
        items,
      ),
    [items, periodItems, range, sort, sortTouched],
  )
  const boughtItems = useMemo(() => {
    const groupedIds = new Set([
      ...keptItems.map((item) => item.tsid),
      ...holdingItems.map((item) => item.tsid),
    ])

    return purchasedItems.filter((item) => !groupedIds.has(item.tsid))
  }, [holdingItems, keptItems, purchasedItems])
  const biggestLoss = useMemo(
    () => getBiggestLoss(soldItems, items),
    [items, soldItems],
  )
  const visibleRows = useMemo(
    () => [
      ...buildReportRows(boughtItems, childrenByBundle, expandedBundles),
      ...buildReportRows(soldItems, childrenByBundle, expandedBundles),
      ...buildReportRows(keptItems, childrenByBundle, expandedBundles),
      ...buildReportRows(holdingItems, childrenByBundle, expandedBundles),
    ],
    [boughtItems, childrenByBundle, expandedBundles, holdingItems, keptItems, soldItems],
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
    <section className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base">Activity Report</h1>
          <p className="mt-1 text-sm text-muted">
            Review what you bought, sold, kept, and earned.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-card p-2 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-accent/15',
                  period === option.value
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-transparent text-muted hover:border-accent/20 hover:bg-accent/5 hover:text-accent',
                )}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {period === 'custom' ? (
            <div className="flex flex-wrap items-end gap-2 border-t border-subtle pt-2">
              <label className="grid gap-1 text-xs font-medium text-muted">
                From
                <DatePickerInput
                  className={dateInputClassName}
                  value={customFrom}
                  onChange={setCustomFrom}
                />
              </label>
              <span className="pb-2 text-sm text-muted">to</span>
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
      </div>

      <ActivitySummary summary={summary} />
      <Highlights summary={summary} biggestLoss={biggestLoss} />

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
            holdingItems={holdingItems}
            keptItems={keptItems}
            purchasedItems={boughtItems}
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

function ActivitySummary({ summary }: { summary: ReportSummary }) {
  return (
    <section className="mb-6 grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
      <SummaryCard
        hero={summary.sold > 0}
        icon={Banknote}
        label="Profit"
        value={formatCurrency(summary.totalProfit)}
        helper="Revenue minus resale purchase costs"
        valueClassName={metricTextClassName(summary.totalProfit)}
      />
      <SummaryCard
        icon={TrendingUp}
        label="Revenue"
        value={formatCurrency(summary.totalRevenue)}
        helper="Money received from sold items"
      />
      <SummaryCard
        icon={WalletCards}
        label="Cash spent"
        value={formatCurrency(summary.totalPaid)}
        helper="Purchase cost of items bought in this period"
      />
      <SummaryCard
        icon={Boxes}
        label="Activity"
        value={`${summary.purchased} bought`}
        helper={`Sold ${summary.sold} / Kept ${summary.kept}`}
      />
    </section>
  )
}

function Highlights({
  biggestLoss,
  summary,
}: {
  biggestLoss: { name: string; profit: number } | null
  summary: ReportSummary
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
        Highlights
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HighlightCard
          icon={TrendingUp}
          label="Best flip"
          text={
            summary.bestFlipProfit
              ? `${summary.bestFlip}: +${summary.bestFlipProfit}`
              : 'No profitable flip in this range yet'
          }
          tone="positive"
        />
        <HighlightCard
          icon={TrendingDown}
          label="Biggest loss"
          text={
            biggestLoss
              ? `${biggestLoss.name}: ${formatCurrency(biggestLoss.profit)}`
              : 'No loss-making flip in this range'
          }
          tone={biggestLoss ? 'negative' : 'neutral'}
        />
        <HighlightCard
          icon={Boxes}
          label="Still holding"
          text={
            summary.stillHolding > 0
              ? `${summary.stillHolding} resale items still holding, ${formatCurrency(summary.holdingValue)} tied up`
              : 'No new resale inventory still holding'
          }
        />
        <HighlightCard
          icon={Heart}
          label="Keeping spend"
          text={
            summary.kept > 0
              ? `${summary.kept} kept items, ${formatCurrency(summary.keepingSpend)} spent`
              : 'No kept items bought in this range'
          }
        />
      </div>
    </section>
  )
}

function SummaryCard({
  helper,
  hero = false,
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  helper: string
  hero?: boolean
  icon: typeof Banknote
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl bg-card p-5 shadow-sm',
        hero && 'ring-1 ring-accent/20',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[11px] font-medium uppercase tracking-widest text-muted">
            {label}
          </p>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p
          className={cn(
            'mt-3 truncate font-bold tracking-tight',
            hero ? 'text-3xl' : 'text-2xl',
            valueClassName ?? 'text-base',
          )}
          title={value}
        >
          {value}
        </p>
        <p className="mt-2 text-sm text-muted">{helper}</p>
      </div>
    </article>
  )
}

function HighlightCard({
  icon: Icon,
  label,
  text,
  tone = 'neutral',
}: {
  icon: typeof Banknote
  label: string
  text: string
  tone?: 'positive' | 'negative' | 'neutral'
}) {
  return (
    <article className="rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            tone === 'positive' && 'bg-positive/15 text-positive',
            tone === 'negative' && 'bg-negative/15 text-negative',
            tone === 'neutral' && 'bg-accent/10 text-accent',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-base">{text}</p>
        </div>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-subtle bg-card p-10 text-center shadow-sm">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/10 text-accent">
        <PackageOpen className="h-9 w-9" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-semibold">No activity in this range</h3>
      <p className="mt-2 text-sm text-muted">
        Try a wider date range to review bought, sold, or kept items.
      </p>
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

function getBiggestLoss(soldItems: Item[], allItems: Item[]) {
  return soldItems.reduce<{ name: string; profit: number } | null>((loss, item) => {
    const profit = calculateItemProfit(item, allItems)

    if (profit === null || profit >= 0) {
      return loss
    }

    if (!loss || profit < loss.profit) {
      return { name: item.name, profit }
    }

    return loss
  }, null)
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
