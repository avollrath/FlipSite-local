import { normalizeItemCondition } from '@/lib/conditions'
import {
 formatDateInputValue,
 formatTodayDateInputValue,
 toSupabaseTimestamp,
} from '@/lib/dateInput'
import {
 getBuyPlatform,
 getSellPlatform,
 parseMoneyInput,
} from '@/lib/utils'
import type { ItemUpdate, NewItem } from '@/hooks/useItems'
import type { Item } from '@/types'
import type { ItemFormState } from '@/components/items/ItemDetailsForm'

export type ItemFormDefaults = {
 defaultCategory?: string
 defaultCondition?: string
 defaultPlatform?: string
 defaultStatus?: ItemFormState['status']
} | null

export type BuildItemPayloadResult =
 | { ok: true; payload: NewItem }
 | { ok: false; message: string }

export function getInitialItemFormState({
 defaults,
 item,
}: {
 defaults: ItemFormDefaults
 item?: Item | null
}): ItemFormState {
 return {
 name: item?.name ?? '',
 category: item?.category ?? defaults?.defaultCategory ?? '',
 condition: normalizeItemCondition(
 item?.condition ?? defaults?.defaultCondition ?? 'Good',
 ),
 buy_price: item?.buy_price === undefined ? '' : String(item.buy_price),
 sell_price:
 item?.sell_price === null || item?.sell_price === undefined
  ? ''
  : String(item.sell_price),
 buy_platform: item ? getBuyPlatform(item) : defaults?.defaultPlatform ?? '',
 sell_platform: item ? getSellPlatform(item) : '',
 status: item?.status ?? defaults?.defaultStatus ?? 'holding',
 bought_at: formatDateInputValue(item?.bought_at) || formatTodayDateInputValue(),
 sold_at: formatDateInputValue(item?.sold_at),
 notes: item?.notes ?? '',
 }
}

export function buildItemPayload(form: ItemFormState): BuildItemPayloadResult {
 const name = form.name.trim()
 const category = form.category.trim()
 const buyPriceValue = parseMoneyInput(form.buy_price)
 const sellPriceValue = parseMoneyInput(form.sell_price)
 const showSellFields = shouldShowSellFields(form.status)

 if (!name) {
 return { ok: false, message: 'Name is required' }
 }

 if (buyPriceValue === null) {
 return { ok: false, message: 'Enter a valid buy price' }
 }

 if (!form.bought_at) {
 return { ok: false, message: 'Date bought is required' }
 }

 const boughtAt = toSupabaseTimestamp(form.bought_at)
 const soldAt =
 showSellFields && form.sold_at ? toSupabaseTimestamp(form.sold_at) : null

 if (!boughtAt) {
 return { ok: false, message: 'Use date format dd/MM/yyyy for date bought' }
 }

 if (showSellFields && form.sold_at && !soldAt) {
 return { ok: false, message: 'Use date format dd/MM/yyyy for date sold' }
 }

 if (form.status === 'sold' && sellPriceValue === null) {
 return {
  ok: false,
  message: 'Enter a valid sell price when an item is sold',
 }
 }

 return {
 ok: true,
 payload: {
  name,
  category,
  condition: normalizeItemCondition(form.condition),
  buy_price: buyPriceValue,
  sell_price: showSellFields ? sellPriceValue : null,
  buy_platform: form.buy_platform.trim() || null,
  sell_platform: showSellFields ? form.sell_platform.trim() || null : null,
  status: form.status,
  bought_at: boughtAt,
  sold_at: soldAt,
  notes: form.notes.trim() || null,
 },
 }
}

export function buildItemUpdates({
 isBundle,
 item,
 payload,
}: {
 isBundle: boolean
 item: Item
 payload: NewItem
}): ItemUpdate {
 const updates: ItemUpdate = { ...payload }

 if (isBundle || item.is_bundle_parent) {
 updates.is_bundle_parent = isBundle
 }

 return updates
}

export function shouldShowSellFields(status: ItemFormState['status']) {
 return status === 'sold' || status === 'listed'
}
