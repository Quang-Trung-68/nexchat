import { MessageCircle } from 'lucide-react'

export function ChatWelcome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-muted/20 px-8 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="h-12 w-12" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        Chào mừng đến với <span className="text-primary">Chat App</span>
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Chọn một hội thoại ở cột bên trái để bắt đầu nhắn tin. Tin nhắn và trạng thái đọc được đồng bộ
        theo thời gian thực.
      </p>
      <div className="mt-8 flex gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
      </div>
    </div>
  )
}
