import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type LightboxImage = {
 alt: string
 src: string
}

type ImageLightboxProps = {
 images: LightboxImage[]
 initialIndex: number
 open: boolean
 onClose: () => void
}

export function ImageLightbox({
 images,
 initialIndex,
 onClose,
 open,
}: ImageLightboxProps) {
 const [activeIndex, setActiveIndex] = useState(initialIndex)
 const hasImages = images.length > 0

 useEffect(() => {
 if (!open) {
 return
 }

 const previousOverflow = document.body.style.overflow
 document.body.style.overflow = 'hidden'

 return () => {
 document.body.style.overflow = previousOverflow
 }
 }, [open])

 useEffect(() => {
 if (!open) {
 return
 }

 function handleKeyDown(event: KeyboardEvent) {
 if (event.key === 'Escape') {
  onClose()
 }

 if (event.key === 'ArrowLeft' && images.length > 0) {
  setActiveIndex((currentIndex) => getPreviousIndex(currentIndex, images.length))
 }

 if (event.key === 'ArrowRight' && images.length > 0) {
  setActiveIndex((currentIndex) => getNextIndex(currentIndex, images.length))
 }
 }

 window.addEventListener('keydown', handleKeyDown)

 return () => {
 window.removeEventListener('keydown', handleKeyDown)
 }
 }, [images.length, onClose, open])

 if (!open) {
 return null
 }

 const clampedActiveIndex = Math.min(
 Math.max(activeIndex, 0),
 Math.max(images.length - 1, 0),
 )
 const activeImage = hasImages ? images[clampedActiveIndex] : null

 return createPortal(
 <div
 className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 text-accent-fg sm:p-6"
 role="dialog"
 aria-modal="true"
 aria-label="Image carousel"
 >
 <button
  type="button"
  className="pointer-events-auto absolute inset-0 cursor-default"
  onClick={onClose}
  aria-label="Close image carousel"
 />
 <button
  type="button"
  className="pointer-events-auto absolute right-4 top-4 z-20 rounded-lg bg-card/10 p-2 text-accent-fg transition hover:bg-card/20 focus:outline-none focus:ring-2 focus:ring-accent-fg/60"
  onClick={(event) => {
  event.stopPropagation()
  onClose()
  }}
  aria-label="Close image carousel"
 >
  <X className="h-6 w-6" aria-hidden="true" />
 </button>

 <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-card/10 px-3 py-1 text-sm font-medium text-accent-fg/90">
  {hasImages ? `${clampedActiveIndex + 1} / ${images.length}` : 'Loading...'}
 </div>

 {images.length > 1 ? (
  <>
  <button
  type="button"
  className="pointer-events-auto absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/10 text-accent-fg transition hover:bg-card/20 focus:outline-none focus:ring-2 focus:ring-accent-fg/60 sm:left-6"
  onClick={(event) => {
   event.stopPropagation()
   setActiveIndex((currentIndex) => getPreviousIndex(currentIndex, images.length))
  }}
  aria-label="Previous image"
  >
  <ChevronLeft className="h-7 w-7" aria-hidden="true" />
  </button>
  <button
  type="button"
  className="pointer-events-auto absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/10 text-accent-fg transition hover:bg-card/20 focus:outline-none focus:ring-2 focus:ring-accent-fg/60 sm:right-6"
  onClick={(event) => {
   event.stopPropagation()
   setActiveIndex((currentIndex) => getNextIndex(currentIndex, images.length))
  }}
  aria-label="Next image"
  >
  <ChevronRight className="h-7 w-7" aria-hidden="true" />
  </button>
  </>
 ) : null}

 <div
  className="pointer-events-auto z-10 flex h-full max-h-[88vh] w-full max-w-6xl items-center justify-center"
  onClick={(event) => event.stopPropagation()}
 >
  {activeImage ? (
  <img
  className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
  src={activeImage.src}
  alt={activeImage.alt}
  />
  ) : (
  <div className="rounded-lg bg-card/10 px-4 py-3 text-sm text-accent-fg/80">
  Loading image...
  </div>
  )}
 </div>
 </div>,
 document.body,
 )
}

function getPreviousIndex(currentIndex: number, imageCount: number) {
 if (imageCount <= 0) {
 return 0
 }

 return (currentIndex - 1 + imageCount) % imageCount
}

function getNextIndex(currentIndex: number, imageCount: number) {
 if (imageCount <= 0) {
 return 0
 }

 return (currentIndex + 1) % imageCount
}
