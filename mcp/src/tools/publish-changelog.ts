import { z } from "zod";
import type { ChangeWeaveClient } from "../client/index.js";
import { logger } from "../utils/logger.js";

export const publishChangelogSchema = z.object({
  repo_id: z.string().describe("ChangeWeave repository ID"),
  version: z.string().describe("Semantic version"),
  title: z.string().describe("Changelog title"),
  content: z.string().describe("Markdown content"),
  publish_immediately: z.boolean().default(false).describe("Publish immediately or save as draft"),
});

export type PublishChangelogInput = z.infer<typeof publishChangelogSchema>;

export async function publishChangelogTool(
  client: ChangeWeaveClient,
  input: PublishChangelogInput,
): Promise<string> {
  logger.info("Publishing changelog", { repoId: input.repo_id, version: input.version });

  const changelog = await client.createChangelog(input.repo_id, {
    version: input.version,
    title: input.title,
    content: input.content,
  });

  if (input.publish_immediately && changelog.id) {
    await client.publishChangelog(changelog.id);
    return `✅ Changelog **v${input.version}** published successfully!\n\n**Title**: ${input.title}\n**Slug**: ${changelog.slug}\n**URL**: ${changelog.publicUrl ?? "N/A"}`;
  }

  return `📝 Changelog **v${input.version}** saved as draft.\n\n**Title**: ${input.title}\n**ID**: ${changelog.id}\n\nUse the ChangeWeave dashboard to review and publish.`;
}
