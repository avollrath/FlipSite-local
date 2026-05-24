import { Link2 } from 'lucide-react'
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton'
import {
 calculateItemSellValue,
 formatCurrency,
 getEffectiveItemStatus,
 getStatusLabel,
} from '@/lib/utils'
import type { ItemImageThumbnail } from '@/lib/itemFiles'
import type { Item } from '@/types'
import { getStatusBadgeClassName } from '@/components/items/itemDisplayUtils'

export function ItemGallery({
 allItems,
 items,
 layout,
 onEdit,
 thumbnailByItemId,
}: {
 allItems: Item[]
 items: Item[]
 layout: { cardSize: number; columns: number; width: number }
 onEdit: (item: Item) => void
 thumbnailByItemId: Map<string, ItemImageThumbnail>
}) {
 return (
 <div
  className="mt-6 grid justify-start gap-3"
  style={{
  gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardSize}px)`,
  width: layout.width,
  }}
 >
  {items.map((item, index) => (
  <GalleryCard
   key={item.tsid}
   allItems={allItems}
   cardSize={layout.cardSize}
   item={item}
   index={index}
   onEdit={() => onEdit(item)}
   thumbnail={thumbnailByItemId.get(item.tsid)}
  />
  ))}
 </div>
 )
}

function GalleryCard({
 allItems,
 cardSize,
 item,
 index,
 onEdit,
 thumbnail,
}: {
 allItems: Item[]
 cardSize: number
 item: Item
 index: number
 onEdit: () => void
 thumbnail: ItemImageThumbnail | undefined
}) {
 const effectiveStatus = getEffectiveItemStatus(item, allItems)
 const price =
 effectiveStatus === 'sold'
  ? calculateItemSellValue(item, allItems)
  : item.buy_price

 return (
 <button
  type="button"
  style={{
  animationDelay: `${Math.min(index * 40, 400)}ms`,
  width: cardSize,
  }}
  className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2/70 text-left opacity-0 shadow-sm transition hover:shadow-md animate-fadeIn"
  onClick={onEdit}
 >
  <ImageWithSkeleton
  src={thumbnail?.signed_url}
  alt={item.name}
  skeletonClassName="aspect-square w-full"
  className="transition-transform duration-500 ease-out group-hover:scale-105"
  />
  <div
  className="absolute inset-0 rounded-lg"
  style={{
   background:
   'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.20) 20%, rgba(0,0,0,0) 45%)',
  }}
  />
  {item.is_bundle_parent ? (
  <div className="absolute left-2 top-2">
   <span className="inline-flex h-6 items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 text-[10px] font-semibold text-white backdrop-blur-sm">
   <Link2 className="h-3 w-3" aria-hidden="true" />
   Bundle
   </span>
  </div>
  ) : item.bundle_id ? (
  <div className="absolute left-2 top-2">
   <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm">
   <Link2 className="h-3 w-3" aria-hidden="true" />
   </span>
  </div>
  ) : null}
  <div className="absolute right-2 top-2">
  <span
   className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold ${getStatusBadgeClassName(
   effectiveStatus,
   )}`}
  >
   {getStatusLabel(effectiveStatus)}
  </span>
  </div>
  <div className="absolute inset-x-0 bottom-0 p-3">
  <p className="text-sm font-semibold leading-tight text-white line-clamp-2 drop-shadow-sm">
   {item.name}
  </p>
  <p className="mt-0.5 text-xs font-medium text-white/80">
   {formatCurrency(price)}
  </p>
  </div>
 </button>
 )
}
