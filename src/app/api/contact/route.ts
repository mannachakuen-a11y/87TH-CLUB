import { z } from 'zod';
import { prisma } from '@/lib/db';
import { json, parseBody, rateLimit, sameOrigin } from '@/lib/http';
import { sendEmail } from '@/lib/email';
import { getSettings } from '@/lib/settings';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  subject: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Message is too short').max(5000),
  company: z.string().max(0).optional().or(z.literal('')), // honeypot must be empty
});

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: 'Forbidden' }, 403);
  if (!(await rateLimit('contact', 5, 10 * 60_000))) return json({ error: 'Too many messages — please try again later' }, 429);
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;
  const { name, email, subject, message } = parsed.data;
  const saved = await prisma.contactMessage.create({ data: { name, email, subject: subject || null, message } });
  const to = process.env.CONTACT_TO_EMAIL || (await getSettings()).supportEmail;
  if (to) await sendEmail(to, `[87th Club contact] ${subject || 'New message'} — ${name}`, `From: ${name} <${email}>\n\n${message}\n\n(Stored as message ${saved.id})`);
  return json({ ok: true }, 201);
}
