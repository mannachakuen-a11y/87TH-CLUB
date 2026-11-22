import 'server-only';
import nodemailer from 'nodemailer';

export function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function t() {
  if (!transport)
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  return transport;
}

/** Sends an email if SMTP is configured. Never throws: failures are logged and reported to the caller. */
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<{ sent: boolean; error?: string }> {
  if (!emailConfigured()) {
    console.warn(`[email] SMTP not configured — not sent: "${subject}" to ${to}`);
    return { sent: false, error: 'SMTP not configured' };
  }
  try {
    await t().sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html });
    return { sent: true };
  } catch (e) {
    console.error('[email] send failed', e);
    return { sent: false, error: (e as Error).message };
  }
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
