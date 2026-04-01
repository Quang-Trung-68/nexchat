import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useForgotPassword, useResetPassword } from '../queries/auth.queries'

const resetSchema = z
  .object({
    code: z.string().min(4).max(12),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password phải có ít nhất 1 chữ hoa và 1 số'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof resetSchema>

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const email = (params.get('email') ?? '').trim().toLowerCase()
  const reset = useResetPassword()
  const forgot = useForgotPassword()
  const [cooldown, setCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const onSubmit = (data: FormValues) => {
    if (!email) return
    reset.mutate({
      email,
      code: data.code.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword,
    })
  }

  const onResend = () => {
    if (!email || cooldown > 0 || forgot.isPending) return
    forgot.mutate(email, {
      onSuccess: () => setCooldown(60),
    })
  }

  const serverError = reset.isError && reset.error ? getErrorMessage(reset.error) : null

  if (!email) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-neutral-700">Thiếu email. Bắt đầu từ bước quên mật khẩu.</p>
        <Link to="/forgot-password" className="mt-4 inline-block text-primary hover:underline">
          Quên mật khẩu
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-neutral-900">Đặt lại mật khẩu</h1>
        <p className="text-sm text-neutral-600">
          Mã đã gửi tới <span className="font-medium">{email}</span>. Nhập mã và mật khẩu mới.
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
            {...register('code')}
          />
          {errors.code ? <p className="text-sm text-red-600">{errors.code.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Mật khẩu mới
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-primary"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-primary"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={reset.isPending}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {reset.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>

        <button
          type="button"
          disabled={cooldown > 0 || forgot.isPending}
          onClick={onResend}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
        >
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : forgot.isPending ? 'Đang gửi...' : 'Gửi lại mã'}
        </button>

        <p className="text-center text-sm text-neutral-600">
          <Link to="/login" className="text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}
