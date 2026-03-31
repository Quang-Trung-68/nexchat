import { Mail } from 'lucide-react'

/** Placeholder — lời mời vào nhóm chưa có API. */
export function ContactsGroupInvitesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
        <Mail className="h-5 w-5 text-[#0068ff]" aria-hidden />
        <h1 className="text-base font-semibold">Lời mời vào nhóm và cộng đồng</h1>
      </header>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Tính năng sắp có.</p>
      </div>
    </div>
  )
}
