import { execFileSync } from 'node:child_process';

export type GitTag = { tag: string; sha: string; tagged_at: string };
export type GitCommit = { sha: string; committed_at: string | null; release_tag: string | null };

function git(repo: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Every tag in the repository is a release. */
export function readTags(repo: string): GitTag[] {
  const out = git(repo, [
    'for-each-ref',
    'refs/tags',
    '--format=%(refname:short)\t%(*objectname)\t%(objectname)\t%(creatordate:iso-strict)',
  ]);
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [tag = '', peeled = '', object = '', date = ''] = line.split('\t');
      // Annotated tags point at a tag object; the peeled id is the commit.
      return { tag, sha: peeled || object, tagged_at: date };
    });
}

/**
 * Commit date and release for each commit a run tested. The release is the latest
 * tag reachable from the commit, so tagging later re-labels older runs correctly.
 */
export function readCommits(repo: string, shas: string[]): GitCommit[] {
  return [...new Set(shas)].map((sha) => ({
    sha,
    committed_at: git(repo, ['log', '-1', '--format=%cI', sha]),
    release_tag: git(repo, ['describe', '--tags', '--abbrev=0', sha]),
  }));
}
