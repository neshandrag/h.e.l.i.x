const cheerio = require('cheerio');
const ApiError = require('../utils/ApiError');
const { ingestExtractedContent } = require('./document.service');

// Module 1 portfolio-link ingestion: fetch a public URL, strip markup to plain
// text, then run the same classify → embed → graph pipeline as file uploads.
const MAX_TEXT_CHARS = 8000;
const FETCH_TIMEOUT_MS = 15000;

function assertHttpUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ApiError(422, 'A valid http(s) URL is required');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ApiError(422, 'Only http and https portfolio URLs are supported');
  }
  return parsed.toString();
}

function htmlToEvidenceText(url, html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe').remove();
  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.replace(/\s+/g, ' ').trim();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  return [
    `Portfolio URL: ${url}`,
    title ? `Title: ${title}` : null,
    metaDescription ? `Description: ${metaDescription}` : null,
    bodyText ? `\nPage content:\n${bodyText.slice(0, MAX_TEXT_CHARS)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Fetches a public portfolio / personal-site URL and ingests it as a document
 * with sourceChannel URL (brief Module 1: "Portfolio Links").
 */
async function ingestPortfolioUrl(userId, rawUrl) {
  const url = assertHttpUrl(rawUrl);

  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'HelixDigitalIdentity/0.1 (+portfolio-ingest)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err) {
    throw new ApiError(502, `Could not reach that URL: ${err.message}`);
  }

  if (!response.ok) {
    throw new ApiError(502, `URL returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType) && contentType) {
    throw new ApiError(422, 'URL must point to an HTML page (portfolio / personal site)');
  }

  const html = await response.text();
  const extractedText = htmlToEvidenceText(url, html);
  if (extractedText.length < 40) {
    throw new ApiError(422, 'Page had too little readable text to classify');
  }

  const document = await ingestExtractedContent({
    userId,
    fileUrl: url,
    extractedText,
    sourceChannel: 'URL',
  });

  return { document };
}

module.exports = { ingestPortfolioUrl };
