const cron = require('node-cron');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { ingestDocument } = require('./document.service');

// imapflow/mailparser are required lazily (inside the functions below) rather
// than at module load — this file is always require()'d from server.js, and
// this channel is optional (npm install imapflow mailparser is only needed if
// EMAIL_IMAP_* is actually configured), so a missing package must not crash
// server startup for everyone else.

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

// Secondary ingestion channel (idea.txt: "forward any acceptance/certificate
// email and it's captured"; plan.md Module 1 lists SourceChannel.EMAIL, which
// was previously unused). Same reliability contract as telegram.service.js and
// github.service.js: additive, no-ops without config, never blocks startup,
// per-message failures are isolated so one bad email doesn't stop the poll.
async function handleMessage(rawSource) {
  const { simpleParser } = require('mailparser');
  const parsed = await simpleParser(rawSource);

  const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
  if (!senderEmail) return;

  const user = await prisma.user.findUnique({ where: { email: senderEmail }, select: { id: true } });
  if (!user) {
    console.log(`[email.service] skipping message from unrecognized sender "${senderEmail}"`);
    return;
  }

  for (const attachment of parsed.attachments ?? []) {
    if (!ALLOWED_MIME_TYPES.includes(attachment.contentType)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await ingestDocument({
        userId: user.id,
        buffer: attachment.content,
        mimeType: attachment.contentType,
        originalName: attachment.filename ?? 'email-attachment',
        sourceChannel: 'EMAIL',
      });
    } catch (err) {
      console.warn(`[email.service] ingestion failed for attachment "${attachment.filename}": ${err.message}`);
    }
  }
}

async function pollInbox() {
  const { ImapFlow } = require('imapflow');
  const client = new ImapFlow({
    host: env.EMAIL_IMAP_HOST,
    port: Number(env.EMAIL_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: env.EMAIL_IMAP_USER, pass: env.EMAIL_IMAP_PASSWORD },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    for await (const message of client.fetch({ seen: false }, { uid: true, source: true })) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await handleMessage(message.source);
      } catch (err) {
        console.warn(`[email.service] failed to process message ${message.uid}: ${err.message}`);
      }
      // eslint-disable-next-line no-await-in-loop
      await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

/**
 * Starts polling EMAIL_IMAP_HOST every 5 minutes for unread messages from
 * known Helix users, ingesting recognized attachments the same way as any
 * other channel. No-op (with a console notice) if IMAP isn't configured —
 * this channel must never block server startup (plan.md Section 10).
 */
function scheduleEmailPolling() {
  if (!env.EMAIL_IMAP_HOST || !env.EMAIL_IMAP_USER || !env.EMAIL_IMAP_PASSWORD) {
    console.log('[email.service] EMAIL_IMAP_HOST/USER/PASSWORD not set — email ingestion disabled');
    return;
  }

  cron.schedule('*/5 * * * *', () => {
    pollInbox().catch((err) => console.error('[email.service] poll failed:', err.message));
  });
  console.log('[email.service] email polling scheduled (every 5 minutes)');
}

module.exports = { scheduleEmailPolling };
