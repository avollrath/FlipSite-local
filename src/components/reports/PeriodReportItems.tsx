import {
 ArrowDown,
 ArrowUp,
 ChevronDown,
 ChevronRight,
 Link2,
} from 'lucide-react'
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton'
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
import type { ItemImageThumbnail } from '@/lib/itemFiles'
import type { Item, ItemStatus } from '@/types'
import {
 buildReportRows,
 type ReportSortKey,
 type ReportSortState,
} from '@/components/reports/periodReportModel'
import { BundleBadge } from '@/components/items/ItemDisplay'

const bundleChildAccountingNote = 'Included in bundle parent'

export function PeriodReportItems({
 allItems,
 childrenByBundle,
 columns,
 expandedBundles,
 onOpenItem,
 onToggleBundle,
 onUpdateSort,
 purchasedItems,
 soldItems,
 sort,
 thumbnailByItemId,
}: {
 allItems: Item[]
 childrenByBundle: Map<string, Item[]>
 columns: Array<{ key: ReportSortKey; label: string }>
 expandedBundles: Set<string>
 onOpenItem: (item: Item) => void
 onToggleBundle: (itemId: string) => void
 onUpdateSort: (key: ReportSortKey) => void
 purchasedItems: Item[]
 soldItems: Item[]
 sort: ReportSortState
 thumbnailByItemId: Map<string, ItemImageThumbnail>
}) {
 return (
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
      onClick={() => onUpdateSort(column.key)}
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
    allItems={allItems}
    childrenByBundle={childrenByBundle}
    columns={columns}
    expandedBundles={expandedBundles}
    items={purchasedItems}
    label="Purchased this period"
    onOpenItem={onOpenItem}
    onToggleBundle={onToggleBundle}
    thumbnailByItemId={thumbnailByItemId}
    />
    <ReportSection
    allItems={allItems}
    childrenByBundle={childrenByBundle}
    columns={columns}
    expandedBundles={expandedBundles}
    items={soldItems}
    label="Sold this period"
    onOpenItem={onOpenItem}
    onToggleBundle={onToggleBundle}
    thumbnailByItemId={thumbnailByItemId}
    />
   </tbody>
   </table>
  </div>
  </div>

  <div className="grid gap-4 md:hidden">
  <MobileSection
   allItems={allItems}
   childrenByBundle={childrenByBundle}
   expandedBundles={expandedBundles}
   items={purchasedItems}
   label="Purchased this period"
   onOpenItem={onOpenItem}
   onToggleBundle={onToggleBundle}
   thumbnailByItemId={thumbnailByItemId}
  />
  <MobileSection
   allItems={allItems}
   childrenByBundle={childrenByBundle}
   expandedBundles={expandedBundles}
   items={soldItems}
   label="Sold this period"
   onOpenItem={onOpenItem}
   onToggleBundle={onToggleBundle}
   thumbnailByItemId={thumbnailByItemId}
  />
  </div>
 </>
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
 columns,
 expandedBundles,
 items,
 label,
 onOpenItem,
 onToggleBundle,
 thumbnailByItemId,
}: ReportSectionProps & { columns: Array<{ key: ReportSortKey; label: string }> }) {
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
  {buildReportRows(items, childrenByBundle, expandedBundles).map(({ item, isChild }) => (
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
  {buildReportRows(props.items, props.childrenByBundle, props.expandedBundles).map(
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
 direction: ReportSortState['direction']
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
