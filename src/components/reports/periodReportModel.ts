import {
 calculateItemProfit,
 calculateItemROI,
 calculateItemSellValue,
 getEffectiveItemStatus,
 isKeepingItem,
} from '@/lib/itemAccounting'
import { formatCurrency, getStatusLabel, sumCurrency } from '@/lib/utils'
import { getChildrenByBundle } from '@/components/items/itemListModel'
import type { Item } from '@/types'

export type Period =
 | 'this-month'
 | 'last-month'
 | 'last-3-months'
 | 'last-6-months'
 | 'this-year'
 | 'custom'

export type ReportSortKey =
 | 'name'
 | 'category'
 | 'status'
 | 'bought_at'
 | 'sold_at'
 | 'buy_price'
 | 'sell_price'
 | 'profit'
 | 'roi'

export type ReportSortState = {
 direction: 'asc' | 'desc'
 key: ReportSortKey
}

export type DateRange = {
 from: Date
 to: Date
}

export type ReportRowModel = {
 isChild: boolean
 item: Item
}

export type ReportSummary = {
 avgHoldTime: string
 avgROI: number | null
 bestFlip: string
 bestFlipProfit: string
 holdingValue: number
 itemCount: number
 keepingSpend: number
 kept: number
 purchased: number
 sold: number
 stillHolding: number
 totalPaid: number
 totalProfit: number
 totalRevenue: number
}

export function getPeriodItems(items: Item[], range: DateRange) {
 return items.filter((item) => {
 if (item.bundle_id && !item.is_bundle_parent) {
  return false
 }

 return isItemActiveInRange(item, range)
 })
}

export function getPurchasedReportItems({
 allItems,
 periodItems,
 range,
 sort,
 sortTouched,
}: {
 allItems: Item[]
 periodItems: Item[]
 range: DateRange
 sort: ReportSortState
 sortTouched: boolean
}) {
 return sortReportItems(
 periodItems.filter((item) => isDateInRange(item.bought_at, range)),
 sortTouched ? sort : { direction: 'desc', key: 'bought_at' },
 allItems,
 )
}

export function getSoldReportItems({
 allItems,
 periodItems,
 range,
 sort,
 sortTouched,
}: {
 allItems: Item[]
 periodItems: Item[]
 range: DateRange
 sort: ReportSortState
 sortTouched: boolean
}) {
 return sortReportItems(
 periodItems.filter(
  (item) =>
  isDateInRange(item.sold_at, range) &&
  !isDateInRange(item.bought_at, range),
 ),
 sortTouched ? sort : { direction: 'desc', key: 'sold_at' },
 allItems,
 )
}

export function buildReportRows(
 items: Item[],
 childrenByBundle: Map<string, Item[]>,
 expandedBundles: Set<string>,
): ReportRowModel[] {
 const rows: ReportRowModel[] = []

 for (const item of items) {
 rows.push({ isChild: false, item })

 if (item.is_bundle_parent && expandedBundles.has(item.tsid)) {
  for (const child of childrenByBundle.get(item.tsid) ?? []) {
  rows.push({ isChild: true, item: child })
  }
 }
 }

 return rows
}

export function buildReportSummary(
 periodItems: Item[],
 allItems: Item[],
 range: DateRange,
): ReportSummary {
 const boughtItems = periodItems.filter(
 (item) => isDateInRange(item.bought_at, range) && !isKeepingItem(item),
 )
 const keeperItems = periodItems.filter(
 (item) => isDateInRange(item.bought_at, range) && isKeepingItem(item),
 )
 const soldItems = periodItems.filter(
 (item) =>
  isDateInRange(item.sold_at, range) &&
  !isKeepingItem(item) &&
  calculateItemSellValue(item, allItems) > 0,
 )
 const stillHoldingItems = boughtItems.filter((item) => {
 const status = getEffectiveItemStatus(item, allItems)

 return status === 'holding' || status === 'listed'
 })
 const roiValues = soldItems
 .map((item) => calculateItemROI(item, allItems))
 .filter((value): value is number => value !== null)
 const bestFlip = getBestFlip(soldItems, allItems)
 const totalRevenue = sumCurrency(
 soldItems.map((item) => calculateItemSellValue(item, allItems)),
 )
 const totalProfit = sumCurrency(
 soldItems.map((item) => calculateItemProfit(item, allItems)),
 )
 const avgHoldDays = getAverageHoldDays(soldItems)

 return {
 avgHoldTime: avgHoldDays === null ? '--' : `${Math.round(avgHoldDays)} days`,
 avgROI:
  roiValues.length > 0
  ? roiValues.reduce((sum, value) => sum + value, 0) / roiValues.length
  : null,
 bestFlip: bestFlip
  ? truncateText(bestFlip.item.name, 20)
  : '--',
 bestFlipProfit: bestFlip ? formatCurrency(bestFlip.profit) : '',
 holdingValue: sumCurrency(stillHoldingItems.map((item) => item.buy_price)),
 itemCount: periodItems.length,
 keepingSpend: sumCurrency(keeperItems.map((item) => item.buy_price)),
 kept: keeperItems.length,
 purchased: boughtItems.length,
 sold: soldItems.length,
 stillHolding: stillHoldingItems.length,
 totalPaid: sumCurrency(boughtItems.map((item) => item.buy_price)),
 totalProfit,
 totalRevenue,
 }
}

