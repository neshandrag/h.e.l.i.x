const { z } = require('zod');

// Contract the Gemini classification call must satisfy before the application
// trusts it. Anything that fails this — malformed JSON, missing fields, wrong
// types — is caught by ai.service.js and never reaches a controller.
// See plan.md, Section 6 (Module 2) and Section 11 (Technical Constraints).
const CLASSIFICATION_CATEGORIES = [
  'Projects',
  'Skills',
  'Certifications',
  'Internships',
  'Achievements',
  'Academics',
];

const ENTITY_TYPES = ['SKILL', 'PROJECT', 'CERTIFICATION', 'INTERNSHIP', 'ACHIEVEMENT'];

const extractedEntitySchema = z.object({
  type: z.enum(ENTITY_TYPES),
  name: z.string().min(1),
});

const classificationSchema = z.object({
  category: z.enum(CLASSIFICATION_CATEGORIES),
  confidence: z.number().min(0).max(1),
  issuer: z.string().nullable().optional(),
  documentDate: z.string().nullable().optional(),
  entities: z.array(extractedEntitySchema).default([]),
});

const coherenceSchema = z.object({
  coherenceScore: z.number().min(0).max(1),
  narrative: z.string(),
  discontinuities: z.array(z.string()).default([]),
});

module.exports = {
  CLASSIFICATION_CATEGORIES,
  ENTITY_TYPES,
  classificationSchema,
  coherenceSchema,
};
