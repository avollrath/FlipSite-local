import { describe, expect, it } from 'vitest'
import { buildItemCsvRows } from '@/components/items/itemCsvExport'
import type { Item } from '@/types'

describe('item CSV export', () => {
 it('preserves export columns and bundle child accounting note', () => {
 const parent = item({
  tsid: 'bundle-1',
  name: 'Bundle',
  buy_price: 100,
  sell_price: 10,
  status: 'sold',
  is_bundle_parent: true,
 })
 const child = item({
  tsid: 'child-1',
  name: 'Child',
  buy_price: 0,
  sell_price: 50,
  status: 'sold',
  bundle_id: parent.tsid,
 })
 const keeper = item({
  tsid: 'keeper',
  name: 'Keeper',
  buy_price: 20,
  sell_price: 100,
  status: 'keeper',
 })

 expect(buildItemCsvRows([parent, child, keeper], [parent, child, keeper])).toEqual([
  {
  'Record Type': 'Bundle parent',
  Name: 'Bundle',
  Category: 'Games',
  Condition: 'Good',
  'Buy Price': 100,
  'Sell Price': 60,
  Profit: -40,
  'ROI %': '-40.00',
  'Bought from': 'Market',
  'Sold on': '',
  Status: 'Sold',
  'Date Bought': 'May 1, 2026',
  'Date Sold': '',
  'Accounting Note': '',
  Notes: '',
  },
  {
  'Record Type': 'Bundle child',
  Name: 'Child',
  Category: 'Games',
  Condition: 'Good',
  'Buy Price': 0,
  'Sell Price': 50,
  Profit: '',
  'ROI %': '',
  'Bought from': 'Market',
  'Sold on': '',
  Status: 'Sold',
  'Date Bought': 'May 1, 2026',
  'Date Sold': '',
  'Accounting Note': 'Revenue detail; profit and ROI are included in bundle parent',
  Notes: '',
  },
  {
  'Record Type': 'Standalone',
  Name: 'Keeper',
  Category: 'Games',
  Condition: 'Good',
  'Buy Price': 20,
  'Sell Price': '',
  Profit: '',
  'ROI %': '',
  'Bought from': 'Market',
  'Sold on': '',
  Status: 'Keeping',
  'Date Bought': 'May 1, 2026',
  'Date Sold': '',
  'Accounting Note': '',
  Notes: '',
  },
 ])
 })
})

function item(overrides: Partial<Item>): Item {
 return {
  tsid: 'item',
  user_id: 'user-1',
  name: 'Item',
  category: 'Games',
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
