import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useChangePassword, useMe, useSetPassword } from '@/features/auth/queries/auth.queries'

const pwd = z
  .string()
  .min(8)
  .regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password phải có ít nhất 1 chữ hoa và 1 số')

const changeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: pwd,
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Mật khẩu mới không khớp',
    path: ['confirmNewPassword'],
  })

const setSchema = z
  .object({
    newPassword: pwd,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  })

type ChangeForm = z.infer<typeof changeSchema>
type SetForm = z.infer<typeof setSchema>

function errMsg(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function SettingsPasswordPage() {
  const { user } = useAuth()
  const { isPending: meLoading } = useMe()
  const hasPassword = user?.hasPassword === true
  const changePw = useChangePassword()
  const setPw = useSetPassword()

  const changeForm = useForm<ChangeForm>({
    resolver: zodResolver(changeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const setForm = useForm<SetForm>({
    resolver: zodResolver(setSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  if (meLoading || user?.hasPassword === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h2 className="text-xl font-semibold text-neutral-900">Mật khẩu</h2>
      <p className="mt-1 text-sm text-muted-foreground">Đổi hoặc đặt mật khẩu đăng nhập bằng email.</p>

      <div className="mt-8">
        {hasPassword ? (
          <form
            onSubmit={changeForm.handleSubmit((data) =>
              changePw.mutate({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                confirmNewPassword: data.confirmNewPassword,
              })
            )}
            className="rounded-xl border border-border bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-medium text-neutral-900">Đổi mật khẩu</h3>
            {changePw.isError && changePw.error ? (
              <div className="error-alert mb-4">{errMsg(changePw.error)}</div>
            ) : null}
            {changePw.isSuccess ? (
              <p className="mb-4 text-sm text-green-700">Đã cập nhật mật khẩu.</p>
            ) : null}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-neutral-700">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  {...changeForm.register('currentPassword')}
                />
                {changeForm.formState.errors.currentPassword ? (
                  <p className="mt-1 text-sm text-red-600">
                    {changeForm.formState.errors.currentPassword.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Mật khẩu mới</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  {...changeForm.register('newPassword')}
                />
                {changeForm.formState.errors.newPassword ? (
                  <p className="mt-1 text-sm text-red-600">
                    {changeForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  {...changeForm.register('confirmNewPassword')}
                />
                {changeForm.formState.errors.confirmNewPassword ? (
                  <p className="mt-1 text-sm text-red-600">
                    {changeForm.formState.errors.confirmNewPassword.message}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={changePw.isPending}
                className="mt-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {changePw.isPending ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={setForm.handleSubmit((data) => setPw.mutate(data))}
            className="rounded-xl border border-border bg-white p-6 shadow-sm"
          >
            <h3 className="mb-2 text-lg font-medium text-neutral-900">Đặt mật khẩu</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Tài khoản đăng nhập qua Google/GitHub chưa có mật khẩu. Đặt mật khẩu để có thể đăng nhập
              bằng email và mật khẩu.
            </p>
            {setPw.isError && setPw.error ? (
              <div className="error-alert mb-4">{errMsg(setPw.error)}</div>
            ) : null}
            {setPw.isSuccess ? (
              <p className="mb-4 text-sm text-green-700">Đã đặt mật khẩu thành công.</p>
            ) : null}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-neutral-700">Mật khẩu mới</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  {...setForm.register('newPassword')}
                />
                {setForm.formState.errors.newPassword ? (
                  <p className="mt-1 text-sm text-red-600">
                    {setForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  {...setForm.register('confirmPassword')}
                />
                {setForm.formState.errors.confirmPassword ? (
                  <p className="mt-1 text-sm text-red-600">
                    {setForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={setPw.isPending}
                className="mt-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {setPw.isPending ? 'Đang lưu...' : 'Đặt mật khẩu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
