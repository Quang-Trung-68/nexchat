import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useForgotPassword } from '../queries/auth.queries'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { error?: { message?: string } }
    return d.error?.message ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export function ForgotPasswordForm() {
  const forgot = useForgotPassword()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: FormValues) => {
    const email = data.email.trim().toLowerCase()
    forgot.mutate(email, {
      onSuccess: () => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true })
      },
    })
  }

  const serverError =
    forgot.isError && forgot.error ? getErrorMessage(forgot.error) : null

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-neutral-900">Quên mật khẩu</h1>
      <p className="text-sm text-neutral-600">
        Nhập email đã đăng ký. Bạn sẽ nhận mã xác thực để đặt lại mật khẩu nếu tài khoản tồn tại.
      </p>

      {serverError ? <div className="error-alert">{serverError}</div> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-primary"
          {...register('email')}
        />
        {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <button
        type="submit"
        disabled={forgot.isPending}
        className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {forgot.isPending ? 'Đang gửi...' : 'Gửi mã'}
      </button>

      <p className="text-center text-sm text-neutral-600">
        <Link to="/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  )
}