export function getBestFlip(soldItems: Item[], allItems: Item[]) {
 return soldItems.reduce<{
 item: Item
 profit: number
 roi: number
 } | null>((best, item) => {
 const roi = calculateItemROI(item, allItems)
 const profit = calculateItemProfit(item, allItems)

 if (roi === null || profit === null) {
  return best
 }

 if (!best || roi > best.roi) {
  return { item, profit, roi }
 }

 return best
 }, null)
}

export function getAverageHoldDays(items: Item[]) {
 const holdDays = items
 .map((item) => {
  if (!item.sold_at) {
  return null
  }

  const boughtAt = new Date(item.bought_at)
  const soldAt = new Date(item.sold_at)

  if (Number.isNaN(boughtAt.getTime()) || Number.isNaN(soldAt.getTime())) {
  return null
  }

  return Math.max(
  0,
  Math.round((soldAt.getTime() - boughtAt.getTime()) / 86_400_000),
  )
 })
 .filter((value): value is number => value !== null)

 if (holdDays.length === 0) {
 return null
 }

 return holdDays.reduce((sum, value) => sum + value, 0) / holdDays.length
}

export function truncateText(value: string, maxLength: number) {
 return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value
}

export function getPeriodRange(
 period: Exclude<Period, 'custom'>,
 now = new Date(),
): DateRange {
 if (period === 'this-month') {
 return {
  from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
 }
 }

 if (period === 'last-month') {
 return {
  from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
  to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
 }
 }

 if (period === 'this-year') {
 return {
  from: startOfDay(new Date(now.getFullYear(), 0, 1)),
  to: endOfDay(new Date(now.getFullYear(), 11, 31)),
 }
 }

 const months = period === 'last-3-months' ? 3 : 6
 const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

 return {
 from: startOfDay(from),
 to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
 }
}

export function getCustomRange(customFrom: string, customTo: string): DateRange {
 const fallback = getPeriodRange('this-month')
 const from = parseDateInput(customFrom)
 const to = parseDateInput(customTo)

 return {
 from: from ? startOfDay(from) : fallback.from,
 to: to ? endOfDay(to) : fallback.to,
 }
}

export function parseDateInput(value: string) {
 const [dayText, monthText, yearText] = value.split('/')
 const day = Number.parseInt(dayText, 10)
 const month = Number.parseInt(monthText, 10)
 const year = Number.parseInt(yearText, 10)
 const date = new Date(year, month - 1, day)

 if (
 !Number.isInteger(day) ||
 !Number.isInteger(month) ||
 !Number.isInteger(year) ||
 Number.isNaN(date.getTime()) ||
 date.getFullYear() !== year ||
 date.getMonth() !== month - 1 ||
 date.getDate() !== day
 ) {
 return null
 }

 return date
}

export function startOfDay(date: Date) {
 date.setHours(0, 0, 0, 0)
 return date
}

export function endOfDay(date: Date) {
 date.setHours(23, 59, 59, 999)
 return date
}

export function isItemActiveInRange(item: Item, range: DateRange) {
 return isDateInRange(item.bought_at, range) || isDateInRange(item.sold_at, range)
}

export function isDateInRange(value: string | null | undefined, range: DateRange) {
 if (!value) {
 return false
 }

 const date = new Date(value)

 if (Number.isNaN(date.getTime())) {
 return false
 }

 return date >= range.from && date <= range.to
}

export { getChildrenByBundle }

export function sortReportItems(items: Item[], sort: ReportSortState, allItems: Item[]) {
 return [...items].sort((a, b) => {
 const direction = sort.direction === 'asc' ? 1 : -1
 const aValue = getSortValue(a, sort.key, allItems)
 const bValue = getSortValue(b, sort.key, allItems)

 if (typeof aValue === 'number' && typeof bValue === 'number') {
  return (aValue - bValue) * direction
 }

 return String(aValue).localeCompare(String(bValue)) * direction
 })
}

export function getSortValue(item: Item, key: ReportSortKey, allItems: Item[]) {
 if (key === 'status') {
 return getStatusLabel(getEffectiveItemStatus(item, allItems))
 }

 if (key === 'sell_price') {
 return isKeepingItem(item) ? 0 : calculateItemSellValue(item, allItems)
 }

 if (key === 'profit') {
 return isKeepingItem(item) ? Number.NEGATIVE_INFINITY : calculateItemProfit(item, allItems)
 }

 if (key === 'roi') {
 return isKeepingItem(item) ? Number.NEGATIVE_INFINITY : calculateItemROI(item, allItems) ?? Number.NEGATIVE_INFINITY
 }

 if (key === 'bought_at' || key === 'sold_at') {
 return item[key] ? new Date(item[key]).getTime() : 0
 }

 return item[key] ?? ''
}
