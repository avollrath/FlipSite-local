import {
 calculateItemProfit,
 calculateItemROI,
 calculateItemSellValue,
 getBuyPlatform,
 getEffectiveItemStatus,
 getItemPlatformSearchText,
 getSellPlatform,
 getStatusLabel,
 isKeepingItem,
} from '@/lib/utils'
import type { Item, ItemStatus } from '@/types'

export type SortKey =
 | 'name'
 | 'category'
 | 'condition'
 | 'buy_price'
 | 'sell_price'
 | 'profit'
 | 'roi'
 | 'buy_platform'
 | 'sell_platform'
 | 'status'
 | 'bought_at'
 | 'sold_at'
 | 'created_at'

export type SortState = {
 key: SortKey
 direction: 'asc' | 'desc'
}

export type BundleFilter = 'none' | 'only' | 'active'

export type ItemListFilters = {
 bundleFilter: BundleFilter
 buyPlatformFilter: string
 categoryFilter: string
 focusedItemId: string
 inventoryOnly: boolean
 search: string
 statusFilter: ItemStatus | 'all'
}

export type ItemListRow = {
 isChild: boolean
 item: Item
}

export function getChildrenByBundle(items: Item[]) {
 return items.reduce((map, item) => {
 if (!item.bundle_id) {
 return map
 }

 const children = map.get(item.bundle_id) ?? []
 children.push(item)
 map.set(item.bundle_id, children)
 return map
 }, new Map<string, Item[]>())
}

export function getActiveBundleIds(items: Item[], childrenByBundle = getChildrenByBundle(items)) {
 const activeIds = new Set<string>()

 for (const [bundleId, children] of childrenByBundle) {
 if (
  children.some(
  (child) => getEffectiveItemStatus(child, items) !== 'sold',
  )
 ) {
  activeIds.add(bundleId)
 }
 }

 return activeIds
}

export function getVisibleItems({
 activeBundleIds,
 childrenByBundle,
 filters,
 items,
 sort,
}: {
 activeBundleIds?: Set<string>
 childrenByBundle?: Map<string, Item[]>
 filters: ItemListFilters
 items: Item[]
 sort: SortState
}) {
 const bundleChildren = childrenByBundle ?? getChildrenByBundle(items)
 const activeIds = activeBundleIds ?? getActiveBundleIds(items, bundleChildren)
 const normalizedSearch = filters.search.trim().toLowerCase()

 return items
 .filter((item) => {
  if (filters.focusedItemId) {
  return item.tsid === filters.focusedItemId
  }

  const effectiveStatus = getEffectiveItemStatus(item, items)
  const matchesSearch =
  !normalizedSearch ||
  [
   item.name,
   item.category,
   item.condition,
   getItemPlatformSearchText(item),
   effectiveStatus,
   item.notes ?? '',
  ]
   .join(' ')
   .toLowerCase()
   .includes(normalizedSearch)

  const matchesStatus =
  filters.statusFilter === 'all' || effectiveStatus === filters.statusFilter
  const matchesInventory =
  !filters.inventoryOnly ||
  ['holding', 'keeper', 'listed'].includes(effectiveStatus)
  const matchesBuyPlatform =
  filters.buyPlatformFilter === 'all' ||
  getBuyPlatform(item) === filters.buyPlatformFilter
  const matchesCategory =
  filters.categoryFilter === 'all' || item.category === filters.categoryFilter

  const matchesBundleFilter =
  filters.bundleFilter === 'none' ||
  (filters.bundleFilter === 'only' && item.is_bundle_parent) ||
  (filters.bundleFilter === 'active' &&
   item.is_bundle_parent &&
   activeIds.has(item.tsid))

  return (
  matchesSearch &&
  matchesStatus &&
  matchesInventory &&
  matchesBuyPlatform &&
  matchesCategory &&
  matchesBundleFilter
  )
 })
 .sort((a, b) => compareItems(a, b, sort, items))
}

export function getVisibleRows({
 childrenByBundle,
 expandedBundles,
 filters,
 visibleItems,
}: {
 childrenByBundle: Map<string, Item[]>
 expandedBundles: Set<string>
 filters: ItemListFilters
 visibleItems: Item[]
}): ItemListRow[] {
 const rows: ItemListRow[] = []

 if (filters.focusedItemId) {
 return visibleItems.map((item) => ({
  item,
  isChild: Boolean(item.bundle_id),
 }))
 }

 if (
 filters.statusFilter !== 'all' ||
 filters.inventoryOnly ||
 filters.buyPlatformFilter !== 'all' ||
 filters.categoryFilter !== 'all' ||
 filters.search.trim()
 ) {
 return visibleItems.map((item) => ({
  item,
  isChild: Boolean(item.bundle_id),
 }))
 }

 visibleItems
 .filter((item) => !item.bundle_id)
 .forEach((item) => {
  rows.push({ item, isChild: false })

  if (item.is_bundle_parent && expandedBundles.has(item.tsid)) {
  for (const child of childrenByBundle.get(item.tsid) ?? []) {
   rows.push({ item: child, isChild: true })
  }
  }
 })

 return rows
}

export function compareItems(a: Item, b: Item, sort: SortState, allItems: Item[]) {
 const aValue = getSortValue(a, sort.key, allItems)
 const bValue = getSortValue(b, sort.key, allItems)
 const direction = sort.direction === 'asc' ? 1 : -1

 if (typeof aValue === 'number' && typeof bValue === 'number') {
 return (aValue - bValue) * direction
 }

 return String(aValue).localeCompare(String(bValue)) * direction
}

export function getSortValue(item: Item, key: SortKey, allItems: Item[]) {
 if (key === 'profit') {
 if (isKeepingItem(item)) {
  return Number.NEGATIVE_INFINITY
 }

 return calculateItemProfit(item, allItems) ?? Number.NEGATIVE_INFINITY
 }

 if (key === 'roi') {
 if (isKeepingItem(item)) {
  return Number.NEGATIVE_INFINITY
 }

 return calculateItemROI(item, allItems) ?? Number.NEGATIVE_INFINITY
 }

 if (key === 'sell_price') {
 if (isKeepingItem(item)) {
  return 0
 }

 return calculateItemSellValue(item, allItems)
 }

 if (key === 'status') {
 return getStatusLabel(getEffectiveItemStatus(item, allItems))
 }

 if (key === 'buy_platform') {
 return getBuyPlatform(item)
 }

 if (key === 'sell_platform') {
 return getSellPlatform(item)
 }

 if (key === 'bought_at' || key === 'sold_at') {
 return item[key] ? new Date(item[key]).getTime() : 0
 }

 return item[key] ?? ''
}

export function uniqueItemValues(values: string[]) {
 return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
 a.localeCompare(b),
 )
}
