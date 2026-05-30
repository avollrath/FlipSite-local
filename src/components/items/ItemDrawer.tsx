import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
 useCallback,
 useEffect,
 useMemo,
 useRef,
 useState,
 type FormEvent,
} from 'react'
import { toast } from 'sonner'
import {
 ExistingFilesSection,
 PendingFilesSection,
} from '@/components/items/ItemFileSections'
import {
 ImageLightbox,
 type LightboxImage,
} from '@/components/ImageLightbox'
import {
 BundleEditor,
 ParentBundleInfoBox,
 type BundleChildForm,
} from '@/components/items/BundleEditor'
import {
 buildBundleChildSavePlan,
 createEmptyBundleChild,
 getInitialBundleChildren,
 normalizeBundleChildren,
} from '@/components/items/bundleChildMapping'
import {
 ItemDetailsForm,
 type ItemFormState as FormState,
} from '@/components/items/ItemDetailsForm'
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
} from '@/components/ui/sheet'
import {
 useAddItem,
 useAddBundle,
 useDeleteItem,
 useItems,
 useUpdateItem,
 type NewItem,
} from '@/hooks/useItems'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import {
 uploadItemFile,
 getSignedItemFileUrl,
 type ItemFile,
} from '@/lib/itemFiles'
import { itemConditions } from '@/lib/conditions'
import {
 formatTodayDateInputValue,
} from '@/lib/dateInput'
import {
 calcProfit,
 getBuyPlatform,
 getSellPlatform,
 parseMoneyInput,
 uniqueTextValues,
} from '@/lib/utils'
import { loadSettings } from '@/lib/settings'
import type { Item } from '@/types'
import {
 buildItemPayload,
 buildItemUpdates,
 getInitialItemFormState,
 shouldShowSellFields,
} from '@/components/items/itemPayload'

type ItemDrawerProps = {
 open: boolean
 onOpenChange: (open: boolean) => void
 mode: 'add' | 'edit'
 item?: Item | null
 onEditItem?: (item: Item) => void
}

