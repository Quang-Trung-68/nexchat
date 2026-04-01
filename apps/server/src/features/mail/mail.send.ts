import { transporter } from '@/config/email'
import { env } from '@/config/env'
import type { MailJobPayload } from './mail.queue'
import {
  renderForgotPasswordOtpEmail,
  renderPasswordChangedEmail,
  renderPasswordResetSuccessEmail,
  renderPasswordSetEmail,
  renderVerificationEmail,
} from './mail.templates'

export async function sendMailJob(payload: MailJobPayload): Promise<void> {
  if (!env.EMAIL_USER?.trim() || !env.EMAIL_PASS?.trim()) {
    if (env.NODE_ENV === 'development') {
      console.warn('[mail] Bỏ qua gửi — thiếu EMAIL_USER / EMAIL_PASS', payload.template)
    }
    return
  }

  let subject: string
  let html: string

  switch (payload.template) {
    case 'verification': {
      const r = renderVerificationEmail(payload.code)
      subject = r.subject
      html = r.html
      break
    }
    case 'forgot_otp': {
      const r = renderForgotPasswordOtpEmail(payload.code)
      subject = r.subject
      html = r.html
      break
    }
    case 'password_changed': {
      const r = renderPasswordChangedEmail()
      subject = r.subject
      html = r.html
      break
    }
    case 'password_reset_success': {
      const r = renderPasswordResetSuccessEmail()
      subject = r.subject
      html = r.html
      break
    }
    case 'password_set': {
      const r = renderPasswordSetEmail()
      subject = r.subject
      html = r.html
      break
    }
  }

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject,
    html,
  })

  const logPayload = {
    template: payload.template,
    toDomain: payload.to.split('@')[1] ?? '?',
    messageId: info.messageId,
  }
  console.log(JSON.stringify({ level: 'info', event: 'mail_sent', ...logPayload }))
}
