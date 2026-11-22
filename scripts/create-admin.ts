/**
 * Create (or reset the password of) an admin user.
 *   npm run admin:create -- you@example.com "a-long-password" ["Your Name"]
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run admin:create -- <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), passwordHash, name: name || null, role: 'OWNER' },
    update: { passwordHash, ...(name ? { name } : {}) },
  });
  console.log(`Admin ready: ${admin.email} — sign in at /admin/login`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
