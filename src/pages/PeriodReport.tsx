import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Link2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton'
import { useItems } from '@/hooks/useItems'
import {
  getFirstItemImageThumbnails,
  type ItemImageThumbnail,
} from '@/lib/itemFiles'
import {
  calculateItemProfit,
  calculateItemROI,
  calculateItemSellValue,
  getEffectiveItemStatus,
  isKeepingItem,
} from '@/lib/itemAccounting'
import {
  cn,
  formatCurrency,
  getStatusLabel,
} from '@/lib/utils'
import { formatDateInputValue } from '@/lib/dateInput'
import {
  buildReportRows,
  buildReportSummary,
  getChildrenByBundle,
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
import type { Item, ItemStatus } from '@/types'

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
const bundleChildAccountingNote = 'Included in bundle parent'
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
  const childrenByBundle = useMemo(() => getChildrenByBundle(items), [items])
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
          <h1 className="text-3xl font-bold text-base">Period Report</h1>
          <p className="mt-1 text-sm text-muted">
            Browse your inventory and finances by time period
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
          <div className="hidden overflow-hidden rounded-lg bg-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-subtle bg-surface text-xs uppercase text-muted bg-surface-2/60">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          className="flex items-center gap-1 transition hover:text-accent"
                          onClick={() => updateSort(column.key)}
                        >
                          {column.label}
                          <SortIcon
                            active={sort.key === column.key}
                            direction={sort.direction}
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ReportSection
                    allItems={items}
                    childrenByBundle={childrenByBundle}
                    expandedBundles={expandedBundles}
                    items={purchasedItems}
                    label="Purchased this period"
                    onOpenItem={openItem}
                    onToggleBundle={toggleBundle}
                    thumbnailByItemId={thumbnailByItemId}
                  />
                  <ReportSection
                    allItems={items}
                    childrenByBundle={childrenByBundle}
                    expandedBundles={expandedBundles}
                    items={soldItems}
                    label="Sold this period"
                    onOpenItem={openItem}
                    onToggleBundle={toggleBundle}
                    thumbnailByItemId={thumbnailByItemId}
                  />
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:hidden">
            <MobileSection
              allItems={items}
              childrenByBundle={childrenByBundle}
              expandedBundles={expandedBundles}
              items={purchasedItems}
              label="Purchased this period"
              onOpenItem={openItem}
              onToggleBundle={toggleBundle}
              thumbnailByItemId={thumbnailByItemId}
            />
            <MobileSection
              allItems={items}
              childrenByBundle={childrenByBundle}
              expandedBundles={expandedBundles}
              items={soldItems}
              label="Sold this period"
              onOpenItem={openItem}
              onToggleBundle={toggleBundle}
              thumbnailByItemId={thumbnailByItemId}
            />
          </div>

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

type ReportSectionProps = {
  allItems: Item[]
  childrenByBundle: Map<string, Item[]>
  expandedBundles: Set<string>
  items: Item[]
  label: string
  onOpenItem: (item: Item) => void
  onToggleBundle: (itemId: string) => void
  thumbnailByItemId: Map<string, ItemImageThumbnail>
}

function ReportSection({
  allItems,
  childrenByBundle,
  expandedBundles,
  items,
  label,
  onOpenItem,
  onToggleBundle,
  thumbnailByItemId,
}: ReportSectionProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <>
      <tr className="border-b border-subtle bg-surface-2/70">
        <td className="px-4 py-2 text-xs font-semibold uppercase text-muted" colSpan={columns.length}>
          {label}
        </td>
      </tr>
      {buildRows(items, childrenByBundle, expandedBundles).map(({ item, isChild }) => (
        <ReportRow
          key={`${label}-${item.tsid}`}
          allItems={allItems}
          childCount={childrenByBundle.get(item.tsid)?.length ?? 0}
          isChild={isChild}
          isExpanded={expandedBundles.has(item.tsid)}
          item={item}
          onOpen={() => onOpenItem(item)}
          onToggleBundle={() => onToggleBundle(item.tsid)}
          thumbnail={thumbnailByItemId.get(item.tsid)}
        />
      ))}
    </>
  )
}

