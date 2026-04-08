import { MessageCircle } from 'lucide-react'

export function ChatWelcome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-secondary-surface px-8 text-center animate-in fade-in duration-500">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="h-10 w-10" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">
        Chào mừng đến với <span className="text-primary">NexChat</span>
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Chọn một hội thoại bên trái để bắt đầu nhắn tin.
      </p>
    </div>
  )
}
