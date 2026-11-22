import { cache } from 'react';
import { prisma } from './db';

/** Store settings editable from the admin dashboard. Empty values are simply not rendered. */
export const SETTING_DEFAULTS = {
  announcement: 'LIFE IS ART. STYLE YOURS.',
  supportEmail: '',
  supportPhone: '',
  instagram: '',
  tiktok: '',
  x: '',
  youtube: '',
  shippingInfo: '',
  returnsInfo: '',
  faq: '', // "Q: ...\nA: ..." blocks separated by blank lines
  heroImage: '', // optional campaign photograph (storage url)
  heroHeadline: 'LIFE IS ART.',
  heroSubline: 'You are the artist. Make something beautiful of it.',
  editorialImage: '',
  businessLocation: '',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.setting.findMany();
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
});

export function parseFaq(text: string): { q: string; a: string }[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const q = block.match(/^Q:\s*(.+)$/im)?.[1]?.trim();
      const a = block.match(/^A:\s*([\s\S]+)$/im)?.[1]?.trim();
      return q && a ? { q, a } : null;
    })
    .filter(Boolean) as { q: string; a: string }[];
}
