#!/usr/bin/env bash
# Adds downloaded raw-results folders to the `data` branch and rebuilds the model.
#
#   scripts/publish-data.sh <raw-results-dir> [more dirs...]
#
# Run it from a checkout of main with full history and tags: release labels come from Git.
# The data branch holds one snapshot commit. The raw archive inside it is the history,
# so the branch stays small even though the Parquet files change on every run.
# Set PUSH=false to build locally without pushing.
set -euo pipefail

BRANCH="${DATA_BRANCH:-data}"
WORKTREE="${DATA_WORKTREE:-.data-branch}"
PUSH="${PUSH:-true}"
export GIT_AUTHOR_NAME="JordyR1986" GIT_COMMITTER_NAME="JordyR1986"
export GIT_AUTHOR_EMAIL="195427682+JordyR1986@users.noreply.github.com"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

cleanup() {
  if [ "$PUSH" = "true" ]; then
    git worktree remove --force "$WORKTREE" 2>/dev/null || true
  fi
  git for-each-ref --format='%(refname:short)' "refs/heads/snapshot-$$-*" |
    xargs -r -n1 git branch -D --quiet 2>/dev/null || true
}
trap cleanup EXIT

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <raw-results-dir> [more dirs...]" >&2
  exit 2
fi

for attempt in 1 2 3; do
  git worktree remove --force "$WORKTREE" 2>/dev/null || rm -rf "$WORKTREE"
  git worktree prune

  if git fetch --quiet origin "$BRANCH" 2>/dev/null; then
    base="$(git rev-parse FETCH_HEAD)"
    git worktree add --quiet --detach "$WORKTREE" "$base"
  else
    base=""
    git worktree add --quiet --detach "$WORKTREE" HEAD
    git -C "$WORKTREE" rm -rfq .
  fi

  npx tsx pipeline/ingest.ts --raw "$WORKTREE/raw" "$@"
  npx tsx pipeline/build.ts --raw "$WORKTREE/raw" --out "$WORKTREE/model" --repo .
  cp pipeline/data-branch-readme.md "$WORKTREE/README.md"

  runs="$(find "$WORKTREE/raw" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  git -C "$WORKTREE" checkout --quiet --orphan "snapshot-$$-$attempt"
  git -C "$WORKTREE" add -A
  git -C "$WORKTREE" commit --quiet -m "chore(data): update dataset (${runs} runs)"

  if [ "$PUSH" != "true" ]; then
    echo "Built snapshot in $WORKTREE (not pushed)."
    exit 0
  fi

  # Only replace the branch if nobody else updated it since we read it.
  if git -C "$WORKTREE" push --quiet --force-with-lease="refs/heads/$BRANCH:$base" origin "HEAD:refs/heads/$BRANCH"; then
    echo "Pushed $BRANCH with ${runs} runs."
    exit 0
  fi
  echo "The $BRANCH branch moved while building (attempt $attempt); trying again." >&2
  sleep $((attempt * 5))
done

echo "Could not update the $BRANCH branch after 3 attempts." >&2
exit 1
