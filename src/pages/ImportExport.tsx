import { Download, FileDown, FileUp, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useDemoGuard } from '@/hooks/useDemoGuard'
import { itemsQueryKey, useItems } from '@/hooks/useItems'
import { downloadCsv, parseCsv, toCsv, type CsvRow } from '@/lib/csv'
import { toSupabaseTimestamp } from '@/lib/dateInput'
import { supabase } from '@/lib/supabase'
import { getBuyPlatform, getSellPlatform, parseMoneyInput } from '@/lib/utils'
import { normalizeItemCondition } from '@/lib/conditions'
import type { Item, ItemStatus } from '@/types'

type ImportPreviewRow = {
 errors: string[]
 row: CsvRow
}

const exportFields = [
 'name',
 'category',
 'condition',
 'buy_price',
 'sell_price',
 'buy_platform',
 'sell_platform',
 'status',
 'bought_at',
 'sold_at',
 'notes',
 'bundle_id',
 'is_bundle_parent',
] as const

const validStatuses: ItemStatus[] = ['holding', 'listed', 'sold', 'keeper']

export function ImportExport() {
 const { user } = useAuth()
 const { isDemoMode, showDemoToast } = useDemoGuard()
 const queryClient = useQueryClient()
 const { data: items = [] } = useItems()
 const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
 const [fileName, setFileName] = useState('')
 const [isImporting, setIsImporting] = useState(false)
 const hasErrors = previewRows.some((row) => row.errors.length > 0)
 const validRows = useMemo(
 () => previewRows.filter((row) => row.errors.length === 0),
 [previewRows],
 )

 function handleExport() {
 const rows = items.map((item) =>
 exportFields.reduce<Record<string, string | number | boolean | null>>(
  (record, field) => {
  record[field] =
    field === 'buy_platform'
      ? getBuyPlatform(item)
      : field === 'sell_platform'
        ? getSellPlatform(item)
        : item[field] ?? ''
  return record
  },
  {},
 ),
 )

 downloadCsv('flipsite-items.csv', toCsv(rows))
 }

 function handleTemplateDownload() {
 downloadCsv(
 'flipsite-import-template.csv',
 toCsv([
  {
  bought_at: '01/05/2026',
  bundle_id: '',
  buy_price: '10,00',
  category: 'Games',
  condition: 'Good',
  is_bundle_parent: false,
  name: 'Example item',
  notes: '',
  buy_platform: 'Seller name',
  sell_platform: '',
  sell_price: '',
  sold_at: '',
  status: 'holding',
  },
 ]),
 )
 }

 async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.target.files?.[0]

 if (!file) {
 return
 }

 if (isDemoMode) {
 showDemoToast()
 event.target.value = ''
 return
 }

 try {
 const text = await file.text()
 const rows = parseCsv(text)
 setFileName(file.name)
 setPreviewRows(rows.map((row) => ({ errors: validateRow(row), row })))
 } catch (error) {
 if (import.meta.env.DEV) {
  console.error(error)
 }
 toast.error('Unable to parse CSV. Please check the file and try again.')
 } finally {
 event.target.value = ''
 }
 }

 async function handleImport() {
 if (!user?.id) {
 toast.error('You must be signed in to import items')
 return
 }

 if (isDemoMode) {
 showDemoToast()
 return
 }

 if (hasErrors || validRows.length === 0) {
 toast.error('Fix validation errors before importing')
 return
 }

 setIsImporting(true)

 try {
 const rows = validRows.map(({ row }) => toInsertRow(row, user.id))
 const { error } = await supabase.from('items').insert(rows)

 if (error) {
  throw error
 }

 await queryClient.invalidateQueries({ queryKey: itemsQueryKey(user.id) })
 toast.success(`${rows.length} items imported`)
 setPreviewRows([])
 setFileName('')
 } catch (error) {
 if (import.meta.env.DEV) {
  console.error(error)
 }
 toast.error('Unable to import CSV. Please try again.')
 } finally {
 setIsImporting(false)
 }
 }

 return (
 <section className="space-y-6">
 <div>
  <h1 className="text-4xl font-semibold tracking-tight">
  Import & Export
  </h1>
 </div>

 <div className="grid gap-4 xl:grid-cols-2">
  <Panel
  icon={FileDown}
  title="Export CSV"
  description="Download every item in your account as a CSV backup."
  >
  <div className="flex flex-wrap gap-3">
  <button
   type="button"
   className={primaryButtonClassName}
   onClick={handleExport}
   disabled={items.length === 0}
  >
   <Download className="h-4 w-4" aria-hidden="true" />
   Export CSV
  </button>
  <button
   type="button"
   className={secondaryButtonClassName}
   onClick={handleTemplateDownload}
  >
   Download Template
  </button>
  </div>
  </Panel>

  <Panel
  icon={FileUp}
  title="Import CSV"
  description="Upload a CSV, review validation, then append new rows."
  >
  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-layout bg-card px-4 py-3 text-sm font-semibold text-base transition hover:bg-surface-2">
  <Upload className="h-4 w-4" aria-hidden="true" />
  Choose CSV
  <input
   className="sr-only"
   type="file"
   accept=".csv,text/csv"
   onChange={handleFileChange}
  />
  </label>
  {fileName ? (
  <p className="mt-3 text-sm text-muted ">
   Previewing {fileName}
  </p>
  ) : null}
  </Panel>
 </div>

 <div className="rounded-lg bg-card p-4 shadow-sm">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
  <h3 className="font-semibold text-base ">
   Import Preview
  </h3>
  <p className="mt-1 text-sm text-muted ">
   Required fields: name, category, condition, buy_price, buy_platform,
   status, bought_at.
  </p>
  </div>
  <button
  type="button"
  className={primaryButtonClassName}
  onClick={handleImport}
  disabled={isImporting || hasErrors || validRows.length === 0}
  >
  {isImporting ? 'Importing...' : 'Import Valid Rows'}
  </button>
  </div>

  {previewRows.length === 0 ? (
  <div className="mt-4 rounded-lg border border-dashed border-subtle bg-surface p-8 text-center text-sm text-muted bg-surface-2/60 ">
  Choose a CSV to see a preview before importing.
  </div>
  ) : (
  <div className="mt-4 overflow-x-auto">
  <table className="w-full min-w-[980px] text-left text-sm">
   <thead className="border-b border-subtle text-xs uppercase text-muted ">
   <tr>
   <th className="px-3 py-3">Row</th>
   <th className="px-3 py-3">Name</th>
   <th className="px-3 py-3">Category</th>
   <th className="px-3 py-3">Buy</th>
   <th className="px-3 py-3">Status</th>
   <th className="px-3 py-3">Bought</th>
   <th className="px-3 py-3">Validation</th>
   </tr>
   </thead>
   <tbody className="divide-y divide-subtle">
   {previewRows.map((preview, index) => (
   <tr key={`${preview.row.name}-${index}`}>
    <td className="px-3 py-4">{index + 1}</td>
    <td className="px-3 py-4">{preview.row.name}</td>
    <td className="px-3 py-4">{preview.row.category}</td>
    <td className="px-3 py-4">{preview.row.buy_price}</td>
    <td className="px-3 py-4">{preview.row.status}</td>
    <td className="px-3 py-4">{preview.row.bought_at}</td>
    <td className="px-3 py-4">
    {preview.errors.length === 0 ? (
    <span className="font-semibold text-positive ">
     Ready
    </span>
    ) : (
    <span className="text-negative ">
     {preview.errors.join(', ')}
    </span>
    )}
    </td>
   </tr>
   ))}
   </tbody>
  </table>
  </div>
  )}
 </div>
 </section>
 )
}

