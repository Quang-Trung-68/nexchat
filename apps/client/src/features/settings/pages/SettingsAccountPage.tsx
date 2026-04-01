import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMe, useUpdateProfile, useUploadAvatar } from '@/features/auth/queries/auth.queries'
import type { PatchProfilePayload } from '@/features/auth/services/auth.service'
import { fetchUploadConfig } from '@/features/config/uploadConfig.api'
import { compressImageIfNeeded } from '@/lib/imageCompress'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const accountSchema = z.object({
  displayName: z.string().min(1).max(50),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, 'Username chỉ được chứa chữ thường, số, gạch dưới'),
  phone: z
    .string()
    .trim()
    .refine((s) => s === '' || /^[0-9]{8,15}$/.test(s), {
      message: 'Số điện thoại gồm 8–15 chữ số hoặc để trống',
    }),
  bio: z.string().max(500),
})

type AccountForm = z.infer<typeof accountSchema>

function errMsg(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function SettingsAccountPage() {
  const { user } = useAuth()
  const { isPending: meLoading } = useMe()
  const update = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const uploadCfgRef = useRef<Awaited<ReturnType<typeof fetchUploadConfig>> | null>(null)

  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      displayName: '',
      username: '',
      phone: '',
      bio: '',
    },
  })

  useEffect(() => {
    void fetchUploadConfig().then((c) => {
      uploadCfgRef.current = c
    })
  }, [])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  useEffect(() => {
    if (!user) return
    form.reset({
      displayName: user.displayName,
      username: user.username,
      phone: user.phone ?? '',
      bio: user.bio ?? '',
    })
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setRemoveAvatar(false)
  }, [user, form])

  const clearLocalAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !f.type.startsWith('image/')) return
    const cfg = uploadCfgRef.current
    if (cfg && f.size > cfg.maxImageBytesPerFile) return
    setRemoveAvatar(false)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setAvatarFile(f)
  }

  const saving = update.isPending || uploadAvatar.isPending

  const onSubmit = async (data: AccountForm) => {
    if (!user) return
    const cfg = uploadCfgRef.current ?? (await fetchUploadConfig())
    uploadCfgRef.current = cfg

    try {
      const hadNewAvatarFile = !!avatarFile
      if (avatarFile) {
        const file = await compressImageIfNeeded(avatarFile, cfg.maxImageDimensionPx)
        await uploadAvatar.mutateAsync(file)
        clearLocalAvatar()
      }

      const payload: PatchProfilePayload = {
        displayName: data.displayName,
        username: data.username,
        phone: data.phone === '' ? '' : data.phone,
        bio: data.bio,
      }
      if (removeAvatar && !hadNewAvatarFile) {
        payload.avatarUrl = ''
      }

      await update.mutateAsync(payload)
      form.reset(data)
      setRemoveAvatar(false)
    } catch {
      /* mutation error surface qua isError */
    }
  }

  const initial = (user?.displayName ?? '?').slice(0, 1).toUpperCase()
  const displayAvatarSrc =
    removeAvatar && !avatarFile ? null : (avatarPreview ?? user?.avatarUrl ?? null)

  const lastError = uploadAvatar.error ?? update.error

  if (meLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h2 className="text-xl font-semibold text-neutral-900">Tài khoản</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cập nhật thông tin hiển thị và liên hệ.</p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm"
      >
        {lastError ? <div className="error-alert">{errMsg(lastError)}</div> : null}
        {update.isSuccess && !update.isPending && !uploadAvatar.isPending ? (
          <p className="text-sm text-green-700">Đã lưu thông tin.</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24 shrink-0 border border-border">
            {displayAvatarSrc ? <AvatarImage src={displayAvatarSrc} alt="" /> : null}
            <AvatarFallback className="text-xl">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickAvatar}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Chọn ảnh
            </Button>
            {avatarFile ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearLocalAvatar}>
                Bỏ ảnh đã chọn
              </Button>
            ) : null}
            {user.avatarUrl && !avatarFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setRemoveAvatar(true)
                  clearLocalAvatar()
                }}
              >
                Xóa ảnh đại diện
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ảnh chỉ được tải lên khi bạn nhấn &quot;Lưu thông tin&quot; (lưu trên Cloudinary và hồ sơ).
        </p>

        <div>
          <label className="text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            disabled
            readOnly
            value={user.email}
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">Email không đổi tại đây.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Tên hiển thị</label>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            {...form.register('displayName')}
          />
          {form.formState.errors.displayName ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.displayName.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Username</label>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            {...form.register('username')}
          />
          {form.formState.errors.username ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.username.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Số điện thoại</label>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="Chỉ số, 8–15 ký tự"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            {...form.register('phone')}
          />
          {form.formState.errors.phone ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.phone.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Giới thiệu</label>
          <textarea
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
            {...form.register('bio')}
          />
          {form.formState.errors.bio ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.bio.message}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </Button>
      </form>
    </div>
  )
}
