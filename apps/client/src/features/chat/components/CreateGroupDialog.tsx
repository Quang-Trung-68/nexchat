import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { useUsersQuery } from '@/features/users/queries/users.queries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserPlus } from 'lucide-react'

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: users, isLoading } = useUsersQuery()

  const mutation = useMutation({
    mutationFn: async () => {
      const participantIds = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([id]) => id)
      if (participantIds.length === 0) {
        throw new Error('Chọn ít nhất một thành viên')
      }
      const { data } = await api.post<{ success: boolean; data: { id: string } }>('/rooms', {
        name: name.trim(),
        participantIds,
      })
      return data.data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
      setOpen(false)
      setName('')
      setSelected({})
      setErr(null)
      navigate(`/chat/${data.id}`)
    },
    onError: (e: unknown) => {
      setErr(e instanceof Error ? e.message : 'Không tạo được nhóm')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Tạo nhóm"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo nhóm</DialogTitle>
          <DialogDescription>Đặt tên nhóm và chọn thành viên từ danh sách.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Tên nhóm</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Team dự án"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label>Thành viên</Label>
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="space-y-2 p-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải…</p>
                ) : (
                  users?.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={Boolean(selected[u.id])}
                        onCheckedChange={(checked) =>
                          setSelected((s) => ({ ...s, [u.id]: Boolean(checked) }))
                        }
                      />
                      <span className="text-sm">
                        <span className="font-medium">{u.displayName}</span>
                        <span className="ml-2 text-muted-foreground">@{u.username}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Đang tạo…' : 'Tạo nhóm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
