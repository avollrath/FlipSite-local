import { describe, expect, it } from 'vitest'
import {
  calculateItemProfit,
  calculateItemROI,
  calculateItemSellValue,
  getBundleChildrenByParent,
  getEffectiveItemStatus,
  getFlippingAggregateItems,
  getKeeperItems,
  getSoldAggregateItems,
  getUnsoldResaleItems,
  isAggregateItem,
  isKeepingItem,
} from '@/lib/itemAccounting'
import { buildDashboardMetrics } from '@/lib/analytics'
import type { Item } from '@/types'

const baseItem: Item = {
  bought_at: '2026-05-01T00:00:00.000Z',
  buy_platform: 'Marketplace',
  buy_price: 100,
  category: 'Games',
  condition: 'Good',
  created_at: '2026-05-01T00:00:00.000Z',
  is_bundle_parent: false,
  name: 'Item',
  notes: null,
  sell_platform: null,
  sell_price: null,
  sold_at: null,
  status: 'holding',
  tsid: 'item-1',
  user_id: 'user-1',
}

function item(overrides: Partial<Item>): Item {
  return { ...baseItem, ...overrides }
}

describe('item accounting helpers', () => {
  it('calculates standalone sold item sell value, profit, ROI, and status', () => {
    const sold = item({
      sell_price: 150,
      sold_at: '2026-05-10T00:00:00.000Z',
      status: 'sold',
    })

    expect(calculateItemSellValue(sold, [sold])).toBe(150)
    expect(calculateItemProfit(sold, [sold])).toBe(50)
    expect(calculateItemROI(sold, [sold])).toBe(50)
    expect(getEffectiveItemStatus(sold, [sold])).toBe('sold')
    expect(isAggregateItem(sold)).toBe(true)
    expect(getSoldAggregateItems([sold])).toEqual([sold])
  })

  it('preserves current raw loss behavior for unsold standalone items', () => {
    const unsold = item({ buy_price: 80, sell_price: null, status: 'holding' })

    expect(calculateItemSellValue(unsold, [unsold])).toBe(0)
    expect(calculateItemProfit(unsold, [unsold])).toBe(-80)
    expect(calculateItemROI(unsold, [unsold])).toBe(-100)
    expect(getSoldAggregateItems([unsold])).toEqual([])
    expect(getUnsoldResaleItems([unsold])).toEqual([unsold])
  })

  it('tracks sold losses as sold aggregate items', () => {
    const loss = item({
      buy_price: 120,
      sell_price: 75,
      sold_at: '2026-05-12T00:00:00.000Z',
      status: 'sold',
    })

    expect(calculateItemProfit(loss, [loss])).toBe(-45)
    expect(calculateItemROI(loss, [loss])).toBe(-37.5)
    expect(getSoldAggregateItems([loss])).toEqual([loss])
  })

  it('keeps zero-sale sold items out of sold aggregate reporting', () => {
    const zeroSale = item({
      buy_price: 25,
      sell_price: 0,
      sold_at: '2026-05-12T00:00:00.000Z',
      status: 'sold',
    })

    expect(getEffectiveItemStatus(zeroSale, [zeroSale])).toBe('sold')
    expect(calculateItemSellValue(zeroSale, [zeroSale])).toBe(0)
    expect(calculateItemProfit(zeroSale, [zeroSale])).toBe(-25)
    expect(getSoldAggregateItems([zeroSale])).toEqual([])
  })

  it('excludes keepers from resale accounting by status or category', () => {
    const statusKeeper = item({ sell_price: 200, status: 'keeper' })
    const categoryKeeper = item({
      category: 'Keeping',
      sell_price: 200,
      status: 'listed',
      tsid: 'item-2',
    })

    expect(isKeepingItem(statusKeeper)).toBe(true)
    expect(isKeepingItem(categoryKeeper)).toBe(true)
    expect(calculateItemSellValue(statusKeeper, [statusKeeper])).toBe(0)
    expect(calculateItemProfit(statusKeeper, [statusKeeper])).toBe(0)
    expect(calculateItemROI(statusKeeper, [statusKeeper])).toBeNull()
    expect(getEffectiveItemStatus(categoryKeeper, [categoryKeeper])).toBe('keeper')
    expect(getKeeperItems([statusKeeper, categoryKeeper])).toEqual([
      statusKeeper,
      categoryKeeper,
    ])
  })

  it('calculates bundle parent totals from parent cost and child sell values', () => {
    const parent = item({
      buy_price: 100,
      is_bundle_parent: true,
      name: 'Bundle',
      sell_price: null,
      status: 'holding',
      tsid: 'bundle-1',
    })
    const childA = item({
      bundle_id: parent.tsid,
      buy_price: 30,
      name: 'Child A',
      sell_price: 70,
      sold_at: '2026-05-10T00:00:00.000Z',
      status: 'sold',
      tsid: 'child-a',
    })
    const childB = item({
      bundle_id: parent.tsid,
      buy_price: 20,
      name: 'Child B',
      sell_price: 50,
      sold_at: '2026-05-11T00:00:00.000Z',
      status: 'sold',
      tsid: 'child-b',
    })
    const items = [parent, childA, childB]

    expect(calculateItemSellValue(parent, items)).toBe(120)
    expect(calculateItemProfit(parent, items)).toBe(20)
    expect(calculateItemROI(parent, items)).toBe(20)
    expect(getEffectiveItemStatus(parent, items)).toBe('sold')
    expect(getSoldAggregateItems(items)).toEqual([parent])
  })

  it('treats bundle children as revenue detail, not standalone profit centers', () => {
    const parent = item({
      buy_price: 100,
      is_bundle_parent: true,
      name: 'Bundle',
      tsid: 'bundle-1',
    })
    const child = item({
      bundle_id: parent.tsid,
      buy_price: 30,
      name: 'Child',
      sell_price: 70,
      status: 'sold',
      tsid: 'child-1',
    })

    expect(isAggregateItem(child)).toBe(false)
    expect(calculateItemSellValue(child, [parent, child])).toBe(70)
    expect(calculateItemProfit(child, [parent, child])).toBeNull()
    expect(calculateItemROI(child, [parent, child])).toBeNull()
    expect(getFlippingAggregateItems([parent, child])).toEqual([parent])
  })

  it('groups bundle children by parent id', () => {
    const parent = item({ is_bundle_parent: true, tsid: 'bundle-1' })
    const childA = item({ bundle_id: parent.tsid, tsid: 'child-a' })
    const childB = item({ bundle_id: parent.tsid, tsid: 'child-b' })

    expect(getBundleChildrenByParent([parent, childA, childB])).toEqual(
      new Map([[parent.tsid, [childA, childB]]]),
    )
  })

  it('keeps dashboard best, loss, and total profit on aggregate rows only', () => {
    const standaloneWin = item({
      buy_price: 40,
      name: 'Standalone win',
      sell_price: 90,
      sold_at: '2026-05-10T00:00:00.000Z',
      status: 'sold',
      tsid: 'standalone-win',
    })
    const standaloneLoss = item({
      buy_price: 90,
      name: 'Standalone loss',
      sell_price: 30,
      sold_at: '2026-05-11T00:00:00.000Z',
      status: 'sold',
      tsid: 'standalone-loss',
    })
    const parent = item({
      buy_price: 100,
      is_bundle_parent: true,
      name: 'Bundle',
      status: 'holding',
      tsid: 'bundle-1',
    })
    const childA = item({
      bundle_id: parent.tsid,
      buy_price: 10,
      name: 'Bundle child A',
      sell_price: 300,
      sold_at: '2026-05-12T00:00:00.000Z',
      status: 'sold',
      tsid: 'child-a',
    })
    const childB = item({
      bundle_id: parent.tsid,
      buy_price: 10,
      name: 'Bundle child B',
      sell_price: 20,
      sold_at: '2026-05-13T00:00:00.000Z',
      status: 'sold',
      tsid: 'child-b',
    })
    const metrics = buildDashboardMetrics([
      standaloneWin,
      standaloneLoss,
      parent,
      childA,
      childB,
    ])

    expect(metrics.netProfit).toBe(210)
    expect(metrics.bestFlip?.name).toBe('Bundle')
    expect(metrics.bestFlip?.profit).toBe(220)
    expect(metrics.biggestLoss?.name).toBe('Standalone loss')
    expect(metrics.soldCount).toBe(3)
  })
})
