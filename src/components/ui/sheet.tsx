import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
 forwardRef,
 type ComponentPropsWithoutRef,
 type ElementRef,
} from 'react'

function cn(...classes: Array<string | false | null | undefined>) {
 return classes.filter(Boolean).join(' ')
}

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = forwardRef<
 ElementRef<typeof SheetPrimitive.Overlay>,
 ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Overlay
 className={cn(
 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
 className,
 )}
 {...props}
 ref={ref}
 />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const SheetContent = forwardRef<
 ElementRef<typeof SheetPrimitive.Content>,
 ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
>(({ className, children, ...props }, ref) => (
 <SheetPortal>
 <SheetOverlay />
 <SheetPrimitive.Content
 ref={ref}
 className={cn(
  'fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl outline-none transition duration-200 ease-out data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 sm:left-1/2 sm:top-1/2 sm:inset-auto sm:h-auto sm:max-h-[90vh] sm:w-[min(800px,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-subtle',
  className,
 )}
 {...props}
 >
 {children}
 <SheetPrimitive.Close className="absolute right-4 top-4 rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-base focus:outline-none focus:ring-2 focus:ring-accent">
  <X className="h-5 w-5" aria-hidden="true" />
  <span className="sr-only">Close</span>
 </SheetPrimitive.Close>
 </SheetPrimitive.Content>
 </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
 className,
 ...props
}: ComponentPropsWithoutRef<'div'>) => (
 <div
 className={cn(
 'space-y-1.5 border-b border-subtle p-6 pr-14 ',
 className,
 )}
 {...props}
 />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({
 className,
 ...props
}: ComponentPropsWithoutRef<'div'>) => (
 <div
 className={cn(
 'mt-auto flex flex-col-reverse gap-3 border-t border-subtle p-6 sm:flex-row sm:justify-end',
 className,
 )}
 {...props}
 />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = forwardRef<
 ElementRef<typeof SheetPrimitive.Title>,
 ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Title
 ref={ref}
 className={cn(
 'text-2xl font-semibold tracking-tight text-base ',
 className,
 )}
 {...props}
 />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = forwardRef<
 ElementRef<typeof SheetPrimitive.Description>,
 ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Description
 ref={ref}
 className={cn('text-sm text-muted ', className)}
 {...props}
 />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
 Sheet,
 SheetClose,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
}
