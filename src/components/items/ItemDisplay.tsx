import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton'
import { getStatusLabel } from '@/lib/utils'
import type { ItemImageThumbnail } from '@/lib/itemFiles'
import type { ItemStatus } from '@/types'
import {
 getStatusBadgeClassName,
 metricTextClassName,
} from '@/components/items/itemDisplayUtils'

export function ItemThumbnail({
 name,
 thumbnail,
}: {
 name: string
 thumbnail: ItemImageThumbnail | undefined
}) {
 return (
 <ImageWithSkeleton
  src={thumbnail?.signed_url}
  alt={name}
  skeletonClassName="h-10 w-10 shrink-0 rounded-md flex-shrink-0"
  className="rounded-md"
 />
 )
}

export function BundleBadge({ count }: { count: number }) {
 return (
 <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent bg-accent/15 ">
  Bundle ({count})
 </span>
 )
}

export function MobileMetric({
 label,
 tone,
 value,
}: {
 label: string
 tone?: number | null
 value: string
}) {
 return (
 <div>
  <p className="text-xs text-muted ">{label}</p>
  <p
  className={
   tone === undefined ? 'font-medium' : metricTextClassName(tone)
  }
  >
  {value}
  </p>
 </div>
 )
}

export function StatusBadge({ status }: { status: ItemStatus }) {
 return (
 <span
  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(
  status,
  )}`}
 >
  {getStatusLabel(status)}
 </span>
 )
}
