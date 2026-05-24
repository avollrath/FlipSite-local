import {
 useEffect,
 useRef,
 useState,
 type KeyboardEvent,
 type ReactNode,
} from 'react'

export const itemInputClassName =
 'w-full rounded-lg border border-border-base bg-card px-3 py-2.5 text-sm text-base outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10 '

export function Field({
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

export function SuggestionCombobox({
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
  className={itemInputClassName}
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

function optionMatches(option: string, query: string) {
 const normalizedOption = option.toLowerCase()
 const normalizedQuery = query.trim().toLowerCase()

 if (!normalizedQuery) {
 return true
 }

 return normalizedOption.includes(normalizedQuery)
}
