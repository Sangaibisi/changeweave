import type { CommitInfo } from "../providers/types.js";
import { logger } from "../utils/logger.js";

export interface RevertPair {
  revertSha: string;
  revertedSha: string;
  message: string;
}

export interface RevertDetectionResult {
  /** Commits with revert pairs removed */
  filtered: CommitInfo[];
  /** Detected revert pairs */
  pairs: RevertPair[];
  /** SHAs that were eliminated */
  eliminatedShas: Set<string>;
}

/**
 * Detect revert commits and eliminate revert+reverted pairs.
 *
 * Detection strategies:
 * 1. Git's standard "This reverts commit <sha>" in message body
 * 2. Conventional commit "revert: <original message>" matching
 * 3. "Revert \"<original message>\"" GitHub-style revert
 */
export function detectReverts(commits: CommitInfo[]): RevertDetectionResult {
  const pairs: RevertPair[] = [];
  const eliminatedShas = new Set<string>();

  // Build a lookup: sha -> commit, and message (first line) -> commit
  const shaMap = new Map<string, CommitInfo>();
  const msgMap = new Map<string, CommitInfo>();
  for (const c of commits) {
    shaMap.set(c.sha, c);
    const firstLine = c.message.split("\n")[0].trim();
    // Only store first occurrence to avoid collisions
    if (!msgMap.has(firstLine)) {
      msgMap.set(firstLine, c);
    }
  }

  for (const commit of commits) {
    if (eliminatedShas.has(commit.sha)) continue;

    const fullMsg = commit.message;
    const firstLine = fullMsg.split("\n")[0].trim();

    // Strategy 1: "This reverts commit <sha40>."
    const shaMatch = fullMsg.match(/This reverts commit ([0-9a-f]{7,40})/i);
    if (shaMatch) {
      const revertedSha = findCommitByShaPrefix(shaMap, shaMatch[1]);
      if (revertedSha) {
        pairs.push({ revertSha: commit.sha, revertedSha, message: firstLine });
        eliminatedShas.add(commit.sha);
        eliminatedShas.add(revertedSha);
        continue;
      }
    }

    // Strategy 2: Revert "<original message>" (GitHub auto-revert format)
    const revertQuoteMatch = firstLine.match(/^Revert "(.+)"$/i);
    if (revertQuoteMatch) {
      const originalMsg = revertQuoteMatch[1];
      const original = msgMap.get(originalMsg);
      if (original && !eliminatedShas.has(original.sha)) {
        pairs.push({ revertSha: commit.sha, revertedSha: original.sha, message: firstLine });
        eliminatedShas.add(commit.sha);
        eliminatedShas.add(original.sha);
        continue;
      }
    }

    // Strategy 3: "revert: <description>" matching against "feat: <description>" etc.
    const revertConvMatch = firstLine.match(/^revert:\s*(.+)$/i);
    if (revertConvMatch) {
      const desc = revertConvMatch[1].trim();
      let matched = false;
      // Try to find a commit whose first line ends with this description
      for (const [msg, c] of msgMap) {
        if (c.sha === commit.sha || eliminatedShas.has(c.sha)) continue;
        // Match "feat: <desc>", "refactor: <desc>", etc.
        const convMatch = msg.match(/^(?:feat|fix|refactor|chore|perf|docs|style|test|ci|build)(?:\(.+\))?:\s*(.+)$/i);
        if (convMatch && convMatch[1].trim().toLowerCase() === desc.toLowerCase()) {
          pairs.push({ revertSha: commit.sha, revertedSha: c.sha, message: firstLine });
          eliminatedShas.add(commit.sha);
          eliminatedShas.add(c.sha);
          matched = true;
          break;
        }
      }

      // Strategy 4: Sequential file-overlap revert chain detection.
      // Walk backwards from the revert commit. Only match CONSECUTIVE commits
      // that have high file overlap with the revert. Stop as soon as a
      // non-matching commit is hit. This prevents matching older unrelated
      // commits that happen to touch the same files.
      if (!matched && !eliminatedShas.has(commit.sha) && commit.filesChanged.length > 0) {
        const revertFiles = new Set(commit.filesChanged.map((f) => f.filename));
        const revertIdx = commits.indexOf(commit);
        const chainShas: string[] = [];

        // Walk backwards from the commit just before the revert
        for (let i = revertIdx - 1; i >= 0; i--) {
          const other = commits[i];
          if (eliminatedShas.has(other.sha)) continue;
          if (other.filesChanged.length === 0) continue;

          const otherFiles = new Set(other.filesChanged.map((f) => f.filename));
          const overlap = [...revertFiles].filter((f) => otherFiles.has(f)).length;
          const ratio = overlap / Math.min(revertFiles.size, otherFiles.size);

          if (ratio >= 0.7 && other.authorName === commit.authorName) {
            // This commit is part of the revert chain
            chainShas.push(other.sha);
          } else {
            // Chain broken — stop walking backwards
            break;
          }
        }

        if (chainShas.length > 0) {
          eliminatedShas.add(commit.sha);
          for (const sha of chainShas) {
            pairs.push({ revertSha: commit.sha, revertedSha: sha, message: firstLine });
            eliminatedShas.add(sha);
          }
        }
      }
    }
  }

  const filtered = commits.filter((c) => !eliminatedShas.has(c.sha));

  if (pairs.length > 0) {
    logger.info("Revert detection", { pairs: pairs.length, eliminated: eliminatedShas.size });
  }

  return { filtered, pairs, eliminatedShas };
}

function findCommitByShaPrefix(
  shaMap: Map<string, CommitInfo>,
  prefix: string,
): string | undefined {
  // Exact match first
  if (shaMap.has(prefix)) return prefix;
  // Prefix match (short SHA)
  for (const sha of shaMap.keys()) {
    if (sha.startsWith(prefix)) return sha;
  }
  return undefined;
}
