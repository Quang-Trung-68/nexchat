import nodemailer from 'nodemailer'
import { env } from './env'

export const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Reset mật khẩu — Chat App',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset mật khẩu</h2>
        <p>Bạn vừa yêu cầu reset mật khẩu. Click vào link bên dưới để tiếp tục:</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;
                  color:#fff;border-radius:8px;text-decoration:none;margin:16px 0">
          Reset mật khẩu
        </a>
        <p style="color:#888;font-size:13px">Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  })
}
