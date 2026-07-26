import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'

export default function AppShell() {
  const { pathname } = useLocation()

  // React Router keeps the window scroll offset across navigations, so tapping
  // a tab after scrolling through History would land you halfway down the next
  // screen — and the large title would start already collapsed.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950">
      {/* pb-tabbar reserves room for the fixed bar plus the home indicator, so
          the last row of every list stays reachable. */}
      <main className="scroll-area flex-1 pb-tabbar">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
