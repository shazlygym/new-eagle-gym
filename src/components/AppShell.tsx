import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'

export default function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-dark-900">
      {/* pb-tabbar reserves room for the fixed bar plus the home indicator, so
          the last row of every list stays reachable. */}
      <main className="scroll-area flex-1 pb-tabbar">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
