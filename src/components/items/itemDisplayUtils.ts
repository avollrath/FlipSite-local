import type { ItemStatus } from '@/types'

export function getStatusBadgeClassName(status: ItemStatus) {
 return {
 holding:
  'border border-blue-500/40 bg-blue-500/80 text-white dark:border-blue-400/40 dark:bg-blue-400/80 dark:text-slate-950',
 listed:
  'border border-amber-500/40 bg-amber-500/80 text-slate-950 dark:border-amber-400/40 dark:bg-amber-400/80',
 sold:
  'border border-positive/40 bg-positive/80 text-accent-fg',
 keeper:
  'border border-purple-500/40 bg-purple-500/80 text-white dark:border-purple-400/40 dark:bg-purple-400/80 dark:text-slate-950',
 }[status]
}

export function metricCellClassName(value: number | null) {
 return `px-4 py-4 font-semibold ${metricTextClassName(value)}`
}

export function metricTextClassName(value: number | null) {
 if (value === null || value === 0) {
 return 'font-semibold text-muted '
 }

 return value > 0
 ? 'font-semibold text-positive '
 : 'font-semibold text-negative '
}
