package com.changelogai.service;

import com.changelogai.entity.enums.CommitCategory;
import com.changelogai.entity.enums.ImpactScore;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CommitParserService {

    private static final Pattern CONVENTIONAL_COMMIT_PATTERN =
            Pattern.compile("^(feat|fix|perf|refactor|docs|style|test|chore|ci|build|revert)(\\(.+\\))?(!)?:\\s*(.+)$",
                    Pattern.CASE_INSENSITIVE);

    public CommitCategory detectCategory(String message) {
        Matcher matcher = CONVENTIONAL_COMMIT_PATTERN.matcher(message.trim());
        if (matcher.find()) {
            String type = matcher.group(1).toLowerCase();
            boolean breaking = matcher.group(3) != null;

            if (breaking) return CommitCategory.BREAKING_CHANGE;

            return switch (type) {
                case "feat" -> CommitCategory.NEW_FEATURE;
                case "fix" -> CommitCategory.BUG_FIX;
                case "perf" -> CommitCategory.PERFORMANCE;
                case "refactor" -> CommitCategory.IMPROVEMENT;
                case "docs" -> CommitCategory.DOCUMENTATION;
                case "chore", "ci", "build", "style", "test" -> CommitCategory.CHORE;
                case "revert" -> CommitCategory.OTHER;
                default -> CommitCategory.OTHER;
            };
        }

        String lower = message.toLowerCase();
        if (lower.contains("breaking")) return CommitCategory.BREAKING_CHANGE;
        if (lower.contains("fix") || lower.contains("bug") || lower.contains("patch")) return CommitCategory.BUG_FIX;
        if (lower.contains("feat") || lower.contains("add") || lower.contains("new")) return CommitCategory.NEW_FEATURE;
        if (lower.contains("perf") || lower.contains("optim") || lower.contains("speed")) return CommitCategory.PERFORMANCE;
        if (lower.contains("improve") || lower.contains("enhance") || lower.contains("update")) return CommitCategory.IMPROVEMENT;
        if (lower.contains("doc") || lower.contains("readme")) return CommitCategory.DOCUMENTATION;
        if (lower.contains("deprecat")) return CommitCategory.DEPRECATION;

        return CommitCategory.OTHER;
    }

    public ImpactScore detectImpactScore(String message, CommitCategory category) {
        if (category == CommitCategory.BREAKING_CHANGE) return ImpactScore.HIGH;
        if (category == CommitCategory.NEW_FEATURE) return ImpactScore.HIGH;
        if (category == CommitCategory.BUG_FIX) return ImpactScore.MEDIUM;
        if (category == CommitCategory.PERFORMANCE) return ImpactScore.MEDIUM;
        if (category == CommitCategory.CHORE || category == CommitCategory.DOCUMENTATION) return ImpactScore.LOW;

        return ImpactScore.MEDIUM;
    }

    public String extractDescription(String message) {
        Matcher matcher = CONVENTIONAL_COMMIT_PATTERN.matcher(message.trim());
        if (matcher.find()) {
            return matcher.group(4).trim();
        }
        return message.trim();
    }
}
