import type { Item } from '@/types'

// FlipSite accounting model:
// - Standalone resale items own their buy price and sell price.
// - Bundle parents own the purchase cost for the whole bundle.
// - Bundle children are revenue allocation/detail records only.
// - Aggregate reporting uses bundle parents and standalone rows, never bundle children.
// - Keeper/keeping items are excluded from resale profit and ROI.

export function calculateItemSellValue(item: Item, allItems: Item[]) {
  if (isKeepingItem(item)) {
    return 0
  }

  if (item.is_bundle_parent) {
    const childrenSell = getBundleChildren(item, allItems)
      .filter((child) => !isKeepingItem(child))
      .reduce((sum, child) => sum + (child.sell_price ?? 0), 0)

    return (item.sell_price ?? 0) + childrenSell
  }

  return item.sell_price ?? 0
}

export function calculateItemProfit(item: Item, allItems: Item[]) {
  if (isKeepingItem(item)) {
    return 0
  }

  if (item.is_bundle_parent) {
    return calculateItemSellValue(item, allItems) - (item.buy_price ?? 0)
  }

  if (item.bundle_id) {
    return null
  }

  return (item.sell_price ?? 0) - (item.buy_price ?? 0)
}

export function calculateItemROI(item: Item, allItems: Item[]) {
  if (isKeepingItem(item)) {
    return null
  }

  if (item.bundle_id && !item.is_bundle_parent) {
    return null
  }

  if (!item.buy_price) {
    return null
  }

  const profit = calculateItemProfit(item, allItems)

  return profit === null ? null : (profit / item.buy_price) * 100
}

export function isAggregateItem(item: Item) {
  return !item.bundle_id || Boolean(item.is_bundle_parent)
}

export function isKeepingItem(item: Item) {
  const status = String(item.status).trim().toLowerCase()
  const category = item.category.trim().toLowerCase()

  return (
    status === 'keeper' ||
    status === 'keeping' ||
    category === 'keeper' ||
    category === 'keeping'
  )
}

export function getEffectiveItemStatus(item: Item, allItems: Item[]) {
  if (!item.is_bundle_parent) {
    return isKeepingItem(item) ? 'keeper' : item.status
  }

  if (isKeepingItem(item)) {
    return 'keeper'
  }

  const children = getBundleChildren(item, allItems)

  if (children.length > 0 && children.every((child) => child.status === 'sold')) {
    return 'sold'
  }

  return item.status
}

export function getBundleChildren(item: Item, allItems: Item[]) {
  return allItems.filter((child) => child.bundle_id === item.tsid)
}

export function getBundleChildrenByParent(items: Item[]) {
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

export function getFlippingAggregateItems(items: Item[]) {
  return items.filter(isAggregateItem).filter((item) => !isKeepingItem(item))
}

export function getKeeperItems(items: Item[]) {
  return items.filter(isAggregateItem).filter(isKeepingItem)
}

export const getKeepingAggregateItems = getKeeperItems

export function getSoldAggregateItems(items: Item[]) {
  return getFlippingAggregateItems(items).filter(
    (item) =>
      getEffectiveItemStatus(item, items) === 'sold' &&
      calculateItemSellValue(item, items) > 0,
  )
}

export function getUnsoldResaleItems(items: Item[]) {
  return getFlippingAggregateItems(items).filter((item) =>
    ['holding', 'listed'].includes(getEffectiveItemStatus(item, items)),
  )
}

export const getUnsoldResaleAggregateItems = getUnsoldResaleItems
