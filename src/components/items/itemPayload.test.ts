import { describe, expect, it } from 'vitest'
import {
 buildItemPayload,
 buildItemUpdates,
 getInitialItemFormState,
 shouldShowSellFields,
} from '@/components/items/itemPayload'
import { toSupabaseTimestamp } from '@/lib/dateInput'
import type { Item } from '@/types'

const baseItem: Item = {
 tsid: 'item-1',
 user_id: 'user-1',
 name: 'Console',
 category: 'Games',
 condition: 'Good',
 buy_price: 20.4,
 sell_price: null,
 buy_platform: 'eBay',
 sell_platform: null,
 status: 'holding',
 bought_at: '2026-05-01T00:00:00.000Z',
 sold_at: null,
 notes: null,
 created_at: '2026-05-01T00:00:00.000Z',
 bundle_id: null,
 is_bundle_parent: false,
}

describe('item drawer payload helpers', () => {
 it('maps defaults into new item form state', () => {
 expect(
  getInitialItemFormState({
  defaults: {
   defaultCategory: 'Audio',
   defaultCondition: 'Like new',
   defaultPlatform: 'Flea market',
   defaultStatus: 'listed',
  },
  item: null,
  }),
 ).toMatchObject({
  name: '',
  category: 'Audio',
  condition: 'Like new',
  buy_price: '',
  sell_price: '',
  buy_platform: 'Flea market',
  sell_platform: '',
  status: 'listed',
  sold_at: '',
  notes: '',
 })
 })

 it('maps existing item fields into edit form state', () => {
 expect(
  getInitialItemFormState({
  defaults: null,
  item: {
   ...baseItem,
   sell_price: 45,
   sell_platform: 'Vinted',
   status: 'sold',
   sold_at: '2026-05-05T00:00:00.000Z',
   notes: 'boxed',
  },
  }),
 ).toEqual({
  name: 'Console',
  category: 'Games',
  condition: 'Good',
  buy_price: '20.4',
  sell_price: '45',
  buy_platform: 'eBay',
  sell_platform: 'Vinted',
  status: 'sold',
  bought_at: '01/05/2026',
  sold_at: '05/05/2026',
  notes: 'boxed',
 })
 })

 it('builds a new holding item payload', () => {
 const result = buildItemPayload({
  name: '  Camera  ',
  category: ' Photo ',
  condition: 'Like New',
  buy_price: '20,40',
  sell_price: '99',
  buy_platform: ' Market ',
  sell_platform: 'Ignored',
  status: 'holding',
  bought_at: '01/05/2026',
  sold_at: '05/05/2026',
  notes: '  clean lens  ',
 })

 expect(result).toEqual({
  ok: true,
  payload: {
  name: 'Camera',
  category: 'Photo',
  condition: 'Like new',
  buy_price: 20.4,
  sell_price: null,
  buy_platform: 'Market',
  sell_platform: null,
  status: 'holding',
  bought_at: toSupabaseTimestamp('01/05/2026'),
  sold_at: null,
  notes: 'clean lens',
  },
 })
 })

 it('builds sold item fields', () => {
 const result = buildItemPayload({
  name: 'Camera',
  category: 'Photo',
  condition: 'Good',
  buy_price: '20.4',
  sell_price: '40,80',
  buy_platform: '',
  sell_platform: ' Kleinanzeigen ',
  status: 'sold',
  bought_at: '01/05/2026',
  sold_at: '05/05/2026',
  notes: '',
 })

 expect(result).toEqual({
  ok: true,
  payload: expect.objectContaining({
  sell_price: 40.8,
  buy_platform: null,
  sell_platform: 'Kleinanzeigen',
  status: 'sold',
  sold_at: toSupabaseTimestamp('05/05/2026'),
  notes: null,
  }),
 })
 })

 it('keeps listed sell fields without requiring a sell price', () => {
 const result = buildItemPayload({
  name: 'Camera',
  category: 'Photo',
  condition: 'Good',
  buy_price: '20',
  sell_price: '',
  buy_platform: '',
  sell_platform: 'eBay',
  status: 'listed',
  bought_at: '01/05/2026',
  sold_at: '',
  notes: '',
 })

 expect(result).toEqual({
  ok: true,
  payload: expect.objectContaining({
  sell_price: null,
  sell_platform: 'eBay',
  status: 'listed',
  sold_at: null,
  }),
 })
 })

 it('clears sell fields for keeper payloads', () => {
 const result = buildItemPayload({
  name: 'Speakers',
  category: 'Audio',
  condition: 'Good',
  buy_price: '30',
  sell_price: '55',
  buy_platform: 'Shop',
  sell_platform: 'Ignored',
  status: 'keeper',
  bought_at: '01/05/2026',
  sold_at: '05/05/2026',
  notes: '',
 })

 expect(result).toEqual({
  ok: true,
  payload: expect.objectContaining({
  sell_price: null,
  sell_platform: null,
  status: 'keeper',
  sold_at: null,
  }),
 })
 })

 it('adds bundle parent update flag only when needed', () => {
 const payload = buildItemPayload({
  name: 'Bundle',
  category: 'Games',
  condition: 'Good',
  buy_price: '100',
  sell_price: '',
  buy_platform: '',
  sell_platform: '',
  status: 'holding',
  bought_at: '01/05/2026',
  sold_at: '',
  notes: '',
 })

 expect(payload.ok).toBe(true)
 if (!payload.ok) {
  return
 }

 expect(buildItemUpdates({ isBundle: true, item: baseItem, payload: payload.payload }))
 .toMatchObject({
  is_bundle_parent: true,
  name: 'Bundle',
 })
 expect(
  buildItemUpdates({
  isBundle: false,
  item: { ...baseItem, is_bundle_parent: true },
  payload: payload.payload,
  }),
 ).toMatchObject({ is_bundle_parent: false })
 expect(buildItemUpdates({ isBundle: false, item: baseItem, payload: payload.payload }))
 .not.toHaveProperty('is_bundle_parent')
 })

 it('preserves bundle child form values without special payload semantics', () => {
 const child = { ...baseItem, bundle_id: 'bundle-1', name: 'Game', buy_price: 0 }

 expect(getInitialItemFormState({ defaults: null, item: child })).toMatchObject({
  name: 'Game',
  buy_price: '0',
  status: 'holding',
 })
 })

 it('returns current validation messages for invalid decimal and date input', () => {
 expect(
  buildItemPayload({
  name: 'Camera',
  category: '',
  condition: 'Good',
  buy_price: 'abc',
  sell_price: '',
  buy_platform: '',
  sell_platform: '',
  status: 'holding',
  bought_at: '01/05/2026',
  sold_at: '',
  notes: '',
  }),
 ).toEqual({ ok: false, message: 'Enter a valid buy price' })

 expect(
  buildItemPayload({
  name: 'Camera',
  category: '',
  condition: 'Good',
  buy_price: '10',
  sell_price: '',
  buy_platform: '',
  sell_platform: '',
  status: 'holding',
  bought_at: '31/02/2026',
  sold_at: '',
  notes: '',
  }),
 ).toEqual({
  ok: false,
  message: 'Use date format dd/MM/yyyy for date bought',
 })

 expect(
  buildItemPayload({
  name: 'Camera',
  category: '',
  condition: 'Good',
  buy_price: '10',
  sell_price: '',
  buy_platform: '',
  sell_platform: '',
  status: 'sold',
  bought_at: '01/05/2026',
  sold_at: '',
  notes: '',
  }),
 ).toEqual({
  ok: false,
  message: 'Enter a valid sell price when an item is sold',
 })
 })

 it('keeps sell-field visibility semantics', () => {
 expect(shouldShowSellFields('sold')).toBe(true)
 expect(shouldShowSellFields('listed')).toBe(true)
 expect(shouldShowSellFields('holding')).toBe(false)
 expect(shouldShowSellFields('keeper')).toBe(false)
 })
})
