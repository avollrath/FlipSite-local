import {
 ArrowRightLeft,
 CalendarRange,
 Gauge,
 Package,
 Settings,
 Tags,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
 { label: 'Items', href: '/items', icon: Package },
 { label: 'Dashboard', href: '/dashboard', icon: Gauge },
 { label: 'Activity', href: '/activity-report', icon: CalendarRange },
 { label: 'Categories', href: '/categories', icon: Tags },
 { label: 'Import', href: '/import-export', icon: ArrowRightLeft },
 { label: 'Settings', href: '/settings', icon: Settings },
]

export function MobileNav() {
 return (
 <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-subtle bg-card/95 px-4 py-2 shadow-2xl backdrop-blur md:hidden">
 <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
  {navItems.map(({ label, href, icon: Icon }) => (
  <NavLink
  key={href}
  to={href}
  end={href === '/items' || href === '/dashboard'}
  className={({ isActive }) =>
   `flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
   isActive
   ? 'bg-accent text-accent-fg'
   : 'text-muted hover:bg-surface-2 hover:text-base'
   }`
  }
  >
  <Icon className="h-5 w-5" aria-hidden="true" />
  {label}
  </NavLink>
  ))}
 </div>
 </nav>
 )
}
