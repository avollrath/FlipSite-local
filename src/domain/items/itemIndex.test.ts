import { describe, expect, it } from 'vitest'
import { createItemIndex } from '@/domain/items/itemIndex'
import type { Item } from '@/types'

const items: Item[] = [
 item({
  tsid: 'standalone-sold',
  name: 'Standalone Sold',
  buy_price: 40,
  sell_price: 90,
  status: 'sold',
  bought_at: '2026-01-01T00:00:00.000Z',
  sold_at: '2026-02-01T00:00:00.000Z',
 }),
 item({
  tsid: 'standalone-unsold',
  name: 'Standalone Unsold',
  buy_price: 30,
  status: 'listed',
  bought_at: '2026-03-01T00:00:00.000Z',
 }),
 item({
  tsid: 'keeper',
  name: 'Keeper',
  buy_price: 20,
  status: 'keeper',
  bought_at: '2026-04-01T00:00:00.000Z',
 }),
 item({
  tsid: 'bundle-parent',
  name: 'Bundle Parent',
  buy_price: 100,
  sell_price: 10,
  status: 'holding',
  bought_at: '2026-05-01T00:00:00.000Z',
  is_bundle_parent: true,
 }),
 item({
  tsid: 'bundle-child-sold',
  name: 'Bundle Child Sold',
  buy_price: 0,
  sell_price: 140,
  status: 'sold',
  bought_at: '2026-05-01T00:00:00.000Z',
  sold_at: '2026-06-01T00:00:00.000Z',
  bundle_id: 'bundle-parent',
 }),
 item({
  tsid: 'orphan-child',
  name: 'Orphan Child',
  buy_price: 0,
  sell_price: 25,
  status: 'sold',
  bought_at: '2026-07-01T00:00:00.000Z',
  sold_at: '2026-08-01T00:00:00.000Z',
  bundle_id: 'missing-parent',
 }),
 item({
  tsid: 'zero-sale',
  name: 'Zero Sale',
  buy_price: 10,
  sell_price: 0,
  status: 'sold',
  bought_at: '2026-09-01T00:00:00.000Z',
  sold_at: '2026-10-01T00:00:00.000Z',
 }),
]

describe('item index', () => {
 it('indexes items by id and bundle relationships', () => {
 const index = createItemIndex(items)

 expect(index.itemsById.get('bundle-parent')?.name).toBe('Bundle Parent')
 expect(index.childrenByBundleId.get('bundle-parent')?.map((entry) => entry.tsid))
 .toEqual(['bundle-child-sold'])
 expect(index.childrenByBundleId.get('missing-parent')?.map((entry) => entry.tsid))
 .toEqual(['orphan-child'])
 expect(index.parentByChildId.get('bundle-child-sold')?.tsid).toBe('bundle-parent')
 expect(index.parentByChildId.has('orphan-child')).toBe(false)
 })

 it('separates standalone items, bundle parents, and children', () => {
 const index = createItemIndex(items)

 expect(index.standaloneItems.map((entry) => entry.tsid)).toEqual([
  'standalone-sold',
  'standalone-unsold',
  'keeper',
  'bundle-parent',
  'zero-sale',
 ])
 expect(index.bundleParents.map((entry) => entry.tsid)).toEqual(['bundle-parent'])
 expect(index.bundleChildren.map((entry) => entry.tsid)).toEqual([
  'bundle-child-sold',
  'orphan-child',
 ])
 })

 it('extracts aggregate, sold aggregate, keeper, and unsold resale collections', () => {
 const index = createItemIndex(items)

 expect(index.aggregateItems.map((entry) => entry.tsid)).toEqual([
  'standalone-sold',
  'standalone-unsold',
  'keeper',
  'bundle-parent',
  'zero-sale',
 ])
 expect(index.soldAggregateItems.map((entry) => entry.tsid)).toEqual([
  'standalone-sold',
  'bundle-parent',
 ])
 expect(index.keeperItems.map((entry) => entry.tsid)).toEqual(['keeper'])
 expect(index.unsoldResaleItems.map((entry) => entry.tsid)).toEqual([
  'standalone-unsold',
 ])
 })

 it('sorts date indexes without mutating source order', () => {
 const index = createItemIndex(items)

 expect(index.itemsSortedByBoughtDate.map((entry) => entry.tsid)).toEqual([
  'standalone-sold',
  'standalone-unsold',
  'keeper',
  'bundle-parent',
  'bundle-child-sold',
  'orphan-child',
  'zero-sale',
 ])
 expect(index.itemsSortedBySoldDate.map((entry) => entry.tsid).slice(0, 4)).toEqual([
  'standalone-sold',
  'bundle-child-sold',
  'orphan-child',
  'zero-sale',
 ])
 expect(items[0].tsid).toBe('standalone-sold')
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
