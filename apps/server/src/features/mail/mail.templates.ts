import { env } from '@/config/env'

const PRIMARY = '#0067ff'
const SIDEBAR = '#0a1628'
const FG = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'

function layout(inner: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr><td style="background:${SIDEBAR};color:#e8eef7;padding:16px 20px;font-size:15px;font-weight:600;">Chat App</td></tr>
        <tr><td style="padding:24px 20px;color:${FG};font-size:15px;line-height:1.5;">
          ${inner}
        </td></tr>
      </table>
      <p style="color:${MUTED};font-size:12px;margin-top:16px;">Email tự động, vui lòng không trả lời.</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function renderVerificationEmail(code: string): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:18px;color:${FG};">Xác thực email</h1>
    <p style="margin:0 0 16px;color:${MUTED};">Mã xác thực của bạn (hiệu lực trong thời gian ngắn):</p>
    <p style="margin:0 0 20px;font-size:28px;font-weight:700;letter-spacing:4px;color:${PRIMARY};">${escapeHtml(code)}</p>
    <p style="margin:0;color:${MUTED};font-size:13px;">Hoặc mở ứng dụng và nhập mã tại trang xác thực: <a href="${escapeHtml(env.CLIENT_URL)}/verify-email" style="color:${PRIMARY};">${escapeHtml(env.CLIENT_URL)}/verify-email</a></p>
  `
  return { subject: 'Mã xác thực email — Chat App', html: layout(inner) }
}

export function renderForgotPasswordOtpEmail(code: string): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:18px;color:${FG};">Đặt lại mật khẩu</h1>
    <p style="margin:0 0 16px;color:${MUTED};">Mã xác thực để đặt lại mật khẩu:</p>
    <p style="margin:0 0 20px;font-size:28px;font-weight:700;letter-spacing:4px;color:${PRIMARY};">${escapeHtml(code)}</p>
    <p style="margin:0;color:${MUTED};font-size:13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `
  return { subject: 'Mã đặt lại mật khẩu — Chat App', html: layout(inner) }
}

export function renderPasswordChangedEmail(): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:18px;color:${FG};">Mật khẩu đã được đổi</h1>
    <p style="margin:0;color:${MUTED};">Mật khẩu tài khoản Chat App của bạn vừa được thay đổi. Nếu không phải bạn, hãy đặt lại mật khẩu ngay hoặc liên hệ hỗ trợ.</p>
  `
  return { subject: 'Mật khẩu đã được đổi — Chat App', html: layout(inner) }
}

export function renderPasswordResetSuccessEmail(): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:18px;color:${FG};">Đặt lại mật khẩu thành công</h1>
    <p style="margin:0;color:${MUTED};">Mật khẩu Chat App của bạn đã được cập nhật. Các phiên đăng nhập khác có thể đã bị đăng xuất.</p>
  `
  return { subject: 'Đặt lại mật khẩu thành công — Chat App', html: layout(inner) }
}

export function renderPasswordSetEmail(): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:18px;color:${FG};">Đã đặt mật khẩu</h1>
    <p style="margin:0;color:${MUTED};">Bạn đã đặt mật khẩu cho tài khoản Chat App. Giờ bạn có thể đăng nhập bằng email và mật khẩu hoặc tiếp tục dùng đăng nhập mạng xã hội.</p>
  `
  return { subject: 'Đã đặt mật khẩu — Chat App', html: layout(inner) }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
