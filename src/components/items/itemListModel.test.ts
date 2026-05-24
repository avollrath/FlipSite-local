import { describe, expect, it } from 'vitest'
import {
 compareItems,
 getActiveBundleIds,
 getChildrenByBundle,
 getVisibleItems,
 getVisibleRows,
 type ItemListFilters,
 type SortState,
} from '@/components/items/itemListModel'
import type { Item } from '@/types'

const baseFilters: ItemListFilters = {
 bundleFilter: 'none',
 buyPlatformFilter: 'all',
 categoryFilter: 'all',
 focusedItemId: '',
 inventoryOnly: false,
 search: '',
 statusFilter: 'all',
}

const defaultSort: SortState = { key: 'bought_at', direction: 'desc' }

const items: Item[] = [
 item({
  tsid: 'standalone-sold',
  name: 'Sold Console',
  category: 'Games',
  buy_price: 50,
  sell_price: 90,
  buy_platform: 'Market',
  sell_platform: 'eBay',
  status: 'sold',
  bought_at: '2026-01-01T00:00:00.000Z',
  sold_at: '2026-01-10T00:00:00.000Z',
 }),
 item({
  tsid: 'keeper',
  name: 'Keeper Speaker',
  category: 'Audio',
  buy_price: 30,
  sell_price: null,
  buy_platform: 'Shop',
  status: 'keeper',
  bought_at: '2026-02-01T00:00:00.000Z',
 }),
 item({
  tsid: 'listed',
  name: 'Listed Camera',
  category: 'Photo',
  buy_price: 40,
  sell_price: null,
  buy_platform: 'Market',
  status: 'listed',
  bought_at: '2026-03-01T00:00:00.000Z',
 }),
 item({
  tsid: 'bundle-parent',
  name: 'Bundle Parent',
  category: 'Games',
  buy_price: 100,
  sell_price: 10,
  buy_platform: 'Market',
  status: 'holding',
  bought_at: '2026-04-01T00:00:00.000Z',
  is_bundle_parent: true,
 }),
 item({
  tsid: 'bundle-child-sold',
  name: 'Bundle Sold Child',
  category: 'Games',
  buy_price: 0,
  sell_price: 100,
  buy_platform: 'Market',
  status: 'sold',
  bought_at: '2026-04-01T00:00:00.000Z',
  sold_at: '2026-04-10T00:00:00.000Z',
  bundle_id: 'bundle-parent',
 }),
 item({
  tsid: 'bundle-child-listed',
  name: 'Bundle Listed Child',
  category: 'Games',
  buy_price: 0,
  sell_price: null,
  buy_platform: 'Market',
  status: 'listed',
  bought_at: '2026-04-01T00:00:00.000Z',
  bundle_id: 'bundle-parent',
 }),
]

describe('item list model', () => {
 it('filters by search text across item fields and platform text', () => {
 expect(visible({ search: 'camera' }).map((entry) => entry.tsid)).toEqual([
  'listed',
 ])
 expect(visible({ search: 'ebay' }).map((entry) => entry.tsid)).toEqual([
  'standalone-sold',
 ])
 })

 it('filters by status using effective bundle parent status', () => {
 expect(visible({ statusFilter: 'listed' }).map((entry) => entry.tsid)).toEqual([
  'bundle-child-listed',
  'listed',
 ])
 expect(visible({ statusFilter: 'keeper' }).map((entry) => entry.tsid)).toEqual([
  'keeper',
 ])
 })

 it('filters by category and buy platform', () => {
 expect(visible({ categoryFilter: 'Audio' }).map((entry) => entry.tsid)).toEqual([
  'keeper',
 ])
 expect(visible({ buyPlatformFilter: 'Shop' }).map((entry) => entry.tsid)).toEqual([
  'keeper',
 ])
 })

 it('keeps inventory-only items with holding, listed, or keeper status', () => {
 expect(visible({ inventoryOnly: true }).map((entry) => entry.tsid)).toEqual([
  'bundle-parent',
  'bundle-child-listed',
  'listed',
  'keeper',
 ])
 })

 it('filters bundle parents and active bundles', () => {
 const childrenByBundle = getChildrenByBundle(items)
 expect([...getActiveBundleIds(items, childrenByBundle)]).toEqual(['bundle-parent'])
 expect(visible({ bundleFilter: 'only' }).map((entry) => entry.tsid)).toEqual([
  'bundle-parent',
 ])
 expect(visible({ bundleFilter: 'active' }).map((entry) => entry.tsid)).toEqual([
  'bundle-parent',
 ])
 })

 it('builds bundle rows only when unfiltered and expanded', () => {
 const childrenByBundle = getChildrenByBundle(items)
 const visibleItems = visible()

 expect(
  getVisibleRows({
  childrenByBundle,
  expandedBundles: new Set(['bundle-parent']),
  filters: baseFilters,
  visibleItems,
  }).map((row) => [row.item.tsid, row.isChild]),
 ).toEqual([
  ['bundle-parent', false],
  ['bundle-child-sold', true],
  ['bundle-child-listed', true],
  ['listed', false],
  ['keeper', false],
  ['standalone-sold', false],
 ])

 expect(
  getVisibleRows({
  childrenByBundle,
  expandedBundles: new Set(['bundle-parent']),
  filters: { ...baseFilters, search: 'bundle' },
  visibleItems: visible({ search: 'bundle' }),
  }).map((row) => [row.item.tsid, row.isChild]),
 ).toEqual([
  ['bundle-parent', false],
  ['bundle-child-sold', true],
  ['bundle-child-listed', true],
 ])
 })

 it('sorts by bought date, sold date, price, profit, and ROI', () => {
 expect(sorted({ key: 'bought_at', direction: 'asc' })).toEqual([
  'standalone-sold',
  'keeper',
  'listed',
  'bundle-parent',
  'bundle-child-sold',
  'bundle-child-listed',
 ])
 expect(sorted({ key: 'sold_at', direction: 'desc' })[0]).toBe('bundle-child-sold')
 expect(sorted({ key: 'sell_price', direction: 'desc' })[0]).toBe('bundle-parent')
 expect(sorted({ key: 'buy_price', direction: 'desc' })[0]).toBe('bundle-parent')
 expect(sorted({ key: 'profit', direction: 'desc' })[0]).toBe('standalone-sold')
 expect(sorted({ key: 'roi', direction: 'desc' })[0]).toBe('standalone-sold')
 })
})

function visible(filters: Partial<ItemListFilters> = {}, sort = defaultSort) {
 return getVisibleItems({
  filters: { ...baseFilters, ...filters },
  items,
  sort,
 })
}

function sorted(sort: SortState) {
 return [...items].sort((a, b) => compareItems(a, b, sort, items)).map((entry) => entry.tsid)
}

function item(overrides: Partial<Item>): Item {
 return {
  tsid: 'item',
  user_id: 'user-1',
  name: 'Item',
  category: '',
  condition: 'Good',
  buy_price: 0,
  sell_price: null,
  buy_platform: null,
  sell_platform: null,
  status: 'holding',
  bought_at: '2026-01-01T00:00:00.000Z',
  sold_at: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  bundle_id: null,
  is_bundle_parent: false,
  ...overrides,
 }
}
