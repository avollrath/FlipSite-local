import {
 FileText,
 Image as ImageIcon,
 Loader2,
 Star,
 Trash2,
 Upload,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
 useEffect,
 useMemo,
 useRef,
 useState,
 type ChangeEvent,
 type ClipboardEvent,
} from 'react'
import { toast } from 'sonner'
import {
 ImageLightbox,
 type LightboxImage,
} from '@/components/ImageLightbox'
import { getImageFilesFromClipboard } from '@/lib/clipboardImages'
import {
 deleteItemFile,
 getItemFiles,
 getSignedItemFileUrl,
 uploadItemFile,
 type ItemFile,
} from '@/lib/itemFiles'

export function PendingFilesSection({
 disabled,
 error,
 files,
 isUploading,
 onFilesChange,
}: {
 disabled: boolean
 error: string
 files: File[]
 isUploading: boolean
 onFilesChange: (files: File[]) => void
}) {
 const fileInputRef = useRef<HTMLInputElement | null>(null)

 function addFiles(nextFiles: File[]) {
 if (nextFiles.length === 0) {
 return
 }

 onFilesChange([...files, ...nextFiles])
 }

 function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
 addFiles(Array.from(event.target.files ?? []))
 event.target.value = ''
 }

 function handlePaste(event: ClipboardEvent<HTMLElement>) {
 const pastedFiles = getImageFilesFromClipboard(event.nativeEvent)

 if (pastedFiles.length === 0) {
 return
 }

 event.preventDefault()
 addFiles(pastedFiles)
 }

 function removeFile(index: number) {
 onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
 }

 return (
 <section
 className="rounded-lg bg-surface-2/60 p-4 outline-none transition focus-within:ring-4 focus-within:ring-accent/10"
 onPaste={handlePaste}
 tabIndex={0}
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
  <h3 className="text-sm font-semibold text-base ">
  Files
  </h3>
  <p className="mt-1 text-sm text-muted ">
  Files will upload after the item is created.
  </p>
  <p className="mt-1 text-xs text-muted ">
  You can also paste screenshots or copied images here.
  </p>
  </div>
  <button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
  onClick={() => fileInputRef.current?.click()}
  disabled={disabled}
  >
  {isUploading ? (
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : (
  <Upload className="h-4 w-4" aria-hidden="true" />
  )}
  {isUploading ? 'Uploading...' : 'Upload'}
  </button>
 </div>

 <input
  ref={fileInputRef}
  className="sr-only"
  type="file"
  multiple
  onChange={handleFileChange}
 />

 {error ? (
  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent ">
  {error}
  </div>
 ) : null}

 <div className="mt-4 space-y-3">
  {files.length === 0 ? (
  <div className="rounded-lg bg-surface-2/40 px-3 py-6 text-center text-sm text-muted">
  No files selected yet.
  </div>
  ) : (
  files.map((file, index) => (
  <PendingItemFileRow
   key={`${file.name}-${file.lastModified}-${index}`}
   file={file}
   disabled={disabled}
   onRemove={() => removeFile(index)}
  />
  ))
  )}
 </div>
 </section>
 )
}

function PendingItemFileRow({
 disabled,
 file,
 onRemove,
}: {
 disabled: boolean
 file: File
 onRemove: () => void
}) {
 const isImage = file.type.startsWith('image/')

 return (
 <div className="flex items-center gap-3 rounded-lg border border-border-base bg-card p-3">
 <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted ">
  {isImage ? (
  <ImageIcon className="h-6 w-6" aria-hidden="true" />
  ) : (
  <FileText className="h-6 w-6" aria-hidden="true" />
  )}
 </div>
 <div className="min-w-0 flex-1">
  <p className="truncate text-sm font-medium text-base ">
  {file.name}
  </p>
  <p className="mt-1 truncate text-xs text-muted ">
  {isImage ? 'image' : file.type || 'file'} - {formatFileSize(file.size)}
  </p>
 </div>
 <button
  type="button"
  className="rounded-lg p-2 text-muted transition hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-60"
  onClick={onRemove}
  disabled={disabled}
  aria-label={`Remove ${file.name}`}
 >
  <Trash2 className="h-4 w-4" aria-hidden="true" />
 </button>
 </div>
 )
}

