import {
  calculateItemProfit,
  calculateItemROI,
  calculateItemSellValue,
  getEffectiveItemStatus,
  isKeepingItem,
} from '@/lib/itemAccounting'
import {
  getBuyPlatform,
  getSellPlatform,
  sumCurrency,
  uniqueTextValues,
} from '@/lib/utils'
import { toMonthKey } from '@/lib/dateUtils'
import { createItemIndex } from '@/domain/items/itemIndex'
import type { Item } from '@/types'

export type ChartDatum = {
  label: string
  profit?: number
  revenue?: number
}

export type CategoryStat = {
  activeCount: number
  category: string
  itemCount: number
  soldCount: number
  totalBuyValue: number
  totalProfit: number
  totalSellValue: number
}

export type AnalyticsSummary = {
  activeInventoryValue: number
  averageProfit: number
  averageRoi: number
  bestFlip: { name: string; profit: number; roi: number } | null
  soldItemsCount: number
  totalProfit: number
  totalRevenue: number
  unrealisedBuyCost: number
  unrealisedItemsCount: number
  worstFlip: { name: string; profit: number; roi: number } | null
}

export type DurationProfitDatum = {
  days: number
  name: string
  profit: number
}

export type CumulativeProfitDatum = {
  actual: number
  date: string
  pace: number
}

export type DashboardFlipInsight = {
  name: string
  profit: number
  revenue: number
  tsid: string
}

export type DashboardUnsoldItem = {
  boughtAt: string
  buyPrice: number
  daysHeld: number
  name: string
  tsid: string
}

export type DashboardMetrics = {
  bestFlip: DashboardFlipInsight | null
  biggestLoss: DashboardFlipInsight | null
  cashTiedUp: number
  keepingValue: number
  netProfit: number
  oldestUnsoldItem: DashboardUnsoldItem | null
  oldestUnsoldItems: DashboardUnsoldItem[]
  profitByCategory: ChartDatum[]
  profitByMonth: ChartDatum[]
  profitByPlatform: ChartDatum[]
  revenue: number
  soldCount: number
  unsoldCount: number
}

export function buildSummary(items: Item[]): AnalyticsSummary {
  const itemIndex = createItemIndex(items)
  const soldItems = itemIndex.soldAggregateItems
  const activeItems = itemIndex.unsoldResaleItems
  const soldStats = soldItems.map((item) => {
    const profit = calculateItemProfit(item, items) ?? 0
    const roi = calculateItemROI(item, items) ?? 0

    return { item, profit, roi }
  })
  const totalRevenue = sumCurrency(
    soldItems.map((item) => calculateItemSellValue(item, items)),
  )
  const totalProfit = sumCurrency(soldStats.map((stat) => stat.profit))
  const averageRoi =
    soldStats.length > 0
      ? soldStats.reduce((sum, stat) => sum + stat.roi, 0) / soldStats.length
      : 0
  const bestStat = soldStats.toSorted((a, b) => b.profit - a.profit)[0]
  const worstStat = soldStats.toSorted((a, b) => a.profit - b.profit)[0]
  const activeInventoryValue = sumCurrency(activeItems.map((item) => item.buy_price))

  return {
    activeInventoryValue,
    averageProfit: soldStats.length > 0 ? totalProfit / soldStats.length : 0,
    averageRoi,
    bestFlip: bestStat
      ? { name: bestStat.item.name, profit: bestStat.profit, roi: bestStat.roi }
      : null,
    soldItemsCount: soldItems.length,
    totalProfit,
    totalRevenue,
    unrealisedBuyCost: activeInventoryValue,
    unrealisedItemsCount: activeItems.length,
    worstFlip: worstStat
      ? { name: worstStat.item.name, profit: worstStat.profit, roi: worstStat.roi }
      : null,
  }
}

