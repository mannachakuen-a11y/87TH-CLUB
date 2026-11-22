import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { requireAdmin } from '@/lib/auth';
import { CURRENCY } from '@/lib/money';
import { paystackConfigured } from '@/lib/paystack';
import { emailConfigured } from '@/lib/email';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { Card, Field, PageHeader, input, label, td, th } from '@/components/admin/ui';
import { saveSettingsAction } from '../../actions/catalog';
import { changePasswordAction, createAdminAction, deleteAdminAction } from '../../actions/auth';

function ImageSetting({ name, title, value, hint }: { name: string; title: string; value: string; hint: string }) {
  return (
    <div>
      <p className={label}>{title}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {value && <img src={value} alt="" className="mb-2 aspect-video w-full max-w-sm rounded object-cover" />}
      <input type="file" name={`${name}__file`} accept="image/*" className="text-sm" />
      {value && <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name={`${name}__clear`} /> Remove</label>}
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

export default async function SettingsAdmin() {
  const me = await requireAdmin();
  const [s, admins] = await Promise.all([getSettings(), prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } })]);
  return (
    <>
      <PageHeader title="Settings" />
      <ActionForm action={saveSettingsAction} className="grid gap-6 xl:grid-cols-2">
        <Card title="Storefront">
          <div className="space-y-3">
            <Field name="announcement" title="Announcement bar" defaultValue={s.announcement} hint="Leave empty to hide the bar." />
            <Field name="heroHeadline" title="Hero headline" defaultValue={s.heroHeadline} />
            <Field name="heroSubline" title="Hero line" defaultValue={s.heroSubline} />
            <ImageSetting name="heroImage" title="Campaign hero photograph" value={s.heroImage} hint="Real 87th Club campaign photography only. Without one, the homepage uses the typographic mascot hero." />
            <ImageSetting name="editorialImage" title="Editorial / culture image" value={s.editorialImage} hint="Shown in the Culture in Motion section and on The Club page." />
          </div>
        </Card>
        <Card title="Contact & social">
          <div className="space-y-3">
            <Field name="supportEmail" title="Customer support email" defaultValue={s.supportEmail} type="email" hint="Shown on the site and receives contact-form messages (unless CONTACT_TO_EMAIL is set)." />
            <Field name="supportPhone" title="Phone / WhatsApp" defaultValue={s.supportPhone} />
            <Field name="businessLocation" title="Based in" defaultValue={s.businessLocation} />
            <Field name="instagram" title="Instagram URL" defaultValue={s.instagram} />
            <Field name="tiktok" title="TikTok URL" defaultValue={s.tiktok} />
            <Field name="x" title="X URL" defaultValue={s.x} />
            <Field name="youtube" title="YouTube URL" defaultValue={s.youtube} />
          </div>
        </Card>
        <Card title="Policies & FAQ" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label} htmlFor="shippingInfo">Shipping information (product pages)</label><textarea id="shippingInfo" name="shippingInfo" rows={5} defaultValue={s.shippingInfo} className={input} /></div>
            <div><label className={label} htmlFor="returnsInfo">Returns & exchanges (product pages)</label><textarea id="returnsInfo" name="returnsInfo" rows={5} defaultValue={s.returnsInfo} className={input} /></div>
            <div className="md:col-span-2">
              <label className={label} htmlFor="faq">FAQ (contact page)</label>
              <textarea id="faq" name="faq" rows={8} defaultValue={s.faq} className={`${input} font-mono`} placeholder={'Q: How long does delivery take?\nA: ...\n\nQ: Can I exchange a size?\nA: ...'} />
              <p className="mt-1 text-xs text-neutral-500">Write each question as “Q: …” and its answer as “A: …”, with a blank line between pairs.</p>
            </div>
          </div>
        </Card>
        <div className="xl:col-span-2"><Submit>Save settings</Submit></div>
      </ActionForm>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Integrations (server environment)">
          <ul className="space-y-1 text-sm">
            <li>Store currency: <b>{CURRENCY}</b> (STORE_CURRENCY)</li>
            <li>Paystack: {paystackConfigured() ? <b className="text-green-700">configured</b> : <b className="text-red-600">not configured — set PAYSTACK_SECRET_KEY</b>}</li>
            <li>Email (SMTP): {emailConfigured() ? <b className="text-green-700">configured</b> : <b className="text-red-600">not configured</b>}</li>
            <li>Image storage: <b>{process.env.S3_BUCKET ? `S3 bucket ${process.env.S3_BUCKET}` : 'local disk (UPLOAD_DIR)'}</b></li>
          </ul>
        </Card>
        <Card title="Change your password">
          <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-3">
            <Field name="current" title="Current password" type="password" required />
            <Field name="next" title="New password (10+ characters)" type="password" required />
            <Submit variant="ghost">Update password</Submit>
          </ActionForm>
        </Card>
        <Card title="Admin users" className="xl:col-span-2">
          <table className="mb-4 w-full">
            <thead><tr><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Last sign-in</th><th className={th}></th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{a.email}{a.id === me.id && ' (you)'}</td>
                  <td className={td}>{a.role.toLowerCase()}</td>
                  <td className={td}>{a.lastLoginAt?.toLocaleString('en-GB') ?? 'never'}</td>
                  <td className={`${td} text-right`}>{me.role === 'OWNER' && a.id !== me.id && <form action={deleteAdminAction}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-red-600 underline">Remove</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {me.role === 'OWNER' && (
            <ActionForm action={createAdminAction} resetOnSuccess className="grid items-end gap-3 md:grid-cols-5">
              <Field name="email" title="Email" type="email" required />
              <Field name="name" title="Name" />
              <Field name="password" title="Temporary password" type="password" required />
              <div><label className={label} htmlFor="role">Role</label><select id="role" name="role" className={input}><option value="STAFF">Staff</option><option value="OWNER">Owner</option></select></div>
              <Submit variant="ghost">Add admin</Submit>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  );
}