export function ExistingFilesSection({
 coverImageId,
 itemId,
 onImageFilesChange,
 onSetCoverImage,
}: {
 coverImageId?: string | null
 itemId: string
 onImageFilesChange?: (files: ItemFile[]) => void
 onSetCoverImage?: (fileId: string) => void
}) {
 const queryClient = useQueryClient()
 const fileInputRef = useRef<HTMLInputElement | null>(null)
 const [files, setFiles] = useState<ItemFile[]>([])
 const [error, setError] = useState('')
 const [isLoading, setIsLoading] = useState(true)
 const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([])
 const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
 const [isUploading, setIsUploading] = useState(false)
 const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
 const imageFiles = useMemo(
 () => files.filter((file) => file.file_type === 'image'),
 [files],
 )

 useEffect(() => {
 onImageFilesChange?.(imageFiles)
 }, [imageFiles, onImageFilesChange])

 useEffect(() => {
 let mounted = true

 async function loadFiles() {
 setIsLoading(true)
 setError('')

 try {
  const itemFiles = await getItemFiles(itemId)

  if (mounted) {
  setFiles(itemFiles)
  }
 } catch (loadError) {
  if (mounted) {
  setError(getErrorMessage(loadError, 'Unable to load item files'))
  }
 } finally {
  if (mounted) {
  setIsLoading(false)
  }
 }
 }

 void loadFiles()

 return () => {
 mounted = false
 }
 }, [itemId])

 async function refreshFiles() {
 const itemFiles = await getItemFiles(itemId)
 setFiles(itemFiles)
 }

 async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
 const selectedFiles = Array.from(event.target.files ?? [])

 if (selectedFiles.length === 0) {
 return
 }

 await uploadFiles(selectedFiles)
 event.target.value = ''
 }

 async function handlePaste(event: ClipboardEvent<HTMLElement>) {
 const pastedFiles = getImageFilesFromClipboard(event.nativeEvent)

 if (pastedFiles.length === 0) {
 return
 }

 event.preventDefault()
 await uploadFiles(pastedFiles)
 }

 async function uploadFiles(selectedFiles: File[]) {
 let uploadedAny = false

 setIsUploading(true)
 setError('')

 try {
 for (const selectedFile of selectedFiles) {
  await uploadItemFile(itemId, selectedFile)
  uploadedAny = true
 }

 await refreshFiles()
 void queryClient.invalidateQueries({ queryKey: ['item-image-thumbnails'] })
 toast.success(selectedFiles.length === 1 ? 'File uploaded' : 'Files uploaded')
 } catch (uploadError) {
 if (uploadedAny) {
  await refreshFiles()
  void queryClient.invalidateQueries({ queryKey: ['item-image-thumbnails'] })
 }

 setError(getErrorMessage(uploadError, 'Unable to upload files'))
 } finally {
 setIsUploading(false)
 }
 }

 async function handleDelete(file: ItemFile) {
 setDeletingFileId(file.id)
 setError('')

 try {
 await deleteItemFile(file.id, file.file_path)
 await refreshFiles()
 void queryClient.invalidateQueries({ queryKey: ['item-image-thumbnails'] })
 toast.success('File deleted')
 } catch (deleteError) {
 setError(getErrorMessage(deleteError, 'Unable to delete file'))
 } finally {
 setDeletingFileId(null)
 }
 }

 async function handleOpenLightbox(file: ItemFile) {
 const imageIndex = imageFiles.findIndex((imageFile) => imageFile.id === file.id)

 if (imageIndex === -1) {
 return
 }

 setSelectedImageIndex(imageIndex)
 setError('')

 try {
 const signedImages = await Promise.all(
  imageFiles.map(async (imageFile) => ({
  alt: imageFile.original_name || getFileNameFromPath(imageFile.file_path),
  src: await getSignedItemFileUrl(imageFile.file_path),
  })),
 )

 setLightboxImages(signedImages)
 } catch (lightboxError) {
 setSelectedImageIndex(null)
 setLightboxImages([])
 setError(getErrorMessage(lightboxError, 'Unable to open image preview'))
 }
 }

 function handleCloseLightbox() {
 setSelectedImageIndex(null)
 setLightboxImages([])
 }

 return (
 <>
 <section
  className="rounded-lg bg-surface-2/60 p-4 outline-none transition focus-within:ring-4 focus-within:ring-accent/10"
  onPaste={handlePaste}
  tabIndex={0}
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
  <h3 className="text-sm font-semibold text-base ">
  Files
  </h3>
  <p className="mt-1 text-sm text-muted ">
  Photos, receipts, and reference documents for this item.
  </p>
  <p className="mt-1 text-xs text-muted ">
  You can also paste screenshots or copied images here.
  </p>
  </div>
  <button
  type="button"
  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
  onClick={() => fileInputRef.current?.click()}
  disabled={isUploading}
  >
  {isUploading ? (
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : (
  <Upload className="h-4 w-4" aria-hidden="true" />
  )}
  {isUploading ? 'Uploading...' : 'Upload'}
  </button>
 </div>

 <input
  ref={fileInputRef}
  className="sr-only"
  type="file"
  multiple
  onChange={handleFileChange}
 />

 {error ? (
  <div className="mt-4 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2 text-sm text-negative border-negative/30 bg-negative/10 ">
  {error}
  </div>
 ) : null}

 <div className="mt-4 space-y-3">
  {isLoading ? (
  <div className="flex items-center gap-2 rounded-lg bg-surface-2/50 px-3 py-3 text-sm text-muted">
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  Loading files...
  </div>
  ) : files.length === 0 ? (
  <div className="rounded-lg bg-surface-2/40 px-3 py-6 text-center text-sm text-muted">
  No files uploaded yet.
  </div>
  ) : (
  files.map((file) => (
  <ItemFileRow
   key={file.id}
   canSetCover={imageFiles.length > 1}
   isCover={file.id === coverImageId}
   file={file}
   isDeleting={deletingFileId === file.id}
   onOpen={() => handleOpenLightbox(file)}
   onSetCover={() => onSetCoverImage?.(file.id)}
   onDelete={() => handleDelete(file)}
  />
  ))
  )}
 </div>
 </section>
 <ImageLightbox
  key={selectedImageIndex ?? 'closed'}
  images={lightboxImages}
  initialIndex={selectedImageIndex ?? 0}
  open={selectedImageIndex !== null}
  onClose={handleCloseLightbox}
 />
 </>
 )
}

