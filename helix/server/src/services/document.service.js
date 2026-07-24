const cloudinary = require('../config/cloudinary');
const prisma = require('../config/prisma');
const { extractText } = require('./extraction.service');
const { classifyDocument } = require('./ai.service');
const { computeVerifiabilityScore, recomputeDepthScore, evidenceTypeFor } = require('./scoring.service');
const { generateEmbedding, toVectorLiteral } = require('./embedding.service');
const { buildRelationships } = require('./relationship.service');
const { maybeAutoCreateMilestone } = require('./timeline.service');

const UNREADABLE_CLASSIFICATION = {
  category: 'Academics',
  confidence: 0,
  issuer: null,
  documentDate: null,
  entities: [],
  needsReview: true,
};

function parseDocumentDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dedupeEntities(entities) {
  const seen = new Set();
  const unique = [];
  for (const e of entities ?? []) {
    const name = e.name?.trim();
    if (!name) continue;
    const key = `${e.type}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ type: e.type, name });
  }
  return unique;
}

function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'helix/documents', filename_override: originalName, use_filename: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Cloudinary blocks *inline* delivery of PDF/ZIP files by default on every
// account (a 2023 platform-wide security change — inline PDFs can carry
// embedded scripts) — the plain secure_url from the upload response 404s in
// the browser for PDFs even though the file uploaded fine. The documented
// workaround is the `attachment` delivery flag, which serves the same file
// with Content-Disposition: attachment instead of inline, bypassing that
// restriction. Only applied to PDFs; images should still preview inline.
function resolveFileUrl(uploadResult) {
  if (uploadResult.format !== 'pdf') return uploadResult.secure_url;

  return cloudinary.url(uploadResult.public_id, {
    resource_type: uploadResult.resource_type,
    type: uploadResult.type,
    format: uploadResult.format,
    version: uploadResult.version,
    secure: true,
    flags: 'attachment',
  });
}

// Text extraction can fail on a legitimate file — an encrypted PDF, a corrupt
// upload, a parser bug (e.g. the pdf-parse "bad XRef entry" failure this
// replaced unpdf over). It must never take the whole upload down with it; the
// original file is still preserved and the document is flagged for review,
// mirroring the malformed-LLM-output handling in ai.service.js.
async function safeExtractText(buffer, mimeType, originalName) {
  try {
    const text = await extractText(buffer, mimeType);
    return text?.trim() ? text : null;
  } catch (err) {
    console.warn(`[document.service] extraction failed for "${originalName}": ${err.message}`);
    return null;
  }
}

// Links extracted entities to the document as evidence and returns the resolved
// entity records (id + type), which buildRelationships() then uses to infer
// edges between whatever entities co-occurred on this document.
async function linkEntities(userId, documentId, entities, evidenceDate, documentCategory) {
  const resolved = [];

  for (const extracted of dedupeEntities(entities)) {
    // eslint-disable-next-line no-await-in-loop
    const entity = await prisma.entity.upsert({
      where: { userId_type_name: { userId, type: extracted.type, name: extracted.name } },
      update: {},
      create: { userId, type: extracted.type, name: extracted.name },
    });

    // One evidence row per (document, entity) — duplicate LLM names must not
    // double-count toward depth score.
    // eslint-disable-next-line no-await-in-loop
    const existingLink = await prisma.documentEntity.findFirst({
      where: { documentId, entityId: entity.id },
      select: { id: true },
    });
    if (!existingLink) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.documentEntity.create({
        data: {
          documentId,
          entityId: entity.id,
          evidenceType: evidenceTypeFor(documentCategory, extracted.type),
          evidenceDate,
        },
      });
    }

    // eslint-disable-next-line no-await-in-loop
    await recomputeDepthScore(entity.id);
    resolved.push({ id: entity.id, type: entity.type });
  }

  return resolved;
}

/**
 * Shared Module 2 → Module 3 pipeline: classify already-extracted text with
 * Gemini (schema-validated, see ai.service.js), score verifiability
 * deterministically, embed for semantic search, persist as a `documents` row,
 * and link extracted entities into the relationship graph. Used by every
 * ingestion channel (manual upload, Telegram, GitHub) once each has produced
 * a fileUrl + extractedText pair — this is the part that doesn't care where
 * the bytes came from.
 */
async function ingestExtractedContent({ userId, fileUrl, extractedText, sourceChannel }) {
  const classification = extractedText ? await classifyDocument(extractedText) : UNREADABLE_CLASSIFICATION;
  const verifiabilityScore = extractedText
    ? computeVerifiabilityScore({
      issuer: classification.issuer,
      extractedText,
      sourceChannel,
    })
    : 0;

  const documentDate = parseDocumentDate(classification.documentDate);
  const evidenceDate = documentDate ?? new Date();

  const document = await prisma.document.create({
    data: {
      userId,
      fileUrl,
      extractedText,
      category: classification.category,
      documentDate,
      confidenceScore: classification.confidence,
      verifiabilityScore,
      needsReview: classification.needsReview,
      sourceChannel,
    },
  });

  // The document row above is already committed by this point — an embedding
  // failure here (quota, transient error) must not fail the whole upload
  // response. It just leaves embedding NULL, meaning this document is
  // invisible to semantic search until reclassifyDocument() is retried later
  // (that call regenerates the embedding too), rather than crashing ingestion.
  if (extractedText) {
    try {
      const embedding = await generateEmbedding(extractedText);
      await prisma.$executeRaw`
        UPDATE documents SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${document.id}::uuid;
      `;
    } catch (err) {
      console.warn(`[document.service] embedding generation failed for document ${document.id}: ${err.message}`);
    }
  }

  const resolvedEntities = await linkEntities(
    userId,
    document.id,
    classification.entities,
    evidenceDate,
    classification.category
  );
  await buildRelationships(resolvedEntities);
  await maybeAutoCreateMilestone(userId, document);

  return { ...document, entities: classification.entities };
}

/**
 * Retries classification for a document already stuck at `needsReview` — most
 * commonly because the LLM call failed both attempts in ai.service.js (e.g.
 * a transient error or, in practice, hitting the Gemini free-tier daily quota
 * — see docs/THOUGHT_PROCESS.md). Re-runs the same classify → score → embed →
 * link pipeline as a fresh upload, without re-uploading the original file.
 * Any documentEntity rows from a prior failed attempt are cleared first (the
 * fallback classification always has an empty entities array, so in practice
 * there's nothing to clear, but this keeps the operation idempotent if run
 * more than once). No-op-safe: throws only if the document has no extracted
 * text at all, since there's nothing to classify in that case.
 */
async function reclassifyDocument(userId, documentId) {
  const document = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!document) throw new Error('Document not found');
  if (!document.extractedText) throw new Error('This document has no extracted text to classify (extraction failed at upload time)');

  const existingLinks = await prisma.documentEntity.findMany({ where: { documentId }, select: { entityId: true } });
  if (existingLinks.length > 0) {
    await prisma.documentEntity.deleteMany({ where: { documentId } });
    await Promise.all(existingLinks.map((l) => recomputeDepthScore(l.entityId)));
  }

  const classification = await classifyDocument(document.extractedText);
  const verifiabilityScore = computeVerifiabilityScore({
    issuer: classification.issuer,
    extractedText: document.extractedText,
    sourceChannel: document.sourceChannel,
  });
  const documentDate = parseDocumentDate(classification.documentDate);
  const evidenceDate = documentDate ?? document.createdAt;

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      category: classification.category,
      documentDate,
      confidenceScore: classification.confidence,
      verifiabilityScore,
      needsReview: classification.needsReview,
    },
  });

  try {
    const embedding = await generateEmbedding(document.extractedText);
    await prisma.$executeRaw`
      UPDATE documents SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${documentId}::uuid;
    `;
  } catch (err) {
    console.warn(`[document.service] embedding regeneration failed for document ${documentId}: ${err.message}`);
  }

  const resolvedEntities = await linkEntities(
    userId,
    documentId,
    classification.entities,
    evidenceDate,
    classification.category
  );
  await buildRelationships(resolvedEntities);
  await maybeAutoCreateMilestone(userId, updated);

  return { ...updated, entities: classification.entities };
}

/**
 * Full Module 1 → Module 3 ingestion pipeline for a raw uploaded file: extract
 * text, upload the original to Cloudinary, then hand off to
 * ingestExtractedContent(). The upload always succeeds: extraction failures
 * and unclassifiable text both degrade to a needsReview record with the
 * original file still attached, rather than failing the request (plan.md,
 * Section 11).
 */
async function ingestDocument({ userId, buffer, mimeType, originalName, sourceChannel = 'MANUAL_UPLOAD' }) {
  const [extractedText, uploadResult] = await Promise.all([
    safeExtractText(buffer, mimeType, originalName),
    uploadBufferToCloudinary(buffer, originalName),
  ]);

  return ingestExtractedContent({ userId, fileUrl: resolveFileUrl(uploadResult), extractedText, sourceChannel });
}

module.exports = { ingestDocument, ingestExtractedContent, reclassifyDocument };
