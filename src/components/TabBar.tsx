import { BarChart3, CalendarDays, Dumbbell, Home, Settings2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'

const TABS: Array<{ to: string; icon: typeof Home; label: TranslationKey }> = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/routines', icon: Dumbbell, label: 'nav.routines' },
  { to: '/history', icon: CalendarDays, label: 'nav.history' },
  { to: '/progress', icon: BarChart3, label: 'nav.progress' },
  { to: '/settings', icon: Settings2, label: 'nav.settings' },
]

export default function TabBar() {
  const { t } = useT()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-dark-500/60
                 bg-dark-800/95 pb-safe-b backdrop-blur-xl"
    >
      <ul className="flex">
        {TABS.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              // `end` on the root tab only — otherwise Home stays highlighted
              // on every nested route.
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium
                 transition-colors ${isActive ? 'text-gold-500' : 'text-dark-200'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{t(label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
