import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
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
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: FormValues) => {
    forgot.mutate(data.email, {
      onSuccess: () => setSubmitted(true),
    })
  }

  const serverError =
    forgot.isError && forgot.error ? getErrorMessage(forgot.error) : null

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-center text-neutral-700">
          Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra
          hộp thư.
        </p>
        <p className="mt-4 text-center">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-neutral-900">Quên mật khẩu</h1>
      <p className="text-sm text-neutral-600">
        Nhập email đã đăng ký. Bạn sẽ nhận link đặt lại mật khẩu nếu tài khoản tồn tại.
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
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
          {...register('email')}
        />
        {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <button
        type="submit"
        disabled={forgot.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {forgot.isPending ? 'Đang gửi...' : 'Gửi link reset'}
      </button>

      <p className="text-center text-sm text-neutral-600">
        <Link to="/login" className="text-indigo-600 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  )
}
