import {
 getEffectiveItemStatus,
 isAggregateItem,
 isKeepingItem,
 calculateItemSellValue,
} from '@/lib/itemAccounting'
import type { Item } from '@/types'

export type ItemIndex = {
 aggregateItems: Item[]
 bundleChildren: Item[]
 bundleParents: Item[]
 childrenByBundleId: Map<string, Item[]>
 itemsById: Map<string, Item>
 itemsSortedByBoughtDate: Item[]
 itemsSortedBySoldDate: Item[]
 keeperItems: Item[]
 parentByChildId: Map<string, Item>
 soldAggregateItems: Item[]
 standaloneItems: Item[]
 unsoldResaleItems: Item[]
}

export function createItemIndex(items: Item[]): ItemIndex {
 const itemsById = new Map(items.map((item) => [item.tsid, item]))
 const childrenByBundleId = new Map<string, Item[]>()
 const parentByChildId = new Map<string, Item>()
 const standaloneItems: Item[] = []
 const bundleParents: Item[] = []
 const bundleChildren: Item[] = []
 const aggregateItems: Item[] = []
 const keeperItems: Item[] = []
 const soldAggregateItems: Item[] = []
 const unsoldResaleItems: Item[] = []

 for (const item of items) {
 if (item.bundle_id) {
  bundleChildren.push(item)
  const children = childrenByBundleId.get(item.bundle_id) ?? []
  children.push(item)
  childrenByBundleId.set(item.bundle_id, children)

  const parent = itemsById.get(item.bundle_id)
  if (parent) {
  parentByChildId.set(item.tsid, parent)
  }
 } else {
  standaloneItems.push(item)
 }

 if (item.is_bundle_parent) {
  bundleParents.push(item)
 }

 if (!isAggregateItem(item)) {
  continue
 }

 aggregateItems.push(item)

 if (isKeepingItem(item)) {
  keeperItems.push(item)
  continue
 }

 const effectiveStatus = getEffectiveItemStatus(item, items)

 if (effectiveStatus === 'sold' && calculateItemSellValue(item, items) > 0) {
  soldAggregateItems.push(item)
 } else if (effectiveStatus === 'holding' || effectiveStatus === 'listed') {
  unsoldResaleItems.push(item)
 }
 }

 return {
 aggregateItems,
 bundleChildren,
 bundleParents,
 childrenByBundleId,
 itemsById,
 itemsSortedByBoughtDate: sortByDate(items, 'bought_at'),
 itemsSortedBySoldDate: sortByDate(items, 'sold_at'),
 keeperItems,
 parentByChildId,
 soldAggregateItems,
 standaloneItems,
 unsoldResaleItems,
 }
}

function sortByDate(items: Item[], key: 'bought_at' | 'sold_at') {
 return [...items].sort((a, b) => dateValue(a[key]) - dateValue(b[key]))
}

function dateValue(value: string | null | undefined) {
 if (!value) {
 return Number.POSITIVE_INFINITY
 }

 const date = new Date(value).getTime()

 return Number.isNaN(date) ? Number.POSITIVE_INFINITY : date
}
