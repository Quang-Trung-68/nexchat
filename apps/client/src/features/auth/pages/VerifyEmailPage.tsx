import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogout, useResendVerification, useVerifyEmail } from '../queries/auth.queries'

const schema = z.object({
  code: z.string().min(4, 'Nhập mã').max(12),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function VerifyEmailPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const verify = useVerifyEmail()
  const resend = useResendVerification()
  const logoutMutation = useLogout()
  const [cooldown, setCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-600">Loading...</div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (user?.emailVerifiedAt) {
    return <Navigate to="/chat" replace />
  }

  const onSubmit = (data: FormValues) => {
    verify.mutate(data.code.trim())
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const onResend = () => {
    if (cooldown > 0 || resend.isPending) return
    resend.mutate(undefined, {
      onSuccess: () => {
        setCooldown(60)
      },
    })
  }

  const serverError =
    verify.isError && verify.error ? getErrorMessage(verify.error) : null

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-neutral-900">Xác thực email</h1>
        <p className="text-sm text-neutral-600">
          Kiểm tra hộp thư và nhập mã xác thực để tiếp tục dùng ứng dụng.
        </p>

        {serverError ? <div className="error-alert">{serverError}</div> : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-sm font-medium text-neutral-700">
            Mã xác thực
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-primary"
            placeholder="6 chữ số"
            {...register('code')}
          />
          {errors.code ? <p className="text-sm text-red-600">{errors.code.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={verify.isPending}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {verify.isPending ? 'Đang xác thực...' : 'Xác thực'}
        </button>

        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
          <p className="text-center text-sm text-neutral-600">Không nhận được mã?</p>
          <button
            type="button"
            disabled={cooldown > 0 || resend.isPending}
            onClick={onResend}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : resend.isPending ? 'Đang gửi...' : 'Gửi lại mã'}
          </button>
        </div>

        <button
          type="button"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
          className="text-center text-sm text-primary hover:underline disabled:opacity-50"
        >
          Đăng xuất
        </button>
      </form>
    </div>
  )
}
