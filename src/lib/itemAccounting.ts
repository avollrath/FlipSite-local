import type { Item } from '@/types'

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
    // TODO(accounting): product decision needed. Current UI treats child profit as
    // child sell value because the parent owns bundle cost basis. Child ROI below
    // still uses split cost, so child profit and ROI intentionally differ for now.
    return item.sell_price ?? 0
  }

  return (item.sell_price ?? 0) - (item.buy_price ?? 0)
}

export function calculateItemROI(item: Item, allItems: Item[]) {
  if (isKeepingItem(item)) {
    return null
  }

  if (item.bundle_id && !item.is_bundle_parent) {
    return item.buy_price > 0
      ? ((item.sell_price ?? 0) - item.buy_price) / item.buy_price * 100
      : null
  }

  if (!item.buy_price) {
    return null
  }

  return (calculateItemProfit(item, allItems) / item.buy_price) * 100
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

export function getFlippingAggregateItems(items: Item[]) {
  return items.filter(isAggregateItem).filter((item) => !isKeepingItem(item))
}

export function getKeepingAggregateItems(items: Item[]) {
  return items.filter(isAggregateItem).filter(isKeepingItem)
}

export function getSoldAggregateItems(items: Item[]) {
  return getFlippingAggregateItems(items).filter(
    (item) =>
      getEffectiveItemStatus(item, items) === 'sold' &&
      calculateItemSellValue(item, items) > 0,
  )
}

export function getUnsoldResaleAggregateItems(items: Item[]) {
  return getFlippingAggregateItems(items).filter((item) =>
    ['holding', 'listed'].includes(getEffectiveItemStatus(item, items)),
  )
}