type DrawerFormProps = ItemDrawerProps

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
 const [form, setForm] = useState<FormState>(() =>
 getInitialItemFormState({ defaults: item ? null : loadSettings(), item }),
 )
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
 const [imageFiles, setImageFiles] = useState<ItemFile[]>([])
 const [coverImageId, setCoverImageId] = useState(item?.cover_image_id ?? null)

 const categories = useMemo(
 () => uniqueTextValues(items.map((existingItem) => existingItem.category)),
 [items],
 )
 const platforms = useMemo(
 () =>
 uniqueTextValues(
  items.flatMap((existingItem) => [
  getBuyPlatform(existingItem),
  getSellPlatform(existingItem),
  ]),
 ),
 [items],
 )
 const conditionOptions = useMemo(() => [...itemConditions], [])

 const showSellFields = shouldShowSellFields(form.status)
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
 const sortedImageFiles = useMemo(
 () => sortImageFilesByCover(imageFiles, coverImageId),
 [coverImageId, imageFiles],
 )
 const handleImageFilesChange = useCallback((files: ItemFile[]) => {
 setImageFiles(files)
 }, [])

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

 async function setCoverImage(fileId: string) {
 if (!item) {
  return
 }

 const previousCoverImageId = coverImageId
 setCoverImageId(fileId)

 try {
  await updateItem.mutateAsync({
  tsid: item.tsid,
  updates: { cover_image_id: fileId },
  })
  void queryClient.invalidateQueries({ queryKey: ['item-image-thumbnails'] })
 } catch {
  setCoverImageId(previousCoverImageId)
 }
 }

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault()

 if (isDemoMode) {
 showDemoToast()
 return
 }

 const payloadResult = buildItemPayload(form)

 if (!payloadResult.ok) {
 toast.error(payloadResult.message)
 return
 }

 const { payload } = payloadResult

 try {
 if (mode === 'edit' && item) {
  await updateItem.mutateAsync({
  tsid: item.tsid,
  updates: buildItemUpdates({ isBundle, item, payload }),
  })

  if (isBundle) {
  await saveEditedBundleChildren(item.tsid, payload)
  }
 } else if (isBundle) {
  const createdItem = await addBundle.mutateAsync({
  parent: payload,
  children: normalizeBundleChildren(bundleChildren),
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
 const plan = buildBundleChildSavePlan({
 children: bundleChildren,
 parent,
 parentTsid,
 })

 for (const child of plan.updates) {
  await updateItem.mutateAsync({
  tsid: child.tsid,
  updates: child.updates,
  syncBundleParent: false,
  })
 }

 for (const child of plan.creates) {
  await addItem.mutateAsync(child)
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
  {mode === 'edit' && item ? (
  <ItemImageCarousel files={sortedImageFiles} />
  ) : null}
  <ItemDetailsForm
   categories={categories}
   conditionOptions={conditionOptions}
   form={form}
   hasProfitPreview={hasProfitPreview}
   markAsSold={markAsSold}
   platforms={platforms}
   profit={profit}
   roi={roi}
   sellPriceInputRef={sellPriceInputRef}
   showSellFields={showSellFields}
   updateField={updateField}
  />
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
  <BundleEditor
   categoryOptions={categories}
   childrenForms={bundleChildren}
   conditionOptions={conditionOptions}
   onAdd={addBundleChild}
   onRemove={removeBundleChild}
   onUpdate={updateBundleChild}
  />
  ) : null}

  {mode === 'edit' && item ? (
  <ExistingFilesSection
   coverImageId={coverImageId}
   itemId={item.tsid}
   onImageFilesChange={handleImageFilesChange}
   onSetCoverImage={setCoverImage}
  />
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

function ItemImageCarousel({ files }: { files: ItemFile[] }) {
 const [activeIndex, setActiveIndex] = useState(0)
 const [images, setImages] = useState<Array<{ alt: string; id: string; src: string }>>([])
 const [failed, setFailed] = useState(false)
 const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
 const hasMultipleImages = images.length > 1
 const activeImage = images[activeIndex]
 const lightboxImages: LightboxImage[] = images.map(({ alt, src }) => ({
 alt,
 src,
 }))

 useEffect(() => {
 let mounted = true

 async function loadImages() {
 setFailed(false)

 if (files.length === 0) {
  setImages([])
  setActiveIndex(0)
  return
 }

 try {
  const signedImages = await Promise.all(
  files.map(async (file) => ({
   alt: file.original_name || file.file_path.split('/').pop() || 'Item photo',
   id: file.id,
   src: await getSignedItemFileUrl(file.file_path),
  })),
  )

  if (mounted) {
  setImages(signedImages)
  setActiveIndex((currentIndex) =>
   Math.min(currentIndex, Math.max(0, signedImages.length - 1)),
  )
  }
 } catch {
  if (mounted) {
  setFailed(true)
  setImages([])
  setActiveIndex(0)
  }
 }
 }

 void loadImages()

 return () => {
 mounted = false
 }
 }, [files])

 function showPrevious() {
 setActiveIndex((currentIndex) =>
  currentIndex === 0 ? images.length - 1 : currentIndex - 1,
 )
 }

 function showNext() {
 setActiveIndex((currentIndex) =>
  currentIndex === images.length - 1 ? 0 : currentIndex + 1,
 )
 }

 if (files.length === 0 || failed || !activeImage) {
 return (
  <section className="grid h-[120px] place-items-center rounded-xl border border-dashed border-border-base bg-surface-2/50 text-center text-muted">
  <div>
   <ImageIcon className="mx-auto h-6 w-6" aria-hidden="true" />
   <p className="mt-2 text-sm font-medium">No photos yet</p>
  </div>
  </section>
 )
 }

 return (
 <>
 <section className="relative overflow-hidden rounded-xl bg-surface-2">
  <button
  type="button"
  className="block w-full cursor-zoom-in"
  onClick={() => setLightboxIndex(activeIndex)}
  aria-label={`Open ${activeImage.alt}`}
  >
  <img
  className="h-[180px] w-full object-cover sm:h-[240px]"
  src={activeImage.src}
  alt={activeImage.alt}
  />
  </button>
  {hasMultipleImages ? (
  <>
   <button
   type="button"
   className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-lg transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
   onClick={showPrevious}
   aria-label="Previous photo"
   >
   <ChevronLeft className="h-5 w-5" aria-hidden="true" />
   </button>
   <button
   type="button"
   className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-lg transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
   onClick={showNext}
   aria-label="Next photo"
   >
   <ChevronRight className="h-5 w-5" aria-hidden="true" />
   </button>
   <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
   {images.map((image, index) => (
    <button
    key={image.id}
    type="button"
    className={`h-2 rounded-full transition ${
     index === activeIndex ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
    }`}
    onClick={() => setActiveIndex(index)}
    aria-label={`Show photo ${index + 1}`}
    aria-pressed={index === activeIndex}
    />
   ))}
   </div>
  </>
  ) : null}
 </section>
 <ImageLightbox
  key={lightboxIndex ?? 'closed'}
  images={lightboxImages}
  initialIndex={lightboxIndex ?? 0}
  open={lightboxIndex !== null}
  onClose={() => setLightboxIndex(null)}
 />
 </>
 )
}

function sortImageFilesByCover(files: ItemFile[], coverImageId: string | null | undefined) {
 if (!coverImageId) {
 return files
 }

 const coverImage = files.find((file) => file.id === coverImageId)

 if (!coverImage) {
 return files
 }

 return [
 coverImage,
 ...files.filter((file) => file.id !== coverImageId),
 ]
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

function getErrorMessage(error: unknown, fallback: string) {
 return error instanceof Error ? error.message : fallback
}
