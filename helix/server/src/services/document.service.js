const cloudinary = require('../config/cloudinary');
const prisma = require('../config/prisma');
const { extractText } = require('./extraction.service');
const { classifyDocument } = require('./ai.service');
const { computeVerifiabilityScore, recomputeDepthScore } = require('./scoring.service');
const { generateEmbedding, toVectorLiteral } = require('./embedding.service');

function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'helix/documents', filename_override: originalName, use_filename: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function linkEntities(userId, documentId, entities, evidenceDate) {
  for (const extracted of entities) {
    // eslint-disable-next-line no-await-in-loop
    const entity = await prisma.entity.upsert({
      where: { userId_type_name: { userId, type: extracted.type, name: extracted.name } },
      update: {},
      create: { userId, type: extracted.type, name: extracted.name },
    });

    // eslint-disable-next-line no-await-in-loop
    await prisma.documentEntity.create({
      data: {
        documentId,
        entityId: entity.id,
        evidenceType: extracted.type,
        evidenceDate,
      },
    });

    // eslint-disable-next-line no-await-in-loop
    await recomputeDepthScore(entity.id);
  }
}

/**
 * Full Module 1 → Module 3 ingestion pipeline: extract text, upload the original
 * to Cloudinary, classify with Gemini (schema-validated, see ai.service.js),
 * score verifiability deterministically, embed for semantic search, persist,
 * and link extracted entities into the relationship graph.
 */
async function ingestDocument({ userId, buffer, mimeType, originalName, sourceChannel = 'MANUAL_UPLOAD' }) {
  const [extractedText, uploadResult] = await Promise.all([
    extractText(buffer, mimeType),
    uploadBufferToCloudinary(buffer, originalName),
  ]);

  const classification = await classifyDocument(extractedText);
  const verifiabilityScore = computeVerifiabilityScore({
    issuer: classification.issuer,
    extractedText,
  });

  const evidenceDate = classification.documentDate ? new Date(classification.documentDate) : new Date();

  const document = await prisma.document.create({
    data: {
      userId,
      fileUrl: uploadResult.secure_url,
      extractedText,
      category: classification.category,
      confidenceScore: classification.confidence,
      verifiabilityScore,
      needsReview: classification.needsReview,
      sourceChannel,
    },
  });

  const embedding = await generateEmbedding(extractedText);
  await prisma.$executeRaw`
    UPDATE documents SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${document.id}::uuid;
  `;

  await linkEntities(userId, document.id, classification.entities, evidenceDate);

  return { ...document, entities: classification.entities };
}

module.exports = { ingestDocument };
