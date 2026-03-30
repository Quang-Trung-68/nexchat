import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useResetPassword } from '../queries/auth.queries'

const resetSchema = z
  .object({
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
  const token = params.get('token') ?? ''
  const reset = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = (data: FormValues) => {
    if (!token) return
    reset.mutate({
      token,
      password: data.password,
      confirmPassword: data.confirmPassword,
    })
  }

  const serverError = reset.isError && reset.error ? getErrorMessage(reset.error) : null

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-neutral-700">Thiếu token reset. Kiểm tra lại link trong email.</p>
        <Link to="/login" className="mt-4 inline-block text-indigo-600 hover:underline">
          Đăng nhập
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

        {serverError ? <div className="error-alert">{serverError}</div> : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Mật khẩu mới
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={reset.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {reset.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>

        <p className="text-center text-sm text-neutral-600">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}
