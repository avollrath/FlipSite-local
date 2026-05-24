import {
 Info,
 Link2,
 Plus,
 Trash2,
} from 'lucide-react'
import {
 SuggestionCombobox,
 itemInputClassName as inputClassName,
} from '@/components/items/ItemFormControls'
import { getStatusLabel } from '@/lib/utils'
import type { Item, ItemStatus } from '@/types'

export type BundleChildForm = {
 id: string
 tsid?: string
 name: string
 condition: string
 category: string
 status: ItemStatus
 buy_price: string
}

const statuses: ItemStatus[] = ['holding', 'listed', 'sold', 'keeper']

export function ParentBundleInfoBox({
 isLoading,
 onOpenParent,
 parentBundle,
}: {
 isLoading: boolean
 onOpenParent?: () => void
 parentBundle: Item | null | undefined
}) {
 const label = isLoading
 ? 'Loading bundle info...'
 : parentBundle?.name ?? 'Unknown bundle'

 return (
 <section className="flex items-start gap-3 rounded-lg border border-border-base bg-surface-2/60 p-4">
  <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
  <div>
  <p className="text-sm font-semibold text-base ">
   This item is part of a bundle:
  </p>
  {parentBundle && onOpenParent ? (
   <button
   type="button"
   className="mt-1 inline-flex items-center gap-1 text-left text-sm font-semibold text-accent transition hover:text-accent/80"
   onClick={onOpenParent}
   >
   <Link2 className="h-4 w-4" aria-hidden="true" />
   {parentBundle.name}
   </button>
  ) : (
   <p className="mt-1 text-sm text-muted ">{label}</p>
  )}
  </div>
 </section>
 )
}

export function BundleEditor({
 categoryOptions,
 childrenForms,
 conditionOptions,
 onAdd,
 onRemove,
 onUpdate,
}: {
 categoryOptions: string[]
 childrenForms: BundleChildForm[]
 conditionOptions: string[]
 onAdd: () => void
 onRemove: (id: string) => void
 onUpdate: <K extends keyof BundleChildForm>(
 id: string,
 key: K,
 value: BundleChildForm[K],
 ) => void
}) {
 return (
 <section className="rounded-lg border border-accent/30 bg-accent/10 p-4">
 <div className="flex items-center justify-between gap-3">
  <div>
  <h3 className="text-sm font-semibold text-base ">
  Bundle Items
  </h3>
  <p className="mt-1 text-sm text-muted ">
  Child items inherit bought-from platform and date bought from the parent.
  </p>
  </div>
  <button
  type="button"
  className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent/90"
  onClick={onAdd}
  >
  <Plus className="h-4 w-4" aria-hidden="true" />
  Add
  </button>
 </div>

 <div className="mt-4 space-y-3">
  {childrenForms.map((child) => (
  <div
  key={child.id}
  className="rounded-lg bg-surface-2/40 p-3"
  >
  <div className="mb-3 flex items-center justify-between gap-3">
   <div className="flex items-center gap-2 text-sm font-medium text-base ">
   <Link2 className="h-4 w-4 text-accent" aria-hidden="true" />
   {child.tsid ? 'Bundle child' : 'New child item'}
   </div>
   {!child.tsid ? (
   <button
   type="button"
   className="rounded-lg p-2 text-muted transition hover:bg-negative/10 hover:text-negative"
   onClick={() => onRemove(child.id)}
   aria-label="Remove child item"
   >
   <Trash2 className="h-4 w-4" aria-hidden="true" />
   </button>
   ) : null}
  </div>
  <div className="grid gap-3 sm:grid-cols-2">
   <input
   className={inputClassName}
   value={child.name}
   onChange={(event) =>
   onUpdate(child.id, 'name', event.target.value)
   }
   placeholder="Name"
   />
   <SuggestionCombobox
   label="Child category"
   options={categoryOptions}
   value={child.category}
   onChange={(value) => onUpdate(child.id, 'category', value)}
   placeholder="Category"
   />
   <select
   className={inputClassName + ' pr-10'}
   value={child.condition}
   onChange={(event) =>
   onUpdate(child.id, 'condition', event.target.value)
   }
   >
   {conditionOptions.map((condition) => (
   <option key={condition} value={condition}>
    {condition}
   </option>
   ))}
   </select>
   <select
   className={inputClassName + ' pr-10'}
   value={child.status}
   onChange={(event) =>
   onUpdate(child.id, 'status', event.target.value as ItemStatus)
   }
   >
   {statuses.map((status) => (
   <option key={status} value={status}>
    {getStatusLabel(status)}
   </option>
   ))}
   </select>
   <input
   className={inputClassName}
   type="text"
   inputMode="decimal"
   value={child.buy_price}
   onChange={(event) =>
   onUpdate(child.id, 'buy_price', event.target.value)
   }
   placeholder="0,00 €"
   />
  </div>
  </div>
  ))}
 </div>
 </section>
 )
}