export function buildDashboardMetrics(items: Item[]): DashboardMetrics {
  // Dashboard definitions:
  // - sold metrics use aggregate resale items with effective status "sold" and real sell value.
  // - unsold cash excludes keepers and bundle children, then uses buy price for holding/listed resale items.
  // - keeping value is buy price for aggregate items marked keeper/keeping.
  const itemIndex = createItemIndex(items)
  const soldItems = itemIndex.soldAggregateItems
  const unsoldItems = itemIndex.unsoldResaleItems
  const keepingItems = itemIndex.keeperItems
  const soldStats = soldItems.map((item) => ({
    item,
    profit: calculateItemProfit(item, items) ?? 0,
    revenue: calculateItemSellValue(item, items),
  }))
  const bestStat = soldStats.toSorted((a, b) => b.profit - a.profit)[0]
  const lossStat = soldStats
    .filter((stat) => stat.profit < 0)
    .toSorted((a, b) => a.profit - b.profit)[0]
  const oldestUnsoldItems = unsoldItems
    .toSorted((a, b) => dateValue(a.bought_at) - dateValue(b.bought_at))
    .slice(0, 5)
    .map(toDashboardUnsoldItem)
  const oldestUnsold = oldestUnsoldItems[0] ?? null

  return {
    bestFlip: bestStat ? toDashboardFlipInsight(bestStat) : null,
    biggestLoss: lossStat ? toDashboardFlipInsight(lossStat) : null,
    cashTiedUp: sumCurrency(unsoldItems.map((item) => item.buy_price)),
    keepingValue: sumCurrency(keepingItems.map((item) => item.buy_price)),
    netProfit: sumCurrency(soldStats.map((stat) => stat.profit)),
    oldestUnsoldItem: oldestUnsold,
    oldestUnsoldItems,
    profitByCategory: buildProfitByCategory(items),
    profitByMonth: buildMonthlyPerformance(items).map(({ label, profit = 0 }) => ({
      label,
      profit,
    })),
    profitByPlatform: buildProfitBreakdown(
      items,
      (item) => getSellPlatform(item) || getBuyPlatform(item) || 'Unknown',
    ),
    revenue: sumCurrency(soldStats.map((stat) => stat.revenue)),
    soldCount: soldItems.length,
    unsoldCount: unsoldItems.length,
  }
}

export function buildMonthlyPerformance(items: Item[]): ChartDatum[] {
  const monthlyData = new Map<string, { profit: number; revenue: number }>()
  const itemIndex = createItemIndex(items)

  for (const item of itemIndex.aggregateItems) {
    if (isKeepingItem(item)) {
      continue
    }

    const revenue = calculateItemSellValue(item, items)

    if (revenue <= 0) {
      continue
    }

    const soldAt = getEffectiveSoldAt(item, items)

    if (!soldAt) {
      continue
    }

    const label = toMonthKey(soldAt)
    const current = monthlyData.get(label) ?? { profit: 0, revenue: 0 }
    current.profit = sumCurrency([current.profit, calculateItemProfit(item, items)])
    current.revenue = sumCurrency([current.revenue, revenue])
    monthlyData.set(label, current)
  }

  return Array.from(monthlyData, ([label, values]) => ({
    label,
    ...values,
  })).sort((a, b) => a.label.localeCompare(b.label))
}

export function buildMonthlyRevenue(items: Item[]) {
  return buildMonthlyPerformance(items).map(({ label, revenue = 0 }) => ({
    month: label,
    revenue,
  }))
}

export function buildMonthlyProfit(items: Item[]) {
  return buildMonthlyPerformance(items).map(({ label, profit = 0 }) => ({
    month: label,
    profit,
  }))
}

export function buildProfitByCategory(items: Item[]): ChartDatum[] {
  return buildProfitBreakdown(items, (item) => item.category || 'Uncategorized')
}

export function buildProfitByPlatform(items: Item[]): ChartDatum[] {
  return buildProfitBreakdown(items, (item) => getBuyPlatform(item) || 'Unknown')
}

