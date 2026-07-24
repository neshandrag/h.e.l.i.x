const { Octokit } = require('octokit');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ingestExtractedContent } = require('./document.service');

// Cap how many repos we list for the picker and how many can be imported at once.
const MAX_LIST = 30;
const MAX_IMPORT = 10;

function octokitClient() {
  return new Octokit(env.GITHUB_TOKEN ? { auth: env.GITHUB_TOKEN } : {});
}

function decodeReadme(readmeResponse) {
  if (!readmeResponse?.content) return '';
  return Buffer.from(readmeResponse.content, readmeResponse.encoding ?? 'base64').toString('utf-8');
}

function mapRepoSummary(repo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || null,
    language: repo.language || null,
    stars: repo.stargazers_count ?? 0,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
    fork: Boolean(repo.fork),
  };
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

async function listGithubRepos(username) {
  const octokit = octokitClient();
  let repos;
  try {
    const response = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: MAX_LIST,
      type: 'owner',
    });
    repos = response.data;
  } catch (err) {
    const msg = err.status === 404
      ? `GitHub user not found: ${username}`
      : `Failed to fetch GitHub repos for ${username}: ${err.message}`;
    throw new ApiError(502, msg);
  }

  const candidates = repos.filter((r) => !r.fork).map(mapRepoSummary);
  return { username, repos: candidates };
}

/**
 * Imports only the repos the user selected. Each becomes a documents row
 * (sourceChannel GITHUB) through the same ingest pipeline as uploads.
 */
async function importGithubProfile(userId, username, selectedRepos = []) {
  const names = [...new Set(
    (Array.isArray(selectedRepos) ? selectedRepos : [])
      .map((n) => String(n || '').trim())
      .filter(Boolean)
  )];

  if (names.length === 0) {
    throw new ApiError(422, 'Select at least one repository to import');
  }
  if (names.length > MAX_IMPORT) {
    throw new ApiError(422, `You can import at most ${MAX_IMPORT} repositories at a time`);
  }

  const octokit = octokitClient();
  let listed;
  try {
    const response = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: MAX_LIST,
      type: 'owner',
    });
    listed = response.data;
  } catch (err) {
    const msg = err.status === 404
      ? `GitHub user not found: ${username}`
      : `Failed to fetch GitHub repos for ${username}: ${err.message}`;
    throw new ApiError(502, msg);
  }

  const byName = new Map(listed.filter((r) => !r.fork).map((r) => [r.name.toLowerCase(), r]));
  const missing = names.filter((n) => !byName.has(n.toLowerCase()));
  if (missing.length) {
    throw new ApiError(404, `Repository not found for ${username}: ${missing.join(', ')}`);
  }

  const candidates = names.map((n) => byName.get(n.toLowerCase()));

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

module.exports = { listGithubRepos, importGithubProfile };
