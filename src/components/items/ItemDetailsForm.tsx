import { CircleCheck } from 'lucide-react'
import type { RefObject } from 'react'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import {
 Field,
 SuggestionCombobox,
 itemInputClassName as inputClassName,
} from '@/components/items/ItemFormControls'
import {
 formatCurrency,
 getStatusLabel,
} from '@/lib/utils'
import type { ItemStatus } from '@/types'

export type ItemFormState = {
 name: string
 category: string
 condition: string
 buy_price: string
 sell_price: string
 buy_platform: string
 sell_platform: string
 status: ItemStatus
 bought_at: string
 sold_at: string
 notes: string
}

const statuses: ItemStatus[] = ['holding', 'listed', 'sold', 'keeper']

export function ItemDetailsForm({
 categories,
 conditionOptions,
 form,
 hasProfitPreview,
 markAsSold,
 platforms,
 profit,
 roi,
 sellPriceInputRef,
 showSellFields,
 updateField,
}: {
 categories: string[]
 conditionOptions: string[]
 form: ItemFormState
 hasProfitPreview: boolean
 markAsSold: () => void
 platforms: string[]
 profit: number | null
 roi: number | null
 sellPriceInputRef: RefObject<HTMLInputElement | null>
 showSellFields: boolean
 updateField: <K extends keyof ItemFormState>(
 key: K,
 value: ItemFormState[K],
 ) => void
}) {
 return (
 <>
 {hasProfitPreview ? (
 <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
 <p className="text-sm font-medium text-accent ">
  Profit Preview
 </p>
 <div className="mt-3 grid grid-cols-2 gap-3">
  <SummaryValue
  label="Profit"
  value={profit === null ? '--' : formatCurrency(profit)}
  />
  <SummaryValue
  label="ROI"
  value={roi === null ? '--' : `${roi.toFixed(1)}%`}
  />
 </div>
 </div>
 ) : null}

 <Field label="Name" required>
 <input
  className={inputClassName}
  value={form.name}
  onChange={(event) => updateField('name', event.target.value)}
  required
 />
 </Field>

 <Field label="Category">
 <SuggestionCombobox
  label="Category"
  options={categories}
  value={form.category}
  onChange={(value) => updateField('category', value)}
  placeholder="Type or select a category"
 />
 </Field>

 <div className="grid gap-4 sm:grid-cols-2">
 <Field label="Condition">
  <select
  className={inputClassName + ' pr-10'}
  value={form.condition}
  onChange={(event) =>
  updateField('condition', event.target.value)
  }
  >
  {conditionOptions.map((condition) => (
  <option key={condition} value={condition}>
   {condition}
  </option>
  ))}
  </select>
 </Field>

<Field label="Bought from">
  <SuggestionCombobox
  label="Bought from"
  options={platforms}
  value={form.buy_platform}
  onChange={(value) => updateField('buy_platform', value)}
  placeholder="Type or select a source"
  />
 </Field>
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <Field label="Buy Price" required>
  <input
  className={inputClassName}
  type="text"
  inputMode="decimal"
  value={form.buy_price}
  onChange={(event) =>
  updateField('buy_price', event.target.value)
  }
  placeholder="0,00 €"
  required
  />
 </Field>

 <div className="flex flex-col justify-end">
  {form.status === 'sold' ? (
  <div className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border-base px-4 text-sm font-semibold text-muted">
   <CircleCheck className="h-4 w-4" aria-hidden="true" />
   {form.sold_at ? `Sold on ${form.sold_at}` : 'Marked as sold'}
  </div>
  ) : (
  <button
   type="button"
   className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20 transition hover:bg-accent/90"
   onClick={markAsSold}
  >
   <CircleCheck className="h-4 w-4" aria-hidden="true" />
   Mark as Sold
  </button>
  )}
 </div>
 </div>

 {showSellFields ? (
 <div className="grid gap-4 sm:grid-cols-2">
  <Field label="Sell Price" required={form.status === 'sold'}>
  <input
   ref={sellPriceInputRef}
   className={inputClassName}
  type="text"
  inputMode="decimal"
  value={form.sell_price}
  onChange={(event) =>
   updateField('sell_price', event.target.value)
  }
  placeholder="0,00 €"
  required={form.status === 'sold'}
  />
  </Field>

  <Field label="Sold on">
  <SuggestionCombobox
  label="Sold on"
  options={platforms}
  value={form.sell_platform}
  onChange={(value) => updateField('sell_platform', value)}
  placeholder="Type or select a sales channel"
  />
  </Field>
 </div>
 ) : null}

 <div className="grid gap-4 sm:grid-cols-2">
 <Field label="Status">
  <select
  className={inputClassName + ' pr-10'}
  value={form.status}
  onChange={(event) =>
  updateField('status', event.target.value as ItemStatus)
  }
  >
  {statuses.map((status) => (
  <option key={status} value={status}>
   {getStatusLabel(status)}
  </option>
  ))}
  </select>
 </Field>

 <Field label="Date Bought" required>
  <DatePickerInput
  className={inputClassName}
  value={form.bought_at}
  onChange={(value) => updateField('bought_at', value)}
  required
  />
 </Field>
 </div>

 {showSellFields ? (
<Field label="Date Sold">
  <DatePickerInput
  className={inputClassName}
  value={form.sold_at}
  onChange={(value) => updateField('sold_at', value)}
  />
 </Field>
 ) : null}

 <Field label="Notes">
 <textarea
  className={`${inputClassName} min-h-28 resize-none`}
  value={form.notes}
  onChange={(event) => updateField('notes', event.target.value)}
 />
 </Field>
 </>
 )
}

function SummaryValue({ label, value }: { label: string; value: string }) {
 return (
 <div>
 <p className="text-xs text-muted ">{label}</p>
 <p className="text-xl font-semibold">{value}</p>
 </div>
 )
}
