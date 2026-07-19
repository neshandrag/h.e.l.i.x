const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { searchDocuments } = require('../services/vectorSearch.service');
const { answerAdvisoryQuery } = require('../services/retrieval.service');

// Module 5, standard path: plain semantic search — "show me my AI projects".
const search = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { query, limit } = req.body;
  const results = await searchDocuments(req.userId, query, limit ?? 5);
  res.json({ results });
});

// Module 5, advisory path (GraphRAG): "Am I ready for a Data Science internship?"
const ask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { question } = req.body;
  const answer = await answerAdvisoryQuery(req.userId, question);
  res.json(answer);
});

module.exports = { search, ask, searchValidators: [body('query').isString().isLength({ min: 1 })], askValidators: [body('question').isString().isLength({ min: 1 })] };
