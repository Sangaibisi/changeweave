package com.changelogai.service;

import com.changelogai.entity.Commit;
import com.changelogai.entity.enums.CommitCategory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AITransformationService {

    private static final Logger log = LoggerFactory.getLogger(AITransformationService.class);

    @Value("${app.openai.api-key:}")
    private String apiKey;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String model;

    @Value("${app.openai.max-tokens:2000}")
    private int maxTokens;

    @Value("${app.openai.temperature:0.7}")
    private double temperature;

    private ChatLanguageModel chatModel;

    private static final String DEFAULT_SYSTEM_PROMPT = """
            You are a product marketing expert specializing in release notes.
            Your task is to transform technical git commits into user-friendly
            release notes that highlight benefits, not implementation details.
            
            Guidelines:
            - Use simple, non-technical language
            - Focus on user benefits ("You can now..." instead of "Added feature...")
            - Group related changes together
            - Use emojis sparingly for visual hierarchy
            - Keep it concise (max 2 sentences per change)
            - Avoid technical jargon (API, refactor, etc.)
            - Output in Markdown format
            """;

    private static final Map<String, String> TONE_PROMPTS = Map.of(
            "professional", "Use a formal, professional tone. Be precise and business-oriented.",
            "casual", "Use a friendly, casual tone. Be conversational and approachable.",
            "technical", "Use a technical tone. Include relevant technical details for developers.",
            "marketing", "Use an enthusiastic marketing tone. Emphasize value and excitement."
    );

    private static final Map<String, String> AUDIENCE_PROMPTS = Map.of(
            "end-users", "Write for end-users who are non-technical. Focus on benefits and outcomes.",
            "developers", "Write for developers. Include technical context, API changes, and migration notes.",
            "stakeholders", "Write for business stakeholders. Focus on business impact and ROI.",
            "mixed", "Write for a mixed audience. Balance technical detail with user-facing benefits."
    );

    private static final Map<String, String> LANGUAGE_PROMPTS = Map.ofEntries(
            Map.entry("en", "Write entirely in English."),
            Map.entry("tr", "Write entirely in Turkish (Türkçe). Use Turkish grammar and natural phrasing."),
            Map.entry("de", "Write entirely in German (Deutsch). Use German grammar and natural phrasing."),
            Map.entry("fr", "Write entirely in French (Français). Use French grammar and natural phrasing."),
            Map.entry("es", "Write entirely in Spanish (Español). Use Spanish grammar and natural phrasing."),
            Map.entry("pt", "Write entirely in Portuguese (Português). Use Portuguese grammar and natural phrasing."),
            Map.entry("it", "Write entirely in Italian (Italiano). Use Italian grammar and natural phrasing."),
            Map.entry("nl", "Write entirely in Dutch (Nederlands). Use Dutch grammar and natural phrasing."),
            Map.entry("ja", "Write entirely in Japanese (日本語). Use Japanese grammar and natural phrasing."),
            Map.entry("ko", "Write entirely in Korean (한국어). Use Korean grammar and natural phrasing."),
            Map.entry("zh", "Write entirely in Simplified Chinese (简体中文). Use Chinese grammar and natural phrasing."),
            Map.entry("ru", "Write entirely in Russian (Русский). Use Russian grammar and natural phrasing."),
            Map.entry("ar", "Write entirely in Arabic (العربية). Use Arabic grammar and natural phrasing."),
            Map.entry("pl", "Write entirely in Polish (Polski). Use Polish grammar and natural phrasing."),
            Map.entry("uk", "Write entirely in Ukrainian (Українська). Use Ukrainian grammar and natural phrasing.")
    );

    private static final Map<String, String> TEMPLATE_PROMPTS = Map.of(
            "whats-new", "Format as a 'What's New' announcement. Lead with the most exciting changes. Use a celebratory tone.\nStructure: Brief intro paragraph, then bullet points grouped by theme.",
            "release-notes", "Format as traditional release notes. Group by: Added, Changed, Fixed, Removed.\nUse semantic versioning conventions. Be thorough but concise.",
            "patch-notes", "Format as patch notes (gaming/software style). Lead with bug fixes and balance changes.\nStructure: Overview, then categorized bullet points.",
            "keep-a-changelog", "Follow the Keep a Changelog format (keepachangelog.com). Categories: Added, Changed, Deprecated, Removed, Fixed, Security.\nBe concise, one line per change."
    );

    @PostConstruct
    public void init() {
        if (apiKey != null && !apiKey.isBlank()) {
            this.chatModel = OpenAiChatModel.builder()
                    .apiKey(apiKey)
                    .modelName(model)
                    .maxTokens(maxTokens)
                    .temperature(temperature)
                    .build();
            log.info("AI transformation service initialized with model: {}", model);
        } else {
            log.warn("OpenAI API key not configured. AI transformation will use fallback mode.");
        }
    }

    public String transformCommits(List<Commit> commits, Map<String, Object> settings) {
        if (commits.isEmpty()) {
            return "No changes in this release.";
        }

        if (chatModel == null) {
            return fallbackTransformation(commits);
        }

        try {
            Map<CommitCategory, List<Commit>> grouped = commits.stream()
                    .collect(Collectors.groupingBy(c -> c.getCategory() != null
                            ? c.getCategory() : CommitCategory.OTHER));

            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("Transform these git commits into release notes:\n\n");

            grouped.forEach((category, categoryCommits) -> {
                promptBuilder.append("Category: ").append(category.name()).append("\n");
                promptBuilder.append("Commits:\n");
                categoryCommits.forEach(c ->
                        promptBuilder.append("- ").append(c.getMessage())
                                .append(" (by ").append(c.getAuthorName()).append(")\n"));
                promptBuilder.append("\n");
            });

            promptBuilder.append("\nOutput format:\n");
            promptBuilder.append("- Group by category with emoji headers\n");
            promptBuilder.append("- One bullet point per user-facing change\n");
            promptBuilder.append("- Start with benefit, not implementation\n");
            promptBuilder.append("- Max 2 sentences per bullet\n");

            String systemPrompt = buildSystemPrompt(settings);
            String response = chatModel.generate(
                    dev.langchain4j.data.message.SystemMessage.from(systemPrompt),
                    dev.langchain4j.data.message.UserMessage.from(promptBuilder.toString())
            ).content().text();

            log.info("AI transformation completed for {} commits", commits.size());
            return response;
        } catch (Exception e) {
            log.error("AI transformation failed, using fallback", e);
            return fallbackTransformation(commits);
        }
    }

    public String transformCommits(List<Commit> commits) {
        return transformCommits(commits, Map.of());
    }

    /**
     * Transform rich MCP context (diffs, LOC stats, module analysis) into polished release notes.
     * The context already contains categorized changes with code-level detail.
     */
    public String transformWithContext(String mcpContext, Map<String, Object> settings) {
        if (chatModel == null) {
            return null;
        }

        try {
            String systemPrompt = buildSystemPrompt(settings);
            String contextPrompt = "Generate polished release notes from this detailed code change analysis.\n"
                    + "Follow the system prompt guidelines.\n\n"
                    + mcpContext;

            String response = chatModel.generate(
                    dev.langchain4j.data.message.SystemMessage.from(systemPrompt),
                    dev.langchain4j.data.message.UserMessage.from(contextPrompt)
            ).content().text();

            log.info("AI transformation with MCP context completed");
            return response;
        } catch (Exception e) {
            log.error("AI transformation with MCP context failed", e);
            return null;
        }
    }

    public String transformWithContext(String mcpContext) {
        return transformWithContext(mcpContext, Map.of());
    }

    private String buildSystemPrompt(Map<String, Object> settings) {
        if (settings == null || settings.isEmpty()) {
            return DEFAULT_SYSTEM_PROMPT;
        }

        StringBuilder prompt = new StringBuilder(DEFAULT_SYSTEM_PROMPT);

        String tone = (String) settings.getOrDefault("aiTone", "");
        if (TONE_PROMPTS.containsKey(tone)) {
            prompt.append("\nTone: ").append(TONE_PROMPTS.get(tone));
        }

        String audience = (String) settings.getOrDefault("aiAudience", "");
        if (AUDIENCE_PROMPTS.containsKey(audience)) {
            prompt.append("\nAudience: ").append(AUDIENCE_PROMPTS.get(audience));
        }

        String template = (String) settings.getOrDefault("changelogTemplate", "");
        if (TEMPLATE_PROMPTS.containsKey(template)) {
            prompt.append("\nFormat: ").append(TEMPLATE_PROMPTS.get(template));
        }

        String language = (String) settings.getOrDefault("language", "");
        if (LANGUAGE_PROMPTS.containsKey(language)) {
            prompt.append("\nLanguage: ").append(LANGUAGE_PROMPTS.get(language));
        }

        return prompt.toString();
    }

    private String fallbackTransformation(List<Commit> commits) {
        Map<CommitCategory, List<Commit>> grouped = commits.stream()
                .collect(Collectors.groupingBy(c -> c.getCategory() != null
                        ? c.getCategory() : CommitCategory.OTHER));

        StringBuilder markdown = new StringBuilder();

        grouped.forEach((category, categoryCommits) -> {
            String emoji = getCategoryEmoji(category);
            String title = getCategoryTitle(category);
            markdown.append("### ").append(emoji).append(" ").append(title).append("\n\n");
            categoryCommits.forEach(c -> {
                String desc = c.getMessage();
                if (desc.contains(":")) {
                    desc = desc.substring(desc.indexOf(":") + 1).trim();
                }
                markdown.append("- ").append(capitalizeFirst(desc)).append("\n");
            });
            markdown.append("\n");
        });

        return markdown.toString();
    }

    private String getCategoryEmoji(CommitCategory category) {
        return switch (category) {
            case NEW_FEATURE -> "\u2728";
            case BUG_FIX -> "\uD83D\uDC1B";
            case IMPROVEMENT -> "\uD83D\uDCA1";
            case PERFORMANCE -> "\u26A1";
            case BREAKING_CHANGE -> "\uD83D\uDCA5";
            case DEPRECATION -> "\u26A0\uFE0F";
            case DOCUMENTATION -> "\uD83D\uDCDA";
            case CHORE -> "\uD83D\uDD27";
            case OTHER -> "\uD83D\uDCCB";
        };
    }

    private String getCategoryTitle(CommitCategory category) {
        return switch (category) {
            case NEW_FEATURE -> "New Features";
            case BUG_FIX -> "Bug Fixes";
            case IMPROVEMENT -> "Improvements";
            case PERFORMANCE -> "Performance";
            case BREAKING_CHANGE -> "Breaking Changes";
            case DEPRECATION -> "Deprecations";
            case DOCUMENTATION -> "Documentation";
            case CHORE -> "Maintenance";
            case OTHER -> "Other Changes";
        };
    }

    private String capitalizeFirst(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
