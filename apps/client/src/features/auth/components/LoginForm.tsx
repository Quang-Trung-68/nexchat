import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useLogin } from '../queries/auth.queries'
import type { LoginPayload } from '../types/auth.types'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function LoginForm() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (data: LoginPayload) => {
    login.mutate(data)
  }

  const serverError =
    login.isError && login.error ? getErrorMessage(login.error) : null

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-neutral-900">Đăng nhập</h1>

      {serverError ? <div className="error-alert">{serverError}</div> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={login.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {login.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <button
        type="button"
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        onClick={() => {
          window.location.href = '/api/auth/google'
        }}
      >
        Đăng nhập bằng Google
      </button>

      <p className="text-center text-sm text-neutral-600">
        <Link to="/forgot-password" className="text-indigo-600 hover:underline">
          Quên mật khẩu?
        </Link>
      </p>
      <p className="text-center text-sm text-neutral-600">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  )
}
