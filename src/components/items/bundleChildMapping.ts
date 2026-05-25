import { normalizeItemCondition } from '@/lib/conditions'
import { parseMoneyInput } from '@/lib/utils'
import { createItemIndex } from '@/domain/items/itemIndex'
import type { ItemUpdate, NewBundleChild, NewItem } from '@/hooks/useItems'
import type { Item } from '@/types'
import type { BundleChildForm } from '@/components/items/BundleEditor'

export type NormalizedBundleChild = Omit<NewBundleChild, 'buy_price'> & {
 buy_price: number
 localId: string
 tsid?: string
}

export type BundleChildSavePlan = {
 creates: NewItem[]
 updates: Array<{
 tsid: string
 updates: ItemUpdate
 }>
}

export function getInitialBundleChildren(
 item: Item | null | undefined,
 items: Item[],
): BundleChildForm[] {
 if (!item?.is_bundle_parent) {
 return []
 }

 return (createItemIndex(items).childrenByBundleId.get(item.tsid) ?? [])
 .map((child) => ({
 id: child.tsid,
 tsid: child.tsid,
 name: child.name,
 category: child.category,
 condition: normalizeItemCondition(child.condition),
 status: child.status,
 buy_price: child.buy_price > 0 ? String(child.buy_price) : '',
 }))
}

export function createEmptyBundleChild(
 generateId: () => string = crypto.randomUUID,
): BundleChildForm {
 return {
 id: generateId(),
 name: '',
 category: '',
 condition: 'Good',
 status: 'holding',
 buy_price: '',
 }
}

export function normalizeBundleChildren(children: BundleChildForm[]) {
 return children
 .map((child) => normalizeBundleChild(child))
 .filter((child): child is NormalizedBundleChild => child !== null)
 .map(toNewBundleChild)
}

export function normalizeBundleChild(
 child: BundleChildForm,
): NormalizedBundleChild | null {
 const name = child.name.trim()

 if (!name) {
 return null
 }

 const splitCost = parseMoneyInput(child.buy_price)

 return {
 localId: child.id,
 tsid: child.tsid,
 name,
 category: child.category.trim(),
 condition: normalizeItemCondition(child.condition),
 status: child.status,
 buy_price: splitCost ?? 0,
 notes: null,
 }
}

export function buildBundleChildSavePlan({
 children,
 parent,
 parentTsid,
}: {
 children: BundleChildForm[]
 parent: NewItem
 parentTsid: string
}): BundleChildSavePlan {
 const plan: BundleChildSavePlan = { creates: [], updates: [] }

 for (const child of children
 .map((childForm) => normalizeBundleChild(childForm))
 .filter((childForm): childForm is NormalizedBundleChild => childForm !== null)) {
 if (child.tsid) {
  plan.updates.push({
  tsid: child.tsid,
  updates: toBundleChildUpdate(child),
  })
 } else {
  const newChild = toNewBundleChild(child)
  plan.creates.push({
  ...newChild,
  buy_price: newChild.buy_price ?? 0,
  bundle_id: parentTsid,
  bought_at: parent.bought_at,
  is_bundle_parent: false,
  buy_platform: parent.buy_platform ?? null,
  sell_platform: null,
  sell_price: null,
  sold_at: null,
  notes: null,
  })
 }
 }

 return plan
}

function toBundleChildUpdate(child: NormalizedBundleChild): ItemUpdate {
 return {
 buy_price: child.buy_price ?? 0,
 category: child.category,
 condition: normalizeItemCondition(child.condition),
 name: child.name,
 status: child.status,
 }
}

function toNewBundleChild(child: NormalizedBundleChild): NewBundleChild {
 return {
 buy_price: child.buy_price,
 category: child.category,
 condition: child.condition,
 name: child.name,
 notes: child.notes,
 status: child.status,
 }
}
