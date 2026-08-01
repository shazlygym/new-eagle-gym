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
      // Near-black and translucent rather than a lighter grey slab: the bar is
      // the edge of the page, not a panel sitting on top of it, and content
      // scrolling underneath should be visible through it.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-500/50
                 bg-ink-950/80 pb-safe-b backdrop-blur-xl"
    >
      {/* The bar spans the window so its background reaches both edges, but the
          tabs themselves stay on the same column as the content above them. */}
      <ul className="page-width flex">
        {TABS.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              // `end` on the root tab only — otherwise Home stays highlighted
              // on every nested route.
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex h-16 flex-col items-center justify-center gap-0.5 text-[10px]
                 transition-colors ${
                   isActive ? 'font-bold text-brand-500' : 'font-medium text-ink-300'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* A lime cap at the top edge of the active tab — the same
                      3px mark that opens every section heading, so "where you
                      are" and "what this section is" are told the same way. */}
                  <span
                    className={`absolute inset-x-0 top-0 mx-auto h-[3px] w-8 rounded-b-full
                                transition-opacity duration-200
                                ${isActive ? 'bg-brand-500 opacity-100' : 'opacity-0'}`}
                  />
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full
                                transition-colors duration-200
                                ${isActive ? 'bg-brand-500/15' : 'bg-transparent'}`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
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
