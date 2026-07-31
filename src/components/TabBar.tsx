import { Apple, BarChart3, Home, Settings2, Zap } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'

const TABS: Array<{ to: string; icon: typeof Home; label: TranslationKey }> = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/train', icon: Zap, label: 'nav.train' },
  { to: '/nutrition', icon: Apple, label: 'nav.nutrition' },
  { to: '/progress', icon: BarChart3, label: 'nav.progress' },
  { to: '/settings', icon: Settings2, label: 'nav.settings' },
]

export default function TabBar() {
  const { t } = useT()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-500/60
                 bg-ink-800/95 pb-safe-b backdrop-blur-xl"
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
                `flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium
                 transition-colors ${isActive ? 'text-brand-500' : 'text-ink-200'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* iOS-style pill behind the active icon; the transition makes
                      switching tabs read as movement rather than a repaint. */}
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full
                                transition-colors duration-200
                                ${isActive ? 'bg-brand-500/15' : 'bg-transparent'}`}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
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
