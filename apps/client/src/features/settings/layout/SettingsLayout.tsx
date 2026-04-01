import { Outlet } from 'react-router-dom'
import { AppShellLayout } from '@/shared/layouts/AppShellLayout'
import { SettingsSubNav } from '../components/SettingsSubNav'

export function SettingsLayout() {
  return (
    <AppShellLayout>
      <div className="flex h-full min-h-0 flex-1 flex-row">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-white">
          <div className="border-b border-border px-3 py-3">
            <h1 className="text-lg font-semibold text-neutral-900">Cài đặt</h1>
          </div>
          <SettingsSubNav />
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </AppShellLayout>
  )
}
