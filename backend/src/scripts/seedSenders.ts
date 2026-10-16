import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const SENDER_NAMES = [
  'Oliver Brown',
  'ReachInbox Growth',
  'Outbox Sales Specialist',
];

export async function seedSenders(count = 2): Promise<void> {
  logger.info(`Creating ${count} Ethereal SMTP test accounts...`);

  for (let i = 0; i < count; i++) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const senderName = SENDER_NAMES[i] || `ReachInbox Sender ${i + 1}`;

      const sender = await prisma.sender.upsert({
        where: { email: testAccount.user },
        update: {
          name: senderName,
          etherealUser: testAccount.user,
          etherealPass: testAccount.pass,
          etherealHost: testAccount.smtp.host,
          etherealPort: testAccount.smtp.port,
          etherealSecure: testAccount.smtp.secure,
        },
        create: {
          email: testAccount.user,
          name: senderName,
          etherealUser: testAccount.user,
          etherealPass: testAccount.pass,
          etherealHost: testAccount.smtp.host,
          etherealPort: testAccount.smtp.port,
          etherealSecure: testAccount.smtp.secure,
        },
      });

      logger.info(
        `✅ Seeded sender ${sender.name} (${sender.email}) [id: ${sender.id}]`
      );
    } catch (err) {
      logger.error({ err }, `Failed to create Ethereal account #${i + 1}`);
      throw err;
    }
  }

  logger.info('🎉 Senders seeded successfully.');
}

// Run directly if invoked via CLI
if (process.argv[1] && process.argv[1].endsWith('seedSenders.ts')) {
  seedSenders()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