function ReportRow({
  allItems,
  childCount,
  isChild,
  isExpanded,
  item,
  onOpen,
  onToggleBundle,
  thumbnail,
}: {
  allItems: Item[]
  childCount: number
  isChild: boolean
  isExpanded: boolean
  item: Item
  onOpen: () => void
  onToggleBundle: () => void
  thumbnail: ItemImageThumbnail | undefined
}) {
  const isKeeper = isKeepingItem(item)
  const sellValue = calculateItemSellValue(item, allItems)
  const profit = calculateItemProfit(item, allItems)
  const roi = calculateItemROI(item, allItems)

  return (
    <tr
      className={cn(
        'cursor-pointer border-b border-subtle transition hover:bg-accent-soft/70',
        isChild && 'bg-surface-2/40',
      )}
      onClick={onOpen}
    >
      <td className="px-4 py-4 font-medium text-base">
        <NameCell
          childCount={childCount}
          isChild={isChild}
          isExpanded={isExpanded}
          item={item}
          onToggleBundle={onToggleBundle}
          thumbnail={thumbnail}
        />
      </td>
      <td className="px-4 py-4 text-muted">{item.category || '--'}</td>
      <td className="px-4 py-4">
        <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
      </td>
      <td className="px-4 py-4 text-muted">{formatDateInputValue(item.bought_at)}</td>
      <td className="px-4 py-4 text-muted">{formatDateInputValue(item.sold_at) || '--'}</td>
      <td className="px-4 py-4">{formatCurrency(item.buy_price)}</td>
      <td className={cn('px-4 py-4', isKeeper && 'text-muted')}>
        {isKeeper ? (
          '--'
        ) : isChild ? (
          <div>
            <span>{formatCurrency(sellValue)}</span>
            <span className="block text-xs font-medium text-muted">Revenue</span>
          </div>
        ) : (
          formatCurrency(sellValue)
        )}
      </td>
      <td className={cn('px-4 py-4 font-semibold', isKeeper ? 'text-muted' : metricTextClassName(profit))}>
        {isChild ? (
          <span className="text-xs font-medium text-muted">{bundleChildAccountingNote}</span>
        ) : isKeeper || profit === null ? (
          '--'
        ) : (
          formatCurrency(profit)
        )}
      </td>
      <td className={cn('px-4 py-4 font-semibold', isKeeper ? 'text-muted' : metricTextClassName(roi))}>
        {isChild ? (
          <span className="text-xs font-medium text-muted">{bundleChildAccountingNote}</span>
        ) : isKeeper || roi === null ? (
          '--'
        ) : (
          `${roi.toFixed(1)}%`
        )}
      </td>
    </tr>
  )
}

function MobileSection(props: ReportSectionProps) {
  if (props.items.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {props.label}
      </h2>
      {buildRows(props.items, props.childrenByBundle, props.expandedBundles).map(
        ({ item, isChild }) => (
          <ReportCard
            key={`${props.label}-${item.tsid}`}
            allItems={props.allItems}
            childCount={props.childrenByBundle.get(item.tsid)?.length ?? 0}
            isChild={isChild}
            isExpanded={props.expandedBundles.has(item.tsid)}
            item={item}
            onOpen={() => props.onOpenItem(item)}
            onToggleBundle={() => props.onToggleBundle(item.tsid)}
            thumbnail={props.thumbnailByItemId.get(item.tsid)}
          />
        ),
      )}
    </section>
  )
}

