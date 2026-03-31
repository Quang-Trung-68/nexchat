import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Contact, Users, UserPlus, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFriendsAcceptedQuery } from '@/features/friends/hooks/useFriendsAcceptedQuery'
import { useFriendsPendingQuery } from '@/features/friends/hooks/useFriendsPendingQuery'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'

/** Sau này có API lời mời nhóm — đặt > 0 để hiện chấm đỏ. */
const GROUP_INVITES_PENDING = 0

function CountBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        'min-w-5 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums',
        active
          ? 'bg-white/90 text-[#0068ff] shadow-sm'
          : 'bg-[#e8ecf2] text-muted-foreground'
      )}
      aria-hidden
    >
      {n}
    </span>
  )
}

function RedDot() {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-red-500"
      aria-hidden
      title="Có mục chờ xử lý"
    />
  )
}

export function ContactsSubNav() {
  const { data: friendsData } = useFriendsAcceptedQuery(true)
  const { data: rooms } = useRoomsQuery()
  const { data: pending } = useFriendsPendingQuery(true)
  const incoming = pending?.incoming

  const friendCount = friendsData?.total ?? 0
  const groupCount = useMemo(
    () => (rooms ?? []).filter((r) => r.type === 'GROUP').length,
    [rooms]
  )
  const hasFriendRequestsPending = (incoming?.length ?? 0) > 0
  const hasGroupInvitesPending = GROUP_INVITES_PENDING > 0

  const links: {
    to: string
    label: string
    icon: typeof Contact
    trailing: 'countFriends' | 'countGroups' | 'dotRequests' | 'dotGroupInvites'
  }[] = [
      { to: '/contacts/friends', label: 'Danh sách bạn bè', icon: Contact, trailing: 'countFriends' },
      {
        to: '/contacts/groups',
        label: 'Danh sách nhóm và cộng đồng',
        icon: Users,
        trailing: 'countGroups',
      },
      { to: '/contacts/requests', label: 'Lời mời kết bạn', icon: UserPlus, trailing: 'dotRequests' },
      {
        to: '/contacts/group-invites',
        label: 'Lời mời vào nhóm và cộng đồng',
        icon: Mail,
        trailing: 'dotGroupInvites',
      },
    ]

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 py-2">
      {links.map(({ to, label, icon: Icon, trailing }) => (
        <NavLink key={to} to={to}>
          {({ isActive }) => (
            <span
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#e5f0ff] text-[#0068ff]'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 leading-snug">{label}</span>
              <span className="flex min-w-7 shrink-0 items-center justify-center">
                {trailing === 'countFriends' ? <CountBadge n={friendCount} active={isActive} /> : null}
                {trailing === 'countGroups' ? <CountBadge n={groupCount} active={isActive} /> : null}
                {trailing === 'dotRequests' && hasFriendRequestsPending ? <RedDot /> : null}
                {trailing === 'dotGroupInvites' && hasGroupInvitesPending ? <RedDot /> : null}
              </span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
