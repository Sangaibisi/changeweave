import type { FileDiff, DiffHunk, CommitDiff } from "../providers/types.js";

export interface BreakingChange {
  type: string;
  file: string;
  description: string;
  severity: "critical" | "major" | "minor";
  beforeSnippet?: string;
  afterSnippet?: string;
  lineNumber?: number;
}

const EXPORT_REMOVED_RE = /^-\s*export\s+(function|class|const|let|var|type|interface|enum)\s+(\w+)/;
const EXPORT_DEFAULT_REMOVED_RE = /^-\s*export\s+default\s/;
const FUNCTION_SIGNATURE_RE = /^[+-]\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;
const API_ROUTE_RE = /\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/;
const ENV_VAR_RE = /process\.env\.(\w+)/g;
const MIGRATION_PATTERNS = [/DROP\s+(TABLE|COLUMN)/i, /ALTER\s+TABLE.*DROP/i, /RENAME\s+COLUMN/i];

/**
 * Detect breaking changes from commit diffs.
 */
export function detectBreakingChanges(diffs: CommitDiff[]): BreakingChange[] {
  const changes: BreakingChange[] = [];

  for (const diff of diffs) {
    for (const file of diff.files) {
      changes.push(...detectInFile(file));
    }
  }

  return changes;
}

function detectInFile(file: FileDiff): BreakingChange[] {
  const changes: BreakingChange[] = [];

  // Deleted files that look like public interfaces
  if (file.status === "deleted") {
    const isPublic =
      file.filename.includes("api/") ||
      file.filename.includes("routes/") ||
      file.filename.includes("index.") ||
      file.filename.endsWith(".d.ts");

    if (isPublic) {
      changes.push({
        type: "FILE_DELETED",
        file: file.filename,
        description: `Public interface file deleted: ${file.filename}`,
        severity: "critical",
      });
    }
  }

  for (const hunk of file.hunks) {
    const lines = hunk.content.split("\n");

    // Check for removed exports
    for (const line of lines) {
      const exportMatch = EXPORT_REMOVED_RE.exec(line);
      if (exportMatch) {
        changes.push({
          type: "EXPORT_REMOVED",
          file: file.filename,
          description: `Exported ${exportMatch[1]} "${exportMatch[2]}" was removed`,
          severity: "critical",
          beforeSnippet: line.substring(1).trim(),
        });
      }

      const defaultExportMatch = EXPORT_DEFAULT_REMOVED_RE.exec(line);
      if (defaultExportMatch) {
        changes.push({
          type: "DEFAULT_EXPORT_REMOVED",
          file: file.filename,
          description: "Default export was removed",
          severity: "critical",
          beforeSnippet: line.substring(1).trim(),
        });
      }
    }

    // Check for changed function signatures
    detectSignatureChanges(lines, file.filename, changes);

    // Check for migration breaking patterns
    if (file.filename.includes("migration") || file.filename.endsWith(".sql")) {
      for (const line of lines) {
        for (const pattern of MIGRATION_PATTERNS) {
          if (pattern.test(line)) {
            changes.push({
              type: "SCHEMA_BREAKING",
              file: file.filename,
              description: `Database schema breaking change detected: ${line.trim()}`,
              severity: "major",
              beforeSnippet: line.trim(),
            });
          }
        }
      }
    }

    // Check for changed API routes
    detectRouteChanges(lines, file.filename, changes);
  }

  return changes;
}

function detectSignatureChanges(
  lines: string[],
  filename: string,
  changes: BreakingChange[],
): void {
  const removedFns = new Map<string, string>();
  const addedFns = new Map<string, string>();

  for (const line of lines) {
    const match = FUNCTION_SIGNATURE_RE.exec(line);
    if (match) {
      const name = match[3];
      const params = match[4];
      if (line.startsWith("-")) {
        removedFns.set(name, params);
      } else if (line.startsWith("+")) {
        addedFns.set(name, params);
      }
    }
  }

  for (const [name, oldParams] of removedFns) {
    const newParams = addedFns.get(name);
    if (newParams !== undefined && newParams !== oldParams) {
      changes.push({
        type: "SIGNATURE_CHANGED",
        file: filename,
        description: `Function "${name}" signature changed: (${oldParams}) → (${newParams})`,
        severity: "major",
        beforeSnippet: `function ${name}(${oldParams})`,
        afterSnippet: `function ${name}(${newParams})`,
      });
    }
  }
}

function detectRouteChanges(
  lines: string[],
  filename: string,
  changes: BreakingChange[],
): void {
  const removedRoutes: string[] = [];
  const addedRoutes: string[] = [];

  for (const line of lines) {
    const match = API_ROUTE_RE.exec(line);
    if (match) {
      if (line.startsWith("-")) {
        removedRoutes.push(match[2]);
      } else if (line.startsWith("+")) {
        addedRoutes.push(match[2]);
      }
    }
  }

  for (const route of removedRoutes) {
    if (!addedRoutes.includes(route)) {
      changes.push({
        type: "ROUTE_CHANGED",
        file: filename,
        description: `API route removed or changed: ${route}`,
        severity: "major",
      });
    }
  }
}
