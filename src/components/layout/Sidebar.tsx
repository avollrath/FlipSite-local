import {
 ArrowRightLeft,
 CalendarRange,
 ChevronLeft,
 ChevronRight,
 Gauge,
 LogOut,
 Package,
 Settings,
 Tags,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { toast } from 'sonner'
import flipsiteIconUrl from '@/assets/flipsite_icon.svg'
import { Logo } from '@/components/ui/Logo'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { localAssetUrl } from '@/lib/api'

interface SidebarProps {
 collapsed?: boolean
 onToggle?: () => void
}

const navItems = [
 { label: 'Items', href: '/items', icon: Package },
 { label: 'Dashboard', href: '/dashboard', icon: Gauge },
 { label: 'Activity Report', href: '/activity-report', icon: CalendarRange },
 { label: 'Categories', href: '/categories', icon: Tags },
 { label: 'Import / Export', href: '/import-export', icon: ArrowRightLeft },
 { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
 const { signOut, user } = useAuth()
 const { profile } = useProfile()
 const avatarUrl = getAvatarUrl(profile?.avatar_url, profile?.updated_at)
 const displayName = profile?.username ?? user?.email?.split('@')[0] ?? 'User'
 const fallbackInitial = (displayName || user?.email || 'U')[0].toUpperCase()

 async function handleSignOut() {
 try {
 await signOut()
 toast.success('Signed out')
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Sign out failed'
 toast.error(message)
 }
 }

 return (
 <aside className={`overflow-visible fixed z-10 inset-y-0 left-0 flex-col hidden bg-sidebar md:flex transition-all duration-200 ease-out ${collapsed ? 'w-16 p-3' : 'w-72 p-5'}`}>
 <button
  type="button"
  className="absolute -right-3 top-1/3 -translate-y-1/2 h-6 w-6 rounded-md bg-[hsl(var(--card-bg))] border border-subtle shadow-md flex items-center justify-center text-muted transition-all duration-200 ease-out hover:scale-110 hover:border-[hsl(var(--accent))] hover:text-sidebar-accent"
  onClick={onToggle}
  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
 </button>

 <NavLink
  to="/items"
  className={`flex items-center justify-center transition-all duration-200 ease-out ${collapsed ? 'px-0 py-3' : 'px-4 py-6'}`}
  aria-label="Go to items"
 >
  {!collapsed && <Logo size={38} />}
  {collapsed && (
   <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent/70 to-accent shadow-lg shadow-accent/20">
    <span
    aria-hidden="true"
    className="h-6 w-5 bg-white"
    style={{
     mask: `url(${flipsiteIconUrl}) center / contain no-repeat`,
     WebkitMask: `url(${flipsiteIconUrl}) center / contain no-repeat`,
    }}
    />
   </div>
  )}
 </NavLink>

 <nav className={`space-y-2 transition-all duration-200 ease-out ${collapsed ? 'mt-6' : 'mt-10'}`}>
  {navItems.map(({ label, href, icon: Icon }) => {
   const navItem = (
    <NavLink
    key={href}
    to={href}
    end={href === '/dashboard'}
    className={({ isActive }) =>
     `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
     isActive
     ? 'bg-accent/25 font-medium text-sidebar-accent [&>svg]:opacity-100'
     : 'font-medium text-sidebar-text/90 hover:bg-sidebar-accent/15 hover:text-sidebar-accent [&>svg]:opacity-70 hover:[&>svg]:opacity-100'
     } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
    }
    >
    <Icon className="flex-shrink-0 w-5 h-5 transition" aria-hidden="true" />
    {!collapsed && <span>{label}</span>}
    </NavLink>
   )

   if (collapsed) {
    return (
     <Tooltip key={href} content={label} side="right">
      {navItem}
     </Tooltip>
    )
   }

   return navItem
  })}
 </nav>

 <div className={`flex flex-col gap-2 mt-auto pt-4 pb-2 border-t border-subtle transition-all duration-200 ease-out ${collapsed ? 'items-center px-0' : 'items-center px-0'}`}>
  <div className={`flex items-center justify-center overflow-hidden rounded-full shrink-0 bg-sidebar-accent/20 ring-2 ring-sidebar-text/10 ${collapsed ? 'h-8 w-8' : 'h-14 w-14'}`}>
   {avatarUrl ? (
   <img
    src={avatarUrl}
    alt="avatar"
    className="object-cover w-full h-full"
   />
   ) : (
   <span className="text-lg font-semibold text-sidebar-accent">
    {fallbackInitial}
   </span>
   )}
  </div>
  
  {!collapsed && (
   <div className="flex w-full flex-col items-center gap-0.5 px-2">
    <p className="max-w-full text-sm font-semibold leading-tight text-center truncate text-sidebar-text">
    {displayName}
    </p>
    <p className="max-w-full truncate text-center text-[11px] leading-tight text-sidebar-text/50">
    {user?.email}
    </p>
   </div>
  )}

  <Tooltip content="Logout" side="right">
   <button
    type="button"
    className="flex items-center justify-center w-full p-2 transition-colors rounded-lg text-sidebar-text/60 hover:text-sidebar-text/90 hover:bg-sidebar-accent/10"
    onClick={handleSignOut}
    aria-label="Logout"
   >
    <LogOut className="w-5 h-5" />
   </button>
  </Tooltip>
 </div>
 </aside>
 )
}

function getAvatarUrl(avatarUrl: string | null | undefined, updatedAt: string | null | undefined) {
 if (!avatarUrl) {
 return ''
 }

 const url = localAssetUrl(avatarUrl)
 return updatedAt ? `${url}?t=${encodeURIComponent(updatedAt)}` : url
}
