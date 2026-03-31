import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useRegister } from '../queries/auth.queries'

const registerSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/, 'Username chỉ được chứa chữ thường, số, gạch dưới'),
    displayName: z.string().min(1).max(50),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[0-9]{8,15}$/.test(v), 'Số điện thoại chỉ gồm 8–15 chữ số')
      .transform((v) => (v === '' ? undefined : v)),
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

type RegisterFormInput = z.input<typeof registerSchema>
type RegisterFormOutput = z.infer<typeof registerSchema>

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function RegisterForm() {
  const registerMutation = useRegister()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      displayName: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = (data: RegisterFormOutput) => {
    registerMutation.mutate(data)
  }

  const serverError =
    registerMutation.isError && registerMutation.error
      ? getErrorMessage(registerMutation.error)
      : null

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-neutral-900">Đăng ký</h1>

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
        {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-neutral-700">
          Username
        </label>
        <input
          id="username"
          autoComplete="username"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          {...register('username')}
        />
        {errors.username ? (
          <p className="text-sm text-red-600">{errors.username.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-neutral-700">
          Tên hiển thị
        </label>
        <input
          id="displayName"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          {...register('displayName')}
        />
        {errors.displayName ? (
          <p className="text-sm text-red-600">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-neutral-700">
          Số điện thoại <span className="font-normal text-neutral-500">(tùy chọn)</span>
        </label>
        <input
          id="phone"
          inputMode="numeric"
          autoComplete="tel"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Chỉ số, 8–15 ký tự — dùng khi thêm bạn"
          {...register('phone')}
        />
        {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Mật khẩu
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
        disabled={registerMutation.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {registerMutation.isPending ? 'Đang tạo tài khoản...' : 'Đăng ký'}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  )
}
