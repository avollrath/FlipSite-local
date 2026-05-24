import {
 ChevronDown,
 ChevronRight,
 Edit3,
 Link2,
 Trash2,
 ArrowDown,
 ArrowUp,
} from 'lucide-react'
import {
 calculateItemProfit,
 calculateItemROI,
 calculateItemSellValue,
 formatCurrency,
 formatDate,
 getBuyPlatform,
 getEffectiveItemStatus,
 getSellPlatform,
 isKeepingItem,
} from '@/lib/utils'
import type { ItemImageThumbnail } from '@/lib/itemFiles'
import type { Item } from '@/types'
import type { ItemListRow, SortKey, SortState } from '@/components/items/itemListModel'
import {
 BundleBadge,
 ItemThumbnail,
 MobileMetric,
 StatusBadge,
} from '@/components/items/ItemDisplay'
import { metricCellClassName } from '@/components/items/itemDisplayUtils'

const bundleChildAccountingNote = 'Included in bundle parent'

export function ItemTable({
 allItems,
 childrenByBundle,
 columns,
 expandedBundles,
 onDelete,
 onEdit,
 onToggleBundle,
 onUpdateSort,
 rows,
 sort,
 thumbnailByItemId,
}: {
 allItems: Item[]
 childrenByBundle: Map<string, Item[]>
 columns: Array<{ key: SortKey | 'actions'; label: string }>
 expandedBundles: Set<string>
 onDelete: (item: Item) => void
 onEdit: (item: Item) => void
 onToggleBundle: (tsid: string) => void
 onUpdateSort: (key: SortKey) => void
 rows: ItemListRow[]
 sort: SortState
 thumbnailByItemId: Map<string, ItemImageThumbnail>
}) {
 return (
 <>
 <div className="hidden mt-6 overflow-hidden rounded-lg shadow-sm bg-card md:block">
  <div className="overflow-x-auto">
  <table className="w-full min-w-[1160px] text-left text-sm">
  <thead className="text-xs uppercase border-b border-subtle bg-surface text-muted bg-surface-2/60 ">
   <tr>
   {columns.map((column) => (
    <th
    key={column.key}
    className="px-4 py-3 font-semibold"
    >
    {column.key === 'actions' ? (
     column.label
    ) : (
     <button
     type="button"
     className="flex items-center gap-1 transition hover:text-accent"
     onClick={() =>
      onUpdateSort(column.key as SortKey)
     }
     >
     {column.label}
     <SortIcon
      active={sort.key === column.key}
      direction={sort.direction}
     />
     </button>
    )}
    </th>
   ))}
   </tr>
  </thead>
  <tbody className="divide-y divide-subtle">
   {rows.map(({ item, isChild }) => (
   <ItemRow
    key={item.tsid}
    item={item}
    childCount={childrenByBundle.get(item.tsid)?.length ?? 0}
    isChild={isChild}
    isExpanded={expandedBundles.has(item.tsid)}
    onEdit={() => onEdit(item)}
    onDelete={() => onDelete(item)}
    onToggleBundle={() => onToggleBundle(item.tsid)}
    thumbnail={thumbnailByItemId.get(item.tsid)}
    allItems={allItems}
   />
   ))}
  </tbody>
  </table>
  </div>
 </div>

 <div className="grid gap-4 mt-6 md:hidden">
  {rows.map(({ item, isChild }) => (
  <ItemCard
   key={item.tsid}
   item={item}
   childCount={childrenByBundle.get(item.tsid)?.length ?? 0}
   isChild={isChild}
   isExpanded={expandedBundles.has(item.tsid)}
   onEdit={() => onEdit(item)}
   onToggleBundle={() => onToggleBundle(item.tsid)}
   thumbnail={thumbnailByItemId.get(item.tsid)}
   allItems={allItems}
  />
  ))}
 </div>
 </>
 )
}

