const { Telegraf } = require('telegraf');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { ingestDocument } = require('./document.service');
const { redeemCode } = require('../utils/telegramLinkCodes');

// Secondary ingestion channel (plan.md Section 6, Module 1): "a document
// forwarded to the bot is ingested automatically." Runs in long-polling mode
// (bot.launch()) — no public webhook URL needed, works fine for a local or
// single-instance hackathon deployment.
let bot = null;

async function findLinkedUser(chatId) {
  return prisma.user.findFirst({ where: { telegramChatId: String(chatId) }, select: { id: true } });
}

async function downloadTelegramFile(ctx, fileId) {
  const fileUrl = await ctx.telegram.getFileLink(fileId);
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function handleLink(ctx) {
  const code = ctx.message.text.split(' ')[1];
  if (!code) {
    return ctx.reply('Send /link followed by the code shown on your Helix dashboard, e.g. "/link A1B2C3".');
  }

  const userId = redeemCode(code);
  if (!userId) {
    return ctx.reply('That code is invalid or has expired. Generate a new one from Helix and try again.');
  }

  await prisma.user.update({ where: { id: userId }, data: { telegramChatId: String(ctx.chat.id) } });
  return ctx.reply('Linked! Send or forward any document (PDF, DOCX, or image) and it will be added to your Helix profile automatically.');
}

async function handleIncomingDocument(ctx, { fileId, mimeType, fileName }) {
  const user = await findLinkedUser(ctx.chat.id);
  if (!user) {
    return ctx.reply('This Telegram chat isn\'t linked to a Helix account yet. Generate a code from your Helix dashboard and send "/link <code>" first.');
  }

  try {
    const buffer = await downloadTelegramFile(ctx, fileId);
    const document = await ingestDocument({
      userId: user.id,
      buffer,
      mimeType,
      originalName: fileName,
      sourceChannel: 'TELEGRAM',
    });
    return ctx.reply(`Added to your Helix profile as "${document.category}" (confidence ${Math.round((document.confidenceScore ?? 0) * 100)}%).`);
  } catch (err) {
    console.warn(`[telegram.service] ingestion failed: ${err.message}`);
    return ctx.reply('Sorry, something went wrong processing that file. Please try again.');
  }
}

function registerHandlers(instance) {
  instance.start((ctx) => ctx.reply('Welcome to Helix. Send "/link <code>" with the code from your Helix dashboard to connect this chat.'));
  instance.command('link', handleLink);

  instance.on('document', (ctx) => {
    const { file_id: fileId, mime_type: mimeType, file_name: fileName } = ctx.message.document;
    if (!mimeType) return ctx.reply('Could not determine that file\'s type — please send a PDF, DOCX, or image.');
    return handleIncomingDocument(ctx, { fileId, mimeType, fileName: fileName ?? 'telegram-upload' });
  });

  instance.on('photo', (ctx) => {
    const sizes = ctx.message.photo;
    const largest = sizes[sizes.length - 1];
    return handleIncomingDocument(ctx, { fileId: largest.file_id, mimeType: 'image/jpeg', fileName: 'telegram-photo.jpg' });
  });
}

/**
 * Starts the Telegram bot in long-polling mode. No-op (with a console notice)
 * if TELEGRAM_BOT_TOKEN isn't configured — this channel is additive per
 * plan.md Section 10 and must never block server startup.
 */
function launchTelegramBot() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log('[telegram.service] TELEGRAM_BOT_TOKEN not set — Telegram ingestion disabled');
    return;
  }

  bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  registerHandlers(bot);
  bot.launch();
  console.log('[telegram.service] Telegram bot started (long polling)');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = { launchTelegramBot };