function ReportCard({
  allItems,
  childCount,
  isChild,
  isExpanded,
  item,
  onOpen,
  onToggleBundle,
  thumbnail,
}: {
  allItems: Item[]
  childCount: number
  isChild: boolean
  isExpanded: boolean
  item: Item
  onOpen: () => void
  onToggleBundle: () => void
  thumbnail: ItemImageThumbnail | undefined
}) {
  const isKeeper = isKeepingItem(item)
  const sellValue = calculateItemSellValue(item, allItems)
  const profit = calculateItemProfit(item, allItems)
  const roi = calculateItemROI(item, allItems)

  return (
    <button
      type="button"
      className={cn(
        'rounded-lg bg-card p-4 text-left shadow-sm transition hover:shadow-md',
        isChild && 'ml-5 border border-accent/30',
      )}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ItemThumbnail name={item.name} thumbnail={thumbnail} />
          <div className="min-w-0">
            <h3 className="font-semibold text-base">
              <span className="inline-flex items-center gap-2">
                {isChild ? <Link2 className="h-4 w-4 text-accent" aria-hidden="true" /> : null}
                {item.name}
                {item.is_bundle_parent ? <BundleBadge count={childCount} /> : null}
              </span>
            </h3>
            <p className="mt-1 text-sm text-muted">{item.category || 'Uncategorized'}</p>
          </div>
        </div>
        <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
      </div>
      {item.is_bundle_parent ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-accent transition hover:bg-accent-soft"
          onClick={(event) => {
            event.stopPropagation()
            onToggleBundle()
          }}
        >
          {isExpanded ? 'Hide bundle items' : 'Show bundle items'}
        </button>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MobileMetric label="Bought" value={formatDateInputValue(item.bought_at)} />
        <MobileMetric label="Sold" value={formatDateInputValue(item.sold_at) || '--'} />
        <MobileMetric label="Buy" value={formatCurrency(item.buy_price)} />
        <MobileMetric label={isChild ? 'Revenue' : 'Sell'} value={isKeeper ? '--' : formatCurrency(sellValue)} />
        <MobileMetric
          label="Profit"
          tone={isKeeper ? null : profit}
          value={
            isChild
              ? bundleChildAccountingNote
              : isKeeper || profit === null
                ? '--'
                : formatCurrency(profit)
          }
        />
        <MobileMetric
          label="ROI"
          tone={isKeeper ? null : roi}
          value={
            isChild
              ? bundleChildAccountingNote
              : isKeeper || roi === null
                ? '--'
                : `${roi.toFixed(1)}%`
          }
        />
      </div>
    </button>
  )
}

function NameCell({
  childCount,
  isChild,
  isExpanded,
  item,
  onToggleBundle,
  thumbnail,
}: {
  childCount: number
  isChild: boolean
  isExpanded: boolean
  item: Item
  onToggleBundle: () => void
  thumbnail: ItemImageThumbnail | undefined
}) {
  return (
    <div className={cn('flex items-center gap-2', isChild && 'pl-8')}>
      {item.is_bundle_parent ? (
        <button
          type="button"
          className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-accent"
          onClick={(event) => {
            event.stopPropagation()
            onToggleBundle()
          }}
          aria-label={isExpanded ? 'Collapse bundle' : 'Expand bundle'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
      {isChild ? <Link2 className="h-4 w-4 text-accent" aria-hidden="true" /> : null}
      <ItemThumbnail name={item.name} thumbnail={thumbnail} />
      <span>{item.name}</span>
      {item.is_bundle_parent ? <BundleBadge count={childCount} /> : null}
    </div>
  )
}

function ItemThumbnail({
  name,
  thumbnail,
}: {
  name: string
  thumbnail: ItemImageThumbnail | undefined
}) {
  return (
    <ImageWithSkeleton
      src={thumbnail?.signed_url}
      alt={name}
      skeletonClassName="h-10 w-10 shrink-0 rounded-md border border-border-base flex-shrink-0"
      className="rounded-md border border-border-base"
    />
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const className = {
    holding: 'bg-accent/15 text-accent bg-accent/15',
    listed: 'bg-accent-soft text-accent bg-accent/15',
    sold: 'bg-positive/15 text-positive bg-positive/15',
    keeper: 'bg-accent-soft text-accent bg-accent/15',
  }[status]

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function BundleBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent bg-accent/15">
      Bundle ({count})
    </span>
  )
}

function MobileMetric({
  label,
  tone,
  value,
}: {
  label: string
  tone?: number | null
  value: string
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={tone === undefined ? 'font-medium' : metricTextClassName(tone)}>
        {value}
      </p>
    </div>
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SortState['direction']
}) {
  if (!active) {
    return <ArrowUp className="h-3.5 w-3.5 opacity-20" aria-hidden="true" />
  }

  return direction === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
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
