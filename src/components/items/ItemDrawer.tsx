import {
 CircleCheck,
 Info,
 Link2,
 Loader2,
 Plus,
 Trash2,
} from 'lucide-react'
import {
 useEffect,
 useMemo,
 useRef,
 useState,
 type FormEvent,
 type KeyboardEvent,
 type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
 ExistingFilesSection,
 PendingFilesSection,
} from '@/components/items/ItemFileSections'
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
} from '@/components/ui/sheet'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import {
 useAddItem,
 useAddBundle,
 useDeleteItem,
 useItems,
 useUpdateItem,
 type ItemUpdate,
 type NewBundleChild,
 type NewItem,
} from '@/hooks/useItems'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import {
 uploadItemFile,
} from '@/lib/itemFiles'
import { itemConditions, normalizeItemCondition } from '@/lib/conditions'
import {
 formatDateInputValue,
 formatTodayDateInputValue,
 toSupabaseTimestamp,
} from '@/lib/dateInput'
import {
 calcProfit,
 formatCurrency,
 getBuyPlatform,
 getSellPlatform,
 getStatusLabel,
 parseMoneyInput,
} from '@/lib/utils'
import { loadSettings } from '@/lib/settings'
import type { Item, ItemStatus } from '@/types'

type ItemDrawerProps = {
 open: boolean
 onOpenChange: (open: boolean) => void
 mode: 'add' | 'edit'
 item?: Item | null
 onEditItem?: (item: Item) => void
}

type DrawerFormProps = ItemDrawerProps

type FormState = {
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

type BundleChildForm = {
 id: string
 tsid?: string
 name: string
 condition: string
 category: string
 status: ItemStatus
 buy_price: string
}

type NormalizedBundleChild = Omit<NewBundleChild, 'buy_price'> & {
 buy_price: number
 localId: string
 tsid?: string
}

const statuses: ItemStatus[] = ['holding', 'listed', 'sold', 'keeper']

export function ItemDrawer(props: ItemDrawerProps) {
 const { open, onOpenChange, mode, item } = props
 const formKey = `${mode}-${item?.tsid ?? 'new'}-${open ? 'open' : 'closed'}`

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent>
  <ItemDrawerForm key={formKey} {...props} />
 </SheetContent>
 </Sheet>
 )
}