function ItemRow({
 childCount,
 isChild,
 isExpanded,
 item,
 onDelete,
 onEdit,
 onToggleBundle,
 thumbnail,
 allItems,
}: {
 childCount: number
 isChild: boolean
 isExpanded: boolean
 item: Item
 onDelete: () => void
 onEdit: () => void
 onToggleBundle: () => void
 thumbnail: ItemImageThumbnail | undefined
 allItems: Item[]
}) {
 const isKeeper = isKeepingItem(item)
 const sellValue = calculateItemSellValue(item, allItems)
 const profit = calculateItemProfit(item, allItems)
 const roi = calculateItemROI(item, allItems)

 return (
 <tr
  className={`cursor-pointer transition hover:bg-accent-soft/70 ${
  isChild ? 'bg-surface/70 bg-surface-2/40' : ''
  }`}
  onClick={onEdit}
 >
  <td className="px-4 py-4 align-middle text-base font-medium ">
  <div className={`flex items-center gap-2 ${isChild ? 'pl-8' : ''}`}>
   {item.is_bundle_parent ? (
   <button
    type="button"
    className="p-1 transition rounded text-muted hover:bg-surface-2 hover:text-accent"
    onClick={(event) => {
    event.stopPropagation()
    onToggleBundle()
    }}
    aria-label={isExpanded ? 'Collapse bundle' : 'Expand bundle'}
   >
    {isExpanded ? (
    <ChevronDown className="w-4 h-4" aria-hidden="true" />
    ) : (
    <ChevronRight className="w-4 h-4" aria-hidden="true" />
    )}
   </button>
   ) : null}
   {isChild ? (
   <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
    <Link2
    className="shrink-0 text-accent"
    aria-hidden="true"
    size={16}
    strokeWidth={2}
    />
   </span>
   ) : null}
   <ItemThumbnail name={item.name} thumbnail={thumbnail} />
   <span>{item.name}</span>
   {item.is_bundle_parent ? <BundleBadge count={childCount} /> : null}
  </div>
  </td>
  <td className="px-4 py-4 text-muted ">{item.category || '--'}</td>
  <td className="px-4 py-4 text-muted ">{item.condition}</td>
  <td className="px-4 py-4">{formatCurrency(item.buy_price)}</td>
  <td className={isKeeper ? 'px-4 py-4 text-muted' : 'px-4 py-4'}>
  {isKeeper ? (
   '--'
  ) : isChild ? (
   <div>
   <span>{formatCurrency(sellValue)}</span>
   <span className="block text-xs font-medium text-muted">
    Revenue
   </span>
   </div>
  ) : (
   formatCurrency(sellValue)
  )}
  </td>
  <td
  className={
   isKeeper
   ? 'px-4 py-4 font-semibold text-muted'
   : metricCellClassName(profit)
  }
  >
  {isChild ? (
   <span className="text-xs font-medium text-muted">
   {bundleChildAccountingNote}
   </span>
  ) : isKeeper || profit === null ? (
   '--'
  ) : (
   formatCurrency(profit)
  )}
  </td>
  <td
  className={
   isKeeper
   ? 'px-4 py-4 font-semibold text-muted'
   : metricCellClassName(roi)
  }
  >
  {isChild ? (
   <span className="text-xs font-medium text-muted">
   {bundleChildAccountingNote}
   </span>
  ) : isKeeper || roi === null ? (
   '--'
  ) : (
   `${roi.toFixed(1)}%`
  )}
  </td>
  <td className="px-4 py-4 text-muted ">{getBuyPlatform(item) || '--'}</td>
  <td className="px-4 py-4 text-muted ">{getSellPlatform(item) || '--'}</td>
  <td className="px-4 py-4">
  <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
  </td>
  <td className="px-4 py-4 text-muted ">{formatDate(item.bought_at)}</td>
  <td className="px-4 py-4 text-muted ">
  {formatDate(item.sold_at) || '--'}
  </td>
  <td className="px-4 py-4">
  <div className="flex items-center gap-1">
   <button
   type="button"
   className="p-2 transition rounded-lg text-muted hover:bg-surface-2 hover:text-accent"
   onClick={(event) => {
    event.stopPropagation()
    onEdit()
   }}
   aria-label={`Edit ${item.name}`}
   >
   <Edit3 className="w-4 h-4" aria-hidden="true" />
   </button>
   <button
   type="button"
   className="p-2 transition rounded-lg text-muted hover:bg-negative/10 hover:text-negative"
   onClick={(event) => {
    event.stopPropagation()
    onDelete()
   }}
   aria-label={`Delete ${item.name}`}
   >
   <Trash2 className="w-4 h-4" aria-hidden="true" />
   </button>
  </div>
  </td>
 </tr>
 )
}

