import { FolderPen, Merge, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import { itemsQueryKey, useItems } from '@/hooks/useItems'
import { apiFetch } from '@/lib/api'
import { buildCategoryStats } from '@/lib/analytics'
import { formatCurrency } from '@/lib/utils'

export function Categories() {
 const { user } = useAuth()
 const { isDemoMode, showDemoToast } = useDemoGuard()
 const queryClient = useQueryClient()
 const { data: items = [], isLoading } = useItems()
 const [search, setSearch] = useState('')
 const [renameSource, setRenameSource] = useState('')
 const [renameTarget, setRenameTarget] = useState('')
 const [mergeSource, setMergeSource] = useState('')
 const [mergeTarget, setMergeTarget] = useState('')
 const [isSaving, setIsSaving] = useState(false)
 const categoryStats = useMemo(() => buildCategoryStats(items), [items])
 const filteredStats = useMemo(() => {
 const normalizedSearch = search.trim().toLowerCase()

 if (!normalizedSearch) {
 return categoryStats
 }

 return categoryStats.filter((stat) =>
 stat.category.toLowerCase().includes(normalizedSearch),
 )
 }, [categoryStats, search])
 const categoryOptions = categoryStats.map((stat) => stat.category)

 async function refreshItems() {
 await queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
 }

 async function updateCategory(source: string, target: string) {
 if (!user?.id) {
 toast.error('You must be signed in to update categories')
 return
 }

 if (isDemoMode) {
 showDemoToast()
 return
 }

 const trimmedSource = source.trim()
 const trimmedTarget = target.trim()

 if (!trimmedSource || !trimmedTarget) {
 toast.error('Choose a source and enter a target category')
 return
 }

 if (trimmedSource === trimmedTarget) {
 toast.error('Source and target categories are the same')
 return
 }

 const confirmed = window.confirm(
 `Move all "${trimmedSource}" items to "${trimmedTarget}"?`,
 )

 if (!confirmed) {
 return
 }

 setIsSaving(true)

 try {
 await apiFetch('/categories', {
  method: 'PATCH',
  body: JSON.stringify({ source: trimmedSource, target: trimmedTarget }),
 })

 await refreshItems()
 toast.success('Category updated')
 setRenameSource('')
 setRenameTarget('')
 setMergeSource('')
 setMergeTarget('')
 } catch (error) {
 if (import.meta.env.DEV) {
  console.error(error)
 }
 toast.error('Unable to update category. Please try again.')
 } finally {
 setIsSaving(false)
 }
 }

 return (
 <section className="space-y-6">
 <div>
  <h1 className="text-4xl font-semibold tracking-tight">
  Categories
  </h1>
 </div>

 <div className="grid gap-4 xl:grid-cols-2">
  <ActionPanel
  icon={FolderPen}
  title="Rename Category"
  description="Rename every item currently using a category."
  >
  <CategorySelect
  label="Source category"
  options={categoryOptions}
  value={renameSource}
  onChange={setRenameSource}
  />
  <input
  className={inputClassName}
  value={renameTarget}
  onChange={(event) => setRenameTarget(event.target.value)}
  placeholder="New category name"
  />
  <button
  type="button"
  className={primaryButtonClassName}
  onClick={() => updateCategory(renameSource, renameTarget)}
  disabled={isSaving}
  >
  Rename
  </button>
  </ActionPanel>

  <ActionPanel
  icon={Merge}
  title="Merge Categories"
  description="Move every source category item into an existing target."
  >
  <CategorySelect
  label="Source category"
  options={categoryOptions}
  value={mergeSource}
  onChange={setMergeSource}
  />
  <CategorySelect
  label="Target category"
  options={categoryOptions.filter((category) => category !== mergeSource)}
  value={mergeTarget}
  onChange={setMergeTarget}
  />
  <button
  type="button"
  className={primaryButtonClassName}
  onClick={() => updateCategory(mergeSource, mergeTarget)}
  disabled={isSaving}
  >
  Merge
  </button>
  </ActionPanel>
 </div>

 <div className="rounded-lg bg-card p-4 shadow-sm">
  <label className="relative block max-w-md">
  <Search
  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
  aria-hidden="true"
  />
  <input
  className={`${inputClassName} pl-9`}
  value={search}
  onChange={(event) => setSearch(event.target.value)}
  placeholder="Search categories"
  />
  </label>

  <div className="mt-4 overflow-x-auto">
  <table className="w-full min-w-[820px] text-left text-sm">
  <thead className="border-b border-subtle text-xs uppercase text-muted ">
   <tr>
   <th className="px-3 py-3">Category</th>
   <th className="px-3 py-3">Items</th>
   <th className="px-3 py-3">Sold</th>
   <th className="px-3 py-3">Holding / Listed</th>
   <th className="px-3 py-3">Buy Value</th>
   <th className="px-3 py-3">Sell Value</th>
   <th className="px-3 py-3">Profit</th>
   </tr>
  </thead>
  <tbody className="divide-y divide-subtle">
   {isLoading ? (
   <tr>
   <td className="px-3 py-6 text-muted" colSpan={7}>
    Loading categories...
   </td>
   </tr>
   ) : filteredStats.length === 0 ? (
   <tr>
   <td className="px-3 py-6 text-muted" colSpan={7}>
    No categories found.
   </td>
   </tr>
   ) : (
   filteredStats.map((stat) => (
   <tr key={stat.category}>
    <td className="px-3 py-4 font-semibold text-base ">
    {stat.category}
    </td>
    <td className="px-3 py-4">{stat.itemCount}</td>
    <td className="px-3 py-4">{stat.soldCount}</td>
    <td className="px-3 py-4">{stat.activeCount}</td>
    <td className="px-3 py-4">
    {formatCurrency(stat.totalBuyValue)}
    </td>
    <td className="px-3 py-4">
    {formatCurrency(stat.totalSellValue)}
    </td>
    <td className="px-3 py-4 font-semibold">
    {formatCurrency(stat.totalProfit)}
    </td>
   </tr>
   ))
   )}
  </tbody>
  </table>
  </div>
 </div>
 </section>
 )
}

function ActionPanel({
 children,
 description,
 icon: Icon,
 title,
}: {
 children: React.ReactNode
 description: string
 icon: typeof FolderPen
 title: string
}) {
 return (
 <article className="rounded-lg bg-card p-5 shadow-sm">
 <div className="flex items-start gap-3">
  <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent bg-accent/15 ">
  <Icon className="h-5 w-5" aria-hidden="true" />
  </span>
  <div>
  <h3 className="font-semibold text-base ">{title}</h3>
  <p className="mt-1 text-sm text-muted ">
  {description}
  </p>
  </div>
 </div>
 <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">{children}</div>
 </article>
 )
}

function CategorySelect({
 label,
 onChange,
 options,
 value,
}: {
 label: string
 onChange: (value: string) => void
 options: string[]
 value: string
}) {
 return (
 <label>
 <span className="sr-only">{label}</span>
 <select
  className={selectClassName}
  value={value}
  onChange={(event) => onChange(event.target.value)}
 >
  <option value="">{label}</option>
  {options.map((option) => (
  <option key={option} value={option}>
  {option}
  </option>
  ))}
 </select>
 </label>
 )
}

const inputClassName =
 'h-11 w-full rounded-lg border border-border-base bg-card px-3 text-sm text-base outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10 '
const selectClassName = `${inputClassName} truncate pr-10`
const primaryButtonClassName =
 'h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70'
