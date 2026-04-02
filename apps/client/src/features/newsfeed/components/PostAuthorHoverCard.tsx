import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { PostAuthorDto } from '@/features/newsfeed/api/posts.api'

type PostAuthorHoverCardProps = {
  author: PostAuthorDto
  children: ReactNode
}

export function PostAuthorHoverCard({ author, children }: PostAuthorHoverCardProps) {
  const initial = author.displayName.slice(0, 1).toUpperCase()
  const bio = author.bio?.trim()

  return (
    <HoverCard openDelay={180} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden border-0 p-0 shadow-xl"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0068ff]/[0.12] via-background to-muted/30 px-4 pb-4 pt-4">
          <div
            className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-[#0068ff]/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex gap-3">
            <Avatar className="h-14 w-14 shrink-0 border-2 border-white/90 shadow-md ring-2 ring-[#0068ff]/15">
              {author.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-lg font-semibold">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate font-semibold leading-tight text-foreground">{author.displayName}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">@{author.username}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 bg-card px-4 py-3">
          <p className="text-[13px] leading-relaxed text-foreground/90">
            {bio ? (
              <span className="line-clamp-5 whitespace-pre-wrap">{bio}</span>
            ) : (
              <span className="italic text-muted-foreground">Chưa có giới thiệu.</span>
            )}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
