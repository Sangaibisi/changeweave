import { z } from "zod";
import type { ChangeWeaveClient } from "../client/index.js";
import { logger } from "../utils/logger.js";

export const listChangelogsSchema = z.object({
  repo_id: z.string().describe("ChangeWeave repository ID"),
  status: z
    .enum(["draft", "published", "all"])
    .default("all")
    .describe("Filter by status"),
  limit: z.number().default(10).describe("Max results"),
});

export type ListChangelogsInput = z.infer<typeof listChangelogsSchema>;

export async function listChangelogsTool(
  client: ChangeWeaveClient,
  input: ListChangelogsInput,
): Promise<string> {
  logger.info("Listing changelogs", { repoId: input.repo_id, status: input.status });

  const changelogs = await client.listChangelogs(input.repo_id, input.status, input.limit);

  if (changelogs.length === 0) {
    return "No changelogs found for this repository.";
  }

  const lines: string[] = [];
  lines.push(`# Changelogs (${changelogs.length})\n`);

  for (const cl of changelogs) {
    const status = cl.isDraft ? "📝 Draft" : "✅ Published";
    lines.push(`## ${cl.version} — ${cl.title}\n`);
    lines.push(`**Status**: ${status}`);
    lines.push(`**Slug**: ${cl.slug}`);
    if (cl.publishedAt) lines.push(`**Published**: ${cl.publishedAt}`);
    lines.push(`**Created**: ${cl.createdAt}`);
    if (cl.content) {
      const preview = cl.content.substring(0, 200);
      lines.push(`\n${preview}${cl.content.length > 200 ? "..." : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
