const { Octokit } = require('octokit');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { ingestExtractedContent } = require('./document.service');

// Secondary ingestion channel (plan.md Section 6, Module 1): "connecting a
// GitHub account extracts repository README content, commit history, and
// language statistics as skill evidence." A server-level GITHUB_TOKEN (if
// configured) raises the rate limit from 60/hr to 5000/hr; without one, the
// import still works against public data, just capped lower.
const MAX_REPOS = 8;

function octokitClient() {
  return new Octokit(env.GITHUB_TOKEN ? { auth: env.GITHUB_TOKEN } : {});
}

function decodeReadme(readmeResponse) {
  if (!readmeResponse?.content) return '';
  return Buffer.from(readmeResponse.content, readmeResponse.encoding ?? 'base64').toString('utf-8');
}

async function fetchRepoEvidence(octokit, owner, repo) {
  const [languagesResult, readmeResult] = await Promise.allSettled([
    octokit.rest.repos.listLanguages({ owner, repo: repo.name }),
    octokit.rest.repos.getReadme({ owner, repo: repo.name }),
  ]);

  const languages = languagesResult.status === 'fulfilled' ? Object.keys(languagesResult.value.data) : [];
  const readme = readmeResult.status === 'fulfilled' ? decodeReadme(readmeResult.value.data) : '';

  const extractedText = [
    `Repository: ${repo.name}`,
    repo.description ? `Description: ${repo.description}` : null,
    languages.length ? `Languages: ${languages.join(', ')}` : null,
    readme ? `\nREADME:\n${readme.slice(0, 3000)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return extractedText;
}

/**
 * Imports a user's most recently updated public, non-fork repositories as
 * evidence documents — each repo becomes a `documents` row (sourceChannel
 * GITHUB) run through the same classification → embedding → entity-linking
 * pipeline as a manual upload (ingestExtractedContent, document.service.js).
 * Per-repo failures are isolated so one bad repo doesn't fail the whole import.
 */
async function importGithubProfile(userId, username) {
  const octokit = octokitClient();

  const { data: repos } = await octokit.rest.repos.listForUser({
    username,
    sort: 'updated',
    per_page: MAX_REPOS,
  });

  const candidates = repos.filter((r) => !r.fork).slice(0, MAX_REPOS);

  const imported = [];
  const skipped = [];

  for (const repo of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const extractedText = await fetchRepoEvidence(octokit, username, repo);
      // eslint-disable-next-line no-await-in-loop
      const document = await ingestExtractedContent({
        userId,
        fileUrl: repo.html_url,
        extractedText,
        sourceChannel: 'GITHUB',
      });
      imported.push({ repo: repo.name, documentId: document.id, category: document.category });
    } catch (err) {
      console.warn(`[github.service] failed to import repo "${repo.name}": ${err.message}`);
      skipped.push({ repo: repo.name, reason: err.message });
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { githubUsername: username } });

  return { imported, skipped, reposConsidered: candidates.length };
}

module.exports = { importGithubProfile };