function ItemFileRow({
 canSetCover,
 file,
 isCover,
 isDeleting,
 onDelete,
 onOpen,
 onSetCover,
}: {
 canSetCover: boolean
 file: ItemFile
 isCover: boolean
 isDeleting: boolean
 onDelete: () => void
 onOpen: () => void
 onSetCover: () => void
}) {
 const isImage = file.file_type === 'image'
 const displayName = file.original_name || getFileNameFromPath(file.file_path)

 return (
 <div className="flex items-center gap-3 rounded-lg border border-border-base bg-card p-3">
 {isImage ? (
  <button
  type="button"
  className="rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface focus:ring-offset-surface"
  onClick={onOpen}
  aria-label={`Open ${displayName}`}
  >
  <SignedImageThumbnail filePath={file.file_path} alt={displayName} />
  </button>
 ) : (
  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted ">
  <FileText className="h-6 w-6" aria-hidden="true" />
  </div>
 )}
 <div className="min-w-0 flex-1">
  <p className="truncate text-sm font-medium text-base ">
  {displayName}
  </p>
  <p className="mt-1 truncate text-xs text-muted ">
  {isImage ? 'image' : file.mime_type || file.file_type}
  {file.size_bytes ? ` - ${formatFileSize(file.size_bytes)}` : ''}
  </p>
 </div>
 {isImage && canSetCover ? (
 <button
  type="button"
  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
  isCover
   ? 'border-accent/40 bg-accent/10 text-accent'
   : 'border-border-base text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent'
  }`}
  onClick={onSetCover}
  aria-pressed={isCover}
  aria-label={`Set ${displayName} as cover image`}
 >
  <Star
  className={`h-3.5 w-3.5 ${isCover ? 'fill-current' : ''}`}
  aria-hidden="true"
  />
  {isCover ? 'Cover' : 'Set cover'}
 </button>
 ) : null}
 <button
  type="button"
  className="rounded-lg p-2 text-muted transition hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-60"
  onClick={onDelete}
  disabled={isDeleting}
  aria-label={`Delete ${displayName}`}
 >
  {isDeleting ? (
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : (
  <Trash2 className="h-4 w-4" aria-hidden="true" />
  )}
 </button>
 </div>
 )
}

function SignedImageThumbnail({
 alt,
 filePath,
}: {
 alt: string
 filePath: string
}) {
 const [signedUrl, setSignedUrl] = useState('')
 const [failed, setFailed] = useState(false)

 useEffect(() => {
 let mounted = true

 async function loadSignedUrl() {
 setFailed(false)
 setSignedUrl('')

 try {
  const url = await getSignedItemFileUrl(filePath)

  if (mounted) {
  setSignedUrl(url)
  }
 } catch {
  if (mounted) {
  setFailed(true)
  }
 }
 }

 void loadSignedUrl()

 return () => {
 mounted = false
 }
 }, [filePath])

 if (failed || !signedUrl) {
 return (
 <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted ">
  <ImageIcon className="h-6 w-6" aria-hidden="true" />
 </div>
 )
 }

 return (
 <img
 className="h-14 w-14 shrink-0 rounded-lg object-cover"
 src={signedUrl}
 alt={alt}
 />
 )
}

function getErrorMessage(error: unknown, fallback: string) {
 return error instanceof Error ? error.message : fallback
}

function getFileNameFromPath(filePath: string) {
 return filePath.split('/').pop() || 'File'
}

function formatFileSize(sizeBytes: number) {
 if (sizeBytes < 1024 * 1024) {
 return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
 }

 return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}
