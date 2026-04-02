import { Link, useLocation } from 'react-router-dom'
import {
  MessageCircle,
  Users,
  BookMarked,
  Cloud,
  Briefcase,
  LogOut,
  Settings,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsDropdown } from '@/features/notifications/components/NotificationsDropdown'
import { cn } from '@/lib/utils'

type ChatNavRailProps = {
  displayName?: string | null
  username?: string | null
  avatarUrl?: string | null
  onLogout?: () => void
  /** Chấm đỏ trên icon Danh bạ khi còn lời mời PENDING (kết bạn / sau này nhóm). */
  contactsPendingBadge?: boolean
  className?: string
}

export function ChatNavRail({
  displayName,
  username,
  avatarUrl,
  onLogout,
  contactsPendingBadge = false,
  className,
}: ChatNavRailProps) {
  const location = useLocation()
  const initial = (displayName ?? '?').slice(0, 1).toUpperCase()
  const chatActive = location.pathname.startsWith('/chat')
  const contactsActive = location.pathname.startsWith('/contacts')
  const newsfeedActive = location.pathname.startsWith('/newsfeed')
  const settingsActive = location.pathname.startsWith('/settings')

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex h-full min-h-0 w-[60px] shrink-0 flex-col items-center gap-2 py-3 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]',
          'bg-primary text-primary-foreground',
          className
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 ring-offset-primary focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Menu tài khoản"
            >
              <Avatar className="h-10 w-10 border border-white/20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-white/20 text-sm font-medium text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-primary bg-emerald-500"
                aria-hidden
                title="Trực tuyến"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="font-semibold text-foreground">{displayName ?? '—'}</div>
              {username ? (
                <div className="text-xs font-normal text-muted-foreground">@{username}</div>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Hồ sơ của bạn</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Cài đặt</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onLogout ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  onLogout()
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10 text-white hover:bg-white/15 hover:text-white',
                  chatActive && 'bg-white/20'
                )}
                asChild
              >
                <Link to="/chat" aria-label="Tin nhắn">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Tin nhắn
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-10 w-10 text-white hover:bg-white/15 hover:text-white',
                  contactsActive && 'bg-white/20'
                )}
                asChild
              >
                <Link to="/contacts/friends" className="relative" aria-label="Danh bạ">
                  {contactsPendingBadge ? (
                    <span
                      className="pointer-events-none absolute -left-0.5 -top-0.5 z-10 h-2 w-2 rounded-full bg-red-500 ring-2 ring-primary"
                      aria-hidden
                    />
                  ) : null}
                  <Users className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Danh bạ
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10 text-white hover:bg-white/15 hover:text-white',
                  newsfeedActive && 'bg-white/20'
                )}
                asChild
              >
                <Link to="/newsfeed" aria-label="Nhật ký">
                  <BookMarked className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Nhật ký
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                className="h-10 w-10 text-white hover:bg-white/15 hover:text-white"
                aria-label="Cloud (sắp có)"
              >
                <Cloud className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Cloud (sắp có)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                className="h-10 w-10 text-white hover:bg-white/15 hover:text-white"
                aria-label="Công việc (sắp có)"
              >
                <Briefcase className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Công việc (sắp có)
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-1 pb-1">
          <div className="flex w-full justify-center">
            <NotificationsDropdown variant="onPrimary" />
          </div>
          <div className="flex w-full justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-10 w-10 text-white hover:bg-white/15 hover:text-white',
                    settingsActive && 'bg-white/20'
                  )}
                  asChild
                >
                  <Link to="/settings/general" aria-label="Cài đặt">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Cài đặt
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