function ItemCard({
 childCount,
 isChild,
 isExpanded,
 item,
 onEdit,
 onToggleBundle,
 thumbnail,
 allItems,
}: {
 childCount: number
 isChild: boolean
 isExpanded: boolean
 item: Item
 onEdit: () => void
 onToggleBundle: () => void
 thumbnail: ItemImageThumbnail | undefined
 allItems: Item[]
}) {
 const isKeeper = isKeepingItem(item)
 const sellValue = calculateItemSellValue(item, allItems)
 const profit = calculateItemProfit(item, allItems)
 const roi = calculateItemROI(item, allItems)

 return (
 <button
  type="button"
  className={`rounded-lg bg-card p-4 text-left shadow-sm transition hover:shadow-md ${
  isChild ? 'ml-5 border border-accent/30' : ''
  }`}
  onClick={onEdit}
 >
  <div className="flex items-start justify-between gap-3">
  <div className="flex items-start min-w-0 gap-3">
   <ItemThumbnail name={item.name} thumbnail={thumbnail} />
   <div className="min-w-0">
   <h3 className="text-base font-semibold ">
    <span className="inline-flex items-center gap-2">
    {isChild ? (
     <Link2 className="w-4 h-4 text-accent" aria-hidden="true" />
    ) : null}
    {item.name}
    {item.is_bundle_parent ? (
     <BundleBadge count={childCount} />
    ) : null}
    </span>
   </h3>
   <p className="mt-1 text-sm text-muted ">
    {item.category || 'Uncategorized'} -{' '}
    {getBuyPlatform(item) || '--'}
   </p>
   </div>
  </div>
  <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
  </div>
  {item.is_bundle_parent ? (
  <button
   type="button"
   className="inline-flex items-center gap-2 px-2 py-1 mt-3 text-sm font-medium transition rounded-lg text-accent hover:bg-accent-soft"
   onClick={(event) => {
   event.stopPropagation()
   onToggleBundle()
   }}
  >
   {isExpanded ? 'Hide bundle items' : 'Show bundle items'}
  </button>
  ) : null}
  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
  <MobileMetric label="Buy" value={formatCurrency(item.buy_price)} />
  <MobileMetric
   label={isChild ? 'Revenue' : 'Sell'}
   value={isKeeper ? '--' : formatCurrency(sellValue)}
  />
  <MobileMetric
   label="Profit"
   value={
   isChild
    ? bundleChildAccountingNote
    : isKeeper || profit === null
     ? '--'
     : formatCurrency(profit)
   }
   tone={isKeeper ? null : profit}
  />
  <MobileMetric
   label="ROI"
   value={
   isChild
    ? bundleChildAccountingNote
    : isKeeper || roi === null
     ? '--'
     : `${roi.toFixed(1)}%`
   }
   tone={isKeeper ? null : roi}
  />
  <MobileMetric label="Bought" value={formatDate(item.bought_at)} />
  <MobileMetric label="Sold" value={formatDate(item.sold_at) || '--'} />
  </div>
 </button>
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
