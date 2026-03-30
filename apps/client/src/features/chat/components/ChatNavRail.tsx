import {
  MessageCircle,
  Users,
  Cloud,
  Briefcase,
  Settings,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: MessageCircle, label: 'Tin nhắn', active: true },
  { icon: Users, label: 'Danh bạ', active: false },
  { icon: Cloud, label: 'Cloud', active: false },
  { icon: Briefcase, label: 'Công việc', active: false },
] as const

type ChatNavRailProps = {
  displayName?: string | null
  avatarUrl?: string | null
}

export function ChatNavRail({ displayName, avatarUrl }: ChatNavRailProps) {
  const initial = (displayName ?? '?').slice(0, 1).toUpperCase()

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex w-[52px] shrink-0 flex-col items-center gap-2 border-r border-white/10 py-3',
          'bg-sidebar text-sidebar-foreground'
        )}
      >
        <Avatar className="h-10 w-10 border border-white/20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-brand/30 text-sm font-medium text-white">{initial}</AvatarFallback>
        </Avatar>

        <div className="mt-2 flex flex-1 flex-col gap-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!active}
                  className={cn(
                    'text-sidebar-foreground hover:bg-white/10 hover:text-white',
                    active && 'bg-white/15'
                  )}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {active ? label : `${label} (sắp có)`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              className="mt-auto text-sidebar-foreground hover:bg-white/10"
              aria-label="Cài đặt"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Cài đặt (sắp có)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