function ItemDrawerForm({ mode, item, onEditItem, onOpenChange }: DrawerFormProps) {
 const queryClient = useQueryClient()
 const { data: items = [], isLoading: isLoadingItems } = useItems()
 const addItem = useAddItem()
 const addBundle = useAddBundle()
 const updateItem = useUpdateItem()
 const deleteItem = useDeleteItem()
 const { isDemoMode, showDemoToast } = useDemoGuard()
 const [form, setForm] = useState<FormState>(() => getInitialState(item))
 const [confirmDelete, setConfirmDelete] = useState(false)
 const [isBundle, setIsBundle] = useState(Boolean(item?.is_bundle_parent))
 const [pendingFiles, setPendingFiles] = useState<File[]>([])
 const [pendingFileError, setPendingFileError] = useState('')
 const [isUploadingPendingFiles, setIsUploadingPendingFiles] = useState(false)
 const [shouldFocusSellPrice, setShouldFocusSellPrice] = useState(false)
 const sellPriceInputRef = useRef<HTMLInputElement | null>(null)
 const [bundleChildren, setBundleChildren] = useState<BundleChildForm[]>(() =>
 getInitialBundleChildren(item, items),
 )

 const categories = useMemo(
 () => uniqueValues(items.map((existingItem) => existingItem.category)),
 [items],
 )
 const platforms = useMemo(
 () =>
 uniqueValues(
  items.flatMap((existingItem) => [
  getBuyPlatform(existingItem),
  getSellPlatform(existingItem),
  ]),
 ),
 [items],
 )
 const conditionOptions = useMemo(() => [...itemConditions], [])

 const showSellFields = form.status === 'sold' || form.status === 'listed'
 const isBundleChild = Boolean(item?.bundle_id)
 const parentBundle = item?.bundle_id
 ? items.find((existingItem) => existingItem.tsid === item.bundle_id)
 : null

 const normalizedBuyPrice = parseMoneyInput(form.buy_price)
 const normalizedSellPrice = parseMoneyInput(form.sell_price)
 const existingBundleChildSell = item?.tsid
 ? items
  .filter((child) => child.bundle_id === item.tsid)
  .reduce((sum, child) => sum + (child.sell_price ?? 0), 0)
 : 0
 const profit = getPreviewProfit({
 bundleChildSell: existingBundleChildSell,
 buyPrice: normalizedBuyPrice,
 isBundle,
 isBundleChild,
 sellPrice: normalizedSellPrice,
 })
 const roi =
 profit === null || !normalizedBuyPrice
 ? null
 : (profit / normalizedBuyPrice) * 100
 const hasProfitPreview = profit !== null || roi !== null
 const isSubmitting =
 addItem.isPending ||
 addBundle.isPending ||
 updateItem.isPending ||
 isUploadingPendingFiles
 const isDeleting = deleteItem.isPending

 useEffect(() => {
 if (!shouldFocusSellPrice || !showSellFields || !sellPriceInputRef.current) {
  return
 }

 sellPriceInputRef.current.focus()
 setShouldFocusSellPrice(false)
 }, [shouldFocusSellPrice, showSellFields])

 function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
 setForm((currentForm) => ({
 ...currentForm,
 [key]: value,
 ...(key === 'status' && value !== 'sold' && value !== 'listed'
  ? { sell_platform: '', sell_price: '', sold_at: '' }
  : {}),
 }))
 }

 function markAsSold() {
 const shouldFocusPrice = !form.sell_price.trim()

 setForm((currentForm) => ({
 ...currentForm,
 status: 'sold',
 sold_at: currentForm.sold_at || formatTodayDateInputValue(),
 }))

 if (shouldFocusPrice) {
  setShouldFocusSellPrice(true)
 }
 }

 function updateBundleChild<K extends keyof BundleChildForm>(
 id: string,
 key: K,
 value: BundleChildForm[K],
 ) {
 setBundleChildren((children) =>
 children.map((child) =>
  child.id === id ? { ...child, [key]: value } : child,
 ),
 )
 }

 function addBundleChild() {
 setBundleChildren((children) => [...children, createEmptyBundleChild()])
 }

 function removeBundleChild(id: string) {
 setBundleChildren((children) => children.filter((child) => child.id !== id))
 }

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault()

 if (isDemoMode) {
 showDemoToast()
 return
 }

 const name = form.name.trim()
 const category = form.category.trim()
 const buyPriceValue = parseMoneyInput(form.buy_price)
 const sellPriceValue = parseMoneyInput(form.sell_price)

 if (!name) {
 toast.error('Name is required')
 return
 }

 if (buyPriceValue === null) {
 toast.error('Enter a valid buy price')
 return
 }

 if (!form.bought_at) {
 toast.error('Date bought is required')
 return
 }

 const boughtAt = toSupabaseTimestamp(form.bought_at)
 const soldAt =
 showSellFields && form.sold_at ? toSupabaseTimestamp(form.sold_at) : null

 if (!boughtAt) {
 toast.error('Use date format dd/MM/yyyy for date bought')
 return
 }

 if (showSellFields && form.sold_at && !soldAt) {
 toast.error('Use date format dd/MM/yyyy for date sold')
 return
 }

 if (form.status === 'sold' && sellPriceValue === null) {
 toast.error('Enter a valid sell price when an item is sold')
 return
 }

 const payload: NewItem = {
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
 }

 try {
 if (mode === 'edit' && item) {
  const updates: ItemUpdate = { ...payload }

  if (isBundle || item.is_bundle_parent) {
  updates.is_bundle_parent = isBundle
  }

  await updateItem.mutateAsync({
  tsid: item.tsid,
  updates,
  })

  if (isBundle) {
  await saveEditedBundleChildren(item.tsid, payload)
  }
 } else if (isBundle) {
  const createdItem = await addBundle.mutateAsync({
  parent: payload,
  children: normalizeBundleChildren(),
  })
  await uploadPendingFiles(createdItem.tsid)
 } else {
  const createdItem = await addItem.mutateAsync(payload)
  await uploadPendingFiles(createdItem.tsid)
 }

 onOpenChange(false)
 } catch {
 return
 }
 }

 async function uploadPendingFiles(itemId: string) {
 if (pendingFiles.length === 0) {
 return
 }

 setIsUploadingPendingFiles(true)
 setPendingFileError('')

 try {
 for (const pendingFile of pendingFiles) {
  await uploadItemFile(itemId, pendingFile)
 }

 setPendingFiles([])
 void queryClient.invalidateQueries({ queryKey: ['item-image-thumbnails'] })
 toast.success(pendingFiles.length === 1 ? 'File uploaded' : 'Files uploaded')
 } catch (uploadError) {
 const message = getErrorMessage(uploadError, 'Unable to upload files')
 setPendingFileError(`Item was created, but files could not upload: ${message}`)
 toast.warning('Item was created, but files could not upload')
 } finally {
 setIsUploadingPendingFiles(false)
 }
 }

 async function saveEditedBundleChildren(parentTsid: string, parent: NewItem) {
 const children = bundleChildren
 .map((child) => normalizeBundleChild(child))
 .filter((child): child is NormalizedBundleChild => child !== null)

 for (const child of children) {
 const updates: ItemUpdate = {
  buy_price: child.buy_price ?? 0,
  category: child.category,
  condition: normalizeItemCondition(child.condition),
  name: child.name,
  status: child.status,
 }

 if (child.tsid) {
  await updateItem.mutateAsync({
  tsid: child.tsid,
  updates,
  syncBundleParent: false,
  })
 } else {
  const newChild = toNewBundleChild(child)
  await addItem.mutateAsync({
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
 }

 function normalizeBundleChildren() {
 return bundleChildren
 .map((child) => normalizeBundleChild(child))
 .filter((child): child is NormalizedBundleChild => child !== null)
 .map(toNewBundleChild)
 }

 function normalizeBundleChild(
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

 async function handleDelete() {
 if (!item) {
 return
 }

 if (isDemoMode) {
 showDemoToast()
 return
 }

 try {
 await deleteItem.mutateAsync(item.tsid)
 onOpenChange(false)
 } catch {
 return
 }
 }

 return (
 <>
 <SheetHeader>
  <SheetTitle>{mode === 'edit' ? 'Edit Item' : 'Add Item'}</SheetTitle>
  <SheetDescription>
  Capture purchase details, listing status, and resale performance.
  </SheetDescription>
 </SheetHeader>

 <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
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
    Sold
   </button>
   )}
  </div>

  {showSellFields ? (
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
  ) : null}
  </div>

  {showSellFields ? (
  <Field label="Sold on">
   <SuggestionCombobox
   label="Sold on"
   options={platforms}
   value={form.sell_platform}
   onChange={(value) => updateField('sell_platform', value)}
   placeholder="Type or select a sales channel"
   />
  </Field>
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

  {isBundleChild ? (
  <ParentBundleInfoBox
   isLoading={isLoadingItems}
   parentBundle={parentBundle}
   onOpenParent={
   parentBundle && onEditItem ? () => onEditItem(parentBundle) : undefined
   }
  />
  ) : (
  <label className="flex items-center justify-between gap-4 rounded-lg border border-border-base bg-surface-2/60 p-4">
   <span>
    <span className="block text-sm font-semibold text-base ">
   This is a bundle
   </span>
   <span className="mt-1 block text-sm text-muted ">
   Track multiple items bought together under one total price.
   </span>
  </span>
  <input
   type="checkbox"
   className="h-5 w-5 rounded border-border-base text-accent focus:ring-accent"
   checked={isBundle}
   onChange={(event) => {
   setIsBundle(event.target.checked)
   if (event.target.checked && bundleChildren.length === 0) {
   setBundleChildren([createEmptyBundleChild()])
   }
   }}
   />
  </label>
  )}

  {!isBundleChild && isBundle ? (
  <BundleItemsSection
   categoryOptions={categories}
   childrenForms={bundleChildren}
   conditionOptions={conditionOptions}
   onAdd={addBundleChild}
   onRemove={removeBundleChild}
   onUpdate={updateBundleChild}
  />
  ) : null}

  {mode === 'edit' && item ? (
  <ExistingFilesSection itemId={item.tsid} />
  ) : (
  <PendingFilesSection
   disabled={isSubmitting}
   error={pendingFileError}
   files={pendingFiles}
   isUploading={isUploadingPendingFiles}
   onFilesChange={setPendingFiles}
  />
  )}

  {mode === 'edit' ? (
  <DeletePanel
   confirming={confirmDelete}
   deleting={isDeleting}
   isDemoMode={isDemoMode}
   onCancel={() => setConfirmDelete(false)}
   onConfirm={handleDelete}
   onStart={() => {
   if (isDemoMode) {
    showDemoToast()
    return
   }

   setConfirmDelete(true)
   }}
  />
  ) : null}
  </div>

  <SheetFooter>
  <button
  type="button"
  className="rounded-lg border border-border-base px-4 py-3 text-sm font-semibold text-base transition hover:bg-surface-2"
  onClick={() => onOpenChange(false)}
  >
  Cancel
  </button>
  <button
  type="submit"
  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
  disabled={isSubmitting || isDemoMode}
  onClick={isDemoMode ? showDemoToast : undefined}
  >
  {isSubmitting ? (
   <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : null}
  {isDemoMode ? 'Sign up to add items' : mode === 'edit' ? 'Save Changes' : 'Add Item'}
  </button>
  </SheetFooter>
 </form>
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

function getPreviewProfit({
 bundleChildSell,
 buyPrice,
 isBundle,
 isBundleChild,
 sellPrice,
}: {
 bundleChildSell: number
 buyPrice: number | null
 isBundle: boolean
 isBundleChild: boolean
 sellPrice: number | null
}) {
 if (isBundle) {
  if (buyPrice === null && sellPrice === null && bundleChildSell === 0) {
   return null
  }

  return (sellPrice ?? 0) + bundleChildSell - (buyPrice ?? 0)
 }

 if (isBundleChild) {
  return sellPrice
 }

 return calcProfit(buyPrice, sellPrice)
}

function ParentBundleInfoBox({
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

function BundleItemsSection({
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

function SuggestionCombobox({
 label,
 onChange,
 options,
 placeholder,
 value,
}: {
 label: string
 onChange: (value: string) => void
 options: string[]
 placeholder: string
 value: string
}) {
 const containerRef = useRef<HTMLDivElement | null>(null)
 const [open, setOpen] = useState(false)
 const [highlightedIndex, setHighlightedIndex] = useState(0)
 const filteredOptions = options.filter((option) => optionMatches(option, value))
 const exactMatch = options.some(
 (option) => option.toLowerCase() === value.trim().toLowerCase(),
 )
 const showCustomOption = Boolean(value.trim() && !exactMatch)
 const visibleOptions = showCustomOption
 ? [`Use "${value.trim()}"`, ...filteredOptions]
 : filteredOptions

 useEffect(() => {
 if (!open) {
 return
 }

 function handlePointerDown(event: MouseEvent) {
 if (!containerRef.current?.contains(event.target as Node)) {
  setOpen(false)
 }
 }

 document.addEventListener('mousedown', handlePointerDown)

 return () => {
 document.removeEventListener('mousedown', handlePointerDown)
 }
 }, [open])

 function selectOption(option: string) {
 if (showCustomOption && option === visibleOptions[0]) {
 onChange(value.trim())
 } else {
 onChange(option)
 }

 setOpen(false)
 }

 function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
 if (event.key === 'ArrowDown') {
 event.preventDefault()
 setOpen(true)
 setHighlightedIndex((currentIndex) =>
  Math.min(currentIndex + 1, Math.max(visibleOptions.length - 1, 0)),
 )
 return
 }

 if (event.key === 'ArrowUp') {
 event.preventDefault()
 setOpen(true)
 setHighlightedIndex((currentIndex) => Math.max(currentIndex - 1, 0))
 return
 }

 if (event.key === 'Enter' && open && visibleOptions[highlightedIndex]) {
 event.preventDefault()
 selectOption(visibleOptions[highlightedIndex])
 return
 }

 if (event.key === 'Escape') {
 setOpen(false)
 }
 }

 return (
 <div ref={containerRef} className="relative">
 <input
  className={inputClassName}
  value={value}
  onChange={(event) => {
  onChange(event.target.value)
  setHighlightedIndex(0)
  setOpen(true)
  }}
  onFocus={() => {
  setHighlightedIndex(0)
  setOpen(true)
  }}
  onClick={() => {
  setHighlightedIndex(0)
  setOpen(true)
  }}
  onKeyDown={handleKeyDown}
  placeholder={placeholder}
  role="combobox"
  aria-autocomplete="list"
  aria-expanded={open}
  aria-label={label}
 />
 {open ? (
  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg bg-card p-1 shadow-xl">
  {visibleOptions.length === 0 ? (
  <div className="px-3 py-2 text-sm text-muted ">
   No suggestions yet.
  </div>
  ) : (
  visibleOptions.map((option, index) => (
   <button
   key={`${option}-${index}`}
   type="button"
   className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
   highlightedIndex === index
    ? 'bg-accent-soft text-accent bg-accent/15 '
    : 'text-base hover:bg-surface-2'
   }`}
   onMouseEnter={() => setHighlightedIndex(index)}
   onMouseDown={(event) => event.preventDefault()}
   onClick={() => selectOption(option)}
   >
   {option}
   </button>
  ))
  )}
  </div>
 ) : null}
 </div>
 )
}

function DeletePanel({
 confirming,
 deleting,
 isDemoMode,
 onCancel,
 onConfirm,
 onStart,
}: {
 confirming: boolean
 deleting: boolean
 isDemoMode: boolean
 onCancel: () => void
 onConfirm: () => void
 onStart: () => void
}) {
 return (
 <div className="rounded-lg border border-negative/25 bg-negative/10 p-4 border-negative/30 bg-negative/10">
 {confirming ? (
  <div>
  <p className="text-sm font-medium text-negative ">
  Delete this item?
  </p>
  <p className="mt-1 text-sm text-negative/80">
  This action cannot be undone.
  </p>
  <div className="mt-4 flex gap-2">
  <button
  type="button"
  className="rounded-lg bg-negative px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-negative/90 disabled:opacity-70"
   onClick={onConfirm}
   disabled={deleting || isDemoMode}
  >
   {isDemoMode ? 'Sign up to add items' : deleting ? 'Deleting...' : 'Confirm Delete'}
  </button>
  <button
   type="button"
   className="rounded-lg border border-negative/25 px-3 py-2 text-sm font-semibold text-negative transition hover:bg-negative/15 border-negative/30 hover:bg-negative/10"
   onClick={onCancel}
  >
   Cancel
  </button>
  </div>
  </div>
 ) : (
  <button
  type="button"
  className="flex items-center gap-2 text-sm font-semibold text-negative transition hover:text-negative"
  onClick={onStart}
  disabled={isDemoMode}
  >
  <Trash2 className="h-4 w-4" aria-hidden="true" />
  {isDemoMode ? 'Sign up to add items' : 'Delete Item'}
  </button>
 )}
 </div>
 )
}

function Field({
 children,
 label,
 required,
}: {
 children: ReactNode
 label: string
 required?: boolean
}) {
 return (
 <label className="block">
 <span className="text-sm font-medium text-base ">
  {label}
  {required ? <span className="text-accent"> *</span> : null}
 </span>
 <span className="mt-2 block">{children}</span>
 </label>
 )
}

function getInitialState(item?: Item | null): FormState {
 const defaults = item ? null : loadSettings()

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

function getInitialBundleChildren(
 item: Item | null | undefined,
 items: Item[],
): BundleChildForm[] {
 if (!item?.is_bundle_parent) {
 return []
 }

 return items
 .filter((child) => child.bundle_id === item.tsid)
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

function createEmptyBundleChild(): BundleChildForm {
 return {
 id: crypto.randomUUID(),
 name: '',
 category: '',
 condition: 'Good',
 status: 'holding',
 buy_price: '',
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

function uniqueValues(values: string[]) {
 const valuesByLowercase = new Map<string, string>()

 for (const value of values) {
 const trimmedValue = value.trim()

 if (!trimmedValue) {
 continue
 }

 const normalizedValue = trimmedValue.toLowerCase()

 if (!valuesByLowercase.has(normalizedValue)) {
 valuesByLowercase.set(normalizedValue, trimmedValue)
 }
 }

 return Array.from(valuesByLowercase.values()).sort((a, b) =>
 a.localeCompare(b),
 )
}

function optionMatches(option: string, query: string) {
 const normalizedOption = option.toLowerCase()
 const normalizedQuery = query.trim().toLowerCase()

 if (!normalizedQuery) {
 return true
 }

 return normalizedOption.includes(normalizedQuery)
}

function getErrorMessage(error: unknown, fallback: string) {
 return error instanceof Error ? error.message : fallback
}

const inputClassName =
 'w-full rounded-lg border border-border-base bg-card px-3 py-2.5 text-sm text-base outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10 '
