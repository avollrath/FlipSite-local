import { describe, expect, it } from 'vitest'
import { buildDashboardMetrics } from '@/lib/analytics'
import {
 buildReportRows,
 buildReportSummary,
 getChildrenByBundle,
 getPeriodItems,
 getPeriodRange,
 getSoldReportItems,
 isDateInRange,
 type DateRange,
} from '@/components/reports/periodReportModel'
import type { Item } from '@/types'

const mayRange: DateRange = {
 from: new Date('2026-05-01T00:00:00.000Z'),
 to: new Date('2026-05-31T23:59:59.999Z'),
}

const items: Item[] = [
 item({
  tsid: 'sold-good',
  name: 'Good Flip',
  buy_price: 50,
  sell_price: 120,
  status: 'sold',
  bought_at: '2026-04-10T00:00:00.000Z',
  sold_at: '2026-05-05T00:00:00.000Z',
 }),
 item({
  tsid: 'best-roi',
  name: 'Best ROI Flip With Long Name',
  buy_price: 10,
  sell_price: 50,
  status: 'sold',
  bought_at: '2026-04-01T00:00:00.000Z',
  sold_at: '2026-05-06T00:00:00.000Z',
 }),
 item({
  tsid: 'zero-sale',
  name: 'Zero Sale',
  buy_price: 30,
  sell_price: 0,
  status: 'sold',
  bought_at: '2026-04-01T00:00:00.000Z',
  sold_at: '2026-05-07T00:00:00.000Z',
 }),
 item({
  tsid: 'keeper',
  name: 'Keeper',
  buy_price: 25,
  status: 'keeper',
  bought_at: '2026-05-08T00:00:00.000Z',
 }),
 item({
  tsid: 'holding',
  name: 'Holding',
  buy_price: 60,
  status: 'holding',
  bought_at: '2026-05-09T00:00:00.000Z',
 }),
 item({
  tsid: 'bundle-parent',
  name: 'Bundle Parent',
  buy_price: 100,
  sell_price: 20,
  status: 'sold',
  bought_at: '2026-04-01T00:00:00.000Z',
  sold_at: '2026-05-10T00:00:00.000Z',
  is_bundle_parent: true,
 }),
 item({
  tsid: 'bundle-child',
  name: 'Bundle Child',
  buy_price: 0,
  sell_price: 130,
  status: 'sold',
  bought_at: '2026-04-01T00:00:00.000Z',
  sold_at: '2026-05-10T00:00:00.000Z',
  bundle_id: 'bundle-parent',
 }),
]

describe('period report model', () => {
 it('builds stable preset date ranges', () => {
 const range = getPeriodRange('last-month', new Date('2026-05-25T12:00:00.000Z'))

 expect(range.from.getFullYear()).toBe(2026)
 expect(range.from.getMonth()).toBe(3)
 expect(range.from.getDate()).toBe(1)
 expect(range.to.getFullYear()).toBe(2026)
 expect(range.to.getMonth()).toBe(3)
 expect(range.to.getDate()).toBe(30)
 expect(isDateInRange('2026-04-15T00:00:00.000Z', range)).toBe(true)
 expect(isDateInRange('2026-05-01T00:00:00.000Z', range)).toBe(false)
 })

 it('filters period items to aggregate rows active in range', () => {
 expect(getPeriodItems(items, mayRange).map((entry) => entry.tsid)).toEqual([
  'sold-good',
  'best-roi',
  'zero-sale',
  'keeper',
  'holding',
  'bundle-parent',
 ])
 })

 it('includes sold aggregate items, excludes keepers and zero-sale sold items in summary', () => {
 const periodItems = getPeriodItems(items, mayRange)
 const summary = buildReportSummary(periodItems, items, mayRange)

 expect(summary.sold).toBe(3)
 expect(summary.kept).toBe(1)
 expect(summary.totalRevenue).toBe(320)
 expect(summary.totalProfit).toBe(160)
 })

 it('aggregates bundle parent profit and exposes children only as expanded revenue detail rows', () => {
 const childrenByBundle = getChildrenByBundle(items)
 const rows = buildReportRows(
  [items.find((entry) => entry.tsid === 'bundle-parent')!],
  childrenByBundle,
  new Set(['bundle-parent']),
 )

 expect(rows.map((row) => [row.item.tsid, row.isChild])).toEqual([
  ['bundle-parent', false],
  ['bundle-child', true],
 ])
 })

 it('uses ROI semantics for best flip and excludes bundle children', () => {
 const summary = buildReportSummary(getPeriodItems(items, mayRange), items, mayRange)

 expect(summary.bestFlip).toBe('Best ROI Flip With L...')
 expect(summary.bestFlipProfit).toBe('40,00\u00A0€')
 })

 it('keeps total profit consistent with dashboard aggregate accounting for sold rows', () => {
 const reportSummary = buildReportSummary(getPeriodItems(items, mayRange), items, mayRange)
 const dashboardMetrics = buildDashboardMetrics(items)

 expect(reportSummary.totalProfit).toBe(dashboardMetrics.netProfit)
 })

 it('sorts sold items by default sold date without bringing back bundle children', () => {
 expect(
  getSoldReportItems({
  allItems: items,
  periodItems: getPeriodItems(items, mayRange),
  range: mayRange,
  sort: { direction: 'asc', key: 'name' },
  sortTouched: false,
  }).map((entry) => entry.tsid),
 ).toEqual(['bundle-parent', 'zero-sale', 'best-roi', 'sold-good'])
 })
})

function item(overrides: Partial<Item>): Item {
 return {
  tsid: 'item',
  user_id: 'user-1',
  name: 'Item',
  category: 'General',
  condition: 'Good',
  buy_price: 0,
  sell_price: null,
  buy_platform: 'Market',
  sell_platform: null,
  status: 'holding',
  bought_at: '2026-05-01T00:00:00.000Z',
  sold_at: null,
  notes: null,
  created_at: '2026-05-01T00:00:00.000Z',
  bundle_id: null,
  is_bundle_parent: false,
  ...overrides,
 }
}
