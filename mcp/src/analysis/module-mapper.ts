import type { FileChangeInfo } from "../providers/types.js";

export interface ModuleInfo {
  name: string;
  path: string;
  files: string[];
  additions: number;
  deletions: number;
}

const MODULE_PATTERNS: [RegExp, string][] = [
  [/^src\/auth\//i, "Authentication"],
  [/^src\/security\//i, "Security"],
  [/^src\/payment/i, "Payments"],
  [/^src\/billing/i, "Billing"],
  [/^src\/api\//i, "API"],
  [/^src\/routes?\//i, "Routing"],
  [/^src\/controller/i, "Controllers"],
  [/^src\/service/i, "Services"],
  [/^src\/model/i, "Data Models"],
  [/^src\/entit/i, "Entities"],
  [/^src\/component/i, "UI Components"],
  [/^src\/page/i, "Pages"],
  [/^src\/view/i, "Views"],
  [/^src\/hook/i, "Hooks"],
  [/^src\/store/i, "State Management"],
  [/^src\/util/i, "Utilities"],
  [/^src\/lib\//i, "Libraries"],
  [/^src\/middleware/i, "Middleware"],
  [/^src\/config/i, "Configuration"],
  [/^test|spec|__tests__/i, "Tests"],
  [/^docs?\//i, "Documentation"],
  [/migration/i, "Database Migrations"],
  [/\.css$|\.scss$|\.less$/i, "Styles"],
];

/**
 * Map changed files to logical modules/features.
 */
export function mapFilesToModules(files: FileChangeInfo[]): ModuleInfo[] {
  const moduleMap = new Map<string, ModuleInfo>();

  for (const file of files) {
    const moduleName = detectModule(file.filename);

    if (!moduleMap.has(moduleName)) {
      const pathPrefix = file.filename.includes("/")
        ? file.filename.substring(0, file.filename.lastIndexOf("/") + 1)
        : "";
      moduleMap.set(moduleName, {
        name: moduleName,
        path: pathPrefix,
        files: [],
        additions: 0,
        deletions: 0,
      });
    }

    const mod = moduleMap.get(moduleName)!;
    mod.files.push(file.filename);
    mod.additions += file.additions;
    mod.deletions += file.deletions;
  }

  return Array.from(moduleMap.values()).sort(
    (a, b) => (b.additions + b.deletions) - (a.additions + a.deletions),
  );
}

function detectModule(filename: string): string {
  for (const [pattern, name] of MODULE_PATTERNS) {
    if (pattern.test(filename)) return name;
  }

  // Fallback: use first directory as module name
  if (filename.includes("/")) {
    const parts = filename.split("/");
    if (parts.length >= 2) {
      return capitalize(parts[0]) + (parts.length >= 3 ? "/" + capitalize(parts[1]) : "");
    }
  }

  return "Root";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
