import {
 calculateItemProfit,
 calculateItemROI,
 calculateItemSellValue,
 formatDate,
 getBuyPlatform,
 getEffectiveItemStatus,
 getSellPlatform,
 getStatusLabel,
 isKeepingItem,
} from '@/lib/utils'
import type { Item } from '@/types'

const bundleChildExportNote =
 'Revenue detail; profit and ROI are included in bundle parent'

export function buildItemCsvRows(displayedItems: Item[], allItems: Item[]) {
 return displayedItems.map((item) => {
 const isKeeper = isKeepingItem(item)
 const isBundleChild = Boolean(item.bundle_id && !item.is_bundle_parent)
 const profit = calculateItemProfit(item, allItems)
 const roi = calculateItemROI(item, allItems)

 return {
  'Record Type': isBundleChild
  ? 'Bundle child'
  : item.is_bundle_parent
   ? 'Bundle parent'
   : 'Standalone',
  Name: item.name,
  Category: item.category,
  Condition: item.condition,
  'Buy Price': item.buy_price,
  'Sell Price': isKeeper ? '' : calculateItemSellValue(item, allItems),
  Profit: isKeeper ? '' : (profit ?? ''),
  'ROI %': isKeeper || roi === null ? '' : roi.toFixed(2),
  'Bought from': getBuyPlatform(item),
  'Sold on': getSellPlatform(item),
  Status: getStatusLabel(getEffectiveItemStatus(item, allItems)),
  'Date Bought': formatDate(item.bought_at),
  'Date Sold': formatDate(item.sold_at),
  'Accounting Note': isBundleChild ? bundleChildExportNote : '',
  Notes: item.notes ?? '',
 }
 })
}

export function downloadItemCsv(displayedItems: Item[], allItems: Item[]) {
 downloadCsv(buildItemCsvRows(displayedItems, allItems), 'flipsite-items.csv')
}

export function downloadCsv(
 rows: Array<Record<string, string | number>>,
 fileName: string,
) {
 if (rows.length === 0) {
 return
 }

 const headers = Object.keys(rows[0])
 const csv = [
 headers.join(','),
 ...rows.map((row) =>
  headers.map((header) => csvEscape(row[header])).join(','),
 ),
 ].join('\n')
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = fileName
 link.click()
 URL.revokeObjectURL(url)
}

function csvEscape(value: string | number) {
 const text = String(value)
 return `"${text.replaceAll('"', '""')}"`
}