export function buildTopFlips(items: Item[], count = 8) {
  return createItemIndex(items).soldAggregateItems
    .map((item) => ({
      name: item.name,
      profit: calculateItemProfit(item, items) ?? 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, count)
}

export function buildRoiDistribution(items: Item[]): ChartDatum[] {
  const roisByCategory = new Map<string, number[]>()

  for (const item of createItemIndex(items).soldAggregateItems) {
    const roi = calculateItemROI(item, items)

    if (roi === null) {
      continue
    }

    const label = item.category || 'Uncategorized'
    roisByCategory.set(label, [...(roisByCategory.get(label) ?? []), roi])
  }

  return Array.from(roisByCategory, ([label, rois]) => ({
    label,
    roi: average(rois),
  })).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
}

export function buildDurationProfit(items: Item[]): DurationProfitDatum[] {
  return createItemIndex(items).soldAggregateItems
    .map((item) => {
      const soldAt = getEffectiveSoldAt(item, items)
      const boughtAt = item.bought_at

      if (!soldAt || !boughtAt) {
        return null
      }

      return {
        days: Math.max(0, Math.round((dateValue(soldAt) - dateValue(boughtAt)) / 86_400_000)),
        name: item.name,
        profit: calculateItemProfit(item, items) ?? 0,
      }
    })
    .filter((entry): entry is DurationProfitDatum => Boolean(entry))
}

export function buildCumulativeProfit(items: Item[]): CumulativeProfitDatum[] {
  const soldItems = createItemIndex(items).soldAggregateItems.sort(
    (a, b) => dateValue(getEffectiveSoldAt(a, items)) - dateValue(getEffectiveSoldAt(b, items)),
  )
  const totalProfit = sumCurrency(
    soldItems.map((item) => calculateItemProfit(item, items)),
  )
  let runningProfit = 0

  return soldItems.map((item, index) => {
    runningProfit = sumCurrency([runningProfit, calculateItemProfit(item, items)])

    return {
      actual: runningProfit,
      date: shortDate(getEffectiveSoldAt(item, items)),
      pace: totalProfit * ((index + 1) / soldItems.length),
    }
  })
}

export function buildCategoryStats(items: Item[]): CategoryStat[] {
  const itemIndex = createItemIndex(items)
  const categoryNames = uniqueTextValues(items.map((item) => item.category))
  const aggregateIds = new Set(itemIndex.aggregateItems.map((item) => item.tsid))
  const itemsByCategory = new Map<string, Item[]>()

  for (const item of items) {
    const categoryItems = itemsByCategory.get(item.category) ?? []
    categoryItems.push(item)
    itemsByCategory.set(item.category, categoryItems)
  }

  return categoryNames
    .map((category) => {
      const categoryItems = itemsByCategory.get(category) ?? []
      const aggregateItems = categoryItems.filter((item) => aggregateIds.has(item.tsid))
      const flippingAggregateItems = aggregateItems.filter((item) => !isKeepingItem(item))

      return {
        activeCount: categoryItems.filter((item) =>
          !isKeepingItem(item) &&
          ['holding', 'listed'].includes(getEffectiveItemStatus(item, items)),
        ).length,
        category,
        itemCount: categoryItems.length,
        soldCount: categoryItems.filter(
          (item) => !isKeepingItem(item) && getEffectiveItemStatus(item, items) === 'sold',
        ).length,
        totalBuyValue: sumCurrency(aggregateItems.map((item) => item.buy_price)),
        totalProfit: sumCurrency(
          flippingAggregateItems.map((item) => calculateItemProfit(item, items)),
        ),
        totalSellValue: sumCurrency(
          flippingAggregateItems.map((item) => calculateItemSellValue(item, items)),
        ),
      }
    })
    .sort((a, b) => a.category.localeCompare(b.category))
}

function buildProfitBreakdown(items: Item[], getLabel: (item: Item) => string): ChartDatum[] {
  const data = new Map<string, number>()

  for (const item of createItemIndex(items).soldAggregateItems) {
    const label = getLabel(item)
    data.set(label, sumCurrency([data.get(label) ?? 0, calculateItemProfit(item, items)]))
  }

  return Array.from(data, ([label, profit]) => ({ label, profit })).sort(
    (a, b) => (b.profit ?? 0) - (a.profit ?? 0),
  )
}

function toDashboardFlipInsight({
  item,
  profit,
  revenue,
}: {
  item: Item
  profit: number
  revenue: number
}): DashboardFlipInsight {
  return {
    name: item.name,
    profit,
    revenue,
    tsid: item.tsid,
  }
}

function toDashboardUnsoldItem(item: Item): DashboardUnsoldItem {
  return {
    boughtAt: item.bought_at,
    buyPrice: item.buy_price,
    daysHeld: Math.max(
      0,
      Math.round((Date.now() - dateValue(item.bought_at)) / 86_400_000),
    ),
    name: item.name,
    tsid: item.tsid,
  }
}

export function getEffectiveSoldAt(item: Item, items: Item[]) {
  if (!item.is_bundle_parent) {
    return item.sold_at
  }

  const childSoldDates = items
    .filter((child) => child.bundle_id === item.tsid && child.sell_price)
    .map((child) => child.sold_at)
    .filter((value): value is string => Boolean(value))

  if (item.sold_at) {
    childSoldDates.push(item.sold_at)
  }

  return childSoldDates.sort((a, b) => dateValue(b) - dateValue(a))[0] ?? null
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0
}

function shortDate(value: string | null) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

export function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}