function validateRow(row: CsvRow) {
 const errors: string[] = []

 for (const field of [
 'name',
 'category',
 'condition',
 'buy_price',
 'status',
 'bought_at',
]) {
 if (!row[field]?.trim()) {
 errors.push(`${field} required`)
 }
 }

 if (!row.buy_platform?.trim() && !row.platform?.trim()) {
 errors.push('buy_platform required')
 }

 if (row.buy_price && parseMoneyInput(row.buy_price) === null) {
 errors.push('invalid buy_price')
 }

 if (row.sell_price && parseMoneyInput(row.sell_price) === null) {
 errors.push('invalid sell_price')
 }

 if (row.status && !validStatuses.includes(row.status as ItemStatus)) {
 errors.push('invalid status')
 }

 if (row.bought_at && !parseImportDate(row.bought_at)) {
 errors.push('invalid bought_at')
 }

 if (row.sold_at && !parseImportDate(row.sold_at)) {
 errors.push('invalid sold_at')
 }

 return errors
}

function toInsertRow(row: CsvRow, userId: string): Omit<Item, 'tsid' | 'created_at'> {
 const buyPlatform = row.buy_platform?.trim() || row.platform?.trim() || ''
 const sellPlatform = row.sell_platform?.trim() || ''

 return {
 bought_at: parseImportDate(row.bought_at) ?? new Date().toISOString(),
 bundle_id: row.bundle_id || null,
 buy_price: parseMoneyInput(row.buy_price) ?? 0,
 category: row.category.trim(),
 condition: normalizeItemCondition(row.condition),
 is_bundle_parent: parseBoolean(row.is_bundle_parent),
 name: row.name.trim(),
 notes: row.notes?.trim() || null,
 buy_platform: buyPlatform || null,
 sell_platform: sellPlatform || null,
 sell_price: row.sell_price ? parseMoneyInput(row.sell_price) : null,
 sold_at: row.sold_at ? parseImportDate(row.sold_at) : null,
 status: row.status as ItemStatus,
 user_id: userId,
 }
}

function parseImportDate(value: string) {
 const formDate = toSupabaseTimestamp(value)

 if (formDate) {
 return formDate
 }

 const parsedDate = new Date(value)

 return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function parseBoolean(value: string | undefined) {
 return ['1', 'true', 'yes'].includes((value ?? '').trim().toLowerCase())
}

function Panel({
 children,
 description,
 icon: Icon,
 title,
}: {
 children: React.ReactNode
 description: string
 icon: typeof FileDown
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
 <div className="mt-5">{children}</div>
 </article>
 )
}

const primaryButtonClassName =
 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70'
const secondaryButtonClassName =
 'inline-flex h-11 items-center justify-center rounded-lg border border-layout bg-card px-4 text-sm font-semibold text-base transition hover:bg-surface-2'
