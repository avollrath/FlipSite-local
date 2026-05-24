import { format } from 'date-fns'
import type { Item, ItemStatus } from '@/types'

export {
  calculateItemProfit,
  calculateItemROI,
  calculateItemSellValue,
  getEffectiveItemStatus,
  isAggregateItem,
  isKeepingItem,
} from '@/lib/itemAccounting'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      useGrouping: true,
    }).format(0)
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    useGrouping: true,
  }).format(value)
}

export const sumCurrency = (values: Array<number | null | undefined>): number =>
  Math.round(values.reduce<number>((acc, value) => acc + (value ?? 0), 0) * 100) / 100

export function calcProfit(
  buyPrice: number | null | undefined,
  sellPrice: number | null | undefined,
) {
  if (buyPrice === null || buyPrice === undefined) {
    return null
  }

  if (sellPrice === null || sellPrice === undefined) {
    return null
  }

  return sellPrice - buyPrice
}

export function parseMoneyInput(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(',', '.')

  if (!normalized) {
    return null
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null
  }

  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

export function getBuyPlatform(item: Item) {
  return item.buy_platform ?? item.platform ?? ''
}

export function getSellPlatform(item: Item) {
  return item.sell_platform ?? ''
}

export function getItemPlatformSearchText(item: Item) {
  return [getBuyPlatform(item), getSellPlatform(item)].filter(Boolean).join(' ')
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) {
    return ''
  }

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return format(date, 'MMM d, yyyy')
}

export function getStatusLabel(status: ItemStatus) {
  const labels: Record<ItemStatus, string> = {
    holding: 'In Inventory',
    keeper: 'Keeping',
    listed: 'Listed for Sale',
    sold: 'Sold',
  }

  return labels[status]
}
